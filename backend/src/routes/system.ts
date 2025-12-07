import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { DepartmentController } from '../controllers/DepartmentController';
import { AppDataSource } from '../config/database';
import { SystemConfig } from '../entities/SystemConfig';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const departmentController = new DepartmentController();

// ========== 文件上传配置 ==========

// 获取上传配置（从数据库读取maxFileSize）
const getUploadConfig = async (): Promise<{ maxFileSize: number; allowedTypes: string }> => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const maxFileSizeConfig = await configRepository.findOne({
      where: { configKey: 'maxFileSize', configGroup: 'storage_settings', isEnabled: true }
    });
    const allowedTypesConfig = await configRepository.findOne({
      where: { configKey: 'allowedTypes', configGroup: 'storage_settings', isEnabled: true }
    });

    return {
      maxFileSize: maxFileSizeConfig ? Number(maxFileSizeConfig.configValue) : 10, // 默认10MB
      allowedTypes: allowedTypesConfig ? allowedTypesConfig.configValue : 'jpg,png,gif,webp,jpeg'
    };
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
 */
const getConfigsByGroup = async (group: string): Promise<Record<string, unknown>> => {
  const configRepository = AppDataSource.getRepository(SystemConfig);
  const configs = await configRepository.find({
    where: { configGroup: group, isEnabled: true },
    order: { sortOrder: 'ASC' }
  });
  const settings: Record<string, unknown> = {};
  configs.forEach(config => {
    settings[config.configKey] = config.getParsedValue();
  });
  return settings;
};

/**
 * 保存配置到指定组
 */
const saveConfigsByGroup = async (
  group: string,
  settings: Record<string, unknown>,
  configItems: Array<{key: string, type: 'string' | 'number' | 'boolean' | 'json' | 'text', desc: string}>
): Promise<void> => {
  const configRepository = AppDataSource.getRepository(SystemConfig);
  for (const item of configItems) {
    if (settings[item.key] !== undefined) {
      let config = await configRepository.findOne({
        where: { configKey: item.key, configGroup: group }
      });
      if (config) {
        config.configValue = String(settings[item.key]);
        config.valueType = item.type;
      } else {
        config = configRepository.create({
          configKey: item.key,
          configValue: String(settings[item.key]),
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
};

/**
 * 系统管理路由
 */

// ========== 公共路由（只需要登录，不需要管理员权限）==========

/**
 * @route GET /api/v1/system/global-config
 * @desc 获取全局配置（所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/global-config', authenticateToken, (_req, res) => {
  res.json({
    success: true,
    data: {
      storageConfig: {
        mode: 'local',
        autoSync: true,
        syncInterval: 30,
        apiEndpoint: '/api/v1',
        lastUpdatedBy: 'system',
        lastUpdatedAt: new Date().toISOString(),
        version: 1
      }
    }
  });
});

// ========== 文件上传路由 ==========

/**
 * 获取存储配置（从数据库读取localDomain等）
 */
const getStorageConfig = async (): Promise<{ localDomain: string; storageType: string }> => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const localDomainConfig = await configRepository.findOne({
      where: { configKey: 'localDomain', configGroup: 'storage_settings', isEnabled: true }
    });
    const storageTypeConfig = await configRepository.findOne({
      where: { configKey: 'storageType', configGroup: 'storage_settings', isEnabled: true }
    });

    return {
      localDomain: localDomainConfig?.configValue || '',
      storageType: storageTypeConfig?.configValue || 'local'
    };
  } catch {
    return { localDomain: '', storageType: 'local' };
  }
};

/**
 * 通用图片上传处理函数
 */
const handleImageUpload = async (req: Request, res: Response, subDir: string) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的图片文件'
      });
    }

    // 获取上传配置，检查文件大小
    const uploadConfig = await getUploadConfig();
    const maxSizeBytes = uploadConfig.maxFileSize * 1024 * 1024;

    if (req.file.size > maxSizeBytes) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `文件大小超过限制，最大允许 ${uploadConfig.maxFileSize}MB`
      });
    }

    // 获取存储配置中的访问域名
    const storageConfig = await getStorageConfig();

    // 优先使用数据库配置的域名，其次使用环境变量，最后使用请求的host
    let baseUrl = storageConfig.localDomain;
    if (!baseUrl) {
      const protocol = req.protocol;
      const host = req.get('host');
      baseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;
    }

    // 移除末尾的斜杠
    baseUrl = baseUrl.replace(/\/$/, '');

    // 生成图片URL - 使用相对路径，让前端通过 Nginx 代理访问
    // 注意：这里使用 /uploads 而不是 /api/v1/uploads，因为后端静态文件服务配置的是 /uploads
    const imageUrl = `/uploads/${subDir}/${req.file.filename}`;

    res.json({
      success: true,
      message: '图片上传成功',
      data: {
        url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('图片上传失败:', error);
    res.status(500).json({
      success: false,
      message: '图片上传失败'
    });
  }
};

/**
 * @route GET /api/v1/system/upload-config
 * @desc 获取上传配置（文件大小限制等）
 * @access Private
 */
router.get('/upload-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const config = await getUploadConfig();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取上传配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取上传配置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/upload-image
 * @desc 上传系统图片（Logo、二维码等）
 * @access Private (Admin)
 */
router.post('/upload-image', authenticateToken, requireAdmin, systemImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'system');
});

