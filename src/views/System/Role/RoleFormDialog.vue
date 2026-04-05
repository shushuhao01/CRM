<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑角色' : '新增角色'"
    width="600px"
    :before-close="handleClose"
  >
    <el-form
      ref="roleFormRef"
      :model="roleForm"
      :rules="roleFormRules"
      label-width="100px"
    >
      <el-form-item label="角色名称" prop="name">
        <el-input v-model="roleForm.name" placeholder="请输入角色名称" />
      </el-form-item>
      <el-form-item label="角色编码" prop="code">
        <el-input v-model="roleForm.code" placeholder="请输入角色编码" :disabled="isEdit" />
      </el-form-item>
      <el-form-item label="角色类型" prop="roleType">
        <el-select v-model="roleForm.roleType" placeholder="请选择角色类型">
          <el-option label="系统角色" value="system" />
          <el-option label="业务角色" value="business" />
          <el-option label="临时角色" value="temporary" />
          <el-option label="自定义角色" value="custom" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="roleForm.status">
          <el-radio label="active">启用</el-radio>
          <el-radio label="inactive">禁用</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="roleForm.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button @click="handleConfirm" type="primary" :loading="loading">确定</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { roleApiService } from '@/services/roleApiService'

interface RoleFormData {
  id: string
  name: string
  code: string
  status: 'active' | 'inactive'
  roleType: 'system' | 'business' | 'temporary' | 'custom'
  description: string
}

const props = defineProps<{
  modelValue: boolean
  isEdit: boolean
  editData?: RoleFormData | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}>()

const visible = ref(false)
const loading = ref(false)
const roleFormRef = ref()

const roleForm = reactive<RoleFormData>({
  id: '',
  name: '',
  code: '',
  status: 'active',
  roleType: 'custom',
  description: ''
})

const roleFormRules = {
  name: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  code: [
    { required: true, message: '请输入角色编码', trigger: 'blur' },
    { pattern: /^[A-Z_]+$/, message: '角色编码只能包含大写字母和下划线', trigger: 'blur' }
  ]
}

watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.editData) {
    Object.assign(roleForm, props.editData)
  } else if (val && !props.isEdit) {
    resetForm()
  }
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

const resetForm = () => {
  Object.assign(roleForm, { id: '', name: '', code: '', status: 'active', roleType: 'custom', description: '' })
}

const handleClose = () => {
  visible.value = false
  roleFormRef.value?.clearValidate()
  resetForm()
}

const handleConfirm = async () => {
  try {
    await roleFormRef.value?.validate()
    loading.value = true

    if (props.isEdit) {
      await roleApiService.updateRole({
        id: roleForm.id,
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        status: roleForm.status,
        roleType: roleForm.roleType
      })
      ElMessage.success('角色更新成功')
    } else {
      await roleApiService.createRole({
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        roleType: roleForm.roleType
      })
      ElMessage.success('角色创建成功')
    }

    handleClose()
    emit('success')
  } catch (error) {
    console.error('角色操作失败:', error)
    ElMessage.error(props.isEdit ? '角色更新失败' : '角色创建失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>



