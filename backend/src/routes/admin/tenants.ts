/**
 * Admin Tenants Routes - 租户管理（含授权码功能）
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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
    const { page = 1, pageSize = 20, status, keyword, packageId } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const offset = (pageNum - 1) * pageSizeNum;

    let sql = `SELECT t.*, p.name as package_name,
               (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as real_user_count,
               COALESCE(t.used_storage_mb, 0) as used_storage_mb
               FROM tenants t
               LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE 1=1`;
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

    // 提取WHERE条件用于计数查询
    const whereConditions = (sql.split('WHERE 1=1')[1] || '');
    const countSql = `SELECT COUNT(*) as total FROM tenants t LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE 1=1` + whereConditions;
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
      max_storage_gb: Number(row.max_storage_gb ?? 0)
    }));

    res.json({
      success: true,
      data: { list: mappedList, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取租户列表失败' });
  }
});

// 获取租户详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rows = await AppDataSource.query(
      `SELECT t.*, p.name as package_name, p.modules as package_modules FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id WHERE t.id = ?`, [id]
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
      console.log(`[Admin Tenants] 租户 ${id} 模块为空，已填充默认核心模块: ${tenantModules.join(',')}`);
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
      `SELECT id, username, status, login_fail_count, locked_at
       FROM users
       WHERE tenant_id = ? AND role = 'admin'
       ORDER BY created_at ASC`,
      [id]
    );
    // 兼容 MySQL 不同驱动返回格式
    const adminUsers = Array.isArray(adminRows[0]) ? adminRows[0] : (Array.isArray(adminRows) ? adminRows : []);
    tenant.adminUsers = adminUsers;
    tenant.hasLockedAdmin = adminUsers.some((u: any) => u.status === 'locked');

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
      console.log('[Admin Tenants] 存储空间动态计算跳过（表可能不存在）:', (storageErr as any).message?.substring(0, 60));
    }

    res.json({ success: true, data: tenant });
  } catch (error: any) {
    console.error('[Admin Tenants] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取租户详情失败' });
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
        console.log('[Admin Tenants] 获取套餐模块信息失败，使用默认:', (e as any).message);
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
        console.log('[Admin Tenants] 获取套餐价格信息失败:', (e as any).message);
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
      const bcryptLib = require('bcryptjs');
      const defaultPassword = 'Aa123456';
      const hashedPassword = await bcryptLib.hash(defaultPassword, 12);
      const adminUsername = phone || `admin_${tenantCode}`;
      const adminId = uuidv4();

      await AppDataSource.query(
        `INSERT INTO users (id, tenant_id, username, password, name, real_name, phone, email, role, status, is_system, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', 'active', 1, NOW(), NOW())`,
        [adminId, id, adminUsername, hashedPassword, contact || '管理员', contact || '管理员', phone || null, email || null]
      );

      adminAccount = { username: adminUsername, password: defaultPassword };
    } catch (adminErr) {
      console.log('[Admin Tenants] 创建管理员账号失败（可能已存在）:', (adminErr as any).message?.substring(0, 80));
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
        loginUrl: 'https://app.yunke-crm.com',
        adminAccount
      },
      message: '租户创建成功，授权码已生成'
    });
  } catch (error: any) {
    console.error('[Admin Tenants] Create failed:', error);
    res.status(500).json({ success: false, message: '创建租户失败' });
  }
});

// 更新租户
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, packageId, contact, phone, email, maxUsers, maxStorageGb, expireDate, features, modules, status } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (packageId !== undefined) { updates.push('package_id = ?'); params.push(packageId); }
    if (contact !== undefined) { updates.push('contact = ?'); params.push(contact); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
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
    console.error('[Admin Tenants] Update failed:', error);
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
    console.error('[Admin Tenants] Regenerate license failed:', error);
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
    console.error('[Admin Tenants] Suspend failed:', error);
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
    console.error('[Admin Tenants] Resume failed:', error);
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
    console.error('[Admin Tenants] Renew failed:', error);
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
    console.error('[Admin Tenants] Get logs failed:', error);
    res.status(500).json({ success: false, message: '获取日志失败' });
  }
});

// 删除租户
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 先删除日志
    await AppDataSource.query('DELETE FROM tenant_license_logs WHERE tenant_id = ?', [id]);
    // 再删除租户
    await AppDataSource.query('DELETE FROM tenants WHERE id = ?', [id]);

    res.json({ success: true, message: '租户已删除' });
  } catch (error: any) {
    console.error('[Admin Tenants] Delete failed:', error);
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
    console.error('[Admin Tenants] Get bills failed:', error);
    res.status(500).json({ success: false, message: '获取账单记录失败' });
  }
});

export default router;
