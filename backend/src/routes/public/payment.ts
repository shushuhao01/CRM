/**
 * 公开支付API - 官网支付
 */
import { Router, Request, Response } from 'express'
import { paymentService } from '../../services/PaymentService'
import { AppDataSource } from '../../config/database'
import { adminNotificationService } from '../../services/AdminNotificationService'

import { log } from '../../config/logger';
const router = Router()

// 创建支付订单
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { packageId, packageName, amount, payType, tenantId, tenantName,
            contactName, contactPhone, contactEmail, billingCycle } = req.body

    if (!packageId || !amount || !payType || !contactName || !contactPhone) {
      return res.status(400).json({ code: 400, message: '参数不完整' })
    }

    if (!['wechat', 'alipay', 'bank'].includes(payType)) {
      return res.status(400).json({ code: 400, message: '不支持的支付方式' })
    }

    // 🔑 解析套餐信息：将 packageId（可能是code如'SAAS_BASIC'）解析为真实的数字ID
    // 同时获取年付赠送月数等信息
    let resolvedPackageId = packageId
    let bonusMonths = 0
    try {
      const isNumeric = /^\d+$/.test(String(packageId))
      const pkgQuery = isNumeric
        ? `SELECT * FROM tenant_packages WHERE id = ? LIMIT 1`
        : `SELECT * FROM tenant_packages WHERE code = ? LIMIT 1`
      const pkgRows = await AppDataSource.query(pkgQuery, [packageId])
      if (pkgRows.length > 0) {
        resolvedPackageId = String(pkgRows[0].id)
        if (billingCycle === 'yearly') {
          bonusMonths = Number(pkgRows[0].yearly_bonus_months) || 0
        }
        if (resolvedPackageId !== String(packageId)) {
          log.info(`[Payment] 套餐ID解析: ${packageId} → ${resolvedPackageId}`)
        }
      } else {
        log.warn(`[Payment] 未找到套餐 ${packageId}，将原样存入订单`)
      }
    } catch (e: any) {
      log.warn('[Payment] 解析套餐信息失败:', e.message?.substring(0, 100))
    }

    const result = await paymentService.createOrder({
      packageId: resolvedPackageId, packageName, amount, payType, tenantId, tenantName,
      contactName, contactPhone, contactEmail,
      billingCycle: billingCycle || 'monthly',
      bonusMonths
    })

    if (result.success) {
      const responseData: any = {
        orderId: result.orderId,
        orderNo: result.orderNo,
        qrCode: result.qrCode,
        payUrl: result.payUrl
      }

      // 对公转账 - 返回银行账户信息
      if (payType === 'bank') {
        try {
          const bankRows = await AppDataSource.query(
            'SELECT config_data FROM payment_configs WHERE pay_type = ? AND enabled = 1', ['bank']
          )
          if (bankRows.length > 0 && bankRows[0].config_data) {
            // 解密配置
            const { decryptPaymentConfig } = await import('../../utils/paymentCrypto')
            try {
              const decrypted = decryptPaymentConfig(bankRows[0].config_data)
              const bankData = JSON.parse(decrypted)
              responseData.bankInfo = {
                bankName: bankData.bankName || '',
                accountName: bankData.accountName || '',
                accountNo: bankData.accountNo || '',
                bankBranch: bankData.bankBranch || '',
                remark: bankData.remark || ''
              }
            } catch {
              // 尝试直接解析（未加密的旧数据）
              try {
                const bankData = JSON.parse(bankRows[0].config_data)
                responseData.bankInfo = {
                  bankName: bankData.bankName || '',
                  accountName: bankData.accountName || '',
                  accountNo: bankData.accountNo || '',
                  bankBranch: bankData.bankBranch || '',
                  remark: bankData.remark || ''
                }
              } catch {}
            }
          }
        } catch (e) {
          log.error('[Payment] 获取银行配置失败:', e)
        }
      }

      res.json({ code: 0, data: responseData })

      // 异步通知管理员（不阻塞响应）
      adminNotificationService.notify('payment_created', {
        title: `新支付订单：${packageName || '未知套餐'}`,
        content: `${contactName}（${contactPhone}）创建了${payType === 'wechat' ? '微信' : payType === 'alipay' ? '支付宝' : '对公转账'}支付订单，金额 ¥${amount}，订单号：${result.orderNo}`,
        relatedId: result.orderId,
        relatedType: 'payment_order',
        extraData: { orderNo: result.orderNo, amount, payType, contactName, contactPhone }
      }).catch(err => log.error('[Payment] 发送管理员通知失败:', err.message))
    } else {
      res.status(500).json({ code: 500, message: result.message })
    }
  } catch (error: any) {
    log.error('[Payment] 创建订单失败:', error)
    res.status(500).json({ code: 500, message: '创建订单失败' })
  }
})

