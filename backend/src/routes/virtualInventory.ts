import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDataSource } from '../config/database';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 自动创建虚拟商品库存相关表
let tablesEnsured = false;
async function ensureVirtualTables() {
  if (tablesEnsured) return;
  try {
    const ds = getDataSource();
    await ds.query(`
      CREATE TABLE IF NOT EXISTS card_key_inventory (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        product_id VARCHAR(36) NOT NULL COMMENT '关联商品ID',
        card_key VARCHAR(255) NOT NULL COMMENT '卡密编码',
        status VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
        order_id VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID',
        reserved_order_id VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID',
        claim_token VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
        claim_method VARCHAR(20) DEFAULT NULL COMMENT '领取方式',
        claimed_at DATETIME DEFAULT NULL COMMENT '客户领取时间',
        usage_instructions TEXT DEFAULT NULL COMMENT '使用说明',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_tenant_card_key (tenant_id, card_key),
        KEY idx_product_status (product_id, status),
        KEY idx_order_id (order_id),
        KEY idx_claim_token (claim_token),
        KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡密库存表'
    `);
    await ds.query(`
      CREATE TABLE IF NOT EXISTS resource_inventory (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        product_id VARCHAR(36) NOT NULL COMMENT '关联商品ID',
        resource_link VARCHAR(500) NOT NULL COMMENT '资源链接',
        resource_password VARCHAR(100) DEFAULT NULL COMMENT '提取码',
        resource_description TEXT DEFAULT NULL COMMENT '资源说明',
        status VARCHAR(20) DEFAULT 'unused' COMMENT '状态: unused/reserved/used/claimed/expired/voided',
        order_id VARCHAR(36) DEFAULT NULL COMMENT '关联订单ID',
        reserved_order_id VARCHAR(36) DEFAULT NULL COMMENT '预占订单ID',
        claim_token VARCHAR(100) DEFAULT NULL COMMENT '客户领取令牌',
        claim_method VARCHAR(20) DEFAULT NULL COMMENT '领取方式',
        claimed_at DATETIME DEFAULT NULL COMMENT '客户领取时间',
        usage_instructions TEXT DEFAULT NULL COMMENT '使用说明',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_product_status (product_id, status),
        KEY idx_order_id (order_id),
        KEY idx_claim_token (claim_token),
        KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网盘资源库存表'
    `);
    await ds.query(`
      CREATE TABLE IF NOT EXISTS virtual_delivery_records (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
        product_id VARCHAR(36) DEFAULT NULL COMMENT '关联商品ID',
        delivery_type VARCHAR(20) NOT NULL COMMENT '发货类型: none/card_key/resource_link',
        card_key_content TEXT DEFAULT NULL COMMENT '卡密内容',
        resource_link VARCHAR(500) DEFAULT NULL COMMENT '资源链接',
        resource_password VARCHAR(100) DEFAULT NULL COMMENT '提取码',
        remark TEXT DEFAULT NULL COMMENT '备注',
        operator_id VARCHAR(36) NOT NULL COMMENT '操作人ID',
        operator_name VARCHAR(50) DEFAULT NULL COMMENT '操作人姓名',
        delivered_at DATETIME NOT NULL COMMENT '发货时间',
        email_sent TINYINT(1) DEFAULT 0 COMMENT '是否已发送邮件',
        email_sent_at DATETIME DEFAULT NULL COMMENT '邮件发送时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_order_id (order_id),
        KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品发货记录表'
    `);
    await ds.query(`
      CREATE TABLE IF NOT EXISTS virtual_claim_settings (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) DEFAULT NULL COMMENT '租户ID',
        delivery_mode VARCHAR(20) DEFAULT 'link' COMMENT '发货方式: link/manual',
        claim_link_expiry_days INT DEFAULT 30 COMMENT '领取链接有效天数',
        login_methods VARCHAR(50) DEFAULT 'password' COMMENT '登录方式',
        initial_password VARCHAR(255) DEFAULT '123456' COMMENT '初始登录密码',
        claim_page_notice TEXT DEFAULT NULL COMMENT '领取页面提示语',
        email_enabled TINYINT(1) DEFAULT 0 COMMENT '是否开启邮件发送',
        email_source VARCHAR(20) DEFAULT 'official' COMMENT '邮箱来源',
        email_content_mode VARCHAR(20) DEFAULT 'link' COMMENT '邮件模式',
        email_auto_send TINYINT(1) DEFAULT 0 COMMENT '自动发送邮件',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='虚拟商品领取配置表'
    `);
    await ds.query(`
      CREATE TABLE IF NOT EXISTS tenant_email_config (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) NOT NULL COMMENT '租户ID',
        smtp_host VARCHAR(200) NOT NULL COMMENT 'SMTP服务器',
        smtp_port INT DEFAULT 465 COMMENT 'SMTP端口',
        encryption VARCHAR(10) DEFAULT 'ssl' COMMENT '加密方式',
        sender_email VARCHAR(200) NOT NULL COMMENT '发件邮箱',
        sender_password VARCHAR(500) NOT NULL COMMENT '邮箱密码',
        sender_name VARCHAR(100) DEFAULT '' COMMENT '发件人名称',
        is_verified TINYINT(1) DEFAULT 0 COMMENT '是否已验证',
        verified_at DATETIME DEFAULT NULL COMMENT '验证时间',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='租户自定义邮箱配置表'
    `);
    // 补充 product_id 列（已有表可能缺失）
    await ds.query(`ALTER TABLE virtual_delivery_records ADD COLUMN product_id VARCHAR(36) DEFAULT NULL COMMENT '关联商品ID' AFTER order_id`).catch(() => {});
    tablesEnsured = true;
    // 修复：将已有的 NULL tenant_id 更新为 'default'
    await ds.query(`UPDATE card_key_inventory SET tenant_id = 'default' WHERE tenant_id IS NULL`).catch(() => {});
    await ds.query(`UPDATE resource_inventory SET tenant_id = 'default' WHERE tenant_id IS NULL`).catch(() => {});
    await ds.query(`UPDATE virtual_delivery_records SET tenant_id = 'default' WHERE tenant_id IS NULL`).catch(() => {});
    await ds.query(`UPDATE virtual_claim_settings SET tenant_id = 'default' WHERE tenant_id IS NULL`).catch(() => {});
    log.info('[虚拟库存] 虚拟商品相关表已确认存在');
  } catch (error) {
    log.error('[虚拟库存] 自动创建表失败:', error);
  }
}

