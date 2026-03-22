<template>
  <div class="notification-bell-container">
    <el-popover
      :visible="visible"
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="notification-popover"
      @update:visible="val => visible = val"
    >
      <template #reference>
        <div class="bell-trigger" @click="onBellClick">
          <el-badge :value="unreadCount > 99 ? '99+' : unreadCount" :hidden="unreadCount === 0" :max="99">
            <el-icon :size="20" class="bell-icon"><Bell /></el-icon>
          </el-badge>
        </div>
      </template>

      <!-- 弹窗头部 -->
      <div class="pop-header">
        <span class="pop-title">通知中心</span>
        <div class="pop-actions">
          <el-button v-if="unreadCount > 0" type="primary" link size="small" @click="handleMarkAllRead">全部已读</el-button>
          <el-button type="danger" link size="small" @click="handleClearAll" :disabled="notifications.length === 0">清空</el-button>
        </div>
      </div>

      <!-- 筛选 -->
      <div class="pop-filter">
        <el-radio-group v-model="filter" size="small" @change="loadNotifications">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="unread">未读</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 通知列表 -->
      <div class="pop-list" v-loading="loading">
        <template v-if="notifications.length > 0">
          <div
            v-for="item in notifications"
            :key="item.id"
            class="notify-item"
            :class="{ 'is-unread': !item.is_read }"
            @click="handleItemClick(item)"
          >
            <div class="notify-icon" :class="`level-${item.level}`">
              <el-icon v-if="item.level === 'success'" :size="16"><CircleCheck /></el-icon>
              <el-icon v-else-if="item.level === 'warning'" :size="16"><Warning /></el-icon>
              <el-icon v-else-if="item.level === 'error'" :size="16"><CircleClose /></el-icon>
              <el-icon v-else :size="16"><InfoFilled /></el-icon>
            </div>
            <div class="notify-body">
              <div class="notify-title">
                {{ item.title }}
                <el-tag v-if="!item.is_read" type="danger" size="small" effect="dark" round style="margin-left:4px;">新</el-tag>
              </div>
              <div class="notify-content">{{ item.content }}</div>
              <div class="notify-meta">
                <span class="notify-type">{{ getEventLabel(item.event_type) }}</span>
                <span class="notify-time">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>
            <el-button class="notify-del" type="danger" link size="small" :icon="Delete" @click.stop="handleDelete(item.id)" />
          </div>

          <div v-if="hasMore" class="pop-more" @click="loadMore">
            <el-button type="primary" link size="small">加载更多</el-button>
          </div>
        </template>
        <el-empty v-else description="暂无通知" :image-size="60" />
      </div>

      <!-- 底部 -->
      <div class="pop-footer">
        <el-button type="primary" link size="small" @click="goToSettings">
          <el-icon><Setting /></el-icon> 通知设置
        </el-button>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, CircleCheck, Warning, CircleClose, InfoFilled, Delete, Setting } from '@element-plus/icons-vue'
import request from '@/api/request'

const router = useRouter()
const visible = ref(false)
const loading = ref(false)
const unreadCount = ref(0)
const notifications = ref<any[]>([])
const filter = ref('all')
const page = ref(1)
const pageSize = 15
const total = ref(0)
const hasMore = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const eventLabels: Record<string, string> = {
  tenant_registered: '新注册',
  payment_created: '新订单',
  payment_success: '支付成功',
  payment_pending: '待支付',
  payment_cancelled: '取消支付',
  license_expiring: '即将到期',
  license_expired: '已过期',
  tenant_login: '租户登录',
  system_error: '系统异常'
}
const getEventLabel = (type: string) => eventLabels[type] || type

const formatTime = (time: string) => {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 172800000) return '昨天'
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const fetchUnreadCount = async () => {
  try {
    const res = await request.get('/notifications/unread-count')
    if (res.success) unreadCount.value = res.data?.count || 0
  } catch {}
}

const onBellClick = () => {
  visible.value = !visible.value
  if (visible.value) loadNotifications()
}

