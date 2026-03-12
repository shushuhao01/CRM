#!/bin/bash

# 生产环境强制清理并回退脚本
# 这个脚本会彻底清理所有未跟踪的文件和目录

echo "=========================================="
echo "生产环境强制清理脚本"
echo "警告：这将删除所有未跟踪的文件！"
echo "=========================================="
echo ""

# 进入后端目录
cd /www/wwwroot/abc789.cn/backend || exit 1

# 1. 停止服务
echo "步骤 1: 停止服务..."
pm2 stop crm-backend-api
echo ""

# 2. 查看当前状态
echo "步骤 2: 查看当前状态..."
echo "当前 commit:"
git log --oneline -1
echo ""
echo "Git 状态:"
git status --short
echo ""

# 3. 清理所有未跟踪的文件和目录
echo "步骤 3: 清理所有未跟踪的文件..."
echo "警告：即将删除所有未跟踪的文件和目录！"
echo "按 Ctrl+C 取消，或等待 5 秒继续..."
sleep 5

# 删除所有未跟踪的文件和目录（包括被 .gitignore 忽略的）
git clean -fdx

echo "✓ 清理完成"
echo ""

# 4. 重置到远程状态
echo "步骤 4: 重置到远程状态..."
git fetch origin
git reset --hard origin/main
echo "✓ 重置完成"
echo ""

# 5. 验证版本
echo "步骤 5: 验证版本..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "当前 commit: $CURRENT_COMMIT"
git log --oneline -1
echo ""

# 6. 检查问题文件
echo "步骤 6: 检查问题文件..."
PROBLEM_FILES=(
    "src/routes/public/payment.ts"
    "src/controllers/admin/PaymentController.ts"
    "src/services/PaymentService.ts"
    "src/entities/PaymentOrder.ts"
    "src/entities/PaymentLog.ts"
    "src/entities/PaymentConfig.ts"
)

HAS_PROBLEM=0
for file in "${PROBLEM_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✗ 警告: $file 仍然存在！"
        HAS_PROBLEM=1
    else
        echo "✓ $file 不存在（正确）"
    fi
done
echo ""

if [ $HAS_PROBLEM -eq 1 ]; then
    echo "✗ 仍然有问题文件存在！"
    echo "请手动检查这些文件是否在 Git 仓库中"
    echo ""
    echo "检查命令："
    echo "git ls-tree -r HEAD --name-only | grep payment"
    echo ""
    exit 1
fi

# 7. 清除构建缓存
echo "步骤 7: 清除构建缓存..."
rm -rf dist
rm -rf node_modules/.cache
echo "✓ 缓存已清除"
echo ""

# 8. 构建项目
echo "步骤 8: 构建项目..."
npm run build
BUILD_STATUS=$?
echo ""

if [ $BUILD_STATUS -eq 0 ]; then
    echo "✓ 构建成功！"
    echo ""
    
    # 9. 启动服务
    echo "步骤 9: 启动服务..."
    pm2 start crm-backend-api
    pm2 save
    echo "✓ 服务已启动"
    echo ""
    
    # 10. 查看服务状态
    echo "步骤 10: 查看服务状态..."
    pm2 status
    echo ""
    
    echo "=========================================="
    echo "✓ 清理和回退完成！"
    echo "=========================================="
else
    echo "✗ 构建失败！"
    echo ""
    echo "请检查构建错误信息"
    echo "可能需要在本地重新检查 GitHub 仓库状态"
fi
