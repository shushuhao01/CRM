#!/bin/bash

# CRM系统部署脚本 - 适用于CentOS 7 + 宝塔面板
# 域名: abc789.cn

echo "🚀 开始部署CRM系统到CentOS 7服务器..."

# 设置变量
DOMAIN="abc789.cn"
FRONTEND_PATH="/www/wwwroot/$DOMAIN"
BACKEND_PATH="/www/wwwroot/crm-backend"
PROJECT_ROOT="/root/CRM"
BACKUP_PATH="/www/backup/crm-$(date +%Y%m%d_%H%M%S)"

# 检查系统环境
echo "🔍 检查系统环境..."
if [ ! -f /etc/redhat-release ]; then
    echo "❌ 此脚本适用于CentOS系统"
    exit 1
fi

echo "✅ 系统: $(cat /etc/redhat-release)"

# 检查必要的服务
echo "🔧 检查必要服务..."
systemctl is-active --quiet nginx || echo "⚠️ Nginx未运行，请在宝塔面板启动"
systemctl is-active --quiet mysqld || systemctl is-active --quiet mariadb || echo "⚠️ MySQL/MariaDB未运行"

# 检查Node.js版本
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js版本: $NODE_VERSION"
    if [[ ${NODE_VERSION:1:2} -lt 16 ]]; then
        echo "⚠️ 建议使用Node.js 16+版本"
    fi
else
    echo "❌ 未找到Node.js，请先安装"
    exit 1
fi

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装PM2..."
    npm install -g pm2
fi

# 创建备份目录
echo "📦 创建备份..."
mkdir -p $BACKUP_PATH

# 备份现有文件（如果存在）
if [ -d "$FRONTEND_PATH" ]; then
    echo "备份前端文件..."
    cp -r $FRONTEND_PATH $BACKUP_PATH/frontend
fi

if [ -d "$BACKEND_PATH" ]; then
    echo "备份后端文件..."
    cp -r $BACKEND_PATH $BACKUP_PATH/backend
fi

# 部署前端
echo "🎨 部署前端到 $FRONTEND_PATH..."
mkdir -p $FRONTEND_PATH
cp -r $PROJECT_ROOT/dist/* $FRONTEND_PATH/

# 设置正确的文件权限 (CentOS 7)
if id "www" &>/dev/null; then
    chown -R www:www $FRONTEND_PATH
elif id "nginx" &>/dev/null; then
    chown -R nginx:nginx $FRONTEND_PATH
else
    chown -R root:root $FRONTEND_PATH
fi
chmod -R 755 $FRONTEND_PATH

# 部署后端
echo "⚙️ 部署后端..."
mkdir -p $BACKEND_PATH
cp -r $PROJECT_ROOT/backend/* $BACKEND_PATH/

# 设置后端文件权限
if id "www" &>/dev/null; then
    chown -R www:www $BACKEND_PATH
elif id "nginx" &>/dev/null; then
    chown -R nginx:nginx $BACKEND_PATH
else
    chown -R root:root $BACKEND_PATH
fi
chmod -R 755 $BACKEND_PATH

# 安装后端依赖
echo "📦 安装后端依赖..."
cd $BACKEND_PATH
npm install --production

# 创建必要目录
mkdir -p logs uploads/avatars
if id "www" &>/dev/null; then
    chown -R www:www logs uploads
elif id "nginx" &>/dev/null; then
    chown -R nginx:nginx logs uploads
fi
chmod -R 755 logs uploads

# 配置环境变量
if [ ! -f ".env" ]; then
    cp .env.production .env
    echo "⚠️ 请编辑 $BACKEND_PATH/.env 文件，配置数据库和其他环境变量"
fi

# 配置防火墙 (CentOS 7)
echo "🔥 配置防火墙..."
if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    echo "✅ 防火墙规则已添加"
fi

# 配置SELinux (如果启用)
if command -v getenforce &> /dev/null && [ "$(getenforce)" != "Disabled" ]; then
    echo "🔒 配置SELinux..."
    setsebool -P httpd_can_network_connect 1
    setsebool -P httpd_can_network_relay 1
    echo "✅ SELinux配置完成"
fi

# 启动后端服务
echo "🔄 启动后端服务..."
pm2 delete crm-api 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# 保存PM2配置
pm2 save
pm2 startup

# 设置开机自启动
echo "🔄 配置开机自启动..."
systemctl enable nginx
systemctl enable mysqld 2>/dev/null || systemctl enable mariadb 2>/dev/null

echo "✅ 部署完成！"
echo ""
echo "📋 部署信息："
echo "   系统: $(cat /etc/redhat-release)"
echo "   前端路径: $FRONTEND_PATH"
echo "   后端路径: $BACKEND_PATH"
echo "   备份路径: $BACKUP_PATH"
echo "   Node.js: $(node -v)"
echo "   PM2状态: $(pm2 -v)"
echo ""
echo "🔧 接下来需要："
echo "   1. 在宝塔面板配置数据库"
echo "   2. 编辑环境变量 ($BACKEND_PATH/.env)"
echo "   3. 在宝塔面板配置Nginx站点"
echo "   4. 测试访问"
echo ""
echo "🌐 访问地址: https://$DOMAIN"
echo "📊 PM2监控: pm2 monit"
echo "📝 查看日志: pm2 logs crm-api"