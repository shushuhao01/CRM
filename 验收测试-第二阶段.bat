@echo off
chcp 65001 >nul
echo ================================================================================
echo 第二阶段验收测试 - 业务层改造
echo ================================================================================
echo.

cd backend

echo [1/5] 测试用户实体tenant_id字段...
node test-user-tenant-field.js
if %errorlevel% neq 0 (
    echo ❌ 用户实体测试失败
    pause
    exit /b 1
)
echo.

echo [2/5] 测试租户登录接口...
node test-tenant-login.js
if %errorlevel% neq 0 (
    echo ❌ 租户登录测试失败
    pause
    exit /b 1
)
echo.

echo [3/5] 测试租户中间件...
node test-tenant-middleware.js
if %errorlevel% neq 0 (
    echo ❌ 租户中间件测试失败
    pause
    exit /b 1
)
echo.

echo [4/5] 测试BaseRepository...
node test-base-repository-simple.js
if %errorlevel% neq 0 (
    echo ❌ BaseRepository测试失败
    pause
    exit /b 1
)
echo.

echo [5/5] 测试数据隔离...
node test-data-isolation.js
if %errorlevel% neq 0 (
    echo ❌ 数据隔离测试失败
    pause
    exit /b 1
)
echo.

echo ================================================================================
echo 🎉 第二阶段验收测试全部通过！
echo ================================================================================
echo.
echo 测试项目：
echo   ✅ 用户实体tenant_id字段
echo   ✅ 租户登录接口
echo   ✅ 租户中间件
echo   ✅ BaseRepository
echo   ✅ 数据隔离
echo.
echo 第二阶段开发完成！
echo.
pause
