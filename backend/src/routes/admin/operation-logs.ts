/**
 * Admin Operation Logs Routes - 操作日志
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';

const router = Router();

// 获取操作日志列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      module,
      action,
      adminName,
      startDate,
      endDate,
      keyword
    } = req.query;

    const p = Math.max(1, Number(page));
    const ps = Math.min(100, Math.max(1, Number(pageSize)));
    const offset = (p - 1) * ps;

    let where = '1=1';
    const params: any[] = [];

    if (module) {
      where += ' AND module = ?';
      params.push(module);
    }
    if (action) {
      where += ' AND action = ?';
      params.push(action);
    }
    if (adminName) {
      where += ' AND admin_name LIKE ?';
      params.push(`%${adminName}%`);
    }
    if (startDate) {
      where += ' AND created_at >= ?';
      params.push(startDate);
    }
    if (endDate) {
      where += ' AND created_at <= ?';
      params.push(`${endDate} 23:59:59`);
    }
    if (keyword) {
      where += ' AND (detail LIKE ? OR admin_name LIKE ? OR target_type LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 查询总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM admin_operation_logs WHERE ${where}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // 查询列表
    const list = await AppDataSource.query(
      `SELECT * FROM admin_operation_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    res.json({
      success: true,
      data: {
        list,
        total,
        page: p,
        pageSize: ps
      }
    });
  } catch (error: any) {
    console.error('[OperationLogs] Query failed:', error);
    res.status(500).json({ success: false, message: '查询操作日志失败' });
  }
});

// 获取日志统计（按模块、按操作类型分组）
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const byModule = await AppDataSource.query(
      `SELECT module, COUNT(*) as count FROM admin_operation_logs GROUP BY module ORDER BY count DESC`
    );
    const byAction = await AppDataSource.query(
      `SELECT action, COUNT(*) as count FROM admin_operation_logs GROUP BY action ORDER BY count DESC`
    );
    const byAdmin = await AppDataSource.query(
      `SELECT admin_name, COUNT(*) as count FROM admin_operation_logs GROUP BY admin_name ORDER BY count DESC LIMIT 10`
    );
    const todayCount = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM admin_operation_logs WHERE DATE(created_at) = CURDATE()`
    );

    res.json({
      success: true,
      data: {
        byModule,
        byAction,
        byAdmin,
        todayCount: todayCount[0]?.count || 0
      }
    });
  } catch (error: any) {
    console.error('[OperationLogs] Statistics failed:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 记录操作日志的工具函数（供其他路由调用）
export async function logOperation(params: {
  adminId: string;
  adminName: string;
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: string;
  ip?: string;
  userAgent?: string;
}) {
  try {
    const { v4: uuidv4 } = require('uuid');
    await AppDataSource.query(
      `INSERT INTO admin_operation_logs (id, admin_id, admin_name, module, action, target_type, target_id, detail, ip, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        uuidv4(),
        params.adminId,
        params.adminName,
        params.module,
        params.action,
        params.targetType || null,
        params.targetId || null,
        params.detail || null,
        params.ip || null,
        params.userAgent || null
      ]
    );
  } catch (error) {
    console.error('[OperationLogs] Failed to log operation:', error);
  }
}

export default router;
