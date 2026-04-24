<template>
  <div class="page-container">
    <!-- 问候区域 -->
    <div class="greeting-section">
      <div class="greeting-left">
        <div class="greeting-hello">{{ greetingText }}，{{ authStore.user?.name || '用户' }}</div>
        <div class="greeting-date">{{ todayStr }} {{ weekDay }}</div>
      </div>
      <div class="greeting-avatar" @click="$router.push('/app/profile')">
        <img v-if="avatarSrc" class="avatar-img-sm" :src="avatarSrc" />
        <div v-else class="avatar-sm" :style="{ background: avatarBg }">{{ avatarChar }}</div>
      </div>
    </div>

    <!-- 今日概览 -->
    <div class="card overview-card">
      <div class="card-title">今日概览</div>
      <div class="stat-grid">
        <div class="stat-card" @click="$router.push('/app/customers')">
          <div class="stat-icon si-green"><van-icon name="friends-o" /></div>
          <div class="stat-value">{{ homeData.myCustomerCount ?? '-' }}</div>
          <div class="stat-label">我的客户</div>
        </div>
        <div class="stat-card" @click="$router.push('/app/customers')">
          <div class="stat-icon si-blue"><van-icon name="add-o" /></div>
          <div class="stat-value">+{{ homeData.todayNewCount ?? 0 }}</div>
          <div class="stat-label">今日新增</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-orange"><van-icon name="chat-o" /></div>
          <div class="stat-value">{{ homeData.pendingReplyCount ?? 0 }}</div>
          <div class="stat-label">待回复</div>
        </div>
        <div class="stat-card" @click="$router.push('/app/stats')">
          <div class="stat-icon si-pink"><van-icon name="todo-list-o" /></div>
          <div class="stat-value">{{ homeData.todayFollowUpCount ?? 0 }}</div>
          <div class="stat-label">今日跟进</div>
        </div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <div class="card">
      <div class="card-title">快捷入口</div>
      <div class="shortcut-grid">
        <div class="shortcut-item" @click="$router.push('/app/customers')">
          <div class="shortcut-icon si-blue"><van-icon name="friends-o" /></div>
          <span>客户</span>
        </div>
        <div class="shortcut-item" @click="$router.push('/app/stats')">
          <div class="shortcut-icon si-purple"><van-icon name="chart-trending-o" /></div>
          <span>报表</span>
        </div>
        <div class="shortcut-item" @click="$router.push('/app/scripts')">
          <div class="shortcut-icon si-orange"><van-icon name="chat-o" /></div>
          <span>话术</span>
        </div>
        <div class="shortcut-item" @click="$router.push('/app/profile')">
          <div class="shortcut-icon si-green"><van-icon name="contact-o" /></div>
          <span>我的</span>
        </div>
      </div>
    </div>

    <!-- 最近动态 -->
    <div class="card">
      <div class="card-title-row">
        <span class="card-title" style="margin-bottom:0">最近动态</span>
        <span class="card-more" @click="loadActivities">刷新</span>
      </div>
      <van-loading v-if="actLoading" size="24px" style="text-align:center;padding:20px;" />
      <template v-else>
        <div v-if="activities.length" class="activity-list">
          <div v-for="(item, i) in activities" :key="i" class="activity-item">
            <div class="activity-icon-wrap" :style="{ background: item.color + '18' }">
              <van-icon :name="item.icon" :color="item.color" size="16" />
            </div>
            <div class="activity-body">
              <div class="activity-title">{{ item.title }}</div>
              <div class="activity-text">{{ item.content }}</div>
              <div class="activity-time">{{ item.timeText }}</div>
            </div>
          </div>
        </div>
        <van-empty v-else description="暂无动态" image="search" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getHomeData, getActivities } from '@/api/app'

const authStore = useAuthStore()
const loading = ref(true)
const actLoading = ref(false)

interface HomeDataType {
  myCustomerCount?: number
  todayNewCount?: number
  pendingReplyCount?: number
  todayFollowUpCount?: number
}

const homeData = ref<HomeDataType>({})
const activities = ref<any[]>([])

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const weekDay = computed(() => {
  return ['日', '一', '二', '三', '四', '五', '六'][new Date().getDay()]
    ? `周${'日一二三四五六'[new Date().getDay()]}` : ''
})

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const avatarChar = computed(() => {
  const name = authStore.user?.name || authStore.user?.username || ''
  return name ? name.charAt(name.length - 1) : ''
})

const avatarSrc = computed(() => {
  const url = authStore.user?.avatar
  return url && url.trim() ? url : undefined
})

const avatarColors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']
const avatarBg = computed(() => {
  const name = authStore.user?.name || ''
  return avatarColors[(name.charCodeAt(0) || 0) % avatarColors.length]
})

async function loadData() {
  loading.value = true
  try {
    const { data } = await getHomeData()
    if (data?.success) {
      homeData.value = data.data || {}
    }
  } catch (e) {
    console.error('[Home] loadData error:', e)
  } finally {
    loading.value = false
  }
}

async function loadActivities() {
  actLoading.value = true
  try {
    const { data } = await getActivities({ page: 1, pageSize: 10 })
    if (data?.success) {
      activities.value = data.data || []
    }
  } catch (e) {
    console.error('[Home] loadActivities error:', e)
  } finally {
    actLoading.value = false
  }
}

onMounted(() => {
  loadData()
  loadActivities()
})
</script>

<style scoped>
.greeting-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px 8px;
}
.greeting-hello {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}
.greeting-date {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 4px;
}
.avatar-img-sm {
  width: 40px; height: 40px; border-radius: 50%;
  object-fit: cover; display: block;
}
.avatar-sm {
  width: 40px; height: 40px; border-radius: 12px;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; letter-spacing: 0;
}
.overview-card { background: linear-gradient(135deg, #667eea22, #764ba222); }
.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.stat-card {
  text-align: center;
  padding: 12px 8px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s;
}
.stat-card:active { transform: scale(0.97); }
.stat-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 18px; margin-bottom: 6px;
}
.si-green { background: #ecfdf5; color: #10b981; }
.si-blue { background: #eff6ff; color: #3b82f6; }
.si-orange { background: #fff7ed; color: #f59e0b; }
.si-pink { background: #fdf2f8; color: #ec4899; }
.si-purple { background: #f5f3ff; color: #8b5cf6; }
.stat-card .stat-value {
  font-size: 22px; font-weight: 700; color: #1f2937; line-height: 1.2;
}
.stat-card .stat-label {
  font-size: 12px; color: #9ca3af; margin-top: 2px;
}

/* 快捷入口 */
.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.shortcut-item {
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  cursor: pointer; padding: 8px 0;
  transition: transform 0.15s;
}
.shortcut-item:active { transform: scale(0.93); }
.shortcut-icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
}
.shortcut-item span {
  font-size: 12px; color: #374151; font-weight: 500;
}

/* 动态 */
.card-title-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.card-more {
  font-size: 12px; color: #6366f1; cursor: pointer;
}
.activity-list {
  display: flex; flex-direction: column; gap: 14px;
}
.activity-item {
  display: flex; gap: 12px; align-items: flex-start;
}
.activity-icon-wrap {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.activity-body { flex: 1; min-width: 0; }
.activity-title {
  font-size: 13px; font-weight: 600; color: #374151;
}
.activity-text {
  font-size: 13px; color: #6b7280; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.activity-time {
  font-size: 11px; color: #d1d5db; margin-top: 2px;
}
</style>
