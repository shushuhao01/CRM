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

    <!-- 主应用布局 -->
    <el-container v-else class="layout-container">
      <!-- 顶部导航栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="menu-toggle" @click="toggleSidebar">
            <Menu />
          </el-icon>
          <div class="logo">
            <el-icon><TrendCharts /></el-icon>
            <span class="logo-text">智能销售CRM</span>
          </div>
        </div>
        <div class="header-right">
          <!-- 存储模式切换 -->
          <StorageModeSwitch />

          <!-- 帮助中心 -->
          <HelpCenter />

          <!-- 消息铃铛 -->
          <MessageBell />

          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-icon><User /></el-icon>
              {{ userStore.user?.name || '管理员' }}
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

      <!-- 公告轮播 -->
      <AnnouncementCarousel />

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
            <router-view v-slot="{ Component }">
              <keep-alive :include="cachedViews">
                <component :is="Component" />
              </keep-alive>
            </router-view>
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
      :is-default-password="isDefaultPassword"
      :is-expired="isPasswordExpired"
      @close="showPasswordChangeModal = false"
      @success="handlePasswordChangeSuccess"
    />

    <!-- 密码过期提醒弹窗 -->
    <PasswordReminderModal
      :visible="showPasswordReminderModal"
      :remaining-days="passwordRemainingDays"
      :last-changed="userStore.user?.passwordLastChanged"
      @close="handlePasswordReminderClose"
      @change-password="handlePasswordReminderChangePassword"
      @remind-later="handlePasswordReminderLater"
    />

    <!-- 个人设置弹窗 -->
    <PersonalSettingsModal
      v-model:visible="showPersonalSettingsModal"
      @success="handlePersonalSettingsSuccess"
    />
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
import { ElMessage, ElMessageBox } from 'element-plus'
import GlobalLoading from '@/components/GlobalLoading.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import PasswordChangeModal from '@/components/PasswordChangeModal.vue'
import PasswordReminderModal from '@/components/PasswordReminderModal.vue'
import PersonalSettingsModal from '@/components/PersonalSettingsModal.vue'
import StorageModeSwitch from '@/components/StorageModeSwitch.vue'
import HelpCenter from '@/components/HelpCenter.vue'
import MessageBell from '@/components/MessageBell.vue'
import AnnouncementCarousel from '@/components/AnnouncementCarousel.vue'
import { useResponsive, debounce } from '@/utils/responsive'
import { passwordService } from '@/services/passwordService'
import { passwordReminderService } from '@/services/passwordReminderService'
import IconHeadset from '@/components/icons/IconHeadset.vue'
import IconCustomerService from '@/components/icons/IconCustomerService.vue'
import DynamicMenu from '@/components/DynamicMenu.vue'
import { createSafeNavigator } from '@/utils/navigation'
import { 
  Menu, TrendCharts, User, ArrowDown, Odometer, ShoppingCart, 
  Box, Setting, Headset, CustomerService 
} from '@element-plus/icons-vue'


const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const tabsStore = useTabsStore()
const appStore = useAppStore()
const configStore = useConfigStore()
const notificationStore = useNotificationStore()
const orderStore = useOrderStore()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)

// 响应式状态
const isCollapsed = ref(false)
const { isMobile, isTablet, isDesktop, deviceType } = useResponsive()



// 密码管理相关状态
const showPasswordChangeModal = ref(false)
const showPasswordReminderModal = ref(false)
const isForcePasswordChange = ref(false)
const isDefaultPassword = ref(false)
const isPasswordExpired = ref(false)
const passwordRemainingDays = ref(0)
const dontRemindTodayKey = ref('')

// 个人设置相关状态
const showPersonalSettingsModal = ref(false)





