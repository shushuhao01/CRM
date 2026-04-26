#!/bin/bash
# ==============================================================
# 云客CRM智能分析 - 企微专区镜像构建脚本
# ==============================================================
# 注意: 企微要求使用 docker export (不是 docker save)
#
# 使用前请确保:
# 1. 已安装 Docker
# 2. 已下载企微专区Python SDK并放到 sdk/ 目录下
#    下载地址: https://developer.work.weixin.qq.com/document/path/100247
#    文件名: python_sdk_1.2.3.zip → 解压后将 wwspecsdk 文件夹放到 sdk/ 下
#
# Windows用户请使用 build.bat 或在 Git Bash/WSL 中运行此脚本
# ==============================================================

set -e

IMAGE_NAME="yunke-crm-analysis"
IMAGE_TAG="2.0.0"
CONTAINER_NAME="yunke-crm-temp"
OUTPUT_FILE="${IMAGE_NAME}-${IMAGE_TAG}.tar"

echo ""
echo "========================================================"
echo "  云客CRM智能分析 - 企微专区镜像构建"
echo "  版本: ${IMAGE_TAG}"
echo "========================================================"
echo ""

# 检查SDK
if [ -d "sdk/wwspecsdk" ] || [ -d "sdk" ] && [ "$(ls -A sdk/ 2>/dev/null)" ]; then
    echo "[✓] 专区SDK已就绪"
else
    echo "[!] 警告: sdk/ 目录为空或不存在"
    echo "    如需完整功能，请下载企微专区SDK放到 sdk/ 目录下"
    echo "    下载地址: https://developer.work.weixin.qq.com/document/path/100247"
    echo "    程序仍可构建，但SDK功能不可用（仅chat_analysis的本地分析可用）"
    echo ""
    read -p "是否继续构建？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: 构建Docker镜像
echo ""
echo ">>> Step 1/4: 构建Docker镜像..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "[✓] 镜像构建完成"

# Step 2: 创建并启动容器
echo ""
echo ">>> Step 2/4: 创建容器..."
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
docker run -d --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}
echo "[✓] 容器已创建"

# Step 3: 导出容器为tar包
echo ""
echo ">>> Step 3/4: 导出镜像文件 (docker export)..."
docker export ${CONTAINER_NAME} > ${OUTPUT_FILE}
echo "[✓] 镜像文件已导出"

# Step 4: 清理
echo ""
echo ">>> Step 4/4: 清理临时容器..."
docker stop ${CONTAINER_NAME}
docker rm ${CONTAINER_NAME}
echo "[✓] 清理完成"

# 输出结果
echo ""
echo "========================================================"
echo "  构建成功!"
echo "========================================================"
echo ""
echo "  镜像文件: ${OUTPUT_FILE}"
echo "  文件大小: $(ls -lh ${OUTPUT_FILE} | awk '{print $5}')"
echo ""
echo "  上传配置（填写到企微服务商助手）:"
echo "  ┌──────────────────────────────────────────┐"
echo "  │ 镜像文件:  上传 ${OUTPUT_FILE}           │"
echo "  │ 启动命令:  /bin/sh                       │"
echo "  │ 启动参数:  /usr/local/wwspecdemo/start.sh│"
echo "  └──────────────────────────────────────────┘"
echo ""
