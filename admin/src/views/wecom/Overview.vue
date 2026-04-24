<template>
  <div class="page-container">
    <!-- 统计摘要 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="4" v-for="stat in summaryCards" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 搜索和列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>企微配置列表</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索租户/企业ID/配置名" clearable style="width: 220px" @keyup.enter="fetchList" />
            <el-select v-model="searchStatus" placeholder="连接状态" clearable style="width: 140px" @change="fetchList">
              <el-option label="已连接" value="connected" />
              <el-option label="未连接" value="disconnected" />
            </el-select>
            <el-button type="primary" @click="fetchList">搜索</el-button>
          </div>
        </div>
      </template>

      <el-alert v-if="loadError" :title="loadError" type="warning" show-icon :closable="true" style="margin-bottom: 16px" />

      <el-table :data="configList" v-loading="loading" stripe>
        <el-table-column label="租户" min-width="140">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '未关联' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.tenantId ? row.tenantId.substring(0, 8) + '...' : '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="configName" label="配置名称" width="130" />
        <el-table-column prop="corpId" label="企业ID" width="160" show-overflow-tooltip />
        <el-table-column label="连接状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.connectionStatus === 'connected' ? 'success' : 'info'" size="small">
              {{ row.connectionStatus === 'connected' ? '已连接' : '未连接' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">{{ row.isEnabled ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="客户数" width="80" align="center">
          <template #default="{ row }">{{ row.customerCount }}</template>
        </el-table-column>
        <el-table-column label="绑定数" width="80" align="center">
          <template #default="{ row }">{{ row.bindingCount }}</template>
        </el-table-column>
        <el-table-column label="会话记录" width="90" align="center">
          <template #default="{ row }">{{ row.chatRecordCount }}</template>
        </el-table-column>
        <el-table-column label="会话存档" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-permission="'wecom-management:chat-archive:edit'"
              :model-value="row.chatArchiveAuth"
              size="small"
              @change="(val: boolean) => toggleArchiveAuth(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="155">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const configList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const searchStatus = ref('')
const summary = ref<any>({})
const loadError = ref('')

const summaryCards = computed(() => [
  { label: '企微配置', value: summary.value.totalConfigs || 0 },
  { label: '已连接', value: summary.value.connectedConfigs || 0 },
  { label: '接入租户', value: summary.value.tenantCount || 0 },
  { label: '企微客户', value: summary.value.totalCustomers || 0 },
  { label: '会话记录', value: summary.value.totalChatRecords || 0 },
  { label: '存档已授权', value: summary.value.chatArchiveAuthCount || 0 }
])

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const fetchSummary = async () => {
  try {
    const res = await request.get('/wecom-management/summary')
    if (res.data) summary.value = res.data
  } catch (e) {
    console.error('Fetch summary error:', e)
    ElMessage.error('概览统计加载失败，请稍后重试')
  }
}

const fetchList = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await request.get('/wecom-management/overview', {
      params: { keyword: searchKeyword.value || undefined, status: searchStatus.value || undefined, page: page.value, pageSize: pageSize.value }
    })
    if (res.data) {
      configList.value = res.data.list || []
      total.value = res.data.total || 0
      if (res.message && configList.value.length === 0) {
        loadError.value = res.message
      }
    }
  } catch (e: any) {
    console.error('Fetch list error:', e)
    loadError.value = e?.message || '加载企微概览失败，请检查数据库表是否已创建'
    ElMessage.error('企微概览列表加载失败，请稍后重试')
    configList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const toggleArchiveAuth = async (row: any, val: boolean) => {
  try {
    if (!row.tenantId) {
      ElMessage.warning('该配置未关联租户')
      return
    }
    await request.put(`/wecom-management/toggle-archive-auth/${row.tenantId}`, { enabled: val })
    row.chatArchiveAuth = val
    ElMessage.success(val ? '已授权会话存档' : '已撤销授权')
    fetchSummary()
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

onMounted(() => { fetchSummary(); fetchList() })
</script>

<style scoped>
.page-container { padding: 20px; }
.stat-card { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; color: #07c160; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
</style>


