#!/bin/bash

# 三系统服务启动脚本
# CRM系统 + Admin后台 + Website官网

echo "=========================================="
echo "三系统服务启动脚本"
echo "=========================================="
echo ""

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "项目根目录: $PROJECT_ROOT"
echo ""

# 检查Node.js和npm
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装npm"
    exit 1
fi

echo "✓ Node.js版本: $(node -v)"
echo "✓ npm版本: $(npm -v)"
echo ""

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  未安装PM2，正在安装..."
    npm install -g pm2
fi

echo "✓ PM2版本: $(pm2 -v)"
echo ""

echo "=========================================="
echo "1. 启动后端服务 (Backend)"
echo "=========================================="

cd "$PROJECT_ROOT/backend"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: backend/.env 文件不存在"
    if [ -f ".env.production" ]; then
        echo "   使用 .env.production"
        cp .env.production .env
    fi
fi

# 启动后端
echo "正在启动后端服务..."
pm2 start npm --name "crm-backend" -- run start:prod 2>/dev/null || pm2 restart crm-backend

echo "✓ 后端服务已启动"
echo ""

echo "=========================================="
echo "2. 启动CRM前端 (Frontend)"
echo "=========================================="

cd "$PROJECT_ROOT"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: .env 文件不存在"
    if [ -f ".env.production" ]; then
        echo "   使用 .env.production"
        cp .env.production .env
    fi
fi

# 启动CRM前端
echo "正在启动CRM前端..."
pm2 start npm --name "crm-frontend" -- run serve 2>/dev/null || pm2 restart crm-frontend

echo "✓ CRM前端已启动"
echo ""

echo "=========================================="
echo "3. 启动Admin后台 (Admin)"
echo "=========================================="

cd "$PROJECT_ROOT/admin"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: admin/.env 文件不存在"
    if [ -f ".env.production" ]; then
        echo "   使用 .env.production"
        cp .env.production .env
    fi
fi

# 启动Admin后台
echo "正在启动Admin后台..."
pm2 start npm --name "admin-frontend" -- run serve 2>/dev/null || pm2 restart admin-frontend

echo "✓ Admin后台已启动"
echo ""

echo "=========================================="
echo "4. 启动Website官网 (Website)"
echo "=========================================="

cd "$PROJECT_ROOT/website"

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "⚠️  警告: website/.env 文件不存在"
    if [ -f ".env.production" ]; then
        echo "   使用 .env.production"
        cp .env.production .env
    fi
fi

# 启动Website官网
echo "正在启动Website官网..."
pm2 start npm --name "website-frontend" -- run serve 2>/dev/null || pm2 restart website-frontend

echo "✓ Website官网已启动"
echo ""

# 保存PM2配置
pm2 save

echo "=========================================="
echo "启动完成！"
echo "=========================================="
echo ""

# 显示服务状态
pm2 list

echo ""
echo "=========================================="
echo "服务访问地址"
echo "=========================================="
echo ""
echo "CRM系统前端:    http://localhost:8080"
echo "Admin后台:      http://localhost:8081"
echo "Website官网:    http://localhost:8082"
echo "后端API:        http://localhost:3000"
echo ""
echo "=========================================="
echo "常用命令"
echo "=========================================="
echo ""
echo "查看服务状态:   pm2 list"
echo "查看日志:       pm2 logs"
echo "停止所有服务:   pm2 stop all"
echo "重启所有服务:   pm2 restart all"
echo "删除所有服务:   pm2 delete all"
echo ""
echo "查看单个服务日志:"
echo "  pm2 logs crm-backend"
echo "  pm2 logs crm-frontend"
echo "  pm2 logs admin-frontend"
echo "  pm2 logs website-frontend"
echo ""
