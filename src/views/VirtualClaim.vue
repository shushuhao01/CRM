<template>
  <div class="virtual-claim-page">
    <!-- 左上角Logo -->
    <div class="claim-top-bar">
      <div class="top-bar-logo">
        <svg width="28" height="28" viewBox="0 0 44 44" fill="none" class="logo-icon-svg">
          <defs>
            <linearGradient id="claimLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#6ee7b7"/>
              <stop offset="100%" stop-color="#34d399"/>
            </linearGradient>
          </defs>
          <rect width="44" height="44" rx="10" fill="url(#claimLogoGrad)"/>
          <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
          <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
          <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
          <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
        </svg>
        <span class="top-bar-name">{{ systemName }}</span>
      </div>
    </div>

    <!-- 页面头部 -->
    <div class="claim-header">
      <div class="claim-logo">
        <img v-if="systemLogo || systemAvatar" :src="systemLogo || systemAvatar" alt="logo" class="logo-img" />
        <div v-else class="logo-placeholder">📦</div>
      </div>
      <div class="claim-title">{{ systemName }}</div>
      <div class="claim-subtitle">虚拟商品领取中心</div>
    </div>

    <!-- 公告区域 -->
    <div v-if="claimPageNotice" class="claim-notice">
      <el-alert :title="claimPageNotice" type="info" :closable="false" show-icon />
    </div>

    <!-- 登录表单 -->
    <div v-if="!isLoggedIn" class="login-card">
      <div class="login-card-title">
        <el-icon><Lock /></el-icon>
        验证身份后领取
      </div>

      <div v-if="loginError && !tokenValid" class="login-error" style="margin-bottom: 16px;">
        <el-icon><Warning /></el-icon>
        {{ loginError }}
      </div>

      <el-form v-if="tokenValid" :model="loginForm" label-position="top" size="large" @keyup.enter="handleLogin">
        <el-form-item label="下单手机号">
          <el-input
            v-model="loginForm.phone"
            placeholder="请输入下单时使用的手机号"
            maxlength="11"
            clearable
          >
            <template #prefix><el-icon><Phone /></el-icon></template>
          </el-input>
        </el-form-item>

        <!-- 登录方式切换 -->
        <div class="login-method-switch">
          <span
            :class="['method-tab', { active: activeLoginMethod === 'password' }]"
            @click="activeLoginMethod = 'password'"
          >密码验证</span>
          <span
            :class="['method-tab', { active: activeLoginMethod === 'sms' }]"
            @click="activeLoginMethod = 'sms'"
          >短信验证码</span>
        </div>

        <!-- 短信验证码登录 -->
        <template v-if="activeLoginMethod === 'sms'">
          <el-form-item label="验证码">
            <div style="display: flex; gap: 8px; width: 100%;">
              <el-input
                v-model="loginForm.smsCode"
                placeholder="请输入6位验证码"
                maxlength="6"
                style="flex: 1;"
              />
              <el-button
                :disabled="smsCountdown > 0"
                @click="sendSmsCode"
                type="primary"
                plain
                style="white-space: nowrap; min-width: 100px;"
              >
                {{ smsCountdown > 0 ? `${smsCountdown}s后重试` : '发送验证码' }}
              </el-button>
            </div>
          </el-form-item>
        </template>

        <!-- 密码登录 -->
        <template v-else>
          <el-form-item label="领取密码">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入领取密码"
              show-password
            >
              <template #prefix><el-icon><Key /></el-icon></template>
            </el-input>
          </el-form-item>
        </template>

        <el-button
          type="primary"
          size="large"
          style="width: 100%; margin-top: 8px;"
          :loading="loginLoading"
          @click="handleLogin"
        >
          验证并领取
        </el-button>

        <div v-if="loginError && tokenValid" class="login-error">
          <el-icon><Warning /></el-icon>
          {{ loginError }}
        </div>
      </el-form>
    </div>

    <!-- 领取内容 -->
    <div v-else class="claim-content">
      <div class="claim-success-header">
        <el-icon class="success-icon"><CircleCheck /></el-icon>
        <span>身份验证成功，以下是您的商品</span>
      </div>

      <!-- 领取页提示语 -->
      <div v-if="claimPageNotice" class="claim-content-notice">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ claimPageNotice }}</span>
      </div>

      <!-- 客户信息（脱敏） -->
      <div v-if="maskedPhone" class="customer-info">
        <span>领取账户：{{ maskedPhone }}</span>
      </div>

      <!-- 卡密列表 -->
      <template v-if="claimData.cardKeys && claimData.cardKeys.length > 0">
        <div v-for="(item, idx) in claimData.cardKeys" :key="`ck-${idx}`" class="item-card">
          <div class="item-header">
            <el-tag type="info" effect="light">卡密</el-tag>
            <span class="item-product-name">{{ item.productName }}</span>
            <el-tag v-if="item.status === 'claimed'" type="success" size="small">已领取</el-tag>
          </div>
          <div class="item-body">
            <div class="card-key-display">
              <span class="card-key-value">{{ revealedItems.has(`ck-${idx}`) ? item.cardKey : maskContent(item.cardKey) }}</span>
              <div class="card-key-actions">
                <el-button
                  v-if="!revealedItems.has(`ck-${idx}`)"
                  type="primary"
                  size="small"
                  @click="revealItem(`ck-${idx}`)"
                  plain
                  circle
                  title="查看"
                >
                  <el-icon><View /></el-icon>
                </el-button>
                <el-button
                  v-else
                  type="info"
                  size="small"
                  @click="hideItem(`ck-${idx}`)"
                  plain
                  circle
                  title="隐藏"
                >
                  <el-icon><Hide /></el-icon>
                </el-button>
                <el-button
                  type="success"
                  size="small"
                  @click="copyToClipboard(item.cardKey)"
                  plain
                  circle
                  title="复制"
                >
                  <el-icon><DocumentCopy /></el-icon>
                </el-button>
              </div>
            </div>
            <div v-if="item.usageInstructions" class="item-instructions">
              <el-icon><InfoFilled /></el-icon>
              <span>{{ item.usageInstructions }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 资源链接列表 -->
      <template v-if="claimData.resources && claimData.resources.length > 0">
        <div v-for="(item, idx) in claimData.resources" :key="`rs-${idx}`" class="item-card">
          <div class="item-header">
            <el-tag type="success" effect="light">资源链接</el-tag>
            <span class="item-product-name">{{ item.productName }}</span>
            <el-tag v-if="item.status === 'claimed'" type="success" size="small">已领取</el-tag>
          </div>
          <div class="item-body">
            <div class="resource-link-display">
              <div class="resource-link-row">
                <a
                  v-if="revealedItems.has(`rs-${idx}`)"
                  :href="item.resourceLink"
                  target="_blank"
                  class="resource-link"
                >
                  {{ item.resourceLink }}
                </a>
                <span v-else class="resource-link-masked">{{ maskContent(item.resourceLink) }}</span>
                <div class="resource-link-actions">
                  <el-button
                    v-if="!revealedItems.has(`rs-${idx}`)"
                    type="primary"
                    size="small"
                    @click="revealItem(`rs-${idx}`)"
                    plain
                    circle
                    title="查看"
                  >
                    <el-icon><View /></el-icon>
                  </el-button>
                  <el-button
                    v-else
                    type="info"
                    size="small"
                    @click="hideItem(`rs-${idx}`)"
                    plain
                    circle
                    title="隐藏"
                  >
                    <el-icon><Hide /></el-icon>
                  </el-button>
                  <el-button
                    type="success"
                    size="small"
                    @click="copyToClipboard(item.resourceLink)"
                    plain
                    circle
                    title="复制"
                  >
                    <el-icon><DocumentCopy /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
            <div v-if="item.resourcePassword" class="resource-password">
              <span class="pwd-label">访问密码：</span>
              <el-tag type="warning" effect="plain">{{ revealedItems.has(`rs-pwd-${idx}`) ? item.resourcePassword : '****' }}</el-tag>
              <el-button
                v-if="!revealedItems.has(`rs-pwd-${idx}`)"
                type="primary"
                size="small"
                @click="revealItem(`rs-pwd-${idx}`)"
                plain
                circle
                title="查看"
              >
                <el-icon><View /></el-icon>
              </el-button>
              <el-button
                v-else
                type="info"
                size="small"
                @click="hideItem(`rs-pwd-${idx}`)"
                plain
                circle
                title="隐藏"
              >
                <el-icon><Hide /></el-icon>
              </el-button>
              <el-button
                type="success"
                size="small"
                @click="copyToClipboard(item.resourcePassword)"
                plain
                circle
                title="复制"
              >
                <el-icon><DocumentCopy /></el-icon>
              </el-button>
            </div>
            <div v-if="item.resourceDescription" class="item-description">
              <span class="desc-label">资源说明：</span>{{ item.resourceDescription }}
            </div>
            <div v-if="item.usageInstructions" class="item-instructions">
              <el-icon><InfoFilled /></el-icon>
              <span>{{ item.usageInstructions }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- 无内容提示 -->
      <div v-if="(!claimData.cardKeys || claimData.cardKeys.length === 0) && (!claimData.resources || claimData.resources.length === 0)"
        class="empty-content">
        <el-empty description="暂无可领取的内容" />
      </div>

      <!-- 一键复制全部 -->
      <div v-if="claimData.cardKeys.length > 0 || claimData.resources.length > 0" class="confirm-section">
        <el-button
          type="success"
          size="large"
          style="width: 100%;"
          @click="copyAll"
        >
          <el-icon><DocumentCopy /></el-icon>
          一键复制全部
        </el-button>
        <div class="confirm-tip">复制所有卡密和资源链接到剪贴板</div>
      </div>
    </div>

    <!-- 页脚（与CRM系统同步） -->
    <div class="claim-footer">
      <div class="footer-content">
        <span>{{ copyrightText || `©${new Date().getFullYear()} ${companyName || systemName} 版权所有` }}</span>
        <span class="footer-sep">|</span>
        <span>v{{ systemVersion }}</span>
        <template v-if="websiteUrl">
          <span class="footer-sep">|</span>
          <a :href="websiteUrl" target="_blank" class="footer-link">官网</a>
        </template>
        <template v-if="contactPhone">
          <span class="footer-sep">|</span>
          <span class="footer-link">联系我们</span>
        </template>
        <template v-if="icpNumber">
          <span class="footer-sep">|</span>
          <a href="https://beian.miit.gov.cn/" target="_blank" class="footer-link">{{ icpNumber }}</a>
        </template>
        <template v-if="policeNumber">
          <span class="footer-sep">|</span>
          <a href="http://www.beian.gov.cn/" target="_blank" class="footer-link">🛡️ {{ policeNumber }}</a>
        </template>
        <template v-if="techSupport">
          <span class="footer-sep">|</span>
          <span>{{ techSupport }}</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Lock, Phone, Key, Warning, CircleCheck, View, DocumentCopy,
  InfoFilled, Hide
} from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const token = computed(() => route.params.token as string)

// 系统信息
const systemName = ref('CRM系统')
const systemAvatar = ref('')
const systemLogo = ref('')
const claimPageNotice = ref('')
const copyrightText = ref('')
const icpNumber = ref('')
const policeNumber = ref('')
const techSupport = ref('')
const contactPhone = ref('')
const systemVersion = ref('1.0.0')
const websiteUrl = ref('')
const companyName = ref('')

// 登录相关
const isLoggedIn = ref(false)
const tokenValid = ref(true)
const loginMethod = ref<'password' | 'sms'>('password')
const activeLoginMethod = ref<'password' | 'sms'>('password')
const loginLoading = ref(false)
const loginError = ref('')
const sessionToken = ref('')
const smsCountdown = ref(0)
let smsTimer: any = null

const loginForm = reactive({
  phone: '',
  password: '',
  smsCode: ''
})

// 脱敏手机号
const maskedPhone = computed(() => {
  const p = loginForm.phone
  if (!p || p.length < 7) return ''
  return p.substring(0, 3) + '****' + p.substring(p.length - 4)
})

// 领取内容
const claimData = reactive<{
  cardKeys: any[]
  resources: any[]
}>({
  cardKeys: [],
  resources: []
})

// 已展示/已隐藏的项目
const revealedItems = ref(new Set<string>())

// 内容脱敏：显示前4位 + **** + 后4位
const maskContent = (text: string) => {
  if (!text) return '****'
  if (text.length <= 8) return text.substring(0, 2) + '****'
  return text.substring(0, 4) + '****' + text.substring(text.length - 4)
}

const revealItem = (key: string) => {
  revealedItems.value.add(key)
}

const hideItem = (key: string) => {
  revealedItems.value.delete(key)
}

// 初始化：预加载系统信息（公开接口，无需登录）
onMounted(async () => {
  if (!token.value) {
    loginError.value = '领取链接无效'
    tokenValid.value = false
    return
  }
  try {
    const res = await axios.get(`/api/v1/public/virtual-claim/info?token=${token.value}`)
    if (res.data?.data) {
      systemName.value = res.data.data.systemName || 'CRM系统'
      systemAvatar.value = res.data.data.systemAvatar || ''
      systemLogo.value = res.data.data.systemLogo || ''
      claimPageNotice.value = res.data.data.claimPageNotice || ''
      loginMethod.value = res.data.data.loginMethod === 'sms' ? 'sms' : 'password'
      activeLoginMethod.value = loginMethod.value
      copyrightText.value = res.data.data.copyrightText || ''
      icpNumber.value = res.data.data.icpNumber || ''
      policeNumber.value = res.data.data.policeNumber || ''
      techSupport.value = res.data.data.techSupport || ''
      contactPhone.value = res.data.data.contactPhone || ''
      systemVersion.value = res.data.data.systemVersion || '1.0.0'
      websiteUrl.value = res.data.data.websiteUrl || ''
      companyName.value = res.data.data.companyName || ''
    }
  } catch (e: any) {
    const msg = e?.response?.data?.message
    if (e?.response?.status === 404) {
      loginError.value = msg || '领取链接无效或已过期'
      tokenValid.value = false
    }
  }
})

// 发送短信验证码
const sendSmsCode = async () => {
  if (!loginForm.phone) {
    ElMessage.warning('请先填写手机号')
    return
  }
  try {
    await axios.post('/api/v1/public/virtual-claim/send-sms', { phone: loginForm.phone, token: token.value })
    ElMessage.success('验证码已发送')
    smsCountdown.value = 60
    smsTimer = setInterval(() => {
      smsCountdown.value--
      if (smsCountdown.value <= 0) {
        clearInterval(smsTimer)
      }
    }, 1000)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '发送失败')
  }
}

