#!/bin/bash

# CentOS 7 环境准备脚本
# 为CRM系统部署准备服务器环境

echo "🔧 CentOS 7 环境准备开始..."

# 检查系统版本
if [ ! -f /etc/redhat-release ]; then
    echo "❌ 此脚本仅适用于CentOS系统"
    exit 1
fi

echo "✅ 系统版本: $(cat /etc/redhat-release)"

# 更新系统包
echo "📦 更新系统包..."
yum update -y

# 安装基础工具
echo "🛠️ 安装基础工具..."
yum install -y wget curl git vim unzip

# 安装Node.js (使用NodeSource仓库)
echo "📦 安装Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
    echo "✅ Node.js安装完成: $(node -v)"
else
    echo "✅ Node.js已安装: $(node -v)"
fi

# 安装PM2
echo "📦 安装PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo "✅ PM2安装完成: $(pm2 -v)"
else
    echo "✅ PM2已安装: $(pm2 -v)"
fi

# 检查MySQL/MariaDB
echo "🗄️ 检查数据库..."
if systemctl is-active --quiet mysqld; then
    echo "✅ MySQL服务运行中"
elif systemctl is-active --quiet mariadb; then
    echo "✅ MariaDB服务运行中"
else
    echo "⚠️ 数据库服务未运行，请在宝塔面板启动MySQL"
fi

# 检查Nginx
echo "🌐 检查Nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx服务运行中"
else
    echo "⚠️ Nginx服务未运行，请在宝塔面板启动Nginx"
fi

# 配置防火墙
echo "🔥 配置防火墙..."
if systemctl is-active --quiet firewalld; then
    echo "配置防火墙规则..."
    firewall-cmd --permanent --add-port=3000/tcp
    firewall-cmd --permanent --add-port=5173/tcp  # 开发端口
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    echo "✅ 防火墙配置完成"
else
    echo "⚠️ 防火墙未启用"
fi

# 配置SELinux
if command -v getenforce &> /dev/null; then
    SELINUX_STATUS=$(getenforce)
    echo "🔒 SELinux状态: $SELINUX_STATUS"
    
    if [ "$SELINUX_STATUS" != "Disabled" ]; then
        echo "配置SELinux策略..."
        setsebool -P httpd_can_network_connect 1
        setsebool -P httpd_can_network_relay 1
        setsebool -P httpd_execmem 1
        echo "✅ SELinux配置完成"
    fi
fi

# 创建必要目录
echo "📁 创建部署目录..."
mkdir -p /www/wwwroot
mkdir -p /www/backup
mkdir -p /www/logs

# 设置目录权限
if id "www" &>/dev/null; then
    chown -R www:www /www/wwwroot
    echo "✅ 目录权限设置完成 (www用户)"
elif id "nginx" &>/dev/null; then
    chown -R nginx:nginx /www/wwwroot
    echo "✅ 目录权限设置完成 (nginx用户)"
fi

# 检查磁盘空间
echo "💾 检查磁盘空间..."
df -h

# 检查内存
echo "🧠 检查内存..."
free -h

# 检查网络连接
echo "🌐 检查网络连接..."
ping -c 3 8.8.8.8 > /dev/null && echo "✅ 网络连接正常" || echo "⚠️ 网络连接异常"

# 设置时区
echo "🕐 设置时区..."
timedatectl set-timezone Asia/Shanghai
echo "✅ 时区设置为: $(timedatectl | grep 'Time zone')"

# 优化系统参数
echo "⚡ 优化系统参数..."
cat >> /etc/sysctl.conf << EOF

# CRM系统优化参数
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.core.netdev_max_backlog = 32768
net.ipv4.tcp_timestamps = 0
net.ipv4.tcp_synack_retries = 1
net.ipv4.tcp_syn_retries = 1
net.ipv4.tcp_tw_recycle = 1
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65000
EOF

sysctl -p

echo ""
echo "🎉 CentOS 7 环境准备完成！"
echo ""
echo "📋 环境信息："
echo "   系统: $(cat /etc/redhat-release)"
echo "   Node.js: $(node -v 2>/dev/null || echo '未安装')"
echo "   NPM: $(npm -v 2>/dev/null || echo '未安装')"
echo "   PM2: $(pm2 -v 2>/dev/null || echo '未安装')"
echo "   时区: $(timedatectl | grep 'Time zone' | awk '{print $3}')"
echo ""
echo "🔧 接下来可以："
echo "   1. 上传CRM系统文件"
echo "   2. 运行部署脚本: bash deploy.sh"
echo "   3. 在宝塔面板配置站点和数据库"
echo ""
echo "📊 系统监控命令："
echo "   - 查看服务状态: systemctl status nginx mysqld"
echo "   - 查看防火墙: firewall-cmd --list-all"
echo "   - 查看端口: netstat -tlnp"
echo "   - 查看进程: pm2 status"