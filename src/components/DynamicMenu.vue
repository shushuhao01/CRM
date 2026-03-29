<template>
  <el-menu
    :default-active="activeMenu"
    class="sidebar-menu"
    :collapse="collapse"
    :unique-opened="uniqueOpened"
    :router="router"
    @select="handleMenuSelect"
    @open="handleSubMenuOpen"
  >
    <template v-for="item in accessibleMenus" :key="item.id">
      <!-- 有子菜单的项 -->
      <el-sub-menu v-if="item.children && (item.children?.length || 0) > 0" :index="item.id">
        <template #title>
          <el-icon v-if="item.icon">
            <component :is="getIconComponent(item.icon)" />
          </el-icon>
          <span>{{ item.title }}</span>
        </template>

        <template v-for="child in item.children" :key="child.id">
          <el-menu-item v-if="child.path" :index="child.path">
            {{ child.title }}
          </el-menu-item>
        </template>
      </el-sub-menu>

      <!-- 没有子菜单的项 -->
      <el-menu-item v-else-if="item.path" :index="item.path">
        <el-icon v-if="item.icon">
          <component :is="getIconComponent(item.icon)" />
        </el-icon>
        <template #title>{{ item.title }}</template>
      </el-menu-item>
    </template>
  </el-menu>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Odometer,
  User,
  ShoppingCart,
  TrendCharts,
  Van,
  Files,
  Box,
  Setting,
  Money,
  Phone,
  Headset,
  ChatLineSquare
} from '@element-plus/icons-vue'
import { menuConfig } from '@/config/menu'
import { getUserAccessibleMenus } from '@/utils/menu'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

// 图标组件映射
const iconComponents = {
  Odometer,
  User,
  ShoppingCart,
  TrendCharts,
  Van,
  Files,
  Box,
  Setting,
  Money,
  Phone,
  Headset,
  ChatLineSquare,
  IconCustomerService: Phone, // 服务管理使用电话图标
  IconHeadset: Headset // 售后管理使用耳机图标
}

interface Props {
  collapse?: boolean
  uniqueOpened?: boolean
  router?: boolean
}

interface Emits {
  (e: 'select', index: string): void
  (e: 'open', index: string): void
}

const props = withDefaults(defineProps<Props>(), {
  collapse: false,
  uniqueOpened: true,
  router: true
})

const emit = defineEmits<Emits>()

const route = useRoute()
const userStore = useUserStore()
const configStore = useConfigStore()

// 🔥 批次279修复: 添加菜单刷新键，用于强制更新菜单
const menuRefreshKey = ref(0)

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 🔥 添加菜单加载状态
const accessibleMenus = ref<any[]>([])
const isLoadingMenus = ref(false)

