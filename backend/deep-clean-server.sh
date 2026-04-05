#!/bin/bash

# 深度清理脚本 - 适用于宝塔服务器
# 警告：此脚本会清理更多内容，请确保已备份重要数据

echo "=========================================="
echo "宝塔服务器深度清理脚本"
echo "=========================================="
echo ""
echo "警告：此脚本将执行深度清理"
echo "建议先备份重要数据"
echo ""
read -p "确认继续？(输入 yes 继续): " confirm

if [ "$confirm" != "yes" ]; then
    echo "已取消清理"
    exit 0
fi

echo ""
echo "开始深度清理..."
echo ""

# 显示清理前的磁盘使用
echo "清理前磁盘使用："
df -h /
echo ""

# 1. 清理APT缓存（Ubuntu/Debian）
if command -v apt-get &> /dev/null; then
    echo "[1] 清理APT缓存..."
    apt-get clean
    apt-get autoclean
    apt-get autoremove -y
    echo "   完成"
fi

# 2. 清理YUM缓存（CentOS/RHEL）
if command -v yum &> /dev/null; then
    echo "[2] 清理YUM缓存..."
    yum clean all
    echo "   完成"
fi

# 3. 清理日志文件
echo "[3] 清理大型日志文件..."
find /var/log -type f -name "*.log" -size +100M -exec truncate -s 0 {} \;
find /var/log -type f -name "*.log.*" -delete
find /var/log -type f -name "*.gz" -delete
find /www/wwwlogs -type f -name "*.log" -mtime +3 -delete
find /www/wwwlogs -type f -name "*.gz" -delete
echo "   完成"

# 4. 清理所有临时文件
echo "[4] 清理临时文件..."
rm -rf /tmp/*
rm -rf /var/tmp/*
rm -rf /www/server/panel/temp/*
echo "   完成"

# 5. 清理宝塔回收站
echo "[5] 清理宝塔回收站..."
rm -rf /www/Recycle_bin/*
echo "   完成"

# 6. 清理旧备份（只保留最近3天）
echo "[6] 清理旧备份（保留最近3天）..."
find /www/backup/database -type f -mtime +3 -delete 2>/dev/null
find /www/backup/site -type f -mtime +3 -delete 2>/dev/null
echo "   完成"

# 7. 清理MySQL二进制日志（如果不需要）
echo "[7] 清理MySQL二进制日志..."
if command -v mysql &> /dev/null; then
    mysql -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);" 2>/dev/null
    echo "   完成"
fi

# 8. 清理Docker（如果使用）
echo "[8] 清理Docker..."
if command -v docker &> /dev/null; then
    docker system prune -af --volumes
    echo "   完成"
fi

# 9. 清理npm/yarn全局缓存
echo "[9] 清理npm/yarn缓存..."
npm cache clean --force 2>/dev/null
yarn cache clean 2>/dev/null
echo "   完成"

# 10. 清理旧的core dump文件
echo "[10] 清理core dump文件..."
find / -name "core.*" -type f -delete 2>/dev/null
echo "   完成"

# 11. 清理缩略图缓存
echo "[11] 清理缩略图缓存..."
rm -rf ~/.cache/thumbnails/*
echo "   完成"

# 12. 清理systemd日志（保留最近3天）
echo "[12] 清理systemd日志..."
if command -v journalctl &> /dev/null; then
    journalctl --vacuum-time=3d
    echo "   完成"
fi

# 13. 清理邮件队列
echo "[13] 清理邮件队列..."
rm -rf /var/spool/mail/*
echo "   完成"

# 14. 清理旧的内核（保留当前和最新的）
echo "[14] 清理旧内核..."
if command -v apt-get &> /dev/null; then
    apt-get autoremove --purge -y
fi
echo "   完成"

# 15. 清理孤立的包
echo "[15] 清理孤立的包..."
if command -v apt-get &> /dev/null; then
    apt-get autoremove -y
    apt-get autoclean
fi
echo "   完成"

echo ""
echo "=========================================="
echo "深度清理完成！"
echo "=========================================="
echo ""
echo "清理后磁盘使用："
df -h /
echo ""
echo "建议重启服务以释放内存："
echo "  systemctl restart nginx"
echo "  systemctl restart mysql"
echo "  systemctl restart php-fpm"
echo ""
