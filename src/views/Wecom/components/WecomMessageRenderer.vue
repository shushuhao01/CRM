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
      <el-alert type="warning" :closable="false" show-icon>
        <template #title>
          <span>消息渲染异常: {{ renderError }}</span>
        </template>
        <template #default>
          <div style="font-size:12px;color:#909399;margin-top:4px">
            <p>已加载 {{ msgList.length }} 条密钥，首条 msgid: {{ msgList[0]?.msgid?.slice(0, 20) }}...</p>
            <p v-for="err in errorDetails" :key="err" style="margin-top:2px">{{ err }}</p>
          </div>
        </template>
      </el-alert>
    </div>

    <!-- 调试信息（仅开发或有错误时显示） -->
    <div v-if="debugInfo && !loading" class="renderer-debug">
      <span>{{ debugInfo }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { useWecomOpenData } from '../composables/useWecomOpenData'

const props = defineProps<{
  msgList: Array<{ msgid: string; secretKey: string; fromUserName?: string; isSelf?: boolean; timeStr?: string; msgType?: string; avatarLetter?: string; avatar?: string }>
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'load-more'): void
  (e: 'error', error: any): void
}>()

const { isWecomReady, createMessageFrame, updateFrameData } = useWecomOpenData()

const containerRef = ref<HTMLElement | null>(null)
const renderError = ref('')
const errorDetails = ref<string[]>([])
const debugInfo = ref('')
const frameContainerId = `wecom-msg-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
let frameInstance: any = null
let mountedSuccessfully = false

const renderMessages = async () => {
  if (!isWecomReady.value || !props.msgList.length) return

  await nextTick()

  const container = document.getElementById(frameContainerId)
  if (!container) {
    renderError.value = `容器元素 #${frameContainerId} 未找到`
    return
  }

  debugInfo.value = `渲染中: ${props.msgList.length}条消息, 容器=${container.offsetWidth}x${container.offsetHeight}`

  if (frameInstance && mountedSuccessfully) {
    try {
      updateFrameData(frameInstance, props.msgList)
      debugInfo.value = `更新: ${props.msgList.length}条消息`
    } catch (e: any) {
      renderError.value = `更新消息数据失败: ${e.message}`
    }
  } else {
    frameInstance = null
    mountedSuccessfully = false
    container.innerHTML = ''

    frameInstance = createMessageFrame(container, props.msgList, {
      onError: (error: any) => {
        const errMsg = error?.detail?.errMsg || error?.detail?.errCode || error?.message || JSON.stringify(error)
        renderError.value = errMsg
        errorDetails.value.push(`[${new Date().toLocaleTimeString()}] ${errMsg}`)
        if (errorDetails.value.length > 5) errorDetails.value.shift()
        emit('error', error)
      },
      onMounted: () => {
        mountedSuccessfully = true
        renderError.value = ''
        debugInfo.value = `渲染成功: ${props.msgList.length}条消息`
        console.log('[WecomMessageRenderer] 消息帧挂载成功')
      }
    })
    if (!frameInstance) {
      renderError.value = '创建消息帧失败（factory.createOpenDataFrame 返回空）'
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
  mountedSuccessfully = false
})
</script>

<style scoped lang="scss">
.wecom-message-renderer {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.frame-container {
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;
}

.frame-container :deep(iframe) {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  display: block;
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
  flex-shrink: 0;
}

.renderer-debug {
  position: absolute;
  bottom: 4px;
  right: 8px;
  font-size: 11px;
  color: #c0c4cc;
  pointer-events: none;
}
</style>

<style lang="scss">
/* Global: SDK iframe 无 data-v scoping，需全局穿透 */
.frame-container iframe {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
  display: block;
}
</style>
