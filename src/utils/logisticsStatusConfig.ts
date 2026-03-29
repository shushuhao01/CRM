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

  // 🔥 优先判断：退回/拒收（必须在签收判断之前）
  // 退回 - 包括退回签收、退回派送、仓库签收等场景
  if (
    desc.includes('退回') || desc.includes('退件') || desc.includes('返回') ||
    desc.includes('退货') || desc.includes('寄回') || desc.includes('原路返回') ||
    desc.includes('退回发件') || desc.includes('返回发件') || desc.includes('已退回') ||
    // 🔥 新增：更多退回场景
    desc.includes('退回中') || desc.includes('正在退回') || desc.includes('退件中') ||
    desc.includes('退回途中') || desc.includes('逆向物流') || desc.includes('退货物流') ||
    desc.includes('返件') || desc.includes('回寄') || desc.includes('拦截退回') ||
    // 🔥 关键：退回签收、退回派送、仓库签收等场景
    desc.includes('退回签收') || desc.includes('退回派送') || desc.includes('仓库签收') ||
    desc.includes('退回仓库') || desc.includes('返回仓库') || desc.includes('退回网点') ||
    desc.includes('退回发件人') || desc.includes('退回寄件人')
  ) {
    return LOGISTICS_STATUS.RETURNED
  }

  // 拒收
  if (
    desc.includes('拒收') || desc.includes('拒绝') || desc.includes('拒签') ||
    desc.includes('客户拒') || desc.includes('收件人拒') || desc.includes('买家拒') ||
    desc.includes('不要了') || desc.includes('取消订单') ||
    // 🔥 新增：更多拒收场景
    desc.includes('拒绝签收') || desc.includes('拒绝收货') || desc.includes('拒绝接收') ||
    desc.includes('用户拒收') || desc.includes('顾客拒收') || desc.includes('客户不要') ||
    desc.includes('客户不需要') || desc.includes('客户不收') || desc.includes('不接受') ||
    desc.includes('已拒收') || desc.includes('已拒签')
  ) {
    return LOGISTICS_STATUS.REJECTED
  }

  // 已签收 - 各种签收场景（包含放前台、快递柜、驿站等实际签收场景）
  // 🔥 注意：此判断已在退回/拒收之后，避免"退回签收"被误判
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
    desc.includes('家人代收') || desc.includes('同事代收') || desc.includes('邻居代收') ||
    // 🔥 新增：客户同意放置场景（实际视为签收）
    desc.includes('客户同意放') || desc.includes('放在前台') || desc.includes('放前台') ||
    desc.includes('放门口') || desc.includes('放门卫') || desc.includes('放物业') ||
    desc.includes('放驿站') || desc.includes('放快递柜') || desc.includes('存放驿站') ||
    desc.includes('存放快递柜') || desc.includes('投放快递柜') || desc.includes('投入快递柜') ||
    desc.includes('已放置') || desc.includes('已存放') || desc.includes('已投放') ||
    desc.includes('放置于') || desc.includes('存放于') || desc.includes('投放于') ||
    // 🔥 新增：电话通知/短信通知取件（已投递到快递柜/驿站）
    desc.includes('请凭取件码') || desc.includes('取件码') || desc.includes('取货码') ||
    desc.includes('请及时取件') || desc.includes('请尽快取件') || desc.includes('请到') ||
    desc.includes('已通知取件') || desc.includes('短信通知取件') || desc.includes('已发送取件') ||
    // 🔥 新增：驿站和网点签收场景
    desc.includes('驿站已签收') || desc.includes('代签收') || desc.includes('网点代收') ||
    desc.includes('超市代收') || desc.includes('便利店代收') || desc.includes('小区代收') ||
    desc.includes('公司前台') || desc.includes('保安代收') || desc.includes('保安室') ||
    desc.includes('传达室') || desc.includes('值班室') || desc.includes('收件箱') ||
    // 🔥 新增：自提点相关
    desc.includes('自提点') || desc.includes('自提成功') || desc.includes('提货成功') ||
    desc.includes('已取走') || desc.includes('取件成功') || desc.includes('领取成功') ||
    // 🔥 新增：各快递公司特殊签收表述
    desc.includes('已妥投') || desc.includes('投妥') || desc.includes('配送完成') ||
    desc.includes('送达完成') || desc.includes('完成配送') || desc.includes('完成送达') ||
    desc.includes('客户已收') || desc.includes('收方已收') || desc.includes('您的快件已') ||
    desc.includes('您的包裹已') || desc.includes('已派送完成') || desc.includes('派件完成') ||
    desc.includes('送货完成') || desc.includes('快件签收') || desc.includes('包裹签收') ||
    desc.includes('寄存成功') || desc.includes('入柜成功') || desc.includes('入站成功') ||
    // 🔥 新增：其他代收场景
    desc.includes('他人代收') || desc.includes('授权代收') || desc.includes('委托代收') ||
    desc.includes('指定地点') || desc.includes('约定地点') || desc.includes('放指定位置') ||
    desc.includes('放约定位置') || desc.includes('放置指定') || desc.includes('按要求放置') ||
    desc.includes('已按要求') || desc.includes('已按客户要求')
  ) {
    return LOGISTICS_STATUS.DELIVERED
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
    desc.includes('派送失败') || desc.includes('配送失败') || desc.includes('多次派送未成功') ||
    // 🔥 新增：派送不成功/派送异常场景
    desc.includes('派送不成功') || desc.includes('派送异常') || desc.includes('配送异常') ||
    desc.includes('派件异常') || desc.includes('投递异常') || desc.includes('送货异常') ||
    desc.includes('无人签收') || desc.includes('无人收件') || desc.includes('无人在家') ||
    desc.includes('不在家') || desc.includes('家中无人') || desc.includes('未能联系') ||
    desc.includes('未能送达') || desc.includes('无法到达') || desc.includes('无法送达') ||
    desc.includes('送达失败') || desc.includes('尝试派送') || desc.includes('再次派送') ||
    desc.includes('改派') || desc.includes('转寄') || desc.includes('改地址') ||
    // 🔥 新增：快递柜/驿站超时未取
    desc.includes('超时未取') || desc.includes('逾期未取') || desc.includes('过期未取') ||
    desc.includes('长时间未取') || desc.includes('已超时') || desc.includes('已逾期') ||
    // 🔥 新增：其他异常场景
    desc.includes('安检扣留') || desc.includes('海关扣留') || desc.includes('扣件') ||
    desc.includes('禁运') || desc.includes('违禁') || desc.includes('限制寄递') ||
    desc.includes('包装破损') || desc.includes('内件破损') || desc.includes('外包装破损') ||
    desc.includes('货损') || desc.includes('货差') || desc.includes('少件') ||
    desc.includes('内件不符') || desc.includes('重量不符') || desc.includes('信息不符') ||
    desc.includes('地址不完整') || desc.includes('地址模糊') || desc.includes('地址不清') ||
    desc.includes('电话空号') || desc.includes('电话停机') || desc.includes('电话关机') ||
    desc.includes('电话错误') || desc.includes('号码有误') || desc.includes('手机关机') ||
    desc.includes('手机停机') || desc.includes('无效电话') || desc.includes('联系方式有误') ||
    desc.includes('天气原因') || desc.includes('不可抗力') || desc.includes('自然灾害')
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
    desc.includes('骑手') || desc.includes('小哥') || desc.includes('师傅') ||
    // 🔥 新增：更多派送中场景
    desc.includes('正在为你') || desc.includes('正在送往') || desc.includes('正在送货') ||
    desc.includes('即将派送') || desc.includes('马上派送') || desc.includes('已出发') ||
    desc.includes('派送途中') || desc.includes('配送途中') || desc.includes('送货途中') ||
    desc.includes('正在配送') || desc.includes('快件正在') || desc.includes('包裹正在') ||
    desc.includes('预计今日') || desc.includes('今日送达') || desc.includes('今天送达') ||
    desc.includes('电话联系') || desc.includes('联系收件人') || desc.includes('联系客户') ||
    desc.includes('正在联系') || desc.includes('派送上门') || desc.includes('上门派送') ||
    desc.includes('配送上门') || desc.includes('送货上门') || desc.includes('出发配送') ||
    desc.includes('已到达网点') || desc.includes('已到达站点') || desc.includes('网点派送')
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
    desc.includes('营业部') || desc.includes('网点') ||
    // 🔥 新增：更多运输中场景
    desc.includes('已离开') || desc.includes('已到达') || desc.includes('已装车') ||
    desc.includes('已卸车') || desc.includes('已分拣') || desc.includes('已出仓') ||
    desc.includes('已入仓') || desc.includes('出仓') || desc.includes('入仓') ||
    desc.includes('中心已发出') || desc.includes('正在运往') || desc.includes('货物在途') ||
    desc.includes('快件在途') || desc.includes('包裹在途') || desc.includes('正在运输') ||
    desc.includes('运输途中') || desc.includes('转运途中') || desc.includes('中转站') ||
    desc.includes('分拣中心') || desc.includes('处理中心') || desc.includes('操作中心') ||
    desc.includes('配送中心') || desc.includes('物流中心') || desc.includes('仓库') ||
    desc.includes('已交航空') || desc.includes('航空运输') || desc.includes('陆运') ||
    desc.includes('铁路运输') || desc.includes('高铁运输') || desc.includes('城际运输') ||
    desc.includes('已封车') || desc.includes('正在出仓') || desc.includes('正在入仓') ||
    desc.includes('等待装车') || desc.includes('等待发出')
  ) {
    return LOGISTICS_STATUS.IN_TRANSIT
  }

  // 已揽收
  if (
    desc.includes('揽收') || desc.includes('收件') || desc.includes('已收') ||
    desc.includes('取件') || desc.includes('揽件') || desc.includes('已揽') ||
    desc.includes('已取') || desc.includes('上门取件') || desc.includes('快递员已取') ||
    desc.includes('寄件成功') || desc.includes('已寄出') || desc.includes('商家已发货') ||
    // 🔥 新增：更多揽收场景
    desc.includes('已收取') || desc.includes('快件已收') || desc.includes('包裹已收') ||
    desc.includes('揽收成功') || desc.includes('取件成功') || desc.includes('已揽件') ||
    desc.includes('快递员上门') || desc.includes('上门收件') || desc.includes('到件扫描') ||
    desc.includes('收入扫描') || desc.includes('寄件人已') || desc.includes('寄方已') ||
    desc.includes('卖家已发货') || desc.includes('商家发货') || desc.includes('已接单')
  ) {
    return LOGISTICS_STATUS.PICKED_UP
  }

  // 待揽收
  if (
    desc.includes('待揽') || desc.includes('等待') || desc.includes('下单') ||
    desc.includes('已下单') || desc.includes('待取件') || desc.includes('待上门') ||
    desc.includes('预约取件') || desc.includes('等待揽收') ||
    // 🔥 新增：更多待揽收场景
    desc.includes('等待上门') || desc.includes('预约上门') || desc.includes('等待取件') ||
    desc.includes('快递员即将') || desc.includes('快递员正在赶来')
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

  // 🔥 优先判断：退回/拒收/异常（必须在签收判断之前）
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
    desc.includes('多次派送未成功') || desc.includes('原路返回') ||
    desc.includes('不要了') || desc.includes('取消订单') ||
    // 🔥 新增：派送不成功场景
    desc.includes('派送不成功') || desc.includes('派送异常') || desc.includes('配送异常') ||
    desc.includes('派件异常') || desc.includes('投递异常') || desc.includes('送货异常') ||
    desc.includes('无人签收') || desc.includes('无人收件') || desc.includes('无人在家') ||
    desc.includes('不在家') || desc.includes('家中无人') || desc.includes('未能联系') ||
    desc.includes('未能送达') || desc.includes('无法到达') || desc.includes('无法送达') ||
    desc.includes('送达失败') || desc.includes('尝试派送') || desc.includes('再次派送') ||
    desc.includes('改派') || desc.includes('转寄') || desc.includes('改地址') ||
    // 🔥 新增：快递柜/驿站超时未取
    desc.includes('超时未取') || desc.includes('逾期未取') || desc.includes('过期未取') ||
    desc.includes('长时间未取') || desc.includes('已超时') || desc.includes('已逾期') ||
    // 🔥 新增：更多异常/拒收场景
    desc.includes('拒绝签收') || desc.includes('拒绝收货') || desc.includes('拒绝接收') ||
    desc.includes('用户拒收') || desc.includes('顾客拒收') || desc.includes('客户不要') ||
    desc.includes('客户不需要') || desc.includes('客户不收') || desc.includes('已拒收') ||
    desc.includes('已拒签') || desc.includes('拦截退回') || desc.includes('逆向物流') ||
    // 🔥 关键：退回签收、退回派送、仓库签收等场景
    desc.includes('退回签收') || desc.includes('退回派送') || desc.includes('仓库签收') ||
    desc.includes('退回仓库') || desc.includes('返回仓库') || desc.includes('退回网点') ||
    desc.includes('退回发件人') || desc.includes('退回寄件人') ||
    desc.includes('退回中') || desc.includes('正在退回') || desc.includes('退件中') ||
    desc.includes('退回途中') || desc.includes('退货物流') || desc.includes('返件') ||
    desc.includes('回寄') || desc.includes('退回发件') || desc.includes('返回发件') ||
    desc.includes('已退回') ||
    // 🔥 新增：各类损坏异常
    desc.includes('安检扣留') || desc.includes('海关扣留') || desc.includes('扣件') ||
    desc.includes('包装破损') || desc.includes('内件破损') || desc.includes('外包装破损') ||
    desc.includes('货损') || desc.includes('货差') || desc.includes('少件') ||
    desc.includes('电话空号') || desc.includes('电话停机') || desc.includes('电话关机') ||
    desc.includes('电话错误') || desc.includes('号码有误') || desc.includes('手机关机') ||
    desc.includes('手机停机') || desc.includes('无效电话') || desc.includes('联系方式有误') ||
    desc.includes('地址不完整') || desc.includes('地址模糊') || desc.includes('地址不清') ||
    desc.includes('天气原因') || desc.includes('不可抗力') || desc.includes('自然灾害')
  ) {
    return 'danger'
  }

  // 🟢 绿色 - 已签收/已送达（各种签收场景，包含放前台/快递柜/驿站等）
  // 🔥 注意：此判断已在退回/拒收/异常之后，避免"退回签收"被误判
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
    desc.includes('邻居代收') ||
    // 🔥 新增：客户同意放置场景
    desc.includes('客户同意放') || desc.includes('放在前台') || desc.includes('放前台') ||
    desc.includes('放门口') || desc.includes('放门卫') || desc.includes('放物业') ||
    desc.includes('放驿站') || desc.includes('放快递柜') || desc.includes('存放驿站') ||
    desc.includes('存放快递柜') || desc.includes('投放快递柜') || desc.includes('投入快递柜') ||
    desc.includes('已放置') || desc.includes('已存放') || desc.includes('已投放') ||
    desc.includes('放置于') || desc.includes('存放于') || desc.includes('投放于') ||
    // 🔥 新增：取件码通知（已投递到快递柜/驿站）
    desc.includes('请凭取件码') || desc.includes('取件码') || desc.includes('取货码') ||
    desc.includes('请及时取件') || desc.includes('请尽快取件') || desc.includes('请到') ||
    desc.includes('已通知取件') || desc.includes('短信通知取件') || desc.includes('已发送取件') ||
    // 🔥 新增：驿站和网点签收
    desc.includes('驿站已签收') || desc.includes('代签收') || desc.includes('网点代收') ||
    desc.includes('超市代收') || desc.includes('便利店代收') || desc.includes('小区代收') ||
    desc.includes('公司前台') || desc.includes('保安代收') || desc.includes('保安室') ||
    desc.includes('传达室') || desc.includes('值班室') || desc.includes('收件箱') ||
    desc.includes('自提点') || desc.includes('自提成功') || desc.includes('提货成功') ||
    desc.includes('已取走') || desc.includes('取件成功') || desc.includes('领取成功') ||
    // 🔥 新增：各快递公司特殊表述
    desc.includes('已妥投') || desc.includes('投妥') || desc.includes('配送完成') ||
    desc.includes('送达完成') || desc.includes('完成配送') || desc.includes('完成送达') ||
    desc.includes('客户已收') || desc.includes('收方已收') || desc.includes('已派送完成') ||
    desc.includes('派件完成') || desc.includes('送货完成') || desc.includes('快件签收') ||
    desc.includes('包裹签收') || desc.includes('寄存成功') || desc.includes('入柜成功') ||
    desc.includes('入站成功') ||
    // 🔥 新增：其他代收场景
    desc.includes('他人代收') || desc.includes('授权代收') || desc.includes('委托代收') ||
    desc.includes('指定地点') || desc.includes('约定地点') || desc.includes('放指定位置') ||
    desc.includes('放约定位置') || desc.includes('已按要求') || desc.includes('已按客户要求')
  ) {
    return 'success'
  }

  // 🟠 橙色 - 派送中
  if (
    desc.includes('派送') || desc.includes('配送') || desc.includes('派件') ||
    desc.includes('正在投递') || desc.includes('快递员') || desc.includes('送货') ||
    desc.includes('正在派送') || desc.includes('派送员') || desc.includes('配送员') ||
    desc.includes('出库派送') || desc.includes('安排派送') || desc.includes('开始派送') ||
    desc.includes('正在为您') || desc.includes('即将送达') || desc.includes('预计今天') ||
    desc.includes('预计送达') || desc.includes('末端派送') || desc.includes('站点派送') ||
    desc.includes('骑手') || desc.includes('小哥') || desc.includes('师傅') ||
    // 🔥 新增：更多派送中场景
    desc.includes('正在为你') || desc.includes('正在送往') || desc.includes('正在送货') ||
    desc.includes('即将派送') || desc.includes('马上派送') || desc.includes('已出发') ||
    desc.includes('派送途中') || desc.includes('配送途中') || desc.includes('送货途中') ||
    desc.includes('正在配送') || desc.includes('快件正在') || desc.includes('包裹正在') ||
    desc.includes('预计今日') || desc.includes('今日送达') || desc.includes('今天送达') ||
    desc.includes('电话联系') || desc.includes('联系收件人') || desc.includes('联系客户') ||
    desc.includes('正在联系') || desc.includes('派送上门') || desc.includes('上门派送') ||
    desc.includes('配送上门') || desc.includes('送货上门') || desc.includes('出发配送') ||
    desc.includes('已到达网点') || desc.includes('已到达站点') || desc.includes('网点派送')
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

// ==================== 智能预计送达计算 ====================

/**
 * 🔥 根据快递公司估算标准配送天数
 * @param companyCode 快递公司代码
 * @returns 标准配送天数
 */
const getStandardDeliveryDays = (companyCode: string): number => {
  const code = (companyCode || '').toUpperCase()
  // 顺丰、京东较快
  if (code === 'SF' || code === 'JD') return 2
  // 圆通、中通、申通、韵达、极兔等主流快递
  if (['YTO', 'ZTO', 'STO', 'YD', 'JTSD', 'YT', 'ZT', 'ST'].includes(code)) return 3
  // EMS、邮政稍慢
  if (['EMS', 'YZBK'].includes(code)) return 4
  // 德邦等重物流
  if (['DBL'].includes(code)) return 4
  // 其他/未知
  return 3
}

/**
 * 🔥 智能计算预计送达日期
 * 根据物流状态、快递公司、发货时间、最新物流动态综合判断
 * @param params 计算参数
 * @returns 预计送达日期字符串（YYYY-MM-DD格式），已签收返回空字符串
 */
export const calculateEstimatedDelivery = (params: {
  logisticsStatus: string
  companyCode?: string
  shipDate?: string
  latestLogisticsInfo?: string
  existingEstimatedDate?: string
}): string => {
  const { logisticsStatus, companyCode = '', shipDate, latestLogisticsInfo = '', existingEstimatedDate } = params

  // 已签收/已退回/拒收/已取消 - 不需要预计送达
  if (['delivered', 'rejected', 'returned', 'cancelled', 'rejected_returned'].includes(logisticsStatus)) {
    return ''
  }

  const now = new Date()
  const shipTime = shipDate ? new Date(shipDate) : null
  const validShipTime = shipTime && !isNaN(shipTime.getTime()) ? shipTime : null

  // 计算已经过去的天数
  const daysSinceShip = validShipTime
    ? Math.floor((now.getTime() - validShipTime.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const standardDays = getStandardDeliveryDays(companyCode)

  let estimatedDaysFromNow = 0

  switch (logisticsStatus) {
    case 'out_for_delivery':
    case 'delivering':
      // 派送中 - 预计当天或次日送达
      estimatedDaysFromNow = 0 // 今天
      // 如果是晚上18点后还在派送，可能明天
      if (now.getHours() >= 18) {
        estimatedDaysFromNow = 1
      }
      break

    case 'in_transit':
      // 运输中 - 根据已运输天数和标准天数估算
      if (validShipTime) {
        const remainingDays = Math.max(standardDays - daysSinceShip, 1)
        estimatedDaysFromNow = Math.min(remainingDays, standardDays)
      } else {
        estimatedDaysFromNow = Math.max(standardDays - 1, 1)
      }
      // 根据物流动态进一步细化
      if (latestLogisticsInfo) {
        const info = latestLogisticsInfo.toLowerCase()
        // 如果已到达目的地城市
        if (info.includes('到达') && (info.includes('市') || info.includes('区'))) {
          estimatedDaysFromNow = Math.min(estimatedDaysFromNow, 1)
        }
        // 如果正在分拣/分拨
        if (info.includes('分拣') || info.includes('分拨')) {
          estimatedDaysFromNow = Math.min(estimatedDaysFromNow, 2)
        }
      }
      break

    case 'picked_up':
      // 已揽收 - 标准天数
      estimatedDaysFromNow = standardDays
      break

    case 'pending':
      // 待揽收 - 标准天数 + 1
      estimatedDaysFromNow = standardDays + 1
      break

    case 'exception':
    case 'package_exception':
      // 异常 - 延长预期，但如果有现有预计日期则使用
      if (existingEstimatedDate) {
        const existDate = new Date(existingEstimatedDate)
        if (!isNaN(existDate.getTime())) {
          // 异常状态下预期延长2天
          const extended = new Date(existDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          return extended.toISOString().split('T')[0]
        }
      }
      estimatedDaysFromNow = validShipTime
        ? Math.max(standardDays - daysSinceShip + 2, 2)
        : standardDays + 2
      break

    default:
      // shipped 或其他 - 使用标准天数
      if (validShipTime) {
        const remainingDays = Math.max(standardDays - daysSinceShip, 1)
        estimatedDaysFromNow = remainingDays
      } else {
        estimatedDaysFromNow = standardDays
      }
      break
  }

  // 计算预计到达日期
  const estimatedDate = new Date(now.getTime() + estimatedDaysFromNow * 24 * 60 * 60 * 1000)
  return estimatedDate.toISOString().split('T')[0]
}

/**
 * 🔥 格式化预计送达日期为友好文本
 * @param dateStr 日期字符串
 * @param logisticsStatus 物流状态（可选）
 * @returns 友好文本
 */
export const formatEstimatedDeliveryText = (dateStr: string, logisticsStatus?: string): string => {
  // 已完结状态
  if (logisticsStatus === 'delivered') return '已签收'
  if (logisticsStatus === 'rejected' || logisticsStatus === 'rejected_returned') return '已拒收'
  if (logisticsStatus === 'returned') return '已退回'
  if (logisticsStatus === 'cancelled') return '已取消'

  if (!dateStr) return '-'

  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const now = new Date()
    // 只比较日期部分
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((targetStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return `超期${Math.abs(diffDays)}天`
    } else if (diffDays === 0) {
      return '预计今天'
    } else if (diffDays === 1) {
      return '预计明天'
    } else if (diffDays === 2) {
      return '预计后天'
    } else if (diffDays <= 7) {
      return `预计${diffDays}天后`
    } else {
      return `${date.getMonth() + 1}/${date.getDate()}`
    }
  } catch {
    return dateStr
  }
}

