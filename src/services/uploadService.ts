/**
 * 通用图片上传服务
 * 支持上传到本地服务器或OSS（根据系统配置动态选择）
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

// 存储配置
interface StorageConfig {
  storageType: 'local' | 'oss'
  localPath: string
  localDomain: string
  accessKey: string
  secretKey: string
  bucketName: string
  region: string
  customDomain: string
  maxFileSize: number
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

// 默认存储配置
const defaultStorageConfig: StorageConfig = {
  storageType: 'local',
  localPath: './uploads',
  localDomain: '',
  accessKey: '',
  secretKey: '',
  bucketName: '',
  region: 'oss-cn-hangzhou',
  customDomain: '',
  maxFileSize: 10,
  allowedTypes: 'jpg,png,gif,webp,jpeg'
}

// 缓存上传配置
let cachedConfig: UploadConfig = { ...defaultConfig }
let cachedStorageConfig: StorageConfig = { ...defaultStorageConfig }
let configFetchTime = 0
let storageConfigFetchTime = 0
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
 * 获取存储配置（判断使用本地还是OSS）
 */
export const getStorageConfig = async (): Promise<StorageConfig> => {
  const now = Date.now()

  // 使用缓存
  if (storageConfigFetchTime > 0 && (now - storageConfigFetchTime) < CONFIG_CACHE_TIME) {
    return cachedStorageConfig
  }

  try {
    const token = localStorage.getItem('auth_token')
    const response = await axios.get(
      '/api/v1/system/storage-settings',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (response.data?.success && response.data?.data) {
      cachedStorageConfig = { ...defaultStorageConfig, ...response.data.data }
      storageConfigFetchTime = now
      console.log('[UploadService] 存储配置已更新:', cachedStorageConfig.storageType)
      return cachedStorageConfig
    }
  } catch (error) {
    console.warn('获取存储配置失败，使用默认配置:', error)
  }

  return defaultStorageConfig
}

/**
 * 清除存储配置缓存（配置更新后调用）
 */
export const clearStorageConfigCache = () => {
  storageConfigFetchTime = 0
  configFetchTime = 0
  console.log('[UploadService] 存储配置缓存已清除')
}

/**
 * 上传图片到本地服务器
 */
const uploadToLocal = async (file: File, type: UploadType): Promise<UploadResult> => {
  // 构建上传URL
  const uploadUrls: Record<UploadType, string> = {
    system: '/api/v1/system/upload-image',
    product: '/api/v1/system/upload-product-image',
    avatar: '/api/v1/system/upload-avatar',
    order: '/api/v1/system/upload-order-image',
    service: '/api/v1/system/upload-service-image'
  }

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
    console.error('本地上传失败:', error)
    return {
      success: false,
      message: err.response?.data?.message || err.message || '上传失败，请重试'
    }
  }
}

/**
 * 上传图片到阿里云OSS
 */
const uploadToOSS = async (file: File, type: UploadType, storageConfig: StorageConfig): Promise<UploadResult> => {
  try {
    // 动态导入OSS SDK
    const OSS = (await import('ali-oss')).default

    // 创建OSS客户端
    const client = new OSS({
      region: storageConfig.region,
      accessKeyId: storageConfig.accessKey,
      accessKeySecret: storageConfig.secretKey,
      bucket: storageConfig.bucketName,
      secure: true
    })

    // 生成文件路径
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const ext = file.name.split('.').pop()
    const fileName = `${type}/${timestamp}_${random}.${ext}`

    // 上传文件
    const result = await client.put(fileName, file)

    // 生成访问URL
    let url = result.url
    if (storageConfig.customDomain) {
      // 使用自定义域名
      url = `${storageConfig.customDomain.replace(/\/$/, '')}/${fileName}`
    }

    console.log('[UploadService] OSS上传成功:', url)

    return {
      success: true,
      url: url,
      filename: fileName,
      size: file.size
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string }
    console.error('OSS上传失败:', error)

    // 提供友好的错误信息
    let errorMessage = '上传失败，请重试'
    if (err.code === 'InvalidAccessKeyId') {
      errorMessage = 'OSS Access Key无效，请检查配置'
    } else if (err.code === 'SignatureDoesNotMatch') {
      errorMessage = 'OSS Secret Key错误，请检查配置'
    } else if (err.code === 'NoSuchBucket') {
      errorMessage = 'OSS Bucket不存在，请检查配置'
    } else if (err.code === 'AccessDenied') {
      errorMessage = 'OSS访问被拒绝，请检查权限配置'
    } else if (err.message) {
      errorMessage = err.message
    }

    return {
      success: false,
      message: errorMessage
    }
  }
}

/**
 * 上传图片（根据系统配置自动选择本地或OSS）
 * @param file 文件对象
 * @param type 上传类型
 * @returns 上传结果
 */
export const uploadImage = async (file: File, type: UploadType): Promise<UploadResult> => {
  // 获取上传配置和存储配置
  const [uploadConfig, storageConfig] = await Promise.all([
    getUploadConfig(),
    getStorageConfig()
  ])

  // 验证文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    return {
      success: false,
      message: '只能上传图片文件'
    }
  }

  // 验证文件大小
  const maxFileSize = storageConfig.maxFileSize || uploadConfig.maxFileSize
  const fileSizeMB = file.size / 1024 / 1024
  if (fileSizeMB > maxFileSize) {
    return {
      success: false,
      message: `文件大小超过限制，最大允许 ${maxFileSize}MB`
    }
  }

  // 根据存储类型选择上传方式
  console.log('[UploadService] 当前存储类型:', storageConfig.storageType)

  if (storageConfig.storageType === 'oss') {
    // 检查OSS配置是否完整
    if (!storageConfig.accessKey || !storageConfig.secretKey || !storageConfig.bucketName || !storageConfig.region) {
      console.warn('[UploadService] OSS配置不完整，回退到本地上传')
      return uploadToLocal(file, type)
    }
    return uploadToOSS(file, type, storageConfig)
  } else {
    return uploadToLocal(file, type)
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
  getStorageConfig,
  clearStorageConfigCache,
  uploadImage,
  uploadImageWithMessage
}
