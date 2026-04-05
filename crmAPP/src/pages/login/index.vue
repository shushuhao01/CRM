<template>
  <view class="login-page">
    <!-- 顶部装饰 -->
    <view class="header">
      <view class="header-bg" />
    </view>

    <!-- Logo区域 -->
    <view class="logo-section">
      <image class="logo" src="/static/logo.png" mode="aspectFit" />
      <text class="title">CRM外呼助手</text>
    </view>

    <!-- 登录表单 -->
    <view class="form-section">
      <view class="input-group">
        <view class="input-item">
          <text class="icon">👤</text>
          <input
            v-model="username"
            placeholder="请输入用户名"
            placeholder-class="placeholder"
            :disabled="isLoading"
          />
        </view>

        <view class="input-item">
          <text class="icon">🔒</text>
          <input
            v-model="password"
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
            :disabled="isLoading"
            @confirm="handleLogin"
          />
        </view>
      </view>

      <!-- 记住密码和协议勾选 -->
      <view class="checkbox-section">
        <view class="checkbox-row" @tap="rememberPassword = !rememberPassword">
          <view class="checkbox-box" :class="{ checked: rememberPassword }">
            <text v-if="rememberPassword" class="check-icon">✓</text>
          </view>
          <text class="checkbox-label">记住密码</text>
        </view>

        <view class="checkbox-row agreement-row">
          <view class="checkbox-box" :class="{ checked: agreedToTerms }" @tap="toggleAgreement">
            <text v-if="agreedToTerms" class="check-icon">✓</text>
          </view>
          <view class="agreement-text">
            <text class="checkbox-label">我已阅读并同意</text>
            <text class="link-text" @tap.stop="openUserAgreement">《用户协议》</text>
            <text class="checkbox-label">和</text>
            <text class="link-text" @tap.stop="openPrivacyPolicy">《隐私政策》</text>
          </view>
        </view>
      </view>

      <button
        class="btn-login"
        @tap="handleLogin"
        :loading="isLoading"
        :disabled="!canLogin"
      >
        登 录
      </button>
    </view>

    <!-- 底部服务器信息 -->
    <view class="server-info">
      <text class="server-label">服务器: </text>
      <text class="server-url">{{ serverStore.maskedDisplayUrl }}</text>
      <text class="server-switch" @tap="goToServerConfig">切换</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'
import { login } from '@/api/auth'
import { APP_VERSION } from '@/config/app'

const serverStore = useServerStore()
const userStore = useUserStore()

const username = ref('')
const password = ref('')
const rememberPassword = ref(true)
const agreedToTerms = ref(false)
const isLoading = ref(false)

const canLogin = computed(() => {
  return username.value.trim() && password.value.trim() && agreedToTerms.value && !isLoading.value
})

onMounted(() => {
  // 恢复记住的用户名和密码
  const savedUsername = uni.getStorageSync('savedUsername')
  const savedPassword = uni.getStorageSync('savedPassword')
  const savedAgreement = uni.getStorageSync('agreedToTerms')

  if (savedUsername) {
    username.value = savedUsername
  }
  if (savedPassword) {
    password.value = savedPassword
  }
  // 恢复协议同意状态
  if (savedAgreement) {
    agreedToTerms.value = true
  }
})

// 切换协议同意状态
const toggleAgreement = () => {
  agreedToTerms.value = !agreedToTerms.value
}

// 打开用户协议
const openUserAgreement = () => {
  uni.navigateTo({ url: '/pages/agreement/user-agreement' })
}

// 打开隐私政策
const openPrivacyPolicy = () => {
  uni.navigateTo({ url: '/pages/agreement/privacy-policy' })
}

