/**
 * 订单状态统一配置
 * 确保所有页面使用相同的状态颜色和文本
 */

// 订单状态颜色映射（确保每个状态颜色唯一）
export const ORDER_STATUS_COLORS: Record<string, string> = {
  // 流转相关状态
  'pending_transfer': '#A0A0A0',      // 中灰色 - 待流转
  'pending_audit': '#E6A23C',         // 橙色 - 待审核
  'audit_rejected': '#F56C6C',        // 红色 - 审核拒绝
  'approved': '#52C41A',              // 草绿色 - 已审核通过

  // 发货相关状态
  'pending_shipment': '#409EFF',      // 蓝色 - 待发货
  'shipped': '#67C23A',               // 绿色 - 已发货
  'delivered': '#13CE66',             // 亮绿色 - 已签收
  'signed': '#13CE66',                // 🔥 新增：已签收的另一种表示
  '已签收': '#13CE66',                // 🔥 新增：中文状态

  // 退回/取消相关状态
  'logistics_returned': '#FF9900',    // 橙黄色 - 物流部退回
  'logistics_cancelled': '#B0B0B0',   // 银灰色 - 物流部取消
  'rejected_returned': '#E64242',     // 深红色 - 拒收已退回
  'cancelled': '#808080',             // 深灰色 - 已取消
  'pending_cancel': '#D48806',        // 暗橙色 - 待取消
  'cancel_failed': '#CF1322',         // 暗红色 - 取消失败

  // 异常状态
  'package_exception': '#FF4949',     // 亮红色 - 包裹异常
  'rejected': '#F78989',              // 粉红色 - 拒收
  'abnormal': '#FF6B6B',              // 珊瑚红 - 状态异常

  // 售后相关
  'after_sales_created': '#9B59B6',   // 紫色 - 已建售后
  'refunded': '#8E44AD',              // 深紫色 - 退货退款

  // 草稿状态
  'draft': '#C0C0C0',                 // 浅银色 - 草稿

  // 其他状态
  'pending': '#FAAD14',               // 金色 - 待处理
  'confirmed': '#1890FF',             // 天蓝色 - 已确认
  'paid': '#19BE6B',                  // 翠绿色 - 已支付
  'completed': '#389E0D',             // 深绿色 - 已完成

  // 物流状态
  'picked_up': '#2F54EB',             // 靛蓝色 - 已揽收
  'in_transit': '#36CFC9',            // 青色 - 运输中
  'out_for_delivery': '#FA8C16',      // 橙色 - 派送中
  'exception': '#FF4D4F',             // 红色 - 异常
  'returned': '#FA541C',              // 橙红色 - 已退回
  'todo': '#722ED1'                   // 紫罗兰 - 待办
}

// 订单状态文本映射
export const ORDER_STATUS_TEXT: Record<string, string> = {
  // 流转相关状态
  'pending_transfer': '待流转',
  'pending_audit': '待审核',
  'audit_rejected': '审核拒绝',

  // 发货相关状态
  'pending_shipment': '待发货',
  'shipped': '已发货',
  'delivered': '已签收',
  'signed': '已签收',            // 🔥 新增：已签收的另一种表示
  '已签收': '已签收',            // 🔥 新增：中文状态

  // 退回/取消相关状态
  'logistics_returned': '物流部退回',
  'logistics_cancelled': '物流部取消',
  'rejected_returned': '拒收已退回',
  'cancelled': '已取消',
  'pending_cancel': '待取消',
  'cancel_failed': '取消失败',

  // 异常状态
  'package_exception': '包裹异常',
  'rejected': '拒收',
  'abnormal': '状态异常',

  // 售后相关
  'after_sales_created': '已建售后',
  'refunded': '退货退款',

  // 草稿状态
  'draft': '草稿',

  // 审核相关状态（用于订单审核列表）
  'pending': '待审核',
  'approved': '审核通过',

  // 其他状态
  'confirmed': '已确认',
  'paid': '已支付',
  'completed': '已完成',

  // 物流状态
  'picked_up': '已揽收',
  'in_transit': '运输中',
  'out_for_delivery': '派送中',
  'exception': '异常',
  'returned': '已退回',
  'todo': '待办'
}

// Element Plus Tag 类型映射
export const ORDER_STATUS_TAG_TYPE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'primary' | ''> = {
  // 流转相关状态
  'pending_transfer': 'info',
  'pending_audit': 'warning',
  'audit_rejected': 'danger',
  'approved': 'success',

  // 发货相关状态
  'pending_shipment': 'primary',
  'shipped': 'success',
  'delivered': 'success',
  'signed': 'success',           // 🔥 新增：已签收的另一种表示
  '已签收': 'success',           // 🔥 新增：中文状态

  // 退回/取消相关状态
  'logistics_returned': 'warning',
  'logistics_cancelled': 'info',
  'rejected_returned': 'danger',
  'cancelled': 'info',
  'pending_cancel': 'warning',
  'cancel_failed': 'danger',

  // 异常状态
  'package_exception': 'danger',
  'rejected': 'danger',
  'abnormal': 'danger',

  // 售后相关
  'after_sales_created': 'warning',
  'refunded': 'danger',

  // 草稿状态
  'draft': 'info',

  // 其他状态
  'pending': 'warning',
  'confirmed': 'primary',
  'paid': 'success',
  'completed': 'success',

  // 物流状态
  'picked_up': 'primary',
  'in_transit': 'primary',
  'out_for_delivery': 'warning',
  'exception': 'danger',
  'returned': 'danger',
  'todo': 'warning'
}

/**
 * 获取订单状态颜色
 */
export const getOrderStatusColor = (status: string): string => {
  return ORDER_STATUS_COLORS[status] || '#909399'
}

/**
 * 获取订单状态文本
 */
export const getOrderStatusText = (status: string): string => {
  return ORDER_STATUS_TEXT[status] || status || '未知'
}

/**
 * 获取订单状态Tag类型
 */
export const getOrderStatusTagType = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'primary' | '' => {
  return ORDER_STATUS_TAG_TYPE[status] || 'info'
}

/**
 * 获取订单状态样式（用于自定义颜色的Tag）
 */
export const getOrderStatusStyle = (status: string): { backgroundColor: string; borderColor: string; color: string } => {
  const color = ORDER_STATUS_COLORS[status] || '#909399'
  return {
    backgroundColor: `${color}20`,  // 20% 透明度背景
    borderColor: color,
    color: color
  }
}