/**
 * @route POST /api/v1/system/upload-product-image
 * @desc 上传商品图片
 * @access Private (Admin)
 */
router.post('/upload-product-image', authenticateToken, requireAdmin, productImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'products');
});

/**
 * @route POST /api/v1/system/upload-avatar
 * @desc 上传用户头像
 * @access Private
 */
router.post('/upload-avatar', authenticateToken, avatarImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'avatars');
});

/**
 * @route POST /api/v1/system/upload-order-image
 * @desc 上传订单相关图片（定金凭证等）
 * @access Private
 */
router.post('/upload-order-image', authenticateToken, orderImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'orders');
});

/**
 * @route POST /api/v1/system/upload-service-image
 * @desc 上传售后服务图片
 * @access Private
 */
router.post('/upload-service-image', authenticateToken, serviceImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'services');
});

/**
 * @route DELETE /api/v1/system/delete-image
 * @desc 删除系统图片
 * @access Private (Admin)
 */
router.delete('/delete-image', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的文件名'
      });
    }

    // 安全检查：只允许删除system目录下的文件
    const filePath = path.join(process.cwd(), 'uploads', 'system', path.basename(filename));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: '图片删除成功'
    });
  } catch (error) {
    console.error('图片删除失败:', error);
    res.status(500).json({
      success: false,
      message: '图片删除失败'
    });
  }
});

// ========== 基本设置路由 ==========

/**
 * @route GET /api/v1/system/basic-settings
 * @desc 获取系统基本设置
 * @access Private (All authenticated users)
 */
router.get('/basic-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);

    // 获取所有基本设置配置
    const configs = await configRepository.find({
      where: { configGroup: 'basic_settings', isEnabled: true },
      order: { sortOrder: 'ASC' }
    });

    // 转换为键值对格式
    const settings: Record<string, unknown> = {};
    configs.forEach(config => {
      settings[config.configKey] = config.getParsedValue();
    });

    // 设置默认值
    const defaultSettings = {
      systemName: settings.systemName || 'CRM客户管理系统',
      systemVersion: settings.systemVersion || '1.0.0',
      companyName: settings.companyName || '',
      contactPhone: settings.contactPhone || '',
      contactEmail: settings.contactEmail || '',
      websiteUrl: settings.websiteUrl || '',
      companyAddress: settings.companyAddress || '',
      systemDescription: settings.systemDescription || '',
      systemLogo: settings.systemLogo || '',
      contactQRCode: settings.contactQRCode || '',
      contactQRCodeLabel: settings.contactQRCodeLabel || '扫码联系'
    };

    res.json({
      success: true,
      data: { ...defaultSettings, ...settings }
    });
  } catch (error) {
    console.error('获取基本设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取基本设置失败'
    });
  }
});

/**
 * @route PUT /api/v1/system/basic-settings
 * @desc 更新系统基本设置
 * @access Private (Admin)
 */