const loadNotifications = async () => {
  loading.value = true
  page.value = 1
  try {
    const params: any = { page: 1, pageSize }
    if (filter.value === 'unread') params.isRead = '0'
    const res = await request.get('/notifications', { params })
    if (res.success) {
      notifications.value = res.data?.list || []
      total.value = res.data?.total || 0
      hasMore.value = notifications.value.length < total.value
    }
  } catch {} finally {
    loading.value = false
  }
}

const loadMore = async () => {
  page.value++
  try {
    const params: any = { page: page.value, pageSize }
    if (filter.value === 'unread') params.isRead = '0'
    const res = await request.get('/notifications', { params })
    if (res.success) {
      notifications.value.push(...(res.data?.list || []))
      hasMore.value = notifications.value.length < (res.data?.total || 0)
    }
  } catch {}
}

const handleItemClick = async (item: any) => {
  if (!item.is_read) {
    try {
      await request.put(`/notifications/${item.id}/read`)
      item.is_read = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {}
  }
}

const handleMarkAllRead = async () => {
  try {
    await request.put('/notifications/read-all')
    notifications.value.forEach(n => n.is_read = 1)
    unreadCount.value = 0
    ElMessage.success('已全部标记为已读')
  } catch {}
}

const handleDelete = async (id: string) => {
  try {
    await request.delete(`/notifications/${id}`)
    const idx = notifications.value.findIndex(n => n.id === id)
    if (idx !== -1) {
      if (!notifications.value[idx].is_read) unreadCount.value = Math.max(0, unreadCount.value - 1)
      notifications.value.splice(idx, 1)
    }
  } catch {}
}

const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有通知？', '提示', { type: 'warning' })
    await request.delete('/notifications')
    notifications.value = []
    unreadCount.value = 0
    total.value = 0
    ElMessage.success('已清空')
  } catch {}
}

const goToSettings = () => {
  visible.value = false
  router.push('/settings/notification-service')
}

onMounted(() => {
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 30000)
})
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.notification-bell-container {
  display: inline-flex;
  align-items: center;
  margin-right: 16px;
}
.bell-trigger {
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.bell-trigger:hover { background: rgba(64,158,255,0.1); }
.bell-icon { color: #606266; }

.pop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}
.pop-title { font-size: 15px; font-weight: 600; color: #303133; }
.pop-actions { display: flex; gap: 4px; }

.pop-filter { margin-bottom: 8px; }

.pop-list {
  max-height: 400px;
  overflow-y: auto;
  min-height: 120px;
}

.notify-item {
  display: flex;
  align-items: flex-start;
  padding: 10px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
}
.notify-item:hover { background: #f5f7fa; }
.notify-item.is-unread { background: #ecf5ff; }
.notify-item + .notify-item { border-top: 1px solid #f0f2f5; }

.notify-icon {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-right: 10px;
}
.notify-icon.level-info { background: #e6f4ff; color: #409eff; }
.notify-icon.level-success { background: #e8f5e9; color: #67c23a; }
.notify-icon.level-warning { background: #fff8e1; color: #e6a23c; }
.notify-icon.level-error { background: #fde2e2; color: #f56c6c; }

.notify-body { flex: 1; min-width: 0; }
.notify-title {
  font-size: 13px; font-weight: 500; color: #303133;
  display: flex; align-items: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.notify-content {
  font-size: 12px; color: #909399; line-height: 1.4; margin-top: 2px;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.notify-meta {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 4px; font-size: 11px; color: #c0c4cc;
}
.notify-type { background: #f0f2f5; padding: 0 6px; border-radius: 8px; }
.notify-del { opacity: 0; position: absolute; top: 8px; right: 4px; }
.notify-item:hover .notify-del { opacity: 1; }

.pop-more { text-align: center; padding: 8px 0; }

.pop-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  text-align: center;
}
</style>

<style>
/* 全局样式（不加scoped），控制popover */
.notification-popover {
  padding: 12px 16px !important;
}
</style>
