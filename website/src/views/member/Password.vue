<template>
  <div class="password-page">
    <!-- 顶部 Toast 通知 -->
    <transition name="toast-slide">
      <div v-if="toastVisible" class="toast-notification" :class="toastType">
        <span class="toast-icon">{{ toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️' }}</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <div class="page-card">
      <!-- 模式切换 -->
      <div class="mode-tabs">
        <button :class="{ active: mode === 'password' }" @click="switchMode('password')">🔧 原密码修改</button>
        <button :class="{ active: mode === 'sms' }" @click="switchMode('sms')">📱 短信验证码重置</button>
      </div>

      <!-- 模式一：原密码修改 -->
      <form v-if="mode === 'password'" @submit.prevent="handleSubmit" class="password-form">
        <div class="form-group">
          <label>原密码</label>
          <input type="password" v-model="form.oldPassword" placeholder="请输入原密码（首次设置可留空）" />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input type="password" v-model="form.newPassword" placeholder="请输入新密码（至少6位）" minlength="6" required />
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <input type="password" v-model="form.confirmPassword" placeholder="请再次输入新密码" required />
        </div>
        <div v-if="message" class="msg" :class="{ success: isSuccess, error: !isSuccess }">{{ message }}</div>
        <button type="submit" class="btn-submit" :disabled="saving">{{ saving ? '保存中...' : '修改密码' }}</button>
      </form>

      <!-- 模式二：短信验证码重置 -->
      <form v-else @submit.prevent="handleSmsReset" class="password-form">
        <p class="sms-tip">忘记密码？通过绑定手机号接收验证码，验证身份后设置新密码。</p>
        <div class="form-group">
          <label>手机号</label>
          <div class="input-with-btn">
            <input type="tel" v-model="smsForm.phone" placeholder="请输入绑定的手机号" maxlength="11" />
            <button type="button" class="btn-send-code" @click="handleSendCode" :disabled="codeCooldown > 0 || sendingCode">
              {{ sendingCode ? '发送中...' : codeCooldown > 0 ? `${codeCooldown}s 后重发` : '获取验证码' }}
            </button>
          </div>
        </div>
        <div class="form-group">
          <label>验证码</label>
          <input type="text" v-model="smsForm.code" placeholder="请输入6位验证码" maxlength="6" />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input type="password" v-model="smsForm.newPassword" placeholder="请输入新密码（至少6位）" minlength="6" required />
        </div>
        <div class="form-group">
          <label>确认新密码</label>
          <input type="password" v-model="smsForm.confirmPassword" placeholder="请再次输入新密码" required />
        </div>
        <div v-if="message" class="msg" :class="{ success: isSuccess, error: !isSuccess }">{{ message }}</div>
        <button type="submit" class="btn-submit" :disabled="smsResetting">{{ smsResetting ? '重置中...' : '重置密码' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { changeMemberPassword, memberSendCode, memberSetPassword, getMemberTenant } from '@/api/member'

const mode = ref<'password' | 'sms'>('password')
const saving = ref(false)
const message = ref('')
const isSuccess = ref(false)

// Toast 通知
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimer: any = null

const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
  toastMessage.value = msg
  toastType.value = type
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, duration)
}

// 模式一：原密码修改
const form = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const handleSubmit = async () => {
  message.value = ''
  if (form.newPassword.length < 6) { message.value = '新密码至少6位'; isSuccess.value = false; return }
  if (form.newPassword !== form.confirmPassword) { message.value = '两次密码不一致'; isSuccess.value = false; return }
  saving.value = true
  try {
    const result = await changeMemberPassword(form.oldPassword, form.newPassword)
    if (result.success) {
      showToast('密码修改成功', 'success')
      form.oldPassword = ''; form.newPassword = ''; form.confirmPassword = ''
      message.value = ''
    } else {
      message.value = result.message
      isSuccess.value = false
    }
  } finally { saving.value = false }
}

// 模式二：短信验证码重置
const smsForm = reactive({ phone: '', code: '', newPassword: '', confirmPassword: '' })
const sendingCode = ref(false)
const codeCooldown = ref(0)
const smsResetting = ref(false)
let cooldownTimer: any = null

// 自动填充当前绑定手机号
const tenant = getMemberTenant()
if (tenant?.phone) {
  smsForm.phone = tenant.phone
}

const handleSendCode = async () => {
  if (!smsForm.phone || !/^1[3-9]\d{9}$/.test(smsForm.phone)) {
    message.value = '请输入正确的手机号'
    isSuccess.value = false
    return
  }
  message.value = ''
  sendingCode.value = true
  try {
    const result = await memberSendCode(smsForm.phone)
    if (result.success) {
      showToast('验证码已发送', 'success')
      codeCooldown.value = 60
      cooldownTimer = setInterval(() => {
        codeCooldown.value--
        if (codeCooldown.value <= 0) {
          clearInterval(cooldownTimer)
          cooldownTimer = null
        }
      }, 1000)
    } else {
      message.value = result.message
      isSuccess.value = false
    }
  } finally { sendingCode.value = false }
}

const handleSmsReset = async () => {
  message.value = ''
  if (!smsForm.phone || !/^1[3-9]\d{9}$/.test(smsForm.phone)) {
    message.value = '请输入正确的手机号'; isSuccess.value = false; return
  }
  if (!smsForm.code || smsForm.code.length < 4) {
    message.value = '请输入验证码'; isSuccess.value = false; return
  }
  if (smsForm.newPassword.length < 6) {
    message.value = '新密码至少6位'; isSuccess.value = false; return
  }
  if (smsForm.newPassword !== smsForm.confirmPassword) {
    message.value = '两次密码不一致'; isSuccess.value = false; return
  }
  smsResetting.value = true
  try {
    const tenantId = tenant?.id
    const result = await memberSetPassword(smsForm.phone, smsForm.code, smsForm.newPassword, tenantId)
    if (result.success) {
      showToast('密码重置成功', 'success')
      smsForm.code = ''; smsForm.newPassword = ''; smsForm.confirmPassword = ''
      message.value = ''
    } else {
      message.value = result.message
      isSuccess.value = false
    }
  } finally { smsResetting.value = false }
}

const switchMode = (m: 'password' | 'sms') => {
  mode.value = m
  message.value = ''
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); max-width: 500px; }

.mode-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;

  button {
    flex: 1;
    padding: 10px 0;
    border: none;
    background: white;
    color: #64748b;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      background: #6366f1;
      color: white;
    }

    &:not(.active):hover {
      background: #f8fafc;
      color: #6366f1;
    }
  }
}

