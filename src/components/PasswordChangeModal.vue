<template>
  <div v-if="visible" class="modal-overlay">
    <div class="modal-container">
      <div class="modal-header">
        <h3>{{ isForced ? '强制修改密码' : '修改密码' }}</h3>
        <button v-if="!isForced" @click="closeModal" class="close-btn">&times;</button>
      </div>
      
      <div class="modal-body">
        <div v-if="isForced" class="warning-message">
          <div class="warning-icon">⚠️</div>
          <div class="warning-text">
            <p v-if="isDefaultPassword">检测到您正在使用默认密码，为了账户安全，请立即修改密码。</p>
            <p v-else-if="isExpired">您的密码已过期，请立即修改密码。</p>
            <p v-else>管理员要求您修改密码，请设置新密码。</p>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="password-form">
          <div class="form-group">
            <label for="currentPassword">当前密码</label>
            <input
              id="currentPassword"
              v-model="form.currentPassword"
              type="password"
              :class="{ 'error': errors.currentPassword }"
              placeholder="请输入当前密码"
              required
            />
            <span v-if="errors.currentPassword" class="error-text">{{ errors.currentPassword }}</span>
          </div>

          <div class="form-group">
            <label for="newPassword">新密码</label>
            <input
              id="newPassword"
              v-model="form.newPassword"
              type="password"
              :class="{ 'error': errors.newPassword }"
              placeholder="请输入新密码"
              required
            />
            <span v-if="errors.newPassword" class="error-text">{{ errors.newPassword }}</span>
            <div class="password-requirements">
              <p>密码要求：</p>
              <ul>
                <li :class="{ 'valid': hasMinLength }">至少8位字符</li>
                <li :class="{ 'valid': hasUppercase }">包含大写字母</li>
                <li :class="{ 'valid': hasLowercase }">包含小写字母</li>
                <li :class="{ 'valid': hasNumbers }">包含数字</li>
                <li :class="{ 'valid': hasSpecialChars }">包含特殊字符</li>
              </ul>
            </div>
          </div>

          <div class="form-group">
            <label for="confirmPassword">确认新密码</label>
            <input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              :class="{ 'error': errors.confirmPassword }"
              placeholder="请再次输入新密码"
              required
            />
            <span v-if="errors.confirmPassword" class="error-text">{{ errors.confirmPassword }}</span>
          </div>

          <div class="form-actions">
            <button type="submit" :disabled="!isFormValid || loading" class="submit-btn">
              {{ loading ? '修改中...' : '确认修改' }}
            </button>
            <button v-if="!isForced" type="button" @click="closeModal" class="cancel-btn">
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { passwordService, type PasswordChangeRequest } from '@/services/passwordService'
import { useUserStore } from '@/stores/user'

interface Props {
  visible: boolean
  isForced?: boolean
  isDefaultPassword?: boolean
  isExpired?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  isForced: false,
  isDefaultPassword: false,
  isExpired: false
})

const emit = defineEmits<Emits>()
const userStore = useUserStore()

const form = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const errors = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const loading = ref(false)

// 密码强度验证
const hasMinLength = computed(() => form.value.newPassword.length >= 8)
const hasUppercase = computed(() => /[A-Z]/.test(form.value.newPassword))
const hasLowercase = computed(() => /[a-z]/.test(form.value.newPassword))
const hasNumbers = computed(() => /\d/.test(form.value.newPassword))
const hasSpecialChars = computed(() => /[!@#$%^&*(),.?":{}|<>]/.test(form.value.newPassword))

const isFormValid = computed(() => {
  return form.value.currentPassword &&
         form.value.newPassword &&
         form.value.confirmPassword &&
         hasMinLength.value &&
         hasUppercase.value &&
         hasLowercase.value &&
         hasNumbers.value &&
         hasSpecialChars.value &&
         form.value.newPassword === form.value.confirmPassword
})

// 监听新密码变化，实时验证
watch(() => form.value.newPassword, (newPassword) => {
  if (newPassword) {
    const validation = passwordService.validatePassword(newPassword)
    errors.value.newPassword = validation.isValid ? '' : validation.errors.join(', ')
  } else {
    errors.value.newPassword = ''
  }
})

// 监听确认密码变化
watch(() => form.value.confirmPassword, (confirmPassword) => {
  if (confirmPassword && form.value.newPassword) {
    errors.value.confirmPassword = confirmPassword === form.value.newPassword ? '' : '两次输入的密码不一致'
  } else {
    errors.value.confirmPassword = ''
  }
})

const handleSubmit = async () => {
  if (!isFormValid.value) return

  loading.value = true
  errors.value = { currentPassword: '', newPassword: '', confirmPassword: '' }

  try {
    const request: PasswordChangeRequest = {
      userId: userStore.user?.id || '',
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword,
      confirmPassword: form.value.confirmPassword
    }

    const result = await passwordService.changePassword(request)

    if (result.success) {
      // 更新用户信息
      if (userStore.user) {
        userStore.user.isDefaultPassword = false
        userStore.user.passwordLastChanged = new Date()
        userStore.user.forcePasswordChange = false
      }

      emit('success')
      closeModal()
    } else {
      // 根据错误类型设置相应的错误信息
      if (result.message.includes('当前密码')) {
        errors.value.currentPassword = result.message
      } else {
        errors.value.newPassword = result.message
      }
    }
  } catch (error) {
    errors.value.newPassword = '修改密码失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const closeModal = () => {
  if (!props.isForced) {
    form.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    errors.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    emit('close')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #666;
}

.modal-body {
  padding: 20px;
}

.warning-message {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
}

.warning-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.warning-text p {
  margin: 0;
  color: #856404;
  font-weight: 500;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-group input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
}

.form-group input.error {
  border-color: #dc3545;
}

.error-text {
  color: #dc3545;
  font-size: 12px;
}

.password-requirements {
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
}

.password-requirements p {
  margin: 0 0 8px 0;
  font-weight: 500;
  color: #666;
}

.password-requirements ul {
  margin: 0;
  padding-left: 16px;
  list-style: none;
}

.password-requirements li {
  margin-bottom: 4px;
  color: #999;
  position: relative;
}

.password-requirements li::before {
  content: '✗';
  position: absolute;
  left: -16px;
  color: #dc3545;
}

.password-requirements li.valid {
  color: #28a745;
}

.password-requirements li.valid::before {
  content: '✓';
  color: #28a745;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

.submit-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.submit-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.cancel-btn:hover {
  background-color: #545b62;
}
</style>