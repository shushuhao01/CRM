<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>数据清理</span>
        <el-button size="small" @click="$emit('refresh-status')" :loading="cleanupStatusLoading">刷新状态</el-button>
      </div>
    </template>

    <div v-loading="cleanupStatusLoading">
      <!-- 已清理过的标识 -->
      <el-alert v-if="cleanupStatus.dataCleaned" type="success" :closable="false" show-icon style="margin-bottom: 16px;">
        <template #title>
          <span>✅ 该租户数据已于 <strong>{{ formatDateTime(cleanupStatus.dataCleanedAt) }}</strong> 清理完毕，无需重复操作。</span>
        </template>
        <template v-if="cleanupStatus.lastCleanup" #default>
          <div style="margin-top: 8px; font-size: 12px; color: #909399;">
            清理详情：{{ cleanupStatus.lastCleanup.remark || '-' }}
          </div>
        </template>
      </el-alert>

      <!-- 不可清理的原因提示 -->
      <el-alert v-else-if="!cleanupStatus.canCleanup && cleanupStatus.reason" type="warning" :closable="false" show-icon style="margin-bottom: 16px;">
        <template #title><span>⚠️ 当前不可清理：{{ cleanupStatus.reason }}</span></template>
      </el-alert>

      <!-- 可清理状态提示 -->
      <el-alert v-else-if="cleanupStatus.canCleanup" type="error" :closable="false" show-icon style="margin-bottom: 16px;">
        <template #title>
          <span>🗑️ {{ cleanupStatus.reason }}。清理后将删除该租户的所有数据库记录和物理文件（图片等），此操作不可恢复！</span>
        </template>
      </el-alert>

      <!-- 清理操作区 -->
      <div class="cleanup-actions">
        <div class="cleanup-info">
          <el-descriptions :column="2" size="small" border>
            <el-descriptions-item label="清理状态">
              <el-tag v-if="cleanupStatus.dataCleaned" type="success" size="small">已清理</el-tag>
              <el-tag v-else-if="cleanupStatus.canCleanup" type="danger" size="small">可清理</el-tag>
              <el-tag v-else type="info" size="small">不可清理</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="过期天数">
              {{ cleanupStatus.expiredDays > 0 ? cleanupStatus.expiredDays + ' 天' : '未过期' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
        <div style="margin-top: 16px; display: flex; align-items: center; gap: 12px;">
          <el-button type="danger" :disabled="!cleanupStatus.canCleanup" :loading="cleanupExecuting" @click="$emit('cleanup-data')">
            <el-icon><Delete /></el-icon>清理过期数据
          </el-button>
          <span v-if="!cleanupStatus.canCleanup && !cleanupStatus.dataCleaned" style="font-size: 12px; color: #909399;">
            需过期满30天后才可执行清理
          </span>
        </div>
      </div>

      <!-- 清理结果展示 -->
      <div v-if="cleanupResult" class="cleanup-result">
        <el-divider content-position="left">清理结果</el-divider>
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="租户名称">{{ cleanupResult.tenantName }}</el-descriptions-item>
          <el-descriptions-item label="过期天数">{{ cleanupResult.expiredDays }} 天</el-descriptions-item>
          <el-descriptions-item label="删除记录数">
            <span style="color: #f56c6c; font-weight: 600;">{{ cleanupResult.totalDeletedRecords }} 条</span>
          </el-descriptions-item>
          <el-descriptions-item label="清理文件数">
            <span style="color: #f56c6c; font-weight: 600;">{{ cleanupResult.cleanedFilesCount }} 个（{{ cleanupResult.cleanedFilesSizeMb }} MB）</span>
          </el-descriptions-item>
          <el-descriptions-item label="清理时间">{{ formatDateTime(cleanupResult.cleanedAt) }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { formatDateTime } from './helpers'

defineProps<{
  cleanupStatus: {
    canCleanup: boolean
    reason: string
    expiredDays: number
    dataCleaned: boolean
    dataCleanedAt: string
    lastCleanup: any
  }
  cleanupStatusLoading: boolean
  cleanupExecuting: boolean
  cleanupResult: any
}>()

defineEmits<{
  'refresh-status': []
  'cleanup-data': []
}>()
</script>

<style scoped lang="scss">
.info-card {
  border-radius: 8px;
  border: none;
  :deep(.el-card__header) { padding: 12px 20px; }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}
</style>
