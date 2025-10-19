#!/bin/bash

echo "=== 宝塔面板前端构建修复脚本 ==="
echo "开始修复前端构建问题..."

# 检查Node.js版本
echo "检查Node.js版本..."
node_version=$(node --version)
echo "当前Node.js版本: $node_version"

# 清理缓存
echo "清理npm缓存..."
npm cache clean --force

# 安装兼容版本的Element Plus
echo "安装兼容版本的Element Plus..."
npm install element-plus@2.1.11

# 安装terser依赖
echo "安装terser依赖..."
npm install terser --save-dev

# 清理Vite缓存
echo "清理Vite缓存..."
rm -rf .vite 2>/dev/null || true

# 构建项目
echo "开始构建项目..."
npm run build-bt

# 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 构建成功！"
    echo "📁 构建文件位于 dist/ 目录"
    echo "📊 构建文件大小："
    du -sh dist/ 2>/dev/null || echo "无法获取文件大小"
    echo ""
    echo "🎉 前端构建完成，可以部署到宝塔面板了！"
else
    echo "❌ 构建失败"
    echo "请检查上面的错误信息，或联系技术支持"
    exit 1
fi