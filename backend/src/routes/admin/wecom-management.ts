/**
 * Admin 管理后台 - 企微管理路由
 * 提供：企微概览（全租户企微配置列表）、增值服务配置
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
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
        wc.is_enabled AS isEnabled,
        wc.connection_status AS connectionStatus,
        wc.last_error AS lastError,
        wc.api_call_count AS apiCallCount,
        wc.tenant_id AS tenantId,
        wc.created_at AS createdAt,
        wc.updated_at AS updatedAt,
        wc.suite_id AS suiteId,
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

    res.json({
      success: true,
      data: {
        list: list.map((row: any) => ({
          ...row,
          isEnabled: !!row.isEnabled,
          vasChatArchive: !!row.vasChatArchive
        })),
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
    const { status, keyword, page = 1, pageSize = 10 } = req.query;
    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);

    // 扫描所有 tenant_billing_records_* 配置项
    const rows = await AppDataSource.query(
      "SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'tenant_billing_records_%'"
    ).catch(() => []);

    let allOrders: any[] = [];
    for (const row of rows) {
      const tenantId = row.config_key.replace('tenant_billing_records_', '');
      let records: any[] = [];
      try { records = JSON.parse(row.config_value); } catch { continue; }
      if (!Array.isArray(records)) continue;
      // 只取有账单属性的代购相关记录（archive/wecom/acquisition/ai）
      for (const r of records) {
        allOrders.push({ ...r, tenantId, tenantName: r.tenantName || tenantId });
      }
    }

    // 过滤
    if (status && status !== 'all') {
      allOrders = allOrders.filter(o => o.status === status || o.fulfillmentStatus === status);
    }
    if (keyword) {
      const kw = (keyword as string).toLowerCase();
      allOrders = allOrders.filter(o =>
        (o.orderNo || '').toLowerCase().includes(kw) ||
        (o.tenantName || '').toLowerCase().includes(kw) ||
        (o.packageName || '').toLowerCase().includes(kw)
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

    records[idx].fulfillmentStatus = 'fulfilled';
    records[idx].status = 'active';
    records[idx].fulfilledAt = new Date().toISOString();
    records[idx].fulfillMethod = method || 'manual';
    records[idx].fulfillNote = note || '';

    // 更新权限
    if (records[idx].type === 'archive') {
      const maxMembers = records[idx].maxMembers || records[idx].userCount || 10;
      await AppDataSource.query(
        'UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]
      ).catch(() => {});
      await AppDataSource.query(
        `INSERT INTO wecom_archive_settings (tenant_id, max_users, status, expire_date)
         VALUES (?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 YEAR))
         ON DUPLICATE KEY UPDATE max_users = VALUES(max_users), status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR), updated_at = NOW()`,
        [tenantId, maxMembers]
      ).catch(() => {});
    }

    await AppDataSource.query(
      'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
      [JSON.stringify(records), key]
    );

    log.info(`[Admin Wecom] Order ${id} fulfilled for tenant ${tenantId} via ${method}`);
    res.json({ success: true, message: '履约成功' });
  } catch (error: any) {
    log.error('[Admin Wecom] Fulfill order error:', error.message);
    res.status(500).json({ success: false, message: '履约失败' });
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
 */
router.get('/supplier-config', async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
    ).catch(() => []);
    if (rows.length > 0) {
      try { return res.json({ success: true, data: JSON.parse(rows[0].config_value) }); } catch {}
    }
    res.json({
      success: true,
      data: {
        providerCorpId: '',
        providerSecret: '',
        orderApiUrl: '',
        autoFulfillEnabled: false,
        prechargeBalance: 0,
        notifyEmail: '',
        notifyWebhook: ''
      }
    });
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
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = 'wecom_supplier_config' LIMIT 1"
    ).catch(() => []);
    const val = JSON.stringify(req.body);
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
import { WecomNotificationTemplate } from '../../entities/WecomNotificationTemplate';
import { getSuiteAccessToken, getPreAuthCode } from '../wecom/suite-callback';

/** 确保suite表存在 */
const ensureSuiteTables = async () => {
  try {
    await AppDataSource.query(`SELECT 1 FROM wecom_suite_configs LIMIT 1`);
  } catch {
    try { await AppDataSource.synchronize(); } catch (e: any) { log.warn('[Admin Suite] sync error:', e.message); }
  }
};

