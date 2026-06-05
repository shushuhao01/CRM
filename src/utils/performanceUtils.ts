/**
 * 🔥 统一的业绩计算规则工具函数
 *
 * 业绩计算规则：
 * - 下单业绩：订单创建后，只要不是取消、拒绝、退回等状态就计入
 *   - 待流转状态只有markType='normal'（正常发货单）才计入
 *   - 预留单和退单不计入业绩
 * - 发货业绩：订单发货后计入
 * - 签收业绩：订单签收后计入
 */

// 不计入下单业绩的状态
const EXCLUDED_STATUSES = [
  'pending_cancel',      // 取消申请
  'cancelled',           // 已取消
  'audit_rejected',      // 审核拒绝
  'logistics_returned',  // 物流部退回
  'logistics_cancelled', // 物流部取消
  'refunded'             // 已退款
]

// 计入发货业绩的状态（所有已出库的订单，不只是当前处于"已发货"状态的）
const SHIPPED_STATUSES = ['shipped', 'delivered', 'signed', 'completed', 'rejected', 'rejected_returned', 'package_exception']

// 计入签收业绩的状态
const DELIVERED_STATUSES = ['delivered']

/**
 * 判断订单是否计入下单业绩
 * @param order 订单对象，需要包含 status 和 markType 字段
 * @returns 是否计入下单业绩
 */
export const isValidForOrderPerformance = (order: { status: string; markType?: string }): boolean => {
  // 如果是待流转状态，需要检查markType
  if (order.status === 'pending_transfer') {
    // 只有正常发货单才计入业绩，预留单和退单不计入
    return order.markType === 'normal'
  }

  // 其他状态，只要不在排除列表中就计入
  return !EXCLUDED_STATUSES.includes(order.status)
}

/**
 * 判断订单是否计入发货业绩
 * @param order 订单对象，需要包含 status 字段
 * @returns 是否计入发货业绩
 */
export const isValidForShipmentPerformance = (order: { status: string }): boolean => {
  return SHIPPED_STATUSES.includes(order.status)
}

/**
 * 判断订单是否计入签收业绩
 * @param order 订单对象，需要包含 status 字段
 * @returns 是否计入签收业绩
 */
export const isValidForDeliveryPerformance = (order: { status: string }): boolean => {
  return DELIVERED_STATUSES.includes(order.status)
}

/**
 * 过滤有效的下单业绩订单
 * @param orders 订单数组
 * @returns 有效的订单数组
 */
export const filterValidOrdersForPerformance = <T extends { status: string; markType?: string }>(orders: T[]): T[] => {
  return orders.filter(isValidForOrderPerformance)
}

/**
 * 过滤有效的发货业绩订单
 * @param orders 订单数组
 * @returns 有效的订单数组
 */
export const filterValidOrdersForShipment = <T extends { status: string }>(orders: T[]): T[] => {
  return orders.filter(isValidForShipmentPerformance)
}

/**
 * 过滤有效的签收业绩订单
 * @param orders 订单数组
 * @returns 有效的订单数组
 */
export const filterValidOrdersForDelivery = <T extends { status: string }>(orders: T[]): T[] => {
  return orders.filter(isValidForDeliveryPerformance)
}

/**
 * 计算订单业绩统计
 * @param orders 订单数组
 * @returns 业绩统计数据
 */
export const calculatePerformanceStats = <T extends { status: string; markType?: string; totalAmount: number }>(orders: T[]) => {
  // 下单业绩
  const validOrders = filterValidOrdersForPerformance(orders)
  const orderCount = validOrders.length
  const orderAmount = validOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

  // 发货业绩
  const shippedOrders = filterValidOrdersForShipment(orders)
  const shippedCount = shippedOrders.length
  const shippedAmount = shippedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

  // 签收业绩
  const deliveredOrders = filterValidOrdersForDelivery(orders)
  const deliveredCount = deliveredOrders.length
  const deliveredAmount = deliveredOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

  return {
    // 下单业绩
    orderCount,
    orderAmount,
    // 发货业绩
    shippedCount,
    shippedAmount,
    // 签收业绩
    deliveredCount,
    deliveredAmount,
    // 签收率
    signedRate: orderCount > 0 ? ((deliveredCount / orderCount) * 100).toFixed(1) : '0.0'
  }
}

export default {
  isValidForOrderPerformance,
  isValidForShipmentPerformance,
  isValidForDeliveryPerformance,
  filterValidOrdersForPerformance,
  filterValidOrdersForShipment,
  filterValidOrdersForDelivery,
  calculatePerformanceStats
}
