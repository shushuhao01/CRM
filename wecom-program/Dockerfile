FROM python:3.12-slim

ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# SDK dependencies: pycryptodome (加解密) + requests (网络通信)
RUN pip3 install --no-cache-dir pycryptodome requests

RUN mkdir -p /usr/local/wwspecdemo/sdk

WORKDIR /usr/local/wwspecdemo
COPY app.py .
COPY start.sh .
RUN chmod +x start.sh

# SDK file (wwspecapisdk.so) must be placed in sdk/ directory
# Download from: https://developer.work.weixin.qq.com/document/path/100247
# Choose the Python 3.12 x86_64 version
COPY sdk/ /usr/local/wwspecdemo/sdk/

EXPOSE 8080

CMD ["/bin/sh", "/usr/local/wwspecdemo/start.sh"]
