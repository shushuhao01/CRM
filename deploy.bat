@echo off
chcp 65001 >nul
echo 🚀 开始部署CRM系统...

REM 设置变量
set DOMAIN=abc789.cn
set FRONTEND_PATH=C:\www\wwwroot\%DOMAIN%
set BACKEND_PATH=C:\www\wwwroot\crm-backend
set BACKUP_PATH=C:\www\backup\crm-%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%

echo 📦 创建备份目录...
if not exist "%BACKUP_PATH%" mkdir "%BACKUP_PATH%"

REM 备份现有文件
if exist "%FRONTEND_PATH%" (
    echo 备份前端文件...
    xcopy "%FRONTEND_PATH%" "%BACKUP_PATH%\frontend\" /E /I /Q
)

if exist "%BACKEND_PATH%" (
    echo 备份后端文件...
    xcopy "%BACKEND_PATH%" "%BACKUP_PATH%\backend\" /E /I /Q
)

echo 🎨 部署前端...
if not exist "%FRONTEND_PATH%" mkdir "%FRONTEND_PATH%"
xcopy ".\dist\*" "%FRONTEND_PATH%\" /E /Y /Q

echo ⚙️ 部署后端...
if not exist "%BACKEND_PATH%" mkdir "%BACKEND_PATH%"
xcopy ".\backend\*" "%BACKEND_PATH%\" /E /Y /Q

echo 📦 安装后端依赖...
cd /d "%BACKEND_PATH%"
call npm install --production

echo 📁 创建必要目录...
if not exist "logs" mkdir "logs"
if not exist "uploads\avatars" mkdir "uploads\avatars"

echo 🔧 配置环境变量...
if not exist ".env" (
    copy ".env.production" ".env"
    echo ⚠️ 请编辑 %BACKEND_PATH%\.env 文件，配置数据库和其他环境变量
)

echo 🔄 启动后端服务...
call pm2 delete crm-api 2>nul
call pm2 start ecosystem.config.js --env production

echo 💾 保存PM2配置...
call pm2 save

echo ✅ 部署完成！
echo.
echo 📋 部署信息：
echo    前端路径: %FRONTEND_PATH%
echo    后端路径: %BACKEND_PATH%
echo    备份路径: %BACKUP_PATH%
echo.
echo 🔧 接下来需要：
echo    1. 配置数据库连接 (%BACKEND_PATH%\.env)
echo    2. 配置Nginx反向代理
echo    3. 初始化数据库
echo    4. 测试访问
echo.
echo 🌐 访问地址: https://%DOMAIN%

pause