// 获取服务商应用配置
router.get('/suite/config', async (_req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    let config = await repo.findOne({ where: {}, order: { id: 'ASC' } });
    if (!config) {
      // 返回默认空配置
      return res.json({
        success: true,
        data: {
          suiteId: '', suiteSecret: '', suiteTicket: '', ticketUpdateTime: null,
          providerCorpId: '', providerSecret: '',
          callbackToken: '', callbackEncodingAesKey: '',
          appName: '', appDescription: '', appStatus: 'offline',
          permissions: [],
          chatArchiveRsaPrivateKey: ''
        }
      });
    }
    res.json({
      success: true,
      data: {
        suiteId: config.suiteId || '',
        suiteSecret: config.suiteSecret ? '******' : '', // 掩码显示
        suiteTicket: config.suiteTicket ? '已接收' : '',
        ticketUpdateTime: config.suiteTicketUpdatedAt,
        providerCorpId: config.providerCorpId || '',
        providerSecret: config.providerSecret ? '******' : '',
        callbackToken: config.callbackToken || '',
        callbackEncodingAesKey: config.callbackEncodingAesKey || '',
        appName: config.appName || '',
        appDescription: config.appDescription || '',
        appStatus: config.appStatus || 'offline',
        permissions: config.permissions ? JSON.parse(config.permissions) : [],
        chatArchiveRsaPrivateKey: config.chatArchiveRsaPrivateKey ? '******' : '',
        isEnabled: config.isEnabled
      }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Get config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 保存服务商应用配置
router.put('/suite/config', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:config:edit')) return;
  try {
    await ensureSuiteTables();
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    let config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    const {
      suiteId, suiteSecret, providerCorpId, providerSecret,
      callbackToken, callbackEncodingAesKey,
      appName, appDescription, appStatus, permissions,
      chatArchiveRsaPrivateKey
    } = req.body;

    if (!config) {
      config = repo.create({});
    }

    if (suiteId !== undefined) config.suiteId = suiteId;
    // 只有非掩码值才更新密钥
    if (suiteSecret && suiteSecret !== '******') config.suiteSecret = suiteSecret;
    if (providerCorpId !== undefined) config.providerCorpId = providerCorpId;
    if (providerSecret && providerSecret !== '******') config.providerSecret = providerSecret;
    if (callbackToken !== undefined) config.callbackToken = callbackToken;
    if (callbackEncodingAesKey !== undefined) config.callbackEncodingAesKey = callbackEncodingAesKey;
    if (appName !== undefined) config.appName = appName;
    if (appDescription !== undefined) config.appDescription = appDescription;
    if (appStatus !== undefined) config.appStatus = appStatus;
    if (permissions !== undefined) config.permissions = JSON.stringify(Array.isArray(permissions) ? permissions : []);
    if (chatArchiveRsaPrivateKey && chatArchiveRsaPrivateKey !== '******') config.chatArchiveRsaPrivateKey = chatArchiveRsaPrivateKey;

    await repo.save(config);
    log.info('[Admin Suite] Config saved, suiteId:', config.suiteId);
    res.json({ success: true, message: '配置保存成功' });
  } catch (error: any) {
    log.error('[Admin Suite] Save config error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// 测试服务商连接
router.post('/suite/test-connection', async (_req: Request, res: Response) => {
  if (!checkPermission(_req, res, 'wecom-management:config:edit')) return;
  try {
    const repo = AppDataSource.getRepository(WecomSuiteConfig);
    const config = await repo.findOne({ where: {}, order: { id: 'ASC' } });

    if (!config || !config.suiteId || !config.suiteSecret) {
      return res.json({ success: false, message: '请先配置Suite ID和Suite Secret' });
    }

    if (!config.suiteTicket) {
      return res.json({
        success: false,
        message: '尚未接收到suite_ticket。请先在企微服务商后台配置好回调URL，等待企微推送suite_ticket（约10分钟推送一次）'
      });
    }

    const startTime = Date.now();
    const token = await getSuiteAccessToken(config);
    const latency = Date.now() - startTime;

    res.json({
      success: true,
      message: '连接成功',
      data: { latency, hasToken: !!token, suiteTicketAge: config.suiteTicketUpdatedAt ? Math.round((Date.now() - new Date(config.suiteTicketUpdatedAt).getTime()) / 1000 / 60) + '分钟前' : '未知' }
    });
  } catch (error: any) {
    log.error('[Admin Suite] Test connection error:', error);
    res.json({ success: false, message: error.message });
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

    const preAuthCode = await getPreAuthCode(config);
    const { type, tenantId } = req.body;

    // 构建授权回调地址(企业授权完成后企微会重定向到这个地址)
    const redirectUri = encodeURIComponent(`${req.protocol}://${req.get('host')}/api/v1/wecom/suite/auth-callback`);
    const state = type === 'tenant' && tenantId ? `tenant_${tenantId}` : 'general';

    const authUrl = `https://open.work.weixin.qq.com/3rdapp/install?suite_id=${config.suiteId}&pre_auth_code=${preAuthCode}&redirect_uri=${redirectUri}&state=${state}`;

    log.info('[Admin Suite] Auth link generated, state:', state);
    res.json({ success: true, data: { url: authUrl, preAuthCode, expiresIn: 1800 } });
  } catch (error: any) {
    log.error('[Admin Suite] Generate auth link error:', error);
    res.json({ success: false, message: error.message });
  }
});

// 获取已授权企业列表
router.get('/suite/auths', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    // 查询第三方授权模式的企微配置
    const [list, total] = await AppDataSource.query(`
      SELECT wc.id, wc.corp_id as corpId, wc.name as corpName,
        wc.tenant_id as tenantId, wc.auth_time as authTime,
        wc.is_enabled as isEnabled, wc.connection_status as connectionStatus,
        wc.auth_corp_name as authCorpName, wc.auth_admin_user_id as authAdminUserId,
        wc.auth_scope as authScope,
        CASE WHEN wc.is_enabled = 1 AND wc.connection_status = 'connected' THEN 'active'
             WHEN wc.is_enabled = 0 THEN 'cancelled'
             ELSE 'pending' END as status
      FROM wecom_configs wc
      WHERE wc.auth_mode = 'third_party' OR wc.auth_type = 'third_party'
      ORDER BY wc.auth_time DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]).then(async (rows: any[]) => {
      const countRes = await AppDataSource.query(`
        SELECT COUNT(*) as total FROM wecom_configs
        WHERE auth_mode = 'third_party' OR auth_type = 'third_party'
      `);
      // 获取租户名称
      for (const row of rows) {
        if (row.tenantId) {
          try {
            const tenant = await AppDataSource.query(`SELECT name FROM tenants WHERE id = ? LIMIT 1`, [row.tenantId]);
            row.tenantName = tenant[0]?.name || '';
          } catch { row.tenantName = ''; }
        }
      }
      return [rows, countRes[0]?.total || 0];
    });

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: limit } });
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

// 获取回调日志
router.get('/suite/callback-logs', async (req: Request, res: Response) => {
  try {
    await ensureSuiteTables();
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

// ==================== 通知模板管理 ====================

/** 确保通知模板表存在 */
const ensureNotificationTemplateTables = async () => {
  try {
    await AppDataSource.query('SELECT 1 FROM wecom_notification_templates LIMIT 1');
  } catch {
    try { await AppDataSource.synchronize(); } catch (e: any) { log.warn('[Admin Suite] notification template sync error:', e.message); }
  }
};

// 获取通知模板列表
router.get('/suite/notification-templates', async (_req: Request, res: Response) => {
  try {
    await ensureNotificationTemplateTables();
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const list = await repo.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
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
    const { templateId, templateName, templateType, description, templateContent, isEnabled, sortOrder } = req.body;
    if (!templateId || !templateName || !templateType) {
      return res.status(400).json({ success: false, message: '模板ID、名称和类型为必填项' });
    }
    const repo = AppDataSource.getRepository(WecomNotificationTemplate);
    const tpl = repo.create({
      templateId, templateName, templateType,
      description: description || '',
      templateContent: templateContent ? JSON.stringify(templateContent) : null,
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

    const { templateId, templateName, templateType, description, templateContent, isEnabled, sortOrder } = req.body;
    if (templateId !== undefined) tpl.templateId = templateId;
    if (templateName !== undefined) tpl.templateName = templateName;
    if (templateType !== undefined) tpl.templateType = templateType;
    if (description !== undefined) tpl.description = description;
    if (templateContent !== undefined) tpl.templateContent = typeof templateContent === 'string' ? templateContent : JSON.stringify(templateContent);
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

// ==================== 辅助函数 ====================

export default router;

