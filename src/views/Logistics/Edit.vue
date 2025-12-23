<template>
  <div class="logistics-edit">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>{{ isEdit ? '编辑物流' : '新增物流' }}</h2>
          <div class="header-meta" v-if="isEdit">
            <span class="tracking-no">{{ form.trackingNo }}</span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="goBack">取消</el-button>
        <el-button @click="handleSave" type="primary" :loading="saveLoading">
          保存
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧表单 -->
      <el-col :span="16">
        <!-- 基本信息 -->
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>

          <el-form
            ref="basicFormRef"
            :model="form"
            :rules="formRules"
            label-width="120px"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="关联订单" prop="orderNo">
                  <el-select
                    v-model="form.orderNo"
                    placeholder="请选择订单"
                    filterable
                    remote
                    :remote-method="searchOrders"
                    :loading="orderLoading"
                    style="width: 100%"
                    @change="handleOrderChange"
                  >
                    <el-option
                      v-for="order in orderOptions"
                      :key="order.orderNo"
                      :label="`${order.orderNo} - ${order.customerName}`"
                      :value="order.orderNo"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="物流公司" prop="company">
                  <el-select
                    v-model="form.company"
                    placeholder="请选择物流公司"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="company in logisticsCompanies"
                      :key="company.code"
                      :label="company.name"
                      :value="company.code"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="物流单号" prop="trackingNo">
                  <el-input
                    v-model="form.trackingNo"
                    placeholder="请输入物流单号"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="物流状态" prop="status">
                  <el-select
                    v-model="form.status"
                    placeholder="请选择状态"
                    style="width: 100%"
                    :disabled="!canEditLogisticsStatus"
                  >
                    <!-- 🔥 去掉待发货选项，物流编辑页面只显示已发货之后的状态 -->
                    <el-option label="已揽收" value="picked_up" />
                    <el-option label="运输中" value="in_transit" />
                    <el-option label="派送中" value="delivering" />
                    <el-option label="已签收" value="delivered" />
                    <el-option label="异常" value="exception" />
                  </el-select>
                  <!-- 🔥 物流状态编辑权限提示 -->
                  <div v-if="!canEditLogisticsStatus" class="status-tip">
                    <el-text type="warning" size="small">
                      {{ logisticsStatusDisabledReason }}
                    </el-text>
                  </div>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="发货时间" prop="shipTime">
                  <el-date-picker
                    v-model="form.shipTime"
                    type="datetime"
                    placeholder="选择发货时间"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="预计送达" prop="estimatedTime">
                  <el-date-picker
                    v-model="form.estimatedTime"
                    type="datetime"
                    placeholder="选择预计送达时间"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="运费" prop="freight">
                  <el-input-number
                    v-model="form.freight"
                    :min="0"
                    :precision="2"
                    placeholder="请输入运费"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="保价费" prop="insuranceFee">
                  <el-input-number
                    v-model="form.insuranceFee"
                    :min="0"
                    :precision="2"
                    placeholder="请输入保价费"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 收货信息 -->
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span>收货信息</span>
              <el-button
                @click="copyFromOrder"
                size="small"
                :disabled="!form.orderNo"
              >
                从订单复制
              </el-button>
            </div>
          </template>

          <el-form
            ref="receiverFormRef"
            :model="receiverForm"
            :rules="receiverFormRules"
            label-width="120px"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="收货人" prop="receiverName">
                  <el-input
                    v-model="receiverForm.receiverName"
                    placeholder="请输入收货人姓名"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话" prop="receiverPhone">
                  <el-input
                    v-model="receiverForm.receiverPhone"
                    placeholder="请输入联系电话"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="收货地址" prop="receiverAddress">
              <el-input
                v-model="receiverForm.receiverAddress"
                type="textarea"
                :rows="2"
                placeholder="请输入详细收货地址"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 商品信息 -->
        <el-card class="form-card">
          <template #header>
            <div class="card-header">
              <span>商品信息</span>
              <el-button
                @click="loadOrderProducts"
                size="small"
                :disabled="!form.orderNo"
                :loading="productLoading"
              >
                加载订单商品
              </el-button>
            </div>
          </template>

          <el-table :data="productList" style="width: 100%">
            <el-table-column prop="productName" label="商品名称" />
            <el-table-column prop="specification" label="规格" width="120" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="重量(kg)" width="120">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.weight"
                  :min="0"
                  :precision="2"
                  size="small"
                  style="width: 100%"
                  @change="calculateTotals"
                />
              </template>
            </el-table-column>
            <el-table-column label="体积(cm³)" width="120">
              <template #default="{ row, $index }">
                <el-input-number
                  v-model="row.volume"
                  :min="0"
                  size="small"
                  style="width: 100%"
                  @change="calculateTotals"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80">
              <template #default="{ row, $index }">
                <el-button
                  @click="removeProduct($index)"
                  type="danger"
                  link
                  size="small"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="product-actions">
            <el-button @click="addProduct" :icon="Plus" size="small">
              添加商品
            </el-button>
          </div>

          <div class="product-summary">
            <div class="summary-item">
              <span class="label">总数量：</span>
              <span class="value">{{ totalQuantity }} 件</span>
            </div>
            <div class="summary-item">
              <span class="label">总重量：</span>
              <span class="value">{{ totalWeight }} kg</span>
            </div>
            <div class="summary-item">
              <span class="label">总体积：</span>
              <span class="value">{{ totalVolume }} cm³</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧信息 -->
      <el-col :span="8">
        <!-- 订单信息 -->
        <el-card class="info-card" v-if="selectedOrder">
          <template #header>
            <div class="card-header">
              <span>订单信息</span>
            </div>
          </template>

          <div class="order-info">
            <div class="info-item">
              <span class="label">订单号：</span>
              <span class="value">{{ selectedOrder.orderNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">客户：</span>
              <span class="value">{{ selectedOrder.customerName }}</span>
            </div>
            <div class="info-item">
              <span class="label">下单时间：</span>
              <span class="value">{{ selectedOrder.orderTime }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单金额：</span>
              <span class="value">¥{{ selectedOrder.totalAmount }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单状态：</span>
              <el-tag :type="getOrderStatusColor(selectedOrder.status)" size="small">
                {{ getOrderStatusText(selectedOrder.status) }}
              </el-tag>
            </div>
          </div>
        </el-card>

        <!-- 费用计算 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>费用计算</span>
            </div>
          </template>

          <div class="fee-calculation">
            <div class="fee-item">
              <span class="label">基础运费：</span>
              <span class="value">¥{{ form.freight || '0.00' }}</span>
            </div>
            <div class="fee-item">
              <span class="label">保价费：</span>
              <span class="value">¥{{ form.insuranceFee || '0.00' }}</span>
            </div>
            <div class="fee-item">
              <span class="label">重量费用：</span>
              <span class="value">¥{{ weightFee }}</span>
            </div>
            <div class="fee-item">
              <span class="label">体积费用：</span>
              <span class="value">¥{{ volumeFee }}</span>
            </div>
            <el-divider />
            <div class="fee-item total">
              <span class="label">总费用：</span>
              <span class="value">¥{{ totalFee }}</span>
            </div>
          </div>

          <div class="fee-actions">
            <el-button @click="calculateFee" type="primary" size="small" style="width: 100%">
              重新计算费用
            </el-button>
          </div>
        </el-card>

        <!-- 操作提示 -->
        <el-card class="tips-card">
          <template #header>
            <div class="card-header">
              <span>操作提示</span>
            </div>
          </template>

          <div class="tips-content">
            <el-alert
              title="填写提示"
              type="info"
              :closable="false"
              show-icon
            >
              <ul class="tips-list">
                <li>请先选择关联订单，系统会自动填充收货信息</li>
                <li>物流单号必须与物流公司系统一致</li>
                <li>重量和体积会影响运费计算</li>
                <li>发货时间不能早于订单时间</li>
                <li>保存后可在列表页面进行跟踪</li>
              </ul>
            </el-alert>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加商品对话框 -->
    <el-dialog
      v-model="productDialogVisible"
      title="添加商品"
      width="600px"
      :before-close="handleProductDialogClose"
    >
      <el-form
        ref="productFormRef"
        :model="productForm"
        :rules="productFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称" prop="productName">
          <el-input
            v-model="productForm.productName"
            placeholder="请输入商品名称"
          />
        </el-form-item>
        <el-form-item label="规格" prop="specification">
          <el-input
            v-model="productForm.specification"
            placeholder="请输入商品规格"
          />
        </el-form-item>
        <el-form-item label="数量" prop="quantity">
          <el-input-number
            v-model="productForm.quantity"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="重量(kg)" prop="weight">
          <el-input-number
            v-model="productForm.weight"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="体积(cm³)" prop="volume">
          <el-input-number
            v-model="productForm.volume"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleProductDialogClose">取消</el-button>
          <el-button @click="confirmAddProduct" type="primary">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import { useOrderStore } from '@/stores/order'
import {
  ArrowLeft,
  Plus
} from '@element-plus/icons-vue'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const orderStore = useOrderStore()

// 响应式数据
const saveLoading = ref(false)
const orderLoading = ref(false)
const productLoading = ref(false)
const productDialogVisible = ref(false)
const isEdit = ref(false)

// 超时ID跟踪
const timeoutIds = new Set<number>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 表单数据
const form = reactive({
  orderNo: '',
  company: '',
  trackingNo: '',
  status: 'pending',
  shipTime: '',
  estimatedTime: '',
  freight: 0,
  insuranceFee: 0,
  remark: ''
})

// 收货信息表单
const receiverForm = reactive({
  receiverName: '',
  receiverPhone: '',
  receiverAddress: ''
})

// 商品列表
const productList = ref([])

// 订单选项
const orderOptions = ref([])

// 选中的订单
const selectedOrder = ref(null)

// 🔥 当前订单状态（用于物流状态编辑权限控制）
const currentOrderStatus = ref('')

// 🔥 物流状态编辑权限控制
const canEditLogisticsStatus = computed(() => {
  // 如果不是编辑模式，允许编辑
  if (!isEdit.value) return true

  const orderStatus = currentOrderStatus.value

  // 只有在已发货状态才能编辑物流状态
  if (orderStatus !== 'shipped') {
    return false
  }

  // 以下订单状态不允许编辑物流状态
  const disallowedStatuses = ['delivered', 'package_exception', 'rejected', 'rejected_returned', 'after_sales_created']
  if (disallowedStatuses.includes(orderStatus)) {
    return false
  }

  return true
})

// 🔥 物流状态不可编辑的原因
const logisticsStatusDisabledReason = computed(() => {
  const orderStatus = currentOrderStatus.value

  if (orderStatus !== 'shipped') {
    return `订单状态为"${getOrderStatusTextByStatus(orderStatus)}"时，物流状态不可编辑（需要订单状态为"已发货"）`
  }

  const disallowedStatuses = ['delivered', 'package_exception', 'rejected', 'rejected_returned', 'after_sales_created']
  if (disallowedStatuses.includes(orderStatus)) {
    return `订单状态为"${getOrderStatusTextByStatus(orderStatus)}"时，物流状态不可编辑`
  }

  return ''
})

// 获取订单状态文本
const getOrderStatusTextByStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'cancelled': '已取消'
  }
  return statusMap[status] || status || '未知'
}

// 物流公司列表
const logisticsCompanies = ref([
  { code: 'SF', name: '顺丰速运' },
  { code: 'YTO', name: '圆通速递' },
  { code: 'ZTO', name: '中通快递' },
  { code: 'STO', name: '申通快递' },
  { code: 'YD', name: '韵达速递' },
  { code: 'HTKY', name: '百世快递' },
  { code: 'JD', name: '京东物流' },
  { code: 'EMS', name: '中国邮政' }
])

// 商品表单
const productForm = reactive({
  productName: '',
  specification: '',
  quantity: 1,
  weight: 0,
  volume: 0
})

// 表单验证规则
const formRules = {
  orderNo: [
    { required: true, message: '请选择关联订单', trigger: 'change' }
  ],
  company: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ],
  trackingNo: [
    { required: true, message: '请输入物流单号', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择物流状态', trigger: 'change' }
  ],
  freight: [
    { required: true, message: '请输入运费', trigger: 'blur' }
  ]
}

const receiverFormRules = {
  receiverName: [
    { required: true, message: '请输入收货人姓名', trigger: 'blur' }
  ],
  receiverPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  receiverAddress: [
    { required: true, message: '请输入收货地址', trigger: 'blur' }
  ]
}

const productFormRules = {
  productName: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' }
  ],
  weight: [
    { required: true, message: '请输入重量', trigger: 'blur' }
  ],
  volume: [
    { required: true, message: '请输入体积', trigger: 'blur' }
  ]
}

// 表单引用
const basicFormRef = ref()
const receiverFormRef = ref()
const productFormRef = ref()

// 计算属性
/**
 * 总数量
 */
const totalQuantity = computed(() => {
  return productList.value.reduce((sum, item) => sum + item.quantity, 0)
})

/**
 * 总重量
 */
const totalWeight = computed(() => {
  return productList.value.reduce((sum, item) => sum + item.weight * item.quantity, 0).toFixed(2)
})

/**
 * 总体积
 */
const totalVolume = computed(() => {
  return productList.value.reduce((sum, item) => sum + item.volume * item.quantity, 0)
})

/**
 * 重量费用
 */
const weightFee = computed(() => {
  const weight = parseFloat(totalWeight.value)
  return (weight * 2).toFixed(2) // 假设每公斤2元
})

/**
 * 体积费用
 */
const volumeFee = computed(() => {
  const volume = totalVolume.value
  return (volume * 0.001).toFixed(2) // 假设每立方厘米0.001元
})

/**
 * 总费用
 */
const totalFee = computed(() => {
  const base = form.freight || 0
  const insurance = form.insuranceFee || 0
  const weight = parseFloat(weightFee.value)
  const volume = parseFloat(volumeFee.value)
  return (base + insurance + weight + volume).toFixed(2)
})

// 方法定义
/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 搜索订单
 */
const searchOrders = async (query: string) => {
  if (!query || isUnmounted.value) return

  orderLoading.value = true

  try {
    // 模拟API调用延迟
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 300)
      timeoutIds.add(timeoutId)
    })

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 从订单store获取真实订单数据
    const allOrders = orderStore.getOrders()

    // 过滤订单：只显示已审核通过且未发货或已发货的订单
    const filteredOrders = allOrders.filter(order =>
      (order.auditStatus === 'approved') &&
      (order.status === 'pending_shipment' || order.status === 'shipped' || order.status === 'delivered') &&
      (order.orderNumber.includes(query) ||
       order.customerName.includes(query))
    )

    // 转换为选项格式
    orderOptions.value = filteredOrders.map(order => ({
      orderNo: order.orderNumber,
      customerName: order.customerName,
      orderTime: order.createTime,
      totalAmount: order.totalAmount.toFixed(2),
      status: order.status === 'pending_shipment' ? 'paid' : order.status === 'shipped' ? 'shipped' : 'completed'
    }))
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('搜索订单失败')
    }
  } finally {
    if (!isUnmounted.value) {
      orderLoading.value = false
    }
  }
}

