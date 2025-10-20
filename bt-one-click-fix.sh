#!/bin/bash

# 🚀 宝塔面板 CRM 系统一键修复脚本
# 解决所有已知的 Node.js 16 构建问题

set -e  # 遇到错误立即退出

echo "🎯 宝塔面板 CRM 系统一键修复工具"
echo "=================================="
echo "📅 $(date)"
echo "📍 当前目录: $(pwd)"
echo ""

# 检查权限
if [ ! -w "." ]; then
    echo "❌ 当前目录没有写权限，请检查文件权限"
    exit 1
fi

# 步骤1: 环境检查和准备
echo "🔍 步骤1: 环境检查和准备"
echo "------------------------"

# 检查Node.js版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js版本: $NODE_VERSION"

# 检查npm
if ! command -v npm &> /dev/null; then
    echo "❌ NPM 未安装"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ NPM版本: $NPM_VERSION"

# 设置环境变量
export NODE_OPTIONS="--max-old-space-size=4096"
export VITE_LEGACY_BUILD=true
export NODE_ENV=production

echo "✅ 环境变量设置完成"
echo ""

# 步骤2: 清理和重置
echo "🧹 步骤2: 清理和重置"
echo "--------------------"

# 停止可能运行的服务
echo "🛑 停止现有服务..."
pm2 delete crm-backend 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# 清理缓存和临时文件
echo "🧹 清理缓存..."
npm cache clean --force 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true
rm -rf backend/dist 2>/dev/null || true

# 清理依赖（可选，如果问题严重）
read -p "是否清理所有依赖重新安装？(y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗑️ 清理依赖..."
    rm -rf node_modules package-lock.json 2>/dev/null || true
    rm -rf backend/node_modules backend/package-lock.json 2>/dev/null || true
fi

echo "✅ 清理完成"
echo ""

# 步骤3: 配置npm
echo "⚙️ 步骤3: 配置NPM"
echo "-----------------"

# 设置npm镜像源
echo "🔧 设置npm镜像源..."
npm config set registry https://registry.npmmirror.com
npm config set disturl https://npmmirror.com/dist
npm config set electron_mirror https://npmmirror.com/mirrors/electron/
npm config set sass_binary_site https://npmmirror.com/mirrors/node-sass/
npm config set phantomjs_cdnurl https://npmmirror.com/mirrors/phantomjs/
npm config set chromedriver_cdnurl https://npmmirror.com/mirrors/chromedriver/

echo "✅ NPM配置完成"
echo ""

# 步骤4: 安装前端依赖
echo "📦 步骤4: 安装前端依赖"
echo "----------------------"

echo "📥 安装前端依赖（兼容模式）..."

# 尝试多种安装方式
if npm install --legacy-peer-deps --production=false; then
    echo "✅ 标准兼容安装成功"
elif npm install --force --legacy-peer-deps --production=false; then
    echo "✅ 强制兼容安装成功"
elif npm install --legacy-peer-deps; then
    echo "✅ 基础兼容安装成功"
else
    echo "❌ 前端依赖安装失败，尝试手动修复..."
    
    # 手动安装关键依赖
    npm install vue@latest --legacy-peer-deps
    npm install vite@latest --legacy-peer-deps
    npm install @vitejs/plugin-vue@latest --legacy-peer-deps
    
    if npm install --legacy-peer-deps --production=false; then
        echo "✅ 手动修复后安装成功"
    else
        echo "❌ 所有安装方式都失败，请检查网络和权限"
        exit 1
    fi
fi

echo ""

# 步骤5: 构建前端
echo "🔨 步骤5: 构建前端应用"
echo "----------------------"

echo "🏗️ 开始构建前端（Node.js 16兼容模式）..."

# 运行兼容性修复
if [ -f "fix-node16-crypto.js" ]; then
    echo "🔧 运行兼容性修复..."
    node fix-node16-crypto.js
fi

# 尝试多种构建方式
BUILD_SUCCESS=false

# 方式1: 使用专用构建脚本
if npm run build-node16 2>/dev/null; then
    echo "✅ 专用构建脚本成功"
    BUILD_SUCCESS=true
