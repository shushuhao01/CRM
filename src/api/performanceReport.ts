import { api as request } from './request'

export const performanceReportApi = {
  // 获取业绩报表配置列表
  getConfigs: () => {
    return request.get('/performance-report/configs')
  },

  // 创建业绩报表配置
  createConfig: (data: {
    name: string
    sendFrequency?: string
    sendTime?: string
    sendDays?: number[]
    repeatType?: string
    reportTypes: string[]
    channelType: string
    webhook: string
    secret?: string
    viewScope?: string
    targetDepartments?: string[]
    includeMonthly?: boolean
    includeRanking?: boolean
    rankingLimit?: number
  }) => {
    return request.post('/performance-report/configs', data)
  },

  // 更新业绩报表配置
  updateConfig: (id: string, data: any) => {
    return request.put(`/performance-report/configs/${id}`, data)
  },

  // 删除业绩报表配置
  deleteConfig: (id: string) => {
    return request.delete(`/performance-report/configs/${id}`)
  },

  // 获取报表类型选项
  getReportTypes: () => {
    return request.get('/performance-report/types')
  },

  // 预览业绩数据
  previewReport: (data: {
    reportTypes?: string[]
    viewScope?: string
    targetDepartments?: string[]
  }) => {
    return request.post('/performance-report/preview', data)
  },

  // 测试发送
  testSend: (id: string) => {
    return request.post(`/performance-report/configs/${id}/test`)
  }
}
