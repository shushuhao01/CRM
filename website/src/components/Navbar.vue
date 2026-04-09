<template>
  <nav class="navbar" :class="{ scrolled: isScrolled }">
    <div class="container navbar-content">
      <!-- Logo -->
      <router-link to="/" class="logo">
        <div class="logo-icon">
          <svg width="40" height="40" viewBox="0 0 44 44" fill="none">
            <defs>
              <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="100%" stop-color="#8b5cf6"/>
              </linearGradient>
            </defs>
            <rect width="44" height="44" rx="10" fill="url(#logoGrad)"/>
            <rect x="10" y="10" width="10" height="10" rx="2" fill="white"/>
            <circle cx="29" cy="15" r="5" fill="white" opacity="0.85"/>
            <rect x="10" y="24" width="10" height="10" rx="5" fill="white" opacity="0.7"/>
            <rect x="24" y="24" width="10" height="10" rx="2" fill="white"/>
          </svg>
        </div>
        <span class="logo-text">云客</span>
        <span class="logo-badge">CRM</span>
      </router-link>

      <!-- 导航菜单 -->
      <div class="nav-menu" :class="{ active: menuOpen }">
        <router-link to="/" class="nav-link" @click="menuOpen = false">首页</router-link>
        <router-link to="/features" class="nav-link" @click="menuOpen = false">功能特性</router-link>
        <router-link to="/pricing" class="nav-link" @click="menuOpen = false">价格方案</router-link>
        <router-link to="/solutions" class="nav-link" @click="menuOpen = false">解决方案</router-link>
        <router-link to="/docs" class="nav-link" @click="menuOpen = false">帮助文档</router-link>
        <router-link to="/about" class="nav-link" @click="menuOpen = false">关于我们</router-link>
      </div>

      <!-- 右侧按钮 -->
      <div class="nav-actions">
        <!-- 已登录状态 -->
        <template v-if="memberLoggedIn">
          <div class="user-dropdown" ref="userDropdownRef">
            <button class="btn-user" @click.stop="showDropdown = !showDropdown">
              <span class="user-avatar">{{ memberName?.charAt(0) || '会' }}</span>
              <span class="user-name">{{ memberName }}</span>
              <span class="arrow" :class="{ open: showDropdown }">▾</span>
            </button>
            <transition name="dropdown-fade">
              <div v-show="showDropdown" class="dropdown-menu">
                <router-link to="/member/dashboard" class="dropdown-item" @click="showDropdown = false">📊 会员中心</router-link>
                <router-link to="/member/subscription" class="dropdown-item" @click="showDropdown = false">🔄 订阅管理</router-link>
                <router-link to="/member/bills" class="dropdown-item" @click="showDropdown = false">📋 账单记录</router-link>
                <div class="dropdown-divider"></div>
                <a v-if="crmUrl" :href="crmUrl" target="_blank" class="dropdown-item">💼 CRM工作台</a>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item logout" @click="handleLogout">🚪 退出登录</button>
              </div>
            </transition>
          </div>
        </template>
        <!-- 未登录状态 -->
        <template v-else>
          <div class="login-dropdown" ref="loginDropdownRef">
            <button class="btn-login" @click.stop="showLoginMenu = !showLoginMenu">登录</button>
            <transition name="dropdown-fade">
              <div v-show="showLoginMenu" class="dropdown-menu">
                <router-link to="/member/login" class="dropdown-item" @click="showLoginMenu = false">👤 会员中心</router-link>
                <a v-if="crmUrl" :href="crmUrl" target="_blank" class="dropdown-item" @click="showLoginMenu = false">💼 CRM系统</a>
              </div>
            </transition>
          </div>
        </template>
        <router-link to="/register?plan=FREE_TRIAL" class="btn btn-primary btn-sm">免费试用</router-link>
      </div>

      <!-- 移动端菜单按钮 -->
      <button class="menu-toggle" @click="menuOpen = !menuOpen">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { isMemberLoggedIn, getMemberTenant, memberLogout } from '@/api/member'
