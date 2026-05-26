#!/bin/sh
# 云客CRM智能分析 - 企微专区程序启动脚本
# 企微专区配置:
#   启动命令: /bin/sh
#   启动参数: /usr/local/wwspecdemo/start.sh
#
# 重要: docker export 后 PATH/ENV 会丢失, 必须显式设置!
# 参考: https://developer.work.weixin.qq.com/document/path/99872

# 显式设置 PATH (docker export 后环境变量丢失)
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export LD_LIBRARY_PATH="/usr/local/lib:/usr/lib:/usr/local/wwspecdemo/sdk:${LD_LIBRARY_PATH}"
export PYTHONPATH="/usr/local/wwspecdemo/sdk:/usr/local/wwspecdemo:${PYTHONPATH}"
export PYTHONUNBUFFERED=1
export PYTHONIOENCODING=utf-8
export PORT=8080

echo "[INFO] [YunkeCRM] =============================="
echo "[INFO] [YunkeCRM] 启动云客CRM智能分析专区程序 v3.0.0"
echo "[INFO] [YunkeCRM] =============================="
echo "[INFO] [YunkeCRM] 启动时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "[INFO] [YunkeCRM] Python: $(/usr/local/bin/python3 --version 2>&1)"
echo "[INFO] [YunkeCRM] 工作目录: $(pwd)"
echo "[INFO] [YunkeCRM] PATH: $PATH"
echo "[INFO] [YunkeCRM] LD_LIBRARY_PATH: $LD_LIBRARY_PATH"
echo "[INFO] [YunkeCRM] PYTHONPATH: $PYTHONPATH"

SDK_DIR="/usr/local/wwspecdemo/sdk"
echo "[INFO] [YunkeCRM] 检查SDK目录: $SDK_DIR"
ls -la "$SDK_DIR" 2>/dev/null || echo "[WARN] [YunkeCRM] SDK目录不存在"

if [ -f "$SDK_DIR/wwspecapisdk.so" ]; then
    echo "[INFO] [YunkeCRM] 专区SDK已就绪: $SDK_DIR/wwspecapisdk.so"
else
    echo "[WARN] [YunkeCRM] 未找到 wwspecapisdk.so"
    echo "[WARN] [YunkeCRM] 请从企微开发者文档下载SDK并放置到 sdk/ 目录"
    echo "[WARN] [YunkeCRM] https://developer.work.weixin.qq.com/document/path/100247"
fi

echo "[INFO] [YunkeCRM] 准备启动HTTP服务 (端口:8080)..."

cd /usr/local/wwspecdemo
exec /usr/local/bin/python3 -u app.py