// 登录
const handleLogin = async () => {
  if (!loginForm.phone) {
    loginError.value = '请填写手机号'
    return
  }
  if (activeLoginMethod.value === 'sms' && !loginForm.smsCode) {
    loginError.value = '请填写验证码'
    return
  }
  if (activeLoginMethod.value === 'password' && !loginForm.password) {
    loginError.value = '请填写领取密码'
    return
  }

  loginLoading.value = true
  loginError.value = ''
  try {
    const resp = await axios.post('/api/v1/public/virtual-claim/login', {
      token: token.value,
      phone: loginForm.phone,
      password: activeLoginMethod.value === 'password' ? loginForm.password : undefined,
      smsCode: activeLoginMethod.value === 'sms' ? loginForm.smsCode : undefined
    })
    sessionToken.value = resp.data.data.sessionToken
    isLoggedIn.value = true
    await loadClaimDetail()
  } catch (e: any) {
    loginError.value = e?.response?.data?.message || '登录失败，请检查手机号或密码'
  } finally {
    loginLoading.value = false
  }
}

// 加载领取详情
const loadClaimDetail = async () => {
  try {
    const resp = await axios.get('/api/v1/public/virtual-claim/detail', {
      params: { sessionToken: sessionToken.value }
    })
    const data = resp.data.data
    systemName.value = data.systemName || systemName.value
    systemAvatar.value = data.systemAvatar || systemAvatar.value
    claimPageNotice.value = data.claimPageNotice || claimPageNotice.value
    claimData.cardKeys = data.cardKeys || []
    claimData.resources = data.resources || []

    // 已领取的项目自动展示
    claimData.cardKeys.forEach((_item, idx) => {
      if (_item.status === 'claimed') revealedItems.value.add(`ck-${idx}`)
    })
    claimData.resources.forEach((_item, idx) => {
      if (_item.status === 'claimed') revealedItems.value.add(`rs-${idx}`)
    })
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '获取领取内容失败')
  }
}