import { getWebsiteConfig } from '@/api/website-config'

const router = useRouter()
const isScrolled = ref(false)
const menuOpen = ref(false)
const showDropdown = ref(false)
const showLoginMenu = ref(false)
const crmUrl = ref('') // 动态CRM系统地址
const memberCheckKey = ref(0)
const userDropdownRef = ref<HTMLElement | null>(null)
const loginDropdownRef = ref<HTMLElement | null>(null)

const memberLoggedIn = computed(() => {
  void memberCheckKey.value
  return isMemberLoggedIn()
})

const memberName = computed(() => {
  const tenant = getMemberTenant()
  return tenant?.name || '会员'
})

const handleLogout = () => {
  memberLogout()
  showDropdown.value = false
  memberCheckKey.value++
  router.push('/')
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

// 监听 storage 变化（其他标签页登录/登出）
const handleStorage = () => { memberCheckKey.value++ }

// 点击外部关闭下拉菜单
const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as Node
  if (userDropdownRef.value && !userDropdownRef.value.contains(target)) {
    showDropdown.value = false
  }
  if (loginDropdownRef.value && !loginDropdownRef.value.contains(target)) {
    showLoginMenu.value = false
  }
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll)
  window.addEventListener('storage', handleStorage)
  document.addEventListener('click', handleClickOutside)
  // 动态加载CRM系统地址
  try {
    const config = await getWebsiteConfig()
    if (config.crmUrl) crmUrl.value = config.crmUrl
  } catch { /* 使用默认空值 */ }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('storage', handleStorage)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="scss" scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  padding: 16px 0;
  transition: all 0.3s ease;

  &.scrolled {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.08);
    padding: 12px 0;
  }
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;

  &-text {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }

  &-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--primary);
    background: rgba(99, 102, 241, 0.1);
    padding: 4px 10px;
    border-radius: 20px;
  }
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  padding: 10px 18px;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: var(--radius);
  transition: all 0.2s ease;

  &:hover, &.router-link-active {
    color: var(--primary);
    background: rgba(99, 102, 241, 0.08);
  }
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-login {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);

  &:hover {
    color: var(--primary);
  }
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  padding: 8px;

  span {
    width: 24px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 2px;
    transition: all 0.3s ease;
  }
}

@media (max-width: 1024px) {
  .nav-menu {
    position: fixed;
    top: 70px;
    left: 0;
    right: 0;
    background: white;
    flex-direction: column;
    padding: 20px;
    box-shadow: var(--shadow-lg);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s ease;

    &.active {
      transform: translateY(0);
      opacity: 1;
      pointer-events: auto;
    }
  }

  .nav-link {
    width: 100%;
    text-align: center;
    padding: 14px;
  }

  .nav-actions {
    display: none;
  }

  .menu-toggle {
    display: flex;
  }
}

.login-dropdown, .user-dropdown {
  position: relative;
}

.btn-user {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1.5px solid #e2e8f0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  color: #475569;
  transition: all 0.2s;

  &:hover {
    border-color: #6366f1;
    color: #6366f1;
  }
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.user-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  font-size: 10px;
  color: #94a3b8;
  transition: transform 0.2s ease;

  &.open {
    transform: rotate(180deg);
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  min-width: 160px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  padding: 6px;
  padding-top: 12px;
  margin-top: 6px;
  z-index: 1001;

  // 透明桥接区域，防止鼠标移动到菜单过程中消失
  &::before {
    content: '';
    position: absolute;
    top: -8px;
    left: 0;
    right: 0;
    height: 8px;
  }
}

// 下拉菜单过渡动画
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: all 0.2s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.dropdown-item {
  display: block;
  padding: 9px 14px;
  font-size: 13px;
  color: #475569;
  text-decoration: none;
  border-radius: 6px;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
    color: #6366f1;
  }

  &.logout {
    color: #dc2626;
    &:hover { background: #fef2f2; }
  }
}

.dropdown-divider {
  height: 1px;
  background: #f1f5f9;
  margin: 4px 8px;
}
</style>
