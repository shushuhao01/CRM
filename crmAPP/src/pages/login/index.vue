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
import { setEncryptedStorage, getEncryptedStorage } from '@/utils/crypto'

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
  // 恢复记住的用户名和密码（使用加密存储）
  const savedUsername = uni.getStorageSync('savedUsername')
  const savedPassword = getEncryptedStorage('savedPassword')
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


    // 记住密码（使用加密存储）
    if (rememberPassword.value) {
      uni.setStorageSync('savedUsername', username.value)
      setEncryptedStorage('savedPassword', password.value)
    } else {
      uni.removeStorageSync('savedUsername')
      uni.removeStorageSync('savedPassword')
    }

    // 保存协议同意状态
    uni.setStorageSync('agreedToTerms', true)

    uni.showToast({ title: '登录成功', icon: 'success' })

    // 跳转到首页（延迟确保状态同步）
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })

      // 🔥 登录成功后延迟检测录音状态，如果未开启则提醒
      setTimeout(() => {
        checkRecordingOnLogin()
      }, 2000)
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

// 🔥 登录成功后检测录音状态
const checkRecordingOnLogin = async () => {
  // #ifdef APP-PLUS
  try {
    const { recordingService } = await import('@/services/recordingService')
    const hasPermission = await recordingService.checkPermissions()
    if (!hasPermission) {
      // 没有存储权限，先不提醒（权限会在需要时再请求）
      return
    }
    const enabled = await recordingService.checkRecordingEnabled()
    if (!enabled) {
      // 检查是否已经提醒过（同一天只提醒一次）
      const lastRemind = uni.getStorageSync('lastRecordingRemind')
      const today = new Date().toDateString()
      if (lastRemind === today) return
      uni.setStorageSync('lastRecordingRemind', today)

      // 获取设备信息
      const sysInfo = uni.getSystemInfoSync()
      const model = sysInfo.deviceModel || '您的手机'

      uni.showModal({
        title: '🎙️ 通话录音未开启',
        content: `检测到 ${model} 尚未开启系统通话录音功能。\n\n开启后，APP会自动上传通话录音到CRM系统，方便后续回听和管理。\n\n是否现在去开启？`,
        confirmText: '去开启',
        cancelText: '稍后',
        success: async (modalRes) => {
          if (modalRes.confirm) {
            // 尝试直接跳转到系统录音设置（和设置页一样的逻辑）
            try {
              const result = await recordingService.tryEnableSystemRecording()
              if (result.jumped) {
                uni.showModal({
                  title: `📱 ${model}`,
                  content: result.guideTips,
                  showCancel: false,
                  confirmText: '我知道了'
                })
              } else {
                // 无法跳转，引导用户手动操作
                uni.showModal({
                  title: '📋 手动开启通话录音',
                  content: result.guideTips || `请按以下步骤操作：\n\n① 返回手机桌面\n② 打开「设置」应用\n③ 找到「电话」或「通话设置」\n④ 找到「通话录音」→「自动录音」\n⑤ 开启自动录音\n\n💡 也可以在设置中搜索"通话录音"`,
                  showCancel: true,
                  cancelText: '我知道了',
                  confirmText: '去设置页',
                  success: (guideRes) => {
                    if (guideRes.confirm) {
                      uni.navigateTo({ url: '/pages/settings/index' })
                    }
                  }
                })
              }
            } catch (_e) {
              // 兜底：跳转到APP设置页
              uni.navigateTo({ url: '/pages/settings/index' })
            }
          }
        }
      })
    }

    // 🔥 确保默认设置已初始化（自动上传 + 自动清理默认开启）
    const saved = uni.getStorageSync('callSettings')
    if (!saved) {
      uni.setStorageSync('callSettings', JSON.stringify({
        callNotify: true,
        vibrate: false,
        autoUploadRecording: true,
        autoCleanRecording: true,
        recordingRetentionDays: 3
      }))
    }
  } catch (e) {
    console.error('[Login] 录音检测失败:', e)
  }
  // #endif
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
