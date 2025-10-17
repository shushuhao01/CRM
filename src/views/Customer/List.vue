<template>
  <div class="customer-list">
    
    <!-- 第一行：统计汇总卡片 -->
    <div class="summary-cards-row">
      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.totalCustomers }}</div>
            <div class="card-label">总客户数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon active">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.activeCustomers }}</div>
            <div class="card-label">活跃客户</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon new">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.newCustomers }}</div>
            <div class="card-label">新增客户</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon high-value">
            <el-icon><Star /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.highValueCustomers }}</div>
            <div class="card-label">高价值客户</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 第二行：快捷筛选 -->
    <div class="quick-filters-row">
      <div class="quick-filter-buttons">
        <el-button 
          v-for="filter in quickFilterOptions" 
          :key="filter.value"
          :type="quickFilter === filter.value ? 'primary' : ''"
          :plain="quickFilter !== filter.value"
          round
          size="small"
          @click="handleQuickFilterChange(filter.value)"
        >
          {{ filter.label }}
        </el-button>
      </div>
    </div>

    <!-- 第三行：搜索筛选器 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" label-width="80px" class="search-form">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="关键词">
              <el-input 
                v-model="searchForm.keyword" 
                placeholder="客户姓名、电话或编码" 
                clearable 
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="选择日期">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户等级">
              <el-select v-model="searchForm.level" placeholder="请选择" clearable style="width: 100%">
                <el-option label="普通" value="normal" />
                <el-option label="白银" value="silver" />
                <el-option label="黄金" value="gold" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户状态">
              <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 100%">
                <el-option label="活跃" value="active" />
                <el-option label="非活跃" value="inactive" />
                <el-option label="潜在客户" value="potential" />
                <el-option label="流失客户" value="lost" />
                <el-option label="黑名单" value="blacklist" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户来源">
              <el-select v-model="searchForm.source" placeholder="请选择" clearable style="width: 100%">
                <el-option label="线上推广" value="online" />
                <el-option label="线下活动" value="offline" />
                <el-option label="客户推荐" value="referral" />
                <el-option label="电话营销" value="telemarketing" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
              <el-button @click="handleReset" :icon="Refresh">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 第四行：客户列表 -->
    <DynamicTable
      :data="customerList"
      :columns="tableColumns"
      storage-key="customer-list-columns"
      title="客户列表"
      :loading="loading"
      :show-selection="true"
      :show-actions="true"
      :total="totalCount"
      :page-sizes="[10, 20, 50, 100]"
      @selection-change="handleSelectionChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      class="customer-table"
    >
      <!-- 头部操作区 -->
      <template #header-actions>
        <el-button 
          type="primary" 
          @click="handleAdd"
          v-if="userStore.isAdmin || userStore.currentUser?.role === 'manager'"
        >
          <el-icon><Plus /></el-icon>
          新建客户
        </el-button>
        <el-button 
          type="success" 
          @click="handleBatchExport"
          v-if="showExportButtons"
        >
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button 
          type="warning" 
          @click="handleSelectedExport"
          :disabled="selectedCustomers.length === 0"
          v-if="showExportButtons && selectedCustomers.length > 0"
        >
          <el-icon><Download /></el-icon>
          导出选中 ({{ selectedCustomers.length }})
        </el-button>
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </template>

      <!-- 客户编码列 -->
      <template #column-code="{ row }">
        <el-button 
          type="text" 
          @click="handleView(row)"
          class="code-link"
        >
          {{ row.code || 'N/A' }}
        </el-button>
      </template>

      <!-- 客户姓名列 -->
      <template #column-name="{ row }">
        <el-button 
          type="text" 
          @click="handleView(row)"
          class="name-link"
        >
          {{ row.name }}
        </el-button>
      </template>

      <!-- 手机号列 -->
      <template #column-phone="{ row }">
        <el-button 
          type="text" 
          @click="handleView(row)"
          class="phone-link"
        >
          {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
        </el-button>
      </template>

      <!-- 客户等级列 -->
      <template #column-level="{ row }">
        <el-tag :type="getLevelType(row.level)">{{ getLevelText(row.level) }}</el-tag>
      </template>

      <!-- 分配来源列 -->
      <template #column-allocationSource="{ row }">
        <span v-if="isAllocatedCustomer(row)" class="allocated">分配</span>
        <span v-else class="self-created">自建</span>
      </template>

      <!-- 客户状态列 -->
      <template #column-status="{ row }">
        <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
      </template>

      <!-- 负责销售列 -->
      <template #column-salesPerson="{ row }">
        {{ getSalesPersonName(row.salesPersonId) }}
      </template>

      <!-- 分享状态列 -->
      <template #column-shareStatus="{ row }">
        <div v-if="row.shareInfo && row.shareInfo.status === 'active'">
          <el-tag :type="getShareStatusType(row.shareInfo)" size="small">
            {{ row.shareInfo.expireTime ? '限时分享' : '永久分享' }}
          </el-tag>
          <div v-if="row.shareInfo.expireTime" class="expire-time">
            <el-text size="small" type="info">
              剩余: {{ formatRemainingTime(row.shareInfo.expireTime) }}
            </el-text>
          </div>
        </div>
        <el-text v-else size="small" type="info">未分享</el-text>
      </template>

      <!-- 操作列 -->
       <template #table-actions="{ row }">
         <el-button type="text" size="small" @click="handleView(row)">详情</el-button>
         <el-button type="text" size="small" @click="handleOrder(row)">下单</el-button>
         <el-button type="text" size="small" @click="handleCall(row)">外呼</el-button>
         <el-button type="text" size="small" @click="handleShare(row)" v-if="userStore.isAdmin">分享</el-button>
       </template>
      </DynamicTable>

    <!-- 分享客户弹窗 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享客户"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="currentShareCustomer" class="share-dialog-content">
        <!-- 客户信息 -->
        <div class="customer-info">
          <h4>客户信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="客户姓名">{{ currentShareCustomer.name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ displaySensitiveInfoNew(currentShareCustomer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}</el-descriptions-item>
            <el-descriptions-item label="客户等级">
              <el-tag :type="getLevelType(currentShareCustomer.level)" size="small">
                {{ getLevelText(currentShareCustomer.level) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前归属">{{ getSalesPersonName(currentShareCustomer.salesPersonId) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 分享设置 -->
        <div class="share-settings">
          <h4>分享设置</h4>
          <el-form :model="shareForm" label-width="100px">
            <el-form-item label="分享给" required>
              <el-select
                v-model="shareForm.targetUserId"
                placeholder="请选择销售人员"
                style="width: 100%"
                filterable
              >
                <el-option
                  v-for="user in salesUsers.filter(u => u.id !== currentShareCustomer.salesPersonId)"
                  :key="user.id"
                  :label="`${user.name} (${user.department})`"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="时间限制" required>
              <el-select v-model="shareForm.timeLimit" style="width: 100%">
                <el-option
                  v-for="option in timeLimitOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <div class="time-limit-tip">
                <el-text size="small" type="info">
                  {{ shareForm.timeLimit === 0 ? '永久分享，不会自动回收' : `${shareForm.timeLimit}天后自动回收到原归属人` }}
                </el-text>
              </div>
            </el-form-item>
            
            <el-form-item label="分享备注">
              <el-input
                v-model="shareForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入分享原因或备注信息（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showShareDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmShare" :loading="loading">
            确认分享
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch, onActivated, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Refresh, User, UserFilled, Star, Search } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore } from '@/stores/notification'
import { maskPhone, formatPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { exportBatchCustomers, exportSingleCustomer, type ExportCustomer } from '@/utils/export'
import DynamicTable from '@/components/DynamicTable.vue'
import { createSafeNavigator } from '@/utils/navigation'

// 接口定义
interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  level: string
  status: string
  source: string
  createdBy?: string
  shareInfo?: {
    status: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)
// 新增：刷新参数处理标记，避免重复清理查询参数导致的重复导航
const refreshHandled = ref(false)

// 确保用户已登录，如果没有则跳转到登录页面
const ensureUserLoggedIn = async () => {
  console.log('=== 检查用户登录状态 ===')
  console.log('当前用户:', userStore.currentUser)
  console.log('是否已登录:', userStore.isLoggedIn)
  
  if (!userStore.isLoggedIn || !userStore.currentUser) {
    console.log('用户未登录，跳转到登录页面...')
    ElMessage.warning('请先登录')
    router.push('/login')
    return false
  } else {
    console.log('用户已登录，角色:', userStore.currentUser.role)
    return true
  }
}

// 响应式数据
const loading = ref(false)
const selectedCustomers = ref([])
const searchForm = reactive({
  keyword: '',  // 统一搜索框，支持姓名、手机号、编码
  level: '',
  status: '',
  source: '',
  dateRange: [] as string[]  // 明确指定类型，确保初始化为空数组
})

// 统计数据
const summaryData = reactive({
  totalCustomers: 0,
  activeCustomers: 0,
  newCustomers: 0,
  highValueCustomers: 0
})

// 快捷筛选 - 默认显示所有客户，避免新客户被日期过滤隐藏
const quickFilter = ref('all')

// 快捷筛选选项
const quickFilterOptions = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '7天' },
  { value: 'month', label: '30天' },
  { value: 'year', label: '年度' },
  { value: 'all', label: '全部' }
]

const pagination = reactive({
  page: 1,
  size: 10,  // 默认显示10条记录，支持扩展和翻页
  total: 0
})

// 销售人员数据
const salesUsers = ref([
  { id: 'sales1', name: '张销售', department: '销售一部' },
  { id: 'sales2', name: '李销售', department: '销售二部' },
  { id: 'sales3', name: '王销售', department: '销售一部' },
  { id: 'admin', name: '管理员', department: '管理部' }
])

// 权限检查
const hasExportPermission = computed(() => {
  // 超级管理员拥有完整导出权限
  if (userStore.isSuperAdmin) {
    return true
  }
  
  // 检查是否有customer.export权限
  return userStore.permissions.includes('customer.export')
})

// 是否显示导出按钮
const showExportButtons = computed(() => {
  return userStore.isSuperAdmin || hasExportPermission.value
})

// 表格列配置
const tableColumns = computed(() => [
  { prop: 'code', label: '客户编码', minWidth: 130, visible: true },
  { prop: 'name', label: '客户姓名', minWidth: 100, visible: true },
  { prop: 'phone', label: '手机号', width: 130, visible: true },
  { prop: 'age', label: '年龄', width: 70, visible: true },
  { prop: 'address', label: '地址', minWidth: 180, showOverflowTooltip: true, visible: true },
  { prop: 'level', label: '客户等级', width: 90, visible: true },
  { prop: 'allocationSource', label: '来源', width: 70, visible: true },
  { 
    prop: 'status', 
    label: '客户状态', 
    width: 90, 
    visible: userStore.isManager || userStore.isSuperAdmin 
  },
  { prop: 'salesPerson', label: '负责销售', minWidth: 100, visible: true },
  { 
    prop: 'shareStatus', 
    label: '分享状态', 
    width: 120, 
    visible: userStore.isAdmin 
  },
  { prop: 'orderCount', label: '订单数', width: 70, visible: true },
  { prop: 'createTime', label: '添加时间', width: 160, visible: true }
])

// 计算搜索结果 - 直接使用所有客户数据，与订单和商品模块保持一致
const searchResults = computed(() => {
  console.log('=== searchResults computed 被调用 ===')
  console.log('customerStore.customers.length:', customerStore.customers.length)
  
  // 直接使用所有客户数据，不进行权限过滤（与订单和商品模块保持一致）
  let results = customerStore.customers

  // 应用搜索过滤
  if (searchForm.keyword) {
    const keyword = searchForm.keyword.toLowerCase().trim()
    results = results.filter(customer => {
      // 搜索客户姓名
      if (customer.name.toLowerCase().includes(keyword)) return true
      
      // 搜索电话号码
      if (customer.phone.includes(searchForm.keyword)) return true
      
      // 搜索客户编码
      if (customer.code && customer.code.toLowerCase().includes(keyword)) return true
      
      // 搜索微信号
      if (customer.wechatId && customer.wechatId.toLowerCase().includes(keyword)) return true
      
      // 搜索邮箱
      if (customer.email && customer.email.toLowerCase().includes(keyword)) return true
      
      // 搜索公司名称
      if (customer.company && customer.company.toLowerCase().includes(keyword)) return true
      
      // TODO: 后续可以添加订单号和物流单号的搜索
      // 这需要查询订单数据来匹配客户
      
      return false
    })
  }

  if (searchForm.level) {
    results = results.filter(customer => 
      customer.level === searchForm.level
    )
  }

  if (searchForm.status) {
    results = results.filter(customer => 
      customer.status === searchForm.status
    )
  }

  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [startDate, endDate] = searchForm.dateRange
    results = results.filter(customer => {
      if (!customer.createTime) return false
      
      // 处理不同格式的日期
      let createTime: Date
      try {
        createTime = new Date(customer.createTime)
        // 检查日期是否有效
        if (isNaN(createTime.getTime())) {
          console.warn('无效的createTime格式:', customer.createTime)
          return false
        }
      } catch (error) {
        console.warn('解析createTime失败:', customer.createTime, error)
        return false
      }
      
      const start = new Date(startDate + 'T00:00:00')
      const end = new Date(endDate + 'T23:59:59')
      
      return createTime >= start && createTime <= end
    })
  }

  // 按创建时间倒序排列，确保最新客户显示在顶部
  results.sort((a, b) => {
    const timeA = new Date(a.createTime || 0).getTime()
    const timeB = new Date(b.createTime || 0).getTime()
    return timeB - timeA // 倒序：最新的在前面
  })



  return results
})

// 计算分页总数
const totalCount = computed(() => searchResults.value.length)

// 使用computed获取客户列表数据
const customerList = computed(() => {
  const start = (pagination.page - 1) * pagination.size
  const end = start + pagination.size
  return searchResults.value.slice(start, end)
})



const getLevelType = (level: string) => {
  const types: Record<string, string> = {
    normal: '',
    silver: 'info',
    gold: 'warning'
  }
  return types[level] || ''
}

const getLevelText = (level: string) => {
  const texts: Record<string, string> = {
    normal: '普通',
    silver: '白银',
    gold: '黄金'
  }
  return texts[level] || '普通'
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    inactive: 'info',
    potential: 'warning',
    lost: 'danger',
    blacklist: 'danger'
  }
  return types[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '活跃',
    inactive: '非活跃',
    potential: '潜在客户',
    lost: '流失客户',
    blacklist: '黑名单'
  }
  return texts[status] || '未知'
}

