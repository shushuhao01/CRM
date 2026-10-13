#!/usr/bin/env node
/**
 * view-tenant-export.mjs —— 把 clean-tenant-history.mjs 导出的档案转成「离线可视化报告」
 *
 * 读取档案目录下的 manifest.json + data/*.json，生成一个**自包含**的 report.html
 * （数据全部内联，无外部依赖、无需连库、无需起服务），双击用浏览器打开即可：
 *   - 左侧列出全部表与行数，点击切换
 *   - 顶部搜索框可按任意字段过滤当前表的行
 *   - 分页浏览，NULL / JSON 字段有专门展示
 *
 * 用法：
 *   # 自动挑选 backend/backups 下最新的一个导出档案
 *   node scripts/view-tenant-export.mjs
 *   # 指定档案目录
 *   node scripts/view-tenant-export.mjs --dir=backups/tenant-P260628BD13-export-2026-10-13T15-26-52-281Z
 *   # 只把某几张表放进报告（数据量大时更快）
 *   node scripts/view-tenant-export.mjs --tables=customers,orders
 *
 * 参数：
 *   --dir=<档案目录>     导出档案目录（含 manifest.json 与 data/）。默认取 backend/backups 下最新的一个。
 *   --out=<文件>         输出 HTML 路径，默认 <档案目录>/report.html
 *   --tables=a,b,c       仅包含指定表（默认全部）
 *   --help               显示帮助。
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '..');

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
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 30).join('\n'));
  process.exit(0);
}

const BACKUP_ROOT = path.join(BACKEND_DIR, 'backups');

// 找最新的导出档案目录
function findLatestExport() {
  if (!fs.existsSync(BACKUP_ROOT)) return null;
  const dirs = fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^tenant-.*-export-/.test(d.name) && fs.existsSync(path.join(BACKUP_ROOT, d.name, 'manifest.json')))
    .map((d) => path.join(BACKUP_ROOT, d.name))
    .sort(); // 目录名含 ISO 时间戳，字典序即时间序
  return dirs.length ? dirs[dirs.length - 1] : null;
}

let archiveDir = args.dir ? path.resolve(process.cwd(), String(args.dir)) : findLatestExport();
if (!archiveDir) {
  console.error('❌ 未找到导出档案目录。请用 --dir=<档案目录> 指定（目录内需有 manifest.json 与 data/）。');
  process.exit(1);
}
const manifestPath = path.join(archiveDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`❌ ${manifestPath} 不存在，这不是一个有效的导出档案目录。`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const only = args.tables ? new Set(String(args.tables).split(',').map((s) => s.trim()).filter(Boolean)) : null;

console.log(`📂 档案目录 : ${archiveDir}`);
console.log(`   租户     : ${manifest.tenant?.name} (code=${manifest.tenant?.code})`);
console.log(`   保留界线 : >= ${manifest.keepFrom}`);
console.log(`   合计     : ${manifest.totals?.rows} 行 / ${manifest.totals?.tables} 张表\n`);

// 逐表读取 JSON（转成 {cols, rows:[[...],...]} 的紧凑表示，减少体积）
const tables = [];
for (const t of manifest.tables || []) {
  if (only && !only.has(t.table)) continue;
  const file = path.join(archiveDir, t.json || `data/${t.table}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`  ⚠️  跳过 ${t.table}：${file} 不存在`);
    continue;
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const cols = t.columns && t.columns.length ? t.columns : raw.length ? Object.keys(raw[0]) : [];
  const rows = raw.map((obj) => cols.map((c) => (obj[c] === undefined ? null : obj[c])));
  tables.push({ table: t.table, group: t.group || '', cols, rows });
  console.log(`  ✓ ${String(rows.length).padStart(8)} 行  ${t.table}`);
}

if (!tables.length) {
  console.error('\n❌ 没有任何表被载入，报告未生成。');
  process.exit(1);
}

// 内联数据：JSON 里的 '<' 转义，避免出现 </script> 破坏 HTML
function safeJson(v) {
  return JSON.stringify(v).replace(/</g, '\\u003c');
}

const meta = {
  tenant: manifest.tenant || {},
  keepFrom: manifest.keepFrom || '',
  beforeDate: manifest.beforeDate || '',
  generatedAt: manifest.generatedAt || '',
  database: manifest.database || '',
  totals: { rows: tables.reduce((a, t) => a + t.rows.length, 0), tables: tables.length },
};

const html = buildHtml(meta, tables);
const outFile = args.out ? path.resolve(process.cwd(), String(args.out)) : path.join(archiveDir, 'report.html');
fs.writeFileSync(outFile, html, 'utf8');

const sizeMb = (fs.statSync(outFile).size / 1024 / 1024).toFixed(2);
console.log(`\n✅ 报告已生成（${sizeMb} MB）→ ${outFile}`);
console.log('   把 report.html 下载到本地，双击用浏览器打开即可查看。');

// ───────────────────────── HTML 生成 ─────────────────────────
function buildHtml(meta, tables) {
  // 注意：客户端脚本内不要使用反引号模板字符串，避免与外层模板冲突；用字符串拼接。
  const dataJs = 'const META = ' + safeJson(meta) + ';\nconst TABLES = ' + safeJson(tables) + ';';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>租户数据导出档案 · ${escapeHtml(meta.tenant?.name || '')}</title>
<style>
  :root{
    --bg:#0f1115; --panel:#171a21; --panel2:#1d2129; --line:#2a2f3a;
    --fg:#e6e9ef; --muted:#8b93a3; --accent:#4c8dff; --warn:#e0a458; --null:#5b6272;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font:13px/1.5 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  header{padding:14px 18px;border-bottom:1px solid var(--line);background:var(--panel);position:sticky;top:0;z-index:5}
  header h1{margin:0 0 6px;font-size:15px;font-weight:600}
  header .meta{color:var(--muted);display:flex;gap:18px;flex-wrap:wrap}
  header .meta b{color:var(--fg);font-weight:600}
  .wrap{display:flex;min-height:calc(100vh - 74px)}
  aside{width:260px;flex:0 0 260px;border-right:1px solid var(--line);background:var(--panel);overflow:auto;max-height:calc(100vh - 74px);position:sticky;top:74px}
  aside .item{display:flex;justify-content:space-between;gap:8px;padding:8px 14px;cursor:pointer;border-left:3px solid transparent}
  aside .item:hover{background:var(--panel2)}
  aside .item.active{background:var(--panel2);border-left-color:var(--accent)}
  aside .item .n{color:var(--muted);font-variant-numeric:tabular-nums}
  aside .grp{padding:10px 14px 4px;color:var(--muted);font-size:11px;letter-spacing:.5px}
  main{flex:1;min-width:0;padding:14px 18px 40px}
  .bar{display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap}
  .bar input{background:var(--panel2);border:1px solid var(--line);color:var(--fg);padding:7px 10px;border-radius:6px;width:280px;outline:none}
  .bar input:focus{border-color:var(--accent)}
  .bar .sp{color:var(--muted)}
  .btn{background:var(--panel2);border:1px solid var(--line);color:var(--fg);padding:6px 12px;border-radius:6px;cursor:pointer}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .tblbox{overflow:auto;border:1px solid var(--line);border-radius:8px;max-height:calc(100vh - 200px)}
  table{border-collapse:separate;border-spacing:0;font-family:ui-monospace,"Consolas","Courier New",monospace;font-size:12px;white-space:nowrap}
  th,td{padding:6px 10px;border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:left;vertical-align:top;max-width:420px;overflow:hidden;text-overflow:ellipsis}
  thead th{position:sticky;top:0;background:var(--panel2);z-index:2;color:#cdd4e0;font-weight:600}
  tbody tr:nth-child(even){background:rgba(255,255,255,.02)}
  td.null{color:var(--null);font-style:italic}
  td.num{color:#8fd0a0}
  .empty{color:var(--muted);padding:30px;text-align:center}
</style>
</head>
<body>
<header>
  <h1>租户数据导出档案 · ${escapeHtml(meta.tenant?.name || '')} <span style="color:var(--muted);font-weight:400">(code=${escapeHtml(meta.tenant?.code || '')})</span></h1>
  <div class="meta">
    <span>保留界线 <b>&ge; ${escapeHtml(meta.keepFrom)}</b></span>
    <span>合计 <b>${meta.totals.rows}</b> 行 / <b>${meta.totals.tables}</b> 张表</span>
    <span>目标库 <b>${escapeHtml(meta.database)}</b></span>
    <span>生成时间 <b>${escapeHtml(meta.generatedAt)}</b></span>
  </div>
</header>
<div class="wrap">
  <aside id="side"></aside>
  <main>
    <div class="bar">
      <b id="curTable"></b>
      <span class="sp" id="curInfo"></span>
      <input id="q" placeholder="搜索当前表（任意字段包含）…">
      <button class="btn" id="prev">上一页</button>
      <span class="sp" id="pageInfo"></span>
      <button class="btn" id="next">下一页</button>
    </div>
    <div class="tblbox"><div id="tbl"></div></div>
  </main>
</div>
<script>
${dataJs}
(function(){
  var PAGE = 50;
  var cur = 0, page = 0, query = '';
  var side = document.getElementById('side');
  var tblEl = document.getElementById('tbl');
  var curTable = document.getElementById('curTable');
  var curInfo = document.getElementById('curInfo');
  var pageInfo = document.getElementById('pageInfo');
  var qEl = document.getElementById('q');

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function cellText(v){
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch(e){ return String(v); } }
    return String(v);
  }
  function groupOf(t){ return t.group || '未分组'; }

  function renderSide(){
    var html = '', last = null;
    for (var i=0;i<TABLES.length;i++){
      var g = groupOf(TABLES[i]);
      if (g !== last){ html += '<div class="grp">' + esc(g) + '</div>'; last = g; }
      html += '<div class="item' + (i===cur?' active':'') + '" data-i="' + i + '">' +
              '<span>' + esc(TABLES[i].table) + '</span>' +
              '<span class="n">' + TABLES[i].rows.length + '</span></div>';
    }
    side.innerHTML = html;
    var items = side.querySelectorAll('.item');
    for (var k=0;k<items.length;k++){
      items[k].onclick = function(){ cur = Number(this.getAttribute('data-i')); page = 0; qEl.value=''; query=''; renderSide(); renderTable(); };
    }
  }

  function filtered(){
    var t = TABLES[cur];
    if (!query) return t.rows;
    var q = query.toLowerCase();
    var out = [];
    for (var i=0;i<t.rows.length;i++){
      var r = t.rows[i];
      for (var j=0;j<r.length;j++){
        var s = cellText(r[j]);
        if (s && s.toLowerCase().indexOf(q) !== -1){ out.push(r); break; }
      }
    }
    return out;
  }

  function renderTable(){
    var t = TABLES[cur];
    curTable.textContent = t.table;
    var rows = filtered();
    var pages = Math.max(1, Math.ceil(rows.length / PAGE));
    if (page >= pages) page = pages - 1;
    if (page < 0) page = 0;
    curInfo.textContent = rows.length + ' 行 / ' + t.cols.length + ' 列' + (query ? '（已过滤）' : '');
    pageInfo.textContent = '第 ' + (page+1) + ' / ' + pages + ' 页';
    document.getElementById('prev').disabled = page <= 0;
    document.getElementById('next').disabled = page >= pages - 1;

    if (!rows.length){ tblEl.innerHTML = '<div class="empty">无匹配数据</div>'; return; }

    var start = page * PAGE, end = Math.min(start + PAGE, rows.length);
    var h = '<table><thead><tr><th>#</th>';
    for (var c=0;c<t.cols.length;c++) h += '<th>' + esc(t.cols[c]) + '</th>';
    h += '</tr></thead><tbody>';
    for (var i=start;i<end;i++){
      var r = rows[i];
      h += '<tr><td class="null">' + (i+1) + '</td>';
      for (var j=0;j<t.cols.length;j++){
        var v = r[j], s = cellText(v);
        if (s === null){ h += '<td class="null">NULL</td>'; continue; }
        var cls = (typeof v === 'number') ? ' class="num"' : '';
        var full = esc(s);
        var shown = full.length > 300 ? full.slice(0,300) + '…' : full;
        h += '<td' + cls + ' title="' + full.replace(/"/g,'&quot;').slice(0,2000) + '">' + shown + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>';
    tblEl.innerHTML = h;
  }

  var timer = null;
  qEl.oninput = function(){ clearTimeout(timer); var v = this.value; timer = setTimeout(function(){ query = v; page = 0; renderTable(); }, 200); };
  document.getElementById('prev').onclick = function(){ page--; renderTable(); };
  document.getElementById('next').onclick = function(){ page++; renderTable(); };

  renderSide();
  renderTable();
})();
</script>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
