/**
 * 企微管理示例模式 Composable
 *
 * 当租户未授权任何企业微信配置时，所有企微页面展示示例数据（带"示例"标识）。
 * 授权后自动切换为真实数据，示例不可见。
 */
import { ref, computed } from 'vue'
import { getWecomConfigs } from '@/api/wecom'

// ==================== 全局共享状态（跨组件） ====================

const _configList = ref<any[]>([])
const _loaded = ref(false)
const _loading = ref(false)

/** 拉取配置列表（带缓存，首次自动拉取） */
export async function loadWecomConfigs(force = false) {
  if (_loaded.value && !force) return _configList.value
  if (_loading.value) return _configList.value
  _loading.value = true
  try {
    const res = await getWecomConfigs()
    _configList.value = Array.isArray(res) ? res : []
  } catch {
    _configList.value = []
  } finally {
    _loaded.value = true
    _loading.value = false
  }
  return _configList.value
}

/** 强制刷新配置 */
export function refreshWecomConfigs() {
  return loadWecomConfigs(true)
}

// ==================== Composable ====================

export function useWecomDemo() {
  /** 真实配置列表 */
  const configList = computed(() => _configList.value)

  /** 是否为示例模式（无任何已绑定配置） */
  const isDemoMode = computed(() => _loaded.value && _configList.value.length === 0)

  /** 是否已加载 */
  const configLoaded = computed(() => _loaded.value)

  return {
    configList,
    isDemoMode,
    configLoaded,
    loadWecomConfigs,
    refreshWecomConfigs,
  }
}

// ==================== 各模块示例数据 ====================

/** 企微配置 示例 */
export const DEMO_CONFIGS = [
  {
    id: -1, name: '云客科技', corpId: 'ww8a3f****d6e5', agentId: 1000002,
    authType: 'third_party', connectionStatus: 'connected', isEnabled: true,
    bindOperator: '张经理', bindTime: '2026-03-01T10:00:00Z', _demo: true,
  },
  {
    id: -2, name: '分公司-上海', corpId: 'ww91b2****f7c8', agentId: 1000005,
    authType: 'self_built', connectionStatus: 'connected', isEnabled: true,
    bindOperator: '李总', bindTime: '2026-03-15T14:30:00Z', _demo: true,
  },
]

/** 成员绑定 示例 */
export const DEMO_BINDINGS = [
  { id: -1, wecomUserName: '张三', wecomUserId: 'zhangsan', wecomAvatar: '', crmUserName: '张三(CRM)', crmUserId: 'u001', isEnabled: true, bindOperator: '手动', createdAt: '2026-03-02', _demo: true },
  { id: -2, wecomUserName: '李四', wecomUserId: 'lisi', wecomAvatar: '', crmUserName: '李四(CRM)', crmUserId: 'u002', isEnabled: true, bindOperator: '侧边栏', createdAt: '2026-03-05', _demo: true },
  { id: -3, wecomUserName: '王五', wecomUserId: 'wangwu', wecomAvatar: '', crmUserName: '王五(CRM)', crmUserId: 'u003', isEnabled: false, bindOperator: '手动', createdAt: '2026-03-10', _demo: true },
]

/** 企业客户 示例 */
export const DEMO_CUSTOMERS = [
  { id: -1, name: '陈女士', externalUserId: 'ext_chen', followUserName: '张三', status: 'normal', tagNames: 'VIP,意向客户', addTime: '2026-03-10', _demo: true },
  { id: -2, name: '刘先生', externalUserId: 'ext_liu', followUserName: '李四', status: 'normal', tagNames: '新客户', addTime: '2026-03-12', _demo: true },
  { id: -3, name: '赵经理', externalUserId: 'ext_zhao', followUserName: '张三', status: 'deleted', tagNames: '企业客户,已成交', addTime: '2026-02-20', _demo: true },
  { id: -4, name: '孙总', externalUserId: 'ext_sun', followUserName: '王五', status: 'normal', tagNames: '大客户,重点跟进', addTime: '2026-03-18', _demo: true },
]

