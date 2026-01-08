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
import { Search, InfoFilled, Operation, Setting, Grid, QuestionFilled, UserFilled, Iphone } from '@element-plus/icons-vue'

// 动态导入帮助内容组件
const helpContentComponents: Record<string, any> = {
  // 项目介绍
  'project-overview': defineAsyncComponent(() => import('@/components/HelpContent/ProjectOverview.vue')),
  'project-features': defineAsyncComponent(() => import('@/components/HelpContent/ProjectFeatures.vue')),
  'project-architecture': defineAsyncComponent(() => import('@/components/HelpContent/ProjectArchitecture.vue')),
  'project-config': defineAsyncComponent(() => import('@/components/HelpContent/ProjectConfig.vue')),
  'project-troubleshoot': defineAsyncComponent(() => import('@/components/HelpContent/ProjectTroubleshoot.vue')),

  // 功能模块
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

  // 角色权限
  'role-overview': defineAsyncComponent(() => import('@/components/HelpContent/RoleOverview.vue')),
  'role-super-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleSuperAdmin.vue')),
  'role-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleAdmin.vue')),
  'role-dept-manager': defineAsyncComponent(() => import('@/components/HelpContent/RoleDeptManager.vue')),
  'role-sales': defineAsyncComponent(() => import('@/components/HelpContent/RoleSales.vue')),
  'role-customer-service': defineAsyncComponent(() => import('@/components/HelpContent/RoleCustomerService.vue')),
  'role-permission-config': defineAsyncComponent(() => import('@/components/HelpContent/RolePermissionConfig.vue')),

  // 移动APP
  'app-overview': defineAsyncComponent(() => import('@/components/HelpContent/AppOverview.vue')),
  'app-install': defineAsyncComponent(() => import('@/components/HelpContent/AppInstall.vue')),
  'app-login': defineAsyncComponent(() => import('@/components/HelpContent/AppLogin.vue')),
  'app-call': defineAsyncComponent(() => import('@/components/HelpContent/AppCall.vue')),
  'app-sync': defineAsyncComponent(() => import('@/components/HelpContent/AppSync.vue')),

  // 部署指南
  'deploy-private': defineAsyncComponent(() => import('@/components/HelpContent/DeployPrivate.vue')),
  'deploy-saas': defineAsyncComponent(() => import('@/components/HelpContent/DeploySaas.vue')),
  'deploy-env': defineAsyncComponent(() => import('@/components/HelpContent/DeployEnv.vue')),
  'deploy-database': defineAsyncComponent(() => import('@/components/HelpContent/DeployDatabase.vue')),
  'deploy-nginx': defineAsyncComponent(() => import('@/components/HelpContent/DeployNginx.vue')),

  // 常见问题
  'faq-login': defineAsyncComponent(() => import('@/components/HelpContent/FaqLogin.vue')),
  'faq-operation': defineAsyncComponent(() => import('@/components/HelpContent/FaqOperation.vue')),
  'faq-data': defineAsyncComponent(() => import('@/components/HelpContent/FaqData.vue')),
  'faq-performance': defineAsyncComponent(() => import('@/components/HelpContent/FaqPerformance.vue')),
  'faq-app': defineAsyncComponent(() => import('@/components/HelpContent/FaqApp.vue')),

  // 兼容旧的组件
  'business-logic': defineAsyncComponent(() => import('@/components/HelpContent/BusinessLogic.vue')),
  'deployment-guide': defineAsyncComponent(() => import('@/components/HelpContent/DeploymentGuide.vue')),
  'system-modules': defineAsyncComponent(() => import('@/components/HelpContent/SystemModules.vue')),

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
  // 项目介绍
  {
    id: 'project-overview',
    title: '系统概述',
    excerpt: '云客CRM是一个全面的客户关系管理平台，专为现代企业的销售团队设计...',
    category: '项目介绍',
    content: '云客CRM系统概述 客户管理 订单处理 业绩统计 物流跟踪 售后服务'
  },
  {
    id: 'project-features',
    title: '核心特性',
    excerpt: '系统提供数据驱动、效率提升、团队协作等核心价值...',
    category: '项目介绍',
    content: '核心特性 数据驱动 效率提升 团队协作 实时通知 权限管理'
  },
  {
    id: 'project-architecture',
    title: '技术架构',
    excerpt: 'Vue3 + TypeScript + Element Plus前端，Node.js + Express + MySQL后端...',
    category: '项目介绍',
    content: '技术架构 Vue3 TypeScript Element Plus Node.js Express MySQL WebSocket'
  },
  {
    id: 'project-config',
    title: '配置说明',
    excerpt: '系统配置包括基础设置、订单设置、物流设置、通知设置等...',
    category: '项目介绍',
    content: '配置说明 基础设置 订单设置 物流设置 通知设置 短信配置'
  },
  {
    id: 'project-troubleshoot',
    title: '故障排除',
    excerpt: '常见故障排查方法和解决方案...',
    category: '项目介绍',
    content: '故障排除 错误处理 日志查看 问题诊断 性能优化'
  },

  // 功能模块
  {
    id: 'module-dashboard',
    title: '数据看板',
    excerpt: '实时展示销售数据、订单统计、业绩排名等关键指标...',
    category: '功能模块',
    content: '数据看板 销售数据 订单统计 业绩排名 趋势分析 实时更新'
  },
  {
    id: 'module-customer',
    title: '客户管理',
    excerpt: '客户列表、新增客户、客户分组、客户标签等功能...',
    category: '功能模块',
    content: '客户管理 客户列表 新增客户 客户分组 客户标签 客户详情 跟进记录'
  },
  {
    id: 'module-order',
    title: '订单管理',
    excerpt: '订单列表、新增订单、订单审核、订单状态流转...',
    category: '功能模块',
    content: '订单管理 订单列表 新增订单 订单审核 订单详情 状态流转 提审 审核通过 审核拒绝'
  },
  {
    id: 'module-service-mgmt',
    title: '服务管理',
    excerpt: '通话管理、短信管理、通话记录、录音回放...',
    category: '功能模块',
    content: '服务管理 通话管理 短信管理 通话记录 录音回放 跟进记录 外呼任务'
  },
  {
    id: 'module-performance',
    title: '业绩统计',
    excerpt: '个人业绩、团队业绩、业绩分析、业绩分享...',
    category: '功能模块',
    content: '业绩统计 个人业绩 团队业绩 业绩分析 业绩分享 排名 趋势'
  },
  {
    id: 'module-logistics',
    title: '物流管理',
    excerpt: '发货列表、物流列表、物流跟踪、状态更新、物流公司...',
    category: '功能模块',
    content: '物流管理 发货列表 物流列表 物流跟踪 状态更新 物流公司 快递单号 签收 拒收'
  },
  {
    id: 'module-aftersale',
    title: '售后管理',
    excerpt: '售后订单、新建售后、售后数据、退换货处理...',
    category: '功能模块',
    content: '售后管理 售后订单 新建售后 售后数据 退换货 退款 投诉处理'
  },
  {
    id: 'module-data',
    title: '资料管理',
    excerpt: '资料列表、客户查询、回收站、数据导入导出...',
    category: '功能模块',
    content: '资料管理 资料列表 客户查询 回收站 数据导入 数据导出 分配'
  },
  {
    id: 'module-finance',
    title: '财务管理',
    excerpt: '绩效数据、绩效管理、提成计算、阶梯提成...',
    category: '功能模块',
    content: '财务管理 绩效数据 绩效管理 提成计算 阶梯提成 绩效系数'
  },
  {
    id: 'module-product',
    title: '商品管理',
    excerpt: '商品列表、新增商品、库存管理、商品分类、商品分析...',
    category: '功能模块',
    content: '商品管理 商品列表 新增商品 库存管理 商品分类 商品分析 SKU'
  },
  {
    id: 'module-system',
    title: '系统管理',
    excerpt: '部门管理、用户管理、角色权限、系统设置、消息管理...',
    category: '功能模块',
    content: '系统管理 部门管理 用户管理 角色权限 系统设置 消息管理 接口管理 客服管理'
  },

  // 角色权限
  {
    id: 'role-overview',
    title: '角色概述',
    excerpt: '系统支持超级管理员、管理员、部门经理、销售员、客服等角色...',
    category: '角色权限',
    content: '角色概述 超级管理员 管理员 部门经理 销售员 客服 权限分配'
  },
  {
    id: 'role-super-admin',
    title: '超级管理员',
    excerpt: '拥有系统全部权限，可管理所有功能和数据...',
    category: '角色权限',
    content: '超级管理员 全部权限 系统配置 用户管理 数据管理'
  },
  {
    id: 'role-admin',
    title: '管理员',
    excerpt: '拥有大部分管理权限，可管理业务数据和用户...',
    category: '角色权限',
    content: '管理员 业务管理 用户管理 数据查看 审核权限'
  },
  {
    id: 'role-dept-manager',
    title: '部门经理',
    excerpt: '管理本部门的业务数据和团队成员...',
    category: '角色权限',
    content: '部门经理 部门数据 团队管理 业绩查看 数据分析'
  },
  {
    id: 'role-sales',
    title: '销售员',
    excerpt: '管理个人客户和订单，查看个人业绩...',
    category: '角色权限',
    content: '销售员 个人客户 个人订单 个人业绩 跟进记录'
  },
  {
    id: 'role-customer-service',
    title: '客服',
    excerpt: '处理订单审核、物流发货、售后服务等工作...',
    category: '角色权限',
    content: '客服 订单审核 物流发货 售后处理 客户查询'
  },
  {
    id: 'role-permission-config',
    title: '权限配置',
    excerpt: '如何配置和管理用户权限...',
    category: '角色权限',
    content: '权限配置 角色分配 权限设置 数据范围 菜单权限'
  },

  // 移动APP
  {
    id: 'app-overview',
    title: 'APP概述',
    excerpt: '云客CRM移动APP，支持Android和iOS平台...',
    category: '移动APP',
    content: 'APP概述 移动端 Android iOS 外呼 通话记录'
  },
  {
    id: 'app-install',
    title: '安装配置',
    excerpt: 'APP下载安装和服务器配置方法...',
    category: '移动APP',
    content: 'APP安装 下载 服务器配置 扫码登录'
  },
  {
    id: 'app-login',
    title: '登录绑定',
    excerpt: 'APP登录方式和设备绑定说明...',
    category: '移动APP',
    content: 'APP登录 扫码登录 设备绑定 账号绑定'
  },
  {
    id: 'app-call',
    title: '通话功能',
    excerpt: 'APP外呼功能使用说明...',
    category: '移动APP',
    content: 'APP通话 外呼 拨号盘 通话记录 录音'
  },
  {
    id: 'app-sync',
    title: '数据同步',
    excerpt: 'APP与Web端数据同步机制...',
    category: '移动APP',
    content: 'APP数据同步 实时同步 通话记录同步 客户数据'
  },

  // 部署指南
  {
    id: 'deploy-private',
    title: '私有部署',
    excerpt: '私有化部署完整指南，包括服务器配置、数据库安装等...',
    category: '部署指南',
    content: '私有部署 服务器配置 宝塔面板 Docker 环境搭建'
  },
  {
    id: 'deploy-saas',
    title: 'SaaS版本',
    excerpt: 'SaaS版本使用说明，包括注册、开通、套餐等...',
    category: '部署指南',
    content: 'SaaS版本 注册 开通 套餐 授权码'
  },
  {
    id: 'deploy-env',
    title: '环境要求',
    excerpt: '系统运行环境要求，包括Node.js、MySQL、Nginx等...',
    category: '部署指南',
    content: '环境要求 Node.js MySQL Nginx 服务器配置'
  },
  {
    id: 'deploy-database',
    title: '数据库配置',
    excerpt: 'MySQL数据库安装和配置说明...',
    category: '部署指南',
    content: '数据库配置 MySQL 数据库创建 表结构 数据迁移'
  },
  {
    id: 'deploy-nginx',
    title: 'Nginx配置',
    excerpt: 'Nginx反向代理和SSL配置说明...',
    category: '部署指南',
    content: 'Nginx配置 反向代理 SSL HTTPS WebSocket'
  },

  // 常见问题
  {
    id: 'faq-login',
    title: '登录问题',
    excerpt: '常见的登录问题及解决方案...',
    category: '常见问题',
    content: '登录问题 密码错误 账号锁定 忘记密码 验证码'
  },
  {
    id: 'faq-operation',
    title: '操作问题',
    excerpt: '系统操作相关的常见问题...',
    category: '常见问题',
    content: '操作问题 功能使用 按钮点击 数据提交 页面刷新'
  },
  {
    id: 'faq-data',
    title: '数据问题',
    excerpt: '数据显示、导入导出等问题...',
    category: '常见问题',
    content: '数据问题 数据显示 导入失败 导出失败 数据丢失'
  },
  {
    id: 'faq-performance',
    title: '性能问题',
    excerpt: '系统性能相关问题及优化建议...',
    category: '常见问题',
    content: '性能问题 加载慢 卡顿 优化建议 缓存清理'
  },
  {
    id: 'faq-app',
    title: 'APP问题',
    excerpt: '移动APP使用中的常见问题...',
    category: '常见问题',
    content: 'APP问题 连接失败 通话异常 同步失败 闪退'
  }
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