// 所有路由需要认证
router.use(authenticateToken);

// 中间件：确保表存在
router.use(async (_req, _res, next) => {
  await ensureVirtualTables();
  next();
});

// 获取租户ID的辅助函数 - 返回 'default' 作为默认值，避免 NULL 导致 SQL WHERE 失败
function getTenantId(req: Request): string {
  return (req as any).user?.tenantId || (req as any).tenantId || 'default';
}

// 🔥 辅助函数：同步虚拟商品的库存到products表
async function syncVirtualProductStock(productId: string, inventoryType: 'card_key' | 'resource_link', tenantId: string) {
  try {
    const ds = getDataSource();
    const table = inventoryType === 'card_key' ? 'card_key_inventory' : 'resource_inventory';
    const [result] = await ds.query(
      `SELECT COUNT(*) as cnt FROM ${table} WHERE product_id = ? AND status = 'unused' AND tenant_id = ?`,
      [productId, tenantId]
    );
    const unusedCount = Number(result?.cnt || 0);
    await ds.query(
      'UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?',
      [unusedCount, productId]
    );
    log.info(`[虚拟库存] 同步商品 ${productId} 库存为 ${unusedCount}`);
  } catch (syncErr) {
    log.error('[虚拟库存] 同步商品库存失败:', syncErr);
  }
}

// ==================== 虚拟商品列表（供下拉选择用） ====================

/**
 * GET /products - 获取虚拟商品列表（供卡密/资源库存页面下拉选择）
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { deliveryType } = req.query;
    const ds = getDataSource();

    let sql = `SELECT id, name, code, product_type, virtual_delivery_type FROM products WHERE product_type = 'virtual' AND status = 'active' AND (tenant_id = ? OR tenant_id IS NULL)`;
    const params: any[] = [tenantId];

    if (deliveryType) {
      sql += ` AND virtual_delivery_type = ?`;
      params.push(deliveryType);
    }

    sql += ` ORDER BY created_at DESC`;

    const products = await ds.query(sql, params);

    res.json({
      success: true,
      data: products.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        productType: p.product_type,
        virtualDeliveryType: p.virtual_delivery_type
      }))
    });
  } catch (error) {
    log.error('[虚拟库存] 获取虚拟商品列表失败:', error);
    res.json({ success: true, data: [] }); // 不返回500，返回空列表
  }
});

// ==================== 卡密库存 ====================

/**
 * GET /card-keys - 卡密列表（分页 + 筛选）
 */
