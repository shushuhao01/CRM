<template>
  <div class="wecom-standalone-layout">
    <!-- 极简顶栏 -->
    <div class="standalone-header">
      <div class="standalone-header-left">
        <span class="standalone-logo">☁️</span>
        <span class="standalone-title">云客CRM - 企微管理</span>
      </div>
      <div class="standalone-header-right">
        <span v-if="userStore.currentUser" class="standalone-user-info">
          <el-icon :size="14"><User /></el-icon>
          {{ userStore.currentUser.name || '用户' }}
        </span>
        <el-button link @click="handleClose" title="关闭窗口">
          <el-icon :size="18"><Close /></el-icon>
        </el-button>
      </div>
    </div>
    <!-- 页面内容 -->
    <div class="standalone-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomStandaloneLayout' })
import { Close, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const handleClose = () => {
  window.close()
}
</script>

<style scoped>
.wecom-standalone-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  overflow: hidden;
}

.standalone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 21, 41, 0.06);
}

.standalone-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.standalone-logo {
  font-size: 22px;
}

.standalone-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.standalone-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.standalone-user-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.standalone-content {
  flex: 1;
  overflow: auto;
  padding: 0;
}
</style>

