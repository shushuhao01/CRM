<template>
  <div class="team-performance">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">团队业绩</h1>
    </div>

    <!-- 数据概览卡片 -->
    <div class="metrics-grid">
      <!-- 第一行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon total-performance">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.totalPerformance) }}</div>
            <div class="metric-label">团队总业绩</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon total-orders">
            <el-icon><Document /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.totalOrders }}</div>
            <div class="metric-label">团队订单</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon avg-performance">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.avgPerformance) }}</div>
            <div class="metric-label">人均业绩</div>
          </div>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon sign-orders">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.signOrders }}</div>
            <div class="metric-label">签收单数</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon sign-rate">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.signRate }}%</div>
            <div class="metric-label">签收率</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon sign-performance">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.signPerformance) }}</div>
            <div class="metric-label">签收业绩</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速筛选 -->
    <div class="quick-filters">
      <el-button 
        v-for="filter in quickFilters" 
        :key="filter.value"
        :type="selectedQuickFilter === filter.value ? 'primary' : ''"
        @click="handleQuickFilter(filter.value)"
        class="filter-btn"
      >
        {{ filter.label }}
      </el-button>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <div class="filter-left">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="date-picker"
        />
        <el-select 
          v-model="selectedDepartment" 
          placeholder="选择部门" 
          class="department-select"
          size="default"
        >
          <el-option label="全部部门" value="" />
          <el-option 
            v-for="dept in departmentStore.departmentList" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.id" 
          />
        </el-select>
        <el-select 
          v-model="sortBy" 
          placeholder="排序方式" 
          class="sort-select"
          size="default"
        >
          <el-option label="按下单业绩排序" value="orderAmount" />
          <el-option label="按签收业绩排序" value="signAmount" />
          <el-option label="按签收率排序" value="signRate" />
          <el-option label="按下单数排序" value="orderCount" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button type="primary" @click="queryData" class="query-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="exportData" class="export-btn">
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button @click="showFullscreenView" class="fullscreen-btn">
          <el-icon><FullScreen /></el-icon>
          全屏查看
        </el-button>
      </div>
    </div>

    <!-- 业绩列表 -->
    <div class="performance-table">
      <el-table 
        :data="memberList" 
        stripe 
        class="data-table"
        :row-class-name="getRowClassName"
        border
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="department" label="部门" width="100" align="center" />
        <el-table-column prop="name" label="成员" width="100" align="center" />
        <el-table-column prop="joinDate" label="入职日期" width="110" align="center" />
        <el-table-column prop="orderCount" label="下单单数" width="90" align="center" />
        <el-table-column prop="orderAmount" label="下单业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.orderAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipCount" label="发货单数" width="90" align="center" />
        <el-table-column prop="shipAmount" label="发货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.shipAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipRate" label="发货率" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.shipRate)" size="small">
              {{ row.shipRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signCount" label="签收单数" width="90" align="center" />
        <el-table-column prop="signAmount" label="签收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.signAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signRate" label="签收率" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.signRate)" size="small">
              {{ row.signRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transitCount" label="在途单数" width="90" align="center" />
        <el-table-column prop="transitAmount" label="在途业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.transitAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transitRate" label="在途率" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.transitRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectCount" label="拒收单数" width="90" align="center" />
        <el-table-column prop="rejectAmount" label="拒收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.rejectAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectRate" label="拒收率" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(100 - row.rejectRate)" size="small">
              {{ row.rejectRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="returnCount" label="退货单数" width="90" align="center" />
        <el-table-column prop="returnAmount" label="退货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.returnAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="returnRate" label="退货率" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(100 - row.returnRate)" size="small">
              {{ row.returnRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="viewMemberDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[30, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 成员详情弹窗 -->
    <el-dialog
      v-model="memberDetailVisible"
      :title="`${selectedMember?.name} - 订单业绩详情`"
      width="90%"
      top="5vh"
      class="member-dialog"
    >
      <div v-if="selectedMember" class="member-detail-content">
        <!-- 成员基本信息 -->
        <div class="member-info">
          <div class="info-item">
            <span class="label">姓名：</span>
            <span class="value">{{ selectedMember.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">部门：</span>
            <span class="value">{{ selectedMember.department }}</span>
          </div>
          <div class="info-item">
            <span class="label">入职日期：</span>
            <span class="value">{{ selectedMember.joinDate }}</span>
          </div>
          <div class="info-item">
            <span class="label">签收率：</span>
            <span class="value">{{ selectedMember.signRate }}%</span>
          </div>
        </div>

        <!-- 订单列表 -->
        <div class="order-section">
          <h4>订单列表</h4>
          <el-table :data="memberOrderList" stripe border>
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="150" align="center" />
            <el-table-column prop="orderDate" label="下单日期" width="110" align="center" />
            <el-table-column prop="customerName" label="客户姓名" width="100" align="center" />
            <el-table-column prop="amount" label="金额" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="depositAmount" label="定金金额" width="100" align="center">
              <template #default="{ row }">
                <span class="deposit">¥{{ formatNumber(row.depositAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="collectionAmount" label="代收金额" width="100" align="center">
              <template #default="{ row }">
                <span class="collection">¥{{ formatNumber(row.collectionAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="logisticsCompany" label="物流公司" width="120" align="center" />
            <el-table-column prop="trackingNumber" label="快递单号" width="150" align="center" />
            <el-table-column prop="productDetails" label="产品详情" min-width="200" />
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="viewOrderDetail(row)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 订单分页 -->
          <div class="order-pagination">
            <el-pagination
              v-model:current-page="orderCurrentPage"
              v-model:page-size="orderPageSize"
              :page-sizes="[30, 50, 100]"
              :total="orderTotal"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleMemberOrderPageChange"
              @current-change="handleMemberOrderPageChange"
            />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 全屏查看对话框 -->
    <el-dialog
      v-model="fullscreenVisible"
      title="团队业绩 - 全屏查看"
      width="95%"
      top="2vh"
      class="fullscreen-dialog"
      :close-on-click-modal="false"
    >
      <div class="fullscreen-content">
        <!-- 筛选器 -->
        <div class="fullscreen-filters">
          <div class="filter-left">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
              size="small"
            />
            <el-select 
              v-model="selectedDepartment" 
              placeholder="选择部门" 
              class="department-select"
              size="small"
            >
              <el-option label="全部部门" value="" />
              <el-option 
                v-for="dept in departmentStore.departmentList" 
                :key="dept.id" 
                :label="dept.name" 
                :value="dept.id" 
              />
            </el-select>
            <el-select 
              v-model="sortBy" 
              placeholder="排序方式" 
              class="sort-select"
              size="small"
            >
              <el-option label="按下单业绩排序" value="orderAmount" />
              <el-option label="按签收业绩排序" value="signAmount" />
              <el-option label="按签收率排序" value="signRate" />
              <el-option label="按下单数排序" value="orderCount" />
            </el-select>
          </div>
          <div class="filter-right">
            <el-button type="primary" @click="queryData" size="small">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="exportData" size="small">
              <el-icon><Download /></el-icon>
              批量导出
            </el-button>
          </div>
        </div>

        <!-- 完整的业绩列表 -->
        <div class="fullscreen-table">
          <el-table 
            :data="memberList" 
            stripe 
            class="data-table"
            :row-class-name="getRowClassName"
            border
            height="calc(100vh - 300px)"
          >
            <el-table-column type="index" label="序号" width="50" align="center" fixed="left" />
            <el-table-column prop="department" label="部门" width="80" align="center" fixed="left" />
            <el-table-column prop="name" label="成员" width="80" align="center" fixed="left" />
            <el-table-column prop="joinDate" label="入职日期" width="100" align="center" />
            <el-table-column prop="orderCount" label="下单数" width="70" align="center" />
            <el-table-column prop="orderAmount" label="下单业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.orderAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="shipCount" label="发货数" width="70" align="center" />
            <el-table-column prop="shipAmount" label="发货业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.shipAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="shipRate" label="发货率" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="getRateType(row.shipRate)" size="small">
                  {{ row.shipRate }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="signCount" label="签收数" width="70" align="center" />
            <el-table-column prop="signAmount" label="签收业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.signAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="signRate" label="签收率" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="getRateType(row.signRate)" size="small">
                  {{ row.signRate }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="transitCount" label="在途数" width="70" align="center" />
            <el-table-column prop="transitAmount" label="在途业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.transitAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="transitRate" label="在途率" width="70" align="center">
              <template #default="{ row }">
                <el-tag type="info" size="small">
                  {{ row.transitRate }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="rejectCount" label="拒收数" width="70" align="center" />
            <el-table-column prop="rejectAmount" label="拒收业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.rejectAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="rejectRate" label="拒收率" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="getRateType(100 - row.rejectRate)" size="small">
                  {{ row.rejectRate }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="returnCount" label="退货数" width="70" align="center" />
            <el-table-column prop="returnAmount" label="退货业绩" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.returnAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="returnRate" label="退货率" width="70" align="center">
              <template #default="{ row }">
                <el-tag :type="getRateType(100 - row.returnRate)" size="small">
                  {{ row.returnRate }}%
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center" fixed="right">
              <template #default="{ row }">
                <div class="operation-buttons">
                  <el-button type="primary" size="small" @click="viewMemberDetail(row)">
                    查看详情
                  </el-button>
                  <el-button type="warning" size="small" @click="analyzeMemberPerformance(row)">
                    分析业绩
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="fullscreen-pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[30, 50, 100, 200]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { usePerformanceStore } from '@/stores/performance'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage } from 'element-plus'
import { 
  Search, 
  Download, 
  TrendCharts, 
  Document, 
  DataAnalysis,
  CircleCheck,
  SuccessFilled,
  Trophy,
  FullScreen
} from '@element-plus/icons-vue'

// 接口定义
interface TeamMember {
  id: number
  name: string
  department: string
  joinDate: string
  orderCount: number
  orderAmount: number
  shipCount: number
  shipAmount: number
  shipRate: number
  signCount: number
  signAmount: number
  signRate: number
  transitCount: number
  transitAmount: number
  transitRate: number
  rejectCount: number
  rejectAmount: number
  rejectRate: number
  returnCount: number
  returnAmount: number
  returnRate: number
  isCurrentUser: boolean
}

interface Order {
  id: number
  orderNumber: string
  customerName: string
  productName: string
  amount: number
  status: string
  createTime: string
  logisticsCompany?: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const performanceStore = usePerformanceStore()

// 响应式数据
const selectedQuickFilter = ref('today')
const dateRange = ref<[string, string]>(['2025-01-01', '2025-01-31'])
const selectedDepartment = ref('')
const sortBy = ref('orderAmount')
const currentPage = ref(1)
const pageSize = ref(30)
const total = ref(100)

// 计算团队成员数量的辅助函数
const getTeamMemberCount = () => {
  const currentUser = userStore.currentUser
  if (!currentUser) return 0

  let count = 0
  
  if (userStore.isSuperAdmin || currentUser.role === 'admin') {
    // 超级管理员：所有销售人员
    count = userStore.users?.filter(user => 
      user.role === 'sales_staff' || user.role === 'department_manager'
    ).length || 0
  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：本部门成员
    count = userStore.users?.filter(user => 
      user.departmentId === currentUser.departmentId &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ).length || 0
  } else {
    // 普通成员：同部门成员
    count = userStore.users?.filter(user => 
      user.departmentId === currentUser.departmentId &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ).length || 0
  }
  
  return count
}

// 弹窗相关
const memberDetailVisible = ref(false)
const selectedMember = ref<TeamMember | null>(null)
const orderCurrentPage = ref(1)
const orderPageSize = ref(30)
const orderTotal = ref(50)

// 全屏查看相关
const fullscreenVisible = ref(false)

// 数据概览 - 基于权限和真实数据计算
const overviewData = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) {
    return {
      totalPerformance: 0,
      totalOrders: 0,
      avgPerformance: 0,
      signOrders: 0,
      signRate: 0,
      signPerformance: 0
    }
  }

  // 根据用户权限获取可访问的订单数据
  let accessibleOrders = orderStore.orders.filter(order => order.auditStatus === 'approved')
  
  // 层级权限控制
  if (userStore.isSuperAdmin || currentUser.role === 'admin') {
    // 超级管理员：查看所有数据
    // accessibleOrders 保持不变，包含所有订单
  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：查看本部门数据
    accessibleOrders = accessibleOrders.filter(order => {
      const salesPerson = userStore.getUserById?.(order.salesPersonId)
      return salesPerson?.departmentId === currentUser.departmentId
    })
  } else {
    // 普通成员：查看自己所在部门的数据（团队业绩）
    accessibleOrders = accessibleOrders.filter(order => {
      const salesPerson = userStore.getUserById?.(order.salesPersonId)
      return salesPerson?.departmentId === currentUser.departmentId
    })
  }

  const totalPerformance = accessibleOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const totalOrders = accessibleOrders.length
  const signedOrders = accessibleOrders.filter(order => order.status === 'signed' || order.status === 'completed')
  const signOrders = signedOrders.length
  const signPerformance = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const signRate = totalOrders > 0 ? (signOrders / totalOrders) * 100 : 0
  
  // 计算人均业绩
  const teamMemberCount = getTeamMemberCount()
  const avgPerformance = teamMemberCount > 0 ? totalPerformance / teamMemberCount : 0

  return {
    totalPerformance,
    totalOrders,
    avgPerformance,
    signOrders,
    signRate: Number(signRate.toFixed(1)),
    signPerformance
  }
})

// 快速筛选选项
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '近7天', value: 'last7days' },
  { label: '本月', value: 'thisMonth' },
  { label: '今年', value: 'thisYear' }
]

// 成员列表 - 基于真实数据和权限计算
const memberList = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 获取可访问的用户列表
  let accessibleUsers: any[] = []
  
  // 层级权限控制
  if (userStore.isSuperAdmin || currentUser.role === 'admin') {
    // 超级管理员：查看所有销售人员
    accessibleUsers = userStore.users?.filter(user => 
      user.role === 'sales_staff' || user.role === 'department_manager'
    ) || []
  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：查看本部门成员
    accessibleUsers = userStore.users?.filter(user => 
      user.departmentId === currentUser.departmentId &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ) || []
  } else {
    // 普通成员：查看同部门成员
    accessibleUsers = userStore.users?.filter(user => 
      user.departmentId === currentUser.departmentId &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ) || []
  }

  return accessibleUsers.map(user => {
    // 计算该用户的业绩数据
    const userOrders = orderStore.orders.filter(order => 
      order.salesPersonId === user.id && order.auditStatus === 'approved'
    )
    
    const orderCount = userOrders.length
    const orderAmount = userOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    
    // 已发货订单
    const shippedOrders = userOrders.filter(order => 
      order.status === 'shipped' || order.status === 'completed'
    )
    const shipCount = shippedOrders.length
    const shipAmount = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const shipRate = orderCount > 0 ? (shipCount / orderCount) * 100 : 0
    
    // 已签收订单
    const signedOrders = userOrders.filter(order => 
      order.status === 'signed' || order.status === 'completed'
    )
    const signCount = signedOrders.length
    const signAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const signRate = orderCount > 0 ? (signCount / orderCount) * 100 : 0
    
    // 运输中订单
    const transitOrders = userOrders.filter(order => order.status === 'shipped')
    const transitCount = transitOrders.length
    const transitAmount = transitOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const transitRate = orderCount > 0 ? (transitCount / orderCount) * 100 : 0
    
    // 拒收订单
    const rejectedOrders = userOrders.filter(order => order.status === 'rejected')
    const rejectCount = rejectedOrders.length
    const rejectAmount = rejectedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const rejectRate = orderCount > 0 ? (rejectCount / orderCount) * 100 : 0
    
    // 退货订单
    const returnedOrders = userOrders.filter(order => order.status === 'returned')
    const returnCount = returnedOrders.length
    const returnAmount = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const returnRate = orderCount > 0 ? (returnCount / orderCount) * 100 : 0

    // 获取部门信息
    const department = departmentStore.departments?.find(dept => dept.id === user.departmentId)

    return {
      id: user.id,
      name: user.name,
      department: department?.name || '未知部门',
      joinDate: user.joinDate || '2023-01-01',
      orderCount,
      orderAmount,
      shipCount,
      shipAmount,
      shipRate: Number(shipRate.toFixed(1)),
      signCount,
      signAmount,
      signRate: Number(signRate.toFixed(1)),
      transitCount,
      transitAmount,
      transitRate: Number(transitRate.toFixed(1)),
      rejectCount,
      rejectAmount,
      rejectRate: Number(rejectRate.toFixed(1)),
      returnCount,
      returnAmount,
      returnRate: Number(returnRate.toFixed(1)),
      isCurrentUser: user.id === currentUser.id
    }
  })
})

// 成员订单列表 - 基于真实数据
const selectedMemberId = ref<number | null>(null)
const memberOrderList = computed(() => {
  if (!selectedMemberId.value) return []
  
  // 获取指定成员的订单
  const memberOrders = orderStore.orders.filter(order => 
    order.salesPersonId === selectedMemberId.value && order.auditStatus === 'approved'
  )
  
  return memberOrders.map(order => {
    // 获取客户信息
    const customer = customerStore.customers?.find(c => c.id === order.customerId)
    
    return {
      id: order.id,
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      customerName: customer?.name || '未知客户',
      amount: order.totalAmount,
      depositAmount: order.depositAmount || 0,
      collectionAmount: order.totalAmount - (order.depositAmount || 0),
      logisticsCompany: order.logisticsCompany || '待发货',
      trackingNumber: order.trackingNumber || '暂无',
      productDetails: order.items?.map(item => `${item.productName} x${item.quantity}`).join(', ') || '暂无详情'
    }
  })
})

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const handleQuickFilter = (value: string) => {
  selectedQuickFilter.value = value
  // 根据快速筛选设置日期范围
  const today = new Date()
  const formatDate = (date: Date) => date.toISOString().split('T')[0]
  
  switch (value) {
    case 'today':
      dateRange.value = [formatDate(today), formatDate(today)]
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      dateRange.value = [formatDate(yesterday), formatDate(yesterday)]
      break
    case 'thisWeek':
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      dateRange.value = [formatDate(startOfWeek), formatDate(today)]
      break
    case 'last7days':
      const last7days = new Date(today)
      last7days.setDate(today.getDate() - 7)
      dateRange.value = [formatDate(last7days), formatDate(today)]
      break
    case 'thisMonth':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      dateRange.value = [formatDate(startOfMonth), formatDate(today)]
      break
    case 'thisYear':
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      dateRange.value = [formatDate(startOfYear), formatDate(today)]
      break
  }
}

const queryData = async () => {
  console.log('查询数据', {
    dateRange: dateRange.value,
    selectedDepartment: selectedDepartment.value,
    sortBy: sortBy.value
  })
  await refreshData()
}

const exportData = () => {
  console.log('导出数据')
}

const showFullscreenView = () => {
  fullscreenVisible.value = true
}

const getRowClassName = ({ row }: { row: TeamMember }) => {
  return row.isCurrentUser ? 'current-user-row' : ''
}

const getRateType = (rate: number) => {
  if (rate >= 90) return 'success'
  if (rate >= 80) return 'warning'
  if (rate >= 70) return 'info'
  return 'danger'
}

const viewMemberDetail = (member: TeamMember) => {
  selectedMember.value = member
  memberDetailVisible.value = true
  // 加载成员订单数据
  loadMemberOrders(member.id)
}

const viewOrderDetail = (order: Order) => {
  safeNavigator.push(`/order/detail/${order.id}`)
}

const loadMemberOrders = (memberId: number) => {
  selectedMemberId.value = memberId
  memberOrderPage.value = 1
  console.log('加载成员订单', memberId, '订单数量:', memberOrderList.value.length)
}

const exportMemberData = (member: TeamMember) => {
  console.log('导出成员数据', member)
  // 这里可以实现导出单个成员的数据逻辑
}

const analyzeMemberPerformance = (member: TeamMember) => {
  console.log('分析成员业绩', member)
  // 这里可以跳转到成员业绩分析页面或打开分析弹窗
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  queryData()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  queryData()
}

const handleMemberOrderPageChange = () => {
  loadMemberOrders(selectedMember.value?.id)
}

// 数据实时更新机制
const refreshData = async () => {
  try {
    loading.value = true
    await Promise.all([
      orderStore.fetchOrders(),
      customerStore.fetchCustomers(),
      userStore.fetchUsers(),
      departmentStore.initData()
    ])
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('数据刷新失败')
  } finally {
    loading.value = false
  }
}

// 监听数据变化，实现实时更新
watch([
  () => orderStore.orders,
  () => userStore.users,
  () => departmentStore.departments,
  () => selectedQuickFilter.value
], () => {
  // 数据变化时自动更新
}, { deep: true })

// 定时刷新数据
let refreshTimer: NodeJS.Timeout | null = null

onMounted(async () => {
  handleQuickFilter('today')
  await refreshData()
  
  // 设置定时刷新（每5分钟）
  refreshTimer = setInterval(refreshData, 5 * 60 * 1000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.team-performance {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.metrics-grid {
  margin-bottom: 24px;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.metrics-row:last-child {
  margin-bottom: 0;
}

.metric-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.total-performance {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.total-orders {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.avg-performance {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.sign-orders {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.sign-rate {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.sign-performance {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: 500;
}

.quick-filters {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-btn {
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 14px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 20px;
  flex-wrap: wrap;
}

.date-picker {
  width: 280px;
}

.department-select {
  width: 140px;
}

.sort-select {
  width: 160px;
}

.query-btn {
  background: #409eff;
  border: none;
  padding: 10px 18px;
  font-size: 14px;
  min-width: 80px;
}

.export-btn {
  background: #67c23a;
  border: none;
  color: white;
  padding: 10px 18px;
  font-size: 14px;
  min-width: 90px;
}

.fullscreen-btn {
  background: #e6a23c;
  border: none;
  color: white;
  padding: 10px 18px;
  font-size: 14px;
  min-width: 90px;
}

.fullscreen-btn:hover {
  background: #d19e2b;
}

/* 全屏对话框样式 */
:deep(.fullscreen-dialog) {
  .el-dialog__body {
    padding: 20px;
    height: calc(100vh - 120px);
    overflow: hidden;
  }
}

.fullscreen-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.fullscreen-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.fullscreen-filters .filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.fullscreen-filters .filter-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fullscreen-filters .date-picker {
  width: 240px;
}

.fullscreen-filters .department-select,
.fullscreen-filters .sort-select {
  width: 140px;
}

.fullscreen-table {
  flex: 1;
  overflow: hidden;
  margin-bottom: 20px;
}

.fullscreen-table .data-table {
  width: 100%;
}

.fullscreen-table .amount {
  font-weight: 600;
  color: #409eff;
}

.fullscreen-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px solid #e9ecef;
}

/* 操作区按钮竖排样式 */
.operation-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.operation-buttons .el-button {
  width: 80px;
  font-size: 12px;
  padding: 6px 8px;
}

.performance-table {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 16px;
}

.amount {
  color: #67c23a;
  font-weight: 500;
}

.deposit {
  color: #409eff;
  font-weight: 500;
}

.collection {
  color: #e6a23c;
  font-weight: 500;
}

/* 当前用户行高亮 */
:deep(.current-user-row) {
  background: rgba(64, 158, 255, 0.1) !important;
  border-left: 3px solid #409eff !important;
}

:deep(.current-user-row:hover) {
  background: rgba(64, 158, 255, 0.15) !important;
}

.member-dialog {
  border-radius: 12px;
}

.member-detail-content {
  padding: 20px;
}

.member-info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
}

.label {
  font-weight: 600;
  color: #2c3e50;
  margin-right: 8px;
}

.value {
  color: #5a6c7d;
}

.order-section h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 16px;
  font-weight: 600;
}

.order-pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 表格样式优化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .filter-left {
    flex-wrap: wrap;
  }
  
  .filter-section {
    flex-direction: column;
    gap: 16px;
  }
  
  .filter-right {
    margin-left: 0;
  }
}

@media (max-width: 768px) {
  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .member-info {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quick-filters {
    justify-content: center;
  }
}
</style>