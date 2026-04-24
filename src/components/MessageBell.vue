<template>
  <div class="message-bell-container">
    <!-- 消息铃铛 -->
    <div class="message-bell" @click="showDialog = true">
      <el-badge :value="totalUnreadCount > 99 ? '99+' : totalUnreadCount" :hidden="totalUnreadCount === 0">
        <el-icon :size="20" class="bell-icon">
          <Bell />
        </el-icon>
      </el-badge>
    </div>

    <!-- 消息弹窗 -->
    <el-dialog
      v-model="showDialog"
      title="消息中心"
      width="700px"
      :before-close="handleClose"
      class="message-dialog"
    >
      <div class="message-header">
        <div class="header-stats">
          <el-tag type="info" size="small">
            共 {{ totalMessageCount }} 条
          </el-tag>
          <el-tag v-if="totalUnreadCount > 0" type="danger" size="small">
            {{ totalUnreadCount }} 条未读
          </el-tag>
        </div>
        <div class="header-actions">
          <el-button
            v-if="totalUnreadCount > 0"
            type="primary"
            size="small"
            @click="markAllAsRead"
          >
            全部已读
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="clearAllMessages"
          >
            清空消息
          </el-button>
        </div>
      </div>

      <!-- 标签页 -->
      <el-tabs v-model="activeTab" class="message-tabs">
        <!-- 系统消息标签页 -->
        <el-tab-pane label="系统消息" name="messages">
          <template #label>
            <div class="tab-label">
              <el-icon><Message /></el-icon>
              <span>系统消息</span>
              <el-badge
                v-if="unreadMessageCount > 0"
                :value="unreadMessageCount > 99 ? '99+' : unreadMessageCount"
                class="tab-badge"
              />
            </div>
          </template>

          <div class="message-list">
            <div
              v-for="message in systemMessages"
              :key="message.id"
              class="message-item"
              :class="{ 'unread': !message.read }"
              @click="handleMessageClick(message)"
            >
              <div class="message-icon">
                <el-icon :color="message.color" :size="20">
                  <component :is="getIconComponent(message.icon)" />
                </el-icon>
              </div>
              <div class="message-content">
                <div class="message-title">
                  {{ message.title }}
                  <el-tag v-if="!message.read" type="danger" size="small">未读</el-tag>
                </div>
                <div class="message-text">{{ stripHtml(message.content) }}</div>
                <div class="message-meta">
                  <span class="message-category">{{ message.category }}</span>
                  <span class="message-time">{{ message.time }}</span>
                </div>
              </div>
              <div class="message-actions">
                <el-button
                  v-if="!message.read"
                  type="primary"
                  size="small"
                  @click.stop="markMessageAsRead(message.id)"
                >
                  已读
                </el-button>
                <el-button
                  type="danger"
                  size="small"
                  @click.stop="deleteMessage(message.id)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div v-if="systemMessages.length === 0" class="empty-state">
              <el-empty description="暂无系统消息" />
            </div>
          </div>
        </el-tab-pane>

        <!-- 公告标签页 -->
        <el-tab-pane label="系统公告" name="announcements">
          <template #label>
            <div class="tab-label">
              <el-icon><ChatDotRound /></el-icon>
              <span>系统公告</span>
              <el-badge
                v-if="unreadAnnouncementCount > 0"
                :value="unreadAnnouncementCount > 99 ? '99+' : unreadAnnouncementCount"
                class="tab-badge"
              />
            </div>
          </template>

          <div class="announcement-list">
            <div
              v-for="announcement in announcements"
              :key="announcement.id"
              class="announcement-item"
              :class="{ 'unread': !announcement.read }"
              @click="handleAnnouncementClick(announcement)"
            >
              <div class="announcement-icon">
                <el-icon :color="announcement.source === 'system' ? '#f56c6c' : '#409eff'" :size="20">
                  <ChatDotRound />
                </el-icon>
              </div>
              <div class="announcement-content">
                <div class="announcement-title">
                  {{ announcement.title }}
                  <el-tag v-if="!announcement.read" type="danger" size="small">未读</el-tag>
                  <el-tag
                    :type="announcement.source === 'system' ? 'danger' : 'primary'"
                    size="small"
                  >
                    {{ announcement.source === 'system' ? '系统公告' : '公司公告' }}
                  </el-tag>
                </div>
                <div class="announcement-text">{{ stripHtml(announcement.content) }}</div>
                <div class="announcement-meta">
                  <span class="announcement-time">{{ formatTime(announcement.publishedAt) }}</span>
                  <span class="announcement-author">{{ announcement.createdByName || announcement.createdBy }}</span>
                </div>
              </div>
              <div class="announcement-actions">
                <el-button
                  v-if="!announcement.read"
                  type="primary"
                  size="small"
                  @click.stop="markAnnouncementAsRead(announcement.id)"
                >
                  已读
                </el-button>
                <el-button
                  type="info"
                  size="small"
                  @click.stop="hideAnnouncement(announcement.id)"
                >
                  不再显示
                </el-button>
              </div>
            </div>

            <div v-if="announcements.length === 0" class="empty-state">
              <el-empty description="暂无系统公告" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <!-- 公告详情弹窗 -->
    <el-dialog
      v-model="showAnnouncementDetail"
      :title="selectedAnnouncement?.title || '公告详情'"
      width="600px"
      append-to-body
      class="announcement-detail-dialog"
    >
      <div v-if="selectedAnnouncement" class="announcement-detail">
        <div class="detail-meta">
          <el-tag
            :type="selectedAnnouncement.source === 'system' ? 'danger' : 'primary'"
            size="small"
          >
            {{ selectedAnnouncement.source === 'system' ? '系统公告' : '公司公告' }}
          </el-tag>
          <span class="detail-time">{{ formatTime(selectedAnnouncement.publishedAt) }}</span>
        </div>
        <div class="detail-content" v-html="sanitizeHtml(selectedAnnouncement.content)"></div>
      </div>
      <template #footer>
        <el-button @click="showAnnouncementDetail = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { sanitizeHtml } from '@/utils/sanitize'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell,
  Message,
  ChatDotRound,
  // 订单相关图标
  Plus,
  Money,
  Box,
  Van,
  Check,
  CircleCheck,
  Close,
  CircleClose,
  Document,
  RefreshLeft,
  Clock,
  Warning,
  // 售后相关图标
  Service,
  User,
  Loading,
  Delete,
  // 客户相关图标
  Edit,
  Phone,
  Share,
  // 商品相关图标
  Goods,
  // 系统相关图标
  Tools,
  Refresh,
  UserFilled,
  Key,
  Download,
  Upload
} from '@element-plus/icons-vue'

