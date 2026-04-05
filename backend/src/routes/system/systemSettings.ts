/**
 * 系统模块 - 设置相关路由
 * 包含：全局配置、模块状态、上传、基础/安全/通话/邮件/SMS/存储/产品/备份/协议设置、部门管理
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { DepartmentController } from '../../controllers/DepartmentController';
import { SystemConfig } from '../../entities/SystemConfig';
import { Department } from '../../entities/Department';
import { User } from '../../entities/User';
import { Module } from '../../entities/Module';
import { AppDataSource } from '../../config/database';
import { getTenantRepo } from '../../utils/tenantRepo';
import { updateTenantStorage, checkStorageLimit } from '../../middleware/checkTenantLimits';
import {
  getUploadConfig,
  systemImageUpload,
  productImageUpload,
  avatarImageUpload,
  orderImageUpload,
  serviceImageUpload,
  getConfigsByGroup,
  saveConfigsByGroup
} from './systemHelpers';
import path from 'path';
import fs from 'fs';

import { log } from '../../config/logger';
const departmentController = new DepartmentController();

export function registerSettingsRoutes(router: Router): void {
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

/**
 * @route GET /api/v1/system/modules/status
 * @desc 获取启用的模块列表（供CRM前端控制菜单显示）
 * @access Private (All authenticated users)
 */
router.get('/modules/status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const moduleRepository = AppDataSource.getRepository(Module);

    // 获取所有启用的模块
    const enabledModules = await moduleRepository.find({
      where: { status: 'enabled' },
      select: ['code']
    });

    // 模块代码映射：Admin后台模块代码 -> CRM前端菜单ID
    const moduleMapping: Record<string, string> = {
      'order_management': 'order',
      'customer_management': 'customer',
      'finance_management': 'finance',
      'logistics_management': 'logistics',
      'aftersales_management': 'service',
      'call_management': 'service-management',
      'data_management': 'data',
      'performance_management': 'performance',
      'product_management': 'product',
      'system_management': 'system'
    };

    // 转换为CRM前端的菜单ID
    let menuIds = enabledModules
      .map(m => moduleMapping[m.code])
      .filter(id => id !== undefined);

    // 始终包含dashboard（数据看板）
    if (!menuIds.includes('dashboard')) {
      menuIds.unshift('dashboard');
    }

    // 🔥 SaaS模式：与租户的features（模块ID列表）取交集，只返回该租户被授权的模块
    const tenantId = (_req as any).tenantId;
    if (tenantId) {
      try {
        const tenantRows = await AppDataSource.query(
          `SELECT t.features, p.modules as package_modules FROM tenants t
           LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`,
          [tenantId]
        );
        if (tenantRows.length > 0) {
          const tenant = tenantRows[0];
          let tenantModules: string[] | null = null;
          let pkgModulesParsed: string[] | null = null;

          // 先解析套餐模块
          if (tenant.package_modules) {
            try {
              const pkgModules = typeof tenant.package_modules === 'string' ? JSON.parse(tenant.package_modules) : tenant.package_modules;
              if (Array.isArray(pkgModules) && pkgModules.length > 0) {
                pkgModulesParsed = pkgModules;
              }
            } catch { /* ignore */ }
          }

          // 尝试从tenant.features解析模块ID列表
          if (tenant.features) {
            try {
              const parsed = typeof tenant.features === 'string' ? JSON.parse(tenant.features) : tenant.features;
              if (Array.isArray(parsed)) {
                const validModuleIds = ['dashboard','customer','order','service-management','performance','logistics','service','data','finance','product','system'];
                const hasModuleIds = parsed.some((f: string) => validModuleIds.includes(f));
                if (hasModuleIds) {
                  const validFeatures = parsed.filter((f: string) => validModuleIds.includes(f));
                  // 🔥 如果租户features的模块少于套餐模块，优先使用套餐模块（守恒定律）
                  if (pkgModulesParsed && validFeatures.length < pkgModulesParsed.length) {
                    tenantModules = pkgModulesParsed;
                  } else {
                    tenantModules = validFeatures;
                  }
                }
              }
            } catch { /* ignore parse error */ }
          }

          // 如果features不含有效模块ID，使用套餐package_modules
          if (!tenantModules && pkgModulesParsed) {
            tenantModules = pkgModulesParsed;
          }

          // 如果有租户模块配置，取交集
          if (tenantModules && tenantModules.length > 0) {
            // dashboard始终保留
            menuIds = menuIds.filter(id => id === 'dashboard' || tenantModules!.includes(id));
            log.info(`[ModulesStatus] 租户 ${tenantId} 模块过滤: 全局启用=${enabledModules.length}, 租户授权=${tenantModules.length}, 最终=${menuIds.length}`);
          }
        }
      } catch (tenantErr) {
        log.warn('[ModulesStatus] 查询租户模块失败，使用全局配置:', (tenantErr as any).message);
      }
    }

    res.json({
      success: true,
      data: {
        enabledModules: menuIds
      }
    });
  } catch (error: any) {
    log.error('[System] 获取模块状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取模块状态失败',
      error: error.message
    });
  }
});

