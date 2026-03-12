<template>
  <view class="call-ended-page">
    <!-- 通话信息 -->
    <view class="call-info">
      <view class="status-icon">{{ isEditMode ? '📝' : callResultIcon }}</view>
      <text class="title">{{ isEditMode ? '添加跟进记录' : '通话已结束' }}</text>
      <text class="customer-name">{{ customerName || '未知客户' }}</text>

      <view class="stats" v-if="!isEditMode">
        <view class="stat-item">
          <text class="label">通话时长</text>
          <text class="value">{{ formatDuration(duration) }}</text>
        </view>
      </view>
    </view>

    <!-- 通话结果确认（非编辑模式） -->
    <view class="section" v-if="!isEditMode">
      <text class="section-title">通话结果</text>
      <view class="result-options">
        <view
          class="result-option"
          :class="{ active: callResult === 'connected' }"
          @tap="callResult = 'connected'"
        >
          <text class="result-icon">✅</text>
          <text class="result-text">已接通</text>
          <text class="result-desc">与客户正常通话</text>
        </view>
        <view
          class="result-option"
          :class="{ active: callResult === 'no_answer' }"
          @tap="callResult = 'no_answer'"
        >
          <text class="result-icon">📵</text>
          <text class="result-text">无人接听</text>
          <text class="result-desc">响铃后无人接听</text>
        </view>
        <view
          class="result-option"
          :class="{ active: callResult === 'busy' }"
          @tap="callResult = 'busy'"
        >
          <text class="result-icon">📞</text>
          <text class="result-text">忙线/拒接</text>
          <text class="result-desc">对方忙线或拒接</text>
        </view>
        <view
          class="result-option"
          :class="{ active: callResult === 'invalid' }"
          @tap="callResult = 'invalid'"
        >
          <text class="result-icon">❌</text>
          <text class="result-text">号码无效</text>
          <text class="result-desc">空号/停机/欠费</text>
        </view>
      </view>
    </view>

    <!-- 通话备注（接通时或编辑模式显示） -->
    <view class="section" v-if="callResult === 'connected' || isEditMode">
      <text class="section-title">添加通话备注</text>
      <textarea
        v-model="notes"
        placeholder="记录通话要点..."
        :maxlength="500"
        class="notes-input"
      />
    </view>

    <!-- 快捷标签（接通时或编辑模式显示） -->
    <view class="section" v-if="callResult === 'connected' || isEditMode">
      <text class="section-title">快捷标签</text>
      <view class="tags">
        <view
          v-for="tag in quickTags"
          :key="tag"
          class="tag"
          :class="{ active: selectedTags.includes(tag) }"
          @tap="toggleTag(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- 客户意向（接通时或编辑模式显示） -->
    <view class="section" v-if="callResult === 'connected' || isEditMode">
      <text class="section-title">客户意向</text>
      <view class="intentions">
        <view
          v-for="item in intentions"
          :key="item.value"
          class="intention"
          :class="{ active: intention === item.value }"
          @tap="intention = item.value"
        >
          {{ item.label }}
        </view>
      </view>
    </view>

    <!-- 下次跟进 -->
    <view class="section" v-if="followUpRequired">
      <text class="section-title">下次跟进时间</text>
      <picker mode="date" :value="nextFollowUpDate" @change="onDateChange">
        <view class="date-picker">
          {{ nextFollowUpDate || '选择日期' }}
        </view>
      </picker>
    </view>

    <view class="follow-switch">
      <text>需要后续跟进</text>
      <switch :checked="followUpRequired" @change="followUpRequired = ($event as any).detail.value" color="#34D399" />
    </view>

    <!-- 操作按钮 -->
    <view class="actions">
      <button class="btn-save" @tap="handleSave" :loading="saving">
        保存并返回
      </button>
      <button class="btn-skip" @tap="handleSkip">
        跳过
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { submitCallFollowup, reportCallEnd } from '@/api/call'
import { wsService } from '@/services/websocket'

const callId = ref('')
const phoneNumber = ref('')
const customerName = ref('')
const customerId = ref('')
const duration = ref(0)
const hasRecording = ref(false)
const isEditMode = ref(false) // 是否是编辑模式（从详情页进入）

