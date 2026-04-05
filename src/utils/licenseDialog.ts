/**
 * 授权过期弹窗工具
 * 显示包含"同步授权信息"和"我知道了"两个按钮的弹窗
 * 用户续费后可直接点击同步按钮恢复系统使用
 */
import { ElMessage, ElMessageBox } from 'element-plus'

let isShowingLicenseDialog = false

/**
 * 显示授权过期弹窗
 * - 「已续费，同步授权信息」按钮：调用 /license/sync 并刷新页面
 * - 「我知道了」按钮：关闭弹窗
 */
export async function showLicenseExpiredDialog(options?: {
  message?: string
  title?: string
}) {
  if (isShowingLicenseDialog) return
  isShowingLicenseDialog = true

  const message = options?.message ||
    '系统授权已过期，当前处于只读模式，无法新增、修改或删除数据。\n\n请联系管理员续费授权，续费后点击"同步授权信息"立即恢复正常使用。'
  const title = options?.title || '⚠️ 授权已过期'

  try {
    await ElMessageBox.confirm(message, title, {
      confirmButtonText: '已续费，同步授权信息',
      cancelButtonText: '我知道了',
      type: 'warning',
      showClose: true,
      closeOnClickModal: true,
      distinguishCancelAndClose: true
    })

    // 用户点击了「已续费，同步授权信息」
    await syncLicenseInfo()
  } catch {
    // 用户点击了「我知道了」或关闭弹窗，不做任何操作
  } finally {
    isShowingLicenseDialog = false
  }
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

