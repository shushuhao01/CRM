/**
 * OSS上传服务 - 后端文件上传到阿里云OSS
 * 当存储设置为OSS模式时，文件上传到OSS而非本地磁盘
 */
import { log } from '../config/logger';
import { SystemConfig } from '../entities/SystemConfig';
import { getTenantRepo } from '../utils/tenantRepo';
import { TenantContextManager } from '../utils/tenantContext';
import { cacheService } from './CacheService';
import { AppDataSource } from '../config/database';

export interface OSSStorageConfig {
  storageType: string;
  accessKey: string;
  secretKey: string;
  bucketName: string;
  region: string;
  customDomain?: string;
}

export interface OSSUploadResult {
  success: boolean;
  url: string;
  objectKey: string;
  error?: string;
}

// 缓存TTL（秒）
const OSS_CONFIG_CACHE_TTL = 300;

/**
 * 获取当前租户的存储配置
 * 优先读取租户自身的 storage_settings，如果不是OSS模式则尝试读取管理后台配置下发的存储设置
 */
export async function getStorageConfig(): Promise<OSSStorageConfig> {
  const tenantId = TenantContextManager.getTenantId();
  const cacheKey = cacheService.tenantKey(tenantId, 'config', 'oss_storage');
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  try {
    const configRepo = getTenantRepo(SystemConfig);

    const storageTypeConfig = await configRepo.findOne({
      where: { configKey: 'storageType', configGroup: 'storage_settings', isEnabled: true }
    });
    const accessKeyConfig = await configRepo.findOne({
      where: { configKey: 'accessKey', configGroup: 'storage_settings', isEnabled: true }
    });
    const secretKeyConfig = await configRepo.findOne({
      where: { configKey: 'secretKey', configGroup: 'storage_settings', isEnabled: true }
    });
    const bucketNameConfig = await configRepo.findOne({
      where: { configKey: 'bucketName', configGroup: 'storage_settings', isEnabled: true }
    });
    const regionConfig = await configRepo.findOne({
      where: { configKey: 'region', configGroup: 'storage_settings', isEnabled: true }
    });
    const customDomainConfig = await configRepo.findOne({
      where: { configKey: 'customDomain', configGroup: 'storage_settings', isEnabled: true }
    });

    let config: OSSStorageConfig = {
      storageType: storageTypeConfig?.configValue || 'local',
      accessKey: accessKeyConfig?.configValue || '',
      secretKey: secretKeyConfig?.configValue || '',
      bucketName: bucketNameConfig?.configValue || '',
      region: regionConfig?.configValue || 'oss-cn-hangzhou',
      customDomain: customDomainConfig?.configValue || ''
    };

    // 如果租户自身未配置OSS，尝试从管理后台"配置下发"读取
    if (config.storageType !== 'oss' || !config.accessKey || !config.secretKey) {
      const adminConfig = await getAdminDistributedStorageConfig();
      if (adminConfig && adminConfig.storageType === 'oss' && adminConfig.accessKey && adminConfig.secretKey) {
        config = adminConfig;
      }
    }

    cacheService.set(cacheKey, config, OSS_CONFIG_CACHE_TTL);
    return config;
  } catch (error) {
    log.warn('[OSSUploadService] 获取存储配置失败，使用默认本地模式:', error);
    return {
      storageType: 'local',
      accessKey: '',
      secretKey: '',
      bucketName: '',
      region: 'oss-cn-hangzhou'
    };
  }
}

/**
 * 从管理后台的 admin_system_config.distributedConfig.storage 读取存储配置
 */
