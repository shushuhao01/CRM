@echo off
chcp 65001 >nul
echo ==========================================
echo 停止所有服务
echo ==========================================
echo.

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2未安装
    pause
    exit /b 1
)

echo 正在停止所有服务...
echo.

pm2 stop crm-backend 2>nul
pm2 stop crm-frontend 2>nul
pm2 stop admin-frontend 2>nul
pm2 stop website-frontend 2>nul

echo.
echo ✓ 所有服务已停止
echo.

pm2 list

echo.
echo 如需完全删除服务，请运行:
echo   pm2 delete all
echo.
pause
