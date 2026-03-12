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

    <text class="version">v1.0.0</text>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'

const loadingText = ref('正在启动...')
const serverStore = useServerStore()
const userStore = useUserStore()

onMounted(async () => {
  // 延迟一下显示启动页
  await new Promise(resolve => setTimeout(resolve, 1000))

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

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
