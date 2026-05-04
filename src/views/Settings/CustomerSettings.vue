<template>
  <div class="customer-settings-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>客户设置</h2>
      <p>配置客户表单字段显示和自定义字段</p>
    </div>

    <!-- 内置字段配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>内置字段配置</span>
          <el-tag type="info" size="small">控制新增客户表单字段的显示和必填</el-tag>
        </div>
      </template>

      <el-table :data="builtinFieldsData" style="width: 100%">
        <el-table-column prop="label" label="字段名称" width="150" />
        <el-table-column prop="key" label="字段键名" width="180" />
        <el-table-column label="启用" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.enabled"
              :disabled="row.alwaysEnabled"
              @change="handleFieldVisibilityChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="必填" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.required"
              :disabled="row.alwaysEnabled || !row.enabled"
              @change="handleFieldVisibilityChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="小程序启用" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.mpEnabled"
              size="small"
              :disabled="!row.enabled"
              @change="handleFieldVisibilityChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="小程序必填" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.mpRequired"
              size="small"
              :disabled="!row.enabled || !row.mpEnabled"
              @change="handleFieldVisibilityChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="小程序折叠" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.mpCollapsed"
              size="small"
              :disabled="!row.enabled || !row.mpEnabled"
              @change="handleFieldVisibilityChange"
            />
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="{ row }">
            <span v-if="row.alwaysEnabled" style="color: #999; font-size: 12px;">核心字段，不可禁用</span>
            <span v-else-if="!row.enabled" style="color: #999; font-size: 12px;">已隐藏，新增客户表单中不显示</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 自定义字段管理 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>自定义字段管理</span>
          <div>
            <el-tag type="warning" size="small" style="margin-right: 8px;">最多10个</el-tag>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="openAddFieldDialog"
              :disabled="localConfig.customFields.length >= 10"
            >
              添加字段
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="localConfig.customFields" style="width: 100%" v-if="localConfig.customFields.length > 0">
        <el-table-column prop="fieldName" label="字段名称" width="150" />
        <el-table-column prop="fieldKey" label="字段键名" width="200" />
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
            <el-tag :type="row.showInList ? 'success' : 'info'" size="small">
              {{ row.showInList ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位符" min-width="120" show-overflow-tooltip />
        <el-table-column label="小程序必填" width="100">
          <template #default="{ row }">
            <el-tag :type="row.mpRequired ? 'danger' : 'info'" size="small">
              {{ row.mpRequired ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="小程序显示" width="100">
          <template #default="{ row }">
            <el-tag :type="row.mpDisplay === 'show' ? 'success' : row.mpDisplay === 'collapsed' ? 'warning' : 'info'" size="small">
              {{ ({ show: '显示', collapsed: '折叠', hidden: '隐藏' } as Record<string, string>)[row.mpDisplay || 'show'] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row, $index }">
            <el-button size="small" type="primary" link @click="openEditFieldDialog(row, $index)">编辑</el-button>
            <el-button size="small" link @click="moveFieldUp($index)" :disabled="$index === 0">上移</el-button>
            <el-button size="small" link @click="moveFieldDown($index)" :disabled="$index === (localConfig.customFields.length - 1)">下移</el-button>
            <el-button size="small" type="danger" link @click="deleteField($index)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无自定义字段，点击上方【添加字段】按钮开始配置（最多10个）" />
    </el-card>

    <!-- 保存按钮 -->
    <div class="save-actions">
      <el-button size="large" @click="resetConfig">重置配置</el-button>
      <el-button type="primary" size="large" @click="saveConfig" :loading="saving">
        保存配置
      </el-button>
    </div>

    <!-- 自定义字段编辑对话框 -->
    <el-dialog
      v-model="customFieldDialogVisible"
      :title="isEditingField ? '编辑自定义字段' : '添加自定义字段'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="customFieldFormRef"
        :model="customFieldForm"
        :rules="customFieldRules"
        label-width="100px"
      >
        <el-form-item label="字段名称" prop="fieldName">
          <el-input v-model="customFieldForm.fieldName" placeholder="请输入字段名称，如：客户职业" />
        </el-form-item>
        <el-form-item label="字段键名" prop="fieldKey">
          <el-select
            v-model="customFieldForm.fieldKey"
            placeholder="请选择字段键名"
            style="width: 100%"
            :disabled="isEditingField"
          >
            <el-option
              v-for="key in availableFieldKeys"
              :key="key.value"
              :label="key.label"
              :value="key.value"
              :disabled="key.disabled"
            />
          </el-select>
          <div class="form-tip">字段键名用于数据存储，每个键名只能使用一次</div>
        </el-form-item>
        <el-form-item label="字段类型" prop="fieldType">
          <el-select
            v-model="customFieldForm.fieldType"
            placeholder="请选择字段类型"
            style="width: 100%"
            :disabled="isEditingField"
          >
            <el-option label="文本" value="text" />
            <el-option label="数字" value="number" />
            <el-option label="日期" value="date" />
            <el-option label="日期时间" value="datetime" />
            <el-option label="下拉选择" value="select" />
            <el-option label="单选" value="radio" />
            <el-option label="多选" value="checkbox" />
          </el-select>
        </el-form-item>
        <el-form-item label="必填" prop="required">
          <el-switch v-model="customFieldForm.required" />
        </el-form-item>
        <el-form-item label="占位符" prop="placeholder">
          <el-input v-model="customFieldForm.placeholder" placeholder="请输入占位符提示文本" />
        </el-form-item>
        <el-form-item label="列表显示" prop="showInList">
          <el-switch v-model="customFieldForm.showInList" />
          <div class="form-tip">开启后，该字段将在客户列表中显示</div>
        </el-form-item>
        <el-form-item label="小程序必填">
          <el-switch v-model="customFieldForm.mpRequired" />
          <div class="form-tip">开启后，客户在小程序填写时此字段为必填</div>
        </el-form-item>
        <el-form-item label="小程序显示">
          <el-select v-model="customFieldForm.mpDisplay" style="width: 200px">
            <el-option label="显示" value="show" />
            <el-option label="折叠（展开后可见）" value="collapsed" />
            <el-option label="隐藏（不在小程序中显示）" value="hidden" />
          </el-select>
        </el-form-item>
        <el-form-item
          label="选项配置"
          v-if="['select', 'radio', 'checkbox'].includes(customFieldForm.fieldType)"
          required
        >
          <div class="options-editor">
            <div
              v-for="(option, index) in customFieldForm.options"
              :key="index"
              class="option-item"
            >
              <el-input v-model="option.label" placeholder="选项名称" style="width: 200px" @input="autoFillOptionValue(option)" />
              <el-input v-model="option.value" placeholder="选项值(自动生成)" style="width: 200px" />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeFieldOption(index)"
                :disabled="customFieldForm.options.length <= 1"
              />
            </div>
            <el-button type="primary" size="small" :icon="Plus" @click="addFieldOption">
              添加选项
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="customFieldDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomField">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useCustomerFieldConfigStore, BUILTIN_FIELDS } from '@/stores/customerFieldConfig'

const fieldConfigStore = useCustomerFieldConfigStore()

// 预设的10个自定义字段键名
const PRESET_FIELD_KEYS = [
  { value: 'customer_custom_field1', label: 'customer_custom_field1 (自定义字段1)' },
  { value: 'customer_custom_field2', label: 'customer_custom_field2 (自定义字段2)' },
  { value: 'customer_custom_field3', label: 'customer_custom_field3 (自定义字段3)' },
  { value: 'customer_custom_field4', label: 'customer_custom_field4 (自定义字段4)' },
  { value: 'customer_custom_field5', label: 'customer_custom_field5 (自定义字段5)' },
  { value: 'customer_custom_field6', label: 'customer_custom_field6 (自定义字段6)' },
  { value: 'customer_custom_field7', label: 'customer_custom_field7 (自定义字段7)' },
  { value: 'customer_custom_field8', label: 'customer_custom_field8 (自定义字段8)' },
  { value: 'customer_custom_field9', label: 'customer_custom_field9 (自定义字段9)' },
  { value: 'customer_custom_field10', label: 'customer_custom_field10 (自定义字段10)' }
]

// 计算可用的字段键名
const availableFieldKeys = computed(() => {
  const usedKeys = localConfig.customFields.map(f => f.fieldKey)
  return PRESET_FIELD_KEYS.map(key => ({
    ...key,
    disabled: usedKeys.includes(key.value) && key.value !== customFieldForm.fieldKey
  }))
})

// 内置字段数据（用于表格展示）
const builtinFieldsData = reactive(
  BUILTIN_FIELDS.map(f => ({
    ...f,
    enabled: true,
    required: false,
    mpEnabled: true,
    mpRequired: false,
    mpCollapsed: false
  }))
)

// 本地配置
const localConfig = reactive({
  customFields: [] as Array<any>
})

// 对话框状态
const customFieldDialogVisible = ref(false)
const isEditingField = ref(false)
const editingFieldIndex = ref(-1)
const saving = ref(false)
const customFieldFormRef = ref()

// 自定义字段表单
const customFieldForm = reactive({
  fieldName: '',
  fieldKey: '',
  fieldType: 'text',
  required: false,
  placeholder: '',
  showInList: true,
  options: [] as Array<{ label: string; value: string }>,
  mpRequired: false,
  mpDisplay: 'show' as 'show' | 'collapsed' | 'hidden'
})

// 表单验证规则
const customFieldRules = {
  fieldName: [{ required: true, message: '请输入字段名称', trigger: 'blur' }],
  fieldKey: [{ required: true, message: '请选择字段键名', trigger: 'change' }],
  fieldType: [{ required: true, message: '请选择字段类型', trigger: 'change' }]
}

// 监听字段类型变化，自动添加初始选项
watch(() => customFieldForm.fieldType, (newType) => {
  if (['select', 'radio', 'checkbox'].includes(newType) && customFieldForm.options.length === 0) {
    customFieldForm.options.push({ label: '', value: '' })
  }
})

// 字段类型颜色
const getFieldTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    text: 'primary', number: 'success', date: 'warning', datetime: 'warning',
    select: 'info', radio: 'danger', checkbox: 'danger'
  }
  return colors[type] || 'primary'
}

// 字段类型标签
const getFieldTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    text: '文本', number: '数字', date: '日期', datetime: '日期时间',
    select: '下拉选择', radio: '单选', checkbox: '多选'
  }
  return labels[type] || type
}

