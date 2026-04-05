#!/bin/bash

# 三系统服务状态检查脚本

echo "=========================================="
echo "三系统服务状态检查"
echo "=========================================="
echo ""

# 检查PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2未安装"
    echo ""
    echo "请先安装PM2: npm install -g pm2"
    exit 1
fi

# 显示PM2服务列表
echo "PM2服务状态:"
echo ""
pm2 list

echo ""
echo "=========================================="
echo "端口占用检查"
echo "=========================================="
echo ""

# 检查端口占用
check_port() {
    local port=$1
    local name=$2
    
    if command -v lsof &> /dev/null; then
        local pid=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$pid" ]; then
            echo "✓ $name (端口 $port): 运行中 (PID: $pid)"
        else
            echo "✗ $name (端口 $port): 未运行"
        fi
    elif command -v netstat &> /dev/null; then
        if netstat -tuln | grep -q ":$port "; then
            echo "✓ $name (端口 $port): 运行中"
        else
            echo "✗ $name (端口 $port): 未运行"
        fi
    else
        echo "⚠️  无法检查端口 $port (缺少 lsof 或 netstat)"
    fi
}

check_port 3000 "后端API"
check_port 8080 "CRM前端"
check_port 8081 "Admin后台"
check_port 8082 "Website官网"

echo ""
echo "=========================================="
echo "服务访问地址"
echo "=========================================="
echo ""
echo "CRM系统前端:    http://localhost:8080"
echo "Admin后台:      http://localhost:8081"
echo "Website官网:    http://localhost:8082"
echo "后端API:        http://localhost:3000"
echo ""

# 检查服务健康状态
echo "=========================================="
echo "服务健康检查"
echo "=========================================="
echo ""

check_health() {
    local url=$1
    local name=$2
    
    if command -v curl &> /dev/null; then
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "$url" | grep -q "200\|301\|302"; then
            echo "✓ $name: 正常"
        else
            echo "✗ $name: 无响应"
        fi
    else
        echo "⚠️  无法检查 $name (缺少 curl)"
    fi
}

check_health "http://localhost:3000/health" "后端API"
check_health "http://localhost:8080" "CRM前端"
check_health "http://localhost:8081" "Admin后台"
check_health "http://localhost:8082" "Website官网"

echo ""
echo "=========================================="
echo "系统资源使用"
echo "=========================================="
echo ""

# 显示PM2监控信息
pm2 monit --no-daemon 2>/dev/null &
MONIT_PID=$!
sleep 2
kill $MONIT_PID 2>/dev/null

echo ""
echo "详细监控: pm2 monit"
echo "查看日志: pm2 logs"
echo ""
