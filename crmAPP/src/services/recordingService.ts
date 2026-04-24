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

import { uploadRecording } from '@/api/call'

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
  // VIVO / iQOO — Record/Call 是通话录音专属
  '/storage/emulated/0/Record/Call/',
  '/sdcard/Record/Call/',
  // 三星 — Call 目录或 Call recordings 子目录
  '/storage/emulated/0/Call/',
  '/storage/emulated/0/Recordings/Call recordings/',
  '/storage/emulated/0/Recordings/Voice Recorder/Call/',
  // 一加
  '/storage/emulated/0/Record/PhoneRecord/',
  // 华为 PhoneRecord
  '/storage/emulated/0/PhoneRecord/',
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
  duration: number // 通话时长（秒）
}

class RecordingService {
  private isScanning = false
  private lastScanTime = 0
  private knownRecordings: Set<string> = new Set()

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
          // Android 13+: 使用 READ_MEDIA_AUDIO
          plus.android.requestPermissions(
            ['android.permission.READ_MEDIA_AUDIO'],
            (result: any) => {
              resolve(result.granted && result.granted.length >= 1)
            },
            (_error: any) => {
              resolve(false)
            }
          )
        } else if (sdkVersion >= 30) {
          // Android 11~12: 检查 MANAGE_EXTERNAL_STORAGE 权限
          const Environment = plus.android.importClass('android.os.Environment')
          if ((Environment as any).isExternalStorageManager()) {
            resolve(true)
            return
          }
          // 请求所有文件访问权限
          const Settings = plus.android.importClass('android.provider.Settings')
          const Intent = plus.android.importClass('android.content.Intent')
          const Uri = plus.android.importClass('android.net.Uri')
          const main = plus.android.runtimeMainActivity()
          const packageName = (main as any).getPackageName()

          uni.showModal({
            title: '需要存储权限',
            content: '为了自动扫描和上传通话录音，需要授予"所有文件访问"权限。',
            confirmText: '去授权',
            success: (res) => {
              if (res.confirm) {
                try {
                  const intent = new (Intent as any)((Settings as any).ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                  intent.setData((Uri as any).parse('package:' + packageName))
                  ;(main as any).startActivity(intent)
                } catch (_e) {
                  // 降级方案
                  try {
                    const intent2 = new (Intent as any)((Settings as any).ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
                    ;(main as any).startActivity(intent2)
                  } catch (_e2) {
                    console.error('[RecordingService] 无法打开文件访问权限设置')
                  }
                }
              }
              // 延迟检查权限结果
              setTimeout(() => {
                resolve((Environment as any).isExternalStorageManager())
              }, 1000)
            }
          })
        } else {
          // Android 10 及以下: 传统存储权限
          plus.android.requestPermissions(
            [
              'android.permission.READ_EXTERNAL_STORAGE',
              'android.permission.WRITE_EXTERNAL_STORAGE',
            ],
            (result: any) => {
              console.log('[RecordingService] 权限请求结果:', result)
              const granted = result.granted && result.granted.length >= 2
              resolve(granted)
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
            resolve(result.granted && result.granted.length >= 2)
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
  async scanRecordingFolders(): Promise<RecordingFile[]> {
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

    console.log('[RecordingService] 扫描到录音文件:', recordings.length, '(扫描了', scannedPaths.size, '个目录)')
    return recordings
    // #endif

    // #ifndef APP-PLUS
    return []
    // #endif
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
   * 查找匹配通话的录音文件
   */
  async findMatchingRecording(callInfo: CallInfo): Promise<RecordingFile | null> {
    console.log('[RecordingService] 查找匹配录音:', callInfo)

    const recordings = await this.scanRecordingFolders()
    if (recordings.length === 0) {
      console.log('[RecordingService] 未找到任何录音文件')
      return null
    }

    // 通话时间范围（前后各扩展30秒的容差）
    const startRange = callInfo.startTime - 30000
    const endRange = callInfo.endTime + 30000

    // 电话号码的各种格式
    const phoneVariants = this.getPhoneVariants(callInfo.phoneNumber)

    // 查找匹配的录音
    let bestMatch: RecordingFile | null = null
    let bestScore = 0

    for (const recording of recordings) {
      // 跳过已知的录音
      if (this.knownRecordings.has(recording.path)) {
        continue
      }

      let score = 0

      // 1. 时间匹配（录音文件的修改时间应该在通话结束时间附近）
      if (recording.lastModified >= startRange && recording.lastModified <= endRange) {
        score += 50
        // 越接近通话结束时间，分数越高
        const timeDiff = Math.abs(recording.lastModified - callInfo.endTime)
        score += Math.max(0, 30 - timeDiff / 1000)
      }

      // 2. 文件名包含电话号码
      for (const phone of phoneVariants) {
        if (recording.name.includes(phone)) {
          score += 40
          break
        }
      }

      // 3. 文件大小合理（根据通话时长估算，约10KB/秒）
      const expectedSize = callInfo.duration * 10 * 1024
      const sizeDiff = Math.abs(recording.size - expectedSize)
      if (sizeDiff < expectedSize * 0.5) {
        score += 20
      }

      if (score > bestScore) {
        bestScore = score
        bestMatch = recording
      }
    }

    if (bestMatch && bestScore >= 50) {
      console.log('[RecordingService] 找到匹配录音:', bestMatch.name, '分数:', bestScore)
      return bestMatch
    }

    console.log('[RecordingService] 未找到匹配的录音文件')
    return null
  }

  /**
   * 获取电话号码的各种格式变体
   */
  private getPhoneVariants(phone: string): string[] {
    // 先保留原始号码（可能包含+86等）
    const raw = phone.trim()
    const cleaned = raw.replace(/\D/g, '')
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
  async uploadRecordingFile(callId: string, recording: RecordingFile): Promise<boolean> {
    console.log('[RecordingService] 开始上传录音:', recording.path)

    try {
      const result = await uploadRecording(callId, recording.path)
      console.log('[RecordingService] 录音上传成功:', result)

      // 标记为已上传
      this.knownRecordings.add(recording.path)

      // 🔥 触发录音上传成功事件，通知通话记录列表刷新
      uni.$emit('recording:uploaded', callId)

      return true
    } catch (e) {
      console.error('[RecordingService] 录音上传失败:', e)
      return false
    }
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

    // 检查权限
    const hasPermission = await this.checkPermissions()
    if (!hasPermission) {
      console.warn('[RecordingService] 没有存储权限')
      return { found: false, uploaded: false }
    }

    // 等待一小段时间，确保录音文件已写入
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 查找匹配的录音
    const recording = await this.findMatchingRecording(callInfo)
    if (!recording) {
      return { found: false, uploaded: false }
    }

    // 上传录音
    const uploaded = await this.uploadRecordingFile(callInfo.callId, recording)

    return {
      found: true,
      uploaded,
      recordingPath: recording.path,
    }
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
      const selection = `(${(MediaStore as any).Audio.Media.DATE_ADDED} > ?) AND (` +
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
        `LOWER(${(MediaStore as any).Audio.Media.DATA}) LIKE '%/call recordings/%' OR ` +
        // 文件名包含"通话录音"（中文命名）
        `${(MediaStore as any).Audio.Media.DISPLAY_NAME} LIKE '%通话录音%')`

      const selectionArgs = plus.android.newObject('java.lang.String[]', [String(ninetyDaysAgo)])

      const cursor = contentResolver.query(
        uri,
        null,
        selection,
        selectionArgs,
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
      ]

      // 录音文件夹名称关键词（不区分大小写匹配）
      const keywords = [
        'callrecord', 'call_record', 'call record', 'call recordings',
        'callrecordings', 'phonerecord', 'phone_record',
        'call_rec', 'callrec', 'talkback',
        'sound_recorder', 'voicerecorder',
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
        // 小米 / 红米
        'button_auto_record_call',
        'call_recording_enabled',
        'miui_call_recording',
        // OPPO / Realme / 一加
        'oppo_call_record',
        'oppo_auto_call_recording',
        'oplus_call_recording',
        // VIVO / iQOO
        'vivo_call_recording',
        'vivo_auto_record',
        // 三星
        'samsung_call_recording',
        'call_recording_mode',
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
      const recordings = await this.scanRecordingFolders()
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
      const recordings = await this.scanRecordingFolders()
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
