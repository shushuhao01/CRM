@echo off
echo 安装支付相关依赖...
cd backend
npm install axios
echo.
echo 依赖安装完成！
echo.
echo 注意：
echo 1. axios - HTTP客户端，用于调用支付API
echo 2. crypto - Node.js内置模块，用于加密和签名
echo.
pause