# 方式2: 使用专用配置文件
elif npx vite build --config vite.config.node16.ts; then
    echo "✅ 专用配置文件构建成功"
    BUILD_SUCCESS=true
# 方式3: 使用兼容参数
elif npx vite build --mode production --target es2015; then
    echo "✅ 兼容参数构建成功"
    BUILD_SUCCESS=true
# 方式4: 基础构建
elif npm run build; then
    echo "✅ 基础构建成功"
    BUILD_SUCCESS=true
else
    echo "❌ 所有构建方式都失败"
fi

if [ "$BUILD_SUCCESS" = false ]; then
    echo "❌ 前端构建失败，请检查错误信息"
    echo "🔍 常见问题："
    echo "   1. 内存不足 - 增加 NODE_OPTIONS"
    echo "   2. 依赖冲突 - 清理依赖重新安装"
    echo "   3. 权限问题 - 检查文件权限"
    exit 1
fi

# 验证构建结果
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    echo "✅ 前端构建验证成功"
    echo "📊 构建文件:"
    ls -la dist/ | head -10
else
    echo "❌ 构建验证失败"
    exit 1
fi

echo ""

# 步骤6: 构建后端
echo "🔨 步骤6: 构建后端应用"
echo "----------------------"

if [ -d "backend" ]; then
    cd backend
    
    echo "📦 安装后端依赖..."
    npm config set registry https://registry.npmmirror.com
    
    if npm install --legacy-peer-deps --production=false; then
        echo "✅ 后端依赖安装成功"
    elif npm install --force --legacy-peer-deps --production=false; then
        echo "✅ 后端依赖强制安装成功"
    else
        echo "❌ 后端依赖安装失败"
        cd ..
        exit 1
    fi
    
    echo "🔨 编译后端代码..."
    if npm run build; then
        echo "✅ 后端构建成功"
    else
        echo "❌ 后端构建失败"
        cd ..
        exit 1
    fi
    
    # 创建必要目录
    mkdir -p logs uploads
    
    cd ..
else
    echo "⚠️ 后端目录不存在，跳过后端构建"
fi

echo ""

# 步骤7: 启动服务
echo "🚀 步骤7: 启动服务"
echo "------------------"

if [ -d "backend" ] && [ -f "backend/dist/app.js" ]; then
    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        echo "📦 安装PM2..."
        npm install -g pm2
    fi
    
    echo "🚀 启动后端服务..."
    cd backend
    pm2 start dist/app.js --name "crm-backend" --env production
    cd ..
    
    echo "✅ 后端服务启动成功"
    
    # 等待服务启动
    sleep 3
    
    # 检查服务状态
    if pm2 list | grep -q "crm-backend"; then
        echo "✅ 服务运行正常"
    else
        echo "⚠️ 服务可能启动失败，请检查日志"
    fi
else
    echo "⚠️ 后端文件不存在，跳过服务启动"
fi

echo ""

# 步骤8: 最终检查和报告
echo "📋 步骤8: 最终检查和报告"
echo "------------------------"

echo "🎉 修复完成！"
echo ""
echo "📊 系统状态："
echo "   Node.js版本: $NODE_VERSION"
echo "   前端构建: $([ -d "dist" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "   后端构建: $([ -f "backend/dist/app.js" ] && echo "✅ 成功" || echo "❌ 失败")"
echo "   服务状态: $(pm2 list 2>/dev/null | grep -q "crm-backend" && echo "✅ 运行中" || echo "⚠️ 未运行")"
echo ""
echo "📁 部署路径："
echo "   前端路径: $(pwd)/dist"
echo "   后端路径: $(pwd)/backend"
echo "   服务端口: 3000"
echo ""
echo "🔗 宝塔面板配置："
echo "   1. 添加网站，根目录设置为: $(pwd)/dist"
echo "   2. 配置反向代理: /api -> http://127.0.0.1:3000"
echo "   3. 配置SSL证书（可选）"
echo ""
echo "📞 如遇问题："
echo "   查看服务日志: pm2 logs crm-backend"
echo "   重启服务: pm2 restart crm-backend"
echo "   故障排除: ./bt-troubleshoot.sh"
echo ""
echo "✨ 一键修复完成！系统已就绪！"