import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'

interface LoadingState {
  id: string
  text: string
  progress?: number
  cancelable?: boolean
  onCancel?: () => void
}

interface ErrorState {
  id: string
  title: string
  message: string
  type: 'error' | 'warning' | 'info'
  duration?: number
  showClose?: boolean
  onClose?: () => void
}

export const useAppStore = defineStore('app', () => {
  // 加载状态管理
  const loadingStates = ref<Map<string, LoadingState>>(new Map())
  const globalLoading = ref(false)
  const globalLoadingText = ref('加载中...')
  const globalLoadingProgress = ref(-1)

  // 错误状态管理
  const errors = ref<Map<string, ErrorState>>(new Map())
  
  // 网络状态
  const isOnline = ref(navigator.onLine)
  
  // 计算属性
  const hasLoading = computed(() => loadingStates.value.size > 0 || globalLoading.value)
  const hasErrors = computed(() => errors.value.size > 0)
  const loadingCount = computed(() => loadingStates.value.size)

  // 加载状态方法
  const showLoading = (options: {
    id?: string
    text?: string
    progress?: number
    cancelable?: boolean
    onCancel?: () => void
  } = {}) => {
    const id = options.id || `loading_${Date.now()}_${Math.random()}`
    
    if (options.id === 'global') {
      globalLoading.value = true
      globalLoadingText.value = options.text || '加载中...'
      globalLoadingProgress.value = options.progress || -1
      return id
    }
    
    loadingStates.value.set(id, {
      id,
      text: options.text || '加载中...',
      progress: options.progress,
      cancelable: options.cancelable,
      onCancel: options.onCancel
    })
    
    return id
  }

  const hideLoading = (id?: string) => {
    if (!id) {
      // 清除所有加载状态
      loadingStates.value.clear()
      globalLoading.value = false
      return
    }
    
    if (id === 'global') {
      globalLoading.value = false
      globalLoadingText.value = '加载中...'
      globalLoadingProgress.value = -1
      return
    }
    
    loadingStates.value.delete(id)
  }

  const updateLoadingProgress = (id: string, progress: number) => {
    if (id === 'global') {
      globalLoadingProgress.value = progress
      return
    }
    
    const loading = loadingStates.value.get(id)
    if (loading) {
      loading.progress = progress
      loadingStates.value.set(id, loading)
    }
  }

  // 错误处理方法
  const showError = (options: {
    id?: string
    title?: string
    message: string
    type?: 'error' | 'warning' | 'info'
    duration?: number
    showClose?: boolean
    onClose?: () => void
  }) => {
    const id = options.id || `error_${Date.now()}_${Math.random()}`
    
    const errorState: ErrorState = {
      id,
      title: options.title || '错误',
      message: options.message,
      type: options.type || 'error',
      duration: options.duration,
      showClose: options.showClose,
      onClose: options.onClose
    }
    
    errors.value.set(id, errorState)
    
    // 显示通知
    if (options.type === 'error') {
      ElNotification.error({
        title: errorState.title,
        message: errorState.message,
        duration: options.duration || 4500,
        showClose: options.showClose !== false,
        onClose: () => {
          hideError(id)
          options.onClose?.()
        }
      })
    } else if (options.type === 'warning') {
      ElNotification.warning({
        title: errorState.title,
        message: errorState.message,
        duration: options.duration || 4500,
        showClose: options.showClose !== false,
        onClose: () => {
          hideError(id)
          options.onClose?.()
        }
      })
    } else {
      ElNotification.info({
        title: errorState.title,
        message: errorState.message,
        duration: options.duration || 4500,
        showClose: options.showClose !== false,
        onClose: () => {
          hideError(id)
          options.onClose?.()
        }
      })
    }
    
    return id
  }

  const hideError = (id: string) => {
    errors.value.delete(id)
  }

  const clearErrors = () => {
    errors.value.clear()
  }

  // 网络状态方法
  const setOnlineStatus = (status: boolean) => {
    const wasOffline = !isOnline.value
    isOnline.value = status
    
    if (status && wasOffline) {
      ElMessage.success('网络连接已恢复')
    } else if (!status) {
      ElMessage.warning('网络连接已断开')
    }
  }

  // API请求包装器
  const withLoading = async <T>(
    promise: Promise<T>,
    options: {
      loadingId?: string
      loadingText?: string
      errorTitle?: string
      showError?: boolean
    } = {}
  ): Promise<T> => {
    const loadingId = showLoading({
      id: options.loadingId,
      text: options.loadingText
    })
    
    try {
      const result = await promise
      return result
    } catch (error: unknown) {
      if (options.showError !== false) {
        const errorMessage = error instanceof Error ? error.message : '未知错误'
        showError({
          title: options.errorTitle || '操作失败',
          message: errorMessage,
          type: 'error'
        })
      }
      throw error
    } finally {
      hideLoading(loadingId)
    }
  }

  // 重试机制
  const withRetry = async <T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number
      delay?: number
      onRetry?: (attempt: number, error: unknown) => void
    } = {}
  ): Promise<T> => {
    const maxRetries = options.maxRetries || 3
    const delay = options.delay || 1000
    
    let lastError: unknown
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          break
        }
        
        options.onRetry?.(attempt, error)
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }
    
    throw lastError
  }

  // 监听网络状态
  const initNetworkListener = () => {
    window.addEventListener('online', () => setOnlineStatus(true))
    window.addEventListener('offline', () => setOnlineStatus(false))
  }

  // 清理方法
  const cleanup = () => {
    loadingStates.value.clear()
    errors.value.clear()
    globalLoading.value = false
  }

  return {
    // 状态
    loadingStates,
    globalLoading,
    globalLoadingText,
    globalLoadingProgress,
    errors,
    isOnline,
    
    // 计算属性
    hasLoading,
    hasErrors,
    loadingCount,
    
    // 方法
    showLoading,
    hideLoading,
    updateLoadingProgress,
    showError,
    hideError,
    clearErrors,
    setOnlineStatus,
    withLoading,
    withRetry,
    initNetworkListener,
    cleanup
  }
})