<template>
  <el-dialog
    v-model="visible"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    width="560px"
    class="announcement-popup-dialog"
    center
  >
    <template #header>
      <div class="popup-header">
        <div class="header-icon">
          <el-icon :size="32" color="#fff"><Bell /></el-icon>
        </div>
        <div class="header-title">系统公告</div>
      </div>
    </template>

    <div class="popup-content" v-if="currentAnnouncement">
      <div class="announcement-title">{{ currentAnnouncement.title }}</div>
      <div class="announcement-meta">
        <el-tag :type="currentAnnouncement.type === 'company' ? 'primary' : 'success'" size="small">
          {{ currentAnnouncement.type === 'company' ? '全公司' : '部门公告' }}
        </el-tag>
        <span class="publish-time">{{ formatTime(currentAnnouncement.publishedAt) }}</span>
      </div>
      <div class="announcement-body" v-html="currentAnnouncement.content"></div>
    </div>

    <template #footer>
      <div class="popup-footer">
        <div class="footer-info" v-if="pendingAnnouncements.length > 1">
          <span>{{ currentIndex + 1 }} / {{ pendingAnnouncements.length }}</span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleReadLater" v-if="pendingAnnouncements.length > 1">
            稍后查看
          </el-button>
          <el-button type="primary" @click="handleConfirm">
            {{ pendingAnnouncements.length > 1 && currentIndex < pendingAnnouncements.length - 1 ? '下一条' : '我知道了' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useMessageStore } from '@/stores/message'
import { Bell } from '@element-plus/icons-vue'
import dayjs from 'dayjs'

const messageStore = useMessageStore()

const visible = ref(false)
const currentIndex = ref(0)
const pendingAnnouncements = ref<any[]>([])

const currentAnnouncement = computed(() => {
  return pendingAnnouncements.value[currentIndex.value] || null
})

const formatTime = (time: string) => {
  return time ? dayjs(time).format('YYYY-MM-DD HH:mm') : ''
}

const handleConfirm = async () => {
  if (currentAnnouncement.value) {
    // 标记为已读
    await messageStore.markAnnouncementAsRead(currentAnnouncement.value.id)
  }

  if (currentIndex.value < pendingAnnouncements.value.length - 1) {
    currentIndex.value++
  } else {
    visible.value = false
    currentIndex.value = 0
  }
}

const handleReadLater = () => {
  visible.value = false
  currentIndex.value = 0
}

// 检查是否有需要弹窗显示的公告
const checkPopupAnnouncements = () => {
  const announcements = messageStore.announcements || []
  const popupAnnouncements = announcements.filter(
    (a: any) => a.status === 'published' && a.isPopup && !a.read
  )

  if (popupAnnouncements.length > 0) {
    pendingAnnouncements.value = popupAnnouncements
    currentIndex.value = 0
    visible.value = true
  }
}

// 监听公告变化
watch(() => messageStore.announcements, () => {
  checkPopupAnnouncements()
}, { deep: true })

onMounted(() => {
  // 延迟检查，等待数据加载
  setTimeout(checkPopupAnnouncements, 1000)
})
</script>


<style scoped>
.announcement-popup-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.announcement-popup-dialog :deep(.el-dialog__header) {
  padding: 0;
  margin: 0;
}

.announcement-popup-dialog :deep(.el-dialog__body) {
  padding: 0;
}

.announcement-popup-dialog :deep(.el-dialog__footer) {
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
}

.popup-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 24px;
  text-align: center;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.header-title {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
}

.popup-content {
  padding: 24px;
}

.announcement-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  line-height: 1.4;
}

.announcement-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.publish-time {
  font-size: 13px;
  color: #909399;
}

.announcement-body {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  max-height: 300px;
  overflow-y: auto;
}

.announcement-body :deep(p) {
  margin: 0 0 12px 0;
}

.announcement-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

.popup-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  font-size: 13px;
  color: #909399;
}

.footer-actions {
  display: flex;
  gap: 12px;
}
</style>
