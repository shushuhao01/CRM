/**
 * Admin Routes - 平台管理后台路由
 * 只在 ENABLE_ADMIN=true 时启用
 */
import { Router, Request, Response } from 'express';
import { adminAuthMiddleware } from '../../middleware/adminAuth';
import { adminOperationLoggerMiddleware } from '../../middleware/operationLogger';
import { requireSaaSMode } from '../../middleware/saasGuard';
import { AppDataSource } from '../../config/database';
import authRouter from './auth';
import licensesRouter from './licenses';
import versionsRouter from './versions';
import dashboardRouter from './dashboard';
import verifyRouter from './verify';
import systemConfigRouter from './systemConfig';
import tenantsRouter from './tenants';
import packagesRouter from './packages';
import paymentRouter from './payment';
import modulesRouter from './modules';
import notificationTemplatesRouter from './notification-templates';
import adminUsersRouter from './admin-users';
import systemSettingsRouter from './system-settings';
import apiConfigsRouter from './api-configs';
import uploadRouter from './upload';
import operationLogsRouter from './operation-logs';
import exportRouter from './export';
import notificationsRouter from './notifications';
import announcementsRouter from './announcements';
import privateCustomersRouter from './private-customers';
import recycleBinRouter from './recycle-bin';
import updateTasksRouter from './update-tasks';
import customerManagementRouter from './customer-management';
import adminRolesRouter from './roles';
import capacityRouter from './capacity';
import tenantExportRouter from './tenant-export';
import tenantImportRouter from './tenant-import';
import smsManagementRouter from './sms-management';
import smsQuotaRouter from './sms-quota';
import wecomManagementRouter from './wecom-management';
import { log } from '../../config/logger';
// import schedulerRouter from './scheduler'; // 暂时禁用

const router = Router();

// ============ 公开接口（不需要认证，放在认证中间件之前）============
router.use('/verify', verifyRouter);

// 公开的系统配置接口（供CRM前端调用）
// 路径: GET /api/v1/admin/public/system-config
// 注意：不能用 router.use('/public', systemConfigRouter)，因为同一个Router实例有同路径GET会冲突
router.get('/public/system-config', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => [])

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}')
      const responseData: Record<string, any> = {}

      const hasOverride = {
        basic: data.enableBasicOverride || false,
        copyright: data.enableCopyrightOverride || false,
        agreement: data.enableAgreementOverride || false,
        // 版权文字和技术支持始终由管理后台控制，只要有值就标记
        copyrightText: !!(data.copyrightText),
        techSupport: !!(data.techSupport)
      }

      if (data.enableBasicOverride) {
        responseData.systemName = data.systemName
        responseData.systemVersion = data.systemVersion
        responseData.companyName = data.companyName
        responseData.contactPhone = data.contactPhone
        responseData.contactEmail = data.contactEmail
        responseData.websiteUrl = data.websiteUrl
        responseData.companyAddress = data.companyAddress
        responseData.systemDescription = data.systemDescription
        responseData.systemLogo = data.systemLogo
        responseData.contactQRCode = data.contactQRCode
        responseData.contactQRCodeLabel = data.contactQRCodeLabel
      }

      // 版权文字和技术支持始终从管理后台获取（不受enableCopyrightOverride开关控制）
      if (data.copyrightText) {
        responseData.copyrightText = data.copyrightText
      }
      if (data.techSupport) {
        responseData.techSupport = data.techSupport
      }

      if (data.enableCopyrightOverride) {
        responseData.icpNumber = data.icpNumber
        responseData.policeNumber = data.policeNumber
      }

      if (data.enableAgreementOverride) {
        responseData.userAgreement = data.userAgreement
        responseData.privacyPolicy = data.privacyPolicy
      }

      // 过滤distributedConfig：去掉__draft草稿（未正式管控的配置不下发）
      let cleanDistributedConfig: any = null
      if (data.distributedConfig && typeof data.distributedConfig === 'object') {
        cleanDistributedConfig = {}
        for (const [k, v] of Object.entries(data.distributedConfig)) {
          if (v && typeof v === 'object' && !(v as any).__draft) {
            cleanDistributedConfig[k] = v
          } else {
            cleanDistributedConfig[k] = null
          }
        }
      }

      res.json({
        success: true,
        data: {
          ...responseData,
          hasOverride,
          featureFlags: data.featureFlags || null,
          distributedConfig: cleanDistributedConfig,
          enableConsoleEncryption: data.enableConsoleEncryption === true
        }
      })
    } else {
      res.json({
        success: true,
        data: {
          hasOverride: { basic: false, copyright: false, agreement: false },
          featureFlags: null,
          distributedConfig: null,
          enableConsoleEncryption: false
        }
      })
    }
  } catch (error) {
    log.error('获取公开系统配置失败:', error)
    res.json({
      success: true,
      data: {
        hasOverride: { basic: false, copyright: false, agreement: false },
          featureFlags: null,
          distributedConfig: null,
          enableConsoleEncryption: false
      }
    })
  }
});

// ============ 需要认证的接口 ============
router.use(adminAuthMiddleware);
router.use(adminOperationLoggerMiddleware);
router.use('/auth', authRouter);
router.use('/licenses', licensesRouter);
router.use('/versions', versionsRouter);
router.use('/dashboard', dashboardRouter);
// 🔒 SaaS 专属管理路由：租户、套餐、支付、模块管理、容量管理
router.use('/tenants', requireSaaSMode, tenantsRouter);
router.use('/packages', requireSaaSMode, packagesRouter);
router.use('/payment', requireSaaSMode, paymentRouter);
router.use('/modules', requireSaaSMode, modulesRouter);
router.use('/notification-templates', notificationTemplatesRouter);
router.use('/admin-users', adminUsersRouter);
router.use('/api-configs', apiConfigsRouter);
router.use('/upload', uploadRouter);
router.use('/operation-logs', operationLogsRouter);
router.use('/export', exportRouter);
router.use('/notifications', notificationsRouter);
router.use('/announcements', announcementsRouter);
router.use('/private-customers', privateCustomersRouter);
router.use('/recycle-bin', recycleBinRouter);
router.use('/update-tasks', updateTasksRouter);
router.use('/customer-management', customerManagementRouter);
router.use('/roles', adminRolesRouter);
router.use('/capacity', requireSaaSMode, capacityRouter);
router.use('/tenants', requireSaaSMode, tenantExportRouter);   // 租户数据导出 API
router.use('/tenants', requireSaaSMode, tenantImportRouter);   // 租户数据导入 API
router.use('/sms-management', smsManagementRouter); // 短信管理 API
router.use('/sms-quota', smsQuotaRouter); // 短信额度套餐管理 API
router.use('/wecom-management', wecomManagementRouter); // 企微管理 API
router.use('/system-settings', systemSettingsRouter);
// router.use('/scheduler', schedulerRouter); // 暂时禁用
// 需要认证的系统配置路由
router.use('/', systemConfigRouter);

export default router;
