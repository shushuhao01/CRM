#!/usr/bin/env node
/**
 * clean-tenant-history.mjs —— 生产环境「按日期清理指定租户历史业务数据」一键脚本
 *
 * 目标：对**指定租户**（私有部署租户），只保留「保留日期（默认 2026-08-01）」及之后产生的
 *       客户 / 订单及其全部关联业务数据，清空该日期之前（含 7 月及更早）的历史数据。
 *
 * 特性：
 *   - 默认 dry-run：只统计并打印各表将删除的行数，不做任何修改。
 *   - --execute 才会真正删除；且非 --yes 时需交互输入租户 code 二次确认。
 *   - 删除前自动 mysqldump 备份（默认整库；可用 --backup-scope=tables 只备份受影响表）。
 *   - --export 时，先把「将被删除的那批数据」导出为可回灌档案（逐表 JSON + 一键还原 SQL + 表结构）。
 *     建议先「仅导出」审阅，确认无误后再单独执行删除（导出的集合与删除集合完全一致）。
 *   - 运行时从 information_schema 自适应探测列名（snake_case / camelCase 混用），缺列自动跳过并告警。
 *   - 全部删除在一个事务内完成；异常回滚。
 *   - 配置 / 主数据 / 内容类表一律不动（脚本会打印「保留表」清单）。
 *
 * 用法：
 *   # 1) 先 dry-run 复核（强烈建议）
 *   node scripts/clean-tenant-history.mjs --tenant=<租户ID或code> --before=2026-08-01
 *   # 2) 确认无误后执行
 *   node scripts/clean-tenant-history.mjs --tenant=<租户ID或code> --before=2026-08-01 --execute --yes
 *
 * 参数：
 *   --tenant=<id|code>     必填。租户 ID 或租户 code。
 *   --before=YYYY-MM-DD    可选，默认 2026-08-01。删除该日期「之前」的数据（不含当天）。
 *   --execute              执行删除（缺省为 dry-run）。
 *   --yes                  跳过交互式二次确认。
 *   --no-backup            跳过自动备份（不推荐）。
 *   --export[=<dir>]       导出「将被删除」的数据为可回灌档案（JSON + SQL）到 <dir>（默认 backend/backups）。
 *                          单独使用时仅导出、不删除；与 --execute 组合则先导出再删除。
 *   --backup-scope=full|tables   备份范围，默认 full（整库）。
 *   --backup-dir=<dir>     备份目录，默认 backend/backups。
 *   --strict               严格模式：客户仅按 created_at 删除，不保护「被保留订单引用的老客户」。
 *   --env-file=<path>      指定 .env 文件（默认：NODE_ENV=production 用 .env，否则 .env.local 存在则用 .env.local，否则 .env）。
 *   --help                 显示帮助。
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');

// ───────────────────────── CLI 解析 ─────────────────────────
function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq === -1) args[a.slice(2)] = true;
      else args[a.slice(2, eq)] = a.slice(eq + 1);
    } else {
      args._.push(a);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 45).join('\n'));
  process.exit(0);
}

const tenantKey = args.tenant;
const beforeDate = String(args.before || '2026-08-01');
const execute = !!args.execute;
const autoYes = !!args.yes;
const noBackup = !!args['no-backup'];
const backupScope = String(args['backup-scope'] || 'full');
const backupDir = path.resolve(BACKEND_DIR, args['backup-dir'] || 'backups');
const strict = !!args.strict;
const listTenants = !!args['list-tenants'];
const wantExport = args.export !== undefined && args.export !== false;
const exportDir = wantExport
  ? path.resolve(BACKEND_DIR, typeof args.export === 'string' ? args.export : 'backups')
  : null;

if (!tenantKey && !listTenants) {
  console.error('❌ 缺少 --tenant=<租户ID或code>。使用 --help 查看用法，或加 --list-tenants 列出全部租户。');
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate)) {
  console.error(`❌ --before 格式应为 YYYY-MM-DD，收到：${beforeDate}`);
  process.exit(1);
}
if (!['full', 'tables'].includes(backupScope)) {
  console.error(`❌ --backup-scope 只能是 full 或 tables，收到：${backupScope}`);
  process.exit(1);
}

const BEFORE_TS = `${beforeDate} 00:00:00`;

// ───────────────────────── 环境加载（复刻 src/config/database.ts）─────────────────────────
function loadEnv() {
  if (args['env-file']) {
    const p = path.resolve(process.cwd(), args['env-file']);
    dotenv.config({ path: p });
    return p;
  }
  const isProd = process.env.NODE_ENV === 'production';
  const localPath = path.join(BACKEND_DIR, '.env.local');
  const prodPath = path.join(BACKEND_DIR, '.env');
  const chosen = !isProd && fs.existsSync(localPath) ? localPath : prodPath;
  dotenv.config({ path: chosen });
  return chosen;
}
const envFileUsed = loadEnv();

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || process.env.DB_NAME || 'crm',
  charset: process.env.DB_CHARSET || 'utf8mb4',
};

// ───────────────────────── 删除计划定义 ─────────────────────────
// 说明：所有表级删除均以「保留日期之前的租户数据」为界。
// 五类策略：
//   roots         —— 根表：orders / customers（按 tenant_id + created_at）
//   byOrder        —— 通过 order 外键级联：fk IN (旧订单id子查询)
//   byCustomer     —— 通过 customer 外键级联：fk IN (旧客户id子查询)
//   mixed          —— 同时有 order_id 与 customer_id：两者 OR
//   byTracking     —— logistics_traces：logisticsTrackingId IN (旧订单的物流跟踪id)
//   tenantDate     —— 租户级历史表：tenant_id = ? AND 日期列 < ?
const PLAN = {
  byTracking: [
    { table: 'logistics_traces', fk: ['logisticsTrackingId'], parent: 'logistics_tracking', parentFk: ['orderId', 'order_id'] },
  ],
  byOrder: [
    { table: 'order_items', fk: ['orderId', 'order_id'] },
    { table: 'order_status_history', fk: ['orderId', 'order_id'] },
    { table: 'order_audits', fk: ['order_id', 'orderId'] },
    { table: 'cod_cancel_applications', fk: ['order_id', 'orderId'] },
    { table: 'cod_operation_logs', fk: ['order_id', 'orderId'] },
    { table: 'logistics', fk: ['order_id', 'orderId'] },
    { table: 'logistics_status_history', fk: ['order_id', 'orderId'] },
    { table: 'logistics_exceptions', fk: ['order_id', 'orderId'] },
    { table: 'logistics_todos', fk: ['order_id', 'orderId'] },
    { table: 'logistics_tracking', fk: ['orderId', 'order_id'] },
    { table: 'payment_logs', fk: ['order_id', 'orderId'] },
    { table: 'virtual_delivery_records', fk: ['order_id', 'orderId'] },
    { table: 'value_added_operation_logs', fk: ['order_id', 'orderId'] },
    { table: 'resource_inventory', fk: ['order_id', 'orderId'] },
    { table: 'card_key_inventory', fk: ['order_id', 'orderId'] },
    { table: 'performance_operation_logs', fk: ['order_id', 'orderId'] },
    { table: 'performance_shares', fk: ['order_id', 'orderId'] },
  ],
  byCustomer: [
    { table: 'customer_follow_ups', fk: ['customer_id', 'customerId'] },
    { table: 'customer_assignments', fk: ['customer_id', 'customerId'] },
    { table: 'customer_logs', fk: ['customer_id', 'customerId'] },
    { table: 'customer_shares', fk: ['customer_id', 'customerId'] },
    { table: 'follow_up_records', fk: ['customer_id', 'customerId'] },
    { table: 'call_records', fk: ['customer_id', 'customerId'] },
    { table: 'call_recordings', fk: ['customer_id', 'customerId'] },
    { table: 'prospect_logs', fk: ['customer_id', 'customerId'] },
    { table: 'outbound_tasks', fk: ['customer_id', 'customerId'] },
    { table: 'service_records', fk: ['customerId', 'customer_id'] },
  ],
  // 同时含 order_id 与 customer_id：任一命中即删
  mixed: [
    { table: 'after_sales_services', order: ['order_id', 'orderId'], customer: ['customer_id', 'customerId'] },
    { table: 'value_added_orders', order: ['order_id', 'orderId'], customer: ['customer_id', 'customerId'] },
    { table: 'performance_records', order: ['order_id', 'orderId'], customer: ['customer_id', 'customerId'] },
    { table: 'data_records', order: ['order_id', 'orderId'], customer: ['customer_id', 'customerId'] },
  ],
  // 租户级历史数据（配置/主数据不含在内）
  tenantDate: [
    { table: 'call_prospects', date: ['created_at', 'createdAt'] },
    { table: 'capacity_orders', date: ['created_at', 'createdAt'] },
    { table: 'device_bind_logs', date: ['created_at', 'createdAt'] },
    { table: 'member_login_logs', date: ['login_at', 'created_at', 'createdAt'] },
    { table: 'message_cleanup_history', date: ['created_at', 'createdAt', 'cleanup_time', 'clean_time'] },
    { table: 'message_read_status', date: ['read_at', 'created_at', 'createdAt'] },
    { table: 'mp_card_send_logs', date: ['sent_at', 'created_at', 'createdAt'] },
    { table: 'mp_form_submissions', date: ['created_at', 'createdAt'] },
    { table: 'notification_logs', date: ['created_at', 'createdAt'] },
    { table: 'notifications', date: ['createdAt', 'created_at'] },
    { table: 'operation_logs', date: ['created_at', 'createdAt'] },
    { table: 'payment_orders', date: ['created_at', 'createdAt'] },
    { table: 'payment_records', date: ['created_at', 'createdAt'] },
    { table: 'performance_metrics', date: ['createdAt', 'created_at'] },
    { table: 'performance_share_members', date: ['created_at', 'createdAt'] },
    { table: 'service_follow_up_records', date: ['created_at', 'createdAt'] },
    { table: 'service_operation_logs', date: ['created_at', 'createdAt'] },
    { table: 'sms_quota_orders', date: ['created_at', 'createdAt'] },
    { table: 'sms_records', date: ['created_at', 'createdAt'] },
    { table: 'stock_adjustments', date: ['created_at', 'createdAt'] },
    { table: 'subscription_deduct_logs', date: ['created_at', 'createdAt'] },
    { table: 'subscriptions', date: ['created_at', 'createdAt'] },
    { table: 'system_messages', date: ['created_at', 'createdAt'] },
    { table: 'tenant_license_logs', date: ['created_at', 'createdAt'] },
    { table: 'tenant_logs', date: ['created_at', 'createdAt'] },
    { table: 'user_sessions', date: ['created_at', 'createdAt'] },
    { table: 'wechat_followers', date: ['created_at', 'createdAt'] },
    { table: 'wechat_message_logs', date: ['created_at', 'createdAt'] },
    { table: 'wecom_ai_inspect_results', date: ['created_at', 'createdAt'] },
    { table: 'wecom_ai_logs', date: ['created_at', 'createdAt'] },
    { table: 'wecom_auto_match_suggestions', date: ['created_at', 'createdAt'] },
    { table: 'wecom_chat_audit_marks', date: ['created_at', 'createdAt'] },
    { table: 'wecom_chat_records', date: ['created_at', 'createdAt'] },
    { table: 'wecom_contact_way_daily_stats', date: ['created_at', 'createdAt', 'stat_date'] },
    { table: 'wecom_convert_fan_orders', date: ['created_at', 'createdAt'] },
    { table: 'wecom_customer_events', date: ['created_at', 'createdAt'] },
    { table: 'wecom_customers', date: ['created_at', 'createdAt'] },
    { table: 'wecom_group_broadcasts', date: ['created_at', 'createdAt'] },
    { table: 'wecom_kf_sessions', date: ['created_at', 'createdAt'] },
    { table: 'wecom_payment_records', date: ['created_at', 'createdAt'] },
    { table: 'wecom_payment_refunds', date: ['created_at', 'createdAt'] },
    { table: 'wecom_quality_inspections', date: ['created_at', 'createdAt'] },
    { table: 'wecom_sensitive_hits', date: ['created_at', 'createdAt'] },
    { table: 'wecom_sidebar_auth_codes', date: ['created_at', 'createdAt'] },
    { table: 'wecom_suite_auth_links', date: ['created_at', 'createdAt'] },
    { table: 'wecom_vas_orders', date: ['created_at', 'createdAt'] },
  ],
};

// ───────────────────────── 工具函数 ─────────────────────────
const q = (id) => `\`${id.replace(/`/g, '')}\``; // 标识符引用
// 部分历史表与外键列 collation 不一致（utf8mb4_0900_ai_ci vs utf8mb4_unicode_ci），
// 显式指定比较用的 collation，避免 ER_CANT_AGGREGATE_2COLLATIONS。
const COMPARE_COLLATION = 'utf8mb4_unicode_ci';
const qc = (id) => `${q(id)} COLLATE ${COMPARE_COLLATION}`;

function pickCol(cols, candidates) {
  for (const c of candidates) if (cols.has(c)) return c;
  return null;
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

// ───────────────────────── 主流程 ─────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  租户历史数据清理脚本 clean-tenant-history');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  环境文件 : ${path.relative(process.cwd(), envFileUsed)}`);
  console.log(`  目标库   : ${DB.user}@${DB.host}:${DB.port}/${DB.database}`);
  if (tenantKey) console.log(`  目标租户 : ${tenantKey}`);
  console.log(`  保留界线 : >= ${BEFORE_TS}   （删除此时间之前的数据）`);
  console.log(`  模式     : ${execute ? '⚠️  EXECUTE（真实删除）' : 'DRY-RUN（仅统计，不修改）'}${strict ? '  [strict]' : ''}`);
  console.log('══════════════════════════════════════════════════════════════');

  const conn = await mysql.createConnection({
    ...DB,
    timezone: '+08:00',
    dateStrings: true,
    multipleStatements: false,
    // 保真导出：大整数 / DECIMAL 以字符串返回，避免 JSON 精度丢失
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  try {
    // 0) 仅列出全部租户（--list-tenants）
    if (listTenants) {
      const [rows] = await conn.query('SELECT id, code, name FROM tenants ORDER BY name');
      console.log(`共 ${rows.length} 个租户：\n`);
      for (const t of rows) console.log(`  code=${t.code}   id=${t.id}   name=${t.name}`);
      console.log('\n用上面任一 code 或 id 作为 --tenant 的值重跑。');
      return;
    }

    // 1) 定位租户
    const [tenantRows] = await conn.query(
      'SELECT id, code, name FROM tenants WHERE id = ? OR code = ? LIMIT 1',
      [tenantKey, tenantKey]
    );
    if (!tenantRows.length) {
      console.error(`❌ 未找到租户：${tenantKey}`);
      process.exit(1);
    }
    const tenant = tenantRows[0];
    console.log(`\n租户确认：${tenant.name}  (code=${tenant.code}, id=${tenant.id})`);
    const tenantId = tenant.id;

    // 2) 读取 schema（表 → 列集合；并记录列定义，供导出跳过生成列）
    const [colRows] = await conn.query(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, EXTRA, ORDINAL_POSITION
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [DB.database]
    );
    const schema = new Map();
    const colDefs = new Map();
    const asStr = (v) => (Buffer.isBuffer(v) ? v.toString() : v);
    for (const r of colRows) {
      const key = asStr(r.TABLE_NAME);
      const col = asStr(r.COLUMN_NAME);
      if (!schema.has(key)) { schema.set(key, new Set()); colDefs.set(key, []); }
      schema.get(key).add(col);
      colDefs.get(key).push({ name: col, type: asStr(r.DATA_TYPE) || '', extra: asStr(r.EXTRA) || '' });
    }
    const hasTable = (t) => schema.has(t);

    // 3) 校验根表
    for (const t of ['orders', 'customers', 'tenants']) {
      if (!hasTable(t)) { console.error(`❌ 库中缺少必需表：${t}`); process.exit(1); }
    }

    // 4) 子查询片段
    const ordersSub = `SELECT ${qc('id')} FROM ${q('orders')} WHERE ${q('tenant_id')} = ? AND ${q('created_at')} < ?`;
    const ordersSubParams = [tenantId, BEFORE_TS];

    // 旧客户谓词（非 strict 时保护「被保留订单引用」的老客户）
    const customersWhere = strict
      ? `${q('tenant_id')} = ? AND ${q('created_at')} < ?`
      : `${q('tenant_id')} = ? AND ${q('created_at')} < ? ` +
        `AND ${qc('id')} NOT IN (SELECT ${qc('customer_id')} FROM ${q('orders')} WHERE ${q('tenant_id')} = ? AND ${q('created_at')} >= ? AND ${q('customer_id')} IS NOT NULL)`;
    const customersWhereParams = strict ? [tenantId, BEFORE_TS] : [tenantId, BEFORE_TS, tenantId, BEFORE_TS];
    const customersSub = `SELECT ${q('id')} FROM ${q('customers')} WHERE ${customersWhere}`;
    const customersSubParams = customersWhereParams;

    // 5) 构建步骤：[{ label, table, sql, params }]
    const steps = [];
    const skipped = [];

    const pushStep = (label, table, sql, params) => {
      const countSql = sql.replace(/^DELETE FROM\s+`[^`]+`/i, `SELECT COUNT(*) AS n FROM ${q(table)}`);
      const selectSql = sql.replace(/^DELETE FROM\s+`[^`]+`/i, `SELECT * FROM ${q(table)}`);
      steps.push({ label, table, sql, countSql, selectSql, params });
    };

    // 5a) byTracking
    for (const it of PLAN.byTracking) {
      if (!hasTable(it.table) || !hasTable(it.parent)) { skipped.push(`${it.table}（表不存在）`); continue; }
      const cols = schema.get(it.table), pcols = schema.get(it.parent);
      const fk = pickCol(cols, it.fk), pfk = pickCol(pcols, it.parentFk);
      if (!fk || !pfk) { skipped.push(`${it.table}（缺少 ${it.fk.join('/')} 或父表外键列）`); continue; }
      const sql = `DELETE FROM ${q(it.table)} WHERE ${qc(fk)} IN (SELECT ${qc('id')} FROM ${q(it.parent)} WHERE ${qc(pfk)} IN (${ordersSub}))`;
      pushStep('byTracking', it.table, sql, [...ordersSubParams]);
    }

    // 5b) byOrder
    for (const it of PLAN.byOrder) {
      if (!hasTable(it.table)) { skipped.push(`${it.table}（表不存在）`); continue; }
      const fk = pickCol(schema.get(it.table), it.fk);
      if (!fk) { skipped.push(`${it.table}（缺少 ${it.fk.join('/')}）`); continue; }
      const sql = `DELETE FROM ${q(it.table)} WHERE ${qc(fk)} IN (${ordersSub})`;
      pushStep('byOrder', it.table, sql, [...ordersSubParams]);
    }

    // 5c) mixed（order OR customer）
    for (const it of PLAN.mixed) {
      if (!hasTable(it.table)) { skipped.push(`${it.table}（表不存在）`); continue; }
      const ocol = pickCol(schema.get(it.table), it.order);
      const ccol = pickCol(schema.get(it.table), it.customer);
      if (!ocol || !ccol) { skipped.push(`${it.table}（缺少 ${it.order.join('/')} 或 ${it.customer.join('/')}）`); continue; }
      const sql = `DELETE FROM ${q(it.table)} WHERE ${qc(ocol)} IN (${ordersSub}) OR ${qc(ccol)} IN (${customersSub})`;
      pushStep('mixed', it.table, sql, [...ordersSubParams, ...customersSubParams]);
    }

    // 5d) byCustomer
    for (const it of PLAN.byCustomer) {
      if (!hasTable(it.table)) { skipped.push(`${it.table}（表不存在）`); continue; }
      const fk = pickCol(schema.get(it.table), it.fk);
      if (!fk) { skipped.push(`${it.table}（缺少 ${it.fk.join('/')}）`); continue; }
      const sql = `DELETE FROM ${q(it.table)} WHERE ${qc(fk)} IN (${customersSub})`;
      pushStep('byCustomer', it.table, sql, [...customersSubParams]);
    }

    // 5e) tenantDate
    for (const it of PLAN.tenantDate) {
      if (!hasTable(it.table)) { skipped.push(`${it.table}（表不存在）`); continue; }
      const cols = schema.get(it.table);
      if (!cols.has('tenant_id')) { skipped.push(`${it.table}（无 tenant_id）`); continue; }
      const dcol = pickCol(cols, it.date);
      if (!dcol) { skipped.push(`${it.table}（缺少日期列 ${it.date.join('/')}）`); continue; }
      const sql = `DELETE FROM ${q(it.table)} WHERE ${q('tenant_id')} = ? AND ${q(dcol)} < ?`;
      pushStep('tenantDate', it.table, sql, [tenantId, BEFORE_TS]);
    }

    // 5f) roots：orders → customers
    pushStep('root', 'orders', `DELETE FROM ${q('orders')} WHERE ${q('tenant_id')} = ? AND ${q('created_at')} < ?`, [tenantId, BEFORE_TS]);
    pushStep('root', 'customers', `DELETE FROM ${q('customers')} WHERE ${customersWhere}`, [...customersWhereParams]);

    // 6) 统计（dry-run 与 execute 都会先统计，便于确认）
    console.log('\n── 各表将删除行数 ──────────────────────────────────────────────');
    let total = 0;
    const counts = [];
    for (const s of steps) {
      const [cr] = await conn.query(s.countSql, s.params);
      const n = Number(cr[0].n);
      counts.push({ table: s.table, group: s.label, n });
      total += n;
      if (n > 0) console.log(`  ${String(n).padStart(8)}  ${s.table.padEnd(36)} [${s.label}]`);
    }
    console.log('──────────────────────────────────────────────────────────────');
    console.log(`  合计将删除：${total} 行（涉及 ${counts.filter(c => c.n > 0).length} 张表）`);
    if (skipped.length) {
      console.log(`\n  已跳过（表/列缺失，通常为正常现象）：\n    ${skipped.join('\n    ')}`);
    }

    // 7) 保留表说明
    console.log('\n  ℹ️  配置 / 主数据 / 内容类表（如 users、departments、roles、permissions、products 系列、');
    console.log('      customer_groups/tags、各类 *_config* / *_templates / *_rules / wecom 配置表、announcements 等）');
    console.log('      不在本脚本清理范围内，保持不动。');

    // 7.5) 导出「将被删除」的数据档案（--export）
    if (wantExport) {
      console.log('\n📦 导出将被删除的数据（--export）…');
      await doExport({ conn, tenant, steps, counts, colDefs, exportDir });
      if (!execute) {
        console.log('\n✅ 导出完成，未删除任何数据。请人工审阅档案后确认无误，再执行删除：');
        console.log(`   node scripts/clean-tenant-history.mjs --tenant=${tenantKey} --before=${beforeDate} --execute --yes`);
        return;
      }
      console.log('\n（导出完成，继续执行删除流程…）');
    }

    if (!execute) {
      console.log('\n✅ DRY-RUN 完成，未修改任何数据。确认无误后加 --execute --yes 执行。');
      return;
    }

    if (total === 0) {
      console.log('\n✅ 没有匹配到任何需要删除的数据，无需执行。');
      return;
    }

    // 8) 执行前二次确认
    if (!autoYes) {
      console.log('\n⚠️  即将真实删除以上数据，且不可恢复（除备份外）。');
      const ans = await confirm(`请输入租户 code「${tenant.code}」以确认执行：`);
      if (ans.trim() !== tenant.code) {
        console.log('❌ 输入不匹配，已取消。');
        process.exit(1);
      }
    }

    // 9) 备份
    if (!noBackup) {
      doBackup(tenant, counts.filter(c => c.n > 0).map(c => c.table), schema);
    } else {
      console.log('\n⚠️  已跳过备份（--no-backup）。');
    }

    // 10) 事务内执行
    console.log('\n🚀 开始执行删除…');
    await conn.beginTransaction();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS=0');
      let done = 0;
      for (const s of steps) {
        const [res] = await conn.query(s.sql, s.params);
        if (res.affectedRows > 0) {
          done += res.affectedRows;
          console.log(`  ✓ ${s.table.padEnd(36)} 删除 ${res.affectedRows} 行`);
        }
      }
      await conn.query('SET FOREIGN_KEY_CHECKS=1');
      await conn.commit();
      console.log(`\n✅ 执行完成，共删除 ${done} 行。`);
    } catch (e) {
      await conn.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
      await conn.rollback();
      console.error('\n❌ 执行中出错，已回滚：', e.message);
      process.exit(1);
    }
  } finally {
    await conn.end().catch(() => {});
  }
}

// ───────────────────────── 备份 ─────────────────────────
function doBackup(tenant, tableList, schema) {
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(backupDir, `${DB.database}_tenant-${tenant.code}_${stamp}.sql`);

  const baseArgs = [
    `--host=${DB.host}`,
    `--port=${DB.port}`,
    `--user=${DB.user}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--skip-lock-tables',
    `--default-character-set=${DB.charset}`,
    '--no-tablespaces',
    `--result-file=${outFile}`,
    DB.database,
  ];
  const tablesToDump = backupScope === 'tables'
    ? tableList.filter(t => schema.has(t))
    : [];
  const finalArgs = [...baseArgs, ...tablesToDump];

  console.log(`\n💾 备份中（${backupScope === 'full' ? '整库' : `${tablesToDump.length} 张受影响表`}）→ ${outFile}`);
  let r = spawnSync('mysqldump', finalArgs, { env: { ...process.env, MYSQL_PWD: DB.password }, encoding: 'utf8' });
  // 兼容不支持 --no-tablespaces 的旧版 mysqldump：去掉该参数重试一次
  if (r.error || r.status !== 0) {
    if (r.error && r.error.code === 'ENOENT') {
      console.error('❌ 未找到 mysqldump，请安装 MySQL 客户端或使用 --no-backup（不推荐）。');
      process.exit(1);
    }
    console.warn('  首次备份失败，去掉 --no-tablespaces 重试…');
    const retryArgs = finalArgs.filter(a => a !== '--no-tablespaces');
    r = spawnSync('mysqldump', retryArgs, { env: { ...process.env, MYSQL_PWD: DB.password }, encoding: 'utf8' });
  }
  if (r.error || r.status !== 0) {
    console.error('❌ 备份失败，已中止删除。', r.error ? r.error.message : (r.stderr || '').slice(0, 500));
    process.exit(1);
  }
  const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
  console.log(`✅ 备份完成（${(size / 1024 / 1024).toFixed(2)} MB）：${outFile}`);
}

// ───────────────────────── 导出档案（--export）─────────────────────────
// 逐表写出 JSON（便于人工审阅）+ 一份可直接 `mysql < data.sql` 还原的 SQL，
// 以及受影响表的 CREATE TABLE 结构。导出的行 = 同一次运行中将删除的行。
class FileWriter {
  constructor(filePath) {
    this.ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
    this.err = null;
    this.ws.on('error', (e) => { this.err = e; });
  }
  async write(chunk) {
    if (this.err) throw this.err;
    if (!this.ws.write(chunk)) await once(this.ws, 'drain');
    if (this.err) throw this.err;
  }
  async close() {
    await new Promise((res, rej) => this.ws.end((e) => (e ? rej(e) : res())));
  }
}

// JSON 序列化：Buffer → base64 标记；Date → ISO（dateStrings 下通常不会出现）
function encVal(v) {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return { __buf__: v.toString('base64') };
  if (v instanceof Date) return { __date__: v.toISOString() };
  return v;
}

// SQL 字面量（isJson=true 表示目标列为 JSON 类型，须 JSON.stringify 后作为字符串字面量）
function sqlVal(conn, v, isJson) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  // JSON 列：mysql2 会解析成对象/数组/标量，需按 JSON 文本写入（含空字符串 \'\' 情形）
  if (isJson) return conn.escape(JSON.stringify(v));
  // 兜底：其它来源的对象/数组
  if (typeof v === 'object' && !(v instanceof Date)) return conn.escape(JSON.stringify(v));
  return conn.escape(v);
}

async function doExport({ conn, tenant, steps, counts, colDefs, exportDir }) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(exportDir, `tenant-${tenant.code}-export-${stamp}`);
  const dataDir = path.join(dir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  const ddlW = new FileWriter(path.join(dir, 'schema.sql'));
  const sqlW = new FileWriter(path.join(dir, 'data.sql'));
  const header =
    `-- 租户历史数据导出档案（仅包含「将被删除」的数据，可安全回灌）\n` +
    `-- 租户   : ${tenant.name} (code=${tenant.code}, id=${tenant.id})\n` +
    `-- 保留界线: >= ${BEFORE_TS}（本档案为 < ${BEFORE_TS} 的数据）\n` +
    `-- 生成时间: ${new Date().toISOString()}\n` +
    `-- 目标库 : ${DB.database}\n`;
  await ddlW.write(`${header}\n-- 受影响表结构\n\n`);
  await sqlW.write(`${header}\nSET NAMES utf8mb4;\nSET FOREIGN_KEY_CHECKS=0;\n\n`);

  const manifestTables = [];
  let totalRows = 0;

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (!counts[i] || counts[i].n <= 0) continue; // 只导出确实会被删除的表
    const defs = (colDefs.get(s.table) || [])
      .filter((c) => !/VIRTUAL GENERATED|STORED GENERATED/i.test(c.extra)); // 仅排除真正的生成列
    const cols = defs.map((c) => c.name);
    const jsonCols = new Set(defs.filter((c) => /^json$/i.test(c.type)).map((c) => c.name));
    if (!cols.length) { console.log(`  ⚠️  ${s.table} 无可插入列，跳过导出`); continue; }

    const [rows] = await conn.query(s.selectSql, s.params);
    if (!rows.length) continue;

    // 表结构（IF NOT EXISTS 安全版）
    const [ddlRows] = await conn.query(`SHOW CREATE TABLE ${q(s.table)}`);
    const ddl = String(ddlRows[0]['Create Table']).replace(/^CREATE TABLE/i, 'CREATE TABLE IF NOT EXISTS');
    await ddlW.write(`${ddl};\n\n`);
    await sqlW.write(`-- ── ${s.table} (${rows.length} 行, ${s.label}) ──\n${ddl};\n`);

    // 逐表 JSON
    const jw = new FileWriter(path.join(dataDir, `${s.table}.json`));
    await jw.write('[\n');
    for (let r = 0; r < rows.length; r++) {
      const obj = {};
      for (const c of cols) obj[c] = encVal(rows[r][c]);
      await jw.write((r ? ',\n' : '') + JSON.stringify(obj));
    }
    await jw.write('\n]\n');
    await jw.close();

    // 批量 INSERT
    const colList = cols.map(q).join(', ');
    for (let r = 0; r < rows.length; r += 200) {
      const chunk = rows.slice(r, r + 200);
      const values = chunk
        .map((row) => '(' + cols.map((c) => sqlVal(conn, row[c], jsonCols.has(c))).join(', ') + ')')
        .join(',\n  ');
      await sqlW.write(`INSERT IGNORE INTO ${q(s.table)} (${colList}) VALUES\n  ${values};\n`);
    }
    await sqlW.write('\n');

    manifestTables.push({
      table: s.table,
      group: s.label,
      rows: rows.length,
      columns: cols,
      json: `data/${s.table}.json`,
    });
    totalRows += rows.length;
    console.log(`  ✓ 导出 ${String(rows.length).padStart(8)} 行  ${s.table}`);
  }

  await sqlW.write('SET FOREIGN_KEY_CHECKS=1;\n');
  await ddlW.close();
  await sqlW.close();

  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    database: DB.database,
    tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
    beforeDate,
    keepFrom: BEFORE_TS,
    strict,
    totals: { rows: totalRows, tables: manifestTables.length },
    restore: {
      note: 'JSON 用 restore-tenant-history.mjs 回灌；SQL 可直接 mysql < data.sql 还原',
      json: `node scripts/restore-tenant-history.mjs --dir="${dir}" --execute --yes`,
      sql: `mysql -h${DB.host} -P${DB.port} -u${DB.user} -p ${DB.database} < "${path.join(dir, 'data.sql')}"`,
    },
    tables: manifestTables,
  };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\n📦 导出完成 → ${dir}`);
  console.log(`   manifest.json   档案清单（含逐表行数/列）`);
  console.log(`   schema.sql      受影响表结构`);
  console.log(`   data.sql        可一键还原 SQL（mysql < data.sql）`);
  console.log(`   data/*.json     逐表 JSON（便于人工审阅）`);
  console.log(`   合计 ${totalRows} 行 / ${manifestTables.length} 张表`);
  return dir;
}

main().catch((e) => {
  console.error('❌ 脚本异常：', e);
  process.exit(1);
});
