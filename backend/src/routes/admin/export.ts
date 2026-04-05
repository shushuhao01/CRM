/**
 * Admin Export Routes - 数据导出
 * 支持 Excel (xlsx) 和 CSV 格式导出
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import ExcelJS from 'exceljs';

import { log } from '../../config/logger';
const router = Router();

// ===== 通用工具 =====

interface ColumnDef {
  key: string;
  label: string;
  width?: number;
}

/**
 * 生成 Excel 工作簿并发送响应
 */
async function sendExcel(res: Response, filename: string, sheetName: string, columns: ColumnDef[], rows: any[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CRM Admin';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  // 设置列
  sheet.columns = columns.map(col => ({
    header: col.label,
    key: col.key,
    width: col.width || 18
  }));

  // 表头样式
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF409EFF' }
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 28;

  // 添加数据
  for (const row of rows) {
    const dataRow: Record<string, any> = {};
    for (const col of columns) {
      dataRow[col.key] = row[col.key] ?? '';
    }
    sheet.addRow(dataRow);
  }

  // 数据行样式：斑马条纹
  for (let i = 2; i <= rows.length + 1; i++) {
    const row = sheet.getRow(i);
    row.alignment = { vertical: 'middle' };
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

/**
 * CSV 生成工具（向后兼容，当 format=csv 时使用）
 */
function toCSV(headers: ColumnDef[], rows: any[]): string {
  const BOM = '\uFEFF';
  const headerLine = headers.map(h => `"${h.label}"`).join(',');
  const dataLines = rows.map(row =>
    headers.map(h => {
      let val = row[h.key];
      if (val === null || val === undefined) val = '';
      if (val instanceof Date) val = val.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    }).join(',')
  );
  return BOM + headerLine + '\n' + dataLines.join('\n');
}

function sendCSV(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
}

// ===== 导出接口 =====

// 导出私有客户列表
router.get('/licenses', async (req: Request, res: Response) => {
  try {
    const { status, licenseType, keyword, format } = req.query;
    let where = '1=1';
    const params: any[] = [];

    if (status) { where += ' AND status = ?'; params.push(status); }
    if (licenseType) { where += ' AND license_type = ?'; params.push(licenseType); }
    if (keyword) {
      where += ' AND (customer_name LIKE ? OR license_key LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const rows = await AppDataSource.query(
      `SELECT customer_name, customer_contact, customer_phone, customer_email,
              license_key, license_type, max_users, status, expires_at, activated_at, created_at, notes
       FROM licenses WHERE ${where} ORDER BY created_at DESC`,
      params
    );

    const typeMap: Record<string, string> = { trial: '试用', annual: '年度', perpetual: '永久' };
    const statusMap: Record<string, string> = { pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' };

    const formatted = rows.map((r: any) => ({
      ...r,
      license_type: typeMap[r.license_type] || r.license_type,
      status: statusMap[r.status] || r.status,
      expires_at: r.license_type === 'perpetual' ? '永久' : (r.expires_at ? new Date(r.expires_at).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''),
      activated_at: r.activated_at ? new Date(r.activated_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '未激活',
      created_at: r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
    }));

    const columns: ColumnDef[] = [
      { key: 'customer_name', label: '客户名称', width: 22 },
      { key: 'customer_contact', label: '联系人', width: 14 },
      { key: 'customer_phone', label: '联系电话', width: 16 },
      { key: 'customer_email', label: '邮箱', width: 24 },
      { key: 'license_key', label: '授权码', width: 40 },
      { key: 'license_type', label: '授权类型', width: 12 },
      { key: 'max_users', label: '最大用户数', width: 12 },
      { key: 'status', label: '状态', width: 10 },
      { key: 'expires_at', label: '到期时间', width: 16 },
      { key: 'activated_at', label: '激活时间', width: 20 },
      { key: 'created_at', label: '创建时间', width: 20 },
      { key: 'notes', label: '备注', width: 30 }
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      sendCSV(res, `私有客户列表_${dateStr}.csv`, toCSV(columns, formatted));
    } else {
      await sendExcel(res, `私有客户列表_${dateStr}.xlsx`, '私有客户', columns, formatted);
    }
  } catch (error: any) {
    log.error('[Export] Licenses export failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// 导出租户客户列表
router.get('/tenants', async (req: Request, res: Response) => {
  try {
    const { status, keyword, format } = req.query;
    let where = '1=1';
    const params: any[] = [];

    if (status) { where += ' AND t.status = ?'; params.push(status); }
    if (keyword) {
      where += ' AND (t.name LIKE ? OR t.code LIKE ? OR t.contact LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    const rows = await AppDataSource.query(
      `SELECT t.name, t.code, t.contact, t.phone, t.email, t.status,
              t.license_key, t.license_status, t.expire_date,
              t.max_users, p.name as package_name, t.created_at
       FROM tenants t
       LEFT JOIN tenant_packages p ON t.package_id = p.id
       WHERE ${where} ORDER BY t.created_at DESC`,
      params
    );

    const statusMap: Record<string, string> = { active: '正常', expired: '已过期', disabled: '已禁用', suspended: '已暂停', inactive: '已禁用' };
    const licStatusMap: Record<string, string> = { active: '已激活', pending: '待激活', paid: '已付款待激活', expired: '已过期', suspended: '已暂停' };

    const formatted = rows.map((r: any) => ({
      ...r,
      status: statusMap[r.status] || r.status,
      license_status: licStatusMap[r.license_status] || r.license_status,
      expire_date: r.expire_date ? new Date(r.expire_date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '永久',
      created_at: r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
    }));

    const columns: ColumnDef[] = [
      { key: 'name', label: '客户名称', width: 22 },
      { key: 'code', label: '租户编码', width: 16 },
      { key: 'contact', label: '联系人', width: 14 },
      { key: 'phone', label: '联系电话', width: 16 },
      { key: 'email', label: '邮箱', width: 24 },
      { key: 'status', label: '状态', width: 10 },
      { key: 'license_key', label: '授权码', width: 40 },
      { key: 'license_status', label: '授权状态', width: 12 },
      { key: 'expire_date', label: '授权到期', width: 14 },
      { key: 'max_users', label: '最大用户数', width: 12 },
      { key: 'package_name', label: '套餐', width: 14 },
      { key: 'created_at', label: '创建时间', width: 20 },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      sendCSV(res, `租户客户列表_${dateStr}.csv`, toCSV(columns, formatted));
    } else {
      await sendExcel(res, `租户客户列表_${dateStr}.xlsx`, '租户客户', columns, formatted);
    }
  } catch (error: any) {
    log.error('[Export] Tenants export failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// 导出支付订单列表
router.get('/payments', async (req: Request, res: Response) => {
  try {
    const { status, payType, startDate, endDate, format } = req.query;
    let where = '1=1';
    const params: any[] = [];

    if (status) { where += ' AND status = ?'; params.push(status); }
    if (payType) { where += ' AND pay_type = ?'; params.push(payType); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(`${endDate} 23:59:59`); }

    const rows = await AppDataSource.query(
      `SELECT order_no, tenant_name, package_name, amount, pay_type, status,
              paid_at, refund_at, created_at
       FROM payment_orders WHERE ${where} ORDER BY created_at DESC`,
      params
    );

    const payTypeMap: Record<string, string> = { wechat: '微信支付', alipay: '支付宝' };
    const statusMap: Record<string, string> = { pending: '待支付', paid: '已支付', refunded: '已退款', closed: '已关闭' };

    const formatted = rows.map((r: any) => ({
      ...r,
      amount: r.amount ? `¥${Number(r.amount).toFixed(2)}` : '¥0.00',
      pay_type: payTypeMap[r.pay_type] || r.pay_type || '',
      status: statusMap[r.status] || r.status,
      paid_at: r.paid_at ? new Date(r.paid_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
      refunded_at: r.refund_at ? new Date(r.refund_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '',
      created_at: r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
    }));

    const columns: ColumnDef[] = [
      { key: 'order_no', label: '订单号', width: 24 },
      { key: 'tenant_name', label: '租户名称', width: 22 },
      { key: 'package_name', label: '套餐名称', width: 16 },
      { key: 'amount', label: '金额', width: 12 },
      { key: 'pay_type', label: '支付方式', width: 12 },
      { key: 'status', label: '状态', width: 10 },
      { key: 'paid_at', label: '支付时间', width: 20 },
      { key: 'refund_at', label: '退款时间', width: 20 },
      { key: 'created_at', label: '创建时间', width: 20 }
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      sendCSV(res, `支付订单列表_${dateStr}.csv`, toCSV(columns, formatted));
    } else {
      await sendExcel(res, `支付订单列表_${dateStr}.xlsx`, '支付订单', columns, formatted);
    }
  } catch (error: any) {
    log.error('[Export] Payments export failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

// 导出操作日志
router.get('/operation-logs', async (req: Request, res: Response) => {
  try {
    const { module, action, startDate, endDate, format } = req.query;
    let where = '1=1';
    const params: any[] = [];

    if (module) { where += ' AND module = ?'; params.push(module); }
    if (action) { where += ' AND action = ?'; params.push(action); }
    if (startDate) { where += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { where += ' AND created_at <= ?'; params.push(`${endDate} 23:59:59`); }

    const rows = await AppDataSource.query(
      `SELECT admin_name, module, action, target_type, target_id, detail, ip, created_at
       FROM admin_operation_logs WHERE ${where} ORDER BY created_at DESC LIMIT 5000`,
      params
    );

    const formatted = rows.map((r: any) => ({
      ...r,
      created_at: r.created_at ? new Date(r.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
    }));

    const columns: ColumnDef[] = [
      { key: 'admin_name', label: '操作人', width: 14 },
      { key: 'module', label: '模块', width: 14 },
      { key: 'action', label: '操作类型', width: 12 },
      { key: 'target_type', label: '操作对象', width: 14 },
      { key: 'detail', label: '详情', width: 40 },
      { key: 'ip', label: 'IP地址', width: 16 },
      { key: 'created_at', label: '操作时间', width: 20 }
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'csv') {
      sendCSV(res, `操作日志_${dateStr}.csv`, toCSV(columns, formatted));
    } else {
      await sendExcel(res, `操作日志_${dateStr}.xlsx`, '操作日志', columns, formatted);
    }
  } catch (error: any) {
    log.error('[Export] Operation logs export failed:', error);
    res.status(500).json({ success: false, message: '导出失败' });
  }
});

export default router;
