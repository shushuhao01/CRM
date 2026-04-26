# 云客CRM智能分析 - 企微数据与智能专区程序

## 概述

本程序运行在**企业微信数据与智能专区**的安全沙箱中，为云客CRM提供会话存档的智能分析服务。

### 已实现的能力

| 能力ID | 名称 | 说明 |
|--------|------|------|
| `sync_msg` | 获取会话记录 | 通过专区SDK拉取企业会话消息 |
| `chat_analysis` | 会话智能分析 | 情感分析、意向识别、关键词提取、摘要生成、标签推荐 |
| `do_async_job` | 获取回调数据 | 接收企微后台事件通知，应用后台通过notify_id查询 |

---

## 快速开始

### 前置条件

- Docker 已安装（[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)）
- 企微服务商助手已配置好应用
- （可选）已下载企微专区Python SDK

### 1. 下载企微专区SDK（推荐）

从企微官方下载SDK放到 `sdk/` 目录下：

```
下载地址: https://developer.work.weixin.qq.com/document/path/100247
文件: python_sdk_1.2.3.zip
```

解压后目录结构应为：
```
wecom-program/
├── app.py
├── start.sh
├── Dockerfile
├── build.sh / build.bat
└── sdk/
    └── wwspecsdk/         ← SDK解压后的目录
        ├── __init__.py
        ├── specsdkinvoke.py (或.so)
        └── specsdkverify.py (或.so)
```

> **注意：** 不放SDK也可以构建，程序会以"本地分析模式"运行，`chat_analysis` 的本地分析功能正常，但 `sync_msg` 和加密回调处理不可用。

### 2. 构建镜像

**Windows:**
```cmd
cd wecom-program
build.bat
```

**Linux/Mac/Git Bash:**
```bash
cd wecom-program
chmod +x build.sh
./build.sh
```

构建完成后会生成 `yunke-crm-analysis-2.0.0.tar` 文件。

### 3. 上传到企微服务商后台

路径：`桌面端服务商助手 → 工具 → 数据与智能专区` 或 `服务商后台 → 应用管理 → 数据专区 → 数据与智能专区`

在程序的**镜像文件配置**弹窗中填写：

| 字段 | 值 |
|------|-----|
| **镜像文件** | 上传 `yunke-crm-analysis-2.0.0.tar` |
| **启动命令** | `/bin/sh` |
| **启动参数** | `/usr/local/wwspecdemo/start.sh` |

### 4. 配置程序能力

在「程序能力」中添加以下能力：

#### 能力1: 获取会话记录 (sync_msg)

- **能力名称:** 获取会话记录
- **能力ID:** `sync_msg`
- **输入协议:**
```json
{
  "input": {
    "func": "sync_msg",
    "func_req": {
      "cursor": "CURSOR",
      "token": "TOKEN",
      "limit": 200
    }
  }
}
```
- **输出协议:**
```json
{
  "errcode": 0,
  "errmsg": "ok",
  "has_more": 1,
  "next_cursor": "CURSOR",
  "msg_list": [...]
}
```

#### 能力2: 会话智能分析 (chat_analysis)

- **能力名称:** 会话智能分析
- **能力ID:** `chat_analysis`
- **输入协议:**
```json
{
  "input": {
    "func": "chat_analysis",
    "func_req": {
      "corpid": "企业ID",
      "chat_type": "single",
      "userid": "发送者ID",
      "limit": 50,
      "cursor": "",
      "msg_list": [
        {"msgid": "xxx", "chatid": "xxx", "content": "消息内容"}
      ]
    }
  }
}
```
- **输出协议:**
```json
{
  "errcode": 0,
  "errmsg": "ok",
  "has_more": 0,
  "next_cursor": "",
  "analysis_list": [
    {
      "chat_id": "会话ID",
      "sentiment": "positive",
      "intent": "购买意向",
      "score": 85,
      "keywords": ["产品", "优惠"],
      "summary": "客户对产品感兴趣，询问优惠方案",
      "suggested_tags": ["高意向客户"]
    }
  ]
}
```

