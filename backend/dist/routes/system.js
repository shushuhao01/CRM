"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const DepartmentController_1 = require("../controllers/DepartmentController");
const database_1 = require("../config/database");
const SystemConfig_1 = require("../entities/SystemConfig");
const DepartmentOrderLimit_1 = require("../entities/DepartmentOrderLimit");
const Department_1 = require("../entities/Department");
const User_1 = require("../entities/User");
const Customer_1 = require("../entities/Customer");
const Order_1 = require("../entities/Order");
const OrderItem_1 = require("../entities/OrderItem");
const Product_1 = require("../entities/Product");
const ProductCategory_1 = require("../entities/ProductCategory");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
const AfterSalesService_1 = require("../entities/AfterSalesService");
const LogisticsCompany_1 = require("../entities/LogisticsCompany");
const LogisticsTracking_1 = require("../entities/LogisticsTracking");
const Announcement_1 = require("../entities/Announcement");
const PerformanceMetric_1 = require("../entities/PerformanceMetric");
const FollowUp_1 = require("../entities/FollowUp");
const CustomerTag_1 = require("../entities/CustomerTag");
const CustomerGroup_1 = require("../entities/CustomerGroup");
const SmsTemplate_1 = require("../entities/SmsTemplate");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const departmentController = new DepartmentController_1.DepartmentController();
// ========== 文件上传配置 ==========
// 获取上传配置（从数据库读取maxFileSize）
const getUploadConfig = async () => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
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
    }
    catch {
        return { maxFileSize: 10, allowedTypes: 'jpg,png,gif,webp,jpeg' };
    }
};
// 创建通用图片上传存储配置
const createImageStorage = (subDir) => multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', subDir);
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${subDir}-${uniqueSuffix}${ext}`);
    }
});
// 创建multer实例（默认配置，实际限制在路由中动态检查）
const createImageUpload = (subDir) => (0, multer_1.default)({
    storage: createImageStorage(subDir),
    limits: {
        fileSize: 50 * 1024 * 1024 // 设置一个较大的默认值，实际限制在路由中检查
    },
    fileFilter: (_req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
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
const getConfigsByGroup = async (group) => {
    const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
    const configs = await configRepository.find({
        where: { configGroup: group, isEnabled: true },
        order: { sortOrder: 'ASC' }
    });
    const settings = {};
    configs.forEach(config => {
        settings[config.configKey] = config.getParsedValue();
    });
    return settings;
};
/**
 * 保存配置到指定组
 */
const saveConfigsByGroup = async (group, settings, configItems) => {
    const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
    for (const item of configItems) {
        if (settings[item.key] !== undefined) {
            let config = await configRepository.findOne({
                where: { configKey: item.key, configGroup: group }
            });
            if (config) {
                config.configValue = String(settings[item.key]);
                config.valueType = item.type;
            }
            else {
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
router.get('/global-config', auth_1.authenticateToken, (_req, res) => {
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
const getStorageConfig = async () => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
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
    }
    catch {
        return { localDomain: '', storageType: 'local' };
    }
};
/**
 * 通用图片上传处理函数
 */
const handleImageUpload = async (req, res, subDir) => {
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
            fs_1.default.unlinkSync(req.file.path);
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
    }
    catch (error) {
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
router.get('/upload-config', auth_1.authenticateToken, async (_req, res) => {
    try {
        const config = await getUploadConfig();
        res.json({
            success: true,
            data: config
        });
    }
    catch (error) {
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
router.post('/upload-image', auth_1.authenticateToken, auth_1.requireAdmin, systemImageUpload.single('image'), (req, res) => {
    handleImageUpload(req, res, 'system');
});
/**
 * @route POST /api/v1/system/upload-product-image
 * @desc 上传商品图片
 * @access Private (Admin)
 */
router.post('/upload-product-image', auth_1.authenticateToken, auth_1.requireAdmin, productImageUpload.single('image'), (req, res) => {
    console.log('[Upload] 收到商品图片上传请求');
    console.log('[Upload] 用户:', req.user?.username, '角色:', req.user?.role);
    console.log('[Upload] 文件:', req.file ? req.file.originalname : '无文件');
    handleImageUpload(req, res, 'products');
});
/**
 * @route POST /api/v1/system/upload-avatar
 * @desc 上传用户头像
 * @access Private
 */
router.post('/upload-avatar', auth_1.authenticateToken, avatarImageUpload.single('image'), (req, res) => {
    handleImageUpload(req, res, 'avatars');
});
/**
 * @route POST /api/v1/system/upload-order-image
 * @desc 上传订单相关图片（定金凭证等）
 * @access Private
 */
router.post('/upload-order-image', auth_1.authenticateToken, orderImageUpload.single('image'), (req, res) => {
    handleImageUpload(req, res, 'orders');
});
/**
 * @route POST /api/v1/system/upload-service-image
 * @desc 上传售后服务图片
 * @access Private
 */
router.post('/upload-service-image', auth_1.authenticateToken, serviceImageUpload.single('image'), (req, res) => {
    handleImageUpload(req, res, 'services');
});
/**
 * @route DELETE /api/v1/system/delete-image
 * @desc 删除系统图片
 * @access Private (Admin)
 */
router.delete('/delete-image', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { filename } = req.body;
        if (!filename) {
            return res.status(400).json({
                success: false,
                message: '请提供要删除的文件名'
            });
        }
        // 安全检查：只允许删除system目录下的文件
        const filePath = path_1.default.join(process.cwd(), 'uploads', 'system', path_1.default.basename(filename));
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
        res.json({
            success: true,
            message: '图片删除成功'
        });
    }
    catch (error) {
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
router.get('/basic-settings', auth_1.authenticateToken, async (req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        // 获取所有基本设置配置
        const configs = await configRepository.find({
            where: { configGroup: 'basic_settings', isEnabled: true },
            order: { sortOrder: 'ASC' }
        });
        // 转换为键值对格式
        const settings = {};
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
    }
    catch (error) {
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
router.put('/basic-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const settings = req.body;
        // 定义需要保存的配置项
        const configItems = [
            { key: 'systemName', type: 'string', desc: '系统名称' },
            { key: 'systemVersion', type: 'string', desc: '系统版本' },
            { key: 'companyName', type: 'string', desc: '公司名称' },
            { key: 'contactPhone', type: 'string', desc: '联系电话' },
            { key: 'contactEmail', type: 'string', desc: '联系邮箱' },
            { key: 'websiteUrl', type: 'string', desc: '网站地址' },
            { key: 'companyAddress', type: 'string', desc: '公司地址' },
            { key: 'systemDescription', type: 'text', desc: '系统描述' },
            { key: 'systemLogo', type: 'text', desc: '系统Logo' },
            { key: 'contactQRCode', type: 'text', desc: '联系二维码' },
            { key: 'contactQRCodeLabel', type: 'string', desc: '二维码标签' }
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
                }
                else {
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
    }
    catch (error) {
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
router.get('/security-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
            secureConsoleEnabled: false // 控制台日志加密开关
        };
        res.json({ success: true, data: { ...defaultSettings, ...settings } });
    }
    catch (error) {
        console.error('获取安全设置失败:', error);
        res.status(500).json({ success: false, message: '获取安全设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/security-settings
 * @desc 更新安全设置
 * @access Private (Admin)
 */
router.put('/security-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'passwordMinLength', type: 'number', desc: '密码最小长度' },
            { key: 'passwordComplexity', type: 'json', desc: '密码复杂度要求' },
            { key: 'passwordExpireDays', type: 'number', desc: '密码有效期(天)' },
            { key: 'loginFailLock', type: 'boolean', desc: '登录失败锁定' },
            { key: 'maxLoginFails', type: 'number', desc: '最大失败次数' },
            { key: 'lockDuration', type: 'number', desc: '锁定时间(分钟)' },
            { key: 'sessionTimeout', type: 'number', desc: '会话超时时间(分钟)' },
            { key: 'forceHttps', type: 'boolean', desc: '强制HTTPS' },
            { key: 'ipWhitelist', type: 'text', desc: 'IP白名单' },
            { key: 'secureConsoleEnabled', type: 'boolean', desc: '控制台日志加密' }
        ];
        await saveConfigsByGroup('security_settings', settings, configItems);
        res.json({ success: true, message: '安全设置保存成功', data: settings });
    }
    catch (error) {
        console.error('保存安全设置失败:', error);
        res.status(500).json({ success: false, message: '保存安全设置失败' });
    }
});
/**
 * @route GET /api/v1/system/console-security-config
 * @desc 获取控制台安全配置（公开接口，所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/console-security-config', auth_1.authenticateToken, async (_req, res) => {
    try {
        const settings = await getConfigsByGroup('security_settings');
        const secureConsoleEnabled = settings.secureConsoleEnabled === true || settings.secureConsoleEnabled === 'true';
        res.json({
            success: true,
            data: {
                secureConsoleEnabled
            }
        });
    }
    catch (error) {
        console.error('获取控制台安全配置失败:', error);
        res.status(500).json({ success: false, message: '获取配置失败' });
    }
});
// ========== 通话设置路由 ==========
/**
 * @route GET /api/v1/system/call-settings
 * @desc 获取通话设置
 * @access Private (Admin)
 */
router.get('/call-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取通话设置失败:', error);
        res.status(500).json({ success: false, message: '获取通话设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/call-settings
 * @desc 更新通话设置
 * @access Private (Admin)
 */
router.put('/call-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'sipServer', type: 'string', desc: 'SIP服务器地址' },
            { key: 'sipPort', type: 'number', desc: 'SIP端口' },
            { key: 'sipUsername', type: 'string', desc: 'SIP用户名' },
            { key: 'sipPassword', type: 'string', desc: 'SIP密码' },
            { key: 'sipTransport', type: 'string', desc: '传输协议' },
            { key: 'autoAnswer', type: 'boolean', desc: '自动接听' },
            { key: 'autoRecord', type: 'boolean', desc: '自动录音' },
            { key: 'qualityMonitoring', type: 'boolean', desc: '通话质量监控' },
            { key: 'incomingCallPopup', type: 'boolean', desc: '呼入弹窗' },
            { key: 'maxCallDuration', type: 'number', desc: '最大通话时长(秒)' },
            { key: 'recordFormat', type: 'string', desc: '录音格式' },
            { key: 'recordQuality', type: 'string', desc: '录音质量' },
            { key: 'recordPath', type: 'string', desc: '录音保存路径' },
            { key: 'recordRetentionDays', type: 'number', desc: '录音保留时间(天)' },
            { key: 'outboundPermission', type: 'json', desc: '外呼权限' },
            { key: 'recordAccessPermission', type: 'json', desc: '录音访问权限' },
            { key: 'statisticsPermission', type: 'json', desc: '通话统计权限' },
            { key: 'numberRestriction', type: 'boolean', desc: '号码限制' },
            { key: 'allowedPrefixes', type: 'text', desc: '允许的号码前缀' }
        ];
        await saveConfigsByGroup('call_settings', settings, configItems);
        res.json({ success: true, message: '通话设置保存成功', data: settings });
    }
    catch (error) {
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
router.get('/email-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取邮件设置失败:', error);
        res.status(500).json({ success: false, message: '获取邮件设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/email-settings
 * @desc 更新邮件设置
 * @access Private (Admin)
 */
router.put('/email-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'smtpHost', type: 'string', desc: 'SMTP服务器地址' },
            { key: 'smtpPort', type: 'number', desc: 'SMTP端口' },
            { key: 'senderEmail', type: 'string', desc: '发件人邮箱' },
            { key: 'senderName', type: 'string', desc: '发件人名称' },
            { key: 'emailPassword', type: 'string', desc: '邮箱密码' },
            { key: 'enableSsl', type: 'boolean', desc: '启用SSL' },
            { key: 'enableTls', type: 'boolean', desc: '启用TLS' },
            { key: 'testEmail', type: 'string', desc: '测试邮箱' }
        ];
        await saveConfigsByGroup('email_settings', settings, configItems);
        res.json({ success: true, message: '邮件设置保存成功', data: settings });
    }
    catch (error) {
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
router.get('/sms-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取短信设置失败:', error);
        res.status(500).json({ success: false, message: '获取短信设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/sms-settings
 * @desc 更新短信设置
 * @access Private (Admin)
 */
router.put('/sms-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'provider', type: 'string', desc: '短信服务商' },
            { key: 'accessKey', type: 'string', desc: 'AccessKey' },
            { key: 'secretKey', type: 'string', desc: 'SecretKey' },
            { key: 'signName', type: 'string', desc: '短信签名' },
            { key: 'dailyLimit', type: 'number', desc: '每日发送限制' },
            { key: 'monthlyLimit', type: 'number', desc: '每月发送限制' },
            { key: 'enabled', type: 'boolean', desc: '启用短信功能' },
            { key: 'requireApproval', type: 'boolean', desc: '需要审核' },
            { key: 'testPhone', type: 'string', desc: '测试手机号' }
        ];
        await saveConfigsByGroup('sms_settings', settings, configItems);
        res.json({ success: true, message: '短信设置保存成功', data: settings });
    }
    catch (error) {
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
router.get('/storage-settings', auth_1.authenticateToken, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取存储设置失败:', error);
        res.status(500).json({ success: false, message: '获取存储设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/storage-settings
 * @desc 更新存储设置
 * @access Private (Admin)
 */
router.put('/storage-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'storageType', type: 'string', desc: '存储类型' },
            { key: 'localPath', type: 'string', desc: '本地存储路径' },
            { key: 'localDomain', type: 'string', desc: '访问域名' },
            { key: 'accessKey', type: 'string', desc: 'Access Key' },
            { key: 'secretKey', type: 'string', desc: 'Secret Key' },
            { key: 'bucketName', type: 'string', desc: '存储桶名称' },
            { key: 'region', type: 'string', desc: '存储区域' },
            { key: 'customDomain', type: 'string', desc: '自定义域名' },
            { key: 'maxFileSize', type: 'number', desc: '最大文件大小(MB)' },
            { key: 'allowedTypes', type: 'string', desc: '允许的文件类型' },
            // 图片压缩配置
            { key: 'imageCompressEnabled', type: 'boolean', desc: '启用图片压缩' },
            { key: 'imageCompressQuality', type: 'string', desc: '压缩质量' },
            { key: 'imageCompressMaxWidth', type: 'number', desc: '最大宽度' },
            { key: 'imageCompressCustomQuality', type: 'number', desc: '自定义压缩比例' }
        ];
        await saveConfigsByGroup('storage_settings', settings, configItems);
        res.json({ success: true, message: '存储设置保存成功', data: settings });
    }
    catch (error) {
        console.error('保存存储设置失败:', error);
        res.status(500).json({ success: false, message: '保存存储设置失败' });
    }
});
// ========== 商品设置路由 ==========
/**
 * @route GET /api/v1/system/product-settings/public
 * @desc 获取商品优惠折扣设置（公开给所有已登录用户）
 * @access Private (All authenticated users)
 */
router.get('/product-settings/public', auth_1.authenticateToken, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取商品优惠设置失败:', error);
        res.status(500).json({ success: false, message: '获取商品优惠设置失败' });
    }
});
/**
 * @route GET /api/v1/system/product-settings
 * @desc 获取商品设置（完整配置，仅管理员）
 * @access Private (Admin)
 */
router.get('/product-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取商品设置失败:', error);
        res.status(500).json({ success: false, message: '获取商品设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/product-settings
 * @desc 更新商品设置
 * @access Private (Admin)
 */
router.put('/product-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'maxDiscountPercent', type: 'number', desc: '全局最大优惠比例' },
            { key: 'adminMaxDiscount', type: 'number', desc: '管理员最大优惠' },
            { key: 'managerMaxDiscount', type: 'number', desc: '经理最大优惠' },
            { key: 'salesMaxDiscount', type: 'number', desc: '销售员最大优惠' },
            { key: 'discountApprovalThreshold', type: 'number', desc: '优惠审批阈值' },
            { key: 'allowPriceModification', type: 'boolean', desc: '允许价格修改' },
            { key: 'priceModificationRoles', type: 'json', desc: '价格修改权限' },
            { key: 'enablePriceHistory', type: 'boolean', desc: '价格变动记录' },
            { key: 'pricePrecision', type: 'string', desc: '价格显示精度' },
            { key: 'enableInventory', type: 'boolean', desc: '启用库存管理' },
            { key: 'lowStockThreshold', type: 'number', desc: '低库存预警阈值' },
            { key: 'allowNegativeStock', type: 'boolean', desc: '允许负库存销售' },
            { key: 'defaultCategory', type: 'string', desc: '默认分类' },
            { key: 'maxCategoryLevel', type: 'number', desc: '分类层级限制' },
            { key: 'enableCategoryCode', type: 'boolean', desc: '启用分类编码' },
            { key: 'costPriceViewRoles', type: 'json', desc: '成本价格查看权限' },
            { key: 'salesDataViewRoles', type: 'json', desc: '销售数据查看权限' },
            { key: 'stockInfoViewRoles', type: 'json', desc: '库存信息查看权限' },
            { key: 'operationLogsViewRoles', type: 'json', desc: '操作日志查看权限' },
            { key: 'sensitiveInfoHideMethod', type: 'string', desc: '敏感信息隐藏方式' },
            { key: 'enablePermissionControl', type: 'boolean', desc: '启用权限控制' }
        ];
        await saveConfigsByGroup('product_settings', settings, configItems);
        res.json({ success: true, message: '商品设置保存成功', data: settings });
    }
    catch (error) {
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
router.get('/backup-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const settings = await getConfigsByGroup('backup_settings');
        const defaultSettings = {
            autoBackupEnabled: false,
            backupFrequency: 'daily',
            retentionDays: 30,
            compression: true
        };
        res.json({ success: true, data: { ...defaultSettings, ...settings } });
    }
    catch (error) {
        console.error('获取数据备份设置失败:', error);
        res.status(500).json({ success: false, message: '获取数据备份设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/backup-settings
 * @desc 更新数据备份设置
 * @access Private (Admin)
 */
router.put('/backup-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'autoBackupEnabled', type: 'boolean', desc: '自动备份' },
            { key: 'backupFrequency', type: 'string', desc: '备份频率' },
            { key: 'retentionDays', type: 'number', desc: '保留天数' },
            { key: 'compression', type: 'boolean', desc: '压缩备份' }
        ];
        await saveConfigsByGroup('backup_settings', settings, configItems);
        res.json({ success: true, message: '数据备份设置保存成功', data: settings });
    }
    catch (error) {
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
router.get('/agreement-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
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
    }
    catch (error) {
        console.error('获取用户协议设置失败:', error);
        res.status(500).json({ success: false, message: '获取用户协议设置失败' });
    }
});
/**
 * @route PUT /api/v1/system/agreement-settings
 * @desc 更新用户协议设置
 * @access Private (Admin)
 */
router.put('/agreement-settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        const configItems = [
            { key: 'userAgreementEnabled', type: 'boolean', desc: '用户协议启用' },
            { key: 'userAgreementTitle', type: 'string', desc: '用户协议标题' },
            { key: 'userAgreementContent', type: 'text', desc: '用户协议内容' },
            { key: 'privacyAgreementEnabled', type: 'boolean', desc: '隐私协议启用' },
            { key: 'privacyAgreementTitle', type: 'string', desc: '隐私协议标题' },
            { key: 'privacyAgreementContent', type: 'text', desc: '隐私协议内容' }
        ];
        await saveConfigsByGroup('agreement_settings', settings, configItems);
        res.json({ success: true, message: '用户协议设置保存成功', data: settings });
    }
    catch (error) {
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
router.put('/global-config', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
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
router.get('/info', auth_1.authenticateToken, auth_1.requireAdmin, (_req, res) => {
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
router.get('/my-departments', auth_1.authenticateToken, async (req, res) => {
    try {
        const currentUser = req.currentUser;
        const userRole = currentUser?.role;
        const userDepartmentId = currentUser?.departmentId;
        console.log('[公共部门API] 用户信息:', {
            userId: currentUser?.id,
            role: userRole,
            departmentId: userDepartmentId
        });
        const departmentRepository = database_1.AppDataSource.getRepository(Department_1.Department);
        // 超级管理员和管理员可以看到所有部门
        if (userRole === 'super_admin' || userRole === 'admin') {
            const departments = await departmentRepository.find({
                where: { status: 'active' },
                order: { sortOrder: 'ASC', name: 'ASC' }
            });
            console.log('[公共部门API] 管理员：返回所有部门', departments.length, '个');
            // 获取所有负责人信息
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            const managerIds = departments.map(d => d.managerId).filter(Boolean);
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
                console.log('[公共部门API] 普通用户：返回所属部门', department.name);
                // 获取负责人姓名
                let managerName = null;
                if (department.managerId) {
                    const userRepository = database_1.AppDataSource.getRepository(User_1.User);
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
        console.log('[公共部门API] 用户无部门信息，返回空数组');
        return res.json({
            success: true,
            data: []
        });
    }
    catch (error) {
        console.error('[公共部门API] 获取部门失败:', error);
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
router.get('/departments', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartments.bind(departmentController));
/**
 * @route GET /api/v1/system/departments/tree
 * @desc 获取部门树形结构
 * @access Private (Admin)
 */
router.get('/departments/tree', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartmentTree.bind(departmentController));
/**
 * @route GET /api/v1/system/departments/stats
 * @desc 获取部门统计信息
 * @access Private (Admin)
 */
router.get('/departments/stats', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartmentStats.bind(departmentController));
/**
 * @route GET /api/v1/system/departments/:id
 * @desc 获取部门详情
 * @access Private (Admin)
 */
router.get('/departments/:id', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartmentById.bind(departmentController));
/**
 * @route POST /api/v1/system/departments
 * @desc 创建部门
 * @access Private (Admin)
 */
router.post('/departments', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.createDepartment.bind(departmentController));
/**
 * @route PUT /api/v1/system/departments/:id
 * @desc 更新部门
 * @access Private (Admin)
 */
router.put('/departments/:id', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.updateDepartment.bind(departmentController));
/**
 * @route PATCH /api/v1/system/departments/:id/status
 * @desc 更新部门状态
 * @access Private (Admin)
 */
router.patch('/departments/:id/status', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.updateDepartmentStatus.bind(departmentController));
/**
 * @route DELETE /api/v1/system/departments/:id
 * @desc 删除部门
 * @access Private (Admin)
 */
router.delete('/departments/:id', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.deleteDepartment.bind(departmentController));
/**
 * @route GET /api/v1/system/departments/:id/members
 * @desc 获取部门成员
 * @access Private (Admin)
 */
router.get('/departments/:id/members', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartmentMembers.bind(departmentController));
/**
 * @route GET /api/v1/system/departments/:id/roles
 * @desc 获取部门角色列表
 * @access Private (Admin)
 */
router.get('/departments/:id/roles', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.getDepartmentRoles.bind(departmentController));
/**
 * @route PATCH /api/v1/system/departments/:id/permissions
 * @desc 更新部门权限
 * @access Private (Admin)
 */
router.patch('/departments/:id/permissions', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.updateDepartmentPermissions.bind(departmentController));
/**
 * @route PATCH /api/v1/system/departments/:id/move
 * @desc 移动部门
 * @access Private (Admin)
 */
router.patch('/departments/:id/move', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.moveDepartment.bind(departmentController));
/**
 * @route POST /api/v1/system/departments/:departmentId/members
 * @desc 添加部门成员
 * @access Private (Admin)
 */
router.post('/departments/:departmentId/members', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.addDepartmentMember.bind(departmentController));
/**
 * @route DELETE /api/v1/system/departments/:departmentId/members/:userId
 * @desc 移除部门成员
 * @access Private (Admin)
 */
router.delete('/departments/:departmentId/members/:userId', auth_1.authenticateToken, auth_1.requireAdmin, departmentController.removeDepartmentMember.bind(departmentController));
// ========== 订单字段配置路由 ==========
/**
 * @route GET /api/v1/system/order-field-config
 * @desc 获取订单字段配置
 * @access Private
 */
router.get('/order-field-config', auth_1.authenticateToken, async (_req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const config = await configRepository.findOne({
            where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
        });
        if (config) {
            res.json({ success: true, code: 200, data: JSON.parse(config.configValue) });
        }
        else {
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
    }
    catch (error) {
        console.error('获取订单字段配置失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取订单字段配置失败' });
    }
});
/**
 * @route PUT /api/v1/system/order-field-config
 * @desc 更新订单字段配置
 * @access Private (Admin)
 */
router.put('/order-field-config', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        let config = await configRepository.findOne({
            where: { configKey: 'orderFieldConfig', configGroup: 'order_settings' }
        });
        if (config) {
            config.configValue = JSON.stringify(req.body);
        }
        else {
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
    }
    catch (error) {
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
router.get('/settings', auth_1.authenticateToken, async (_req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const configs = await configRepository.find({
            where: { isEnabled: true },
            order: { configGroup: 'ASC', sortOrder: 'ASC' }
        });
        const settings = {};
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
    }
    catch (error) {
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
router.post('/settings', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type, config } = req.body;
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        if (type && config) {
            // 保存特定类型的配置
            for (const [key, value] of Object.entries(config)) {
                let existingConfig = await configRepository.findOne({
                    where: { configKey: key, configGroup: type }
                });
                if (existingConfig) {
                    existingConfig.configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
                }
                else {
                    existingConfig = configRepository.create({
                        configKey: key,
                        configValue: typeof value === 'object' ? JSON.stringify(value) : String(value),
                        valueType: typeof value === 'object' ? 'json' : typeof value,
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
    }
    catch (error) {
        console.error('保存系统设置失败:', error);
        res.status(500).json({
            success: false,
            message: '保存系统设置失败'
        });
    }
});
// ========== 订单流转配置 ==========
/**
 * @route GET /api/v1/system/order-transfer-config
 * @desc 获取订单流转时间配置
 * @access Private
 */
router.get('/order-transfer-config', auth_1.authenticateToken, async (_req, res) => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const modeConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferMode', configGroup: 'order_settings', isEnabled: true }
        });
        const delayConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings', isEnabled: true }
        });
        res.json({
            success: true,
            data: {
                mode: modeConfig?.configValue || 'delayed',
                delayMinutes: delayConfig ? Number(delayConfig.configValue) : 3
            }
        });
    }
    catch (error) {
        console.error('获取订单流转配置失败:', error);
        res.status(500).json({
            success: false,
            message: '获取订单流转配置失败'
        });
    }
});
/**
 * @route POST /api/v1/system/order-transfer-config
 * @desc 保存订单流转时间配置（仅管理员）
 * @access Private (Admin only)
 */
router.post('/order-transfer-config', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { mode, delayMinutes } = req.body;
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        // 保存流转模式
        let modeConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferMode', configGroup: 'order_settings' }
        });
        if (modeConfig) {
            modeConfig.configValue = mode;
        }
        else {
            modeConfig = configRepository.create({
                configKey: 'orderTransferMode',
                configValue: mode,
                valueType: 'string',
                configGroup: 'order_settings',
                description: '订单流转模式：immediate-立即流转，delayed-延迟流转',
                isEnabled: true,
                isSystem: true
            });
        }
        await configRepository.save(modeConfig);
        // 保存延迟时间
        let delayConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings' }
        });
        if (delayConfig) {
            delayConfig.configValue = String(delayMinutes);
        }
        else {
            delayConfig = configRepository.create({
                configKey: 'orderTransferDelayMinutes',
                configValue: String(delayMinutes),
                valueType: 'number',
                configGroup: 'order_settings',
                description: '订单流转延迟时间（分钟）',
                isEnabled: true,
                isSystem: true
            });
        }
        await configRepository.save(delayConfig);
        console.log(`✅ [订单流转配置] 已保存: mode=${mode}, delayMinutes=${delayMinutes}`);
        res.json({
            success: true,
            message: '订单流转配置保存成功'
        });
    }
    catch (error) {
        console.error('保存订单流转配置失败:', error);
        res.status(500).json({
            success: false,
            message: '保存订单流转配置失败'
        });
    }
});
// ========== 部门下单限制配置 ==========
/**
 * @route GET /api/v1/system/department-order-limits
 * @desc 获取所有部门下单限制配置
 * @access Private (Admin)
 */
router.get('/department-order-limits', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const repository = database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit);
        const limits = await repository.find({
            order: { createdAt: 'DESC' }
        });
        res.json({
            success: true,
            code: 200,
            data: limits
        });
    }
    catch (error) {
        console.error('获取部门下单限制配置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取部门下单限制配置失败'
        });
    }
});
/**
 * @route GET /api/v1/system/department-order-limits/:departmentId
 * @desc 获取指定部门的下单限制配置
 * @access Private
 */
router.get('/department-order-limits/:departmentId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { departmentId } = req.params;
        const repository = database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit);
        const limit = await repository.findOne({
            where: { departmentId, isEnabled: true }
        });
        res.json({
            success: true,
            code: 200,
            data: limit || null
        });
    }
    catch (error) {
        console.error('获取部门下单限制配置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取部门下单限制配置失败'
        });
    }
});
/**
 * @route POST /api/v1/system/department-order-limits
 * @desc 创建或更新部门下单限制配置
 * @access Private (Admin)
 */
router.post('/department-order-limits', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { departmentId, departmentName, orderCountEnabled, maxOrderCount, singleAmountEnabled, maxSingleAmount, totalAmountEnabled, maxTotalAmount, isEnabled, remark } = req.body;
        if (!departmentId) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '部门ID不能为空'
            });
        }
        const repository = database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit);
        const currentUser = req.currentUser;
        // 查找是否已存在配置
        let limit = await repository.findOne({ where: { departmentId } });
        if (limit) {
            // 更新现有配置
            limit.departmentName = departmentName;
            limit.orderCountEnabled = orderCountEnabled ?? false;
            limit.maxOrderCount = maxOrderCount ?? 0;
            limit.singleAmountEnabled = singleAmountEnabled ?? false;
            limit.maxSingleAmount = maxSingleAmount ?? 0;
            limit.totalAmountEnabled = totalAmountEnabled ?? false;
            limit.maxTotalAmount = maxTotalAmount ?? 0;
            limit.isEnabled = isEnabled ?? true;
            limit.remark = remark;
            limit.updatedBy = currentUser?.id;
            limit.updatedByName = currentUser?.name || currentUser?.username;
        }
        else {
            // 创建新配置
            limit = repository.create({
                id: `dol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                departmentId,
                departmentName,
                orderCountEnabled: orderCountEnabled ?? false,
                maxOrderCount: maxOrderCount ?? 0,
                singleAmountEnabled: singleAmountEnabled ?? false,
                maxSingleAmount: maxSingleAmount ?? 0,
                totalAmountEnabled: totalAmountEnabled ?? false,
                maxTotalAmount: maxTotalAmount ?? 0,
                isEnabled: isEnabled ?? true,
                remark,
                createdBy: currentUser?.id,
                createdByName: currentUser?.name || currentUser?.username
            });
        }
        await repository.save(limit);
        console.log(`✅ [部门下单限制] 部门 ${departmentName}(${departmentId}) 配置已保存`);
        res.json({
            success: true,
            code: 200,
            message: '部门下单限制配置保存成功',
            data: limit
        });
    }
    catch (error) {
        console.error('保存部门下单限制配置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '保存部门下单限制配置失败'
        });
    }
});
/**
 * @route DELETE /api/v1/system/department-order-limits/:departmentId
 * @desc 删除部门下单限制配置
 * @access Private (Admin)
 */
