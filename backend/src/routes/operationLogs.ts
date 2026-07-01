import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { log } from '../config/logger';
import { translateStatus } from '../utils/operationLogWriter';

const router = Router();
router.use(authenticateToken);

/**
 * 批量获取最新操作日志（用于列表列显示）
 * GET /api/v1/operation-logs/latest?module=xxx&resourceIds=id1,id2,...
 */
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const { module: mod, resourceIds } = req.query;
    if (!mod || !resourceIds) {
      return res.json({ success: true, data: {} });
    }

    const ids = String(resourceIds).split(',').filter(Boolean);
    if (ids.length === 0) {
      return res.json({ success: true, data: {} });
    }

    const user = (req as any).user;
    const tenantId = user?.tenantId;

    const placeholders = ids.map(() => '?').join(',');
    let sql = `
      SELECT t.* FROM operation_logs t
      INNER JOIN (
        SELECT resource_id, MAX(created_at) AS max_created
        FROM operation_logs
        WHERE module = ? AND resource_id IN (${placeholders})
        ${tenantId ? 'AND tenant_id = ?' : ''}
        GROUP BY resource_id
      ) latest ON t.resource_id = latest.resource_id AND t.created_at = latest.max_created
      WHERE t.module = ? AND t.resource_id IN (${placeholders})
      ${tenantId ? 'AND t.tenant_id = ?' : ''}
    `;

    const params: any[] = [mod, ...ids];
    if (tenantId) params.push(tenantId);
    params.push(mod, ...ids);
    if (tenantId) params.push(tenantId);

    const rows = await AppDataSource.query(sql, params);

    const result: Record<string, any> = {};
    for (const row of rows) {
      result[row.resource_id] = {
        id: row.id,
        operationType: row.action,
        operationContent: row.description,
        operatorName: row.user_name || '系统',
        operatorId: row.user_id,
        createdAt: row.created_at,
      };
    }

    return res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[操作日志] 获取最新日志失败:', error.message);
    return res.json({ success: true, data: {} });
  }
});

/**
 * 获取订单完整审计轨迹（合并 operation_logs + order_status_history）
 * GET /api/v1/operation-logs/order-timeline/:orderId?limit=3&offset=0
 * 注意：此路由必须在 /:resourceId 之前注册，否则 "order-timeline" 会被当作 resourceId
 */
router.get('/order-timeline/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '10'))));
    const offset = Math.max(0, parseInt(String(req.query.offset || '0')));

    const user = (req as any).user;
    const tenantId = user?.tenantId;

    let tenantWhere = '';
    const tenantParams: any[] = [];
    if (tenantId) {
      tenantWhere = 'AND tenant_id = ?';
      tenantParams.push(tenantId);
    }

    // Union operation_logs + order_status_history
    const sql = `
      (
        SELECT id, action AS log_type, description AS content, user_name AS operator_name,
               created_at, 'operation' AS source
        FROM operation_logs
        WHERE module = 'order' AND resource_id = ? ${tenantWhere}
      )
      UNION ALL
      (
        SELECT id, COALESCE(actionType, 'status_change') AS log_type,
               CONCAT(COALESCE(notes, ''), CASE WHEN status IS NOT NULL THEN CONCAT(' [状态: ', status, ']') ELSE '' END) AS content,
               COALESCE(operatorName, '系统') AS operator_name,
               createdAt AS created_at, 'status_history' AS source
        FROM order_status_history
        WHERE orderId = ? ${tenantWhere}
      )
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [orderId, ...tenantParams, orderId, ...tenantParams, limit + 1, offset];
    const rows = await AppDataSource.query(sql, params).catch(() => []);

    const hasMore = rows.length > limit;
    const list = rows.slice(0, limit).map((row: any) => {
      let content = row.content || '';
      if (row.source === 'status_history') {
        content = content.replace(/\[状态: (\w+)\]/g, (_: string, s: string) => `[状态: ${translateStatus(s)}]`);
      }
      return {
        id: row.id,
        logType: row.log_type,
        content,
        operatorName: row.operator_name || '系统',
        createdAt: row.created_at,
        source: row.source,
      };
    });

    // Count total
    const countSql = `
      SELECT (
        (SELECT COUNT(*) FROM operation_logs WHERE module = 'order' AND resource_id = ? ${tenantWhere})
        +
        (SELECT COUNT(*) FROM order_status_history WHERE order_id = ? ${tenantWhere})
      ) AS total
    `;
    const countResult = await AppDataSource.query(countSql, [orderId, ...tenantParams, orderId, ...tenantParams]).catch(() => [{ total: 0 }]);

    return res.json({
      success: true,
      data: { list, total: countResult[0]?.total || 0, hasMore }
    });
  } catch (error: any) {
    log.error('[操作日志] 获取订单审计轨迹失败:', error.message);
    return res.json({ success: true, data: { list: [], total: 0, hasMore: false } });
  }
});

/**
 * 获取某资源的操作日志历史（分页）
 * GET /api/v1/operation-logs/:resourceId?module=xxx&page=1&pageSize=10
 * 注意：此路由必须在所有静态路由之后，因为 :resourceId 是通配
 */
router.get('/:resourceId', async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.params;
    const mod = String(req.query.module || '');
    const page = Math.max(1, parseInt(String(req.query.page || '1')));
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize || '10'))));

    if (!mod || !resourceId) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const user = (req as any).user;
    const tenantId = user?.tenantId;

    let whereSql = 'WHERE module = ? AND resource_id = ?';
    const countParams: any[] = [mod, resourceId];
    const queryParams: any[] = [mod, resourceId];

    if (tenantId) {
      whereSql += ' AND tenant_id = ?';
      countParams.push(tenantId);
      queryParams.push(tenantId);
    }

    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM operation_logs ${whereSql}`, countParams
    );
    const total = countResult[0]?.total || 0;

    queryParams.push((page - 1) * pageSize, pageSize);
    const rows = await AppDataSource.query(
      `SELECT * FROM operation_logs ${whereSql} ORDER BY created_at DESC LIMIT ?, ?`, queryParams
    );

    const list = rows.map((row: any) => ({
      id: row.id,
      operationType: row.action,
      operationContent: row.description,
      operatorName: row.user_name || '系统',
      operatorId: row.user_id,
      oldValue: null,
      newValue: null,
      remark: null,
      createdAt: row.created_at,
    }));

    return res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    log.error('[操作日志] 获取日志历史失败:', error.message);
    return res.status(500).json({ success: false, message: '获取操作日志失败' });
  }
});

export default router;
