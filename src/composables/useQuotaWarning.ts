import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { getResourceUsage, type ResourceUsage } from '@/api/tenantLicense'

/**
 * 租户资源配额预警组合式函数
 * 从 App.vue 拆分，包含资源使用量检测、预警横幅显示、升级套餐弹窗等逻辑
 */
export function useQuotaWarning() {
  const userStore = useUserStore()

  // 🔥 租户资源配额预警
  const quotaWarningDismissed = ref(false)
  const resourceUsage = ref<ResourceUsage | null>(null)
  let quotaCheckTimer: ReturnType<typeof setInterval> | null = null

  // 配额预警计算属性
  const quotaWarning = computed(() => {
    if (quotaWarningDismissed.value) return null
    const usage = resourceUsage.value
    if (!usage) return null

    const warnings: string[] = []
    let level: 'warning' | 'critical' = 'warning'

    // 检查用户数
    const userPercent = usage.users.usagePercent
    if (userPercent >= 100) {
      warnings.push(`用户数已达上限（${usage.users.current}/${usage.users.max}）`)
      level = 'critical'
    } else if (userPercent >= 90) {
      warnings.push(`用户数已使用${userPercent}%（${usage.users.current}/${usage.users.max}）`)
      level = 'critical'
    } else if (userPercent >= 80) {
      warnings.push(`用户数已使用${userPercent}%（${usage.users.current}/${usage.users.max}）`)
    }

    // 检查存储空间
    const storagePercent = usage.storage.usagePercent
    if (storagePercent >= 100) {
      warnings.push(`存储空间已满（${usage.storage.usedGb}GB/${usage.storage.maxGb}GB）`)
      level = 'critical'
    } else if (storagePercent >= 90) {
      warnings.push(`存储空间已使用${storagePercent}%（${usage.storage.usedGb}GB/${usage.storage.maxGb}GB）`)
      if (level !== 'critical') level = 'critical'
    } else if (storagePercent >= 80) {
      warnings.push(`存储空间已使用${storagePercent}%（${usage.storage.usedGb}GB/${usage.storage.maxGb}GB）`)
    }

    if (warnings.length === 0) return null

    const suffix = level === 'critical' ? '请联系管理员扩容！' : '请关注资源使用情况。'
    return {
      level,
      message: `⚠️ ${warnings.join('；')}。${suffix}`
    }
  })

  // 获取资源使用情况
  const fetchResourceUsage = async () => {
    try {
      const data = await getResourceUsage()
      if (data) {
        resourceUsage.value = data
        // 当预警级别变化时重置dismissed状态
        quotaWarningDismissed.value = false
      }
    } catch {
      // 静默失败
    }
  }

  // 启动配额检测定时器（每5分钟检测一次）
  const startQuotaCheckTimer = (isLoginPage: { value: boolean }) => {
    // 延迟3秒首次执行，避免登录时大量并发请求
    setTimeout(() => {
      fetchResourceUsage()
    }, 3000)
    quotaCheckTimer = setInterval(() => {
      if (userStore.token && !isLoginPage.value) {
        fetchResourceUsage()
      }
    }, 5 * 60 * 1000)
  }

  // 停止配额检测定时器
  const stopQuotaCheckTimer = () => {
    if (quotaCheckTimer) {
      clearInterval(quotaCheckTimer)
      quotaCheckTimer = null
    }
  }

  // 🔥 配额预警横幅"升级套餐"按钮
  const handleQuotaUpgrade = () => {
    const usage = resourceUsage.value
    if (!usage) return

    // 判断是用户数超限还是存储空间超限
    const userPercent = usage.users.usagePercent
    const storagePercent = usage.storage.usagePercent

    if (userPercent >= 100) {
      import('@/utils/licenseDialog').then(({ showQuotaExceededDialog }) => {
        showQuotaExceededDialog({
          type: 'user',
          message: `用户数已达上限（${usage.users.current}/${usage.users.max}），无法创建新用户。\n请升级套餐或联系客服扩容以继续使用。`,
          data: {
            currentCount: usage.users.current,
            maxUsers: usage.users.max,
            usagePercent: userPercent
          }
        })
      })
    } else if (storagePercent >= 100) {
      import('@/utils/licenseDialog').then(({ showQuotaExceededDialog }) => {
        showQuotaExceededDialog({
          type: 'storage',
          message: `存储空间已满（${usage.storage.usedGb}GB/${usage.storage.maxGb}GB），无法上传文件。\n请升级套餐或联系客服扩容以继续使用。`,
          data: {
            usedMb: parseFloat(String(usage.storage.usedMb)),
            maxMb: usage.storage.maxMb,
            usagePercent: storagePercent
          }
        })
      })
    } else {
      // 80%-99% 预警级别，也可以弹窗
      import('@/utils/licenseDialog').then(({ showQuotaExceededDialog }) => {
        const isUserWarning = userPercent >= storagePercent
        showQuotaExceededDialog({
          type: isUserWarning ? 'user' : 'storage',
          message: isUserWarning
            ? `用户数已使用${userPercent}%（${usage.users.current}/${usage.users.max}），即将达到上限。\n建议提前升级套餐以避免影响使用。`
            : `存储空间已使用${storagePercent}%（${usage.storage.usedGb}GB/${usage.storage.maxGb}GB），即将满额。\n建议提前升级套餐以避免影响使用。`,
          data: isUserWarning
            ? { currentCount: usage.users.current, maxUsers: usage.users.max, usagePercent: userPercent }
            : { usedMb: parseFloat(String(usage.storage.usedMb)), maxMb: usage.storage.maxMb, usagePercent: storagePercent }
        })
      })
    }
  }

  return {
    quotaWarningDismissed,
    quotaWarning,
    startQuotaCheckTimer,
    stopQuotaCheckTimer,
    handleQuotaUpgrade,
  }
}
