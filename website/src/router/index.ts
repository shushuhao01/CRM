import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/features',
    name: 'Features',
    component: () => import('@/views/Features.vue')
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('@/views/Pricing.vue')
  },
  {
    path: '/solutions',
    name: 'Solutions',
    component: () => import('@/views/Solutions.vue')
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/About.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue')
  },
  {
    path: '/pay-success',
    name: 'PaySuccess',
    component: () => import('@/views/PaySuccess.vue')
  },
  {
    path: '/docs',
    name: 'Docs',
    component: () => import('@/views/Docs.vue')
  },
  {
    path: '/docs/:category/:doc',
    name: 'DocDetail',
    component: () => import('@/views/DocDetail.vue')
  },
  {
    path: '/agreement/:type',
    name: 'Agreement',
    component: () => import('@/views/Agreement.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

export default router
