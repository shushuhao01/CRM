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
            :placeholder="`请输入新密码（至少${passwordPolicy.minLength}位）`"
            size="large"
            prefix-icon="Lock"
            show-password
          />
          <!-- 🔥 批次263修复：添加密码强度显示 -->
          <div class="password-strength" v-if="passwordForm.newPassword">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrengthClass"
                :style="{ width: passwordStrengthWidth }"
              ></div>
            </div>
            <span class="strength-text">密码强度：{{ passwordStrengthText }}</span>
          </div>
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
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import { passwordService } from '@/services/passwordService'

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

// 🔥 批次263修复：获取当前密码策略（从系统安全设置）
const passwordPolicy = computed(() => passwordService.getCurrentPolicy())

// 🔥 批次263修复：密码强度计算（使用动态策略）
const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
  if (!password) return 0

  const policy = passwordPolicy.value
  let score = 0

  // 长度检查
  if (password.length >= policy.minLength) score += 25
  if (password.length >= 12) score += 25

  // 字符类型检查（根据策略要求）
  if (policy.requireLowercase && /[a-z]/.test(password)) score += 12.5
  if (policy.requireUppercase && /[A-Z]/.test(password)) score += 12.5
  if (policy.requireNumbers && /[0-9]/.test(password)) score += 12.5
  if (policy.requireSpecialChars && /[^A-Za-z0-9]/.test(password)) score += 12.5

  return Math.min(100, score)
})

const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value
  if (strength < 30) return 'weak'
  if (strength < 60) return 'medium'
  if (strength < 80) return 'good'
  return 'strong'
})

const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength < 30) return '弱'
  if (strength < 60) return '中等'
  if (strength < 80) return '良好'
  return '强'
})

const passwordStrengthWidth = computed(() => `${passwordStrength.value}%`)

const validateConfirmPassword = (rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value === '') {
    callback(new Error('请再次输入新密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

// 🔥 批次263修复：表单验证规则使用动态策略
const rules = computed(() => ({
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    {
      min: passwordPolicy.value.minLength,
      message: `密码长度不能少于${passwordPolicy.value.minLength}位`,
      trigger: 'blur'
    },
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (value && value === passwordForm.currentPassword) {
          callback(new Error('新密码不能与当前密码相同'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, validator: validateConfirmPassword, trigger: 'blur' }
  ]
}))

const handleChangePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        // 🔥 批次263修复：使用passwordService统一处理
        const result = await passwordService.changePassword({
          userId: userStore.user?.id || 'current',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        })

        if (result.success) {
          ElMessage.success('密码修改成功')
          // 跳转到首页
          safeNavigator.push('/')
        } else {
          ElMessage.error(result.message || '密码修改失败')
        }
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

/* 🔥 批次263修复：添加密码强度样式 */
.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: all 0.3s ease;
  border-radius: 2px;
}

.strength-fill.weak {
  background-color: #f56565;
}

.strength-fill.medium {
  background-color: #ed8936;
}

.strength-fill.good {
  background-color: #38a169;
}

.strength-fill.strong {
  background-color: #38a169;
}

.strength-text {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}
</style>
