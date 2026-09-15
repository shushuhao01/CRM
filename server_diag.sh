#!/bin/bash
# CRM 服务器一键诊断 + 幂等补建商品相关索引
# 用法：在服务器上执行  bash server_diag.sh
# 作用：定位「商品列表卡死/整站 502」的根因，若关键索引缺失则直接补上

cd /www/wwwroot/CRM/backend || cd "$(dirname "$0")/backend" || { echo "找不到 backend 目录"; exit 1; }

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
echo "========== 8. MySQL 版本(确认 MAX_EXECUTION_TIME 是否生效) =========="
$M "SELECT VERSION();" 2>/dev/null

echo ""
echo "诊断完成。请将本页完整输出发回给开发。"
