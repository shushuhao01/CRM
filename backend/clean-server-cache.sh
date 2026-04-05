#!/bin/bash

# 宝塔服务器安全清理脚本
# 只清理缓存和垃圾文件，不影响重要数据

echo "=========================================="
echo "开始清理服务器缓存和垃圾文件"
echo "=========================================="
echo ""

# 记录清理前的磁盘使用情况
echo "清理前磁盘使用情况："
df -h | grep -E "文件系统|/dev/"
echo ""

CLEANED_SIZE=0

# 1. 清理系统临时文件
echo "[1/10] 清理系统临时文件..."
BEFORE=$(du -sb /tmp 2>/dev/null | awk '{print $1}')
find /tmp -type f -atime +7 -delete 2>/dev/null
find /var/tmp -type f -atime +7 -delete 2>/dev/null
AFTER=$(du -sb /tmp 2>/dev/null | awk '{print $1}')
SIZE=$((BEFORE - AFTER))
CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"

# 2. 清理宝塔面板临时文件
echo "[2/10] 清理宝塔临时文件..."
if [ -d "/www/server/panel/temp" ]; then
    BEFORE=$(du -sb /www/server/panel/temp 2>/dev/null | awk '{print $1}')
    rm -rf /www/server/panel/temp/*
    AFTER=$(du -sb /www/server/panel/temp 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 3. 清理宝塔回收站
echo "[3/10] 清理宝塔回收站..."
if [ -d "/www/Recycle_bin" ]; then
    BEFORE=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    rm -rf /www/Recycle_bin/*
    AFTER=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 4. 清理旧的网站日志（保留最近7天）
echo "[4/10] 清理旧的网站日志（保留最近7天）..."
if [ -d "/www/wwwlogs" ]; then
    BEFORE=$(du -sb /www/wwwlogs 2>/dev/null | awk '{print $1}')
    find /www/wwwlogs -name "*.log" -mtime +7 -delete 2>/dev/null
    find /www/wwwlogs -name "*.gz" -delete 2>/dev/null
    AFTER=$(du -sb /www/wwwlogs 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 5. 清理npm缓存
echo "[5/10] 清理npm缓存..."
if command -v npm &> /dev/null; then
    BEFORE=$(du -sb ~/.npm 2>/dev/null | awk '{print $1}')
    npm cache clean --force 2>/dev/null
    AFTER=$(du -sb ~/.npm 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 6. 清理yarn缓存
echo "[6/10] 清理yarn缓存..."
if command -v yarn &> /dev/null; then
    BEFORE=$(du -sb ~/.yarn 2>/dev/null | awk '{print $1}')
    yarn cache clean 2>/dev/null
    AFTER=$(du -sb ~/.yarn 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 7. 清理Docker缓存（如果使用）
echo "[7/10] 清理Docker缓存..."
if command -v docker &> /dev/null; then
    BEFORE=$(docker system df 2>/dev/null | grep "Total" | awk '{print $4}' | sed 's/GB//' || echo "0")
    docker system prune -af --volumes 2>/dev/null
    AFTER=$(docker system df 2>/dev/null | grep "Total" | awk '{print $4}' | sed 's/GB//' || echo "0")
    echo "   Docker清理完成"
fi

# 8. 清理旧的数据库备份（保留最近7天）
echo "[8/10] 清理旧的数据库备份（保留最近7天）..."
if [ -d "/www/backup/database" ]; then
    BEFORE=$(du -sb /www/backup/database 2>/dev/null | awk '{print $1}')
    find /www/backup/database -type f -mtime +7 -delete 2>/dev/null
    AFTER=$(du -sb /www/backup/database 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 9. 清理旧的网站备份（保留最近7天）
echo "[9/10] 清理旧的网站备份（保留最近7天）..."
if [ -d "/www/backup/site" ]; then
    BEFORE=$(du -sb /www/backup/site 2>/dev/null | awk '{print $1}')
    find /www/backup/site -type f -mtime +7 -delete 2>/dev/null
    AFTER=$(du -sb /www/backup/site 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

# 10. 清理系统日志
echo "[10/10] 清理系统日志..."
if [ -d "/var/log" ]; then
    BEFORE=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
    find /var/log -name "*.log" -type f -size +100M -exec truncate -s 0 {} \; 2>/dev/null
    find /var/log -name "*.gz" -mtime +7 -delete 2>/dev/null
    find /var/log -name "*.old" -delete 2>/dev/null
    AFTER=$(du -sb /var/log 2>/dev/null | awk '{print $1}')
    SIZE=$((BEFORE - AFTER))
    CLEANED_SIZE=$((CLEANED_SIZE + SIZE))
    echo "   清理了 $(numfmt --to=iec $SIZE 2>/dev/null || echo $SIZE bytes)"
fi

echo ""
echo "=========================================="
echo "清理完成！"
echo "=========================================="
echo ""
echo "总共释放空间: $(numfmt --to=iec $CLEANED_SIZE 2>/dev/null || echo $CLEANED_SIZE bytes)"
echo ""
echo "清理后磁盘使用情况："
df -h | grep -E "文件系统|/dev/"
echo ""
echo "=========================================="
