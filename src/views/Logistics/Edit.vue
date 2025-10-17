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
                  >
                    <el-option label="待发货" value="pending" />
                    <el-option label="已发货" value="shipped" />
                    <el-option label="运输中" value="in_transit" />
                    <el-option label="派送中" value="delivering" />
                    <el-option label="已签收" value="delivered" />
                    <el-option label="异常" value="exception" />
                  </el-select>
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
import { 
  ArrowLeft,
  Plus
} from '@element-plus/icons-vue'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

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
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 500)
      timeoutIds.add(timeoutId)
    })
    
    // 检查组件是否已卸载
    if (isUnmounted.value) return
    
    // 模拟订单数据
    orderOptions.value = [
      {
        orderNo: 'ORD202401090001',
        customerName: '张三',
        orderTime: '2024-01-09 15:30:00',
        totalAmount: '1299.00',
        status: 'paid'
      },
      {
        orderNo: 'ORD202401090002',
        customerName: '李四',
        orderTime: '2024-01-09 16:45:00',
        totalAmount: '899.00',
        status: 'paid'
      }
    ].filter(order => 
      order.orderNo.includes(query) || 
      order.customerName.includes(query)
    )
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
  }
}

/**
 * 从订单复制收货信息
 */
const copyFromOrder = () => {
  if (!selectedOrder.value) {
    ElMessage.warning('请先选择订单')
    return
  }
  
  // 模拟从订单复制收货信息
  Object.assign(receiverForm, {
    receiverName: '张三',
    receiverPhone: '13800138001',
    receiverAddress: '北京市朝阳区建国路88号SOHO现代城A座1001室'
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
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 800)
      timeoutIds.add(timeoutId)
    })
    
    // 检查组件是否已卸载
    if (isUnmounted.value) return
    
    // 模拟商品数据
    productList.value = [
      {
        productName: 'iPhone 15 Pro',
        specification: '256GB 深空黑色',
        quantity: 1,
        weight: 0.2,
        volume: 150
      },
      {
        productName: 'AirPods Pro',
        specification: '第二代',
        quantity: 1,
        weight: 0.05,
        volume: 80
      }
    ]
    
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
    
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1500)
      timeoutIds.add(timeoutId)
    })
    
    if (!isUnmounted.value) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      safeNavigator.push('/logistics')
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
  
  if (id && id !== 'add') {
    isEdit.value = true
    
    try {
      // 模拟API调用
      await new Promise(resolve => {
        const timeoutId = setTimeout(() => {
          timeoutIds.delete(timeoutId)
          resolve(undefined)
        }, 800)
        timeoutIds.add(timeoutId)
      })
      
      // 检查组件是否已卸载
      if (isUnmounted.value) return
      
      // 模拟加载数据
      Object.assign(form, {
        orderNo: 'ORD202401090001',
        company: 'SF',
        trackingNo: 'SF1234567890123',
        status: 'shipped',
        shipTime: '2024-01-10 09:30:00',
        estimatedTime: '2024-01-12 18:00:00',
        freight: 15.00,
        insuranceFee: 2.00,
        remark: '请在工作时间配送'
      })
      
      Object.assign(receiverForm, {
        receiverName: '张三',
        receiverPhone: '13800138001',
        receiverAddress: '北京市朝阳区建国路88号SOHO现代城A座1001室'
      })
      
      productList.value = [
        {
          productName: 'iPhone 15 Pro',
          specification: '256GB 深空黑色',
          quantity: 1,
          weight: 0.2,
          volume: 150
        }
      ]
      
      // 加载订单信息
      selectedOrder.value = {
        orderNo: 'ORD202401090001',
        customerName: '张三',
        orderTime: '2024-01-09 15:30:00',
        totalAmount: '1299.00',
        status: 'paid'
      }
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