/**
 * 授权心跳检测服务
 * 定期检查租户授权状态，确保授权有效
 * SaaS模式：调用 /tenant-license/heartbeat
 * 私有部署：调用 /license/status 检查授权过期和即将到期预警
 */
import { checkLicenseHeartbeat, needLicenseVerification, clearLocalTenantInfo, getDeployMode } from '@/api/tenantLicense'
import { ElMessageBox, ElNotification } from 'element-plus'
import request from '@/utils/request'
import { getMemberCenterLoginUrl, getMemberCenterRenewUrl } from '@/utils/memberCenterUrl'

class LicenseHeartbeatService {
  private intervalId: NodeJS.Timeout | null = null
  private checkInterval = 5 * 60 * 1000 // 5分钟检测一次
  private isChecking = false
  private nearExpiryNotified = false // 避免重复提示即将到期

  /**
   * 启动心跳检测
   */
  start() {
    if (!needLicenseVerification()) {
      console.log('[License] 无需授权验证，跳过心跳检测')
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
      this.nearExpiryNotified = false
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
      const deployMode = getDeployMode()

      if (deployMode === 'private') {
        // 私有部署模式：检查 system_license 状态
        await this.checkPrivateLicense()
      } else {
        // SaaS模式：调用租户心跳
        const result = await checkLicenseHeartbeat()
        if (!result) {
          // 响应为空（网络异常或响应格式不匹配），静默跳过
          console.log('[License] 心跳响应为空，跳过本次检测')
        } else if (result.valid === false) {
          // 仅在后端明确返回 valid:false 时才提示授权失效
          console.warn('[License] 授权验证失败:', result.message)
          this.handleInvalidLicense(result.message || '授权已失效')
        } else {
          // SaaS模式：即将到期预警（剩余有效期 ≤ 总有效期20%）
          if (result.nearExpiry && result.daysUntilExpiry != null && !this.nearExpiryNotified) {
            this.nearExpiryNotified = true
            const memberUrl = getMemberCenterRenewUrl() || getMemberCenterLoginUrl()
            const renewHtml = memberUrl
              ? `<br/><a href="${memberUrl}" target="_blank" style="color:#409eff;text-decoration:underline;font-weight:600;">🔑 去会员中心续费</a>`
              : ''
            const contactHtml = `<br/><a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))" style="color:#67c23a;text-decoration:underline;font-weight:600;">💬 联系客服续费</a>`
            ElNotification({
              title: '套餐即将到期',
              message: `您的套餐将在 ${result.daysUntilExpiry} 天后到期（${result.expireDate ? new Date(result.expireDate).toLocaleDateString() : ''}），到期后系统将进入只读模式。请及时续费。${renewHtml}${contactHtml}`,
              dangerouslyUseHTMLString: true,
              type: 'warning',
              duration: 15000,
              position: 'top-right'
            })
          }
        }
      }
    } catch (error) {
      console.error('[License] 心跳检测失败:', error)
      // 网络错误不阻断用户，只记录日志
    } finally {
      this.isChecking = false
    }
  }

  /**
   * 私有部署授权检测
   */
  private async checkPrivateLicense() {
    try {
      const res = await request.get('/license/status') as any
      if (!res) return

      // 授权已过期
      if (res.expired) {
        this.handleExpiredLicense(res.expiresAt)
        return
      }

      // 即将到期预警（30天内）
      if (res.nearExpiry && res.daysUntilExpiry != null && !this.nearExpiryNotified) {
        this.nearExpiryNotified = true
        // 获取会员中心URL
        const memberUrl = getMemberCenterRenewUrl() || getMemberCenterLoginUrl()
        const renewHtml = memberUrl
          ? `<br/><a href="${memberUrl}" target="_blank" style="color:#409eff;text-decoration:underline;font-weight:600;">🔑 去会员中心续费</a>`
          : ''
        const contactHtml = `<br/><a href="javascript:void(0)" onclick="window.dispatchEvent(new CustomEvent('open-contact-service-dialog'))" style="color:#67c23a;text-decoration:underline;font-weight:600;">💬 联系客服续费</a>`
        ElNotification({
          title: '授权即将到期',
          message: `系统授权将在 ${res.daysUntilExpiry} 天后到期（${res.expiresAt ? new Date(res.expiresAt).toLocaleDateString() : ''}），到期后将无法新增数据。请及时续费。${renewHtml}${contactHtml}`,
          dangerouslyUseHTMLString: true,
          type: 'warning',
          duration: 15000,
          position: 'top-right'
        })
      }
    } catch (error) {
      console.error('[License] 私有部署授权检测失败:', error)
    }
  }

  /**
   * 处理授权过期（私有部署）
   */
  private handleExpiredLicense(expiresAt?: string) {
    const expireText = expiresAt ? `（过期时间：${new Date(expiresAt).toLocaleDateString()}）` : ''
    import('@/utils/licenseDialog').then(({ showLicenseExpiredDialog }) => {
      showLicenseExpiredDialog({
        message: `系统授权已过期${expireText}，当前处于只读模式：\n\n` +
          '• 可以正常登录和查看数据\n' +
          '• 无法新增客户、订单、用户等\n' +
          '• 无法修改或删除现有数据\n\n' +
          '请前往会员中心续费或联系客服续费，续费后点击"同步授权信息"立即恢复正常使用。',
        title: '⚠️ 系统授权已过期',
        deployMode: 'private'
      })
    })
  }

  /**
   * 处理授权失效（SaaS模式）
   */
  private handleInvalidLicense(message: string) {
    // 判断是否为到期失效（包含"过期"关键字）
    const isExpired = message.includes('过期')

    if (isExpired) {
      // 到期情况：显示带续费入口的弹窗
      import('@/utils/licenseDialog').then(({ showLicenseExpiredDialog }) => {
        showLicenseExpiredDialog({
          message: `${message}\n\n当前处于只读模式，无法新增、修改或删除数据。\n\n请前往会员中心续费或联系客服续费，续费完成后系统将自动恢复正常使用。`,
          title: '⚠️ 授权已过期',
          deployMode: 'saas'
        })
      })
    } else {
      // 非到期情况（如禁用、暂停）：保留原有逻辑
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
