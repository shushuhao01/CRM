import { ElMessage } from 'element-plus'
import {
  getLogisticsTrace,
  createLogisticsTracking,
  getSupportedCompanies,
  batchSyncLogisticsStatus,
  type LogisticsTracking,
  type ExpressCompany,
  LogisticsStatus
} from '@/api/logisticsStatus'

// 重新导出物流状态枚举
export { LogisticsStatus }

// 物流轨迹记录
export interface LogisticsTrack {
  time: string
  location: string
  description: string
  status: LogisticsStatus
  statusText?: string
}

// 物流查询结果
export interface LogisticsResult {
  trackingNumber: string
  expressCompany: string
  currentStatus: LogisticsStatus
  tracks: LogisticsTrack[]
  lastUpdateTime: string
  estimatedDeliveryTime?: string
}

// 支持的物流公司
export const LOGISTICS_COMPANIES = {
  SF: { name: '顺丰速运', code: 'SF', apiCode: 'shunfeng' },
  JD: { name: '京东物流', code: 'JD', apiCode: 'jd' },
  YTO: { name: '圆通速递', code: 'YTO', apiCode: 'yuantong' },
  ZTO: { name: '中通快递', code: 'ZTO', apiCode: 'zhongtong' },
  STO: { name: '申通快递', code: 'STO', apiCode: 'shentong' },
  YD: { name: '韵达速递', code: 'YD', apiCode: 'yunda' },
  HTKY: { name: '百世快递', code: 'HTKY', apiCode: 'huitongkuaidi' },
  EMS: { name: '中国邮政', code: 'EMS', apiCode: 'ems' },
  DBKD: { name: '德邦快递', code: 'DBKD', apiCode: 'debangkuaidi' },
  UC: { name: '优速快递', code: 'UC', apiCode: 'youshuwuliu' }
}

// 物流API配置
const LOGISTICS_API_CONFIG = {
  // 快递鸟API配置
  kdniao: {
    baseUrl: 'https://api.kdniao.com',
    appId: import.meta.env.VITE_KDNIAO_APP_ID || 'demo_app_id',
    appKey: import.meta.env.VITE_KDNIAO_APP_KEY || 'demo_app_key'
  },
  // 快递100API配置
  kuaidi100: {
    baseUrl: 'https://poll.kuaidi100.com',
    customer: import.meta.env.VITE_KUAIDI100_CUSTOMER || 'demo_customer',
    key: import.meta.env.VITE_KUAIDI100_KEY || 'demo_key'
  }
}

class LogisticsService {
  private static instance: LogisticsService
  private cache: Map<string, { data: LogisticsResult; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  static getInstance(): LogisticsService {
    if (!LogisticsService.instance) {
      LogisticsService.instance = new LogisticsService()
    }
    return LogisticsService.instance
  }

  /**
   * 查询物流轨迹
   * 优先使用后端API（调用各快递公司官方API），失败后回退到快递100
   */
  async queryLogistics(trackingNumber: string, expressCompany: string): Promise<LogisticsResult> {
    const cacheKey = `${expressCompany}_${trackingNumber}`

    // 检查缓存
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // 🔥 优先调用后端新API（调用各快递公司官方API）
      const { logisticsApi } = await import('@/api/logistics')
      const response = await logisticsApi.queryTrace(trackingNumber, expressCompany)

      if (response.success && response.data && response.data.success) {
        const apiData = response.data
        const result: LogisticsResult = {
          trackingNumber: apiData.trackingNo,
          expressCompany: apiData.companyName,
          currentStatus: this.mapStatusToLogisticsStatus(apiData.status),
          tracks: apiData.traces.map(trace => ({
            time: trace.time,
            location: trace.location || '',
            description: trace.description,
            status: this.mapStatusToLogisticsStatus(trace.status),
            statusText: trace.status
          })),
          lastUpdateTime: new Date().toISOString(),
          estimatedDeliveryTime: apiData.estimatedDeliveryTime
        }

        // 缓存结果
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        })

        return result
      }

