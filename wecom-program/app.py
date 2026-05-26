#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云客CRM智能分析 - 企微数据与智能专区程序 v3.0.0
===========================================
基于官方SDK协议规范:
  - 专区程序开发指引: https://developer.work.weixin.qq.com/document/path/99948
  - 镜像文件配置指引: https://developer.work.weixin.qq.com/document/path/99872
  - SDK下载:          https://developer.work.weixin.qq.com/document/path/100247

SDK支持的Python版本: 3.6, 3.12
SDK模块: wwspecapisdk.so
导入: from wwspecapisdk import WWToSpecHTTPReqDecoder, WWToSpecHTTPRspConstructor,
                               ChatDataSDK, spec_log_info, spec_log_error
"""

import json
import sys
import os
import time
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler

# ==================== SDK 加载 ====================
SDK_AVAILABLE = False
_import_error = ""
ChatDataSDK = None
WWToSpecHTTPReqDecoder = None
WWToSpecHTTPRspConstructor = None
spec_log_info_fn = None
spec_log_error_fn = None

try:
    sdk_path = '/usr/local/wwspecdemo/sdk'
    if os.path.exists(sdk_path):
        sys.path.insert(0, sdk_path)

    from wwspecapisdk import (
        WWToSpecHTTPReqDecoder,
        WWToSpecHTTPRspConstructor,
        ChatDataSDK,
        spec_log_info as _spec_log_info,
        spec_log_error as _spec_log_error
    )
    spec_log_info_fn = _spec_log_info
    spec_log_error_fn = _spec_log_error
    SDK_AVAILABLE = True
except ImportError as e:
    _import_error = str(e)


# ==================== 日志工具 ====================

def log_info(msg):
    sys.stdout.write(f"[INFO] [YunkeCRM] {msg}\n")
    sys.stdout.flush()
    if SDK_AVAILABLE and spec_log_info_fn:
        try:
            spec_log_info_fn(f"[YunkeCRM] {msg}")
        except:
            pass

def log_error(msg):
    sys.stderr.write(f"[ERROR] [YunkeCRM] {msg}\n")
    sys.stderr.flush()
    if SDK_AVAILABLE and spec_log_error_fn:
        try:
            spec_log_error_fn(f"[YunkeCRM] {msg}")
        except:
            pass

def log_warn(msg):
    sys.stdout.write(f"[WARN] [YunkeCRM] {msg}\n")
    sys.stdout.flush()


# ==================== 业务处理 ====================

def handle_sync_msg(corpid, agentid, ability_id, job_info, func_req):
    """
    处理 sync_msg - 通过SDK拉取会话记录
    SDK接口: ChatDataSDK(corpid, agentid, ability_id, job_info).sync_msg(req)
    """
    if not SDK_AVAILABLE:
        return json.dumps({
            "errcode": -1,
            "errmsg": "SDK未加载，无法调用sync_msg"
        })

    try:
        # 过滤空字符串字段（企微SDK要求cursor/token若提供则不能为空）
        if isinstance(func_req, dict):
            clean_req = {k: v for k, v in func_req.items() if v != '' and v is not None}
            req_str = json.dumps(clean_req)
        else:
            req_str = str(func_req)

        log_info(f"sync_msg: corpid={corpid}, agentid={agentid}, ability_id={ability_id}, req={req_str[:200]}")

        sdk = ChatDataSDK(corpid, agentid, ability_id, job_info)
        result = sdk.sync_msg(req_str)

        log_info(f"sync_msg 成功: result_len={len(result) if result else 0}")
        return result
    except Exception as e:
        log_error(f"sync_msg 异常: {e}")
        return json.dumps({"errcode": -1, "errmsg": f"sync_msg调用失败: {str(e)}"})


def handle_get_msg_body(corpid, agentid, ability_id, job_info, func_req):
    """
    处理 get_msg_body - 通过SDK获取消息体内容
    SDK接口: ChatDataSDK(corpid, agentid, ability_id, job_info).get_msg_body(req)
    """
    if not SDK_AVAILABLE:
        return json.dumps({
            "errcode": -1,
            "errmsg": "SDK未加载，无法调用get_msg_body"
        })

    try:
        if isinstance(func_req, dict):
            clean_req = {k: v for k, v in func_req.items() if v != '' and v is not None}
            req_str = json.dumps(clean_req)
        else:
            req_str = str(func_req)

        log_info(f"get_msg_body: corpid={corpid}, ability_id={ability_id}, req={req_str[:100]}")

        sdk = ChatDataSDK(corpid, agentid, ability_id, job_info)
        result = sdk.get_msg_body(req_str)

        log_info(f"get_msg_body 成功: result_len={len(result) if result else 0}")
        return result
    except Exception as e:
        log_error(f"get_msg_body 异常: {e}")
        return json.dumps({"errcode": -1, "errmsg": f"get_msg_body调用失败: {str(e)}"})


def handle_chat_analysis(func_req):
    """处理 chat_analysis - 会话智能分析（不需要SDK，纯本地分析）"""
    msg_list = func_req.get("msg_list", []) if isinstance(func_req, dict) else []

    analysis_list = []
    for msg in msg_list:
        content = msg.get("content", "") if isinstance(msg, dict) else ""
        analysis_list.append({
            "chat_id": msg.get("chatid", "") if isinstance(msg, dict) else "",
            "sentiment": "neutral",
            "intent": "一般沟通",
            "score": 60,
            "keywords": [],
            "summary": content[:200] if content else "",
            "suggested_tags": []
        })

    return json.dumps({
        "errcode": 0,
        "errmsg": "ok",
        "has_more": 0,
        "next_cursor": "",
        "analysis_list": analysis_list
    })


def dispatch_request(corpid, agentid, ability_id, job_info, data_str):
    """
    分发请求到对应处理器
    data_str 是 sync_call_program 传入的 request_data (JSON string)
    """
    try:
        data = json.loads(data_str) if data_str else {}
    except json.JSONDecodeError:
        log_error(f"request_data JSON解析失败: {data_str[:200] if data_str else 'empty'}")
        return json.dumps({"errcode": -1, "errmsg": "request_data格式错误"})

    # 解析请求格式: {"input": {"func": "xxx", "func_req": {...}}}
    input_data = data.get("input", data)
    func = input_data.get("func", "")
    func_req = input_data.get("func_req", {})

    log_info(f"dispatch: func={func}, ability_id={ability_id}, corpid={corpid}")

    if func == "sync_msg":
        return handle_sync_msg(corpid, agentid, ability_id, job_info, func_req)
    elif func == "get_msg_body":
        return handle_get_msg_body(corpid, agentid, ability_id, job_info, func_req)
    elif func == "chat_analysis":
        return handle_chat_analysis(func_req)
    else:
        log_warn(f"未知func: {func}, 尝试作为sync_msg处理")
        return handle_sync_msg(corpid, agentid, ability_id, job_info, func_req or data)


# ==================== HTTP 服务 ====================

class ZoneProgramHandler(BaseHTTPRequestHandler):
    """
    企微专区程序HTTP处理器
    监听8080端口, 接收企微平台的加密请求, 使用SDK解密/加密通信
    """

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        if not SDK_AVAILABLE:
            # SDK未加载, 返回明文错误信息(方便本地调试)
            log_warn("收到POST请求但SDK未加载, 尝试明文处理(仅本地调试)")
            self._handle_plaintext(post_data)
            return

        try:
            # 1. 将HTTP headers转为SDK需要的list格式: [("Header-Name", "value"), ...]
            headers_list = []
            for key in self.headers:
                headers_list.append((key, self.headers[key]))

            post_data_str = post_data.decode('utf-8') if isinstance(post_data, bytes) else post_data

            # 2. 使用SDK验签解密
            req_decoder = WWToSpecHTTPReqDecoder(headers_list, post_data_str)

            # 3. 获取请求参数
            corpid = req_decoder.get_corpid()
            agentid = req_decoder.get_agentid()
            call_type = req_decoder.get_call_type()
            data = req_decoder.get_data()
            ability_id = req_decoder.get_ability_id()
            job_info = req_decoder.get_job_info()

            log_info(f"收到请求: call_type={call_type}, corpid={corpid}, "
                     f"agentid={agentid}, ability_id={ability_id}, data_len={len(data) if data else 0}")

            # 4. 处理请求
            if call_type == 1:
                # 来自应用调用专区的请求 (sync_call_program)
                response_data = dispatch_request(corpid, agentid, ability_id, job_info, data)
            elif call_type == 2:
                # 来自企微后台的回调事件
                response_data = self._handle_callback_event(data, corpid, agentid, ability_id, job_info)
            else:
                response_data = json.dumps({"errcode": 0, "errmsg": "ok"})

            # 5. 使用SDK加密回包
            rsp_constructor = WWToSpecHTTPRspConstructor(response_data)
            rsp_headers = rsp_constructor.get_normal_header()
            rsp_body = rsp_constructor.get_encoded_body()

            # 6. 发送加密响应
            self.send_response(200)
            for key, value in rsp_headers.items():
                self.send_header(key, value)
            self.end_headers()
            if isinstance(rsp_body, str):
                self.wfile.write(rsp_body.encode('utf-8'))
            else:
                self.wfile.write(rsp_body)

            log_info(f"请求处理完成, 响应长度={len(rsp_body) if rsp_body else 0}")

        except Exception as e:
            log_error(f"请求处理异常: {e}\n{traceback.format_exc()}")
            # 异常时也要返回SDK格式的错误响应
            try:
                error_rsp = json.dumps({"errcode": -1, "errmsg": str(e)})
                rsp_constructor = WWToSpecHTTPRspConstructor(error_rsp)
                rsp_headers = rsp_constructor.get_exception_header()
                rsp_body = rsp_constructor.get_encoded_body()
                self.send_response(200)
                for key, value in rsp_headers.items():
                    self.send_header(key, value)
                self.end_headers()
                if isinstance(rsp_body, str):
                    self.wfile.write(rsp_body.encode('utf-8'))
                else:
                    self.wfile.write(rsp_body)
            except Exception as e2:
                log_error(f"构造异常回包也失败: {e2}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"errcode": -1, "errmsg": "internal error"}).encode('utf-8'))

    def _handle_callback_event(self, data, corpid, agentid, ability_id, job_info):
        """处理企微后台回调事件"""
        try:
            event_data = json.loads(data) if isinstance(data, str) else data
            event_type = event_data.get("event_type", "")
            log_info(f"收到企微回调: event_type={event_type}")

            if event_type == "conversation_new_message":
                token = event_data.get("conversation_new_message", {}).get("token", "")
                log_info(f"新消息回调: token_len={len(token) if token else 0}")

            return json.dumps({"errcode": 0, "errmsg": "ok"})
        except Exception as e:
            log_error(f"处理回调事件失败: {e}")
            return json.dumps({"errcode": 0, "errmsg": "ok"})

    def _handle_plaintext(self, post_data):
        """本地调试模式: 处理明文JSON请求(SDK未加载时降级)"""
        try:
            data = json.loads(post_data.decode('utf-8'))
            input_data = data.get("input", data)
            func = input_data.get("func", "")
            func_req = input_data.get("func_req", {})

            if func == "chat_analysis":
                result = handle_chat_analysis(func_req)
            else:
                result = json.dumps({
                    "errcode": -1,
                    "errmsg": f"SDK未加载, {func}不可用。请确保wwspecapisdk.so在sdk/目录中。"
                })

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(result.encode('utf-8'))
        except Exception as e:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"errcode": -1, "errmsg": str(e)}).encode('utf-8'))

    def do_GET(self):
        """健康检查"""
        response = {
            "status": "ok",
            "service": "yunke-crm-analysis",
            "version": "3.0.0",
            "sdk_available": SDK_AVAILABLE,
            "sdk_module": "wwspecapisdk",
            "python_version": sys.version,
            "capabilities": ["sync_msg", "get_msg_body", "chat_analysis"],
            "timestamp": int(time.time())
        }
        if not SDK_AVAILABLE:
            response["sdk_error"] = _import_error or "unknown"

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))

    def log_message(self, format, *args):
        """覆盖默认日志"""
        pass


# ==================== 启动 ====================

def main():
    port = int(os.environ.get("PORT", 8080))
    host = "0.0.0.0"

    log_info("=" * 60)
    log_info("云客CRM智能分析 - 企微数据与智能专区程序 v3.0.0")
    log_info("=" * 60)
    log_info(f"Python版本: {sys.version}")
    log_info(f"监听地址: {host}:{port}")
    log_info(f"SDK模块: wwspecapisdk")

    if SDK_AVAILABLE:
        log_info("专区SDK状态: 已加载")
    else:
        log_warn("专区SDK状态: 未加载")
        log_warn(f"导入错误: {_import_error or 'unknown'}")
        log_warn("sync_msg/get_msg_body 将不可用")
        log_warn("请下载SDK: https://developer.work.weixin.qq.com/document/path/100247")

    log_info(f"已注册能力: sync_msg, get_msg_body, chat_analysis")
    log_info("=" * 60)

    server = HTTPServer((host, port), ZoneProgramHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log_info("服务停止")
        server.server_close()


if __name__ == "__main__":
    main()
