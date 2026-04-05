#!/bin/bash

# 三系统服务重启脚本

echo "=========================================="
echo "重启所有服务"
echo "=========================================="
echo ""

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装"
    exit 1
fi

echo "正在重启所有服务..."
echo ""

# 重启所有服务
pm2 restart crm-backend 2>/dev/null
pm2 restart crm-frontend 2>/dev/null
pm2 restart admin-frontend 2>/dev/null
pm2 restart website-frontend 2>/dev/null

echo ""
echo "✓ 所有服务已重启"
echo ""

# 显示状态
pm2 list

echo ""
echo "查看日志: pm2 logs"
echo ""
