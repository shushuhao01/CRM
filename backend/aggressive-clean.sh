#!/bin/bash

# 激进清理脚本 - 释放最大空间
# 警告：会删除所有备份、日志等非核心文件

echo "=========================================="
echo "激进清理脚本"
echo "=========================================="
echo ""
echo "⚠️  警告：此脚本将执行激进清理！"
echo ""
echo "将要删除："
echo "  - 所有数据库备份"
echo "  - 所有网站备份"
echo "  - 所有日志文件"
echo "  - 宝塔回收站"
echo "  - 所有临时文件"
echo "  - MySQL二进制日志"
echo "  - 系统缓存"
echo ""
echo "⚠️  重要数据不会删除："
echo "  ✓ 数据库数据"
echo "  ✓ 网站源代码"
echo "  ✓ 配置文件"
echo ""
read -p "确认继续？输入 DELETE 继续: " confirm

if [ "$confirm" != "DELETE" ]; then
    echo "已取消"
    exit 0
fi

echo ""
echo "开始激进清理..."
echo ""

# 记录清理前的空间
BEFORE=$(df / | tail -1 | awk '{print $3}')

# 1. 删除所有数据库备份
echo "[1/15] 删除所有数据库备份..."
if [ -d "/www/backup/database" ]; then
    SIZE=$(du -sb /www/backup/database 2>/dev/null | awk '{print $1}')
    rm -rf /www/backup/database/*
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 2. 删除所有网站备份
echo "[2/15] 删除所有网站备份..."
if [ -d "/www/backup/site" ]; then
    SIZE=$(du -sb /www/backup/site 2>/dev/null | awk '{print $1}')
    rm -rf /www/backup/site/*
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 3. 删除所有网站日志
echo "[3/15] 删除所有网站日志..."
if [ -d "/www/wwwlogs" ]; then
    SIZE=$(du -sb /www/wwwlogs 2>/dev/null | awk '{print $1}')
    rm -rf /www/wwwlogs/*
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 4. 清空宝塔回收站
echo "[4/15] 清空宝塔回收站..."
if [ -d "/www/Recycle_bin" ]; then
    SIZE=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    rm -rf /www/Recycle_bin/*
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 5. 清理MySQL二进制日志
echo "[5/15] 清理MySQL二进制日志..."
if [ -d "/www/server/data" ]; then
    SIZE=$(find /www/server/data -name "mysql-bin.*" -type f -exec du -cb {} + 2>/dev/null | tail -1 | awk '{print $1}')
    find /www/server/data -name "mysql-bin.*" -type f -delete 2>/dev/null
    mysql -e "RESET MASTER;" 2>/dev/null
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 6. 清理系统日志
echo "[6/15] 清理系统日志..."
SIZE=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
find /var/log -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null
find /var/log -type f -name "*.gz" -delete 2>/dev/null
find /var/log -type f -name "*.old" -delete 2>/dev/null
find /var/log -type f -name "*.1" -delete 2>/dev/null
AFTER=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
echo "   释放: $(numfmt --to=iec $((SIZE - AFTER)) 2>/dev/null || echo $((SIZE - AFTER)) bytes)"

# 7. 清理临时文件
echo "[7/15] 清理临时文件..."
SIZE1=$(du -sb /tmp 2>/dev/null | awk '{print $1}')
SIZE2=$(du -sb /var/tmp 2>/dev/null | awk '{print $1}')
rm -rf /tmp/*
rm -rf /var/tmp/*
echo "   释放: $(numfmt --to=iec $((SIZE1 + SIZE2)) 2>/dev/null || echo $((SIZE1 + SIZE2)) bytes)"

# 8. 清理宝塔临时文件
echo "[8/15] 清理宝塔临时文件..."
if [ -d "/www/server/panel/temp" ]; then
    SIZE=$(du -sb /www/server/panel/temp 2>/dev/null | awk '{print $1}')
    rm -rf /www/server/panel/temp/*
    echo "   释放: $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 9. 清理APT缓存
echo "[9/15] 清理APT缓存..."
if command -v apt-get &> /dev/null; then
    apt-get clean
    apt-get autoclean
    apt-get autoremove -y
fi

# 10. 清理YUM缓存
echo "[10/15] 清理YUM缓存..."
if command -v yum &> /dev/null; then
    yum clean all
fi

# 11. 清理npm缓存
echo "[11/15] 清理npm缓存..."
if command -v npm &> /dev/null; then
    npm cache clean --force 2>/dev/null
fi

# 12. 清理yarn缓存
echo "[12/15] 清理yarn缓存..."
if command -v yarn &> /dev/null; then
    yarn cache clean 2>/dev/null
fi

# 13. 清理Docker
echo "[13/15] 清理Docker..."
if command -v docker &> /dev/null; then
    docker system prune -af --volumes 2>/dev/null
fi

# 14. 清理systemd日志
echo "[14/15] 清理systemd日志..."
if command -v journalctl &> /dev/null; then
    journalctl --vacuum-size=10M
fi

# 15. 清理缩略图缓存
echo "[15/15] 清理缩略图缓存..."
rm -rf ~/.cache/thumbnails/* 2>/dev/null
rm -rf /root/.cache/* 2>/dev/null

# 计算释放的空间
AFTER=$(df / | tail -1 | awk '{print $3}')
FREED=$((BEFORE - AFTER))

echo ""
echo "=========================================="
echo "激进清理完成！"
echo "=========================================="
echo ""
echo "释放空间: $(numfmt --to=iec $((FREED * 1024)) 2>/dev/null || echo ${FREED}KB)"
echo ""
echo "清理后磁盘使用："
df -h /
echo ""
echo "建议："
echo "1. 重启相关服务："
echo "   systemctl restart nginx"
echo "   systemctl restart mysql"
echo "2. 设置定期清理任务"
echo "3. 考虑升级磁盘容量"
echo ""
