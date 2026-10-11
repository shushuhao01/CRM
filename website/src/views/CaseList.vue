<template>
  <div class="case-page">
    <section class="page-hero">
      <div class="container">
        <h1>客户<span class="gradient-text">案例</span></h1>
        <p>各行业客户使用云客CRM的真实案例与落地成效</p>
      </div>
    </section>

    <section class="list-content">
      <div class="container">
        <div class="filter-bar">
          <button
            v-for="c in industries"
            :key="c"
            class="filter-btn"
            :class="{ active: activeIndustry === c }"
            @click="selectIndustry(c)"
          >{{ c || '全部行业' }}</button>
        </div>

        <div v-if="loading" class="state-box">加载中...</div>
        <div v-else-if="list.length === 0" class="state-box">
          <p>暂无案例</p>
        </div>
        <div v-else class="case-grid">
          <article v-for="item in list" :key="item.id" class="case-card">
            <router-link :to="`/cases/${item.slug || item.id}`" class="card-cover">
              <img v-if="item.cover" :src="item.cover" :alt="item.title" />
              <div v-else class="cover-placeholder">🏆</div>
            </router-link>
            <div class="card-body">
              <div class="card-meta">
                <span v-if="item.industry" class="card-industry">{{ item.industry }}</span>
                <span v-if="item.clientName" class="card-client">{{ item.clientName }}</span>
              </div>
              <h3 class="card-title">
                <router-link :to="`/cases/${item.slug || item.id}`">{{ item.title }}</router-link>
              </h3>
              <p class="card-summary">{{ item.summary || '' }}</p>
              <div class="card-foot">
                <time v-if="item.publishedAt" :datetime="item.publishedAt">{{ formatDate(item.publishedAt) }}</time>
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
import { getCases, type SiteCaseItem } from '@/api/site'

const route = useRoute()
const router = useRouter()

const industries = ['', '电商零售', '教育培训', '金融保险', '制造业', '企业服务']

const list = ref<SiteCaseItem[]>([])
const total = ref(0)
const pageSize = ref(12)
const loading = ref(false)

const page = computed(() => Number(route.query.page) || 1)
const activeIndustry = computed(() => (route.query.industry as string) || '')
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

async function load() {
  loading.value = true
  const res = await getCases({
    industry: activeIndustry.value || undefined,
    page: page.value,
    pageSize: 12
  })
  list.value = res?.list || []
  total.value = res?.total || 0
  pageSize.value = res?.pageSize || 12
  loading.value = false
}

function selectIndustry(value: string) {
  router.push({ path: '/cases', query: value ? { industry: value } : {} })
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  const query: Record<string, string> = {}
  if (activeIndustry.value) query.industry = activeIndustry.value
  if (p > 1) query.page = String(p)
  router.push({ path: '/cases', query })
}

function formatDate(v: string) {
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

watch(() => [route.query.industry, route.query.page], load)
onMounted(load)
</script>

<style lang="scss" scoped>
.case-page {
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

.case-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.case-card {
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
  gap: 10px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.card-industry {
  padding: 2px 10px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  font-weight: 500;
}

.card-client {
  color: var(--text-muted);
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
  .case-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .case-grid {
    grid-template-columns: 1fr;
  }

  .page-hero h1 {
    font-size: 36px;
  }
}
</style>
