@echo off
echo 正在重启后端服务...

REM 查找并停止占用3000端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a 2>nul
)

echo 等待端口释放...
timeout /t 2 /nobreak >nul

echo 启动后端服务...
cd backend
start "CRM Backend" cmd /k "npm run dev"

echo 后端服务已重启
pause
