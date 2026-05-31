#!/bin/bash
# ====================================
# 诊断"权限不足"和"加载数据失败"问题
# 在服务器上执行此脚本
# ====================================

echo "====== 1. PM2 进程状态 ======"
pm2 list

echo ""
echo "====== 2. 最近50行后端日志（查找403错误）======"
pm2 logs crm-backend --lines 50 --nostream 2>/dev/null || pm2 logs 0 --lines 50 --nostream

echo ""
echo "====== 3. 搜索权限不足相关日志 ======"
echo "--- 最近的403错误和角色检查 ---"
pm2 logs crm-backend --lines 500 --nostream 2>/dev/null | grep -i "权限\|403\|INSUFFICIENT\|角色.*sales_staff\|requireRole\|尝试访问" | tail -20

echo ""
echo "====== 4. 检查代码是否是最新版本 ======"
echo "--- 检查 users.ts 是否包含 sales_staff ---"
grep -n "sales_staff" backend/src/routes/users.ts 2>/dev/null || echo "❌ 文件未找到或未包含修复"

echo "--- 检查 systemSettings.ts departments/stats 是否移除了 requireAdmin ---"
grep -n "departments/stats" backend/src/routes/system/systemSettings.ts 2>/dev/null | head -3

echo ""
echo "====== 5. 建议操作 ======"
echo "如果代码已更新但问题仍在，执行："
echo "  pm2 restart crm-backend   (或你的后端进程名)"
echo "  pm2 restart all            (重启所有进程)"
echo ""
echo "如果代码未更新，执行："
echo "  cd /你的项目目录 && git pull origin main"
echo "  npm run build              (如果需要编译)"
echo "  pm2 restart crm-backend"
