<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h1>智能销售管理系统</h1>
        <p>欢迎登录</p>
      </div>
      
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" class="login-form">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()

const loading = ref(false)
const loginFormRef = ref<FormInstance>()

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

// 防抖计时器
let loginDebounceTimer: NodeJS.Timeout | null = null

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  // 防抖处理：如果用户快速点击，清除之前的计时器
  if (loginDebounceTimer) {
    clearTimeout(loginDebounceTimer)
  }
  
  // 如果正在登录中，直接返回
  if (loading.value) {
    ElMessage.warning('正在登录中，请稍候...')
    return
  }
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const result = await userStore.loginWithRetry(
          loginForm.username,
          loginForm.password,
          false, // rememberMe
          3 // 最多重试3次
        )
        
        if (result) {
          ElMessage.success('登录成功')
          
          // 等待状态同步完成
          await nextTick()
          
          // 检查是否需要强制修改密码
          if (userStore.currentUser?.forcePasswordChange) {
            safeNavigator.push('/change-password')
          } else {
            safeNavigator.push('/')
          }
        } else {
          ElMessage.error('登录失败')
        }
      } catch (error: unknown) {
        console.error('登录错误:', error)
        const errorMessage = error instanceof Error ? error.message : '登录失败，请检查用户名和密码'
        ElMessage.error(errorMessage)
        
        // 如果是频率限制错误，禁用登录按钮
        if (error instanceof Error && (error.message.includes('频繁') || error.message.includes('429') || error.message === 'RATE_LIMITED')) {
          setTimeout(() => {
            loading.value = false
          }, 30000)
          ElMessage.warning('登录尝试过于频繁，按钮已禁用30秒')
          return
        }
      } finally {
        // 正常情况下，延迟1秒后恢复按钮状态，防止快速重复点击
        loginDebounceTimer = setTimeout(() => {
          loading.value = false
        }, 1000)
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-box {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-header h1 {
  color: #303133;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.login-header p {
  color: #909399;
  margin: 0;
  font-size: 14px;
}



.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
}

@media (max-width: 480px) {
  .login-box {
    padding: 24px;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
}
</style>