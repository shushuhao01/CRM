<template>
  <div class="wecom-standalone">
    <!-- 左侧菜单栏 -->
    <aside class="standalone-sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header">
        <span v-if="!isCollapsed" class="sidebar-title">企微管理</span>
        <el-icon v-else class="sidebar-icon-only"><ChatLineSquare /></el-icon>
      </div>
      <nav class="sidebar-nav">
        <div
          v-for="item in visibleMenuItems"
          :key="item.name"
          class="nav-item"
          :class="{ active: activeTab === item.name, locked: !hasPackagePermission(item.name) }"
          @click="handleMenuClick(item.name)"
          :title="item.label"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span v-if="!isCollapsed" class="nav-label">{{ item.label }}</span>
          <span v-if="!isCollapsed && !hasPackagePermission(item.name)" class="nav-lock">🔒</span>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="nav-item collapse-toggle" @click="isCollapsed = !isCollapsed">
          <el-icon :size="16"><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon>
          <span v-if="!isCollapsed" class="nav-label">收起菜单</span>
        </div>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="standalone-content">
      <!-- 套餐升级提示 -->
      <div v-if="showUpgradeHint" class="upgrade-hint-overlay">
        <div class="upgrade-hint-card">
          <div class="upgrade-icon">🔒</div>
          <h3>功能未开通</h3>
          <p>当前企微套餐不包含「{{ currentLockedLabel }}」功能，请升级套餐后使用</p>
          <div class="upgrade-actions">
            <el-button @click="activeTab = 'config'">返回</el-button>
            <el-button type="primary" @click="goToPackageTab">查看套餐</el-button>
          </div>
        </div>
      </div>
      <KeepAlive v-else :max="10">
        <component :is="currentComponent" :key="activeTab" />
      </KeepAlive>
    </main>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomStandalone' })
import { ref, computed, onMounted, onUnmounted, provide, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { ChatLineSquare, Fold, Expand } from '@element-plus/icons-vue'
import { loadWecomConfigs } from './composables/useWecomDemo'
import { getTenantPackage } from '@/api/wecom'
import { useUserStore } from '@/stores/user'
import { menuConfig } from '@/config/menu'
import { hasMenuPermission as checkMenuPerm } from '@/utils/menu'

const route = useRoute()
const userStore = useUserStore()
const isCollapsed = ref(false)
const tenantPackage = ref<any>(null)

// 向子组件提供独立窗口标识，用于隐藏 demo banner 等
provide('isWecomStandalone', true)

// 异步加载各企微页面组件
const componentMap: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  'config': defineAsyncComponent(() => import('./Config.vue')),
  'address-book': defineAsyncComponent(() => import('./AddressBook.vue')),
  'customer': defineAsyncComponent(() => import('./Customer.vue')),
  'customer-group': defineAsyncComponent(() => import('./CustomerGroup.vue')),
  'acquisition': defineAsyncComponent(() => import('./Acquisition.vue')),
  'contact-way': defineAsyncComponent(() => import('./ContactWay.vue')),
  'chat-archive': defineAsyncComponent(() => import('./ChatArchive.vue')),
  'ai-assistant': defineAsyncComponent(() => import('./AiAssistant.vue')),
  'service': defineAsyncComponent(() => import('./Service.vue')),
  'sidebar': defineAsyncComponent(() => import('./Sidebar.vue')),
  'payment': defineAsyncComponent(() => import('./Payment.vue')),
}

// 全量菜单定义（与独立窗口 componentMap 对应）
const allMenuItems = [
  { name: 'config', label: '企微授权', icon: '⚙️', configId: 'wecom-config' },
  { name: 'address-book', label: '通讯录', icon: '📒', configId: 'wecom-address-book' },
  { name: 'customer', label: '企业客户', icon: '👥', configId: 'wecom-customer' },
  { name: 'customer-group', label: '客户群', icon: '👨‍👩‍👧‍👦', configId: 'wecom-customer-group' },
  { name: 'acquisition', label: '获客助手', icon: '🎯', configId: 'wecom-acquisition' },
  { name: 'contact-way', label: '渠道活码', icon: '📎', configId: 'wecom-contact-way' },
  { name: 'chat-archive', label: '会话存档', icon: '💬', configId: 'wecom-chat-archive' },
  { name: 'ai-assistant', label: 'AI助手', icon: '🤖', configId: 'wecom-ai-assistant' },
  { name: 'service', label: '微信客服', icon: '🎧', configId: 'wecom-service' },
  { name: 'sidebar', label: '侧边栏', icon: '📱', configId: 'wecom-sidebar' },
  { name: 'payment', label: '对外收款', icon: '💰', configId: 'wecom-payment' },
]

// 根据当前用户角色权限过滤菜单（复用 CRM 主应用的 config/menu.ts 配置）
const visibleMenuItems = computed(() => {
  const userRole = userStore.currentUser?.role || ''
  const userPerms = userStore.permissions || []

  // 超级管理员/管理员显示全部
  if (userRole === 'super_admin' || userRole === 'admin' || userPerms.includes('*')) {
    return allMenuItems
  }

  // 从 menuConfig 中找到企微管理的子菜单配置
  const wecomMenuConfig = menuConfig.find(m => m.id === 'wecom')
  if (!wecomMenuConfig?.children) return allMenuItems

  return allMenuItems.filter(item => {
    // 在 config/menu.ts 中找到对应配置项
    const configItem = wecomMenuConfig.children!.find(c => c.id === item.configId)
    if (!configItem) return true // 未在配置中找到则默认显示
    // 使用与 CRM 主应用相同的权限检查函数
    return checkMenuPerm(configItem, userRole, userPerms)
  })
})

