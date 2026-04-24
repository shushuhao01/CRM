/**
 * 企微管理模块 — 前端共享类型定义
 */

/** 企微配置 */
export interface WecomConfig {
  id: number
  name: string
  corpId: string
  isEnabled: boolean
  [key: string]: any
}

/** 聊天记录 */
export interface ChatRecord {
  id: number
  fromUserId: string
  fromUserName?: string
  toUserIds: string | string[]
  roomId?: string
  msgType: string
  content: any
  msgTime: number | string
  mediaUrl?: string
  fileName?: string
  isSensitive?: boolean
  auditRemark?: string
}

/** 会话（左侧面板分组项） */
export interface Conversation {
  fromUserId: string
  fromUserName?: string
  toUserIds: string | string[]
  roomId?: string
  lastContent?: any
  lastMsgType?: string
  lastMsgTime?: number | string
  msgCount?: number
}

/** 会话消息（气泡视图单条） */
export interface ConvMessage {
  id: number
  fromUserId: string
  fromUserName?: string
  toUserIds?: string | string[]
  msgType: string
  content: any
  msgTime: number | string
  mediaUrl?: string
  fileName?: string
  isSensitive?: boolean
  auditRemark?: string
}

/** VAS 阶梯定价项 */
export interface TierPricing {
  min: number
  max: number
  price: number
}

/** VAS 定价信息 */
export interface VasPricing {
  tierPricing?: TierPricing[]
  defaultPrice?: number
}

/** 购买结果 */
export interface PurchaseResult {
  orderNo: string
  amount: number
  packageName: string
  qrCode?: string
}

/** 质检表单 */
export interface AuditForm {
  id: number
  isSensitive: boolean
  auditRemark: string
}

/** 会话存档授权状态 */
export interface ArchiveStatus {
  authorized: boolean
  enabled: boolean
  message?: string
}

/** 敏感词扫描结果 */
export interface ScanResult {
  scanned: number
  marked: number
}

/** 全文搜索结果项 */
export interface SearchResultItem {
  id: number
  fromUserId: string
  fromUserName?: string
  contentPreview: string
  highlight: string
  msgType: string
  msgTime?: number | string
}

/** 预设套餐包 */
export interface PresetPackage {
  users: number
  label: string
  recommended?: boolean
}

// ==================== V2.0 新增类型定义 ====================

/** 客户群 */
export interface WecomCustomerGroupItem {
  id: number
  chatId: string
  name: string
  ownerUserId: string
  ownerUserName: string
  memberCount: number
  todayMsgCount: number
  notice: string
  createTime: string
  status: string
}

/** 敏感词 */
export interface SensitiveWord {
  id: number
  word: string
  groupName: string
  level: string
  isEnabled: boolean
  createdBy?: string
}

/** 敏感词命中记录 */
export interface SensitiveHit {
  id: number
  word: string
  context: string
  fromUserId: string
  fromUserName?: string
  status: string
  createdAt: string
}

/** 质检规则 */
export interface QualityRule {
  id: number
  name: string
  ruleType: string
  conditions: any
  scoreValue: number
  applyScope: any
  isEnabled: boolean
}

/** 质检记录 */
export interface QualityInspection {
  id: number
  sessionKey: string
  fromUserId: string
  fromUserName?: string
  toUserId: string
  toUserName?: string
  messageCount: number
  status: string
  score?: number
  remark?: string
  inspectedAt?: string
}

/** 存档设置 */
export interface ArchiveSettings {
  visibility: 'self' | 'department' | 'all'
  maxUsers: number
  usedUsers: number
  expireDate?: string
  status: string
  fetchInterval: number
  fetchMode: string
  retentionDays: number
  mediaStorage: string
  autoInspect: boolean
}

/** 存档生效成员 */
export interface ArchiveMember {
  id: number
  wecomUserId: string
  wecomUserName: string
  crmUserId?: string
  isEnabled: boolean
}

/** 席位信息 */
export interface SeatInfo {
  maxUsers: number
  usedUsers: number
  members: ArchiveMember[]
  expireDate?: string
}

/** 企微部门树节点 */
export interface WecomDeptNode {
  id: number
  name: string
  parentId: number
  children?: WecomDeptNode[]
  members?: WecomDeptMember[]
}

/** 企微部门成员(含绑定状态) */
export interface WecomDeptMember {
  wecomUserId: string
  name: string
  crmUserId?: string
  crmUserName?: string
  isBound: boolean
  isSelected: boolean
}

/** 当前套餐信息 */
export interface CurrentPlan {
  maxUsers: number
  usedUsers: number
  expireDate: string
  status: string
  daysLeft?: number
  canRenew: boolean
  canUpgrade: boolean
}

/** VAS定价信息(V2.0增强) */
export interface VasPricingV2 extends VasPricing {
  presetPackages?: PresetPackage[]
  currentPlan?: CurrentPlan
  renewalDiscount?: number
  description?: string
  wecomFeeNote?: string
}

/** 企微客户增强(含统计) */
export interface WecomCustomerEnhanced {
  id: number
  name: string
  externalUserId: string
  followUserName?: string
  remark?: string
  tagIds?: string
  tagNames?: string
  status: string
  msgSentCount: number
  msgRecvCount: number
  lastMsgTime?: number
  activeDays7d: number
  crmCustomerId?: string
}

/** CRM客户企微信息 */
export interface CustomerWecomInfo {
  wecomExternalUserid?: string
  boundWecomAccounts: number
  tags: string[]
  lastChatSummary?: string
  followUserName?: string
}

