/**
 * 授权过期 / 资源配额超限弹窗工具
 * 显示包含"去会员中心续费"、"联系客服"、"同步授权信息"和"我知道了"的弹窗
 * 支持 SaaS 和私有部署两种模式
 */
import { ElMessage, ElMessageBox } from 'element-plus'
import { getMemberCenterLoginUrl, getMemberCenterRenewUrl } from '@/utils/memberCenterUrl'

let isShowingLicenseDialog = false
let isShowingQuotaDialog = false
let cssInjected = false

/** 动态注入弹窗按钮样式（只注入一次） */
function injectDialogStyles() {
  if (cssInjected) return
  cssInjected = true
  const style = document.createElement('style')
  style.textContent = `
.ld-action-btn{display:inline-flex;align-items:center;gap:4px;padding:8px 18px;border-radius:8px;text-decoration:none!important;font-size:13px;font-weight:500;cursor:pointer;transition:all .25s ease;line-height:1.5;white-space:nowrap;border:1.5px solid transparent;background:none}
.ld-btn-primary{color:#409eff;background:#ecf5ff;border-color:#b3d8ff}
.ld-btn-primary:hover{color:#fff;background:#409eff;border-color:#409eff;box-shadow:0 2px 10px rgba(64,158,255,.25)}
.ld-btn-outline{color:#67c23a;background:#f0f9eb;border-color:#c2e7b0}
.ld-btn-outline:hover{color:#fff;background:#67c23a;border-color:#67c23a;box-shadow:0 2px 10px rgba(103,194,58,.25)}
.license-expired-dialog .el-message-box__message{max-height:60vh;overflow-y:auto}
`
  document.head.appendChild(style)
}


/**
 * 触发打开联系客服弹窗（导出供外部调用）
 * 通过自定义事件通知 App.vue 打开 ContactServiceDialog
 */
export function openContactServiceDialog(): void {
  window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))
}

/**
 * 构建弹窗HTML内容
 */
function buildDialogHtml(options: {
  message?: string
  deployMode?: 'private' | 'saas'
}): string {
  const memberUrl = getMemberCenterRenewUrl() || getMemberCenterLoginUrl()
  const isSaaS = options.deployMode === 'saas'

  const messageText = options.message ||
    '系统授权已过期，当前处于只读模式，无法新增、修改或删除数据。'

  // 构建操作按钮区域
  let actionButtonsHtml = ''

  // "去会员中心续费"按钮 — 简约浅色风格，外部新窗口打开
  if (memberUrl) {
    actionButtonsHtml += `<a href="${memberUrl}" target="_blank" rel="noopener noreferrer" class="ld-action-btn ld-btn-primary">🔑 去会员中心续费</a>`
  }

  // "联系客服续费"按钮 — 通过 onclick 触发自定义事件打开客服弹窗
  actionButtonsHtml += `<a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))" class="ld-action-btn ld-btn-outline">💬 联系客服续费</a>`

  // 消息文本 - 将 \n 转换为 <br>
  const formattedMsg = messageText.replace(/\n/g, '<br>')

  let html = `<div style="line-height:1.8;font-size:14px;color:#606266;">
    <div style="margin-bottom:12px;">${formattedMsg}</div>`

  // 操作按钮区域
  if (actionButtonsHtml) {
    html += `<div style="margin:16px 0;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">${actionButtonsHtml}</div>`
  }


  // 提示文字
  if (!isSaaS) {
    html += `<div style="margin-top:12px;padding:10px 14px;background:#f0f9eb;border-radius:6px;font-size:13px;color:#67c23a;border:1px solid #e1f3d8;">💡 续费完成后，点击下方「已续费，同步授权信息」按钮即可恢复系统正常使用。</div>`
  } else {
    html += `<div style="margin-top:12px;padding:10px 14px;background:#ecf5ff;border-radius:6px;font-size:13px;color:#409eff;border:1px solid #d9ecff;">💡 在会员中心完成续费后，系统将自动恢复正常使用。</div>`
  }

  html += `</div>`

  return html
}

/**
 * 显示授权过期弹窗
 * - SaaS模式：显示"去会员中心续费"+"联系客服"+"我知道了"
 * - 私有部署：显示"去会员中心续费"+"联系客服"+"已续费，同步授权信息"+"我知道了"
 */
