/**
 * 多品牌权限引导工具
 *
 * 授权引导链（从最省事到最兜底）：
 * 1. APP内直接授权：runtime permission 弹窗（由调用方先行尝试）
 * 2. 跳转专属权限页：如"所有文件访问"授权页（调用方处理）
 * 3. 跳转品牌权限管理页：本文件 openBrandPermissionManager()
 *    - 小米/红米/POCO（MIUI/HyperOS）：安全中心权限编辑页
 *    - 华为（EMUI/HarmonyOS）：系统管家单应用权限页
 *    - 荣耀（MagicOS）：荣耀系统管家
 *    - OPPO/realme/一加（ColorOS）：安全中心权限页
 *    - vivo/iQOO（OriginOS/FuntouchOS）：i管家权限详情页
 *    - 魅族（Flyme）：手机管家应用安全页
 * 4. 应用详情页兜底：openAppDetailsSettings()
 * 5. 全部失败：按品牌+机型给出手动操作路径文案 getManualPermissionGuide()
 */

export interface DeviceInfo {
  brand: string
  model: string
  sdkInt: number
  manufacturer: string
}

export function getDeviceInfo(): DeviceInfo {
  // #ifdef APP-PLUS
  try {
    const Build = plus.android.importClass('android.os.Build') as any
    return {
      brand: ('' + (Build.BRAND || '')).toLowerCase(),
      model: '' + (Build.MODEL || ''),
      sdkInt: Number(Build.VERSION.SDK_INT || 0),
      manufacturer: ('' + (Build.MANUFACTURER || '')).toLowerCase(),
    }
  } catch (_e) { /* fallthrough */ }
  // #endif
  return { brand: '', model: '', sdkInt: 0, manufacturer: '' }
}

/** 品牌归一化：荣耀新机 BRAND=HONOR 且 MANUFACTURER=HONOR，老荣耀 MANUFACTURER=HUAWEI */
export function normalizeBrand(): string {
  const info = getDeviceInfo()
  const b = info.brand || info.manufacturer
  if (b.includes('xiaomi') || b.includes('redmi') || b.includes('poco') || b.includes('mi ')) return 'xiaomi'
  if (b.includes('honor')) return 'honor'
  if (b.includes('huawei')) return 'huawei'
  if (b.includes('oppo') || b.includes('realme')) return 'oppo'
  if (b.includes('oneplus')) return 'oneplus'
  if (b.includes('vivo') || b.includes('iqoo')) return 'vivo'
  if (b.includes('samsung')) return 'samsung'
  if (b.includes('meizu')) return 'meizu'
  if (b.includes('zte') || b.includes('nubia')) return 'zte'
  if (b.includes('google') || b.includes('pixel')) return 'google'
  if (b.includes('nothing')) return 'nothing'
  if (b.includes('tecno') || b.includes('infinix') || b.includes('itel')) return 'transsion'
  if (b.includes('lenovo') || b.includes('motorola') || b.includes('moto')) return 'lenovo'
  return b || 'unknown'
}

// #ifdef APP-PLUS
/** 尝试用 ComponentName 启动指定 Activity，成功返回 true */
function tryStartComponent(pkg: string, cls: string, extras?: Record<string, string>, action?: string): boolean {
  try {
    const Intent = plus.android.importClass('android.content.Intent') as any
    const ComponentName = plus.android.importClass('android.content.ComponentName') as any
    const main = plus.android.runtimeMainActivity()
    const intent = action ? new Intent(action) : new Intent()
    if (pkg && cls) {
      intent.setComponent(new ComponentName(pkg, cls))
    }
    if (extras) {
      for (const key of Object.keys(extras)) {
        intent.putExtra(key, extras[key])
      }
    }
    intent.addFlags(0x10000000) // FLAG_ACTIVITY_NEW_TASK
    ;(main as any).startActivity(intent)
    return true
  } catch (_e) {
    return false
  }
}
// #endif

/**
 * 跳转应用详情设置页（所有安卓机通用兜底）
 */
export function openAppDetailsSettings(): boolean {
  // #ifdef APP-PLUS
  try {
    const Intent = plus.android.importClass('android.content.Intent') as any
    const Uri = plus.android.importClass('android.net.Uri') as any
    const Settings = plus.android.importClass('android.provider.Settings') as any
    const main = plus.android.runtimeMainActivity()
    const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    intent.setData(Uri.parse('package:' + (main as any).getPackageName()))
    intent.addFlags(0x10000000)
    ;(main as any).startActivity(intent)
    return true
  } catch (e) {
    console.warn('[PermissionGuide] 应用详情页跳转失败:', e)
    return false
  }
  // #endif
  // eslint-disable-next-line no-unreachable
  return false
}

