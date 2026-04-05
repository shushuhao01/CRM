/**
 * 系统模块 - 共享辅助函数
 * 包含：上传配置、multer实例、配置读写缓存函数
 */
import { SystemConfig } from '../../entities/SystemConfig';
import { getTenantRepo } from '../../utils/tenantRepo';
import { TenantContextManager } from '../../utils/tenantContext';
import { cacheService } from '../../services/CacheService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ========== 文件上传配置 ==========

// 🔥 系统配置缓存 TTL（秒）— 配置变化极少，5分钟缓存可大幅减少数据库查询
const CONFIG_CACHE_TTL = 300;

// 获取上传配置（从数据库读取maxFileSize）
const getUploadConfig = async (): Promise<{ maxFileSize: number; allowedTypes: string }> => {
  try {
    // 🔥 性能优化：使用租户感知缓存
    const tenantId = TenantContextManager.getTenantId();
    const cacheKey = cacheService.tenantKey(tenantId, 'config', 'upload');
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const configRepository = getTenantRepo(SystemConfig);
    const maxFileSizeConfig = await configRepository.findOne({
      where: { configKey: 'maxFileSize', configGroup: 'storage_settings', isEnabled: true }
    });
    const allowedTypesConfig = await configRepository.findOne({
      where: { configKey: 'allowedTypes', configGroup: 'storage_settings', isEnabled: true }
    });

    const result = {
      maxFileSize: maxFileSizeConfig ? Number(maxFileSizeConfig.configValue) : 10,
      allowedTypes: allowedTypesConfig ? allowedTypesConfig.configValue : 'jpg,png,gif,webp,jpeg'
    };
    cacheService.set(cacheKey, result, CONFIG_CACHE_TTL);
    return result;
  } catch {
    return { maxFileSize: 10, allowedTypes: 'jpg,png,gif,webp,jpeg' };
  }
};

// 创建通用图片上传存储配置
const createImageStorage = (subDir: string) => multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', subDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${subDir}-${uniqueSuffix}${ext}`);
  }
});

// 创建multer实例（默认配置，实际限制在路由中动态检查）
const createImageUpload = (subDir: string) => multer({
  storage: createImageStorage(subDir),
  limits: {
    fileSize: 50 * 1024 * 1024 // 设置一个较大的默认值，实际限制在路由中检查
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件（jpg, png, gif, webp）'));
    }
  }
});

// 各模块的上传实例
const systemImageUpload = createImageUpload('system');
const productImageUpload = createImageUpload('products');
const avatarImageUpload = createImageUpload('avatars');
const orderImageUpload = createImageUpload('orders');
const serviceImageUpload = createImageUpload('services');

// ========== 通用配置辅助函数 ==========

/**
 * 根据配置组获取配置
 * 🔥 性能优化：使用租户感知缓存（TTL 5分钟），配置变化极少但读取频繁
 */
const getConfigsByGroup = async (group: string): Promise<Record<string, unknown>> => {
  // 🔥 优先从缓存读取
  const tenantId = TenantContextManager.getTenantId();
  const cacheKey = cacheService.tenantKey(tenantId, 'config', group);
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const configRepository = getTenantRepo(SystemConfig);
  const configs = await configRepository.find({
    where: { configGroup: group, isEnabled: true },
    order: { sortOrder: 'ASC' }
  });
  const settings: Record<string, unknown> = {};
  configs.forEach(config => {
    settings[config.configKey] = config.getParsedValue();
  });

  // 写入缓存
  cacheService.set(cacheKey, settings, CONFIG_CACHE_TTL);
  return settings;
};

/**
 * 保存配置到指定组
 * 🔥 保存后自动清除对应组的缓存
 */
const saveConfigsByGroup = async (
  group: string,
  settings: Record<string, unknown>,
  configItems: Array<{key: string, type: 'string' | 'number' | 'boolean' | 'json' | 'text', desc: string}>
): Promise<void> => {
  const configRepository = getTenantRepo(SystemConfig);
  for (const item of configItems) {
    if (settings[item.key] !== undefined) {
      // 🔥 对 json 类型使用 JSON.stringify，其他类型使用 String()
      const serializedValue = item.type === 'json' && typeof settings[item.key] === 'object'
        ? JSON.stringify(settings[item.key])
        : String(settings[item.key]);

      let config = await configRepository.findOne({
        where: { configKey: item.key, configGroup: group }
      });
      if (config) {
        config.configValue = serializedValue;
        config.valueType = item.type;
      } else {
        config = configRepository.create({
          configKey: item.key,
          configValue: serializedValue,
          valueType: item.type,
          configGroup: group,
          description: item.desc,
          isEnabled: true,
          isSystem: true
        });
      }
      await configRepository.save(config);
    }
  }

  // 🔥 保存后清除该配置组的缓存，确保下次读取获取最新值
  const tenantId = TenantContextManager.getTenantId();
  const cacheKey = cacheService.tenantKey(tenantId, 'config', group);
  cacheService.delete(cacheKey);
  // 同时清除上传配置缓存（storage_settings 组会影响上传配置）
  if (group === 'storage_settings') {
    const uploadCacheKey = cacheService.tenantKey(tenantId, 'config', 'upload');
    cacheService.delete(uploadCacheKey);
  }
};

export {
  CONFIG_CACHE_TTL,
  getUploadConfig,
  createImageStorage,
  createImageUpload,
  systemImageUpload,
  productImageUpload,
  avatarImageUpload,
  orderImageUpload,
  serviceImageUpload,
  getConfigsByGroup,
  saveConfigsByGroup
};
