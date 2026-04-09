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
            <el-tag :style="getLogisticsStatusStyle(logisticsInfo.status)" size="large" effect="plain">
              {{ getLogisticsStatusTextFromConfig(logisticsInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
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
              <el-tag :style="getLogisticsStatusStyle(logisticsInfo.status)" class="value" effect="plain">
                {{ getLogisticsStatusTextFromConfig(logisticsInfo.status) }}
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
                  <!-- 🔥 根据物流动态内容显示不同颜色 -->
                  <p :style="getLogisticsInfoStyle(item.description)">{{ item.description }}</p>
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
              @click="handleOpenOfficialTracking"
              type="primary"
              :icon="Link"
              style="width: 100%; margin-bottom: 12px;"
              :disabled="!logisticsInfo.trackingNo"
            >
              官网查物流
            </el-button>
            <el-button
              @click="handleContact"
              type="success"
              :icon="Phone"
              style="width: 100%; margin-bottom: 12px;"
            >
              联系收货人
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
  Edit,
  Box,
  Phone,
  Link,
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
import {
  getLogisticsStatusText as getLogisticsStatusTextFromConfig,
  getLogisticsStatusStyle,
  getLogisticsInfoStyle,
  detectLogisticsStatusFromDescription as _detectLogisticsStatusFromDescription
} from '@/utils/logisticsStatusConfig'

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
  orderTime: '',
  customerId: ''
})

// 商品列表
const productList = ref<Array<{ productName: string; specification: string; quantity: number; weight: number; volume: number }>>([])

// 物流轨迹
interface TrackingHistoryItem {
  time: string
  status: string
  description: string
  location: string
  operator: string
  type: string
}
const trackingHistory = ref<TrackingHistoryItem[]>([])

// 操作日志
interface OperationLogItem {
  time: string
  operator: string
  action: string
}
const operationLogs = ref<OperationLogItem[]>([])

// 物流公司列表 - 从API动态获取
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

// 🔥 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.getActiveCompanies()
    if (response?.success && Array.isArray(response.data) && response.data.length > 0) {
      logisticsCompanies.value = response.data.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name
      }))
    }
  } catch (error) {
    console.warn('[物流详情] 加载物流公司列表失败，使用默认列表')
  }
}

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
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
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

    // 🔥 调用后端API更新订单状态（后端会自动发送通知）
    const { orderApi } = await import('@/api/order')
    const orderId = logisticsInfo.orderNo.replace('ORD', '')

    await orderApi.update(orderId, {
      status: 'shipped',
      trackingNumber: shipForm.trackingNo,
      expressCompany: shipForm.company,
      shippedAt: new Date().toISOString(),
      remark: shipForm.remark || `已发货，快递公司：${shipForm.company}，运单号：${shipForm.trackingNo}`
    })

    if (!isUnmounted.value) {
      // 同步更新前端store
      orderStore.syncOrderStatus(
        orderId,
        'shipped',
        '物流员',
        `订单已发货，快递公司：${shipForm.company}，快递单号：${shipForm.trackingNo}`
      )

      // 🔥 注意：发货通知已由后端API自动发送，无需前端重复发送

      ElMessage.success('发货成功')
      handleShipDialogClose()
      loadData()
    }
  } catch (error) {
    console.error('发货失败:', error)
    ElMessage.error('发货失败，请重试')
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
 * 联系收货人 - 不显示完整手机号
 */
const handleContact = () => {
  if (!logisticsInfo.receiverPhone) {
    ElMessage.warning('收货人电话未设置')
    return
  }

  ElMessageBox.confirm(
    '确定要拨打收货人电话吗？',
    '外呼确认',
    {
      confirmButtonText: '确定外呼',
      cancelButtonText: '取消',
      type: 'info'
    }
  ).then(() => {
    // 模拟外呼功能
    ElMessage.success('正在发起外呼...')
    // 实际项目中这里可以调用外呼API
    // window.location.href = `tel:${logisticsInfo.receiverPhone}`
  }).catch(() => {
    // 用户取消
  })
}

/**
 * 官网查物流 - 复制快递单号并跳转对应物流公司官网
 */
const handleOpenOfficialTracking = async () => {
  if (!logisticsInfo.trackingNo) {
    ElMessage.warning('暂无物流单号')
    return
  }

  // 导入物流公司配置
  const { getLogisticsCompanyByName, copyTrackingNumber, openOfficialWebsite } = await import('@/utils/logisticsCompanyConfig')

  // 获取物流公司信息
  const companyInfo = getLogisticsCompanyByName(logisticsInfo.companyName)

  if (!companyInfo) {
    // 如果找不到对应的物流公司，只复制单号
    await copyTrackingNumber(logisticsInfo.trackingNo)
    ElMessage.warning('未找到对应物流公司官网，已复制快递单号')
    return
  }

  // 复制快递单号
  const copied = await copyTrackingNumber(logisticsInfo.trackingNo)

  if (copied) {
    // 打开官网
    openOfficialWebsite(companyInfo.code, logisticsInfo.trackingNo)
    ElMessage.success(`快递单号已复制，正在跳转${companyInfo.name}官网...`)
  }
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
 * 刷新物流轨迹 - 调用真实API
 */
const refreshTracking = async () => {
  if (isUnmounted.value) return

  try {
    await loadTrackingHistory()
    if (!isUnmounted.value) {
      ElMessage.success('轨迹已刷新')
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('刷新失败')
    }
  }
}

/**
 * 加载物流轨迹 - 优先从真实API获取
 */
const loadTrackingHistory = async (order?: any) => {
  if (isUnmounted.value) return

  try {
    // 如果没有传入订单，从API或store获取
    if (!order) {
      const id = route.params.id
      try {
        const { apiService } = await import('@/services/apiService')
        const response = await apiService.get(`/orders/${id}`)
        if (response) {
          order = response
        }
      } catch (_) {
        // fallback to store
      }
      if (!order) {
        const allOrders = orderStore.getOrders()
        order = allOrders.find(o =>
          o.id === id ||
          o.id === String(id) ||
          String(o.id) === String(id) ||
          o.trackingNumber === id ||
          o.expressNo === id
        )
      }
    }

    if (!order) {
      trackingHistory.value = []
      return
    }

    // 🔥 优先从真实物流API获取轨迹
    const trackingNo = order.trackingNumber || order.expressNo
    const companyCode = order.expressCompany
    if (trackingNo && companyCode) {
      try {
        const { logisticsApi } = await import('@/api/logistics')
        const phone = order.receiverPhone || order.customerPhone || undefined
        const response = await logisticsApi.queryTrace(trackingNo, companyCode, phone)

        if (response?.success && response.data?.success && response.data.traces?.length > 0) {
          const sortedTraces = [...response.data.traces].sort((a: any, b: any) => {
            const timeA = new Date(a.time).getTime()
            const timeB = new Date(b.time).getTime()
            return timeB - timeA
          })

          trackingHistory.value = sortedTraces.map((trace: any, index: number) => ({
            time: trace.time || '',
            status: detectStatusTextFromDesc(trace.description),
            description: trace.description || '',
            location: trace.location || '',
            operator: trace.operator || '',
            type: index === 0 ? 'success' : 'primary'
          }))

          // 🔥 同步更新物流状态
          if (response.data.status && response.data.status !== 'error' && response.data.status !== 'need_phone_verify') {
            logisticsInfo.status = response.data.status
          }
          if (response.data.estimatedDeliveryTime) {
            logisticsInfo.estimatedTime = response.data.estimatedDeliveryTime
          }

          console.log('[物流详情] 从API获取到', trackingHistory.value.length, '条轨迹')
          return
        }
      } catch (apiError) {
        console.warn('[物流详情] 物流API查询失败，使用本地数据:', apiError)
      }
    }

    // 🔥 API获取失败时使用本地数据
    if (order.logisticsHistory && Array.isArray(order.logisticsHistory) && order.logisticsHistory.length > 0) {
      trackingHistory.value = order.logisticsHistory.map((item: any) => ({
        time: item.time || '',
        status: getLogisticsStatusText(item.status),
        description: item.description || '',
        location: item.location || '',
        operator: item.operator || '',
        type: getTimelineTypeByStatus(item.status)
      })).reverse()
    } else if (order.statusHistory && Array.isArray(order.statusHistory)) {
      const logisticsStatuses = ['shipped', 'delivered', 'in_transit', 'out_for_delivery', 'picked_up']
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
  } catch (error) {
    console.error('加载物流轨迹失败:', error)
    trackingHistory.value = []
  }
}

/**
 * 根据轨迹描述检测状态文本
 */
const detectStatusTextFromDesc = (desc: string): string => {
  if (!desc) return '物流动态'
  const d = desc.toLowerCase()
  if (d.includes('签收') || d.includes('已送达') || d.includes('代收')) return '已签收'
  if (d.includes('派送') || d.includes('派件') || d.includes('投递') || d.includes('送货')) return '派送中'
  if (d.includes('到达') || d.includes('运输') || d.includes('转运') || d.includes('发往') || d.includes('离开')) return '运输中'
  if (d.includes('揽收') || d.includes('收件') || d.includes('已收取') || d.includes('快件已收')) return '已揽收'
  if (d.includes('拒收') || d.includes('拒签')) return '拒收'
  if (d.includes('退回') || d.includes('退件')) return '退回'
  if (d.includes('异常') || d.includes('问题件')) return '异常'
  return '物流动态'
}

/**
 * 获取物流状态文本
 */
const getLogisticsStatusText = (status: string): string => {
  const textMap: Record<string, string> = {
    'pending': '待发货',
    'pending_shipment': '待发货',
    'picked_up': '已揽收',
    'shipped': '已发货',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivering': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收退回',
    'returned': '已退回',
    'cancelled': '已取消',
    'unknown': '未知'
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
    console.log('[物流详情] 加载数据，参数ID:', id)

    // 🔥 首先尝试从API获取订单数据
    let order = null
    try {
      const { apiService } = await import('@/services/apiService')
      const response = await apiService.get(`/orders/${id}`)
      // 🔥 修复：apiService.get 直接返回 data，不需要再访问 .data
      if (response) {
        order = response
        console.log('[物流详情] 从API获取订单成功:', order.orderNumber)
      }
    } catch (_apiError) {
      console.log('[物流详情] API获取失败，尝试从store查找')
    }

    // 如果API获取失败，从订单store中查找
    if (!order) {
      const allOrders = orderStore.getOrders()
      console.log('[物流详情] store中订单总数:', allOrders.length)

      // 先尝试通过ID查找（支持字符串和数字匹配）
      order = allOrders.find(o =>
        o.id === id ||
        o.id === String(id) ||
        String(o.id) === String(id)
      )

      // 如果通过ID找不到，尝试通过物流单号查找
      if (!order) {
        order = allOrders.find(o =>
          o.trackingNumber === id ||
          o.expressNo === id
        )
      }

      // 如果还找不到，尝试通过订单号查找
      if (!order) {
        order = allOrders.find(o => o.orderNumber === id)
      }
    }

    if (!order) {
      console.error('[物流详情] 未找到订单，参数ID:', id)
      ElMessage.error('未找到对应的订单信息')
      return
    }

    console.log('[物流详情] 找到订单:', order.orderNumber, order.id)

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 使用真实订单数据填充物流信息
    Object.assign(logisticsInfo, {
      id: order.id,
      trackingNo: order.trackingNumber || order.expressNo || '',
      orderNo: order.orderNumber,
      companyName: getExpressCompanyName(order.expressCompany || ''),
      status: mapOrderStatusToLogisticsStatus(order.status, order.logisticsStatus),
      // 🔥 修复：优先使用shippingTime，其次shippedAt
      shipTime: order.shippingTime || order.shippedAt || '',
      estimatedTime: order.expectedDeliveryDate || '',
      // 🔥 修复：使用deliveredAt作为实际送达时间
      actualTime: order.deliveredAt || '',
      freight: 0, // 运费信息需要从订单或物流信息中获取
      insuranceFee: 0, // 保价费信息需要从订单或物流信息中获取
      receiverName: order.receiverName || order.customerName || '',
      receiverPhone: order.receiverPhone || order.customerPhone || '',
      receiverAddress: order.receiverAddress || '',
      remark: order.remark || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      orderTime: order.createTime || '',
      customerId: order.customerId || ''
    })

    console.log('[物流详情] 物流信息已加载:', logisticsInfo)

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

    // 🔥 使用真实操作日志（优先operationLogs，其次statusHistory作为fallback）
    if (order.operationLogs && Array.isArray(order.operationLogs) && order.operationLogs.length > 0) {
      operationLogs.value = order.operationLogs.map((log: any) => ({
        time: log.time || log.createdAt || '',
        operator: log.operator || log.operatorName || log.createdBy || '',
        action: log.action || log.description || log.remark || ''
      })).reverse() // 倒序显示，最新的在上面
    } else if (order.statusHistory && Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
      // 🔥 使用状态变更历史作为操作日志
      operationLogs.value = order.statusHistory.map((h: any) => ({
        time: h.time || h.createdAt || '',
        operator: h.operator || h.operatorName || h.createdBy || '系统',
        action: h.description || h.remark || `状态变更为: ${getLogisticsStatusText(h.status)}`
      })).reverse()
    } else {
      // 🔥 至少显示一条基本日志
      const logs = []
      if (order.shippingTime || order.shippedAt) {
        logs.push({
          time: order.shippingTime || order.shippedAt,
          operator: order.createdByName || '操作员',
          action: `已发货，快递公司：${getExpressCompanyName(order.expressCompany || '')}，单号：${order.trackingNumber || order.expressNo || ''}`
        })
      }
      if (order.createTime) {
        logs.push({
          time: order.createTime,
          operator: order.createdByName || '操作员',
          action: '创建订单'
        })
      }
      operationLogs.value = logs
    }

    // 加载物流轨迹
    await loadTrackingHistory(order)
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  }
}

/**
 * 获取物流公司名称 - 优先从动态加载的列表中匹配
 */
const getExpressCompanyName = (code: string) => {
  if (!code) return '-'
  // 优先从API加载的列表匹配
  const dynamicCompany = logisticsCompanies.value.find(c =>
    c.code === code || c.code.toUpperCase() === code.toUpperCase()
  )
  if (dynamicCompany) return dynamicCompany.name

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
    'UC': '优速快递',
    'JTSD': '极兔速递',
    'DBL': '德邦快递'
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
    'pending': 'pending',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'in_transit': 'in_transit',
    'out_for_delivery': 'out_for_delivery',
    'delivering': 'out_for_delivery',
    'package_exception': 'exception',
    'exception': 'exception',
    'rejected': 'rejected',
    'rejected_returned': 'returned',
    'returned': 'returned',
    'cancelled': 'cancelled',
    'picked_up': 'picked_up'
  }

  return statusMap[orderStatus] || 'pending'
}

// 生命周期钩子
onMounted(() => {
  loadLogisticsCompanies()
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
