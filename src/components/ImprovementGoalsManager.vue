<template>
  <el-dialog
    v-model="visible"
    title="改善问题管理"
    width="600px"
    :before-close="handleClose"
    class="improvement-goals-manager"
  >
    <div class="manager-content">
      <!-- 添加新选项 -->
      <div class="add-section">
        <h4>添加新的改善问题选项</h4>
        <div class="add-form">
          <el-input
            v-model="newGoalLabel"
            placeholder="请输入新的改善问题选项"
            maxlength="20"
            show-word-limit
            @keyup.enter="handleAddGoal"
          />
          <el-button 
            type="primary" 
            @click="handleAddGoal"
            :disabled="!newGoalLabel.trim()"
          >
            添加
          </el-button>
        </div>
      </div>

      <!-- 现有选项列表 -->
      <div class="goals-list">
        <h4>现有改善问题选项 <span class="sort-hint">（拖拽可调整顺序）</span></h4>
        <div class="goals-grid">
          <div 
            v-for="goal in improvementGoalsStore.allGoals" 
            :key="goal.id"
            class="goal-item"
            :class="{ 'is-default': goal.isDefault, 'dragging': draggingId === goal.id }"
            draggable="true"
            @dragstart="handleDragStart($event, goal)"
            @dragover="handleDragOver($event)"
            @drop="handleDrop($event, goal)"
            @dragend="handleDragEnd"
          >
            <div class="goal-content">
              <div class="drag-handle" title="拖拽排序">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="4" cy="4" r="1"/>
                  <circle cx="4" cy="8" r="1"/>
                  <circle cx="4" cy="12" r="1"/>
                  <circle cx="8" cy="4" r="1"/>
                  <circle cx="8" cy="8" r="1"/>
                  <circle cx="8" cy="12" r="1"/>
                  <circle cx="12" cy="4" r="1"/>
                  <circle cx="12" cy="8" r="1"/>
                  <circle cx="12" cy="12" r="1"/>
                </svg>
              </div>
              <div v-if="!editingGoalId || editingGoalId !== goal.id" class="goal-display">
                <span class="goal-label">{{ goal.label }}</span>
                <span v-if="goal.isDefault" class="default-tag">默认</span>
              </div>
              <div v-else class="goal-edit">
                <el-input
                  v-model="editingGoalLabel"
                  size="small"
                  @keyup.enter="handleSaveEdit(goal.id)"
                  @blur="handleCancelEdit"
                />
              </div>
            </div>
            
            <div class="goal-actions">
              <el-button
                v-if="!editingGoalId || editingGoalId !== goal.id"
                type="text"
                size="small"
                @click="handleStartEdit(goal)"
              >
                编辑
              </el-button>
              <el-button
                v-if="editingGoalId === goal.id"
                type="text"
                size="small"
                @click="handleSaveEdit(goal.id)"
              >
                保存
              </el-button>
              <el-button
                v-if="editingGoalId === goal.id"
                type="text"
                size="small"
                @click="handleCancelEdit"
              >
                取消
              </el-button>
              <el-popconfirm
                v-if="!editingGoalId || editingGoalId !== goal.id"
                :title="goal.isDefault ? '确定要删除这个默认改善问题选项吗？删除后将无法恢复。' : '确定要删除这个改善问题选项吗？'"
                @confirm="handleRemoveGoal(goal.id)"
              >
                <template #reference>
                  <el-button
                    type="text"
                    size="small"
                    class="delete-btn"
                    :class="{ 'default-delete': goal.isDefault }"
                  >
                    删除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计信息 -->
      <div class="stats-section">
        <el-divider />
        <div class="stats">
          <span>总计：{{ improvementGoalsStore.allGoals.length }} 个选项</span>
          <span>默认：{{ improvementGoalsStore.defaultGoals.length }} 个</span>
          <span>自定义：{{ improvementGoalsStore.customGoals.length }} 个</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="danger" @click="handleResetToDefault">重置为默认</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useImprovementGoalsStore } from '@/stores/improvementGoals'

// Props
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Store
const improvementGoalsStore = useImprovementGoalsStore()

// 响应式数据
const visible = ref(props.modelValue)
const newGoalLabel = ref('')
const editingGoalId = ref<string | null>(null)
const editingGoalLabel = ref('')
const draggingId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)

// 监听 props 变化
watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
})

// 监听 visible 变化
watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

// 方法
const handleClose = () => {
  visible.value = false
  handleCancelEdit()
}

