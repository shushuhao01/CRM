# 物流公司API对接深度审查报告 — 圆通专项分析 + 全公司官方申请指南

> 审查日期：2026-07-09
> 审查范围：CRM 1.8.0 物流管理模块（Web 前端 `src/` + 后端 `backend/`）
> 审查性质：**只读审查，未修改任何代码**
> 调研来源：各快递公司官方开放平台、官方 SDK、公开对接文档（快递鸟/CSDN/华为云社区等第三方对接实录交叉验证）

---

## 一、结论速览（TL;DR）

**核心问题回答：「客户签约物流公司后，填入密钥就能像顺丰一样正常查询吗？」**

**答案：目前只有顺丰和申通可以，其余 7 家存在不同程度的实现偏差，填好配置大概率仍查不通。**

| 公司 | 代码 | 官方轨迹API实现 | 与官方规范核对结果 | 填好配置能否直接用 | 申请是否收费 |
|------|------|----------------|-------------------|-------------------|-------------|
| 顺丰 | SF | ✅ 完整 | ✅ 一致（丰桥规范） | ✅ **能（已生产验证）** | 免费注册，路由查询免费 |
| 申通 | STO | ✅ 完整 | ✅ 基本一致 | ✅ 大概率能 | 免费注册，需企业认证+商务确认 |
| 中通 | ZTO | ✅ 完整 | ⚠️ 签名算法存疑 | ⚠️ 存疑，需联调验证 | 免费注册，大客户导向 |
| **圆通** | **YTO** | ✅ 完整 | ❌ **网关地址+签名算法均与官方文档不符** | ❌ **大概率不能** | 免费注册，轨迹查询免费 |
| 韵达 | YD | ✅ 完整 | ❌ 接口地址与参数结构不符 | ❌ 大概率不能 | 免费注册，**需联系市场部建立合作** |
| 极兔 | JTSD | ✅ 完整 | ⚠️ 签名对，传输格式/字段名有差异 | ⚠️ 存疑 | 免费注册，企业认证 |
| EMS | EMS | ✅ 完整 | ❌ 官方现行平台已换代（SM4加密），代码完全不匹配 | ❌ **不能** | 面向协议客户（需签约） |
| 京东 | JD | ✅ 完整 | ❌ **缺少 OAuth2 access_token 环节** | ❌ **不能** | 接口免费，但必须签约京东物流 |
| 德邦 | DBL | ✅ 完整 | ❌ 签名拼接顺序与编码方式不符 | ❌ 大概率不能 | 免费，邮件申请对接账号 |

**兜底渠道**：系统内置了快递100 → 快递鸟的降级链路。只要配置了快递100企业版（按单计费约 0.05~0.1 元/单，有免费试用额度），**所有公司都能查到轨迹**，这是当前唯一可靠的"全公司通查"方案。

**重要澄清（关于付费）**：9 家官方开放平台**注册和轨迹查询接口本身基本都免费**，但都有一个共同前提——**企业营业执照实名认证**，且多数要求你是该快递公司的实际客户（有寄件业务/月结账户/与网点签约）。收费的是电子面单、下单等业务接口以及超量调用。换句话说：**客户只要真的和某家快递签了约（有月结客户编码），去对应开放平台申请轨迹查询密钥基本都是免费的**；没有业务往来而纯想查询，官方平台可能不批权限，那就只能走快递100等聚合平台（付费）。

---

## 二、系统现状架构（审查结果）

### 2.1 调用链

```
前端 Track.vue / LogisticsTraceDialog.vue / Order/Detail.vue
  → GET /api/v1/logistics/trace/query?trackingNo=&companyCode=&phone=
  → backend/src/routes/logistics/logisticsCompany.ts (L723)
  → LogisticsTraceService.queryTrace()  [backend/src/services/LogisticsTraceService.ts L107]
      ├─ 中文名→代码转换、单号自动识别公司
      ├─ getApiConfig(companyCode) ← 读 logistics_api_configs 表
      ├─ 官方API可用（enabled + appId + appSecret 齐全）→ switch 分发 9 家官方适配器
      ├─ 官方查询失败/无轨迹 → 快递100降级
      └─ 成功后回写 orders.logisticsStatus / latestLogisticsInfo
```

