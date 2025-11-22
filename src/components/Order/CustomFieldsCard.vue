<template>
  <el-card v-if="shouldShow" class="custom-fields-card">
    <template #header>
      <div class="card-header">
        <el-icon><Setting /></el-icon>
        <span>自定义字段</span>
      </div>
    </template>

    <el-row :gutter="20">
      <el-col
        v-for="field in sortedFields"
        :key="field.id"
        :span="getColSpan(field.fieldType)"
      >
        <el-form-item
          :label="field.fieldName"
          :prop="`customFields.${field.fieldKey}`"
          :required="field.required"
        >
          <!-- 文本输入 -->
          <el-input
            v-if="field.fieldType === 'text'"
            v-model="modelValue[field.fieldKey]"
            :placeholder="field.placeholder || `请输入${field.fieldName}`"
            clearable
          />

          <!-- 数字输入 -->
          <el-input-number
            v-else-if="field.fieldType === 'number'"
            v-model="modelValue[field.fieldKey]"
            :placeholder="field.placeholder || `请输入${field.fieldName}`"
            style="width: 100%"
          />

          <!-- 日期选择 -->
          <el-date-picker
            v-else-if="field.fieldType === 'date'"
            v-model="modelValue[field.fieldKey]"
            type="date"
            :placeholder="field.placeholder || `请选择${field.fieldName}`"
            style="width: 100%"
            value-format="YYYY-MM-DD"
          />

          <!-- 日期时间选择 -->
          <el-date-picker
            v-else-if="field.fieldType === 'datetime'"
            v-model="modelValue[field.fieldKey]"
            type="datetime"
            :placeholder="field.placeholder || `请选择${field.fieldName}`"
            style="width: 100%"
            value-format="YYYY-MM-DD HH:mm:ss"
          />

          <!-- 下拉选择 -->
          <el-select
            v-else-if="field.fieldType === 'select'"
            v-model="modelValue[field.fieldKey]"
            :placeholder="field.placeholder || `请选择${field.fieldName}`"
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="option in field.options"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>

          <!-- 单选 -->
          <el-radio-group
            v-else-if="field.fieldType === 'radio'"
            v-model="modelValue[field.fieldKey]"
          >
            <el-radio
              v-for="option in field.options"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-radio>
          </el-radio-group>

          <!-- 多选 -->
          <el-checkbox-group
            v-else-if="field.fieldType === 'checkbox'"
            v-model="modelValue[field.fieldKey]"
          >
            <el-checkbox
              v-for="option in field.options"
              :key="option.value"
              :label="option.value"
            >
              {{ option.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Setting } from '@element-plus/icons-vue'
import { useOrderFieldConfigStore, type CustomField } from '@/stores/orderFieldConfig'

// Props
const props = defineProps<{
  modelValue: Record<string, unknown>
  show?: boolean  // 控制是否显示卡片
}>()

// Emits
defineEmits<{
  'update:modelValue': [value: Record<string, unknown>]
}>()

// Store
const fieldConfigStore = useOrderFieldConfigStore()

// 计算属性
const hasCustomFields = computed(() => fieldConfigStore.customFields.length > 0)

// 是否显示卡片（有自定义字段且show为true）
const shouldShow = computed(() => {
  return hasCustomFields.value && (props.show !== false)
})

const sortedFields = computed(() => {
  return [...fieldConfigStore.customFields].sort((a, b) => a.sortOrder - b.sortOrder)
})

// 根据字段类型决定列宽
const getColSpan = (fieldType: string) => {
  switch (fieldType) {
    case 'text':
    case 'select':
      return 8
    case 'number':
    case 'date':
      return 6
    case 'datetime':
      return 8
    case 'radio':
    case 'checkbox':
      return 12
    default:
      return 8
  }
}
</script>

<style scoped>
.custom-fields-card {
  margin-bottom: 20px;
}

.custom-fields-card .card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}
</style>
