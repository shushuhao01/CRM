#!/bin/bash

# ========================================
# CRM 系统代码更新脚本 v2.0
# 适用：更新代码后重新构建所有端 + 重启服务
# ========================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}==========================================${NC}"
echo -e "${CYAN}  CRM 系统代码更新脚本 v2.0${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""

# 项目目录
PROJECT_DIR="/www/wwwroot/CRM"

# 检查项目目录是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}[X] 错误：项目目录不存在: $PROJECT_DIR${NC}"
    exit 1
fi

cd "$PROJECT_DIR"
echo -e "${YELLOW}[i] 当前目录: $(pwd)${NC}"
echo ""

# 设置 Node.js 内存限制（使用总内存的60%，确保系统和其他服务有足够空间）
TOTAL_MEM=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}' || echo 4096)
NODE_MEM=$((TOTAL_MEM * 60 / 100))
# 最低1536MB，最高6144MB
if [ "$NODE_MEM" -lt 1536 ]; then NODE_MEM=1536; fi
if [ "$NODE_MEM" -gt 6144 ]; then NODE_MEM=6144; fi
export NODE_OPTIONS="--max-old-space-size=$NODE_MEM"
echo -e "${YELLOW}[i] 内存: ${TOTAL_MEM}MB，Node构建限制: ${NODE_MEM}MB${NC}"

# ==================== Step 1: 备份配置文件 ====================
echo -e "${YELLOW}[1] 备份配置文件...${NC}"
[ -f "backend/.env" ] && cp backend/.env backend/.env.backup
[ -f ".env.production" ] && cp .env.production .env.production.backup
echo -e "${GREEN}[OK] 配置已备份${NC}"
echo ""

# ==================== Step 2: 拉取代码 ====================
echo -e "${YELLOW}[2] 拉取最新代码...${NC}"
git stash save "Auto stash before update $(date '+%Y-%m-%d %H:%M:%S')" 2>/dev/null || true
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}[X] 代码拉取失败！${NC}"
    git stash pop 2>/dev/null || true
    exit 1
fi
echo -e "${GREEN}[OK] 代码拉取成功${NC}"
echo ""

# ==================== Step 3: 恢复配置文件 ====================
echo -e "${YELLOW}[3] 恢复配置文件...${NC}"
[ -f "backend/.env.backup" ] && cp backend/.env.backup backend/.env
[ -f ".env.production.backup" ] && cp .env.production.backup .env.production
echo -e "${GREEN}[OK] 配置已恢复${NC}"
echo ""

# ==================== Step 4: 安装/更新依赖 ====================
echo -e "${YELLOW}[4] 更新依赖...${NC}"

echo -e "${YELLOW}    [4.1] 前端 (CRM主应用) 依赖...${NC}"
cd "$PROJECT_DIR"
npm install --legacy-peer-deps 2>&1
echo -e "${GREEN}    [OK] 前端依赖已更新（postinstall自动修复权限）${NC}"

echo -e "${YELLOW}    [4.2] 后端依赖...${NC}"
cd "$PROJECT_DIR/backend"
npm install 2>&1
echo -e "${GREEN}    [OK] 后端依赖已更新（postinstall自动修复权限）${NC}"

# 子项目通用权限修复函数
fix_subproject_permissions() {
    local dir="$1"
    chmod -R +x "$dir/node_modules/.bin" 2>/dev/null || true
    find "$dir/node_modules/@esbuild" -name esbuild -type f -exec chmod +x {} \; 2>/dev/null || true
    find "$dir/node_modules" -path "*/sass-embedded-linux-*/dart-sass/src/dart" -exec chmod +x {} \; 2>/dev/null || true
}

# 官网
if [ -f "$PROJECT_DIR/website/package.json" ]; then
    echo -e "${YELLOW}    [4.3] 官网依赖...${NC}"
    cd "$PROJECT_DIR/website"
    npm install 2>&1
    fix_subproject_permissions "$PROJECT_DIR/website"
    echo -e "${GREEN}    [OK] 官网依赖已更新${NC}"
fi

# 管理后台
if [ -f "$PROJECT_DIR/admin/package.json" ]; then
    echo -e "${YELLOW}    [4.4] 管理后台依赖...${NC}"
    cd "$PROJECT_DIR/admin"
    npm install 2>&1
    fix_subproject_permissions "$PROJECT_DIR/admin"
    echo -e "${GREEN}    [OK] 管理后台依赖已更新${NC}"
