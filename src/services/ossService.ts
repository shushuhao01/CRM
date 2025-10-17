/**
 * 阿里云OSS存储服务
 * 提供文件上传、下载、删除等功能
 */

import { useConfigStore } from '@/stores/config'
import type { StorageConfig } from '@/stores/config'
import OSS from 'ali-oss'

// OSS客户端配置接口
export interface OSSConfig {
  region: string
  accessKeyId: string
  accessKeySecret: string
  bucket: string
  endpoint?: string
}

// 文件上传结果接口
export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

// 文件上传进度回调
export type ProgressCallback = (progress: number) => void

/**
 * OSS存储服务类
 */
export class OSSService {
  private static instance: OSSService
  private ossClient: any = null
  private configStore = useConfigStore()

  private constructor() {
    this.initOSSClient()
  }

  public static getInstance(): OSSService {
    if (!OSSService.instance) {
      OSSService.instance = new OSSService()
    }
    return OSSService.instance
  }

  /**
   * 初始化OSS客户端
   */
  private async initOSSClient() {
    try {
      const storageConfig = this.configStore.storageConfig
      
      if (storageConfig.storageType !== 'oss') {
        console.log('当前存储类型不是OSS，跳过初始化')
        return
      }

      if (!storageConfig.accessKey || !storageConfig.secretKey || !storageConfig.bucketName || !storageConfig.region) {
        console.warn('OSS配置不完整，无法初始化客户端')
        return
      }

      // 初始化阿里云OSS SDK
      this.ossClient = new OSS({
        region: storageConfig.region,
        accessKeyId: storageConfig.accessKey,
        accessKeySecret: storageConfig.secretKey,
        bucket: storageConfig.bucketName,
        endpoint: storageConfig.customDomain || undefined,
        secure: true, // 强制使用HTTPS
        cname: !!storageConfig.customDomain // 如果有自定义域名则启用CNAME
      })

      // OSS客户端初始化成功
    } catch (error) {
      console.error('OSS客户端初始化失败:', error)
      this.ossClient = null
    }
  }

  /**
   * 检查OSS是否可用
   */
  public isOSSAvailable(): boolean {
    const storageConfig = this.configStore.storageConfig
    return storageConfig.storageType === 'oss' && 
           !!this.ossClient && 
           !!storageConfig.accessKey && 
           !!storageConfig.secretKey && 
           !!storageConfig.bucketName
  }

  /**
   * 获取详细的OSS配置诊断信息
   */
  public getOSSConfigDiagnosis(): {
    isAvailable: boolean
    issues: string[]
    config: {
      storageType: string
      hasAccessKey: boolean
      hasSecretKey: boolean
      hasBucketName: boolean
      hasRegion: boolean
      hasClient: boolean
    }
  } {
    const storageConfig = this.configStore.storageConfig
    const issues: string[] = []
    
    if (storageConfig.storageType !== 'oss') {
      issues.push('存储类型未设置为OSS')
    }
    
    if (!storageConfig.accessKey) {
      issues.push('Access Key未配置')
    }
    
    if (!storageConfig.secretKey) {
      issues.push('Secret Key未配置')
    }
    
    if (!storageConfig.bucketName) {
      issues.push('Bucket名称未配置')
    }
    
    if (!storageConfig.region) {
      issues.push('Region未配置')
    }
    
    if (!this.ossClient) {
      issues.push('OSS客户端未初始化')
    }

    return {
      isAvailable: this.isOSSAvailable(),
      issues,
      config: {
        storageType: storageConfig.storageType,
        hasAccessKey: !!storageConfig.accessKey,
        hasSecretKey: !!storageConfig.secretKey,
        hasBucketName: !!storageConfig.bucketName,
        hasRegion: !!storageConfig.region,
        hasClient: !!this.ossClient
      }
    }
  }