/**
 * 跳转品牌权限管理页（直达本APP的权限列表），失败自动降级到应用详情页
 * @returns true=成功跳转到某个设置页
 */
export function openBrandPermissionManager(): boolean {
  // #ifdef APP-PLUS
  try {
    const main = plus.android.runtimeMainActivity()
    const pkgName = '' + (main as any).getPackageName()
    const brand = normalizeBrand()

    // 每个品牌按新→旧顺序尝试多个入口
    const attemptsByBrand: Record<string, Array<() => boolean>> = {
      xiaomi: [
        // MIUI/HyperOS 权限编辑页（标准入口，MIUI 8+ 通用）
        () => tryStartComponent(
          'com.miui.securitycenter',
          'com.miui.permcenter.permissions.PermissionsEditorActivity',
          { extra_pkgname: pkgName },
          'miui.intent.action.APP_PERM_EDITOR'
        ),
        () => tryStartComponent(
          'com.miui.securitycenter',
          'com.miui.permcenter.permissions.AppPermissionsEditorActivity',
          { extra_pkgname: pkgName },
          'miui.intent.action.APP_PERM_EDITOR'
        ),
      ],
      huawei: [
        // 华为系统管家单应用权限页
        () => tryStartComponent(
          'com.huawei.systemmanager',
          'com.huawei.permissionmanager.ui.SingleAppActivity',
          { packageName: pkgName }
        ),
        () => tryStartComponent('com.huawei.systemmanager', 'com.huawei.systemmanager.mainscreen.MainScreenActivity'),
      ],
      honor: [
        // 荣耀新机（MagicOS）独立包名
        () => tryStartComponent(
          'com.hihonor.systemmanager',
          'com.hihonor.permissionmanager.ui.SingleAppActivity',
          { packageName: pkgName }
        ),
        // 老荣耀沿用华为系统管家
        () => tryStartComponent(
          'com.huawei.systemmanager',
          'com.huawei.permissionmanager.ui.SingleAppActivity',
          { packageName: pkgName }
        ),
      ],
      oppo: [
        // ColorOS 新版安全中心（oplus）
        () => tryStartComponent(
          'com.oplus.safecenter',
          'com.oplus.safecenter.permission.singlepage.PermissionSinglePageActivity',
          { packageName: pkgName }
        ),
        // ColorOS 旧版安全中心
        () => tryStartComponent(
          'com.coloros.safecenter',
          'com.coloros.safecenter.permission.singlepage.PermissionSinglePageActivity',
          { packageName: pkgName }
        ),
        () => tryStartComponent(
          'com.coloros.securitypermission',
          'com.coloros.securitypermission.permission.PermissionAppAllPermissionActivity',
          { packageName: pkgName }
        ),
      ],
      oneplus: [
        // 一加已并入 ColorOS
        () => tryStartComponent(
          'com.oplus.safecenter',
          'com.oplus.safecenter.permission.singlepage.PermissionSinglePageActivity',
          { packageName: pkgName }
        ),
        () => tryStartComponent(
          'com.coloros.safecenter',
          'com.coloros.safecenter.permission.singlepage.PermissionSinglePageActivity',
          { packageName: pkgName }
        ),
      ],
      vivo: [
        // vivo i管家应用权限详情页
        () => tryStartComponent(
          'com.vivo.permissionmanager',
          'com.vivo.permissionmanager.activity.SoftPermissionDetailActivity',
          { packagename: pkgName }
        ),
        () => tryStartComponent(
          'com.iqoo.secure',
          'com.iqoo.secure.safeguard.SoftPermissionDetailActivity',
          { packagename: pkgName }
        ),
      ],
      meizu: [
        // Flyme 手机管家应用安全页
        () => tryStartComponent(
          'com.meizu.safe',
          'com.meizu.safe.security.AppSecActivity',
          { packageName: pkgName },
          'com.meizu.safe.security.SHOW_APPSEC'
        ),
      ],
    }

    const attempts = attemptsByBrand[brand] || []
    for (const attempt of attempts) {
      if (attempt()) {
        console.log('[PermissionGuide] 已跳转品牌权限管理页, brand=' + brand)
        return true
      }
    }
  } catch (e) {
    console.warn('[PermissionGuide] 品牌权限页跳转异常:', e)
  }
  // 三星/谷歌/Nothing/传音等没有独立权限管理入口，或品牌入口全部失败 → 应用详情页
  return openAppDetailsSettings()
  // #endif
  // eslint-disable-next-line no-unreachable
  return false
}

export type PermissionKind = 'calllog' | 'storage' | 'recording'