router.delete('/department-order-limits/:departmentId', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { departmentId } = req.params;
        const repository = database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit);
        const result = await repository.delete({ departmentId });
        if (result.affected === 0) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '配置不存在'
            });
        }
        console.log(`✅ [部门下单限制] 部门 ${departmentId} 配置已删除`);
        res.json({
            success: true,
            code: 200,
            message: '部门下单限制配置删除成功'
        });
    }
    catch (error) {
        console.error('删除部门下单限制配置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除部门下单限制配置失败'
        });
    }
});
// ========== 支付方式配置 ==========
/**
 * @route GET /api/v1/system/payment-methods
 * @desc 获取支付方式列表
 */
router.get('/payment-methods', auth_1.authenticateToken, async (_req, res) => {
    try {
        const { PaymentMethodOption } = await Promise.resolve().then(() => __importStar(require('../entities/PaymentMethodOption')));
        const repository = database_1.AppDataSource.getRepository(PaymentMethodOption);
        const methods = await repository.find({
            where: { isEnabled: true },
            order: { sortOrder: 'ASC' }
        });
        res.json({
            success: true,
            code: 200,
            data: methods
        });
    }
    catch (error) {
        console.error('获取支付方式列表失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取支付方式列表失败'
        });
    }
});
/**
 * @route GET /api/v1/system/payment-methods/all
 * @desc 获取所有支付方式（包括禁用的）
 */
