<template>
  <el-card class="filter-card">
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <label>外呼状态：</label>
          <el-select :model-value="filterForm.status" @update:model-value="updateFilter('status', $event)" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="待外呼" value="pending" />
            <el-option label="已外呼" value="called" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>数据来源：</label>
          <el-select :model-value="filterForm.dataSource" @update:model-value="updateFilter('dataSource', $event)" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="导入资料" value="import" />
            <el-option label="客户列表" value="customer" />
          </el-select>
        </div>
        <div class="filter-item" v-if="canViewSalesPersonFilter">
          <label>创建人：</label>
          <el-select :model-value="filterForm.salesPerson" @update:model-value="updateFilter('salesPerson', $event)" placeholder="全部" clearable filterable>
            <el-option label="全部" value="" />
            <el-option v-for="user in salesPersonList" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>时间范围：</label>
          <el-date-picker
            :model-value="filterForm.dateRange"
            @update:model-value="updateFilter('dateRange', $event)"
            type="daterange" range-separator="至"
            start-placeholder="开始日期" end-placeholder="结束日期"
            format="YYYY-MM-DD" value-format="YYYY-MM-DD"
          />
        </div>
        <div class="filter-item search-item">
          <el-input
            :model-value="searchKeyword"
            @update:model-value="$emit('update:searchKeyword', $event)"
            placeholder="搜索客户姓名、电话号码、订单号"
            clearable
            @keyup.enter="$emit('search')"
          >
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" :icon="Search" @click="$emit('search')">搜索</el-button>
          <el-button :icon="RefreshRight" @click="$emit('reset')">重置</el-button>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search, RefreshRight } from '@element-plus/icons-vue'

const props = defineProps<{
  filterForm: { status: string; customerLevel: string; dateRange: any[]; salesPerson: string; dataSource: string }
  searchKeyword: string
  canViewSalesPersonFilter: boolean
  salesPersonList: { id: string | number; name: string }[]
}>()

const emit = defineEmits<{
  'update:searchKeyword': [value: string]
  'update:filterForm': [value: any]
  search: []
  reset: []
}>()

const updateFilter = (key: string, value: any) => {
  emit('update:filterForm', { ...props.filterForm, [key]: value })
}
</script>

<style scoped>
.filter-card { margin-bottom: 20px; }
.filter-section { padding: 16px 20px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 6px; }
.filter-item label { font-size: 14px; color: #606266; white-space: nowrap; }
.filter-item :deep(.el-select) { min-width: 120px; width: auto; }
.filter-item :deep(.el-date-picker) { min-width: 220px; width: auto; }
.search-item { display: flex; align-items: center; gap: 8px; }
.search-item :deep(.el-input) { width: 240px; }
</style>

