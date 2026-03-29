/**
 * 支付服务 - 微信支付 & 支付宝 & 对公转账
 */
import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { AppDataSource } from '../config/database'
import { adminNotificationService } from './AdminNotificationService'

// 解密密钥（与admin/payment.ts保持一致）
const ENCRYPT_KEY = process.env.PAYMENT_ENCRYPT_KEY || 'crm-payment-secret-key-2024'

const decryptConfig = (encrypted: string): string => {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc',
      crypto.scryptSync(ENCRYPT_KEY, 'salt', 32),
      Buffer.alloc(16, 0))
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8')
  } catch {
    return ''
  }
}

interface WechatConfig {
  mchId: string        // 商户号
  appId: string        // 公众号/小程序AppID
  apiKey: string       // API密钥(V2)
  apiKeyV3?: string    // API密钥(V3)
  serialNo?: string    // 证书序列号
  privateKey?: string  // 私钥
}

interface AlipayConfig {
  appId: string           // 应用ID
  privateKey: string      // 应用私钥
  alipayPublicKey: string // 支付宝公钥
  signType: 'RSA2' | 'RSA'
}

interface PaymentConfig {
  wechat?: WechatConfig
  alipay?: AlipayConfig
}

interface CreateOrderParams {
  packageId: string
  packageName: string
  amount: number
  payType: 'wechat' | 'alipay' | 'bank'
  tenantId?: string
  tenantName?: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  billingCycle?: 'monthly' | 'yearly' | 'once'
  bonusMonths?: number
}

class PaymentService {
  private config: PaymentConfig = {}

  // 从数据库加载配置
  async loadConfig(): Promise<void> {
    try {
      const rows = await AppDataSource.query(
        'SELECT pay_type, config_data, enabled FROM payment_configs WHERE enabled = 1'
      )
      for (const row of rows) {
        if (row.config_data) {
          // 先尝试解密（admin后台保存时加密了），解密失败再尝试直接解析
          let jsonStr = decryptConfig(row.config_data)
          if (!jsonStr) {
            jsonStr = row.config_data // 可能是未加密的旧数据
          }
          try {
            const data = JSON.parse(jsonStr)
            if (row.pay_type === 'wechat') {
              this.config.wechat = data
            } else if (row.pay_type === 'alipay') {
              this.config.alipay = data
            }
          } catch {
            console.warn(`[Payment] 解析${row.pay_type}配置失败`)
          }
        }
      }
    } catch (error) {
      console.error('[Payment] 加载配置失败:', error)
    }
  }

