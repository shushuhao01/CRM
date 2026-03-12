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

// 路径到模块的映射
const PATH_MODULE_MAP: Record<string, string> = {
  '/auth': 'auth',
  '/licenses': 'licenses',
  '/tenants': 'tenants',
  '/payment': 'payment',
  '/packages': 'packages',
  '/versions': 'versions',
  '/modules': 'modules',
  '/admin-users': 'admin_users',
  '/system-settings': 'system_settings',
  '/api-configs': 'api_configs',
  '/notification-templates': 'notification_templates',
  '/upload': 'upload',
};

// 路径到操作对象类型的映射
const PATH_TARGET_MAP: Record<string, string> = {
  '/licenses': 'license',
  '/tenants': 'tenant',
  '/payment': 'payment_order',
  '/packages': 'package',
  '/versions': 'version',
  '/modules': 'module',
  '/admin-users': 'admin_user',
  '/system-settings': 'system_setting',
  '/api-configs': 'api_config',
  '/notification-templates': 'notification_template',
};

// 需要跳过的路径（GET类或不需要记录的操作）
const SKIP_PATHS = [
  '/auth/profile',     // 获取个人信息
  '/export/',          // 导出操作
  '/upload/',          // 文件上传单独处理
  '/dashboard/',       // 仪表盘查询
  '/operation-logs/',  // 操作日志查询本身
  '/verify/',          // 授权验证
  '/public/',          // 公开接口
];

/**
 * 根据请求路径和方法推断操作类型
 */
function inferAction(method: string, path: string): string {
  const lowerPath = path.toLowerCase();

  // 特殊路径映射
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
  if (lowerPath.includes('/config')) return 'update_config';

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
 * 从请求路径中提取模块名
 */
function extractModule(path: string): string {
  // path 格式类似 /licenses/xxx 或 /tenants/xxx/renew
  for (const [prefix, module] of Object.entries(PATH_MODULE_MAP)) {
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
  for (const [prefix, targetType] of Object.entries(PATH_TARGET_MAP)) {
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
 * 生成操作详情描述
 */
function generateDetail(method: string, path: string, body: any, action: string, module: string): string {
  const moduleNames: Record<string, string> = {
    auth: '认证', licenses: '私有客户', tenants: '租户', payment: '支付',
    packages: '套餐', versions: '版本', modules: '模块', admin_users: '管理员',
    system_settings: '系统设置', api_configs: '接口配置', notification_templates: '通知模板'
  };

  const actionNames: Record<string, string> = {
    create: '创建', update: '更新', delete: '删除', enable: '启用', disable: '禁用',
    lock: '锁定', unlock: '解锁', login: '登录', logout: '登出', publish: '发布',
    deprecate: '废弃', revoke: '吊销', renew: '续期', suspend: '停用', resume: '恢复',
    regenerate: '重新生成', refund: '退款', close: '关闭', reset_password: '重置密码',
    change_password: '修改密码', update_config: '更新配置', other: '操作',
    update_settings: '更新设置'
  };

  const moduleName = moduleNames[module] || module;
  const actionName = actionNames[action] || action;

  // 尝试从请求体中获取名称标识
  let nameInfo = '';
  if (body) {
    const name = body.name || body.customerName || body.customer_name || body.username || body.title || body.version || '';
    if (name) nameInfo = `「${name}」`;
  }

  return `${actionName}${moduleName}${nameInfo}`;
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
        const ip = req.ip || req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || '';
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
          console.error('[OperationLogger] Failed to write log:', err.message);
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
    console.error('[OperationLogger] DB write failed:', error.message);
  }
}
