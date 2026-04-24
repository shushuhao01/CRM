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
          :default-openeds="['project', 'call-guides', 'business', 'deployment', 'modules', 'logistics-guides', 'faq', 'wecom']"
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
            <el-menu-item index="module-virtual-goods">虚拟商品</el-menu-item>
            <el-menu-item index="module-system">系统管理</el-menu-item>
          </el-sub-menu>

          <!-- 企微管理 -->
          <el-sub-menu index="wecom">
            <template #title>
              <el-icon><ChatDotSquare /></el-icon>
              <span>企微管理</span>
            </template>
            <el-menu-item index="wecom-overview">企微模块概述</el-menu-item>
            <el-menu-item index="wecom-config">企微授权配置</el-menu-item>
            <el-menu-item index="wecom-customer">企业客户管理</el-menu-item>
            <el-menu-item index="wecom-contact-way">活码管理</el-menu-item>
            <el-menu-item index="wecom-acquisition">获客助手</el-menu-item>
            <el-menu-item index="wecom-group">客户群管理</el-menu-item>
            <el-menu-item index="wecom-chat-archive">会话存档</el-menu-item>
            <el-menu-item index="wecom-ai-assistant">AI助手</el-menu-item>
            <el-menu-item index="wecom-payment">对外收款</el-menu-item>
            <el-menu-item index="wecom-sidebar">企微侧边栏</el-menu-item>
          </el-sub-menu>

          <!-- 通话管理指南 -->
          <el-sub-menu index="call-guides">
            <template #title>
              <el-icon><Phone /></el-icon>
              <span>通话管理指南</span>
            </template>
            <el-menu-item index="call-config-guide">呼出配置完整指南</el-menu-item>
            <el-menu-item index="call-methods-guide">外呼方式详解</el-menu-item>
            <el-menu-item index="call-workphone-guide">工作手机绑定</el-menu-item>
            <el-menu-item index="call-line-manage-guide">线路管理与分配</el-menu-item>
            <el-menu-item index="call-records-guide">通话记录与录音</el-menu-item>
          </el-sub-menu>

          <!-- 物流配置指南 -->
          <el-sub-menu index="logistics-guides">
            <template #title>
              <el-icon><Van /></el-icon>
              <span>物流配置指南</span>
            </template>
            <el-menu-item index="logistics-api-guide">物流API配置</el-menu-item>
            <el-menu-item index="logistics-printer-guide">打印机配置</el-menu-item>
            <el-menu-item index="logistics-label-guide">面单模板配置</el-menu-item>
            <el-menu-item index="logistics-sender-guide">寄件人配置</el-menu-item>
            <el-menu-item index="logistics-shipping-guide">发货打单操作</el-menu-item>
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
            <el-menu-item index="role-permission-tree">权限树</el-menu-item>
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
            <component :is="currentContentComponent" :section="activeMenuItem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { Search, InfoFilled, Operation, Setting, Grid, QuestionFilled, UserFilled, Iphone, Van, Phone, ChatDotSquare } from '@element-plus/icons-vue'