router.put('/basic-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const settings = req.body;

    // 定义需要保存的配置项
    const configItems = [
      { key: 'systemName', type: 'string' as const, desc: '系统名称' },
      { key: 'systemVersion', type: 'string' as const, desc: '系统版本' },
      { key: 'companyName', type: 'string' as const, desc: '公司名称' },
      { key: 'contactPhone', type: 'string' as const, desc: '联系电话' },
      { key: 'contactEmail', type: 'string' as const, desc: '联系邮箱' },
      { key: 'websiteUrl', type: 'string' as const, desc: '网站地址' },
      { key: 'companyAddress', type: 'string' as const, desc: '公司地址' },
      { key: 'systemDescription', type: 'text' as const, desc: '系统描述' },
      { key: 'systemLogo', type: 'text' as const, desc: '系统Logo' },
      { key: 'contactQRCode', type: 'text' as const, desc: '联系二维码' },
      { key: 'contactQRCodeLabel', type: 'string' as const, desc: '二维码标签' }
    ];

    // 保存或更新每个配置项
    for (const item of configItems) {
      if (settings[item.key] !== undefined) {
        let config = await configRepository.findOne({
          where: { configKey: item.key, configGroup: 'basic_settings' }
        });

        if (config) {
          // 更新现有配置
          config.configValue = String(settings[item.key]);
          config.valueType = item.type;
        } else {
          // 创建新配置
          config = configRepository.create({
            configKey: item.key,
            configValue: String(settings[item.key]),
            valueType: item.type,
            configGroup: 'basic_settings',
            description: item.desc,
            isEnabled: true,
            isSystem: true
          });
        }

        await configRepository.save(config);
      }
    }

    res.json({
      success: true,
      message: '基本设置保存成功',
      data: settings
    });
  } catch (error) {
    console.error('保存基本设置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存基本设置失败'
    });
  }
});

// ========== 安全设置路由 ==========

/**
 * @route GET /api/v1/system/security-settings
 * @desc 获取安全设置
 * @access Private (Admin)
 */
