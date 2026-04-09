import { useLogisticsStatusStore } from '@/stores/logisticsStatus'
import { useOrderStore } from '@/stores/order'
import { usePerformanceStore } from '@/stores/performance'
import { ElMessage } from 'element-plus'
import { detectLogisticsStatusFromDescription } from '@/utils/logisticsStatusConfig'

export interface AutoSyncConfig {
  enabled: boolean
  interval: number // 检测间隔（分钟）
  batchSize: number // 每次处理的订单数量
  retryCount: number // 重试次数
  syncToPerformance: boolean // 是否同步到业绩统计
  syncToOrderList: boolean // 是否同步到订单列表
}

export interface SyncResult {
  success: boolean
  updatedCount: number
  errorCount: number
  errors: string[]
  lastSyncTime: string
}

class AutoStatusSyncService {
  private config: AutoSyncConfig = {
    enabled: false,
    interval: 30, // 默认30分钟检测一次
    batchSize: 50, // 每次处理50个订单
    retryCount: 3,
    syncToPerformance: true,
    syncToOrderList: true
  }

  private syncTimer: NodeJS.Timeout | null = null
  private isRunning = false
  private lastSyncTime = ''

  constructor() {
    this.loadConfig()
  }

  // 加载配置
  private loadConfig() {
    const savedConfig = localStorage.getItem('autoStatusSyncConfig')
    if (savedConfig) {
      try {
        this.config = { ...this.config, ...JSON.parse(savedConfig) }
      } catch (error) {
        console.error('加载自动同步配置失败:', error)
      }
    }
  }

  // 保存配置
  private saveConfig() {
    try {
      localStorage.setItem('autoStatusSyncConfig', JSON.stringify(this.config))
    } catch (error) {
      console.error('保存自动同步配置失败:', error)
    }
  }

  // 获取配置
  getConfig(): AutoSyncConfig {
    return { ...this.config }
  }

