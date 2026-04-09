/**
 * 管理后台 - 支付管理API
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { formatDateTime } from '../../utils/dateFormat'
import { encryptPaymentConfig, decryptPaymentConfig } from '../../utils/paymentCrypto'

import { log } from '../../config/logger';
const router = Router()

// 自动迁移：确保 payment_orders 表有退款操作人字段
const ensureRefundColumns = async () => {
  try {
    const cols = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    const existingCols = cols.map((c: any) => c.COLUMN_NAME)
    if (!existingCols.includes('refunded_by')) {
      await AppDataSource.query(
        `ALTER TABLE payment_orders ADD COLUMN refunded_by VARCHAR(100) DEFAULT NULL COMMENT '退款操作人'`
      )
      log.info('[Payment] 已添加 refunded_by 字段')
    }
  } catch (_e) {
    // 忽略错误（如表不存在等）
  }
}
// 延迟执行，等数据库连接就绪
setTimeout(() => ensureRefundColumns(), 3000)

// 加密/解密使用统一的 paymentCrypto 模块
const encrypt = (text: string): string => encryptPaymentConfig(text)
const decrypt = (encrypted: string): string => decryptPaymentConfig(encrypted)

// 获取支付配置
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      'SELECT pay_type, enabled, config_data, notify_url FROM payment_configs'
    )

    const config: Record<string, any> = {
      wechat: { enabled: false, mchId: '', appId: '', apiKey: '', notifyUrl: '' },
      alipay: { enabled: false, appId: '', privateKey: '', alipayPublicKey: '', signType: 'RSA2', notifyUrl: '' },
      bank: { enabled: false, bankName: '', accountName: '', accountNo: '', bankBranch: '', remark: '' }
    }

    for (const row of rows) {
      if (row.config_data) {
        try {
          const data = JSON.parse(decrypt(row.config_data) || '{}')
          if (row.pay_type === 'bank') {
            // 对公转账无敏感字段
            config.bank = {
              ...data,
              enabled: row.enabled === 1
            }
          } else {
            config[row.pay_type] = {
              ...data,
              enabled: row.enabled === 1,
              notifyUrl: row.notify_url,
              // 敏感字段脱敏
              apiKey: data.apiKey ? '******' : '',
              privateKey: data.privateKey ? '******' : '',
              alipayPublicKey: data.alipayPublicKey ? '******' : ''
            }
          }
        } catch {
          config[row.pay_type].enabled = row.enabled === 1
          if (row.notify_url) config[row.pay_type].notifyUrl = row.notify_url
        }
      } else {
        config[row.pay_type].enabled = row.enabled === 1
        if (row.notify_url) config[row.pay_type].notifyUrl = row.notify_url
      }
    }

    res.json({ success: true, data: config })
  } catch (error) {
    log.error('获取支付配置失败:', error)
    res.status(500).json({ success: false, message: '获取配置失败' })
  }
})

// 保存微信支付配置
router.post('/config/wechat', async (req: Request, res: Response) => {
  try {
    const {
      enabled, apiVersion, mchId, appId, apiKey, apiKeyV3, serialNo,
      receiveLimit, certPath, publicKeyPath, certPem, keyPem,
      miniAppBind, mchType, notifyUrl
    } = req.body
    const now = formatDateTime(new Date())

    // 获取现有配置
    const existing = await AppDataSource.query(
      'SELECT config_data FROM payment_configs WHERE pay_type = ?', ['wechat']
    )

    let configData: any = {}
    if (existing.length > 0 && existing[0].config_data) {
      try {
        configData = JSON.parse(decrypt(existing[0].config_data) || '{}')
      } catch {}
    }

    // 更新配置（敏感字段如果是 ****** 则保留原值）
    configData.apiVersion = apiVersion || 'v3'
    configData.mchId = mchId
    configData.appId = appId
    configData.serialNo = serialNo
    configData.receiveLimit = receiveLimit
    configData.certPath = certPath
    configData.miniAppBind = miniAppBind
    configData.mchType = mchType

    // 敏感字段处理
    if (apiKey && apiKey !== '******') configData.apiKey = apiKey
    if (apiKeyV3 && apiKeyV3 !== '******') configData.apiKeyV3 = apiKeyV3
    if (publicKeyPath) configData.publicKeyPath = publicKeyPath
    if (certPem) configData.certPem = certPem
    if (keyPem) configData.keyPem = keyPem

    const encryptedData = encrypt(JSON.stringify(configData))

    if (existing.length > 0) {
      await AppDataSource.query(
        'UPDATE payment_configs SET enabled = ?, config_data = ?, notify_url = ?, updated_at = ? WHERE pay_type = ?',
        [enabled ? 1 : 0, encryptedData, notifyUrl, now, 'wechat']
      )
    } else {
      await AppDataSource.query(
        'INSERT INTO payment_configs (id, pay_type, enabled, config_data, notify_url) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'wechat', enabled ? 1 : 0, encryptedData, notifyUrl]
      )
    }

    res.json({ success: true, message: '微信支付配置已保存' })
  } catch (error) {
    log.error('保存微信支付配置失败:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 保存支付宝配置
router.post('/config/alipay', async (req: Request, res: Response) => {
  try {
    const { enabled, appId, privateKey, alipayPublicKey, signType, notifyUrl } = req.body
    const now = formatDateTime(new Date())

    // 获取现有配置
    const existing = await AppDataSource.query(
      'SELECT config_data FROM payment_configs WHERE pay_type = ?', ['alipay']
    )

    let configData: any = {}
    if (existing.length > 0 && existing[0].config_data) {
      try {
        configData = JSON.parse(decrypt(existing[0].config_data) || '{}')
      } catch {}
    }

    // 更新配置
    configData.appId = appId
    configData.signType = signType || 'RSA2'
    if (privateKey && privateKey !== '******') {
      configData.privateKey = privateKey
    }
    if (alipayPublicKey && alipayPublicKey !== '******') {
      configData.alipayPublicKey = alipayPublicKey
    }

    const encryptedData = encrypt(JSON.stringify(configData))

    if (existing.length > 0) {
      await AppDataSource.query(
        'UPDATE payment_configs SET enabled = ?, config_data = ?, notify_url = ?, updated_at = ? WHERE pay_type = ?',
        [enabled ? 1 : 0, encryptedData, notifyUrl, now, 'alipay']
      )
    } else {
      await AppDataSource.query(
        'INSERT INTO payment_configs (id, pay_type, enabled, config_data, notify_url) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), 'alipay', enabled ? 1 : 0, encryptedData, notifyUrl]
      )
    }

    res.json({ success: true, message: '支付宝配置已保存' })
  } catch (error) {
    log.error('保存支付宝配置失败:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 保存对公转账配置
router.post('/config/bank', async (req: Request, res: Response) => {
  try {
    const { enabled, bankName, accountName, accountNo, bankBranch, remark } = req.body
    const now = formatDateTime(new Date())

    const configData = { bankName, accountName, accountNo, bankBranch, remark }
    const encryptedData = encrypt(JSON.stringify(configData))

    const existing = await AppDataSource.query(
      'SELECT id FROM payment_configs WHERE pay_type = ?', ['bank']
    )

    if (existing.length > 0) {
      await AppDataSource.query(
        'UPDATE payment_configs SET enabled = ?, config_data = ?, updated_at = ? WHERE pay_type = ?',
        [enabled ? 1 : 0, encryptedData, now, 'bank']
      )
    } else {
      await AppDataSource.query(
        'INSERT INTO payment_configs (id, pay_type, enabled, config_data) VALUES (?, ?, ?, ?)',
        [uuidv4(), 'bank', enabled ? 1 : 0, encryptedData]
      )
    }

    res.json({ success: true, message: '对公转账配置已保存' })
  } catch (error) {
    log.error('保存对公转账配置失败:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 测试微信支付连接
router.post('/config/wechat/test', async (req: Request, res: Response) => {
  try {
    // 从数据库读取已保存的配置
    const rows = await AppDataSource.query(
      'SELECT config_data, enabled FROM payment_configs WHERE pay_type = ?', ['wechat']
    )

    if (rows.length === 0 || !rows[0].config_data) {
      return res.json({ success: false, message: '请先保存微信支付配置' })
    }

    let configData: any = {}
    try {
      configData = JSON.parse(decrypt(rows[0].config_data) || '{}')
    } catch {
      return res.json({ success: false, message: '配置数据解析失败，请重新保存配置' })
    }

    const checkItems: { name: string; status: boolean; message: string }[] = []

    // 检查必填字段
    const hasAppId = !!configData.appId
    checkItems.push({
      name: 'AppID',
      status: hasAppId,
      message: hasAppId ? `AppID已配置: ${configData.appId}` : '未配置AppID'
    })

    const hasMchId = !!configData.mchId
    checkItems.push({
      name: '商户号',
      status: hasMchId,
      message: hasMchId ? `商户号已配置: ${configData.mchId}` : '未配置商户号'
    })

    const hasApiKey = !!(configData.apiKey || configData.apiKeyV3)
    checkItems.push({
      name: 'API密钥',
      status: hasApiKey,
      message: hasApiKey ? 'API密钥已配置' : '未配置API密钥（V2或V3）'
    })

    const hasCert = !!(configData.certPem || configData.certPath || configData.serialNo)
    checkItems.push({
      name: '证书',
      status: hasCert,
      message: hasCert ? '证书信息已配置' : '未配置证书信息（可选，V3支付需要）'
    })

    // 如果有商户号和API密钥，尝试真实连接测试（查询商户信息）
    let connectionTest = false
    let connectionMessage = ''

    if (hasMchId && hasApiKey && configData.apiKeyV3) {
      try {
        // V3接口：获取平台证书列表来验证配置是否正确
        const timestamp = Math.floor(Date.now() / 1000).toString()
        const nonceStr = crypto.randomBytes(16).toString('hex')
        const method = 'GET'
        const urlPath = '/v3/certificates'

        // 构建签名串
        const signStr = `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n\n`

        // 如果有私钥，用私钥签名
        if (configData.keyPem) {
          try {
            const sign = crypto.createSign('RSA-SHA256')
            sign.update(signStr)
            const signature = sign.sign(configData.keyPem, 'base64')

            const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${configData.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${configData.serialNo || ''}"`

            const response = await fetch('https://api.mch.weixin.qq.com/v3/certificates', {
              method: 'GET',
              headers: {
                'Authorization': authorization,
                'Accept': 'application/json',
                'User-Agent': 'CRM-Platform/1.0'
              }
            })

            if (response.ok) {
              connectionTest = true
              connectionMessage = '微信支付V3接口连接成功'
            } else {
              const errBody = await response.text()
              connectionMessage = `连接返回 ${response.status}: ${errBody.substring(0, 200)}`
            }
          } catch (signErr: any) {
            connectionMessage = `签名失败: ${signErr.message}`
          }
        } else {
          connectionMessage = '缺少商户私钥(keyPem)，无法进行V3接口验证'
        }
      } catch (err: any) {
        connectionMessage = `连接测试异常: ${err.message}`
      }
    } else if (hasMchId && hasApiKey) {
      // V2接口简单测试：检查配置完整性即可
      connectionTest = true
      connectionMessage = '配置项检查通过（V2接口无在线验证，请通过实际支付验证）'
    } else {
      connectionMessage = '配置不完整，无法进行连接测试'
    }

    checkItems.push({
      name: '连接测试',
      status: connectionTest,
      message: connectionMessage
    })

    const allPassed = checkItems.filter(i => i.name !== '证书').every(i => i.status)

    res.json({
      success: true,
      data: {
        passed: allPassed,
        items: checkItems,
        message: allPassed ? '微信支付配置验证通过' : '部分配置项未通过验证，请检查'
      }
    })
  } catch (error: any) {
    log.error('测试微信支付连接失败:', error)
    res.status(500).json({ success: false, message: '测试失败: ' + (error.message || '未知错误') })
  }
})

// 测试支付宝连接
router.post('/config/alipay/test', async (req: Request, res: Response) => {
  try {
    // 从数据库读取已保存的配置
    const rows = await AppDataSource.query(
      'SELECT config_data, enabled FROM payment_configs WHERE pay_type = ?', ['alipay']
    )

    if (rows.length === 0 || !rows[0].config_data) {
      return res.json({ success: false, message: '请先保存支付宝配置' })
    }

    let configData: any = {}
    try {
      configData = JSON.parse(decrypt(rows[0].config_data) || '{}')
    } catch {
      return res.json({ success: false, message: '配置数据解析失败，请重新保存配置' })
    }

    const checkItems: { name: string; status: boolean; message: string }[] = []

    // 检查必填字段
    const hasAppId = !!configData.appId
    checkItems.push({
      name: 'AppID',
      status: hasAppId,
      message: hasAppId ? `AppID已配置: ${configData.appId}` : '未配置应用AppID'
    })

    const hasPrivateKey = !!configData.privateKey
    checkItems.push({
      name: '商家私钥',
      status: hasPrivateKey,
      message: hasPrivateKey ? '商家私钥已配置' : '未配置商家私钥'
    })

    const hasPublicKey = !!configData.alipayPublicKey
    checkItems.push({
      name: '支付宝公钥',
      status: hasPublicKey,
      message: hasPublicKey ? '支付宝公钥已配置' : '未配置支付宝公钥'
    })

    const signType = configData.signType || 'RSA2'
    checkItems.push({
      name: '签名类型',
      status: true,
      message: `签名类型: ${signType}`
    })

    // 如果配置完整，尝试调用支付宝网关验证
    let connectionTest = false
    let connectionMessage = ''

    if (hasAppId && hasPrivateKey) {
      try {
        const timestamp = formatDateTime(new Date())

        const bizContent = JSON.stringify({})
        const params: Record<string, string> = {
          app_id: configData.appId,
          method: 'alipay.user.info.share',  // 用一个简单接口测试签名
          format: 'JSON',
          charset: 'utf-8',
          sign_type: signType,
          timestamp: timestamp,
          version: '1.0',
          biz_content: bizContent
        }

        // 尝试签名验证私钥格式是否正确
        const sorted = Object.keys(params).sort()
        const signStr = sorted.map(k => `${k}=${params[k]}`).join('&')
        const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1'

        // 格式化私钥
        let formattedKey = configData.privateKey
        if (!formattedKey.includes('-----BEGIN')) {
          formattedKey = `-----BEGIN RSA PRIVATE KEY-----\n${formattedKey}\n-----END RSA PRIVATE KEY-----`
        }

        const sign = crypto.createSign(algorithm)
        sign.update(signStr)
        const signature = sign.sign(formattedKey, 'base64')

        if (signature) {
          // 签名成功，尝试调用支付宝网关
          params.sign = signature
          const queryString = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&')

          const response = await fetch(`https://openapi.alipay.com/gateway.do?${queryString}`, {
            method: 'GET',
            headers: { 'User-Agent': 'CRM-Platform/1.0' }
          })

          const result = await response.json() as any

          // 支付宝返回的错误码说明：
          // 即使业务报错（如权限不足），只要网关能响应且签名正确就说明配置OK
          if (result.error_response) {
            const errCode = result.error_response.code
            if (errCode === '40001') {
              // Missing Required Arguments - 说明网关可达，但参数不全（正常）
              connectionTest = true
              connectionMessage = '支付宝网关连接成功，签名验证通过'
            } else if (errCode === '40002') {
              // Invalid Arguments
              connectionTest = true
              connectionMessage = '支付宝网关连接成功，AppID和签名验证通过'
            } else if (errCode === '40006') {
              // Insufficient Permissions
              connectionTest = true
              connectionMessage = '支付宝网关连接成功（接口权限受限，但配置正确）'
            } else if (errCode === '20001') {
              // Insufficient Authorization - 授权不足但签名正确
              connectionTest = true
              connectionMessage = '支付宝网关连接成功，签名验证通过'
            } else {
              connectionMessage = `支付宝返回错误: [${errCode}] ${result.error_response.sub_msg || result.error_response.msg || '未知错误'}`
              // 如果不是签名错误(isv.invalid-signature)，配置可能是对的
              if (result.error_response.sub_code !== 'isv.invalid-signature') {
                connectionTest = true
                connectionMessage += '（配置可能正确，建议通过实际支付验证）'
              }
            }
          } else {
            connectionTest = true
            connectionMessage = '支付宝网关连接成功'
          }
        }
      } catch (signErr: any) {
        if (signErr.message.includes('key') || signErr.message.includes('private') || signErr.message.includes('PEM')) {
          connectionMessage = '私钥格式错误，请检查私钥内容是否正确'
        } else {
          connectionMessage = `连接测试失败: ${signErr.message}`
        }
      }
    } else {
      connectionMessage = '配置不完整（缺少AppID或私钥），无法进行连接测试'
    }

    checkItems.push({
      name: '连接测试',
      status: connectionTest,
      message: connectionMessage
    })

    const allPassed = checkItems.every(i => i.status)

    res.json({
      success: true,
      data: {
        passed: allPassed,
        items: checkItems,
        message: allPassed ? '支付宝配置验证通过' : '部分配置项未通过验证，请检查'
      }
    })
  } catch (error: any) {
    log.error('测试支付宝连接失败:', error)
    res.status(500).json({ success: false, message: '测试失败: ' + (error.message || '未知错误') })
  }
})

// 获取支付订单列表
router.get('/orders', async (req: Request, res: Response) => {
  try {
    // 检查 payment_orders 表是否存在
    const tableCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    if (!tableCheck[0]?.cnt) {
      return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 10 } })
    }

    const { page = 1, pageSize = 10, orderNo, payType, status, startDate, endDate, billingType, orderType } = req.query as any
    const offset = (page - 1) * pageSize

    let where = '1=1'
    const params: any[] = []

    if (orderNo) {
      where += ' AND po.order_no LIKE ?'
      params.push(`%${orderNo}%`)
    }
    if (payType) {
      where += ' AND po.pay_type = ?'
      params.push(payType)
    }
    if (status) {
      where += ' AND po.status = ?'
      params.push(status)
    }
    if (startDate) {
      where += ' AND po.created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND po.created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }
    if (billingType) {
      if (billingType === 'subscription') {
        where += " AND po.billing_cycle IN ('monthly', 'yearly')"
      } else if (billingType === 'once') {
        where += " AND (po.billing_cycle = 'once' OR po.billing_cycle IS NULL)"
      }
    }
    if (orderType) {
      if (orderType === 'capacity') {
        where += " AND po.order_no LIKE 'CAP%'"
      } else if (orderType === 'package') {
        where += " AND po.order_no NOT LIKE 'CAP%'"
      }
    }

    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders po WHERE ${where}`, params
    )
    const total = countResult[0].total

    // 检查 billing_cycle 字段是否存在
    const colCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders' AND COLUMN_NAME = 'billing_cycle'`
    )
    const hasBillingCycle = !!colCheck[0]?.cnt

    // 直接返回 billing_cycle（月付/年付/买断），由前端展示对应文本
    const billingCycleExpr = hasBillingCycle ? 'po.billing_cycle' : "NULL"

    const orders = await AppDataSource.query(
      `SELECT po.id, po.order_no, po.tenant_name, po.package_name, po.amount, po.pay_type, po.status,
              po.trade_no, po.contact_name, po.contact_phone, po.created_at, po.paid_at, po.refund_amount,
              ${billingCycleExpr} as billing_cycle
       FROM payment_orders po
       WHERE ${where} ORDER BY po.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )

    res.json({ success: true, data: { list: orders, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    log.error('获取支付订单失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取支付统计
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 检查 payment_orders 表是否存在
    const tableCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    if (!tableCheck[0]?.cnt) {
      return res.json({ success: true, data: { totalAmount: 0, totalCount: 0, refundAmount: 0, pendingCount: 0, maxAmount: 0 } })
    }

    const { startDate, endDate, payType, customerType, billingType } = req.query as any

    let dateWhere = ''
    const params: any[] = []
    if (startDate) {
      dateWhere += ' AND created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      dateWhere += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }
    if (payType) {
      dateWhere += ' AND pay_type = ?'
      params.push(payType)
    }
    if (customerType) {
      if (customerType === 'tenant') {
        dateWhere += " AND tenant_name IS NOT NULL AND tenant_name != ''"
      } else if (customerType === 'private') {
        dateWhere += " AND (tenant_name IS NULL OR tenant_name = '')"
      }
    }
    if (billingType) {
      if (billingType === 'subscription') {
        dateWhere += " AND billing_cycle IN ('monthly', 'yearly')"
      } else if (billingType === 'once') {
        dateWhere += " AND (billing_cycle = 'once' OR billing_cycle IS NULL)"
      }
    }

    // 总交易额、笔数和最高单笔金额
    const totalResult = await AppDataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as totalAmount, COUNT(*) as totalCount, COALESCE(MAX(amount), 0) as maxAmount
       FROM payment_orders WHERE status = 'paid' ${dateWhere}`, params
    )

    // 退款金额
    const refundResult = await AppDataSource.query(
      `SELECT COALESCE(SUM(refund_amount), 0) as refundAmount
       FROM payment_orders WHERE status = 'refunded' ${dateWhere}`, params
    )

    // 待处理订单
    const pendingResult = await AppDataSource.query(
      `SELECT COUNT(*) as pendingCount FROM payment_orders WHERE status = 'pending' ${dateWhere}`, params
    )

    res.json({
      success: true,
      data: {
        totalAmount: Number(totalResult[0].totalAmount),
        totalCount: Number(totalResult[0].totalCount),
        refundAmount: Number(refundResult[0].refundAmount),
        pendingCount: Number(pendingResult[0].pendingCount),
        maxAmount: Number(totalResult[0].maxAmount)
      }
    })
  } catch (error) {
    log.error('获取支付统计失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 订单详情
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const orders = await AppDataSource.query(
      `SELECT * FROM payment_orders WHERE id = ?`, [id]
    )
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }

    // 获取日志
    const logs = await AppDataSource.query(
      'SELECT action, pay_type, result, error_msg, created_at FROM payment_logs WHERE order_id = ? ORDER BY created_at DESC',
      [id]
    )

    res.json({ success: true, data: { ...orders[0], logs } })
  } catch (_error) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 确认到账（对公转账-管理员手动确认）
router.post('/orders/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { tradeNo, remark } = req.body
    const now = formatDateTime(new Date())

    // 检查订单状态
    const orders = await AppDataSource.query(
      'SELECT order_no, status, pay_type FROM payment_orders WHERE id = ?', [id]
    )
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    if (orders[0].status !== 'pending') {
      return res.status(400).json({ success: false, message: '只能确认待支付的订单' })
    }

    // 触发支付成功后的交付流程（激活租户等）
    const { paymentService } = await import('../../services/PaymentService')
    await paymentService.updateOrderStatus(orders[0].order_no, 'paid', tradeNo || `BANK${Date.now()}`)

    res.json({ success: true, message: '已确认到账' })
  } catch (error) {
    log.error('确认到账失败:', error)
    res.status(500).json({ success: false, message: '确认到账失败' })
  }
})

// 退款
router.post('/orders/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const now = formatDateTime(new Date())
    const adminUser = (req as any).adminUser

    // 1. 验证订单存在性和当前状态
    const orders = await AppDataSource.query(
      'SELECT id, order_no, status, amount, pay_type, tenant_id, tenant_name, contact_name, contact_phone, package_name FROM payment_orders WHERE id = ?',
      [id]
    )
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    const order = orders[0]
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: '只能对已支付的订单进行退款' })
    }

    // TODO: 调用微信/支付宝退款API（对公转账无需调用第三方退款接口）

    // 2. 更新订单状态为已退款
    const updateResult = await AppDataSource.query(
      `UPDATE payment_orders SET status = 'refunded', refund_amount = amount,
       refund_at = ?, refund_reason = ?, refunded_by = ? WHERE id = ? AND status = 'paid'`,
      [now, reason || '', adminUser?.username || 'admin', id]
    )

    // 检查是否实际更新了记录（防止并发重复退款）
    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '退款失败，订单状态已变更' })
    }

    // 3. 退款后处理关联业务
    const isCapacityOrder = order.order_no.startsWith('CAP')

    if (isCapacityOrder && order.tenant_id) {
      // 🔑 扩容订单退款：扣回扩容额度，不暂停租户授权
      try {
        const capOrders = await AppDataSource.query(
          'SELECT type, quantity FROM capacity_orders WHERE order_no = ? AND status = ?',
          [order.order_no, 'paid']
        )
        if (capOrders.length > 0) {
          const capOrder = capOrders[0]
          // 扣回扩容额度
          if (capOrder.type === 'user') {
            await AppDataSource.query(
              'UPDATE tenants SET extra_users = GREATEST(COALESCE(extra_users, 0) - ?, 0) WHERE id = ?',
              [capOrder.quantity, order.tenant_id]
            )
            // 同步更新 max_users
            await AppDataSource.query(
              `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
               SET t.max_users = COALESCE(tp.max_users, t.max_users) + COALESCE(t.extra_users, 0)
               WHERE t.id = ?`,
              [order.tenant_id]
            )
          } else if (capOrder.type === 'storage') {
            await AppDataSource.query(
              'UPDATE tenants SET extra_storage_gb = GREATEST(COALESCE(extra_storage_gb, 0) - ?, 0) WHERE id = ?',
              [capOrder.quantity, order.tenant_id]
            )
            // 同步更新 max_storage_gb
            await AppDataSource.query(
              `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
               SET t.max_storage_gb = COALESCE(tp.max_storage_gb, t.max_storage_gb) + COALESCE(t.extra_storage_gb, 0)
               WHERE t.id = ?`,
              [order.tenant_id]
            )
          }
          // 同步更新 capacity_orders 状态为已退款
          await AppDataSource.query(
            `UPDATE capacity_orders SET status = 'refunded' WHERE order_no = ?`,
            [order.order_no]
          )
          log.info(`[Payment Refund] 扩容退款已扣回: tenant=${order.tenant_id}, type=${capOrder.type}, qty=${capOrder.quantity}`)
        }
      } catch (capRefundErr) {
        log.error('[Payment Refund] 扩容退款扣回失败:', capRefundErr)
      }
    } else if (order.tenant_id) {
      // 套餐订单退款：暂停关联租户的授权
      try {
        await AppDataSource.query(
          `UPDATE tenants SET license_status = 'suspended', status = 'suspended', updated_at = NOW()
           WHERE id = ? AND license_status = 'active'`,
          [order.tenant_id]
        )

        // 记录租户授权日志
        const { v4: logUuidv4 } = await import('uuid')
        await AppDataSource.query(
          `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message)
           VALUES (?, ?, 'suspend', 'success', ?)`,
          [logUuidv4(), order.tenant_id, `退款导致授权暂停，订单号: ${order.order_no}，退款金额: ¥${order.amount}，原因: ${reason || '无'}`]
        ).catch(() => {})

        log.info(`[Payment Refund] 已暂停租户授权: ${order.tenant_id}，订单号: ${order.order_no}`)
      } catch (tenantErr) {
        log.error('[Payment Refund] 暂停租户授权失败:', tenantErr)
        // 不影响退款主流程
      }
    }

    // 4. 记录退款操作日志到 payment_logs
    try {
      await AppDataSource.query(
        `INSERT INTO payment_logs (id, order_id, order_no, action, pay_type, request_data, response_data, result, error_msg)
         VALUES (?, ?, ?, 'refund', ?, ?, ?, 'success', NULL)`,
        [
          uuidv4(), order.id, order.order_no, order.pay_type,
          JSON.stringify({ reason: reason || '', operator: adminUser?.username || 'admin' }),
          JSON.stringify({ refundAmount: order.amount, refundAt: now, tenantSuspended: !!order.tenant_id })
        ]
      )
    } catch (logErr) {
      log.error('[Payment Refund] 记录操作日志失败:', logErr)
    }

    // 5. 发送退款通知
    try {
      const { adminNotificationService } = await import('../../services/AdminNotificationService')
      await adminNotificationService.notify('payment_refund', {
        title: `订单退款：¥${order.amount}`,
        content: `订单 ${order.order_no}（${order.tenant_name || order.contact_name || '未知客户'}）已退款 ¥${order.amount}，退款原因：${reason || '未填写'}，操作人：${adminUser?.username || 'admin'}`,
        relatedId: order.order_no,
        relatedType: 'payment_order',
        extraData: { orderNo: order.order_no, amount: order.amount, reason, operator: adminUser?.username }
      })
    } catch (notifyErr) {
      log.error('[Payment Refund] 发送退款通知失败:', notifyErr)
    }

    res.json({
      success: true,
      message: isCapacityOrder
        ? '退款成功，已扣回扩容额度'
        : (order.tenant_id ? '退款成功，已暂停关联租户授权' : '退款成功')
    })
  } catch (error) {
    log.error('退款失败:', error)
    res.status(500).json({ success: false, message: '退款失败' })
  }
})

// 关闭订单
router.post('/orders/:id/close', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const now = formatDateTime(new Date())

    // 获取订单号用于同步关闭 capacity_orders
    const orders = await AppDataSource.query(
      'SELECT order_no FROM payment_orders WHERE id = ? AND status = ?', [id, 'pending']
    )

    await AppDataSource.query(
      `UPDATE payment_orders SET status = 'closed', updated_at = ? WHERE id = ? AND status = 'pending'`,
      [now, id]
    )

    // 🔑 扩容订单同步关闭 capacity_orders
    if (orders.length > 0 && orders[0].order_no?.startsWith('CAP')) {
      await AppDataSource.query(
        `UPDATE capacity_orders SET status = 'closed' WHERE order_no = ? AND status = 'pending'`,
        [orders[0].order_no]
      ).catch(() => {})
    }

    res.json({ success: true, message: '订单已关闭' })
  } catch (error) {
    res.status(500).json({ success: false, message: '关闭订单失败' })
  }
})

// 支付报表数据
router.get('/reports', async (req: Request, res: Response) => {
  try {
    // 检查 payment_orders 表是否存在
    const tableCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    if (!tableCheck[0]?.cnt) {
      return res.json({ success: true, data: { timeSeriesData: [], byPayType: [], byPackage: [], byCustomerType: [] } })
    }

    const { startDate, endDate, groupBy = 'day', payType, customerType, billingType } = req.query as any

    let dateWhere = "AND status = 'paid'"
    const params: any[] = []

    if (startDate) {
      dateWhere += ' AND created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      dateWhere += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }
    if (payType) {
      dateWhere += ' AND pay_type = ?'
      params.push(payType)
    }
    if (customerType) {
      if (customerType === 'tenant') {
        dateWhere += " AND tenant_name IS NOT NULL AND tenant_name != ''"
      } else if (customerType === 'private') {
        dateWhere += " AND (tenant_name IS NULL OR tenant_name = '')"
      }
    }
    if (billingType) {
      if (billingType === 'subscription') {
        dateWhere += " AND billing_cycle IN ('monthly', 'yearly')"
      } else if (billingType === 'once') {
        dateWhere += " AND (billing_cycle = 'once' OR billing_cycle IS NULL)"
      }
    }

    // 时间格式化模板
    let dateFormat = '%Y-%m-%d'
    if (groupBy === 'month') dateFormat = '%Y-%m'
    else if (groupBy === 'year') dateFormat = '%Y'

    // 时间序列数据（含按支付方式拆分的金额）
    const timeSeriesData = await AppDataSource.query(
      `SELECT DATE_FORMAT(created_at, ?) as date,
              COALESCE(SUM(amount), 0) as amount,
              COUNT(*) as count,
              COALESCE(SUM(CASE WHEN pay_type = 'wechat' THEN amount ELSE 0 END), 0) as wechatAmount,
              COALESCE(SUM(CASE WHEN pay_type = 'alipay' THEN amount ELSE 0 END), 0) as alipayAmount,
              COALESCE(SUM(CASE WHEN pay_type = 'bank' THEN amount ELSE 0 END), 0) as bankAmount
       FROM payment_orders
       WHERE 1=1 ${dateWhere}
       GROUP BY date ORDER BY date ASC`,
      [dateFormat, ...params]
    )

    // 按支付方式分组
    const byPayType = await AppDataSource.query(
      `SELECT pay_type as payType,
              COALESCE(SUM(amount), 0) as amount,
              COUNT(*) as count
       FROM payment_orders
       WHERE 1=1 ${dateWhere}
       GROUP BY pay_type`,
      params
    )

    // 按套餐分组
    const byPackage = await AppDataSource.query(
      `SELECT COALESCE(package_name, '未知套餐') as packageName,
              COALESCE(SUM(amount), 0) as amount,
              COUNT(*) as count
       FROM payment_orders
       WHERE 1=1 ${dateWhere}
       GROUP BY package_name ORDER BY amount DESC`,
      params
    )

    // 按客户类型分组（通过tenant_name判断）
    const byCustomerType = await AppDataSource.query(
      `SELECT
         CASE WHEN tenant_name IS NOT NULL AND tenant_name != '' THEN 'tenant' ELSE 'private' END as customerType,
         COALESCE(SUM(amount), 0) as amount,
         COUNT(*) as count
       FROM payment_orders
       WHERE 1=1 ${dateWhere}
       GROUP BY customerType`,
      params
    )

    res.json({
      success: true,
      data: {
        timeSeriesData,
        byPayType,
        byPackage,
        byCustomerType
      }
    })
  } catch (error) {
    log.error('获取支付报表失败:', error)
    res.status(500).json({ success: false, message: '获取报表失败' })
  }
})

// 导出支付报表CSV
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, payType, customerType, billingType } = req.query as any

    let dateWhere = ''
    const params: any[] = []

    if (startDate) {
      dateWhere += ' AND created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      dateWhere += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }
    if (payType) {
      dateWhere += ' AND pay_type = ?'
      params.push(payType)
    }
    if (billingType) {
      if (billingType === 'subscription') {
        dateWhere += " AND billing_cycle IN ('monthly', 'yearly')"
      } else if (billingType === 'once') {
        dateWhere += " AND (billing_cycle = 'once' OR billing_cycle IS NULL)"
      }
    }

    const orders = await AppDataSource.query(
      `SELECT order_no, tenant_name, package_name, amount, pay_type, status,
              trade_no, contact_name, contact_phone, created_at, paid_at, refund_amount
       FROM payment_orders WHERE 1=1 ${dateWhere} ORDER BY created_at DESC`,
      params
    )

    // 生成CSV
    const header = '订单号,订单类型,客户名称,套餐名称,金额,支付方式,状态,交易号,联系人,联系电话,创建时间,支付时间,退款金额'
    const payTypeMap: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '对公转账' }
    const statusMap: Record<string, string> = { pending: '待支付', paid: '已支付', refunded: '已退款', closed: '已关闭' }

    const rows = orders.map((o: any) => [
      o.order_no || '',
      (o.order_no || '').startsWith('CAP') ? '扩容订单' : '套餐订单',
      o.tenant_name || '',
      o.package_name || '',
      o.amount || 0,
      payTypeMap[o.pay_type] || o.pay_type || '',
      statusMap[o.status] || o.status || '',
      o.trade_no || '',
      o.contact_name || '',
      o.contact_phone || '',
      o.created_at || '',
      o.paid_at || '',
      o.refund_amount || 0
    ].map(v => `"${v}"`).join(','))

    const csv = '\uFEFF' + header + '\n' + rows.join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=payment_report_${Date.now()}.csv`)
    res.send(csv)
  } catch (error) {
    log.error('导出支付报表失败:', error)
    res.status(500).json({ success: false, message: '导出失败' })
  }
})

export default router
