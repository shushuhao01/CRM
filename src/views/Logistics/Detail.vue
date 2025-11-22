<template>
  <div class="logistics-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>物流详情</h2>
          <div class="header-meta">
            <span class="tracking-no">{{ logisticsInfo.trackingNo }}</span>
            <el-tag :type="getStatusColor(logisticsInfo.status)" size="large">
              {{ getStatusText(logisticsInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handlePrint" :icon="Printer">
          打印
        </el-button>
        <el-button @click="handleEdit" type="primary" :icon="Edit">
          编辑
        </el-button>
        <el-button
          @click="handleShip"
          type="success"
          :icon="Box"
          v-if="logisticsInfo.status === 'pending'"
        >
          发货
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 左侧信息 -->
      <el-col :span="16">
        <!-- 基本信息 -->
        <el-card class="info-card" title="基本信息">
          <template #header>
            <div class="card-header">
              <span>基本信息</span>
            </div>
          </template>

          <div class="info-grid">
            <div class="info-item">
              <span class="label">物流单号：</span>
              <span class="value">{{ logisticsInfo.trackingNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单号：</span>
              <el-link @click="viewOrder" type="primary" class="value">
                {{ logisticsInfo.orderNo }}
              </el-link>
            </div>
            <div class="info-item">
              <span class="label">物流公司：</span>
              <span class="value">{{ logisticsInfo.companyName }}</span>
            </div>
            <div class="info-item">
              <span class="label">物流状态：</span>
              <el-tag :type="getStatusColor(logisticsInfo.status)" class="value">
                {{ getStatusText(logisticsInfo.status) }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="label">发货时间：</span>
              <span class="value">{{ logisticsInfo.shipTime || '未发货' }}</span>
            </div>
            <div class="info-item">
              <span class="label">预计送达：</span>
              <span class="value">{{ logisticsInfo.estimatedTime || '未设置' }}</span>
            </div>
            <div class="info-item">
              <span class="label">实际送达：</span>
              <span class="value">{{ logisticsInfo.actualTime || '未送达' }}</span>
            </div>
            <div class="info-item">
              <span class="label">运费：</span>
              <span class="value">¥{{ logisticsInfo.freight }}</span>
            </div>
          </div>
        </el-card>

        <!-- 收货信息 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>收货信息</span>
            </div>
          </template>

          <div class="receiver-info">
            <div class="receiver-basic">
              <div class="info-item">
                <span class="label">收货人：</span>
                <span class="value">{{ logisticsInfo.receiverName }}</span>
              </div>
              <div class="info-item">
                <span class="label">联系电话：</span>
            <span class="value">{{ displaySensitiveInfoNew(logisticsInfo.receiverPhone, 'phone') }}</span>
              </div>
            </div>
            <div class="info-item">
              <span class="label">收货地址：</span>
              <span class="value">{{ logisticsInfo.receiverAddress }}</span>
            </div>
            <div class="info-item" v-if="logisticsInfo.remark">
              <span class="label">备注：</span>
              <span class="value">{{ logisticsInfo.remark }}</span>
            </div>
          </div>
        </el-card>

        <!-- 商品信息 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>商品信息</span>
            </div>
          </template>

          <el-table :data="productList" style="width: 100%">
            <el-table-column prop="productName" label="商品名称" />
            <el-table-column prop="specification" label="规格" width="120" />
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column prop="weight" label="重量(kg)" width="100" />
            <el-table-column prop="volume" label="体积(cm³)" width="120" />
          </el-table>

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

        <!-- 物流轨迹 -->
        <el-card class="info-card">
          <template #header>
            <div class="card-header">
              <span>物流轨迹</span>
              <el-button @click="refreshTracking" :icon="Refresh" size="small">
                刷新
              </el-button>
            </div>
          </template>

          <div class="tracking-timeline">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in trackingHistory"
                :key="index"
                :timestamp="item.time"
                :type="item.type"
                :hollow="index !== 0"
              >
                <div class="timeline-content">
                  <h4>{{ item.status }}</h4>
                  <p>{{ item.description }}</p>
                  <div class="timeline-location" v-if="item.location">
                    <el-icon><Location /></el-icon>
                    <span>{{ item.location }}</span>
                  </div>
                  <div class="timeline-operator" v-if="item.operator">
                    <el-icon><User /></el-icon>
                    <span>{{ item.operator }}</span>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧操作 -->
      <el-col :span="8">
        <!-- 快捷操作 -->
        <el-card class="action-card">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>

          <div class="action-buttons">
            <el-button
              @click="handleTrack"
              type="primary"
              :icon="Search"
              style="width: 100%; margin-bottom: 12px;"
            >
              实时跟踪
            </el-button>
            <el-button
              @click="handleContact"
              type="success"
              :icon="Phone"
              style="width: 100%; margin-bottom: 12px;"
            >
              联系收货人
            </el-button>
            <el-button
              @click="handleComplaint"
              type="warning"
              :icon="Warning"
              style="width: 100%; margin-bottom: 12px;"
            >
              投诉建议
            </el-button>

          </div>
        </el-card>

        <!-- 相关信息 -->
        <el-card class="related-card">
          <template #header>
            <div class="card-header">
              <span>相关信息</span>
            </div>
          </template>

          <div class="related-info">
            <div class="related-item">
              <div class="item-header">
                <el-icon><Document /></el-icon>
                <span>关联订单</span>
              </div>
              <div class="item-content">
                <el-link @click="viewOrder" type="primary">
                  {{ logisticsInfo.orderNo }}
                </el-link>
                <span class="item-meta">{{ logisticsInfo.orderTime }}</span>
              </div>
            </div>

            <div class="related-item">
              <div class="item-header">
                <el-icon><User /></el-icon>
                <span>客户信息</span>
              </div>
              <div class="item-content">
                <el-link @click="viewCustomer" type="primary">
                  {{ logisticsInfo.customerName }}
                </el-link>
                <span class="item-meta">{{ displaySensitiveInfoNew(logisticsInfo.customerPhone, 'phone') }}</span>
              </div>
            </div>

            <div class="related-item">
              <div class="item-header">
                <el-icon><Money /></el-icon>
                <span>费用信息</span>
              </div>
              <div class="item-content">
                <div class="fee-item">
                  <span>运费：¥{{ logisticsInfo.freight }}</span>
                </div>
                <div class="fee-item">
                  <span>保价费：¥{{ logisticsInfo.insuranceFee || '0.00' }}</span>
                </div>
                <div class="fee-item total">
                  <span>总计：¥{{ totalFee }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 操作日志 -->
        <el-card class="log-card">
          <template #header>
            <div class="card-header">
              <span>操作日志</span>
            </div>
          </template>

          <div class="operation-log">
            <div
              v-for="(log, index) in operationLogs"
              :key="index"
              class="log-item"
            >
              <div class="log-time">{{ log.time }}</div>
              <div class="log-content">
                <span class="log-operator">{{ log.operator }}</span>
                <span class="log-action">{{ log.action }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 发货对话框 -->
    <el-dialog
      v-model="shipDialogVisible"
      title="发货处理"
      width="600px"
      :before-close="handleShipDialogClose"
    >
      <el-form
        ref="shipFormRef"
        :model="shipForm"
        :rules="shipFormRules"
        label-width="100px"
      >
        <el-form-item label="物流公司" prop="company">
          <el-select
            v-model="shipForm.company"
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
        <el-form-item label="物流单号" prop="trackingNo">
          <el-input
            v-model="shipForm.trackingNo"
            placeholder="请输入物流单号"
          />
        </el-form-item>
        <el-form-item label="发货时间" prop="shipTime">
          <el-date-picker
            v-model="shipForm.shipTime"
            type="datetime"
            placeholder="选择发货时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="预计送达" prop="estimatedTime">
          <el-date-picker
            v-model="shipForm.estimatedTime"
            type="datetime"
            placeholder="选择预计送达时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="shipForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleShipDialogClose">取消</el-button>
          <el-button @click="confirmShip" type="primary" :loading="shipLoading">
            确认发货
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Printer,
  Edit,
  Box,
  Search,
  Phone,
  Warning,
  RefreshLeft,
  Refresh,
  Location,
  User,
  Document,
  Money
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { createSafeNavigator } from '@/utils/navigation'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// Store
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()

// 响应式数据
const shipDialogVisible = ref(false)
const shipLoading = ref(false)

// 超时ID跟踪
const timeoutIds = new Set<number>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 物流信息
const logisticsInfo = reactive({
  id: '',
  trackingNo: '',
  orderNo: '',
  companyName: '',
  status: '',
  shipTime: '',
  estimatedTime: '',
  actualTime: '',
  freight: 0,
  insuranceFee: 0,
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  remark: '',
  customerName: '',
  customerPhone: '',
  orderTime: ''
})

// 商品列表
const productList = ref([])

// 物流轨迹
const trackingHistory = ref([])

// 操作日志
const operationLogs = ref([])

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

// 发货表单
const shipForm = reactive({
  company: '',
  trackingNo: '',
  shipTime: '',
  estimatedTime: '',
  remark: ''
})

// 发货表单验证规则
const shipFormRules = {
  company: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ],
  trackingNo: [
    { required: true, message: '请输入物流单号', trigger: 'blur' }
  ],
  shipTime: [
    { required: true, message: '请选择发货时间', trigger: 'change' }
  ]
}

// 表单引用
const shipFormRef = ref()

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
 * 总费用
 */
const totalFee = computed(() => {
  return (logisticsInfo.freight + (logisticsInfo.insuranceFee || 0)).toFixed(2)
})



// 方法定义
/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    pending: 'warning',
    shipped: 'primary',
    in_transit: 'info',
    delivering: 'success',
    delivered: 'success',
    exception: 'danger'
  }
  return colorMap[status] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    pending: '待发货',
    shipped: '已发货',
    in_transit: '运输中',
    delivering: '派送中',
    delivered: '已签收',
    exception: '异常'
  }
  return textMap[status] || status
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 打印
 */
const handlePrint = () => {
  window.print()
}

/**
 * 编辑
 */
const handleEdit = () => {
  safeNavigator.push(`/logistics/edit/${logisticsInfo.id}`)
}

/**
 * 发货处理
 */
const handleShip = () => {
  // 重置表单
  Object.assign(shipForm, {
    company: '',
    trackingNo: '',
    shipTime: new Date(),
    estimatedTime: '',
    remark: ''
  })

  shipDialogVisible.value = true
}

/**
 * 确认发货
 */
const confirmShip = async () => {
  if (isUnmounted.value) return

  try {
    await shipFormRef.value?.validate()

    if (isUnmounted.value) return

    shipLoading.value = true

    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1500)
      timeoutIds.add(timeoutId)
    })

    if (!isUnmounted.value) {
      // 添加操作记录
      const orderId = logisticsInfo.orderNo.replace('ORD', '')
      orderStore.syncOrderStatus(
        orderId,
        'shipped',
        '物流员',
        `订单已发货，快递公司：${shipForm.company}，快递单号：${shipForm.trackingNo}`
      )

      // 【批次201新增】发送订单已发货消息通知，显示真实物流单号
      notificationStore.sendMessage(
        notificationStore.MessageType.ORDER_SHIPPED,
        `订单 ${logisticsInfo.orderNo} 已发货，快递公司：${shipForm.company}，快递单号：${shipForm.trackingNo}`,
        {
          relatedId: orderId,
          relatedType: 'order',
          actionUrl: `/logistics/detail/${logisticsInfo.id}`
        }
      )

      ElMessage.success('发货成功')
      handleShipDialogClose()
      loadData()
    }
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    if (!isUnmounted.value) {
      shipLoading.value = false
    }
  }
}

/**
 * 关闭发货对话框
 */
const handleShipDialogClose = () => {
  shipDialogVisible.value = false
  shipFormRef.value?.clearValidate()
}

/**
 * 实时跟踪
 */
const handleTrack = () => {
  ElMessage.success('跳转到物流公司官网跟踪页面...')
}

/**
 * 联系收货人
 */
const handleContact = () => {
  ElMessage.success(`拨打电话：${logisticsInfo.receiverPhone}`)
}

/**
 * 投诉建议
 */
const handleComplaint = () => {
  ElMessage.success('投诉建议功能开发中...')
}



/**
 * 查看订单
 */
const viewOrder = () => {
  if (logisticsInfo.id) {
    safeNavigator.push(`/order/detail/${logisticsInfo.id}`)
  } else {
    // 如果没有ID，尝试通过订单号查找
    const order = orderStore.getOrderByNumber(logisticsInfo.orderNo)
    if (order) {
      safeNavigator.push(`/order/detail/${order.id}`)
    } else {
      ElMessage.warning('未找到对应的订单')
    }
  }
}

/**
 * 查看客户
 */
const viewCustomer = () => {
  safeNavigator.push(`/customer/detail/${logisticsInfo.customerId}`)
}

/**
 * 刷新物流轨迹
 */
const refreshTracking = async () => {
  if (isUnmounted.value) return

  try {
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1000)
      timeoutIds.add(timeoutId)
    })

    if (!isUnmounted.value) {
      ElMessage.success('轨迹已刷新')
      loadTrackingHistory()
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('刷新失败')
    }
  }
}

