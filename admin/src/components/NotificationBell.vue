<template>
  <div class="notification-bell-container">
    <el-popover
      :visible="popVisible"
      placement="bottom-end"
      :width="400"
      popper-class="notification-popover"
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
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="unread">未读</el-radio-button>
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

    <!-- 消息详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="消息详情"
      width="520px"
      :close-on-click-modal="true"
      destroy-on-close
      @closed="onDetailClosed"
    >
      <div v-if="detailItem" class="detail-content">
        <div class="detail-header-row">
          <div class="detail-level-icon" :class="`level-${detailItem.level}`">
            <el-icon v-if="detailItem.level === 'success'" :size="20"><CircleCheck /></el-icon>
            <el-icon v-else-if="detailItem.level === 'warning'" :size="20"><Warning /></el-icon>
            <el-icon v-else-if="detailItem.level === 'error'" :size="20"><CircleClose /></el-icon>
            <el-icon v-else :size="20"><InfoFilled /></el-icon>
          </div>
          <div class="detail-title-area">
            <h3 class="detail-title">{{ detailItem.title }}</h3>
            <div class="detail-tags">
              <el-tag :type="getLevelTagType(detailItem.level)" size="small" effect="plain">{{ getLevelText(detailItem.level) }}</el-tag>
              <el-tag size="small">{{ getEventLabel(detailItem.event_type) }}</el-tag>
              <el-tag v-if="!detailItem.is_read" type="danger" size="small" effect="dark">未读</el-tag>
              <el-tag v-else type="info" size="small">已读</el-tag>
            </div>
          </div>
        </div>
        <el-divider style="margin: 12px 0;" />
        <div class="detail-body">
          <p class="detail-text">{{ detailItem.content }}</p>
        </div>
        <div class="detail-footer-info">
          <span class="detail-time">
            <el-icon :size="14"><Clock /></el-icon>
            {{ formatFullTime(detailItem.created_at) }}
          </span>
        </div>
      </div>
      <template #footer>
        <div class="detail-dialog-footer">
          <el-button v-if="detailItem && !detailItem.is_read" type="primary" @click="markDetailRead">
            标为已读
          </el-button>
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell, CircleCheck, Warning, CircleClose, InfoFilled, Delete, Setting, Clock } from '@element-plus/icons-vue'
import request from '@/api/request'

const router = useRouter()
const popVisible = ref(false)
const loading = ref(false)
const unreadCount = ref(0)
const notifications = ref<any[]>([])
const filter = ref('all')
const page = ref(1)
const pageSize = 15
const total = ref(0)
const hasMore = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

// 用于追踪弹窗打开前 popover 是否可见，以便弹窗关闭后恢复
let popWasVisible = false

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
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 172800000) return '昨天'
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchUnreadCount = async () => {
  try {
    const res = await request.get('/notifications/unread-count')
    if (res.success) unreadCount.value = res.data?.count || 0
  } catch {}
}

// ===== Popover 手动控制（解决点击通知项弹窗打开后 popover 消失的问题）=====
let clickOutsideHandler: ((e: MouseEvent) => void) | null = null

const onBellClick = () => {
  popVisible.value = !popVisible.value
  if (popVisible.value) {
    loadNotifications()
    // 延迟注册外部点击监听，避免当前点击事件触发关闭
    setTimeout(() => {
      clickOutsideHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        // 如果详情弹窗正在打开，不关闭 popover
        if (detailVisible.value) return
        // 如果点击在 popover 内部或铃铛按钮上，不关闭
        const popoverEl = document.querySelector('.notification-popover')
        const bellEl = document.querySelector('.bell-trigger')
        if (popoverEl?.contains(target) || bellEl?.contains(target)) return
        closePopover()
      }
      document.addEventListener('click', clickOutsideHandler, true)
    }, 0)
  } else {
    closePopover()
  }
}

const closePopover = () => {
  popVisible.value = false
  if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler, true)
    clickOutsideHandler = null
  }
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

// ===== 消息详情弹窗 =====
const detailVisible = ref(false)
const detailItem = ref<any>(null)

const getLevelTagType = (level: string) => {
  const map: Record<string, string> = { info: 'primary', success: 'success', warning: 'warning', error: 'danger' }
  return map[level] || 'info'
}

const getLevelText = (level: string) => {
  const map: Record<string, string> = { info: '信息', success: '成功', warning: '警告', error: '错误' }
  return map[level] || '信息'
}

const formatFullTime = (time: string) => {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const handleItemClick = async (item: any) => {
  // 标记已读
  if (!item.is_read) {
    try {
      await request.put(`/notifications/${item.id}/read`)
      item.is_read = 1
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    } catch {}
  }
  // 记住 popover 状态，打开详情弹窗
  popWasVisible = popVisible.value
  detailItem.value = item
  detailVisible.value = true
}

const onDetailClosed = () => {
  // 详情弹窗关闭后恢复 popover 显示状态
  if (popWasVisible) {
    popVisible.value = true
  }
}

const markDetailRead = async () => {
  if (!detailItem.value || detailItem.value.is_read) return
  try {
    await request.put(`/notifications/${detailItem.value.id}/read`)
    detailItem.value.is_read = 1
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    ElMessage.success('已标记为已读')
  } catch {}
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
  closePopover()
  router.push('/settings/notification-service')
}

onMounted(() => {
  fetchUnreadCount()
  pollTimer = setInterval(fetchUnreadCount, 30000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (clickOutsideHandler) {
    document.removeEventListener('click', clickOutsideHandler, true)
  }
})
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

/* 消息详情弹窗 */
.detail-content { padding: 0 4px; }
.detail-header-row { display: flex; align-items: flex-start; gap: 12px; }
.detail-level-icon {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-level-icon.level-info { background: #e6f4ff; color: #409eff; }
.detail-level-icon.level-success { background: #e8f5e9; color: #67c23a; }
.detail-level-icon.level-warning { background: #fff8e1; color: #e6a23c; }
.detail-level-icon.level-error { background: #fde2e2; color: #f56c6c; }
.detail-title-area { flex: 1; min-width: 0; }
.detail-title { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #303133; word-break: break-word; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.detail-body { padding: 8px 0; }
.detail-text { font-size: 14px; line-height: 1.8; color: #606266; white-space: pre-wrap; word-break: break-word; margin: 0; }
.detail-footer-info {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 10px; border-top: 1px solid #f0f2f5;
  font-size: 12px; color: #909399;
}
.detail-time { display: flex; align-items: center; gap: 4px; }
.detail-dialog-footer { text-align: right; }
</style>

<style>
/* 全局样式（不加scoped），控制popover */
.notification-popover {
  padding: 12px 16px !important;
}
</style>
