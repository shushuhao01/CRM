<template>
  <div class="page-container">
    <!-- 搜索和列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>租户套餐管理</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索租户名称/编码" clearable style="width: 220px" @keyup.enter="fetchList" />
            <el-select v-model="searchStatus" placeholder="套餐状态" clearable style="width: 130px" @change="fetchList">
              <el-option label="全部" value="all" />
              <el-option label="生效中" value="active" />
              <el-option label="已过期" value="expired" />
              <el-option label="未启用" value="disabled" />
            </el-select>
            <el-button type="primary" @click="fetchList">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="packageList" v-loading="loading" stripe>
        <el-table-column label="租户" min-width="160">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '-' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.tenantCode || '-' }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="套餐类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="packageTypeColor(row.packageType)" size="small" effect="plain">
              {{ packageTypeLabel(row.packageType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="席位(已用/总)" width="130" align="center">
          <template #default="{ row }">
            <span :style="{ color: row.usedUsers > row.maxUsers ? '#f56c6c' : '#303133', fontWeight: 500 }">
              {{ row.usedUsers }} / {{ row.maxUsers }}
            </span>
            <el-progress
              :percentage="row.maxUsers > 0 ? Math.min(Math.round(row.usedUsers / row.maxUsers * 100), 100) : 0"
              :color="row.usedUsers > row.maxUsers ? '#f56c6c' : row.usedUsers / row.maxUsers > 0.8 ? '#e6a23c' : '#67c23a'"
              :stroke-width="4"
              :show-text="false"
              style="margin-top: 4px"
            />
          </template>
        </el-table-column>
        <el-table-column label="套餐状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="archiveStatusType(row.archiveStatus)" size="small">
              {{ archiveStatusLabel(row.archiveStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期日期" width="120">
          <template #default="{ row }">
            <span :style="{ color: isExpired(row.expireDate) ? '#f56c6c' : isExpiringSoon(row.expireDate) ? '#e6a23c' : '' }">
              {{ row.expireDate || '-' }}
            </span>
            <el-tag v-if="isExpired(row.expireDate)" type="danger" size="small" style="margin-left: 4px">已过期</el-tag>
            <el-tag v-else-if="isExpiringSoon(row.expireDate)" type="warning" size="small" style="margin-left: 4px">即将到期</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="存储方式" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.storageType === 'oss' ? 'warning' : ''" size="small" effect="plain">
              {{ row.storageType === 'oss' ? 'OSS' : '数据库' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息数" prop="totalMessages" width="90" align="center">
          <template #default="{ row }">{{ row.totalMessages || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'wecom-management:tenant-packages:edit'" link type="primary" size="small" @click="openAssignDialog(row)">变更</el-button>
            <el-button v-permission="'wecom-management:tenant-packages:edit'" link type="success" size="small" @click="openRenewDialog(row)">续费</el-button>
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

    <!-- 分配/变更弹窗 -->
    <el-dialog v-model="assignDialogVisible" title="分配/变更套餐" width="520px">
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="租户">
          <span style="font-weight: 600">{{ assignForm.tenantName }}</span>
        </el-form-item>
        <el-form-item label="套餐类型">
          <el-select v-model="assignForm.packageType" style="width: 100%">
            <el-option label="基础版" value="basic" />
            <el-option label="标准版" value="standard" />
            <el-option label="专业版" value="professional" />
            <el-option label="旗舰版" value="enterprise" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item label="开通人数">
          <el-input-number v-model="assignForm.maxUsers" :min="1" :max="99999" />
          <span style="margin-left: 10px; color: #909399">人</span>
        </el-form-item>
        <el-form-item label="存储方式">
          <el-radio-group v-model="assignForm.storageType">
            <el-radio label="database">数据库</el-radio>
            <el-radio label="oss">OSS</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="到期日期">
          <el-date-picker v-model="assignForm.expireDate" type="date" placeholder="选择到期日期" value-format="YYYY-MM-DD" style="width: 220px" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assignForm.remark" type="textarea" :rows="2" placeholder="变更原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="assignSaving" @click="handleAssign">确认</el-button>
      </template>
    </el-dialog>

    <!-- 续费弹窗 -->
    <el-dialog v-model="renewDialogVisible" title="套餐续费" width="460px">
      <el-form :model="renewForm" label-width="100px">
        <el-form-item label="租户">
          <span style="font-weight: 600">{{ renewForm.tenantName }}</span>
        </el-form-item>
        <el-form-item label="当前到期">
          <span :style="{ color: isExpired(renewForm.currentExpire) ? '#f56c6c' : '' }">
            {{ renewForm.currentExpire || '未设置' }}
          </span>
        </el-form-item>
        <el-form-item label="续费月数">
          <el-input-number v-model="renewForm.months" :min="1" :max="120" />
          <span style="margin-left: 10px; color: #909399">个月</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="renewForm.remark" type="textarea" :rows="2" placeholder="续费备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="renewDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="renewSaving" @click="handleRenew">确认续费</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const packageList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const searchKeyword = ref('')
const searchStatus = ref('all')

const assignDialogVisible = ref(false)
const assignSaving = ref(false)
const assignForm = reactive({
  tenantId: '',
  tenantName: '',
  packageType: 'basic',
  maxUsers: 10,
  storageType: 'database',
  expireDate: '',
  remark: ''
})

const renewDialogVisible = ref(false)
const renewSaving = ref(false)
const renewForm = reactive({
  tenantId: '',
  tenantName: '',
  currentExpire: '',
  months: 12,
  remark: ''
})

const packageTypeLabel = (type: string) => {
  const map: Record<string, string> = { basic: '基础版', standard: '标准版', professional: '专业版', enterprise: '旗舰版', custom: '自定义' }
  return map[type] || type || '基础版'
}

const packageTypeColor = (type: string) => {
  const map: Record<string, string> = { basic: '', standard: '', professional: 'warning', enterprise: 'danger', custom: 'info' }
  return (map[type] || '') as any
}

const archiveStatusLabel = (status: string) => {
  const map: Record<string, string> = { active: '生效中', expired: '已过期', disabled: '未启用' }
  return map[status] || '未知'
}

const archiveStatusType = (status: string) => {
  const map: Record<string, string> = { active: 'success', expired: 'danger', disabled: 'info' }
  return (map[status] || 'info') as any
}

const isExpired = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const isExpiringSoon = (date: string) => {
  if (!date) return false
  const d = new Date(date)
  const now = new Date()
  return d > now && d.getTime() - now.getTime() < 30 * 24 * 3600 * 1000
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/tenant-packages', {
      params: {
        keyword: searchKeyword.value || undefined,
        status: searchStatus.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    if (res.data) {
      packageList.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('Fetch tenant packages error:', e)
  } finally {
    loading.value = false
  }
}

const openAssignDialog = (row: any) => {
  assignForm.tenantId = row.tenantId
  assignForm.tenantName = row.tenantName
  assignForm.packageType = row.packageType || 'basic'
  assignForm.maxUsers = row.maxUsers || 10
  assignForm.storageType = row.storageType || 'database'
  assignForm.expireDate = row.expireDate || ''
  assignForm.remark = ''
  assignDialogVisible.value = true
}

const handleAssign = async () => {
  assignSaving.value = true
  try {
    await request.put(`/wecom-management/tenant-packages/${assignForm.tenantId}`, {
      packageType: assignForm.packageType,
      maxUsers: assignForm.maxUsers,
      expireDate: assignForm.expireDate || undefined,
      storageType: assignForm.storageType,
      remark: assignForm.remark || undefined
    })
    ElMessage.success('套餐已变更')
    assignDialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '变更失败')
  } finally {
    assignSaving.value = false
  }
}

const openRenewDialog = (row: any) => {
  renewForm.tenantId = row.tenantId
  renewForm.tenantName = row.tenantName
  renewForm.currentExpire = row.expireDate || ''
  renewForm.months = 12
  renewForm.remark = ''
  renewDialogVisible.value = true
}

const handleRenew = async () => {
  renewSaving.value = true
  try {
    await request.post(`/wecom-management/tenant-packages/${renewForm.tenantId}/renew`, {
      months: renewForm.months,
      remark: renewForm.remark || undefined
    })
    ElMessage.success(`已续费${renewForm.months} 个月`)
    renewDialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '续费失败')
  } finally {
    renewSaving.value = false
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
</style>
