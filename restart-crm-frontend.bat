@echo off
chcp 65001 >nul
echo ========================================
echo CRM前端服务重启脚本
echo ========================================
echo.

echo [1/4] 检查CRM前端目录...
cd /d "D:\kaifa\CRM - 1.8.0"
if errorlevel 1 (
    echo ❌ 错误: 无法进入CRM目录
    pause
    exit /b 1
)
echo ✓ 目录检查完成

echo.
echo [2/4] 清除Vite缓存...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo ✓ Vite缓存已清除
) else (
    echo ℹ Vite缓存不存在,跳过
)

echo.
echo [3/4] 启动CRM前端服务...
echo ========================================
echo 服务将在新窗口中启动
echo 请在新窗口中查看服务状态
echo ========================================
echo.
start "CRM前端服务" cmd /k "cd /d D:\kaifa\CRM - 1.8.0 && npm run dev"

echo.
echo [4/4] 等待服务启动...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo ✓ 重启完成!
echo ========================================
echo.
echo 接下来请执行以下步骤:
echo.
echo 1. 等待新窗口中的服务完全启动
echo 2. 访问 http://localhost:5173
echo 3. 清除浏览器缓存:
echo    - 按 Ctrl+Shift+R 硬刷新
echo    - 或 F12 打开控制台,右键刷新按钮,选择"清空缓存并硬性重新加载"
echo 4. 登录系统,检查菜单是否正常显示
echo.
echo 如果还有问题,请查看:
echo - 新窗口中的服务启动日志
echo - 浏览器控制台(F12)的错误信息
echo - Network标签中 /api/v1/system/modules/status 的响应
echo.
pause
