import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ImprovementGoal {
  id: string
  label: string
  value: string
  isDefault: boolean // 是否为默认选项（不可删除）
  order: number // 排序顺序
  createdAt: Date
  updatedAt: Date
}

export const useImprovementGoalsStore = defineStore('improvementGoals', () => {
  // 改善问题选项列表
  const goals = ref<ImprovementGoal[]>([
    {
      id: '1',
      label: '减肥瘦身',
      value: '减肥瘦身',
      isDefault: true,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      label: '增肌塑形',
      value: '增肌塑形',
      isDefault: true,
      order: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      label: '改善睡眠',
      value: '改善睡眠',
      isDefault: true,
      order: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '4',
      label: '提高免疫力',
      value: '提高免疫力',
      isDefault: true,
      order: 4,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '5',
      label: '调理肠胃',
      value: '调理肠胃',
      isDefault: true,
      order: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '6',
      label: '美容养颜',
      value: '美容养颜',
      isDefault: true,
      order: 6,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '7',
      label: '其他',
      value: '其他',
      isDefault: true,
      order: 7,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ])

  // 计算属性
  const allGoals = computed(() => goals.value.sort((a, b) => a.order - b.order))
  const customGoals = computed(() => goals.value.filter(goal => !goal.isDefault).sort((a, b) => a.order - b.order))
  const defaultGoals = computed(() => goals.value.filter(goal => goal.isDefault).sort((a, b) => a.order - b.order))

  // 添加新的改善问题选项
  const addGoal = (label: string) => {
    // 获取当前最大的order值
    const maxOrder = goals.value.length > 0 ? Math.max(...goals.value.map(g => g.order)) : 0
    
    const newGoal: ImprovementGoal = {
      id: Date.now().toString(),
      label: label.trim(),
      value: label.trim(),
      isDefault: false,
      order: maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 检查是否已存在相同的选项
    const exists = goals.value.some(goal => goal.value === newGoal.value)
    if (exists) {
      throw new Error('该改善问题选项已存在')
    }
    
    goals.value.push(newGoal)
    saveToStorage() // 保存更改到本地存储
    return newGoal
  }

  // 删除改善问题选项（现在支持删除所有选项，包括默认选项）
  const removeGoal = (id: string) => {
    const goalIndex = goals.value.findIndex(goal => goal.id === id)
    if (goalIndex === -1) {
      throw new Error('改善问题选项不存在')
    }
    
    const goal = goals.value[goalIndex]
    goals.value.splice(goalIndex, 1)
    saveToStorage() // 保存更改到本地存储
    return goal
  }

  // 编辑改善问题选项（现在支持编辑所有选项，包括默认选项）
  const updateGoal = (id: string, newLabel: string) => {
    const goal = goals.value.find(goal => goal.id === id)
    if (!goal) {
      throw new Error('改善问题选项不存在')
    }
    
    const trimmedLabel = newLabel.trim()
    
    // 检查是否已存在相同的选项（排除当前编辑的选项）
    const exists = goals.value.some(g => g.id !== id && g.value === trimmedLabel)
    if (exists) {
      throw new Error('该改善问题选项已存在')
    }
    
    goal.label = trimmedLabel
    goal.value = trimmedLabel
    goal.updatedAt = new Date()
    
    saveToStorage() // 保存更改到本地存储
    return goal
  }

  // 获取指定ID的改善问题选项
  const getGoalById = (id: string) => {
    return goals.value.find(goal => goal.id === id)
  }

  // 重新排序改善问题选项
  const reorderGoals = (newOrder: string[]) => {
    // 根据新的顺序重新设置order值
    newOrder.forEach((goalId, index) => {
      const goal = goals.value.find(g => g.id === goalId)
      if (goal) {
        goal.order = index + 1
        goal.updatedAt = new Date()
      }
    })
    
    saveToStorage() // 保存更改到本地存储
  }

  // 重置为默认选项（清除所有自定义选项）
  const resetToDefault = () => {
    goals.value = goals.value.filter(goal => goal.isDefault)
  }

  // 从本地存储加载数据
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('improvement-goals')
      if (stored) {
        const parsedGoals = JSON.parse(stored)
        
        // 确保所有选项都有order字段
        const processedGoals = parsedGoals.map((goal: any, index: number) => ({
          ...goal,
          order: goal.order || (index + 1), // 如果没有order字段，则按索引设置
          createdAt: new Date(goal.createdAt),
          updatedAt: new Date(goal.updatedAt)
        }))
        
        goals.value = processedGoals
      }
    } catch (error) {
      console.error('加载改善问题选项失败:', error)
    }
  }

  // 保存到本地存储
  const saveToStorage = () => {
    try {
      localStorage.setItem('improvement-goals', JSON.stringify(goals.value))
    } catch (error) {
      console.error('保存改善问题选项失败:', error)
    }
  }

  // 监听数据变化并自动保存
  const startAutoSave = () => {
    // 这里可以使用 watch 来监听 goals 的变化并自动保存
    // 为了简化，我们在每次操作后手动调用 saveToStorage
  }

  return {
    // 状态
    goals,
    
    // 计算属性
    allGoals,
    customGoals,
    defaultGoals,
    
    // 方法
    addGoal,
    removeGoal,
    updateGoal,
    getGoalById,
    reorderGoals,
    resetToDefault,
    loadFromStorage,
    saveToStorage,
    startAutoSave
  }
})