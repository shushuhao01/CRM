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
        <a href="https://app.yunke-crm.com" target="_blank" class="btn-login">登录</a>
        <a :href="wechatServiceUrl" target="_blank" class="btn btn-primary btn-sm">免费试用</a>
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
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const menuOpen = ref(false)
const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
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
</style>
