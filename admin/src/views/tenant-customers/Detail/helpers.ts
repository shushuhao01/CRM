/** 租户详情页 — 共享工具函数 */

export const maskKey = (key: string): string => {
  if (!key) return ''
  if (key.startsWith('LIC-')) {
    return `${key.substring(0, 8)}****${key.substring(key.length - 4)}`
  }
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 8) + '****'
}

export const copyKey = async (key: string) => {
  const { ElMessage } = await import('element-plus')
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

export const formatStorage = (mb: number): string => {
  if (!mb || mb === 0) return '0MB'
  if (mb < 1024) return `${mb}MB`
  return `${(mb / 1024).toFixed(1)}GB`
}

export const formatDateTime = (date: string): string =>
  date ? new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'

export const formatIpDisplay = (ip: string): string => {
  if (!ip) return '-'
  const cleaned = ip.replace(/^::ffff:/, '')
  if (cleaned === '::1' || cleaned === '127.0.0.1') return '127.0.0.1 (本地)'
  return cleaned
}

export const formatExpireDate = (date: string): string => {
  if (!date) return '永久'
  return new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}

export const isExpired = (date: string): boolean => !!date && new Date(date) < new Date()

export const getProgressColor = (ratio: number): string => {
  if (ratio >= 0.9) return '#f56c6c'
  if (ratio >= 0.7) return '#e6a23c'
  return '#409eff'
}

export const getPackageType = (p: string): string => {
  const map: Record<string, string> = { '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }
  return map[p] || 'info'
}

export const getStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', expired: 'info', disabled: 'danger', inactive: 'danger', pending: 'warning', suspended: 'warning' }
  return map[s] || 'info'
}

export const getStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '正常', expired: '已过期', disabled: '已禁用', inactive: '已禁用', pending: '待启用', suspended: '已暂停' }
  return map[s] || s
}

export const getLicenseStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}

export const getLicenseStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }
  return map[s] || s
}

export const getRoleTagType = (role: string): string => {
  const map: Record<string, string> = { admin: 'danger', '超级管理员': 'danger', manager: 'warning', '经理': 'warning', user: '', '员工': '' }
  return map[role] || ''
}

export const getUserStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', normal: 'success', inactive: 'info', disabled: 'danger', resigned: 'info', locked: 'danger', pending: 'warning', suspended: 'warning' }
  return map[s] || 'info'
}

export const getUserStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '正常', normal: '正常', inactive: '已禁用', disabled: '已禁用', resigned: '已离职', locked: '已锁定', pending: '待激活', suspended: '已暂停' }
  return map[s] || s
}

export const getLogActionType = (action: string): string => {
  const map: Record<string, string> = { generate: 'success', activate: 'primary', renew: 'warning', suspend: 'danger', resume: 'success', revoke: 'danger', unlock_admin: 'warning', update: 'primary', verify: '' }
  return map[action] || 'info'
}

export const getLogActionText = (action: string): string => {
  const map: Record<string, string> = { generate: '生成授权码', activate: '激活', renew: '续期', suspend: '暂停授权', resume: '恢复授权', revoke: '吊销', unlock_admin: '解锁账号', update: '更新信息', verify: '验证' }
  return map[action] || action
}

export const getBillStatusType = (s: string): string => {
  const map: Record<string, string> = { pending: 'warning', paid: 'success', expired: 'info', refunded: 'danger', closed: 'info' }
  return map[s] || 'info'
}

export const getBillStatusText = (s: string): string => {
  const map: Record<string, string> = { pending: '待支付', paid: '已支付', expired: '已过期', refunded: '已退款', closed: '已关闭' }
  return map[s] || s
}

export const getBillPayTypeText = (t: string): string => {
  const map: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '银行转账', manual: '人工' }
  return map[t] || t || '-'
}

export const getCapacityBillingText = (cycle: string): string => {
  return ({ monthly: '按月', yearly: '按年', follow_package: '跟随套餐' }[cycle] || cycle)
}

export const getCapacityStatusType = (s: string): string => {
  const map: Record<string, string> = { pending: 'warning', paid: 'success', closed: 'info', refunded: 'danger' }
  return map[s] || 'info'
}

export const getCapacityStatusText = (s: string): string => {
  const map: Record<string, string> = { pending: '待支付', paid: '已支付', closed: '已关闭', refunded: '已退款' }
  return map[s] || s
}

export const getBillingText = (cycle: string): string => {
  return ({ monthly: '月', yearly: '年', once: '永久' }[cycle] || cycle)
}

