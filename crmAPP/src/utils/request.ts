import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'
import { getEncryptedStorage, setEncryptedStorage } from '@/utils/crypto'

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: Record<string, string>
  showLoading?: boolean
  loadingText?: string
}

interface ApiResponse<T = any> {
  code?: number
  success: boolean
  message?: string
  data?: T
}

// 静默重新登录（利用本地保存的账号密码）
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

const silentReLogin = (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) return refreshPromise

  isRefreshing = true
  refreshPromise = (async () => {
    try {
      const serverStore = useServerStore()
      const userStore = useUserStore()
      const savedUsername = uni.getStorageSync('savedUsername')
      const savedPassword = getEncryptedStorage('savedPassword')

      if (!savedUsername || !savedPassword || !serverStore.apiBaseUrl) {
        console.log('[SilentReLogin] 无保存的凭据，无法静默登录')
        return null
      }

      console.log('[SilentReLogin] 尝试静默重新登录...')
      const res: any = await new Promise((resolve, reject) => {
        uni.request({
          url: serverStore.apiBaseUrl + '/mobile/login',
          method: 'POST',
          data: { username: savedUsername, password: savedPassword },
          header: { 'Content-Type': 'application/json' },
          timeout: 10000,
          success: (r) => resolve(r),
          fail: (e) => reject(e)
        })
      })

      if (res.statusCode === 200 && (res.data?.success || res.data?.code === 200)) {
        const loginData = res.data.data
        userStore.setLoginInfo(loginData)
        console.log('[SilentReLogin] 静默登录成功，token已更新')
        return loginData.token
      }
      console.log('[SilentReLogin] 静默登录失败:', res.data?.message)
      return null
    } catch (e) {
      console.error('[SilentReLogin] 静默登录异常:', e)
      return null
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// 请求封装
export const request = <T = any>(options: RequestOptions): Promise<T> => {
  const serverStore = useServerStore()
  const userStore = useUserStore()

  // 检查服务器配置
  if (!serverStore.apiBaseUrl) {
    return Promise.reject(new Error('服务器未配置'))
  }

  // 🔥 每次请求前都从加密存储获取最新的 token（与 setLoginInfo 一致）
  const savedToken = getEncryptedStorage('token')
  if (savedToken && !userStore.token) {
    userStore.token = savedToken
    userStore.isLoggedIn = true
  }

  // 显示加载
  if (options.showLoading !== false) {
    uni.showLoading({
      title: options.loadingText || '加载中...',
      mask: true
    })
  }

  // 🔥 优先使用本地存储的 token，确保最新
  const token = savedToken || userStore.token || ''

  return new Promise((resolve, reject) => {
    uni.request({
      url: serverStore.apiBaseUrl + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.header
      },
      timeout: 15000,
      success: (res: any) => {
        uni.hideLoading()

        const data = res.data as ApiResponse<T>

        // 成功响应
        if (res.statusCode === 200 && (data.success || data.code === 200)) {
          resolve(data.data as T)
          return
        }

        // Token过期 - 尝试静默重新登录并重试
        if (res.statusCode === 401) {
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          const currentPath = currentPage?.route || ''

          console.log('401错误，当前页面:', currentPath)

          if (currentPath.includes('login')) {
            reject(new Error('登录已过期'))
            return
          }

          // 尝试静默重新登录并重试原请求
          silentReLogin().then((newToken) => {
            if (newToken) {
              console.log('[401Recovery] 用新token重试请求:', options.url)
              // 用新 token 重试原请求
              uni.request({
                url: serverStore.apiBaseUrl + options.url,
                method: options.method || 'GET',
                data: options.data,
                header: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${newToken}`,
                  ...options.header
                },
                timeout: 15000,
                success: (retryRes: any) => {
                  const retryData = retryRes.data as ApiResponse<T>
                  if (retryRes.statusCode === 200 && (retryData.success || retryData.code === 200)) {
                    console.log('[401Recovery] 重试成功')
                    resolve(retryData.data as T)
                  } else {
                    console.log('[401Recovery] 重试仍失败')
                    reject(new Error(retryData.message || '请求失败'))
                  }
                },
                fail: (retryErr) => {
                  reject(new Error(retryErr.errMsg || '网络错误'))
                }
              })
            } else {
              // 静默登录也失败，跳转登录页
              console.log('[401Recovery] 静默登录失败，跳转登录页')
              userStore.logout()
              uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
              setTimeout(() => {
                uni.reLaunch({ url: '/pages/login/index' })
              }, 1500)
              reject(new Error('登录已过期，请重新登录'))
            }
          })
          return
        }

        // 其他错误
        const errorMsg = data.message || '请求失败'
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
        reject(new Error(errorMsg))
      },
      fail: (err) => {
        uni.hideLoading()
        const errorMsg = err.errMsg || '网络错误'
        uni.showToast({
          title: '网络连接失败',
          icon: 'none',
          duration: 2000
        })
        reject(new Error(errorMsg))
      }
    })
  })
}

// 上传文件
export const uploadFile = (options: {
  url: string
  filePath: string
  name: string
  formData?: Record<string, any>
}): Promise<any> => {
  const serverStore = useServerStore()
  const userStore = useUserStore()

  // 🔥 使用加密存储获取最新token，与 request 保持一致
  const savedToken = getEncryptedStorage('token')
  const token = savedToken || userStore.token || ''

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: serverStore.apiBaseUrl + options.url,
      filePath: options.filePath,
      name: options.name,
      formData: options.formData,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        // 🔥 先检查 HTTP 状态码，再解析响应体
        if (res.statusCode === 401) {
          // Token过期，尝试静默重新登录后重试
          console.log('[uploadFile] 401错误，尝试静默重新登录...')
          silentReLogin().then((newToken) => {
            if (newToken) {
              uni.uploadFile({
                url: serverStore.apiBaseUrl + options.url,
                filePath: options.filePath,
                name: options.name,
                formData: options.formData,
                header: {
                  'Authorization': `Bearer ${newToken}`
                },
                success: (retryRes) => {
                  try {
                    const retryData = JSON.parse(retryRes.data)
                    if (retryData.success || retryData.code === 200) {
                      resolve(retryData.data)
                    } else {
                      reject(new Error(retryData.message || '上传失败'))
                    }
                  } catch (_e) {
                    reject(new Error('上传响应解析失败'))
                  }
                },
                fail: (err) => {
                  reject(new Error(err.errMsg || '上传失败'))
                }
              })
            } else {
              reject(new Error('登录已过期，请重新登录'))
            }
          })
          return
        }

        try {
          const data = JSON.parse(res.data)
          if (data.success || data.code === 200) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (_e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

export default request
