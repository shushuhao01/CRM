<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑用户权限' : '新增用户'"
    width="800px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户姓名" prop="name">
            <el-input v-model="formData.name" placeholder="请输入用户姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮箱地址" prop="email">
            <el-input v-model="formData.email" placeholder="请输入邮箱地址" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20" v-if="!isEdit">
        <el-col :span="12">
          <el-form-item label="默认密码" prop="password">
            <el-input 
              v-model="formData.password" 
              type="password" 
              placeholder="请输入默认密码"
              show-password
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="确认密码" prop="confirmPassword">
            <el-input 
              v-model="formData.confirmPassword" 
              type="password" 
              placeholder="请再次输入密码"
              show-password
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="所属部门" prop="departmentId">
            <el-select v-model="formData.departmentId" placeholder="请选择部门">
              <el-option label="管理部" value="admin" />
              <el-option label="销售一部" value="sales_1" />
              <el-option label="销售二部" value="sales_2" />
              <el-option label="客服部" value="service" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="用户角色" prop="role">
            <el-select v-model="formData.role" placeholder="请选择角色">
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="部门负责人" value="department_manager" />
              <el-option label="销售员" value="sales_staff" />
              <el-option label="客服" value="customer_service" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="数据权限" prop="dataScope">
            <el-select v-model="formData.dataScope" placeholder="请选择数据权限">
              <el-option label="全部数据" value="all" />
              <el-option label="部门数据" value="department" />
              <el-option label="个人数据" value="personal" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="权限级别" prop="permissionLevel">
            <el-select v-model="formData.permissionLevel" placeholder="请选择权限级别">
              <el-option label="完全权限" value="full_access" />
              <el-option label="部分权限" value="partial_access" />
              <el-option label="只读权限" value="read_only" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="用户状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="功能权限">
        <el-checkbox-group v-model="formData.permissions">
          <el-row :gutter="20">
            <el-col :span="8" v-for="permission in availablePermissions" :key="permission.value">
              <el-checkbox :label="permission.value">{{ permission.label }}</el-checkbox>
            </el-col>
          </el-row>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="备注">
        <el-input
          v-model="formData.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入备注信息"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'

interface User {
  id?: string
  name: string
  email: string
  password?: string
  confirmPassword?: string
  departmentId: string
  role: string
  dataScope: string
  permissionLevel: string
  status: 'active' | 'inactive'
  permissions: string[]
  remark?: string
}

interface Props {
  modelValue: boolean
  user?: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: User): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isEdit = computed(() => !!props.user?.id)

const formData = ref<User>({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  departmentId: '',
  role: '',
  dataScope: '',
  permissionLevel: '',
  status: 'active',
  permissions: [],
  remark: ''
})

const availablePermissions = [
  { label: '客户查看', value: 'customer_view' },
  { label: '客户编辑', value: 'customer_edit' },
  { label: '客户删除', value: 'customer_delete' },
  { label: '订单查看', value: 'order_view' },
  { label: '订单编辑', value: 'order_edit' },
  { label: '订单删除', value: 'order_delete' },
  { label: '报表查看', value: 'report_view' },
  { label: '报表导出', value: 'report_export' },
  { label: '系统设置', value: 'system_setting' },
  { label: '用户管理', value: 'user_management' },
  { label: '权限管理', value: 'permission_management' },
  { label: '数据导入', value: 'data_import' }
]

const rules = {
  name: [
    { required: true, message: '请输入用户姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入默认密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, message: '密码必须包含大小写字母和数字', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== formData.value.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  departmentId: [
    { required: true, message: '请选择所属部门', trigger: 'change' }
  ],
  role: [
    { required: true, message: '请选择用户角色', trigger: 'change' }
  ],
  dataScope: [
    { required: true, message: '请选择数据权限', trigger: 'change' }
  ],
  permissionLevel: [
    { required: true, message: '请选择权限级别', trigger: 'change' }
  ]
}

// 重置表单函数 - 需要在watch之前定义
const resetForm = () => {
  formData.value = {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    departmentId: '',
    role: '',
    dataScope: '',
    permissionLevel: '',
    status: 'active',
    permissions: [],
    remark: ''
  }
  formRef.value?.clearValidate()
}

// 监听用户数据变化
watch(() => props.user, (newUser) => {
  if (newUser) {
    // 编辑用户时，不包含密码字段
    formData.value = { 
      ...newUser,
      password: '',
      confirmPassword: ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

const handleClose = () => {
  visible.value = false
  resetForm()
}

const handleConfirm = async () => {
  try {
    await formRef.value.validate()
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 准备提交数据
    const submitData = { ...formData.value }
    
    // 如果是新增用户，保留密码字段；如果是编辑用户，移除密码相关字段
    if (isEdit.value) {
      delete submitData.password
      delete submitData.confirmPassword
    } else {
      // 新增用户时移除确认密码字段
      delete submitData.confirmPassword
    }
    
    emit('confirm', submitData)
    handleClose()
    
    ElMessage.success(isEdit.value ? '用户权限更新成功' : '用户创建成功')
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