// ========== 文件上传路由 ==========

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

    // 生成图片URL - 使用相对路径，让前端通过 Nginx 代理访问
    // 注意：这里使用 /uploads 而不是 /api/v1/uploads，因为后端静态文件服务配置的是 /uploads
    const imageUrl = `/uploads/${subDir}/${req.file.filename}`;

    // 🔥 更新租户存储空间统计（SaaS模式下）
    const tenantId = (req as any).tenantId;
    if (tenantId && req.file.size) {
      const fileSizeMb = req.file.size / (1024 * 1024);
      await updateTenantStorage(tenantId, fileSizeMb).catch((err: any) => {
        log.warn('[Upload] 更新租户存储空间统计失败:', err.message);
      });
    }

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
    log.error('图片上传失败:', error);
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
    log.error('获取上传配置失败:', error);
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
router.post('/upload-image', authenticateToken, requireAdmin, checkStorageLimit, systemImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'system');
});

/**
 * @route POST /api/v1/system/upload-product-image
 * @desc 上传商品图片
 * @access Private (Admin)
 */
router.post('/upload-product-image', authenticateToken, requireAdmin, checkStorageLimit, productImageUpload.single('image'), (req: Request, res: Response) => {
  log.info('[Upload] 收到商品图片上传请求');
  log.info('[Upload] 用户:', (req as any).user?.username, '角色:', (req as any).user?.role);
  log.info('[Upload] 文件:', req.file ? req.file.originalname : '无文件');
  handleImageUpload(req, res, 'products');
});

/**
 * @route POST /api/v1/system/upload-avatar
 * @desc 上传用户头像
 * @access Private
 */
router.post('/upload-avatar', authenticateToken, checkStorageLimit, avatarImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'avatars');
});

/**
 * @route POST /api/v1/system/upload-order-image
 * @desc 上传订单相关图片（定金凭证等）
 * @access Private
 */
router.post('/upload-order-image', authenticateToken, checkStorageLimit, orderImageUpload.single('image'), (req: Request, res: Response) => {
  handleImageUpload(req, res, 'orders');
});

/**
 * @route POST /api/v1/system/upload-service-image
 * @desc 上传售后服务图片
 * @access Private
 */
router.post('/upload-service-image', authenticateToken, checkStorageLimit, serviceImageUpload.single('image'), (req: Request, res: Response) => {
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
    log.error('图片删除失败:', error);
    res.status(500).json({
      success: false,
      message: '图片删除失败'
    });
  }
});

// ========== 基本设置路由 ==========

/**
 * @route GET /api/v1/system/basic-settings/public
 * @desc 获取系统基本设置（公开API，无需认证）
 * @access Public
 */
router.get('/basic-settings/public', async (_req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);

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

    // 只返回公开需要的字段
    const publicSettings = {
      systemName: settings.systemName || 'CRM客户管理系统',
      systemVersion: settings.systemVersion || '1.0.0',
      companyName: settings.companyName || '',
      websiteUrl: settings.websiteUrl || '',
      copyrightText: settings.copyrightText || '',
      icpNumber: settings.icpNumber || '',
      policeNumber: settings.policeNumber || '',
      techSupport: settings.techSupport || ''
    };

    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    log.error('获取公开基本设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取基本设置失败'
    });
  }
});

// ========== 模块状态接口已在上方定义，此处删除重复定义 ==========

/**
 * @route GET /api/v1/system/basic-settings
 * @desc 获取系统基本设置
 * @access Private (All authenticated users)
 */
