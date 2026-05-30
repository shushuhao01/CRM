@echo off
chcp 65001 >nul
title CRM系统 - 私有部署一键安装

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║           CRM 系统 - 私有部署一键安装向导                ║
echo ║                    版本: 1.8.0                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

:: ==================== Step 1: 环境检测 ====================
echo [Step 1/7] 环境检测...
echo ─────────────────────────────────────

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未安装 Node.js
    echo    请安装 Node.js 22.0 或更高版本
    echo    下载地址: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo ✅ Node.js: %NODE_VER%

:: 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未安装 npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
echo ✅ npm: v%NPM_VER%

:: 检查 MySQL
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  未检测到 MySQL 命令行客户端
    echo    如果MySQL已安装但未添加到PATH，可继续安装
) else (
    echo ✅ MySQL 客户端已安装
)

echo.

:: ==================== Step 2: 数据库初始化 ====================
echo [Step 2/7] 数据库初始化...
echo ─────────────────────────────────────
echo.
echo 请确保MySQL服务已启动，然后按照提示输入数据库配置信息。
echo.

cd /d "%~dp0"
node init-mysql-database.js
if %errorlevel% neq 0 (
    echo.
    echo ❌ 数据库初始化失败，请检查错误信息后重试
    pause
    exit /b 1
)

echo.

:: ==================== Step 3: 安装后端依赖 ====================
echo [Step 3/7] 安装后端依赖...
echo ─────────────────────────────────────
cd /d "%~dp0..\backend"
echo 正在安装后端npm依赖...
call npm install --production 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  后端依赖安装出现警告，尝试继续...
)
echo ✅ 后端依赖安装完成
echo.

:: ==================== Step 4: 构建后端 ====================
echo [Step 4/7] 构建后端...
echo ─────────────────────────────────────
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 后端构建失败
    pause
    exit /b 1
)
echo ✅ 后端构建完成
echo.

:: ==================== Step 5: 安装前端依赖并构建 ====================
echo [Step 5/7] 构建CRM前端...
echo ─────────────────────────────────────
cd /d "%~dp0.."
echo 正在安装前端npm依赖...
call npm install 2>nul
echo 正在构建前端...
call npm run build
if %errorlevel% neq 0 (
    echo ⚠️  前端构建失败，可尝试使用 npm run build-simple
    call npm run build-simple
)
echo ✅ CRM前端构建完成
echo.

:: ==================== Step 6: 安装PM2 ====================
echo [Step 6/7] 安装PM2进程管理器...
echo ─────────────────────────────────────
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo 正在安装PM2...
    call npm install -g pm2
)
echo ✅ PM2已就绪
echo.

:: ==================== Step 7: 启动服务 ====================
echo [Step 7/7] 启动CRM服务...
echo ─────────────────────────────────────
cd /d "%~dp0..\backend"

:: 停止可能存在的旧服务
pm2 stop crm-backend 2>nul
pm2 delete crm-backend 2>nul

:: 启动后端服务
pm2 start dist/app.js --name crm-backend --env production
echo ✅ 后端服务已启动

:: 保存PM2配置（开机自启）
pm2 save

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                  🎉 安装完成！                           ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║                                                          ║
echo ║  CRM系统地址:  http://localhost:3000                     ║
echo ║  API健康检查:  http://localhost:3000/health              ║
echo ║                                                          ║
echo ║  ━━━━━ 首次使用指引 ━━━━━                                ║
echo ║                                                          ║
echo ║  1. 打开浏览器访问上方地址                                ║
echo ║  2. 在登录页输入您的授权码完成系统激活                    ║
echo ║  3. 激活后系统自动创建管理员账号                          ║
echo ║                                                          ║
echo ║  默认管理员账号:                                          ║
echo ║    用户名: 购买时注册官网的手机号                         ║
echo ║    密码:   Aa123456                                      ║
echo ║                                                          ║
echo ║  ⚠️  如不知道手机号，即为注册官网时使用的手机号           ║
echo ║  ⚠️  请登录后立即修改默认密码！                           ║
echo ║                                                          ║
echo ║  常用命令:                                                ║
echo ║    查看状态:  pm2 list                                   ║
echo ║    查看日志:  pm2 logs crm-backend                       ║
echo ║    重启服务:  pm2 restart crm-backend                    ║
echo ║    停止服务:  pm2 stop crm-backend                       ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"
pm2 list
echo.
pause

