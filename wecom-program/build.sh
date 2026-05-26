#!/bin/bash
# ==============================================================
# 云客CRM智能分析 - 企微专区镜像构建脚本 v3.0.0
# ==============================================================
# 注意: 企微要求使用 docker export (不是 docker save)
#
# 使用前请确保:
# 1. 已安装 Docker
# 2. 已下载企微专区Python SDK: sdk/wwspecapisdk.so
#    下载地址: https://developer.work.weixin.qq.com/document/path/100247
#    选择: Python 3.12, x86_64 版本
#
# Windows用户请使用 build.bat 或在 Git Bash/WSL 中运行此脚本
# ==============================================================

set -e

IMAGE_NAME="yunke-crm-analysis"
IMAGE_TAG="3.0.0"
CONTAINER_NAME="yunke-crm-temp"
OUTPUT_FILE="${IMAGE_NAME}-${IMAGE_TAG}.tar"

echo ""
echo "========================================================"
echo "  云客CRM智能分析 - 企微专区镜像构建 v${IMAGE_TAG}"
echo "========================================================"
echo ""

# 检查SDK (必须存在)
if [ -f "sdk/wwspecapisdk.so" ]; then
    echo "[OK] 专区SDK已就绪: sdk/wwspecapisdk.so"
    ls -lh sdk/wwspecapisdk.so
else
    echo "[ERROR] 未找到SDK文件: sdk/wwspecapisdk.so"
    echo ""
    echo "  请按以下步骤操作:"
    echo "  1. 访问 https://developer.work.weixin.qq.com/document/path/100247"
    echo "  2. 下载 Python SDK (选择 Python 3.12, x86_64)"
    echo "  3. 将 wwspecapisdk.so 放到 sdk/ 目录"
    echo ""
    echo "  SDK只支持 Python 3.6 和 3.12!"
    exit 1
fi

echo ""
echo ">>> Step 1/4: 构建Docker镜像 (python:3.12-slim)..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "[OK] 镜像构建完成"

echo ""
echo ">>> Step 2/4: 创建容器并验证..."
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
docker run -d --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}
sleep 3

if docker ps | grep -q ${CONTAINER_NAME}; then
    echo "[OK] 容器运行正常"
    echo ""
    docker logs ${CONTAINER_NAME} 2>&1 | head -30
    echo ""
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "SDK状态: 已加载"; then
        echo "[OK] ★ SDK加载成功 ★"
    else
        echo "[WARN] SDK可能未正确加载, 请检查日志"
    fi
else
    echo "[ERROR] 容器启动失败!"
    docker logs ${CONTAINER_NAME} 2>&1
    docker rm -f ${CONTAINER_NAME} 2>/dev/null
    exit 1
fi

echo ""
echo ">>> Step 3/4: 导出镜像文件 (docker export)..."
docker export ${CONTAINER_NAME} > ${OUTPUT_FILE}
echo "[OK] 镜像文件已导出"

echo ""
echo ">>> Step 4/4: 清理..."
docker stop ${CONTAINER_NAME} 2>/dev/null
docker rm ${CONTAINER_NAME} 2>/dev/null
echo "[OK] 清理完成"

echo ""
echo "========================================================"
echo "  ✅ 构建成功!"
echo "========================================================"
echo ""
echo "  镜像文件: ${OUTPUT_FILE}"
echo "  文件大小: $(ls -lh ${OUTPUT_FILE} | awk '{print $5}')"
echo ""
echo "  上传到企微服务商后台:"
echo "  ┌──────────────────────────────────────────┐"
echo "  │ 镜像文件:  上传 ${OUTPUT_FILE}           │"
echo "  │ 启动命令:  /bin/sh                       │"
echo "  │ 启动参数:  /usr/local/wwspecdemo/start.sh│"
echo "  └──────────────────────────────────────────┘"
echo ""