  /**
   * 诊断OSS权限配置
   */
  public async diagnoseOSSPermissions(): Promise<{
    hasListPermission: boolean
    hasReadPermission: boolean
    hasWritePermission: boolean
    errors: string[]
    recommendations: string[]
  }> {
    const result = {
      hasListPermission: false,
      hasReadPermission: false,
      hasWritePermission: false,
      errors: [] as string[],
      recommendations: [] as string[]
    }

    try {
      // 确保OSS客户端已初始化
      if (!this.ossClient) {
        await this.initOSSClient()
      }

      if (!this.ossClient) {
        result.errors.push('OSS客户端初始化失败')
        result.recommendations.push('检查Access Key、Secret Key和Region配置')
        return result
      }

      // 测试List权限
      try {
        await this.ossClient.list({ 'max-keys': 1 })
        result.hasListPermission = true
        console.log('✓ List权限测试通过')
      } catch (error: any) {
        result.errors.push(`List权限测试失败: ${error.code || error.message}`)
        if (error.code === 'AccessDenied') {
          result.recommendations.push('需要为Access Key添加oss:ListObjects权限')
        }
      }

      // 测试Read权限（尝试获取一个不存在的对象，如果返回NoSuchKey说明有读权限）
      try {
        await this.ossClient.get('permission-test-nonexistent-file.txt')
      } catch (error: any) {
        if (error.code === 'NoSuchKey') {
          result.hasReadPermission = true
          console.log('✓ Read权限测试通过')
        } else if (error.code === 'AccessDenied') {
          result.errors.push('Read权限测试失败: 访问被拒绝')
          result.recommendations.push('需要为Access Key添加oss:GetObject权限')
        } else {
          result.errors.push(`Read权限测试失败: ${error.code || error.message}`)
        }
      }

      // 测试Write权限（尝试上传一个小的测试文件）
      try {
        const testContent = 'permission-test'
        const testKey = `permission-test-${Date.now()}.txt`
        await this.ossClient.put(testKey, Buffer.from(testContent))
        result.hasWritePermission = true
        console.log('✓ Write权限测试通过')
        
        // 清理测试文件
        try {
          await this.ossClient.delete(testKey)
        } catch (cleanupError) {
          console.warn('清理测试文件失败:', cleanupError)
        }
      } catch (error: any) {
        result.errors.push(`Write权限测试失败: ${error.code || error.message}`)
        if (error.code === 'AccessDenied') {
          result.recommendations.push('需要为Access Key添加oss:PutObject和oss:DeleteObject权限')
        }
      }

    } catch (error: any) {
      result.errors.push(`权限诊断失败: ${error.message}`)
    }

    return result
  }

  /**
   * 测试OSS连接
   */
  public async testOSSConnection(): Promise<{
    success: boolean
    error?: string
    details?: any
  }> {
    try {
      // 确保OSS客户端已初始化
      if (!this.ossClient) {
        console.log('OSS客户端未初始化，尝试重新初始化...')
        await this.initOSSClient()
      }

      if (!this.ossClient) {
        return {
          success: false,
          error: 'OSS客户端初始化失败，请检查配置'
        }
      }

      // 检查OSS客户端是否有list方法（浏览器环境支持的Object操作）
      if (typeof this.ossClient.list !== 'function') {
        console.error('OSS客户端对象:', this.ossClient)
        console.error('可用方法:', Object.getOwnPropertyNames(this.ossClient))
        return {
          success: false,
          error: 'OSS客户端方法不可用，可能是版本兼容性问题'
        }
      }

      // 使用list方法测试连接（限制返回1个对象以减少开销）
      const bucketName = this.configStore.storageConfig.bucketName
      const result = await this.ossClient.list({
        'max-keys': 1
      })
      
      return {
        success: true,
        details: {
          bucketName: bucketName,
          region: this.configStore.storageConfig.region,
          objectCount: result.objects ? result.objects.length : 0,
          isTruncated: result.isTruncated || false
        }
      }
    } catch (error: any) {
      let errorMessage = '未知错误'
      let errorDetails: any = {}
      let corsAdvice = ''

      // 检查是否是CORS相关错误
      if (error.name === 'RequestError' || error.message?.includes('XHR error') || error.message?.includes('ERR_FAILED')) {
        errorMessage = `OSS错误: ${error.name} - ${error.message}`
        corsAdvice = '这可能是CORS配置问题。请检查：\n1. OSS Bucket的CORS规则是否包含当前域名\n2. 允许的方法是否包含GET\n3. 是否使用了正确的协议(HTTPS)'
        
        errorDetails = {
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code,
          corsAdvice: corsAdvice,
          currentOrigin: window.location.origin,
          requestUrl: `https://${this.configStore.storageConfig.bucketName}.${this.configStore.storageConfig.region}.aliyuncs.com/`
        }
      } else if (error.code) {
        switch (error.code) {
          case 'InvalidAccessKeyId':
            errorMessage = 'Access Key ID无效'
            break
          case 'SignatureDoesNotMatch':
            errorMessage = 'Secret Key错误或签名不匹配'
            break
          case 'NoSuchBucket':
            errorMessage = 'Bucket不存在'
            break
          case 'AccessDenied':
            errorMessage = '访问被拒绝，请检查权限配置'
            break
          case 'RequestTimeTooSkewed':
            errorMessage = '请求时间偏差过大，请检查系统时间'
            break
          default:
            errorMessage = `OSS错误: ${error.code} - ${error.message}`
        }
        errorDetails = {
          code: error.code,
          message: error.message,
          requestId: error.requestId
        }
      } else {
        errorMessage = error.message || '连接失败'
        errorDetails = error
      }

      // 如果是权限相关错误，进行详细的权限诊断
      let permissionDiagnosis = null
      if (error.code === 'AccessDenied' || errorMessage.includes('访问被拒绝')) {
        console.log('检测到权限错误，开始权限诊断...')
        try {
          permissionDiagnosis = await this.diagnoseOSSPermissions()
          console.log('权限诊断结果:', permissionDiagnosis)
        } catch (diagError) {
          console.error('权限诊断失败:', diagError)
        }
      }

      console.error('OSS连接测试失败:', {
        error: errorMessage,
        details: errorDetails,
        permissionDiagnosis: permissionDiagnosis,
        config: {
          region: this.configStore.storageConfig.region,
          bucket: this.configStore.storageConfig.bucketName,
          endpoint: this.configStore.storageConfig.customDomain,
          hasClient: !!this.ossClient,
          currentOrigin: window.location.origin
        }
      })

      return {
        success: false,
        error: `${errorMessage}${corsAdvice ? ' ' + corsAdvice : ''}`,
        details: {
          ...errorDetails,
          permissionDiagnosis: permissionDiagnosis
        }
      }
    }
  }

