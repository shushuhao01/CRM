<template>
  <div class="blog-page">
    <section class="page-hero">
      <div class="container">
        <h1>博客<span class="gradient-text">文章</span></h1>
        <p>CRM 行业洞察、销售管理方法与产品实践</p>
      </div>
    </section>

    <section class="list-content">
      <div class="container">
        <div class="filter-bar">
          <button
            v-for="c in categories"
            :key="c.value"
            class="filter-btn"
            :class="{ active: activeCategory === c.value }"
            @click="selectCategory(c.value)"
          >{{ c.label }}</button>
        </div>

        <div v-if="loading" class="state-box">加载中...</div>
        <div v-else-if="list.length === 0" class="state-box">
          <p>暂无文章</p>
        </div>
        <div v-else class="article-grid">
          <article v-for="item in list" :key="item.id" class="article-card">
            <router-link :to="`/blog/${item.slug || item.id}`" class="card-cover">
              <img v-if="item.cover" :src="item.cover" :alt="item.title" />
              <div v-else class="cover-placeholder">📝</div>
            </router-link>
            <div class="card-body">
              <div class="card-meta">
                <span v-if="item.category" class="card-category">{{ item.category }}</span>
                <time v-if="item.publishedAt" :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
              </div>
              <h3 class="card-title">
                <router-link :to="`/blog/${item.slug || item.id}`">{{ item.title }}</router-link>
              </h3>
              <p class="card-summary">{{ item.summary || '' }}</p>
              <div class="card-foot">
                <span v-if="item.author">{{ item.author }}</span>
                <span>{{ item.viewCount || 0 }} 阅读</span>
              </div>
            </div>
          </article>
        </div>

        <div v-if="totalPages > 1" class="pagination">
          <button :disabled="page <= 1" @click="goPage(page - 1)">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button :disabled="page >= totalPages" @click="goPage(page + 1)">下一页</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticles, type SiteArticleItem } from '@/api/site'

const route = useRoute()
const router = useRouter()

const categories = [
  { label: '全部', value: '' },
  { label: '产品动态', value: '产品动态' },
  { label: '行业洞察', value: '行业洞察' },
  { label: '使用技巧', value: '使用技巧' },
  { label: '客户故事', value: '客户故事' }
]

const list = ref<SiteArticleItem[]>([])
const total = ref(0)
const pageSize = ref(12)
const loading = ref(false)

const page = computed(() => Number(route.query.page) || 1)
const activeCategory = computed(() => (route.query.category as string) || '')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

async function load() {
  loading.value = true
  const res = await getArticles({
    category: activeCategory.value || undefined,
    page: page.value,
    pageSize: 12
  })
  list.value = res?.list || []
  total.value = res?.total || 0
  pageSize.value = res?.pageSize || 12
  loading.value = false
}

function selectCategory(value: string) {
  router.push({ path: '/blog', query: value ? { category: value } : {} })
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  const query: Record<string, string> = {}
  if (activeCategory.value) query.category = activeCategory.value
  if (p > 1) query.page = String(p)
  router.push({ path: '/blog', query })
}

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

watch(() => [route.query.category, route.query.page], load)
onMounted(load)
</script>

<style lang="scss" scoped>
.blog-page {
  padding-top: 80px;
}

.page-hero {
  padding: 80px 0;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    color: var(--text-secondary);
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.list-content {
  padding: 60px 0 100px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  margin-bottom: 40px;
}

.filter-btn {
  padding: 8px 20px;
  border: 1px solid var(--border);
  border-radius: 30px;
  background: white;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--primary);
    color: var(--primary);
  }

  &.active {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
  }
}

.state-box {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
  font-size: 16px;
}

.article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.article-card {
  background: white;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
  }
}

.card-cover {
  display: block;
  aspect-ratio: 16 / 9;
  background: var(--bg-light);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0f2fe 100%);
}

.card-body {
  padding: 24px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.card-category {
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  font-weight: 500;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.5;
  margin-bottom: 10px;

  a {
    color: var(--text-primary);

    &:hover {
      color: var(--primary);
    }
  }
}

.card-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-foot {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 48px;

  button {
    padding: 8px 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: white;
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  span {
    font-size: 14px;
    color: var(--text-muted);
  }
}

@media (max-width: 1024px) {
  .article-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .article-grid {
    grid-template-columns: 1fr;
  }

  .page-hero h1 {
    font-size: 36px;
  }
}
</style>
