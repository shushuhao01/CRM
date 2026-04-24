/**
 * 虚拟发货路由
 * 处理虚拟商品的发货确认、批量发货、查询发货记录
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDataSource } from '../config/database';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticateToken);

function getTenantId(req: Request): string | null {
  return (req as any).user?.tenantId || null;
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
    if (order.status !== 'virtual_pending') {
      return res.status(400).json({ success: false, message: `订单状态不允许发货，当前状态: ${order.status}` });
    }

    const claimToken = uuidv4();

    for (const item of items) {
      const deliveryType = item.deliveryType || 'card_key';
      let cardKeyContent: string | null = null;
      let resourceLink: string | null = null;
      let resourcePassword: string | null = null;

      if (deliveryType === 'card_key') {
        if (item.cardKeyId) {
          // 使用库存中的卡密
          const [ck] = await ds.query(
            `SELECT card_key FROM card_key_inventory WHERE id = ? AND tenant_id = ?`,
            [item.cardKeyId, tenantId]
          );
          if (ck) {
            cardKeyContent = ck.card_key;
            await ds.query(
              `UPDATE card_key_inventory SET status = 'used', order_id = ?, claim_token = ?, updated_at = NOW() WHERE id = ?`,
              [orderId, claimToken, item.cardKeyId]
            );
          }
        } else if (item.manualContent) {
          // 手动填写的卡密
          cardKeyContent = item.manualContent;
        }
      } else if (deliveryType === 'resource_link') {
        if (item.resourceId) {
          const [res_item] = await ds.query(
            `SELECT resource_link, resource_password FROM resource_inventory WHERE id = ? AND tenant_id = ?`,
            [item.resourceId, tenantId]
          );
          if (res_item) {
            resourceLink = res_item.resource_link;
            resourcePassword = res_item.resource_password;
            await ds.query(
              `UPDATE resource_inventory SET status = 'used', order_id = ?, claim_token = ?, updated_at = NOW() WHERE id = ?`,
              [orderId, claimToken, item.resourceId]
            );
          }
        } else if (item.manualResourceLink) {
          resourceLink = item.manualResourceLink;
          resourcePassword = item.manualResourcePassword || null;
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

    // 更新订单状态为已签收（虚拟商品发货完成后统一用 signed）
    await ds.query(
      `UPDATE orders SET status = 'signed', completion_source = 'virtual_delivery' WHERE id = ?`,
      [orderId]
    );

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
          `SELECT id, status, products FROM orders WHERE id = ? AND tenant_id = ? AND status = 'virtual_pending'`,
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
            `UPDATE orders SET status = 'signed', completion_source = 'virtual_delivery' WHERE id = ?`,
            [orderId]
          );
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
    const tenantId = getTenantId(req);
    const { orderId } = req.params;
    const ds = getDataSource();

    const records = await ds.query(
      `SELECT * FROM virtual_delivery_records WHERE order_id = ? AND tenant_id = ? ORDER BY delivered_at DESC`,
      [orderId, tenantId]
    );

    // 查询该订单的 claim_token（从卡密或资源库存表）
    let claimToken: string | null = null;
    const ckTokenRows = await ds.query(
      `SELECT claim_token FROM card_key_inventory WHERE order_id = ? AND claim_token IS NOT NULL AND tenant_id = ? LIMIT 1`,
      [orderId, tenantId]
    );
    if (ckTokenRows && ckTokenRows.length > 0) {
      claimToken = ckTokenRows[0].claim_token;
    } else {
      const rsTokenRows = await ds.query(
        `SELECT claim_token FROM resource_inventory WHERE order_id = ? AND claim_token IS NOT NULL AND tenant_id = ? LIMIT 1`,
        [orderId, tenantId]
      );
      if (rsTokenRows && rsTokenRows.length > 0) {
        claimToken = rsTokenRows[0].claim_token;
      }
    }

    res.json({
      success: true,
      data: records.map((r: any) => ({
        id: r.id,
        orderId: r.order_id,
        productId: r.product_id,
        deliveryType: r.delivery_type,
        cardKeyContent: r.card_key_content,
        resourceLink: r.resource_link,
        resourcePassword: r.resource_password,
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
    res.status(500).json({ success: false, message: '查询失败' });
  }
});

export default router;

