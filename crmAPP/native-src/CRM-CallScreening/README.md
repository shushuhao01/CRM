# CRM-CallScreening 原生插件（来电筛选服务）

Android 10+ 上通过 `CallScreeningService` 在**响铃前**获取来电号码，绕过荣耀/OPPO 等 ROM 对通话记录（CallLog）的拦截，从根上解决"响铃显示未知客户"和串号问题。

## 当前状态：AAR 已编译完成，可直接打包

编译好的 AAR 已放置在：

```
crmAPP/src/nativeplugins/CRM-CallScreening/android/crm-callscreening-release.aar
```

执行 `npm run build:app` 后会自动复制到 `dist/build/app/nativeplugins/`，HBuilderX 导入 `dist/build/app` 云打包即可，无需任何额外步骤。

## 架构说明（无 UniModule，纯标准 API）

本插件包含两个类：

- `com.xianhu.crm.callscreen.CRMCallScreeningService`（继承系统 `CallScreeningService`，核心功能，纯安卓标准API）
- `com.xianhu.crm.callscreen.CallScreeningModule`（极简 UniModule，仅为满足 HBuilderX 对 package.json `plugins` 节点非空的校验；编译时用 `stubs/` 目录下的桩类代替 uni 离线SDK，桩类不打进 AAR，运行时按全限定名解析到基座内真实类）

与 JS 层的通讯不走 uni 插件桥接，而是：

| 通道 | 方向 | 用途 |
|------|------|------|
| `SharedPreferences("crm_callscreen")` | 原生 → JS | 持久化最近一次来电号码+时间戳（字符串），JS 用 `plus.android` 直接读取，进程被杀后重启也能补读 |
| 应用内广播 `包名.CALL_SCREENED` | 原生 → JS | 响铃前实时推送号码（`setPackage` 限定本应用），JS 用 `plus.android` 注册 BroadcastReceiver 接收 |
| `RoleManager`（plus.android 直接调用） | JS → 系统 | 检查/请求 `ROLE_CALL_SCREENING`（"来电显示与骚扰拦截"）角色 |

这样做的好处：

1. 编译不依赖 uni-app 离线 SDK（体积 1GB+），一个 `android.jar` 即可编译；
2. 不受 uni 基座版本升级影响，无 UniModule 二进制兼容风险；
3. JS 侧通过 `plus.android.importClass('com.xianhu.crm.callscreen.CRMCallScreeningService')` 是否成功来判断服务是否已打进 APK，未集成时自动回退 CallLog 旧方案，不会报错。

JS 集成代码位于 `crmAPP/src/services/incomingCallService.ts`（搜索"来电筛选"），设置页开关位于 `crmAPP/src/pages/settings/index.vue`（"来电识别"）。

## 如何重新编译 AAR（修改 Java 源码后）

### 方式一：javac 手工打包（本机已验证，无需 Android Studio）

前置：JDK 8+，一份 `android.jar`（API 29+，可从 `https://dl.google.com/android/repository/platform-33_r02.zip` 解压获取）。

```powershell
# 1. 编译（stubs 目录提供 UniModule/UniJSMethod 桩类，代替 uni 离线SDK）
javac -source 8 -target 8 -encoding UTF-8 `
  -bootclasspath <android.jar路径> `
  -sourcepath "src\main\java;stubs" `
  -d out `
  src\main\java\com\xianhu\crm\callscreen\CRMCallScreeningService.java `
  src\main\java\com\xianhu\crm\callscreen\CallScreeningModule.java

# 2. 打 classes.jar —— 注意只收录 com 目录（排除 io/dcloud 桩类！）
jar cfM classes.jar -C out com

# 3. 组装 AAR（AAR 就是一个 zip：AndroidManifest.xml + classes.jar + R.txt + proguard.txt）
#    - AndroidManifest.xml 用 src\main\AndroidManifest.xml（含 package 属性和 service 声明）
#    - R.txt 为空文件
#    - proguard.txt 内容：-keep class com.xianhu.crm.callscreen.** { *; }
jar cfM crm-callscreening-release.aar -C <组装目录> .

# 4. 覆盖到插件目录
copy crm-callscreening-release.aar ..\..\src\nativeplugins\CRM-CallScreening\android\
```

参考脚本：`D:\kaifa\build-tools\make-aar.ps1`（配合 JDK jar 工具使用）。

### 方式二：Android Studio

用 Android Studio 打开本目录（`build.gradle` 已配置），执行 `assembleRelease`，产物在 `build/outputs/aar/`，重命名为 `crm-callscreening-release.aar` 后覆盖到 `src/nativeplugins/CRM-CallScreening/android/`。

## 用户侧开启方式

1. APP 启动后会弹窗引导"开启来电识别"（每 24 小时最多一次）；
2. 或在 APP「设置 → 通话设置 → 来电识别」手动开启；
3. 系统会弹出"将 CRM 设为来电显示与骚扰拦截应用"的授权弹窗，确认即生效；
4. 生效后来电响铃前即可实时识别号码，无需通话记录权限。

## 安全红线

服务的 `onScreenCall` 无论任何分支（包括异常）都会以"允许来电"响应（`respondToCall` 在 `finally` 中兜底，不拦截、不拒接、不跳过通话记录和通知），不会影响用户正常接打电话。
