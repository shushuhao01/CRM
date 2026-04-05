@echo off
chcp 65001 >nul
echo ==========================================
echo 本地开发环境 - 并发启动脚本
echo ==========================================
echo.

REM 检查concurrently
where concurrently >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未安装concurrently，正在安装...
    call npm install -g concurrently
)

echo ✓ 准备启动所有服务...
echo.
echo 服务将在同一窗口中运行
echo 按 Ctrl+C 可停止所有服务
echo.
pause

REM 使用concurrently同时启动所有服务
concurrently --kill-others --names "后端,CRM,Admin,Web" ^
  "cd backend && npm run dev" ^
  "npm run serve" ^
  "cd admin && npm run dev" ^
  "cd website && npm run dev"
