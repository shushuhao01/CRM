<template>
  <div class="member-layout">
    <div class="member-container">
      <!-- 侧边菜单 -->
      <aside class="member-sidebar">
        <div class="member-info">
          <div class="avatar">{{ tenantName?.charAt(0) || '会' }}</div>
          <div class="info-text">
            <h4>{{ tenantName || '会员中心' }}</h4>
            <p>{{ tenantCode || '' }}</p>
          </div>
        </div>
        <nav class="member-nav">
          <router-link to="/member/dashboard" class="nav-item" active-class="active">
            <span class="nav-icon">📊</span>
            <span>概览</span>
          </router-link>
          <router-link to="/member/profile" class="nav-item" active-class="active">
            <span class="nav-icon">👤</span>
            <span>企业信息</span>
          </router-link>
          <router-link to="/member/subscription" class="nav-item" active-class="active">
            <span class="nav-icon">🔄</span>
            <span>订阅管理</span>
          </router-link>
          <router-link to="/member/bills" class="nav-item" active-class="active">
            <span class="nav-icon">📋</span>
            <span>账单记录</span>
          </router-link>
          <router-link to="/member/license" class="nav-item" active-class="active">
            <span class="nav-icon">🔐</span>
            <span>授权信息</span>
          </router-link>
          <router-link to="/member/password" class="nav-item" active-class="active">
            <span class="nav-icon">🔧</span>
            <span>修改密码</span>
          </router-link>
          <router-link to="/member/capacity" class="nav-item" active-class="active">
            <span class="nav-icon">📈</span>
            <span>扩容管理</span>
          </router-link>
          <router-link to="/member/renew" class="nav-item" active-class="active">
            <span class="nav-icon">💳</span>
            <span>续费升级</span>
          </router-link>
        </nav>
        <div class="sidebar-footer">
          <a v-if="crmUrl" :href="crmUrl" target="_blank" class="crm-link">
            💼 进入CRM系统
          </a>
        </div>
      </aside>
      <!-- 内容区 -->
      <main class="member-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { getMemberTenant } from '@/api/member'
import { getWebsiteConfig } from '@/api/website-config'

const tenant = computed(() => getMemberTenant())
const tenantName = computed(() => tenant.value?.name || '')
const tenantCode = computed(() => tenant.value?.code || '')
const crmUrl = ref('')

onMounted(async () => {
  try {
    const config = await getWebsiteConfig()
    if (config.crmUrl) crmUrl.value = config.crmUrl
  } catch { /* 静默 */ }
})
</script>

<style lang="scss" scoped>
.member-layout {
  min-height: 100vh;
  background: #f5f7fa;
  padding-top: 80px;
}

.member-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 24px;
  align-items: start;
}

.member-sidebar {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  position: sticky;
  top: 100px;
}

.member-info {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 700;
  }

  .info-text {
    h4 {
      font-size: 15px;
      font-weight: 600;
      margin: 0 0 2px;
    }
    p {
      font-size: 12px;
      opacity: 0.8;
      margin: 0;
    }
  }
}

.member-nav {
  padding: 12px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  color: #64748b;
  text-decoration: none;
  font-size: 14px;
  transition: all 0.2s;
  border-left: 3px solid transparent;

  &:hover {
    background: #f8fafc;
    color: #334155;
  }

  &.active {
    background: #f0f0ff;
    color: #6366f1;
    border-left-color: #6366f1;
    font-weight: 600;
  }

  .nav-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
  }
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid #f1f5f9;
}

.crm-link {
  display: block;
  text-align: center;
  padding: 10px;
  background: #f8fafc;
  border-radius: 8px;
  color: #6366f1;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #f0f0ff;
  }
}

.member-content {
  min-height: 500px;
}

@media (max-width: 768px) {
  .member-container {
    grid-template-columns: 1fr;
    padding: 16px;
  }

  .member-sidebar {
    position: static;
  }

  .member-nav {
    display: flex;
    overflow-x: auto;
    padding: 8px;
    gap: 4px;
  }

  .nav-item {
    padding: 8px 14px;
    border-left: none;
    border-radius: 8px;
    white-space: nowrap;
    font-size: 13px;

    &.active {
      border-left-color: transparent;
      background: #6366f1;
      color: white;
    }
  }
}
</style>

