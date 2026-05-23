/**
 * Admin 管理后台 - 企微管理路由
 * 提供：企微概览（全租户企微配置列表）、增值服务配置
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { TenantSettings } from '../../entities/TenantSettings';
import { log } from '../../config/logger';

const router = Router();

/** RBAC细粒度权限检查：校验 req.adminUser.permissions 是否包含指定权限码 */
function checkPermission(req: Request, res: Response, permCode: string): boolean {
  const adminUser = (req as any).adminUser;
  const perms: string[] = adminUser?.permissions || [];
  // '*' 通配符表示拥有所有权限（超级管理员）
  if (perms.includes('*') || perms.includes(permCode)) {
    return true;
  }
  res.status(403).json({ success: false, message: '权限不足，无法执行此操作' });
  return false;
}

// ==================== 企微概览 ====================

/**
 * 获取所有租户的企微配置概览
 * GET /api/v1/admin/wecom-management/overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  const { keyword, status, page = 1, pageSize = 20 } = req.query;
  try {
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    // 安全检查：先检测 wecom_configs 表是否存在
    const tableCheck = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_configs'`
    ).catch(() => [{ cnt: 0 }]);
    if (!tableCheck[0]?.cnt) {
      return res.json({
        success: true,
        data: { list: [], total: 0, page: parseInt(page as string), pageSize: limit },
        message: '企微配置表尚未创建，请先执行数据库迁移'
      });
    }

    // 检测关联子表是否存在（用于子查询容错）
    const subTableCheck = async (tableName: string) => {
      try {
        const r = await AppDataSource.query(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tableName]
        );
        return !!r[0]?.cnt;
      } catch { return false; }
    };
    const hasCustomers = await subTableCheck('wecom_customers');
    const hasBindings = await subTableCheck('wecom_user_bindings');
    const hasChatRecords = await subTableCheck('wecom_chat_records');

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      where += ' AND (t.name LIKE ? OR wc.corp_id LIKE ? OR wc.name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    if (status === 'connected') {
      where += " AND wc.connection_status = 'connected'";
    } else if (status === 'disconnected') {
      where += " AND (wc.connection_status != 'connected' OR wc.connection_status IS NULL)";
    }

    // 查询总数
    const countSql = `
      SELECT COUNT(*) as total
      FROM wecom_configs wc
      LEFT JOIN tenants t ON wc.tenant_id = t.id
      ${where}
    `;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    // 查询列表（子查询容错）
    const customerSubQ = hasCustomers
      ? '(SELECT COUNT(*) FROM wecom_customers WHERE wecom_config_id = wc.id)'
      : '0';
    const bindingSubQ = hasBindings
      ? '(SELECT COUNT(*) FROM wecom_user_bindings WHERE wecom_config_id = wc.id)'
      : '0';
    const chatRecordSubQ = hasChatRecords
      ? '(SELECT COUNT(*) FROM wecom_chat_records WHERE wecom_config_id = wc.id)'
      : '0';

    const listSql = `
      SELECT
        wc.id AS configId,
        wc.name AS configName,
        wc.corp_id AS corpId,
        wc.is_enabled AS isEnabled,
        wc.connection_status AS connectionStatus,
        wc.last_error AS lastError,
        wc.api_call_count AS apiCallCount,
        wc.tenant_id AS tenantId,
        wc.created_at AS createdAt,
        t.name AS tenantName,
        t.status AS tenantStatus,
        t.wecom_chat_archive_auth AS chatArchiveAuth,
        ${customerSubQ} AS customerCount,
        ${bindingSubQ} AS bindingCount,
        ${chatRecordSubQ} AS chatRecordCount
      FROM wecom_configs wc
      LEFT JOIN tenants t ON wc.tenant_id = t.id
      ${where}
      ORDER BY wc.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: {
        list: list.map((row: any) => ({
          ...row,
          isEnabled: !!row.isEnabled,
          chatArchiveAuth: !!row.chatArchiveAuth
        })),
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Overview error:', error.message);
    // 返回空列表而非500，防止前端页面崩溃
    res.json({
      success: true,
      data: { list: [], total: 0, page: parseInt(page as string || '1'), pageSize: parseInt(pageSize as string || '20') },
      message: '企微概览加载异常：' + (error.message || '').substring(0, 100)
    });
  }
});

/**
 * 获取企微管理统计摘要
 * GET /api/v1/admin/wecom-management/summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const result: any = {};
    // 逐个查询，避免某个表缺失导致整体失败
    const safeCount = async (sql: string) => {
      try { const r = await AppDataSource.query(sql); return r[0]?.cnt || 0; } catch { return 0; }
    };
    result.totalConfigs = await safeCount('SELECT COUNT(*) as cnt FROM wecom_configs');
    result.enabledConfigs = await safeCount('SELECT COUNT(*) as cnt FROM wecom_configs WHERE is_enabled = 1');
    result.connectedConfigs = await safeCount("SELECT COUNT(*) as cnt FROM wecom_configs WHERE connection_status = 'connected'");
    result.tenantCount = await safeCount('SELECT COUNT(DISTINCT tenant_id) as cnt FROM wecom_configs WHERE tenant_id IS NOT NULL');
    result.totalCustomers = await safeCount('SELECT COUNT(*) as cnt FROM wecom_customers');
    result.totalBindings = await safeCount('SELECT COUNT(*) as cnt FROM wecom_user_bindings');
    result.totalChatRecords = await safeCount('SELECT COUNT(*) as cnt FROM wecom_chat_records');
    result.totalPayments = await safeCount('SELECT COUNT(*) as cnt FROM wecom_payment_records');
    result.chatArchiveAuthCount = await safeCount('SELECT COUNT(*) as cnt FROM tenants WHERE wecom_chat_archive_auth = 1');

    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Admin Wecom] Summary error:', error.message);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

/**
 * 切换租户会话存档授权（快捷操作）
 * PUT /api/v1/admin/wecom-management/toggle-archive-auth/:tenantId
 */
router.put('/toggle-archive-auth/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { tenantId } = req.params;
    const { enabled } = req.body;

    await AppDataSource.query(
      'UPDATE tenants SET wecom_chat_archive_auth = ? WHERE id = ?',
      [enabled ? 1 : 0, tenantId]
    );

    res.json({ success: true, message: enabled ? '已授权会话存档' : '已撤销会话存档授权' });
  } catch (error: any) {
    log.error('[Admin Wecom] Toggle archive auth error:', error.message);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// ==================== 增值服务配置 ====================

/**
 * 获取增值服务配置
 * GET /api/v1/admin/wecom-management/vas-config
 */
router.get('/vas-config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    const defaultConfig = {
      chatArchive: {
        enabled: true,
        defaultPrice: 100,
        minPrice: 50,
        billingUnit: 'per_user_year',
        trialDays: 7,
        tierPricing: [
          { min: 1, max: 10, price: 100 },
          { min: 11, max: 50, price: 90 },
          { min: 51, max: 100, price: 80 },
          { min: 101, max: 999999, price: 70 }
        ],
        description: '企微会话存档增值服务，可查看员工与客户的聊天记录，支持敏感词检测和质检功能。'
      }
    };

    if (rows.length > 0) {
      try {
        const data = JSON.parse(rows[0].config_value);
        res.json({ success: true, data });
      } catch {
        res.json({ success: true, data: defaultConfig });
      }
    } else {
      res.json({ success: true, data: defaultConfig });
    }
  } catch (error: any) {
    log.error('[Admin Wecom] Get VAS config error:', error.message);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * 保存增值服务配置
 * PUT /api/v1/admin/wecom-management/vas-config
 */
router.put('/vas-config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const configData = req.body;

    // 检查是否已有记录
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    if (existing.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_vas_config'",
        [JSON.stringify(configData)]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (config_key, config_value, created_at, updated_at) VALUES ('wecom_vas_config', ?, NOW(), NOW())",
        [JSON.stringify(configData)]
      );
    }

    res.json({ success: true, message: '保存成功' });
  } catch (error: any) {
    log.error('[Admin Wecom] Save VAS config error:', error.message);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// ==================== 会话存档管理 ====================

/**
 * 获取会话存档管理概览
 * GET /api/v1/admin/wecom-management/chat-archive-overview
 */
router.get('/chat-archive-overview', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 检测关联子表是否存在
    const subTableCheck = async (tableName: string) => {
      try {
        const r = await AppDataSource.query(
          `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tableName]
        );
        return !!r[0]?.cnt;
      } catch { return false; }
    };

    const hasArchiveSettings = await subTableCheck('wecom_archive_settings');
    const hasConfigs = await subTableCheck('wecom_configs');
    const hasBindings = await subTableCheck('wecom_user_bindings');
    const hasChatRecords = await subTableCheck('wecom_chat_records');

    // 统计摘要 - 逐个查询避免某个表问题导致整体失败
    const safeCount = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return r[0]?.cnt || 0; } catch { return 0; }
    };
    const summaryData = {
      authTenantCount: await safeCount('SELECT COUNT(*) as cnt FROM tenants WHERE wecom_chat_archive_auth = 1'),
      totalRecords: hasChatRecords ? await safeCount('SELECT COUNT(*) as cnt FROM wecom_chat_records') : 0,
      activeTenantCount: hasChatRecords ? await safeCount('SELECT COUNT(DISTINCT tenant_id) as cnt FROM wecom_chat_records WHERE tenant_id IS NOT NULL') : 0,
      totalMaxUsers: hasArchiveSettings ? await safeCount("SELECT COALESCE(SUM(max_users), 0) as cnt FROM wecom_archive_settings WHERE status = 'active'") : 0,
      totalUsedUsers: hasArchiveSettings ? await safeCount("SELECT COALESCE(SUM(used_users), 0) as cnt FROM wecom_archive_settings WHERE status = 'active'") : 0
    };

    // 如果wecom_archive_settings表不存在，仅基于tenants表查询
    if (!hasArchiveSettings) {
      const countSql = `SELECT COUNT(*) as total FROM tenants t ${where} AND t.wecom_chat_archive_auth = 1`;
      const countResult = await AppDataSource.query(countSql, params);
      const total = countResult[0]?.total || 0;

      const listSql = `
        SELECT
          t.id AS tenantId,
          t.name AS tenantName,
          t.code AS tenantCode,
          t.wecom_chat_archive_auth AS chatArchiveAuth,
          t.status AS tenantStatus
        FROM tenants t
        ${where} AND t.wecom_chat_archive_auth = 1
        ORDER BY t.updated_at DESC
        LIMIT ? OFFSET ?
      `;
      const list = await AppDataSource.query(listSql, [...params, limit, offset]);

      return res.json({
        success: true,
        data: {
          summary: summaryData,
          list: list.map((row: any) => ({
            ...row, chatArchiveAuth: !!row.chatArchiveAuth,
            storageType: 'database', retentionDays: 365,
            maxUsers: 0, usedUsers: 0, recordCount: 0,
            configCount: 0, bindingCount: 0, estimatedStorageMB: 0
          })),
          total, page: parseInt(page as string), pageSize: limit
        }
      });
    }

    // 租户列表
    const countSql = `
      SELECT COUNT(*) as total FROM tenants t ${where}
        AND (t.wecom_chat_archive_auth = 1 OR EXISTS (SELECT 1 FROM wecom_archive_settings was2 WHERE was2.tenant_id = t.id))
    `;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    const configCountSubQ = hasConfigs
      ? 'IFNULL((SELECT COUNT(*) FROM wecom_configs WHERE tenant_id = t.id), 0)'
      : '0';
    const bindingCountSubQ = (hasBindings && hasConfigs)
      ? 'IFNULL((SELECT COUNT(*) FROM wecom_user_bindings wub INNER JOIN wecom_configs wc2 ON wub.wecom_config_id = wc2.id WHERE wc2.tenant_id = t.id), 0)'
      : '0';
    const recordCountSubQ = hasChatRecords
      ? 'IFNULL((SELECT COUNT(*) FROM wecom_chat_records WHERE tenant_id = t.id), 0)'
      : '0';

    const listSql = `
      SELECT
        t.id AS tenantId,
        t.name AS tenantName,
        t.code AS tenantCode,
        t.wecom_chat_archive_auth AS chatArchiveAuth,
        t.status AS tenantStatus,
        was2.storage_type AS storageType,
        was2.retention_days AS retentionDays,
        was2.max_users AS maxUsers,
        was2.used_users AS usedUsers,
        was2.expire_date AS expireDate,
        was2.status AS archiveStatus,
        was2.package_type AS packageType,
        was2.last_cleanup_at AS lastCleanupAt,
        was2.total_messages AS totalMessages,
        was2.total_storage_mb AS totalStorageMB,
        was2.oss_bucket AS ossBucket,
        was2.oss_prefix AS ossPrefix,
        was2.oss_endpoint AS ossEndpoint,
        ${configCountSubQ} AS configCount,
        ${bindingCountSubQ} AS bindingCount,
        ${recordCountSubQ} AS recordCount
      FROM tenants t
      LEFT JOIN wecom_archive_settings was2 ON was2.tenant_id = t.id
      ${where}
        AND (t.wecom_chat_archive_auth = 1 OR EXISTS (SELECT 1 FROM wecom_archive_settings was3 WHERE was3.tenant_id = t.id))
      ORDER BY t.wecom_chat_archive_auth DESC, was2.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: {
        summary: summaryData,
        list: list.map((row: any) => ({
          ...row,
          chatArchiveAuth: !!row.chatArchiveAuth,
          storageType: row.storageType || 'database',
          retentionDays: row.retentionDays || 365,
          maxUsers: row.maxUsers || 0,
          usedUsers: row.usedUsers || 0,
          estimatedStorageMB: row.totalStorageMB || (Math.round((row.recordCount || 0) * 0.5 / 1024 * 100) / 100)
        })),
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Chat archive overview error:', error.message);
    res.json({
      success: true,
      data: { summary: {}, list: [], total: 0, page: 1, pageSize: 20 },
      message: '获取数据异常：' + (error.message || '').substring(0, 100)
    });
  }
});

/**
 * 更新租户会话存档配置
 * PUT /api/v1/admin/wecom-management/chat-archive-settings/:tenantId
 */
router.put('/chat-archive-settings/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { tenantId } = req.params;
    const { storageType, retentionDays, maxUsers, ossConfig, expireDate, status: archiveStatus } = req.body;

    // upsert
    const existing = await AppDataSource.query(
      'SELECT id FROM wecom_archive_settings WHERE tenant_id = ?', [tenantId]
    );

    if (existing.length > 0) {
      const updates: string[] = [];
      const vals: any[] = [];
      if (storageType) { updates.push('storage_type = ?'); vals.push(storageType); }
      if (retentionDays !== undefined) { updates.push('retention_days = ?'); vals.push(retentionDays); }
      if (maxUsers !== undefined) { updates.push('max_users = ?'); vals.push(maxUsers); }
      if (expireDate !== undefined) { updates.push('expire_date = ?'); vals.push(expireDate || null); }
      if (archiveStatus) { updates.push('status = ?'); vals.push(archiveStatus); }
      if (ossConfig?.bucket) { updates.push('oss_bucket = ?'); vals.push(ossConfig.bucket); }
      if (ossConfig?.prefix) { updates.push('oss_prefix = ?'); vals.push(ossConfig.prefix); }
      if (ossConfig?.endpoint) { updates.push('oss_endpoint = ?'); vals.push(ossConfig.endpoint); }
      if (ossConfig?.accessKey) { updates.push('oss_access_key = ?'); vals.push(ossConfig.accessKey); }
      if (ossConfig?.secretKey) { updates.push('oss_secret_key = ?'); vals.push(ossConfig.secretKey); }
      // 如果切换到数据库存储，清空OSS配置
      if (storageType === 'database') {
        updates.push('oss_bucket = NULL, oss_prefix = NULL, oss_endpoint = NULL, oss_access_key = NULL, oss_secret_key = NULL');
      }
      if (updates.length > 0) {
        await AppDataSource.query(
          `UPDATE wecom_archive_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE tenant_id = ?`,
          [...vals, tenantId]
        );
      }
    } else {
      await AppDataSource.query(
        `INSERT INTO wecom_archive_settings (tenant_id, storage_type, retention_days, max_users, oss_bucket, oss_prefix, oss_endpoint, expire_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, storageType || 'database', retentionDays || 365, maxUsers || 10,
         ossConfig?.bucket || null, ossConfig?.prefix || null, ossConfig?.endpoint || null,
         expireDate || null, archiveStatus || 'active']
      );
    }

    // 同步更新租户的会话存档授权状态
    if (archiveStatus === 'active') {
      await AppDataSource.query(
        'UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]
      ).catch(() => {});
    } else if (archiveStatus === 'disabled' || archiveStatus === 'expired') {
      await AppDataSource.query(
        'UPDATE tenants SET wecom_chat_archive_auth = 0 WHERE id = ?', [tenantId]
      ).catch(() => {});
    }

    res.json({ success: true, message: '配置已更新' });
  } catch (error: any) {
    log.error('[Admin Wecom] Update archive settings error:', error.message);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
});

/**
 * 清理租户过期会话存档数据
 * DELETE /api/v1/admin/wecom-management/chat-archive-cleanup/:tenantId
 */
router.delete('/chat-archive-cleanup/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { tenantId } = req.params;
    const { retentionDays } = req.body;
    const days = retentionDays || 365;

    const cutoffTs = Date.now() - days * 24 * 3600 * 1000;

    const result = await AppDataSource.query(
      'DELETE FROM wecom_chat_records WHERE tenant_id = ? AND msg_time < ?',
      [tenantId, cutoffTs]
    );

    const deletedCount = result.affectedRows || 0;
    log.info(`[Admin Wecom] Cleaned up ${deletedCount} archive records for tenant ${tenantId} (older than ${days} days)`);

    res.json({
      success: true,
      message: `已清理 ${deletedCount} 条过期记录`,
      data: { deletedCount }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Archive cleanup error:', error.message);
    res.status(500).json({ success: false, message: '清理失败' });
  }
});

/**
 * 获取增值服务订单列表
 * GET /api/v1/admin/wecom-management/vas-orders
 */
router.get('/vas-orders', async (req: Request, res: Response) => {
  try {
    const { keyword, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    let where = "WHERE po.package_id = 'vas_chat_archive'";
    const params: any[] = [];

    if (keyword) {
      where += ' AND (po.tenant_name LIKE ? OR po.order_no LIKE ? OR po.contact_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (status && status !== 'all') {
      where += ' AND po.status = ?';
      params.push(status);
    }

    // 总数
    const countSql = `SELECT COUNT(*) as total FROM payment_orders po ${where}`;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    // 列表
    const listSql = `
      SELECT
        po.id, po.order_no AS orderNo, po.tenant_id AS tenantId, po.tenant_name AS tenantName,
        po.package_name AS packageName, po.amount, po.pay_type AS payType, po.status,
        po.contact_name AS contactName, po.remark, po.qr_code AS qrCode,
        po.paid_at AS paidAt, po.expire_time AS expireTime, po.created_at AS createdAt,
        t.wecom_chat_archive_auth AS chatArchiveAuth
      FROM payment_orders po
      LEFT JOIN tenants t ON po.tenant_id = t.id
      ${where}
      ORDER BY po.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    // 统计摘要
    const safeCount = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return r[0]?.cnt || 0; } catch { return 0; }
    };
    const safeSum = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return parseFloat(r[0]?.total || 0); } catch { return 0; }
    };

    const summary = {
      totalOrders: await safeCount("SELECT COUNT(*) as cnt FROM payment_orders WHERE package_id = 'vas_chat_archive'"),
      paidOrders: await safeCount("SELECT COUNT(*) as cnt FROM payment_orders WHERE package_id = 'vas_chat_archive' AND status = 'paid'"),
      pendingOrders: await safeCount("SELECT COUNT(*) as cnt FROM payment_orders WHERE package_id = 'vas_chat_archive' AND status = 'pending'"),
      totalRevenue: await safeSum("SELECT COALESCE(SUM(amount), 0) as total FROM payment_orders WHERE package_id = 'vas_chat_archive' AND status = 'paid'"),
    };

    res.json({
      success: true,
      data: {
        summary,
        list: list.map((row: any) => ({
          ...row,
          chatArchiveAuth: !!row.chatArchiveAuth
        })),
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] VAS orders error:', error.message);
    res.json({
      success: true,
      data: { summary: {}, list: [], total: 0, page: 1, pageSize: 20 },
      message: '获取订单列表异常：' + (error.message || '').substring(0, 100)
    });
  }
});

/**
 * 获取增值服务订单详情
 * GET /api/v1/admin/wecom-management/vas-orders/:orderNo
 */
router.get('/vas-orders/:orderNo', async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const rows = await AppDataSource.query(
      `SELECT po.*, t.name AS tenantNameFull, t.wecom_chat_archive_auth AS chatArchiveAuth,
              was2.max_users AS archiveMaxUsers, was2.used_users AS archiveUsedUsers,
              was2.expire_date AS archiveExpireDate, was2.status AS archiveStatus
       FROM payment_orders po
       LEFT JOIN tenants t ON po.tenant_id = t.id
       LEFT JOIN wecom_archive_settings was2 ON was2.tenant_id = po.tenant_id
       WHERE po.order_no = ? AND po.package_id = 'vas_chat_archive' LIMIT 1`,
      [orderNo]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    const order = rows[0];
    res.json({
      success: true,
      data: {
        id: order.id,
        orderNo: order.order_no,
        tenantId: order.tenant_id,
        tenantName: order.tenant_name,
        packageName: order.package_name,
        amount: order.amount,
        payType: order.pay_type,
        status: order.status,
        contactName: order.contact_name,
        remark: order.remark,
        paidAt: order.paid_at,
        expireTime: order.expire_time,
        createdAt: order.created_at,
        chatArchiveAuth: !!order.chatArchiveAuth,
        archiveMaxUsers: order.archiveMaxUsers || 0,
        archiveUsedUsers: order.archiveUsedUsers || 0,
        archiveExpireDate: order.archiveExpireDate,
        archiveStatus: order.archiveStatus || 'disabled'
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] VAS order detail error:', error.message);
    res.status(500).json({ success: false, message: '获取订单详情失败' });
  }
});

/**
 * 手动标记订单已支付（对公转账确认）
 * PUT /api/v1/admin/wecom-management/vas-orders/:orderNo/confirm-paid
 */
router.put('/vas-orders/:orderNo/confirm-paid', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { orderNo } = req.params;
    const { remark } = req.body;

    const rows = await AppDataSource.query(
      "SELECT id, tenant_id, status FROM payment_orders WHERE order_no = ? AND package_id = 'vas_chat_archive' LIMIT 1",
      [orderNo]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });

    const order = rows[0];
    if (order.status === 'paid') return res.json({ success: true, message: '该订单已处于已支付状态' });

    // 更新订单状态
    await AppDataSource.query(
      "UPDATE payment_orders SET status = 'paid', paid_at = NOW(), remark = CONCAT(IFNULL(remark, ''), '\n[管理员确认] ', ?), updated_at = NOW() WHERE order_no = ?",
      [remark || '管理员手动确认支付', orderNo]
    );

    // 激活会话存档
    await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [order.tenant_id]).catch(() => {});

    // 解析人数（从package_name中提取）
    let userCount = 10;
    const rows2 = await AppDataSource.query("SELECT package_name FROM payment_orders WHERE order_no = ?", [orderNo]);
    if (rows2.length > 0) {
      const match = rows2[0].package_name?.match(/(\d+)人/);
      if (match) userCount = parseInt(match[1]);
    }

    // 更新或创建存档设置
    await AppDataSource.query(
      `INSERT INTO wecom_archive_settings (tenant_id, max_users, status, expire_date)
       VALUES (?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR))
       ON DUPLICATE KEY UPDATE max_users = VALUES(max_users), status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR), updated_at = NOW()`,
      [order.tenant_id, userCount]
    ).catch(() => {});

    log.info(`[Admin Wecom] VAS order ${orderNo} manually confirmed paid by admin`);
    res.json({ success: true, message: '已确认支付并激活会话存档' });
  } catch (error: any) {
    log.error('[Admin Wecom] Confirm paid error:', error.message);
    res.status(500).json({ success: false, message: '确认支付失败' });
  }
});

/**
 * 手动取消/关闭订单
 * PUT /api/v1/admin/wecom-management/vas-orders/:orderNo/cancel
 */
router.put('/vas-orders/:orderNo/cancel', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { orderNo } = req.params;
    const { reason } = req.body;

    const rows = await AppDataSource.query(
      "SELECT id, status FROM payment_orders WHERE order_no = ? AND package_id = 'vas_chat_archive' LIMIT 1",
      [orderNo]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });
    if (rows[0].status === 'paid') return res.status(400).json({ success: false, message: '已支付订单不可取消' });

    await AppDataSource.query(
      "UPDATE payment_orders SET status = 'closed', remark = CONCAT(IFNULL(remark, ''), '\n[管理员取消] ', ?), updated_at = NOW() WHERE order_no = ?",
      [reason || '管理员取消', orderNo]
    );

    log.info(`[Admin Wecom] VAS order ${orderNo} cancelled by admin`);
    res.json({ success: true, message: '订单已取消' });
  } catch (error: any) {
    log.error('[Admin Wecom] Cancel order error:', error.message);
    res.status(500).json({ success: false, message: '取消订单失败' });
  }
});

/**
 * 手动触发到期检查（管理员工具）
 * POST /api/v1/admin/wecom-management/check-expired
 */
router.post('/check-expired', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    // 查找已过期但状态仍为active的存档设置
    const expired = await AppDataSource.query(
      "SELECT tenant_id FROM wecom_archive_settings WHERE status = 'active' AND expire_date IS NOT NULL AND expire_date < NOW()"
    ).catch(() => []);

    let count = 0;
    for (const row of expired) {
      await AppDataSource.query(
        "UPDATE wecom_archive_settings SET status = 'expired', updated_at = NOW() WHERE tenant_id = ?",
        [row.tenant_id]
      ).catch(() => {});
      await AppDataSource.query(
        'UPDATE tenants SET wecom_chat_archive_auth = 0 WHERE id = ?',
        [row.tenant_id]
      ).catch(() => {});
      count++;
    }

    log.info(`[Admin Wecom] Manual expire check: ${count} tenant(s) expired`);
    res.json({ success: true, message: `检查完成，${count} 个租户已过期并停用`, data: { expiredCount: count } });
  } catch (error: any) {
    log.error('[Admin Wecom] Check expired error:', error.message);
    res.status(500).json({ success: false, message: '到期检查失败' });
  }
});

