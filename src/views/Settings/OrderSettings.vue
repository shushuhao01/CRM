<template>
  <div class="order-settings-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>订单设置</h2>
      <p>配置订单字段和自定义字段</p>
    </div>

    <!-- 订单来源配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>订单来源配置</span>
          <el-button type="primary" size="small" @click="openOrderSourceDialog">
            编辑配置
          </el-button>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="字段名称">
          {{ localConfig.orderSourceFieldName }}
        </el-descriptions-item>
        <el-descriptions-item label="选项数量">
          {{ localConfig.orderSourceOptions.length }} 个
        </el-descriptions-item>
      </el-descriptions>

      <div class="options-preview">
        <h4>当前选项:</h4>
        <el-tag
          v-for="option in localConfig.orderSourceOptions"
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
          <el-button type="primary" size="small" :icon="Plus" @click="openAddFieldDialog">
            添加字段
          </el-button>
        </div>
      </template>

      <el-table :data="localConfig.customFields" style="width: 100%" v-if="localConfig.customFields.length > 0">
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
            <el-tag :type="row.showInList ? 'success' : 'info'" size="small">
              {{ row.showInList ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="placeholder" label="占位符" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row, $index }">
            <el-button size="small" type="primary" link @click="openEditFieldDialog(row, $index)">
              编辑
            </el-button>
            <el-button size="small" link @click="moveFieldUp($index)" :disabled="$index === 0">
              上移
            </el-button>
            <el-button size="small" link @click="moveFieldDown($index)" :disabled="$index === (localConfig.customFields.length - 1)">
              下移
            </el-button>
            <el-button size="small" type="danger" link @click="deleteField($index)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="暂无自定义字段，点击上方【添加字段】按钮开始配置" />
    </el-card>

    <!-- 订单流转时间配置 -->
    <el-card class="config-card">
      <template #header>
        <div class="card-header">
          <span>订单流转时间配置</span>
          <el-tag type="warning" size="small">全局生效</el-tag>
        </div>
      </template>

      <el-form label-width="140px">
        <el-form-item label="流转模式">
          <el-radio-group v-model="transferConfig.mode" @change="handleTransferModeChange">
            <el-radio label="immediate">无等待（立即流转）</el-radio>
            <el-radio label="delayed">延迟流转</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="流转等待时间" v-if="transferConfig.mode === 'delayed'">
          <el-input-number
            v-model="transferConfig.delayMinutes"
            :min="1"
            :max="1440"
            :step="1"
            style="width: 200px"
          />
          <span style="margin-left: 10px; color: #666;">分钟</span>
          <div class="form-tip">
            订单创建后，将在设定时间后自动流转到审核。范围：1-1440分钟（最长24小时）
          </div>
        </el-form-item>

        <el-form-item label="当前配置预览">
          <el-tag :type="transferConfig.mode === 'immediate' ? 'success' : 'warning'" size="large">
            {{ transferConfig.mode === 'immediate' ? '订单创建后立即流转到审核' : `订单创建后 ${transferConfig.delayMinutes} 分钟后流转到审核` }}
          </el-tag>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="saveTransferConfig" :loading="savingTransfer">
            保存流转配置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 保存按钮 -->
    <div class="save-actions">
      <el-button size="large" @click="resetConfig">重置配置</el-button>
      <el-button type="primary" size="large" @click="saveConfig" :loading="saving">
        保存配置
      </el-button>
    </div>

    <!-- 订单来源编辑对话框 -->
    <el-dialog
      v-model="orderSourceDialogVisible"
      title="编辑订单来源配置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="orderSourceForm" label-width="100px">
        <el-form-item label="字段名称" required>
          <el-input v-model="orderSourceForm.fieldName" placeholder="请输入字段名称，如：订单来源、订单渠道" />
        </el-form-item>
        <el-form-item label="选项配置" required>
          <div class="options-editor">
            <div
              v-for="(option, index) in orderSourceForm.options"
              :key="index"
              class="option-item"
            >
              <el-input
                v-model="option.label"
                placeholder="选项名称，如：线上商城"
                style="width: 200px"
              />
              <el-input
                v-model="option.value"
                placeholder="选项值，如：online"
                style="width: 200px"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeSourceOption(index)"
                :disabled="orderSourceForm.options.length <= 1"
              />
            </div>
            <el-button type="primary" size="small" :icon="Plus" @click="addSourceOption">
              添加选项
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="orderSourceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveOrderSource">确定</el-button>
      </template>
    </el-dialog>

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
          <el-input v-model="customFieldForm.fieldName" placeholder="请输入字段名称，如：客户等级" />
        </el-form-item>
        <el-form-item label="字段键名" prop="fieldKey">
          <el-input
            v-model="customFieldForm.fieldKey"
            placeholder="请输入字段键名，如：customerLevel"
            :disabled="isEditingField"
          />
          <div class="form-tip">字段键名用于数据存储，只能包含字母、数字和下划线，且以字母开头</div>
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
          <div class="form-tip">开启后，该字段将在订单列表中显示</div>
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
              <el-input
                v-model="option.label"
                placeholder="选项名称"
                style="width: 200px"
              />
              <el-input
                v-model="option.value"
                placeholder="选项值"
                style="width: 200px"
              />
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'

const fieldConfigStore = useOrderFieldConfigStore()

// 本地配置（用于编辑）
const localConfig = reactive({
  orderSourceFieldName: '',
  orderSourceOptions: [] as Array<{ label: string; value: string }>,
  customFields: [] as Array<any>
})

// 流转时间配置
const transferConfig = reactive({
  mode: 'delayed' as 'immediate' | 'delayed',
  delayMinutes: 3
})
const savingTransfer = ref(false)

// 处理流转模式变化
const handleTransferModeChange = (mode: string) => {
  if (mode === 'immediate') {
    transferConfig.delayMinutes = 0
  } else {
    transferConfig.delayMinutes = 3
  }
}

// 加载流转配置
const loadTransferConfig = async () => {
  try {
    const response = await fetch('/api/v1/system/order-transfer-config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    const result = await response.json()
    if (result.success && result.data) {
      transferConfig.mode = result.data.mode || 'delayed'
      transferConfig.delayMinutes = result.data.delayMinutes ?? 3
    }
  } catch (error) {
    console.error('加载流转配置失败:', error)
  }
}

// 保存流转配置
const saveTransferConfig = async () => {
  try {
    savingTransfer.value = true
    const response = await fetch('/api/v1/system/order-transfer-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mode: transferConfig.mode,
        delayMinutes: transferConfig.mode === 'immediate' ? 0 : transferConfig.delayMinutes
      })
    })
    const result = await response.json()
    if (result.success) {
      ElMessage.success('流转配置保存成功，已全局生效')
    } else {
      ElMessage.error(result.message || '保存失败')
    }
  } catch (error) {
    console.error('保存流转配置失败:', error)
    ElMessage.error('保存流转配置失败')
  } finally {
    savingTransfer.value = false
  }
}

