import './assets/main.css'

import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import App from './App.vue'

// 全局错误处理器
const globalErrorHandler = (error: Error, instance?: any, info?: string) => {
  console.error('全局错误:', error, info)
  
  // 避免在错误处理中再次触发错误
  try {
    // 只在开发环境显示详细错误信息
    if (import.meta.env.DEV) {
      ElMessage.error(`应用错误: ${error.message}`)
    } else {
      ElMessage.error('应用出现错误，请刷新页面重试')
    }
  } catch (e) {
    console.error('错误处理器本身出错:', e)
  }
}

// 静默 ResizeObserver 警告
const resizeObserverErrorHandler = (e: ErrorEvent) => {
  if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
    e.stopImmediatePropagation()
    return false
  }
  return true
}

// 全局未捕获错误处理
window.addEventListener('error', (e) => {
  if (resizeObserverErrorHandler(e)) {
    globalErrorHandler(e.error || new Error(e.message))
  }
})

// 全局未捕获Promise错误处理
window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的Promise拒绝:', e.reason)
  globalErrorHandler(e.reason instanceof Error ? e.reason : new Error(String(e.reason)))
  e.preventDefault() // 阻止默认的错误处理
})

// 创建Vue应用
const app = createApp(App)

// Vue应用级错误处理
app.config.errorHandler = globalErrorHandler

// Vue应用级警告处理器
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue警告:', msg, trace)
}

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 使用Element Plus
app.use(ElementPlus)

// 确保DOM加载完成后再挂载应用
document.addEventListener('DOMContentLoaded', () => {
  try {
    app.mount('#app')
    console.log('Vue应用挂载成功')
  } catch (error) {
    console.error('应用挂载失败:', error)
    globalErrorHandler(error as Error)
  }
})