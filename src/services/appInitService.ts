/**
 * 应用初始化服务
 * 在登录成功后无缝预加载关键数据
 */

import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import { useOrderStore } from '@/stores/order'
import { useProductStore } from '@/stores/product'
import { useNotificationStore } from '@/stores/notification'

// 预加载状态
let isPreloading = false
let preloadPromise: Promise<void> | null = null

/**
 * 预加载应用关键数据
 * 在登录成功后调用，无缝加载数据
 */
export const preloadAppData = async (): Promise<void> => {
  // 防止重复预加载
  if (isPreloading && preloadPromise) {
    return preloadPromise
  }

  isPreloading = true
  console.log('[AppInit] 开始预加载应用数据...')

  preloadPromise = (async () => {
    try {
      const userStore = useUserStore()

      // 确保用户已登录
      if (!userStore.isLoggedIn || !userStore.token) {
        console.log('[AppInit] 用户未登录，跳过预加载')
        return
      }

      // 并行加载关键数据，使用 Promise.allSettled 确保部分失败不影响整体
      const loadTasks = [
        // 加载客户数据
        loadCustomerData(),
        // 加载订单数据
        loadOrderData(),
        // 加载产品数据
        loadProductData(),
        // 加载通知数据
        loadNotificationData(),
      ]

      const results = await Promise.allSettled(loadTasks)

      // 记录加载结果
      results.forEach((result, index) => {
        const taskNames = ['客户数据', '订单数据', '产品数据', '通知数据']
        if (result.status === 'fulfilled') {
          console.log(`[AppInit] ✅ ${taskNames[index]} 加载成功`)
        } else {
          console.warn(`[AppInit] ⚠️ ${taskNames[index]} 加载失败:`, result.reason)
        }
      })

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
 */
const loadOrderData = async (): Promise<void> => {
  try {
    const orderStore = useOrderStore()
    // 使用正确的方法名
    if (typeof orderStore.loadOrdersFromAPI === 'function') {
      await orderStore.loadOrdersFromAPI()
    }
    // 启动订单自动流转定时任务
    if (typeof orderStore.startAutoTransferTask === 'function') {
      orderStore.startAutoTransferTask()
      console.log('[AppInit] 订单自动流转定时任务已启动')
    }
    // 立即执行一次流转检查
    if (typeof orderStore.checkAndTransferOrders === 'function') {
      orderStore.checkAndTransferOrders()
    }
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
