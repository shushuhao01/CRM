@echo off
chcp 65001 >nul
echo ==========================================
echo 安装所有项目依赖
echo ==========================================
echo.

echo [1/4] 安装后端依赖...
cd /d "%~dp0backend"
if exist "package.json" (
    call npm install
    echo ✓ 后端依赖安装完成
) else (
    echo ⚠️  未找到 backend/package.json
)
echo.

echo [2/4] 安装CRM前端依赖...
cd /d "%~dp0"
if exist "package.json" (
    call npm install
    echo ✓ CRM前端依赖安装完成
) else (
    echo ⚠️  未找到 package.json
)
echo.

echo [3/4] 安装Admin后台依赖...
cd /d "%~dp0admin"
if exist "package.json" (
    call npm install
    echo ✓ Admin后台依赖安装完成
) else (
    echo ⚠️  未找到 admin/package.json
)
echo.

echo [4/4] 安装Website官网依赖...
cd /d "%~dp0website"
if exist "package.json" (
    call npm install
    echo ✓ Website官网依赖安装完成
) else (
    echo ⚠️  未找到 website/package.json
)
echo.

cd /d "%~dp0"

echo ==========================================
echo 依赖安装完成！
echo ==========================================
echo.
echo 现在可以运行 start-dev-local.bat 启动服务
echo.
pause
