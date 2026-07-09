# 工作手机呼入号码显示、录音上传与登录提示问题分析报告

> **编写模型**：Claude Fable 5（Cursor Agent）
> **日期**：2026-07-09
> **范围**：服务管理模块 - 通话管理 - 工作手机呼入（CRM Web + crmAPP + backend）
> **约定**：本次仅做深入分析与方案输出，**未修改任何代码**

---

## 目录

1. [问题1：响铃时不显示来电号码，挂断后才补全](#问题1)
2. [回顾：之前为什么"能显示但会串号"](#回顾)
3. [问题2：OPPO 拨号应用开启自动录音后未检测到/未上传](#问题2)
4. [问题3：APP 登录密码错误等提示不正确](#问题3)
5. [修复优先级建议](#优先级)

---

<a id="问题1"></a>
## 一、问题1：响铃时不显示来电号码（未知客户），挂断后自动补全

### 1.1 现象

- 客户呼入工作手机，响铃期间 CRM 来电提醒弹窗与 APP 都显示"未知来电/未知客户"
- 挂断后号码能自动补全（通话记录里最终是对的）
- 荣耀、OPPO 两台手机均复现，且是**正式云打包**的最新应用

### 1.2 现有取号通道与代码位置（crmAPP/src/services/incomingCallService.ts）

| 通道 | 代码位置 | 响铃时能否拿到号码 |
|------|---------|------------------|
| ① PhoneStateListener 回调号码 | L353-375（`onCallStateChanged`，Android 12+ 使用 flags=544 含 LISTEN_PHONE_NUMBERS） | 取决于 ROM，见 1.3 |
| ② PHONE_STATE 广播 `incoming_number`（Activity + ApplicationContext 双注册） | L675-817、L826-866 | 取决于 ROM，见 1.3 |
| ③ CallLog ContentObserver + 300ms 轮询 | L960-1009（`startCallLogPolling`） | 绝大多数 ROM **通话结束后才写 CallLog**，响铃期查不到 |
| ④ 录音文件名解析 | L2260 起（`tryResolveCallerFromRecordingFile`） | **已被防串号修复主动禁用于响铃期**（L1020-1025：`lastPhoneState !== 1` 才允许） |
| ⑤ 后端 WS 推送 `ws:incoming_call` | L90-94 | 仅适用于云呼叫中心呼入，不适用于手机 SIM 直接来电 |

响铃无号码时的行为（L944-954 `quickResolveAndReport`）：先用"未知来电"立即弹窗上报，再靠 ③④ 轮询补号。挂断后由 `onIncomingCallEnded` 的结束流程解析号码并通过 `reportCallEnd` 上报，后端补全记录——这正好解释了"挂断就能看到号码"。

### 1.3 根因分析

**响铃期的两个"正规"通道（①②）在荣耀/OPPO 新系统上都被 ROM 拦截，而唯一还能在响铃期"看似出号"的通道④已被我们上一轮防串号修复合理地禁用了。**

分层拆解：

1. **Android 系统层限制（AOSP 规则）**
   - Android 9+：PHONE_STATE 广播的 `incoming_number` 只投递给持有 `READ_CALL_LOG` 的应用；
   - Android 10+：`PhoneStateListener.onCallStateChanged` 的 phoneNumber 参数同样要求 `READ_CALL_LOG`；
   - APK 清单已声明（`crmAPP/src/manifest.json` L32-34：READ_PHONE_STATE / READ_PHONE_NUMBERS / READ_CALL_LOG），运行时也逐个请求（incomingCallService L282-305）。**声明与请求本身没有问题。**

2. **国产 ROM AppOps 层拦截（本次的直接根因）**
   - 荣耀：之前的日志已证实该机 CallLog 查询全部返回 null（`diagnoseCallLogAccess` L490-556 的结论分支"权限已授予但系统拦截"），ROM 在 AppOps 层把"通话记录"权限降级为"每次询问/智能管控"，导致：
     - CallLog 查不到（通道③失效）；
     - 广播/监听器里的号码字段也被清空（通道①②失效）。
   - OPPO（ColorOS）：同样存在"权限已允许但默认不给号码"的行为。ColorOS 的"电话权限"与"通话记录权限"是两个独立开关，且部分版本还有"关联启动/后台弹窗"管控，任一未放开都会让第二条带号码的广播不投递。
   - **验证方法（无需改代码）**：来电时抓 APP 日志，看
     - `[IncomingCallService] Listener回调: ... number=[]` —— ① 被清空；
     - `[IncomingCallService] 广播: state=RINGING, number=null`，且 extras keySet 里没有 `incoming_number` —— ② 被拦截；
     - `[IncomingCallService] ❌ 所有 CallLog URI 和方式均不可用` 或轮询一直拿不到 —— ③ 失效。

3. **通道④被防串号修复禁用（行为变化的由来）**
   - `tryResolveNumber`（L1014-1028）现在明确：`lastPhoneState === 1`（响铃中）时不做录音文件名解析——因为本通电话接听前不可能有本通录音，能匹配到的必然是上一通的文件（这正是串号根源）。
   - 所以"以前响铃能出号"很多时候是**假阳性**（显示的是上一通号码），现在被修正为"响铃期宁缺毋滥"。

### 1.4 为什么挂断后能补全

挂断（IDLE）后：
- 大多数 ROM 此时才把本通写入 CallLog，`onIncomingCallEnded` 的解析循环（带 `[startTime, endTime]` 时间窗）能查到正确号码；
- 荣耀这类 CallLog 全封的机器，接听后产生的录音文件名（如 `134 2882 7364_20260625142304.amr`）带号码且时间戳落在本通窗口内，也能解析出来；
- 解析结果通过 `reportCallEnd`/`number_updated` 上报，后端 `MobileWebSocketService` 用 callId + 时间窗匹配更新记录，CRM 端刷新后看到号码。

### 1.5 可修复方案（按推荐度排序）

**方案A（治本，强烈推荐）：接入 Android CallScreeningService（来电识别服务）**

- 原理：Android 10+ 官方提供的"来电筛查"机制。用户把 APP 设为"来电显示与骚扰电话应用"（`RoleManager.ROLE_CALL_SCREENING`）后，系统在**响铃前**回调 `onScreenCall(Call.Details)`，`getHandle()` 里直接带来电号码，**不依赖 READ_CALL_LOG，不受 AppOps 通话记录开关影响**。这是市面上骚扰拦截/来电识别类 APP 的标准做法。
- 落地方式：uni-app 需要原生扩展——做一个 UTS 插件或原生 Android 插件（自定义基座），内含：
  1. 继承 `CallScreeningService` 的服务 + manifest 声明；
  2. 首次启动引导用户授予该角色（`RoleManager.createRequestRoleIntent`）；
  3. `onScreenCall` 里把号码经 `respondToCall(允许)` 放行后，回调给 JS 层走现有 `onRingingDetected(number)` 流程。
- 效果：荣耀/OPPO/小米等全系在响铃瞬间拿到号码；现有 ①-④ 通道保留为兜底。
- 成本：需要重新云打包自定义基座 + 一次原生插件开发；风险低（角色授予是系统标准对话框）。

**方案B（次选，纯引导不改架构）：把"权限体检"做成页面并引导到 ROM 的 AppOps 开关**

- 现状 `diagnoseCallLogAccess` 的诊断结论只打在日志里，用户看不到。把它变成设置页里的"来电取号自检"卡片：逐项显示 APK 权限包含/运行时授权/AppOps 三个状态，未通过时一键跳转对应 ROM 的权限详情页（荣耀：权限管理→通话记录→始终允许；OPPO：应用权限→通话记录→允许，并关闭"权限使用时提醒"）。
- 上限：部分荣耀新机型即使"始终允许"仍拦截（已被日志证实），所以 B 只能救回一部分设备，救不了全部——这是它只能作为过渡方案的原因。

**方案C（补充）：NotificationListenerService 读系统来电通知**

- 响铃时系统拨号器会发一条含号码的来电通知，持有"通知使用权"的 APP 可以读到。可作为 A 未落地前的过渡通道（同样需要少量原生/UTS 代码 + 引导开通知使用权）。可靠性中等（各 ROM 通知文案格式不同，需要按品牌做解析规则）。

**方案D（体验层缓解，纯前端）：响铃弹窗文案优化**

- 在拿不到号码期间，弹窗把"未知来电"改为"来电响铃中，号码识别中…"，挂断补全后推送"本次来电号码已识别：138xxxx"通知，避免租户误以为系统丢号。此项不解决取号，只降低感知损伤。

> 结论：**要做到"所有机型响铃即出号"，方案A是唯一可靠路径**；B/C 是过渡，D 是体验补丁。

---

<a id="回顾"></a>
## 二、回顾：之前为什么"能显示号码，只是有时串号，有时又正确"

把三种历史表现对号入座：

| 历史表现 | 实际发生的事 |
|---------|-------------|
| 响铃时显示了**正确**号码 | ROM 当时放行了通道①或②（如旧系统版本、或权限恰好设为始终允许），号码是真实的本通号码 |
| 响铃/结束时显示了**上一通**号码（串号） | 通道③④在响铃期把上一通的 CallLog 条目/录音文件误当本通匹配（旧代码没有时间窗校验、没有会话隔离、响铃期也允许录音文件名解析） |
| 挂断后过几秒才显示 | 正常路径：IDLE 后 CallLog 落库 → 解析 → `reportCallEnd` 补全 |

上一轮防串号修复（会话 session 守卫 + `[startTime, endTime]` 时间窗 + 响铃期禁用录音文件解析 + CRM 端 callId 换弹窗）把"假阳性出号"关掉了，于是留下的真实现状暴露出来：**在这两台测试机上，响铃期本来就没有任何合法号码来源**。也就是说现在的"响铃不出号"不是修复引入的回归，而是修复揭示了 ROM 拦截的真相；要突破只能走方案A的系统级角色通道。

---

<a id="问题2"></a>
## 三、问题2：OPPO 在拨号应用里开了自动录音，但 APP 没检测到、没上传

### 3.1 现有实现（crmAPP/src/services/recordingService.ts）

- **扫描方式**：`scanRecordingFolders()`（L280-318）用 `java.io.File.listFiles()` 直接遍历预置目录列表 `CALL_SPECIFIC_PATHS` / `GENERIC_SCAN_PATHS`（L31-90）+ 动态发现目录（L1361-1433）。
- **OPPO 已覆盖的路径**：`/storage/emulated/0/Recordings/Call Recordings/`、`/storage/emulated/0/Music/Recordings/Call Recordings/`、`/Recordings/Call/`、`/ColorOS/Recordings/` 等。
- **权限申请**：`checkPermissions()`（L121-220）
  - Android 13+（SDK≥33）：**只申请 `READ_MEDIA_AUDIO`**；
  - Android 11~12（SDK 30-32）：引导"所有文件访问"（MANAGE_EXTERNAL_STORAGE）；
  - Android 10 及以下：READ/WRITE_EXTERNAL_STORAGE。
- **"录音已开启"检测**：`checkRecordingEnabled()`（L1093-1182）五策略：系统 Settings 键 → 专属目录有音频 → 通用目录按文件名规则找 → MediaStore 严格查询 → 动态发现目录。
- **上传触发**：`processCallRecording()`（L505-536）通话结束后等 2 秒扫描一次，按时间±30秒 + 文件名含号码 + 大小估算打分匹配（L383-447）。

### 3.2 根因分析（按可能性排序）

**根因① Android 13 上的存储权限路径缺失（最可能，属于代码缺口）**

- 测试机是"系统最新"的 OPPO，大概率 Android 13/14（SDK≥33）。此时 `checkPermissions()` 只申请 `READ_MEDIA_AUDIO`，**从不引导 MANAGE_EXTERNAL_STORAGE**（manifest L39 里其实已声明）。
- `READ_MEDIA_AUDIO` 只保证"已被 MediaStore 索引为音频"的文件可访问。ColorOS 的通话录音目录常带 `.nomedia` 或延迟触发媒体扫描，`.amr` 等格式也可能不被索引 → `java.io.File.listFiles()` 返回空/看不到文件 → 扫描 0 个录音。
- 佐证方法：日志里 `[RecordingService] 扫描到录音文件: 0 (扫描了 N 个目录)`，同时用手机文件管理器能看到录音文件确实存在。

**根因② ColorOS 新版本录音落盘路径不在预置清单**

- ColorOS 13/14 部分版本使用**中文目录**：`/storage/emulated/0/Recordings/通话录音/`，还有机型是 `/storage/emulated/0/Music/Recordings/通话录音/`。当前 `CALL_SPECIFIC_PATHS` 只有英文 `Call Recordings`；动态发现（L1407-1416）虽然对二级目录匹配了 `'通话'` 关键字，但一级目录只认 `recording/record/sound` 英文关键词，且父目录列表不含 `/storage/emulated/0/Recordings`（只有根目录一层，能扫到 `Recordings` 但其子目录匹配依赖名字含 call/phone/通话——中文"通话录音"能命中）。此路径能否被发现取决于 File API 是否有权限列目录（又回到根因①）。

**根因③ "已开启检测"误报未开启**

- `checkRecordingEnabled()` 的策略1 Settings 键列表里 OPPO 只有 `oppo_call_record` / `oppo_auto_call_recording` / `oplus_call_recording` 三个猜测键；ColorOS 实际的开关（在拨号应用里打开的那个）多为 `oplus_customize_*` 命名或根本不写 Settings，策略1 大概率失效；
- 策略2-5 又依赖能扫到文件（根因①②）→ 最终判定"未开启"，登录时反复弹"通话录音未开启"引导，用户困惑。

**根因④ 上传窗口太短**

- `processCallRecording` 只在通话结束后 2 秒扫一次；ColorOS 录音文件写盘 + 媒体扫描可能晚于 2 秒（尤其长通话），一次未命中就永久错过（无重试）。

### 3.3 可修复方案

1. **补 Android 13+ 的"所有文件访问"引导（对应根因①，优先做）**
   - `checkPermissions()` 中 SDK≥33 分支：先申请 `READ_MEDIA_AUDIO`；随后检查 `Environment.isExternalStorageManager()`，为 false 时按 SDK 30-32 分支同样引导跳转 `ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION`（manifest 已声明 MANAGE_EXTERNAL_STORAGE，云打包需确认未被剥离）。
   - 拿到所有文件访问后，现有 File 扫描逻辑在 OPPO 上即可恢复工作。

2. **MediaStore 兜底扫描（对应根因①，与1互补）**
   - 现在 MediaStore 只用于"是否开启"检测（L1302-1355），不产出可上传文件列表。建议增加 `scanRecordingsViaMediaStore()`：按 `DATE_ADDED` 落在通话窗口 ±60s 查询 `Audio.Media`（含 `RELATIVE_PATH LIKE '%Recordings%'` 或 `DISPLAY_NAME` 含号码），把 `_data`/uri 转成可上传文件。无所有文件权限时也能覆盖"已被索引"的录音。

3. **补充 ColorOS 路径与 Settings 键（对应根因②③）**
   - `CALL_SPECIFIC_PATHS` 增加：`/storage/emulated/0/Recordings/通话录音/`、`/storage/emulated/0/Music/Recordings/通话录音/`；
   - 动态发现的一级关键词加 `通话录音`；
   - Settings 键补充 `oplus_customize_call_record`、`oplus_customize_all_call_record` 等（建议先在真机 `adb shell settings list system|secure|global | grep -i record` 确认真实键名再补，避免继续猜）。

4. **上传重试机制（对应根因④）**
   - `processCallRecording` 改为 2s / 10s / 30s / 60s 退避重试，直到命中或超时；每次重试只增量扫描 lastModified 大于通话开始的文件，避免全量开销。

5. **诊断能力（帮助后续任何机型排查）**
   - 扫描时输出每个目录的存在性 + 文件数（现在失败静默 skip，L306-308），设置页加"录音自检"按钮：显示权限状态（READ_MEDIA_AUDIO / AllFiles）、各目录文件数、最近一次匹配得分——一眼看出是权限问题还是路径问题。

---

<a id="问题3"></a>
## 四、问题3：APP 登录密码错误没有正确提示

### 4.1 根因（已精确定位，属于前端拦截器缺陷）

后端 `/mobile/login`（backend/src/routes/mobile/auth.ts L28-113）返回是规范的：

| 场景 | HTTP | message | code |
|------|------|---------|------|
| 用户名/密码为空 | 400 | 用户名和密码不能为空 | INVALID_PARAMS |
| 租户编码不存在 | 400 | 租户编码不存在 | INVALID_TENANT |
| SaaS 未填租户 | 400 | SaaS模式下必须提供租户编码才能登录 | TENANT_REQUIRED |
| 用户不存在 / 密码错误 | **401** | 用户名或密码错误 | AUTH_FAILED |
| 服务器异常 | 500 | 登录失败 | SERVER_ERROR |

问题出在 APP 请求封装 `crmAPP/src/utils/request.ts` L140-193：**所有 401 一律进入"token 过期→静默重登"分支**。登录接口密码错误也是 401，于是：

- 当前在登录页（`currentPath.includes('login')` 为 true，L147-150）→ `reject(new Error('登录已过期'))` → 登录页 toast 显示"**登录已过期**"，而不是后端真实的"用户名或密码错误"；
- 若页面栈判断失效（冷启动瞬间 `getCurrentPages()` 为空）→ 走 `silentReLogin()`，用旧密码再打一次登录接口，失败后 toast"登录已过期，请重新登录"并 reLaunch 登录页——同样吞掉了真实错误。

400 类错误（租户不存在等）走 L195-202 的通用分支，`data.message` 能正常 toast，所以"无租户"其实有提示；**唯独 401（密码错/无用户）被拦截器劫持**。这与用户反馈"密码错误没有正确提示"完全吻合。

### 4.2 可修复方案

1. **拦截器豁免登录接口（核心修复，1 处改动）**
   - `request.ts` 的 401 分支入口加判断：`options.url` 为 `/mobile/login`（或 `options.header['X-Skip-Auth-Retry']`）时，直接 `reject(new Error(data.message || '用户名或密码错误'))`，不走静默重登、不提示"登录已过期"。
   - 登录页 `handleLogin` 的 catch（login/index.vue L239-243）已经在 toast `e.message`，无需改动即可显示真实原因。

2. **按 code 细化文案（登录页 catch 或统一映射）**
   - `AUTH_FAILED` → "用户名或密码错误，请检查后重试"
   - `INVALID_TENANT` → "租户编码不存在，请与管理员确认"
   - `TENANT_REQUIRED` → "请填写租户编码"
   - 网络 fail → "无法连接服务器，请检查网络或服务器地址"（现在 fail 分支 toast"网络连接失败"后 catch 又 toast 一次 errMsg，建议去重，只留一个）。

3. **可选：区分"用户不存在 / 密码错误 / 账号已停用"**
   - 后端查询带 `status='active'` 过滤（auth.ts L62-63），停用/离职用户会被并入"用户名或密码错误"。若租户要求更明确的提示，可以：先按 username(+tenant) 查用户不带 status 条件——不存在 → `USER_NOT_FOUND`"用户不存在"；status 非 active → `ACCOUNT_DISABLED`"账号已停用，请联系管理员"；密码不符 → `AUTH_FAILED`"密码错误"。
   - ⚠️ 安全权衡：区分"用户不存在"与"密码错误"会让外部可枚举账号，公网 SaaS 通常统一为"用户名或密码错误"，建议只增加"账号已停用"这一档，用户名/密码维持合并提示（或仅私有部署模式下细分）。

---

<a id="优先级"></a>
## 五、修复优先级建议

| 优先级 | 事项 | 改动量 | 效果 |
|-------|------|-------|------|
| P0 | 问题3：request.ts 401 拦截器豁免登录接口 | 前端约10行 | 密码错误等提示立即恢复正确 |
| P0 | 问题2根因①：Android 13+ 补"所有文件访问"引导 | 前端约30行 | OPPO/新系统录音扫描恢复 |
| P1 | 问题2：MediaStore 兜底扫描 + 上传退避重试 + ColorOS 路径/键名补充 | 前端中等 | 录音覆盖全机型、防漏传 |
| P1 | 问题1方案B/D：权限自检页 + 响铃文案优化 | 前端中等 | 部分设备恢复响铃出号，其余降低感知损伤 |
| P2（治本） | 问题1方案A：CallScreeningService 原生插件 + 重新云打包 | 原生插件开发 | 全机型响铃即出号，彻底解决 |

**验证清单（修复后）**

1. 响铃期：日志中通道①②任一输出真实号码，CRM 弹窗响铃即显示；连续两通不同号码呼入不串号；
2. 录音：OPPO 通话结束后 60 秒内日志出现"找到匹配录音 + 上传成功"，CRM 通话记录可播放；
3. 登录：错误密码 → toast"用户名或密码错误"；错误租户编码 → "租户编码不存在"；断网 → "无法连接服务器"。