const activeTab = ref('config')

const currentComponent = computed(() => {
  return componentMap[activeTab.value] || componentMap['config']
})

const switchTab = (tab: string) => {
  activeTab.value = tab
  // 更新URL参数（不触发路由导航）
  const url = new URL(window.location.href)
  url.searchParams.set('tab', tab)
  window.history.replaceState({}, '', url.toString())
}

const menuPermissionMap: Record<string, string> = {
  'address-book': 'addressBook',
  'customer': 'customer',
  'customer-group': 'customerGroup',
  'acquisition': 'acquisition',
  'contact-way': 'contactWay',
  'chat-archive': 'chatArchive',
  'ai-assistant': 'aiAssistant',
  'sidebar': 'sidebar',
  'payment': 'payment',
  'service': 'customerService',
}

// 套餐权限检查（独立于角色权限，控制功能是否已购买/开通）
const hasPackagePermission = (menuName: string): boolean => {
  if (menuName === 'config') return true
  if (!tenantPackage.value || !tenantPackage.value.menuPermissions) return false
  const permKey = menuPermissionMap[menuName]
  if (!permKey) return true
  return tenantPackage.value.menuPermissions[permKey] === true
}

const showUpgradeHint = computed(() => {
  return activeTab.value !== 'config' && !hasPackagePermission(activeTab.value)
})
const currentLockedLabel = computed(() => {
  const item = allMenuItems.find(m => m.name === activeTab.value)
  return item?.label || activeTab.value
})

const handleMenuClick = (tab: string) => {
  activeTab.value = tab
  if (tab === 'config' || hasPackagePermission(tab)) {
    switchTab(tab)
  }
}

const goToPackageTab = () => {
  activeTab.value = 'config'
  // Navigate to package tab within Config
  const url = new URL(window.location.href)
  url.searchParams.set('tab', 'config')
  url.searchParams.set('configTab', 'package')
  window.history.replaceState({}, '', url.toString())
}

const reloadTenantPackage = async () => {
  try {
    const res: any = await getTenantPackage()
    tenantPackage.value = res?.data || res
    if (tenantPackage.value) {
      sessionStorage.setItem('wecom_tenant_package', JSON.stringify(tenantPackage.value))
    }
  } catch { /* ignore */ }
}

const onPackageChanged = () => { reloadTenantPackage() }

onMounted(async () => {
  // 确保用户会话已恢复（路由守卫已处理，此处做二次保障）
  if (!userStore.token) {
    await userStore.initUser()
  }

  // 根据URL参数或用户权限设置默认标签
  const tabParam = route.query.tab as string
  const validTabs = visibleMenuItems.value.map(m => m.name)
  if (tabParam && validTabs.includes(tabParam)) {
    activeTab.value = tabParam
  } else if (validTabs.length > 0 && !validTabs.includes(activeTab.value)) {
    // 当前默认标签不在用户可见菜单中，切换到第一个可见菜单
    activeTab.value = validTabs[0]
  }

  loadWecomConfigs()
  reloadTenantPackage()
  window.addEventListener('wecom-package-changed', onPackageChanged)
})

onUnmounted(() => {
  window.removeEventListener('wecom-package-changed', onPackageChanged)
})
</script>

<style scoped>
.wecom-standalone {
  display: flex;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

/* 左侧菜单栏 */
.standalone-sidebar {
  width: 200px;
  min-width: 200px;
  background: #1d1e1f;
  display: flex;
  flex-direction: column;
  transition: width 0.3s, min-width 0.3s;
  overflow: hidden;
  flex-shrink: 0;
}

.standalone-sidebar.collapsed {
  width: 56px;
  min-width: 56px;
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

.sidebar-icon-only {
  color: #409eff;
  font-size: 22px;
}

.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sidebar-nav::-webkit-scrollbar {
  width: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 16px;
  color: #a3a6ad;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  border-left: 3px solid transparent;
  font-size: 14px;
}

.nav-item:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #c0c4cc;
}

.nav-item.active {
  background: rgba(64, 158, 255, 0.2);
  color: #409eff;
  border-left-color: #409eff;
}

.collapsed .nav-item {
  justify-content: center;
  padding: 11px 0;
  border-left: none;
}

.nav-icon {
  font-size: 16px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 4px 0;
}

.collapse-toggle {
  font-size: 13px;
}

/* 右侧内容区 */
.standalone-content {
  flex: 1;
  overflow: auto;
  background: #f5f7fa;
  padding: 0;
}

/* Locked menu item */
.nav-item.locked {
  opacity: 0.55;
}
.nav-item.locked:hover {
  background: rgba(245, 108, 108, 0.1);
}
.nav-lock {
  margin-left: auto;
  font-size: 12px;
}

/* Upgrade hint overlay */
.upgrade-hint-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  background: #f5f7fa;
}
.upgrade-hint-card {
  text-align: center;
  padding: 48px 60px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
}
.upgrade-icon {
  font-size: 56px;
  margin-bottom: 16px;
}
.upgrade-hint-card h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1d2129;
  margin: 0 0 8px;
}
.upgrade-hint-card p {
  font-size: 14px;
  color: #86909c;
  margin: 0 0 24px;
  max-width: 360px;
}
.upgrade-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
</style>
