/**
 * 通话录音服务
 *
 * 功能：
 * 1. 扫描系统通话录音文件夹
 * 2. 匹配通话时间找到对应录音
 * 3. 上传录音文件到服务器
 *
 * 支持的录音文件夹路径（不同手机品牌）：
 * - 小米: /storage/emulated/0/MIUI/sound_recorder/call_rec/
 * - 华为: /storage/emulated/0/Sounds/CallRecord/
 * - OPPO: /storage/emulated/0/Recordings/Call/
 * - VIVO: /storage/emulated/0/Record/Call/
 * - 三星: /storage/emulated/0/Call/
 * - 通用: /storage/emulated/0/Recordings/
 */

import { uploadRecording, uploadRecordingBase64 } from '@/api/call'
import { openBrandPermissionManager, openAppDetailsSettings, getManualPermissionGuide } from '@/utils/permissionGuide'

/**
 * 通话录音路径分为两级：
 * - CALL_SPECIFIC_PATHS: 通话录音专属路径（这些目录只有开启了通话录音才会被系统创建）
 * - GENERIC_SCAN_PATHS: 通用/宽泛路径（这些目录可能默认存在，需要检查里面是否有通话录音文件才能判断）
 *
 * 检测逻辑：
 * - 专属路径存在 + 里面有音频文件 → 录音已开启
 * - 通用路径即使存在也不能直接判定，必须找到实际的通话录音文件
 */

// 通话录音专属路径（这些路径只有在开启通话录音后系统才会创建）
const CALL_SPECIFIC_PATHS = [
  // 小米 / 红米 / POCO — 通话录音专属子目录
  '/storage/emulated/0/MIUI/sound_recorder/call_rec/',
  '/sdcard/MIUI/sound_recorder/call_rec/',
  // 华为 / 荣耀 — CallRecord 是通话录音专属
  '/storage/emulated/0/Sounds/CallRecord/',
  '/storage/emulated/0/sounds/callrecord/',
  '/sdcard/Sounds/CallRecord/',
  '/storage/emulated/0/Documents/Sounds/CallRecord/',
  // OPPO / Realme / ColorOS — Call 子目录是通话录音专属
  '/storage/emulated/0/Recordings/Call Recordings/',
  '/storage/emulated/0/Music/Recordings/Call Recordings/',
  // OPPO ColorOS 13/14 中文目录（在拨号应用中开启自动录音后创建）
  '/storage/emulated/0/Recordings/通话录音/',
  '/storage/emulated/0/Music/Recordings/通话录音/',
  '/storage/emulated/0/录音/通话录音/',
  '/storage/emulated/0/Recordings/Call/',
  // VIVO / iQOO — Record/Call 是通话录音专属
  '/storage/emulated/0/Record/Call/',
  '/sdcard/Record/Call/',
  // vivo OriginOS 部分版本
  '/storage/emulated/0/vivo/CallRecord/',
  // 三星 — Call 目录或 Call recordings 子目录
  '/storage/emulated/0/Call/',
  '/storage/emulated/0/Recordings/Call recordings/',
  '/storage/emulated/0/Recordings/Voice Recorder/Call/',
  // 一加
  '/storage/emulated/0/Record/PhoneRecord/',
  // 华为 PhoneRecord
  '/storage/emulated/0/PhoneRecord/',
  // 荣耀 MagicOS 部分机型
  '/storage/emulated/0/Record/CallRecord/',
  '/storage/emulated/0/Recorder/CallRecord/',
  // 魅族 Flyme 中文目录
  '/storage/emulated/0/Recorder/通话录音/',
  // 中兴 / 努比亚
  '/storage/emulated/0/录音机/通话录音/',
  '/storage/emulated/0/ZTE/CallRecord/',
  // 通话录音专用
  '/storage/emulated/0/CallRecordings/',
  '/sdcard/CallRecordings/',
  '/storage/emulated/0/CallRecord/',
  '/storage/emulated/0/call_record/',
  '/storage/emulated/0/talkback/',
  // Google Pixel — Call recordings 子目录
  '/storage/emulated/0/Recordings/Call recordings/',
  // 魅族
  '/storage/emulated/0/Recorder/Call/',
  // Nothing Phone
  '/storage/emulated/0/Recordings/Call Recordings/',
  // 传音系 TECNO/Infinix/itel
  '/storage/emulated/0/Record/Call/',
  '/storage/emulated/0/CallRecorder/',
]

// 通用/宽泛路径 — 这些目录在很多手机上默认存在，不能仅靠目录存在来判断
// 用于扫描录音文件（上传/清理功能），但不能作为"录音已开启"的依据
const GENERIC_SCAN_PATHS = [
  '/storage/emulated/0/Sounds/',
  '/storage/emulated/0/Record/',
  '/storage/emulated/0/record/',
  '/storage/emulated/0/Recordings/',
  '/storage/emulated/0/Recordings/Call/',
  '/storage/emulated/0/Music/Recordings/',
  '/storage/emulated/0/Recording/',
  '/storage/emulated/0/AudioRecorder/',
  '/storage/emulated/0/MIUI/sound_recorder/',
  '/storage/emulated/0/MIUI/Gallery/cloud/recorder/',
  '/storage/emulated/0/ColorOS/Recordings/',
  '/storage/emulated/0/VIVORecorder/',
  '/storage/emulated/0/Documents/Sounds/',
  '/storage/emulated/0/Download/Sounds/',
  '/sdcard/Recordings/',
  '/sdcard/Record/',
]

// 合并所有路径（用于文件扫描/上传/清理）
const RECORDING_PATHS = [...CALL_SPECIFIC_PATHS, ...GENERIC_SCAN_PATHS]

// 录音文件扩展名
const AUDIO_EXTENSIONS = ['.mp3', '.amr', '.wav', '.m4a', '.3gp', '.aac', '.ogg', '.opus', '.flac', '.wma']

interface RecordingFile {
  path: string
  name: string
  size: number
  lastModified: number
}

interface CallInfo {
  callId: string
  phoneNumber: string
  startTime: number // 通话开始时间戳
  endTime: number // 通话结束时间戳
  duration: number // 通话时长（秒）；未检测到接通时调用方可能传响铃窗口时长
  // 是否检测到接通：false=未接/拒接（正常情况下不会有录音，扫不到就结束处理，
  // 不挂"待补传"）。仍会扫描一遍，兼容部分ROM拦截OFFHOOK导致"实际接通但测不到"的情况
  answered?: boolean
}

// 待补传任务：找不到录音/上传失败时持久化，APP 回前台或定时器触发重试
interface PendingRecordingTask {
  callId: string
  phoneNumber: string
  startTime: number
  endTime: number
  duration: number
  answered?: boolean
  attempts: number
  nextRetryAt: number
  createdAt: number
}

const PENDING_TASKS_KEY = 'pendingRecordingTasks'
const UPLOADED_PATHS_KEY = 'uploadedRecordingPaths'
const DIAG_LOG_KEY = 'recordingDiagLog'
// 补传任务最长保留24小时；重试退避间隔（分钟）
const PENDING_TASK_TTL = 24 * 60 * 60 * 1000
const PENDING_RETRY_BACKOFF_MIN = [1, 2, 5, 10, 20, 30, 60, 60, 120, 120, 240, 240]

