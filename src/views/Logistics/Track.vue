<template>
  <div class="logistics-track">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>物流跟踪</h2>
      <div class="header-actions">
        <el-button @click="handleExport" :icon="Download">
          导出轨迹
        </el-button>
      </div>
    </div>

    <!-- 查询区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="物流单号">
          <el-input
            v-model="searchForm.trackingNo"
            placeholder="请输入物流单号"
            clearable
            style="width: 300px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="searchForm.company"
            placeholder="请选择物流公司"
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="company in logisticsCompanies"
              :key="company.code"
              :label="company.name"
              :value="company.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search" :loading="loading">
            查询轨迹
          </el-button>
          <el-button @click="handleReset" :icon="Refresh">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 跟踪结果 -->
    <el-card v-if="trackingResult.trackingNo" class="result-card">
      <template #header>
        <div class="card-header">
          <div class="header-info">
            <h3>{{ trackingResult.trackingNo }}</h3>
            <el-tag :type="getStatusColor(trackingResult.status)" size="large">
              {{ getStatusText(trackingResult.status) }}
            </el-tag>
          </div>
          <div class="header-actions">
            <el-button @click="handleViewDetail" type="primary" size="small">
              查看详情
            </el-button>
            <el-button @click="refreshTracking" :icon="Refresh" size="small" :loading="refreshLoading">
              刷新轨迹
            </el-button>
          </div>
        </div>
      </template>

      <!-- 基本信息 -->
      <div class="basic-info">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">物流公司：</span>
            <span class="value">{{ trackingResult.companyName }}</span>
          </div>
          <div class="info-item">
            <span class="label">收货人：</span>
            <span class="value">{{ trackingResult.receiverName }}</span>
          </div>
          <div class="info-item">
            <span class="label">联系电话：</span>
            <span class="value">{{ trackingResult.receiverPhone }}</span>
          </div>
          <div class="info-item">
            <span class="label">收货地址：</span>
            <span class="value">{{ trackingResult.receiverAddress }}</span>
          </div>
          <div class="info-item">
            <span class="label">发货时间：</span>
            <span class="value">{{ trackingResult.shipTime }}</span>
          </div>
          <div class="info-item">
            <span class="label">预计送达：</span>
            <span class="value">{{ trackingResult.estimatedTime }}</span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 物流轨迹 -->
      <div class="tracking-timeline">
        <h4>物流轨迹</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in trackingHistory"
            :key="index"
            :timestamp="item.time"
            :type="item.type"
            :icon="getTimelineIcon(item.status)"
          >
            <div class="timeline-content">
              <h5>{{ item.status }}</h5>
              <p>{{ item.description }}</p>
              <div class="timeline-meta">
                <div class="timeline-location" v-if="item.location">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.location }}</span>
                </div>
                <div class="timeline-operator" v-if="item.operator">
                  <el-icon><User /></el-icon>
                  <span>{{ item.operator }}</span>
                </div>
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-card>

    <!-- 空状态 -->
    <el-empty v-else description="请输入物流单号查询轨迹信息" />

    <!-- 批量查询对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量查询"
      width="600px"
    >
      <el-form :model="batchForm" label-width="100px">
        <el-form-item label="物流单号">
          <el-input
            v-model="batchForm.trackingNos"
            type="textarea"
            :rows="6"
            placeholder="请输入物流单号，每行一个"
          />
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="batchForm.company"
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
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialogVisible = false">取消</el-button>
          <el-button @click="handleBatchQuery" type="primary" :loading="batchLoading">
            批量查询
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Search,
  Refresh,
  Download,
  Location,
  User,
  Box,
  Check,
  Warning
} from '@element-plus/icons-vue'

// 路由
const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// Store
const orderStore = useOrderStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const refreshLoading = ref(false)
const batchLoading = ref(false)
const batchDialogVisible = ref(false)

// 超时ID跟踪，用于清理异步操作
const timeoutIds = new Set<NodeJS.Timeout>()

// 组件卸载状态跟踪
const isUnmounted = ref(false)

// 搜索表单
const searchForm = reactive({
  trackingNo: '',
  company: ''
})

// 批量查询表单
const batchForm = reactive({
  trackingNos: '',
  company: ''
})

// 跟踪结果
const trackingResult = reactive({
  trackingNo: '',
  companyName: '',
  status: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  shipTime: '',
  estimatedTime: ''
})

// 物流轨迹
const trackingHistory = ref([])

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

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    'pending': 'info',
    'shipped': 'warning',
    'in_transit': 'primary',
    'delivering': 'primary',
    'delivered': 'success',
    'exception': 'danger'
  }
  return colorMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    'pending': '待发货',
    'shipped': '已发货',
    'in_transit': '运输中',
    'delivering': '派送中',
    'delivered': '已签收',
    'exception': '异常'
  }
  return textMap[status] || '未知'
}

/**
 * 获取时间轴图标
 */
