# 工作手机响铃取号 — CallScreeningService 最终修复方案报告

> **编写模型**：Claude Fable 5（Cursor Agent）
> **日期**：2026-07-09
> **性质**：三模型分析结果交叉论证 + 最终修复方案（本报告为决策依据，编写时未修改任何代码）
> **参考文档**：
> - 《工作手机呼入号码显示与录音上传及登录提示问题分析报告-Fable5》（Claude Fable 5）
> - 《工作手机呼入问题深度分析与修复方案》（模型B）
> - 《呼入来电号码显示与录音登录问题深度分析报告》（Claude Sonnet 4.5 / Trae）

---

## 目录

1. [三份报告结论一致性对比](#一致性)
2. [CallScreeningService 方案论证：能否彻底解决](#论证)
3. [方案边界与诚实的限制说明](#边界)
4. [开发难度评估](#难度)
5. [开发方案：架构与思路](#架构)
6. [开发计划与步骤](#计划)
7. [需要准备的东西（资源清单）](#资源)
8. [对现有项目/APP 的影响与风险评估](#风险)
9. [验收标准](#验收)

---

<a id="一致性"></a>
## 一、三份报告结论一致性对比

| 结论点 | Fable 5 报告 | 模型B报告 | Sonnet 4.5 报告 | 是否一致 |
|--------|:---:|:---:|:---:|:---:|
| PhoneStateListener 在 Android 10+ 不回传来电号码 | ✅ | ✅ | ✅ | **一致** |
| PHONE_STATE 广播的 incoming_number 被 ROM（AppOps）拦截 | ✅ | ✅（提及可能为空） | ✅ | **一致** |
| CallLog 只在挂断后写入 → 响铃期轮询注定失败 | ✅ | ✅（定性为关键） | ✅（定性为核心原因） | **一致** |
| "挂断后补全"来自结束流程的 CallLog/录音文件解析 | ✅ | ✅ | ✅ | **一致** |
| "以前能显示"部分是旧系统放行、部分是串号假阳性 | ✅ | ✅ | ✅ | **一致** |
| 是平台/ROM 限制，不是本项目代码 Bug | ✅ | ✅ | ✅ | **一致** |
| 推荐 CallScreeningService 为治本方案 | ✅（方案A） | ❌（只给了延迟上报/广播增强等缓解方案） | ✅（方案1，附实现草稿） | **2/3 推荐** |

**结论：三个模型对根因的判断完全一致**——响铃期间系统/ROM 不向普通应用提供来电号码，现有的监听器、广播、CallLog 三条通道在荣耀/OPPO 新系统上全部被封。分歧仅在修复深度：模型B给出的"延迟上报 + 广播增强"只能在 ROM 恰好放行广播的设备上生效，无法突破 AppOps 拦截，属于缓解而非治本；Fable 5 与 Sonnet 4.5 均指向 **CallScreeningService** 作为唯一系统级出路。

---

<a id="论证"></a>
## 二、CallScreeningService 方案论证：能否彻底解决？

### 2.1 原理

`CallScreeningService` 是 Android 10（API 29）起 Telecom 框架的官方组件，设计目的就是让第三方应用做"来电识别与骚扰拦截"。工作流程：

```
来电到达 Telecom 框架
  → 框架主动 bind 持有"来电筛选"角色的应用的 CallScreeningService
  → 回调 onScreenCall(Call.Details)，Details.getHandle() = tel:139xxxxxxxx
  → 应用调用 respondToCall(允许) 放行
  → 系统拨号器才开始响铃
```

### 2.2 为什么它能突破当前的封锁

| 当前失败通道的死因 | CallScreeningService 为什么不受影响 |
|-------------------|-----------------------------------|
| 监听器/广播的号码字段依赖 READ_CALL_LOG + AppOps 放行，ROM 在 AppOps 层静默清空 | 号码由 Telecom 框架通过 `Call.Details` **主动推给服务**，不走 CallLog 权限链路，AppOps"通话记录"开关管不到它 |
| CallLog 挂断后才写库，响铃期查不到 | 回调发生在**响铃之前**，根本不查 CallLog |
| APP 后台被冻结时监听不到广播 | 来电时**系统主动拉起并绑定该 Service**（即使 APP 进程已被杀死），可靠性反而高于现有方案 |

它是市面上所有来电识别/骚扰拦截类 APP（腾讯手机管家、来电通等）的标准实现方式，荣耀、OPPO、小米、vivo 均支持——因为这是 AOSP 标准 API，厂商拨号器自己也依赖这套框架。

### 2.3 论证结论

**能彻底解决"响铃时拿不到号码"的问题，前提条件是：设备为 Android 10+，且用户授予本 APP"来电显示与骚扰拦截"角色（一次性系统弹窗）。** 这两个前提在工作手机场景下都可控（工作手机由租户统一配置）。它不是"又一个可能被 ROM 掐掉的旁路"，而是系统为这类需求提供的正门。

---

<a id="边界"></a>
## 三、方案边界与诚实的限制说明

以下限制必须在决策时知晓，避免落地后产生预期偏差：

1. **仅 Android 10+（API 29+）生效**。Android 9 及以下设备走现有通道（旧系统监听器本来就能拿到号码），代码里做版本分支即可，无缝衔接。
2. **需要用户授予 ROLE_CALL_SCREENING 角色**（系统标准弹窗，各 ROM 上入口一般在"默认应用 → 来电显示与骚扰拦截"）。同一时刻**只能有一个应用**持有该角色——若工作手机上装了手机管家类应用并占用了该角色，需要用户切换。APP 端要做角色状态自检与引导。
3. **通讯录内号码可能不回调**：按 AOSP 设计，非默认拨号器的筛选应用主要筛查**陌生号码**（不在通讯录中的来电）。工作手机场景客户通常不在通讯录，影响极小；即使在通讯录，现有挂断补号通道仍兜底。
4. **必须正确调用 respondToCall(允许)**：实现时要保证任何分支（含异常）都以"允许来电"响应，否则理论上存在影响来电的风险——这是开发中唯一需要严谨对待的点，用 try/finally 兜死即可（详见风险章节）。
5. **APP 进程被杀时的链路**：系统会拉起进程并回调 Service（原生层必得号码），但 uni-app 的 JS 层可能尚未初始化。第一期先在原生层缓存号码（静态变量 + SharedPreferences），JS 唤醒后立即读取补报；第二期可在原生层直接 HTTP 上报后端，做到"APP 没打开也能推 CRM 弹窗"。

---

<a id="难度"></a>
## 四、开发难度评估

**总体：中低难度，工作量集中在 APP 侧，后端与 CRM Web 端零改动。**

| 维度 | 评估 |
|------|------|
| 涉及端 | 只有 crmAPP（uni-app 原生插件 + TS 集成）；号码进入现有 `onRingingDetected()` 流程后，上报、弹窗、客户匹配全部复用现有链路 |
| 原生代码量 | 约 200~300 行 Java/Kotlin（一个 Service + 一个插件 Module），API 稳定、无第三方依赖 |
| TS 集成代码量 | 约 100~150 行（插件初始化、角色请求引导、回调接入、自检页入口） |
| 打包变化 | 需要以"本地原生插件"重新云打包（含自定义调试基座用于真机调试），这是主要的流程性成本 |
| 技术风险 | 低。CallScreeningService 自 API 29 至今接口未变；Sonnet 4.5 报告中已有可用的实现草稿可作起点 |
| 人力/工期 | 1 名熟悉 Android 的开发者约 3~5 个工作日（含真机测试）；若无 Android 经验，加 2~3 天学习成本 |

---

<a id="架构"></a>
## 五、开发方案：架构与思路

### 5.1 总体架构（对现有链路是"加一个最高优先级通道"，不是重构）

```
【新增】通道0: CallScreeningService（Android 10+，响铃前拿号）
   └─ 原生层 onScreenCall 拿到号码
        ├─ 缓存（静态变量 + SharedPreferences，防 JS 未就绪）
        └─ 回调 JS → incomingCallService.onRingingDetected(号码)   ← 走现有流程
【保留】通道1-5: PhoneStateListener / PHONE_STATE 广播 / CallLog 轮询 / 录音文件名 / WS 推送
   └─ 作为 Android 9 及角色未授予时的兜底，代码不动
```

去重规则：通道0 先到 → 后续通道发现 `currentIncoming` 已有有效号码时自然跳过（现有逻辑已支持）；通道0 未授予/不支持 → 行为与今天完全一致。**这保证了方案是纯增量、可退化的。**

### 5.2 插件目录结构

```
crmAPP/nativeplugins/CRM-CallScreening/
  ├── package.json                    # 插件声明（module 名、权限、mergeAndroidManifest）
  └── android/
      ├── build.gradle                # compileSdk 33 / minSdk 24
      ├── libs/uniapp-v8-release.aar  # uni-app 离线 SDK（compileOnly）
      └── src/main/
          ├── AndroidManifest.xml     # 注册 Service（BIND_SCREENING_SERVICE + intent-filter）
          └── java/com/xianhu/crm/callscreen/
              ├── CRMCallScreeningService.java   # onScreenCall 取号+放行+缓存+回调
              └── CallScreeningPlugin.java       # UniModule：isSupported / requestRole /
                                                 # registerCallback / getLastIncomingNumber
```

关键实现要点：

- `onScreenCall`：`getHandle().getSchemeSpecificPart()` 取号 → 写静态变量与 SharedPreferences（带时间戳）→ 若 JS 回调已注册则 `invokeAndKeepAlive` 推送 → **finally 中 respondToCall(全允许)**。
- `requestCallScreeningRole`：`RoleManager.createRequestRoleIntent(ROLE_CALL_SCREENING)` 拉起系统弹窗；`isRoleHeld` 查询当前状态供自检页展示。
- JS 侧在 `incomingCallService.startListening()` 里追加 `initCallScreening()`：加载插件 → 支持性检查 → 角色检查（未持有时在设置页/首次引导中提示，不强弹）→ 注册回调；回调号码直接走 `onRingingDetected()`。
- 响铃已用"未知来电"弹窗、通道0 号码稍后到达的场景：复用现有 `incoming:number_updated` 更新链路（已有）。

### 5.3 manifest.json 配置

`app-plus.distribute.android` 增加 `nativePlugins` 引用本地插件；权限清单无需新增（READ_CALL_LOG / READ_PHONE_STATE 已声明）。打包为**自定义调试基座**供真机调试，正式发版走云打包并勾选该插件。

---

<a id="计划"></a>
## 六、开发计划与步骤（建议 5 个工作日）

| 阶段 | 内容 | 产出 |
|------|------|------|
| D1 环境与骨架 | 装 Android Studio/JDK，取与 HBuilderX 版本匹配的 uni-app 离线 SDK；建插件目录；写 Service + Plugin + Manifest | 插件可编译 |
| D2 集成与调试基座 | incomingCallService 接入 initCallScreening；角色请求引导（设置页"来电识别"卡片 + 首次登录引导）；打自定义调试基座 | 真机可跑通"响铃前日志出号" |
| D3 真机矩阵测试 | 荣耀 + OPPO（必测），最好补小米/vivo 各一台：陌生号/通讯录号、前台/后台/杀进程、连续两通不同号码（验证不串号）、拒接/未接 | 测试记录 |
| D4 兜底与自检 | JS 未就绪时的 SharedPreferences 补读；角色被其他应用抢占的检测与引导文案；回归现有通道（Android 9 模拟、角色拒绝场景） | 边界场景全通过 |
| D5 发版 | 云打包正式包（同包名 com.xianhu.crm.dialer、同签名证书）；灰度 1~2 台工作手机验证后全量 | 正式 APK |

**第二期（可选，另排期）**：原生层直接 HTTP 上报后端（OkHttp POST，token 从本地存储读取），实现"APP 被杀也能实时推 CRM 来电弹窗"；以及把《分析报告》中问题2（录音扫描）与问题3（登录提示）的修复一并纳入该版本。

---

<a id="资源"></a>
## 七、需要准备的东西（资源清单）

| 类别 | 项目 | 说明 |
|------|------|------|
| 开发环境 | Android Studio + JDK 11+ | 编译原生插件 |
| SDK | uni-app 离线 SDK（uniapp-v8-release.aar） | 必须与当前 HBuilderX/编译器版本匹配，从 DCloud 官网下载 |
| 打包 | HBuilderX 云打包账号、**现有签名证书（keystore）与密码** | 必须沿用原证书和包名 `com.xianhu.crm.dialer`，否则老设备无法覆盖安装 |
| 测试设备 | 荣耀（此前问题机）、OPPO ColorOS 13/14；建议加小米/vivo | 双卡或两部手机 + 至少 2 张可拨打的 SIM 卡 |
| 后端/Web | 无需任何准备 | 号码走既有上报链路，后端与 CRM Web 不改 |
| 文档 | Sonnet 4.5 报告中的实现草稿（第 260-660 行） | 可直接作为编码起点，注意补 respondToCall 的 try/finally 与角色回调的 onActivityResult 正规实现 |

---

<a id="风险"></a>
## 八、对现有项目/APP 的影响与风险评估

### 8.1 会不会产生负面影响或损坏？——结论：可控，接近零

| 关注点 | 评估 | 依据/缓解 |
|--------|------|----------|
| 会不会影响现有来电检测？ | **不会** | 纯增量通道，现有 1-5 通道一行不改；插件加载失败/角色未授予时行为与今天完全一致（代码里 `requireNativePlugin` 判空回退） |
| 会不会影响后端/CRM Web？ | **不会** | 号码进入 `onRingingDetected()` 后全部复用现有上报与弹窗链路，服务端零改动 |
| 会不会把来电拦截掉/影响接听？ | 理论上是唯一实质风险点 | `respondToCall` 固定"允许 + 不拒接 + 不静音 + 不跳过记录/通知"，放在 try/finally 中兜死；测试矩阵专门覆盖"服务异常时来电仍正常响铃" |
| 会不会影响老版本覆盖升级？ | 不会，但有红线 | **必须使用原包名 + 原签名证书**云打包；换证书才会导致无法覆盖安装 |
| 角色弹窗会不会骚扰用户？ | 低 | 只在设置页/首次引导中主动发起一次，拒绝后不重复强弹，仅在自检页显示"未开启"状态 |
| 与手机管家类应用冲突？ | 存在 | 角色互斥，自检页检测 `isRoleHeld`，被抢占时给出切换指引 |
| 应用市场审核风险？ | 企业内直发 APK 无风险 | 若未来上架应用市场，"来电筛选 + 通话记录"属敏感权限组合，需准备用途说明；当前分发方式不受影响 |
| 维护成本 | 低 | API 29 至今接口稳定；原生代码 ~300 行且无第三方依赖 |
| 回滚方案 | 简单 | 出现问题时发一版去掉 nativePlugins 引用的包即可回到现状；或在 JS 层加开关（远端配置）禁用 initCallScreening |

### 8.2 打包相关注意事项（流程性风险）

1. 云打包勾选本地插件后**首次必须重做自定义调试基座**，标准基座里插件不存在（`requireNativePlugin` 返回 null，走回退，不会崩）。
2. `mergeAndroidManifest: true` 会把 Service 声明合入主 Manifest，注意与现有 `permissions` 数组不冲突（本方案不新增权限）。
3. targetSdkVersion 维持 33 即可，无需调整。

---

<a id="验收"></a>
## 九、验收标准

1. **响铃即出号**：荣耀/OPPO 测试机上，陌生号码呼入，系统响铃的同时（≤1 秒）APP 来电页与 CRM 来电提醒弹窗显示真实号码与客户匹配结果；
2. **不串号**：两个不同号码间隔 10 秒连续呼入，两次弹窗号码各自正确；
3. **可退化**：拒绝授予筛选角色后，一切行为与当前版本一致（响铃"未知来电"、挂断补全），无崩溃、无来电异常；
4. **不损通话**：授予角色后，来电响铃、接听、挂断、通话记录、系统来电通知全部正常；APP 强杀后来电，手机通话功能不受任何影响；
5. **兜底生效**：APP 强杀后来电 → 重新打开 APP 时能从原生缓存补报本通号码（第二期验收：杀进程状态下 CRM 也能实时弹窗）；
6. **回归**：Android 9 或以下设备（如有）来电流程不回归；外呼、录音上传、WS 重连等既有功能不受影响。

---

## 附：最终决策建议

- **采纳 CallScreeningService 原生插件方案**作为响铃取号的最终修复路径（三模型根因一致、两模型独立推荐、系统正门 API、纯增量可回滚）；
- 同版本顺带落地另两个已定位问题的小改动：登录 401 拦截器豁免登录接口（约 10 行）、Android 13+ 录音"所有文件访问"引导 + MediaStore 兜底 + 上传重试（中等量），一次打包全部带出；
- 过渡期（插件开发/打包完成前）可先上"响铃号码识别中…"的文案优化，降低租户感知损伤。
