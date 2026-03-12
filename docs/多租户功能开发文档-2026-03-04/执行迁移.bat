@echo off
chcp 65001 >nul
echo.
echo ╔════════════════════════════════════════════╗
echo ║   CRM Local 数据库迁移                    ║
echo ╚════════════════════════════════════════════╝
echo.
echo 请输入MySQL密码，然后按回车...
echo.

set /p MYSQL_PASSWORD=MySQL密码: 

echo.
echo ⏳ 开始检查和迁移...
echo.

node backend/scripts/check-and-migrate.js "%MYSQL_PASSWORD%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 迁移成功完成！
) else (
    echo.
    echo ❌ 迁移失败，请检查错误信息
)

echo.
pause
