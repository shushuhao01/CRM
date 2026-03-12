@echo off
echo ========================================
echo 重启所有服务 - 确保数据最新
echo ========================================
echo.

echo 提示：此脚本会关闭所有正在运行的Node进程
echo 请确保已保存所有工作！
echo.
pause

echo.
echo [1/4] 关闭所有Node进程...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/4] 启动后端服务 (端口3000)...
start "后端服务" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak >nul

echo.
echo [3/4] 启动Admin后台 (端口5174)...
start "Admin后台" cmd /k "cd admin && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo [4/4] 启动官网 (端口8080)...
start "官网" cmd /k "cd website && npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo ✅ 所有服务已启动！
echo ========================================
echo.
echo 服务地址：
echo - 后端API:     http://localhost:3000
echo - Admin后台:   http://localhost:5174
echo - 官网:        http://localhost:8080
echo.
echo 请等待几秒钟让服务完全启动...
echo 然后在浏览器中按 Ctrl+Shift+R 强制刷新页面
echo.
pause
