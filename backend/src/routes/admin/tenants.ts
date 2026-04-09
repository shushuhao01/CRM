/**
 * Admin Tenants Routes - 租户管理（含授权码功能）
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

import { log } from '../../config/logger';
import { SITE_CONFIG } from '../../config/sites';
const router = Router();


// 🔥 正确获取客户端IP（支持代理/反向代理）
const getClientIp = (req: Request): string => {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = Array.isArray(xff) ? xff[0] : xff.split(',')[0];
    return first.trim();
  }
  const xri = req.headers['x-real-ip'];
  if (xri) {
    return Array.isArray(xri) ? xri[0] : xri;
  }
  const ip = req.ip || req.socket?.remoteAddress || '';
  // 移除 IPv6 前缀和本地回环地址的特殊处理
  const cleaned = ip.replace(/^::ffff:/, '');
  return (cleaned === '::1' || cleaned === '127.0.0.1') ? '127.0.0.1' : cleaned;
};

// 🔥 递归统计目录大小和文件数（用于清理时统计）
function getDirSizeSync(dirPath: string): { sizeMb: number; fileCount: number } {
  let totalSize = 0;
  let fileCount = 0;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const sub = getDirSizeSync(fullPath);
        totalSize += sub.sizeMb * 1024 * 1024; // 转回字节累加
        fileCount += sub.fileCount;
      } else if (entry.isFile()) {
        try {
          const stats = fs.statSync(fullPath);
          totalSize += stats.size;
          fileCount++;
        } catch { /* 文件无法读取，跳过 */ }
      }
    }
  } catch { /* 目录无法读取，跳过 */ }
  return { sizeMb: totalSize / (1024 * 1024), fileCount };
}

// 生成租户授权码（格式：TENANT-XXXX-XXXX-XXXX-XXXX）
const generateTenantLicenseKey = (): string => {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(crypto.randomBytes(2).toString('hex').toUpperCase());
  }
  return `TENANT-${segments.join('-')}`;
};

// 获取租户列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, packageId, licenseStatus } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    // 检查 subscriptions 表是否存在
    let hasSubscriptionsTable = false;
    try {
      const tableCheck = await AppDataSource.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'subscriptions'`
      );
      hasSubscriptionsTable = tableCheck.length > 0;
    } catch { /* ignore */ }

    const subJoin = hasSubscriptionsTable
      ? `LEFT JOIN (
           SELECT tenant_id,
                  SUBSTRING_INDEX(GROUP_CONCAT(status ORDER BY created_at DESC), ',', 1) as subscription_status,
                  SUBSTRING_INDEX(GROUP_CONCAT(channel ORDER BY created_at DESC), ',', 1) as subscription_channel
           FROM subscriptions
           WHERE status IN ('active','signing','paused')
           GROUP BY tenant_id
         ) sub ON sub.tenant_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci`
      : '';
    const subSelect = hasSubscriptionsTable
      ? `, sub.subscription_status, sub.subscription_channel`
      : '';

    // 检查 used_storage_mb 列是否存在
    let hasStorageCol = true;
    try {
      const storageCheck = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'used_storage_mb'`
      );
      hasStorageCol = storageCheck.length > 0;
    } catch { /* ignore */ }

    const storageSelect = hasStorageCol ? `, COALESCE(t.used_storage_mb, 0) as used_storage_mb` : '';

    let sql = `SELECT t.*, p.name as package_name,
               (SELECT COUNT(*) FROM users u WHERE u.tenant_id COLLATE utf8mb4_unicode_ci = t.id COLLATE utf8mb4_unicode_ci) as real_user_count
               ${storageSelect}
               ${subSelect}
               FROM tenants t
               LEFT JOIN tenant_packages p ON t.package_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci
               ${subJoin}
               WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      sql += ` AND t.status = ?`;
      params.push(status);
    }
    if (keyword) {
      sql += ` AND (t.name LIKE ? OR t.code LIKE ? OR t.license_key LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (packageId) {
      sql += ` AND t.package_id = ?`;
      params.push(packageId);
    }
    if (licenseStatus) {
      sql += ` AND t.license_status = ?`;
      params.push(licenseStatus);
    }

    // 提取WHERE条件用于计数查询
    const whereConditions = (sql.split('WHERE 1=1')[1] || '');
    const countSql = `SELECT COUNT(*) as total FROM tenants t LEFT JOIN tenant_packages p ON t.package_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci WHERE 1=1` + whereConditions;
    // subscription子查询内部已经GROUP BY tenant_id去重，无需外层GROUP BY
    sql += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSizeNum, offset);

    const list = await AppDataSource.query(sql, params);
    const countResult = await AppDataSource.query(countSql, params.slice(0, -2));
    const total = Number(countResult[0]?.total || 0);

    // 🔥 确保 user_count 使用动态计算的值（real_user_count），避免与 t.user_count 列冲突
    const mappedList = (Array.isArray(list) ? list : []).map((row: any) => ({
      ...row,
      user_count: Number(row.real_user_count ?? row.user_count ?? 0),
      used_storage_mb: Number(row.used_storage_mb ?? 0),
      max_users: Number(row.max_users ?? 0),
      max_storage_gb: Number(row.max_storage_gb ?? 0),
      subscription_status: row.subscription_status || null,
      subscription_channel: row.subscription_channel || null
    }));

    res.json({
      success: true,
      data: { list: mappedList, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取租户列表失败' });
  }
});