/**
 * 加载物流轨迹
 */
const loadTrackingHistory = async (order?: any) => {
  if (isUnmounted.value) return

  try {
    // 如果没有传入订单，从订单store获取
    if (!order) {
      const id = route.params.id
      const allOrders = orderStore.getOrders()
      order = allOrders.find(o =>
        o.id === id ||
        o.trackingNumber === id ||
        o.expressNo === id ||
        parseInt(o.id) === parseInt(id)
      )
    }

    if (!order) {
      trackingHistory.value = []
      return
    }

    // 使用订单的物流历史数据
    if (order.logisticsHistory && Array.isArray(order.logisticsHistory) && order.logisticsHistory.length > 0) {
      trackingHistory.value = order.logisticsHistory.map((item: any) => ({
        time: item.time || '',
        status: getLogisticsStatusText(item.status),
        description: item.description || '',
        location: item.location || '',
        operator: item.operator || '',
        type: getTimelineTypeByStatus(item.status)
      })).reverse() // 倒序显示，最新的在上面
    } else {
      // 如果没有物流历史，从状态历史中提取物流相关信息
      if (order.statusHistory && Array.isArray(order.statusHistory)) {
        const logisticsStatuses = ['shipped', 'delivered', 'in_transit', 'out_for_delivery']
        const logisticsHistoryItems = order.statusHistory
          .filter((h: any) => logisticsStatuses.includes(h.status))
          .map((h: any) => ({
            time: h.time || '',
            status: getLogisticsStatusText(h.status),
            description: h.description || h.remark || '',
            location: '',
            operator: h.operator || '',
            type: getTimelineTypeByStatus(h.status)
          }))

        trackingHistory.value = logisticsHistoryItems.reverse()
      } else {
        trackingHistory.value = []
      }
    }
  } catch (error) {
    console.error('加载物流轨迹失败:', error)
    trackingHistory.value = []
  }
}