router.get('/card-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, status, keyword, page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 20));
    const offset = (pageNum - 1) * pageSizeNum;

    const ds = getDataSource();
    let whereClause = 'c.tenant_id = ?';
    const params: any[] = [tenantId];

    if (productId) {
      whereClause += ' AND c.product_id = ?';
      params.push(productId);
    }
    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }
    if (keyword) {
      whereClause += ' AND c.card_key LIKE ?';
      params.push(`%${keyword}%`);
    }

    // 分步查询，避免一个失败导致全部丢失
    let total = 0;
    try {
      const [countResult] = await ds.query(
        `SELECT COUNT(*) as total FROM card_key_inventory c WHERE ${whereClause}`, [...params]
      );
      total = Number(countResult?.total || 0);
    } catch (countErr) {
      log.error('[虚拟库存] 卡密COUNT查询失败:', countErr);
    }

    // ⭐ 两步查询法：先查库存表，再批量查商品名，彻底避免 LEFT JOIN 问题
    let list: any[] = [];
    try {
      list = await ds.query(
        `SELECT * FROM card_key_inventory c WHERE ${whereClause}
         ORDER BY c.created_at DESC
         LIMIT ${pageSizeNum} OFFSET ${offset}`,
        [...params]
      );
    } catch (listErr) {
      log.error('[虚拟库存] 卡密列表查询失败:', listErr);
    }

    // 批量查询关联商品名称
    const productNameMap: Record<string, string> = {};
    if (list.length > 0) {
      const productIds = [...new Set(list.map((r: any) => r.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        try {
          const placeholders = productIds.map(() => '?').join(',');
          const products = await ds.query(
            `SELECT id, name FROM products WHERE id IN (${placeholders})`,
            productIds
          );
          products.forEach((p: any) => { productNameMap[p.id] = p.name; });
          log.info(`[虚拟库存] 卡密列表商品名映射: ${JSON.stringify(productNameMap)}`);
        } catch (prodErr) {
          log.error('[虚拟库存] 批量查询商品名失败:', prodErr);
        }
      }
    }

    // 批量查询关联订单号
    const orderNumberMap: Record<string, string> = {};
    if (list.length > 0) {
      const orderIds = [...new Set([
        ...list.map((r: any) => r.order_id).filter(Boolean),
        ...list.map((r: any) => r.reserved_order_id).filter(Boolean)
      ])];
      if (orderIds.length > 0) {
        try {
          const placeholders = orderIds.map(() => '?').join(',');
          const orders = await ds.query(
            `SELECT id, order_number FROM orders WHERE id IN (${placeholders})`,
            orderIds
          );
          orders.forEach((o: any) => { orderNumberMap[o.id] = o.order_number; });
        } catch (orderErr) {
          log.error('[虚拟库存] 批量查询订单号失败:', orderErr);
        }
      }
    }

    res.json({
      success: true,
      data: {
        list: list.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: productNameMap[item.product_id] || '',
          cardKey: item.card_key,
          status: item.status,
          orderId: item.order_id,
          orderNumber: orderNumberMap[item.order_id] || null,
          reservedOrderId: item.reserved_order_id,
          reservedOrderNumber: orderNumberMap[item.reserved_order_id] || null,
          claimToken: item.claim_token,
          claimMethod: item.claim_method,
          claimedAt: item.claimed_at,
          usageInstructions: item.usage_instructions,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('[虚拟库存] 获取卡密列表失败(顶层):', error);
    res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });
  }
});

/**
 * GET /card-keys/stats - 卡密统计
 */
router.get('/card-keys/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId } = req.query;

    let whereClause = 'tenant_id = ?';
    const params: any[] = [tenantId];
    if (productId) {
      whereClause += ' AND product_id = ?';
      params.push(productId);
    }

    const stats = await getDataSource().query(
      `SELECT status, COUNT(*) as count FROM card_key_inventory WHERE ${whereClause} GROUP BY status`,
      params
    );

    const result: Record<string, number> = { total: 0, unused: 0, reserved: 0, used: 0, claimed: 0, expired: 0, voided: 0 };
    stats.forEach((s: any) => {
      result[s.status] = Number(s.count);
      result.total += Number(s.count);
    });

    res.json({ success: true, data: result });
  } catch (error) {
    log.error('[虚拟库存] 获取卡密统计失败:', error);
    res.json({ success: true, data: { total: 0, unused: 0, reserved: 0, used: 0, claimed: 0, expired: 0, voided: 0 } });
  }
});

/**
 * POST /card-keys - 单个添加卡密
 */
router.post('/card-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, cardKey, usageInstructions } = req.body;

    if (!productId || !cardKey) {
      return res.status(400).json({ success: false, message: '商品ID和卡密编码不能为空' });
    }

    // 唯一性校验
    const ds = getDataSource();
    const [existing] = await ds.query(
      'SELECT id FROM card_key_inventory WHERE tenant_id = ? AND card_key = ?',
      [tenantId, cardKey.trim()]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: '该卡密已存在' });
    }

    const id = uuidv4();
    await ds.query(
      `INSERT INTO card_key_inventory (id, tenant_id, product_id, card_key, status, usage_instructions, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'unused', ?, NOW(), NOW())`,
      [id, tenantId, productId, cardKey.trim(), usageInstructions || null]
    );

    // 🔥 同步商品库存
    await syncVirtualProductStock(productId, 'card_key', tenantId);

    res.status(201).json({ success: true, data: { id }, message: '卡密添加成功' });
  } catch (error) {
    log.error('[虚拟库存] 添加卡密失败:', error);
    res.status(500).json({ success: false, message: '添加卡密失败' });
  }
});