async function getAdminDistributedStorageConfig(): Promise<OSSStorageConfig | null> {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => []);

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}');
      const storage = data?.distributedConfig?.storage;
      if (storage && storage.storageType === 'oss' && storage.accessKey && storage.secretKey && storage.secretKey !== '******') {
        return {
          storageType: 'oss',
          accessKey: storage.accessKey,
          secretKey: storage.secretKey,
          bucketName: storage.bucketName || '',
          region: storage.region || 'oss-cn-hangzhou',
          customDomain: storage.customDomain || ''
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 判断当前是否使用OSS存储
 */
export async function isOSSMode(): Promise<boolean> {
  const config = await getStorageConfig();
  return config.storageType === 'oss' &&
    !!config.accessKey &&
    !!config.secretKey &&
    !!config.bucketName &&
    !!config.region;
}

/**
 * 上传文件到OSS
 * @param filePath 本地文件绝对路径
 * @param objectKey OSS对象键名（如: uploads/products/xxx.jpg）
 * @param config 可选的OSS配置（不传则从数据库读取）
 */
export async function uploadToOSS(
  filePath: string,
  objectKey: string,
  config?: OSSStorageConfig
): Promise<OSSUploadResult> {
  try {
    const ossConfig = config || await getStorageConfig();

    if (ossConfig.storageType !== 'oss') {
      return { success: false, url: '', objectKey, error: '当前存储模式不是OSS' };
    }

    if (!ossConfig.accessKey || !ossConfig.secretKey || !ossConfig.bucketName || !ossConfig.region) {
      return { success: false, url: '', objectKey, error: 'OSS配置不完整' };
    }

    // 动态导入ali-oss（兼容CJS和ESM）
    let OSS: any;
    try {
      const aliOssModule = await import('ali-oss');
      OSS = aliOssModule.default || aliOssModule;
      if (!OSS || typeof OSS !== 'function') {
        throw new Error('ali-oss模块加载异常');
      }
    } catch {
      return { success: false, url: '', objectKey, error: 'ali-oss SDK未安装或加载失败' };
    }

    // 构建客户端配置
    const clientConfig: Record<string, any> = {
      region: ossConfig.region,
      accessKeyId: ossConfig.accessKey,
      accessKeySecret: ossConfig.secretKey,
      bucket: ossConfig.bucketName,
      secure: true,
      timeout: 30000
    };

    if (ossConfig.customDomain) {
      const endpoint = ossConfig.customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      clientConfig.endpoint = `https://${endpoint}`;
      clientConfig.cname = true;
    }

    const client = new OSS(clientConfig);

    // 上传文件
    const result = await client.put(objectKey, filePath);

    // 生成访问URL
    let fileUrl: string;
    if (ossConfig.customDomain) {
      const domain = ossConfig.customDomain.replace(/\/+$/, '');
      const protocol = domain.startsWith('http') ? '' : 'https://';
      fileUrl = `${protocol}${domain}/${objectKey}`;
    } else {
      fileUrl = result.url || `https://${ossConfig.bucketName}.${ossConfig.region}.aliyuncs.com/${objectKey}`;
    }

    log.info(`[OSSUploadService] 文件上传成功: ${objectKey} -> ${fileUrl}`);

    return {
      success: true,
      url: fileUrl,
      objectKey
    };
  } catch (error: any) {
    log.error('[OSSUploadService] 文件上传失败:', {
      objectKey,
      code: error.code,
      message: error.message
    });
    return {
      success: false,
      url: '',
      objectKey,
      error: `OSS上传失败: ${error.code || error.message || '未知错误'}`
    };
  }
}

/**
 * 从OSS删除文件
 */
export async function deleteFromOSS(objectKey: string): Promise<boolean> {
  try {
    const ossConfig = await getStorageConfig();
    if (ossConfig.storageType !== 'oss' || !ossConfig.accessKey) {
      return false;
    }

    const aliOssModule = await import('ali-oss');
    const OSS = aliOssModule.default || aliOssModule;
    if (!OSS || typeof OSS !== 'function') return false;

    const clientConfig: Record<string, any> = {
      region: ossConfig.region,
      accessKeyId: ossConfig.accessKey,
      accessKeySecret: ossConfig.secretKey,
      bucket: ossConfig.bucketName,
      secure: true
    };

    if (ossConfig.customDomain) {
      const endpoint = ossConfig.customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      clientConfig.endpoint = `https://${endpoint}`;
      clientConfig.cname = true;
    }

    const client = new OSS(clientConfig);
    await client.delete(objectKey);
    log.info(`[OSSUploadService] 文件删除成功: ${objectKey}`);
    return true;
  } catch (error: any) {
    log.warn('[OSSUploadService] 文件删除失败:', error.message);
    return false;
  }
}
