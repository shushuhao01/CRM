import { useServerStore } from '@/stores/server'
import { useUserStore } from '@/stores/user'

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

// 请求封装
export const request = <T = any>(options: RequestOptions): Promise<T> => {
  const serverStore = useServerStore()
  const userStore = useUserStore()

  // 检查服务器配置
  if (!serverStore.apiBaseUrl) {
    return Promise.reject(new Error('服务器未配置'))
  }

  // 🔥 每次请求前都从本地存储获取最新的 token
  const savedToken = uni.getStorageSync('token')
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
  console.log('API请求:', options.url, 'token:', token ? '有' : '无')

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

        console.log('API响应:', options.url, res.statusCode, JSON.stringify(res.data).substring(0, 200))
        const data = res.data as ApiResponse<T>

        // 成功响应
        if (res.statusCode === 200 && (data.success || data.code === 200)) {
          console.log('API成功，返回data:', JSON.stringify(data.data).substring(0, 100))
          resolve(data.data as T)
          return
        }

        // Token过期
        if (res.statusCode === 401) {
          // 检查当前页面，避免在登录页触发循环
          const pages = getCurrentPages()
          const currentPage = pages[pages.length - 1]
          const currentPath = currentPage?.route || ''

          console.log('401错误，当前页面:', currentPath)

          // 如果在登录页或刚登录完成，不处理401
          if (currentPath.includes('login')) {
            reject(new Error('登录已过期'))
            return
          }

          // 延迟处理，避免登录后立即触发
          setTimeout(() => {
            // 再次检查是否有token（可能已经重新登录）
            if (!userStore.token) {
              userStore.logout()
              uni.reLaunch({ url: '/pages/login/index' })
            }
          }, 500)

          reject(new Error('登录已过期，请重新登录'))
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

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: serverStore.apiBaseUrl + options.url,
      filePath: options.filePath,
      name: options.name,
      formData: options.formData,
      header: {
        'Authorization': userStore.token ? `Bearer ${userStore.token}` : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (data.success || data.code === 200) {
            resolve(data.data)
          } else {
            reject(new Error(data.message || '上传失败'))
          }
        } catch (e) {
          reject(new Error('解析响应失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

export default request
