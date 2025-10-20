#!/bin/bash

# 🚀 CRM系统一键部署脚本 - 专为技术小白设计
# 适用于宝塔面板

echo "🎉 欢迎使用CRM系统一键部署！"
echo "📍 当前目录: $(pwd)"
echo ""

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先在宝塔面板安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

echo "✅ PM2版本: $(pm2 -v)"
echo ""

# 第一步：构建前端
echo "🔨 第1步：构建前端应用..."

# 检查Node.js版本并选择合适的构建方式
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
echo "📍 检测到Node.js主版本: $NODE_VERSION"

npm install --production=false

if [ "$NODE_VERSION" -lt "20" ]; then
    echo "🔧 使用Node.js 16兼容构建..."
    # 设置环境变量
    export NODE_OPTIONS="--max-old-space-size=4096"
    export VITE_LEGACY_BUILD=true
    
    # 使用Node.js 16兼容配置
    npm run build-node16
else
    echo "🔧 使用标准构建..."
    npm run build
fi

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败！"
    echo "🔍 如果是Node.js版本问题，请尝试："
    echo "   1. 升级Node.js到20+版本"
    echo "   2. 或使用: npm run build-node16"
    exit 1
fi

echo "✅ 前端构建完成！"
echo ""

# 第二步：构建后端
echo "🔨 第2步：构建后端应用..."
cd backend

npm install --production=false
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 后端构建失败！"
    exit 1
fi

echo "✅ 后端构建完成！"
echo ""

# 第三步：创建必要目录
echo "📁 第3步：创建必要目录..."
mkdir -p logs
mkdir -p uploads

# 第四步：启动后端服务
echo "🚀 第4步：启动后端服务..."

# 停止旧的服务
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

# 启动新服务
pm2 start dist/app.js --name "crm-backend" --env production

if [ $? -ne 0 ]; then
    echo "❌ 后端启动失败！"
    exit 1
fi

echo "✅ 后端服务启动成功！"
echo "📊 数据库：MySQL (请确保已配置)"
echo "🌐 服务地址：http://localhost:3000"
echo "📝 日志文件：./logs/app.log"
echo ""

# 返回根目录
cd ..

echo "🎉 部署完成！"
echo ""
echo "📋 接下来请在宝塔面板中："
echo "1. 添加网站，域名填写你的域名"
echo "2. 网站根目录设置为: $(pwd)/dist"
echo "3. 在网站设置中添加以下Nginx配置："
echo ""
echo "location /api {"
echo "    proxy_pass http://127.0.0.1:3000;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "}"
echo ""
echo "🔗 配置完成后，就可以通过你的域名访问CRM系统了！"
echo ""
echo "📊 查看服务状态: pm2 list"
echo "📝 查看日志: pm2 logs crm-backend"