/**
 * POST /card-keys/batch - 批量导入卡密
 */
router.post('/card-keys/batch', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, cardKeys, usageInstructions } = req.body;

    if (!productId || !Array.isArray(cardKeys) || cardKeys.length === 0) {
      return res.status(400).json({ success: false, message: '商品ID和卡密列表不能为空' });
    }

    const ds = getDataSource();
    let success = 0;
    let duplicate = 0;
    const errors: string[] = [];

    for (const key of cardKeys) {
      const trimmedKey = String(key).trim();
      if (!trimmedKey) continue;

      try {
        const [existing] = await ds.query(
          'SELECT id FROM card_key_inventory WHERE tenant_id = ? AND card_key = ?',
          [tenantId, trimmedKey]
        );
        if (existing) {
          duplicate++;
          continue;
        }

        await ds.query(
          `INSERT INTO card_key_inventory (id, tenant_id, product_id, card_key, status, usage_instructions, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'unused', ?, NOW(), NOW())`,
          [uuidv4(), tenantId, productId, trimmedKey, usageInstructions || null]
        );
        success++;
      } catch (e: any) {
        errors.push(`${trimmedKey}: ${e.message}`);
      }
    }

    // 🔥 同步商品库存
    await syncVirtualProductStock(productId, 'card_key', tenantId);

    res.json({ success: true, data: { success, duplicate, errors, total: cardKeys.length } });
  } catch (error) {
    log.error('[虚拟库存] 批量导入卡密失败:', error);
    res.status(500).json({ success: false, message: '批量导入失败' });
  }
});

/**
 * PUT /card-keys/:id - 修改卡密状态
 */
router.put('/card-keys/:id', async (req: Request, res: Response, next: NextFunction) => {
  // 跳过已知子路径，让后续具体路由处理
  if (['instructions', 'batch-associate'].includes(req.params.id)) return next('route');
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;

    // 状态转换规则
    const allowedTransitions: Record<string, string[]> = {
      unused: ['expired', 'voided'],
      expired: ['unused'],
      voided: ['unused']
    };

    const ds = getDataSource();
    const [item] = await ds.query(
      'SELECT status FROM card_key_inventory WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '卡密不存在' });
    }

    const allowed = allowedTransitions[item.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `不允许从 ${item.status} 变更为 ${status}` });
    }

    await ds.query(
      'UPDATE card_key_inventory SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [status, id, tenantId]
    );

    // 🔥 同步商品库存（作废-1，恢复+1）
    const [itemForSync] = await ds.query('SELECT product_id FROM card_key_inventory WHERE id = ?', [id]);
    if (itemForSync) {
      await syncVirtualProductStock(itemForSync.product_id, 'card_key', tenantId);
    }

    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    log.error('[虚拟库存] 更新卡密状态失败:', error);
    res.status(500).json({ success: false, message: '状态更新失败' });
  }
});

/**
 * POST /card-keys/reserve - 下单时预占卡密
 */
router.post('/card-keys/reserve', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, orderId } = req.body;

    const ds = getDataSource();
    const [available] = await ds.query(
      `SELECT id FROM card_key_inventory WHERE tenant_id = ? AND product_id = ? AND status = 'unused' LIMIT 1`,
      [tenantId, productId]
    );

    if (!available) {
      return res.status(400).json({ success: false, message: '该商品无可用卡密' });
    }

    await ds.query(
      `UPDATE card_key_inventory SET status = 'reserved', reserved_order_id = ?, updated_at = NOW() WHERE id = ?`,
      [orderId, available.id]
    );

    res.json({ success: true, data: { cardKeyId: available.id }, message: '卡密预占成功' });
  } catch (error) {
    log.error('[虚拟库存] 预占卡密失败:', error);
    res.status(500).json({ success: false, message: '预占失败' });
  }
});

/**
 * POST /card-keys/release - 释放预占卡密
 */
router.post('/card-keys/release', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { orderId } = req.body;

    await getDataSource().query(
      `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW()
       WHERE tenant_id = ? AND reserved_order_id = ? AND status = 'reserved'`,
      [tenantId, orderId]
    );

    res.json({ success: true, message: '卡密释放成功' });
  } catch (error) {
    log.error('[虚拟库存] 释放卡密失败:', error);
    res.status(500).json({ success: false, message: '释放失败' });
  }
});

/**
 * GET /card-keys/:id - 卡密详情
 */