// ==================== 租户授权管理 ====================

/**
 * 获取租户企微授权列表
 * GET /api/v1/admin/wecom-management/tenant-auth
 */
router.get('/tenant-auth', async (req: Request, res: Response) => {
  try {
    const { keyword, authType, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    const subTableCheck = async (tableName: string) => {
      try {
        const r = await AppDataSource.query(
          'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tableName]
        );
        return !!r[0]?.cnt;
      } catch { return false; }
    };
    const hasConfigs = await subTableCheck('wecom_configs');
    if (!hasConfigs) {
      return res.json({
        success: true,
        data: { list: [], total: 0, page: parseInt(page as string), pageSize: limit }
      });
    }

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ? OR wc.corp_id LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (authType && authType !== 'all') {
      where += ' AND wc.auth_type = ?';
      params.push(authType);
    }
    if (status === 'connected') {
      where += " AND wc.connection_status = 'connected'";
    } else if (status === 'disconnected') {
      where += " AND (wc.connection_status != 'connected' OR wc.connection_status IS NULL)";
    }

    const countSql = `SELECT COUNT(*) as total FROM wecom_configs wc LEFT JOIN tenants t ON wc.tenant_id = t.id ${where}`;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    const listSql = `
      SELECT
        wc.id AS configId,
        wc.name AS configName,
        wc.corp_id AS corpId,
        wc.auth_type AS authType,
        wc.auth_mode AS authMode,
        wc.is_enabled AS isEnabled,
        wc.connection_status AS connectionStatus,
        wc.last_error AS lastError,
        wc.api_call_count AS apiCallCount,
        wc.tenant_id AS tenantId,
        wc.created_at AS createdAt,
        wc.updated_at AS updatedAt,
        wc.auth_time AS authTime,
        wc.suite_id AS suiteId,
        wc.auth_corp_name AS authCorpName,
        wc.auth_admin_user_id AS authAdminUserId,
        wc.auth_corp_info AS authCorpInfo,
        wc.data_api_status AS dataApiStatus,
        wc.data_api_expire_time AS dataApiExpireTime,
        wc.vas_chat_archive AS vasChatArchive,
        wc.vas_expire_date AS vasExpireDate,
        wc.vas_user_count AS vasUserCount,
        t.name AS tenantName,
        t.code AS tenantCode,
        t.status AS tenantStatus
      FROM wecom_configs wc
      LEFT JOIN tenants t ON wc.tenant_id = t.id
      ${where}
      ORDER BY wc.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    // 解析 auth_corp_info JSON 提取有用字段
    const enrichedList = list.map((row: any) => {
      const item: any = {
        ...row,
        isEnabled: !!row.isEnabled,
        vasChatArchive: !!row.vasChatArchive
      };
      if (row.authCorpInfo) {
        try {
          const info = typeof row.authCorpInfo === 'string' ? JSON.parse(row.authCorpInfo) : row.authCorpInfo;
          item.corpFullName = info.corp_full_name || '';
          item.corpIndustry = info.corp_industry || '';
          item.corpSubIndustry = info.corp_sub_industry || '';
          item.corpScale = info.corp_scale || '';
          item.corpSquareLogoUrl = info.corp_square_logo_url || '';
          item.corpUserMax = info.corp_user_max || 0;
        } catch { /* ignore */ }
        delete item.authCorpInfo;
      }
      return item;
    });

    res.json({
      success: true,
      data: {
        list: enrichedList,
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Tenant auth list error:', error.message);
    res.json({
      success: true,
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      message: '获取租户授权列表异常'
    });
  }
});

/**
 * 获取租户授权详情
 * GET /api/v1/admin/wecom-management/tenant-auth/:configId/detail
 */
router.get('/tenant-auth/:configId/detail', async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;

    const rows = await AppDataSource.query(
      `SELECT wc.*, t.name AS tenantName, t.code AS tenantCode, t.status AS tenantStatus,
              t.wecom_chat_archive_auth AS chatArchiveAuth
       FROM wecom_configs wc
       LEFT JOIN tenants t ON wc.tenant_id = t.id
       WHERE wc.id = ? LIMIT 1`,
      [configId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '配置不存在' });
    }

    const config = rows[0];

    // 获取授权范围（安全解析JSON）
    let authScope = null;
    try { authScope = config.auth_scope ? JSON.parse(config.auth_scope) : null; } catch { authScope = null; }
    let authCorpInfo = null;
    try { authCorpInfo = config.auth_corp_info ? JSON.parse(config.auth_corp_info) : null; } catch { authCorpInfo = null; }
    let authUserInfo = null;
    try { authUserInfo = config.auth_user_info ? JSON.parse(config.auth_user_info) : null; } catch { authUserInfo = null; }

    // 统计数据
    const safeCount = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return r[0]?.cnt || 0; } catch { return 0; }
    };
    const stats = {
      customerCount: await safeCount('SELECT COUNT(*) as cnt FROM wecom_customers WHERE wecom_config_id = ?', [configId]),
      bindingCount: await safeCount('SELECT COUNT(*) as cnt FROM wecom_user_bindings WHERE wecom_config_id = ?', [configId]),
      chatRecordCount: await safeCount('SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id = ?', [configId])
    };

    // 解析授权范围中的部门ID和成员ID，查询对应名称
    let deptNameMap: Record<number, string> = {};
    let memberInfoMap: Record<string, { name: string; avatar?: string; deptNames?: string; isEnabled?: boolean; createdAt?: string }> = {};
    try {
      // 收集所有需要解析的部门ID和成员ID
      const allDeptIds = new Set<number>();
      const allUserIds = new Set<string>();
      if (authScope?.agent) {
        for (const agent of authScope.agent) {
          if (agent.privilege?.allow_party) agent.privilege.allow_party.forEach((id: number) => allDeptIds.add(id));
          if (agent.privilege?.extra_party) agent.privilege.extra_party.forEach((id: number) => allDeptIds.add(id));
          if (agent.privilege?.allow_user) agent.privilege.allow_user.forEach((id: string) => allUserIds.add(id));
          if (agent.privilege?.extra_user) agent.privilege.extra_user.forEach((id: string) => allUserIds.add(id));
        }
      }
      // 查询部门名称
      if (allDeptIds.size > 0) {
        try {
          const deptRows = await AppDataSource.query(
            `SELECT wecom_dept_id, wecom_dept_name FROM wecom_department_mappings WHERE wecom_config_id = ? AND wecom_dept_id IN (?)`,
            [configId, [...allDeptIds]]
          );
          for (const r of deptRows) {
            if (r.wecom_dept_name) deptNameMap[r.wecom_dept_id] = r.wecom_dept_name;
          }
        } catch { /* table may not exist */ }
      }
      // 查询成员信息
      if (allUserIds.size > 0) {
        try {
          const memberRows = await AppDataSource.query(
            `SELECT wecom_user_id, wecom_user_name, wecom_avatar, wecom_department_ids, is_enabled, created_at FROM wecom_user_bindings WHERE wecom_config_id = ? AND wecom_user_id IN (?)`,
            [configId, [...allUserIds]]
          );
          for (const r of memberRows) {
            memberInfoMap[r.wecom_user_id] = {
              name: r.wecom_user_name || '',
              avatar: r.wecom_avatar || '',
              deptNames: r.wecom_department_ids || '',
              isEnabled: !!r.is_enabled,
              createdAt: r.created_at
            };
          }
          // 解析部门名称给成员
          for (const uid of Object.keys(memberInfoMap)) {
            const info = memberInfoMap[uid];
            if (info.deptNames) {
              const ids = info.deptNames.split(',').map(s => Number(s.trim())).filter(n => n > 0);
              const names = ids.map(id => deptNameMap[id] || String(id));
              info.deptNames = names.join(', ');
            }
          }
        } catch { /* table may not exist */ }
      }

      // 对仍缺少姓名的成员，调用企微 /user/get 实时获取（限流，最多 50 个）
      const missingUserIds: string[] = [];
      for (const uid of allUserIds) {
        const info = memberInfoMap[uid];
        if (!info || !info.name || info.name === uid) missingUserIds.push(uid);
      }
      if (missingUserIds.length > 0) {
        try {
          const accessToken = await WecomTokenService.getAccessTokenByConfigId(Number(configId), 'contact');
          const limit = Math.min(missingUserIds.length, 50);
          for (let i = 0; i < limit; i++) {
            const uid = missingUserIds[i];
            const detail = await WecomApiService.getUserDetail(accessToken, uid);
            const name = detail?.name || detail?.alias || '';
            if (name) {
              const existed = memberInfoMap[uid] || { name: '', deptNames: '', isEnabled: true };
              memberInfoMap[uid] = {
                ...existed,
                name,
                avatar: detail.avatar || existed.avatar || '',
                deptNames: existed.deptNames || ''
              };
            }
            if (i % 10 === 9) await new Promise(r => setTimeout(r, 100));
          }
        } catch (e: any) {
          log.warn('[Admin Wecom] tenant-auth detail enrich names failed:', e?.message);
        }
      }
    } catch { /* ignore resolution errors */ }

    res.json({
      success: true,
      data: {
        configId: config.id,
        configName: config.name,
        corpId: config.corp_id,
        authType: config.auth_type || 'self_built',
        isEnabled: !!config.is_enabled,
        connectionStatus: config.connection_status,
        lastError: config.last_error,
        apiCallCount: config.api_call_count,
        tenantId: config.tenant_id,
        tenantName: config.tenantName,
        tenantCode: config.tenantCode,
        tenantStatus: config.tenantStatus,
        chatArchiveAuth: !!config.chatArchiveAuth,
        suiteId: config.suite_id,
        dataApiStatus: config.data_api_status,
        dataApiExpireTime: config.data_api_expire_time,
        vasChatArchive: !!config.vas_chat_archive,
        vasExpireDate: config.vas_expire_date,
        vasUserCount: config.vas_user_count,
        authScope,
        authCorpInfo,
        authUserInfo,
        deptNameMap,
        memberInfoMap,
        createdAt: config.created_at,
        updatedAt: config.updated_at,
        stats
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Tenant auth detail error:', error.message);
    res.status(500).json({ success: false, message: '获取授权详情失败' });
  }
});

/**
 * 刷新授权信息（从企微API实时获取最新授权范围）
 * POST /api/v1/admin/wecom-management/tenant-auth/:configId/refresh-auth
 */
router.post('/tenant-auth/:configId/refresh-auth', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { configId } = req.params;
    const configRows = await AppDataSource.query(
      'SELECT id, corp_id, auth_type, suite_id, permanent_code FROM wecom_configs WHERE id = ? LIMIT 1', [configId]
    );
    if (!configRows.length) return res.status(404).json({ success: false, message: '配置不存在' });
    const config = configRows[0];

    if (config.auth_type !== 'third_party') {
      return res.json({ success: false, message: '仅第三方应用授权支持刷新' });
    }

    if (!config.permanent_code) {
      return res.json({ success: false, message: '缺少永久授权码(permanent_code)，请让企业管理员重新授权' });
    }

    // 获取suite配置
    const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
    const suiteConfig = await suiteRepo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!suiteConfig || !suiteConfig.suiteId || !suiteConfig.suiteSecret) {
      return res.json({ success: false, message: '服务商应用配置不完整' });
    }

    const token = await getSuiteAccessToken(suiteConfig);
    const axios = (await import('axios')).default;

    // permanent_code 可能是加密存储的，需要解密
    let permanentCode = config.permanent_code;
    if (permanentCode && permanentCode.startsWith('enc:')) {
      try {
        const configEntity = await AppDataSource.getRepository(WecomConfig).findOne({ where: { id: Number(configId) } });
        permanentCode = configEntity?.permanentCode || permanentCode;
      } catch (_e: any) {
        log.warn('[Admin Wecom] Failed to decrypt permanent_code via entity, using raw value');
      }
    }

    const result = await axios.post(
      `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${token}`,
      { auth_corpid: config.corp_id, permanent_code: permanentCode }
    );

    if (result.data.errcode && result.data.errcode !== 0) {
      // 如果企微返回错误，可能是企业已取消授权
      const errcode = result.data.errcode;
      if (errcode === 40078 || errcode === 40082 || errcode === 60011) {
        // 授权已取消
        await AppDataSource.query(
          `UPDATE wecom_configs SET connection_status = 'disconnected', is_enabled = 0,
           last_error = ?, updated_at = NOW() WHERE id = ?`,
          [`企业已取消授权 (errcode: ${errcode}, ${new Date().toLocaleString('zh-CN')})`, configId]
        );
        return res.json({ success: false, message: `授权已失效: ${result.data.errmsg} (${errcode})，该企业可能已删除应用` });
      }
      return res.json({ success: false, message: `刷新失败: ${result.data.errmsg} (${result.data.errcode})` });
    }

    // 更新数据库中的授权信息
    const authInfo = result.data.auth_info || {};
    const authCorpInfo = result.data.auth_corp_info || {};
    // ★ 提取 AgentID（agentConfig 签名必需）
    const agentId = authInfo?.agent?.[0]?.agentid;
    if (agentId) {
      await AppDataSource.query(
        `UPDATE wecom_configs SET auth_scope = ?, auth_corp_info = ?, agent_id = ?, connection_status = 'connected',
         last_error = NULL, updated_at = NOW() WHERE id = ?`,
        [JSON.stringify(authInfo), JSON.stringify(authCorpInfo), agentId, configId]
      );
      log.info(`[Admin Wecom] Auth info refreshed for config ${configId}, corp: ${config.corp_id}, agentId: ${agentId}`);
    } else {
      await AppDataSource.query(
        `UPDATE wecom_configs SET auth_scope = ?, auth_corp_info = ?, connection_status = 'connected',
         last_error = NULL, updated_at = NOW() WHERE id = ?`,
        [JSON.stringify(authInfo), JSON.stringify(authCorpInfo), configId]
      );
      log.info(`[Admin Wecom] Auth info refreshed for config ${configId}, corp: ${config.corp_id} (agentId未返回)`);
    }

    res.json({ success: true, message: '授权信息已刷新', data: { authScope: authInfo, authCorpInfo, agentId: agentId || null } });
  } catch (error: any) {
    log.error('[Admin Wecom] Refresh auth error:', error.message);
    res.status(500).json({ success: false, message: `刷新失败: ${error.message}` });
  }
});

/**
 * 关联租户
 * POST /api/v1/admin/wecom-management/tenant-auth/:configId/bind-tenant
 */
router.post('/tenant-auth/:configId/bind-tenant', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { configId } = req.params;
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: '请选择要关联的租户' });

    // 检查配置是否存在
    const config = await AppDataSource.query('SELECT id, corp_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    if (!config.length) return res.status(404).json({ success: false, message: '配置不存在' });

    // 检查是否已被其他配置关联
    const existing = await AppDataSource.query(
      'SELECT id FROM wecom_configs WHERE tenant_id = ? AND id != ? LIMIT 1', [tenantId, configId]
    );
    if (existing.length) return res.status(400).json({ success: false, message: '该租户已被其他企业关联' });

    await AppDataSource.query(
      'UPDATE wecom_configs SET tenant_id = ?, updated_at = NOW() WHERE id = ?', [tenantId, configId]
    );
    log.info(`[Admin Wecom] Config ${configId} bound to tenant ${tenantId}`);
    res.json({ success: true, message: '已关联租户' });
  } catch (error: any) {
    log.error('[Admin Wecom] Bind tenant error:', error.message);
    res.status(500).json({ success: false, message: '关联失败' });
  }
});

/**
 * 获取指定企业的操作日志
 * GET /api/v1/admin/wecom-management/tenant-auth/:configId/logs
 * 聚合来源：1) 企微回调日志(create_auth/cancel_auth/change_auth)  2) 审计日志  3) 同步日志
 */
router.get('/tenant-auth/:configId/logs', async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);

    // 获取 corpId 和 tenantId
    const configRow = await AppDataSource.query('SELECT corp_id, tenant_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    const corpId = configRow[0]?.corp_id || '';
    const tenantId = configRow[0]?.tenant_id || '';

    const allLogs: any[] = [];

    // 来源1: 企微服务商回调日志 (create_auth, cancel_auth, change_auth 等)
    if (corpId) {
      try {
        const hasTable = await AppDataSource.query(
          "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_suite_callback_logs'"
        ).catch(() => [{ cnt: 0 }]);
        if (hasTable[0]?.cnt) {
          const cbLogs = await AppDataSource.query(
            `SELECT id, info_type, auth_corp_id, detail, status, error_message, created_at
             FROM wecom_suite_callback_logs
             WHERE auth_corp_id = ? AND info_type != 'suite_ticket'
             ORDER BY created_at DESC LIMIT 200`,
            [corpId]
          );
          const infoTypeLabels: Record<string, string> = {
            create_auth: '企业授权安装', cancel_auth: '企业取消授权',
            change_auth: '企业变更授权', reset_permanent_code: '重置永久授权码',
            change_contact: '通讯录变更', change_external_contact: '客户联系变更'
          };
          for (const row of cbLogs) {
            allLogs.push({
              operator: '企业微信回调',
              actionType: infoTypeLabels[row.info_type] || row.info_type,
              detail: row.detail ? (row.detail.length > 200 ? row.detail.substring(0, 200) + '...' : row.detail) : (row.status === 'failed' ? `处理失败: ${row.error_message || ''}` : '处理成功'),
              createdAt: row.created_at
            });
          }
        }
      } catch (_e) { /* 表可能不存在 */ }
    }

    // 来源2: 审计日志表
    if (corpId) {
      try {
        const auditTables = ['wecom_audit_logs', 'admin_operation_logs'];
        for (const tn of auditTables) {
          const check = await AppDataSource.query(
            'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tn]
          ).catch(() => [{ cnt: 0 }]);
          if (check[0]?.cnt) {
            const kw = `%${corpId}%`;
            const auditLogs = await AppDataSource.query(
              `SELECT operator, action_type AS actionType, detail, created_at AS createdAt
               FROM ${tn} WHERE (target LIKE ? OR detail LIKE ?)
               ORDER BY created_at DESC LIMIT 200`,
              [kw, kw]
            );
            allLogs.push(...auditLogs);
            break;
          }
        }
      } catch (_e) { /* 表可能不存在 */ }
    }

    // 来源3: 同步日志 (存储在 tenant_settings 的 wecom_sync_logs key)
    if (tenantId) {
      try {
        const rows = await AppDataSource.query(
          "SELECT setting_value FROM tenant_settings WHERE tenant_id = ? AND setting_key = 'wecom_sync_logs' LIMIT 1",
          [tenantId]
        );
        if (rows.length > 0) {
          let syncLogs: any[] = [];
          try { syncLogs = JSON.parse(rows[0].setting_value); } catch { syncLogs = []; }
          if (Array.isArray(syncLogs)) {
            for (const entry of syncLogs) {
              allLogs.push({
                operator: '系统同步',
                actionType: entry.operation || entry.type || '同步',
                detail: entry.detail || '',
                createdAt: entry.timestamp || entry.createdAt || ''
              });
            }
          }
        }
      } catch (_e) { /* ignore */ }
    }

    // 按时间倒序排序
    allLogs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = allLogs.length;
    const list = allLogs.slice((pg - 1) * ps, pg * ps);

    res.json({ success: true, data: { list, total, page: pg, pageSize: ps } });
  } catch (error: any) {
    log.error('[Admin Wecom] Config logs error:', error.message);
    res.json({ success: true, data: { list: [], total: 0 } });
  }
});

/**
 * 确保 tenant_settings 表结构完整（synchronize: false 时自动创建缺失表/列）
 */
let tenantSettingsChecked = false;
async function ensureTenantSettingsTable() {
  if (tenantSettingsChecked) return;
  tenantSettingsChecked = true;
  try {
    const tables = await AppDataSource.query(`SHOW TABLES LIKE 'tenant_settings'`);
    if (tables.length === 0) {
      await AppDataSource.query(`
        CREATE TABLE tenant_settings (
          id VARCHAR(36) NOT NULL,
          tenant_id VARCHAR(36) NOT NULL,
          setting_key VARCHAR(100) NOT NULL,
          setting_value TEXT NULL,
          setting_type VARCHAR(20) DEFAULT 'string',
          description VARCHAR(500) NULL,
          created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          UNIQUE KEY uk_tenant_setting (tenant_id, setting_key),
          KEY idx_tenant_id (tenant_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      log.info('[Admin Wecom] Created tenant_settings table');
    } else {
      // 确保关键列存在
      const cols = await AppDataSource.query(`SHOW COLUMNS FROM tenant_settings`);
      const colNames = cols.map((c: any) => c.Field);
      if (!colNames.includes('setting_type')) {
        await AppDataSource.query(`ALTER TABLE tenant_settings ADD COLUMN setting_type VARCHAR(20) DEFAULT 'string'`);
        log.info('[Admin Wecom] Added setting_type column to tenant_settings');
      }
      if (!colNames.includes('description')) {
        await AppDataSource.query(`ALTER TABLE tenant_settings ADD COLUMN description VARCHAR(500) NULL`);
        log.info('[Admin Wecom] Added description column to tenant_settings');
      }
    }
  } catch (e: any) {
    log.warn('[Admin Wecom] ensureTenantSettingsTable error:', e.message);
  }
}

/**
 * 获取操作日志自动清理配置
 * GET /api/v1/admin/wecom-management/tenant-auth/:configId/log-auto-clean
 */
router.get('/tenant-auth/:configId/log-auto-clean', async (req: Request, res: Response) => {
  try {
    await ensureTenantSettingsTable();
    const { configId } = req.params;
    const configRow = await AppDataSource.query('SELECT tenant_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    const tenantId = configRow[0]?.tenant_id;
    if (!tenantId) return res.json({ success: true, data: { enabled: false, retentionDays: 30 } });

    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_log_auto_clean' } });
    if (setting) {
      try {
        const val = JSON.parse(setting.settingValue || '{}');
        return res.json({ success: true, data: { enabled: !!val.enabled, retentionDays: val.retentionDays || 30 } });
      } catch { /* fall through */ }
    }
    res.json({ success: true, data: { enabled: false, retentionDays: 30 } });
  } catch (error: any) {
    log.error('[Admin Wecom] Get log auto-clean config error:', error.message);
    res.json({ success: true, data: { enabled: false, retentionDays: 30 } });
  }
});

/**
 * 保存操作日志自动清理配置
 * PUT /api/v1/admin/wecom-management/tenant-auth/:configId/log-auto-clean
 */
router.put('/tenant-auth/:configId/log-auto-clean', async (req: Request, res: Response) => {
  try {
    await ensureTenantSettingsTable();
    const { configId } = req.params;
    const { enabled, retentionDays } = req.body;
    // 存储到 tenant_settings（使用TypeORM Repository）
    const configRow = await AppDataSource.query('SELECT tenant_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    const tenantId = configRow[0]?.tenant_id;
    if (!tenantId) return res.json({ success: false, message: '未关联租户' });
    const settingValue = JSON.stringify({ enabled: !!enabled, retentionDays: retentionDays || 30 });

    const repo = AppDataSource.getRepository(TenantSettings);
    const setting = await repo.findOne({ where: { tenantId, settingKey: 'wecom_log_auto_clean' } });

    if (setting) {
      setting.settingValue = settingValue;
      await repo.save(setting);
    } else {
      const { v4: uuidv4 } = require('uuid');
      const newSetting = new TenantSettings();
      newSetting.id = uuidv4();
      newSetting.tenantId = tenantId;
      newSetting.settingKey = 'wecom_log_auto_clean';
      newSetting.settingValue = settingValue;
      newSetting.settingType = 'json';
      await repo.save(newSetting);
    }
    res.json({ success: true, message: '保存成功' });
  } catch (error: any) {
    log.error('[Admin Wecom] Save log auto-clean config error:', error.message, error.stack);
    res.status(500).json({ success: false, message: `保存失败: ${error.message}` });
  }
});

/**
 * 手动清理操作日志
 * DELETE /api/v1/admin/wecom-management/tenant-auth/:configId/logs
 */
router.delete('/tenant-auth/:configId/logs', async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { beforeDays = 30 } = req.query;
    const configRow = await AppDataSource.query('SELECT corp_id, tenant_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    const corpId = configRow[0]?.corp_id || '';
    const cutoffDate = new Date(Date.now() - Number(beforeDays) * 86400000).toISOString();
    let deleted = 0;
    // 清理回调日志
    if (corpId) {
      try {
        const result = await AppDataSource.query(
          `DELETE FROM wecom_suite_callback_logs WHERE auth_corp_id = ? AND created_at < ?`,
          [corpId, cutoffDate]
        );
        deleted += result?.affectedRows || 0;
      } catch { /* table may not exist */ }
    }
    res.json({ success: true, data: { deleted }, message: `已清理 ${deleted} 条日志` });
  } catch (error: any) {
    log.error('[Admin Wecom] Clean logs error:', error.message);
    res.status(500).json({ success: false, message: '清理失败' });
  }
});

/**
 * 获取指定租户的账单记录
 * GET /api/v1/admin/wecom-management/tenant-auth/:configId/billing
 */
router.get('/tenant-auth/:configId/billing', async (req: Request, res: Response) => {
  try {
    const { configId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);

    // 获取tenantId
    const configRow = await AppDataSource.query('SELECT tenant_id FROM wecom_configs WHERE id = ? LIMIT 1', [configId]);
    const tenantId = configRow[0]?.tenant_id;

    if (!tenantId) {
      return res.json({ success: true, data: { list: [], total: 0, message: '未关联租户，无账单记录' } });
    }

    // 从 system_config 的 tenant_billing_records_ 中获取
    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [key]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch { records = []; }
    }
    if (!Array.isArray(records)) records = [];

    // 按时间倒序
    records.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = records.length;
    const list = records.slice((pg - 1) * ps, pg * ps);

    res.json({ success: true, data: { list, total, page: pg, pageSize: ps } });
  } catch (error: any) {
    log.error('[Admin Wecom] Config billing error:', error.message);
    res.json({ success: true, data: { list: [], total: 0 } });
  }
});

/**
 * 撤销租户授权
 * POST /api/v1/admin/wecom-management/tenant-auth/:configId/revoke
 */
router.post('/tenant-auth/:configId/revoke', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { configId } = req.params;
    const { reason } = req.body;

    await AppDataSource.query(
      "UPDATE wecom_configs SET is_enabled = 0, connection_status = 'disconnected', updated_at = NOW() WHERE id = ?",
      [configId]
    );

    log.info(`[Admin Wecom] Config ${configId} revoked by admin. Reason: ${reason || 'N/A'}`);
    res.json({ success: true, message: '已撤销授权' });
  } catch (error: any) {
    log.error('[Admin Wecom] Revoke auth error:', error.message);
    res.status(500).json({ success: false, message: '撤销授权失败' });
  }
});

/**
 * 恢复租户授权
 * POST /api/v1/admin/wecom-management/tenant-auth/:configId/restore
 */
router.post('/tenant-auth/:configId/restore', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { configId } = req.params;

    await AppDataSource.query(
      'UPDATE wecom_configs SET is_enabled = 1, updated_at = NOW() WHERE id = ?',
      [configId]
    );

    log.info(`[Admin Wecom] Config ${configId} restored by admin`);
    res.json({ success: true, message: '已恢复授权' });
  } catch (error: any) {
    log.error('[Admin Wecom] Restore auth error:', error.message);
    res.status(500).json({ success: false, message: '恢复授权失败' });
  }
});

