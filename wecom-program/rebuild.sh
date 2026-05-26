#!/bin/bash
# ==========================================================
# 云客CRM专区程序 v3.0.0 - 重建镜像脚本
# ==========================================================
# 前置条件:
#   1. 确保 sdk/wwspecapisdk.so 存在 (Python 3.12, x86_64)
#      下载地址: https://developer.work.weixin.qq.com/document/path/100247
#   2. 服务器已安装 Docker
#
# 用法: 将整个 wecom-program/ 目录上传到服务器，执行此脚本
# ==========================================================

set -e

echo ""
echo "========================================================"
echo "  云客CRM专区程序 v3.0.0 - 重建镜像"
echo "========================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] 未找到docker命令，请确保Docker已安装"
    exit 1
fi

# ★★★ 关键检查: SDK文件必须存在 ★★★
echo "[Step 1] 检查SDK文件..."
SDK_FILE="sdk/wwspecapisdk.so"
if [ ! -f "$SDK_FILE" ]; then
    echo ""
    echo "================================================================"
    echo "  [ERROR] 未找到SDK文件: $SDK_FILE"
    echo "================================================================"
    echo ""
    echo "  请按以下步骤获取SDK:"
    echo ""
    echo "  1. 打开: https://developer.work.weixin.qq.com/document/path/100247"
    echo "  2. 下载 Python 版本的 SDK (选择 Python 3.12, x86_64)"
    echo "  3. 将 wwspecapisdk.so 文件放到 sdk/ 目录下"
    echo ""
    echo "  注意: SDK只支持 Python 3.6 和 3.12!"
    echo "================================================================"
    echo ""
    exit 1
fi
echo "[OK] SDK文件已找到: $SDK_FILE"
ls -lh "$SDK_FILE"

# 检查SDK文件是否为正确架构
echo ""
echo "[Step 1.1] 检查SDK文件架构..."
file "$SDK_FILE" 2>/dev/null || echo "[INFO] file命令不可用, 跳过架构检查"

IMAGE_NAME="yunke-crm-analysis"
IMAGE_TAG="3.0.0"
CONTAINER_NAME="yunke-crm-temp"
OUTPUT_FILE="${IMAGE_NAME}-${IMAGE_TAG}.tar"

echo ""
echo "[Step 2] 构建Docker镜像 (python:3.12-slim)..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "[OK] 镜像构建完成"

echo ""
echo "[Step 3] 创建临时容器并验证..."
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
docker run -d --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}

sleep 3

if docker ps | grep -q ${CONTAINER_NAME}; then
    echo "[OK] 容器正在运行"
    echo ""
    echo "--- 容器日志 ---"
    docker logs ${CONTAINER_NAME} 2>&1
    echo "--- 日志结束 ---"
    echo ""

    # 检查SDK是否成功加载
    if docker logs ${CONTAINER_NAME} 2>&1 | grep -q "SDK状态: 已加载"; then
        echo "[OK] ★ SDK加载成功! ★"
    else
        echo "[WARN] SDK可能未正确加载，请检查上面的日志"
        echo "[WARN] 确认 wwspecapisdk.so 是 Python 3.12 x86_64 版本"
    fi
else
    echo "[ERROR] 容器未正常启动!"
    docker logs ${CONTAINER_NAME} 2>&1
    echo ""
    echo "请检查错误日志后重试"
    docker rm -f ${CONTAINER_NAME} 2>/dev/null
    exit 1
fi

echo ""
echo "[Step 4] 导出镜像文件 (docker export)..."
docker export ${CONTAINER_NAME} > ${OUTPUT_FILE}
echo "[OK] 导出完成: ${OUTPUT_FILE}"

echo ""
echo "[Step 5] 清理临时容器..."
docker stop ${CONTAINER_NAME} 2>/dev/null
docker rm ${CONTAINER_NAME} 2>/dev/null
echo "[OK] 清理完成"

FILE_SIZE=$(ls -lh ${OUTPUT_FILE} | awk '{print $5}')
echo ""
echo "========================================================"
echo "  ✅ 构建成功!"
echo "========================================================"
echo ""
echo "  镜像文件: $(pwd)/${OUTPUT_FILE}"
echo "  文件大小: ${FILE_SIZE}"
echo "  Python:   3.12"
echo "  SDK:      wwspecapisdk (已包含)"
echo ""
echo "  部署步骤:"
echo "  1. 去企微服务商后台 → 数据与智能专区 → 程序详情"
echo "  2. 重新上传镜像文件: ${OUTPUT_FILE}"
echo "  3. 启动命令: /bin/sh"
echo "  4. 启动参数: /usr/local/wwspecdemo/start.sh"
echo "  5. 提交审核 → 部署上线"
echo ""
echo "  验证方式:"
echo "  部署后在CRM系统点击「诊断」按钮"
echo "  如果不再报 710674 connect fail 则表示修复成功"
echo "========================================================"
echo ""
