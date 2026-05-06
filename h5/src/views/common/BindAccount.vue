<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="bg-decor">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
    </div>

    <!-- 顶部Logo -->
    <div class="top-bar">
      <div class="logo-wrap">
        <svg width="32" height="32" viewBox="0 0 44 44" fill="none">
          <defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#6ee7b7"/><stop offset="100%" stop-color="#34d399"/></linearGradient></defs>
          <rect width="44" height="44" rx="10" fill="url(#lg)"/>
          <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
          <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
          <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
          <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
        </svg>
        <span class="logo-text">云客</span>
        <span class="logo-badge">CRM</span>
      </div>
    </div>

    <!-- 登录/注册卡片 -->
    <div class="card-wrap">
      <div class="login-card">
        <!-- Tab切换 -->
        <div class="auth-tabs">
          <div class="auth-tab" :class="{ active: activeTab === 'login' }" @click="switchTab('login')">账号登录</div>
          <div class="auth-tab" :class="{ active: activeTab === 'register' }" @click="switchTab('register')">免费注册</div>
          <div class="tab-indicator" :style="{ transform: activeTab === 'register' ? 'translateX(100%)' : 'translateX(0)' }"></div>
        </div>

        <!-- ====== 登录表单 ====== -->
        <van-form v-if="activeTab === 'login'" @submit="onLogin" class="login-form">
          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg>
              租户编码
            </label>
            <van-field
              v-model="loginForm.tenantCode"
              placeholder="请输入租户编码，如 T20260XXXXX"
              :rules="[{ required: true, message: '请输入租户编码' }]"
              clearable
            />
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              用户名
            </label>
            <van-field
              v-model="loginForm.username"
              placeholder="请输入CRM用户名"
              :rules="[{ required: true, message: '请输入用户名' }]"
              clearable
            />
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              密码
            </label>
            <van-field
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              :rules="[{ required: true, message: '请输入密码' }]"
              clearable
            />
          </div>

          <div v-if="errorMsg" class="error-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{{ errorMsg }}</span>
          </div>

          <van-button round block type="primary" native-type="submit" :loading="submitting" :loading-text="'登录中...'" class="login-btn">
            登 录
          </van-button>

          <div class="card-footer">
            <p>已有账号直接登录，没有账号？<span class="link-text" @click="switchTab('register')">立即注册</span></p>
          </div>
        </van-form>

        <!-- ====== 注册表单 ====== -->
        <van-form v-if="activeTab === 'register'" @submit="onRegister" class="login-form">
          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg>
              企业名称
            </label>
            <van-field
              v-model="regForm.companyName"
              placeholder="请输入企业/团队名称"
              :rules="[{ required: true, message: '请输入企业名称' }]"
              clearable
            />
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              联系人
            </label>
            <van-field
              v-model="regForm.contactName"
              placeholder="请输入联系人姓名"
              :rules="[{ required: true, message: '请输入联系人' }]"
              clearable
            />
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              手机号
            </label>
            <van-field
              v-model="regForm.phone"
              type="tel"
              placeholder="请输入手机号"
              :rules="[{ required: true, message: '请输入手机号' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]"
              clearable
              maxlength="11"
            />
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>
              验证码
            </label>
            <div class="code-row">
              <van-field
                v-model="regForm.code"
                type="digit"
                placeholder="请输入验证码"
                :rules="[{ required: true, message: '请输入验证码' }]"
                clearable
                maxlength="6"
                class="code-input"
              />
              <van-button
                size="small"
                type="primary"
                :disabled="codeCooldown > 0 || sendingCode"
                :loading="sendingCode"
                @click="onSendCode"
                class="code-btn"
              >
                {{ codeCooldown > 0 ? `${codeCooldown}s` : '获取验证码' }}
              </van-button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              设置密码
            </label>
            <van-field
              v-model="regForm.password"
              type="password"
              placeholder="请设置登录密码（至少6位）"
              :rules="[{ required: true, message: '请设置密码' }, { validator: (v: string) => v.length >= 6, message: '密码至少6位' }]"
              clearable
            />
          </div>

          <div v-if="errorMsg" class="error-tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{{ errorMsg }}</span>
          </div>

          <van-button round block type="primary" native-type="submit" :loading="submitting" :loading-text="'注册中...'" class="login-btn register-btn">
            免费注册
          </van-button>

          <div class="card-footer">
            <p>注册即可获得免费试用，已有账号？<span class="link-text" @click="switchTab('login')">立即登录</span></p>
          </div>
        </van-form>
      </div>
    </div>

    <!-- 底部版权 -->
    <div class="bottom-bar">
      <p>© {{ new Date().getFullYear() }} 云客 · 智能销售管理系统</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { bindAccount, getCurrentUser, sendRegisterCode, h5Register } from '@/api/auth'
import { isWecomEnv } from '@/utils/wecom-sdk'
import { showToast } from 'vant'

const router = useRouter()
const authStore = useAuthStore()
const submitting = ref(false)
const errorMsg = ref('')
const activeTab = ref<'login' | 'register'>('login')
const sendingCode = ref(false)
const codeCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const loginForm = reactive({
  tenantCode: '',
  username: '',
  password: ''
})

const regForm = reactive({
  companyName: '',
  contactName: '',
  phone: '',
  code: '',
  password: ''
})

function switchTab(tab: 'login' | 'register') {
  activeTab.value = tab
  errorMsg.value = ''
}