// 🔥 加载菜单的异步函数
const loadMenus = async () => {
  isLoadingMenus.value = true
  try {
    console.log('[DynamicMenu] ========== 开始加载菜单 ==========')
    console.log('[DynamicMenu] menuConfig数量:', menuConfig.length)
    console.log('[DynamicMenu] 用户信息:', userStore.currentUser)
    console.log('[DynamicMenu] 用户权限数量:', userStore.permissions.length)

    let menus = await getUserAccessibleMenus(menuConfig)

    console.log('[DynamicMenu] getUserAccessibleMenus返回:', menus)
    console.log('[DynamicMenu] 返回菜单数量:', menus.length)

    // 🔥 安全检查：如果菜单为空，至少显示dashboard
    if (!menus || menus.length === 0) {
      console.warn('[DynamicMenu] ⚠️ 菜单为空，使用降级方案')
      const dashboardMenu = menuConfig.find(m => m.id === 'dashboard')
      if (dashboardMenu) {
        accessibleMenus.value = [dashboardMenu]
        console.log('[DynamicMenu] 降级方案：显示dashboard')
      } else {
        // 如果连dashboard都找不到，显示所有非隐藏菜单
        accessibleMenus.value = menuConfig.filter(item => !item.hidden)
        console.log('[DynamicMenu] 降级方案：显示所有非隐藏菜单')
      }
    } else {
      // 根据功能开关过滤菜单项
      const flags = configStore.featureFlags
      console.log('[DynamicMenu]', 'featureFlags:', JSON.stringify(flags))
      if (flags && typeof flags === 'object') {
        // 菜单ID与功能开关的映射表
        const menuFlagMap: Record<string, string> = {
          'system-api-management': 'apiManagement',
          'system-super-admin-panel': 'superAdminPanel',
          'order': 'order',
          'product': 'product',
        }
        // 过滤一级菜单
        menus = menus.filter(menu => {
          const flagKey = menuFlagMap[menu.id]
          if (flagKey && flags[flagKey] === false) return false
          return true
        })
        // 过滤二级子菜单
        menus = menus.map(menu => {
          if (menu.children) {
            return { ...menu, children: menu.children.filter(child => {
              const flagKey = menuFlagMap[child.id]
              if (flagKey && flags[flagKey] === false) return false
              return true
            }) }
          }
          return menu
        })
      }
      accessibleMenus.value = menus
      console.log('[DynamicMenu] ✅ 菜单加载成功')
    }

    console.log('[DynamicMenu] 最终显示的菜单:', accessibleMenus.value.map(m => ({ id: m.id, title: m.title })))
    console.log('[DynamicMenu] ========== 菜单加载完成 ==========')
  } catch (error) {
    console.error('[DynamicMenu] ❌ 菜单加载失败:', error)
    // 失败时使用同步方式（不过滤模块）
    accessibleMenus.value = menuConfig.filter(item => !item.hidden)
    console.log('[DynamicMenu] 使用降级菜单，数量:', accessibleMenus.value.length)
  } finally {
    isLoadingMenus.value = false
  }
}

// 🔥 批次279修复: 监听权限变化，权限加载完成后强制刷新菜单
watch(() => userStore.permissions, (newPermissions, oldPermissions) => {
  console.log('[DynamicMenu] 权限变化检测:', {
    旧权限数量: oldPermissions?.length || 0,
    新权限数量: newPermissions?.length || 0,
    新权限: newPermissions
  })

  // 如果权限从空变为有值，强制刷新菜单
  if ((!oldPermissions || oldPermissions.length === 0) && newPermissions && newPermissions.length > 0) {
    menuRefreshKey.value++
    loadMenus() // 重新加载菜单
    console.log('[DynamicMenu] 🔄 权限已加载，强制刷新菜单 (key:', menuRefreshKey.value, ')')
  }
}, { deep: true, immediate: true })

// 🔥 初始加载菜单
loadMenus()

// 监听功能开关变化，重新过滤菜单
watch(() => configStore.featureFlags, () => {
  loadMenus()
}, { deep: true })

// 获取图标组件
const getIconComponent = (iconName: string | any) => {
  if (typeof iconName === 'string') {
    return iconComponents[iconName as keyof typeof iconComponents] || User
  }
  return iconName
}

// 菜单选择事件
const handleMenuSelect = (index: string) => {
  emit('select', index)
}

// 子菜单展开事件
const handleSubMenuOpen = (index: string) => {
  emit('open', index)
}
</script>

<style scoped>
.sidebar-menu {
  border-right: none;
  height: 100%;
}

.sidebar-menu .el-menu-item {
  height: 50px;
  line-height: 50px;
}

.sidebar-menu .el-sub-menu .el-menu-item {
  height: 45px;
  line-height: 45px;
  padding-left: 60px !important;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
  border-right: 3px solid #409eff;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

.sidebar-menu .el-sub-menu__title:hover {
  background-color: #f5f7fa;
  color: #409eff;
}

/* 折叠状态下的样式 */
.sidebar-menu.el-menu--collapse {
  width: 64px;
}

.sidebar-menu.el-menu--collapse .el-menu-item,
.sidebar-menu.el-menu--collapse .el-sub-menu__title {
  text-align: center;
  padding: 0 20px !important;
}

.sidebar-menu.el-menu--collapse .el-menu-item span,
.sidebar-menu.el-menu--collapse .el-sub-menu__title span {
  display: none;
}
</style>
