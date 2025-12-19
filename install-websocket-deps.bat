@echo off
echo ========================================
echo 安装WebSocket实时推送依赖
echo ========================================

echo.
echo [1/2] 安装后端依赖 (socket.io)...
cd backend
call npm install socket.io@^4.7.0
cd ..

echo.
echo [2/2] 安装前端依赖 (socket.io-client)...
call npm install socket.io-client@^4.7.0

echo.
echo ========================================
echo WebSocket依赖安装完成！
echo ========================================
echo.
echo 请重启后端服务以启用WebSocket功能
pause
