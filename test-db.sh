#!/bin/bash

# CRM系统数据库连接测试脚本
# 快速测试数据库配置和连接状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_title() {
    echo -e "${CYAN}$1${NC}"
}

# 显示标题
echo ""
log_title "=========================================="
log_title "    CRM系统数据库连接测试"
log_title "=========================================="
echo ""

# 检查环境
log_info "检查运行环境..."

# 检查Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js未安装，请先安装Node.js"
    exit 1
fi

log_success "Node.js版本: $(node -v)"

# 检查TypeScript
if ! command -v npx &> /dev/null; then
    log_error "npx未找到，请确保Node.js安装正确"
    exit 1
fi

# 检查项目目录
if [ ! -d "backend" ]; then
    log_error "请在CRM项目根目录运行此脚本"
    exit 1
fi

# 检查.env文件
ENV_FILE="./backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    log_error "数据库配置文件不存在: $ENV_FILE"
    log_info "请先运行数据库部署脚本: ./db-deploy.sh"
    log_info "或手动创建配置文件: cp backend/.env.database backend/.env"
    exit 1
fi

log_success "数据库配置文件已找到"

# 检查MySQL
if command -v mysql &> /dev/null; then
    log_success "MySQL已安装: $(mysql --version | head -n1)"
else
    log_warning "MySQL命令行工具未找到，但不影响测试"
fi

echo ""

# 进入后端目录
cd backend

# 检查依赖
log_info "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    log_info "安装项目依赖..."
    npm install
fi

# 编译TypeScript（如果需要）
log_info "编译测试脚本..."
if [ ! -d "dist" ]; then
    log_info "首次编译，可能需要一些时间..."
    npm run build
else
    # 只编译测试脚本
    npx tsc src/scripts/testDatabase.ts --outDir dist/scripts --target es2020 --module commonjs --esModuleInterop --skipLibCheck --resolveJsonModule
fi

# 运行数据库测试
log_info "运行数据库连接测试..."
echo ""

if node dist/scripts/testDatabase.js; then
    echo ""
    log_title "=========================================="
    log_success "数据库测试完成！"
    log_title "=========================================="
    echo ""
    log_info "如果测试通过，您可以："
    echo "1. 运行 './start.sh' 启动完整系统"
    echo "2. 运行 'cd backend && npm run dev' 启动后端服务"
    echo "3. 运行 'npm run dev' 启动前端开发服务器"
else
    echo ""
    log_title "=========================================="
    log_error "数据库测试失败！"
    log_title "=========================================="
    echo ""
    log_info "可能的解决方案："
    echo "1. 检查数据库服务是否运行"
    echo "2. 验证 backend/.env 中的数据库配置"
    echo "3. 运行 './db-deploy.sh' 重新部署数据库"
    echo "4. 检查MySQL用户权限"
    exit 1
fi

# 返回根目录
cd ..