const isAllocatedCustomer = (customer: Customer) => {
  // 判断客户是否为分配来的，如果创建者不是当前用户，则为分配来的
  return customer.createdBy && customer.createdBy !== userStore.currentUser?.id
}

const handleRefresh = () => {
  console.log('手动刷新，强制重新加载数据')
  loadCustomerList(true) // 强制重新加载
}

// 快捷筛选处理
const handleQuickFilterChange = (value: string) => {
  // 更新快捷筛选器的选中状态
  quickFilter.value = value
  
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)
  
  const yearStart = new Date(today.getFullYear(), 0, 1)
  
  switch (value) {
    case 'today':
      searchForm.dateRange = [
        today.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'yesterday':
      searchForm.dateRange = [
        yesterday.toISOString().split('T')[0],
        yesterday.toISOString().split('T')[0]
      ]
      break
    case 'week':
      searchForm.dateRange = [
        weekAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'month':
      searchForm.dateRange = [
        monthAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'year':
      searchForm.dateRange = [
        yearStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'all':
      searchForm.dateRange = []
      break
  }
  
  // 自动触发搜索
  handleSearch()
}

const handleAdd = () => {
  safeNavigator.push('/customer/add')
}

const handleView = (row: Customer) => {
  safeNavigator.push(`/customer/detail/${row.id}`)
}



const handleOrder = (row: Customer) => {
  // 传递完整的客户信息到新建订单页面
  const params = new URLSearchParams({
    customerId: row.id,
    customerName: row.name,
    customerPhone: row.phone,
    customerAddress: row.address || ''
  })
  safeNavigator.push(`/order/add?${params.toString()}`)
}

const handleCall = async (row: Customer) => {
  try {
    // 模拟外呼API调用
    ElMessage.info('正在发起外呼...')
    
    // 这里应该调用实际的外呼API
    // await callCustomer(row.phone)
    
    // 模拟外呼成功
    setTimeout(() => {
      ElMessage.success('外呼已发起')
      
      // 发送客户来电消息提醒
      notificationStore.sendMessage(
        notificationStore.MessageType.CUSTOMER_CALL,
        `客户 ${row.name}（${displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '')}）外呼已发起`,
        {
          relatedId: row.id,
          relatedType: 'customer',
          actionUrl: `/customer/detail/${row.id}?tab=followup`
        }
      )
      
      // 跳转到客户详情页面的跟进记录tab
      safeNavigator.push({
        name: 'CustomerDetail',
        params: { id: row.id },
        query: { tab: 'followup' }
      })
    }, 1000)
  } catch (error) {
    ElMessage.error('外呼失败，请重试')
    console.error('外呼失败:', error)
  }
}

// 处理选择变化
const handleSelectionChange = (selection: Customer[]) => {
  selectedCustomers.value = selection
}

// 批量导出所有客户
const handleBatchExport = async () => {
  if (!showExportButtons.value) {
    ElMessage.warning('您没有客户导出权限')
    return
  }

  try {
    const confirmMessage = userStore.isSuperAdmin 
      ? '确定要导出所有客户数据吗？导出的数据将包含完整的客户信息。'
      : '确定要导出所有客户数据吗？敏感信息将进行脱敏处理。'
    
    await ElMessageBox.confirm(
      confirmMessage,
      '批量导出确认',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    
    try {
      // 准备导出数据
      const exportCustomers: ExportCustomer[] = searchResults.value.map(customer => ({
        code: customer.code || '',
        name: customer.name,
        phone: customer.phone,
        age: customer.age,
        address: customer.address,
        level: getLevelText(customer.level),
        status: getStatusText(customer.status),
        salesPersonId: customer.salesPersonId,
        salesPersonName: getSalesPersonName(customer.salesPersonId),
        orderCount: customer.orderCount,
        createTime: customer.createTime,
        createdBy: customer.createdBy || '',
        wechatId: customer.wechatId,
        email: customer.email,
        company: customer.company,
        position: customer.position,
        source: customer.allocationSource,
        tags: customer.tags,
        remarks: customer.remarks
      }))

      // 使用新的导出工具函数
      const filename = exportBatchCustomers(exportCustomers, hasExportPermission.value)
      
      ElMessage.success(`客户数据导出成功：${filename}`)
    } catch (exportError) {
      console.error('导出失败:', exportError)
      ElMessage.error('导出失败，请重试')
    } finally {
      loading.value = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作取消')
    }
  }
}

// 导出选中客户
const handleSelectedExport = async () => {
  if (selectedCustomers.value.length === 0) {
    ElMessage.warning('请先选择要导出的客户')
    return
  }

  if (!showExportButtons.value) {
    ElMessage.warning('您没有客户导出权限')
    return
  }

  try {
    const confirmMessage = userStore.isSuperAdmin 
      ? `确定要导出选中的 ${selectedCustomers.value.length} 个客户数据吗？导出的数据将包含完整的客户信息。`
      : `确定要导出选中的 ${selectedCustomers.value.length} 个客户数据吗？敏感信息将进行脱敏处理。`
    
    await ElMessageBox.confirm(
      confirmMessage,
      '导出选中客户',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    loading.value = true
    
    try {
      // 准备导出数据
      const exportCustomers: ExportCustomer[] = selectedCustomers.value.map(customer => ({
        code: customer.code || '',
        name: customer.name,
        phone: customer.phone,
        age: customer.age,
        address: customer.address,
        level: getLevelText(customer.level),
        status: getStatusText(customer.status),
        salesPersonId: customer.salesPersonId,
        salesPersonName: getSalesPersonName(customer.salesPersonId),
        orderCount: customer.orderCount,
        createTime: customer.createTime,
        createdBy: customer.createdBy || '',
        wechatId: customer.wechatId,
        email: customer.email,
        company: customer.company,
        position: customer.position,
        source: customer.allocationSource,
        tags: customer.tags,
        remarks: customer.remarks
      }))

      // 使用新的导出工具函数
      const filename = exportBatchCustomers(exportCustomers, hasExportPermission.value)
      
      ElMessage.success(`选中客户数据导出成功：${filename}`)
      selectedCustomers.value = []
    } catch (exportError) {
      console.error('导出失败:', exportError)
      ElMessage.error('导出失败，请重试')
    } finally {
      loading.value = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作取消')
    }
  }
}

// 分享相关状态
const showShareDialog = ref(false)
const shareForm = reactive({
  targetUserId: '',
  timeLimit: 7, // 默认7天
  remark: ''
})
const currentShareCustomer = ref(null)

// 时间限制选项
const timeLimitOptions = [
  { label: '1天', value: 1 },
  { label: '3天', value: 3 },
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
  { label: '永久', value: 0 }
]

// 分享客户
const handleShare = async (row: Customer) => {
  if (!userStore.isAdmin) {
    ElMessage.warning('只有管理员可以分享客户')
    return
  }

  currentShareCustomer.value = row
  shareForm.targetUserId = ''
  shareForm.timeLimit = 7
  shareForm.remark = ''
  showShareDialog.value = true
}

// 确认分享
const confirmShare = async () => {
  if (!shareForm.targetUserId) {
    ElMessage.warning('请选择要分享给的销售人员')
    return
  }

  try {
    loading.value = true
    
    // 计算到期时间
    const expireTime = shareForm.timeLimit === 0 ? null : new Date(Date.now() + shareForm.timeLimit * 24 * 60 * 60 * 1000)
    
    // 模拟分享API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新客户归属和分享信息
    const customer = currentShareCustomer.value
    const originalOwner = customer.salesPersonId
    customer.salesPersonId = shareForm.targetUserId
    customer.shareInfo = {
      originalOwner,
      sharedBy: userStore.currentUser.id,
      sharedAt: new Date().toISOString(),
      expireTime: expireTime ? expireTime.toISOString() : null,
      timeLimit: shareForm.timeLimit,
      remark: shareForm.remark,
      status: 'active'
    }
    
    const targetUser = salesUsers.value.find(user => user.id === shareForm.targetUserId)
    const timeLimitText = shareForm.timeLimit === 0 ? '永久' : `${shareForm.timeLimit}天`
    
    ElMessage.success(`客户 ${customer.name} 已成功分享给 ${targetUser.name}，时间限制：${timeLimitText}`)
    showShareDialog.value = false
  } catch (error) {
    ElMessage.error('分享失败，请重试')
  } finally {
    loading.value = false
  }
}

// 获取销售人员姓名
const getSalesPersonName = (salesPersonId: string) => {
  const salesPerson = salesUsers.value.find(user => user.id === salesPersonId)
  return salesPerson ? salesPerson.name : '未分配'
}



// 检查并回收过期分享
const checkExpiredShares = () => {
  const now = new Date()
  let expiredCount = 0
  
  customerStore.customers.forEach(customer => {
    if (customer.shareInfo && customer.shareInfo.status === 'active' && customer.shareInfo.expireTime) {
      const expireTime = new Date(customer.shareInfo.expireTime)
      if (now >= expireTime) {
        // 回收到原归属人
        customer.salesPersonId = customer.shareInfo.originalOwner
        customer.shareInfo.status = 'expired'
        customer.shareInfo.expiredAt = now.toISOString()
        expiredCount++
        
        // 发送通知
        const originalOwner = salesUsers.value.find(user => user.id === customer.shareInfo.originalOwner)
        const sharedUser = salesUsers.value.find(user => user.id === customer.shareInfo.sharedBy)
        
        if (originalOwner && sharedUser) {
          ElMessage.info(`客户 ${customer.name} 的分享已到期，已自动回收到 ${originalOwner.name}`)
        }
      }
    }
  })
  
  if (expiredCount > 0) {
    loadCustomers() // 重新加载客户列表
  }
}

// 格式化剩余时间
const formatRemainingTime = (expireTime: string) => {
  const now = new Date()
  const expire = new Date(expireTime)
  const diff = expire.getTime() - now.getTime()
  
  if (diff <= 0) {
    return '已过期'
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (days > 0) {
    return `${days}天${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时`
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${minutes}分钟`
  }
}

// 获取分享状态标签类型
const getShareStatusType = (shareInfo: { status: string; expireTime?: string } | null) => {
  if (!shareInfo || shareInfo.status !== 'active') {
    return ''
  }
  
  if (!shareInfo.expireTime) {
    return 'success' // 永久分享
  }
  
  const now = new Date()
  const expire = new Date(shareInfo.expireTime)
  const diff = expire.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days <= 1) {
    return 'danger' // 即将过期
  } else if (days <= 3) {
    return 'warning' // 快要过期
  } else {
    return 'info' // 正常
  }
}





const handleSearch = () => {
  pagination.page = 1
  pagination.total = totalCount.value
  // 搜索后更新统计数据
  loadSummaryData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    level: '',
    status: '',
    source: '',
    dateRange: []
  })
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.total = totalCount.value
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
}

// 导出客户数据
const handleExport = async () => {
  try {
    await appStore.withLoading(async () => {
      // 获取所有客户数据（不分页）
      const exportData = customerList.value.map(customer => {
        const salesPerson = salesUsers.value.find(user => user.id === customer.salesPersonId)
        const createdByUser = salesUsers.value.find(user => user.id === customer.createdBy)
        
        return {
          '客户姓名': customer.name,
          '手机号': displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || ''),
          '年龄': customer.age,
          '地址': customer.address,
          '客户等级': getLevelText(customer.level),
          '订单数量': customer.orderCount,
          '负责销售': salesPerson?.name || '未分配',
          '创建人': createdByUser?.name || '未知',
          '创建时间': customer.createTime
        }
      })
      
      // 创建CSV内容
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].join('\n')
      
      // 创建并下载文件
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `客户列表_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      // 安全地移除元素，检查是否还在 DOM 中
      if (link.parentNode) {
        document.body.removeChild(link)
      }
      // 清理 URL 对象
      URL.revokeObjectURL(url)
    }, '正在导出客户数据...')
    
    ElMessage.success('客户数据导出成功')
  } catch (error) {
    appStore.showError('导出客户数据失败', error as Error)
  }
}

const loadCustomerList = async (forceReload = false) => {
  try {
    loading.value = true
    
    console.log('=== loadCustomerList 开始 ===')
    console.log('forceReload:', forceReload)
    console.log('customerStore.customers.length:', customerStore.customers.length)
    
    // 只在强制刷新时才从API重新加载数据
    // 或者在客户数据完全为空时进行初始化
    if (forceReload) {
      console.log('强制刷新：重新从API加载客户数据')
      await customerStore.forceRefreshCustomers()
      
      // 强制刷新后，等待响应式更新完成
      await nextTick()
      console.log('强制刷新完成，当前客户数量:', customerStore.customers.length)
    } else if (customerStore.customers.length === 0) {
      console.log('初始化：客户数据为空，从API加载')
      await customerStore.loadCustomers()
      
      // 初始化加载后，等待响应式更新完成
      await nextTick()
      console.log('初始化加载完成，当前客户数量:', customerStore.customers.length)
    } else {
      console.log('使用现有客户数据，保持本地新增的客户')
    }
    
    // 确保搜索结果已更新
    await nextTick()
    
    console.log('当前客户数量:', customerStore.customers.length)
    console.log('搜索结果数量:', searchResults.value.length)
    
    // 更新分页总数（基于搜索结果）
    pagination.total = searchResults.value.length
    console.log('分页总数:', pagination.total)
    
    // 加载统计数据
    await loadSummaryData()
    
    console.log('=== loadCustomerList 完成 ===')
    
  } catch (error) {
    console.error('loadCustomerList 错误:', error)
    appStore.showError('加载客户列表失败', error as Error)
  } finally {
    loading.value = false
  }
}

// 加载统计数据（基于当前筛选结果）
const loadSummaryData = () => {
  try {
    // 使用筛选后的客户数据
    const customers = searchResults.value
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    // 总客户数（筛选后的）
    summaryData.totalCustomers = customers.length
    
    // 活跃客户数（状态为active的客户）
    summaryData.activeCustomers = customers.filter(c => c.status === 'active').length
    
    // 新增客户数（今日创建的客户）
    summaryData.newCustomers = customers.filter(c => {
      if (!c.createTime) return false
      
      try {
        const createTime = new Date(c.createTime)
        if (isNaN(createTime.getTime())) return false
        
        const createDate = createTime.toISOString().split('T')[0]
        return createDate === todayStr
      } catch (error) {
        console.warn('解析客户创建时间失败:', c.createTime, error)
        return false
      }
    }).length
    
    // 高价值客户数（黄金等级的客户）
    summaryData.highValueCustomers = customers.filter(c => c.level === 'gold').length
    
    console.log('统计数据已更新:', summaryData)
    
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 监听搜索结果数量变化，自动更新分页总数
watch(totalCount, (newCount) => {
  pagination.total = newCount
})

// 监听customerStore中的客户数据变化，确保列表实时更新
watch(() => customerStore.customers, (newCustomers) => {
  console.log('检测到customerStore客户数据变化，客户数量:', newCustomers.length)
  // 强制更新搜索结果，确保新数据能够显示
  nextTick(() => {
    console.log('客户列表页面数据已更新，当前显示客户数量:', customerList.value.length)
  })
}, { deep: true, immediate: true })

// 监听搜索结果变化，自动更新统计数据
watch(searchResults, () => {
  loadSummaryData()
}, { immediate: true })

// 监听路由变化，确保数据同步
watch(() => route.path, async (newPath, oldPath) => {
  if (newPath === '/customer/list') {
    console.log('路由切换到客户列表页面，从:', oldPath, '到:', newPath)
    
    // 如果是从添加页面返回，强制重新加载数据以确保显示最新客户
    if (oldPath === '/customer/add') {
      console.log('从添加页面返回，执行强化数据同步流程')
      
      // 1. 重置分页到第一页，确保新客户能被看到
      pagination.page = 1
      
      // 2. 清除搜索条件，确保显示所有客户
      searchForm.keyword = ''
      searchForm.level = ''
      searchForm.status = ''
      searchForm.dateRange = null
      quickFilter.value = 'all'
      
      // 3. 等待一个tick确保状态更新
      await nextTick()
      
      // 4. 强制重新加载列表数据（这会触发forceRefreshCustomers）
      await loadCustomerList(true)
      
      console.log('强化数据同步完成，新客户应该已显示，当前客户数量:', customerStore.customers.length)
    } else if (oldPath?.startsWith('/customer/edit/')) {
      console.log('从编辑页面返回，重新加载数据')
      await loadCustomerList(true) // 强制重新加载
    } else if (!oldPath || customerStore.customers.length === 0) {
      console.log('首次进入或列表为空，加载数据')
      await loadCustomerList(true) // 强制重新加载
    } else {
      console.log('其他情况，重新加载数据确保同步')
      await loadCustomerList(false) // 使用现有数据，不强制刷新
    }
  }
}, { immediate: true })

// 监听路由查询参数变化，处理刷新请求
watch(() => route.query, async (newQuery) => {
  if (route.path === '/customer/list' && newQuery.refresh === 'true' && !refreshHandled.value) {
    // 标记已处理，防止重复触发 replace 导致导航取消
    refreshHandled.value = true
    console.log('接收到刷新参数，强制重新加载客户列表')
    
    // 重置分页到第一页，确保新客户能被看到
    pagination.page = 1
    
    // 清除搜索条件，确保显示所有客户（包括新添加的）
    searchForm.keyword = ''
    searchForm.level = ''
    searchForm.dateRange = null
    quickFilter.value = 'all'
    
    // 等待一个微任务周期，确保状态更新
    await nextTick()
    
    // 强制重新加载，确保从第1页开始显示
    loadCustomerList(true)
    
    // 仅移除 refresh/timestamp 查询参数，保留其他查询参数，且在渲染后执行，避免初始导航阶段的取消日志
    const { refresh, timestamp, ...rest } = newQuery as Record<string, any>
    const cleanedUrl = router.resolve({ path: route.path, query: rest }).href
    window.history.replaceState(null, '', cleanedUrl)
  }
}, { flush: 'post' })

// 定时器引用
const shareCheckTimer = ref<NodeJS.Timeout | null>(null)

onMounted(async () => {
  // 首先确保用户已登录
  const isLoggedIn = await ensureUserLoggedIn()
  if (!isLoggedIn) {
    return // 如果用户未登录，直接返回，不执行后续逻辑
  }
  
  // 添加调试信息
  console.log('onMounted - customerStore:', customerStore)
  console.log('onMounted - customerStore.customers:', customerStore.customers)
  console.log('onMounted - customerStore.customers.length:', customerStore.customers.length)
  
  // 检查是否有refresh参数
  const shouldRefresh = route.query.refresh === 'true'
  const hasTimestamp = !!route.query.timestamp
  console.log('onMounted: 检查refresh参数:', shouldRefresh, '时间戳:', hasTimestamp)
  
  // 自动持久化store会自动加载数据，无需手动初始化
  console.log('onMounted: 使用自动持久化的客户数据')
  
  // 等待一个tick确保数据加载完成
  await nextTick()
  
  // 检查是否需要强制刷新：有refresh参数、有时间戳参数或客户数据为空
  const needsForceRefresh = shouldRefresh || hasTimestamp || customerStore.customers.length === 0
  console.log('onMounted: 是否需要强制刷新:', needsForceRefresh, '原因:', {
    shouldRefresh,
    hasTimestamp,
    isEmpty: customerStore.customers.length === 0
  })
  
  // 如果有refresh参数或时间戳，重置分页到第一页并清除搜索条件
  if (shouldRefresh || hasTimestamp) {
    console.log('onMounted: 检测到refresh参数或时间戳，重置分页和搜索条件')
    pagination.currentPage = 1
    searchForm.keyword = ''
    searchForm.level = ''
    searchForm.status = ''
    searchForm.dateRange = null
    quickFilter.value = 'all'
    
    // 等待下一个tick确保数据更新
    await nextTick()
  }
  
  // 加载客户数据
  console.log('onMounted: 加载客户数据，强制刷新:', needsForceRefresh)
  await loadCustomerList(needsForceRefresh)
  
  // 启动定时检查过期分享（每分钟检查一次）
  shareCheckTimer.value = setInterval(() => {
    checkExpiredShares()
  }, 60000)
  
  // 立即检查一次
  checkExpiredShares()
})

// 当组件被激活时检查是否需要刷新数据（用于keep-alive场景）
onActivated(async () => {
  console.log('组件激活，检查是否需要刷新客户数据')
  
  // 检查是否有refresh参数
  const shouldRefresh = route.query.refresh === 'true'
  console.log('onActivated: 检查refresh参数:', shouldRefresh)
  
  if (shouldRefresh) {
    console.log('onActivated: 检测到refresh参数，重新加载客户数据')
    
    // 重置分页到第一页并清除搜索条件
    pagination.currentPage = 1
    searchForm.keyword = ''
    searchForm.level = ''
    searchForm.status = ''
    searchForm.dateRange = null
    quickFilter.value = 'all'
    
    // 自动持久化store会自动同步数据，无需手动初始化
    // 等待一个tick确保数据同步完成
    await nextTick()
    
    // 强制重新加载客户数据
    await loadCustomerList(true)
    
    // 清除URL中的refresh参数
    await router.replace({ path: '/customer/list' })
  } else {
    // 正常情况下，自动持久化store已经加载了最新数据
    // 更新分页总数
    pagination.total = totalCount.value
  }
})

// 组件卸载时清理定时器和blob URL
onUnmounted(() => {
  if (shareCheckTimer.value) {
    clearInterval(shareCheckTimer.value)
    shareCheckTimer.value = null
  }
  
  // 清理所有可能存在的blob URL
  const existingLinks = document.querySelectorAll('a[href^="blob:"]')
  existingLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('blob:')) {
      URL.revokeObjectURL(href)
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  })
})
</script>

<style scoped>
.customer-list {
  padding: 0;
}

/* 第一行：统计汇总卡片 */
.summary-cards-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 第二行：快捷筛选 */
.quick-filters-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}

.quick-filter-buttons {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  align-items: center;
}

.search-card {
  text-align: left;
}

.search-card .el-form {
  text-align: left;
}

.search-card .el-row {
  justify-content: flex-start;
  text-align: left;
}

.search-card .el-col {
  text-align: left;
}

.search-form {
  width: 100%;
}



.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  background: #909399;
}

.card-icon.active {
  background: #67c23a;
}

.card-icon.new {
  background: #409eff;
}

.card-icon.high-value {
  background: #e6a23c;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #606266;
}



.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 16px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 客户表格样式 - 直接的表格式卡片 */
.customer-table {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: white;
}

/* 确保DynamicTable内部的表格样式 */
.customer-table :deep(.el-card) {
  border: none;
  box-shadow: none;
  border-radius: 8px;
}

.customer-table :deep(.el-card__header) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
  padding: 16px 20px;
}

.customer-table :deep(.el-card__body) {
  padding: 0;
}

.customer-table :deep(.el-table) {
  border: none;
}

.customer-table :deep(.el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.customer-table :deep(.el-table td) {
  border-bottom: 1px solid #f5f7fa;
}

.customer-table :deep(.el-table tr:last-child td) {
  border-bottom: none;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 可点击链接样式 */
.name-link, .phone-link {
  color: #409eff !important;
  text-decoration: none;
  font-weight: 500;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  height: auto !important;
  line-height: normal !important;
}

.code-link {
  color: #409eff !important;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  height: auto !important;
  line-height: normal !important;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.code-link:hover {
  color: #66b1ff !important;
  text-decoration: underline;
}

.code-link:focus {
  outline: none;
}

.name-link:hover, .phone-link:hover {
  color: #66b1ff !important;
  text-decoration: underline;
}

.name-link:focus, .phone-link:focus {
  outline: none;
}

/* 分享弹窗样式 */
.share-dialog-content {
  padding: 0;
}

.customer-info {
  margin-bottom: 24px;
}

.customer-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.share-settings {
  margin-bottom: 16px;
}

.share-settings h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.time-limit-tip {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 分享状态样式 */
.expire-time {
  margin-top: 4px;
  font-size: 12px;
}

/* 分配来源样式 */
.allocated {
  color: #409eff;
  font-size: 12px;
  font-weight: 500;
}

.self-created {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>