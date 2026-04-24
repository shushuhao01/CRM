<template>
  <div class="app-container">
    <!-- 全局加载组件 -->
    <GlobalLoading
      :visible="appStore.globalLoading"
      :text="appStore.globalLoadingText"
      :progress="appStore.globalLoadingProgress"
      :show-progress="appStore.globalLoadingProgress >= 0"
    />

    <!-- 登录页面 -->
    <div v-if="isLoginPage" class="login-layout">
      <ErrorBoundary>
        <router-view />
      </ErrorBoundary>
    </div>

    <!-- Phase 8: 企微独立窗口布局 -->
    <WecomStandaloneLayout v-else-if="isStandaloneLayout" />

    <!-- 主应用布局 -->
    <el-container v-else class="layout-container">
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <div class="menu-toggle" @click="toggleSidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </div>
          <div class="logo">
            <svg width="28" height="28" viewBox="0 0 44 44" fill="none" class="logo-icon-svg">
              <defs>
                <linearGradient id="appLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6ee7b7"/>
                  <stop offset="100%" stop-color="#34d399"/>
                </linearGradient>
              </defs>
              <rect width="44" height="44" rx="10" fill="url(#appLogoGrad)"/>
              <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
              <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
              <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
              <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
            </svg>
            <span class="logo-text">云客CRM</span>
          </div>
        </div>

        <!-- 公告横幅滚动（放在中间空位） -->
        <div class="header-center">
          <AnnouncementCarousel />
        </div>

        <div class="header-right">
          <!-- 存储模式切换（已禁用）
          <StorageModeSwitch />
          -->

          <!-- 版本更新提醒 -->
          <VersionUpdatePanel />

          <!-- 帮助中心 -->
          <HelpCenter />

          <!-- 消息铃铛 -->
          <MessageBell />

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.currentUser?.name || '管理员' }}
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人设置</el-dropdown-item>
                <el-dropdown-item command="password">修改密码</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 🔥 租户资源配额预警横幅 -->
      <div v-if="quotaWarning" class="quota-warning-banner" :class="quotaWarning.level">
        <el-icon><WarningFilled /></el-icon>
        <span>{{ quotaWarning.message }}</span>
        <el-button v-if="quotaWarning.level === 'critical'" size="small" type="warning" @click="handleQuotaUpgrade">升级套餐</el-button>
        <el-button v-if="quotaWarning.level === 'critical'" size="small" type="danger" text @click="quotaWarningDismissed = true">知道了</el-button>
      </div>

      <!-- 公告弹窗 -->
      <AnnouncementPopup />

      <el-container>
        <!-- 左侧菜单 -->
        <el-aside
          :width="sidebarWidth"
          class="sidebar"
          :class="{ 'sidebar-mobile': isMobile, 'sidebar-collapsed': isCollapsed }"
        >
          <DynamicMenu
            :default-active="activeMenu"
            class="sidebar-menu"
            :collapse="isCollapsed"
            :unique-opened="true"
            router
            @select="handleMenuSelect"
            @open="handleSubMenuOpen"
          />
        </el-aside>

        <!-- 主内容区域 -->
        <el-main class="main-content">
          <!-- 标签页导航 -->
          <div class="tabs-container">
            <el-tabs
              v-model="activeTab"
              type="card"
              closable
              @tab-remove="removeTab"
              @tab-click="handleTabClick"
              @contextmenu="handleTabContextMenu"
              class="page-tabs"
            >
              <el-tab-pane
                v-for="tab in tabs"
                :key="tab.name"
                :label="tab.title"
                :name="tab.name"
                :closable="tab.name !== '/dashboard'"
              />
            </el-tabs>

            <!-- 标签页操作按钮 -->
            <div class="tabs-actions">
              <el-dropdown @command="handleTabAction">
                <el-button size="small" text>
                  <el-icon><More /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="closeOthers">关闭其他</el-dropdown-item>
                    <el-dropdown-item command="closeAll">关闭全部</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <!-- 页面内容 -->
          <div class="page-content">
            <!-- 页面视图容器 -->
            <div class="page-view-wrapper">
              <router-view v-slot="{ Component }">
                <keep-alive :include="cachedViews">
                  <component :is="Component" />
                </keep-alive>
              </router-view>
            </div>

            <!-- 🔥 版权信息 - 在滚动区域底部，滚动到底才显示，单行居中 -->
            <!-- 仅当管理后台配置了技术支持或备案信息时才显示 -->
            <footer class="app-footer" v-if="configStore.systemConfig.techSupport || configStore.systemConfig.icpNumber || configStore.systemConfig.policeNumber || configStore.systemConfig.copyrightText">
              <div class="footer-content">
                <span>{{ configStore.systemConfig.copyrightText || `版权归 ${configStore.systemConfig.companyName || 'CRM系统'} 所有` }}</span>
                <span class="separator">|</span>
                <span>v{{ configStore.systemConfig.systemVersion || '1.0.0' }}</span>
                <span class="separator" v-if="configStore.systemConfig.websiteUrl">|</span>
                <a
                  v-if="configStore.systemConfig.websiteUrl"
                  :href="configStore.systemConfig.websiteUrl"
                  target="_blank"
                  class="footer-link"
                >
                  官网
                </a>
                <span class="separator">|</span>
                <a href="javascript:void(0)" class="footer-link" @click="showContactDialog">
                  联系我们
                </a>
                <template v-if="configStore.systemConfig.icpNumber || configStore.systemConfig.policeNumber || configStore.systemConfig.techSupport">
                  <span class="separator" v-if="configStore.systemConfig.icpNumber">|</span>
                  <a
                    v-if="configStore.systemConfig.icpNumber"
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    class="footer-link beian-link"
                  >
                    {{ configStore.systemConfig.icpNumber }}
                  </a>
                  <span class="separator" v-if="configStore.systemConfig.policeNumber">|</span>
                  <a
                    v-if="configStore.systemConfig.policeNumber"
                    href="http://www.beian.gov.cn/"
                    target="_blank"
                    class="footer-link beian-link"
                  >
                    🛡️ {{ configStore.systemConfig.policeNumber }}
                  </a>
                  <template v-if="configStore.systemConfig.techSupport">
                    <span class="separator" v-if="configStore.systemConfig.icpNumber || configStore.systemConfig.policeNumber">|</span>
                    <span class="tech-support">{{ configStore.systemConfig.techSupport }}</span>
                  </template>
                </template>
              </div>
            </footer>
          </div>
        </el-main>
      </el-container>
    </el-container>

    <!-- 移动端遮罩 -->
    <div
      v-if="isMobile && !isCollapsed"
      class="mobile-overlay"
      @click="toggleSidebar"
    />



    <!-- 密码修改弹窗 -->
    <PasswordChangeModal
      :visible="showPasswordChangeModal"
      :is-forced="isForcePasswordChange"
      :is-first-login="isFirstLogin"
      :is-default-password="isDefaultPassword"
      :is-expired="isPasswordExpired"
      @close="showPasswordChangeModal = false"
      @success="handlePasswordChangeSuccess"
      @dont-remind="handleDontRemind"
    />

    <!-- 密码过期提醒弹窗 -->
    <PasswordReminderModal
      :visible="showPasswordReminderModal"
      :remaining-days="passwordRemainingDays"
      :last-changed="userStore.user?.passwordLastChanged"
      @close="handlePasswordReminderClose"
      @change-password="handlePasswordReminderChangePassword"
      @remind-later="handlePasswordReminderLater"
      @remind-after-days="handleRemindAfterDays"
    />

    <!-- 个人设置弹窗 -->
    <PersonalSettingsModal
      v-model:visible="showPersonalSettingsModal"
      @success="handlePersonalSettingsSuccess"
    />

    <!-- 🔥 批次274新增：联系我们对话框 -->
    <el-dialog
      v-model="contactDialogVisible"
      title="联系我们"
      width="500px"
      :show-close="true"
    >
      <div class="contact-dialog-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="公司名称">
            {{ configStore.systemConfig.companyName || 'CRM系统' }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话" v-if="configStore.systemConfig.contactPhone">
            <a :href="`tel:${configStore.systemConfig.contactPhone}`" class="contact-link">
              {{ configStore.systemConfig.contactPhone }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="联系邮箱" v-if="configStore.systemConfig.contactEmail">
            <a :href="`mailto:${configStore.systemConfig.contactEmail}`" class="contact-link">
              {{ configStore.systemConfig.contactEmail }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="官方网站" v-if="configStore.systemConfig.websiteUrl">
            <a :href="configStore.systemConfig.websiteUrl" target="_blank" class="contact-link">
              {{ configStore.systemConfig.websiteUrl }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="公司地址" v-if="configStore.systemConfig.companyAddress">
            {{ configStore.systemConfig.companyAddress }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 二维码区域 -->
        <div class="qr-codes-section" v-if="configStore.systemConfig.contactQRCode">
          <el-divider>扫码联系</el-divider>
          <div class="qr-code-center">
            <div class="qr-code-item">
              <img :src="configStore.systemConfig.contactQRCode" alt="联系二维码" class="qr-image" />
              <p>{{ configStore.systemConfig.contactQRCodeLabel || '扫码联系' }}</p>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="contactDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 🔥 联系客服续费弹窗（由授权过期弹窗"联系客服续费"按钮触发） -->
    <ContactServiceDialog v-model="contactServiceDialogVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useTabsStore } from '@/stores/tabs'
import { useAppStore } from '@/stores/app'
import { useConfigStore } from '@/stores/config'
import { useNotificationStore } from '@/stores/notification'
import { useOrderStore } from '@/stores/order'
import { useMessageStore } from '@/stores/message'
import { ElMessage, ElMessageBox } from 'element-plus'
import GlobalLoading from '@/components/GlobalLoading.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import PasswordChangeModal from '@/components/PasswordChangeModal.vue'
import PasswordReminderModal from '@/components/PasswordReminderModal.vue'
import PersonalSettingsModal from '@/components/PersonalSettingsModal.vue'
import StorageModeSwitch from '@/components/StorageModeSwitch.vue'
import HelpCenter from '@/components/HelpCenter.vue'
import MessageBell from '@/components/MessageBell.vue'
import VersionUpdatePanel from '@/components/VersionUpdatePanel.vue'
import AnnouncementCarousel from '@/components/AnnouncementCarousel.vue'
import AnnouncementPopup from '@/components/AnnouncementPopup.vue'
import ContactServiceDialog from '@/components/ContactServiceDialog.vue'
import { useResponsive, debounce } from '@/utils/responsive'
import { passwordService } from '@/services/passwordService'
import { passwordReminderService } from '@/services/passwordReminderService'
import IconHeadset from '@/components/icons/IconHeadset.vue'
import IconCustomerService from '@/components/icons/IconCustomerService.vue'
import DynamicMenu from '@/components/DynamicMenu.vue'
import WecomStandaloneLayout from '@/layouts/WecomStandaloneLayout.vue'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Menu, TrendCharts, User, ArrowDown, Odometer, ShoppingCart,
  Box, Setting, Headset, Service, WarningFilled, More
} from '@element-plus/icons-vue'
import { licenseHeartbeatService } from '@/services/licenseHeartbeatService'
import { getResourceUsage, type ResourceUsage } from '@/api/tenantLicense'


const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()
const appStore = useAppStore()
const configStore = useConfigStore()
const notificationStore = useNotificationStore()
const orderStore = useOrderStore()
const messageStore = useMessageStore()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)

// 响应式状态
const isCollapsed = ref(false)
const { isMobile, isTablet, isDesktop, deviceType } = useResponsive()



// 密码管理相关状态
const showPasswordChangeModal = ref(false)
const showPasswordReminderModal = ref(false)
const isForcePasswordChange = ref(false)
const isFirstLogin = ref(false)
const isDefaultPassword = ref(false)
const isPasswordExpired = ref(false)
const passwordRemainingDays = ref(0)
const dontRemindTodayKey = ref('')

// 个人设置相关状态
const showPersonalSettingsModal = ref(false)

// 🔥 批次274新增：联系我们对话框
const contactDialogVisible = ref(false)

// 🔥 联系客服续费弹窗（由授权过期弹窗触发）
const contactServiceDialogVisible = ref(false)

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
const startQuotaCheckTimer = () => {
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

// 显示联系我们对话框
const showContactDialog = () => {
  contactDialogVisible.value = true
}

// 🔥 联系客服续费弹窗事件处理
const handleOpenContactServiceDialog = () => {
  contactServiceDialogVisible.value = true
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




// 计算属性
  // 🔥 公开页面列表（不需要登录，使用简单布局）
  const publicPages = ['/login', '/public-help']

  // Phase 8: 企微独立窗口路由（需要登录，但使用独立Layout）
  const isStandaloneLayout = computed(() => {
    return route.path.startsWith('/wecom-standalone')
  })

  const isLoginPage = computed(() => {
    // 登录页或公开帮助中心页面使用简单布局
    return publicPages.some(path => route.path.startsWith(path)) || !userStore.token
  })

const sidebarWidth = computed(() => {
  if (isMobile.value) return isCollapsed.value ? '0px' : '240px'
  return isCollapsed.value ? '64px' : '260px'
})

const activeMenu = computed(() => route.path)
const activeTab = computed({
  get: () => tabsStore.activeTab,
  set: (value) => tabsStore.setActiveTab(value)
})

const tabs = computed(() => tabsStore.tabs)
const cachedViews = computed(() => tabsStore.cachedViews)

// 方法
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}



const checkMobile = () => {
  if (isMobile.value && !isCollapsed.value) {
    isCollapsed.value = true
  }
}

const removeTab = (targetName: string) => {
  const currentActiveTab = activeTab.value
  tabsStore.removeTab(targetName)

  // 如果关闭的是当前激活的标签页，需要跳转到新的激活标签页
  if (currentActiveTab === targetName && activeTab.value !== targetName) {
    safeNavigator.push(activeTab.value)
  }
}

const handleTabClick = debounce((tab: { props: { name: string } }) => {
  safeNavigator.push(tab.props.name)
}, 300)

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      handleProfile()
      break
    case 'password':
      handleChangePassword()
      break
    case 'logout':
      handleLogout()
      break
  }
}

const handleProfile = () => {
  showPersonalSettingsModal.value = true
}

const handleChangePassword = () => {
  showPasswordChangeModal.value = true
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 🔥 等待logout完成
    await userStore.logout()
    tabsStore.clearTabs()
    ElMessage.success('退出登录成功')

    // 🔥 确保跳转到登录页
    console.log('[App] 正在跳转到登录页...')
    await router.push('/login')
    console.log('[App] 已跳转到登录页')
  } catch (_error) {
    // 用户取消（忽略）
  }
}

const handleTabAction = (command: string) => {
  switch (command) {
    case 'closeOthers':
      tabsStore.closeOtherTabs(activeTab.value)
      break
    case 'closeAll':
      tabsStore.closeAllTabs()
      safeNavigator.push('/dashboard')
      break
  }
}

const handleMenuSelect = debounce((index: string) => {
  console.log('菜单选择:', index)
  console.log('当前路径:', route.path)
  console.log('用户权限:', userStore.isAdmin, userStore.isManager)

  // 智能滚动定位：如果点击的是系统管理相关菜单，确保系统管理菜单及其子菜单都可见
  if (index.startsWith('/system/') || index === 'system') {
    handleSystemMenuScroll()
  }

  // 检查是否为有效的路由路径
  if (index && index.startsWith('/')) {
    // 检查权限
    if (index.startsWith('/system/')) {
      // 超级管理员面板需要超级管理员权限
      if (index === '/system/super-admin-panel' && !userStore.isSuperAdmin) {
        ElMessage.warning('您没有超级管理员权限，无法访问此页面')
        return
      }
      // 其他系统管理页面需要管理员权限
      else if (index !== '/system/super-admin-panel' && !userStore.isAdmin) {
        ElMessage.warning('您没有权限访问此页面，请联系管理员')
        return
      }
    }

    // 使用安全导航器进行导航（静默处理导航错误，避免重复导航提示）
    safeNavigator.push(index).catch(() => {
      // 静默处理导航错误，safeNavigator已经处理了大部分情况
    })
  }
}, 300)

// 处理子菜单展开事件
const handleSubMenuOpen = (index: string) => {
  console.log('子菜单展开:', index)

  // 对所有子菜单执行智能滚动定位
  handleSmartMenuScroll(index)
}

// 智能菜单滚动定位 - 通用函数
const handleSmartMenuScroll = (menuIndex: string) => {
  console.log('开始智能滚动定位:', menuIndex)

  // 使用nextTick确保DOM已更新
  nextTick(() => {
    const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
    const targetSubMenu = document.querySelector(`.sidebar-menu .el-sub-menu[index="${menuIndex}"]`) as HTMLElement

    if (!sidebarMenu || !targetSubMenu) {
      console.log('未找到菜单元素:', { sidebarMenu: !!sidebarMenu, targetSubMenu: !!targetSubMenu })
      return
    }

    // 多次检查，确保子菜单完全展开
    const checkAndScroll = (attempt = 0) => {
      const maxAttempts = 5
      const delay = attempt === 0 ? 100 : 200

      setTimeout(() => {
        const menuHeight = sidebarMenu.clientHeight
        const menuScrollTop = sidebarMenu.scrollTop
        const targetMenuTop = targetSubMenu.offsetTop
        const targetMenuHeight = targetSubMenu.offsetHeight
        const maxScrollTop = sidebarMenu.scrollHeight - menuHeight

        console.log('滚动计算参数:', {
          attempt,
          menuHeight,
          menuScrollTop,
          targetMenuTop,
          targetMenuHeight,
          maxScrollTop,
          scrollHeight: sidebarMenu.scrollHeight
        })

        // 如果子菜单高度还很小，可能还在动画中，继续等待
        if (targetMenuHeight < 50 && attempt < maxAttempts) {
          console.log('子菜单可能还在展开中，继续等待...')
          checkAndScroll(attempt + 1)
          return
        }

        // 计算子菜单在视口中的位置
        const menuTopInViewport = targetMenuTop - menuScrollTop
        const menuBottomInViewport = menuTopInViewport + targetMenuHeight

        console.log('视口位置:', {
          menuTopInViewport,
          menuBottomInViewport,
          viewportHeight: menuHeight
        })

        // 预留空间
        const topPadding = 10
        const bottomPadding = 20

        let targetScrollTop = menuScrollTop
        let needScroll = false

        // 如果子菜单顶部超出视口上边界
        if (menuTopInViewport < topPadding) {
          targetScrollTop = targetMenuTop - topPadding
          needScroll = true
          console.log('需要向上滚动')
        }
        // 如果子菜单底部超出视口下边界
        else if (menuBottomInViewport > menuHeight - bottomPadding) {
          // 优先显示子菜单底部，确保所有子项都可见
          targetScrollTop = targetMenuTop + targetMenuHeight - menuHeight + bottomPadding
          needScroll = true
          console.log('需要向下滚动')
        }

        // 确保滚动位置在有效范围内
        targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))

        console.log('滚动决策:', {
          needScroll,
          currentScrollTop: menuScrollTop,
          targetScrollTop,
          scrollDiff: Math.abs(targetScrollTop - menuScrollTop)
        })

        // 执行滚动
        if (needScroll && Math.abs(targetScrollTop - menuScrollTop) > 2) {
          console.log('执行滚动到:', targetScrollTop)
          sidebarMenu.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          })
        } else {
          console.log('无需滚动或滚动距离太小')
        }
      }, delay)
    }

    // 开始检查和滚动
    checkAndScroll()
  })
}

