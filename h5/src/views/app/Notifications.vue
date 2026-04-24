<template>
  <div class="page-container" style="padding-bottom: 20px;">
    <van-nav-bar title="消息通知" left-arrow @click-left="$router.back()" />

    <van-loading v-if="loading" size="24px" style="text-align:center;padding:40px;" />

    <template v-else>
      <div v-if="notifications.length" class="noti-list">
        <div v-for="item in notifications" :key="item.id" class="noti-card card" :class="{ unread: !item.read }">
          <div class="noti-header">
            <div class="noti-icon-wrap" :style="{ background: typeColors[item.type] + '18' }">
              <van-icon :name="typeIcons[item.type] || 'info-o'" :color="typeColors[item.type] || '#6366f1'" size="18" />
            </div>
            <div class="noti-body">
              <div class="noti-title-row">
                <span class="noti-title">{{ item.title }}</span>
                <span v-if="!item.read" class="noti-dot"></span>
              </div>
              <div class="noti-content">{{ item.content }}</div>
              <div class="noti-time">{{ formatTime(item.time) }}</div>
            </div>
          </div>
        </div>
      </div>
      <van-empty v-else description="暂无通知" image="search" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getNotifications } from '@/api/app'

const loading = ref(true)
const notifications = ref<any[]>([])

const typeColors: Record<string, string> = {
  system: '#6366f1',
  warning: '#f59e0b',
  info: '#3b82f6',
  error: '#ef4444'
}

const typeIcons: Record<string, string> = {
  system: 'bell',
  warning: 'warning-o',
  info: 'info-o',
  error: 'close'
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return d.toLocaleDateString('zh-CN')
}

onMounted(async () => {
  try {
    const { data } = await getNotifications()
    if (data?.success) notifications.value = data.data || []
  } catch (e) {
    console.error('[Notifications] load error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.noti-list {
  display: flex; flex-direction: column; gap: 8px;
}
.noti-card {
  transition: transform 0.15s;
}
.noti-card.unread {
  border-left: 3px solid #6366f1;
}
.noti-header {
  display: flex; gap: 12px; align-items: flex-start;
}
.noti-icon-wrap {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.noti-body { flex: 1; min-width: 0; }
.noti-title-row {
  display: flex; align-items: center; gap: 6px;
}
.noti-title {
  font-size: 14px; font-weight: 600; color: #1f2937;
}
.noti-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #ef4444;
}
.noti-content {
  font-size: 13px; color: #6b7280; margin-top: 4px;
  line-height: 1.5;
}
.noti-time {
  font-size: 11px; color: #d1d5db; margin-top: 4px;
}
</style>
