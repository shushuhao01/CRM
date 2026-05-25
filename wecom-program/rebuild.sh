#!/bin/bash
# ==========================================================
# 云客CRM专区程序 - 快速重建镜像（修复710674 connect fail）
# ==========================================================
# 用法: 将整个 wecom-program/ 目录上传到服务器，执行此脚本
# ==========================================================

set -e

echo ""
echo "========================================================"
echo "  修复710674: 重建干净镜像（移除冲突的.so文件）"
echo "========================================================"
echo ""

# 确保在正确的目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "[ERROR] 未找到docker命令，请确保Docker已安装"
    exit 1
fi

# 确保sdk目录干净（不含wwspecapisdk.so）
echo "[Step 1] 清理sdk目录..."
rm -f sdk/wwspecapisdk.so 2>/dev/null
echo "[OK] sdk目录已清理（只保留.gitkeep）"

# 构建
IMAGE_NAME="yunke-crm-analysis"
IMAGE_TAG="2.0.0"
CONTAINER_NAME="yunke-crm-temp"
OUTPUT_FILE="${IMAGE_NAME}-${IMAGE_TAG}.tar"

echo ""
echo "[Step 2] 构建Docker镜像..."
docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
echo "[OK] 镜像构建完成"

echo ""
echo "[Step 3] 创建容器..."
docker rm -f ${CONTAINER_NAME} 2>/dev/null || true
docker run -d --name ${CONTAINER_NAME} ${IMAGE_NAME}:${IMAGE_TAG}

# 等待容器启动，验证程序正常运行
echo "[Step 3.1] 等待容器启动..."
sleep 2
if docker ps | grep -q ${CONTAINER_NAME}; then
    echo "[OK] 容器正在运行"
    # 测试HTTP是否可访问
    CONTAINER_IP=$(docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${CONTAINER_NAME})
    if [ -n "$CONTAINER_IP" ]; then
        echo "[Step 3.2] 测试HTTP响应..."
        curl -s --max-time 5 "http://${CONTAINER_IP}:8080/" && echo "" || echo "[WARN] 无法连接容器HTTP（不影响导出）"
    fi
else
    echo "[WARN] 容器可能未正常启动，查看日志:"
    docker logs ${CONTAINER_NAME} 2>&1 | tail -20
fi

echo ""
echo "[Step 4] 导出镜像文件 (docker export)..."
docker export ${CONTAINER_NAME} > ${OUTPUT_FILE}
echo "[OK] 导出完成"

echo ""
echo "[Step 5] 清理..."
docker stop ${CONTAINER_NAME} 2>/dev/null
docker rm ${CONTAINER_NAME} 2>/dev/null
echo "[OK] 清理完成"

# 输出结果
FILE_SIZE=$(ls -lh ${OUTPUT_FILE} | awk '{print $5}')
echo ""
echo "========================================================"
echo "  ✅ 构建成功!"
echo "========================================================"
echo ""
echo "  镜像文件: $(pwd)/${OUTPUT_FILE}"
echo "  文件大小: ${FILE_SIZE}"
echo ""
echo "  下一步:"
echo "  1. 下载此文件到本地"
echo "  2. 去企微服务商后台 → 数据与智能专区 → 程序详情"
echo "  3. 重新上传镜像文件"
echo "  4. 启动命令: /bin/sh"
echo "  5. 启动参数: /usr/local/wwspecdemo/start.sh"
echo "  6. 提交审核 → 部署上线"
echo ""
