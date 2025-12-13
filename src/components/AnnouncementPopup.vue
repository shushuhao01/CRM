<template>
  <!-- 右下角上滑弹窗 -->
  <transition name="slide-up">
    <div v-if="visible && currentAnnouncement" class="announcement-popup">
      <div class="popup-header">
        <div class="header-left">
          <el-icon :size="18" color="#409eff"><Bell /></el-icon>
          <span class="header-title">系统公告</span>
        </div>
        <el-icon class="close-btn" @click="handleClose"><Close /></el-icon>
      </div>
      <div class="popup-body">
        <div class="announcement-title">{{ currentAnnouncement.title }}</div>
        <div class="announcement-content" v-html="truncateContent(currentAnnouncement.content)"></div>
        <div class="announcement-meta">
          <el-tag :type="currentAnnouncement.type === 'notice' ? 'primary' : 'success'" size="small">
            {{ currentAnnouncement.type === 'notice' ? '全公司' : '部门公告' }}
          </el-tag>
          <span class="publish-time">{{ formatTime(currentAnnouncement.publishedAt) }}</span>
        </div>
      </div>
      <div class="popup-footer">
        <span v-if="pendingAnnouncements.length > 1" class="count-info">
          {{ currentIndex + 1 }} / {{ pendingAnnouncements.length }}
        </span>
        <div class="footer-actions">
          <el-button size="small" @click="handleReadLater">稍后查看</el-button>
          <el-button size="small" type="primary" @click="handleConfirm">
            {{ pendingAnnouncements.length > 1 && currentIndex < pendingAnnouncements.length - 1 ? '下一条' : '知道了' }}
          </el-button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMessageStore } from '@/stores/message'
import { Bell, Close } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const messageStore = useMessageStore()

const visible = ref(false)
const currentIndex = ref(0)
const pendingAnnouncements = ref<any[]>([])
const dismissedIds = ref<Set<string>>(new Set())

// 从localStorage读取已关闭的公告ID
const loadDismissedIds = () => {
  try {
    const stored = localStorage.getItem('dismissed_announcements')
    if (stored) {
      const data = JSON.parse(stored)
      // 只保留24小时内关闭的记录
      const now = Date.now()
      const validIds = Object.entries(data)
        .filter(([_, timestamp]) => now - (timestamp as number) < 24 * 60 * 60 * 1000)
        .map(([id]) => id)
      dismissedIds.value = new Set(validIds)
    }
  } catch (e) {
    console.error('读取已关闭公告失败:', e)
  }
}

// 保存已关闭的公告ID
const saveDismissedId = (id: string) => {
  dismissedIds.value.add(id)
  try {
    const stored = localStorage.getItem('dismissed_announcements')
    const data = stored ? JSON.parse(stored) : {}
    data[id] = Date.now()
    localStorage.setItem('dismissed_announcements', JSON.stringify(data))
  } catch (e) {
    console.error('保存已关闭公告失败:', e)
  }
}

const currentAnnouncement = computed(() => {
  return pendingAnnouncements.value[currentIndex.value] || null
})

const formatTime = (time: string) => {
  return time ? dayjs(time).format('MM-DD HH:mm') : ''
}

const truncateContent = (content: string) => {
  // 移除HTML标签后截取
  const text = content.replace(/<[^>]+>/g, '')
  return text.length > 100 ? text.substring(0, 100) + '...' : text
}

const handleClose = async () => {
  if (currentAnnouncement.value) {
    // 关闭也标记为已读
    await messageStore.markAnnouncementAsRead(currentAnnouncement.value.id)
    saveDismissedId(currentAnnouncement.value.id)
  }
  visible.value = false
  currentIndex.value = 0
}

const handleConfirm = async () => {
  if (currentAnnouncement.value) {
    await messageStore.markAnnouncementAsRead(currentAnnouncement.value.id)
    saveDismissedId(currentAnnouncement.value.id)
  }

  if (currentIndex.value < pendingAnnouncements.value.length - 1) {
    currentIndex.value++
  } else {
    visible.value = false
    currentIndex.value = 0
  }
}

const handleReadLater = async () => {
  if (currentAnnouncement.value) {
    // 稍后查看也标记为已读
    await messageStore.markAnnouncementAsRead(currentAnnouncement.value.id)
    saveDismissedId(currentAnnouncement.value.id)
  }
  visible.value = false
  currentIndex.value = 0
}

// 检查是否有需要弹窗显示的公告
const checkPopupAnnouncements = () => {
  const announcements = messageStore.announcements || []
  console.log('🔔 [公告弹窗] 检查公告列表:', announcements.length, '条')
  console.log('🔔 [公告弹窗] 公告详情:', announcements.map((a: any) => ({
    id: a.id,
    title: a.title,
    status: a.status,
    isPopup: a.isPopup,
    read: a.read
  })))

  const popupAnnouncements = announcements.filter((a: any) => {
    // 必须是已发布、开启弹窗、未读、且未被用户关闭的公告
    const shouldShow = a.status === 'published' &&
           a.isPopup === true &&
           !a.read &&
           !dismissedIds.value.has(a.id)
    console.log(`🔔 [公告弹窗] 公告 "${a.title}" 是否显示:`, shouldShow, {
      status: a.status,
      isPopup: a.isPopup,
      read: a.read,
      dismissed: dismissedIds.value.has(a.id)
    })
    return shouldShow
  })

  console.log('🔔 [公告弹窗] 需要弹窗的公告:', popupAnnouncements.length, '条')

  if (popupAnnouncements.length > 0) {
    pendingAnnouncements.value = popupAnnouncements
    currentIndex.value = 0
    visible.value = true
    console.log('🔔 [公告弹窗] 显示弹窗')
  }
}

// 监听公告变化
watch(() => messageStore.announcements, () => {
  checkPopupAnnouncements()
}, { deep: true })

onMounted(() => {
  loadDismissedIds()
  // 延迟检查，等待数据加载
  setTimeout(checkPopupAnnouncements, 1500)
})
</script>

<style scoped>
.announcement-popup {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 360px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left .el-icon {
  color: #fff;
}

.header-title {
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  transition: color 0.2s;
}

.close-btn:hover {
  color: #fff;
}

.popup-body {
  padding: 16px;
}

.announcement-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  line-height: 1.4;
}

.announcement-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  margin-bottom: 12px;
}

.announcement-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.publish-time {
  font-size: 12px;
  color: #909399;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.count-info {
  font-size: 12px;
  color: #909399;
}

.footer-actions {
  display: flex;
  gap: 8px;
}

/* 上滑动画 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
