<template>
  <view class="audio-player">
    <view class="player-content">
      <view class="play-btn" @tap="togglePlay">
        <text>{{ isPlaying ? '⏸️' : '▶️' }}</text>
      </view>

      <view class="progress-section">
        <slider
          class="progress-slider"
          :value="progress"
          :max="100"
          activeColor="#34D399"
          backgroundColor="#E5E7EB"
          block-size="16"
          @change="onSeek"
        />
        <view class="time-info">
          <text>{{ formatTime(currentTime) }}</text>
          <text>{{ formatTime(duration) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

const props = defineProps<{
  src: string
}>()

const audioContext = ref<UniApp.InnerAudioContext | null>(null)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const progress = computed(() => {
  if (duration.value === 0) return 0
  return (currentTime.value / duration.value) * 100
})

// 初始化音频
const initAudio = () => {
  if (audioContext.value) return

  audioContext.value = uni.createInnerAudioContext()
  audioContext.value.src = props.src

  audioContext.value.onCanplay(() => {
    duration.value = audioContext.value?.duration || 0
  })

  audioContext.value.onTimeUpdate(() => {
    currentTime.value = audioContext.value?.currentTime || 0
  })

  audioContext.value.onEnded(() => {
    isPlaying.value = false
    currentTime.value = 0
  })

  audioContext.value.onError((err) => {
    console.error('音频播放错误:', err)
    uni.showToast({ title: '播放失败', icon: 'none' })
  })
}

// 播放/暂停
const togglePlay = () => {
  initAudio()

  if (isPlaying.value) {
    audioContext.value?.pause()
  } else {
    audioContext.value?.play()
  }
  isPlaying.value = !isPlaying.value
}

// 跳转
const onSeek = (e: any) => {
  if (!audioContext.value || duration.value === 0) return

  const seekTime = (e.detail.value / 100) * duration.value
  audioContext.value.seek(seekTime)
  currentTime.value = seekTime
}

// 格式化时间
const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  if (audioContext.value) {
    audioContext.value.destroy()
  }
})
</script>

<style lang="scss" scoped>
.audio-player {
  background: #f9fafb;
  border-radius: 16rpx;
  padding: 24rpx;

  .player-content {
    display: flex;
    align-items: center;
    gap: 20rpx;

    .play-btn {
      width: 80rpx;
      height: 80rpx;
      background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      text {
        font-size: 32rpx;
      }
    }

    .progress-section {
      flex: 1;

      .progress-slider {
        margin: 0;
      }

      .time-info {
        display: flex;
        justify-content: space-between;
        margin-top: 8rpx;

        text {
          font-size: 22rpx;
          color: #9ca3af;
        }
      }
    }
  }
}
</style>
