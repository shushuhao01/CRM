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

  // 已签收 - 各种签收场景
  if (
    desc.includes('签收') || desc.includes('已收货') || desc.includes('已取件') ||
    desc.includes('代收') || desc.includes('本人签收') || desc.includes('已签') ||
    desc.includes('已送达') || desc.includes('妥投') || desc.includes('派送成功') ||
    desc.includes('已领取') || desc.includes('已自提') || desc.includes('派送至本人') ||
    desc.includes('投递成功') || desc.includes('收件完成') || desc.includes('快件已送达') ||
    desc.includes('已完成') || desc.includes('已交付') || desc.includes('已投柜') ||
    desc.includes('已投递') || desc.includes('已放入') || desc.includes('已存入') ||
    desc.includes('驿站代收') || desc.includes('快递柜') || desc.includes('丰巢') ||
    desc.includes('菜鸟驿站') || desc.includes('妈妈驿站') || desc.includes('蜂巢') ||
    desc.includes('智能柜') || desc.includes('自提柜') || desc.includes('收发室') ||
    desc.includes('门卫代收') || desc.includes('前台代收') || desc.includes('物业代收') ||
    desc.includes('家人代收') || desc.includes('同事代收') || desc.includes('邻居代收')
  ) {
    return LOGISTICS_STATUS.DELIVERED
  }

  // 拒收
  if (
    desc.includes('拒收') || desc.includes('拒绝') || desc.includes('拒签') ||
    desc.includes('客户拒') || desc.includes('收件人拒') || desc.includes('买家拒') ||
    desc.includes('不要了') || desc.includes('取消订单') || desc.includes('退回签收')
  ) {
    return LOGISTICS_STATUS.REJECTED
  }

  // 退回
  if (
    desc.includes('退回') || desc.includes('退件') || desc.includes('返回') ||
    desc.includes('退货') || desc.includes('寄回') || desc.includes('原路返回') ||
    desc.includes('退回发件') || desc.includes('返回发件') || desc.includes('已退回')
  ) {
    return LOGISTICS_STATUS.RETURNED
  }

  // 派送异常
  if (
    desc.includes('异常') || desc.includes('问题件') || desc.includes('滞留') ||
    desc.includes('延误') || desc.includes('无法派送') || desc.includes('地址不详') ||
    desc.includes('联系不上') || desc.includes('电话无人接听') || desc.includes('无人接听') ||
    desc.includes('超区') || desc.includes('破损') || desc.includes('丢失') ||
    desc.includes('遗失') || desc.includes('短少') || desc.includes('缺失') ||
    desc.includes('无法联系') || desc.includes('地址错误') || desc.includes('地址有误') ||
    desc.includes('停发') || desc.includes('暂停') || desc.includes('疫情') ||
    desc.includes('不派送') || desc.includes('无法投递') || desc.includes('投递失败') ||
    desc.includes('派送失败') || desc.includes('配送失败') || desc.includes('多次派送未成功')
  ) {
    return LOGISTICS_STATUS.EXCEPTION
  }

  // 派送中
  if (
    desc.includes('派送') || desc.includes('配送') || desc.includes('派件') ||
    desc.includes('正在投递') || desc.includes('快递员') || desc.includes('送货') ||
    desc.includes('正在派送') || desc.includes('派送员') || desc.includes('配送员') ||
    desc.includes('出库派送') || desc.includes('安排派送') || desc.includes('开始派送') ||
    desc.includes('正在为您') || desc.includes('即将送达') || desc.includes('预计今天') ||
    desc.includes('预计送达') || desc.includes('末端派送') || desc.includes('站点派送') ||
    desc.includes('骑手') || desc.includes('小哥') || desc.includes('师傅')
  ) {
    return LOGISTICS_STATUS.OUT_FOR_DELIVERY
  }

  // 运输中
  if (
    desc.includes('运输') || desc.includes('转运') || desc.includes('发往') ||
    desc.includes('到达') || desc.includes('离开') || desc.includes('中转') ||
    desc.includes('装车') || desc.includes('卸车') || desc.includes('分拨') ||
    desc.includes('发出') || desc.includes('在途') || desc.includes('途中') ||
    desc.includes('干线') || desc.includes('航班') || desc.includes('班车') ||
    desc.includes('已发出') || desc.includes('正发往') || desc.includes('运往') ||
    desc.includes('分拣') || desc.includes('扫描') || desc.includes('处理中') ||
    desc.includes('集散') || desc.includes('转运中心') || desc.includes('分拨中心') ||
    desc.includes('营业部') || desc.includes('网点')
  ) {
    return LOGISTICS_STATUS.IN_TRANSIT
  }

  // 已揽收
  if (
    desc.includes('揽收') || desc.includes('收件') || desc.includes('已收') ||
    desc.includes('取件') || desc.includes('揽件') || desc.includes('已揽') ||
    desc.includes('已取') || desc.includes('上门取件') || desc.includes('快递员已取') ||
    desc.includes('寄件成功') || desc.includes('已寄出') || desc.includes('商家已发货')
  ) {
    return LOGISTICS_STATUS.PICKED_UP
  }

  // 待揽收
  if (
    desc.includes('待揽') || desc.includes('等待') || desc.includes('下单') ||
    desc.includes('已下单') || desc.includes('待取件') || desc.includes('待上门') ||
    desc.includes('预约取件') || desc.includes('等待揽收')
  ) {
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

// ==================== 物流动态内容颜色服务 ====================

/**
 * 物流动态内容颜色类型
 */
export type LogisticsInfoColorType = 'success' | 'warning' | 'danger' | 'default'

/**
 * 物流动态内容颜色映射
 */
export const LOGISTICS_INFO_COLORS: Record<LogisticsInfoColorType, string> = {
  success: '#67C23A',  // 绿色 - 已签收
  warning: '#E6A23C',  // 橙色 - 派送中
  danger: '#F56C6C',   // 红色 - 异常/拒收
  default: '#606266'   // 默认灰色 - 运输中
}

/**
 * 🔥 根据物流动态内容判断颜色类型
 * @param description 物流动态描述文本
 * @returns 颜色类型
 */
export const detectLogisticsInfoColorType = (description: string): LogisticsInfoColorType => {
  if (!description) return 'default'

  const desc = description.toLowerCase()

  // 🟢 绿色 - 已签收/已送达（各种签收场景）
  if (
    desc.includes('签收') || desc.includes('已收货') || desc.includes('已取件') ||
    desc.includes('代收') || desc.includes('本人签收') || desc.includes('已签') ||
    desc.includes('已送达') || desc.includes('妥投') || desc.includes('收件人已签收') ||
    desc.includes('已领取') || desc.includes('已自提') || desc.includes('派送成功') ||
    desc.includes('派送至本人') || desc.includes('投递成功') || desc.includes('收件完成') ||
    desc.includes('快件已送达') || desc.includes('已完成') || desc.includes('已交付') ||
    desc.includes('已投柜') || desc.includes('已投递') || desc.includes('已放入') ||
    desc.includes('已存入') || desc.includes('驿站代收') || desc.includes('快递柜') ||
    desc.includes('丰巢') || desc.includes('菜鸟驿站') || desc.includes('妈妈驿站') ||
    desc.includes('蜂巢') || desc.includes('智能柜') || desc.includes('自提柜') ||
    desc.includes('收发室') || desc.includes('门卫代收') || desc.includes('前台代收') ||
    desc.includes('物业代收') || desc.includes('家人代收') || desc.includes('同事代收') ||
    desc.includes('邻居代收')
  ) {
    return 'success'
  }

  // 🔴 红色 - 异常/拒收/退回
  if (
    desc.includes('拒收') || desc.includes('拒绝') || desc.includes('拒签') ||
    desc.includes('客户拒') || desc.includes('收件人拒') || desc.includes('买家拒') ||
    desc.includes('无法联系') || desc.includes('异常') || desc.includes('问题件') ||
    desc.includes('滞留') || desc.includes('延误') || desc.includes('无法派送') ||
    desc.includes('地址不详') || desc.includes('退回') || desc.includes('退件') ||
    desc.includes('返回') || desc.includes('退货') || desc.includes('寄回') ||
    desc.includes('联系不上') || desc.includes('电话无人接听') || desc.includes('无人接听') ||
    desc.includes('超区') || desc.includes('破损') || desc.includes('丢失') ||
    desc.includes('遗失') || desc.includes('短少') || desc.includes('缺失') ||
    desc.includes('地址错误') || desc.includes('地址有误') || desc.includes('停发') ||
    desc.includes('暂停') || desc.includes('不派送') || desc.includes('无法投递') ||
    desc.includes('投递失败') || desc.includes('派送失败') || desc.includes('配送失败') ||
    desc.includes('多次派送未成功') || desc.includes('退回签收') || desc.includes('原路返回') ||
    desc.includes('不要了') || desc.includes('取消订单')
  ) {
    return 'danger'
  }

  // 🟠 橙色 - 派送中
  if (
    desc.includes('派送') || desc.includes('配送') || desc.includes('派件') ||
    desc.includes('正在投递') || desc.includes('快递员') || desc.includes('送货') ||
    desc.includes('正在派送') || desc.includes('派送员') || desc.includes('配送员') ||
    desc.includes('出库派送') || desc.includes('安排派送') || desc.includes('开始派送') ||
    desc.includes('正在为您') || desc.includes('即将送达') || desc.includes('预计今天') ||
    desc.includes('预计送达') || desc.includes('末端派送') || desc.includes('站点派送') ||
    desc.includes('骑手') || desc.includes('小哥') || desc.includes('师傅')
  ) {
    return 'warning'
  }

  // 默认 - 运输中/揽收/其他
  return 'default'
}

/**
 * 🔥 获取物流动态内容的颜色
 * @param description 物流动态描述文本
 * @returns 颜色值
 */
export const getLogisticsInfoColor = (description: string): string => {
  const colorType = detectLogisticsInfoColorType(description)
  return LOGISTICS_INFO_COLORS[colorType]
}

/**
 * 🔥 获取物流动态内容的样式对象
 * @param description 物流动态描述文本
 * @returns 样式对象
 */
export const getLogisticsInfoStyle = (description: string): Record<string, string> => {
  const color = getLogisticsInfoColor(description)
  return {
    color: color,
    fontWeight: color !== LOGISTICS_INFO_COLORS.default ? '500' : 'normal'
  }
}
