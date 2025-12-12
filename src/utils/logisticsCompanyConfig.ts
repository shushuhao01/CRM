/**
 * 物流公司配置
 * 包含常见物流公司的官网查询URL
 */

export interface LogisticsCompany {
  code: string           // 物流公司代码
  name: string           // 物流公司名称
  shortName: string      // 简称（用于按钮显示）
  trackingUrl: string    // 查询URL（{trackingNo}为占位符）
  logo?: string          // Logo图标
}

// 常见物流公司配置
export const LOGISTICS_COMPANIES: Record<string, LogisticsCompany> = {
  // 顺丰速运
  'SF': {
    code: 'SF',
    name: '顺丰速运',
    shortName: '顺丰',
    trackingUrl: 'https://www.sf-express.com/chn/sc/waybill/waybill-detail/{trackingNo}'
  },
  '顺丰': {
    code: 'SF',
    name: '顺丰速运',
    shortName: '顺丰',
    trackingUrl: 'https://www.sf-express.com/chn/sc/waybill/waybill-detail/{trackingNo}'
  },
  '顺丰速运': {
    code: 'SF',
    name: '顺丰速运',
    shortName: '顺丰',
    trackingUrl: 'https://www.sf-express.com/chn/sc/waybill/waybill-detail/{trackingNo}'
  },

  // 中通快递
  'ZTO': {
    code: 'ZTO',
    name: '中通快递',
    shortName: '中通',
    trackingUrl: 'https://www.zto.com/GuestService/Bill?txtbill={trackingNo}'
  },
  '中通': {
    code: 'ZTO',
    name: '中通快递',
    shortName: '中通',
    trackingUrl: 'https://www.zto.com/GuestService/Bill?txtbill={trackingNo}'
  },
  '中通快递': {
    code: 'ZTO',
    name: '中通快递',
    shortName: '中通',
    trackingUrl: 'https://www.zto.com/GuestService/Bill?txtbill={trackingNo}'
  },

  // 圆通速递
  'YTO': {
    code: 'YTO',
    name: '圆通速递',
    shortName: '圆通',
    trackingUrl: 'https://www.yto.net.cn/search/search.html?orderNo={trackingNo}'
  },
  '圆通': {
    code: 'YTO',
    name: '圆通速递',
    shortName: '圆通',
    trackingUrl: 'https://www.yto.net.cn/search/search.html?orderNo={trackingNo}'
  },
  '圆通速递': {
    code: 'YTO',
    name: '圆通速递',
    shortName: '圆通',
    trackingUrl: 'https://www.yto.net.cn/search/search.html?orderNo={trackingNo}'
  },

  // 申通快递
  'STO': {
    code: 'STO',
    name: '申通快递',
    shortName: '申通',
    trackingUrl: 'https://www.sto.cn/queryTrack.html?billNo={trackingNo}'
  },
  '申通': {
    code: 'STO',
    name: '申通快递',
    shortName: '申通',
    trackingUrl: 'https://www.sto.cn/queryTrack.html?billNo={trackingNo}'
  },
  '申通快递': {
    code: 'STO',
    name: '申通快递',
    shortName: '申通',
    trackingUrl: 'https://www.sto.cn/queryTrack.html?billNo={trackingNo}'
  },

  // 韵达快递
  'YD': {
    code: 'YD',
    name: '韵达快递',
    shortName: '韵达',
    trackingUrl: 'https://www.yundaex.com/cn/tracking?mailNo={trackingNo}'
  },
  '韵达': {
    code: 'YD',
    name: '韵达快递',
    shortName: '韵达',
    trackingUrl: 'https://www.yundaex.com/cn/tracking?mailNo={trackingNo}'
  },
  '韵达快递': {
    code: 'YD',
    name: '韵达快递',
    shortName: '韵达',
    trackingUrl: 'https://www.yundaex.com/cn/tracking?mailNo={trackingNo}'
  },

  // 极兔速递
  'JTSD': {
    code: 'JTSD',
    name: '极兔速递',
    shortName: '极兔',
    trackingUrl: 'https://www.jtexpress.cn/service/query?waybillNo={trackingNo}'
  },
  '极兔': {
    code: 'JTSD',
    name: '极兔速递',
    shortName: '极兔',
    trackingUrl: 'https://www.jtexpress.cn/service/query?waybillNo={trackingNo}'
  },
  '极兔速递': {
    code: 'JTSD',
    name: '极兔速递',
    shortName: '极兔',
    trackingUrl: 'https://www.jtexpress.cn/service/query?waybillNo={trackingNo}'
  },

  // EMS
  'EMS': {
    code: 'EMS',
    name: 'EMS',
    shortName: 'EMS',
    trackingUrl: 'https://www.ems.com.cn/queryList?queryType=1&mailNo={trackingNo}'
  },
  '邮政': {
    code: 'EMS',
    name: 'EMS',
    shortName: 'EMS',
    trackingUrl: 'https://www.ems.com.cn/queryList?queryType=1&mailNo={trackingNo}'
  },
  '中国邮政': {
    code: 'EMS',
    name: 'EMS',
    shortName: 'EMS',
    trackingUrl: 'https://www.ems.com.cn/queryList?queryType=1&mailNo={trackingNo}'
  },

  // 京东物流
  'JD': {
    code: 'JD',
    name: '京东物流',
    shortName: '京东',
    trackingUrl: 'https://www.jdl.com/orderTrack?waybillCode={trackingNo}'
  },
  '京东': {
    code: 'JD',
    name: '京东物流',
    shortName: '京东',
    trackingUrl: 'https://www.jdl.com/orderTrack?waybillCode={trackingNo}'
  },
  '京东物流': {
    code: 'JD',
    name: '京东物流',
    shortName: '京东',
    trackingUrl: 'https://www.jdl.com/orderTrack?waybillCode={trackingNo}'
  },

  // 德邦快递
  'DBL': {
    code: 'DBL',
    name: '德邦快递',
    shortName: '德邦',
    trackingUrl: 'https://www.deppon.com/deptracknew/tracking?mailNo={trackingNo}'
  },
  '德邦': {
    code: 'DBL',
    name: '德邦快递',
    shortName: '德邦',
    trackingUrl: 'https://www.deppon.com/deptracknew/tracking?mailNo={trackingNo}'
  },
  '德邦快递': {
    code: 'DBL',
    name: '德邦快递',
    shortName: '德邦',
    trackingUrl: 'https://www.deppon.com/deptracknew/tracking?mailNo={trackingNo}'
  },

  // 百世快递
  'HTKY': {
    code: 'HTKY',
    name: '百世快递',
    shortName: '百世',
    trackingUrl: 'https://www.800bestex.com/queryTrack?billNo={trackingNo}'
  },
  '百世': {
    code: 'HTKY',
    name: '百世快递',
    shortName: '百世',
    trackingUrl: 'https://www.800bestex.com/queryTrack?billNo={trackingNo}'
  },
  '百世快递': {
    code: 'HTKY',
    name: '百世快递',
    shortName: '百世',
    trackingUrl: 'https://www.800bestex.com/queryTrack?billNo={trackingNo}'
  },

  // 邮政快递包裹
  'YZPY': {
    code: 'YZPY',
    name: '邮政快递包裹',
    shortName: '邮政包裹',
    trackingUrl: 'https://www.ems.com.cn/queryList?queryType=1&mailNo={trackingNo}'
  }
}

