/**
 * 通用图片上传服务
 * 支持上传到本地服务器或OSS
 */
import axios from 'axios'
import { ElMessage } from 'element-plus'

// 上传类型
export type UploadType = 'system' | 'product' | 'avatar' | 'order' | 'service'

// 上传配置
interface UploadConfig {
  maxFileSize: number // MB
  allowedTypes: string
}

// 上传结果
interface UploadResult {
  success: boolean
  url?: string
  filename?: string
  size?: number
  message?: string
}

// 默认配置
const defaultConfig: UploadConfig = {
  maxFileSize: 10,
  allowedTypes: 'jpg,png,gif,webp,jpeg'
}

// 缓存上传配置
let cachedConfig: UploadConfig = { ...defaultConfig }
let configFetchTime = 0
const CONFIG_CACHE_TIME = 5 * 60 * 1000 // 5分钟缓存

/**
 * 获取上传配置
 */
export const getUploadConfig = async (): Promise<UploadConfig> => {
  const now = Date.now()

  // 使用缓存
  if (configFetchTime > 0 && (now - configFetchTime) < CONFIG_CACHE_TIME) {
    return cachedConfig
  }

  try {
    const token = localStorage.getItem('auth_token')
    const response = await axios.get(
      '/api/v1/system/upload-config',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (response.data?.success && response.data?.data) {
      cachedConfig = response.data.data
      configFetchTime = now
      return cachedConfig
    }
  } catch (error) {
    console.warn('获取上传配置失败，使用默认配置:', error)
  }

  // 返回默认配置
  return defaultConfig
}

/**
 * 上传图片
 * @param file 文件对象
 * @param type 上传类型
 * @returns 上传结果
 */
export const uploadImage = async (file: File, type: UploadType): Promise<UploadResult> => {
  // 获取上传配置
  const config = await getUploadConfig()

  // 验证文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    return {
      success: false,
      message: '只能上传图片文件'
    }
  }

  // 验证文件大小
  const fileSizeMB = file.size / 1024 / 1024
  if (fileSizeMB > config.maxFileSize) {
    return {
      success: false,
      message: `文件大小超过限制，最大允许 ${config.maxFileSize}MB`
    }
  }

  // 构建上传URL - 不使用VITE_API_BASE_URL，直接使用相对路径
  const uploadUrls: Record<UploadType, string> = {
    system: '/api/v1/system/upload-image',
    product: '/api/v1/system/upload-product-image',
    avatar: '/api/v1/system/upload-avatar',
    order: '/api/v1/system/upload-order-image',
    service: '/api/v1/system/upload-service-image'
  }

  // 直接使用相对路径，让浏览器自动处理域名
  const uploadUrl = uploadUrls[type]

  try {
    const formData = new FormData()
    formData.append('image', file)

    const token = localStorage.getItem('auth_token')
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.data?.success && response.data?.data?.url) {
      return {
        success: true,
        url: response.data.data.url,
        filename: response.data.data.filename,
        size: response.data.data.size
      }
    } else {
      return {
        success: false,
        message: response.data?.message || '上传失败'
      }
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } }; message?: string }
    console.error('图片上传失败:', error)
    return {
      success: false,
      message: err.response?.data?.message || err.message || '上传失败，请重试'
    }
  }
}

/**
 * 上传图片并显示消息提示
 * @param file 文件对象
 * @param type 上传类型
 * @returns 上传成功返回URL，失败返回null
 */
export const uploadImageWithMessage = async (file: File, type: UploadType): Promise<string | null> => {
  const result = await uploadImage(file, type)

  if (result.success && result.url) {
    ElMessage.success('图片上传成功')
    return result.url
  } else {
    ElMessage.error(result.message || '上传失败')
    return null
  }
}

export default {
  getUploadConfig,
  uploadImage,
  uploadImageWithMessage
}
