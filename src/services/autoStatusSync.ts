import { useLogisticsStatusStore } from '@/stores/logisticsStatus'
import { useOrderStore } from '@/stores/order'
import { usePerformanceStore } from '@/stores/performance'
import { ElMessage } from 'element-plus'

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
      
      const logisticsStore = useLogisticsStatusStore()
      
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
    const logisticsStore = useLogisticsStatusStore()
    
    // 获取状态为"运输中"、"派送中"等需要跟踪的订单
    const trackingStatuses = ['shipping', 'delivering', 'picked']
    const orders = []

    for (const status of trackingStatuses) {
      try {
        const statusOrders = await logisticsStore.fetchOrderList({
          status,
          pageSize: this.config.batchSize
        })
        orders.push(...statusOrders.filter(order => order.trackingNo))
      } catch (error) {
        console.error(`获取${status}状态订单失败:`, error)
      }
    }

    return orders
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
              await logisticsStore.updateOrderStatus(order.id, {
                status: newStatus,
                remark: `自动同步: ${latestInfo.description}`,
                autoUpdated: true
              })
              
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

  // 根据物流描述判断状态
  private determineStatusFromTracking(description: string): string | null {
    const desc = description.toLowerCase()
    
    if (desc.includes('签收') || desc.includes('已收货')) {
      return 'delivered'
    } else if (desc.includes('拒收') || desc.includes('拒绝')) {
      return 'rejected'
    } else if (desc.includes('派送') || desc.includes('配送')) {
      return 'delivering'
    } else if (desc.includes('运输') || desc.includes('转运')) {
      return 'shipping'
    } else if (desc.includes('揽收') || desc.includes('收件')) {
      return 'picked'
    }
    
    return null
  }

  // 同步到其他模块
  private async syncToOtherModules(updatedCount: number) {
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