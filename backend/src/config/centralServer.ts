/**
 * 中央服务器配置 - 私有部署回调中枢
 *
 * 私有部署的 CRM 系统需要定期/按需与云客中央服务器通信，
 * 以实现授权管控、配置同步、公告推送等功能。
 *
 * 中央服务器域名：
 *   - API后端:    https://api.yunkes.com
 *   - 管理后台:   https://admin.yunkes.com
 *   - 官网:       https://yunkes.com
 *   - CRM主应用:  https://crm.yunkes.com
 *
 * ⚠️ 私有部署必须确保能访问 CENTRAL_API_URL，否则以下功能不可用：
 *   - 授权码激活与验证
 *   - 定期心跳同步（授权状态、用户限制、过期检查）
 *   - 系统公告接收
 *   - 系统配置/功能开关同步
 *   - 版本更新检查
 *   - 短信额度/模板查询
 *   - 企微管理套餐与定价
 *   - 会话存档增值服务
 *   - AI助手额度管理
 *   - 获客助手用量
 */

import { log } from './logger';

// ==================== 中央服务器地址配置 ====================
// 优先级: 环境变量 > 默认值(云客官方服务器)

export const CENTRAL_SERVER = {
  /** 中央API后端地址（核心，所有回调请求走此地址） */
  API_URL: process.env.CENTRAL_API_URL || 'https://api.yunkes.com',

  /** 管理后台地址（用于管理后台相关API请求） */
  ADMIN_URL: process.env.CENTRAL_ADMIN_URL || 'https://admin.yunkes.com',

  /** 官网地址 */
  WEBSITE_URL: process.env.CENTRAL_WEBSITE_URL || 'https://yunkes.com',

  /** CRM主应用地址 */
  CRM_URL: process.env.CENTRAL_CRM_URL || 'https://crm.yunkes.com',
};

/**
 * 获取中央管理后台 API 基础地址
 * 即 ADMIN_API_URL，用于所有需要回调中央服务器的场景
 *
 * 在 SaaS 模式下指向自身（localhost），私有部署指向中央服务器
 */