// 获取可用的支付方式（公开接口，用于前端显示/隐藏支付选项）
router.get('/methods', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      'SELECT pay_type, enabled FROM payment_configs'
    )
    const methods: Record<string, boolean> = { wechat: false, alipay: false, bank: false }
    for (const row of rows) {
      if (row.pay_type && methods.hasOwnProperty(row.pay_type)) {
        // 兼容MySQL驱动返回 number/boolean/string/Buffer 等各种类型
        let enabled = row.enabled
        // Buffer 类型（MySQL BIT 列）
        if (Buffer.isBuffer(enabled)) enabled = enabled[0]
        methods[row.pay_type as keyof typeof methods] = enabled == 1 || enabled === true || enabled === '1'
      }
    }
    // 🔑 安全兆底：如果所有支付方式都未启用（表为空或全禁用），至少启用微信支付
    if (!methods.wechat && !methods.alipay && !methods.bank) {
      log.warn('[Payment] 所有支付方式均未启用，兑底启用微信支付')
      methods.wechat = true
    }
    log.info(`[Payment] 支付方式查询结果: ${JSON.stringify(methods)}, raw: ${JSON.stringify(rows.map((r: any) => ({ t: r.pay_type, e: r.enabled, type: typeof r.enabled })))}`)
    res.json({ code: 0, data: methods })
  } catch (error) {
    log.error('[Payment] 获取支付方式失败:', error)
    res.json({ code: 0, data: { wechat: true, alipay: true, bank: false } })
  }
})

// 获取对公转账银行信息（公开接口，用于转账确认页面显示）
router.get('/bank-info', async (_req: Request, res: Response) => {
  try {
    const bankRows = await AppDataSource.query(
      'SELECT config_data FROM payment_configs WHERE pay_type = ? AND enabled = 1', ['bank']
    )
    if (bankRows.length > 0 && bankRows[0].config_data) {
      const { decryptPaymentConfig } = await import('../../utils/paymentCrypto')
      try {
        const decrypted = decryptPaymentConfig(bankRows[0].config_data)
        const bankData = JSON.parse(decrypted)
        return res.json({
          code: 0,
          data: {
            bankName: bankData.bankName || '',
            accountName: bankData.accountName || '',
            accountNo: bankData.accountNo || '',
            bankBranch: bankData.bankBranch || '',
            remark: bankData.remark || ''
          }
        })
      } catch {
        try {
          const bankData = JSON.parse(bankRows[0].config_data)
          return res.json({
            code: 0,
            data: {
              bankName: bankData.bankName || '',
              accountName: bankData.accountName || '',
              accountNo: bankData.accountNo || '',
              bankBranch: bankData.bankBranch || '',
              remark: bankData.remark || ''
            }
          })
        } catch {}
      }
    }
    res.json({ code: 0, data: null })
  } catch (error) {
    log.error('[Payment] 获取银行配置失败:', error)
    res.json({ code: 0, data: null })
  }
})

