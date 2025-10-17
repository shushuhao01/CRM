<template>
  <div class="performance-share" :class="{ 'page-loaded': !loading }">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>业绩分享</h2>
      <div class="header-actions">
        <el-button 
          @click="showShareDialog = true" 
          type="primary" 
          :icon="Plus"
          class="action-btn-primary"
          :loading="submitLoading"
        >
          新建分享
        </el-button>
        <el-button 
          @click="exportShareRecords" 
          :icon="Download"
          class="action-btn-secondary"
          :loading="exportLoading"
        >
          导出记录
        </el-button>
      </div>
    </div>

    <!-- 分享统计概览 -->
    <div class="share-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon total">
                <el-icon><Share /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ shareStats.totalShares }}</div>
                <div class="card-label">总分享次数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon amount">
                <el-icon><Money /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">¥{{ shareStats.totalAmount.toLocaleString() }}</div>
                <div class="card-label">分享总金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon members">
                <el-icon><UserFilled /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ shareStats.involvedMembers }}</div>
                <div class="card-label">参与成员</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon orders">
                <el-icon><Document /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ shareStats.sharedOrders }}</div>
                <div class="card-label">分享订单数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 分享记录列表 -->
    <el-card class="share-records">
      <template #header>
        <div class="card-header">
          <span>分享记录</span>
          <div class="header-filters">
            <el-select v-model="filterStatus" placeholder="状态筛选" clearable style="width: 120px">
              <el-option label="全部" value="" />
              <el-option label="生效中" value="active" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
            <el-date-picker
              v-model="filterDateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 240px; margin-left: 10px"
            />
            <div class="search-container">
              <el-input
                v-model="searchOrderNumber"
                placeholder="搜索订单号"
                clearable
                style="width: 180px"
                @keyup.enter="handleSearch"
                @clear="handleClearSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
              <el-button 
                type="primary" 
                @click="handleSearch"
                :disabled="!searchOrderNumber.trim()"
                class="search-btn"
              >
                搜索
              </el-button>
              <el-button 
                v-if="isSearching"
                @click="handleClearSearch"
                class="clear-btn"
              >
                清除
              </el-button>
            </div>
          </div>
        </div>
      </template>

      <el-table 
        :data="filteredShareRecords" 
        v-loading="loading"
        class="share-table"
        :row-class-name="getTableRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column prop="shareNumber" label="分享编号" width="140" />
        <el-table-column prop="orderNumber" label="订单编号" width="140">
          <template #default="{ row }">
            <el-link type="primary" @click="viewOrderDetail(row.orderId)">
              {{ row.orderNumber }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="orderAmount" label="订单金额" width="120">
          <template #default="{ row }">
            ¥{{ row.orderAmount.toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="分享成员" width="200">
          <template #default="{ row }">
            <div class="share-members">
              <el-tag
                v-for="member in row.shareMembers"
                :key="member.userId"
                size="small"
                :type="member.userId === userStore.currentUser?.id ? 'success' : 'info'"
                style="margin-right: 5px"
              >
                {{ member.userName }} ({{ member.percentage }}%)
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button
                type="info"
                size="small"
                plain
                @click="viewShareDetail(row)"
                class="action-btn view-btn"
              >
                <el-icon><View /></el-icon>
                详情
              </el-button>
              <el-button
                v-if="row.status === 'active' && canEditShare(row)"
                type="primary"
                size="small"
                plain
                @click="editShare(row)"
                class="action-btn edit-btn"
              >
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button
                v-if="row.status === 'active' && canCancelShare(row)"
                type="danger"
                size="small"
                plain
                @click="cancelShare(row)"
                class="action-btn cancel-btn"
              >
                <el-icon><Close /></el-icon>
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalRecords"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新建分享对话框 -->
    <el-dialog
      v-model="showShareDialog"
      :title="isEditMode ? '编辑分享' : '新建分享'"
      width="800px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="shareFormRef"
        :model="shareForm"
        :rules="shareFormRules"
        label-width="100px"
      >
        <!-- 订单搜索 -->
        <el-form-item label="订单搜索" prop="orderId">
          <div class="order-search-container">
            <el-input
              v-model="orderSearchQuery"
              placeholder="请输入完整订单号（如：ORD20250101001）或客户信息进行搜索"
              clearable
              @input="handleOrderSearch(orderSearchQuery)"
              @clear="clearOrderSearch"
              style="margin-bottom: 10px"
              :loading="orderSearchLoading"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
              <template #suffix>
                <el-tooltip content="支持订单号、客户名称、客户电话搜索" placement="top">
                  <el-icon><QuestionFilled /></el-icon>
                </el-tooltip>
              </template>
            </el-input>
            
            <!-- 搜索结果提示 -->
            <div v-if="orderSearchQuery && !orderSearchLoading" class="search-result-tip">
              <span v-if="availableOrders.length === 0" class="no-result">
                <el-icon><WarningFilled /></el-icon>
                未找到匹配的订单，请检查订单号是否正确
              </span>
              <span v-else-if="selectedOrder" class="found-result">
                <el-icon><SuccessFilled /></el-icon>
                已找到订单：{{ selectedOrder.orderNumber }}
              </span>
              <span v-else-if="availableOrders.length > 1" class="multiple-results">
                <el-icon><InfoFilled /></el-icon>
                找到 {{ availableOrders.length }} 个匹配订单，请从下方选择
              </span>
            </div>
            
            <!-- 多个搜索结果时显示选择框 -->
            <el-select
              v-if="availableOrders.length > 1 && !selectedOrder"
              v-model="shareForm.orderId"
              placeholder="从搜索结果中选择订单"
              style="width: 100%; margin-top: 10px"
              @change="handleOrderChange"
            >
              <el-option
                v-for="order in availableOrders"
                :key="order.id"
                :label="`${order.orderNumber} - ¥${order.totalAmount.toLocaleString()} - ${order.customerName}`"
                :value="order.id"
              >
                <div class="order-option">
                  <div class="order-main">
                    <el-tag type="primary" size="small">{{ order.orderNumber }}</el-tag>
                    <span class="customer-name">{{ order.customerName }}</span>
                    <span class="order-amount">¥{{ order.totalAmount.toLocaleString() }}</span>
                  </div>
                  <div class="order-sub">
                    <span class="phone">{{ order.customerPhone }}</span>
                    <span class="time">{{ order.createTime }}</span>
                  </div>
                </div>
              </el-option>
            </el-select>
          </div>
        </el-form-item>

        <!-- 订单信息展示 -->
        <div v-if="selectedOrder" class="order-info-card">
          <div class="order-info-header">
            <el-icon class="info-icon"><InfoFilled /></el-icon>
            <span class="info-title">订单详情</span>
          </div>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="订单编号">
              <el-tag type="primary">{{ selectedOrder.orderNumber }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="客户名称">{{ selectedOrder.customerName }}</el-descriptions-item>
            <el-descriptions-item label="订单金额">
              <span class="amount-text">¥{{ selectedOrder.totalAmount.toLocaleString() }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ selectedOrder.createTime }}</el-descriptions-item>
            <el-descriptions-item label="订单状态">
              <el-tag :type="getOrderStatusType(selectedOrder.status)">
                {{ getOrderStatusText(selectedOrder.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审核状态">
              <el-tag :type="getAuditStatusType(selectedOrder.auditStatus)">
                {{ getAuditStatusText(selectedOrder.auditStatus) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 分享成员配置 -->
        <el-form-item label="分享成员" prop="shareMembers">
          <div class="share-members-config">
            <div
              v-for="(member, index) in shareForm.shareMembers"
              :key="index"
              class="member-item"
            >
              <el-select
                v-model="member.userId"
                placeholder="选择成员"
                style="width: 200px"
                @change="handleMemberChange(index)"
              >
                <el-option
                  v-for="user in availableUsers"
                  :key="user.id"
                  :label="`${user.name} (${user.department || '未知部门'} - ${getRoleText(user.role)})`"
                  :value="user.id"
                  :disabled="isUserSelected(user.id, index)"
                />
              </el-select>
              <el-input-number
                v-model="member.percentage"
                :min="1"
                :max="100"
                :precision="1"
                style="width: 120px; margin-left: 10px"
                @change="validatePercentages"
              />
              <span style="margin-left: 5px">%</span>
              <el-button
                v-if="shareForm.shareMembers.length > 1"
                type="danger"
                size="small"
                :icon="Delete"
                circle
                style="margin-left: 10px"
                @click="removeMember(index)"
              />
            </div>
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="addMember"
              :disabled="shareForm.shareMembers.length >= 5"
            >
              添加成员
            </el-button>
            <div class="percentage-summary">
              总比例: {{ totalPercentage }}% 
              <span v-if="totalPercentage !== 100" class="error-text">
                (比例总和必须为100%)
              </span>
            </div>
          </div>
        </el-form-item>

        <!-- 分享说明 -->
        <el-form-item label="分享说明" prop="description">
          <el-input
            v-model="shareForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入分享说明（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cancelShareForm">取消</el-button>
        <el-button
          type="primary"
          @click="submitShare"
          :loading="submitLoading"
          :disabled="totalPercentage !== 100"
        >
          {{ isEditMode ? '更新' : '确认分享' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 分享详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="分享详情"
      width="600px"
    >
      <div v-if="selectedShareDetail" class="share-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="分享编号">{{ selectedShareDetail.shareNumber }}</el-descriptions-item>
          <el-descriptions-item label="订单编号">{{ selectedShareDetail.orderNumber }}</el-descriptions-item>
          <el-descriptions-item label="订单金额">¥{{ selectedShareDetail.orderAmount.toLocaleString() }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedShareDetail.createTime }}</el-descriptions-item>
          <el-descriptions-item label="创建人">{{ selectedShareDetail.createdBy }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedShareDetail.status)">
              {{ getStatusText(selectedShareDetail.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="share-details-section">
          <h4 class="section-title">分享明细</h4>
          <div class="share-members-grid">
            <div 
              v-for="(member, index) in selectedShareDetail.shareMembers" 
              :key="index"
              class="member-share-card"
            >
              <div class="member-header">
                <div class="member-avatar">
                  <el-icon><UserFilled /></el-icon>
                </div>
                <div class="member-info">
                  <div class="member-name">{{ member.userName }}</div>
                  <el-tag 
                    :type="member.status === 'confirmed' ? 'success' : 'warning'" 
                    size="small"
                    class="member-status"
                  >
                    {{ member.status === 'confirmed' ? '已确认' : '待确认' }}
                  </el-tag>
                </div>
              </div>
              
              <div class="share-amount-section">
                <div class="percentage-display">
                  <div class="percentage-circle">
                    <span class="percentage-text">{{ member.percentage }}%</span>
                  </div>
                </div>
                <div class="amount-display">
                  <div class="amount-label">分享金额</div>
                  <div class="amount-value">
                    ¥{{ ((selectedShareDetail.orderAmount * member.percentage) / 100).toLocaleString() }}
                  </div>
                </div>
              </div>
              
              <div class="member-footer">
                <div class="confirm-time" v-if="member.confirmTime">
                  确认时间：{{ member.confirmTime }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="selectedShareDetail.description" style="margin-top: 15px">
          <h4>分享说明</h4>
          <p>{{ selectedShareDetail.description }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Download,
  Share,
  Money,
  UserFilled,
  Document,
  Delete,
  Search,
  InfoFilled,
  View,
  Edit,
  Close,
  QuestionFilled,
  WarningFilled,
  SuccessFilled
} from '@element-plus/icons-vue'
import { usePerformanceStore } from '@/stores/performance'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import * as performanceApi from '@/api/performance'
import type { FormInstance, FormRules } from 'element-plus'

// 接口定义
interface ShareOrder {
  id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createTime: string
}

interface ShareUser {
  id: string
  name: string
  department: string
  avatar?: string
}

interface ShareDetail {
  id: string
  orderNumber: string
  orderAmount: number
  shareMembers: Array<{
    userId: string
    userName: string
    percentage: number
    status: string
    confirmTime?: string
  }>
  status: string
  createTime: string
  description?: string
}

interface ShareData {
  orderId: string
  shareMembers: Array<{
    userId: string
    percentage: number
  }>
  description: string
}

// Store 实例
const performanceStore = usePerformanceStore()
  const userStore = useUserStore()
  const orderStore = useOrderStore()

// 响应式数据
const loading = ref(false)
const showShareDialog = ref(false)
const showDetailDialog = ref(false)
const isEditMode = ref(false)
const submitLoading = ref(false)
const orderSearchLoading = ref(false)

// 分页数据
const currentPage = ref(1)
const pageSize = ref(20)
const totalRecords = ref(0)

// 筛选数据
const filterStatus = ref('')
const filterDateRange = ref<[string, string] | null>(null)

// 搜索数据
const searchOrderNumber = ref('')
const isSearching = ref(false)

// 导出数据
const exportFormat = ref('csv')
const exportDateRange = ref<[string, string] | null>(null)
const exportLoading = ref(false)

// 表单相关
const shareFormRef = ref<FormInstance>()
const shareForm = ref({
  orderId: '',
  shareMembers: [
    { userId: '', percentage: 50 },
    { userId: '', percentage: 50 }
  ],
  description: ''
})

const shareFormRules: FormRules = {
  orderId: [{ required: true, message: '请选择订单', trigger: 'change' }],
  shareMembers: [{ required: true, message: '请配置分享成员', trigger: 'change' }]
}
// 数据
const availableOrders = ref<ShareOrder[]>([])
const availableUsers = ref<ShareUser[]>([])
const selectedOrder = ref<ShareOrder | null>(null)
const selectedShareDetail = ref<ShareDetail | null>(null)
const orderSearchQuery = ref('')

// 从store获取数据
const shareRecords = computed(() => performanceStore.performanceShares)
const shareStats = computed(() => performanceStore.shareStats)

// 计算属性
const filteredShareRecords = computed(() => {
  let records = shareRecords.value
  
  if (filterStatus.value) {
    records = records.filter(record => record.status === filterStatus.value)
  }
  
  if (filterDateRange.value && filterDateRange.value.length === 2) {
    const [startDate, endDate] = filterDateRange.value
    records = records.filter(record => {
      const recordDate = record.createTime.split(' ')[0]
      return recordDate >= startDate && recordDate <= endDate
    })
  }
  
  // 搜索功能：按订单号搜索
  if (isSearching.value && searchOrderNumber.value.trim()) {
    const searchTerm = searchOrderNumber.value.trim().toLowerCase()
    records = records.filter(record => 
      record.orderNumber.toLowerCase().includes(searchTerm)
    )
  }
  
  return records
})

const totalPercentage = computed(() => {
  return shareForm.value.shareMembers.reduce((sum, member) => sum + (member.percentage || 0), 0)
})

// 方法
const loadShareRecords = async () => {
  loading.value = true
  try {
    // 从后端API加载业绩分享数据
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      status: filterStatus.value || undefined,
      userId: userStore.currentUser?.id
    }
    
    const result = await performanceStore.loadPerformanceShares(params)
    totalRecords.value = result.total
    
    // 如果没有数据，创建一些示例数据（仅在开发环境）
    if (result.shares.length === 0 && process.env.NODE_ENV === 'development') {
      try {
        await performanceStore.createPerformanceShare({
          orderId: '1',
          orderNumber: 'ORD202401150001',
          orderAmount: 15800,
          shareMembers: [
            { userId: 'sales1', userName: '小明', percentage: 60, shareAmount: 0, status: 'pending' },
            { userId: 'sales2', userName: '张三', percentage: 40, shareAmount: 0, status: 'pending' }
          ],
          createdBy: '超级管理员',
          createdById: userStore.currentUser?.id || 'admin',
          description: '重要客户订单，按贡献度分配'
        })
        
        await performanceStore.createPerformanceShare({
          orderId: '2',
          orderNumber: 'ORD202401160002',
          orderAmount: 28900,
          shareMembers: [
            { userId: 'sales1', userName: '小明', percentage: 50, shareAmount: 0, status: 'pending' },
            { userId: 'sales3', userName: '李四', percentage: 50, shareAmount: 0, status: 'pending' }
          ],
          createdBy: '超级管理员',
          createdById: userStore.currentUser?.id || 'admin',
          description: '团队协作订单'
        })
        
        // 重新加载数据
        const newResult = await performanceStore.loadPerformanceShares(params)
        totalRecords.value = newResult.total
      } catch (createError) {
        console.warn('创建示例数据失败:', createError)
      }
    }
  } catch (error) {
    console.error('加载分享记录失败:', error)
    ElMessage.error('加载分享记录失败')
  } finally {
    loading.value = false
  }
}

const loadAvailableUsers = async () => {
  try {
    // 从用户store中获取真实的用户列表
    await userStore.loadUsers()
    
    // 过滤出可以参与业绩分享的用户（销售人员、经理等）
    const eligibleRoles = ['sales_staff', 'sales_manager', 'department_manager']
    availableUsers.value = userStore.users
      .filter(user => eligibleRoles.includes(user.role) && user.status === 'active')
      .map(user => ({
        id: user.id,
        name: user.name,
        department: user.department,
        role: user.role
      }))
    
    // 如果没有找到用户，使用模拟数据作为后备
    if (availableUsers.value.length === 0) {
      availableUsers.value = [
        { id: 'sales1', name: '小明', department: '销售部', role: 'sales_staff' },
        { id: 'sales2', name: '张三', department: '销售部', role: 'sales_staff' },
        { id: 'sales3', name: '李四', department: '销售部', role: 'sales_staff' },
        { id: 'manager1', name: '王经理', department: '销售部', role: 'sales_manager' }
      ]
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    // 使用模拟数据作为后备
    availableUsers.value = [
      { id: 'sales1', name: '小明', department: '销售部', role: 'sales_staff' },
      { id: 'sales2', name: '张三', department: '销售部', role: 'sales_staff' },
      { id: 'sales3', name: '李四', department: '销售部', role: 'sales_staff' },
      { id: 'manager1', name: '王经理', department: '销售部', role: 'sales_manager' }
    ]
  }
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

const handleOrderSearch = async (query: string) => {
  if (!query || query.trim().length === 0) {
    availableOrders.value = []
    selectedOrder.value = null
    shareForm.value.orderId = ''
    return
  }
  
  orderSearchLoading.value = true
  try {
    // 确保订单数据已加载
    if (orderStore.orders.length === 0) {
      await orderStore.initializeWithMockData()
    }
    
    // 模拟搜索延迟
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 使用订单store的搜索函数进行全局真实数据搜索
    const searchResults = orderStore.searchOrders(query)
    
    // 过滤掉已经分享过的订单
    const filteredResults = searchResults.filter(order => 
      !shareRecords.value.some(share => share.orderId === order.id)
    )
    
    // 精确匹配订单号（优先级最高）
    const exactOrderMatch = filteredResults.find(order =>
      order.orderNumber.toLowerCase() === query.toLowerCase().trim()
    )
    
    if (exactOrderMatch) {
      // 如果找到精确匹配的订单号，直接选中该订单
      selectedOrder.value = exactOrderMatch
      shareForm.value.orderId = exactOrderMatch.id
      availableOrders.value = [exactOrderMatch]
      return
    }
    
    // 限制搜索结果数量
    availableOrders.value = filteredResults.slice(0, 10)
    
    // 如果只有一个匹配结果，自动选中
    if (availableOrders.value.length === 1) {
      selectedOrder.value = availableOrders.value[0]
      shareForm.value.orderId = availableOrders.value[0].id
    }
    
  } catch (error) {
    console.error('搜索订单失败:', error)
    ElMessage.error('搜索订单失败，请重试')
  } finally {
    orderSearchLoading.value = false
  }
}

const clearOrderSearch = () => {
  orderSearchQuery.value = ''
  availableOrders.value = []
  shareForm.value.orderId = ''
  selectedOrder.value = null
}

const handleOrderChange = (orderId: string) => {
  selectedOrder.value = availableOrders.value.find(order => order.id === orderId)
}

const handleMemberChange = (index: number) => {
  const member = shareForm.value.shareMembers[index]
  const user = availableUsers.value.find(u => u.id === member.userId)
  if (user) {
    member.userName = user.name
  }
}

const isUserSelected = (userId: string, currentIndex: number) => {
  return shareForm.value.shareMembers.some((member, index) => 
    index !== currentIndex && member.userId === userId
  )
}

const addMember = () => {
  if (shareForm.value.shareMembers.length < 5) {
    shareForm.value.shareMembers.push({ userId: '', percentage: 0 })
  }
}

const removeMember = (index: number) => {
  shareForm.value.shareMembers.splice(index, 1)
  validatePercentages()
}

const validatePercentages = () => {
  // 自动调整比例逻辑可以在这里实现
}

const submitShare = async () => {
  if (!shareFormRef.value) return
  
  try {
    await shareFormRef.value.validate()
    
    if (totalPercentage.value !== 100) {
      ElMessage.error('分享比例总和必须为100%')
      return
    }
    
    submitLoading.value = true
    
    // 准备分享数据
    const shareData = {
      orderId: shareForm.value.orderId,
      orderNumber: selectedOrder.value?.orderNumber || '',
      orderAmount: selectedOrder.value?.totalAmount || 0,
      shareMembers: shareForm.value.shareMembers.map(member => ({
        userId: member.userId,
        userName: availableUsers.value.find(u => u.id === member.userId)?.name || '',
        percentage: member.percentage,
        shareAmount: 0, // 将在store中计算
        status: 'pending' as const
      })),
      createdBy: userStore.currentUser?.name || '',
      createdById: userStore.currentUser?.id || '',
      description: shareForm.value.description
    }
    
    if (isEditMode.value) {
      // 更新现有记录
      const currentShare = shareRecords.value.find(record => record.id === shareForm.value.orderId)
      if (currentShare) {
        await performanceStore.updatePerformanceShare(currentShare.id, shareData)
        ElMessage.success('分享更新成功')
        // 重新加载数据
        await loadShareRecords()
        // 触发数据同步
        await performanceStore.syncPerformanceData()
      }
    } else {
      // 创建新记录
      const newShare = await performanceStore.createPerformanceShare(shareData)
      ElMessage.success('分享创建成功')
      
      // 发送通知给分享成员
      await sendShareNotifications(newShare)
      // 重新加载数据
      await loadShareRecords()
      // 触发数据同步
      await performanceStore.syncPerformanceData()
    }
    
    cancelShareForm()
    // 刷新数据
    await loadShareRecords()
  } catch (error) {
    console.error('提交分享失败:', error)
    ElMessage.error('提交分享失败')
  } finally {
    submitLoading.value = false
  }
}

const sendShareNotifications = async (shareData: ShareDetail) => {
  // 给每个分享成员发送通知
  for (const member of shareData.shareMembers) {
    if (member.userId !== userStore.currentUser?.id) {
      await notificationStore.addMessage({
        type: 'PERFORMANCE_SHARE',
        title: '业绩分享通知',
        content: `您收到了来自${shareData.createdBy}的业绩分享，订单${shareData.orderNumber}，分享比例${member.percentage}%`,
        priority: 'normal',
        relatedId: shareData.id,
        relatedType: 'performance_share'
      })
    }
  }
}



const cancelShareForm = () => {
  showShareDialog.value = false
  isEditMode.value = false
  shareForm.value = {
    orderId: '',
    shareMembers: [
      { userId: '', percentage: 50 },
      { userId: '', percentage: 50 }
    ],
    description: ''
  }
  selectedOrder.value = null
  shareFormRef.value?.resetFields()
}

const viewShareDetail = (share: ShareDetail) => {
  selectedShareDetail.value = share
  showDetailDialog.value = true
}

const editShare = (share: ShareDetail) => {
  isEditMode.value = true
  shareForm.value = {
    orderId: share.orderId,
    shareMembers: [...share.shareMembers],
    description: share.description
  }
  selectedOrder.value = availableOrders.value.find(order => order.id === share.orderId)
  showShareDialog.value = true
}

const cancelShare = async (share: ShareDetail) => {
  try {
    await ElMessageBox.confirm('确定要取消这个业绩分享吗？', '确认取消', {
      type: 'warning'
    })
    
    const success = await performanceStore.cancelPerformanceShare(share.id)
    if (success) {
      ElMessage.success('业绩分享已取消')
      // 重新加载数据
      await loadShareRecords()
      // 触发数据同步
      await performanceStore.syncPerformanceData()
    } else {
      ElMessage.error('取消失败，请重试')
    }
  } catch (error) {
    console.error('取消分享失败:', error)
    ElMessage.error('取消失败')
  }
}

const canEditShare = (share: ShareDetail) => {
  return userStore.isAdmin && share.status === 'active'
}

const canCancelShare = (share: ShareDetail) => {
  return userStore.isAdmin && share.status === 'active'
}

const viewOrderDetail = (orderId: string) => {
  // 跳转到订单详情页面
  window.open(`/order/detail/${orderId}`, '_blank')
}

const exportShareRecords = async () => {
  try {
    exportLoading.value = true
    // 显示导出选项对话框
    const { value: exportOptions } = await ElMessageBox.prompt(
      '请选择导出格式和日期范围',
      '导出业绩分享记录',
      {
        confirmButtonText: '导出',
        cancelButtonText: '取消',
        inputType: 'textarea',
        inputPlaceholder: '可选：输入日期范围 (格式: 2024-01-01 至 2024-12-31)',
        showInput: false,
        message: h('div', [
          h('div', { style: 'margin-bottom: 10px' }, '导出格式:'),
          h('el-radio-group', {
            modelValue: 'csv',
            'onUpdate:modelValue': (val: string) => {
              exportFormat.value = val
            }
          }, [
            h('el-radio', { label: 'csv' }, 'CSV格式'),
            h('el-radio', { label: 'json' }, 'JSON格式')
          ]),
          h('div', { style: 'margin: 15px 0 10px 0' }, '日期范围:'),
          h('el-date-picker', {
            modelValue: exportDateRange.value,
            'onUpdate:modelValue': (val: [string, string] | null) => {
              exportDateRange.value = val
            },
            type: 'daterange',
            'range-separator': '至',
            'start-placeholder': '开始日期',
            'end-placeholder': '结束日期',
            format: 'YYYY-MM-DD',
            'value-format': 'YYYY-MM-DD',
            style: 'width: 100%'
          })
        ])
      }
    )

    // 准备导出参数
    const params: any = {
      format: exportFormat.value
    }

    if (exportDateRange.value && exportDateRange.value.length === 2) {
      params.startDate = exportDateRange.value[0]
      params.endDate = exportDateRange.value[1]
    }

    ElMessage.loading('正在导出数据...')

    // 调用导出API
    const response = await performanceApi.exportPerformanceShares(params)

    if (params.format === 'csv') {
      // 处理CSV文件下载
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `业绩分享记录_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } else {
      // 处理JSON文件下载
      const jsonData = JSON.stringify(response.data.data, null, 2)
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `业绩分享记录_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }

    ElMessage.success('导出成功！')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('导出失败:', error)
      ElMessage.error('导出失败，请重试')
    }
  } finally {
    exportLoading.value = false
  }
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'success',
    completed: 'info',
    cancelled: 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '生效中',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    confirmed: 'primary',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger'
  }
  return statusMap[status] || 'info'
}

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    shipped: '已发货',
    delivered: '已送达',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const getTableRowClassName = ({ row, rowIndex }: { row: any, rowIndex: number }) => {
  return `table-row-${rowIndex % 2 === 0 ? 'even' : 'odd'}`
}

const handleRowClick = (row: any) => {
  // 添加行点击的视觉反馈
  ElMessage.info(`点击了分享记录: ${row.shareNumber}`)
}

const getAuditStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return statusMap[status] || 'info'
}

const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    sales_staff: '销售员',
    sales_manager: '销售经理',
    department_manager: '部门经理',
    admin: '管理员',
    customer_service: '客服'
  }
  return roleMap[role] || role
}

const getAuditStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || status
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  loadShareRecords()
}

// 搜索相关方法
const handleSearch = () => {
  if (searchOrderNumber.value.trim()) {
    isSearching.value = true
    currentPage.value = 1 // 重置到第一页
  } else {
    ElMessage.warning('请输入订单号')
  }
}

const handleClearSearch = () => {
  searchOrderNumber.value = ''
  isSearching.value = false
  currentPage.value = 1 // 重置到第一页
}

// 自动刷新机制
const autoRefreshInterval = ref<NodeJS.Timeout | null>(null)

// 启动自动刷新
const startAutoRefresh = () => {
  // 每30秒自动刷新一次数据
  autoRefreshInterval.value = setInterval(async () => {
    await loadShareRecords()
    await performanceStore.syncPerformanceData()
  }, 30000)
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshInterval.value) {
    clearInterval(autoRefreshInterval.value)
    autoRefreshInterval.value = null
  }
}

// 监听业绩分享数据变化
watch(
  () => performanceStore.performanceShares,
  () => {
    // 当业绩分享数据发生变化时，自动刷新统计数据
    nextTick(() => {
      performanceStore.syncPerformanceData()
    })
  },
  { deep: true }
)

// 生命周期
onMounted(() => {
  loadShareRecords()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})

// 分页处理

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadShareRecords()
}

// 监听筛选条件变化
watch([filterStatus, filterDateRange], () => {
  currentPage.value = 1
  loadShareRecords()
})
</script>

<style scoped>
.performance-share {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  min-height: 100vh;
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.performance-share.page-loaded {
  opacity: 1;
  transform: translateY(0);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.page-header h2 {
  margin: 0;
  color: #1a202c;
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.action-btn-primary:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  transform: translateY(-2px);
}

.action-btn-secondary {
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 24px;
  font-weight: 600;
  color: #4a5568;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.action-btn-secondary:hover {
  background: #f7fafc;
  border-color: #cbd5e1;
  color: #2d3748;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.share-overview {
  margin-bottom: 24px;
}

.overview-card {
  height: 140px;
  border: none;
  border-radius: 20px;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
}

.overview-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.15);
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 24px;
}

.card-icon {
  width: 72px;
  height: 72px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20px;
  font-size: 28px;
  color: white;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-icon:hover {
  transform: scale(1.1) rotate(5deg);
}

.card-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.amount {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.members {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.orders {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 36px;
  font-weight: 800;
  color: #1a202c;
  line-height: 1;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-label {
  font-size: 16px;
  color: #718096;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.share-records {
  margin-bottom: 24px;
  border: none;
  border-radius: 20px;
  background: white;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  padding: 24px;
  border-bottom: 2px solid #e2e8f0;
}

.header-filters {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.search-input {
  width: 200px;
}

.search-btn {
  min-width: 80px;
}

.clear-btn {
  min-width: 60px;
}

.search-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 16px;
}

/* 响应式布局优化 */
@media (max-width: 1200px) {
  .header-filters {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .search-container {
    margin-left: 0;
    margin-top: 8px;
  }
  
  .search-input {
    width: 160px;
  }
}

@media (max-width: 768px) {
  .header-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .search-container {
    margin-left: 0;
    margin-top: 0;
    justify-content: stretch;
  }
  
  .search-input {
    flex: 1;
    width: auto;
  }
  
  .search-btn, .clear-btn {
    flex-shrink: 0;
  }
}

.share-members {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 24px;
  background: white;
  border-radius: 0 0 20px 20px;
}

.order-info {
  margin: 24px 0;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  border: 2px solid #e2e8f0;
}

.share-members-config {
  width: 100%;
}

.member-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.member-item:hover {
  background: #edf2f7;
  transform: translateX(4px);
}

.percentage-summary {
  margin-top: 16px;
  padding: 16px;
  font-weight: 700;
  color: #1a202c;
  background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
  border-radius: 12px;
  border: 2px solid #81e6d9;
  text-align: center;
  font-size: 18px;
}

.error-text {
  color: #e53e3e;
  font-weight: 700;
}

/* 订单搜索样式 */
.order-search-container {
  width: 100%;
}

.order-search-container .el-input {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.order-search-container .el-input:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.order-search-container .el-input.is-focus {
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

/* 订单信息卡片样式 */
.order-info-card {
  margin-top: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.order-info-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.order-info-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #cbd5e0;
}

.info-icon {
  font-size: 20px;
  color: #667eea;
  margin-right: 8px;
}

.info-title {
  font-size: 16px;
  font-weight: 700;
  color: #2d3748;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.amount-text {
  font-size: 16px;
  font-weight: 700;
  color: #38a169;
}

.share-detail h4 {
  margin: 24px 0 16px 0;
  color: #1a202c;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Element Plus 组件样式优化 */
.share-table {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.share-table:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

:deep(.table-row-even) {
  background-color: #fafbfc;
  transition: all 0.3s ease;
}

:deep(.table-row-odd) {
  background-color: white;
  transition: all 0.3s ease;
}

:deep(.table-row-even:hover),
:deep(.table-row-odd:hover) {
  background-color: #f0f9ff !important;
  transform: scale(1.005);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
  cursor: pointer;
}

:deep(.el-table) {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f9fafb;
  color: #374151;
  font-weight: 600;
  border-bottom: 1px solid #e5e7eb;
  font-size: 13px;
  letter-spacing: 0.3px;
  padding: 16px 12px;
  text-transform: uppercase;
}

:deep(.el-table th.el-table__cell) {
  border-right: 1px solid #f3f4f6;
}

:deep(.el-table th.el-table__cell:last-child) {
  border-right: none;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f3f4f6;
  padding: 16px 12px;
  font-size: 14px;
  color: #374151;
  transition: background-color 0.2s ease;
}

:deep(.el-table td.el-table__cell) {
  border-right: 1px solid #f9fafb;
}

:deep(.el-table td.el-table__cell:last-child) {
  border-right: none;
}

:deep(.el-table tr:hover > td) {
  background-color: #f8fafc;
}

:deep(.el-table tr:last-child > td) {
  border-bottom: none;
}

:deep(.el-table__empty-block) {
  background: white;
  border: none;
}

:deep(.el-table__empty-text) {
  color: #9ca3af;
  font-size: 14px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  letter-spacing: 0.3px;
  border: 1px solid transparent;
}

:deep(.el-button--primary) {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
  box-shadow: 0 1px 3px rgba(79, 70, 229, 0.2);
}

:deep(.el-button--primary:hover) {
  background: #4338ca;
  border-color: #4338ca;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

:deep(.el-button--success) {
  background: #059669;
  border-color: #059669;
  color: white;
  box-shadow: 0 1px 3px rgba(5, 150, 105, 0.2);
}

:deep(.el-button--success:hover) {
  background: #047857;
  border-color: #047857;
  box-shadow: 0 2px 6px rgba(5, 150, 105, 0.3);
}

:deep(.el-button--warning) {
  background: #d97706;
  border-color: #d97706;
  color: white;
  box-shadow: 0 1px 3px rgba(217, 119, 6, 0.2);
}

:deep(.el-button--warning:hover) {
  background: #b45309;
  border-color: #b45309;
  box-shadow: 0 2px 6px rgba(217, 119, 6, 0.3);
}

:deep(.el-button--danger) {
  background: #dc2626;
  border-color: #dc2626;
  color: white;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.2);
}

:deep(.el-button--danger:hover) {
  background: #b91c1c;
  border-color: #b91c1c;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.3);
}

:deep(.el-button--info) {
  background: #6b7280;
  border-color: #6b7280;
  color: white;
  box-shadow: 0 1px 3px rgba(107, 114, 128, 0.2);
}

:deep(.el-button--info:hover) {
  background: #4b5563;
  border-color: #4b5563;
  box-shadow: 0 2px 6px rgba(107, 114, 128, 0.3);
}

:deep(.el-button.is-plain) {
  background: white;
  border-color: #d1d5db;
  color: #374151;
}

:deep(.el-button.is-plain:hover) {
  background: #f9fafb;
  border-color: #9ca3af;
  color: #111827;
}

:deep(.el-card) {
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  background: white;
}

:deep(.el-card__header) {
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  padding: 20px 24px;
  font-weight: 600;
  color: #374151;
  font-size: 16px;
}

:deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid #e2e8f0;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #cbd5e0;
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  border-color: #667eea;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 12px;
}

:deep(.el-date-editor .el-input__wrapper) {
  border-radius: 12px;
}

:deep(.el-tag) {
  border-radius: 12px;
  font-weight: 600;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

:deep(.el-pagination) {
  justify-content: center;
  margin-top: 24px;
}

:deep(.el-pagination .el-pager li) {
  border-radius: 6px;
  margin: 0 2px;
  transition: all 0.2s ease;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

:deep(.el-pagination .el-pager li:hover) {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

:deep(.el-pagination .el-pager li.is-active) {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

:deep(.el-pagination .btn-prev),
:deep(.el-pagination .btn-next) {
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  font-weight: 500;
}

:deep(.el-pagination .btn-prev:hover),
:deep(.el-pagination .btn-next:hover) {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

:deep(.el-dialog) {
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
}

:deep(.el-dialog__header) {
  background: #f9fafb;
  border-radius: 12px 12px 0 0;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
}

:deep(.el-dialog__body) {
  padding: 24px;
  background: white;
}

:deep(.el-dialog__footer) {
  padding: 16px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 12px 12px;
}

:deep(.el-descriptions) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

:deep(.el-descriptions__header) {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .performance-share {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
  
  .page-header h2 {
    font-size: 28px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .overview-card {
    height: 120px;
  }
  
  .card-content {
    padding: 20px;
  }
  
  .card-icon {
    width: 60px;
    height: 60px;
    margin-right: 16px;
    font-size: 24px;
  }
  
  .card-value {
    font-size: 28px;
  }
  
  .card-label {
    font-size: 14px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    padding: 20px;
  }
  
  .header-filters {
    width: 100%;
    justify-content: flex-end;
    flex-wrap: wrap;
  }
  
  .member-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

/* 动画效果 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.overview-card {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.share-records {
  animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 分享详情弹窗样式 */
.share-details-section {
  margin-top: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.share-members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.member-share-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.member-share-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
}

.member-share-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.member-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.member-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  margin-right: 12px;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.member-status {
  font-size: 12px;
}

.share-amount-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.percentage-display {
  display: flex;
  align-items: center;
}

.percentage-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.percentage-text {
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.amount-display {
  text-align: right;
  flex: 1;
  margin-left: 16px;
}

.amount-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.amount-value {
  font-size: 20px;
  font-weight: 700;
  color: #dc2626;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.member-footer {
  border-top: 1px solid #e5e7eb;
  padding-top: 12px;
}

.confirm-time {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  min-width: 70px;
  height: 32px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn .el-icon {
  font-size: 14px;
}

.view-btn {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #475569;
}

.view-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
  color: #334155;
  transform: translateY(-1px);
}

.edit-btn {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.edit-btn:hover {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
  transform: translateY(-1px);
}

.cancel-btn {
  background: #fef2f2;
  border-color: #fecaca;
  color: #dc2626;
}

.cancel-btn:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .share-members-grid {
    grid-template-columns: 1fr;
  }
  
  .share-amount-section {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  
  .amount-display {
    margin-left: 0;
    text-align: center;
  }
  
  .action-buttons {
    flex-direction: column;
    gap: 4px;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
}

.member-item {
  animation: slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 加载状态优化 */
:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

:deep(.el-loading-spinner) {
  color: #667eea;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
}

/* 订单搜索样式 */
.order-search-container {
  width: 100%;
}

.search-result-tip {
  margin: 8px 0;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-result-tip .no-result {
  color: #f56565;
  background: #fed7d7;
  border: 1px solid #feb2b2;
  padding: 6px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-result-tip .found-result {
  color: #38a169;
  background: #c6f6d5;
  border: 1px solid #9ae6b4;
  padding: 6px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.search-result-tip .multiple-results {
  color: #3182ce;
  background: #bee3f8;
  border: 1px solid #90cdf4;
  padding: 6px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.order-option {
  padding: 8px 0;
  line-height: 1.4;
}

.order-main {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.order-main .customer-name {
  font-weight: 500;
  color: #2d3748;
}

.order-main .order-amount {
  font-weight: 600;
  color: #e53e3e;
  margin-left: auto;
}

.order-sub {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #718096;
}

.order-sub .phone {
  color: #4a5568;
}

.order-sub .time {
  color: #a0aec0;
}
</style>