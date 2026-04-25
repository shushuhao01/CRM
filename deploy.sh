#!/bin/bash
# =============================================
# CRM系统一键部署脚本 (Linux/宝塔面板版本)
# 版本: v2.0
# 适用: CentOS 7/8, Ubuntu 18/20/22, Debian 10/11
# 要求: Node.js >= 22.x, PM2, MySQL 8.0+
# =============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 项目路径
PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)
BACKEND_DIR="$PROJECT_DIR/backend"
DIST_DIR="$PROJECT_DIR/dist"

# PM2 进程名
PM2_NAME="crm-backend"

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  CRM系统一键部署脚本${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# =============================================
# 阶段 1: 环境检查
# =============================================
echo -e "${YELLOW}[1] 检查环境...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[X] 未找到 Node.js，请先安装 Node.js 22.x 或更高版本${NC}"
    echo -e "${YELLOW}宝塔面板: 软件商店 -> Node.js版本管理器 -> 安装 Node.js 22.x${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}[X] Node.js 版本过低 ($(node -v))，需要 >= 18.x，推荐 22.x${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] Node.js版本检查通过: $(node -v)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[X] 未找到 npm${NC}"
    exit 1
fi
echo -e "${GREEN}[OK] npm版本: $(npm -v)${NC}"

# 检查内存并设置 Node.js 内存限制
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
echo -e "${YELLOW}[i] 系统内存: ${TOTAL_MEM}MB${NC}"

if [ "$TOTAL_MEM" -lt 1500 ]; then
    NODE_MEM=1024
    echo -e "${YELLOW}[!] 内存较低，建议添加 Swap 虚拟内存${NC}"
elif [ "$TOTAL_MEM" -lt 3000 ]; then
    NODE_MEM=1536
elif [ "$TOTAL_MEM" -lt 6000 ]; then
    NODE_MEM=3072
else
    NODE_MEM=4096
fi
export NODE_OPTIONS="--max-old-space-size=$NODE_MEM"
echo -e "${YELLOW}[i] Node.js 内存限制: ${NODE_MEM}MB${NC}"

# 检查 .env 文件
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}[!] 未找到 backend/.env 文件${NC}"
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo -e "${YELLOW}已从 .env.example 创建 .env 文件${NC}"
        echo -e "${RED}[!] 请先编辑 backend/.env 文件，配置数据库密码和 JWT_SECRET！${NC}"
        echo -e "${RED}    vim $BACKEND_DIR/.env${NC}"
        echo ""
        read -p "配置完成后按回车继续，或按 Ctrl+C 退出..." _
    else
        echo -e "${RED}[X] 未找到 .env.example 模板文件${NC}"
        exit 1
    fi
fi

# 检查 .env 中的关键配置是否已修改
if grep -q "your_database_password\|your_jwt_secret\|your_database_name" "$BACKEND_DIR/.env" 2>/dev/null; then
    echo -e "${RED}[!] 检测到 backend/.env 中仍有未修改的占位符！${NC}"
    echo -e "${RED}    请先修改数据库密码、JWT_SECRET 等配置${NC}"
    read -p "确认已修改请按回车继续，或按 Ctrl+C 退出..." _
fi

echo ""

# =============================================
# 阶段 2: 设置 npm 镜像源（加速国内下载）
# =============================================
echo -e "${YELLOW}[2] 配置 npm 镜像源...${NC}"
CURRENT_REGISTRY=$(npm config get registry)
if [[ "$CURRENT_REGISTRY" != *"npmmirror"* && "$CURRENT_REGISTRY" != *"taobao"* ]]; then
    npm config set registry https://registry.npmmirror.com
    echo -e "${GREEN}[OK] 已设置淘宝镜像源（加速下载）${NC}"
else
    echo -e "${GREEN}[OK] 已使用国内镜像源${NC}"
fi
echo ""

# =============================================
# 阶段 3: 安装依赖
# =============================================

# 步骤 1/6: 安装前端依赖（需要 devDependencies 用于构建）
echo -e "${YELLOW}[3] 步骤1/6: 安装前端依赖...${NC}"
cd "$PROJECT_DIR"
if [ -f "package-lock.json" ]; then
    npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
else
    npm install --legacy-peer-deps
fi
echo -e "${GREEN}[OK] 前端依赖安装完成${NC}"
echo ""

# 步骤 2/6: 安装后端依赖
echo -e "${YELLOW}[3] 步骤2/6: 安装后端依赖...${NC}"
cd "$BACKEND_DIR"
if [ -f "package-lock.json" ]; then
    npm ci 2>/dev/null || npm install
