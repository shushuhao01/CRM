#!/bin/sh
# 云客CRM智能分析 - 企微专区程序启动脚本
# 此脚本路径对应企微专区配置:
#   启动命令: /bin/sh
#   启动参数: /usr/local/wwspecdemo/start.sh

echo "[INFO] [YunkeCRM] =============================="
echo "[INFO] [YunkeCRM] 启动云客CRM智能分析专区程序"
echo "[INFO] [YunkeCRM] =============================="

# 设置Python环境
export PYTHONUNBUFFERED=1
export PYTHONIOENCODING=utf-8
export PORT=8080

# 检查SDK是否存在
SDK_DIR="/usr/local/wwspecdemo/sdk"
if [ -d "$SDK_DIR" ] && [ "$(ls -A $SDK_DIR 2>/dev/null)" ]; then
    echo "[INFO] [YunkeCRM] 专区SDK已就绪: $SDK_DIR"
    export PYTHONPATH="$SDK_DIR:$PYTHONPATH"
else
    echo "[WARN] [YunkeCRM] 专区SDK未找到，将以本地调试模式运行"
fi

# 启动主程序
cd /usr/local/wwspecdemo
exec python3 -u app.py
