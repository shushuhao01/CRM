import './assets/main.css'
import './styles/v4-design-system.css'

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
// 🔥 记录应用加载完成时间，刚加载时不弹动态导入错误
const APP_LOAD_TS = Date.now()

// 🔥 动态导入重载防循环：用sessionStorage记录重载次数，避免无限刷新
const RELOAD_KEY = 'dynamic_import_reload_count'
const RELOAD_TS_KEY = 'dynamic_import_reload_ts'
const MAX_RELOAD_ATTEMPTS = 1 // 最多自动重载1次

const getReloadCount = (): number => {
  try {
    const ts = sessionStorage.getItem(RELOAD_TS_KEY)
    // 如果上次重载超过60秒，重置计数
    if (ts && Date.now() - Number(ts) > 60000) {
      sessionStorage.removeItem(RELOAD_KEY)
      sessionStorage.removeItem(RELOAD_TS_KEY)
      return 0
    }
    return Number(sessionStorage.getItem(RELOAD_KEY) || '0')
  } catch { return 0 }
}

const incrementReloadCount = () => {
  try {
    sessionStorage.setItem(RELOAD_KEY, String(getReloadCount() + 1))
    sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
  } catch { /* ignore */ }
}

const clearReloadCount = () => {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
    sessionStorage.removeItem(RELOAD_TS_KEY)
  } catch { /* ignore */ }
}

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

  // 🔥 如果应用刚加载不到5秒，静默重试一次，不弹窗
  if (Date.now() - APP_LOAD_TS < 5000) {
    const reloadCount = getReloadCount()
    if (reloadCount < MAX_RELOAD_ATTEMPTS) {
      console.log('[Main] 应用刚加载，静默重试动态导入')
      incrementReloadCount()
      window.location.reload()
    } else {
      console.warn('[Main] 应用刚加载但已重试过，静默跳过')
    }
    return
  }

  // 🔥 开发环境下只做静默重载，不弹对话框
  if (import.meta.env.DEV) {
    const reloadCount = getReloadCount()
    if (reloadCount < MAX_RELOAD_ATTEMPTS) {
      console.log('[Main] 开发环境动态导入失败，静默重载')
      incrementReloadCount()
      window.location.reload()
    } else {
      console.warn('[Main] 开发环境动态导入失败，已重载过，跳过')
      clearReloadCount()
    }
    return
  }

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
    // 🔥 检查是否已经重载过 —— 防止无限循环
    const reloadCount = getReloadCount()
    if (reloadCount >= MAX_RELOAD_ATTEMPTS) {
      console.warn('[Main] 已达到最大自动刷新次数，不再自动刷新')
      ElMessageBox.alert(
        '页面加载失败，自动刷新未能解决问题。请尝试：\n1. 手动清除浏览器缓存（Ctrl+Shift+Delete）\n2. 强制刷新页面（Ctrl+Shift+R）\n3. 返回首页重试',
        '页面加载失败',
        {
          confirmButtonText: '返回首页',
          type: 'error',
          showClose: true,
          closeOnClickModal: true
        }
      ).then(() => {
        clearReloadCount()
        window.location.href = '/dashboard'
      }).catch(() => {
        clearReloadCount()
        isShowingGlobalErrorDialog = false
      })
    } else {
      // 第一次：提示用户刷新
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
        incrementReloadCount()
        window.location.reload()
      }).catch(() => {
        incrementReloadCount()
        window.location.reload()
      }).finally(() => {
        isShowingGlobalErrorDialog = false
      })
    }
  } else {
    // 公开页面：也需要防止无限刷新
    const reloadCount = getReloadCount()
    if (reloadCount >= MAX_RELOAD_ATTEMPTS) {
      console.log('[Main] 公开页面动态导入失败且已重载过，静默处理')
      isShowingGlobalErrorDialog = false
    } else {
      console.log('[Main] 公开页面动态导入失败，尝试刷新')
      incrementReloadCount()
      window.location.reload()
    }
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

    // 🔥 应用挂载成功，清除动态导入重载计数
    clearReloadCount()

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
