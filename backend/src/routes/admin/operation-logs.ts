/**
 * Admin Operation Logs Routes - 操作日志
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';

import { log } from '../../config/logger';
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

    // 格式化 IP 地址
    const formattedList = list.map((row: any) => ({
      ...row,
      ip: formatIp(row.ip)
    }));

    res.json({
      success: true,
      data: {
        list: formattedList,
        total,
        page: p,
        pageSize: ps
      }
    });
  } catch (error: any) {
    log.error('[OperationLogs] Query failed:', error);
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
    log.error('[OperationLogs] Statistics failed:', error);
    res.status(500).json({ success: false, message: '获取统计失败' });
  }
});

// 修复历史日志数据（将 module=other 的记录重新分类）
router.post('/fix-history', async (req: Request, res: Response) => {
  try {
    // 修复 module=other 且 detail=创建other 的记录 → 系统设置
    const result1 = await AppDataSource.query(
      `UPDATE admin_operation_logs SET module = 'system_settings', action = 'update_config', target_type = 'system_config', detail = '保存系统配置' WHERE module = 'other' AND detail LIKE '%other%'`
    );

    // 修复 IP 地址: ::1 → 127.0.0.1
    const result2 = await AppDataSource.query(
      `UPDATE admin_operation_logs SET ip = '127.0.0.1' WHERE ip = '::1' OR ip = '::ffff:127.0.0.1'`
    );

    const fixed1 = result1?.affectedRows || result1?.changedRows || 0;
    const fixed2 = result2?.affectedRows || result2?.changedRows || 0;

    res.json({
      success: true,
      message: `修复完成：${fixed1} 条模块分类已修正，${fixed2} 条IP地址已修正`
    });
  } catch (error: any) {
    log.error('[OperationLogs] Fix history failed:', error);
    res.status(500).json({ success: false, message: '修复失败: ' + error.message });
  }
});

// 格式化 IP 地址
function formatIp(ip: string): string {
  if (!ip) return '-';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}

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
    log.error('[OperationLogs] Failed to log operation:', error);
  }
}

export default router;
