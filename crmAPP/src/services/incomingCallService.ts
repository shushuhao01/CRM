/**
 * 来电检测服务（呼入）
 *
 * 使用 Android PhoneStateListener 监听来电：
 * - RINGING：上报后端 + 触发来电回调
 * - OFFHOOK：记录接通时间
 * - IDLE：通话结束上报 + 录音上传 + 跳转登记页
 */

import { wsService } from './websocket'
import { callStateService } from './callStateService'
import { reportIncomingCall, reportCallEnd, reportMissedCalls, reportCallStatus } from '@/api/call'
import { recordingService } from './recordingService'
import { useUserStore } from '@/stores/user'

export interface IncomingCallInfo {
  callerNumber: string
  callId?: string
  customerId?: string
  customerName?: string
  startTime: number
  connectTime?: number
}

type IncomingCallback = (info: IncomingCallInfo) => void
type IncomingEndCallback = (info: IncomingCallInfo, duration: number) => void

interface CallSettings {
  callNotify: boolean
  vibrate: boolean
  autoUploadRecording: boolean
}

class IncomingCallService {
  private listening = false
  private incomingCallbacks: IncomingCallback[] = []
  private incomingEndCallbacks: IncomingEndCallback[] = []
  private currentIncoming: IncomingCallInfo | null = null
  private hasReportedIncoming = false
  private confirmTimeout: ReturnType<typeof setTimeout> | null = null
  private lastPhoneState = 0 // 0=IDLE, 1=RINGING, 2=OFFHOOK
  private phoneStateListener: any = null
  private telephonyManager: any = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private usePolling = false
  private wakeLock: any = null
  private foregroundActive = false
  private missedSyncRunning = false
  private vibrateTimer: ReturnType<typeof setInterval> | null = null
  private ringtonePlayer: any = null
  // #ifdef APP-PLUS
  private callLogObserver: any = null
  private phoneStateReceiver: any = null
  private phoneStateReceiverAlt: any = null
  private callLogPollTimer: ReturnType<typeof setInterval> | null = null
  // #endif

  startListening() {
    if (this.listening) {
      console.log('[IncomingCallService] 来电监听已在运行中')
      // #ifdef APP-PLUS
      // 即使已在运行，也重新验证 CallLog 权限（用户可能刚从设置页面返回授权了）
      this.verifyCallLogAccess()
      // #endif
      return
    }
    this.listening = true
    console.log('[IncomingCallService] 来电监听已启动')

    // #ifdef APP-PLUS
    this.requestPhonePermissions().then(() => {
      try {
        this.initAndroidListener()
      } catch (e) {
        console.warn('[IncomingCallService] 初始化监听器失败，启用轮询兜底:', e)
        this.usePolling = true
        this.startPolling()
      }
    })
    this.startForegroundKeepAlive()
    // #endif

    // 补录离线期间的未接来电
    this.syncMissedCallsFromCallLog()

    // 兼容 WebSocket 服务端推送的来电事件
    uni.$on('ws:incoming_call', (data: any) => {
      if (data?.callerNumber && !this.currentIncoming) {
        this.onRingingDetected(data.callerNumber)
      }
    })
  }

  stopListening() {
    this.listening = false
    this.clearConfirmTimeout()
    this.stopVibrateLoop()
    this.stopAndroidListener()
    // #ifdef APP-PLUS
    this.stopRingtone()
    this.stopForegroundKeepAlive()
    // #endif
    uni.$off('ws:incoming_call')
    console.log('[IncomingCallService] 来电监听已停止')
  }

  onIncoming(callback: IncomingCallback) {
    this.incomingCallbacks.push(callback)
  }

  onIncomingEnd(callback: IncomingEndCallback) {
    this.incomingEndCallbacks.push(callback)
  }

  /**
   * 处理后端 WebSocket 回传的来电确认（callId + 客户匹配结果）
   */
  handleIncomingCallConfirmed(data: {
    callId: string
    callerNumber?: string
    customerId?: string
    customerName?: string
  }) {
    console.log('[IncomingCallService] 来电已确认:', data)
    this.clearConfirmTimeout()

    if (!this.currentIncoming) {
      this.currentIncoming = {
        callerNumber: data.callerNumber || '',
        startTime: Date.now(),
      }
    }

    this.currentIncoming.callId = data.callId
    if (data.customerId) this.currentIncoming.customerId = String(data.customerId)
    if (data.customerName) this.currentIncoming.customerName = data.customerName

    uni.setStorageSync('currentIncomingCall', {
      callId: data.callId,
      callerNumber: this.currentIncoming.callerNumber,
      customerId: this.currentIncoming.customerId,
      customerName: this.currentIncoming.customerName,
      startTime: this.currentIncoming.startTime,
    })

    uni.$emit('incoming:call_confirmed', { ...this.currentIncoming })
  }

  getCurrentIncoming(): IncomingCallInfo | null {
    return this.currentIncoming ? { ...this.currentIncoming } : null
  }

  /**
   * 检查电话权限是否已授予（不弹窗）
   */
  checkPhonePermissionGranted(): boolean {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const pkgName = (main as any).getPackageName()
      const pm = (main as any).getPackageManager()
      const raw = pm.checkPermission('android.permission.READ_PHONE_STATE', pkgName)
      const str = '' + raw
      console.log('[IncomingCallService] READ_PHONE_STATE checkPermission:', str)
      if (str === '0') return true
      if (str === '-1') return false
    } catch (e) {
      console.warn('[IncomingCallService] 权限检查异常:', e)
    }
    // 不确定时返回 true，让 initAndroidListener 自行尝试（失败会降级到轮询）
    return true
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  /**
   * 公开的权限请求方法，供外部调用（如首页权限引导按钮）
   * @returns true=权限已授予, false=用户拒绝
   */
  async requestPermissions(): Promise<boolean> {
    // #ifdef APP-PLUS
    const granted = await this.requestPhonePermissions()
    if (granted && !this.listening) {
      this.startListening()
    } else if (granted && this.usePolling) {
      this.usePolling = false
      if (this.pollTimer) {
        clearInterval(this.pollTimer)
        this.pollTimer = null
      }
      this.initAndroidListener()
    }
    return granted
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  /**
   * 检查悬浮窗权限是否已授予
   */
  checkOverlayPermissionGranted(): boolean {
    // #ifdef APP-PLUS
    try {
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const main = plus.android.runtimeMainActivity()
      return !!Settings.canDrawOverlays(main)
    } catch (e) {
      return false
    }
    // #endif
    // eslint-disable-next-line no-unreachable
    return true
  }

  // #ifdef APP-PLUS
  private openOverlayPermissionSettings() {
    try {
      const Intent = plus.android.importClass('android.content.Intent') as any
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const Uri = plus.android.importClass('android.net.Uri') as any
      const main = plus.android.runtimeMainActivity()
      const intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION)
      intent.setData(Uri.parse('package:' + (main as any).getPackageName()))
      ;(main as any).startActivity(intent)
    } catch (e) {
      console.warn('[IncomingCallService] 跳转悬浮窗设置失败:', e)
      // 兜底：跳转到应用详情页
      this.openAppPermissionSettings()
    }
  }
  // #endif

  /**
   * 跳转到系统应用权限设置页
   */
  openAppPermissionSettings() {
    // #ifdef APP-PLUS
    try {
      const Intent = plus.android.importClass('android.content.Intent') as any
      const Uri = plus.android.importClass('android.net.Uri') as any
      const ComponentName = plus.android.importClass('android.content.ComponentName') as any
      const main = plus.android.runtimeMainActivity()
      const pkgName = (main as any).getPackageName()

      // 华为设备：尝试直接打开华为权限管理页面
      const brand = ('' + ((plus.android.importClass('android.os.Build') as any).MANUFACTURER || '')).toLowerCase()
      if (brand.includes('huawei') || brand.includes('honor')) {
        try {
          const huaweiIntent = new Intent()
          huaweiIntent.setComponent(new ComponentName(
            'com.huawei.systemmanager',
            'com.huawei.permissionmanager.ui.SingleAppActivity'
          ))
          huaweiIntent.putExtra('packageName', pkgName)
          huaweiIntent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
          ;(main as any).startActivity(huaweiIntent)
          console.log('[IncomingCallService] 已跳转到华为权限管理页面')
          return
        } catch (_e) {
          console.log('[IncomingCallService] 华为权限管理页面跳转失败，尝试通用设置')
        }
      }

      // 通用方式：打开应用详情设置页
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
      intent.setData(Uri.parse('package:' + pkgName))
      ;(main as any).startActivity(intent)
    } catch (err) {
      console.warn('[IncomingCallService] 跳转设置失败:', err)
      uni.showToast({ title: '请手动进入系统设置 > 应用管理 > 云客CRM > 权限', icon: 'none', duration: 3000 })
    }
    // #endif
  }

  // #ifdef APP-PLUS
  private async requestPhonePermissions(): Promise<boolean> {
    // 第一步：请求 READ_PHONE_STATE（来电状态检测）
    const hasPhoneState = await this.requestOnePermission('android.permission.READ_PHONE_STATE')
    console.log('[IncomingCallService] READ_PHONE_STATE:', hasPhoneState ? '✅' : '❌')

    // 第二步：单独请求 READ_CALL_LOG（来电号码获取，Android 10+ 必需）
    // 分开请求确保系统弹出独立的授权对话框
    const hasCallLog = await this.requestOnePermission('android.permission.READ_CALL_LOG')
    console.log('[IncomingCallService] READ_CALL_LOG:', hasCallLog ? '✅' : '❌')

    if (!hasCallLog) {
      console.warn('[IncomingCallService] ⚠️ READ_CALL_LOG 未授予，来电号码将无法显示')
      console.warn('[IncomingCallService] 请在系统设置中手动开启：设置 > 应用 > 云客CRM > 权限 > 通话记录')
    }

    // 第三步：Android 12+ 额外请求 READ_PHONE_NUMBERS
    try {
      const Build = plus.android.importClass('android.os.Build') as any
      if (Build && Build.VERSION && Build.VERSION.SDK_INT >= 31) {
        await this.requestOnePermission('android.permission.READ_PHONE_NUMBERS')
      }
    } catch (_e) { /* ignore */ }

    return hasPhoneState
  }