const getTimelineIcon = (status: string) => {
  const iconMap = {
    '已签收': Check,
    '派送中': Box,
    '运输中': Box,
    '已发货': Box,
    '异常': Warning
  }
  return iconMap[status] || Box
}

// 数据范围控制函数
const applyDataScopeControl = (orderList: unknown[]) => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 超级管理员可以查看所有订单
  if (currentUser.role === 'admin') {
    return orderList
  }

  // 部门负责人可以查看本部门所有订单
  if (currentUser.role === 'department_manager') {
    return orderList.filter(order => {
      const orderCreator = userStore.getUserById(order.createdBy)
      return orderCreator?.department === currentUser.department
    })
  }

  // 销售员只能查看自己创建的订单
  if (currentUser.role === 'sales_staff') {
    return orderList.filter(order => order.createdBy === currentUser.id)
  }

  // 客服只能查看自己处理的订单
  if (currentUser.role === 'customer_service') {
    return orderList.filter(order => order.servicePersonId === currentUser.id)
  }

  // 其他角色默认只能查看自己创建的订单
  return orderList.filter(order => order.createdBy === currentUser.id)
}

/**
 * 查询物流轨迹
 */
const handleSearch = async () => {
  if (!searchForm.trackingNo.trim()) {
    ElMessage.warning('请输入物流单号')
    return
  }

  if (isUnmounted.value) return

  loading.value = true

  try {
    const trackingNum = searchForm.trackingNo.trim()

    // 从订单store中查找对应的订单，应用数据范围控制
    const accessibleOrders = applyDataScopeControl(orderStore.orders)

    // 支持多种物流单号字段查询
    let order = accessibleOrders.find(o =>
      o.expressNo === trackingNum ||
      o.trackingNumber === trackingNum ||
      o.expressNumber === trackingNum
    )

    // 如果在订单中没找到,尝试从localStorage的其他数据源查找
    if (!order) {
      const logistics = JSON.parse(localStorage.getItem('crm_logistics') || '[]')
      const shipments = JSON.parse(localStorage.getItem('crm_shipments') || '[]')

      // 在物流记录中查找
      const logisticsRecord = logistics.find(l => l.trackingNumber === trackingNum)
      if (logisticsRecord) {
        order = accessibleOrders.find(o => o.orderNumber === logisticsRecord.orderNumber)
      }

      // 在发货记录中查找
      if (!order) {
        const shipmentRecord = shipments.find(s => s.trackingNumber === trackingNum)
        if (shipmentRecord) {
          order = accessibleOrders.find(o => o.orderNumber === shipmentRecord.orderNumber)
        }
      }
    }

    if (!order) {
      ElMessage.warning('未找到该快递单号对应的订单')
      loading.value = false
      return
    }

    // 获取物流单号(支持多种字段)
    const actualTrackingNo = order.expressNo || order.trackingNumber || order.expressNumber
    const actualCompany = order.expressCompany || order.logisticsCompany || '未知快递'

    if (!actualTrackingNo) {
      ElMessage.warning('该订单尚未发货或缺少物流信息')
      loading.value = false
      return
    }

    // 模拟API调用延迟
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 1000)
      timeoutIds.add(timeoutId)
    })

    // 检查组件是否已卸载
    if (isUnmounted.value) return

    // 使用真实订单数据
    Object.assign(trackingResult, {
      trackingNo: actualTrackingNo,
      companyName: getCompanyName(actualCompany) || actualCompany,
      status: order.status,
      receiverName: order.customerName,
      receiverPhone: order.phone || order.customerPhone || '138****1234',
      receiverAddress: order.address || order.shippingAddress || order.deliveryAddress || '地址未填写',
      shipTime: order.shipTime || order.shippedAt || order.deliveryTime || order.createTime,
      estimatedTime: order.estimatedDeliveryTime || ''
    })

    // 生成基于订单状态的物流轨迹
    const history = []
    const currentTime = new Date()

    // 根据订单状态生成相应的物流轨迹
    if (order.status === 'shipped' || order.status === 'delivered') {
      // 已发货轨迹
      history.push({
        time: order.shipTime || order.shippedAt || order.deliveryTime || order.createTime,
        status: '已发货',
        description: `快件已从${actualCompany}发出，快递单号：${actualTrackingNo}`,
        location: '发货地',
        operator: '物流员',
        type: 'warning'
      })

      // 如果是已送达，添加更多轨迹
      if (order.status === 'delivered') {
        const deliveryTime = new Date(order.shipTime || order.shippedAt || order.deliveryTime || order.createTime)
        deliveryTime.setDate(deliveryTime.getDate() + 1)

        history.unshift({
          time: deliveryTime.toISOString().replace('T', ' ').substring(0, 19),
          status: '运输中',
          description: '快件正在运输途中',
          location: '中转站',
          operator: '系统',
          type: 'info'
        })

        deliveryTime.setDate(deliveryTime.getDate() + 1)
        const receiverAddr = order.address || order.shippingAddress || order.deliveryAddress || '目的地'
        history.unshift({
          time: deliveryTime.toISOString().replace('T', ' ').substring(0, 19),
          status: '派送中',
          description: `快件正在派送中，派送员正在配送至${receiverAddr}`,
          location: receiverAddr.split('省')[0] + '省' || '目的地',
          operator: '派送员',
          type: 'primary'
        })

        deliveryTime.setHours(deliveryTime.getHours() + 4)
        history.unshift({
          time: deliveryTime.toISOString().replace('T', ' ').substring(0, 19),
          status: '已签收',
          description: `您的快件已由${order.customerName}签收，感谢使用${actualCompany}`,
          location: receiverAddr,
          operator: order.customerName,
          type: 'success'
        })
      }
    }

    trackingHistory.value = history

    if (!isUnmounted.value) {
      ElMessage.success('查询成功')
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('查询失败，请稍后重试')
    }
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

