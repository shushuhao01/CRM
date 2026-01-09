<template>
  <div class="public-help-container">
    <!-- 顶部导航栏 -->
    <header class="public-header">
      <div class="header-content">
        <div class="logo-section">
          <img src="/logo.svg" alt="云客CRM" class="logo" />
          <span class="logo-text">云客CRM 帮助中心</span>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="goToLogin">登录系统</el-button>
        </div>
      </div>
    </header>

    <!-- 帮助中心主体内容 -->
    <main class="help-main">
      <!-- 搜索栏 -->
      <div class="search-header">
        <div class="search-wrapper">
          <el-input
            v-model="searchQuery"
            placeholder="搜索帮助内容..."
            size="large"
            clearable
            @input="handleSearch"
            @clear="clearSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <!-- 左侧目录 -->
        <div class="sidebar">
          <div class="sidebar-header">
            <h3>帮助目录</h3>
          </div>
          <el-menu
            :default-active="activeMenuItem"
            :default-openeds="['project', 'modules', 'roles', 'app', 'deployment', 'faq']"
            @select="handleMenuSelect"
            class="help-menu"
          >
            <!-- 项目介绍 -->
            <el-sub-menu index="project">
              <template #title>
                <el-icon><InfoFilled /></el-icon>
                <span>项目介绍</span>
              </template>
              <el-menu-item index="project-overview">系统概述</el-menu-item>
              <el-menu-item index="project-features">核心特性</el-menu-item>
              <el-menu-item index="project-architecture">技术架构</el-menu-item>
              <el-menu-item index="project-config">配置说明</el-menu-item>
              <el-menu-item index="project-troubleshoot">故障排除</el-menu-item>
            </el-sub-menu>

            <!-- 功能模块 -->
            <el-sub-menu index="modules">
              <template #title>
                <el-icon><Grid /></el-icon>
                <span>功能模块</span>
              </template>
              <el-menu-item index="module-dashboard">数据看板</el-menu-item>
              <el-menu-item index="module-customer">客户管理</el-menu-item>
              <el-menu-item index="module-order">订单管理</el-menu-item>
              <el-menu-item index="module-service-mgmt">服务管理</el-menu-item>
              <el-menu-item index="module-performance">业绩统计</el-menu-item>
              <el-menu-item index="module-logistics">物流管理</el-menu-item>
              <el-menu-item index="module-aftersale">售后管理</el-menu-item>
              <el-menu-item index="module-data">资料管理</el-menu-item>
              <el-menu-item index="module-finance">财务管理</el-menu-item>
              <el-menu-item index="module-product">商品管理</el-menu-item>
              <el-menu-item index="module-system">系统管理</el-menu-item>
            </el-sub-menu>

            <!-- 角色权限 -->
            <el-sub-menu index="roles">
              <template #title>
                <el-icon><UserFilled /></el-icon>
                <span>角色权限</span>
              </template>
              <el-menu-item index="role-overview">角色概述</el-menu-item>
              <el-menu-item index="role-super-admin">超级管理员</el-menu-item>
              <el-menu-item index="role-admin">管理员</el-menu-item>
              <el-menu-item index="role-dept-manager">部门经理</el-menu-item>
              <el-menu-item index="role-sales">销售员</el-menu-item>
              <el-menu-item index="role-customer-service">客服</el-menu-item>
              <el-menu-item index="role-permission-config">权限配置</el-menu-item>
            </el-sub-menu>

            <!-- 移动APP -->
            <el-sub-menu index="app">
              <template #title>
                <el-icon><Iphone /></el-icon>
                <span>移动APP</span>
              </template>
              <el-menu-item index="app-overview">APP概述</el-menu-item>
              <el-menu-item index="app-install">安装配置</el-menu-item>
              <el-menu-item index="app-login">登录绑定</el-menu-item>
              <el-menu-item index="app-call">通话功能</el-menu-item>
              <el-menu-item index="app-sync">数据同步</el-menu-item>
            </el-sub-menu>

            <!-- 部署指南 -->
            <el-sub-menu index="deployment">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>部署指南</span>
              </template>
              <el-menu-item index="deploy-private">私有部署</el-menu-item>
              <el-menu-item index="deploy-saas">SaaS版本</el-menu-item>
              <el-menu-item index="deploy-env">环境要求</el-menu-item>
              <el-menu-item index="deploy-database">数据库配置</el-menu-item>
              <el-menu-item index="deploy-nginx">Nginx配置</el-menu-item>
            </el-sub-menu>

            <!-- 常见问题 -->
            <el-sub-menu index="faq">
              <template #title>
                <el-icon><QuestionFilled /></el-icon>
                <span>常见问题</span>
              </template>
              <el-menu-item index="faq-login">登录问题</el-menu-item>
              <el-menu-item index="faq-operation">操作问题</el-menu-item>
              <el-menu-item index="faq-data">数据问题</el-menu-item>
              <el-menu-item index="faq-performance">性能问题</el-menu-item>
              <el-menu-item index="faq-app">APP问题</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </div>

        <!-- 右侧内容区域 -->
        <div class="content-area">
          <div class="content-wrapper">
            <!-- 搜索结果 -->
            <div v-if="isSearching" class="search-results">
              <div class="search-header-bar">
                <h3>搜索结果 ({{ searchResults.length }})</h3>
                <el-button @click="clearSearch" size="small" text>清除搜索</el-button>
              </div>
              <div v-if="searchResults.length === 0" class="no-results">
                <el-empty description="未找到相关内容" />
              </div>
              <div v-else class="results-list">
                <div
                  v-for="result in searchResults"
                  :key="result.id"
                  class="result-item"
                  @click="selectSearchResult(result)"
                >
                  <h4>{{ result.title }}</h4>
                  <p>{{ result.excerpt }}</p>
                  <span class="result-category">{{ result.category }}</span>
                </div>
              </div>
            </div>

            <!-- 正常内容显示 -->
            <div v-else class="help-content">
              <component :is="currentContentComponent" :is-public="true" />
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 底部版权信息 - 和主应用保持一致 -->
    <footer class="public-footer">
      <div class="footer-content">
        <span>版权归 {{ systemSettings.companyName || 'CRM系统' }} 所有</span>
        <span class="separator">|</span>
        <span>v{{ systemSettings.systemVersion || '1.0.0' }}</span>
        <span class="separator" v-if="systemSettings.websiteUrl">|</span>
        <a
          v-if="systemSettings.websiteUrl"
          :href="systemSettings.websiteUrl"
          target="_blank"
          class="footer-link"
        >
          官网
        </a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Search, InfoFilled, Grid, UserFilled, Iphone, Setting, QuestionFilled } from '@element-plus/icons-vue'

