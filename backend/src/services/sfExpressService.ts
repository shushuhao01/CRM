import axios from 'axios'
import crypto from 'crypto'

interface SFExpressConfig {
  appId: string
  checkWord: string
  apiUrl: string
}

interface QueryRouteParams {
  trackingNumber: string
  orderNumber?: string
}

class SFExpressService {
  private config: SFExpressConfig | null = null
  private mockMode: boolean = false // Mock模式开关
  private sequenceCounter: number = 0 // 序列号计数器

  // 顺丰API错误码映射表
  private readonly ERROR_CODE_MAP: Record<string, string> = {
    'A1000': '成功',
    'A1001': '参数错误',
    'A1002': '数字签名错误',
    'A1003': 'partnerID不存在',
    'A1004': 'checkWord错误',
    'A1005': '时间戳过期(超过5分钟)',
    'A1006': 'requestID重复',
    'A1007': '服务代码不存在',
    'A1008': 'IP未授权',
    'A1009': '接口调用频率超限',
    'A1010': '系统异常',
    'A2001': '运单号不存在',
    'A2002': '运单号格式错误',
    'A2003': '订单不存在',
    'A2004': '订单状态不允许此操作',
    'A3001': '寄件人信息不完整',
    'A3002': '收件人信息不完整',
    'A3003': '货物信息不完整',
    'A3004': '地址不在服务范围',
    'A4001': '余额不足',
    'A4002': '月结账号不存在',
    'A4003': '月结账号已冻结',
    'A9999': '系统繁忙,请稍后重试'
  }

  /**
   * 设置配置
   */
  setConfig(config: SFExpressConfig) {
    this.config = config
  }

  /**
   * 获取配置
   */
  getConfig(): SFExpressConfig | null {
    return this.config
  }

  /**
   * 启用Mock模式
   */
  enableMockMode() {
    this.mockMode = true
    console.log('顺丰服务: Mock模式已启用')
  }

  /**
   * 禁用Mock模式
   */
  disableMockMode() {
    this.mockMode = false
    console.log('顺丰服务: Mock模式已禁用')
  }

  /**
   * 检查是否为Mock模式
   */
  isMockMode(): boolean {
    return this.mockMode
  }

  /**
   * 生成MD5签名
   */
  private generateSign(msgData: string, checkWord: string): string {
    const str = msgData + checkWord
    return crypto.createHash('md5').update(str, 'utf8').digest('hex').toUpperCase()
  }

  /**
   * 生成请求ID
   * 格式: 客户编码 + 时间戳(13位) + 4位序列号
   * 例如: TEST123456789012340001
   */
  private generateRequestID(partnerID: string): string {
    const timestamp = Date.now() // 13位时间戳

    // 生成4位序列号 (0000-9999)
    this.sequenceCounter = (this.sequenceCounter + 1) % 10000
    const sequence = this.sequenceCounter.toString().padStart(4, '0')

    return `${partnerID}${timestamp}${sequence}`
  }

  /**
   * 获取错误信息
   */
  private getErrorMessage(code: string, defaultMsg?: string): string {
    return this.ERROR_CODE_MAP[code] || defaultMsg || `未知错误码: ${code}`
  }

