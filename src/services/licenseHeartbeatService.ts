/**
 * 授权心跳检测服务
 * 定期检查租户授权状态，确保授权有效
 */
import { checkLicenseHeartbeat, needLicenseVerification, clearLocalTenantInfo } from '@/api/tenantLicense'
import { ElMessageBox } from 'element-plus'

class LicenseHeartbeatService {
  private intervalId: NodeJS.Timeout | null = null
  private checkInterval = 5 * 60 * 1000 // 5分钟检测一次
  private isChecking = false

  /**
   * 启动心跳检测
   */
  start() {
    // 私有部署模式不需要心跳检测
    if (!needLicenseVerification()) {
      console.log('[License] 私有部署模式，跳过心跳检测')
      return
    }

    if (this.intervalId) {
      return // 已经在运行
    }

    console.log('[License] 启动授权心跳检测服务')

    // 立即执行一次检测
    this.check()

    // 定期检测
    this.intervalId = setInterval(() => {
      this.check()
    }, this.checkInterval)
  }

  /**
   * 停止心跳检测
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('[License] 停止授权心跳检测服务')
    }
  }

  /**
   * 执行一次检测
   */
  async check() {
    if (this.isChecking) return

    this.isChecking = true

    try {
      const result = await checkLicenseHeartbeat()

      if (!result.valid) {
        console.warn('[License] 授权验证失败:', result.message)
        this.handleInvalidLicense(result.message || '授权已失效')
      }
    } catch (error) {
      console.error('[License] 心跳检测失败:', error)
      // 网络错误不阻断用户，只记录日志
    } finally {
      this.isChecking = false
    }
  }

  /**
   * 处理授权失效
   */
  private handleInvalidLicense(message: string) {
    // 清除本地租户信息
    clearLocalTenantInfo()

    // 显示提示并跳转到登录页
    ElMessageBox.alert(message, '授权提示', {
      confirmButtonText: '重新验证',
      type: 'warning',
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false
    }).then(() => {
      // 跳转到登录页
      window.location.href = '/login'
    })
  }

  /**
   * 设置检测间隔
   */
  setInterval(ms: number) {
    this.checkInterval = ms

    // 如果正在运行，重启以应用新间隔
    if (this.intervalId) {
      this.stop()
      this.start()
    }
  }
}

export const licenseHeartbeatService = new LicenseHeartbeatService()
