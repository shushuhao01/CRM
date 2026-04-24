#!/bin/bash
# 构建企微数据与智能专区的Docker镜像并导出tar包
# 注意: 企微要求使用 docker export (不是 docker save)

echo "=== 构建Docker镜像 ==="
docker build -t yunke-crm-analysis:latest .

echo "=== 创建并启动容器 ==="
docker run -d --name yunke-crm-temp yunke-crm-analysis:latest

echo "=== 导出容器为tar包 (docker export) ==="
docker export yunke-crm-temp > yunke-crm-analysis.tar

echo "=== 清理临时容器 ==="
docker stop yunke-crm-temp
docker rm yunke-crm-temp

echo "=== 完成! ==="
echo "镜像文件: yunke-crm-analysis.tar"
echo "文件大小:"
ls -lh yunke-crm-analysis.tar
echo ""
echo "上传此 yunke-crm-analysis.tar 到企微服务商后台即可"
echo "启动命令填写: python3 -u /app/app.py"
