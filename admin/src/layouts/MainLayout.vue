<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapse ? '64px' : '240px'" class="aside">
      <div class="logo" @click="router.push('/')">
        <el-icon :size="28" color="#409eff"><Platform /></el-icon>
        <transition name="fade">
          <span v-show="!isCollapse" class="logo-text">平台管理后台</span>
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
        <el-menu-item index="/">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>

        <el-sub-menu index="/private-customers">
          <template #title>
            <el-icon><Key /></el-icon>
            <span>私有客户</span>
          </template>
          <el-menu-item index="/private-customers/list">客户列表</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/tenant-customers">
          <template #title>
            <el-icon><OfficeBuilding /></el-icon>
            <span>租户客户</span>
          </template>
          <el-menu-item index="/tenant-customers/list">客户列表</el-menu-item>
          <el-menu-item index="/tenant-customers/packages">套餐管理</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/modules">
          <template #title>
            <el-icon><Menu /></el-icon>
            <span>模块服务</span>
          </template>
          <el-menu-item index="/modules/list">模块列表</el-menu-item>
          <el-menu-item index="/modules/config">基础配置</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/payment">
          <template #title>
            <el-icon><Wallet /></el-icon>
            <span>支付管理</span>
          </template>
          <el-menu-item index="/payment/list">支付列表</el-menu-item>
          <el-menu-item index="/payment/config">支付配置</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/versions">
          <template #title>
            <el-icon><Upload /></el-icon>
            <span>版本发布</span>
          </template>
          <el-menu-item index="/versions/list">版本列表</el-menu-item>
          <el-menu-item index="/versions/upload">上传新版本</el-menu-item>
          <el-menu-item index="/versions/changelog">更新日志</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/api">
          <template #title>
            <el-icon><Connection /></el-icon>
            <span>接口管理</span>
          </template>
          <el-menu-item index="/api/list">接口列表</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="/settings">
          <template #title>
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </template>
          <el-menu-item index="/settings/admins">管理员账号</el-menu-item>
          <el-menu-item index="/settings/basic">基础配置</el-menu-item>
        </el-sub-menu>
      </el-menu>

      <div class="collapse-btn" @click="isCollapse = !isCollapse">
        <el-icon :size="18">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
      </div>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{ item }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
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
        <span>© 2024 CRM Platform Admin v1.0.0</span>
      </el-footer>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  Platform, DataAnalysis, Key, Upload, Menu, Setting, Wallet, Connection,
  Fold, Expand, ArrowDown, User, Lock, SwitchButton, OfficeBuilding
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isCollapse = ref(false)
const defaultOpeneds = ref<string[]>([])

const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta?.title)
  return matched.map(item => item.meta?.title as string)
})

onMounted(() => {
  userStore.fetchProfile()
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
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 12px;
  background: #fff;
  border-top: 1px solid #e6e6e6;
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
</style>
