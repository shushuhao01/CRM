<template>
  <view class="splash-page">
    <view class="content">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">CRM外呼助手</text>
      <text class="subtitle">高效外呼 · 智能管理</text>
    </view>

    <view class="loading">
      <view class="loading-dots">
        <view class="dot" v-for="i in 3" :key="i" />
      </view>
      <text class="loading-text">{{ loadingText }}</text>
    </view>

    <text class="version">v{{ appVersion }}</text>

    <!-- 首次启动隐私政策弹窗（国内应用商店合规必须） -->
    <view class="privacy-mask" v-if="showPrivacyDialog" @touchmove.stop.prevent>
      <view class="privacy-dialog">
        <text class="privacy-title">用户协议与隐私政策</text>
        <view class="privacy-body">
          <scroll-view scroll-y class="privacy-scroll">
            <text class="privacy-text">
              欢迎使用云客CRM外呼助手！我们非常重视您的个人信息和隐私保护。在使用本应用前，请您仔细阅读并充分理解以下协议：
            </text>
            <text class="privacy-text" style="margin-top: 16rpx;">
              1. 我们会根据《隐私政策》收集和使用您的必要信息（包括设备信息、通话状态、录音文件等），用于提供外呼管理服务。
            </text>
            <text class="privacy-text" style="margin-top: 16rpx;">
              2. 未经您的同意，我们不会向第三方共享、转让您的个人信息。
            </text>
            <text class="privacy-text" style="margin-top: 16rpx;">
              3. 您可以通过「设置」页面管理您的权限和个人信息。
            </text>
            <text class="privacy-text" style="margin-top: 24rpx;">
              请您阅读并同意
              <text class="privacy-link" @click="openUserAgreement">《用户服务协议》</text>
              和
              <text class="privacy-link" @click="openPrivacyPolicy">《隐私政策》</text>
              ，点击"同意"表示您已充分理解并同意上述协议的全部内容。
            </text>
          </scroll-view>
        </view>
        <view class="privacy-buttons">
          <view class="btn-disagree" @click="handleDisagree">
            <text class="btn-text-disagree">不同意</text>
          </view>
          <view class="btn-agree" @click="handleAgree">
            <text class="btn-text-agree">同意</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'
import { APP_VERSION } from '@/config/app'

const loadingText = ref('正在启动...')
const serverStore = useServerStore()
const userStore = useUserStore()
const appVersion = APP_VERSION
const showPrivacyDialog = ref(false)

/** 检查是否已同意隐私协议 */
const checkPrivacyAgreed = (): boolean => {
  try {
    return uni.getStorageSync('privacy_agreed') === 'true'
  } catch {
    return false
  }
}

/** 打开用户协议页面 */
const openUserAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/user-agreement' })
}

/** 打开隐私政策页面 */
const openPrivacyPolicy = () => {
  uni.navigateTo({ url: '/pages/agreement/privacy-policy' })
}

/** 用户点击"同意" */
const handleAgree = () => {
  uni.setStorageSync('privacy_agreed', 'true')
  showPrivacyDialog.value = false
  // 继续正常启动流程
  startApp()
}

/** 用户点击"不同意" */
const handleDisagree = () => {
  uni.showModal({
    title: '温馨提示',
    content: '您需要同意用户协议和隐私政策才能使用本应用。点击"确定"将退出应用。',
    confirmText: '确定退出',
    cancelText: '再看看',
    success: (res) => {
      if (res.confirm) {
        // #ifdef APP-PLUS
        plus.runtime.quit()
        // #endif
        // #ifndef APP-PLUS
        uni.showToast({ title: '请同意协议后使用', icon: 'none' })
        // #endif
      }
    }
  })
}

/** 正常启动流程 */
const startApp = async () => {
  loadingText.value = '检查配置...'

  // 1. 检查是否已配置服务器
  if (!serverStore.currentServer) {
    loadingText.value = '请配置服务器'
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/server-config/index' })
    }, 500)
    return
  }

  loadingText.value = '连接服务器...'

  // 2. 测试服务器连接
  const connected = await serverStore.testConnection(serverStore.currentServer)
  if (!connected) {
    loadingText.value = '服务器连接失败'
    uni.showToast({ title: '服务器连接失败', icon: 'none' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/server-config/index' })
    }, 1500)
    return
  }

  serverStore.isConnected = true

  // 3. 检查登录状态
  if (userStore.isLoggedIn && userStore.token) {
    loadingText.value = '正在进入...'
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
  } else {
    loadingText.value = '请登录'
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 500)
  }
}

onMounted(async () => {
  // 延迟一下显示启动页
  await new Promise(resolve => setTimeout(resolve, 800))

  // 首次启动：检查隐私协议是否已同意
  if (!checkPrivacyAgreed()) {
    loadingText.value = '请阅读并同意协议'
    showPrivacyDialog.value = true
    return  // 等待用户操作，不继续启动流程
  }

  // 已同意过，直接启动
  startApp()
})
</script>

<style lang="scss" scoped>
.splash-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;

    .logo {
      width: 180rpx;
      height: 180rpx;
      margin-bottom: 40rpx;
    }

    .title {
      font-size: 48rpx;
      font-weight: bold;
      color: #1F2937;
      margin-bottom: 16rpx;
    }

    .subtitle {
      font-size: 28rpx;
      color: #6B7280;
    }
  }

  .loading {
    margin-top: 120rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .loading-dots {
      display: flex;
      gap: 16rpx;
      margin-bottom: 24rpx;

      .dot {
        width: 16rpx;
        height: 16rpx;
        border-radius: 50%;
        background: #34D399;
        animation: bounce 1.4s infinite ease-in-out both;

        &:nth-child(1) { animation-delay: -0.32s; }
        &:nth-child(2) { animation-delay: -0.16s; }
        &:nth-child(3) { animation-delay: 0s; }
      }
    }

    .loading-text {
      font-size: 26rpx;
      color: #9CA3AF;
    }
  }

  .version {
    position: fixed;
    bottom: 60rpx;
    font-size: 24rpx;
    color: #D1D5DB;
  }
}

/* 隐私政策弹窗样式 */
.privacy-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.privacy-dialog {
  width: 620rpx;
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.privacy-title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: bold;
  color: #1F2937;
  padding: 40rpx 32rpx 20rpx;
}

.privacy-body {
  padding: 0 32rpx;
  max-height: 500rpx;
}

.privacy-scroll {
  max-height: 500rpx;
}

.privacy-text {
  display: block;
  font-size: 26rpx;
  color: #4B5563;
  line-height: 1.7;
}

.privacy-link {
  color: #34D399;
  font-weight: 500;
}

.privacy-buttons {
  display: flex;
  padding: 32rpx;
  gap: 24rpx;
}

.btn-disagree {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  background: #F3F4F6;
}

.btn-text-disagree {
  font-size: 30rpx;
  color: #6B7280;
}

.btn-agree {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 40rpx;
  background: linear-gradient(135deg, #34D399 0%, #10B981 100%);
}

.btn-text-agree {
  font-size: 30rpx;
  color: #ffffff;
  font-weight: bold;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