router.get('/payment-methods/all', auth_1.authenticateToken, async (_req, res) => {
    try {
        const { PaymentMethodOption } = await Promise.resolve().then(() => __importStar(require('../entities/PaymentMethodOption')));
        const repository = database_1.AppDataSource.getRepository(PaymentMethodOption);
        const methods = await repository.find({
            order: { sortOrder: 'ASC' }
        });
        res.json({
            success: true,
            code: 200,
            data: methods
        });
    }
    catch (error) {
        console.error('获取所有支付方式失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取所有支付方式失败'
        });
    }
});
/**
 * @route POST /api/v1/system/payment-methods
 * @desc 添加支付方式
 */
router.post('/payment-methods', auth_1.authenticateToken, async (req, res) => {
    try {
        const { label, value } = req.body;
        if (!label || !value) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '支付方式名称和值不能为空'
            });
        }
        const { PaymentMethodOption } = await Promise.resolve().then(() => __importStar(require('../entities/PaymentMethodOption')));
        const repository = database_1.AppDataSource.getRepository(PaymentMethodOption);
        // 检查是否已存在
        const existing = await repository.findOne({ where: { value } });
        if (existing) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '该支付方式值已存在'
            });
        }
        // 获取最大排序号
        const maxOrder = await repository
            .createQueryBuilder('pm')
            .select('MAX(pm.sortOrder)', 'max')
            .getRawOne();
        const newMethod = repository.create({
            id: `pm_${Date.now()}`,
            label,
            value,
            sortOrder: (maxOrder?.max || 0) + 1,
            isEnabled: true
        });
        await repository.save(newMethod);
        res.json({
            success: true,
            code: 200,
            message: '支付方式添加成功',
            data: newMethod
        });
    }
    catch (error) {
        console.error('添加支付方式失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '添加支付方式失败'
        });
    }
});
/**
 * @route PUT /api/v1/system/payment-methods/:id
 * @desc 更新支付方式
 */
