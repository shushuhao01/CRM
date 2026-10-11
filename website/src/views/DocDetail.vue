<template>
  <div class="doc-detail-page">
    <div class="doc-layout">
      <!-- 侧边栏 -->
      <aside class="doc-sidebar">
        <div class="sidebar-header">
          <router-link to="/docs" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回文档中心
          </router-link>
        </div>
        <nav class="sidebar-nav">
          <div v-for="category in docCategories" :key="category.key" class="nav-category">
            <h4>{{ category.title }}</h4>
            <ul>
              <li v-for="item in category.items" :key="item.key">
                <router-link
                  :to="`/docs/${category.key}/${item.key}`"
                  :class="{ active: currentDoc === item.key && currentCategory === category.key }"
                >
                  {{ item.title }}
                </router-link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- 文档内容 -->
      <main class="doc-main">
        <article class="doc-article">
          <div class="doc-header">
            <span class="doc-category-tag">{{ currentCategoryTitle }}</span>
            <h1>{{ currentDocTitle }}</h1>
            <p class="doc-meta">最后更新：2025年1月</p>
          </div>
          <div v-if="isLoading" class="doc-loading">
            <p>文档加载中...</p>
          </div>
          <div v-else class="doc-content" v-html="renderedContent"></div>
        </article>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead } from '@unhead/vue'
import { marked } from 'marked'
import { docCategories, getDocTitle, getCategoryTitle } from '@/data/docs'

const route = useRoute()

interface DocState {
  category: string
  doc: string
  markdown: string
}

/**
 * 文档 Markdown 由 main.ts 的 router.beforeResolve 守卫读取（SSR 走 fs，客户端走 fetch）
 * 并写入 route.meta.state.docContent，经 vite-ssg 序列化后客户端首屏可直接复用。
 */
const docState = computed<DocState | undefined>(
  () => (route.meta?.state as any)?.docContent as DocState | undefined
)

const currentCategory = computed(() => docState.value?.category || String(route.params.category || 'start'))
const currentDoc = computed(() => docState.value?.doc || String(route.params.doc || 'intro'))
const currentCategoryTitle = computed(() => getCategoryTitle(currentCategory.value))
const currentDocTitle = computed(() => getDocTitle(currentCategory.value, currentDoc.value))
const renderedContent = computed(() => marked(docState.value?.markdown || '') as string)
const isLoading = computed(() => !docState.value)

useHead(() => {
  const docTitle = currentDocTitle.value
  const categoryTitle = currentCategoryTitle.value
  const title =
    docTitle && categoryTitle
      ? `${docTitle} - ${categoryTitle} | 云客CRM 帮助文档`
      : '帮助文档 - 云客CRM'
  const description =
    docTitle && categoryTitle
      ? `${docTitle}（${categoryTitle}）—— 云客CRM 帮助文档，提供详细的使用指引与操作说明。`
      : '云客CRM是专为销售团队打造的智能客户关系管理系统，集客户管理、订单处理、业绩分析、物流跟踪于一体，助力企业提升销售转化率。'
  // TechArticle 结构化数据
  const script =
    docTitle && categoryTitle
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TechArticle',
              headline: docTitle,
              description,
              articleSection: categoryTitle,
              publisher: { '@type': 'Organization', name: '广州仙狐网络科技有限公司' },
              mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://www.yunkes.com/docs/${currentCategory.value}/${currentDoc.value}`
              }
            }).replace(/</g, '\\u003c')
          }
        ]
      : []
  return {
    title,
    meta: [
      { property: 'og:title', content: title },
      { name: 'description', content: description },
      { property: 'og:description', content: description }
    ],
    script
  }
})
</script>

<style lang="scss" scoped>
.doc-detail-page {
  padding-top: 80px;
  min-height: 100vh;
  background: #f8fafc;
}

.doc-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  max-width: 1400px;
  margin: 0 auto;
}

.doc-sidebar {
  background: white;
  border-right: 1px solid var(--border);
  height: calc(100vh - 80px);
  position: sticky;
  top: 80px;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  transition: color 0.2s;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: var(--primary);
  }
}

.sidebar-nav {
  padding: 16px 0;
}

.nav-category {
  padding: 0 20px;
  margin-bottom: 24px;

  h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  ul {
    list-style: none;

    li a {
      display: block;
      padding: 8px 12px;
      font-size: 14px;
      color: var(--text-secondary);
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: var(--bg-light);
        color: var(--primary);
      }

      &.active {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary);
        font-weight: 500;
      }
    }
  }
}

.doc-main {
  padding: 40px 60px;
  max-width: 900px;
}

.doc-article {
  background: white;
  border-radius: 12px;
  padding: 48px;
  box-shadow: var(--shadow-sm);
}

.doc-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);

  h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 12px 0 8px;
  }
}

.doc-category-tag {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.doc-meta {
  font-size: 14px;
  color: var(--text-muted);
}

.doc-loading {
  text-align: center;
  padding: 60px 0;
  color: var(--text-muted);
  font-size: 16px;
}

.doc-content {
  line-height: 1.8;
  color: var(--text-secondary);

  :deep(h2) {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 32px 0 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h3) {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 24px 0 12px;
  }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(ul), :deep(ol) {
    margin-bottom: 16px;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
    }
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

    th {
      background: var(--bg-light);
      font-weight: 600;
    }
  }

  :deep(pre) {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;

    code {
      font-family: 'Fira Code', monospace;
      font-size: 14px;
    }
  }

  :deep(blockquote) {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
  }

  :deep(a) {
    color: #6366f1;
    text-decoration: underline;
    text-underline-offset: 3px;
    font-weight: 500;
    transition: color 0.2s ease;

    &:hover {
      color: #4f46e5;
      text-decoration-thickness: 2px;
    }

    &:visited {
      color: #7c3aed;
    }
  }

  :deep(.tip) {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
  }
}

@media (max-width: 1024px) {
  .doc-layout {
    grid-template-columns: 1fr;
  }

  .doc-sidebar {
    display: none;
  }

  .doc-main {
    padding: 24px;
  }

  .doc-article {
    padding: 24px;
  }
}
</style>
