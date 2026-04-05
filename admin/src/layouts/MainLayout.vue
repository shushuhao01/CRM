<template>
  <el-container class="layout-container" :class="{ 'is-mobile': isMobile }">
    <!-- 移动端遮罩 -->
    <div v-if="isMobile && showMobileMenu" class="mobile-overlay" @click="closeMobileMenu"></div>

    <el-aside
      :width="isMobile ? '240px' : (isCollapse ? '64px' : '240px')"
      class="aside"
      :class="{ 'mobile-aside': isMobile, 'mobile-aside-show': isMobile && showMobileMenu, 'mobile-aside-hide': isMobile && !showMobileMenu }"
    >
      <div class="logo" @click="router.push('/'); closeMobileMenu()">
        <el-icon :size="28" color="#409eff"><Platform /></el-icon>
        <transition name="fade">
          <span v-show="isMobile || !isCollapse" class="logo-text">平台管理后台</span>
        </transition>
      </div>

      <el-menu
        :default-active="activeMenu"
        :default-openeds="defaultOpeneds"
        :collapse="isCollapse"
        router
        class="menu"
        background-color="#1d1e1f"
        text-color="#a3a6ad"
        active-text-color="#409eff"
      >
        <!-- 仪表盘（所有人可见） -->
        <el-menu-item index="/">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <!-- 客户管理 -->
        <el-sub-menu v-if="hasMenu('customer-management')" index="/customer-management">
          <template #title>
            <el-icon><UserFilled /></el-icon>
            <span>客户管理</span>
          </template>
          <el-menu-item v-if="hasPerm('customer-management:all:view')" index="/customer-management/all">所有客户</el-menu-item>
          <el-menu-item v-if="hasPerm('customer-management:renewal:view')" index="/customer-management/renewal-reminders">续费提醒</el-menu-item>
        </el-sub-menu>

        <!-- 私有客户 -->
        <el-sub-menu v-if="hasMenu('private-customers')" index="/private-customers">
          <template #title>
            <el-icon><Key /></el-icon>
            <span>私有客户</span>
          </template>
          <el-menu-item v-if="hasPerm('private-customers:list:view')" index="/private-customers/list">客户列表</el-menu-item>
        </el-sub-menu>

        <!-- 租户客户 -->
        <el-sub-menu v-if="hasMenu('tenant-customers')" index="/tenant-customers">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>租户客户</span>
          </template>
          <el-menu-item v-if="hasPerm('tenant-customers:list:view')" index="/tenant-customers/list">客户列表</el-menu-item>
        </el-sub-menu>

        <!-- 套餐管理 -->
        <el-sub-menu v-if="hasMenu('package-management')" index="/package-management">
          <template #title>
            <el-icon><GoodsFilled /></el-icon>
            <span>套餐管理</span>
          </template>
          <el-menu-item v-if="hasPerm('tenant-customers:packages:view')" index="/package-management/packages">套餐管理</el-menu-item>
          <el-menu-item v-if="hasPerm('tenant-customers:packages:view')" index="/package-management/capacity">扩容管理</el-menu-item>
        </el-sub-menu>

        <!-- 模块服务 -->
        <el-sub-menu v-if="hasMenu('modules')" index="/modules">
          <template #title>
            <el-icon><Menu /></el-icon>
            <span>模块服务</span>
          </template>
          <el-menu-item v-if="hasPerm('modules:list:view')" index="/modules/list">模块列表</el-menu-item>
          <el-menu-item v-if="hasPerm('modules:config:view')" index="/modules/config">CRM配置</el-menu-item>
          <el-menu-item v-if="hasPerm('modules:distribute:view')" index="/modules/distribute">配置下发</el-menu-item>
          <el-menu-item v-if="hasPerm('modules:message:view')" index="/modules/message-management">消息管理</el-menu-item>
        </el-sub-menu>

        <!-- 支付管理 -->
        <el-sub-menu v-if="hasMenu('payment')" index="/payment">
          <template #title>
            <el-icon><Wallet /></el-icon>
            <span>支付管理</span>
          </template>
          <el-menu-item v-if="hasPerm('payment:list:view')" index="/payment/list">支付列表</el-menu-item>
          <el-menu-item v-if="hasPerm('payment:config:view')" index="/payment/config">支付配置</el-menu-item>
          <el-menu-item v-if="hasPerm('payment:reports:view')" index="/payment/reports">支付报表</el-menu-item>
        </el-sub-menu>

        <!-- 版本发布 -->
        <el-sub-menu v-if="hasMenu('versions')" index="/versions">
          <template #title>
            <el-icon><Upload /></el-icon>
            <span>版本发布</span>
          </template>
          <el-menu-item v-if="hasPerm('versions:list:view')" index="/versions/list">版本列表</el-menu-item>
          <el-menu-item v-if="hasPerm('versions:upload:view')" index="/versions/upload">上传新版本</el-menu-item>
          <el-menu-item v-if="hasPerm('versions:changelog:view')" index="/versions/changelog">更新日志</el-menu-item>
        </el-sub-menu>

        <!-- 接口管理 -->
        <el-sub-menu v-if="hasMenu('api')" index="/api">
          <template #title>
            <el-icon><Connection /></el-icon>
            <span>接口管理</span>
          </template>
          <el-menu-item v-if="hasPerm('api:list:view')" index="/api/list">接口列表</el-menu-item>
        </el-sub-menu>

        <!-- 系统设置 -->
        <el-sub-menu v-if="hasMenu('settings')" index="/settings">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item v-if="hasPerm('settings:admins:view')" index="/settings/admins">管理员账号</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:roles:view')" index="/settings/roles">角色管理</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:basic:view')" index="/settings/basic">运营配置</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:notification-templates:view')" index="/settings/notification-templates">通知模板</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:notification-service:view')" index="/settings/notification-service">通知服务</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:operation-logs:view')" index="/settings/operation-logs">操作日志</el-menu-item>
          <el-menu-item v-if="hasPerm('settings:recycle-bin:view')" index="/settings/recycle-bin">回收站</el-menu-item>
        </el-sub-menu>
      </el-menu>

      <div v-if="!isMobile" class="collapse-btn" @click="isCollapse = !isCollapse">
        <el-icon :size="18">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
      </div>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <el-icon v-if="isMobile" class="hamburger-btn" :size="22" @click="toggleMobileMenu">
            <Fold v-if="showMobileMenu" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{ item }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">

          <!-- 通知铃铛组件 -->
          <NotificationBell />

          <el-dropdown @command="handleCommand">
            <div class="user-info">
              <el-avatar :size="32" class="avatar">
                {{ userStore.user?.name?.charAt(0) || userStore.user?.username?.charAt(0) || 'A' }}
              </el-avatar>
              <span class="username">{{ userStore.user?.name || userStore.user?.username }}</span>
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>个人信息
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Lock /></el-icon>修改密码
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>

      <el-footer class="footer">
        <div class="footer-content">
          <span>{{ footerCopyright }}</span>
          <template v-if="siteConfig.icpNumber">
            <span class="footer-sep">|</span>
            <a href="https://beian.miit.gov.cn/" target="_blank" class="footer-link">{{ siteConfig.icpNumber }}</a>
          </template>
          <template v-if="siteConfig.policeNumber">
            <span class="footer-sep">|</span>
            <a href="http://www.beian.gov.cn/" target="_blank" class="footer-link">🛡️ {{ siteConfig.policeNumber }}</a>
          </template>
          <template v-if="siteConfig.techSupport">
            <span class="footer-sep">|</span>
            <span class="footer-tech">{{ siteConfig.techSupport }}</span>
          </template>
        </div>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Platform, DataAnalysis, Key, Upload, Menu, Setting, Wallet, Connection,
  Fold, Expand, ArrowDown, User, Lock, SwitchButton, OfficeBuilding, UserFilled, GoodsFilled
} from '@element-plus/icons-vue'
import NotificationBell from '@/components/NotificationBell.vue'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// ============ 权限辅助方法 ============
/**
 * 检查是否拥有指定菜单模块的访问权限
 * 只要拥有该模块下任一子权限即可显示对应的一级菜单
 */
