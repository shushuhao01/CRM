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
import { openBrandPermissionManager, getManualPermissionGuide } from '@/utils/permissionGuide'

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
  private wakeLockRenewTimer: ReturnType<typeof setInterval> | null = null
  private missedSyncRunning = false
  private vibrateTimer: ReturnType<typeof setInterval> | null = null
  private ringtonePlayer: any = null
  // #ifdef APP-PLUS
  private callLogObserver: any = null
  private phoneStateReceiver: any = null
  private phoneStateReceiverAlt: any = null
  private callLogPollTimer: ReturnType<typeof setInterval> | null = null
  // CallScreeningService（Android 10+ 响铃前取号，绕过ROM对CallLog的拦截）
  // 与原生服务通过 SharedPreferences + 应用内广播通讯，不依赖UniModule插件模块
  private callScreeningAvailable = false // 服务类是否已打进APK
  private callScreeningSupported = false // 系统是否支持（Android 10+）
  private callScreeningRoleHeld = false // 是否已持有"来电显示与骚扰拦截"角色
  private callScreenedReceiver: any = null // 来电筛选广播接收器
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
    // 优先初始化来电筛选插件（Android 10+ 响铃前直接获取号码，最可靠）
    this.initCallScreening()
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
    // 引导用户把APP加入电池优化白名单（仅提示一次），防止后台被系统冻结
    this.requestIgnoreBatteryOptimizations()
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
    // 注销来电筛选广播接收器（原生Service仍会缓存号码到SharedPreferences，下次启动可补读）
    this.unregisterCallScreenedReceiver()
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

  // ============================================================
  // 来电筛选（CallScreeningService，Android 10+）
  // 系统在响铃前回调号码，绕过荣耀/OPPO等ROM对CallLog的拦截，
  // 100%是当前通来电，从根上解决"响铃显示未知客户"和串号问题。
  // 原生侧只有一个 Service（打进APK的AAR），与 JS 通过
  // SharedPreferences("crm_callscreen") + 应用内广播(.CALL_SCREENED)通讯，
  // 全部用 plus.android 标准API访问，无需 UniModule 插件模块。
  // ============================================================

  // #ifdef APP-PLUS
  private static readonly ROLE_CALL_SCREENING = 'android.app.role.CALL_SCREENING'
  private static readonly SCREEN_SP_NAME = 'crm_callscreen'

  /**
   * 初始化来电筛选：
   * - APK 中无服务类（标准基座/未勾选插件打包）→ 自动回退旧方案（CallLog轮询）
   * - 已持有"来电显示与骚扰拦截"角色 → 注册广播接收器 + 补读进程被杀期间的最近来电
   * - 未持有角色 → 引导开启（每24小时最多提示一次，设置页可随时手动开启）
   */
  private initCallScreening() {
    this.callScreeningAvailable = this.isCallScreeningServiceInApk()
    if (!this.callScreeningAvailable) {
      console.log('[IncomingCallService] 来电筛选服务未打进APK（标准基座或未集成插件），使用CallLog旧方案')
      return
    }
    this.callScreeningSupported = this.getSdkInt() >= 29
    if (!this.callScreeningSupported) {
      console.log('[IncomingCallService] 系统版本低于Android 10，来电筛选不可用')
      return
    }
    this.callScreeningRoleHeld = this.isCallScreeningRoleHeld()
    console.log('[IncomingCallService] 来电筛选状态: available=true, roleHeld=' + this.callScreeningRoleHeld + ', sdk=' + this.getSdkInt())
    if (this.callScreeningRoleHeld) {
      this.registerCallScreenedReceiver()
      this.recoverScreenedNumberFromCache()
    } else {
      this.maybeGuideCallScreeningRole()
    }
  }

  /** 检查来电筛选服务类是否已编译进APK */
  private isCallScreeningServiceInApk(): boolean {
    try {
      const cls = plus.android.importClass('com.xianhu.crm.callscreen.CRMCallScreeningService')
      return !!cls
    } catch (_e) {
      return false
    }
  }

  private getSdkInt(): number {
    try {
      const Build = plus.android.importClass('android.os.Build') as any
      return Number(Build.VERSION.SDK_INT || 0)
    } catch (_e) {
      return 0
    }
  }

  /** 是否已持有"来电显示与骚扰拦截"角色 */
  private isCallScreeningRoleHeld(): boolean {
    try {
      if (this.getSdkInt() < 29) return false
      const main = plus.android.runtimeMainActivity()
      const roleManager = plus.android.invoke(main, 'getSystemService', 'role')
      if (!roleManager) return false
      const available = plus.android.invoke(roleManager, 'isRoleAvailable', IncomingCallService.ROLE_CALL_SCREENING)
      if (!available) return false
      return !!plus.android.invoke(roleManager, 'isRoleHeld', IncomingCallService.ROLE_CALL_SCREENING)
    } catch (e) {
      console.warn('[IncomingCallService] 角色状态检查失败:', e)
      return false
    }
  }

  /**
   * 注册来电筛选广播接收器（原生Service在响铃前 sendBroadcast 推送号码）
   */
  private registerCallScreenedReceiver() {
    try {
      if (this.callScreenedReceiver) return
      const main = plus.android.runtimeMainActivity()
      const pkgName = '' + plus.android.invoke(main, 'getPackageName')
      const IntentFilter = plus.android.importClass('android.content.IntentFilter') as any
      const filter = new IntentFilter(pkgName + '.CALL_SCREENED')
      const self = this

      this.callScreenedReceiver = plus.android.implements('android.content.BroadcastReceiver', {
        onReceive: function(_context: any, intent: any) {
          try {
            const num = String(plus.android.invoke(intent, 'getStringExtra', 'phoneNumber') || '').trim()
            const tsStr = String(plus.android.invoke(intent, 'getStringExtra', 'timestamp') || '0')
            const ts = Number(tsStr) || Date.now()
            console.log('[IncomingCallService] ✅ 收到来电筛选广播')
            if (num && num.length >= 3) {
              self.handleScreenedNumber(num, ts)
            }
          } catch (e) {
            console.warn('[IncomingCallService] 来电筛选广播处理异常:', e)
          }
        }
      })

      // 应用内广播：API 33+ 用 RECEIVER_NOT_EXPORTED(4)，低版本用2参数注册
      let registered = false
      if (this.getSdkInt() >= 33) {
        try {
          ;(main as any).registerReceiver(this.callScreenedReceiver, filter, 4)
          registered = true
        } catch (_e) { /* 降级 */ }
      }
      if (!registered) {
        ;(main as any).registerReceiver(this.callScreenedReceiver, filter)
      }
      console.log('[IncomingCallService] ✅ 来电筛选广播接收器已注册（响铃前实时取号已启用）')
    } catch (e) {
      console.warn('[IncomingCallService] 来电筛选广播注册失败（仍可通过缓存轮询取号）:', e)
      this.callScreenedReceiver = null
    }
  }

  /** 注销来电筛选广播接收器 */
  private unregisterCallScreenedReceiver() {
    try {
      if (!this.callScreenedReceiver) return
      const main = plus.android.runtimeMainActivity()
      ;(main as any).unregisterReceiver(this.callScreenedReceiver)
    } catch (_e) { /* ignore */ }
    this.callScreenedReceiver = null
  }

  /**
   * 同步读取原生Service写入的最近来电缓存（SharedPreferences）
   * @returns { num, ts } 无数据时 num 为空串
   */
  private readScreenedPrefs(): { num: string; ts: number } {
    try {
      const invoke = plus.android.invoke as any
      const main = plus.android.runtimeMainActivity()
      const sp = invoke(main, 'getSharedPreferences', IncomingCallService.SCREEN_SP_NAME, 0)
      if (!sp) return { num: '', ts: 0 }
      const num = String(invoke(sp, 'getString', 'last_incoming_number', '') || '').trim()
      // 时间戳以字符串读取，避免 JS 桥接 long 的精度问题
      const tsStr = String(invoke(sp, 'getString', 'last_incoming_time_str', '0') || '0')
      return { num, ts: Number(tsStr) || 0 }
    } catch (e) {
      return { num: '', ts: 0 }
    }
  }

  /**
   * 处理来电筛选服务推送的号码（系统响铃前回调，必然是当前通，无串号风险）
   */
  private handleScreenedNumber(phoneNumber: string, timestamp: number) {
    // 过期保护：超过90秒的值不用于触发新来电流程
    if (timestamp > 0 && Date.now() - timestamp > 90 * 1000) {
      console.log('[IncomingCallService] 来电筛选号码已过期，忽略:', phoneNumber)
      return
    }
    console.log('[IncomingCallService] ✅ 来电筛选获取到号码（响铃前）:', phoneNumber)

    if (!this.currentIncoming) {
      // 还没有来电会话（筛选服务先于 PhoneStateListener 到达）：直接启动来电流程
      this.onRingingDetected(phoneNumber)
      return
    }
    // 已有会话但号码未知（PhoneStateListener 先到但没带号码）：补号码并重新上报
    if (!this.currentIncoming.callerNumber || this.currentIncoming.callerNumber === '未知来电') {
      this.currentIncoming.callerNumber = phoneNumber
      uni.$emit('incoming:number_updated', { callerNumber: phoneNumber })
      this.hasReportedIncoming = false
      this.currentIncoming.callId = undefined
      this.reportIncomingToServer(phoneNumber)
    }
  }

  /**
   * 进程被杀期间来了电话：JS重启后从原生 SharedPreferences 补读最近来电，
   * 若在60秒内且尚无会话，则拉起来电流程
   */
  private recoverScreenedNumberFromCache() {
    const { num, ts } = this.readScreenedPrefs()
    if (!num || !ts) return
    const ageMs = Date.now() - ts
    if (ageMs < 0 || ageMs > 60 * 1000) return
    if (this.currentIncoming) return
    console.log('[IncomingCallService] 从来电筛选缓存恢复最近来电:', num, '(', Math.round(ageMs / 1000), '秒前)')
    this.handleScreenedNumber(num, ts)
  }

  /**
   * 从来电筛选缓存读取当前通的号码（轮询/事后补号兜底用）
   * @param sessionStart 本通开始时间，只接受该时间之后写入的缓存（允许5秒时钟误差）
   * @param untilTime 可选的结束时间上限（事后补号场景，避免取到之后新来电的号码）
   */
  private getScreenedNumberForSession(sessionStart: number, untilTime?: number): Promise<string> {
    return new Promise((resolve) => {
      if (!this.callScreeningAvailable || !this.callScreeningRoleHeld) {
        resolve('')
        return
      }
      const { num, ts } = this.readScreenedPrefs()
      const inWindow = num && ts >= sessionStart - 5000 && (!untilTime || ts <= untilTime + 5000)
      resolve(inWindow ? num : '')
    })
  }

  /**
   * 引导用户开启"来电显示与骚扰拦截"角色（每24小时最多一次）
   */
  private maybeGuideCallScreeningRole() {
    try {
      const lastShown = Number(uni.getStorageSync('callScreeningGuideShownAt') || 0)
      if (Date.now() - lastShown < 24 * 60 * 60 * 1000) return
      uni.setStorageSync('callScreeningGuideShownAt', Date.now())
      uni.showModal({
        title: '开启来电识别',
        content: '开启后，客户来电响铃时即可实时识别号码并弹出客户信息（无需读取通话记录）。是否立即开启？',
        confirmText: '立即开启',
        cancelText: '暂不',
        success: (res) => {
          if (res.confirm) {
            this.requestCallScreeningRole()
          }
        },
      })
    } catch (e) {
      console.warn('[IncomingCallService] 来电识别引导弹窗失败:', e)
    }
  }
  // #endif

  /**
   * 获取来电筛选（来电识别）状态，供设置页显示
   */
  getCallScreeningStatus(): Promise<{ available: boolean; supported: boolean; roleHeld: boolean }> {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS
      this.callScreeningAvailable = this.isCallScreeningServiceInApk()
      this.callScreeningSupported = this.getSdkInt() >= 29
      this.callScreeningRoleHeld = this.callScreeningAvailable && this.callScreeningSupported && this.isCallScreeningRoleHeld()
      resolve({
        available: this.callScreeningAvailable,
        supported: this.callScreeningSupported,
        roleHeld: this.callScreeningRoleHeld,
      })
      // #endif
      // #ifndef APP-PLUS
      resolve({ available: false, supported: false, roleHeld: false })
      // #endif
    })
  }

  /**
   * 请求"来电显示与骚扰拦截"角色（拉起系统授权弹窗），供设置页调用。
   * 系统弹窗结果无法直接回调，通过轮询角色状态判定（用户操作完回到APP即生效）。
   */
  requestCallScreeningRole(): Promise<boolean> {
    return new Promise((resolve) => {
      // #ifdef APP-PLUS
      if (!this.isCallScreeningServiceInApk()) {
        uni.showToast({ title: '当前版本未集成来电识别功能', icon: 'none' })
        resolve(false)
        return
      }
      if (this.getSdkInt() < 29) {
        uni.showToast({ title: '当前系统版本不支持（需Android 10+）', icon: 'none' })
        resolve(false)
        return
      }
      if (this.isCallScreeningRoleHeld()) {
        this.callScreeningRoleHeld = true
        this.registerCallScreenedReceiver()
        uni.showToast({ title: '来电识别已开启', icon: 'success' })
        resolve(true)
        return
      }
      try {
        const main = plus.android.runtimeMainActivity()
        const roleManager = plus.android.invoke(main, 'getSystemService', 'role')
        if (!roleManager || !plus.android.invoke(roleManager, 'isRoleAvailable', IncomingCallService.ROLE_CALL_SCREENING)) {
          uni.showToast({ title: '当前系统不支持来电识别角色', icon: 'none' })
          resolve(false)
          return
        }
        const intent = plus.android.invoke(roleManager, 'createRequestRoleIntent', IncomingCallService.ROLE_CALL_SCREENING)
        ;(plus.android.invoke as any)(main, 'startActivityForResult', intent, 0xC511)
      } catch (e) {
        console.warn('[IncomingCallService] 拉起来电识别授权弹窗失败:', e)
        uni.showToast({ title: '打开授权弹窗失败', icon: 'none' })
        resolve(false)
        return
      }

      // 轮询角色状态（系统弹窗关闭后生效），最多等30秒
      let checks = 0
      const timer = setInterval(() => {
        checks++
        const held = this.isCallScreeningRoleHeld()
        if (held) {
          clearInterval(timer)
          this.callScreeningRoleHeld = true
          this.registerCallScreenedReceiver()
          uni.showToast({ title: '来电识别已开启', icon: 'success' })
          resolve(true)
        } else if (checks >= 20) {
          clearInterval(timer)
          resolve(false)
        }
      }, 1500)
      // #endif
      // #ifndef APP-PLUS
      resolve(false)
      // #endif
    })
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
   * 引导链：品牌权限管理页（小米/华为/荣耀/OPPO/vivo/魅族等直达本APP权限列表）
   *        → 应用详情页 → 按机型给出手动路径文案
   */
  openAppPermissionSettings() {
    // #ifdef APP-PLUS
    try {
      if (openBrandPermissionManager()) return
      // 全部跳转失败：按品牌+机型给出通话记录权限的手动开启路径
      uni.showModal({
        title: '手动开启权限',
        content: getManualPermissionGuide('calllog'),
        showCancel: false,
        confirmText: '我知道了'
      })
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
   *
   * 🔒 防串号：多数 ROM 在通话结束时才写入 CallLog，此回调经常在 IDLE 后触发。
   * 此时解析到的号码属于"刚结束的那通"，绝不能再以"来电响铃"身份上报后端——
   * 否则若下一通电话已开始响铃，后端会把上一通的号码写进新来电的记录和弹窗（串号）。
   * 结束后的补号统一走 onIncomingCallEnded / backgroundResolveNumber 的 CALL_ENDED 通道。
   */
  private handleCallLogChange() {
    if (!this.currentIncoming) return

    const currentNumber = this.currentIncoming.callerNumber
    if (currentNumber && currentNumber !== '未知来电') return

    const session = this.currentIncoming
    // 先试来电筛选缓存，再试 CallLog，最后录音文件名
    this.getScreenedNumberForSession(session.startTime).then(async (fromScreening) => {
      let resolved = fromScreening
      if (!resolved) {
        resolved = await this.tryResolveCallerFromCallLog()
      }
      // 🔒 响铃期间禁用录音文件解析（本通尚无录音，匹配到的必是上一通的文件）
      if (!resolved && this.lastPhoneState !== 1) {
        resolved = await this.tryResolveCallerFromRecordingFile()
      }
      // 会话必须未被新来电顶替，且号码仍未知
      if (!resolved || this.currentIncoming !== session) return
      if (session.callerNumber && session.callerNumber !== '未知来电') return

      console.log('[IncomingCallService] 获取到来电号码:', resolved, ', state=' + this.lastPhoneState)
      session.callerNumber = resolved
      uni.$emit('incoming:number_updated', { callerNumber: resolved })

      if (this.lastPhoneState === 1) {
        // 仍在响铃：以来电身份重新上报，更新CRM弹窗号码
        this.hasReportedIncoming = false
        session.callId = undefined
        this.reportIncomingToServer(resolved)
      } else if (this.lastPhoneState === 2) {
        // 已接听：仅同步号码到通话状态，不再推"响铃"事件
        try {
          wsService.reportCallStatus(session.callId || '', 'connected', {
            callType: 'inbound',
            phoneNumber: resolved,
          })
        } catch (_e) { /* ignore */ }
      }
      // IDLE(0)：通话已结束，号码交由结束流程上报（CALL_ENDED / number_updated），此处不动
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
      const session = this.currentIncoming
      this.tryResolveNumber(attempts).then((num) => {
        // 🔒 防串号：异步解析期间可能已换成新来电会话，必须校验是同一通
        if (!num || !this.currentIncoming || this.currentIncoming !== session) return
        if (this.currentIncoming.callerNumber !== '未知来电') return

        console.log('[IncomingCallService] 轮询第' + attempts + '次获取到号码:', num, ', state=' + this.lastPhoneState)
        this.currentIncoming.callerNumber = num
        uni.$emit('incoming:number_updated', { callerNumber: num })

        if (this.lastPhoneState === 1) {
          // 仍在响铃：以来电身份上报，实时更新CRM弹窗
          this.hasReportedIncoming = false
          this.currentIncoming.callId = undefined
          this.reportIncomingToServer(num)
        }
        // 已接听/已结束：号码由接听状态上报或结束流程带出，不再推"响铃"事件，
        // 避免通话结束后才解析到号码时向CRM拉起一个幽灵来电弹窗（下一通会看到上一通号码）
        this.stopCallLogPolling()
      })
    }, 300)
  }

  /**
   * 综合尝试获取来电号码：先来电筛选缓存，再 CallLog，最后录音文件名
   */
  private async tryResolveNumber(attempt: number): Promise<string> {
    // 0. 来电筛选服务缓存（响铃前系统回调写入，最可靠且必然是当前通）
    const sessionStart = this.currentIncoming?.startTime || Date.now()
    const fromScreening = await this.getScreenedNumberForSession(sessionStart)
    if (fromScreening) return fromScreening

    // 1. 再试 CallLog
    const fromCallLog = await this.tryResolveCallerFromCallLog()
    if (fromCallLog) return fromCallLog

    // 2. 每 3 次尝试一次录音文件名
    // 🔒 防串号：录音只在接听后才产生，响铃期间能匹配到的文件必然是上一通的
    // （ROM延迟落盘会把旧文件顶进时间窗口），所以响铃(RINGING=1)期间禁用录音文件解析
    if (this.lastPhoneState !== 1 && attempt % 3 === 0) {
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

    // 会话句柄：补号循环耗时较长（最长约27秒），期间可能有新来电顶替
    // currentIncoming。所有界面更新/状态重置都必须确认还是本通会话，防止串号
    const session = this.currentIncoming
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
          // 🔒 防串号：期间有新来电开始则立即停止补号（新来电的号码解析由它自己负责）
          if (this.currentIncoming !== session) {
            console.log('[IncomingCallService] 补号期间检测到新来电，停止上一通的补号')
            break
          }
          // 0. 先试来电筛选缓存（限定本通时间窗口，必然可靠）
          let resolvedNum = await this.getScreenedNumberForSession(info.startTime, endTime)
          // 1. 再试 CallLog（可能在某些设备上终于可用），限定本通时间窗口[start, end]避免取到其他通话
          if (!resolvedNum) {
            resolvedNum = await this.tryResolveCallerFromCallLog(info.startTime, endTime)
          }
          // 2. CallLog 失败，试录音文件名（同样限定本通时间窗口）
          if (!resolvedNum) {
            resolvedNum = await this.tryResolveCallerFromRecordingFile(info.startTime, endTime)
          }
          // 异步查询期间也可能来了新电话，再次确认
          if (resolvedNum && this.currentIncoming !== session) {
            console.log('[IncomingCallService] 补号完成但已有新来电，结果仅用于本通记录，不更新界面')
            finalNumber = resolvedNum
            info.callerNumber = resolvedNum
            break
          }
          if (resolvedNum && resolvedNum !== '未知来电') {
            console.log('[IncomingCallService] ✅ 通话结束后补获号码(第' + (attempt + 1) + '次):', resolvedNum)
            finalNumber = resolvedNum
            info.callerNumber = resolvedNum
            // 通知前端页面更新号码
            uni.$emit('incoming:number_updated', { callerNumber: resolvedNum })
            // 响铃期间没拿到号码、结束后CallLog才拿到 → 典型的ROM实时号码拦截场景，
            // 引导用户把通话记录权限设为"始终允许"以实现响铃时实时显示号码（24小时内最多提示一次）
            this.maybeShowCallLogBlockedGuide()
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

    // 重置状态（🔒 补号循环期间若已有新来电顶替 currentIncoming，绝不能清掉新来电的状态）
    const replacedByNewCall = this.currentIncoming !== session
    if (!replacedByNewCall) {
      this.currentIncoming = null
      this.hasReportedIncoming = false
      this.lastPhoneState = 0
    }

    // 如果号码仍为"未知来电"，在后台继续尝试补获（录音文件写入可能延迟较大）
    // #ifdef APP-PLUS
    if (!finalNumber || finalNumber === '未知来电') {
      this.backgroundResolveNumber(callId, info, duration, endTime)
    }
    // #endif

    // 跳转登记页
    setTimeout(() => {
      uni.navigateTo({
        url: `/pages/call-ended/index?callId=${callId}&name=${encodeURIComponent(info.customerName || info.callerNumber)}&customerId=${info.customerId || ''}&duration=${duration}&hasRecording=false&callType=inbound`,
      })
    }, 300)

    // 异步处理录音（传入统一的 callId：info.callId 缺失时用本地兜底ID，
    // 与上面 reportCallEnd 上报的记录一致，录音仍可关联）
    this.processRecordingAsync(info, duration, endTime, callId)
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
        // 传入本通的[开始,结束]时间窗口，避免匹配到旧录音/之后新来电的记录
        let resolved = await this.tryResolveCallerFromRecordingFile(info.startTime, endTime)
        if (!resolved) {
          resolved = await this.tryResolveCallerFromCallLog(info.startTime, endTime)
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
    endTime: number,
    fallbackCallId?: string
  ) {
    const callId = info.callId || fallbackCallId
    if (!callId) {
      console.log('[IncomingCallService] 无可用 callId，跳过录音')
      return
    }

    const settings = this.getCallSettings()
    if (!settings.autoUploadRecording) {
      console.log('[IncomingCallService] 自动上传已关闭，跳过录音')
      return
    }

    // duration=0 不再直接跳过：部分ROM（荣耀等）拦截 OFFHOOK 状态导致测不到接通，
    // 实际已通话并产生了录音。此时按"响铃开始→结束"整个窗口去找录音文件，
    // 找到了就说明确实接通过，照常上传并把记录纠正为已接通
    const effectiveDuration = duration > 0
      ? duration
      : Math.max(0, Math.floor((endTime - info.startTime) / 1000))
    if (duration <= 0) {
      console.log('[IncomingCallService] 未检测到接通(duration=0)，仍尝试按时间窗口查找录音，窗口时长:', effectiveDuration, '秒')
    }

    console.log('[IncomingCallService] 开始异步处理录音... callId=' + callId)

    try {
      const result = await recordingService.processCallRecording({
        callId,
        phoneNumber: info.callerNumber,
        startTime: info.startTime,
        endTime,
        duration: effectiveDuration,
      })

      if (result.found && result.uploaded) {
        console.log('[IncomingCallService] 录音上传成功:', result.recordingPath)
        wsService.reportCallEnd(callId, {
          status: 'connected',
          callType: 'inbound',
          duration: effectiveDuration,
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
   * Android 前台保活：WakeLock（周期续期）+ 常驻通知，确保后台仍能检测来电
   */
  // #ifdef APP-PLUS
  private startForegroundKeepAlive() {
    if (this.foregroundActive) {
      // 已激活时仅续期 WakeLock（onHide 等场景会重复调用）
      this.renewWakeLock()
      return
    }

    try {
      this.renewWakeLock()

      // 每8分钟续期一次（每次申请10分钟租约），避免10分钟后WakeLock过期导致后台被挂起
      if (!this.wakeLockRenewTimer) {
        this.wakeLockRenewTimer = setInterval(() => {
          this.renewWakeLock()
        }, 8 * 60 * 1000)
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

  /** 获取/续期 PARTIAL_WAKE_LOCK（10分钟租约） */
  private renewWakeLock() {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const PowerManager = plus.android.importClass('android.os.PowerManager') as any

      const pm = (main as any).getSystemService(Context.POWER_SERVICE)
      if (!pm) return

      if (!this.wakeLock) {
        this.wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, 'CRM:IncomingCallListener')
        this.wakeLock.setReferenceCounted(false)
      }
      // acquire(timeout) 对已持有的锁会重置租约时间
      this.wakeLock.acquire(10 * 60 * 1000)
      console.log('[IncomingCallService] WakeLock 已获取/续期')
    } catch (e) {
      console.warn('[IncomingCallService] WakeLock 续期失败:', e)
    }
  }

  /**
   * 供外部调用的后台保活入口（App onHide 时触发）：
   * 续期 WakeLock、保持常驻通知，尽量让来电监听和 WebSocket 在后台存活
   */
  requestBackgroundKeepAlive() {
    const userStore = useUserStore()
    if (!userStore.isLoggedIn) return
    this.startForegroundKeepAlive()
  }

  /**
   * 引导用户将APP加入电池优化白名单（Android 6+）。
   * 不加白名单时，系统 Doze 模式会冻结网络与JS定时器，导致后台来电无法上报。
   * 仅在未加入白名单且未提示过时弹出系统授权框。
   */
  private requestIgnoreBatteryOptimizations() {
    try {
      const alreadyAsked = uni.getStorageSync('batteryOptimizationAsked')
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const PowerManager = plus.android.importClass('android.os.PowerManager') as any

      const pm = (main as any).getSystemService(Context.POWER_SERVICE)
      const pkgName = (main as any).getPackageName()

      if (pm && pm.isIgnoringBatteryOptimizations && pm.isIgnoringBatteryOptimizations(pkgName)) {
        console.log('[IncomingCallService] 已在电池优化白名单中')
        return
      }
      if (alreadyAsked) {
        console.log('[IncomingCallService] 未加入电池白名单（用户已被提示过，不再打扰）')
        return
      }

      uni.setStorageSync('batteryOptimizationAsked', '1')
      uni.showModal({
        title: '后台运行授权',
        content: '为保证锁屏/后台时仍能检测来电并同步到CRM，请允许本应用忽略电池优化（不受省电限制）',
        confirmText: '去开启',
        cancelText: '暂不',
        success: (res) => {
          if (!res.confirm) return
          try {
            const Intent = plus.android.importClass('android.content.Intent') as any
            const Settings = plus.android.importClass('android.provider.Settings') as any
            const Uri = plus.android.importClass('android.net.Uri') as any
            const intent = new Intent(
              Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              Uri.parse(`package:${pkgName}`)
            )
            ;(main as any).startActivity(intent)
          } catch (e) {
            console.warn('[IncomingCallService] 打开电池优化设置失败:', e)
            uni.showToast({ title: '请到系统设置-电池中手动允许后台运行', icon: 'none', duration: 3000 })
          }
        },
      })
    } catch (e) {
      console.warn('[IncomingCallService] 电池优化白名单检查失败:', e)
    }
  }

  /**
   * 查询是否已加入电池优化白名单（后台保活），供首页权限卡显示
   * （本方法在外层 APP-PLUS 条件块内，仅 APP 端存在）
   */
  isBatteryOptimizationIgnored(): boolean {
    try {
      const main = plus.android.runtimeMainActivity()
      const Context = plus.android.importClass('android.content.Context') as any
      const pm = (main as any).getSystemService(Context.POWER_SERVICE)
      const pkgName = (main as any).getPackageName()
      if (pm && pm.isIgnoringBatteryOptimizations) {
        return !!pm.isIgnoringBatteryOptimizations(pkgName)
      }
    } catch (e) {
      console.warn('[IncomingCallService] 电池白名单状态查询失败:', e)
    }
    return false
  }

  /**
   * 直接拉起"忽略电池优化"系统授权弹窗（供首页权限卡点击授权）
   */
  requestBatteryOptimizationExemption() {
    try {
      const main = plus.android.runtimeMainActivity()
      const pkgName = (main as any).getPackageName()
      const Intent = plus.android.importClass('android.content.Intent') as any
      const Settings = plus.android.importClass('android.provider.Settings') as any
      const Uri = plus.android.importClass('android.net.Uri') as any
      const intent = new Intent(
        Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
        Uri.parse(`package:${pkgName}`)
      )
      ;(main as any).startActivity(intent)
    } catch (e) {
      console.warn('[IncomingCallService] 打开电池优化授权失败:', e)
      try {
        // 兜底：跳系统电池优化列表页
        const main = plus.android.runtimeMainActivity()
        const Intent = plus.android.importClass('android.content.Intent') as any
        const intent = new Intent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS')
        ;(main as any).startActivity(intent)
      } catch (_e) {
        uni.showToast({ title: '请到系统设置-电池中允许本应用后台运行', icon: 'none', duration: 3000 })
      }
    }
  }

  private stopForegroundKeepAlive() {
    try {
      if (this.wakeLockRenewTimer) {
        clearInterval(this.wakeLockRenewTimer)
        this.wakeLockRenewTimer = null
      }
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
  private async tryResolveCallerFromCallLog(sinceTime?: number, untilTime?: number): Promise<string> {
    // 默认用当前来电的开始时间做时间窗口，防止取到上一通电话的号码；
    // untilTime（通话结束时间）用于事后补号，防止取到之后新来电的号码
    const since = sinceTime || this.currentIncoming?.startTime
    const until = untilTime
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
              const result = this.extractNumberFromCursor(cursor, since, until)
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
              const result = this.extractNumberFromCursor(cursor, since, until)
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
              const result = this.extractNumberFromCursor(cursor, since, until)
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
                const result = this.extractNumberFromCursor(cursor, since, until)
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
                  const result = this.extractNumberFromCursor(cursor, since, until)
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
              const result = this.extractNumberFromCursor(cursor, since, until)
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
                const result = this.extractNumberFromCursor(cursor, since, until)
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
   * @param untilTime 本次来电结束时间戳。事后补号时提供，只接受该时间之前（含10秒缓冲）
   *                  的记录，严禁把之后新来电的号码当成本次来电（反向串号）
   */
  private extractNumberFromCursor(cursor: any, sinceTime?: number, untilTime?: number): string {
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
        // - 有本次来电结束时间：记录还必须早于 (结束时间 + 10秒)，防止取到之后新来电的号码
        // - 无开始时间（兼容旧调用）：退回"最近120秒"宽松判断
        let timeOk: boolean
        if (sinceTime) {
          timeOk = date > 0 && date >= (sinceTime - 5000)
          if (timeOk && untilTime) {
            timeOk = date <= (untilTime + 10000)
          }
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
   * 华为/荣耀等设备的录音文件名格式：134 2882 7364_20260625142304.amr
   * 即使没有 READ_CALL_LOG 权限，录音文件名也包含号码
   *
   * 🔒 防串号（重要）：
   * 1. 录音只在"接听后"才会产生，响铃期间绝无本通录音——响铃态禁止调用本方法
   *    （调用方负责，见 tryResolveNumber / handleCallLogChange）
   * 2. 文件 lastModified 不可靠（ROM 可能延迟落盘/媒体扫描触发更新，把上一通的文件
   *    "顶"进本通时间窗口），因此优先校验文件名里的 14 位时间戳（录音开始时间），
   *    时间戳不在本通 [开始, 结束] 窗口内的文件一律跳过
   */
  private async tryResolveCallerFromRecordingFile(callStartTime?: number, callEndTime?: number): Promise<string> {
    try {
      const recordings = await recordingService.scanRecordingFolders()
      if (recordings.length === 0) return ''

      const startTime = callStartTime || this.currentIncoming?.startTime
      if (!startTime) {
        console.log('[IncomingCallService] 无法确定来电开始时间，跳过录音文件匹配')
        return ''
      }
      const windowStart = startTime - 5000
      const windowEnd = (callEndTime || Date.now()) + 30000

      const recentFiles = recordings
        .filter(f => f.lastModified >= windowStart && f.lastModified <= windowEnd)
        .sort((a, b) => b.lastModified - a.lastModified)
        .slice(0, 5)

      if (recentFiles.length === 0) {
        console.log('[IncomingCallService] 无当前通话时段的录音文件(callStart=' + new Date(startTime).toLocaleTimeString() + ')')
        return ''
      }

      for (const file of recentFiles) {
        const nameWithoutExt = file.name.replace(/\.\w+$/, '')

        // 文件名时间戳校验（华为/荣耀格式：号码_yyyyMMddHHmmss）
        // 有时间戳且不在本通窗口内 → 一定是别的通话的录音，跳过
        const tsMatch = nameWithoutExt.match(/(\d{14})/)
        if (tsMatch) {
          const ts = tsMatch[1]
          const fileTime = new Date(
            Number(ts.slice(0, 4)), Number(ts.slice(4, 6)) - 1, Number(ts.slice(6, 8)),
            Number(ts.slice(8, 10)), Number(ts.slice(10, 12)), Number(ts.slice(12, 14))
          ).getTime()
          if (!isNaN(fileTime) && (fileTime < windowStart || fileTime > windowEnd)) {
            console.log('[IncomingCallService] 录音文件时间戳不在本通窗口内，跳过:', file.name)
            continue
          }
        }

        console.log('[IncomingCallService] 尝试从录音文件名提取号码:', file.name, '修改时间:', new Date(file.lastModified).toLocaleTimeString())

        // 提取号码部分（下划线前面的部分）
        const parts = nameWithoutExt.split('_')
        if (parts.length >= 2) {
          const numberPart = parts[0].replace(/[\s\-()]/g, '')
          // 手机号（11位数字，1开头）
          if (/^1\d{10}$/.test(numberPart)) {
            console.log('[IncomingCallService] ✅ 从录音文件名提取到号码:', numberPart)
            return numberPart
          }
          // 固话号码（7-12位数字）
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
