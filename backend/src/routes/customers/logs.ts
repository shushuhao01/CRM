import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { tenantSQL } from '../../utils/tenantRepo';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

export function registerLogRoutes(router: Router) {

  // 获取客户操作日志（分页）
  router.get('/:id/logs', async (req: Request, res: Response) => {
    try {
      const customerId = req.params.id;
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 6;

      const t = tenantSQL('');
      const logs = await AppDataSource.query(`
        SELECT
          id,
          customer_id AS customerId,
          log_type AS logType,
          content,
          detail,
          operator_id AS operatorId,
          operator_name AS operatorName,
          created_at AS createdAt
        FROM customer_logs
        WHERE customer_id = ?${t.sql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [customerId, ...t.params, limit + 1, offset]);

      // 查询是否还有更多数据
      const hasMore = logs.length > limit;
      const list = logs.slice(0, limit).map((item: any) => ({
        ...item,
        detail: item.detail ? (typeof item.detail === 'string' ? JSON.parse(item.detail) : item.detail) : null,
        createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : ''
      }));

      log.info(`[客户日志] 客户 ${customerId} 查询到 ${list.length} 条日志, offset=${offset}, hasMore=${hasMore}`);

      res.json({
        success: true,
        code: 200,
        data: {
          list,
          hasMore,
          offset,
          limit
        }
      });
    } catch (error) {
      log.error('获取客户日志失败:', error);
      res.json({ success: true, code: 200, data: { list: [], hasMore: false, offset: 0, limit: 6 } });
    }
  });

  // 创建客户日志
  router.post('/:id/logs', async (req: Request, res: Response) => {
    try {
      const customerId = req.params.id;
      const { logType, content, detail } = req.body;
      const currentUser = (req as any).currentUser;

      const id = uuidv4();
      const operatorId = currentUser?.id || 'system';
      const operatorName = currentUser?.realName || currentUser?.name || '系统';
      const tenantId = currentUser?.tenantId || null;

      await AppDataSource.query(`
        INSERT INTO customer_logs (id, tenant_id, customer_id, log_type, content, detail, operator_id, operator_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [id, tenantId, customerId, logType, content, detail ? JSON.stringify(detail) : null, operatorId, operatorName]);

      log.info(`[客户日志] 客户 ${customerId} 新增日志: ${logType} - ${content}`);

      res.status(201).json({
        success: true,
        code: 200,
        data: {
          id,
          customerId,
          logType,
          content,
          detail: detail || null,
          operatorId,
          operatorName,
          createdAt: new Date().toISOString()
        }
      });
    } catch (error) {
      log.error('创建客户日志失败:', error);
      res.status(500).json({ success: false, code: 500, message: '创建客户日志失败' });
    }
  });
}

