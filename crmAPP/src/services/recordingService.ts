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

// 常见手机品牌的录音文件夹路径
const RECORDING_PATHS = [
  // 小米
  '/storage/emulated/0/MIUI/sound_recorder/call_rec/',
  '/storage/emulated/0/MIUI/sound_recorder/',
  // 华为
  '/storage/emulated/0/Sounds/CallRecord/',
  '/storage/emulated/0/record/',
  '/storage/emulated/0/Record/',
  // OPPO
  '/storage/emulated/0/Recordings/Call/',
  '/storage/emulated/0/Recordings/',
  // VIVO
  '/storage/emulated/0/Record/Call/',
  '/storage/emulated/0/Record/',
  // 三星
  '/storage/emulated/0/Call/',
  '/storage/emulated/0/Recordings/Call recordings/',
  // 一加
  '/storage/emulated/0/Record/PhoneRecord/',
  // 通用路径
  '/storage/emulated/0/Recordings/',
  '/storage/emulated/0/AudioRecorder/',
  '/storage/emulated/0/CallRecordings/',
  '/sdcard/MIUI/sound_recorder/call_rec/',
  '/sdcard/Recordings/',
]

// 录音文件扩展名
const AUDIO_EXTENSIONS = ['.mp3', '.amr', '.wav', '.m4a', '.3gp', '.aac', '.ogg']

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

        if (sdkVersion >= 30) {
          // Android 11+: 检查 MANAGE_EXTERNAL_STORAGE 权限
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
        } else if (sdkVersion >= 33) {
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
      // 小米/红米优先
      const xiaomiPaths = paths.filter((p) => p.includes('MIUI'))
      const otherPaths = paths.filter((p) => !p.includes('MIUI'))
      return [...xiaomiPaths, ...otherPaths]
    } else if (brand.includes('huawei') || brand.includes('honor')) {
      // 华为/荣耀优先
      const huaweiPaths = paths.filter((p) => p.includes('Sounds') || p.includes('record'))
      const otherPaths = paths.filter((p) => !p.includes('Sounds') && !p.includes('record'))
      return [...huaweiPaths, ...otherPaths]
    } else if (brand.includes('oppo') || brand.includes('realme')) {
      // OPPO/Realme优先
      const oppoPaths = paths.filter((p) => p.includes('Recordings'))
      const otherPaths = paths.filter((p) => !p.includes('Recordings'))
      return [...oppoPaths, ...otherPaths]
    } else if (brand.includes('vivo') || brand.includes('iqoo')) {
      // VIVO/iQOO优先
      const vivoPaths = paths.filter((p) => p.includes('Record'))
      const otherPaths = paths.filter((p) => !p.includes('Record'))
      return [...vivoPaths, ...otherPaths]
    }

    return paths
  }

  /**
   * 扫描录音文件夹
   */
  async scanRecordingFolders(): Promise<RecordingFile[]> {
    // #ifdef APP-PLUS
    const recordings: RecordingFile[] = []
    const paths = this.getPriorityPaths()

    for (const basePath of paths) {
      try {
        const files = await this.listFiles(basePath)
        for (const file of files) {
          // 检查是否是音频文件
          const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
          if (AUDIO_EXTENSIONS.includes(ext)) {
            recordings.push(file)
          }
        }
      } catch (_e) {
        // 路径不存在或无权限，跳过
      }
    }

    console.log('[RecordingService] 扫描到录音文件:', recordings.length)
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
    const cleaned = phone.replace(/\D/g, '')
    const variants = [cleaned]

    // 去掉国家代码
    if (cleaned.startsWith('86')) {
      variants.push(cleaned.substring(2))
    }
    if (cleaned.startsWith('+86')) {
      variants.push(cleaned.substring(3))
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
   */
  async tryEnableSystemRecording(): Promise<boolean> {
    // #ifdef APP-PLUS
    try {
      const brand = this.getDeviceBrand()
      console.log('[RecordingService] 尝试开启系统录音, 品牌:', brand)

      // 小米手机
      if (brand.includes('xiaomi') || brand.includes('redmi')) {
        return this.enableXiaomiRecording()
      }

      // 华为手机
      if (brand.includes('huawei') || brand.includes('honor')) {
        return this.enableHuaweiRecording()
      }

      // OPPO/Realme手机
      if (brand.includes('oppo') || brand.includes('realme')) {
        return this.enableOppoRecording()
      }

      // VIVO/iQOO手机
      if (brand.includes('vivo') || brand.includes('iqoo')) {
        return this.enableVivoRecording()
      }

      // 其他品牌尝试通用方法
      return this.enableGenericRecording()
    } catch (e) {
      console.error('[RecordingService] 开启系统录音失败:', e)
    }
    // #endif

    return false
  }

  /**
   * 小米手机开启通话录音
   */
  private enableXiaomiRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    // 尝试多种方式打开小米通话录音设置
    const attempts = [
      // 方式1: 直接打开通话录音设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(
          new (ComponentName as any)(
            'com.android.phone',
            'com.android.phone.settings.CallRecordingSettingsActivity'
          )
        )
        ;(main as any).startActivity(intent)
      },
      // 方式2: MIUI 通话录音设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(
          new (ComponentName as any)(
            'com.miui.securitycenter',
            'com.miui.permcenter.autostart.AutoStartManagementActivity'
          )
        )
        ;(main as any).startActivity(intent)
      },
      // 方式3: 打开拨号应用设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.APPLICATION_DETAILS_SETTINGS')
        const Uri = plus.android.importClass('android.net.Uri')
        intent.setData((Uri as any).parse('package:com.android.phone'))
        ;(main as any).startActivity(intent)
      },
      // 方式4: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
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
      // 方式1: 华为通话录音设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(
          new (ComponentName as any)(
            'com.huawei.systemmanager',
            'com.huawei.systemmanager.optimize.process.ProtectActivity'
          )
        )
        ;(main as any).startActivity(intent)
      },
      // 方式2: 打开拨号应用
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.intent.action.DIAL')
        ;(main as any).startActivity(intent)
      },
      // 方式3: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
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
   * OPPO/Realme手机开启通话录音
   */
  private enableOppoRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const ComponentName = plus.android.importClass('android.content.ComponentName')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: OPPO 通话录音设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(
          new (ComponentName as any)(
            'com.coloros.phonemanager',
            'com.coloros.phonemanager.record.CallRecordSettingActivity'
          )
        )
        ;(main as any).startActivity(intent)
      },
      // 方式2: 打开拨号应用设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.APPLICATION_DETAILS_SETTINGS')
        const Uri = plus.android.importClass('android.net.Uri')
        intent.setData((Uri as any).parse('package:com.android.dialer'))
        ;(main as any).startActivity(intent)
      },
      // 方式3: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
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
      // 方式1: VIVO 通话录音设置
      () => {
        const intent = new (Intent as any)()
        intent.setComponent(
          new (ComponentName as any)(
            'com.vivo.permissionmanager',
            'com.vivo.permissionmanager.activity.BgStartUpManagerActivity'
          )
        )
        ;(main as any).startActivity(intent)
      },
      // 方式2: 打开拨号应用
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.intent.action.DIAL')
        ;(main as any).startActivity(intent)
      },
      // 方式3: 通用通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
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
   * 通用方法开启通话录音
   */
  private enableGenericRecording(): boolean {
    // #ifdef APP-PLUS
    const Intent = plus.android.importClass('android.content.Intent')
    const main = plus.android.runtimeMainActivity()

    const attempts = [
      // 方式1: 通话设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.CALL_SETTINGS')
        ;(main as any).startActivity(intent)
      },
      // 方式2: 打开拨号应用
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.intent.action.DIAL')
        ;(main as any).startActivity(intent)
      },
      // 方式3: 打开系统设置
      () => {
        const intent = new (Intent as any)()
        intent.setAction('android.settings.SETTINGS')
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
   * 通过多种方式检测：
   * 1. 检查录音文件夹是否存在
   * 2. 检查是否有录音文件
   * 3. 检查是否有最近的录音文件
   */
  async checkRecordingEnabled(): Promise<boolean> {
    // #ifdef APP-PLUS
    try {
      const paths = this.getPriorityPaths()
      const File = plus.android.importClass('java.io.File')

      // 1. 首先检查录音文件夹是否存在
      let folderExists = false
      for (const basePath of paths) {
        try {
          const dir = new (File as any)(basePath)
          if (dir.exists() && dir.isDirectory()) {
            folderExists = true
            console.log('[RecordingService] 找到录音文件夹:', basePath)
            break
          }
        } catch (_e) {
          // 继续检查下一个路径
        }
      }

      if (!folderExists) {
        console.log('[RecordingService] 未找到任何录音文件夹')
        return false
      }

      // 2. 扫描录音文件
      const recordings = await this.scanRecordingFolders()
      console.log('[RecordingService] 扫描到录音文件数量:', recordings.length)

      if (recordings.length === 0) {
        // 文件夹存在但没有录音文件，可能是刚开启或者没有通话过
        // 返回 true 表示可能已开启（文件夹存在）
        console.log('[RecordingService] 录音文件夹存在但无录音文件，可能已开启')
        return true
      }

      // 3. 检查是否有最近7天内的录音
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const recentRecordings = recordings.filter((r) => r.lastModified > sevenDaysAgo)

      if (recentRecordings.length > 0) {
        console.log('[RecordingService] 有最近7天的录音文件:', recentRecordings.length)
        return true
      }

      // 有录音文件但都是7天前的，仍然认为已开启
      console.log('[RecordingService] 有录音文件但都是7天前的')
      return true
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