// 登录
const handleLogin = async () => {
  // 检查是否同意协议
  if (!agreedToTerms.value) {
    uni.showToast({
      title: '请先阅读并同意用户协议和隐私政策',
      icon: 'none',
      duration: 2000
    })
    return
  }

  if (!canLogin.value) return

  isLoading.value = true

  try {
    // 获取设备信息
    const systemInfo = uni.getSystemInfoSync()

    const result = await login({
      username: username.value,
      password: password.value,
      deviceInfo: {
        deviceId: systemInfo.deviceId || '',
        deviceName: systemInfo.deviceModel || '未知设备',
        deviceModel: systemInfo.deviceModel || '',
        osType: systemInfo.platform === 'ios' ? 'ios' : 'android',
        osVersion: systemInfo.system || '',
        appVersion: APP_VERSION
      }
    })

    // 保存登录信息
    userStore.setLoginInfo(result)

    // 确保token已保存
    console.log('登录成功，token已保存:', userStore.token ? '有' : '无')

    // 记住密码
    if (rememberPassword.value) {
      uni.setStorageSync('savedUsername', username.value)
      uni.setStorageSync('savedPassword', password.value)
    } else {
      uni.removeStorageSync('savedUsername')
      uni.removeStorageSync('savedPassword')
    }

    // 保存协议同意状态
    uni.setStorageSync('agreedToTerms', true)

    uni.showToast({ title: '登录成功', icon: 'success' })

    // 跳转到首页（延迟确保状态同步）
    setTimeout(() => {
      console.log('跳转首页，当前token:', userStore.token ? '有' : '无')
      uni.switchTab({ url: '/pages/index/index' })
    }, 1200)
  } catch (e: any) {
    uni.showToast({
      title: e.message || '登录失败',
      icon: 'none'
    })
  } finally {
    isLoading.value = false
  }
}

// 切换服务器
const goToServerConfig = () => {
  uni.navigateTo({ url: '/pages/server-config/index' })
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;

  .header {
    height: 300rpx;
    position: relative;

    .header-bg {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 400rpx;
      background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
      border-radius: 0 0 60rpx 60rpx;
    }
  }

  .logo-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: -100rpx;
    position: relative;
    z-index: 1;

    .logo {
      width: 140rpx;
      height: 140rpx;
      background: #fff;
      border-radius: 32rpx;
      padding: 20rpx;
      box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
    }

    .title {
      font-size: 40rpx;
      font-weight: bold;
      color: #1F2937;
      margin-top: 24rpx;
    }
  }

  .form-section {
    padding: 60rpx 48rpx;

    .input-group {
      background: #fff;
      border-radius: 24rpx;
      overflow: hidden;
      box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.05);

      .input-item {
        display: flex;
        align-items: center;
        padding: 32rpx;
        border-bottom: 1rpx solid #F3F4F6;

        &:last-child {
          border-bottom: none;
        }

        .icon {
          font-size: 36rpx;
          margin-right: 24rpx;
        }

        input {
          flex: 1;
          font-size: 32rpx;
          color: #1F2937;
        }

        .placeholder {
          color: #9CA3AF;
        }
      }
    }

    .checkbox-section {
      margin: 32rpx 0;
      padding: 0 8rpx;

      .checkbox-row {
        display: flex;
        align-items: center;
        margin-bottom: 20rpx;

        &.agreement-row {
          align-items: flex-start;

          .checkbox-box {
            margin-top: 2rpx;
          }
        }
      }

      .checkbox-box {
        width: 36rpx;
        height: 36rpx;
        border: 2rpx solid #D1D5DB;
        border-radius: 8rpx;
        margin-right: 16rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.checked {
          background: #34D399;
          border-color: #34D399;
        }

        .check-icon {
          color: #fff;
          font-size: 24rpx;
          font-weight: bold;
        }
      }

      .checkbox-label {
        font-size: 28rpx;
        color: #6B7280;
        line-height: 1.5;
      }

      .agreement-text {
        flex: 1;
        line-height: 1.5;

        .link-text {
          font-size: 28rpx;
          color: #34D399;
        }
      }
    }

    .btn-login {
      width: 100%;
      height: 96rpx;
      background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
      color: #fff;
      font-size: 34rpx;
      font-weight: 500;
      border-radius: 48rpx;
      border: none;

      &[disabled] {
        opacity: 0.5;
      }
    }
  }

  .server-info {
    position: fixed;
    bottom: 80rpx;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 24rpx;

    .server-label {
      color: #9CA3AF;
    }

    .server-url {
      color: #6B7280;
    }

    .server-switch {
      color: #34D399;
      margin-left: 16rpx;
      text-decoration: underline;
    }
  }
}
</style>