router.get('/basic-settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const configRepository = getTenantRepo(SystemConfig);

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
      contactQRCodeLabel: settings.contactQRCodeLabel || '扫码联系',
      copyrightText: settings.copyrightText || '',
      icpNumber: settings.icpNumber || '',
      policeNumber: settings.policeNumber || '',
      techSupport: settings.techSupport || ''
    };

    res.json({
      success: true,
      data: { ...defaultSettings, ...settings }
    });
  } catch (error) {
    log.error('获取基本设置失败:', error);
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
    const configRepository = getTenantRepo(SystemConfig);
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
      { key: 'contactQRCodeLabel', type: 'string' as const, desc: '二维码标签' },
      { key: 'copyrightText', type: 'string' as const, desc: '版权文字' },
      { key: 'icpNumber', type: 'string' as const, desc: 'ICP备案号' },
      { key: 'policeNumber', type: 'string' as const, desc: '公安备案号' },
      { key: 'techSupport', type: 'string' as const, desc: '技术支持' }
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
    log.error('保存基本设置失败:', error);
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
      ipWhitelist: '',
      secureConsoleEnabled: true  // 控制台日志加密开关（默认启用）
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    log.error('获取安全设置失败:', error);
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
      { key: 'ipWhitelist', type: 'text' as const, desc: 'IP白名单' },
      { key: 'secureConsoleEnabled', type: 'boolean' as const, desc: '控制台日志加密' }
    ];
    await saveConfigsByGroup('security_settings', settings, configItems);
    res.json({ success: true, message: '安全设置保存成功', data: settings });
  } catch (error) {
    log.error('保存安全设置失败:', error);
    res.status(500).json({ success: false, message: '保存安全设置失败' });
  }
});

/**
 * @route GET /api/v1/system/console-security-config
 * @desc 获取控制台安全配置（公开接口，所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/console-security-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('security_settings');
    // 默认启用：只有明确设置为false时才关闭，未配置或true都视为启用
    const secureConsoleEnabled = settings.secureConsoleEnabled !== false && settings.secureConsoleEnabled !== 'false';

    res.json({
      success: true,
      data: {
        secureConsoleEnabled
      }
    });
  } catch (error) {
    log.error('获取控制台安全配置失败:', error);
    // 异常时也默认返回启用
    res.json({ success: true, data: { secureConsoleEnabled: true } });
  }
});

/**
 * @route GET /api/v1/system/admin-encryption-status
 * @desc 查询管理后台是否强制启用控制台加密（公开接口，所有登录用户可访问）
 * @access Private (All authenticated users)
 *
 * 逻辑：直接读取管理后台 system_config 表的 admin_system_config
 * 如果 enableConsoleEncryption === true → 管理后台强制加密，CRM端不可关闭
 * 如果未配置或为 false → CRM端可自行控制
 * SaaS和私有部署均适用
 */
router.get('/admin-encryption-status', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // 直接查管理后台配置表（非租户隔离表）
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => []);

    let adminForcedEncryption = false;

    if (result && result.length > 0) {
      try {
        const data = JSON.parse(result[0].config_value || '{}');
        // 管理后台明确启用加密 → 强制
        adminForcedEncryption = data.enableConsoleEncryption === true;
      } catch {
        // JSON解析失败，默认不强制
      }
    }

    res.json({
      success: true,
      data: {
        adminForcedEncryption
      }
    });
  } catch (error) {
    log.error('查询管理后台加密状态失败:', error);
    // 查询失败时默认不强制（安全降级，让租户可自行控制）
    res.json({ success: true, data: { adminForcedEncryption: false } });
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
    log.error('获取通话设置失败:', error);
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
    log.error('保存通话设置失败:', error);
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
    log.error('获取邮件设置失败:', error);
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
    log.error('保存邮件设置失败:', error);
    res.status(500).json({ success: false, message: '保存邮件设置失败' });
  }
});

/**
 * @route POST /api/v1/system/email-settings/test
 * @desc 测试邮件发送
 * @access Private (Admin)
 */