// 获取租户详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await AppDataSource.query(
      `SELECT t.*, p.name as package_name, p.modules as package_modules FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id COLLATE utf8mb4_unicode_ci = p.id COLLATE utf8mb4_unicode_ci WHERE t.id = ?`, [id]
    );
    const tenant = Array.isArray(rows) ? rows[0] : rows;

    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 🔥 查询该租户的实际用户数
    const userCountRows = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?`, [id]
    );
    tenant.user_count = Number(userCountRows[0]?.cnt || 0);

    // 🔥 查询该租户的订阅状态（优先返回活跃/签约中/暂停状态，其次返回最近的已取消/已过期）
    try {
      const subRows = await AppDataSource.query(
        `SELECT status as subscription_status, channel as subscription_channel, amount as subscription_amount,
                billing_cycle as subscription_billing_cycle, next_deduct_date, sign_date, cancel_date, cancel_reason
         FROM subscriptions WHERE tenant_id = ?
         ORDER BY FIELD(status, 'active', 'signing', 'paused', 'cancelled', 'expired') ASC, created_at DESC LIMIT 1`, [id]
      );
      if (subRows.length > 0) {
        Object.assign(tenant, subRows[0]);
      } else {
        tenant.subscription_status = null;
      }
    } catch {
      tenant.subscription_status = null;
    }

    // 🔥 查询创建人信息（从首条生成日志获取）
    try {
      const creatorLogs = await AppDataSource.query(
        `SELECT operator_id, operator_name FROM tenant_license_logs
         WHERE tenant_id = ? AND action = 'generate' ORDER BY created_at ASC LIMIT 1`,
        [id]
      );
      if (creatorLogs[0] && creatorLogs[0].operator_name) {
        tenant.created_by_name = creatorLogs[0].operator_name;
      } else {
        // 自注册租户：用联系人名称标注"自建"
        tenant.created_by_name = tenant.contact ? `${tenant.contact}（自建）` : '自建';
      }
    } catch {
      tenant.created_by_name = tenant.contact || '未知';
    }

    // 🔥 解析模块信息：优先使用租户自身的features（模块ID列表），其次使用套餐默认modules
    const validModuleIds = ['dashboard','customer','order','service-management','performance','logistics','service','data','finance','product','system'];
    // 中文名称到模块ID的映射
    const chineseToModuleId: Record<string, string> = {
      '数据看板': 'dashboard', '客户管理': 'customer', '订单管理': 'order',
      '服务管理': 'service-management', '业绩统计': 'performance', '物流管理': 'logistics',
      '售后管理': 'service', '资料管理': 'data', '财务管理': 'finance',
      '商品管理': 'product', '系统管理': 'system'
    };

    let tenantModules: string[] = [];
    try {
      const rawFeatures = tenant.features;
      if (rawFeatures) {
        const parsed = typeof rawFeatures === 'string' ? JSON.parse(rawFeatures) : rawFeatures;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasModuleIds = parsed.some((f: string) => validModuleIds.includes(f));
          if (hasModuleIds) {
            tenantModules = parsed.filter((f: string) => validModuleIds.includes(f));
          } else {
            // 🔥 尝试将中文特性名称转换为模块ID
            const mapped = parsed.map((f: string) => chineseToModuleId[f]).filter(Boolean) as string[];
            if (mapped.length > 0) {
              tenantModules = mapped;
              // 自动修正features为模块ID格式（写回数据库）
              AppDataSource.query('UPDATE tenants SET features = ? WHERE id = ?', [JSON.stringify(mapped), id]).catch(() => {});
            }
          }
        }
      }
    } catch { /* ignore parse error */ }

    // 如果租户自身没有模块配置，使用套餐默认模块
    if (tenantModules.length === 0 && tenant.package_modules) {
      try {
        const pkgModules = typeof tenant.package_modules === 'string' ? JSON.parse(tenant.package_modules) : tenant.package_modules;
        if (Array.isArray(pkgModules) && pkgModules.length > 0) {
          const hasIds = pkgModules.some((f: string) => validModuleIds.includes(f));
          if (hasIds) {
            tenantModules = pkgModules.filter((f: string) => validModuleIds.includes(f));
          } else {
            const mapped = pkgModules.map((f: string) => chineseToModuleId[f]).filter(Boolean) as string[];
            if (mapped.length > 0) tenantModules = mapped;
          }
        }
      } catch { /* ignore */ }
    }

    // 🔥 如果仍然为空但有packageId，直接查套餐表拿modules
    if (tenantModules.length === 0 && tenant.package_id) {
      try {
        const pkgRow = await AppDataSource.query('SELECT modules, features as pkg_features FROM tenant_packages WHERE id = ?', [tenant.package_id]);
        if (pkgRow[0]) {
          const raw = pkgRow[0].modules || pkgRow[0].pkg_features;
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed) && parsed.length > 0) {
              const hasIds = parsed.some((f: string) => validModuleIds.includes(f));
              tenantModules = hasIds
                ? parsed.filter((f: string) => validModuleIds.includes(f))
                : parsed.map((f: string) => chineseToModuleId[f]).filter(Boolean) as string[];
            }
          }
        }
      } catch { /* ignore */ }
    }

    // 🔥 第四层兜底：如果仍然为空且有package_id，给予基础默认模块集
    if (tenantModules.length === 0 && tenant.package_id) {
      tenantModules = ['dashboard', 'customer', 'order', 'system'];
      // 自动写入数据库，确保下次不再为空
      AppDataSource.query('UPDATE tenants SET features = ? WHERE id = ?', [JSON.stringify(tenantModules), id]).catch(() => {});
      log.info(`[Admin Tenants] 租户 ${id} 模块为空，已填充默认核心模块: ${tenantModules.join(',')}`);
    }

    // 附加解析后的modules到返回数据
    tenant.modules = tenantModules;

    // 🔥 自动写回 features 字段：确保租户模块与套餐保持同步
    // 同步条件：features为空/无效 OR 租户模块数量比套餐模块数量少（说明未完整同步）
    if (tenantModules.length > 0) {
      const currentFeatures = tenant.features;
      let needSync = false;
      try {
        const parsed = currentFeatures ? (typeof currentFeatures === 'string' ? JSON.parse(currentFeatures) : currentFeatures) : [];
        const validCurrent = Array.isArray(parsed) ? parsed.filter((f: string) => validModuleIds.includes(f)) : [];
        if (validCurrent.length === 0) {
          needSync = true;
        } else if (validCurrent.length < tenantModules.length) {
          // 🔥 租户模块数量少于套餐应有模块数量，需要补全同步
          needSync = true;
        }
      } catch { needSync = true; }
      if (needSync) {
        AppDataSource.query('UPDATE tenants SET features = ? WHERE id = ?', [JSON.stringify(tenantModules), id]).catch(() => {});
        // 同时更新返回数据中的features
        tenant.features = JSON.stringify(tenantModules);
      }
    }

    // 🔥 查询该租户的管理员账号状态
    const adminRows = await AppDataSource.query(
      `SELECT id, username, password, status, login_fail_count, locked_at
       FROM users
       WHERE tenant_id = ? AND role = 'admin'
       ORDER BY created_at ASC`,
      [id]
    );
    // 兼容 MySQL 不同驱动返回格式
    const adminUsers = Array.isArray(adminRows[0]) ? adminRows[0] : (Array.isArray(adminRows) ? adminRows : []);
    tenant.adminUsers = adminUsers.map((u: any) => ({
      id: u.id, username: u.username, status: u.status,
      login_fail_count: u.login_fail_count, locked_at: u.locked_at
    }));
    tenant.hasLockedAdmin = adminUsers.some((u: any) => u.status === 'locked');

    // 🔥 查询密码状态（会员中心密码 + CRM管理员密码）
    try {
      const DEFAULT_PWD = 'Aa123456';
      // 会员中心密码状态：检查 tenants.password_hash
      if (tenant.password_hash) {
        const memberIsDefault = await bcrypt.compare(DEFAULT_PWD, tenant.password_hash);
        tenant.memberPasswordStatus = memberIsDefault ? 'default' : 'custom';
        tenant.memberPasswordDisplay = memberIsDefault ? DEFAULT_PWD : '已修改（无法查看原始密码）';
      } else {
        tenant.memberPasswordStatus = 'not_set';
        tenant.memberPasswordDisplay = '';
      }
      // CRM管理员密码状态：检查第一个管理员的 users.password
      if (adminUsers.length > 0 && adminUsers[0].password) {
        const crmIsDefault = await bcrypt.compare(DEFAULT_PWD, adminUsers[0].password);
        tenant.crmPasswordStatus = crmIsDefault ? 'default' : 'custom';
        tenant.crmPasswordDisplay = crmIsDefault ? DEFAULT_PWD : '已修改（无法查看原始密码）';
      } else {
        tenant.crmPasswordStatus = 'not_set';
        tenant.crmPasswordDisplay = '';
      }
    } catch (pwdErr) {
      log.info('[Admin Tenants] 密码状态检测跳过:', (pwdErr as any).message?.substring(0, 60));
      tenant.memberPasswordStatus = 'unknown';
      tenant.memberPasswordDisplay = '';
      tenant.crmPasswordStatus = 'unknown';
      tenant.crmPasswordDisplay = '';
    }
    // 清理敏感字段（不返回哈希值）
    delete tenant.password_hash;

    // 🔥 动态计算存储空间使用量（统计uploads目录下该租户的文件）
    try {
      const storageResult = await AppDataSource.query(
        `SELECT COALESCE(SUM(
          CASE
            WHEN file_size IS NOT NULL THEN file_size
            ELSE 0
          END
        ), 0) as total_bytes FROM (
          SELECT file_size FROM customer_files WHERE tenant_id = ?
          UNION ALL
          SELECT file_size FROM order_attachments WHERE tenant_id = ?
          UNION ALL
          SELECT file_size FROM after_sale_attachments WHERE tenant_id = ?
        ) as all_files`,
        [id, id, id]
      );
      const totalBytes = Number(storageResult[0]?.total_bytes || 0);
      const calculatedMb = totalBytes / (1024 * 1024);
      // 如果计算出的值大于数据库中存储的值，则使用计算值（更准确）
      if (calculatedMb > 0) {
        tenant.used_storage_mb = Number(calculatedMb.toFixed(2));
      }
    } catch (storageErr) {
      // 存储计算失败不影响主流程，使用数据库中的值
      log.info('[Admin Tenants] 存储空间动态计算跳过（表可能不存在）:', (storageErr as any).message?.substring(0, 60));
    }

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    log.error('[Admin Tenants] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取租户详情失败' });
  }
});

/**
 * 获取租户的用户列表
 * GET /api/v1/admin/tenants/:id/users
 */
router.get('/:id/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证租户存在
    const tenantCheck = await AppDataSource.query('SELECT id FROM tenants WHERE id = ?', [id]);
    if (!tenantCheck || tenantCheck.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 查询租户下所有用户（包含部门名称）
    const users = await AppDataSource.query(
      `SELECT u.id, u.username, u.name, u.real_name, u.phone, u.email,
              u.role, u.position, u.status, u.avatar,
              u.last_login_at, u.login_count,
              u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id AND d.tenant_id = ?
       WHERE u.tenant_id = ?
       ORDER BY u.created_at ASC`,
      [id, id]
    );

    // 格式化返回数据（驼峰命名）
    const list = (Array.isArray(users) ? users : []).map((u: any) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      realName: u.real_name || u.name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      position: u.position,
      status: u.status,
      avatar: u.avatar,
      departmentName: u.department_name,
      lastLoginAt: u.last_login_at,
      loginCount: Number(u.login_count || 0),
      createdAt: u.created_at,
      updatedAt: u.updated_at
    }));

    res.json({ success: true, data: { list, total: list.length } });
  } catch (error: any) {
    log.error('[Admin Tenants] Get users failed:', error);
    res.status(500).json({ success: false, message: '获取租户用户列表失败' });
  }
});

// 创建租户（自动生成授权码）
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const { name, code, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: '租户名称不能为空' });
    }

    // 🔥 如果编码未提供，自动生成格式：T + 年月日 + 随机4位hex
    let tenantCode = code;
    if (!tenantCode) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const rand = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
      tenantCode = `T${yy}${mm}${dd}${rand}`;
      // 确保不重复
      const dupCheck = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [tenantCode]);
      if (dupCheck && dupCheck.length > 0) {
        const rand2 = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
        tenantCode = `T${yy}${mm}${dd}${rand2}`;
      }
    }

    // 检查编码是否已存在
    const existingRows = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [tenantCode]);
    if (existingRows && existingRows.length > 0) {
      return res.status(400).json({ success: false, message: '租户编码已存在' });
    }

    const id = uuidv4();
    const licenseKey = generateTenantLicenseKey();

    // 🔥 如果指定了套餐，获取套餐的modules作为租户的默认功能模块
    const validModuleIdsForCreate = ['dashboard','customer','order','service-management','performance','logistics','service','data','finance','product','system'];
    const chineseToModuleIdForCreate: Record<string, string> = {
      '数据看板': 'dashboard', '客户管理': 'customer', '订单管理': 'order',
      '服务管理': 'service-management', '业绩统计': 'performance', '物流管理': 'logistics',
      '售后管理': 'service', '资料管理': 'data', '财务管理': 'finance',
      '商品管理': 'product', '系统管理': 'system'
    };
    let tenantFeatures: string | null = null;
    if (packageId) {
      try {
        const pkgRows = await AppDataSource.query('SELECT modules, features as pkg_features FROM tenant_packages WHERE id = ?', [packageId]);
        const pkg = pkgRows[0];
        // 优先使用 modules（模块ID列表）
        if (pkg?.modules) {
          const pkgModules = typeof pkg.modules === 'string' ? JSON.parse(pkg.modules) : pkg.modules;
          if (Array.isArray(pkgModules) && pkgModules.length > 0) {
            const hasIds = pkgModules.some((f: string) => validModuleIdsForCreate.includes(f));
            if (hasIds) {
              tenantFeatures = JSON.stringify(pkgModules.filter((f: string) => validModuleIdsForCreate.includes(f)));
            } else {
              // modules是中文名，转换为模块ID
              const mapped = pkgModules.map((f: string) => chineseToModuleIdForCreate[f]).filter(Boolean);
              if (mapped.length > 0) tenantFeatures = JSON.stringify(mapped);
            }
          }
        }
        // 如果modules为空，尝试从features获取
        if (!tenantFeatures && pkg?.pkg_features) {
          const pkgFeatures = typeof pkg.pkg_features === 'string' ? JSON.parse(pkg.pkg_features) : pkg.pkg_features;
          if (Array.isArray(pkgFeatures) && pkgFeatures.length > 0) {
            const hasIds = pkgFeatures.some((f: string) => validModuleIdsForCreate.includes(f));
            if (hasIds) {
              tenantFeatures = JSON.stringify(pkgFeatures.filter((f: string) => validModuleIdsForCreate.includes(f)));
            } else {
              const mapped = pkgFeatures.map((f: string) => chineseToModuleIdForCreate[f]).filter(Boolean);
              if (mapped.length > 0) tenantFeatures = JSON.stringify(mapped);
            }
          }
        }
      } catch (e) {
        log.info('[Admin Tenants] 获取套餐模块信息失败，使用默认:', (e as any).message);
      }
    }
    // 如果套餐没有提供模块信息，使用前端传入的features（非空数组时）
    if (!tenantFeatures && Array.isArray(features) && features.length > 0) {
      tenantFeatures = JSON.stringify(features);
    }
    // 🔥 最终兜底：如果仍然没有模块且有套餐，填充默认核心模块
    if (!tenantFeatures && packageId) {
      tenantFeatures = JSON.stringify(['dashboard', 'customer', 'order', 'system']);
    }

    // 🔥 如果是免费/试用套餐且没有设置到期时间，自动根据套餐 duration_days 计算
    let finalExpireDate = expireDate || null;
    let finalLicenseStatus = 'pending';
    if (packageId) {
      try {
        const pkgInfo = await AppDataSource.query(
          'SELECT price, duration_days, is_trial FROM tenant_packages WHERE id = ?', [packageId]
        );
        if (pkgInfo[0]) {
          const pkgPrice = Number(pkgInfo[0].price) || 0;
          const pkgDays = pkgInfo[0].duration_days || 7;
          const pkgIsTrial = Boolean(pkgInfo[0].is_trial);
          // 免费/试用套餐：自动激活，自动计算到期时间
          if (pkgPrice === 0 || pkgIsTrial) {
            finalLicenseStatus = 'active';
            if (!finalExpireDate) {
              const expire = new Date();
              expire.setDate(expire.getDate() + pkgDays);
              finalExpireDate = expire.toISOString().split('T')[0];
            }
          }
        }
      } catch (e) {
        log.info('[Admin Tenants] 获取套餐价格信息失败:', (e as any).message);
      }
    }

    await AppDataSource.query(
      `INSERT INTO tenants (id, name, code, license_key, license_status, package_id, contact, phone, email, max_users, max_storage_gb, expire_date, features, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
      [id, name, tenantCode, licenseKey, finalLicenseStatus, packageId || null, contact || null, phone || null, email || null,
       maxUsers || 10, maxStorageGb || 5, finalExpireDate, tenantFeatures]
    );

    // 🔥 创建租户默认管理员账号
    let adminAccount: { username: string; password: string } | null = null;
    try {
      const defaultPassword = 'Aa123456';
      const hashedPassword = await bcrypt.hash(defaultPassword, 12);
      const adminUsername = phone || `admin_${tenantCode}`;
      const adminId = uuidv4();

      await AppDataSource.query(
        `INSERT INTO users (id, tenant_id, username, password, name, real_name, phone, email, role, status, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'active', 1, NOW(), NOW())`,
        [adminId, id, adminUsername, hashedPassword, contact || '管理员', contact || '管理员', phone || null, email || null]
      );

      adminAccount = { username: adminUsername, password: defaultPassword };
    } catch (adminErr) {
      log.info('[Admin Tenants] 创建管理员账号失败（可能已存在）:', (adminErr as any).message?.substring(0, 80));
    }

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, ?, 'generate', 'success', ?, ?, ?, ?)`,
      [uuidv4(), id, licenseKey, `创建租户并生成授权码`, getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    res.json({
      success: true,
      data: {
        id,
        licenseKey,
        tenantCode: tenantCode,
        loginUrl: SITE_CONFIG.CRM_URL,
        adminAccount
      },
      message: '租户创建成功，授权码已生成'
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Create failed:', error);
    res.status(500).json({ success: false, message: '创建租户失败' });
  }
});

// 更新租户
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features, modules, status, remark } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (packageId !== undefined) { updates.push('package_id = ?'); params.push(packageId); }
    if (contact !== undefined) { updates.push('contact = ?'); params.push(contact); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (remark !== undefined) { updates.push('remark = ?'); params.push(remark || null); }
    if (maxUsers) { updates.push('max_users = ?'); params.push(maxUsers); }
    if (maxStorageGb) { updates.push('max_storage_gb = ?'); params.push(maxStorageGb); }
    if (expireDate) { updates.push('expire_date = ?'); params.push(expireDate); }
    // modules 优先（模块ID列表），features 次之（文本特性列表）
    // 两者都存入 features 字段，modules 覆盖 features
    if (modules && Array.isArray(modules) && modules.length > 0) {
      updates.push('features = ?'); params.push(JSON.stringify(modules));
    } else if (features) {
      updates.push('features = ?'); params.push(JSON.stringify(features));
    } else if (packageId !== undefined && !modules) {
      // 🔥 如果更换了套餐但没传modules，自动从套餐同步模块
      try {
        const pkgRows = await AppDataSource.query('SELECT modules FROM tenant_packages WHERE id = ?', [packageId]);
        if (pkgRows[0]?.modules) {
          const pkgModules = typeof pkgRows[0].modules === 'string' ? JSON.parse(pkgRows[0].modules) : pkgRows[0].modules;
          if (Array.isArray(pkgModules) && pkgModules.length > 0) {
            updates.push('features = ?'); params.push(JSON.stringify(pkgModules));
          }
        }
      } catch { /* ignore */ }
    }
    if (status) { updates.push('status = ?'); params.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的内容' });
    }

    params.push(id);
    await AppDataSource.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: '租户更新成功' });
  } catch (error: any) {
    log.error('[Admin Tenants] Update failed:', error);
    res.status(500).json({ success: false, message: '更新租户失败' });
  }
});

// 重新生成授权码
router.post('/:id/regenerate-license', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    const rows = await AppDataSource.query('SELECT * FROM tenants WHERE id = ?', [id]);
    const tenant = rows[0];
    if (!tenant) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    const oldLicenseKey = tenant.license_key;
    const newLicenseKey = generateTenantLicenseKey();

    await AppDataSource.query(
      `UPDATE tenants SET license_key = ?, license_status = 'pending', activated_at = NULL WHERE id = ?`,
      [newLicenseKey, id]
    );

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, ?, 'generate', 'success', ?, ?, ?, ?)`,
      [uuidv4(), id, newLicenseKey, `重新生成授权码，旧授权码: ${oldLicenseKey}`, getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, data: { licenseKey: newLicenseKey }, message: '授权码已重新生成' });
  } catch (error: any) {
    log.error('[Admin Tenants] Regenerate license failed:', error);
    res.status(500).json({ success: false, message: '重新生成授权码失败' });
  }
});

