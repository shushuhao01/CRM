#!/bin/bash

# 🚀 宝塔面板 Node.js 16 专用构建脚本
# 解决 Vite 在 Node.js 16 环境下的兼容性问题

echo "🔧 宝塔面板 Node.js 16 环境构建开始..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v)
echo "📍 当前 Node.js 版本: $NODE_VERSION"

# 设置环境变量以解决兼容性问题
export NODE_OPTIONS="--max-old-space-size=4096"
export VITE_LEGACY_BUILD=true

# 清理之前的构建文件
echo "🧹 清理之前的构建文件..."
rm -rf dist
rm -rf node_modules/.vite

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install --production=false
fi

# 使用专门的 Node.js 16 配置进行构建
echo "🔨 开始构建（使用 Node.js 16 兼容配置）..."
npx vite build --config vite.config.node16.ts

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "📁 构建文件位置: ./dist"
    
    # 显示构建文件大小
    if [ -d "dist" ]; then
        echo "📊 构建文件大小:"
        du -sh dist/*
    fi
    
    echo ""
    echo "🎉 宝塔面板部署准备完成！"
    echo "📋 下一步操作："
    echo "   1. 将 dist 目录内容上传到网站根目录"
    echo "   2. 配置 Nginx 反向代理"
    echo "   3. 启动后端服务"
    
else
    echo "❌ 构建失败！"
    echo "🔍 可能的解决方案："
    echo "   1. 检查 Node.js 版本是否为 16.x"
    echo "   2. 清理 node_modules 重新安装"
    echo "   3. 检查磁盘空间是否充足"
    echo "   4. 查看详细错误日志"
    exit 1
fi