router.post('/email-settings/test', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, senderEmail, senderName, emailPassword, enableSsl, enableTls, testEmail } = req.body;

    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return res.status(400).json({ success: false, message: '请输入正确的测试邮箱地址' });
    }

    // 如果密码是脱敏值，从数据库读取真实密码
    let actualPassword = emailPassword;
    if (emailPassword === '******' || !emailPassword) {
      const savedSettings = await getConfigsByGroup('email_settings');
      actualPassword = savedSettings.emailPassword as string || '';
    }

    if (!smtpHost || !smtpPort || !senderEmail || !actualPassword) {
      return res.status(400).json({ success: false, message: '请完整填写并保存邮件配置后再测试' });
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: enableSsl,
      auth: { user: senderEmail, pass: actualPassword },
      tls: enableTls ? { rejectUnauthorized: false } : undefined
    });

    await transporter.sendMail({
      from: `"${senderName || 'CRM系统'}" <${senderEmail}>`,
      to: testEmail,
      subject: '测试邮件 - CRM系统',
      html: `
        <div style="padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #409eff;">这是一封测试邮件</h2>
          <p>如果您收到这封邮件，说明邮件配置正确。</p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            发送时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
          </p>
        </div>
      `
    });

    res.json({ success: true, message: '测试邮件已发送，请查收' });
  } catch (error: any) {
    log.error('测试邮件发送失败:', error);

    // 针对常见SMTP错误提供友好的中文提示
    let friendlyMessage = '发送失败，请检查配置';
    const errMsg = (error.message || '').toLowerCase();
    const errCode = error.responseCode || error.code || '';
    const reqHost = req.body.smtpHost || '';
    const reqPort = req.body.smtpPort || '';

    if (errMsg.includes('535') || errMsg.includes('authentication failed') || errMsg.includes('auth')) {
      friendlyMessage = '认证失败：请检查邮箱密码/授权码是否正确。163/126/QQ邮箱等需使用「授权码」而非登录密码';
    } else if (errMsg.includes('connect') || errMsg.includes('econnrefused') || errMsg.includes('timeout')) {
      friendlyMessage = `连接失败：无法连接到 ${reqHost}:${reqPort}，请检查服务器地址和端口`;
    } else if (errMsg.includes('certificate') || errMsg.includes('ssl') || errMsg.includes('tls')) {
      friendlyMessage = 'SSL/TLS错误：请检查SSL和TLS设置是否匹配端口';
    } else if (errCode === 'ENOTFOUND') {
      friendlyMessage = `DNS解析失败：找不到服务器 ${reqHost}`;
    } else if (error.message) {
      friendlyMessage = `发送失败: ${error.message}`;
    }

    res.status(500).json({ success: false, message: friendlyMessage });
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
    log.error('获取短信设置失败:', error);
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
    log.error('保存短信设置失败:', error);
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
      allowedTypes: 'jpg,png,gif,pdf,doc,docx,xls,xlsx',
      // 图片压缩配置
      imageCompressEnabled: true,
      imageCompressQuality: 'medium',
      imageCompressMaxWidth: 1200,
      imageCompressCustomQuality: 60
    };
    res.json({ success: true, data: { ...defaultSettings, ...settings } });
  } catch (error) {
    log.error('获取存储设置失败:', error);
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
      { key: 'allowedTypes', type: 'string' as const, desc: '允许的文件类型' },
      // 图片压缩配置
      { key: 'imageCompressEnabled', type: 'boolean' as const, desc: '启用图片压缩' },
      { key: 'imageCompressQuality', type: 'string' as const, desc: '压缩质量' },
      { key: 'imageCompressMaxWidth', type: 'number' as const, desc: '最大宽度' },
      { key: 'imageCompressCustomQuality', type: 'number' as const, desc: '自定义压缩比例' }
    ];
    await saveConfigsByGroup('storage_settings', settings, configItems);
    res.json({ success: true, message: '存储设置保存成功', data: settings });
  } catch (error) {
    log.error('保存存储设置失败:', error);
    res.status(500).json({ success: false, message: '保存存储设置失败' });
  }
});

/**
 * @route POST /api/v1/system/test-oss-connection
 * @desc 测试阿里云OSS连接（通过后端服务器发起，避免浏览器CORS问题）
 * @access Private (Admin)
 */
