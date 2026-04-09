/**
 * Customer/Detail 子组件共享辅助函数
 */

export const getLevelType = (level: string): string => {
  const levelMap: Record<string, string> = {
    'bronze': '',
    'silver': 'info',
    'gold': 'warning',
    'diamond': 'danger',
    'normal': '',
    'vip': 'warning',
    'svip': 'danger',
    '普通客户': '',
    'VIP客户': 'warning',
    'SVIP客户': 'danger'
  }
  return levelMap[level] || ''
}

export const getLevelText = (level: string): string => {
  const levelMap: Record<string, string> = {
    'bronze': '铜牌客户',
    'silver': '银牌客户',
    'gold': '金牌客户',
    'diamond': '钻石客户',
    'normal': '铜牌客户',
    'vip': '金牌客户',
    'svip': '钻石客户',
    '普通客户': '铜牌客户',
    'VIP客户': '金牌客户',
    'SVIP客户': '钻石客户'
  }
  return levelMap[level] || '铜牌客户'
}

export const getGenderText = (gender: string): string => {
  const genderMap: Record<string, string> = {
    'male': '男',
    'female': '女',
    '男': '男',
    '女': '女'
  }
  return genderMap[gender] || gender
}

export const getSourceText = (source: string): string => {
  const sourceMap: Record<string, string> = {
    'online': '线上推广',
    'offline': '线下门店',
    'referral': '朋友推荐',
    'social': '社交媒体',
    'search': '搜索引擎',
    'advertisement': '广告投放',
    'other': '其他渠道'
  }
  return sourceMap[source] || source
}

export const getTagText = (tag: string): string => {
  const tagMap: Record<string, string> = {
    'high_value': '高价值客户',
    'potential': '潜在客户',
    'loyal': '忠实客户',
    'new': '新客户',
    'inactive': '不活跃客户',
    'complaint': '投诉客户',
    'vip': 'VIP客户'
  }
  return tagMap[tag] || tag
}

export const getTagType = (tag: string): string => {
  const typeMap: Record<string, string> = {
    '优质客户': 'success',
    '重点关注': 'warning',
    '高消费': 'danger',
    '潜在客户': 'info',
    '忠实客户': 'success',
    '新客户': 'primary',
    '不活跃客户': '',
    '投诉客户': 'danger',
    'VIP客户': 'warning'
  }
  return typeMap[tag] || 'info'
}

export const getServiceType = (type: string): string => {
  const typeMap: Record<string, string> = {
    '退货': 'warning',
    '退款': 'danger',
    '换货': 'info',
    '维修': 'success'
  }
  return typeMap[type] || 'info'
}

export const getServiceStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    '已完成': 'success',
    '处理中': 'warning',
    '待处理': 'info',
    '已拒绝': 'danger'
  }
  return statusMap[status] || 'info'
}

export const getCallStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    '已接通': 'success',
    '未接通': 'warning',
    '忙线': 'info',
    '拒接': 'danger'
  }
  return statusMap[status] || 'info'
}

export const getFollowUpType = (type: string): string => {
  const typeMap: Record<string, string> = {
    '电话跟进': 'primary',
    '微信沟通': 'success',
    '上门拜访': 'warning',
    '邮件联系': 'info',
    '其他': ''
  }
  return typeMap[type] || ''
}

export const getOrderStatusType = (status: string): string => {
  const statusMap: Record<string, string> = {
    '已完成': 'success',
    '进行中': 'warning',
    '已取消': 'danger',
    '待付款': 'info'
  }
  return statusMap[status] || 'info'
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export const disableFutureDate = (time: Date): boolean => {
  return time.getTime() > Date.now()
}

