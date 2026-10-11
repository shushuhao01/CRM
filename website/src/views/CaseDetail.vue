<template>
  <div class="case-detail-page">
    <div class="container">
      <nav v-if="item" class="breadcrumb">
        <router-link to="/">首页</router-link>
        <span>/</span>
        <router-link to="/cases">客户案例</router-link>
        <span>/</span>
        <span class="current">{{ item.title }}</span>
      </nav>

      <div v-if="loading" class="state-box">加载中...</div>
      <div v-else-if="!item" class="state-box">
        <p>案例不存在或已下线</p>
        <router-link to="/cases" class="btn btn-primary">返回案例列表</router-link>
      </div>

      <article v-else class="case-wrap">
        <header class="case-header">
          <div class="case-meta">
            <span v-if="item.industry" class="case-industry">{{ item.industry }}</span>
            <span v-if="item.clientName" class="case-client">{{ item.clientName }}</span>
          </div>
          <h1>{{ item.title }}</h1>
          <div class="case-sub">
            <time v-if="item.publishedAt" :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
            <span>{{ item.viewCount || 0 }} 阅读</span>
          </div>
        </header>

        <img v-if="item.cover" :src="item.cover" :alt="item.title" class="case-cover" />

        <div class="case-content" v-html="item.content || ''"></div>

        <div v-if="item.tags" class="case-tags">
          <span v-for="tag in tagList" :key="tag" class="tag"># {{ tag }}</span>
        </div>

        <div class="case-actions">
          <router-link to="/cases" class="btn btn-outline">← 返回案例列表</router-link>
          <router-link to="/register?plan=FREE_TRIAL" class="btn btn-primary">免费试用同款方案</router-link>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getCase, applySeoMeta, type SiteCaseDetail } from '@/api/site'

const route = useRoute()
const item = ref<SiteCaseDetail | null>(null)
const loading = ref(false)

const tagList = computed(() => {
  if (!item.value?.tags) return []
  return item.value.tags.split(',').map(t => t.trim()).filter(Boolean)
})

async function load() {
  const key = (route.params.slug as string) || ''
  if (!key) return
  loading.value = true
  const data = await getCase(key)
  item.value = data
  if (data) {
    applySeoMeta({
      title: data.seoTitle || `${data.title} - 云客CRM客户案例`,
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
.case-detail-page {
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

.case-wrap {
  background: white;
  border-radius: var(--radius-lg);
  padding: 48px;
  box-shadow: var(--shadow-sm);
}

.case-header {
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

.case-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.case-industry {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.case-client {
  font-size: 13px;
  color: var(--text-muted);
}

.case-sub {
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: var(--text-muted);
}

.case-cover {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: var(--radius);
  margin-bottom: 32px;
}

.case-content {
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

.case-tags {
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

.case-actions {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border);
}

@media (max-width: 640px) {
  .case-wrap { padding: 24px; }
  .case-header h1 { font-size: 24px; }
  .case-actions { flex-direction: column; }
}
</style>
