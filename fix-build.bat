@echo off
chcp 65001 >nul
echo === 宝塔面板前端构建修复脚本 ===
echo 开始修复前端构建问题...

REM 检查Node.js版本
echo 检查Node.js版本...
node --version
if errorlevel 1 (
    echo ❌ Node.js未安装或不在PATH中
    pause
    exit /b 1
)

REM 清理缓存
echo 清理npm缓存...
npm cache clean --force

REM 安装兼容版本的Element Plus
echo 安装兼容版本的Element Plus...
npm install element-plus@2.1.11
if errorlevel 1 (
    echo ❌ Element Plus安装失败
    pause
    exit /b 1
)

REM 安装terser依赖
echo 安装terser依赖...
npm install terser --save-dev
if errorlevel 1 (
    echo ❌ terser安装失败
    pause
    exit /b 1
)

REM 清理Vite缓存
echo 清理Vite缓存...
if exist .vite rmdir /s /q .vite

REM 构建项目
echo 开始构建项目...
npm run build-bt

if errorlevel 1 (
    echo ❌ 构建失败
    echo 请检查上面的错误信息，或联系技术支持
    pause
    exit /b 1
) else (
    echo ✅ 构建成功！
    echo 📁 构建文件位于 dist\ 目录
    echo 🎉 前端构建完成，可以部署到宝塔面板了！
    pause
)