// 暂停租户授权
router.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUser = (req as any).adminUser;

    await AppDataSource.query(
      `UPDATE tenants SET license_status = 'suspended', status = 'disabled' WHERE id = ?`, [id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, 'suspend', 'success', ?, ?, ?, ?)`,
      [uuidv4(), id, reason || '管理员暂停授权', getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户授权已暂停' });
  } catch (error: any) {
    log.error('[Admin Tenants] Suspend failed:', error);
    res.status(500).json({ success: false, message: '暂停授权失败' });
  }
});

// 恢复租户授权
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    await AppDataSource.query(
      `UPDATE tenants SET license_status = 'active', status = 'active' WHERE id = ?`, [id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, 'resume', 'success', '恢复租户授权', ?, ?, ?)`,
      [uuidv4(), id, getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户授权已恢复' });
  } catch (error: any) {
    log.error('[Admin Tenants] Resume failed:', error);
    res.status(500).json({ success: false, message: '恢复授权失败' });
  }
});

// 续期租户
router.post('/:id/renew', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expireDate } = req.body;
    const adminUser = (req as any).adminUser;

    if (!expireDate) {
      return res.status(400).json({ success: false, message: '请选择新的到期时间' });
    }

    const rows = await AppDataSource.query('SELECT expire_date FROM tenants WHERE id = ?', [id]);
    const tenant = rows[0];
    const oldExpireDate = tenant?.expire_date;

    await AppDataSource.query(
      `UPDATE tenants SET expire_date = ?, license_status = 'active', status = 'active' WHERE id = ?`,
      [expireDate, id]
    );

    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, 'renew', 'success', ?, ?, ?, ?)`,
      [uuidv4(), id, `续期：${oldExpireDate} -> ${expireDate}`, getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    res.json({ success: true, message: '租户续期成功' });
  } catch (error: any) {
    log.error('[Admin Tenants] Renew failed:', error);
    res.status(500).json({ success: false, message: '续期失败' });
  }
});

// 获取租户授权日志
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const logList = await AppDataSource.query(
      `SELECT * FROM tenant_license_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const logCountResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM tenant_license_logs WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list: Array.isArray(logList) ? logList : [],
        total: Number(logCountResult[0]?.total || 0),
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Get logs failed:', error);
    res.status(500).json({ success: false, message: '获取日志失败' });
  }
});

