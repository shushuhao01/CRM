import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

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

  // 加载配置 - 从数据库API加载，确保全局一致
  const loadConfig = async () => {
    try {
      loading.value = true
      // 始终从API加载配置
      const { api } = await import('@/api/request')
      const response = await api.get('/system/order-field-config')
      if (response.data) {
        // 合并默认配置和API返回的配置
        config.value = {
          orderSource: response.data.orderSource || defaultConfig.orderSource,
          customFields: response.data.customFields || []
        }
        console.log('[订单字段配置] 从数据库加载成功:', config.value)
      }
    } catch (error) {
      console.warn('从API加载订单字段配置失败，使用默认配置:', error)
      config.value = JSON.parse(JSON.stringify(defaultConfig))
    } finally {
      loading.value = false
    }
  }

  // 保存配置 - 保存到数据库API，确保全局持久化
  const saveConfig = async () => {
    try {
      // 始终保存到API
      const { api } = await import('@/api/request')
      const response = await api.put('/system/order-field-config', config.value)
      if (response.success) {
        console.log('[订单字段配置] 保存到数据库成功')
      } else {
        console.error('[订单字段配置] 保存失败:', response.message)
        throw new Error(response.message || '保存失败')
      }
    } catch (error) {
      console.error('保存订单字段配置到API失败:', error)
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
