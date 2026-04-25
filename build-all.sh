#!/bin/bash
# =============================================
# CRM 多端一键构建脚本
# 构建所有前端 + 后端，并重启服务
# =============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR=$(cd "$(dirname "$0")" && pwd)

echo -e "${CYAN}=========================================${NC}"
echo -e "${CYAN}  CRM 多端一键构建脚本${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""

# 设置 Node.js 内存限制
TOTAL_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 4096)
if [ "$TOTAL_MEM" -lt 3000 ]; then
    NODE_MEM=1536
else
    NODE_MEM=4096
fi
export NODE_OPTIONS="--max-old-space-size=$NODE_MEM"
echo -e "${YELLOW}[i] Node.js 内存限制: ${NODE_MEM}MB${NC}"

# 检测 npm registry
NPM_REGISTRY="https://registry.npmjs.org"
if ! curl -s --connect-timeout 5 --max-time 10 "https://registry.npmjs.org/vue" > /dev/null 2>&1; then
    NPM_REGISTRY="https://registry.npmmirror.com"
    echo -e "${YELLOW}[i] 使用淘宝镜像源${NC}"
fi

# 解锁宝塔 .user.ini 文件（防止构建失败）
echo -e "${YELLOW}[0] 解锁 .user.ini 文件...${NC}"
for d in "$PROJECT_DIR/dist" "$PROJECT_DIR/website/dist" "$PROJECT_DIR/admin/dist"; do
    if [ -f "$d/.user.ini" ]; then
        chattr -i "$d/.user.ini" 2>/dev/null || true
        rm -f "$d/.user.ini"
        echo -e "${GREEN}    已清理 $d/.user.ini${NC}"
    fi
done
echo ""

# =============================================
# 1. 构建 CRM 主应用
# =============================================
echo -e "${CYAN}[1/4] 构建 CRM 主应用 (crm.yunkes.com)...${NC}"
cd "$PROJECT_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}    安装依赖...${NC}"
    npm install --legacy-peer-deps --registry "$NPM_REGISTRY" 2>&1
fi
npm run build
if [ -f "dist/index.html" ]; then
    echo -e "${GREEN}[OK] CRM 主应用构建成功${NC}"
else
    echo -e "${RED}[X] CRM 主应用构建失败${NC}"
    exit 1
fi
echo ""

# =============================================
# 2. 构建官方网站
# =============================================
echo -e "${CYAN}[2/4] 构建官方网站 (yunkes.com)...${NC}"
cd "$PROJECT_DIR/website"
if [ -d "src" ] && [ -f "package.json" ]; then
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/vue" ]; then
        echo -e "${YELLOW}    安装依赖...${NC}"
        # 镜像源时删除 lockfile 避免冲突
        if [ "$NPM_REGISTRY" != "https://registry.npmjs.org" ]; then
            rm -f package-lock.json
        fi
        npm install --registry "$NPM_REGISTRY" 2>&1
    fi
    npm run build
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}[OK] 官方网站构建成功${NC}"
    else
        echo -e "${RED}[X] 官方网站构建失败${NC}"
    fi
else
    echo -e "${YELLOW}[i] 官方网站源码不存在，跳过${NC}"
fi
echo ""

# =============================================
# 3. 构建管理后台
# =============================================
echo -e "${CYAN}[3/4] 构建管理后台 (admin.yunkes.com)...${NC}"
cd "$PROJECT_DIR/admin"
if [ -d "src" ] && [ -f "package.json" ]; then
    if [ ! -d "node_modules" ] || [ ! -d "node_modules/vue" ]; then
        echo -e "${YELLOW}    安装依赖...${NC}"
        if [ "$NPM_REGISTRY" != "https://registry.npmjs.org" ]; then
            rm -f package-lock.json
        fi
        npm install --registry "$NPM_REGISTRY" 2>&1
    fi
    npm run build
    if [ -f "dist/index.html" ]; then
        echo -e "${GREEN}[OK] 管理后台构建成功${NC}"
    else
        echo -e "${RED}[X] 管理后台构建失败${NC}"
    fi
else
    echo -e "${YELLOW}[i] 管理后台源码不存在，跳过${NC}"
fi
echo ""

# =============================================
# 4. 构建后端 + 重启服务
# =============================================
echo -e "${CYAN}[4/4] 构建后端并重启服务...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ] || [ ! -d "node_modules/express" ]; then
    echo -e "${YELLOW}    安装依赖...${NC}"
    if [ "$NPM_REGISTRY" != "https://registry.npmjs.org" ]; then
        rm -f package-lock.json
    fi
    npm install --registry "$NPM_REGISTRY" 2>&1
fi
npm run build
echo -e "${GREEN}[OK] 后端构建成功${NC}"

# 重启 PM2
if command -v pm2 &> /dev/null; then
    if pm2 describe crm-backend &> /dev/null; then
        pm2 restart crm-backend
        echo -e "${GREEN}[OK] 后端服务已重启${NC}"
    else
        pm2 start dist/app.js --name crm-backend --max-memory-restart 1G
        echo -e "${GREEN}[OK] 后端服务已启动${NC}"
    fi
    pm2 save
fi
echo ""

# =============================================
# 完成
# =============================================
cd "$PROJECT_DIR"

echo -e "${CYAN}=========================================${NC}"
echo -e "${GREEN}  所有构建完成！${NC}"
echo -e "${CYAN}=========================================${NC}"
echo ""
echo -e "${YELLOW}构建结果:${NC}"
[ -f "dist/index.html" ] && echo -e "  ${GREEN}✓${NC} CRM 主应用  → dist/"
[ -f "website/dist/index.html" ] && echo -e "  ${GREEN}✓${NC} 官方网站    → website/dist/"
[ -f "admin/dist/index.html" ] && echo -e "  ${GREEN}✓${NC} 管理后台    → admin/dist/"
[ -d "backend/dist" ] && echo -e "  ${GREEN}✓${NC} 后端服务    → backend/dist/"
echo ""

if command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}服务状态:${NC}"
    pm2 list
fi
