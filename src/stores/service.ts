import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useCustomerStore } from './customer'
import { useOrderStore } from './order'
import { createPersistentStore } from '@/utils/storage'

export interface AfterSalesService {
  id: string
  serviceNumber: string
  orderId: string
  orderNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  serviceType: 'return' | 'exchange' | 'repair' | 'refund'
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
}

export const useServiceStore = createPersistentStore('service', () => {
  // 售后服务列表数据
  const services = ref<AfterSalesService[]>([
    {
      id: '1',
      serviceNumber: 'SH202401150001',
      orderId: '13', // 对应已发货的订单
      orderNumber: 'ORD202401150013',
      customerId: '13',
      customerName: '已发货用户',
      customerPhone: '13800138013',
      serviceType: 'return',
      status: 'processing',
      priority: 'normal',
      reason: '商品质量问题',
      description: '收到的商品有明显的质量缺陷，希望退货处理',
      createTime: '2024-01-16 10:30:00',
      createdBy: 'customer',
      assignedTo: '客服小王',
      updateTime: '2024-01-16 14:20:00',
      expectedTime: '2024-01-18 18:00:00',
      remark: '客户要求尽快处理',
      attachments: ['defect1.jpg', 'defect2.jpg'],
      productName: '已发货产品',
      productSpec: '标准版',
      quantity: 1,
      price: 800,
      contactAddress: '深圳市南山区科技园',
      contactName: '已发货用户'
    }
  ])

  // 计算属性
  const serviceCount = computed(() => services.value.length)
  
  const afterSalesServices = computed(() => services.value)
  
  const pendingServices = computed(() => 
    services.value.filter(service => service.status === 'pending')
  )
  
  const processingServices = computed(() => 
    services.value.filter(service => service.status === 'processing')
  )

  // 方法
  const addService = (serviceData: Omit<AfterSalesService, 'id' | 'serviceNumber' | 'createTime'>) => {
    const newService: AfterSalesService = {
      id: Date.now().toString(),
      serviceNumber: `SH${Date.now()}`,
      createTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ...serviceData
    }
    services.value.push(newService)
    return newService
  }

  const updateService = (id: string, updates: Partial<AfterSalesService>) => {
    const index = services.value.findIndex(s => s.id === id)
    if (index !== -1) {
      services.value[index] = { 
        ...services.value[index], 
        ...updates,
        updateTime: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
      return services.value[index]
    }
    return null
  }

  const deleteService = (id: string) => {
    const index = services.value.findIndex(s => s.id === id)
    if (index !== -1) {
      const service = services.value[index]
      
      // 如果删除的是退货类型的售后服务，需要减少客户的退货统计
      if (service.serviceType === 'return' && service.customerId) {
        const customerStore = useCustomerStore()
        const customer = customerStore.customers.find(c => c.id === service.customerId)
        if (customer && customer.returnCount && customer.returnCount > 0) {
          customerStore.updateCustomerStats(service.customerId, {
            returnCount: customer.returnCount - 1
          })
        }
      }
      
      services.value.splice(index, 1)
      return true
    }
    return false
  }

  const getServiceById = (id: string) => {
    return services.value.find(s => s.id === id)
  }

  const getServicesByOrderId = (orderId: string) => {
    return services.value.filter(s => s.orderId === orderId)
  }

  const getServicesByCustomerId = (customerId: string) => {
    return services.value.filter(s => s.customerId === customerId)
  }

  // 检查订单是否已有售后记录
  const checkExistingAfterSales = async (orderId: string): Promise<AfterSalesService | null> => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟检查逻辑：如果订单ID包含特定字符，则认为已有售后记录
    if (orderId.includes('202') && Math.random() > 0.7) {
      return services.value.find(service => service.orderNumber === orderId) || null
    }
    
    return null
  }

  // 创建售后单
  const createAfterSalesService = async (serviceData: Partial<AfterSalesService>): Promise<AfterSalesService> => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
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
    
    // 更新订单状态为已建售后
    if (newService.orderNumber) {
      const orderStore = useOrderStore()
      // 根据订单号查找订单
      const order = orderStore.orders.find(o => o.orderNumber === newService.orderNumber)
      if (order) {
        // 使用订单store的createAfterSales方法更新状态
        orderStore.createAfterSales(order.id, newService.createdBy, newService.reason)
        console.log(`订单 ${newService.orderNumber} 状态已更新为已建售后`)
      }
    }
    
    // 如果是退货类型，更新客户的退货统计
    if (newService.serviceType === 'return' && newService.customerId) {
      const customerStore = useCustomerStore()
      const customer = customerStore.customers.find(c => c.id === newService.customerId)
      if (customer) {
        customerStore.updateCustomerStats(newService.customerId, {
          returnCount: (customer.returnCount || 0) + 1
        })
      }
    }
    
    // 触发售后服务更新事件
    window.dispatchEvent(new CustomEvent('after-sales-update', {
      detail: {
        orderId: newService.orderId,
        serviceId: newService.id,
        action: 'create',
        service: newService
      }
    }))
    
    return newService
  }

  // 更新售后单状态
  const updateServiceStatus = async (serviceId: string, status: AfterSalesService['status'], remark?: string): Promise<void> => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const service = services.value.find(s => s.id === serviceId)
    if (service) {
      const previousStatus = service.status
      service.status = status
      service.updateTime = new Date().toISOString().slice(0, 19).replace('T', ' ')
      if (remark) {
        service.remark = remark
      }
      
      // 如果售后从处理中变为已解决或已关闭，且是退货类型，可能需要更新客户统计
      if ((status === 'resolved' || status === 'closed') && 
          previousStatus !== 'resolved' && previousStatus !== 'closed' &&
          service.serviceType === 'return' && service.customerId) {
        // 这里可以根据业务需求决定是否需要调整客户统计
        // 例如：退货完成后可能需要更新客户的最后服务时间等
        const customerStore = useCustomerStore()
        customerStore.updateCustomerStats(service.customerId, {
          lastServiceDate: service.updateTime
        })
      }
      
      // 触发售后服务状态更新事件
      window.dispatchEvent(new CustomEvent('service-status-update', {
        detail: {
          orderId: service.orderId,
          serviceId: service.id,
          oldStatus: previousStatus,
          newStatus: status,
          service: service
        }
      }))
    }
  }

  // 创建售后服务（异步方法）
  const createService = async (serviceData: Omit<AfterSalesService, 'id' | 'serviceNumber' | 'createTime'>) => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newService = addService(serviceData)
    return newService
  }

  // 根据状态获取售后服务
  const getServicesByStatus = async (status: string) => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return services.value.filter(service => service.status === status)
  }

  // 加载售后服务列表
  const loadAfterSalesServices = async () => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 这里可以从API获取最新数据，目前使用现有的services数据
    return services.value
  }

  return {
    services,
    serviceCount,
    afterSalesServices,
    pendingServices,
    processingServices,
    addService,
    updateService,
    deleteService,
    getServiceById,
    getServicesByOrderId,
    getServicesByCustomerId,
    checkExistingAfterSales,
    createService,
    getServicesByStatus,
    createAfterSalesService,
    updateServiceStatus,
    loadAfterSalesServices
  }
})