export async function showLicenseExpiredDialog(options?: {
  message?: string
  title?: string
  deployMode?: 'private' | 'saas'
}) {
  if (isShowingLicenseDialog) return
  isShowingLicenseDialog = true
  injectDialogStyles()

  const deployMode = options?.deployMode || getStoredDeployMode()
  const isSaaS = deployMode === 'saas'
  const title = options?.title || '⚠️ 授权已过期'

  const htmlContent = buildDialogHtml({
    message: options?.message,
    deployMode
  })

  try {
    if (isSaaS) {
      // SaaS模式：不需要"同步授权信息"按钮
      await ElMessageBox.alert(htmlContent, title, {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了',
        type: 'warning',
        showClose: true,
        closeOnClickModal: true,
        customClass: 'license-expired-dialog'
      })
    } else {
      // 私有部署模式：保留"同步授权信息"按钮
      await ElMessageBox.confirm(htmlContent, title, {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '已续费，同步授权信息',
        cancelButtonText: '我知道了',
        type: 'warning',
        showClose: true,
        closeOnClickModal: true,
        distinguishCancelAndClose: true,
        customClass: 'license-expired-dialog'
      })

      // 用户点击了「已续费，同步授权信息」
      await syncLicenseInfo()
    }
  } catch {
    // 用户点击了「我知道了」或关闭弹窗，不做任何操作
  } finally {
    isShowingLicenseDialog = false
  }
}

/**
 * 获取存储的部署模式
 */
function getStoredDeployMode(): 'private' | 'saas' {
  try {
    const stored = localStorage.getItem('crm_deploy_mode') as 'private' | 'saas' | null
    if (stored === 'private' || stored === 'saas') return stored
  } catch {
    // 静默处理
  }
  return 'saas'
}

/**
 * 调用 /license/sync 同步授权信息
 */
async function syncLicenseInfo() {
  try {
    // 动态导入 request 避免循环依赖
    const service = (await import('@/utils/request')).default
    const res = await service.post('/license/sync') as any

    const msg = res?.message || '授权信息已同步，系统功能已恢复'
    ElMessage.success(msg)

    // 同步成功后刷新页面，清除所有缓存的过期状态
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  } catch (error: any) {
    ElMessage.error(error?.message || '同步失败，请检查网络连接或联系管理员')
  }
}

/**
 * 构建资源配额超限弹窗HTML内容
 */
