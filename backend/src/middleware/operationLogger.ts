/**
 * Admin Operation Logger Middleware
 * 自动记录管理员的所有写操作（POST/PUT/DELETE）到操作日志表
 *
 * 工作原理：
 * 1. 拦截 POST/PUT/DELETE 请求
 * 2. 在响应完成后（res.finish事件），根据请求路径和方法自动分类
 * 3. 仅记录成功的操作（HTTP 2xx/3xx）
 * 4. 自动提取模块名、操作类型、操作对象等信息
 */
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';

import { log } from '../config/logger';
// 路径到模块的映射（长路径优先匹配）
const PATH_MODULE_MAP: [string, string][] = [
  ['/system-config/sms/test', 'system_settings'],
  ['/system-config/sms', 'system_settings'],
  ['/system-config', 'system_settings'],
  ['/system/email-settings/test', 'system_settings'],
  ['/system/email-settings', 'system_settings'],
  ['/timeout-reminder', 'system_settings'],
  ['/system-settings', 'system_settings'],
  ['/notification-templates', 'notification_templates'],
  ['/admin-users', 'admin_users'],
  ['/api-configs', 'api_configs'],
  ['/auth', 'auth'],
  ['/licenses', 'licenses'],
  ['/tenants', 'tenants'],
  ['/payment', 'payment'],
  ['/packages', 'packages'],
  ['/versions', 'versions'],
  ['/modules', 'modules'],
  ['/upload', 'upload'],
];

// 路径到操作对象类型的映射
const PATH_TARGET_MAP: [string, string][] = [
  ['/system-config/sms', 'sms_config'],
  ['/system-config', 'system_config'],
  ['/system/email-settings', 'email_settings'],
  ['/timeout-reminder', 'timeout_config'],
  ['/system-settings', 'system_setting'],
  ['/notification-templates', 'notification_template'],
  ['/admin-users', 'admin_user'],
  ['/api-configs', 'api_config'],
  ['/licenses', 'license'],
  ['/tenants', 'tenant'],
  ['/payment', 'payment_order'],
  ['/packages', 'package'],
  ['/versions', 'version'],
  ['/modules', 'module'],
];

// 需要跳过的路径（GET类或不需要记录的操作）
const SKIP_PATHS = [
  '/auth/profile',           // 获取个人信息
  '/export/',                // 导出操作
  '/dashboard/',             // 仪表盘查询
  '/operation-logs',         // 操作日志查询/修复本身
  '/verify/',                // 授权验证
  '/public/',                // 公开接口
];

// 特殊路径 → 精确的操作描述（路径前缀 → [action, detail]）
const PATH_DETAIL_MAP: [string, string, string][] = [
  ['/system-config/sms/test', 'test', '测试短信发送'],
  ['/system-config/sms', 'update_config', '保存短信配置'],
  ['/system-config', 'update_config', '保存系统配置'],
  ['/system/email-settings/test', 'test', '测试邮件发送'],
  ['/system/email-settings', 'update_config', '保存邮件配置'],
  ['/timeout-reminder/check', 'test', '手动触发超时检测'],
  ['/timeout-reminder/config', 'update_config', '保存超时提醒配置'],
  ['/upload', 'upload', '上传文件'],
];


/**
 * 根据请求路径和方法推断操作类型
 */
function inferAction(method: string, path: string): string {
  const lowerPath = path.toLowerCase();

  // 先检查精确路径映射
  for (const [prefix, action] of PATH_DETAIL_MAP) {
    if (lowerPath.startsWith(prefix)) {
      return action;
    }
  }

  // 特殊路径关键词映射
  if (lowerPath.includes('/login')) return 'login';
  if (lowerPath.includes('/logout')) return 'logout';
  if (lowerPath.includes('/password')) return 'change_password';
  if (lowerPath.includes('/reset-password')) return 'reset_password';
  if (lowerPath.includes('/publish')) return 'publish';
  if (lowerPath.includes('/deprecate')) return 'deprecate';
  if (lowerPath.includes('/revoke')) return 'revoke';
  if (lowerPath.includes('/renew')) return 'renew';
  if (lowerPath.includes('/suspend')) return 'suspend';
  if (lowerPath.includes('/resume')) return 'resume';
  if (lowerPath.includes('/enable')) return 'enable';
  if (lowerPath.includes('/disable')) return 'disable';
  if (lowerPath.includes('/lock')) return 'lock';
  if (lowerPath.includes('/unlock')) return 'unlock';
  if (lowerPath.includes('/regenerate')) return 'regenerate';
  if (lowerPath.includes('/refund')) return 'refund';
  if (lowerPath.includes('/close')) return 'close';
  if (lowerPath.includes('/test')) return 'test';
  if (lowerPath.includes('/send')) return 'send';

  // 根据 HTTP 方法推断
  switch (method) {
    case 'POST': return 'create';
    case 'PUT':
    case 'PATCH': return 'update';
    case 'DELETE': return 'delete';
    default: return 'other';
  }
}

/**
 * 从请求路径中提取模块名（使用有序数组，长路径优先）
 */
function extractModule(path: string): string {
  for (const [prefix, module] of PATH_MODULE_MAP) {
    if (path.startsWith(prefix)) {
      return module;
    }
  }
  return 'other';
}

