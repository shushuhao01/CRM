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
          <el-option
            v-if="userStore.currentUser?.role === 'super_admin' || userStore.currentUser?.role === 'admin'"
            label="全部部门"
            value=""
          />
          <el-option
            v-for="dept in accessibleDepartments"
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
        <el-button v-if="canExport" @click="exportData" class="export-btn">
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button
          v-if="canManageExport"
          @click="showExportSettings"
          class="export-settings-btn"
          title="导出权限设置"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button @click="showFullscreenView" class="fullscreen-btn">
          <el-icon><FullScreen /></el-icon>
          全屏查看
        </el-button>
        <!-- 列设置 -->
        <TableColumnSettings
          :columns="tableColumns"
          :storage-key="STORAGE_KEY"
          @columns-change="handleColumnsChange"
          ref="columnSettingsRef"
        />
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
        show-summary
        :summary-method="getSummaries"
      >
        <el-table-column type="index" label="序号" width="60" align="center" fixed="left" />
        <el-table-column prop="name" label="成员" width="100" align="center" fixed="left" />

        <!-- 动态渲染列 -->
        <el-table-column
          v-for="column in dynamicColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :align="column.align"
        >
          <template #default="{ row }">
            <!-- 金额类字段 -->
            <span v-if="column.prop.includes('Amount')" class="amount">
              ¥{{ formatNumber(row[column.prop]) }}
            </span>
            <!-- 百分比类字段 -->
            <el-tag
              v-else-if="column.prop.includes('Rate')"
              :type="getRateType(row[column.prop])"
              size="small"
            >
              {{ row[column.prop] }}%
            </el-tag>
            <!-- 订单数量字段 - 可点击查看对应订单详情 -->
            <el-link
              v-else-if="column.prop.includes('Count') && row[column.prop] > 0"
              type="primary"
              @click="viewOrdersByType(row, column.prop)"
              class="count-link"
            >
              {{ typeof row[column.prop] === 'number' ? (row[column.prop] % 1 === 0 ? row[column.prop] : row[column.prop].toFixed(1)) : row[column.prop] }}
            </el-link>
            <span v-else-if="column.prop.includes('Count')" class="count">
              {{ typeof row[column.prop] === 'number' ? (row[column.prop] % 1 === 0 ? row[column.prop] : row[column.prop].toFixed(1)) : row[column.prop] }}
            </span>
            <!-- 普通字段 -->
            <span v-else>{{ row[column.prop] }}</span>
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
            <span class="label">创建时间：</span>
            <span class="value">{{ formatDateTime(selectedMember.createTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">签收率：</span>
            <span class="value">{{ selectedMember.signRate }}%</span>
          </div>
        </div>

        <!-- 订单列表 -->
        <div class="order-section">
          <h4>订单列表</h4>
          <el-table :data="paginatedOrderList" stripe border class="order-table">
            <el-table-column type="index" label="序号" width="60" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="140" show-overflow-tooltip />
            <el-table-column prop="orderDate" label="下单日期" width="110" show-overflow-tooltip />
            <el-table-column prop="customerName" label="客户姓名" width="110" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="110" align="right" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="depositAmount" label="定金" width="100" align="right" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="deposit">¥{{ formatNumber(row.depositAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="collectionAmount" label="代收" width="100" align="right" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="collection">¥{{ formatNumber(row.collectionAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="订单状态" width="120" align="center">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusTagType(row.status)" size="small">
                  {{ getOrderStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="trackingNumber" label="快递单号" width="160" show-overflow-tooltip />
            <el-table-column prop="productDetails" label="产品详情" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="product-details-cell">
                  {{ row.productDetails }}
                </div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" align="center" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="viewOrderDetail(row)">
                  查看
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

    <!-- 订单类型详情弹窗 -->
    <el-dialog
      v-model="orderTypeDetailVisible"
      :title="orderTypeDetailTitle"
      width="90%"
      top="5vh"
      class="order-type-dialog"
    >
      <div class="order-type-content">
        <!-- 成员基本信息 -->
        <div class="member-info" v-if="orderTypeMember">
          <div class="info-item">
            <span class="label">姓名：</span>
            <span class="value">{{ orderTypeMember.name }}</span>
          </div>
          <div class="info-item">
            <span class="label">部门：</span>
            <span class="value">{{ orderTypeMember.department }}</span>
          </div>
          <div class="info-item">
            <span class="label">订单类型：</span>
            <span class="value">{{ orderTypeLabel }}</span>
          </div>
          <div class="info-item">
            <span class="label">订单数量：</span>
            <span class="value">{{ orderTypeOrders.length }}</span>
          </div>
        </div>

        <!-- 订单列表 -->
        <el-table :data="paginatedOrderTypeList" stripe border class="order-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="140" show-overflow-tooltip />
          <el-table-column prop="orderDate" label="下单日期" width="110" show-overflow-tooltip />
          <el-table-column prop="customerName" label="客户姓名" width="110" show-overflow-tooltip />
          <el-table-column prop="amount" label="金额" width="110" align="right">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber(row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="depositAmount" label="定金" width="100" align="right">
            <template #default="{ row }">
              <span class="deposit">¥{{ formatNumber(row.depositAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="collectionAmount" label="代收" width="100" align="right">
            <template #default="{ row }">
              <span class="collection">¥{{ formatNumber(row.collectionAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="订单状态" width="120" align="center">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusTagType(row.status)" size="small">
                {{ getOrderStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="trackingNumber" label="快递单号" width="160" show-overflow-tooltip />
          <el-table-column prop="productDetails" label="产品详情" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewOrderDetail(row)">
                查看
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="order-pagination">
          <el-pagination
            v-model:current-page="orderTypeCurrentPage"
            v-model:page-size="orderTypePageSize"
            :page-sizes="[30, 50, 100]"
            :total="orderTypeOrders.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
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
              <el-option
                v-if="userStore.currentUser?.role === 'super_admin' || userStore.currentUser?.role === 'admin'"
                label="全部部门"
                value=""
              />
              <el-option
                v-for="dept in accessibleDepartments"
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
            <el-button v-if="canExport" @click="exportData" size="small">
              <el-icon><Download /></el-icon>
              批量导出
            </el-button>
          </div>
        </div>

        <!-- 完整的业绩列表 - 使用动态列与主视图保持一致 -->
        <div class="fullscreen-table">
          <el-table
            :data="memberList"
            stripe
            class="data-table fullscreen-data-table"
            :row-class-name="getRowClassName"
            border
            height="calc(100vh - 300px)"
            style="width: 100%;"
            show-summary
            :summary-method="getFullscreenSummaries"
          >
            <el-table-column type="index" label="序号" width="60" align="center" fixed="left" />
            <el-table-column prop="name" label="成员" width="100" align="center" fixed="left" />

            <!-- 动态渲染列 - 与主视图保持一致 -->
            <el-table-column
              v-for="column in dynamicColumns"
              :key="column.prop"
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :align="column.align"
            >
              <template #default="{ row }">
                <!-- 金额类字段 -->
                <span v-if="column.prop.includes('Amount')" class="amount">
                  ¥{{ formatNumber(row[column.prop]) }}
                </span>
                <!-- 百分比类字段 -->
                <el-tag
                  v-else-if="column.prop.includes('Rate')"
                  :type="getRateType(column.prop.includes('reject') || column.prop.includes('return') ? 100 - row[column.prop] : row[column.prop])"
                  size="small"
                >
                  {{ row[column.prop] }}%
                </el-tag>
                <!-- 创建时间字段 -->
                <span v-else-if="column.prop === 'createTime'">
                  {{ formatDateTime(row[column.prop]) }}
                </span>
                <!-- 订单数量字段 -->
                <span v-else-if="column.prop.includes('Count')" class="count">
                  {{ typeof row[column.prop] === 'number' ? (row[column.prop] % 1 === 0 ? row[column.prop] : row[column.prop].toFixed(1)) : row[column.prop] }}
                </span>
                <!-- 普通字段 -->
                <span v-else>{{ row[column.prop] }}</span>
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

    <!-- 导出权限设置对话框 -->
    <el-dialog
      v-model="exportSettingsVisible"
      title="导出权限设置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="exportFormRef"
        :model="exportFormData"
        label-width="140px"
      >
        <el-form-item label="启用导出功能">
          <el-switch
            v-model="exportFormData.enabled"
            active-text="启用"
            inactive-text="禁用"
          />
          <div class="form-item-tip">
            关闭后，所有成员将无法使用业绩导出功能
          </div>
        </el-form-item>

        <el-form-item label="权限控制方式" v-if="exportFormData.enabled">
          <el-radio-group v-model="exportFormData.permissionType">
            <el-radio label="all">所有人可用</el-radio>
            <el-radio label="role">按角色控制</el-radio>
            <el-radio label="whitelist">白名单控制</el-radio>
          </el-radio-group>
          <div class="form-item-tip">
            选择导出功能的权限控制方式
          </div>
        </el-form-item>

        <el-form-item label="允许的角色" v-if="exportFormData.enabled && exportFormData.permissionType === 'role'">
          <el-checkbox-group v-model="exportFormData.allowedRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="department_manager">部门经理</el-checkbox>
            <el-checkbox label="sales">销售人员</el-checkbox>
            <el-checkbox label="customer_service">客服人员</el-checkbox>
          </el-checkbox-group>
          <div class="form-item-tip">
            选择允许使用导出功能的角色
          </div>
        </el-form-item>

        <el-form-item label="白名单成员" v-if="exportFormData.enabled && exportFormData.permissionType === 'whitelist'">
          <el-select
            v-model="exportFormData.whitelist"
            multiple
            filterable
            placeholder="选择允许导出的成员"
            style="width: 100%;"
          >
            <el-option
              v-for="user in allUsers"
              :key="user.id"
              :label="`${user.name} (${user.id})`"
              :value="user.id"
            />
          </el-select>
          <div class="form-item-tip">
            只有白名单中的成员可以使用导出功能，其他人看不到导出按钮
          </div>
        </el-form-item>

        <el-form-item label="导出限制" v-if="exportFormData.enabled">
          <el-input-number
            v-model="exportFormData.dailyLimit"
            :min="0"
            :max="100"
            placeholder="每日导出次数限制"
          />
          <span style="margin-left: 10px;">次/天（0表示不限制）</span>
          <div class="form-item-tip">
            限制每个成员每天的导出次数，防止滥用
          </div>
        </el-form-item>
      </el-form>

      <el-divider />

      <div class="stats-section">
        <h3>导出统计</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="今日导出次数">{{ exportStats.todayCount }}</el-descriptions-item>
          <el-descriptions-item label="本周导出次数">{{ exportStats.weekCount }}</el-descriptions-item>
          <el-descriptions-item label="本月导出次数">{{ exportStats.monthCount }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveExportSettings">保存设置</el-button>
          <el-button @click="resetExportSettings">恢复默认</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { usePerformanceStore } from '@/stores/performance'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage } from 'element-plus'
import { eventBus, EventNames } from '@/utils/eventBus'
import TableColumnSettings from '@/components/TableColumnSettings.vue'
import { formatDateTime } from '@/utils/dateFormat'
import { getOrderStatusText, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import {
  Search,
  Download,
  TrendCharts,
  Document,
  DataAnalysis,
  CircleCheck,
  SuccessFilled,
  Trophy,
  FullScreen,
  Setting
} from '@element-plus/icons-vue'

// 接口定义
interface TeamMember {
  id: number
  name: string
  username?: string
  employeeNumber?: string
  department: string
  joinDate: string
  createTime?: string
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

interface TableColumn {
  prop: string
  label: string
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  align?: string
  fixed?: boolean | string
  visible: boolean
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const performanceStore = usePerformanceStore()

// 响应式数据
const loading = ref(false)
const selectedQuickFilter = ref('today')
// 初始化为今日日期
const today = new Date()
const formatDateInit = (date: Date) => date.toISOString().split('T')[0]
const dateRange = ref<[string, string]>([formatDateInit(today), formatDateInit(today)])
const selectedDepartment = ref('')
const sortBy = ref('orderAmount')

// 计算可访问的部门列表（根据用户角色）
const accessibleDepartments = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 超级管理员和管理员可以看到所有部门
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return departmentStore.departmentList
  }

  // 部门经理和销售员只能看到自己所在的部门
  if (currentUser.role === 'department_manager' || currentUser.role === 'sales_staff') {
    return departmentStore.departmentList.filter(dept =>
      dept.id === currentUser.departmentId ||
      dept.id === currentUser.department
    )
  }

  return []
})

// 导出设置对话框
const exportSettingsVisible = ref(false)
const exportFormData = reactive({
  enabled: true,
  permissionType: 'all', // all, role, whitelist
  allowedRoles: ['super_admin', 'admin', 'department_manager', 'sales'],
  whitelist: [] as string[],
  dailyLimit: 0
})

// 列设置相关
const STORAGE_KEY = 'team-performance-columns'
const columnSettingsRef = ref()

// 定义所有可用的列
const tableColumns = ref<TableColumn[]>([
  { prop: 'department', label: '部门', width: 100, align: 'center', visible: true },
  { prop: 'username', label: '用户名', width: 100, align: 'center', visible: true },
  { prop: 'employeeNumber', label: '工号', width: 100, align: 'center', visible: false },
  { prop: 'createTime', label: '创建时间', width: 110, align: 'center', visible: false },
  { prop: 'orderCount', label: '下单单数', width: 90, align: 'center', visible: true },
  { prop: 'orderAmount', label: '下单业绩', width: 120, align: 'center', visible: true },
  { prop: 'shipCount', label: '发货单数', width: 90, align: 'center', visible: true },
  { prop: 'shipAmount', label: '发货业绩', width: 120, align: 'center', visible: true },
  { prop: 'shipRate', label: '发货率', width: 80, align: 'center', visible: true },
  { prop: 'signCount', label: '签收单数', width: 90, align: 'center', visible: true },
  { prop: 'signAmount', label: '签收业绩', width: 120, align: 'center', visible: true },
  { prop: 'signRate', label: '签收率', width: 80, align: 'center', visible: true },
  { prop: 'transitCount', label: '在途单数', width: 90, align: 'center', visible: true },
  { prop: 'transitAmount', label: '在途业绩', width: 120, align: 'center', visible: true },
  { prop: 'transitRate', label: '在途率', width: 80, align: 'center', visible: true },
  { prop: 'rejectCount', label: '拒收单数', width: 90, align: 'center', visible: true },
  { prop: 'rejectAmount', label: '拒收业绩', width: 120, align: 'center', visible: true },
  { prop: 'rejectRate', label: '拒收率', width: 80, align: 'center', visible: true },
  { prop: 'returnCount', label: '退货单数', width: 90, align: 'center', visible: true },
  { prop: 'returnAmount', label: '退货业绩', width: 120, align: 'center', visible: true },
  { prop: 'returnRate', label: '退货率', width: 80, align: 'center', visible: true }
])

// 计算动态显示的列
const dynamicColumns = computed(() => {
  return tableColumns.value.filter(col => col.visible)
})

// 导出统计数据
const exportStats = reactive({
  todayCount: 0,
  weekCount: 0,
  monthCount: 0
})

// 所有用户列表
const allUsers = computed(() => {
  return userStore.users || []
})
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
const memberOrderPage = ref(1)

// 全屏查看相关
const fullscreenVisible = ref(false)

// 订单类型详情弹窗相关
const orderTypeDetailVisible = ref(false)
const orderTypeMember = ref<TeamMember | null>(null)
const orderTypeOrders = ref<any[]>([])
const orderTypeLabel = ref('')
const orderTypeDetailTitle = ref('')
const orderTypeCurrentPage = ref(1)
const orderTypePageSize = ref(30)

// 订单类型分页列表
const paginatedOrderTypeList = computed(() => {
  const start = (orderTypeCurrentPage.value - 1) * orderTypePageSize.value
  const end = start + orderTypePageSize.value
  return orderTypeOrders.value.slice(start, end)
})

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

  // 日期范围过滤 - 使用orderDate(下单日期)而不是createTime(创建时间)
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    const [startDate, endDate] = dateRange.value
    accessibleOrders = accessibleOrders.filter(order => {
      // 优先使用orderDate(下单日期),如果没有则使用createTime
      const orderDate = (order.orderDate || order.createTime)?.split(' ')[0] || ''
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  // 层级权限控制
  if (userStore.isSuperAdmin || currentUser.role === 'admin' || currentUser.role === 'super_admin') {
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
  const signedOrders = accessibleOrders.filter(order => order.status === 'delivered')
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
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 成员列表 - 基于真实数据和权限计算
const memberList = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) {
    console.log('[团队业绩] 当前用户不存在')
    return []
  }

  console.log('[团队业绩] 当前用户:', currentUser.name, '角色:', currentUser.role)
  console.log('[团队业绩] 系统总用户数:', userStore.users?.length || 0)

  // 获取可访问的用户列表（先声明）
  let accessibleUsers: unknown[] = []

  // 层级权限控制
  if (userStore.isSuperAdmin || currentUser.role === 'admin' || currentUser.role === 'super_admin') {
    // 超级管理员：查看所有用户
    accessibleUsers = userStore.users || []
    console.log('[团队业绩] 超级管理员，可访问所有用户:', accessibleUsers.length)

  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：查看本部门成员
    accessibleUsers = userStore.users?.filter((user: unknown) =>
      user.departmentId === currentUser.departmentId
    ) || []
    console.log('[团队业绩] 部门经理，可访问本部门用户:', accessibleUsers.length)

  } else {
    // 普通成员：查看同部门成员
    accessibleUsers = userStore.users?.filter((user: unknown) =>
      user.departmentId === currentUser.departmentId
    ) || []
    console.log('[团队业绩] 普通成员，可访问同部门用户:', accessibleUsers.length)

  }

  // 应用部门筛选
  if (selectedDepartment.value) {
    console.log('[团队业绩] 应用部门筛选:', selectedDepartment.value)
    const beforeFilter = accessibleUsers.length
    accessibleUsers = accessibleUsers.filter((user: unknown) =>
      String(user.departmentId) === String(selectedDepartment.value)
    )
    console.log('[团队业绩] 筛选后用户数:', accessibleUsers.length, '(筛选前:', beforeFilter, ')')
  }



  // 直接返回成员列表，不在computed中修改数据
  return accessibleUsers.map((user: unknown) => {
    // 计算该用户的业绩数据
    // 使用createdBy字段匹配（因为salesPersonId可能是undefined）
    let userOrders = orderStore.orders.filter(order => {
      if (order.auditStatus !== 'approved') return false

      // 优先使用salesPersonId匹配
      if (order.salesPersonId && user.id) {
        if (String(order.salesPersonId) === String(user.id)) return true
      }

      // 如果salesPersonId不存在，使用createdBy匹配
      if (order.createdBy && user.name) {
        if (order.createdBy === user.name) return true
      }

      return false
    })

    // 日期范围过滤 - 使用orderDate(下单日期)而不是createTime(创建时间)
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      userOrders = userOrders.filter(order => {
        // 优先使用orderDate(下单日期),如果没有则使用createTime
        const orderDate = (order.orderDate || order.createTime)?.split(' ')[0] || ''
        return orderDate >= startDate && orderDate <= endDate
      })
    }

    const orderCount = userOrders.length
    const orderAmount = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)

    // 【批次207修复】计算业绩分享影响 - 修复订单数量守恒问题
    // 【批次220修复】添加日期筛选,确保分享业绩也按日期范围过滤
    let sharedAmount = 0  // 分享出去的业绩
    let receivedAmount = 0 // 接收到的业绩
    let sharedOrderCount = 0  // 分享出去的订单数量(按比例)
    let receivedOrderCount = 0 // 接收到的订单数量(按比例)

    if (performanceStore.performanceShares) {
      performanceStore.performanceShares.forEach(share => {
        if (share.status !== 'active') return

        // 【批次220关键修复】对分享记录进行日期筛选
        if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
          const [startDate, endDate] = dateRange.value
          // 使用shareDate(分享日期)进行筛选,如果没有则使用createdAt
          const shareDate = (share.shareDate || share.createdAt)?.split(' ')[0] || ''
          if (shareDate < startDate || shareDate > endDate) {
            return // 不在日期范围内,跳过此分享记录
          }
        }

        // 【批次207修复】只计算在当前筛选范围内的订单的分享
        if (String(share.createdById) === String(user.id)) {
          // 检查分享的订单是否在当前筛选的订单中
          const shareOrder = userOrders.find(o => o.orderNumber === share.orderNumber)
          if (shareOrder) {
            // 计算分享出去的总比例
            const totalSharedPercentage = share.shareMembers.reduce((sum, member) => sum + member.percentage, 0)
            const sharedRatio = totalSharedPercentage / 100

            // 【批次207关键修复】按实际分享比例扣除业绩和订单数
            sharedAmount += (share.orderAmount || 0) * sharedRatio
            sharedOrderCount += sharedRatio  // 按比例扣除订单数,而不是扣除1个完整订单
          }
        }

        // 计算接收到的业绩和订单数量
        share.shareMembers.forEach(member => {
          if (String(member.userId) === String(user.id)) {
            const percentage = member.percentage / 100
            receivedAmount += (share.orderAmount || 0) * percentage
            // 按比例接收订单数量
            receivedOrderCount += percentage
          }
        })
      })
    }

    // 【批次205修复】计算净业绩和净订单数,确保不小于0
    const netOrderAmount = Math.max(0, orderAmount - sharedAmount + receivedAmount)
    const netOrderCount = Math.max(0, orderCount - sharedOrderCount + receivedOrderCount)

    // 已发货订单（包括已发货和已签收）
    const shippedOrders = userOrders.filter(order =>
      order.status === 'shipped' || order.status === 'delivered'
    )
    const shipCount = shippedOrders.length
    const shipAmount = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const shipRate = orderCount > 0 ? (shipCount / orderCount) * 100 : 0

    // 已签收订单
    const signedOrders = userOrders.filter(order =>
      order.status === 'delivered'
    )
    const signCount = signedOrders.length
    const signAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const signRate = orderCount > 0 ? (signCount / orderCount) * 100 : 0

    // 运输中订单（已发货但未签收）
    const transitOrders = userOrders.filter(order =>
      order.status === 'shipped' && order.logisticsStatus !== 'delivered'
    )
    const transitCount = transitOrders.length
    const transitAmount = transitOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const transitRate = orderCount > 0 ? (transitCount / orderCount) * 100 : 0

    // 拒收订单
    const rejectedOrders = userOrders.filter(order =>
      order.status === 'rejected' || order.status === 'rejected_returned'
    )
    const rejectCount = rejectedOrders.length
    const rejectAmount = rejectedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const rejectRate = orderCount > 0 ? (rejectCount / orderCount) * 100 : 0

    // 退货订单
    const returnedOrders = userOrders.filter(order =>
      order.status === 'logistics_returned'
    )
    const returnCount = returnedOrders.length
    const returnAmount = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const returnRate = orderCount > 0 ? (returnCount / orderCount) * 100 : 0

    // 获取部门信息 - 优先从departmentStore获取，确保部门名称正确
    let departmentName = '未知部门'
    if (user.departmentId) {
      const dept = departmentStore.departments?.find(d => String(d.id) === String(user.departmentId))
      if (dept) {
        departmentName = dept.name
      } else if (user.department && user.department !== '未知部门') {
        departmentName = user.department
      }
    } else if (user.department && user.department !== '未知部门') {
      departmentName = user.department
    }

    // 格式化创建时间为 YYYY/MM/DD
    let formattedCreateTime = '2023/01/01'
    const rawCreateTime = user.createTime || user.createdAt
    if (rawCreateTime) {
      // 移除时间部分，只保留日期
      const dateOnly = rawCreateTime.split(' ')[0]
      // 将 - 替换为 /
      formattedCreateTime = dateOnly.replace(/-/g, '/')
    }

    return {
      id: user.id,
      name: user.name || user.realName || '未知',
      username: user.username || '-',
      employeeNumber: user.employeeNumber || '-',
      department: departmentName,
      createTime: formattedCreateTime,
      joinDate: formattedCreateTime,
      orderCount: netOrderCount, // 【批次203修复】使用净订单数
      orderAmount: netOrderAmount, // 【批次203修复】使用净业绩
      originalAmount: orderAmount, // 【批次203新增】原始业绩
      sharedAmount: sharedAmount,   // 【批次203新增】分享出去的业绩
      receivedAmount: receivedAmount, // 【批次203新增】接收到的业绩
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
  }).sort((a, b) => {
    // 根据sortBy进行排序，默认按下单业绩降序
    switch (sortBy.value) {
      case 'orderAmount':
        return b.orderAmount - a.orderAmount
      case 'signAmount':
        return b.signAmount - a.signAmount
      case 'signRate':
        return b.signRate - a.signRate
      case 'orderCount':
        return b.orderCount - a.orderCount
      default:
        return b.orderAmount - a.orderAmount // 默认按下单业绩降序
    }
  })
})

// 成员订单列表 - 基于真实数据
const selectedMemberId = ref<number | null>(null)
const memberOrderList = computed(() => {
  if (!selectedMemberId.value || !selectedMember.value) {
    console.log('[订单列表] 未选择成员')
    return []
  }

  const member = selectedMember.value
  console.log('[订单列表] 查询成员订单:', member.name, 'ID:', selectedMemberId.value)
  console.log('[订单列表] 筛选日期范围:', dateRange.value)

  // 获取指定成员的订单 - 使用与memberList相同的匹配逻辑
  const memberOrders = orderStore.orders.filter(order => {
    if (order.auditStatus !== 'approved') return false

    // 日期筛选 - 使用orderDate(下单日期)而不是createTime(创建时间)
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      // 优先使用orderDate(下单日期),如果没有则使用createTime
      const orderDateStr = (order.orderDate || order.createTime || '').split(' ')[0]
      const startDate = dateRange.value[0]
      const endDate = dateRange.value[1]
      if (orderDateStr < startDate || orderDateStr > endDate) {
        return false
      }
    }

    // 优先使用salesPersonId匹配
    if (order.salesPersonId && selectedMemberId.value) {
      if (String(order.salesPersonId) === String(selectedMemberId.value)) return true
    }

    // 如果salesPersonId不存在，使用createdBy匹配
    if (order.createdBy && member.name) {
      if (order.createdBy === member.name) return true
    }

    return false
  })

  console.log('[订单列表] 找到订单数量:', memberOrders.length)

  return memberOrders.map(order => {
    // 获取客户信息
    const customer = customerStore.customers?.find(c => c.id === order.customerId)

    return {
      id: order.id,
      orderNo: order.orderNumber || order.id,
      orderDate: order.createTime || '',
      customerName: customer?.name || order.customerName || '未知客户',
      amount: order.totalAmount,
      depositAmount: order.depositAmount || 0,
      collectionAmount: order.totalAmount - (order.depositAmount || 0),
      logisticsCompany: (order as unknown).logisticsCompany || '待发货',
      trackingNumber: order.trackingNumber || '暂无',
      productDetails: order.products?.map((item: unknown) => `${item.name} x${item.quantity}`).join(', ') || '暂无详情'
    }
  })
})

// 订单列表分页
const paginatedOrderList = computed(() => {
  const start = (orderCurrentPage.value - 1) * orderPageSize.value
  const end = start + orderPageSize.value
  return memberOrderList.value.slice(start, end)
})

// 监听订单列表变化，更新总数
watch(memberOrderList, (newList) => {
  orderTotal.value = newList.length
  orderCurrentPage.value = 1 // 重置到第一页
}, { immediate: true })

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
    case 'all':
      dateRange.value = ['', '']
      break
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
    case 'lastWeek':
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      dateRange.value = [formatDate(lastWeekStart), formatDate(lastWeekEnd)]
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
  console.log('刷新数据', {
    dateRange: dateRange.value,
    selectedDepartment: selectedDepartment.value,
    sortBy: sortBy.value
  })
  // 强制刷新数据
  await refreshData()
  ElMessage.success('数据已刷新')
}

// ========== 列设置相关方法 ==========

// 处理列变化
const handleColumnsChange = (columns: TableColumn[]) => {
  tableColumns.value = columns
}

// 检查是否可以管理导出设置（仅超级管理员和管理员）
const canManageExport = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return false

  return currentUser.role === 'super_admin' || currentUser.role === 'admin'
})

// 检查是否有导出权限
const canExport = computed(() => {
  const exportConfigStr = localStorage.getItem('crm_performance_export_config')
  if (!exportConfigStr) {
    return true // 默认允许
  }

  try {
    const exportConfig = JSON.parse(exportConfigStr)

    // 功能未启用
    if (!exportConfig.enabled) {
      return false
    }

    const currentUser = userStore.currentUser
    if (!currentUser) {
      return false
    }

    // 所有人可用
    if (exportConfig.permissionType === 'all') {
      return true
    }

    // 按角色控制
    if (exportConfig.permissionType === 'role') {
      return exportConfig.allowedRoles?.includes(currentUser.role) || false
    }

    // 白名单控制
    if (exportConfig.permissionType === 'whitelist') {
      return exportConfig.whitelist?.includes(currentUser.id) || false
    }

    return false
  } catch (error) {
    console.error('解析导出配置失败:', error)
    return true
  }
})

/**
 * 记录导出统计
 */
const recordExportStats = () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_performance_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}

    stats[today] = (stats[today] || 0) + 1

    localStorage.setItem('crm_performance_export_stats', JSON.stringify(stats))
  } catch (error) {
    console.error('记录导出统计失败:', error)
  }
}

/**
 * 检查导出限制
 */
const checkExportLimit = () => {
  try {
    const exportConfigStr = localStorage.getItem('crm_performance_export_config')
    if (!exportConfigStr) {
      return true
    }

    const exportConfig = JSON.parse(exportConfigStr)
    const dailyLimit = exportConfig.dailyLimit || 0

    if (dailyLimit === 0) {
      return true // 不限制
    }

    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_performance_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}
    const todayCount = stats[today] || 0

    if (todayCount >= dailyLimit) {
      ElMessage.warning(`每日导出次数已达上限（${dailyLimit}次）`)
      return false
    }

    return true
  } catch (error) {
    console.error('检查导出限制失败:', error)
    return true
  }
}

/**
 * 显示导出设置对话框
 */
const showExportSettings = () => {
  // 加载当前配置
  loadExportConfig()
  // 加载导出统计
  loadExportStats()
  // 显示对话框
  exportSettingsVisible.value = true
}

/**
 * 加载导出配置
 */
const loadExportConfig = () => {
  const exportConfigStr = localStorage.getItem('crm_performance_export_config')
  if (exportConfigStr) {
    try {
      const exportConfig = JSON.parse(exportConfigStr)
      Object.assign(exportFormData, exportConfig)
    } catch (error) {
      console.error('加载导出配置失败:', error)
    }
  }
}

/**
 * 加载导出统计
 */
const loadExportStats = () => {
  const statsStr = localStorage.getItem('crm_performance_export_stats')
  if (statsStr) {
    try {
      const stats = JSON.parse(statsStr)
      const today = new Date().toISOString().split('T')[0]
      const thisWeek = getWeekNumber(new Date())
      const thisMonth = new Date().toISOString().slice(0, 7)

      exportStats.todayCount = stats[today] || 0
      exportStats.weekCount = Object.keys(stats)
        .filter(date => getWeekNumber(new Date(date)) === thisWeek)
        .reduce((sum, date) => sum + (stats[date] || 0), 0)
      exportStats.monthCount = Object.keys(stats)
        .filter(date => date.startsWith(thisMonth))
        .reduce((sum, date) => sum + (stats[date] || 0), 0)
    } catch (error) {
      console.error('加载导出统计失败:', error)
    }
  }
}

/**
 * 获取周数
 */
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * 保存导出设置
 */
const saveExportSettings = () => {
  const exportConfig = {
    enabled: exportFormData.enabled,
    permissionType: exportFormData.permissionType,
    allowedRoles: exportFormData.allowedRoles,
    whitelist: exportFormData.whitelist,
    dailyLimit: exportFormData.dailyLimit
  }

  localStorage.setItem('crm_performance_export_config', JSON.stringify(exportConfig))
  ElMessage.success('导出权限设置已保存并全局生效')
  exportSettingsVisible.value = false
}

/**
 * 恢复默认导出设置
 */
const resetExportSettings = () => {
  exportFormData.enabled = true
  exportFormData.permissionType = 'all'
  exportFormData.allowedRoles = ['super_admin', 'admin', 'department_manager', 'sales']
  exportFormData.whitelist = []
  exportFormData.dailyLimit = 0

  saveExportSettings()
  ElMessage.success('已恢复默认设置')
}

const exportData = async () => {
  // 检查导出限制
  if (!checkExportLimit()) {
    return
  }

  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')

    const dateRangeText = dateRange.value && dateRange.value.length === 2
      ? `${dateRange.value[0]}_${dateRange.value[1]}`
      : '全部时间'

    // 创建工作簿
    const wb = XLSX.utils.book_new()

    // 1. 团队概览表
    const summaryData = [
      ['团队业绩汇总报表'],
      ['统计时间', dateRangeText.replace('_', ' 至 ')],
      ['生成时间', new Date().toLocaleString('zh-CN')],
      [],
      ['指标', '数值'],
      ['团队总业绩', `¥${formatNumber(overviewData.value.totalPerformance)}`],
      ['团队订单', overviewData.value.totalOrders],
      ['人均业绩', `¥${formatNumber(overviewData.value.avgPerformance)}`],
      ['签收单数', overviewData.value.signOrders],
      ['签收率', `${overviewData.value.signRate}%`],
      ['签收业绩', `¥${formatNumber(overviewData.value.signPerformance)}`]
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)
    wsSummary['!cols'] = [{ wch: 15 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, wsSummary, '团队概览')

    // 2. 成员业绩明细表
    const memberData = [
      ['成员业绩明细'],
      [],
      ['序号', '部门', '成员', '用户名', '工号', '创建时间', '下单单数', '下单业绩', '发货单数', '发货业绩', '发货率',
       '签收单数', '签收业绩', '签收率', '在途单数', '在途业绩', '在途率',
       '拒收单数', '拒收业绩', '拒收率', '退货单数', '退货业绩', '退货率']
    ]

    memberList.value.forEach((member, index) => {
      memberData.push([
        index + 1,
        member.department,
        member.name,
        member.username,
        member.employeeNumber,
        member.createTime,
        member.orderCount,
        member.orderAmount,
        member.shipCount,
        member.shipAmount,
        `${member.shipRate}%`,
        member.signCount,
        member.signAmount,
        `${member.signRate}%`,
        member.transitCount,
        member.transitAmount,
        `${member.transitRate}%`,
        member.rejectCount,
        member.rejectAmount,
        `${member.rejectRate}%`,
        member.returnCount,
        member.returnAmount,
        `${member.returnRate}%`
      ])
    })

    const wsMembers = XLSX.utils.aoa_to_sheet(memberData)
    wsMembers['!cols'] = [
      { wch: 6 },  // 序号
      { wch: 12 }, // 部门
      { wch: 10 }, // 成员
      { wch: 12 }, // 用户名
      { wch: 12 }, // 工号
      { wch: 18 }, // 创建时间
      { wch: 10 }, // 下单单数
      { wch: 12 }, // 下单业绩
      { wch: 10 }, // 发货单数
      { wch: 12 }, // 发货业绩
      { wch: 8 },  // 发货率
      { wch: 10 }, // 签收单数
      { wch: 12 }, // 签收业绩
      { wch: 8 },  // 签收率
      { wch: 10 }, // 在途单数
      { wch: 12 }, // 在途业绩
      { wch: 8 },  // 在途率
      { wch: 10 }, // 拒收单数
      { wch: 12 }, // 拒收业绩
      { wch: 8 },  // 拒收率
      { wch: 10 }, // 退货单数
      { wch: 12 }, // 退货业绩
      { wch: 8 }   // 退货率
    ]
    XLSX.utils.book_append_sheet(wb, wsMembers, '成员业绩明细')

    // 3. 业绩排行榜
    const rankingData = [
      ['业绩排行榜'],
      [],
      ['排名', '成员', '用户名', '工号', '部门', '下单业绩', '签收业绩', '签收率']
    ]

    const sortedMembers = [...memberList.value].sort((a, b) => b.orderAmount - a.orderAmount)
    sortedMembers.forEach((member, index) => {
      rankingData.push([
        index + 1,
        member.name,
        member.username,
        member.employeeNumber,
        member.department,
        member.orderAmount,
        member.signAmount,
        `${member.signRate}%`
      ])
    })

    const wsRanking = XLSX.utils.aoa_to_sheet(rankingData)
    wsRanking['!cols'] = [
      { wch: 6 },  // 排名
      { wch: 12 }, // 成员
      { wch: 12 }, // 用户名
      { wch: 12 }, // 工号
      { wch: 12 }, // 部门
      { wch: 15 }, // 下单业绩
      { wch: 15 }, // 签收业绩
      { wch: 10 }  // 签收率
    ]
    XLSX.utils.book_append_sheet(wb, wsRanking, '业绩排行榜')

    // 生成文件名
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    const fileName = `团队业绩报表_${dateRangeText}_${dateStr}_${timeStr}.xlsx`

    // 导出文件
    XLSX.writeFile(wb, fileName)

    // 记录导出统计
    recordExportStats()

    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('数据导出失败，请重试')
  }
}

const showFullscreenView = () => {
  fullscreenVisible.value = true
}

const getRowClassName = ({ row }: { row: TeamMember }) => {
  return row.isCurrentUser ? 'current-user-row' : ''
}

// 表格合计行计算方法
const getSummaries = (param: { columns: any[]; data: TeamMember[] }) => {
  const { columns, data } = param
  const sums: string[] = []

  columns.forEach((column, index) => {
    // 第一列显示"合计"
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    // 第二列（成员名称）显示总人数
    if (index === 1) {
      sums[index] = `${data.length}人`
      return
    }

    const prop = column.property
    if (!prop) {
      sums[index] = ''
      return
    }

    // 金额类字段 - 求和
    if (prop.includes('Amount')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      sums[index] = `¥${formatNumber(total)}`
      return
    }

    // 数量类字段 - 求和
    if (prop.includes('Count')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      // 整数不显示小数点
      sums[index] = total % 1 === 0 ? String(total) : total.toFixed(1)
      return
    }

    // 比率类字段 - 计算平均值
    if (prop.includes('Rate')) {
      const validData = data.filter(row => row[prop] !== undefined && row[prop] !== null)
      if (validData.length > 0) {
        const avg = validData.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0) / validData.length
        sums[index] = `${avg.toFixed(1)}%`
      } else {
        sums[index] = '0%'
      }
      return
    }

    // 其他字段不显示
    sums[index] = ''
  })

  return sums
}

// 全屏表格合计行计算方法
const getFullscreenSummaries = (param: { columns: unknown[]; data: TeamMember[] }) => {
  const { columns, data } = param
  const sums: string[] = []

  // 全屏表格的列顺序：序号、成员、部门、用户名、工号、创建时间、下单数、下单业绩、发货数、发货业绩、发货率...
  columns.forEach((column, index) => {
    // 第一列显示"合计"
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    // 第二列（成员名称）显示总人数
    if (index === 1) {
      sums[index] = `${data.length}人`
      return
    }

    const prop = column.property
    if (!prop) {
      sums[index] = ''
      return
    }

    // 金额类字段 - 求和
    if (prop.includes('Amount')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      sums[index] = `¥${formatNumber(total)}`
      return
    }

    // 数量类字段 - 求和
    if (prop.includes('Count')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      sums[index] = total % 1 === 0 ? String(total) : total.toFixed(1)
      return
    }

    // 比率类字段 - 计算平均值
    if (prop.includes('Rate')) {
      const validData = data.filter(row => row[prop] !== undefined && row[prop] !== null)
      if (validData.length > 0) {
        const avg = validData.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0) / validData.length
        sums[index] = `${avg.toFixed(1)}%`
      } else {
        sums[index] = '0%'
      }
      return
    }

    // 部门、用户名、工号、创建时间等字段不显示合计
    if (['department', 'username', 'employeeNumber', 'createTime'].includes(prop)) {
      sums[index] = '-'
      return
    }

    // 操作列不显示
    sums[index] = ''
  })

  return sums
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

// 根据订单类型查看订单详情
const viewOrdersByType = (member: TeamMember, columnProp: string) => {
  orderTypeMember.value = member
  orderTypeCurrentPage.value = 1

  // 获取该成员的所有订单
  let userOrders = orderStore.orders.filter(order => {
    if (order.auditStatus !== 'approved') return false
    if (order.salesPersonId && member.id) {
      if (String(order.salesPersonId) === String(member.id)) return true
    }
    if (order.createdBy && member.name) {
      if (order.createdBy === member.name) return true
    }
    return false
  })

  // 日期范围过滤
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    const [startDate, endDate] = dateRange.value
    userOrders = userOrders.filter(order => {
      const orderDate = (order.orderDate || order.createTime)?.split(' ')[0] || ''
      return orderDate >= startDate && orderDate <= endDate
    })
  }

  // 根据列类型筛选订单
  const typeMap: Record<string, { label: string; filter: (order: any) => boolean }> = {
    orderCount: {
      label: '下单订单',
      filter: () => true
    },
    shipCount: {
      label: '已发货订单',
      filter: (order) => order.status === 'shipped' || order.status === 'delivered'
    },
    signCount: {
      label: '已签收订单',
      filter: (order) => order.status === 'delivered'
    },
    transitCount: {
      label: '在途订单',
      filter: (order) => order.status === 'shipped' && order.logisticsStatus !== 'delivered'
    },
    rejectCount: {
      label: '拒收订单',
      filter: (order) => order.status === 'rejected' || order.status === 'rejected_returned'
    },
    returnCount: {
      label: '退货订单',
      filter: (order) => order.status === 'logistics_returned'
    }
  }

  const typeConfig = typeMap[columnProp]
  if (typeConfig) {
    orderTypeLabel.value = typeConfig.label
    orderTypeDetailTitle.value = `${member.name} - ${typeConfig.label}详情`
    const filteredOrders = userOrders.filter(typeConfig.filter)

    // 转换为弹窗显示格式
    orderTypeOrders.value = filteredOrders.map(order => ({
      id: order.id,
      orderNo: order.orderNumber,
      orderDate: (order.orderDate || order.createTime)?.split(' ')[0] || '',
      customerName: order.customerName,
      amount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      collectionAmount: (order.totalAmount || 0) - (order.depositAmount || 0),
      status: order.status,
      trackingNumber: order.trackingNumber || order.expressNo || '',
      productDetails: order.products?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || '暂无详情'
    }))

    orderTypeDetailVisible.value = true
  }
}

const loadMemberOrders = (memberId: number) => {
  selectedMemberId.value = memberId
  memberOrderPage.value = 1
  console.log('加载成员订单', memberId, '订单数量:', memberOrderList.value.length)
}

const _exportMemberData = (member: TeamMember) => {
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
  // 分页变化时不需要重新加载，paginatedOrderList会自动计算
  console.log('订单分页变化', { page: orderCurrentPage.value, size: orderPageSize.value, total: orderTotal.value })
}

// 数据实时更新机制
const refreshData = async () => {
  try {
    loading.value = true
    await Promise.all([
      orderStore.getOrders(),
      customerStore.loadCustomers(),
      userStore.loadUsers(),
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

// 处理订单状态变化
const handleOrderStatusChanged = () => {
  console.log('[团队业绩] 收到订单状态变化事件，刷新数据')
  refreshData()
}

onMounted(async () => {
  // 清除旧的列设置缓存，确保使用默认配置（工号和创建时间默认不显示）
  const savedColumns = localStorage.getItem(STORAGE_KEY)
  if (savedColumns) {
    try {
      const parsed = JSON.parse(savedColumns)
      // 检查是否是旧版本的配置（工号和创建时间为true）
      const hasOldConfig = parsed.some((col: any) =>
        (col.prop === 'employeeNumber' || col.prop === 'createTime') && col.visible === true
      )
      if (hasOldConfig) {
        localStorage.removeItem(STORAGE_KEY)
        console.log('[团队业绩] 清除旧的列设置缓存')
      }
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // 初始化部门数据
  if (departmentStore.departments.length === 0) {
    await departmentStore.fetchDepartments()
  }

  // 设置默认部门：部门经理和销售员默认选择自己所在的部门
  const currentUser = userStore.currentUser
  if (currentUser) {
    if (currentUser.role === 'department_manager' || currentUser.role === 'sales_staff') {
      // 非管理员角色，默认选择自己所在的部门
      selectedDepartment.value = currentUser.departmentId || currentUser.department || ''
      console.log('[团队业绩] 默认选择部门:', selectedDepartment.value)
    }
    // 管理员角色默认为空（显示所有部门）
  }

  // 自动修复订单的salesPersonId
  if (currentUser && orderStore.orders.length > 0) {
    let fixedCount = 0
    orderStore.orders.forEach(order => {
      if (!order.salesPersonId || order.salesPersonId === undefined) {
        order.salesPersonId = currentUser.id
        fixedCount++
      }
    })

    if (fixedCount > 0) {
      console.log(`[团队业绩] 自动修复了 ${fixedCount} 个订单的salesPersonId`)
      console.log(`[团队业绩] 当前用户ID: ${currentUser.id} (类型: ${typeof currentUser.id})`)

      // 验证修复结果
      const fixed = orderStore.orders.filter(o => String(o.salesPersonId) === String(currentUser.id))
      console.log(`[团队业绩] 修复后匹配到 ${fixed.length} 个订单`)

      // 触发响应式更新
      orderStore.orders = [...orderStore.orders]

      // 强制保存到localStorage
      const orderData = {
        orders: orderStore.orders
      }
      localStorage.setItem('crm_store_order', JSON.stringify({ data: orderData }))
      console.log('[团队业绩] 已保存到localStorage，即将刷新页面')

      // 刷新页面以应用修复
      setTimeout(() => {
        location.reload()
      }, 500)
      console.log('[团队业绩] 已保存到localStorage')
    }
  }

  handleQuickFilter('today')
  await refreshData()

  // 设置定时刷新（每5分钟）
  refreshTimer = setInterval(refreshData, 5 * 60 * 1000)

  // 监听订单状态变化事件
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.on(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }

  // 清理事件监听
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.off(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)
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

/* 订单类型详情弹窗 */
.order-type-dialog {
  border-radius: 12px;
}

.order-type-content {
  padding: 20px;
}

/* 单数量链接样式 */
.count-link {
  cursor: pointer;
  font-weight: 500;
}

.count-link:hover {
  text-decoration: underline;
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

/* 订单列表表格优化 */
.order-table {
  font-size: 13px;
}

.order-table :deep(.el-table__cell) {
  padding: 8px 0;
  white-space: nowrap;
}

.product-details-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.order-table :deep(.el-table__fixed-right) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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

/* 导出设置按钮样式 */
.export-settings-btn {
  margin-left: 0;
  padding: 8px 12px;
}

.export-settings-btn .el-icon {
  font-size: 16px;
}

/* 导出设置对话框样式 */
.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.stats-section {
  padding: 20px 0;
}

.stats-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 全屏对话框样式优化 */
.fullscreen-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: calc(100vh - 150px);
    overflow: hidden;
  }
}

.fullscreen-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.fullscreen-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.fullscreen-table {
  flex: 1;
  overflow: hidden;
  margin-bottom: 16px;
}

/* 全屏表格样式 */
.fullscreen-data-table {
  width: 100% !important;
}

.fullscreen-data-table :deep(.el-table__body-wrapper) {
  overflow-x: auto !important;
  overflow-y: auto !important;
}

/* 隐藏表头的滚动条，只保留底部滚动条 */
.fullscreen-data-table :deep(.el-table__header-wrapper) {
  overflow-x: hidden !important;
  overflow-y: hidden !important;
}

/* 冻结列样式优化 */
.fullscreen-data-table :deep(.el-table__fixed) {
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
}

.fullscreen-data-table :deep(.el-table__fixed-right) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}

/* 确保表格内容不被截断 */
.fullscreen-data-table :deep(.el-table__cell) {
  white-space: nowrap;
  overflow: visible;
}

.fullscreen-pagination {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  background: white;
  border-radius: 8px;
}

/* 操作按钮组 */
.operation-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.operation-buttons .el-button {
  padding: 5px 10px;
  font-size: 12px;
}

/* 合计行样式 */
:deep(.el-table__footer-wrapper) {
  background: #f0f9eb;
}

:deep(.el-table__footer) {
  font-weight: 600;
}

:deep(.el-table__footer td) {
  background: #f0f9eb !important;
  color: #409eff;
  font-size: 14px;
}

:deep(.el-table__footer td:first-child) {
  color: #303133;
  font-weight: 700;
}
</style>


/* 列设置样式 - 使用TableColumnSettings组件，无需自定义样式 */

/* 下拉菜单定位优化 */
:deep(.el-dropdown-menu) {
  max-height: 65vh !important;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