function buildQuotaExceededHtml(options: {
  type: 'user' | 'storage'
  message: string
  data?: {
    currentCount?: number
    maxUsers?: number
    usagePercent?: number
    requiredMb?: number
    usedMb?: number
    maxMb?: number
    availableMb?: number
  }
  deployMode?: 'private' | 'saas'
}): string {
  const memberUrl = getMemberCenterLoginUrl()
  const isSaaS = options.deployMode === 'saas'
  const isUserLimit = options.type === 'user'

  // 图标和标题
  const icon = isUserLimit ? '👥' : '💾'
  const typeLabel = isUserLimit ? '用户数' : '存储空间'

  // 使用情况统计
  let usageHtml = ''
  if (options.data) {
    if (isUserLimit && options.data.currentCount !== undefined && options.data.maxUsers !== undefined) {
      const percent = options.data.usagePercent || Math.round((options.data.currentCount / options.data.maxUsers) * 100)
      usageHtml = `
        <div style="margin:12px 0;padding:14px;background:#fff3f3;border-radius:8px;border:1px solid #fde2e2;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;color:#f56c6c;font-weight:600;">${icon} ${typeLabel}使用情况</span>
            <span style="font-size:13px;color:#f56c6c;font-weight:700;">${options.data.currentCount} / ${options.data.maxUsers}</span>
          </div>
          <div style="width:100%;height:8px;background:#fde2e2;border-radius:4px;overflow:hidden;">
            <div style="width:${Math.min(percent, 100)}%;height:100%;background:linear-gradient(90deg,#f56c6c,#e6322e);border-radius:4px;"></div>
          </div>
          <div style="text-align:right;font-size:12px;color:#f56c6c;margin-top:4px;">已用 ${percent}%</div>
        </div>`
    } else if (!isUserLimit && options.data.usedMb !== undefined && options.data.maxMb !== undefined) {
      const usedGb = (options.data.usedMb / 1024).toFixed(2)
      const maxGb = (options.data.maxMb / 1024).toFixed(1)
      const percent = options.data.usagePercent || Math.round((options.data.usedMb / options.data.maxMb) * 100)
      usageHtml = `
        <div style="margin:12px 0;padding:14px;background:#fff3f3;border-radius:8px;border:1px solid #fde2e2;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="font-size:13px;color:#f56c6c;font-weight:600;">${icon} ${typeLabel}使用情况</span>
            <span style="font-size:13px;color:#f56c6c;font-weight:700;">${usedGb}GB / ${maxGb}GB</span>
          </div>
          <div style="width:100%;height:8px;background:#fde2e2;border-radius:4px;overflow:hidden;">
            <div style="width:${Math.min(percent, 100)}%;height:100%;background:linear-gradient(90deg,#f56c6c,#e6322e);border-radius:4px;"></div>
          </div>
          <div style="text-align:right;font-size:12px;color:#f56c6c;margin-top:4px;">已用 ${percent}%</div>
        </div>`
    }
  }

  // 操作按钮
  let actionButtonsHtml = ''

  // "去会员中心升级"按钮 — 简约浅色风格
  const renewUrl = getMemberCenterRenewUrl() || memberUrl
  if (renewUrl) {
    actionButtonsHtml += `<a href="${renewUrl}" target="_blank" rel="noopener noreferrer" class="ld-action-btn ld-btn-primary">🚀 去会员中心升级套餐</a>`
  }

  // "联系客服"按钮 — 简约描边风格
  actionButtonsHtml += `<a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))" class="ld-action-btn ld-btn-outline">💬 联系客服扩容</a>`

  // 主消息
  const formattedMsg = options.message.replace(/\n/g, '<br>')

  let html = `<div style="line-height:1.8;font-size:14px;color:#606266;">
    <div style="margin-bottom:8px;">${formattedMsg}</div>`

  // 使用情况
  html += usageHtml

  // 操作建议
  if (isUserLimit) {
    html += `<div style="margin:10px 0;padding:10px 14px;background:#fdf6ec;border-radius:6px;font-size:13px;color:#e6a23c;border:1px solid #faecd8;">
      💡 <strong>解决方式：</strong><br>
      1. 升级到更高套餐以获得更多用户名额<br>
      2. 删除不再使用的用户释放名额<br>
      3. 联系客服单独购买用户扩容包</div>`
  } else {
    html += `<div style="margin:10px 0;padding:10px 14px;background:#fdf6ec;border-radius:6px;font-size:13px;color:#e6a23c;border:1px solid #faecd8;">
      💡 <strong>解决方式：</strong><br>
      1. 升级到更高套餐以获得更多存储空间<br>
      2. 清理不必要的文件附件释放空间<br>
      3. 联系客服单独购买存储扩容包</div>`
  }

  // 操作按钮
  if (actionButtonsHtml) {
    html += `<div style="margin:16px 0 8px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">${actionButtonsHtml}</div>`
  }

  // 私有部署提示同步
  if (!isSaaS) {
    html += `<div style="margin-top:8px;padding:10px 14px;background:#f0f9eb;border-radius:6px;font-size:13px;color:#67c23a;border:1px solid #e1f3d8;">🔄 如果已在会员中心完成升级，请点击下方「已升级，同步授权信息」按钮使配额立即生效。</div>`
  }

  html += `</div>`

  return html
}

/**
 * 显示资源配额超限弹窗（用户数 / 存储空间）
 * - SaaS模式：显示"去会员中心升级"+"联系客服"+"我知道了"
 * - 私有部署：显示"去会员中心升级"+"联系客服"+"已升级，同步授权信息"+"我知道了"
 */
export async function showQuotaExceededDialog(options: {
  type: 'user' | 'storage'
  message: string
  data?: any
}) {
  if (isShowingQuotaDialog) return
  isShowingQuotaDialog = true
  injectDialogStyles()

  const deployMode = getStoredDeployMode()
  const isSaaS = deployMode === 'saas'
  const isUserLimit = options.type === 'user'
  const title = isUserLimit ? '⚠️ 用户数已达上限' : '⚠️ 存储空间不足'

  const htmlContent = buildQuotaExceededHtml({
    type: options.type,
    message: options.message,
    data: options.data,
    deployMode
  })

  try {
    if (isSaaS) {
      await ElMessageBox.alert(htmlContent, title, {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '我知道了',
        type: 'warning',
        showClose: true,
        closeOnClickModal: true,
        customClass: 'license-expired-dialog quota-exceeded-dialog'
      })
    } else {
      await ElMessageBox.confirm(htmlContent, title, {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '已升级，同步授权信息',
        cancelButtonText: '我知道了',
        type: 'warning',
        showClose: true,
        closeOnClickModal: true,
        distinguishCancelAndClose: true,
        customClass: 'license-expired-dialog quota-exceeded-dialog'
      })

      // 用户点击了「已升级，同步授权信息」
      await syncLicenseInfo()
    }
  } catch {
    // 用户点击了「我知道了」或关闭弹窗
  } finally {
    isShowingQuotaDialog = false
  }
}