/**
 * 获取物流状态文本
 */
const getLogisticsStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'picked_up': '已揽收',
    'shipped': '已发货',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'rejected': '拒收',
    'returned': '已退回'
  }
  return textMap[status] || status
}

/**
 * 根据状态获取时间轴类型
 */
const getTimelineTypeByStatus = (status: string): string => {
  const typeMap: Record<string, string> = {
    'delivered': 'success',
    'out_for_delivery': 'warning',
    'shipped': 'primary',
    'in_transit': 'info',
    'picked_up': 'info',
    'exception': 'danger',
    'rejected': 'danger',
    'returned': 'info',
    'pending': 'warning'
  }
  return typeMap[status] || 'info'
}

/**
 * 加载数据
 */
const loadData = async () => {
  if (isUnmounted.value) return

  try {
    const id = route.params.id

    // 从订单store中查找对应的订单
    // id可能是订单ID（字符串或数字）或物流单号，需要查找匹配的订单
    const allOrders = orderStore.getOrders()

    // 先尝试通过ID查找（支持字符串和数字匹配）
    let order = allOrders.find(o =>
      o.id === id ||
      o.id === String(id) ||
      String(o.id) === String(id) ||
      parseInt(String(o.id)) === parseInt(String(id))
    )

    // 如果通过ID找不到，尝试通过物流单号查找
    if (!order) {
      order = allOrders.find(o =>
        o.trackingNumber === id ||
        o.expressNo === id ||
        (o.trackingNumber && o.trackingNumber.toString() === id.toString()) ||
        (o.expressNo && o.expressNo.toString() === id.toString())
      )
    }

    if (!order) {
      ElMessage.error('未找到对应的订单信息')
      return
    }

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 使用真实订单数据填充物流信息
    Object.assign(logisticsInfo, {
      id: order.id,
      trackingNo: order.trackingNumber || order.expressNo || '',
      orderNo: order.orderNumber,
      companyName: getExpressCompanyName(order.expressCompany || ''),
      status: mapOrderStatusToLogisticsStatus(order.status, order.logisticsStatus),
      shipTime: order.shippingTime || order.shipTime || '',
      estimatedTime: order.estimatedDeliveryTime || '',
      actualTime: order.logisticsStatus === 'delivered' ? (order.statusHistory?.find(h => h.status === 'delivered')?.time || '') : '',
      freight: 0, // 运费信息需要从订单或物流信息中获取
      insuranceFee: 0, // 保价费信息需要从订单或物流信息中获取
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      remark: order.remark || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      orderTime: order.createTime || '',
      customerId: order.customerId || ''
    })

    // 使用真实订单商品数据
    if (order.products && Array.isArray(order.products)) {
      productList.value = order.products.map((product: any) => ({
        productName: product.name || '',
        specification: product.specification || '',
        quantity: product.quantity || 0,
        weight: product.weight || 0,
        volume: product.volume || 0
      }))
    } else {
      productList.value = []
    }

    // 使用真实操作日志
    if (order.operationLogs && Array.isArray(order.operationLogs)) {
      operationLogs.value = order.operationLogs.map((log: any) => ({
        time: log.time || '',
        operator: log.operator || '',
        action: log.action || ''
      })).reverse() // 倒序显示，最新的在上面
    } else {
      operationLogs.value = []
    }

    // 加载物流轨迹
    await loadTrackingHistory(order)
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

/**
 * 获取物流公司名称
 */
const getExpressCompanyName = (code: string) => {
  const companies: Record<string, string> = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'HTKY': '百世快递',
    'JD': '京东物流',
    'EMS': '中国邮政',
    'DBKD': '德邦快递',
    'UC': '优速快递'
  }
  return companies[code] || code
}

/**
 * 映射订单状态到物流状态
 */
const mapOrderStatusToLogisticsStatus = (orderStatus: string, logisticsStatus?: string): string => {
  if (logisticsStatus) {
    return logisticsStatus
  }

  const statusMap: Record<string, string> = {
    'pending_shipment': 'pending',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'in_transit': 'in_transit',
    'out_for_delivery': 'delivering',
    'package_exception': 'exception'
  }

  return statusMap[orderStatus] || 'pending'
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
.logistics-detail {
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

.info-card,
.action-card,
.related-card,
.log-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
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

.receiver-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.receiver-basic {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
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

.tracking-timeline {
  max-height: 400px;
  overflow-y: auto;
}

.timeline-content h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.timeline-content p {
  margin: 0 0 8px 0;
  color: #606266;
  line-height: 1.6;
}

.timeline-location,
.timeline-operator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
}

.related-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.related-item {
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 16px;
}

.related-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 500;
  color: #303133;
}

.item-content {
  margin-left: 24px;
}

.item-meta {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.fee-item {
  margin-bottom: 4px;
  color: #606266;
}

.fee-item.total {
  font-weight: 500;
  color: #303133;
  border-top: 1px solid #ebeef5;
  padding-top: 8px;
  margin-top: 8px;
}

.operation-log {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.log-content {
  display: flex;
  gap: 8px;
}

.log-operator {
  font-weight: 500;
  color: #409eff;
}

.log-action {
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .receiver-basic {
    grid-template-columns: 1fr;
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

  .product-summary {
    flex-direction: column;
    gap: 12px;
  }

  .summary-item {
    flex-direction: row;
    justify-content: space-between;
  }
}

/* 打印样式 */
@media print {
  .header-actions,
  .action-card {
    display: none !important;
  }

  .page-header {
    box-shadow: none;
    border: 1px solid #ddd;
  }
}
</style>
