<template>
  <div class="notice-page">
    <section class="page-hero">
      <div class="container">
        <h1>最新<span class="gradient-text">公告</span></h1>
        <p>产品发布、服务通知与站点公告</p>
      </div>
    </section>

    <section class="list-content">
      <div class="container">
        <div v-if="loading" class="state-box">加载中...</div>
        <div v-else-if="list.length === 0" class="state-box">
          <p>暂无公告</p>
        </div>
        <ul v-else class="notice-list">
          <li v-for="item in list" :key="item.id" class="notice-item">
            <router-link :to="`/notice/${item.slug || item.id}`" class="notice-link">
              <div class="notice-date">
                <time v-if="item.publishedAt" :datetime="item.publishedAt">
                  <span class="day">{{ formatDay(item.publishedAt) }}</span>
                  <span class="ym">{{ formatYM(item.publishedAt) }}</span>
                </time>
              </div>
              <div class="notice-body">
                <h3 class="notice-title">
                  <span v-if="item.isTop" class="top-badge">置顶</span>
                  {{ item.title }}
                </h3>
                <p class="notice-summary">{{ item.summary || '' }}</p>
              </div>
              <span class="notice-arrow">→</span>
            </router-link>
          </li>
        </ul>

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
import { getNotices, type SiteNoticeItem } from '@/api/site'

const route = useRoute()
const router = useRouter()

const list = ref<SiteNoticeItem[]>([])
const total = ref(0)
const pageSize = ref(12)
const loading = ref(false)

const page = computed(() => Number(route.query.page) || 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

async function load() {
  loading.value = true
  const res = await getNotices({ page: page.value, pageSize: 12 })
  list.value = res?.list || []
  total.value = res?.total || 0
  pageSize.value = res?.pageSize || 12
  loading.value = false
}

function goPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  router.push({ path: '/notice', query: p > 1 ? { page: String(p) } : {} })
}

function formatDay(v: string) {
  const d = new Date(v)
  return String(d.getDate()).padStart(2, '0')
}

function formatYM(v: string) {
  const d = new Date(v)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

watch(() => route.query.page, load)
onMounted(load)
</script>

<style lang="scss" scoped>
.notice-page {
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

.container {
  max-width: 900px;
}

.state-box {
  text-align: center;
  padding: 80px 0;
  color: var(--text-muted);
  font-size: 16px;
}

.notice-list {
  list-style: none;
}

.notice-item {
  border-bottom: 1px solid var(--border);

  &:first-child {
    border-top: 1px solid var(--border);
  }
}

.notice-link {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px 8px;
  transition: all 0.2s ease;

  &:hover {
    background: var(--bg-light);
    padding-left: 16px;
    padding-right: 16px;

    .notice-title { color: var(--primary); }
    .notice-arrow { color: var(--primary); transform: translateX(4px); }
  }
}

.notice-date {
  flex-shrink: 0;
  width: 72px;
  text-align: center;

  time {
    display: flex;
    flex-direction: column;
  }

  .day {
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
    line-height: 1.2;
  }

  .ym {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.notice-body {
  flex: 1;
  min-width: 0;
}

.notice-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  transition: color 0.2s ease;
}

.top-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: #dc2626;
  background: #fef2f2;
  padding: 1px 8px;
  border-radius: 10px;
  margin-right: 6px;
  vertical-align: middle;
}

.notice-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-arrow {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 18px;
  transition: all 0.2s ease;
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

@media (max-width: 640px) {
  .page-hero h1 { font-size: 36px; }
  .notice-link { gap: 16px; }
  .notice-date { width: 56px; }
  .notice-summary { white-space: normal; }
}
</style>
