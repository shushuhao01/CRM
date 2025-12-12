<template>
  <div class="dynamic-table-container">
    <!-- 表格头部操作区 -->
    <div class="table-header" v-if="showHeader">
      <div class="table-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="table-actions">
        <slot name="header-actions"></slot>
        <TableColumnSettings
          v-if="showColumnSettings"
          :columns="allColumns"
          :storage-key="storageKey"
          @columns-change="handleColumnsChange"
          ref="columnSettingsRef"
        />
      </div>
    </div>

    <!-- 动态表格 -->
    <el-table
      :data="data"
      v-loading="loading"
      v-bind="$attrs"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      stripe
      border
      :scrollbar-always-on="true"
      class="sticky-header-table"
    >
      <!-- 选择列 -->
      <el-table-column
        v-if="showSelection"
        type="selection"
        width="55"
      />

      <!-- 动态渲染列 -->
      <el-table-column
        v-for="column in visibleColumns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth"
        :sortable="column.sortable"
        :align="column.align"
        :fixed="column.fixed"
        :show-overflow-tooltip="column.showOverflowTooltip"
      >
        <template #default="{ row, column: tableColumn, $index }">
          <slot
            :name="`column-${column.prop}`"
            :row="row"
            :column="column"
            :value="column.prop.includes('.') ? getNestedValue(row, column.prop) : row[column.prop]"
            :index="$index"
          >
            <!-- 默认渲染 -->
            <span>{{ formatCellValue(column.prop.includes('.') ? getNestedValue(row, column.prop) : row[column.prop], column, row) }}</span>
          </slot>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column
        v-if="showActions"
        label="操作"
        :width="actionsWidth"
        :min-width="actionsMinWidth"
        fixed="right"
      >
        <template #default="{ row, $index }">
          <slot name="table-actions" :row="row" :index="$index"></slot>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="table-pagination" v-if="showPagination">
      <div class="pagination-stats">
        <slot name="pagination-stats">
          <span class="stats-text">共 {{ total }} 条记录</span>
        </slot>
      </div>
      <div class="pagination-controls">
        <slot name="pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="pageSizes"
            :total="total"
            layout="sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import TableColumnSettings from './TableColumnSettings.vue'

interface TableColumn {
  prop: string
  label: string
  visible?: boolean
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  align?: string
  fixed?: boolean | string
  showOverflowTooltip?: boolean
  formatter?: (value: unknown, row: Record<string, unknown>) => string
}

interface Props {
  // 表格数据
  data: Record<string, unknown>[]
  // 列配置
  columns: TableColumn[]
  // 存储键名
  storageKey: string
  // 表格标题
  title?: string
  // 是否显示头部
  showHeader?: boolean
  // 是否显示列设置
  showColumnSettings?: boolean
  // 是否显示选择列
  showSelection?: boolean
  // 是否显示操作列
  showActions?: boolean
  // 操作列宽度
  actionsWidth?: string | number
  actionsMinWidth?: string | number
  // 加载状态
  loading?: boolean
  // 分页相关
  showPagination?: boolean
  total?: number
  pageSizes?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showHeader: true,
  showColumnSettings: true,
  showSelection: false,
  showActions: true,
  actionsWidth: 200,
  actionsMinWidth: 150,
  loading: false,
  showPagination: true,
  total: 0,
  pageSizes: () => [10, 20, 50, 100]
})

const emit = defineEmits<{
  'selection-change': [selection: Record<string, unknown>[]]
  'sort-change': [sortInfo: { column: unknown; prop: string; order: string }]
  'size-change': [size: number]
  'current-change': [page: number]
}>()

const columnSettingsRef = ref()
const currentPage = ref(1)
const pageSize = ref(props.pageSizes[0] || 10)
const tableContainerRef = ref<HTMLElement | null>(null)
const isScrolled = ref(false)

// 🔥 计算表格高度 - 根据数据条数自适应，不设置max-height限制
// 让表格能完整显示所有数据，通过CSS sticky实现表头固定
const tableMaxHeight = computed(() => {
  // 返回undefined让表格自适应高度，不限制最大高度
  // 表头固定通过CSS sticky实现
  return undefined
})

// 所有列配置（包含默认visible状态）
const allColumns = computed(() => {
  return props.columns.map(col => ({
    ...col,
    visible: col.visible !== false // 默认显示
  }))
})

// 可见列
const visibleColumns = ref<TableColumn[]>([])