// 通话结果
const callResult = ref<'connected' | 'no_answer' | 'busy' | 'invalid'>('connected')

const notes = ref('')
const selectedTags = ref<string[]>([])
const intention = ref('')
const followUpRequired = ref(false)
const nextFollowUpDate = ref('')
const saving = ref(false)

const quickTags = ['意向高', '需报价', '再联系', '已成交', '无意向', '竞品客户']
const intentions = [
  { label: '很有意向', value: 'high' },
  { label: '一般', value: 'medium' },
  { label: '较低', value: 'low' },
  { label: '暂无', value: 'none' }
]

// 通话结果图标
const callResultIcon = computed(() => {
  const icons: Record<string, string> = {
    connected: '✅',
    no_answer: '📵',
    busy: '📞',
    invalid: '❌'
  }
  return icons[callResult.value] || '📞'
})

onLoad((options: any) => {
  console.log('[CallEnded] onLoad options:', options)

  callId.value = options?.callId || ''
  phoneNumber.value = options?.phone || ''
  customerName.value = decodeURIComponent(options?.name || '') || '未知客户'
  customerId.value = options?.customerId || ''
  duration.value = parseInt(options?.duration) || 0
  hasRecording.value = options?.hasRecording === 'true'
  isEditMode.value = options?.isEdit === 'true'

  console.log('[CallEnded] Parsed params:', {
    callId: callId.value,
    customerName: customerName.value,
    isEditMode: isEditMode.value
  })

  // 设置页面标题
  if (isEditMode.value) {
    uni.setNavigationBarTitle({ title: '添加跟进记录' })
  } else {
    uni.setNavigationBarTitle({ title: '通话记录' })
  }

  // 根据通话时长预设结果
  if (duration.value > 10) {
    callResult.value = 'connected'
  }
})

// 切换标签
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// 选择日期
const onDateChange = (e: any) => {
  nextFollowUpDate.value = e.detail.value
}