// 删除租户（软删除，移入回收站）
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 检查租户是否存在
    const rows = await AppDataSource.query('SELECT id FROM tenants WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }

    // 软删除：设置 deleted_at 时间戳
    await AppDataSource.query(
      `UPDATE tenants SET deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
      [(req as any).adminUser?.id || null, id]
    );

    res.json({ success: true, message: '已移入回收站' });
  } catch (error: any) {
    log.error('[Admin Tenants] Soft delete failed:', error);
    res.status(500).json({ success: false, message: '删除租户失败' });
  }
});

// 获取租户账单记录
router.get('/:id/bills', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 10, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    const list = await AppDataSource.query(
      `SELECT id, order_no, tenant_name, package_name, amount, pay_type, status,
              trade_no, contact_name, contact_phone, created_at, paid_at,
              refund_amount, refund_at, refund_reason, remark
       FROM payment_orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [id, pageSizeNum, offset]
    );
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM payment_orders WHERE tenant_id = ?`, [id]
    );

    res.json({
      success: true,
      data: {
        list: Array.isArray(list) ? list : [],
        total: Number(countResult[0]?.total || 0),
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Get bills failed:', error);
    res.status(500).json({ success: false, message: '获取账单记录失败' });
  }
});

// 解锁租户管理员账号
router.post('/:id/unlock-admin', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    // 查找租户信息
    const tenantRows = await AppDataSource.query(
      'SELECT id, name, phone FROM tenants WHERE id = ?', [id]
    );
    if (!tenantRows || tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenant = tenantRows[0];

    // 查找该租户下被锁定的管理员账号
    const lockedUsers = await AppDataSource.query(
      `SELECT id, username, password FROM users
       WHERE tenant_id = ? AND status = 'locked' AND role = 'admin'`,
      [id]
    );

    if (lockedUsers.length === 0) {
      return res.json({
        success: true,
        message: `租户「${tenant.name}」下没有被锁定的管理员账号`,
        data: { unlockedCount: 0 }
      });
    }

    let fixedPasswordCount = 0;
    const defaultPassword = 'Aa123456';

    // 检查并修复密码格式
    for (const user of lockedUsers) {
      const isBcryptFormat = user.password && user.password.startsWith('$2') && user.password.length === 60;
      if (!isBcryptFormat) {
        const hashedPassword = await bcrypt.hash(defaultPassword, 12);
        await AppDataSource.query(
          `UPDATE users SET password = ? WHERE id = ?`,
          [hashedPassword, user.id]
        );
        fixedPasswordCount++;
        log.info(`[Admin Tenants] Fixed password format for tenant user: ${user.username}`);
      }
    }

    // 解锁管理员账号
    const result = await AppDataSource.query(
      `UPDATE users
       SET status = 'active', login_fail_count = 0, locked_at = NULL
       WHERE tenant_id = ? AND status = 'locked' AND role = 'admin'`,
      [id]
    );

    const affectedRows = result.affectedRows || 0;

    // 记录日志
    if (affectedRows > 0) {
      const usernames = lockedUsers.map((u: any) => u.username).join(', ');
      const logMessage = fixedPasswordCount > 0
        ? `管理员解锁账号: ${usernames}，密码已重置为默认密码`
        : `管理员解锁账号: ${usernames}`;

      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
         VALUES (?, ?, 'unlock_admin', 'success', ?, ?, ?, ?)`,
        [uuidv4(), id, logMessage, getClientIp(req), adminUser?.adminId, adminUser?.username]
      );
    }

    const usernames = lockedUsers.map((u: any) => u.username).join(', ');
    const responseMessage = fixedPasswordCount > 0
      ? `已解锁管理员账号 ${usernames}，密码已重置为 ${defaultPassword}`
      : `已解锁管理员账号 ${usernames}`;

    res.json({
      success: true,
      message: responseMessage,
      data: {
        unlockedCount: affectedRows,
        usernames,
        fixedPasswordCount,
        defaultPassword: fixedPasswordCount > 0 ? defaultPassword : undefined
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Unlock admin failed:', error);
    res.status(500).json({ success: false, message: '解锁失败' });
  }
});

