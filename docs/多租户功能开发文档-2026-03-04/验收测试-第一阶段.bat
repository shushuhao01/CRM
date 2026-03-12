@echo off
chcp 65001 >nul
echo.
echo ========================================
echo 第一阶段验收测试 - 一键运行
echo ========================================
echo.
echo 正在编译TypeScript...
cd backend
call npm run build
echo.
echo 编译完成！开始运行测试...
echo.
node run-phase1-tests.js
echo.
pause
