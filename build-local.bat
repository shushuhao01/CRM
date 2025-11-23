@echo off
chcp 65001 >nul
REM ========================================
REM CRM 系统本地构建脚本（Windows）
REM ========================================

echo ==========================================
echo 🔨 CRM 系统本地构建
echo ==========================================
echo.

REM 检查 Node.js 是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到 Node.js
    echo 💡 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js 版本:
node -v
echo.

REM 检查 npm 是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未检测到 npm
    pause
    exit /b 1
)

echo ✅ npm 版本:
npm -v
echo.

REM ========================================
REM 步骤 1：配置 npm 镜像
REM ========================================
echo 步骤 1/5: 配置 npm 镜像...
npm config set registry https://registry.npmmirror.com
echo ✅ npm 镜像配置完成
echo.

REM ========================================
REM 步骤 2：安装依赖
REM ========================================
echo 步骤 2/5: 安装前端依赖...
echo 📦 这可能需要几分钟，请耐心等待...
echo.

call npm install

if %errorlevel% neq 0 (
    echo ❌ 依赖安装失败！
    pause
    exit /b 1
)

echo ✅ 依赖安装完成
echo.

REM ========================================
REM 步骤 3：检查配置文件
REM ========================================
echo 步骤 3/5: 检查配置文件...

if not exist ".env.production" (
    echo ⚠️  警告：.env.production 文件不存在
    if exist ".env.example" (
        echo 📝 从 .env.example 创建 .env.production...
        copy .env.example .env.production
        echo ⚠️  请编辑 .env.production 文件，配置 API 地址！
        pause
    )
)

echo ✅ 配置文件检查完成
echo.

REM ========================================
REM 步骤 4：构建前端
REM ========================================
echo 步骤 4/5: 构建前端项目...
echo 🔨 这可能需要几分钟，请耐心等待...
echo.

call npm run build

if %errorlevel% neq 0 (
    echo ❌ 构建失败！
    pause
    exit /b 1
)

echo ✅ 构建完成
echo.

REM ========================================
REM 步骤 5：打包构建文件
REM ========================================
echo 步骤 5/5: 准备上传文件...

if not exist "dist" (
    echo ❌ 错误：dist 目录不存在
    pause
    exit /b 1
)

echo ✅ 构建文件位于: dist 目录
echo.

REM 检查是否安装了 7-Zip
where 7z >nul 2>nul
if %errorlevel% equ 0 (
    echo 📦 正在打包 dist 文件夹...
    if exist "dist.zip" del dist.zip
    7z a -tzip dist.zip dist\*
    echo ✅ 已创建 dist.zip
    echo.
) else (
    echo 💡 提示：请手动压缩 dist 文件夹
    echo    右键 dist 文件夹 → 发送到 → 压缩(zipped)文件夹
    echo.
)

echo ==========================================
echo ✅ 本地构建完成！
echo ==========================================
echo.
echo 📁 构建文件位置: %cd%\dist
echo.
echo 📝 下一步操作：
echo   1. 将 dist 文件夹（或 dist.zip）上传到服务器
echo   2. 解压到 /www/wwwroot/abc789.cn/dist
echo   3. 在服务器运行: ./deploy-server-only.sh
echo.
echo 💡 详细步骤请查看: 本地构建部署指南.md
echo.

pause
