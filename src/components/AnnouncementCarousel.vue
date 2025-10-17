<template>
  <div v-if="visibleAnnouncements.length > 0" class="announcement-carousel">
    <div class="carousel-container">
      <div class="announcement-icon">
        <el-icon :size="16" color="#f56c6c">
          <Bell />
        </el-icon>
      </div>
      
      <div class="carousel-content">
        <el-carousel
          ref="carouselRef"
          :height="'32px'"
          :autoplay="true"
          :interval="5000"
          :loop="true"
          :show-indicators="false"
          :arrow="visibleAnnouncements.length > 1 ? 'hover' : 'never'"
          direction="vertical"
          class="announcement-slider"
        >
          <el-carousel-item
            v-for="announcement in visibleAnnouncements"
            :key="announcement.id"
            class="carousel-item"
          >
            <div 
              class="announcement-item"
              @click="handleAnnouncementClick(announcement)"
            >
              <span class="announcement-title">{{ announcement.title }}</span>
              <span class="announcement-time">{{ formatTime(announcement.publishedAt || announcement.publishTime) }}</span>
            </div>
          </el-carousel-item>
        </el-carousel>
      </div>
      
      <div class="carousel-actions">
        <el-button
          v-if="visibleAnnouncements.length > 1"
          type="text"
          size="small"
          @click="pauseCarousel"
          class="pause-btn"
        >
          <el-icon :size="12">
            <component :is="isPaused ? 'VideoPlay' : 'VideoPause'" />
          </el-icon>
        </el-button>
        
        <el-button
          type="text"
          size="small"
          @click="closeCarousel"
          class="close-btn"
        >
          <el-icon :size="12">
            <Close />
          </el-icon>
        </el-button>
      </div>
    </div>

    <!-- 公告详情弹窗 -->
    <el-dialog
      v-model="showAnnouncementDetail"
      :title="selectedAnnouncement?.title"
      width="600px"
      class="announcement-dialog"
    >
      <div v-if="selectedAnnouncement" class="announcement-detail">
        <div class="detail-meta">
          <el-tag :type="getAnnouncementTypeTag(selectedAnnouncement.type)">
            {{ getAnnouncementTypeText(selectedAnnouncement.type) }}
          </el-tag>
          <span class="publish-time">
            发布时间：{{ formatFullTime(selectedAnnouncement.publishedAt || selectedAnnouncement.publishTime) }}
          </span>
        </div>
        
        <div class="detail-content" v-html="selectedAnnouncement.content"></div>
        
        <div v-if="selectedAnnouncement.targetDepartments?.length" class="target-departments">
          <span class="label">目标部门：</span>
          <el-tag
            v-for="dept in selectedAnnouncement.targetDepartments"
            :key="dept"
            size="small"
            class="dept-tag"
          >
            {{ dept }}
          </el-tag>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showAnnouncementDetail = false">关闭</el-button>
        <el-button 
          type="primary" 
          @click="markAnnouncementAsRead"
          v-if="selectedAnnouncement && !selectedAnnouncement.read"
        >
          标记已读
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { ElMessage } from 'element-plus'
import { 
  Bell, 
  Close, 
  VideoPlay, 
  VideoPause 
} from '@element-plus/icons-vue'

// 使用Store
const messageStore = useMessageStore()
const userStore = useUserStore()

// 状态
const carouselRef = ref()
const isPaused = ref(false)
const showAnnouncementDetail = ref(false)
const selectedAnnouncement = ref(null)
const closedAnnouncementIds = ref(new Set())

// 计算属性
const visibleAnnouncements = computed(() => {
  if (!messageStore.announcements || !Array.isArray(messageStore.announcements)) {
    return []
  }
  
  return messageStore.announcements
    .filter(announcement => 
      announcement.status === 'published' &&
      announcement.isMarquee &&
      !closedAnnouncementIds.value.has(announcement.id) &&
      isAnnouncementActive(announcement)
    )
    .sort((a, b) => new Date(b.publishedAt || b.publishTime).getTime() - new Date(a.publishedAt || a.publishTime).getTime())
    .slice(0, 5) // 最多显示5条
})

// 方法
const isAnnouncementActive = (announcement: any) => {
  const now = new Date()
  const publishTime = new Date(announcement.publishedAt || announcement.publishTime)
  
  // 检查是否在发布时间范围内
  if (announcement.status === 'scheduled' && announcement.scheduledAt) {
    const scheduledTime = new Date(announcement.scheduledAt)
    if (scheduledTime > now) {
      return false
    }
  }
  
  // 检查是否过期（假设公告有效期为30天）
  const expireTime = new Date(publishTime.getTime() + 30 * 24 * 60 * 60 * 1000)
  return now <= expireTime
}