const router = useRouter()

// 系统设置（从公开API获取）
const systemSettings = reactive({
  systemName: 'CRM客户管理系统',
  systemVersion: '1.0.0',
  companyName: '',
  websiteUrl: ''
})

// 初始化时从公开API获取系统配置
onMounted(async () => {
  try {
    // 先从localStorage读取缓存
    const cachedConfig = localStorage.getItem('crm_public_config')
    if (cachedConfig) {
      const cached = JSON.parse(cachedConfig)
      Object.assign(systemSettings, cached)
    }

    // 然后从公开API获取最新配置
    const response = await fetch('/api/v1/system/basic-settings/public')
    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data) {
        Object.assign(systemSettings, result.data)
        // 缓存到localStorage
        localStorage.setItem('crm_public_config', JSON.stringify(result.data))
      }
    }
  } catch (e) {
    console.warn('获取公开系统配置失败:', e)
  }
})

// 动态导入帮助内容组件
const helpContentComponents: Record<string, any> = {
  'project-overview': defineAsyncComponent(() => import('@/components/HelpContent/ProjectOverview.vue')),
  'project-features': defineAsyncComponent(() => import('@/components/HelpContent/ProjectFeatures.vue')),
  'project-architecture': defineAsyncComponent(() => import('@/components/HelpContent/ProjectArchitecture.vue')),
  'project-config': defineAsyncComponent(() => import('@/components/HelpContent/ProjectConfig.vue')),
  'project-troubleshoot': defineAsyncComponent(() => import('@/components/HelpContent/ProjectTroubleshoot.vue')),
  'module-dashboard': defineAsyncComponent(() => import('@/components/HelpContent/ModuleDashboard.vue')),
  'module-customer': defineAsyncComponent(() => import('@/components/HelpContent/ModuleCustomer.vue')),
  'module-order': defineAsyncComponent(() => import('@/components/HelpContent/ModuleOrder.vue')),
  'module-service-mgmt': defineAsyncComponent(() => import('@/components/HelpContent/ModuleServiceMgmt.vue')),
  'module-performance': defineAsyncComponent(() => import('@/components/HelpContent/ModulePerformance.vue')),
  'module-logistics': defineAsyncComponent(() => import('@/components/HelpContent/ModuleLogistics.vue')),
  'module-aftersale': defineAsyncComponent(() => import('@/components/HelpContent/ModuleAftersale.vue')),
  'module-data': defineAsyncComponent(() => import('@/components/HelpContent/ModuleData.vue')),
  'module-finance': defineAsyncComponent(() => import('@/components/HelpContent/ModuleFinance.vue')),
  'module-product': defineAsyncComponent(() => import('@/components/HelpContent/ModuleProduct.vue')),
  'module-system': defineAsyncComponent(() => import('@/components/HelpContent/ModuleSystem.vue')),
  'role-overview': defineAsyncComponent(() => import('@/components/HelpContent/RoleOverview.vue')),
  'role-super-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleSuperAdmin.vue')),
  'role-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleAdmin.vue')),
  'role-dept-manager': defineAsyncComponent(() => import('@/components/HelpContent/RoleDeptManager.vue')),
  'role-sales': defineAsyncComponent(() => import('@/components/HelpContent/RoleSales.vue')),
  'role-customer-service': defineAsyncComponent(() => import('@/components/HelpContent/RoleCustomerService.vue')),
  'role-permission-config': defineAsyncComponent(() => import('@/components/HelpContent/RolePermissionConfig.vue')),
  'app-overview': defineAsyncComponent(() => import('@/components/HelpContent/AppOverview.vue')),
  'app-install': defineAsyncComponent(() => import('@/components/HelpContent/AppInstall.vue')),
  'app-login': defineAsyncComponent(() => import('@/components/HelpContent/AppLogin.vue')),
  'app-call': defineAsyncComponent(() => import('@/components/HelpContent/AppCall.vue')),
  'app-sync': defineAsyncComponent(() => import('@/components/HelpContent/AppSync.vue')),
  'deploy-private': defineAsyncComponent(() => import('@/components/HelpContent/DeployPrivate.vue')),
  'deploy-saas': defineAsyncComponent(() => import('@/components/HelpContent/DeploySaas.vue')),
  'deploy-env': defineAsyncComponent(() => import('@/components/HelpContent/DeployEnv.vue')),
  'deploy-database': defineAsyncComponent(() => import('@/components/HelpContent/DeployDatabase.vue')),
  'deploy-nginx': defineAsyncComponent(() => import('@/components/HelpContent/DeployNginx.vue')),
  'faq-login': defineAsyncComponent(() => import('@/components/HelpContent/FaqLogin.vue')),
  'faq-operation': defineAsyncComponent(() => import('@/components/HelpContent/FaqOperation.vue')),
  'faq-data': defineAsyncComponent(() => import('@/components/HelpContent/FaqData.vue')),
  'faq-performance': defineAsyncComponent(() => import('@/components/HelpContent/FaqPerformance.vue')),
  'faq-app': defineAsyncComponent(() => import('@/components/HelpContent/FaqApp.vue')),
  'default': defineAsyncComponent(() => import('@/components/HelpContent/ProjectOverview.vue'))
}

