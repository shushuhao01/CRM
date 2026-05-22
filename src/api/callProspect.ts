import { api } from './request'

export interface CallProspect {
  id: string
  tenantId?: string
  name: string
  phone: string
  gender?: string
  company?: string
  remark?: string
  source?: string
  tags?: string[]
  status: 'pending' | 'called' | 'converted' | 'invalid'
  callCount: number
  lastCallTime?: string
  lastCallStatus?: string
  assignedTo?: string
  assignedName?: string
  convertedCustomerId?: string
  convertedAt?: string
  importBatchId?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export const prospectApi = {
  getList(params: { page?: number; pageSize?: number; keyword?: string; status?: string; assignedTo?: string; recycled?: string; includeCustomers?: string }) {
    return api.get('/calls/prospects', { params })
  },

  create(data: { name: string; phone: string; gender?: string; company?: string; remark?: string; tags?: string[]; assignedTo?: string; assignedName?: string }) {
    return api.post('/calls/prospects', data)
  },

  update(id: string, data: Partial<CallProspect>) {
    return api.put(`/calls/prospects/${id}`, data)
  },

  delete(id: string) {
    return api.delete(`/calls/prospects/${id}`)
  },

  batchDelete(ids: string[], permanent = false) {
    return api.post('/calls/prospects/batch-delete', { ids, permanent })
  },

  checkPhones(phones: string[]) {
    return api.post('/calls/prospects/check-phones', { phones })
  },

  batchImport(records: Array<{ name: string; phone: string; gender?: string; company?: string; remark?: string; tags?: string }>) {
    return api.post('/calls/prospects/batch-import', { records })
  },

  batchAssign(ids: string[], assignedTo: string, assignedName: string) {
    return api.post('/calls/prospects/batch-assign', { ids, assignedTo, assignedName })
  },

  convert(ids: string[]) {
    return api.post('/calls/prospects/convert', { ids })
  },

  restore(ids: string[]) {
    return api.post('/calls/prospects/restore', { ids })
  },

  getLogs(prospectId: string) {
    return api.get(`/calls/prospects/${prospectId}/logs`)
  }
}
