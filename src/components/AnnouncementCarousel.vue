<template>
  <div v-if="visibleAnnouncements.length > 0" class="announcement-marquee">
    <div class="marquee-icon">
      <el-icon :size="14" color="#f56c6c"><Bell /></el-icon>
    </div>
    <div class="marquee-content" @click="handleClick">
      <div class="marquee-text" :style="{ animationDuration: animationDuration }">
        <span v-for="(ann, index) in visibleAnnouncements" :key="ann.id" class="marquee-item">
          <span :class="['source-dot', ann.source === 'system' ? 'system-dot' : 'company-dot']"></span>
          <span :class="ann.source === 'system' ? 'system-text' : ''">{{ ann.title }}</span>
          <span v-if="index < visibleAnnouncements.length - 1" class="separator">|</span>
        </span>
      </div>
    </div>
    <el-button class="marquee-close" type="text" size="small" @click.stop="closeMarquee">
      <el-icon :size="12"><Close /></el-icon>
    </el-button>

    <!-- 公告详情弹窗 -->
    <el-dialog v-model="showDetail" title="公告通知" width="500px" append-to-body>
      <div v-if="selectedAnnouncement" class="announcement-detail">
        <div class="detail-header-info">
          <span class="unread-count" v-if="visibleAnnouncements.length > 0">{{ visibleAnnouncements.length }} 条未读公告</span>
        </div>
        <div class="detail-meta">
          <el-tag
            :type="selectedAnnouncement.source === 'system' ? 'danger' : 'primary'"
            size="small"
          >
            {{ selectedAnnouncement.source === 'system' ? '🔧 系统公告' : '🏢 公司公告' }}
          </el-tag>
          <span class="detail-title-text">{{ selectedAnnouncement.title }}</span>
          <span class="time">{{ formatTime(selectedAnnouncement.publishedAt) }}</span>
        </div>
        <div class="detail-content" v-html="sanitizeHtml(selectedAnnouncement.content)"></div>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button v-if="selectedAnnouncement && !selectedAnnouncement.read" type="primary" @click="markAsRead">
          标记已读
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMessageStore } from '@/stores/message'
import { Bell, Close } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { sanitizeHtml } from '@/utils/sanitize'

const messageStore = useMessageStore()

const showDetail = ref(false)
const selectedAnnouncement = ref<any>(null)
const closedIds = ref<Set<string>>(new Set())

// 从localStorage加载已关闭的公告（永久有效，已读状态由后端数据库持久化）
onMounted(() => {
  try {
    const stored = localStorage.getItem('closedMarqueeIds')
    if (stored) {
      const data = JSON.parse(stored)
      closedIds.value = new Set(Object.keys(data))
    }
  } catch (e) {
    console.error('加载已关闭公告失败:', e)
  }

  // 加载公告
  if (messageStore.loadUserAnnouncements) {
    messageStore.loadUserAnnouncements()
  }
})

const visibleAnnouncements = computed(() => {
  if (!messageStore.announcements || !Array.isArray(messageStore.announcements)) {
    return []
  }
  // 🔥 只显示未读、非静默的公告，已读/静默自动从横幅消失
  return messageStore.announcements.filter(
    (a: any) => a.status === 'published' && a.isMarquee && !closedIds.value.has(a.id) && !a.read && !a.silent
  ).slice(0, 5)
})

const animationDuration = computed(() => {
  const count = visibleAnnouncements.value.length
  return `${Math.max(10, count * 5)}s`
})

const formatTime = (time: string) => {
  return time ? dayjs(time).format('MM-DD HH:mm') : ''
}

const handleClick = () => {
  if (visibleAnnouncements.value.length > 0) {
    selectedAnnouncement.value = visibleAnnouncements.value[0]
    showDetail.value = true
  }
}

const markAsRead = async () => {
  if (selectedAnnouncement.value) {
    await messageStore.markAnnouncementAsRead(selectedAnnouncement.value.id)
    // 关闭并从列表移除
    saveClosedId(selectedAnnouncement.value.id)
    showDetail.value = false
  }
}

const closeMarquee = async () => {
  // 关闭所有显示的公告并标记已读
  for (const ann of visibleAnnouncements.value) {
    saveClosedId(ann.id)
    try {
      await messageStore.markAnnouncementAsRead(ann.id)
    } catch (e) {
      console.error('标记已读失败:', e)
    }
  }
}

const saveClosedId = (id: string) => {
  closedIds.value.add(id)
  try {
    const stored = localStorage.getItem('closedMarqueeIds')
    const data = stored ? JSON.parse(stored) : {}
    data[id] = Date.now()
    localStorage.setItem('closedMarqueeIds', JSON.stringify(data))
  } catch (e) {
    console.error('保存已关闭公告失败:', e)
  }
}
</script>

<style scoped>
.announcement-marquee {
  display: flex;
  align-items: center;
  flex: 1;
  max-width: 500px;
  height: 28px;
  margin: 0 20px;
  padding: 0 8px;
  background: linear-gradient(90deg, #fff7ed 0%, #fef3c7 100%);
  border-radius: 14px;
  overflow: hidden;
}

.marquee-icon {
  flex-shrink: 0;
  margin-right: 8px;
}

.marquee-content {
  flex: 1;
  overflow: hidden;
  cursor: pointer;
}

.marquee-text {
  display: inline-block;
  white-space: nowrap;
  animation: marquee linear infinite;
  font-size: 13px;
  color: #b45309;
}

.marquee-text:hover {
  animation-play-state: paused;
}

.separator {
  margin: 0 12px;
  color: #d97706;
}

.marquee-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.source-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.system-dot {
  background: #f56c6c;
}

.company-dot {
  background: #409eff;
}

.system-text {
  color: #f56c6c;
  font-weight: 500;
}

@keyframes marquee {
  0% {
    transform: translateX(100%);
  }
  100% {
    transform: translateX(-100%);
  }
}

.marquee-close {
  flex-shrink: 0;
  padding: 2px;
  color: #b45309;
}

.marquee-close:hover {
  color: #92400e;
}

.announcement-detail {
  padding: 8px 0;
}

.detail-header-info {
  margin-bottom: 12px;
}

.unread-count {
  display: inline-block;
  padding: 2px 10px;
  background: #fef0f0;
  color: #f56c6c;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.detail-title-text {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.time {
  font-size: 13px;
  color: #909399;
}

.detail-content {
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
}
</style>