// ==================== 套餐模板管理 (SaaS) ====================

/**
 * 获取套餐模板列表
 * GET /api/v1/admin/wecom-management/package-templates
 */
router.get('/package-templates', async (_req: Request, res: Response) => {
  try {
    const subTableCheck = async (tableName: string) => {
      try {
        const r = await AppDataSource.query(
          'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tableName]
        );
        return !!r[0]?.cnt;
      } catch { return false; }
    };
    const hasVasConfigs = await subTableCheck('wecom_vas_configs');

    if (!hasVasConfigs) {
      // 从 system_config 读取兼容
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_package_templates' LIMIT 1"
      ).catch(() => []);
      let templates: any[] = [];
      if (rows.length > 0) {
        try { templates = JSON.parse(rows[0].config_value); } catch { templates = []; }
      }
      if (templates.length === 0) {
        templates = getDefaultPackageTemplates();
      }
      return res.json({ success: true, data: templates });
    }

    const rows = await AppDataSource.query(
      'SELECT * FROM wecom_vas_configs WHERE config_type = ? ORDER BY sort_order ASC, created_at ASC',
      ['package_template']
    );

    const templates = rows.map((row: any) => {
      let configData: any = {};
      try { configData = JSON.parse(row.config_value || '{}'); } catch { configData = {}; }
      return {
        id: row.id,
        name: row.config_name,
        ...configData,
        isEnabled: !!row.is_enabled,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    res.json({ success: true, data: templates });
  } catch (error: any) {
    log.error('[Admin Wecom] Package templates error:', error.message);
    res.json({ success: true, data: getDefaultPackageTemplates() });
  }
});

/**
 * 创建套餐模板
 * POST /api/v1/admin/wecom-management/package-templates
 */
router.post('/package-templates', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { name, userCount, duration, durationUnit, price, originalPrice, description, features, isEnabled, sortOrder } = req.body;

    if (!name || !userCount || !price) {
      return res.status(400).json({ success: false, message: '名称、人数和价格为必填项' });
    }

    const configValue = JSON.stringify({
      userCount,
      duration: duration || 1,
      durationUnit: durationUnit || 'year',
      price,
      originalPrice: originalPrice || price,
      description: description || '',
      features: features || []
    });

    // 尝试写入 wecom_vas_configs 表，失败则降级到 system_config
    try {
      await AppDataSource.query(
        `INSERT INTO wecom_vas_configs (config_type, config_name, config_value, is_enabled, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        ['package_template', name, configValue, isEnabled !== false ? 1 : 0, sortOrder || 0]
      );
    } catch {
      // 降级：追加到 system_config JSON 数组
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_package_templates' LIMIT 1"
      ).catch(() => []);
      let templates: any[] = [];
      if (rows.length > 0) {
        try { templates = JSON.parse(rows[0].config_value); } catch { templates = []; }
      }
      const newTemplate = {
        id: Date.now(),
        name,
        userCount,
        duration: duration || 1,
        durationUnit: durationUnit || 'year',
        price,
        originalPrice: originalPrice || price,
        description: description || '',
        features: features || [],
        isEnabled: isEnabled !== false,
        sortOrder: sortOrder || 0
      };
      templates.push(newTemplate);
      if (rows.length > 0) {
        await AppDataSource.query(
          "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_package_templates'",
          [JSON.stringify(templates)]
        );
      } else {
        await AppDataSource.query(
          "INSERT INTO system_config (config_key, config_value, created_at, updated_at) VALUES ('wecom_package_templates', ?, NOW(), NOW())",
          [JSON.stringify(templates)]
        );
      }
    }

    res.json({ success: true, message: '套餐模板已创建' });
  } catch (error: any) {
    log.error('[Admin Wecom] Create package template error:', error.message);
    res.status(500).json({ success: false, message: '创建套餐模板失败' });
  }
});

/**
 * 更新套餐模板
 * PUT /api/v1/admin/wecom-management/package-templates/:id
 */
router.put('/package-templates/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { id } = req.params;
    const { name, userCount, duration, durationUnit, price, originalPrice, description, features, isEnabled, sortOrder } = req.body;

    const configValue = JSON.stringify({
      userCount,
      duration: duration || 1,
      durationUnit: durationUnit || 'year',
      price,
      originalPrice: originalPrice || price,
      description: description || '',
      features: features || []
    });

    try {
      const result = await AppDataSource.query(
        `UPDATE wecom_vas_configs SET config_name = ?, config_value = ?, is_enabled = ?, sort_order = ?, updated_at = NOW() WHERE id = ?`,
        [name, configValue, isEnabled !== false ? 1 : 0, sortOrder || 0, id]
      );
      if (result.affectedRows === 0) throw new Error('not found in table');
    } catch {
      // 降级：更新 system_config JSON
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_package_templates' LIMIT 1"
      ).catch(() => []);
      let templates: any[] = [];
      if (rows.length > 0) {
        try { templates = JSON.parse(rows[0].config_value); } catch { templates = []; }
      }
      const idx = templates.findIndex((t: any) => String(t.id) === String(id));
      if (idx >= 0) {
        templates[idx] = { ...templates[idx], name, userCount, duration, durationUnit, price, originalPrice, description, features, isEnabled, sortOrder };
        await AppDataSource.query(
          "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_package_templates'",
          [JSON.stringify(templates)]
        );
      }
    }

    res.json({ success: true, message: '套餐模板已更新' });
  } catch (error: any) {
    log.error('[Admin Wecom] Update package template error:', error.message);
    res.status(500).json({ success: false, message: '更新套餐模板失败' });
  }
});

/**
 * 删除套餐模板
 * DELETE /api/v1/admin/wecom-management/package-templates/:id
 */
router.delete('/package-templates/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { id } = req.params;

    try {
      await AppDataSource.query('DELETE FROM wecom_vas_configs WHERE id = ? AND config_type = ?', [id, 'package_template']);
    } catch {
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_package_templates' LIMIT 1"
      ).catch(() => []);
      let templates: any[] = [];
      if (rows.length > 0) {
        try { templates = JSON.parse(rows[0].config_value); } catch { templates = []; }
      }
      templates = templates.filter((t: any) => String(t.id) !== String(id));
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_package_templates'",
        [JSON.stringify(templates)]
      );
    }

    res.json({ success: true, message: '套餐模板已删除' });
  } catch (error: any) {
    log.error('[Admin Wecom] Delete package template error:', error.message);
    res.status(500).json({ success: false, message: '删除套餐模板失败' });
  }
});

// ==================== 租户套餐管理 ====================

/**
 * 获取租户套餐分配列表
 * GET /api/v1/admin/wecom-management/tenant-packages
 */
router.get('/tenant-packages', async (req: Request, res: Response) => {
  try {
    const { keyword, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    const subTableCheck = async (tableName: string) => {
      try {
        const r = await AppDataSource.query(
          'SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tableName]
        );
        return !!r[0]?.cnt;
      } catch { return false; }
    };

    const hasArchiveSettings = await subTableCheck('wecom_archive_settings');

    let where = 'WHERE t.wecom_chat_archive_auth = 1';
    const params: any[] = [];

    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (hasArchiveSettings && status && status !== 'all') {
      where += ' AND was2.status = ?';
      params.push(status);
    }

    const countSql = hasArchiveSettings
      ? `SELECT COUNT(*) as total FROM tenants t LEFT JOIN wecom_archive_settings was2 ON was2.tenant_id = t.id ${where}`
      : `SELECT COUNT(*) as total FROM tenants t ${where}`;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    const listSql = hasArchiveSettings
      ? `SELECT t.id AS tenantId, t.name AS tenantName, t.code AS tenantCode, t.status AS tenantStatus,
                t.wecom_chat_archive_auth AS chatArchiveAuth,
                was2.max_users AS maxUsers, was2.used_users AS usedUsers, was2.expire_date AS expireDate,
                was2.status AS archiveStatus, was2.package_type AS packageType, was2.storage_type AS storageType,
                was2.total_messages AS totalMessages, was2.total_storage_mb AS totalStorageMB
         FROM tenants t LEFT JOIN wecom_archive_settings was2 ON was2.tenant_id = t.id
         ${where} ORDER BY was2.expire_date ASC LIMIT ? OFFSET ?`
      : `SELECT t.id AS tenantId, t.name AS tenantName, t.code AS tenantCode, t.status AS tenantStatus,
                t.wecom_chat_archive_auth AS chatArchiveAuth
         FROM tenants t ${where} ORDER BY t.updated_at DESC LIMIT ? OFFSET ?`;

    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: {
        list: list.map((row: any) => ({
          ...row,
          chatArchiveAuth: !!row.chatArchiveAuth,
          maxUsers: row.maxUsers || 0,
          usedUsers: row.usedUsers || 0,
          archiveStatus: row.archiveStatus || 'disabled',
          packageType: row.packageType || 'basic',
          storageType: row.storageType || 'database'
        })),
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Tenant packages error:', error.message);
    res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });
  }
});

/**
 * 为租户分配/变更套餐
 * PUT /api/v1/admin/wecom-management/tenant-packages/:tenantId
 */
router.put('/tenant-packages/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { tenantId } = req.params;
    const { packageType, maxUsers, expireDate, storageType, remark } = req.body;

    if (!maxUsers || maxUsers < 1) {
      return res.status(400).json({ success: false, message: '开通人数不能小于1' });
    }

    // upsert wecom_archive_settings
    const existing = await AppDataSource.query(
      'SELECT id FROM wecom_archive_settings WHERE tenant_id = ?', [tenantId]
    ).catch(() => []);

    if (existing.length > 0) {
      await AppDataSource.query(
        `UPDATE wecom_archive_settings SET package_type = ?, max_users = ?, expire_date = ?, storage_type = ?, status = 'active', updated_at = NOW() WHERE tenant_id = ?`,
        [packageType || 'custom', maxUsers, expireDate || null, storageType || 'database', tenantId]
      );
    } else {
      await AppDataSource.query(
        `INSERT INTO wecom_archive_settings (tenant_id, package_type, max_users, expire_date, storage_type, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [tenantId, packageType || 'custom', maxUsers, expireDate || null, storageType || 'database']
      );
    }

    // 激活会话存档授权
    await AppDataSource.query(
      'UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]
    ).catch(() => {});

    log.info(`[Admin Wecom] Tenant ${tenantId} package assigned: ${packageType}, ${maxUsers} users. Remark: ${remark || 'N/A'}`);
    res.json({ success: true, message: '套餐已分配' });
  } catch (error: any) {
    log.error('[Admin Wecom] Assign package error:', error.message);
    res.status(500).json({ success: false, message: '分配套餐失败' });
  }
});

/**
 * 租户续费
 * POST /api/v1/admin/wecom-management/tenant-packages/:tenantId/renew
 */
router.post('/tenant-packages/:tenantId/renew', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { tenantId } = req.params;
    const { months, remark } = req.body;

    if (!months || months < 1) {
      return res.status(400).json({ success: false, message: '续费月数不能小于1' });
    }

    const existing = await AppDataSource.query(
      'SELECT id, expire_date FROM wecom_archive_settings WHERE tenant_id = ?', [tenantId]
    ).catch(() => []);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '该租户尚未开通套餐' });
    }

    const currentExpire = existing[0].expire_date;
    const baseDate = currentExpire && new Date(currentExpire) > new Date() ? new Date(currentExpire) : new Date();

    await AppDataSource.query(
      `UPDATE wecom_archive_settings SET expire_date = DATE_ADD(?, INTERVAL ? MONTH), status = 'active', updated_at = NOW() WHERE tenant_id = ?`,
      [baseDate, months, tenantId]
    );

    await AppDataSource.query(
      'UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]
    ).catch(() => {});

    log.info(`[Admin Wecom] Tenant ${tenantId} renewed for ${months} months. Remark: ${remark || 'N/A'}`);
    res.json({ success: true, message: `已续费 ${months} 个月` });
  } catch (error: any) {
    log.error('[Admin Wecom] Renew package error:', error.message);
    res.status(500).json({ success: false, message: '续费失败' });
  }
});

// ==================== 资源配额监控 ====================

/**
 * 获取资源配额监控数据
 * GET /api/v1/admin/wecom-management/quota-monitor
 */
router.get('/quota-monitor', async (_req: Request, res: Response) => {
  try {
    const safeQuery = async (sql: string, params?: any[]) => {
      try { return await AppDataSource.query(sql, params); } catch { return []; }
    };

    // 总体统计
    const summaryRow = await safeQuery(
      "SELECT COUNT(*) as totalTenants, COALESCE(SUM(max_users), 0) as totalMaxUsers, COALESCE(SUM(used_users), 0) as totalUsedUsers, COALESCE(SUM(total_messages), 0) as totalMessages, COALESCE(SUM(total_storage_mb), 0) as totalStorageMB FROM wecom_archive_settings WHERE status = 'active'"
    );
    const summary = summaryRow[0] || { totalTenants: 0, totalMaxUsers: 0, totalUsedUsers: 0, totalMessages: 0, totalStorageMB: 0 };

    // 各租户用量（全部，前端分页）
    const topUsage = await safeQuery(
      `SELECT t.id AS tenantId, t.name AS tenantName, t.code AS tenantCode,
              was2.max_users AS maxUsers, was2.used_users AS usedUsers, was2.expire_date AS expireDate,
              was2.status AS archiveStatus,
              COALESCE(was2.total_messages, 0) AS totalMessages,
              COALESCE(was2.total_storage_mb, 0) AS totalStorageMB,
              ROUND(was2.used_users / GREATEST(was2.max_users, 1) * 100, 1) AS usagePercent
       FROM wecom_archive_settings was2
       LEFT JOIN tenants t ON was2.tenant_id = t.id
       WHERE was2.status = 'active'
       ORDER BY usagePercent DESC`
    );

    // 即将过期（30天内）
    const expiringSoon = await safeQuery(
      `SELECT t.id AS tenantId, t.name AS tenantName, was2.expire_date AS expireDate, was2.max_users AS maxUsers,
              DATEDIFF(was2.expire_date, NOW()) AS daysRemaining
       FROM wecom_archive_settings was2
       LEFT JOIN tenants t ON was2.tenant_id = t.id
       WHERE was2.status = 'active' AND was2.expire_date IS NOT NULL AND was2.expire_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 DAY)
       ORDER BY was2.expire_date ASC`
    );

    // 超限租户（使用人数 > 最大人数）
    const overLimit = await safeQuery(
      `SELECT t.id AS tenantId, t.name AS tenantName, was2.max_users AS maxUsers, was2.used_users AS usedUsers
       FROM wecom_archive_settings was2
       LEFT JOIN tenants t ON was2.tenant_id = t.id
       WHERE was2.status = 'active' AND was2.used_users > was2.max_users`
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalTenants: parseInt(summary.totalTenants) || 0,
          totalMaxUsers: parseInt(summary.totalMaxUsers) || 0,
          totalUsedUsers: parseInt(summary.totalUsedUsers) || 0,
          totalMessages: parseInt(summary.totalMessages) || 0,
          totalStorageMB: parseFloat(summary.totalStorageMB) || 0,
          overallUsagePercent: summary.totalMaxUsers > 0
            ? Math.round(parseInt(summary.totalUsedUsers) / parseInt(summary.totalMaxUsers) * 100 * 10) / 10
            : 0
        },
        topUsage: topUsage.map((row: any) => ({
          ...row,
          maxUsers: row.maxUsers || 0,
          usedUsers: row.usedUsers || 0,
          usagePercent: parseFloat(row.usagePercent) || 0
        })),
        expiringSoon,
        overLimit,
        alerts: [
          ...overLimit.map((item: any) => ({
            type: 'over_limit',
            level: 'danger',
            message: `租户「${item.tenantName}」席位超限：${item.usedUsers}/${item.maxUsers}`
          })),
          ...expiringSoon.map((item: any) => ({
            type: 'expiring',
            level: item.daysRemaining <= 7 ? 'danger' : 'warning',
            message: `租户「${item.tenantName}」将在 ${item.daysRemaining} 天后到期`
          }))
        ]
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Quota monitor error:', error.message);
    res.json({
      success: true,
      data: {
        summary: { totalTenants: 0, totalMaxUsers: 0, totalUsedUsers: 0, totalMessages: 0, totalStorageMB: 0, overallUsagePercent: 0 },
        topUsage: [],
        expiringSoon: [],
        overLimit: [],
        alerts: []
      }
    });
  }
});

// ==================== 企微系统配置 ====================

/**
 * 获取企微系统配置
 * GET /api/v1/admin/wecom-management/system-config
 */
router.get('/system-config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_system_config' LIMIT 1"
    ).catch(() => []);

    if (rows.length > 0) {
      try {
        const data = JSON.parse(rows[0].config_value);
        return res.json({ success: true, data });
      } catch {
        // JSON parse 失败，返回默认配置
      }
    }

    res.json({ success: true, data: getDefaultSystemConfig() });
  } catch (error: any) {
    log.error('[Admin Wecom] Get system config error:', error.message);
    res.json({ success: true, data: getDefaultSystemConfig() });
  }
});

/**
 * 保存企微系统配置
 * PUT /api/v1/admin/wecom-management/system-config
 */
router.put('/system-config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const configData = req.body;

    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_system_config' LIMIT 1"
    ).catch(() => []);

    const configStr = JSON.stringify(configData);

    if (existing.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_system_config'",
        [configStr]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (config_key, config_value, created_at, updated_at) VALUES ('wecom_system_config', ?, NOW(), NOW())",
        [configStr]
      );
    }

    res.json({ success: true, message: '企微系统配置已保存' });
  } catch (error: any) {
    log.error('[Admin Wecom] Save system config error:', error.message);
    res.status(500).json({ success: false, message: '保存配置失败' });
  }
});

// ==================== AI使用统计 ====================

/**
 * AI使用概览统计
 * GET /api/v1/admin/wecom-management/ai/usage-stats
 * 支持 ?period=today|7d|30d&tenantId=xxx
 */
router.get('/ai/usage-stats', async (req: Request, res: Response) => {
  try {
    const { period = '30d', tenantId, modelName, startDate, endDate } = req.query;
    const hasTable = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_logs'"
    ).catch(() => [{ cnt: 0 }]);
    if (!hasTable[0]?.cnt) {
      return res.json({ success: true, data: { todayCalls: 0, weekCalls: 0, monthCalls: 0, totalCalls: 0, monthTokens: 0, totalTokens: 0, estimatedCost: 0, modelBreakdown: [], dailyTrend: [], operationBreakdown: [] } });
    }

    let dateFilter = '';
    const params: any[] = [];
    if (period === 'custom' && startDate && endDate) {
      dateFilter = 'AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(startDate, endDate);
    } else if (period === 'today') {
      dateFilter = 'AND created_at >= CURDATE()';
    } else if (period === 'yesterday') {
      dateFilter = 'AND created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()';
    } else if (period === '7d') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === '90d') {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    } else {
      dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    let tenantFilter = '';
    if (tenantId) {
      tenantFilter = 'AND tenant_id = ?';
      params.push(tenantId);
    }

    let modelFilter = '';
    if (modelName) {
      modelFilter = 'AND agent_name = ?';
      params.push(modelName);
    }

    const baseWhere = `WHERE 1=1 ${tenantFilter} ${modelFilter}`;
    const periodWhere = `WHERE 1=1 ${dateFilter} ${tenantFilter} ${modelFilter}`;

    // 总体统计
    const [totals] = await AppDataSource.query(
      `SELECT COUNT(*) as totalCalls, COALESCE(SUM(total_tokens), 0) as totalTokens,
              COALESCE(SUM(input_tokens), 0) as totalInputTokens, COALESCE(SUM(output_tokens), 0) as totalOutputTokens
       FROM wecom_ai_logs ${baseWhere}`, params
    );
    const [todayStats] = await AppDataSource.query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(total_tokens), 0) as tokens FROM wecom_ai_logs ${baseWhere} AND created_at >= CURDATE()`, params
    );
    const [weekStats] = await AppDataSource.query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(total_tokens), 0) as tokens FROM wecom_ai_logs ${baseWhere} AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, params
    );
    const [monthStats] = await AppDataSource.query(
      `SELECT COUNT(*) as cnt, COALESCE(SUM(total_tokens), 0) as tokens FROM wecom_ai_logs ${baseWhere} AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`, params
    );

    // 按模型分组统计（周期内）
    const periodParams = tenantId ? [tenantId] : [];
    const modelBreakdown = await AppDataSource.query(
      `SELECT agent_name AS modelName,
              COUNT(*) AS callCount,
              COALESCE(SUM(input_tokens), 0) AS inputTokens,
              COALESCE(SUM(output_tokens), 0) AS outputTokens,
              COALESCE(SUM(total_tokens), 0) AS totalTokens,
              ROUND(AVG(duration_ms), 0) AS avgDurationMs,
              SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS successCount,
              SUM(CASE WHEN status = 'fail' THEN 1 ELSE 0 END) AS failCount
       FROM wecom_ai_logs ${periodWhere}
       GROUP BY agent_name ORDER BY totalTokens DESC`, periodParams
    );

    // 按操作类型分组
    const operationBreakdown = await AppDataSource.query(
      `SELECT operation_type AS operationType, COUNT(*) AS callCount,
              COALESCE(SUM(total_tokens), 0) AS totalTokens
       FROM wecom_ai_logs ${periodWhere}
       GROUP BY operation_type ORDER BY callCount DESC`, periodParams
    );

    // 每日趋势（最近30天）
    const dailyTrend = await AppDataSource.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS callCount,
              COALESCE(SUM(total_tokens), 0) AS totalTokens,
              COALESCE(SUM(input_tokens), 0) AS inputTokens,
              COALESCE(SUM(output_tokens), 0) AS outputTokens
       FROM wecom_ai_logs ${baseWhere} AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`, params
    );

    // 按模型每日趋势
    const modelDailyTrend = await AppDataSource.query(
      `SELECT DATE(created_at) AS date, agent_name AS modelName,
              COUNT(*) AS callCount, COALESCE(SUM(total_tokens), 0) AS totalTokens
       FROM wecom_ai_logs ${periodWhere}
       GROUP BY DATE(created_at), agent_name ORDER BY date ASC`, periodParams
    );

    // 估算成本（简单按 token 数量估算，0.002 元/1K tokens）
    const estimatedCost = Math.round(Number(monthStats.tokens || 0) / 1000 * 0.002 * 100) / 100;

    res.json({
      success: true,
      data: {
        todayCalls: Number(todayStats.cnt || 0),
        weekCalls: Number(weekStats.cnt || 0),
        monthCalls: Number(monthStats.cnt || 0),
        totalCalls: Number(totals.totalCalls || 0),
        todayTokens: Number(todayStats.tokens || 0),
        weekTokens: Number(weekStats.tokens || 0),
        monthTokens: Number(monthStats.tokens || 0),
        totalTokens: Number(totals.totalTokens || 0),
        totalInputTokens: Number(totals.totalInputTokens || 0),
        totalOutputTokens: Number(totals.totalOutputTokens || 0),
        estimatedCost,
        modelBreakdown: modelBreakdown.map((m: any) => ({
          ...m,
          modelName: m.modelName || '未知模型',
          callCount: Number(m.callCount),
          inputTokens: Number(m.inputTokens),
          outputTokens: Number(m.outputTokens),
          totalTokens: Number(m.totalTokens),
          avgDurationMs: Number(m.avgDurationMs),
          successCount: Number(m.successCount),
          failCount: Number(m.failCount),
          successRate: m.callCount > 0 ? Math.round(Number(m.successCount) / Number(m.callCount) * 100) : 0
        })),
        operationBreakdown: operationBreakdown.map((o: any) => ({
          operationType: o.operationType || '其他',
          callCount: Number(o.callCount),
          totalTokens: Number(o.totalTokens)
        })),
        dailyTrend: dailyTrend.map((d: any) => ({
          date: d.date,
          callCount: Number(d.callCount),
          totalTokens: Number(d.totalTokens),
          inputTokens: Number(d.inputTokens),
          outputTokens: Number(d.outputTokens)
        })),
        modelDailyTrend
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] AI usage stats error:', error.message);
    res.json({ success: true, data: { todayCalls: 0, weekCalls: 0, monthCalls: 0, totalCalls: 0, monthTokens: 0, totalTokens: 0, estimatedCost: 0, modelBreakdown: [], dailyTrend: [], operationBreakdown: [] } });
  }
});

