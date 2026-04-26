#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云客CRM智能分析 - 企微数据与智能专区程序
===========================================
运行在企微安全沙箱中，通过专区SDK与企微后台交互，实现：
  1. sync_msg      - 获取会话记录（通过SDK拉取加密消息）
  2. chat_analysis - 会话智能分析（情感/意向/关键词/摘要/标签）
  3. do_async_job  - 接收回调通知并转发给应用后台

协议规范参考:
  - 专区程序开发指引: https://developer.work.weixin.qq.com/document/path/99948
  - 专区程序示例:     https://developer.work.weixin.qq.com/document/path/100051
  - 镜像文件配置指引: https://developer.work.weixin.qq.com/document/path/99872
"""

import json
import sys
import os
import time
import traceback
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from collections import defaultdict

# ==================== 专区SDK加载 ====================
# 企微官方SDK: 从 https://developer.work.weixin.qq.com/document/path/100247 下载
# 放置到 /usr/local/wwspecdemo/sdk/ 目录下

SDK_AVAILABLE = False
try:
    sdk_path = '/usr/local/wwspecdemo/sdk'
    if os.path.exists(sdk_path):
        sys.path.insert(0, sdk_path)
    from wwspecsdk import specsdkinvoke, specsdkverify
    SDK_AVAILABLE = True
    _log_prefix = "[INFO]"
except ImportError:
    _log_prefix = "[WARN]"
    specsdkinvoke = None
    specsdkverify = None


# ==================== 日志工具 ====================
# 企微专区要求的日志格式: [级别] 内容

def log_info(msg):
    sys.stdout.write(f"[INFO] [YunkeCRM] {msg}\n")
    sys.stdout.flush()

def log_warn(msg):
    sys.stdout.write(f"[WARN] [YunkeCRM] {msg}\n")
    sys.stdout.flush()

def log_error(msg):
    sys.stderr.write(f"[ERROR] [YunkeCRM] {msg}\n")
    sys.stderr.flush()

def log_debug(msg):
    sys.stdout.write(f"[DEBUG] [YunkeCRM] {msg}\n")
    sys.stdout.flush()


# ==================== 回调数据暂存 ====================
# 用于存储企微后台回调通知的数据，应用后台可通过 notify_id 来查询
callback_store = {}


# ==================== 分析引擎 ====================

class ChatAnalyzer:
    """会话智能分析引擎"""

    # 情感词典
    POSITIVE_WORDS = [
        "好的", "谢谢", "满意", "不错", "可以", "喜欢", "感谢", "棒", "优秀",
        "很好", "挺好", "支持", "推荐", "方便", "划算", "合适", "赞", "完美",
        "满分", "期待", "开心", "高兴", "愉快", "放心", "信任", "专业"
    ]
    NEGATIVE_WORDS = [
        "不好", "差", "退款", "投诉", "不满", "问题", "故障", "慢", "贵",
        "差劲", "垃圾", "骗", "假", "坑", "怒", "生气", "失望", "后悔",
        "太差", "没用", "敷衍", "不行", "糟糕", "恶心", "离谱", "过分"
    ]

    # 意向词典
    BUY_WORDS = ["买", "购买", "下单", "价格", "多少钱", "优惠", "折扣", "报价",
                 "付款", "订购", "要", "拿", "开票", "发货", "成交", "合同"]
    CONSULT_WORDS = ["怎么", "如何", "什么", "请问", "咨询", "了解", "介绍", "说明",
                     "功能", "区别", "比较", "推荐", "建议", "方案"]
    COMPLAIN_WORDS = ["投诉", "退款", "不满", "差评", "举报", "赔偿", "维权",
                      "12315", "工商", "消协", "律师", "法院"]
    FOLLOWUP_WORDS = ["考虑", "再看看", "想想", "比较一下", "回头", "改天",
                      "不急", "下次", "以后再说", "先这样"]

    # 标签规则
    TAG_RULES = {
        "高意向客户": ["想买", "下单", "付款", "购买", "成交", "签合同", "开票"],
        "价格敏感": ["太贵", "便宜", "优惠", "折扣", "价格", "预算"],
        "售后需求": ["退款", "换货", "维修", "售后", "保修", "质保"],
        "新客咨询": ["第一次", "刚了解", "新客户", "朋友推荐"],
        "活跃客户": [],  # 基于消息频率判断
        "沉默客户": [],  # 基于消息间隔判断
    }

    @classmethod
    def analyze_message(cls, content, msg_meta=None):
        """分析单条消息"""
        if not content:
            return cls._empty_result(msg_meta)

        text = content if isinstance(content, str) else str(content)

        sentiment = cls._detect_sentiment(text)
        intent = cls._detect_intent(text)
        score = cls._calculate_score(text, sentiment, intent)
        keywords = cls._extract_keywords(text)
        summary = cls._generate_summary(text)
        tags = cls._suggest_tags(text, sentiment, intent)

        return {
            "chat_id": (msg_meta or {}).get("chatid", ""),
            "sentiment": sentiment,
            "intent": intent,
            "score": score,
            "keywords": keywords,
            "summary": summary,
            "suggested_tags": tags
        }

    @classmethod
    def analyze_conversation(cls, messages):
        """分析整个会话（多条消息汇总）"""
        if not messages:
            return cls._empty_result()

        all_text = " ".join([
            m.get("content", "") for m in messages
            if isinstance(m.get("content"), str)
        ])

        # 汇总情感
        sentiments = defaultdict(int)
        intents = defaultdict(int)
        all_keywords = []

        for msg in messages:
            content = msg.get("content", "")
            if not content:
                continue
            s = cls._detect_sentiment(content)
            i = cls._detect_intent(content)
            sentiments[s] += 1
            intents[i] += 1
            all_keywords.extend(cls._extract_keywords(content))

        # 主要情感 = 出现次数最多的
        main_sentiment = max(sentiments, key=sentiments.get) if sentiments else "neutral"
        main_intent = max(intents, key=intents.get) if intents else "一般沟通"

        # 去重关键词，保留前5个
        seen = set()
        unique_keywords = []
        for kw in all_keywords:
            if kw not in seen and len(kw) >= 2:
                seen.add(kw)
                unique_keywords.append(kw)
                if len(unique_keywords) >= 5:
                    break

        score = cls._calculate_score(all_text, main_sentiment, main_intent)
        summary = cls._generate_summary(all_text)
        tags = cls._suggest_tags(all_text, main_sentiment, main_intent)

        return {
            "chat_id": messages[0].get("chatid", "") if messages else "",
            "sentiment": main_sentiment,
            "intent": main_intent,
            "score": score,
            "keywords": unique_keywords,
            "summary": summary,
            "suggested_tags": tags,
            "message_count": len(messages),
            "sentiment_distribution": dict(sentiments),
            "intent_distribution": dict(intents)
        }

    @classmethod
    def _detect_sentiment(cls, text):
        neg_count = sum(1 for w in cls.NEGATIVE_WORDS if w in text)
        pos_count = sum(1 for w in cls.POSITIVE_WORDS if w in text)
        if neg_count > pos_count:
            return "negative"
        elif pos_count > neg_count:
            return "positive"
        return "neutral"

    @classmethod
    def _detect_intent(cls, text):
        scores = {
            "投诉": sum(1 for w in cls.COMPLAIN_WORDS if w in text) * 3,
            "购买意向": sum(1 for w in cls.BUY_WORDS if w in text) * 2,
            "咨询": sum(1 for w in cls.CONSULT_WORDS if w in text),
            "待跟进": sum(1 for w in cls.FOLLOWUP_WORDS if w in text),
        }
        best = max(scores, key=scores.get)
        return best if scores[best] > 0 else "一般沟通"

    @classmethod
    def _calculate_score(cls, text, sentiment, intent):
        """计算综合评分 (0-100)"""
        base = 60
        if sentiment == "positive":
            base += 20
        elif sentiment == "negative":
            base -= 15
        if intent == "购买意向":
            base += 15
        elif intent == "投诉":
            base -= 10
        elif intent == "待跟进":
            base += 5
        return max(0, min(100, base))

    @classmethod
    def _extract_keywords(cls, text):
        """提取关键词"""
        if not text:
            return []
        # 基于标点分词 + 过滤短词
        segments = re.split(r'[，。！？、\s,.\n\r]+', text)
        keywords = []
        for seg in segments:
            seg = seg.strip()
            if 2 <= len(seg) <= 8:
                keywords.append(seg)
        return keywords[:5]

    @classmethod
    def _generate_summary(cls, text):
        """生成摘要"""
        if not text:
            return ""
        # 取前200字符，按句号截断
        truncated = text[:200]
        last_period = max(truncated.rfind("。"), truncated.rfind("！"), truncated.rfind("？"))
        if last_period > 20:
            return truncated[:last_period + 1]
        return truncated + ("..." if len(text) > 200 else "")

    @classmethod
    def _suggest_tags(cls, text, sentiment, intent):
        """推荐标签"""
        tags = []
        for tag_name, keywords in cls.TAG_RULES.items():
            if keywords and any(kw in text for kw in keywords):
                tags.append(tag_name)
        # 基于分析结果追加标签
        if intent == "购买意向" and sentiment == "positive":
            if "高意向客户" not in tags:
                tags.append("高意向客户")
        if intent == "投诉":
            if "售后需求" not in tags:
                tags.append("售后需求")
        return tags[:5]

    @classmethod
    def _empty_result(cls, meta=None):
        return {
            "chat_id": (meta or {}).get("chatid", ""),
            "sentiment": "neutral",
            "intent": "一般沟通",
            "score": 50,
            "keywords": [],
            "summary": "",
            "suggested_tags": []
        }


# ==================== 能力处理器 ====================

def handle_sync_msg(func_req):
    """
    处理 sync_msg - 获取会话记录
    通过专区SDK调用企微后台获取会话消息
    """
    cursor = func_req.get("cursor", "")
    token = func_req.get("token", "")
    limit = func_req.get("limit", 200)

    if not SDK_AVAILABLE:
        return {
            "errcode": -1,
            "errmsg": "专区SDK未加载，无法拉取会话记录。请确保SDK已正确放置。"
        }

    try:
        # 调用专区SDK获取会话记录
        req_data = json.dumps({
            "token": token,
            "cursor": cursor,
            "limit": limit
        })
        resp = specsdkinvoke.invoke("sync_msg", req_data)
        result = json.loads(resp)
        log_info(f"sync_msg 成功: has_more={result.get('has_more')}, "
                 f"msg_count={len(result.get('msg_list', []))}")
        return result
    except Exception as e:
        log_error(f"sync_msg 失败: {e}")
        return {"errcode": -1, "errmsg": str(e)}


def handle_chat_analysis(func_req):
    """
    处理 chat_analysis - 会话智能分析
    对输入的会话数据执行情感分析、意向识别、关键词提取、摘要生成、标签推荐

    输入协议:
    {
        "corpid": "企业ID",
        "chat_type": "single/group",
        "start_time": 1668355200,
        "end_time": 1668528000,
        "userid": "发送者ID",
        "limit": 50,
        "cursor": "CURSOR"
    }

    输出协议:
    {
        "errcode": 0, "errmsg": "ok",
        "has_more": 0, "next_cursor": "CURSOR",
        "analysis_list": [{
            "chat_id": "会话ID",
            "sentiment": "positive/negative/neutral",
            "intent": "购买意向/咨询/投诉",
            "score": 85,
            "keywords": ["关键词1", "关键词2"],
            "summary": "会话摘要内容",
            "suggested_tags": ["标签1", "标签2"]
        }]
    }
    """
    corpid = func_req.get("corpid", "")
    chat_type = func_req.get("chat_type", "single")
    start_time = func_req.get("start_time", 0)
    end_time = func_req.get("end_time", 0)
    userid = func_req.get("userid", "")
    limit = func_req.get("limit", 50)
    cursor = func_req.get("cursor", "")

    log_info(f"chat_analysis 请求: corpid={corpid}, chat_type={chat_type}, "
             f"userid={userid}, limit={limit}")

    analysis_list = []

    # 场景1: 如果请求中直接携带了消息列表（应用主动传入待分析的消息）
    msg_list = func_req.get("msg_list", [])
    if msg_list:
        for msg in msg_list:
            content = msg.get("content", "")
            result = ChatAnalyzer.analyze_message(content, msg)
            analysis_list.append(result)

        return {
            "errcode": 0,
            "errmsg": "ok",
            "has_more": 0,
            "next_cursor": "",
            "analysis_list": analysis_list
        }

    # 场景2: 通过SDK主动拉取会话记录并分析
    if SDK_AVAILABLE and (start_time or userid):
        try:
            # 使用SDK拉取会话记录
            sync_req = json.dumps({
                "cursor": cursor,
                "limit": limit
            })
            resp = specsdkinvoke.invoke("sync_msg", sync_req)
            sync_result = json.loads(resp)

            if sync_result.get("errcode", 0) == 0:
                fetched_msgs = sync_result.get("msg_list", [])
                log_info(f"chat_analysis: 拉取到 {len(fetched_msgs)} 条消息")

                # 按会话分组分析
                conversations = defaultdict(list)
                for msg in fetched_msgs:
                    chat_id = msg.get("chatid", msg.get("msgid", "unknown"))
                    conversations[chat_id].append(msg)

                for chat_id, msgs in conversations.items():
                    result = ChatAnalyzer.analyze_conversation(msgs)
                    result["chat_id"] = chat_id
                    analysis_list.append(result)

                return {
                    "errcode": 0,
                    "errmsg": "ok",
                    "has_more": sync_result.get("has_more", 0),
                    "next_cursor": sync_result.get("next_cursor", ""),
                    "analysis_list": analysis_list
                }
        except Exception as e:
            log_error(f"chat_analysis SDK拉取失败: {e}")
            # 降级返回空结果
            return {
                "errcode": 0,
                "errmsg": f"SDK拉取消息失败: {e}",
                "has_more": 0,
                "next_cursor": "",
                "analysis_list": []
            }

    # 场景3: 无SDK，无消息列表，返回空结果
    return {
        "errcode": 0,
        "errmsg": "ok",
        "has_more": 0,
        "next_cursor": "",
        "analysis_list": analysis_list
    }


def handle_do_async_job(func_req):
    """
    处理 do_async_job - 获取回调数据
    应用后台收到专区通知后，通过 notify_id 查询之前缓存的回调数据
    """
    notify_id = func_req.get("notify_id", "")

    if notify_id and notify_id in callback_store:
        data = callback_store.pop(notify_id)
        log_info(f"do_async_job: 返回 notify_id={notify_id} 的回调数据")
        return {
            "errcode": 0,
            "errmsg": "ok",
            **data
        }

    log_warn(f"do_async_job: notify_id={notify_id} 未找到数据")
    return {
        "errcode": 0,
        "errmsg": "no data for notify_id",
        "event_type": "",
    }


# ==================== HTTP服务 ====================

class ZoneProgramHandler(BaseHTTPRequestHandler):
    """
    企微专区程序HTTP处理器
    监听8080端口，接收两类请求:
    1. 应用同步调用: 通过func字段分发到不同处理器
    2. 企微后台回调: 需SDK验签解密
    """

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            # 尝试解析为JSON（应用同步调用）
            request_data = json.loads(body.decode('utf-8'))
            result = self.dispatch_request(request_data)
            self._send_json(200, result)
        except json.JSONDecodeError:
            # 非JSON请求 → 可能是企微后台的加密回调
            result = self.handle_encrypted_callback(body)
            self._send_json(200, result)
        except Exception as e:
            log_error(f"请求处理异常: {e}\n{traceback.format_exc()}")
            self._send_json(200, {"errcode": -1, "errmsg": str(e)})

    def do_GET(self):
        """健康检查"""
        self._send_json(200, {
            "status": "ok",
            "service": "yunke-crm-analysis",
            "version": "2.0.0",
            "sdk_available": SDK_AVAILABLE,
            "capabilities": ["sync_msg", "chat_analysis", "do_async_job"],
            "timestamp": int(time.time())
        })

    def dispatch_request(self, data):
        """
        分发请求到对应处理器
        输入协议: { "input": { "func": "xxx", "func_req": { ... } } }
        """
        input_data = data.get("input", data)
        func = input_data.get("func", "")
        func_req = input_data.get("func_req", {})

        log_info(f"收到请求: func={func}, keys={list(func_req.keys())}")

        if func == "sync_msg":
            return handle_sync_msg(func_req)
        elif func == "chat_analysis":
            return handle_chat_analysis(func_req)
        elif func == "do_async_job":
            return handle_do_async_job(func_req)
        else:
            # 兼容直接传入分析数据（不通过func路由）
            if "msg_list" in data or "corpid" in data:
                return handle_chat_analysis(data)
            log_warn(f"未知func: {func}")
            return {"errcode": -1, "errmsg": f"未知能力: {func}"}

    def handle_encrypted_callback(self, raw_body):
        """
        处理企微后台的加密回调
        需使用专区SDK进行验签和解密
        """
        if not SDK_AVAILABLE:
            log_warn("收到加密回调但SDK不可用")
            return {"errcode": -1, "errmsg": "SDK不可用，无法处理加密回调"}

        try:
            # 1. 使用SDK验签解密
            query_string = self.path.split('?', 1)[1] if '?' in self.path else ''
            decrypted = specsdkverify.verify_and_decrypt(query_string, raw_body)
            callback_data = json.loads(decrypted)

            event_type = callback_data.get("event_type", "")
            log_info(f"收到企微回调: event_type={event_type}")

            # 2. 处理不同的回调事件
            if event_type == "conversation_new_message":
                # 新会话消息 → 存储token, 通知应用后台来拉取
                token = callback_data.get("conversation_new_message", {}).get("token", "")
                if token:
                    self._notify_app_new_message(token, callback_data)

            elif event_type == "chat_archive_audit_approved_single":
                # 会话存档同意事件
                log_info(f"用户同意会话存档: {callback_data.get('chat_archive_audit_approved', {})}")

            elif event_type == "hit_keyword":
                # 命中关键词
                log_info(f"命中关键词规则: {callback_data.get('hit_keyword', {})}")

            elif event_type == "chat_archive_export_finished":
                # 会话导出完成
                log_info(f"会话导出完成: {callback_data.get('chat_archive_export_finished', {})}")

            # 3. 构造加密回包
            resp_data = json.dumps({"errcode": 0, "errmsg": "ok"})
            encrypted_resp = specsdkverify.encrypt_and_sign(resp_data)
            return json.loads(encrypted_resp)

        except Exception as e:
            log_error(f"处理加密回调失败: {e}\n{traceback.format_exc()}")
            return {"errcode": -1, "errmsg": str(e)}

    def _notify_app_new_message(self, token, callback_data):
        """通知应用后台有新消息（通过SDK的spec_notify_app）"""
        if not SDK_AVAILABLE:
            return

        try:
            # 调用SDK通知应用
            notify_resp = specsdkinvoke.invoke("spec_notify_app", "{}")
            notify_result = json.loads(notify_resp)
            notify_id = notify_result.get("notify_id", "")

            if notify_id:
                # 将token和回调数据缓存，等应用来查询
                callback_store[notify_id] = {
                    "event_type": "conversation_new_message",
                    "token": token,
                    "timestamp": int(time.time()),
                    "raw_data": callback_data
                }
                log_info(f"已通知应用, notify_id={notify_id}")

                # 清理过期的缓存（超过1小时的）
                expired = [k for k, v in callback_store.items()
                          if time.time() - v.get("timestamp", 0) > 3600]
                for k in expired:
                    del callback_store[k]

        except Exception as e:
            log_error(f"通知应用失败: {e}")

    def _send_json(self, status, data):
        """发送JSON响应"""
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        """覆盖默认日志格式"""
        if args:
            log_debug(f"HTTP {args[0] if len(args) > 0 else ''} "
                     f"{args[1] if len(args) > 1 else ''} "
                     f"{args[2] if len(args) > 2 else ''}")


# ==================== 启动入口 ====================

def main():
    port = int(os.environ.get("PORT", 8080))
    host = "0.0.0.0"

    log_info("=" * 60)
    log_info("云客CRM智能分析 - 企微数据与智能专区程序 v2.0.0")
    log_info("=" * 60)
    log_info(f"监听地址: {host}:{port}")
    log_info(f"专区SDK状态: {'已加载' if SDK_AVAILABLE else '未加载（本地调试模式）'}")
    log_info(f"已注册能力: sync_msg, chat_analysis, do_async_job")
    log_info("=" * 60)

    server = HTTPServer((host, port), ZoneProgramHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log_info("服务停止")
        server.server_close()


if __name__ == "__main__":
    main()