// 同步内置字段可见性到本地数据
const syncBuiltinFieldsFromConfig = () => {
  const vis = fieldConfigStore.config.fieldVisibility
  builtinFieldsData.forEach(f => {
    const v = vis[f.key]
    if (v) {
      f.enabled = v.enabled
      f.required = v.required
      f.mpEnabled = v.mpEnabled !== false
      f.mpRequired = v.mpRequired || false
      f.mpCollapsed = v.mpCollapsed || false
    }
    if (f.alwaysEnabled) {
      f.enabled = true
    }
  })
}

// 同步自定义字段到本地数据
const initLocalConfig = () => {
  localConfig.customFields = JSON.parse(JSON.stringify(fieldConfigStore.config.customFields))
  syncBuiltinFieldsFromConfig()
}

// 处理内置字段变更
const handleFieldVisibilityChange = () => {
  // 仅本地更新，等待保存
}

// 打开添加字段对话框
const openAddFieldDialog = () => {
  if (localConfig.customFields.length >= 10) {
    ElMessage.warning('自定义字段最多10个')
    return
  }
  isEditingField.value = false
  editingFieldIndex.value = -1
  Object.assign(customFieldForm, {
    fieldName: '', fieldKey: '', fieldType: 'text',
    required: false, placeholder: '', showInList: true, options: [],
    mpRequired: false, mpDisplay: 'show'
  })
  customFieldDialogVisible.value = true
}

