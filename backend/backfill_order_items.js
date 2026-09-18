/**
 * order_items 历史数据回填脚本（一次性，幂等可重复执行）
 *
 * 背景：历史订单的商品明细只存于 orders.products(JSON)，未双写 order_items 表，
 *       导致销量统计（基于 order_items）漏掉全部历史订单（生产 delivered 7417 笔）。
 *
 * 用法（服务器上执行）：
 *   cd /www/wwwroot/abc789.cn/backend && node backfill_order_items.js
 *
 * 安全性：
 *   - 幂等：已存在于 order_items 的订单自动跳过，可反复运行
 *   - 不修改/删除任何现有数据，只 INSERT 缺失的明细行
 *   - 每单明细行继承订单的 tenant_id / 创建时间，保证租户隔离与时间口径正确
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function loadEnv(dir) {
  const env = {};
  const file = path.join(dir, '.env');
  if (!fs.existsSync(file)) throw new Error('未找到 .env: ' + file);
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

/** 兼容新老两种 products JSON 格式，提取明细 */
function parseProducts(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try { arr = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  for (const it of arr) {
    if (!it || typeof it !== 'object') continue;
    const productId = String(it.productId ?? it.id ?? '').slice(0, 50);
    if (!productId) continue;
    const quantity = Math.max(1, Number(it.quantity ?? it.num ?? it.count ?? 1) || 1);
    const unitPrice = Math.max(0, Number(it.price ?? it.unitPrice ?? 0) || 0);
    out.push({
      productId,
      productName: String(it.name ?? it.productName ?? '').slice(0, 100),
      quantity,
      unitPrice,
      subtotal: (unitPrice * quantity).toFixed(2),
      productImage: String(it.image ?? it.productImage ?? '').slice(0, 500),
      skuId: it.skuId ? String(it.skuId).slice(0, 50) : null,
      skuName: it.skuName ? String(it.skuName).slice(0, 200) : null,
    });
  }
  return out;
}

(async () => {
  const dir = __dirname;
  const env = loadEnv(dir);
  const pool = mysql.createPool({
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_DATABASE || env.DB_NAME || 'crm',
    charset: 'utf8mb4',
    connectionLimit: 4,
    waitForConnections: true,
  });

  console.log('== order_items 历史回填开始 ==');
  console.log(`目标库: ${env.DB_DATABASE}@${env.DB_HOST}`);

  // 1) 自动探测 orders 的时间列名（created_at / createdAt）
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='orders'`,
    [env.DB_DATABASE]
  );
  const colSet = new Set(cols.map(r => r.COLUMN_NAME));
  const timeCol = colSet.has('createdAt') ? 'createdAt' : (colSet.has('created_at') ? 'created_at' : null);
  console.log(`orders 时间列: ${timeCol || '(未找到，回填行不写订单时间)'}`);

  // 2) 已有明细的订单（幂等跳过集合）
  const [existing] = await pool.query(`SELECT DISTINCT orderId FROM order_items`);
  const doneOrders = new Set(existing.map(r => String(r.orderId)));
  console.log(`order_items 已覆盖订单数: ${doneOrders.size}`);

  // 3) 分页扫描全部订单
  const PAGE = 500;
  let offset = 0, totalOrders = 0, skipped = 0, parsedFail = 0, insertedRows = 0, noProducts = 0;
  for (;;) {
    const sel = `SELECT id, tenant_id, status, products${timeCol ? ', ' + timeCol + ' AS createdAt' : ''} FROM orders ORDER BY id ASC LIMIT ${PAGE} OFFSET ${offset}`;
    const [orders] = await pool.query(sel);
    if (orders.length === 0) break;
    for (const o of orders) {
      totalOrders++;
      const oid = String(o.id);
      if (doneOrders.has(oid)) { skipped++; continue; }
      const items = parseProducts(o.products);
      if (items.length === 0) { noProducts++; continue; }
      const values = items.map(it => [
        o.tenant_id || null, it.productId, oid, it.productName, it.quantity,
        it.unitPrice.toFixed(2), it.subtotal, it.productImage, it.skuId, it.skuName,
        o.createdAt || null,
      ]);
      const [ret] = await pool.query(
        `INSERT INTO order_items
           (tenant_id, productId, orderId, productName, quantity, unitPrice, subtotal, productImage, sku_id, sku_name, createdAt)
         VALUES ?`,
        [values]
      );
      insertedRows += ret.affectedRows;
    }
    offset += PAGE;
    process.stdout.write(`\r进度: 已扫描 ${totalOrders} 单 | 插入 ${insertedRows} 行 | 跳过(已有) ${skipped} | 无明细 ${noProducts}`);
  }
  console.log('\n== 回填完成 ==');
  console.log(`扫描订单: ${totalOrders} | 已有明细跳过: ${skipped} | 无products解析: ${noProducts} | 新插入明细行: ${insertedRows}`);

  // 4) 回填后的销量验证 Top5
  const [verify] = await pool.query(
    `SELECT oi.productId, p.name, SUM(oi.quantity) AS totalQty
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.productId
      INNER JOIN orders o ON o.id = oi.orderId
      WHERE o.status NOT IN ('cancelled','pending_transfer','pending_audit','audit_rejected')
      GROUP BY oi.productId, p.name ORDER BY totalQty DESC LIMIT 5`
  );
  console.log('\n回填后有效销量 Top5:');
  for (const r of verify) console.log(`  ${r.name || r.productId}: ${r.totalQty}`);

  await pool.end();
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
