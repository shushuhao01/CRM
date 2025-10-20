#!/bin/bash

# CRM系统数据库一键部署脚本
# 适用于宝塔面板 + MySQL环境
# 支持Node.js 22

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# 显示脚本标题
echo -e "${BLUE}"
echo "=================================================="
echo "    CRM系统数据库一键部署脚本 v2.0"
echo "    支持Node.js 22 + MySQL 8.0+"
echo "    适用于宝塔面板环境"
echo "=================================================="
echo -e "${NC}"

# 检查是否为root用户
if [[ $EUID -eq 0 ]]; then
   log_warning "检测到root用户，建议使用普通用户运行此脚本"
fi

# 检查MySQL是否安装
if ! command -v mysql &> /dev/null; then
    log_error "MySQL未安装或未添加到PATH，请先在宝塔面板安装MySQL"
    exit 1
fi

log_success "MySQL已安装，版本信息："
mysql --version

# 获取数据库配置信息
echo ""
log_info "请输入数据库配置信息："

# 数据库主机
read -p "数据库主机 (默认: localhost): " DB_HOST
DB_HOST=${DB_HOST:-localhost}

# 数据库端口
read -p "数据库端口 (默认: 3306): " DB_PORT
DB_PORT=${DB_PORT:-3306}

# 数据库名称
read -p "数据库名称 (默认: crm_system): " DB_NAME
DB_NAME=${DB_NAME:-crm_system}

# 数据库用户名
read -p "数据库用户名 (默认: root): " DB_USER
DB_USER=${DB_USER:-root}

# 数据库密码
read -s -p "数据库密码: " DB_PASSWORD
echo ""

# 确认配置信息
echo ""
log_info "数据库配置确认："
echo "主机: $DB_HOST"
echo "端口: $DB_PORT"
echo "数据库: $DB_NAME"
echo "用户: $DB_USER"
echo "密码: [已隐藏]"
echo ""

read -p "确认以上配置正确吗？(y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    log_warning "用户取消操作"
    exit 0
fi

# 测试数据库连接
log_info "测试数据库连接..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1;" &> /dev/null; then
    log_success "数据库连接测试成功"
else
    log_error "数据库连接失败，请检查配置信息"
    exit 1
fi

# 检查数据库是否存在
log_info "检查数据库 '$DB_NAME' 是否存在..."
DB_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SHOW DATABASES LIKE '$DB_NAME';" | grep "$DB_NAME" || true)

if [ -n "$DB_EXISTS" ]; then
    log_warning "数据库 '$DB_NAME' 已存在"
    read -p "是否要删除现有数据库并重新创建？(y/N): " recreate
    if [[ $recreate =~ ^[Yy]$ ]]; then
        log_info "删除现有数据库..."
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE \`$DB_NAME\`;"
        log_success "数据库已删除"
    else
        log_info "将在现有数据库中执行SQL脚本"
    fi
fi

# 创建数据库
if [ -z "$DB_EXISTS" ] || [[ $recreate =~ ^[Yy]$ ]]; then
    log_info "创建数据库 '$DB_NAME'..."
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    log_success "数据库创建成功"
fi

# 检查SQL脚本文件
SQL_FILE="./backend/database-init.sql"
if [ ! -f "$SQL_FILE" ]; then
    log_error "SQL脚本文件不存在: $SQL_FILE"
    log_info "请确保在项目根目录运行此脚本"
    exit 1
fi

# 执行SQL脚本
log_info "执行数据库初始化脚本..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$SQL_FILE"; then
    log_success "数据库初始化完成"
else
    log_error "数据库初始化失败"
    exit 1
fi

# 验证表创建
log_info "验证数据库表创建..."
TABLE_COUNT=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;" | wc -l)
if [ "$TABLE_COUNT" -gt 1 ]; then
    log_success "数据库表创建成功，共创建 $((TABLE_COUNT-1)) 个表"
    
    # 显示创建的表
    log_info "已创建的表："
    mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"
else
    log_error "数据库表创建失败"
    exit 1
fi

# 创建或更新.env文件
ENV_FILE="./backend/.env"
log_info "更新环境配置文件..."

# 备份现有.env文件
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "${ENV_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
    log_info "已备份现有.env文件"
fi

# 生成新的.env文件
cat > "$ENV_FILE" << EOF
# CRM系统环境配置
# 由数据库部署脚本自动生成 $(date)

# 服务器配置
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1

# 数据库配置 (MySQL)
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USERNAME=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_DATABASE=$DB_NAME
DB_CHARSET=utf8mb4
DB_TIMEZONE=+08:00

# JWT配置
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# 加密配置
BCRYPT_ROUNDS=12

# CORS配置
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# 文件上传配置
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf

# 邮件配置（请根据需要修改）
MAIL_HOST=smtp.qq.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your_email@qq.com
MAIL_PASS=your_email_password
MAIL_FROM=CRM系统 <your_email@qq.com>

# 日志配置
LOG_LEVEL=info
LOG_MAX_SIZE=20m
LOG_MAX_FILES=14d

# 限流配置
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# 安全配置
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
EOF

log_success "环境配置文件已更新: $ENV_FILE"

# 测试数据库连接（使用新配置）
log_info "使用新配置测试数据库连接..."
if mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SELECT COUNT(*) as user_count FROM users;" &> /dev/null; then
    log_success "数据库连接测试成功，默认管理员用户已创建"
else
    log_error "数据库连接测试失败"
    exit 1
fi

# 显示部署结果
echo ""
echo -e "${GREEN}"
echo "=================================================="
echo "    数据库部署完成！"
echo "=================================================="
echo -e "${NC}"

log_success "数据库部署成功完成！"
echo ""
log_info "部署信息："
echo "• 数据库名称: $DB_NAME"
echo "• 数据库主机: $DB_HOST:$DB_PORT"
echo "• 配置文件: $ENV_FILE"
echo "• SQL脚本: $SQL_FILE"
echo ""
log_info "默认管理员账户："
echo "• 用户名: admin"
echo "• 密码: admin123"
echo "• 邮箱: admin@crm.com"
echo ""
log_warning "重要提醒："
echo "1. 请及时修改默认管理员密码"
echo "2. 请根据需要配置邮件服务器信息"
echo "3. 生产环境请修改JWT_SECRET"
echo "4. 建议定期备份数据库"
echo ""
log_info "下一步："
echo "1. 运行 './start.sh' 启动完整的CRM系统"
echo "2. 或者单独启动后端: 'cd backend && npm run dev'"
echo ""

# 询问是否立即启动系统
read -p "是否立即运行完整系统部署？(y/N): " start_system
if [[ $start_system =~ ^[Yy]$ ]]; then
    log_info "启动完整系统部署..."
    if [ -f "./start.sh" ]; then
        chmod +x ./start.sh
        ./start.sh
    else
        log_error "start.sh文件不存在，请手动启动系统"
    fi
fi

log_success "数据库部署脚本执行完成！"