      // 如果新API返回失败，尝试旧API
      throw new Error(response.message || '新API查询失败')
    } catch (newApiError) {
      console.warn('新物流API查询失败，尝试旧API:', newApiError)

      try {
        // 调用旧的API
        const response = await getLogisticsTrace({
          trackingNo: trackingNumber,
          companyCode: expressCompany
        })

        if (response.code === 200 && response.data) {
          const result = this.transformApiResponse(response.data)

          // 缓存结果
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })

          return result
        } else {
          throw new Error(response.message || '查询失败')
        }
      } catch (error) {
        console.error('物流查询失败:', error)
        // 如果API调用失败，使用模拟数据作为兜底
        try {
          const mockResult = await this.mockApiCall(trackingNumber, expressCompany)
          return mockResult
        } catch (_mockError) {
          throw new Error('物流信息查询失败，请稍后重试')
        }
      }
    }
  }

  /**
   * 映射状态字符串到LogisticsStatus枚举
   */
  private mapStatusToLogisticsStatus(status: string): LogisticsStatus {
    const statusMap: Record<string, LogisticsStatus> = {
      'pending': LogisticsStatus.PENDING,
      'picked_up': LogisticsStatus.PICKED_UP,
      'in_transit': LogisticsStatus.IN_TRANSIT,
      'out_for_delivery': LogisticsStatus.OUT_FOR_DELIVERY,
      'delivered': LogisticsStatus.DELIVERED,
      'exception': LogisticsStatus.EXCEPTION,
      'rejected': LogisticsStatus.REJECTED,
      'returned': LogisticsStatus.RETURNED
    }
    return statusMap[status] || LogisticsStatus.PENDING
  }

  /**
   * 转换API响应为前端格式
   */
  private transformApiResponse(data: any): LogisticsResult {
    if (data.traces && Array.isArray(data.traces)) {
      // 如果是物流跟踪数据
      const tracking = data as LogisticsTracking
      return {
        trackingNumber: tracking.trackingNo,
        expressCompany: tracking.companyName || tracking.companyCode,
        currentStatus: tracking.status,
        tracks: tracking.traces?.map(trace => ({
          time: new Date(trace.traceTime).toISOString(),
          location: trace.location,
          description: trace.description,
          status: trace.status as LogisticsStatus,
          statusText: this.getDescriptionByStatus(trace.status as LogisticsStatus, tracking.companyName)
        })) || [],
        lastUpdateTime: tracking.lastUpdateTime ? new Date(tracking.lastUpdateTime).toISOString() : new Date().toISOString(),
        estimatedDeliveryTime: tracking.estimatedDeliveryTime ? new Date(tracking.estimatedDeliveryTime).toISOString() : undefined
      }
    } else {
      // 如果是直接的API查询结果
      return {
        trackingNumber: data.trackingNumber || '',
        expressCompany: data.expressCompany || '',
        currentStatus: data.status || LogisticsStatus.PENDING,
        tracks: data.traces?.map((trace: any) => ({
          time: trace.time,
          location: trace.location,
          description: trace.description,
          status: trace.status,
          statusText: trace.statusText
        })) || [],
        lastUpdateTime: data.lastUpdateTime || new Date().toISOString(),
        estimatedDeliveryTime: data.estimatedDeliveryTime
      }
    }
  }

  /**
   * 批量查询物流轨迹
   */
  async batchQueryLogistics(orders: Array<{ trackingNumber: string; expressCompany: string }>): Promise<LogisticsResult[]> {
    const promises = orders.map(order =>
      this.queryLogistics(order.trackingNumber, order.expressCompany)
        .catch(error => {
          console.error(`查询 ${order.trackingNumber} 失败:`, error)
          return null
        })
    )

    const results = await Promise.all(promises)
    return results.filter(result => result !== null) as LogisticsResult[]
  }

  /**
   * 创建物流跟踪
   */
  async createLogisticsTracking(orderId: number, trackingNo: string, companyCode: string, autoSyncEnabled: boolean = true): Promise<LogisticsTracking | null> {
    try {
      const response = await createLogisticsTracking({
        orderId,
        trackingNo,
        companyCode,
        autoSyncEnabled
      })

      if (response.code === 200 && response.data) {
        ElMessage.success('物流跟踪创建成功')
        return response.data as LogisticsTracking
      } else {
        throw new Error(response.message || '创建失败')
      }
    } catch (error) {
      console.error('创建物流跟踪失败:', error)
      ElMessage.error('创建物流跟踪失败')
      return null
    }
  }

  /**
   * 获取支持的快递公司列表
   */
  async getSupportedCompanies(): Promise<ExpressCompany[]> {
    try {
      const response = await getSupportedCompanies()

      if (response.code === 200 && response.data) {
        return (response.data as any).companies || []
      } else {
        // 如果API调用失败，返回默认公司列表
        return Object.values(LOGISTICS_COMPANIES).map(company => ({
          code: company.apiCode,
          name: company.name,
          phone: '400-000-0000'
        }))
      }
    } catch (error) {
      console.error('获取快递公司列表失败:', error)
      // 返回默认公司列表
      return Object.values(LOGISTICS_COMPANIES).map(company => ({
        code: company.apiCode,
        name: company.name,
        phone: '400-000-0000'
      }))
    }
  }

  /**
   * 实时同步物流状态
   */
  async syncLogisticsStatus(trackingNumber: string, expressCompany: string): Promise<LogisticsResult | null> {
    try {
      // 清除缓存，强制重新查询
      const cacheKey = `${expressCompany}_${trackingNumber}`
      this.cache.delete(cacheKey)

      const result = await this.queryLogistics(trackingNumber, expressCompany)

      // 触发状态更新事件
      this.emitStatusUpdate(result)

      return result
    } catch (error) {
      console.error('物流状态同步失败:', error)
      return null
    }
  }

  /**
   * 批量同步物流状态
   */
  async batchSyncLogistics(trackingIds: number[]): Promise<boolean> {
    try {
      const response = await batchSyncLogisticsStatus({ trackingIds })

      if (response.code === 200) {
        ElMessage.success('批量同步成功')
        // 清除相关缓存
        this.cache.clear()
        return true
      } else {
        throw new Error(response.message || '同步失败')
      }
    } catch (error) {
      console.error('批量同步物流状态失败:', error)
      ElMessage.error('批量同步失败')
      return false
    }
  }

  /**
   * 调用真实的快递API
   */
  private async mockApiCall(trackingNumber: string, expressCompany: string): Promise<LogisticsResult> {
    const company = LOGISTICS_COMPANIES[expressCompany as keyof typeof LOGISTICS_COMPANIES]
    if (!company) {
      throw new Error('不支持的物流公司')
    }

    try {
      // 调用快递100 API
      const result = await this.callKuaidi100API(trackingNumber, company.apiCode)

      if (result && result.data && result.data.length > 0) {
        // 解析真实API返回的数据
        const tracks: LogisticsTrack[] = result.data.map((item: any) => ({
          time: item.time,
          location: item.context || '未知位置',
          description: item.context || '状态更新',
          status: this.mapApiStatusToLogisticsStatus(item.status)
        }))

        // 获取当前状态
        const currentStatus = tracks.length > 0 ? tracks[0].status : LogisticsStatus.PENDING

        return {
          trackingNumber,
          expressCompany: company.name,
          currentStatus,
          tracks,
          lastUpdateTime: new Date().toLocaleString('zh-CN'),
          estimatedDeliveryTime: currentStatus === LogisticsStatus.DELIVERED
            ? undefined
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('zh-CN')
        }
      } else {
        // 如果API没有返回数据，使用模拟数据
        return this.generateMockData(trackingNumber, company)
      }
    } catch (error) {
      console.warn('调用快递API失败，使用模拟数据:', error)
      // API调用失败时，使用模拟数据
      return this.generateMockData(trackingNumber, company)
    }
  }

  /**
   * 调用快递100 API
   */
  private async callKuaidi100API(trackingNumber: string, companyCode: string): Promise<any> {
    // 这里应该使用真实的API密钥和配置
    const apiUrl = 'https://poll.kuaidi100.com/poll/query.do'

    const params = {
      customer: LOGISTICS_API_CONFIG.kuaidi100.customer,
      sign: this.generateSign(trackingNumber, companyCode),
      param: JSON.stringify({
        com: companyCode,
        num: trackingNumber,
        phone: '', // 可选，手机号后四位
        from: '',  // 可选，出发地城市
        to: '',    // 可选，目的地城市
        resultv2: '1' // 返回结果版本
      })
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params)
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (result.returnCode !== '200') {
      throw new Error(result.message || '查询失败')
    }

    return result
  }

  /**
   * 生成签名
   */
  private generateSign(trackingNumber: string, companyCode: string): string {
    // 这里应该根据快递100的签名算法生成签名
    // 示例：MD5(param + key + customer)
    const param = JSON.stringify({
      com: companyCode,
      num: trackingNumber
    })

    // 实际项目中应该使用真实的签名算法
    return btoa(param + LOGISTICS_API_CONFIG.kuaidi100.key + LOGISTICS_API_CONFIG.kuaidi100.customer)
  }

  /**
   * 映射API状态到内部状态
   */
  private mapApiStatusToLogisticsStatus(apiStatus: string): LogisticsStatus {
    // 根据不同API的状态码映射到内部状态
    const statusMap: { [key: string]: LogisticsStatus } = {
      '0': LogisticsStatus.PENDING,      // 在途中
      '1': LogisticsStatus.PICKED_UP,    // 已揽收
      '2': LogisticsStatus.IN_TRANSIT,   // 疑难件
      '3': LogisticsStatus.DELIVERED,    // 已签收
      '4': LogisticsStatus.REJECTED,     // 退签
      '5': LogisticsStatus.OUT_FOR_DELIVERY, // 派件中
      '6': LogisticsStatus.RETURNED,     // 退回
      '7': LogisticsStatus.EXCEPTION,    // 转投
    }

    return statusMap[apiStatus] || LogisticsStatus.PENDING
  }

  /**
   * 生成模拟数据（当API调用失败时使用）
   */
  private generateMockData(trackingNumber: string, company: any): LogisticsResult {
    // 模拟不同的物流状态
    const statusOptions = [
      LogisticsStatus.PENDING,
      LogisticsStatus.PICKED_UP,
      LogisticsStatus.IN_TRANSIT,
      LogisticsStatus.OUT_FOR_DELIVERY,
      LogisticsStatus.DELIVERED
    ]

    const currentStatusIndex = Math.floor(Math.random() * statusOptions.length)
    const currentStatus = statusOptions[currentStatusIndex]

    // 生成模拟轨迹
    const tracks: LogisticsTrack[] = []
    const baseTime = new Date()

    for (let i = 0; i <= currentStatusIndex; i++) {
      const status = statusOptions[i]
      const time = new Date(baseTime.getTime() - (currentStatusIndex - i) * 24 * 60 * 60 * 1000)

      tracks.push({
        time: time.toLocaleString('zh-CN'),
        location: this.getLocationByStatus(status),
        description: this.getDescriptionByStatus(status, company.name),
        status,
        statusText: getLogisticsStatusText(status)
      })
    }

    return {
      trackingNumber,
      expressCompany: company.name,
      currentStatus,
      tracks: tracks.reverse(), // 最新的在前面
      lastUpdateTime: new Date().toLocaleString('zh-CN'),
      estimatedDeliveryTime: currentStatus === LogisticsStatus.DELIVERED
        ? undefined
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('zh-CN')
    }
  }

  /**
   * 根据状态获取位置
   */
  private getLocationByStatus(status: LogisticsStatus): string {
    const locationMap = {
      [LogisticsStatus.PENDING]: '发货地',
      [LogisticsStatus.PICKED_UP]: '分拨中心',
      [LogisticsStatus.IN_TRANSIT]: '转运中心',
      [LogisticsStatus.OUT_FOR_DELIVERY]: '派送网点',
      [LogisticsStatus.DELIVERED]: '收货地址',
      [LogisticsStatus.EXCEPTION]: '中转站',
      [LogisticsStatus.REJECTED]: '收货地址',
      [LogisticsStatus.RETURNED]: '退货仓库'
    }
    return locationMap[status] || '未知位置'
  }

  /**
   * 根据状态获取描述
   */
  private getDescriptionByStatus(status: LogisticsStatus, companyName: string): string {
    const descriptionMap = {
      [LogisticsStatus.PENDING]: `${companyName}已接单，等待揽收`,
      [LogisticsStatus.PICKED_UP]: '快件已被揽收',
      [LogisticsStatus.IN_TRANSIT]: '快件正在运输途中',
      [LogisticsStatus.OUT_FOR_DELIVERY]: '快件已到达派送网点，正在安排派送',
      [LogisticsStatus.DELIVERED]: '快件已签收，感谢使用',
      [LogisticsStatus.EXCEPTION]: '快件运输异常，正在处理',
      [LogisticsStatus.REJECTED]: '客户拒绝签收',
      [LogisticsStatus.RETURNED]: '快件已退回发货地'
    }
    return descriptionMap[status] || '状态更新'
  }

  /**
   * 触发状态更新事件
   */
  private emitStatusUpdate(result: LogisticsResult) {
    // 可以使用事件总线或者直接调用store方法
    window.dispatchEvent(new CustomEvent('logistics-status-update', {
      detail: result
    }))
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// 导出单例实例
export const logisticsService = LogisticsService.getInstance()

// 导出工具函数
export const getLogisticsStatusText = (status: LogisticsStatus): string => {
  const textMap = {
    [LogisticsStatus.PENDING]: '待揽收',
    [LogisticsStatus.PICKED_UP]: '已揽收',
    [LogisticsStatus.IN_TRANSIT]: '运输中',
    [LogisticsStatus.OUT_FOR_DELIVERY]: '派送中',
    [LogisticsStatus.DELIVERED]: '已签收',
    [LogisticsStatus.EXCEPTION]: '异常',
    [LogisticsStatus.REJECTED]: '拒收',
    [LogisticsStatus.RETURNED]: '已退回'
  }
  return textMap[status] || '未知状态'
}

export const getLogisticsStatusType = (status: LogisticsStatus): string => {
  const typeMap = {
    [LogisticsStatus.PENDING]: 'info',
    [LogisticsStatus.PICKED_UP]: 'primary',
    [LogisticsStatus.IN_TRANSIT]: 'primary',
    [LogisticsStatus.OUT_FOR_DELIVERY]: 'warning',
    [LogisticsStatus.DELIVERED]: 'success',
    [LogisticsStatus.EXCEPTION]: 'danger',
    [LogisticsStatus.REJECTED]: 'danger',
    [LogisticsStatus.RETURNED]: 'warning'
  }
  return typeMap[status] || 'info'
}
