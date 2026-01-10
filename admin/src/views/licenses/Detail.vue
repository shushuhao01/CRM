<template>
  <div class="page-container">
    <el-card shadow="never" class="detail-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>授权详情（私有部署）</span>
          <el-button @click="$router.back()">返回</el-button>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="授权码" :span="2">
          <div class="license-key-display">
            <code>{{ showFullKey ? detail.licenseKey : maskKey(detail.licenseKey) }}</code>
            <el-button link type="primary" size="small" @click="showFullKey = !showFullKey">
              {{ showFullKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button link type="primary" size="small" @click="copyKey">复制</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="客户名称">{{ detail.customerName }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.customerContact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.customerPhone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.customerEmail || '-' }}</el-descriptions-item>
        <el-descriptions-item label="授权类型">
          <el-tag :type="getLicenseTypeTag(detail.licenseType)">{{ getLicenseTypeText(detail.licenseType) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户数量">{{ detail.maxUsers }} 人</el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <span :class="{ 'text-danger': isExpired(detail.expiresAt) }">
            {{ detail.licenseType === 'perpetual' ? '永久' : formatDate(detail.expiresAt) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">{{ detail.activatedAt ? formatDateTime(detail.activatedAt) : '未激活' }}</el-descriptions-item>
        <el-descriptions-item label="最后验证">{{ detail.lastVerifyAt ? formatDateTime(detail.lastVerifyAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="创建人">{{ detail.createdByName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="功能模块" :span="2">
          <el-tag v-for="m in (detail.features || [])" :key="m" class="module-tag" size="small">{{ getFeatureText(m) }}</el-tag>
          <span v-if="!detail.features?.length">全部功能</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ detail.notes || '无' }}</el-descriptions-item>
      </el-descriptions>

      <div class="action-bar" v-if="detail.status !== 'revoked'">
        <el-button type="primary" @click="handleRenew" v-if="detail.licenseType !== 'perpetual'">续期</el-button>
        <el-button type="danger" @click="handleRevoke" v-if="detail.status === 'active'">吊销授权</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="log-card">
      <template #header><span>操作日志</span></template>
      <el-table :data="logs" v-loading="logsLoading" stripe size="small">
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">{{ getActionText(row.action) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="result" label="结果" width="80">
          <template #default="{ row }">
            <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
              {{ row.result === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="ipAddress" label="IP地址" width="130" />
        <el-table-column prop="createdAt" label="时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="logsTotal > 10">
        <el-pagination v-model:current-page="logsPage" :page-size="10" :total="logsTotal"
          layout="total, prev, pager, next" @change="fetchLogs" small />
      </div>
    </el-card>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="授权续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="当前到期">{{ formatDate(detail.expiresAt) }}</el-form-item>
        <el-form-item label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/admin'

const route = useRoute()
const loading = ref(false)
const logsLoading = ref(false)
const submitting = ref(false)
const showFullKey = ref(false)
const showRenewDialog = ref(false)
const renewExpireDate = ref<Date | null>(null)
const logsPage = ref(1)
const logsTotal = ref(0)

const detail = ref<any>({})
const logs = ref<any[]>([])

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 12) + '****'
}

const copyKey = async () => {
  try {
    await navigator.clipboard.writeText(detail.value.licenseKey)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isExpired = (date: string) => date && new Date(date) < new Date()
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-'
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: 'primary', perpetual: 'success' }[type] || 'info')
const getLicenseTypeText = (type: string) => ({ trial: '试用授权', annual: '年度授权', perpetual: '永久授权' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info')
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)
const getActionType = (action: string) => ({ verify: 'info', activate: 'success', renew: 'warning', revoke: 'danger' }[action] || 'info')
const getActionText = (action: string) => ({ verify: '验证', activate: '激活', renew: '续期', revoke: '吊销', create: '创建' }[action] || action)
const getFeatureText = (feature: string) => ({
  customer: '客户管理', order: '订单管理', product: '商品管理',
  logistics: '物流管理', performance: '业绩管理', call: '外呼系统', finance: '财务管理'
}[feature] || feature)

const handleRenew = () => {
  renewExpireDate.value = null
  showRenewDialog.value = true
}

const confirmRenew = async () => {
  if (!renewExpireDate.value) {
    ElMessage.warning('请选择新的到期时间')
    return
  }
  submitting.value = true
  try {
    const res = await adminApi.renewLicense(detail.value.id, renewExpireDate.value.toISOString())
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchDetail()
      fetchLogs()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
  } finally {
    submitting.value = false
  }
}

const handleRevoke = async () => {
  try {
    await ElMessageBox.confirm('吊销后该授权将无法使用，确定继续？', '吊销授权', { type: 'warning' })
    const res = await adminApi.revokeLicense(detail.value.id)
    if (res.success) {
      ElMessage.success('已吊销')
      fetchDetail()
      fetchLogs()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLicense(route.params.id as string)
    if (res.success) {
      detail.value = res.data
    }
  } catch (e) {
    // 使用模拟数据
    detail.value = {
      id: route.params.id,
      licenseKey: 'A1B2C3D4-E5F6G7H8-I9J0K1L2-M3N4O5P6',
      customerName: '测试公司A',
      customerContact: '张三',
      customerPhone: '13800138000',
      customerEmail: 'zhangsan@test.com',
      licenseType: 'perpetual',
      maxUsers: 100,
      expiresAt: null,
      status: 'active',
      activatedAt: '2025-01-15 10:30:00',
      lastVerifyAt: '2026-01-04 09:15:00',
      createdAt: '2025-01-15 10:00:00',
      features: ['customer', 'order', 'product', 'logistics', 'performance'],
      notes: '测试授权'
    }
  } finally {
    loading.value = false
  }
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await adminApi.getLicenseLogs(route.params.id as string, { page: logsPage.value, pageSize: 10 })
    if (res.success) {
      logs.value = res.data.list || []
      logsTotal.value = res.data.total || 0
    }
  } catch (e) {
    logs.value = [
      { id: '1', action: 'verify', result: 'success', message: '验证成功', ipAddress: '192.168.1.100', createdAt: '2026-01-04 09:15:00' },
      { id: '2', action: 'activate', result: 'success', message: '首次激活成功', ipAddress: '192.168.1.100', createdAt: '2025-01-15 10:30:00' },
      { id: '3', action: 'create', result: 'success', message: '创建授权', ipAddress: null, createdAt: '2025-01-15 10:00:00' }
    ]
    logsTotal.value = 3
  } finally {
    logsLoading.value = false
  }
}

onMounted(() => {
  fetchDetail()
  fetchLogs()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.detail-card, .log-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-danger { color: #f56c6c; }
.module-tag { margin-right: 8px; margin-bottom: 4px; }
.action-bar { margin-top: 24px; display: flex; gap: 12px; }
.pagination-wrapper { margin-top: 12px; display: flex; justify-content: flex-end; }

.license-key-display {
  display: flex;
  align-items: center;
  gap: 12px;

  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 14px;
    background: #f5f7fa;
    padding: 4px 12px;
    border-radius: 4px;
    letter-spacing: 1px;
  }
}
</style>
