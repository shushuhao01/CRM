<template>
  <div class="my-cod-application-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon pending"><el-icon><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon approved"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.approved }}</div>
          <div class="stat-label">已通过</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon rejected"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.rejected }}</div>
          <div class="stat-label">已驳回</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon total"><el-icon><Document /></el-icon></div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总计</div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-input v-model="searchKeyword" placeholder="订单号/客户名称/手机号/客户编码" clearable class="filter-search" @clear="handleSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="statusFilter" placeholder="申请状态" clearable @change="handleSearch" class="filter-item">
        <el-option label="全部" value="all" />
        <el-option label="待审核" value="pending" />
        <el-option label="已通过" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <el-date-picker v-model="startDate" type="date" placeholder="开始日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleSearch" class="filter-date" />
      <span class="date-separator">至</span>
      <el-date-picker v-model="endDate" type="date" placeholder="结束日期" format="YYYY-MM-DD" value-format="YYYY-MM-DD" @change="handleSearch" class="filter-date" />
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="status-tabs">
          <el-tab-pane name="all" label="全部" />
          <el-tab-pane name="pending" label="待审核" />
          <el-tab-pane name="approved" label="已通过" />
          <el-tab-pane name="rejected" label="已驳回" />
        </el-tabs>
      </div>
      <div class="action-right">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        <el-button type="success" :icon="Plus" @click="showCreateDialog">发起申请</el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table :data="tableData" v-loading="loading" stripe border class="data-table">
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }"><el-link type="primary" @click="goToOrderDetail(row.orderId)">{{ row.orderNumber }}</el-link></template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户姓名" width="120">
        <template #default="{ row }">
          <el-link v-if="row.customerId" type="primary" @click="goToCustomerDetail(row.customerId)">{{ row.customerName || '-' }}</el-link>
          <span v-else>{{ row.customerName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="originalCodAmount" label="原代收金额" width="110" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.originalCodAmount) }}</template>
      </el-table-column>
      <el-table-column prop="modifiedCodAmount" label="修改后金额" width="110" align="right">
        <template #default="{ row }">¥{{ formatMoney(row.modifiedCodAmount) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="申请状态" width="100">
        <template #default="{ row }"><el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column prop="cancelReason" label="取消原因" min-width="200" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="申请时间" width="160">
        <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="reviewedAt" label="审核时间" width="160">
        <template #default="{ row }">{{ row.reviewedAt ? formatDateTime(row.reviewedAt) : '-' }}</template>
      </el-table-column>
      <el-table-column prop="reviewRemark" label="审核备注" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <span v-if="row.status === 'approved'">
            {{ row.reviewRemark ? `通过：${row.reviewRemark}` : '审核通过' }}
          </span>
          <span v-else>
            {{ row.reviewRemark || '-' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="showDetailDialog(row)">详情</el-button>
          <el-button v-if="row.status === 'pending'" type="warning" link size="small" @click="showEditDialog(row)">编辑</el-button>
          <el-button v-if="row.status === 'rejected'" type="warning" link size="small" @click="showEditDialog(row)">重新编辑</el-button>
          <el-button v-if="row.status === 'pending'" type="danger" link size="small" @click="handleWithdraw(row)">撤回</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50]" :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
    </div>

    <!-- 发起申请弹窗 -->
    <el-dialog v-model="createDialogVisible" :title="isEditMode ? '编辑代收取消申请' : '发起代收取消申请'" width="700px" :close-on-click-modal="false">
      <el-steps v-if="!isEditMode" :active="currentStep" finish-status="success" align-center style="margin-bottom: 30px;">
        <el-step title="选择订单" />
        <el-step title="填写信息" />
      </el-steps>

      <!-- 第一步：选择订单 -->
      <div v-if="currentStep === 0 && !isEditMode">
        <el-form label-width="100px">
          <el-form-item label="选择订单" required>
            <el-select
              v-model="selectedOrderId"
              filterable
              remote
              reserve-keyword
              placeholder="点击展开订单列表，或输入关键词搜索"
              :remote-method="handleOrderSearch"
              :loading="orderLoading"
              style="width: 100%"
              size="large"
              @change="handleOrderSelect"
              @focus="handleSelectFocus"
              clearable
              :popper-append-to-body="false"
              popper-class="order-select-dropdown"
            >
              <el-option
                v-for="order in availableOrders"
                :key="order.id"
                :label="`${order.orderNumber} - ${order.customerName} - ¥${formatMoney(order.codAmount)}`"
                :value="order.id"
              >
                <div class="order-option">
                  <div class="order-option-main">
                    <span class="order-number">{{ order.orderNumber }}</span>
                    <span class="customer-name">{{ order.customerName }}</span>
                    <span class="cod-amount">¥{{ formatMoney(order.codAmount) }}</span>
                  </div>
                  <div class="order-option-sub">
                    <span class="customer-phone">{{ order.customerPhone }}</span>
                    <span class="customer-id">编码: {{ order.customerId }}</span>
                    <el-tag :type="getOrderStatusTagType(order.status)" size="small">{{ getOrderStatusText(order.status) }}</el-tag>
                  </div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
          <el-alert v-if="!selectedOrderId && availableOrders.length === 0 && !orderLoading" title="暂无可申请的订单" type="info" :closable="false" style="margin-top: 16px;">
            <div>当前没有可申请取消代收的订单。订单需要满足以下条件：</div>
            <ul style="margin: 8px 0 0 20px; padding: 0;">
              <li>订单状态为：已发货（未签收）</li>
              <li>订单由您创建（或您是管理员）</li>
              <li>订单代收状态为待处理</li>
              <li>订单没有待审核的取消代收申请</li>
              <li>订单未被改代收或返款</li>
              <li>⚠️ 代收金额大于0（代收金额为0表示客户已全额付款）</li>
              <li>⚠️ 已签收和已完成的订单不支持改代收</li>
            </ul>
          </el-alert>
          <el-alert v-else-if="!selectedOrderId && availableOrders.length > 0" title="提示" type="warning" :closable="false" style="margin-top: 16px;">
            找到 {{ availableOrders.length }} 个可申请的订单，请从下拉列表中选择
          </el-alert>
          <el-alert v-else-if="selectedOrder" title="已选订单信息" type="success" :closable="false" style="margin-top: 16px;">
            <div class="selected-order-info">
              <div><strong>订单号：</strong>{{ selectedOrder.orderNumber }}</div>
              <div><strong>客户：</strong>{{ selectedOrder.customerName }} ({{ maskPhone(selectedOrder.customerPhone) }})</div>
              <div><strong>客户编码：</strong>{{ selectedOrder.customerId }}</div>
              <div><strong>原始代收金额：</strong><span style="color: #909399;">¥{{ formatMoney((selectedOrder.totalAmount || 0) - (selectedOrder.depositAmount || 0)) }}</span></div>
              <div><strong>当前代收金额：</strong><span style="color: #e6a23c; font-weight: 600;">¥{{ formatMoney(selectedOrder.codAmount) }}</span></div>
              <div v-if="hasModifiedCod(selectedOrder)" style="color: #f56c6c; font-size: 12px; margin-top: 4px;">
                ⚠️ 该订单已改代收，最多只能改为¥0.00
              </div>
              <div><strong>订单状态：</strong><el-tag :type="getOrderStatusTagType(selectedOrder.status)" size="small">{{ getOrderStatusText(selectedOrder.status) }}</el-tag></div>
            </div>
          </el-alert>
        </el-form>
      </div>

      <!-- 第二步：填写信息 -->
      <div v-if="currentStep === 1 || isEditMode">
        <el-form :model="createForm" label-width="120px">
          <el-form-item label="订单信息">
            <span>{{ selectedOrder?.orderNumber }} - {{ selectedOrder?.customerName }} ({{ maskPhone(selectedOrder?.customerPhone || '') }})</span>
          </el-form-item>
          <el-form-item label="原始代收金额">
            <span style="color: #909399;">¥{{ formatMoney((selectedOrder?.totalAmount || 0) - (selectedOrder?.depositAmount || 0)) }}</span>
          </el-form-item>
          <el-form-item label="当前代收金额">
            <span style="color: #e6a23c; font-weight: 600;">¥{{ formatMoney(selectedOrder?.codAmount || 0) }}</span>
            <span v-if="hasModifiedCod(selectedOrder)" style="color: #f56c6c; font-size: 12px; margin-left: 8px;">（已改代收）</span>
          </el-form-item>
          <el-form-item label="修改后金额" required>
            <el-input-number v-model="createForm.modifiedCodAmount" :min="0" :max="selectedOrder?.codAmount || 0" :precision="2" :step="10" style="width: 100%" />
            <div style="font-size: 12px; color: #909399; margin-top: 4px;">
              默认为0元，表示客户已全额付款。最多只能改为¥{{ formatMoney(selectedOrder?.codAmount || 0) }}
            </div>
          </el-form-item>
          <el-form-item label="取消原因" required>
            <el-input v-model="createForm.cancelReason" type="textarea" :rows="3" placeholder="请输入取消原因" maxlength="500" show-word-limit />
          </el-form-item>
          <el-form-item label="尾款凭证" required>
            <div class="upload-area">
              <div class="upload-container">
                <div class="upload-left">
                  <div class="upload-buttons">
                    <el-button type="primary" size="small" @click="triggerUpload">上传截图</el-button>
                    <el-button type="success" size="small" @click="handlePasteClick">粘贴图片</el-button>
                  </div>
                  <div class="upload-tips">支持粘贴图片（Ctrl+V）或点击上传，最多5张</div>
                </div>
                <div class="screenshot-thumbnails" v-if="createForm.paymentProof.length > 0">
                  <div v-for="(img, index) in createForm.paymentProof" :key="index" class="thumbnail-item" @click="previewImage(img)">
                    <img :src="img" alt="尾款凭证" />
                    <div class="thumbnail-delete" @click.stop="removeImage(index)">
                      <el-icon><Close /></el-icon>
                    </div>
                  </div>
                </div>
              </div>
              <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="handleFileUpload" />
            </div>
          </el-form-item>
        </el-form>
        <el-alert title="提示" type="warning" :closable="false" style="margin-top: 16px;">
          <ul style="margin: 0; padding-left: 20px;">
            <li>修改为0元表示客户已全额付款</li>
            <li>修改为部分金额表示客户部分付款</li>
            <li>请上传尾款凭证（转账截图、收款记录等）</li>
            <li>⚠️ 只有已发货（未签收）的订单才能改代收</li>
            <li>提交后将进入审核流程，审核通过后自动更新代收状态</li>
          </ul>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button v-if="currentStep === 0" type="primary" :disabled="!selectedOrderId" @click="nextStep">下一步</el-button>
        <el-button v-if="currentStep === 1 && !isEditMode" @click="prevStep">上一步</el-button>
        <el-button v-if="currentStep === 1" type="primary" @click="handleCreate" :loading="submitting">{{ isEditMode ? '保存修改' : '提交申请' }}</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailDialogVisible" title="申请详情" width="700px">
      <el-descriptions :column="2" border v-if="currentApplication">
        <el-descriptions-item label="申请状态" :span="2">
          <el-tag :type="getStatusType(currentApplication.status)" size="large">{{ getStatusText(currentApplication.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="订单号">{{ currentApplication.orderNumber }}</el-descriptions-item>
        <el-descriptions-item label="申请人">{{ currentApplication.applicantName }}</el-descriptions-item>
        <el-descriptions-item label="原代收金额">¥{{ formatMoney(currentApplication.originalCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="修改后金额">¥{{ formatMoney(currentApplication.modifiedCodAmount) }}</el-descriptions-item>
        <el-descriptions-item label="取消原因" :span="2">{{ currentApplication.cancelReason }}</el-descriptions-item>
        <el-descriptions-item label="尾款凭证" :span="2">
          <div class="proof-images">
            <el-image v-for="(img, index) in currentApplication.paymentProof" :key="index" :src="img" :preview-src-list="currentApplication.paymentProof" fit="cover" style="width: 100px; height: 100px; margin-right: 8px;" />
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">{{ formatDateTime(currentApplication.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="审核时间">{{ currentApplication.reviewedAt ? formatDateTime(currentApplication.reviewedAt) : '-' }}</el-descriptions-item>
        <el-descriptions-item v-if="currentApplication.reviewerName" label="审核人" :span="2">{{ currentApplication.reviewerName }}</el-descriptions-item>
        <el-descriptions-item v-if="currentApplication.status === 'approved' || currentApplication.reviewRemark" label="审核备注" :span="2">
          <span v-if="currentApplication.status === 'approved'">
            {{ currentApplication.reviewRemark ? `通过：${currentApplication.reviewRemark}` : '审核通过' }}
          </span>
          <span v-else>
            {{ currentApplication.reviewRemark }}
          </span>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Clock, CircleCheck, CircleClose, Document, Close } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/date'
import { getMyApplications, createApplication, updateApplication, cancelApplication, getApplicationStats, uploadProof, type CodApplication, type CodApplicationStats } from '@/api/codApplication'
import { getCodList, type CodOrder } from '@/api/codCollection'

defineOptions({ name: 'MyCodApplication' })

const router = useRouter()
const route = useRoute()
const stats = ref<CodApplicationStats>({ pending: 0, approved: 0, rejected: 0, total: 0 })
const searchKeyword = ref('')
const statusFilter = ref('all')
const startDate = ref('')
const endDate = ref('')
const activeTab = ref('all')
const loading = ref(false)
const tableData = ref<CodApplication[]>([])
const pagination = ref({ page: 1, pageSize: 10, total: 0 })
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentApplication = ref<CodApplication | null>(null)
const submitting = ref(false)
const currentStep = ref(0)
const selectedOrderId = ref('')
const orderSearchKeyword = ref('')
const orderLoading = ref(false)
const availableOrders = ref<CodOrder[]>([])
const selectedOrder = ref<CodOrder | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isEditMode = ref(false)
const editingApplicationId = ref('')
const createForm = ref({
  modifiedCodAmount: 0,
  cancelReason: '',
  paymentProof: [] as string[]
})

const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 11) return phone
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

// 判断订单是否改过代收
const hasModifiedCod = (order: any) => {
  if (!order) return false
  const originalCodAmount = (order.totalAmount || 0) - (order.depositAmount || 0)
  const currentCodAmount = order.codAmount || 0
  return currentCodAmount < originalCodAmount
}

// 🔥 监听修改后金额输入，超过最大值时自动重置
watch(() => createForm.value.modifiedCodAmount, (newAmount) => {
  if (selectedOrder.value) {
    const maxAmount = selectedOrder.value.codAmount || 0
    if (newAmount > maxAmount) {
      ElMessage.warning(`修改的金额不能大于当前代收金额¥${formatMoney(maxAmount)}，已自动重置`)
      createForm.value.modifiedCodAmount = maxAmount
    }
  }
})

const getStatusType = (status: string) => {
  const types: Record<string, any> = { pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'info' }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = { pending: '待审核', approved: '已通过', rejected: '已驳回', cancelled: '已取消' }
  return texts[status] || status
}

const getOrderStatusText = (status: string) => {
  const texts: Record<string, string> = { shipped: '已发货', delivered: '已签收', completed: '已完成' }
  return texts[status] || status
}

const getOrderStatusTagType = (status: string) => {
  const types: Record<string, any> = { shipped: 'warning', delivered: 'success', completed: 'info' }
  return types[status] || 'info'
}

const loadStats = async () => {
  try {
    const res = await getApplicationStats('my') as any
    if (res) stats.value = res
  } catch (e) {
    console.error(e)
  }
}

const loadData = async () => {
  loading.value = true
  try {
    const params: any = { page: pagination.value.page, pageSize: pagination.value.pageSize }
    if (activeTab.value !== 'all') params.status = activeTab.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    if (searchKeyword.value) params.keywords = searchKeyword.value
    const res = await getMyApplications(params) as any
    if (res) {
      tableData.value = res.list || []
      pagination.value.total = res.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const loadAvailableOrders = async (query?: string) => {
  orderLoading.value = true
  try {
    const userStore = useUserStore()
    const params: any = {
      page: 1,
      pageSize: 100,
      tab: 'pending'
    }

    // 根据用户角色设置权限过滤
    const role = userStore.currentUser?.role
    if (role === 'sales_staff') {
      // 成员只看自己创建的订单
      params.salesPersonId = userStore.currentUser?.id
    } else if (role === 'department_manager') {
      // 经理看本部门的订单
      params.departmentId = userStore.currentUser?.departmentId
    }
    // super_admin 和 admin 不设限，可以看所有订单

    if (query) params.keywords = query
    console.log('[订单加载] 请求参数:', params, '用户角色:', role)
    const res = await getCodList(params) as any
    if (res) {
      // 过滤掉已有待审核申请的订单
      const allOrders = res.list || []

      // 获取所有待审核的申请
      const pendingApps = await getMyApplications({ status: 'pending', pageSize: 1000 }) as any
      const pendingOrderIds = new Set((pendingApps?.list || []).map((app: any) => app.orderId))

      // 过滤订单：排除已有待审核申请的订单，以及已改代收或已返款的订单，以及已签收和已完成的订单
      availableOrders.value = allOrders.filter((order: any) => {
        // 如果订单已有待审核申请，不显示
        if (pendingOrderIds.has(order.id)) {
          return false
        }
        // 如果订单代收状态是已改代收或已返款，不显示
        if (order.codStatus === 'cancelled' || order.codStatus === 'returned') {
          return false
        }
        // 🔥 如果订单已签收或已完成，不显示（客户已经把钱给快递员了）
        if (order.status === 'delivered' || order.status === 'completed') {
          return false
        }
        // 🔥 如果代收金额为0，不显示（客户已全额付款）
        if (order.codAmount === 0) {
          return false
        }
        return true
      })

      console.log('[订单加载] 成功加载订单:', availableOrders.value.length, '个（已过滤待审核、已处理和已签收订单）')
    }
  } catch (e) {
    console.error('[订单加载] 失败:', e)
    availableOrders.value = []
  } finally {
    orderLoading.value = false
  }
}

const handleOrderSearch = (query: string) => {
  console.log('[订单搜索] 搜索关键词:', query)
  loadAvailableOrders(query)
}

const handleOrderSelect = () => {
  selectedOrder.value = availableOrders.value.find(o => o.id === selectedOrderId.value) || null
  console.log('[订单选择] 已选订单:', selectedOrder.value)
}

const handleSelectFocus = () => {
  // 当聚焦时，如果还没有加载订单，则加载
  if (availableOrders.value.length === 0 && !orderLoading.value) {
    console.log('[订单选择] 聚焦时加载订单')
    loadAvailableOrders('')
  }
}

const showCreateDialog = () => {
  isEditMode.value = false
  editingApplicationId.value = ''
  currentStep.value = 0
  selectedOrderId.value = ''
  selectedOrder.value = null
  orderSearchKeyword.value = ''
  availableOrders.value = []
  createForm.value = { modifiedCodAmount: 0, cancelReason: '', paymentProof: [] }
  createDialogVisible.value = true
  // 初始加载该成员的所有待处理订单
  loadAvailableOrders('')
}

const showEditDialog = async (row: CodApplication) => {
  isEditMode.value = true
  editingApplicationId.value = row.id
  currentStep.value = 1

  // 加载订单信息
  try {
    const userStore = useUserStore()
    const params: any = {
      page: 1,
      pageSize: 100,
      tab: 'pending'
    }
    const role = userStore.currentUser?.role
    if (role === 'sales_staff') {
      params.salesPersonId = userStore.currentUser?.id
    } else if (role === 'department_manager') {
      params.departmentId = userStore.currentUser?.departmentId
    }
    const res = await getCodList(params) as any
    if (res) {
      availableOrders.value = res.list || []
      selectedOrder.value = availableOrders.value.find(o => o.id === row.orderId) || null
      selectedOrderId.value = row.orderId
    }
  } catch (e) {
    console.error('[编辑申请] 加载订单失败:', e)
  }

  // 填充表单数据
  createForm.value = {
    modifiedCodAmount: row.modifiedCodAmount,
    cancelReason: row.cancelReason,
    paymentProof: Array.isArray(row.paymentProof) ? row.paymentProof : []
  }

  createDialogVisible.value = true
}

const nextStep = () => {
  if (!selectedOrder.value) {
    ElMessage.warning('请先选择订单')
    return
  }
  currentStep.value = 1
}

const handleSearch = () => { pagination.value.page = 1; loadData() }
const handleTabChange = () => { statusFilter.value = activeTab.value; handleSearch() }
const handleRefresh = () => { loadStats(); loadData() }
const handleSizeChange = (size: number) => { pagination.value.pageSize = size; pagination.value.page = 1; loadData() }
const handlePageChange = (page: number) => { pagination.value.page = page; loadData() }
const goToOrderDetail = (id: string) => router.push(`/order/detail/${id}`)
const goToCustomerDetail = (id: string) => router.push(`/customer/detail/${id}`)

const prevStep = () => { currentStep.value = 0 }

const triggerUpload = () => fileInput.value?.click()

const handlePasteClick = async () => {
  if (createForm.value.paymentProof.length >= 5) {
    ElMessage.warning('最多只能上传5张图片')
    return
  }

  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const file = new File([blob], 'pasted-image.png', { type })

          // 上传图片
          try {
            const res = await uploadProof(file) as any
            if (res?.url) {
              createForm.value.paymentProof.push(res.url)
              ElMessage.success('图片粘贴成功')
            } else {
              ElMessage.error('图片上传失败')
            }
          } catch (uploadErr: any) {
            ElMessage.error(uploadErr.message || '图片上传失败')
          }
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch (err: any) {
    console.error('粘贴失败:', err)
    ElMessage.error('粘贴失败，请使用Ctrl+V或手动上传')
  }
}

const previewImage = (url: string) => {
  // 创建预览容器
  const viewer = document.createElement('div')
  viewer.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;'

  // 创建关闭按钮
  const closeBtn = document.createElement('div')
  closeBtn.innerHTML = '✕'
  closeBtn.style.cssText = 'position:absolute;top:20px;right:20px;width:40px;height:40px;background:rgba(255,255,255,0.2);color:#fff;font-size:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;cursor:pointer;transition:all 0.3s;'
  closeBtn.onmouseover = () => {
    closeBtn.style.background = 'rgba(255,255,255,0.3)'
    closeBtn.style.transform = 'scale(1.1)'
  }
  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'rgba(255,255,255,0.2)'
    closeBtn.style.transform = 'scale(1)'
  }

  // 创建图片
  const img = new Image()
  img.src = url
  img.style.cssText = 'max-width:90%;max-height:90%;object-fit:contain;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,0.5);'

  // 关闭函数
  const closeViewer = () => {
    viewer.style.opacity = '0'
    setTimeout(() => {
      if (document.body.contains(viewer)) {
        document.body.removeChild(viewer)
      }
    }, 300)
  }

  // 绑定关闭事件
  closeBtn.onclick = closeViewer
  viewer.onclick = (e) => {
    if (e.target === viewer) closeViewer()
  }

  // 添加ESC键关闭
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeViewer()
      document.removeEventListener('keydown', handleEsc)
    }
  }
  document.addEventListener('keydown', handleEsc)

  // 组装并显示
  viewer.appendChild(img)
  viewer.appendChild(closeBtn)
  viewer.style.opacity = '0'
  document.body.appendChild(viewer)

  // 淡入动画
  setTimeout(() => {
    viewer.style.transition = 'opacity 0.3s'
    viewer.style.opacity = '1'
  }, 10)
}

const handleFileUpload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  if (!files) return

  for (let i = 0; i < files.length && createForm.value.paymentProof.length < 5; i++) {
    try {
      const res = await uploadProof(files[i]) as any
      if (res?.url) createForm.value.paymentProof.push(res.url)
    } catch (err: any) {
      ElMessage.error(err.message || '上传失败')
    }
  }

  if (fileInput.value) fileInput.value.value = ''
}

const handlePaste = async (e: ClipboardEvent) => {
  if (!createDialogVisible.value || currentStep.value !== 1) return

  const items = e.clipboardData?.items
  if (!items) return

  for (let i = 0; i < items.length && createForm.value.paymentProof.length < 5; i++) {
    if (items[i].type.indexOf('image') !== -1) {
      const file = items[i].getAsFile()
      if (file) {
        try {
          const res = await uploadProof(file) as any
          if (res?.url) createForm.value.paymentProof.push(res.url)
        } catch (err: any) {
          ElMessage.error(err.message || '上传失败')
        }
      }
    }
  }
}

const removeImage = (index: number) => createForm.value.paymentProof.splice(index, 1)

const handleCreate = async () => {
  if (!selectedOrder.value) return
  if (!createForm.value.cancelReason) {
    ElMessage.warning('请填写取消原因')
    return
  }
  if (createForm.value.paymentProof.length === 0) {
    ElMessage.warning('请上传尾款凭证')
    return
  }

  submitting.value = true
  try {
    if (isEditMode.value) {
      // 编辑模式：调用更新接口
      await updateApplication(editingApplicationId.value, {
        modifiedCodAmount: createForm.value.modifiedCodAmount,
        cancelReason: createForm.value.cancelReason,
        paymentProof: createForm.value.paymentProof
      })
      ElMessage.success('申请修改成功')
    } else {
      // 创建模式
      await createApplication({
        orderId: selectedOrder.value.id,
        modifiedCodAmount: createForm.value.modifiedCodAmount,
        cancelReason: createForm.value.cancelReason,
        paymentProof: createForm.value.paymentProof
      })
      ElMessage.success('申请提交成功，等待审核')
    }
    createDialogVisible.value = false
    loadStats()
    loadData()
  } catch (err: any) {
    ElMessage.error(err.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const showDetailDialog = (row: CodApplication) => {
  currentApplication.value = row
  detailDialogVisible.value = true
}

const handleWithdraw = async (row: CodApplication) => {
  try {
    await ElMessageBox.confirm('确定要撤回该申请吗？撤回后可以重新编辑提交。', '提示', { type: 'warning' })
    await cancelApplication(row.id)
    ElMessage.success('申请已撤回')
    loadStats()
    loadData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '撤回失败')
  }
}

onMounted(() => {
  loadStats()
  loadData()
  document.addEventListener('paste', handlePaste)

  // 检查是否从订单详情页跳转过来，需要自动填充订单
  checkAndAutoFill()
})

// 监听路由变化，支持页面已打开时的自动填充
watch(() => route.query, () => {
  checkAndAutoFill()
}, { deep: true })

// 检查并执行自动填充
const checkAndAutoFill = () => {
  const orderId = route.query.orderId as string
  const autoFill = route.query.autoFill as string
  if (orderId && autoFill === 'true') {
    // 自动打开创建弹窗并填充订单
    autoFillOrder(orderId)
  }
}

// 自动填充订单信息
const autoFillOrder = async (orderId: string) => {
  try {
    // 加载订单列表
    await loadAvailableOrders('')

    // 查找订单
    const order = availableOrders.value.find(o => o.id === orderId)
    if (!order) {
      ElMessage.warning('该订单不符合改代收条件或已有待审核申请')
      // 清除URL参数
      router.replace({ query: {} })
      return
    }

    // 自动选择订单并进入第二步
    selectedOrderId.value = orderId
    selectedOrder.value = order
    currentStep.value = 1
    createDialogVisible.value = true

    // 清除URL参数
    router.replace({ query: {} })
  } catch (e) {
    console.error('[自动填充订单] 失败:', e)
    ElMessage.error('加载订单信息失败')
  }
}

onUnmounted(() => {
  document.removeEventListener('paste', handlePaste)
})
</script>

<style scoped lang="scss">
.my-cod-application-page { padding: 20px; }
.stats-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 180px; background: #fff; border-radius: 8px; padding: 20px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;
  &.pending { background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%); color: #e6a23c; }
  &.approved { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); color: #67c23a; }
  &.rejected { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); color: #f56c6c; }
  &.total { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
}
.stat-info { .stat-value { font-size: 24px; font-weight: 600; color: #303133; } .stat-label { font-size: 13px; color: #909399; margin-top: 4px; } }
.filter-bar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; background: #fff; padding: 16px; border-radius: 8px; }
.filter-item { flex: 1; min-width: 100px; }
.filter-search { flex: 1; min-width: 120px; }
.filter-date { flex: 1; min-width: 120px; }
.date-separator { color: #909399; font-size: 13px; flex-shrink: 0; }
.action-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #fff; padding: 0 16px; border-radius: 8px; }
.action-left { .status-tabs { :deep(.el-tabs__header) { margin: 0; } :deep(.el-tabs__nav-wrap::after) { display: none; } } }
.action-right { display: flex; gap: 8px; }
.data-table { background: #fff; border-radius: 8px; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; }
.order-search { margin-bottom: 16px; }
.order-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.order-item { width: 100%; padding: 12px; border: 1px solid #dcdfe6; border-radius: 4px; margin: 0 !important;
  &:hover { background: #f5f7fa; }
  :deep(.el-radio__label) { width: 100%; }
}
.order-info { .order-number { font-weight: 600; margin-bottom: 4px; } .order-detail { font-size: 12px; color: #909399; } }
.order-option { width: 100%; }
.order-option-main { display: flex; align-items: center; gap: 12px; margin-bottom: 4px;
  .order-number { font-weight: 600; color: #303133; }
  .customer-name { color: #606266; }
  .cod-amount { color: #e6a23c; font-weight: 600; margin-left: auto; }
}
.order-option-sub { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #909399;
  .customer-phone { }
  .customer-id { }
}
.selected-order-info { line-height: 1.8; font-size: 14px;
  > div { margin-bottom: 4px; }
}
.upload-area {
  width: 100%;

  .upload-container {
    display: flex;
    align-items: flex-start;
    gap: 16px;
  }

  .upload-left {
    flex-shrink: 0;
  }

  .upload-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .upload-tips {
    font-size: 12px;
    color: #909399;
  }
}

.screenshot-thumbnails {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}
.thumbnail-item { position: relative; width: 80px; height: 80px; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden; cursor: pointer;
  img { width: 100%; height: 100%; object-fit: cover; }
  .thumbnail-delete { position: absolute; top: 2px; right: 2px; width: 20px; height: 20px; background: rgba(0,0,0,0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;
    &:hover { background: rgba(0,0,0,0.8); }
    .el-icon { color: #fff; font-size: 12px; }
  }
  &:hover { border-color: #409eff; }
}
.image-list { display: flex; gap: 8px; flex-wrap: wrap; }
.image-item { position: relative; width: 100px; height: 100px; border: 1px solid #dcdfe6; border-radius: 4px; overflow: hidden;
  .image-actions { position: absolute; top: 0; right: 0; background: rgba(0,0,0,0.5); padding: 4px; cursor: pointer;
    .delete-icon { color: #fff; font-size: 16px; }
  }
}
.upload-btn { width: 100px; height: 100px; border: 1px dashed #dcdfe6; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; color: #909399;
  &:hover { border-color: #409eff; color: #409eff; }
}
.proof-images { display: flex; gap: 8px; flex-wrap: wrap; }
:deep(.order-select-dropdown) {
  max-height: 300px !important;
  .el-select-dropdown__list { max-height: 280px !important; }
}
</style>
""