判定"官方API可用"的条件（L149）：`config.enabled && config.appId && config.appSecret`。

### 2.2 配置存储

- 表 `logistics_api_configs`（`database/schema.sql` L1498–1524）：`company_code`、`app_id`、`app_key`（中通专用第二密钥）、`app_secret`、`customer_id`、`api_url`、`api_environment`(sandbox/production)、`support_create_order`、`enabled`、`last_test_time/result/message`。
- 快递100配置存 `system_configs` 表（configKey=`kuaidi100_config`）。
- 前端配置入口：`/logistics/companies` → `Companies.vue` 表格「API配置」按钮 → `src/components/Logistics/LogisticsApiConfigDialog.vue`（按公司显示不同字段标签与配置指引）。

### 2.3 已实现/未实现功能

- ✅ 已实现：9 家官方轨迹查询、连接测试、快递100/快递鸟聚合降级、自动同步、轨迹展示时间线。
- ❌ 未实现：官方下单/取号（仅顺丰有骨架但配置未注入）、取消运单、电子面单API（当前打印为本地 HTML 仿真模板，见 `PrintLabelDialog.vue` L1072）、轨迹订阅推送（圆通回调有雏形但不可用，见问题清单）。

---

## 三、圆通专项深度分析（重点）

### 3.1 圆通官方开放平台是什么、要不要钱

- **官方平台**：https://open.yto.net.cn/ （圆通速递官方开放平台，注册入口 https://open.yto.net.cn/register）
- **收费情况**：
  - 注册开发者账号：**免费**
  - 物流轨迹查询接口（`yto.Marketing.WaybillTrace`）：**免费申请**，控制台自助添加
  - 电子面单/下单接口：需与当地圆通网点签约合作，面单费用与接口费分开核算；第三方渠道报价参考：按次计费或包年 1,500 ~ 80,000 元/年（按调用量分级，日均5000单的电商约2,500~4,000元/年）——**这是电子面单/大批量场景的费用，纯轨迹查询不涉及**
  - 前提条件：企业营业执照 + 法人身份信息完成企业认证

### 3.2 圆通官方申请步骤（可直接照做）

1. **注册**：访问 https://open.yto.net.cn/register，用企业邮箱注册账号。
2. **企业认证/成为开发者**：登录后进入「控制台 → 接口管理」，完善开发者信息（企业名称、营业执照、联系人），提交审核（一般1~3个工作日）。
3. **添加接口**：审核通过后，在「控制台 → 接口管理」中添加「**物流轨迹查询**」接口（方法名 `yto.Marketing.WaybillTrace`）。添加成功后平台会给出**该接口专属的**：
   - 测试地址 + 生产地址（**注意：地址末尾带客户专属路径后缀**，形如 `https://openapi.yto.net.cn/service/waybill_query/v1/{专属编码}`）
   - 客户编码（app_key）
   - 客户密钥（secret）
   - 方法名（method）和版本号（v，如 1.01）
   - user_id（开放平台注册的客户标识，形如 `open19341749`）
4. **沙箱联调**：用平台提供的测试地址（`opentestapi.yto.net.cn`，历史公开测试账号示例：客户编码 YTOTEST / 校验码 1QLlIZ）联调，验证签名与报文。
5. **申请上线**：联调通过后在控制台自助发起上线申请，切换到生产地址和生产密钥。
6. **（可选）轨迹推送**：如需圆通主动推送轨迹，在接口管理中申请「物流状态通知」并填写回调 URL。

### 3.3 圆通官方接口规范（多来源交叉验证）

