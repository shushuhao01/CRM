<template>
  <div class="notice-detail-page">
    <div class="container">
      <nav v-if="item" class="breadcrumb">
        <router-link to="/">首页</router-link>
        <span>/</span>
        <router-link to="/notice">公告</router-link>
        <span>/</span>
        <span class="current">{{ item.title }}</span>
      </nav>

      <div v-if="loading" class="state-box">加载中...</div>
      <div v-else-if="!item" class="state-box">
        <p>公告不存在或已下线</p>
        <router-link to="/notice" class="btn btn-primary">返回公告</router-link>
      </div>

      <article v-else class="notice-wrap">
        <header class="notice-header">
          <h1>{{ item.title }}</h1>
          <div class="notice-meta">
            <time v-if="item.publishedAt" :datetime="item.publishedAt">发布时间：{{ formatDate(item.publishedAt) }}</time>
          </div>
        </header>

        <div class="notice-content" v-html="item.content || ''"></div>

        <div class="notice-actions">
          <router-link to="/notice" class="btn btn-outline">← 返回公告</router-link>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import type { SiteNoticeDetail } from '@/api/site'

const route = useRoute()

/**
 * 公告数据由 main.ts 的 router.beforeResolve 守卫写入 route.meta.state，
 * SSR 期间由 vite-ssg 序列化进 window.__INITIAL_STATE__，客户端首屏直接复用，避免二次请求。
 */
const item = computed<SiteNoticeDetail | null>(
  () => ((route.meta?.state as any)?.notice as SiteNoticeDetail | null) ?? null
)

const loading = computed(() => {
  const state = route.meta?.state as any
  return !state || !('notice' in state)
})

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

useHead(() => {
  const n = item.value
  const title = n ? (n.seoTitle || `${n.title} - 云客CRM公告`) : '公告详情 - 云客CRM'
  const description = n?.seoDescription || n?.summary || ''
  const meta: { name?: string; property?: string; content: string }[] = [
    { property: 'og:title', content: title }
  ]
  if (description) {
    meta.push({ name: 'description', content: description })
    meta.push({ property: 'og:description', content: description })
  }
  if (n?.seoKeywords) meta.push({ name: 'keywords', content: n.seoKeywords })
  // Article 结构化数据
  const script = n
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: n.seoTitle || n.title,
            description: description || undefined,
            datePublished: n.publishedAt || undefined,
            dateModified: n.updatedAt || n.publishedAt || undefined,
            author: { '@type': 'Organization', name: '云客CRM' },
            publisher: { '@type': 'Organization', name: '广州仙狐网络科技有限公司' },
            mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.yunkes.com/notice/${n.slug}` }
          }).replace(/</g, '\\u003c')
        }
      ]
    : []
  return { title, meta, script }
})
</script>

<style lang="scss" scoped>
.notice-detail-page {
  padding-top: 80px;
  padding-bottom: 100px;
  background: #f8fafc;
  min-height: 100vh;
}

.container {
  max-width: 860px;
}

.breadcrumb {
  padding: 24px 0;
  font-size: 14px;
  color: var(--text-muted);

  a {
    color: var(--text-secondary);
    &:hover { color: var(--primary); }
  }

  span { margin: 0 8px; }

  .current {
    color: var(--text-primary);
    display: inline-block;
    max-width: 320px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }
}

.state-box {
  text-align: center;
  padding: 100px 0;
  color: var(--text-muted);
  font-size: 16px;

  p { margin-bottom: 20px; }
}

.notice-wrap {
  background: white;
  border-radius: var(--radius-lg);
  padding: 48px;
  box-shadow: var(--shadow-sm);
}

.notice-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);

  h1 {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.4;
    margin-bottom: 16px;
  }
}

.notice-meta {
  font-size: 14px;
  color: var(--text-muted);
}

.notice-content {
  line-height: 1.9;
  color: var(--text-secondary);

  :deep(h2) {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 32px 0 16px;
  }

  :deep(h3) {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 24px 0 12px;
  }

  :deep(p) { margin-bottom: 16px; }

  :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    margin: 16px 0;
  }

  :deep(ul), :deep(ol) {
    margin-bottom: 16px;
    padding-left: 24px;
    li { margin-bottom: 8px; }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    th, td {
      padding: 12px;
      border: 1px solid var(--border);
      text-align: left;
    }
    th { background: var(--bg-light); font-weight: 600; }
  }

  :deep(pre) {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;
  }

  :deep(blockquote) {
    background: #f1f5f9;
    border-left: 4px solid var(--primary);
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
  }

  :deep(a) {
    color: var(--primary);
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

.notice-actions {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .notice-wrap { padding: 24px; }
  .notice-header h1 { font-size: 22px; }
}
</style>
