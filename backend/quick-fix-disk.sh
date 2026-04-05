#!/bin/bash

# 一键快速释放空间脚本
# 自动找出并清理最占空间的内容

echo "=========================================="
echo "一键快速释放磁盘空间"
echo "=========================================="
echo ""

# 显示当前状态
echo "当前磁盘使用："
df -h / | grep -E "Filesystem|/dev/"
echo ""

BEFORE=$(df / | tail -1 | awk '{print $3}')

echo "开始自动清理..."
echo ""

# 1. 清理宝塔回收站（通常很大）
echo "[1/8] 清理宝塔回收站..."
if [ -d "/www/Recycle_bin" ]; then
    SIZE=$(du -sb /www/Recycle_bin 2>/dev/null | awk '{print $1}')
    if [ "$SIZE" -gt 0 ]; then
        rm -rf /www/Recycle_bin/*
        echo "   ✓ 释放: $(numfmt --to=iec $SIZE)"
    else
        echo "   - 已经是空的"
    fi
else
    echo "   - 目录不存在"
fi

# 2. 清理旧备份（保留最新3个）
echo "[2/8] 清理旧备份（保留最新3个）..."
if [ -d "/www/backup/database" ]; then
    cd /www/backup/database
    COUNT=$(ls -t | wc -l)
    if [ "$COUNT" -gt 3 ]; then
        ls -t | tail -n +4 | xargs rm -rf
        echo "   ✓ 删除了 $((COUNT - 3)) 个旧备份"
    else
        echo "   - 备份数量合理"
    fi
fi

if [ -d "/www/backup/site" ]; then
    cd /www/backup/site
    COUNT=$(ls -t | wc -l)
    if [ "$COUNT" -gt 3 ]; then
        ls -t | tail -n +4 | xargs rm -rf
        echo "   ✓ 删除了 $((COUNT - 3)) 个旧备份"
    else
        echo "   - 备份数量合理"
    fi
fi

# 3. 清理大日志文件（>100MB）
echo "[3/8] 清理大日志文件..."
LARGE_LOGS=$(find /www/wwwlogs -type f -size +100M 2>/dev/null)
if [ -n "$LARGE_LOGS" ]; then
    echo "$LARGE_LOGS" | while read file; do
        SIZE=$(du -h "$file" | awk '{print $1}')
        truncate -s 0 "$file"
        echo "   ✓ 清空: $file ($SIZE)"
    done
else
    echo "   - 无大日志文件"
fi

# 4. 删除旧日志（7天前）
echo "[4/8] 删除旧日志..."
DELETED=$(find /www/wwwlogs -name "*.log" -mtime +7 -delete -print 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "   ✓ 删除了 $DELETED 个旧日志"
else
    echo "   - 无旧日志"
fi

# 5. 清理压缩日志
echo "[5/8] 清理压缩日志..."
DELETED=$(find /www/wwwlogs -name "*.gz" -delete -print 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
    echo "   ✓ 删除了 $DELETED 个压缩日志"
else
    echo "   - 无压缩日志"
fi

# 6. 清理MySQL二进制日志
echo "[6/8] 清理MySQL二进制日志..."
if command -v mysql &> /dev/null; then
    mysql -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 3 DAY);" 2>/dev/null && echo "   ✓ 已清理" || echo "   - 跳过"
else
    echo "   - MySQL未安装"
fi

# 7. 清理临时文件
echo "[7/8] 清理临时文件..."
rm -rf /tmp/* 2>/dev/null
rm -rf /var/tmp/* 2>/dev/null
rm -rf /www/server/panel/temp/* 2>/dev/null
echo "   ✓ 已清理"

# 8. 清理包管理器缓存
echo "[8/8] 清理包管理器缓存..."
if command -v apt-get &> /dev/null; then
    apt-get clean 2>/dev/null
    apt-get autoclean 2>/dev/null
    echo "   ✓ APT缓存已清理"
elif command -v yum &> /dev/null; then
    yum clean all 2>/dev/null
    echo "   ✓ YUM缓存已清理"
fi

# 计算释放的空间
AFTER=$(df / | tail -1 | awk '{print $3}')
FREED=$((BEFORE - AFTER))

echo ""
echo "=========================================="
echo "清理完成！"
echo "=========================================="
echo ""
echo "释放空间: $(numfmt --to=iec $((FREED * 1024)) 2>/dev/null || echo ${FREED}KB)"
echo ""
echo "清理后磁盘使用："
df -h / | grep -E "Filesystem|/dev/"
echo ""

# 检查是否还需要更多清理
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 85 ]; then
    echo "⚠️  磁盘使用率仍然较高 ($USAGE%)"
    echo ""
    echo "建议执行以下操作："
    echo "1. 运行 ./find-large-files.sh 查找大文件"
    echo "2. 运行 ./aggressive-clean.sh 进行激进清理"
    echo "3. 考虑升级磁盘容量"
else
    echo "✓ 磁盘使用率正常 ($USAGE%)"
fi
echo ""
