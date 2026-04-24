import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/dashboard',
      redirect: '/'
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '仪表盘', icon: 'DataAnalysis', permission: 'dashboard:view' }
        },
        {
          path: 'activities',
          name: 'Activities',
          component: () => import('@/views/Activities.vue'),
          meta: { title: '全部动态', hidden: true, permission: 'dashboard:view' }
        },
        // 客户管理（统一管理私有+租户）
        {
          path: 'customer-management',
          name: 'CustomerManagementParent',
          meta: { title: '客户管理', icon: 'User' },
          redirect: '/customer-management/all',
          children: [
            {
              path: 'all',
              name: 'AllCustomers',
              component: () => import('@/views/customer-management/AllCustomers.vue'),
              meta: { title: '所有客户', permission: 'customer-management:all:view' }
            },
            {
              path: 'renewal-reminders',
              name: 'RenewalReminders',
              component: () => import('@/views/customer-management/RenewalReminders.vue'),
              meta: { title: '续费提醒', permission: 'customer-management:renewal:view' }
            }
          ]
        },
        // 私有客户（私有部署）
        {
          path: 'private-customers',
          name: 'PrivateCustomersParent',
          meta: { title: '私有客户', icon: 'Key' },
          redirect: '/private-customers/list',
          children: [
            {
              path: 'list',
              name: 'PrivateCustomers',
              component: () => import('@/views/private-customers/List.vue'),
              meta: { title: '私有列表', permission: 'private-customers:list:view' }
            },
            {
              path: 'detail/:id',
              name: 'PrivateCustomerDetail',
              component: () => import('@/views/private-customers/Detail.vue'),
              meta: { title: '客户详情', hidden: true, permission: 'private-customers:detail:view' }
            }
          ]
        },
        // 租户客户（SaaS云端）
        {
          path: 'tenant-customers',
          name: 'TenantCustomersParent',
          meta: { title: '租户客户', icon: 'OfficeBuilding' },
          redirect: '/tenant-customers/list',
          children: [
            {
              path: 'list',
              name: 'TenantCustomers',
              component: () => import('@/views/tenant-customers/List.vue'),
              meta: { title: '租户列表', permission: 'tenant-customers:list:view' }
            },
            {
              path: 'detail/:id',
              name: 'TenantCustomerDetail',
              component: () => import('@/views/tenant-customers/Detail.vue'),
              meta: { title: '客户详情', hidden: true, permission: 'tenant-customers:detail:view' }
            }
          ]
        },
        // 套餐管理（独立一级菜单）
        {
          path: 'package-management',
          name: 'PackageManagementParent',
          meta: { title: '套餐管理', icon: 'GoodsFilled' },
          redirect: '/package-management/packages',
          children: [
            {
              path: 'packages',
              name: 'TenantPackages',
              component: () => import('@/views/tenant-customers/Packages.vue'),
              meta: { title: '套餐管理', permission: 'tenant-customers:packages:view' }
            },
            {
              path: 'capacity',
              name: 'CapacityPriceConfig',
              component: () => import('@/views/capacity/PriceConfig.vue'),
              meta: { title: '扩容管理', permission: 'tenant-customers:packages:view' }
            }
          ]
        },
        // 模块服务
        {
          path: 'modules',
          name: 'ModulesParent',
          meta: { title: '模块服务', icon: 'Menu' },
          redirect: '/modules/list',
          children: [
            {
              path: 'list',
              name: 'Modules',
              component: () => import('@/views/modules/List.vue'),
              meta: { title: '模块列表', permission: 'modules:list:view' }
            },
            {
              path: 'config',
              name: 'ModuleConfig',
              component: () => import('@/views/modules/Config.vue'),
              meta: { title: 'CRM配置', permission: 'modules:config:view' }
            },
            {
              path: 'distribute',
              name: 'ModuleDistribute',
              component: () => import('@/views/modules/Distribute.vue'),
              meta: { title: '配置下发', permission: 'modules:distribute:view' }
            },
            {
              path: 'message-management',
              name: 'MessageManagement',
              component: () => import('@/views/modules/MessageManagement.vue'),
              meta: { title: '消息管理', permission: 'modules:message:view' }
            }
          ]
        },
        // 短信管理
        {
          path: 'sms-management',
          name: 'SmsManagementParent',
          meta: { title: '短信管理', icon: 'ChatDotRound' },
          redirect: '/sms-management/template-review',
          children: [
            {
              path: 'template-review',
              name: 'SmsTemplateReview',
              component: () => import('@/views/sms-management/TemplateReview.vue'),
              meta: { title: '模板审核', permission: 'sms-management:template-review:view' }
            },
            {
              path: 'templates',
              name: 'SmsTemplates',
              component: () => import('@/views/sms-management/Templates.vue'),
              meta: { title: '模板管理', permission: 'sms-management:templates:view' }
            },
            {
              path: 'records',
              name: 'SmsRecords',
              component: () => import('@/views/sms-management/Records.vue'),
              meta: { title: '发送记录', permission: 'sms-management:records:view' }
            },
            {
              path: 'crm-config',
              name: 'SmsCrmConfig',
              component: () => import('@/views/sms-management/CrmConfig.vue'),
              meta: { title: 'CRM配置', permission: 'sms-management:crm-config:view' }
            },
            {
              path: 'statistics',
              name: 'SmsStatistics',
              component: () => import('@/views/sms-management/Statistics.vue'),
              meta: { title: '统计总览', permission: 'sms-management:statistics:view' }
            },
            {
              path: 'quota-packages',
              name: 'SmsQuotaPackages',
              component: () => import('@/views/sms-management/QuotaPackages.vue'),
              meta: { title: '额度套餐', permission: 'sms-management:quota-packages:view' }
            }
          ]
        },
        // 企微管理（V4.0重构：14个菜单分3组）
        {
          path: 'wecom-management',
          name: 'WecomManagementParent',
          meta: { title: '企微管理', icon: 'ChatLineSquare' },
          redirect: '/wecom-management/overview',
          children: [
            // == 基础管理 ==
            {
              path: 'overview',
              name: 'WecomOverview',
              component: () => import('@/views/wecom/Overview.vue'),
              meta: { title: '企微总览', permission: 'wecom-management:overview:view', group: '基础管理' }
            },
            {
              path: 'suite-app',
              name: 'WecomSuiteApp',
              component: () => import('@/views/wecom/SuiteApp.vue'),
              meta: { title: '服务商应用管理', permission: 'wecom-management:suite-app:view', group: '基础管理' }
            },
            {
              path: 'tenant-auth',
              name: 'WecomTenantAuth',
              component: () => import('@/views/wecom/TenantAuth.vue'),
              meta: { title: '租户授权管理', permission: 'wecom-management:tenant-auth:view', group: '基础管理' }
            },
            {
              path: 'config-quota',
              name: 'WecomConfigQuota',
              component: () => import('@/views/wecom/ConfigQuota.vue'),
              meta: { title: '企微配额管理', permission: 'wecom-management:config-quota:view', group: '基础管理' }
            },
            // == 商业运营 ==
            {
              path: 'pricing',
              name: 'WecomPricing',
              component: () => import('@/views/wecom/Pricing.vue'),
              meta: { title: '套餐与定价', permission: 'wecom-management:package-templates:view', group: '商业运营' }
            },
            {
              path: 'tenant-packages',
              name: 'WecomTenantPackages',
              component: () => import('@/views/wecom/TenantPackage.vue'),
              meta: { title: '租户套餐管理', permission: 'wecom-management:tenant-packages:view', group: '商业运营' }
            },
            {
              path: 'purchase-orders',
              name: 'WecomPurchaseOrders',
              component: () => import('@/views/wecom/PurchaseOrders.vue'),
              meta: { title: '会话存档代购', permission: 'wecom-management:purchase-orders:view', group: '商业运营' }
            },
            {
              path: 'ai-management',
              name: 'WecomAiManagement',
              component: () => import('@/views/wecom/AiManagement.vue'),
              meta: { title: 'AI额度管理', permission: 'wecom-management:ai-management:view', group: '商业运营' }
            },
            {
              path: 'vas-orders',
              name: 'WecomVasOrders',
              component: () => import('@/views/wecom/VasOrders.vue'),
              meta: { title: '订单与财务', permission: 'wecom-management:vas-orders:view', group: '商业运营' }
            },
            // == 运维监控 ==
            {
              path: 'quota-monitor',
              name: 'WecomQuotaMonitor',
              component: () => import('@/views/wecom/QuotaMonitor.vue'),
              meta: { title: '资源配额监控', permission: 'wecom-management:quota-monitor:view', group: '运维监控' }
            },
            {
              path: 'acquisition-usage',
              name: 'WecomAcquisitionUsage',
              component: () => import('@/views/wecom/AcquisitionUsage.vue'),
              meta: { title: '获客助手用量', permission: 'wecom-management:acquisition-quota:view', group: '运维监控' }
            },
            {
              path: 'data-stats',
              name: 'WecomDataStats',
              component: () => import('@/views/wecom/DataStats.vue'),
              meta: { title: '数据统计', permission: 'wecom-management:data-stats:view', group: '运维监控' }
            },
            {
              path: 'audit-log',
              name: 'WecomAuditLog',
              component: () => import('@/views/wecom/AuditLog.vue'),
              meta: { title: '操作日志', permission: 'wecom-management:audit-log:view', group: '运维监控' }
            },
            {
              path: 'package-template',
              name: 'WecomPackageTemplate',
              component: () => import('@/views/wecom/PackageTemplate.vue'),
              meta: { title: '套餐模板管理', permission: 'wecom-management:package-templates:view', group: '商业运营' }
            },
            {
              path: 'vas-config',
              name: 'WecomVasConfig',
              component: () => import('@/views/wecom/VasConfig.vue'),
              meta: { title: '增值服务配置', permission: 'wecom-management:vas-config:view', group: '商业运营' }
            },
            {
              path: 'chat-archive-management',
              name: 'WecomChatArchiveManagement',
              component: () => import('@/views/wecom/ChatArchiveManagement.vue'),
              meta: { title: '会话存档管理', permission: 'wecom-management:chat-archive:view', group: '运维监控' }
            },
            {
              path: 'system-config',
              name: 'WecomSystemConfig',
              component: () => import('@/views/wecom/WecomSystemConfig.vue'),
              meta: { title: '系统配置', permission: 'wecom-management:system-config:view', group: '运维监控' }
            }
          ]
        },
        // 支付管理
        {
          path: 'payment',
          name: 'PaymentParent',
          meta: { title: '支付管理', icon: 'Wallet' },
          redirect: '/payment/list',
          children: [
            {
              path: 'list',
              name: 'PaymentList',
              component: () => import('@/views/payment/List.vue'),
              meta: { title: '支付列表', permission: 'payment:list:view' }
            },
            {
              path: 'config',
              name: 'PaymentConfig',
              component: () => import('@/views/payment/Config.vue'),
              meta: { title: '支付配置', permission: 'payment:config:view' }
            },
            {
              path: 'reports',
              name: 'PaymentReports',
              component: () => import('@/views/payment/Reports.vue'),
              meta: { title: '支付报表', permission: 'payment:reports:view' }
            }
          ]
        },
        // 版本发布
        {
          path: 'versions',
          name: 'VersionsParent',
          meta: { title: '版本发布', icon: 'Upload' },
          redirect: '/versions/list',
          children: [
            {
              path: 'list',
              name: 'Versions',
              component: () => import('@/views/versions/List.vue'),
              meta: { title: '版本列表', permission: 'versions:list:view' }
            },
            {
              path: 'upload',
              name: 'VersionUpload',
              component: () => import('@/views/versions/Upload.vue'),
              meta: { title: '上传新版本', permission: 'versions:upload:view' }
            },
            {
              path: 'changelog',
              name: 'VersionChangelog',
              component: () => import('@/views/versions/Changelog.vue'),
              meta: { title: '更新日志', permission: 'versions:changelog:view' }
            }
          ]
        },
        // 接口管理
        {
          path: 'api',
          name: 'ApiParent',
          meta: { title: '接口管理', icon: 'Connection' },
          redirect: '/api/list',
          children: [
            {
              path: 'list',
              name: 'ApiList',
              component: () => import('@/views/api/List.vue'),
              meta: { title: '接口列表', permission: 'api:list:view' }
            }
          ]
        },
        // 系统设置
        {
          path: 'settings',
          name: 'SettingsParent',
          meta: { title: '系统设置', icon: 'Setting' },
          redirect: '/settings/admins',
          children: [
            {
              path: 'admins',
              name: 'AdminUsers',
              component: () => import('@/views/settings/AdminUsers.vue'),
              meta: { title: '管理员账号', permission: 'settings:admins:view' }
            },
            {
              path: 'roles',
              name: 'RoleManagement',
              component: () => import('@/views/settings/RoleManagement.vue'),
              meta: { title: '角色管理', permission: 'settings:roles:view' }
            },
            {
              path: 'basic',
              name: 'BasicSettings',
              component: () => import('@/views/settings/Basic.vue'),
              meta: { title: '运营配置', permission: 'settings:basic:view' }
            },
            {
              path: 'notification-templates',
              name: 'NotificationTemplates',
              component: () => import('@/views/settings/NotificationTemplates.vue'),
              meta: { title: '通知模板', permission: 'settings:notification-templates:view' }
            },
            {
              path: 'notification-service',
              name: 'NotificationService',
              component: () => import('@/views/settings/NotificationService.vue'),
              meta: { title: '通知服务', permission: 'settings:notification-service:view' }
            },
            {
              path: 'operation-logs',
              name: 'OperationLogs',
              component: () => import('@/views/settings/OperationLogs.vue'),
              meta: { title: '操作日志', permission: 'settings:operation-logs:view' }
            },
            {
              path: 'recycle-bin',
              name: 'RecycleBin',
              component: () => import('@/views/settings/RecycleBin.vue'),
              meta: { title: '回收站', permission: 'settings:recycle-bin:view' }
            }
          ]
        }
      ]
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  // 未登录 → 跳转登录页
  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    return next('/login')
  }

  // 已登录访问登录页 → 跳转首页
  if (to.path === '/login' && userStore.isLoggedIn) {
    return next('/')
  }

  // 已登录但用户信息未加载（刷新页面场景）→ 先加载用户信息
  if (userStore.isLoggedIn && !userStore.profileLoaded) {
    await userStore.ensureProfileLoaded()
    // 加载后如果 token 失效被 logout 了，重定向到登录页
    if (!userStore.isLoggedIn) {
      return next('/login')
    }
  }

  // 路由权限检查：如果路由配置了 permission，则检查用户是否拥有该权限
  const requiredPermission = to.meta.permission as string | undefined
  if (requiredPermission && userStore.isLoggedIn) {
    if (!userStore.hasPermission(requiredPermission)) {
      // 无权限：如果是从菜单进入，尝试跳转到有权限的第一个页面
      // 仪表盘是默认页，无权限则显示空白提示
      if (to.path === '/' || to.path === '') {
        // 仪表盘无权限也允许进入（显示基础信息）
        return next()
      }
      // 其他页面无权限，跳回首页
      return next('/')
    }
  }

  next()
})

export default router
