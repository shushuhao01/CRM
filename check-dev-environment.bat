@echo off
chcp 65001 >nul
echo ==========================================
echo 本地开发环境检查
echo ==========================================
echo.

set ERROR_COUNT=0

REM 检查Node.js
echo [1/8] 检查Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Node.js已安装
    node -v
) else (
    echo ✗ Node.js未安装
    set /a ERROR_COUNT+=1
)
echo.

REM 检查npm
echo [2/8] 检查npm...
where npm >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ npm已安装
    npm -v
) else (
    echo ✗ npm未安装
    set /a ERROR_COUNT+=1
)
echo.

REM 检查MySQL
echo [3/8] 检查MySQL...
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ MySQL已安装
    mysql --version
) else (
    echo ⚠️  MySQL未找到（可能未添加到PATH）
)
echo.

REM 检查项目依赖
echo [4/8] 检查后端依赖...
if exist "%~dp0backend\node_modules" (
    echo ✓ 后端依赖已安装
) else (
    echo ✗ 后端依赖未安装
    set /a ERROR_COUNT+=1
)
echo.

echo [5/8] 检查CRM前端依赖...
if exist "%~dp0node_modules" (
    echo ✓ CRM前端依赖已安装
) else (
    echo ✗ CRM前端依赖未安装
    set /a ERROR_COUNT+=1
)
echo.

echo [6/8] 检查Admin后台依赖...
if exist "%~dp0admin\node_modules" (
    echo ✓ Admin后台依赖已安装
) else (
    echo ✗ Admin后台依赖未安装
    set /a ERROR_COUNT+=1
)
echo.

echo [7/8] 检查Website官网依赖...
if exist "%~dp0website\node_modules" (
    echo ✓ Website官网依赖已安装
) else (
    echo ✗ Website官网依赖未安装
    set /a ERROR_COUNT+=1
)
echo.

REM 检查环境变量文件
echo [8/8] 检查环境变量文件...
if exist "%~dp0backend\.env" (
    echo ✓ backend/.env 存在
) else (
    echo ⚠️  backend/.env 不存在
)

if exist "%~dp0.env.development" (
    echo ✓ .env.development 存在
) else (
    echo ⚠️  .env.development 不存在
)

if exist "%~dp0admin\.env.development" (
    echo ✓ admin/.env.development 存在
) else (
    echo ⚠️  admin/.env.development 不存在
)

if exist "%~dp0website\.env.development" (
    echo ✓ website/.env.development 存在
) else (
    echo ⚠️  website/.env.development 不存在
)
echo.

echo ==========================================
echo 检查完成
echo ==========================================
echo.

if %ERROR_COUNT% equ 0 (
    echo ✓ 环境检查通过，可以启动服务
    echo.
    echo 运行以下命令启动服务:
    echo   start-dev-local.bat
) else (
    echo ✗ 发现 %ERROR_COUNT% 个问题
    echo.
    echo 建议操作:
    if not exist "%~dp0backend\node_modules" echo   1. 运行 install-all-dependencies.bat 安装依赖
    if not exist "%~dp0backend\.env" echo   2. 配置 backend/.env 文件
)
echo.
pause