// 搜索相关
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<any[]>([])
const activeMenuItem = ref('project-overview')

// 搜索数据
const mockSearchResults = [
  { id: 'project-overview', title: '系统概述', excerpt: '云客CRM是一个全面的客户关系管理平台...', category: '项目介绍' },
  { id: 'project-features', title: '核心特性', excerpt: '系统提供数据驱动、效率提升、团队协作等核心价值...', category: '项目介绍' },
  { id: 'module-customer', title: '客户管理', excerpt: '客户列表、新增客户、客户分组、客户标签等功能...', category: '功能模块' },
  { id: 'module-order', title: '订单管理', excerpt: '订单列表、新增订单、订单审核、订单状态流转...', category: '功能模块' },
  { id: 'faq-login', title: '登录问题', excerpt: '常见的登录问题及解决方案...', category: '常见问题' },
  { id: 'faq-operation', title: '操作问题', excerpt: '系统操作相关的常见问题...', category: '常见问题' }
]

const handleSearch = (value: string) => {
  if (value.trim()) {
    isSearching.value = true
    const query = value.toLowerCase()
    searchResults.value = mockSearchResults.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.excerpt.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    )
  } else {
    clearSearch()
  }
}

const clearSearch = () => {
  isSearching.value = false
  searchResults.value = []
  searchQuery.value = ''
}

