<template>
  <div class="logistics-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>物流列表</h1>
        <p>管理和跟踪所有物流订单</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="物流单号">
          <el-input
            v-model="searchForm.trackingNo"
            placeholder="请输入物流单号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNo"
            placeholder="请输入订单号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="物流状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="待发货" value="pending" />
            <el-option label="已发货" value="shipped" />
            <el-option label="运输中" value="in_transit" />
            <el-option label="已送达" value="delivered" />
            <el-option label="异常" value="exception" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="searchForm.company"
            placeholder="请选择物流公司"
            clearable
            style="width: 150px"
          >
            <el-option label="顺丰速运" value="sf" />
            <el-option label="圆通速递" value="yt" />
            <el-option label="中通快递" value="zt" />
            <el-option label="申通快递" value="st" />
            <el-option label="韵达速递" value="yd" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <DynamicTable
      :data="tableData"
      :columns="tableColumns"
      storage-key="logistics-list-columns"
      title="物流列表"
      :loading="loading"
      :show-selection="true"
      :show-index="false"
      :pagination="{
        currentPage: pagination.page,
        pageSize: pagination.size,
        total: total
      }"
      @selection-change="handleSelectionChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 物流单号列 -->
      <template #column-trackingNo="{ row }">
        <el-link type="primary" @click="handleViewDetail(row)">
          {{ row.trackingNo }}
        </el-link>
      </template>

      <!-- 物流公司列 -->
      <template #column-company="{ row }">
        <el-tag>{{ getCompanyName(row.company) }}</el-tag>
      </template>

      <!-- 状态列 -->
      <template #column-status="{ row }">
        <el-tag :type="getStatusType(row.status)">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <el-button
          type="primary"
          size="small"
          @click="handleTrack(row)"
        >
          跟踪
        </el-button>
        <el-button
          type="success"
          size="small"
          @click="handleEdit(row)"
        >
          编辑
        </el-button>
        <el-button
          type="info"
          size="small"
          @click="handleViewDetail(row)"
        >
          详情
        </el-button>
      </template>
    </DynamicTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import DynamicTable from '@/components/DynamicTable.vue'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { createSafeNavigator } from '@/utils/navigation'

interface LogisticsItem {
  id: number
  trackingNo: string
  orderNo: string
  customerName: string
  company: string
  status: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'exception'
  destination: string
  shipDate: string
  estimatedDate: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// Store
const orderStore = useOrderStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const total = ref(0)
const selectedRows = ref<LogisticsItem[]>([])

// 搜索表单
const searchForm = reactive({
  trackingNo: '',
  orderNo: '',
  status: '',
  company: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20
})

// 表格数据
const tableData = ref<LogisticsItem[]>([])

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'trackingNo',
    label: '物流单号',
    width: 180,
    visible: true
  },
  {
    prop: 'orderNo',
    label: '订单号',
    width: 150,
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 120,
    visible: true
  },
  {
    prop: 'company',
    label: '物流公司',
    width: 120,
    visible: true
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    visible: true
  },
  {
    prop: 'destination',
    label: '目的地',
    width: 150,
    visible: true
  },
  {
    prop: 'shipDate',
    label: '发货时间',
    width: 180,
    visible: true
  },
  {
    prop: 'estimatedDate',
    label: '预计送达',
    width: 180,
    visible: true
  }
])

// 获取物流公司名称
const getCompanyName = (code: string) => {
  const companies: Record<string, string> = {
    sf: '顺丰速运',
    yt: '圆通速递',
    zt: '中通快递',
    st: '申通快递',
    yd: '韵达速递'
  }
  return companies[code] || code
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'info',
    shipped: 'primary',
    in_transit: 'warning',
    delivered: 'success',
    exception: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待发货',
    shipped: '已发货',
    in_transit: '运输中',
    delivered: '已送达',
    exception: '异常'
  }
  return texts[status] || status
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    trackingNo: '',
    orderNo: '',
    status: '',
    company: ''
  })
  pagination.page = 1
  loadData()
}

// 刷新
const handleRefresh = () => {
  loadData()
}

// 数据范围控制函数
const applyDataScopeControl = (orderList: any[]) => {
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

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 从订单store获取已发货且有快递单号的订单，应用数据范围控制
    const allOrders = applyDataScopeControl(orderStore.orders)
    const shippedOrders = allOrders.filter(order => 
      order.status === 'shipped' && 
      order.expressNo && 
      order.expressCompany
    )
    
    // 转换为物流列表格式
    let logisticsData = shippedOrders.map(order => ({
      id: parseInt(order.id),
      trackingNo: order.expressNo,
      orderNo: order.orderNumber,
      customerName: order.customerName,
      company: order.expressCompany,
      status: 'shipped' as const,
      destination: order.address,
      shipDate: order.shipTime || new Date().toISOString(),
      estimatedDate: order.estimatedDeliveryTime || ''
    }))
    
    // 应用搜索过滤
    if (searchForm.trackingNo) {
      logisticsData = logisticsData.filter(item => 
        item.trackingNo.includes(searchForm.trackingNo)
      )
    }
    
    if (searchForm.orderNo) {
      logisticsData = logisticsData.filter(item => 
        item.orderNo.includes(searchForm.orderNo)
      )
    }
    
    if (searchForm.status) {
      logisticsData = logisticsData.filter(item => 
        item.status === searchForm.status
      )
    }
    
    if (searchForm.company) {
      logisticsData = logisticsData.filter(item => 
        item.company === searchForm.company
      )
    }
    
    // 分页处理
    const startIndex = (pagination.page - 1) * pagination.size
    const endIndex = startIndex + pagination.size
    tableData.value = logisticsData.slice(startIndex, endIndex)
    total.value = logisticsData.length
    
  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('Load data error:', error)
  } finally {
    loading.value = false
  }
}

// 选择变化
const handleSelectionChange = (selection: LogisticsItem[]) => {
  selectedRows.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadData()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

// 跟踪物流
const handleTrack = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/track/detail/${row.trackingNo}`)
}

// 编辑
const handleEdit = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/edit/${row.id}`)
}

// 查看详情
const handleViewDetail = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/detail/${row.id}`)
}

// 组件挂载
onMounted(() => {
  loadData()
  
  // 监听订单状态变化，当有新的发货订单时自动刷新列表
  orderStore.setupLogisticsEventListener()
  orderStore.startLogisticsAutoSync()
  
  // 监听订单变化
  orderStore.$subscribe((mutation, state) => {
    // 当订单状态变化时，重新加载物流数据
    if (mutation.events.some(event => 
      event.key === 'status' || 
      event.key === 'expressNo' || 
      event.key === 'expressCompany'
    )) {
      loadData()
    }
  })
})
</script>

<style scoped>
.logistics-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #606266;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logistics-list {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .search-form {
    flex-direction: column;
  }
  
  .search-form .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }
}
</style>