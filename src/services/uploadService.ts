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
  // 图片压缩配置
  imageCompressEnabled?: boolean
  imageCompressQuality?: 'high' | 'medium' | 'low' | 'custom'
  imageCompressMaxWidth?: number
  imageCompressCustomQuality?: number
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
  allowedTypes: 'jpg,png,gif,webp,jpeg',
  // 图片压缩默认配置
  imageCompressEnabled: true,
  imageCompressQuality: 'medium',
  imageCompressMaxWidth: 1200,
  imageCompressCustomQuality: 60
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
 * 压缩图片
 * @param file 原始文件
 * @param maxWidth 最大宽度
 * @param quality 压缩质量 0-1
 * @returns 压缩后的文件
 */
const compressImage = async (file: File, maxWidth = 800, quality = 0.6): Promise<File> => {
  return new Promise((resolve, reject) => {
    // 如果是GIF图片，不压缩（保持动画）
    if (file.type === 'image/gif') {
      resolve(file)
      return
    }

    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      let { width, height } = img
      const originalWidth = width
      const originalHeight = height

      // 如果图片宽度超过最大宽度，按比例缩小
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      // 如果高度也超过最大值，再次缩小
      const maxHeight = 800
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height)
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      // 绘制图片
      ctx?.drawImage(img, 0, 0, width, height)

      // 始终转换为JPEG格式以获得更好的压缩效果
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 检查压缩后是否真的变小了
            if (blob.size < file.size) {
              // 创建新的File对象
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
              })
              console.log(`[UploadService] 图片压缩成功: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB (${originalWidth}x${originalHeight} -> ${width}x${height})`)
              resolve(compressedFile)
            } else {
              // 压缩后反而更大，使用更低质量再试一次
              canvas.toBlob(
                (blob2) => {
                  if (blob2 && blob2.size < file.size) {
                    const compressedFile = new File([blob2], file.name.replace(/\.[^.]+$/, '.jpg'), {
                      type: 'image/jpeg',
                      lastModified: Date.now()
                    })
                    console.log(`[UploadService] 图片二次压缩: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`)
                    resolve(compressedFile)
                  } else {
                    console.log(`[UploadService] 压缩后更大，使用原文件: ${(file.size / 1024).toFixed(1)}KB`)
                    resolve(file)
                  }
                },
                'image/jpeg',
                0.4 // 更低质量
              )
            }
          } else {
            resolve(file) // 压缩失败，返回原文件
          }
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      console.warn('[UploadService] 图片加载失败，使用原文件')
      resolve(file)
    }

    // 读取文件
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 上传图片（根据系统配置自动选择本地或OSS）
 * @param file 文件对象
 * @param type 上传类型
 * @param compress 是否压缩图片，默认true
 * @returns 上传结果
 */
export const uploadImage = async (file: File, type: UploadType, compress = true): Promise<UploadResult> => {
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

  // 压缩图片（如果启用且配置允许）
  let fileToUpload = file
  const compressEnabled = storageConfig.imageCompressEnabled !== false // 默认启用
  if (compress && compressEnabled && file.size > 50 * 1024) { // 大于50KB才压缩
    try {
      // 根据配置获取压缩参数
      let maxWidth = 1200
      let quality = 0.6

      switch (storageConfig.imageCompressQuality) {
        case 'high':
          maxWidth = 1920
          quality = 0.8
          break
        case 'medium':
          maxWidth = 1200
          quality = 0.6
          break
        case 'low':
          maxWidth = 800
          quality = 0.4
          break
        case 'custom':
          maxWidth = storageConfig.imageCompressMaxWidth || 1200
          quality = (storageConfig.imageCompressCustomQuality || 60) / 100
          break
      }

      fileToUpload = await compressImage(file, maxWidth, quality)
      console.log(`[UploadService] 图片压缩: ${(file.size / 1024).toFixed(1)}KB -> ${(fileToUpload.size / 1024).toFixed(1)}KB`)
    } catch (error) {
      console.warn('[UploadService] 图片压缩失败，使用原文件:', error)
    }
  }

  // 验证文件大小（压缩后）
  const maxFileSize = storageConfig.maxFileSize || uploadConfig.maxFileSize
  const fileSizeMB = fileToUpload.size / 1024 / 1024
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
      return uploadToLocal(fileToUpload, type)
    }
    return uploadToOSS(fileToUpload, type, storageConfig)
  } else {
    return uploadToLocal(fileToUpload, type)
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
