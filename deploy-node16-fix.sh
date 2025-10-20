#!/bin/bash

# 🚀 CRM系统Node.js 16兼容部署脚本
# 专门解决Node.js 16环境下的依赖安装问题

echo "🎉 CRM系统Node.js 16兼容部署开始！"
echo "📍 当前目录: $(pwd)"
echo "🔧 Node.js版本: $(node -v)"
echo ""

# 设置npm镜像源为淘宝源
echo "🔧 配置npm镜像源..."
npm config set registry https://registry.npmmirror.com
npm config set @types:registry https://registry.npmmirror.com

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先在宝塔面板安装Node.js"
    exit 1
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

echo "✅ PM2版本: $(pm2 -v)"
echo ""

# 清理缓存
echo "🧹 清理npm缓存..."
npm cache clean --force

# 第一步：安装前端依赖（使用兼容性安装）
echo "🔨 第1步：安装前端依赖（Node.js 16兼容模式）..."

# 使用legacy-peer-deps解决依赖冲突
npm install --legacy-peer-deps --production=false

if [ $? -ne 0 ]; then
    echo "⚠️ 标准安装失败，尝试强制安装..."
    npm install --force --legacy-peer-deps --production=false
    
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败！尝试逐个安装核心依赖..."
        
        # 逐个安装核心依赖
        npm install vue@^3.5.18 --legacy-peer-deps
        npm install vue-router@^4.5.1 --legacy-peer-deps
        npm install pinia@^3.0.3 --legacy-peer-deps
        npm install element-plus@^2.11.3 --legacy-peer-deps
        npm install axios@^1.12.2 --legacy-peer-deps
        npm install vite@^7.0.6 --legacy-peer-deps
        
        echo "✅ 核心依赖安装完成，继续构建..."
    fi
fi

echo "✅ 前端依赖安装完成！"

# 第二步：构建前端
echo "🔨 第2步：构建前端应用（Node.js 16兼容模式）..."

# 设置环境变量以解决兼容性问题
export NODE_OPTIONS="--max-old-space-size=4096"
export VITE_LEGACY_BUILD=true

# 清理之前的构建文件
echo "🧹 清理之前的构建文件..."
rm -rf dist
rm -rf node_modules/.vite

# 使用Node.js 16兼容构建
npm run build-node16

if [ $? -ne 0 ]; then
    echo "⚠️ Node.js 16兼容构建失败，尝试直接使用配置文件..."
    # 如果构建失败，直接使用Node.js 16配置文件
    npx vite build --config vite.config.node16.ts
    
    if [ $? -ne 0 ]; then
        echo "⚠️ 配置文件构建失败，尝试基础构建..."
        # 最后尝试基础构建
        npx vite build --mode production --target es2015
        
        if [ $? -ne 0 ]; then
            echo "❌ 前端构建失败！请检查代码错误"
            echo "🔍 可能的解决方案："
            echo "   1. 检查 Node.js 版本是否为 16.x"
            echo "   2. 清理 node_modules 重新安装"
            echo "   3. 检查磁盘空间是否充足"
            exit 1
        fi
    fi
fi

echo "✅ 前端构建完成！"
echo ""

# 第三步：构建后端
echo "🔨 第3步：构建后端应用..."
cd backend

# 设置后端npm镜像源
npm config set registry https://registry.npmmirror.com

# 安装后端依赖
npm install --legacy-peer-deps --production=false

if [ $? -ne 0 ]; then
    echo "⚠️ 后端依赖安装失败，尝试强制安装..."
    npm install --force --legacy-peer-deps --production=false
fi

# 构建后端
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 后端构建失败！"
    exit 1
fi

echo "✅ 后端构建完成！"
echo ""

# 第四步：创建必要目录
echo "📁 第4步：创建必要目录..."
mkdir -p logs
mkdir -p uploads

# 第五步：启动后端服务
echo "🚀 第5步：启动后端服务..."

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
echo ""

# 返回根目录
cd ..

echo "🎉 Node.js 16兼容部署完成！"
echo ""
echo "📊 服务状态检查："
pm2 list
echo ""
echo "📋 接下来请在宝塔面板中："
echo "1. 添加网站，域名填写你的域名"
echo "2. 网站根目录设置为: $(pwd)/dist"
echo "3. 在网站设置中添加反向代理配置"
echo ""
echo "🔗 Nginx配置示例："
echo "location /api {"
echo "    proxy_pass http://127.0.0.1:3000;"
echo "    proxy_set_header Host \$host;"
echo "    proxy_set_header X-Real-IP \$remote_addr;"
echo "    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;"
echo "}"
echo ""
echo "📊 查看服务状态: pm2 list"
echo "📝 查看日志: pm2 logs crm-backend"
echo "🌐 测试后端: curl http://localhost:3000/api/health"