<template>
  <view class="scan-page">
    <!-- 扫描中提示 -->
    <view class="scanning-area">
      <view class="scan-icon">📷</view>
      <view class="scan-text">正在打开扫码...</view>
    </view>

    <!-- 操作提示 -->
    <view class="tips">
      <view class="tips-title">扫描PC端绑定二维码</view>
      <view class="steps">
        <view class="step">
          <view class="step-num">1</view>
          <view class="step-text">PC端登录CRM系统</view>
        </view>
        <view class="step">
          <view class="step-num">2</view>
          <view class="step-text">进入「通话管理」-「呼出配置」</view>
        </view>
        <view class="step">
          <view class="step-num">3</view>
          <view class="step-text">点击「工作手机」-「添加新手机」</view>
        </view>
        <view class="step">
          <view class="step-num">4</view>
          <view class="step-text">扫描显示的二维码完成绑定</view>
        </view>
      </view>
    </view>

    <!-- 重新扫码按钮 -->
    <view class="actions">
      <button class="btn-rescan" @tap="handleScan">重新扫码</button>
      <button class="btn-back" @tap="goBack">返回</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/stores/user'
import { bindDevice } from '@/api/auth'

const userStore = useUserStore()

onMounted(() => {
  // 页面加载后自动调用扫码
  setTimeout(() => {
    handleScan()
  }, 300)
})

onShow(() => {
  // 每次显示页面也自动扫码
})

// 扫码
const handleScan = () => {
  uni.scanCode({
    scanType: ['qrCode'],
    success: async (res) => {
      console.log('扫码结果:', res.result)
      await processQRCode(res.result)
    },
    fail: (err) => {
      console.error('扫码失败:', err)
      if (err.errMsg?.includes('cancel')) {
        // 用户取消扫码，不做处理
        return
      }
      uni.showToast({ title: '扫码失败，请重试', icon: 'none' })
    }
  })
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 处理二维码内容
const processQRCode = async (content: string) => {
  try {
    const data = JSON.parse(content)
    console.log('解析二维码数据:', data)

    // 检查是否是绑定二维码
    if (data.action !== 'bind_device' && data.type !== 'work_phone_bind') {
      uni.showToast({ title: '无效的二维码', icon: 'none' })
      return
    }

    // 检查是否过期
    if (data.expiresAt) {
      const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : new Date(data.expiresAt).getTime()
      if (Date.now() > expiresAt) {
        uni.showToast({ title: '二维码已过期，请重新生成', icon: 'none' })
        return
      }
    }

    // 获取设备信息
    const systemInfo = uni.getSystemInfoSync()
    const bindToken = data.token || data.connectionId

    uni.showLoading({ title: '绑定中...' })

    const result = await bindDevice({
      bindToken: bindToken,
      deviceInfo: {
        deviceId: systemInfo.deviceId || `device_${Date.now()}`,
        deviceName: systemInfo.deviceModel || '未知设备',
        deviceModel: systemInfo.deviceModel || '',
        osType: systemInfo.platform === 'ios' ? 'ios' : 'android',
        osVersion: systemInfo.system || '',
        appVersion: '1.0.0'
      }
    })

    uni.hideLoading()

    // 保存绑定信息
    userStore.setWsInfo(result.wsToken, result.wsUrl)
    userStore.setDeviceInfo({
      deviceId: result.deviceId,
      deviceName: systemInfo.deviceModel || '未知设备',
      deviceModel: systemInfo.deviceModel || '',
      osType: systemInfo.platform === 'ios' ? 'ios' : 'android',
      osVersion: systemInfo.system || '',
      appVersion: '1.0.0'
    })

    uni.showToast({ title: '绑定成功', icon: 'success' })

    // 绑定成功后立即尝试建立WebSocket连接
    const { wsService } = await import('@/services/websocket')
    console.log('[Scan] 绑定成功，立即建立WebSocket连接')
    wsService.connect()

    // 返回首页
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 1500)

  } catch (e: any) {
    uni.hideLoading()
    console.error('绑定失败:', e)
    uni.showToast({ title: e.message || '绑定失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.scan-page {
  min-height: 100vh;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
}

.scanning-area {
  height: 360rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.scan-icon {
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.scan-text {
  color: #999;
  font-size: 28rpx;
}

.tips {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  padding: 40rpx;
  margin: 0 24rpx;
  border-radius: 24rpx;
}

.tips-title {
  font-size: 34rpx;
  color: #fff;
  text-align: center;
  margin-bottom: 48rpx;
  font-weight: 600;
}

.steps {
  padding: 0 20rpx;
}

.step {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  margin-bottom: 36rpx;
}

.step-num {
  width: 48rpx;
  height: 48rpx;
  min-width: 48rpx;
  background: #34D399;
  color: #fff;
  border-radius: 50%;
  font-size: 28rpx;
  text-align: center;
  line-height: 48rpx;
  margin-right: 24rpx;
}

.step-text {
  font-size: 28rpx;
  color: #ccc;
  line-height: 48rpx;
}

.actions {
  padding: 40rpx 24rpx;
  display: flex;
  flex-direction: row;
}

.btn-rescan {
  flex: 1;
  height: 88rpx;
  background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
  margin-right: 20rpx;
}

.btn-back {
  width: 200rpx;
  height: 88rpx;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
  border: none;
}
</style>