// 获取嵌套属性值
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  if (!path.includes('.')) {
    return obj[path]
  }
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// 格式化单元格值
const formatCellValue = (value: unknown, column: TableColumn, row?: Record<string, unknown>) => {
  // 如果是嵌套属性，从row中获取值
  if (row && column.prop.includes('.')) {
    value = getNestedValue(row, column.prop)
  }

  if (column.formatter) {
    return column.formatter(value, row || {})
  }

  if (value === null || value === undefined) {
    return '-'
  }

  return value
}

// 处理列变化
const handleColumnsChange = (columns: TableColumn[]) => {
  visibleColumns.value = columns.filter(col => col.visible)
}

// 表格事件处理
const handleSelectionChange = (selection: Record<string, unknown>[]) => {
  emit('selection-change', selection)
}

const handleSortChange = (sortInfo: { column: unknown; prop: string; order: string }) => {
  emit('sort-change', sortInfo)
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  emit('size-change', size)
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  emit('current-change', page)
}

// 初始化可见列
const initializeVisibleColumns = () => {
  // 如果没有保存的设置，使用默认的可见列
  visibleColumns.value = allColumns.value.filter(col => col.visible)
}

// 处理列设置加载完成
const handleColumnSettingsLoaded = () => {
  if (columnSettingsRef.value && columnSettingsRef.value.visibleColumns) {
    visibleColumns.value = columnSettingsRef.value.visibleColumns
  } else {
    initializeVisibleColumns()
  }
}

// 监听列配置变化
watch(() => props.columns, () => {
  initializeVisibleColumns()
  if (columnSettingsRef.value) {
    columnSettingsRef.value.loadColumnSettings()
  }
}, { immediate: true })

// 🔥 滚动监听 - 检测表头是否需要固定
const handleScroll = () => {
  nextTick(() => {
    const container = document.querySelector('.dynamic-table-container')
    if (container) {
      const rect = container.getBoundingClientRect()
      const table = container.querySelector('.el-table')
      // 当表格顶部滚动到视口顶部时，添加滚动状态类
      if (rect.top <= 0 && table) {
        table.classList.add('is-scrolled')
        isScrolled.value = true
      } else if (table) {
        table.classList.remove('is-scrolled')
        isScrolled.value = false
      }
    }
  })
}

// 组件挂载后初始化
onMounted(() => {
  initializeVisibleColumns()
  // 🔥 初始化时触发size-change事件，确保外部组件知道初始的pageSize
  emit('size-change', pageSize.value)

  // 🔥 添加滚动监听
  window.addEventListener('scroll', handleScroll, { passive: true })
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// 暴露方法
defineExpose({
  resetColumns: () => columnSettingsRef.value?.resetColumns(),
  loadColumnSettings: () => columnSettingsRef.value?.loadColumnSettings()
})
</script>

<style scoped>
.dynamic-table-container {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.table-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
}

.pagination-stats {
  display: flex;
  align-items: center;
}

.stats-text {
  color: #606266;
  font-size: 14px;
}

.pagination-controls {
  display: flex;
  align-items: center;
}

/* 表格横向滚动支持 */
:deep(.el-table) {
  width: 100%;
}

/* 🔥 表格容器横向滚动 */
:deep(.el-table__body-wrapper) {
  overflow-x: auto;
}

:deep(.el-scrollbar__wrap) {
  overflow-x: auto !important;
}

/* 🔥 操作列固定在右侧 - 使用sticky定位 */
:deep(.el-table__fixed-right) {
  position: sticky !important;
  right: 0;
  z-index: 10;
  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.12);
  background: #fff;
}

:deep(.el-table__fixed) {
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.12);
}

/* 🔥 确保固定列的背景色正确 */
:deep(.el-table__fixed-right .el-table__cell) {
  background: #fff;
}

:deep(.el-table__fixed-right .el-table__row:hover .el-table__cell) {
  background: #f5f7fa;
}

/* 🔥 斑马纹行的固定列背景 */
:deep(.el-table--striped .el-table__fixed-right .el-table__row--striped .el-table__cell) {
  background: #fafafa;
}

/* ========================================
   🔥 表头固定（Sticky Header）样式
   当页面滚动时，表头固定在顶部
   ======================================== */

/* 表格容器不限制高度，让内容自适应 */
.sticky-header-table {
  width: 100%;
}

/* 表头固定在页面顶部 */
:deep(.sticky-header-table .el-table__header-wrapper) {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
}

/* 表头单元格背景确保不透明 */
:deep(.sticky-header-table .el-table__header th.el-table__cell) {
  background: #f5f7fa !important;
}

/* 表头固定时的阴影效果 */
:deep(.sticky-header-table .el-table__header-wrapper::after) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

/* 滚动时显示阴影 - 通过JS添加scrolled类 */
:deep(.sticky-header-table.is-scrolled .el-table__header-wrapper::after) {
  opacity: 1;
}
</style>
