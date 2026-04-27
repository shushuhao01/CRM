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
import { SITE_CONFIG } from '../../config/sites'
const router = Router()

// 自动生成回调地址
const getDefaultNotifyUrl = (payType: 'wechat' | 'alipay') => {
  const apiBase = SITE_CONFIG.API_URL || `http://localhost:${process.env.PORT || 3000}`
  return `${apiBase}/api/v1/public/payment/${payType}/notify`
}

// 自动迁移：确保支付相关表结构完整
const ensurePaymentTables = async () => {
  try {
    // 1. 确保 payment_orders 表存在
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id VARCHAR(36) PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL UNIQUE,
        tenant_id VARCHAR(36),
        tenant_name VARCHAR(200),
        package_id VARCHAR(36),
        package_name VARCHAR(200),
        amount DECIMAL(10,2) NOT NULL,
        pay_type VARCHAR(20),
        status VARCHAR(20) DEFAULT 'pending',
        billing_cycle VARCHAR(20) DEFAULT 'monthly',
        bonus_months INT DEFAULT 0,
        contact_name VARCHAR(100),
        contact_phone VARCHAR(50),
        contact_email VARCHAR(100),
        trade_no VARCHAR(100),
        qr_code TEXT,
        pay_url TEXT,
        expire_time DATETIME,
        paid_at DATETIME,
        refund_amount DECIMAL(10,2),
        refund_at DATETIME,
        refund_reason TEXT,
        refunded_by VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_no (order_no),
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_status (status),
        INDEX idx_pay_type (pay_type),
        INDEX idx_billing_cycle (billing_cycle),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 2. 补齐已有旧表可能缺失的列
    const cols = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    const existingCols = cols.map((c: any) => c.COLUMN_NAME)

    const requiredCols: [string, string][] = [
      ['tenant_name', "VARCHAR(200) COMMENT '租户名称'"],
      ['package_name', "VARCHAR(200) COMMENT '套餐名称'"],
      ['pay_type', "VARCHAR(20) COMMENT '支付方式'"],
      ['status', "VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态'"],
      ['contact_name', "VARCHAR(100) COMMENT '联系人姓名'"],
      ['contact_phone', "VARCHAR(50) COMMENT '联系电话'"],
      ['contact_email', "VARCHAR(100) COMMENT '联系邮箱'"],
      ['trade_no', "VARCHAR(100) COMMENT '第三方交易号'"],
      ['qr_code', "TEXT COMMENT '支付二维码'"],
      ['pay_url', "TEXT COMMENT '支付链接'"],
      ['expire_time', "DATETIME COMMENT '订单过期时间'"],
      ['billing_cycle', "VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期'"],
      ['bonus_months', "INT DEFAULT 0 COMMENT '赠送月数'"],
      ['refund_amount', "DECIMAL(10,2) COMMENT '退款金额'"],
      ['refund_at', "DATETIME COMMENT '退款时间'"],
      ['refund_reason', "TEXT COMMENT '退款原因'"],
      ['refunded_by', "VARCHAR(100) COMMENT '退款操作人'"],
    ]
    for (const [colName, colDef] of requiredCols) {
      if (!existingCols.includes(colName)) {
        await AppDataSource.query(`ALTER TABLE payment_orders ADD COLUMN ${colName} ${colDef}`).catch(() => {})
        log.info(`[Payment] 已添加 payment_orders.${colName} 字段`)
      }
    }

    // 3. 处理旧表列名兼容（payment_method → pay_type, payment_status → status）
    if (existingCols.includes('payment_method') && !existingCols.includes('pay_type')) {
      await AppDataSource.query(`ALTER TABLE payment_orders CHANGE COLUMN payment_method pay_type VARCHAR(20) COMMENT '支付方式'`).catch(() => {})
      log.info('[Payment] 已将 payment_method 重命名为 pay_type')
    }
    if (existingCols.includes('payment_status') && !existingCols.includes('status')) {
      await AppDataSource.query(`ALTER TABLE payment_orders CHANGE COLUMN payment_status status VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态'`).catch(() => {})
      log.info('[Payment] 已将 payment_status 重命名为 status')
    }

    // 4. 确保 payment_logs 表存在
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id VARCHAR(36) PRIMARY KEY,
        order_id VARCHAR(36),
        order_no VARCHAR(50),
        action VARCHAR(50),
        pay_type VARCHAR(20),
        request_data JSON,
        response_data JSON,
        result VARCHAR(20),
        error_msg TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_order_no (order_no),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    // 5. 确保 payment_configs 表存在
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS payment_configs (
        id VARCHAR(36) PRIMARY KEY,
        pay_type VARCHAR(20) NOT NULL UNIQUE,
        enabled TINYINT(1) NOT NULL DEFAULT 0,
        config_data TEXT,
        notify_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_pay_type (pay_type),
        INDEX idx_enabled (enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    log.info('[Payment] 支付表结构检查完成')
  } catch (e: any) {
    log.error('[Payment] 表结构自动迁移失败:', e.message)
  }
}
// 延迟执行，等数据库连接就绪
setTimeout(() => ensurePaymentTables(), 3000)

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
      wechat: { enabled: false, mchId: '', appId: '', apiKey: '', notifyUrl: getDefaultNotifyUrl('wechat') },
      alipay: { enabled: false, appId: '', privateKey: '', alipayPublicKey: '', signType: 'RSA2', notifyUrl: getDefaultNotifyUrl('alipay') },
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
              notifyUrl: row.notify_url || getDefaultNotifyUrl(row.pay_type as 'wechat' | 'alipay'),
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
    const {
      enabled, appId, privateKey, alipayPublicKey, signType, notifyUrl,
      verifyType, appCertPath, alipayCertPath, alipayRootCertPath
    } = req.body
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
    configData.verifyType = verifyType || 'public'
    if (privateKey && privateKey !== '******') {
      configData.privateKey = privateKey
    }
    if (alipayPublicKey && alipayPublicKey !== '******') {
      configData.alipayPublicKey = alipayPublicKey
    }
    // 证书模式相关字段
    if (appCertPath) configData.appCertPath = appCertPath
    if (alipayCertPath) configData.alipayCertPath = alipayCertPath
    if (alipayRootCertPath) configData.alipayRootCertPath = alipayRootCertPath

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
            // 兼容处理：如果keyPem是文件路径而非PEM内容，则从磁盘读取
            let privateKey = configData.keyPem as string
            if (!privateKey.includes('-----BEGIN') && (privateKey.startsWith('/') || privateKey.includes('uploads'))) {
              try {
                const fs = await import('fs')
                const path = await import('path')
                // 上传文件存储在 <cwd>/uploads/admin/cert/，URL 为 /uploads/admin/cert/xxx.pem
                const candidates = [
                  path.default.join(process.cwd(), privateKey),
                  path.default.join(process.cwd(), 'public', privateKey),
                  path.default.resolve(privateKey)
                ]
                let found = false
                for (const filePath of candidates) {
                  if (fs.default.existsSync(filePath)) {
                    privateKey = fs.default.readFileSync(filePath, 'utf8')
                    found = true
                    break
                  }
                }
                if (!found) {
                  connectionMessage = `私钥文件不存在（已尝试路径: ${candidates[0]}），请重新上传密钥文件并保存配置`
                  throw new Error(connectionMessage)
                }
              } catch (readErr: any) {
                if (!connectionMessage) connectionMessage = `读取私钥文件失败: ${readErr.message}，请重新上传密钥文件`
                throw readErr
              }
            }
            const sign = crypto.createSign('RSA-SHA256')
            sign.update(signStr)
            const signature = sign.sign(privateKey, 'base64')

            const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${configData.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${configData.serialNo || ''}"`

            const response = await fetch('https://api.mch.weixin.qq.com/v3/certificates', {
              method: 'GET',
              headers: {
                'Authorization': authorization,
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN',
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

        // 格式化私钥（自动兼容 PKCS#1 和 PKCS#8 格式）
        const formattedKey = configData.privateKey
        let signature = ''
        if (!formattedKey.includes('-----BEGIN')) {
          // 先尝试 PKCS#8 格式，失败再尝试 PKCS#1 格式
          const formats = [
            `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`,
            `-----BEGIN RSA PRIVATE KEY-----\n${formattedKey}\n-----END RSA PRIVATE KEY-----`
          ]
          for (const fmt of formats) {
            try {
              const s = crypto.createSign(algorithm)
              s.update(signStr)
              signature = s.sign(fmt, 'base64')
              break
            } catch { /* 尝试下一种格式 */ }
          }
          if (!signature) {
            throw new Error('私钥格式无法识别，请检查是否为有效的RSA私钥')
          }
        } else {
          const sign = crypto.createSign(algorithm)
          sign.update(signStr)
          signature = sign.sign(formattedKey, 'base64')
        }

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

// 诊断支付订单表结构（调试用，确认修复后可删除）
router.get('/orders-debug', async (_req: Request, res: Response) => {
  const info: any = { timestamp: new Date().toISOString(), codeVersion: 'v2-hasCol' }
  try {
    // 1. 检查表是否存在
    const tableCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    info.tableExists = !!tableCheck[0]?.cnt
    info.database = (await AppDataSource.query('SELECT DATABASE() as db'))[0]?.db

    if (info.tableExists) {
      // 2. 获取列信息
      const cols = await AppDataSource.query('SHOW COLUMNS FROM payment_orders')
      info.columns = cols.map((c: any) => c.Field)
      info.columnCount = cols.length

      // 3. 尝试执行实际查询
      try {
        const result = await AppDataSource.query('SELECT COUNT(*) as total FROM payment_orders')
        info.totalRows = result[0]?.total
      } catch (e: any) {
        info.countError = e.message
      }

      // 4. 测试完整 SELECT
      const existingCols = new Set(info.columns as string[])
      const hasCol = (name: string) => existingCols.has(name)
      const selectCols = [
        hasCol('id') ? 'po.id' : "'' as id",
        hasCol('order_no') ? 'po.order_no' : "'' as order_no",
        hasCol('tenant_name') ? 'po.tenant_name' : "'' as tenant_name",
        hasCol('pay_type') ? 'po.pay_type' : "'' as pay_type",
        hasCol('status') ? 'po.status' : "'pending' as status",
        hasCol('amount') ? 'po.amount' : '0 as amount',
      ].join(', ')
      try {
        const testQuery = `SELECT ${selectCols} FROM payment_orders po LIMIT 1`
        info.testQuery = testQuery
        const rows = await AppDataSource.query(testQuery)
        info.testResult = rows.length > 0 ? rows[0] : 'empty'
      } catch (e: any) {
        info.testError = e.message
        info.testSql = e.sql || ''
      }
    }

    // 5. 检查 payment_logs 和 payment_configs
    try {
      await AppDataSource.query('SELECT 1 FROM payment_logs LIMIT 1')
      info.paymentLogsExists = true
    } catch (_e) {
      info.paymentLogsExists = false
    }
    try {
      await AppDataSource.query('SELECT 1 FROM payment_configs LIMIT 1')
      info.paymentConfigsExists = true
    } catch (_e) {
      info.paymentConfigsExists = false
    }

    res.json({ success: true, data: info })
  } catch (error: any) {
    info.fatalError = error.message
    info.stack = error.stack?.split('\n').slice(0, 5)
    res.json({ success: false, data: info })
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

    // 获取实际存在的列，动态构建查询（兼容旧表结构）
    const colRows = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
    )
    const existingCols = new Set(colRows.map((c: any) => c.COLUMN_NAME))

    // 自动修复旧列名
    if (existingCols.has('payment_method') && !existingCols.has('pay_type')) {
      try {
        await AppDataSource.query(`ALTER TABLE payment_orders CHANGE COLUMN payment_method pay_type VARCHAR(20) COMMENT '支付方式'`)
        existingCols.delete('payment_method')
        existingCols.add('pay_type')
        log.info('[Payment] 自动修复: payment_method → pay_type')
      } catch (_e) { /* ignore */ }
    }
    if (existingCols.has('payment_status') && !existingCols.has('status')) {
      try {
        await AppDataSource.query(`ALTER TABLE payment_orders CHANGE COLUMN payment_status status VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态'`)
        existingCols.delete('payment_status')
        existingCols.add('status')
        log.info('[Payment] 自动修复: payment_status → status')
      } catch (_e) { /* ignore */ }
    }

    // 自动添加缺失列
    const autoAddCols: [string, string][] = [
      ['tenant_name', "VARCHAR(200) COMMENT '租户名称'"],
      ['package_name', "VARCHAR(200) COMMENT '套餐名称'"],
      ['pay_type', "VARCHAR(20) COMMENT '支付方式'"],
      ['status', "VARCHAR(20) DEFAULT 'pending' COMMENT '订单状态'"],
      ['contact_name', "VARCHAR(100) COMMENT '联系人姓名'"],
      ['contact_phone', "VARCHAR(50) COMMENT '联系电话'"],
      ['trade_no', "VARCHAR(100) COMMENT '第三方交易号'"],
      ['refund_amount', "DECIMAL(10,2) COMMENT '退款金额'"],
      ['billing_cycle', "VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期'"],
    ]
    for (const [colName, colDef] of autoAddCols) {
      if (!existingCols.has(colName)) {
        try {
          await AppDataSource.query(`ALTER TABLE payment_orders ADD COLUMN ${colName} ${colDef}`)
          existingCols.add(colName)
          log.info(`[Payment] 自动添加列: ${colName}`)
        } catch (_e) { /* ignore duplicate column */ }
      }
    }

    const { page = 1, pageSize = 10, orderNo, payType, status, startDate, endDate, billingType, orderType } = req.query as any
    const offset = (page - 1) * pageSize

    // 辅助函数：只在列存在时添加 WHERE 条件
    const hasCol = (name: string) => existingCols.has(name)

    let where = '1=1'
    const params: any[] = []

    if (orderNo && hasCol('order_no')) {
      where += ' AND po.order_no LIKE ?'
      params.push(`%${orderNo}%`)
    }
    if (payType && hasCol('pay_type')) {
      where += ' AND po.pay_type = ?'
      params.push(payType)
    }
    if (status && hasCol('status')) {
      where += ' AND po.status = ?'
      params.push(status)
    }
    if (startDate && hasCol('created_at')) {
      where += ' AND po.created_at >= ?'
      params.push(startDate)
    }
    if (endDate && hasCol('created_at')) {
      where += ' AND po.created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }
    if (billingType && hasCol('billing_cycle')) {
      if (billingType === 'subscription') {
        where += " AND po.billing_cycle IN ('monthly', 'yearly')"
      } else if (billingType === 'once') {
        where += " AND (po.billing_cycle = 'once' OR po.billing_cycle IS NULL)"
      }
    }
    if (orderType && hasCol('order_no')) {
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

    // 动态构建 SELECT 列表，只查询实际存在的列
    const selectCols = [
      hasCol('id') ? 'po.id' : "'' as id",
      hasCol('order_no') ? 'po.order_no' : "'' as order_no",
      hasCol('tenant_name') ? 'po.tenant_name' : "'' as tenant_name",
      hasCol('package_name') ? 'po.package_name' : "'' as package_name",
      hasCol('amount') ? 'po.amount' : '0 as amount',
      hasCol('pay_type') ? 'po.pay_type' : "'' as pay_type",
      hasCol('status') ? 'po.status' : "'pending' as status",
      hasCol('trade_no') ? 'po.trade_no' : "'' as trade_no",
      hasCol('contact_name') ? 'po.contact_name' : "'' as contact_name",
      hasCol('contact_phone') ? 'po.contact_phone' : "'' as contact_phone",
      hasCol('created_at') ? 'po.created_at' : 'NULL as created_at',
      hasCol('paid_at') ? 'po.paid_at' : 'NULL as paid_at',
      hasCol('refund_amount') ? 'po.refund_amount' : 'NULL as refund_amount',
      hasCol('billing_cycle') ? 'po.billing_cycle' : "NULL as billing_cycle",
    ].join(', ')

    const orders = await AppDataSource.query(
      `SELECT ${selectCols} FROM payment_orders po
       WHERE ${where} ORDER BY ${hasCol('created_at') ? 'po.created_at' : 'po.id'} DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    )

    res.json({ success: true, data: { list: orders, total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error: any) {
    log.error('获取支付订单失败:', error)
    res.status(500).json({ success: false, message: '获取失败: ' + (error.message || '未知错误') })
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

/**
 * 退款后处理：按订单类型分类回退关联业务
 * - CAP：扣回扩容额度（用户数/存储）
 * - SQ/MSQ：扣回短信额度
 * - VAS/VASR/VASU：关闭/回退企微会话存档服务
 * - AI：扣回AI调用额度
 * - 系统套餐（默认）：暂停租户授权 + 私有部署授权
 */
async function handleRefundPostProcess(
  order: any,
  ctx: { tenantId: string; orderNo: string; refundAmount: number; reason: string },
  adminUser: any
): Promise<void> {
  const { tenantId, orderNo, refundAmount, reason } = ctx

  // ===== 1. 扩容订单 (CAP) =====
  if (orderNo.startsWith('CAP') && tenantId) {
    const capOrders = await AppDataSource.query(
      'SELECT type, quantity FROM capacity_orders WHERE order_no = ? AND status = ?',
      [orderNo, 'paid']
    )
    if (capOrders.length > 0) {
      const capOrder = capOrders[0]
      if (capOrder.type === 'user') {
        await AppDataSource.query(
          'UPDATE tenants SET extra_users = GREATEST(COALESCE(extra_users, 0) - ?, 0) WHERE id = ?',
          [capOrder.quantity, tenantId]
        )
        await AppDataSource.query(
          `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
           SET t.max_users = COALESCE(tp.max_users, t.max_users) + COALESCE(t.extra_users, 0)
           WHERE t.id = ?`,
          [tenantId]
        )
      } else if (capOrder.type === 'storage') {
        await AppDataSource.query(
          'UPDATE tenants SET extra_storage_gb = GREATEST(COALESCE(extra_storage_gb, 0) - ?, 0) WHERE id = ?',
          [capOrder.quantity, tenantId]
        )
        await AppDataSource.query(
          `UPDATE tenants t LEFT JOIN tenant_packages tp ON t.package_id = tp.id
           SET t.max_storage_gb = COALESCE(tp.max_storage_gb, t.max_storage_gb) + COALESCE(t.extra_storage_gb, 0)
           WHERE t.id = ?`,
          [tenantId]
        )
      }
      await AppDataSource.query(
        `UPDATE capacity_orders SET status = 'refunded' WHERE order_no = ?`, [orderNo]
      )
      log.info(`[Payment Refund] 扩容退款已扣回: tenant=${tenantId}, type=${capOrder.type}, qty=${capOrder.quantity}`)
    }
    return
  }

  // ===== 2. 短信额度订单 (SQ/MSQ) =====
  if ((orderNo.startsWith('SQ') || orderNo.startsWith('MSQ')) && tenantId) {
    try {
      // 从 sms_quota_orders 获取购买的短信条数
      const sqOrders = await AppDataSource.query(
        'SELECT id, sms_count, tenant_id FROM sms_quota_orders WHERE order_no = ? LIMIT 1',
        [orderNo]
      ).catch(() => [])

      let smsCount = 0
      if (sqOrders.length > 0) {
        smsCount = sqOrders[0].sms_count || 0
        // 更新 sms_quota_orders 状态
        await AppDataSource.query(
          `UPDATE sms_quota_orders SET status = 'refunded', refund_amount = ?, refund_sms_count = ?,
           refund_at = NOW(), refund_reason = ?, refunded_by = ? WHERE order_no = ?`,
          [refundAmount, smsCount, reason || '', adminUser?.username || 'admin', orderNo]
        )
      }

      if (smsCount > 0) {
        // 扣回短信额度
        await AppDataSource.query(
          `UPDATE system_config SET config_value = GREATEST(CAST(config_value AS SIGNED) - ?, 0), updated_at = NOW()
           WHERE config_key = 'sms_quota_total' AND tenant_id = ?`,
          [smsCount, tenantId]
        )
        log.info(`[Payment Refund] 短信额度已扣回: tenant=${tenantId}, smsCount=${smsCount}`)
      }
    } catch (smsErr: any) {
      log.error('[Payment Refund] 短信额度退款回退失败:', smsErr.message)
    }
    return
  }

  // ===== 3. 企微会话存档订单 (VAS/VASR/VASU) =====
  if (orderNo.startsWith('VAS') && tenantId) {
    try {
      if (orderNo.startsWith('VASU')) {
        // 增购订单：回退增购人数（从 remark/package_name 提取人数）
        const addUsersMatch = (order.package_name || '').match(/\+(\d+)人/)
        const totalUsersMatch = (order.package_name || '').match(/共(\d+)人/)
        if (addUsersMatch) {
          const addUsers = parseInt(addUsersMatch[1]) || 0
          if (addUsers > 0) {
            await AppDataSource.query(
              `UPDATE wecom_archive_settings SET max_users = GREATEST(COALESCE(max_users, 0) - ?, 0), updated_at = NOW()
               WHERE tenant_id = ?`,
              [addUsers, tenantId]
            )
            log.info(`[Payment Refund] 会话存档增购已回退: tenant=${tenantId}, -${addUsers}人`)
          }
        }
      } else {
        // 新购(VAS)或续费(VASR)订单：关闭会话存档服务
        await AppDataSource.query(
          `UPDATE wecom_archive_settings SET status = 'disabled', updated_at = NOW() WHERE tenant_id = ?`,
          [tenantId]
        )
        log.info(`[Payment Refund] 会话存档服务已关闭: tenant=${tenantId}`)
      }

      // 同步更新 wecom_vas_orders 状态
      await AppDataSource.query(
        `UPDATE wecom_vas_orders SET pay_status = 3 WHERE order_no = ? AND tenant_id = ?`,
        [orderNo, tenantId]
      ).catch(() => {})
    } catch (vasErr: any) {
      log.error('[Payment Refund] 企微增值服务退款回退失败:', vasErr.message)
    }
    return
  }

  // ===== 4. AI额度订单 (AI) =====
  if (orderNo.startsWith('AI') && tenantId) {
    try {
      // 从 tenant_settings 的 ai_orders 中找到对应订单的 calls 数
      const { TenantSettings } = await import('../../entities/TenantSettings')
      const settingsRepo = AppDataSource.getRepository(TenantSettings)

      const orderSetting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'ai_orders' } })
      let callsToDeduct = 0

      if (orderSetting) {
        const aiOrders: any[] = Array.isArray(orderSetting.getValue()) ? orderSetting.getValue() : []
        const aiOrder = aiOrders.find((o: any) => o.orderNo === orderNo)
        if (aiOrder) {
          callsToDeduct = aiOrder.calls || 0
          // 标记该AI订单为已退款
          aiOrder.status = 'refunded'
          aiOrder.refundedAt = new Date().toISOString()
          orderSetting.setValue(aiOrders)
          await settingsRepo.save(orderSetting)
        }
      }

      if (callsToDeduct > 0) {
        // 扣回AI额度
        const quotaSetting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'ai_quota' } })
        if (quotaSetting) {
          const currentQuota = Number(quotaSetting.getValue()) || 0
          const newQuota = Math.max(0, currentQuota - callsToDeduct)
          quotaSetting.setValue(newQuota)
          await settingsRepo.save(quotaSetting)
          log.info(`[Payment Refund] AI额度已扣回: tenant=${tenantId}, -${callsToDeduct}次, 剩余${newQuota}次`)
        }
      }
    } catch (aiErr: any) {
      log.error('[Payment Refund] AI额度退款回退失败:', aiErr.message)
    }
    return
  }

  // ===== 5. 系统套餐订单（默认）：暂停租户授权 + 私有部署授权 =====
  if (tenantId) {
    // 暂停租户状态
    await AppDataSource.query(
      `UPDATE tenants SET license_status = 'suspended', status = 'suspended', updated_at = NOW()
       WHERE id = ? AND license_status IN ('active', 'paid')`,
      [tenantId]
    )

    // 暂停 licenses 表中关联的所有有效授权（含私有部署授权）
    try {
      await AppDataSource.query(
        `UPDATE licenses SET status = 'suspended', updated_at = NOW()
         WHERE tenant_id = ? AND status IN ('active', 'pending')`,
        [tenantId]
      )
      const tenantInfo = await AppDataSource.query(
        'SELECT phone FROM tenants WHERE id = ?', [tenantId]
      )
      if (tenantInfo[0]?.phone) {
        await AppDataSource.query(
          `UPDATE licenses SET status = 'suspended', updated_at = NOW()
           WHERE customer_phone = ? AND customer_type = 'private' AND status IN ('active', 'pending')`,
          [tenantInfo[0].phone]
        )
      }
    } catch (licErr) {
      log.warn('[Payment Refund] 暂停licenses表授权失败:', licErr)
    }

    // 记录租户授权日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message)
       VALUES (?, ?, 'suspend', 'success', ?)`,
      [uuidv4(), tenantId, `退款导致授权暂停，订单号: ${orderNo}，退款金额: ¥${refundAmount}，原因: ${reason || '无'}`]
    ).catch(() => {})

    log.info(`[Payment Refund] 系统套餐退款 → 已暂停租户授权+私有部署授权: ${tenantId}`)
  }
}

// 退款
router.post('/orders/:id/refund', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { reason, refundAmount: reqRefundAmount } = req.body
    const now = formatDateTime(new Date())
    const adminUser = (req as any).adminUser

    // 1. 验证订单存在性和当前状态
    const orders = await AppDataSource.query(
      'SELECT id, order_no, status, amount, pay_type, trade_no, tenant_id, tenant_name, contact_name, contact_phone, package_name, package_id, remark FROM payment_orders WHERE id = ?',
      [id]
    )
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' })
    }
    const order = orders[0]
    if (order.status !== 'paid') {
      return res.status(400).json({ success: false, message: '只能对已支付的订单进行退款' })
    }

    // 退款金额：支持自定义金额，默认全额退款
    const refundAmount = reqRefundAmount ? Number(reqRefundAmount) : Number(order.amount)
    if (isNaN(refundAmount) || refundAmount <= 0 || refundAmount > Number(order.amount)) {
      return res.status(400).json({ success: false, message: `退款金额无效，应在 0.01 ~ ${order.amount} 之间` })
    }

    // 2. 根据支付方式调用第三方退款API
    let thirdPartyRefundResult: { success: boolean; refundId?: string; message?: string } = { success: true }
    const refundNo = `RF${order.order_no.replace('PAY', '')}${Date.now().toString(36).toUpperCase()}`

    if (order.pay_type === 'wechat') {
      // 微信支付 → 调用微信退款API，原路退回
      try {
        const { WechatPayService } = await import('../../services/WechatPayService')
        const wechatPayService = new WechatPayService()
        thirdPartyRefundResult = await wechatPayService.refund({
          orderNo: order.order_no,
          refundNo,
          totalAmount: Number(order.amount),
          refundAmount,
          reason: reason || '管理员操作退款'
        })
        if (!thirdPartyRefundResult.success) {
          return res.status(400).json({ success: false, message: thirdPartyRefundResult.message || '微信退款请求失败' })
        }
      } catch (wxErr: any) {
        log.error('[Payment Refund] 微信退款异常:', wxErr.message)
        return res.status(500).json({ success: false, message: `微信退款异常: ${wxErr.message}` })
      }
    } else if (order.pay_type === 'alipay') {
      // 支付宝 → 调用支付宝退款API，原路退回
      try {
        const { AlipayService } = await import('../../services/AlipayService')
        const alipayService = new AlipayService()
        thirdPartyRefundResult = await alipayService.refund({
          orderNo: order.order_no,
          tradeNo: order.trade_no || undefined,
          refundAmount,
          reason: reason || '管理员操作退款'
        })
        if (!thirdPartyRefundResult.success) {
          return res.status(400).json({ success: false, message: thirdPartyRefundResult.message || '支付宝退款请求失败' })
        }
      } catch (aliErr: any) {
        log.error('[Payment Refund] 支付宝退款异常:', aliErr.message)
        return res.status(500).json({ success: false, message: `支付宝退款异常: ${aliErr.message}` })
      }
    } else if (order.pay_type === 'bank') {
      // 对公转账 → 不调用第三方，标记为需财务手工退款
      thirdPartyRefundResult = { success: true, message: '对公转账订单，需财务手工退款至对方账户' }
    }

    // 3. 更新订单状态为已退款
    const updateResult = await AppDataSource.query(
      `UPDATE payment_orders SET status = 'refunded', refund_amount = ?,
       refund_at = ?, refund_reason = ?, refunded_by = ? WHERE id = ? AND status = 'paid'`,
      [refundAmount, now, reason || '', adminUser?.username || 'admin', id]
    )

    // 检查是否实际更新了记录（防止并发重复退款）
    if (updateResult.affectedRows === 0) {
      return res.status(400).json({ success: false, message: '退款失败，订单状态已变更' })
    }

    // 3. 退款后处理关联业务（按订单类型分类处理）
    const orderNo = order.order_no || ''
    const refundContext = { tenantId: order.tenant_id, orderNo, refundAmount, reason }

    try {
      await handleRefundPostProcess(order, refundContext, adminUser)
    } catch (postErr: any) {
      log.error('[Payment Refund] 退款后处理失败（不影响退款主流程）:', postErr.message)
    }

    // 4. 记录退款操作日志到 payment_logs
    try {
      await AppDataSource.query(
        `INSERT INTO payment_logs (id, order_id, order_no, action, pay_type, request_data, response_data, result, error_msg)
         VALUES (?, ?, ?, 'refund', ?, ?, ?, 'success', NULL)`,
        [
          uuidv4(), order.id, order.order_no, order.pay_type,
          JSON.stringify({ reason: reason || '', operator: adminUser?.username || 'admin' }),
          JSON.stringify({ refundAmount, refundAt: now, tenantSuspended: !!order.tenant_id })
        ]
      )
    } catch (logErr) {
      log.error('[Payment Refund] 记录操作日志失败:', logErr)
    }

    // 5. 发送退款通知
    try {
      const { adminNotificationService } = await import('../../services/AdminNotificationService')
      await adminNotificationService.notify('payment_refund', {
        title: `订单退款：¥${refundAmount}`,
        content: `订单 ${order.order_no}（${order.tenant_name || order.contact_name || '未知客户'}）已退款 ¥${refundAmount}${refundAmount < Number(order.amount) ? '（部分退款）' : ''}，退款原因：${reason || '未填写'}，操作人：${adminUser?.username || 'admin'}`,
        relatedId: order.order_no,
        relatedType: 'payment_order',
        extraData: { orderNo: order.order_no, amount: order.amount, reason, operator: adminUser?.username }
      })
    } catch (notifyErr) {
      log.error('[Payment Refund] 发送退款通知失败:', notifyErr)
    }

    // 构建退款成功消息
    let successMessage = ''
    if (order.pay_type === 'bank') {
      successMessage = '退款已登记，此订单为对公转账，需财务手工退款至对方账户'
    } else {
      successMessage = thirdPartyRefundResult.message || '退款已提交，款项将原路退回'
    }
    // 根据订单类型追加具体回退说明
    const oNo = order.order_no || ''
    if (oNo.startsWith('CAP')) {
      successMessage += '，已扣回扩容额度'
    } else if (oNo.startsWith('SQ') || oNo.startsWith('MSQ')) {
      successMessage += '，已扣回短信额度'
    } else if (oNo.startsWith('VASU')) {
      successMessage += '，已回退会话存档增购人数'
    } else if (oNo.startsWith('VAS') || oNo.startsWith('VASR')) {
      successMessage += '，已关闭会话存档服务'
    } else if (oNo.startsWith('AI')) {
      successMessage += '，已扣回AI调用额度'
    } else if (order.tenant_id) {
      successMessage += '，已暂停关联租户授权及私有部署授权'
    }

    res.json({
      success: true,
      message: successMessage
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
