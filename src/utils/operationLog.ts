import { useAuthStore } from '@/stores/auth'

export interface OperationLog {
  id: string
  module: string
  action: string
  target: string
  targetId: string
  details: string
  userId: string
  userName: string
  timestamp: string
  ip?: string
  userAgent?: string
}

// 记录操作日志
export function logOperation(
  module: string,
  action: string,
  target: string,
  targetId: string,
  details: string
) {
  const authStore = useAuthStore()
  const user = authStore.user

  const log: OperationLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    module,
    action,
    target,
    targetId,
    details,
    userId: user?.id || '',
    userName: user?.name || '',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent
  }

  // 保存到localStorage(生产环境应该发送到后端)
  const logs = JSON.parse(localStorage.getItem('operation_logs') || '[]')
  logs.push(log)

  // 只保留最近1000条
  if (logs.length > 1000) {
    logs.splice(0, logs.length - 1000)
  }

  localStorage.setItem('operation_logs', JSON.stringify(logs))

  console.log('[操作日志]', log)
}

// 售后模块专用日志记录
export const ServiceLog = {
  // 查看售后
  view: (serviceId: string, serviceNumber: string) => {
    logOperation('售后管理', '查看', '售后单', serviceId, `查看售后单: ${serviceNumber}`)
  },

  // 创建售后
  create: (serviceId: string, serviceNumber: string) => {
    logOperation('售后管理', '创建', '售后单', serviceId, `创建售后单: ${serviceNumber}`)
  },

  // 编辑售后
  edit: (serviceId: string, serviceNumber: string, changes: string) => {
    logOperation(
      '售后管理',
      '编辑',
      '售后单',
      serviceId,
      `编辑售后单: ${serviceNumber}, 变更: ${changes}`
    )
  },

  // 删除售后
  delete: (serviceId: string, serviceNumber: string) => {
    logOperation('售后管理', '删除', '售后单', serviceId, `删除售后单: ${serviceNumber}`)
  },

  // 分配处理人
  assign: (serviceId: string, serviceNumber: string, assignTo: string) => {
    logOperation(
      '售后管理',
      '分配',
      '售后单',
      serviceId,
      `分配售后单: ${serviceNumber} 给 ${assignTo}`
    )
  },

  // 关闭售后
  close: (serviceId: string, serviceNumber: string) => {
    logOperation('售后管理', '关闭', '售后单', serviceId, `关闭售后单: ${serviceNumber}`)
  },

  // 导出数据
  export: (count: number, filters: string) => {
    logOperation(
      '售后管理',
      '导出',
      '售后数据',
      '',
      `导出${count}条售后数据, 筛选条件: ${filters}`
    )
  }
}
