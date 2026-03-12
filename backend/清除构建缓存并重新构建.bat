@echo off
echo 正在清除构建缓存...
rmdir /s /q dist 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo.
echo 正在重新构建...
call npm run build

echo.
echo 构建完成！
pause
