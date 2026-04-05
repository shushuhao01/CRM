<template>
  <view class="server-config">
    <!-- 当前服务器状态 -->
    <view class="section" v-if="serverStore.currentServer">
      <text class="section-title">当前服务器</text>
      <view class="server-card active">
        <view class="server-icon">🌐</view>
        <view class="server-info">
          <text class="server-host">{{ serverStore.displayUrl }}</text>
          <text class="server-status" :class="{ connected: serverStore.isConnected }">
            {{ serverStore.isConnected ? '✅ 已连接' : '❌ 未连接' }}
          </text>
        </view>
      </view>
    </view>

    <!-- 输入服务器地址 -->
    <view class="section">
      <text class="section-title">输入服务器地址</text>
      <view class="input-wrapper">
        <input
          v-model="serverInput"
          placeholder="请输入域名或IP地址"
          placeholder-class="placeholder"
          :disabled="isLoading"
        />
      </view>
      <text class="hint">支持格式：crm.yourcompany.com、192.168.1.100:3000</text>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button
        class="btn-primary"
        @tap="handleTestConnection"
        :loading="isLoading"
        :disabled="!serverInput.trim()"
      >
        测试并保存
      </button>

      <button class="btn-secondary" @tap="handleScanConfig">
        📷 扫码配置服务器
      </button>
    </view>

    <!-- 历史服务器 -->
    <view class="section" v-if="serverStore.serverHistory.length > 0">
      <text class="section-title">历史服务器</text>
      <view
        class="server-card"
        v-for="(server, index) in serverStore.serverHistory"
        :key="index"
        :class="{ active: isCurrentServer(server) }"
        @tap="handleSelectHistory(server)"
      >
        <view class="server-icon">🌐</view>
        <view class="server-info">
          <text class="server-host">{{ formatServerHost(server) }}</text>
          <text class="server-time">最近: {{ formatDate(server.lastUsed) }}</text>
        </view>
        <view class="server-check" v-if="isCurrentServer(server)">✓</view>
      </view>
    </view>

    <!-- 提示信息 -->
    <view class="tips">
      <text>💡 提示：请向管理员获取服务器地址，或扫描配置二维码</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useServerStore, type ServerInfo } from '@/stores/server'

const serverStore = useServerStore()
const serverInput = ref('')
const isLoading = ref(false)

// 测试连接
const handleTestConnection = async () => {
  if (!serverInput.value.trim()) return

  isLoading.value = true
  const result = await serverStore.setServer(serverInput.value)
  isLoading.value = false

  if (result.success) {
    uni.showToast({ title: '连接成功', icon: 'success' })
    serverInput.value = ''

    // 跳转到登录页
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 1000)
  } else {
    uni.showToast({ title: result.message, icon: 'none' })
  }
}

// 扫码配置
const handleScanConfig = () => {
  uni.scanCode({
    scanType: ['qrCode'],
    success: async (res) => {
      try {
        // 尝试解析JSON格式
        const config = JSON.parse(res.result)
        if (config.server || config.serverUrl) {
          serverInput.value = config.server || config.serverUrl
          await handleTestConnection()
        }
      } catch (e) {
        // 直接当作服务器地址
        serverInput.value = res.result
        await handleTestConnection()
      }
    },
    fail: () => {
      uni.showToast({ title: '扫码失败', icon: 'none' })
    }
  })
}

// 从历史选择
const handleSelectHistory = async (server: ServerInfo) => {
  isLoading.value = true
  const success = await serverStore.selectFromHistory(server)
  isLoading.value = false

  if (success) {
    uni.showToast({ title: '切换成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/index' })
    }, 1000)
  } else {
    uni.showToast({ title: '连接失败', icon: 'none' })
  }
}

// 判断是否当前服务器
const isCurrentServer = (server: ServerInfo) => {
  const current = serverStore.currentServer
  if (!current) return false
  return current.host === server.host && current.port === server.port
}

// 格式化服务器地址
const formatServerHost = (server: ServerInfo) => {
  return server.port ? `${server.host}:${server.port}` : server.host
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<style lang="scss" scoped>
.server-config {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 32rpx;

  .section {
    margin-bottom: 40rpx;

    .section-title {
      font-size: 28rpx;
      color: #6B7280;
      margin-bottom: 20rpx;
      display: block;
    }
  }

  .server-card {
    display: flex;
    align-items: center;
    padding: 28rpx;
    background: #fff;
    border-radius: 16rpx;
    margin-bottom: 16rpx;
    border: 2rpx solid #E5E7EB;

    &.active {
      border-color: #34D399;
      background: rgba(52, 211, 153, 0.05);
    }

    .server-icon {
      font-size: 44rpx;
      margin-right: 24rpx;
    }

    .server-info {
      flex: 1;

      .server-host {
        font-size: 32rpx;
        font-weight: 500;
        color: #1F2937;
        display: block;
      }

      .server-status, .server-time {
        font-size: 24rpx;
        color: #9CA3AF;
        margin-top: 8rpx;
        display: block;

        &.connected {
          color: #34D399;
        }
      }
    }

    .server-check {
      color: #34D399;
      font-size: 40rpx;
      font-weight: bold;
    }
  }

  .input-wrapper {
    background: #fff;
    border-radius: 16rpx;
    padding: 28rpx;
    border: 2rpx solid #E5E7EB;

    input {
      font-size: 32rpx;
      color: #1F2937;
    }

    .placeholder {
      color: #9CA3AF;
    }
  }

  .hint {
    font-size: 24rpx;
    color: #9CA3AF;
    margin-top: 16rpx;
    display: block;
  }

  .actions {
    margin: 48rpx 0;

    button {
      width: 100%;
      height: 96rpx;
      border-radius: 16rpx;
      font-size: 32rpx;
      margin-bottom: 24rpx;
      border: none;

      &.btn-primary {
        background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
        color: #fff;

        &[disabled] {
          opacity: 0.5;
        }
      }

      &.btn-secondary {
        background: #fff;
        color: #1F2937;
        border: 2rpx solid #E5E7EB;
      }
    }
  }

  .tips {
    text-align: center;
    font-size: 24rpx;
    color: #9CA3AF;
    margin-top: 60rpx;
    padding: 0 40rpx;
    line-height: 1.6;
  }
}
</style>
