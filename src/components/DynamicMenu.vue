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
      <el-sub-menu v-if="item.children && item.children.length > 0" :index="item.id">
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
import { computed, defineProps, defineEmits } from 'vue'
import { useRoute } from 'vue-router'
import { 
  Odometer, 
  User, 
  ShoppingCart, 
  TrendCharts, 
  Van, 
  Files, 
  Box, 
  Setting 
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

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 获取用户可访问的菜单
const accessibleMenus = computed(() => {
  return getUserAccessibleMenus(menuConfig)
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