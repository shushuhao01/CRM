<template>
  <el-dialog
    v-model="dialogVisible"
    title="操作日志"
    width="960px"
    class="op-log-dialog"
    destroy-on-close
  >
    <template #header>
      <div class="op-log-dialog-header">
        <el-icon class="op-log-dialog-icon"><DocumentCopy /></el-icon>
        <span class="op-log-dialog-title">操作日志</span>
        <el-tag v-if="resourceName" size="default" type="info" effect="plain" class="op-log-dialog-tag">
          {{ resourceName }}
        </el-tag>
      </div>
    </template>

    <el-table :data="logList" v-loading="loading" stripe border class="op-log-table">
      <el-table-column type="index" label="#" width="50" align="center" />
      <el-table-column label="操作类型" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="getOpTagType(row.operationType)" size="small" effect="light">
            {{ resolveLabel(row.operationType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作内容" min-width="260">
        <template #default="{ row }">
          <span class="op-log-detail-content">{{ row.operationContent }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作人" width="110" align="center">
        <template #default="{ row }">
          <span class="op-log-detail-operator">{{ row.operatorName || '系统' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作时间" width="180" align="center">
        <template #default="{ row }">
          <span class="op-log-detail-time">{{ formatLogTime(row.createdAt) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="op-log-dialog-footer">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadLogs"
        @current-change="loadLogs"
        background
      />
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { DocumentCopy } from '@element-plus/icons-vue'
import { operationLogApi } from '@/api/operationLog'

const props = defineProps<{
  visible: boolean
  resourceId: string
  resourceName?: string
  module: string
  opLabels: Record<string, string>
}>()

const emit = defineEmits(['update:visible'])

const dialogVisible = ref(false)
const loading = ref(false)
const logList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val && props.resourceId) {
    page.value = 1
    loadLogs()
  }
})

watch(dialogVisible, (val) => {
  if (!val) emit('update:visible', false)
})

const loadLogs = async () => {
  if (!props.resourceId || !props.module) return
  loading.value = true
  try {
    const res = await operationLogApi.getOperationLogs(props.module, props.resourceId, page.value, pageSize.value)
    const data = res?.data?.data || res?.data || res || {}
    logList.value = data.list || []
    total.value = data.total || 0
  } catch (e) {
    console.error('加载操作日志失败:', e)
    logList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const GLOBAL_OP_LABELS: Record<string, string> = {
  create: '创建', edit: '编辑', delete: '删除', approve: '审核通过', reject: '审核拒绝',
  status_change: '状态变更', ship: '发货', cancel: '取消', assign: '分配',
  password_reset: '重置密码', permission_change: '权限变更', role_change: '角色变更',
  lock: '封禁', unlock: '解禁', batch_update: '批量更新', batch_ship: '批量发货',
  manual_sync: '手动同步', auto_sync: '自动同步', submit_audit: '提交审核',
  todo_mark: '标记待办', todo_cancel: '取消待办', assign_manager: '指派负责人',
}

const resolveLabel = (type: string): string => {
  return props.opLabels[type] || GLOBAL_OP_LABELS[type] || type
}

const getOpTagType = (type: string): string => {
  const map: Record<string, string> = {
    create: 'success', edit: 'warning', delete: 'danger', approve: 'success',
    reject: 'danger', status_change: 'warning', ship: 'success', cancel: 'danger',
    assign: 'warning', password_reset: 'danger', permission_change: 'warning',
    lock: 'danger', unlock: 'success', batch_update: 'warning',
  }
  return map[type] || 'info'
}

const formatLogTime = (time: string): string => {
  if (!time) return '-'
  try {
    const d = new Date(time)
    return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  } catch {
    return time
  }
}
</script>

<style scoped>
.op-log-dialog-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.op-log-dialog-icon {
  font-size: 20px;
  color: #409eff;
}
.op-log-dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.op-log-dialog-tag {
  margin-left: 4px;
}
.op-log-table {
  margin-bottom: 16px;
}
.op-log-detail-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
}
.op-log-detail-operator {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}
.op-log-detail-time {
  font-size: 13px;
  color: #909399;
  font-family: 'Courier New', monospace;
}
.op-log-dialog-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}
</style>