// 对话框状态
const orderSourceDialogVisible = ref(false)
const customFieldDialogVisible = ref(false)
const isEditingField = ref(false)
const editingFieldIndex = ref(-1)
const saving = ref(false)

// 表单引用
const customFieldFormRef = ref()

// 订单来源表单
const orderSourceForm = reactive({
  fieldName: '',
  options: [] as Array<{ label: string; value: string }>
})

// 自定义字段表单
const customFieldForm = reactive({
  fieldName: '',
  fieldKey: '',
  fieldType: 'text',
  required: false,
  placeholder: '',
  showInList: true,
  options: [] as Array<{ label: string; value: string }>
})

// 表单验证规则
const customFieldRules = {
  fieldName: [
    { required: true, message: '请输入字段名称', trigger: 'blur' }
  ],
  fieldKey: [
    { required: true, message: '请输入字段键名', trigger: 'blur' },
    {
      pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
      message: '字段键名必须以字母开头，只能包含字母、数字和下划线',
      trigger: 'blur'
    }
  ],
  fieldType: [
    { required: true, message: '请选择字段类型', trigger: 'change' }
  ]
}

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

// 初始化本地配置
const initLocalConfig = () => {
  localConfig.orderSourceFieldName = fieldConfigStore.orderSourceFieldName
  localConfig.orderSourceOptions = JSON.parse(JSON.stringify(fieldConfigStore.orderSourceOptions))
  localConfig.customFields = JSON.parse(JSON.stringify(fieldConfigStore.customFields))
}

// 打开订单来源编辑对话框
const openOrderSourceDialog = () => {
  orderSourceForm.fieldName = localConfig.orderSourceFieldName
  orderSourceForm.options = JSON.parse(JSON.stringify(localConfig.orderSourceOptions))
  orderSourceDialogVisible.value = true
}

// 保存订单来源配置
const saveOrderSource = () => {
  if (!orderSourceForm.fieldName.trim()) {
    ElMessage.warning('请输入字段名称')
    return
  }
  if (orderSourceForm.options.length === 0) {
    ElMessage.warning('请至少添加一个选项')
    return
  }

  // 验证选项
  for (const option of orderSourceForm.options) {
    if (!option.label.trim() || !option.value.trim()) {
      ElMessage.warning('请填写完整的选项信息')
      return
    }
  }

  localConfig.orderSourceFieldName = orderSourceForm.fieldName
  localConfig.orderSourceOptions = JSON.parse(JSON.stringify(orderSourceForm.options))
  orderSourceDialogVisible.value = false
  ElMessage.success('订单来源配置已更新，请点击"保存配置"按钮保存')
}

// 添加订单来源选项
const addSourceOption = () => {
  orderSourceForm.options.push({ label: '', value: '' })
}

// 删除订单来源选项
const removeSourceOption = (index: number) => {
  orderSourceForm.options.splice(index, 1)
}