// 复制到剪贴板
const copyToClipboard = (text: string) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('已复制到剪贴板')
    }).catch(() => {
      fallbackCopy(text)
    })
  } else {
    fallbackCopy(text)
  }
}

const fallbackCopy = (text: string) => {
  const el = document.createElement('textarea')
  el.value = text
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
  ElMessage.success('已复制到剪贴板')
}

// 一键复制全部
const copyAll = () => {
  const parts: string[] = []
  claimData.cardKeys.forEach((item) => {
    let line = `【卡密】${item.productName || ''}: ${item.cardKey}`
    if (item.usageInstructions) line += `\n  使用说明: ${item.usageInstructions}`
    parts.push(line)
  })
  claimData.resources.forEach((item) => {
    let line = `【资源链接】${item.productName || ''}: ${item.resourceLink}`
    if (item.resourcePassword) line += `\n  提取码: ${item.resourcePassword}`
    if (item.usageInstructions) line += `\n  使用说明: ${item.usageInstructions}`
    parts.push(line)
  })
  if (parts.length === 0) {
    ElMessage.warning('暂无可复制的内容')
    return
  }
  copyToClipboard(parts.join('\n\n'))
}
</script>

<style scoped>
.virtual-claim-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 16px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.claim-top-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  padding: 0 16px;
  z-index: 100;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.top-bar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.top-bar-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.claim-header {
  text-align: center;
  padding: 60px 0 24px;
}

