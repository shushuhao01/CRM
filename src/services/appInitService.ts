/**
 * 应用初始化服务
 * 在登录成功后无缝预加载关键数据
 */

import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import { useOrderStore } from '@/stores/order'
import { useProductStore } from '@/stores/product'
import { useNotificationStore } from '@/stores/notification'
import { useConfigStore } from '@/stores/config'

// 预加载状态
let isPreloading = false
let preloadPromise: Promise<void> | null = null

/**
 * 清理过大的localStorage数据
 * 订单数据不需要本地缓存，从后端API加载
 */
const cleanupLargeStorageData = (): void => {
  try {
    // 检查并清理过大的订单数据
    const orderKey = 'crm_store_order'
    const orderData = localStorage.getItem(orderKey)
    if (orderData) {
      const size = orderData.length
      // 如果订单数据超过1MB，清理掉
      if (size > 1024 * 1024) {
        console.log(`[AppInit] 清理过大的订单缓存数据 (${(size / 1024 / 1024).toFixed(2)}MB)`)
        localStorage.removeItem(orderKey)
      }
    }

    // 检查总存储空间使用情况
    let totalSize = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          totalSize += value.length
        }
      }
    }

    // 如果总存储超过4MB，清理订单相关数据
    if (totalSize > 4 * 1024 * 1024) {
      console.log(`[AppInit] localStorage使用过高 (${(totalSize / 1024 / 1024).toFixed(2)}MB)，清理订单缓存`)
      localStorage.removeItem('crm_store_order')
      localStorage.removeItem('crm_store_orders')
    }
  } catch (error) {
    console.warn('[AppInit] 清理存储数据失败:', error)
  }
}

/**
 * 预加载应用关键数据
 * 在登录成功后调用，无缝加载数据
 * 🔥 优化：分优先级加载，关键数据优先，非关键数据延迟加载
 */
export const preloadAppData = async (): Promise<void> => {
  // 防止重复预加载
  if (isPreloading && preloadPromise) {
    return preloadPromise
  }

  isPreloading = true
  const startTime = Date.now()
  console.log('[AppInit] 开始预加载应用数据...')

  preloadPromise = (async () => {
    try {
      const userStore = useUserStore()

      // 确保用户已登录
      if (!userStore.isLoggedIn || !userStore.token) {
        console.log('[AppInit] 用户未登录，跳过预加载')
        return
      }

      // 清理过大的localStorage数据，避免存储空间不足
      cleanupLargeStorageData()

      // 🔥 第一阶段：加载关键数据（系统配置和订单数据）
      const criticalTasks = [
        loadSystemConfig(),
        loadOrderData(),
      ]

      const criticalResults = await Promise.allSettled(criticalTasks)
      const criticalTime = Date.now() - startTime
      console.log(`[AppInit] 关键数据加载完成，耗时: ${criticalTime}ms`)

      criticalResults.forEach((result, index) => {
        const taskNames = ['系统配置', '订单数据']
        if (result.status === 'fulfilled') {
          console.log(`[AppInit] ✅ ${taskNames[index]} 加载成功`)
        } else {
          console.warn(`[AppInit] ⚠️ ${taskNames[index]} 加载失败:`, result.reason)
        }
      })

      // 🔥 第二阶段：延迟加载非关键数据（不阻塞页面渲染）
      setTimeout(async () => {
        const secondaryTasks = [
          loadCustomerData(),
          loadProductData(),
          loadNotificationData(),
        ]

        const secondaryResults = await Promise.allSettled(secondaryTasks)
        const totalTime = Date.now() - startTime
        console.log(`[AppInit] 全部数据加载完成，总耗时: ${totalTime}ms`)

        secondaryResults.forEach((result, index) => {
          const taskNames = ['客户数据', '产品数据', '通知数据']
          if (result.status === 'fulfilled') {
            console.log(`[AppInit] ✅ ${taskNames[index]} 加载成功`)
          } else {
            console.warn(`[AppInit] ⚠️ ${taskNames[index]} 加载失败:`, result.reason)
          }
        })
      }, 100) // 延迟100ms加载非关键数据

      console.log('[AppInit] 应用数据预加载完成')
    } catch (error) {
      console.error('[AppInit] 预加载失败:', error)
    } finally {
      isPreloading = false
      preloadPromise = null
    }
  })()

  return preloadPromise
}

/**
 * 加载系统配置（包括优惠折扣设置）
 */
const loadSystemConfig = async (): Promise<void> => {
  try {
    const configStore = useConfigStore()
    // 从API加载配置，确保优惠折扣等设置全局生效
    await configStore.initConfig()
    console.log('[AppInit] 系统配置加载成功，优惠折扣设置已同步')
  } catch (error) {
    console.warn('[AppInit] 加载系统配置失败:', error)
  }
}

/**
 * 加载客户数据
 */
const loadCustomerData = async (): Promise<void> => {
  try {
    const customerStore = useCustomerStore()
    await customerStore.loadCustomers()
  } catch (error) {
    console.warn('[AppInit] 加载客户数据失败:', error)
  }
}

/**
 * 加载订单数据
 * 🔥 优化：检查缓存，避免重复请求
 */
const loadOrderData = async (): Promise<void> => {
  try {
    const orderStore = useOrderStore()

    // 🔥 并行加载流转配置和订单数据
    const tasks: Promise<unknown>[] = []

    // 加载流转延迟配置
    if (typeof orderStore.loadTransferDelayConfig === 'function') {
      tasks.push(orderStore.loadTransferDelayConfig())
    }

    // 只有当订单数据为空时才从API加载
    if (orderStore.orders.length === 0 && typeof orderStore.loadOrdersFromAPI === 'function') {
      tasks.push(orderStore.loadOrdersFromAPI())
    }

    await Promise.all(tasks)

    // 启动订单自动流转定时任务（不阻塞）
    if (typeof orderStore.startAutoTransferTask === 'function') {
      orderStore.startAutoTransferTask()
      console.log('[AppInit] 订单自动流转定时任务已启动')
    }

    // 延迟执行流转检查，不阻塞初始化
    setTimeout(() => {
      if (typeof orderStore.checkAndTransferOrders === 'function') {
        orderStore.checkAndTransferOrders()
      }
    }, 500)
  } catch (error) {
    console.warn('[AppInit] 加载订单数据失败:', error)
  }
}

/**
 * 加载产品数据
 */
const loadProductData = async (): Promise<void> => {
  try {
    const productStore = useProductStore()
    if (typeof productStore.initData === 'function') {
      await productStore.initData()
    }
  } catch (error) {
    console.warn('[AppInit] 加载产品数据失败:', error)
  }
}

/**
 * 加载通知数据
 */
const loadNotificationData = async (): Promise<void> => {
  try {
    const notificationStore = useNotificationStore()
    if (typeof notificationStore.loadMessagesFromAPI === 'function') {
      await notificationStore.loadMessagesFromAPI()
    }
  } catch (error) {
    console.warn('[AppInit] 加载通知数据失败:', error)
  }
}

/**
 * 检查预加载状态
 */
export const isAppDataPreloading = (): boolean => {
  return isPreloading
}

/**
 * 等待预加载完成
 */
export const waitForPreload = async (): Promise<void> => {
  if (preloadPromise) {
    await preloadPromise
  }
}

export default {
  preloadAppData,
  isAppDataPreloading,
  waitForPreload
}
