#!/usr/bin/env node
/**
 * restore-tenant-history.mjs —— 回灌 clean-tenant-history.mjs 导出的档案
 *
 * 用途：把先前用 `clean-tenant-history.mjs --export` 导出的「租户历史数据档案」重新写回数据库。
 *       档案为逐表 JSON（data/<table>.json）+ manifest.json（含列清单与行数）。
 *
 * 特性：
 *   - 默认 dry-run：仅统计各表将回灌的行数，不做任何修改。
 *   - --execute 才真正写入；非 --yes 时需交互输入租户 code 二次确认。
 *   - 全部写入在一个事务内完成；异常回滚。默认 INSERT IGNORE（已存在的行自动跳过）。
 *   - 也可用标准客户端直接还原 SQL：mysql -h<host> -u<user> -p <db> < <档案>/data.sql
 *
 * 用法：
 *   # 1) 先 dry-run 复核
 *   node scripts/restore-tenant-history.mjs --dir=backups/tenant-XXX-export-2026-...
 *   # 2) 执行回灌
 *   node scripts/restore-tenant-history.mjs --dir=backups/tenant-XXX-export-2026-... --execute --yes
 *
 * 参数：
 *   --dir=<档案目录>       必填。含 manifest.json 的导出档案目录（相对或绝对路径）。
 *   --tenant=<id|code>     可选。与档案中的租户不一致时报错，防误灌。
 *   --tables=a,b,c         可选。只回灌指定表（默认全部）。
 *   --execute              执行写入（缺省为 dry-run）。
 *   --yes                  跳过交互式二次确认。
 *   --no-ignore            使用普通 INSERT（默认 INSERT IGNORE，遇重复键会报错回滚）。
 *   --env-file=<path>      指定 .env 文件（默认：NODE_ENV=production 用 .env，否则 .env.local 存在则用 .env.local，否则 .env）。
 *   --help                 显示帮助。
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
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
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 33).join('\n'));
  process.exit(0);
}

const execute = !!args.execute;
const autoYes = !!args.yes;
const useIgnore = !args['no-ignore'];

if (!args.dir || args.dir === true) {
  console.error('❌ 缺少 --dir=<档案目录>。使用 --help 查看用法。');
  process.exit(1);
}

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

// ───────────────────────── 工具函数 ─────────────────────────
const q = (id) => `\`${id.replace(/`/g, '')}\``;

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans); }));
}

// JSON 反序列化：还原 Buffer 标记
function decVal(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.__buf__ === 'string') {
    return Buffer.from(v.__buf__, 'base64');
  }
  return v;
}

function sqlVal(conn, v, isJson) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v)) return `X'${v.toString('hex')}'`;
  // JSON 列：档案中保存为对象/数组/标量，需 JSON.stringify 后作为字符串字面量写入
  if (isJson) return conn.escape(JSON.stringify(v));
  // 兜底：其它来源的对象/数组
  if (typeof v === 'object' && !(v instanceof Date)) return conn.escape(JSON.stringify(v));
  return conn.escape(v);
}

// 查询目标库中所有 JSON 类型列：Map<table, Set<column>>
async function loadJsonCols(conn) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND DATA_TYPE = 'json'`,
    [DB.database]
  );
  const map = new Map();
  for (const r of rows) {
    const t = asStr(r.TABLE_NAME);
    const c = asStr(r.COLUMN_NAME);
    if (!map.has(t)) map.set(t, new Set());
    map.get(t).add(c);
  }
  return map;
}

const asStr = (v) => (Buffer.isBuffer(v) ? v.toString() : v);

// ───────────────────────── 主流程 ─────────────────────────
async function main() {
  // 1) 定位档案目录（兼容相对 backend 目录）
  let dir = path.resolve(process.cwd(), String(args.dir));
  if (!fs.existsSync(path.join(dir, 'manifest.json')) && !path.isAbsolute(String(args.dir))) {
    const alt = path.resolve(BACKEND_DIR, String(args.dir));
    if (fs.existsSync(path.join(alt, 'manifest.json'))) dir = alt;
  }
  const manifestPath = path.join(dir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ 未找到档案清单：${manifestPath}`);
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log('══════════════════════════════════════════════════════════════');
  console.log('  租户历史数据回灌 restore-tenant-history');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  环境文件 : ${path.relative(process.cwd(), envFileUsed)}`);
  console.log(`  目标库   : ${DB.user}@${DB.host}:${DB.port}/${DB.database}`);
  console.log(`  档案目录 : ${dir}`);
  console.log(`  档案租户 : ${manifest.tenant?.name} (code=${manifest.tenant?.code})`);
  console.log(`  档案生成 : ${manifest.generatedAt}   界线: < ${manifest.keepFrom}`);
  console.log(`  模式     : ${execute ? '⚠️  EXECUTE（真实写入）' : 'DRY-RUN（仅统计，不修改）'}`);
  console.log('══════════════════════════════════════════════════════════════');

  if (manifest.database && manifest.database !== DB.database) {
    console.warn(`⚠️  档案来自库「${manifest.database}」，当前连接库为「${DB.database}」，请确认目标正确。`);
  }
  if (args.tenant && args.tenant !== true) {
    const t = String(args.tenant);
    if (t !== String(manifest.tenant?.id) && t !== String(manifest.tenant?.code)) {
      console.error(`❌ --tenant=${t} 与档案租户不一致（档案：${manifest.tenant?.code} / ${manifest.tenant?.id}）。`);
      process.exit(1);
    }
  }

  // 2) 过滤表并读取 JSON
  const filter = args.tables && args.tables !== true
    ? String(args.tables).split(',').map((s) => s.trim()).filter(Boolean)
    : null;

  const payloads = [];
  let total = 0;
  for (const t of manifest.tables || []) {
    if (filter && !filter.includes(t.table)) continue;
    const fp = path.join(dir, t.json);
    if (!fs.existsSync(fp)) { console.log(`  ⚠️  缺少文件，跳过：${t.json}`); continue; }
    const rows = JSON.parse(fs.readFileSync(fp, 'utf8'));
    for (const row of rows) {
      for (const k of Object.keys(row)) row[k] = decVal(row[k]);
    }
    payloads.push({ meta: t, rows });
    total += rows.length;
  }

  console.log('\n── 各表将回灌行数 ──────────────────────────────────────────────');
  for (const p of payloads) {
    if (p.rows.length > 0) console.log(`  ${String(p.rows.length).padStart(8)}  ${p.meta.table.padEnd(36)} [${p.meta.group}]`);
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  合计将回灌：${total} 行（涉及 ${payloads.filter((p) => p.rows.length > 0).length} 张表）`);

  if (!execute) {
    console.log('\n✅ DRY-RUN 完成，未修改任何数据。确认无误后加 --execute --yes 执行回灌。');
    return;
  }
  if (total === 0) {
    console.log('\n✅ 档案中无数据，无需回灌。');
    return;
  }

  if (autoYes) {
    // 跳过确认
  } else {
    const ans = await confirm(`\n⚠️  即将写入以上数据。请输入租户 code「${manifest.tenant?.code}」以确认：`);
    if (ans.trim() !== manifest.tenant?.code) {
      console.log('❌ 输入不匹配，已取消。');
      process.exit(1);
    }
  }

  const conn = await mysql.createConnection({
    ...DB,
    timezone: '+08:00',
    dateStrings: true,
    multipleStatements: false,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });

  const insertVerb = useIgnore ? 'INSERT IGNORE' : 'INSERT';

  try {
    console.log('\n🚀 开始回灌…');
    await conn.beginTransaction();
    try {
      await conn.query('SET FOREIGN_KEY_CHECKS=0');
      const jsonCols = await loadJsonCols(conn);
      let written = 0;
      for (const p of payloads) {
        if (!p.rows.length) continue;
        const cols = p.meta.columns && p.meta.columns.length
          ? p.meta.columns
          : Object.keys(p.rows[0]);
        const tblJson = jsonCols.get(p.meta.table) || new Set();
        const colList = cols.map(q).join(', ');
        let affected = 0;
        for (let i = 0; i < p.rows.length; i += 200) {
          const chunk = p.rows.slice(i, i + 200);
          const values = chunk
            .map((row) => '(' + cols.map((c) => sqlVal(conn, row[c], tblJson.has(c))).join(', ') + ')')
            .join(',\n  ');
          const [res] = await conn.query(`${insertVerb} INTO ${q(p.meta.table)} (${colList}) VALUES\n  ${values}`);
          affected += res.affectedRows || 0;
        }
        written += affected;
        const skipped = p.rows.length - affected;
        console.log(`  ✓ ${p.meta.table.padEnd(36)} 写入 ${affected} 行${skipped > 0 ? `（已存在跳过 ${skipped}）` : ''}`);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS=1');
      await conn.commit();
      console.log(`\n✅ 回灌完成，共写入 ${written} 行。`);
    } catch (e) {
      await conn.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
      await conn.rollback();
      console.error('\n❌ 回灌中出错，已回滚：', e.message);
      process.exit(1);
    }
  } finally {
    await conn.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error('❌ 脚本异常：', e);
  process.exit(1);
});
