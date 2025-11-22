#!/bin/bash

# CRM系统一键部署脚本
# 适用于宝塔面板环境

set -e  # 遇到错误立即退出

echo "========================================="
echo "🚀 CRM系统一键部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Node.js版本
echo "📋 检查环境..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo -e "${RED}❌ Node.js版本过低，需要22.x或更高版本${NC}"
    echo "当前版本: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js版本检查通过: $(node -v)${NC}"

# 检查是否存在.env文件
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  未找到backend/.env文件${NC}"
    echo "正在从.env.example创建..."
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  请编辑 backend/.env 文件配置数据库等信息${NC}"
    echo "按任意键继续..."
    read -n 1
fi

# 1. 安装前端依赖
echo ""
echo "📦 步骤1/6: 安装前端依赖..."
npm install --production
echo -e "${GREEN}✅ 前端依赖安装完成${NC}"

# 2. 安装后端依赖
echo ""
echo "📦 步骤2/6: 安装后端依赖..."
cd backend
npm install --production
cd ..
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"

# 3. 构建前端
echo ""
echo "🔨 步骤3/6: 构建前端..."
npm run build
echo -e "${GREEN}✅ 前端构建完成${NC}"

# 4. 构建后端
echo ""
echo "🔨 步骤4/6: 构建后端..."
cd backend
npm run build
cd ..
echo -e "${GREEN}✅ 后端构建完成${NC}"

# 5. 检查PM2
echo ""
echo "🔍 步骤5/6: 检查PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2已就绪${NC}"

# 6. 启动/重启服务
echo ""
echo "🚀 步骤6/6: 启动服务..."
cd backend

# 检查服务是否已存在
if pm2 list | grep -q "crm-backend"; then
    echo "重启现有服务..."
    pm2 restart crm-backend
else
    echo "首次启动服务..."
    pm2 start ecosystem.config.js
fi

# 保存PM2配置
pm2 save

cd ..
echo -e "${GREEN}✅ 服务启动完成${NC}"

# 显示服务状态
echo ""
echo "========================================="
echo "✅ 部署完成！"
echo "========================================="
echo ""
echo "📊 服务状态:"
pm2 status

echo ""
echo "📝 常用命令:"
echo "  查看日志: pm2 logs crm-backend"
echo "  重启服务: pm2 restart crm-backend"
echo "  停止服务: pm2 stop crm-backend"
echo "  查看状态: pm2 status"
echo ""
echo "🌐 访问地址:"
echo "  前端: http://你的域名"
echo "  API: http://你的域名/api/v1/health"
echo ""
echo -e "${GREEN}🎉 部署成功！${NC}"