router.put('/payment-methods/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { label, value, isEnabled, sortOrder } = req.body;
        const { PaymentMethodOption } = await Promise.resolve().then(() => __importStar(require('../entities/PaymentMethodOption')));
        const repository = database_1.AppDataSource.getRepository(PaymentMethodOption);
        const method = await repository.findOne({ where: { id } });
        if (!method) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '支付方式不存在'
            });
        }
        if (label !== undefined)
            method.label = label;
        if (value !== undefined)
            method.value = value;
        if (isEnabled !== undefined)
            method.isEnabled = isEnabled;
        if (sortOrder !== undefined)
            method.sortOrder = sortOrder;
        await repository.save(method);
        res.json({
            success: true,
            code: 200,
            message: '支付方式更新成功',
            data: method
        });
    }
    catch (error) {
        console.error('更新支付方式失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新支付方式失败'
        });
    }
});
/**
 * @route DELETE /api/v1/system/payment-methods/:id
 * @desc 删除支付方式
 */
router.delete('/payment-methods/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { PaymentMethodOption } = await Promise.resolve().then(() => __importStar(require('../entities/PaymentMethodOption')));
        const repository = database_1.AppDataSource.getRepository(PaymentMethodOption);
        const method = await repository.findOne({ where: { id } });
        if (!method) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '支付方式不存在'
            });
        }
        await repository.remove(method);
        res.json({
            success: true,
            code: 200,
            message: '支付方式删除成功'
        });
    }
    catch (error) {
        console.error('删除支付方式失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除支付方式失败'
        });
    }
});
// ========== 用户个人设置（列设置等）==========
/**
 * @route GET /api/v1/system/user-settings/:settingKey
 * @desc 获取用户个人设置
 * @access Private
 */
