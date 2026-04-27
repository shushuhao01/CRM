/**
 * Order/Detail 子组件共享辅助函数
 */

export const getLevelType = (level: string): string => {
  const types: Record<string, string> = {
    'vip': 'warning',
    'premium': 'danger',
    'normal': 'info'
  }
  return types[level] || 'info'
}

export const getLevelText = (level: string): string => {
  const texts: Record<string, string> = {
    'vip': 'VIP客户',
    'premium': '高级客户',
    'normal': '普通客户'
  }
  return texts[level] || '普通客户'
}

export const getExpressCompanyText = (code: string): string => {
  if (!code) return '-'
  const companies: Record<string, string> = {
    'SF': '顺丰速运', 'YTO': '圆通速递', 'ZTO': '中通快递',
    'STO': '申通快递', 'YD': '韵达快递', 'JTSD': '极兔速递',
    'EMS': 'EMS', 'YZBK': '邮政包裹', 'DBL': '德邦快递', 'JD': '京东物流',
    'sf': '顺丰速运', 'yto': '圆通速递', 'zto': '中通快递',
    'sto': '申通快递', 'yd': '韵达快递', 'jtsd': '极兔速递',
    'ems': 'EMS', 'yzbk': '邮政包裹', 'dbl': '德邦快递', 'jd': '京东物流'
  }
  return companies[code] || code
}

export const getOrderSourceText = (source: string): string => {
  const sources: Record<string, string> = {
    'online_store': '线上商城', 'wechat_mini': '微信小程序',
    'wechat_service': '微信客服', 'phone_call': '电话咨询',
    'offline_store': '线下门店', 'referral': '客户推荐',
    'advertisement': '广告投放', 'other': '其他渠道'
  }
  return sources[source] || source
}

export const getPaymentMethodText = (method: string): string => {
  const methodMap: Record<string, string> = {
    'wechat': '微信支付', 'alipay': '支付宝', 'bank_transfer': '银行转账',
    'cod': '货到付款', 'cash': '现金', 'card': '刷卡', 'other': '其他'
  }
  return methodMap[method] || method
}

export const getAfterSalesType = (type: string): string => {
  const types: Record<string, string> = {
    'refund': 'warning', 'return': 'danger', 'exchange': 'info', 'repair': 'success'
  }
  return types[type] || 'info'
}

export const getMarkButtonType = (markType: string): string => {
  if (markType === 'reserved') return 'warning'
  if (markType === 'return') return 'danger'
  if (markType === 'virtual_delivery') return 'primary'
  return ''
}

export const getMarkTagType = (markType: string): string => {
  if (markType === 'reserved') return 'warning'
  if (markType === 'return') return 'danger'
  if (markType === 'virtual_delivery') return 'primary'
  return 'info'
}

export const getMarkText = (markType: string): string => {
  const texts: Record<string, string> = {
    'reserved': '预留单', 'normal': '正常发货单', 'return': '退单', 'virtual_delivery': '虚拟发货'
  }
  return texts[markType] || markType
}

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN')
  } catch {
    return dateStr
  }
}

