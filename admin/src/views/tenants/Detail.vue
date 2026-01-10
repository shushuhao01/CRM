<template>
  <div class="page-container">
    <el-card shadow="never" class="detail-card">
      <template #header>
        <div class="card-header">
          <span>租户详情</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleEdit">编辑</el-button>
            <el-button @click="$router.back()">返回</el-button>
          </div>
        </div>
      </template>

      <el-descriptions :column="2" border v-loading="loading">
        <el-descriptions-item label="租户名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="租户编码">{{ detail.code }}</el-descriptions-item>
        <el-descriptions-item label="授权码" :span="2">
          <div class="license-key-display">
            <span class="key">{{ showFullKey ? detail.license_key : maskKey(detail.license_key) }}</span>
            <el-button link type="primary" size="small" @click="showFullKey = !showFullKey">
              {{ showFullKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button link type="primary" size="small" @click="copyKey(detail.license_key)">复制</el-button>
            <el-button link type="warning" size="small" @click="handleRegenerate">重新生成</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="授权状态">
          <el-tag :type="getLicenseStatusType(detail.license_status)">
            {{ getLicenseStatusText(detail.license_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="套餐">
          <el-tag :type="getPackageType(detail.package_name)">{{ detail.package_name || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户数">{{ detail.user_count || 0 }} / {{ detail.max_users }}</el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <span :class="{ 'text-danger': isExpired(detail.expire_date) }">
            {{ detail.expire_date || '永久' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail.status === 'active' ? 'success' : 'danger'">
            {{ detail.status === 'active' ? '正常' : '已禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">{{ detail.activated_at || '未激活' }}</el-descriptions-item>
        <el-descriptions-item label="最后验证">{{ detail.last_verify_at || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ detail.created_at }}</el-descriptions-item>
        <el-descriptions-item label="数据库">{{ detail.database_name || '共享数据库' }}</el-descriptions-item>
      </el-descriptions>

      <el-divider />

      <h4>资源使用情况</h4>
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">存储空间</div>
            <el-progress :percentage="storagePercent" :stroke-width="10" />
            <div class="stat-value">{{ usedStorage }} / {{ totalStorage }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">用户数量</div>
            <el-progress :percentage="userPercent" :stroke-width="10" status="success" />
            <div class="stat-value">{{ detail.user_count || 0 }} / {{ detail.max_users }}</div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-item">
            <div class="stat-label">API调用</div>
            <el-progress :percentage="apiPercent" :stroke-width="10" status="warning" />
            <div class="stat-value">{{ apiCalls }} / {{ apiLimit }} 次/月</div>
          </div>
        </el-col>
      </el-row>

      <el-divider />

      <h4>账单记录</h4>
      <el-table :data="bills" v-loading="billsLoading" stripe size="small">
        <el-table-column prop="order_no" label="订单号" width="180" />
        <el-table-column prop="package_name" label="套餐" width="120" />
        <el-table-column prop="amount" label="金额" width="100">
          <template #default="{ row }">
            <span class="text-primary">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pay_type" label="支付方式" width="100">
          <template #default="{ row }">
            {{ row.pay_type === 'wechat' ? '微信' : row.pay_type === 'alipay' ? '支付宝' : row.pay_type || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getBillStatusType(row.status)" size="small">{{ getBillStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paid_at" label="支付时间" width="160" />
        <el-table-column prop="created_at" label="创建时间" width="160" />
      </el-table>
      <div class="pagination-wrapper" v-if="billsTotal > 10">
        <el-pagination v-model:current-page="billsPage" :page-size="10" :total="billsTotal"
          layout="total, prev, pager, next" @change="fetchBills" small />
      </div>
      <el-empty v-if="!billsLoading && bills.length === 0" description="暂无账单记录" :image-size="60" />

      <el-divider />

      <h4>授权操作日志</h4>
      <el-table :data="logs" v-loading="logsLoading" stripe size="small">
        <el-table-column prop="action" label="操作" width="120">
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
        <el-table-column prop="ip_address" label="IP地址" width="130" />
        <el-table-column prop="operator_name" label="操作人" width="100" />
        <el-table-column prop="created_at" label="时间" width="160" />
      </el-table>
      <div class="pagination-wrapper" v-if="logsTotal > 10">
        <el-pagination v-model:current-page="logsPage" :page-size="10" :total="logsTotal"
          layout="total, prev, pager, next" @change="fetchLogs" small />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const logsLoading = ref(false)
const billsLoading = ref(false)
const showFullKey = ref(false)
const detail = ref<any>({})
const logs = ref<any[]>([])
const logsPage = ref(1)
const logsTotal = ref(0)
const bills = ref<any[]>([])
const billsPage = ref(1)
const billsTotal = ref(0)

const usedStorage = ref('6.5GB')
const totalStorage = ref('10GB')
const storagePercent = ref(65)
const userPercent = computed(() => Math.round((detail.value.user_count || 0) / (detail.value.max_users || 1) * 100))
const apiCalls = ref(3000)
const apiLimit = ref(10000)
const apiPercent = ref(30)

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length < 3) return key.substring(0, 8) + '****'
  return `${parts[0]}-${parts[1]}-****-****`
}

const copyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isExpired = (date: string) => date && new Date(date) < new Date()

const getPackageType = (p: string) => {
  const map: Record<string, string> = { '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }
  return map[p] || 'info'
}
const getLicenseStatusType = (s: string) => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}
const getLicenseStatusText = (s: string) => {
  const map: Record<string, string> = { active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }
  return map[s] || s
}
const getActionType = (a: string) => {
  const map: Record<string, string> = { generate: 'primary', activate: 'success', verify: 'info', renew: 'warning', suspend: 'danger', resume: 'success' }
  return map[a] || 'info'
}
const getActionText = (a: string) => {
  const map: Record<string, string> = { generate: '生成授权码', activate: '激活', verify: '验证', renew: '续期', suspend: '暂停', resume: '恢复', revoke: '吊销' }
  return map[a] || a
}
const getBillStatusType = (s: string) => {
  const map: Record<string, string> = { pending: 'warning', paid: 'success', expired: 'info', refunded: 'danger', closed: 'info' }
  return map[s] || 'info'
}
const getBillStatusText = (s: string) => {
  const map: Record<string, string> = { pending: '待支付', paid: '已支付', expired: '已过期', refunded: '已退款', closed: '已关闭' }
  return map[s] || s
}

const handleEdit = () => {
  router.push(`/tenants/edit/${route.params.id}`)
}

const handleRegenerate = () => {
  ElMessageBox.confirm('重新生成授权码后，原授权码将失效，租户需要使用新授权码登录。确定继续？', '重新生成授权码', { type: 'warning' })
    .then(async () => {
      try {
        const res = await request.post(`/admin/tenants/${route.params.id}/regenerate-license`)
        if (res.success) {
          ElMessage.success('授权码已重新生成')
          detail.value.license_key = res.data.licenseKey
          detail.value.license_status = 'pending'
          fetchLogs()
        }
      } catch (e) {
        ElMessage.error('操作失败')
      }
    })
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/admin/tenants/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
    }
  } catch (e) {
    detail.value = {
      id: route.params.id,
      name: '测试公司A',
      code: 'TESTA',
      license_key: 'TENANT-A1B2-C3D4-E5F6-G7H8',
      license_status: 'active',
      package_name: '企业版',
      status: 'active',
      user_count: 45,
      max_users: 100,
      expire_date: '2026-12-31',
      contact: '张三',
      phone: '13800138000',
      email: 'zhangsan@test.com',
      activated_at: '2025-01-15 10:30:00',
      last_verify_at: '2026-01-04 09:15:00',
      created_at: '2025-01-15 10:00:00',
      database_name: null
    }
  } finally {
    loading.value = false
  }
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await request.get(`/admin/tenants/${route.params.id}/logs`, {
      params: { page: logsPage.value, pageSize: 10 }
    })
    if (res.success) {
      logs.value = res.data.list || []
      logsTotal.value = res.data.total || 0
    }
  } catch (e) {
    logs.value = [
      { id: '1', action: 'verify', result: 'success', message: '验证成功', ip_address: '192.168.1.100', operator_name: null, created_at: '2026-01-04 09:15:00' },
      { id: '2', action: 'activate', result: 'success', message: '首次激活成功', ip_address: '192.168.1.100', operator_name: null, created_at: '2025-01-15 10:30:00' },
      { id: '3', action: 'generate', result: 'success', message: '创建租户并生成授权码', ip_address: null, operator_name: 'admin', created_at: '2025-01-15 10:00:00' }
    ]
    logsTotal.value = 3
  } finally {
    logsLoading.value = false
  }
}

const fetchBills = async () => {
  billsLoading.value = true
  try {
    const res = await request.get(`/admin/tenants/${route.params.id}/bills`, {
      params: { page: billsPage.value, pageSize: 10 }
    })
    if (res.success) {
      bills.value = res.data.list || []
      billsTotal.value = res.data.total || 0
    }
  } catch (e) {
    bills.value = [
      { id: '1', order_no: 'PAY202601050001', package_name: '企业版', amount: '599.00', pay_type: 'wechat', status: 'paid', paid_at: '2026-01-05 10:30:00', created_at: '2026-01-05 10:25:00' },
      { id: '2', order_no: 'PAY202512010001', package_name: '企业版', amount: '599.00', pay_type: 'alipay', status: 'paid', paid_at: '2025-12-01 09:15:00', created_at: '2025-12-01 09:10:00' }
    ]
    billsTotal.value = 2
  } finally {
    billsLoading.value = false
  }
}

onMounted(() => {
  fetchDetail()
  fetchLogs()
  fetchBills()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.detail-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
h4 { margin: 0 0 16px; color: #303133; }
.text-danger { color: #f56c6c; }

.license-key-display {
  display: flex;
  align-items: center;
  gap: 12px;
  .key {
    font-family: monospace;
    font-size: 14px;
    background: #f5f7fa;
    padding: 4px 12px;
    border-radius: 4px;
    letter-spacing: 1px;
  }
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  .stat-label { font-size: 14px; color: #909399; margin-bottom: 12px; }
  .stat-value { font-size: 12px; color: #606266; margin-top: 8px; }
}

.pagination-wrapper {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.text-primary { color: #409eff; font-weight: 500; }
</style>
