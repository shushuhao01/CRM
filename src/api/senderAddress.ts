/**
 * 寄件人/退货地址 前端API
 */
import { api } from './request'

export interface SenderAddressItem {
  id: string
  tenantId?: string
  type: 'sender' | 'return'
  name: string
  phone: string
  province?: string
  city?: string
  district?: string
  address: string
  fullAddress?: string
  isDefault: number
  sortOrder: number
  remark?: string
  linkedServiceTypes?: string[]
  createdBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface SenderAddressForm {
  type: 'sender' | 'return'
  name: string
  phone: string
  province?: string
  city?: string
  district?: string
  address: string
  remark?: string
  linkedServiceTypes?: string[]
  isDefault?: boolean
}

export const senderAddressApi = {
  /** 获取寄件人/退货地址列表 */
  async getList(type?: 'sender' | 'return'): Promise<{ success: boolean; data: SenderAddressItem[] }> {
    const params: Record<string, string> = {}
    if (type) params.type = type
    return api.get('/logistics/sender-addresses', { params })
  },

  /** 获取默认寄件人/退货地址 */
  async getDefault(type: 'sender' | 'return' = 'sender'): Promise<{ success: boolean; data: SenderAddressItem | null }> {
    return api.get('/logistics/sender-addresses/default', { params: { type } })
  },

  /** 创建寄件人/退货地址 */
  async create(data: SenderAddressForm): Promise<{ success: boolean; data: SenderAddressItem; message: string }> {
    return api.post('/logistics/sender-addresses', data as unknown as Record<string, unknown>)
  },

  /** 更新寄件人/退货地址 */
  async update(id: string, data: Partial<SenderAddressForm>): Promise<{ success: boolean; data: SenderAddressItem; message: string }> {
    return api.put(`/logistics/sender-addresses/${id}`, data as unknown as Record<string, unknown>)
  },

  /** 删除寄件人/退货地址 */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    return api.delete(`/logistics/sender-addresses/${id}`)
  },

  /** 设为默认 */
  async setDefault(id: string): Promise<{ success: boolean; data: SenderAddressItem; message: string }> {
    return api.put(`/logistics/sender-addresses/${id}/set-default`)
  },

  /** 取消默认 */
  async cancelDefault(id: string): Promise<{ success: boolean; data: SenderAddressItem; message: string }> {
    return api.put(`/logistics/sender-addresses/${id}/cancel-default`)
  }
}

