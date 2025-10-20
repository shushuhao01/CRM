#!/bin/bash

# 宝塔面板Git冲突解决脚本
# 用于安全地解决代码更新冲突并保留重要配置

echo "=========================================="
echo "🔧 宝塔面板Git冲突解决工具"
echo "=========================================="

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误：请在项目根目录执行此脚本"
    exit 1
fi

echo "📍 当前目录: $(pwd)"
echo "🔍 检查Git状态..."

# 显示当前Git状态
git status

echo ""
echo "=========================================="
echo "📦 第一步：备份重要配置文件"
echo "=========================================="

# 创建备份目录
BACKUP_DIR="config_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 创建备份目录: $BACKUP_DIR"

# 备份重要配置文件
backup_files=(
    "backend/src/config/database.ts"
    ".env"
    "backend/.env"
    ".env.production"
    "backend/.env.production"
    "backend/src/config/config.ts"
)

for file in "${backup_files[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo "✅ 已备份: $file"
    else
        echo "⚠️  文件不存在: $file"
    fi
done

echo ""
echo "=========================================="
echo "🔄 第二步：解决Git冲突"
echo "=========================================="

echo "选择解决方案："
echo "1) 保存本地修改到stash，然后更新 (推荐)"
echo "2) 强制重置到远程版本 (会丢失本地修改)"
echo "3) 手动解决冲突"

read -p "请选择 (1/2/3): " choice

case $choice in
    1)
        echo "📦 保存本地修改到stash..."
        git stash push -m "宝塔面板自动备份 $(date)"
        
        echo "🔄 拉取最新代码..."
        git pull origin main
        
        if [ $? -eq 0 ]; then
            echo "✅ 代码更新成功！"
            
            echo "📋 查看stash列表："
            git stash list
            
            echo ""
            echo "💡 如需恢复之前的修改，请执行："
            echo "   git stash pop"
        else
            echo "❌ 代码更新失败，请检查网络连接"
            exit 1
        fi
        ;;
    2)
        echo "⚠️  警告：这将丢失所有本地修改！"
        read -p "确认继续？(y/N): " confirm
        
        if [[ $confirm =~ ^[Yy]$ ]]; then
            echo "🔄 强制重置到远程版本..."
            git reset --hard origin/main
            git pull origin main
            
            if [ $? -eq 0 ]; then
                echo "✅ 代码更新成功！"
            else
                echo "❌ 代码更新失败"
                exit 1
            fi
        else
            echo "❌ 操作已取消"
            exit 1
        fi
        ;;
    3)
        echo "📝 手动解决冲突指南："
        echo "1. 编辑冲突文件，解决冲突标记"
        echo "2. 执行: git add ."
        echo "3. 执行: git commit -m '解决冲突'"
        echo "4. 执行: git pull origin main"
        echo ""
        echo "冲突文件列表："
        git diff --name-only --diff-filter=U
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "🔧 第三步：恢复重要配置"
echo "=========================================="

# 恢复数据库配置
if [ -f "$BACKUP_DIR/database.ts" ]; then
    echo "🔄 恢复数据库配置..."
    cp "$BACKUP_DIR/database.ts" "backend/src/config/database.ts"
    echo "✅ 数据库配置已恢复"
fi

# 恢复环境变量
for env_file in ".env" "backend/.env" ".env.production" "backend/.env.production"; do
    if [ -f "$BACKUP_DIR/$(basename $env_file)" ]; then
        echo "🔄 恢复环境配置: $env_file"
        cp "$BACKUP_DIR/$(basename $env_file)" "$env_file"
        echo "✅ $env_file 已恢复"
    fi
done

echo ""
echo "=========================================="
echo "🚀 第四步：运行兼容性修复"
echo "=========================================="

if [ -f "bt-one-click-fix.sh" ]; then
    echo "🔧 运行Node.js 16兼容性修复..."
    chmod +x bt-one-click-fix.sh
    ./bt-one-click-fix.sh
else
    echo "⚠️  bt-one-click-fix.sh 不存在，跳过兼容性修复"
    
    echo "🔄 手动安装依赖..."
    
    # 前端依赖
    echo "📦 安装前端依赖..."
    npm install --legacy-peer-deps
    
    # 后端依赖
    echo "📦 安装后端依赖..."
    cd backend
    npm install --legacy-peer-deps
    cd ..
    
    echo "🏗️  构建前端..."
    npm run build
    
    echo "🏗️  构建后端..."
    cd backend
    npm run build
    cd ..
fi

echo ""
echo "=========================================="
echo "✅ 冲突解决完成！"
echo "=========================================="

echo "📋 操作总结："
echo "✅ 配置文件已备份到: $BACKUP_DIR"
echo "✅ 代码已更新到最新版本"
echo "✅ 重要配置已恢复"
echo "✅ 兼容性修复已完成"

echo ""
echo "📁 备份文件位置: $BACKUP_DIR"
echo "🔍 如需查看备份内容: ls -la $BACKUP_DIR"

echo ""
echo "🎉 现在可以重启服务并测试应用！"

# 显示最终状态
echo ""
echo "📊 最终Git状态："
git status --short

echo ""
echo "🔗 如需启动服务，请执行："
echo "   pm2 restart all"
echo "   或"
echo "   ./start.sh"