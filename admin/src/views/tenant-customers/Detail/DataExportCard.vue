<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>数据导出/导入</span>
      </div>
    </template>

    <!-- 完整业务数据导出/导入 -->
    <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
      <template #title>
        <span>完整数据导出包含该租户的全部业务数据（70+张表：用户、客户、订单、产品、售后、物流、通话、业绩、企微、通知、配置等），JSON格式，可用于数据恢复。</span>
      </template>
    </el-alert>
    <div class="export-actions" style="margin-bottom: 16px;">
      <el-button type="success" @click="$emit('full-export')" :loading="fullExporting" :disabled="fullExportJobId !== ''">
        <el-icon><Download /></el-icon>导出完整业务数据 (JSON)
      </el-button>
      <template v-if="fullExportJobId">
        <el-tag v-if="fullExportStatus === 'processing'" type="warning" style="margin-left: 8px;">
          导出中... {{ fullExportProgress }}%
        </el-tag>
        <el-button v-if="fullExportStatus === 'completed'" type="primary" @click="$emit('full-export-download')" style="margin-left: 8px;">
          <el-icon><Download /></el-icon>下载JSON数据（可导入）
        </el-button>
        <el-button v-if="fullExportStatus === 'completed'" type="success" @click="$emit('full-export-download-html')" style="margin-left: 8px;">
          <el-icon><Download /></el-icon>下载HTML报告（可浏览）
        </el-button>
        <el-tag v-if="fullExportStatus === 'failed'" type="danger" style="margin-left: 8px;">
          导出失败: {{ fullExportError || '未知错误' }}
        </el-tag>
      </template>

      <el-upload
        :auto-upload="false" accept=".json" :show-file-list="false"
        @change="(f: any) => $emit('full-import', f)"
        style="display: inline-block; margin-left: 12px;"
      >
        <el-button type="warning" :loading="fullImporting">
          <el-icon><Upload /></el-icon>导入业务数据 (JSON)
        </el-button>
      </el-upload>
      <template v-if="fullImportJobId">
        <el-tag v-if="fullImportStatus === 'processing'" type="warning" style="margin-left: 8px;">
          导入中... {{ fullImportProgress }}%
        </el-tag>
        <el-tag v-if="fullImportStatus === 'completed'" type="success" style="margin-left: 8px;">
          导入完成（{{ fullImportProcessed }} 条，跳过 {{ fullImportSkipped }}，失败 {{ fullImportErrors }}）
        </el-tag>
      </template>
    </div>

    <el-divider content-position="left">页面数据快捷导出 (Excel)</el-divider>
    <div class="export-actions">
      <el-button type="primary" @click="$emit('export-detail')" :loading="exporting">
        <el-icon><Download /></el-icon>导出租户详情
      </el-button>
      <el-button @click="$emit('export-users')" :loading="exportingUsers">
        <el-icon><Download /></el-icon>导出用户列表
      </el-button>
      <el-button @click="$emit('export-logs')" :loading="exportingLogs">
        <el-icon><Download /></el-icon>导出操作日志
      </el-button>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { Download, Upload } from '@element-plus/icons-vue'

defineProps<{
  fullExporting: boolean
  fullExportJobId: string
  fullExportStatus: string
  fullExportProgress: number
  fullExportError: string
  fullImporting: boolean
  fullImportJobId: string
  fullImportStatus: string
  fullImportProgress: number
  fullImportProcessed: number
  fullImportSkipped: number
  fullImportErrors: number
  exporting: boolean
  exportingUsers: boolean
  exportingLogs: boolean
}>()

defineEmits<{
  'full-export': []
  'full-export-download': []
  'full-export-download-html': []
  'full-import': [file: any]
  'export-detail': []
  'export-users': []
  'export-logs': []
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
.export-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
</style>
