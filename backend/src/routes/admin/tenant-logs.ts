/**
 * 租户操作日志 API
 *
 * 路由：
 * GET    /api/admin/tenants/:id/logs  - 获取指定租户的操作日志
 * GET    /api/admin/logs              - 获取所有租户的操作日志
 * GET    /api/admin/logs/stats        - 获取操作统计
 */

import { Router, Request, Response } from 'express';
import { TenantLogService } from '../../services/TenantLogService';

// 租户特定日志路由（挂载在 /tenants 下）
const tenantSpecificLogsRouter = Router();

// 全局日志路由（挂载在 /logs 下）
const globalLogsRouter = Router();

/**
 * 获取指定租户的操作日志
 * GET /api/admin/tenants/:id/logs
 */
tenantSpecificLogsRouter.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id: tenantId } = req.params;
    const {
      action,
      operatorId,
      startDate,
      endDate,
      page = '1',
      pageSize = '20'
    } = req.query;

    const result = await TenantLogService.queryLogs({
      tenantId,
      action: action as string,
      operatorId: operatorId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });

    res.json({
      success: true,
      data: {
        logs: result.logs.map(log => ({
          id: log.id,
          tenantId: log.tenantId,
          action: log.action,
          operator: log.operator,
          operatorId: log.operatorId,
          details: log.details ? JSON.parse(log.details) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt
        })),
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      }
    });
  } catch (error: any) {
    console.error('查询租户日志失败:', error);
    res.status(500).json({
      success: false,
      message: '查询租户日志失败',
      error: error.message
    });
  }
});

/**
 * 获取所有租户的操作日志
 * GET /api/admin/logs
 */
globalLogsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const {
      tenantId,
      action,
      operatorId,
      startDate,
      endDate,
      page = '1',
      pageSize = '20'
    } = req.query;

    const result = await TenantLogService.queryLogs({
      tenantId: tenantId as string,
      action: action as string,
      operatorId: operatorId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string)
    });

    res.json({
      success: true,
      data: {
        logs: result.logs.map(log => ({
          id: log.id,
          tenantId: log.tenantId,
          action: log.action,
          operator: log.operator,
          operatorId: log.operatorId,
          details: log.details ? JSON.parse(log.details) : null,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          createdAt: log.createdAt
        })),
        pagination: {
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      }
    });
  } catch (error: any) {
    console.error('查询操作日志失败:', error);
    res.status(500).json({
      success: false,
      message: '查询操作日志失败',
      error: error.message
    });
  }
});

/**
 * 获取操作统计
 * GET /api/admin/logs/stats
 */
globalLogsRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.query;

    const stats = await TenantLogService.getActionStats(tenantId as string);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('获取操作统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取操作统计失败',
      error: error.message
    });
  }
});

export { tenantSpecificLogsRouter, globalLogsRouter };
export default tenantSpecificLogsRouter; // 默认导出租户特定路由