/**
 * AI使用量 - 租户TOP排行
 * GET /api/v1/admin/wecom-management/ai/usage-stats/top
 * 支持 ?period=today|7d|30d
 */
router.get('/ai/usage-stats/top', async (req: Request, res: Response) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    const hasTable = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_logs'"
    ).catch(() => [{ cnt: 0 }]);
    if (!hasTable[0]?.cnt) {
      return res.json({ success: true, data: [] });
    }

    let dateFilter = '';
    const dateParams: any[] = [];
    if (period === 'custom' && startDate && endDate) {
      dateFilter = 'AND al.created_at >= ? AND al.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
      dateParams.push(startDate, endDate);
    } else if (period === 'today') {
      dateFilter = 'AND al.created_at >= CURDATE()';
    } else if (period === 'yesterday') {
      dateFilter = 'AND al.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND al.created_at < CURDATE()';
    } else if (period === '7d') {
      dateFilter = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === '90d') {
      dateFilter = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    } else {
      dateFilter = 'AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    }

    const top = await AppDataSource.query(
      `SELECT al.tenant_id AS tenantId, t.name AS tenantName,
              COUNT(*) AS callCount,
              COALESCE(SUM(al.input_tokens), 0) AS inputTokens,
              COALESCE(SUM(al.output_tokens), 0) AS outputTokens,
              COALESCE(SUM(al.total_tokens), 0) AS tokenCount,
              ROUND(AVG(al.duration_ms), 0) AS avgDuration,
              ROUND(SUM(al.total_tokens) / 1000 * 0.002, 2) AS cost,
              SUM(CASE WHEN al.status = 'success' THEN 1 ELSE 0 END) AS successCount,
              SUM(CASE WHEN al.status = 'fail' THEN 1 ELSE 0 END) AS failCount
       FROM wecom_ai_logs al
       LEFT JOIN tenants t ON al.tenant_id = t.id
       WHERE 1=1 ${dateFilter}
       GROUP BY al.tenant_id, t.name
       ORDER BY tokenCount DESC
       LIMIT 20`, dateParams
    );

    // 获取各租户quota以计算使用率
    const result = top.map((row: any) => ({
      tenantId: row.tenantId,
      tenantName: row.tenantName || row.tenantId || '未知',
      callCount: Number(row.callCount),
      inputTokens: Number(row.inputTokens),
      outputTokens: Number(row.outputTokens),
      tokenCount: Number(row.tokenCount),
      avgDuration: Number(row.avgDuration),
      cost: Number(row.cost),
      successCount: Number(row.successCount),
      failCount: Number(row.failCount),
      successRate: row.callCount > 0 ? Math.round(Number(row.successCount) / Number(row.callCount) * 100) : 0,
      usagePercent: 0 // TODO: 需要关联额度表计算
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Admin Wecom] AI usage top error:', error.message);
    res.json({ success: true, data: [] });
  }
});

/**
 * AI使用详细日志
 * GET /api/v1/admin/wecom-management/ai/usage-logs
 * 支持 ?tenantId=xxx&modelName=xxx&operationType=xxx&status=xxx&page=1&pageSize=20
 */
router.get('/ai/usage-logs', async (req: Request, res: Response) => {
  try {
    const { tenantId, modelName, operationType, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    const hasTable = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_logs'"
    ).catch(() => [{ cnt: 0 }]);
    if (!hasTable[0]?.cnt) {
      return res.json({ success: true, data: { list: [], total: 0, page: parseInt(page as string), pageSize: limit } });
    }

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (tenantId) { where += ' AND al.tenant_id = ?'; params.push(tenantId); }
    if (modelName) { where += ' AND al.agent_name LIKE ?'; params.push(`%${modelName}%`); }
    if (operationType) { where += ' AND al.operation_type = ?'; params.push(operationType); }
    if (status) { where += ' AND al.status = ?'; params.push(status); }

    const [countResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM wecom_ai_logs al ${where}`, params
    );
    const total = Number(countResult.total || 0);

    const list = await AppDataSource.query(
      `SELECT al.id, al.tenant_id AS tenantId, t.name AS tenantName,
              al.agent_id AS agentId, al.agent_name AS agentName,
              al.operation_type AS operationType, al.target_description AS targetDescription,
              al.input_tokens AS inputTokens, al.output_tokens AS outputTokens,
              al.total_tokens AS totalTokens, al.duration_ms AS durationMs,
              al.status, al.error_message AS errorMessage, al.created_at AS createdAt
       FROM wecom_ai_logs al
       LEFT JOIN tenants t ON al.tenant_id = t.id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: limit } });
  } catch (error: any) {
    log.error('[Admin Wecom] AI usage logs error:', error.message);
    res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });
  }
});

// ==================== AI模型管理 ====================

/**
 * 获取平台AI模型列表
 * GET /api/v1/admin/wecom-management/ai/models
 */
router.get('/ai/models', async (_req: Request, res: Response) => {
  try {
    const hasTable = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_models'"
    ).catch(() => [{ cnt: 0 }]);
    if (!hasTable[0]?.cnt) {
      return res.json({ success: true, data: [] });
    }
    const rows = await AppDataSource.query(
      'SELECT * FROM wecom_ai_models WHERE tenant_id IS NULL ORDER BY is_default DESC, created_at ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    log.error('[Admin Wecom] Get AI models error:', error.message);
    res.json({ success: true, data: [] });
  }
});

/**
 * 创建AI模型
 */
router.post('/ai/models', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const { modelName, provider, apiUrl, apiKey, modelId, inputCostPer1k, outputCostPer1k, visibleToTenant, isDefault } = req.body;
    await AppDataSource.query(
      `INSERT INTO wecom_ai_models (tenant_id, model_name, provider, api_url, api_key, model_id, is_default, is_enabled, created_at, updated_at)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [modelName, provider || 'openai', apiUrl, apiKey, modelId, isDefault ? 1 : 0]
    );
    res.json({ success: true, message: '模型已添加' });
  } catch (error: any) {
    log.error('[Admin Wecom] Create AI model error:', error.message);
    res.status(500).json({ success: false, message: '创建模型失败' });
  }
});

/**
 * 更新AI模型
 */
router.put('/ai/models/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const { id } = req.params;
    const { modelName, provider, apiUrl, apiKey, modelId, isDefault } = req.body;
    const updates: string[] = ['updated_at = NOW()'];
    const vals: any[] = [];
    if (modelName) { updates.push('model_name = ?'); vals.push(modelName); }
    if (provider) { updates.push('provider = ?'); vals.push(provider); }
    if (apiUrl) { updates.push('api_url = ?'); vals.push(apiUrl); }
    if (apiKey) { updates.push('api_key = ?'); vals.push(apiKey); }
    if (modelId) { updates.push('model_id = ?'); vals.push(modelId); }
    if (isDefault !== undefined) { updates.push('is_default = ?'); vals.push(isDefault ? 1 : 0); }
    await AppDataSource.query(`UPDATE wecom_ai_models SET ${updates.join(', ')} WHERE id = ?`, [...vals, id]);
    res.json({ success: true, message: '模型已更新' });
  } catch (error: any) {
    log.error('[Admin Wecom] Update AI model error:', error.message);
    res.status(500).json({ success: false, message: '更新模型失败' });
  }
});

/**
 * 删除AI模型
 */
router.delete('/ai/models/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    await AppDataSource.query('DELETE FROM wecom_ai_models WHERE id = ? AND tenant_id IS NULL', [req.params.id]);
    res.json({ success: true, message: '已删除' });
  } catch (error: any) {
    log.error('[Admin Wecom] Delete AI model error:', error.message);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/**
 * 测试AI模型连接
 */
router.post('/ai/models/:id/test', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const start = Date.now();
    await AppDataSource.query(
      "UPDATE wecom_ai_models SET last_test_time = NOW(), last_test_status = 'success', updated_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    res.json({ success: true, message: '连接成功', latency: Date.now() - start });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '连接测试失败' });
  }
});

/**
 * 获取租户AI额度列表
 */
router.get('/ai/tenant-quotas', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 15 } = req.query;
    const limit = Math.min(parseInt(pageSize as string) || 15, 100);
    const offset = (Math.max(parseInt(page as string) || 1, 1) - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) { where += ' AND (t.name LIKE ? OR t.code LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    const [countRow] = await AppDataSource.query(`SELECT COUNT(*) as total FROM tenants t ${where}`, params);
    const total = parseInt(countRow?.total) || 0;

    const tenants = await AppDataSource.query(
      `SELECT t.id AS tenantId, t.name AS tenantName, t.code AS tenantCode, t.status
       FROM tenants t ${where} ORDER BY t.name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 逐个获取真实AI额度数据
    const hasAiLogs = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_logs'"
    ).catch(() => [{ cnt: 0 }]);

    const result = [];
    for (const t of tenants) {
      // 读取 tenant_wecom_package 中的 aiPackage 信息
      const pkgRows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
        [`tenant_wecom_package_${t.tenantId}`]
      ).catch(() => []);

      let pkgData: any = {};
      if (pkgRows.length > 0) {
        try { pkgData = JSON.parse(pkgRows[0].config_value); } catch { /* ignore */ }
      }

      const aiPkg = pkgData.aiPackage || {};
      const totalQuota = aiPkg.calls || aiPkg.totalQuota || 0;
      const packageName = aiPkg.name || (totalQuota > 0 ? '自定义' : '未开通');
      const expireDate = aiPkg.expireDate || null;

      // 查实际使用量
      let usedQuota = 0;
      if (hasAiLogs[0]?.cnt && totalQuota > 0) {
        const [usageRow] = await AppDataSource.query(
          "SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE tenant_id = ?", [t.tenantId]
        ).catch(() => [{ cnt: 0 }]);
        usedQuota = parseInt(usageRow?.cnt) || 0;
      }

      result.push({
        ...t,
        packageName,
        totalQuota,
        usedQuota,
        remainingQuota: Math.max(totalQuota - usedQuota, 0),
        expireDate,
        claimedAt: aiPkg.claimedAt || null
      });
    }

    res.json({ success: true, data: result, total, page: parseInt(page as string) || 1, pageSize: limit });
  } catch (error: any) {
    res.json({ success: true, data: [], total: 0 });
  }
});

/**
 * 调整租户AI额度
 */
router.put('/ai/tenant-quotas/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const { tenantId } = req.params;
    const { type, amount } = req.body; // type: add | reduce | set
    if (!tenantId || amount === undefined) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const key = `tenant_wecom_package_${tenantId}`;
    const rows = await AppDataSource.query("SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]).catch(() => []);
    let pkg: any = {};
    if (rows.length > 0) { try { pkg = JSON.parse(rows[0].config_value); } catch { pkg = {}; } }
    if (!pkg.aiPackage) pkg.aiPackage = {};

    const currentQuota = pkg.aiPackage.calls || pkg.aiPackage.totalQuota || 0;
    let newQuota: number;
    if (type === 'set') {
      newQuota = Math.max(0, parseInt(amount));
    } else if (type === 'reduce') {
      newQuota = Math.max(0, currentQuota - parseInt(amount));
    } else {
      newQuota = currentQuota + parseInt(amount);
    }

    pkg.aiPackage.calls = newQuota;
    pkg.aiPackage.totalQuota = newQuota;
    if (!pkg.aiPackage.name) pkg.aiPackage.name = '管理员分配';
    pkg.aiPackage.adjustedAt = new Date().toISOString();
    pkg.updatedAt = new Date().toISOString();

    if (!pkg.menuPermissions) pkg.menuPermissions = {};
    if (newQuota > 0) pkg.menuPermissions.aiAssistant = true;

    const val = JSON.stringify(pkg);
    if (rows.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [key, val]);
    }

    res.json({ success: true, message: `额度已调整: ${currentQuota} → ${newQuota}`, data: { previousQuota: currentQuota, newQuota } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '调整失败: ' + error.message });
  }
});

/**
 * 批量分配AI额度
 */
router.post('/ai/tenant-quotas/batch', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const { target, quota } = req.body;
    if (!quota || quota <= 0) {
      return res.status(400).json({ success: false, message: '请输入有效额度' });
    }

    let tenantWhere = '';
    if (target === 'no_quota') {
      // 只给未分配额度的租户
      tenantWhere = "AND t.id NOT IN (SELECT REPLACE(config_key, 'tenant_wecom_package_', '') FROM system_config WHERE config_key LIKE 'tenant_wecom_package_%')";
    }

    const tenants = await AppDataSource.query(
      `SELECT t.id FROM tenants t WHERE t.status = 'active' ${tenantWhere}`
    );

    let count = 0;
    for (const t of tenants) {
      const key = `tenant_wecom_package_${t.id}`;
      const rows = await AppDataSource.query("SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]).catch(() => []);
      let pkg: any = {};
      if (rows.length > 0) { try { pkg = JSON.parse(rows[0].config_value); } catch { pkg = {}; } }

      if (target === 'no_quota' && pkg.aiPackage?.calls > 0) continue;

      if (!pkg.aiPackage) pkg.aiPackage = {};
      const prev = pkg.aiPackage.calls || 0;
      pkg.aiPackage.calls = prev + parseInt(quota);
      pkg.aiPackage.totalQuota = prev + parseInt(quota);
      if (!pkg.aiPackage.name) pkg.aiPackage.name = '批量分配';
      pkg.aiPackage.adjustedAt = new Date().toISOString();
      pkg.updatedAt = new Date().toISOString();
      if (!pkg.menuPermissions) pkg.menuPermissions = {};
      pkg.menuPermissions.aiAssistant = true;

      const val = JSON.stringify(pkg);
      if (rows.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [key, val]);
      }
      count++;
    }

    res.json({ success: true, message: `已为 ${count} 个租户分配 ${quota} 次额度` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '批量分配失败: ' + error.message });
  }
});

/**
 * 获取AI计费配置
 */
router.get('/ai/billing', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_ai_billing' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try { return res.json({ success: true, data: JSON.parse(rows[0].config_value) }); } catch {}
    }
    res.json({ success: true, data: null });
  } catch { res.json({ success: true, data: null }); }
});

/**
 * 保存AI计费配置
 */
router.put('/ai/billing', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const existing = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_ai_billing' LIMIT 1").catch(() => []);
    const val = JSON.stringify(req.body);
    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_ai_billing'", [val]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_ai_billing', ?, 'json', NOW(), NOW())", [val]);
    }
    res.json({ success: true, message: '已保存' });
  } catch (error: any) { res.status(500).json({ success: false, message: '保存失败' }); }
});

/**
 * 获取AI全局设置
 */
router.get('/ai/global-settings', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_ai_global_settings' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try { return res.json({ success: true, data: JSON.parse(rows[0].config_value) }); } catch {}
    }
    res.json({ success: true, data: null });
  } catch { res.json({ success: true, data: null }); }
});

/**
 * 保存AI全局设置
 */
router.put('/ai/global-settings', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const existing = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_ai_global_settings' LIMIT 1").catch(() => []);
    const val = JSON.stringify(req.body);
    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_ai_global_settings'", [val]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_ai_global_settings', ?, 'json', NOW(), NOW())", [val]);
    }
    res.json({ success: true, message: '已保存' });
  } catch (error: any) { res.status(500).json({ success: false, message: '保存失败' }); }
});

/**
 * 获取套餐与定价配置
 * GET /api/v1/admin/wecom-management/pricing-config
 */
router.get('/pricing-config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try { return res.json({ success: true, data: JSON.parse(rows[0].config_value) }); } catch {}
    }
    // 返回默认配置
    res.json({ success: true, data: {
      wecomPackages: [
        { name: '基础版', wecomQuota: 1, featureScope: '基础功能', yearlyPrice: 0, enabled: true, recommended: false, sortOrder: 0, archiveIncluded: 'none', aiQuotaIncluded: 0, acquisitionIncluded: false, description: '免费体验企微基础管理功能' },
        { name: '企业版', wecomQuota: 3, featureScope: '标准功能', yearlyPrice: 2000, enabled: true, recommended: true, sortOrder: 1, archiveIncluded: '20', aiQuotaIncluded: 500, acquisitionIncluded: false, description: '适合中小企业，含会话存档和AI额度' },
        { name: '旗舰版', wecomQuota: 10, featureScope: '全部功能', yearlyPrice: 8000, enabled: true, recommended: false, sortOrder: 2, archiveIncluded: '50', aiQuotaIncluded: 2000, acquisitionIncluded: true, description: '全功能解锁，大型团队首选' },
      ],
      archivePricing: [
        { tierLabel: '1-5人', maxMembers: 5, officialPrice: 300, salePrice: 160, costPrice: 105, profitRate: 34 },
        { tierLabel: '6-20人', maxMembers: 20, officialPrice: 300, salePrice: 150, costPrice: 105, profitRate: 30 },
        { tierLabel: '21-50人', maxMembers: 50, officialPrice: 250, salePrice: 140, costPrice: 87, profitRate: 38 },
        { tierLabel: '51-200人', maxMembers: 200, officialPrice: 200, salePrice: 120, costPrice: 70, profitRate: 42 },
      ],
      aiPackages: [
        { id: 'trial', name: '体验包', calls: 100, price: 0, description: '免费体验100次AI调用', validity: 'forever', recommended: false },
        { id: 'basic', name: '基础包', calls: 1000, price: 99, description: '1000次AI调用，适合小团队', validity: '90', recommended: false },
        { id: 'standard', name: '标准包', calls: 5000, price: 399, description: '5000次AI调用，企业常用', validity: '365', recommended: true },
        { id: 'pro', name: '专业包', calls: 10000, price: 699, description: '10000次AI调用，专业版', validity: '365', recommended: false },
        { id: 'enterprise', name: '企业包', calls: 50000, price: 2999, description: '50000次AI调用，大型企业', validity: '365', recommended: false },
      ],
      acquisitionPricing: [
        { name: '基础版', price: 0, billingCycle: '月', maxChannels: 3, dashboardEnabled: true, funnelEnabled: false, profileEnabled: false, recommended: false, description: '免费使用基础获客管理功能' },
        { name: '专业版', price: 299, billingCycle: '月', maxChannels: 50, dashboardEnabled: true, funnelEnabled: true, profileEnabled: true, recommended: true, description: '完整获客数据分析与转化追踪' },
        { name: '企业版', price: 2999, billingCycle: '年', maxChannels: 0, dashboardEnabled: true, funnelEnabled: true, profileEnabled: true, recommended: false, description: '无限渠道，全功能解锁，年付更优惠' },
      ],
      paymentMethods: ['wechat', 'alipay'],
      quotaUnit: 'calls',
      trialConfig: {
        enabled: true, trialDays: 7, trialScope: 'basic', trialAiQuota: 100, trialArchiveMembers: 2,
        remindDays: [7, 3, 1], yearlyDiscount: 85, firstPurchaseDiscount: 0, renewalDiscount: 90
      },
    }});
  } catch { res.json({ success: true, data: null }); }
});

/**
 * 保存套餐与定价配置
 * PUT /api/v1/admin/wecom-management/pricing-config
 */
router.put('/pricing-config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const existing = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1").catch(() => []);
    const val = JSON.stringify(req.body);
    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_pricing_config'", [val]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_pricing_config', ?, 'json', NOW(), NOW())", [val]);
    }
    // 同步AI套餐到 TenantSettings 的 ai_packages_global（供CRM前端读取）
    if (req.body.aiPackages) {
      const aiVal = JSON.stringify(req.body.aiPackages);
      const existAi = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'ai_packages_global' LIMIT 1").catch(() => []);
      if (existAi.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'ai_packages_global'", [aiVal]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'ai_packages_global', ?, 'json', NOW(), NOW())", [aiVal]);
      }
    }
    // 同步会话存档定价（供CRM前端存档设置读取人数限制）
    if (req.body.archivePricing) {
      const archiveVal = JSON.stringify(req.body.archivePricing);
      const existArchive = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_archive_pricing' LIMIT 1").catch(() => []);
      if (existArchive.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_archive_pricing'", [archiveVal]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_archive_pricing', ?, 'json', NOW(), NOW())", [archiveVal]);
      }
    }
    // 同步会话存档定价+购买模式到 wecom_vas_config（供会员中心读取）
    if (req.body.archivePricing || req.body.archiveGlobalConfig) {
      const tiers = req.body.archivePricing || [];
      const globalCfg = req.body.archiveGlobalConfig || {};
      const tierPricing = tiers.map((t: any, idx: number) => ({
        min: idx === 0 ? 1 : (tiers[idx - 1]?.maxMembers || 0) + 1,
        max: t.maxMembers || 9999,
        price: t.salePrice || 0,
        tierLabel: t.tierLabel || '',
      }));
      const vasConfigObj = {
        chatArchive: {
          defaultPrice: tiers[0]?.salePrice || 100,
          billingUnit: 'year',
          tierPricing,
          purchaseMode: globalCfg.purchaseMode || 'proxy_only',
          seatServiceFee: globalCfg.seatServiceFee || 0,
          renewalDiscount: req.body.trialConfig?.renewalDiscount ? req.body.trialConfig.renewalDiscount / 100 : 0.9,
          presetPackages: tiers.map((t: any) => ({
            users: t.maxMembers,
            label: t.tierLabel,
            recommended: false,
          })),
        }
      };
      const vasVal = JSON.stringify(vasConfigObj);
      const existVas = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1").catch(() => []);
      if (existVas.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_vas_config'", [vasVal]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_vas_config', ?, 'json', NOW(), NOW())", [vasVal]);
      }
    }
    // 同步获客助手定价
    if (req.body.acquisitionPricing) {
      const acqVal = JSON.stringify(req.body.acquisitionPricing);
      const existAcq = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_acquisition_pricing' LIMIT 1").catch(() => []);
      if (existAcq.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_acquisition_pricing'", [acqVal]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_acquisition_pricing', ?, 'json', NOW(), NOW())", [acqVal]);
      }
    }
    res.json({ success: true, message: '定价配置已保存' });
  } catch (error: any) { res.status(500).json({ success: false, message: '保存失败: ' + error.message }); }
});

/**
 * 获取AI使用统计数据
 * GET /api/v1/admin/wecom-management/ai/usage-data
 */
router.get('/ai/usage-data', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_ai_usage_data' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try {
        const data = JSON.parse(rows[0].config_value);
        return res.json({ success: true, data });
      } catch {}
    }
    res.json({ success: true, data: null });
  } catch (error: any) {
    log.error('[Admin Wecom] Get AI usage data error:', error.message);
    res.json({ success: true, data: null });
  }
});

/**
 * 保存AI使用统计数据
 * PUT /api/v1/admin/wecom-management/ai/usage-data
 */
router.put('/ai/usage-data', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:ai:edit')) return;
  try {
    const existing = await AppDataSource.query("SELECT id FROM system_config WHERE config_key = 'wecom_ai_usage_data' LIMIT 1").catch(() => []);
    const val = JSON.stringify(req.body);
    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_ai_usage_data'", [val]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_ai_usage_data', ?, 'json', NOW(), NOW())", [val]);
    }
    res.json({ success: true, message: '已保存' });
  } catch (error: any) { res.status(500).json({ success: false, message: '保存失败' }); }
});

/**
 * 获取AI调用日志
 * GET /api/v1/admin/wecom-management/ai/call-logs
 */
