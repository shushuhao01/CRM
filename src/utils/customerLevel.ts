// 客户等级工具函数

// 客户等级枚举
export enum CustomerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  DIAMOND = 'diamond'
}

// 客户等级配置
export const CUSTOMER_LEVEL_CONFIG = {
  [CustomerLevel.BRONZE]: {
    label: '铜牌客户',
    value: 'bronze',
    type: '',
    color: '#909399'
  },
  [CustomerLevel.SILVER]: {
    label: '银牌客户',
    value: 'silver',
    type: 'info',
    color: '#909399'
  },
  [CustomerLevel.GOLD]: {
    label: '金牌客户',
    value: 'gold',
    type: 'warning',
    color: '#E6A23C'
  },
  [CustomerLevel.DIAMOND]: {
    label: '钻石客户',
    value: 'diamond',
    type: 'danger',
    color: '#F56C6C'
  }
}

// 获取等级中文名称
export function getLevelLabel(level: string): string {
  const config = CUSTOMER_LEVEL_CONFIG[level as CustomerLevel]
  return config ? config.label : '铜牌客户'
}

// 获取等级标签类型
export function getLevelType(level: string): string {
  const config = CUSTOMER_LEVEL_CONFIG[level as CustomerLevel]
  return config ? config.type : ''
}

// 获取等级颜色
export function getLevelColor(level: string): string {
  const config = CUSTOMER_LEVEL_CONFIG[level as CustomerLevel]
  return config ? config.color : '#909399'
}

// 获取所有等级选项
export function getLevelOptions() {
  return [
    { label: '铜牌客户', value: CustomerLevel.BRONZE },
    { label: '银牌客户', value: CustomerLevel.SILVER },
    { label: '金牌客户', value: CustomerLevel.GOLD },
    { label: '钻石客户', value: CustomerLevel.DIAMOND }
  ]
}

// 兼容旧数据:将中文等级转换为英文值
export function normalizeLevelValue(level: string): string {
  const mapping: Record<string, string> = {
    '普通客户': CustomerLevel.BRONZE,
    '铜牌客户': CustomerLevel.BRONZE,
    'VIP客户': CustomerLevel.GOLD,
    '金牌客户': CustomerLevel.GOLD,
    'SVIP客户': CustomerLevel.DIAMOND,
    '钻石客户': CustomerLevel.DIAMOND,
    '白银客户': CustomerLevel.SILVER,
    '银牌客户': CustomerLevel.SILVER,
    'normal': CustomerLevel.BRONZE,
    'bronze': CustomerLevel.BRONZE,
    'silver': CustomerLevel.SILVER,
    'gold': CustomerLevel.GOLD,
    'diamond': CustomerLevel.DIAMOND
  }

  return mapping[level] || CustomerLevel.BRONZE
}
