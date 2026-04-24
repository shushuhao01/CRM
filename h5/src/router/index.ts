import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  // 工作台应用（底部Tab布局）
  {
    path: '/app',
    component: () => import('@/views/layout/AppLayout.vue'),
    children: [
      { path: '', redirect: '/app/home' },
      { path: 'home', name: 'AppHome', component: () => import('@/views/app/Home.vue'), meta: { title: '首页' } },
      { path: 'customers', name: 'AppCustomers', component: () => import('@/views/app/CustomerList.vue'), meta: { title: '客户' } },
      { path: 'stats', name: 'AppStats', component: () => import('@/views/app/Stats.vue'), meta: { title: '数据' } },
      { path: 'profile', name: 'AppProfile', component: () => import('@/views/app/Profile.vue'), meta: { title: '我的' } },
    ]
  },
  // 客户详情（独立页面，不带底部Tab）
  {
    path: '/app/customer/:id',
    name: 'AppCustomerDetail',
    component: () => import('@/views/app/CustomerDetail.vue'),
    meta: { title: '客户详情' }
  },
  // 个人信息
  {
    path: '/app/profile/info',
    name: 'ProfileInfo',
    component: () => import('@/views/app/ProfileInfo.vue'),
    meta: { title: '个人信息' }
  },
  // 消息通知
  {
    path: '/app/notifications',
    name: 'Notifications',
    component: () => import('@/views/app/Notifications.vue'),
    meta: { title: '消息通知' }
  },
  // 话术管理
  {
    path: '/app/scripts',
    name: 'ScriptsManage',
    component: () => import('@/views/app/ScriptsManage.vue'),
    meta: { title: '快捷话术' }
  },
  // 关于
  {
    path: '/app/about',
    name: 'About',
    component: () => import('@/views/app/About.vue'),
    meta: { title: '关于' }
  },
  // 绑定CRM系统用户（企微成员↔CRM用户）
  {
    path: '/app/bind-user',
    name: 'BindUser',
    component: () => import('@/views/app/BindUser.vue'),
    meta: { title: '绑定CRM系统用户' }
  },
  // 客户绑定CRM（企微客户↔CRM客户）
  {
    path: '/app/bind-wecom',
    name: 'BindWecom',
    component: () => import('@/views/app/BindWecom.vue'),
    meta: { title: '客户关联CRM' }
  },
  // 绑定页面
  {
    path: '/bind',
    name: 'Bind',
    component: () => import('@/views/common/BindAccount.vue'),
    meta: { title: '绑定CRM账号' }
  },
  // 默认重定向
  { path: '/', redirect: '/app/home' },
  { path: '/:pathMatch(.*)*', redirect: '/app/home' }
]

const router = createRouter({
  history: createWebHashHistory('/h5/'),
  routes
})

// 全局前置守卫：检查登录状态
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()
  document.title = (to.meta?.title as string) || '云客CRM'

  // 绑定页面不需要验证
  if (to.path === '/bind') {
    return next()
  }

  // 未登录时跳转绑定页
  if (!authStore.token && !authStore.isInitializing) {
    return next('/bind')
  }

  next()
})

export default router
