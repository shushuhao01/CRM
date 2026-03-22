import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { useConfigStore } from './stores/config'
import { autoCheck } from './utils/deploymentCheck'
import { autoStatusSyncService } from './services/autoStatusSync'
import { setupDirectives } from './directives'
import { initSecureConsoleConfig } from './utils/secureLogger'

// 🔥 防止重复弹窗的标志
let isShowingGlobalErrorDialog = false

// 🔥 检查是否是动态导入失败错误
const isDynamicImportError = (error: Error | string): boolean => {
  const errorMsg = typeof error === 'string' ? error : error.message
  return errorMsg && (
    errorMsg.includes('error loading dynamically imported module') ||
    errorMsg.includes('Failed to fetch dynamically imported module') ||
    errorMsg.includes('Loading chunk') ||
    errorMsg.includes('ChunkLoadError') ||
    errorMsg.includes('Importing a module script failed')
  )
}

// 🔥 处理动态导入失败
const handleDynamicImportError = () => {
  if (isShowingGlobalErrorDialog) return
  isShowingGlobalErrorDialog = true

  // 🔥 检查是否在公开页面，公开页面不需要登录验证
  const currentPath = window.location.pathname
  const publicPaths = ['/login', '/public-help', '/register', '/agreement']
  const isPublicPage = publicPaths.some(path => currentPath.startsWith(path))

  // 检查 token 状态
  const savedToken = localStorage.getItem('auth_token')

  if (!savedToken && !isPublicPage) {
    // Token 已被清除且不在公开页面，说明是登录过期
    ElMessageBox.alert(
      '您的登录已过期，请重新登录。',
      '登录已过期',
      {
        confirmButtonText: '重新登录',
        type: 'warning',
        showClose: false,
        closeOnClickModal: false
      }
    ).then(() => {
      window.location.href = '/login'
    }).catch(() => {
      window.location.href = '/login'
    }).finally(() => {
      isShowingGlobalErrorDialog = false
    })
  } else if (!isPublicPage) {
    // 可能是版本更新导致的（非公开页面）
    ElMessageBox.alert(
      '系统检测到版本更新或页面缓存过期，需要刷新页面以加载最新内容。',
      '页面需要刷新',
      {
        confirmButtonText: '立即刷新',
        type: 'info',
        showClose: false,
        closeOnClickModal: false
      }
    ).then(() => {
      window.location.reload()
    }).catch(() => {
      window.location.reload()
    }).finally(() => {
      isShowingGlobalErrorDialog = false
    })
  } else {
    // 公开页面，静默处理
    console.log('[Main] 公开页面动态导入失败，静默处理')
    isShowingGlobalErrorDialog = false
  }
}

// 全局错误处理器
const globalErrorHandler = (error: Error, instance?: any, info?: string) => {
  console.error('全局错误:', error, info)

  // 🔥 检查是否是动态导入失败
  if (isDynamicImportError(error)) {
    handleDynamicImportError()
    return
  }

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
  // 🔥 检查是否是动态导入失败
  if (isDynamicImportError(e.message || e.error?.message || '')) {
    e.preventDefault()
    handleDynamicImportError()
    return
  }

  if (resizeObserverErrorHandler(e)) {
    globalErrorHandler(e.error || new Error(e.message))
  }
})

// 全局未捕获Promise错误处理
window.addEventListener('unhandledrejection', (e) => {
  const errorMsg = e.reason?.message || String(e.reason)

  // 🔥 检查是否是动态导入失败
  if (isDynamicImportError(errorMsg)) {
    e.preventDefault()
    handleDynamicImportError()
    return
  }

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

    // 🔥 公开页面检查
    const isPublicPage = window.location.pathname.startsWith('/public-help')

    // 初始化安全控制台配置（从服务器获取）- 公开页面跳过
    if (!isPublicPage) {
      try {
        await initSecureConsoleConfig()
        console.log('[App] 安全控制台配置初始化完成')
      } catch (error) {
        console.error('[App] 安全控制台初始化失败:', error)
      }
    }

    // 安全地初始化主题配置
    try {
      configStore.initTheme()
      console.log('[App] 主题配置初始化成功')
    } catch (error) {
      console.error('[App] 主题配置初始化失败:', error)
    }

    // 安全地初始化用户状态（公开页面跳过）
    if (!isPublicPage) {
      try {
        await userStore.initUser()
        console.log('[App] 用户状态初始化成功')
      } catch (error) {
        console.error('[App] 用户状态初始化失败:', error)
      }
    } else {
      console.log('[App] 公开页面，跳过用户状态初始化')
    }

    // 注册插件和组件
    app.use(router)
    app.use(ElementPlus, { locale: zhCn })

    // 注册全局指令和权限方法
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
