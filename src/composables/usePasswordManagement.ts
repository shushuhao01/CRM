import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { passwordService } from '@/services/passwordService'
import { passwordReminderService } from '@/services/passwordReminderService'

/**
 * 密码管理组合式函数
 * 从 App.vue 拆分，包含密码状态检查、强制修改、到期提醒等逻辑
 */
export function usePasswordManagement() {
  const userStore = useUserStore()

  // 密码管理相关状态
  const showPasswordChangeModal = ref(false)
  const showPasswordReminderModal = ref(false)
  const isForcePasswordChange = ref(false)
  const isFirstLogin = ref(false)
  const isDefaultPassword = ref(false)
  const isPasswordExpired = ref(false)
  const passwordRemainingDays = ref(0)
  const dontRemindTodayKey = ref('')

  // 密码状态检查
  const checkPasswordStatus = () => {
    const user = userStore.user
    if (!user) return

    // 🔥 密码状态完全由后端数据库决定，不再操作本地 localStorage('users')

    // 检查是否为默认密码
    isDefaultPassword.value = user.isDefaultPassword || false

    // 检查密码是否过期
    isPasswordExpired.value = passwordService.isPasswordExpired(user)

    // 检查是否强制修改密码（首次登录 或 管理员要求）
    isForcePasswordChange.value = user.forcePasswordChange || false

    // 计算密码剩余天数（距90天强制修改）
    passwordRemainingDays.value = passwordService.getPasswordRemainingDays(user)

    // 设置今日提醒键
    dontRemindTodayKey.value = `password_reminder_${user.id}_${new Date().toDateString()}`

    // 🔥 判断是否从未修改过密码（首次登录）
    const neverChangedPassword = !user.passwordLastChanged

    // 🔥 首次登录（从未改过密码）或 默认密码 或 管理员要求强制修改：必须强制修改，不可关闭弹窗
    // 注意：所有角色（包括管理员）都必须执行此检查，确保首次登录必须改密
    if (neverChangedPassword || isDefaultPassword.value || isForcePasswordChange.value) {
      isFirstLogin.value = neverChangedPassword
      // 首次登录/默认密码场景下，不应该显示"过期"提示
      isPasswordExpired.value = false
      showPasswordChangeModal.value = true
      isForcePasswordChange.value = true // 强制模式，弹窗不可关闭
      return
    }

    // 超级管理员不进行定期密码过期提醒（但上面的首次登录/默认密码/强制修改仍然生效）
    if (userStore.isSuperAdmin) {
      return
    }

    // 🔥 密码安全策略：90天未修改 -> 强制修改密码（不可关闭）
    if (isPasswordExpired.value) {
      isFirstLogin.value = false
      showPasswordChangeModal.value = true
      isForcePasswordChange.value = true // 强制模式，弹窗不可关闭
      return
    }

    // 🔥 密码安全策略：30天/60天 -> 提醒修改密码（可关闭）
    const reminderLevel = passwordService.getPasswordReminderLevel(user)
    if (reminderLevel === 'first' || reminderLevel === 'second') {
      // 检查是否在"X天后提醒我"的延迟期内
      const snoozeExpire = localStorage.getItem('password_reminder_snooze_expire')
      if (snoozeExpire && Date.now() < parseInt(snoozeExpire)) {
        return
      }
      const dontRemindToday = localStorage.getItem(dontRemindTodayKey.value) === 'true'
      if (!dontRemindToday) {
        showPasswordReminderModal.value = true
      }
    }
  }

  const handlePasswordChangeSuccess = () => {
    ElMessage.success('密码修改成功')
    showPasswordChangeModal.value = false
    isForcePasswordChange.value = false
    isFirstLogin.value = false

    // 重新检查密码状态
    setTimeout(() => {
      checkPasswordStatus()
    }, 1000)
  }

  const handlePasswordReminderClose = () => {
    showPasswordReminderModal.value = false
  }

  const handlePasswordReminderChangePassword = () => {
    showPasswordReminderModal.value = false
    showPasswordChangeModal.value = true
  }

  const handlePasswordReminderLater = (dontRemindToday: boolean) => {
    if (dontRemindToday) {
      localStorage.setItem(dontRemindTodayKey.value, 'true')
    }
    showPasswordReminderModal.value = false
  }

  // 处理"X天后提醒我"
  const handleRemindAfterDays = (days: number) => {
    const expireTime = Date.now() + days * 24 * 60 * 60 * 1000
    localStorage.setItem('password_reminder_snooze_expire', expireTime.toString())
    ElMessage.success(`已设置 ${days} 天后再次提醒修改密码`)
    showPasswordReminderModal.value = false
  }

  // 处理"不再提醒"
  const handleDontRemind = (days: number) => {
    console.log(`[密码提醒] 用户选择 ${days} 天内不再提醒`)
    ElMessage.success(`已设置 ${days} 天内不再提醒修改密码`)
  }

  // 启动密码提醒服务
  const startPasswordReminder = () => {
    const user = userStore.user
    if (!user || userStore.isSuperAdmin) return

    passwordReminderService.startReminder(user, () => {
      // 检查是否需要提醒
      if (passwordService.needsPasswordReminder(user)) {
        const key = `password_reminder_${user.id}_${new Date().toDateString()}`
        const dontRemindToday = localStorage.getItem(key) === 'true'

        if (!dontRemindToday) {
          showPasswordReminderModal.value = true
        }
      }
    })
  }

  // 停止密码提醒服务
  const stopPasswordReminder = () => {
    passwordReminderService.stopReminder()
  }

  return {
    showPasswordChangeModal,
    showPasswordReminderModal,
    isForcePasswordChange,
    isFirstLogin,
    isDefaultPassword,
    isPasswordExpired,
    passwordRemainingDays,
    checkPasswordStatus,
    handlePasswordChangeSuccess,
    handlePasswordReminderClose,
    handlePasswordReminderChangePassword,
    handlePasswordReminderLater,
    handleRemindAfterDays,
    handleDontRemind,
    startPasswordReminder,
    stopPasswordReminder,
  }
}
