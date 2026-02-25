import { request } from '@/utils/request'

export interface CodApplication {
  id: string
  orderId: string
  orderNumber: string
  applicantId: string
  applicantName: string
  departmentId: string | null
  departmentName: string | null
  originalCodAmount: number
  modifiedCodAmount: number
  cancelReason: string
  paymentProof: string[] | null
  status: string
  reviewerId: string | null
  reviewerName: string | null
  reviewRemark: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  trackingNumber?: string | null
  expressCompany?: string | null
  customerPhone?: string | null
}

export interface CodApplicationStats {
  pending: number
  approved: number
  rejected: number
  total: number
}

// 上传尾款凭证
export const uploadProof = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/cod-application/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

// 创建申请
export const createApplication = (data: {
  orderId: string
  modifiedCodAmount: number
  cancelReason: string
  paymentProof: string[]
}) => {
  return request.post('/cod-application/create', data)
}

// 更新申请
export const updateApplication = (id: string, data: {
  modifiedCodAmount: number
  cancelReason: string
  paymentProof: string[]
}) => {
  return request.put(`/cod-application/update/${id}`, data)
}

// 获取我的申请列表
export const getMyApplications = (params: {
  page?: number
  pageSize?: number
  status?: string
  startDate?: string
  endDate?: string
  keywords?: string
}) => {
  return request.get('/cod-application/my-list', { params })
}

// 获取审核列表
export const getReviewList = (params: {
  page?: number
  pageSize?: number
  status?: string
  departmentId?: string
  applicantId?: string
  startDate?: string
  endDate?: string
  keywords?: string
}) => {
  return request.get('/cod-application/review-list', { params })
}

// 获取申请详情
export const getApplicationDetail = (id: string) => {
  return request.get(`/cod-application/detail/${id}`)
}

// 审核申请
export const reviewApplication = (id: string, data: {
  approved: boolean
  reviewRemark?: string
}) => {
  return request.put(`/cod-application/review/${id}`, data)
}

// 撤销申请
export const cancelApplication = (id: string) => {
  return request.delete(`/cod-application/cancel/${id}`)
}

// 获取统计数据
export const getApplicationStats = (type: 'my' | 'review') => {
  return request.get('/cod-application/stats', { params: { type } })
}
