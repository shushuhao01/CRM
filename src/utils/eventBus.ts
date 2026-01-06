/**
 * 事件总线 - 用于组件间通信
 * 实现订单状态同步等跨组件通信需求
 */

type EventCallback = (...args: any[]) => void

interface EventMap {
  [key: string]: EventCallback[]
}

class EventBus {
  private events: EventMap = {}

  /**
   * 订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  /**
   * 取消订阅事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  off(event: string, callback?: EventCallback) {
    if (!this.events[event]) return

    if (callback) {
      // 移除特定回调
      this.events[event] = this.events[event].filter(cb => cb !== callback)
    } else {
      // 移除所有回调
      delete this.events[event]
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param args 传递给回调的参数
   */
  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return

    this.events[event].forEach(callback => {
      try {
        callback(...args)
      } catch (error) {
        console.error(`[EventBus] 事件 "${event}" 回调执行出错:`, error)
      }
    })
  }

  /**
   * 订阅一次性事件
   * @param event 事件名称
   * @param callback 回调函数
   */
  once(event: string, callback: EventCallback) {
    const onceCallback: EventCallback = (...args: any[]) => {
      callback(...args)
      this.off(event, onceCallback)
    }
    this.on(event, onceCallback)
  }

  /**
   * 清空所有事件
   */
  clear() {
    this.events = {}
  }
}

// 导出单例
export const eventBus = new EventBus()

// 定义事件名称常量
export const EventNames = {
  // 订单相关事件
  ORDER_STATUS_CHANGED: 'order:status:changed',      // 订单状态变更
  ORDER_CREATED: 'order:created',                     // 订单创建
  ORDER_UPDATED: 'order:updated',                     // 订单更新
  ORDER_DELETED: 'order:deleted',                     // 订单删除
  ORDER_TRANSFERRED: 'order:transferred',             // 订单流转
  ORDER_AUDITED: 'order:audited',                     // 订单审核
  ORDER_SHIPPED: 'order:shipped',                     // 订单发货
  ORDER_CANCELLED: 'order:cancelled',                 // 订单取消
  ORDER_RETURNED: 'order:returned',                   // 订单退回

  // 刷新列表事件
  REFRESH_ORDER_LIST: 'refresh:order:list',           // 刷新订单列表
  REFRESH_AUDIT_LIST: 'refresh:audit:list',           // 刷新审核列表
  REFRESH_SHIPPING_LIST: 'refresh:shipping:list',     // 刷新发货列表
  REFRESH_LOGISTICS_LIST: 'refresh:logistics:list',   // 刷新物流列表

  // 绩效相关事件
  PERFORMANCE_UPDATED: 'performance:updated',         // 绩效数据更新（状态/系数/备注变更）
}

