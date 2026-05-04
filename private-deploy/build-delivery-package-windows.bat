@echo off
REM ==================== CRM 私有部署交付包打包脚本 (Windows版) ====================
REM 用途：在 Windows 环境下打包私有部署交付包
REM 使用方式：
REM   build-delivery-package-windows.bat              # 源码包
REM   build-delivery-package-windows.bat --prebuilt   # 预构建包
REM   build-delivery-package-windows.bat --docker     # Docker 交付包

setlocal enabledelayedexpansion

REM ==================== 配置 ====================
set VERSION=1.8.0
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set OUTPUT_DIR=%PROJECT_DIR%\release
set PACKAGE_NAME=CRM-private-v%VERSION%
set TEMP_DIR=%TEMP%\%PACKAGE_NAME%
set PREBUILT=false
set DOCKER_MODE=false

REM 参数解析
:parse_args
if "%~1"=="" goto :args_done
if "%~1"=="--prebuilt" set PREBUILT=true
if "%~1"=="--docker" set DOCKER_MODE=true
shift
goto :parse_args
:args_done

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     CRM 私有部署交付包打包工具 v%VERSION%              ║
echo ╚══════════════════════════════════════════════════════╝
echo.

if "%PREBUILT%"=="true" (
    echo [INFO] 模式：预构建包（含 dist/）
    set PACKAGE_NAME=%PACKAGE_NAME%-prebuilt
) else if "%DOCKER_MODE%"=="true" (
    echo [INFO] 模式：Docker 交付包
    set PACKAGE_NAME=%PACKAGE_NAME%-docker
) else (
    echo [INFO] 模式：源码包
)

REM ==================== Step 1: 清理临时目录 ====================
echo [INFO] Step 1: 准备临时目录...
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM ==================== Step 2: 复制交付文件 ====================
echo [INFO] Step 2: 复制交付文件...

REM CRM 前端源码
xcopy /E /I /Y "%PROJECT_DIR%\src" "%TEMP_DIR%\src"
xcopy /E /I /Y "%PROJECT_DIR%\public" "%TEMP_DIR%\public"
copy /Y "%PROJECT_DIR%\index.html" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\package.json" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\package-lock.json" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\vite.config.ts" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\tsconfig.json" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\tsconfig.app.json" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\tsconfig.node.json" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\eslint.config.ts" "%TEMP_DIR%\"
copy /Y "%PROJECT_DIR%\env.d.ts" "%TEMP_DIR%\"

REM 后端源码
mkdir "%TEMP_DIR%\backend"
xcopy /E /I /Y "%PROJECT_DIR%\backend\src" "%TEMP_DIR%\backend\src"
copy /Y "%PROJECT_DIR%\backend\package.json" "%TEMP_DIR%\backend\"
copy /Y "%PROJECT_DIR%\backend\package-lock.json" "%TEMP_DIR%\backend\"
copy /Y "%PROJECT_DIR%\backend\tsconfig.json" "%TEMP_DIR%\backend\"
copy /Y "%PROJECT_DIR%\backend\ecosystem.config.js" "%TEMP_DIR%\backend\"

REM 数据库脚本
xcopy /E /I /Y "%PROJECT_DIR%\database" "%TEMP_DIR%\database"

REM 部署工具
mkdir "%TEMP_DIR%\private-deploy"
copy /Y "%PROJECT_DIR%\private-deploy\README.md" "%TEMP_DIR%\private-deploy\"
copy /Y "%PROJECT_DIR%\private-deploy\install.sh" "%TEMP_DIR%\private-deploy\"
copy /Y "%PROJECT_DIR%\private-deploy\install.bat" "%TEMP_DIR%\private-deploy\"
copy /Y "%PROJECT_DIR%\private-deploy\init-mysql-database.js" "%TEMP_DIR%\private-deploy\"
copy /Y "%PROJECT_DIR%\private-deploy\nginx.conf.template" "%TEMP_DIR%\private-deploy\"
copy /Y "%PROJECT_DIR%\private-deploy\multi-site-deploy-guide.md" "%TEMP_DIR%\private-deploy\"

REM Docker 文件
if "%DOCKER_MODE%"=="true" (
    xcopy /E /I /Y "%PROJECT_DIR%\docker" "%TEMP_DIR%\docker"
)

echo [SUCCESS] 文件复制完成

REM ==================== Step 3: 设置环境变量模板 ====================
echo [INFO] Step 3: 重置环境变量为模板...

REM 创建后端 .env 模板
(
echo # ==================== CRM 系统环境配置 ====================
echo # ⚠️ 部署时请将所有 your_xxx 占位符替换为实际值
echo.
echo # 服务器配置
echo NODE_ENV=production
echo PORT=3000
echo API_PREFIX=/api/v1
echo.
echo # ⚠️ 私有部署模式（勿改^)
echo DEPLOY_MODE=private
echo.
echo # ==================== 数据库配置 ====================
echo DB_TYPE=mysql
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_DATABASE=your_database_name
echo DB_USERNAME=your_database_user
echo DB_PASSWORD=your_database_password
echo DB_CHARSET=utf8mb4
echo DB_TIMEZONE=+08:00
echo.
echo # ==================== JWT 配置 ====================
echo JWT_SECRET=your_jwt_secret_key_here_change_in_production
echo JWT_REFRESH_SECRET=your_jwt_refresh_secret_key_here_change_in_production
echo JWT_EXPIRES_IN=7d
echo JWT_REFRESH_EXPIRES_IN=30d
echo.
echo # 加密配置
echo BCRYPT_ROUNDS=12
echo.
echo # ==================== CORS 配置 ====================
echo CORS_ORIGIN=https://crm.your-domain.com
echo CORS_CREDENTIALS=true
echo.
echo # 文件上传配置
echo UPLOAD_MAX_SIZE=10485760
echo UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,application/pdf
echo.
echo # ==================== 日志配置 ====================
echo LOG_LEVEL=info
echo LOG_FILE_PATH=./logs
echo LOG_MAX_SIZE=20m
echo LOG_MAX_FILES=14d
echo.
echo # ==================== 安全配置 ====================
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=3000
echo HELMET_ENABLED=true
echo COMPRESSION_ENABLED=true
echo.
echo # ==================== 部署配置 ====================
echo BAOTA_PANEL=false
echo STATIC_PATH=../dist
echo UPLOAD_PATH=./uploads
) > "%TEMP_DIR%\backend\.env"

