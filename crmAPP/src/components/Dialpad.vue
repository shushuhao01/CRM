<template>
  <view class="dialpad-container">
    <!-- 号码显示 -->
    <view class="display">
      <text class="number">{{ phoneNumber || '请输入号码' }}</text>
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
      <view class="action-btn delete" @tap="handleDelete">
        <text>⌫</text>
      </view>
      <view class="action-btn call" @tap="handleCall">
        <text>📞</text>
      </view>
      <view class="action-btn" @tap="handleClear">
        <text>✕</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'call', phone: string): void
  (e: 'close'): void
}>()

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
    uni.vibrateShort({ type: 'light' })
  }
}

const handleDelete = () => {
  phoneNumber.value = phoneNumber.value.slice(0, -1)
}

const handleClear = () => {
  phoneNumber.value = ''
}

const handleCall = () => {
  if (phoneNumber.value) {
    emit('call', phoneNumber.value)
  }
}
</script>

<style lang="scss" scoped>
.dialpad-container {
  padding: 32rpx;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;

  .display {
    text-align: center;
    padding: 40rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    margin-bottom: 32rpx;

    .number {
      font-size: 48rpx;
      font-weight: 500;
      letter-spacing: 4rpx;
      color: #1f2937;
    }
  }

  .keys {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20rpx;

    .key {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 120rpx;
      background: #f5f5f5;
      border-radius: 60rpx;

      &:active {
        background: #e0e0e0;
      }

      .key-main {
        font-size: 44rpx;
        font-weight: 500;
        color: #1f2937;
      }

      .key-sub {
        font-size: 20rpx;
        color: #999;
        margin-top: 4rpx;
      }
    }
  }

  .actions {
    display: flex;
    justify-content: space-around;
    align-items: center;
    margin-top: 40rpx;
    padding: 0 40rpx;

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
        width: 120rpx;
        height: 120rpx;
        background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
        box-shadow: 0 8rpx 24rpx rgba(52, 211, 153, 0.4);

        text {
          font-size: 48rpx;
        }
      }

      &.delete {
        background: #f5f5f5;

        &:active {
          background: #e0e0e0;
        }
      }
    }
  }
}
</style>
