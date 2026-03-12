<template>
  <view class="dialpad-page">
    <view class="header">
      <text class="title">拨号</text>
    </view>

    <!-- 号码显示 -->
    <view class="display">
      <text class="number" :class="{ placeholder: !phoneNumber }">
        {{ phoneNumber || '请输入号码' }}
      </text>
    </view>

    <!-- 数字键盘 -->
    <view class="keys">
      <view
        v-for="key in keys"
        :key="key.value"
        class="key"
        @tap="handleKeyPress(key.value)"
      >
        <text class="key-main">{{ key.value }}</text>
        <text v-if="key.sub" class="key-sub">{{ key.sub }}</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <view class="action-btn" />
      <view class="action-btn call" :class="{ disabled: !phoneNumber }" @tap="handleCall">
        <text>📞</text>
      </view>
      <view class="action-btn delete" @tap="handleDelete" v-if="phoneNumber">
        <text>⌫</text>
      </view>
      <view class="action-btn" v-else />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { makePhoneCall, vibrate } from '@/utils/device'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const phoneNumber = ref('')

const keys = [
  { value: '1', sub: '' },
  { value: '2', sub: 'ABC' },
  { value: '3', sub: 'DEF' },
  { value: '4', sub: 'GHI' },
  { value: '5', sub: 'JKL' },
  { value: '6', sub: 'MNO' },
  { value: '7', sub: 'PQRS' },
  { value: '8', sub: 'TUV' },
  { value: '9', sub: 'WXYZ' },
  { value: '*', sub: '' },
  { value: '0', sub: '+' },
  { value: '#', sub: '' }
]

const handleKeyPress = (value: string) => {
  if (phoneNumber.value.length < 15) {
    phoneNumber.value += value
    vibrate('short')
  }
}

const handleDelete = () => {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

const handleCall = async () => {
  if (!phoneNumber.value) return

  // 生成通话ID
  const callId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = new Date().toISOString()

  // 保存当前通话信息
  uni.setStorageSync('currentCall', {
    callId,
    phoneNumber: phoneNumber.value,
    customerName: '手动拨号',
    customerId: '',
    startTime,
    isManualDial: true
  })

  // 调用系统拨号
  const success = await makePhoneCall(phoneNumber.value)

  if (success) {
    // 跳转到通话中页面
    uni.navigateTo({
      url: `/pages/calling/index?callId=${callId}&name=${encodeURIComponent('手动拨号')}&phone=${phoneNumber.value}&isManual=true`
    })
  } else {
    uni.showToast({ title: '拨号失败', icon: 'none' })
    uni.removeStorageSync('currentCall')
  }
}
</script>

<style lang="scss" scoped>
.dialpad-page {
  min-height: 100vh;
  background: #fff;
  display: flex;
  flex-direction: column;
  padding: 32rpx;
  padding-bottom: 80rpx;

  .header {
    text-align: center;
    padding: 20rpx 0;

    .title {
      font-size: 36rpx;
      font-weight: 600;
      color: #1f2937;
    }
  }

  .display {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200rpx;

    .number {
      font-size: 56rpx;
      font-weight: 300;
      letter-spacing: 4rpx;
      color: #1f2937;

      &.placeholder {
        color: #d1d5db;
        font-size: 36rpx;
      }
    }
  }

  .keys {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24rpx;
    padding: 0 20rpx;

    .key {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 130rpx;
      background: #f9fafb;
      border-radius: 65rpx;
      transition: background 0.1s;

      &:active {
        background: #e5e7eb;
      }

      .key-main {
        font-size: 48rpx;
        font-weight: 400;
        color: #1f2937;
      }

      .key-sub {
        font-size: 18rpx;
        color: #9ca3af;
        margin-top: 4rpx;
        letter-spacing: 2rpx;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 48rpx;
    padding: 0 60rpx;

    .action-btn {
      width: 100rpx;
      height: 100rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;

      text {
        font-size: 40rpx;
      }

      &.call {
        width: 140rpx;
        height: 140rpx;
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        box-shadow: 0 8rpx 32rpx rgba(52, 211, 153, 0.4);

        text {
          font-size: 56rpx;
        }

        &.disabled {
          opacity: 0.5;
        }

        &:active:not(.disabled) {
          transform: scale(0.95);
        }
      }

      &.delete {
        background: #f3f4f6;

        &:active {
          background: #e5e7eb;
        }
      }
    }
  }
}
</style>
