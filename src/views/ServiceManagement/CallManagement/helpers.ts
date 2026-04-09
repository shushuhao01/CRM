/**
 * CallManagement 共享辅助函数
 * 纯函数，无状态依赖，供 index.vue 及所有子组件导入使用
 */

export const getLevelType = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '', 'silver': 'info', 'gold': 'warning', 'diamond': 'success'
  }
  return levelMap[level] || ''
}

export const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '普通', 'silver': '白银', 'gold': '黄金', 'diamond': '钻石'
  }
  return levelMap[level] || '普通'
}

export const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning', 'connected': 'success', 'no_answer': 'info',
    'busy': 'warning', 'failed': 'danger'
  }
  return statusMap[status] || 'info'
}

export const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待外呼', 'connected': '已接通', 'no_answer': '未接听',
    'busy': '忙线', 'failed': '失败'
  }
  return statusMap[status] || '未知'
}

export const getCallStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connected': '已接通', 'missed': '未接听', 'rejected': '已拒绝',
    'busy': '忙线', 'failed': '失败', 'no_answer': '无人接听',
    'unreachable': '无法接通', 'cancelled': '已取消', 'timeout': '超时', 'pending': '待外呼'
  }
  return statusMap[status] || status || '未知'
}

export const getCallStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'connected': 'success', 'missed': 'danger', 'rejected': 'danger',
    'busy': 'warning', 'failed': 'danger', 'no_answer': 'warning',
    'unreachable': 'danger', 'cancelled': 'info', 'timeout': 'warning', 'pending': 'info'
  }
  return typeMap[status] || 'info'
}

export const getAftersalesStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理', 'processing': '处理中', 'completed': '已完成',
    'closed': '已关闭', 'cancelled': '已取消'
  }
  return statusMap[status] || status || '未知'
}

export const getAftersalesStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning', 'processing': 'primary', 'completed': 'success',
    'closed': 'info', 'cancelled': 'danger'
  }
  return typeMap[status] || 'info'
}

export const getFollowUpTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'call': '电话跟进', 'visit': '上门拜访', 'email': '邮件跟进', 'message': '短信跟进'
  }
  return typeMap[type] || type || '其他'
}

export const getIntentType = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': 'success', 'medium': 'warning', 'low': 'info', 'none': 'danger'
  }
  return intentMap[intent] || 'info'
}

export const getIntentLabel = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': '高意向', 'medium': '中意向', 'low': '低意向', 'none': '无意向'
  }
  return intentMap[intent] || intent || '未知'
}

export const getProviderText = (provider: string) => {
  const providerMap: Record<string, string> = {
    aliyun: '阿里云', tencent: '腾讯云', huawei: '华为云', custom: '自定义'
  }
  return providerMap[provider] || provider || '未知'
}

export const formatCallDuration = (seconds: number | string) => {
  if (typeof seconds === 'string') return seconds
  if (!seconds || seconds === 0) return '0秒'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}秒`
  return `${mins}分${secs}秒`
}

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

// 手机号运营商映射
const phoneCarrierMap: Record<string, string> = {
  '134': '移动', '135': '移动', '136': '移动', '137': '移动', '138': '移动', '139': '移动',
  '147': '移动', '148': '移动', '150': '移动', '151': '移动', '152': '移动', '157': '移动',
  '158': '移动', '159': '移动', '172': '移动', '178': '移动', '182': '移动', '183': '移动',
  '184': '移动', '187': '移动', '188': '移动', '195': '移动', '197': '移动', '198': '移动',
  '130': '联通', '131': '联通', '132': '联通', '145': '联通', '146': '联通', '155': '联通',
  '156': '联通', '166': '联通', '167': '联通', '171': '联通', '175': '联通', '176': '联通',
  '185': '联通', '186': '联通', '196': '联通',
  '133': '电信', '149': '电信', '153': '电信', '173': '电信', '174': '电信', '177': '电信',
  '180': '电信', '181': '电信', '189': '电信', '190': '电信', '191': '电信', '193': '电信',
  '199': '电信'
}

export const getPhoneCarrier = (phone: string): string => {
  if (!phone) return ''
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 3) return ''
  const prefix = cleanPhone.substring(0, 3)
  return phoneCarrierMap[prefix] || ''
}

