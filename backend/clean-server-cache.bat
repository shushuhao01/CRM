@echo off
chcp 65001 >nul
echo ==========================================
echo 宝塔服务器安全清理脚本 (Windows版)
echo 只清理缓存和垃圾文件，不影响重要数据
echo ==========================================
echo.

echo [1/8] 清理npm缓存...
call npm cache clean --force 2>nul
echo    完成

echo [2/8] 清理yarn缓存...
call yarn cache clean 2>nul
echo    完成

echo [3/8] 清理后端日志文件...
cd /d "%~dp0"
if exist "*.log" (
    del /q *.log 2>nul
    echo    已清理后端日志
)
echo    完成

echo [4/8] 清理临时文件...
if exist "temp" (
    rd /s /q temp 2>nul
    mkdir temp
    echo    已清理temp目录
)
echo    完成

echo [5/8] 清理旧备份文件（保留最近3个）...
if exist "backups" (
    cd backups
    for /f "skip=3 delims=" %%i in ('dir /b /o-d *.json 2^>nul') do (
        del /q "%%i" 2>nul
    )
    cd ..
    echo    已清理旧备份
)
echo    完成

echo [6/8] 清理上传的临时文件...
if exist "backend\uploads\temp" (
    del /q backend\uploads\temp\* 2>nul
    echo    已清理上传临时文件
)
echo    完成

echo [7/8] 清理node_modules缓存...
if exist "node_modules\.cache" (
    rd /s /q node_modules\.cache 2>nul
    echo    已清理node_modules缓存
)
echo    完成

echo [8/8] 清理TypeScript构建缓存...
if exist "tsconfig.tsbuildinfo" (
    del /q tsconfig.tsbuildinfo 2>nul
)
if exist "src\tsconfig.tsbuildinfo" (
    del /q src\tsconfig.tsbuildinfo 2>nul
)
echo    完成

echo.
echo ==========================================
echo 清理完成！
echo ==========================================
echo.
echo 建议在宝塔面板中执行以下操作：
echo 1. 文件 ^> 磁盘清理 ^> 扫描并清理
echo 2. 数据库 ^> 备份 ^> 删除7天前的备份
echo 3. 网站 ^> 备份 ^> 删除7天前的备份
echo 4. 日志 ^> 清理旧日志
echo.
pause
