#!/bin/bash
# ==================== CRM 私有部署交付包打包脚本 ====================
# 用途：从开发仓库提取交付文件，排除不交付内容，生成交付压缩包
# 使用方式：
#   chmod +x build-delivery-package.sh
#   ./build-delivery-package.sh              # 源码包（客户需自行构建）
#   ./build-delivery-package.sh --prebuilt   # 预构建包（含 dist/）
#   ./build-delivery-package.sh --docker     # Docker 交付包

set -e

# ==================== 配置 ====================
VERSION="1.8.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_DIR}/release"
PACKAGE_NAME="CRM-private-v${VERSION}"
TEMP_DIR="/tmp/${PACKAGE_NAME}"
PREBUILT=false
DOCKER_MODE=false

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 参数解析
for arg in "$@"; do
    case $arg in
        --prebuilt) PREBUILT=true ;;
        --docker) DOCKER_MODE=true ;;
    esac
done

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║     CRM 私有部署交付包打包工具 v${VERSION}              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

if $PREBUILT; then
    log_info "模式：预构建包（含 dist/）"
    PACKAGE_NAME="${PACKAGE_NAME}-prebuilt"
elif $DOCKER_MODE; then
    log_info "模式：Docker 交付包"
    PACKAGE_NAME="${PACKAGE_NAME}-docker"
else
    log_info "模式：源码包"
fi

# ==================== Step 1: 清理临时目录 ====================
log_info "Step 1: 准备临时目录..."
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR"

# ==================== Step 2: 复制交付文件 ====================
log_info "Step 2: 复制交付文件..."

# CRM 前端源码
cp -r "$PROJECT_DIR/src" "$TEMP_DIR/src"
cp -r "$PROJECT_DIR/public" "$TEMP_DIR/public"
cp "$PROJECT_DIR/index.html" "$TEMP_DIR/"
cp "$PROJECT_DIR/package.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/vite.config.ts" "$TEMP_DIR/"
cp "$PROJECT_DIR/tsconfig.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/tsconfig.app.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/tsconfig.node.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/eslint.config.ts" "$TEMP_DIR/"
cp "$PROJECT_DIR/env.d.ts" "$TEMP_DIR/"

# 后端源码
mkdir -p "$TEMP_DIR/backend"
cp -r "$PROJECT_DIR/backend/src" "$TEMP_DIR/backend/src"
cp "$PROJECT_DIR/backend/package.json" "$TEMP_DIR/backend/"
cp "$PROJECT_DIR/backend/package-lock.json" "$TEMP_DIR/backend/"
cp "$PROJECT_DIR/backend/tsconfig.json" "$TEMP_DIR/backend/"
cp "$PROJECT_DIR/backend/ecosystem.config.js" "$TEMP_DIR/backend/"

# 数据库脚本
cp -r "$PROJECT_DIR/database" "$TEMP_DIR/database"

# 部署工具（排除运营方内部文档）
mkdir -p "$TEMP_DIR/private-deploy"
cp "$PROJECT_DIR/private-deploy/README.md" "$TEMP_DIR/private-deploy/"
cp "$PROJECT_DIR/private-deploy/install.sh" "$TEMP_DIR/private-deploy/"
cp "$PROJECT_DIR/private-deploy/install.bat" "$TEMP_DIR/private-deploy/"
cp "$PROJECT_DIR/private-deploy/init-mysql-database.js" "$TEMP_DIR/private-deploy/"
cp "$PROJECT_DIR/private-deploy/nginx.conf.template" "$TEMP_DIR/private-deploy/"
cp "$PROJECT_DIR/private-deploy/multi-site-deploy-guide.md" "$TEMP_DIR/private-deploy/"

# Docker 文件
if $DOCKER_MODE; then
    cp -r "$PROJECT_DIR/docker" "$TEMP_DIR/docker"
fi

# 部署脚本
cp "$PROJECT_DIR/deploy.sh" "$TEMP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/build-local.sh" "$TEMP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/nginx.conf.example" "$TEMP_DIR/" 2>/dev/null || true

log_success "文件复制完成"

# ==================== Step 3: 设置环境变量模板 ====================
log_info "Step 3: 重置环境变量为模板..."

# 后端 .env — 设置为私有部署模式，占位符值
cat > "$TEMP_DIR/backend/.env" << 'ENV_TEMPLATE'
# ==================== CRM 系统环境配置 ====================
# ⚠️ 部署时请将所有 your_xxx 占位符替换为实际值

# 服务器配置
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# ⚠️ 私有部署模式（勿改）
DEPLOY_MODE=private