// 兼容旧的系统菜单滚动函数
const handleSystemMenuScroll = () => {
  handleSmartMenuScroll('system')
}

// 初始化侧边栏鼠标滚轮事件
const initSidebarWheelScroll = () => {
  nextTick(() => {
    const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
    if (sidebarMenu) {
      console.log('初始化侧边栏滚轮事件')
      sidebarMenu.addEventListener('wheel', handleSidebarWheel, { passive: false })
    } else {
      console.log('未找到侧边栏菜单元素')
    }
  })
}

// 处理侧边栏鼠标滚轮事件
const handleSidebarWheel = (event: WheelEvent) => {
  event.preventDefault()
  event.stopPropagation()

  const sidebarMenu = event.currentTarget as HTMLElement
  const scrollAmount = 80 // 增加滚动距离，提供更好的滚动体验
  const currentScrollTop = sidebarMenu.scrollTop
  const maxScrollTop = sidebarMenu.scrollHeight - sidebarMenu.clientHeight

  console.log('鼠标滚轮事件:', {
    deltaY: event.deltaY,
    currentScrollTop,
    maxScrollTop,
    scrollHeight: sidebarMenu.scrollHeight,
    clientHeight: sidebarMenu.clientHeight
  })

  // 根据滚轮方向计算新的滚动位置
  const newScrollTop = event.deltaY > 0
    ? currentScrollTop + scrollAmount  // 向下滚动
    : currentScrollTop - scrollAmount  // 向上滚动

  // 确保滚动位置在有效范围内
  const targetScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop))

  console.log('滚动到:', targetScrollTop)

  // 平滑滚动到目标位置
  sidebarMenu.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  })
}

