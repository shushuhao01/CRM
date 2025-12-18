<template>
  <div class="help-center-container">
    <!-- 顶部搜索栏 -->
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
          default-active="project-overview"
          :default-openeds="['project', 'business', 'deployment', 'modules', 'faq']"
          @select="handleMenuSelect"
          class="help-menu"
        >
          <el-sub-menu index="project">
            <template #title>
              <el-icon><InfoFilled /></el-icon>
              <span>项目介绍</span>
            </template>
            <el-menu-item index="project-overview">系统概述</el-menu-item>
            <el-menu-item index="project-features">核心特性</el-menu-item>
            <el-menu-item index="project-architecture">技术架构</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="business">
            <template #title>
              <el-icon><Operation /></el-icon>
              <span>业务逻辑</span>
            </template>
            <el-menu-item index="business-logic">业务流程</el-menu-item>
            <el-menu-item index="business-rules">业务规则</el-menu-item>
            <el-menu-item index="business-integration">系统集成</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="deployment">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>部署步骤</span>
            </template>
            <el-menu-item index="deployment-guide">部署指南</el-menu-item>
            <el-menu-item index="deployment-config">配置说明</el-menu-item>
            <el-menu-item index="deployment-troubleshoot">故障排除</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="modules">
            <template #title>
              <el-icon><Grid /></el-icon>
              <span>功能模块</span>
            </template>
            <el-menu-item index="system-modules">系统功能模块</el-menu-item>
            <el-menu-item index="module-customer">客户管理</el-menu-item>
            <el-menu-item index="module-order">订单管理</el-menu-item>
            <el-menu-item index="module-product">商品管理</el-menu-item>
            <el-menu-item index="module-finance">财务管理</el-menu-item>
            <el-menu-item index="module-report">报表统计</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="faq">
            <template #title>
              <el-icon><QuestionFilled /></el-icon>
              <span>常见问题</span>
            </template>
            <el-menu-item index="faq-login">登录问题</el-menu-item>
            <el-menu-item index="faq-operation">操作问题</el-menu-item>
            <el-menu-item index="faq-data">数据问题</el-menu-item>
            <el-menu-item index="faq-performance">性能问题</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </div>

      <!-- 右侧内容区域 -->
      <div class="content-area">
        <div class="content-wrapper">
          <!-- 搜索结果 -->
          <div v-if="isSearching" class="search-results">
            <div class="search-header">
              <h3>搜索结果 ({{ searchResults.length }})</h3>
              <el-button @click="clearSearch" size="small" type="text" icon="Close">清除搜索</el-button>
            </div>
            <div v-if="searchResults.length === 0" class="no-results">
              <el-empty description="未找到相关内容">
                <template #description>
                  <p>尝试使用不同的关键词或浏览左侧目录</p>
                </template>
              </el-empty>
            </div>
            <div v-else class="results-list">
              <div
                v-for="result in searchResults"
                :key="result.id"
                class="result-item"
                @click="selectSearchResult(result)"
              >
                <div class="result-header">
                  <h4 v-html="highlightText(result.title, searchQuery)"></h4>
                  <span class="result-category">{{ result.category }}</span>
                </div>
                <p class="result-excerpt" v-html="highlightText(result.excerpt, searchQuery)"></p>
                <div class="result-footer">
                  <span class="result-score">匹配度: {{ result.score || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 正常内容显示 -->
          <div v-else class="help-content">
            <component :is="currentContentComponent" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { Search, InfoFilled, Operation, Setting, Grid, QuestionFilled } from '@element-plus/icons-vue'

// 动态导入帮助内容组件
const helpContentComponents = {
  'project-overview': defineAsyncComponent(() => import('@/components/HelpContent/ProjectOverview.vue')),
  'business-logic': defineAsyncComponent(() => import('@/components/HelpContent/BusinessLogic.vue')),
  'deployment-guide': defineAsyncComponent(() => import('@/components/HelpContent/DeploymentGuide.vue')),
  'system-modules': defineAsyncComponent(() => import('@/components/HelpContent/SystemModules.vue')),
  'module-customer': defineAsyncComponent(() => import('@/components/HelpContent/ModuleCustomer.vue')),
  'module-order': defineAsyncComponent(() => import('@/components/HelpContent/ModuleOrder.vue')),
  'faq-login': defineAsyncComponent(() => import('@/components/HelpContent/FaqLogin.vue')),
  // 默认组件
  'default': defineAsyncComponent(() => import('@/components/HelpContent/ProjectOverview.vue'))
}

// 搜索相关
const searchQuery = ref('')
const isSearching = ref(false)
const searchResults = ref<any[]>([])

// 菜单相关
const activeMenuItem = ref('project-overview')

// 搜索功能
const handleSearch = (value: string) => {
  if (value.trim()) {
    isSearching.value = true
    const query = value.toLowerCase()

    // 智能搜索：支持标题、摘要、分类和内容搜索
    searchResults.value = mockSearchResults.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(query)
      const excerptMatch = item.excerpt.toLowerCase().includes(query)
      const categoryMatch = item.category.toLowerCase().includes(query)
      const contentMatch = item.content.toLowerCase().includes(query)

      return titleMatch || excerptMatch || categoryMatch || contentMatch
    }).map(item => {
      // 计算匹配度分数，用于排序
      let score = 0
      const query_lower = query.toLowerCase()

      if (item.title.toLowerCase().includes(query_lower)) score += 10
      if (item.category.toLowerCase().includes(query_lower)) score += 5
      if (item.excerpt.toLowerCase().includes(query_lower)) score += 3
      if (item.content.toLowerCase().includes(query_lower)) score += 1

      return { ...item, score }
    }).sort((a, b) => b.score - a.score) // 按匹配度排序
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

// 高亮搜索关键词（安全版本，防止XSS）
const highlightText = (text: string, query: string) => {
  if (!text) return ''
  // 先转义HTML特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  if (!query || !query.trim()) return escaped

  // 转义查询字符串中的正则特殊字符
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedQuery})`, 'gi')
  return escaped.replace(regex, '<mark>$1</mark>')
}

// 菜单选择
const handleMenuSelect = (index: string) => {
  activeMenuItem.value = index
  clearSearch()
}

// 动态内容组件
const currentContentComponent = computed(() => {
  return helpContentComponents[activeMenuItem.value] || helpContentComponents['default']
})

// 模拟搜索数据
const mockSearchResults = [
  {
    id: 'project-overview',
    title: '系统概述',
    excerpt: '智能销售CRM系统是一个全面的客户关系管理平台...',
    category: '项目介绍',
    content: '智能销售CRM系统概述内容'
  },
  {
    id: 'business-logic',
    title: '业务流程',
    excerpt: '智能销售CRM系统的核心业务流程围绕客户生命周期管理展开...',
    category: '业务逻辑',
    content: '业务流程详细说明'
  },
  {
    id: 'deployment-guide',
    title: '部署指南',
    excerpt: '详细的系统部署步骤和环境配置说明，包括宝塔面板部署...',
    category: '部署步骤',
    content: '部署指南详细内容 宝塔面板 Docker 环境配置'
  },
  {
    id: 'system-modules',
    title: '系统功能模块',
    excerpt: '完整的系统功能模块介绍，包含10个主要功能模块和所有子菜单功能...',
    category: '功能模块',
    content: '数据看板 客户管理 订单管理 服务管理 业绩统计 物流管理 售后管理 资料管理 商品管理 系统管理 菜单 权限'
  },
  {
    id: 'module-customer',
    title: '客户管理',
    excerpt: '客户管理模块提供完整的客户信息管理功能...',
    category: '功能模块',
    content: '客户管理功能详细说明'
  },
  {
    id: 'module-order',
    title: '订单管理',
    excerpt: '订单管理模块负责处理从订单创建到订单完成的整个生命周期...',
    category: '功能模块',
    content: '订单管理功能详细说明'
  },
  {
    id: 'faq-login',
    title: '登录问题',
    excerpt: '常见的登录问题及解决方案...',
    category: '常见问题',
    content: '登录问题解决方案'
  },
  // 更多搜索结果...
]

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  // Ctrl/Cmd + K 快速聚焦搜索框
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    const searchInput = document.querySelector('.search-input input') as HTMLInputElement
    if (searchInput) {
      searchInput.focus()
    }
  }

  // ESC 清除搜索
  if (event.key === 'Escape' && isSearching.value) {
    clearSearch()
  }
}

onMounted(() => {
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.help-center-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
}

.search-header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-wrapper {
  max-width: 600px;
  margin: 0 auto;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.sidebar-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.help-menu {
  border: none;
}

.help-menu .el-sub-menu__title {
  height: 48px;
  line-height: 48px;
  padding-left: 20px !important;
  font-weight: 500;
}

.help-menu .el-menu-item {
  height: 40px;
  line-height: 40px;
  padding-left: 50px !important;
  font-size: 14px;
}

.help-menu .el-menu-item:hover {
  background-color: #f5f7fa;
}

.help-menu .el-menu-item.is-active {
  background-color: #ecf5ff;
  color: #409eff;
  border-right: 3px solid #409eff;
}

.content-area {
  flex: 1;
  background: white;
  overflow-y: auto;
}

.content-wrapper {
  padding: 30px;
  max-width: 1000px;
  margin: 0 auto;
}

.search-results {
  padding: 20px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e9ecef;
}

.search-header h3 {
  color: #2c3e50;
  margin: 0;
  font-size: 20px;
}

.no-results {
  text-align: center;
  padding: 40px 20px;
}

.no-results p {
  color: #7f8c8d;
  margin-top: 10px;
}

.results-list {
  margin-top: 20px;
}

.result-item {
  background: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.result-item:hover {
  border-color: #3498db;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  transform: translateY(-2px);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.result-item h4 {
  color: #2c3e50;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  flex: 1;
}

.result-category {
  background: #3498db;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 15px;
  white-space: nowrap;
}

.result-excerpt {
  color: #34495e;
  margin: 10px 0;
  line-height: 1.6;
  font-size: 14px;
}

.result-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #f8f9fa;
}

.result-score {
  color: #7f8c8d;
  font-size: 12px;
  background: #f8f9fa;
  padding: 2px 8px;
  border-radius: 10px;
}

/* 搜索高亮样式 */
:deep(mark) {
  background: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
  font-weight: 600;
}

.help-content {
  min-height: 500px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
  }

  .sidebar {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .content-wrapper {
    padding: 20px;
  }
}
</style>
