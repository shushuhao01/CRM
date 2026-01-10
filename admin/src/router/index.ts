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
          meta: { title: '仪表盘', icon: 'DataAnalysis' }
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
              meta: { title: '客户列表' }
            },
            {
              path: 'detail/:id',
              name: 'PrivateCustomerDetail',
              component: () => import('@/views/private-customers/Detail.vue'),
              meta: { title: '客户详情', hidden: true }
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
              meta: { title: '客户列表' }
            },
            {
              path: 'packages',
              name: 'TenantPackages',
              component: () => import('@/views/tenant-customers/Packages.vue'),
              meta: { title: '套餐管理' }
            },
            {
              path: 'detail/:id',
              name: 'TenantCustomerDetail',
              component: () => import('@/views/tenant-customers/Detail.vue'),
              meta: { title: '客户详情', hidden: true }
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
              meta: { title: '模块列表' }
            },
            {
              path: 'config',
              name: 'ModuleConfig',
              component: () => import('@/views/modules/Config.vue'),
              meta: { title: '基础配置' }
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
              meta: { title: '支付列表' }
            },
            {
              path: 'config',
              name: 'PaymentConfig',
              component: () => import('@/views/payment/Config.vue'),
              meta: { title: '支付配置' }
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
              meta: { title: '版本列表' }
            },
            {
              path: 'upload',
              name: 'VersionUpload',
              component: () => import('@/views/versions/Upload.vue'),
              meta: { title: '上传新版本' }
            },
            {
              path: 'changelog',
              name: 'VersionChangelog',
              component: () => import('@/views/versions/Changelog.vue'),
              meta: { title: '更新日志' }
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
              meta: { title: '接口列表' }
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
              meta: { title: '管理员账号' }
            },
            {
              path: 'basic',
              name: 'BasicSettings',
              component: () => import('@/views/settings/Basic.vue'),
              meta: { title: '基础配置' }
            }
          ]
        }
      ]
    }
  ]
})

router.beforeEach((to, _from, next) => {
  const userStore = useUserStore()

  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