- **传输**：HTTPS POST
- **请求参数**：`app_key`（客户编码）、`user_id`、`method`=`yto.Marketing.WaybillTrace`、`v`=`1.01`、`format`=JSON、`timestamp`、`param`、`sign`
- **param 格式**：`{"NUMBER":"YT2600216627986"}`（或数组形式 `[{"Number":"YT..."}]`，以控制台文档为准）
- **签名算法（官方文档原文）**：
  1. 拼接 `data = param + method + v`
  2. `sign = Base64( MD5( data + 客户密钥 ) )` — MD5 取 16 字节原始摘要再 Base64，**不是十六进制大写**
  3. 示例：data=`opentest`、密钥=`123456` → sign=`YLstCNa3x8ijQx16e/jqOA==`
- **返回**：JSON 数组，字段 `waybill_No`、`upload_Time`、`infoContent`（GOT已揽收/ARRIVAL已收入/DEPARTURE已发出/SENT_SCAN派件/SIGNED签收成功/FAILED签收失败/FORWARDING转寄/TMS_RETURN退回等）、`processInfo`、`city`、`district`、`weight`

### 3.4 当前 CRM 圆通实现与官方规范的差异（核心发现）

代码位置：`backend/src/services/LogisticsTraceService.ts` L917–990（`queryYTOTrace`）

| 项目 | 代码实现 | 官方规范 | 判定 |
|------|---------|---------|------|
| 网关地址 | 写死 `https://openapi.yto.net.cn/open/track_query/v1/query` | `https://openapi.yto.net.cn/service/waybill_query/v1/{客户专属后缀}`，**每个客户地址不同，从控制台获取** | ❌ **路径不符且未使用客户专属后缀；公开资料中查不到 `/open/track_query/v1/query` 这个路径** |
| 签名算法 | `MD5(param + SecretKey)` 十六进制转大写 | `Base64(MD5(param + method + v + SecretKey))` | ❌ **两处不符：拼接内容少了 method+v，编码方式 hex大写 vs Base64** |
| 版本参数 v | 未传 | 必传（如 1.01） | ❌ 缺失 |
| param 内容 | `{"Number":"xx","OrderType":""}` | `{"NUMBER":"xx"}` | ⚠️ 字段大小写/多余字段，存疑 |
| config.apiUrl | DB 有 `api_url` 字段但代码**未读取**，URL 写死 | 客户专属地址必须可配置 | ❌ 即使用户在配置里填了正确地址也不生效 |
| 响应解析 | 期望 `data.success/data.code=='0'` + `data.traces` | 成功时直接返回**数组**，空结果返回 `{"code":"1001","success":"true",...}` | ❌ 解析逻辑与官方返回结构不匹配，即使请求成功也可能解析不出轨迹 |

**结论：圆通实现属于"看起来完整、实际大概率跑不通"。填好 AppKey/SecretKey/客户编码后，请求会因签名错误或路径 404 失败，然后静默降级到快递100（如已配置）——表面上"能查到"，实际走的不是圆通官方通道。** 必须拿到真实圆通密钥做一次联调，按控制台下发的专属地址和签名规则修正代码后才能真正投产。

### 3.5 圆通相关的其他遗留问题

1. **三套并存的圆通代码**：主路径 `LogisticsTraceService.queryYTOTrace`、遗留服务 `backend/src/services/ytoExpressService.ts`（旧网关规范、签名为参数排序 MD5 大写、路由 `/api/v1/yto-express/*` 仍挂载但无前端引用）、废弃组件 `YTOExpressConfigDialog.vue`（用旧网关 `open.yto.net.cn/service`，全项目无引用）。三者签名规范互不相同，容易误导后续维护。
2. **圆通回调不可用**：`POST /api/v1/logistics/yto-callback`（`logisticsStatus.ts` L866–998）被 `logistics/index.ts` L15 的 `authenticateToken` JWT 中间件保护，**圆通服务器无法携带 JWT，推送永远进不来**；且回调无签名校验、无幂等处理。
3. 前端配置对话框（`LogisticsApiConfigDialog.vue` L269–299）中展示的圆通配置步骤和 API 地址与代码一致，但**与官方实际规范同样不符**（沿用了代码里的错误地址与签名说明），客户按指引配置后会以为配置错误。

---

## 四、其余各公司：官方申请指南 + 代码核对结果

### 4.1 顺丰速运（SF）— ✅ 生产可用（参照标准）