async function onSendCode() {
  if (!/^1[3-9]\d{9}$/.test(regForm.phone)) {
    showToast('请输入正确的手机号')
    return
  }
  sendingCode.value = true
  try {
    const { data } = await sendRegisterCode(regForm.phone)
    if (data?.success) {
      showToast('验证码已发送')
      codeCooldown.value = 60
      cooldownTimer = setInterval(() => {
        codeCooldown.value--
        if (codeCooldown.value <= 0 && cooldownTimer) {
          clearInterval(cooldownTimer)
          cooldownTimer = null
        }
      }, 1000)
    } else {
      showToast(data?.message || '发送失败')
    }
  } catch (e: any) {
    showToast(e.response?.data?.message || '发送失败，请重试')
  } finally {
    sendingCode.value = false
  }
}

async function onLogin() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const inWecom = isWecomEnv()
    const { data } = await bindAccount({
      wecomUserId: inWecom ? (authStore.wecomUserId || '') : '',
      corpId: inWecom ? (authStore.corpId || '') : '',
      tenantCode: loginForm.tenantCode,
      username: loginForm.username,
      password: loginForm.password
    })
    if (data?.success) {
      authStore.setToken(data.data.token)
      if (data.data.user) authStore.setUser(data.data.user)
      router.replace('/app/home')
    } else {
      errorMsg.value = data?.message || '登录失败'
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || '网络错误，请重试'
  } finally {
    submitting.value = false
  }
}

async function onRegister() {
  submitting.value = true
  errorMsg.value = ''
  try {
    const { data } = await h5Register({
      companyName: regForm.companyName,
      contactName: regForm.contactName,
      phone: regForm.phone,
      code: regForm.code,
      password: regForm.password
    })
    if (data?.success) {
      if (data.data.token) {
        authStore.setToken(data.data.token)
        if (data.data.user) authStore.setUser(data.data.user)
      }
      router.replace({
        path: '/register-success',
        query: {
          tenantCode: data.data.tenantCode,
          adminUsername: data.data.adminUsername || '',
          adminPassword: data.data.adminPassword || '',
          expireDate: data.data.expireDate || '',
          crmUrl: data.data.crmUrl || '',
          memberUrl: data.data.memberUrl || ''
        }
      })
    } else {
      errorMsg.value = data?.message || '注册失败'
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || '网络错误，请重试'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (authStore.token) {
    try {
      const { data } = await getCurrentUser()
      if (data?.success && data.data) {
        authStore.setUser(data.data)
        router.replace('/app/home')
        return
      }
    } catch {
      authStore.logout()
    }
  }
  authStore.setInitializing(false)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f0f9ff 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.bg-decor { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.circle {
  position: absolute;
  border-radius: 50%;
}
.c1 {
  width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  top: -60px; right: -40px;
  animation: pulse-bg 8s ease-in-out infinite;
}
.c2 {
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%);
  bottom: 15%; left: -30px;
  animation: pulse-bg 10s ease-in-out infinite 2s;
}
.c3 {
  width: 120px; height: 120px;
  background: radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%);
  top: 35%; right: 10%;
  animation: pulse-bg 12s ease-in-out infinite 4s;
}
@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; }
}

/* 顶部Logo */
.top-bar {
  padding: 24px;
  position: relative;
  z-index: 1;
}
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}
.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.5px;
}
.logo-badge {
  font-size: 10px;
  font-weight: 600;
  color: #6366f1;
  background: #eef2ff;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 1px;
}

/* 卡片容器 */
.card-wrap {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 0 20px;
  position: relative;
  z-index: 1;
}

.login-card {
  width: 100%;
  max-width: 380px;
  background: white;
  border-radius: 20px;
  padding: 28px 24px;
  box-shadow: 0 20px 60px rgba(99,102,241,0.08), 0 8px 24px rgba(0,0,0,0.04);
}

/* Tab切换 */
.auth-tabs {
  display: flex;
  position: relative;
  background: #f3f4f6;
  border-radius: 12px;
  padding: 3px;
  margin-bottom: 24px;
}
.auth-tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: color 0.3s;
}
.auth-tab.active {
  color: #6366f1;
  font-weight: 600;
}
.tab-indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(50% - 3px);
  height: calc(100% - 6px);
  background: white;
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.3s ease;
}

/* 表单 */
.field-group {
  margin-bottom: 14px;
}
.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
  padding-left: 2px;
}
.login-form :deep(.van-cell) {
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: #f9fafb;
  padding: 10px 14px;
  transition: all 0.2s;
}
.login-form :deep(.van-cell::after) {
  display: none;
}
.login-form :deep(.van-cell:focus-within) {
  border-color: #6366f1;
  background: white;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}
.login-form :deep(.van-field__control) {
  font-size: 14px;
  color: #1f2937;
}
.login-form :deep(.van-field__control::placeholder) {
  color: #9ca3af;
}
.login-form :deep(.van-field__error-message) {
  padding-top: 4px;
}

/* 验证码行 */
.code-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
.code-input {
  flex: 1;
}
.code-btn {
  flex-shrink: 0;
  height: 44px;
  min-width: 100px;
  border-radius: 12px !important;
  font-size: 13px !important;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
}

/* 错误提示 */
.error-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #ef4444;
  animation: shake 0.4s ease;
}
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

/* 登录/注册按钮 */
.login-btn {
  margin-top: 8px;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 3px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(99,102,241,0.3);
  transition: all 0.25s;
}
.register-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  box-shadow: 0 4px 16px rgba(16,185,129,0.3);
}
.login-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(99,102,241,0.2);
}

/* 卡片底部 */
.card-footer {
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid #f3f4f6;
  text-align: center;
}
.card-footer p {
  font-size: 12px;
  color: #9ca3af;
  margin: 0;
}
.link-text {
  color: #6366f1;
  font-weight: 500;
  cursor: pointer;
}

/* 底部版权 */
.bottom-bar {
  padding: 20px;
  text-align: center;
  position: relative;
  z-index: 1;
}
.bottom-bar p {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
}
</style>