  /**
   * 请求单个权限，返回是否授予
   */
  private requestOnePermission(permission: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        plus.android.requestPermissions(
          [permission],
          (e: any) => {
            const granted = e.granted || []
            const deniedAlways = e.deniedAlways || []
            const deniedPresent = e.deniedPresent || []
            console.log('[IncomingCallService] 权限 ' + permission.split('.').pop() + ':',
              'granted=' + granted.length,
              'deniedPresent=' + deniedPresent.length,
              'deniedAlways=' + deniedAlways.length)
            resolve(granted.length > 0)
          },
          (_e: any) => resolve(false)
        )
      } catch (_e) {
        resolve(false)
      }
    })
  }

  private initAndroidListener() {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const TelephonyManager = plus.android.importClass('android.telephony.TelephonyManager') as any

      this.telephonyManager = (main as any).getSystemService(Context.TELEPHONY_SERVICE)
      const self = this

      // 诊断设备信息
      let sdkInt = 0
      try {
        const Build = plus.android.importClass('android.os.Build') as any
        sdkInt = Build.VERSION.SDK_INT
        const brand = '' + Build.BRAND
        const model = '' + Build.MODEL
        console.log('[IncomingCallService] 设备: ' + brand + ' ' + model + ', SDK=' + sdkInt)
      } catch (_e) { /* ignore */ }

      const PhoneStateListener = plus.android.importClass('android.telephony.PhoneStateListener') as any

      this.phoneStateListener = plus.android.implements('android.telephony.PhoneStateListener', {
        onCallStateChanged: function() {
          // 使用 arguments 获取原始参数，避免桥接命名参数映射问题
          const args = Array.prototype.slice.call(arguments)
          const state = Number(args[0]) || 0
          const rawNumber = args[1]
          const pn = rawNumber ? ('' + rawNumber).trim() : ''
          console.log('[IncomingCallService] Listener回调: argsCount=' + args.length + ', state=' + state + ', raw=[' + rawNumber + '], type=' + typeof rawNumber + ', number=[' + pn + ']')
          self.handleCallStateChange(state, pn)
        },
      })

      // LISTEN_CALL_STATE=32, 在 Android 10+ 即使有 READ_CALL_LOG，
      // PhoneStateListener.onCallStateChanged 的 phoneNumber 也可能为空
      let listenFlags = 32
      if (sdkInt >= 31) {
        listenFlags = 544 // 32 | 512 (LISTEN_PHONE_NUMBERS)
        console.log('[IncomingCallService] Android 12+, flags=544')
      }
      this.telephonyManager.listen(this.phoneStateListener, listenFlags)
      console.log('[IncomingCallService] PhoneStateListener 已注册, flags=' + listenFlags)

      this.verifyCallLogAccess()
      this.startPolling()
      this.registerCallLogObserver()
    } catch (e) {
      console.warn('[IncomingCallService] PhoneStateListener 注册失败，启用轮询:', e)
      this.usePolling = true
      this.startPolling()
      this.registerCallLogObserver()
    }
  }

  /**
   * 验证 CallLog 实际可读——如果查询返回 null/异常说明权限未真正生效
   */
  private verifyCallLogAccess() {
    try {
      const main = plus.android.runtimeMainActivity()
      plus.android.importClass('android.content.ContentResolver')
      plus.android.importClass('android.database.Cursor')
      const cr = (main as any).getContentResolver()

      // 尝试多种 URI
      const uris = ['content://call_log/calls', 'content://calls']
      let success = false

      // 先尝试 CallLog$Calls.CONTENT_URI
      try {
        const CallLogCalls = plus.android.importClass('android.provider.CallLog$Calls') as any
        const classUri = CallLogCalls.CONTENT_URI
        if (classUri) {
          const cursor = cr.query(classUri, null, null, null, 'date DESC')
          if (cursor) {
            const count = cursor.getCount()
            cursor.close()
            console.log('[IncomingCallService] ✅ CallLog 验证成功(CallLog$Calls)，共 ' + count + ' 条')
            success = true
          } else {
            console.log('[IncomingCallService] CallLog$Calls.CONTENT_URI 查询返回 null')
          }
        }
      } catch (e: any) {
        console.log('[IncomingCallService] CallLog$Calls 不可用:', e?.message || e)
      }

      if (!success) {
        const Uri = plus.android.importClass('android.net.Uri') as any
        for (const uriStr of uris) {
          try {
            const uri = Uri.parse(uriStr)
            // 尝试 cr.query
            let cursor = cr.query(uri, null, null, null, null)
            if (cursor) {
              const count = cursor.getCount()
              cursor.close()
              console.log('[IncomingCallService] ✅ CallLog 验证成功(' + uriStr + ')，共 ' + count + ' 条')
              success = true
              break
            }
            // 尝试 plus.android.invoke
            cursor = plus.android.invoke(cr, 'query', uri, null, null, null, null)
            if (cursor) {
              console.log('[IncomingCallService] ✅ CallLog invoke验证成功(' + uriStr + ')')
              try { (cursor as any).close() } catch (_) { /* skip */ }
              success = true
              break
            }
            // 尝试 managedQuery
            cursor = (main as any).managedQuery(uri, null, null, null, null)
            if (cursor) {
              console.log('[IncomingCallService] ✅ CallLog managedQuery验证成功(' + uriStr + ')')
              success = true
              break
            }
            console.log('[IncomingCallService] ' + uriStr + ' 所有方式返回 null')
          } catch (e: any) {
            console.log('[IncomingCallService] ' + uriStr + ' 查询失败:', e?.message || e)
          }
        }
      }

      if (!success) {
        // 尝试 ApplicationContext
        try {
          const appCtx = (main as any).getApplicationContext()
          const appCr = appCtx.getContentResolver()
          const Uri2 = plus.android.importClass('android.net.Uri') as any
          const uri = Uri2.parse('content://call_log/calls')
          const cursor = appCr.query(uri, null, null, null, null)
          if (cursor) {
            console.log('[IncomingCallService] ✅ AppContext CallLog 验证成功')
            try { cursor.close() } catch (_) { /* skip */ }
            success = true
          }
        } catch (_e) { /* skip */ }
      }

      if (!success) {
        console.warn('[IncomingCallService] ❌ 所有 CallLog URI 和方式均不可用（设备限制）')
        // 深度诊断：精准区分是 APK 未包含权限 / 运行时未授权 / ROM AppOps 系统拦截
        this.diagnoseCallLogAccess()
      }
    } catch (e: any) {
      console.warn('[IncomingCallService] ❌ CallLog 验证异常:', e?.message || e)
    }
  }

  /**
   * CallLog 读取失败时的深度诊断，区分三种根因：
   * 1. APK 未包含 READ_CALL_LOG 权限（云打包被剥离）→ 需重新打包
   * 2. 运行时权限未授予 → 引导用户授权
   * 3. 权限已授予但 AppOps 被系统拦截（华为/荣耀等 ROM 的"权限管理"设为
   *    "每次询问"或被智能管控时，query 静默返回 null 而不抛异常）→ 引导改为"始终允许"
   */
  private diagnoseCallLogAccess() {
    try {
      const main = plus.android.runtimeMainActivity()
      const pkgName = '' + (main as any).getPackageName()

      // 1. 检查 READ_CALL_LOG 是否编译进了 APK（GET_PERMISSIONS = 4096）
      let declared: boolean | null = null
      try {
        const pm = (main as any).getPackageManager()
        const pkgInfo = pm.getPackageInfo(pkgName, 4096)
        const requested = pkgInfo ? plus.android.getAttribute(pkgInfo, 'requestedPermissions') : null
        if (requested) {
          declared = ('' + requested).indexOf('android.permission.READ_CALL_LOG') >= 0
        }
      } catch (e: any) {
        console.log('[IncomingCallService] [诊断] 读取APK权限清单失败:', e?.message || e)
      }

      // 2. 运行时权限状态
      let runtimeGranted: boolean | null = null
      try {
        const raw = (main as any).checkSelfPermission('android.permission.READ_CALL_LOG')
        const str = '' + raw
        if (str === '0') runtimeGranted = true
        else if (str === '-1') runtimeGranted = false
      } catch (_e) { /* skip */ }

      // 3. AppOps 状态（0=允许, 1=忽略/拦截, 2=禁止, 3=默认）
      let appOpsMode = ''
      try {
        const Context = plus.android.importClass('android.content.Context') as any
        const appOps = (main as any).getSystemService(Context.APP_OPS_SERVICE)
        if (appOps) {
          const appInfo = (main as any).getApplicationInfo()
          const uid = plus.android.getAttribute(appInfo, 'uid')
          const mode = (plus.android.invoke as any)(appOps, 'checkOpNoThrow', 'android:read_call_log', Number(uid), pkgName)
          appOpsMode = '' + mode
        }
      } catch (e: any) {
        console.log('[IncomingCallService] [诊断] AppOps 检查失败:', e?.message || e)
      }

      console.warn('[IncomingCallService] [诊断] 包名=' + pkgName + ', READ_CALL_LOG: APK包含=' + declared +
        ', 运行时授权=' + runtimeGranted + ', AppOps模式=' + appOpsMode + ' (0=允许 1=忽略 2=禁止 3=默认)')

      // 标准基座提示：nativeResources 的 <queries> 清单只在云打包后生效
      if (pkgName.indexOf('io.dcloud') === 0) {
        console.error('[IncomingCallService] [诊断结论] 当前运行在 HBuilder 标准基座(' + pkgName + ')！' +
          'Android 11+ 的包可见性 <queries> 声明只在云打包的自定义基座/正式包中生效，' +
          '标准基座下 CallLog 查询必然返回 null。请制作自定义调试基座或安装正式包后再测试。')
      }

      if (declared === false) {
        console.error('[IncomingCallService] [诊断结论] APK 中不含 READ_CALL_LOG 权限，可能被云打包剥离，需在打包配置中确认敏感权限')
        return
      }

      if (runtimeGranted === false) {
        console.warn('[IncomingCallService] [诊断结论] 运行时权限未授予，需引导用户授权')
        return
      }

      // 权限已授予但查询仍返回 null → ROM 系统层拦截（AppOps）
      if (runtimeGranted === true) {
        console.warn('[IncomingCallService] [诊断结论] 权限已授予但系统拦截了通话记录读取（AppOps模式=' + appOpsMode + '），需在系统权限管理中设为"始终允许"')
        this.maybeShowCallLogBlockedGuide()
      }
    } catch (e: any) {
      console.warn('[IncomingCallService] CallLog 诊断异常:', e?.message || e)
    }
  }

  /**
   * 显示"系统拦截通话记录读取"的引导弹窗（每24小时最多一次，避免打扰）
   */
  private maybeShowCallLogBlockedGuide() {
    try {
      const lastShown = Number(uni.getStorageSync('callLogBlockedGuideShownAt') || 0)
      if (Date.now() - lastShown < 24 * 60 * 60 * 1000) return
      uni.setStorageSync('callLogBlockedGuideShownAt', String(Date.now()))

      uni.showModal({
        title: '来电号码无法获取',
        content: '检测到系统拦截了通话记录读取，来电将显示"未知来电"。\n\n请前往 权限管理 > 通话记录，将本应用设为"始终允许"（不要选"每次询问"）。\n\n另外建议开启系统"通话自动录音"，作为号码识别的备用通道。',
        confirmText: '去设置',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            this.openAppPermissionSettings()
          }
        }
      })
    } catch (_e) { /* ignore */ }
  }

  private stopAndroidListener() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }

    // 注销 CallLog ContentObserver
    this.unregisterCallLogObserver()
    // 停止 CallLog 轮询
    this.stopCallLogPolling()

    if (this.telephonyManager && this.phoneStateListener) {
      try {
        // LISTEN_NONE = 0，使用数字常量避免 plus.android.importClass 访问静态常量问题
        this.telephonyManager.listen(this.phoneStateListener, 0)
      } catch (e) {
        console.warn('[IncomingCallService] 注销监听器失败:', e)
      }
    }
    this.phoneStateListener = null
    this.telephonyManager = null
  }

  // #ifdef APP-PLUS
  /**
   * 注册 CallLog ContentObserver，监听通话记录变化
   * 当 PhoneStateListener RINGING 不返回号码时，通过 ContentObserver 从 CallLog 获取号码
   */
  private registerCallLogObserver() {
    try {
      if (this.callLogObserver) return

      const main = plus.android.runtimeMainActivity()
      plus.android.importClass('android.content.ContentResolver')
      const cr = (main as any).getContentResolver()
      const Handler = plus.android.importClass('android.os.Handler') as any

      // 获取 CallLog URI（优先 CallLog$Calls）
      let callLogUri: any = null
      try {
        const CallLogCalls = plus.android.importClass('android.provider.CallLog$Calls') as any
        callLogUri = CallLogCalls.CONTENT_URI
      } catch (_e) { /* skip */ }
      if (!callLogUri) {
        const Uri = plus.android.importClass('android.net.Uri') as any
        callLogUri = Uri.parse('content://call_log/calls')
      }

      const self = this

      this.callLogObserver = plus.android.implements('android.database.ContentObserver', {
        onChange: function(selfChange: boolean) {
          console.log('[IncomingCallService] CallLog 内容变化检测到')
          self.handleCallLogChange()
        }
      })

      const Looper = plus.android.importClass('android.os.Looper') as any
      const handler = new Handler(Looper.getMainLooper())

      cr.registerContentObserver(callLogUri, true, this.callLogObserver)
      console.log('[IncomingCallService] CallLog ContentObserver 已注册')

      // 同时注册 PHONE_STATE 广播接收器（Android 10+ 需 READ_CALL_LOG 权限才能获取号码）
      this.registerPhoneStateReceiver()
    } catch (e) {
      console.warn('[IncomingCallService] 注册 CallLog ContentObserver 失败:', e)
    }
  }

  private unregisterCallLogObserver() {
    try {
      if (!this.callLogObserver) return
      const main = plus.android.runtimeMainActivity()
      plus.android.importClass('android.content.ContentResolver')
      const cr = (main as any).getContentResolver()
      cr.unregisterContentObserver(this.callLogObserver)
      this.callLogObserver = null
      console.log('[IncomingCallService] CallLog ContentObserver 已注销')
    } catch (e) {
      console.warn('[IncomingCallService] 注销 CallLog ContentObserver 失败:', e)
    }
    // 同时注销 PHONE_STATE 广播接收器
    this.unregisterPhoneStateReceiver()
  }

  /**
   * 注册 PHONE_STATE 广播接收器
   * 使用多种方式注册以确保在不同 Android 版本上都能接收
   */
  private registerPhoneStateReceiver() {
    try {
      if (this.phoneStateReceiver) return

      const main = plus.android.runtimeMainActivity()
      const IntentFilter = plus.android.importClass('android.content.IntentFilter') as any
      const self = this

      const filter = new IntentFilter('android.intent.action.PHONE_STATE')
      // 设置最高优先级
      filter.setPriority(2147483647)

      this.phoneStateReceiver = plus.android.implements('android.content.BroadcastReceiver', {
        onReceive: function(context: any, intent: any) {
          console.log('[IncomingCallService] ✅ PHONE_STATE 广播已触发')
          self.handlePhoneStateBroadcastIntent(intent)
        }
      })

      // 尝试多种方式注册广播接收器
      let registered = false
      let sdkInt = 0
      try {
        const Build = plus.android.importClass('android.os.Build') as any
        sdkInt = Build.VERSION.SDK_INT
      } catch (_e) { /* ignore */ }
      console.log('[IncomingCallService] 注册广播接收器, SDK=' + sdkInt)

      // Android 13+ (API 33) 需要 RECEIVER_EXPORTED 标志
      if (sdkInt >= 33) {
        // 方式1: 3参数 registerReceiver(receiver, filter, flags) — API 33 新增
        try {
          ;(main as any).registerReceiver(this.phoneStateReceiver, filter, 2)
          registered = true
          console.log('[IncomingCallService] ✅ 广播注册成功(3参数,flags=EXPORTED)')
        } catch (e1: any) {
          console.log('[IncomingCallService] 3参数方式失败:', e1?.message || e1)
        }

        // 方式2: ContextCompat.registerReceiver
        if (!registered) {
          try {
            const ContextCompat = plus.android.importClass('androidx.core.content.ContextCompat') as any
            ContextCompat.registerReceiver(main, this.phoneStateReceiver, filter, 2)
            registered = true
            console.log('[IncomingCallService] ✅ 广播注册成功(ContextCompat)')
          } catch (e2: any) {
            console.log('[IncomingCallService] ContextCompat方式失败:', e2?.message || e2)
          }
        }

        // 方式3: 5参数 registerReceiver(receiver, filter, permission, handler, flags)
        if (!registered) {
          try {
            ;(main as any).registerReceiver(this.phoneStateReceiver, filter, null, null, 2)
            registered = true
            console.log('[IncomingCallService] ✅ 广播注册成功(5参数)')
          } catch (e3: any) {
            console.log('[IncomingCallService] 5参数方式失败:', e3?.message || e3)
          }
        }

        // 方式4: 通过 plus.android.invoke 注册
        if (!registered) {
          try {
            plus.android.invoke(main, 'registerReceiver', this.phoneStateReceiver, filter, 2)
            registered = true
            console.log('[IncomingCallService] ✅ 广播注册成功(invoke)')
          } catch (e4: any) {
            console.log('[IncomingCallService] invoke方式失败:', e4?.message || e4)
          }
        }
      }

      // 兜底: 标准 2 参数注册（Android 12 及以下，或上面全部失败）
      if (!registered) {
        try {
          ;(main as any).registerReceiver(this.phoneStateReceiver, filter)
          registered = true
          console.log('[IncomingCallService] ✅ 广播注册成功(标准2参数)')
        } catch (e5: any) {
          console.log('[IncomingCallService] 标准注册也失败:', e5?.message || e5)
        }
      }

      console.log('[IncomingCallService] 广播注册完成, registered=' + registered)

      // 备用：在 ApplicationContext 上再注册一个接收器
      // 部分国产 ROM（华为/荣耀等）对 Activity Context 注册的接收器有限制，
      // 带号码的第二条 PHONE_STATE 广播可能只投递给 Application Context 的接收器
      this.registerAltPhoneStateReceiver(sdkInt)
    } catch (e) {
      console.warn('[IncomingCallService] 注册 PHONE_STATE 广播接收器失败:', e)
    }
  }

  /**
   * 在 ApplicationContext 上注册备用 PHONE_STATE 广播接收器
   */
  private registerAltPhoneStateReceiver(sdkInt: number) {
    try {
      if (this.phoneStateReceiverAlt) return

      const main = plus.android.runtimeMainActivity()
      const appCtx = (main as any).getApplicationContext()
      if (!appCtx) return

      const IntentFilter = plus.android.importClass('android.content.IntentFilter') as any
      const filter = new IntentFilter('android.intent.action.PHONE_STATE')
      filter.setPriority(2147483647)

      const self = this
      this.phoneStateReceiverAlt = plus.android.implements('android.content.BroadcastReceiver', {
        onReceive: function(context: any, intent: any) {
          console.log('[IncomingCallService] ✅ PHONE_STATE 广播已触发(AppContext)')
          self.handlePhoneStateBroadcastIntent(intent)
        }
      })

      let ok = false
      if (sdkInt >= 33) {
        try {
          appCtx.registerReceiver(this.phoneStateReceiverAlt, filter, 2) // RECEIVER_EXPORTED
          ok = true
        } catch (_e) { /* 继续尝试2参数 */ }
      }
      if (!ok) {
        try {
          appCtx.registerReceiver(this.phoneStateReceiverAlt, filter)
          ok = true
        } catch (e: any) {
          console.log('[IncomingCallService] AppContext 广播注册失败:', e?.message || e)
          this.phoneStateReceiverAlt = null
        }
      }
      if (ok) {
        console.log('[IncomingCallService] ✅ AppContext 备用广播接收器已注册')
      }
    } catch (e) {
      console.warn('[IncomingCallService] 注册 AppContext 备用接收器失败:', e)
      this.phoneStateReceiverAlt = null
    }
  }

  /**
   * 统一处理 PHONE_STATE 广播 Intent（主/备接收器共用）
   *
   * 关键点：Android 9+ 系统会为一次来电发送两条广播——
   * 第一条不带号码，第二条带 incoming_number（且 state 可能为空或已变为 OFFHOOK）。
   * 因此不能只在 state === 'RINGING' 时取号码，只要广播里带号码且当前号码未知就应采用。
   */
  private handlePhoneStateBroadcastIntent(intent: any) {
    try {
      // 列出 intent 中所有 extras，帮助诊断
      const extras = intent.getExtras()
      if (extras) {
        const keys = extras.keySet()
        const iter = keys.iterator()
        const allExtras: string[] = []
        while (iter.hasNext()) {
          const key = '' + iter.next()
          const val = '' + extras.get(key)
          allExtras.push(key + '=' + val)
        }
        console.log('[IncomingCallService] 广播 extras:', allExtras.join(', '))
      } else {
        console.log('[IncomingCallService] 广播无 extras')
      }

      const state = intent.getStringExtra('state')
      const incomingNumber = intent.getStringExtra('incoming_number')
      console.log('[IncomingCallService] 广播: state=' + state + ', number=' + incomingNumber)

      if (!incomingNumber) return
      const numStr = ('' + incomingNumber).trim()
      if (numStr.length < 3 || numStr === '未知来电') return

      if (this.currentIncoming) {
        // 已有来电会话但号码未知（不限制 state，第二条带号码的广播可能晚于 RINGING）
        if (!this.currentIncoming.callerNumber || this.currentIncoming.callerNumber === '未知来电') {
          console.log('[IncomingCallService] ✅ 广播获取到来电号码:', numStr)
          this.currentIncoming.callerNumber = numStr
          this.hasReportedIncoming = false
          this.currentIncoming.callId = undefined
          this.reportIncomingToServer(numStr)
          uni.$emit('incoming:number_updated', { callerNumber: numStr })
        }
      } else if (state === 'RINGING') {
        // 广播先于 PhoneStateListener 到达：直接用号码启动来电流程，避免号码被丢弃
        console.log('[IncomingCallService] ✅ 广播先行携带来电号码，直接启动来电流程:', numStr)
        this.onRingingDetected(numStr)
      }
    } catch (e) {
      console.warn('[IncomingCallService] 处理广播失败:', e)
    }
  }

  private unregisterPhoneStateReceiver() {
    const main = plus.android.runtimeMainActivity()
    if (this.phoneStateReceiver) {
      try {
        ;(main as any).unregisterReceiver(this.phoneStateReceiver)
      } catch (_e) { /* ignore */ }
      this.phoneStateReceiver = null
    }
    if (this.phoneStateReceiverAlt) {
      // 备用接收器注册在 ApplicationContext 上，需用相同 Context 注销
      try {
        const appCtx = (main as any).getApplicationContext()
        appCtx.unregisterReceiver(this.phoneStateReceiverAlt)
      } catch (_e) {
        try {
          ;(main as any).unregisterReceiver(this.phoneStateReceiverAlt)
        } catch (_e2) { /* ignore */ }
      }
      this.phoneStateReceiverAlt = null
    }
    console.log('[IncomingCallService] 广播接收器已注销')
  }

  /**
   * CallLog 内容变化时的处理
   * 从 CallLog 读取最新的呼入记录号码，如果当前来电号码是"未知来电"则更新并重新上报
   */
  private handleCallLogChange() {
    if (!this.currentIncoming) return

    const currentNumber = this.currentIncoming.callerNumber
    if (currentNumber && currentNumber !== '未知来电') return

    // 先试 CallLog，再试录音文件名
    this.tryResolveCallerFromCallLog().then(async (number) => {
      let resolved = number
      if (!resolved) {
        resolved = await this.tryResolveCallerFromRecordingFile()
      }
      if (resolved && this.currentIncoming && (!this.currentIncoming.callerNumber || this.currentIncoming.callerNumber === '未知来电')) {
        console.log('[IncomingCallService] 获取到来电号码:', resolved)
        this.currentIncoming.callerNumber = resolved
        this.hasReportedIncoming = false
        this.currentIncoming.callId = undefined
        this.reportIncomingToServer(resolved)
        uni.$emit('incoming:number_updated', { callerNumber: resolved })
      }
    })
  }

  /**
   * RINGING 无号码时的快速解析：
   * 1. 先用"未知来电"立即启动来电流程（不耽误弹窗显示）
   * 2. 同时启动 CallLog 持续轮询，获取到号码后更新弹窗和上报
   */
  private async quickResolveAndReport() {
    // 立即用"未知来电"启动流程，确保弹窗不延迟
    this.onRingingDetected('未知来电')
    // 启动 CallLog 轮询持续尝试获取真实号码
    this.startCallLogPolling()
  }

  /**
   * 启动 CallLog 轮询：每 300ms 查询一次通话记录，直到获取到号码或超时
   * Android 大部分设备在通话结束后才写入 CallLog，所以需要持续轮询
   */
  private startCallLogPolling() {
    if (this.callLogPollTimer) return
    let attempts = 0
    const maxAttempts = 120 // 120 次 × 300ms = 36 秒
    let idleCount = 0 // IDLE 后继续轮询的次数
    console.log('[IncomingCallService] 开始 CallLog 轮询（每300ms一次）')
    this.callLogPollTimer = setInterval(() => {
      attempts++
      // 已拿到号码，停止
      if (!this.currentIncoming || (this.currentIncoming.callerNumber && this.currentIncoming.callerNumber !== '未知来电')) {
        console.log('[IncomingCallService] CallLog 轮询停止：已获取号码')
        this.stopCallLogPolling()
        return
      }
      // 通话结束(IDLE)后再多查 20 次（6秒），因为大部分设备在 IDLE 后才写入 CallLog
      if (this.lastPhoneState === 0) {
        idleCount++
        if (idleCount > 20) {
          console.log('[IncomingCallService] CallLog 轮询停止：IDLE后6秒仍无号码')
          this.stopCallLogPolling()
          return
        }
      }
      if (attempts > maxAttempts) {
        console.log('[IncomingCallService] CallLog 轮询停止：超时36秒')
        this.stopCallLogPolling()
        return
      }
      this.tryResolveNumber(attempts).then((num) => {
        if (num && this.currentIncoming && this.currentIncoming.callerNumber === '未知来电') {
          console.log('[IncomingCallService] 轮询第' + attempts + '次获取到号码:', num)
          this.currentIncoming.callerNumber = num
          this.hasReportedIncoming = false
          this.currentIncoming.callId = undefined
          this.reportIncomingToServer(num)
          uni.$emit('incoming:number_updated', { callerNumber: num })
          this.stopCallLogPolling()
        }
      })
    }, 300)
  }

  /**
   * 综合尝试获取来电号码：先 CallLog，再录音文件名
   */
  private async tryResolveNumber(attempt: number): Promise<string> {
    // 1. 先试 CallLog
    const fromCallLog = await this.tryResolveCallerFromCallLog()
    if (fromCallLog) return fromCallLog

    // 2. 每 3 次尝试一次录音文件名
    if (attempt % 3 === 0) {
      const fromRecording = await this.tryResolveCallerFromRecordingFile()
      if (fromRecording) return fromRecording
    }

    return ''
  }

  private stopCallLogPolling() {
    if (this.callLogPollTimer) {
      clearInterval(this.callLogPollTimer)
      this.callLogPollTimer = null
    }
  }
  // #endif

  private startPolling() {
    if (this.pollTimer) return
    this.pollTimer = setInterval(() => {
      if (!this.listening) return
      try {
        const main = plus.android.runtimeMainActivity()
        const Context = plus.android.importClass('android.content.Context') as any
        plus.android.importClass('android.telephony.TelephonyManager')
        const tm = (main as any).getSystemService((Context as any).TELEPHONY_SERVICE)
        const state = tm.getCallState()
        if (state !== this.lastPhoneState) {
          // 轮询只能获取状态变化，无法获取号码（getCallState 不返回号码）
          // 对 RINGING 传空字符串以触发 CallLog 兜底解析
          const num = (state === 1) ? '' : (this.currentIncoming?.callerNumber || '')
          this.handleCallStateChange(state, num)
        }
      } catch (e) {
        console.error('[IncomingCallService] 轮询通话状态失败:', e)
      }
    }, 500)
  }
  // #endif

  private handleCallStateChange(state: number, phoneNumber: string) {
    // 仅在外呼正在通话中（offhook/ringing/dialing 且未 ended）时让 callStateService 处理
    // 避免外呼结束后状态残留导致来电永远被忽略
    const outboundCall = callStateService.getCurrentCall()
    if (outboundCall && callStateService.isInCall()) {
      // 超时保护：外呼通话超过5分钟未结束，可能是状态残留，强制清理以恢复来电检测
      const outboundElapsed = Date.now() - outboundCall.startTime
      if (outboundElapsed > 5 * 60 * 1000) {
        console.warn('[IncomingCallService] 外呼状态超过5分钟未清理，强制清理以恢复来电检测')
        callStateService.stopMonitoring()
      } else {
        this.lastPhoneState = state
        return
      }
    }
    // 如果外呼已结束但 getCurrentCall 非空（残留），主动清理
    if (outboundCall && !callStateService.isInCall()) {
      console.log('[IncomingCallService] 检测到外呼状态残留，强制清理')
      callStateService.stopMonitoring()
    }

    const prevState = this.lastPhoneState
    this.lastPhoneState = state

    console.log('[IncomingCallService] 通话状态:', prevState, '->', state, ', phoneNumber=[' + phoneNumber + '], type=' + typeof phoneNumber + ', len=' + (phoneNumber ? phoneNumber.length : 0))

    switch (state) {
      case 1: // RINGING
        if (phoneNumber && phoneNumber.length >= 3 && phoneNumber !== '未知来电') {
          console.log('[IncomingCallService] ✅ RINGING 获取到来电号码:', phoneNumber)
          this.onRingingDetected(phoneNumber)
        } else if (!this.currentIncoming) {
          console.log('[IncomingCallService] ⚠️ RINGING 但无有效号码，启动 CallLog 轮询')
          // #ifdef APP-PLUS
          this.quickResolveAndReport()
          // #endif
        }
        break

      case 2: // OFFHOOK
        // 接听后立即停止铃声和振动
        this.stopVibrateLoop()
        // #ifdef APP-PLUS
        this.stopRingtone()
        // #endif
        // 如果 currentIncoming 为空但 prevState 是 RINGING，说明 RINGING 被跳过了，补建
        if (!this.currentIncoming && prevState === 1) {
          console.log('[IncomingCallService] OFFHOOK 但 currentIncoming 为空（RINGING 被跳过），补建')
          this.currentIncoming = {
            callerNumber: phoneNumber || '未知来电',
            startTime: Date.now(),
          }
          this.hasReportedIncoming = false
        }
        if (this.currentIncoming && !this.currentIncoming.connectTime) {
          this.currentIncoming.connectTime = Date.now()
          console.log('[IncomingCallService] 来电已接听')

          // 上报接听状态给后端，后端会转发 CALL_STATUS 给CRM端关闭来电弹窗
          const answeredCallId = this.currentIncoming.callId || ''
          const answeredNumber = this.currentIncoming.callerNumber || ''

          // WebSocket 上报（不管 callId 是否有值都发，后端可按号码匹配）
          if (wsService.isConnected) {
            wsService.reportCallStatus(answeredCallId, 'connected', {
              callType: 'inbound',
              phoneNumber: answeredNumber,
            })
            console.log('[IncomingCallService] WS上报接听状态, callId:', answeredCallId, 'number:', answeredNumber)
          } else {
            console.warn('[IncomingCallService] WebSocket 未连接，无法上报接听状态，使用HTTP备份')
          }

          // HTTP 备份上报（WS 断开时兜底）
          reportCallStatus({
            callId: answeredCallId,
            status: 'connected',
            phoneNumber: answeredNumber,
          }).catch((e: any) => {
            console.warn('[IncomingCallService] HTTP上报接听状态失败:', e)
          })
        }
        break

      case 0: // IDLE
        // 挂断/结束后停止铃声和振动
        this.stopVibrateLoop()
        // #ifdef APP-PLUS
        this.stopRingtone()
        // #endif
        if (this.currentIncoming) {
          // 大部分 Android 设备在通话结束后才写入 CallLog
          // 延迟 1 秒再处理结束流程，给系统时间写入 CallLog
          if (!this.currentIncoming.callerNumber || this.currentIncoming.callerNumber === '未知来电') {
            console.log('[IncomingCallService] IDLE 号码仍未知，延迟 1 秒等待 CallLog 写入后再处理')
            setTimeout(() => {
              if (this.currentIncoming) {
                this.onIncomingCallEnded()
              }
            }, 1000)
          } else {
            this.onIncomingCallEnded()
          }
        }
        break
    }
  }

  private onRingingDetected(callerNumber: string) {
    if (this.currentIncoming?.callerNumber === callerNumber && this.hasReportedIncoming) {
      return
    }

    console.log('[IncomingCallService] 检测到来电:', callerNumber)

    this.currentIncoming = {
      callerNumber,
      startTime: Date.now(),
    }
    this.hasReportedIncoming = false

    this.triggerIncomingNotify(callerNumber)
    this.notifyIncomingCallbacks(this.currentIncoming)
    this.reportIncomingToServer(callerNumber)

    // 跳转到来电卡片页面，显示客户详情
    this.navigateToIncomingPage(callerNumber)
  }

  private navigateToIncomingPage(callerNumber: string) {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const currentRoute = (currentPage as any)?.route || ''
    if (currentRoute.includes('incoming-call') || currentRoute.includes('calling')) return

    const name = this.currentIncoming?.customerName || ''
    const cId = this.currentIncoming?.customerId || ''
    const callIdParam = this.currentIncoming?.callId || ''
    uni.navigateTo({
      url: `/pages/incoming-call/index?phone=${encodeURIComponent(callerNumber)}&name=${encodeURIComponent(name)}&customerId=${cId}&callId=${callIdParam}&state=ringing`,
      fail: (err) => {
        console.warn('[IncomingCallService] 跳转来电页面失败:', err)
      },
    })
  }

  private async onIncomingCallEnded() {
    if (!this.currentIncoming) return

    const info = { ...this.currentIncoming }
    const endTime = Date.now()

    // 如果号码是"未知来电"，在通话结束后从通话记录/录音文件补获真实号码
    let finalNumber = info.callerNumber
    if (!finalNumber || finalNumber === '未知来电') {
      // #ifdef APP-PLUS
      // 延迟递增，录音文件可能需要数秒才会写入磁盘
      const delays = [500, 1000, 1500, 2000, 2000, 3000, 3000, 4000, 5000, 5000]
      for (let attempt = 0; attempt < delays.length; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, delays[attempt]))
          // 先试 CallLog（可能在某些设备上终于可用），传入开始时间避免取到旧记录
          let resolvedNum = await this.tryResolveCallerFromCallLog(info.startTime)
          // CallLog 失败，试录音文件名（传入来电开始时间避免匹配旧文件）
          if (!resolvedNum) {
            resolvedNum = await this.tryResolveCallerFromRecordingFile(info.startTime)
          }
          if (resolvedNum && resolvedNum !== '未知来电') {
            console.log('[IncomingCallService] ✅ 通话结束后补获号码(第' + (attempt + 1) + '次):', resolvedNum)
            finalNumber = resolvedNum
            info.callerNumber = resolvedNum
            // 通知前端页面更新号码
            uni.$emit('incoming:number_updated', { callerNumber: resolvedNum })
            break
          }
        } catch (e) {
          console.warn('[IncomingCallService] 通话结束后补获号码失败(第' + (attempt + 1) + '次):', e)
        }
      }
      // #endif
    }

    let duration = 0
    if (info.connectTime) {
      duration = Math.floor((endTime - info.connectTime) / 1000)
    }

    const callId = info.callId || `IN-local-${info.startTime}`
    const status = duration > 0 ? 'connected' : 'missed'

    console.log('[IncomingCallService] 来电结束:', finalNumber, '时长:', duration)

    const reportData = {
      callId,
      phoneNumber: finalNumber,
      callType: 'inbound' as const,
      status,
      startTime: new Date(info.startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      hasRecording: false,
    }

    // WebSocket 通知
    wsService.reportCallEnd(callId, {
      ...reportData,
      endReason: 'system_hangup',
    })

    // HTTP 上报
    try {
      await reportCallEnd(reportData)
    } catch (e) {
      console.error('[IncomingCallService] 上报通话结束失败:', e)
    }

    // 保存供登记页使用
    uni.setStorageSync('lastEndedCall', {
      callId,
      customerName: info.customerName,
      customerId: info.customerId,
      phoneNumber: finalNumber,
      duration,
      endTime: new Date(endTime).toISOString(),
      wasConnected: duration > 0,
      hasRecording: false,
      callType: 'inbound',
    })

    uni.removeStorageSync('currentIncomingCall')

    // 触发结束回调
    this.incomingEndCallbacks.forEach((cb) => {
      try {
        cb(info, duration)
      } catch (e) {
        console.error('[IncomingCallService] 结束回调错误:', e)
      }
    })

    uni.$emit('call:completed')

    // 重置状态
    this.currentIncoming = null

    // 如果号码仍为"未知来电"，在后台继续尝试补获（录音文件写入可能延迟较大）
    // #ifdef APP-PLUS
    if (!finalNumber || finalNumber === '未知来电') {
      this.backgroundResolveNumber(callId, info, duration, endTime)
    }
    // #endif
    this.hasReportedIncoming = false
    this.lastPhoneState = 0

    // 跳转登记页
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/call-ended/index?callId=${callId}&name=${encodeURIComponent(info.customerName || info.callerNumber)}&customerId=${info.customerId || ''}&duration=${duration}&hasRecording=false&callType=inbound`,
      })
    }, 300)

    // 异步处理录音
    this.processRecordingAsync(info, duration, endTime)
  }

  private async reportIncomingToServer(callerNumber: string) {
    if (this.hasReportedIncoming) return

    const userStore = useUserStore()
    const deviceId = userStore.deviceInfo?.deviceId

    if (wsService.isConnected && deviceId) {
      this.hasReportedIncoming = true
      wsService.send('INCOMING_CALL_DETECTED', { callerNumber, deviceId })

      // WS 确认超时则走 HTTP 备份
      this.confirmTimeout = setTimeout(() => {
        if (!this.currentIncoming?.callId) {
          console.log('[IncomingCallService] WS 确认超时，使用 HTTP 备份')
          this.hasReportedIncoming = false
          this.reportIncomingHttp(callerNumber)
        }
      }, 3000)
    } else {
      await this.reportIncomingHttp(callerNumber)
    }
  }

  private async reportIncomingHttp(callerNumber: string) {
    if (this.hasReportedIncoming && this.currentIncoming?.callId) return
    this.hasReportedIncoming = true

    try {
      const res = await reportIncomingCall({ callerNumber })
      const data = (res as any)?.data || res
      if (data?.callId) {
        this.handleIncomingCallConfirmed({
          callId: data.callId,
          callerNumber,
          customerId: data.customerId,
          customerName: data.customerName,
        })
      }
    } catch (e) {
      console.error('[IncomingCallService] HTTP 上报来电失败:', e)
      this.hasReportedIncoming = false
    }
  }

  private triggerIncomingNotify(callerNumber: string) {
    const settings = this.getCallSettings()

    // 持续振动：每隔 1.5 秒振动一次，模拟真实来电振动节奏
    if (settings.vibrate) {
      uni.vibrateLong({})
      this.stopVibrateLoop()
      this.vibrateTimer = setInterval(() => {
        if (!this.currentIncoming) {
          this.stopVibrateLoop()
          return
        }
        uni.vibrateLong({})
      }, 1500)
    }

    if (settings.callNotify) {
      // #ifdef APP-PLUS
      try {
        const displayName = this.currentIncoming?.customerName || callerNumber
        // 系统通知栏常驻通知
        plus.push.createMessage(
          `来电: ${displayName}`,
          JSON.stringify({ type: 'incoming_call', callerNumber }),
          { title: '客户来电', cover: false }
        )

        // 额外使用 Android NotificationManager 创建高优先级通知
        // 确保 APP 在前台/后台/锁屏时都能看到来电通知
        this.showAndroidNotification(displayName, callerNumber)

        // 播放来电提示音
        this.playRingtone()
      } catch (e) {
        console.warn('[IncomingCallService] 本地通知失败:', e)
      }
      // #endif
    }
  }

  private stopVibrateLoop() {
    if (this.vibrateTimer) {
      clearInterval(this.vibrateTimer)
      this.vibrateTimer = null
    }
  }

  // #ifdef APP-PLUS
  private playRingtone() {
    this.stopRingtone()
    try {
      // 使用系统默认铃声
      const RingtoneManager = plus.android.importClass('android.media.RingtoneManager') as any
      const ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
      const main = plus.android.runtimeMainActivity()
      const ringtone = RingtoneManager.getRingtone(main, ringtoneUri)
      if (ringtone) {
        ringtone.play()
        this.ringtonePlayer = ringtone
        console.log('[IncomingCallService] 来电铃声播放中')
      }
    } catch (e) {
      console.warn('[IncomingCallService] 播放铃声失败:', e)
    }
  }

  private stopRingtone() {
    try {
      if (this.ringtonePlayer) {
        if (this.ringtonePlayer.isPlaying && this.ringtonePlayer.isPlaying()) {
          this.ringtonePlayer.stop()
        }
        this.ringtonePlayer = null
      }
    } catch (e) {
      console.warn('[IncomingCallService] 停止铃声失败:', e)
    }
  }

  /**
   * 使用 Android NotificationManager 创建高优先级来电通知
   * 确保 APP 在前台、后台、锁屏状态下都能看到通知
   */
  private showAndroidNotification(displayName: string, callerNumber: string) {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const Build = plus.android.importClass('android.os.Build') as any
      const sdkInt = Build.VERSION.SDK_INT

      // Android 13+ 需要运行时请求 POST_NOTIFICATIONS 权限
      if (sdkInt >= 33) {
        try {
          const permission = 'android.permission.POST_NOTIFICATIONS'
          const granted = (main as any).checkSelfPermission(permission)
          if (granted !== 0) {
            // 0 = PERMISSION_GRANTED
            const permissions = plus.android.importClass('java.lang.reflect.Array') as any
            const permArray = permissions.newInstance(plus.android.importClass('java.lang.String'), 1)
            permissions.set(permArray, 0, permission)
            ;(main as any).requestPermissions(permArray, 1)
          }
        } catch (_e) {
          // 权限请求失败不影响后续通知尝试
        }
      }

      const notificationManager = (main as any).getSystemService(Context.NOTIFICATION_SERVICE)
      const channelId = 'crm_incoming_call'

      // 创建通知渠道（Android 8+ 必需）
      if (sdkInt >= 26) {
        const NotificationChannel = plus.android.importClass('android.app.NotificationChannel') as any
        const channel = new NotificationChannel(channelId, '客户来电通知', 4)
        channel.enableLights(true)
        channel.enableVibration(true)
        channel.setShowBadge(true)
        notificationManager.createNotificationChannel(channel)
      }

      // 使用原生 Notification.Builder（不依赖 AndroidX）
      const Notification = plus.android.importClass('android.app.Notification') as any
      const Intent = plus.android.importClass('android.content.Intent') as any
      const PendingIntent = plus.android.importClass('android.app.PendingIntent') as any

      const intent = new Intent(main, (main as any).getClass())
      intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
      intent.addFlags(0x04000000) // FLAG_ACTIVITY_CLEAR_TOP
      const pendingIntent = PendingIntent.getActivity(main, 0, intent, 0x08000000)

      const contentText = callerNumber && callerNumber !== '未知来电'
        ? `${displayName} ${callerNumber}`
        : displayName

      // 使用 Notification.Builder（Android 8+ 支持 channelId 参数）
      const builder = new Notification.Builder(main, channelId)
      builder.setSmallIcon(0x01080079) // android.R.drawable.stat_sys_phone_call
      builder.setContentTitle('客户来电')
      builder.setContentText(contentText)
      builder.setContentIntent(pendingIntent)
      builder.setAutoCancel(true)

      // Android 7- 设置优先级
      if (sdkInt < 26) {
        builder.setPriority(2) // PRIORITY_HIGH
      }

      notificationManager.notify(1001, builder.build())
      console.log('[IncomingCallService] Android 通知已发送')
    } catch (e) {
      console.warn('[IncomingCallService] Android 通知创建失败:', e)
    }
  }
  // #endif

  private notifyIncomingCallbacks(info: IncomingCallInfo) {
    this.incomingCallbacks.forEach((cb) => {
      try {
        cb(info)
      } catch (e) {
        console.error('[IncomingCallService] 回调错误:', e)
      }
    })
  }

  // #ifdef APP-PLUS
  /**
   * 后台持续尝试从录音文件提取来电号码，成功后更新后端记录
   */
  private async backgroundResolveNumber(
    callId: string,
    info: IncomingCallInfo,
    duration: number,
    endTime: number
  ) {
    // 更长的延迟，等录音文件写入
    const delays = [3000, 5000, 5000, 8000, 10000, 15000]
    for (let attempt = 0; attempt < delays.length; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]))
        // ⚠️ 防串号：如果期间有新来电开始，立即中止本任务，
        // 避免把上一通补获的号码覆盖到新来电的显示/记录上
        if (this.currentIncoming) {
          console.log('[IncomingCallService] 检测到新来电进行中，中止上一通的后台补获任务')
          return
        }
        // 传入来电开始时间，避免匹配到旧录音文件
        let resolved = await this.tryResolveCallerFromRecordingFile(info.startTime)
        if (!resolved) {
          resolved = await this.tryResolveCallerFromCallLog(info.startTime)
        }
        if (resolved && resolved !== '未知来电') {
          console.log('[IncomingCallService] ✅ 后台补获号码成功(第' + (attempt + 1) + '次):', resolved)

          // 再次确认没有新来电开始（异步查询期间也可能来新电话）
          if (this.currentIncoming) {
            console.log('[IncomingCallService] 补获完成但已有新来电，放弃更新以防串号')
            return
          }

          // 通知前端更新
          uni.$emit('incoming:number_updated', { callerNumber: resolved })

          // 重新上报后端（更新通话记录中的号码）
          try {
            wsService.reportCallEnd(callId, {
              status: duration > 0 ? 'connected' : 'missed',
              phoneNumber: resolved,
              callType: 'inbound',
              startTime: new Date(info.startTime).toISOString(),
              endTime: new Date(endTime).toISOString(),
              duration,
              hasRecording: false,
              endReason: 'number_updated',
            })
            await reportCallEnd({
              callId,
              phoneNumber: resolved,
              callType: 'inbound',
              status: duration > 0 ? 'connected' : 'missed',
              startTime: new Date(info.startTime).toISOString(),
              endTime: new Date(endTime).toISOString(),
              duration,
              hasRecording: false,
            })
          } catch (e) {
            console.warn('[IncomingCallService] 后台补获号码上报失败:', e)
          }

          // 更新本地存储
          const saved = uni.getStorageSync('lastEndedCall')
          if (saved && saved.callId === callId) {
            saved.phoneNumber = resolved
            uni.setStorageSync('lastEndedCall', saved)
          }
          return
        }
      } catch (e) {
        console.warn('[IncomingCallService] 后台补获第' + (attempt + 1) + '次失败:', e)
      }
    }
    console.log('[IncomingCallService] 后台补获号码全部失败')
  }
  // #endif

  private async processRecordingAsync(
    info: IncomingCallInfo,
    duration: number,
    endTime: number
  ) {
    if (duration <= 0 || !info.callId) {
      console.log('[IncomingCallService] 未接通或无 callId，跳过录音')
      return
    }

    const settings = this.getCallSettings()
    if (!settings.autoUploadRecording) {
      console.log('[IncomingCallService] 自动上传已关闭，跳过录音')
      return
    }

    console.log('[IncomingCallService] 开始异步处理录音...')

    try {
      const result = await recordingService.processCallRecording({
        callId: info.callId,
        phoneNumber: info.callerNumber,
        startTime: info.startTime,
        endTime,
        duration,
      })

      if (result.found && result.uploaded) {
        console.log('[IncomingCallService] 录音上传成功:', result.recordingPath)
        wsService.reportCallEnd(info.callId, {
          status: 'connected',
          callType: 'inbound',
          duration,
          hasRecording: true,
        })
      }
    } catch (e) {
      console.error('[IncomingCallService] 录音处理失败:', e)
    }
  }

  private getCallSettings(): CallSettings {
    try {
      const raw = uni.getStorageSync('callSettings')
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          callNotify: parsed.callNotify !== false,
          vibrate: !!parsed.vibrate,
          autoUploadRecording: parsed.autoUploadRecording !== false,
        }
      }
    } catch (e) {
      console.error('[IncomingCallService] 读取设置失败:', e)
    }
    return { callNotify: true, vibrate: false, autoUploadRecording: true }
  }

  private clearConfirmTimeout() {
    if (this.confirmTimeout) {
      clearTimeout(this.confirmTimeout)
      this.confirmTimeout = null
    }
  }

  /**
   * Android 前台保活：WakeLock + 常驻通知，确保后台仍能检测来电
   */
  // #ifdef APP-PLUS
  private startForegroundKeepAlive() {
    if (this.foregroundActive) return

    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const PowerManager = plus.android.importClass('android.os.PowerManager') as any

      const pm = (main as any).getSystemService(Context.POWER_SERVICE)
      if (pm && !this.wakeLock) {
        this.wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, 'CRM:IncomingCallListener')
        this.wakeLock.setReferenceCounted(false)
        this.wakeLock.acquire(10 * 60 * 1000)
        console.log('[IncomingCallService] WakeLock 已获取')
      }

      plus.push.createMessage(
        '来电监听运行中，可正常接收客户来电',
        JSON.stringify({ type: 'foreground_service' }),
        { title: 'CRM工作手机', cover: false }
      )

      this.foregroundActive = true
    } catch (e) {
      console.warn('[IncomingCallService] 前台保活启动失败:', e)
    }
  }

  private stopForegroundKeepAlive() {
    try {
      if (this.wakeLock) {
        if (this.wakeLock.isHeld && this.wakeLock.isHeld()) {
          this.wakeLock.release()
        }
        this.wakeLock = null
      }
    } catch (e) {
      console.warn('[IncomingCallService] 释放 WakeLock 失败:', e)
    }
    this.foregroundActive = false
  }

  /**
   * 从系统通话记录补报离线期间的未接来电
   */
  async syncMissedCallsFromCallLog() {
    if (this.missedSyncRunning) return

    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return

    this.missedSyncRunning = true

    try {
      const calls = await this.readRecentCallLogEntries()
      if (calls.length === 0) return

      const lastSync = Number(uni.getStorageSync('lastMissedCallSyncAt') || 0)
      const since = lastSync > 0 ? lastSync : Date.now() - 24 * 60 * 60 * 1000
      const pending = calls.filter((c) => c.timestamp > since)

      if (pending.length === 0) return

      console.log('[IncomingCallService] 补报离线来电:', pending.length, '条')

      const res = await reportMissedCalls({
        calls: pending.map((c) => ({
          callerNumber: c.callerNumber,
          callTime: new Date(c.timestamp).toISOString(),
          duration: c.duration,
          callStatus: c.callStatus,
        })),
      })

      const data = (res as any)?.data || res
      if ((data?.created || 0) > 0) {
        uni.showToast({
          title: `已补录 ${data.created} 条离线来电`,
          icon: 'none',
          duration: 2500,
        })
      }

      uni.setStorageSync('lastMissedCallSyncAt', String(Date.now()))
    } catch (e) {
      console.warn('[IncomingCallService] 补报离线来电失败:', e)
    } finally {
      this.missedSyncRunning = false
    }
  }

  private readRecentCallLogEntries(): Promise<
    Array<{
      callerNumber: string
      timestamp: number
      duration: number
      callStatus: 'missed' | 'rejected' | 'connected' | 'busy'
    }>
  > {
    return new Promise((resolve) => {
      try {
        const main = plus.android.runtimeMainActivity()
        plus.android.importClass('android.content.ContentResolver')
        plus.android.importClass('android.database.Cursor')
        const cr = (main as any).getContentResolver()

        // 获取 CallLog URI
        let contentUri: any = null
        try {
          const CallLogCalls = plus.android.importClass('android.provider.CallLog$Calls') as any
          contentUri = CallLogCalls.CONTENT_URI
        } catch (_e) {
          const Uri = plus.android.importClass('android.net.Uri') as any
          contentUri = Uri.parse('content://call_log/calls')
        }

        const cursor = cr.query(contentUri, null, null, null, 'date DESC')

        const results: Array<{
          callerNumber: string
          timestamp: number
          duration: number
          callStatus: 'missed' | 'rejected' | 'connected' | 'busy'
        }> = []

        if (!cursor) {
          resolve([])
          return
        }

        const numIdx = cursor.getColumnIndex('number')
        const typeIdx = cursor.getColumnIndex('type')
        const dateIdx = cursor.getColumnIndex('date')
        const durIdx = cursor.getColumnIndex('duration')
        const maxRows = 30
        let count = 0

        while (cursor.moveToNext() && count < maxRows) {
          const number = numIdx >= 0 ? String(cursor.getString(numIdx) || '').trim() : ''
          const type = typeIdx >= 0 ? Number(cursor.getInt(typeIdx)) : 0
          const date = dateIdx >= 0 ? Number(cursor.getLong(dateIdx)) : 0
          const duration = durIdx >= 0 ? (Number(cursor.getLong(durIdx)) || 0) : 0

          if (!number || !date) continue

          let callStatus: 'missed' | 'rejected' | 'connected' | 'busy' = 'missed'
          if (type === 1) {
            callStatus = duration > 0 ? 'connected' : 'missed'
          } else if (type === 3) {
            callStatus = 'missed'
          } else if (type === 5) {
            callStatus = 'rejected'
          } else {
            continue
          }

          results.push({
            callerNumber: number,
            timestamp: date,
            duration,
            callStatus,
          })
          count++
        }

        cursor.close()
        resolve(results)
      } catch (e) {
        console.warn('[IncomingCallService] 读取通话记录失败:', e)
        resolve([])
      }
    })
  }
  // #endif

  // #ifdef APP-PLUS
  /**
   * 从系统 CallLog 读取最近的来电号码
   * 尝试多种方式：CallLog$Calls / Uri.parse / managedQuery / plus.android.invoke
   * @param sinceTime 本次来电开始时间戳——只接受该时间之后写入的记录，
   *                  避免把上一通电话的号码错误当成本次来电（串号）
   */
  private async tryResolveCallerFromCallLog(sinceTime?: number): Promise<string> {
    // 默认用当前来电的开始时间做时间窗口，防止取到上一通电话的号码
    const since = sinceTime || this.currentIncoming?.startTime
    return new Promise((resolve) => {
      try {
        const main = plus.android.runtimeMainActivity()
        plus.android.importClass('android.content.ContentResolver')
        plus.android.importClass('android.database.Cursor')

        // 收集所有可能的 URI
        const urisToTry: Array<{ uri: any; label: string }> = []

        try {
          const CallLogCalls = plus.android.importClass('android.provider.CallLog$Calls') as any
          if (CallLogCalls && CallLogCalls.CONTENT_URI) {
            urisToTry.push({ uri: CallLogCalls.CONTENT_URI, label: 'CallLog$Calls.CONTENT_URI' })
          }
        } catch (_e) { /* skip */ }

        const Uri = plus.android.importClass('android.net.Uri') as any
        urisToTry.push({ uri: Uri.parse('content://call_log/calls'), label: 'content://call_log/calls' })
        urisToTry.push({ uri: Uri.parse('content://calls'), label: 'content://calls' })

        // 方法1: ContentResolver.query (通过桥接)
        const cr = (main as any).getContentResolver()
        for (const { uri, label } of urisToTry) {
          try {
            const cursor = cr.query(uri, null, null, null, 'date DESC')
            if (cursor) {
              const result = this.extractNumberFromCursor(cursor, since)
              if (result) {
                console.log('[IncomingCallService] ✅ CallLog查询成功(' + label + '): ' + result)
                resolve(result)
                return
              }
            } else {
              console.log('[IncomingCallService] ' + label + ' cr.query 返回 null')
            }
          } catch (e: any) {
            console.log('[IncomingCallService] ' + label + ' cr.query 异常:', e?.message || e)
          }
        }

        // 方法2: plus.android.invoke 底层调用（绕过桥接方法代理）
        for (const { uri, label } of urisToTry) {
          try {
            const cursor = plus.android.invoke(cr, 'query', uri, null, null, null, 'date DESC')
            if (cursor) {
              plus.android.importClass('android.database.Cursor')
              const result = this.extractNumberFromCursor(cursor, since)
              if (result) {
                console.log('[IncomingCallService] ✅ invoke查询成功(' + label + '): ' + result)
                resolve(result)
                return
              }
            } else {
              console.log('[IncomingCallService] ' + label + ' invoke 返回 null')
            }
          } catch (e: any) {
            console.log('[IncomingCallService] ' + label + ' invoke 异常:', e?.message || e)
          }
        }

        // 方法3: Activity.managedQuery（已弃用但某些设备仍有效）
        for (const { uri, label } of urisToTry) {
          try {
            const cursor = (main as any).managedQuery(uri, null, null, null, 'date DESC')
            if (cursor) {
              plus.android.importClass('android.database.Cursor')
              const result = this.extractNumberFromCursor(cursor, since)
              if (result) {
                console.log('[IncomingCallService] ✅ managedQuery成功(' + label + '): ' + result)
                resolve(result)
                return
              }
            } else {
              console.log('[IncomingCallService] ' + label + ' managedQuery 返回 null')
            }
          } catch (e: any) {
            console.log('[IncomingCallService] ' + label + ' managedQuery 异常:', e?.message || e)
          }
        }

        // 方法4: 使用 ApplicationContext 的 ContentResolver
        try {
          const appCtx = (main as any).getApplicationContext()
          plus.android.importClass('android.content.ContentResolver')
          const appCr = appCtx.getContentResolver()
          for (const { uri, label } of urisToTry) {
            try {
              const cursor = appCr.query(uri, null, null, null, 'date DESC')
              if (cursor) {
                const result = this.extractNumberFromCursor(cursor, since)
                if (result) {
                  console.log('[IncomingCallService] ✅ AppContext查询成功(' + label + '): ' + result)
                  resolve(result)
                  return
                }
              } else {
                console.log('[IncomingCallService] ' + label + ' appCtx 返回 null')
              }
            } catch (e: any) {
              console.log('[IncomingCallService] ' + label + ' appCtx 异常:', e?.message || e)
            }
          }
        } catch (e: any) {
          console.log('[IncomingCallService] AppContext查询失败:', e?.message || e)
        }

        // 方法5: ContentProviderClient（直连 content provider，绕过中间件）
        for (const { uri, label } of urisToTry) {
          try {
            const client = cr.acquireUnstableContentProviderClient(uri)
            if (client) {
              plus.android.importClass('android.content.ContentProviderClient')
              try {
                const cursor = client.query(uri, null, null, null, 'date DESC')
                if (cursor) {
                  const result = this.extractNumberFromCursor(cursor, since)
                  if (result) {
                    console.log('[IncomingCallService] ✅ ContentProviderClient成功(' + label + '): ' + result)
                    try { client.release() } catch (_) { /* skip */ }
                    resolve(result)
                    return
                  }
                } else {
                  console.log('[IncomingCallService] ' + label + ' ProviderClient 返回 null')
                }
              } finally {
                try { client.release() } catch (_) { /* skip */ }
              }
            } else {
              console.log('[IncomingCallService] ' + label + ' acquireClient 返回 null')
            }
          } catch (e: any) {
            console.log('[IncomingCallService] ' + label + ' ProviderClient 异常:', e?.message || e)
          }
        }

        // 方法6: CursorLoader（异步加载器同步执行）
        for (const { uri, label } of urisToTry) {
          try {
            const CursorLoader = plus.android.importClass('android.content.CursorLoader') as any
            const loader = new CursorLoader(main, uri, null, null, null, 'date DESC')
            const cursor = loader.loadInBackground()
            if (cursor) {
              const result = this.extractNumberFromCursor(cursor, since)
              if (result) {
                console.log('[IncomingCallService] ✅ CursorLoader成功(' + label + '): ' + result)
                resolve(result)
                return
              }
            } else {
              console.log('[IncomingCallService] ' + label + ' CursorLoader 返回 null')
            }
          } catch (e: any) {
            console.log('[IncomingCallService] ' + label + ' CursorLoader 异常:', e?.message || e)
          }
        }

        // 方法7: 带 CancellationSignal 的查询（使用不同的方法重载）
        try {
          const CancellationSignal = plus.android.importClass('android.os.CancellationSignal') as any
          const signal = new CancellationSignal()
          for (const { uri, label } of urisToTry) {
            try {
              const cursor = cr.query(uri, null, null, null, 'date DESC', signal)
              if (cursor) {
                const result = this.extractNumberFromCursor(cursor, since)
                if (result) {
                  console.log('[IncomingCallService] ✅ CancellationSignal查询成功(' + label + '): ' + result)
                  resolve(result)
                  return
                }
              } else {
                console.log('[IncomingCallService] ' + label + ' CancelSignal 返回 null')
              }
            } catch (e: any) {
              console.log('[IncomingCallService] ' + label + ' CancelSignal 异常:', e?.message || e)
            }
          }
        } catch (e: any) {
          console.log('[IncomingCallService] CancellationSignal 创建失败:', e?.message || e)
        }

        console.log('[IncomingCallService] 所有CallLog查询方式均未成功')
        resolve('')
      } catch (e: any) {
        console.warn('[IncomingCallService] 读取通话记录失败:', e?.message || e)
        resolve('')
      }
    })
  }

  /**
   * 从 Cursor 中提取本次来电的号码
   * @param sinceTime 本次来电开始时间戳。提供时只接受该时间之后（含5秒缓冲）写入的
   *                  呼入类记录，严禁把上一通电话的号码当成本次来电（串号）
   */
  private extractNumberFromCursor(cursor: any, sinceTime?: number): string {
    try {
      if (!cursor) return ''

      if (!cursor.moveToFirst()) {
        cursor.close()
        console.log('[IncomingCallService] CallLog查询: 无记录')
        return ''
      }

      const numIdx = cursor.getColumnIndex('number')
      const typeIdx = cursor.getColumnIndex('type')
      const dateIdx = cursor.getColumnIndex('date')

      if (numIdx < 0) {
        const colCount = cursor.getColumnCount()
        const cols: string[] = []
        for (let i = 0; i < colCount && i < 20; i++) {
          cols.push(cursor.getColumnName(i))
        }
        cursor.close()
        console.log('[IncomingCallService] CallLog列名:', cols.join(', '))
        return ''
      }

      // 遍历最近几条记录，找到符合本次来电时间窗口的呼入记录
      let checked = 0
      do {
        checked++
        const number = '' + (cursor.getString(numIdx) || '')
        const type = typeIdx >= 0 ? cursor.getInt(typeIdx) : -1
        const date = dateIdx >= 0 ? Number('' + cursor.getLong(dateIdx)) : 0

        // 时间窗口校验：
        // - 有本次来电开始时间：记录必须晚于 (开始时间 - 5秒)，且记录无时间戳时直接拒绝
        // - 无开始时间（兼容旧调用）：退回"最近120秒"宽松判断
        let timeOk: boolean
        if (sinceTime) {
          timeOk = date > 0 && date >= (sinceTime - 5000)
        } else {
          timeOk = date > 0 ? (Date.now() - date) < 120000 : true
        }

        // 类型校验：1=呼入 3=未接 4=语音信箱 5=拒接 6=拦截；排除 2=呼出
        const typeOk = type < 0 || type !== 2

        console.log('[IncomingCallService] CallLog记录#' + checked + ': number=' + number + ', type=' + type + ', date=' + date + ', timeOk=' + timeOk + ', typeOk=' + typeOk)

        if (timeOk && typeOk && number && number.length >= 3 && number !== '-1' && number !== '-2' && number !== 'unknown') {
          cursor.close()
          return number
        }
      } while (checked < 5 && cursor.moveToNext())

      cursor.close()
      return ''
    } catch (e: any) {
      try { cursor?.close?.() } catch (_) { /* ignore */ }
      console.log('[IncomingCallService] extractNumberFromCursor 异常:', e?.message || e)
      return ''
    }
  }
  // #endif

  // #ifdef APP-PLUS
  /**
   * 备选方案：从录音文件名中提取来电号码
   * 华为等设备的录音文件名格式：134 2882 7364_20260625142304.amr
   * 即使没有 READ_CALL_LOG 权限，录音文件名也包含号码
   */
  private async tryResolveCallerFromRecordingFile(callStartTime?: number): Promise<string> {
    try {
      const recordings = await recordingService.scanRecordingFolders()
      if (recordings.length === 0) return ''

      // 关键：只使用在当前来电开始之后创建/修改的录音文件
      // 避免用上一通电话的录音文件错误匹配当前来电
      const startTime = callStartTime || this.currentIncoming?.startTime
      if (!startTime) {
        console.log('[IncomingCallService] 无法确定来电开始时间，跳过录音文件匹配')
        return ''
      }

      const recentFiles = recordings
        .filter(f => f.lastModified >= (startTime - 5000))
        .sort((a, b) => b.lastModified - a.lastModified)

      if (recentFiles.length === 0) {
        console.log('[IncomingCallService] 无当前通话时段的录音文件(callStart=' + new Date(startTime).toLocaleTimeString() + ')')
        return ''
      }

      const fileName = recentFiles[0].name
      console.log('[IncomingCallService] 尝试从录音文件名提取号码:', fileName, '修改时间:', new Date(recentFiles[0].lastModified).toLocaleTimeString())

      // 去掉扩展名
      const nameWithoutExt = fileName.replace(/\.\w+$/, '')
      // 提取号码部分（下划线前面的部分），华为格式：134 2882 7364_20260625142304
      const parts = nameWithoutExt.split('_')
      if (parts.length >= 2) {
        // 去掉空格得到纯数字号码
        const numberPart = parts[0].replace(/[\s\-()]/g, '')
        // 验证是否是有效的手机号（11位数字，1开头）
        if (/^1\d{10}$/.test(numberPart)) {
          console.log('[IncomingCallService] ✅ 从录音文件名提取到号码:', numberPart)
          return numberPart
        }
        // 可能是固话号码（7-12位数字）
        if (/^\d{7,12}$/.test(numberPart)) {
          console.log('[IncomingCallService] ✅ 从录音文件名提取到号码(固话):', numberPart)
          return numberPart
        }
      }

      // 备选：直接从文件名中提取手机号模式
      const phoneMatch = nameWithoutExt.replace(/[\s\-()]/g, '').match(/1\d{10}/)
      if (phoneMatch) {
        console.log('[IncomingCallService] ✅ 从录音文件名正则提取到号码:', phoneMatch[0])
        return phoneMatch[0]
      }

      return ''
    } catch (e: any) {
      console.warn('[IncomingCallService] 从录音文件提取号码失败:', e?.message || e)
      return ''
    }
  }
  // #endif
}

export const incomingCallService = new IncomingCallService()
export default incomingCallService