  /**
   * 上传文件到OSS
   */
  public async uploadFile(
    file: File, 
    path?: string, 
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    try {
      if (!this.isOSSAvailable()) {
        return {
          success: false,
          error: 'OSS服务不可用，请检查配置'
        }
      }

      // 生成文件路径
      const fileName = this.generateFileName(file.name)
      const filePath = path ? `${path}/${fileName}` : fileName

      // 上传文件
      const result = await this.ossClient.put(filePath, file, {
        progress: (p: number) => {
          if (onProgress) {
            onProgress(Math.round(p * 100))
          }
        }
      })

      return {
        success: true,
        url: result.url,
        key: filePath
      }
    } catch (error) {
      console.error('OSS文件上传失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '上传失败'
      }
    }
  }

  /**
   * 删除OSS文件
   */
  public async deleteFile(key: string): Promise<boolean> {
    try {
      if (!key || typeof key !== 'string') {
        console.error('OSS文件删除失败: 无效的文件key', { key })
        return false
      }

      if (!this.isOSSAvailable()) {
        console.warn('OSS服务不可用，无法删除文件', {
          key,
          diagnosis: this.getOSSConfigDiagnosis()
        })
        return false
      }

      const result = await this.ossClient.delete(key)
      return true
    } catch (error: any) {
      // OSS文件删除失败

      // 提供具体的错误诊断
      if (error.code === 'AccessDenied') {
        // 删除权限被拒绝，可能的原因：
        // 1. RAM用户没有 oss:DeleteObject 权限
        // 2. Bucket策略不允许删除操作
        // 3. 文件key不正确
      } else if (error.code === 'NoSuchKey') {
        // 要删除的文件不存在，也算删除成功
        return true
      } else if (error.code === 'InvalidAccessKeyId') {
        // Access Key ID无效
      } else if (error.code === 'SignatureDoesNotMatch') {
        // 签名不匹配，Secret Key配置可能有误
      }

      return false
    }
  }

  /**
   * 列出指定路径下的文件
   */
  public async listFiles(prefix?: string, maxKeys: number = 100): Promise<{
    success: boolean
    files?: Array<{
      key: string
      size: number
      lastModified: Date
      etag: string
    }>
    error?: string
  }> {
    try {
      if (!this.isOSSAvailable()) {
        return {
          success: false,
          error: 'OSS服务不可用'
        }
      }

      console.log(`开始列出OSS文件，前缀: ${prefix || '无'}`)
      
      const result = await this.ossClient.list({
        prefix: prefix || '',
        'max-keys': maxKeys
      })

      const files = result.objects?.map((obj: any) => ({
        key: obj.name,
        size: obj.size,
        lastModified: new Date(obj.lastModified),
        etag: obj.etag
      })) || []

      console.log(`OSS文件列表获取成功，共 ${files.length} 个文件`)
      
      return {
        success: true,
        files
      }
    } catch (error: any) {
      console.error('OSS文件列表获取失败:', {
        prefix,
        error: error.message || error,
        code: error.code,
        requestId: error.requestId
      })

      return {
        success: false,
        error: error.message || '获取文件列表失败'
      }
    }
  }

