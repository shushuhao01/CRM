<template>
  <div class="login-page">
    <!-- 顶部导航区 -->
    <div class="login-top-bar">
      <router-link to="/" class="back-home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        返回官网
      </router-link>
    </div>

    <div class="login-wrapper">
      <!-- 左侧品牌区 -->
      <div class="login-brand">
        <div class="brand-content">
          <div class="brand-logo">
            <svg width="48" height="48" viewBox="0 0 44 44" fill="none">
              <defs>
                <linearGradient id="loginLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#8b5cf6"/>
                </linearGradient>
              </defs>
              <rect width="44" height="44" rx="10" fill="url(#loginLogoGrad)"/>
              <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
              <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
              <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
              <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
            </svg>
          </div>
          <h1 class="brand-title">云客CRM</h1>
          <p class="brand-subtitle">会员中心</p>
          <p class="brand-desc">管理您的订阅、账单和企业信息</p>
          <div class="brand-features">
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>订阅管理</span>
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>账单查询</span>
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>授权信息</span>
            </div>
            <div class="feature-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>续费升级</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单区 -->
      <div class="login-form-wrapper">
        <div class="login-card">
          <h2 class="card-title">登录会员中心</h2>

          <!-- 登录方式切换 -->
          <div class="login-tabs">
            <button :class="{ active: loginType === 'password' }" @click="loginType = 'password'">密码登录</button>
            <button :class="{ active: loginType === 'sms_code' }" @click="loginType = 'sms_code'">验证码登录</button>
          </div>

          <!-- 提示信息 -->
          <div v-if="successMsg" class="msg-box success">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {{ successMsg }}
          </div>

          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label>手机号</label>
              <input type="tel" v-model="form.phone" placeholder="请输入注册手机号" maxlength="11" required />
            </div>

            <!-- 密码登录 -->
            <div v-if="loginType === 'password'" class="form-group">
              <label>密码</label>
              <div class="input-with-action">
                <input :type="showPwd ? 'text' : 'password'" v-model="form.password" placeholder="请输入密码" required />
                <button type="button" class="input-action-btn" @click="showPwd = !showPwd">
                  <svg v-if="showPwd" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- 验证码登录 -->
            <div v-if="loginType === 'sms_code'" class="form-group">
              <label>验证码</label>
              <div class="input-with-action">
                <input type="text" v-model="form.code" placeholder="请输入验证码" maxlength="6" required />
                <button type="button" class="code-btn" :disabled="countdown > 0" @click="handleSendCode">
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </button>
              </div>
            </div>

            <button type="submit" class="btn-submit" :disabled="loading">
              {{ loading ? '登录中...' : '登录' }}
            </button>
          </form>

          <div class="login-footer">
            <a href="javascript:void(0)" class="link" @click="handleForgotPassword">忘记密码？</a>
            <span class="sep">|</span>
            <router-link to="/register?plan=FREE_TRIAL" class="link">免费注册</router-link>
          </div>

          <div class="login-divider"><span>或</span></div>

          <a href="https://app.yunke-crm.com" target="_blank" class="crm-entry-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            登录CRM工作台
          </a>

          <div v-if="errorMsg" class="msg-box error">{{ errorMsg }}</div>

          <!-- 设置密码弹窗（验证码登录后提示设置密码） -->
          <div v-if="showSetPwd" class="modal-overlay" @click.self="showSetPwd = false">
            <div class="modal-card">
              <h3>设置会员密码</h3>
              <p class="modal-desc">设置密码后可使用密码快速登录</p>
              <form @submit.prevent="handleSetPassword">
                <div class="form-group">
                  <input type="password" v-model="newPassword" placeholder="请设置密码（至少6位）" minlength="6" required />
                </div>
                <div class="form-group">
                  <input type="password" v-model="confirmPassword" placeholder="确认密码" required />
                </div>
                <div class="modal-actions">
                  <button type="button" class="btn-skip" @click="skipSetPassword">跳过</button>
                  <button type="submit" class="btn-confirm" :disabled="settingPwd">
                    {{ settingPwd ? '设置中...' : '设置密码' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 🔒 多租户选择弹窗（同手机号关联多企业时显示） -->
          <div v-if="showTenantSelect" class="modal-overlay" @click.self="showTenantSelect = false">
            <div class="modal-card tenant-select-modal">
              <h3>选择登录企业</h3>
              <p class="modal-desc">该手机号关联了多个企业账号，请选择要登录的企业</p>
              <div class="tenant-list">
                <div
                  v-for="t in tenantOptions"
                  :key="t.id"
                  class="tenant-option"
                  @click="handleSelectTenant(t)"
                >
                  <div class="tenant-avatar">{{ (t.name || '企').charAt(0) }}</div>
                  <div class="tenant-info-text">
                    <span class="tenant-name-text">{{ t.name }}</span>
                    <span class="tenant-code-text">{{ t.code }}{{ t.contact ? ' · ' + t.contact : '' }}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              </div>
              <button type="button" class="btn-back" @click="showTenantSelect = false">返回</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { memberLogin, memberSendCode, memberSetPassword, isMemberLoggedIn, selectTenantLogin } from '@/api/member'

const router = useRouter()

// 如果已登录，直接跳转
if (isMemberLoggedIn()) {
  router.replace('/member/dashboard')
}

const loginType = ref<'password' | 'sms_code'>('password')
const loading = ref(false)
const showPwd = ref(false)
const countdown = ref(0)
const errorMsg = ref('')
const successMsg = ref('')
const showSetPwd = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const settingPwd = ref(false)

// 🔒 多租户选择
const showTenantSelect = ref(false)
const tenantOptions = ref<any[]>([])
const pendingSelectToken = ref('')

const form = reactive({
  phone: '',
  password: '',
  code: ''
})

const handleSendCode = async () => {
  if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
    errorMsg.value = '请输入正确的手机号'
    return
  }
  errorMsg.value = ''
  const result = await memberSendCode(form.phone)
  if (result.success) {
    successMsg.value = result.message
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } else {
    errorMsg.value = result.message
  }
}

const handleLogin = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  loading.value = true

  try {
    const result = await memberLogin({
      phone: form.phone,
      loginType: loginType.value,
      password: loginType.value === 'password' ? form.password : undefined,
      code: loginType.value === 'sms_code' ? form.code : undefined
    })

    if (result.success) {
      // 验证码登录成功后，检查是否需要设置密码
      if (loginType.value === 'sms_code') {
        // 简单提示设置密码
        showSetPwd.value = true
      } else {
        router.push('/member/dashboard')
      }
    } else if (result.data?.needSelectTenant) {
      // 🔒 同手机号多租户：弹出选择列表
      tenantOptions.value = result.data.tenants || []
      pendingSelectToken.value = result.data.selectToken || ''
      showTenantSelect.value = true
    } else {
      errorMsg.value = result.message
    }
  } finally {
    loading.value = false
  }
}

