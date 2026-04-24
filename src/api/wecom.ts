/**
 * 企业微信管理 API
 */
import request from '@/utils/request'

// ==================== 企微配置 ====================

/** 获取企微配置列表（静默错误，由组件自行处理） */
export const getWecomConfigs = () => {
  return request.get('/wecom/configs', { showError: false } as any)
}

/** 获取单个企微配置 */
export const getWecomConfig = (id: number) => {
  return request.get(`/wecom/configs/${id}`)
}

/** 创建企微配置 */
export const createWecomConfig = (data: {
  name: string
  corpId: string
  corpSecret: string
  agentId?: number
  callbackToken?: string
  encodingAesKey?: string
  callbackUrl?: string
  contactSecret?: string
  externalContactSecret?: string
  chatArchiveSecret?: string
  chatArchivePrivateKey?: string
  remark?: string
}) => {
  return request.post('/wecom/configs', data)
}

/** 更新企微配置 */
export const updateWecomConfig = (id: number, data: {
  name?: string
  corpSecret?: string
  agentId?: number
  isEnabled?: boolean
  callbackToken?: string
  encodingAesKey?: string
  callbackUrl?: string
  contactSecret?: string
  externalContactSecret?: string
  chatArchiveSecret?: string
  chatArchivePrivateKey?: string
  remark?: string
}) => {
  return request.put(`/wecom/configs/${id}`, data)
}

/** 删除企微配置 */
export const deleteWecomConfig = (id: number) => {
  return request.delete(`/wecom/configs/${id}`)
}

/** 测试企微配置连接 */
export const testWecomConnection = (id: number) => {
  return request.post(`/wecom/configs/${id}/test`)
}

// ==================== 企微联动 ====================

/** 获取企微通讯录部门列表 */
export const getWecomDepartments = (configId: number) => {
  return request.get(`/wecom/configs/${configId}/departments`)
}

/** 同步企微通讯录（从企业微信API拉取最新部门和成员数据） */
export const syncWecomContacts = (configId: number) => {
  return request.post(`/wecom/configs/${configId}/sync-contacts`)
}

/** 获取企微通讯录成员列表 */
export const getWecomUsers = (configId: number, departmentId?: number, fetchChild?: boolean) => {
  return request.get(`/wecom/configs/${configId}/users`, {
    params: { departmentId, fetchChild }
  })
}

/** 获取成员绑定列表 */
export const getWecomBindings = (params?: { configId?: number; crmUserId?: string }) => {
  return request.get('/wecom/bindings', { params, showError: false } as any)
}

/** 创建成员绑定 */
export const createWecomBinding = (data: {
  wecomConfigId: number
  wecomUserId: string
  wecomUserName?: string
  wecomAvatar?: string
  wecomDepartmentIds?: string
  crmUserId: string
  crmUserName?: string
}) => {
  return request.post('/wecom/bindings', data)
}

/** 解除成员绑定 */
export const deleteWecomBinding = (id: number) => {
  return request.delete(`/wecom/bindings/${id}`)
}

/** 批量绑定成员 */
export const batchCreateWecomBindings = (wecomConfigId: number, bindings: Array<{
  wecomUserId: string
  wecomUserName?: string
  wecomAvatar?: string
  crmUserId: string
  crmUserName?: string
}>) => {
  return request.post('/wecom/bindings/batch', { wecomConfigId, bindings })
}

// ==================== 企业客户 ====================