router.get('/user-settings/:settingKey', auth_1.authenticateToken, async (req, res) => {
    try {
        const { settingKey } = req.params;
        const currentUser = req.currentUser;
        if (!currentUser?.id) {
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未登录'
            });
        }
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const configKey = `user_${currentUser.id}_${settingKey}`;
        const config = await configRepository.findOne({
            where: { configKey, configGroup: 'user_settings', isEnabled: true }
        });
        res.json({
            success: true,
            code: 200,
            data: config ? JSON.parse(config.configValue) : null
        });
    }
    catch (error) {
        console.error('获取用户设置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取用户设置失败'
        });
    }
});
/**
 * @route POST /api/v1/system/user-settings/:settingKey
 * @desc 保存用户个人设置
 * @access Private
 */
router.post('/user-settings/:settingKey', auth_1.authenticateToken, async (req, res) => {
    try {
        const { settingKey } = req.params;
        const currentUser = req.currentUser;
        if (!currentUser?.id) {
            return res.status(401).json({
                success: false,
                code: 401,
                message: '用户未登录'
            });
        }
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const configKey = `user_${currentUser.id}_${settingKey}`;
        let config = await configRepository.findOne({
            where: { configKey, configGroup: 'user_settings' }
        });
        if (config) {
            config.configValue = JSON.stringify(req.body);
        }
        else {
            config = configRepository.create({
                configKey,
                configValue: JSON.stringify(req.body),
                valueType: 'json',
                configGroup: 'user_settings',
                description: `用户 ${currentUser.id} 的 ${settingKey} 设置`,
                isEnabled: true,
                isSystem: false
            });
        }
        await configRepository.save(config);
        console.log(`✅ [用户设置] 用户 ${currentUser.id} 的 ${settingKey} 设置已保存`);
        res.json({
            success: true,
            code: 200,
            message: '设置保存成功'
        });
    }
    catch (error) {
        console.error('保存用户设置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '保存用户设置失败'
        });
    }
});
// ========== 系统监控路由 ==========
/**
 * @route GET /api/v1/system/monitor
 * @desc 获取系统监控数据
 * @access Private (Admin)
 */