/** 侧边栏绑定信息 */
export interface SidebarBindingInfo {
  crmUserName: string
  tenantCode: string
  boundAt: string
}

/** 侧边栏收货信息(脱敏) */
export interface ShippingAddress {
  name: string
  phone: string
  address: string
}

/** 侧边栏物流信息 */
export interface LogisticsInfo {
  trackingNo: string
  carrier: string
  status: string
  estimatedDelivery?: string
}

/** 侧边栏售后记录 */
export interface AfterSaleRecord {
  id: number
  type: string
  status: string
  reason: string
  amount: number
  createdAt: string
}

// ==================== Phase 5: 获客 + 客服增强 类型定义 ====================

/** 获客链接权重配置项 */
export interface AcquisitionWeightItem {
  userId: string
  weight: number
}

/** 获客渠道统计项 */
export interface ChannelStatItem {
  linkId: number
  linkName: string
  linkUrl: string
  clickCount: number
  addCount: number
  lossCount: number
  conversionRate: number
  retentionRate: number
  dailyStats: Array<{ date: string; click: number; add: number; loss: number }>
  createdAt: string
}

/** 获客渠道统计汇总 */
export interface ChannelStatSummary {
  totalLinks: number
  totalClicks: number
  totalAdds: number
  totalLoss: number
  avgConversionRate: number
}

/** 获客使用量 */
export interface AcquisitionUsage {
  totalLinks: number
  activeLinks: number
  totalClicks: number
  totalAdds: number
  quotaLimit: number
  usagePercent: number
  warningLevel: 'normal' | 'warning' | 'danger'
}

/** 客服会话记录 */
export interface KfSession {
  id: number
  wecomConfigId: number
  openKfId: string
  externalUserid: string
  customerName: string
  servicerUserid: string
  servicerName: string
  sessionStatus: 'open' | 'closed' | 'timeout'
  msgCount: number
  firstResponseTime: number
  avgResponseTime: number
  satisfaction: number
  lastMsgContent: string
  lastMsgTime: string
  sessionStartTime: string
  sessionEndTime: string
}

/** 客服统计数据 */
export interface KfStats {
  totalSessions: number
  closedSessions: number
  openSessions: number
  totalMsgCount: number
  avgFirstResponse: number
  avgResponse: number
  avgSatisfaction: number
  satisfactionDistribution: {
    excellent: number
    good: number
    normal: number
    bad: number
  }
  servicerStats: Array<{
    userId: string
    name: string
    count: number
    avgResponse: number
  }>
}

/** 快捷回复 */
export interface QuickReply {
  id: number
  category: 'enterprise' | 'personal'
  groupName: string
  title: string
  content: string
  shortcut: string
  useCount: number
  isEnabled: boolean
  sortOrder: number
  createdBy: string
  createdAt: string
}

/** 快捷回复分组 */
export interface QuickReplyGroup {
  groupName: string
  items: QuickReply[]
}

// ==================== V4.0 Phase 3: 获客助手增强 + 活码管理 ====================

/** 获客链接详情-添加客户项 */
export interface AcquisitionLinkCustomer {
  id: number
  name: string
  avatar?: string
  addTime: string
  talkStatus: 'not_talked' | 'talked' | 'lost'
  talkCount: number
  talkTime?: string
  followUser: string
}

/** 转化漏斗级别 */
export interface FunnelLevel {
  name: string
  count: number
  percent: number
  lossCount: number
}

/** 留存矩阵行 */
export interface RetentionRow {
  date: string
  addCount: number
  day1: number
  day3: number
  day7: number
  day14: number
  day30: number
}

/** 成员排行项 */
export interface MemberRankItem {
  rank: number
  userId: string
  userName: string
  department: string
  addCount: number
  talkRate: number
  effectiveCount: number
  conversionRate: number
  avgResponseMinutes: number
  linkCount: number
  status: 'normal' | 'abnormal'
}

/** 活码类型 */
export interface ContactWayItem {
  id: number
  name: string
  weightMode: 'single' | 'round_robin' | 'weighted'
  userIds: string
  state: string
  qrCode: string
  isEnabled: boolean
  totalAddCount: number
  totalLossCount: number
  todayCount?: number
  createdAt: string
}

/** 创建获客链接向导表单 */
export interface AcquisitionLinkWizardForm {
  linkName: string
  state: string
  autoGroupEnabled: boolean
  groupTemplateId?: number
  assignMode: 'weighted' | 'online_random' | 'priority'
  userIds: string[]
  userWeights: Array<{ userId: string; weight: number }>
  welcomeEnabled: boolean
  welcomeMsg: string
  welcomeMediaType: 'none' | 'image' | 'link' | 'miniprogram'
  welcomeMediaContent: any
  autoTagEnabled: boolean
  autoTags: string[]
}

/** 智能上下线规则 */
export interface SmartOnlineRule {
  dailyLimitEnabled: boolean
  dailyLimitPerUser: number
  dailyLimitAction: 'offline' | 'reduce_weight'
  workTimeEnabled: boolean
  workTimeStart: string
  workTimeEnd: string
  workDays: number[]
  slowReplyEnabled: boolean
  slowReplyMinutes: number
  slowReplyAction: 'offline' | 'reduce_weight'
  lossRateEnabled: boolean
  lossRateThreshold: number
  nextDayAutoOnline: boolean
  nextDayOnlineTime: string
  nextDayExcludeManual: boolean
  nextDayExcludeLossRate: boolean
  deptQuotaEnabled: boolean
  deptQuotas: Array<{ deptName: string; quota: number }>
}