- **平台**：丰桥开放平台 https://open.sf-express.com/
- **收费**：注册免费；路由查询接口（`EXP_RECE_SEARCH_ROUTES`）免费（有日调用限额）；下单需月结账户。
- **申请**：注册 → 企业实名 → 创建应用 → 关联「路由查询接口」→ 沙箱联调 → 上线，获得顾客编码(partnerID)和校验码(checkword)。
- **代码核对**：`LogisticsTraceService.querySFTrace`（L451–551）签名 `Base64(MD5(URL编码msgData + timestamp + checkword))` 与丰桥规范一致，支持非本账号运单的手机号后四位校验（`checkPhoneNo`）。**已生产验证，无需改动。**
- 注意：遗留的 `sfExpressService.ts` 签名与主路径不一致且带 Mock 模式路由（`/enable-mock`），生产环境仍暴露，属于隐患（详见问题清单）。

### 4.2 中通快递（ZTO）— ⚠️ 需联调验证

- **平台**：中通开放平台 https://open.zto.com/ （注册 https://open.zto.com/#/register）
- **收费**：注册免费；大客户导向，轨迹查询需企业认证后申请；第三方资料称按调用量分层定价，具体以商务确认为准。
- **申请**：注册 → 企业认证 → 控制台「开发者对接」新建应用（获 AppKey/AppSecret）→ 添加「轨迹查询」服务 → **添加服务器 IP 白名单** → 沙箱联调 → 发布上线。companyId 和 key 在个人中心查看。
- **官方规范**：POST JSON；请求头 `x-appKey` + `x-datadigest`；**标准签名 = `Base64(MD5(请求body + appSecret))`**（也支持在控制台自定义为 SHA256/时间戳模式）；新版轨迹接口 `https://api.zto.com/zto.merchant.waybill.track.query`（参数 billCode，可带收件人手机后四位）。
- **代码核对**（L843–867）：网关用旧版 `japi.zto.com/traceInterfaceNewTraces`；签名用 **HMAC-SHA256+Base64**，与官方标准签名（MD5+Base64）**不一致**——除非客户在中通控制台把应用签名方式自定义为 SHA256 才可能匹配。请求头多了官方文档未要求的 `x-companyid`/`x-timestamp`（旧版 japi 接口确实用 x-companyid，此处新旧混用）。**判定：存疑，必须用真实密钥联调；建议联调时同时验证新版 api.zto.com 网关。**

### 4.3 申通快递（STO）— ✅ 大概率可用

- **平台**：申通开放平台 https://open.sto.cn/
- **收费**：注册免费；轨迹查询接口免费申请，但**正式投产一般需与申通签商务协议**（快递业务费率单独谈）。
- **申请**：注册 → 企业实名认证 → 创建应用（获 appkey/secretKey）→ 申请「物流详情」类接口（即时查询 `STO_TRACE_QUERY_COMMON`，或订阅推送 `STO_TRACE_PLATFORM_SUBSCRIBE`+回调）→ 测试环境联调（测试网关为 HTTP）→ 上线。
- **官方规范**：网关 `https://cloudinter-linkgateway.sto.cn/gateway/link.do`（测试 `http://cloudinter-linkgatewaytest.sto.cn/...`）；表单 POST：`content` + `data_digest` + `api_name` + `from_appkey/from_code/to_appkey/to_code`；签名 `Base64(MD5(content + secretKey))`。官方测试单号：777031922725111、772011975782987。
- **代码核对**（L992–1017）：网关、api_name、签名、参数结构均与官方一致，`to_appkey/to_code` 用 `sto_trace_query`。**判定：与官方规范匹配度最高，填好配置大概率可用，建议用官方测试单号先在沙箱验证。**

### 4.4 韵达速递（YD）— ❌ 大概率不可用