const handleTabContextMenu = (event: MouseEvent) => {
  event.preventDefault()
}



// 密码管理相关方法
const checkPasswordStatus = () => {
  const user = userStore.user
  if (!user) return

  // 超级管理员不进行密码提醒
  if (userStore.isSuperAdmin) {
    return
  }

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
  if (neverChangedPassword || isDefaultPassword.value || isForcePasswordChange.value) {
    isFirstLogin.value = neverChangedPassword
    // 首次登录/默认密码场景下，不应该显示"过期"提示
    isPasswordExpired.value = false
    showPasswordChangeModal.value = true
    isForcePasswordChange.value = true // 强制模式，弹窗不可关闭
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

const handlePersonalSettingsSuccess = () => {
  showPersonalSettingsModal.value = false
  // 可以在这里刷新用户信息或执行其他操作
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

// 监听路由变化，添加标签页
watch(route, (newRoute) => {
  if (newRoute.path !== '/login' && newRoute.meta?.title) {
    tabsStore.addTab({
      name: newRoute.path,
      title: newRoute.meta.title as string,
      component: newRoute.name as string
    })
  }
}, { immediate: true })

// 启动密码提醒服务
const startPasswordReminder = () => {
  const user = userStore.user
  if (!user || userStore.isSuperAdmin) return

  passwordReminderService.startReminder(user, () => {
    // 检查是否需要提醒
    if (passwordService.needsPasswordReminder(user)) {
      const dontRemindTodayKey = `password_reminder_${user.id}_${new Date().toDateString()}`
      const dontRemindToday = localStorage.getItem(dontRemindTodayKey) === 'true'

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

// 监听用户登录状态变化
watch(() => userStore.isLoggedIn, (isLoggedIn) => {
  // 🔥 公开页面跳过
  const isPublicPage = publicPages.some(path => route.path.startsWith(path))
  if (isPublicPage) return

  if (isLoggedIn && userStore.user) {
    checkPasswordStatus()
    startPasswordReminder()
  } else {
    stopPasswordReminder()
  }
}, { immediate: true })

// 生命周期
onMounted(async () => {
  checkMobile()

  // 🔥 公开页面（如公开帮助中心）不需要初始化这些需要认证的服务
  const currentPath = window.location.pathname
  const isPublicPage = publicPages.some(path => currentPath.startsWith(path))
  if (isPublicPage && !userStore.token) {
    console.log('[App] 公开页面，跳过需要认证的初始化')
    return
  }

  // 初始化配置（异步从API加载最新系统配置）
  await configStore.initConfig()

  // 初始化密码提醒服务
  passwordReminderService.init()

  // 注意：用户信息初始化已在main.ts中完成，这里不再重复调用
  // userStore.initUser() // 移除重复调用

  // 初始化网络监听器
  appStore.initNetworkListener()

  // 从API加载真实消息（不再使用模拟数据）
  notificationStore.loadMessagesFromAPI()

  // 加载用户公告（用于弹窗和消息铃铛）
  if (userStore.token) {
    messageStore.loadUserAnnouncements()
  }

  // 🔥 初始化WebSocket实时推送（优先）+ 消息轮询（降级方案）
  initWebSocketConnection()
  startMessagePollingTimer()

  // 🔥 启动授权心跳检测服务（SaaS模式）
  licenseHeartbeatService.start()

  // 🔥 启动配额预警检测定时器（每5分钟检测一次用户数和存储空间使用率）
  if (userStore.token) {
    startQuotaCheckTimer()
  }

  // 启动订单流转检查定时器（每30秒检查一次）
  startOrderTransferTimer()

  // 初始化侧边栏菜单滚轮事件
  initSidebarWheelScroll()

  // 🔥 监听"联系客服续费"弹窗打开事件（由授权过期弹窗触发）
  window.addEventListener('open-contact-service-dialog', handleOpenContactServiceDialog)

  // 检查密码状态（延迟执行，确保用户信息已加载）
  setTimeout(() => {
    if (userStore.user && !isLoginPage.value) {
      checkPasswordStatus()
    }
  }, 1000)

  // 调试用户权限状态
  setTimeout(() => {
    console.log('=== 用户权限调试信息 ===')
    console.log('当前用户:', userStore.user)
    console.log('用户角色:', userStore.user?.role)
    console.log('用户UserRole:', userStore.user?.userRole)
    console.log('isAdmin:', userStore.isAdmin)
    console.log('isSuperAdmin:', userStore.isSuperAdmin)
    console.log('isLoggedIn:', userStore.isLoggedIn)
    console.log('token:', userStore.token ? '已设置' : '未设置')
    console.log('========================')
  }, 2000)
})

// 🔥 WebSocket实时推送连接
const initWebSocketConnection = async () => {
  if (!userStore.token) {
    console.log('[App] 用户未登录，跳过WebSocket连接')
    return
  }

  try {
    await notificationStore.initWebSocket(userStore.token)
    console.log('[App] 🔌 WebSocket实时推送已初始化')
  } catch (error) {
    console.error('[App] WebSocket初始化失败，将使用轮询降级方案:', error)
  }
}

// 🔥 消息轮询定时器 - 作为WebSocket的降级方案
let messagePollingTimer: number | null = null

const startMessagePollingTimer = () => {
  // 如果用户未登录，不启动轮询
  if (!userStore.token) {
    console.log('[App] 用户未登录，跳过消息轮询')
    return
  }

  // 设置定时器，每30秒检查一次新消息（WebSocket连接时作为备份，断开时作为主要方案）
  messagePollingTimer = window.setInterval(async () => {
    if (!userStore.token) {
      // 用户已登出，停止轮询
      if (messagePollingTimer) {
        clearInterval(messagePollingTimer)
        messagePollingTimer = null
      }
      return
    }

    // 如果WebSocket已连接，降低轮询频率（仅作为备份同步）
    if (notificationStore.wsStatus === 'connected') {
      // WebSocket已连接，跳过本次轮询
      return
    }

    try {
      await notificationStore.loadMessagesFromAPI()
      console.log('[App] 消息轮询完成（WebSocket降级），未读消息数:', notificationStore.unreadCount)
    } catch (error) {
      // 静默处理错误，避免频繁报错
      console.log('[App] 消息轮询失败（非关键）')
    }
  }, 30000) // 30秒（WebSocket断开时的降级方案）

  console.log('[App] 🔔 消息轮询定时器已启动（WebSocket降级方案，每30秒）')
}

// 订单流转检查定时器
let orderTransferTimer: number | null = null

const startOrderTransferTimer = () => {
  // 立即执行一次检查
  orderStore.checkAndTransferOrders()

  // 设置定时器，每30秒检查一次
  orderTransferTimer = window.setInterval(() => {
    orderStore.checkAndTransferOrders()
  }, 30000) // 30秒
}

// 组件卸载时清理定时器
onUnmounted(() => {
  // 清理密码提醒服务
  passwordReminderService.stopReminder()

  // 清理侧边栏滚轮事件监听器
  const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
  if (sidebarMenu) {
    sidebarMenu.removeEventListener('wheel', handleSidebarWheel)
  }

  // 🔥 断开WebSocket连接
  notificationStore.disconnectWebSocket()

  // 🔥 清理消息轮询定时器
  if (messagePollingTimer) {
    clearInterval(messagePollingTimer)
    messagePollingTimer = null
  }

  if (orderTransferTimer) {
    clearInterval(orderTransferTimer)
    orderTransferTimer = null
  }

  // 🔥 清理配额检测定时器
  stopQuotaCheckTimer()

  // 🔥 清理联系客服弹窗事件监听器
  window.removeEventListener('open-contact-service-dialog', handleOpenContactServiceDialog)
})



// 监听移动端状态变化
watch(isMobile, (newValue) => {
  if (newValue && !isCollapsed.value) {
    isCollapsed.value = true
  }
});</script>

<style scoped>
.app-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

.layout-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* 内部容器（侧边栏+主内容）填满剩余高度 */
.layout-container > .el-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  width: 100%;
  display: flex; /* 🔥 确保使用flex布局 */
  flex-direction: row; /* 🔥 水平排列 */
}

/* 🔥 确保el-aside（侧边栏）宽度变化时有过渡效果 */
.layout-container > .el-container > .el-aside {
  flex-shrink: 0;
  transition: width 0.3s ease;
}

/* 🔥 确保el-main在侧边栏收起时自动扩展填充剩余空间 */
.layout-container > .el-container > .el-main {
  flex: 1;
  min-width: 0;
  width: 0; /* 🔥 关键：设置为0让flex:1生效 */
  transition: all 0.3s ease;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px !important;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  cursor: pointer;
  color: #606266;
  border-radius: 6px;
  transition: all 0.2s;
}

.menu-toggle:hover {
  background: #f5f7fa;
  color: #409eff;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.logo-icon-svg {
  flex-shrink: 0;
}

.logo-text {
  color: #303133;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}



.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

/* 🔥 租户配额预警横幅 */
.quota-warning-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  font-size: 13px;
  line-height: 1.4;
  z-index: 10;
}
.quota-warning-banner.warning {
  background: linear-gradient(90deg, #fdf6ec 0%, #fef0e0 100%);
  color: #e6a23c;
  border-bottom: 1px solid #faecd8;
}
.quota-warning-banner.critical {
  background: linear-gradient(90deg, #fef0f0 0%, #fde2e2 100%);
  color: #f56c6c;
  border-bottom: 1px solid #fbc4c4;
}
.quota-warning-banner .el-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.username {
  font-size: 14px;
  color: #606266;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s ease;
  overflow: hidden;
  height: 100%;
  position: relative;
  flex-shrink: 0; /* 🔥 防止侧边栏被压缩 */

  /* 确保在高缩放比例下正确显示 */
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sidebar-mobile {
  position: fixed;
  top: 108px;
  left: 0;
  bottom: 0;
  z-index: 1000;
  box-shadow: 2px 0 6px rgba(0, 21, 41, 0.35);
}

.sidebar-collapsed {
  width: 64px !important;
  min-width: 64px !important;
}

.sidebar-menu {
  border: none;
  flex: 1; /* 使用flex布局，自动填充剩余空间 */
  min-height: 0; /* 允许flex项目缩小 */
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  position: relative;

  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox - 隐藏滚动条 */
  -ms-overflow-style: none; /* IE and Edge - 隐藏滚动条 */

  /* Chrome, Safari, Opera - 隐藏滚动条 */
  &::-webkit-scrollbar {
    display: none;
  }

  /* 确保菜单项在滚动时正确显示 */
  :deep(.el-sub-menu) {
    .el-sub-menu__title {
      position: relative;
      padding: 0 20px;
      height: 56px;
      line-height: 56px;
      border-radius: 8px;
      margin: 2px 8px;
      transition: all 0.3s ease;

      &:hover {
        background-color: #f5f5f5;
        transform: translateX(2px);
        border-radius: 4px;
      }

      &.is-active {
        background-color: #e6f7ff;
        border-left: 3px solid #409eff;
      }
    }

    /* 强制显示所有子菜单图标 - 使用更强的选择器 */
    .el-sub-menu .el-sub-menu__title .el-icon,
    .el-sub-menu.is-opened .el-sub-menu__title .el-icon,
    .el-sub-menu.is-active .el-sub-menu__title .el-icon {
      color: #606266 !important;
      opacity: 1 !important;
      visibility: visible !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin-right: 8px !important;
      width: 16px !important;
      height: 16px !important;
      font-size: 16px !important;
      position: relative !important;
      z-index: 1 !important;
    }

    /* 强制显示图标的SVG元素 */
    .el-sub-menu .el-sub-menu__title .el-icon svg,
    .el-sub-menu.is-opened .el-sub-menu__title .el-icon svg,
    .el-sub-menu.is-active .el-sub-menu__title .el-icon svg {
      display: block !important;
      width: 100% !important;
      height: 100% !important;
      fill: currentColor !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* 悬停状态下的图标颜色 */
    .el-sub-menu__title:hover .el-icon {
      color: #409eff !important;
    }

    /* 激活状态下的图标颜色 */
    .el-sub-menu.is-active .el-sub-menu__title .el-icon,
    .el-sub-menu.is-opened .el-sub-menu__title .el-icon {
      color: #409eff !important;
    }

    /* 子菜单展开时的样式优化 */
    .el-menu {
      background-color: #f8f9fa;

      .el-menu-item {
        background-color: transparent;
        padding-left: 40px !important;
        height: 36px;
        line-height: 36px;
        border-radius: 6px; /* 与选中状态保持一致的圆角 */
        margin: 1px 8px; /* 与选中状态保持一致的边距 */
        transition: all 0.3s ease;
        padding-right: 20px !important; /* 统一右边距 */

        &:hover {
          background-color: #f5f5f5;
          transform: translateX(2px);
          height: 36px !important; /* 悬停时保持高度 */
          line-height: 36px !important; /* 悬停时保持行高 */
          border-radius: 4px; /* 与选中状态保持一致的圆角 */
          margin: 1px 8px; /* 与选中状态保持一致的边距 */
        }

        &.is-active {
          background-color: #f8f9fa;
          color: #2c3e50;
          font-weight: 500;
          border-left: 2px solid #409eff;
          height: 36px !important; /* 选中时保持高度 */
          line-height: 36px !important; /* 选中时保持行高 */
          border-radius: 4px; /* 简约的圆角 */
          margin: 1px 8px; /* 减小上下边距 */
          position: relative;

          &::before {
            display: none;
          }

          /* 简约的右侧标识 */
          &::after {
            content: '';
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 4px;
            background-color: #409eff;
            border-radius: 50%;
          }
        }
      }
    }
  }

  /* 普通菜单项样式 */
  :deep(.el-menu-item) {
    height: 56px;
    line-height: 56px;
    padding: 0 20px;
    border-radius: 8px;
    margin: 2px 8px;
    transition: all 0.3s ease;

    &:hover {
      background-color: #f5f5f5;
      transform: translateX(2px);
      border-radius: 4px;
    }

    &.is-active {
      background-color: #f8f9fa;
      color: #2c3e50;
      font-weight: 500;
      border-left: 2px solid #409eff;
      border-radius: 4px;
      position: relative;

      &::before {
        display: none;
      }

      /* 简约的右侧标识 */
      &::after {
        content: '';
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 4px;
        background-color: #409eff;
        border-radius: 50%;
      }
    }
  }

  /* 确保在高缩放比例下菜单项不会被截断 */
  :deep(.el-menu) {
    min-height: 100%;
    box-sizing: border-box;
  }
}

.main-content {
  background: #f5f7fa;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 0;
  flex: 1;
  transition: all 0.3s ease;
  overflow: hidden;
  box-sizing: border-box;
}

.tabs-container {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  min-height: 40px;
  flex-shrink: 0;
  overflow: hidden;
}

.tabs-actions {
  display: flex;
  align-items: center;
  margin-left: 8px;
}

.page-tabs {
  height: 40px;
  flex: 1;
  overflow: hidden;
}

.page-tabs :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: none;
}

.page-tabs :deep(.el-tabs__nav-wrap) {
  overflow: hidden;
}

.page-tabs :deep(.el-tabs__nav-scroll) {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.page-tabs :deep(.el-tabs__nav-scroll)::-webkit-scrollbar {
  display: none;
}

.page-tabs :deep(.el-tabs__nav) {
  border: none;
  white-space: nowrap;
  display: flex;
  flex-wrap: nowrap;
}

.page-tabs :deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  margin-top: 4px;
  border: 1px solid #d9d9d9;
  border-radius: 4px 4px 0 0;
  margin-right: 4px;
  padding: 0 16px;
  font-size: 12px;
  flex-shrink: 0;
  min-width: 80px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-tabs :deep(.el-tabs__item.is-active) {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
}

.page-content {
  flex: 1;
  padding: 16px;
  padding-bottom: 0; /* footer自带padding */
  overflow: auto;
  width: 100%;
  min-height: 0;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

/* 页面视图容器 - 包含实际页面内容 */
.page-view-wrapper {
  min-height: calc(100% - 50px); /* 减去footer高度，确保内容区域足够高 */
}

.mobile-overlay {
  position: fixed;
  top: 108px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

/* 响应式设计 */
/* 大屏幕优化 (PC端) */
@media (min-width: 1200px) {
  .layout-container {
    max-width: none;
    width: 100%;
  }

  .header {
    padding: 0 32px;
    height: 64px !important;
    width: 100%;
  }

  .page-content {
    padding: 24px 32px;
    width: 100%;
    max-width: none;
  }

  .sidebar:not(.sidebar-collapsed) {
    width: 260px !important;
    min-width: 260px;
  }

  .sidebar.sidebar-collapsed {
    width: 64px !important;
    min-width: 64px !important;
  }
}

/* 中等屏幕优化 (平板) */
@media (min-width: 769px) and (max-width: 1199px) {
  .header {
    padding: 0 24px;
  }

  .page-content {
    padding: 20px 24px;
  }

  .sidebar:not(.sidebar-collapsed) {
    width: 240px !important;
    min-width: 240px;
  }

  .sidebar.sidebar-collapsed {
    width: 64px !important;
    min-width: 64px !important;
  }
}

/* 小屏幕优化 (手机) */
@media (max-width: 768px) {
  .header {
    padding: 0 16px;
    height: 56px !important;
  }

  .logo-text {
    display: none;
  }

  .username {
    display: none;
  }

  .page-content {
    padding: 16px 12px;
  }

  .sidebar-mobile {
    top: 104px;
  }

  .sidebar-mobile.sidebar-collapsed {
    width: 0 !important;
  }

  .sidebar-mobile {
    position: fixed;
    height: calc(100vh - 104px) !important;
  }

  .tabs-container {
    padding: 0 12px;
  }

  .page-tabs :deep(.el-tabs__item) {
    padding: 0 12px;
    font-size: 11px;
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .header {
    padding: 0 12px;
  }

  .page-content {
    padding: 12px 8px;
  }

  .tabs-container {
    padding: 0 8px;
  }

  .page-tabs :deep(.el-tabs__item) {
    padding: 0 8px;
    font-size: 10px;
  }
}

/* 🔥 版权信息样式 - 单行居中显示 */
.app-footer {
  background: transparent;
  padding: 20px;
  text-align: center;
}

.footer-content {
  color: #ccc;
  font-size: 11px;
  line-height: 1.2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

.footer-content .separator {
  color: #ddd;
  margin: 0 5px;
}

.footer-content .footer-link {
  color: #ccc;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-content .footer-link:hover {
  color: #409eff;
}

.footer-content .beian-link {
  color: #bbb;
}

.footer-content .beian-link:hover {
  color: #409eff;
}

.footer-content .tech-support {
  color: #bbb;
}

/* 联系我们对话框样式 */
.contact-dialog-content {
  padding: 10px 0;
}

.contact-link {
  color: #409eff;
  text-decoration: none;
}

.contact-link:hover {
  text-decoration: underline;
}

.qr-codes-section {
  margin-top: 20px;
}

.qr-code-center {
  display: flex;
  justify-content: center;
}

.qr-code-item {
  text-align: center;
}

.qr-image {
  width: 150px;
  height: 150px;
  object-fit: contain;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 10px;
  background: #fff;
}

.qr-code-item p {
  margin: 12px 0 0 0;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-footer {
    padding: 6px 12px;
  }

  .footer-content {
    font-size: 10px;
    gap: 2px;
  }

  .footer-content .separator {
    margin: 0 3px;
  }

  .qr-image {
    width: 100px;
    height: 100px;
  }
}

</style>

<!-- Phase 8: 企微全屏模式全局样式(不使用scoped，直接全局生效) -->
<style>
body.wecom-fullscreen .header,
body.wecom-fullscreen .sidebar,
body.wecom-fullscreen .tabs-container,
body.wecom-fullscreen .quota-warning-banner,
body.wecom-fullscreen .mobile-overlay {
  display: none !important;
}

body.wecom-fullscreen .main-content {
  margin: 0 !important;
  padding: 0 !important;
}

body.wecom-fullscreen .layout-container > .el-container > .el-main {
  width: 100% !important;
}

body.wecom-fullscreen .page-content {
  padding: 16px !important;
}
</style>

