@echo off
chcp 65001 >nul
echo ========================================
echo 第三阶段 - Admin后台管理 - 验收测试
echo ========================================
echo.

echo 【提示】请确保后端服务已启动 (npm run dev)
echo.
pause

echo.
echo ========================================
echo 开始运行综合测试...
echo ========================================
echo.

cd backend
node test-phase3-complete.js

echo.
echo ========================================
echo 测试完成！
echo ========================================
echo.
echo 请查看测试结果，如果全部通过，可以进行手动验收。
echo.
echo 手动验收步骤:
echo 1. 访问 http://localhost:5174
echo 2. 使用账号: admin / admin123
echo 3. 测试租户管理功能
echo 4. 测试租户配置功能
echo 5. 测试资源限制功能
echo.
pause
