/**
 * 管理后台 - 支付管理API
 */
import { Router, Request, Response } from 'express'
import { AppDataSource } from '../../config/database'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'

const router = Router()

// 加密密钥（生产环境应从环境变量读取）
const ENCRYPT_KEY = process.env.PAYMENT_ENCRYPT_KEY || 'crm-payment-secret-key-2024'

// 简单加密
const encrypt = (text: string): string => {
  const cipher = crypto.createCipheriv('aes-256-cbc',
    crypto.scryptSync(ENCRYPT_KEY, 'salt', 32),
    Buffer.alloc(16, 0))
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

// 简单解密
const decrypt = (encrypted: string): string => {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc',
      crypto.scryptSync(ENCRYPT_KEY, 'salt', 32),
      Buffer.alloc(16, 0))
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch {
    return ''
  }
}

// 获取支付配置
router.get('/config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      'SELECT pay_type, enabled, config_data, notify_url FROM payment_configs'
    )

    const config: Record<string, any> = {
      wechat: { enabled: false, mchId: '', appId: '', apiKey: '', notifyUrl: '' },
      alipay: { enabled: false, appId: '', privateKey: '', alipayPublicKey: '', signType: 'RSA2', notifyUrl: '' }
    }

    for (const row of rows) {
      if (row.config_data) {
        try {
          const data = JSON.parse(decrypt(row.config_data) || '{}')
          config[row.pay_type] = {
            ...data,
            enabled: row.enabled === 1,
            notifyUrl: row.notify_url,
            // 敏感字段脱敏
            apiKey: data.apiKey ? '******' : '',
            privateKey: data.privateKey ? '******' : '',
            alipayPublicKey: data.alipayPublicKey ? '******' : ''
          }
        } catch {
          config[row.pay_type].enabled = row.enabled === 1
          config[row.pay_type].notifyUrl = row.notify_url
        }
      } else {
        config[row.pay_type].enabled = row.enabled === 1
        config[row.pay_type].notifyUrl = row.notify_url
      }
    }

    res.json({ success: true, data: config })
  } catch (error) {
    console.error('获取支付配置失败:', error)
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
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

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
    console.error('保存微信支付配置失败:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 保存支付宝配置
router.post('/config/alipay', async (req: Request, res: Response) => {
  try {
    const { enabled, appId, privateKey, alipayPublicKey, signType, notifyUrl } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

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
    console.error('保存支付宝配置失败:', error)
    res.status(500).json({ success: false, message: '保存失败' })
  }
})

// 获取支付订单列表
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, orderNo, payType, status, startDate, endDate } = req.query as any
    const offset = (page - 1) * pageSize

    let where = '1=1'
    const params: any[] = []

    if (orderNo) {
      where += ' AND order_no LIKE ?'
      params.push(`%${orderNo}%`)
    }
    if (payType) {
      where += ' AND pay_type = ?'
      params.push(payType)
    }
    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }
    if (startDate) {
      where += ' AND created_at >= ?'
      params.push(startDate)
    }
    if (endDate) {
      where += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }

    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE ${where}`, params
    )
    const total = countResult[0].total

    const orders = await AppDataSource.query(
      `SELECT id, order_no, tenant_name, package_name, amount, pay_type, status,
              trade_no, contact_name, contact_phone, created_at, paid_at, refund_amount
       FROM payment_orders WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )

    res.json({ success: true, data: { list: orders, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    console.error('获取支付订单失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 获取支付统计
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as any

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

    // 总交易额和笔数
    const totalResult = await AppDataSource.query(
      `SELECT COALESCE(SUM(amount), 0) as totalAmount, COUNT(*) as totalCount
       FROM payment_orders WHERE status = 'paid' ${dateWhere}`, params
    )

    // 退款金额
    const refundResult = await AppDataSource.query(
      `SELECT COALESCE(SUM(refund_amount), 0) as refundAmount
       FROM payment_orders WHERE status = 'refunded' ${dateWhere}`, params
    )

    // 待处理订单
    const pendingResult = await AppDataSource.query(
      `SELECT COUNT(*) as pendingCount FROM payment_orders WHERE status = 'pending'`
    )

    res.json({
      success: true,
      data: {
        totalAmount: Number(totalResult[0].totalAmount),
        totalCount: Number(totalResult[0].totalCount),
        refundAmount: Number(refundResult[0].refundAmount),
        pendingCount: Number(pendingResult[0].pendingCount)
      }
    })
  } catch (error) {
    console.error('获取支付统计失败:', error)
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 订单详情
router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const orders = await AppDataSource.query(
      'SELECT * FROM payment_orders WHERE id = ?', [id]
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
  } catch (error) {
    res.status(500).json({ success: false, message: '获取失败' })
  }
})

// 退款
router.post('/orders/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

    // TODO: 调用微信/支付宝退款API

    await AppDataSource.query(
      `UPDATE payment_orders SET status = 'refunded', refund_amount = amount,
       refund_at = ?, refund_reason = ? WHERE id = ? AND status = 'paid'`,
      [now, reason, id]
    )

    res.json({ success: true, message: '退款成功' })
  } catch (error) {
    res.status(500).json({ success: false, message: '退款失败' })
  }
})

export default router
