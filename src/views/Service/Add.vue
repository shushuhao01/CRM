<template>
  <div class="service-add-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <el-button :icon="ArrowLeft" @click="handleBack" class="back-btn">
        返回
      </el-button>
      <div class="header-content">
        <h2>新建售后</h2>
        <p>创建新的售后服务申请</p>
      </div>
    </div>

    <!-- 表单内容 -->
    <el-card shadow="never">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="120px"
        :label-position="isMobile ? 'top' : 'right'"
      >
        <!-- 基本信息 -->
        <div class="form-section">
          <h3 class="section-title">基本信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="原订单号" prop="orderNumber">
                <el-select
                  v-model="form.orderNumber"
                  placeholder="请输入订单号/手机号/物流单号/客户编码搜索"
                  filterable
                  remote
                  reserve-keyword
                  :remote-method="handleOrderSearch"
                  :loading="orderSearchLoading"
                  style="width: 100%"
                  clearable
                  @change="handleOrderSelect"
                >
                  <el-option
                    v-for="order in orderOptions"
                    :key="order.id"
                    :label="`${order.orderNumber} - ${order.customerName} - ${order.productName}`"
                    :value="order.orderNumber"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="服务类型" prop="serviceType">
                <div class="service-type-wrapper">
                  <el-select
                    v-model="form.serviceType"
                    placeholder="请选择服务类型"
                    style="width: 100%"
                  >
                    <el-option
                      v-for="type in enabledServiceTypes"
                      :key="type.value"
                      :label="type.label"
                      :value="type.value"
                    />
                  </el-select>
                  <el-button
                    v-if="canManageServiceTypes"
                    type="primary"
                    :icon="Setting"
                    size="small"
                    style="margin-left: 8px"
                    @click="showServiceTypeConfig = true"
                    title="配置服务类型"
                  />
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="客户姓名" prop="customerName">
                <el-input
                  v-model="form.customerName"
                  placeholder="请输入客户姓名"
                  :readonly="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="联系电话" prop="customerPhone">
                <div class="phone-management">
                  <el-select
                    v-model="form.customerPhone"
                    placeholder="请选择联系电话"
                    style="width: 100%"
                    clearable
                  >
                    <el-option
                      v-for="phone in customerPhones"
                      :key="phone.id"
                      :label="`${maskPhone(phone.phone)} ${phone.remark ? '(' + phone.remark + ')' : ''}`"
                      :value="phone.phone"
                    />
                  </el-select>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showAddCustomerPhoneDialog = true"
                    style="margin-left: 8px;"
                    :icon="Plus"
                  >
                    新增
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="优先级" prop="priority">
                <el-radio-group v-model="form.priority">
                  <el-radio label="low">低</el-radio>
                  <el-radio label="medium">中</el-radio>
                  <el-radio label="high">高</el-radio>
                  <el-radio label="urgent">紧急</el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 商品信息 -->
        <div class="form-section">
          <h3 class="section-title">商品信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="商品名称" prop="productName">
                <el-input
                  v-model="form.productName"
                  placeholder="请输入商品名称"
                  :readonly="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="商品规格" prop="productSpec">
                <el-input
                  v-model="form.productSpec"
                  placeholder="请输入商品规格"
                  :readonly="orderLoaded"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="购买数量" prop="quantity">
                <el-input-number
                  v-model="form.quantity"
                  :min="1"
                  style="width: 100%"
                  :readonly="orderLoaded"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 12">
              <el-form-item label="购买价格" prop="price">
                <el-input-number
                  v-model="form.price"
                  :min="0"
                  :precision="2"
                  style="width: 100%"
                  :readonly="orderLoaded"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 申请信息 -->
        <div class="form-section">
          <h3 class="section-title">申请信息</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="申请原因" prop="reason">
                <el-select
                  v-model="form.reason"
                  placeholder="请选择申请原因"
                  style="width: 100%"
                >
                  <el-option label="商品质量问题" value="quality" />
                  <el-option label="商品损坏" value="damaged" />
                  <el-option label="尺寸不合适" value="size" />
                  <el-option label="颜色不符" value="color" />
                  <el-option label="功能故障" value="malfunction" />
                  <el-option label="发错商品" value="wrong_item" />
                  <el-option label="不满意" value="unsatisfied" />
                  <el-option label="其他" value="other" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="详细描述" prop="description">
                <el-input
                  v-model="form.description"
                  type="textarea"
                  :rows="4"
                  placeholder="请详细描述问题或需求..."
                  maxlength="500"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="上传图片">
                <el-upload
                  v-model:file-list="fileList"
                  action="#"
                  list-type="picture-card"
                  :auto-upload="false"
                  :limit="5"
                  accept="image/*"
                  @preview="handlePreview"
                  @remove="handleRemove"
                >
                  <el-icon><Plus /></el-icon>
                </el-upload>
                <div class="upload-tip">
                  支持jpg、png格式，最多上传5张图片，每张不超过2MB
                </div>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 联系信息 -->
        <div class="form-section">
          <h3 class="section-title">联系信息</h3>
          <el-row :gutter="20">
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label="联系人" prop="contactName">
                <el-input
                  v-model="form.contactName"
                  placeholder="请输入联系人姓名"
                />
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label="联系电话" prop="contactPhone">
                <div class="phone-management">
                  <el-select
                    v-model="form.contactPhone"
                    placeholder="请选择联系电话"
                    style="width: 100%"
                    clearable
                  >
                    <el-option
                      v-for="phone in contactPhones"
                      :key="phone.id"
                      :label="`${maskPhone(phone.phone)} ${phone.remark ? '(' + phone.remark + ')' : ''}`"
                      :value="phone.phone"
                    />
                  </el-select>
                  <el-button
                    type="primary"
                    size="small"
                    @click="showAddContactPhoneDialog = true"
                    style="margin-left: 8px;"
                    :icon="Plus"
                  >
                    新增
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="isMobile ? 24 : 8">
              <el-form-item label=" ">
                <el-button
                  type="primary"
                  :icon="CopyDocument"
                  @click="copyCustomerInfo"
                  :disabled="!form.customerName"
                >
                  复用客户信息
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="联系地址" prop="contactAddress">
                <el-input
                  v-model="form.contactAddress"
                  placeholder="请输入详细地址"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 备注信息 -->
        <div class="form-section">
          <h3 class="section-title">备注信息</h3>
          <el-row :gutter="20">
            <el-col :span="24">
              <el-form-item label="备注" prop="remark">
                <el-input
                  v-model="form.remark"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入备注信息..."
                  maxlength="200"
                  show-word-limit
                />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 操作按钮 -->
        <div class="form-actions">
          <el-button @click="handleCancel">取消</el-button>
          <el-button @click="handleSaveDraft" :loading="draftLoading">
            保存草稿
          </el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            提交申请
          </el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="800px">
      <img :src="previewUrl" style="width: 100%" />
    </el-dialog>

    <!-- 订单信息对话框 -->
    <el-dialog
      v-model="orderDialogVisible"
      title="订单信息"
      width="700px"
    >
      <div v-if="orderInfo" class="order-info">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单号">{{ orderInfo.orderNumber }}</el-descriptions-item>
          <el-descriptions-item label="客户姓名">{{ orderInfo.customerName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ maskPhone(orderInfo.customerPhone) }}</el-descriptions-item>
          <el-descriptions-item label="订单状态">{{ getStatusText(orderInfo.status) }}</el-descriptions-item>
          <el-descriptions-item label="物流单号">{{ orderInfo.trackingNumber || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="客户编码">{{ orderInfo.customerCode || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="收货地址" :span="2">{{ orderInfo.shippingAddress || orderInfo.address || '暂无' }}</el-descriptions-item>
          <el-descriptions-item label="下单时间" :span="2">{{ orderInfo.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <!-- 商品信息 -->
        <div v-if="orderInfo.products && orderInfo.products.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 12px">商品信息</h4>
          <el-table :data="orderInfo.products" border style="width: 100%">
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="spec" label="规格" width="120" />
            <el-table-column prop="quantity" label="数量" width="80" align="center" />
            <el-table-column label="单价" width="100" align="right">
              <template #default="{ row }">¥{{ row.price?.toFixed(2) || '0.00' }}</template>
            </el-table-column>
            <el-table-column label="小计" width="100" align="right">
              <template #default="{ row }">¥{{ (row.price * row.quantity)?.toFixed(2) || '0.00' }}</template>
            </el-table-column>
          </el-table>
          <div style="text-align: right; margin-top: 12px; font-weight: bold">
            订单总额: ¥{{ orderInfo.totalAmount?.toFixed(2) || orderInfo.subtotal?.toFixed(2) || '0.00' }}
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="orderDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleUseOrderInfo">使用此订单信息</el-button>
      </template>
    </el-dialog>

    <!-- 新增客户手机号对话框 -->
    <el-dialog
      v-model="showAddCustomerPhoneDialog"
      title="新增客户手机号"
      width="400px"
      :before-close="handleCloseAddCustomerPhoneDialog"
    >
      <el-form
        ref="addCustomerPhoneFormRef"
        :model="addCustomerPhoneForm"
        :rules="addPhoneRules"
        label-width="80px"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="addCustomerPhoneForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addCustomerPhoneForm.remark"
            placeholder="请输入备注（可选）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAddCustomerPhoneDialog">取消</el-button>
          <el-button type="primary" @click="handleAddCustomerPhone" :loading="addingCustomerPhone">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 新增联系手机号对话框 -->
    <el-dialog
      v-model="showAddContactPhoneDialog"
      title="新增联系手机号"
      width="400px"
      :before-close="handleCloseAddContactPhoneDialog"
    >
      <el-form
        ref="addContactPhoneFormRef"
        :model="addContactPhoneForm"
        :rules="addPhoneRules"
        label-width="80px"
      >
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="addContactPhoneForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="addContactPhoneForm.remark"
            placeholder="请输入备注（可选）"
            clearable
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseAddContactPhoneDialog">取消</el-button>
          <el-button type="primary" @click="handleAddContactPhone" :loading="addingContactPhone">
            确认添加
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 服务类型配置对话框 -->
    <ServiceTypeConfigDialog v-model="showServiceTypeConfig" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Setting, CopyDocument } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus'
import { useResponsive } from '@/utils/responsive'
import { useNotificationStore } from '@/stores/notification'
import { useServiceStore } from '@/stores/service'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { useServiceTypeStore } from '@/stores/serviceType'
import { maskPhone } from '@/utils/phone'
import { PhoneSyncService } from '@/services/phoneSync'
import { createSafeNavigator } from '@/utils/navigation'
import ServiceTypeConfigDialog from '@/components/Service/ServiceTypeConfigDialog.vue'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const serviceStore = useServiceStore()
const orderStore = useOrderStore()
const serviceTypeStore = useServiceTypeStore()

// 响应式
const { isMobile } = useResponsive()

// 响应式数据
const formRef = ref<FormInstance>()
const submitLoading = ref(false)
const draftLoading = ref(false)
const orderLoaded = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')
const orderDialogVisible = ref(false)

// 订单搜索相关
const orderSearchLoading = ref(false)
const orderOptions = ref<any[]>([])

// 服务类型配置
const showServiceTypeConfig = ref(false)

// 手机号管理相关数据
const customerPhones = ref<any[]>([])
const contactPhones = ref<any[]>([])

// 新增客户手机号对话框
const showAddCustomerPhoneDialog = ref(false)
const addCustomerPhoneFormRef = ref()
const addingCustomerPhone = ref(false)

// 新增联系手机号对话框
const showAddContactPhoneDialog = ref(false)
const addContactPhoneFormRef = ref()
const addingContactPhone = ref(false)

// 新增客户手机号表单
const addCustomerPhoneForm = reactive({
  phone: '',
  remark: ''
})

// 新增联系手机号表单
const addContactPhoneForm = reactive({
  phone: '',
  remark: ''
})

// 手机号表单验证规则
const addPhoneRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ]
}

// 表单数据
const form = reactive({
  orderId: '',
  orderNumber: '',
  customerId: '',
  serviceType: '',
  customerName: '',
  customerPhone: '',
  priority: 'medium',
  productName: '',
  productSpec: '',
  quantity: 1,
  price: 0,
  reason: '',
  description: '',
  contactName: '',
  contactPhone: '',
  contactAddress: '',
  remark: ''
})

// 文件列表
const fileList = ref<UploadUserFile[]>([])

// 订单信息
const orderInfo = ref<any>(null)

// 计算属性
// 启用的服务类型
const enabledServiceTypes = computed(() => {
  return serviceTypeStore.enabledServiceTypes()
})

// 是否可以管理服务类型(仅超管和管理员)
const canManageServiceTypes = computed(() => {
  const user = userStore.currentUser
  if (!user) return false
  return user.role === 'super_admin' || user.role === 'admin'
})

// 表单验证规则
const rules: FormRules = {
  orderNumber: [
    { required: true, message: '请输入原订单号', trigger: 'blur' }
  ],
  serviceType: [
    { required: true, message: '请选择服务类型', trigger: 'change' }
  ],
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ],
  customerPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  productName: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入购买数量', trigger: 'blur' }
  ],
  price: [
    { required: true, message: '请输入购买价格', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择申请原因', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入详细描述', trigger: 'blur' },
    { min: 10, message: '详细描述至少10个字符', trigger: 'blur' }
  ],
  contactName: [
    { required: true, message: '请输入联系人姓名', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 方法
const handleBack = () => {
  router.back()
}

// 状态文本转换
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending_transfer': '待转单',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'logistics_returned': '物流退回',
    'logistics_cancelled': '物流取消',
    'delivered': '已送达',
    'package_exception': '包裹异常',
    'rejected': '已拒收',
    'rejected_returned': '拒收退回',
    'completed': '已完成',
    'cancelled': '已取消',
    'draft': '草稿',
    'shipped': '已发货'
  }
  return statusMap[status] || status
}

// 复用客户信息
const copyCustomerInfo = () => {
  if (!form.customerName) {
    ElMessage.warning('请先选择订单或填写客户信息')
    return
  }

  // 复用客户基本信息到联系信息
  form.contactName = form.customerName
  form.contactPhone = form.customerPhone

  // 如果有订单信息,也复用地址
  if (orderInfo.value?.shippingAddress || orderInfo.value?.address) {
    form.contactAddress = orderInfo.value.shippingAddress || orderInfo.value.address
  }

  ElMessage.success('已复用客户信息到联系信息')
}

// 订单搜索方法 - 支持订单号、手机号、物流单号、客户编码综合搜索
const handleOrderSearch = async (query: string) => {
  if (!query || query.length < 2) {
    orderOptions.value = []
    return
  }

  orderSearchLoading.value = true
  try {
    const keyword = query.trim()
    console.log('[售后订单搜索] 搜索关键词:', keyword)

    // 从localStorage获取真实订单数据
    const orderStoreRaw = localStorage.getItem('crm_store_order')

    if (!orderStoreRaw) {
      console.error('[售后订单搜索] 订单数据不存在')
      ElMessage.warning('订单数据未加载，请刷新页面重试')
      orderOptions.value = []
      return
    }

    // 解析订单数据（支持新旧格式）
    let orders: any[] = []
    try {
      const parsed = JSON.parse(orderStoreRaw)

      // 新格式：{ data: { orders: [...] } }
      if (parsed.data && parsed.data.orders) {
        orders = parsed.data.orders
      }
      // 旧格式：{ orders: [...] }
      else if (parsed.orders) {
        orders = parsed.orders
      }
      // 直接是数组
      else if (Array.isArray(parsed)) {
        orders = parsed
      }

      console.log('[售后订单搜索] 订单总数:', orders.length)
    } catch (e) {
      console.error('[售后订单搜索] 解析订单数据失败:', e)
      ElMessage.error('订单数据解析失败')
      orderOptions.value = []
      return
    }

    // 搜索订单 - 支持多字段匹配
    const matchedOrders = orders.filter((order: any) => {
      // 订单号匹配
      const orderNumberMatch = order.orderNumber?.toLowerCase().includes(keyword.toLowerCase())

      // 客户手机号匹配
      const phoneMatch = order.customerPhone?.includes(keyword)

      // 物流单号匹配
      const trackingMatch = order.trackingNumber?.toLowerCase().includes(keyword.toLowerCase())

      // 客户编码匹配
      const customerCodeMatch = order.customerCode?.toLowerCase().includes(keyword.toLowerCase())

      // 客户姓名匹配
      const customerNameMatch = order.customerName?.toLowerCase().includes(keyword.toLowerCase())

      // 商品名称匹配 (从products数组中查找)
      const productNameMatch = order.products?.some((p: any) =>
        p.name?.toLowerCase().includes(keyword.toLowerCase())
      )

      return orderNumberMatch || phoneMatch || trackingMatch ||
             customerCodeMatch || customerNameMatch || productNameMatch
    })

    console.log('[售后订单搜索] 匹配到的订单数:', matchedOrders.length)

    // 显示所有匹配的订单(不限制状态,让用户可以为任何订单申请售后)
    const availableOrders = matchedOrders.slice(0, 10) // 限制显示10个结果

    console.log('[售后订单搜索] 可申请售后的订单数:', availableOrders.length)

    // 格式化订单选项,添加商品名称
    orderOptions.value = availableOrders.map((order: any) => {
      // 获取第一个商品名称
      const productName = order.products && order.products.length > 0
        ? order.products[0].name
        : '无商品信息'

      return {
        ...order,
        productName
      }
    })

  } catch (_error) {
    console.error('[售后订单搜索] 搜索失败:', _error)
    ElMessage.error('搜索订单失败')
    orderOptions.value = []
  } finally {
    orderSearchLoading.value = false
  }
}

// 选择订单后的处理
const handleOrderSelect = (orderNumber: string) => {
  if (!orderNumber) {
    // 清空选择时重置表单
    orderLoaded.value = false
    return
  }

  const selectedOrder = orderStore.orders.find(order => order.orderNumber === orderNumber)
  if (selectedOrder) {
    orderInfo.value = selectedOrder
    orderDialogVisible.value = true
  }
}

const handleUseOrderInfo = () => {
  if (!orderInfo.value) return

  // 填充基本信息
  form.orderId = orderInfo.value.id
  form.orderNumber = orderInfo.value.orderNumber
  form.customerId = orderInfo.value.customerId || orderInfo.value.customer_id || ''
  form.customerName = orderInfo.value.customerName
  form.customerPhone = orderInfo.value.customerPhone

  // 填充商品信息(优先从products数组获取第一个商品)
  if (orderInfo.value.products && orderInfo.value.products.length > 0) {
    const firstProduct = orderInfo.value.products[0]
    form.productName = firstProduct.name || ''
    form.productSpec = firstProduct.spec || firstProduct.specification || ''
    form.quantity = firstProduct.quantity || 1
    form.price = firstProduct.price || 0
  } else {
    // 兜底:从订单直接获取
    form.productName = orderInfo.value.productName || ''
    form.productSpec = orderInfo.value.productSpec || ''
    form.quantity = orderInfo.value.quantity || 1
    form.price = orderInfo.value.price || 0
  }

  // 填充联系信息
  form.contactName = orderInfo.value.customerName
  form.contactPhone = orderInfo.value.customerPhone
  form.contactAddress = orderInfo.value.shippingAddress || orderInfo.value.address || ''

  orderLoaded.value = true
  orderDialogVisible.value = false
  ElMessage.success('订单信息已填充')
}

const handlePreview = (file: UploadUserFile) => {
  previewUrl.value = file.url!
  previewVisible.value = true
}

const handleRemove = (file: UploadUserFile) => {
  console.log('移除文件:', file)
}

/**
 * 加载客户手机号列表
 */
const loadCustomerPhones = async () => {
  try {
    // 模拟从API获取客户手机号列表
    customerPhones.value = [
      { id: 1, phone: '13800138001', remark: '主要联系方式' },
      { id: 2, phone: '13800138002', remark: '备用联系方式' }
    ]
  } catch (_error) {
    console.error('加载客户手机号失败:', _error)
  }
}

/**
 * 加载联系手机号列表
 */
const loadContactPhones = async () => {
  try {
    // 模拟从API获取联系手机号列表
    contactPhones.value = [
      { id: 1, phone: '13800138003', remark: '联系人手机' },
      { id: 2, phone: '13800138004', remark: '紧急联系方式' }
    ]
  } catch (_error) {
    console.error('加载联系手机号失败:', _error)
  }
}

/**
 * 新增客户手机号
 */
const handleAddCustomerPhone = async () => {
  if (!addCustomerPhoneFormRef.value) return

  try {
    await addCustomerPhoneFormRef.value.validate()

    addingCustomerPhone.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到列表
    const newPhone = {
      id: Date.now(),
      phone: addCustomerPhoneForm.phone,
      remark: addCustomerPhoneForm.remark || '无备注'
    }
    customerPhones.value.push(newPhone)

    // 设置为当前选中的手机号
    form.customerPhone = newPhone.phone

    // 同步手机号到客户详情页
    try {
      const customerId = form.customerId || 'default-customer-id' // 实际应用中应该从表单或订单信息获取
      const syncResult = await PhoneSyncService.syncCustomerPhone(customerId, {
        id: newPhone.id,
        phone: newPhone.phone,
        remark: newPhone.remark
      })

      if (syncResult.success) {
        ElMessage.success('添加成功，已同步到客户详情')
      } else {
        ElMessage.warning('添加成功，但同步失败：' + syncResult.message)
      }
    } catch (syncError) {
      console.error('同步客户手机号失败:', syncError)
      ElMessage.warning('添加成功，但同步失败')
    }

    handleCloseAddCustomerPhoneDialog()
  } catch (_error) {
    console.error('添加客户手机号失败:', _error)
    ElMessage.error('添加失败')
  } finally {
    addingCustomerPhone.value = false
  }
}

/**
 * 新增联系手机号
 */
const handleAddContactPhone = async () => {
  if (!addContactPhoneFormRef.value) return

  try {
    await addContactPhoneFormRef.value.validate()

    addingContactPhone.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 添加到列表
    const newPhone = {
      id: Date.now(),
      phone: addContactPhoneForm.phone,
      remark: addContactPhoneForm.remark || '无备注'
    }
    contactPhones.value.push(newPhone)

    // 设置为当前选中的手机号
    form.contactPhone = newPhone.phone

    // 同步手机号到联系人详情页
    try {
      const contactId = (form as unknown).contactId || 'default-contact-id' // 实际应用中应该从表单获取
      const syncResult = await PhoneSyncService.syncContactPhone(contactId, {
        id: newPhone.id,
        phone: newPhone.phone,
        remark: newPhone.remark
      })

      if (syncResult.success) {
        ElMessage.success('添加成功，已同步到联系人详情')
      } else {
        ElMessage.warning('添加成功，但同步失败：' + syncResult.message)
      }
    } catch (syncError) {
      console.error('同步联系手机号失败:', syncError)
      ElMessage.warning('添加成功，但同步失败')
    }

    handleCloseAddContactPhoneDialog()
  } catch (_error) {
    console.error('添加联系手机号失败:', _error)
    ElMessage.error('添加失败')
  } finally {
    addingContactPhone.value = false
  }
}

/**
 * 关闭新增客户手机号对话框
 */
const handleCloseAddCustomerPhoneDialog = () => {
  showAddCustomerPhoneDialog.value = false
  addCustomerPhoneForm.phone = ''
  addCustomerPhoneForm.remark = ''
  if (addCustomerPhoneFormRef.value) {
    addCustomerPhoneFormRef.value.clearValidate()
  }
}

/**
 * 关闭新增联系手机号对话框
 */
const handleCloseAddContactPhoneDialog = () => {
  showAddContactPhoneDialog.value = false
  addContactPhoneForm.phone = ''
  addContactPhoneForm.remark = ''
  if (addContactPhoneFormRef.value) {
    addContactPhoneFormRef.value.clearValidate()
  }
}

const handleCancel = () => {
  ElMessageBox.confirm(
    '确定要取消吗？未保存的数据将丢失。',
    '确认取消',
    {
      confirmButtonText: '确定',
      cancelButtonText: '继续编辑',
      type: 'warning'
    }
  ).then(() => {
    router.back()
  })
}

const handleSaveDraft = async () => {
  draftLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (_error) {
    ElMessage.error('保存草稿失败')
  } finally {
    draftLoading.value = false
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // 表单验证
    await formRef.value.validate()

    // 额外验证关键字段
    if (!form.orderNumber) {
      ElMessage.warning('请选择订单')
      return
    }

    if (!form.serviceType) {
      ElMessage.warning('请选择服务类型')
      return
    }

    if (!form.customerName) {
      ElMessage.warning('请输入客户姓名')
      return
    }

    if (!form.description || form.description.length < 5) {
      ElMessage.warning('详细描述至少需要5个字符')
      return
    }

    submitLoading.value = true

    console.log('开始提交售后申请:', {
      orderId: form.orderId,
      orderNumber: form.orderNumber,
      customerName: form.customerName,
      serviceType: form.serviceType
    })

    // 使用service store创建售后单
    const newService = await serviceStore.createAfterSalesService({
      orderId: form.orderId || '',
      orderNumber: form.orderNumber,
      customerId: form.customerId || '',
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      serviceType: form.serviceType as unknown,
      priority: form.priority as unknown,
      description: form.description,
      productName: form.productName,
      productSpec: form.productSpec,
      quantity: form.quantity,
      price: form.price,
      reason: form.reason,
      contactName: form.contactName,
      contactPhone: form.contactPhone,
      contactAddress: form.contactAddress,
      remark: form.remark,
      attachments: fileList.value as unknown,
      createdBy: userStore.currentUser?.id || 'system'
    })

    console.log('售后申请创建成功:', newService)

    // 发送售后申请提交成功的消息提醒
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_CREATED,
      `售后申请 ${newService.serviceNumber} 已提交，客户：${form.customerName}，服务类型：${getServiceTypeText(form.serviceType)}`,
      {
        relatedId: newService.id,
        relatedType: 'service',
        actionUrl: `/service/detail/${newService.id}`
      } as unknown
    )

    ElMessage.success('售后申请提交成功')

    // 跳转到售后详情页
    setTimeout(() => {
      safeNavigator.push(`/service/detail/${newService.id}`)
    }, 500)
  } catch (_error) {
    console.error('提交售后失败:', _error)

    if (_error !== false) {
      // 显示详细错误信息
      let errorMessage = '提交失败，请检查表单信息'

      if (_error instanceof Error) {
        errorMessage = _error.message
        console.error('错误详情:', {
          message: _error.message,
          stack: _error.stack,
          formData: {
            orderId: form.orderId,
            orderNumber: form.orderNumber,
            customerName: form.customerName,
            serviceType: form.serviceType,
            description: form.description
          }
        })
      }

      ElMessage.error(errorMessage)
    }
  } finally {
    submitLoading.value = false
  }
}

// 获取服务类型文本
const getServiceTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'return': '退货',
    'exchange': '换货',
    'repair': '维修',
    'refund': '退款',
    'complaint': '投诉'
  }
  return typeMap[type] || type
}

