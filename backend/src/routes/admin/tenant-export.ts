/**
 * 租户数据导出 API
 *
 * 路由：
 * POST   /api/admin/tenants/:id/export                  - 创建导出任务
 * GET    /api/admin/tenants/:id/export/:jobId            - 查询导出进度
 * GET    /api/admin/tenants/:id/export/:jobId/download   - 下载导出文件
 * GET    /api/admin/tenants/:id/export-excel/detail      - 导出租户详情(Excel)
 * GET    /api/admin/tenants/:id/export-excel/users       - 导出租户用户列表(Excel)
 * GET    /api/admin/tenants/:id/export-excel/logs        - 导出租户操作日志(Excel)
 */

import { Router, Request, Response } from 'express';
import { TenantExportService } from '../../services/TenantExportService';
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';

const router = Router();

// ===== Excel 通用工具 =====

interface ExcelColumnDef {
  key: string;
  label: string;
  width?: number;
}

/**
 * 生成美观的 Excel 工作簿并发送响应
 * 包含：蓝色表头、斑马条纹、边框、自动筛选、冻结首行
 */
async function sendExcelResponse(res: Response, filename: string, sheetName: string, columns: ExcelColumnDef[], rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CRM Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // 设置列（精确列宽）
  sheet.columns = columns.map(col => ({
    header: col.label,
    key: col.key,
    width: col.width || 18
  }));

  // 表头样式：蓝底白字加粗
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF409EFF' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow.height = 30;

  // 添加数据行
  for (const row of rows) {
    const dataRow: Record<string, any> = {};
    for (const col of columns) {
      dataRow[col.key] = row[col.key] ?? '';
    }
    sheet.addRow(dataRow);
  }

  // 数据行样式：斑马条纹 + 垂直居中
  for (let i = 2; i <= rows.length + 1; i++) {
    const row = sheet.getRow(i);
    row.alignment = { vertical: 'middle', wrapText: false };
    row.height = 22;
    if (i % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF5F7FA' }
      };
    }
  }

  // 设置边框
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE4E7ED' } },
        left: { style: 'thin', color: { argb: 'FFE4E7ED' } },
        bottom: { style: 'thin', color: { argb: 'FFE4E7ED' } },
        right: { style: 'thin', color: { argb: 'FFE4E7ED' } }
      };
    });
  });

  // 自动筛选
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length }
    };
  }

  // 冻结首行
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // 发送文件
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** 格式化日期时间 */
function fmtDateTime(val: any): string {
  if (!val) return '';
  try {
    return new Date(val).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch { return String(val); }
}

/** 格式化日期 */
function fmtDate(val: any): string {
  if (!val) return '';
  try {
    return new Date(val).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
  } catch { return String(val); }
}

// ===== 租户详情 Excel 导出 =====

const statusMap: Record<string, string> = { active: '正常', expired: '已过期', disabled: '已禁用', suspended: '已暂停', inactive: '已禁用' };
const licStatusMap: Record<string, string> = { active: '已激活', pending: '待激活', paid: '已付款待激活', expired: '已过期', suspended: '已暂停' };
const userStatusMap: Record<string, string> = { active: '正常', disabled: '已禁用', locked: '已锁定' };
const logActionMap: Record<string, string> = {
  activate: '激活', renew: '续期', change_package: '换套餐', disable: '禁用',
  enable: '启用', create: '创建', update: '更新', delete: '删除',
  reset_password: '重置密码', unlock: '解锁', export: '导出', import: '导入',
  suspend: '暂停', recover: '恢复', verify: '验证', login: '登录',
  capacity_change: '容量变更', module_change: '模块变更'
};

/**
 * 导出租户详情 (Excel)
 * GET /api/admin/tenants/:id/export-excel/detail
 */
router.get('/:id/export-excel/detail', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 查询租户详情
    const rows = await AppDataSource.query(
      `SELECT t.*, p.name as package_name
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE t.id = ?`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const t = rows[0];

    // 查询用户数
    const userCountResult = await AppDataSource.query(
      'SELECT COUNT(*) as cnt FROM users WHERE tenant_id = ?', [id]
    );
    const userCount = Number(userCountResult[0]?.cnt || 0);

    const columns: ExcelColumnDef[] = [
      { key: 'name', label: '客户名称', width: 24 },
      { key: 'code', label: '租户编码', width: 16 },
      { key: 'contact', label: '联系人', width: 14 },
      { key: 'phone', label: '联系电话', width: 16 },
      { key: 'email', label: '邮箱', width: 26 },
      { key: 'status', label: '状态', width: 10 },
      { key: 'licenseKey', label: '授权码', width: 42 },
      { key: 'licenseStatus', label: '授权状态', width: 14 },
      { key: 'packageName', label: '套餐', width: 16 },
      { key: 'maxUsers', label: '最大用户数', width: 14 },
      { key: 'userCount', label: '当前用户数', width: 14 },
      { key: 'maxStorageGb', label: '最大存储(GB)', width: 14 },
      { key: 'expireDate', label: '到期时间', width: 16 },
      { key: 'activatedAt', label: '激活时间', width: 20 },
      { key: 'createdAt', label: '创建时间', width: 20 },
      { key: 'updatedAt', label: '更新时间', width: 20 },
      { key: 'remark', label: '备注', width: 30 }
    ];

    const data = [{
      name: t.name || '',
      code: t.code || '',
      contact: t.contact || '',
      phone: t.phone || '',
      email: t.email || '',
      status: statusMap[t.status] || t.status || '',
      licenseKey: t.license_key || '',
      licenseStatus: licStatusMap[t.license_status] || t.license_status || '',
      packageName: t.package_name || '',
      maxUsers: t.max_users ?? '',
      userCount,
      maxStorageGb: t.max_storage_gb ?? '',
      expireDate: t.expire_date ? fmtDate(t.expire_date) : '永久',
      activatedAt: t.activated_at ? fmtDateTime(t.activated_at) : '未激活',
      createdAt: fmtDateTime(t.created_at),
      updatedAt: fmtDateTime(t.updated_at),
      remark: t.remark || ''
    }];

    const dateStr = fmtDate(new Date()).replace(/\//g, '-');
    await sendExcelResponse(
      res,
      `租户详情_${t.name || t.code}_${dateStr}.xlsx`,
      '租户详情',
      columns,
      data
    );
  } catch (error: any) {
    log.error('[TenantExport] Export detail Excel failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * 导出租户用户列表 (Excel)
 * GET /api/admin/tenants/:id/export-excel/users
 */
router.get('/:id/export-excel/users', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证租户存在并获取名称
    const tenantRows = await AppDataSource.query('SELECT name, code FROM tenants WHERE id = ?', [id]);
    if (!tenantRows || tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenantName = tenantRows[0].name || tenantRows[0].code || id;

    // 查询用户列表
    const users = await AppDataSource.query(
      `SELECT u.username, u.name, u.real_name, u.phone, u.email,
              u.role, u.position, u.status,
              u.last_login_at, u.login_count,
              u.created_at, u.updated_at,
              d.name as department_name
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id AND d.tenant_id = ?
       WHERE u.tenant_id = ?
       ORDER BY u.created_at ASC`,
      [id, id]
    );

    const columns: ExcelColumnDef[] = [
      { key: 'username', label: '用户名', width: 16 },
      { key: 'realName', label: '姓名', width: 14 },
      { key: 'phone', label: '手机号', width: 16 },
      { key: 'email', label: '邮箱', width: 26 },
      { key: 'departmentName', label: '部门', width: 16 },
      { key: 'position', label: '职位', width: 14 },
      { key: 'role', label: '角色', width: 12 },
      { key: 'status', label: '状态', width: 10 },
      { key: 'lastLoginAt', label: '最后登录', width: 20 },
      { key: 'loginCount', label: '登录次数', width: 12 },
      { key: 'createdAt', label: '创建时间', width: 20 },
      { key: 'updatedAt', label: '更新时间', width: 20 }
    ];

    const roleMap: Record<string, string> = { admin: '管理员', manager: '经理', sales: '销售', viewer: '查看者' };
    const data = (Array.isArray(users) ? users : []).map((u: any) => ({
      username: u.username || '',
      realName: u.real_name || u.name || '',
      phone: u.phone || '',
      email: u.email || '',
      departmentName: u.department_name || '',
      position: u.position || '',
      role: roleMap[u.role] || u.role || '',
      status: userStatusMap[u.status] || u.status || '',
      lastLoginAt: u.last_login_at ? fmtDateTime(u.last_login_at) : '未登录',
      loginCount: Number(u.login_count || 0),
      createdAt: fmtDateTime(u.created_at),
      updatedAt: fmtDateTime(u.updated_at)
    }));

    const dateStr = fmtDate(new Date()).replace(/\//g, '-');
    await sendExcelResponse(
      res,
      `租户用户列表_${tenantName}_${dateStr}.xlsx`,
      '用户列表',
      columns,
      data
    );
  } catch (error: any) {
    log.error('[TenantExport] Export users Excel failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * 导出租户操作日志 (Excel)
 * GET /api/admin/tenants/:id/export-excel/logs
 */
router.get('/:id/export-excel/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 验证租户存在并获取名称
    const tenantRows = await AppDataSource.query('SELECT name, code FROM tenants WHERE id = ?', [id]);
    if (!tenantRows || tenantRows.length === 0) {
      return res.status(404).json({ success: false, message: '租户不存在' });
    }
    const tenantName = tenantRows[0].name || tenantRows[0].code || id;

    // 查询全部日志（导出不分页，但限制最多5000条）
    const logList = await AppDataSource.query(
      `SELECT * FROM tenant_license_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 5000`,
      [id]
    );

    const columns: ExcelColumnDef[] = [
      { key: 'action', label: '操作类型', width: 14 },
      { key: 'result', label: '结果', width: 10 },
      { key: 'message', label: '详情', width: 50 },
      { key: 'licenseKey', label: '授权码', width: 42 },
      { key: 'operatorName', label: '操作人', width: 14 },
      { key: 'ipAddress', label: 'IP地址', width: 18 },
      { key: 'createdAt', label: '操作时间', width: 20 }
    ];

    const data = (Array.isArray(logList) ? logList : []).map((l: any) => ({
      action: logActionMap[l.action] || l.action || '',
      result: l.result === 'success' ? '成功' : (l.result === 'failure' ? '失败' : l.result || ''),
      message: l.message || '',
      licenseKey: l.license_key || '',
      operatorName: l.operator_name || '',
      ipAddress: l.ip_address || '',
      createdAt: fmtDateTime(l.created_at)
    }));

    const dateStr = fmtDate(new Date()).replace(/\//g, '-');
    await sendExcelResponse(
      res,
      `租户操作日志_${tenantName}_${dateStr}.xlsx`,
      '操作日志',
      columns,
      data
    );
  } catch (error: any) {
    log.error('[TenantExport] Export logs Excel failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

/**
 * 创建导出任务
 * POST /api/admin/tenants/:id/export
 */
router.post('/:id/export', async (req: Request, res: Response) => {
  try {
    const { id: tenantId } = req.params;
    const { tables, startDate, endDate } = req.body;

    // 创建导出任务
    const job = await TenantExportService.createExportJob({
      tenantId,
      tables,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    res.json({
      success: true,
      message: '导出任务已创建',
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress
      }
    });
  } catch (error: any) {
    log.error('创建导出任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建导出任务失败',
      error: error.message
    });
  }
});

/**
 * 查询导出进度
 * GET /api/admin/tenants/:id/export/:jobId
 */
router.get('/:id/export/:jobId', (req: Request, res: Response) => {
  try {
    const { id: tenantId, jobId } = req.params;

    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '导出任务不存在'
      });
    }

    // 🔒 租户归属校验：确保不能查看其他租户的导出任务
    if (job.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: '无权访问此导出任务'
      });
    }

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        error: job.error,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }
    });
  } catch (error: any) {
    log.error('查询导出进度失败:', error);
    res.status(500).json({
      success: false,
      message: '查询导出进度失败',
      error: error.message
    });
  }
});

/**
 * 下载导出文件
 * GET /api/admin/tenants/:id/export/:jobId/download
 * Query: format=json（默认）| format=html（可浏览报告）
 */
router.get('/:id/export/:jobId/download', (req: Request, res: Response) => {
  try {
    const { id: tenantId, jobId } = req.params;
    const format = (req.query.format as string) || 'json';

    const job = TenantExportService.getExportJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: '导出任务不存在'
      });
    }

    // 🔒 租户归属校验：确保不能下载其他租户的导出文件
    if (job.tenantId !== tenantId) {
      return res.status(403).json({
        success: false,
        message: '无权下载此导出文件'
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: '导出任务尚未完成',
        data: {
          status: job.status,
          progress: job.progress
        }
      });
    }

    // 根据 format 返回 JSON 或 HTML
    if (format === 'html') {
      const htmlPath = TenantExportService.getExportHtmlFilePath(jobId);
      if (!htmlPath || !fs.existsSync(htmlPath)) {
        return res.status(404).json({ success: false, message: 'HTML报告文件不存在' });
      }
      const fileName = path.basename(htmlPath);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.sendFile(htmlPath);
    }

    // 默认: JSON 格式（可用于导入）
    const filePath = TenantExportService.getExportFilePath(jobId);

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '导出文件不存在'
      });
    }

    // 设置下载响应头
    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // 发送文件
    res.sendFile(filePath);

  } catch (error: any) {
    log.error('下载导出文件失败:', error);
    res.status(500).json({
      success: false,
      message: '下载导出文件失败',
      error: error.message
    });
  }
});

export default router;