// 打开添加字段对话框
const openAddFieldDialog = () => {
  isEditingField.value = false
  editingFieldIndex.value = -1
  Object.assign(customFieldForm, {
    fieldName: '',
    fieldKey: '',
    fieldType: 'text',
    required: false,
    placeholder: '',
    showInList: true,
    options: []
  })
  customFieldDialogVisible.value = true
}

// 打开编辑字段对话框
const openEditFieldDialog = (field: unknown, index: number) => {
  isEditingField.value = true
  editingFieldIndex.value = index
  Object.assign(customFieldForm, {
    fieldName: field.fieldName,
    fieldKey: field.fieldKey,
    fieldType: field.fieldType,
    required: field.required,
    placeholder: field.placeholder || '',
    showInList: field.showInList,
    options: field.options ? JSON.parse(JSON.stringify(field.options)) : []
  })
  customFieldDialogVisible.value = true
}

// 保存自定义字段
const saveCustomField = async () => {
  try {
    await customFieldFormRef.value?.validate()

    // 检查字段键名是否重复（新增时）
    if (!isEditingField.value) {
      const exists = localConfig.customFields.some(f => f.fieldKey === customFieldForm.fieldKey)
      if (exists) {
        ElMessage.warning('字段键名已存在，请使用其他键名')
        return
      }
    }

    // 检查选项配置（如果需要）
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
      // 更新字段
      const field = localConfig.customFields[editingFieldIndex.value]
      field.fieldName = customFieldForm.fieldName
      field.required = customFieldForm.required
      field.placeholder = customFieldForm.placeholder
      field.showInList = customFieldForm.showInList
      if (customFieldForm.options.length > 0) {
        field.options = JSON.parse(JSON.stringify(customFieldForm.options))
      }
      ElMessage.success('字段已更新，请点击"保存配置"按钮保存')
    } else {
      // 添加字段
      const newField = {
        id: 'field_' + Date.now(),
        fieldName: customFieldForm.fieldName,
        fieldKey: customFieldForm.fieldKey,
        fieldType: customFieldForm.fieldType,
        required: customFieldForm.required,
        placeholder: customFieldForm.placeholder,
        showInList: customFieldForm.showInList,
        sortOrder: localConfig.customFields.length,
        options: customFieldForm.options.length > 0 ? JSON.parse(JSON.stringify(customFieldForm.options)) : undefined
      }
      localConfig.customFields.push(newField)
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
    await ElMessageBox.confirm(
      `确定要删除字段"${field.fieldName}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    localConfig.customFields.splice(index, 1)
    // 重新排序
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已删除，请点击"保存配置"按钮保存')
  } catch {
    // 用户取消删除
  }
}

// 上移字段
const moveFieldUp = (index: number) => {
  if (index > 0) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index - 1]
    localConfig.customFields[index - 1] = temp
    // 更新sortOrder
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已上移，请点击"保存配置"按钮保存')
  }
}

// 下移字段
const moveFieldDown = (index: number) => {
  if (index < localConfig.customFields.length - 1) {
    const temp = localConfig.customFields[index]
    localConfig.customFields[index] = localConfig.customFields[index + 1]
    localConfig.customFields[index + 1] = temp
    // 更新sortOrder
    localConfig.customFields.forEach((f, i) => {
      f.sortOrder = i
    })
    ElMessage.success('字段已下移，请点击"保存配置"按钮保存')
  }
}

// 添加字段选项
const addFieldOption = () => {
  customFieldForm.options.push({ label: '', value: '' })
}

// 删除字段选项
const removeFieldOption = (index: number) => {
  customFieldForm.options.splice(index, 1)
}

// 保存配置
const saveConfig = async () => {
  try {
    saving.value = true

    // 验证配置
    if (!localConfig.orderSourceFieldName.trim()) {
      ElMessage.warning('请配置订单来源字段名称')
      return
    }
    if (localConfig.orderSourceOptions.length === 0) {
      ElMessage.warning('请至少添加一个订单来源选项')
      return
    }

    // 保存到store
    fieldConfigStore.updateOrderSourceConfig(
      localConfig.orderSourceFieldName,
      localConfig.orderSourceOptions
    )

    // 清空现有字段
    const existingFields = [...fieldConfigStore.customFields]
    for (const field of existingFields) {
      fieldConfigStore.deleteCustomField(field.id)
    }

    // 添加新字段
    for (const field of localConfig.customFields) {
      fieldConfigStore.addCustomField({
        fieldName: field.fieldName,
        fieldKey: field.fieldKey,
        fieldType: field.fieldType,
        required: field.required,
        placeholder: field.placeholder,
        showInList: field.showInList,
        options: field.options
      })
    }

    ElMessage.success('配置保存成功，已全局生效')
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 重置配置
const resetConfig = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置配置吗？将恢复到当前保存的配置。',
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    initLocalConfig()
    ElMessage.success('配置已重置')
  } catch {
    // 用户取消
  }
}

// 初始化
onMounted(() => {
  initLocalConfig()
  loadTransferConfig()
})
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

.options-editor {
  width: 100%;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px 0;
}
</style>
