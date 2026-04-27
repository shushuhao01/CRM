import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getTenantPackage } from '@/api/wecom'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/Login.vue'),
      meta: { title: '登录', requiresAuth: false }
    },
    // 虚拟商品领取页（公开，无需登录）
    {
      path: '/virtual-claim/:token',
      name: 'VirtualClaim',
      component: () => import('../views/VirtualClaim.vue'),
      meta: { title: '商品领取', requiresAuth: false }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: '数据看板', requiresAuth: true }
    },
    // 客户管理
    {
      path: '/customer/list',
      name: 'CustomerList',
      component: () => import('../views/Customer/List.vue'),
      meta: { title: '客户列表', requiresAuth: true }
    },
    {
      path: '/customer/add',
      name: 'CustomerAdd',
      component: () => import('../views/Customer/Add.vue'),
      meta: { title: '新增客户', requiresAuth: true }
    },
    {
      path: '/customer/edit/:id',
      name: 'CustomerEdit',
      component: () => import('../views/Customer/Edit.vue'),
      meta: { title: '编辑客户', requiresAuth: true }
    },
    {
      path: '/customer/detail/:id',
      name: 'CustomerDetail',
      component: () => import('../views/Customer/Detail.vue'),
      meta: { title: '客户详情', requiresAuth: true }
    },
    {
      path: '/customer/tags',
      name: 'CustomerTags',
      component: () => import('../views/Customer/Tags.vue'),
      meta: { title: '客户标签', requiresAuth: true }
    },
    {
      path: '/customer/groups',
      name: 'CustomerGroups',
      component: () => import('../views/Customer/Groups.vue'),
      meta: { title: '客户分组', requiresAuth: true }
    },
    // 订单管理
    {
      path: '/order/list',
      name: 'OrderList',
      component: () => import('../views/Order/List.vue'),
      meta: { title: '订单列表', requiresAuth: true }
    },
    {
      path: '/order/add',
      name: 'OrderAdd',
      component: () => import('../views/Order/Add.vue'),
      meta: { title: '新增订单', requiresAuth: true }
    },
    {
      path: '/order/edit/:id',
      name: 'OrderEdit',
      component: () => import('../views/Order/Edit.vue'),
      meta: { title: '编辑订单', requiresAuth: true }
    },
    {
      path: '/order/detail/:id',
      name: 'OrderDetail',
      component: () => import('../views/Order/Detail.vue'),
      meta: { title: '订单详情', requiresAuth: true }
    },
    {
      path: '/order/audit',
      name: 'OrderAudit',
      component: () => import('../views/Order/Audit.vue'),
      meta: { title: '订单审核', requiresAuth: true }
    },
    {
      path: '/order/my-cod-application',
      name: 'MyCodApplication',
      component: () => import('../views/Finance/MyCodApplication.vue'),
      meta: { title: '取消代收申请', requiresAuth: true }
    },
    {
      path: '/order/cod-application-review',
      name: 'CodApplicationReview',
      component: () => import('../views/Finance/CodApplicationReview.vue'),
      meta: { title: '取消代收审核', requiresAuth: true, permissions: ['finance:cod'] }
    },

    // 业绩统计
    {
      path: '/performance/personal',
      name: 'PerformancePersonal',
      component: () => import('../views/Performance/Personal.vue'),
      meta: { title: '个人业绩', requiresAuth: true }
    },
    {
      path: '/performance/team',
      name: 'PerformanceTeam',
      component: () => import('../views/Performance/Team.vue'),
      meta: { title: '团队业绩', requiresAuth: true }
    },
    {
      path: '/performance/analysis',
      name: 'PerformanceAnalysis',
      component: () => import('../views/Performance/Analysis.vue'),
      meta: { title: '业绩分析', requiresAuth: true }
    },
    {
      path: '/performance/share',
      name: 'PerformanceShare',
      component: () => import('../views/Performance/Share.vue'),
      meta: { title: '业绩分享', requiresAuth: true }
    },
    // 系统设置 - 业绩分享设置
    {
      path: '/settings/performance-share',
      name: 'SettingsPerformanceShare',
      component: () => import('../views/Settings/PerformanceShare.vue'),
      meta: { title: '业绩分享设置', requiresAuth: true, requiresSuperAdmin: true }
    },



    // 物流管理
    {
      path: '/logistics/list',
      name: 'LogisticsList',
      component: () => import('../views/Logistics/List.vue'),
      meta: { title: '物流列表', requiresAuth: true }
    },
    {
      path: '/logistics/detail/:id',
      name: 'LogisticsDetail',
      component: () => import('../views/Logistics/Detail.vue'),
      meta: { title: '物流详情', requiresAuth: true }
    },
    {
      path: '/logistics/edit/:id',
      name: 'LogisticsEdit',
      component: () => import('../views/Logistics/Edit.vue'),
      meta: { title: '编辑物流', requiresAuth: true }
    },
    {
      path: '/logistics/track',
      name: 'LogisticsTrack',
      component: () => import('../views/Logistics/Track.vue'),
      meta: { title: '物流跟踪', requiresAuth: true }
    },
    {
      path: '/logistics/companies',
      name: 'LogisticsCompanies',
      component: () => import('../views/Logistics/Companies.vue'),
      meta: { title: '物流公司', requiresAuth: true }
    },
    {
      path: '/logistics/track/detail/:trackingNo',
      name: 'LogisticsTrackDetail',
      component: () => import('../views/Logistics/TrackDetail.vue'),
      meta: { title: '物流跟踪详情', requiresAuth: true }
    },
    {
      path: '/logistics/company/detail/:id',
      name: 'LogisticsCompanyDetail',
      component: () => import('../views/Logistics/CompanyDetail.vue'),
      meta: { title: '物流公司详情', requiresAuth: true }
    },
    {
      path: '/logistics/shipping',
      name: 'LogisticsShipping',
      component: () => import('../views/Logistics/Shipping.vue'),
      meta: { title: '发货列表', requiresAuth: true }
    },
    {
      path: '/logistics/status-update',
      name: 'LogisticsStatusUpdate',
      component: () => import('../views/Logistics/StatusUpdate.vue'),
      meta: { title: '状态更新', requiresAuth: true, requiresSpecialPermission: true }
    },

    // 售后管理
    {
      path: '/service/list',
      name: 'ServiceList',
      component: () => import('../views/Service/List.vue'),
      meta: { title: '售后订单', requiresAuth: true }
    },
    {
      path: '/service/add',
      name: 'ServiceAdd',
      component: () => import('../views/Service/Add.vue'),
      meta: { title: '新建售后', requiresAuth: true }
    },
    {
      path: '/service/detail/:id',
      name: 'ServiceDetail',
      component: () => import('../views/Service/Detail.vue'),
      meta: { title: '售后详情', requiresAuth: true }
    },
    {
      path: '/service/edit/:id',
      name: 'ServiceEdit',
      component: () => import('../views/Service/Edit.vue'),
      meta: { title: '编辑售后', requiresAuth: true }
    },
    {
      path: '/service/data',
      name: 'ServiceData',
      component: () => import('../views/Service/Data.vue'),
      meta: { title: '售后数据', requiresAuth: true }
    },

    // 资料管理
    {
      path: '/data/list',
      name: 'DataList',
      component: () => import('../views/Data/List.vue'),
      meta: { title: '资料列表', requiresAuth: true }
    },
    {
      path: '/data/search',
      name: 'DataSearch',
      component: () => import('../views/Data/SearchNew.vue'),
      meta: { title: '客户查询', requiresAuth: true }
    },
    {
      path: '/data/search-debug',
      name: 'SearchDebug',
      component: () => import('../views/Debug/SearchDebug.vue'),
      meta: { title: '搜索调试工具', requiresAuth: true }
    },
    {
      path: '/data/recycle',
      name: 'DataRecycle',
      component: () => import('../views/Data/Recycle.vue'),
      meta: { title: '回收站', requiresAuth: true }
    },

    // 财务管理
    {
      path: '/finance/performance-data',
      name: 'FinancePerformanceData',
      component: () => import('../views/Finance/PerformanceData.vue'),
      meta: { title: '绩效数据', requiresAuth: true }
    },
    {
      path: '/finance/performance-manage',
      name: 'FinancePerformanceManage',
      component: () => import('../views/Finance/PerformanceManage.vue'),
      meta: { title: '绩效管理', requiresAuth: true, permissions: ['finance:manage'] }
    },
    {
      path: '/finance/cod-collection',
      name: 'FinanceCodCollection',
      component: () => import('../views/Finance/CodCollection.vue'),
      meta: { title: '代收管理', requiresAuth: true, permissions: ['finance:cod'] }
    },
    {
      path: '/finance/value-added-manage',
      name: 'FinanceValueAddedManage',
      component: () => import('../views/Finance/ValueAddedManage.vue'),
      meta: { title: '增值管理', requiresAuth: true, permissions: ['finance.value_added'] }
    },
    {
      path: '/finance/settlement-report',
      name: 'FinanceSettlementReport',
      component: () => import('../views/Finance/SettlementReport.vue'),
      meta: { title: '结算报表', requiresAuth: true, permissions: ['finance.settlement_report'] }
    },

    // 商品管理
    {
      path: '/product/list',
      name: 'ProductList',
      component: () => import('../views/Product/List.vue'),
      meta: { title: '商品列表', requiresAuth: true }
    },
    {
      path: '/product/add',
      name: 'ProductAdd',
      component: () => import('../views/Product/Add.vue'),
      meta: { title: '新增商品', requiresAuth: true, requiresManager: true }
    },
    {
      path: '/product/edit/:id',
      name: 'ProductEdit',
      component: () => import('../views/Product/Edit.vue'),
      meta: { title: '编辑商品', requiresAuth: true, requiresManager: true }
    },
    {
      path: '/product/detail/:id',
      name: 'ProductDetail',
      component: () => import('../views/Product/Detail.vue'),
      meta: { title: '商品详情', requiresAuth: true }
    },
    {
      path: '/product/category',
      name: 'ProductCategory',
      component: () => import('../views/Product/Category.vue'),
      meta: { title: '商品分类', requiresAuth: true }
    },
    {
      path: '/product/inventory',
      name: 'ProductInventory',
      component: () => import('../views/Product/Stock.vue'),
      meta: { title: '库存管理', requiresAuth: true, requiresManager: true }
    },
    {
      path: '/product/analytics',
      name: 'ProductAnalytics',
      component: () => import('../views/Product/Analytics.vue'),
      meta: { title: '商品分析', requiresAuth: true }
    },
    // 虚拟商品管理
    {
      path: '/product/virtual/card-keys',
      name: 'CardKeyManage',
      component: () => import('../views/Product/CardKeyManage.vue'),
      meta: { title: '卡密库存管理', requiresAuth: true, requiresManager: true }
    },
    {
      path: '/product/virtual/resources',
      name: 'ResourceManage',
      component: () => import('../views/Product/ResourceManage.vue'),
      meta: { title: '资源库存管理', requiresAuth: true, requiresManager: true }
    },

    // 服务管理
    {
      path: '/service-management/sms',
      name: 'ServiceSmsManagement',
      component: () => import('../views/ServiceManagement/SmsManagement.vue'),
      meta: { title: '短信管理', requiresAuth: true }
    },
    {
      path: '/service-management/sms/template-detail',
      name: 'SmsTemplateDetail',
      component: () => import('../views/ServiceManagement/SmsTemplateDetail.vue'),
      meta: { title: '模板详情', requiresAuth: true }
    },
    // 通话管理
    {
      path: '/service-management/call',
      name: 'ServiceCallManagement',
      component: () => import('../views/ServiceManagement/CallManagement.vue'),
      meta: { title: '通话管理', requiresAuth: true }
    },
    {
      path: '/service-management/call/dashboard',
      name: 'CallDashboard',
      component: () => import('../views/ServiceManagement/Call/Dashboard.vue'),
      meta: { title: '通话数据汇总', requiresAuth: true }
    },
    {
      path: '/service-management/call/outbound',
      name: 'CallOutbound',
      component: () => import('../views/ServiceManagement/Call/OutboundList.vue'),
      meta: { title: '呼出列表', requiresAuth: true }
    },
    {
      path: '/service-management/call/records',
      name: 'CallRecords',
      component: () => import('../views/ServiceManagement/Call/CallRecords.vue'),
      meta: { title: '通话记录', requiresAuth: true }
    },
    {
      path: '/service-management/call/followup',
      name: 'CallFollowUp',
      component: () => import('../views/ServiceManagement/Call/FollowUpRecords.vue'),
      meta: { title: '跟进记录', requiresAuth: true }
    },
    {
      path: '/service-management/call/recordings',
      name: 'CallRecordings',
      component: () => import('../views/ServiceManagement/Call/RecordingManagement.vue'),
      meta: { title: '录音管理', requiresAuth: true }
    },
    {
      path: '/service-management/call/config',
      name: 'CallConfig',
      component: () => import('../views/ServiceManagement/Call/PhoneConfig.vue'),
      meta: { title: '电话配置', requiresAuth: true }
    },

    // 调试页面
    {
      path: '/debug/storage',
      name: 'DebugStorage',
      component: () => import('../views/Debug/Storage.vue'),
      meta: { title: '存储调试', requiresAuth: true }
    },
    {
      path: '/debug/user-permissions',
      name: 'DebugUserPermissions',
      component: () => import('../views/Debug/UserPermissions.vue'),
      meta: { title: '用户权限调试', requiresAuth: true }
    },
    // 系统管理
    {
      path: '/system/users',
      name: 'SystemUsers',
      component: () => import('../views/System/User.vue'),
      meta: { title: '用户管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/roles',
      name: 'SystemRoles',
      component: () => import('../views/System/Role/index.vue'),
      meta: { title: '角色权限', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/departments',
      name: 'SystemDepartments',
      component: () => import('../views/System/Departments.vue'),
      meta: { title: '部门管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/department/detail/:id',
      name: 'DepartmentDetail',
      component: () => import('../views/System/DepartmentDetail.vue'),
      meta: { title: '部门详情', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/department/members/:id',
      name: 'DepartmentMembers',
      component: () => import('../views/System/DepartmentMembers.vue'),
      meta: { title: '部门成员配置', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/department-roles',
      name: 'DepartmentRoles',
      component: () => import('../views/System/DepartmentRoles.vue'),
      meta: { title: '部门角色管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/settings',
      name: 'SystemSettings',
      component: () => import('../views/System/Settings/index.vue'),
      meta: { title: '系统设置', requiresAuth: true }
    },
    {
      path: '/system/api-management',
      name: 'ApiManagement',
      component: () => import('../views/System/ApiManagement.vue'),
      meta: { title: '接口管理', requiresAuth: true, requiresAdmin: true }
    },
    // 🔥 批次274新增：关于我们页面
    {
      path: '/about',
      name: 'About',
      component: () => import('../views/About.vue'),
      meta: { title: '关于我们', requiresAuth: true }
    },
    {
      path: '/mobile-app-download',
      name: 'MobileAppDownload',
      component: () => import('../views/MobileAppDownload.vue'),
      meta: { title: '移动应用下载', requiresAuth: true }
    },
    {
      path: '/system/sms-templates',
      name: 'SmsTemplates',
      component: () => import('../views/System/SmsTemplates.vue'),
      meta: { title: '短信模板管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/sms-approval',
      name: 'SmsApproval',
      component: () => import('../views/System/SmsApproval.vue'),
      meta: { title: '短信审核管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/sms-send-records',
      name: 'SmsSendRecords',
      component: () => import('../views/System/SmsSendRecords.vue'),
      meta: { title: '短信发送记录', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/sms-statistics',
      name: 'SmsStatistics',
      component: () => import('../views/System/SmsStatistics.vue'),
      meta: { title: '短信统计分析', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/sms-config',
      name: 'SmsConfig',
      component: () => import('../views/System/SmsConfig.vue'),
      meta: { title: '短信配置管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/permissions',
      name: 'SystemPermissions',
      component: () => import('../views/System/PermissionManagement.vue'),
      meta: { title: '权限管理', requiresAuth: true, requiresSuperAdmin: true }
    },
    {
      path: '/system/super-admin-panel',
      name: 'SuperAdminPanel',
      component: () => import('../components/System/SuperAdminPermissionPanel.vue'),
      meta: { title: '超级管理员权限面板', requiresAuth: true, requiresSuperAdmin: true }
    },
    {
      path: '/system/customer-service-permissions',
      name: 'CustomerServicePermissions',
      component: () => import('../components/System/CustomerServicePermissionManager.vue'),
      meta: { title: '客服权限管理', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/sensitive-info-permissions',
      name: 'SensitiveInfoPermissions',
      component: () => import('../components/System/SensitiveInfoPermissionManager.vue'),
      meta: { title: '敏感信息权限管理', requiresAuth: true, requiresSuperAdmin: true }
    },

    {
      path: '/system/permission-guide',
      name: 'PermissionGuide',
      component: () => import('@/components/System/PermissionManagementGuide.vue'),
      meta: { title: '权限管理指南', requiresAuth: true }
    },
    {
      path: '/system/call-test',
      name: 'SystemCallTest',
      component: () => import('../views/System/CallTest.vue'),
      meta: { title: '通话功能测试', requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/system/mobile-sdk',
      name: 'SystemMobileSDK',
      component: () => import('../views/System/MobileSDK.vue'),
      meta: { title: '移动SDK管理', requiresAuth: true, requiresAdmin: true }
    },
    // 消息管理
    {
      path: '/system/message-management',
      name: 'MessageManagement',
      component: () => import('../views/System/MessageManagement.vue'),
      meta: { title: '消息管理', requiresAuth: true }
    },
    {
      path: '/mobile-sdk-install',
      name: 'MobileSDKInstall',
      component: () => import('../views/MobileSDKInstall.vue'),
      meta: { title: '移动SDK安装指南', requiresAuth: false }
    },
    // ==================== 企微管理 V4.0 重构（2026-04-15） ====================
    {
      path: '/wecom/address-book',
      name: 'WecomAddressBook',
      component: () => import('../views/Wecom/AddressBook.vue'),
      meta: { title: '通讯录', requiresAuth: true }
    },
    {
      path: '/wecom/customer',
      name: 'WecomCustomer',
      component: () => import('../views/Wecom/Customer.vue'),
      meta: { title: '企微客户', requiresAuth: true }
    },
    {
      path: '/wecom/customer-group',
      name: 'WecomCustomerGroup',
      component: () => import('../views/Wecom/CustomerGroup.vue'),
      meta: { title: '客户群', requiresAuth: true }
    },
    {
      path: '/wecom/acquisition',
      name: 'WecomAcquisition',
      component: () => import('../views/Wecom/Acquisition.vue'),
      meta: { title: '获客助手', requiresAuth: true }
    },
    {
      path: '/wecom/contact-way',
      name: 'WecomContactWay',
      component: () => import('../views/Wecom/ContactWay.vue'),
      meta: { title: '活码管理', requiresAuth: true }
    },
    {
      path: '/wecom/chat-archive',
      name: 'WecomChatArchive',
      component: () => import('../views/Wecom/ChatArchive.vue'),
      meta: { title: '会话存档', requiresAuth: true }
    },
    {
      path: '/wecom/service',
      name: 'WecomService',
      component: () => import('../views/Wecom/Service.vue'),
      meta: { title: '微信客服', requiresAuth: true }
    },
    {
      path: '/wecom/ai-assistant',
      name: 'WecomAiAssistant',
      component: () => import('../views/Wecom/AiAssistant.vue'),
      meta: { title: 'AI助手', requiresAuth: true }
    },
    {
      path: '/wecom/sidebar',
      name: 'WecomSidebar',
      component: () => import('../views/Wecom/Sidebar.vue'),
      meta: { title: '侧边栏', requiresAuth: true }
    },
    {
      path: '/wecom/payment',
      name: 'WecomPayment',
      component: () => import('../views/Wecom/Payment.vue'),
      meta: { title: '对外收款', requiresAuth: true }
    },
    {
      path: '/wecom/config',
      name: 'WecomConfig',
      component: () => import('../views/Wecom/Config.vue'),
      meta: { title: '企微授权', requiresAuth: true, requiresAdmin: true }
    },
    // 企微独立窗口（极简Layout，无CRM侧栏/顶栏）
    {
      path: '/wecom-standalone',
      name: 'WecomStandalone',
      component: () => import('../views/Wecom/WecomStandalone.vue'),
      meta: { title: '企微管理', requiresAuth: true, standaloneLayout: true }
    },
    // 企微侧边栏客户详情（嵌入企微聊天窗口，无需CRM登录）
    {
      path: '/wecom-sidebar',
      name: 'WecomSidebarDetail',
      component: () => import('../views/WecomSidebar/CustomerDetail.vue'),
      meta: { title: '企微侧边栏', requiresAuth: false }
    },
    // 公开帮助中心（无需登录）
    {
      path: '/public-help',
      name: 'PublicHelpCenter',
      component: () => import('../views/PublicHelpCenter.vue'),
      meta: { title: '帮助中心', requiresAuth: false }
    },
    // 帮助中心
    {
      path: '/help-center',
      name: 'HelpCenter',
      component: () => import('../views/HelpCenter.vue'),
      meta: { title: '帮助中心', requiresAuth: true }
    },
    // 404页面处理
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFound.vue'),
      meta: { title: '页面未找到', requiresAuth: false }
    }
  ],
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()

  if (import.meta.env.DEV) {
    console.log('[Router] 路由守卫检查:')
    console.log('  - 目标路径:', to.path)
    console.log('  - 来源路径:', from.path)
    console.log('  - token:', userStore.token ? '已设置' : '未设置')
    console.log('  - isLoggedIn:', userStore.isLoggedIn)
    console.log('  - localStorage token:', localStorage.getItem('auth_token') ? '已设置' : '未设置')
  }

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - CRM系统`
  }

  // 如果已登录用户访问登录页，重定向到首页
  if (to.path === '/login' && userStore.token) {
    next('/dashboard')
    return
  }

  // 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.token) {
    // 【关键修复】如果localStorage中有token但store中没有，尝试恢复
    const savedToken = localStorage.getItem('auth_token')
    if (savedToken) {
      if (import.meta.env.DEV) console.log('[Router] Store中token为空但localStorage有token，尝试恢复...')
      try {
        await userStore.initUser()
        if (userStore.token) {
          if (import.meta.env.DEV) console.log('[Router] Token恢复成功，继续导航')
          next()
          return
        }
      } catch (error) {
        console.error('[Router] Token恢复失败:', error)
      }
    }
    ElMessage.error('请先登录')
    next('/login')
    return
  }

  // 检查是否需要管理员权限
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    ElMessage.error('需要管理员权限')
    next('/dashboard')
    return
  }

  // 🔥 检查路由级权限配置（meta.permissions）
  if (to.meta.permissions && Array.isArray(to.meta.permissions) && to.meta.permissions.length > 0) {
    // 管理员跳过权限检查
    if (!userStore.isAdmin) {
      const requiredPerms = to.meta.permissions as string[]
      const userPerms = userStore.permissions || []
      // 用户需要拥有至少一个所需权限（支持冒号和点号格式匹配）
      const hasPermission = requiredPerms.some(reqPerm => {
        if (userPerms.includes(reqPerm)) return true
        const dotFormat = reqPerm.replace(/:/g, '.')
        if (userPerms.includes(dotFormat)) return true
        const colonFormat = reqPerm.replace(/\./g, ':')
        if (userPerms.includes(colonFormat)) return true
        // 前缀匹配：如用户拥有 finance 则可访问 finance:manage
        const parentPerm = reqPerm.split(/[:.]/)[0]
        if (userPerms.includes(parentPerm)) return true
        return false
      })
      if (!hasPermission) {
        ElMessage.error('没有访问此功能的权限')
        next('/dashboard')
        return
      }
    }
  }

  // 检查是否需要经理权限
  if (to.meta.requiresManager && !userStore.isManager && !userStore.isAdmin) {
    ElMessage.error('需要经理权限')
    next('/dashboard')
    return
  }

  // 检查是否需要超级管理员权限
  if (to.meta.requiresSuperAdmin && !userStore.isSuperAdmin) {
    ElMessage.error('需要超级管理员权限')
    next('/dashboard')
    return
  }

  // 检查是否需要特殊权限（如物流状态更新）
  if (to.meta.requiresSpecialPermission) {
    if (import.meta.env.DEV) {
      console.log('[路由守卫] 检查特殊权限, 角色:', userStore.currentUser?.role)
    }

    const role = userStore.currentUser?.role
    const hasSpecialAccess = userStore.isSuperAdmin ||
                            userStore.isWhitelistMember ||
                            userStore.permissions?.includes('logistics:status') ||
                            userStore.permissions?.includes('logistics:status:update') ||
                            role === 'admin' || role === 'super_admin' || role === '管理员' || role === '超级管理员' ||
                            role === 'manager' || role === 'department_manager' || role === '部门经理' ||
                            role === 'department_head' || role === '部门负责人' ||
                            role === 'customer_service' || role === '客服' || role === '客服人员' ||
                            (userStore.currentUser?.department === 'logistics' &&
                             userStore.currentUser?.position === 'supervisor')

    console.log('[路由守卫] 特殊权限检查结果:', hasSpecialAccess)

    if (!hasSpecialAccess) {
      console.log('[路由守卫] ❌ 权限不足，拦截访问')
      ElMessage.error('您没有访问该功能的权限，请联系管理员')
      next('/dashboard')
      return
    }

    console.log('[路由守卫] ✅ 特殊权限检查通过')
  }

  // 企微子路由套餐权限校验（防止通过URL直接绕过套餐锁）
  // 管理员跳过套餐校验，允许自由访问所有企微功能（管理员需要配置和管理这些功能）
  const wecomMenuPermissionMap: Record<string, string> = {
    '/wecom/chat-archive': 'chatArchive',
    '/wecom/ai-assistant': 'aiAssistant',
    '/wecom/acquisition': 'acquisition',
    '/wecom/customer-service': 'customerService',
    '/wecom/service': 'customerService',
    '/wecom/address-book': 'addressBook',
    '/wecom/customer': 'customer',
    '/wecom/customer-group': 'customerGroup',
    '/wecom/contact-way': 'contactWay',
    '/wecom/sidebar': 'sidebar',
    '/wecom/payment': 'payment',
  }
  const requiredWecomPerm = wecomMenuPermissionMap[to.path]
  if (import.meta.env.DEV && to.path === '/wecom/sidebar') {
    console.warn('[Router Debug] 侧边栏导航:', {
      path: to.path,
      isAdmin: userStore.isAdmin,
      requiredWecomPerm,
      willSkipPackageCheck: !!userStore.isAdmin,
      token: !!userStore.token,
      role: userStore.currentUser?.role
    })
  }
  if (requiredWecomPerm && !userStore.isAdmin) {
    try {
      // 始终从服务器获取最新套餐数据（含配额管理features合并），确保Admin更新后CRM端同步
      let pkg: any = null
      try {
        const res: any = await getTenantPackage()
        pkg = res?.data || res
        if (pkg) {
          sessionStorage.setItem('wecom_tenant_package', JSON.stringify(pkg))
        }
      } catch {
        // 网络失败时回退到缓存
        const cachedPkg = sessionStorage.getItem('wecom_tenant_package')
        pkg = cachedPkg ? JSON.parse(cachedPkg) : null
      }
      const perms = pkg?.menuPermissions
      if (!perms || perms[requiredWecomPerm] !== true) {
        ElMessage.warning('当前企微套餐不包含此功能，请升级套餐')
        next('/wecom/config')
        return
      }
    } catch {
      ElMessage.warning('企微套餐信息获取失败，请从企微管理页面进入')
      next('/wecom/config')
      return
    }
  }

  next()
})

// 🔥 成功导航后清除重载计数（仅在距上次重载超过5秒后才清除，防止reload后立即清除导致无限刷新）
router.afterEach(() => {
  try {
    const ts = sessionStorage.getItem('dynamic_import_reload_ts')
    if (ts && Date.now() - Number(ts) > 5000) {
      sessionStorage.removeItem('dynamic_import_reload_count')
      sessionStorage.removeItem('dynamic_import_reload_ts')
    }
  } catch { /* ignore */ }
})

// 路由错误处理
router.onError((error) => {
  if (import.meta.env.DEV) {
    console.warn('[Router onError] 路由错误:', error.message, error)
  }
  // 静默处理导航取消和重复导航错误
  if (error.message && (
    error.message.includes('Avoided redundant navigation') ||
    error.message.includes('Navigation cancelled') ||
    error.message.includes('with a new navigation') ||
    error.message.includes('NavigationDuplicated')
  )) {
    // 完全静默处理，不输出任何日志和消息
    return
  }

  // 🔥 处理动态导入模块失败（通常是因为部署更新或长时间未操作导致的缓存问题）
  if (error.message && (
    error.message.includes('error loading dynamically imported module') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Loading chunk') ||
    error.message.includes('ChunkLoadError')
  )) {
    console.warn('[Router] 动态模块加载失败，可能是版本更新或缓存问题:', error.message)
    if (import.meta.env.DEV) console.error('[Router Debug] onError触发! 完整错误:', error)

    // 🔥 开发环境下不自动刷新页面，仅在控制台输出诊断信息
    // 动态导入失败在dev模式下通常是HMR热更新导致的暂时问题，重试即可恢复
    if (import.meta.env.DEV) {
      console.warn('[Router] 开发环境动态导入失败，尝试重试导入...', error.message)
      // 尝试通过重新导航来恢复（不reload整个页面）
      const failedPath = window.location.pathname
      setTimeout(() => {
        router.replace(failedPath).catch(() => {
          console.error('[Router] 重试导航也失败，请手动刷新页面 (Ctrl+Shift+R)')
        })
      }, 500)
      return
    }

    // 🔥 防止无限刷新：使用sessionStorage记录重载次数
    const RELOAD_KEY = 'dynamic_import_reload_count'
    const RELOAD_TS_KEY = 'dynamic_import_reload_ts'
    let reloadCount = 0
    try {
      const ts = sessionStorage.getItem(RELOAD_TS_KEY)
      if (ts && Date.now() - Number(ts) > 60000) {
        sessionStorage.removeItem(RELOAD_KEY)
        sessionStorage.removeItem(RELOAD_TS_KEY)
      }
      reloadCount = Number(sessionStorage.getItem(RELOAD_KEY) || '0')
    } catch { /* ignore */ }

    // 🔥 检查是否在公开页面，公开页面不需要登录验证
    const currentPath = window.location.pathname
    const publicPaths = ['/login', '/public-help', '/register', '/agreement', '/virtual-claim']
    const isPublicPage = publicPaths.some(path => currentPath.startsWith(path))

    if (isPublicPage) {
      // 公开页面，最多刷新一次
      if (reloadCount < 1) {
        console.log('[Router] 公开页面动态导入失败，尝试刷新')
        try { sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1)); sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now())) } catch {}
        window.location.reload()
      } else {
        console.log('[Router] 公开页面已刷新过，静默处理')
      }
      return
    }

    // 检查是否是 token 过期导致的
    const userStore = useUserStore()
    const savedToken = localStorage.getItem('auth_token')

    if (!savedToken && !userStore.token) {
      // Token 已被清除，说明是登录过期，跳转登录页
      console.log('[Router] Token已过期，跳转登录页')
      ElMessageBox.alert(
        '您的登录已过期，请重新登录。',
        '登录已过期',
        {
          confirmButtonText: '重新登录',
          type: 'warning',
          showClose: false,
          closeOnClickModal: false
        }
      ).then(() => {
        window.location.href = '/login'
      }).catch(() => {
        window.location.href = '/login'
      })
    } else if (reloadCount >= 1) {
      // 🔥 已重载过一次仍失败，不再自动刷新
      console.warn('[Router] 已达到最大自动刷新次数，提示用户手动处理')
      ElMessageBox.alert(
        '页面加载失败，自动刷新未能解决问题。请尝试：\n1. 手动清除浏览器缓存（Ctrl+Shift+Delete）\n2. 强制刷新页面（Ctrl+Shift+R）\n3. 返回首页重试',
        '页面加载失败',
        {
          confirmButtonText: '返回首页',
          type: 'error',
          showClose: true,
          closeOnClickModal: true
        }
      ).then(() => {
        try { sessionStorage.removeItem(RELOAD_KEY); sessionStorage.removeItem(RELOAD_TS_KEY) } catch {}
        window.location.href = '/dashboard'
      }).catch(() => {
        try { sessionStorage.removeItem(RELOAD_KEY); sessionStorage.removeItem(RELOAD_TS_KEY) } catch {}
      })
    } else {
      // 第一次：提示用户刷新页面
      ElMessageBox.alert(
        '系统检测到版本更新或页面缓存过期，需要刷新页面以加载最新内容。',
        '页面需要刷新',
        {
          confirmButtonText: '立即刷新',
          type: 'info',
          showClose: false,
          closeOnClickModal: false
        }
      ).then(() => {
        try { sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1)); sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now())) } catch {}
        window.location.reload()
      }).catch(() => {
        try { sessionStorage.setItem(RELOAD_KEY, String(reloadCount + 1)); sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now())) } catch {}
        window.location.reload()
      })
    }
    return
  }

  console.error('路由错误:', error)
  ElMessage.error('页面加载失败，请刷新重试')
})

// 导航失败处理
router.afterEach((_to, _from, failure) => {
  if (failure) {
    // 静默处理所有导航错误，避免用户看到不必要的错误提示
    // 常见的导航错误包括：重复导航、导航取消、新导航覆盖等
    // 这些都是正常的用户操作行为，不需要显示错误
    console.debug('[Router] 导航状态:', failure.message || failure)
  }
})

export default router
