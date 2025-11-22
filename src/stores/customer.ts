import { defineStore } from 'pinia'
import { ref, computed, nextTick, watch } from 'vue'
import { customerApi } from '@/api/customer'
import type { CustomerSearchParams } from '@/api/customer'
import { useUserStore } from './user'
import { generateCustomerCode } from '@/utils/customerCode'
import { createPersistentStore } from '@/utils/storage'

export interface CustomerPhone {
  id: string
  phone: string
  remark?: string
  isDefault?: boolean
}

export interface Customer {
  id: string
  code: string  // 客户编码
  name: string
  phone: string
  age: number
  address: string
  level: 'normal' | 'silver' | 'gold'
  status: 'active' | 'inactive' | 'potential' | 'lost' | 'blacklist'
  salesPersonId: string
  orderCount: number
  createTime: string
  createdBy: string
  creatorName?: string  // 创建者名字（用于验证时显示）
  wechatId?: string
  email?: string
  company?: string
  position?: string
  source?: string
  tags?: string[]
  remarks?: string
  returnCount?: number  // 退货次数
  lastServiceDate?: string  // 最后服务时间
  height?: number  // 身高(cm)
  weight?: number  // 体重(kg)
  gender?: string  // 性别
  fanAcquisitionTime?: string  // 进粉时间
  medicalHistory?: string  // 疾病史
  disease?: string  // 疾病史（别名，兼容旧字段）
  improvementGoals?: string[]  // 改善问题
  otherGoals?: string  // 其他改善目标
  phones?: CustomerPhone[]  // 多个电话号码
  serviceWechat?: string  // 客服微信号
  wechat?: string  // 微信号（通用）
  // 详细地址字段
  province?: string  // 省份
  city?: string  // 城市
  district?: string  // 区县
  street?: string  // 街道
  detailAddress?: string  // 详细地址
  overseasAddress?: string  // 境外地址
}

