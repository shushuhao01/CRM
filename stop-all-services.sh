#!/bin/bash

# 三系统服务停止脚本

echo "=========================================="
echo "停止所有服务"
echo "=========================================="
echo ""

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装"
    exit 1
fi

echo "正在停止所有服务..."
echo ""

# 停止所有服务
pm2 stop crm-backend 2>/dev/null
pm2 stop crm-frontend 2>/dev/null
pm2 stop admin-frontend 2>/dev/null
pm2 stop website-frontend 2>/dev/null

echo ""
echo "✓ 所有服务已停止"
echo ""

# 显示状态
pm2 list

echo ""
echo "如需完全删除服务，请运行:"
echo "  pm2 delete all"
echo ""
