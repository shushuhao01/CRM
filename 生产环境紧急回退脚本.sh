#!/bin/bash

# 生产环境紧急回退到 c2e9b1a 版本
# 执行时间: 2026-03-05
# 目标版本: c2e9b1a (CRM系统优化 - 修复4个关键问题)

echo "=========================================="
echo "生产环境紧急回退脚本"
echo "目标版本: c2e9b1a"
echo "=========================================="
echo ""

# 1. 进入后端目录
echo "步骤 1: 进入后端目录..."
cd /www/wwwroot/abc789.cn/backend || exit 1
echo "✓ 当前目录: $(pwd)"
echo ""

# 2. 查看当前版本
echo "步骤 2: 查看当前版本..."
echo "当前 commit:"
git log --oneline -1
echo ""

# 3. 停止服务
echo "步骤 3: 停止后端服务..."
pm2 stop crm-backend-api
echo "✓ 服务已停止"
echo ""

# 4. 备份当前状态（以防万一）
echo "步骤 4: 备份当前状态..."
BACKUP_DIR="/www/backup/backend-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /www/wwwroot/abc789.cn/backend "$BACKUP_DIR/"
echo "✓ 备份到: $BACKUP_DIR"
echo ""

# 5. 强制拉取远程代码
echo "步骤 5: 强制拉取远程代码..."
git fetch origin
git reset --hard origin/main
echo "✓ 代码已重置到 origin/main"
echo ""

# 6. 验证版本
echo "步骤 6: 验证版本..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)
echo "当前 commit: $CURRENT_COMMIT"
if [ "$CURRENT_COMMIT" = "c2e9b1a" ]; then
    echo "✓ 版本正确: c2e9b1a"
else
    echo "✗ 警告: 当前版本不是 c2e9b1a，而是 $CURRENT_COMMIT"
    echo "请检查 GitHub 仓库是否正确"
fi
echo ""

# 7. 检查问题文件是否存在
echo "步骤 7: 检查问题文件..."
if [ -f "src/routes/public/payment.ts" ]; then
    echo "✗ 警告: src/routes/public/payment.ts 仍然存在！"
    echo "这个文件不应该在 c2e9b1a 版本中"
else
    echo "✓ src/routes/public/payment.ts 不存在（正确）"
fi

if [ -f "src/controllers/admin/PaymentController.ts" ]; then
    echo "✗ 警告: src/controllers/admin/PaymentController.ts 仍然存在！"
else
    echo "✓ src/controllers/admin/PaymentController.ts 不存在（正确）"
fi
echo ""

# 8. 清除构建缓存
echo "步骤 8: 清除构建缓存..."
rm -rf dist
rm -rf node_modules/.cache
echo "✓ 缓存已清除"
echo ""

# 9. 重新安装依赖（可选，如果 package.json 有变化）
echo "步骤 9: 检查依赖..."
echo "如果需要重新安装依赖，请手动执行: npm install"
echo ""

# 10. 构建项目
echo "步骤 10: 构建项目..."
npm run build
BUILD_STATUS=$?
echo ""

if [ $BUILD_STATUS -eq 0 ]; then
    echo "✓ 构建成功！"
    echo ""
    
    # 11. 启动服务
    echo "步骤 11: 启动后端服务..."
    pm2 start crm-backend-api
    pm2 save
    echo "✓ 服务已启动"
    echo ""
    
    # 12. 查看服务状态
    echo "步骤 12: 查看服务状态..."
    pm2 status
    echo ""
    
    echo "=========================================="
    echo "✓ 回退完成！"
    echo "=========================================="
    echo ""
    echo "请验证："
    echo "1. 访问 CRM 系统，确认功能正常"
    echo "2. 查看 PM2 日志: pm2 logs crm-backend-api"
    echo "3. 如有问题，备份在: $BACKUP_DIR"
else
    echo "✗ 构建失败！"
    echo ""
    echo "请检查："
    echo "1. 当前 commit 是否是 c2e9b1a"
    echo "2. 查看构建错误信息"
    echo "3. 如需恢复，备份在: $BACKUP_DIR"
    echo ""
    echo "不启动服务，请手动排查问题"
fi
