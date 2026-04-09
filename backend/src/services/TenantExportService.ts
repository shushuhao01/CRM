/**
 * 租户数据导出服务
 *
 * 功能：
 * 1. 导出指定租户的所有业务数据（覆盖全部核心业务表）
 * 2. 支持选择导出范围（全部/部分数据）
 * 3. 异步导出，提供进度查询
 * 4. 生成 JSON 格式的数据包
 * 5. 包含数据统计摘要
 */

import { AppDataSource } from '../config/database';
import { Tenant } from '../entities/Tenant';
import * as fs from 'fs';
import * as path from 'path';

import { log } from '../config/logger';

export interface ExportOptions {
  tenantId: string;
  tables?: string[];  // 要导出的表，不指定则导出全部核心表
  startDate?: Date;   // 开始日期（增量导出）
  endDate?: Date;     // 结束日期
}

export interface ExportJob {
  id: string;
  tenantId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  totalRecords: number;
  processedRecords: number;
  filePath?: string;
  htmlFilePath?: string;  // 可浏览的 HTML 报告文件
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 🔥 可导出的全部业务表（按依赖关系排序）
 * 导出时从基础数据开始，导入时也按此顺序
 * ⚠️ 与 tenantRepo.ts 中 TENANT_ENTITIES 保持同步
 */
const ALL_EXPORTABLE_TABLES = [
  // ====== 组织架构（基础，最先导出/导入） ======
  'departments',
  'users',
  'roles',
  'permissions',
  'role_permissions',
  // ====== 商品 ======
  'product_categories',
  'products',
  // ====== 客户（依赖用户/部门） ======
  'customer_tags',
  'customer_groups',
  'customers',
  'customer_shares',
  'customer_assignments',
  'follow_up_records',
  'customer_files',
  // ====== 订单（依赖客户/产品） ======
  'orders',
  'order_items',
  'order_status_history',
  'order_attachments',
  'cod_cancel_applications',
  // ====== 售后（依赖订单/客户） ======
  'after_sales_services',
  'service_records',
  'service_follow_ups',
  'service_follow_up_records',
  'service_operation_logs',
  'after_sale_attachments',
  // ====== 物流（依赖订单） ======
  'logistics_companies',
  'logistics_api_configs',
  'logistics_tracking',
  'logistics_traces',
  // ====== 通话/录音/外呼 ======
  'call_records',
  'call_recordings',
  'call_lines',
  'user_line_assignments',
  'phone_configs',
  'work_phones',
  'device_bind_logs',
  'global_call_config',
  'outbound_tasks',
  'phone_blacklist',
  // ====== 业绩/佣金/报表 ======
  'performance_configs',
  'performance_metrics',
  'performance_report_configs',
  'performance_report_logs',
  'performance_shares',
  'performance_share_members',
  'commission_settings',
  'commission_ladders',
  // ====== 部门限额 ======
  'department_order_limits',
  // ====== 增值服务 ======
  'value_added_orders',
  'value_added_price_config',
  'value_added_status_configs',
  // ====== 支付 ======
  'payment_orders',
  'payment_records',
  // ====== 基础配置 ======
  'system_configs',
  'improvement_goals',
  'rejection_reasons',
  'remark_presets',
  'payment_method_options',
  // ====== 短信 ======
  'sms_templates',
  'sms_records',
  // ====== 外包 ======
  'outsource_companies',
  // ====== 企业微信 ======
  'wecom_configs',
  'wecom_user_bindings',
  'wecom_customers',
  'wecom_acquisition_links',
  'wecom_service_accounts',
  'wecom_payment_records',
  'wecom_chat_records',
  // ====== 通知/消息/公告 ======
  'announcements',
  'announcement_reads',
  'notifications',
  'notification_templates',
  'notification_channels',
  'notification_logs',
  'system_messages',
  'message_subscriptions',
  'department_subscription_configs',
  'message_read_status',
  'message_cleanup_history',
  // ====== 权限/日志 ======
  'customer_service_permissions',
  'sensitive_info_permissions',
  'operation_logs',
  // ====== 数据记录 ======
  'data_records',
];

// 导出任务存储（实际应该用数据库）
const exportJobs = new Map<string, ExportJob>();

export class TenantExportService {
  /**
   * 获取所有可导出的表列表（供前端选择）
   */
  static getExportableTables(): string[] {
    return [...ALL_EXPORTABLE_TABLES];
  }

