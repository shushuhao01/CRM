<template>
  <el-dropdown
    trigger="click"
    @visible-change="handleDropdownVisible"
    placement="bottom-end"
  >
    <el-button size="small">
      <el-icon><Setting /></el-icon>
      列设置
    </el-button>
    <template #dropdown>
      <el-dropdown-menu class="column-settings-dropdown">
        <div class="column-settings-header">
          <span>列设置</span>
          <el-button
            type="text"
            size="small"
            @click="resetColumns"
            class="reset-btn"
          >
            重置
          </el-button>
        </div>
        <div class="column-settings-container">
          <div
            v-for="(column, index) in tableColumns"
            :key="column.prop"
            class="column-item"
            :draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver"
            @drop="handleDrop($event, index)"
          >
            <el-icon class="drag-handle"><Rank /></el-icon>
            <el-checkbox
              v-model="column.visible"
              @change="saveColumnSettings"
              class="column-checkbox"
            >
              {{ column.label }}
            </el-checkbox>
          </div>
        </div>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Setting, Rank } from '@element-plus/icons-vue'

interface TableColumn {
  prop: string
  label: string
  visible: boolean
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  align?: string
  fixed?: boolean | string
}

interface SavedColumn {
  prop: string
  visible: boolean
}

interface Props {
  columns: TableColumn[]
  storageKey: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:columns': [columns: TableColumn[]]
  'columns-change': [columns: TableColumn[]]
}>()

const tableColumns = ref<TableColumn[]>([])
const dragStartIndex = ref<number>(-1)

// 初始化列数据
const initializeColumns = () => {
  if (props.columns && Array.isArray(props.columns)) {
    tableColumns.value = props.columns.map(col => ({ ...col }))
  } else {
    tableColumns.value = []
  }
}

// 获取可见列
const visibleColumns = computed(() => {
  return tableColumns.value.filter(col => col.visible)
})

// 保存列设置到本地存储
const saveColumnSettings = () => {
  const settings = {
    columns: tableColumns.value.map(col => ({
      prop: col.prop,
      visible: col.visible
    })),
    order: tableColumns.value.map(col => col.prop)
  }
  localStorage.setItem(props.storageKey, JSON.stringify(settings))
  emit('update:columns', [...tableColumns.value])
  emit('columns-change', [...tableColumns.value])
}

// 从本地存储加载列设置
const loadColumnSettings = () => {
  try {
    const saved = localStorage.getItem(props.storageKey)
    if (saved) {
      const settings = JSON.parse(saved)

      // 恢复列的可见性
      if (settings.columns) {
        settings.columns.forEach((savedCol: SavedColumn) => {
          const column = tableColumns.value.find(col => col.prop === savedCol.prop)
          if (column) {
            column.visible = savedCol.visible
          }
        })
      }

      // 恢复列的顺序
      if (settings.order) {
        const orderedColumns: TableColumn[] = []

        // 特殊处理：如果是客户列表，确保客户编码字段在第一位
        if (props.storageKey === 'customer-list-columns') {
          const codeColumn = tableColumns.value.find(col => col.prop === 'code')
          if (codeColumn) {
            orderedColumns.push(codeColumn)
            // 确保客户编码字段默认可见
            codeColumn.visible = true
          }
        }

        settings.order.forEach((prop: string) => {
          const column = tableColumns.value.find(col => col.prop === prop)
          if (column && !orderedColumns.find(ordered => ordered.prop === prop)) {
            orderedColumns.push(column)
          }
        })

        // 添加新增的列（如果有的话）
        tableColumns.value.forEach(col => {
          if (!orderedColumns.find(ordered => ordered.prop === col.prop)) {
            orderedColumns.push(col)
          }
        })

        tableColumns.value = orderedColumns
      }

      emit('update:columns', [...tableColumns.value])
      emit('columns-change', [...tableColumns.value])
    }
  } catch (error) {
    console.error('加载列设置失败:', error)
  }
}

// 重置列设置
const resetColumns = () => {
  initializeColumns()
  localStorage.removeItem(props.storageKey)
  emit('update:columns', [...tableColumns.value])
  emit('columns-change', [...tableColumns.value])
}

// 下拉菜单显示状态变化
const handleDropdownVisible = (visible: boolean) => {
  if (!visible) {
    saveColumnSettings()
  }
}

// 拖拽开始
const handleDragStart = (event: DragEvent, index: number) => {
  dragStartIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

// 拖拽悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 拖拽放置
const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()

  if (dragStartIndex.value !== -1 && dragStartIndex.value !== dropIndex) {
    const draggedItem = tableColumns.value[dragStartIndex.value]
    const newColumns = [...tableColumns.value]

    // 移除拖拽的项目
    newColumns.splice(dragStartIndex.value, 1)

    // 在新位置插入
    newColumns.splice(dropIndex, 0, draggedItem)

    tableColumns.value = newColumns
    saveColumnSettings()
  }

  dragStartIndex.value = -1
}

// 监听props变化
const updateColumns = () => {
  initializeColumns()
  loadColumnSettings()
}

// 🔥 监听props.columns变化，更新label（但保持用户的visible设置）
watch(() => props.columns, (newColumns) => {
  if (newColumns && Array.isArray(newColumns)) {
    // 只更新label，保持用户的visible设置
    newColumns.forEach(newCol => {
      const existingCol = tableColumns.value.find(col => col.prop === newCol.prop)
      if (existingCol) {
        existingCol.label = newCol.label // 更新label
      }
    })
    emit('update:columns', [...tableColumns.value])
    emit('columns-change', [...tableColumns.value])
  }
}, { deep: true })

onMounted(() => {
  updateColumns()
})

// 暴露方法给父组件
defineExpose({
  loadColumnSettings,
  resetColumns,
  visibleColumns
})
</script>

<style scoped>
.column-settings-dropdown {
  min-width: 200px;
  max-width: 300px;
}

.column-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
}

.reset-btn {
  color: #409eff;
  font-size: 12px;
}

.column-settings-container {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px 0;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: move;
  transition: background-color 0.2s;
}

.column-item:hover {
  background-color: #f5f7fa;
}

.drag-handle {
  margin-right: 8px;
  color: #c0c4cc;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.column-checkbox {
  flex: 1;
}

.column-checkbox :deep(.el-checkbox__label) {
  font-size: 14px;
  color: #606266;
}
</style>
