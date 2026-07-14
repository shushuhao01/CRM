<template>
  <div>
    <!-- 消息中心弹窗（消息铃铛与数据看板"查看全部"共用） -->
    <el-dialog
      :model-value="modelValue"
      title="消息中心"
      width="700px"
      class="message-dialog"
      @update:model-value="(val: boolean) => emit('update:modelValue', val)"
    >
      <div class="message-header">
        <div class="header-stats">
          <el-tag type="info" size="small">
            共 {{ totalMessageCount }} 条
          </el-tag>
          <el-tag v-if="totalUnreadCount > 0" type="danger" size="small">
            {{ totalUnreadCount > 99 ? '99+' : totalUnreadCount }} 条未读
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

          <div class="message-list" v-loading="loadingPage">
            <div
              v-for="message in displayMessages"
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

            <div v-if="displayMessages.length === 0 && !loadingPage" class="empty-state">
              <el-empty description="暂无系统消息" />
            </div>
          </div>

          <!-- 🔥 分页控件：每页50条，超出部分翻页加载 -->
          <div v-if="messagesTotal > pageSize" class="message-pagination">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="messagesTotal"
              layout="total, prev, pager, next, jumper"
              small
              background
              @current-change="loadMessagePage"
            />
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
                  @click.stop="handleHideAnnouncement(announcement.id)"
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
import { ref, computed, watch, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useAnnouncementVisibility } from '@/composables/useAnnouncementVisibility'
import { sanitizeHtml } from '@/utils/sanitize'
import { maskPhonesInText } from '@/utils/sensitiveInfo'
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

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

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

const getIconComponent = (iconName: string) => {
  return iconComponents[iconName] || Bell
}

// 使用Store
const notificationStore = useNotificationStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

// 公告可见性（与消息铃铛共享的"不再显示"状态）
const {
  loadHiddenAnnouncements,
  hideAnnouncement,
  hideAnnouncements,
  visibleAnnouncements,
  unreadAnnouncementCount
} = useAnnouncementVisibility()

// 状态
const activeTab = ref('messages')
const showAnnouncementDetail = ref(false)
const selectedAnnouncement = ref<any>(null)

// 🔥 消息中心分页状态（每页50条）
const pageSize = 50
const currentPage = ref(1)
const pagedMessages = ref<any[]>([])
const loadingPage = ref(false)

// 计算属性 - 过滤出当前用户可见的消息
const systemMessages = computed(() => {
  const currentUserId = userStore.currentUser?.id
  if (!currentUserId) {
    // 🔥 排除announcement类型的消息，避免与"系统公告"标签页重复
    return notificationStore.messages.filter(msg => msg.type !== 'announcement')
  }

  return notificationStore.messages.filter(msg => {
    if (msg.type === 'announcement') return false
    if (!msg.targetUserId) return true
    return String(msg.targetUserId) === String(currentUserId)
  })
})

const announcements = visibleAnnouncements

// 🔥 未读数使用服务端真实未读数（不受本地只加载50条的限制）
const unreadMessageCount = computed(() => notificationStore.unreadCount)

const totalUnreadCount = computed(() =>
  unreadMessageCount.value + unreadAnnouncementCount.value
)

// 🔥 系统消息总数：优先使用服务端总数（分页总数），本地列表长度兜底
const messagesTotal = computed(() => {
  const serverTotal = notificationStore.serverTotal
  if (typeof serverTotal === 'number') {
    return Math.max(serverTotal, systemMessages.value.length)
  }
  return systemMessages.value.length
})

const totalMessageCount = computed(() =>
  messagesTotal.value + announcements.value.length
)

// 🔥 当前页显示的消息：第1页用本地实时数据（含WebSocket推送），翻页后用服务端分页数据
const displayMessages = computed(() => {
  if (currentPage.value === 1) {
    return systemMessages.value.slice(0, pageSize)
  }
  return pagedMessages.value.filter((msg: any) => msg.type !== 'announcement')
})

