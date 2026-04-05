@echo off
chcp 65001 >nul
echo ==========================================
echo 重启所有服务
echo ==========================================
echo.

where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2未安装
    pause
    exit /b 1
)

echo 正在重启所有服务...
echo.

pm2 restart crm-backend 2>nul
pm2 restart crm-frontend 2>nul
pm2 restart admin-frontend 2>nul
pm2 restart website-frontend 2>nul

echo.
echo ✓ 所有服务已重启
echo.

pm2 list

echo.
echo 查看日志: pm2 logs
echo.
pause
