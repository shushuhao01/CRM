<template>
  <div class="page-container">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>管理员账号</span>
          <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增管理员</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleType(row.role)" size="small">{{ getRoleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="170">
          <template #default="{ row }">{{ formatDate(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="handleResetPwd(row)">重置密码</el-button>
            <el-button v-if="row.role !== 'super_admin' && row.id !== currentUserId" link
              :type="row.status === 'active' ? 'danger' : 'success'" @click="handleToggle(row)">
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showDialog" :title="editingId ? '编辑管理员' : '新增管理员'" width="500px" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="computedRules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="!!editingId" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="超级管理员" value="super_admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="showResetPwdDialog" title="重置密码" width="400px">
      <el-form ref="resetPwdFormRef" :model="resetPwdForm" :rules="resetPwdRules" label-width="100px">
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="resetPwdForm.newPassword" type="password" show-password placeholder="请输入新密码" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="resetPwdForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showResetPwdDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmResetPwd" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { adminApi } from '@/api/admin'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.user?.id)

const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const showResetPwdDialog = ref(false)
const editingId = ref<string | null>(null)
const resetPwdUserId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const resetPwdFormRef = ref<FormInstance>()

const form = reactive({ username: '', name: '', email: '', phone: '', password: '', role: 'admin' })
const resetPwdForm = reactive({ newPassword: '', confirmPassword: '' })

const baseRules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

const computedRules = computed<FormRules>(() => {
  if (editingId.value) return baseRules
  return {
    ...baseRules,
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }]
  }
})

const resetPwdRules: FormRules = {
  newPassword: [{ required: true, message: '请输入新密码', trigger: 'blur' }, { min: 6, message: '密码至少6位', trigger: 'blur' }],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: (_rule, value, callback) => {
      if (value !== resetPwdForm.newPassword) callback(new Error('两次输入的密码不一致'))
      else callback()
    }, trigger: 'blur' }
  ]
}

const tableData = ref<any[]>([])

const getRoleType = (role: string) => ({ super_admin: 'danger', admin: 'primary' }[role] || 'info')
const getRoleText = (role: string) => ({ super_admin: '超级管理员', admin: '管理员' }[role] || role)
const formatDate = (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'

const handleAdd = () => {
  editingId.value = null
  Object.assign(form, { username: '', name: '', email: '', phone: '', password: '', role: 'admin' })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, { username: row.username, name: row.name || '', email: row.email || '', phone: row.phone || '', password: '', role: row.role })
  showDialog.value = true
}

const handleResetPwd = (row: any) => {
  resetPwdUserId.value = row.id
  Object.assign(resetPwdForm, { newPassword: '', confirmPassword: '' })
  showResetPwdDialog.value = true
}

const confirmResetPwd = async () => {
  await resetPwdFormRef.value?.validate()
  submitting.value = true
  try {
    await adminApi.updateAdminUser(resetPwdUserId.value!, { password: resetPwdForm.newPassword })
    ElMessage.success('密码重置成功')
    showResetPwdDialog.value = false
  } catch (e: any) {
    ElMessage.error(e.message || '重置失败')
  } finally {
    submitting.value = false
  }
}

const handleToggle = async (row: any) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定${action} ${row.name || row.username}？`, '提示', { type: 'warning' })
    await adminApi.updateAdminUser(row.id, { status: newStatus })
    row.status = newStatus
    ElMessage.success(`${action}成功`)
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editingId.value) {
      await adminApi.updateAdminUser(editingId.value, {
        name: form.name, email: form.email, phone: form.phone, role: form.role
      })
      ElMessage.success('更新成功')
    } else {
      await adminApi.createAdminUser(form)
      ElMessage.success('创建成功')
    }
    showDialog.value = false
    fetchData()
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

const resetForm = () => {
  formRef.value?.resetFields()
  editingId.value = null
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getAdminUsers()
    if (res.success) {
      tableData.value = res.data || []
    }
  } catch (e) {
    // 使用模拟数据
    tableData.value = [
      { id: '1', username: 'admin', name: '超级管理员', email: 'admin@example.com', phone: '13800138000', role: 'super_admin', status: 'active', lastLoginAt: '2026-01-05 10:30:00' },
      { id: '2', username: 'manager', name: '张三', email: 'zhangsan@example.com', phone: '13900139000', role: 'admin', status: 'active', lastLoginAt: '2026-01-04 15:20:00' }
    ]
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.page-container { padding: 0; }
.table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>
