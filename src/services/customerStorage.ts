/**
 * 统一的客户数据存储服务
 * 确保所有客户数据操作都通过这个唯一的存储路径
 */

import type { Customer } from '@/api/customer'

// 唯一的存储键名
const CUSTOMER_STORAGE_KEY = 'crm_customers_unified'

// 存储数据结构
interface CustomerStorageData {
  customers: Customer[]
  lastUpdated: number
  version: string
}

/**
 * 客户存储服务类
 */
export class CustomerStorageService {
  private static instance: CustomerStorageService
  private storageKey = CUSTOMER_STORAGE_KEY

  // 单例模式，确保全局只有一个存储实例
  public static getInstance(): CustomerStorageService {
    if (!CustomerStorageService.instance) {
      CustomerStorageService.instance = new CustomerStorageService()
    }
    return CustomerStorageService.instance
  }

  private constructor() {
    console.log('CustomerStorageService 初始化，存储键:', this.storageKey)
  }

  /**
   * 获取所有客户数据
   */
  public getAllCustomers(): Customer[] {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) {
        console.log('没有找到存储的客户数据，返回空数组')
        return []
      }

      const data: CustomerStorageData = JSON.parse(stored)
      
      // 检查数据结构是否正确
      if (!data || !Array.isArray(data.customers)) {
        console.warn('存储的数据结构不正确，清除并返回空数组')
        localStorage.removeItem(this.storageKey)
        return []
      }
      
