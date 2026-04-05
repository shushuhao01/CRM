@echo off
chcp 65001 >nul
echo ==========================================
echo 三系统服务启动脚本
echo ==========================================
echo.

REM 检查Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装Node.js
    pause
    exit /b 1
)

REM 检查npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未安装npm
    pause
    exit /b 1
)

echo ✓ Node.js版本:
node -v
echo ✓ npm版本:
npm -v
echo.

REM 检查PM2
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未安装PM2，正在安装...
    call npm install -g pm2
)

echo ✓ PM2已安装
echo.

echo ==========================================
echo 1. 启动后端服务 (Backend)
echo ==========================================
cd /d "%~dp0backend"

if not exist ".env" (
    echo ⚠️  警告: backend\.env 文件不存在
    if exist ".env.production" (
        echo    使用 .env.production
        copy /y .env.production .env >nul
    )
)

echo 正在启动后端服务...
pm2 start npm --name "crm-backend" -- run start:prod 2>nul || pm2 restart crm-backend
echo ✓ 后端服务已启动
echo.

echo ==========================================
echo 2. 启动CRM前端 (Frontend)
echo ==========================================
cd /d "%~dp0"

if not exist ".env" (
    echo ⚠️  警告: .env 文件不存在
    if exist ".env.production" (
        echo    使用 .env.production
        copy /y .env.production .env >nul
    )
)

echo 正在启动CRM前端...
pm2 start npm --name "crm-frontend" -- run serve 2>nul || pm2 restart crm-frontend
echo ✓ CRM前端已启动
echo.

echo ==========================================
echo 3. 启动Admin后台 (Admin)
echo ==========================================
cd /d "%~dp0admin"

if not exist ".env" (
    echo ⚠️  警告: admin\.env 文件不存在
    if exist ".env.production" (
        echo    使用 .env.production
        copy /y .env.production .env >nul
    )
)

echo 正在启动Admin后台...
pm2 start npm --name "admin-frontend" -- run serve 2>nul || pm2 restart admin-frontend
echo ✓ Admin后台已启动
echo.

echo ==========================================
echo 4. 启动Website官网 (Website)
echo ==========================================
cd /d "%~dp0website"

if not exist ".env" (
    echo ⚠️  警告: website\.env 文件不存在
    if exist ".env.production" (
        echo    使用 .env.production
        copy /y .env.production .env >nul
    )
)

echo 正在启动Website官网...
pm2 start npm --name "website-frontend" -- run serve 2>nul || pm2 restart website-frontend
echo ✓ Website官网已启动
echo.

REM 保存PM2配置
pm2 save

cd /d "%~dp0"

echo ==========================================
echo 启动完成！
echo ==========================================
echo.

REM 显示服务状态
pm2 list

echo.
echo ==========================================
echo 服务访问地址
echo ==========================================
echo.
echo CRM系统前端:    http://localhost:8080
echo Admin后台:      http://localhost:8081
echo Website官网:    http://localhost:8082
echo 后端API:        http://localhost:3000
echo.
echo ==========================================
echo 常用命令
echo ==========================================
echo.
echo 查看服务状态:   pm2 list
echo 查看日志:       pm2 logs
echo 停止所有服务:   stop-all-services.bat
echo 重启所有服务:   restart-all-services.bat
echo.
pause
