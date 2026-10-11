<template>
  <div id="website-app">
    <Navbar />
    <router-view />
    <Footer />
    <CustomerService />
  </div>
</template>

<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useRoute } from 'vue-router'
import Navbar from './components/Navbar.vue'
import Footer from './components/Footer.vue'
import CustomerService from './components/CustomerService.vue'

/** 官网规范域名（与 vite.config / sitemap 保持一致） */
const ORIGIN = 'https://www.yunkes.com'
const DEFAULT_TITLE = '云客CRM - 智能销售管理系统'
const DEFAULT_DESCRIPTION =
  '云客CRM是专为销售团队打造的智能客户关系管理系统，集客户管理、订单处理、业绩分析、物流跟踪于一体，助力企业提升销售转化率。'

const route = useRoute()

/**
 * 全局 SEO 标签（默认值）
 * - 静态页（首页/功能/价格等）直接使用路由 meta 中的 title/description
 * - 详情页（文章/案例/公告/文档）会在各自组件内再次 useHead 覆盖 title/description/og/JSON-LD
 *   （unhead 后注册者胜出，子组件晚于 App 注册）
 */
useHead(() => {
  const meta = (route.meta || {}) as Record<string, any>
  const title = (meta.title as string) || DEFAULT_TITLE
  const description = (meta.description as string) || DEFAULT_DESCRIPTION
  const canonical = route.path === '/' ? `${ORIGIN}/` : `${ORIGIN}${route.path}`
  // 首页输出 SoftwareApplication 结构化数据（其余页面由各自的详情组件输出专属 JSON-LD）
  const script =
    route.path === '/'
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: '云客CRM',
              applicationCategory: 'BusinessApplication',
              operatingSystem: 'Web, Android, iOS',
              description: '智能销售管理系统，助力企业高效管理客户、订单、业绩，提升销售转化率',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'CNY',
                description: '免费试用14天'
              },
              provider: {
                '@type': 'Organization',
                name: '广州仙狐网络科技有限公司'
              }
            }).replace(/</g, '\\u003c')
          }
        ]
      : []
  return {
    title,
    link: [{ rel: 'canonical', href: canonical }],
    meta: [
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: '云客CRM' },
      { property: 'og:locale', content: 'zh_CN' }
    ],
    script
  }
})
</script>

<style lang="scss">
#website-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
