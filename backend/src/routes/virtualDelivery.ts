/**
 * 虚拟发货路由
 * 处理虚拟商品的发货确认、批量发货、查询发货记录
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDataSource } from '../config/database';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { saveStatusHistory } from './orders/orderHelpers';

const router = Router();
router.use(authenticateToken);

// 确保虚拟发货相关表存在
let tablesChecked = false;
async function ensureDeliveryTables() {
  if (tablesChecked) return;
  try {
    const ds = getDataSource();
    await ds.query(`
      CREATE TABLE IF NOT EXISTS virtual_delivery_records (
        id VARCHAR(36) NOT NULL,
        tenant_id VARCHAR(36) DEFAULT NULL,
        order_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) DEFAULT NULL,
        delivery_type VARCHAR(20) NOT NULL,
        card_key_content TEXT DEFAULT NULL,
        resource_link VARCHAR(500) DEFAULT NULL,
        resource_password VARCHAR(100) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        operator_id VARCHAR(36) NOT NULL,
        operator_name VARCHAR(50) DEFAULT NULL,
        delivered_at DATETIME NOT NULL,
        email_sent TINYINT(1) DEFAULT 0,
        email_sent_at DATETIME DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_order_id (order_id),
        KEY idx_tenant_id (tenant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    tablesChecked = true;
  } catch (_e) {
    // 表可能已存在，忽略错误
  }
}

function getTenantId(req: Request): string {
  return (req as any).user?.tenantId || (req as any).tenantId || 'default';
}

function getOperator(req: Request) {
  const user = (req as any).currentUser || (req as any).user;
  return {
    id: user?.id || user?.userId || 'system',
    name: user?.realName || user?.name || user?.username || '系统'
  };
}

/**
 * POST / - 确认虚拟发货
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureDeliveryTables();
    const tenantId = getTenantId(req);
    const operator = getOperator(req);
    const { orderId, items } = req.body;
    // items: [{ productId, cardKeyId?, resourceId?, manualContent?, manualResourceLink?, manualResourcePassword?, deliveryType, remark }]

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: '缺少订单ID或发货项' });
    }

    const ds = getDataSource();

    // 验证订单状态
    const [order] = await ds.query(
      `SELECT id, status, tenant_id FROM orders WHERE id = ? AND tenant_id = ?`,
      [orderId, tenantId]
    );
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    if (order.status !== 'pending_shipment') {
      return res.status(400).json({ success: false, message: `订单状态不允许发货，当前状态: ${order.status}` });
    }

    const claimToken = uuidv4();

    for (const item of items) {
      const deliveryType = item.deliveryType || 'card_key';
      let cardKeyContent: string | null = null;
      let resourceLink: string | null = null;
      let resourcePassword: string | null = null;

      if (deliveryType === 'none') {
        // 无需发货类型，释放该商品预占的库存，直接记录
        if (item.productId) {
          await ds.query(
            `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND tenant_id = ?`,
            [orderId, item.productId, tenantId]
          );
          await ds.query(
            `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND tenant_id = ?`,
            [orderId, item.productId, tenantId]
          );
        }
      } else if (deliveryType === 'card_key') {
        if (item.cardKeyId && !item.manualContent) {
          // 使用库存中的卡密（可能是预占的或新匹配的）
          const [ck] = await ds.query(
            `SELECT card_key FROM card_key_inventory WHERE id = ? AND tenant_id = ?`,
            [item.cardKeyId, tenantId]
          );
          if (ck) {
            cardKeyContent = ck.card_key;
            await ds.query(
              `UPDATE card_key_inventory SET status = 'used', order_id = ?, reserved_order_id = NULL, claim_token = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
              [orderId, claimToken, item.cardKeyId, tenantId]
            );
            // 释放该订单该商品下其他预占的卡密（如果预占了多个只发了一个）
            if (item.productId) {
              await ds.query(
                `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND id != ? AND tenant_id = ?`,
                [orderId, item.productId, item.cardKeyId, tenantId]
              );
            }
          }
        } else if (item.manualContent) {
          // 手动填写的卡密 - 释放预占的，新卡密自动加入库存并标记已使用
          if (item.productId) {
            await ds.query(
              `UPDATE card_key_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND tenant_id = ?`,
              [orderId, item.productId, tenantId]
            );
          }
          cardKeyContent = item.manualContent;
          const newCkId = uuidv4();
          await ds.query(
            `INSERT INTO card_key_inventory (id, tenant_id, product_id, card_key, usage_instructions, status, order_id, claim_token, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 'used', ?, ?, NOW(), NOW())`,
            [newCkId, tenantId, item.productId || null, item.manualContent,
             item.usageInstructions || null, orderId, claimToken]
          );
        }
      } else if (deliveryType === 'resource_link') {
        if (item.resourceId && !item.manualResourceLink?.trim()) {
          const [res_item] = await ds.query(
            `SELECT resource_link, resource_password FROM resource_inventory WHERE id = ? AND tenant_id = ?`,
            [item.resourceId, tenantId]
          );
          if (res_item) {
            resourceLink = res_item.resource_link;
            resourcePassword = res_item.resource_password;
            await ds.query(
              `UPDATE resource_inventory SET status = 'used', order_id = ?, reserved_order_id = NULL, claim_token = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?`,
              [orderId, claimToken, item.resourceId, tenantId]
            );
            // 释放该订单该商品下其他预占的资源
            if (item.productId) {
              await ds.query(
                `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND id != ? AND tenant_id = ?`,
                [orderId, item.productId, item.resourceId, tenantId]
              );
            }
          }
        } else if (item.manualResourceLink) {
          // 手动填写的资源 - 释放预占的，新资源自动加入库存并标记已使用
          if (item.productId) {
            await ds.query(
              `UPDATE resource_inventory SET status = 'unused', reserved_order_id = NULL, updated_at = NOW() WHERE reserved_order_id = ? AND product_id = ? AND status = 'reserved' AND tenant_id = ?`,
              [orderId, item.productId, tenantId]
            );
          }
          resourceLink = item.manualResourceLink;
          resourcePassword = item.manualResourcePassword || null;
          const newResId = uuidv4();
          await ds.query(
            `INSERT INTO resource_inventory (id, tenant_id, product_id, resource_link, resource_password, usage_instructions, status, order_id, claim_token, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'used', ?, ?, NOW(), NOW())`,
            [newResId, tenantId, item.productId || null, item.manualResourceLink,
             item.manualResourcePassword || null, item.usageInstructions || null,
             orderId, claimToken]
          );
        }
      }

      // 写入发货记录
      await ds.query(
        `INSERT INTO virtual_delivery_records
         (id, tenant_id, order_id, product_id, delivery_type, card_key_content, resource_link, resource_password, remark, operator_id, operator_name, delivered_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), tenantId, orderId, item.productId || null, deliveryType,
         cardKeyContent, resourceLink, resourcePassword,
         item.remark || null, operator.id, operator.name]
      );
    }

    // 更新订单状态为已签收（虚拟商品发货完成后统一用 signed），同时设置 shipped_at 用于排序
    await ds.query(
      `UPDATE orders SET status = 'signed', completion_source = 'virtual_delivery', shipped_at = NOW() WHERE id = ?`,
      [orderId]
    );

    // 🔥 记录状态历史 - 虚拟发货签收，记录真实操作人
    await saveStatusHistory(orderId, 'signed', operator.id, operator.name, '虚拟商品发货完成，订单自动签收', {
      actionType: 'virtual_delivery'
    });

    // 更新所有该订单预占中未处理的卡密/资源的claim_token
    await ds.query(
      `UPDATE card_key_inventory SET claim_token = ? WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
      [claimToken, orderId, tenantId]
    );
    await ds.query(
      `UPDATE resource_inventory SET claim_token = ? WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ?`,
      [claimToken, orderId, tenantId]
    );

    const claimLink = `/virtual-claim/${claimToken}`;
    log.info(`✅ [虚拟发货] 订单 ${orderId} 发货成功，领取令牌: ${claimToken}`);

    res.json({
      success: true,
      data: { claimLink, claimToken },
      message: '虚拟发货成功'
    });
  } catch (error) {
    log.error('[虚拟发货] 发货失败:', error);
    res.status(500).json({ success: false, message: '发货失败' });
  }
});

/**
 * POST /batch - 批量虚拟发货（使用预占的库存自动发货）
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    await ensureDeliveryTables();
    const tenantId = getTenantId(req);
    const operator = getOperator(req);
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: '缺少订单ID列表' });
    }

    const ds = getDataSource();
    const results: any[] = [];

    for (const orderId of orderIds) {
      try {
        const [order] = await ds.query(
          `SELECT id, status, products FROM orders WHERE id = ? AND tenant_id = ? AND status = 'pending_shipment'`,
          [orderId, tenantId]
        );
        if (!order) {
          results.push({ orderId, status: 'skipped', reason: '订单不存在或状态不对' });
          continue;
        }

        const claimToken = uuidv4();
        let products: any[] = [];
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products) : (order.products || []);
        } catch { products = []; }

        let allDelivered = true;

        for (const product of products) {
          if (product.productType !== 'virtual') continue;
          const productId = product.id || product.productId;

          if (product.virtualDeliveryType === 'card_key') {
            const [ck] = await ds.query(
              `SELECT id, card_key FROM card_key_inventory WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ? LIMIT 1`,
              [orderId, tenantId]
            );
            if (ck) {
              await ds.query(
                `UPDATE card_key_inventory SET status = 'used', order_id = ?, claim_token = ?, updated_at = NOW() WHERE id = ?`,
                [orderId, claimToken, ck.id]
              );
              await ds.query(
                `INSERT INTO virtual_delivery_records (id, tenant_id, order_id, product_id, delivery_type, card_key_content, operator_id, operator_name, delivered_at, created_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())`,
                [uuidv4(), tenantId, orderId, productId, 'card_key', ck.card_key, operator.id, operator.name]
              );
            } else { allDelivered = false; }
          } else if (product.virtualDeliveryType === 'resource_link') {
            const [rs] = await ds.query(
              `SELECT id, resource_link, resource_password FROM resource_inventory WHERE reserved_order_id = ? AND status = 'reserved' AND tenant_id = ? LIMIT 1`,
              [orderId, tenantId]
            );
            if (rs) {
              await ds.query(
                `UPDATE resource_inventory SET status = 'used', order_id = ?, claim_token = ?, updated_at = NOW() WHERE id = ?`,
                [orderId, claimToken, rs.id]
              );
              await ds.query(
                `INSERT INTO virtual_delivery_records (id, tenant_id, order_id, product_id, delivery_type, resource_link, resource_password, operator_id, operator_name, delivered_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
                [uuidv4(), tenantId, orderId, productId, 'resource_link', rs.resource_link, rs.resource_password, operator.id, operator.name]
              );
            } else { allDelivered = false; }
          } else if (product.virtualDeliveryType === 'none') {
            // 无需发货的直接跳过
          }
        }

        if (allDelivered) {
          await ds.query(
            `UPDATE orders SET status = 'signed', completion_source = 'virtual_delivery', shipped_at = NOW() WHERE id = ?`,
            [orderId]
          );
          // 🔥 记录状态历史 - 批量虚拟发货签收，记录真实操作人
          await saveStatusHistory(orderId, 'signed', operator.id, operator.name, '批量虚拟发货完成，订单自动签收', {
            actionType: 'virtual_delivery'
          });
          results.push({ orderId, status: 'success', claimToken });
        } else {
          results.push({ orderId, status: 'partial', reason: '部分商品无库存，需手动发货' });
        }
      } catch (e: any) {
        results.push({ orderId, status: 'error', reason: e.message });
      }
    }

    res.json({ success: true, data: { results }, message: '批量发货完成' });
  } catch (error) {
    log.error('[虚拟发货] 批量发货失败:', error);
    res.status(500).json({ success: false, message: '批量发货失败' });
  }
});

/**
 * GET /:orderId - 查询订单的虚拟发货记录
 */
