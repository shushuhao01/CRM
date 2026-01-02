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
  Money
} from '@element-plus/icons-vue'
import { menuConfig } from '@/config/menu'
import { getUserAccessibleMenus } from '@/utils/menu'
import { useUserStore } from '@/stores/user'

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
  IconCustomerService: User, // 临时使用User图标
  IconHeadset: User // 临时使用User图标
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

// 🔥 批次279修复: 添加菜单刷新键，用于强制更新菜单
const menuRefreshKey = ref(0)

// 当前激活的菜单
const activeMenu = computed(() => route.path)

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
    console.log('[DynamicMenu] 🔄 权限已加载，强制刷新菜单 (key:', menuRefreshKey.value, ')')
  }
}, { deep: true, immediate: true })

// 获取用户可访问的菜单
const accessibleMenus = computed(() => {
  // 添加menuRefreshKey作为依赖，确保权限变化时重新计算
  const _ = menuRefreshKey.value

  console.log('[DynamicMenu] 开始计算可访问菜单 (刷新键:', _, ')')
  console.log('[DynamicMenu] 当前用户:', userStore.currentUser)
  console.log('[DynamicMenu] 用户权限:', userStore.permissions)
  console.log('[DynamicMenu] 菜单配置:', menuConfig)

  const menus = getUserAccessibleMenus(menuConfig)
  console.log('[DynamicMenu] 过滤后的菜单:', menus)

  return menus
})

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