// 动态导入帮助内容组件
const helpContentComponents: Record<string, any> = {
  // 通话管理指南
  'call-config-guide': defineAsyncComponent(() => import('@/components/HelpContent/CallConfigGuide.vue')),
  'call-methods-guide': defineAsyncComponent(() => import('@/components/HelpContent/CallConfigGuide.vue')),
  'call-workphone-guide': defineAsyncComponent(() => import('@/components/HelpContent/CallConfigGuide.vue')),
  'call-line-manage-guide': defineAsyncComponent(() => import('@/components/HelpContent/CallConfigGuide.vue')),
  'call-records-guide': defineAsyncComponent(() => import('@/components/HelpContent/CallConfigGuide.vue')),

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

  // 物流配置指南
  'logistics-api-guide': defineAsyncComponent(() => import('@/components/HelpContent/LogisticsApiGuide.vue')),
  'logistics-printer-guide': defineAsyncComponent(() => import('@/components/HelpContent/LogisticsPrinterGuide.vue')),
  'logistics-label-guide': defineAsyncComponent(() => import('@/components/HelpContent/LogisticsLabelGuide.vue')),
  'logistics-sender-guide': defineAsyncComponent(() => import('@/components/HelpContent/LogisticsSenderGuide.vue')),
  'logistics-shipping-guide': defineAsyncComponent(() => import('@/components/HelpContent/LogisticsShippingGuide.vue')),

  'module-aftersale': defineAsyncComponent(() => import('@/components/HelpContent/ModuleAftersale.vue')),
  'module-data': defineAsyncComponent(() => import('@/components/HelpContent/ModuleData.vue')),
  'module-finance': defineAsyncComponent(() => import('@/components/HelpContent/ModuleFinance.vue')),
  'module-product': defineAsyncComponent(() => import('@/components/HelpContent/ModuleProduct.vue')),
  'module-virtual-goods': defineAsyncComponent(() => import('@/components/HelpContent/ModuleVirtualGoods.vue')),
  'module-system': defineAsyncComponent(() => import('@/components/HelpContent/ModuleSystem.vue')),

  // 企微管理
  'wecom-overview': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-config': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-customer': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-contact-way': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-acquisition': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-group': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-chat-archive': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-ai-assistant': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-payment': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),
  'wecom-sidebar': defineAsyncComponent(() => import('@/components/HelpContent/ModuleWecom.vue')),

  // 角色权限
  'role-overview': defineAsyncComponent(() => import('@/components/HelpContent/RoleOverview.vue')),
  'role-super-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleSuperAdmin.vue')),
  'role-admin': defineAsyncComponent(() => import('@/components/HelpContent/RoleAdmin.vue')),
  'role-dept-manager': defineAsyncComponent(() => import('@/components/HelpContent/RoleDeptManager.vue')),
  'role-sales': defineAsyncComponent(() => import('@/components/HelpContent/RoleSales.vue')),
  'role-customer-service': defineAsyncComponent(() => import('@/components/HelpContent/RoleCustomerService.vue')),
  'role-permission-config': defineAsyncComponent(() => import('@/components/HelpContent/RolePermissionConfig.vue')),
  'role-permission-tree': defineAsyncComponent(() => import('@/components/HelpContent/RolePermissionTree.vue')),

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
  // 通话管理指南
  {
    id: 'call-config-guide',
    title: '呼出配置完整指南',
    excerpt: '外呼配置全面指南：系统线路管理、网络电话VoIP配置、号码分配、工作手机绑定、外呼设置...',
    category: '通话管理指南',
    content: '呼出配置 外呼配置 通话管理 线路管理 VoIP 网络电话 阿里云通信 腾讯云通信 华为云通信 SIP PSTN 主叫号码 日限额 并发数'
  },
  {
    id: 'call-methods-guide',
    title: '外呼方式详解',
    excerpt: '所有外呼方式详细说明：工作手机外呼、网络电话VoIP、SIP线路、PSTN网关...',
    category: '通话管理指南',
    content: '外呼方式 工作手机 VoIP SIP线路 PSTN网关 拨号 呼叫 通话 回拨 直拨 外呼助手APP'
  },
  {
    id: 'call-workphone-guide',
    title: '工作手机绑定',
    excerpt: '工作手机绑定步骤：安装外呼助手APP、扫码绑定、状态管理、解绑操作...',
    category: '通话管理指南',
    content: '工作手机 绑定手机 扫码绑定 二维码 外呼助手 APP 在线状态 解绑 主要手机'
  },
  {
    id: 'call-line-manage-guide',
    title: '线路管理与分配',
    excerpt: '管理员线路管理：创建线路、配置服务商、测试连接、分配线路给员工...',
    category: '通话管理指南',
    content: '线路管理 号码分配 创建线路 服务商配置 AccessKey SecretKey 测试连接 分配用户 日限额'
  },
  {
    id: 'call-records-guide',
    title: '通话记录与录音',
    excerpt: '通话记录查看、筛选、录音回放、自动录音、各外呼方式录音支持...',
    category: '通话管理指南',
    content: '通话记录 录音回放 通话时长 通话状态 外呼任务 批量拨打 接通率 通话备注 自动录音 VoIP录音 SIP录音 PSTN录音 工作手机录音'
  },

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

  // 物流配置指南
  {
    id: 'logistics-api-guide',
    title: '物流API配置指南',
    excerpt: '快递100注册、各快递公司开放平台API申请、密钥配置、电子面单合同签订...',
    category: '物流配置指南',
    content: '物流API 快递100 顺丰 圆通 中通 韵达 极兔 AppKey AppSecret 月结编码 电子面单 开放平台 API配置'
  },
  {
    id: 'logistics-printer-guide',
    title: '打印机配置指南',
    excerpt: '浏览器打印、LODOP控件、USB直连热敏打印机配置方法...',
    category: '物流配置指南',
    content: '打印机配置 浏览器打印 LODOP C-Lodop USB直连 热敏打印机 佳博 得力 斑马 面单打印'
  },
  {
    id: 'logistics-label-guide',
    title: '面单模板配置指南',
    excerpt: '面单模板选择、自定义模板、隐私保护、纸张规格配置...',
    category: '物流配置指南',
    content: '面单模板 标签模板 纸张规格 100x180 100x150 隐私保护 脱敏 条码 二维码 自定义模板'
  },
  {
    id: 'logistics-sender-guide',
    title: '寄件人配置指南',
    excerpt: '寄件人信息管理、退货地址管理、默认寄件人设置...',
    category: '物流配置指南',
    content: '寄件人 退货地址 默认寄件人 发件人 联系电话 发货地址 关联售后 退货 换货 维修'
  },
  {
    id: 'logistics-shipping-guide',
    title: '发货打单操作指南',
    excerpt: '打印面单发货、手动发货、批量打印、批量发货、Excel导入发货...',
    category: '物流配置指南',
    content: '发货打单 打印面单 手动发货 批量打印面单 批量发货 导入发货 Excel 快递单号 发货流程'
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

  // 功能模块 - 虚拟商品
  {
    id: 'module-virtual-goods',
    title: '虚拟商品功能',
    excerpt: '卡密类、资源链接类、无需发货类三种虚拟商品，完整的库存管理、订单流转和客户自助领取闭环...',
    category: '功能模块',
    content: '虚拟商品 卡密 资源链接 无需发货 库存管理 卡密库存 资源库存 领取链接 领取页 虚拟发货 virtual 自助领取 激活码 充值码 网盘 数字内容'
  },

  // 企微管理
  {
    id: 'wecom-overview',
    title: '企微管理模块概述',
    excerpt: '企微管理模块深度集成企业微信能力，提供授权配置、客户管理、活码、获客助手、会话存档、AI助手等全套功能...',
    category: '企微管理',
    content: '企业微信 企微 企微管理 WeChat Work 企微授权 活码 获客助手 会话存档 AI助手 对外收款 企微侧边栏 客户群 通讯录'
  },
  {
    id: 'wecom-config',
    title: '企微授权配置',
    excerpt: '支持第三方应用授权（扫码）和自建应用配置（填写CorpID）两种接入方式，配额管理、回调配置、密钥管理...',
    category: '企微管理',
    content: '企微授权 第三方授权 自建应用 CorpID AgentID Secret 扫码授权 回调 Callback IP白名单 配额 企微配额 API诊断'
  },
  {
    id: 'wecom-customer',
    title: '企业客户管理',
    excerpt: '同步企微外部联系人，与CRM客户数据绑定，客户标签管理，自动匹配绑定，通讯录同步...',
    category: '企微管理',
    content: '企微客户 外部联系人 客户标签 自动匹配 手机号绑定 通讯录 员工通讯录 客户详情 跟进记录 数据同步'
  },
  {
    id: 'wecom-contact-way',
    title: '活码管理',
    excerpt: '创建渠道活码，多员工轮流接待，今日添加数统计，活码详情数据分析，渠道来源管理...',
    category: '企微管理',
    content: '活码 ContactWay 渠道活码 接待成员 欢迎语 活码统计 渠道来源 添加人数 趋势图 漏斗 批量启用禁用'
  },
  {
    id: 'wecom-acquisition',
    title: '获客助手',
    excerpt: '获客链接管理，引流数据分析，员工排名，留存率统计，获客配额使用量监控...',
    category: '企微管理',
    content: '获客助手 获客链接 获客配额 引流 添加人数 员工排名 留存率 标签管理 链接管理 数据总览 增值服务'
  },
  {
    id: 'wecom-group',
    title: '客户群管理',
    excerpt: '同步企微客户群，群数据统计、群欢迎语、群模板、群广播，群总数/活跃群/成员数/消息数...',
    category: '企微管理',
    content: '客户群 群管理 群欢迎语 群模板 群广播 群统计 活跃群 群成员 群消息 群详情 卡片视图 列表视图'
  },
  {
    id: 'wecom-chat-archive',
    title: '会话存档',
    excerpt: '存档员工与客户聊天记录，全文搜索，敏感词检测，合规质检，席位配额管理，双轨制购买...',
    category: '企微管理',
    content: '会话存档 聊天记录 全文搜索 敏感词 合规质检 质检规则 质检报告 存档席位 席位配额 增值服务 双轨制 RSA密钥 反骚扰 智能在线'
  },
  {
    id: 'wecom-ai-assistant',
    title: 'AI助手',
    excerpt: 'AI模型配置，知识库管理，话术库，敏感词库，标签AI自动打标，调用日志，AI额度套餐购买...',
    category: '企微管理',
    content: 'AI助手 AI模型 知识库 话术库 敏感词库 标签AI AiTagRule 调用日志 Token额度 AI套餐 OpenAI 通义千问 文心一言 AiAgent 智能体 System Prompt'
  },
  {
    id: 'wecom-payment',
    title: '对外收款',
    excerpt: '企微收款记录管理，收款码管理，退款处理，收款统计，收款总额/支付笔数统计...',
    category: '企微管理',
    content: '对外收款 收款记录 收款码 退款管理 收款设置 收款统计 微信商户号 收款总额 已支付 待支付 已退款 同步收款'
  },
  {
    id: 'wecom-sidebar',
    title: '企微侧边栏',
    excerpt: '嵌入企业微信客户端的CRM插件，实时客户信息，快捷下单，AI话术推荐，跟进记录...',
    category: '企微管理',
    content: '企微侧边栏 WecomSidebar 侧边栏 快捷下单 AI助手 话术发送 跟进记录 客户信息 授权码 侧边栏预览 可信域名 JS-SDK'
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
  {
    id: 'role-permission-tree',
    title: '权限树',
    excerpt: '系统权限树形结构详细说明，包含所有模块和子权限...',
    category: '角色权限',
    content: '权限树 权限结构 模块权限 路由路径 权限标识 代收管理 取消代收申请 取消代收审核'
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
  // 支持URL参数直接跳转到指定章节：/help-center?section=logistics-api-guide
  const route = useRoute()
  const section = route.query.section as string
  if (section && helpContentComponents[section]) {
    activeMenuItem.value = section
  }
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