router.get('/monitor', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const os = await Promise.resolve().then(() => __importStar(require('os')));
        // 获取系统信息
        const cpus = os.cpus();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = Math.round((usedMemory / totalMemory) * 100);
        // 计算CPU使用率
        let cpuUsage = 0;
        if (cpus.length > 0) {
            const cpu = cpus[0];
            const total = cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
            const idle = cpu.times.idle;
            cpuUsage = Math.round(((total - idle) / total) * 100);
        }
        // 格式化内存大小
        const formatBytes = (bytes) => {
            if (bytes >= 1073741824)
                return `${(bytes / 1073741824).toFixed(2)} GB`;
            if (bytes >= 1048576)
                return `${(bytes / 1048576).toFixed(2)} MB`;
            return `${(bytes / 1024).toFixed(2)} KB`;
        };
        // 格式化运行时间
        const formatUptime = (seconds) => {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            if (days > 0)
                return `${days}天 ${hours}小时 ${minutes}分钟`;
            if (hours > 0)
                return `${hours}小时 ${minutes}分钟`;
            return `${minutes}分钟`;
        };
        // 获取数据库连接状态
        let dbConnected = false;
        let dbActiveConnections = 0;
        try {
            if (database_1.AppDataSource.isInitialized) {
                dbConnected = true;
                // 尝试获取活跃连接数
                const queryRunner = database_1.AppDataSource.createQueryRunner();
                await queryRunner.connect();
                dbActiveConnections = 1; // 至少有一个连接
                await queryRunner.release();
            }
        }
        catch {
            dbConnected = false;
        }
        const monitorData = {
            systemInfo: {
                os: `${os.type()} ${os.release()}`,
                arch: os.arch(),
                cpuCores: cpus.length,
                totalMemory: formatBytes(totalMemory),
                nodeVersion: process.version,
                uptime: formatUptime(os.uptime())
            },
            performance: {
                cpuUsage,
                memoryUsage,
                diskUsage: 0, // 磁盘使用率需要额外的库来获取
                networkLatency: 0 // 网络延迟需要实际测量
            },
            database: {
                type: 'MySQL',
                version: '8.0',
                connected: dbConnected,
                activeConnections: dbActiveConnections,
                size: '计算中...',
                lastBackup: '未备份'
            },
            services: [
                {
                    name: '后端API服务',
                    status: 'running',
                    port: process.env.PORT || '3000',
                    uptime: formatUptime(process.uptime()),
                    memory: formatBytes(process.memoryUsage().heapUsed)
                },
                {
                    name: '数据库服务',
                    status: dbConnected ? 'running' : 'stopped',
                    port: process.env.DB_PORT || '3306',
                    uptime: dbConnected ? '运行中' : '已停止',
                    memory: '-'
                }
            ]
        };
        res.json({
            success: true,
            data: monitorData
        });
    }
    catch (error) {
        console.error('获取系统监控数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取系统监控数据失败'
        });
    }
});
// ========== 数据库备份路由 ==========
/**
 * @route GET /api/v1/system/backup/list
 * @desc 获取备份列表
 * @access Private (Admin)
 */
