#!/bin/bash
# CRM 服务器一键诊断 + 幂等补建商品相关索引
# 用法：在服务器上执行  bash server_diag.sh
# 作用：定位「商品列表卡死/整站 502」的根因，若关键索引缺失则直接补上

# 自动定位 backend 目录：优先脚本所在目录（支持把脚本直接放进 backend 内运行）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  cd "$SCRIPT_DIR"
elif [ -f "$SCRIPT_DIR/backend/.env" ]; then
  cd "$SCRIPT_DIR/backend"
elif [ -f /www/wwwroot/abc789.cn/backend/.env ]; then
  cd /www/wwwroot/abc789.cn/backend
else
  echo "找不到 backend 目录(未发现 .env)，请把脚本放在 backend 目录内运行"; exit 1
fi

echo "========== 1. PM2 进程状态 =========="
pm2 list 2>/dev/null || echo "(pm2 不可用)"

echo ""
echo "========== 2. 系统资源快照 =========="
top -b -n1 2>/dev/null | head -15
echo "---- 内存 ----"
free -m

echo ""
echo "========== 3. 后端最近日志(60行) =========="
pm2 logs --nostream --lines 60 2>/dev/null | tail -80 || echo "(无法读取 pm2 日志)"

# ---- 读取数据库配置 ----
ENVF=".env"
[ -f "$ENVF" ] || { echo "未找到 $ENVF，跳过数据库诊断"; exit 0; }
getenv() { grep -E "^$1=" "$ENVF" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'"; }
DB_HOST=$(getenv DB_HOST); DB_HOST=${DB_HOST:-localhost}
DB_PORT=$(getenv DB_PORT); DB_PORT=${DB_PORT:-3306}
DB_NAME=$(getenv DB_DATABASE)
DB_USER=$(getenv DB_USERNAME)
DB_PASS=$(getenv DB_PASSWORD)
export MYSQL_PWD="$DB_PASS"
M="mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_NAME} -N -e"
M_SHOW="mysql -h${DB_HOST} -P${DB_PORT} -u${DB_USER} ${DB_NAME} -e"

echo ""
echo "========== 4. MySQL 当前查询(找堆积) =========="
$M_SHOW "SHOW FULL PROCESSLIST;" 2>/dev/null | head -30 || echo "(MySQL 连接失败，请检查 .env 配置)"

echo ""
echo "========== 5. 表行数 =========="
for TBL in order_items orders products product_skus card_key_inventory; do
  CNT=$($M "SELECT COUNT(*) FROM ${TBL};" 2>/dev/null)
  echo "${TBL}: ${CNT:-查询失败}"
done

echo ""
echo "========== 6. 关键索引现状 =========="
$M_SHOW "SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS cols
FROM information_schema.STATISTICS
WHERE table_schema='${DB_NAME}'
  AND ((table_name='order_items' AND index_name LIKE 'idx_order_items%')
    OR (table_name='product_skus' AND index_name='idx_product_skus_productId')
    OR (table_name='product_spec_groups' AND index_name='idx_product_spec_groups_productId'))
GROUP BY table_name, index_name;" 2>/dev/null

echo ""
echo "========== 7. 幂等补建缺失索引 =========="
ensure_index() {
  local TBL=$1 IDX=$2 COLS=$3
  local HAS=$($M "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE table_schema='${DB_NAME}' AND table_name='${TBL}' AND index_name='${IDX}';" 2>/dev/null)
  if [ "$HAS" = "0" ]; then
    echo ">> ${TBL} 缺少索引 ${IDX}(${COLS})，正在创建(表大时可能耗时几十秒)..."
    if $M_SHOW "CREATE INDEX ${IDX} ON ${TBL} (${COLS});" 2>/dev/null; then
      echo ">> ✔ ${IDX} 创建成功"
    else
      echo ">> ✘ ${IDX} 创建失败(可能权限不足)"
    fi
  else
    echo ">> ${TBL}.${IDX} 已存在，跳过"
  fi
}
ensure_index order_items idx_order_items_productId "product_id"
ensure_index order_items idx_order_items_orderId "order_id"
ensure_index product_skus idx_product_skus_productId "product_id"
ensure_index product_spec_groups idx_product_spec_groups_productId "product_id"

echo ""
echo "========== 8. 表排序规则对比(定位JOIN变慢根因) =========="
$M_SHOW "SELECT TABLE_NAME, COLUMN_NAME, CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='${DB_NAME}' AND ((TABLE_NAME='order_items' AND COLUMN_NAME IN ('order_id','product_id','tenant_id')) OR (TABLE_NAME='orders' AND COLUMN_NAME IN ('id','tenant_id','status'))) ORDER BY TABLE_NAME, COLUMN_NAME;" 2>/dev/null
$M_SHOW "SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA='${DB_NAME}' AND TABLE_NAME IN ('order_items','orders','product_skus','product_spec_groups');" 2>/dev/null

echo ""
echo "========== 10. 销量数据源审计(order_items覆盖与租户分布) =========="
echo "--- orders 租户分布 ---"
$M_SHOW "SELECT tenant_id, COUNT(*) AS cnt FROM orders GROUP BY tenant_id ORDER BY cnt DESC LIMIT 5;" 2>/dev/null
echo "--- order_items 租户分布 ---"
$M_SHOW "SELECT tenant_id, COUNT(*) AS cnt FROM order_items GROUP BY tenant_id ORDER BY cnt DESC LIMIT 5;" 2>/dev/null
echo "--- order_items 中 tenant_id 为 NULL/空 的行数 ---"
$M_SHOW "SELECT COUNT(*) AS null_tenant_rows FROM order_items WHERE tenant_id IS NULL OR tenant_id='';" 2>/dev/null
echo "--- 已送达订单中在 order_items 有明细的覆盖数 ---"
$M_SHOW "SELECT COUNT(DISTINCT o.id) AS delivered_with_items FROM orders o INNER JOIN order_items oi ON oi.orderId=o.id WHERE o.status='delivered';" 2>/dev/null
$M_SHOW "SELECT COUNT(*) AS delivered_total FROM orders WHERE status='delivered';" 2>/dev/null

echo ""
echo "========== 9. MySQL 版本(确认 MAX_EXECUTION_TIME 是否生效) =========="
$M "SELECT VERSION();" 2>/dev/null

echo ""
echo "========== 11. 部署版本与运行时销量审计(实锤API销量0根因) =========="
echo "--- 11.1 dist 中的 ProductController.js ---"
PC_FILE=$(find dist -name 'ProductController.js' 2>/dev/null | head -1)
if [ -n "$PC_FILE" ]; then
  echo "文件: $PC_FILE"
  ls -la "$PC_FILE" | awk '{print "mtime:", $6, $7, $8}'
  echo "--- 11.2 dist 特征检查 ---"
  C1=$(grep -c 'oi.productId AS productId' "$PC_FILE" 2>/dev/null)
  C2=$(grep -c '销量统计' "$PC_FILE" 2>/dev/null)
  C3=$(grep -c 'unitPrice FROM order_items' "$PC_FILE" 2>/dev/null)
  echo "列表列名修复特征(≥1为有): $C1"
  echo "列表统计日志特征(≥1为有): $C2"
  echo "详情v3统计特征(order_items口径,≥1为有): $C3"
  if [ "${C1:-0}" -ge 1 ] && [ "${C2:-0}" -ge 1 ]; then
    echo "=> dist 包含列名修复版代码"
  else
    echo "=> ⚠️ dist 是旧代码！本地最新构建后重新上传 dist 并 pm2 restart all"
  fi
else
  echo "未找到 dist 下的 ProductController.js！"
fi
echo "--- 11.3 运行时日志: 列表销量统计实际结果(winston info级) ---"
if [ -f logs/combined.log ]; then
  grep '销量统计' logs/combined.log 2>/dev/null | tail -3
  [ ${PIPESTATUS[0]} -ne 0 ] && echo "(combined.log 中无「销量统计」记录 => 生产代码未执行统计段或 dist 为旧版)"
else
  echo "(backend/logs/combined.log 不存在, PM2 cwd 可能不在 backend 目录)"
fi
echo "--- 11.4 运行时日志: 统计失败记录 ---"
grep '统计销量失败' logs/combined.log logs/error.log 2>/dev/null | tail -5
echo "--- 11.5 combined.log 最后修改时间(判断日志新鲜度) ---"
ls -la logs/combined.log 2>/dev/null | awk '{print $6, $7, $8}'

echo ""
echo "诊断完成。请将本页完整输出发回给开发。"
