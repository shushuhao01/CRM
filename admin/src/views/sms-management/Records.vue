<template>
  <div class="sms-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>发送记录</h2>
        <p class="header-desc">查看全平台所有租户的短信发送记录</p>
      </div>
    </div>

    <!-- 主内容 -->
    <el-card class="main-card">
      <!-- 筛选栏 -->
      <div class="toolbar">
        <div class="toolbar-left">
          <el-select v-model="filterStatus" placeholder="发送状态" clearable style="width: 130px" @change="handleSearch">
            <el-option label="全部" value="" />
            <el-option label="已完成" value="completed" />
            <el-option label="发送中" value="sending" />
            <el-option label="待发送" value="pending" />
            <el-option label="失败" value="failed" />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleSearch"
          />
          <el-input v-model="keyword" placeholder="搜索模板名称、发送人、内容" clearable style="width: 240px" @keyup.enter="handleSearch">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button @click="handleSearch" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table :data="list" v-loading="loading" stripe style="width: 100%" table-layout="auto">
        <el-table-column label="编号" width="100">
          <template #default="{ row }">
            <el-tooltip :content="row.id" placement="top">
              <span class="short-id">{{ row.shortId || row.id?.substring(0, 8)?.toUpperCase() }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板名称" min-width="130" show-overflow-tooltip />
        <el-table-column label="发送内容" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.content" placement="top" :show-after="300" :disabled="!row.content || row.content.length <= 60">
              <div class="content-clamp">{{ row.content }}</div>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="发送人" width="110">
          <template #default="{ row }">
            <span>{{ row.applicantName || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="租户" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.tenantName || '平台' }}</div>
            <div v-if="row.tenantId && row.tenantName" class="sub-text">{{ row.tenantId.substring(0, 8) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="接收/成功/失败" width="130" align="center">
          <template #default="{ row }">
            <span>{{ row.recipientCount }}</span>
            <span class="text-success"> / {{ row.successCount }}</span>
            <span class="text-danger"> / {{ row.failCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getRecordStatusType(row.status)" size="small">{{ getRecordStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sentAt" label="发送时间" width="160">
          <template #default="{ row }">{{ formatTime(row.sentAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="发送记录详情" width="600px" destroy-on-close>
      <el-descriptions v-if="currentRecord" :column="2" border>
        <el-descriptions-item label="模板名称" :span="2">{{ currentRecord.templateName }}</el-descriptions-item>
        <el-descriptions-item label="发送人">{{ currentRecord.applicantName || '—' }}</el-descriptions-item>
        <el-descriptions-item label="租户">{{ currentRecord.tenantName || '平台' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getRecordStatusType(currentRecord.status)" size="small">{{ getRecordStatusLabel(currentRecord.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="接收人数">{{ currentRecord.recipientCount }}</el-descriptions-item>
        <el-descriptions-item label="成功/失败">
          <span class="text-success">{{ currentRecord.successCount }}</span> / <span class="text-danger">{{ currentRecord.failCount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="记录编号">{{ currentRecord.shortId || currentRecord.id?.substring(0, 8)?.toUpperCase() }}</el-descriptions-item>
        <el-descriptions-item label="发送内容" :span="2">
          <div class="content-preview">{{ currentRecord.content }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="发送时间" :span="2">{{ formatTime(currentRecord.sentAt || currentRecord.createdAt) }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'
import { smsManagementApi, type SmsRecordItem } from '@/api/smsManagement'

const loading = ref(false)
const list = ref<SmsRecordItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const filterStatus = ref('')
const keyword = ref('')
const dateRange = ref<string[]>([])

const showDetailDialog = ref(false)
const currentRecord = ref<SmsRecordItem | null>(null)

const recordStatusMap: Record<string, { label: string; type: string }> = {
  completed: { label: '已完成', type: 'success' },
  sending: { label: '发送中', type: '' },
  pending: { label: '待发送', type: 'warning' },
  failed: { label: '失败', type: 'danger' }
}
const getRecordStatusLabel = (s: string) => recordStatusMap[s]?.label || s
const getRecordStatusType = (s: string) => (recordStatusMap[s]?.type || 'info') as any

const formatTime = (t: string) => t ? new Date(t).toLocaleString('zh-CN') : '—'

const handleSearch = () => {
  currentPage.value = 1
  loadList()
}

const loadList = async () => {
  loading.value = true
  try {
    const res = await smsManagementApi.getRecords({
      keyword: keyword.value,
      status: filterStatus.value,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
      page: currentPage.value,
      pageSize: pageSize.value
    })
    if (res.data) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    console.error('加载发送记录失败', e)
  } finally {
    loading.value = false
  }
}

const showDetail = (row: SmsRecordItem) => {
  currentRecord.value = row
  showDetailDialog.value = true
}

onMounted(() => { loadList() })
</script>

<style scoped lang="scss">
.page-header {
  margin-bottom: 20px;
  h2 { margin: 0 0 4px 0; font-size: 20px; color: #303133; }
  .header-desc { margin: 0; font-size: 13px; color: #909399; }
}
.main-card { border-radius: 12px; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-left { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }
.content-preview { padding: 8px 12px; background: #f8f9fa; border-radius: 4px; line-height: 1.6; white-space: pre-wrap; }
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }

.short-id {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
  padding: 2px 6px;
  background: #ecf5ff;
  border-radius: 4px;
}

.content-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  max-height: 3em;
  word-break: break-all;
}

.sub-text {
  font-size: 11px;
  color: #c0c4cc;
  font-family: 'Consolas', 'Monaco', monospace;
}
</style>

