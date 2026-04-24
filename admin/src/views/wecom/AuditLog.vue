<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <el-input v-model="filter.keyword" placeholder="搜索" clearable size="small" style="width: 150px" @keyup.enter="fetchData" />
            <el-select v-model="filter.operator" placeholder="操作人" clearable size="small" style="width: 120px" @change="fetchData">
              <el-option v-for="op in operators" :key="op" :label="op" :value="op" />
            </el-select>
            <el-select v-model="filter.actionType" placeholder="操作类型" clearable size="small" style="width: 130px" @change="fetchData">
              <el-option v-for="(label, key) in actionTypeLabels" :key="key" :label="label" :value="key" />
            </el-select>
            <el-date-picker v-model="filter.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" size="small" style="width: 240px" @change="fetchData" />
            <el-button type="primary" size="small" @click="fetchData">查询</el-button>
            <el-button v-permission="'wecom-management:audit:export'" size="small" @click="handleExport" :loading="exporting">导出</el-button>
          </div>
        </div>
      </template>

      <!-- 统计摘要 -->
      <el-row :gutter="12" style="margin-bottom: 16px">
        <el-col :span="6">
          <div class="log-stat-mini"><span class="log-stat-val" style="color: #409eff">{{ total }}</span><span class="log-stat-lbl">日志总数</span></div>
        </el-col>
        <el-col :span="6">
          <div class="log-stat-mini"><span class="log-stat-val" style="color: #67c23a">{{ operators.length }}</span><span class="log-stat-lbl">操作人数</span></div>
        </el-col>
        <el-col :span="6">
          <div class="log-stat-mini"><span class="log-stat-val" style="color: #e6a23c">{{ todayCount }}</span><span class="log-stat-lbl">今日操作</span></div>
        </el-col>
        <el-col :span="6">
          <div class="log-stat-mini"><span class="log-stat-val" style="color: #909399">{{ actionTypeCount }}</span><span class="log-stat-lbl">操作类型数</span></div>
        </el-col>
      </el-row>

      <el-table :data="logs" v-loading="loading" stripe @row-click="handleRowClick" style="cursor: pointer">
        <el-table-column label="时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column label="操作类型" width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="actionTagType(row.actionType)" effect="plain">{{ actionTypeLabels[row.actionType] || row.actionType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="目标" width="140" show-overflow-tooltip />
        <el-table-column prop="detail" label="详情" min-width="250" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="130" />
        <el-table-column label="" width="50" align="center">
          <template #default>
            <el-icon><ArrowRight /></el-icon>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="filter.page"
          v-model:page-size="filter.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 日志详情抽屉 -->
    <el-drawer v-model="showDetailDrawer" title="日志详情" size="500px">
      <template v-if="detailLog">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="时间">{{ formatDate(detailLog.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ detailLog.operator }}</el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag size="small" :type="actionTagType(detailLog.actionType)">{{ actionTypeLabels[detailLog.actionType] || detailLog.actionType }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标">{{ detailLog.target || '-' }}</el-descriptions-item>
          <el-descriptions-item label="IP">{{ detailLog.ip || '-' }}</el-descriptions-item>
          <el-descriptions-item label="详情">
            <div style="white-space: pre-wrap; word-break: break-all; max-height: 400px; overflow-y: auto; font-size: 13px; line-height: 1.6">{{ detailLog.detail || '-' }}</div>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import { getAuditLogs, exportAuditLogs } from '@/api/wecomManagement'

const loading = ref(false)
const exporting = ref(false)
const logs = ref<any[]>([])
const total = ref(0)
const operators = ref<string[]>(['admin'])
const showDetailDrawer = ref(false)
const detailLog = ref<any>(null)
const todayCountVal = ref(0)
const actionTypeCountVal = ref(0)

const filter = ref({
  keyword: '', operator: '', actionType: '',
  dateRange: null as string[] | null,
  page: 1, pageSize: 10,
})

const actionTypeLabels: Record<string, string> = {
  adjust_ai_quota: '调整AI额度', fulfill_order: '履约订单', update_pricing: '修改定价',
  auth_operation: '授权操作', quota_change: '配额变更', secret_change: '密钥修改',
  system_config: '系统配置', generate_auth_link: '生成授权链接', cancel_auth: '取消授权',
  bind_tenant: '关联租户', create_package: '创建套餐', update_package: '修改套餐',
  renew_package: '续费', revoke_auth: '撤销授权', restore_auth: '恢复授权',
  export_data: '数据导出', toggle_archive: '切换存档授权',
}

const actionTagType = (type: string) => {
  if (['auth_operation', 'cancel_auth', 'revoke_auth'].includes(type)) return 'danger'
  if (['quota_change', 'adjust_ai_quota'].includes(type)) return 'warning'
  if (['system_config', 'secret_change'].includes(type)) return ''
  return 'success'
}

const todayCount = computed(() => todayCountVal.value || logs.value.filter((l: any) => l.createdAt && String(l.createdAt).startsWith(new Date().toISOString().slice(0, 10))).length)
const actionTypeCount = computed(() => actionTypeCountVal.value || new Set(logs.value.map((l: any) => l.actionType).filter(Boolean)).size)

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'

const handleRowClick = (row: any) => {
  detailLog.value = row
  showDetailDrawer.value = true
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: filter.value.page, pageSize: filter.value.pageSize,
      keyword: filter.value.keyword || undefined,
      operator: filter.value.operator || undefined,
      actionType: filter.value.actionType || undefined,
    }
    if (filter.value.dateRange?.length === 2) {
      params.startDate = filter.value.dateRange[0]
      params.endDate = filter.value.dateRange[1]
    }
    const res: any = await getAuditLogs(params)
    if (Array.isArray(res)) {
      logs.value = res; total.value = res.length
    } else {
      logs.value = res?.data || []; total.value = res?.total || logs.value.length
      if (res?.todayCount !== undefined) todayCountVal.value = res.todayCount
      if (res?.actionTypeCount !== undefined) actionTypeCountVal.value = res.actionTypeCount
    }
    const ops = new Set<string>()
    logs.value.forEach((l: any) => { if (l.operator) ops.add(l.operator) })
    if (ops.size > 0) operators.value = [...ops]
  } catch {
    logs.value = []
    ElMessage.error('操作日志加载失败，请稍后重试')
  }
  loading.value = false
}

const handleExport = async () => {
  exporting.value = true
  try {
    const params: any = {
      keyword: filter.value.keyword || undefined,
      operator: filter.value.operator || undefined,
      actionType: filter.value.actionType || undefined,
    }
    if (filter.value.dateRange?.length === 2) {
      params.startDate = filter.value.dateRange[0]
      params.endDate = filter.value.dateRange[1]
    }
    const res: any = await exportAuditLogs(params)
    const blob = new Blob([res], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) { ElMessage.error(e?.message || '导出失败') }
  exporting.value = false
}

onMounted(fetchData)
</script>

<style scoped>
.page-container { padding: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; font-size: 16px; font-weight: 600; flex-wrap: wrap; gap: 8px; }
.log-stat-mini {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f9fafb; border-radius: 8px;
}
.log-stat-val { font-size: 20px; font-weight: 700; }
.log-stat-lbl { font-size: 12px; color: #909399; }
</style>