const selectSearchResult = (result: any) => {
  activeMenuItem.value = result.id
  clearSearch()
}

const handleMenuSelect = (index: string) => {
  activeMenuItem.value = index
  clearSearch()
}

const currentContentComponent = computed(() => {
  return helpContentComponents[activeMenuItem.value] || helpContentComponents['default']
})

const goToLogin = () => {
  router.push('/login')
}
</script>

<style scoped>
.public-help-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow-y: auto; /* 整个页面可滚动 */
}

/* 顶部导航 */
.public-header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* 移除 sticky，让整个页面滚动 */
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  height: 36px;
  width: auto;
}

.logo-text {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

/* 主体内容 */
.help-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.search-header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.search-wrapper {
  max-width: 600px;
  margin: 0 auto;
}

.main-content {
  flex: 1;
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  /* 移除高度限制，让整个页面滚动 */
}

/* 侧边栏 */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
  height: calc(100vh - 140px);
  overflow-y: auto; /* 侧边栏可滚动 */
  position: sticky;
  top: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.help-menu {
  border-right: none;
}

:deep(.el-menu-item) {
  height: 45px;
  line-height: 45px;
}

:deep(.el-sub-menu__title) {
  height: 50px;
  line-height: 50px;
}

/* 内容区域 */
.content-area {
  flex: 1;
  background: white;
  margin: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-y: auto; /* 内容区可滚动 */
  max-height: calc(100vh - 180px);
}

.content-wrapper {
  padding: 30px;
  max-width: 900px;
}

/* 搜索结果 */
.search-results {
  padding: 20px 0;
}

.search-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-header-bar h3 {
  margin: 0;
  color: #303133;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.result-item {
  padding: 15px 20px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.result-item:hover {
  background: #ecf5ff;
  transform: translateX(5px);
}

.result-item h4 {
  margin: 0 0 8px;
  color: #303133;
  font-size: 16px;
}

.result-item p {
  margin: 0 0 8px;
  color: #606266;
  font-size: 14px;
}

.result-category {
  font-size: 12px;
  color: #909399;
  background: #e4e7ed;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 底部版权信息 - 和主应用保持一致 */
.public-footer {
  background: transparent;
  padding: 20px;
  text-align: center;
  border-top: 1px solid #e4e7ed;
}

.footer-content {
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 3px;
}

.footer-content .separator {
  color: #c0c4cc;
  margin: 0 8px;
}

.footer-content .footer-link {
  color: #909399;
  text-decoration: none;
  transition: color 0.3s;
}

.footer-content .footer-link:hover {
  color: #409eff;
}

/* 响应式 */
@media (max-width: 768px) {
  .header-content {
    padding: 10px 15px;
  }

  .logo-text {
    font-size: 16px;
  }

  .main-content {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .content-area {
    margin: 10px;
  }

  .content-wrapper {
    padding: 20px;
  }
}
</style>
