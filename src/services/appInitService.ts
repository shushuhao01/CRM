/**
 * 应用初始化服务
 * 在登录成功后无缝预加载关键数据
 * 🔥 优化：分阶段加载，首页数据优先，非关键数据延迟加载
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
// 🔥 新增：标记关键数据是否已加载
let criticalDataLoaded = false

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
 * 🔥 优化：分三阶段加载，首页数据最优先，非关键数据大幅延迟
 */
export const preloadAppData = async (): Promise<void> => {
  // 防止重复预加载
  if (isPreloading && preloadPromise) {
    return preloadPromise
  }

  isPreloading = true
  criticalDataLoaded = false
  const startTime = Date.now()
  console.log('[AppInit] 🚀 开始预加载应用数据...')

  preloadPromise = (async () => {
    try {
      const userStore = useUserStore()

      // 确保用户已登录
      if (!userStore.isLoggedIn || !userStore.token) {
        console.log('[AppInit] 用户未登录，跳过预加载')
        return
      }

      // 清理过大的localStorage数据（异步执行，不阻塞）
      setTimeout(() => cleanupLargeStorageData(), 0)

      // 🔥 第一阶段（最高优先级）：只加载首页必需的数据
      // 系统配置是必需的，订单数据用于首页统计
      console.log('[AppInit] 📦 第一阶段：加载首页必需数据...')

      // 🔥 优化：系统配置和订单数据并行加载，但设置超时
      const criticalPromise = Promise.race([
        Promise.allSettled([
          loadSystemConfig(),
          loadOrderDataFast(), // 🔥 使用快速加载版本
        ]),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 3000)) // 3秒超时
      ])

      const criticalResult = await criticalPromise
      const criticalTime = Date.now() - startTime

      if (criticalResult === 'timeout') {
        console.warn(`[AppInit] ⚠️ 关键数据加载超时 (${criticalTime}ms)，继续执行`)
      } else {
        console.log(`[AppInit] ✅ 关键数据加载完成，耗时: ${criticalTime}ms`)
      }

      criticalDataLoaded = true

      // 🔥 第二阶段（延迟500ms）：加载次要数据
      setTimeout(async () => {
        console.log('[AppInit] 📦 第二阶段：加载次要数据...')
        const secondaryStart = Date.now()

        await Promise.allSettled([
          loadProductData(),
        ])

        console.log(`[AppInit] ✅ 次要数据加载完成，耗时: ${Date.now() - secondaryStart}ms`)
      }, 500)

      // 🔥 第三阶段（延迟2秒）：加载非关键数据
      setTimeout(async () => {
        console.log('[AppInit] 📦 第三阶段：加载非关键数据...')
        const tertiaryStart = Date.now()

        await Promise.allSettled([
          loadCustomerData(),
          loadNotificationData(),
        ])

        const totalTime = Date.now() - startTime
        console.log(`[AppInit] ✅ 非关键数据加载完成，耗时: ${Date.now() - tertiaryStart}ms`)
        console.log(`[AppInit] 🎉 全部数据加载完成，总耗时: ${totalTime}ms`)
      }, 2000)

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
 * 🔥 快速加载订单数据（只加载必要字段，不执行额外操作）
 */
const loadOrderDataFast = async (): Promise<void> => {
  try {
    const orderStore = useOrderStore()

    // 只有当订单数据为空时才从API加载
    if (orderStore.orders.length === 0 && typeof orderStore.loadOrdersFromAPI === 'function') {
      await orderStore.loadOrdersFromAPI()
    }

    // 🔥 流转配置和自动流转任务延迟执行，不阻塞首页加载
    setTimeout(() => {
      if (typeof orderStore.loadTransferDelayConfig === 'function') {
        orderStore.loadTransferDelayConfig()
      }
      if (typeof orderStore.startAutoTransferTask === 'function') {
        orderStore.startAutoTransferTask()
      }
    }, 1000)
  } catch (error) {
    console.warn('[AppInit] 快速加载订单数据失败:', error)
  }
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
 * 🔥 检查关键数据是否已加载
 */
export const isCriticalDataLoaded = (): boolean => {
  return criticalDataLoaded
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
  waitForPreload,
  isCriticalDataLoaded
}