router.get('/:orderId', async (req: Request, res: Response) => {
  try {
    await ensureDeliveryTables();
    const tenantId = getTenantId(req);
    const { orderId } = req.params;
    const ds = getDataSource();

    // 先尝试包含 virtual_content_encrypt 字段的查询，如果列不存在则降级
    let records: any[] = [];
    try {
      records = await ds.query(
        `SELECT vdr.*, p.name as product_name, p.virtual_content_encrypt
         FROM virtual_delivery_records vdr
         LEFT JOIN products p ON vdr.product_id = p.id
         WHERE vdr.order_id = ? AND (vdr.tenant_id = ? OR vdr.tenant_id IS NULL)
         ORDER BY vdr.delivered_at DESC`,
        [orderId, tenantId]
      );
    } catch (queryErr: any) {
      // 降级查询：不查 virtual_content_encrypt 列（可能不存在）
      log.warn('[虚拟发货] 主查询失败，尝试降级查询:', queryErr?.message);
      try {
        records = await ds.query(
          `SELECT vdr.*, p.name as product_name
           FROM virtual_delivery_records vdr
           LEFT JOIN products p ON vdr.product_id = p.id
           WHERE vdr.order_id = ? AND (vdr.tenant_id = ? OR vdr.tenant_id IS NULL)
           ORDER BY vdr.delivered_at DESC`,
          [orderId, tenantId]
        );
      } catch (fallbackErr: any) {
        // 最终降级：只查发货记录表
        log.warn('[虚拟发货] 降级查询也失败，仅查发货记录表:', fallbackErr?.message);
        records = await ds.query(
          `SELECT * FROM virtual_delivery_records
           WHERE order_id = ? AND (tenant_id = ? OR tenant_id IS NULL)
           ORDER BY delivered_at DESC`,
          [orderId, tenantId]
        );
      }
    }

    // 查询该订单的 claim_token（从卡密或资源库存表，安全查询）
    let claimToken: string | null = null;
    try {
      const ckTokenRows = await ds.query(
        `SELECT claim_token FROM card_key_inventory WHERE order_id = ? AND claim_token IS NOT NULL AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1`,
        [orderId, tenantId]
      );
      if (ckTokenRows && ckTokenRows.length > 0) {
        claimToken = ckTokenRows[0].claim_token;
      } else {
        const rsTokenRows = await ds.query(
          `SELECT claim_token FROM resource_inventory WHERE order_id = ? AND claim_token IS NOT NULL AND (tenant_id = ? OR tenant_id IS NULL) LIMIT 1`,
          [orderId, tenantId]
        );
        if (rsTokenRows && rsTokenRows.length > 0) {
          claimToken = rsTokenRows[0].claim_token;
        }
      }
    } catch (tokenErr) {
      log.warn('[虚拟发货] 查询claim_token失败（库存表可能不存在）:', (tokenErr as any)?.message);
    }

    // 🔥 回退策略：如果 JOIN 没有获取到加密标记（product_id 为空），从订单的 products JSON 中查找
    let orderEncryptFallback: boolean | null = null;
    const hasNullEncrypt = records.some((r: any) => r.virtual_content_encrypt === null || r.virtual_content_encrypt === undefined);
    if (hasNullEncrypt) {
      try {
        const [order] = await ds.query(
          `SELECT products FROM orders WHERE id = ? AND (tenant_id = ? OR tenant_id IS NULL)`,
          [orderId, tenantId]
        );
        if (order?.products) {
          const products = typeof order.products === 'string' ? JSON.parse(order.products) : (order.products || []);
          // 获取所有虚拟商品的 productId
          const virtualProductIds = products
            .filter((p: any) => p.productType === 'virtual')
            .map((p: any) => p.id || p.productId)
            .filter(Boolean);
          if (virtualProductIds.length > 0) {
            const placeholders = virtualProductIds.map(() => '?').join(',');
            const encryptRows = await ds.query(
              `SELECT virtual_content_encrypt FROM products WHERE id IN (${placeholders}) AND virtual_content_encrypt = 1 LIMIT 1`,
              virtualProductIds
            );
            orderEncryptFallback = encryptRows && encryptRows.length > 0;
          }
        }
      } catch (fallbackErr) {
        log.warn('[虚拟发货] 回退查询加密标记失败:', (fallbackErr as any)?.message);
      }
    }

    res.json({
      success: true,
      data: records.map((r: any) => ({
        id: r.id,
        orderId: r.order_id,
        productId: r.product_id,
        productName: r.product_name || '',
        deliveryType: r.delivery_type,
        cardKeyContent: r.card_key_content,
        resourceLink: r.resource_link,
        resourcePassword: r.resource_password,
        virtualContentEncrypt: r.virtual_content_encrypt !== null && r.virtual_content_encrypt !== undefined
          ? !!r.virtual_content_encrypt
          : (orderEncryptFallback === true),
        remark: r.remark,
        operatorId: r.operator_id,
        operatorName: r.operator_name,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
        claimToken  // 附带领取令牌
      }))
    });
  } catch (error) {
    log.error('[虚拟发货] 查询发货记录失败:', error);
    // 返回空数组而不是500，避免前端崩溃
    res.json({ success: true, data: [] });
  }
});