// 快递100通用查询URL
export const KUAIDI100_URL = 'https://www.kuaidi100.com/?nu={trackingNo}'

/**
 * 根据物流公司名称或代码获取物流公司配置
 */
export const getLogisticsCompany = (companyNameOrCode: string): LogisticsCompany | null => {
  if (!companyNameOrCode) return null

  // 直接匹配
  const company = LOGISTICS_COMPANIES[companyNameOrCode]
  if (company) return company

  // 模糊匹配（包含关键字）
  const normalizedInput = companyNameOrCode.toLowerCase().trim()
  for (const key of Object.keys(LOGISTICS_COMPANIES)) {
    if (key.toLowerCase().includes(normalizedInput) || normalizedInput.includes(key.toLowerCase())) {
      return LOGISTICS_COMPANIES[key]
    }
  }

  return null
}

/**
 * 获取物流查询URL
 */
export const getTrackingUrl = (companyNameOrCode: string, trackingNo: string): string => {
  const company = getLogisticsCompany(companyNameOrCode)
  if (company) {
    return company.trackingUrl.replace('{trackingNo}', trackingNo)
  }
  // 默认使用快递100
  return KUAIDI100_URL.replace('{trackingNo}', trackingNo)
}

/**
 * 获取物流公司简称（用于按钮显示）
 */
export const getCompanyShortName = (companyNameOrCode: string): string => {
  const company = getLogisticsCompany(companyNameOrCode)
  return company ? company.shortName : '物流'
}