// 打开编辑字段对话框
const openEditFieldDialog = (field: any, index: number) => {
  isEditingField.value = true
  editingFieldIndex.value = index
  Object.assign(customFieldForm, {
    fieldName: field.fieldName,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder || '',
    showInList: field.showInList,
    options: field.options ? JSON.parse(JSON.stringify(field.options)) : [],
    mpRequired: field.mpRequired || false,
    mpDisplay: field.mpDisplay || 'show'
  })
  customFieldDialogVisible.value = true
}

// 保存自定义字段
const saveCustomField = async () => {
  try {
    await customFieldFormRef.value?.validate()

    if (!isEditingField.value) {
      const exists = localConfig.customFields.some(f => f.fieldKey === customFieldForm.fieldKey)
      if (exists) {
        ElMessage.warning('字段键名已存在')
        return
      }
    }

    if (['select', 'radio', 'checkbox'].includes(customFieldForm.fieldType)) {
      if (customFieldForm.options.length === 0) {
        ElMessage.warning('请至少添加一个选项')
        return
      }
      for (const option of customFieldForm.options) {
        if (!option.label.trim() || !option.value.trim()) {
          ElMessage.warning('请填写完整的选项信息')
          return
        }
      }
    }

    if (isEditingField.value) {
      const field = localConfig.customFields[editingFieldIndex.value]
      field.fieldName = customFieldForm.fieldName
      field.required = customFieldForm.required
      field.placeholder = customFieldForm.placeholder
      field.showInList = customFieldForm.showInList
      field.mpRequired = customFieldForm.mpRequired
      field.mpDisplay = customFieldForm.mpDisplay
      if (customFieldForm.options.length > 0) {
        field.options = JSON.parse(JSON.stringify(customFieldForm.options))
      }
      ElMessage.success('字段已更新，请点击"保存配置"按钮保存')
    } else {
      localConfig.customFields.push({
        id: 'field_' + Date.now(),
        fieldName: customFieldForm.fieldName,
        fieldKey: customFieldForm.fieldKey,
        fieldType: customFieldForm.fieldType,
        required: customFieldForm.required,
        placeholder: customFieldForm.placeholder,
        showInList: customFieldForm.showInList,
        sortOrder: localConfig.customFields.length,
        options: customFieldForm.options.length > 0 ? JSON.parse(JSON.stringify(customFieldForm.options)) : undefined,
        mpRequired: customFieldForm.mpRequired,
        mpDisplay: customFieldForm.mpDisplay
      })
      ElMessage.success('字段已添加，请点击"保存配置"按钮保存')
    }

    customFieldDialogVisible.value = false
  } catch (error) {
    console.error('保存字段失败:', error)
  }
}

