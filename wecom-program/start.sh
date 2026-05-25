#!/bin/sh
# 云客CRM智能分析 - 企微专区程序启动脚本
# 此脚本路径对应企微专区配置:
#   启动命令: /bin/sh
#   启动参数: /usr/local/wwspecdemo/start.sh

echo "[INFO] [YunkeCRM] =============================="
echo "[INFO] [YunkeCRM] 启动云客CRM智能分析专区程序 v2.0.1"
echo "[INFO] [YunkeCRM] =============================="
echo "[INFO] [YunkeCRM] 启动时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "[INFO] [YunkeCRM] Python: $(python3 --version 2>&1)"
echo "[INFO] [YunkeCRM] 工作目录: $(pwd)"

# 设置Python环境
export PYTHONUNBUFFERED=1
export PYTHONIOENCODING=utf-8
export PORT=8080

# 检查SDK是否存在
SDK_DIR="/usr/local/wwspecdemo/sdk"
echo "[INFO] [YunkeCRM] 检查SDK目录: $SDK_DIR"
ls -la "$SDK_DIR" 2>/dev/null || echo "[WARN] [YunkeCRM] SDK目录不存在"

if [ -d "$SDK_DIR/wwspecsdk" ]; then
    echo "[INFO] [YunkeCRM] 专区SDK包已就绪: $SDK_DIR/wwspecsdk"
    export PYTHONPATH="$SDK_DIR:$PYTHONPATH"
elif [ -d "$SDK_DIR" ] && [ "$(ls -A $SDK_DIR 2>/dev/null | grep -v gitkeep)" ]; then
    echo "[INFO] [YunkeCRM] SDK目录有内容，加入PYTHONPATH"
    export PYTHONPATH="$SDK_DIR:$PYTHONPATH"
else
    echo "[WARN] [YunkeCRM] 专区SDK未找到，将以本地分析模式运行"
    echo "[WARN] [YunkeCRM] sync_msg和get_msg_body将不可用"
fi

echo "[INFO] [YunkeCRM] PYTHONPATH=$PYTHONPATH"
echo "[INFO] [YunkeCRM] 准备启动HTTP服务 (端口:8080)..."

# 启动主程序
cd /usr/local/wwspecdemo
exec python3 -u app.py
