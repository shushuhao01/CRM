import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { serviceApi, type AfterSalesServiceData } from '@/api/service'
import { isProduction } from '@/utils/env'

export interface AfterSalesService {
  id: string
  serviceNumber: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  serviceType: 'return' | 'exchange' | 'repair' | 'refund' | 'complaint' | 'inquiry'
  status: 'pending' | 'processing' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  reason: string
  description: string
  createTime: string
  createdBy: string
  assignedTo?: string
  updateTime?: string
  expectedTime?: string
  remark?: string
  attachments?: string[]
  productName?: string
  productSpec?: string
  quantity?: number
  price?: number
  contactAddress?: string
  contactName?: string
  contactPhone?: string
  contactId?: string
  createdById?: string
  departmentId?: string
}

export const useServiceStore = defineStore('service', () => {
  // 售后服务列表数据
  const services = ref<AfterSalesService[]>([])
  const loading = ref(false)
  const total = ref(0)

  // 计算属性
  const serviceCount = computed(() => services.value.length)
  const afterSalesServices = computed(() => services.value)

  const pendingServices = computed(() =>
    services.value.filter(service => service.status === 'pending')
  )

  const processingServices = computed(() =>
    services.value.filter(service => service.status === 'processing')
  )

  /**
   * 加载售后服务列表
   */
  const loadAfterSalesServices = async (params: {
    page?: number
    limit?: number
    status?: string
    serviceType?: string
    search?: string
  } = {}) => {
    loading.value = true
    try {
      console.log('[ServiceStore] 加载售后服务列表...')

      if (isProduction()) {
        // 生产环境：调用真实API
        const response = await serviceApi.getList(params)
        services.value = (response.items || []).map(mapApiToLocal)
        total.value = response.total || 0
        console.log('[ServiceStore] API加载成功，共', services.value.length, '条记录')
      } else {
        // 开发环境：使用本地存储
        const localData = localStorage.getItem('crm_after_sales_services')
        if (localData) {
          services.value = JSON.parse(localData)
        }
        total.value = services.value.length
        console.log('[ServiceStore] 本地加载成功，共', services.value.length, '条记录')
      }

      return services.value
    } catch (error) {
      console.error('[ServiceStore] 加载售后服务列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取售后服务详情
   */
  const getServiceById = (id: string) => {
    return services.value.find(s => s.id === id)
  }

  /**
   * 获取售后服务详情（异步，从API获取）
   */
  const fetchServiceById = async (id: string): Promise<AfterSalesService | null> => {
    try {
      if (isProduction()) {
        const response = await serviceApi.getDetail(id)
        return mapApiToLocal(response)
      } else {
        return getServiceById(id) || null
      }
    } catch (error) {
      console.error('[ServiceStore] 获取售后服务详情失败:', error)
      return null
    }
  }

  /**
   * 创建售后服务
   */
  const createAfterSalesService = async (serviceData: Partial<AfterSalesService>): Promise<AfterSalesService> => {
    try {
      console.log('[ServiceStore] 创建售后服务...')

      if (isProduction()) {
        // 生产环境：调用真实API
        const response = await serviceApi.create(serviceData)
        const newService = mapApiToLocal(response)
        services.value.unshift(newService)
        console.log('[ServiceStore] API创建成功:', newService.serviceNumber)
        return newService
      } else {
        // 开发环境：本地存储
        const newService: AfterSalesService = {
          id: `SH${Date.now()}`,
          serviceNumber: `SH${Date.now()}`,
          orderId: serviceData.orderId || '',
          orderNumber: serviceData.orderNumber || '',
          customerId: serviceData.customerId || '',
          customerName: serviceData.customerName || '',
          customerPhone: serviceData.customerPhone || '',
          serviceType: serviceData.serviceType || 'return',
          status: 'pending',
          priority: serviceData.priority || 'normal',
          reason: serviceData.reason || '',
          description: serviceData.description || '',
          productName: serviceData.productName || '',
          productSpec: serviceData.productSpec || '',
          quantity: serviceData.quantity || 1,
          price: serviceData.price || 0,
          createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
          createdBy: serviceData.createdBy || 'customer',
          assignedTo: serviceData.assignedTo || '',
          updateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
          attachments: serviceData.attachments || []
        }
        services.value.unshift(newService)
        saveToLocalStorage()
        console.log('[ServiceStore] 本地创建成功:', newService.serviceNumber)
        return newService
      }
    } catch (error) {
      console.error('[ServiceStore] 创建售后服务失败:', error)
      throw error
    }
  }

  /**
   * 更新售后服务
   */
  const updateService = async (id: string, updates: Partial<AfterSalesService>): Promise<AfterSalesService | null> => {
    try {
      console.log('[ServiceStore] 更新售后服务:', id)

      if (isProduction()) {
        // 生产环境：调用真实API
        const response = await serviceApi.update(id, updates)
        const index = services.value.findIndex(s => s.id === id)
        if (index !== -1) {
          services.value[index] = { ...services.value[index], ...mapApiToLocal(response) }
          return services.value[index]
        }
        return mapApiToLocal(response)
      } else {
        // 开发环境：本地存储
        const index = services.value.findIndex(s => s.id === id)
        if (index !== -1) {
          services.value[index] = {
            ...services.value[index],
            ...updates,
            updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
          }
          saveToLocalStorage()
          return services.value[index]
        }
        return null
      }
    } catch (error) {
      console.error('[ServiceStore] 更新售后服务失败:', error)
      throw error
    }
  }

  /**
   * 更新售后服务状态
   */
  const updateServiceStatus = async (id: string, status: AfterSalesService['status'], remark?: string): Promise<void> => {
    try {
      console.log('[ServiceStore] 更新售后服务状态:', id, status)

      if (isProduction()) {
        await serviceApi.updateStatus(id, status, remark)
      }

      // 更新本地状态
      const service = services.value.find(s => s.id === id)
      if (service) {
        service.status = status
        service.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
        if (remark) service.remark = remark

        if (!isProduction()) {
          saveToLocalStorage()
        }
      }
    } catch (error) {
      console.error('[ServiceStore] 更新状态失败:', error)
      throw error
    }
  }

  /**
   * 分配处理人
   */
  const assignService = async (id: string, assignedTo: string, assignedToId?: string, remark?: string): Promise<void> => {
    try {
      console.log('[ServiceStore] 分配处理人:', id, assignedTo)

      if (isProduction()) {
        await serviceApi.assign(id, assignedTo, assignedToId, remark)
      }

      // 更新本地状态
      const service = services.value.find(s => s.id === id)
      if (service) {
        service.assignedTo = assignedTo
        service.status = service.status === 'pending' ? 'processing' : service.status
        service.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
        if (remark) service.remark = remark

        if (!isProduction()) {
          saveToLocalStorage()
        }
      }
    } catch (error) {
      console.error('[ServiceStore] 分配处理人失败:', error)
      throw error
    }
  }

  /**
   * 设置优先级
   */
  const setServicePriority = async (id: string, priority: AfterSalesService['priority'], remark?: string): Promise<void> => {
    try {
      console.log('[ServiceStore] 设置优先级:', id, priority)

      if (isProduction()) {
        await serviceApi.setPriority(id, priority, remark)
      }

      // 更新本地状态
      const service = services.value.find(s => s.id === id)
      if (service) {
        service.priority = priority
        service.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
        if (remark) service.remark = remark

        if (!isProduction()) {
          saveToLocalStorage()
        }
      }
    } catch (error) {
      console.error('[ServiceStore] 设置优先级失败:', error)
      throw error
    }
  }

  /**
   * 删除售后服务
   */
  const deleteService = async (id: string): Promise<boolean> => {
    try {
      console.log('[ServiceStore] 删除售后服务:', id)

      if (isProduction()) {
        await serviceApi.delete(id)
      }

      // 更新本地状态
      const index = services.value.findIndex(s => s.id === id)
      if (index !== -1) {
        services.value.splice(index, 1)

        if (!isProduction()) {
          saveToLocalStorage()
        }
        return true
      }
      return false
    } catch (error) {
      console.error('[ServiceStore] 删除售后服务失败:', error)
      throw error
    }
  }

  /**
   * 根据订单ID获取售后服务
   */
  const getServicesByOrderId = (orderId: string) => {
    return services.value.filter(s => s.orderId === orderId)
  }

  /**
   * 根据客户ID获取售后服务
   */
  const getServicesByCustomerId = (customerId: string) => {
    return services.value.filter(s => s.customerId === customerId)
  }

  /**
   * 检查订单是否已有售后记录
   */
  const checkExistingAfterSales = async (orderId: string): Promise<AfterSalesService | null> => {
    const existing = services.value.find(s => s.orderId === orderId)
    return existing || null
  }

  // 辅助方法：API数据映射到本地格式
  const mapApiToLocal = (data: AfterSalesServiceData): AfterSalesService => {
    return {
      id: data.id,
      serviceNumber: data.serviceNumber,
      orderId: data.orderId || '',
      orderNumber: data.orderNumber || '',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      serviceType: (data.serviceType || 'return') as AfterSalesService['serviceType'],
      status: (data.status || 'pending') as AfterSalesService['status'],
      priority: (data.priority || 'normal') as AfterSalesService['priority'],
      reason: data.reason || '',
      description: data.description || '',
      createTime: data.createTime || '',
      createdBy: data.createdBy || '',
      assignedTo: data.assignedTo,
      updateTime: data.updateTime,
      expectedTime: data.expectedTime,
      remark: data.remark,
      attachments: data.attachments || [],
      productName: data.productName,
      productSpec: data.productSpec,
      quantity: data.quantity,
      price: data.price,
      contactAddress: data.contactAddress,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      createdById: data.createdById,
      departmentId: data.departmentId
    }
  }

  // 辅助方法：保存到本地存储
  const saveToLocalStorage = () => {
    localStorage.setItem('crm_after_sales_services', JSON.stringify(services.value))
  }

  // 兼容旧方法名
  const addService = createAfterSalesService
  const createService = createAfterSalesService
  const getServicesByStatus = async (status: string) => {
    return services.value.filter(service => service.status === status)
  }

  return {
    services,
    loading,
    total,
    serviceCount,
    afterSalesServices,
    pendingServices,
    processingServices,
    loadAfterSalesServices,
    getServiceById,
    fetchServiceById,
    createAfterSalesService,
    updateService,
    updateServiceStatus,
    assignService,
    setServicePriority,
    deleteService,
    getServicesByOrderId,
    getServicesByCustomerId,
    checkExistingAfterSales,
    // 兼容旧方法名
    addService,
    createService,
    getServicesByStatus
  }
})
