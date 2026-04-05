#!/bin/bash

# 查找占用空间的大户
echo "=========================================="
echo "磁盘空间占用分析工具"
echo "=========================================="
echo ""

echo "当前磁盘使用情况："
df -h /
echo ""

echo "=========================================="
echo "1. 查找最大的10个目录"
echo "=========================================="
du -h --max-depth=2 /www 2>/dev/null | sort -hr | head -20
echo ""

echo "=========================================="
echo "2. 查找大于100MB的文件"
echo "=========================================="
find /www -type f -size +100M -exec ls -lh {} \; 2>/dev/null | awk '{print $5 "\t" $9}' | sort -hr | head -20
echo ""

echo "=========================================="
echo "3. 检查日志文件大小"
echo "=========================================="
if [ -d "/www/wwwlogs" ]; then
    echo "网站日志目录占用："
    du -sh /www/wwwlogs 2>/dev/null
    echo ""
    echo "最大的10个日志文件："
    find /www/wwwlogs -type f -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10 | awk '{print $5 "\t" $9}'
fi
echo ""

echo "=========================================="
echo "4. 检查数据库备份大小"
echo "=========================================="
if [ -d "/www/backup/database" ]; then
    echo "数据库备份目录占用："
    du -sh /www/backup/database 2>/dev/null
    echo ""
    echo "备份文件数量："
    find /www/backup/database -type f | wc -l
    echo ""
    echo "最大的10个备份文件："
    find /www/backup/database -type f -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10 | awk '{print $5 "\t" $9}'
fi
echo ""

echo "=========================================="
echo "5. 检查网站备份大小"
echo "=========================================="
if [ -d "/www/backup/site" ]; then
    echo "网站备份目录占用："
    du -sh /www/backup/site 2>/dev/null
    echo ""
    echo "备份文件数量："
    find /www/backup/site -type f | wc -l
    echo ""
    echo "最大的10个备份文件："
    find /www/backup/site -type f -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10 | awk '{print $5 "\t" $9}'
fi
echo ""

echo "=========================================="
echo "6. 检查MySQL数据目录"
echo "=========================================="
if [ -d "/www/server/data" ]; then
    echo "MySQL数据目录占用："
    du -sh /www/server/data 2>/dev/null
    echo ""
    echo "各数据库大小："
    du -sh /www/server/data/* 2>/dev/null | sort -hr | head -10
fi
echo ""

echo "=========================================="
echo "7. 检查网站目录大小"
echo "=========================================="
if [ -d "/www/wwwroot" ]; then
    echo "各网站目录占用："
    du -sh /www/wwwroot/* 2>/dev/null | sort -hr | head -10
fi
echo ""

echo "=========================================="
echo "8. 检查临时文件"
echo "=========================================="
echo "/tmp 目录占用："
du -sh /tmp 2>/dev/null
echo ""
echo "/var/tmp 目录占用："
du -sh /var/tmp 2>/dev/null
echo ""

echo "=========================================="
echo "9. 检查系统日志"
echo "=========================================="
echo "/var/log 目录占用："
du -sh /var/log 2>/dev/null
echo ""
echo "最大的10个系统日志："
find /var/log -type f -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10 | awk '{print $5 "\t" $9}'
echo ""

echo "=========================================="
echo "10. 检查宝塔回收站"
echo "=========================================="
if [ -d "/www/Recycle_bin" ]; then
    echo "回收站占用："
    du -sh /www/Recycle_bin 2>/dev/null
    echo ""
    echo "回收站文件数量："
    find /www/Recycle_bin -type f 2>/dev/null | wc -l
fi
echo ""

echo "=========================================="
echo "分析完成！"
echo "=========================================="
echo ""
echo "建议："
echo "1. 查看上面占用最大的目录和文件"
echo "2. 确认哪些可以安全删除"
echo "3. 使用 aggressive-clean.sh 进行激进清理"
echo ""
