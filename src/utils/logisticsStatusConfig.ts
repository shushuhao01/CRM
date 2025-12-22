/**
 * 物流状态配置
 * 统一管理物流状态的映射、颜色和文本
 */

// 物流状态枚举
export const LOGISTICS_STATUS = {
  PENDING: 'pending',           // 待揽收
  PICKED_UP: 'picked_up',       // 已揽收
  IN_TRANSIT: 'in_transit',     // 运输中
  OUT_FOR_DELIVERY: 'out_for_delivery', // 派送中
  DELIVERED: 'delivered',       // 已签收
  EXCEPTION: 'exception',       // 派送异常
  REJECTED: 'rejected',         // 拒收
  RETURNED: 'returned',         // 已退回
  UNKNOWN: 'unknown'            // 未知
} as const

// 物流状态文本映射
export const LOGISTICS_STATUS_TEXT: Record<string, string> = {
  [LOGISTICS_STATUS.PENDING]: '待揽收',
  [LOGISTICS_STATUS.PICKED_UP]: '已揽收',
  [LOGISTICS_STATUS.IN_TRANSIT]: '运输中',
  [LOGISTICS_STATUS.OUT_FOR_DELIVERY]: '派送中',
  [LOGISTICS_STATUS.DELIVERED]: '已签收',
  [LOGISTICS_STATUS.EXCEPTION]: '派送异常',
  [LOGISTICS_STATUS.REJECTED]: '拒收',
  [LOGISTICS_STATUS.RETURNED]: '已退回',
  [LOGISTICS_STATUS.UNKNOWN]: '未知'
}

// 物流状态颜色类型映射（Element Plus Tag类型）
export const LOGISTICS_STATUS_TYPE: Record<string, string> = {
  [LOGISTICS_STATUS.PENDING]: 'info',
  [LOGISTICS_STATUS.PICKED_UP]: 'warning',
  [LOGISTICS_STATUS.IN_TRANSIT]: 'primary',
  [LOGISTICS_STATUS.OUT_FOR_DELIVERY]: 'warning',
  [LOGISTICS_STATUS.DELIVERED]: 'success',
  [LOGISTICS_STATUS.EXCEPTION]: 'danger',
  [LOGISTICS_STATUS.REJECTED]: 'danger',
  [LOGISTICS_STATUS.RETURNED]: 'info',
  [LOGISTICS_STATUS.UNKNOWN]: 'info'
}

// 物流状态颜色映射（用于自定义样式）
export const LOGISTICS_STATUS_COLOR: Record<string, string> = {
  [LOGISTICS_STATUS.PENDING]: '#909399',
  [LOGISTICS_STATUS.PICKED_UP]: '#E6A23C',
  [LOGISTICS_STATUS.IN_TRANSIT]: '#409EFF',
  [LOGISTICS_STATUS.OUT_FOR_DELIVERY]: '#E6A23C',
  [LOGISTICS_STATUS.DELIVERED]: '#67C23A',
  [LOGISTICS_STATUS.EXCEPTION]: '#F56C6C',
  [LOGISTICS_STATUS.REJECTED]: '#F56C6C',
  [LOGISTICS_STATUS.RETURNED]: '#909399',
  [LOGISTICS_STATUS.UNKNOWN]: '#909399'
}

/**
 * 获取物流状态文本
 */
export const getLogisticsStatusText = (status: string): string => {
  return LOGISTICS_STATUS_TEXT[status] || status || '未知'
}

/**
 * 获取物流状态类型（Element Plus Tag类型）
 */
export const getLogisticsStatusType = (status: string): string => {
  return LOGISTICS_STATUS_TYPE[status] || 'info'
}

/**
 * 获取物流状态颜色
 */
export const getLogisticsStatusColor = (status: string): string => {
  return LOGISTICS_STATUS_COLOR[status] || '#909399'
}

/**
 * 🔥 根据物流轨迹描述智能判断物流状态
 * @param description 物流轨迹描述文本
 * @returns 物流状态代码
 */
export const detectLogisticsStatusFromDescription = (description: string): string => {
  if (!description) return LOGISTICS_STATUS.UNKNOWN

  const desc = description.toLowerCase()

  // 已签收
  if (desc.includes('签收') || desc.includes('已收货') || desc.includes('已取件') ||
      desc.includes('代收') || desc.includes('本人签收') || desc.includes('已签')) {
    return LOGISTICS_STATUS.DELIVERED
  }

  // 拒收
  if (desc.includes('拒收') || desc.includes('拒绝') || desc.includes('拒签') ||
      desc.includes('客户拒') || desc.includes('无法联系')) {
    return LOGISTICS_STATUS.REJECTED
  }

  // 退回
  if (desc.includes('退回') || desc.includes('退件') || desc.includes('返回') ||
      desc.includes('退货') || desc.includes('寄回')) {
    return LOGISTICS_STATUS.RETURNED
  }

  // 派送异常
  if (desc.includes('异常') || desc.includes('问题件') || desc.includes('滞留') ||
      desc.includes('延误') || desc.includes('无法派送') || desc.includes('地址不详')) {
    return LOGISTICS_STATUS.EXCEPTION
  }

  // 派送中
  if (desc.includes('派送') || desc.includes('配送') || desc.includes('派件') ||
      desc.includes('正在投递') || desc.includes('快递员') || desc.includes('送货')) {
    return LOGISTICS_STATUS.OUT_FOR_DELIVERY
  }

  // 运输中
  if (desc.includes('运输') || desc.includes('转运') || desc.includes('发往') ||
      desc.includes('到达') || desc.includes('离开') || desc.includes('中转') ||
      desc.includes('装车') || desc.includes('卸车') || desc.includes('分拨')) {
    return LOGISTICS_STATUS.IN_TRANSIT
  }

  // 已揽收
  if (desc.includes('揽收') || desc.includes('收件') || desc.includes('已收') ||
      desc.includes('取件') || desc.includes('揽件') || desc.includes('已揽')) {
    return LOGISTICS_STATUS.PICKED_UP
  }

  // 待揽收
  if (desc.includes('待揽') || desc.includes('等待') || desc.includes('下单')) {
    return LOGISTICS_STATUS.PENDING
  }

  return LOGISTICS_STATUS.IN_TRANSIT // 默认运输中
}

/**
 * 🔥 根据物流轨迹列表判断当前物流状态
 * @param traces 物流轨迹列表（按时间倒序，最新的在前面）
 * @returns 物流状态代码
 */
export const detectLogisticsStatusFromTraces = (traces: Array<{ description?: string; status?: string; time?: string }>): string => {
  if (!traces || traces.length === 0) {
    return LOGISTICS_STATUS.UNKNOWN
  }

  // 取最新的轨迹（第一条）
  const latestTrace = traces[0]
  const description = latestTrace.description || latestTrace.status || ''

  return detectLogisticsStatusFromDescription(description)
}

/**
 * 🔥 获取物流状态样式（用于el-tag的style属性）
 */
export const getLogisticsStatusStyle = (status: string): Record<string, string> => {
  const color = getLogisticsStatusColor(status)
  return {
    backgroundColor: `${color}20`,
    borderColor: color,
    color: color
  }
}