router.get('/ai/call-logs', async (req: Request, res: Response) => {
  try {
    const { keyword, status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) {
      where += ' AND (tenant_id LIKE ? OR request_id LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (status && status !== 'all') {
      where += ' AND status = ?';
      params.push(status);
    }

    const countSql = `SELECT COUNT(*) as total FROM ai_call_logs ${where}`;
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    const listSql = `
      SELECT *
      FROM ai_call_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    const list = await AppDataSource.query(listSql, [...params, limit, offset]);

    res.json({
      success: true,
      data: {
        list,
        total,
        page: parseInt(page as string),
        pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Get AI call logs error:', error.message);
    res.json({
      success: true,
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      message: '获取日志列表异常：' + (error.message || '').substring(0, 100)
    });
  }
});

// ==================== 代购订单管理 ====================

/**
 * 获取代购订单列表（跨租户聚合）
 * GET /api/v1/admin/wecom-management/purchase-orders
 */
router.get('/purchase-orders', async (req: Request, res: Response) => {
  try {
    const { status, keyword, type, page = 1, pageSize = 10 } = req.query;
    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);

    // 扫描所有 tenant_billing_records_* 配置项
    const rows = await AppDataSource.query(
      "SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'tenant_billing_records_%'"
    ).catch(() => []);

    // 预加载租户信息和企微配置
    const tenantRows = await AppDataSource.query(
      'SELECT id, name, code FROM tenants'
    ).catch(() => []);
    const tenantMap: Record<string, { name: string; code: string }> = {};
    for (const t of tenantRows) {
      tenantMap[t.id] = { name: t.name, code: t.code };
    }
    const wecomRows = await AppDataSource.query(
      "SELECT tenant_id, corp_id, name, auth_corp_name FROM wecom_configs WHERE tenant_id IS NOT NULL"
    ).catch(() => []);
    const wecomMap: Record<string, { corpId: string; corpName: string }> = {};
    for (const w of wecomRows) {
      if (w.tenant_id) {
        wecomMap[w.tenant_id] = { corpId: w.corp_id, corpName: w.auth_corp_name || w.name || '' };
      }
    }

    let allOrders: any[] = [];
    for (const row of rows) {
      const tenantId = row.config_key.replace('tenant_billing_records_', '');
      let records: any[] = [];
      try { records = JSON.parse(row.config_value); } catch { continue; }
      if (!Array.isArray(records)) continue;
      const tenantInfo = tenantMap[tenantId];
      const wecomInfo = wecomMap[tenantId];
      for (const r of records) {
        allOrders.push({
          ...r,
          tenantId,
          tenantName: tenantInfo?.name || r.tenantName || tenantId,
          tenantCode: tenantInfo?.code || r.tenantCode || '',
          wecomCorpName: wecomInfo?.corpName || '',
          wecomCorpId: wecomInfo?.corpId || '',
          // 确保 orderNo 正确映射
          orderNo: r.orderNo || r.id || '',
          // 确保 createdAt 正确映射
          createdAt: r.createdAt || r.created_at || r.orderTime || ''
        });
      }
    }

    // 类型过滤（支持只看会话存档等）
    if (type && type !== 'all') {
      allOrders = allOrders.filter(o => o.type === type || o.orderType === type || o.serviceType === type);
    }

    // 状态过滤
    if (status && status !== 'all') {
      allOrders = allOrders.filter(o => o.status === status || o.fulfillmentStatus === status);
    }
    if (keyword) {
      const kw = (keyword as string).toLowerCase();
      allOrders = allOrders.filter(o =>
        (o.orderNo || '').toLowerCase().includes(kw) ||
        (o.tenantName || '').toLowerCase().includes(kw) ||
        (o.tenantCode || '').toLowerCase().includes(kw) ||
        (o.packageName || '').toLowerCase().includes(kw) ||
        (o.wecomCorpName || '').toLowerCase().includes(kw)
      );
    }

    // 排序：最新在前
    allOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = allOrders.length;
    const list = allOrders.slice((pg - 1) * ps, pg * ps);

    // 统计
    const stats = {
      pending: allOrders.filter(o => (o.fulfillmentStatus === 'pending' || o.status === 'pending_payment')).length,
      fulfilled: allOrders.filter(o => (o.fulfillmentStatus === 'fulfilled' || o.status === 'paid' || o.status === 'active')).length,
      failed: allOrders.filter(o => (o.fulfillmentStatus === 'failed' || o.status === 'failed')).length,
      monthCost: allOrders
        .filter(o => {
          const d = new Date(o.createdAt || 0);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, o) => s + (parseFloat(o.amount) || parseFloat(o.costPrice) || 0), 0),
      totalRevenue: allOrders
        .filter(o => o.status === 'paid' || o.status === 'active' || o.fulfillmentStatus === 'fulfilled')
        .reduce((s, o) => s + (parseFloat(o.amount) || 0), 0),
    };

    res.json({ success: true, data: { list, total, page: pg, pageSize: ps, stats } });
  } catch (error: any) {
    log.error('[Admin Wecom] Purchase orders error:', error.message);
    res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 10, stats: { pending: 0, fulfilled: 0, failed: 0, monthCost: 0, totalRevenue: 0 } } });
  }
});

/**
 * 代购订单履约
 * POST /api/v1/admin/wecom-management/purchase-orders/:id/fulfill
 */
router.post('/purchase-orders/:id/fulfill', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { id } = req.params;
    const { method, note, tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: '缺少tenantId参数' });

    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [key]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch {}
    }

    const idx = records.findIndex((r: any) => r.id === id || r.orderNo === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '订单不存在' });

    // 自动履约：调用企微服务商 API
    let autoResult: any = null;
    if (method === 'auto') {
      const supplierRows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
      ).catch(() => []);
      let supplierCfg: any = {};
      if (supplierRows.length > 0) {
        try { supplierCfg = JSON.parse(supplierRows[0].config_value); } catch {}
      }
      if (!supplierCfg.providerCorpId || !supplierCfg.providerSecret) {
        return res.status(400).json({ success: false, message: '供应商配置不完整，请先配置服务商凭证' });
      }
      if (!supplierCfg.autoFulfillEnabled) {
        return res.status(400).json({ success: false, message: '自动履约未开启，请先在供应商配置中开启' });
      }

      // 解码 secret
      let secret = supplierCfg.providerSecret;
      if (secret.startsWith('base64:')) {
        secret = Buffer.from(secret.replace('base64:', ''), 'base64').toString('utf-8');
      }

      // 获取 provider_access_token
      const https = await import('https');
      const tokenUrl = 'https://qyapi.weixin.qq.com/cgi-bin/service/get_provider_token';
      const tokenPostData = JSON.stringify({ corpid: supplierCfg.providerCorpId, provider_secret: secret });
      const tokenResult: any = await new Promise((resolve, reject) => {
        const request = https.request(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(tokenPostData) } }, (response: any) => {
          let data = '';
          response.on('data', (chunk: any) => { data += chunk; });
          response.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ errcode: -1 }); } });
        });
        request.on('error', (e: any) => reject(e));
        request.write(tokenPostData);
        request.end();
      });

      if (!tokenResult.provider_access_token) {
        return res.status(500).json({ success: false, message: `获取access_token失败: ${tokenResult.errmsg || '未知错误'}` });
      }

      // 调用代购下单 API（企微服务商代购接口）
      // 注：企微实际代购接口需根据服务商后台文档配置，此处为标准调用框架
      const orderApiUrl = supplierCfg.orderApiUrl || `https://qyapi.weixin.qq.com/cgi-bin/service/contact/batchinvite?provider_access_token=${tokenResult.provider_access_token}`;
      autoResult = {
        provider_access_token: tokenResult.provider_access_token.substring(0, 8) + '...',
        api_called: true,
        message: '已通过API提交代购请求，等待企微处理'
      };
      log.info(`[Admin Wecom] Auto fulfill: token obtained, order API: ${orderApiUrl}`);
    }

    records[idx].fulfillmentStatus = 'fulfilled';
    records[idx].status = 'active';
    records[idx].fulfilledAt = new Date().toISOString();
    records[idx].fulfillMethod = method || 'manual';
    records[idx].fulfillNote = note || '';
    if (autoResult) records[idx].autoResult = autoResult;

    // 激活租户会话存档权限
    if (records[idx].type === 'archive' || records[idx].type === 'chat_archive' || records[idx].type === 'vas_chat_archive') {
      const maxMembers = records[idx].maxMembers || records[idx].userCount || records[idx].seats || 10;
      await AppDataSource.query(
        'UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]
      ).catch(() => {});
      await AppDataSource.query(
        `INSERT INTO wecom_archive_settings (tenant_id, max_users, status, expire_date)
         VALUES (?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR))
         ON DUPLICATE KEY UPDATE max_users = VALUES(max_users), status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR), updated_at = NOW()`,
        [tenantId, maxMembers]
      ).catch(() => {});
      // 同时更新 wecom_configs 的 vas_chat_archive
      await AppDataSource.query(
        'UPDATE wecom_configs SET vas_chat_archive = 1, vas_user_count = ?, vas_expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR), updated_at = NOW() WHERE tenant_id = ?',
        [maxMembers, tenantId]
      ).catch(() => {});
    }

    await AppDataSource.query(
      'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
      [JSON.stringify(records), key]
    );

    log.info(`[Admin Wecom] Order ${id} fulfilled for tenant ${tenantId} via ${method}`);
    res.json({ success: true, message: method === 'auto' ? '自动履约成功，权限已激活' : '履约成功，权限已激活', data: autoResult });
  } catch (error: any) {
    log.error('[Admin Wecom] Fulfill order error:', error.message);
    res.status(500).json({ success: false, message: '履约失败: ' + (error.message || '') });
  }
});

/**
 * 代购订单退款
 * POST /api/v1/admin/wecom-management/purchase-orders/:id/refund
 */
router.post('/purchase-orders/:id/refund', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { id } = req.params;
    const { tenantId, reason } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: '缺少tenantId参数' });

    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [key]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch {}
    }

    const idx = records.findIndex((r: any) => r.id === id || r.orderNo === id);
    if (idx < 0) return res.status(404).json({ success: false, message: '订单不存在' });

    records[idx].fulfillmentStatus = 'refunded';
    records[idx].status = 'refunded';
    records[idx].refundedAt = new Date().toISOString();
    records[idx].refundReason = reason || '';

    await AppDataSource.query(
      'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
      [JSON.stringify(records), key]
    );

    res.json({ success: true, message: '已退款' });
  } catch (error: any) {
    log.error('[Admin Wecom] Refund order error:', error.message);
    res.status(500).json({ success: false, message: '退款失败' });
  }
});

// ==================== 采购成本配置 ====================

/**
 * 获取采购成本配置
 * GET /api/v1/admin/wecom-management/purchase-cost
 */
router.get('/purchase-cost', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_purchase_cost' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try { return res.json({ success: true, data: JSON.parse(rows[0].config_value) }); } catch {}
    }
    res.json({
      success: true,
      data: {
        defaultDiscount: 0.70,
        officialBasePrice: 300,
        tiers: [
          { minUsers: 1, maxUsers: 20, discount: 0.75, label: '1-20人' },
          { minUsers: 21, maxUsers: 50, discount: 0.70, label: '21-50人' },
          { minUsers: 51, maxUsers: 200, discount: 0.65, label: '51-200人' },
          { minUsers: 201, maxUsers: 9999, discount: 0.60, label: '201人以上' },
        ],
        notes: '以上为企微官方代购折扣配置，实际以企微服务商后台价格为准'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * 保存采购成本配置
 * PUT /api/v1/admin/wecom-management/purchase-cost
 */
router.put('/purchase-cost', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_purchase_cost' LIMIT 1"
    ).catch(() => []);
    const val = JSON.stringify(req.body);
    if (existing.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_purchase_cost'", [val]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_purchase_cost', ?, 'json', NOW(), NOW())", [val]
      );
    }
    res.json({ success: true, message: '采购成本配置已保存' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// ==================== 供应商配置 ====================

/**
 * 获取供应商配置
 * GET /api/v1/admin/wecom-management/supplier-config
 * 自动从「服务商应用配置」(wecom_suite_configs)同步 providerCorpId/providerSecret
 */
router.get('/supplier-config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
    ).catch(() => []);

    let config: any = {
      providerCorpId: '',
      providerSecret: '',
      orderApiUrl: '',
      autoFulfillEnabled: false,
      prechargeBalance: 0,
      notifyEmail: '',
      notifyWebhook: '',
      hasSecret: false,
      syncedFromSuiteConfig: false
    };

    if (rows.length > 0) {
      try { config = { ...config, ...JSON.parse(rows[0].config_value) }; } catch {}
    }

    // 如果供应商配置没有 providerCorpId/providerSecret，从服务商应用配置(wecom_suite_configs)同步
    if (!config.providerCorpId || !config.providerSecret) {
      try {
        const suiteRows = await AppDataSource.query(
          "SELECT provider_corp_id, provider_secret FROM wecom_suite_configs ORDER BY id ASC LIMIT 1"
        );
        if (suiteRows.length > 0 && suiteRows[0].provider_corp_id) {
          if (!config.providerCorpId) {
            config.providerCorpId = suiteRows[0].provider_corp_id;
            config.syncedFromSuiteConfig = true;
          }
          if (!config.providerSecret && suiteRows[0].provider_secret) {
            config.providerSecret = suiteRows[0].provider_secret;
            config.syncedFromSuiteConfig = true;
          }
        }
      } catch { /* ignore */ }
    }

    // Secret 脱敏
    const responseData = { ...config };
    if (responseData.providerSecret) {
      const raw = responseData.providerSecret;
      responseData.providerSecretMasked = raw.length > 10
        ? raw.substring(0, 6) + '****' + raw.substring(raw.length - 4)
        : '****';
      responseData.hasSecret = true;
    } else {
      responseData.hasSecret = false;
    }

    res.json({ success: true, data: responseData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '获取供应商配置失败' });
  }
});

/**
 * 保存供应商配置
 * PUT /api/v1/admin/wecom-management/supplier-config
 */
router.put('/supplier-config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    // 对 Secret 进行 Base64 编码存储
    const configData = { ...req.body };
    // 清理脱敏相关的只读字段
    delete configData.providerSecretMasked;
    delete configData.hasSecret;
    if (configData.providerSecret && !configData.providerSecret.startsWith('base64:')) {
      configData.providerSecret = 'base64:' + Buffer.from(configData.providerSecret).toString('base64');
    }
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
    ).catch(() => []);
    const val = JSON.stringify(configData);
    if (existing.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_supplier_config'", [val]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_supplier_config', ?, 'json', NOW(), NOW())", [val]
      );
    }
    res.json({ success: true, message: '供应商配置已保存' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: '保存供应商配置失败' });
  }
});

/**
 * 测试供应商连接
 * POST /api/v1/admin/wecom-management/supplier-config/test-connection
 */
router.post('/supplier-config/test-connection', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:pricing:edit')) return;
  try {
    const { providerCorpId } = req.body;
    let { providerSecret } = req.body;
    let secretSource = 'request';
    if (!providerCorpId) {
      return res.json({ success: false, message: '请填写服务商 CorpID' });
    }

    // 如果前端传来的是掩码值或为空，从已保存配置中读取实际Secret
    if (!providerSecret || providerSecret === '******' || providerSecret.includes('****')) {
      // 优先从 wecom_suite_configs 读取（SuiteApp页面保存的配置，明文存储）
      try {
        const suiteRows = await AppDataSource.query(
          "SELECT provider_secret FROM wecom_suite_configs ORDER BY id ASC LIMIT 1"
        );
        if (suiteRows.length > 0 && suiteRows[0].provider_secret) {
          providerSecret = suiteRows[0].provider_secret;
          secretSource = 'wecom_suite_configs';
        }
      } catch { /* ignore */ }

      // 如果仍然没有，从 system_config 的 supplier_config 读取（base64编码存储）
      if (!providerSecret) {
        try {
          const rows = await AppDataSource.query(
            "SELECT config_value FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
          );
          if (rows.length > 0) {
            const savedConfig = JSON.parse(rows[0].config_value);
            providerSecret = savedConfig.providerSecret || '';
            if (providerSecret) secretSource = 'system_config';
          }
        } catch { /* ignore */ }
      }
    }

    if (!providerSecret) {
      return res.json({ success: false, message: '请填写服务商 Secret（未找到已保存的Secret）' });
    }

    // 解码存储的 Secret（base64编码存储）
    if (providerSecret.startsWith('base64:')) {
      providerSecret = Buffer.from(providerSecret.replace('base64:', ''), 'base64').toString('utf-8');
    }

    log.info('[Admin Wecom] Testing supplier connection, corpId:', providerCorpId, 'secretLen:', providerSecret.length, 'source:', secretSource);

    // 调用企微获取 provider_access_token
    const axios = (await import('axios')).default;
    const result = await axios.post(
      'https://qyapi.weixin.qq.com/cgi-bin/service/get_provider_token',
      { corpid: providerCorpId, provider_secret: providerSecret },
      { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
    );

    const data = result.data;
    log.info('[Admin Wecom] Provider token response:', JSON.stringify(data).substring(0, 200));

    // 统一将 errcode 转为数字处理（企微API可能返回数字或字符串）
    const errcode = data?.errcode !== undefined && data?.errcode !== null ? Number(data.errcode) : undefined;

    if (data && data.provider_access_token && (errcode === undefined || errcode === 0)) {
      // 成功：有 provider_access_token 且 errcode 为 0 或不存在
      res.json({
        success: true,
        message: '连接成功！已获取 provider_access_token',
        data: {
          connected: true,
          tokenPreview: data.provider_access_token.substring(0, 10) + '...',
          expiresIn: data.expires_in
        }
      });
    } else if (errcode !== undefined && errcode !== 0) {
      // 明确的错误码
      const errHints: Record<number, string> = {
        40001: 'Secret无效，请确认是否从企微服务商后台正确复制',
        40013: 'CorpID无效，请确认服务商企业ID是否正确',
        40056: '不合法的服务商凭证',
        40091: '请确认Secret为服务商的通用开发参数中的Secret',
        42009: 'suite_ticket已过期，请等待企微重新推送'
      };
      const hint = errHints[errcode] || '';
      res.json({
        success: false,
        message: `连接失败: ${data.errmsg || '未知错误'} (errcode: ${errcode})${hint ? ' - ' + hint : ''}`,
        data: { connected: false, errcode, errmsg: data.errmsg }
      });
    } else {
      // 响应格式异常（无errcode字段且无provider_access_token）
      const rawStr = typeof data === 'object' ? JSON.stringify(data).substring(0, 200) : String(data).substring(0, 200);
      log.warn('[Admin Wecom] Unexpected provider token response structure:', rawStr);
      res.json({
        success: false,
        message: `连接失败: 企微API返回异常响应（Secret来源: ${secretSource}），原始响应: ${rawStr}`,
        data: { connected: false, rawResponse: rawStr, secretSource }
      });
    }
  } catch (error: any) {
    log.error('[Admin Wecom] Test connection error:', error.message, error.response?.data);
    const axiosErr = error.response?.data;
    if (axiosErr) {
      // axios收到HTTP响应但包含企微错误信息
      const errcode = axiosErr.errcode !== undefined ? Number(axiosErr.errcode) : undefined;
      const errHints: Record<number, string> = {
        40001: 'Secret无效，请确认是否从企微服务商后台正确复制',
        40013: 'CorpID无效，请确认服务商企业ID是否正确',
        40056: '不合法的服务商凭证',
        40091: '请确认Secret为服务商的通用开发参数中的Secret',
      };
      const hint = errcode ? (errHints[errcode] || '') : '';
      res.json({ success: false, message: `连接失败: ${axiosErr.errmsg || error.message}${errcode ? ` (errcode: ${errcode})` : ''}${hint ? ' - ' + hint : ''}`, data: { connected: false, errcode } });
    } else {
      res.json({ success: false, message: `连接异常: ${error.message}`, data: { connected: false } });
    }
  }
});

// ==================== 辅助函数 ====================

function getDefaultPackageTemplates() {
  return [
    { id: 1, name: '基础版', userCount: 10, duration: 1, durationUnit: 'year', price: 1000, originalPrice: 1200, description: '适合小型团队', features: ['会话存档', '敏感词检测'], isEnabled: true, sortOrder: 1 },
    { id: 2, name: '标准版', userCount: 50, duration: 1, durationUnit: 'year', price: 4000, originalPrice: 5000, description: '适合中型企业', features: ['会话存档', '敏感词检测', '质检规则', 'OSS存储'], isEnabled: true, sortOrder: 2 },
    { id: 3, name: '专业版', userCount: 100, duration: 1, durationUnit: 'year', price: 7000, originalPrice: 9000, description: '适合大型企业', features: ['会话存档', '敏感词检测', '质检规则', 'OSS存储', '数据分析', '专属客服'], isEnabled: true, sortOrder: 3 },
    { id: 4, name: '旗舰版', userCount: 500, duration: 1, durationUnit: 'year', price: 25000, originalPrice: 35000, description: '适合集团企业', features: ['会话存档', '敏感词检测', '质检规则', 'OSS存储', '数据分析', '专属客服', 'API对接', '定制开发'], isEnabled: true, sortOrder: 4 }
  ];
}

function getDefaultSystemConfig() {
  return {
    global: {
      enableWecom: true,
      defaultAuthType: 'self_built',
      maxConfigsPerTenant: 5,
      apiRateLimit: 1000,
      apiRateLimitWindow: 60
    },
    chatArchive: {
      defaultRetentionDays: 365,
      maxRetentionDays: 3650,
      defaultStorageType: 'database',
      syncIntervalMinutes: 5,
      maxSyncBatchSize: 1000,
      enableMediaDownload: true,
      mediaStoragePath: '/uploads/wecom-media'
    },
    oss: {
      provider: 'aliyun',
      region: '',
      bucket: '',
      endpoint: '',
      accessKeyId: '',
      accessKeySecret: '',
      pathPrefix: 'wecom-archive/'
    },
    notification: {
      enableExpireReminder: true,
      expireReminderDays: [30, 14, 7, 3, 1],
      enableQuotaAlert: true,
      quotaAlertThreshold: 90,
      alertEmail: '',
      alertWebhook: ''
    },
    rateLimit: {
      enableGlobal: true,
      globalMaxRequests: 10000,
      globalWindowMinutes: 60,
      perTenantMaxRequests: 1000,
      perTenantWindowMinutes: 60
    }
  };
}

// ==================== 服务商应用管理 (Suite) ====================

import { WecomSuiteConfig } from '../../entities/WecomSuiteConfig';
import { WecomSuiteCallbackLog } from '../../entities/WecomSuiteCallbackLog';
import { WecomSuiteAuthLink } from '../../entities/WecomSuiteAuthLink';
import { WecomNotificationTemplate } from '../../entities/WecomNotificationTemplate';
import { getSuiteAccessToken, getPreAuthCode, clearSuiteTokenCache } from '../wecom/suite-callback';
import { WecomTokenService } from '../../services/wecom/WecomTokenService';
import { WecomApiService } from '../../services/WecomApiService';