// 查询订单状态（支付成功后返回授权码）
// 🔑 兜底逻辑：如果DB中订单仍为pending，主动向微信/支付宝查询真实支付状态
router.get('/query/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params
    let order = await paymentService.queryOrder(orderNo)

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }

    // 🔑 兜底：订单仍为 pending 时，主动向支付渠道查询真实状态（防止回调丢失/延迟）
    if (order.status === 'pending') {
      try {
        if (order.pay_type === 'wechat') {
          const { wechatPayService } = await import('../../services/WechatPayService')
          const wxResult = await wechatPayService.queryOrder(orderNo)
          if (wxResult.success && wxResult.data?.trade_state === 'SUCCESS') {
            log.info(`[Payment] 主动查询发现微信订单 ${orderNo} 已支付，执行补偿更新`)
            await paymentService.updateOrderStatus(orderNo, 'paid', {
              tradeNo: wxResult.data.transaction_id,
              paidAt: new Date()
            })
            // 重新读取已更新的订单
            order = await paymentService.queryOrder(orderNo)
          }
        }
        // 支付宝主动查询兜底
        if (order.pay_type === 'alipay') {
          try {
            const { alipayService } = await import('../../services/AlipayService')
            const aliResult = await alipayService.queryOrder(orderNo)
            if (aliResult.success && (aliResult.data?.trade_status === 'TRADE_SUCCESS' || aliResult.data?.trade_status === 'TRADE_FINISHED')) {
              log.info(`[Payment] 主动查询发现支付宝订单 ${orderNo} 已支付，执行补偿更新`)
              await paymentService.updateOrderStatus(orderNo, 'paid', {
                tradeNo: aliResult.data.trade_no,
                paidAt: new Date()
              })
              // 重新读取已更新的订单
              order = await paymentService.queryOrder(orderNo)
            }
          } catch (aliErr: any) {
            log.warn('[Payment] 支付宝主动查询失败（不影响正常流程）:', aliErr.message?.substring(0, 100))
          }
        }
      } catch (activeCheckErr: any) {
        log.warn('[Payment] 主动查询支付状态失败（不影响正常流程）:', activeCheckErr.message?.substring(0, 100))
      }
    }

    // 查询租户信息（授权码、编码、手机号）
    let licenseKey = null
    let tenantCode = null
    let adminUsername = null
    if (order.tenant_id) {
      const tenants = await AppDataSource.query(
        'SELECT code, license_key, license_status, phone FROM tenants WHERE id = ?', [order.tenant_id]
      )
      if (tenants.length > 0) {
        tenantCode = tenants[0].code
        licenseKey = tenants[0].license_key
        adminUsername = tenants[0].phone || null
      }
    }

    // 🔑 防竞态：如果订单已支付但租户授权码尚未生成（activateTenant仍在执行），
    // 返回 'processing' 让前端继续轮询，而不是跳转到无授权码的成功页
    let effectiveStatus = order.status
    if (order.status === 'paid' && order.tenant_id && !licenseKey) {
      log.warn(`[Payment] 订单 ${orderNo} 已支付但授权码尚未生成，返回 processing 状态`)
      effectiveStatus = 'processing'
    }

    res.json({
      code: 0,
      data: {
        orderNo: order.order_no,
        status: effectiveStatus,
        amount: order.amount,
        payType: order.pay_type,
        paidAt: order.paid_at,
        tenantId: order.tenant_id,
        tenantCode,
        licenseKey,
        adminUsername,
        adminPassword: adminUsername ? 'Aa123456' : null
      }
    })
  } catch (error) {
    log.error('[Payment] 查询订单失败:', error)
    res.status(500).json({ code: 500, message: '查询失败' })
  }
})

// 微信支付回调（V3 JSON格式）
router.post('/wechat/notify', async (req: Request, res: Response) => {
  try {
    const callbackData = req.body
    log.info('[Payment] 微信V3回调:', JSON.stringify(callbackData).substring(0, 500))

    // V3回调使用 WechatPayService 处理（JSON格式，AES-GCM加密）
    const { wechatPayService } = await import('../../services/WechatPayService')
    const result = await wechatPayService.handleCallback(callbackData)

    res.json({ code: result.code, message: result.message })
  } catch (error) {
    log.error('[Payment] 微信回调处理失败:', error)
    res.json({ code: 'FAIL', message: '系统错误' })
  }
})

// 支付宝回调
router.post('/alipay/notify', async (req: Request, res: Response) => {
  try {
    log.info('[Payment] 支付宝回调:', req.body)
    const result = await paymentService.handleAlipayNotify(req.body)

    if (result.success) {
      res.send('success')
    } else {
      res.send('fail')
    }
  } catch (error) {
    log.error('[Payment] 支付宝回调处理失败:', error)
    res.send('fail')
  }
})