REM 创建前端 .env.production
(
echo VITE_API_BASE_URL=/api/v1
echo NODE_ENV=production
echo VITE_DEPLOY_MODE=private
) > "%TEMP_DIR%\.env.production"

REM 创建前端 .env.development
(
echo VITE_API_BASE_URL=/api/v1
echo VITE_DEPLOY_MODE=private
echo VITE_APP_TITLE=CRM系统 - 开发环境
echo VITE_APP_ENV=development
) > "%TEMP_DIR%\.env.development"

echo [SUCCESS] 环境变量已重置

REM ==================== Step 4: 预构建（可选） ====================
if "%PREBUILT%"=="true" (
    echo [INFO] Step 4: 构建前端和后端...

    REM 构建前端
    cd /d "%PROJECT_DIR%"
    call npm install
    set VITE_DEPLOY_MODE=private
    call npm run build
    xcopy /E /I /Y "%PROJECT_DIR%\dist" "%TEMP_DIR%\dist"
    echo [SUCCESS] 前端构建完成

    REM 构建后端
    cd /d "%PROJECT_DIR%\backend"
    call npm install
    call npm run build
    xcopy /E /I /Y "%PROJECT_DIR%\backend\dist" "%TEMP_DIR%\backend\dist"
    echo [SUCCESS] 后端构建完成
) else (
    echo [INFO] Step 4: 跳过（源码模式，客户自行构建）
)

REM ==================== Step 5: 清理不必要的文件 ====================
echo [INFO] Step 5: 清理不必要的文件...

REM 删除验证文件
del /Q "%TEMP_DIR%\public\MP_verify_*.txt" 2>nul
del /Q "%TEMP_DIR%\public\WW_verify_*.txt" 2>nul

REM 删除 SaaS 相关
if exist "%TEMP_DIR%\backend\src\routes\admin" rmdir /s /q "%TEMP_DIR%\backend\src\routes\admin"
del /Q "%TEMP_DIR%\private-deploy\SaaS-license-guide.md" 2>nul
del /Q "%TEMP_DIR%\private-deploy\delivery-guide.md" 2>nul
del /Q "%TEMP_DIR%\private-deploy\clean-for-delivery.bat" 2>nul
del /Q "%TEMP_DIR%\private-deploy\payment-config-guide.md" 2>nul
del /Q "%TEMP_DIR%\private-deploy\central-server-callback-guide.md" 2>nul

echo [SUCCESS] 清理完成

REM ==================== Step 6: 打包 ====================
echo [INFO] Step 6: 打包交付文件...

REM 检查是否安装了 7-Zip
where 7z >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    REM 使用 7-Zip 打包
    7z a -ttar "%OUTPUT_DIR%\%PACKAGE_NAME%.tar" "%TEMP_DIR%\*"
    7z a -tgzip "%OUTPUT_DIR%\%PACKAGE_NAME%.tar.gz" "%OUTPUT_DIR%\%PACKAGE_NAME%.tar"
    del "%OUTPUT_DIR%\%PACKAGE_NAME%.tar"
    echo [SUCCESS] 打包完成: %OUTPUT_DIR%\%PACKAGE_NAME%.tar.gz
) else (
    REM 使用 PowerShell 压缩
    powershell -Command "Compress-Archive -Path '%TEMP_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%PACKAGE_NAME%.zip' -Force"
    echo [SUCCESS] 打包完成: %OUTPUT_DIR%\%PACKAGE_NAME%.zip
    echo [WARN] 未检测到 7-Zip，已创建 .zip 格式。建议安装 7-Zip 以生成 .tar.gz 格式
)

REM 清理临时目录
rmdir /s /q "%TEMP_DIR%"

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║                🎉 交付包打包完成！                    ║
echo ╠══════════════════════════════════════════════════════╣
echo ║                                                      ║
echo ║  输出目录: %OUTPUT_DIR%
echo ║                                                      ║
if "%DOCKER_MODE%"=="true" (
    echo ║  下一步: 构建 Docker 镜像                             ║
    echo ║    cd docker ^&^& docker-compose build                  ║
) else if "%PREBUILT%"=="true" (
    echo ║  下一步: 交付给客户                                    ║
    echo ║    客户只需修改 .env 并运行 install.bat               ║
) else (
    echo ║  下一步: 推送到交付仓库或交付给客户                     ║
    echo ║    客户需运行 npm install 和 npm run build            ║
)
echo ║                                                      ║
echo ╚══════════════════════════════════════════════════════╝
echo.

endlocal
