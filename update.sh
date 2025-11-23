#!/bin/bash

# ========================================
# CRM 系统代码更新脚本
# ========================================

echo "=========================================="
echo "🔄 开始更新 CRM 系统代码..."
echo "=========================================="

# 项目目录
PROJECT_DIR="/www/wwwroot/CRM"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误：项目目录不存在: $PROJECT_DIR"
    exit 1
fi

# 进入项目目录
cd $PROJECT_DIR

echo ""
echo "📍 当前目录: $(pwd)"
echo ""

# 1. 备份当前配置文件
echo "📦 备份配置文件..."
if [ -f "backend/.env" ]; then
    cp backend/.env backend/.env.backup
    echo "✅ 已备份 backend/.env"
fi

if [ -f ".env.production" ]; then
    cp .env.production .env.production.backup
    echo "✅ 已备份 .env.production"
fi

# 2. 保存本地修改（如果有）
echo ""
echo "💾 保存本地修改..."
git stash save "Auto stash before update $(date '+%Y-%m-%d %H:%M:%S')"

# 3. 拉取最新代码
echo ""
echo "⬇️  拉取最新代码..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ 代码拉取失败！"
    echo "💡 尝试恢复本地修改..."
    git stash pop
    exit 1
fi

echo "✅ 代码拉取成功！"

# 4. 恢复配置文件
echo ""
echo "🔧 恢复配置文件..."
if [ -f "backend/.env.backup" ]; then
    cp backend/.env.backup backend/.env
    echo "✅ 已恢复 backend/.env"
fi

if [ -f ".env.production.backup" ]; then
    cp .env.production.backup .env.production
    echo "✅ 已恢复 .env.production"
fi

# 5. 安装/更新依赖
echo ""
echo "📦 更新前端依赖..."
npm install

echo ""
echo "📦 更新后端依赖..."
cd backend
npm install
cd ..

# 6. 构建前端
echo ""
echo "🔨 构建前端项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 前端构建失败！"
    exit 1
fi

echo "✅ 前端构建成功！"

# 7. 重启后端服务
echo ""
echo "🔄 重启后端服务..."
pm2 restart crm-backend

if [ $? -ne 0 ]; then
    echo "⚠️  PM2 重启失败，尝试手动启动..."
    cd backend
    pm2 start npm --name "crm-backend" -- start
    cd ..
fi

# 8. 查看服务状态
echo ""
echo "📊 服务状态："
pm2 list

# 9. 清理备份文件
echo ""
echo "🧹 清理备份文件..."
rm -f backend/.env.backup
rm -f .env.production.backup

echo ""
echo "=========================================="
echo "✅ 更新完成！"
echo "=========================================="
echo ""
echo "📝 更新日志："
git log --oneline -5
echo ""
echo "💡 提示："
echo "  - 访问网站检查是否正常运行"
echo "  - 查看日志: pm2 logs crm-backend"
echo "  - 如有问题，可以回滚到上一版本"
echo ""
