<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑部门' : '新增部门'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="部门名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入部门名称" />
      </el-form-item>
      
      <el-form-item label="上级部门" prop="parentId">
        <el-select v-model="formData.parentId" placeholder="请选择上级部门" clearable>
          <el-option label="无上级部门" value="" />
          <el-option 
            v-for="dept in parentDepartments" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.id" 
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="部门负责人" prop="managerId">
        <el-select v-model="formData.managerId" placeholder="请选择部门负责人" clearable filterable>
          <el-option 
            v-for="user in availableManagers" 
            :key="user.id" 
            :label="user.name" 
            :value="user.id" 
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="权限级别" prop="permissionLevel">
        <el-select v-model="formData.permissionLevel" placeholder="请选择权限级别">
          <el-option label="高级权限" value="high" />
          <el-option label="中级权限" value="medium" />
          <el-option label="基础权限" value="basic" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="数据范围" prop="dataScope">
        <el-radio-group v-model="formData.dataScope">
          <el-radio value="all">全部数据</el-radio>
          <el-radio value="department">部门数据</el-radio>
          <el-radio value="personal">个人数据</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <el-form-item label="部门描述" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入部门描述"
        />
      </el-form-item>
      
      <el-form-item label="部门状态">
        <el-switch
          v-model="formData.isActive"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ isEdit ? '更新部门' : '创建部门' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface Department {
  id?: string
  name: string
  parentId: string
  managerId: string
  permissionLevel: string
  dataScope: string
  description: string
  isActive: boolean
}

interface User {
  id: string
  name: string
  email: string
}

interface Props {
  modelValue: boolean
  department?: Department | null
  parentDepartments?: Department[]
  availableManagers?: User[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: Department): void
}

const props = withDefaults(defineProps<Props>(), {
  parentDepartments: () => [],
  availableManagers: () => []
})
const emit = defineEmits<Emits>()

const formRef = ref()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.department?.id)

const formData = ref<Department>({
  name: '',
  parentId: '',
  managerId: '',
  permissionLevel: 'basic',
  dataScope: 'department',
  description: '',
  isActive: true
})

const rules = {
  name: [
    { required: true, message: '请输入部门名称', trigger: 'blur' },
    { min: 2, max: 50, message: '部门名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  permissionLevel: [
    { required: true, message: '请选择权限级别', trigger: 'change' }
  ],
  dataScope: [
    { required: true, message: '请选择数据范围', trigger: 'change' }
  ]
}

// 重置表单函数 - 需要在watch之前定义
const resetForm = () => {
  formData.value = {
    name: '',
    parentId: '',
    managerId: '',
    permissionLevel: 'basic',
    dataScope: 'department',
    description: '',
    isActive: true
  }
  formRef.value?.clearValidate()
}

watch(() => props.department, (newDept) => {
  if (newDept) {
    formData.value = { ...newDept }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleClose = () => {
  resetForm()
  emit('update:modelValue', false)
}

const handleConfirm = async () => {
  try {
    await formRef.value.validate()
    
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    emit('confirm', { ...formData.value })
    handleClose()
    
    ElMessage.success(isEdit.value ? '部门更新成功' : '部门创建成功')
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.dialog-footer {
  text-align: right;
}
</style>