- **平台**：韵达开放平台 http://open.yundaex.com/ （文档镜像 https://yundaex.apifox.cn/）
- **收费**：注册免费；**轨迹查询接口权限需联系韵达市场营销中心建立合作后开通**（官方文档明示：021-39296012 或 zhangyu6211@yundaex.com，邮件说明合作内容与公司名）。有免费额度+超量阶梯计费的说法，以合作确认为准。
- **申请**：注册 → 企业认证 → 联系市场部确认合作 → 获取 app-key/app-secret → 联调（测试地址 `https://u-openapi.yundasys.com/{apiName}`，正式 `https://openapi.yundaex.com/{apiName}`）→ 上线。注意：韵达轨迹查询通常要求**运单先完成轨迹订阅**才能查到。
- **官方规范**：轨迹查询接口路径为 `/openapi/outer/logictis/query`；鉴权参数 `app-key`、`sign`、`req-time` 放**请求头**；业务参数 `mailno`。
- **代码核对**（L1050–1074）：代码 POST 到 `openapi.yundaex.com/api/queryTraceInfo`，参数（appkey/partner_id/timestamp/sign/request）全部放 body。**接口路径和参数承载方式均与官方文档不符，判定大概率不可用。**

### 4.5 极兔速递（JTSD）— ⚠️ 存疑

- **平台**：极兔开放平台 https://open.jtexpress.com.cn/ （注册 https://open.jtexpress.com.cn/#/register）
- **收费**：注册免费；企业认证后可申请轨迹查询（个人开发者权限受限）。
- **申请**：注册（建议企业邮箱）→ 完善开发者信息 → 企业认证 → 控制台「个人中心 → 添加应用」获取 **apiAccount** 和 **privateKey** → UAT 联调（`uat-openapi.jtexpress.com.cn`）→ 上线。
- **官方规范**：`digest = Base64(MD5(业务参数JSON + privateKey))`；传输为 **`application/x-www-form-urlencoded` 表单**；业务参数 JSON 字段需按字母序排列。
- **代码核对**（L1107–1131）：签名公式正确（Base64(MD5(data+privateKey))）；但 Content-Type 用了 **JSON** 而非官方要求的表单编码；账号字段用 `eccompanyid`（取 customerId||appId）而官方新平台以 `apiAccount` 鉴权。**判定：核心算法对，传输细节存疑，需联调修正。**

### 4.6 邮政EMS — ❌ 不可用（平台已换代）

- **平台**：中国邮政**国内协议客户API开放平台** https://api.ems.com.cn/ （老的 eis.11183.com.cn 体系已被替代）
- **收费**：面向**协议客户**——必须先与当地邮政/EMS签物流合作协议，由客户经理开通；接口费用按协议执行。
- **申请**：与邮政签约 → api.ems.com.cn 注册+企业实名（1~3个工作日审核）→ 控制台创建应用勾选「轨迹查询」权限 → 获取凭证。
- **官方现行规范**（关键差异）：轨迹接口 `https://api.ems.com.cn/amp-prod-api/f/amp/api/open`，参数 `apiCode=040001`（运单轨迹）、`senderNo`（协议客户号）、`authorization`（授权码）、`timeStamp`、`logitcsInterface`（**业务报文需 SM4 国密算法 ECB 加密**）。
- **代码核对**（L1164–1187）：代码 POST 到 `eis.11183.com.cn/openapi/mailTrack/query`，用 MD5 签名——**该地址与鉴权方式在现行官方体系中已查不到依据，且完全没有 SM4 加密实现。判定：不可用，需按新平台重写适配器。**

### 4.7 京东物流（JD）— ❌ 不可用（缺 OAuth 环节）

- **平台**：京东物流开放平台 https://open.jdl.com/ （云平台 cloud.jdl.com）
- **收费**：**开放平台接口调用不收费**（官方明示）；但必须**先与京东物流签约**获得商家编码（月结编码/青龙业主号），快递业务费用找销售确认；ISV 对接**需要软件著作权**；京东快递**无通用沙箱**，需借用已签约商家编码在生产联调。
- **申请**：京东物流官网提交合作申请或联系附近京东物流站点签约 → 销售开通商家工作台账号 → open.jdl.com 创建应用（获 AppKey/AppSecret）→ 订阅对接方案并申请轨迹 API 权限 → **商家账号 OAuth2 授权换取 access_token**（`https://oauth.jdl.com/oauth/authorize?client_id=...`）→ 调用接口。
- **官方规范**：所有 ECAP 接口（含 `/ecap/v1/orders/trace/query`）必须携带 **access_token**（LOP 网关 OAuth2 插件签名），且授权账号必须是京东物流销售开通过权限的账号，否则报"PIN与商家编码不符"。
- **代码核对**（L1220–1246）：代码只做了 `MD5(secret+timestamp+data+secret)` 简易签名 POST，**完全没有 OAuth2 access_token 获取与携带逻辑。判定：必然被网关拒绝，不可用；需引入 OAuth 流程（含 token 存储与刷新）才能对接。**