const hasMenu = (moduleCode: string): boolean => {
  return userStore.hasMenuPermission(moduleCode)
}

/**
 * 检查是否拥有指定的细粒度权限码
 * 用于控制二级菜单和按钮的显隐
 */
const hasPerm = (permission: string): boolean => {
  return userStore.hasPermission(permission)
}

const isCollapse = ref(false)
const isMobile = ref(false)
const showMobileMenu = ref(false)
const defaultOpeneds = ref<string[]>([])

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// 系统配置（版权/备案信息）
const siteConfig = ref<{
  companyName?: string
  systemVersion?: string
  copyrightText?: string
  icpNumber?: string
  policeNumber?: string
  techSupport?: string
}>({})

// 动态版权文字
const footerCopyright = computed(() => {
  if (siteConfig.value.copyrightText) {
    return siteConfig.value.copyrightText
  }
  const year = new Date().getFullYear()
  const name = siteConfig.value.companyName || 'CRM Platform Admin'
  const version = siteConfig.value.systemVersion ? ` v${siteConfig.value.systemVersion}` : ''
  return `© ${year} ${name}${version}`
})

// 获取系统配置
const fetchSiteConfig = async () => {
  try {
    const res = await request.get('/system-config')
    if (res.data) {
      siteConfig.value = {
        companyName: res.data.companyName || '',
        systemVersion: res.data.systemVersion || '',
        copyrightText: res.data.copyrightText || '',
        icpNumber: res.data.icpNumber || '',
        policeNumber: res.data.policeNumber || '',
        techSupport: res.data.techSupport || ''
      }
    }
  } catch (e) {
    console.error('获取系统配置失败', e)
  }
}


