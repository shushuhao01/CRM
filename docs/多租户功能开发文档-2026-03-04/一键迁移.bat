@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════╗
echo ║   CRM Local 多租户数据库迁移              ║
echo ╚════════════════════════════════════════════╝
echo.

REM 设置变量
set DB_NAME=crm_local
set BACKUP_FILE=D:\kaifa\backup\crm_local_before_migration.sql
set MIGRATION_FILE=backend\database-migrations\add-tenant-support.sql

echo 第1步：备份数据库
echo ----------------------------------------
echo 正在备份数据库 %DB_NAME% ...
echo.

REM 执行备份（会提示输入密码）
mysqldump -u root -p %DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 备份失败！请检查：
    echo    1. MySQL是否已启动
    echo    2. 数据库名称是否正确
    echo    3. 密码是否正确
    echo.
    pause
    exit /b 1
)

echo ✅ 备份完成！
echo    备份文件: %BACKUP_FILE%
echo.
echo.

echo 第2步：执行数据库迁移
echo ----------------------------------------
echo 正在执行迁移脚本...
echo.

REM 执行迁移（会提示输入密码）
mysql -u root -p %DB_NAME% < "%MIGRATION_FILE%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 迁移失败！
    echo.
    pause
    exit /b 1
)

echo ✅ 迁移完成！
echo.
echo.

echo 第3步：验证迁移结果
echo ----------------------------------------
echo 正在验证...
echo.

REM 执行验证脚本
cd backend
node scripts/migrate-crm-local.js

echo.
echo ╔════════════════════════════════════════════╗
echo ║   ✅ 迁移流程完成！                       ║
echo ╚════════════════════════════════════════════╝
echo.
echo 下一步：
echo 1. 启动后端: cd backend ^&^& npm run dev
echo 2. 启动前端: npm run dev
echo 3. 测试功能是否正常
echo.
pause