router.post('/test-oss-connection', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { accessKey, secretKey, bucketName, region, customDomain } = req.body;

    // 参数校验
    if (!accessKey || !secretKey || !bucketName || !region) {
      res.status(400).json({
        success: false,
        message: '缺少必要参数：accessKey、secretKey、bucketName、region'
      });
      return;
    }

    // 动态导入 ali-oss
    let OSS: any;
    try {
      OSS = (await import('ali-oss')).default;
    } catch {
      res.status(500).json({
        success: false,
        message: '服务器未安装 ali-oss SDK，请联系管理员执行 npm install ali-oss'
      });
      return;
    }

    // 构建OSS客户端配置
    const ossConfig: Record<string, any> = {
      region,
      accessKeyId: accessKey,
      accessKeySecret: secretKey,
      bucket: bucketName,
      secure: true,
      timeout: 10000
    };

    // 如果有自定义域名，使用CNAME模式
    if (customDomain) {
      // 去除协议前缀和末尾斜杠，提取纯域名
      const endpoint = customDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      ossConfig.endpoint = `https://${endpoint}`;
      ossConfig.cname = true;
    }

    const client = new OSS(ossConfig);

    // 测试连接：列出Bucket中的对象（最多1个）
    const listResult = await client.list({ 'max-keys': 1 });

    res.json({
      success: true,
      message: 'OSS连接测试成功',
      data: {
        bucketName,
        region,
        objectCount: listResult.objects ? listResult.objects.length : 0,
        isTruncated: listResult.isTruncated || false
      }
    });
  } catch (error: any) {
    let errorMessage = '未知错误';
    let errorCode = '';

    if (error.code) {
      errorCode = error.code;
      switch (error.code) {
        case 'InvalidAccessKeyId':
        case 'InvalidAccessKeyIdError':
          errorMessage = 'Access Key ID 无效，请检查是否填写正确';
          break;
        case 'SignatureDoesNotMatch':
        case 'SignatureDoesNotMatchError':
          errorMessage = 'Secret Key 错误或签名不匹配，请检查是否填写正确';
          break;
        case 'NoSuchBucket':
        case 'NoSuchBucketError':
          errorMessage = '存储桶不存在，请检查 Bucket 名称和区域是否匹配';
          break;
        case 'AccessDenied':
        case 'AccessDeniedError':
          errorMessage = '访问被拒绝，请检查 RAM 用户权限是否包含 oss:ListObjects';
          break;
        case 'RequestTimeTooSkewed':
          errorMessage = '请求时间偏差过大，请检查服务器系统时间';
          break;
        default:
          errorMessage = `OSS错误 [${error.code}]: ${error.message || ''}`;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    log.error('OSS连接测试失败:', { code: errorCode, message: errorMessage, stack: error.stack });

    res.status(400).json({
      success: false,
      message: `OSS连接失败: ${errorMessage}`,
      data: {
        code: errorCode,
        requestId: error.requestId || ''
      }
    });
  }
});

// ========== 商品设置路由 ==========

/**
 * @route GET /api/v1/system/product-settings/public
 * @desc 获取商品优惠折扣设置（公开给所有已登录用户）
 * @access Private (All authenticated users)
 */
router.get('/product-settings/public', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const settings = await getConfigsByGroup('product_settings');
    // 只返回优惠折扣相关的配置，不返回敏感配置
    const discountSettings = {
      maxDiscountPercent: settings.maxDiscountPercent ?? 50,
      adminMaxDiscount: settings.adminMaxDiscount ?? 50,
      managerMaxDiscount: settings.managerMaxDiscount ?? 30,
      salesMaxDiscount: settings.salesMaxDiscount ?? 15,
      discountApprovalThreshold: settings.discountApprovalThreshold ?? 20,
      allowPriceModification: settings.allowPriceModification ?? true
    };
    res.json({ success: true, data: discountSettings });
  } catch (error) {
    log.error('获取商品优惠设置失败:', error);
    res.status(500).json({ success: false, message: '获取商品优惠设置失败' });
  }
});

/**
 * @route GET /api/v1/system/product-settings
 * @desc 获取商品设置（完整配置，仅管理员）
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
    log.error('获取商品设置失败:', error);
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
    log.error('保存商品设置失败:', error);
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
    log.error('获取数据备份设置失败:', error);
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
    log.error('保存数据备份设置失败:', error);
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
    log.error('获取用户协议设置失败:', error);
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
    log.error('保存用户协议设置失败:', error);
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

// ========== 公共部门查询路由（所有登录用户可访问）==========

/**
 * @route GET /api/v1/system/my-departments
 * @desc 获取当前用户可访问的部门列表（用于团队业绩等页面）
 * @access Private (All authenticated users)
 *
 * 权限说明：
 * - 超级管理员/管理员：返回所有部门
 * - 部门经理/销售员：只返回自己所属的部门
 */