/**
 * 从请求路径中提取目标类型
 */
function extractTargetType(path: string): string {
  for (const [prefix, targetType] of PATH_TARGET_MAP) {
    if (path.startsWith(prefix)) {
      return targetType;
    }
  }
  return '';
}

/**
 * 从请求路径中提取目标ID（UUID格式）
 */
function extractTargetId(path: string): string {
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  return match ? match[0] : '';
}

/**
 * 提取真实IP地址
 */
function extractRealIp(req: Request): string {
  // 优先从代理头获取
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    if (ip && ip !== '::1' && ip !== '::ffff:127.0.0.1') return ip;
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const ip = typeof realIp === 'string' ? realIp : realIp[0];
    if (ip && ip !== '::1' && ip !== '::ffff:127.0.0.1') return ip;
  }

  let ip = req.ip || req.socket?.remoteAddress || '';

  // 转换 IPv6 回环地址
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    ip = '127.0.0.1';
  }

  // 去掉 IPv6 前缀
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  return ip || '127.0.0.1';
}

/**
 * 生成操作详情描述
 */
function generateDetail(method: string, path: string, body: any, action: string, module: string): string {
  // 先检查精确路径描述
  const lowerPath = path.toLowerCase();
  for (const [prefix, , detail] of PATH_DETAIL_MAP) {
    if (lowerPath.startsWith(prefix)) {
      // 尝试追加名称信息
      const nameInfo = extractNameFromBody(body);
      return nameInfo ? `${detail}${nameInfo}` : detail;
    }
  }

  const moduleNames: Record<string, string> = {
    auth: '认证', licenses: '授权', tenants: '租户', payment: '支付订单',
    packages: '套餐', versions: '版本', modules: '模块', admin_users: '管理员',
    system_settings: '系统配置', api_configs: '接口配置', notification_templates: '通知模板',
    upload: '文件', other: ''
  };

  const actionNames: Record<string, string> = {
    create: '创建', update: '更新', delete: '删除', enable: '启用', disable: '禁用',
    lock: '锁定', unlock: '解锁', login: '登录', logout: '登出', publish: '发布',
    deprecate: '废弃', revoke: '吊销', renew: '续期', suspend: '暂停', resume: '恢复',
    regenerate: '重新生成', refund: '退款', close: '关闭', reset_password: '重置密码',
    change_password: '修改密码', update_config: '更新配置', test: '测试', send: '发送',
    upload: '上传', other: '操作'
  };

  const moduleName = moduleNames[module] || module;
  const actionName = actionNames[action] || action;
  const nameInfo = extractNameFromBody(body);

  return `${actionName}${moduleName}${nameInfo}`;
}

/**
 * 从请求体中提取名称标识
 */
function extractNameFromBody(body: any): string {
  if (!body) return '';
  const name = body.name || body.templateName || body.template_name || body.customerName
    || body.customer_name || body.username || body.title || body.version
    || body.templateCode || body.template_code || '';
  return name ? `「${name}」` : '';
}

/**
 * 操作日志自动记录中间件
 */
export function adminOperationLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // 只拦截写操作
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // 获取相对于 /api/v1/admin 的路径
  const fullPath = req.path; // 在 admin router 下，这已经是相对路径

  // 跳过不需要记录的路径
  for (const skipPath of SKIP_PATHS) {
    if (fullPath.startsWith(skipPath)) {
      return next();
    }
  }

  // 暂存原始 json 方法以拦截响应状态码
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    // 只在响应成功时记录日志
    const statusCode = res.statusCode;
    if (statusCode >= 200 && statusCode < 400) {
      // 异步记录，不阻塞响应
      const adminUser = (req as any).adminUser;
      if (adminUser) {
        const module = extractModule(fullPath);
        const action = inferAction(req.method, fullPath);
        const targetType = extractTargetType(fullPath);
        const targetId = extractTargetId(fullPath) || (body?.data?.id || '');
        const detail = generateDetail(req.method, fullPath, req.body, action, module);
        const ip = extractRealIp(req);
        const userAgent = req.headers['user-agent'] || '';

        // 异步写入，不等待
        writeOperationLog({
          adminId: adminUser.adminId || '',
          adminName: adminUser.username || adminUser.name || 'unknown',
          module,
          action,
          targetType,
          targetId: String(targetId || ''),
          detail,
          ip,
          userAgent
        }).catch(err => {
          log.error('[OperationLogger] Failed to write log:', err.message);
        });
      }
    }

    return originalJson(body);
  } as any;

  next();
}

/**
 * 写入操作日志到数据库
 */
async function writeOperationLog(params: {
  adminId: string;
  adminName: string;
  module: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  ip: string;
  userAgent: string;
}) {
  try {
    const { v4: uuidv4 } = require('uuid');
    await AppDataSource.query(
      `INSERT INTO admin_operation_logs (id, admin_id, admin_name, module, action, target_type, target_id, detail, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        params.adminId,
        params.adminName,
        params.module,
        params.action,
        params.targetType || null,
        params.targetId || null,
        params.detail,
        params.ip,
        params.userAgent
      ]
    );
  } catch (error: any) {
    log.error('[OperationLogger] DB write failed:', error.message);
  }
}
