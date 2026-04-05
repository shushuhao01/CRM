import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '云客CRM - 智能销售管理系统', description: '专为销售团队打造的智能客户关系管理系统' }
  },
  {
    path: '/features',
    name: 'Features',
    component: () => import('@/views/Features.vue'),
    meta: { title: '功能介绍 - 云客CRM', description: '全面的客户管理、订单处理、业绩分析功能' }
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('@/views/Pricing.vue'),
    meta: { title: '价格方案 - 云客CRM', description: '灵活的定价方案，满足不同规模企业需求' }
  },
  {
    path: '/solutions',
    name: 'Solutions',
    component: () => import('@/views/Solutions.vue'),
    meta: { title: '解决方案 - 云客CRM', description: '为电商、教育、金融等行业提供专属解决方案' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue'),
    meta: { title: '关于我们 - 云客CRM', description: '广州仙狐网络科技有限公司，专注CRM解决方案' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '免费注册 - 云客CRM', description: '立即注册体验云客CRM，免费试用7天' }
  },
  {
    path: '/pay-success',
    name: 'PaySuccess',
    component: () => import('@/views/PaySuccess.vue'),
    meta: { title: '支付成功 - 云客CRM' }
  },
  {
    path: '/docs',
    name: 'Docs',
    component: () => import('@/views/Docs.vue'),
    meta: { title: '帮助文档 - 云客CRM', description: '云客CRM使用指南与帮助文档' }
  },
  {
    path: '/docs/:category/:doc',
    name: 'DocDetail',
    component: () => import('@/views/DocDetail.vue'),
    meta: { title: '文档详情 - 云客CRM' }
  },
  {
    path: '/agreement/:type',
    name: 'Agreement',
    component: () => import('@/views/Agreement.vue'),
    meta: { title: '服务协议 - 云客CRM' }
  },
  // 会员中心 - 登录页（无需认证）
  {
    path: '/member/login',
    name: 'MemberLogin',
    component: () => import('@/views/member/Login.vue'),
    meta: { title: '会员登录 - 云客CRM' }
  },
  // 会员中心 - 需要认证的页面
  {
    path: '/member',
    component: () => import('@/components/MemberLayout.vue'),
    meta: { requiresMember: true },
    children: [
      { path: '', redirect: '/member/dashboard' },
      { path: 'dashboard', name: 'MemberDashboard', component: () => import('@/views/member/Dashboard.vue'), meta: { title: '会员中心 - 云客CRM', requiresMember: true } },
      { path: 'profile', name: 'MemberProfile', component: () => import('@/views/member/Profile.vue'), meta: { title: '企业信息 - 云客CRM', requiresMember: true } },
      { path: 'subscription', name: 'MemberSubscription', component: () => import('@/views/member/Subscription.vue'), meta: { title: '订阅管理 - 云客CRM', requiresMember: true } },
      { path: 'bills', name: 'MemberBills', component: () => import('@/views/member/Bills.vue'), meta: { title: '账单记录 - 云客CRM', requiresMember: true } },
      { path: 'license', name: 'MemberLicense', component: () => import('@/views/member/License.vue'), meta: { title: '授权信息 - 云客CRM', requiresMember: true } },
      { path: 'password', name: 'MemberPassword', component: () => import('@/views/member/Password.vue'), meta: { title: '修改密码 - 云客CRM', requiresMember: true } },
      { path: 'capacity', name: 'MemberCapacity', component: () => import('@/views/member/Capacity.vue'), meta: { title: '扩容管理 - 云客CRM', requiresMember: true } },
      { path: 'renew', name: 'MemberRenew', component: () => import('@/views/member/Renew.vue'), meta: { title: '续费升级 - 云客CRM', requiresMember: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (_to.hash) {
      return { el: _to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// 会员中心路由守卫
router.beforeEach((to, _from, next) => {
  if (to.meta?.requiresMember) {
    const token = localStorage.getItem('member_token')
    if (!token) {
      return next({ path: '/member/login', query: { redirect: to.fullPath } })
    }
  }
  next()
})

// SEO：动态设置页面标题和 meta description
router.afterEach((to) => {
  const title = (to.meta?.title as string) || '云客CRM - 智能销售管理系统'
  document.title = title

  const description = (to.meta?.description as string)
  if (description) {
    let metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute('content', description)
    } else {
      metaDesc = document.createElement('meta')
      metaDesc.setAttribute('name', 'description')
      metaDesc.setAttribute('content', description)
      document.head.appendChild(metaDesc)
    }
  }
})

export default router