  /**
   * 下载OSS文件
   */
  public async downloadFile(key: string): Promise<{
    success: boolean
    content?: string
    blob?: Blob
    error?: string
  }> {
    try {
      if (!key || typeof key !== 'string') {
        return {
          success: false,
          error: '无效的文件key'
        }
      }

      if (!this.isOSSAvailable()) {
        return {
          success: false,
          error: 'OSS服务不可用'
        }
      }

      console.log(`开始下载OSS文件: ${key}`)
      
      const result = await this.ossClient.get(key)
      
      if (result.content) {
        // 如果是文本内容，直接返回
        const content = result.content.toString()
        console.log(`OSS文件下载成功: ${key}，大小: ${content.length} 字符`)
        
        return {
          success: true,
          content,
          blob: new Blob([content], { type: 'application/json' })
        }
      } else {
        return {
          success: false,
          error: '文件内容为空'
        }
      }
    } catch (error: any) {
      console.error('OSS文件下载失败:', {
        key,
        error: error.message || error,
        code: error.code,
        requestId: error.requestId
      })

      // 提供具体的错误诊断
      if (error.code === 'NoSuchKey') {
        return {
          success: false,
          error: '文件不存在'
        }
      } else if (error.code === 'AccessDenied') {
        return {
          success: false,
          error: '访问被拒绝，请检查权限配置'
        }
      }

      return {
        success: false,
        error: error.message || '下载文件失败'
      }
    }
  }

  /**
   * 获取文件访问URL
   */
  public getFileUrl(key: string): string {
    const storageConfig = this.configStore.storageConfig
    
    if (storageConfig.customDomain) {
      return `${storageConfig.customDomain}/${key}`
    }
    
    return `https://${storageConfig.bucketName}.${storageConfig.region}.aliyuncs.com/${key}`
  }

  /**
   * 生成唯一文件名
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = originalName.split('.').pop()
    return `${timestamp}_${random}.${extension}`
  }

  /**
   * 验证文件类型
   */
  public validateFileType(file: File): boolean {
    const storageConfig = this.configStore.storageConfig
    const allowedTypes = storageConfig.allowedTypes.split(',').map(type => type.trim().toLowerCase())
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    
    return fileExtension ? allowedTypes.includes(fileExtension) : false
  }

  /**
   * 验证文件大小
   */
  public validateFileSize(file: File): boolean {
    const storageConfig = this.configStore.storageConfig
    const maxSizeInBytes = storageConfig.maxFileSize * 1024 * 1024 // 转换为字节
    
    return file.size <= maxSizeInBytes
  }

  /**
   * 重新初始化OSS客户端（配置更新后调用）
   */
  public async reinitialize() {
    this.ossClient = null
    await this.initOSSClient()
  }
}

// 导出单例实例
export const ossService = OSSService.getInstance()

/**
 * 统一文件上传服务
 * 根据配置自动选择本地存储或OSS存储
 */
export class FileUploadService {
  private configStore = useConfigStore()

  /**
   * 上传文件
   */
  public async uploadFile(
    file: File, 
    path?: string, 
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    const storageConfig = this.configStore.storageConfig

    // 验证文件
    if (!this.validateFile(file)) {
      return {
        success: false,
        error: '文件类型或大小不符合要求'
      }
    }

    switch (storageConfig.storageType) {
      case 'oss':
        return await ossService.uploadFile(file, path, onProgress)
      
      case 'local':
      default:
        return await this.uploadToLocal(file, path, onProgress)
    }
  }

  /**
   * 上传到本地存储
   */
  private async uploadToLocal(
    file: File, 
    path?: string, 
    onProgress?: ProgressCallback
  ): Promise<UploadResult> {
    try {
      // 模拟上传进度
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          setTimeout(() => onProgress(i), i * 10)
        }
      }

      // 创建本地URL（实际项目中应该上传到服务器）
      const url = URL.createObjectURL(file)
      
      return {
        success: true,
        url: url,
        key: file.name
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '本地上传失败'
      }
    }
  }

  /**
   * 验证文件
   */
  private validateFile(file: File): boolean {
    return ossService.validateFileType(file) && ossService.validateFileSize(file)
  }
}

// 导出文件上传服务实例
export const fileUploadService = new FileUploadService()