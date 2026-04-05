#!/bin/bash

# MySQL日志清理脚本
echo "=========================================="
echo "MySQL日志清理工具"
echo "=========================================="
echo ""

# 检查MySQL数据目录
MYSQL_DATA_DIR="/www/server/data"

if [ ! -d "$MYSQL_DATA_DIR" ]; then
    echo "未找到MySQL数据目录"
    exit 1
fi

echo "MySQL数据目录: $MYSQL_DATA_DIR"
echo ""

# 1. 检查二进制日志
echo "1. 检查二进制日志 (mysql-bin.*)..."
BIN_LOG_SIZE=$(find $MYSQL_DATA_DIR -name "mysql-bin.*" -type f -exec du -cb {} + 2>/dev/null | tail -1 | awk '{print $1}')
BIN_LOG_COUNT=$(find $MYSQL_DATA_DIR -name "mysql-bin.*" -type f 2>/dev/null | wc -l)

if [ "$BIN_LOG_SIZE" -gt 0 ]; then
    echo "   二进制日志占用: $(numfmt --to=iec $BIN_LOG_SIZE)"
    echo "   文件数量: $BIN_LOG_COUNT"
    echo ""
    read -p "   是否清理二进制日志？(y/n): " clean_binlog
    
    if [ "$clean_binlog" = "y" ]; then
        echo "   正在清理..."
        mysql -e "PURGE BINARY LOGS BEFORE DATE_SUB(NOW(), INTERVAL 1 DAY);" 2>/dev/null
        mysql -e "RESET MASTER;" 2>/dev/null
        echo "   ✓ 已清理"
    fi
else
    echo "   无二进制日志"
fi
echo ""

# 2. 检查错误日志
echo "2. 检查错误日志..."
ERROR_LOG=$(find $MYSQL_DATA_DIR -name "*.err" -type f 2>/dev/null)
if [ -n "$ERROR_LOG" ]; then
    ERROR_LOG_SIZE=$(du -cb $ERROR_LOG 2>/dev/null | tail -1 | awk '{print $1}')
    echo "   错误日志占用: $(numfmt --to=iec $ERROR_LOG_SIZE)"
    echo "   文件: $ERROR_LOG"
    
    if [ "$ERROR_LOG_SIZE" -gt 104857600 ]; then  # 大于100MB
        read -p "   是否清空错误日志？(y/n): " clean_error
        if [ "$clean_error" = "y" ]; then
            truncate -s 0 $ERROR_LOG
            echo "   ✓ 已清空"
        fi
    fi
else
    echo "   无错误日志"
fi
echo ""

# 3. 检查慢查询日志
echo "3. 检查慢查询日志..."
SLOW_LOG=$(find $MYSQL_DATA_DIR -name "*-slow.log" -type f 2>/dev/null)
if [ -n "$SLOW_LOG" ]; then
    SLOW_LOG_SIZE=$(du -cb $SLOW_LOG 2>/dev/null | tail -1 | awk '{print $1}')
    echo "   慢查询日志占用: $(numfmt --to=iec $SLOW_LOG_SIZE)"
    echo "   文件: $SLOW_LOG"
    
    if [ "$SLOW_LOG_SIZE" -gt 104857600 ]; then  # 大于100MB
        read -p "   是否清空慢查询日志？(y/n): " clean_slow
        if [ "$clean_slow" = "y" ]; then
            truncate -s 0 $SLOW_LOG
            echo "   ✓ 已清空"
        fi
    fi
else
    echo "   无慢查询日志"
fi
echo ""

# 4. 检查InnoDB日志
echo "4. 检查InnoDB日志..."
INNODB_LOG_SIZE=$(find $MYSQL_DATA_DIR -name "ib_logfile*" -type f -exec du -cb {} + 2>/dev/null | tail -1 | awk '{print $1}')
if [ "$INNODB_LOG_SIZE" -gt 0 ]; then
    echo "   InnoDB日志占用: $(numfmt --to=iec $INNODB_LOG_SIZE)"
    echo "   (InnoDB日志不建议删除，这是正常占用)"
fi
echo ""

# 5. 优化数据库表
echo "5. 数据库表优化..."
read -p "   是否优化所有数据库表？(可能需要较长时间) (y/n): " optimize_db

if [ "$optimize_db" = "y" ]; then
    echo "   正在优化..."
    mysqlcheck -o --all-databases -u root -p
    echo "   ✓ 优化完成"
fi
echo ""

# 6. 显示各数据库大小
echo "6. 各数据库占用空间："
mysql -e "SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema
ORDER BY SUM(data_length + index_length) DESC;" 2>/dev/null
echo ""

echo "=========================================="
echo "MySQL清理完成"
echo "=========================================="
echo ""
echo "当前磁盘使用："
df -h /
echo ""
