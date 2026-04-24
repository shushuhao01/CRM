<template>
  <div class="virtual-claim-page">
    <!-- 页面头部 -->
    <div class="claim-header">
      <div class="claim-logo">
        <img v-if="systemAvatar" :src="systemAvatar" alt="logo" class="logo-img" />
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
      <el-form :model="loginForm" label-position="top" size="large">
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

        <!-- 短信验证码登录 -->
        <template v-if="loginMethod === 'sms'">
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
      </el-form>

      <div v-if="loginError" class="login-error">
        <el-icon><Warning /></el-icon>
        {{ loginError }}
      </div>
    </div>

    <!-- 领取内容 -->
    <div v-else class="claim-content">
      <div class="claim-success-header">
        <el-icon class="success-icon"><CircleCheck /></el-icon>
        <span>身份验证成功，以下是您的商品</span>
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
              <span class="card-key-value">{{ item.encrypted && !claimedItems.has(`ck-${idx}`) ? '• • • • • • • •' : item.cardKey }}</span>
              <el-button
                v-if="!claimedItems.has(`ck-${idx}`)"
                type="primary"
                size="small"
                @click="revealAndCopy(item.cardKey, `ck-${idx}`)"
                plain
              >
                <el-icon><View /></el-icon>
                点击查看并复制
              </el-button>
              <el-button
                v-else
                type="success"
                size="small"
                @click="copyToClipboard(item.cardKey)"
              >
                <el-icon><DocumentCopy /></el-icon>
                复制卡密
              </el-button>
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
              <a
                v-if="claimedItems.has(`rs-${idx}`) || !item.encrypted"
                :href="item.resourceLink"
                target="_blank"
                class="resource-link"
              >
                {{ item.resourceLink }}
              </a>
              <el-button
                v-else
                type="primary"
                size="small"
                @click="revealAndCopy(item.resourceLink, `rs-${idx}`)"
                plain
              >
                <el-icon><View /></el-icon>
                点击查看资源链接
              </el-button>
            </div>
            <div v-if="item.resourcePassword" class="resource-password">
              <span class="pwd-label">访问密码：</span>
              <el-tag type="warning" effect="plain">{{ item.resourcePassword }}</el-tag>
              <el-button size="small" text @click="copyToClipboard(item.resourcePassword)">复制</el-button>
            </div>
            <div v-if="item.resourceDescription" class="item-description">{{ item.resourceDescription }}</div>
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

      <!-- 确认领取按钮 -->
      <div v-if="showConfirmBtn" class="confirm-section">
        <el-button
          type="success"
          size="large"
          style="width: 100%;"
          :loading="confirmLoading"
          @click="confirmClaim"
        >
          <el-icon><Check /></el-icon>
          确认已领取
        </el-button>
        <div class="confirm-tip">点击确认后，系统将记录您的领取状态</div>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="claim-footer">
      <span>Powered by CRM系统</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Lock, Phone, Key, Warning, CircleCheck, View, DocumentCopy,
  InfoFilled, Check
} from '@element-plus/icons-vue'
import axios from 'axios'

const route = useRoute()
const token = computed(() => route.params.token as string)

// 系统信息
const systemName = ref('CRM系统')
const systemAvatar = ref('')
const claimPageNotice = ref('')

// 登录相关
const isLoggedIn = ref(false)
const loginMethod = ref<'password' | 'sms'>('password')
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

// 领取内容
const claimData = reactive<{
  cardKeys: any[]
  resources: any[]
}>({
  cardKeys: [],
  resources: []
})

// 已展示的项目
const claimedItems = ref(new Set<string>())
const confirmLoading = ref(false)
const confirmed = ref(false)

const showConfirmBtn = computed(() => {
  return !confirmed.value && (claimData.cardKeys.length > 0 || claimData.resources.length > 0)
})

// 初始化：预加载系统信息（公开接口，无需登录）
onMounted(async () => {
  if (!token.value) {
    loginError.value = '领取链接无效'
    return
  }
  // 尝试预加载设置（失败不影响）
  try {
    const res = await axios.get(`/api/v1/public/virtual-claim/info?token=${token.value}`)
    if (res.data?.data) {
      systemName.value = res.data.data.systemName || 'CRM系统'
      systemAvatar.value = res.data.data.systemAvatar || ''
      claimPageNotice.value = res.data.data.claimPageNotice || ''
      loginMethod.value = res.data.data.loginMethod === 'sms' ? 'sms' : 'password'
    }
  } catch { /* 使用默认值 */ }
})

// 发送短信验证码
const sendSmsCode = async () => {
  if (!loginForm.phone) {
    ElMessage.warning('请先填写手机号')
    return
  }
  try {
    await axios.post('/api/v1/public/virtual-claim/send-sms', { phone: loginForm.phone })
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
  if (loginMethod.value === 'sms' && !loginForm.smsCode) {
    loginError.value = '请填写验证码'
    return
  }
  if (loginMethod.value === 'password' && !loginForm.password) {
    loginError.value = '请填写领取密码'
    return
  }

  loginLoading.value = true
  loginError.value = ''
  try {
    const resp = await axios.post('/api/v1/public/virtual-claim/login', {
      token: token.value,
      phone: loginForm.phone,
      password: loginMethod.value === 'password' ? loginForm.password : undefined,
      smsCode: loginMethod.value === 'sms' ? loginForm.smsCode : undefined
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

    // 已领取的项目自动显示
    claimData.cardKeys.forEach((item, idx) => {
      if (item.status === 'claimed') claimedItems.value.add(`ck-${idx}`)
    })
    claimData.resources.forEach((item, idx) => {
      if (item.status === 'claimed') claimedItems.value.add(`rs-${idx}`)
    })
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '获取领取内容失败')
  }
}

// 显示内容并复制
const revealAndCopy = (content: string, key: string) => {
  claimedItems.value.add(key)
  copyToClipboard(content)
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

// 确认领取
const confirmClaim = async () => {
  confirmLoading.value = true
  try {
    await axios.post('/api/v1/public/virtual-claim/confirm', {
      sessionToken: sessionToken.value
    })
    confirmed.value = true
    ElMessage.success('领取确认成功！感谢您的购买')
    // 刷新状态
    await loadClaimDetail()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '确认失败')
  } finally {
    confirmLoading.value = false
  }
}
</script>

<style scoped>
.virtual-claim-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px 16px 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.claim-header {
  text-align: center;
  padding: 32px 0 24px;
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

.resource-link-display {
  margin-bottom: 8px;
}

.resource-link {
  color: #409eff;
  word-break: break-all;
  font-size: 14px;
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
  text-align: center;
  margin-top: 32px;
  font-size: 12px;
  color: #c0c4cc;
}
</style>