// 格式化时长
const formatDuration = (seconds: number) => {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}分${sec}秒`
}

// 保存
const handleSave = async () => {
  saving.value = true

  try {
    if (callId.value) {
      // 编辑模式下只提交跟进记录，不上报通话结束
      if (!isEditMode.value) {
        // 映射通话结果到后端状态
        const statusMap: Record<string, string> = {
          connected: 'connected',
          no_answer: 'missed',
          busy: 'busy',
          invalid: 'failed'
        }

        const finalStatus = statusMap[callResult.value]
        const finalDuration = callResult.value === 'connected' ? duration.value : 0

        // 通过WebSocket通知CRM端通话结束
        wsService.reportCallEnd(callId.value, {
          status: finalStatus,
          endTime: new Date().toISOString(),
          duration: finalDuration,
          hasRecording: hasRecording.value,
          endReason: 'user_submit'
        })

        // 上报通话结束状态到API
        await reportCallEnd({
          callId: callId.value,
          status: finalStatus as any,
          endTime: new Date().toISOString(),
          duration: finalDuration,
          hasRecording: hasRecording.value
        })
      }

      // 提交跟进记录（无论是否接通都可以添加备注）
      if (notes.value || selectedTags.value.length > 0 || intention.value || followUpRequired.value) {
        await submitCallFollowup({
          callId: callId.value,
          notes: notes.value || (isEditMode.value ? '' : `通话结果: ${getResultText(callResult.value)}`),
          tags: selectedTags.value,
          intention: intention.value as any || undefined,
          followUpRequired: followUpRequired.value,
          nextFollowUpDate: nextFollowUpDate.value ? `${nextFollowUpDate.value}T09:00:00` : undefined,
          customerId: customerId.value || undefined
        })
      }
    }

    // 清除当前通话记录（非编辑模式）
    if (!isEditMode.value) {
      uni.removeStorageSync('currentCall')
      uni.removeStorageSync('lastEndedCall')
    }

    uni.showToast({ title: '保存成功', icon: 'success' })

    // 通知其他页面刷新数据
    uni.$emit('call:completed')

    setTimeout(() => {
      if (isEditMode.value) {
        // 编辑模式返回上一页
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
    }, 1000)
  } catch (e: any) {
    console.error('保存失败:', e)
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

// 获取结果文本
const getResultText = (result: string) => {
  const map: Record<string, string> = {
    connected: '已接通',
    no_answer: '无人接听',
    busy: '忙线/拒接',
    invalid: '号码无效'
  }
  return map[result] || result
}

// 跳过
const handleSkip = () => {
  if (isEditMode.value) {
    // 编辑模式直接返回
    uni.navigateBack()
  } else {
    // 清除当前通话记录
    uni.removeStorageSync('currentCall')
    // 通知其他页面刷新数据
    uni.$emit('call:completed')
    uni.switchTab({ url: '/pages/index/index' })
  }
}
</script>

<style lang="scss" scoped>
.call-ended-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 240rpx;
  width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;

  .call-info {
    background: #fff;
    border-radius: 24rpx;
    padding: 48rpx 32rpx;
    text-align: center;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);

    .status-icon {
      font-size: 80rpx;
      margin-bottom: 16rpx;
    }

    .title {
      font-size: 36rpx;
      font-weight: 600;
      color: #1F2937;
      display: block;
      margin-bottom: 16rpx;
    }

    .customer-name {
      font-size: 32rpx;
      color: #1F2937;
      display: block;
    }

    .stats {
      display: flex;
      justify-content: center;
      margin-top: 32rpx;
      padding-top: 32rpx;
      border-top: 1rpx solid #f0f0f0;

      .stat-item {
        text-align: center;

        .label {
          font-size: 24rpx;
          color: #6B7280;
          display: block;
        }

        .value {
          font-size: 32rpx;
          color: #1F2937;
          font-weight: 600;
          margin-top: 8rpx;
          display: block;
        }
      }
    }
  }

  .section {
    margin-bottom: 24rpx;

    .section-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1F2937;
      margin-bottom: 16rpx;
      display: block;
    }
  }

  .result-options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16rpx;
  }

  .result-option {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    text-align: center;
    border: 2rpx solid #f0f0f0;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);

    &.active {
      border-color: #34D399;
      background: rgba(52, 211, 153, 0.05);
    }

    .result-icon {
      font-size: 40rpx;
      display: block;
      margin-bottom: 12rpx;
    }

    .result-text {
      font-size: 28rpx;
      color: #1F2937;
      font-weight: 500;
      display: block;
    }

    .result-desc {
      font-size: 22rpx;
      color: #6B7280;
      display: block;
      margin-top: 8rpx;
    }
  }

  .notes-input {
    width: 100%;
    height: 200rpx;
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    font-size: 28rpx;
    color: #1F2937;
    box-sizing: border-box;
    border: 1rpx solid #f0f0f0;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;

    .tag {
      padding: 16rpx 28rpx;
      background: #fff;
      border-radius: 32rpx;
      font-size: 26rpx;
      color: #6B7280;
      border: 2rpx solid #e5e7eb;

      &.active {
        background: rgba(52, 211, 153, 0.1);
        color: #34D399;
        border-color: #34D399;
      }
    }
  }

  .intentions {
    display: flex;
    gap: 16rpx;

    .intention {
      flex: 1;
      padding: 20rpx;
      background: #fff;
      border-radius: 12rpx;
      text-align: center;
      font-size: 26rpx;
      color: #6B7280;
      border: 2rpx solid #e5e7eb;

      &.active {
        background: rgba(52, 211, 153, 0.1);
        color: #34D399;
        border-color: #34D399;
      }
    }
  }

  .date-picker {
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
    color: #1F2937;
    border: 1rpx solid #f0f0f0;
  }

  .follow-switch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #fff;
    border-radius: 12rpx;
    padding: 24rpx;
    margin-bottom: 24rpx;

    text {
      font-size: 28rpx;
      color: #1F2937;
    }
  }

  .actions {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 24rpx 32rpx;
    padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
    background: #fff;
    box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);

    button {
      width: 100%;
      height: 88rpx;
      border-radius: 20rpx;
      font-size: 30rpx;
      margin-bottom: 16rpx;
      border: none;

      &.btn-save {
        background: linear-gradient(135deg, #6EE7B7 0%, #34D399 100%);
        color: #fff;
      }

      &.btn-skip {
        background: transparent;
        color: #6B7280;
      }
    }
  }
}
</style>