router.get('/my-departments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser;
    const userRole = currentUser?.role;
    const userDepartmentId = currentUser?.departmentId;

    log.info('[公共部门API] 用户信息:', {
      userId: currentUser?.id,
      role: userRole,
      departmentId: userDepartmentId
    });

    const departmentRepository = getTenantRepo(Department);

    // 超级管理员和管理员可以看到所有部门
    if (userRole === 'super_admin' || userRole === 'admin') {
      const departments = await departmentRepository.find({
        where: { status: 'active' },
        order: { sortOrder: 'ASC', name: 'ASC' }
      });

      log.info('[公共部门API] 管理员：返回所有部门', departments.length, '个');

      // 获取所有负责人信息
      const userRepository = getTenantRepo(User);
      const managerIds = departments.map(d => d.managerId).filter(Boolean) as string[];
      const managers = managerIds.length > 0
        ? await userRepository.find({ where: managerIds.map(id => ({ id })) })
        : [];
      const managerMap = new Map(managers.map(m => [m.id, m.name || m.username]));

      return res.json({
        success: true,
        data: departments.map(dept => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          description: dept.description,
          parentId: dept.parentId,
          level: dept.level,
          managerId: dept.managerId,
          managerName: dept.managerId ? managerMap.get(dept.managerId) || null : null,
          sortOrder: dept.sortOrder,
          status: dept.status,
          memberCount: dept.memberCount
        }))
      });
    }

    // 部门经理和销售员只能看到自己所属的部门
    if (userDepartmentId) {
      const department = await departmentRepository.findOne({
        where: { id: userDepartmentId, status: 'active' }
      });

      if (department) {
        log.info('[公共部门API] 普通用户：返回所属部门', department.name);

        // 获取负责人姓名
        let managerName = null;
        if (department.managerId) {
          const userRepository = getTenantRepo(User);
          const manager = await userRepository.findOne({
            where: { id: department.managerId }
          });
          managerName = manager?.name || manager?.username || null;
        }

        return res.json({
          success: true,
          data: [{
            id: department.id,
            name: department.name,
            code: department.code,
            description: department.description,
            parentId: department.parentId,
            level: department.level,
            managerId: department.managerId,
            managerName: managerName,
            sortOrder: department.sortOrder,
            status: department.status,
            memberCount: department.memberCount
          }]
        });
      }
    }

    // 没有部门信息，返回空数组
    log.info('[公共部门API] 用户无部门信息，返回空数组');
    return res.json({
      success: true,
      data: []
    });

  } catch (error) {
    log.error('[公共部门API] 获取部门失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取部门列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
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


/**
 * @route GET /api/v1/system/network-info
 * @desc 获取服务器网络信息（局域网IP、端口、主机名）
 *       供系统入口分享功能使用，帮助私有部署客户获取正确的访问地址
 * @access Private (Admin)
 */
router.get('/network-info', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const os = await import('os');

    const hostname = os.hostname();
    const port = process.env.PORT || '3000';
    const interfaces = os.networkInterfaces();

    // 收集所有局域网 IPv4 地址
    const lanAddresses: { name: string; address: string; family: string }[] = [];
    for (const [name, nets] of Object.entries(interfaces)) {
      if (!nets) continue;
      for (const net of nets) {
        // 只收集 IPv4 非回环地址
        if (net.family === 'IPv4' && !net.internal) {
          lanAddresses.push({
            name: name,
            address: net.address,
            family: 'IPv4'
          });
        }
      }
    }

    // 推荐的局域网地址（优先选择常见的192.168.x.x / 10.x.x.x / 172.16-31.x.x）
    const preferred = lanAddresses.find(a =>
      a.address.startsWith('192.168.') ||
      a.address.startsWith('10.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(a.address)
    );

    res.json({
      success: true,
      data: {
        hostname,
        port: Number(port),
        lanAddresses,
        preferredLanIp: preferred?.address || lanAddresses[0]?.address || null,
        localhostUrl: `http://localhost:${port}`,
        lanUrl: preferred?.address
          ? `http://${preferred.address}:${port}`
          : lanAddresses[0]?.address
            ? `http://${lanAddresses[0].address}:${port}`
            : null
      }
    });
  } catch (error: any) {
    log.error('获取网络信息失败:', error);
    res.status(500).json({ success: false, message: '获取网络信息失败' });
  }
});

} // end registerSettingsRoutes
