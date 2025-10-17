<template>
  <el-dialog
    :model-value="modelValue"
    title="移动部门"
    width="500px"
    :before-close="handleClose"
    class="move-dialog"
  >
    <div class="move-content">
      <div class="current-info">
        <h4>当前部门信息</h4>
        <div class="info-item">
          <span class="label">部门名称：</span>
          <span class="value">{{ department?.name }}</span>
        </div>
        <div class="info-item">
          <span class="label">当前层级：</span>
          <span class="value">{{ department?.level }}级</span>
        </div>
        <div class="info-item">
          <span class="label">当前上级：</span>
          <span class="value">{{ currentParentName || '无（顶级部门）' }}</span>
        </div>
      </div>

      <el-divider />

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="目标上级" prop="newParentId">
          <el-tree-select
            v-model="formData.newParentId"
            :data="availableParents"
            :props="treeProps"
            placeholder="请选择新的上级部门（留空为顶级部门）"
            clearable
            check-strictly
            :render-after-expand="false"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="排序位置" prop="newSort">
          <el-input-number
            v-model="formData.newSort"
            :min="1"
            :max="999"
            placeholder="在同级部门中的排序位置"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <div class="preview-info" v-if="previewInfo">
        <h4>移动预览</h4>
        <div class="info-item">
          <span class="label">新上级部门：</span>
          <span class="value">{{ previewInfo.newParentName || '无（顶级部门）' }}</span>
        </div>
        <div class="info-item">
          <span class="label">新层级：</span>
          <span class="value">{{ previewInfo.newLevel }}级</span>
        </div>
        <div class="info-item">
          <span class="label">排序位置：</span>
          <span class="value">第{{ formData.newSort }}位</span>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="cancel-btn">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading" class="submit-btn">
          确认移动
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useDepartmentStore, type Department } from '@/stores/department'

interface Props {
  modelValue: boolean
  department?: Department | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  department: null
})

const emit = defineEmits<Emits>()

const departmentStore = useDepartmentStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

// 表单数据
const formData = reactive({
  newParentId: null as string | null,
  newSort: 1
})

// 表单验证规则
const formRules: FormRules = {
  newSort: [
    { required: true, message: '请输入排序位置', trigger: 'blur' }
  ]
}

// 树形选择器配置
const treeProps = {
  value: 'id',
  label: 'name',
  children: 'children'
}

// 当前上级部门名称
const currentParentName = computed(() => {
  if (!props.department?.parentId) return null
  const parent = departmentStore.getDepartmentById(props.department.parentId)
  return parent?.name
})

// 可选的上级部门（排除自己和子部门）
const availableParents = computed(() => {
  if (!props.department) return []
  
  const filterDepartments = (departments: Department[]): Department[] => {
    return departments
      .filter(dept => {
        // 排除当前部门
        if (dept.id === props.department!.id) return false
        
        // 排除当前部门的子部门
        return !isChildDepartment(dept.id, props.department!.id)
      })
      .map(dept => ({
        ...dept,
        children: dept.children ? filterDepartments(dept.children) : []
      }))
  }
  
  return filterDepartments(departmentStore.departmentTree)
})

// 检查是否为子部门
const isChildDepartment = (deptId: string, parentId: string): boolean => {
  const findInTree = (departments: Department[], targetId: string): Department | null => {
    for (const dept of departments) {
      if (dept.id === targetId) return dept
      if (dept.children) {
        const found = findInTree(dept.children, targetId)
        if (found) return found
      }
    }
    return null
  }
  
  const dept = findInTree(departmentStore.departmentTree, deptId)
  if (!dept) return false
  
  let current = dept
  while (current.parentId) {
    if (current.parentId === parentId) return true
    current = findInTree(departmentStore.departmentTree, current.parentId) || current
    if (!current.parentId) break
  }
  return false
}

// 移动预览信息
const previewInfo = computed(() => {
  if (!props.department) return null
  
  const newParent = formData.newParentId ? departmentStore.getDepartmentById(formData.newParentId) : null
  const newLevel = newParent ? newParent.level + 1 : 1
  
  return {
    newParentName: newParent?.name,
    newLevel
  }
})

// 重置表单
const resetForm = () => {
  Object.assign(formData, {
    newParentId: null,
    newSort: 1
  })
  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 初始化表单数据
const initFormData = () => {
  if (props.department) {
    Object.assign(formData, {
      newParentId: props.department.parentId,
      newSort: props.department.sort
    })
  } else {
    resetForm()
  }
}

// 监听弹窗显示状态
watch(() => props.modelValue, (visible) => {
  if (visible) {
    initFormData()
  }
})

// 监听部门数据变化
watch(() => props.department, () => {
  if (props.modelValue) {
    initFormData()
  }
})

// 关闭弹窗
const handleClose = () => {
  emit('update:modelValue', false)
  resetForm()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value || !props.department) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    // 检查是否有实际变化
    if (formData.newParentId === props.department.parentId && formData.newSort === props.department.sort) {
      ElMessage.warning('部门位置没有变化')
      return
    }
    
    loading.value = true
    
    await departmentStore.moveDepartment(
      props.department.id,
      formData.newParentId,
      formData.newSort
    )
    
    emit('success')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '移动失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.move-dialog {
  border-radius: 12px;
}

.move-content {
  padding: 0 8px;
}

.current-info,
.preview-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.current-info h4,
.preview-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.value {
  color: #303133;
  flex: 1;
}

.preview-info {
  background: #e8f4fd;
  border: 1px solid #b3d8ff;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 20px;
}

.submit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
}

:deep(.el-dialog__title) {
  color: white;
  font-weight: 600;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: white;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-tree-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-divider) {
  margin: 20px 0;
}
</style>