.claim-logo {
  margin-bottom: 12px;
}

.logo-img {
  width: 72px;
  height: 72px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.logo-placeholder {
  font-size: 56px;
  line-height: 1;
}

.claim-title {
  font-size: 22px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 6px;
}

.claim-subtitle {
  font-size: 14px;
  color: #909399;
}

.claim-notice {
  max-width: 480px;
  margin: 0 auto 16px;
}

.login-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  max-width: 480px;
  margin: 0 auto;
  box-shadow: 0 8px 24px rgba(0,0,0,0.08);
}

.login-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.login-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  color: #f56c6c;
  font-size: 13px;
}

.claim-content {
  max-width: 480px;
  margin: 0 auto;
}

.claim-success-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #67c23a;
  font-weight: 600;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f0f9eb;
  border-radius: 10px;
}

.success-icon {
  font-size: 20px;
}

.item-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.item-product-name {
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.login-method-switch {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  width: fit-content;
}

.method-tab {
  font-size: 13px;
  color: #909399;
  cursor: pointer;
  padding: 7px 16px;
  transition: all 0.2s;
  background: #fafafa;
  user-select: none;
}

.method-tab + .method-tab {
  border-left: 1px solid #e4e7ed;
}

.method-tab.active {
  color: #409eff;
  font-weight: 600;
  background: #ecf5ff;
}

.method-tab:hover {
  color: #409eff;
  background: #f5f9ff;
}

.claim-content-notice {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  background: #ecf5ff;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.customer-info {
  font-size: 13px;
  color: #909399;
  margin-bottom: 12px;
  padding: 8px 14px;
  background: #fafafa;
  border-radius: 6px;
}

.card-key-display {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
}

.card-key-value {
  flex: 1;
  font-family: monospace;
  font-size: 15px;
  color: #303133;
  word-break: break-all;
}

.card-key-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.resource-link-display {
  margin-bottom: 8px;
}

.resource-link-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f5f7fa;
  border-radius: 8px;
  padding: 10px 14px;
}