/**
 * 🔒 选择租户后重新登录
 */
const handleSelectTenant = async (tenant: any) => {
  showTenantSelect.value = false
  loading.value = true
  errorMsg.value = ''

  try {
    let result: any

    if (pendingSelectToken.value) {
      // 验证码登录模式：使用selectToken安全登录（验证码已消费）
      result = await selectTenantLogin({
        phone: form.phone,
        selectToken: pendingSelectToken.value,
        tenantId: tenant.id
      })
      if (result.success) {
        showSetPwd.value = true
        return
      }
    } else {
      // 密码登录模式：带tenantId精确匹配
      result = await memberLogin({
        phone: form.phone,
        loginType: 'password',
        password: form.password,
        tenantId: tenant.id
      })
      if (result.success) {
        router.push('/member/dashboard')
        return
      }
    }
    errorMsg.value = result?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

const handleSetPassword = async () => {
  if (newPassword.value.length < 6) {
    errorMsg.value = '密码至少6位'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '两次密码不一致'
    return
  }
  settingPwd.value = true
  errorMsg.value = ''
  try {
    const result = await memberSetPassword(form.phone, form.code, newPassword.value)
    if (result.success) {
      showSetPwd.value = false
      router.push('/member/dashboard')
    } else {
      errorMsg.value = result.message
    }
  } finally {
    settingPwd.value = false
  }
}

const skipSetPassword = () => {
  showSetPwd.value = false
  router.push('/member/dashboard')
}

// 忘记密码：切换到验证码登录并提示
const handleForgotPassword = () => {
  loginType.value = 'sms_code'
  errorMsg.value = ''
  successMsg.value = '忘记密码？请先用验证码登录，登录后可在「修改密码」页面设置新密码'
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
}

.login-top-bar {
  padding: 16px 32px;
  background: white;
  border-bottom: 1px solid #f1f5f9;
}

.back-home {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #64748b;
  text-decoration: none;
  transition: color 0.2s;

  &:hover {
    color: #6366f1;
  }
}

.login-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  gap: 60px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

// 左侧品牌区
.login-brand {
  flex: 1;
  max-width: 360px;
}

.brand-content {
  .brand-logo {
    margin-bottom: 20px;
  }

  .brand-title {
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 4px;
  }

  .brand-subtitle {
    font-size: 20px;
    font-weight: 600;
    color: #6366f1;
    margin: 0 0 8px;
  }

  .brand-desc {
    font-size: 14px;
    color: #94a3b8;
    margin: 0 0 28px;
  }
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: #475569;
}

// 右侧表单区
.login-form-wrapper {
  flex: 1;
  max-width: 420px;
}

.login-card {
  background: white;
  border-radius: 16px;
  padding: 36px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 24px;
}

.login-tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 24px;

  button {
    flex: 1;
    padding: 10px;
    border: none;
    background: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #64748b;
    transition: all 0.2s;

    &.active {
      background: white;
      color: #6366f1;
      font-weight: 600;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }
  }
}

.login-form {
  .form-group {
    margin-bottom: 18px;

    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      margin-bottom: 6px;
    }

    input {
      width: 100%;
      padding: 11px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
      box-sizing: border-box;
      background: white;

      &:focus {
        outline: none;
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
      }

      &::placeholder {
        color: #cbd5e1;
      }
    }
  }
}