// 计算属性
const isLoginPage = computed(() => {
  return route.path === '/login' || !userStore.token
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

    userStore.logout()
    tabsStore.clearTabs()
    ElMessage.success('退出登录成功')
    safeNavigator.push('/login')
  } catch {
    // 用户取消
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

    // 使用安全导航器进行导航
    safeNavigator.push(index).catch(err => {
      console.error('菜单导航失败:', err)
      ElMessage.error(`页面导航失败: ${err.message || '未知错误'}`)
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

  // 初始化用户密码信息
  passwordService.initializeUserPasswordInfo(user.id)

  // 检查是否为默认密码
  isDefaultPassword.value = user.isDefaultPassword || false

  // 检查密码是否过期
  isPasswordExpired.value = passwordService.isPasswordExpired(user)

  // 检查是否强制修改密码
  isForcePasswordChange.value = user.forcePasswordChange || false

  // 计算密码剩余天数
  passwordRemainingDays.value = passwordService.getPasswordRemainingDays(user)

  // 设置今日提醒键
  dontRemindTodayKey.value = `password_reminder_${user.id}_${new Date().toDateString()}`

  // 如果需要强制修改密码，显示强制修改弹窗（但允许关闭）
  if (isDefaultPassword.value || isPasswordExpired.value || isForcePasswordChange.value) {
    showPasswordChangeModal.value = true
    // 修改：不再强制，允许用户关闭
    isForcePasswordChange.value = false
    return
  }

  // 检查是否需要密码过期提醒
  if (passwordService.needsPasswordReminder(user)) {
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
  if (isLoggedIn && userStore.user) {
    checkPasswordStatus()
    startPasswordReminder()
  } else {
    stopPasswordReminder()
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  checkMobile()

  // 初始化配置
  configStore.initConfig()

  // 初始化密码提醒服务
  passwordReminderService.init()

  // 注意：用户信息初始化已在main.ts中完成，这里不再重复调用
  // userStore.initUser() // 移除重复调用

  // 初始化网络监听器
  appStore.initNetworkListener()

  // 初始化示例消息
  initSampleMessages()

  // 启动订单流转检查定时器（每30秒检查一次）
  startOrderTransferTimer()

  // 初始化侧边栏菜单滚轮事件
  initSidebarWheelScroll()

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

  if (orderTransferTimer) {
    clearInterval(orderTransferTimer)
    orderTransferTimer = null
  }
})

// 初始化示例消息
const initSampleMessages = () => {
  // 导入消息类型
  const { MessageType } = notificationStore

  // 发送一些示例消息
  notificationStore.sendMessage(
    MessageType.ORDER_SIGNED,
    '客户张三的订单 #20240120001 已成功签收，请及时跟进后续服务。',
    { relatedId: '20240120001', relatedType: 'order' }
  )

  notificationStore.sendMessage(
    MessageType.AUDIT_REJECTED,
    '订单 #20240120002 审核被拒绝，原因：商品信息不完整，请重新提交。',
    { relatedId: '20240120002', relatedType: 'order' }
  )

  notificationStore.sendMessage(
    MessageType.ORDER_SHIPPED,
    '订单 #20240120003 已从仓库发出，物流单号：SF1234567890，预计2-3天到达。',
    { relatedId: '20240120003', relatedType: 'order' }
  )

  notificationStore.sendMessage(
    MessageType.PACKAGE_ANOMALY,
    '订单 #20240120004 的包裹在运输过程中出现异常，请联系物流公司处理。',
    { relatedId: '20240120004', relatedType: 'order' }
  )

  notificationStore.sendMessage(
    MessageType.CUSTOMER_CALL,
    '客户李四（手机：138****5678）来电咨询订单进度，请及时回复。',
    { relatedId: 'customer_001', relatedType: 'customer' }
  )

  // 标记第三条消息为已读
  setTimeout(() => {
    const messages = notificationStore.messages
    if (messages.length >= 3) {
      notificationStore.markAsRead(messages[2].id)
    }
  }, 100)
}

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
  font-size: 20px;
  cursor: pointer;
  color: #606266;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: bold;
  color: #409eff;
}

.logo-text {
  color: #303133;
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

.username {
  font-size: 14px;
  color: #606266;
}

.sidebar {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  overflow: hidden;
  height: calc(100vh - 108px);
  max-height: calc(100vh - 108px);
  position: relative;

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
  height: calc(100vh - 60px);
  width: 100%;
  min-width: 0;
  flex: 1;
  transition: margin-left 0.3s;
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
  overflow: auto;
  width: 100%;
  min-height: 0;
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

  .main-content {
    height: calc(100vh - 112px);
    width: 100%;
  }

  .page-content {
    padding: 24px 32px;
    width: 100%;
    max-width: none;
  }

  .sidebar {
    min-width: 260px;
  }

  .sidebar:not(.sidebar-collapsed) {
    width: 260px !important;
  }

  .sidebar {
    height: calc(100vh - 112px) !important;
    max-height: calc(100vh - 112px) !important;
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

  .main-content {
    height: calc(100vh - 104px);
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
    height: calc(100vh - 104px) !important;
    max-height: calc(100vh - 104px) !important;
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


</style>
