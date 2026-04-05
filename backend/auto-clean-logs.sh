#!/bin/bash

# ============================================================
# PM2 日志自动清理脚本（crontab 定时执行）
# 功能：防止 PM2 日志文件无限增长撑爆磁盘
# 配置：建议每天凌晨3点执行
# crontab: 0 3 * * * /www/wwwroot/abc789.cn/backend/auto-clean-logs.sh >> /var/log/auto-clean.log 2>&1
# ============================================================

LOG_MAX_SIZE=$((50 * 1024 * 1024))  # 50MB

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 开始自动清理日志..."

# 1. 清理 PM2 日志（超过50MB就截断）
if [ -d "/root/.pm2/logs" ]; then
    for logfile in /root/.pm2/logs/*.log; do
        if [ -f "$logfile" ]; then
            filesize=$(stat -c%s "$logfile" 2>/dev/null || echo 0)
            if [ "$filesize" -gt "$LOG_MAX_SIZE" ]; then
                echo "  截断: $logfile ($(numfmt --to=iec $filesize))"
                # 保留最后1000行，其余清掉
                tail -n 1000 "$logfile" > "${logfile}.tmp" && mv "${logfile}.tmp" "$logfile"
            fi
        fi
    done
fi

# 2. 清理项目 backend/logs 目录
BACKEND_LOG_DIR="/www/wwwroot/abc789.cn/backend/logs"
if [ -d "$BACKEND_LOG_DIR" ]; then
    for logfile in "$BACKEND_LOG_DIR"/*.log; do
        if [ -f "$logfile" ]; then
            filesize=$(stat -c%s "$logfile" 2>/dev/null || echo 0)
            if [ "$filesize" -gt "$LOG_MAX_SIZE" ]; then
                echo "  截断: $logfile ($(numfmt --to=iec $filesize))"
                tail -n 1000 "$logfile" > "${logfile}.tmp" && mv "${logfile}.tmp" "$logfile"
            fi
        fi
    done
fi

# 3. 清空网站访问日志（超过100MB的）
if [ -d "/www/wwwlogs" ]; then
    find /www/wwwlogs -type f -name "*.log" -size +100M -exec truncate -s 0 {} \;
fi

# 4. 清理系统日志
journalctl --vacuum-size=100M 2>/dev/null

# 5. 磁盘使用率检查：超过85%时触发深度清理
USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$USAGE" -gt 85 ]; then
    echo "  ⚠️ 磁盘使用率 ${USAGE}%，触发深度清理..."
    # 清空所有PM2日志
    find /root/.pm2/logs -type f -name "*.log" -exec truncate -s 0 {} \; 2>/dev/null
    # 清空网站日志
    find /www/wwwlogs -type f -exec truncate -s 0 {} \; 2>/dev/null
    # 清理旧备份
    find /www/backup/database -type f -mtime +3 -delete 2>/dev/null
    # 清理APT缓存
    apt-get clean 2>/dev/null
    # 清理系统旧日志
    find /var/log -type f -name "*.gz" -delete 2>/dev/null
    find /var/log -type f -name "*.old" -delete 2>/dev/null
    find /var/log -type f -name "*.1" -delete 2>/dev/null
fi

USAGE_AFTER=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 清理完成，磁盘使用率: ${USAGE_AFTER}%"

