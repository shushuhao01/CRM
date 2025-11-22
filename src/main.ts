import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { useConfigStore } from './stores/config'
import { autoCheck } from './utils/deploymentCheck'
import { autoStatusSyncService } from './services/autoStatusSync'
import permissionPlugin from './plugins/permission'
import { setupDirectives } from './directives'

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

const app = createApp(App)

// Vue应用级错误处理
app.config.errorHandler = globalErrorHandler

// 警告处理器（开发环境）
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('Vue警告:', msg, trace)
  }
}

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())

// 初始化用户状态
const userStore = useUserStore()

// 检查localStorage是否可用
const checkLocalStorage = () => {
  try {
    const test = 'localStorage-test'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (error) {
    console.error('[App] localStorage不可用:', error)
    return false
  }
}

// 异步初始化用户状态，确保token验证完成后再挂载应用
const initializeApp = async () => {
  console.log('[App] 开始初始化应用...')
  
  // 等待DOM完全加载
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      window.addEventListener('load', resolve)
    })
  }
  
  // 检查localStorage可用性
  if (!checkLocalStorage()) {
    console.warn('[App] localStorage不可用，使用默认配置')
  }
  
  try {
    // 先初始化配置存储
    const configStore = useConfigStore()
    
    // 安全地初始化主题配置
    try {
      configStore.initTheme()
      console.log('[App] 主题配置初始化成功')
    } catch (error) {
      console.error('[App] 主题配置初始化失败:', error)
    }
    
    // 安全地初始化用户状态
    try {
      await userStore.initUser()
      console.log('[App] 用户状态初始化成功')
    } catch (error) {
      console.error('[App] 用户状态初始化失败:', error)
    }
    
    // 注册插件和组件
    app.use(router)
    app.use(ElementPlus)
    app.use(permissionPlugin)
    
    // 注册全局指令
    setupDirectives(app)
    
    // 挂载应用
    app.mount('#app')
    console.log('[App] 应用挂载成功')
    
    // 运行部署检查
    try {
      autoCheck()
    } catch (error) {
      console.error('[App] 部署检查失败:', error)
    }
    
  } catch (error) {
    console.error('[App] 应用初始化失败:', error)
    // 即使初始化失败，也要尝试挂载应用
    try {
      app.use(router)
      app.use(ElementPlus)
      app.mount('#app')
      console.log('[App] 应用已在错误恢复模式下挂载')
    } catch (mountError) {
      console.error('[App] 应用挂载失败:', mountError)
    }
  }
}

// 启动应用
initializeApp()