  /**
   * 创建导出任务
   */
  static async createExportJob(options: ExportOptions): Promise<ExportJob> {
    const jobId = `export_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const job: ExportJob = {
      id: jobId,
      tenantId: options.tenantId,
      status: 'pending',
      progress: 0,
      totalRecords: 0,
      processedRecords: 0,
      createdAt: new Date()
    };

    exportJobs.set(jobId, job);

    // 异步执行导出
    this.executeExport(jobId, options).catch(error => {
      log.error(`导出任务失败 [${jobId}]:`, error);
      const failedJob = exportJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
      }
    });

    return job;
  }

  /**
   * 查询导出任务状态
   */
  static getExportJob(jobId: string): ExportJob | undefined {
    return exportJobs.get(jobId);
  }

  /**
   * 执行导出（🔥 改造：使用通用SQL查询，覆盖全部业务表）
   */
  private static async executeExport(jobId: string, options: ExportOptions): Promise<void> {
    const job = exportJobs.get(jobId);
    if (!job) throw new Error('导出任务不存在');

    try {
      job.status = 'processing';

      // 1. 验证租户存在
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({
        where: { id: options.tenantId }
      });

      if (!tenant) {
        throw new Error('租户不存在');
      }

      // 2. 准备导出数据结构（v3.0: 包含完整租户信息）
      const exportData: any = {
        version: '3.0',
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          // 包含租户完整信息，方便导入时恢复
          ...(tenant as any),
        },
        exportTime: new Date().toISOString(),
        exportFrom: 'CRM-TenantExportService',
        dataRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        },
        summary: {},  // 各表记录数统计
        data: {}
      };

      // 3. 确定要导出的表
      const tablesToExport = options.tables && options.tables.length > 0
        ? options.tables
        : ALL_EXPORTABLE_TABLES;

      // 4. 先统计总记录数
      let totalEstimate = 0;
      for (const table of tablesToExport) {
        try {
          const countResult = await this.countTableRecords(table, options.tenantId);
          totalEstimate += countResult;
        } catch { /* 表不存在则跳过 */ }
      }
      job.totalRecords = totalEstimate || 1; // 避免除零

      // 5. 逐表导出
      for (const table of tablesToExport) {
        try {
          const data = await this.exportTableBySQL(table, options);
          if (data.length > 0) {
            exportData.data[table] = data;
            exportData.summary[table] = data.length;
          }
          job.processedRecords += data.length;
          job.progress = Math.min(95, Math.round((job.processedRecords / job.totalRecords) * 100));
        } catch (tableErr) {
          log.info(`[TenantExport] 导出表 ${table} 跳过: ${(tableErr as Error).message?.substring(0, 60)}`);
        }
      }

      // 6. 保存到文件
      const exportDir = path.join(process.cwd(), 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const fileName = `tenant_${tenant.code}_${Date.now()}.json`;
      const filePath = path.join(exportDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

      // 6b. 同时生成可浏览的 HTML 报告
      const htmlFileName = fileName.replace('.json', '.html');
      const htmlFilePath = path.join(exportDir, htmlFileName);
      const htmlContent = this.generateHtmlViewer(exportData);
      fs.writeFileSync(htmlFilePath, htmlContent, 'utf-8');

      // 7. 更新任务状态
      job.status = 'completed';
      job.progress = 100;
      job.filePath = filePath;
      job.htmlFilePath = htmlFilePath;
      job.completedAt = new Date();

      const totalExported = Object.values(exportData.summary as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
      log.info(`✅ 导出任务完成 [${jobId}]: ${Object.keys(exportData.summary).length} 张表, ${totalExported} 条记录 -> ${filePath}`);

    } catch (error: any) {
      job.status = 'failed';
      job.error = error.message;
      throw error;
    }
  }

  /**
   * 统计表记录数
   */
  private static async countTableRecords(tableName: string, tenantId: string): Promise<number> {
    const hasTenantCol = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
      [tableName]
    );
    if (hasTenantCol.length === 0) return 0;

    const result = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM \`${tableName}\` WHERE tenant_id = ?`, [tenantId]
    );
    return Number(result[0]?.cnt || 0);
  }

