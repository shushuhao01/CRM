<template>
  <div class="mobile-app-download-page">
    <div class="page-container">
      <div class="page-header">
        <h2>移动应用下载</h2>
        <p>下载安装 CRM 移动客户端，随时随地管理您的业务</p>
      </div>
      <MobileSettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import MobileSettings from '@/views/System/Settings/MobileSettings.vue'
</script>

<style scoped>
.mobile-app-download-page {
  padding: 20px;
  min-height: calc(100vh - 120px);
  background: #f5f7fa;
}
.page-container {
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 20px;
}
.page-header h2 {
  margin: 0 0 6px;
  font-size: 22px;
  color: #303133;
}
.page-header p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}
</style>
