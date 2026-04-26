FROM python:3.11-slim

# 设置时区为中国
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 创建工作目录（与企微官方示例保持一致）
RUN mkdir -p /usr/local/wwspecdemo/sdk

# 复制程序文件
WORKDIR /usr/local/wwspecdemo
COPY app.py .
COPY start.sh .
RUN chmod +x start.sh

# 复制官方SDK（构建时将SDK文件放到 sdk/ 目录下）
# 从 https://developer.work.weixin.qq.com/document/path/100247 下载 python_sdk_1.2.3.zip
# 解压后将 wwspecsdk 目录放到本项目的 sdk/ 下
COPY sdk/ /usr/local/wwspecdemo/sdk/

EXPOSE 8080

# 使用start.sh启动（与企微专区配置一致）
CMD ["/bin/sh", "/usr/local/wwspecdemo/start.sh"]
