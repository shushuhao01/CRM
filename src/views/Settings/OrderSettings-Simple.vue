<template>
  <div class="order-settings-container">
    <div class="page-header">
      <h2>订单设置</h2>
      <p>配置订单字段和自定义字段</p>
    </div>

    <!-- 订单来源配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>订单来源配置</span>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="字段名称">
          {{ fieldConfigStore.orderSourceFieldName }}
        </el-descriptions-item>
        <el-descriptions-item label="选项数量">
          {{ fieldConfigStore.orderSourceOptions.length }} 个
        </el-descriptions-item>
      </el-descriptions>

      <div class="options-preview">
        <h4>当前选项:</h4>
        <el-tag
          v-for="option in fieldConfigStore.orderSourceOptions"
          :key="option.value"
          style="margin: 5px"
        >
          {{ option.label }}
        </el-tag>
      </div>
    </el-card>

    <!-- 自定义字段管理 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>自定义字段管理</span>
        </div>
      </template>

      <el-table :data="fieldConfigStore.customFields" style="width: 100%">
        <el-table-column prop="fieldName" label="字段名称" width="150" />
        <el-table-column prop="fieldKey" label="字段键名" width="150" />
        <el-table-column prop="fieldType" label="字段类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getFieldTypeColor(row.fieldType)" size="small">
              {{ getFieldTypeLabel(row.fieldType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="required" label="必填" width="80">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">
              {{ row.required ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="showInList" label="列表显示" width="100">
          <template #default="{ row }">
            <el-switch v-model="row.showInList" />
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位符" min-width="150" show-overflow-tooltip />
      </el-table>

      <el-empty v-if="fieldConfigStore.customFields.length === 0" description="暂无自定义字段" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'

const fieldConfigStore = useOrderFieldConfigStore()

// 字段类型标签颜色
const getFieldTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    text: 'primary',
    number: 'success',
    date: 'warning',
    datetime: 'warning',
    select: 'info',
    radio: 'danger',
    checkbox: 'danger'
  }
  return colors[type] || 'primary'
}

// 字段类型标签文本
const getFieldTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: '文本',
    number: '数字',
    date: '日期',
    datetime: '日期时间',
    select: '下拉选择',
    radio: '单选',
    checkbox: '多选'
  }
  return labels[type] || type
}
</script>

<style scoped>
.order-settings-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.options-preview {
  margin-top: 16px;
}

.options-preview h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}
</style>
