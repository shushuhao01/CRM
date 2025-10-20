#!/bin/bash

# 🚀 宝塔面板 Node.js 16 专用部署脚本
# 简化版本，专门解决宝塔面板构建问题

echo "🎉 宝塔面板 Node.js 16 专用部署开始！"
echo "📍 当前目录: $(pwd)"

# 检查Node.js版本
NODE_VERSION=$(node -v)
echo "🔧 Node.js版本: $NODE_VERSION"

# 检查是否为Node.js 16
if [[ $NODE_VERSION == v16* ]]; then
    echo "✅ Node.js 16 检测通过，使用兼容模式"
else
    echo "⚠️ 警告: 非Node.js 16版本，可能存在兼容性问题"
fi

echo ""

# 设置npm镜像源
echo "🔧 配置npm镜像源..."
npm config set registry https://registry.npmmirror.com

# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=4096"
export VITE_LEGACY_BUILD=true

echo "🧹 清理缓存和旧文件..."
npm cache clean --force
rm -rf dist
rm -rf node_modules/.vite

# 安装前端依赖
echo "📦 安装前端依赖（兼容模式）..."
npm install --legacy-peer-deps --production=false

if [ $? -ne 0 ]; then
    echo "⚠️ 标准安装失败，尝试强制安装..."
    npm install --force --legacy-peer-deps --production=false
    
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败！"
        exit 1
    fi
fi

echo "✅ 前端依赖安装完成！"

# 构建前端（使用Node.js 16兼容配置）
echo "🔨 构建前端应用（Node.js 16兼容模式）..."

# 方法1：使用专用构建脚本
if npm run build-node16; then
    echo "✅ Node.js 16兼容构建成功！"
elif npx vite build --config vite.config.node16.ts; then
    echo "✅ 使用配置文件构建成功！"
elif npx vite build --mode production --target es2015; then
    echo "✅ 基础构建成功！"
else
    echo "❌ 所有构建方法都失败了！"
    echo "🔍 请检查："
    echo "   1. Node.js 版本是否正确"
    echo "   2. 依赖是否完整安装"
    echo "   3. 磁盘空间是否充足"
    exit 1
fi

# 检查构建结果
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ 前端构建验证成功！"
    echo "📊 构建文件大小:"
    du -sh dist/* 2>/dev/null || echo "无法获取文件大小"
else
    echo "❌ 构建验证失败，dist目录不完整"
    exit 1
fi

echo ""

# 构建后端
echo "🔨 构建后端应用..."
cd backend

# 设置后端npm镜像源
npm config set registry https://registry.npmmirror.com

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install --legacy-peer-deps --production=false

if [ $? -ne 0 ]; then
    echo "⚠️ 后端依赖安装失败，尝试强制安装..."
    npm install --force --legacy-peer-deps --production=false
    
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败！"
        exit 1
    fi
fi

# 构建后端
echo "🔨 编译后端代码..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 后端构建失败！"
    exit 1
fi

echo "✅ 后端构建完成！"

# 创建必要目录
echo "📁 创建必要目录..."
mkdir -p logs
mkdir -p uploads

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 启动后端服务
echo "🚀 启动后端服务..."

# 停止旧服务
pm2 delete crm-backend 2>/dev/null || true

# 启动新服务
pm2 start dist/app.js --name "crm-backend" --env production

if [ $? -ne 0 ]; then
    echo "❌ 后端启动失败！"
    exit 1
fi

echo "✅ 后端服务启动成功！"

# 返回根目录
cd ..

echo ""
echo "🎉 宝塔面板 Node.js 16 部署完成！"
echo ""
echo "📊 服务状态："
pm2 list
echo ""
echo "📋 部署信息："
echo "   前端路径: $(pwd)/dist"
echo "   后端路径: $(pwd)/backend"
echo "   服务端口: 3000"
echo "   Node.js版本: $NODE_VERSION"
echo ""
echo "🔗 下一步操作："
echo "   1. 在宝塔面板添加网站"
echo "   2. 网站根目录设置为: $(pwd)/dist"
echo "   3. 配置Nginx反向代理 /api -> http://127.0.0.1:3000"
echo "   4. 配置数据库连接"
echo ""
echo "📞 如遇问题："
echo "   查看日志: pm2 logs crm-backend"
echo "   检查端口: netstat -tlnp | grep 3000"
echo "   重启服务: pm2 restart crm-backend"
echo ""
echo "✨ 部署完成！"