<template>
  <div class="wecom-header">
    <span class="wecom-header-title"><slot /></span>
    <div class="wecom-header-actions">
      <slot name="actions" />
      <template v-if="!isStandalone">
        <el-tooltip content="全屏模式" placement="top">
          <el-button link @click="toggleFullscreen">
            <el-icon :size="16"><FullScreen v-if="!isFullscreen" /><Close v-else /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="独立窗口" placement="top">
          <el-button link @click="openStandalone">
            <el-icon :size="16"><TopRight /></el-icon>
          </el-button>
        </el-tooltip>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomHeader' })
import { ref, inject, onMounted, onUnmounted } from 'vue'
import { FullScreen, TopRight, Close } from '@element-plus/icons-vue'

// 独立窗口模式下隐藏全屏/独立窗口按钮
const isStandalone = inject('isWecomStandalone', false)

const props = defineProps<{
  tabName?: string
}>()

const isFullscreen = ref(false)

/** 切换全屏模式 */
const toggleFullscreen = async () => {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen()
      document.body.classList.add('wecom-fullscreen')
      isFullscreen.value = true
    } catch (e) {
      console.warn('[WecomHeader] Fullscreen request failed:', e)
    }
  } else {
    try {
      await document.exitFullscreen()
      document.body.classList.remove('wecom-fullscreen')
      isFullscreen.value = false
    } catch (e) {
      console.warn('[WecomHeader] Exit fullscreen failed:', e)
    }
  }
}

/** 打开独立窗口 */
const openStandalone = () => {
  const tab = props.tabName || 'config'
  window.open(
    `/wecom-standalone?tab=${tab}`,
    '_blank',
    'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no'
  )
}

/** 监听全屏状态变化 */
const handleFullscreenChange = () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('wecom-fullscreen')
    isFullscreen.value = false
  }
}

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange)
  // 确保退出时清理 class
  document.body.classList.remove('wecom-fullscreen')
})
</script>

<style scoped>
.wecom-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.wecom-header-title {
  font-weight: 600;
  font-size: 16px;
  color: #1F2937;
}
.wecom-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>