// 图标映射表 - 用于动态组件
const iconComponents: Record<string, any> = {
  Bell,
  Message,
  ChatDotRound,
  Plus,
  Money,
  Box,
  Van,
  Check,
  CircleCheck,
  Close,
  CircleClose,
  Document,
  RefreshLeft,
  Clock,
  Warning,
  Service,
  User,
  Loading,
  Delete,
  Edit,
  Phone,
  Share,
  Goods,
  Tools,
  Refresh,
  UserFilled,
  Key,
  Download,
  Upload
}

// 获取图标组件
const getIconComponent = (iconName: string) => {
  return iconComponents[iconName] || Bell
}

// 使用Store
const notificationStore = useNotificationStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

// 状态
const showDialog = ref(false)
const activeTab = ref('messages')
const showAnnouncementDetail = ref(false)
const selectedAnnouncement = ref<any>(null)

// 计算属性 - 过滤出当前用户可见的消息
const systemMessages = computed(() => {
  const currentUserId = userStore.currentUser?.id
  if (!currentUserId) {
    // 🔥 修复：排除announcement类型的消息，避免与"系统公告"标签页重复
    return notificationStore.messages.filter(msg => msg.type !== 'announcement')
  }

  // 过滤消息：显示发给当前用户的消息或没有指定目标用户的全局消息
  // 🔥 修复：排除announcement类型，公告已在"系统公告"标签页展示
  return notificationStore.messages.filter(msg => {
    // 排除公告类型的系统消息（避免与系统公告标签页重复）
    if (msg.type === 'announcement') return false
    // 没有指定目标用户的消息（全局消息）
    if (!msg.targetUserId) return true
    // 发给当前用户的消息
    return String(msg.targetUserId) === String(currentUserId)
  })
})
// 隐藏的公告ID列表（存储在localStorage）
const hiddenAnnouncementIds = ref<string[]>([])

