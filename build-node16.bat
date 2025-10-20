@echo off
chcp 65001 >nul
echo 🔧 宝塔面板 Node.js 16 环境构建开始...

REM 检查 Node.js 版本
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo 📍 当前 Node.js 版本: %NODE_VERSION%

REM 设置环境变量以解决兼容性问题
set NODE_OPTIONS=--max-old-space-size=4096
set VITE_LEGACY_BUILD=true

REM 清理之前的构建文件
echo 🧹 清理之前的构建文件...
if exist dist rmdir /s /q dist
if exist node_modules\.vite rmdir /s /q node_modules\.vite

REM 安装依赖（如果需要）
if not exist node_modules (
    echo 📦 安装依赖...
    npm install --production=false
)

REM 使用专门的 Node.js 16 配置进行构建
echo 🔨 开始构建（使用 Node.js 16 兼容配置）...
npx vite build --config vite.config.node16.ts

REM 检查构建结果
if %errorlevel% equ 0 (
    echo ✅ 构建成功！
    echo 📁 构建文件位置: .\dist
    
    REM 显示构建文件
    if exist dist (
        echo 📊 构建文件列表:
        dir dist /b
    )
    
    echo.
    echo 🎉 宝塔面板部署准备完成！
    echo 📋 下一步操作：
    echo    1. 将 dist 目录内容上传到网站根目录
    echo    2. 配置 Nginx 反向代理
    echo    3. 启动后端服务
    
) else (
    echo ❌ 构建失败！
    echo 🔍 可能的解决方案：
    echo    1. 检查 Node.js 版本是否为 16.x
    echo    2. 清理 node_modules 重新安装
    echo    3. 检查磁盘空间是否充足
    echo    4. 查看详细错误日志
    pause
    exit /b 1
)

pause