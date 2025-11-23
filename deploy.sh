#!/bin/bash

# ========================================
# CRM系统一键部署脚本（分步式构建版）
# 适用于：2GB+ 内存服务器
# 特点：分步执行，每步都有明确提示和进度显示
# ========================================

# 遇到错误不立即退出，而是显示错误信息
set +e

echo "=========================================="
echo "🚀 CRM系统一键部署脚本（分步式构建）"
echo "=========================================="
echo ""
echo "💡 本脚本将分8个步骤完成部署"
echo "💡 每个步骤都会显示进度和结果"
echo "💡 预计总耗时：20-30分钟"
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 步骤计数器
CURRENT_STEP=0
TOTAL_STEPS=8

# 显示步骤标题的函数
show_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo "=========================================="
    echo -e "${CYAN}📍 步骤 ${CURRENT_STEP}/${TOTAL_STEPS}: $1${NC}"
    echo "=========================================="
    echo ""
}

# 显示成功消息的函数
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 显示警告消息的函数
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 显示错误消息的函数
show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 显示信息消息的函数
show_info() {
    echo -e "${BLUE}💡 $1${NC}"
}

# 显示进度的函数
show_progress() {
    echo -e "${CYAN}⏳ $1${NC}"
}

# ========================================
# 步骤 1：环境检查
# ========================================
show_step "环境检查"

echo "检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    show_error "未检测到 Node.js"
    echo "请先安装 Node.js 16.x 或更高版本"
    exit 1
fi

NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_MAJOR" -lt 16 ]; then
    show_error "Node.js 版本过低: $NODE_VERSION"
    echo "需要 16.x 或更高版本"
    exit 1
fi
show_success "Node.js 版本: $NODE_VERSION"

echo ""
echo "检查系统内存..."
TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
show_info "系统内存: ${TOTAL_MEM}MB"

# 根据内存设置 Node.js 内存限制
if [ "$TOTAL_MEM" -lt 3000 ]; then
    export NODE_OPTIONS="--max-old-space-size=1536"
    show_warning "检测到低内存环境（2GB），已优化构建配置"
    show_info "Node.js 内存限制: 1.5GB"
elif [ "$TOTAL_MEM" -lt 5000 ]; then
    export NODE_OPTIONS="--max-old-space-size=3072"
    show_info "Node.js 内存限制: 3GB"
else
    export NODE_OPTIONS="--max-old-space-size=4096"
    show_info "Node.js 内存限制: 4GB"
fi

echo ""
echo "检查磁盘空间..."
DISK_AVAIL=$(df -BG . | tail -1 | awk '{print $4}' | sed 's/G//')
if [ "$DISK_AVAIL" -lt 5 ]; then
    show_warning "磁盘可用空间不足 5GB，可能影响部署"
else
    show_success "磁盘可用空间: ${DISK_AVAIL}GB"
fi

show_success "环境检查完成"
sleep 2

# ========================================
# 步骤 2：配置文件检查
# ========================================
show_step "配置文件检查"

echo "检查后端配置文件..."
if [ ! -f "backend/.env" ]; then
    show_warning "未找到 backend/.env 文件"
    if [ -f "backend/.env.example" ]; then
        echo "正在从 .env.example 创建 .env..."
        cp backend/.env.example backend/.env
        show_success "已创建 backend/.env"
        echo ""
        show_warning "重要：请编辑 backend/.env 文件，填写以下信息："
        echo "  - DB_USERNAME (数据库用户名)"
        echo "  - DB_PASSWORD (数据库密码)"
        echo "  - DB_DATABASE (数据库名)"
        echo "  - JWT_SECRET (随机密钥)"
        echo ""
        echo "按回车继续（确保已配置好）..."
        read
    else
        show_error "找不到 backend/.env.example"
        exit 1
    fi
else
    show_success "backend/.env 已存在"
    # 检查关键配置
    if grep -q "your_strong_password_here" backend/.env; then
        show_warning "检测到默认密码，请修改 backend/.env 中的数据库密码"
    fi
fi

echo ""
echo "检查前端配置文件..."
if [ ! -f ".env.production" ]; then
    show_info "创建默认前端配置..."
    cat > .env.production << 'EOF'
VITE_API_BASE_URL=/api
VITE_APP_TITLE=CRM管理系统
NODE_ENV=production
VITE_USE_REAL_API=true
EOF
    show_success "已创建 .env.production"
else
    show_success ".env.production 已存在"
fi

show_success "配置文件检查完成"
sleep 2

# ========================================
# 步骤 3：配置 npm 镜像
# ========================================
show_step "配置 npm 镜像加速"

echo "配置淘宝镜像..."
npm config set registry https://registry.npmmirror.com

echo "验证镜像配置..."
REGISTRY=$(npm config get registry)
if [[ "$REGISTRY" == *"npmmirror"* ]] || [[ "$REGISTRY" == *"taobao"* ]]; then
    show_success "npm 镜像配置成功: $REGISTRY"
