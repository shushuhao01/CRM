<template>
  <div class="login-container">
    <div class="login-bg">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <div class="login-content">
      <div class="login-box">
        <div class="login-header">
          <div class="logo">
            <el-icon :size="40" color="#409eff"><Platform /></el-icon>
          </div>
          <h1>CRM 平台管理后台</h1>
          <p>私有部署授权 & SaaS租户管理</p>
        </div>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          class="login-form"
          @keyup.enter="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              show-password
              :prefix-icon="Lock"
            />
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <p>© 2024 CRM System. All rights reserved.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Platform, User, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    try {
      await userStore.login(form.username, form.password)
      ElMessage.success('登录成功')
      router.push('/')
    } catch (error: any) {
      ElMessage.error(error.message || '登录失败')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style scoped lang="scss">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;

  .bg-shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
  }

  .shape-1 {
    width: 600px;
    height: 600px;
    background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
    top: -200px;
    right: -100px;
    animation: float 8s ease-in-out infinite;
  }

  .shape-2 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #e6a23c 0%, #f56c6c 100%);
    bottom: -100px;
    left: -100px;
    animation: float 10s ease-in-out infinite reverse;
  }

  .shape-3 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #909399 0%, #409eff 100%);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 6s ease-in-out infinite;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(5deg); }
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
}

.login-content {
  position: relative;
  z-index: 1;
}

.login-box {
  width: 420px;
  padding: 48px 40px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;

  .logo {
    width: 72px;
    height: 72px;
    background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    box-shadow: 0 8px 24px rgba(64, 158, 255, 0.3);

    :deep(.el-icon) {
      color: #fff !important;
    }
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    color: #1a1a2e;
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: #909399;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 24px;
  }

  :deep(.el-input__wrapper) {
    border-radius: 10px;
    box-shadow: 0 0 0 1px #dcdfe6 inset;

    &:hover {
      box-shadow: 0 0 0 1px #c0c4cc inset;
    }

    &.is-focus {
      box-shadow: 0 0 0 1px #409eff inset;
    }
  }

  :deep(.el-input__inner) {
    height: 48px;
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  border: none;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(64, 158, 255, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.login-footer {
  text-align: center;
  margin-top: 32px;

  p {
    font-size: 12px;
    color: #c0c4cc;
  }
}
</style>