.input-with-action {
  display: flex;
  gap: 8px;

  input { flex: 1; }
}

.input-action-btn {
  width: 42px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    background: #f8f7ff;
  }
}

.code-btn {
  min-width: 110px;
  padding: 0 14px;
  border: 1px solid #6366f1;
  border-radius: 8px;
  background: white;
  color: #6366f1;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: #f8f7ff;
  }

  &:disabled {
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: not-allowed;
  }
}

.btn-submit {
  width: 100%;
  padding: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 4px;

  &:hover { background: #4f46e5; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.login-footer {
  text-align: center;
  margin-top: 18px;
  font-size: 13px;

  .link {
    color: #6366f1;
    text-decoration: none;
    cursor: pointer;
    &:hover { text-decoration: underline; }
  }

  .sep {
    margin: 0 10px;
    color: #e2e8f0;
  }
}

.login-divider {
  text-align: center;
  position: relative;
  margin: 22px 0 18px;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: #f1f5f9;
  }

  span {
    position: relative;
    background: white;
    padding: 0 12px;
    color: #94a3b8;
    font-size: 12px;
  }
}

.crm-entry-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #475569;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
    background: #f8f7ff;
  }
}

.msg-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;

  &.success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  &.error {
    margin-top: 14px;
    margin-bottom: 0;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
}

// 设置密码弹窗
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  width: 380px;
  max-width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);

  h3 {
    margin: 0 0 6px;
    font-size: 18px;
    color: #1e293b;
  }

  .modal-desc {
    margin: 0 0 20px;
    color: #64748b;
    font-size: 13px;
  }

  .form-group {
    margin-bottom: 14px;
  }

  input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    box-sizing: border-box;
    &:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
    }
  }
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;

  .btn-skip {
    flex: 1;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    color: #64748b;
    font-size: 14px;
    transition: all 0.2s;
    &:hover { border-color: #cbd5e1; }
  }

  .btn-confirm {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: #6366f1;
    color: white;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
    transition: all 0.2s;
    &:hover { background: #4f46e5; }
    &:disabled { opacity: 0.6; }
  }
}

// 🔒 多租户选择弹窗
.tenant-select-modal {
  width: 420px;
}

.tenant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
  max-height: 300px;
  overflow-y: auto;
}

.tenant-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    background: #f8f7ff;
  }
}

.tenant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.tenant-info-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;

  .tenant-name-text {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
  }

  .tenant-code-text {
    font-size: 12px;
    color: #94a3b8;
  }
}

.btn-back {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  &:hover { border-color: #cbd5e1; background: #f8fafc; }
}

// 响应式
@media (max-width: 768px) {
  .login-wrapper {
    flex-direction: column;
    gap: 32px;
    padding: 24px 16px;
  }

  .login-brand {
    max-width: 100%;
    text-align: center;
  }

  .brand-features {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    gap: 16px;
  }

  .login-form-wrapper {
    max-width: 100%;
    width: 100%;
  }

  .login-card {
    padding: 24px;
  }
}
</style>

