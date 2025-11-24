@echo off
echo ========================================
echo 清理构建缓存并重新构建
echo ========================================

echo.
echo [1/4] 清理 Vite 缓存...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo Vite 缓存已清理
) else (
    echo Vite 缓存不存在，跳过
)

echo.
echo [2/4] 清理 dist 目录...
if exist dist (
    rmdir /s /q dist
    echo dist 目录已清理
) else (
    echo dist 目录不存在，跳过
)

echo.
echo [3/4] 清理 node_modules (可选，按 Ctrl+C 跳过)...
pause
rmdir /s /q node_modules
npm install

echo.
echo [4/4] 开始构建...
npm run build

echo.
echo ========================================
echo 构建完成！
echo ========================================
echo.
echo 请检查 dist 目录是否生成成功
echo 如果成功，请将 dist 目录上传到服务器
echo.
pause