/**
 * 重置搜索
 */
const handleReset = () => {
  searchForm.trackingNo = ''
  searchForm.company = ''
  Object.assign(trackingResult, {
    trackingNo: '',
    companyName: '',
    status: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    shipTime: '',
    estimatedTime: ''
  })
  trackingHistory.value = []
}

/**
 * 刷新轨迹
 */
const refreshTracking = async () => {
  if (!trackingResult.trackingNo || isUnmounted.value) return

  refreshLoading.value = true

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
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('刷新失败')
    }
  } finally {
    if (!isUnmounted.value) {
      refreshLoading.value = false
    }
  }
}

/**
 * 查看详情
 */
const handleViewDetail = () => {
  if (!trackingResult.trackingNo) {
    ElMessage.warning('请先查询物流轨迹')
    return
  }

  safeNavigator.push(`/logistics/track/detail/${trackingResult.trackingNo}`)
}

/**
 * 导出轨迹
 */
const handleExport = () => {
  if (!trackingResult.trackingNo) {
    ElMessage.warning('请先查询物流轨迹')
    return
  }

  ElMessage.success('导出功能开发中...')
}

/**
 * 批量查询
 */
const handleBatchQuery = async () => {
  if (!batchForm.trackingNos.trim()) {
    ElMessage.warning('请输入物流单号')
    return
  }

  if (isUnmounted.value) return

  batchLoading.value = true

  try {
    // 模拟API调用
    await new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        timeoutIds.delete(timeoutId)
        resolve(undefined)
      }, 2000)
      timeoutIds.add(timeoutId)
    })

    if (!isUnmounted.value) {
      ElMessage.success('批量查询完成')
      batchDialogVisible.value = false
    }
  } catch (error) {
    if (!isUnmounted.value) {
      ElMessage.error('批量查询失败')
    }
  } finally {
    if (!isUnmounted.value) {
      batchLoading.value = false
    }
  }
}

/**
 * 获取物流公司名称
 */
const getCompanyName = (code: string) => {
  const company = logisticsCompanies.value.find(c => c.code === code)
  return company?.name || ''
}

// 生命周期钩子
onMounted(() => {
  // 启动物流同步服务
  orderStore.setupLogisticsEventListener()
  orderStore.startLogisticsAutoSync()

  // 检查路由参数并自动搜索
  const trackingNo = route.query.trackingNo as string
  const company = route.query.company as string

  if (trackingNo) {
    searchForm.trackingNo = trackingNo
    if (company) {
      searchForm.company = company
    }
    // 自动执行搜索
    handleSearch()
  }

  // 监听订单变化，当物流信息更新时自动刷新
  orderStore.$subscribe((mutation, state) => {
    // 如果当前正在查看某个快递单号，且该订单的物流信息发生变化，则自动刷新
    if (trackingResult.trackingNo && mutation.events.some(event =>
      event.key === 'expressNo' ||
      event.key === 'expressCompany' ||
      event.key === 'status'
    )) {
      const accessibleOrders = applyDataScopeControl(orderStore.orders)
      const updatedOrder = accessibleOrders.find(o => o.expressNo === trackingResult.trackingNo)
      if (updatedOrder) {
        // 自动刷新当前查询结果
        handleSearch()
      }
    }
  })
})

// 组件卸载时清理异步操作
onBeforeUnmount(() => {
  // 设置组件卸载状态
  isUnmounted.value = true

  // 清理所有未完成的超时操作
  timeoutIds.forEach(timeoutId => {
    clearTimeout(timeoutId)
  })
  timeoutIds.clear()
})
</script>

<style scoped>
.logistics-track {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card,
.result-card {
  margin-bottom: 20px;
}

.search-form {
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h3 {
  margin: 0;
  color: #303133;
}

.basic-info {
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
}

.tracking-timeline h4 {
  margin: 0 0 20px 0;
  color: #303133;
}

.timeline-content h5 {
  margin: 0 0 8px 0;
  color: #303133;
  font-size: 14px;
}

.timeline-content p {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 13px;
}

.timeline-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.timeline-location,
.timeline-operator {
  display: flex;
  align-items: center;
  gap: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .header-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .timeline-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
