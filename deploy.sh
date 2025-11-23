#!/bin/bash

# ========================================
# CRM系统一键部署脚本（优化版）
# 适用于：2GB+ 内存服务器
# 优化：减少内存占用，提高构建成功率
# ========================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "🚀 CRM系统一键部署脚本（优化版）"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# 环境检查
# ========================================
echo "📋 检查环境..."

# 检查Node.js版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js版本过低，需要16.x或更高版本${NC}"
    echo "当前版本: $(node -v)"
    exit 1
fi
echo -e "${GREEN}✅ Node.js版本检查通过: $(node -v)${NC}"

# 检查内存
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
echo -e "${BLUE}💾 系统内存: ${TOTAL_MEM}MB${NC}"

# 设置Node.js内存限制（根据系统内存动态调整）
if [ "$TOTAL_MEM" -lt 3000 ]; then
    # 2GB 内存服务器
    export NODE_OPTIONS="--max-old-space-size=1536"
    echo -e "${YELLOW}⚠️  检测到低内存环境，已优化构建配置${NC}"
    echo -e "${BLUE}📊 Node.js 内存限制: 1.5GB${NC}"
elif [ "$TOTAL_MEM" -lt 5000 ]; then
    # 4GB 内存服务器
    export NODE_OPTIONS="--max-old-space-size=3072"
    echo -e "${BLUE}📊 Node.js 内存限制: 3GB${NC}"
else
    # 8GB+ 内存服务器
    export NODE_OPTIONS="--max-old-space-size=4096"
    echo -e "${BLUE}📊 Node.js 内存限制: 4GB${NC}"
fi

# ========================================
# 配置检查
# ========================================
echo ""
echo "🔍 检查配置文件..."

# 检查后端配置
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  未找到 backend/.env 文件${NC}"
    if [ -f "backend/.env.example" ]; then
        echo "📝 从 .env.example 创建 .env..."
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}⚠️  请编辑 backend/.env 文件配置数据库信息！${NC}"
        echo "按回车继续..."
        read
    else
        echo -e "${RED}❌ 错误：找不到 backend/.env.example${NC}"
        exit 1
    fi
fi

# 检查前端配置
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  未找到 .env.production 文件${NC}"
    echo "📝 创建默认配置..."
    cat > .env.production << 'EOF'
# 生产环境配置
VITE_API_BASE_URL=/api
VITE_APP_TITLE=CRM管理系统
NODE_ENV=production
VITE_USE_REAL_API=true
EOF
    echo -e "${GREEN}✅ 已创建 .env.production${NC}"
fi

echo -e "${GREEN}✅ 配置文件检查完成${NC}"

# ========================================
# 配置 npm 镜像（加速下载）
# ========================================
echo ""
echo "🔧 配置 npm 镜像..."
npm config set registry https://registry.npmmirror.com
echo -e "${GREEN}✅ npm 镜像配置完成${NC}"

# ========================================
# 步骤 1：安装前端依赖
# ========================================
echo ""
echo "📦 步骤1/6: 安装前端依赖..."
if [ -d "node_modules" ]; then
    echo -e "${BLUE}node_modules 已存在，跳过安装${NC}"
    echo "💡 如需重新安装，请先删除 node_modules 目录"
else
    echo "📥 安装中，请耐心等待..."
    npm install --legacy-peer-deps
fi
echo -e "${GREEN}✅ 前端依赖就绪${NC}"

# ========================================
# 步骤 2：安装后端依赖
# ========================================
echo ""
echo "📦 步骤2/6: 安装后端依赖..."
cd backend
if [ -d "node_modules" ]; then
    echo -e "${BLUE}backend/node_modules 已存在，跳过安装${NC}"
else
    echo "📥 安装中，请耐心等待..."
    npm install --production --legacy-peer-deps
fi
cd ..
echo -e "${GREEN}✅ 后端依赖就绪${NC}"

# ========================================
# 步骤 3：构建前端（优化版）
# ========================================
echo ""
echo "🔨 步骤3/6: 构建前端..."
echo -e "${BLUE}💡 使用优化构建配置，减少内存占用${NC}"

# 清理旧的构建缓存
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true

# 构建前端
echo "🔨 构建中，这可能需要几分钟..."
npm run build

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo -e "${RED}❌ 前端构建失败！${NC}"
    echo "💡 建议：如果服务器内存不足，可以使用本地构建方案"
    echo "   查看：本地构建部署指南.md"
    exit 1
fi

echo -e "${GREEN}✅ 前端构建完成${NC}"

# ========================================
# 步骤 4：准备后端（跳过构建）
# ========================================
echo ""
echo "🔨 步骤4/6: 准备后端..."
echo -e "${BLUE}💡 后端使用 TypeScript 直接运行，无需构建${NC}"
echo -e "${GREEN}✅ 后端准备完成${NC}"

# ========================================
# 步骤 5：检查 PM2
# ========================================
echo ""
echo "🔍 步骤5/6: 检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2 已就绪${NC}"

# ========================================
# 步骤 6：启动/重启服务
# ========================================
echo ""
echo "🚀 步骤6/6: 启动服务..."
cd backend

# 停止旧服务
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

# 启动新服务
echo "🚀 启动后端服务..."
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    # 如果没有 ecosystem.config.js，使用默认配置
    pm2 start npm --name "crm-backend" -- start
fi

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup 2>/dev/null || true

cd ..
echo -e "${GREEN}✅ 服务启动完成${NC}"

# ========================================
# 显示部署结果
# ========================================
echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo ""
echo "📊 服务状态:"
pm2 list

echo ""
echo "📝 常用命令:"
echo "  查看日志: pm2 logs crm-backend"
echo "  重启服务: pm2 restart crm-backend"
echo "  停止服务: pm2 stop crm-backend"
echo "  查看状态: pm2 list"
echo ""
echo "🌐 访问地址:"
echo "  前端: http://您的域名或IP"
echo "  API: http://您的域名或IP/api/v1/health"
echo ""
echo "💡 下一步:"
echo "  1. 配置 Nginx（如果还没配置）"
echo "  2. 访问网站测试功能"
echo "  3. 使用预设账号登录: superadmin / super123456"
echo ""
echo -e "${GREEN}🎉 部署成功！${NC}"
echo ""
