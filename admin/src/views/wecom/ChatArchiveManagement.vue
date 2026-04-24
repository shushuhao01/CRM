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

    <!-- 列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>会话存档管理</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索租户名称" clearable style="width: 200px" @keyup.enter="fetchList" />
            <el-button type="primary" @click="fetchList">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column label="租户" min-width="150">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '-' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.tenantCode }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.chatArchiveAuth ? 'success' : 'info'" size="small">
              {{ row.chatArchiveAuth ? '已授权' : '未授权' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="开通/使用人数" width="130" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.usedUsers > row.maxUsers ? '#f56c6c' : '#303133' }">
              {{ row.usedUsers }} / {{ row.maxUsers }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="消息数量" prop="recordCount" width="100" align="center" />
        <el-table-column label="企微配置" prop="configCount" width="90" align="center" />
        <el-table-column label="成员绑定" prop="bindingCount" width="90" align="center" />
        <el-table-column label="存储方式" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.storageType === 'oss' ? 'warning' : ''" size="small" effect="plain">
              {{ row.storageType === 'oss' ? 'OSS' : '数据库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="预估存储" width="100" align="center">
          <template #default="{ row }">{{ row.estimatedStorageMB }} MB</template>
        </el-table-column>
        <el-table-column label="保留天数" width="90" align="center">
          <template #default="{ row }">{{ row.retentionDays }}天</template>
        </el-table-column>
        <el-table-column label="到期日期" width="110">
          <template #default="{ row }">
            <span :style="{ color: isExpired(row.expireDate) ? '#f56c6c' : '#303133' }">
              {{ row.expireDate || '-' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'wecom-management:chat-archive:edit'" link type="primary" size="small" @click="openConfigDialog(row)">配置</el-button>
            <el-button v-permission="'wecom-management:chat-archive:edit'" link type="danger" size="small" @click="handleCleanup(row)">清理</el-button>
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

    <!-- 配置弹窗 -->
    <el-dialog v-model="configDialogVisible" title="会话存档配置" width="560px">
      <el-form :model="configForm" label-width="110px">
        <el-form-item label="租户">
          <span style="font-weight: 600">{{ configForm.tenantName }}</span>
          <el-tag v-if="configForm.archiveStatus === 'expired'" type="danger" size="small" style="margin-left: 8px">已过期</el-tag>
          <el-tag v-else-if="configForm.archiveStatus === 'active'" type="success" size="small" style="margin-left: 8px">生效中</el-tag>
          <el-tag v-else type="info" size="small" style="margin-left: 8px">未激活</el-tag>
        </el-form-item>
        <el-form-item label="存储方式">
          <el-radio-group v-model="configForm.storageType">
            <el-radio label="database">数据库</el-radio>
            <el-radio label="oss">OSS对象存储</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="configForm.storageType === 'oss'">
          <el-form-item label="OSS Bucket">
            <el-input v-model="configForm.ossBucket" placeholder="如: my-archive-bucket" />
          </el-form-item>
          <el-form-item label="OSS前缀">
            <el-input v-model="configForm.ossPrefix" placeholder="如: wecom-archive/" />
          </el-form-item>
          <el-form-item label="OSS Endpoint">
            <el-input v-model="configForm.ossEndpoint" placeholder="如: oss-cn-guangzhou.aliyuncs.com" />
          </el-form-item>
          <el-form-item label="AccessKey">
            <el-input v-model="configForm.ossAccessKey" placeholder="阿里云AccessKeyId" show-password />
          </el-form-item>
          <el-form-item label="SecretKey">
            <el-input v-model="configForm.ossSecretKey" placeholder="阿里云AccessKeySecret" show-password />
          </el-form-item>
        </template>
        <el-form-item label="保留天数">
          <el-input-number v-model="configForm.retentionDays" :min="30" :max="3650" />
          <span style="margin-left: 10px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="最大人数">
          <el-input-number v-model="configForm.maxUsers" :min="1" :max="99999" />
          <span style="margin-left: 10px; color: #909399">人</span>
        </el-form-item>
        <el-form-item label="到期日期">
          <el-date-picker v-model="configForm.expireDate" type="date" placeholder="选择到期日期" value-format="YYYY-MM-DD" style="width: 200px" />
        </el-form-item>
        <el-form-item label="服务状态">
          <el-select v-model="configForm.archiveStatus" style="width: 200px">
            <el-option label="已激活" value="active" />
            <el-option label="已过期" value="expired" />
            <el-option label="未启用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="configSaving" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const summary = ref<any>({})

const configDialogVisible = ref(false)
const configSaving = ref(false)
const configForm = ref({
  tenantId: '',
  tenantName: '',
  storageType: 'database',
  retentionDays: 365,
  maxUsers: 10,
  ossBucket: '',
  ossPrefix: '',
  ossEndpoint: '',
  ossAccessKey: '',
  ossSecretKey: '',
  expireDate: '',
  archiveStatus: 'disabled'
})

const summaryCards = computed(() => [
  { label: '已授权租户', value: summary.value.authTenantCount || 0 },
  { label: '总消息数', value: summary.value.totalRecords || 0 },
  { label: '活跃租户', value: summary.value.activeTenantCount || 0 },
  { label: '总开通人数', value: summary.value.totalMaxUsers || 0 },
  { label: '使用中人数', value: summary.value.totalUsedUsers || 0 }
])

const isExpired = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/chat-archive-overview', {
      params: {
        keyword: searchKeyword.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    if (res.data) {
      tableData.value = res.data.list || []
      total.value = res.data.total || 0
      if (res.data.summary) summary.value = res.data.summary
    }
  } catch (e) {
    console.error('Fetch archive list error:', e)
  } finally {
    loading.value = false
  }
}

const openConfigDialog = (row: any) => {
  configForm.value = {
    tenantId: row.tenantId,
    tenantName: row.tenantName,
    storageType: row.storageType || 'database',
    retentionDays: row.retentionDays || 365,
    maxUsers: row.maxUsers || 10,
    ossBucket: row.ossBucket || '',
    ossPrefix: row.ossPrefix || '',
    ossEndpoint: row.ossEndpoint || '',
    ossAccessKey: '',
    ossSecretKey: '',
    expireDate: row.expireDate || '',
    archiveStatus: row.archiveStatus || 'disabled'
  }
  configDialogVisible.value = true
}

const saveConfig = async () => {
  configSaving.value = true
  try {
    await request.put(`/wecom-management/chat-archive-settings/${configForm.value.tenantId}`, {
      storageType: configForm.value.storageType,
      retentionDays: configForm.value.retentionDays,
      maxUsers: configForm.value.maxUsers,
      expireDate: configForm.value.expireDate || undefined,
      status: configForm.value.archiveStatus,
      ossConfig: configForm.value.storageType === 'oss' ? {
        bucket: configForm.value.ossBucket,
        prefix: configForm.value.ossPrefix,
        endpoint: configForm.value.ossEndpoint,
        accessKey: configForm.value.ossAccessKey || undefined,
        secretKey: configForm.value.ossSecretKey || undefined
      } : undefined
    })
    ElMessage.success('配置已保存')
    configDialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    configSaving.value = false
  }
}

const handleCleanup = (row: any) => {
  ElMessageBox.confirm(
    `确定要清理租户「${row.tenantName}」超过${row.retentionDays} 天的会话存档数据吗？\n此操作不可恢复！`,
    '清理确认',
    { confirmButtonText: '确认清理', cancelButtonText: '取消', type: 'warning' }
  ).then(async () => {
    try {
      const res = await request.delete(`/wecom-management/chat-archive-cleanup/${row.tenantId}`, {
        data: { retentionDays: row.retentionDays }
      })
      ElMessage.success(res.message || '清理完成')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e?.message || '清理失败')
    }
  }).catch(() => {})
}

onMounted(() => fetchList())
</script>

<style scoped>
.page-container { padding: 20px; }
.stat-card { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; color: #07c160; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
</style>