/**
 * 🔥 获取当前用户的隐藏公告 localStorage Key（按用户+租户隔离）
 * 格式: hidden-announcements-{userId}-{tenantId}
 */
const getHiddenAnnouncementsKey = (): string => {
  const currentUser = userStore.currentUser
  if (currentUser?.id) {
    const tenantId = (currentUser as any).tenantId || ''
    return `hidden-announcements-${currentUser.id}-${tenantId}`
  }
  return 'hidden-announcements'
}

// 加载隐藏的公告ID
const loadHiddenAnnouncements = () => {
  try {
    const key = getHiddenAnnouncementsKey()
    const stored = localStorage.getItem(key)
    if (stored) {
      hiddenAnnouncementIds.value = JSON.parse(stored)
    } else {
      hiddenAnnouncementIds.value = []
    }
  } catch (_e) {
    hiddenAnnouncementIds.value = []
  }
}

// 保存隐藏的公告ID
const saveHiddenAnnouncements = () => {
  const key = getHiddenAnnouncementsKey()
  localStorage.setItem(key, JSON.stringify(hiddenAnnouncementIds.value))
}

const announcements = computed(() => {
  if (!messageStore.announcements || !Array.isArray(messageStore.announcements)) {
    return []
  }
  // 过滤掉已隐藏的公告
  return messageStore.announcements.filter(a =>
    a.status === 'published' && !hiddenAnnouncementIds.value.includes(a.id)
  )
})

// 🔥 修复：未读数基于过滤后的 systemMessages（已排除 announcement 类型），避免虚假计数
const unreadMessageCount = computed(() =>
  systemMessages.value.filter(msg => !msg.read).length
)
const unreadAnnouncementCount = computed(() =>
  announcements.value.filter((a: any) => !a.read && !a.silent).length
)

const totalUnreadCount = computed(() =>
  unreadMessageCount.value + unreadAnnouncementCount.value
)

const totalMessageCount = computed(() =>
  systemMessages.value.length + announcements.value.length
)

// 方法
const handleClose = () => {
  showDialog.value = false
}

const markAllAsRead = async () => {
  try {
    // 🔥 标记所有系统消息为已读（调用API同步到数据库）
    await notificationStore.markAllAsReadWithAPI()

    // 🔥 标记所有公告为已读（使用批量方法）
    await messageStore.markAllAnnouncementsAsRead()

    ElMessage.success('所有消息已标记为已读')
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('操作失败')
  }
}

const clearAllMessages = async () => {
  try {
    await ElMessageBox.confirm('确认清空所有消息吗？\n系统消息将被删除，系统公告将被隐藏。', '确认清空', {
      type: 'warning'
    })

    // 🔥 清空系统消息（调用API同步到数据库）
    await notificationStore.clearAllMessagesWithAPI()

    // 🔥 隐藏所有公告（不删除，只是本地隐藏）
    const allAnnouncementIds = announcements.value.map(a => a.id)
    hiddenAnnouncementIds.value = [...new Set([...hiddenAnnouncementIds.value, ...allAnnouncementIds])]
    saveHiddenAnnouncements()

    ElMessage.success('消息已清空')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空消息失败:', error)
    }
  }
}

const markMessageAsRead = async (messageId: string) => {
  // 🔥 调用API同步到数据库
  await notificationStore.markAsReadWithAPI(messageId)
}

const deleteMessage = async (messageId: string) => {
  try {
    await ElMessageBox.confirm('确认删除此消息吗？', '确认删除', {
      type: 'warning'
    })

    // 🔥 调用API同步到数据库
    await notificationStore.deleteMessageWithAPI(messageId)
    ElMessage.success('消息已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除消息失败:', error)
    }
  }
}

const markAnnouncementAsRead = async (announcementId: string) => {
  try {
    console.log('[MessageBell] 标记公告已读:', announcementId)
    // 调用store方法标记公告为已读
    await messageStore.markAnnouncementAsRead(announcementId)
    console.log('[MessageBell] 公告已标记为已读')
  } catch (error) {
    console.error('[MessageBell] 标记公告已读失败:', error)
    // 即使失败也不显示错误，因为本地状态已更新
  }
}