fi

# H5
if [ -f "$PROJECT_DIR/h5/package.json" ]; then
    echo -e "${YELLOW}    [4.5] H5企微依赖...${NC}"
    cd "$PROJECT_DIR/h5"
    npm install 2>&1
    fix_subproject_permissions "$PROJECT_DIR/h5"
    echo -e "${GREEN}    [OK] H5依赖已更新${NC}"
fi

echo ""

# ==================== Step 5: 构建所有端 ====================
echo -e "${YELLOW}[5] 构建项目...${NC}"

# ★ 构建前先停掉后端进程释放内存（后端 Node 进程占 200-500MB，构建时不需要）
if command -v pm2 &> /dev/null && pm2 describe crm-backend &> /dev/null 2>&1; then
    echo -e "${YELLOW}    [i] 暂停后端服务以释放构建内存...${NC}"
    pm2 stop crm-backend 2>/dev/null || true
fi

# 5.1 CRM 主应用
echo -e "${YELLOW}    [5.1] 构建 CRM 主应用...${NC}"
cd "$PROJECT_DIR"
npm run build
echo -e "${GREEN}    [OK] CRM 主应用构建完成${NC}"

# 5.2 官网
if [ -f "$PROJECT_DIR/website/package.json" ] && [ -d "$PROJECT_DIR/website/src" ]; then
    echo -e "${YELLOW}    [5.2] 构建官网...${NC}"
    cd "$PROJECT_DIR/website"
    npm run build
    echo -e "${GREEN}    [OK] 官网构建完成${NC}"
fi

# 5.3 管理后台
if [ -f "$PROJECT_DIR/admin/package.json" ] && [ -d "$PROJECT_DIR/admin/src" ]; then
    echo -e "${YELLOW}    [5.3] 构建管理后台...${NC}"
    cd "$PROJECT_DIR/admin"
    npm run build
    echo -e "${GREEN}    [OK] 管理后台构建完成${NC}"
fi

# 5.4 H5企微
if [ -f "$PROJECT_DIR/h5/package.json" ] && [ -d "$PROJECT_DIR/h5/src" ]; then
    echo -e "${YELLOW}    [5.4] 构建H5企微应用...${NC}"
    cd "$PROJECT_DIR/h5"
    npx vite build
    echo -e "${GREEN}    [OK] H5构建完成${NC}"
fi

# 5.5 后端
echo -e "${YELLOW}    [5.5] 构建后端 (TypeScript编译)...${NC}"
cd "$PROJECT_DIR/backend"
npm run build
echo -e "${GREEN}    [OK] 后端构建完成${NC}"

echo ""

# ==================== Step 6: 重启服务 ====================
echo -e "${YELLOW}[6] 重启后端服务...${NC}"
cd "$PROJECT_DIR/backend"

if command -v pm2 &> /dev/null; then
    if pm2 describe crm-backend &> /dev/null; then
        pm2 restart crm-backend
    else
        pm2 start dist/app.js --name crm-backend --max-memory-restart 1G
    fi
    pm2 save
    echo -e "${GREEN}[OK] 后端服务已重启${NC}"
else
    echo -e "${RED}[X] PM2 未安装，请手动启动后端${NC}"
fi
echo ""

# ==================== Step 7: 验证 ====================
echo -e "${YELLOW}[7] 验证部署...${NC}"
sleep 2

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/v1/health 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}[OK] API 健康检查通过${NC}"
else
    echo -e "${YELLOW}[!] API 返回: $HTTP_CODE（可能仍在启动中）${NC}"
fi

# 清理备份
rm -f "$PROJECT_DIR/backend/.env.backup"
rm -f "$PROJECT_DIR/.env.production.backup"

cd "$PROJECT_DIR"

echo ""
echo -e "${CYAN}==========================================${NC}"
echo -e "${GREEN}  更新完成！${NC}"
echo -e "${CYAN}==========================================${NC}"
echo ""
echo -e "${YELLOW}更新日志:${NC}"
git log --oneline -5
echo ""
echo -e "${YELLOW}服务状态:${NC}"
pm2 list 2>/dev/null || true
echo ""
echo -e "${YELLOW}提示:${NC}"
echo "  - 查看日志: pm2 logs crm-backend"
echo "  - 如有问题: pm2 restart crm-backend"
echo ""