/**
 * POST /:orderId/mark-member-send - 标记成员发送（成员在订单详情页复制卡密/资源后调用）
 */
router.post('/:orderId/mark-member-send', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { orderId } = req.params;
    const ds = getDataSource();

    // 将该订单关联的卡密和资源标记为 member_send（仅更新 status=used 且尚未被客户领取的）
    const ckResult = await ds.query(
      `UPDATE card_key_inventory SET status = 'claimed', claim_method = 'member_send', claimed_at = NOW()
       WHERE order_id = ? AND status = 'used' AND (claim_method IS NULL OR claim_method = '') AND (tenant_id = ? OR tenant_id IS NULL)`,
      [orderId, tenantId]
    );
    const rsResult = await ds.query(
      `UPDATE resource_inventory SET status = 'claimed', claim_method = 'member_send', claimed_at = NOW()
       WHERE order_id = ? AND status = 'used' AND (claim_method IS NULL OR claim_method = '') AND (tenant_id = ? OR tenant_id IS NULL)`,
      [orderId, tenantId]
    );

    const affected = (ckResult?.affectedRows || 0) + (rsResult?.affectedRows || 0);
    log.info(`[虚拟发货] 订单 ${orderId} 标记成员发送，影响 ${affected} 条记录`);
    res.json({ success: true, data: { affected }, message: '已标记为成员发送' });
  } catch (error) {
    log.error('[虚拟发货] 标记成员发送失败:', error);
    res.status(500).json({ success: false, message: '标记失败' });
  }
});

export default router;
