FROM python:3.11-slim

# 设置时区为中国
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建工作目录（与企微官方示例保持一致）
# 注意：企微沙箱运行时会自动挂载官方SDK到 /usr/local/wwspecdemo/sdk/
RUN mkdir -p /usr/local/wwspecdemo/sdk

# 复制程序文件
WORKDIR /usr/local/wwspecdemo
COPY app.py .
COPY start.sh .
RUN chmod +x start.sh

# 如果本地sdk/目录有内容（调试用途），也复制进去
# 生产环境中企微平台会挂载真正的SDK，本地文件不影响
COPY sdk/.gitkeep /usr/local/wwspecdemo/sdk/

EXPOSE 8080

# 使用start.sh启动（与企微专区配置一致）
CMD ["/bin/sh", "/usr/local/wwspecdemo/start.sh"]
