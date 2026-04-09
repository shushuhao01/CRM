/**
 * 授权过期弹窗工具
 * 显示包含"去会员中心续费"、"联系客服"、"同步授权信息"和"我知道了"的弹窗
 * 支持 SaaS 和私有部署两种模式
 */
import { ElMessage, ElMessageBox } from 'element-plus'

let isShowingLicenseDialog = false

/**
 * 获取会员中心续费URL
 * 从 localStorage 读取系统配置中的 websiteUrl，拼接会员登录路径
 */
function getMemberCenterUrl(): string {
  try {
    const configData = localStorage.getItem('crm_config_system')
    if (configData) {
      const config = JSON.parse(configData)
      const websiteUrl = config?.websiteUrl
      if (websiteUrl) {
        return websiteUrl.replace(/\/+$/, '') + '/member/login'
      }
    }
  } catch {
    // 静默处理
  }
  return ''
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
  const memberUrl = getMemberCenterUrl()
  const isSaaS = options.deployMode === 'saas'

  const messageText = options.message ||
    '系统授权已过期，当前处于只读模式，无法新增、修改或删除数据。'

  // 构建操作按钮区域
  let actionButtonsHtml = ''

  // "去会员中心续费"按钮
  if (memberUrl) {
    actionButtonsHtml += `<a href="${memberUrl}" target="_blank" rel="noopener noreferrer"
      style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#409eff,#337ecc);color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;transition:all 0.3s;box-shadow:0 2px 8px rgba(64,158,255,0.3);"
      onmouseover="this.style.background='linear-gradient(135deg,#337ecc,#2a6db5)';this.style.boxShadow='0 4px 12px rgba(64,158,255,0.4)'"
      onmouseout="this.style.background='linear-gradient(135deg,#409eff,#337ecc)';this.style.boxShadow='0 2px 8px rgba(64,158,255,0.3)'"
      >🔑 去会员中心续费</a>`
  }

  // "联系客服续费"按钮 — 通过 onclick 触发自定义事件打开客服弹窗
  actionButtonsHtml += `<a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))"
    style="display:inline-flex;align-items:center;gap:6px;padding:10px 20px;background:linear-gradient(135deg,#67c23a,#529b2e);color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.3s;box-shadow:0 2px 8px rgba(103,194,58,0.3);"
    onmouseover="this.style.background='linear-gradient(135deg,#529b2e,#3e7c23)';this.style.boxShadow='0 4px 12px rgba(103,194,58,0.4)'"
    onmouseout="this.style.background='linear-gradient(135deg,#67c23a,#529b2e)';this.style.boxShadow='0 2px 8px rgba(103,194,58,0.3)'"
    >💬 联系客服续费</a>`

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