  /**
   * 通用请求方法
   * 根据顺丰丰桥API文档实现
   */
  private async request(serviceCode: string, msgData: any, config?: SFExpressConfig) {
    const cfg = config || this.config

    if (!cfg) {
      throw new Error('顺丰配置未设置')
    }

    // 将msgData转为JSON字符串
    const msgDataStr = typeof msgData === 'string' ? msgData : JSON.stringify(msgData)

    // 生成签名: MD5(msgData + checkWord)
    const msgDigest = this.generateSign(msgDataStr, cfg.checkWord)

    // 构建请求参数
    const requestData = {
      partnerID: cfg.appId,
      requestID: this.generateRequestID(cfg.appId), // 客户编码 + 时间戳 + 4位序列号
      serviceCode: serviceCode,
      timestamp: Date.now(),
      msgDigest: msgDigest,
      msgData: msgDataStr
    }

    console.log('=== 顺丰API请求详情 ===')
    console.log('URL:', cfg.apiUrl)
    console.log('服务代码:', serviceCode)
    console.log('客户编码:', cfg.appId)
    console.log('请求ID:', requestData.requestID)
    console.log('时间戳:', requestData.timestamp)
    console.log('业务数据:', msgDataStr)
    console.log('签名:', msgDigest)
    console.log('签名原文:', msgDataStr + ' + ***checkWord***')
    console.log('========================')

    try {
      // 使用 application/x-www-form-urlencoded 格式
      const formData = new URLSearchParams()
      Object.entries(requestData).forEach(([key, value]) => {
        formData.append(key, String(value))
      })

      const startTime = Date.now()
      const response = await axios.post(cfg.apiUrl, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        timeout: 30000 // 30秒超时
      })
      const endTime = Date.now()

      console.log('=== 顺丰API响应详情 ===')
      console.log('响应时间:', `${endTime - startTime}ms`)
      console.log('响应状态:', response.status)
      console.log('响应数据:', JSON.stringify(response.data, null, 2))
      console.log('========================')

      return response.data
    } catch (error: any) {
      console.error('=== 顺丰API调用失败 ===')
      console.error('错误类型:', error.code || 'UNKNOWN')
      console.error('错误信息:', error.message)

      if (error.response) {
        console.error('HTTP状态:', error.response.status)
        console.error('响应头:', error.response.headers)
        console.error('响应数据:', error.response.data)
      } else if (error.request) {
        console.error('请求已发送但无响应')
        console.error('请求详情:', error.request)
      } else {
        console.error('请求配置错误:', error.config)
      }
      console.error('========================')

      throw error
    }
  }

  /**
   * 测试连接
   * 使用路由查询接口测试连接和签名是否正确
   */
  async testConnection(config: SFExpressConfig): Promise<{ success: boolean; message: string; data?: any }> {
    // Mock模式: 直接返回成功
    if (this.mockMode) {
      console.log('Mock模式: 测试连接')
      return {
        success: true,
        message: '连接成功 (Mock模式)',
        data: {
          mode: 'mock',
          apiResultCode: 'A1000',
          apiErrorMsg: '',
          apiResultData: {}
        }
      }
    }

    try {
      // 使用路由查询接口测试
      // 即使单号不存在,只要签名正确,也会返回正常的错误响应
      const msgData = {
        trackingType: '1', // 1:根据顺丰运单号查询
        trackingNumber: ['SF1234567890'], // 测试单号
        methodType: '1' // 1:标准查询
      }

      const result = await this.request('EXP_RECE_SEARCH_ROUTES', msgData, config)

      console.log('测试连接结果:', result)

      // 检查响应格式
      if (result && typeof result === 'object') {
        // 顺丰API返回格式: { apiResultCode, apiErrorMsg, apiResultData }
        const { apiResultCode, apiErrorMsg } = result

        if (apiResultCode) {
          const errorMsg = this.getErrorMessage(apiResultCode, apiErrorMsg)

          // A1000 或 A2001(单号不存在) 都说明连接和签名正确
          if (apiResultCode === 'A1000' || apiResultCode === 'A2001') {
            return {
              success: true,
              message: `✓ 连接成功! ${errorMsg}`,
              data: result
            }
          }

          // 签名或配置错误
          if (['A1002', 'A1003', 'A1004'].includes(apiResultCode)) {
            return {
              success: false,
              message: `✗ 配置错误: [${apiResultCode}] ${errorMsg}`,
              data: result
            }
          }

          // 其他错误码,但能收到响应说明连接正常
          return {
            success: true,
            message: `✓ 连接成功 (${apiResultCode}: ${errorMsg})`,
            data: result
          }
        }

        // 有响应但格式不对
        return {
          success: true,
          message: '✓ 连接成功,收到响应',
          data: result
        }
      }

      // 收到响应但格式异常
      return {
        success: true,
        message: '✓ 连接成功',
        data: result
      }

    } catch (error: unknown) {
      console.error('测试连接错误:', error)

      // 超时错误
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        return {
          success: false,
          message: '✗ 连接超时,请检查网络或API地址是否正确'
        }
      }

      // 网络错误
      if (error?.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: '✗ 无法连接到顺丰API,请检查API地址和网络连接'
        }
      }

      // DNS解析失败
      if (error?.code === 'ENOTFOUND') {
        return {
          success: false,
          message: '✗ API地址无效,无法解析域名'
        }
      }

      // 有HTTP响应
      if (error?.response) {
        const status = error.response.status
        const data = error.response.data

        console.log('HTTP响应:', { status, data })

        // 404错误 - 路径不正确
        if (status === 404) {
          return {
            success: false,
            message: '✗ API路径错误(404),请确认使用完整路径: /std/service'
          }
        }

        // 403错误 - IP未授权
        if (status === 403) {
          return {
            success: false,
            message: '✗ IP未授权或访问被拒绝(403),请在丰桥平台配置IP白名单'
          }
        }

        // 500错误 - 服务器错误
        if (status === 500) {
          return {
            success: false,
            message: '✗ 顺丰服务器内部错误(500),请稍后重试'
          }
        }

        // 200响应但有错误
        if (status === 200) {
          // 检查是否是顺丰的业务错误
          if (data && data.apiResultCode) {
            const errorMsg = this.getErrorMessage(data.apiResultCode, data.apiErrorMsg)
            return {
              success: data.apiResultCode === 'A1000' || data.apiResultCode === 'A2001',
              message: `[${data.apiResultCode}] ${errorMsg}`,
              data: data
            }
          }

          return {
            success: true,
            message: '✓ 连接成功',
            data: data
          }
        }

        // 其他HTTP错误
        return {
          success: false,
          message: `✗ HTTP错误 ${status}: ${data?.message || error.message}`
        }
      }

      // 其他错误
      const errorMessage = error instanceof Error ? error.message : '连接失败'
      return {
        success: false,
        message: `✗ ${errorMessage}`
      }
    }
  }

  /**
   * 查询物流轨迹
   * 服务代码: EXP_RECE_SEARCH_ROUTES
   */
  async queryRoute(params: QueryRouteParams) {
    if (!this.config) {
      throw new Error('顺丰配置未设置,请先配置')
    }

    // Mock模式: 返回模拟数据
    if (this.mockMode) {
      console.log('Mock模式: 查询物流轨迹', params.trackingNumber)
      return {
        success: true,
        data: {
          routeResps: [
            {
              mailNo: params.trackingNumber,
              routes: [
                {
                  acceptTime: '2024-01-15 10:00:00',
                  acceptAddress: '深圳市',
                  remark: '【深圳市】 已收件',
                  opCode: '50'
                },
                {
                  acceptTime: '2024-01-15 12:30:00',
                  acceptAddress: '深圳转运中心',
                  remark: '快件在【深圳转运中心】已装车,准备发往下一站',
                  opCode: '505'
                },
                {
                  acceptTime: '2024-01-16 08:00:00',
                  acceptAddress: '广州转运中心',
                  remark: '快件到达【广州转运中心】',
                  opCode: '505'
                },
                {
                  acceptTime: '2024-01-16 14:00:00',
                  acceptAddress: '广州市',
                  remark: '快件已到达【广州市】派送中',
                  opCode: '204'
                },
                {
                  acceptTime: '2024-01-16 16:30:00',
                  acceptAddress: '广州市',
                  remark: '已签收,签收人: 本人',
                  opCode: '80'
                }
              ]
            }
          ]
        },
        message: '查询成功 (Mock模式)'
      }
    }

    const msgData = {
      trackingType: '1', // 1:根据顺丰运单号查询
      trackingNumber: [params.trackingNumber],
      methodType: '1' // 1:标准查询
    }

    // 如果有客户订单号,添加到请求中
    if (params.orderNumber) {
      Object.assign(msgData, { referenceNumber: params.orderNumber })
    }

    const result = await this.request('EXP_RECE_SEARCH_ROUTES', msgData)

    // 解析响应
    const errorMsg = this.getErrorMessage(result.apiResultCode, result.apiErrorMsg)

    if (result.apiResultCode === 'A1000') {
      return {
        success: true,
        data: result.apiResultData,
        message: '查询成功'
      }
    } else {
      return {
        success: false,
        message: `[${result.apiResultCode}] ${errorMsg}`,
        code: result.apiResultCode
      }
    }
  }

  /**
   * 订单筛选
   */
  async filterOrders(params: unknown) {
    if (!this.config) {
      throw new Error('顺丰配置未设置,请先配置')
    }

    const msgData = JSON.stringify(params)
    return await this.request('EXP_RECE_SEARCH_ORDER_BSP', msgData)
  }

  /**
   * 创建订单
   */
  async createOrder(orderData: unknown) {
    if (!this.config) {
      throw new Error('顺丰配置未设置,请先配置')
    }

    const msgData = JSON.stringify(orderData)
    return await this.request('EXP_RECE_CREATE_ORDER', msgData)
  }
}

export default new SFExpressService()