### 4.8 德邦快递（DBL）— ❌ 大概率不可用

- **平台**：德邦开放平台（对接网关 dpapi.deppon.com）
- **收费**：申请免费；方式特殊——**在德邦开放平台下载《对接申请表》，填写后发邮件至 dpkhdj@deppon.com**，审核通过后邮件回复对接账号（appKey、companyCode、customerCode）。
- **官方规范**：表单 POST（`application/x-www-form-urlencoded`），字段 `companyCode`、`digest`、`timestamp`、`params`；**签名 = `Base64( MD5十六进制字符串( params + appkey + timestamp ).getBytes() )`**——即先取 MD5 的 hex 字符串再对该字符串 Base64。
- **代码核对**（L1292–1320）：代码拼接为 `appId + data + timestamp + appSecret`（顺序不对、多拼了前缀），且对 MD5 **原始字节** Base64（官方是对 hex 字符串 Base64），Content-Type 用 JSON 而非表单。**三处不符，判定大概率不可用。**
- 另注意：前端存在 `DBL`/`DB`/`DBKD` 三种德邦代码混用（`Companies.vue` L390 等），配置与查询可能对不上号。

---

## 五、完整问题清单（本次审查发现，未修改）

### A. 直接影响"配置即可用"目标的问题

| # | 严重度 | 问题 | 位置 |
|---|--------|------|------|
| A1 | 🔴 高 | 圆通网关路径、签名算法、param 格式、响应解析均与官方规范不符 | `LogisticsTraceService.ts` L917–990 |
| A2 | 🔴 高 | 圆通/各家均未读取 `config.apiUrl`，客户专属网关地址（圆通必需）无法生效 | 同上（URL 全部写死） |
| A3 | 🔴 高 | EMS 适配器基于已淘汰的 eis.11183.com.cn 体系，无 SM4 加密 | L1164–1187 |
| A4 | 🔴 高 | 京东适配器缺 OAuth2 access_token 全流程 | L1220–1246 |
| A5 | 🟠 中 | 韵达接口路径/参数承载方式与官方 apifox 文档不符 | L1050–1074 |
| A6 | 🟠 中 | 德邦签名拼接顺序与 Base64 编码对象不符，Content-Type 不符 | L1292–1320 |
| A7 | 🟠 中 | 中通签名用 HMAC-SHA256，官方标准签名为 MD5+Base64（除非控制台自定义） | L843–867 |
| A8 | 🟠 中 | 极兔 Content-Type 应为表单编码，账号字段应为 apiAccount | L1107–1131 |
| A9 | 🟠 中 | 前端配置对话框内嵌的各公司"配置步骤/签名说明"沿用了代码错误规范，会误导客户 | `src/components/Logistics/LogisticsApiConfigDialog.vue` |

### B. 架构与安全隐患

