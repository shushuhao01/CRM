@echo off
chcp 65001 >nul
REM ==============================================================
REM 云客CRM智能分析 - 企微专区镜像构建脚本 (Windows版)
REM ==============================================================
REM 注意: 企微要求使用 docker export (不是 docker save)
REM ==============================================================

set IMAGE_NAME=yunke-crm-analysis
set IMAGE_TAG=2.0.0
set CONTAINER_NAME=yunke-crm-temp
set OUTPUT_FILE=%IMAGE_NAME%-%IMAGE_TAG%.tar

echo.
echo ========================================================
echo   云客CRM智能分析 - 企微专区镜像构建
echo   版本: %IMAGE_TAG%
echo ========================================================
echo.

REM Step 1: 构建Docker镜像
echo [Step 1/4] 构建Docker镜像...
docker build -t %IMAGE_NAME%:%IMAGE_TAG% .
if errorlevel 1 (
    echo [ERROR] 镜像构建失败
    pause
    exit /b 1
)
echo [OK] 镜像构建完成

REM Step 2: 创建容器
echo.
echo [Step 2/4] 创建容器...
docker rm -f %CONTAINER_NAME% 2>nul
docker run -d --name %CONTAINER_NAME% %IMAGE_NAME%:%IMAGE_TAG%
if errorlevel 1 (
    echo [ERROR] 容器创建失败
    pause
    exit /b 1
)
echo [OK] 容器已创建

REM Step 3: 导出tar包
echo.
echo [Step 3/4] 导出镜像文件 (docker export)...
docker export %CONTAINER_NAME% > %OUTPUT_FILE%
echo [OK] 镜像文件已导出

REM Step 4: 清理
echo.
echo [Step 4/4] 清理临时容器...
docker stop %CONTAINER_NAME%
docker rm %CONTAINER_NAME%
echo [OK] 清理完成

REM 输出结果
echo.
echo ========================================================
echo   构建成功!
echo ========================================================
echo.
echo   镜像文件: %OUTPUT_FILE%
echo.
echo   上传配置（填写到企微服务商助手）:
echo   镜像文件:  上传 %OUTPUT_FILE%
echo   启动命令:  /bin/sh
echo   启动参数:  /usr/local/wwspecdemo/start.sh
echo.
pause
