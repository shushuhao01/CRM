import { ref } from 'vue'
import { createPersistentStore } from '@/utils/storage'

export interface ServiceType {
  id: string
  label: string
  value: string
  enabled: boolean
  order: number
  createdAt: string
  createdBy: string
}

export const useServiceTypeStore = createPersistentStore('serviceType', () => {
  // 默认服务类型
  const serviceTypes = ref<ServiceType[]>([
    {
      id: '1',
      label: '退货',
      value: 'return',
      enabled: true,
      order: 1,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: '2',
      label: '换货',
      value: 'exchange',
      enabled: true,
      order: 2,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: '3',
      label: '维修',
      value: 'repair',
      enabled: true,
      order: 3,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: '4',
      label: '投诉',
      value: 'complaint',
      enabled: true,
      order: 4,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    },
    {
      id: '5',
      label: '咨询',
      value: 'inquiry',
      enabled: true,
      order: 5,
      createdAt: new Date().toISOString(),
      createdBy: 'system'
    }
  ])

  // 获取启用的服务类型
  const enabledServiceTypes = () => {
    return serviceTypes.value
      .filter(type => type.enabled)
      .sort((a, b) => a.order - b.order)
  }

  // 添加服务类型
  const addServiceType = (type: Omit<ServiceType, 'id' | 'createdAt'>) => {
    const newType: ServiceType = {
      ...type,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    serviceTypes.value.push(newType)
    return newType
  }

  // 更新服务类型
  const updateServiceType = (id: string, updates: Partial<ServiceType>) => {
    const index = serviceTypes.value.findIndex(t => t.id === id)
    if (index !== -1) {
      serviceTypes.value[index] = {
        ...serviceTypes.value[index],
        ...updates
      }
      return serviceTypes.value[index]
    }
    return null
  }

  // 删除服务类型
  const deleteServiceType = (id: string) => {
    const index = serviceTypes.value.findIndex(t => t.id === id)
    if (index !== -1) {
      serviceTypes.value.splice(index, 1)
      return true
    }
    return false
  }

  // 切换启用状态
  const toggleServiceType = (id: string) => {
    const type = serviceTypes.value.find(t => t.id === id)
    if (type) {
      type.enabled = !type.enabled
      return type
    }
    return null
  }

  // 更新排序
  const updateOrder = (types: ServiceType[]) => {
    types.forEach((type, index) => {
      const found = serviceTypes.value.find(t => t.id === type.id)
      if (found) {
        found.order = index + 1
      }
    })
  }

  return {
    serviceTypes,
    enabledServiceTypes,
    addServiceType,
    updateServiceType,
    deleteServiceType,
    toggleServiceType,
    updateOrder
  }
})