| # | 问题 | 位置 |
|---|------|------|
| B1 | 圆通回调路由被 JWT 中间件保护，外部推送不可达；无签名校验、无幂等 | `logistics/index.ts` L15 + `logisticsStatus.ts` L866–998 |
| B2 | 官方API失败会**静默降级**快递100，掩盖官方通道配置错误（测试时误判"已通"） | `LogisticsTraceService.ts` L232+ |
| B3 | 旧链路 `ExpressAPIService` 双降级失败后返回**模拟轨迹（假数据）** | `ExpressAPIService.ts` L112–114, L291–330 |
| B4 | 遗留服务 `ytoExpressService.ts`/`sfExpressService.ts` 与主路径签名规范冲突，且 SF Mock 路由生产暴露 | `sfExpress.ts` L177–227 等 |
| B5 | 废弃组件 `YTOExpressConfigDialog.vue`/`SFExpressConfigDialog.vue` 未删除（无引用） | `src/components/...` |
| B6 | 快递100 configKey 分裂：`kuaidi100_config` vs `kuaidi100` | `logisticsStatus.ts` L1010 vs `logisticsCompany.ts` L475 |
| B7 | 德邦代码 DB/DBL/DBKD 混用；百世 HTKY 前端可选但无官方适配器 | `Companies.vue` L390 等 |
| B8 | 顺丰下单接口未从配置表注入密钥、UI 无 supportCreateOrder 开关，下单功能实际不可用 | `logisticsStatus.ts` L2013–2052 |

---

## 六、给客户的申请密钥速查表（每家怎么拿到密钥）

| 公司 | 平台入口 | 拿到的凭证 | 关键动作 | 免费？ |
|------|---------|-----------|---------|--------|
| 顺丰 | open.sf-express.com | 顾客编码(partnerID) + 校验码(checkword) | 创建应用→关联路由查询接口→沙箱→上线 | ✅ 查询免费 |
| 圆通 | open.yto.net.cn | app_key + 密钥 + user_id + **专属接口地址** + method/v | 控制台接口管理添加「物流轨迹查询」 | ✅ 查询免费 |
| 中通 | open.zto.com | 企业ID(companyId) + AppKey + AppSecret | 企业认证→新建应用→添加服务→**IP白名单**→上线 | ✅ 注册免费，商务确认 |
| 申通 | open.sto.cn | appkey(from_appkey) + secretKey | 企业认证→创建应用→申请 STO_TRACE_QUERY_COMMON | ✅ 注册免费，商务协议 |
| 韵达 | open.yundaex.com | app-key + app-secret | **必须联系市场部** 021-39296012 / zhangyu6211@yundaex.com 建立合作 | ✅ 注册免费，合作制 |
| 极兔 | open.jtexpress.com.cn | apiAccount + privateKey | 企业认证→个人中心添加应用 | ✅ 免费 |
| EMS | api.ems.com.cn | senderNo(协议客户号) + 授权码 + SM4密钥 | **先与邮政签约**，客户经理协助开通 | 协议客户制 |
| 京东 | open.jdl.com | AppKey + AppSecret + 商家编码 + access_token | **先与京东物流签约**→创建应用→OAuth授权（ISV需软著） | ✅ 接口免费，业务签约 |
| 德邦 | 德邦开放平台 | appKey + companyCode + customerCode | 下载《对接申请表》邮件至 dpkhdj@deppon.com | ✅ 免费 |

---

## 七、建议的验收路径（后续修复时参考，本次未执行）

1. **优先级排序**：圆通（客户签约意向最高、当前偏差最大）→ 中通/申通（申通几乎可直接验收）→ 极兔/韵达/德邦 → EMS/京东（需大改，等有真实签约客户再做）。
2. **每家的验收标准**：用真实密钥在**沙箱**调通（关闭快递100降级或看日志确认走的是官方通道，避免 B2 静默降级造成误判）→ 生产环境用真实运单验证轨迹与状态映射 → 更新前端配置对话框中的指引文案。
3. **圆通具体修复要点**（改代码时）：改用控制台下发的专属地址（读取 `config.apiUrl`）、签名改为 `Base64(MD5(param+method+v+secret))`、补 `v` 参数、param 改 `{"NUMBER":...}`、响应按数组解析、回调路由移出 JWT 保护并加签名校验。
4. **通用建议**：在「测试连接」结果中明确显示走了哪个通道（官方/快递100/失败），并把 ExpressAPIService 的模拟数据降级在生产禁用，防止把假轨迹当真数据展示。

---

*本报告基于 2026-07-09 的代码快照与公开官方资料整理；各开放平台的接口细节以登录后控制台内的最新文档为最终依据（部分平台文档需登录才能查看完整版）。*