// 删除字段
const deleteField = async (index: number) => {
  try {
    const field = localConfig.customFields[index]
    await ElMessageBox.confirm(`确定要删除字段"${field.fieldName}"吗？`, '确认删除', { type: 'warning' })
    localConfig.customFields.splice(index, 1)
    localConfig.customFields.forEach((f, i) => { f.sortOrder = i })
    ElMessage.success('字段已删除，请点击"保存配置"按钮保存')
  } catch { /* 用户取消 */ }
}

// 上移
const moveFieldUp = (index: number) => {
  if (index > 0) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index - 1]
    localConfig.customFields[index - 1] = temp
    localConfig.customFields.forEach((f, i) => { f.sortOrder = i })
  }
}

// 下移
const moveFieldDown = (index: number) => {
  if (index < localConfig.customFields.length - 1) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index + 1]
    localConfig.customFields[index + 1] = temp
    localConfig.customFields.forEach((f, i) => { f.sortOrder = i })
  }
}

// 选项名称自动生成选项值
const autoFillOptionValue = (option: { label: string; value: string }) => {
  // 如果用户没有手动修改过值（值为空或与之前自动生成的一致），则自动填充
  if (!option.value || option.value === option.label.trim().replace(/\s+/g, '_')) {
    option.value = option.label.trim().replace(/\s+/g, '_')
  }
}

// 添加/删除选项
const addFieldOption = () => { customFieldForm.options.push({ label: '', value: '' }) }
const removeFieldOption = (index: number) => { customFieldForm.options.splice(index, 1) }

// 保存配置
const saveConfig = async () => {
  try {
    saving.value = true

    // 构建 fieldVisibility
    const fieldVisibility: Record<string, { enabled: boolean; required: boolean; mpEnabled?: boolean; mpRequired?: boolean; mpCollapsed?: boolean }> = {}
    builtinFieldsData.forEach(f => {
      fieldVisibility[f.key] = {
        enabled: f.enabled,
        required: f.required,
        mpEnabled: f.mpEnabled,
        mpRequired: f.mpRequired,
        mpCollapsed: f.mpCollapsed
      }
    })

    const configData = {
      fieldVisibility,
      customFields: localConfig.customFields.map((field, index) => ({
        ...field,
        id: field.id || ('field_' + Date.now() + '_' + index),
        sortOrder: index
      }))
    }

    console.log('[客户设置] 保存配置:', configData)

    const token = localStorage.getItem('auth_token')
    const response = await fetch('/api/v1/system/customer-field-config', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(configData)
    })

    const result = await response.json()
    if (result.success) {
      // 同步到 store
      fieldConfigStore.config.fieldVisibility = fieldVisibility
      fieldConfigStore.config.customFields = [...localConfig.customFields]
      ElMessage.success('客户设置保存成功，已全局生效')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存客户设置失败:', error)
    ElMessage.error('保存失败，请检查网络连接')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm('确定要重置配置吗？将恢复到当前保存的配置。', '确认重置', { type: 'warning' })
    initLocalConfig()
    ElMessage.success('配置已重置')
  } catch { /* 用户取消 */ }
}

// 初始化
onMounted(async () => {
  await fieldConfigStore.loadConfig()
  initLocalConfig()
  console.log('[客户设置] 页面初始化完成，自定义字段数量:', localConfig.customFields.length)
})
</script>

<style scoped>
.customer-settings-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #000;
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

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.options-editor {
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 0;
}
</style>