router.get('/security-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('security_settings');
    const defaultSettings = {
      passwordMinLength: 6,
      passwordComplexity: [],
      passwordExpireDays: 0,
      loginFailLock: false,
      maxLoginFails: 5,
      lockDuration: 30,
      sessionTimeout: 120,
      forceHttps: false,
      ipWhitelist: ''
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取安全设置失败:', error);
    res.status(500).json({ success: false, message: '获取安全设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/security-settings
 * @desc 更新安全设置
 * @access Private (Admin)
 */
router.put('/security-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'passwordMinLength', type: 'number' as const, desc: '密码最小长度' },
      { key: 'passwordComplexity', type: 'json' as const, desc: '密码复杂度要求' },
      { key: 'passwordExpireDays', type: 'number' as const, desc: '密码有效期(天)' },
      { key: 'loginFailLock', type: 'boolean' as const, desc: '登录失败锁定' },
      { key: 'maxLoginFails', type: 'number' as const, desc: '最大失败次数' },
      { key: 'lockDuration', type: 'number' as const, desc: '锁定时间(分钟)' },
      { key: 'sessionTimeout', type: 'number' as const, desc: '会话超时时间(分钟)' },
      { key: 'forceHttps', type: 'boolean' as const, desc: '强制HTTPS' },
      { key: 'ipWhitelist', type: 'text' as const, desc: 'IP白名单' }
    ];
    await saveConfigsByGroup('security_settings', settings, configItems);
    res.json({ success: true, message: '安全设置保存成功', data: settings });
  } catch (error) {
    console.error('保存安全设置失败:', error);
    res.status(500).json({ success: false, message: '保存安全设置失败' });
  }
});

// ========== 通话设置路由 ==========

/**
 * @route GET /api/v1/system/call-settings
 * @desc 获取通话设置
 * @access Private (Admin)
 */
router.get('/call-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('call_settings');
    const defaultSettings = {
      sipServer: '',
      sipPort: 5060,
      sipUsername: '',
      sipPassword: '',
      sipTransport: 'UDP',
      autoAnswer: false,
      autoRecord: false,
      qualityMonitoring: false,
      incomingCallPopup: true,
      maxCallDuration: 3600,
      recordFormat: 'mp3',
      recordQuality: 'standard',
      recordPath: './recordings',
      recordRetentionDays: 90,
      outboundPermission: ['admin', 'manager', 'sales'],
      recordAccessPermission: ['admin', 'manager'],
      statisticsPermission: ['admin', 'manager'],
      numberRestriction: false,
      allowedPrefixes: ''
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取通话设置失败:', error);
    res.status(500).json({ success: false, message: '获取通话设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/call-settings
 * @desc 更新通话设置
 * @access Private (Admin)
 */
router.put('/call-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'sipServer', type: 'string' as const, desc: 'SIP服务器地址' },
      { key: 'sipPort', type: 'number' as const, desc: 'SIP端口' },
      { key: 'sipUsername', type: 'string' as const, desc: 'SIP用户名' },
      { key: 'sipPassword', type: 'string' as const, desc: 'SIP密码' },
      { key: 'sipTransport', type: 'string' as const, desc: '传输协议' },
      { key: 'autoAnswer', type: 'boolean' as const, desc: '自动接听' },
      { key: 'autoRecord', type: 'boolean' as const, desc: '自动录音' },
      { key: 'qualityMonitoring', type: 'boolean' as const, desc: '通话质量监控' },
      { key: 'incomingCallPopup', type: 'boolean' as const, desc: '呼入弹窗' },
      { key: 'maxCallDuration', type: 'number' as const, desc: '最大通话时长(秒)' },
      { key: 'recordFormat', type: 'string' as const, desc: '录音格式' },
      { key: 'recordQuality', type: 'string' as const, desc: '录音质量' },
      { key: 'recordPath', type: 'string' as const, desc: '录音保存路径' },
      { key: 'recordRetentionDays', type: 'number' as const, desc: '录音保留时间(天)' },
      { key: 'outboundPermission', type: 'json' as const, desc: '外呼权限' },
      { key: 'recordAccessPermission', type: 'json' as const, desc: '录音访问权限' },
      { key: 'statisticsPermission', type: 'json' as const, desc: '通话统计权限' },
      { key: 'numberRestriction', type: 'boolean' as const, desc: '号码限制' },
      { key: 'allowedPrefixes', type: 'text' as const, desc: '允许的号码前缀' }
    ];
    await saveConfigsByGroup('call_settings', settings, configItems);
    res.json({ success: true, message: '通话设置保存成功', data: settings });
  } catch (error) {
    console.error('保存通话设置失败:', error);
    res.status(500).json({ success: false, message: '保存通话设置失败' });
  }
});

// ========== 邮件设置路由 ==========

/**
 * @route GET /api/v1/system/email-settings
 * @desc 获取邮件设置
 * @access Private (Admin)
 */
router.get('/email-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('email_settings');
    const defaultSettings = {
      smtpHost: '',
      smtpPort: 587,
      senderEmail: '',
      senderName: '',
      emailPassword: '',
      enableSsl: true,
      enableTls: false,
      testEmail: ''
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取邮件设置失败:', error);
    res.status(500).json({ success: false, message: '获取邮件设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/email-settings
 * @desc 更新邮件设置
 * @access Private (Admin)
 */
router.put('/email-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'smtpHost', type: 'string' as const, desc: 'SMTP服务器地址' },
      { key: 'smtpPort', type: 'number' as const, desc: 'SMTP端口' },
      { key: 'senderEmail', type: 'string' as const, desc: '发件人邮箱' },
      { key: 'senderName', type: 'string' as const, desc: '发件人名称' },
      { key: 'emailPassword', type: 'string' as const, desc: '邮箱密码' },
      { key: 'enableSsl', type: 'boolean' as const, desc: '启用SSL' },
      { key: 'enableTls', type: 'boolean' as const, desc: '启用TLS' },
      { key: 'testEmail', type: 'string' as const, desc: '测试邮箱' }
    ];
    await saveConfigsByGroup('email_settings', settings, configItems);
    res.json({ success: true, message: '邮件设置保存成功', data: settings });
  } catch (error) {
    console.error('保存邮件设置失败:', error);
    res.status(500).json({ success: false, message: '保存邮件设置失败' });
  }
});

// ========== 短信设置路由 ==========

/**
 * @route GET /api/v1/system/sms-settings
 * @desc 获取短信设置
 * @access Private (Admin)
 */
router.get('/sms-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('sms_settings');
    const defaultSettings = {
      provider: 'aliyun',
      accessKey: '',
      secretKey: '',
      signName: '',
      dailyLimit: 100,
      monthlyLimit: 3000,
      enabled: false,
      requireApproval: false,
      testPhone: ''
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取短信设置失败:', error);
    res.status(500).json({ success: false, message: '获取短信设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/sms-settings
 * @desc 更新短信设置
 * @access Private (Admin)
 */
router.put('/sms-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'provider', type: 'string' as const, desc: '短信服务商' },
      { key: 'accessKey', type: 'string' as const, desc: 'AccessKey' },
      { key: 'secretKey', type: 'string' as const, desc: 'SecretKey' },
      { key: 'signName', type: 'string' as const, desc: '短信签名' },
      { key: 'dailyLimit', type: 'number' as const, desc: '每日发送限制' },
      { key: 'monthlyLimit', type: 'number' as const, desc: '每月发送限制' },
      { key: 'enabled', type: 'boolean' as const, desc: '启用短信功能' },
      { key: 'requireApproval', type: 'boolean' as const, desc: '需要审核' },
      { key: 'testPhone', type: 'string' as const, desc: '测试手机号' }
    ];
    await saveConfigsByGroup('sms_settings', settings, configItems);
    res.json({ success: true, message: '短信设置保存成功', data: settings });
  } catch (error) {
    console.error('保存短信设置失败:', error);
    res.status(500).json({ success: false, message: '保存短信设置失败' });
  }
});

// ========== 存储设置路由 ==========

/**
 * @route GET /api/v1/system/storage-settings
 * @desc 获取存储设置
 * @access Private (All authenticated users - 上传图片需要获取配置)
 */
router.get('/storage-settings', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('storage_settings');
    const defaultSettings = {
      storageType: 'local',
      localPath: './uploads',
      localDomain: '',
      accessKey: '',
      secretKey: '',
      bucketName: '',
      region: 'oss-cn-hangzhou',
      customDomain: '',
      maxFileSize: 10,
      allowedTypes: 'jpg,png,gif,pdf,doc,docx,xls,xlsx'
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取存储设置失败:', error);
    res.status(500).json({ success: false, message: '获取存储设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/storage-settings
 * @desc 更新存储设置
 * @access Private (Admin)
 */
router.put('/storage-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'storageType', type: 'string' as const, desc: '存储类型' },
      { key: 'localPath', type: 'string' as const, desc: '本地存储路径' },
      { key: 'localDomain', type: 'string' as const, desc: '访问域名' },
      { key: 'accessKey', type: 'string' as const, desc: 'Access Key' },
      { key: 'secretKey', type: 'string' as const, desc: 'Secret Key' },
      { key: 'bucketName', type: 'string' as const, desc: '存储桶名称' },
      { key: 'region', type: 'string' as const, desc: '存储区域' },
      { key: 'customDomain', type: 'string' as const, desc: '自定义域名' },
      { key: 'maxFileSize', type: 'number' as const, desc: '最大文件大小(MB)' },
      { key: 'allowedTypes', type: 'string' as const, desc: '允许的文件类型' }
    ];
    await saveConfigsByGroup('storage_settings', settings, configItems);
    res.json({ success: true, message: '存储设置保存成功', data: settings });
  } catch (error) {
    console.error('保存存储设置失败:', error);
    res.status(500).json({ success: false, message: '保存存储设置失败' });
  }
});

// ========== 商品设置路由 ==========

/**
 * @route GET /api/v1/system/product-settings
 * @desc 获取商品设置
 * @access Private (Admin)
 */
router.get('/product-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('product_settings');
    const defaultSettings = {
      maxDiscountPercent: 50,
      adminMaxDiscount: 50,
      managerMaxDiscount: 30,
      salesMaxDiscount: 15,
      discountApprovalThreshold: 20,
      allowPriceModification: true,
      priceModificationRoles: ['admin', 'manager'],
      enablePriceHistory: true,
      pricePrecision: '2',
      enableInventory: false,
      lowStockThreshold: 10,
      allowNegativeStock: false,
      defaultCategory: '',
      maxCategoryLevel: 3,
      enableCategoryCode: false,
      costPriceViewRoles: ['super_admin', 'admin'],
      salesDataViewRoles: ['super_admin', 'admin', 'manager'],
      stockInfoViewRoles: ['super_admin', 'admin', 'manager'],
      operationLogsViewRoles: ['super_admin', 'admin'],
      sensitiveInfoHideMethod: 'asterisk',
      enablePermissionControl: true
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取商品设置失败:', error);
    res.status(500).json({ success: false, message: '获取商品设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/product-settings
 * @desc 更新商品设置
 * @access Private (Admin)
 */
router.put('/product-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'maxDiscountPercent', type: 'number' as const, desc: '全局最大优惠比例' },
      { key: 'adminMaxDiscount', type: 'number' as const, desc: '管理员最大优惠' },
      { key: 'managerMaxDiscount', type: 'number' as const, desc: '经理最大优惠' },
      { key: 'salesMaxDiscount', type: 'number' as const, desc: '销售员最大优惠' },
      { key: 'discountApprovalThreshold', type: 'number' as const, desc: '优惠审批阈值' },
      { key: 'allowPriceModification', type: 'boolean' as const, desc: '允许价格修改' },
      { key: 'priceModificationRoles', type: 'json' as const, desc: '价格修改权限' },
      { key: 'enablePriceHistory', type: 'boolean' as const, desc: '价格变动记录' },
      { key: 'pricePrecision', type: 'string' as const, desc: '价格显示精度' },
      { key: 'enableInventory', type: 'boolean' as const, desc: '启用库存管理' },
      { key: 'lowStockThreshold', type: 'number' as const, desc: '低库存预警阈值' },
      { key: 'allowNegativeStock', type: 'boolean' as const, desc: '允许负库存销售' },
      { key: 'defaultCategory', type: 'string' as const, desc: '默认分类' },
      { key: 'maxCategoryLevel', type: 'number' as const, desc: '分类层级限制' },
      { key: 'enableCategoryCode', type: 'boolean' as const, desc: '启用分类编码' },
      { key: 'costPriceViewRoles', type: 'json' as const, desc: '成本价格查看权限' },
      { key: 'salesDataViewRoles', type: 'json' as const, desc: '销售数据查看权限' },
      { key: 'stockInfoViewRoles', type: 'json' as const, desc: '库存信息查看权限' },
      { key: 'operationLogsViewRoles', type: 'json' as const, desc: '操作日志查看权限' },
      { key: 'sensitiveInfoHideMethod', type: 'string' as const, desc: '敏感信息隐藏方式' },
      { key: 'enablePermissionControl', type: 'boolean' as const, desc: '启用权限控制' }
    ];
    await saveConfigsByGroup('product_settings', settings, configItems);
    res.json({ success: true, message: '商品设置保存成功', data: settings });
  } catch (error) {
    console.error('保存商品设置失败:', error);
    res.status(500).json({ success: false, message: '保存商品设置失败' });
  }
});

// ========== 数据备份设置路由 ==========

/**
 * @route GET /api/v1/system/backup-settings
 * @desc 获取数据备份设置
 * @access Private (Admin)
 */
router.get('/backup-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('backup_settings');
    const defaultSettings = {
      autoBackupEnabled: false,
      backupFrequency: 'daily',
      retentionDays: 30,
      compression: true
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取数据备份设置失败:', error);
    res.status(500).json({ success: false, message: '获取数据备份设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/backup-settings
 * @desc 更新数据备份设置
 * @access Private (Admin)
 */
router.put('/backup-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'autoBackupEnabled', type: 'boolean' as const, desc: '自动备份' },
      { key: 'backupFrequency', type: 'string' as const, desc: '备份频率' },
      { key: 'retentionDays', type: 'number' as const, desc: '保留天数' },
      { key: 'compression', type: 'boolean' as const, desc: '压缩备份' }
    ];
    await saveConfigsByGroup('backup_settings', settings, configItems);
    res.json({ success: true, message: '数据备份设置保存成功', data: settings });
  } catch (error) {
    console.error('保存数据备份设置失败:', error);
    res.status(500).json({ success: false, message: '保存数据备份设置失败' });
  }
});

// ========== 用户协议设置路由 ==========

/**
 * @route GET /api/v1/system/agreement-settings
 * @desc 获取用户协议设置
 * @access Private (Admin)
 */
router.get('/agreement-settings', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('agreement_settings');
    const defaultSettings = {
      userAgreementEnabled: true,
      userAgreementTitle: '用户服务协议',
      userAgreementContent: '',
      privacyAgreementEnabled: true,
      privacyAgreementTitle: '隐私政策',
      privacyAgreementContent: ''
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    console.error('获取用户协议设置失败:', error);
    res.status(500).json({ success: false, message: '获取用户协议设置失败' });
  }
});

/**
 * @route PUT /api/v1/system/agreement-settings
 * @desc 更新用户协议设置
 * @access Private (Admin)
 */
router.put('/agreement-settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    const configItems = [
      { key: 'userAgreementEnabled', type: 'boolean' as const, desc: '用户协议启用' },
      { key: 'userAgreementTitle', type: 'string' as const, desc: '用户协议标题' },
      { key: 'userAgreementContent', type: 'text' as const, desc: '用户协议内容' },
      { key: 'privacyAgreementEnabled', type: 'boolean' as const, desc: '隐私协议启用' },
      { key: 'privacyAgreementTitle', type: 'string' as const, desc: '隐私协议标题' },
      { key: 'privacyAgreementContent', type: 'text' as const, desc: '隐私协议内容' }
    ];
    await saveConfigsByGroup('agreement_settings', settings, configItems);
    res.json({ success: true, message: '用户协议设置保存成功', data: settings });
  } catch (error) {
    console.error('保存用户协议设置失败:', error);
    res.status(500).json({ success: false, message: '保存用户协议设置失败' });
  }
});

// ========== 管理员路由（需要管理员权限）==========

/**
 * @route PUT /api/v1/system/global-config
 * @desc 更新全局配置（仅管理员可操作）
 * @access Private (Admin)
 */
router.put('/global-config', authenticateToken, requireAdmin, (req, res) => {
  const { storageConfig } = req.body;

  // 这里应该保存到数据库，目前返回模拟数据
  res.json({
    success: true,
    message: '全局配置已更新',
    data: {
      storageConfig: {
        ...storageConfig,
        lastUpdatedAt: new Date().toISOString(),
        version: (storageConfig.version || 1) + 1
      }
    }
  });
});

/**
 * @route GET /api/v1/system/info
 * @desc 获取系统信息
 * @access Private (Admin)
 */
router.get('/info', authenticateToken, requireAdmin, (_req, res) => {
  res.json({
    success: true,
    message: '系统管理功能开发中',
    data: {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// ========== 部门管理路由（需要管理员权限）==========
// 为部门路由添加认证和管理员权限中间件

/**
 * @route GET /api/v1/system/departments
 * @desc 获取部门列表
 * @access Private (Admin)
 */
router.get('/departments', authenticateToken, requireAdmin, departmentController.getDepartments.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/tree
 * @desc 获取部门树形结构
 * @access Private (Admin)
 */
router.get('/departments/tree', authenticateToken, requireAdmin, departmentController.getDepartmentTree.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/stats
 * @desc 获取部门统计信息
 * @access Private (Admin)
 */
router.get('/departments/stats', authenticateToken, requireAdmin, departmentController.getDepartmentStats.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id
 * @desc 获取部门详情
 * @access Private (Admin)
 */
router.get('/departments/:id', authenticateToken, requireAdmin, departmentController.getDepartmentById.bind(departmentController));

/**
 * @route POST /api/v1/system/departments
 * @desc 创建部门
 * @access Private (Admin)
 */
router.post('/departments', authenticateToken, requireAdmin, departmentController.createDepartment.bind(departmentController));

/**
 * @route PUT /api/v1/system/departments/:id
 * @desc 更新部门
 * @access Private (Admin)
 */
router.put('/departments/:id', authenticateToken, requireAdmin, departmentController.updateDepartment.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/status
 * @desc 更新部门状态
 * @access Private (Admin)
 */
router.patch('/departments/:id/status', authenticateToken, requireAdmin, departmentController.updateDepartmentStatus.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:id
 * @desc 删除部门
 * @access Private (Admin)
 */
router.delete('/departments/:id', authenticateToken, requireAdmin, departmentController.deleteDepartment.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id/members
 * @desc 获取部门成员
 * @access Private (Admin)
 */
router.get('/departments/:id/members', authenticateToken, requireAdmin, departmentController.getDepartmentMembers.bind(departmentController));

/**
 * @route GET /api/v1/system/departments/:id/roles
 * @desc 获取部门角色列表
 * @access Private (Admin)
 */
router.get('/departments/:id/roles', authenticateToken, requireAdmin, departmentController.getDepartmentRoles.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/permissions
 * @desc 更新部门权限
 * @access Private (Admin)
 */
router.patch('/departments/:id/permissions', authenticateToken, requireAdmin, departmentController.updateDepartmentPermissions.bind(departmentController));

/**
 * @route PATCH /api/v1/system/departments/:id/move
 * @desc 移动部门
 * @access Private (Admin)
 */
router.patch('/departments/:id/move', authenticateToken, requireAdmin, departmentController.moveDepartment.bind(departmentController));

/**
 * @route POST /api/v1/system/departments/:departmentId/members
 * @desc 添加部门成员
 * @access Private (Admin)
 */
router.post('/departments/:departmentId/members', authenticateToken, requireAdmin, departmentController.addDepartmentMember.bind(departmentController));

/**
 * @route DELETE /api/v1/system/departments/:departmentId/members/:userId
 * @desc 移除部门成员
 * @access Private (Admin)
 */
router.delete('/departments/:departmentId/members/:userId', authenticateToken, requireAdmin, departmentController.removeDepartmentMember.bind(departmentController));

// ========== 订单字段配置路由 ==========

/**
 * @route GET /api/v1/system/order-field-config
 * @desc 获取订单字段配置
 * @access Private
 */
router.get('/order-field-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const config = await configRepository.findOne({
      where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
    });

    if (config) {
      res.json({ success: true, code: 200, data: JSON.parse(config.configValue) });
    } else {
      // 返回默认配置
      res.json({
        success: true,
        code: 200,
        data: {
          orderSource: {
            fieldName: '订单来源',
            options: [
              { label: '线上商城', value: 'online_store' },
              { label: '微信小程序', value: 'wechat_mini' },
              { label: '电话咨询', value: 'phone_call' },
              { label: '其他渠道', value: 'other' }
            ]
          },
          customFields: []
        }
      });
    }
  } catch (error) {
    console.error('获取订单字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取订单字段配置失败' });
  }
});

/**
 * @route PUT /api/v1/system/order-field-config
 * @desc 更新订单字段配置
 * @access Private (Admin)
 */
router.put('/order-field-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    let config = await configRepository.findOne({
      where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
    });

    if (config) {
      config.configValue = JSON.stringify(req.body);
    } else {
      config = configRepository.create({
        configKey: 'orderFieldConfig',
        configValue: JSON.stringify(req.body),
        valueType: 'json',
        configGroup: 'order_settings',
        description: '订单字段配置',
        isEnabled: true,
        isSystem: true
      });
    }

    await configRepository.save(config);
    res.json({ success: true, code: 200, message: '订单字段配置保存成功' });
  } catch (error) {
    console.error('保存订单字段配置失败:', error);
    res.status(500).json({ success: false, code: 500, message: '保存订单字段配置失败' });
  }
});

// ========== 通用设置路由 ==========

/**
 * @route GET /api/v1/system/settings
 * @desc 获取系统设置（通用）
 * @access Private
 */
router.get('/settings', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const configs = await configRepository.find({
      where: { isEnabled: true },
      order: { configGroup: 'ASC', sortOrder: 'ASC' }
    });

    const settings: Record<string, Record<string, unknown>> = {};
    configs.forEach(config => {
      if (!settings[config.configGroup]) {
        settings[config.configGroup] = {};
      }
      settings[config.configGroup][config.configKey] = config.getParsedValue();
    });

    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败'
    });
  }
});

/**
 * @route POST /api/v1/system/settings
 * @desc 保存系统设置（通用）
 * @access Private (Admin)
 */
router.post('/settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body;
    const configRepository = AppDataSource.getRepository(SystemConfig);

    if (type && config) {
      // 保存特定类型的配置
      for (const [key, value] of Object.entries(config)) {
        let existingConfig = await configRepository.findOne({
          where: { configKey: key, configGroup: type }
        });

        if (existingConfig) {
          existingConfig.configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        } else {
          existingConfig = configRepository.create({
            configKey: key,
            configValue: typeof value === 'object' ? JSON.stringify(value) : String(value),
            valueType: typeof value === 'object' ? 'json' : typeof value as 'string' | 'number' | 'boolean',
            configGroup: type,
            isEnabled: true,
            isSystem: false
          });
        }
        await configRepository.save(existingConfig);
      }
    }

    res.json({
      success: true,
      message: '设置保存成功'
    });
  } catch (error) {
    console.error('保存系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存系统设置失败'
    });
  }
});

export default router;