// 重置租户管理员密码
router.post('/:id/reset-admin-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;

    // 查找租户信息
    const tenantRows = await AppDataSource.query(
      'SELECT id, name, contact, phone FROM tenants WHERE id = ?', [id]
    );
    if (!tenantRows || tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenant = tenantRows[0];

    // 查找该租户下的管理员账号
    const adminUsers = await AppDataSource.query(
      `SELECT id, username, name, real_name FROM users
       WHERE tenant_id = ? AND role = 'admin'`,
      [id]
    );

    if (adminUsers.length === 0) {
      return res.status(404).json({ success: false, message: '该租户下没有管理员账号' });
    }

    // 生成安全的随机临时密码：大写+小写+数字，8位
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    const randomBytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      tempPassword += chars[randomBytes[i] % chars.length];
    }
    // 确保包含大写、小写、数字
    tempPassword = 'A' + tempPassword.slice(1, 7) + '3';

    // 更新所有管理员的密码
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    for (const user of adminUsers) {
      await AppDataSource.query(
        `UPDATE users SET password = ?, status = 'active', login_fail_count = 0, locked_at = NULL WHERE id = ?`,
        [hashedPassword, user.id]
      );
    }

    const usernames = adminUsers.map((u: any) => u.username).join(', ');

    // 记录日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
       VALUES (?, ?, 'reset_password', 'success', ?, ?, ?, ?)`,
      [uuidv4(), id, `管理员重置密码: ${usernames}`, getClientIp(req), adminUser?.adminId, adminUser?.username]
    );

    log.info(`[Admin Tenants] Reset password for tenant ${tenant.name} admins: ${usernames}, by admin: ${adminUser?.username}`);

    res.json({
      success: true,
      message: '密码重置成功',
      data: {
        tenantName: tenant.name || '',
        usernames,
        tempPassword,
        resetCount: adminUsers.length
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Reset admin password failed:', error);
    res.status(500).json({ success: false, message: '重置密码失败' });
  }
});

// ============================================================
// 🔥 自动初始化：确保 tenant_cleanup_logs 表存在
// ============================================================
const ensureCleanupLogsTable = async () => {
  try {
    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS tenant_cleanup_logs (
        id VARCHAR(36) PRIMARY KEY,
        tenant_id VARCHAR(36) NOT NULL,
        tenant_name VARCHAR(200) DEFAULT NULL,
        tenant_code VARCHAR(100) DEFAULT NULL,
        cleaned_tables TEXT DEFAULT NULL COMMENT '清理的表名和行数JSON',
        cleaned_files_count INT DEFAULT 0 COMMENT '清理的文件数',
        cleaned_files_size_mb DECIMAL(12,2) DEFAULT 0 COMMENT '清理的文件总大小MB',
        operator_id VARCHAR(36) DEFAULT NULL,
        operator_name VARCHAR(100) DEFAULT NULL,
        ip_address VARCHAR(50) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_tenant_id (tenant_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户数据清理记录'
    `);
  } catch (e) {
    log.info('[Admin Tenants] tenant_cleanup_logs 表初始化跳过:', (e as any).message?.substring(0, 60));
  }
};