// 隐藏公告（不再显示）
const hideAnnouncement = (announcementId: string) => {
  if (!hiddenAnnouncementIds.value.includes(announcementId)) {
    hiddenAnnouncementIds.value.push(announcementId)
    saveHiddenAnnouncements()
    ElMessage.success('公告已隐藏')
  }
}

const handleMessageClick = (message: any) => {
  // 标记为已读
  if (!message.read) {
    markMessageAsRead(message.id)
  }

  // 如果有关联URL，跳转到相关页面
  if (message.actionUrl) {
    // 这里可以实现页面跳转逻辑
    console.log('跳转到:', message.actionUrl)
  }
}

const handleAnnouncementClick = (announcement: any) => {
  // 标记为已读
  if (!announcement.read) {
    markAnnouncementAsRead(announcement.id)
  }

  // 🔥 使用弹窗对话框显示公告详情（支持富文本HTML渲染）
  selectedAnnouncement.value = announcement
  showAnnouncementDetail.value = true
}

// 去除HTML标签
const stripHtml = (html: string) => {
  if (!html) return ''
  return html.replace(/<[^>]+>/g, '').substring(0, 100)
}

// 时间格式化（北京时间）
const formatTime = (time: string | Date) => {
  if (!time) return ''
  const date = new Date(time)
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 页面初始化
onMounted(() => {
  // 加载隐藏的公告列表
  loadHiddenAnnouncements()

  // 只在用户已登录时才加载公告数据
  if (userStore.isLoggedIn) {
    messageStore.loadUserAnnouncements()
  }
})
</script>

<style scoped>
.message-bell-container {
  position: relative;
}

.message-bell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.message-bell:hover {
  background-color: #f0f2f5;
  transform: scale(1.1);
}

.message-bell:active {
  transform: scale(0.95);
}

.bell-icon {
  transition: all 0.3s ease;
}

.message-bell:hover .bell-icon {
  color: #409eff;
  animation: bellShake 0.5s ease-in-out;
}

@keyframes bellShake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

:deep(.message-dialog) {
  .el-dialog__body {
    padding: 0;
  }
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background-color: #fafafa;
}

.header-stats {
  display: flex;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.message-tabs {
  padding: 0;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.tab-badge {
  position: absolute;
  top: -8px;
  right: -16px;
}

.message-list,
.announcement-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.message-item,
.announcement-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  margin-bottom: 8px;
}

.message-item:hover,
.announcement-item:hover {
  background-color: #f5f7fa;
  border-color: #e4e7ed;
}

.message-item.unread,
.announcement-item.unread {
  background-color: #f0f9ff;
  border-color: #409eff;
}

.message-icon,
.announcement-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.message-content,
.announcement-content {
  flex: 1;
  min-width: 0;
}

.message-title,
.announcement-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.message-text,
.announcement-text {
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-meta,
.announcement-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.message-category {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.message-actions,
.announcement-actions {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.message-item:hover .message-actions,
.announcement-item:hover .announcement-actions {
  opacity: 1;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

:deep(.el-tabs__header) {
  margin: 0;
  background-color: #fafafa;
  padding: 0 20px;
}

:deep(.el-tabs__content) {
  padding: 0;
}

:deep(.el-tabs__item) {
  padding: 0 16px;
  height: 50px;
  line-height: 50px;
}

:deep(.el-badge__content) {
  font-size: 10px;
  padding: 0 4px;
  height: 16px;
  line-height: 16px;
  min-width: 16px;
}

/* 公告详情弹窗样式 */
:deep(.announcement-detail-dialog) {
  .el-dialog__body {
    padding: 16px 24px;
  }
}

.announcement-detail {
  .detail-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .detail-time {
    font-size: 13px;
    color: #909399;
  }

  .detail-content {
    font-size: 14px;
    line-height: 1.8;
    color: #303133;
    word-break: break-word;

    :deep(p) {
      margin: 0 0 8px 0;
    }
    :deep(img) {
      max-width: 100%;
      height: auto;
    }
    :deep(a) {
      color: #409eff;
      text-decoration: none;
      &:hover {
        text-decoration: underline;
      }
    }
    :deep(ul), :deep(ol) {
      padding-left: 20px;
    }
    :deep(blockquote) {
      margin: 8px 0;
      padding: 8px 16px;
      border-left: 4px solid #dcdfe6;
      color: #606266;
      background: #f9f9f9;
    }
  }
}
</style>
