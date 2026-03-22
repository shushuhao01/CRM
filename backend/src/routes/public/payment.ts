/**
 * 公开支付API - 官网支付
 */
import { Router, Request, Response } from 'express'
import { paymentService } from '../../services/PaymentService'
import { AppDataSource } from '../../config/database'
import { adminNotificationService } from '../../services/AdminNotificationService'

const router = Router()

// 创建支付订单
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { packageId, packageName, amount, payType, tenantId, tenantName,
            contactName, contactPhone, contactEmail } = req.body

    if (!packageId || !amount || !payType || !contactName || !contactPhone) {
      return res.status(400).json({ code: 400, message: '参数不完整' })
    }

    if (!['wechat', 'alipay', 'bank'].includes(payType)) {
      return res.status(400).json({ code: 400, message: '不支持的支付方式' })
    }

    const result = await paymentService.createOrder({
      packageId, packageName, amount, payType, tenantId, tenantName,
      contactName, contactPhone, contactEmail
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
            const crypto = await import('crypto')
            const ENCRYPT_KEY = process.env.PAYMENT_ENCRYPT_KEY || 'crm-payment-secret-key-2024'
            try {
              const decipher = crypto.createDecipheriv('aes-256-cbc',
                crypto.scryptSync(ENCRYPT_KEY, 'salt', 32),
                Buffer.alloc(16, 0))
              const decrypted = decipher.update(bankRows[0].config_data, 'hex', 'utf8') + decipher.final('utf8')
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
          console.error('[Payment] 获取银行配置失败:', e)
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
      }).catch(err => console.error('[Payment] 发送管理员通知失败:', err.message))
    } else {
      res.status(500).json({ code: 500, message: result.message })
    }
  } catch (error: any) {
    console.error('[Payment] 创建订单失败:', error)
    res.status(500).json({ code: 500, message: '创建订单失败' })
  }
})

// 查询订单状态（支付成功后返回授权码）
router.get('/query/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params
    const order = await paymentService.queryOrder(orderNo)

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' })
    }

    // 如果已支付，查询租户的授权码
    let licenseKey = null
    let tenantCode = null
    if (order.status === 'paid' && order.tenant_id) {
      const tenants = await AppDataSource.query(
        'SELECT code, license_key FROM tenants WHERE id = ?', [order.tenant_id]
      )
      if (tenants.length > 0) {
        tenantCode = tenants[0].code
        licenseKey = tenants[0].license_key
      }
    }

    res.json({
      code: 0,
      data: {
        orderNo: order.order_no,
        status: order.status,
        amount: order.amount,
        payType: order.pay_type,
        paidAt: order.paid_at,
        tenantId: order.tenant_id,
        tenantCode,
        licenseKey
      }
    })
  } catch (error) {
    console.error('[Payment] 查询订单失败:', error)
    res.status(500).json({ code: 500, message: '查询失败' })
  }
})

// 微信支付回调
router.post('/wechat/notify', async (req: Request, res: Response) => {
  try {
    let xmlData = ''
    req.on('data', chunk => { xmlData += chunk })
    req.on('end', async () => {
      console.log('[Payment] 微信回调:', xmlData)
      const result = await paymentService.handleWechatNotify(xmlData)

      if (result.success) {
        res.set('Content-Type', 'application/xml')
        res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>')
      } else {
        res.set('Content-Type', 'application/xml')
        res.send(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${result.message}]]></return_msg></xml>`)
      }
    })
  } catch (error) {
    console.error('[Payment] 微信回调处理失败:', error)
    res.set('Content-Type', 'application/xml')
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[系统错误]]></return_msg></xml>')
  }
})

// 支付宝回调
router.post('/alipay/notify', async (req: Request, res: Response) => {
  try {
    console.log('[Payment] 支付宝回调:', req.body)
    const result = await paymentService.handleAlipayNotify(req.body)

    if (result.success) {
      res.send('success')
    } else {
      res.send('fail')
    }
  } catch (error) {
    console.error('[Payment] 支付宝回调处理失败:', error)
    res.send('fail')
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
      }).catch(err => console.error('[Payment] 发送取消通知失败:', err.message))
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
    console.error('[Payment] 模拟支付失败:', _error)
    res.status(500).json({ code: 500, message: '模拟支付失败' })
  }
})

export default router
