// 手机号同步服务
import { ElMessage } from 'element-plus'

export interface PhoneRecord {
  id: number
  phone: string
  remark: string
  customerId?: string
  contactId?: string
  createTime?: string
  operator?: string
}

export interface SyncResult {
  success: boolean
  message: string
  data?: any
}

/**
 * 手机号同步服务类
 */
export class PhoneSyncService {
  /**
   * 同步客户手机号到客户详情页
   * @param customerId 客户ID
   * @param phoneRecord 手机号记录
   */
  static async syncCustomerPhone(customerId: string, phoneRecord: PhoneRecord): Promise<SyncResult> {
    try {
      console.log('同步客户手机号:', { customerId, phoneRecord })
      
      // 模拟API调用 - 将手机号添加到客户的手机号列表
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 这里应该调用实际的API来更新客户信息
      // const response = await customerApi.addPhone(customerId, phoneRecord)
      
      // 模拟成功响应
      const mockResponse = {
        success: true,
        data: {
          id: Date.now(),
          customerId,
          phone: phoneRecord.phone,
          remark: phoneRecord.remark,
          createTime: new Date().toISOString(),
          operator: '系统自动同步'
        }
      }
      
      if (mockResponse.success) {
        // 触发客户详情页的数据刷新
        this.notifyCustomerDetailUpdate(customerId)
        
        return {
          success: true,
          message: '客户手机号同步成功',
          data: mockResponse.data
        }
      } else {
        return {
          success: false,
          message: '同步失败，请稍后重试'
        }
      }
    } catch (error) {
      console.error('同步客户手机号失败:', error)
      return {
        success: false,
        message: '同步失败，网络错误'
      }
    }
  }

  /**
   * 同步联系人手机号到联系人详情页
   * @param contactId 联系人ID
   * @param phoneRecord 手机号记录
   */
  static async syncContactPhone(contactId: string, phoneRecord: PhoneRecord): Promise<SyncResult> {
    try {
      console.log('同步联系人手机号:', { contactId, phoneRecord })
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 模拟成功响应
      const mockResponse = {
        success: true,
        data: {
          id: Date.now(),
          contactId,
          phone: phoneRecord.phone,
          remark: phoneRecord.remark,
          createTime: new Date().toISOString(),
          operator: '系统自动同步'
        }
      }
      
      if (mockResponse.success) {
        return {
          success: true,
          message: '联系人手机号同步成功',
          data: mockResponse.data
        }
      } else {
        return {
          success: false,
          message: '同步失败，请稍后重试'
        }
      }
    } catch (error) {
      console.error('同步联系人手机号失败:', error)
      return {
        success: false,
        message: '同步失败，网络错误'
      }
    }
  }

  /**
   * 批量同步手机号
   * @param syncData 同步数据列表
   */
  static async batchSyncPhones(syncData: Array<{
    type: 'customer' | 'contact'
    id: string
    phoneRecord: PhoneRecord
  }>): Promise<SyncResult[]> {
    const results: SyncResult[] = []
    
    for (const item of syncData) {
      if (item.type === 'customer') {
        const result = await this.syncCustomerPhone(item.id, item.phoneRecord)
        results.push(result)
      } else if (item.type === 'contact') {
        const result = await this.syncContactPhone(item.id, item.phoneRecord)
        results.push(result)
      }
    }
    
    return results
  }

  /**
   * 通知客户详情页更新数据
   * @param customerId 客户ID
   */
  private static notifyCustomerDetailUpdate(customerId: string) {
    // 使用事件总线或状态管理来通知客户详情页刷新数据
    // 这里可以使用 EventBus 或者 Pinia store 来实现
    console.log('通知客户详情页更新数据:', customerId)
    
    // 发送自定义事件
    window.dispatchEvent(new CustomEvent('customer-phone-updated', {
      detail: { customerId }
    }))
  }

  /**
   * 验证手机号格式
   * @param phone 手机号
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/
    return phoneRegex.test(phone)
  }

  /**
   * 检查手机号是否重复
   * @param phone 手机号
   * @param existingPhones 已存在的手机号列表
   */
  static checkPhoneDuplicate(phone: string, existingPhones: string[]): boolean {
    return existingPhones.includes(phone)
  }
}

// 导出默认实例
export const phoneSyncService = new PhoneSyncService()