const handleAddGoal = () => {
  const label = newGoalLabel.value.trim()
  if (!label) {
    ElMessage.warning('请输入改善问题选项')
    return
  }

  try {
    improvementGoalsStore.addGoal(label)
    improvementGoalsStore.saveToStorage()
    newGoalLabel.value = ''
    ElMessage.success('添加成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '添加失败')
  }
}

const handleStartEdit = (goal: any) => {
  editingGoalId.value = goal.id
  editingGoalLabel.value = goal.label
}

const handleSaveEdit = (goalId: string) => {
  const label = editingGoalLabel.value.trim()
  if (!label) {
    ElMessage.warning('请输入改善问题选项')
    return
  }

  try {
    improvementGoalsStore.updateGoal(goalId, label)
    improvementGoalsStore.saveToStorage()
    handleCancelEdit()
    ElMessage.success('编辑成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '编辑失败')
  }
}

const handleCancelEdit = () => {
  editingGoalId.value = null
  editingGoalLabel.value = ''
}

const handleRemoveGoal = (goalId: string) => {
  try {
    improvementGoalsStore.removeGoal(goalId)
    improvementGoalsStore.saveToStorage()
    ElMessage.success('删除成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

const handleResetToDefault = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置为默认选项吗？这将删除所有自定义的改善问题选项。',
      '重置确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    improvementGoalsStore.resetToDefault()
    improvementGoalsStore.saveToStorage()
    ElMessage.success('重置成功')
  } catch {
    // 用户取消操作
  }
}

// 拖拽排序相关方法
const handleDragStart = (event: DragEvent, goal: any) => {
  draggingId.value = goal.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', goal.id)
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDrop = (event: DragEvent, targetGoal: any) => {
  event.preventDefault()
  
  const draggedId = draggingId.value
  if (!draggedId || draggedId === targetGoal.id) {
    return
  }

  try {
    // 获取当前所有选项的顺序
    const currentGoals = improvementGoalsStore.allGoals
    const draggedIndex = currentGoals.findIndex(g => g.id === draggedId)
    const targetIndex = currentGoals.findIndex(g => g.id === targetGoal.id)
    
    if (draggedIndex === -1 || targetIndex === -1) {
      return
    }

    // 创建新的排序数组
    const newOrder = [...currentGoals]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)
    
    // 更新排序
    const newOrderIds = newOrder.map(goal => goal.id)
    improvementGoalsStore.reorderGoals(newOrderIds)
    
    ElMessage.success('排序已更新')
  } catch (error) {
    ElMessage.error('排序失败')
  }
}

const handleDragEnd = () => {
  draggingId.value = null
  dragOverId.value = null
}

// 初始化
onMounted(() => {
  improvementGoalsStore.loadFromStorage()
})
</script>

<style scoped>
.improvement-goals-manager {
  .manager-content {
    max-height: 500px;
    overflow-y: auto;
  }

  .add-section {
    margin-bottom: 24px;
    
    h4 {
      margin: 0 0 12px 0;
      color: #303133;
      font-size: 14px;
      font-weight: 600;
    }

    .add-form {
      display: flex;
      gap: 12px;
      align-items: center;
    }
  }

  .goals-list {
    h4 {
      margin: 0 0 16px 0;
      color: #303133;
      font-size: 14px;
      font-weight: 600;
      
      .sort-hint {
        font-size: 12px;
        color: #909399;
        font-weight: normal;
      }
    }

    .goals-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .goal-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border: 1px solid #e4e7ed;
      border-radius: 6px;
      background: #fff;
      transition: all 0.2s;
      cursor: move;

      &:hover {
        border-color: #c0c4cc;
        background: #f8f9fa;
      }

      &.is-default {
        background: #f0f9ff;
        border-color: #d1d5db;
      }

      &.dragging {
        opacity: 0.5;
        transform: rotate(2deg);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .goal-content {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 8px;
        
        .drag-handle {
          color: #c0c4cc;
          cursor: move;
          display: flex;
          align-items: center;
          padding: 2px;
          border-radius: 3px;
          transition: color 0.2s;
          
          &:hover {
            color: #909399;
            background: #f5f7fa;
          }
          
          svg {
            width: 16px;
            height: 16px;
          }
        }
        
        .goal-display {
          display: flex;
          align-items: center;
          gap: 8px;

          .goal-label {
            color: #303133;
            font-size: 14px;
          }

          .default-tag {
            padding: 2px 6px;
            background: #e1f5fe;
            color: #0277bd;
            font-size: 12px;
            border-radius: 4px;
          }
        }

        .goal-edit {
          .el-input {
            width: 200px;
          }
        }
      }

      .goal-actions {
        display: flex;
        gap: 4px;

        .delete-btn {
          color: #f56c6c;
          
          &.default-delete {
            color: #e6a23c;
            
            &:hover {
              color: #cf9236;
            }
          }
        }
      }
    }
  }

  .stats-section {
    margin-top: 16px;

    .stats {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #909399;
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: space-between;
  }
}
</style>