#!/bin/bash

# ============================================================
# 服务器磁盘安全深度清理脚本（无交互，自动执行）
# 安全保证：不删除数据库数据、网站源码、配置文件
# 清理范围：日志、缓存、备份、临时文件、Docker垃圾
# ============================================================

echo "=========================================="
echo "🧹 服务器磁盘安全深度清理"
echo "=========================================="
echo ""
echo "⏰ 开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📊 清理前磁盘状态："
df -h /
echo ""

TOTAL_FREED=0

freed_size() {
    local before=$1
    local after=$2
    local freed=$((before - after))
    if [ $freed -lt 0 ]; then freed=0; fi
    TOTAL_FREED=$((TOTAL_FREED + freed))
    echo "   ✅ 释放: $(numfmt --to=iec $freed 2>/dev/null || echo "${freed} bytes")"
}

# ============================================================
# 第一部分：网站日志（通常最大的占用源之一）
# ============================================================
echo ""
echo "====== 第一部分：清理网站日志 ======"

echo "[1] 清空网站访问日志（截断为0，不删除文件）..."
if [ -d "/www/wwwlogs" ]; then
    BEFORE=$(du -sb /www/wwwlogs 2>/dev/null | awk '{print $1}')
    # 截断所有日志文件为0（nginx不用重启就能继续写）
    find /www/wwwlogs -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null
    # 删除压缩的旧日志
    find /www/wwwlogs -type f -name "*.gz" -delete 2>/dev/null
    # 删除request目录下的文件（宝塔WAF请求日志）
    rm -rf /www/wwwlogs/request 2>/dev/null
    mkdir -p /www/wwwlogs/request 2>/dev/null
    AFTER=$(du -sb /www/wwwlogs 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

# ============================================================
# 第二部分：宝塔面板相关
# ============================================================
echo ""
echo "====== 第二部分：清理宝塔面板 ======"

echo "[2] 清理宝塔面板日志..."
if [ -d "/www/server/panel/logs" ]; then
    BEFORE=$(du -sb /www/server/panel/logs 2>/dev/null | awk '{print $1}')
    find /www/server/panel/logs -type f -exec truncate -s 0 {} \; 2>/dev/null
    AFTER=$(du -sb /www/server/panel/logs 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

echo "[3] 清理宝塔面板临时文件..."
if [ -d "/www/server/panel/temp" ]; then
    BEFORE=$(du -sb /www/server/panel/temp 2>/dev/null | awk '{print $1}')
    rm -rf /www/server/panel/temp/* 2>/dev/null
    AFTER=$(du -sb /www/server/panel/temp 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

echo "[4] 清理宝塔回收站..."
if [ -d "/www/Recycle_bin" ]; then
    BEFORE=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    rm -rf /www/Recycle_bin/* 2>/dev/null
    AFTER=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

echo "[5] 清理宝塔旧版本备份（PHP/Nginx备份）..."
BEFORE_ALL=0
AFTER_ALL=0
for bakfile in /www/backup/*.Bak /www/backup/*4bak; do
    if [ -e "$bakfile" ]; then
        SIZE=$(du -sb "$bakfile" 2>/dev/null | awk '{print $1}')
        BEFORE_ALL=$((BEFORE_ALL + SIZE))
        rm -rf "$bakfile" 2>/dev/null
    fi
done
# 清理宝塔面板备份（保留最新1个）
if [ -d "/www/backup/panel" ]; then
    SIZE=$(du -sb /www/backup/panel 2>/dev/null | awk '{print $1}')
    BEFORE_ALL=$((BEFORE_ALL + SIZE))
    rm -rf /www/backup/panel/* 2>/dev/null
fi
freed_size $BEFORE_ALL 0

echo "[6] 清理旧的数据库备份（保留最近3天）..."
if [ -d "/www/backup/database" ]; then
    BEFORE=$(du -sb /www/backup/database 2>/dev/null | awk '{print $1}')
    find /www/backup/database -type f -mtime +3 -delete 2>/dev/null
    AFTER=$(du -sb /www/backup/database 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

# ============================================================
# 第三部分：MySQL日志（binlog是空间杀手）
# ============================================================
echo ""
echo "====== 第三部分：清理MySQL日志 ======"

echo "[7] 清理MySQL binlog..."
# 尝试通过MySQL命令清理
BIN_SIZE_BEFORE=$(find /www/server/data -name "mysql-bin.*" -type f -exec du -cb {} + 2>/dev/null | tail -1 | awk '{print $1}')
BIN_SIZE_BEFORE=${BIN_SIZE_BEFORE:-0}
# 尝试多种方式获取MySQL root密码并清理
BT_MYSQL_PASS=$(cat /www/server/panel/data/db_mysql.json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['password'])" 2>/dev/null)
if [ -z "$BT_MYSQL_PASS" ]; then
    BT_MYSQL_PASS=$(cat /www/server/panel/data/db.json 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin)['mysql_root'])" 2>/dev/null)
fi
if [ -n "$BT_MYSQL_PASS" ]; then
    mysql -uroot -p"$BT_MYSQL_PASS" -e "PURGE BINARY LOGS BEFORE NOW();" 2>/dev/null
    mysql -uroot -p"$BT_MYSQL_PASS" -e "RESET MASTER;" 2>/dev/null
    echo "   ✅ MySQL binlog 已清理（通过密码）"
else
    # 尝试无密码登录（socket认证）
    mysql -e "PURGE BINARY LOGS BEFORE NOW();" 2>/dev/null && mysql -e "RESET MASTER;" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo "   ⚠️  无法自动获取MySQL密码，尝试直接删除binlog文件..."
        # 停止MySQL -> 删除binlog -> 启动MySQL（安全方式）
        echo "   跳过MySQL binlog清理，请手动在phpMyAdmin执行: RESET MASTER;"
    fi
fi
BIN_SIZE_AFTER=$(find /www/server/data -name "mysql-bin.*" -type f -exec du -cb {} + 2>/dev/null | tail -1 | awk '{print $1}')
BIN_SIZE_AFTER=${BIN_SIZE_AFTER:-0}
freed_size $BIN_SIZE_BEFORE $BIN_SIZE_AFTER

echo "[8] 清空MySQL错误日志和慢查询日志..."
BEFORE=0
for logfile in /www/server/data/*.err /www/server/data/*-slow.log; do
    if [ -f "$logfile" ]; then
        SIZE=$(du -sb "$logfile" 2>/dev/null | awk '{print $1}')
        BEFORE=$((BEFORE + SIZE))
        truncate -s 0 "$logfile" 2>/dev/null
    fi
done
freed_size $BEFORE 0

# ============================================================
# 第四部分：系统日志和缓存
# ============================================================
echo ""
echo "====== 第四部分：清理系统日志和缓存 ======"

echo "[9] 压缩systemd日志（保留50M）..."
BEFORE=$(du -sb /var/log/journal 2>/dev/null | awk '{print $1}')
BEFORE=${BEFORE:-0}
journalctl --vacuum-size=50M 2>/dev/null
AFTER=$(du -sb /var/log/journal 2>/dev/null | awk '{print $1}')
AFTER=${AFTER:-0}
freed_size $BEFORE $AFTER

echo "[10] 清理系统日志..."
BEFORE=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
find /var/log -type f -name "*.log" -size +10M -exec truncate -s 0 {} \; 2>/dev/null
find /var/log -type f -name "*.gz" -delete 2>/dev/null
find /var/log -type f -name "*.old" -delete 2>/dev/null
find /var/log -type f -name "*.1" -delete 2>/dev/null
find /var/log -type f -name "*.2" -delete 2>/dev/null
cat /dev/null > /var/log/syslog 2>/dev/null
cat /dev/null > /var/log/kern.log 2>/dev/null
cat /dev/null > /var/log/auth.log 2>/dev/null
cat /dev/null > /var/log/dpkg.log 2>/dev/null
AFTER=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
freed_size $BEFORE $AFTER

echo "[11] 清理APT缓存..."
BEFORE=$(du -sb /var/cache/apt 2>/dev/null | awk '{print $1}')
BEFORE=${BEFORE:-0}
apt-get clean -y 2>/dev/null
apt-get autoclean -y 2>/dev/null
apt-get autoremove -y 2>/dev/null
AFTER=$(du -sb /var/cache/apt 2>/dev/null | awk '{print $1}')
AFTER=${AFTER:-0}
freed_size $BEFORE $AFTER

echo "[12] 清理npm/pip/yarn缓存..."
BEFORE=0
if [ -d "/root/.npm" ]; then
    SIZE=$(du -sb /root/.npm 2>/dev/null | awk '{print $1}')
    BEFORE=$((BEFORE + SIZE))
fi
if [ -d "/root/.cache" ]; then
    SIZE=$(du -sb /root/.cache 2>/dev/null | awk '{print $1}')
    BEFORE=$((BEFORE + SIZE))
fi
npm cache clean --force 2>/dev/null
rm -rf /root/.npm/_cacache 2>/dev/null
rm -rf /root/.cache/pip 2>/dev/null
rm -rf /root/.cache/yarn 2>/dev/null
rm -rf /root/.yarn/cache 2>/dev/null
pip cache purge 2>/dev/null
pip3 cache purge 2>/dev/null
AFTER=0
if [ -d "/root/.npm" ]; then
    SIZE=$(du -sb /root/.npm 2>/dev/null | awk '{print $1}')
    AFTER=$((AFTER + SIZE))
fi
if [ -d "/root/.cache" ]; then
    SIZE=$(du -sb /root/.cache 2>/dev/null | awk '{print $1}')
    AFTER=$((AFTER + SIZE))
fi
freed_size $BEFORE $AFTER

# ============================================================
# 第五部分：Docker清理
# ============================================================
echo ""
echo "====== 第五部分：清理Docker ======"

echo "[13] 清理Docker未使用资源..."
if command -v docker &> /dev/null; then
    echo "   Docker清理前:"
    docker system df 2>/dev/null
    # 清理停止的容器、悬空镜像、未使用的网络
    docker container prune -f 2>/dev/null
    docker image prune -a -f 2>/dev/null
    docker volume prune -f 2>/dev/null
    docker network prune -f 2>/dev/null
    docker builder prune -a -f 2>/dev/null
    echo "   Docker清理后:"
    docker system df 2>/dev/null
else
    echo "   Docker未安装，跳过"
fi

# ============================================================
# 第六部分：临时文件和其他
# ============================================================
echo ""
echo "====== 第六部分：清理临时文件 ======"

echo "[14] 清理/tmp临时文件..."
BEFORE=$(du -sb /tmp 2>/dev/null | awk '{print $1}')
find /tmp -type f -atime +1 -delete 2>/dev/null
find /tmp -type d -empty -delete 2>/dev/null
rm -f /tmp/sess_* 2>/dev/null
rm -rf /tmp/php* 2>/dev/null
AFTER=$(du -sb /tmp 2>/dev/null | awk '{print $1}')
freed_size $BEFORE $AFTER

echo "[15] 清理旧的PM2日志..."
if [ -d "/root/.pm2/logs" ]; then
    BEFORE=$(du -sb /root/.pm2/logs 2>/dev/null | awk '{print $1}')
    # 截断日志而不删除（PM2需要这些文件）
    find /root/.pm2/logs -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null
    AFTER=$(du -sb /root/.pm2/logs 2>/dev/null | awk '{print $1}')
    freed_size $BEFORE $AFTER
fi

echo "[16] 清理旧的core dump文件..."
find / -maxdepth 3 -name "core.*" -type f -delete 2>/dev/null
find / -maxdepth 3 -name "core" -type f -size +1M -delete 2>/dev/null

# ============================================================
# 诊断：查找剩余大文件
# ============================================================
echo ""
echo "====== 📋 诊断：剩余大文件 TOP 20 ======"
echo ""
find / -type f -size +50M -not -path "/proc/*" -not -path "/sys/*" -not -path "/www/server/data/*.ibd" -not -path "/www/server/data/ibdata*" -not -path "/www/server/data/undo_*" -not -path "/www/server/data/#*" -not -path "/www/wwwroot/*/node_modules/*" -printf '%s %p\n' 2>/dev/null | sort -rn | head -20 | while read size path; do
    echo "   $(numfmt --to=iec $size)\t$path"
done

echo ""
echo "====== 📋 诊断：各网站目录大小 ======"
echo ""
du -sh /www/wwwroot/* 2>/dev/null | sort -rh | head -20

echo ""
echo "====== 📋 诊断：Docker存储大小 ======"
du -sh /var/lib/docker 2>/dev/null || echo "   无Docker数据"

echo ""
echo "=========================================="
echo "🎉 清理完成！"
echo "=========================================="
echo ""
echo "📊 总共释放空间: $(numfmt --to=iec $TOTAL_FREED 2>/dev/null || echo "${TOTAL_FREED} bytes")"
echo ""
echo "📊 清理后磁盘状态："
df -h /
echo ""
echo "⏰ 完成时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "💡 如果空间仍然不够，查看上面的'剩余大文件'和'各网站目录大小'"
echo "   根据输出决定是否可以进一步清理"
echo ""