const handleAnnouncementClick = (announcement: any) => {
  selectedAnnouncement.value = announcement
  showAnnouncementDetail.value = true
}

const pauseCarousel = () => {
  if (carouselRef.value) {
    if (isPaused.value) {
      carouselRef.value.play()
    } else {
      carouselRef.value.pause()
    }
    isPaused.value = !isPaused.value
  }
}

const closeCarousel = () => {
  // 将当前显示的公告ID添加到已关闭列表
  visibleAnnouncements.value.forEach(announcement => {
    closedAnnouncementIds.value.add(announcement.id)
  })
  
  // 保存到本地存储
  localStorage.setItem('closedAnnouncementIds', JSON.stringify([...closedAnnouncementIds.value]))
}

const markAnnouncementAsRead = async () => {
  if (selectedAnnouncement.value) {
    try {
      await messageStore.markAnnouncementAsRead(selectedAnnouncement.value.id)
      ElMessage.success('已标记为已读')
      showAnnouncementDetail.value = false
    } catch (error) {
      ElMessage.error('标记失败，请重试')
    }
  }
}

const formatTime = (time: string) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60 * 1000) {
    return '刚刚'
  } else if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  } else if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  } else {
    return date.toLocaleDateString()
  }
}

const formatFullTime = (time: string) => {
  return new Date(time).toLocaleString()
}

const getAnnouncementTypeTag = (type: string) => {
  const typeMap = {
    'company': 'danger',
    'department': 'warning',
    'system': 'info'
  }
  return typeMap[type] || 'info'
}

const getAnnouncementTypeText = (type: string) => {
  const typeMap = {
    'company': '全公司',
    'department': '部门',
    'system': '系统'
  }
  return typeMap[type] || '未知'
}

// 生命周期
onMounted(() => {
  // 从本地存储恢复已关闭的公告ID
  const stored = localStorage.getItem('closedAnnouncementIds')
  if (stored) {
    try {
      const ids = JSON.parse(stored)
      closedAnnouncementIds.value = new Set(ids)
    } catch (error) {
      console.warn('Failed to parse closed announcement IDs:', error)
    }
  }
  
  // 只在用户已登录时加载公告数据
  if (userStore.isLoggedIn) {
    messageStore.loadAnnouncements()
  }
})

onUnmounted(() => {
  // 保存已关闭的公告ID到本地存储
  localStorage.setItem('closedAnnouncementIds', JSON.stringify([...closedAnnouncementIds.value]))
})
</script>

<style scoped>
.announcement-carousel {
  background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
  border-bottom: 1px solid #f97316;
  position: relative;
  z-index: 100;
}

.carousel-container {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  gap: 12px;
  max-width: 100%;
}

.announcement-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 50%;
}

.carousel-content {
  flex: 1;
  min-width: 0;
  height: 32px;
}

.announcement-slider {
  height: 32px !important;
}

:deep(.el-carousel__container) {
  height: 32px !important;
}

:deep(.el-carousel__item) {
  height: 32px !important;
  display: flex;
  align-items: center;
}

:deep(.el-carousel__arrow) {
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
}

:deep(.el-carousel__arrow i) {
  font-size: 12px;
}

.carousel-item {
  height: 32px;
  display: flex;
  align-items: center;
}

.announcement-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  cursor: pointer;
  padding: 0 8px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.announcement-item:hover {
  background: rgba(245, 108, 108, 0.1);
}

.announcement-title {
  flex: 1;
  font-size: 14px;
  color: #d97706;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12px;
}

.announcement-time {
  font-size: 12px;
  color: #92400e;
  flex-shrink: 0;
}

.carousel-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.pause-btn,
.close-btn {
  padding: 4px;
  color: #d97706;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.pause-btn:hover,
.close-btn:hover {
  background: rgba(245, 108, 108, 0.1);
  color: #b45309;
}

/* 公告详情弹窗样式 */
.announcement-detail {
  padding: 8px 0;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.publish-time {
  font-size: 14px;
  color: #6b7280;
}

.detail-content {
  line-height: 1.6;
  color: #374151;
  margin-bottom: 16px;
  min-height: 100px;
}

.target-departments {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.dept-tag {
  margin-right: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .carousel-container {
    padding: 6px 16px;
    gap: 8px;
  }
  
  .announcement-title {
    font-size: 13px;
  }
  
  .announcement-time {
    font-size: 11px;
  }
  
  .announcement-icon {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 480px) {
  .carousel-container {
    padding: 4px 12px;
  }
  
  .announcement-time {
    display: none;
  }
}
</style>