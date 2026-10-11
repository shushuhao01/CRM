<template>
  <div class="blog-detail-page">
    <div class="container">
      <nav v-if="article" class="breadcrumb">
        <router-link to="/">首页</router-link>
        <span>/</span>
        <router-link to="/blog">博客文章</router-link>
        <span>/</span>
        <span class="current">{{ article.title }}</span>
      </nav>

      <div v-if="loading" class="state-box">加载中...</div>
      <div v-else-if="!article" class="state-box">
        <p>文章不存在或已下线</p>
        <router-link to="/blog" class="btn btn-primary">返回博客列表</router-link>
      </div>

      <article v-else class="article-wrap">
        <header class="article-header">
          <span v-if="article.category" class="article-category">{{ article.category }}</span>
          <h1>{{ article.title }}</h1>
          <div class="article-meta">
            <span v-if="article.author">作者：{{ article.author }}</span>
            <time v-if="article.publishedAt" :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
            <span>{{ article.viewCount || 0 }} 阅读</span>
          </div>
        </header>

        <div class="article-content" v-html="article.content || ''"></div>

        <div v-if="article.tags" class="article-tags">
          <span v-for="tag in tagList" :key="tag" class="tag"># {{ tag }}</span>
        </div>

        <nav v-if="article.prev || article.next" class="article-nav">
          <router-link
            v-if="article.prev"
            :to="`/blog/${article.prev.slug || article.prev.id}`"
            class="nav-item prev"
          >
            <span class="nav-label">上一篇</span>
            <span class="nav-title">{{ article.prev.title }}</span>
          </router-link>
          <span v-else class="nav-item empty"></span>
          <router-link
            v-if="article.next"
            :to="`/blog/${article.next.slug || article.next.id}`"
            class="nav-item next"
          >
            <span class="nav-label">下一篇</span>
            <span class="nav-title">{{ article.next.title }}</span>
          </router-link>
          <span v-else class="nav-item empty"></span>
        </nav>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getArticle, applySeoMeta, type SiteArticleDetail } from '@/api/site'

const route = useRoute()
const article = ref<SiteArticleDetail | null>(null)
const loading = ref(false)

const tagList = computed(() => {
  if (!article.value?.tags) return []
  return article.value.tags.split(',').map(t => t.trim()).filter(Boolean)
})

async function load() {
  const key = (route.params.slug as string) || ''
  if (!key) return
  loading.value = true
  const data = await getArticle(key)
  article.value = data
  if (data) {
    applySeoMeta({
      title: data.seoTitle || `${data.title} - 云客CRM`,
      description: data.seoDescription || data.summary,
      keywords: data.seoKeywords
    })
  }
  loading.value = false
}

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

watch(() => route.params.slug, load)
onMounted(load)
</script>

<style lang="scss" scoped>
.blog-detail-page {
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

.article-wrap {
  background: white;
  border-radius: var(--radius-lg);
  padding: 48px;
  box-shadow: var(--shadow-sm);
}

.article-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);

  h1 {
    font-size: 32px;
    font-weight: 700;
    line-height: 1.4;
    margin: 12px 0 16px;
  }
}

.article-category {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  font-size: 14px;
  color: var(--text-muted);
}

.article-content {
  line-height: 1.9;
  color: var(--text-secondary);

  :deep(h2) {
    font-size: 24px;
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

.article-tags {
  margin-top: 32px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag {
  font-size: 13px;
  color: var(--primary);
  background: rgba(99, 102, 241, 0.08);
  padding: 4px 12px;
  border-radius: 20px;
}

.article-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

.nav-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 20px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all 0.2s ease;

  &:hover:not(.empty) {
    border-color: var(--primary);
    box-shadow: var(--shadow-sm);
  }

  &.next { text-align: right; }
  &.empty { border: none; }
}

.nav-label {
  font-size: 12px;
  color: var(--text-muted);
}

.nav-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .article-wrap { padding: 24px; }
  .article-header h1 { font-size: 24px; }
  .article-nav { grid-template-columns: 1fr; }
  .nav-item.next { text-align: left; }
}
</style>
