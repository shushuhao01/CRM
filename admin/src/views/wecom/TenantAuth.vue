<template>
  <div class="page-container">
    <!-- 搜索和列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>租户授权管理</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索租户/企业ID" clearable style="width: 220px" @keyup.enter="fetchList" />
            <el-select v-model="searchAuthType" placeholder="授权类型" clearable style="width: 140px" @change="fetchList">
              <el-option label="全部" value="all" />
              <el-option label="自建应用" value="self_built" />
              <el-option label="第三方应用" value="third_party" />
            </el-select>
            <el-select v-model="searchStatus" placeholder="连接状态" clearable style="width: 130px" @change="fetchList">
              <el-option label="已连接" value="connected" />
              <el-option label="未连接" value="disconnected" />
            </el-select>
            <el-button type="primary" @click="fetchList">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="authList" v-loading="loading" stripe>
        <el-table-column label="租户" min-width="160">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '未关联' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.tenantCode || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="configName" label="配置名称" width="130" />
        <el-table-column prop="corpId" label="企业ID" width="180" show-overflow-tooltip />
        <el-table-column label="授权类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.authType === 'third_party' ? 'warning' : ''" size="small" effect="plain">
              {{ row.authType === 'third_party' ? '第三方应用' : '自建应用' }}
            </el-tag>
          </template>
        </el-table-column>
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
        <el-table-column label="增值服务" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.vasChatArchive" type="success" size="small" effect="plain">已开通</el-tag>
            <span v-else style="color: #c0c4cc; font-size: 12px">未开通</span>
          </template>
        </el-table-column>
        <el-table-column label="API调用" prop="apiCallCount" width="90" align="center" />
        <el-table-column label="更新时间" width="155">
          <template #default="{ row }">{{ formatDate(row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.isEnabled"
              v-permission="'wecom-management:tenant-auth:edit'"
              link type="danger" size="small"
              @click="handleRevoke(row)"
            >停用</el-button>
            <el-button
              v-else
              v-permission="'wecom-management:tenant-auth:edit'"
              link type="success" size="small"
              @click="handleRestore(row)"
            >恢复</el-button>
          </template>
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

    <!-- 授权详情弹窗 -->
    <el-dialog v-model="detailVisible" title="授权详情" width="720px" top="5vh">
      <div v-if="detailData" v-loading="detailLoading">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="配置名称">{{ detailData.configName }}</el-descriptions-item>
          <el-descriptions-item label="企业ID">{{ detailData.corpId }}</el-descriptions-item>
          <el-descriptions-item label="授权类型">
            <el-tag :type="detailData.authType === 'third_party' ? 'warning' : ''" size="small">
              {{ detailData.authType === 'third_party' ? '第三方应用' : '自建应用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="连接状态">
            <el-tag :type="detailData.connectionStatus === 'connected' ? 'success' : 'info'" size="small">
              {{ detailData.connectionStatus === 'connected' ? '已连接' : '未连接' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="租户名称">{{ detailData.tenantName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="租户编码">{{ detailData.tenantCode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="是否启用">
            <el-tag :type="detailData.isEnabled ? 'success' : 'danger'" size="small">
              {{ detailData.isEnabled ? '已启用' : '已停用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="会话存档授权">
            <el-tag :type="detailData.chatArchiveAuth ? 'success' : 'info'" size="small">
              {{ detailData.chatArchiveAuth ? '已授权' : '未授权' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="数据API状态">
            <el-tag :type="detailData.dataApiStatus === 1 ? 'success' : detailData.dataApiStatus === 2 ? 'danger' : 'info'" size="small">
              {{ dataApiStatusLabel(detailData.dataApiStatus) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="SuiteID" v-if="detailData.authType === 'third_party'">{{ detailData.suiteId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="增值服务">
            <el-tag v-if="detailData.vasChatArchive" type="success" size="small">已开通 ({{ detailData.vasUserCount }}人)</el-tag>
            <span v-else style="color: #c0c4cc">未开通</span>
          </el-descriptions-item>
          <el-descriptions-item label="增值到期">{{ detailData.vasExpireDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="API调用次数">{{ detailData.apiCallCount || 0 }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="最后错误" :span="2" v-if="detailData.lastError">
            <el-text type="danger" size="small">{{ detailData.lastError }}</el-text>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 统计数据 -->
        <el-divider content-position="left">关联数据统计</el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-statistic title="企微客户" :value="detailData.stats?.customerCount || 0" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="成员绑定" :value="detailData.stats?.bindingCount || 0" />
          </el-col>
          <el-col :span="8">
            <el-statistic title="会话记录" :value="detailData.stats?.chatRecordCount || 0" />
          </el-col>
        </el-row>

        <!-- 授权范围 -->
        <template v-if="detailData.authScope">
          <el-divider content-position="left">授权范围</el-divider>
          <pre class="json-block">{{ JSON.stringify(detailData.authScope, null, 2) }}</pre>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const authList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const searchAuthType = ref('all')
const searchStatus = ref('')

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<any>(null)

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const dataApiStatusLabel = (status: number) => {
  const map: Record<number, string> = { 0: '未授权', 1: '已授权', 2: '已过期' }
  return map[status] || '未知'
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/tenant-auth', {
      params: {
        keyword: searchKeyword.value || undefined,
        authType: searchAuthType.value || undefined,
        status: searchStatus.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    if (res.data) {
      authList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('Fetch tenant auth list error:', e)
    ElMessage.error('租户授权列表加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const viewDetail = async (row: any) => {
  detailLoading.value = true
  detailVisible.value = true
  detailData.value = null
  try {
    const res = await request.get(`/wecom-management/tenant-auth/${row.configId}/detail`)
    if (res.data) {
      detailData.value = res.data
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '获取详情失败')
  } finally {
    detailLoading.value = false
  }
}

const handleRevoke = (row: any) => {
  ElMessageBox.prompt(
    `确定停用配置「${row.configName}」（${row.corpId}）的授权？\n停用后该租户将无法使用企微功能。`,
    '停用授权',
    { confirmButtonText: '确认停用', cancelButtonText: '取消', inputPlaceholder: '停用原因（可选）', type: 'warning' }
  ).then(async ({ value: reason }: { value: string }) => {
    try {
      await request.post(`/wecom-management/tenant-auth/${row.configId}/revoke`, { reason })
      ElMessage.success('已停用授权')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定恢复配置「${row.configName}」的授权？`, '恢复授权', { type: 'info' })
    await request.post(`/wecom-management/tenant-auth/${row.configId}/restore`)
    ElMessage.success('已恢复授权')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
.json-block {
  background: #f5f7fa;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  margin: 0;
}
</style>