else
    show_warning "镜像配置可能未生效: $REGISTRY"
fi

sleep 1

# ========================================
# 步骤 4：安装前端依赖
# ========================================
show_step "安装前端依赖"

if [ -d "node_modules" ]; then
    show_info "node_modules 目录已存在"
    echo "是否重新安装？(y/N)"
    read -t 10 -n 1 REINSTALL
    echo ""
    if [[ "$REINSTALL" =~ ^[Yy]$ ]]; then
        show_info "删除旧依赖..."
        rm -rf node_modules package-lock.json
    else
        show_success "跳过前端依赖安装"
        sleep 1
        CURRENT_STEP=$((CURRENT_STEP + 1))
        show_step "安装后端依赖"
        cd backend
        if [ -d "node_modules" ]; then
            show_success "跳过后端依赖安装"
        else
            show_progress "安装后端依赖中（仅生产环境）..."
            npm install --production --legacy-peer-deps
            if [ $? -eq 0 ]; then
                show_success "后端依赖安装完成"
            else
                show_error "后端依赖安装失败"
                exit 1
            fi
        fi
        cd ..
        sleep 1
        # 跳到构建步骤
        CURRENT_STEP=5
        show_step "构建前端项目"
        show_progress "清理旧的构建缓存..."
        rm -rf node_modules/.vite 2>/dev/null || true
        rm -rf dist 2>/dev/null || true
        
        show_progress "开始构建前端（这可能需要 5-10 分钟）..."
        show_info "构建过程中请勿关闭终端"
        
        # 显示构建进度提示
        (
            sleep 30 && echo "⏳ 构建进行中... 已过 30 秒" &
            sleep 60 && echo "⏳ 构建进行中... 已过 1 分钟" &
            sleep 120 && echo "⏳ 构建进行中... 已过 2 分钟" &
            sleep 180 && echo "⏳ 构建进行中... 已过 3 分钟" &
            sleep 300 && echo "⏳ 构建进行中... 已过 5 分钟" &
            sleep 600 && echo "⚠️  构建时间较长，已过 10 分钟" &
        ) &
        PROGRESS_PID=$!
        
        npm run build
        BUILD_RESULT=$?
        
        # 停止进度提示
        kill $PROGRESS_PID 2>/dev/null || true
        
        if [ $BUILD_RESULT -ne 0 ]; then
            show_error "前端构建失败"
            show_info "可能的解决方案："
            echo "  1. 增加 Swap 虚拟内存"
            echo "  2. 使用简化构建: npm run build -- --minify false"
            echo "  3. 使用本地构建方案（查看：本地构建部署指南.md）"
            exit 1
        fi
        
        if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
            show_error "构建文件不完整"
            exit 1
        fi
        
        show_success "前端构建完成"
        echo "构建文件大小："
        du -sh dist/
        sleep 2
        
        # 跳到启动服务
        CURRENT_STEP=6
        show_step "启动后端服务"
        cd backend
        
        show_info "检查 PM2..."
        if ! command -v pm2 &> /dev/null; then
            show_warning "PM2 未安装，正在安装..."
            npm install -g pm2
        fi
        
        show_info "停止旧服务..."
        pm2 stop crm-backend 2>/dev/null || true
        pm2 delete crm-backend 2>/dev/null || true
        
        show_progress "启动新服务..."
        pm2 start npm --name "crm-backend" -- start
        
        if [ $? -eq 0 ]; then
            show_success "后端服务启动成功"
        else
            show_error "后端服务启动失败"
            show_info "查看日志: pm2 logs crm-backend"
            exit 1
        fi
        
        pm2 save
        pm2 startup 2>/dev/null || true
        
        cd ..
        
        echo ""
        show_info "服务状态："
        pm2 list
        
        sleep 2
        
        # 显示完成信息
        echo ""
        echo "=========================================="
        echo -e "${GREEN}✅ 部署完成！${NC}"
        echo "=========================================="
        echo ""
        show_success "所有步骤已完成"
        echo ""
        echo "📊 服务状态:"
        pm2 list
        echo ""
        echo "📝 常用命令:"
        echo "  查看日志: pm2 logs crm-backend"
        echo "  重启服务: pm2 restart crm-backend"
        echo "  停止服务: pm2 stop crm-backend"
        echo ""
        echo "🌐 下一步:"
        echo "  1. 配置 Nginx（如果还没配置）"
        echo "  2. 访问网站: http://您的域名或IP"
        echo "  3. 使用预设账号登录: superadmin / super123456"
        echo ""
        show_success "🎉 部署成功！"
        echo ""
        exit 0
    fi
fi

show_progress "安装前端依赖中（预计 5-8 分钟）..."
show_info "正在下载依赖包，请耐心等待..."

npm install --legacy-peer-deps

if [ $? -eq 0 ]; then
    show_success "前端依赖安装完成"
    echo "已安装包数量: $(ls node_modules 2>/dev/null | wc -l)"