/**
 * 订单变化处理
 */
const handleOrderChange = (orderNo: string) => {
  const order = orderOptions.value.find(o => o.orderNo === orderNo)
  if (order) {
    selectedOrder.value = order

    // 从订单store获取完整订单数据
    const fullOrder = orderStore.getOrderByNumber(orderNo)
    if (fullOrder) {
      // 自动填充收货信息
      Object.assign(receiverForm, {
        receiverName: fullOrder.receiverName || fullOrder.customerName,
        receiverPhone: fullOrder.receiverPhone || fullOrder.customerPhone,
        receiverAddress: fullOrder.receiverAddress || ''
      })

      // 自动填充物流公司（如果订单已有）
      if (fullOrder.expressCompany && !form.company) {
        form.company = fullOrder.expressCompany
      }

      // 自动填充物流单号（如果订单已有）
      if (fullOrder.trackingNumber && !form.trackingNo) {
        form.trackingNo = fullOrder.trackingNumber
      } else if (fullOrder.expressNo && !form.trackingNo) {
        form.trackingNo = fullOrder.expressNo
      }

      // 自动加载商品信息
      if (fullOrder.products && fullOrder.products.length > 0) {
        productList.value = fullOrder.products.map(product => ({
          productName: product.name || '未知商品',
          specification: product.specification || product.spec || '',
          quantity: product.quantity || 1,
          weight: product.weight || 0,
          volume: product.volume || 0
        }))
        calculateTotals()
      }
    }
  }
}