class RecordingService {
  private isScanning = false
  private lastScanTime = 0
  private knownRecordings: Set<string> = new Set()
  private isRetryingPending = false
  private pendingRetryTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // 恢复"已上传文件"集合（防止APP重启后同一文件重复上传/串到别的通话）
    try {
      const saved = uni.getStorageSync(UPLOADED_PATHS_KEY)
      if (saved) {
        const arr: string[] = JSON.parse(saved)
        arr.forEach(p => this.knownRecordings.add(p))
      }
    } catch (_e) { /* ignore */ }
  }

  /**
   * 录音诊断日志：持久化记录每一步（权限/扫描/匹配/上传），
   * 供设置页"录音诊断"查看，快速定位真机上哪一环失败
   */
  /** 格式化时间为北京时间 MM-DD HH:mm:ss（避免 toLocaleTimeString 输出冗长的 GMT+0800 (CST) 后缀） */
  private formatDiagTime(d: Date = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  private diag(step: string, detail?: string) {
    const line = `[${this.formatDiagTime()}] ${step}${detail ? '：' + detail : ''}`
    console.log('[RecordingService][诊断] ' + line)
    try {
      const raw = uni.getStorageSync(DIAG_LOG_KEY)
      const logs: string[] = raw ? JSON.parse(raw) : []
      logs.push(line)
      // 只保留最近120条
      while (logs.length > 120) logs.shift()
      uni.setStorageSync(DIAG_LOG_KEY, JSON.stringify(logs))
    } catch (_e) { /* ignore */ }
  }

  /** 获取诊断日志（最近 count 条，最新在后） */
  getDiagLogs(count: number = 30): string[] {
    try {
      const raw = uni.getStorageSync(DIAG_LOG_KEY)
      const logs: string[] = raw ? JSON.parse(raw) : []
      return logs.slice(-count)
    } catch (_e) {
      return []
    }
  }

  /** 清空诊断日志（设置页"清空诊断"按钮） */
  clearDiagLogs() {
    try {
      uni.removeStorageSync(DIAG_LOG_KEY)
    } catch (_e) { /* ignore */ }
  }

  /** 持久化已上传文件集合 */
  private persistKnownRecordings() {
    try {
      // 只保留最近200条，避免无限增长
      const arr = Array.from(this.knownRecordings)
      uni.setStorageSync(UPLOADED_PATHS_KEY, JSON.stringify(arr.slice(-200)))
    } catch (_e) { /* ignore */ }
  }

  /**
   * 检查存储权限（适配 Android 11+ Scoped Storage）
   */
  async checkPermissions(): Promise<boolean> {
    // #ifdef APP-PLUS
    return new Promise((resolve) => {
      try {
        // 检查 Android 版本
        const Build = plus.android.importClass('android.os.Build')
        const sdkVersion = (Build as any).VERSION.SDK_INT

        if (sdkVersion >= 33) {
          // Android 13+:
          // 1) READ_MEDIA_AUDIO 保证 MediaStore 查询可用（兜底扫描）
          // 2) 直接用 File API 扫描拨号应用的录音目录（如OPPO /Recordings/通话录音/）
          //    仍需要"所有文件访问"(MANAGE_EXTERNAL_STORAGE)，缺失时必须引导授予，
          //    否则 listFiles 静默返回空 → 表现为"开了自动录音但APP检测不到"
          const Environment = plus.android.importClass('android.os.Environment')
          const hasAllFiles = !!(Environment as any).isExternalStorageManager()

          plus.android.requestPermissions(
            ['android.permission.READ_MEDIA_AUDIO'],
            (result: any) => {
              const mediaGranted = !!(result.granted && result.granted.length >= 1)
              console.log('[RecordingService] Android13+ 权限: READ_MEDIA_AUDIO=' + mediaGranted + ', 所有文件访问=' + hasAllFiles)
              if (hasAllFiles) {
                resolve(true)
                return
              }
              // 没有"所有文件访问"：引导授予（每24小时最多提示一次，避免打扰）
              this.maybeGuideAllFilesAccess()
              // READ_MEDIA_AUDIO 已授予时仍返回 true，MediaStore 兜底扫描可以工作
              resolve(mediaGranted)
            },
            (_error: any) => {
              if (hasAllFiles) {
                resolve(true)
              } else {
                this.maybeGuideAllFilesAccess()
                resolve(false)
              }
            }
          )
        } else if (sdkVersion >= 30) {
          // Android 11~12: 检查 MANAGE_EXTERNAL_STORAGE 权限
          const Environment = plus.android.importClass('android.os.Environment')
          if ((Environment as any).isExternalStorageManager()) {
            resolve(true)
            return
          }
          // 没有"所有文件访问"：不阻塞流程（旧实现依赖弹窗回调，在通话结束的
          // 后台场景下弹窗可能不显示导致 Promise 永久挂起、录音永不处理）。
          // 引导走24小时节流的统一弹窗；同时申请传统读权限，保证 MediaStore 兜底可用
          this.maybeGuideAllFilesAccess()
          plus.android.requestPermissions(
            ['android.permission.READ_EXTERNAL_STORAGE'],
            (result: any) => {
              const readGranted = !!(result.granted && result.granted.length >= 1)
              console.log('[RecordingService] Android11~12 无所有文件访问, READ_EXTERNAL_STORAGE=' + readGranted)
              // 有读权限时 MediaStore 兜底扫描可用，继续处理
              resolve(readGranted)
            },
            (_error: any) => resolve(false)
          )
        } else {
          // Android 10 及以下: 传统存储权限
          // 注意：扫描/上传只需要 READ；部分ROM（尤其 targetSdk>=30 时）会拒绝 WRITE，
          // 不能因 WRITE 未授予而判定无权限（否则扫描被跳过，表现为"有录音但从不上传"）
          plus.android.requestPermissions(
            [
              'android.permission.READ_EXTERNAL_STORAGE',
              'android.permission.WRITE_EXTERNAL_STORAGE',
            ],
            (result: any) => {
              console.log('[RecordingService] 权限请求结果:', result)
              const grantedList: string[] = result.granted || []
              const readGranted = grantedList.some(p => String(p).includes('READ_EXTERNAL_STORAGE'))
              resolve(readGranted || grantedList.length >= 2)
            },
            (error: any) => {
              console.error('[RecordingService] 权限请求失败:', error)
              resolve(false)
            }
          )
        }
      } catch (e) {
        console.error('[RecordingService] 权限检查异常:', e)
        // 降级到旧方案
        plus.android.requestPermissions(
          [
            'android.permission.READ_EXTERNAL_STORAGE',
            'android.permission.WRITE_EXTERNAL_STORAGE',
          ],
          (result: any) => {
            const grantedList: string[] = result.granted || []
            resolve(grantedList.some(p => String(p).includes('READ_EXTERNAL_STORAGE')) || grantedList.length >= 2)
          },
          (_error: any) => {
            resolve(false)
          }
        )
      }
    })
    // #endif

    // #ifndef APP-PLUS
    return false
    // #endif
  }

  /**
   * 引导授予"所有文件访问"权限（Android 11+），每24小时最多提示一次
   * OPPO ColorOS 等系统的通话录音目录必须有此权限才能用 File API 扫描
   */
  private maybeGuideAllFilesAccess() {
    // #ifdef APP-PLUS
    try {
      const lastShown = Number(uni.getStorageSync('allFilesAccessGuideShownAt') || 0)
      if (Date.now() - lastShown < 24 * 60 * 60 * 1000) return
      uni.setStorageSync('allFilesAccessGuideShownAt', Date.now())
      uni.showModal({
        title: '开启录音自动上传',
        content: '检测通话录音需要"所有文件访问"权限（系统录音保存在受保护目录中）。请在接下来的页面中开启本APP的「允许管理所有文件」开关。',
        confirmText: '去开启',
        cancelText: '暂不',
        success: (res) => {
          if (res.confirm) {
            this.openAllFilesAccessSettings()
          }
        }
      })
    } catch (e) {
      console.warn('[RecordingService] 所有文件访问引导失败:', e)
    }
    // #endif
  }

  /**
   * 跳转"所有文件访问"授权页（Android 11+）
   * 引导链：本APP的所有文件访问授权页 → 系统所有文件访问列表页 →
   *        品牌权限管理页 → 应用详情页 → 按机型给出手动路径文案
   */
  private openAllFilesAccessSettings() {
    // #ifdef APP-PLUS
    try {
      const Settings = plus.android.importClass('android.provider.Settings')
      const Intent = plus.android.importClass('android.content.Intent')
      const Uri = plus.android.importClass('android.net.Uri')
      const main = plus.android.runtimeMainActivity()
      const packageName = (main as any).getPackageName()
      try {
        // 1. 直达本APP的"所有文件访问"授权页
        const intent = new (Intent as any)((Settings as any).ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
        intent.setData((Uri as any).parse('package:' + packageName))
        ;(main as any).startActivity(intent)
        return
      } catch (_e) {
        try {
          // 2. 系统级"所有文件访问"应用列表页
          const intent2 = new (Intent as any)((Settings as any).ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
          ;(main as any).startActivity(intent2)
          return
        } catch (_e2) { /* 继续降级 */ }
      }
      // 3/4. 品牌权限管理页（内部失败自动降级到应用详情页）
      if (openBrandPermissionManager()) return
      // 5. 全部跳转失败：按机型给出手动路径
      this.showManualStorageGuide()
    } catch (e) {
      console.error('[RecordingService] 无法打开文件访问权限设置:', e)
      this.showManualStorageGuide()
    }
    // #endif
  }

  /**
   * 按品牌+机型显示存储权限的手动开启路径（跳转全部失败时的最终兜底）
   */
  private showManualStorageGuide() {
    // #ifdef APP-PLUS
    try {
      uni.showModal({
        title: '手动开启存储权限',
        content: getManualPermissionGuide('storage'),
        showCancel: false,
        confirmText: '我知道了'
      })
    } catch (_e) {
      uni.showToast({ title: '请在系统设置中授予"所有文件访问"权限', icon: 'none', duration: 3000 })
    }
    // #endif
  }

  /**
   * 公开的存储权限设置跳转（供设置页"去授权"按钮调用）
   * Android 11+ 跳"所有文件访问"授权链；Android 10- 跳品牌权限管理页
   */
  openStoragePermissionSettings() {
    // #ifdef APP-PLUS
    try {
      const Build = plus.android.importClass('android.os.Build')
      const sdkVersion = (Build as any).VERSION.SDK_INT
      if (sdkVersion >= 30) {
        this.openAllFilesAccessSettings()
      } else if (!openBrandPermissionManager()) {
        openAppDetailsSettings()
      }
    } catch (_e) {
      openAppDetailsSettings()
    }
    // #endif
  }

  /**
   * 获取设备品牌
   */
  getDeviceBrand(): string {
    // #ifdef APP-PLUS
    try {
      const Build = plus.android.importClass('android.os.Build')
      const brand = (Build as any).BRAND || ''
      console.log('[RecordingService] 设备品牌:', brand)
      return brand.toLowerCase()
    } catch (e) {
      console.error('[RecordingService] 获取设备品牌失败:', e)
    }
    // #endif
    return ''
  }

  /**
   * 获取优先扫描的录音路径（根据设备品牌）
   */
  getPriorityPaths(): string[] {
    const brand = this.getDeviceBrand()
    const paths = [...RECORDING_PATHS]

    // 根据品牌调整优先级
    if (brand.includes('xiaomi') || brand.includes('redmi')) {
      const brandPaths = paths.filter((p) => p.includes('MIUI'))
      const otherPaths = paths.filter((p) => !p.includes('MIUI'))
      return [...brandPaths, ...otherPaths]
    } else if (brand.includes('huawei') || brand.includes('honor')) {
      // 华为/荣耀：优先 Sounds、record、Music/Recordings、Documents
      const brandPaths = paths.filter((p) =>
        p.includes('Sounds') || p.includes('record') || p.includes('Record') ||
        p.includes('PhoneRecord') || p.includes('talkback') || p.includes('Documents')
      )
      const otherPaths = paths.filter((p) => !brandPaths.includes(p))
      return [...brandPaths, ...otherPaths]
    } else if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
      const brandPaths = paths.filter((p) => p.includes('Recordings') || p.includes('ColorOS'))
      const otherPaths = paths.filter((p) => !brandPaths.includes(p))
      return [...brandPaths, ...otherPaths]
    } else if (brand.includes('vivo') || brand.includes('iqoo')) {
      const brandPaths = paths.filter((p) => p.includes('Record') || p.includes('VIVO'))
      const otherPaths = paths.filter((p) => !brandPaths.includes(p))
      return [...brandPaths, ...otherPaths]
    } else if (brand.includes('samsung')) {
      const brandPaths = paths.filter((p) => p.includes('Call') || p.includes('Voice Recorder'))
      const otherPaths = paths.filter((p) => !brandPaths.includes(p))
      return [...brandPaths, ...otherPaths]
    }

    return paths
  }

  /**
   * 扫描录音文件夹
   * 同时扫描预定义路径和动态发现的路径
   */
  /**
   * @param mediaStoreSinceTime MediaStore兜底扫描的起始时间（毫秒）。
   *   匹配上传场景用默认（最近7天，控制数据量）；统计/清理场景需传更早时间，
   *   否则7天前的文件会从统计中"消失"、清理也删不到
   */
  async scanRecordingFolders(mediaStoreSinceTime?: number): Promise<RecordingFile[]> {
    // #ifdef APP-PLUS
    const recordings: RecordingFile[] = []
    const scannedPaths = new Set<string>() // 避免重复扫描

    // 合并预定义路径 + 动态发现路径
    const paths = this.getPriorityPaths()
    const dynamicPaths = this.discoverRecordingFolders()
    const allPaths = [...paths, ...dynamicPaths]

    for (const basePath of allPaths) {
      if (scannedPaths.has(basePath)) continue
      scannedPaths.add(basePath)

      try {
        const files = await this.listFiles(basePath)
        for (const file of files) {
          // 检查是否是音频文件
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
          if (AUDIO_EXTENSIONS.includes(ext)) {
            // 避免重复文件（不同路径可能指向同一文件）
            if (!recordings.some(r => r.path === file.path)) {
              recordings.push(file)
            }
          }
        }
      } catch (_e) {
        // 路径不存在或无权限，跳过
      }
    }

    // MediaStore 索引始终合并（不只在 File 扫描为空时）：
    // File API 可能因缺"所有文件访问"权限只扫到部分目录（荣耀/华为的 Sounds/CallRecord、
    // OPPO 的"通话录音"中文目录等受保护目录会静默漏掉），媒体库索引可补齐
    const fromMediaStore = this.scanRecordingsViaMediaStore(mediaStoreSinceTime)
    for (const file of fromMediaStore) {
      if (!recordings.some(r => r.path === file.path)) {
        recordings.push(file)
      }
    }

    console.log('[RecordingService] 扫描到录音文件:', recordings.length, '(扫描了', scannedPaths.size, '个目录)')
    return recordings
    // #endif

    // #ifndef APP-PLUS
    return []
    // #endif
  }

  /**
   * MediaStore 兜底扫描：没有"所有文件访问"权限时（Android 13+ 仅有 READ_MEDIA_AUDIO），
   * File API 读不到受保护目录，改从系统媒体库索引中查询录音类音频文件。
   * 系统的通话录音（含OPPO拨号应用自动录音）会被媒体扫描器收录进 MediaStore。
   * @param sinceTime 只返回该时间之后修改的文件（毫秒），默认最近7天
   */
  private scanRecordingsViaMediaStore(sinceTime?: number): RecordingFile[] {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const MediaStore = plus.android.importClass('android.provider.MediaStore')
      const contentResolver = (main as any).getContentResolver()
      const uri = (MediaStore as any).Audio.Media.EXTERNAL_CONTENT_URI

      const DATA = (MediaStore as any).Audio.Media.DATA
      const sinceSec = Math.floor((sinceTime || (Date.now() - 7 * 24 * 60 * 60 * 1000)) / 1000)

      // 路径含录音相关关键词（record/call/sounds/通话录音），覆盖各品牌录音目录
      // 注：时间戳为纯数字，直接内联进 selection（plus.android 无法可靠构造 String[] 参数数组）
      const selection = `(${(MediaStore as any).Audio.Media.DATE_MODIFIED} > ${sinceSec}) AND (` +
        `LOWER(${DATA}) LIKE '%record%' OR ` +
        `LOWER(${DATA}) LIKE '%/call%' OR ` +
        `LOWER(${DATA}) LIKE '%sounds%' OR ` +
        `${DATA} LIKE '%通话录音%' OR ` +
        `${DATA} LIKE '%录音%')`

      const cursor = contentResolver.query(
        uri, null, selection, null,
        (MediaStore as any).Audio.Media.DATE_MODIFIED + ' DESC'
      )

      const result: RecordingFile[] = []
      if (cursor) {
        const dataIdx = cursor.getColumnIndex(DATA)
        const nameIdx = cursor.getColumnIndex((MediaStore as any).Audio.Media.DISPLAY_NAME)
        const sizeIdx = cursor.getColumnIndex((MediaStore as any).Audio.Media.SIZE)
        const modIdx = cursor.getColumnIndex((MediaStore as any).Audio.Media.DATE_MODIFIED)
        let guard = 0
        while (cursor.moveToNext() && guard < 800) {
          guard++
          const path = dataIdx >= 0 ? cursor.getString(dataIdx) : ''
          if (!path) continue
          const name = (nameIdx >= 0 ? cursor.getString(nameIdx) : '') || path.split('/').pop() || ''
          const dotIdx = name.lastIndexOf('.')
          if (dotIdx < 0) continue
          const ext = name.substring(dotIdx).toLowerCase()
          if (!AUDIO_EXTENSIONS.includes(ext)) continue
          result.push({
            path,
            name,
            size: sizeIdx >= 0 ? Number(cursor.getLong(sizeIdx) || 0) : 0,
            lastModified: modIdx >= 0 ? Number(cursor.getLong(modIdx) || 0) * 1000 : 0,
          })
        }
        cursor.close()
      }
      console.log('[RecordingService] MediaStore兜底扫描到音频文件:', result.length)
      return result
    } catch (e) {
      console.warn('[RecordingService] MediaStore兜底扫描失败:', e)
    }
    // #endif
    return []
  }

  /**
   * 列出目录下的文件
   */
  private listFiles(dirPath: string): Promise<RecordingFile[]> {
    // #ifdef APP-PLUS
    return new Promise((resolve) => {
      try {
        const File = plus.android.importClass('java.io.File')
        const dir = new (File as any)(dirPath)

        if (!dir.exists() || !dir.isDirectory()) {
          resolve([])
          return
        }

        const files = dir.listFiles()
        if (!files) {
          resolve([])
          return
        }

        const result: RecordingFile[] = []
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (file.isFile()) {
            result.push({
              path: file.getAbsolutePath(),
              name: file.getName(),
              size: file.length(),
              lastModified: file.lastModified(),
            })
          }
        }

        resolve(result)
      } catch (e) {
        console.error('[RecordingService] 列出文件失败:', dirPath, e)
        resolve([])
      }
    })
    // #endif

    // #ifndef APP-PLUS
    return Promise.resolve([])
    // #endif
  }

  /**
   * 列出目录中的音频文件（按修改时间降序）
   */
  private async listAudioFiles(dirPath: string): Promise<RecordingFile[]> {
    const allFiles = await this.listFiles(dirPath)
    const audioFiles = allFiles.filter((f: RecordingFile) => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase()
      return AUDIO_EXTENSIONS.includes(ext)
    })
    audioFiles.sort((a: RecordingFile, b: RecordingFile) => b.lastModified - a.lastModified)
    return audioFiles
  }

  /**
   * 从文件名解析录音开始时间（华为/荣耀/小米等格式：..._yyyyMMddHHmmss.xxx）
   * 返回毫秒时间戳，解析失败返回 0
   */
  private parseFileNameTimestamp(fileName: string): number {
    const m = fileName.match(/(20\d{12})/)
    if (!m) return 0
    const ts = m[1]
    const time = new Date(
      Number(ts.slice(0, 4)), Number(ts.slice(4, 6)) - 1, Number(ts.slice(6, 8)),
      Number(ts.slice(8, 10)), Number(ts.slice(10, 12)), Number(ts.slice(12, 14))
    ).getTime()
    return isNaN(time) ? 0 : time
  }

  /** 提取文件名中的手机号（用于防串人：文件名带了别人的号码则一定不是本通录音） */
  private extractMobilesFromFileName(fileName: string): string[] {
    // 去掉空格/横线后再匹配，兼容 "134 2882 7364" / "134-2882-7364" 命名
    const compact = fileName.replace(/[\s\-()]/g, '')
    const matches = compact.match(/1[3-9]\d{9}/g)
    return matches || []
  }

  /**
   * 查找匹配通话的录音文件
   *
   * 匹配规则（防串人是第一优先级）：
   * 1. 文件名中带 14 位时间戳的（华为/荣耀/小米等），时间戳不在本通窗口内 → 一票否决
   * 2. 文件名中带手机号、且与本通号码不一致 → 一票否决（这是别人的通话录音）
   * 3. 文件名号码与本通一致 → 允许更宽的落盘延迟窗口（结束后10分钟内）
   * 4. 文件名无号码信息 → 仅接受修改时间在 [开始-30s, 结束+90s] 的严格窗口
   */
  async findMatchingRecording(callInfo: CallInfo, quiet: boolean = false): Promise<RecordingFile | null> {
    console.log('[RecordingService] 查找匹配录音:', callInfo)

    const recordings = await this.scanRecordingFolders()
    // 额外合并 MediaStore 中本通时间窗口附近的音频
    // （File扫描可能因权限/目录未覆盖而漏掉，比如OPPO的"通话录音"中文目录）
    const fromMediaStore = this.scanRecordingsViaMediaStore(callInfo.startTime - 60 * 1000)
    for (const file of fromMediaStore) {
      if (!recordings.some(r => r.path === file.path)) {
        recordings.push(file)
      }
    }
    if (recordings.length === 0) {
      if (!quiet) this.diag('查找录音', '未扫描到任何录音文件（目录直扫和媒体库索引均为空），可能录音尚未写入磁盘或缺少存储权限')
      return null
    }

    // 时间窗口：
    // - 严格窗口（无号码佐证时）：[开始-30s, 结束+90s]
    // - 宽松窗口（文件名号码与本通一致时）：[开始-60s, 结束+10min]，兼容部分ROM延迟落盘
    const strictStart = callInfo.startTime - 30000
    const strictEnd = callInfo.endTime + 90000
    const looseStart = callInfo.startTime - 60000
    const looseEnd = callInfo.endTime + 10 * 60 * 1000

    const phoneVariants = this.getPhoneVariants(callInfo.phoneNumber)
    const callMobile = (callInfo.phoneNumber || '').replace(/\D/g, '').replace(/^86(?=1[3-9]\d{9}$)/, '')

    let bestMatch: RecordingFile | null = null
    let bestScore = 0
    let inWindowCount = 0

    for (const recording of recordings) {
      // 跳过已上传过的录音（持久化集合，重启不丢）
      if (this.knownRecordings.has(recording.path)) {
        continue
      }

      // 🔒 规则1：文件名带14位时间戳（录音开始时间）且不在本通窗口内 → 一定是别的通话
      const fileTs = this.parseFileNameTimestamp(recording.name)
      if (fileTs > 0 && (fileTs < looseStart || fileTs > callInfo.endTime + 30000)) {
        continue
      }

      // 🔒 规则2：文件名带手机号但与本通号码不一致 → 别人的录音，绝不能串
      const namedMobiles = this.extractMobilesFromFileName(recording.name)
      const nameMatchesPhone = namedMobiles.length > 0 && !!callMobile && namedMobiles.includes(callMobile)
      if (namedMobiles.length > 0 && callMobile && !nameMatchesPhone) {
        continue
      }

      // 时间窗口过滤：号码吻合（或文件名时间戳落在本通窗口）用宽松窗口，其余用严格窗口
      const hasStrongEvidence = nameMatchesPhone || (fileTs > 0 && fileTs >= looseStart && fileTs <= callInfo.endTime + 30000)
      const winStart = hasStrongEvidence ? looseStart : strictStart
      const winEnd = hasStrongEvidence ? looseEnd : strictEnd
      // lastModified 与文件名时间戳任一落在窗口内即可（部分ROM lastModified 是媒体扫描时间）
      const timeOk =
        (recording.lastModified >= winStart && recording.lastModified <= winEnd) ||
        (fileTs > 0 && fileTs >= winStart && fileTs <= winEnd)
      if (!timeOk) {
        continue
      }
      inWindowCount++

      let score = 50
      // 越接近通话结束时间，分数越高
      const refTime = fileTs > 0 ? fileTs : recording.lastModified
      const timeDiff = Math.abs(refTime - callInfo.endTime)
      score += Math.max(0, 30 - timeDiff / 1000)

      // 文件名包含电话号码（最强佐证）
      if (nameMatchesPhone) {
        score += 60
      } else {
        for (const phone of phoneVariants) {
          if (recording.name.includes(phone)) {
            score += 40
            break
          }
        }
      }

      // 文件大小合理（根据通话时长估算，约10KB/秒）
      const expectedSize = callInfo.duration * 10 * 1024
      const sizeDiff = Math.abs(recording.size - expectedSize)
      if (expectedSize > 0 && sizeDiff < expectedSize * 0.5) {
        score += 20
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = recording
      }
    }

    if (bestMatch && bestScore >= 50) {
      console.log('[RecordingService] 找到匹配录音:', bestMatch.name, '分数:', bestScore)
      this.diag('找到本通录音', `文件「${bestMatch.name}」，匹配度${Math.round(bestScore)}分`)
      return bestMatch
    }

    if (!quiet) this.diag('未找到本通录音', `共扫描到${recordings.length}个录音文件，本通通话时间段内候选${inWindowCount}个，均不符合`)
    return null
  }

  /**
   * 获取电话号码的各种格式变体
   */
  private getPhoneVariants(phone: string): string[] {
    // 先保留原始号码（可能包含+86等）；号码未知（"未知来电"/空）时不产生变体，
    // 避免空字符串 includes 恒真导致所有文件都加分
    const raw = (phone || '').trim()
    const cleaned = raw.replace(/\D/g, '')
    if (!cleaned || cleaned.length < 3) return []
    const variants = [cleaned]

    // 去掉国家代码 86
    if (cleaned.startsWith('86') && cleaned.length === 13) {
      variants.push(cleaned.substring(2))
    }

    // 原始号码中可能有 +86 格式，直接匹配文件名
    if (raw.startsWith('+86')) {
      variants.push(raw) // 带+号的原始格式
    }

    // 添加常见格式
    if (cleaned.length === 11) {
      // 138-1234-5678
      variants.push(`${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`)
      // 138 1234 5678
      variants.push(`${cleaned.substring(0, 3)} ${cleaned.substring(3, 7)} ${cleaned.substring(7)}`)
    }

    return variants
  }

  /**
   * 上传录音文件
   */
  async uploadRecordingFile(callId: string, recording: RecordingFile, phoneNumber?: string): Promise<boolean> {
    console.log('[RecordingService] 开始上传录音:', recording.path)

    // 主通道：multipart 文件上传
    try {
      const result = await uploadRecording(callId, recording.path, phoneNumber)
      console.log('[RecordingService] 录音上传成功:', result)
      this.markUploaded(recording, callId)
      this.diag('上传成功', `文件「${recording.name}」已上传到CRM并关联通话记录`)
      return true
    } catch (e: any) {
      console.error('[RecordingService] multipart上传失败:', e)
      this.diag('上传失败·文件通道', `文件「${recording.name}」，原因：${e?.message || e}，即将尝试base64备用通道`)
    }

    // 🔥 兜底通道：base64 JSON 上传（与其他业务API走完全相同的通道）
    // multipart 请求可能被反向代理/网关拦截或改写（响应非JSON即此症状），JSON通道不受影响
    try {
      if (recording.size > 15 * 1024 * 1024) {
        this.diag('备用通道跳过', '文件超过15MB，无法用base64通道上传')
        return false
      }
      const base64 = await this.readFileAsBase64(recording.path)
      if (!base64) {
        this.diag('备用通道失败', '读取录音文件内容失败，无法转base64')
        return false
      }
      const result = await uploadRecordingBase64({
        callId,
        fileName: recording.name,
        base64,
        phoneNumber,
      })
      console.log('[RecordingService] base64兜底上传成功:', result)
      this.markUploaded(recording, callId)
      this.diag('上传成功·备用通道', `文件「${recording.name}」已通过base64备用通道上传成功`)
      return true
    } catch (e2: any) {
      console.error('[RecordingService] base64兜底上传失败:', e2)
      this.diag('上传失败·备用通道', `文件「${recording.name}」，原因：${e2?.message || e2}`)
      return false
    }
  }

  /** 标记录音已上传（持久化，防止重启后重复上传/串到其他通话）并通知列表刷新 */
  private markUploaded(recording: RecordingFile, callId: string) {
    this.knownRecordings.add(recording.path)
    this.persistKnownRecordings()
    uni.$emit('recording:uploaded', callId)
  }

  /**
   * 读取本地文件为 base64（用于JSON通道兜底上传）
   * 依次尝试原始路径与URL编码路径（文件名可能含空格，如荣耀"158 1589 7364_xxx.amr"）
   */
  private readFileAsBase64(filePath: string): Promise<string | null> {
    // #ifdef APP-PLUS
    const tryRead = (url: string): Promise<string | null> => {
      return new Promise((resolve) => {
        try {
          plus.io.resolveLocalFileSystemURL(url, (entry: any) => {
            entry.file((file: any) => {
              const reader = new (plus.io as any).FileReader()
              reader.onloadend = (evt: any) => {
                const result = String(evt?.target?.result || '')
                const idx = result.indexOf('base64,')
                resolve(idx >= 0 ? result.slice(idx + 7) : null)
              }
              reader.onerror = () => resolve(null)
              reader.readAsDataURL(file)
            }, () => resolve(null))
          }, () => resolve(null))
        } catch (_e) {
          resolve(null)
        }
      })
    }

    return (async () => {
      const rawUrl = filePath.startsWith('file://') ? filePath : 'file://' + filePath
      let base64 = await tryRead(rawUrl)
      if (!base64) {
        // 路径含空格/中文时再试URL编码形式
        base64 = await tryRead('file://' + encodeURI(filePath.replace(/^file:\/\//, '')))
      }
      return base64
    })()
    // #endif

    // #ifndef APP-PLUS
    return Promise.resolve(null)
    // #endif
  }

  /**
   * 通话结束后自动查找并上传录音
   */
  async processCallRecording(callInfo: CallInfo): Promise<{
    found: boolean
    uploaded: boolean
    recordingPath?: string
  }> {
    console.log('[RecordingService] 处理通话录音:', callInfo.callId)
    this.diag('开始处理通话录音', `号码${callInfo.phoneNumber || '未知'}，通话${callInfo.duration}秒，记录ID ${String(callInfo.callId).slice(0, 16)}…`)

    // 检查权限（仅作提示，不再作为拦截门槛）：
    // 实测部分ROM权限回调结果与File API实际可读性不一致——设置页的
    // "立即清理录音"能扫到文件但这里因权限判定为false被拦，导致永不上传。
    // 扫描本身对无权限目录是安全降级的（listFiles返回空、MediaStore兜底），直接扫。
    const hasPermission = await this.checkPermissions()
    this.diag('存储权限检查', hasPermission ? '通过' : '未通过（仍会继续扫描，媒体库索引可兜底读取）')

    // 先记入补传队列（日志式兜底）：即使APP在处理中途被系统杀掉，
    // 下次启动/回前台仍会按队列补扫补传；处理成功后再移除
    this.enqueuePendingTask(callInfo, 3 * 60 * 1000)

    // 🔥 重试查找：录音文件落盘时机因ROM而异——华为/荣耀官方说明录音文件生成
    // 可能需要最长1分钟；OPPO等设备也可能在通话结束后数十秒才被媒体库收录
    // （中间几次扫描不写诊断日志，只在最后一次汇总，避免一通电话刷十几条日志）
    const findDelays = [2000, 5000, 10000, 20000, 30000, 45000]
    let recording: RecordingFile | null = null
    for (let attempt = 0; attempt < findDelays.length; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, findDelays[attempt]))
      const isLastAttempt = attempt === findDelays.length - 1
      recording = await this.findMatchingRecording(callInfo, !isLastAttempt)
      if (recording) {
        console.log(`[RecordingService] 第${attempt + 1}次扫描找到匹配录音:`, recording.name)
        break
      }
      console.log(`[RecordingService] 第${attempt + 1}次扫描未找到匹配录音，${attempt < findDelays.length - 1 ? '稍后重试' : '结束查找'}`)
    }
    if (!recording) {
      // 未接/拒接来电扫遍全程（约2分钟）都没有录音 → 本来就不会产生录音文件，
      // 直接出队结束，不能提示"待补传"误导用户
      if (this.isNoAnswerCall(callInfo)) {
        this.removePendingTask(callInfo.callId)
        this.diag('无录音·处理结束', `号码${callInfo.phoneNumber || '未知'}：未接/拒接来电不会产生录音，无需补传`)
        return { found: false, uploaded: false }
      }
      // 已接通但没找到文件：保留在补传队列，APP回前台/下次启动/定时器都会再试（24小时内）
      this.diag('转入后台补传队列', `本次未找到录音文件，将在后台自动重试（每5分钟检查一次，最长保留24小时）`)
      return { found: false, uploaded: false }
    }

    // 🔥 重试上传：网络抖动/服务器瞬时不可用时自动重试
    const uploadDelays = [0, 3000, 10000]
    let uploaded = false
    for (let attempt = 0; attempt < uploadDelays.length; attempt++) {
      if (uploadDelays[attempt] > 0) {
        await new Promise((resolve) => setTimeout(resolve, uploadDelays[attempt]))
      }
      uploaded = await this.uploadRecordingFile(callInfo.callId, recording, callInfo.phoneNumber)
      if (uploaded) break
      console.warn(`[RecordingService] 第${attempt + 1}次上传失败${attempt < uploadDelays.length - 1 ? '，稍后重试' : '，转入后台补传队列'}`)
    }
    if (uploaded) {
      this.removePendingTask(callInfo.callId)
    }

    return {
      found: true,
      uploaded,
      recordingPath: recording.path,
    }
  }

  // ==================== 补传队列（持久化，多方案兜底） ====================

  /** 读取补传队列 */
  private loadPendingTasks(): PendingRecordingTask[] {
    try {
      const raw = uni.getStorageSync(PENDING_TASKS_KEY)
      if (!raw) return []
      const tasks: PendingRecordingTask[] = JSON.parse(raw)
      // 丢弃超过24小时的任务
      return tasks.filter(t => Date.now() - t.createdAt < PENDING_TASK_TTL)
    } catch (_e) {
      return []
    }
  }

  private savePendingTasks(tasks: PendingRecordingTask[]) {
    try {
      uni.setStorageSync(PENDING_TASKS_KEY, JSON.stringify(tasks.slice(-30)))
    } catch (_e) { /* ignore */ }
  }

  /** 未接/拒接来电（未检测到接通）：正常情况下不会产生录音文件 */
  private isNoAnswerCall(info: { answered?: boolean; duration?: number }): boolean {
    if (info.answered !== undefined) return !info.answered
    return (info.duration || 0) <= 0
  }

  /** 录音处理开始即入队（日志式兜底），成功后移除；重复入队自动去重 */
  private enqueuePendingTask(callInfo: CallInfo, firstRetryDelayMs?: number) {
    const tasks = this.loadPendingTasks()
    if (tasks.some(t => t.callId === callInfo.callId)) return
    tasks.push({
      callId: callInfo.callId,
      phoneNumber: callInfo.phoneNumber,
      startTime: callInfo.startTime,
      endTime: callInfo.endTime,
      duration: callInfo.duration,
      answered: callInfo.answered,
      attempts: 0,
      nextRetryAt: Date.now() + (firstRetryDelayMs ?? PENDING_RETRY_BACKOFF_MIN[0] * 60 * 1000),
      createdAt: Date.now(),
    })
    this.savePendingTasks(tasks)
    this.startPendingRetryLoop()
  }

  /** 上传成功后从补传队列移除 */
  private removePendingTask(callId: string) {
    const tasks = this.loadPendingTasks()
    const remaining = tasks.filter(t => t.callId !== callId)
    if (remaining.length !== tasks.length) {
      this.savePendingTasks(remaining)
    }
  }

  /** 获取补传队列长度（供设置页诊断显示） */
  getPendingTaskCount(): number {
    return this.loadPendingTasks().length
  }

  /**
   * 重试补传队列（APP启动/回前台/定时器触发）
   * @param force 忽略退避时间立即重试（设置页手动触发）
   */
  async retryPendingTasks(force: boolean = false): Promise<{ retried: number; uploaded: number; matchedButFailed: number }> {
    if (this.isRetryingPending) return { retried: 0, uploaded: 0, matchedButFailed: 0 }
    this.isRetryingPending = true
    let retried = 0
    let uploadedCount = 0
    let matchedButFailed = 0
    try {
      const tasks = this.loadPendingTasks()
      if (tasks.length === 0) return { retried: 0, uploaded: 0, matchedButFailed: 0 }

      const remaining: PendingRecordingTask[] = []
      for (const task of tasks) {
        if (!force && Date.now() < task.nextRetryAt) {
          remaining.push(task)
          continue
        }
        retried++
        this.diag('补传重试', `第${task.attempts + 1}次尝试，号码${task.phoneNumber || '未知'}`)
        const recording = await this.findMatchingRecording({
          callId: task.callId,
          phoneNumber: task.phoneNumber,
          startTime: task.startTime,
          endTime: task.endTime,
          duration: task.duration,
        })
        if (recording) {
          const ok = await this.uploadRecordingFile(task.callId, recording, task.phoneNumber)
          if (ok) {
            uploadedCount++
            continue // 成功，出队
          }
          matchedButFailed++
        } else if (this.isNoAnswerCall(task)) {
          // 未接/拒接来电没有录音是正常的：重试仍找不到就出队，
          // 不再挂在"待补传"里误导用户（也顺带清掉旧版本遗留的这类任务）
          this.diag('无录音·出队', `号码${task.phoneNumber || '未知'}：未接/拒接来电不会产生录音，已从补传队列移除`)
          continue
        }
        // 失败：按退避表安排下次重试
        task.attempts++
        const backoffIdx = Math.min(task.attempts, PENDING_RETRY_BACKOFF_MIN.length - 1)
        task.nextRetryAt = Date.now() + PENDING_RETRY_BACKOFF_MIN[backoffIdx] * 60 * 1000
        remaining.push(task)
      }
      this.savePendingTasks(remaining)
      if (retried > 0) {
        this.diag('补传结果', `本轮重试${retried}个，上传成功${uploadedCount}个，剩余待补传${remaining.length}个`)
      }
      return { retried, uploaded: uploadedCount, matchedButFailed }
    } finally {
      this.isRetryingPending = false
    }
  }

  /** 启动后台补传定时器（每5分钟检查一次队列，队列为空自动停止） */
  startPendingRetryLoop() {
    // #ifdef APP-PLUS
    if (this.pendingRetryTimer) return
    if (this.loadPendingTasks().length === 0) return
    this.pendingRetryTimer = setInterval(async () => {
      const tasks = this.loadPendingTasks()
      if (tasks.length === 0) {
        if (this.pendingRetryTimer) {
          clearInterval(this.pendingRetryTimer)
          this.pendingRetryTimer = null
        }
        return
      }
      await this.retryPendingTasks()
    }, 5 * 60 * 1000)
    // #endif
  }

  /**
   * 尝试开启系统通话录音（部分手机支持）
   * 返回 { jumped: boolean, brand: string, guideTips: string }
   */
  async tryEnableSystemRecording(): Promise<{ jumped: boolean; brand: string; guideTips: string }> {
    const brand = this.getDeviceBrand()
    let jumped = false
    let guideTips = ''

    // #ifdef APP-PLUS
    try {
      // 获取设备型号用于提示
      const Build = plus.android.importClass('android.os.Build')
      const model = (Build as any).MODEL || '未知型号'
      const sdkVersion = (Build as any).VERSION.SDK_INT
      console.log('[RecordingService] 尝试开启系统录音, 品牌:', brand, '型号:', model, 'SDK:', sdkVersion)

      // 小米手机
      if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
        jumped = this.enableXiaomiRecording()
        guideTips = jumped
          ? `已为您打开小米电话设置页面（${model}）\n\n请按以下路径操作：\n📍 通话录音 → 自动录音 → 开启「所有通话自动录音」\n\n如未直接看到，请点击左上角返回，在电话设置中查找「通话录音」选项。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角「⚙️设置」 → 通话录音 → 自动录音 → 开启\n📍 路径②：打开「设置」APP → 搜索「通话录音」→ 自动录音 → 开启\n\n💡 MIUI/HyperOS 通常在电话APP的设置中`
      }
      // 华为手机
      else if (brand.includes('huawei') || brand.includes('honor')) {
        jumped = this.enableHuaweiRecording()
        guideTips = jumped
          ? `已为您打开华为通话设置页面（${model}）\n\n请按以下路径操作：\n📍 通话自动录音 → 开启开关 → 选择「所有通话」\n\n如未直接看到，请返回上级查找「通话自动录音」选项。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角「⋮」→ 设置 → 通话自动录音 → 开启\n📍 路径②：打开「设置」→ 搜索「通话录音」→ 通话自动录音 → 开启\n📍 路径③：设置 → 移动网络 → 通话设置 → 通话自动录音\n\n💡 HarmonyOS 4.x 路径可能为：电话 → ⋮ → 设置 → 通话自动录音`
      }
      // OPPO手机
      else if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
        jumped = this.enableOppoRecording()
        const brandLabel = brand.includes('oneplus') ? '一加' : (brand.includes('realme') ? 'realme' : 'OPPO')
        guideTips = jumped
          ? `已为您打开${brandLabel}通话设置页面（${model}）\n\n请按以下路径操作：\n📍 通话录音 → 自动录音 → 开启\n\n如果未找到，请返回在通话设置中查找「通话录音」。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角「⚙️」→ 通话录音 → 自动录音 → 开启\n📍 路径②：打开「设置」→ 搜索「通话录音」→ 自动录音 → 开启\n📍 路径③：设置 → 系统设置 → 电话 → 通话录音\n\n💡 ColorOS 14+ 路径：电话APP设置 → 通话录音`
      }
      // VIVO手机
      else if (brand.includes('vivo') || brand.includes('iqoo')) {
        jumped = this.enableVivoRecording()
        guideTips = jumped
          ? `已为您打开vivo通话设置页面（${model}）\n\n请按以下路径操作：\n📍 通话录音 → 自动录音 → 开启\n\n如果未找到，请返回在通话设置中查找。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角「☰」→ 设置 → 通话录音 → 自动录音 → 开启\n📍 路径②：打开「设置」→ 搜索「通话录音」→ 自动录音 → 开启\n📍 路径③：设置 → 电话 → 通话录音 → 自动录音\n\n💡 OriginOS/FuntouchOS 路径：电话APP → 左上角菜单 → 设置 → 通话录音`
      }
      // 三星手机
      else if (brand.includes('samsung')) {
        jumped = this.enableSamsungRecording()
        guideTips = jumped
          ? `已为您打开三星通话设置页面（${model}）\n\n请按以下路径操作：\n📍 录音通话 → 自动录音通话 → 开启\n\n选择「所有通话」或指定号码。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角「⋮」→ 设置 → 录音通话 → 自动录音通话 → 开启\n📍 路径②：打开「设置」→ 搜索「录音通话」→ 自动录音通话 → 开启\n\n💡 One UI 4.0+ 路径：电话 → ⋮ → 设置 → 录音通话`
      }
      // 魅族手机
      else if (brand.includes('meizu')) {
        jumped = this.enableGenericRecording()
        guideTips = jumped
          ? `已为您打开设置页面（${model}），请找到「通话录音」选项并开启。`
          : `您的手机型号：${model}\n\n请手动操作：\n📍 路径①：打开「电话」APP → 右上角设置 → 通话录音 → 自动录音 → 开启\n📍 路径②：设置 → 搜索「通话录音」`
      }
      // 联想/摩托罗拉
      else if (brand.includes('lenovo') || brand.includes('motorola')) {
        jumped = this.enableGenericRecording()
        guideTips = jumped
          ? `已为您打开设置页面（${model}），请找到「通话录音」或「Call Recording」选项。`
          : `您的手机型号：${model}\n\n请手动操作：\n路径1：打开「电话」APP → 菜单 → 设置 → 通话录音 → 始终录音\n路径2：打开「设置」→ 搜索「Call Recording」\n\n提示：使用Google原生拨号器的机型路径：电话 → 菜单 → 设置 → 通话录音 → 始终录音`
      }
      // Google Pixel / Nothing Phone
      else if (brand.includes('google') || brand.includes('nothing')) {
        jumped = this.enableGoogleDialerRecording()
        const brandLabel = brand.includes('nothing') ? 'Nothing' : 'Google Pixel'
        guideTips = jumped
          ? `已为您打开${brandLabel}通话设置页面（${model}）\n\n请按以下路径操作：\n通话录音 → 始终录音 → 开启`
          : `您的手机型号：${model}\n\n请手动操作：\n路径1：打开「电话」APP → 右上角「菜单」→ 设置 → 通话录音 → 始终录音 → 开启\n路径2：打开「设置」→ 搜索「Call Recording」\n\n提示：Google Dialer 路径：Phone → Menu → Settings → Call recording → Always record`
      }
      // 传音系 TECNO/Infinix/itel
      else if (brand.includes('tecno') || brand.includes('infinix') || brand.includes('itel')) {
        jumped = this.enableGenericRecording()
        guideTips = jumped
          ? `已为您打开设置页面（${model}），请找到「通话录音」选项并开启。`
          : `您的手机型号：${model}\n\n请手动操作：\n路径1：打开「电话」APP → 设置 → 通话录音 → 自动录音 → 开启\n路径2：打开「设置」→ 搜索「通话录音」`
      }
      // 其他品牌（含Google Pixel、中兴、努比亚等）
      else {
        jumped = this.enableGenericRecording()
        guideTips = jumped
          ? `已为您打开通话设置页面（${model}），请查找「通话录音」或「Call Recording」选项并开启。`
          : `您的手机型号：${model}\n\n请手动操作（适用于大多数安卓手机）：\n📍 路径①：打开手机自带「电话」APP → 右上角设置（⚙️或⋮）→ 通话录音 → 自动录音 → 开启\n📍 路径②：打开「设置」→ 搜索「通话录音」或「录音」\n📍 路径③：设置 → 电话/通话设置 → 通话录音 → 自动录音\n\n💡 Google拨号器：电话 → ⋮ → 设置 → 通话录音 → 始终录音`
      }
    } catch (e) {
      console.error('[RecordingService] 开启系统录音失败:', e)
      guideTips = `打开设置失败，请手动操作：\n\n① 返回手机桌面\n② 打开手机自带「电话/拨号」APP\n③ 进入设置（右上角 ⚙️ 或 ⋮）\n④ 找到「通话录音」→「自动录音」→ 开启\n\n💡 也可以在系统「设置」中搜索「通话录音」`
    }
    // #endif

    // #ifndef APP-PLUS
    guideTips = '此功能需要在手机APP中使用。'
    // #endif

    return { jumped, brand, guideTips }
  }


  /**
   * 小米手机开启通话录音
   */
  private enableXiaomiRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const Uri = plus.android.importClass('android.net.Uri')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: 小米电话APP通话录音设置（MIUI 12+/HyperOS）
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.android.phone',
          'com.android.phone.settings.CallRecordSettingsActivity'
        ))
        intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
        ;(main as any).startActivity(intent)
      },
      // 方式2: 小米通话设置主页
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.android.phone',
          'com.android.phone.settings.MiuiCallFeaturesSetting'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: MIUI拨号器设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.miui.phone',
          'com.miui.phone.setting.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: android.telecom 通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式5: 标准通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式6: 直接启动电话APP的设置
      () => {
        const intent = (main as any).getPackageManager().getLaunchIntentForPackage('com.android.phone')
        if (!intent) throw new Error('no launch intent')
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] 小米录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] 小米录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * 华为手机开启通话录音
   */
  private enableHuaweiRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: 华为电话APP通话设置（EMUI 10+/HarmonyOS）
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.huawei.contacts',
          'com.huawei.contacts.dialer.settings.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: 华为电话APP通话设置（备用路径）
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.android.phone',
          'com.android.phone.MSimCallFeaturesSetting'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: 荣耀电话APP通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.hihonor.contacts',
          'com.hihonor.contacts.dialer.settings.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: telecom通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式5: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] 华为录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] 华为录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * OPPO/Realme/一加手机开启通话录音
   */
  private enableOppoRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: ColorOS 电话APP通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.android.phone',
          'com.android.phone.OppoCallFeaturesSetting'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: ColorOS 拨号器设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.coloros.dialer',
          'com.coloros.dialer.settings.DialerSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: 一加电话设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.oneplus.dialer',
          'com.oneplus.dialer.settings.DialerSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: telecom通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式5: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] OPPO录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] OPPO录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * VIVO/iQOO手机开启通话录音
   */
  private enableVivoRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: vivo电话APP通话设置（OriginOS/FuntouchOS）
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.android.phone',
          'com.android.phone.CallFeaturesSetting'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: vivo电话设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.vivo.contacts',
          'com.vivo.contacts.dialer.settings.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: telecom通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] VIVO录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] VIVO录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * 三星手机开启通话录音
   */
  private enableSamsungRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: 三星电话APP通话设置（One UI）
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.samsung.android.dialer',
          'com.samsung.android.dialer.setting.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: 三星电话设置备用路径
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.samsung.android.dialer',
          'com.samsung.android.dialer.callsettings.CallSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: telecom通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] 三星录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] 三星录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * Google Pixel / Nothing Phone 开启通话录音（Google Dialer）
   */
  private enableGoogleDialerRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: Google Dialer 通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.google.android.dialer',
          'com.google.android.dialer.settings.GoogleDialerSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: Google Dialer 主设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(new (ComponentName as any)(
          'com.google.android.dialer',
          'com.android.dialer.app.settings.DialerSettingsActivity'
        ))
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: telecom通话设置
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log('[RecordingService] Google Dialer录音设置打开成功，方式' + (i + 1))
        return true
      } catch (_e) {
        console.log('[RecordingService] Google Dialer录音设置方式' + (i + 1) + '失败')
      }
    }
    // #endif
    return false
  }

  /**
   * 通用方法开启通话录音
   */
  private enableGenericRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: telecom通话设置（Android 6.0+标准接口）
      () => {
        const intent = new (Intent as any)('android.telecom.action.SHOW_CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式2: 通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式3: 打开拨号应用
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.intent.action.DIAL')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      },
      // 方式4: 打开系统设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.SETTINGS')
        intent.addFlags(0x10000000)
        ;(main as any).startActivity(intent)
      }
    ]

    for (let i = 0; i < attempts.length; i++) {
      try {
        attempts[i]()
        console.log(`[RecordingService] 通用录音设置打开成功，方式${i + 1}`)
        return true
      } catch (_e) {
        console.log(`[RecordingService] 通用录音设置方式${i + 1}失败，尝试下一种`)
      }
    }
    // #endif
    return false
  }

  /**
   * 检查系统录音是否已开启
   *
   * 重要：必须确保真实检测，不能误报！
   *
   * 检测优先级（从最可靠到最不可靠）：
   * 1. 系统Settings键值（最可靠，部分品牌支持）
   * 2. 通话录音专属目录 + 里面有实际音频文件（可靠）
   * 3. 通话录音专属目录存在 + 是近期创建的（较可靠）
   * 4. 通用目录中发现符合通话录音命名规则的文件（较可靠）
   * 5. MediaStore中发现路径在通话录音目录下的音频（较可靠）
   *
   * 注意：以下情况不能判定为已开启：
   * - 仅有 /Recordings/、/Record/、/Sounds/ 等通用目录存在（系统默认就有）
   * - 仅有通用音频文件（不在通话录音专属目录）
   */
  async checkRecordingEnabled(): Promise<boolean> {
    // #ifdef APP-PLUS
    try {
      const brand = this.getDeviceBrand()
      console.log('[RecordingService] ===== 开始严格检测录音状态 =====')
      console.log('[RecordingService] 品牌:', brand)

      // ========== 策略1: 读取系统Settings键值（最可靠） ==========
      const settingsEnabled = this.checkSystemRecordingSetting()
      if (settingsEnabled) {
        console.log('[RecordingService] ✅ 策略1命中: 系统设置中通话录音已开启')
        return true
      }
      console.log('[RecordingService] ❌ 策略1: 未在系统设置中检测到录音开关')

      // ========== 策略2: 通话录音专属目录 + 包含音频文件 ==========
      const File = plus.android.importClass('java.io.File')
      const specificPaths = this.getBrandSpecificPaths(brand)

      for (const dirPath of specificPaths) {
        try {
          const dir = new (File as any)(dirPath)
          if (!dir.exists() || !dir.isDirectory()) continue

          // 目录存在，检查里面是否有实际的音频文件
          const audioFiles = await this.listAudioFiles(dirPath)
          if (audioFiles.length > 0) {
            console.log(`[RecordingService] ✅ 策略2命中: 专属目录 ${dirPath} 中发现 ${audioFiles.length} 个录音文件`)
            console.log(`[RecordingService]   最新文件: ${audioFiles[0].name}, 修改时间: ${new Date(audioFiles[0].lastModified).toLocaleString()}`)
            return true
          }

          // 目录存在但没有文件，检查是否是近7天内创建/修改的（刚开启还没打电话的情况）
          const dirLastModified = dir.lastModified()
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          if (dirLastModified > sevenDaysAgo) {
            console.log(`[RecordingService] ✅ 策略2命中: 专属目录 ${dirPath} 存在且近7天内有变动(${new Date(dirLastModified).toLocaleString()})，可能刚开启`)
            return true
          }

          console.log(`[RecordingService]   专属目录存在但无文件且较旧: ${dirPath}`)
        } catch (_e) {
          // 继续检查下一个
        }
      }
      console.log('[RecordingService] ❌ 策略2: 专属目录中未找到录音文件')

      // ========== 策略3: 在通用目录中查找符合通话录音命名规则的文件 ==========
      const hasCallRecordingFiles = await this.findCallRecordingFilesInGenericPaths()
      if (hasCallRecordingFiles) {
        console.log('[RecordingService] ✅ 策略3命中: 通用目录中发现通话录音文件')
        return true
      }
      console.log('[RecordingService] ❌ 策略3: 通用目录中未找到通话录音文件')

      // ========== 策略4: MediaStore精确查询 ==========
      const hasMediaStoreRecordings = this.checkMediaStoreForCallRecordingsStrict()
      if (hasMediaStoreRecordings) {
        console.log('[RecordingService] ✅ 策略4命中: MediaStore中发现通话录音')
        return true
      }
      console.log('[RecordingService] ❌ 策略4: MediaStore中未发现通话录音')

      // ========== 策略5: 动态发现专属目录 + 文件检查 ==========
      const discoveredPaths = this.discoverRecordingFolders()
      for (const dirPath of discoveredPaths) {
        const audioFiles = await this.listAudioFiles(dirPath)
        if (audioFiles.length > 0) {
          // 额外验证：文件名是否符合通话录音命名规则
          const hasCallFiles = audioFiles.some(f => this.isCallRecordingFileName(f.name))
          if (hasCallFiles) {
            console.log(`[RecordingService] ✅ 策略5命中: 动态发现目录 ${dirPath} 中有通话录音文件`)
            return true
          }
        }
      }
      console.log('[RecordingService] ❌ 策略5: 动态发现的目录中未找到通话录音文件')

      console.log('[RecordingService] ===== 所有策略均未检测到通话录音已开启 =====')
      return false
    } catch (e) {
      console.error('[RecordingService] 检查录音状态失败:', e)
      return false
    }
    // #endif

    // #ifndef APP-PLUS
    return false
    // #endif
  }

  /**
   * 获取当前品牌的专属通话录音路径（排在前面优先检查）
   */
  private getBrandSpecificPaths(brand: string): string[] {
    // 品牌对应的最可能的专属路径排在前面
    if (brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco')) {
      return [
        '/storage/emulated/0/MIUI/sound_recorder/call_rec/',
        '/sdcard/MIUI/sound_recorder/call_rec/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('huawei') || brand.includes('honor')) {
      return [
        '/storage/emulated/0/Sounds/CallRecord/',
        '/storage/emulated/0/sounds/callrecord/',
        '/storage/emulated/0/Documents/Sounds/CallRecord/',
        '/sdcard/Sounds/CallRecord/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus')) {
      return [
        '/storage/emulated/0/Recordings/Call Recordings/',
        '/storage/emulated/0/Music/Recordings/Call Recordings/',
        '/storage/emulated/0/Record/PhoneRecord/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('vivo') || brand.includes('iqoo')) {
      return [
        '/storage/emulated/0/Record/Call/',
        '/sdcard/Record/Call/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('samsung')) {
      return [
        '/storage/emulated/0/Call/',
        '/storage/emulated/0/Recordings/Call recordings/',
        '/storage/emulated/0/Recordings/Voice Recorder/Call/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('google') || brand.includes('nothing')) {
      return [
        '/storage/emulated/0/Recordings/Call recordings/',
        '/storage/emulated/0/Recordings/Call Recordings/',
        ...CALL_SPECIFIC_PATHS,
      ]
    } else if (brand.includes('tecno') || brand.includes('infinix') || brand.includes('itel')) {
      return [
        '/storage/emulated/0/Record/Call/',
        '/storage/emulated/0/CallRecorder/',
        ...CALL_SPECIFIC_PATHS,
      ]
    }
    // 其他品牌：检查所有专属路径
    return [...CALL_SPECIFIC_PATHS]
  }

  /**
   * 判断文件名是否符合通话录音命名规则
   * 通话录音文件通常包含：电话号码、"call"、"通话"、日期时间等
   */
  private isCallRecordingFileName(fileName: string): boolean {
    const lower = fileName.toLowerCase()

    // 包含电话号码特征（连续11位数字，或1开头的手机号模式）
    if (/1[3-9]\d{9}/.test(fileName)) return true
    // 文件名包含 "call" 相关关键词（排除callback/recall等）
    if (/\bcall[_\s-]?rec/i.test(fileName)) return true
    if (lower.includes('call') && !lower.includes('callback') && !lower.includes('recall')) return true
    // 文件名包含中文"通话"
    if (fileName.includes('通话')) return true
    // 文件名包含 "record" + 日期/数字模式（如 Record_20260417_143022）
    if (/record.*\d{8}/.test(lower)) return true
    // 文件名是纯数字+时间戳格式（如 20260417143022.amr）
    if (/^\d{14,}\./.test(fileName)) return true
    // 文件名包含 "录音" + 数字
    if (fileName.includes('录音') && /\d/.test(fileName)) return true
    // Google Dialer格式：Recording_电话号码 或 Recording + 日期
    if (/^recording[_\s]/i.test(fileName) && /\d{8,}/.test(fileName)) return true

    return false
  }

  /**
   * 在通用目录中查找符合通话录音命名规则的文件
   * 通用目录（Recordings、Record等）默认就存在，不能靠目录存在来判断
   * 必须找到实际的通话录音文件才算
   */
  private async findCallRecordingFilesInGenericPaths(): Promise<boolean> {
    // #ifdef APP-PLUS
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000

    for (const dirPath of GENERIC_SCAN_PATHS) {
      try {
        const audioFiles = await this.listAudioFiles(dirPath)
        // 过滤出近90天内的文件
        const recentFiles = audioFiles.filter(f => f.lastModified > ninetyDaysAgo)

        for (const file of recentFiles) {
          if (this.isCallRecordingFileName(file.name)) {
            console.log(`[RecordingService]   在通用目录发现通话录音: ${dirPath}${file.name}`)
            return true
          }
        }
      } catch (_e) {
        // 跳过
      }
    }
    // #endif
    return false
  }

  /**
   * 精确的MediaStore查询 — 只查找路径在通话录音专属目录下的音频文件
   * 比之前的查询更严格：
   * - 路径必须包含 callrecord/call_rec/CallRecord 等专属关键词
   * - 或者文件名包含手机号码模式
   * - 不再用宽泛的 LIKE '%call%' 匹配文件名
   */
  private checkMediaStoreForCallRecordingsStrict(): boolean {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const MediaStore = plus.android.importClass('android.provider.MediaStore')

      const contentResolver = (main as any).getContentResolver()
      const uri = (MediaStore as any).Audio.Media.EXTERNAL_CONTENT_URI

      // 只查询最近90天
      const ninetyDaysAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)

      // 严格条件：路径必须在通话录音专属目录下
      // 注：时间戳为纯数字，直接内联（plus.android 无法可靠构造 String[] 参数数组）
      const selection = `(${(MediaStore as any).Audio.Media.DATE_ADDED} > ${ninetyDaysAgo}) AND (` +
        // 小米通话录音专属路径
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%miui/sound_recorder/call_rec%' OR ` +
        // 华为通话录音专属路径
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%sounds/callrecord%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%documents/sounds/callrecord%' OR ` +
        // 通用通话录音路径
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/callrecordings/%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/callrecord/%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/call_record/%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/call_rec/%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/phonerecord/%' OR ` +
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/talkback/%' OR ` +
        // OPPO/三星 通话录音子目录
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/call recordings/%' OR ` +
        // OPPO ColorOS 中文目录
        `${(MediaStore as any).Audio.Media.DATA} LIKE '%/通话录音/%' OR ` +
        // 文件名包含"通话录音"（中文命名）
        `${(MediaStore as any).Audio.Media.DISPLAY_NAME} LIKE '%通话录音%')`

      const cursor = contentResolver.query(
        uri,
        null,
        selection,
        null,
        (MediaStore as any).Audio.Media.DATE_ADDED + ' DESC'
      )

      if (cursor) {
        const count = cursor.getCount()
        cursor.close()
        console.log('[RecordingService] MediaStore严格查询到通话录音数量:', count)
        return count > 0
      }
    } catch (e) {
      console.warn('[RecordingService] MediaStore查询失败:', e)
    }
    // #endif
    return false
  }

  /**
   * 策略2: 动态发现录音文件夹
   * 递归扫描常见父目录，查找名称包含录音相关关键词的子文件夹
   */
  private discoverRecordingFolders(): string[] {
    // #ifdef APP-PLUS
    try {
      const File = plus.android.importClass('java.io.File')
      const discovered: string[] = []

      // 要扫描的父目录
      const parentDirs = [
        '/storage/emulated/0',
        '/storage/emulated/0/Music',
        '/storage/emulated/0/Documents',
        '/storage/emulated/0/Download',
        '/storage/emulated/0/Sounds',
        '/storage/emulated/0/Recordings',
        '/storage/emulated/0/Record',
        '/storage/emulated/0/录音',
      ]

      // 录音文件夹名称关键词（不区分大小写匹配）
      const keywords = [
        'callrecord', 'call_record', 'call record', 'call recordings',
        'callrecordings', 'phonerecord', 'phone_record',
        'call_rec', 'callrec', 'talkback',
        'sound_recorder', 'voicerecorder',
        '通话录音', '通话', '电话录音',
      ]

      for (const parentPath of parentDirs) {
        try {
          const parentDir = new (File as any)(parentPath)
          if (!parentDir.exists() || !parentDir.isDirectory()) continue

          const children = parentDir.listFiles()
          if (!children) continue

          for (let i = 0; i < children.length; i++) {
            const child = children[i]
            if (!child.isDirectory()) continue

            const childName = (child.getName() as string).toLowerCase()

            // 直接匹配关键词
            for (const kw of keywords) {
              if (childName.includes(kw) || childName.replace(/[\s_-]/g, '').includes(kw.replace(/[\s_-]/g, ''))) {
                discovered.push(child.getAbsolutePath())
                break
              }
            }

            // 二级子目录也查找一下（如 Music/Recordings/Call Recordings）
            if (childName.includes('recording') || childName.includes('record') || childName.includes('sound')) {
              try {
                const subChildren = child.listFiles()
                if (!subChildren) continue
                for (let j = 0; j < subChildren.length; j++) {
                  const sub = subChildren[j]
                  if (!sub.isDirectory()) continue
                  const subName = (sub.getName() as string).toLowerCase()
                  if (subName.includes('call') || subName.includes('phone') || subName.includes('通话')) {
                    discovered.push(sub.getAbsolutePath())
                  }
                }
              } catch (_e2) { /* ignore */ }
            }
          }
        } catch (_e) {
          // 跳过无权限的目录
        }
      }

      return discovered
    } catch (e) {
      console.error('[RecordingService] 动态发现录音文件夹失败:', e)
    }
    // #endif
    return []
  }


  /**
   * 检查系统通话录音设置（最可靠的检测方式）
   * 通过 ContentResolver 读取系统设置中的通话录音开关
   */
  private checkSystemRecordingSetting(): boolean {
    // #ifdef APP-PLUS
    try {
      const main = plus.android.runtimeMainActivity()
      const Settings = plus.android.importClass('android.provider.Settings')
      const contentResolver = (main as any).getContentResolver()

      // 不同厂商的设置键名
      const settingKeys = [
        // 华为 / 荣耀
        'enable_record_auto',
        'call_record_auto',
        'auto_call_record',
        'hw_call_recording',
        'hw_callrecord_auto',
        'hw_record_incall',
        // 荣耀 MagicOS
        'hn_call_record_auto',
        'magic_call_recording',
        // 小米 / 红米
        'button_auto_record_call',
        'call_recording_enabled',
        'miui_call_recording',
        // OPPO / Realme / 一加（ColorOS 12+ 使用 oplus_customize_ 前缀）
        'oppo_call_record',
        'oppo_auto_call_recording',
        'oplus_call_recording',
        'oplus_customize_call_record',
        'oplus_customize_all_call_record',
        'oplus_customize_call_record_auto',
        'oppo_all_call_audio_record',
        'auto_record',
        'all_auto_record',
        // VIVO / iQOO
        'vivo_call_recording',
        'vivo_auto_record',
        'call_record_state',
        'vivo_all_call_record',
        // 三星
        'samsung_call_recording',
        'call_recording_mode',
        'enable_all_call_recording',
        // 魅族 Flyme
        'mz_call_record_auto',
        // Google Pixel
        'google_call_recording',
        'dialer_call_recording_enabled',
        // 通用 Android
        'call_auto_record',
        'auto_record_call',
        'call_recording',
        'persist.sys.call.recording',
      ]

      for (const key of settingKeys) {
        try {
          // 先查 System
          let value = (Settings as any).System.getString(contentResolver, key)
          if (value === '1' || value === 'true' || value === 'on') {
            console.log('[RecordingService] 系统设置检测到录音开启, key:', key, 'value:', value)
            return true
          }
          // 再查 Secure
          value = (Settings as any).Secure.getString(contentResolver, key)
          if (value === '1' || value === 'true' || value === 'on') {
            console.log('[RecordingService] Secure设置检测到录音开启, key:', key, 'value:', value)
            return true
          }
          // 再查 Global
          value = (Settings as any).Global.getString(contentResolver, key)
          if (value === '1' || value === 'true' || value === 'on') {
            console.log('[RecordingService] Global设置检测到录音开启, key:', key, 'value:', value)
            return true
          }
        } catch (_e) {
          // 该key不存在，继续
        }
      }
    } catch (e) {
      console.warn('[RecordingService] 检查系统录音设置失败:', e)
    }
    // #endif
    return false
  }

  /**
   * 🔥 清理过期录音文件
   * @param retentionDays 保留天数，默认3天
   * @returns 清理结果
   */
  async cleanupExpiredRecordings(retentionDays: number = 3): Promise<{
    success: boolean
    deletedCount: number
    freedSpace: number
    errors: string[]
  }> {
    const result = {
      success: true,
      deletedCount: 0,
      freedSpace: 0,
      errors: [] as string[]
    }

    // #ifdef APP-PLUS
    try {
      // 用宽时间窗扫描（1年），确保比保留天数更早的旧文件也能被扫到并清理
      const recordings = await this.scanRecordingFolders(Date.now() - 365 * 24 * 60 * 60 * 1000)
      const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000
      const File = plus.android.importClass('java.io.File')

      console.log(`[RecordingService] 开始清理 ${retentionDays} 天前的录音文件`)
      console.log(`[RecordingService] 截止时间: ${new Date(cutoffTime).toLocaleString()}`)
      console.log(`[RecordingService] 扫描到录音文件: ${recordings.length} 个`)

      for (const recording of recordings) {
        // 跳过最近的录音
        if (recording.lastModified > cutoffTime) {
          continue
        }

        // 跳过已上传的录音（在 knownRecordings 中）
        if (this.knownRecordings.has(recording.path)) {
          // 已上传的录音可以删除
        }

        try {
          const file = new (File as any)(recording.path)
          if (file.exists() && file.delete()) {
            result.deletedCount++
            result.freedSpace += recording.size
            console.log(`[RecordingService] 已删除: ${recording.name}`)
          } else {
            result.errors.push(`无法删除: ${recording.name}`)
          }
        } catch (e: any) {
          result.errors.push(`删除失败: ${recording.name} - ${e.message || e}`)
        }
      }

      console.log(`[RecordingService] 清理完成: 删除 ${result.deletedCount} 个文件，释放 ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`)
    } catch (e: any) {
      console.error('[RecordingService] 清理录音失败:', e)
      result.success = false
      result.errors.push(e.message || '清理失败')
    }
    // #endif

    return result
  }

  /**
   * 🔥 按设置自动清理过期录音（每天最多执行一次，App启动/回前台时调用）
   * 读取用户设置：autoCleanRecording 开关 + recordingRetentionDays 保留天数
   */
  async autoCleanIfDue(): Promise<void> {
    // #ifdef APP-PLUS
    try {
      const raw = uni.getStorageSync('callSettings')
      const settings = raw ? JSON.parse(raw) : {}
      if (!settings.autoCleanRecording) return

      const lastCleanup = uni.getStorageSync('lastRecordingCleanup')
      const now = Date.now()
      if (lastCleanup && now - parseInt(lastCleanup) < 24 * 60 * 60 * 1000) return

      const retentionDays = Number(settings.recordingRetentionDays) || 3
      const result = await this.cleanupExpiredRecordings(retentionDays)
      uni.setStorageSync('lastRecordingCleanup', String(now))
      if (result.deletedCount > 0) {
        this.diag('自动清理', `删除${result.deletedCount}个超过${retentionDays}天的本地录音，释放${(result.freedSpace / 1024 / 1024).toFixed(1)}MB`)
      }
    } catch (e) {
      console.warn('[RecordingService] 自动清理检查失败:', e)
    }
    // #endif
  }

  /**
   * 🔥 获取录音文件统计信息
   */
  async getRecordingStats(): Promise<{
    totalCount: number
    totalSize: number
    oldestDate: number | null
    newestDate: number | null
  }> {
    const stats = {
      totalCount: 0,
      totalSize: 0,
      oldestDate: null as number | null,
      newestDate: null as number | null
    }

    // #ifdef APP-PLUS
    try {
      // 用宽时间窗扫描（1年）：默认7天窗口会让旧文件从统计中"消失"，
      // 造成"新增了录音但总数不变"的错觉
      const recordings = await this.scanRecordingFolders(Date.now() - 365 * 24 * 60 * 60 * 1000)
      stats.totalCount = recordings.length

      for (const recording of recordings) {
        stats.totalSize += recording.size

        if (stats.oldestDate === null || recording.lastModified < stats.oldestDate) {
          stats.oldestDate = recording.lastModified
        }
        if (stats.newestDate === null || recording.lastModified > stats.newestDate) {
          stats.newestDate = recording.lastModified
        }
      }
    } catch (e) {
      console.error('[RecordingService] 获取录音统计失败:', e)
    }
    // #endif

    return stats
  }
}

// 导出单例
export const recordingService = new RecordingService()
export default recordingService
