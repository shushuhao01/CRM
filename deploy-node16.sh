#!/bin/bash

# CRM系统 Node.js 16版本部署脚本
# 适用于宝塔面板环境

echo "🚀 开始部署CRM系统 (Node.js 16兼容版本)"

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node_version=$(node --version)
echo "当前Node.js版本: $node_version"

if [[ $node_version == v16* ]]; then
    echo "✅ Node.js 16版本检测通过"
else
    echo "⚠️  警告: 当前版本不是Node.js 16，可能存在兼容性问题"
fi

# 设置项目路径
PROJECT_PATH="/www/wwwroot/crm"
BACKEND_PATH="$PROJECT_PATH/backend"

echo "📁 项目路径: $PROJECT_PATH"

# 检查项目目录
if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ 错误: 项目目录不存在，请先上传项目文件"
    exit 1
fi

# 进入后端目录
cd "$BACKEND_PATH" || exit 1
echo "📂 进入后端目录: $BACKEND_PATH"

# 安装后端依赖 (Node.js 16兼容模式)
echo "📦 安装后端依赖..."
npm install --production --legacy-peer-deps --no-audit --no-fund

if [ $? -eq 0 ]; then
    echo "✅ 后端依赖安装成功"
else
    echo "❌ 后端依赖安装失败"
    exit 1
fi

# 检查编译文件
if [ ! -f "dist/app.js" ]; then
    echo "❌ 错误: 后端编译文件不存在，请先运行构建"
    exit 1
fi

# 停止现有服务
echo "🛑 停止现有服务..."
pm2 stop crm-backend 2>/dev/null || echo "没有运行中的服务"
pm2 delete crm-backend 2>/dev/null || echo "没有需要删除的服务"

# 启动服务
echo "🚀 启动CRM后端服务..."

# 方法1: 使用PM2启动
if command -v pm2 &> /dev/null; then
    echo "使用PM2启动服务..."
    pm2 start dist/app.js --name crm-backend --env production
    pm2 save
    echo "✅ PM2服务启动成功"
else
    echo "⚠️  PM2未安装，使用nohup启动..."
    nohup node dist/app.js > crm.log 2>&1 &
    echo "✅ 服务已在后台启动"
fi

# 检查服务状态
sleep 3
echo "🔍 检查服务状态..."

if command -v pm2 &> /dev/null; then
    pm2 status crm-backend
else
    if pgrep -f "node dist/app.js" > /dev/null; then
        echo "✅ 服务运行正常"
    else
        echo "❌ 服务启动失败"
        exit 1
    fi
fi

# 检查端口
echo "🔌 检查端口3000..."
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ 端口3000已监听"
else
    echo "❌ 端口3000未监听，服务可能启动失败"
fi

# 显示部署信息
echo ""
echo "🎉 CRM系统部署完成！"
echo ""
echo "📋 部署信息:"
echo "  - 前端路径: $PROJECT_PATH/dist"
echo "  - 后端路径: $BACKEND_PATH"
echo "  - 服务端口: 3000"
echo "  - Node.js版本: $node_version"
echo ""
echo "🔗 下一步操作:"
echo "  1. 在宝塔面板中配置网站，根目录指向: $PROJECT_PATH/dist"
echo "  2. 配置Nginx反向代理: /api/ -> http://127.0.0.1:3000"
echo "  3. 在phpMyAdmin中执行数据库脚本: backend/database-schema.sql"
echo "  4. 访问网站并使用 admin/admin123 登录"
echo ""
echo "📞 如遇问题，请检查:"
echo "  - 数据库连接配置: backend/.env"
echo "  - 服务日志: pm2 logs crm-backend 或 tail -f crm.log"
echo "  - 端口占用: netstat -tlnp | grep 3000"
echo ""
echo "✨ 部署完成！"