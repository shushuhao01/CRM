import { ref, onBeforeUnmount } from 'vue'

/**
 * 异步操作清理组合式函数
 * 用于管理组件中的异步操作，防止内存泄漏和组件卸载后的状态更新
 */
export function useAsyncCleanup() {
  // 组件卸载状态跟踪
  const isUnmounted = ref(false)
  
  // 超时ID跟踪，用于清理异步操作
  const timeoutIds = new Set<number>()
  
  // 请求控制器跟踪，用于取消网络请求
  const abortControllers = new Set<AbortController>()

  /**
   * 创建一个安全的异步操作包装器
   * @param asyncFn 异步函数
   * @returns 包装后的异步函数
   */
  const safeAsync = <T extends (...args: unknown[]) => Promise<unknown>>(asyncFn: T): T => {
    return ((...args: unknown[]) => {
      if (isUnmounted.value) {
        return Promise.resolve()
      }
      return asyncFn(...args)
    }) as T
  }

  /**
   * 创建一个安全的setTimeout
   * @param callback 回调函数
   * @param delay 延迟时间
   * @returns 超时ID
   */
  const safeSetTimeout = (callback: () => void, delay: number): number => {
    if (isUnmounted.value) {
      return 0
    }
    
    const timeoutId = setTimeout(() => {
      timeoutIds.delete(timeoutId)
      if (!isUnmounted.value) {
        callback()
      }
    }, delay)
    
    timeoutIds.add(timeoutId)
    return timeoutId
  }

  /**
   * 创建一个安全的Promise延迟
   * @param delay 延迟时间
   * @returns Promise
   */
  const safeDelay = (delay: number): Promise<void> => {
    return new Promise((resolve) => {
      safeSetTimeout(() => resolve(), delay)
    })
  }

  /**
   * 创建一个带有取消功能的fetch请求
   * @param url 请求URL
   * @param options 请求选项
   * @returns Promise
   */
  const safeFetch = (url: string, options: RequestInit = {}): Promise<Response> => {
    if (isUnmounted.value) {
      return Promise.reject(new Error('Component is unmounted'))
    }

    const controller = new AbortController()
    abortControllers.add(controller)

    const fetchOptions = {
      ...options,
      signal: controller.signal
    }

    return fetch(url, fetchOptions).finally(() => {
      abortControllers.delete(controller)
    })
  }

  /**
   * 检查组件是否已卸载
   * @returns 是否已卸载
   */
  const checkUnmounted = (): boolean => {
    return isUnmounted.value
  }

  /**
   * 手动清理所有异步操作
   */
  const cleanup = () => {
    isUnmounted.value = true
    
    // 清理所有超时操作
    timeoutIds.forEach(id => clearTimeout(id))
    timeoutIds.clear()
    
    // 取消所有网络请求
    abortControllers.forEach(controller => controller.abort())
    abortControllers.clear()
  }

  // 组件卸载时自动清理
  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    isUnmounted,
    timeoutIds,
    abortControllers,
    safeAsync,
    safeSetTimeout,
    safeDelay,
    safeFetch,
    checkUnmounted,
    cleanup
  }
}

/**
 * 异步操作状态管理组合式函数
 * 用于管理加载状态和错误处理
 */
export function useAsyncState() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const { isUnmounted, safeAsync } = useAsyncCleanup()

  /**
   * 执行异步操作并管理状态
   * @param asyncFn 异步函数
   * @param options 选项
   * @returns Promise
   */
  const execute = async <T>(
    asyncFn: () => Promise<T>,
    options: {
      showLoading?: boolean
      onSuccess?: (data: T) => void
      onError?: (err: Error) => void
    } = {}
  ): Promise<T | undefined> => {
    const { showLoading = true, onSuccess, onError } = options
    
    if (isUnmounted.value) return
    
    if (showLoading) loading.value = true
    error.value = null
    
    try {
      const result = await safeAsync(asyncFn)()
      
      if (!isUnmounted.value) {
        onSuccess?.(result)
        return result
      }
    } catch (err) {
      if (!isUnmounted.value) {
        const errorMessage = err instanceof Error ? err.message : '操作失败'
        error.value = errorMessage
        onError?.(err as Error)
      }
    } finally {
      if (!isUnmounted.value && showLoading) {
        loading.value = false
      }
    }
  }

  return {
    loading,
    error,
    execute,
    isUnmounted
  }
}