// 初始化表单数据
const initFormData = () => {
  const query = route.query

  // 如果有订单信息，自动填充表单
  if (query.orderId) {
    form.orderId = query.orderId as string
  }

  if (query.orderNumber) {
    form.orderNumber = query.orderNumber as string
    orderLoaded.value = true
  }

  // 从客户详情页跳转过来的客户信息
  if (query.customerId) {
    form.customerId = query.customerId as string
  }

  if (query.customerName) {
    form.customerName = query.customerName as string
  }

  if (query.customerPhone) {
    form.customerPhone = query.customerPhone as string
  }



  // 如果有商品信息，填充第一个商品的信息
  if (query.products) {
    try {
      const products = JSON.parse(query.products as string)
      if (products && products.length > 0) {
        const firstProduct = products[0]
        form.productName = firstProduct.name || ''
        form.productSpec = firstProduct.spec || ''
        form.quantity = firstProduct.quantity || 1
        form.price = firstProduct.price || 0
      }
    } catch (_error) {
      console.warn('解析商品信息失败:', _error)
    }
  }

  // 显示相应的提示信息
  if (query.orderNumber) {
    ElMessage.success('已自动同步订单信息，请完善售后详情')
  } else if (query.customerId && query.customerName) {
    ElMessage.success(`已自动选择客户：${query.customerName}，请完善售后详情`)
  }
}

// 页面加载时初始化
onMounted(() => {
  initFormData()
  loadCustomerPhones()
  loadContactPhones()
})
</script>

<style scoped>
.service-add-container {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.service-type-wrapper {
  display: flex;
  align-items: center;
}

.back-btn {
  flex-shrink: 0;
}

.header-content h2 {
  margin: 0 0 4px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.form-section {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.form-actions {
  position: sticky;
  bottom: 0;
  background: white;
  padding: 20px;
  margin-top: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
  gap: 16px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.form-actions .el-button {
  min-width: 120px;
  height: 40px;
}

.upload-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.order-info {
  margin-bottom: 20px;
}

/* 手机号管理样式 */
.phone-management {
  display: flex;
  align-items: center;
  gap: 8px;
}

.phone-management .el-select {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-add-container {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions .el-button {
    width: 100%;
  }
}
</style>
