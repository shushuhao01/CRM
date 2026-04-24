"""
企微数据与智能专区 - 会话智能分析程序
运行在企微安全沙箱环境中，分析企业会话数据
"""
import json
import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler


class AnalysisHandler(BaseHTTPRequestHandler):
    """处理企微平台发来的分析请求"""

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            request_data = json.loads(body.decode('utf-8'))
            result = self.analyze(request_data)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, ensure_ascii=False).encode('utf-8'))
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            error_resp = {"errcode": -1, "errmsg": str(e)}
            self.wfile.write(json.dumps(error_resp).encode('utf-8'))

    def do_GET(self):
        """健康检查"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"status":"ok","service":"yunke-crm-analysis"}')

    def analyze(self, data):
        """
        会话智能分析逻辑
        输入: 企微推送的会话数据
        输出: 分析结果(情感/意向/关键词/摘要/标签)
        """
        # 基础分析逻辑（后续可对接我们自己的AI服务增强）
        analysis_list = []

        messages = data.get("msg_list", [])
        for msg in messages:
            content = msg.get("content", "")
            analysis = {
                "chat_id": msg.get("msgid", ""),
                "sentiment": self.detect_sentiment(content),
                "intent": self.detect_intent(content),
                "score": 70,
                "keywords": self.extract_keywords(content),
                "summary": content[:100] if content else "",
                "suggested_tags": []
            }
            analysis_list.append(analysis)

        return {
            "errcode": 0,
            "errmsg": "ok",
            "has_more": 0,
            "next_cursor": "",
            "analysis_list": analysis_list
        }

    def detect_sentiment(self, text):
        """简单情感检测"""
        positive_words = ["好的", "谢谢", "满意", "不错", "可以", "喜欢", "感谢"]
        negative_words = ["不好", "差", "退款", "投诉", "不满", "问题", "故障"]
        for w in negative_words:
            if w in text:
                return "negative"
        for w in positive_words:
            if w in text:
                return "positive"
        return "neutral"

    def detect_intent(self, text):
        """简单意向检测"""
        buy_words = ["买", "购买", "下单", "价格", "多少钱", "优惠"]
        consult_words = ["怎么", "如何", "什么", "请问", "咨询"]
        complain_words = ["投诉", "退款", "不满", "差评"]
        for w in complain_words:
            if w in text:
                return "投诉"
        for w in buy_words:
            if w in text:
                return "购买意向"
        for w in consult_words:
            if w in text:
                return "咨询"
        return "一般沟通"

    def extract_keywords(self, text):
        """简单关键词提取"""
        if not text:
            return []
        # 按长度取前3个词作为简单关键词
        words = text.replace("，", " ").replace("。", " ").split()
        return words[:3] if words else []

    def log_message(self, format, *args):
        """日志输出"""
        sys.stdout.write(f"[YunkeCRM] {args[0]} {args[1]} {args[2]}\n")
        sys.stdout.flush()


def main():
    port = int(os.environ.get("PORT", 8080))
    server = HTTPServer(("0.0.0.0", port), AnalysisHandler)
    print(f"[YunkeCRM] 会话智能分析服务启动，端口: {port}")
    sys.stdout.flush()
    server.serve_forever()


if __name__ == "__main__":
    main()
