<template>
  <div class="message-bell-container">
    <!-- 消息铃铛 -->
    <div class="message-bell" @click="showDialog = true">
      <el-badge :value="totalUnreadCount > 99 ? '99+' : totalUnreadCount" :hidden="totalUnreadCount === 0">
        <el-icon :size="18" class="bell-icon">
          <Bell />
        </el-icon>
      </el-badge>
    </div>

    <!-- 🔥 消息中心弹窗（与数据看板"查看全部"共用同一组件） -->
    <MessageCenterDialog v-model="showDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'
import { useAnnouncementVisibility } from '@/composables/useAnnouncementVisibility'
import MessageCenterDialog from '@/components/MessageCenterDialog.vue'
import { Bell } from '@element-plus/icons-vue'

// 使用Store
const notificationStore = useNotificationStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

// 公告可见性（与消息中心弹窗共享"不再显示"状态）
const { loadHiddenAnnouncements, unreadAnnouncementCount } = useAnnouncementVisibility()

// 状态
const showDialog = ref(false)

// 🔥 红点未读数 = 服务端真实系统消息未读数 + 可见公告未读数（不受本地只加载50条的限制）
const totalUnreadCount = computed(() =>
  notificationStore.unreadCount + unreadAnnouncementCount.value
)

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
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
}

.message-bell .bell-icon {
  color: #b0b3b8;
  transition: color 0.25s;
}

.message-bell:hover {
  background-color: rgba(0,0,0,0.04);
}

.message-bell:hover .bell-icon {
  color: #606266;
}

.message-bell :deep(.el-badge) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.bell-icon {
  transition: all 0.25s;
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

:deep(.el-badge__content) {
  font-size: 10px;
  padding: 0 4px;
  height: 16px;
  line-height: 16px;
  min-width: 16px;
}
</style>
