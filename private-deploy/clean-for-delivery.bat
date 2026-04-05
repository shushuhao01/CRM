@echo off
chcp 65001 >nul
title CRM系统 - 交付包安全清理

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║        CRM 交付包安全清理脚本                             ║
echo ║   清除所有敏感信息，准备交付给私有部署客户                   ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo ⚠️  警告：此脚本将删除以下内容：
echo   - 所有 .env 文件（保留 .env.example）
echo   - 开发数据库文件
echo   - 日志文件
echo   - 上传的文件
echo   - node_modules 目录
echo   - 构建产物 (dist)
echo   - SaaS 许可证配置
echo.

set /p confirm=确认清理？输入 YES 继续:
if /i not "%confirm%"=="YES" (
    echo 已取消操作
    pause
    exit /b 0
)

echo.
echo 开始清理...
echo.

cd /d "%~dp0.."

:: 清除敏感环境配置文件
echo [1/8] 清除敏感环境配置...
if exist "backend\.env" del /q "backend\.env"
if exist "backend\.env.local" del /q "backend\.env.local"
if exist "backend\.env.development" del /q "backend\.env.development"
if exist "backend\.env.production" del /q "backend\.env.production"
if exist "backend\.env.production.server" del /q "backend\.env.production.server"
if exist "backend\.env.database" del /q "backend\.env.database"
if exist ".env" del /q ".env"
if exist ".env.local" del /q ".env.local"
if exist ".env.production" del /q ".env.production"
if exist "admin\.env" del /q "admin\.env"
if exist "admin\.env.local" del /q "admin\.env.local"
if exist "website\.env" del /q "website\.env"
if exist "website\.env.local" del /q "website\.env.local"
echo ✅ 环境配置已清除

:: 清除开发数据库
echo [2/8] 清除开发数据库文件...
if exist "backend\database\crm_dev.sqlite" del /q "backend\database\crm_dev.sqlite"
if exist "backend\data" rd /s /q "backend\data" 2>nul
if exist "database\crm_dev.sqlite" del /q "database\crm_dev.sqlite"
echo ✅ 开发数据库已清除

:: 清除日志
echo [3/8] 清除日志文件...
if exist "backend\logs" rd /s /q "backend\logs" 2>nul
if exist "logs" rd /s /q "logs" 2>nul
echo ✅ 日志已清除

:: 清除上传文件
echo [4/8] 清除上传文件...
if exist "backend\uploads" (
    rd /s /q "backend\uploads" 2>nul
    mkdir "backend\uploads"
)
if exist "uploads" (
    rd /s /q "uploads" 2>nul
    mkdir "uploads"
)
echo ✅ 上传文件已清除

:: 清除 node_modules
echo [5/8] 清除 node_modules...
if exist "node_modules" rd /s /q "node_modules" 2>nul
if exist "backend\node_modules" rd /s /q "backend\node_modules" 2>nul
if exist "admin\node_modules" rd /s /q "admin\node_modules" 2>nul
if exist "website\node_modules" rd /s /q "website\node_modules" 2>nul
echo ✅ node_modules 已清除

:: 清除构建产物
echo [6/8] 清除构建产物...
if exist "dist" rd /s /q "dist" 2>nul
if exist "backend\dist" rd /s /q "backend\dist" 2>nul
if exist "admin\dist" rd /s /q "admin\dist" 2>nul
if exist "website\dist" rd /s /q "website\dist" 2>nul
echo ✅ 构建产物已清除

:: 清除敏感脚本
echo [7/8] 清除开发敏感脚本...
if exist "backend\scripts\check-mysql-customers.js" del /q "backend\scripts\check-mysql-customers.js"
if exist "backend\scripts\generate-saas-license.js" del /q "backend\scripts\generate-saas-license.js" 2>nul
echo ✅ 敏感脚本已清除

:: 清除录音文件
echo [8/8] 清除录音文件...
if exist "backend\recordings" (
    rd /s /q "backend\recordings" 2>nul
    mkdir "backend\recordings"
)
echo ✅ 录音文件已清除

echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║                 🎉 清理完成！                             ║
echo ╠══════════════════════════════════════════════════════════╣
echo ║                                                          ║
echo ║  交付包已准备就绪，可安全交付给客户。                       ║
echo ║                                                          ║
echo ║  请确认以下文件已保留：                                    ║
echo ║  ✅ backend/.env.example  (配置模板)                      ║
echo ║  ✅ database/schema.sql   (数据库结构)                    ║
echo ║  ✅ private-deploy/       (安装脚本)                      ║
echo ║  ✅ 所有源代码文件                                        ║
echo ║                                                          ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
pause

