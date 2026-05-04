import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 复用订单字段配置中的类型定义
export type FieldType = 'text' | 'number' | 'date' | 'datetime' | 'select' | 'radio' | 'checkbox'

export interface FieldOption {
  label: string
  value: string
}

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
  mpRequired?: boolean
  mpDisplay?: 'show' | 'collapsed' | 'hidden'
}

export interface FieldVisibilityItem {
  enabled: boolean
  required: boolean
  mpEnabled?: boolean
  mpRequired?: boolean
  mpCollapsed?: boolean
}

export interface CustomerFieldConfig {
  fieldVisibility: Record<string, FieldVisibilityItem>
  customFields: CustomField[]
}

// 内置字段定义（用于展示）
export const BUILTIN_FIELDS = [
  { key: 'phone', label: '手机号', alwaysEnabled: true },
  { key: 'name', label: '客户姓名', alwaysEnabled: true },
  { key: 'gender', label: '性别', alwaysEnabled: false },
  { key: 'age', label: '年龄', alwaysEnabled: false },
  { key: 'height', label: '身高', alwaysEnabled: false },
  { key: 'weight', label: '体重', alwaysEnabled: false },
  { key: 'email', label: '邮箱', alwaysEnabled: false },
  { key: 'wechat', label: '微信号', alwaysEnabled: false },
  { key: 'fanAcquisitionTime', label: '进粉时间', alwaysEnabled: false },
  { key: 'medicalHistory', label: '疾病史', alwaysEnabled: false },
  { key: 'improvementGoals', label: '改善问题', alwaysEnabled: false },
  { key: 'wecomExternalUserid', label: '企微UserID', alwaysEnabled: false },
  { key: 'level', label: '客户等级', alwaysEnabled: false },
  { key: 'source', label: '客户来源', alwaysEnabled: false },
  { key: 'status', label: '客户状态', alwaysEnabled: false },
  { key: 'tags', label: '客户标签', alwaysEnabled: false },
  { key: 'salesPerson', label: '负责销售', alwaysEnabled: false },
  { key: 'remark', label: '客户备注', alwaysEnabled: false },
  { key: 'birthday', label: '客户生日', alwaysEnabled: false },
  { key: 'address', label: '收货地址(整体)', alwaysEnabled: false },
  { key: 'province', label: '省份', alwaysEnabled: false },
  { key: 'city', label: '城市', alwaysEnabled: false },
  { key: 'district', label: '区县', alwaysEnabled: false },
  { key: 'street', label: '街道', alwaysEnabled: false },
  { key: 'detailAddress', label: '详细地址', alwaysEnabled: false }
]

// 默认配置（匹配当前表单硬编码的必填设置）
const defaultConfig: CustomerFieldConfig = {
  fieldVisibility: {
    phone: { enabled: true, required: true },
    name: { enabled: true, required: true },
    gender: { enabled: true, required: true },
    age: { enabled: true, required: true },
    height: { enabled: true, required: true },
    weight: { enabled: true, required: true },
    email: { enabled: true, required: false },
    wechat: { enabled: true, required: false },
    fanAcquisitionTime: { enabled: true, required: true },
    medicalHistory: { enabled: true, required: true },
    improvementGoals: { enabled: true, required: true },
    wecomExternalUserid: { enabled: false, required: false },
    birthday: { enabled: true, required: false },
    level: { enabled: true, required: true },
    source: { enabled: true, required: false },
    status: { enabled: true, required: true },
    tags: { enabled: true, required: false },
    salesPerson: { enabled: true, required: true },
    remark: { enabled: true, required: false },
    address: { enabled: true, required: true },
    province: { enabled: true, required: true },
    city: { enabled: true, required: true },
    district: { enabled: true, required: false },
    street: { enabled: true, required: false },
    detailAddress: { enabled: true, required: true }
  },
  customFields: []
}

export const useCustomerFieldConfigStore = defineStore('customerFieldConfig', () => {
  const config = ref<CustomerFieldConfig>(JSON.parse(JSON.stringify(defaultConfig)))
  const loading = ref(false)

  const customFields = computed(() => config.value.customFields)
  const visibleCustomFields = computed(() =>
    config.value.customFields.filter(f => f.showInList).sort((a, b) => a.sortOrder - b.sortOrder)
  )

  // 检查内置字段是否启用
  const isFieldEnabled = (fieldKey: string): boolean => {
    const vis = config.value.fieldVisibility[fieldKey]
    return vis ? vis.enabled : true
  }

  // 检查内置字段是否必填
  const isFieldRequired = (fieldKey: string): boolean => {
    const vis = config.value.fieldVisibility[fieldKey]
    return vis ? vis.required : false
  }

  // 从 API 加载配置
  const loadConfig = async () => {
    try {
      loading.value = true
      const { api } = await import('@/api/request')
      const response = await api.get('/system/customer-field-config')
      if (response.data) {
        const data = response.data as any
        config.value = {
          fieldVisibility: data.fieldVisibility || defaultConfig.fieldVisibility,
          customFields: data.customFields || []
        }
        try {
          localStorage.setItem('crm_customer_field_config', JSON.stringify(config.value))
        } catch { /* ignore */ }
        console.log('[客户字段配置] 从数据库加载成功:', config.value)
      }
    } catch (error) {
      console.warn('从API加载客户字段配置失败，使用默认配置:', error)
      config.value = JSON.parse(JSON.stringify(defaultConfig))
    } finally {
      loading.value = false
    }
  }

  // 保存配置到 API
  const saveConfig = async () => {
    try {
      const { api } = await import('@/api/request')
      const response = await api.put('/system/customer-field-config', config.value)
      if (response.success) {
        console.log('[客户字段配置] 保存到数据库成功')
        try {
          localStorage.setItem('crm_customer_field_config', JSON.stringify(config.value))
        } catch { /* ignore */ }
      } else {
        throw new Error(response.message || '保存失败')
      }
    } catch (error) {
      console.error('保存客户字段配置失败:', error)
      throw error
    }
  }

  const getFieldByKey = (fieldKey: string) => {
    return config.value.customFields.find(f => f.fieldKey === fieldKey)
  }

  // 初始化
  loadConfig()

  return {
    config,
    loading,
    customFields,
    visibleCustomFields,
    isFieldEnabled,
    isFieldRequired,
    loadConfig,
    saveConfig,
    getFieldByKey
  }
})

