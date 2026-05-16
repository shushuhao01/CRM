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
        <template #title>消息渲染异常</template>
        {{ renderError }}
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
const frameContainerId = `wecom-msg-frame-${Date.now()}`
let frameInstance: any = null

/**
 * 初始化或更新消息帧
 */
const renderMessages = async () => {
  if (!isWecomReady.value || !props.msgList.length) return

  await nextTick()

  if (frameInstance) {
    // 更新已有帧的数据
    updateFrameData(frameInstance, props.msgList)
  } else {
    // 创建新帧
    frameInstance = createMessageFrame(`#${frameContainerId}`, props.msgList, {
      onError: (error) => {
        renderError.value = error?.detail?.errMsg || '消息渲染失败'
        emit('error', error)
      },
      onMounted: () => {
        renderError.value = ''
      },
      onModal: (event) => {
        // 创建预览弹窗
        const iframe = document.createElement('iframe')
        iframe.src = event.modalUrl
        const width = event.modalSize?.width || 800
        const height = event.modalSize?.height || 600
        iframe.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:${Math.min(width, window.innerWidth * 0.9)}px;height:${Math.min(height, window.innerHeight * 0.9)}px;z-index:9999;border:none;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);`
        const mask = document.createElement('div')
        mask.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9998;cursor:pointer;'
        mask.onclick = () => { document.body.removeChild(iframe); document.body.removeChild(mask) }
        document.body.appendChild(mask)
        document.body.appendChild(iframe)
        return false
      }
    })
  }
}

// 监听消息列表变化
watch(() => props.msgList, () => {
  renderMessages()
}, { deep: true })

// 监听SDK就绪状态
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