export const getCentralAdminApiUrl = (): string => {
  // 优先使用显式配置的 ADMIN_API_URL（兼容旧配置）
  if (process.env.ADMIN_API_URL) {
    return process.env.ADMIN_API_URL;
  }

  const deployMode = process.env.DEPLOY_MODE || 'private';

  if (deployMode === 'saas') {
    // SaaS模式：管理后台在本机，API请求走本地
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}/api/v1/admin`;
  }

  // 私有部署模式：请求中央服务器
  return `${CENTRAL_SERVER.API_URL}/api/v1/admin`;
};

/**
 * 私有部署需要回调中央服务器的完整清单
 *
 * 共 12 类请求，按功能分组：
 *
 * ═══════════════════════════════════════════════════════════
 * 一、授权与安全（3项）
 * ═══════════════════════════════════════════════════════════
 * 1. 授权码激活
 *    POST ${ADMIN_API}/verify/license
 *    触发: 用户首次输入授权码时
 *    数据: { licenseKey, machineId }
 *    来源: routes/license.ts → activate 路由
 *
 * 2. 授权心跳同步（定时30分钟）
 *    POST ${ADMIN_API}/verify/license
 *    触发: LicenseSyncScheduler 每30分钟自动执行
 *    数据: { licenseKey, machineId }
 *    功能: 同步 maxUsers、expiresAt、features、licenseType、userLimitMode、maxOnlineSeats
 *    来源: services/LicenseService.ts → verifyOnline()
 *         services/LicenseSyncScheduler.ts → sync()
 *
 * 3. 手动同步授权
 *    POST ${ADMIN_API}/verify/license
 *    触发: 用户在授权页面点击"同步"按钮
 *    来源: routes/license.ts → /sync 路由
 *
 * ═══════════════════════════════════════════════════════════
 * 二、系统配置（3项）
 * ═══════════════════════════════════════════════════════════
 * 4. 系统配置同步（品牌/版权/功能开关/分发配置）
 *    GET ${ADMIN_API}/public/system-config
 *    触发: CRM前端加载时自动请求
 *    功能: 获取管理后台配置的系统名称、Logo、版权、功能开关、控制台加密等
 *    来源: CRM前端 stores/config.ts → loadSystemConfigFromAPI()
 *
 * 5. 系统公告
 *    GET ${ADMIN_API}/announcements (需转发/代理)
 *    触发: CRM前端定期拉取
 *    功能: 接收管理后台发布的系统级公告
 *    来源: 管理后台 routes/admin/announcements.ts
 *
 * 6. 版本更新检查
 *    GET ${ADMIN_API}/verify/version
 *    触发: 系统启动时或定期检查
 *    功能: 获取最新版本号、更新日志、下载地址
 *    来源: routes/admin/verify.ts → GET /version
 *
 * ═══════════════════════════════════════════════════════════
 * 三、企微管理（3项）
 * ═══════════════════════════════════════════════════════════
 * 7. 企微套餐与定价
 *    GET ${ADMIN_API}/wecom-management/pricing-config
 *    触发: CRM企微设置页面加载
 *    功能: 获取管理后台配置的企微服务套餐和定价
 *    来源: admin wecom-management 路由
 *
 * 8. 会话存档增值服务（代购）
 *    GET ${ADMIN_API}/wecom-management/purchase-orders
 *    POST ${ADMIN_API}/wecom-management/purchase-orders/:id/fulfill
 *    触发: 租户/私有客户购买会话存档时
 *    来源: admin wecom-management 路由
 *
 * 9. AI助手额度管理
 *    GET ${ADMIN_API}/wecom-management/ai/models (可用模型列表)
 *    GET ${ADMIN_API}/wecom-management/ai/tenant-quotas (租户额度)
 *    触发: AI助手功能使用时
 *    来源: admin wecom-management AI 路由
 *
 * ═══════════════════════════════════════════════════════════
 * 四、短信服务（1项）
 * ═══════════════════════════════════════════════════════════
 * 10. 短信额度与模板
 *    管理后台负责配置全局短信模板和分配额度
 *    私有部署通过授权同步获得短信相关配置
 *    来源: admin/sms-management, admin/sms-quota
 *
 * ═══════════════════════════════════════════════════════════
 * 五、获客助手（1项）
 * ═══════════════════════════════════════════════════════════
 * 11. 获客助手用量
 *    GET ${ADMIN_API}/wecom-management/acquisition-usage
 *    触发: 获客助手功能使用统计
 *    来源: admin wecom-management 路由
 *
 * ═══════════════════════════════════════════════════════════
 * 六、企微服务商回调（1项）
 * ═══════════════════════════════════════════════════════════
 * 12. 企微服务商Suite回调
 *    企微服务商应用的回调URL必须指向中央服务器
 *    因为suite_ticket由企微推送到固定URL
 *    回调URL: https://api.yunkes.com/api/v1/wecom/suite/callback
 *    来源: routes/wecom/suite-callback.ts
 *
 * ═══════════════════════════════════════════════════════════
 */
export const CENTRAL_API_ENDPOINTS = {
  // 授权与安全
  LICENSE_VERIFY: '/verify/license',
  TENANT_LICENSE_VERIFY: '/verify/tenant-license',
  VERSION_CHECK: '/verify/version',

  // 系统配置
  SYSTEM_CONFIG: '/public/system-config',

  // 企微管理
  WECOM_PRICING: '/wecom-management/pricing-config',
  WECOM_PURCHASE_ORDERS: '/wecom-management/purchase-orders',
  WECOM_AI_MODELS: '/wecom-management/ai/models',
  WECOM_AI_QUOTAS: '/wecom-management/ai/tenant-quotas',
  WECOM_AI_BILLING: '/wecom-management/ai/billing',
  WECOM_AI_GLOBAL_SETTINGS: '/wecom-management/ai/global-settings',

  // 短信
  SMS_QUOTAS: '/sms-quota',

  // 获客助手
  ACQUISITION_USAGE: '/wecom-management/acquisition-usage',
};

/**
 * 打印中央服务器配置（启动时日志）
 */
export const printCentralServerConfig = (): void => {
  const deployMode = process.env.DEPLOY_MODE || 'private';

  if (deployMode === 'saas') {
    log.info('[CentralServer] SaaS模式 - 管理后台在本机运行');
    return;
  }

  const adminApiUrl = getCentralAdminApiUrl();

  log.info('═'.repeat(60));
  log.info('[CentralServer] 私有部署 - 中央服务器配置');
  log.info('═'.repeat(60));
  log.info(`  中央API地址:    ${CENTRAL_SERVER.API_URL}`);
  log.info(`  管理后台API:    ${adminApiUrl}`);
  log.info(`  管理后台地址:   ${CENTRAL_SERVER.ADMIN_URL}`);
  log.info(`  官网地址:       ${CENTRAL_SERVER.WEBSITE_URL}`);
  log.info(`  回调项目数:     12 类`);
  log.info('─'.repeat(60));
  log.info('  核心回调:');
  log.info('    ✓ 授权码激活与验证');
  log.info('    ✓ 心跳同步（30分钟/次）');
  log.info('    ✓ 系统配置/功能开关/公告');
  log.info('    ✓ 版本更新检查');
  log.info('    ✓ 企微套餐/会话存档/AI额度');
  log.info('    ✓ 短信额度/获客助手用量');
  log.info('═'.repeat(60));
};

export default CENTRAL_SERVER;