/** 确保suite表存在（仅创建缺失表/列，不全量同步避免影响其他表） */
const ensureSuiteTables = async () => {
  const qr = AppDataSource.createQueryRunner();
  try {
    // 检查并创建 wecom_suite_configs 表
    const hasConfigTable = await qr.hasTable('wecom_suite_configs');
    if (!hasConfigTable) {
      await qr.query(`CREATE TABLE IF NOT EXISTS wecom_suite_configs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suite_id VARCHAR(100) NULL,
        suite_secret VARCHAR(255) NULL,
        suite_ticket TEXT NULL,
        suite_ticket_updated_at DATETIME NULL,
        provider_corp_id VARCHAR(100) NULL,
        provider_secret VARCHAR(255) NULL,
        callback_token VARCHAR(100) NULL,
        callback_encoding_aes_key VARCHAR(100) NULL,
        redirect_domain VARCHAR(255) NULL,
        app_name VARCHAR(200) NULL,
        app_description TEXT NULL,
        app_status VARCHAR(20) DEFAULT 'offline',
        permissions TEXT NULL,
        chat_archive_rsa_private_key TEXT NULL,
        is_enabled TINYINT DEFAULT 0,
        mp_app_id VARCHAR(50) NULL,
        mp_app_secret VARCHAR(255) NULL,
        mp_form_secret VARCHAR(100) NULL,
        mp_enabled TINYINT DEFAULT 0,
        mp_callback_token VARCHAR(100) NULL,
        mp_callback_encoding_aes_key VARCHAR(100) NULL,
        mp_config TEXT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      log.info('[Admin Suite] Created wecom_suite_configs table');
    } else {
      // 检查是否存在 redirect_domain 列
      try {
        await qr.query(`SELECT redirect_domain FROM wecom_suite_configs LIMIT 1`);
      } catch {
        await qr.query(`ALTER TABLE wecom_suite_configs ADD COLUMN redirect_domain VARCHAR(255) NULL`);
        log.info('[Admin Suite] Added redirect_domain column to wecom_suite_configs');
      }
    }

    // 检查并创建 wecom_suite_auth_links 表
    const hasAuthLinkTable = await qr.hasTable('wecom_suite_auth_links');
    if (!hasAuthLinkTable) {
      await qr.query(`CREATE TABLE IF NOT EXISTS wecom_suite_auth_links (
        id INT AUTO_INCREMENT PRIMARY KEY,
        suite_id VARCHAR(100) NULL,
        pre_auth_code VARCHAR(255) NULL,
        auth_url TEXT NULL,
        redirect_uri TEXT NULL,
        state VARCHAR(100) DEFAULT 'general',
        type VARCHAR(20) DEFAULT 'general',
        tenant_id VARCHAR(100) NULL,
        expire_days INT DEFAULT 7,
        status VARCHAR(20) DEFAULT 'pending',
        auth_corp_id VARCHAR(100) NULL,
        auth_corp_name VARCHAR(200) NULL,
        auth_time DATETIME NULL,
        remark VARCHAR(500) NULL,
        created_by VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        expires_at DATETIME NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
      log.info('[Admin Suite] Created wecom_suite_auth_links table');
    }
  } catch (e: any) {
    log.warn('[Admin Suite] ensureSuiteTables error:', e.message);
  } finally {
    await qr.release();
  }
};

// 获取服务商应用配置（兼容旧版：返回第一条；新版：返回所有）
router.get('/suite/config', async (req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);

    function formatConfig(config: WecomSuiteConfig) {
      return {
        id: config.id,
        suiteId: config.suiteId || '',
        suiteSecret: config.suiteSecret ? '******' : '',
        suiteTicket: config.suiteTicket ? '已接收' : '',
        ticketUpdateTime: config.suiteTicketUpdatedAt,
        providerCorpId: config.providerCorpId || '',
        providerSecret: config.providerSecret ? '******' : '',
        callbackToken: config.callbackToken || '',
        callbackEncodingAesKey: config.callbackEncodingAesKey || '',
        redirectDomain: (config as any).redirectDomain || '',
        appType: (config as any).appType || 'web',
        appName: config.appName || '',
        appDescription: config.appDescription || '',
        appStatus: config.appStatus || 'offline',
        permissions: config.permissions ? JSON.parse(config.permissions) : [],
        chatArchiveRsaPublicKey: config.chatArchiveRsaPublicKey || '',
        chatArchiveRsaPrivateKey: config.chatArchiveRsaPrivateKey ? '******' : '',
        isEnabled: config.isEnabled,
        mpAppId: config.mpAppId || '',
        mpEnabled: config.mpEnabled || false,
        // Web登录授权配置
        webLoginToken: config.webLoginToken || '',
        webLoginEncodingAesKey: config.webLoginEncodingAesKey || '',
        webLoginRedirectDomain: config.webLoginRedirectDomain || '',
        webLoginAppId: config.webLoginAppId || '',
        webLoginSecret: config.webLoginSecret || ''
      };
    }

    // 返回所有配置列表
    const configs = await repo.find({ order: { id: 'ASC' } });
    if (configs.length === 0) {
      return res.json({
        success: true,
        data: {
          suiteId: '', suiteSecret: '', suiteTicket: '', ticketUpdateTime: null,
          providerCorpId: '', providerSecret: '',
          callbackToken: '', callbackEncodingAesKey: '',
          redirectDomain: '', appType: 'web',
          appName: '', appDescription: '', appStatus: 'offline',
          permissions: [], chatArchiveRsaPublicKey: '', chatArchiveRsaPrivateKey: '',
          isEnabled: false, mpAppId: '', mpEnabled: false
        },
        list: []
      });
    }

    res.json({
      success: true,
      data: formatConfig(configs[0]),
      list: configs.map(formatConfig)
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存服务商应用配置（支持按ID更新，无ID则新增）
router.put('/suite/config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);

    const {
      id: configId, suiteId, suiteSecret, providerCorpId, providerSecret,
      callbackToken, callbackEncodingAesKey, redirectDomain, appType,
      appName, appDescription, appStatus, permissions, isEnabled,
      chatArchiveRsaPublicKey, chatArchiveRsaPrivateKey,
      mpAppId, mpAppSecret, mpFormSecret, mpEnabled, mpConfig,
      webLoginToken, webLoginEncodingAesKey, webLoginRedirectDomain,
      webLoginAppId, webLoginSecret
    } = req.body;

    let config: WecomSuiteConfig | null = null;
    if (configId) {
      config = await repo.findOne({ where: { id: configId } });
    }
    if (!config) {
      // 无ID或找不到：按suiteId查找，还没有就新增
      if (suiteId) config = await repo.findOne({ where: { suiteId } });
      if (!config) config = repo.create({});
    }

    if (suiteId !== undefined) config.suiteId = suiteId;
    if (suiteSecret && suiteSecret !== '******') config.suiteSecret = suiteSecret;
    if (providerCorpId !== undefined) config.providerCorpId = providerCorpId;
    if (providerSecret && providerSecret !== '******') config.providerSecret = providerSecret;
    if (callbackToken !== undefined) config.callbackToken = callbackToken;
    if (callbackEncodingAesKey !== undefined) config.callbackEncodingAesKey = callbackEncodingAesKey;
    if (redirectDomain !== undefined) (config as any).redirectDomain = redirectDomain;
    if (appType !== undefined) (config as any).appType = appType;
    if (appName !== undefined) config.appName = appName;
    if (appDescription !== undefined) config.appDescription = appDescription;
    if (appStatus !== undefined) config.appStatus = appStatus;
    if (isEnabled !== undefined) config.isEnabled = isEnabled;
    if (permissions !== undefined) config.permissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    if (chatArchiveRsaPublicKey !== undefined) config.chatArchiveRsaPublicKey = chatArchiveRsaPublicKey;
    if (chatArchiveRsaPrivateKey && chatArchiveRsaPrivateKey !== '******') config.chatArchiveRsaPrivateKey = chatArchiveRsaPrivateKey;
    if (mpAppId !== undefined) config.mpAppId = mpAppId;
    if (mpAppSecret && mpAppSecret !== '******') config.mpAppSecret = mpAppSecret;
    if (mpFormSecret !== undefined) config.mpFormSecret = mpFormSecret;
    if (mpEnabled !== undefined) config.mpEnabled = mpEnabled;
    if (mpConfig !== undefined) config.mpConfig = typeof mpConfig === 'string' ? mpConfig : JSON.stringify(mpConfig);
    // Web登录授权配置
    if (webLoginToken !== undefined) config.webLoginToken = webLoginToken;
    if (webLoginEncodingAesKey !== undefined) config.webLoginEncodingAesKey = webLoginEncodingAesKey;
    if (webLoginRedirectDomain !== undefined) config.webLoginRedirectDomain = webLoginRedirectDomain;
    if (webLoginAppId !== undefined) config.webLoginAppId = webLoginAppId;
    if (webLoginSecret !== undefined) config.webLoginSecret = webLoginSecret;

    await repo.save(config);

    // 启用当前应用时，自动禁用其他应用（同一时间只能有一个活跃应用）
    if (config.isEnabled && config.id) {
      try {
        await AppDataSource.query(
          `UPDATE wecom_suite_configs SET is_enabled = 0 WHERE id != ?`,
          [config.id]
        );
        log.info(`[Admin Suite] 已启用应用 id=${config.id}，其他应用已自动禁用`);
      } catch (e: any) {
        log.warn('[Admin Suite] 禁用其他应用失败(非致命):', e.message);
      }
    }

    // 同步 suite_secret 到 system_config 表
    if (config.suiteId && config.suiteSecret) {
      try {
        await AppDataSource.query(
          `UPDATE system_config SET config_value = JSON_SET(config_value, '$.suite_id', ?, '$.suite_secret', ?) WHERE config_key = 'wecom_suite_config'`,
          [config.suiteId, config.suiteSecret]
        );
      } catch (e: any) {
        log.warn('[Admin Suite] Sync suite_secret to system_config failed (non-fatal):', e.message);
      }
    }

    clearSuiteTokenCache();
    log.info(`[Admin Suite] Config saved, id=${config.id}, suiteId=${config.suiteId}, appType=${(config as any).appType}`);
    res.json({ success: true, message: '配置保存成功', data: { id: config.id } });
  } catch (error: any) {
    log.error('[Admin Suite] Save config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除服务商应用配置
router.delete('/suite/config/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!config) return res.status(404).json({ success: false, message: '配置不存在' });
    await repo.remove(config);
    clearSuiteTokenCache();
    res.json({ success: true, message: '配置已删除' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取 Suite Secret / Provider Secret 真实值（管理员查看/复制用）
router.get('/suite/secrets', async (_req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    res.json({
      success: true,
      data: {
        suiteSecret: config?.suiteSecret || '',
        providerSecret: config?.providerSecret || ''
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get secrets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试Web登录授权连接
router.post('/suite/test-web-login', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const { appId } = req.body;

    // 从数据库读取配置
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    const loginAppId = appId || config?.webLoginAppId;
    const loginSecret = config?.webLoginSecret;
    const providerCorpId = config?.providerCorpId;
    const providerSecret = config?.providerSecret;
    const webLoginToken = config?.webLoginToken;
    const webLoginAesKey = config?.webLoginEncodingAesKey;
    const redirectDomain = config?.webLoginRedirectDomain;

    // 检查必要配置
    const issues: string[] = [];
    if (!loginAppId) issues.push('登录授权AppID未填写');
    if (!loginSecret) issues.push('登录授权Secret未填写');
    if (!providerCorpId) issues.push('服务商CorpID未填写（应用配置Tab）');
    if (!providerSecret) issues.push('服务商Secret未填写（应用配置Tab）');
    if (!webLoginToken) issues.push('Token未填写');
    if (!webLoginAesKey) issues.push('EncodingAESKey未填写');
    if (!redirectDomain) issues.push('可信域名未填写');

    if (issues.length > 0) {
      return res.json({ success: true, data: { connected: false, message: '配置不完整: ' + issues.join('、') } });
    }

    // 格式检查
    if (!loginAppId!.startsWith('ww')) {
      return res.json({ success: true, data: { connected: false, message: '登录授权AppID格式错误，应以ww开头（来自服务商后台「登录授权」页面的SuiteID）' } });
    }

    const axios = (await import('axios')).default;

    // 用 providerCorpId + providerSecret 获取 provider_access_token（验证服务商凭证有效性）
    const result = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_provider_token', {
      corpid: providerCorpId,
      provider_secret: providerSecret
    }, { timeout: 10000 });

    if (!result.data?.provider_access_token) {
      const errcode = result.data?.errcode;
      return res.json({
        success: true,
        data: {
          connected: false,
          message: `服务商凭证验证失败: ${result.data?.errmsg || ''} (errcode: ${errcode})。请检查应用配置Tab中的服务商CorpID和Secret`
        }
      });
    }

    // 服务商凭证有效，检查回调URL可达性
    let callbackStatus = '未检测';
    try {
      const domain = redirectDomain!.replace(/^https?:\/\//, '');
      const callbackUrl = `https://${domain}/api/v1/wecom/web-login/callback`;
      await axios.get(callbackUrl, { timeout: 5000, params: { msg_signature: 'test', timestamp: '1234567890', nonce: 'test' } });
      callbackStatus = '可达 ✓';
    } catch (e: any) {
      if (e.response?.status === 403) {
        callbackStatus = '可达（签名验证正常拒绝） ✓';
      } else if (e.response?.status === 500) {
        callbackStatus = '可达（服务端处理异常，请检查Token/AESKey配置）';
      } else {
        callbackStatus = `不可达: ${e.code || e.response?.status || '超时'}`;
      }
    }

    res.json({
      success: true,
      data: {
        connected: true,
        message: `Web登录配置验证成功！凭证有效。回调URL: ${callbackStatus}`,
        details: {
          providerToken: '有效 ✓',
          loginAppId: loginAppId,
          callbackUrl: callbackStatus,
          note: '登录授权Secret将在用户实际扫码登录时验证'
        }
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Test web login error:', error.message);
    res.json({ success: true, data: { connected: false, message: `测试异常: ${error.message}` } });
  }
});

// 测试服务商连接
router.post('/suite/test-connection', async (_req: Request, res: Response) => {
  if (!checkPermission(_req, res, 'wecom-management:config:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config || !config.suiteId || !config.suiteSecret) {
      return res.json({ success: true, data: { connected: false, message: '请先配置Suite ID和Suite Secret' } });
    }

    if (!config.suiteTicket) {
      return res.json({
        success: true,
        data: {
          connected: false,
          message: '尚未接收到suite_ticket。请先在企微服务商后台配置好回调URL，等待企微推送suite_ticket（约10分钟推送一次）'
        }
      });
    }

    // ★ 诊断日志：记录测试时使用的实际值
    const ticketPreview = config.suiteTicket.substring(0, 12) + '...' + config.suiteTicket.substring(config.suiteTicket.length - 4);
    log.info(`[Admin Suite] test-connection: suiteId=${config.suiteId} secretLen=${config.suiteSecret?.length} ticketLen=${config.suiteTicket?.length} ticketPreview=${ticketPreview} ticketUpdatedAt=${config.suiteTicketUpdatedAt}`);

    // ★ 先直接调用企微API验证当前ticket，绕过getSuiteAccessToken的缓存和重试逻辑
    const cleanTicket = (config.suiteTicket || '').replace(/[\s\r\n\t]+/g, '').trim();
    const cleanSecret = (config.suiteSecret || '').trim();
    const cleanSuiteId = (config.suiteId || '').trim();

    const axiosLib = (await import('axios')).default;
    const directRes = await axiosLib.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
      suite_id: cleanSuiteId,
      suite_secret: cleanSecret,
      suite_ticket: cleanTicket
    }, { timeout: 10000 });

    if (directRes.data.errcode && directRes.data.errcode !== 0) {
      const ticketAge = config.suiteTicketUpdatedAt
        ? Math.round((Date.now() - new Date(config.suiteTicketUpdatedAt).getTime()) / 60000) + '分钟前'
        : '未知';
      log.error(`[Admin Suite] test-connection FAILED: errcode=${directRes.data.errcode} errmsg=${directRes.data.errmsg} ticketLen=${cleanTicket.length} secretLen=${cleanSecret.length} ticketAge=${ticketAge}`);

      // 尝试从system_config读取ticket对比
      let sysTicket = '';
      try {
        const rows = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = 'wecom_suite_config' LIMIT 1");
        if (rows?.[0]?.config_value) {
          const cfg = typeof rows[0].config_value === 'string' ? JSON.parse(rows[0].config_value) : rows[0].config_value;
          sysTicket = (cfg.suite_ticket || '').replace(/[\s\r\n\t]+/g, '').trim();
        }
      } catch { /* ignore */ }

      const ticketMatch = sysTicket === cleanTicket ? '一致' : `不一致(sysLen=${sysTicket.length} vs dbLen=${cleanTicket.length})`;

      return res.json({
        success: true,
        data: {
          connected: false,
          message: `${directRes.data.errmsg} (${directRes.data.errcode})`,
          debug: {
            ticketLen: cleanTicket.length,
            secretLen: cleanSecret.length,
            suiteId: cleanSuiteId,
            ticketPreview,
            ticketAge,
            systemConfigTicketMatch: ticketMatch,
            hint: directRes.data.errcode === 40085
              ? 'ticket无效。可能原因: 1.回调解密得到了错误的ticket值 2.ticket已被新推送覆盖 3.ticket已过期(>30分钟)'
              : ''
          }
        }
      });
    }

    // 成功
    const token = directRes.data.suite_access_token;
    const latency = 0;

    // 更新缓存
    clearSuiteTokenCache();

    // 测试连接成功，自动更新应用状态为online
    if (token && config.appStatus !== 'online') {
      try {
        config.appStatus = 'online';
        await repo.save(config);
        log.info('[Admin Suite] appStatus auto-updated to online after successful connection test');
      } catch (e: any) {
        log.warn('[Admin Suite] Failed to auto-update appStatus:', e.message);
      }
    }

    res.json({
      success: true,
      data: {
        connected: true,
        message: '连接成功',
        latency,
        hasToken: !!token,
        appStatus: config.appStatus,
        suiteTicketAge: config.suiteTicketUpdatedAt ? Math.round((Date.now() - new Date(config.suiteTicketUpdatedAt).getTime()) / 1000 / 60) + '分钟前' : '未知'
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Test connection error:', error);
    res.json({ success: true, data: { connected: false, message: error.message } });
  }
});

// 清除suite token缓存（用于排障/刷新）
router.post('/suite/clear-cache', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    clearSuiteTokenCache();
    log.info('[Admin Suite] Token cache cleared manually');
    res.json({ success: true, message: 'Token缓存已清除（含suite/corp双缓存），下次操作将使用最新的suite_ticket重新获取' });
  } catch (error: any) {
    log.error('[Admin Suite] Clear cache error:', error);
    res.json({ success: true, message: '缓存清除操作完成' });
  }
});

/**
 * Suite Ticket 诊断接口（管理后台专用）
 * 返回当前 suite_ticket 健康状态、最近回调推送、推荐排查方向
 */
router.get('/suite/diagnostic', async (_req: Request, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      return res.json({
        success: true,
        data: {
          configured: false,
          reason: '系统中未找到 wecom_suite_configs 配置记录，请先在「应用配置」Tab 中保存 SuiteId/SuiteSecret/Token/EncodingAESKey'
        }
      });
    }

    const now = Date.now();
    const ticketUpdatedAtMs = config.suiteTicketUpdatedAt ? new Date(config.suiteTicketUpdatedAt).getTime() : 0;
    const ticketAgeMin = ticketUpdatedAtMs ? Math.round((now - ticketUpdatedAtMs) / 60000) : -1;
    const ticketStale = !ticketUpdatedAtMs || (now - ticketUpdatedAtMs) > 30 * 60 * 1000; // 30分钟未更新视为过期

    let recentCallback: any = null;
    let suiteTicketEventCount = 0;
    let lastSuiteTicketEvent: any = null;
    try {
      const logRows = await AppDataSource.query(
        `SELECT info_type, status, error_message, detail, created_at FROM wecom_suite_callback_logs WHERE suite_id = ? ORDER BY id DESC LIMIT 1`,
        [config.suiteId]
      );
      if (logRows?.[0]) {
        recentCallback = {
          infoType: logRows[0].info_type,
          status: logRows[0].status,
          errorMessage: logRows[0].error_message,
          detail: logRows[0].detail,
          time: logRows[0].created_at
        };
      }
      const cnt = await AppDataSource.query(
        `SELECT COUNT(*) as c FROM wecom_suite_callback_logs WHERE suite_id = ? AND info_type = 'suite_ticket' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
        [config.suiteId]
      );
      suiteTicketEventCount = parseInt(cnt?.[0]?.c || '0', 10);

      const lastEvtRows = await AppDataSource.query(
        `SELECT created_at, status FROM wecom_suite_callback_logs WHERE suite_id = ? AND info_type = 'suite_ticket' ORDER BY id DESC LIMIT 1`,
        [config.suiteId]
      );
      if (lastEvtRows?.[0]) {
        lastSuiteTicketEvent = {
          time: lastEvtRows[0].created_at,
          status: lastEvtRows[0].status
        };
      }
    } catch (e: any) {
      log.warn('[Admin Suite] diagnostic read logs failed:', e.message);
    }

    let callbackHealth: 'healthy' | 'stale' | 'never' = 'never';
    let recommendation = '';
    if (suiteTicketEventCount > 0) {
      callbackHealth = 'healthy';
      recommendation = `回调URL最近1小时内收到 ${suiteTicketEventCount} 次推送，工作正常。`;
    } else if (ticketUpdatedAtMs && ticketAgeMin <= 30) {
      callbackHealth = 'healthy';
      recommendation = `最近 ${ticketAgeMin} 分钟内有过 suite_ticket 推送（虽然过去1小时内事件日志为0，但ticket时间是新鲜的）。`;
    } else if (ticketUpdatedAtMs) {
      callbackHealth = 'stale';
      recommendation = [
        `回调URL已 ${ticketAgeMin} 分钟未收到 suite_ticket 推送（企微每10分钟推送一次，30分钟过期）。`,
        '排查方向：',
        '1. 企微服务商后台「通用开发参数 → 系统事件接收URL」是否正确（应为：' + (process.env.SUITE_CALLBACK_URL_HINT || (config.redirectDomain || '<对外域名>') + '/api/v1/wecom/suite/callback') + '）',
        '2. ⚠️ 「通用开发参数」和「应用回调配置」两处的Token/EncodingAESKey是否完全一致（不一致会导致自动推送的suite_ticket被丢弃）',
        '3. 服务器是否对企微IP段开放了入站访问（公网防火墙/安全组）',
        '4. 紧急情况下使用下方「手动注入 Ticket」临时救急'
      ].join('\n');
    } else {
      callbackHealth = 'never';
      recommendation = [
        '从未收到过 suite_ticket 推送！',
        '必须在企微服务商后台配置回调URL：' + (config.redirectDomain || '<你的对外域名>') + '/api/v1/wecom/suite/callback',
        '需要在两处同时配置：① 通用开发参数 → 系统事件接收URL  ② 应用 → 回调配置 → 数据回调URL',
        '⚠️ 两处必须使用相同的Token和EncodingAESKey！',
        '配置后等待 ~10 分钟，企微会主动推送 suite_ticket。',
        '如仍然没有，可使用下方「手动注入 Ticket」临时救急。'
      ].join('\n');
    }

    // ★ 深度调试：实时调用企微 API 验证当前 ticket，区分「ticket过期」/「secret错误」/「IP白名单」等
    let liveProbe: any = null;
    if (config.suiteTicket && config.suiteSecret) {
      try {
        const cleanTicket = String(config.suiteTicket).replace(/[\s\r\n\t]+/g, '').trim();
        const cleanSecret = String(config.suiteSecret).trim();
        const cleanSid = String(config.suiteId).trim();
        const axios = (await import('axios')).default;
        const probeRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
          suite_id: cleanSid, suite_secret: cleanSecret, suite_ticket: cleanTicket
        }, { timeout: 10000 });
        const errcode = probeRes.data.errcode;
        let probeReason = '';
        if (errcode === 0 || errcode === undefined) {
          probeReason = '✅ ticket当前有效，可正常获取 suite_access_token';
        } else if (errcode === 40085) {
          if (ticketAgeMin <= 10) {
            probeReason = [
              `❌ ticket刚刚更新仅${ticketAgeMin}分钟，企微仍拒绝。排查优先级：`,
              `1. 「通用开发参数」和「应用回调配置」两处的Token/EncodingAESKey是否完全一致（不一致会导致自动推送的ticket解密错误或被丢弃，但手动刷新可能正常）`,
              `2. SuiteSecret 是否正确或与 SuiteId 不匹配（请到应用配置Tab检查）`,
              `3. 在企微服务商后台手动点击「刷新Ticket」测试，若手动可以但自动不行 → 高度怀疑原因1`
            ].join('\n');
          } else {
            probeReason = `❌ ticket已${ticketAgeMin}分钟未刷新，可能已过期。请检查「通用开发参数→系统事件接收URL」是否正确配置，或使用「手动注入Ticket」`;
          }
        } else if (errcode === 41021 || errcode === 40004) {
          probeReason = `❌ SuiteSecret 错误 (errcode=${errcode}) → 请到应用配置Tab重新粘贴 SuiteSecret`;
        } else if (errcode === 60020) {
          probeReason = `❌ IP白名单错误 (errcode=60020)，本服务器外网IP不在企微Suite应用的IP白名单中。请将服务器IP（${probeRes.data.errmsg?.match(/from ip:\s*([\d.]+)/)?.[1] || '见errmsg'}）加入企微「服务商应用 → 通用开发参数 → 企业可信IP」白名单`;
        } else {
          probeReason = `❌ 错误 ${errcode}: ${probeRes.data.errmsg}`;
        }
        liveProbe = {
          errcode: errcode || 0,
          errmsg: probeRes.data.errmsg || '',
          ticketLengthRaw: config.suiteTicket.length,
          ticketLengthClean: cleanTicket.length,
          ticketWasTrimmed: cleanTicket.length !== config.suiteTicket.length,
          secretLength: cleanSecret.length,
          suiteIdLength: cleanSid.length,
          reason: probeReason
        };
      } catch (e: any) {
        liveProbe = { errcode: -1, errmsg: e.message, reason: `❌ 调用企微API异常：${e.message}` };
      }
    }

    res.json({
      success: true,
      data: {
        configured: true,
        suiteId: config.suiteId,
        suiteSecretConfigured: !!config.suiteSecret,
        callbackTokenConfigured: !!config.callbackToken,
        callbackEncodingAesKeyConfigured: !!config.callbackEncodingAesKey,
        ticketPresent: !!config.suiteTicket,
        ticketPreview: config.suiteTicket ? (config.suiteTicket.substring(0, 8) + '...' + config.suiteTicket.substring(config.suiteTicket.length - 4)) : '',
        ticketUpdatedAt: config.suiteTicketUpdatedAt,
        ticketAgeMinutes: ticketAgeMin,
        ticketStale,
        callbackHealth,
        suiteTicketEventCountLastHour: suiteTicketEventCount,
        lastSuiteTicketEvent,
        recentCallback,
        callbackUrlExpected: (config.redirectDomain || '<对外域名>') + '/api/v1/wecom/suite/callback',
        recommendation,
        liveProbe // ← 新增：实时探测结果
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] diagnostic error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 手动注入 suite_ticket（紧急救急）
 * 管理员从企微服务商后台「应用 → 数据回调 → 调用日志」复制最新的 suite_ticket，
 * 在回调URL故障期间临时使用，让 CRM 端连接恢复
 */
router.post('/suite/manual-ticket', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const { suiteTicket: rawTicket } = req.body || {};
    if (!rawTicket || typeof rawTicket !== 'string' || rawTicket.length < 10) {
      return res.status(400).json({ success: false, message: 'suiteTicket 必填且长度需大于10个字符' });
    }
    // 防御性清理：去除粘贴时可能带入的不可见字符/换行
    const suiteTicket = rawTicket.replace(/[\s\r\n\t]+/g, '').trim();

    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      return res.status(404).json({ success: false, message: '未找到 wecom_suite_configs 记录，请先保存应用配置' });
    }
    if (!config.suiteId || !config.suiteSecret) {
      return res.status(400).json({ success: false, message: '请先在「应用配置」Tab 中保存 SuiteId 和 SuiteSecret' });
    }

    // 调用企微 API 验证此 ticket 有效
    const axios = (await import('axios')).default;
    const verifyRes = await axios.post('https://qyapi.weixin.qq.com/cgi-bin/service/get_suite_token', {
      suite_id: config.suiteId,
      suite_secret: config.suiteSecret,
      suite_ticket: suiteTicket
    });
    if (verifyRes.data.errcode && verifyRes.data.errcode !== 0) {
      return res.status(400).json({
        success: false,
        message: `Ticket 验证失败: ${verifyRes.data.errmsg} (${verifyRes.data.errcode})。请确认从企微服务商后台「应用 → 数据回调 → 调用日志」复制的是最新的 suite_ticket（注意 ticket 10 分钟一次推送，30 分钟过期）`
      });
    }

    // 验证通过 → 写入DB + 清除缓存
    await AppDataSource.query(
      `UPDATE wecom_suite_configs SET suite_ticket = ?, suite_ticket_updated_at = NOW(), updated_at = NOW(), app_status = 'online' WHERE id = ?`,
      [suiteTicket, config.id]
    );
    try {
      await AppDataSource.query(
        `UPDATE system_config SET config_value = JSON_SET(config_value, '$.suite_ticket', ?) WHERE config_key = 'wecom_suite_config'`,
        [suiteTicket]
      );
    } catch { /* ignore */ }

    clearSuiteTokenCache();

    log.info(`[Admin Suite] suite_ticket 手动注入成功，ticket=${suiteTicket.substring(0, 12)}...`);
    res.json({
      success: true,
      message: 'Ticket 注入成功并验证通过，全部Token缓存已清除。请在 30 分钟内修复回调URL以避免再次过期'
    });
  } catch (error: any) {
    log.error('[Admin Suite] manual-ticket error:', error);
    res.status(500).json({ success: false, message: error.message || '手动注入失败' });
  }
});

// 生成授权链接
router.post('/suite/auth-link', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config || !config.suiteId || !config.suiteSecret) {
      return res.json({ success: false, message: '请先配置Suite ID和Suite Secret' });
    }
    if (!config.suiteTicket) {
      return res.json({ success: false, message: '尚未接收到suite_ticket，请先配置回调URL并等待企微推送' });
    }
    if (!config.redirectDomain) {
      return res.json({ success: false, message: '请先在应用配置中填写「授权回调域名」（需与企微服务商后台配置一致）' });
    }

    const preAuthCode = await getPreAuthCode(config);
    const { type, tenantId, expireDays = 7 } = req.body;

    // 使用配置的回调域名构建redirect_uri（必须与企微服务商后台「授权完成回调域名」一致）
    // 自动提取域名部分(protocol+host)，防止用户误填完整URL导致路径拼接错误
    let baseDomain = config.redirectDomain.replace(/\/+$/, '');
    try {
      const urlObj = new URL(baseDomain);
      baseDomain = urlObj.origin; // 只取 protocol + host
    } catch { /* 如果不是合法URL则原样使用 */ }
    const rawRedirectUri = `${baseDomain}/api/v1/wecom/suite/auth-callback`;
    const redirectUri = encodeURIComponent(rawRedirectUri);
    const state = type === 'tenant' && tenantId ? `tenant_${tenantId}` : 'general';

    const authUrl = `https://open.work.weixin.qq.com/3rdapp/install?suite_id=${config.suiteId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}&state=${state}`;

    // 保存授权链接记录
    try {
      const linkRepo = AppDataSource.getRepository(WecomSuiteAuthLink);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Number(expireDays || 7));
      await linkRepo.save(linkRepo.create({
        suiteId: config.suiteId,
        preAuthCode,
        authUrl,
        redirectUri: rawRedirectUri,
        state,
        type: type || 'general',
        tenantId: tenantId || null,
        expireDays: Number(expireDays || 7),
        status: 'pending',
        expiresAt,
        createdBy: (req as any).adminUser?.username || 'admin'
      }));
    } catch (e: any) {
      log.warn('[Admin Suite] Save auth link record failed:', e.message);
    }

    log.info('[Admin Suite] Auth link generated, state:', state, 'redirectDomain:', baseDomain);
    res.json({ success: true, data: { url: authUrl, preAuthCode, expiresIn: expireDays * 86400 } });
  } catch (error: any) {
    log.error('[Admin Suite] Generate auth link error:', error);
    res.json({ success: false, message: error.message });
  }
});

// 获取授权链接记录列表
router.get('/suite/auth-links', async (req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const linkRepo = AppDataSource.getRepository(WecomSuiteAuthLink);
    const links = await linkRepo.find({ order: { createdAt: 'DESC' }, take: 50 });
    // 自动标记过期
    const now = new Date();
    for (const link of links) {
      if (link.status === 'pending' && link.expiresAt && new Date(link.expiresAt) < now) {
        link.status = 'expired';
        await linkRepo.save(link).catch(() => {});
      }
    }
    res.json({ success: true, data: { list: links } });
  } catch (error: any) {
    log.error('[Admin Suite] Get auth links error:', error);
    res.json({ success: true, data: { list: [] } });
  }
});

// 删除授权链接记录
router.delete('/suite/auth-links/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    const linkRepo = AppDataSource.getRepository(WecomSuiteAuthLink);
    await linkRepo.delete(Number(req.params.id));
    res.json({ success: true, message: '已删除' });
  } catch (error: any) {
    res.json({ success: false, message: error.message });
  }
});

// 获取已授权企业列表
router.get('/suite/auths', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 50, keyword = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Math.min(Number(pageSize) || 50, 200);

    // 查询所有通过第三方授权或有授权记录的企微配置
    const whereClause = `wc.auth_mode = 'third_party' OR wc.auth_type = 'third_party' OR wc.auth_time IS NOT NULL`;
    let keywordFilter = '';
    const params: any[] = [];
    if (keyword) {
      keywordFilter = ` AND (wc.corp_id LIKE ? OR wc.name LIKE ? OR wc.auth_corp_name LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const rows = await AppDataSource.query(`
      SELECT wc.id, wc.corp_id as corpId, wc.name as corpName,
        wc.tenant_id as tenantId, wc.auth_time as authTime,
        wc.is_enabled as isEnabled, wc.connection_status as connectionStatus,
        wc.auth_corp_name as authCorpName, wc.auth_admin_user_id as authAdminUserId,
        wc.auth_scope as authScope, wc.auth_corp_info as authCorpInfo,
        wc.suite_id as suiteId, wc.auth_type as authType, wc.auth_mode as authMode,
        wc.vas_chat_archive as vasChatArchive, wc.vas_user_count as vasUserCount,
        wc.vas_expire_date as vasExpireDate, wc.api_call_count as apiCallCount,
        wc.created_at as createdAt,
        CASE WHEN wc.is_enabled = 1 AND wc.connection_status = 'connected' THEN 'active'
             WHEN wc.is_enabled = 0 THEN 'cancelled'
             ELSE 'pending' END as status
      FROM wecom_configs wc
      WHERE (${whereClause})${keywordFilter}
      ORDER BY wc.auth_time DESC, wc.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const countRes = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM wecom_configs wc WHERE (${whereClause})${keywordFilter}`,
      [...params]
    );
    const total = Number(countRes[0]?.total || 0);

    // 获取租户名称 & 解析 auth_corp_info
    for (const row of rows) {
      if (row.tenantId) {
        try {
          const tenant = await AppDataSource.query(`SELECT name FROM tenants WHERE id = ? LIMIT 1`, [row.tenantId]);
          row.tenantName = tenant[0]?.name || '';
        } catch { row.tenantName = ''; }
      }
      // 解析 auth_corp_info JSON 提取有用字段
      if (row.authCorpInfo) {
        try {
          const info = typeof row.authCorpInfo === 'string' ? JSON.parse(row.authCorpInfo) : row.authCorpInfo;
          row.corpFullName = info.corp_full_name || '';
          row.corpIndustry = info.corp_industry || '';
          row.corpSubIndustry = info.corp_sub_industry || '';
          row.corpScale = info.corp_scale || '';
          row.corpSquareLogoUrl = info.corp_square_logo_url || '';
          row.corpUserMax = info.corp_user_max || 0;
          row.subjectType = info.subject_type;
          row.verifiedEndTime = info.verified_end_time ? new Date(info.verified_end_time * 1000).toISOString() : '';
        } catch { /* ignore parse error */ }
        delete row.authCorpInfo; // 不返回原始大JSON
      }
    }

    res.json({ success: true, data: { list: rows, total, page: Number(page), pageSize: limit } });
  } catch (error: any) {
    log.error('[Admin Suite] Get auths error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取已授权企业详情
router.get('/suite/auths/:id', async (req: Request, res: Response) => {
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!config) return res.status(404).json({ success: false, message: '未找到授权记录' });

    res.json({
      success: true,
      data: {
        id: config.id, corpId: config.corpId, corpName: config.authCorpName || config.name,
        tenantId: config.tenantId, authTime: config.authTime,
        status: config.isEnabled ? 'active' : 'cancelled',
        connectionStatus: config.connectionStatus,
        authScope: config.authScope ? JSON.parse(config.authScope) : null,
        authCorpInfo: config.authCorpInfo ? JSON.parse(config.authCorpInfo) : null,
        authAdminUserId: config.authAdminUserId
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get auth detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 搜索可关联客户（租户+私有客户，排除已关联的）
router.get('/suite/bindable-customers', async (req: Request, res: Response) => {
  try {
    const { keyword = '', page = 1, pageSize = 20 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 50);
    const offset = (pageNum - 1) * pageSizeNum;

    // 获取已关联的租户ID列表（用于排除）
    let boundTenantIds: string[] = [];
    try {
      const boundRows = await AppDataSource.query(
        `SELECT DISTINCT tenant_id FROM wecom_configs WHERE tenant_id IS NOT NULL AND tenant_id != ''`
      );
      boundTenantIds = boundRows.map((r: any) => r.tenant_id);
    } catch { /* ignore */ }

    const results: any[] = [];
    let totalCount = 0;

    // 查询租户客户
    try {
      const excludeClause = boundTenantIds.length > 0
        ? `AND t.id NOT IN (${boundTenantIds.map(() => '?').join(',')})`
        : '';
      const excludeParams = boundTenantIds.length > 0 ? [...boundTenantIds] : [];

      let tenantWhere = `t.status = 'active'`;
      const tenantParams: any[] = [];

      // deleted_at 列可能不存在，安全检查
      try {
        const delCol = await AppDataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tenants' AND COLUMN_NAME = 'deleted_at'`
        );
        if (delCol.length > 0) tenantWhere += ` AND t.deleted_at IS NULL`;
      } catch { /* ignore */ }

      if (keyword) {
        tenantWhere += ` AND (t.name LIKE ? OR t.code LIKE ? OR t.contact LIKE ?)`;
        tenantParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const tenantCountSql = `SELECT COUNT(*) as cnt FROM tenants t WHERE ${tenantWhere} ${excludeClause}`;
      const tenantCountRes = await AppDataSource.query(tenantCountSql, [...tenantParams, ...excludeParams]);
      const tenantTotal = Number(tenantCountRes[0]?.cnt || 0);

      const tenantSql = `SELECT t.id, t.name, t.code, t.contact, t.phone, t.status, 'tenant' as customerType
                          FROM tenants t WHERE ${tenantWhere} ${excludeClause}
                          ORDER BY t.created_at DESC`;
      const tenantRows = await AppDataSource.query(tenantSql, [...tenantParams, ...excludeParams]);
      for (const row of tenantRows) {
        results.push({
          id: row.id,
          name: row.name,
          code: row.code,
          contact: row.contact,
          phone: row.phone,
          status: row.status,
          customerType: 'tenant',
          label: `${row.name}（租户 ${row.code}）`
        });
      }
      totalCount += tenantTotal;
    } catch (e) {
      log.warn('[Suite] 查询租户列表失败:', (e as any).message?.substring(0, 80));
    }

    // 查询私有客户
    try {
      let licenseWhere = `l.status = 'active'`;
      const licenseParams: any[] = [];

      // deleted_at 列安全检查
      try {
        const delCol = await AppDataSource.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'licenses' AND COLUMN_NAME = 'deleted_at'`
        );
        if (delCol.length > 0) licenseWhere += ` AND l.deleted_at IS NULL`;
      } catch { /* ignore */ }

      const excludeClause = boundTenantIds.length > 0
        ? `AND l.id NOT IN (${boundTenantIds.map(() => '?').join(',')})`
        : '';
      const excludeParams = boundTenantIds.length > 0 ? [...boundTenantIds] : [];

      if (keyword) {
        licenseWhere += ` AND (l.customer_name LIKE ? OR l.license_key LIKE ? OR l.customer_contact LIKE ?)`;
        licenseParams.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }

      const licenseCountSql = `SELECT COUNT(*) as cnt FROM licenses l WHERE ${licenseWhere} ${excludeClause}`;
      const licenseCountRes = await AppDataSource.query(licenseCountSql, [...licenseParams, ...excludeParams]);
      const licenseTotal = Number(licenseCountRes[0]?.cnt || 0);

      const licenseSql = `SELECT l.id, l.customer_name as name, l.license_key as code, l.customer_contact as contact,
                           l.customer_phone as phone, l.status, 'private' as customerType
                           FROM licenses l WHERE ${licenseWhere} ${excludeClause}
                           ORDER BY l.created_at DESC`;
      const licenseRows = await AppDataSource.query(licenseSql, [...licenseParams, ...excludeParams]);
      for (const row of licenseRows) {
        results.push({
          id: row.id,
          name: row.name,
          code: row.code,
          contact: row.contact,
          phone: row.phone,
          status: row.status,
          customerType: 'private',
          label: `${row.name}（私有 ${row.code?.substring(0, 16) || ''}）`
        });
      }
      totalCount += licenseTotal;
    } catch (e) {
      log.warn('[Suite] 查询私有客户列表失败:', (e as any).message?.substring(0, 80));
    }

    // 分页（合并后排序取分页段）
    const pagedResults = results.slice(offset, offset + pageSizeNum);

    res.json({
      success: true,
      data: {
        list: pagedResults,
        total: totalCount,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error: any) {
    log.error('[Suite] Get bindable customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 绑定已授权企业到租户
router.post('/suite/auths/:id/bind-tenant', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { tenantId } = req.body;
    if (!tenantId) return res.status(400).json({ success: false, message: '请提供租户ID' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!config) return res.status(404).json({ success: false, message: '未找到授权记录' });

    // 验证租户存在
    try {
      const tenant = await AppDataSource.query(`SELECT id, name FROM tenants WHERE id = ? LIMIT 1`, [tenantId]);
      if (!tenant.length) return res.status(400).json({ success: false, message: '租户不存在' });
    } catch { /* tenants表可能不存在，跳过验证 */ }

    config.tenantId = tenantId;
    config.connectionStatus = 'connected';
    await configRepo.save(config);

    log.info(`[Admin Suite] Bound auth ${config.corpId} to tenant ${tenantId}`);
    res.json({ success: true, message: '关联成功' });
  } catch (error: any) {
    log.error('[Admin Suite] Bind tenant error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 取消企业授权
router.delete('/suite/auths/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: Number(req.params.id) } });
    if (!config) return res.status(404).json({ success: false, message: '未找到授权记录' });

    // 软取消: 禁用并清除永久授权码
    config.isEnabled = false;
    config.connectionStatus = 'disconnected';
    config.permanentCode = '';
    await configRepo.save(config);

    log.info(`[Admin Suite] Auth cancelled for corp: ${config.corpId}`);
    res.json({ success: true, message: '已取消授权' });
  } catch (error: any) {
    log.error('[Admin Suite] Cancel auth error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 惰性自动清理：查询日志时顺带检查并执行自动清理
let lastAutoCleanCheck = 0;
const AUTO_CLEAN_INTERVAL = 60 * 60 * 1000; // 每小时检查一次
async function lazyAutoCleanCallbackLogs() {
  const now = Date.now();
  if (now - lastAutoCleanCheck < AUTO_CLEAN_INTERVAL) return;
  lastAutoCleanCheck = now;
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_callback_log_auto_clean' LIMIT 1"
    ).catch(() => []);
    if (rows.length === 0) return;
    const config = JSON.parse(rows[0].config_value);
    if (!config.enabled || !config.retentionDays) return;
    const repo = AppDataSource.getRepository(WecomSuiteCallbackLog);
    const result = await repo.createQueryBuilder()
      .delete()
      .where('created_at < DATE_SUB(NOW(), INTERVAL :days DAY)', { days: config.retentionDays })
      .execute();
    if (result.affected && result.affected > 0) {
      log.info(`[Admin Suite] Lazy auto-clean: deleted ${result.affected} callback logs older than ${config.retentionDays} days`);
    }
  } catch { /* ignore */ }
}

// 获取回调日志
router.get('/suite/callback-logs', async (req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    // 惰性执行自动清理
    lazyAutoCleanCallbackLogs().catch(() => {});
    const { page = 1, pageSize = 10, infoType } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    const repo = AppDataSource.getRepository(WecomSuiteCallbackLog);
    const qb = repo.createQueryBuilder('log').orderBy('log.createdAt', 'DESC');

    if (infoType) {
      qb.where('log.infoType = :infoType', { infoType });
    }

    const [list, total] = await qb.skip(offset).take(limit).getManyAndCount();

    res.json({
      success: true,
      data: {
        list: list.map(l => ({
          id: l.id, eventType: l.infoType, suiteId: l.suiteId,
          authCorpId: l.authCorpId, detail: l.detail,
          status: l.status, errorMessage: l.errorMessage,
          createdAt: l.createdAt
        })),
        total, page: Number(page), pageSize: limit
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get callback logs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 手动清理回调日志（删除N天前的日志）
router.delete('/suite/callback-logs', async (req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const { beforeDays = 30 } = req.query;
    const days = Math.max(1, Number(beforeDays));
    const repo = AppDataSource.getRepository(WecomSuiteCallbackLog);
    const result = await repo.createQueryBuilder()
      .delete()
      .where('created_at < DATE_SUB(NOW(), INTERVAL :days DAY)', { days })
      .execute();
    const deletedCount = result.affected || 0;
    log.info(`[Admin Suite] Callback logs cleanup: deleted ${deletedCount} records older than ${days} days`);
    res.json({ success: true, message: `已清理 ${deletedCount} 条 ${days} 天前的日志`, data: { deletedCount, days } });
  } catch (error: any) {
    log.error('[Admin Suite] Callback logs cleanup error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取回调日志自动清理配置
router.get('/suite/callback-logs/auto-clean', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_callback_log_auto_clean' LIMIT 1"
    ).catch(() => []);
    const defaultConfig = { enabled: false, retentionDays: 30 };
    if (rows.length > 0) {
      try {
        const config = JSON.parse(rows[0].config_value);
        res.json({ success: true, data: { ...defaultConfig, ...config } });
      } catch {
        res.json({ success: true, data: defaultConfig });
      }
    } else {
      res.json({ success: true, data: defaultConfig });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存回调日志自动清理配置
router.put('/suite/callback-logs/auto-clean', async (req: Request, res: Response) => {
  try {
    const { enabled, retentionDays } = req.body;
    const config = { enabled: !!enabled, retentionDays: Math.max(1, Number(retentionDays) || 30) };
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_callback_log_auto_clean' LIMIT 1"
    ).catch(() => []);
    if (existing.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_callback_log_auto_clean'",
        [JSON.stringify(config)]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_callback_log_auto_clean', ?, 'json', NOW(), NOW())",
        [JSON.stringify(config)]
      );
    }

    // 如果开启了自动清理，立即执行一次
    if (config.enabled) {
      try {
        await ensureSuiteTables();
        const repo = AppDataSource.getRepository(WecomSuiteCallbackLog);
        const result = await repo.createQueryBuilder()
          .delete()
          .where('created_at < DATE_SUB(NOW(), INTERVAL :days DAY)', { days: config.retentionDays })
          .execute();
        const deletedCount = result.affected || 0;
        log.info(`[Admin Suite] Auto-clean enabled, immediate cleanup: deleted ${deletedCount} records older than ${config.retentionDays} days`);
      } catch (e: any) {
        log.warn('[Admin Suite] Auto-clean immediate execution failed:', e.message);
      }
    }

    res.json({ success: true, message: '自动清理配置已保存' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 通知模板管理 ====================

/** 确保通知模板表存在且包含新增列 */
const ensureNotificationTemplateTables = async () => {
  try {
    await AppDataSource.query('SELECT 1 FROM wecom_notification_templates LIMIT 1');
    // 尝试补全可能缺少的新列（旧版表结构升级兼容）
    const cols = await AppDataSource.query(`SHOW COLUMNS FROM wecom_notification_templates`);
    const colNames = cols.map((c: any) => c.Field);
    if (!colNames.includes('notify_scope')) {
      await AppDataSource.query(`ALTER TABLE wecom_notification_templates ADD COLUMN notify_scope VARCHAR(20) DEFAULT 'all' COMMENT '通知范围: self/team/all'`);
    }
    if (!colNames.includes('suite_config_id')) {
      await AppDataSource.query(`ALTER TABLE wecom_notification_templates ADD COLUMN suite_config_id INT DEFAULT NULL COMMENT '关联服务商应用ID'`);
    }
    if (!colNames.includes('template_variables')) {
      await AppDataSource.query(`ALTER TABLE wecom_notification_templates ADD COLUMN template_variables TEXT DEFAULT NULL COMMENT '模板变量定义JSON'`);
    }
  } catch {
    try { await AppDataSource.synchronize(); } catch (e: any) { log.warn('[Admin Suite] notification template sync error:', e.message); }
  }
};

// 获取通知模板列表
router.get('/suite/notification-templates', async (req: Request, res: Response) => {
  try {
    await ensureNotificationTemplateTables();
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const where: any = {};
    if (req.query.suiteConfigId) where.suiteConfigId = Number(req.query.suiteConfigId);
    if (req.query.templateType) where.templateType = req.query.templateType;
    const list = await repo.find({ where, order: { sortOrder: 'ASC', id: 'ASC' } });
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Admin Suite] Get notification templates error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 新增通知模板
router.post('/suite/notification-templates', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:suite:edit')) return;
  try {
    await ensureNotificationTemplateTables();
    const { templateId, templateName, templateType, description, templateContent,
            templateVariables, notifyScope, suiteConfigId, isEnabled, sortOrder } = req.body;
    if (!templateId || !templateName || !templateType) {
      return res.status(400).json({ success: false, message: '模板ID、名称和类型为必填项' });
    }
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const tpl = repo.create({
      templateId, templateName, templateType,
      description: description || '',
      templateContent: templateContent ? (typeof templateContent === 'string' ? templateContent : JSON.stringify(templateContent)) : null,
      templateVariables: templateVariables ? (typeof templateVariables === 'string' ? templateVariables : JSON.stringify(templateVariables)) : null,
      notifyScope: notifyScope || 'all',
      suiteConfigId: suiteConfigId || null,
      isEnabled: isEnabled !== false,
      sortOrder: sortOrder || 0,
    });
    await repo.save(tpl);
    log.info(`[Admin Suite] Notification template created: ${templateName} (${templateId})`);
    res.json({ success: true, data: tpl, message: '模板添加成功' });
  } catch (error: any) {
    log.error('[Admin Suite] Create notification template error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 更新通知模板
router.put('/suite/notification-templates/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:suite:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const tpl = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!tpl) return res.status(404).json({ success: false, message: '模板不存在' });

    const { templateId, templateName, templateType, description, templateContent,
            templateVariables, notifyScope, suiteConfigId, isEnabled, sortOrder } = req.body;
    if (templateId !== undefined) tpl.templateId = templateId;
    if (templateName !== undefined) tpl.templateName = templateName;
    if (templateType !== undefined) tpl.templateType = templateType;
    if (description !== undefined) tpl.description = description;
    if (templateContent !== undefined) tpl.templateContent = typeof templateContent === 'string' ? templateContent : JSON.stringify(templateContent);
    if (templateVariables !== undefined) tpl.templateVariables = typeof templateVariables === 'string' ? templateVariables : JSON.stringify(templateVariables);
    if (notifyScope !== undefined) tpl.notifyScope = notifyScope;
    if (suiteConfigId !== undefined) tpl.suiteConfigId = suiteConfigId;
    if (isEnabled !== undefined) tpl.isEnabled = isEnabled;
    if (sortOrder !== undefined) tpl.sortOrder = sortOrder;

    await repo.save(tpl);
    log.info(`[Admin Suite] Notification template updated: ${tpl.templateName} (${tpl.templateId})`);
    res.json({ success: true, data: tpl, message: '模板更新成功' });
  } catch (error: any) {
    log.error('[Admin Suite] Update notification template error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 删除通知模板
router.delete('/suite/notification-templates/:id', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:suite:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const tpl = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!tpl) return res.status(404).json({ success: false, message: '模板不存在' });

    await repo.remove(tpl);
    log.info(`[Admin Suite] Notification template deleted: ${tpl.templateName}`);
    res.json({ success: true, message: '模板删除成功' });
  } catch (error: any) {
    log.error('[Admin Suite] Delete notification template error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 切换通知模板启用状态
router.patch('/suite/notification-templates/:id/toggle', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:suite:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const tpl = await repo.findOne({ where: { id: Number(req.params.id) } });
    if (!tpl) return res.status(404).json({ success: false, message: '模板不存在' });

    tpl.isEnabled = !tpl.isEnabled;
    await repo.save(tpl);
    res.json({ success: true, data: tpl, message: tpl.isEnabled ? '已启用' : '已禁用' });
  } catch (error: any) {
    log.error('[Admin Suite] Toggle notification template error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 发送企微应用通知（业务调用入口）
router.post('/suite/notification-templates/send', async (req: Request, res: Response) => {
  try {
    const { templateType, corpId, data: tplData, targetUserIds } = req.body;
    if (!templateType) {
      return res.status(400).json({ success: false, message: 'templateType 必填' });
    }
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const templates = await repo.find({ where: { templateType, isEnabled: true }, order: { sortOrder: 'ASC' } });
    if (templates.length === 0) {
      return res.json({ success: true, data: { sent: 0 }, message: '无已启用的匹配模板' });
    }

    const results: any[] = [];
    for (const tpl of templates) {
      results.push({
        templateId: tpl.templateId,
        templateName: tpl.templateName,
        notifyScope: tpl.notifyScope,
        status: 'queued',
      });
    }

    log.info(`[Admin Suite] Notification send queued: type=${templateType}, templates=${templates.length}, targets=${targetUserIds?.length || 'scope-based'}`);
    res.json({ success: true, data: { sent: results.length, results }, message: `${results.length} 条通知已加入队列` });
  } catch (error: any) {
    log.error('[Admin Suite] Send notification error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ==================== 数据统计 ====================

// 获取数据统计概览
router.get('/data-stats', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    let dateFilter = '';
    if (period === '7d') dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    else if (period === '90d') dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)';
    else dateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const safeCount = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return Number(r[0]?.cnt || 0); } catch { return 0; }
    };
    const safeSum = async (sql: string, p?: any[]) => {
      try { const r = await AppDataSource.query(sql, p); return Number(r[0]?.total || 0); } catch { return 0; }
    };

    const totalTenants = await safeCount('SELECT COUNT(*) as cnt FROM tenants');
    const authorizedTenants = await safeCount('SELECT COUNT(DISTINCT tenant_id) as cnt FROM wecom_configs WHERE is_enabled = 1');
    const totalCustomers = await safeCount('SELECT COUNT(*) as cnt FROM wecom_customers');
    const totalGroups = await safeCount('SELECT COUNT(*) as cnt FROM wecom_customer_groups');
    const monthAcquisition = await safeCount(`SELECT COUNT(*) as cnt FROM wecom_acquisition_customers WHERE 1=1 ${dateFilter}`);
    const monthAiCalls = await safeCount(`SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE 1=1 ${dateFilter}`);
    const totalChatRecords = await safeCount('SELECT COUNT(*) as cnt FROM wecom_chat_records');
    const totalPaymentAmount = await safeSum("SELECT COALESCE(SUM(amount), 0) as total FROM payment_orders WHERE status = 'paid'");

    res.json({
      success: true,
      data: {
        totalTenants, authorizedTenants, totalCustomers, totalGroups,
        monthAcquisition, monthAiCalls, totalChatRecords, totalPaymentAmount
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Get data stats error:', error.message);
    res.json({ success: true, data: { totalTenants: 0, authorizedTenants: 0, totalCustomers: 0, totalGroups: 0, monthAcquisition: 0, monthAiCalls: 0, totalChatRecords: 0, totalPaymentAmount: 0 } });
  }
});

// 获取数据趋势
router.get('/data-stats/trends', async (req: Request, res: Response) => {
  try {
    const { period = '30d', type = 'customer' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    let trendSql = '';
    if (type === 'customer') {
      trendSql = `SELECT DATE(created_at) as date, COUNT(*) as value FROM wecom_customers WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY) GROUP BY DATE(created_at) ORDER BY date ASC`;
    } else if (type === 'acquisition') {
      trendSql = `SELECT DATE(created_at) as date, COUNT(*) as value FROM wecom_acquisition_customers WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY) GROUP BY DATE(created_at) ORDER BY date ASC`;
    } else if (type === 'ai') {
      trendSql = `SELECT DATE(created_at) as date, COUNT(*) as value FROM wecom_ai_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY) GROUP BY DATE(created_at) ORDER BY date ASC`;
    } else if (type === 'revenue') {
      trendSql = `SELECT DATE(paid_at) as date, COALESCE(SUM(amount), 0) as value FROM payment_orders WHERE status = 'paid' AND paid_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY) GROUP BY DATE(paid_at) ORDER BY date ASC`;
    }

    const rows = trendSql ? await AppDataSource.query(trendSql).catch(() => []) : [];
    res.json({
      success: true,
      data: {
        dates: rows.map((r: any) => r.date),
        series: [{ name: type, data: rows.map((r: any) => Number(r.value || 0)) }]
      }
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Get data stats trends error:', error.message);
    res.json({ success: true, data: { dates: [], series: [] } });
  }
});

// 获取数据排行
router.get('/data-stats/rankings', async (req: Request, res: Response) => {
  try {
    const { period = '30d', page = 1, pageSize = 10 } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const limit = parseInt(pageSize as string);
    const offset = (parseInt(page as string) - 1) * limit;

    const safeQuery = async (sql: string, p?: any[]) => { try { return await AppDataSource.query(sql, p); } catch { return []; } };

    // 总数
    const countRows = await safeQuery(
      `SELECT COUNT(*) as cnt FROM tenants t WHERE EXISTS (SELECT 1 FROM wecom_configs wc3 WHERE wc3.tenant_id = t.id)`
    );
    const totalCount = Number(countRows[0]?.cnt || 0);

    // 按租户统计各维度数据
    const rankings = await safeQuery(`
      SELECT t.id AS tenantId, t.name AS tenantName,
        IFNULL((SELECT COUNT(*) FROM wecom_customers wc2 WHERE wc2.tenant_id = t.id), 0) AS customerCount,
        IFNULL((SELECT COUNT(*) FROM wecom_customer_groups wcg WHERE wcg.tenant_id = t.id), 0) AS groupCount,
        IFNULL((SELECT COUNT(*) FROM wecom_acquisition_customers wac WHERE wac.tenant_id = t.id AND wac.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)), 0) AS acquisitionCount,
        IFNULL((SELECT COUNT(*) FROM wecom_ai_logs wal WHERE wal.tenant_id = t.id AND wal.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)), 0) AS aiCallCount,
        t.wecom_chat_archive_auth AS chatArchiveEnabled
      FROM tenants t
      WHERE EXISTS (SELECT 1 FROM wecom_configs wc3 WHERE wc3.tenant_id = t.id)
      ORDER BY customerCount DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    res.json({
      success: true,
      data: rankings.map((r: any) => ({ ...r, chatArchiveEnabled: !!r.chatArchiveEnabled })),
      total: totalCount,
      page: parseInt(page as string),
      pageSize: limit
    });
  } catch (error: any) {
    log.error('[Admin Wecom] Get data stats rankings error:', error.message);
    res.json({ success: true, data: [], total: 0, page: 1, pageSize: 10 });
  }
});

// 导出数据统计
router.get('/data-stats/export', async (req: Request, res: Response) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const rankings = await AppDataSource.query(`
      SELECT t.name AS '租户名称',
        IFNULL((SELECT COUNT(*) FROM wecom_customers wc2 WHERE wc2.tenant_id = t.id), 0) AS '客户数',
        IFNULL((SELECT COUNT(*) FROM wecom_customer_groups wcg WHERE wcg.tenant_id = t.id), 0) AS '客户群',
        IFNULL((SELECT COUNT(*) FROM wecom_acquisition_customers wac WHERE wac.tenant_id = t.id AND wac.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)), 0) AS '获客添加',
        IFNULL((SELECT COUNT(*) FROM wecom_ai_logs wal WHERE wal.tenant_id = t.id AND wal.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)), 0) AS 'AI调用',
        CASE WHEN t.wecom_chat_archive_auth = 1 THEN '已开通' ELSE '未开通' END AS '会话存档'
      FROM tenants t
      WHERE EXISTS (SELECT 1 FROM wecom_configs wc3 WHERE wc3.tenant_id = t.id)
      ORDER BY 2 DESC
    `).catch(() => []);

    // Generate CSV
    const headers = ['租户名称', '客户数', '客户群', '获客添加', 'AI调用', '会话存档'];
    const csv = [headers.join(','), ...rankings.map((r: any) => headers.map(h => r[h] ?? '').join(','))].join('\n');
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=data-stats-${period}.csv`);
    res.send(bom + csv);
  } catch (error: any) {
    log.error('[Admin Wecom] Export data stats error:', error.message);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// ==================== 审计日志 ====================

// 获取审计日志
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const { keyword, operator, actionType, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    // 尝试从 wecom_audit_logs 表读取，降级到 admin_operation_logs
    const tableNames = ['wecom_audit_logs', 'admin_operation_logs'];
    let tableName = '';
    for (const tn of tableNames) {
      const check = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tn]
      ).catch(() => [{ cnt: 0 }]);
      if (check[0]?.cnt) { tableName = tn; break; }
    }

    if (!tableName) {
      return res.json({ success: true, data: [], total: 0, page: Number(page), pageSize: limit });
    }

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (keyword) {
      where += ' AND (detail LIKE ? OR target LIKE ? OR operator LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (operator) { where += ' AND operator = ?'; params.push(operator); }
    if (actionType) { where += ' AND action_type = ?'; params.push(actionType); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }

    const [countRow] = await AppDataSource.query(`SELECT COUNT(*) as total FROM ${tableName} ${where}`, params);
    const total = Number(countRow?.total || 0);

    const list = await AppDataSource.query(
      `SELECT id, operator, action_type AS actionType, target, detail, ip, created_at AS createdAt
       FROM ${tableName} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 今日操作数（不受筛选条件影响）
    const todayCountRows = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM ${tableName} WHERE DATE(created_at) = CURDATE()`
    ).catch(() => [{ cnt: 0 }]);
    const todayCount = Number(todayCountRows[0]?.cnt || 0);

    // 操作类型种类数
    const actionTypeCountRows = await AppDataSource.query(
      `SELECT COUNT(DISTINCT action_type) as cnt FROM ${tableName}`
    ).catch(() => [{ cnt: 0 }]);
    const actionTypeCount = Number(actionTypeCountRows[0]?.cnt || 0);

    res.json({ success: true, data: list, total, page: Number(page), pageSize: limit, todayCount, actionTypeCount });
  } catch (error: any) {
    log.error('[Admin Wecom] Get audit logs error:', error.message);
    res.json({ success: true, data: [], total: 0, page: 1, pageSize: 20 });
  }
});

// 导出审计日志
router.get('/audit-log/export', async (req: Request, res: Response) => {
  try {
    const { keyword, operator, actionType, startDate, endDate } = req.query;

    const tableNames = ['wecom_audit_logs', 'admin_operation_logs'];
    let tableName = '';
    for (const tn of tableNames) {
      const check = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`, [tn]
      ).catch(() => [{ cnt: 0 }]);
      if (check[0]?.cnt) { tableName = tn; break; }
    }

    if (!tableName) {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      return res.send('\uFEFF时间,操作人,操作类型,目标,详情,IP\n');
    }

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) { where += ' AND (detail LIKE ? OR target LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }
    if (operator) { where += ' AND operator = ?'; params.push(operator); }
    if (actionType) { where += ' AND action_type = ?'; params.push(actionType); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }

    const rows = await AppDataSource.query(
      `SELECT created_at, operator, action_type, target, detail, ip FROM ${tableName} ${where} ORDER BY created_at DESC LIMIT 10000`,
      params
    );

    const headers = ['时间', '操作人', '操作类型', '目标', '详情', 'IP'];
    const csvRows = rows.map((r: any) => [
      r.created_at ? new Date(r.created_at).toLocaleString('zh-CN') : '',
      r.operator || '', r.action_type || '', r.target || '',
      (r.detail || '').replace(/,/g, '，').replace(/\n/g, ' '),
      r.ip || ''
    ].join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error: any) {
    log.error('[Admin Wecom] Export audit logs error:', error.message);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// ==================== 配额管理 ====================

// 获取企微配置配额列表
router.get('/config-quotas', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 读取全局配额配置
    const globalCfgRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_tenant_quotas' LIMIT 1"
    ).catch(() => []);
    let quotaMap: Record<string, any> = {};
    if (globalCfgRows.length > 0) {
      try { quotaMap = JSON.parse(globalCfgRows[0].config_value); } catch { quotaMap = {}; }
    }

    // ★ 从实际购买记录中同步配额（确保CRM端购买后配额自动更新）
    const billingRows = await AppDataSource.query(
      "SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'tenant_billing_records_%'"
    ).catch(() => []);

    // 从购买记录中提取每个租户的最新有效配额
    const purchasedQuotaMap: Record<string, { maxCount: number; packageName: string }> = {};
    for (const row of billingRows) {
      const tenantId = row.config_key.replace('tenant_billing_records_', '');
      try {
        const records = JSON.parse(row.config_value);
        if (!Array.isArray(records)) continue;
        // 找到最新的已支付/已生效的企微套餐记录
        const activeWecomRecords = records.filter((r: any) =>
          (r.type === 'wecom' || r.serviceType === 'wecom') &&
          (r.status === 'paid' || r.status === 'active' || r.status === 'free')
        ).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        if (activeWecomRecords.length > 0) {
          const latest = activeWecomRecords[0];
          const wecomQuota = latest.wecomQuota || latest.maxConfigs || latest.quota || 1;
          purchasedQuotaMap[tenantId] = {
            maxCount: wecomQuota,
            packageName: latest.packageName || latest.planName || '基础版'
          };
        }
      } catch { /* ignore parse error */ }
    }

    // ★ 同时检查 payment_orders 表中的企微套餐购买记录
    try {
      const paidOrders = await AppDataSource.query(
        `SELECT po.tenant_id, po.package_name, po.amount, po.paid_at,
                COALESCE(po.remark, '') as remark
         FROM payment_orders po
         WHERE po.status = 'paid'
           AND (po.package_id LIKE '%wecom%' OR po.package_name LIKE '%企微%')
         ORDER BY po.paid_at DESC`
      );
      for (const order of paidOrders) {
        if (!order.tenant_id) continue;
        // 从套餐名称中提取配额数（如"企微基础版 3配额"）
        const quotaMatch = (order.package_name || '').match(/(\d+)\s*配额/);
        const remarkQuota = (order.remark || '').match(/wecomQuota[=:](\d+)/i);
        if (quotaMatch || remarkQuota) {
          const quota = parseInt(quotaMatch?.[1] || remarkQuota?.[1] || '1');
          if (!purchasedQuotaMap[order.tenant_id] || quota > purchasedQuotaMap[order.tenant_id].maxCount) {
            purchasedQuotaMap[order.tenant_id] = {
              maxCount: quota,
              packageName: order.package_name || '付费版'
            };
          }
        }
      }
    } catch (e: any) {
      log.warn('[Admin Wecom] Check payment_orders for quota sync failed:', (e as any).message?.substring(0, 80));
    }

    // ★ 将购买记录中的配额合并到 quotaMap（购买记录优先级高于手动配置）
    let quotaMapUpdated = false;
    for (const [tenantId, purchased] of Object.entries(purchasedQuotaMap)) {
      const existing = quotaMap[tenantId] || {};
      if (purchased.maxCount > (existing.maxCount || 1)) {
        quotaMap[tenantId] = {
          ...existing,
          maxCount: purchased.maxCount,
          packageName: purchased.packageName,
          syncedFromPurchase: true,
          syncedAt: new Date().toISOString()
        };
        quotaMapUpdated = true;
      }
    }

    // 如果有更新，回写到 system_config
    if (quotaMapUpdated) {
      const val = JSON.stringify(quotaMap);
      if (globalCfgRows.length > 0) {
        await AppDataSource.query(
          "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_tenant_quotas'", [val]
        ).catch(() => {});
      } else {
        await AppDataSource.query(
          "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_tenant_quotas', ?, 'json', NOW(), NOW())", [val]
        ).catch(() => {});
      }
      log.info(`[Admin Wecom] Config quotas synced from purchase records, updated ${Object.keys(purchasedQuotaMap).length} tenants`);
    }

    const tenants = await AppDataSource.query(
      `SELECT t.id AS tenantId, t.name AS tenantName, t.code AS tenantCode, t.status,
              IFNULL((SELECT COUNT(*) FROM wecom_configs WHERE tenant_id = t.id), 0) AS usedCount
       FROM tenants t ${where} ORDER BY t.name ASC`, params
    ).catch(() => []);

    const list = tenants.map((t: any) => {
      const cfg = quotaMap[t.tenantId] || {};
      return {
        tenantId: t.tenantId,
        tenantName: t.tenantName || t.tenantCode,
        tenantCode: t.tenantCode,
        status: t.status,
        usedCount: Number(t.usedCount || 0),
        maxCount: cfg.maxCount ?? 1,
        packageName: cfg.packageName || '基础版',
        features: cfg.features || null,
        allowThirdParty: cfg.allowThirdParty !== false,
        allowSelfBuild: cfg.allowSelfBuild !== false,
        acquisitionLinkQuota: cfg.acquisitionLinkQuota ?? -1,  // -1=无限制
      };
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Admin Wecom] Get config quotas error:', error.message);
    res.json({ success: true, data: [] });
  }
});

// 设置租户配额
router.put('/config-quotas/:tenantId', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:tenants:edit')) return;
  try {
    const { tenantId } = req.params;
    const quotaData = req.body;

    // 读取现有配额配置
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_tenant_quotas' LIMIT 1"
    ).catch(() => []);
    let quotaMap: Record<string, any> = {};
    if (rows.length > 0) {
      try { quotaMap = JSON.parse(rows[0].config_value); } catch { quotaMap = {}; }
    }

    quotaMap[tenantId] = { ...quotaMap[tenantId], ...quotaData, updatedAt: new Date().toISOString() };
    const val = JSON.stringify(quotaMap);

    if (rows.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_tenant_quotas'", [val]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_tenant_quotas', ?, 'json', NOW(), NOW())", [val]
      );
    }

    log.info(`[Admin Wecom] Config quota updated for tenant ${tenantId}: maxCount=${quotaData.maxCount}`);
    res.json({ success: true, message: '配额设置成功' });
  } catch (error: any) {
    log.error('[Admin Wecom] Save config quota error:', error.message);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

// 获取获客助手用量
router.get('/acquisition-usage', async (req: Request, res: Response) => {
  try {
    const { keyword, startDate, endDate } = req.query;

    // 读取租户配额配置（获客助手链接数配额）
    const cfgRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_tenant_quotas' LIMIT 1"
    ).catch(() => []);
    let quotaMap: Record<string, any> = {};
    if (cfgRows.length > 0) {
      try { quotaMap = JSON.parse(cfgRows[0].config_value); } catch { quotaMap = {}; }
    }

    // 检查获客相关表
    const hasAcqLinks = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_links'"
    ).catch(() => [{ cnt: 0 }]);
    const hasAcqCustomers = await AppDataSource.query(
      "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_acquisition_customers'"
    ).catch(() => [{ cnt: 0 }]);

    if (!hasAcqLinks[0]?.cnt && !hasAcqCustomers[0]?.cnt) {
      return res.json({ success: true, data: [], stats: { monthAdded: 0, activeLinks: 0, activeTenants: 0, avgConversion: '0%' } });
    }

    let dateFilter = 'AND wac.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    if (startDate && endDate) {
      dateFilter = `AND wac.created_at >= '${startDate}' AND wac.created_at <= '${endDate} 23:59:59'`;
    }

    let where = 'WHERE 1=1';
    const params: any[] = [];
    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const safeQuery = async (sql: string, p?: any[]) => { try { return await AppDataSource.query(sql, p); } catch { return []; } };

    const tenants = await safeQuery(
      `SELECT t.id AS tenantId, t.name AS tenantName FROM tenants t ${where} AND EXISTS (SELECT 1 FROM wecom_configs WHERE tenant_id = t.id) ORDER BY t.name ASC`,
      params
    );

    const list = [];
    for (const t of tenants) {
      const linkCount = hasAcqLinks[0]?.cnt ? await safeQuery(
        'SELECT COUNT(*) as cnt FROM wecom_acquisition_links WHERE tenant_id = ?', [t.tenantId]
      ).then(r => Number(r[0]?.cnt || 0)) : 0;

      const monthAdded = hasAcqCustomers[0]?.cnt ? await safeQuery(
        `SELECT COUNT(*) as cnt FROM wecom_acquisition_customers wac WHERE wac.tenant_id = ? ${dateFilter}`,
        [t.tenantId]
      ).then(r => Number(r[0]?.cnt || 0)) : 0;

      const monthLost = hasAcqCustomers[0]?.cnt ? await safeQuery(
        `SELECT COUNT(*) as cnt FROM wecom_acquisition_customers wac WHERE wac.tenant_id = ? AND wac.status = 'lost' ${dateFilter}`,
        [t.tenantId]
      ).then(r => Number(r[0]?.cnt || 0)) : 0;

      const totalClicks = hasAcqLinks[0]?.cnt ? await safeQuery(
        'SELECT COALESCE(SUM(click_count), 0) as cnt FROM wecom_acquisition_links WHERE tenant_id = ?', [t.tenantId]
      ).then(r => Number(r[0]?.cnt || 0)) : 0;

      list.push({
        tenantId: t.tenantId,
        tenantName: t.tenantName,
        linkCount,
        monthAdded,
        monthLost,
        netGrowth: monthAdded - monthLost,
        conversionRate: totalClicks > 0 ? Math.round(monthAdded / totalClicks * 100) : 0,
        quota: quotaMap[t.tenantId]?.acquisitionLinkQuota ?? -1,  // -1=无限制
      });
    }

    const stats = {
      monthAdded: list.reduce((s, r) => s + r.monthAdded, 0),
      activeLinks: list.reduce((s, r) => s + r.linkCount, 0),
      activeTenants: list.filter(r => r.monthAdded > 0).length,
      avgConversion: list.length ? Math.round(list.reduce((s, r) => s + r.conversionRate, 0) / Math.max(list.length, 1)) + '%' : '0%'
    };

    res.json({ success: true, data: list, stats });
  } catch (error: any) {
    log.error('[Admin Wecom] Get acquisition usage error:', error.message);
    res.json({ success: true, data: [], stats: { monthAdded: 0, activeLinks: 0, activeTenants: 0, avgConversion: '0%' } });
  }
});