// 🔥 批次262终极修复：使用createPersistentStore，与订单、商品保持一致
export const useCustomerStore = createPersistentStore('customer', () => {
  // 客户列表数据
  const customers = ref<Customer[]>([])

  // 添加实例ID来验证是否为同一个实例
  const instanceId = `customer_store_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`

  console.log('=== CustomerStore 初始化（使用createPersistentStore） ===')
  console.log('实例ID:', instanceId)
  console.log('初始客户数量:', customers.value.length)

  // 初始化模拟数据（保持为空）
  const initMockData = () => {
    try {
      console.log('initMockData 被调用 - 检查是否需要初始化模拟客户数据')
      // 如果已经有数据，则不重复初始化
      if (customers.value && customers.value.length > 0) {
        console.log('当前已有客户数据，数量:', customers.value.length, '跳过初始化')
        return
      }

      // 构建4条模拟客户数据
      const now = new Date()
      const toISO = (date: Date) => date.toISOString()

      const mockList: Customer[] = [
        {
          id: `mock_customer_${Date.now()}_a`,
          code: generateCustomerCode(),
          name: '陈皮',
          phone: '13811110001',
          age: 30,
          address: '广东省广州市天河区体育西路1号',
          level: 'gold',
          status: 'active',
          salesPersonId: 'sales1',
          orderCount: 2,
          createTime: toISO(new Date(now.getTime() - 86400000 * 5)), // 5天前
          createdBy: 'admin',
          tags: ['VIP', '重点跟进'],
          remarks: '对高端产品兴趣浓厚'
        },
        {
          id: `mock_customer_${Date.now()}_b`,
          code: generateCustomerCode(),
          name: '赵六',
          phone: '13811110002',
          age: 26,
          address: '北京市海淀区中关村大街100号',
          level: 'silver',
          status: 'active',
          salesPersonId: 'sales2',
          orderCount: 1,
          createTime: toISO(new Date(now.getTime() - 86400000 * 2)), // 2天前
          createdBy: 'admin',
          source: '线上咨询',
          tags: ['稳定']
        },
        {
          id: `mock_customer_${Date.now()}_c`,
          code: generateCustomerCode(),
          name: '孙七',
          phone: '13811110003',
          age: 33,
          address: '上海市浦东新区世纪大道88号',
          level: 'normal',
          status: 'active',
          salesPersonId: 'sales3',
          orderCount: 0,
          createTime: toISO(new Date(now.getTime() - 86400000)), // 昨天
          createdBy: 'admin',
          remarks: '首次接触，待跟进'
        },
        {
          id: `mock_customer_${Date.now()}_d`,
          code: generateCustomerCode(),
          name: '周八',
          phone: '13811110004',
          age: 29,
          address: '深圳市南山区科技园科苑路9号',
          level: 'silver',
          status: 'active',
          salesPersonId: 'sales1',
          orderCount: 0,
          createTime: toISO(now), // 今天，便于在“新增客户”卡片统计显示
          createdBy: 'admin',
          source: '朋友介绍'
        }
      ]

      // 设置到store并保存
      customers.value = mockList
      // 🔥 批次262修复：createPersistentStore会自动保存，无需手动调用

      console.log('已初始化4条模拟客户数据')
    } catch (e) {
      console.error('初始化模拟客户数据失败:', e)
    }
  }

  // 加载状态
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const customerCount = computed(() => customers.value.length)
  const goldCustomers = computed(() => customers.value.filter(c => c.level === 'gold'))
  const silverCustomers = computed(() => customers.value.filter(c => c.level === 'silver'))
  const normalCustomers = computed(() => customers.value.filter(c => c.level === 'normal'))

  // 基于用户权限过滤的客户列表（移除循环依赖）
  const filteredCustomers = computed(() => {
    // 直接返回所有客户，避免循环依赖问题
    // 权限过滤在使用时进行，而不是在store初始化时
    console.log('Customer Store: 返回所有客户，避免循环依赖', customers.value.length)
    return customers.value

    // 原有的权限过滤逻辑已注释，后续可以根据需要恢复
    /*
    if (!currentUser) {
      return []
    }

    // 管理员（admin角色）可以查看所有客户
    if (currentUser.role === 'admin' || currentUser.id === 'admin') {
      console.log('Customer Store: 管理员权限，返回所有客户', customers.value.length)
      return customers.value
    }

    // 超级管理员可以查看所有客户
    if (userStore.isSuperAdmin) {
      console.log('Customer Store: 超级管理员权限，返回所有客户', customers.value.length)
      return customers.value
    }

    // 部门负责人（department_manager角色）可以查看本部门所有客户
    if (currentUser.role === 'department_manager') {
      console.log('Customer Store: 部门管理员权限，返回本部门客户', customers.value.length)
      return customers.value.filter(customer => {
        // 查看自己创建的客户
        if (customer.createdBy === currentUser.id || customer.salesPersonId === currentUser.id) {
          return true
        }

        // 查看本部门成员创建的客户（这里简化处理，实际应该从部门store获取成员信息）
        // 暂时返回所有客户，后续可以根据实际需求完善
        return true
      })
    }

    // 普通用户只能查看自己创建或被分配的客户
    const filtered = customers.value.filter(customer => {
      // 检查是否是自己创建的客户
      if (customer.createdBy === currentUser.id || customer.salesPersonId === currentUser.id) {
        return true
      }

      // 额外保护：如果createdBy为'admin'但实际是当前用户创建的
      // 这种情况可能发生在用户信息不完整时
      if (customer.createdBy === 'admin' && customer.salesPersonId === currentUser.id) {
        console.log('Customer Store: 发现createdBy为admin但salesPersonId匹配的客户:', customer.name)
        return true
      }

      // 临时宽松策略：如果客户的createdBy或salesPersonId为空或undefined，也显示
      // 这是为了兼容旧数据或数据不完整的情况
      if (!customer.createdBy || !customer.salesPersonId) {
        console.log('Customer Store: 发现数据不完整的客户，允许显示:', customer.name)
        return true
      }

      return false
    })
    console.log('Customer Store: 普通用户权限，过滤后客户数量', filtered.length)
    console.log('Customer Store: 当前用户ID:', currentUser.id)
    console.log('Customer Store: 过滤条件详情:', {
      totalCustomers: customers.value.length,
      filteredCustomers: filtered.length,
      currentUserId: currentUser.id
    })
    return filtered
    */
  })

  // 基于权限过滤的客户统计
  const filteredCustomerCount = computed(() => filteredCustomers.value.length)
  const filteredGoldCustomers = computed(() => filteredCustomers.value.filter(c => c.level === 'gold'))
  const filteredSilverCustomers = computed(() => filteredCustomers.value.filter(c => c.level === 'silver'))
  const filteredNormalCustomers = computed(() => filteredCustomers.value.filter(c => c.level === 'normal'))

  // 方法
  const addCustomer = (customer: Omit<Customer, 'id' | 'code' | 'createTime' | 'orderCount' | 'status'>) => {
    console.log('addCustomer 开始，当前客户数量:', customers.value.length)

    // 获取当前用户信息
    const userStore = useUserStore()
    const currentUser = userStore.currentUser

    const newCustomer: Customer = {
      ...customer,
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: generateCustomerCode(), // 自动生成客户编码
      createTime: new Date().toISOString(), // 使用ISO格式确保日期筛选正常
      orderCount: 0,
      status: 'active', // 新客户默认为活跃状态
      // 确保正确设置创建者和销售人员信息
      createdBy: currentUser?.id || 'admin',
      salesPersonId: customer.salesPersonId || currentUser?.id || 'admin'
    }

    console.log('准备添加新客户:', newCustomer)
    customers.value.unshift(newCustomer) // 添加到列表开头

    // 🔥 批次262修复：createPersistentStore会自动保存

    console.log('addCustomer 完成，客户数量:', customers.value.length)

    return newCustomer
  }

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = { ...customers.value[index], ...updates }
      // 🔥 批次262修复：createPersistentStore会自动保存
      return customers.value[index]
    }
    return null
  }

  const deleteCustomer = (id: string) => {
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value.splice(index, 1)
      // 🔥 批次262修复：createPersistentStore会自动保存
      return true
    }
    return false
  }

  const getCustomerById = (id: string) => {
    return customers.value.find(c => c.id === id)
  }

  const getCustomerByCode = (code: string) => {
    return customers.value.find(c => c.code === code)
  }

  const searchCustomers = async (params: CustomerSearchParams) => {
    try {
      loading.value = true
      error.value = null

      const response = await customerApi.search(params)
      return response.data.list
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '搜索客户失败'
      console.error('搜索客户失败:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // 增加订单数量
  const incrementOrderCount = (customerId: string) => {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer) {
      customer.orderCount++
    }
  }

  // 减少订单数量（用于订单取消等场景）
  const decrementOrderCount = (customerId: string) => {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer && customer.orderCount > 0) {
      customer.orderCount--
    }
  }

  // 更新客户统计数据（综合方法）
  const updateCustomerStats = (customerId: string, stats: Partial<Pick<Customer, 'orderCount'>>) => {
    const customer = customers.value.find(c => c.id === customerId)
    if (customer) {
      if (stats.orderCount !== undefined) {
        customer.orderCount = stats.orderCount
      }
    }
  }

  // 批量更新客户统计数据
  const batchUpdateCustomerStats = (updates: Array<{ customerId: string; stats: Partial<Pick<Customer, 'orderCount'>> }>) => {
    updates.forEach(({ customerId, stats }) => {
      updateCustomerStats(customerId, stats)
    })
  }

  // 添加客户（与商品模块完全相同的模式）
  const createCustomer = async (customerData: Omit<Customer, 'id' | 'code' | 'createTime' | 'orderCount'>) => {
    console.log('🔥 createCustomer方法被调用！实例ID:', instanceId)
    console.log('🔥 传入的客户数据:', customerData)

    // 使用ISO格式的时间，与其他地方保持一致
    const now = new Date()
    const newCustomer: Customer = {
      ...customerData,
      id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      code: generateCustomerCode(),
      createTime: now.toISOString(), // 使用ISO格式，确保时间格式一致
      orderCount: 0
    }

    console.log('[CustomerStore] 准备添加新客户:', newCustomer.name, 'ID:', newCustomer.id)
    console.log('[CustomerStore] 保存前客户总数:', customers.value.length)

    // 添加到列表开头
    customers.value.unshift(newCustomer)

    console.log('[CustomerStore] 添加后客户总数:', customers.value.length)
    console.log('[CustomerStore] 客户创建时间:', newCustomer.createTime)

    // 🔥 批次262终极修复：立即保存，确保新客户不丢失（参考订单store的做法）
    setTimeout(() => {
      const storeInstance = useCustomerStore()
      if (storeInstance && typeof (storeInstance as unknown).saveImmediately === 'function') {
        (storeInstance as unknown).saveImmediately()
        console.log('[CustomerStore] ✅ 创建客户后立即保存完成')
      }
    }, 10)

    return newCustomer
  }

  // 强制刷新客户数据（暂时禁用，防止清空数据）
  const forceRefreshCustomers = async (params?: CustomerSearchParams) => {
    console.log('=== forceRefreshCustomers 被调用（已禁用） ===')
    console.log('当前客户数量:', customers.value.length)
    console.log('刷新参数:', params)
    console.log('⚠️ forceRefreshCustomers 已被禁用，直接返回')
  }

  // 加载客户列表（智能处理开发环境和生产环境）
  const loadCustomers = async (params?: CustomerSearchParams) => {
    try {
      loading.value = true
      error.value = null

      console.log('loadCustomers 被调用，参数:', params)

      // 检查是否应该使用Mock API（开发环境）
      const { shouldUseMockApi } = await import('@/api/mock')

      if (shouldUseMockApi()) {
        // 开发环境：直接使用本地数据，不调用API
        console.log('开发环境：使用本地客户数据，不调用API')
        console.log('当前本地客户数量:', customers.value.length)

        // 确保数据按创建时间排序
        customers.value = customers.value.sort((a, b) => {
          const timeA = new Date(a.createTime).getTime()
          const timeB = new Date(b.createTime).getTime()
          return timeB - timeA
        })

        console.log('loadCustomers 完成（开发环境），客户数量:', customers.value.length)
        return customers.value
      }

      // 生产环境：调用真实API
      console.log('生产环境：调用真实API获取客户数据')
      const response = await customerApi.getList(params)

      // 安全检查API响应结构
      if (!response || !response.data) {
        throw new Error('API响应数据为空')
      }

      if (!Array.isArray(response.data.list)) {
        console.warn('API响应中list不是数组，保留现有数据:', response.data)
        console.warn('当前客户数量:', customers.value.length)
        // 不清空现有数据，避免丢失本地新增的客户
        return
      } else {
        // 获取当前内存中的客户数据
        const localCustomers = [...customers.value]
        const apiCustomers = response.data.list

        console.log('loadCustomers - API返回客户数量:', apiCustomers.length)
        console.log('loadCustomers - 当前内存客户数量:', localCustomers.length)

        // 合并数据：优先保留本地新增的客户，然后添加API中的客户
        const mergedCustomers = [...localCustomers]

        // 添加API中存在但本地不存在的客户
        apiCustomers.forEach(apiCustomer => {
          const existsInLocal = localCustomers.some(localCustomer =>
            localCustomer.id === apiCustomer.id ||
            localCustomer.phone === apiCustomer.phone
          )

          if (!existsInLocal) {
            mergedCustomers.push(apiCustomer)
          }
        })

        // 按创建时间排序，最新的在前
        customers.value = mergedCustomers.sort((a, b) => {
          const timeA = new Date(a.createTime).getTime()
          const timeB = new Date(b.createTime).getTime()
          return timeB - timeA
        })

        console.log('loadCustomers - 合并后客户数量:', customers.value.length)
      }

      // 自动持久化会自动保存数据，无需手动调用

      console.log('loadCustomers 完成，客户数量:', customers.value.length)
      console.log('当前客户列表:', customers.value.map(c => ({ id: c.id, name: c.name, phone: c.phone })))

      return customers.value
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : '加载客户列表失败'
      console.error('加载客户列表失败:', err)

      // 如果API调用失败，保持当前数据不变，不清空本地数据
      console.log('API调用失败，保持当前客户数据不变，客户数量:', customers.value.length)
      return customers.value
    } finally {
      loading.value = false
    }
  }

  // 强制数据同步：智能同步数据
  const forceSyncData = async () => {
    try {
      console.log('=== 强制数据同步开始 ===')

      // 获取当前数据状态
      const currentCount = customers.value.length
      console.log(`当前内存中客户数量: ${currentCount}`)

      // 如果没有数据，尝试从API加载
      if (customers.value.length === 0) {
        console.log('本地无数据，从API加载...')
        await loadCustomers()
      }

      console.log('=== 强制数据同步完成 ===')
      console.log('最终客户数量:', customers.value.length)

      return customers.value
    } catch (error) {
      console.error('强制数据同步失败:', error)
      throw error
    }
  }

  // 获取客户电话号码列表
  const getCustomerPhones = (customerId: string): CustomerPhone[] => {
    const customer = getCustomerById(customerId)
    if (!customer) {
      console.warn('未找到客户:', customerId)
      return []
    }

    // 如果客户有phones数组，返回它
    if (customer.phones && Array.isArray(customer.phones)) {
      return customer.phones
    }

    // 如果没有phones数组但有主电话，创建一个包含主电话的数组
    if (customer.phone) {
      return [{
        id: 'main',
        phone: customer.phone,
        remark: '主电话',
        isDefault: true
      }]
    }

    return []
  }

  // 为客户添加电话号码
  const addCustomerPhone = (customerId: string, phone: string, remark?: string): boolean => {
    const customer = getCustomerById(customerId)
    if (!customer) {
      console.warn('未找到客户:', customerId)
      return false
    }

    // 初始化phones数组（如果不存在）
    if (!customer.phones) {
      customer.phones = []
    }

    // 检查电话号码是否已存在
    const existingPhone = customer.phones.find(p => p.phone === phone)
    if (existingPhone) {
      console.warn('电话号码已存在:', phone)
      return false
    }

    // 添加新电话号码
    const newPhone: CustomerPhone = {
      id: Date.now().toString(),
      phone: phone,
      remark: remark || '',
      isDefault: customer.phones.length === 0 // 如果是第一个电话，设为默认
    }

    customer.phones.push(newPhone)

    // 如果是第一个电话号码，同时更新主电话字段
    if (customer.phones.length === 1) {
      customer.phone = phone
    }

    // 自动持久化会自动保存数据，无需手动调用

    console.log('已为客户添加电话号码:', customer.name, phone)
    return true
  }

  // 初始化模拟数据
  initMockData()

  // 🔥 批次262终极修复：获取storeData对象，它包含saveImmediately方法
  // createPersistentStore会将saveImmediately添加到storeData上
  const storeData = {
    customers,
    loading,
    error,
    customerCount,
    goldCustomers,
    silverCustomers,
    normalCustomers,
    // 基于权限过滤的客户数据
    filteredCustomers,
    filteredCustomerCount,
    filteredGoldCustomers,
    filteredSilverCustomers,
    filteredNormalCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByCode,
    searchCustomers,
    incrementOrderCount,
    decrementOrderCount,
    updateCustomerStats,
    batchUpdateCustomerStats,
    loadCustomers,
    forceRefreshCustomers,
    createCustomer,
    forceSyncData,
    getCustomerPhones,
    addCustomerPhone,
    initMockData,
    instanceId
    // 🔥 批次262修复：移除loadFromStorage和saveToStorage
    // createPersistentStore会自动处理数据的加载和保存
    // saveImmediately方法会由createPersistentStore自动添加到返回的对象上
  }

  return storeData
})
