<template>
  <div v-if="visible" class="global-loading" :class="{ 'full-screen': fullScreen }">
    <div class="loading-backdrop" @click="handleBackdropClick"></div>
    <div class="loading-content">
      <!-- 现代化加载动画 -->
      <div class="loading-spinner">
        <div class="spinner-container">
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-ring"></div>
          <div class="spinner-dots">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      </div>
      <div v-if="text" class="loading-text">{{ text }}</div>
      <div v-if="showProgress && progress >= 0" class="loading-progress">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ progress }}%</span>
        </div>
      </div>
      <el-button 
        v-if="showCancel && onCancel" 
        @click="handleCancel"
        size="small"
        type="text"
        class="cancel-btn"
      >
        取消
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible?: boolean
  text?: string
  fullScreen?: boolean
  size?: number
  progress?: number
  showProgress?: boolean
  showCancel?: boolean
  cancelable?: boolean
  onCancel?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  text: '加载中...',
  fullScreen: true,
  size: 40,
  progress: -1,
  showProgress: false,
  showCancel: false,
  cancelable: false
})

const emit = defineEmits<{
  cancel: []
  backdropClick: []
}>()

// 处理背景点击
const handleBackdropClick = () => {
  if (props.cancelable) {
    emit('backdropClick')
  }
}

// 处理取消按钮点击
const handleCancel = () => {
  if (props.onCancel) {
    props.onCancel()
  }
  emit('cancel')
}
</script>

<style scoped>
.global-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;
}

.global-loading.full-screen {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(103, 194, 58, 0.1) 100%);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.loading-content {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 8px 16px rgba(0, 0, 0, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  min-width: 240px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideUp 0.4s ease-out;
}

.loading-spinner {
  margin-bottom: 24px;
}

.spinner-container {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 2px solid transparent;
  border-radius: 50%;
  animation: spin 2s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #409eff;
  animation-duration: 1.5s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #67c23a;
  animation-duration: 2s;
  animation-direction: reverse;
  width: 80%;
  height: 80%;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #e6a23c;
  animation-duration: 2.5s;
  width: 60%;
  height: 60%;
}

.spinner-dots {
  position: absolute;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dot {
  width: 4px;
  height: 4px;
  background: linear-gradient(45deg, #409eff, #67c23a);
  border-radius: 50%;
  margin: 0 1px;
  animation: pulse 1.5s ease-in-out infinite;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.loading-text {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 20px;
  text-align: center;
  letter-spacing: 0.5px;
}

.loading-progress {
  width: 220px;
  margin-bottom: 20px;
}

.progress-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(64, 158, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-text {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  letter-spacing: 0.5px;
}

.cancel-btn {
  color: #909399;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
  transform: translateY(-1px);
}

/* 非全屏模式 */
.global-loading:not(.full-screen) {
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

.global-loading:not(.full-screen) .loading-content {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.98);
  padding: 32px;
  border-radius: 16px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .loading-content {
    padding: 32px 24px;
    min-width: 200px;
    border-radius: 16px;
  }
  
  .loading-progress {
    width: 180px;
  }
  
  .spinner-container {
    width: 50px;
    height: 50px;
  }
  
  .loading-text {
    font-size: 15px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .global-loading.full-screen {
    background: linear-gradient(135deg, rgba(64, 158, 255, 0.15) 0%, rgba(103, 194, 58, 0.15) 100%);
  }
  
  .loading-content {
    background: rgba(30, 30, 30, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .loading-text {
    color: #e5e7eb;
  }
  
  .progress-text {
    color: #9ca3af;
  }
}
</style>