.sms-tip {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 18px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
  line-height: 1.5;
}

.password-form .form-group {
  margin-bottom: 18px;

  label {
    display: block;
    font-size: 13px;
    color: #475569;
    margin-bottom: 6px;
    font-weight: 500;
  }

  input {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #6366f1;
    }
  }
}

.input-with-btn {
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    min-width: 0;
  }

  .btn-send-code {
    white-space: nowrap;
    padding: 10px 16px;
    border: 1.5px solid #6366f1;
    border-radius: 8px;
    background: white;
    color: #6366f1;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #6366f1;
      color: white;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      border-color: #e2e8f0;
      color: #94a3b8;
    }
  }
}

.msg {
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;

  &.success { background: #f0fdf4; color: #16a34a; }
  &.error { background: #fef2f2; color: #dc2626; }
}

.btn-submit {
  width: 100%;
  padding: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #4f46e5; }
}

// 顶部 Toast 通知
.toast-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  white-space: nowrap;

  &.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  &.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  &.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

  .toast-icon { font-size: 16px; }
}

.toast-slide-enter-active { transition: all 0.3s ease-out; }
.toast-slide-leave-active { transition: all 0.3s ease-in; }
.toast-slide-enter-from { opacity: 0; transform: translateX(-50%) translateY(-30px); }
.toast-slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(-30px); }
</style>