/** 客户统计 示例 */
export const DEMO_CUSTOMER_STATS = { todayAdd: 12, totalAdd: 386, deleted: 23, dealt: 158 }

/** 客户群 示例 */
export const DEMO_GROUPS = [
  { id: -1, chatId: 'wr_demo_1', name: 'VIP客户交流群', ownerUserName: '张三', memberCount: 128, todayMsgCount: 45, status: 'normal', createTime: '2026-02-01', _demo: true },
  { id: -2, chatId: 'wr_demo_2', name: '新品发布讨论群', ownerUserName: '李四', memberCount: 67, todayMsgCount: 23, status: 'normal', createTime: '2026-03-01', _demo: true },
  { id: -3, chatId: 'wr_demo_3', name: '售后服务群', ownerUserName: '王五', memberCount: 42, todayMsgCount: 8, status: 'normal', createTime: '2026-01-15', _demo: true },
]

/** 客户群统计 示例 */
export const DEMO_GROUP_STATS = { totalGroups: 15, activeGroups: 12, totalMembers: 856, avgMembers: 57 }

/** 获客链接 示例 */
export const DEMO_ACQUISITION_LINKS = [
  { id: -1, linkName: '官网引流链接', linkUrl: 'https://work.weixin.qq.com/ca/demo1', userIds: '["zhangsan","lisi"]', clickCount: 1280, addCount: 356, lossCount: 12, isEnabled: true, createdAt: '2026-02-01', _demo: true },
  { id: -2, linkName: '活动推广码', linkUrl: 'https://work.weixin.qq.com/ca/demo2', userIds: '["wangwu"]', clickCount: 560, addCount: 189, lossCount: 5, isEnabled: true, createdAt: '2026-03-10', _demo: true },
]

/** 获客使用量 示例 */
export const DEMO_ACQUISITION_USAGE = { totalLinks: 8, activeLinks: 6, totalClicks: 5800, totalAdds: 1230, quotaLimit: 5000, usagePercent: 24, warningLevel: 'normal' as const }

/** 微信客服 示例 */
export const DEMO_SERVICE_ACCOUNTS = [
  { id: -1, name: '售前咨询', openKfId: 'wkf_demo_1', servicerUserIds: '["zhangsan"]', todayServiceCount: 18, totalServiceCount: 560, isEnabled: true, serviceTimeStart: '09:00', serviceTimeEnd: '18:00', _demo: true },
  { id: -2, name: '售后服务', openKfId: 'wkf_demo_2', servicerUserIds: '["lisi","wangwu"]', todayServiceCount: 7, totalServiceCount: 320, isEnabled: true, serviceTimeStart: null, serviceTimeEnd: null, _demo: true },
]

/** 对外收款 示例 */
export const DEMO_PAYMENTS = [
  { id: -1, paymentNo: 'PAY202603150001', amount: 1280.00, userName: '张三', payerName: '陈女士', status: 'paid', payTime: '2026-03-15T14:20:00Z', remark: '产品A采购款', _demo: true },
  { id: -2, paymentNo: 'PAY202603180002', amount: 3600.00, userName: '李四', payerName: '孙总', status: 'paid', payTime: '2026-03-18T09:45:00Z', remark: '年度服务费', _demo: true },
  { id: -3, paymentNo: 'PAY202603200003', amount: 580.00, userName: '王五', payerName: '刘先生', status: 'pending', payTime: null, remark: '样品费用', _demo: true },
]

/** 通讯录 示例 */
export const DEMO_DEPARTMENTS = [
  { id: 1, name: '云客科技', parentId: 0, _memberCount: 28, children: [
    { id: 2, name: '销售部', parentId: 1, _memberCount: 12, children: [] },
    { id: 3, name: '客服部', parentId: 1, _memberCount: 8, children: [] },
    { id: 4, name: '技术部', parentId: 1, _memberCount: 8, children: [] },
  ]},
]