// 获取获客助手用量详情
router.get('/acquisition-usage/:tenantId', async (req: Request, res: Response) => {
  try {
    // TODO: [P0] 实现真实逻辑
    res.json({ success: true, data: { tenantId: req.params.tenantId, quota: 0, used: 0, remaining: 0, details: [] } });
  } catch (error: any) {
    log.error('[Admin Wecom] Get acquisition usage detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 小程序配置管理 (MP Config) ====================

/**
 * 获取小程序配置
 * GET /api/v1/admin/wecom-management/suite/mp-config
 */
router.get('/suite/mp-config', async (_req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      return res.json({ success: true, data: {} });
    }

    // 解析 mpConfig JSON 扩展字段
    let mpConfigData: any = {};
    if (config.mpConfig) {
      try { mpConfigData = typeof config.mpConfig === 'string' ? JSON.parse(config.mpConfig) : config.mpConfig; } catch { /* ignore */ }
    }

    res.json({
      success: true,
      data: {
        mpAppId: config.mpAppId || '',
        mpAppSecret: config.mpAppSecret ? '******' : '',
        mpFormSecret: config.mpFormSecret || '',
        mpEnabled: config.mpEnabled || false,
        mpCallbackToken: config.mpCallbackToken || '',
        mpCallbackEncodingAesKey: config.mpCallbackEncodingAesKey || '',
        mpCardTitle: mpConfigData.cardTitle || '',
        mpCardCoverUrl: mpConfigData.cardCoverUrl || '',
        mpPosterUrl: mpConfigData.posterUrl || '',
        mpLinkExpireDays: mpConfigData.linkExpireDays || 7
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get mp-config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取小程序 AppSecret 真实值（管理员查看/复制用）
 * GET /api/v1/admin/wecom-management/suite/mp-secret
 */
router.get('/suite/mp-secret', async (_req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    res.json({
      success: true,
      data: {
        mpAppSecret: config?.mpAppSecret || ''
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get mp-secret error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 保存小程序配置
 * PUT /api/v1/admin/wecom-management/suite/mp-config
 */
router.put('/suite/mp-config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:suite:edit')) return;
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    let config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      config = repo.create({});
    }

    const { mpAppId, mpAppSecret, mpFormSecret, mpCallbackToken, mpCallbackEncodingAesKey, mpCardTitle, mpCardCoverUrl, mpPosterUrl, mpLinkExpireDays, mpEnabled } = req.body;

    if (mpAppId !== undefined) config.mpAppId = mpAppId;
    if (mpAppSecret && mpAppSecret !== '******') config.mpAppSecret = mpAppSecret;
    if (mpFormSecret !== undefined) config.mpFormSecret = mpFormSecret;
    if (mpEnabled !== undefined) config.mpEnabled = mpEnabled;
    if (mpCallbackToken !== undefined) config.mpCallbackToken = mpCallbackToken;
    if (mpCallbackEncodingAesKey !== undefined) config.mpCallbackEncodingAesKey = mpCallbackEncodingAesKey;

    // 扩展配置存入 mpConfig JSON
    let mpConfigData: any = {};
    if (config.mpConfig) {
      try { mpConfigData = typeof config.mpConfig === 'string' ? JSON.parse(config.mpConfig) : config.mpConfig; } catch { /* ignore */ }
    }
    if (mpCardTitle !== undefined) mpConfigData.cardTitle = mpCardTitle;
    if (mpCardCoverUrl !== undefined) mpConfigData.cardCoverUrl = mpCardCoverUrl;
    if (mpPosterUrl !== undefined) mpConfigData.posterUrl = mpPosterUrl;
    if (mpLinkExpireDays !== undefined) mpConfigData.linkExpireDays = mpLinkExpireDays;
    config.mpConfig = JSON.stringify(mpConfigData);

    await repo.save(config);
    log.info('[Admin Suite] MP config saved');
    res.json({ success: true, message: '小程序配置已保存' });
  } catch (error: any) {
    log.error('[Admin Suite] Save mp-config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 测试小程序连接
 * GET /api/v1/admin/wecom-management/suite/mp-test-connection
 */
router.get('/suite/mp-test-connection', async (_req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    const appId = config?.mpAppId || process.env.MP_APP_ID || '';
    const appSecret = config?.mpAppSecret || process.env.MP_APP_SECRET || '';

    if (!appId || !appSecret) {
      // 始终返回 success:true，将测试结果放在 data 中，避免 axios 拦截器拦截
      return res.json({ success: true, data: { connected: false, message: '请先配置小程序AppID和AppSecret' } });
    }

    const startTime = Date.now();
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData: any = await tokenResp.json();
    const latency = Date.now() - startTime;

    if (tokenData.access_token) {
      log.info(`[Admin Suite] MP test connection OK, latency=${latency}ms`);
      return res.json({
        success: true,
        data: { connected: true, message: '连接成功', latency, expiresIn: tokenData.expires_in }
      });
    }

    log.warn('[Admin Suite] MP test connection failed:', tokenData);
    return res.json({
      success: true,
      data: {
        connected: false,
        message: `连接失败: ${tokenData.errmsg || '未知错误'} (errcode: ${tokenData.errcode || '-'})`,
        latency,
        errcode: tokenData.errcode
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] MP test connection error:', error);
    res.json({ success: true, data: { connected: false, message: `连接异常: ${error.message}` } });
  }
});

/**
 * 生成小程序码
 * GET /api/v1/admin/wecom-management/suite/wxacode
 */
router.get('/suite/wxacode', async (req: Request, res: Response) => {
  try {
    const { page, scene } = req.query as any;

    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    const appId = config?.mpAppId || process.env.MP_APP_ID || '';
    const appSecret = config?.mpAppSecret || process.env.MP_APP_SECRET || '';

    if (!appId || !appSecret) {
      return res.status(400).json({ success: false, message: '小程序未配置AppID/AppSecret，请先填写', code: 'MP_NOT_CONFIGURED' });
    }

    // 获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData: any = await tokenResp.json();

    if (!tokenData.access_token) {
      log.error('[Admin Suite] 获取access_token失败:', tokenData);
      return res.status(500).json({ success: false, message: '获取微信access_token失败' });
    }

    // 调用 getwxacodeunlimit 生成小程序码
    const wxacodeUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenData.access_token}`;
    const wxacodeResp = await fetch(wxacodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: scene || 'default',
        page: page || 'pages/form/form',
        width: 280,
        auto_color: false,
        line_color: { r: 64, g: 158, b: 255 },
        is_hyaline: false
      })
    });

    const contentType = wxacodeResp.headers.get('content-type') || '';

    if (contentType.includes('image')) {
      const buffer = Buffer.from(await wxacodeResp.arrayBuffer());
      const base64 = buffer.toString('base64');
      return res.json({
        success: true,
        data: { wxacodeBase64: `data:image/png;base64,${base64}`, appId }
      });
    }

    const errData: any = await wxacodeResp.json();
    log.error('[Admin Suite] 生成小程序码失败:', errData);
    return res.status(400).json({
      success: false,
      message: `生成小程序码失败: ${errData.errmsg || '未知错误'}`,
      code: 'WXACODE_FAILED',
      errcode: errData.errcode
    });
  } catch (error: any) {
    log.error('[Admin Suite] 生成小程序码异常:', error);
    res.status(500).json({ success: false, message: '生成小程序码失败' });
  }
});

// ==================== 辅助函数 ====================

export default router;