      console.log(`从存储中读取到 ${data.customers.length} 个客户`)
      return data.customers
    } catch (error) {
      console.error('读取客户数据失败:', error)
      // 清除损坏的数据
      localStorage.removeItem(this.storageKey)
      return []
    }
  }

  /**
   * 保存所有客户数据
   */
  public saveAllCustomers(customers: Customer[]): void {
    try {
      const data: CustomerStorageData = {
        customers,
        lastUpdated: Date.now(),
        version: '1.0.0'
      }

      localStorage.setItem(this.storageKey, JSON.stringify(data))
      console.log(`成功保存 ${customers.length} 个客户到存储`)
    } catch (error) {
      console.error('保存客户数据失败:', error)
      throw new Error('保存客户数据失败')
    }
  }

  /**
   * 添加新客户
   */
  public addCustomer(customer: Customer): Customer {
    try {
      const customers = this.getAllCustomers()
      
      // 检查是否已存在相同手机号的客户
      const existingIndex = customers.findIndex(c => c.phone === customer.phone)
      if (existingIndex !== -1) {
        throw new Error(`手机号 ${customer.phone} 已存在`)
      }

      // 添加到列表开头（最新的在前面）
      customers.unshift(customer)
      
      // 保存更新后的数据
      this.saveAllCustomers(customers)
      
      console.log(`成功添加客户: ${customer.name} (${customer.phone})`)
      return customer
    } catch (error) {
      console.error('添加客户失败:', error)
      throw error
    }
  }

  /**
   * 更新客户信息
   */
  public updateCustomer(customerId: string, updates: Partial<Customer>): Customer {
    try {
      const customers = this.getAllCustomers()
      const index = customers.findIndex(c => c.id === customerId)
      
      if (index === -1) {
        throw new Error(`客户 ${customerId} 不存在`)
      }

      // 更新客户信息
      customers[index] = { ...customers[index], ...updates }
      
      // 保存更新后的数据
      this.saveAllCustomers(customers)
      
      console.log(`成功更新客户: ${customers[index].name} (${customers[index].phone})`)
      return customers[index]
    } catch (error) {
      console.error('更新客户失败:', error)
      throw error
    }
  }

  /**
   * 删除客户
   */
  public deleteCustomer(customerId: string): boolean {
    try {
      const customers = this.getAllCustomers()
      const index = customers.findIndex(c => c.id === customerId)
      
      if (index === -1) {
        throw new Error(`客户 ${customerId} 不存在`)
      }

      const deletedCustomer = customers[index]
      customers.splice(index, 1)
      
      // 保存更新后的数据
      this.saveAllCustomers(customers)
      
      console.log(`成功删除客户: ${deletedCustomer.name} (${deletedCustomer.phone})`)
      return true
    } catch (error) {
      console.error('删除客户失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取客户
   */
  public getCustomerById(customerId: string): Customer | null {
    try {
      const customers = this.getAllCustomers()
      const customer = customers.find(c => c.id === customerId)
      return customer || null
    } catch (error) {
      console.error('获取客户失败:', error)
      return null
    }
  }

  /**
   * 根据手机号获取客户
   */
  public getCustomerByPhone(phone: string): Customer | null {
    try {
      const customers = this.getAllCustomers()
      const customer = customers.find(c => c.phone === phone)
      return customer || null
    } catch (error) {
      console.error('根据手机号获取客户失败:', error)
      return null
    }
  }

  /**
   * 检查手机号是否已存在
   */
  public checkPhoneExists(phone: string): boolean {
    try {
      const customer = this.getCustomerByPhone(phone)
      return customer !== null
    } catch (error) {
      console.error('检查手机号失败:', error)
      return false
    }
  }

  /**
   * 清空所有客户数据
   */
  public clearAllCustomers(): void {
    try {
      localStorage.removeItem(this.storageKey)
      console.log('已清空所有客户数据')
    } catch (error) {
      console.error('清空客户数据失败:', error)
      throw error
    }
  }

  /**
   * 获取存储统计信息
   */
  public getStorageStats(): {
    totalCustomers: number
    storageSize: number
    lastUpdated: number | null
    version: string | null
  } {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) {
        return {
          totalCustomers: 0,
          storageSize: 0,
          lastUpdated: null,
          version: null
        }
      }

      const data: CustomerStorageData = JSON.parse(stored)
      return {
        totalCustomers: data.customers.length,
        storageSize: stored.length,
        lastUpdated: data.lastUpdated,
        version: data.version
      }
    } catch (error) {
      console.error('获取存储统计失败:', error)
      return {
        totalCustomers: 0,
        storageSize: 0,
        lastUpdated: null,
        version: null
      }
    }
  }

  /**
   * 强制数据迁移：保留现有数据并合并旧格式数据
   */
  public forceMigrateFromOldStorage(): boolean {
    try {
      console.log('开始强制数据迁移...')
      
      // 保存当前的新格式数据
      const currentCustomers = this.getAllCustomers()
      console.log(`当前已有 ${currentCustomers.length} 个客户`)
      
      // 尝试从旧的存储键读取数据
      const oldKeys = ['crm_store_customer', 'crm_customers', 'customers', 'customer_data', 'mock_customers']
      let migratedCustomers: Customer[] = []

      for (const oldKey of oldKeys) {
        const oldData = localStorage.getItem(oldKey)
        if (oldData) {
          try {
            const parsed = JSON.parse(oldData)
            let customers: Customer[] = []

            // 处理不同的旧格式
            if (parsed.data && parsed.data.customers) {
              customers = parsed.data.customers
            } else if (parsed.customers) {
              customers = parsed.customers
            } else if (Array.isArray(parsed)) {
              customers = parsed
            }

            if (customers.length > 0) {
              migratedCustomers = customers
              console.log(`从 ${oldKey} 找到了 ${customers.length} 个客户`)
              break
            }
          } catch (error) {
            console.warn(`解析旧数据 ${oldKey} 失败:`, error)
          }
        }
      }

      // 合并数据：保留现有数据，只添加不存在的旧数据
      if (migratedCustomers.length > 0) {
        const existingPhones = new Set(currentCustomers.map(c => c.phone))
        const newCustomersFromOld = migratedCustomers.filter(c => !existingPhones.has(c.phone))
        
        if (newCustomersFromOld.length > 0) {
          const mergedCustomers = [...currentCustomers, ...newCustomersFromOld]
          this.saveAllCustomers(mergedCustomers)
          console.log(`数据迁移完成，合并了 ${newCustomersFromOld.length} 个旧客户，总计 ${mergedCustomers.length} 个客户`)
          
          // 清理旧数据
          oldKeys.forEach(key => {
            if (localStorage.getItem(key)) {
              localStorage.removeItem(key)
              console.log(`已清理旧存储键: ${key}`)
            }
          })
        } else {
          console.log('旧数据中没有新的客户需要迁移')
        }
      } else {
        console.log('没有找到可迁移的旧数据')
      }
      
      return true
    } catch (error) {
      console.error('强制数据迁移失败:', error)
      return false
    }
  }

  /**
   * 数据迁移：从旧的存储格式迁移到新格式
   */
  public migrateFromOldStorage(): boolean {
    try {
      console.log('开始数据迁移...')
      
      // 检查是否已有新格式数据
      const newData = localStorage.getItem(this.storageKey)
      if (newData) {
        console.log('新格式数据已存在，跳过迁移')
        return true
      }

      // 尝试从旧的存储键读取数据
      const oldKeys = ['crm_store_customer', 'crm_customers', 'customers', 'customer_data', 'mock_customers']
      let migratedCustomers: Customer[] = []

      for (const oldKey of oldKeys) {
        const oldData = localStorage.getItem(oldKey)
        if (oldData) {
          try {
            const parsed = JSON.parse(oldData)
            let customers: Customer[] = []

            // 处理不同的旧格式
            if (parsed.data && parsed.data.customers) {
              customers = parsed.data.customers
            } else if (parsed.customers) {
              customers = parsed.customers
            } else if (Array.isArray(parsed)) {
              customers = parsed
            }

            if (customers.length > 0) {
              migratedCustomers = customers
              console.log(`从 ${oldKey} 迁移了 ${customers.length} 个客户`)
              break
            }
          } catch (error) {
            console.warn(`解析旧数据 ${oldKey} 失败:`, error)
          }
        }
      }

      // 保存迁移的数据
      if (migratedCustomers.length > 0) {
        this.saveAllCustomers(migratedCustomers)
        console.log(`数据迁移完成，共迁移 ${migratedCustomers.length} 个客户`)
        
        // 清理旧数据
        oldKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key)
            console.log(`已清理旧存储键: ${key}`)
          }
        })
        
        return true
      } else {
        console.log('没有找到可迁移的旧数据')
        return false
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
      return false
    }
  }
}

// 导出单例实例
export const customerStorage = CustomerStorageService.getInstance()

// 页面加载时自动尝试数据迁移
if (typeof window !== 'undefined') {
  customerStorage.migrateFromOldStorage()
}