/**
 * 从订单复制收货信息
 */
const copyFromOrder = () => {
  if (!selectedOrder.value || !form.orderNo) {
    ElMessage.warning('请先选择订单')
    return
  }

  // 从订单store获取真实订单数据
  const order = orderStore.getOrderByNumber(form.orderNo)
  if (!order) {
    ElMessage.error('订单不存在')
    return
  }

  // 从真实订单复制收货信息
  Object.assign(receiverForm, {
    receiverName: order.receiverName || order.customerName,
    receiverPhone: order.receiverPhone || order.customerPhone,
    receiverAddress: order.receiverAddress || ''
  })

  ElMessage.success('已从订单复制收货信息')
}

/**
 * 加载订单商品
 */
const loadOrderProducts = async () => {
  if (!form.orderNo || isUnmounted.value) {
    if (!isUnmounted.value) {
      ElMessage.warning('请先选择订单')
    }
    return
  }

  productLoading.value = true

  try {
    // 模拟API调用延迟
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 500)
      timeoutIds.add(timeoutId)
    })

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 从订单store获取真实订单数据
    const order = orderStore.getOrderByNumber(form.orderNo)
    if (!order) {
      if (!isUnmounted.value) {
        ElMessage.error('订单不存在')
      }
      return
    }

    // 从真实订单获取商品数据
    if (order.products && order.products.length > 0) {
      productList.value = order.products.map(product => ({
        productName: product.name || '未知商品',
        specification: product.specification || product.spec || '',
        quantity: product.quantity || 1,
        weight: product.weight || 0,
        volume: product.volume || 0
      }))
    } else {
      // 如果没有商品数据，使用空数组
      productList.value = []
      if (!isUnmounted.value) {
        ElMessage.warning('该订单暂无商品信息')
      }
    }

    calculateTotals()
    if (!isUnmounted.value) {
      ElMessage.success('已加载订单商品')
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('加载商品失败')
    }
  } finally {
    if (!isUnmounted.value) {
      productLoading.value = false
    }
  }
}