else
    show_error "前端依赖安装失败"
    show_info "尝试清理后重新安装..."
    rm -rf node_modules package-lock.json
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        show_error "重新安装仍然失败"
        exit 1
    fi
fi

sleep 2

# ========================================
# 步骤 5：安装后端依赖
# ========================================
show_step "安装后端依赖"

cd backend

if [ -d "node_modules" ]; then
    show_info "backend/node_modules 已存在，跳过安装"
else
    show_progress "安装后端依赖中（仅生产环境，预计 3-5 分钟）..."
    npm install --production --legacy-peer-deps
    
    if [ $? -eq 0 ]; then
        show_success "后端依赖安装完成"
        echo "已安装包数量: $(ls node_modules 2>/dev/null | wc -l)"
    else
        show_error "后端依赖安装失败"
        cd ..
        exit 1
    fi
fi

cd ..
sleep 2

# ========================================
# 步骤 6：构建前端（关键步骤）
# ========================================
show_step "构建前端项目"

show_warning "这是最关键的步骤，可能需要 5-10 分钟"
show_info "如果超过 15 分钟没反应，可以按 Ctrl+C 取消"

echo ""
show_progress "清理旧的构建缓存..."
rm -rf node_modules/.vite 2>/dev/null || true
rm -rf dist 2>/dev/null || true

echo ""
show_progress "开始构建前端..."
show_info "构建过程中请勿关闭终端"
echo ""

# 显示构建进度提示
(
    sleep 30 && echo "⏳ 构建进行中... 已过 30 秒"
    sleep 30 && echo "⏳ 构建进行中... 已过 1 分钟"
    sleep 60 && echo "⏳ 构建进行中... 已过 2 分钟"
    sleep 60 && echo "⏳ 构建进行中... 已过 3 分钟"
    sleep 120 && echo "⏳ 构建进行中... 已过 5 分钟"
    sleep 300 && echo "⚠️  构建时间较长，已过 10 分钟，请继续等待..."
) &
PROGRESS_PID=$!

npm run build
BUILD_RESULT=$?

# 停止进度提示
kill $PROGRESS_PID 2>/dev/null || true

echo ""
if [ $BUILD_RESULT -ne 0 ]; then
    show_error "前端构建失败"
    echo ""
    show_info "可能的解决方案："
    echo "  1. 增加 Swap 虚拟内存"
    echo "  2. 使用简化构建: npm run build -- --minify false"
    echo "  3. 使用本地构建方案（查看：本地构建部署指南.md）"
    exit 1
fi

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    show_error "构建文件不完整"
    exit 1
fi

show_success "前端构建完成"
echo "构建文件大小:"
du -sh dist/
sleep 2

# ========================================
# 步骤 7：启动后端服务
# ========================================
show_step "启动后端服务"

cd backend

show_info "检查 PM2..."
if ! command -v pm2 &> /dev/null; then
    show_warning "PM2 未安装，正在安装..."
    npm install -g pm2
    if [ $? -eq 0 ]; then
        show_success "PM2 安装完成"
    else
        show_error "PM2 安装失败"
        cd ..
        exit 1
    fi
fi

show_info "停止旧服务..."
pm2 stop crm-backend 2>/dev/null || true
pm2 delete crm-backend 2>/dev/null || true

show_progress "启动新服务..."
pm2 start npm --name "crm-backend" -- start

if [ $? -eq 0 ]; then
    show_success "后端服务启动成功"
else
    show_error "后端服务启动失败"
    show_info "查看日志: pm2 logs crm-backend"
    cd ..
    exit 1
fi

show_info "保存 PM2 配置..."
pm2 save

show_info "设置开机自启..."
pm2 startup 2>/dev/null || true

cd ..

echo ""
show_info "服务状态："
pm2 list

show_success "后端服务启动完成"
sleep 2

# ========================================
# 步骤 8：部署完成提示
# ========================================
show_step "部署完成"

echo ""
echo "=========================================="
echo -e "${GREEN}✅ 所有步骤已完成！${NC}"
echo "=========================================="
echo ""

show_success "部署成功！"
echo ""

echo "📊 服务状态:"
pm2 list

echo ""
echo "📝 常用命令:"
echo "  查看日志: pm2 logs crm-backend"
echo "  重启服务: pm2 restart crm-backend"
echo "  停止服务: pm2 stop crm-backend"
echo "  查看状态: pm2 list"

echo ""
echo "🌐 访问地址:"
echo "  前端: http://您的域名或IP"
echo "  API: http://您的域名或IP/api/v1/health"

echo ""
echo "💡 下一步操作:"
echo "  1. 配置 Nginx（如果还没配置）"
echo "     - 创建网站，根目录指向: /www/wwwroot/CRM/dist"
echo "     - 配置反向代理: http://127.0.0.1:3000"
echo "  2. 访问网站测试功能"
echo "  3. 使用预设账号登录:"
echo "     - 超级管理员: superadmin / super123456"
echo "     - 管理员: admin / admin123"

echo ""
show_success "🎉 部署成功！祝使用愉快！"
echo ""