else
    npm install
fi
echo -e "${GREEN}[OK] 后端依赖安装完成${NC}"
echo ""

# =============================================
# 阶段 4: 构建项目
# =============================================

# 步骤 3/6: 构建前端
echo -e "${YELLOW}[4] 步骤3/6: 构建前端...${NC}"
cd "$PROJECT_DIR"

# 低内存用简化构建，高内存用完整构建
if [ "$TOTAL_MEM" -lt 3000 ]; then
    echo -e "${YELLOW}    (低内存模式，使用简化构建)${NC}"
    npx vite build --mode production 2>/dev/null || npm run build
else
    npm run build
fi

if [ -f "$DIST_DIR/index.html" ]; then
    echo -e "${GREEN}[OK] 前端构建完成${NC}"
else
    echo -e "${RED}[X] 前端构建失败，dist/index.html 不存在${NC}"
    exit 1
fi
echo ""

# 步骤 4/6: 构建后端（TypeScript 编译）
echo -e "${YELLOW}[4] 步骤4/6: 构建后端...${NC}"
cd "$BACKEND_DIR"
npm run build
echo -e "${GREEN}[OK] 后端构建完成${NC}"
echo ""

# =============================================
# 阶段 5: PM2 部署
# =============================================

# 步骤 5/6: 检查 PM2
echo -e "${YELLOW}[5] 步骤5/6: 检查 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}[!] PM2 未安装，正在安装...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}[OK] PM2 已安装: $(pm2 -v)${NC}"
echo ""

# 步骤 6/6: 启动/重启服务
echo -e "${YELLOW}[5] 步骤6/6: 启动服务...${NC}"
cd "$BACKEND_DIR"

# 确保目录存在
mkdir -p logs
mkdir -p uploads

# 检查进程是否已存在
if pm2 describe "$PM2_NAME" &> /dev/null; then
    echo -e "${YELLOW}    重启现有服务...${NC}"
    pm2 restart "$PM2_NAME"
else
    echo -e "${YELLOW}    首次启动服务...${NC}"
    pm2 start dist/app.js \
        --name "$PM2_NAME" \
        --max-memory-restart 1G \
        --log-date-format "YYYY-MM-DD HH:mm:ss" \
        --merge-logs \
        -e ./logs/error.log \
        -o ./logs/out.log
fi

# 保存 PM2 配置（开机自启）
pm2 save
pm2 startup 2>/dev/null || true

echo -e "${GREEN}[OK] 服务启动完成${NC}"
echo ""

# =============================================
# 阶段 6: 验证部署
# =============================================
echo -e "${YELLOW}[6] 验证部署...${NC}"

# 等待服务启动
sleep 3

# 检查进程状态
if pm2 describe "$PM2_NAME" 2>/dev/null | grep -q "online"; then
    echo -e "${GREEN}[OK] 后端服务运行正常${NC}"
else
    echo -e "${RED}[!] 后端服务可能未正常启动，请检查日志:${NC}"
    echo -e "${RED}    pm2 logs $PM2_NAME${NC}"
fi

# 检查前端文件
if [ -f "$DIST_DIR/index.html" ]; then
    echo -e "${GREEN}[OK] 前端文件就绪${NC}"
fi

# 健康检查
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/v1/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}[OK] API 健康检查通过${NC}"
else
    echo -e "${YELLOW}[!] API 健康检查返回: $HTTP_CODE（服务可能仍在启动中）${NC}"
fi

cd "$PROJECT_DIR"

# =============================================
# 部署完成
# =============================================
echo ""
echo -e "${CYAN}=========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${YELLOW}服务状态:${NC}"
pm2 list
echo ""
echo -e "${YELLOW}常用命令:${NC}"
echo "  查看日志: pm2 logs $PM2_NAME"
echo "  重启服务: pm2 restart $PM2_NAME"
echo "  停止服务: pm2 stop $PM2_NAME"
echo "  查看状态: pm2 status"
echo ""
echo -e "${YELLOW}接下来请配置 Nginx:${NC}"
echo "  1. 宝塔面板 -> 网站 -> 添加站点"
echo "  2. 根目录选择: $DIST_DIR"
echo "  3. 配置反向代理: /api -> http://127.0.0.1:3000"
echo "  4. 配置详见项目 docs 目录中的部署教程"
echo ""
echo -e "${GREEN}部署成功！${NC}"