.resource-link {
  flex: 1;
  color: #409eff;
  word-break: break-all;
  font-size: 14px;
}

.resource-link-masked {
  flex: 1;
  font-family: monospace;
  font-size: 14px;
  color: #909399;
}

.resource-link-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.resource-password {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.pwd-label {
  font-size: 13px;
  color: #909399;
}

.item-description {
  font-size: 13px;
  color: #606266;
  margin-bottom: 8px;
}

.desc-label {
  color: #909399;
  font-weight: 500;
}

.item-instructions {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  background: #f5f7fa;
  padding: 8px 10px;
  border-radius: 6px;
}

.empty-content {
  background: #fff;
  border-radius: 12px;
  padding: 40px;
  text-align: center;
}

.confirm-section {
  margin-top: 20px;
}

.confirm-tip {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.claim-footer {
  margin-top: 32px;
  padding: 16px 12px;
  text-align: center;
}

.footer-content {
  color: #c0c4cc;
  font-size: 11px;
  line-height: 1.2;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
}

.footer-content .footer-sep {
  color: #dcdfe6;
  margin: 0 5px;
}

.footer-content .footer-link {
  color: #c0c4cc;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-content .footer-link:hover {
  color: #409eff;
}

@media (max-width: 480px) {
  .claim-top-bar {
    padding: 0 12px;
  }
  .top-bar-name {
    font-size: 14px;
  }
  .claim-header {
    padding: 56px 0 20px;
  }
  .footer-content {
    font-size: 10px;
    gap: 2px;
  }
  .footer-content .footer-sep {
    margin: 0 3px;
  }
}
</style>

