<template>
  <el-card class="filter-card">
    <div class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <label>通话状态：</label>
          <el-select :model-value="filterForm.status" @update:model-value="updateFilter('status', $event)" placeholder="请选择状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="待外呼" value="pending" />
            <el-option label="已接通" value="connected" />
            <el-option label="未接听" value="no_answer" />
            <el-option label="忙线" value="busy" />
            <el-option label="失败" value="failed" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>客户等级：</label>
          <el-select :model-value="filterForm.customerLevel" @update:model-value="updateFilter('customerLevel', $event)" placeholder="请选择等级" clearable>
            <el-option label="全部" value="" />
            <el-option label="普通客户" value="normal" />
            <el-option label="白银客户" value="silver" />
            <el-option label="黄金客户" value="gold" />
            <el-option label="钻石客户" value="diamond" />
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
        <div class="filter-item" v-if="canViewSalesPersonFilter">
          <label>负责人：</label>
          <el-select :model-value="filterForm.salesPerson" @update:model-value="updateFilter('salesPerson', $event)" placeholder="请选择负责人" clearable filterable>
            <el-option label="全部" value="" />
            <el-option v-for="user in salesPersonList" :key="user.id" :label="user.name" :value="user.id" />
          </el-select>
        </div>
      </div>
      <div class="search-row">
        <el-input
          :model-value="searchKeyword"
          @update:model-value="$emit('update:searchKeyword', $event)"
          placeholder="搜索客户姓名、电话号码、订单号"
          clearable style="width: 400px;"
          @keyup.enter="$emit('search')"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-button type="primary" :icon="Search" @click="$emit('search')">搜索</el-button>
        <el-button :icon="RefreshRight" @click="$emit('reset')">重置</el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Search, RefreshRight } from '@element-plus/icons-vue'

const props = defineProps<{
  filterForm: { status: string; customerLevel: string; dateRange: any[]; salesPerson: string }
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
.filter-section { padding: 20px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { font-size: 14px; color: #606266; white-space: nowrap; min-width: 80px; }
.filter-item .el-select { min-width: 160px; width: auto; }
.filter-item .el-date-picker { min-width: 240px; width: auto; }
.search-row { display: flex; align-items: center; gap: 12px; }

@media (max-width: 1200px) {
  .filter-row { flex-direction: column; gap: 16px; }
  .filter-item { width: 100%; }
  .search-row { flex-direction: column; align-items: stretch; gap: 12px; }
}
</style>