/**
 * 按品牌+机型生成手动操作路径文案（跳转失败时的最终兜底引导）
 */
export function getManualPermissionGuide(kind: PermissionKind): string {
  const info = getDeviceInfo()
  const brand = normalizeBrand()
  const modelLine = info.model ? `检测到您的机型：${info.model}\n\n` : ''

  if (kind === 'calllog') {
    const byBrand: Record<string, string> = {
      xiaomi: '📍 设置 → 应用设置 → 应用管理 → 云客CRM → 权限管理 → 通话记录 → 始终允许',
      huawei: '📍 设置 → 应用和服务 → 应用管理 → 云客CRM → 权限 → 通话记录 → 仅允许',
      honor: '📍 设置 → 应用和服务 → 应用管理 → 云客CRM → 权限 → 通话记录 → 始终允许（不要选"每次询问"）',
      oppo: '📍 设置 → 应用管理 → 应用列表 → 云客CRM → 权限 → 通话记录 → 允许',
      oneplus: '📍 设置 → 应用 → 应用管理 → 云客CRM → 权限 → 通话记录 → 允许',
      vivo: '📍 设置 → 应用与权限 → 权限管理 → 通话记录 → 云客CRM → 允许',
      samsung: '📍 设置 → 应用程序 → 云客CRM → 权限 → 通话记录 → 允许',
      meizu: '📍 手机管家 → 权限管理 → 应用管理 → 云客CRM → 通话记录 → 允许',
      google: '📍 Settings → Apps → 云客CRM → Permissions → Call logs → Allow',
    }
    const path = byBrand[brand] || '📍 设置 → 应用管理 → 云客CRM → 权限 → 通话记录 → 允许（始终允许）'
    return `${modelLine}请手动开启"通话记录"权限：\n\n${path}\n\n💡 部分机型还需在权限管理中把"读取通话记录"设为"始终允许"而不是"每次询问"`
  }

  if (kind === 'storage') {
    const byBrand: Record<string, string> = {
      xiaomi: '📍 设置 → 应用设置 → 应用管理 → 云客CRM → 权限管理 → 存储/所有文件访问 → 允许管理所有文件',
      huawei: '📍 设置 → 应用和服务 → 应用管理 → 云客CRM → 权限 → 文件和媒体 → 允许',
      honor: '📍 设置 → 应用和服务 → 应用管理 → 云客CRM → 权限 → 文件和媒体 → 允许',
      oppo: '📍 设置 → 应用管理 → 应用列表 → 云客CRM → 权限 → 文件和媒体（所有文件） → 允许管理所有文件',
      oneplus: '📍 设置 → 应用 → 应用管理 → 云客CRM → 权限 → 文件和媒体 → 允许管理所有文件',
      vivo: '📍 设置 → 应用与权限 → 权限管理 → 存储 → 云客CRM → 允许',
      samsung: '📍 设置 → 应用程序 → 云客CRM → 权限 → 存储空间 → 允许',
      meizu: '📍 手机管家 → 权限管理 → 云客CRM → 存储 → 允许',
    }
    const path = byBrand[brand] || '📍 设置 → 应用管理 → 云客CRM → 权限 → 存储/文件和媒体 → 允许（有"允许管理所有文件"选项的请开启）'
    return `${modelLine}请手动开启"存储/所有文件访问"权限（用于扫描通话录音）：\n\n${path}`
  }

  // recording：开启系统通话自动录音的路径（tryEnableSystemRecording 已有更详细的文案，这里给简版）
  const byBrand: Record<string, string> = {
    xiaomi: '📍 电话APP → 右上角⚙️设置 → 通话录音 → 自动录音 → 开启',
    huawei: '📍 电话APP → 右上角⋮ → 设置 → 通话自动录音 → 开启',
    honor: '📍 电话APP → 右上角⋮ → 设置 → 通话自动录音 → 开启',
    oppo: '📍 电话APP → 右上角⚙️ → 通话录音 → 自动录音 → 开启',
    oneplus: '📍 电话APP → 右上角⚙️ → 通话录音 → 自动录音 → 开启',
    vivo: '📍 电话APP → 左上角☰ → 设置 → 通话录音 → 自动录音 → 开启',
    samsung: '📍 电话APP → 右上角⋮ → 设置 → 录音通话 → 自动录音通话 → 开启',
    meizu: '📍 电话APP → 设置 → 通话录音 → 自动录音 → 开启',
  }
  const path = byBrand[brand] || '📍 电话APP → 设置（⚙️或⋮） → 通话录音 → 自动录音 → 开启\n📍 或在系统"设置"中搜索"通话录音"'
  return `${modelLine}请开启系统通话自动录音：\n\n${path}`
}
