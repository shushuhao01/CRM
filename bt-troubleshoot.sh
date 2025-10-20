#!/bin/bash

# 🔍 宝塔面板 CRM 系统故障排除脚本
# 用于诊断和解决常见的部署问题

echo "🔍 CRM系统故障排除工具"
echo "=========================="
echo ""

# 检查基础环境
echo "📋 1. 检查基础环境"
echo "-------------------"

# Node.js版本
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js版本: $NODE_VERSION"
    
    # 检查是否为Node.js 16
    if [[ $NODE_VERSION == v16* ]]; then
        echo "✅ Node.js 16 检测通过"
    else
        echo "⚠️ 警告: 非Node.js 16版本，建议使用16.x"
    fi
else
    echo "❌ Node.js 未安装"
fi

# NPM版本
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ NPM版本: $NPM_VERSION"
else
    echo "❌ NPM 未安装"
fi

# PM2版本
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 -v)
    echo "✅ PM2版本: $PM2_VERSION"
else
    echo "⚠️ PM2 未安装"
fi

echo ""

# 检查项目文件
echo "📁 2. 检查项目文件"
echo "-------------------"

# 检查关键文件
files_to_check=(
    "package.json"
    "vite.config.node16.ts"
    "build-node16.sh"
    "bt-deploy-node16.sh"
    "backend/package.json"
    "backend/dist/app.js"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
    fi
done

# 检查目录
dirs_to_check=(
    "src"
    "backend/src"
    "backend/dist"
    "node_modules"
    "backend/node_modules"
)

for dir in "${dirs_to_check[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir/ 目录存在"
    else
        echo "❌ $dir/ 目录缺失"
    fi
done

echo ""

# 检查磁盘空间
echo "💾 3. 检查磁盘空间"
echo "-------------------"
df -h . | head -2

echo ""

# 检查内存使用
echo "🧠 4. 检查内存使用"
echo "-------------------"
free -h 2>/dev/null || echo "无法获取内存信息"

echo ""

# 检查端口占用
echo "🌐 5. 检查端口占用"
echo "-------------------"
if netstat -tlnp 2>/dev/null | grep :3000; then
    echo "✅ 端口3000已被占用"
else
    echo "⚠️ 端口3000未被占用"
fi

echo ""

# 检查PM2服务
echo "🚀 6. 检查PM2服务"
echo "-------------------"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "PM2 未安装"
fi

echo ""

# 检查NPM配置
echo "⚙️ 7. 检查NPM配置"
echo "-------------------"
echo "NPM镜像源: $(npm config get registry)"
echo "NPM缓存目录: $(npm config get cache)"

echo ""

# 提供修复建议
echo "🔧 8. 常见问题修复建议"
echo "========================"

echo ""
echo "🔨 如果前端构建失败："
echo "   1. 清理缓存: npm cache clean --force"
echo "   2. 删除依赖: rm -rf node_modules package-lock.json"
echo "   3. 重新安装: npm install --legacy-peer-deps"
echo "   4. 使用兼容构建: npm run build-node16"

echo ""
echo "🔨 如果后端启动失败："
echo "   1. 检查端口占用: netstat -tlnp | grep 3000"
echo "   2. 停止旧服务: pm2 delete crm-backend"
echo "   3. 重新启动: pm2 start backend/dist/app.js --name crm-backend"
echo "   4. 查看日志: pm2 logs crm-backend"

echo ""
echo "🔨 如果依赖安装失败："
echo "   1. 设置镜像源: npm config set registry https://registry.npmmirror.com"
echo "   2. 使用兼容模式: npm install --legacy-peer-deps"
echo "   3. 强制安装: npm install --force"

echo ""
echo "🔨 如果内存不足："
echo "   1. 设置Node.js内存: export NODE_OPTIONS=\"--max-old-space-size=4096\""
echo "   2. 清理系统缓存: sync && echo 3 > /proc/sys/vm/drop_caches"

echo ""
echo "🔨 快速修复命令："
echo "   chmod +x bt-deploy-node16.sh && ./bt-deploy-node16.sh"

echo ""
echo "📞 如果问题仍然存在，请："
echo "   1. 截图保存错误信息"
echo "   2. 运行: pm2 logs crm-backend > error.log"
echo "   3. 联系技术支持并提供 error.log 文件"

echo ""
echo "✨ 故障排除完成！"