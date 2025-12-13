<template>
  <div class="message-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>消息管理</h2>
      <p>管理系统消息订阅、公告发布和通知配置</p>
    </div>

    <!-- 数据汇总 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon subscription">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ stats.activeSubscriptions }}/{{ stats.totalSubscriptions }}</div>
                <div class="stats-label">消息订阅</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon announcement">
                <el-icon><ChatDotRound /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ stats.publishedAnnouncements }}/{{ stats.totalAnnouncements }}</div>
                <div class="stats-label">系统公告</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon message">
                <el-icon><Message /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ stats.unreadMessages }}/{{ stats.totalMessages }}</div>
                <div class="stats-label">未读消息</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon config">
                <el-icon><Setting /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-number">{{ stats.configuredChannels }}/{{ stats.totalChannels }}</div>
                <div class="stats-label">通知渠道</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 功能选项卡 -->
    <div class="tabs-section">
      <el-tabs v-model="activeTab" class="message-tabs">
        <!-- 消息订阅暂时隐藏，功能已整合到通知配置中 -->
        <!-- <el-tab-pane name="subscription">
          <template #label>
            <div class="tab-label">
              <el-icon class="tab-icon"><Bell /></el-icon>
              <span>消息订阅</span>
            </div>
          </template>
          <MessageSubscription />
        </el-tab-pane> -->

        <el-tab-pane name="announcement">
          <template #label>
            <div class="tab-label">
              <el-icon class="tab-icon"><ChatDotRound /></el-icon>
              <span>公告发布</span>
            </div>
          </template>
          <AnnouncementPublish />
        </el-tab-pane>

        <el-tab-pane name="config">
          <template #label>
            <div class="tab-label">
              <el-icon class="tab-icon"><Setting /></el-icon>
              <span>通知配置</span>
            </div>
          </template>
          <MessageConfig />
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useMessageStore } from '@/stores/message'
// import MessageSubscription from './components/MessageSubscription.vue' // 暂时隐藏
import AnnouncementPublish from './components/AnnouncementPublish.vue'
import MessageConfig from './components/MessageConfig.vue'
import {
  Bell,
  ChatDotRound,
  Message,
  Setting
} from '@element-plus/icons-vue'

// 当前激活的选项卡（默认显示公告发布）
const activeTab = ref('announcement')

// 使用消息Store
const messageStore = useMessageStore()

// 统计数据
const stats = ref({
  totalSubscriptions: 0,
  activeSubscriptions: 0,
  totalAnnouncements: 0,
  publishedAnnouncements: 0,
  unreadMessages: 0,
  totalMessages: 0,
  configuredChannels: 0,
  totalChannels: 0
})

// 加载统计数据
const loadStats = async () => {
  try {
    const response = await messageStore.messageApi.getMessageStats()
    if (response.data) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 页面初始化
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.message-management {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.15);
}

.stats-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.stats-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stats-icon.subscription {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.announcement {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon.message {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-icon.config {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stats-info {
  flex: 1;
}

.stats-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.tabs-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.message-tabs {
  padding: 0;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-bottom: 2px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 24px;
}

:deep(.el-tabs__nav) {
  border: none;
}

:deep(.el-tabs__item) {
  height: 56px;
  line-height: 56px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  border: none;
  margin-right: 8px;
  padding: 0 20px;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  position: relative;
  background: transparent;
}

:deep(.el-tabs__item:hover) {
  color: #409eff;
  background: transparent;
}

:deep(.el-tabs__item.is-active) {
  color: #409eff;
  background: transparent;
  border-bottom: none;
  box-shadow: none;
  font-weight: 600;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

:deep(.el-tabs__content) {
  padding: 0;
  background: #fff;
}

:deep(.el-tab-pane) {
  min-height: 500px;
  padding: 24px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-icon {
  font-size: 16px;
  transition: transform 0.3s ease;
}

:deep(.el-tabs__item:hover) .tab-icon {
  transform: scale(1.1);
}

:deep(.el-tabs__item.is-active) .tab-icon {
  transform: scale(1.15);
}
</style>
