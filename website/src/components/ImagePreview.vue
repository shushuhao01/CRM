<template>
  <!-- 全屏预览弹窗 -->
  <Teleport to="body">
    <div v-if="visible" class="preview-modal" @click="closePreview" @wheel.prevent="handleWheel">
      <div class="modal-content" @click.stop>
        <!-- 工具栏 -->
        <div class="toolbar">
          <button class="tool-btn" @click="zoomOut" title="缩小">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
          <button class="tool-btn" @click="zoomIn" title="放大">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <div class="toolbar-divider"></div>
          <button class="tool-btn" @click="resetZoom" title="重置">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          <button class="tool-btn" @click="fitToScreen" title="适应屏幕">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
          <div class="toolbar-divider"></div>
          <button class="tool-btn close" @click="closePreview" title="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- 图片容器 -->
        <div
          class="image-container"
          ref="containerRef"
          @mousedown="startDrag"
          @mousemove="onDrag"
          @mouseup="endDrag"
          @mouseleave="endDrag"
          :class="{ dragging: isDragging, 'can-drag': scale > 1 }"
        >
          <img
            :src="src"
            :alt="alt"
            class="preview-image"
            :style="imageStyle"
            @load="onImageLoad"
            draggable="false"
          />
        </div>

        <!-- 提示信息 -->
        <div class="preview-tips">
          <span>滚轮缩放</span>
          <span v-if="scale > 1">· 拖拽移动</span>
          <span>· ESC关闭</span>
        </div>

        <p v-if="caption" class="preview-caption">{{ caption }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  src: string
  alt?: string
  caption?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// 缩放相关
const scale = ref(1)
const minScale = 0.5
const maxScale = 5
const scaleStep = 0.25

// 拖拽相关
const isDragging = ref(false)
const translateX = ref(0)
const translateY = ref(0)
const startX = ref(0)
const startY = ref(0)
const lastTranslateX = ref(0)
const lastTranslateY = ref(0)

const containerRef = ref<HTMLElement | null>(null)

const imageStyle = computed(() => ({
  transform: `scale(${scale.value}) translate(${translateX.value / scale.value}px, ${translateY.value / scale.value}px)`,
  cursor: scale.value > 1 ? (isDragging.value ? 'grabbing' : 'grab') : 'default'
}))

// 缩放功能
const zoomIn = () => {
  if (scale.value < maxScale) {
    scale.value = Math.min(scale.value + scaleStep, maxScale)
  }
}

const zoomOut = () => {
  if (scale.value > minScale) {
    scale.value = Math.max(scale.value - scaleStep, minScale)
    // 缩小时重置位置
    if (scale.value <= 1) {
      translateX.value = 0
      translateY.value = 0
    }
  }
}

const resetZoom = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

const fitToScreen = () => {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

// 拖拽功能
const startDrag = (e: MouseEvent) => {
  if (scale.value <= 1) return
  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  lastTranslateX.value = translateX.value
  lastTranslateY.value = translateY.value
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  const deltaX = e.clientX - startX.value
  const deltaY = e.clientY - startY.value
  translateX.value = lastTranslateX.value + deltaX
  translateY.value = lastTranslateY.value + deltaY
}

const endDrag = () => {
  isDragging.value = false
}

// 图片加载完成
const onImageLoad = () => {
  // 可以在这里根据图片尺寸做一些初始化
}

const closePreview = () => {
  emit('update:visible', false)
  document.body.style.overflow = ''
  // 重置状态
  setTimeout(() => {
    scale.value = 1
    translateX.value = 0
    translateY.value = 0
  }, 200)
}

// 监听显示状态
watch(() => props.visible, (newVal) => {
  if (newVal) {
    document.body.style.overflow = 'hidden'
  }
})

// 监听 ESC 键关闭
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && props.visible) {
      closePreview()
    }
    // 快捷键
    if (props.visible) {
      if (e.key === '+' || e.key === '=') {
        zoomIn()
      } else if (e.key === '-') {
        zoomOut()
      } else if (e.key === '0') {
        resetZoom()
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.preview-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

// 工具栏
.toolbar {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.tool-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  &.close {
    &:hover {
      background: rgba(239, 68, 68, 0.8);
    }
  }
}

.zoom-level {
  min-width: 50px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
}

// 图片容器
.image-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  overflow: hidden;
  padding: 80px 40px 60px;

  &.can-drag {
    cursor: grab;
  }

  &.dragging {
    cursor: grabbing;
  }
}

.preview-image {
  max-width: 100%;
  max-height: calc(100vh - 160px);
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  transition: transform 0.1s ease;
  user-select: none;
}

// 提示信息
.preview-tips {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 20px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.preview-caption {
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  max-width: 80%;
}
</style>