# ==================== 数据库配置 ====================
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_database_user
DB_PASSWORD=your_database_password
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# ==================== JWT 配置 ====================
# 生成密钥: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_jwt_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_change_in_production
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 加密配置
BCRYPT_ROUNDS=12

# ==================== CORS 配置 ====================
CORS_ORIGIN=https://crm.your-domain.com
CORS_CREDENTIALS=true

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# ==================== 安全配置 ====================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=3000
HELMET_ENABLED=true
COMPRESSION_ENABLED=true

# ==================== 部署配置 ====================
BAOTA_PANEL=false
STATIC_PATH=../dist
UPLOAD_PATH=./uploads
ENV_TEMPLATE

# 前端 .env.production
cat > "$TEMP_DIR/.env.production" << 'ENV_FRONTEND'
VITE_API_BASE_URL=/api/v1
NODE_ENV=production
VITE_DEPLOY_MODE=private
ENV_FRONTEND

# 前端 .env.development
cat > "$TEMP_DIR/.env.development" << 'ENV_DEV'
VITE_API_BASE_URL=/api/v1
VITE_DEPLOY_MODE=private
VITE_APP_TITLE=CRM系统 - 开发环境
VITE_APP_ENV=development
ENV_DEV

log_success "环境变量已重置"

# ==================== Step 4: 预构建（可选） ====================
if $PREBUILT; then
    log_info "Step 4: 构建前端和后端..."

    # 构建前端
    cd "$PROJECT_DIR"
    npm install
    VITE_DEPLOY_MODE=private npm run build
    cp -r "$PROJECT_DIR/dist" "$TEMP_DIR/dist"
    log_success "前端构建完成"

    # 构建后端
    cd "$PROJECT_DIR/backend"
    npm install
    npm run build
    cp -r "$PROJECT_DIR/backend/dist" "$TEMP_DIR/backend/dist"
    log_success "后端构建完成"
else
    log_info "Step 4: 跳过（源码模式，客户自行构建）"
fi

# ==================== Step 5: 清理不必要的文件 ====================
log_info "Step 5: 清理不必要的文件..."

# 从 public/ 中删除我方验证文件
rm -f "$TEMP_DIR/public/MP_verify_"*.txt
rm -f "$TEMP_DIR/public/WW_verify_"*.txt

# 删除 SaaS 许可证相关
rm -f "$TEMP_DIR/backend/src/routes/admin/"* 2>/dev/null || true
rm -f "$TEMP_DIR/private-deploy/SaaS-license-guide.md" 2>/dev/null || true
rm -f "$TEMP_DIR/private-deploy/delivery-guide.md" 2>/dev/null || true
rm -f "$TEMP_DIR/private-deploy/clean-for-delivery.bat" 2>/dev/null || true
rm -f "$TEMP_DIR/private-deploy/payment-config-guide.md" 2>/dev/null || true
rm -f "$TEMP_DIR/private-deploy/central-server-callback-guide.md" 2>/dev/null || true

# 删除内部文档
rm -rf "$TEMP_DIR/private-deploy/"*报告*.md 2>/dev/null || true
rm -rf "$TEMP_DIR/private-deploy/"*修复*.sql 2>/dev/null || true
rm -rf "$TEMP_DIR/private-deploy/"*权限*.sql 2>/dev/null || true
rm -rf "$TEMP_DIR/private-deploy/"*验证*.sql 2>/dev/null || true
rm -rf "$TEMP_DIR/private-deploy/"*迁移*.sql 2>/dev/null || true

log_success "清理完成"

# ==================== Step 6: 打包 ====================
log_info "Step 6: 打包交付文件..."

cd /tmp
tar -czf "${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz" "$PACKAGE_NAME"

FILESIZE=$(du -sh "${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz" | cut -f1)
log_success "打包完成: ${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz (${FILESIZE})"

# 清理临时目录
rm -rf "$TEMP_DIR"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                🎉 交付包打包完成！                    ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  输出文件:                                            ║"
echo "║    ${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz"
echo "║                                                      ║"
echo "║  文件大小: ${FILESIZE}                                ║"
echo "║                                                      ║"
if $DOCKER_MODE; then
echo "║  下一步: 构建 Docker 镜像                             ║"
echo "║    cd docker && docker-compose build                  ║"
elif $PREBUILT; then
echo "║  下一步: 交付给客户                                    ║"
echo "║    客户只需修改 .env 并运行 install.sh                ║"
else
echo "║  下一步: 推送到交付仓库或交付给客户                     ║"
echo "║    客户需运行 npm install 和 npm run build            ║"
fi
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