#### 能力3: 获取回调数据 (do_async_job)

- **能力名称:** 获取回调数据
- **能力ID:** `do_async_job`
- **输入协议:**
```json
{
  "input": {
    "func": "do_async_job",
    "func_req": {
      "notify_id": "NOTIFY_ID"
    }
  }
}
```
- **输出协议:**
```json
{
  "errcode": 0,
  "errmsg": "ok",
  "event_type": "conversation_new_message",
  "token": "TOKEN"
}
```

---

## 完整上线流程

```
1. ✅ 构建镜像并上传
2. ✅ 配置程序能力（sync_msg / chat_analysis / do_async_job）
3. 在应用权限中勾选「数据与智能专区权限」
4. 设置使用的程序 → 选择「云客CRM智能分析」
5. 提交审核
6. 审核通过后 → 部署上线
7. 企业安装应用 → 授权专区权限
8. 企业开启「企业会话内容」
9. 调用设置公钥接口（为每个企业设置不同RSA公钥）
10. 应用通过API调用专区程序
```

---

## 本地调试

```bash
# 直接运行（不需要Docker）
cd wecom-program
python3 app.py

# 测试健康检查
curl http://localhost:8080/

# 测试会话分析
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "func": "chat_analysis",
      "func_req": {
        "msg_list": [
          {"msgid": "1", "chatid": "c1", "content": "你好，请问这款产品多少钱？有优惠吗？"},
          {"msgid": "2", "chatid": "c1", "content": "好的谢谢，我想购买，怎么下单？"}
        ]
      }
    }
  }'
```

---

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                   企微数据与智能专区（安全沙箱）           │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │        云客CRM智能分析程序 (本镜像)               │   │
│  │                                                   │   │
│  │  app.py  ←── HTTP:8080 ←── 企微后台 / 应用调用   │   │
│  │    ├── sync_msg      → specsdkinvoke.invoke()    │   │
│  │    ├── chat_analysis → ChatAnalyzer 本地分析     │   │
│  │    └── do_async_job  → callback_store 查询       │   │
│  │                                                   │   │
│  │  ←── 企微回调 → specsdkverify 验签解密           │   │
│  │                  → spec_notify_app 通知应用       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │  企微专区SDK   │  │  企业会话数据  │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
            │                    ▲
            ▼                    │
┌──────────────────────────────────────────┐
│         云客CRM应用后台                    │
│  WecomChatArchiveService.ts              │
│  → 通过API调用专区程序                    │
│  → 接收专区通知 (notify_id)              │
│  → 拉取并展示会话分析结果                 │
└──────────────────────────────────────────┘
```

---

## 文件说明

| 文件 | 说明 |
|------|------|
| `app.py` | 主程序，包含HTTP服务、能力处理器、分析引擎 |
| `start.sh` | 启动脚本，配置环境变量并启动app.py |
| `Dockerfile` | Docker镜像构建文件 |
| `build.sh` | Linux/Mac 构建脚本 |
| `build.bat` | Windows 构建脚本 |
| `sdk/` | 企微专区SDK放置目录 |

---

## 参考文档

- [数据与智能专区概述](https://developer.work.weixin.qq.com/document/path/99864)
- [基本概念介绍](https://developer.work.weixin.qq.com/document/path/99918)
- [接入指引](https://developer.work.weixin.qq.com/document/path/99866)
- [专区程序开发指引](https://developer.work.weixin.qq.com/document/path/99948)
- [专区程序示例](https://developer.work.weixin.qq.com/document/path/100051)
- [镜像文件配置指引](https://developer.work.weixin.qq.com/document/path/99872)
- [专区程序SDK和示例下载](https://developer.work.weixin.qq.com/document/path/100247)