router.get('/backup/list', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        // 确保备份目录存在
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        // 读取备份文件列表
        const files = fs_1.default.readdirSync(backupDir)
            .filter(file => file.endsWith('.sql') || file.endsWith('.json') || file.endsWith('.gz'))
            .map(filename => {
            const filePath = path_1.default.join(backupDir, filename);
            const stats = fs_1.default.statSync(filePath);
            const isManual = filename.includes('manual');
            return {
                filename,
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
                type: isManual ? 'manual' : 'auto'
            };
        })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json({
            success: true,
            data: files
        });
    }
    catch (error) {
        console.error('获取备份列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取备份列表失败'
        });
    }
});
/**
 * @route POST /api/v1/system/backup/create
 * @desc 创建数据库备份
 * @access Private (Admin)
 */
router.post('/backup/create', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { type = 'manual' } = req.body;
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        // 确保备份目录存在
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${type}-backup-${timestamp}.json`;
        const filePath = path_1.default.join(backupDir, filename);
        // 导出数据库数据 - 备份所有重要的业务表
        const backupData = {};
        // 定义需要备份的实体（按依赖顺序排列，共20+个核心业务表）
        const entities = [
            // 基础配置表
            { name: 'system_configs', repo: database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig) },
            { name: 'roles', repo: database_1.AppDataSource.getRepository(Role_1.Role) },
            { name: 'permissions', repo: database_1.AppDataSource.getRepository(Permission_1.Permission) },
            // 组织架构
            { name: 'departments', repo: database_1.AppDataSource.getRepository(Department_1.Department) },
            { name: 'department_order_limits', repo: database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit) },
            { name: 'users', repo: database_1.AppDataSource.getRepository(User_1.User) },
            // 商品相关
            { name: 'product_categories', repo: database_1.AppDataSource.getRepository(ProductCategory_1.ProductCategory) },
            { name: 'products', repo: database_1.AppDataSource.getRepository(Product_1.Product) },
            // 客户相关
            { name: 'customers', repo: database_1.AppDataSource.getRepository(Customer_1.Customer) },
            { name: 'customer_tags', repo: database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag) },
            { name: 'customer_groups', repo: database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup) },
            { name: 'follow_ups', repo: database_1.AppDataSource.getRepository(FollowUp_1.FollowUp) },
            // 订单相关
            { name: 'orders', repo: database_1.AppDataSource.getRepository(Order_1.Order) },
            { name: 'order_items', repo: database_1.AppDataSource.getRepository(OrderItem_1.OrderItem) },
            // 售后服务
            { name: 'after_sales_services', repo: database_1.AppDataSource.getRepository(AfterSalesService_1.AfterSalesService) },
            // 物流相关
            { name: 'logistics_companies', repo: database_1.AppDataSource.getRepository(LogisticsCompany_1.LogisticsCompany) },
            { name: 'logistics_trackings', repo: database_1.AppDataSource.getRepository(LogisticsTracking_1.LogisticsTracking) },
            // 业绩相关
            { name: 'performance_metrics', repo: database_1.AppDataSource.getRepository(PerformanceMetric_1.PerformanceMetric) },
            // 短信模板
            { name: 'sms_templates', repo: database_1.AppDataSource.getRepository(SmsTemplate_1.SmsTemplate) },
            // 公告
            { name: 'announcements', repo: database_1.AppDataSource.getRepository(Announcement_1.Announcement) }
        ];
        console.log(`[备份] 开始备份 ${entities.length} 个数据表...`);
        for (const entity of entities) {
            try {
                const data = await entity.repo.find();
                backupData[entity.name] = data;
                console.log(`[备份] ${entity.name}: ${data.length} 条记录`);
            }
            catch (err) {
                console.warn(`[备份] ${entity.name} 失败:`, err);
                backupData[entity.name] = [];
            }
        }
        // 添加元数据
        const totalRecords = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);
        const backup = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            type,
            data: backupData,
            metadata: {
                tables: Object.keys(backupData),
                tableCount: Object.keys(backupData).length,
                totalRecords,
                recordsByTable: Object.fromEntries(Object.entries(backupData).map(([name, data]) => [name, data.length]))
            }
        };
        // 写入文件
        fs_1.default.writeFileSync(filePath, JSON.stringify(backup, null, 2));
        const stats = fs_1.default.statSync(filePath);
        console.log(`[备份] 备份完成: ${filename}, 大小: ${(stats.size / 1024).toFixed(2)} KB, 共 ${totalRecords} 条记录`);
        res.json({
            success: true,
            message: '备份创建成功',
            data: {
                filename,
                timestamp: backup.timestamp,
                size: stats.size,
                type,
                tables: backup.metadata.tables,
                totalRecords: backup.metadata.totalRecords
            }
        });
    }
    catch (error) {
        console.error('创建备份失败:', error);
        res.status(500).json({
            success: false,
            message: '创建备份失败: ' + (error instanceof Error ? error.message : '未知错误')
        });
    }
});
/**
 * @route GET /api/v1/system/backup/download/:filename
 * @desc 下载备份文件
 * @access Private (Admin)
 */
router.get('/backup/download/:filename', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        const filePath = path_1.default.join(backupDir, path_1.default.basename(filename));
        // 安全检查
        if (!filePath.startsWith(backupDir)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件路径'
            });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '备份文件不存在'
            });
        }
        res.download(filePath, filename);
    }
    catch (error) {
        console.error('下载备份失败:', error);
        res.status(500).json({
            success: false,
            message: '下载备份失败'
        });
    }
});
/**
 * @route DELETE /api/v1/system/backup/:filename
 * @desc 删除备份文件
 * @access Private (Admin)
 */
router.delete('/backup/:filename', auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        const filePath = path_1.default.join(backupDir, path_1.default.basename(filename));
        // 安全检查
        if (!filePath.startsWith(backupDir)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件路径'
            });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '备份文件不存在'
            });
        }
        fs_1.default.unlinkSync(filePath);
        res.json({
            success: true,
            message: '备份删除成功'
        });
    }
    catch (error) {
        console.error('删除备份失败:', error);
        res.status(500).json({
            success: false,
            message: '删除备份失败'
        });
    }
});
/**
 * @route GET /api/v1/system/backup/status
 * @desc 获取备份状态
 * @access Private (Admin)
 */
router.get('/backup/status', auth_1.authenticateToken, auth_1.requireAdmin, async (_req, res) => {
    try {
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        // 确保备份目录存在
        if (!fs_1.default.existsSync(backupDir)) {
            fs_1.default.mkdirSync(backupDir, { recursive: true });
        }
        // 读取备份文件列表
        const files = fs_1.default.readdirSync(backupDir)
            .filter(file => file.endsWith('.sql') || file.endsWith('.json') || file.endsWith('.gz'))
            .map(filename => {
            const filePath = path_1.default.join(backupDir, filename);
            const stats = fs_1.default.statSync(filePath);
            return {
                filename,
                timestamp: stats.mtime,
                size: stats.size
            };
        })
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        // 计算统计信息
        const totalSize = files.reduce((sum, f) => sum + f.size, 0);
        const lastBackup = files.length > 0 ? files[0].timestamp.toISOString() : null;
        // 获取备份配置
        const settings = await getConfigsByGroup('backup_settings');
        res.json({
            success: true,
            data: {
                backupCount: files.length,
                totalSize,
                lastBackupTime: lastBackup,
                autoBackupEnabled: settings.autoBackupEnabled || false
            }
        });
    }
    catch (error) {
        console.error('获取备份状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取备份状态失败'
        });
    }
});
/**
 * @route POST /api/v1/system/backup/restore/:filename
 * @desc 从备份恢复数据（覆盖现有数据）
 * @access Private (Admin)
 */
router.post('/backup/restore/:filename', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { filename } = req.params;
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        const filePath = path_1.default.join(backupDir, path_1.default.basename(filename));
        // 安全检查
        if (!filePath.startsWith(backupDir)) {
            return res.status(400).json({
                success: false,
                message: '无效的文件路径'
            });
        }
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: '备份文件不存在'
            });
        }
        // 读取备份文件
        const backupContent = fs_1.default.readFileSync(filePath, 'utf-8');
        const backup = JSON.parse(backupContent);
        if (!backup.data || !backup.version) {
            return res.status(400).json({
                success: false,
                message: '备份文件格式无效'
            });
        }
        console.log(`[恢复] 开始从备份恢复数据: ${filename}`);
        console.log(`[恢复] 备份版本: ${backup.version}, 时间: ${backup.timestamp}`);
        const restoreResults = {};
        // 定义恢复顺序（先删除依赖表，再恢复基础表）
        // 注意：恢复是覆盖操作，会先清空表再插入数据
        const restoreOrder = [
            // 先恢复基础表
            { name: 'system_configs', repo: database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig) },
            { name: 'roles', repo: database_1.AppDataSource.getRepository(Role_1.Role) },
            { name: 'permissions', repo: database_1.AppDataSource.getRepository(Permission_1.Permission) },
            { name: 'departments', repo: database_1.AppDataSource.getRepository(Department_1.Department) },
            { name: 'users', repo: database_1.AppDataSource.getRepository(User_1.User) },
            { name: 'product_categories', repo: database_1.AppDataSource.getRepository(ProductCategory_1.ProductCategory) },
            { name: 'products', repo: database_1.AppDataSource.getRepository(Product_1.Product) },
            { name: 'customers', repo: database_1.AppDataSource.getRepository(Customer_1.Customer) },
            { name: 'customer_tags', repo: database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag) },
            { name: 'customer_groups', repo: database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup) },
            { name: 'orders', repo: database_1.AppDataSource.getRepository(Order_1.Order) },
            { name: 'order_items', repo: database_1.AppDataSource.getRepository(OrderItem_1.OrderItem) },
            { name: 'after_sales_services', repo: database_1.AppDataSource.getRepository(AfterSalesService_1.AfterSalesService) },
            { name: 'logistics_companies', repo: database_1.AppDataSource.getRepository(LogisticsCompany_1.LogisticsCompany) },
            { name: 'logistics_trackings', repo: database_1.AppDataSource.getRepository(LogisticsTracking_1.LogisticsTracking) },
            { name: 'performance_metrics', repo: database_1.AppDataSource.getRepository(PerformanceMetric_1.PerformanceMetric) },
            { name: 'follow_ups', repo: database_1.AppDataSource.getRepository(FollowUp_1.FollowUp) },
            { name: 'sms_templates', repo: database_1.AppDataSource.getRepository(SmsTemplate_1.SmsTemplate) },
            { name: 'announcements', repo: database_1.AppDataSource.getRepository(Announcement_1.Announcement) },
            { name: 'department_order_limits', repo: database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit) }
        ];
        // 使用事务进行恢复
        const queryRunner = database_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            for (const entity of restoreOrder) {
                const tableData = backup.data[entity.name];
                if (!tableData || !Array.isArray(tableData)) {
                    restoreResults[entity.name] = { success: true, count: 0 };
                    continue;
                }
                try {
                    // 清空表（使用TRUNCATE会更快，但需要禁用外键检查）
                    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 0`);
                    await queryRunner.query(`TRUNCATE TABLE ${entity.name}`);
                    await queryRunner.query(`SET FOREIGN_KEY_CHECKS = 1`);
                    // 插入数据
                    if (tableData.length > 0) {
                        // 使用queryRunner直接插入以避免类型问题
                        const repo = entity.repo;
                        await repo.save(tableData);
                    }
                    restoreResults[entity.name] = { success: true, count: tableData.length };
                    console.log(`[恢复] ${entity.name}: 恢复 ${tableData.length} 条记录`);
                }
                catch (err) {
                    const errorMsg = err instanceof Error ? err.message : '未知错误';
                    restoreResults[entity.name] = { success: false, count: 0, error: errorMsg };
                    console.error(`[恢复] ${entity.name} 失败:`, err);
                }
            }
            await queryRunner.commitTransaction();
            console.log(`[恢复] 数据恢复完成`);
            res.json({
                success: true,
                message: '数据恢复成功',
                data: {
                    filename,
                    backupTime: backup.timestamp,
                    results: restoreResults,
                    totalRestored: Object.values(restoreResults).reduce((sum, r) => sum + r.count, 0)
                }
            });
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    catch (error) {
        console.error('恢复备份失败:', error);
        res.status(500).json({
            success: false,
            message: '恢复备份失败: ' + (error instanceof Error ? error.message : '未知错误')
        });
    }
});
/**
 * @route DELETE /api/v1/system/backup/cleanup
 * @desc 清理过期备份文件
 * @access Private (Admin)
 */