  // 更新配置
  updateConfig(newConfig: Partial<AutoSyncConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.saveConfig()

    // 如果启用状态发生变化，重新启动或停止服务
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled) {
        this.start()
      } else {
        this.stop()
      }
    } else if (this.config.enabled && newConfig.interval) {
      // 如果间隔时间发生变化，重新启动定时器
      this.restart()
    }
  }

  // 启动自动同步
  start() {
    if (this.isRunning || !this.config.enabled) {
      return
    }

    this.isRunning = true
    this.syncTimer = setInterval(() => {
      this.performAutoSync()
    }, this.config.interval * 60 * 1000) // 转换为毫秒

    console.log(`自动状态同步服务已启动，检测间隔: ${this.config.interval}分钟`)
    ElMessage.success('自动状态同步服务已启动')
  }

  // 停止自动同步
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = null
    }
    this.isRunning = false
    console.log('自动状态同步服务已停止')
  }

  // 重启服务
  restart() {
    this.stop()
    if (this.config.enabled) {
      this.start()
    }
  }

  // 执行自动同步
  private async performAutoSync(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      updatedCount: 0,
      errorCount: 0,
      errors: [],
      lastSyncTime: new Date().toISOString()
    }

    try {
      console.log('开始执行自动状态同步...')

      // 获取需要检测的订单列表
      const pendingOrders = await this.getPendingOrders()

      if (pendingOrders.length === 0) {
        console.log('没有需要同步的订单')
        result.success = true
        this.lastSyncTime = result.lastSyncTime
        return result
      }

      // 分批处理订单
      const batches = this.chunkArray(pendingOrders, this.config.batchSize)

      for (const batch of batches) {
        try {
          const batchResult = await this.processBatch(batch)
          result.updatedCount += batchResult.updatedCount
          result.errorCount += batchResult.errorCount
          result.errors.push(...batchResult.errors)
        } catch (error) {
          console.error('批次处理失败:', error)
          result.errorCount += batch.length
          result.errors.push(`批次处理失败: ${error}`)
        }
      }

      // 同步到业绩统计和订单列表
      if (result.updatedCount > 0) {
        await this.syncToOtherModules(result.updatedCount)
      }

      result.success = result.errorCount === 0
      this.lastSyncTime = result.lastSyncTime

      console.log(`自动同步完成: 更新${result.updatedCount}个订单, 错误${result.errorCount}个`)

      if (result.updatedCount > 0) {
        ElMessage.success(`自动同步完成，更新了${result.updatedCount}个订单状态`)
      }

    } catch (error) {
      console.error('自动同步执行失败:', error)
      result.errors.push(`同步执行失败: ${error}`)
      result.errorCount++
    }

    return result
  }

  // 获取待检测的订单
  private async getPendingOrders() {
    try {
      // 🔥 通过后端API获取需要跟踪的已发货订单
      const { orderApi } = await import('@/api/order')
      const response = await orderApi.getShippingShipped({
        status: 'shipped',
        pageSize: this.config.batchSize
      }) as any

      if (response?.data?.list && Array.isArray(response.data.list)) {
        return response.data.list
          .filter((order: any) => order.trackingNumber || order.trackingNo)
          .map((order: any) => ({
            id: order.id,
            orderNo: order.orderNumber || order.orderNo,
            trackingNo: order.trackingNumber || order.trackingNo,
            status: order.logisticsStatus || order.status,
            customerPhone: order.customerPhone || order.shippingPhone
          }))
      }
      return []
    } catch (error) {
      console.error('获取待检测订单失败:', error)
      return []
    }
  }

  // 处理订单批次
  private async processBatch(orders: any[]) {
    const result = {
      updatedCount: 0,
      errorCount: 0,
      errors: [] as string[]
    }

    const logisticsStore = useLogisticsStatusStore()

    for (const order of orders) {
      let retryCount = 0
      let success = false

      while (retryCount < this.config.retryCount && !success) {
        try {
          // 获取最新物流信息
          const trackingInfo = await logisticsStore.fetchTrackingInfo(order.trackingNo)

          if (trackingInfo.length > 0) {
            const latestInfo = trackingInfo[0]
            const newStatus = this.determineStatusFromTracking(latestInfo.description)

            // 如果状态发生变化，更新订单状态
            if (newStatus && newStatus !== order.status) {
              await logisticsStore.updateOrderStatus(
                order.orderNo,
                newStatus,
                `自动同步: ${latestInfo.description}`
              )

              result.updatedCount++
              console.log(`订单${order.orderNo}状态已更新: ${order.status} -> ${newStatus}`)
            }
          }

          success = true
        } catch (error) {
          retryCount++
          console.error(`处理订单${order.orderNo}失败 (重试${retryCount}/${this.config.retryCount}):`, error)

          if (retryCount >= this.config.retryCount) {
            result.errorCount++
            result.errors.push(`订单${order.orderNo}处理失败: ${error}`)
          } else {
            // 等待一段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }
      }
    }

    return result
  }

  // 根据物流描述判断状态（使用统一的状态检测逻辑）
  private determineStatusFromTracking(description: string): string | null {
    if (!description) return null

    const detected = detectLogisticsStatusFromDescription(description)
    // 如果检测结果是 unknown 或 in_transit（默认值），返回 null 表示状态不确定
    if (detected === 'unknown') return null
    return detected
  }

  // 同步到其他模块
  private async syncToOtherModules(_updatedCount: number) {
    try {
      if (this.config.syncToPerformance) {
        const performanceStore = usePerformanceStore()
        // 触发业绩统计数据刷新
        if (performanceStore.refreshData) {
          await performanceStore.refreshData()
        }
      }

      if (this.config.syncToOrderList) {
        const orderStore = useOrderStore()
        // 触发订单列表数据刷新
        if (orderStore.refreshData) {
          await orderStore.refreshData()
        }
      }
    } catch (error) {
      console.error('同步到其他模块失败:', error)
    }
  }

  // 数组分块
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  // 手动执行同步
  async manualSync(): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('自动同步正在运行中，请稍后再试')
    }

    return await this.performAutoSync()
  }

  // 获取同步状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      config: this.getConfig()
    }
  }
}

// 创建单例实例
export const autoStatusSyncService = new AutoStatusSyncService()

// 导出服务类
export default AutoStatusSyncService
