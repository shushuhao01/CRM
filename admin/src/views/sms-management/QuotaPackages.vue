<template>
  <div class="quota-packages">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>额度套餐</h2>
        <p class="header-desc">管理短信额度套餐和单条短信价格，创建的套餐将同步到CRM端和会员中心</p>
      </div>
      <el-button v-permission="'sms-management:quota-packages:edit'" type="primary" @click="showCreateDialog">
        <el-icon><Plus /></el-icon> 创建套餐
      </el-button>
    </div>

    <!-- 单条价格设置 -->
    <el-card class="price-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>💰 全局单条短信价格</span>
          <el-tag type="info" size="small">此价格仅用于展示参考，实际扣费以套餐价格为准</el-tag>
        </div>
      </template>
      <div class="price-row">
        <span class="price-label">单条短信价格：</span>
        <el-input-number
          v-model="unitPrice"
          :min="0.001"
          :max="10"
          :step="0.001"
          :precision="4"
          size="default"
          style="width: 180px"
        />
        <span class="price-unit">元/条</span>
        <el-button v-permission="'sms-management:quota-packages:edit'" type="primary" size="default" @click="saveUnitPrice" :loading="savingPrice">
          保存
        </el-button>
        <span v-if="priceLastSaved" class="price-saved-tip">✅ 已保存</span>
      </div>
    </el-card>

    <!-- 套餐列表 -->
    <el-card class="main-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-input v-model="keyword" placeholder="搜索套餐名称" clearable style="width: 200px" @keyup.enter="loadPackages">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-select v-model="filterEnabled" placeholder="全部状态" clearable style="width: 120px" @change="loadPackages">
            <el-option label="已启用" :value="1" />
            <el-option label="已禁用" :value="0" />
          </el-select>
          <el-button @click="loadPackages" :loading="loading">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>

      <el-table :data="packageList" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="name" label="套餐名称" min-width="140" />
        <el-table-column prop="smsCount" label="短信条数" width="120" align="center">
          <template #default="{ row }">
            <span class="count-text">{{ row.smsCount?.toLocaleString() }} 条</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="套餐价格" width="120" align="center">
          <template #default="{ row }">
            <span class="price-text">¥{{ Number(row.price).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unitPrice" label="折算单价" width="120" align="center">
          <template #default="{ row }">
            <span class="unit-price-text">¥{{ Number(row.unitPrice).toFixed(4) }}/条</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180" show-overflow-tooltip />
        <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
        <el-table-column prop="isEnabled" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">
              {{ row.isEnabled ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="160" align="center">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button v-permission="'sms-management:quota-packages:edit'" size="small" type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button v-permission="'sms-management:quota-packages:edit'" size="small" :type="row.isEnabled ? 'warning' : 'success'" link @click="handleToggle(row)">
              {{ row.isEnabled ? '禁用' : '启用' }}
            </el-button>
            <el-popconfirm title="确定删除该套餐？" @confirm="handleDelete(row)">
              <template #reference>
                <el-button v-permission="'sms-management:quota-packages:edit'" size="small" type="danger" link>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 订单记录 -->
    <el-card class="order-card" shadow="never" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>📋 短信额度订单记录</span>
          <div class="order-stats" v-if="orderStats.totalOrders">
            <el-tag type="primary" size="small">总订单: {{ orderStats.totalOrders }}</el-tag>
            <el-tag type="success" size="small">总收入: ¥{{ Number(orderStats.totalRevenue || 0).toFixed(2) }}</el-tag>
            <el-tag type="info" size="small">总售出: {{ Number(orderStats.totalSmsSold || 0).toLocaleString() }}条</el-tag>
            <el-tag type="warning" size="small" v-if="Number(orderStats.totalRefunded) > 0">退款: ¥{{ Number(orderStats.totalRefunded).toFixed(2) }}</el-tag>
          </div>
        </div>
      </template>

      <div class="toolbar" style="margin-bottom: 12px">
        <el-input v-model="orderSearch.keyword" placeholder="搜索订单号/租户/购买人" clearable style="width: 220px" @keyup.enter="handleOrderSearch">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-input v-model="orderSearch.tenantId" placeholder="搜索租户ID" clearable style="width: 180px" @keyup.enter="handleOrderSearch" />
        <el-select v-model="orderSearch.status" placeholder="全部状态" clearable style="width: 120px" @change="handleOrderSearch">
          <el-option label="待支付" value="pending" />
          <el-option label="已支付" value="paid" />
          <el-option label="已退款" value="refunded" />
          <el-option label="已关闭" value="closed" />
        </el-select>
        <el-date-picker
          v-model="orderDateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          style="width: 260px"
          @change="handleOrderSearch"
          clearable
        />
        <el-button @click="handleOrderSearch" :loading="ordersLoading">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </div>

      <el-table :data="orderList" v-loading="ordersLoading" stripe style="width: 100%" size="small">
        <el-table-column prop="orderNo" label="订单号" width="180" />
        <el-table-column label="租户" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.tenantName || '-' }}</div>
            <div style="font-size: 11px; color: #909399;">{{ row.tenantId || '-' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="packageName" label="套餐" width="120" />
        <el-table-column prop="smsCount" label="条数" width="90" align="center">
          <template #default="{ row }">{{ row.smsCount?.toLocaleString() }}</template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="100" align="center">
          <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column prop="payType" label="支付方式" width="100" align="center">
          <template #default="{ row }">
            {{ payTypeText(row.payType) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="buyerName" label="购买人" width="100" />
        <el-table-column prop="buyerSource" label="来源" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.buyerSource === 'member' ? 'warning' : 'primary'" size="small">
              {{ row.buyerSource === 'member' ? '会员中心' : 'CRM' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.paidAt || row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'paid'"
              v-permission="'sms-management:quota-packages:edit'"
              size="small"
              type="warning"
              link
              @click="handleRefundPreview(row)"
            >退款</el-button>
            <span v-else-if="row.status === 'refunded'" class="refund-info">
              已退¥{{ Number(row.refundAmount).toFixed(2) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="orderPage"
          v-model:page-size="orderPageSize"
          :total="orderTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadOrders"
          @current-change="loadOrders"
        />
      </div>
    </el-card>

    <!-- 创建/编辑套餐弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑套餐' : '创建套餐'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="套餐名称" prop="name">
          <el-input v-model="form.name" placeholder="如：基础包、标准包" maxlength="50" />
        </el-form-item>
        <el-form-item label="短信条数" prop="smsCount">
          <el-input-number v-model="form.smsCount" :min="1" :max="1000000" style="width: 100%" />
        </el-form-item>
        <el-form-item label="套餐价格" prop="price">
          <el-input-number v-model="form.price" :min="0.01" :max="999999" :precision="2" style="width: 100%" />
          <div class="form-tip" v-if="form.smsCount && form.price">
            折算单价：¥{{ (form.price / form.smsCount).toFixed(4) }}/条
          </div>
        </el-form-item>
        <el-form-item label="套餐描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="可选，简要说明套餐特点" maxlength="200" />
        </el-form-item>
        <el-form-item label="排序权重">
          <el-input-number v-model="form.sortOrder" :min="0" :max="999" style="width: 100%" />
          <div class="form-tip">数字越小排越前</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 退款预览弹窗 -->
    <el-dialog
      v-model="refundDialogVisible"
      title="退款确认"
      width="520px"
      :close-on-click-modal="false"
    >
      <div v-if="refundLoading" style="text-align: center; padding: 32px;">
        <el-icon class="is-loading" :size="24"><Refresh /></el-icon>
        <p style="color: #909399; margin-top: 8px;">加载退款信息中...</p>
      </div>
      <div v-else-if="refundPreview">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="订单号">{{ refundPreview.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="租户">{{ refundPreview.tenantName }}</el-descriptions-item>
          <el-descriptions-item label="套餐">{{ refundPreview.packageName }}</el-descriptions-item>
          <el-descriptions-item label="原始金额">¥{{ Number(refundPreview.originalAmount).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="原始条数">{{ refundPreview.originalSmsCount?.toLocaleString() }} 条</el-descriptions-item>
          <el-descriptions-item label="租户总额度">{{ refundPreview.totalQuota?.toLocaleString() }} 条</el-descriptions-item>
          <el-descriptions-item label="已使用">{{ refundPreview.usedQuota?.toLocaleString() }} 条</el-descriptions-item>
          <el-descriptions-item label="当前剩余">{{ refundPreview.remainingQuota?.toLocaleString() }} 条</el-descriptions-item>
        </el-descriptions>
        <el-divider />
        <div v-if="refundPreview.canRefund" style="text-align: center;">
          <div style="font-size: 14px; color: #606266; margin-bottom: 8px;">可退还条数</div>
          <div style="font-size: 28px; font-weight: 700; color: #e6a23c;">{{ refundPreview.refundableSmsCount?.toLocaleString() }} 条</div>
          <div style="font-size: 14px; color: #606266; margin-top: 8px;">退款金额</div>
          <div style="font-size: 24px; font-weight: 700; color: #f56c6c;">¥{{ Number(refundPreview.refundAmount).toFixed(2) }}</div>
          <el-input
            v-model="refundReason"
            type="textarea"
            :rows="2"
            placeholder="退款原因（选填）"
            style="margin-top: 16px;"
            maxlength="200"
          />
        </div>
        <div v-else style="text-align: center; color: #f56c6c; padding: 16px;">
          <el-icon :size="32"><WarningFilled /></el-icon>
          <p>额度已全部使用，无法退款</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button
          v-if="refundPreview?.canRefund"
          type="warning"
          @click="handleRefundConfirm"
          :loading="refunding"
        >确认退款 ¥{{ Number(refundPreview?.refundAmount || 0).toFixed(2) }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search, Refresh, WarningFilled } from '@element-plus/icons-vue'
import request from '@/api/request'

// ==================== 单价管理 ====================
const unitPrice = ref(0.045)
const savingPrice = ref(false)
const priceLastSaved = ref(false)

const loadUnitPrice = async () => {
  try {
    const res = await request.get('/sms-quota/unit-price')
    if (res.success) unitPrice.value = res.data?.unitPrice || 0.045
  } catch { /* ignore */ }
}

const saveUnitPrice = async () => {
  savingPrice.value = true
  priceLastSaved.value = false
  try {
    const res = await request.put('/sms-quota/unit-price', { unitPrice: unitPrice.value })
    if (res.success) {
      ElMessage.success('单价保存成功')
      priceLastSaved.value = true
      setTimeout(() => { priceLastSaved.value = false }, 3000)
    }
  } catch { ElMessage.error('保存失败') }
  finally { savingPrice.value = false }
}

// ==================== 套餐管理 ====================
const packageList = ref<any[]>([])
const loading = ref(false)
const keyword = ref('')
const filterEnabled = ref<number | string>('')

const loadPackages = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (keyword.value) params.keyword = keyword.value
    if (filterEnabled.value !== '') params.enabled = filterEnabled.value
    const res = await request.get('/sms-quota/packages', { params })
    if (res.success) packageList.value = res.data?.list || []
  } catch { ElMessage.error('加载套餐失败') }
  finally { loading.value = false }
}

// 创建/编辑
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingId = ref('')
const saving = ref(false)
const formRef = ref<any>(null)

const form = reactive({
  name: '',
  smsCount: 500,
  price: 25,
  description: '',
  sortOrder: 0
})

const formRules = {
  name: [{ required: true, message: '请输入套餐名称', trigger: 'blur' }],
  smsCount: [{ required: true, message: '请输入短信条数', trigger: 'blur' }],
  price: [{ required: true, message: '请输入套餐价格', trigger: 'blur' }]
}

const showCreateDialog = () => {
  isEditing.value = false
  editingId.value = ''
  form.name = ''
  form.smsCount = 500
  form.price = 25
  form.description = ''
  form.sortOrder = 0
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEditing.value = true
  editingId.value = row.id
  form.name = row.name
  form.smsCount = row.smsCount
  form.price = Number(row.price)
  form.description = row.description || ''
  form.sortOrder = row.sortOrder || 0
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!formRef.value) return
  await formRef.value.validate()
  saving.value = true
  try {
    let res
    if (isEditing.value) {
      res = await request.put(`/sms-quota/packages/${editingId.value}`, form)
    } else {
      res = await request.post('/sms-quota/packages', form)
    }
    if (res.success) {
      ElMessage.success(isEditing.value ? '保存成功' : '创建成功')
      dialogVisible.value = false
      loadPackages()
    }
  } catch { ElMessage.error('操作失败') }
  finally { saving.value = false }
}

const handleToggle = async (row: any) => {
  try {
    const res = await request.put(`/sms-quota/packages/${row.id}`, {
      isEnabled: row.isEnabled ? 0 : 1
    })
    if (res.success) {
      ElMessage.success(row.isEnabled ? '已禁用' : '已启用')
      loadPackages()
    }
  } catch { ElMessage.error('操作失败') }
}

const handleDelete = async (row: any) => {
  try {
    const res = await request.delete(`/sms-quota/packages/${row.id}`)
    if (res.success) {
      ElMessage.success('删除成功')
      loadPackages()
    }
  } catch { ElMessage.error('删除失败') }
}

// ==================== 订单记录 ====================
const orderList = ref<any[]>([])
const ordersLoading = ref(false)
const orderPage = ref(1)
const orderPageSize = ref(10)
const orderTotal = ref(0)
const orderStats = ref<any>({})
const orderSearch = reactive({ keyword: '', status: '', tenantId: '' })
const orderDateRange = ref<string[] | null>(null)

const handleOrderSearch = () => {
  orderPage.value = 1
  loadOrders()
}

const loadOrders = async () => {
  ordersLoading.value = true
  try {
    const params: any = { page: orderPage.value, pageSize: orderPageSize.value }
    if (orderSearch.keyword) {
      params.orderNo = orderSearch.keyword
      params.buyerName = orderSearch.keyword
    }
    if (orderSearch.status) params.status = orderSearch.status
    if (orderSearch.tenantId) params.tenantId = orderSearch.tenantId
    if (orderDateRange.value && orderDateRange.value.length === 2) {
      params.startDate = orderDateRange.value[0]
      params.endDate = orderDateRange.value[1]
    }
    const res = await request.get('/sms-quota/orders', { params })
    if (res.success) {
      orderList.value = res.data?.list || []
      orderTotal.value = res.data?.total || 0
      orderStats.value = res.data?.stats || {}
    }
  } catch { /* ignore */ }
  finally { ordersLoading.value = false }
}

// ==================== 退款预览 & 确认 ====================
const refundDialogVisible = ref(false)
const refundLoading = ref(false)
const refundPreview = ref<any>(null)
const refundReason = ref('')
const refunding = ref(false)
const refundOrderId = ref('')

const handleRefundPreview = async (row: any) => {
  refundOrderId.value = row.id
  refundPreview.value = null
  refundReason.value = ''
  refundDialogVisible.value = true
  refundLoading.value = true
  try {
    const res = await request.get(`/sms-quota/refund-preview/${row.id}`)
    if (res.success) {
      refundPreview.value = res.data
    } else {
      ElMessage.error(res.message || '获取退款信息失败')
      refundDialogVisible.value = false
    }
  } catch {
    ElMessage.error('获取退款信息失败')
    refundDialogVisible.value = false
  } finally {
    refundLoading.value = false
  }
}

const handleRefundConfirm = async () => {
  refunding.value = true
  try {
    const res = await request.post(`/sms-quota/refund/${refundOrderId.value}`, {
      reason: refundReason.value || '管理员退款'
    })
    if (res.success) {
      ElMessage.success(`退款成功: ¥${res.data?.refundAmount}, 退还${res.data?.refundSmsCount}条`)
      refundDialogVisible.value = false
      loadOrders()
    } else {
      ElMessage.error(res.message || '退款失败')
    }
  } catch { ElMessage.error('退款失败') }
  finally { refunding.value = false }
}

// 兼容旧函数（不再使用但保留以免其他地方引用）
const handleRefund = async (row: any) => {
  handleRefundPreview(row)
}

// ==================== 工具函数 ====================
const formatTime = (t: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const statusText = (s: string) => {
  const map: Record<string, string> = { pending: '待支付', paid: '已支付', refunded: '已退款', closed: '已关闭' }
  return map[s] || s
}

const statusTagType = (s: string) => {
  const map: Record<string, string> = { pending: 'warning', paid: 'success', refunded: 'info', closed: 'danger' }
  return map[s] || 'info'
}

const payTypeText = (s: string) => {
  const map: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '对公转账' }
  return map[s] || s || '-'
}

// ==================== 生命周期 ====================
onMounted(() => {
  loadUnitPrice()
  loadPackages()
  loadOrders()
})
</script>

<style scoped>
.quota-packages {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: 20px;
}

.header-desc {
  margin: 0;
  color: #909399;
  font-size: 13px;
}

.price-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-label {
  font-weight: 500;
  color: #303133;
}

.price-unit {
  color: #909399;
  font-size: 13px;
}

.price-saved-tip {
  color: #67c23a;
  font-size: 13px;
}

.main-card {
  margin-bottom: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  align-items: center;
}

.count-text {
  font-weight: 600;
  color: #409eff;
}

.price-text {
  font-weight: 600;
  color: #e6a23c;
}

.unit-price-text {
  font-size: 12px;
  color: #909399;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.order-stats {
  display: flex;
  gap: 8px;
}

.refund-info {
  font-size: 12px;
  color: #e6a23c;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}
</style>



