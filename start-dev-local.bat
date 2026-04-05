@echo off
chcp 65001 >nul
echo ==========================================
echo 本地开发环境 - 三系统启动脚本
echo ==========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装Node.js
    pause
    exit /b 1
)

echo ✓ Node.js版本:
node -v
echo.

echo ==========================================
echo 启动说明
echo ==========================================
echo.
echo 本脚本将在4个独立的命令窗口中启动服务:
echo   1. 后端服务 (端口 3000)
echo   2. CRM前端 (端口 8080)
echo   3. Admin后台 (端口 8081)
echo   4. Website官网 (端口 8082)
echo.
echo 请保持所有窗口打开，关闭窗口将停止对应服务
echo.
pause

echo.
echo 正在启动服务...
echo.

REM 1. 启动后端服务
echo [1/4] 启动后端服务...
start "CRM后端服务" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak >nul

REM 2. 启动CRM前端
echo [2/4] 启动CRM前端...
start "CRM前端" cmd /k "cd /d %~dp0 && npm run serve"
timeout /t 2 /nobreak >nul

REM 3. 启动Admin后台
echo [3/4] 启动Admin后台...
start "Admin后台" cmd /k "cd /d %~dp0admin && npm run dev"
timeout /t 2 /nobreak >nul

REM 4. 启动Website官网
echo [4/4] 启动Website官网...
start "Website官网" cmd /k "cd /d %~dp0website && npm run dev"

echo.
echo ==========================================
echo 启动完成！
echo ==========================================
echo.
echo 服务访问地址:
echo   CRM前端:     http://localhost:8080
echo   Admin后台:   http://localhost:8081
echo   Website官网: http://localhost:8082
echo   后端API:     http://localhost:3000
echo.
echo 提示: 关闭对应的命令窗口可停止服务
echo.
pause