// 同时确保 tenants 表有 data_cleaned_at 字段
const ensureCleanedAtColumn = async () => {
  try {
    const cols = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'data_cleaned_at'`
    );
    if (cols.length === 0) {
      await AppDataSource.query(`ALTER TABLE tenants ADD COLUMN data_cleaned_at DATETIME DEFAULT NULL COMMENT '数据清理时间'`);
      log.info('[Admin Tenants] 已添加 tenants.data_cleaned_at 字段');
    }
  } catch (e) {
    log.info('[Admin Tenants] data_cleaned_at 字段检查跳过:', (e as any).message?.substring(0, 60));
  }
};

// 延迟初始化（等数据库连接就绪）
setTimeout(() => {
  ensureCleanupLogsTable();
  ensureCleanedAtColumn();
}, 5000);

// ============================================================
// 清理不活跃过期租户数据
// POST /tenants/:id/cleanup-data
// ============================================================
router.post('/:id/cleanup-data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const { confirmCode } = req.body; // 前端需传入租户编码作为二次确认

    // ====== 1. 查询租户信息 ======
    const tenantRows = await AppDataSource.query(
      'SELECT id, name, code, status, expire_date, license_status, data_cleaned_at FROM tenants WHERE id = ?', [id]
    );
    if (!tenantRows || tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenant = tenantRows[0];

    // ====== 2. 二次确认校验 ======
    if (!confirmCode || confirmCode !== tenant.code) {
      return res.status(400).json({
        success: false,
        message: '确认编码不匹配，请输入正确的租户编码以确认清理操作'
      });
    }

    // ====== 3. 检查是否已经清理过 ======
    if (tenant.data_cleaned_at) {
      return res.status(400).json({
        success: false,
        message: `该租户数据已于 ${new Date(tenant.data_cleaned_at).toLocaleString('zh-CN')} 清理过，无需重复清理`
      });
    }

    // ====== 4. 过期时间校验（核心安全逻辑）======
    const expireDate = tenant.expire_date ? new Date(tenant.expire_date) : null;
    const now = new Date();

    if (!expireDate) {
      // 永久有效客户不允许清理
      return res.status(403).json({
        success: false,
        message: '该客户为永久有效期，不允许清理数据。如确需清理请先设置到期时间。'
      });
    }

    if (expireDate > now) {
      // 还在有效期内
      const remainDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return res.status(403).json({
        success: false,
        message: `该客户仍在活跃有效期内（剩余 ${remainDays} 天，到期日 ${expireDate.toLocaleDateString('zh-CN')}），禁止清理数据！`
      });
    }

    const expiredDays = Math.floor((now.getTime() - expireDate.getTime()) / (1000 * 60 * 60 * 24));
    if (expiredDays < 30) {
      const waitDays = 30 - expiredDays;
      const canCleanDate = new Date(expireDate);
      canCleanDate.setDate(canCleanDate.getDate() + 30);
      return res.status(403).json({
        success: false,
        message: `该客户过期仅 ${expiredDays} 天，不足30天保护期。需等到 ${canCleanDate.toLocaleDateString('zh-CN')} 后才可清理（还需等待 ${waitDays} 天）。`
      });
    }

    // ====== 5. 开始清理数据（事务内执行）======
    log.info(`[Admin Tenants] 🧹 开始清理租户 ${tenant.name}(${tenant.code}) 的过期数据，操作人: ${adminUser?.username}`);

    // 需要清理的表列表（按依赖顺序，子表先删除）
    const tablesToClean = [
      // 文件记录（先查询文件路径再删除记录）
      'customer_files',
      'order_attachments',
      'after_sale_attachments',
      // 🔥 录音记录（含文件路径，需先收集再删除）
      'call_recordings',
      // 通话记录
      'call_records',
      // 操作日志
      'operation_logs',
      'service_operation_logs',
      // 通知/消息
      'announcements',
      'notification_channels',
      'message_read_status',
      'message_subscriptions',
      'notifications',
      // 短信模板
      'sms_templates',
      // 增值服务
      'value_added_orders',
      'value_added_price_config',
      'value_added_status_configs',
      // 外包
      'outsource_companies',
      // 业绩/佣金
      'commission_ladders',
      'commission_settings',
      'performance_configs',
      'performance_metrics',
      // 物流
      'logistics_traces',
      'logistics_tracking',
      'logistics_companies',
      'logistics_api_configs',
      // 售后
      'service_follow_ups',
      'service_records',
      'after_sales_services',
      // 订单
      'cod_cancel_applications',
      'order_status_history',
      'order_items',
      'orders',
      // 客户
      'follow_up_records',
      'customer_shares',
      'customer_groups',
      'customer_tags',
      'customers',
      // 商品
      'products',
      'product_categories',
      // 组织架构
      'department_order_limits',
      'departments',
      'users',
      // 基础配置
      'improvement_goals',
      'rejection_reasons',
      'remark_presets',
      'payment_method_options',
      'permissions',
      'roles',
      'system_configs',
      // 支付/订阅
      'payment_orders',
      'subscriptions',
      // 授权日志
      'tenant_license_logs',
    ];

    // ====== 5a. 先收集要清理的文件路径 ======
    const filesToDelete: string[] = [];
    const fileQueryTables = [
      { table: 'customer_files', pathCol: 'file_path' },
      { table: 'order_attachments', pathCol: 'file_path' },
      { table: 'after_sale_attachments', pathCol: 'file_path' },
      // 🔥 新增：录音文件路径
      { table: 'call_recordings', pathCol: 'file_path' },
      { table: 'call_recordings', pathCol: 'file_url' },
      // 🔥 新增：用户头像
      { table: 'users', pathCol: 'avatar' },
    ];

    for (const ft of fileQueryTables) {
      try {
        const hasTenantCol = await AppDataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
          [ft.table]
        );
        if (hasTenantCol.length === 0) continue;

        const hasPathCol = await AppDataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [ft.table, ft.pathCol]
        );
        if (hasPathCol.length === 0) continue;

        const fileRows = await AppDataSource.query(
          `SELECT ${ft.pathCol} as fpath FROM ${ft.table} WHERE tenant_id = ?`, [id]
        );
        for (const fr of fileRows) {
          if (fr.fpath) filesToDelete.push(fr.fpath);
        }
      } catch {
        // 表不存在等异常静默跳过
      }
    }

    // ====== 5b. 在事务内删除数据库记录 ======
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const cleanResults: Record<string, number> = {};
    let totalDeleted = 0;

    try {
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

      for (const tableName of tablesToClean) {
        try {
          // 检查表是否存在且有 tenant_id 列
          const colCheck = await queryRunner.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
            [tableName]
          );
          if (colCheck.length === 0) {
            continue; // 跳过没有 tenant_id 列的表
          }

          // 🔥 严格按 tenant_id 删除，绝不影响其他租户
          const result = await queryRunner.query(
            `DELETE FROM \`${tableName}\` WHERE tenant_id = ?`, [id]
          );
          const affected = result.affectedRows || 0;
          if (affected > 0) {
            cleanResults[tableName] = affected;
            totalDeleted += affected;
            log.info(`[Admin Tenants] 🧹 清理表 ${tableName}: 删除 ${affected} 条`);
          }
        } catch (tableErr) {
          log.info(`[Admin Tenants] 清理表 ${tableName} 跳过: ${(tableErr as any).message?.substring(0, 60)}`);
        }
      }

      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
      await queryRunner.commitTransaction();
      log.info(`[Admin Tenants] 🧹 数据库清理完成，共删除 ${totalDeleted} 条记录`);
    } catch (txErr) {
      await queryRunner.rollbackTransaction();
      log.error('[Admin Tenants] 清理数据事务回滚:', txErr);
      return res.status(500).json({ success: false, message: '清理数据失败，已回滚' });
    } finally {
      await queryRunner.release();
    }

    // ====== 5c. 清理物理文件 ======
    let cleanedFilesCount = 0;
    let cleanedFilesSizeMb = 0;
    const uploadsBaseDir = path.resolve(process.cwd(), 'uploads');
    const recordingsBaseDir = path.resolve(process.cwd(), 'recordings');

    // 5c-1. 逐个清理数据库记录中引用的文件（兼容旧文件不在租户目录的情况）
    for (const filePath of filesToDelete) {
      try {
        // 文件路径可能是相对路径或含 /uploads/ 前缀
        let fullPath = filePath;
        if (!path.isAbsolute(filePath)) {
          // 去掉可能的 /uploads/ 前缀
          const cleanPath = filePath.replace(/^\/?(uploads\/)?/, '');
          fullPath = path.join(uploadsBaseDir, cleanPath);
        }

        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          cleanedFilesSizeMb += stats.size / (1024 * 1024);
          fs.unlinkSync(fullPath);
          cleanedFilesCount++;
        }
      } catch {
        // 文件删除失败静默跳过（可能已不存在）
      }
    }

    // 5c-2. 🔥 整体清理租户隔离目录（改造后的核心能力）
    // 直接删除 uploads/{tenantCode}/ 和 recordings/{tenantCode}/ 目录
    // 这样可以彻底清理该租户的所有文件，即使数据库中没有记录也不会遗漏
    const tenantCode = tenant.code;
    const tenantDirsToClean = [
      path.join(uploadsBaseDir, tenantCode),     // uploads/T260303A1B2/
      path.join(recordingsBaseDir, tenantCode),   // recordings/T260303A1B2/
    ];

    for (const tenantDir of tenantDirsToClean) {
      try {
        if (fs.existsSync(tenantDir)) {
          // 递归统计目录大小
          const dirStats = getDirSizeSync(tenantDir);
          cleanedFilesSizeMb += dirStats.sizeMb;
          cleanedFilesCount += dirStats.fileCount;
          // 递归删除整个目录
          fs.rmSync(tenantDir, { recursive: true, force: true });
          log.info(`[Admin Tenants] 🧹 删除租户目录: ${tenantDir} (${dirStats.fileCount} 个文件, ${dirStats.sizeMb.toFixed(2)} MB)`);
        }
      } catch (dirErr) {
        log.warn(`[Admin Tenants] 删除租户目录失败 ${tenantDir}:`, (dirErr as Error).message);
      }
    }

    log.info(`[Admin Tenants] 🧹 文件清理完成: ${cleanedFilesCount} 个文件, ${cleanedFilesSizeMb.toFixed(2)} MB`);

    // ====== 6. 更新租户标记 ======
    try {
      await AppDataSource.query(
        `UPDATE tenants SET data_cleaned_at = NOW(), used_storage_mb = 0 WHERE id = ?`, [id]
      );
    } catch {
      // 字段可能不存在，静默跳过
    }

    // ====== 7. 写入清理记录 ======
    try {
      await ensureCleanupLogsTable();
      await AppDataSource.query(
        `INSERT INTO tenant_cleanup_logs (id, tenant_id, tenant_name, tenant_code, cleaned_tables, cleaned_files_count, cleaned_files_size_mb, operator_id, operator_name, ip_address, remark, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          uuidv4(), id, tenant.name, tenant.code,
          JSON.stringify(cleanResults),
          cleanedFilesCount,
          Number(cleanedFilesSizeMb.toFixed(2)),
          adminUser?.adminId || null,
          adminUser?.username || null,
          getClientIp(req),
          `过期 ${expiredDays} 天后清理数据，共删除 ${totalDeleted} 条数据库记录和 ${cleanedFilesCount} 个文件`
        ]
      );
    } catch (logErr) {
      log.info('[Admin Tenants] 写入清理日志失败:', (logErr as any).message?.substring(0, 80));
    }

    // ====== 8. 同时写入租户授权日志 ======
    try {
      await AppDataSource.query(
        `INSERT INTO tenant_license_logs (id, tenant_id, action, result, message, ip_address, operator_id, operator_name)
         VALUES (?, ?, 'cleanup', 'success', ?, ?, ?, ?)`,
        [
          uuidv4(), id,
          `清理过期数据：删除 ${totalDeleted} 条记录，${cleanedFilesCount} 个文件(${cleanedFilesSizeMb.toFixed(2)}MB)`,
          getClientIp(req),
          adminUser?.adminId || null,
          adminUser?.username || null
        ]
      );
    } catch {
      // tenant_license_logs 可能已被清理，静默跳过
    }

    res.json({
      success: true,
      message: `租户「${tenant.name}」数据清理完成`,
      data: {
        tenantName: tenant.name,
        tenantCode: tenant.code,
        expiredDays,
        totalDeletedRecords: totalDeleted,
        cleanedTables: cleanResults,
        cleanedFilesCount,
        cleanedFilesSizeMb: Number(cleanedFilesSizeMb.toFixed(2)),
        cleanedTenantDirs: tenantDirsToClean.filter(d => !fs.existsSync(d)).length > 0,
        cleanedAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Cleanup data failed:', error);
    res.status(500).json({ success: false, message: '清理数据失败：' + (error.message || '未知错误') });
  }
});

// 获取租户清理状态
// GET /tenants/:id/cleanup-status
router.get('/:id/cleanup-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const rows = await AppDataSource.query(
      'SELECT id, name, code, expire_date, status, data_cleaned_at FROM tenants WHERE id = ?', [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenant = rows[0];

    const expireDate = tenant.expire_date ? new Date(tenant.expire_date) : null;
    const now = new Date();
    let canCleanup = false;
    let reason = '';
    let expiredDays = 0;

    if (tenant.data_cleaned_at) {
      reason = `数据已于 ${new Date(tenant.data_cleaned_at).toLocaleString('zh-CN')} 清理`;
    } else if (!expireDate) {
      reason = '永久有效客户，不允许清理';
    } else if (expireDate > now) {
      const remainDays = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      reason = `活跃有效期内，剩余 ${remainDays} 天`;
    } else {
      expiredDays = Math.floor((now.getTime() - expireDate.getTime()) / (1000 * 60 * 60 * 24));
      if (expiredDays < 30) {
        const waitDays = 30 - expiredDays;
        reason = `过期仅 ${expiredDays} 天，需满30天保护期（还需等 ${waitDays} 天）`;
      } else {
        canCleanup = true;
        reason = `已过期 ${expiredDays} 天，可以清理`;
      }
    }

    // 查询最近一次清理记录
    let lastCleanup = null;
    try {
      const cleanupRows = await AppDataSource.query(
        `SELECT * FROM tenant_cleanup_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1`, [id]
      );
      if (cleanupRows.length > 0) {
        lastCleanup = cleanupRows[0];
      }
    } catch {
      // 表不存在忽略
    }

    res.json({
      success: true,
      data: {
        canCleanup,
        reason,
        expiredDays,
        dataCleaned: !!tenant.data_cleaned_at,
        dataCleanedAt: tenant.data_cleaned_at,
        lastCleanup
      }
    });
  } catch (error: any) {
    log.error('[Admin Tenants] Get cleanup status failed:', error);
    res.status(500).json({ success: false, message: '获取清理状态失败' });
  }
});

export default router;