  // 生成订单号
  generateOrderNo(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '')
    const random = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `PAY${dateStr}${timeStr}${random}`
  }

  // 确保 payment_orders 表有 billing_cycle 和 bonus_months 字段
  private async ensurePaymentOrderColumns(): Promise<void> {
    try {
      const cols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_orders'`
      )
      const existingCols = cols.map((c: any) => c.COLUMN_NAME)
      if (!existingCols.includes('billing_cycle')) {
        await AppDataSource.query(
          `ALTER TABLE payment_orders ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly' COMMENT '计费周期: monthly/yearly/once'`
        )
      }
      if (!existingCols.includes('bonus_months')) {
        await AppDataSource.query(
          `ALTER TABLE payment_orders ADD COLUMN bonus_months INT DEFAULT 0 COMMENT '赠送月数'`
        )
      }
    } catch (e) {
      // 忽略错误（如非MySQL、表不存在等）
    }
  }

  // 创建支付订单
  async createOrder(params: CreateOrderParams): Promise<{
    success: boolean
    orderId?: string
    orderNo?: string
    qrCode?: string
    payUrl?: string
    message?: string
  }> {
    await this.loadConfig()
    await this.ensurePaymentOrderColumns()

    const orderId = uuidv4()
    const orderNo = this.generateOrderNo()
    const expireTime = new Date(Date.now() + 30 * 60 * 1000) // 30分钟过期

    try {
      // 创建订单记录
      await AppDataSource.query(
        `INSERT INTO payment_orders
         (id, order_no, tenant_id, tenant_name, package_id, package_name, amount, pay_type,
          contact_name, contact_phone, contact_email, billing_cycle, bonus_months, expire_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [orderId, orderNo, params.tenantId, params.tenantName, params.packageId,
         params.packageName, params.amount, params.payType, params.contactName,
         params.contactPhone, params.contactEmail,
         params.billingCycle || 'monthly', params.bonusMonths || 0,
         expireTime]
      )

      let qrCode = ''
      let payUrl = ''

      if (params.payType === 'wechat') {
        const result = await this.createWechatOrder(orderNo, params.amount, params.packageName)
        qrCode = result.qrCode || ''
        payUrl = result.payUrl || ''
      } else if (params.payType === 'alipay') {
        const result = await this.createAlipayOrder(orderNo, params.amount, params.packageName)
        payUrl = result.payUrl || ''
        qrCode = result.qrCode || ''
      }
      // bank（对公转账）不需要生成二维码和支付链接，由管理员手动确认到账

      // 更新订单的二维码
      await AppDataSource.query(
        'UPDATE payment_orders SET qr_code = ?, pay_url = ? WHERE id = ?',
        [qrCode, payUrl, orderId]
      )

      // 记录日志
      await this._logPayment(orderId, orderNo, 'create', params.payType, params, { qrCode: '...' }, 'success')

      return { success: true, orderId, orderNo, qrCode, payUrl }
    } catch (error: any) {
      console.error('[Payment] 创建订单失败:', error)
      await this._logPayment(orderId, orderNo, 'create', params.payType, params, null, 'fail', error.message)
      return { success: false, message: error.message || '创建订单失败' }
    }
  }

  // 创建微信支付订单 (Native支付)
  private async createWechatOrder(orderNo: string, amount: number, description: string): Promise<{
    qrCode?: string
    payUrl?: string
  }> {
    if (!this.config.wechat) {
      // 开发模式：返回模拟二维码
      console.log('[Payment] 微信支付未配置，使用模拟模式')
      return {
        qrCode: this.generateMockQRCode(`weixin://wxpay/bizpayurl?pr=${orderNo}`),
        payUrl: `weixin://wxpay/bizpayurl?pr=${orderNo}`
      }
    }

    const { mchId, appId, apiKey } = this.config.wechat
    const nonceStr = crypto.randomBytes(16).toString('hex')
    const notifyUrl = process.env.PAYMENT_NOTIFY_URL || 'https://api.example.com/api/v1/public/payment/wechat/notify'

    // 构建请求参数
    const params: Record<string, string> = {
      appid: appId,
      mch_id: mchId,
      nonce_str: nonceStr,
      body: description,
      out_trade_no: orderNo,
      total_fee: String(Math.round(amount * 100)), // 转为分
      spbill_create_ip: '127.0.0.1',
      notify_url: notifyUrl,
      trade_type: 'NATIVE'
    }

    // 签名
    params.sign = this.signWechat(params, apiKey)

    // 转XML
    const xml = this.toXml(params)

    // 调用微信API
    const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml' },
      body: xml
    })
    const resultXml = await response.text()
    const result = this.parseXml(resultXml)

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return {
        qrCode: this.generateQRCodeDataUrl(result.code_url),
        payUrl: result.code_url
      }
    } else {
      throw new Error(result.err_code_des || result.return_msg || '微信支付创建失败')
    }
  }

  // 创建支付宝订单
  private async createAlipayOrder(orderNo: string, amount: number, subject: string): Promise<{
    qrCode?: string
    payUrl?: string
  }> {
    if (!this.config.alipay) {
      // 开发模式：返回模拟二维码
      console.log('[Payment] 支付宝未配置，使用模拟模式')
      return {
        qrCode: this.generateMockQRCode(`https://qr.alipay.com/${orderNo}`),
        payUrl: `https://qr.alipay.com/${orderNo}`
      }
    }

    const { appId, privateKey, signType } = this.config.alipay
    const notifyUrl = process.env.PAYMENT_NOTIFY_URL_ALIPAY || 'https://api.example.com/api/v1/public/payment/alipay/notify'
    const returnUrl = process.env.PAYMENT_RETURN_URL || 'https://www.example.com/pay-success'

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ')

    const bizContent = JSON.stringify({
      out_trade_no: orderNo,
      total_amount: amount.toFixed(2),
      subject: subject,
      product_code: 'FAST_INSTANT_TRADE_PAY'
    })

    const params: Record<string, string> = {
      app_id: appId,
      method: 'alipay.trade.page.pay',
      format: 'JSON',
      return_url: returnUrl,
      charset: 'utf-8',
      sign_type: signType,
      timestamp: timestamp,
      version: '1.0',
      notify_url: notifyUrl,
      biz_content: bizContent
    }

    // 签名
    params.sign = this.signAlipay(params, privateKey, signType)

    // 构建支付URL
    const payUrl = 'https://openapi.alipay.com/gateway.do?' +
      Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')

    return {
      payUrl,
      qrCode: this.generateQRCodeDataUrl(payUrl)
    }
  }


  // 微信签名
  private signWechat(params: Record<string, string>, apiKey: string): string {
    const sorted = Object.keys(params).sort()
    const str = sorted.map(k => `${k}=${params[k]}`).join('&') + `&key=${apiKey}`
    return crypto.createHash('md5').update(str).digest('hex').toUpperCase()
  }

  // 支付宝签名
  private signAlipay(params: Record<string, string>, privateKey: string, signType: string): string {
    const sorted = Object.keys(params).filter(k => k !== 'sign').sort()
    const str = sorted.map(k => `${k}=${params[k]}`).join('&')

    const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1'
    const sign = crypto.createSign(algorithm)
    sign.update(str)
    return sign.sign(privateKey, 'base64')
  }

  // 验证微信回调签名
  verifyWechatSign(params: Record<string, string>, apiKey: string): boolean {
    const sign = params.sign
    delete params.sign
    const expectedSign = this.signWechat(params, apiKey)
    return sign === expectedSign
  }

  // 验证支付宝回调签名
  verifyAlipaySign(params: Record<string, string>, publicKey: string, signType: string): boolean {
    const sign = params.sign
    const sorted = Object.keys(params).filter(k => k !== 'sign' && k !== 'sign_type').sort()
    const str = sorted.map(k => `${k}=${params[k]}`).join('&')

    const algorithm = signType === 'RSA2' ? 'RSA-SHA256' : 'RSA-SHA1'
    const verify = crypto.createVerify(algorithm)
    verify.update(str)
    return verify.verify(publicKey, sign, 'base64')
  }

  // 处理微信支付回调
  async handleWechatNotify(xmlData: string): Promise<{ success: boolean; message?: string }> {
    await this.loadConfig()
    const data = this.parseXml(xmlData)

    if (data.return_code !== 'SUCCESS') {
      return { success: false, message: data.return_msg }
    }

    const orderNo = data.out_trade_no
    const tradeNo = data.transaction_id

    // 验证签名
    if (this.config.wechat) {
      if (!this.verifyWechatSign(data, this.config.wechat.apiKey)) {
        return { success: false, message: '签名验证失败' }
      }
    }

    // 更新订单状态
    await this.updateOrderStatus(orderNo, 'paid', tradeNo)

    return { success: true }
  }

  // 处理支付宝回调
  async handleAlipayNotify(params: Record<string, string>): Promise<{ success: boolean; message?: string }> {
    await this.loadConfig()

    const tradeStatus = params.trade_status
    const orderNo = params.out_trade_no
    const tradeNo = params.trade_no

    // 验证签名
    if (this.config.alipay) {
      if (!this.verifyAlipaySign(params, this.config.alipay.alipayPublicKey, this.config.alipay.signType)) {
        return { success: false, message: '签名验证失败' }
      }
    }

    if (tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED') {
      await this.updateOrderStatus(orderNo, 'paid', tradeNo)
    }

    return { success: true }
  }

  // 更新订单状态（支持 tradeNo 字符串 或 {tradeNo, paidAt} 对象两种调用方式）
  async updateOrderStatus(orderNo: string, status: string, tradeNoOrParams?: string | { tradeNo?: string; paidAt?: Date }): Promise<string | null> {
    const tradeNo = typeof tradeNoOrParams === 'string' ? tradeNoOrParams : tradeNoOrParams?.tradeNo
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
    let licenseKey: string | null = null

    if (status === 'paid') {
      await AppDataSource.query(
        'UPDATE payment_orders SET status = ?, trade_no = ?, paid_at = ? WHERE order_no = ? AND status = ?',
        [status, tradeNo, now, orderNo, 'pending']
      )

      // 获取订单信息，激活租户并生成授权码
      const orders = await AppDataSource.query(
        'SELECT tenant_id, package_id FROM payment_orders WHERE order_no = ?', [orderNo]
      )
      if (orders.length > 0 && orders[0].tenant_id) {
        licenseKey = await this.activateTenant(orders[0].tenant_id, orders[0].package_id)
      }
    } else {
      await AppDataSource.query(
        'UPDATE payment_orders SET status = ? WHERE order_no = ?', [status, orderNo]
      )
    }

    // 记录日志
    const orders = await AppDataSource.query('SELECT id FROM payment_orders WHERE order_no = ?', [orderNo])
    if (orders.length > 0) {
      await this._logPayment(orders[0].id, orderNo, 'notify', null, { tradeNo }, { status, licenseKey }, 'success')
    }

    // 支付成功 → 通知管理员
    if (status === 'paid') {
      const orderInfo = await AppDataSource.query(
        'SELECT po.amount, po.pay_type, po.contact_name, po.contact_phone, t.name as tenant_name FROM payment_orders po LEFT JOIN tenants t ON po.tenant_id = t.id WHERE po.order_no = ?',
        [orderNo]
      )
      const info = orderInfo[0] || {}
      adminNotificationService.notify('payment_success', {
        title: `支付成功：¥${info.amount || '?'}`,
        content: `租户「${info.tenant_name || info.contact_name || '未知'}」的订单 ${orderNo} 已支付成功，金额 ¥${info.amount || '?'}（${info.pay_type === 'wechat' ? '微信' : info.pay_type === 'alipay' ? '支付宝' : '对公转账'}）`,
        relatedId: orderNo,
        relatedType: 'payment_order',
        extraData: { orderNo, amount: info.amount, payType: info.pay_type, licenseKey }
      }).catch(err => console.error('[Payment] 发送支付成功通知失败:', err.message))
    }

    return licenseKey
  }

  // 激活租户（支付成功后调用）
  private async activateTenant(tenantId: string, packageId: string): Promise<string | null> {
    try {
      // 获取租户信息
      const tenants = await AppDataSource.query(
        'SELECT code, name, phone, contact FROM tenants WHERE id = ?', [tenantId]
      )

      if (tenants.length === 0) {
        console.error('[Payment] 租户不存在:', tenantId)
        return null
      }

      const tenant = tenants[0]

      // 获取套餐信息
      const packages = await AppDataSource.query(
        'SELECT name, duration_days, max_users FROM tenant_packages WHERE id = ?', [packageId]
      )

      if (packages.length > 0) {
        const pkg = packages[0]
        const expireDate = new Date()
        expireDate.setDate(expireDate.getDate() + pkg.duration_days)
        const expireDateStr = expireDate.toISOString().slice(0, 10)

        // 生成授权码
        const licenseKey = this.generateLicenseKey()

        // 更新租户状态
        await AppDataSource.query(
          `UPDATE tenants SET
            license_key = ?,
            license_status = 'active',
            status = 'active',
            expire_date = ?,
            max_users = ?,
            updated_at = NOW()
          WHERE id = ?`,
          [licenseKey, expireDateStr, pkg.max_users, tenantId]
        )

        // 创建默认管理员账号
        const { createDefaultAdmin } = await import('../utils/adminAccountHelper')
        const adminAccount = await createDefaultAdmin({
          tenantId: tenantId,
          phone: tenant.phone,
          realName: tenant.contact || '系统管理员',
          email: undefined
        })

        console.log(`✓ 已为租户 ${tenant.code} 创建默认管理员账号: ${adminAccount.username}`)

        // 记录授权日志
        const { v4: uuidv4 } = await import('uuid')
        await AppDataSource.query(
          `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
           VALUES (?, ?, ?, 'activate', 'success', '支付成功激活')`,
          [uuidv4(), tenantId, licenseKey]
        )

        // 发送支付成功账号开通通知（包含完整账号信息）
        await this.sendActivationNotification(tenantId, licenseKey, {
          tenantCode: tenant.code,
          tenantName: tenant.name,
          adminPassword: adminAccount.password,
          packageName: pkg.name,
          expireDate: expireDateStr
        })

        console.log(`[Payment] 租户激活成功: ${tenantId}, 授权码: ${licenseKey}`)
        return licenseKey
      }
      return null
    } catch (error) {
      console.error('[Payment] 激活租户失败:', error)
      return null
    }
  }

  // 发送激活通知（短信+邮件）
  private async sendActivationNotification(
    tenantId: string,
    licenseKey: string,
    accountInfo?: {
      tenantCode: string
      tenantName: string
      adminPassword: string
      packageName: string
      expireDate: string
    }
  ): Promise<void> {
    try {
      // 获取租户联系信息
      const tenants = await AppDataSource.query(
        'SELECT name, phone, email, code FROM tenants WHERE id = ?', [tenantId]
      )

      if (tenants.length === 0) return

      const tenant = tenants[0]

      // 发送短信
      if (tenant.phone && accountInfo) {
        try {
          const { aliyunSmsService } = await import('./AliyunSmsService')
          await aliyunSmsService.loadFromDatabase()

          // 获取订单信息（用于短信）
          const orders = await AppDataSource.query(
            'SELECT order_no, amount FROM payment_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1',
            [tenantId]
          )

          const orderInfo = orders.length > 0 ? orders[0] : null

          // 使用支付成功账号开通通知模板
          await aliyunSmsService.sendSms(tenant.phone, 'PAYMENT_ACTIVATION', {
            tenantName: accountInfo.tenantName,
            orderNo: orderInfo?.order_no || 'N/A',
            amount: orderInfo?.amount?.toString() || '0',
            tenantCode: accountInfo.tenantCode,
            licenseKey: licenseKey,
            adminPassword: accountInfo.adminPassword,
            packageName: accountInfo.packageName,
            expireDate: accountInfo.expireDate
          })

          console.log(`[Payment] 支付成功账号开通通知已发送至: ${tenant.phone}`)
        } catch (smsError) {
          console.error('[Payment] 发送短信失败:', smsError)
        }
      }

      // TODO: 发送邮件通知
      // if (tenant.email) {
      //   await emailService.sendLicenseNotification(tenant.email, licenseKey, tenant.name)
      // }
    } catch (error) {
      console.error('[Payment] 发送激活通知失败:', error)
    }
  }

  // 生成授权码
  private generateLicenseKey(): string {
    const segments = []
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(2).toString('hex').toUpperCase())
    }
    return `TENANT-${segments.join('-')}`
  }

  // 查询订单状态
  async queryOrder(orderNo: string): Promise<any> {
    const orders = await AppDataSource.query(
      'SELECT * FROM payment_orders WHERE order_no = ?', [orderNo]
    )
    return orders.length > 0 ? orders[0] : null
  }

  // 关闭订单
  async closeOrder(orderNo: string): Promise<boolean> {
    await AppDataSource.query(
      `UPDATE payment_orders SET status = 'closed' WHERE order_no = ? AND status = 'pending'`,
      [orderNo]
    )
    return true
  }

  // 记录支付日志（公开包装方法，供AlipayService/WechatPayService调用）
  async logPayment(params: {
    orderId: string; orderNo: string; action: string; payType?: string | null;
    requestData?: any; responseData?: any; result: string; errorMsg?: string
  }): Promise<void> {
    await this._logPayment(params.orderId, params.orderNo, params.action, params.payType ?? null,
      params.requestData, params.responseData ?? null, params.result, params.errorMsg);
  }

  // 记录支付日志（内部实现）
  private async _logPayment(
    orderId: string, orderNo: string, action: string, payType: string | null,
    requestData: any, responseData: any, result: string, errorMsg?: string
  ): Promise<void> {
    try {
      await AppDataSource.query(
        `INSERT INTO payment_logs (id, order_id, order_no, action, pay_type, request_data, response_data, result, error_msg)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), orderId, orderNo, action, payType,
         JSON.stringify(requestData), JSON.stringify(responseData), result, errorMsg]
      )
    } catch (e) {
      console.error('[Payment] 记录日志失败:', e)
    }
  }

  // XML转对象
  private parseXml(xml: string): Record<string, string> {
    const result: Record<string, string> = {}
    const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g
    let match
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2]
    }
    return result
  }

  // 对象转XML
  private toXml(obj: Record<string, string>): string {
    let xml = '<xml>'
    for (const [key, value] of Object.entries(obj)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`
    }
    xml += '</xml>'
    return xml
  }

  // 生成二维码DataURL (简化版，实际应使用qrcode库)
  private generateQRCodeDataUrl(content: string): string {
    // 这里返回一个占位符，实际需要使用qrcode库生成
    // 前端可以使用 qrcode.vue 或类似库来渲染
    return `data:text/plain;base64,${Buffer.from(content).toString('base64')}`
  }

  // 生成模拟二维码
  private generateMockQRCode(content: string): string {
    return `MOCK_QR:${content}`
  }
}

export const paymentService = new PaymentService()