// 为已有待支付订单重新生成二维码（不创建新订单）
router.post('/repay/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params
    const { payType } = req.body

    // 查询原订单
    const order = await paymentService.queryOrder(orderNo)
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }
    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '订单非待支付状态' })
    }

    const actualPayType = payType || order.pay_type || 'wechat'

    // 始终重新生成二维码（旧二维码可能已过期）
    let qrCode = ''
    let payUrl = ''
    if (actualPayType === 'wechat') {
      const result = await paymentService.createWechatOrderForExisting(orderNo, Number(order.amount), order.package_name || '套餐支付')
      qrCode = result.qrCode || ''
      payUrl = result.payUrl || ''
    } else if (actualPayType === 'alipay') {
      try {
        const result = await paymentService.createAlipayOrderForExisting(orderNo, Number(order.amount), order.package_name || '套餐支付')
        payUrl = result.payUrl || ''
        qrCode = result.qrCode || ''
      } catch (alipayErr: any) {
        log.error(`[Payment] 支付宝repay失败(orderNo=${orderNo}):`, alipayErr.message)
        return res.status(500).json({ code: 500, message: `支付宝二维码生成失败: ${alipayErr.message}` })
      }
    } else if (actualPayType === 'bank') {
      // 对公转账无需二维码，只更新支付方式
    }

    // 更新订单的二维码和支付方式
    await AppDataSource.query(
      'UPDATE payment_orders SET qr_code = ?, pay_url = ?, pay_type = ? WHERE order_no = ?',
      [qrCode, payUrl, actualPayType, orderNo]
    )

    res.json({
      code: 0,
      data: { orderNo: order.order_no, qrCode, payUrl }
    })
  } catch (error: any) {
    log.error('[Payment] 重新生成二维码失败:', error.message, error.stack?.substring(0, 300))
    res.status(500).json({ code: 500, message: `重新生成二维码失败: ${error.message}` })
  }
})

// 关闭订单
router.post('/close/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params

    // 获取订单信息用于通知
    const order = await paymentService.queryOrder(orderNo)
    await paymentService.closeOrder(orderNo)
    res.json({ code: 0, message: '订单已关闭' })

    // 异步通知管理员
    if (order) {
      adminNotificationService.notify('payment_cancelled', {
        title: `订单已取消：${orderNo}`,
        content: `订单 ${orderNo}（金额 ¥${order.amount || '?'}）已被关闭/取消`,
        relatedId: orderNo,
        relatedType: 'payment_order',
        extraData: { orderNo, amount: order.amount }
      }).catch(err => log.error('[Payment] 发送取消通知失败:', err.message))
    }
  } catch (_error) {
    res.status(500).json({ code: 500, message: '关闭失败' })
  }
})

// 模拟支付成功（仅开发环境使用）
router.post('/mock-pay/:orderNo', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ code: 403, message: '生产环境不允许模拟支付' })
  }

  try {
    const { orderNo } = req.params

    // 查询订单
    const order = await paymentService.queryOrder(orderNo)
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ code: 400, message: '订单状态不正确' })
    }

    // 模拟支付成功
    const mockTradeNo = `MOCK${Date.now()}`
    const licenseKey = await paymentService.updateOrderStatus(orderNo, 'paid', mockTradeNo)

    // 查询更新后的订单获取租户信息
    const updatedOrder = await paymentService.queryOrder(orderNo)
    let tenantCode = null
    if (updatedOrder?.tenant_id) {
      const tenants = await AppDataSource.query(
        'SELECT code FROM tenants WHERE id = ?', [updatedOrder.tenant_id]
      )
      if (tenants.length > 0) {
        tenantCode = tenants[0].code
      }
    }

    res.json({
      code: 0,
      message: '模拟支付成功',
      data: {
        orderNo,
        status: 'paid',
        tradeNo: mockTradeNo,
        tenantCode,
        licenseKey
      }
    })
  } catch (_error: any) {
    log.error('[Payment] 模拟支付失败:', _error)
    res.status(500).json({ code: 500, message: '模拟支付失败' })
  }
})

export default router
