<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>操作日志
          <el-tag size="small" style="margin-left: 8px;">共 {{ logsPagination.total }} 条</el-tag>
        </span>
        <div class="button-group">
          <el-button size="small" type="danger" text @click="$emit('clear-logs')">
            <el-icon><Delete /></el-icon>清空日志
          </el-button>
          <el-button size="small" @click="$emit('refresh')">刷新</el-button>
        </div>
      </div>
    </template>
    <el-table :data="logs" stripe v-loading="logsLoading" :max-height="400">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column label="操作类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getLogActionType(row.action)" size="small">{{ getLogActionText(row.action) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="结果" width="80">
        <template #default="{ row }">
          <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
            {{ row.result === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="详情" min-width="200" show-overflow-tooltip />
      <el-table-column label="授权码" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <code v-if="row.licenseKey" style="font-size: 12px;">{{ row.licenseKey }}</code>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="IP地址" width="130" show-overflow-tooltip>
        <template #default="{ row }">
          <code v-if="row.ipAddress" style="font-size: 12px;">{{ formatIpDisplay(row.ipAddress) }}</code>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="操作人" width="100">
        <template #default="{ row }">{{ row.operatorName || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作时间" width="180">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>
    <div class="pagination-wrapper" v-if="logsPagination.total > logsPagination.pageSize">
      <el-pagination
        v-model:current-page="logsPagination.page"
        :page-size="logsPagination.pageSize"
        :total="logsPagination.total"
        layout="total, prev, pager, next"
        small
        @current-change="$emit('refresh')"
      />
    </div>
    <el-empty v-if="!logsLoading && logs.length === 0" description="暂无操作日志" />
  </el-card>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue'
import { formatDateTime, formatIpDisplay, getLogActionType, getLogActionText } from './helpers'

defineProps<{
  logs: any[]
  logsLoading: boolean
  logsPagination: { page: number; pageSize: number; total: number }
}>()

defineEmits<{
  'refresh': []
  'clear-logs': []
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
  flex-wrap: wrap;
  gap: 8px;
}
.button-group {
  display: flex;
  gap: 8px;
  align-items: center;
}
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>
