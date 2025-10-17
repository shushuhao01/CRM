<template>
  <div class="change-password-container">
    <div class="change-password-box">
      <div class="change-password-header">
        <h1>修改密码</h1>
        <p>为了您的账户安全，请修改默认密码</p>
      </div>
      
      <el-form :model="passwordForm" :rules="rules" ref="passwordFormRef" class="change-password-form">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="change-password-button"
            :loading="loading"
            @click="handleChangePassword"
          >
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()

const loading = ref(false)
const passwordFormRef = ref<FormInstance>()

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 获取用户数据库
        const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
        const currentUser = userStore.user
        
        if (!currentUser) {
          throw new Error('用户信息不存在')
        }
        
        // 查找当前用户
        const userIndex = userDatabase.findIndex((u: { id: string }) => u.id === currentUser.id)
        if (userIndex === -1) {
          throw new Error('用户不存在')
        }
        
        const user = userDatabase[userIndex]
        
        // 验证当前密码
        if (user.password !== passwordForm.currentPassword) {
          throw new Error('当前密码错误')
        }
        
        // 更新密码
        user.password = passwordForm.newPassword
        user.needChangePassword = false
        user.passwordLastChanged = new Date().toISOString()
        
        // 保存到本地存储
        localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
        
        // 更新用户store中的信息
        userStore.updateUser({ forcePasswordChange: false })
        
        ElMessage.success('密码修改成功')
        safeNavigator.push('/')
      } catch (error: unknown) {
        ElMessage.error((error as Error).message || '密码修改失败')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped>
.change-password-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.change-password-box {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
}

.change-password-header {
  text-align: center;
  margin-bottom: 30px;
}

.change-password-header h1 {
  color: #333;
  margin-bottom: 10px;
  font-size: 28px;
  font-weight: 600;
}

.change-password-header p {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.change-password-form {
  width: 100%;
}

.change-password-form .el-form-item {
  margin-bottom: 20px;
}

.change-password-form .el-form-item__label {
  color: #333;
  font-weight: 500;
}

.change-password-button {
  width: 100%;
  height: 45px;
  font-size: 16px;
  font-weight: 500;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}

.change-password-button:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}
</style>