/**
 * 添加商品
 */
const addProduct = () => {
  // 重置表单
  Object.assign(productForm, {
    productName: '',
    specification: '',
    quantity: 1,
    weight: 0,
    volume: 0
  })

  productDialogVisible.value = true
}

/**
 * 确认添加商品
 */
const confirmAddProduct = async () => {
  try {
    await productFormRef.value?.validate()

    productList.value.push({ ...productForm })
    calculateTotals()

    ElMessage.success('添加商品成功')
    handleProductDialogClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

/**
 * 删除商品
 */
const removeProduct = (index: number) => {
  productList.value.splice(index, 1)
  calculateTotals()
  ElMessage.success('删除商品成功')
}

/**
 * 关闭商品对话框
 */
const handleProductDialogClose = () => {
  productDialogVisible.value = false
  productFormRef.value?.clearValidate()
}

/**
 * 计算总计
 */
const calculateTotals = () => {
  // 触发计算属性更新
}

/**
 * 计算费用
 */
const calculateFee = () => {
  const weight = parseFloat(totalWeight.value)
  const volume = totalVolume.value

  // 根据重量和体积计算基础运费
  let baseFee = 10 // 起步价
  if (weight > 1) {
    baseFee += (weight - 1) * 2
  }
  if (volume > 1000) {
    baseFee += (volume - 1000) * 0.001
  }

  form.freight = parseFloat(baseFee.toFixed(2))
  ElMessage.success('费用计算完成')
}

/**
 * 获取订单状态颜色
 */
const getOrderStatusColor = (status: string) => {
  const colorMap = {
    pending: 'warning',
    paid: 'success',
    shipped: 'primary',
    completed: 'info',
    cancelled: 'danger'
  }
  return colorMap[status] || ''
}

/**
 * 获取订单状态文本
 */
const getOrderStatusText = (status: string) => {
  const textMap = {
    pending: '待付款',
    paid: '已付款',
    shipped: '已发货',
    completed: '已完成',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

/**
 * 保存
 */
const handleSave = async () => {
  if (isUnmounted.value) return

  try {
    // 验证所有表单
    await Promise.all([
      basicFormRef.value?.validate(),
      receiverFormRef.value?.validate()
    ])

    if (isUnmounted.value) return

    if (productList.value.length === 0) {
      if (!isUnmounted.value) {
        ElMessage.warning('请至少添加一个商品')
      }
      return
    }

    saveLoading.value = true

    // 构建保存数据
    const saveData = {
      ...form,
      ...receiverForm,
      productList: productList.value,
      totalQuantity: totalQuantity.value,
      totalWeight: totalWeight.value,
      totalVolume: totalVolume.value,
      totalFee: totalFee.value
    }

    console.log('[物流编辑] 准备保存数据:', saveData)

    // 🔥 调用真实API保存物流状态
    const orderId = route.params.id
    if (orderId && isEdit.value) {
      try {
        const { apiService } = await import('@/services/apiService')
        // 更新订单的物流状态
        const updateData = {
          logisticsStatus: form.status,
          expressCompany: form.company,
          trackingNumber: form.trackingNo,
          expectedDeliveryDate: form.estimatedTime,
          receiverName: receiverForm.receiverName,
          receiverPhone: receiverForm.receiverPhone,
          receiverAddress: receiverForm.receiverAddress
        }
        await apiService.put(`/orders/${orderId}`, updateData)
        console.log('[物流编辑] 物流状态已保存到数据库:', updateData)
      } catch (apiError) {
        console.error('[物流编辑] API保存失败:', apiError)
        // 即使API失败，也更新本地store
      }

      // 🔥 同时更新本地store，确保物流列表能同步显示
      const order = orderStore.getOrderById(orderId.toString())
      if (order) {
        order.logisticsStatus = form.status
        order.expressCompany = form.company
        order.trackingNumber = form.trackingNo
        order.expressNo = form.trackingNo // 同时更新expressNo字段
        order.expectedDeliveryDate = form.estimatedTime
        order.receiverName = receiverForm.receiverName
        order.receiverPhone = receiverForm.receiverPhone
        order.receiverAddress = receiverForm.receiverAddress
        console.log('[物流编辑] 本地store已更新:', order.orderNumber, '物流状态:', form.status)
      }

      // 🔥 触发事件通知物流列表刷新
      try {
        const { eventBus, EventNames } = await import('@/utils/eventBus')
        eventBus.emit(EventNames.REFRESH_LOGISTICS_LIST)
        eventBus.emit(EventNames.ORDER_STATUS_CHANGED, { orderId, logisticsStatus: form.status })
        console.log('[物流编辑] 已触发物流列表刷新事件')
      } catch (eventError) {
        console.warn('[物流编辑] 触发事件失败:', eventError)
      }
    }

    if (!isUnmounted.value) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      safeNavigator.push('/logistics/list')
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    if (!isUnmounted.value) {
      saveLoading.value = false
    }
  }
}

/**
 * 加载数据
 */
const loadData = async () => {
  if (isUnmounted.value) return

  const id = route.params.id
  console.log('[物流编辑] 加载数据，参数ID:', id)

  if (id && id !== 'add') {
    isEdit.value = true

    try {
      // 🔥 首先尝试从API获取订单数据
      let order = null
      try {
        const { apiService } = await import('@/services/apiService')
        const response = await apiService.get(`/orders/${id}`)
        // 🔥 修复：apiService.get 直接返回 data，不需要再访问 .data
        if (response) {
          order = response
          console.log('[物流编辑] 从API获取订单成功:', order.orderNumber)
        }
      } catch (apiError) {
        console.log('[物流编辑] API获取失败，尝试从store查找')
      }

      // 检查组件是否已卸载
      if (isUnmounted.value) return

      // 如果API获取失败，从订单store获取
      if (!order) {
        order = orderStore.getOrderById(id.toString())

        // 如果通过ID找不到，尝试通过所有订单查找
        if (!order) {
          const allOrders = orderStore.getOrders()
          order = allOrders.find(o =>
            o.id === id ||
            o.id === String(id) ||
            String(o.id) === String(id) ||
            o.trackingNumber === id ||
            o.expressNo === id ||
            o.orderNumber === id
          )
        }
      }

      if (!order) {
        console.error('[物流编辑] 未找到订单，参数ID:', id)
        ElMessage.error('订单不存在')
        return
      }

      console.log('[物流编辑] 找到订单:', order.orderNumber, order.id, '订单状态:', order.status)

      // 🔥 设置当前订单状态（用于物流状态编辑权限控制）
      currentOrderStatus.value = order.status
      console.log('[物流编辑] 当前订单状态:', currentOrderStatus.value, '可编辑物流状态:', canEditLogisticsStatus.value)

      // 加载真实订单数据
      Object.assign(form, {
        orderNo: order.orderNumber,
        company: order.expressCompany || '',
        trackingNo: order.trackingNumber || '',
        status: order.logisticsStatus || 'pending',
        // 🔥 修复：优先使用shippingTime，其次shippedAt
        shipTime: order.shippingTime || order.shippedAt || '',
        estimatedTime: order.expectedDeliveryDate ? `${order.expectedDeliveryDate} 18:00:00` : '',
        freight: 0,
        insuranceFee: 0,
        remark: order.remark || ''
      })

      // 加载收货信息
      Object.assign(receiverForm, {
        receiverName: order.receiverName || order.customerName || '',
        receiverPhone: order.receiverPhone || order.customerPhone || '',
        receiverAddress: order.receiverAddress || ''
      })

      // 加载商品信息
      if (order.products && order.products.length > 0) {
        productList.value = order.products.map(product => ({
          productName: product.name || '未知商品',
          specification: product.specification || product.spec || '',
          quantity: product.quantity || 1,
          weight: product.weight || 0,
          volume: product.volume || 0
        }))
      } else {
        productList.value = []
      }

      // 加载订单信息
      selectedOrder.value = {
        orderNo: order.orderNumber,
        customerName: order.customerName,
        orderTime: order.createTime,
        totalAmount: order.totalAmount.toFixed(2),
        status: order.status === 'pending_shipment' ? 'paid' : order.status === 'shipped' ? 'shipped' : 'completed'
      }

      // 将订单添加到选项列表，确保下拉框可以正确显示
      orderOptions.value = [selectedOrder.value]

      // 计算总计
      calculateTotals()
    } catch (error) {
      ElMessage.error('加载数据失败')
    }
  }
}

// 生命周期钩子
onMounted(() => {
  loadData()
})

// 组件卸载前清理
onBeforeUnmount(() => {
  // 设置组件已卸载状态
  isUnmounted.value = true
  // 清理所有未完成的 setTimeout
  timeoutIds.forEach(id => clearTimeout(id))
  timeoutIds.clear()
})
</script>

<style scoped>
.logistics-edit {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tracking-no {
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-card,
.info-card,
.tips-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-actions {
  margin: 16px 0;
}

.product-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.summary-item .label {
  font-size: 12px;
  color: #909399;
}

.summary-item .value {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: 500;
  color: #606266;
  margin-right: 8px;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
}

.fee-calculation {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fee-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fee-item .label {
  color: #606266;
}

.fee-item .value {
  color: #303133;
  font-weight: 500;
}

.fee-item.total {
  border-top: 1px solid #ebeef5;
  padding-top: 12px;
  margin-top: 8px;
  font-size: 16px;
}

.fee-item.total .value {
  color: #f56c6c;
}

.fee-actions {
  margin-top: 16px;
}

.tips-content {
  margin: 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  color: #606266;
  line-height: 1.6;
}

.tips-list li {
  margin-bottom: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 🔥 物流状态不可编辑提示样式 */
.status-tip {
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #fdf6ec;
  border-radius: 4px;
  border: 1px solid #faecd8;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .product-summary {
    flex-direction: column;
    gap: 12px;
  }

  .summary-item {
    flex-direction: row;
    justify-content: space-between;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-left {
    align-items: center;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
