<template>
  <div class="wecom-message-renderer" ref="containerRef">
    <!-- 加载中 -->
    <div v-if="loading" class="renderer-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载消息中...</span>
    </div>

    <!-- 无消息 -->
    <div v-else-if="!msgList.length" class="renderer-empty">
      <el-empty description="暂无消息记录" :image-size="80" />
    </div>

    <!-- 消息渲染容器（由企微SDK接管渲染） -->
    <div v-show="msgList.length > 0 && !loading"
         :id="frameContainerId"
         class="frame-container">
    </div>

    <!-- 渲染错误提示 -->
    <div v-if="renderError" class="renderer-error">
      <el-alert type="warning" :closable="false">
        <template #title>消息渲染异常: {{ renderError }}</template>
      </el-alert>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useWecomOpenData } from '../composables/useWecomOpenData'

const props = defineProps<{
  msgList: Array<{ msgid: string; secretKey: string }>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'load-more'): void
  (e: 'error', error: any): void
}>()

const { isWecomReady, createMessageFrame, updateFrameData } = useWecomOpenData()

const containerRef = ref<HTMLElement | null>(null)
const renderError = ref('')
const frameContainerId = `wecom-msg-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
let frameInstance: any = null

const renderMessages = async () => {
  if (!isWecomReady.value || !props.msgList.length) return

  await nextTick()

  if (frameInstance) {
    updateFrameData(frameInstance, props.msgList)
  } else {
    frameInstance = createMessageFrame(`#${frameContainerId}`, props.msgList, {
      onError: (error) => {
        renderError.value = error?.detail?.errMsg || error?.message || '渲染失败'
        emit('error', error)
      },
      onMounted: () => {
        renderError.value = ''
        console.log('[WecomMessageRenderer] 消息渲染成功')
      }
    })
    if (!frameInstance) {
      renderError.value = '创建消息帧失败'
      emit('error', new Error('createMessageFrame returned null'))
    }
  }
}

watch(() => props.msgList, (newList, oldList) => {
  if (newList.length > 0 && JSON.stringify(newList) !== JSON.stringify(oldList)) {
    renderMessages()
  }
}, { deep: true })

watch(isWecomReady, (ready) => {
  if (ready && props.msgList.length) {
    renderMessages()
  }
})

onMounted(() => {
  if (isWecomReady.value && props.msgList.length) {
    renderMessages()
  }
})

onBeforeUnmount(() => {
  frameInstance = null
})
</script>

<style scoped lang="scss">
.wecom-message-renderer {
  height: 100%;
  position: relative;
}

.frame-container {
  height: 100%;
  min-height: 300px;
}

.renderer-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: #909399;
  font-size: 14px;
}

.renderer-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.renderer-error {
  padding: 12px;
}
</style>
