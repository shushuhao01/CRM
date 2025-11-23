#!/bin/bash

# ========================================
# CRM 系统本地构建脚本（Mac/Linux）
# ========================================

echo "=========================================="
echo "🔨 CRM 系统本地构建"
echo "=========================================="
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js"
    echo "💡 请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本:"
node -v
echo ""

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误：未检测到 npm"
    exit 1
fi

echo "✅ npm 版本:"
npm -v
echo ""

# ========================================
# 步骤 1：配置 npm 镜像
# ========================================
echo "步骤 1/5: 配置 npm 镜像..."
npm config set registry https://registry.npmmirror.com
echo "✅ npm 镜像配置完成"
echo ""

# ========================================
# 步骤 2：安装依赖
# ========================================
echo "步骤 2/5: 安装前端依赖..."
echo "📦 这可能需要几分钟，请耐心等待..."
echo ""

npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败！"
    exit 1
fi

echo "✅ 依赖安装完成"
echo ""

# ========================================
# 步骤 3：检查配置文件
# ========================================
echo "步骤 3/5: 检查配置文件..."

if [ ! -f ".env.production" ]; then
    echo "⚠️  警告：.env.production 文件不存在"
    if [ -f ".env.example" ]; then
        echo "📝 从 .env.example 创建 .env.production..."
        cp .env.example .env.production
        echo "⚠️  请编辑 .env.production 文件，配置 API 地址！"
        read -p "按回车继续..."
    fi
fi

echo "✅ 配置文件检查完成"
echo ""

# ========================================
# 步骤 4：构建前端
# ========================================
echo "步骤 4/5: 构建前端项目..."
echo "🔨 这可能需要几分钟，请耐心等待..."
echo ""

npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败！"
    exit 1
fi

echo "✅ 构建完成"
echo ""

# ========================================
# 步骤 5：打包构建文件
# ========================================
echo "步骤 5/5: 准备上传文件..."

if [ ! -d "dist" ]; then
    echo "❌ 错误：dist 目录不存在"
    exit 1
fi

echo "✅ 构建文件位于: dist 目录"
echo ""

# 打包 dist 文件夹
echo "📦 正在打包 dist 文件夹..."
if [ -f "dist.zip" ]; then
    rm dist.zip
fi

if command -v zip &> /dev/null; then
    cd dist
    zip -r ../dist.zip .
    cd ..
    echo "✅ 已创建 dist.zip"
elif command -v tar &> /dev/null; then
    tar -czf dist.tar.gz dist/
    echo "✅ 已创建 dist.tar.gz"
else
    echo "💡 提示：请手动压缩 dist 文件夹"
fi

echo ""
echo "=========================================="
echo "✅ 本地构建完成！"
echo "=========================================="
echo ""
echo "📁 构建文件位置: $(pwd)/dist"
echo ""
echo "📝 下一步操作："
echo "  1. 将 dist 文件夹（或压缩包）上传到服务器"
echo "  2. 解压到 /www/wwwroot/abc789.cn/dist"
echo "  3. 在服务器运行: ./deploy-server-only.sh"
echo ""
echo "💡 详细步骤请查看: 本地构建部署指南.md"
echo ""