  /**
   * 🔥 通用SQL导出（不依赖Entity类，支持所有有tenant_id的表）
   */
  private static async exportTableBySQL(tableName: string, options: ExportOptions): Promise<any[]> {
    const { tenantId } = options;

    // 检查表是否存在且有 tenant_id 列
    const hasTenantCol = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'`,
      [tableName]
    );
    if (hasTenantCol.length === 0) return [];

    // 构建查询 — 按 tenant_id 过滤
    let sql = `SELECT * FROM \`${tableName}\` WHERE tenant_id = ?`;
    const params: any[] = [tenantId];

    // 如果有日期范围且表有 created_at 列，添加时间过滤
    if (options.startDate || options.endDate) {
      const hasCreatedAt = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'created_at'`,
        [tableName]
      );
      if (hasCreatedAt.length > 0) {
        if (options.startDate) {
          sql += ' AND created_at >= ?';
          params.push(options.startDate);
        }
        if (options.endDate) {
          sql += ' AND created_at <= ?';
          params.push(options.endDate);
        }
      }
    }

    return await AppDataSource.query(sql, params);
  }

  /**
   * 获取导出文件路径
   */
  static getExportFilePath(jobId: string): string | undefined {
    const job = exportJobs.get(jobId);
    return job?.filePath;
  }

  /**
   * 获取导出 HTML 报告路径
   */
  static getExportHtmlFilePath(jobId: string): string | undefined {
    const job = exportJobs.get(jobId);
    return job?.htmlFilePath;
  }

  /**
   * 🔥 生成可浏览的 HTML 报告（自包含，双击即可在浏览器中打开）
   */
  private static generateHtmlViewer(exportData: any): string {
    const TABLE_NAME_MAP: Record<string, string> = {
      departments: '部门', users: '用户', roles: '角色', permissions: '权限',
      role_permissions: '角色权限', product_categories: '产品分类', products: '产品',
      customer_tags: '客户标签', customer_groups: '客户分组', customers: '客户',
      customer_shares: '客户共享', customer_assignments: '客户分配',
      follow_up_records: '跟进记录', customer_files: '客户文件',
      orders: '订单', order_items: '订单项', order_status_history: '订单状态历史',
      order_attachments: '订单附件', cod_cancel_applications: 'COD取消申请',
      after_sales_services: '售后服务', service_records: '服务记录',
      service_follow_ups: '服务跟进', service_follow_up_records: '服务跟进记录',
      service_operation_logs: '服务操作日志', after_sale_attachments: '售后附件',
      logistics_companies: '物流公司', logistics_api_configs: '物流API配置',
      logistics_tracking: '物流跟踪', logistics_traces: '物流轨迹',
      call_records: '通话记录', call_recordings: '通话录音',
      call_lines: '呼叫线路', user_line_assignments: '用户线路分配',
      phone_configs: '电话配置', work_phones: '工作手机',
      device_bind_logs: '设备绑定日志', global_call_config: '全局呼叫配置',
      outbound_tasks: '外呼任务', phone_blacklist: '电话黑名单',
      performance_configs: '业绩配置', performance_metrics: '业绩指标',
      performance_report_configs: '业绩报表配置', performance_report_logs: '业绩报表日志',
      performance_shares: '业绩分享', performance_share_members: '业绩分享成员',
      commission_settings: '佣金设置', commission_ladders: '佣金阶梯',
      department_order_limits: '部门订单限额',
      value_added_orders: '增值服务订单', value_added_price_config: '增值定价配置',
      value_added_status_configs: '增值状态配置',
      payment_orders: '支付订单', payment_records: '支付记录',
      system_configs: '系统配置', improvement_goals: '改善目标',
      rejection_reasons: '驳回原因', remark_presets: '备注预设',
      payment_method_options: '支付方式选项',
      sms_templates: '短信模板', sms_records: '短信记录',
      outsource_companies: '外包公司',
      wecom_configs: '企微配置', wecom_user_bindings: '企微用户绑定',
      wecom_customers: '企微客户', wecom_acquisition_links: '企微获客链接',
      wecom_service_accounts: '企微服务账号', wecom_payment_records: '企微支付记录',
      wecom_chat_records: '企微聊天记录',
      announcements: '公告', announcement_reads: '公告已读',
      notifications: '通知', notification_templates: '通知模板',
      notification_channels: '通知渠道', notification_logs: '通知日志',
      system_messages: '系统消息', message_subscriptions: '消息订阅',
      department_subscription_configs: '部门订阅配置',
      message_read_status: '消息已读状态', message_cleanup_history: '消息清理历史',
      customer_service_permissions: '客服权限', sensitive_info_permissions: '敏感信息权限',
      operation_logs: '操作日志', data_records: '数据记录',
    };

    const tenant = exportData.tenant || {};
    const summary = exportData.summary || {};
    const data = exportData.data || {};
    const totalRecords = Object.values(summary as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    const tableCount = Object.keys(summary).length;

    // 用 JSON.stringify 把数据嵌入 HTML，对 </ 做转义防止 XSS
    const jsonEmbedded = JSON.stringify(data).replace(/<\//g, '<\\/');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CRM数据导出报告 - ${this.escapeHtml(tenant.name || tenant.code || '未知租户')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;background:#f0f2f5;color:#333;line-height:1.6}
.header{background:linear-gradient(135deg,#1890ff,#096dd9);color:#fff;padding:32px 40px;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.15)}
.header h1{font-size:24px;font-weight:600;margin-bottom:8px}
.header .meta{display:flex;flex-wrap:wrap;gap:24px;font-size:14px;opacity:.9}
.header .meta span{display:flex;align-items:center;gap:4px}
.container{max-width:1400px;margin:0 auto;padding:20px}
.summary-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:8px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.1);text-align:center}
.card .num{font-size:28px;font-weight:700;color:#1890ff}
.card .label{font-size:13px;color:#8c8c8c;margin-top:4px}
.toolbar{background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1);display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.toolbar input,.toolbar select{border:1px solid #d9d9d9;border-radius:6px;padding:8px 12px;font-size:14px;outline:none;transition:border-color .3s}
.toolbar input:focus,.toolbar select:focus{border-color:#1890ff;box-shadow:0 0 0 2px rgba(24,144,255,.2)}
.toolbar input{flex:1;min-width:200px}
.toolbar select{min-width:160px}
.table-section{background:#fff;border-radius:8px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden}
.table-header{padding:16px 20px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;transition:background .2s}
.table-header:hover{background:#fafafa}
.table-header h3{font-size:16px;font-weight:600;display:flex;align-items:center;gap:8px}
.table-header .badge{background:#e6f7ff;color:#1890ff;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:500}
.table-header .arrow{transition:transform .3s;font-size:12px;color:#8c8c8c}
.table-header .arrow.open{transform:rotate(90deg)}
.table-body{display:none;overflow-x:auto}
.table-body.open{display:block}
table{width:100%;border-collapse:collapse;font-size:13px}
thead{background:#fafafa;position:sticky;top:0}
th{padding:10px 12px;text-align:left;font-weight:600;color:#595959;border-bottom:2px solid #f0f0f0;white-space:nowrap}
td{padding:8px 12px;border-bottom:1px solid #f5f5f5;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr:hover td{background:#e6f7ff}
td.cell-id{font-family:'SF Mono',Monaco,Menlo,monospace;font-size:11px;color:#8c8c8c}
td.cell-null{color:#d9d9d9;font-style:italic}
.empty-msg{padding:40px;text-align:center;color:#bfbfbf;font-size:14px}
.load-json{text-align:center;padding:60px 20px}
.load-json h2{margin-bottom:16px;color:#595959}
.load-json .drop-zone{border:2px dashed #d9d9d9;border-radius:12px;padding:40px;cursor:pointer;transition:all .3s;margin:0 auto;max-width:500px}
.load-json .drop-zone:hover,.load-json .drop-zone.dragover{border-color:#1890ff;background:#e6f7ff}
.load-json .drop-zone p{color:#8c8c8c;margin-top:8px}
.btn{padding:8px 16px;border-radius:6px;border:1px solid #d9d9d9;background:#fff;cursor:pointer;font-size:13px;transition:all .2s}
.btn:hover{border-color:#1890ff;color:#1890ff}
.btn-primary{background:#1890ff;color:#fff;border-color:#1890ff}
.btn-primary:hover{background:#096dd9}
.footer{text-align:center;padding:24px;color:#bfbfbf;font-size:12px}
.hidden{display:none}
.pagination{display:flex;justify-content:space-between;align-items:center;padding:12px 20px;border-top:1px solid #f0f0f0;font-size:13px;color:#8c8c8c}
.pagination .page-btns{display:flex;gap:4px}
.pagination .page-btn{padding:4px 10px;border:1px solid #d9d9d9;border-radius:4px;cursor:pointer;background:#fff;font-size:12px}
.pagination .page-btn:hover{border-color:#1890ff;color:#1890ff}
.pagination .page-btn.active{background:#1890ff;color:#fff;border-color:#1890ff}
@media(max-width:768px){.header{padding:20px}.container{padding:12px}.summary-cards{grid-template-columns:repeat(2,1fr)}.toolbar{flex-direction:column}.toolbar input{width:100%}}
</style>
</head>
<body>

<div class="header">
  <h1>📊 CRM 数据导出报告</h1>
  <div class="meta">
    <span>🏢 租户: <b>${this.escapeHtml(tenant.name || '未知')}</b> (${this.escapeHtml(tenant.code || tenant.id || '')})</span>
    <span>📅 导出时间: <b>${exportData.exportTime ? new Date(exportData.exportTime).toLocaleString('zh-CN') : '未知'}</b></span>
    <span>📋 共 <b>${tableCount}</b> 张表</span>
    <span>📝 共 <b>${totalRecords.toLocaleString()}</b> 条记录</span>
    <span>🔖 版本: v${exportData.version || '?'}</span>
  </div>
</div>

<div class="container">
  <!-- 摘要卡片 -->
  <div class="summary-cards" id="summaryCards"></div>

  <!-- 工具栏 -->
  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="🔍 搜索表名或数据内容..." oninput="filterTables()">
    <select id="tableFilter" onchange="filterTables()">
      <option value="">全部表 (${tableCount})</option>
    </select>
    <button class="btn" onclick="expandAll()">全部展开</button>
    <button class="btn" onclick="collapseAll()">全部折叠</button>
  </div>

  <!-- 表数据区域 -->
  <div id="tablesContainer"></div>
</div>

<!-- 如果是独立查看器模式（无内嵌数据），显示加载区 -->
<div class="load-json hidden" id="loadJsonArea">
  <h2>📂 加载导出的 JSON 文件</h2>
  <div class="drop-zone" id="dropZone" onclick="document.getElementById('fileInput').click()">
    <p style="font-size:32px">📁</p>
    <p><b>点击选择</b> 或 <b>拖拽 JSON 文件到这里</b></p>
    <p>支持 CRM v1.0 / v2.0 / v3.0 格式的导出文件</p>
    <input type="file" id="fileInput" accept=".json" class="hidden" onchange="handleFileSelect(event)">
  </div>
</div>

<div class="footer">
  CRM 数据导出报告 · 仅供本租户内部使用 · 请勿泄露
</div>

<script>
// 表名中文映射
const TABLE_NAMES = ${JSON.stringify(TABLE_NAME_MAP)};

// 内嵌导出数据
const EMBEDDED_DATA = ${jsonEmbedded};
const EMBEDDED_SUMMARY = ${JSON.stringify(summary)};

const PAGE_SIZE = 50; // 每页显示条数
let currentData = null;
let tablePages = {}; // 每个表的当前页码

function init() {
  if (EMBEDDED_DATA && Object.keys(EMBEDDED_DATA).length > 0) {
    currentData = { data: EMBEDDED_DATA, summary: EMBEDDED_SUMMARY };
    renderAll();
  } else {
    document.getElementById('loadJsonArea').classList.remove('hidden');
    setupDragDrop();
  }
}

function setupDragDrop() {
  const dz = document.getElementById('dropZone');
  ['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('dragover'); }));
  dz.addEventListener('drop', ev => {
    const file = ev.dataTransfer.files[0];
    if (file) loadFile(file);
  });
}

function handleFileSelect(ev) {
  const file = ev.target.files[0];
  if (file) loadFile(file);
}

function loadFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const json = JSON.parse(e.target.result);
      if (!json.data) throw new Error('无效的导出文件');
      currentData = json;
      document.getElementById('loadJsonArea').classList.add('hidden');
      // 更新头部信息
      if (json.tenant) {
        document.querySelector('.header h1').textContent = '📊 CRM 数据导出报告';
        document.querySelector('.header .meta').innerHTML =
          '<span>🏢 租户: <b>' + esc(json.tenant.name||'') + '</b> (' + esc(json.tenant.code||json.tenant.id||'') + ')</span>' +
          '<span>📅 导出时间: <b>' + (json.exportTime ? new Date(json.exportTime).toLocaleString('zh-CN') : '未知') + '</b></span>' +
          '<span>📋 共 <b>' + Object.keys(json.data).length + '</b> 张表</span>' +
          '<span>🔖 版本: v' + (json.version||'?') + '</span>';
      }
      renderAll();
    } catch(err) {
      alert('文件解析失败: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function renderAll() {
  if (!currentData) return;
  renderSummaryCards();
  renderTableFilter();
  renderTables();
}

function renderSummaryCards() {
  const summary = currentData.summary || {};
  const data = currentData.data || {};
  const totalRecords = Object.values(summary).reduce((a,b) => a + (b||0), 0) || Object.values(data).reduce((a,b)=>a+((b&&b.length)||0),0);
  const tableCount = Object.keys(data).length;
  // 分类统计
  const cats = {
    '👥 组织': ['departments','users','roles','permissions','role_permissions'],
    '📦 商品': ['product_categories','products'],
    '🧑‍💼 客户': ['customer_tags','customer_groups','customers','customer_shares','customer_assignments','follow_up_records','customer_files'],
    '📋 订单': ['orders','order_items','order_status_history','order_attachments','cod_cancel_applications'],
    '🔧 售后': ['after_sales_services','service_records','service_follow_ups','service_follow_up_records','service_operation_logs','after_sale_attachments'],
    '🚚 物流': ['logistics_companies','logistics_api_configs','logistics_tracking','logistics_traces'],
    '📞 通话': ['call_records','call_recordings','call_lines','user_line_assignments','phone_configs','work_phones','device_bind_logs','global_call_config','outbound_tasks','phone_blacklist'],
    '📈 业绩': ['performance_configs','performance_metrics','performance_report_configs','performance_report_logs','performance_shares','performance_share_members','commission_settings','commission_ladders'],
  };
  let cardsHtml = '<div class="card"><div class="num">' + tableCount + '</div><div class="label">数据表</div></div>' +
    '<div class="card"><div class="num">' + totalRecords.toLocaleString() + '</div><div class="label">总记录数</div></div>';
  for (const [label, tables] of Object.entries(cats)) {
    const cnt = tables.reduce((s,t) => s + ((data[t]&&data[t].length)||0), 0);
    if (cnt > 0) cardsHtml += '<div class="card"><div class="num">' + cnt.toLocaleString() + '</div><div class="label">' + label + '</div></div>';
  }
  document.getElementById('summaryCards').innerHTML = cardsHtml;
}

function renderTableFilter() {
  const sel = document.getElementById('tableFilter');
  const tables = Object.keys(currentData.data);
  sel.innerHTML = '<option value="">全部表 (' + tables.length + ')</option>';
  tables.forEach(t => {
    const cn = TABLE_NAMES[t] || t;
    const cnt = currentData.data[t].length;
    sel.innerHTML += '<option value="' + t + '">' + cn + ' (' + cnt + ')</option>';
  });
}

function renderTables() {
  const container = document.getElementById('tablesContainer');
  const data = currentData.data;
  const tables = Object.keys(data);
  tablePages = {};
  let html = '';
  tables.forEach(tableName => {
    const records = data[tableName];
    if (!records || records.length === 0) return;
    tablePages[tableName] = 1;
    const cn = TABLE_NAMES[tableName] || tableName;
    html += '<div class="table-section" data-table="' + tableName + '">' +
      '<div class="table-header" onclick="toggleTable(this)">' +
        '<h3><span class="arrow">▶</span> ' + esc(cn) + ' <code style="color:#8c8c8c;font-size:12px">' + tableName + '</code> <span class="badge">' + records.length + ' 条</span></h3>' +
      '</div>' +
      '<div class="table-body" id="tbody_' + tableName + '">' +
        renderTableContent(tableName, records, 1) +
      '</div></div>';
  });
  if (!html) html = '<div class="empty-msg">没有数据</div>';
  container.innerHTML = html;
}

function renderTableContent(tableName, records, page) {
  if (!records || records.length === 0) return '<div class="empty-msg">无数据</div>';
  const cols = Object.keys(records[0]);
  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, records.length);
  const pageRecords = records.slice(start, end);

  let html = '<table><thead><tr>';
  html += '<th style="width:40px">#</th>';
  cols.forEach(c => { html += '<th>' + esc(c) + '</th>'; });
  html += '</tr></thead><tbody>';

  pageRecords.forEach((row, idx) => {
    html += '<tr>';
    html += '<td class="cell-id">' + (start + idx + 1) + '</td>';
    cols.forEach(c => {
      const v = row[c];
      if (v === null || v === undefined) {
        html += '<td class="cell-null">NULL</td>';
      } else if (c === 'id' || c.endsWith('_id') || c === 'tenantId' || c === 'tenant_id') {
        html += '<td class="cell-id" title="' + esc(String(v)) + '">' + esc(String(v).substring(0,12)) + (String(v).length>12?'…':'') + '</td>';
      } else if (c === 'password' || c === 'secret' || c === 'token') {
        html += '<td style="color:#d9d9d9">●●●●●●</td>';
      } else {
        const sv = String(v);
        html += '<td title="' + esc(sv) + '">' + esc(sv.length > 80 ? sv.substring(0,80) + '…' : sv) + '</td>';
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  // 分页
  if (totalPages > 1) {
    html += '<div class="pagination"><span>显示 ' + (start+1) + '-' + end + ' / 共 ' + records.length + ' 条</span><div class="page-btns">';
    if (page > 1) html += '<span class="page-btn" onclick="goPage(\\'' + tableName + '\\',' + (page-1) + ')">上一页</span>';
    const startP = Math.max(1, page - 3), endP = Math.min(totalPages, page + 3);
    for (let i = startP; i <= endP; i++) {
      html += '<span class="page-btn' + (i===page?' active':'') + '" onclick="goPage(\\'' + tableName + '\\',' + i + ')">' + i + '</span>';
    }
    if (page < totalPages) html += '<span class="page-btn" onclick="goPage(\\'' + tableName + '\\',' + (page+1) + ')">下一页</span>';
    html += '</div></div>';
  }
  return html;
}

function goPage(tableName, page) {
  tablePages[tableName] = page;
  const records = currentData.data[tableName];
  const tbody = document.getElementById('tbody_' + tableName);
  if (tbody) {
    tbody.innerHTML = renderTableContent(tableName, records, page);
    tbody.classList.add('open');
  }
}

function toggleTable(header) {
  const arrow = header.querySelector('.arrow');
  const body = header.nextElementSibling;
  const isOpen = body.classList.contains('open');
  if (isOpen) { body.classList.remove('open'); arrow.classList.remove('open'); }
  else { body.classList.add('open'); arrow.classList.add('open'); }
}

function expandAll() {
  document.querySelectorAll('.table-body').forEach(b => b.classList.add('open'));
  document.querySelectorAll('.arrow').forEach(a => a.classList.add('open'));
}

function collapseAll() {
  document.querySelectorAll('.table-body').forEach(b => b.classList.remove('open'));
  document.querySelectorAll('.arrow').forEach(a => a.classList.remove('open'));
}

function filterTables() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  const tableFilter = document.getElementById('tableFilter').value;
  document.querySelectorAll('.table-section').forEach(sec => {
    const tName = sec.dataset.table;
    const cn = TABLE_NAMES[tName] || '';
    const matchTable = !tableFilter || tName === tableFilter;
    const matchKeyword = !keyword || tName.includes(keyword) || cn.includes(keyword) ||
      JSON.stringify(currentData.data[tName]).toLowerCase().includes(keyword);
    sec.style.display = (matchTable && matchKeyword) ? '' : 'none';
  });
}

init();
</script>
</body>
</html>`;
  }

  /**
   * HTML 转义（防 XSS）
   */
  private static escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 清理过期的导出任务
   */
  static cleanupExpiredJobs(maxAgeHours: number = 24): void {
    const now = new Date();
    const maxAge = maxAgeHours * 60 * 60 * 1000;

    for (const [jobId, job] of exportJobs.entries()) {
      const age = now.getTime() - job.createdAt.getTime();
      if (age > maxAge) {
        // 删除文件
        if (job.filePath && fs.existsSync(job.filePath)) {
          fs.unlinkSync(job.filePath);
        }
        if (job.htmlFilePath && fs.existsSync(job.htmlFilePath)) {
          fs.unlinkSync(job.htmlFilePath);
        }
        // 删除任务记录
        exportJobs.delete(jobId);
        log.info(`🗑️  清理过期导出任务: ${jobId}`);
      }
    }
  }
}