const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched.map(item => item.meta?.title as string)
})

const checkScreenSize = () => {
  const width = window.innerWidth
  isMobile.value = width < MOBILE_BREAKPOINT
  if (width < TABLET_BREAKPOINT) {
    isCollapse.value = true
  }
  if (width >= TABLET_BREAKPOINT) {
    showMobileMenu.value = false
  }
}

const toggleMobileMenu = () => {
  if (isMobile.value) {
    showMobileMenu.value = !showMobileMenu.value
  } else {
    isCollapse.value = !isCollapse.value
  }
}

const closeMobileMenu = () => {
  if (isMobile.value) {
    showMobileMenu.value = false
  }
}

// 路由切换时自动关闭移动端菜单
watch(() => route.path, () => {
  closeMobileMenu()
})

onMounted(() => {
  userStore.fetchProfile()
  fetchSiteConfig()
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})

const handleCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/settings/admins')
      break
    case 'password':
      router.push('/settings/basic')
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      break
  }
}
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
}

.aside {
  background: #1d1e1f;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .logo-text {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
  }
}

.menu {
  flex: 1;
  border-right: none;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 0;
  }

  :deep(.el-sub-menu__title) {
    &:hover {
      background-color: rgba(64, 158, 255, 0.1) !important;
    }
  }

  :deep(.el-menu-item) {
    &:hover {
      background-color: rgba(64, 158, 255, 0.1) !important;
    }

    &.is-active {
      background-color: rgba(64, 158, 255, 0.2) !important;
    }
  }
}

.menu:not(.el-menu--collapse) {
  width: 240px;
}

.collapse-btn {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a3a6ad;
  cursor: pointer;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s;

  &:hover {
    color: #409eff;
    background: rgba(64, 158, 255, 0.1);
  }
}

.main-container {
  background: #f0f2f5;
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
}


.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.3s;

  &:hover {
    background: #f5f7fa;
  }

  .avatar {
    background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
    color: #fff;
    font-weight: 600;
  }

  .username {
    color: #303133;
    font-size: 14px;
  }
}

.main {
  padding: 20px;
  overflow-y: auto;
}

.footer {
  height: auto;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #e6e6e6;
  padding: 8px 16px;

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    text-align: center;
    line-height: 1.8;
  }

  .footer-sep {
    color: #dcdfe6;
    margin: 0 4px;
  }

  .footer-link {
    color: #909399;
    text-decoration: none;
    transition: color 0.3s;

    &:hover {
      color: #409eff;
    }
  }

  .footer-tech {
    color: #b0b3b8;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.2s;
}
.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}
.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

/* ====== 移动端遮罩 ====== */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 998;
  transition: opacity 0.3s;
}

/* ====== 移动端侧边栏 ====== */
.mobile-aside {
  position: fixed !important;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 999;
  transition: transform 0.3s ease;
}

.mobile-aside-hide {
  transform: translateX(-100%);
}

.mobile-aside-show {
  transform: translateX(0);
}

/* ====== 汉堡菜单按钮 ====== */
.hamburger-btn {
  cursor: pointer;
  margin-right: 12px;
  color: #606266;
  transition: color 0.3s;

  &:hover {
    color: #409eff;
  }
}

/* ====== 响应式布局 ====== */
@media screen and (max-width: 768px) {
  .layout-container.is-mobile {
    .main-container {
      margin-left: 0 !important;
    }
  }

  .header {
    padding: 0 12px !important;
  }

  .main {
    padding: 12px !important;
  }

  .footer {
    font-size: 11px !important;
  }

  .user-info {
    .username {
      display: none;
    }
  }
}

@media screen and (max-width: 1024px) and (min-width: 769px) {
  .header {
    padding: 0 16px !important;
  }

  .main {
    padding: 16px !important;
  }
}
</style>