router.delete('/backup/cleanup', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { retentionDays = 30 } = req.body;
        const backupDir = path_1.default.join(process.cwd(), 'backups');
        if (!fs_1.default.existsSync(backupDir)) {
            return res.json({
                success: true,
                message: '没有需要清理的备份',
                data: { deletedCount: 0, freedSize: 0 }
            });
        }
        const now = Date.now();
        const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
        let deletedCount = 0;
        let freedSize = 0;
        const files = fs_1.default.readdirSync(backupDir);
        for (const filename of files) {
            if (!filename.endsWith('.json') && !filename.endsWith('.sql') && !filename.endsWith('.gz')) {
                continue;
            }
            const filePath = path_1.default.join(backupDir, filename);
            const stats = fs_1.default.statSync(filePath);
            const fileAge = now - stats.mtime.getTime();
            if (fileAge > retentionMs) {
                freedSize += stats.size;
                fs_1.default.unlinkSync(filePath);
                deletedCount++;
                console.log(`[清理] 删除过期备份: ${filename}`);
            }
        }
        res.json({
            success: true,
            message: `清理完成，删除了 ${deletedCount} 个过期备份`,
            data: {
                deletedCount,
                freedSize,
                freedSizeFormatted: `${(freedSize / 1024 / 1024).toFixed(2)} MB`
            }
        });
    }
    catch (error) {
        console.error('清理备份失败:', error);
        res.status(500).json({
            success: false,
            message: '清理备份失败'
        });
    }
});
exports.default = router;
//# sourceMappingURL=system.js.map