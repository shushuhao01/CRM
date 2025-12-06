import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { isDevelopment } from '@/utils/env'

// 字段类型定义
export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox'

// 选项接口
export interface FieldOption {
  label: string
  value: string
  icon?: string
}

// 自定义字段接口
export interface CustomField {
  id: string
  fieldName: string
  fieldKey: string
  fieldType: FieldType
  required: boolean
  options?: FieldOption[]
  defaultValue?: any
  placeholder?: string
  showInList: boolean
  sortOrder: number
}

// 订单来源配置接口
export interface OrderSourceConfig {
  fieldName: string
  options: FieldOption[]
}

// 订单字段配置接口
export interface OrderFieldConfig {
  orderSource: OrderSourceConfig
  customFields: CustomField[]
}

// 默认配置
const defaultConfig: OrderFieldConfig = {
  orderSource: {
    fieldName: '订单来源',
    options: [
      { label: '🛒 线上商城', value: 'online_store', icon: '🛒' },
      { label: '📱 微信小程序', value: 'wechat_mini', icon: '📱' },
      { label: '💬 微信客服', value: 'wechat_service', icon: '💬' },
      { label: '📞 电话咨询', value: 'phone_call', icon: '📞' },
      { label: '🏪 线下门店', value: 'offline_store', icon: '🏪' },
      { label: '👥 客户推荐', value: 'referral', icon: '👥' },
      { label: '📺 广告投放', value: 'advertisement', icon: '📺' },
      { label: '🎯 其他渠道', value: 'other', icon: '🎯' }
    ]
  },
  customFields: []
}

export const useOrderFieldConfigStore = defineStore('orderFieldConfig', () => {
  // 状态
  const config = ref<OrderFieldConfig>(JSON.parse(JSON.stringify(defaultConfig)))
  const loading = ref(false)

  // 计算属性
  const orderSourceFieldName = computed(() => config.value.orderSource.fieldName)
  const orderSourceOptions = computed(() => config.value.orderSource.options)
  const customFields = computed(() => config.value.customFields)
  const visibleCustomFields = computed(() =>
    config.value.customFields.filter(f => f.showInList).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  // 加载配置
  const loadConfig = async () => {
    try {
      if (isDevelopment()) {
        // 开发环境从localStorage加载
        const saved = localStorage.getItem('crm_order_field_config')
        if (saved) {
          config.value = JSON.parse(saved)
        } else {
          // 首次使用,保存默认配置
          saveConfig()
        }
      } else {
        // 生产环境从API加载
        try {
          const { api } = await import('@/api/request')
          const response = await api.get('/system/order-field-config')
          if (response.data) {
            config.value = response.data
          }
        } catch (error) {
          console.warn('从API加载订单字段配置失败，使用默认配置:', error)
        }
      }
    } catch (error) {
      console.error('加载订单字段配置失败:', error)
    }
  }

  // 保存配置
  const saveConfig = async () => {
    try {
      if (isDevelopment()) {
        // 开发环境保存到localStorage
        localStorage.setItem('crm_order_field_config', JSON.stringify(config.value))
      } else {
        // 生产环境保存到API
        try {
          const { api } = await import('@/api/request')
          await api.put('/system/order-field-config', config.value)
        } catch (error) {
          console.error('保存订单字段配置到API失败:', error)
          throw error
        }
      }
    } catch (error) {
      console.error('保存订单字段配置失败:', error)
      throw error
    }
  }

  // 更新订单来源配置
  const updateOrderSourceConfig = (fieldName: string, options: FieldOption[]) => {
    config.value.orderSource.fieldName = fieldName
    config.value.orderSource.options = options
    saveConfig()
  }

  // 添加自定义字段
  const addCustomField = (field: Omit<CustomField, 'id' | 'sortOrder'>) => {
    const newField: CustomField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sortOrder: config.value.customFields.length
    }
    config.value.customFields.push(newField)
    saveConfig()
    return newField
  }

  // 更新自定义字段
  const updateCustomField = (fieldId: string, updates: Partial<CustomField>) => {
    const index = config.value.customFields.findIndex(f => f.id === fieldId)
    if (index > -1) {
      config.value.customFields[index] = {
        ...config.value.customFields[index],
        ...updates
      }
      saveConfig()
    }
  }

  // 删除自定义字段
  const deleteCustomField = (fieldId: string) => {
    config.value.customFields = config.value.customFields.filter(f => f.id !== fieldId)
    // 重新排序
    config.value.customFields.forEach((field, index) => {
      field.sortOrder = index
    })
    saveConfig()
  }

  // 调整字段顺序
  const reorderCustomFields = (fieldIds: string[]) => {
    const newFields: CustomField[] = []
    fieldIds.forEach((id, index) => {
      const field = config.value.customFields.find(f => f.id === id)
      if (field) {
        field.sortOrder = index
        newFields.push(field)
      }
    })
    config.value.customFields = newFields
    saveConfig()
  }

  // 重置为默认配置
  const resetToDefault = () => {
    config.value = JSON.parse(JSON.stringify(defaultConfig))
    saveConfig()
  }

  // 获取字段配置
  const getFieldByKey = (fieldKey: string) => {
    return config.value.customFields.find(f => f.fieldKey === fieldKey)
  }

  // 初始化
  loadConfig()

  return {
    // 状态
    config,
    loading,

    // 计算属性
    orderSourceFieldName,
    orderSourceOptions,
    customFields,
    visibleCustomFields,

    // 方法
    loadConfig,
    saveConfig,
    updateOrderSourceConfig,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    reorderCustomFields,
    resetToDefault,
    getFieldByKey
  }
})