export const DEMO_MEMBERS: Record<number, any[]> = {
  1: [
    { userid: 'zhangsan', name: '张三', department: [2], position: '销售主管', mobile: '138****1234', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
    { userid: 'lisi', name: '李四', department: [2], position: '销售顾问', mobile: '139****5678', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
    { userid: 'wangwu', name: '王五', department: [3], position: '客服组长', mobile: '137****9012', avatar: '', status: 1, accountStatus: 'abnormal', _demo: true },
    { userid: 'zhaoliu', name: '赵六', department: [4], position: '技术支持', mobile: '136****3456', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
  ],
  2: [
    { userid: 'zhangsan', name: '张三', department: [2], position: '销售主管', mobile: '138****1234', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
    { userid: 'lisi', name: '李四', department: [2], position: '销售顾问', mobile: '139****5678', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
  ],
  3: [
    { userid: 'wangwu', name: '王五', department: [3], position: '客服组长', mobile: '137****9012', avatar: '', status: 1, accountStatus: 'abnormal', _demo: true },
  ],
  4: [
    { userid: 'zhaoliu', name: '赵六', department: [4], position: '技术支持', mobile: '136****3456', avatar: '', status: 1, accountStatus: 'normal', _demo: true },
  ],
}

/** 所有demo成员（扁平列表） */
export const DEMO_MEMBERS_ALL = DEMO_MEMBERS[1]

/** 企微通讯录用户列表（供下拉选择） */
export const DEMO_WECOM_USERS = DEMO_MEMBERS_ALL.map(m => ({ userid: m.userid, name: m.name, avatar: m.avatar }))

/** 客户详情 示例 (按客户id索引) */
export const DEMO_CUSTOMER_DETAIL: Record<number, any> = {
  [-1]: {
    id: -1, name: '陈女士', externalUserId: 'ext_chen', followUserName: '张三',
    status: 'normal', tagNames: 'VIP,意向客户', addTime: '2026-03-10',
    company: '深圳某科技公司', position: '采购经理', phone: '138****8888',
    remark: '重点意向客户，需求明确', followHistory: [
      { time: '2026-03-15', content: '电话沟通产品方案', operator: '张三' },
      { time: '2026-03-12', content: '微信初次接触', operator: '张三' },
    ], _demo: true
  },
  [-2]: {
    id: -2, name: '刘先生', externalUserId: 'ext_liu', followUserName: '李四',
    status: 'normal', tagNames: '新客户', addTime: '2026-03-12',
    company: '', position: '', phone: '139****6666',
    remark: '朋友介绍', followHistory: [], _demo: true
  },
}

/** CRM客户选项（供关联下拉） */
export const DEMO_CRM_CUSTOMER_OPTIONS = [
  { id: 'crm_001', name: '陈女士-深圳某科技', phone: '138****8888' },
  { id: 'crm_002', name: '刘先生', phone: '139****6666' },
  { id: 'crm_003', name: '赵经理-广州贸易', phone: '137****5555' },
]

/** 群成员 示例 */
export const DEMO_GROUP_MEMBERS = [
  { id: -1, groupId: -1, name: '张三', userid: 'zhangsan', type: 1, joinTime: '2026-02-01', _demo: true },
  { id: -2, groupId: -1, name: '陈女士', userid: 'ext_chen', type: 2, joinTime: '2026-02-05', _demo: true },
  { id: -3, groupId: -1, name: '刘先生', userid: 'ext_liu', type: 2, joinTime: '2026-02-10', _demo: true },
]

/** 侧边栏应用 示例 */
export const DEMO_SIDEBAR_APPS = [
  { id: -1, name: '客户画像', appId: 'sidebar_demo_1', iconUrl: '', isEnabled: true, sortOrder: 1, pageUrl: '/wecom-sidebar', _demo: true },
  { id: -2, name: '商品推荐', appId: 'sidebar_demo_2', iconUrl: '', isEnabled: true, sortOrder: 2, pageUrl: '/wecom-sidebar', _demo: true },
]

/** 侧边栏统计 示例 */
export const DEMO_SIDEBAR_STATS = { totalApps: 2, enabledApps: 2, todayVisits: 56, totalVisits: 1280, activeApps: 2, totalUseCount: 56, totalUserCount: 1280 }

/** 客服会话 示例 */
export const DEMO_KF_SESSIONS = [
  { id: -1, openKfId: 'wkf_demo_1', externalUserId: 'ext_chen', customerName: '陈女士', servicerUserId: 'zhangsan', servicerName: '张三', sessionStatus: 'open', status: 'open', startTime: '2026-04-15T10:30:00Z', lastMsgTime: '2026-04-15T10:45:00Z', lastMsgContent: '好的，我了解了', msgCount: 8, firstResponseTime: 12, avgResponseTime: 25, satisfaction: null, sessionStartTime: '2026-04-15T10:30:00Z', sessionEndTime: null, _demo: true },
  { id: -2, openKfId: 'wkf_demo_2', externalUserId: 'ext_liu', customerName: '刘先生', servicerUserId: 'lisi', servicerName: '李四', sessionStatus: 'closed', status: 'closed', startTime: '2026-04-14T14:00:00Z', lastMsgTime: '2026-04-14T14:30:00Z', lastMsgContent: '谢谢帮助', msgCount: 12, firstResponseTime: 8, avgResponseTime: 18, satisfaction: 5, sessionStartTime: '2026-04-14T14:00:00Z', sessionEndTime: '2026-04-14T14:30:00Z', _demo: true },
  { id: -3, openKfId: 'wkf_demo_1', externalUserId: 'ext_wang', customerName: '王经理', servicerUserId: 'wangwu', servicerName: '王五', sessionStatus: 'closed', status: 'closed', startTime: '2026-04-13T09:00:00Z', lastMsgTime: '2026-04-13T09:45:00Z', lastMsgContent: '产品很好', msgCount: 15, firstResponseTime: 5, avgResponseTime: 15, satisfaction: 4, sessionStartTime: '2026-04-13T09:00:00Z', sessionEndTime: '2026-04-13T09:45:00Z', _demo: true },
]

/** 客服统计 示例 */
export const DEMO_KF_STATS = {
  totalSessions: 156, closedSessions: 142, openSessions: 14, timeoutSessions: 3, timeoutRate: 1.9,
  totalMsgCount: 2480, avgFirstResponse: 15, avgResponse: 28, avgSatisfaction: 4.6,
  satisfactionDistribution: { excellent: 68, good: 45, normal: 12, bad: 3 },
  servicerStats: [
    { userId: 'zhangsan', name: '张三', count: 62, avgResponse: 12, avgSatisfaction: 4.8, timeoutCount: 0 },
    { userId: 'lisi', name: '李四', count: 48, avgResponse: 22, avgSatisfaction: 4.5, timeoutCount: 1 },
    { userId: 'wangwu', name: '王五', count: 35, avgResponse: 35, avgSatisfaction: 4.3, timeoutCount: 2 },
    { userId: 'zhaoliu', name: '赵六', count: 11, avgResponse: 18, avgSatisfaction: 4.7, timeoutCount: 0 },
  ]
}

/** 快捷回复 示例 */
export const DEMO_QUICK_REPLIES = [
  { id: -1, title: '欢迎语', content: '您好，很高兴为您服务！请问有什么可以帮助您的？', category: '常用', _demo: true },
  { id: -2, title: '工作时间', content: '我们的工作时间是周一至周五 9:00-18:00，感谢您的理解。', category: '常用', _demo: true },
]

/** 获客助手权重成员 示例 */
export const DEMO_WEIGHT_MEMBERS = [
  { userId: 'zhangsan', userName: '张三', weight: 5, todayAssigned: 12, _demo: true },
  { userId: 'lisi', userName: '李四', weight: 3, todayAssigned: 8, _demo: true },
  { userId: 'wangwu', userName: '王五', weight: 2, todayAssigned: 5, _demo: true },
]
