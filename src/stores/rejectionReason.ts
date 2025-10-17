import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RejectionReason {
  id: string
  name: string
  description?: string
  isDefault: boolean
  createTime: string
  createdBy: string
}

export const useRejectionReasonStore = defineStore('rejectionReason', () => {
  // 拒绝原因列表
  const rejectionReasons = ref<RejectionReason[]>([
    {
      id: '1',
      name: '地址不正确',
      description: '收货地址信息有误或不完整',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '2',
      name: '缺少定金截图',
      description: '未上传定金支付截图或截图不清晰',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '3',
      name: '产品没有库存',
      description: '所选产品暂时缺货',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '4',
      name: '客户信息有误',
      description: '客户联系方式或身份信息不正确',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '5',
      name: '快递送不到',
      description: '收货地址超出配送范围',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '6',
      name: '风险客户',
      description: '需要进一步核实客户信息',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '7',
      name: '订单金额异常',
      description: '订单金额计算有误或存在异常',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '8',
      name: '重复下单',
      description: '客户重复提交相同订单',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '9',
      name: '产品信息不符',
      description: '产品规格、型号等信息与实际不符',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    },
    {
      id: '10',
      name: '其他',
      description: '其他原因，需要在备注中详细说明',
      isDefault: true,
      createTime: '2024-01-01 00:00:00',
      createdBy: 'system'
    }
  ])

  // 获取所有拒绝原因
  const getAllReasons = () => {
    return rejectionReasons.value
  }

  // 获取拒绝原因选项（用于下拉选择）
  const getReasonOptions = () => {
    return rejectionReasons.value.map(reason => ({
      label: reason.description || reason.name, // 优先显示描述内容，如果没有描述则显示名称
      value: reason.id,
      description: reason.description
    }))
  }

  // 根据ID获取拒绝原因
  const getReasonById = (id: string) => {
    return rejectionReasons.value.find(reason => reason.id === id)
  }

  // 根据名称获取拒绝原因
  const getReasonByName = (name: string) => {
    return rejectionReasons.value.find(reason => reason.name === name)
  }

  // 计算属性
  const reasons = computed(() => rejectionReasons.value)

  // 添加新的拒绝原因
  const addReason = async (reason: Omit<RejectionReason, 'id' | 'createTime'>) => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const newReason: RejectionReason = {
      ...reason,
      id: Date.now().toString(),
      createTime: new Date().toLocaleString('zh-CN'),
      isDefault: false
    }
    rejectionReasons.value.push(newReason)
    return newReason
  }

  // 更新拒绝原因
  const updateReason = (id: string, updates: Partial<RejectionReason>) => {
    const index = rejectionReasons.value.findIndex(reason => reason.id === id)
    if (index !== -1) {
      rejectionReasons.value[index] = { ...rejectionReasons.value[index], ...updates }
      return rejectionReasons.value[index]
    }
    return null
  }

  // 删除拒绝原因
  const deleteReason = async (id: string) => {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const index = rejectionReasons.value.findIndex(reason => reason.id === id)
    if (index !== -1) {
      const reason = rejectionReasons.value[index]
      // 不能删除默认原因
      if (reason.isDefault) {
        throw new Error('不能删除系统预设原因')
      }
      rejectionReasons.value.splice(index, 1)
      return true
    }
    throw new Error('拒绝原因不存在')
  }

  // 检查是否为"其他"原因
  const isOtherReason = (reasonId: string) => {
    const reason = getReasonById(reasonId)
    return reason?.name === '其他'
  }

  return {
    // 状态
    rejectionReasons,
    reasons,
    
    // 方法
    getAllReasons,
    getReasonOptions,
    getReasonById,
    getReasonByName,
    addReason,
    updateReason,
    deleteReason,
    isOtherReason
  }
})