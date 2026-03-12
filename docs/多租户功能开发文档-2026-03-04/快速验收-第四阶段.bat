@echo off
chcp 65001 >nul
echo ========================================
echo 第四阶段 - 快速验收测试
echo ========================================
echo.
echo 📝 测试内容：
echo   - 任务 4.1: 租户数据导出
echo   - 任务 4.2: 租户数据导入
echo   - 任务 4.3: 租户操作日志
echo   - 任务 4.4: 性能优化
echo.
echo ⚠️  注意：请确保后端服务已重启！
echo.
pause

cd backend
echo.
echo 🚀 开始运行验收测试...
echo.
node test-phase4-complete.js

echo.
echo ========================================
echo 测试完成！
echo ========================================
pause
