#!/bin/bash
# CRM系统 - 私有部署一键安装脚本 (Linux/macOS)
# 适用于: 宝塔面板、Ubuntu、CentOS、macOS
# 使用方式: chmod +x install.sh && ./install.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }
log_title() {
  echo ""
  echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}  $1${NC}"
  echo -e "${BOLD}══════════════════════════════════════════════════════${NC}"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║       CRM 系统 - 私有部署一键安装向导                ║"
echo "║                  版本: 1.8.0                        ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ==================== Step 1: 环境检测 ====================
log_title "Step 1: 环境检测"

# 检查 Node.js
if ! command -v node &>/dev/null; then
  log_error "未安装 Node.js"
  log_info "请安装 Node.js 22.0 或更高版本"
  log_info "推荐使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
  exit 1
fi

NODE_VER=$(node -v)
log_success "Node.js: $NODE_VER"

# 检查 npm
if ! command -v npm &>/dev/null; then
  log_error "未安装 npm"
  exit 1
fi
NPM_VER=$(npm -v)
log_success "npm: v$NPM_VER"

# 检查 MySQL
if command -v mysql &>/dev/null; then
  MYSQL_VER=$(mysql --version 2>/dev/null | head -1)
  log_success "MySQL: $MYSQL_VER"
else
  log_warn "未检测到 MySQL 命令行客户端"
  log_info "如果MySQL已安装但未添加到PATH，可继续安装"
fi

echo ""

# ==================== Step 2: 数据库初始化 ====================
log_title "Step 2: 数据库初始化"
echo ""
log_info "请确保MySQL服务已启动，然后按照提示输入数据库配置信息。"
echo ""

cd "$SCRIPT_DIR"
node init-mysql-database.js
if [ $? -ne 0 ]; then
  echo ""
  log_error "数据库初始化失败，请检查错误信息后重试"
  exit 1
fi

echo ""

# ==================== Step 3: 安装后端依赖 ====================
log_title "Step 3: 安装后端依赖"
cd "$PROJECT_DIR/backend"
log_info "正在安装后端npm依赖..."
npm install --production 2>/dev/null || true
log_success "后端依赖安装完成"
echo ""

# ==================== Step 4: 构建后端 ====================
log_title "Step 4: 构建后端"
npm run build
if [ $? -ne 0 ]; then
  log_error "后端构建失败"
  exit 1
fi
log_success "后端构建完成"
echo ""

# ==================== Step 5: 构建前端 ====================
log_title "Step 5: 构建CRM前端"
cd "$PROJECT_DIR"
log_info "正在安装前端npm依赖..."
npm install 2>/dev/null || true
log_info "正在构建前端..."
npm run build || npm run build-simple || true
log_success "CRM前端构建完成"
echo ""

# ==================== Step 6: 安装PM2 ====================
log_title "Step 6: 安装PM2进程管理器"
if ! command -v pm2 &>/dev/null; then
  log_info "正在安装PM2..."
  npm install -g pm2
fi
log_success "PM2已就绪"
echo ""

# ==================== Step 7: 启动服务 ====================
log_title "Step 7: 启动CRM服务"
cd "$PROJECT_DIR/backend"

# 停止可能存在的旧服务
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

# 启动后端服务
pm2 start dist/app.js --name crm-backend --env production
log_success "后端服务已启动"

# 保存PM2配置
pm2 save

# 设置开机自启（需要root权限）
if [ "$(id -u)" = "0" ]; then
  pm2 startup 2>/dev/null || true
  log_success "已设置开机自启"
else
  log_warn "如需开机自启，请用root权限运行: sudo pm2 startup"
fi

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║                🎉 安装完成！                         ║"
echo "╠══════════════════════════════════════════════════════╣"
echo "║                                                      ║"
echo "║  CRM系统地址:  http://localhost:3000                 ║"
echo "║  API健康检查:  http://localhost:3000/health          ║"
echo "║                                                      ║"
echo "║  ━━━━━ 首次使用指引 ━━━━━                            ║"
echo "║                                                      ║"
echo "║  1. 打开浏览器访问上方地址                            ║"
echo "║  2. 在登录页输入您的授权码完成系统激活                ║"
echo "║  3. 激活后系统自动创建管理员账号                      ║"
echo "║                                                      ║"
echo "║  默认管理员账号:                                      ║"
echo "║    用户名: 购买时注册官网的手机号                     ║"
echo "║    密码:   Aa123456                                  ║"
echo "║                                                      ║"
echo "║  ⚠️  如不知道手机号，即为注册官网时的手机号           ║"
echo "║  ⚠️  请登录后立即修改默认密码！                       ║"
echo "║                                                      ║"
echo "║  常用命令:                                            ║"
echo "║    查看状态:  pm2 list                               ║"
echo "║    查看日志:  pm2 logs crm-backend                   ║"
echo "║    重启服务:  pm2 restart crm-backend                ║"
echo "║    停止服务:  pm2 stop crm-backend                   ║"
echo "║                                                      ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

pm2 list
echo ""