router.get('/card-keys/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const ds = getDataSource();

    const [item] = await ds.query(
      `SELECT * FROM card_key_inventory WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '卡密不存在' });
    }

    // 单独查询商品名称
    let productName = '';
    if (item.product_id) {
      try {
        const [prod] = await ds.query(`SELECT name FROM products WHERE id = ?`, [item.product_id]);
        productName = prod?.name || '';
      } catch (_e) { /* ignore */ }
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        productId: item.product_id,
        productName,
        cardKey: item.card_key,
        status: item.status,
        orderId: item.order_id,
        reservedOrderId: item.reserved_order_id,
        claimToken: item.claim_token,
        claimMethod: item.claim_method,
        claimedAt: item.claimed_at,
        usageInstructions: item.usage_instructions,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }
    });
  } catch (error) {
    log.error('[虚拟库存] 获取卡密详情失败:', error);
    res.status(500).json({ success: false, message: '获取卡密详情失败' });
  }
});

/**
 * DELETE /card-keys/:id - 删除卡密（仅允许删除未使用/已作废/已过期的）
 */
router.delete('/card-keys/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const ds = getDataSource();

    const [item] = await ds.query(
      'SELECT status FROM card_key_inventory WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '卡密不存在' });
    }

    const deletableStatuses = ['unused', 'voided', 'expired'];
    if (!deletableStatuses.includes(item.status)) {
      return res.status(400).json({ success: false, message: `状态为"${item.status}"的卡密不能删除，仅可删除未使用/已作废/已过期的卡密` });
    }

    // 🔥 先获取product_id用于同步库存
    const [itemForDel] = await ds.query('SELECT product_id FROM card_key_inventory WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    await ds.query('DELETE FROM card_key_inventory WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (itemForDel) {
      await syncVirtualProductStock(itemForDel.product_id, 'card_key', tenantId);
    }
    res.json({ success: true, message: '卡密删除成功' });
  } catch (error) {
    log.error('[虚拟库存] 删除卡密失败:', error);
    res.status(500).json({ success: false, message: '删除卡密失败' });
  }
});

/**
 * PUT /card-keys/instructions - 批量更新使用说明
 */
router.put('/card-keys/instructions', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, usageInstructions } = req.body;

    await getDataSource().query(
      'UPDATE card_key_inventory SET usage_instructions = ?, updated_at = NOW() WHERE product_id = ? AND tenant_id = ?',
      [usageInstructions, productId, tenantId]
    );

    res.json({ success: true, message: '使用说明更新成功' });
  } catch (error) {
    log.error('[虚拟库存] 更新使用说明失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// ==================== 资源库存 ====================

/**
 * GET /resources - 资源列表（分页 + 筛选）
 */
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, status, keyword, page = '1', pageSize = '20' } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.max(1, Math.min(100, Number(pageSize) || 20));
    const offset = (pageNum - 1) * pageSizeNum;

    const ds = getDataSource();
    let whereClause = 'r.tenant_id = ?';
    const params: any[] = [tenantId];

    if (productId) { whereClause += ' AND r.product_id = ?'; params.push(productId); }
    if (status) { whereClause += ' AND r.status = ?'; params.push(status); }
    if (keyword) { whereClause += ' AND r.resource_link LIKE ?'; params.push(`%${keyword}%`); }

    // 分步查询
    let total = 0;
    try {
      const [countResult] = await ds.query(
        `SELECT COUNT(*) as total FROM resource_inventory r WHERE ${whereClause}`, [...params]
      );
      total = Number(countResult?.total || 0);
    } catch (countErr) {
      log.error('[虚拟库存] 资源COUNT查询失败:', countErr);
    }

    // ⭐ 两步查询法：先查库存表，再批量查商品名，彻底避免 LEFT JOIN 问题
    let list: any[] = [];
    try {
      list = await ds.query(
        `SELECT * FROM resource_inventory r WHERE ${whereClause}
         ORDER BY r.created_at DESC
         LIMIT ${pageSizeNum} OFFSET ${offset}`,
        [...params]
      );
    } catch (listErr) {
      log.error('[虚拟库存] 资源列表查询失败:', listErr);
    }

    // 批量查询关联商品名称
    const productNameMap: Record<string, string> = {};
    if (list.length > 0) {
      const productIds = [...new Set(list.map((r: any) => r.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        try {
          const placeholders = productIds.map(() => '?').join(',');
          const products = await ds.query(
            `SELECT id, name FROM products WHERE id IN (${placeholders})`,
            productIds
          );
          products.forEach((p: any) => { productNameMap[p.id] = p.name; });
          log.info(`[虚拟库存] 资源列表商品名映射: ${JSON.stringify(productNameMap)}`);
        } catch (prodErr) {
          log.error('[虚拟库存] 批量查询商品名失败:', prodErr);
        }
      }
    }

    // 批量查询关联订单号
    const orderNumberMap: Record<string, string> = {};
    if (list.length > 0) {
      const orderIds = [...new Set([
        ...list.map((r: any) => r.order_id).filter(Boolean),
        ...list.map((r: any) => r.reserved_order_id).filter(Boolean)
      ])];
      if (orderIds.length > 0) {
        try {
          const placeholders = orderIds.map(() => '?').join(',');
          const orders = await ds.query(
            `SELECT id, order_number FROM orders WHERE id IN (${placeholders})`,
            orderIds
          );
          orders.forEach((o: any) => { orderNumberMap[o.id] = o.order_number; });
        } catch (orderErr) {
          log.error('[虚拟库存] 批量查询订单号失败:', orderErr);
        }
      }
    }

    res.json({
      success: true,
      data: {
        list: list.map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: productNameMap[item.product_id] || '',
          resourceLink: item.resource_link,
          resourcePassword: item.resource_password,
          resourceDescription: item.resource_description,
          status: item.status,
          orderId: item.order_id,
          orderNumber: orderNumberMap[item.order_id] || null,
          reservedOrderId: item.reserved_order_id,
          reservedOrderNumber: orderNumberMap[item.reserved_order_id] || null,
          claimToken: item.claim_token,
          claimMethod: item.claim_method,
          claimedAt: item.claimed_at,
          usageInstructions: item.usage_instructions,
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    log.error('[虚拟库存] 获取资源列表失败(顶层):', error);
    res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });
  }
});

/**
 * GET /resources/stats - 资源统计
 */
router.get('/resources/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId } = req.query;

    let whereClause = 'tenant_id = ?';
    const params: any[] = [tenantId];
    if (productId) { whereClause += ' AND product_id = ?'; params.push(productId); }

    const stats = await getDataSource().query(
      `SELECT status, COUNT(*) as count FROM resource_inventory WHERE ${whereClause} GROUP BY status`,
      params
    );

    const result: Record<string, number> = { total: 0, unused: 0, reserved: 0, used: 0, claimed: 0, expired: 0, voided: 0 };
    stats.forEach((s: any) => { result[s.status] = Number(s.count); result.total += Number(s.count); });

    res.json({ success: true, data: result });
  } catch (error) {
    log.error('[虚拟库存] 获取资源统计失败:', error);
    res.json({ success: true, data: { total: 0, unused: 0, reserved: 0, used: 0, claimed: 0, expired: 0, voided: 0 } });
  }
});

/**
 * POST /resources - 单个添加资源
 */
router.post('/resources', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, resourceLink, resourcePassword, resourceDescription, usageInstructions } = req.body;

    if (!productId || !resourceLink) {
      return res.status(400).json({ success: false, message: '商品ID和资源链接不能为空' });
    }

    const ds = getDataSource();
    const id = uuidv4();
    await ds.query(
      `INSERT INTO resource_inventory (id, tenant_id, product_id, resource_link, resource_password, resource_description, status, usage_instructions, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'unused', ?, NOW(), NOW())`,
      [id, tenantId, productId, resourceLink.trim(), resourcePassword || null, resourceDescription || null, usageInstructions || null]
    );

    // 🔥 同步商品库存
    await syncVirtualProductStock(productId, 'resource_link', tenantId);

    res.status(201).json({ success: true, data: { id }, message: '资源添加成功' });
  } catch (error) {
    log.error('[虚拟库存] 添加资源失败:', error);
    res.status(500).json({ success: false, message: '添加资源失败' });
  }
});

/**
 * POST /resources/batch - 批量导入资源
 */
router.post('/resources/batch', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, resources, usageInstructions } = req.body;
    // resources: [{ resourceLink, resourcePassword?, resourceDescription? }]

    if (!productId || !Array.isArray(resources) || resources.length === 0) {
      return res.status(400).json({ success: false, message: '商品ID和资源列表不能为空' });
    }

    const ds = getDataSource();
    let success = 0;
    const errors: string[] = [];

    for (const item of resources) {
      const link = String(item.resourceLink || '').trim();
      if (!link) continue;

      try {
        await ds.query(
          `INSERT INTO resource_inventory (id, tenant_id, product_id, resource_link, resource_password, resource_description, status, usage_instructions, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'unused', ?, NOW(), NOW())`,
          [uuidv4(), tenantId, productId, link, item.resourcePassword || null, item.resourceDescription || null, usageInstructions || null]
        );
        success++;
      } catch (e: any) {
        errors.push(`${link}: ${e.message}`);
      }
    }

    // 🔥 同步商品库存
    await syncVirtualProductStock(productId, 'resource_link', tenantId);

    res.json({ success: true, data: { success, errors, total: resources.length } });
  } catch (error) {
    log.error('[虚拟库存] 批量导入资源失败:', error);
    res.status(500).json({ success: false, message: '批量导入失败' });
  }
});

/**
 * PUT /resources/:id - 修改资源状态
 */
router.put('/resources/:id', async (req: Request, res: Response, next: NextFunction) => {
  // 跳过已知子路径，让后续具体路由处理
  if (['instructions', 'batch-associate'].includes(req.params.id)) return next('route');
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { status } = req.body;

    const allowedTransitions: Record<string, string[]> = {
      unused: ['expired', 'voided'],
      expired: ['unused'],
      voided: ['unused']
    };

    const ds = getDataSource();
    const [item] = await ds.query(
      'SELECT status FROM resource_inventory WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '资源不存在' });
    }

    const allowed = allowedTransitions[item.status];
    if (!allowed || !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `不允许从 ${item.status} 变更为 ${status}` });
    }

    await ds.query(
      'UPDATE resource_inventory SET status = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?',
      [status, id, tenantId]
    );

    // 🔥 同步商品库存
    const [resForSync] = await ds.query('SELECT product_id FROM resource_inventory WHERE id = ?', [id]);
    if (resForSync) {
      await syncVirtualProductStock(resForSync.product_id, 'resource_link', tenantId);
    }

    res.json({ success: true, message: '状态更新成功' });
  } catch (error) {
    log.error('[虚拟库存] 更新资源状态失败:', error);
    res.status(500).json({ success: false, message: '状态更新失败' });
  }
});

/**
 * POST /resources/reserve - 下单时预占资源
 */
router.post('/resources/reserve', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, orderId } = req.body;

    const ds = getDataSource();
    const [available] = await ds.query(
      `SELECT id FROM resource_inventory WHERE tenant_id = ? AND product_id = ? AND status = 'unused' LIMIT 1`,
      [tenantId, productId]
    );

    if (!available) {
      return res.status(400).json({ success: false, message: '该商品无可用资源' });
    }

    await ds.query(
      `UPDATE resource_inventory SET status = 'reserved', reserved_order_id = ?, updated_at = NOW() WHERE id = ?`,
      [orderId, available.id]
    );

    res.json({ success: true, data: { resourceId: available.id }, message: '资源预占成功' });
  } catch (error) {
    log.error('[虚拟库存] 预占资源失败:', error);
    res.status(500).json({ success: false, message: '预占失败' });
  }
});

/**
 * POST /resources/release - 释放预占资源
 */
router.post('/resources/release', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { orderId } = req.body;

    await getDataSource().query(
      `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW()
       WHERE tenant_id = ? AND reserved_order_id = ? AND status = 'reserved'`,
      [tenantId, orderId]
    );

    res.json({ success: true, message: '资源释放成功' });
  } catch (error) {
    log.error('[虚拟库存] 释放资源失败:', error);
    res.status(500).json({ success: false, message: '释放失败' });
  }
});

/**
 * GET /resources/:id - 资源详情
 */
router.get('/resources/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const ds = getDataSource();

    const [item] = await ds.query(
      `SELECT * FROM resource_inventory WHERE id = ? AND tenant_id = ?`,
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '资源不存在' });
    }

    // 单独查询商品名称
    let productName = '';
    if (item.product_id) {
      try {
        const [prod] = await ds.query(`SELECT name FROM products WHERE id = ?`, [item.product_id]);
        productName = prod?.name || '';
      } catch (_e) { /* ignore */ }
    }

    res.json({
      success: true,
      data: {
        id: item.id,
        productId: item.product_id,
        productName,
        resourceLink: item.resource_link,
        resourcePassword: item.resource_password,
        resourceDescription: item.resource_description,
        status: item.status,
        orderId: item.order_id,
        reservedOrderId: item.reserved_order_id,
        claimToken: item.claim_token,
        claimMethod: item.claim_method,
        claimedAt: item.claimed_at,
        usageInstructions: item.usage_instructions,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }
    });
  } catch (error) {
    log.error('[虚拟库存] 获取资源详情失败:', error);
    res.status(500).json({ success: false, message: '获取资源详情失败' });
  }
});

/**
 * DELETE /resources/:id - 删除资源（仅允许删除未使用/已作废/已过期的）
 */
router.delete('/resources/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const ds = getDataSource();

    const [item] = await ds.query(
      'SELECT status FROM resource_inventory WHERE id = ? AND tenant_id = ?',
      [id, tenantId]
    );
    if (!item) {
      return res.status(404).json({ success: false, message: '资源不存在' });
    }

    const deletableStatuses = ['unused', 'voided', 'expired'];
    if (!deletableStatuses.includes(item.status)) {
      return res.status(400).json({ success: false, message: `状态为"${item.status}"的资源不能删除，仅可删除未使用/已作废/已过期的资源` });
    }

    // 🔥 先获取product_id用于同步库存
    const [resForDel] = await ds.query('SELECT product_id FROM resource_inventory WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    await ds.query('DELETE FROM resource_inventory WHERE id = ? AND tenant_id = ?', [id, tenantId]);
    if (resForDel) {
      await syncVirtualProductStock(resForDel.product_id, 'resource_link', tenantId);
    }
    res.json({ success: true, message: '资源删除成功' });
  } catch (error) {
    log.error('[虚拟库存] 删除资源失败:', error);
    res.status(500).json({ success: false, message: '删除资源失败' });
  }
});

/**
 * PUT /resources/instructions - 批量更新使用说明
 */
router.put('/resources/instructions', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { productId, usageInstructions } = req.body;

    await getDataSource().query(
      'UPDATE resource_inventory SET usage_instructions = ?, updated_at = NOW() WHERE product_id = ? AND tenant_id = ?',
      [usageInstructions, productId, tenantId]
    );

    res.json({ success: true, message: '使用说明更新成功' });
  } catch (error) {
    log.error('[虚拟库存] 更新使用说明失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

// ==================== 批量关联/取消关联商品 ====================

/**
 * PUT /card-keys/batch-associate - 批量关联卡密到商品
 */
router.put('/card-keys/batch-associate', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { ids, productId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要操作的卡密' });
    }
    const ds = getDataSource();
    const placeholders = ids.map(() => '?').join(',');

    // 🔥 保护已使用/已领取/已预占的卡密，不允许重新关联
    const protectedItems = await ds.query(
      `SELECT id, status FROM card_key_inventory WHERE id IN (${placeholders}) AND tenant_id = ? AND status IN ('used', 'claimed', 'reserved')`,
      [...ids, tenantId]
    );
    if (protectedItems.length > 0) {
      return res.status(400).json({ success: false, message: `有 ${protectedItems.length} 个卡密已被使用/领取/预占，无法修改关联` });
    }

    if (productId) {
      await ds.query(
        `UPDATE card_key_inventory SET product_id = ?, updated_at = NOW() WHERE id IN (${placeholders}) AND tenant_id = ? AND status NOT IN ('used', 'claimed', 'reserved')`,
        [productId, ...ids, tenantId]
      );
      await syncVirtualProductStock(productId, 'card_key', tenantId);
    } else {
      // 取消关联：先获取旧商品ID用于同步（排除已使用/已领取/已预占）
      const oldItems = await ds.query(
        `SELECT DISTINCT product_id FROM card_key_inventory WHERE id IN (${placeholders}) AND tenant_id = ? AND product_id IS NOT NULL AND status NOT IN ('used', 'claimed', 'reserved')`,
        [...ids, tenantId]
      );
      await ds.query(
        `UPDATE card_key_inventory SET product_id = NULL, updated_at = NOW() WHERE id IN (${placeholders}) AND tenant_id = ? AND status NOT IN ('used', 'claimed', 'reserved')`,
        [...ids, tenantId]
      );
      for (const item of oldItems) {
        if (item.product_id) await syncVirtualProductStock(item.product_id, 'card_key', tenantId);
      }
    }
    res.json({ success: true, message: productId ? '关联成功' : '取消关联成功' });
  } catch (error) {
    log.error('[虚拟库存] 批量关联卡密失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

/**
 * PUT /resources/batch-associate - 批量关联资源到商品
 */
router.put('/resources/batch-associate', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { ids, productId } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要操作的资源' });
    }
    const ds = getDataSource();
    const placeholders = ids.map(() => '?').join(',');

    // 🔥 保护已使用/已领取/已预占的资源，不允许重新关联
    const protectedItems = await ds.query(
      `SELECT id, status FROM resource_inventory WHERE id IN (${placeholders}) AND tenant_id = ? AND status IN ('used', 'claimed', 'reserved')`,
      [...ids, tenantId]
    );
    if (protectedItems.length > 0) {
      return res.status(400).json({ success: false, message: `有 ${protectedItems.length} 个资源已被使用/领取/预占，无法修改关联` });
    }

    if (productId) {
      await ds.query(
        `UPDATE resource_inventory SET product_id = ?, updated_at = NOW() WHERE id IN (${placeholders}) AND tenant_id = ? AND status NOT IN ('used', 'claimed', 'reserved')`,
        [productId, ...ids, tenantId]
      );
      await syncVirtualProductStock(productId, 'resource_link', tenantId);
    } else {
      const oldItems = await ds.query(
        `SELECT DISTINCT product_id FROM resource_inventory WHERE id IN (${placeholders}) AND tenant_id = ? AND product_id IS NOT NULL AND status NOT IN ('used', 'claimed', 'reserved')`,
        [...ids, tenantId]
      );
      await ds.query(
        `UPDATE resource_inventory SET product_id = NULL, updated_at = NOW() WHERE id IN (${placeholders}) AND tenant_id = ? AND status NOT IN ('used', 'claimed', 'reserved')`,
        [...ids, tenantId]
      );
      for (const item of oldItems) {
        if (item.product_id) await syncVirtualProductStock(item.product_id, 'resource_link', tenantId);
      }
    }
    res.json({ success: true, message: productId ? '关联成功' : '取消关联成功' });
  } catch (error) {
    log.error('[虚拟库存] 批量关联资源失败:', error);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

export default router;