// 🔥 加载指定页的消息
const loadMessagePage = async (page: number) => {
  loadingPage.value = true
  try {
    if (page === 1) {
      pagedMessages.value = []
      await notificationStore.loadMessagesFromAPI({ limit: pageSize })
    } else {
      const result = await notificationStore.fetchMessagesPage(page, pageSize)
      pagedMessages.value = result.messages
    }
  } catch (error) {
    console.error('[MessageCenter] 加载消息分页失败:', error)
  } finally {
    loadingPage.value = false
  }
}

// 🔥 打开消息中心时刷新第一页与总数
watch(() => props.modelValue, (visible) => {
  if (visible) {
    currentPage.value = 1
    loadMessagePage(1)
    // 公告数据也刷新一次
    if (userStore.isLoggedIn) {
      messageStore.loadUserAnnouncements()
    }
  }
})

const markAllAsRead = async () => {
  try {
    // 🔥 标记所有系统消息为已读（调用API同步到数据库，后端处理全部消息而非当前页）
    await notificationStore.markAllAsReadWithAPI()

    // 🔥 标记所有公告为已读（使用批量方法）
    await messageStore.markAllAnnouncementsAsRead()

    // 🔥 同步翻页视图的已读状态
    pagedMessages.value = pagedMessages.value.map((msg: any) => ({ ...msg, read: true }))

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

    // 🔥 清空系统消息（调用API同步到数据库，后端删除该用户全部消息而非当前页）
    await notificationStore.clearAllMessagesWithAPI()

    // 🔥 重置分页状态
    currentPage.value = 1
    pagedMessages.value = []

    // 🔥 隐藏所有公告（不删除，只是本地隐藏）
    hideAnnouncements(announcements.value.map((a: any) => a.id))

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
  // 🔥 同步翻页视图中的已读状态
  const paged = pagedMessages.value.find((msg: any) => msg.id === messageId)
  if (paged) paged.read = true
}

const deleteMessage = async (messageId: string) => {
  try {
    await ElMessageBox.confirm('确认删除此消息吗？', '确认删除', {
      type: 'warning'
    })

    // 🔥 调用API同步到数据库
    await notificationStore.deleteMessageWithAPI(messageId)
    ElMessage.success('消息已删除')

    // 🔥 刷新当前页，保持分页数据与总数准确
    await loadMessagePage(currentPage.value)
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除消息失败:', error)
    }
  }
}

const markAnnouncementAsRead = async (announcementId: string) => {
  try {
    await messageStore.markAnnouncementAsRead(announcementId)
  } catch (error) {
    console.error('[MessageCenter] 标记公告已读失败:', error)
  }
}

// 隐藏公告（不再显示）
const handleHideAnnouncement = (announcementId: string) => {
  hideAnnouncement(announcementId)
  ElMessage.success('公告已隐藏')
}

const handleMessageClick = (message: any) => {
  if (!message.read) {
    markMessageAsRead(message.id)
  }

  if (message.actionUrl) {
    console.log('跳转到:', message.actionUrl)
  }
}

const handleAnnouncementClick = (announcement: any) => {
  if (!announcement.read) {
    markAnnouncementAsRead(announcement.id)
  }

  // 🔥 使用弹窗对话框显示公告详情（支持富文本HTML渲染）
  selectedAnnouncement.value = announcement
  showAnnouncementDetail.value = true
}

// 去除HTML标签 + 电话号码权限脱敏（消息内容可能嵌了来电号码原文）
const stripHtml = (html: string) => {
  if (!html) return ''
  return maskPhonesInText(html.replace(/<[^>]+>/g, '').substring(0, 100))
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

onMounted(() => {
  loadHiddenAnnouncements()
})
</script>

<style scoped>
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

.message-pagination {
  display: flex;
  justify-content: center;
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
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
