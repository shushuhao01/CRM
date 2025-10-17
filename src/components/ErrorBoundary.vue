<template>
  <div class="error-boundary">
    <slot v-if="!hasError" />
    <div v-else class="error-content">
      <div class="error-icon">
        <el-icon size="64" color="#f56c6c">
          <WarningFilled />
        </el-icon>
      </div>
      <h3 class="error-title">{{ errorTitle }}</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <el-button @click="handleRetry" type="primary">
          <el-icon><Refresh /></el-icon>
          重试
        </el-button>
        <el-button @click="handleGoHome">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
      </div>
      <el-collapse v-if="showDetails" class="error-details">
        <el-collapse-item title="错误详情" name="details">
          <pre>{{ errorDetails }}</pre>
        </el-collapse-item>
      </el-collapse>
      <el-button 
        v-if="!showDetails" 
        @click="showDetails = true" 
        type="text" 
        size="small"
        class="show-details-btn"
      >
        显示详细信息
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { WarningFilled, Refresh, HomeFilled } from '@element-plus/icons-vue'
import { createSafeNavigator } from '@/utils/navigation'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showRetry?: boolean
  onRetry?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: '页面出现错误',
  fallbackMessage: '抱歉，页面遇到了一些问题，请稍后重试',
  showRetry: true
})

const router = useRouter()
const safeNavigator = createSafeNavigator(router)

const hasError = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')
const errorDetails = ref('')
const showDetails = ref(false)

// 捕获子组件错误
onErrorCaptured((error: Error, instance, info) => {
  console.error('ErrorBoundary captured error:', error, info)
  
  hasError.value = true
  errorTitle.value = props.fallbackTitle
  errorMessage.value = getErrorMessage(error)
  errorDetails.value = `${error.stack}\n\nComponent Info: ${info}`
  
  // 发送错误到监控系统
  reportError(error, info)
  
  return false // 阻止错误继续传播
})

// 获取用户友好的错误信息
const getErrorMessage = (error: Error): string => {
  if (error.message.includes('Network Error')) {
    return '网络连接失败，请检查网络设置后重试'
  }
  if (error.message.includes('timeout')) {
    return '请求超时，请稍后重试'
  }
  if (error.message.includes('401')) {
    return '登录已过期，请重新登录'
  }
  if (error.message.includes('403')) {
    return '没有权限访问此资源'
  }
  if (error.message.includes('404')) {
    return '请求的资源不存在'
  }
  if (error.message.includes('500')) {
    return '服务器内部错误，请稍后重试'
  }
  
  return props.fallbackMessage
}

// 上报错误到监控系统
const reportError = (error: Error, info: string) => {
  // 这里可以集成错误监控服务，如 Sentry
  const errorReport = {
    message: error.message,
    stack: error.stack,
    componentInfo: info,
    userAgent: navigator.userAgent,
    url: window.location.href,
    timestamp: new Date().toISOString()
  }
  
  // 发送到错误监控服务
  // errorMonitoringService.report(errorReport)
  console.error('Error Report:', errorReport)
}

// 重试操作
const handleRetry = () => {
  if (props.onRetry) {
    props.onRetry()
  } else {
    // 默认重新加载页面
    window.location.reload()
  }
}

// 返回首页
const handleGoHome = () => {
  safeNavigator.push('/dashboard')
  ElMessage.success('已返回首页')
}

// 重置错误状态
const resetError = () => {
  hasError.value = false
  errorTitle.value = ''
  errorMessage.value = ''
  errorDetails.value = ''
  showDetails.value = false
}

// 暴露方法给父组件
defineExpose({
  resetError
})
</script>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 40px 20px;
  text-align: center;
}

.error-icon {
  margin-bottom: 24px;
}

.error-title {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.error-message {
  margin: 0 0 32px 0;
  font-size: 16px;
  color: #606266;
  max-width: 500px;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.error-details {
  width: 100%;
  max-width: 800px;
  margin-top: 24px;
}

.error-details pre {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
}

.show-details-btn {
  margin-top: 16px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-content {
    padding: 20px 16px;
  }
  
  .error-title {
    font-size: 20px;
  }
  
  .error-message {
    font-size: 14px;
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
    max-width: 200px;
  }
}
</style>