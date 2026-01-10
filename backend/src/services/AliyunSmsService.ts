/**
 * 阿里云短信服务
 */
import crypto from 'crypto'

interface SmsConfig {
  accessKeyId: string
  accessKeySecret: string
  signName: string
  templateCode: string
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
            templateCode: data.templateCode
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
    console.log(`[SMS] 准备发送验证码: ${phone}, 配置状态: ${this.config?.accessKeyId ? '已配置' : '未配置'}`)

    if (!this.config?.accessKeyId) {
      console.log(`[SMS] 未配置阿里云短信，验证码: ${phone} -> ${code}`)
      return { success: true, message: '开发模式，验证码已打印到控制台' }
    }

    try {
      console.log(`[SMS] 使用配置: 签名=${this.config.signName}, 模板=${this.config.templateCode}`)
      const params = this.buildParams(phone, code)
      const signature = this.sign(params)
      params['Signature'] = signature

      const url = 'https://dysmsapi.aliyuncs.com/?' + new URLSearchParams(params).toString()
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

  private buildParams(phone: string, code: string): Record<string, string> {
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
      TemplateCode: this.config!.templateCode,
      TemplateParam: JSON.stringify({ code }),
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
