/**
 * 阿里云短信服务
 */
import crypto from 'crypto'

interface SmsConfig {
  accessKeyId: string
  accessKeySecret: string
  signName: string
  templateCode?: string // 保留兼容旧版
  templates?: {
    VERIFY_CODE?: string              // 注册验证码
    ACCOUNT_ACTIVATION?: string       // 账号开通通知（免费试用）
    PAYMENT_ACTIVATION?: string       // 支付成功账号开通通知（付费套餐）
    RENEW_SUCCESS?: string            // 续费成功通知
    PACKAGE_CHANGE?: string           // 套餐变更通知
    QUOTA_CHANGE?: string             // 配额变更通知
    ACCOUNT_SUSPEND?: string          // 账号暂停通知
    ACCOUNT_RESUME?: string           // 账号激活通知
    ACCOUNT_CANCEL?: string           // 账号注销通知
    REFUND_SUCCESS?: string           // 退款成功通知
    EXPIRE_REMIND?: string            // 账号到期提醒
    EXPIRED_NOTICE?: string           // 账号过期通知
  }
}

class AliyunSmsService {
  private config: SmsConfig | null = null

  // 初始化配置
  init(config: SmsConfig) {
    this.config = config
  }

  // 从环境变量加载配置
  loadFromEnv() {
    this.config = {
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || '',
      signName: process.env.ALIYUN_SMS_SIGN_NAME || '',
      templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || ''
    }
  }

  // 从数据库加载配置
  async loadFromDatabase(): Promise<boolean> {
    try {
      const { AppDataSource } = await import('../config/database')
      const result = await AppDataSource.query(
        `SELECT config_value FROM system_config WHERE config_key = 'sms_config' LIMIT 1`
      ).catch(() => [])

      if (result && result.length > 0) {
        const data = JSON.parse(result[0].config_value || '{}')
        if (data.enabled && data.accessKeyId && data.accessKeySecret) {
          this.config = {
            accessKeyId: data.accessKeyId,
            accessKeySecret: data.accessKeySecret,
            signName: data.signName,
            templateCode: data.templateCode, // 保留兼容旧版
            templates: data.templates || {}
          }
          return true
        }
      }
      return false
    } catch (error) {
      console.error('[SMS] 从数据库加载配置失败:', error)
      return false
    }
  }

  // 发送验证码
  async sendVerificationCode(phone: string, code: string): Promise<{ success: boolean; message?: string }> {
    return this.sendSms(phone, 'VERIFY_CODE', { code })
  }

  // 发送短信通用方法
  async sendSms(phone: string, templateType: string, params: Record<string, string>): Promise<{ success: boolean; message?: string }> {
    console.log(`[SMS] 准备发送短信: ${phone}, 类型: ${templateType}, 配置状态: ${this.config?.accessKeyId ? '已配置' : '未配置'}`)

    if (!this.config?.accessKeyId) {
      console.log(`[SMS] 未配置阿里云短信，模拟发送: ${phone} -> ${JSON.stringify(params)}`)
      return { success: true, message: '开发模式，短信内容已打印到控制台' }
    }

    // 获取模板CODE
    let templateCode = this.config.templateCode // 默认使用旧版单一模板
    if (this.config.templates && this.config.templates[templateType as keyof typeof this.config.templates]) {
      templateCode = this.config.templates[templateType as keyof typeof this.config.templates]
    }

    if (!templateCode) {
      console.error(`[SMS] 未配置模板: ${templateType}`)
      return { success: false, message: `未配置${templateType}模板CODE` }
    }

    try {
      console.log(`[SMS] 使用配置: 签名=${this.config.signName}, 模板=${templateCode}`)
      const smsParams = this.buildParams(phone, templateCode, params)
      const signature = this.sign(smsParams)
      smsParams['Signature'] = signature

      const url = 'https://dysmsapi.aliyuncs.com/?' + new URLSearchParams(smsParams).toString()
      console.log(`[SMS] 发送请求...`)
      const response = await fetch(url)
      const result = await response.json() as { Code?: string; Message?: string; RequestId?: string }
      console.log(`[SMS] 阿里云返回:`, JSON.stringify(result))

      if (result.Code === 'OK') {
        console.log(`[SMS] 发送成功: ${phone}`)
        return { success: true, message: '发送成功' }
      } else {
        const errorMsg = this.getErrorMessage(result.Code, result.Message)
        console.error(`[SMS] 发送失败: ${errorMsg}`)
        return { success: false, message: errorMsg }
      }
    } catch (error) {
      console.error('[SMS] 发送异常:', error)
      return { success: false, message: '网络请求失败' }
    }
  }

  // 获取友好的错误信息
  private getErrorMessage(code?: string, message?: string): string {
    const errorMap: Record<string, string> = {
      'isv.BUSINESS_LIMIT_CONTROL': '发送频率过快，请稍后再试',
      'isv.SMS_SIGNATURE_SCENE_ILLEGAL': '签名不适用于此场景',
      'isv.SIGN_NAME_ILLEGAL': '签名不合法',
      'isv.SMS_SIGN_ILLEGAL': '签名不存在或未审核通过',
      'isv.TEMPLATE_MISSING_PARAMETERS': '模板缺少变量',
      'isv.INVALID_PARAMETERS': '参数格式错误',
      'isv.MOBILE_NUMBER_ILLEGAL': '手机号格式错误',
      'isv.AMOUNT_NOT_ENOUGH': '账户余额不足',
      'isv.SIGN_COUNT_OVER_LIMIT': '签名数量超限',
      'isv.TEMPLATE_PARAMS_ILLEGAL': '模板参数不合法',
      'SignatureDoesNotMatch': 'AccessKey签名错误，请检查Secret',
      'InvalidAccessKeyId.NotFound': 'AccessKey ID不存在',
      'isv.SIGN_OVER_LIMIT': '签名正在运营商报备中，请等待1-2个工作日'
    }
    return errorMap[code || ''] || message || '未知错误'
  }

  private buildParams(phone: string, templateCode: string, templateParams: Record<string, string>): Record<string, string> {
    const timestamp = new Date().toISOString().replace(/\.\d{3}/, '')
    return {
      AccessKeyId: this.config!.accessKeyId,
      Action: 'SendSms',
      Format: 'JSON',
      PhoneNumbers: phone,
      SignName: this.config!.signName,
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: crypto.randomUUID(),
      SignatureVersion: '1.0',
      TemplateCode: templateCode,
      TemplateParam: JSON.stringify(templateParams),
      Timestamp: timestamp,
      Version: '2017-05-25'
    }
  }

  private sign(params: Record<string, string>): string {
    const sorted = Object.keys(params).sort()
    const query = sorted.map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
    const stringToSign = `GET&${encodeURIComponent('/')}&${encodeURIComponent(query)}`
    const hmac = crypto.createHmac('sha1', this.config!.accessKeySecret + '&')
    return hmac.update(stringToSign).digest('base64')
  }
}

export const aliyunSmsService = new AliyunSmsService()