/** 获取企业客户列表 */
export const getWecomCustomers = (params?: {
  configId?: number
  status?: string
  followUserId?: string
  keyword?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/customers', { params, showError: false } as any)
}

/** 获取客户统计数据（支持日期范围筛选） */
export const getWecomCustomerStats = (params?: { configId?: number; startDate?: string; endDate?: string }) => {
  return request.get('/wecom/customers/stats', { params, showError: false } as any)
}

/** 同步企微客户数据 */
export const syncWecomCustomers = (configId: number) => {
  return request.post('/wecom/customers/sync', { configId })
}

/** 关联企微客户到CRM客户 */
export const linkWecomCustomerToCrm = (wecomCustomerId: number, crmCustomerId: string) => {
  return request.put(`/wecom/customers/${wecomCustomerId}/link-crm`, { crmCustomerId })
}

/** 解除企微客户与CRM客户的关联 */
export const unlinkWecomCustomerFromCrm = (wecomCustomerId: number) => {
  return request.put(`/wecom/customers/${wecomCustomerId}/unlink-crm`)
}

/** 搜索CRM客户（用于关联选择） */
export const searchCrmCustomersForLink = (keyword: string) => {
  return request.get('/wecom/crm-customers/search', { params: { keyword }, showError: false } as any)
}

// ==================== 获客助手 ====================

/** 获取获客链接列表 */
export const getAcquisitionLinks = (configId?: number) => {
  return request.get('/wecom/acquisition-links', { params: { configId }, showError: false } as any)
}

/** 创建获客链接 */
export const createAcquisitionLink = (data: {
  wecomConfigId: number
  linkName: string
  userIds: string[]
  departmentIds?: number[]
  welcomeMsg?: string
  tagIds?: string[]
}) => {
  return request.post('/wecom/acquisition-links', data)
}

/** 删除获客链接 */
export const deleteAcquisitionLink = (id: number) => {
  return request.delete(`/wecom/acquisition-links/${id}`)
}

/** 更新获客链接 */
export const updateAcquisitionLink = (id: number, data: { linkName?: string; isEnabled?: boolean; welcomeMsg?: string }) => {
  return request.put(`/wecom/acquisition-links/${id}`, data)
}

// ==================== 微信客服 ====================

/** 获取客服账号列表 */
export const getServiceAccounts = (configId?: number) => {
  return request.get('/wecom/service-accounts', { params: { configId }, showError: false } as any)
}

/** 创建客服账号 */
export const createServiceAccount = (data: {
  wecomConfigId: number
  name: string
  servicerUserIds?: string[]
  welcomeMsg?: string
}) => {
  return request.post('/wecom/service-accounts', data)
}

/** 删除客服账号 */
export const deleteServiceAccount = (id: number) => {
  return request.delete(`/wecom/service-accounts/${id}`)
}

/** 更新客服账号 */
export const updateServiceAccount = (id: number, data: { name?: string; isEnabled?: boolean; welcomeMsg?: string; servicerUserIds?: string[]; serviceTimeStart?: string | null; serviceTimeEnd?: string | null }) => {
  return request.put(`/wecom/service-accounts/${id}`, data)
}

/** 从企微API同步客服账号列表 */
export const syncServiceAccountsFromApi = (configId: number) => {
  return request.post('/wecom/service-accounts/sync', { configId })
}

// ==================== 敏感词管理 ====================

/** 获取敏感词列表 */
export const getSensitiveWords = () => {
  return request.get('/wecom/sensitive-words', { showError: false } as any)
}

/** 保存敏感词列表 */
export const saveSensitiveWords = (words: string[]) => {
  return request.put('/wecom/sensitive-words', { words })
}

/** 使用敏感词扫描聊天记录 */
export const scanChatRecordsForSensitiveWords = (configId?: number) => {
  return request.post('/wecom/sensitive-words/scan', { configId })
}

/** 获取敏感词触发统计（分页） */
export const getSensitiveWordTriggerStats = (params?: {
  configId?: number
  dateRange?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/sensitive-words/trigger-stats', { params, showError: false } as any)
}

// ==================== 对外收款 ====================

/** 获取收款记录列表 */
export const getWecomPayments = (params?: {
  configId?: number; userId?: string; departmentId?: number; status?: string;
  keyword?: string; customerName?: string; userName?: string;
  startDate?: string; endDate?: string; page?: number; pageSize?: number
}) => {
  return request.get('/wecom/payments', { params, showError: false } as any)
}

/** 同步收款记录 */
export const syncWecomPayments = (data: { configId: number; startDate?: string; endDate?: string }) => {
  return request.post('/wecom/payments/sync', data)
}

/** 收款统计 */
export const getWecomPaymentStats = (params?: {
  configId?: number; startDate?: string; endDate?: string
}) => {
  return request.get('/wecom/payments/stats', { params, showError: false } as any)
}

/** 获取退款记录列表 */
export const getWecomPaymentRefunds = (params?: {
  keyword?: string; status?: string; operatorName?: string;
  startDate?: string; endDate?: string; page?: number; pageSize?: number
}) => {
  return request.get('/wecom/payments/refunds', { params, showError: false } as any)
}

/** 发起退款 */
export const createWecomPaymentRefund = (data: {
  originalPaymentNo: string; refundAmount: number; reason?: string
}) => {
  return request.post('/wecom/payments/refunds', data)
}

/** 审批退款 */
export const approveWecomPaymentRefund = (id: number, data: { action: 'approve' | 'reject'; rejectReason?: string }) => {
  return request.put(`/wecom/payments/refunds/${id}/approve`, data)
}

/** 搜索已支付记录（退款用） */
export const searchWecomPaidPayments = (keyword?: string) => {
  return request.get('/wecom/payments/search-paid', { params: { keyword }, showError: false } as any)
}

/** 获取收款码列表 */
export const getWecomPaymentQrcodes = () => {
  return request.get('/wecom/payments/qrcodes', { showError: false } as any)
}

/** 创建收款码 */
export const createWecomPaymentQrcode = (data: any) => {
  return request.post('/wecom/payments/qrcodes', data)
}

/** 更新收款码 */
export const updateWecomPaymentQrcode = (id: number, data: any) => {
  return request.put(`/wecom/payments/qrcodes/${id}`, data)
}

/** 删除收款码 */
export const deleteWecomPaymentQrcode = (id: number) => {
  return request.delete(`/wecom/payments/qrcodes/${id}`)
}

/** 获取收款设置 */
export const getWecomPaymentSettings = (configId?: number) => {
  return request.get('/wecom/payments/settings', { params: { configId }, showError: false } as any)
}

/** 保存收款设置 */
export const saveWecomPaymentSettings = (data: any) => {
  return request.put('/wecom/payments/settings', data)
}

// ==================== 会话存档 ====================

/** 获取会话存档授权状态 */
export const getChatArchiveStatus = () => {
  return request.get('/wecom/chat-archive/status', { showError: false } as any)
}

/** 获取会话存档记录列表 */
export const getChatRecords = (params?: {
  configId?: number
  keyword?: string
  msgType?: string
  fromUserId?: string
  roomId?: string
  startDate?: string
  endDate?: string
  isSensitive?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/chat-records', { params, showError: false } as any)
}

/** 同步会话存档数据 */
export const syncChatRecords = (configId: number) => {
  return request.post('/wecom/chat-records/sync', { configId })
}

/** 获取会话存档统计信息 */
export const getChatArchiveStats = (configId: number) => {
  return request.get('/wecom/chat-archive/stats', { params: { configId }, showError: false } as any)
}

/** 质检标记会话记录 */
export const auditChatRecord = (id: number, data: { isSensitive?: boolean; auditRemark?: string }) => {
  return request.put(`/wecom/chat-records/${id}/audit`, data)
}

// ==================== P2: 客户标签 ====================

/** 获取企微客户标签列表（实时） */
export const getWecomTags = (configId: number) => {
  return request.get('/wecom/tags', { params: { configId }, showError: false } as any)
}

/** 同步标签到客户 */
export const syncWecomTagsToCustomers = (configId: number) => {
  return request.post('/wecom/tags/sync-to-customers', { configId })
}

// ==================== P2: 获客链接统计 ====================

/** 同步获客链接统计数据 */
export const syncAcquisitionLinkStats = (configId: number) => {
  return request.post('/wecom/acquisition-links/sync-stats', { configId })
}

// ==================== V4.0: 获客助手增强 API ====================
// (Moved to new section below with correct URLs)

/** 获客链接详情-客户列表 */
export const getAcquisitionLinkCustomers = (linkId: number, params?: any) => {
  return request.get(`/wecom/acquisition/link/${linkId}/customers`, { params, showError: false } as any)
}

/** 获客链接详情-开口统计 */
export const getAcquisitionLinkStats = (linkId: number, params?: any) => {
  return request.get(`/wecom/acquisition/link/${linkId}/stats`, { params, showError: false } as any)
}

/** 获客链接详情-转化漏斗 */
export const getAcquisitionLinkFunnel = (linkId: number, params?: any) => {
  return request.get(`/wecom/acquisition/link/${linkId}/funnel`, { params, showError: false } as any)
}

/** 获客链接详情-链接画像 */
export const getAcquisitionLinkPortrait = (linkId: number, params?: any) => {
  return request.get(`/wecom/acquisition/link/${linkId}/portrait`, { params, showError: false } as any)
}

/** 获客链接详情-日志 */
export const getAcquisitionLinkLogs = (linkId: number, params?: any) => {
  return request.get(`/wecom/acquisition/link/${linkId}/logs`, { params, showError: false } as any)
}

/** 获客链接智能规则-获取 */
export const getAcquisitionSmartRules = (linkId: number) => {
  return request.get(`/wecom/acquisition/link/${linkId}/smart-rules`, { showError: false } as any)
}

/** 获客链接智能规则-保存 */
export const saveAcquisitionSmartRules = (linkId: number, data: any) => {
  return request.put(`/wecom/acquisition/link/${linkId}/smart-rules`, data)
}

/** 手动上线成员 */
export const onlineMember = (linkId: number, userId: string) => {
  return request.post(`/wecom/acquisition/link/${linkId}/member/${userId}/online`)
}

/** 手动下线成员 */
export const offlineMember = (linkId: number, userId: string) => {
  return request.post(`/wecom/acquisition/link/${linkId}/member/${userId}/offline`)
}

// ==================== 获客助手 - 数据总览/趋势/留存/排行 ====================

/** 获客数据总览（汇总卡片+漏斗+链接排行+渠道） */
export const getAcquisitionOverview = (params: { configId: number; startDate?: string; endDate?: string; range?: string }) => {
  return request.get('/wecom/acquisition-overview', { params, showError: false } as any)
}

/** 获客趋势数据（按时间粒度） */
export const getAcquisitionTrend = (params: { configId: number; startDate?: string; endDate?: string; range?: string }) => {
  return request.get('/wecom/acquisition-trend', { params, showError: false } as any)
}

/** 获客留存分析 */
export const getAcquisitionRetention = (params: { configId: number; startDate?: string; endDate?: string; range?: string }) => {
  return request.get('/wecom/acquisition-retention', { params, showError: false } as any)
}

/** 获客成员排行（所有链接汇总） */
export const getAcquisitionMemberRanking = (params: { configId: number; startDate?: string; endDate?: string; range?: string; sortBy?: string; page?: number; pageSize?: number; search?: string }) => {
  return request.get('/wecom/acquisition-member-ranking', { params, showError: false } as any)
}

/** 获取成员关联的链接列表 */
export const getMemberLinks = (userId: string, params: { configId: number; page?: number; pageSize?: number }) => {
  return request.get(`/wecom/acquisition-member/${userId}/links`, { params, showError: false } as any)
}

/** 活码智能上下线规则-获取 */
export const getContactWaySmartRules = (contactWayId: number) => {
  return request.get(`/wecom/contact-ways/${contactWayId}/smart-rules`, { showError: false } as any)
}

/** 活码智能上下线规则-保存 */
export const saveContactWaySmartRules = (contactWayId: number, data: any) => {
  return request.put(`/wecom/contact-ways/${contactWayId}/smart-rules`, data)
}

// ==================== 会话存档 - 会话视图 ====================

/** 获取会话列表（左侧面板，按对话分组） */
export const getConversationList = (params?: {
  configId?: number
  userId?: string
  keyword?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/conversations', { params, showError: false } as any)
}

/** 获取指定会话的消息列表（右侧气泡视图） */
export const getConversationMessages = (params: {
  configId?: number
  fromUserId: string
  toUserId: string
  roomId?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/conversations/messages', { params, showError: false } as any)
}

// ==================== P2: 会话存档全文搜索 ====================

/** 全文搜索会话记录 */
export const searchChatRecords = (params: {
  keyword: string
  configId?: number
  fromUserId?: string
  msgType?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/chat-records/search', { params, showError: false } as any)
}

// ==================== 会话存档增值服务购买 (Phase 6 增强) ====================

/** 获取VAS定价信息(含presetPackages/currentPlan/renewalDiscount) */
export const getVasPricing = () => {
  return request.get('/wecom/chat-archive/vas-pricing', { showError: false } as any)
}

/** 购买会话存档增值服务 (支持 new/renew/upgrade) */
export const purchaseChatArchive = (data: {
  userCount: number
  payType: string
  purchaseType?: 'new' | 'renew' | 'upgrade'
}) => {
  return request.post('/wecom/chat-archive/purchase', data)
}

/** 查询VAS订单支付状态 */
export const getVasOrderStatus = (orderNo: string) => {
  return request.get(`/wecom/chat-archive/order/${orderNo}`, { showError: false } as any)
}

/** 模拟VAS支付（开发调试） */
export const simulateVasPay = (orderNo: string) => {
  return request.post(`/wecom/chat-archive/simulate-pay/${orderNo}`)
}

// ==================== Phase 6: 席位管理 ====================

/** 获取席位信息 */
export const getArchiveSeats = (configId: number) => {
  return request.get('/wecom/chat-archive/seats', { params: { configId }, showError: false } as any)
}

/** 更新生效成员列表 */
export const updateArchiveSeatMembers = (data: {
  configId: number
  members: Array<{ wecomUserId: string; wecomUserName?: string; isEnabled: boolean }>
}) => {
  return request.put('/wecom/chat-archive/seats/members', data)
}

/** 获取企微部门树(含绑定状态) */
export const getArchiveSeatWecomTree = (configId: number) => {
  return request.get('/wecom/chat-archive/seats/wecom-tree', { params: { configId }, showError: false } as any)
}

// ==================== 质检规则 ====================

/** 获取质检规则列表 */
export const getQualityRules = () => {
  return request.get('/wecom/quality-rules', { showError: false } as any)
}

/** 创建质检规则 */
export const createQualityRule = (data: {
  name: string
  ruleType: string
  conditions: any
  scoreValue?: number
  applyScope?: any
  isEnabled?: boolean
}) => {
  return request.post('/wecom/quality-rules', data)
}

/** 更新质检规则 */
export const updateQualityRule = (id: number, data: {
  name?: string
  ruleType?: string
  conditions?: any
  scoreValue?: number
  applyScope?: any
  isEnabled?: boolean
}) => {
  return request.put(`/wecom/quality-rules/${id}`, data)
}

/** 删除质检规则 */
export const deleteQualityRule = (id: number) => {
  return request.delete(`/wecom/quality-rules/${id}`)
}

// ==================== 质检记录 ====================

/** 获取质检记录列表 */
export const getQualityInspections = (params?: {
  configId?: number
  status?: string
  fromUserId?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/quality-inspections', { params, showError: false } as any)
}

/** 执行质检 */
export const runQualityInspection = (data: {
  configId: number
  fromUserId?: string
  toUserId?: string
  startDate?: string
  endDate?: string
}) => {
  return request.post('/wecom/quality-inspections/run', data)
}

/** 质检复核 */
export const reviewQualityInspection = (id: number, data: {
  status?: string
  score?: number
  remark?: string
}) => {
  return request.put(`/wecom/quality-inspections/${id}/review`, data)
}

/** 删除质检记录 */
export const deleteQualityInspection = (id: number) => {
  return request.delete(`/wecom/quality-inspections/${id}`)
}

/** 获取质检统计 */
export const getQualityInspectionStats = (configId?: number) => {
  return request.get('/wecom/quality-inspections/stats', { params: { configId }, showError: false } as any)
}

// ==================== 存档设置 ====================

/** 获取存档设置 */
export const getArchiveSettings = (configId: number) => {
  return request.get('/wecom/chat-archive/settings', { params: { configId }, showError: false } as any)
}

/** 更新存档设置 */
export const updateArchiveSettings = (data: {
  configId: number
  fetchInterval?: number
  fetchMode?: string
  retentionDays?: number
  mediaStorage?: string
  autoInspect?: boolean
  memberScope?: any
  rsaPublicKey?: string
  visibility?: string
}) => {
  return request.put('/wecom/chat-archive/settings', data)
}

// ==================== 侧边栏应用管理 ====================

/** 获取侧边栏应用列表 */
export const getSidebarApps = () => {
  return request.get('/wecom/sidebar-apps', { showError: false } as any)
}

/** 添加侧边栏应用 */
export const addSidebarApp = (data: { name: string; url: string; isEnabled?: boolean; description?: string }) => {
  return request.post('/wecom/sidebar-apps', data)
}

/** 保存侧边栏应用（整体覆盖） */
export const saveSidebarApps = (apps: Array<{ id?: number; name: string; url: string; isEnabled: boolean; description?: string }>) => {
  return request.put('/wecom/sidebar-apps', { apps })
}

/** 删除侧边栏应用 */
export const deleteSidebarApp = (appId: number) => {
  return request.delete(`/wecom/sidebar-apps/${appId}`)
}

// ==================== 侧边栏客户详情 API ====================

/** 侧边栏 - 获取JS-SDK配置 */
export const getSidebarJsSdkConfig = (data: { url: string; corpId: string }) => {
  return request.post('/wecom/sidebar/js-sdk-config', data)
}

/** 侧边栏 - 绑定账号(登录) */
export const sidebarBindAccount = (data: { wecomUserId: string; corpId: string; username: string; password: string }) => {
  return request.post('/wecom/sidebar/bind-account', data)
}

/** 侧边栏 - 验证绑定状态 */
export const sidebarVerifyBinding = (wecomUserId: string, corpId: string) => {
  return request.get('/wecom/sidebar/verify-binding', { params: { wecomUserId, corpId }, showError: false } as any)
}

/** 侧边栏 - 获取客户详情(含订单) */
export const getSidebarCustomerDetail = (externalUserId: string, token: string) => {
  return request.get('/wecom/sidebar/customer-detail', {
    params: { externalUserId },
    headers: { Authorization: `Bearer ${token}` }
  } as any)
}

/** 侧边栏 - 刷新Token */
export const refreshSidebarToken = (token: string) => {
  return request.post('/wecom/sidebar/refresh-token', {}, {
    headers: { Authorization: `Bearer ${token}` }
  } as any)
}

// ==================== Phase 5: 获客管理增强 ====================

/** 获取获客链接权重配置 */
export const getAcquisitionLinkWeight = (linkId: number) => {
  return request.get(`/wecom/acquisition-links/${linkId}/weight`, { showError: false } as any)
}

/** 更新获客链接权重配置 */
export const updateAcquisitionLinkWeight = (linkId: number, members: Array<{ userId: string; weight: number }>) => {
  return request.put(`/wecom/acquisition-links/${linkId}/weight`, { members })
}

/** 获取渠道分析统计数据 */
export const getAcquisitionChannelStats = (configId?: number) => {
  return request.get('/wecom/acquisition-links/channel-stats', { params: { configId }, showError: false } as any)
}

/** 获取获客使用量监控 */
export const getAcquisitionUsage = (configId?: number) => {
  return request.get('/wecom/acquisition-usage', { params: { configId }, showError: false } as any)
}

// ==================== P2: 客户标签管理 ====================

/** 获取客户标签组列表 */
export const getAcquisitionTags = (configId: number) => {
  return request.get('/wecom/acquisition-tags', { params: { configId }, showError: false } as any)
}

/** 创建标签组 */
export const createAcquisitionTagGroup = (data: { configId: number; groupName: string; tags: Array<{ name: string }> }) => {
  return request.post('/wecom/acquisition-tags', data)
}

/** 编辑标签/标签组名称 */
export const editAcquisitionTag = (id: string, data: { configId: number; name: string; order?: number }) => {
  return request.put(`/wecom/acquisition-tags/${id}`, data)
}

/** 删除标签/标签组 */
export const deleteAcquisitionTags = (data: { configId: number; tagIds?: string[]; groupIds?: string[] }) => {
  return request.delete('/wecom/acquisition-tags', { data } as any)
}

// ==================== Phase 5: 微信客服增强 ====================

/** 获取客服会话记录列表 */
export const getKfSessions = (params?: {
  configId?: number
  openKfId?: string
  status?: string
  servicerUserid?: string
  page?: number
  pageSize?: number
}) => {
  return request.get('/wecom/kf-sessions', { params, showError: false } as any)
}

/** 同步客服会话记录 */
export const syncKfSessions = (data: { configId: number; openKfId?: string }) => {
  return request.post('/wecom/kf-sessions/sync', data)
}

/** 获取客服数据统计 */
export const getKfStats = (params?: {
  configId?: number
  openKfId?: string
  startDate?: string
  endDate?: string
}) => {
  return request.get('/wecom/kf-stats', { params, showError: false } as any)
}

/** 获取快捷回复列表 */
export const getQuickReplies = (params?: {
  category?: string
  groupName?: string
  keyword?: string
}) => {
  return request.get('/wecom/quick-replies', { params, showError: false } as any)
}

/** 创建快捷回复 */
export const createQuickReply = (data: {
  category?: string
  groupName?: string
  title: string
  content: string
  shortcut?: string
  sortOrder?: number
}) => {
  return request.post('/wecom/quick-replies', data)
}

/** 更新快捷回复 */
export const updateQuickReply = (id: number, data: {
  category?: string
  groupName?: string
  title?: string
  content?: string
  shortcut?: string
  isEnabled?: boolean
  sortOrder?: number
}) => {
  return request.put(`/wecom/quick-replies/${id}`, data)
}

/** 删除快捷回复 */
export const deleteQuickReply = (id: number) => {
  return request.delete(`/wecom/quick-replies/${id}`)
}

/** 快捷回复使用计数 +1 */
export const useQuickReply = (id: number) => {
  return request.post(`/wecom/quick-replies/${id}/use`)
}

// ==================== Phase 7: CRM深度集成 ====================

/** 获取企微客户详情(含消息统计+CRM信息) */
export const getWecomCustomerDetail = (id: number) => {
  return request.get(`/wecom/customers/${id}/detail`, { showError: false } as any)
}

/** 批量获取客户消息统计 */
export const getWecomCustomerMessageStats = (params?: {
  configId?: number
  customerIds?: string
}) => {
  return request.get('/wecom/customers/stats/messages', { params, showError: false } as any)
}

/** 添加企微客户跟进记录 */
export const addWecomCustomerFollowRecord = (id: number, data: {
  content: string
  type?: string
}) => {
  return request.post(`/wecom/customers/${id}/follow-record`, data)
}

/** 获取CRM客户的企微绑定信息 */
export const getCrmCustomerWecomInfo = (customerId: string) => {
  return request.get(`/wecom/crm-customers/${customerId}/wecom-info`, { showError: false } as any)
}

/** 更新CRM客户的企微USID */
export const updateCrmCustomerWecomUsid = (customerId: string, wecomExternalUserid: string) => {
  return request.put(`/wecom/crm-customers/${customerId}/wecom-usid`, { wecomExternalUserid })
}

/** 侧边栏换绑 */
export const rebindSidebarBinding = (bindingId: number) => {
  return request.put(`/wecom/sidebar/binding/${bindingId}/rebind`)
}

/** 侧边栏解绑 */
export const unbindSidebarBinding = (bindingId: number) => {
  return request.delete(`/wecom/sidebar/binding/${bindingId}`)
}

// ==================== 套餐与定价 (CRM端) ====================

/** 获取公开定价配置 */
export const getPricingConfig = () => {
  return request.get('/wecom/pricing-config', { showError: false } as any)
}

/** 获取当前租户已购套餐 */
export const getTenantPackage = () => {
  return request.get('/wecom/tenant-package', { showError: false } as any)
}

/** 领取/购买企微套餐 */
export const claimWecomPackage = (data: { packageId: string | number; action: 'claim' | 'purchase' }) => {
  return request.post('/wecom/claim-package', data)
}

/** 购买AI额度套餐 */
export const purchaseAiPackage = (data: { packageId: string }) => {
  return request.post('/wecom/purchase-ai', data)
}

/** 购买会话存档套餐 */
export const purchaseArchivePackage = (data: { tierId?: string | number; userCount?: number; purchaseMode?: string }) => {
  return request.post('/wecom/purchase-archive', data)
}

/** 购买获客助手套餐 */
export const purchaseAcquisitionPackage = (data: { tierId: string | number }) => {
  return request.post('/wecom/purchase-acquisition', data)
}

/** 获取当前租户账单购买记录 */
export const getBillingRecords = () => {
  return request.get('/wecom/billing-records', { showError: false } as any)
}

/** 确认支付完成（支付后调用，更新账单状态并触发套餐激活） */
export const confirmWecomPayment = (data: { type: string; packageName: string; configId?: number }) => {
  return request.post('/wecom/confirm-payment', data)
}

