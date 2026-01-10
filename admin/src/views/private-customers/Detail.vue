<template>
  <div class="page-container">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">私有客户详情</span>
      </template>
    </el-page-header>

    <el-card shadow="never" class="info-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-button type="primary" @click="handleEdit">编辑</el-button>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="客户名称">{{ detail.customerName }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="1">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>授权信息</span>
          <div>
            <el-button v-if="detail.status === 'active'" type="warning" @click="handleRenew">续期</el-button>
            <el-button v-if="detail.status === 'active'" type="danger" @click="handleRevoke">吊销</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="授权码">
          <div class="license-key-cell">
            <code>{{ showFullKey ? detail.licenseKey : maskKey(detail.licenseKey) }}</code>
            <el-button link size="small" @click="showFullKey = !showFullKey">
              {{ showFullKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button link size="small" @click="copyKey(detail.licenseKey)">复制</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="授权类型">
          <el-tag :type="getLicenseTypeTag(detail.licenseType)" size="small">
            {{ getLicenseTypeText(detail.licenseType) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)" size="small">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最大用户数">{{ detail.maxUsers }}</el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <span :class="{ 'text-danger': isExpired(detail.expiresAt) }">
            {{ detail.licenseType === 'perpetual' ? '永久' : formatDate(detail.expiresAt) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="激活时间">{{ detail.activatedAt ? formatDateTime(detail.activatedAt) : '未激活' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>功能模块</template>
      <div class="modules-list">
        <el-tag v-for="m in detail.modules" :key="m" class="module-tag">{{ getModuleName(m) }}</el-tag>
        <span v-if="!detail.modules?.length" class="text-muted">未配置</span>
      </div>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>激活记录</template>
      <el-table :data="activationLogs" stripe>
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag :type="row.action === 'activate' ? 'success' : 'info'" size="small">
              {{ row.action === 'activate' ? '激活' : row.action === 'renew' ? '续期' : row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="ip" label="IP地址" width="150" />
        <el-table-column prop="machineId" label="机器标识" min-width="200" />
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>账单记录</template>
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
    </el-card>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="授权续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="当前到期">
          {{ detail.licenseType === 'perpetual' ? '永久' : formatDate(detail.expiresAt) }}
        </el-form-item>
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
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '@/api/admin'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const showFullKey = ref(false)
const showRenewDialog = ref(false)
const renewExpireDate = ref<Date | null>(null)

const detail = ref<any>({})
const activationLogs = ref<any[]>([])
const bills = ref<any[]>([])
const billsPage = ref(1)
const billsTotal = ref(0)
const billsLoading = ref(false)

const moduleMap: Record<string, string> = {
  order: '订单管理', customer: '客户管理', logistics: '物流管理',
  finance: '财务管理', performance: '绩效管理', call: '电销外呼'
}

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 12) + '****'
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
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-'
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'
const getModuleName = (key: string) => moduleMap[key] || key

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: 'primary', perpetual: 'success' }[type] || 'info')
const getLicenseTypeText = (type: string) => ({ trial: '试用', annual: '年度', perpetual: '永久' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info')
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)
const getBillStatusType = (s: string) => ({ pending: 'warning', paid: 'success', expired: 'info', refunded: 'danger', closed: 'info' }[s] || 'info')
const getBillStatusText = (s: string) => ({ pending: '待支付', paid: '已支付', expired: '已过期', refunded: '已退款', closed: '已关闭' }[s] || s)

const handleEdit = () => {
  // 跳转到列表页并打开编辑弹窗，或者在这里实现编辑功能
  ElMessage.info('请在列表页面进行编辑')
  router.push('/private-customers/list')
}

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
    const res = await adminApi.renewLicense(route.params.id as string, renewExpireDate.value.toISOString())
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
  } finally {
    submitting.value = false
  }
}

const handleRevoke = async () => {
  try {
    await ElMessageBox.confirm(`确定要吊销该客户的授权吗？吊销后该授权将无法使用。`, '吊销授权', { type: 'warning' })
    const res = await adminApi.revokeLicense(route.params.id as string)
    if (res.success) {
      ElMessage.success('已吊销')
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLicenseDetail(route.params.id as string)
    if (res.success) {
      detail.value = res.data
      activationLogs.value = res.data.logs || []
    }
  } catch (e) {
    // 模拟数据
    detail.value = {
      id: route.params.id,
      licenseKey: 'A1B2C3D4-E5F6G7H8-I9J0K1L2-M3N4O5P6',
      customerName: '北京科技有限公司',
      contact: '张经理',
      phone: '13800138001',
      email: 'zhang@example.com',
      licenseType: 'perpetual',
      maxUsers: 100,
      expiresAt: null,
      status: 'active',
      activatedAt: '2025-01-15T10:30:00',
      createdAt: '2025-01-10T09:00:00',
      modules: ['order', 'customer', 'logistics', 'finance'],
      remark: '重要客户'
    }
    activationLogs.value = [
      { action: 'activate', ip: '192.168.1.100', machineId: 'MACHINE-ABC123', createdAt: '2025-01-15T10:30:00' }
    ]
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDetail()
  fetchBills()
})

const fetchBills = async () => {
  billsLoading.value = true
  try {
    const res = await adminApi.getLicenseBills(route.params.id as string, { page: billsPage.value, pageSize: 10 })
    if (res.success) {
      bills.value = res.data.list || []
      billsTotal.value = res.data.total || 0
    }
  } catch (e) {
    // 模拟数据
    bills.value = [
      { id: '1', order_no: 'PAY202601050002', package_name: '永久版', amount: '19800.00', pay_type: 'alipay', status: 'paid', paid_at: '2025-01-10 14:30:00', created_at: '2025-01-10 14:20:00' }
    ]
    billsTotal.value = 1
  } finally {
    billsLoading.value = false
  }
}
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; }
.info-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-danger { color: #f56c6c; }
.text-muted { color: #909399; }

.license-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    background: #f5f7fa;
    padding: 4px 8px;
    border-radius: 4px;
  }
}

.modules-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  .module-tag { font-size: 13px; }
}

.text-primary { color: #409eff; font-weight: 500; }

.pagination-wrapper {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
</style>
