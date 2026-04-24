<template>
  <div class="analysis-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <el-button
          type="primary"
          :icon="ArrowLeft"
          @click="goBack"
          class="back-btn"
        >
          返回团队业绩
        </el-button>
        <h1 class="page-title">业绩分析</h1>
      </div>
    </div>

    <!-- 成员信息卡片 (仅当查看个人数据时显示) -->
    <div v-if="showMemberInfo" class="member-info-card">
      <div class="member-avatar">
        <el-avatar :size="60" :src="memberInfo.avatar">{{ memberInfo.name.charAt(0) }}</el-avatar>
      </div>
      <div class="member-details">
        <h3>{{ memberInfo.name }}</h3>
        <p>{{ memberInfo.department }} | 入职时间：{{ memberInfo.joinDate }}</p>
      </div>
    </div>

    <!-- 快速时间筛选 -->
    <div class="quick-filter-section">
      <div class="quick-filter-label">快速筛选：</div>
      <div class="quick-filter-buttons">
        <el-button
          v-for="item in quickFilterOptions"
          :key="item.key"
          :type="selectedQuickFilter === item.key ? 'primary' : 'default'"
          size="small"
          @click="handleQuickFilter(item.key)"
          class="quick-filter-btn"
        >
          {{ item.label }}
        </el-button>
      </div>
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
          @change="queryData"
        />
        <el-select
          v-if="userStore.isAdmin || userStore.isManager"
          v-model="selectedDepartment"
          placeholder="选择部门"
          class="department-select"
          size="default"
          :disabled="!userStore.isAdmin"
          @change="queryData"
        >
          <el-option v-if="userStore.isAdmin" label="全部部门" value="" />
          <el-option
            v-for="dept in availableDepartments"
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
          @change="queryData"
        >
          <el-option label="按业绩排序" value="performance" />
          <el-option label="按订单数排序" value="orders" />
          <el-option label="按签收率排序" value="signRate" />
        </el-select>
      </div>
      <div class="filter-right">
        <el-button type="primary" @click="queryData" class="query-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
        <el-button @click="exportData" class="export-btn">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
        <el-button
          v-if="canManageExport"
          @click="showExportSettings"
          class="export-settings-btn"
          title="导出权限设置"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 核心指标卡片 -->
    <div class="metrics-grid">
      <!-- 第一行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon total-performance">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.totalPerformance) }}</div>
            <div class="metric-label">总业绩</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon total-orders">
            <el-icon><Document /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.totalOrders }}</div>
            <div class="metric-label">总订单</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon avg-performance">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.avgPerformance) }}</div>
            <div class="metric-label">平均业绩</div>
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
            <div class="metric-value">{{ metrics.signOrders }}</div>
            <div class="metric-label">签收单数</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon sign-rate">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.signRate }}%</div>
            <div class="metric-label">签收率</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon sign-performance">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(metrics.signPerformance) }}</div>
            <div class="metric-label">签收业绩</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-header">
            <h3>业绩趋势</h3>
          </div>
          <div class="chart-content" ref="performanceChartRef"></div>
        </div>

        <div class="chart-card">
          <div class="chart-header">
            <h3>订单状态分布</h3>
          </div>
          <div class="chart-content" ref="orderStatusChartRef"></div>
        </div>
      </div>


    </div>

    <!-- 业绩数据概览 -->
    <div class="table-section">
      <div class="table-header">
        <h3>业绩数据</h3>
        <el-button
          @click="showTableFullscreen"
          :icon="FullScreen"
          class="fullscreen-btn"
          title="全屏查看"
        >
          全屏查看
        </el-button>
      </div>
      <el-table :data="tableData" stripe class="data-table" border>
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="department" label="部门" width="100" align="center" />
        <el-table-column prop="name" label="下单员" width="100" align="center" />
        <el-table-column prop="orderCount" label="下单单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.orderCount > 0" type="primary" @click="viewOrdersByType(row, 'orderCount')">
              {{ row.orderCount }}
            </el-link>
            <span v-else>{{ row.orderCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderAmount" label="下单业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.orderAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipCount" label="发货单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.shipCount > 0" type="primary" @click="viewOrdersByType(row, 'shipCount')">
              {{ row.shipCount }}
            </el-link>
            <span v-else>{{ row.shipCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipAmount" label="发货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.shipAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipRate" label="发货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.shipRate)" size="small">
              {{ row.shipRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signCount" label="签收单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.signCount > 0" type="primary" @click="viewOrdersByType(row, 'signCount')">
              {{ row.signCount }}
            </el-link>
            <span v-else>{{ row.signCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signAmount" label="签收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.signAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signRate" label="签收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.signRate)" size="small">
              {{ row.signRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transitCount" label="在途单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.transitCount > 0" type="primary" @click="viewOrdersByType(row, 'transitCount')">
              {{ row.transitCount }}
            </el-link>
            <span v-else>{{ row.transitCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transitAmount" label="在途业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.transitAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transitRate" label="在途率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRateType(row.transitRate)" size="small">
              {{ row.transitRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectCount" label="拒收单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.rejectCount > 0" type="primary" @click="viewOrdersByType(row, 'rejectCount')">
              {{ row.rejectCount }}
            </el-link>
            <span v-else>{{ row.rejectCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectAmount" label="拒收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.rejectAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectRate" label="拒收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRejectRateType(row.rejectRate)" size="small">
              {{ row.rejectRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="returnCount" label="退货单数" width="100" align="center">
          <template #default="{ row }">
            <el-link v-if="row.returnCount > 0" type="primary" @click="viewOrdersByType(row, 'returnCount')">
              {{ row.returnCount }}
            </el-link>
            <span v-else>{{ row.returnCount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="returnAmount" label="退货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.returnAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="returnRate" label="退货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReturnRateType(row.returnRate)" size="small">
              {{ row.returnRate }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 导出权限设置对话框 -->
    <el-dialog
      v-model="exportSettingsVisible"
      title="导出权限设置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form :model="exportFormData" label-width="120px">
        <el-form-item label="启用导出功能">
          <el-switch v-model="exportFormData.enabled" />
          <span class="form-item-tip">关闭后所有用户将无法导出业绩数据</span>
        </el-form-item>

        <el-form-item label="导出权限">
          <el-radio-group v-model="exportFormData.permissionType">
            <el-radio label="all">所有人可导出</el-radio>
            <el-radio label="admin_only">仅管理员可导出</el-radio>
            <el-radio label="custom">自定义权限</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="exportFormData.permissionType === 'custom'" label="允许导出的角色">
          <el-checkbox-group v-model="exportFormData.allowedRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="department_manager">部门经理</el-checkbox>
            <el-checkbox label="sales_staff">销售员</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="每日导出限制">
          <el-input-number
            v-model="exportFormData.dailyLimit"
            :min="0"
            :max="100"
            placeholder="0表示不限制"
          />
          <span class="form-item-tip">每个用户每天最多可导出的次数，0表示不限制</span>
        </el-form-item>

        <el-divider />

        <el-form-item label="导出统计">
          <div class="export-stats">
            <div class="stat-item">
              <span class="stat-label">今日导出次数：</span>
              <span class="stat-value">{{ exportStats.todayCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">本月导出次数：</span>
              <span class="stat-value">{{ exportStats.monthCount }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">总导出次数：</span>
              <span class="stat-value">{{ exportStats.totalCount }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveExportSettings">保存设置</el-button>
          <el-button @click="resetExportSettings">恢复默认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 表格全屏查看对话框 -->
    <el-dialog
      v-model="tableFullscreenVisible"
      title="业绩数据 - 全屏查看"
      fullscreen
      :close-on-click-modal="false"
    >
      <el-table
        :data="tableData"
        stripe
        border
        class="fullscreen-table"
        height="calc(100vh - 200px)"
      >
        <el-table-column type="index" label="序号" width="60" align="center" fixed />
        <el-table-column prop="name" label="部门（或成员）" width="120" align="center" fixed />
        <el-table-column prop="orderCount" label="下单单数" width="100" align="center" />
        <el-table-column prop="orderAmount" label="下单业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.orderAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipCount" label="发货单数" width="100" align="center" />
        <el-table-column prop="shipAmount" label="发货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.shipAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="shipRate" label="发货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.shipRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="signCount" label="签收单数" width="100" align="center" />
        <el-table-column prop="signAmount" label="签收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.signAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="signRate" label="签收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.signRate >= 80 ? 'success' : row.signRate >= 70 ? 'info' : 'danger'" size="small">
              {{ row.signRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transitCount" label="在途单数" width="100" align="center" />
        <el-table-column prop="transitAmount" label="在途业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.transitAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="transitRate" label="在途率" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">
              {{ row.transitRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rejectCount" label="拒收单数" width="100" align="center" />
        <el-table-column prop="rejectAmount" label="拒收业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.rejectAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="rejectRate" label="拒收率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getRejectRateType(row.rejectRate)" size="small">
              {{ row.rejectRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="returnCount" label="退货单数" width="100" align="center" />
        <el-table-column prop="returnAmount" label="退货业绩" width="120" align="center">
          <template #default="{ row }">
            <span class="amount">¥{{ formatNumber(row.returnAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="returnRate" label="退货率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getReturnRateType(row.returnRate)" size="small">
              {{ row.returnRate }}%
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="tableFullscreenVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportData" :icon="Download">
          导出数据
        </el-button>
      </template>
    </el-dialog>

    <!-- 订单类型详情弹窗 -->
    <el-dialog
      v-model="orderTypeDetailVisible"
      :title="orderTypeDetailTitle"
      width="90%"
      top="5vh"
      custom-class="order-type-dialog"
    >
      <div class="order-type-content">
        <!-- 成员基本信息 -->
        <div class="member-info" v-if="orderTypeMember" style="display: flex; flex-wrap: nowrap; align-items: center; gap: 32px; padding: 16px 24px; background: #f5f7fa; border-radius: 8px; margin-bottom: 16px;">
          <div class="info-item" style="display: flex; align-items: center; flex-shrink: 0; white-space: nowrap;">
            <span class="label" style="color: #909399; margin-right: 8px;">部门：</span>
            <span class="value" style="color: #303133; font-weight: 500;">{{ orderTypeMember.department }}</span>
          </div>
          <div class="info-item" style="display: flex; align-items: center; flex-shrink: 0; white-space: nowrap;">
            <span class="label" style="color: #909399; margin-right: 8px;">下单员：</span>
            <span class="value" style="color: #303133; font-weight: 500;">{{ orderTypeMember.name }}</span>
          </div>
          <div class="info-item" style="display: flex; align-items: center; flex-shrink: 0; white-space: nowrap;">
            <span class="label" style="color: #909399; margin-right: 8px;">订单类型：</span>
            <span class="value" style="color: #303133; font-weight: 500;">{{ orderTypeLabel }}</span>
          </div>
          <div class="info-item" style="display: flex; align-items: center; flex-shrink: 0; white-space: nowrap;">
            <span class="label" style="color: #909399; margin-right: 8px;">订单数量：</span>
            <span class="value" style="color: #303133; font-weight: 500;">{{ orderTypeOrders.length }}</span>
          </div>
        </div>

        <!-- 订单列表 -->
        <el-table :data="paginatedOrderTypeList" stripe border class="order-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="140" show-overflow-tooltip />
          <el-table-column prop="orderDate" label="下单日期" width="110" show-overflow-tooltip />
          <el-table-column prop="department" label="部门" width="100" show-overflow-tooltip />
          <el-table-column prop="salesPerson" label="下单员" width="100" show-overflow-tooltip />
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
          <el-table-column prop="trackingNumber" label="快递单号" width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span
                v-if="row.trackingNumber"
                class="tracking-number-link"
                @click="handleTrackingNoClick(row)"
              >{{ row.trackingNumber }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
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
            :page-sizes="[10, 20, 30, 50, 100]"
            :total="orderTypeOrders.length"
            layout="total, sizes, prev, pager, next, jumper"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { useOrderStore } from '@/stores/order'
import { createSafeNavigator } from '@/utils/navigation'
import * as echarts from 'echarts'
import {
  ArrowLeft,
  Search,
  Download,
  Setting,
  FullScreen,
  TrendCharts,
  Document,
  DataAnalysis,
  CircleCheck,
  SuccessFilled,
  Trophy
} from '@element-plus/icons-vue'
import { getOrderStatusText, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { showLogisticsQueryDialog } from '@/utils/logisticsQuery'

// 接口定义
interface PerformanceData {
  id?: string
  name: string
  department?: string  // 部门名称
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
  status: string
}

const _route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const orderStore = useOrderStore()

// 🔥 日期比较工具函数 - 使用北京时间字符串比较，避免时区问题
const isOrderInDateRange = (orderCreateTime: string, startDateStr: string, endDateStr: string): boolean => {
  if (!orderCreateTime) return false
  // 将 "YYYY/MM/DD HH:mm:ss" 格式转换为 "YYYY-MM-DD HH:mm:ss"
  const normalizedTime = orderCreateTime.replace(/\//g, '-')
  const startTime = startDateStr + ' 00:00:00'
  const endTime = endDateStr + ' 23:59:59'
  return normalizedTime >= startTime && normalizedTime <= endTime
}

// 图表引用
const performanceChartRef = ref()
const orderStatusChartRef = ref()

// 响应式数据
const today = new Date()
// 🔥 使用本地时间格式化日期，避免UTC时区问题
const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
// 🔥 默认选中"今日"
const dateRange = ref<[string, string]>([formatDate(today), formatDate(today)])
const selectedDepartment = ref(userStore.isAdmin ? '' : userStore.currentUser?.departmentId || '')
const sortBy = ref('performance')
const selectedQuickFilter = ref('today')

// 成员信息 - 🔥 修复：移除硬编码模拟数据，使用当前登录用户真实信息
const memberInfo = ref({
  id: '',
  name: '',
  department: '',
  joinDate: '',
  avatar: ''
})

// 核心指标
const metrics = ref({
  totalPerformance: 0,
  totalOrders: 0,
  avgPerformance: 0,
  signOrders: 0,
  signRate: 0,
  signPerformance: 0
})

// 业绩数据列表
const tableData = ref<PerformanceData[]>([])

// 快速筛选相关
const quickFilterOptions = ref([
  { key: 'all', label: '全部' },
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'thisQuarter', label: '本季' },
  { key: 'thisYear', label: '本年' }
])

// 导出设置对话框
const exportSettingsVisible = ref(false)
const exportFormData = reactive({
  enabled: true,
  permissionType: 'all',
  allowedRoles: ['super_admin', 'admin', 'department_manager', 'sales_staff'],
  dailyLimit: 0
})

const exportStats = ref({
  todayCount: 0,
  monthCount: 0,
  totalCount: 0
})

// 全屏查看对话框
const tableFullscreenVisible = ref(false)

// 订单类型详情弹窗相关
const orderTypeDetailVisible = ref(false)
const orderTypeMember = ref<any>(null)
const orderTypeOrders = ref<any[]>([])
const orderTypeLabel = ref('')
const orderTypeDetailTitle = ref('')
const orderTypeCurrentPage = ref(1)
const orderTypePageSize = ref(10)

// 订单类型分页列表
const paginatedOrderTypeList = computed(() => {
  const start = (orderTypeCurrentPage.value - 1) * orderTypePageSize.value
  const end = start + orderTypePageSize.value
  return orderTypeOrders.value.slice(start, end)
})

const showMemberInfo = computed(() => {
  return !userStore.isAdmin && !userStore.isManager
})

// 可用部门列表（根据用户权限过滤）
const availableDepartments = computed(() => {
  if (userStore.isAdmin) {
    // 超级管理员可以看到所有部门
    return departmentStore.departmentList
  } else if (userStore.isManager) {
    // 部门经理只能看到自己的部门
    return departmentStore.departmentList.filter(dept => dept.id === userStore.currentUser?.departmentId)
  } else {
    // 普通用户不能选择部门
    return []
  }
})

// 方法
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

const goBack = () => {
  safeNavigator.push('/performance/team')
}

const queryData = async () => {
  console.log('查询数据', {
    dateRange: dateRange.value,
    selectedDepartment: selectedDepartment.value,
    sortBy: sortBy.value
  })

  // 重新加载订单数据以获取最新数据
  try {
    console.log('📊 [业绩分析] 查询时重新加载订单数据...')
    await orderStore.loadOrdersFromAPI(true)
    console.log('📊 [业绩分析] 订单数据加载完成，共', orderStore.orders.length, '条')
  } catch (error) {
    console.error('📊 [业绩分析] 加载订单数据失败:', error)
  }

  loadData()
}

const exportData = () => {
  console.log('导出数据')
  // TODO: 实现导出功能
}

// 检查是否可以管理导出设置（仅超级管理员和管理员）
const canManageExport = computed(() => {
  const currentUser = userStore.currentUser
  return currentUser?.role === 'super_admin' || currentUser?.role === 'admin'
})

/**
 * 显示导出设置对话框
 */
const showExportSettings = () => {
  // 加载当前配置
  loadExportConfig()
  loadExportStats()
  // 显示对话框
  exportSettingsVisible.value = true
}

/**
 * 加载导出配置
 */
const loadExportConfig = () => {
  const config = localStorage.getItem('crm_performance_export_config')
  if (config) {
    try {
      const parsedConfig = JSON.parse(config)
      exportFormData.enabled = parsedConfig.enabled ?? true
      exportFormData.permissionType = parsedConfig.permissionType || 'all'
      exportFormData.allowedRoles = parsedConfig.allowedRoles || ['super_admin', 'admin', 'department_manager', 'sales_staff']
      exportFormData.dailyLimit = parsedConfig.dailyLimit || 0
    } catch (error) {
      console.error('加载导出配置失败:', error)
    }
  }
}

/**
 * 加载导出统计
 */
const loadExportStats = () => {
  const stats = localStorage.getItem('crm_performance_export_stats')
  if (stats) {
    try {
      const parsedStats = JSON.parse(stats)
      exportStats.value = {
        todayCount: parsedStats.todayCount || 0,
        monthCount: parsedStats.monthCount || 0,
        totalCount: parsedStats.totalCount || 0
      }
    } catch (error) {
      console.error('加载导出统计失败:', error)
    }
  }
}

/**
 * 保存导出设置
 */
const saveExportSettings = () => {
  const exportConfig = {
    enabled: exportFormData.enabled,
    permissionType: exportFormData.permissionType,
    allowedRoles: exportFormData.allowedRoles,
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
  exportFormData.allowedRoles = ['super_admin', 'admin', 'department_manager', 'sales_staff']
  exportFormData.dailyLimit = 0

  saveExportSettings()
  ElMessage.success('已恢复默认设置')
}

/**
 * 显示表格全屏查看对话框
 */
const showTableFullscreen = () => {
  tableFullscreenVisible.value = true
}

/**
 * 根据订单类型查看订单详情
 */
const viewOrdersByType = (row: any, columnProp: string) => {
  orderTypeMember.value = row
  orderTypeCurrentPage.value = 1

  // 🔥 获取订单数据 - 使用新的业绩计算规则
  let orders = orderStore.orders.filter(order => {
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  // 应用部门筛选
  if (selectedDepartment.value) {
    const departmentUsers = userStore.users?.filter(u => u.departmentId === selectedDepartment.value).map(u => u.id) || []
    orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
  }

  // 应用日期筛选 - 🔥 使用北京时间字符串比较
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    orders = orders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
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
      filter: (order) => order.status === 'logistics_returned' || order.status === 'after_sales_created'
    }
  }

  const typeConfig = typeMap[columnProp]
  if (typeConfig) {
    orderTypeLabel.value = typeConfig.label
    orderTypeDetailTitle.value = `${row.name} - ${typeConfig.label}详情`
    const filteredOrders = orders.filter(typeConfig.filter)

    // 转换为弹窗显示格式，添加部门和下单员字段
    orderTypeOrders.value = filteredOrders.map(order => {
      // 获取下单员信息
      const salesPerson = userStore.users?.find(u => String(u.id) === String(order.salesPersonId))
      const dept = departmentStore.departments?.find(d => String(d.id) === String(salesPerson?.departmentId))

      return {
        id: order.id,
        orderNo: order.orderNumber,
        orderDate: (order.orderDate || order.createTime)?.split(' ')[0] || '',
        department: dept?.name || salesPerson?.departmentName || order.createdByDepartmentName || '未知部门',
        salesPerson: salesPerson?.realName || salesPerson?.name || order.createdByName || order.createdBy || '未知',
        customerName: order.customerName,
        amount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        collectionAmount: (order.totalAmount || 0) - (order.depositAmount || 0),
        status: order.status,
        trackingNumber: order.trackingNumber || order.expressNo || '',
        productDetails: order.products?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || '暂无详情'
      }
    })

    orderTypeDetailVisible.value = true
  }
}

/**
 * 查看订单详情
 */
const viewOrderDetail = (order: any) => {
  safeNavigator.push(`/order/detail/${order.id}`)
}

/**
 * 处理快递单号点击 - 显示物流查询选项
 */
const handleTrackingNoClick = (row: any) => {
  if (!row.trackingNumber) return
  showLogisticsQueryDialog({
    trackingNo: row.trackingNumber,
    companyCode: row.logisticsCompany || row.expressCompany,
    router
  })
}



const getRateType = (rate: number) => {
  if (rate >= 90) return 'success'
  if (rate >= 80) return 'warning'
  if (rate >= 70) return 'info'
  return 'danger'
}

const getRejectRateType = (rate: number) => {
  if (rate <= 3) return 'success'
  if (rate <= 5) return 'warning'
  if (rate <= 8) return 'info'
  return 'danger'
}

const getReturnRateType = (rate: number) => {
  if (rate <= 2) return 'success'
  if (rate <= 4) return 'warning'
  if (rate <= 6) return 'info'
  return 'danger'
}

// 快速筛选处理函数
const handleQuickFilter = (filterKey: string) => {
  selectedQuickFilter.value = filterKey
  const today = new Date()
  // 🔥 使用本地时间格式化日期，避免UTC时区问题
  const formatDateLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  switch (filterKey) {
    case 'all':
      // 全部：从5年前到今天（足够覆盖所有历史数据）
      const fiveYearsAgo = new Date(today.getFullYear() - 5, 0, 1)
      dateRange.value = [formatDateLocal(fiveYearsAgo), formatDateLocal(today)]
      break
    case 'today':
      dateRange.value = [formatDateLocal(today), formatDateLocal(today)]
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      dateRange.value = [formatDateLocal(yesterday), formatDateLocal(yesterday)]
      break
    case 'thisWeek':
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1)
      dateRange.value = [formatDateLocal(startOfWeek), formatDateLocal(today)]
      break
    case 'lastWeek':
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - today.getDay())
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      dateRange.value = [formatDateLocal(lastWeekStart), formatDateLocal(lastWeekEnd)]
      break
    case 'thisMonth':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      dateRange.value = [formatDateLocal(startOfMonth), formatDateLocal(today)]
      break
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      dateRange.value = [formatDateLocal(lastMonthStart), formatDateLocal(lastMonthEnd)]
      break
    case 'thisQuarter':
      const currentQuarter = Math.floor(today.getMonth() / 3)
      const startOfQuarter = new Date(today.getFullYear(), currentQuarter * 3, 1)
      dateRange.value = [formatDateLocal(startOfQuarter), formatDateLocal(today)]
      break
    case 'thisYear':
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      dateRange.value = [formatDateLocal(startOfYear), formatDateLocal(today)]
      break
  }

  // 触发数据重新加载
  loadData()
}



// 初始化图表
// 图表数据
const chartData = ref({
  performanceTrend: {
    xAxis: [] as string[],
    orderData: [] as number[],  // 下单业绩
    signData: [] as number[]    // 签收业绩
  },
  orderStatus: [] as Array<{ value: number; name: string; amount: number }>
})

// 加载图表数据 - 🔥 优先使用后端API，确保加载所有年份的数据
const loadChartData = async () => {
  try {
    console.log('📊 [业绩分析] 开始加载图表数据')
    console.log('📊 [业绩分析] 当前筛选条件:', {
      dateRange: dateRange.value,
      department: selectedDepartment.value,
      quickFilter: selectedQuickFilter.value
    })

    // 🔥 优先尝试从后端API获取图表数据
    try {
      const { getAnalysisChartData } = await import('@/api/performance')

      // 根据快速筛选确定数据粒度
      let granularity: 'hour' | 'day' | 'month' | 'year' | undefined
      if (selectedQuickFilter.value === 'today' || selectedQuickFilter.value === 'yesterday') {
        granularity = 'hour'
      } else if (selectedQuickFilter.value === 'all') {
        granularity = 'year'
      } else if (selectedQuickFilter.value === 'thisYear') {
        granularity = 'month'
      }
      // 其他情况让后端自动判断

      const response = await getAnalysisChartData({
        startDate: dateRange.value?.[0],
        endDate: dateRange.value?.[1],
        departmentId: selectedDepartment.value || undefined,
        granularity
      })

      if (response.success && response.data) {
        console.log('📊 [业绩分析] 后端API返回图表数据:', response.data)

        // 使用后端返回的数据
        chartData.value.performanceTrend = {
          xAxis: response.data.performanceTrend.xAxis,
          orderData: response.data.performanceTrend.orderData,
          signData: response.data.performanceTrend.signData
        }

        chartData.value.orderStatus = response.data.orderStatusDistribution.map(item => ({
          value: item.value,
          name: item.name,
          amount: item.amount
        }))

        console.log('📊 [业绩分析] 使用后端API数据成功')
        initCharts()
        return
      }
    } catch (apiError) {
      console.warn('📊 [业绩分析] 后端API调用失败，降级使用前端数据:', apiError)
    }

    // 🔥 降级方案：使用前端数据计算
    console.log('📊 [业绩分析] 降级使用前端数据计算')
    loadChartDataFromStore()
    loadOrderStatusFromStore()

    // 初始化图表
    initCharts()
  } catch (error) {
    console.error('📊 [业绩分析] 加载图表数据失败:', error)
    chartData.value.performanceTrend = { xAxis: [], orderData: [], signData: [] }
    chartData.value.orderStatus = []
    initCharts()
  }
}

// 🔥 生成日期范围内的所有日期
const generateDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  const current = new Date(start)

  while (current <= end) {
    const year = current.getFullYear()
    const month = String(current.getMonth() + 1).padStart(2, '0')
    const day = String(current.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
    current.setDate(current.getDate() + 1)
  }

  return dates
}

// 🔥 计算日期范围的天数
const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

// 🔥 降级方案：从前端store加载图表数据
const loadChartDataFromStore = () => {
  console.log('📊 [业绩分析] 使用前端数据计算图表')
  console.log('📊 [业绩分析] 原始订单数量:', orderStore.orders.length)
  console.log('📊 [业绩分析] 当前快速筛选:', selectedQuickFilter.value)
  console.log('📊 [业绩分析] 当前日期范围:', dateRange.value)

  // 🔥 使用新的业绩计算规则
  let orders = orderStore.orders.filter(order => {
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  console.log('📊 [业绩分析] 业绩规则过滤后订单数量:', orders.length)

  // 应用部门筛选（通过销售人员的部门ID）
  if (selectedDepartment.value) {
    const departmentUsers = userStore.users?.filter(u => u.departmentId === selectedDepartment.value).map(u => u.id) || []
    orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
    console.log('📊 [业绩分析] 部门筛选后订单数量:', orders.length)
  }

  // 应用日期筛选（只有当日期范围有效时才筛选）
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    orders = orders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
    console.log('📊 [业绩分析] 日期筛选后订单数量:', orders.length)
  }

  // 🔥 按日期汇总下单业绩和签收业绩
  const dailyOrderData = new Map<string, number>()  // 下单业绩
  const dailySignData = new Map<string, number>()   // 签收业绩

  orders.forEach(order => {
    if (order.createTime) {
      // 提取日期部分
      let dateStr = ''
      const normalizedTime = order.createTime.replace(/\//g, '-')
      if (normalizedTime.includes('T')) {
        dateStr = normalizedTime.split('T')[0]
      } else if (normalizedTime.includes(' ')) {
        dateStr = normalizedTime.split(' ')[0]
      } else {
        dateStr = normalizedTime.substring(0, 10)
      }

      if (dateStr && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // 下单业绩
        dailyOrderData.set(dateStr, (dailyOrderData.get(dateStr) || 0) + (order.totalAmount || 0))

        // 签收业绩（包括delivered和signed状态）
        if (order.status === 'delivered' || order.status === 'signed') {
          dailySignData.set(dateStr, (dailySignData.get(dateStr) || 0) + (order.totalAmount || 0))
        }
      }
    }
  })

  console.log('📊 [业绩分析] 按日汇总下单数据:', Array.from(dailyOrderData.entries()))
  console.log('📊 [业绩分析] 按日汇总签收数据:', Array.from(dailySignData.entries()))

  // 🔥 按小时汇总数据（用于今日/昨日）
  const hourlyOrderData = new Map<string, number>()
  const hourlySignData = new Map<string, number>()

  // 只有今日或昨日才需要按小时汇总
  if (selectedQuickFilter.value === 'today' || selectedQuickFilter.value === 'yesterday') {
    orders.forEach(order => {
      if (order.createTime) {
        const normalizedTime = order.createTime.replace(/\//g, '-')
        let hour = '00'
        if (normalizedTime.includes('T')) {
          hour = normalizedTime.split('T')[1]?.substring(0, 2) || '00'
        } else if (normalizedTime.includes(' ')) {
          hour = normalizedTime.split(' ')[1]?.substring(0, 2) || '00'
        }
        const hourKey = `${hour}:00`

        // 下单业绩
        hourlyOrderData.set(hourKey, (hourlyOrderData.get(hourKey) || 0) + (order.totalAmount || 0))

        // 签收业绩
        if (order.status === 'delivered' || order.status === 'signed') {
          hourlySignData.set(hourKey, (hourlySignData.get(hourKey) || 0) + (order.totalAmount || 0))
        }
      }
    })
  }

  // 🔥 根据日期范围生成完整的时间轴
  const startDateStr = dateRange.value[0]
  const endDateStr = dateRange.value[1]
  const dayCount = getDaysBetween(startDateStr, endDateStr)
  const quickFilter = selectedQuickFilter.value

  console.log('📊 [业绩分析] 日期范围天数:', dayCount, '快速筛选:', quickFilter)

  // 🔥 根据快速筛选类型决定显示粒度
  if (quickFilter === 'today' || quickFilter === 'yesterday') {
    // 今日/昨日：按小时显示（0:00-23:00）
    const allHours: string[] = []
    for (let h = 0; h < 24; h++) {
      allHours.push(`${String(h).padStart(2, '0')}:00`)
    }

    chartData.value.performanceTrend = {
      xAxis: allHours,
      orderData: allHours.map(h => hourlyOrderData.get(h) || 0),
      signData: allHours.map(h => hourlySignData.get(h) || 0)
    }
    console.log('📊 [业绩分析] 按小时图表数据:', chartData.value.performanceTrend)
  } else if (quickFilter === 'all') {
    // 全部：从有数据的最早年份到当前年份，按年度汇总
    const yearlyOrderData = new Map<string, number>()
    const yearlySignData = new Map<string, number>()

    // 从订单数据中获取实际的年份范围
    const years = new Set<string>()
    dailyOrderData.forEach((_, dateStr) => {
      years.add(dateStr.substring(0, 4))
    })

    // 获取当前年份
    const currentYear = new Date().getFullYear()

    // 如果没有数据，使用当前年份
    if (years.size === 0) {
      years.add(currentYear.toString())
    }

    // 找到最早的年份，然后从最早年份的前一年到当前年份
    const minYear = Math.min(...Array.from(years).map(y => parseInt(y)))
    const startYear = Math.max(minYear - 1, 2020) // 最早从2020年开始

    // 生成从startYear到currentYear的所有年份
    const allYears: string[] = []
    for (let y = startYear; y <= currentYear; y++) {
      allYears.push(y.toString())
      yearlyOrderData.set(y.toString(), 0)
      yearlySignData.set(y.toString(), 0)
    }

    // 汇总数据到年份
    dailyOrderData.forEach((amount, dateStr) => {
      const year = dateStr.substring(0, 4)
      if (yearlyOrderData.has(year)) {
        yearlyOrderData.set(year, (yearlyOrderData.get(year) || 0) + amount)
      }
    })

    dailySignData.forEach((amount, dateStr) => {
      const year = dateStr.substring(0, 4)
      if (yearlySignData.has(year)) {
        yearlySignData.set(year, (yearlySignData.get(year) || 0) + amount)
      }
    })

    chartData.value.performanceTrend = {
      xAxis: allYears.map(y => `${y}年`),
      orderData: allYears.map(y => yearlyOrderData.get(y) || 0),
      signData: allYears.map(y => yearlySignData.get(y) || 0)
    }
    console.log('📊 [业绩分析] 按年度图表数据:', chartData.value.performanceTrend)
  } else if (quickFilter === 'thisYear') {
    // 本年：按月汇总
    const monthlyOrderData = new Map<string, number>()
    const monthlySignData = new Map<string, number>()

    // 生成本年所有月份
    const currentYear = new Date().getFullYear()
    const allMonths: string[] = []
    for (let m = 1; m <= 12; m++) {
      const monthKey = `${currentYear}-${String(m).padStart(2, '0')}`
      allMonths.push(monthKey)
      monthlyOrderData.set(monthKey, 0)
      monthlySignData.set(monthKey, 0)
    }

    // 汇总数据到月份
    dailyOrderData.forEach((amount, dateStr) => {
      const monthKey = dateStr.substring(0, 7)
      if (monthlyOrderData.has(monthKey)) {
        monthlyOrderData.set(monthKey, (monthlyOrderData.get(monthKey) || 0) + amount)
      }
    })

    dailySignData.forEach((amount, dateStr) => {
      const monthKey = dateStr.substring(0, 7)
      if (monthlySignData.has(monthKey)) {
        monthlySignData.set(monthKey, (monthlySignData.get(monthKey) || 0) + amount)
      }
    })

    chartData.value.performanceTrend = {
      xAxis: allMonths.map(m => `${parseInt(m.split('-')[1])}月`),
      orderData: allMonths.map(m => monthlyOrderData.get(m) || 0),
      signData: allMonths.map(m => monthlySignData.get(m) || 0)
    }
    console.log('📊 [业绩分析] 本年按月图表数据:', chartData.value.performanceTrend)
  } else if (dayCount <= 31) {
    // 本周/上周/本月/上月：按日显示（每一天）
    const allDates = generateDateRange(startDateStr, endDateStr)

    chartData.value.performanceTrend = {
      xAxis: allDates.map(date => {
        const parts = date.split('-')
        return `${Number(parts[1])}/${Number(parts[2])}`
      }),
      orderData: allDates.map(date => dailyOrderData.get(date) || 0),
      signData: allDates.map(date => dailySignData.get(date) || 0)
    }
    console.log('📊 [业绩分析] 按日图表数据:', chartData.value.performanceTrend)
  } else {
    // 其他情况（如本季度、跨度大于31天）：按月汇总
    const monthlyOrderData = new Map<string, number>()
    const monthlySignData = new Map<string, number>()

    // 生成所有月份
    const startMonth = startDateStr.substring(0, 7)
    const endMonth = endDateStr.substring(0, 7)
    const allMonths: string[] = []

    let currentMonth = startMonth
    while (currentMonth <= endMonth) {
      allMonths.push(currentMonth)
      monthlyOrderData.set(currentMonth, 0)
      monthlySignData.set(currentMonth, 0)
      // 下一个月
      const [year, month] = currentMonth.split('-').map(Number)
      const nextMonth = month === 12 ? 1 : month + 1
      const nextYear = month === 12 ? year + 1 : year
      currentMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`
    }

    // 汇总数据到月份
    dailyOrderData.forEach((amount, dateStr) => {
      const monthKey = dateStr.substring(0, 7)
      if (monthlyOrderData.has(monthKey)) {
        monthlyOrderData.set(monthKey, (monthlyOrderData.get(monthKey) || 0) + amount)
      }
    })

    dailySignData.forEach((amount, dateStr) => {
      const monthKey = dateStr.substring(0, 7)
      if (monthlySignData.has(monthKey)) {
        monthlySignData.set(monthKey, (monthlySignData.get(monthKey) || 0) + amount)
      }
    })

    chartData.value.performanceTrend = {
      xAxis: allMonths.map(m => {
        const parts = m.split('-')
        return `${parts[1]}月`
      }),
      orderData: allMonths.map(m => monthlyOrderData.get(m) || 0),
      signData: allMonths.map(m => monthlySignData.get(m) || 0)
    }
    console.log('📊 [业绩分析] 按月图表数据:', chartData.value.performanceTrend)
  }
}

// 🔥 降级方案：从前端store加载订单状态分布
const loadOrderStatusFromStore = () => {
  let orders = orderStore.orders.filter(order => {
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  if (selectedDepartment.value) {
    const departmentUsers = userStore.users?.filter(u => u.departmentId === selectedDepartment.value).map(u => u.id) || []
    orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
  }

  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    orders = orders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
  }

  const statusMap = new Map()
  const statusNames: Record<string, string> = {
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'logistics_returned': '物流部退回',
    'logistics_cancelled': '物流部取消',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'pending_cancel': '待取消',
    'cancel_failed': '取消失败',
    'cancelled': '已取消',
    'draft': '草稿',
    'refunded': '已退款',
    'pending': '待审核',
    'paid': '已付款',
    'completed': '已完成',
    'signed': '已签收'
  }

  orders.forEach(order => {
    const statusName = statusNames[order.status] || order.status
    if (statusMap.has(statusName)) {
      const existing = statusMap.get(statusName)
      statusMap.set(statusName, {
        count: existing.count + 1,
        amount: existing.amount + (order.totalAmount || 0)
      })
    } else {
      statusMap.set(statusName, {
        count: 1,
        amount: order.totalAmount || 0
      })
    }
  })

  const orderStatusData: Array<{ value: number; name: string; amount: number }> = []
  statusMap.forEach((data, name) => {
    orderStatusData.push({
      value: data.count,
      name: name,
      amount: data.amount
    })
  })

  chartData.value.orderStatus = orderStatusData
}

const initCharts = () => {
  nextTick(() => {
    // 业绩趋势图
    if (performanceChartRef.value) {
      // 🔥 修复：获取已存在的实例或创建新实例
      let performanceChart = echarts.getInstanceByDom(performanceChartRef.value)
      if (!performanceChart) {
        performanceChart = echarts.init(performanceChartRef.value)
      }

      // 🔥 清除之前的配置，确保重新渲染
      performanceChart.clear()

      // 检查是否有数据
      const hasPerformanceData = chartData.value.performanceTrend.orderData.length > 0
      const hasNonZeroData = chartData.value.performanceTrend.orderData.some(v => v > 0) ||
                            chartData.value.performanceTrend.signData.some(v => v > 0)

      console.log('📊 [业绩趋势图] 数据检查:', {
        hasData: hasPerformanceData,
        hasNonZeroData,
        xAxis: chartData.value.performanceTrend.xAxis,
        orderData: chartData.value.performanceTrend.orderData,
        signData: chartData.value.performanceTrend.signData
      })

      if (hasPerformanceData && hasNonZeroData) {
        performanceChart.setOption({
          legend: {
            data: ['下单业绩', '签收业绩'],
            top: 0,
            textStyle: {
              fontSize: 12
            }
          },
          grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
          },
          tooltip: {
            trigger: 'axis',
            formatter: (params: unknown) => {
              const p = params as Array<{ axisValue: string; seriesName: string; value: number; color: string }>
              let result = `${p[0].axisValue}<br/>`
              p.forEach(item => {
                result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}：¥${item.value.toLocaleString()}<br/>`
              })
              return result
            }
          },
          xAxis: {
            type: 'category',
            data: chartData.value.performanceTrend.xAxis,
            axisLabel: {
              fontSize: 11
            },
            boundaryGap: false
          },
          yAxis: {
            type: 'value',
            axisLabel: {
              formatter: (value: number) => value >= 1000 ? `¥${(value / 1000).toFixed(0)}k` : `¥${value}`
            }
          },
          series: [
            {
              name: '下单业绩',
              data: chartData.value.performanceTrend.orderData,
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 6,
              showSymbol: true,
              itemStyle: {
                color: '#409eff'
              },
              lineStyle: {
                width: 2,
                color: '#409eff'
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
                  { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
                ])
              }
            },
            {
              name: '签收业绩',
              data: chartData.value.performanceTrend.signData,
              type: 'line',
              smooth: true,
              symbol: 'circle',
              symbolSize: 6,
              showSymbol: true,
              itemStyle: {
                color: '#67c23a'
              },
              lineStyle: {
                width: 2,
                color: '#67c23a'
              },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(103, 194, 58, 0.3)' },
                  { offset: 1, color: 'rgba(103, 194, 58, 0.05)' }
                ])
              }
            }
          ]
        })
      } else {
        // 没有数据时显示空状态
        performanceChart.setOption({
          title: {
            text: '暂无业绩数据',
            subtext: '请选择有数据的日期范围',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#999',
              fontSize: 14
            },
            subtextStyle: {
              color: '#bbb',
              fontSize: 12
            }
          }
        })
      }
    }

    // 订单状态分布图
    if (orderStatusChartRef.value) {
      // 🔥 修复：获取已存在的实例或创建新实例
      let orderStatusChart = echarts.getInstanceByDom(orderStatusChartRef.value)
      if (!orderStatusChart) {
        orderStatusChart = echarts.init(orderStatusChartRef.value)
      }

      // 🔥 清除之前的配置，确保重新渲染
      orderStatusChart.clear()

      // 检查是否有数据
      const hasOrderStatusData = chartData.value.orderStatus.length > 0

      console.log('📊 [订单状态分布图] 数据检查:', {
        hasData: hasOrderStatusData,
        data: chartData.value.orderStatus
      })

      if (hasOrderStatusData) {
        orderStatusChart.setOption({
          tooltip: {
            trigger: 'item',
            // 🔥 优化：简洁的悬停提示
            formatter: (params: { name: string; value: number; percent: number; data: { amount: number } }) => {
              const amount = params.data?.amount || 0
              return `${params.name}<br/>订单: ${params.value}单 (${params.percent.toFixed(1)}%)<br/>金额: ¥${amount.toLocaleString()}`
            }
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            top: 'center',
            formatter: (name: string) => {
              const item = chartData.value.orderStatus.find(d => d.name === name)
              return item ? `${name}(${item.value}单/¥${(item as any).amount?.toLocaleString() || 0})` : name
            }
          },
          series: [{
            name: '订单分布',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['60%', '50%'],
            data: chartData.value.orderStatus,
            label: {
              show: true,
              formatter: '{b}({c}单)'
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        })
      } else {
        // 没有数据时显示空状态
        orderStatusChart.setOption({
          title: {
            text: '暂无订单数据',
            left: 'center',
            top: 'middle',
            textStyle: {
              color: '#999',
              fontSize: 14
            }
          }
        })
      }
    }
  })
}

// 使用默认数据初始化图表（当API调用失败时）


// 权限检查
const checkPermission = () => {
  // 部门经理级别以上 或 拥有业绩分析权限码 可以查看业绩分析
  if (!userStore.isManager && !userStore.isAdmin) {
    const userPerms = userStore.permissions || []
    const hasAnalysisPerm = userPerms.includes('performance:analysis') ||
                            userPerms.includes('performance.analysis') ||
                            userPerms.includes('performance')
    if (!hasAnalysisPerm) {
      ElMessage.error('您没有权限查看业绩分析数据')
      router.push('/performance')
      return false
    }
  }
  return true
}

const loadData = async () => {
  // 权限检查
  if (!checkPermission()) {
    return
  }

  try {
    // 🔥 修复：使用后端API加载数据，确保数据完整
    await loadDataFromAPI()

    // 同时加载统计指标和图表数据
    loadMetrics()
    await loadChartData()  // 🔥 修复：异步调用
  } catch (error) {
    console.error('加载业绩分析数据失败:', error)
    ElMessage.error('加载数据失败，请稍后重试')
  }
}

// 🔥 新增：从后端API加载数据
const loadDataFromAPI = async () => {
  try {
    const { getTeamStats } = await import('@/api/performance')

    console.log('📊 [业绩分析] 从后端API加载表格数据...')
    const response = await getTeamStats({
      departmentId: selectedDepartment.value || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
      sortBy: sortBy.value,
      limit: 1000 // 获取所有成员数据
    })

    if (response.success && response.data) {
      const { members, summary } = response.data

      // 根据部门筛选器和用户角色显示不同数据
      if (userStore.isAdmin && !selectedDepartment.value) {
        // 超级管理员查看全公司数据：显示汇总行
        tableData.value = [{
          id: '公司总体',
          name: '公司总体',
          department: '全公司',
          orderCount: summary.totalOrders,
          orderAmount: summary.totalPerformance,
          shipCount: members.reduce((sum: number, m: any) => sum + (m.shipCount || 0), 0),
          shipAmount: members.reduce((sum: number, m: any) => sum + (m.shipAmount || 0), 0),
          shipRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.shipCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          signCount: summary.signOrders,
          signAmount: summary.signPerformance,
          signRate: summary.signRate,
          transitCount: members.reduce((sum: number, m: any) => sum + (m.transitCount || 0), 0),
          transitAmount: members.reduce((sum: number, m: any) => sum + (m.transitAmount || 0), 0),
          transitRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.transitCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          rejectCount: members.reduce((sum: number, m: any) => sum + (m.rejectCount || 0), 0),
          rejectAmount: members.reduce((sum: number, m: any) => sum + (m.rejectAmount || 0), 0),
          rejectRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.rejectCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          returnCount: members.reduce((sum: number, m: any) => sum + (m.returnCount || 0), 0),
          returnAmount: members.reduce((sum: number, m: any) => sum + (m.returnAmount || 0), 0),
          returnRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.returnCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          status: 'active'
        }]
      } else {
        // 部门数据：显示部门汇总行
        const deptId = selectedDepartment.value || userStore.currentUser?.departmentId
        const dept = departmentStore.departments?.find((d: any) => String(d.id) === String(deptId))
        const deptName = dept?.name || '未知部门'

        tableData.value = [{
          id: '部门数据',
          name: deptName,
          department: deptName,
          orderCount: summary.totalOrders,
          orderAmount: summary.totalPerformance,
          shipCount: members.reduce((sum: number, m: any) => sum + (m.shipCount || 0), 0),
          shipAmount: members.reduce((sum: number, m: any) => sum + (m.shipAmount || 0), 0),
          shipRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.shipCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          signCount: summary.signOrders,
          signAmount: summary.signPerformance,
          signRate: summary.signRate,
          transitCount: members.reduce((sum: number, m: any) => sum + (m.transitCount || 0), 0),
          transitAmount: members.reduce((sum: number, m: any) => sum + (m.transitAmount || 0), 0),
          transitRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.transitCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          rejectCount: members.reduce((sum: number, m: any) => sum + (m.rejectCount || 0), 0),
          rejectAmount: members.reduce((sum: number, m: any) => sum + (m.rejectAmount || 0), 0),
          rejectRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.rejectCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          returnCount: members.reduce((sum: number, m: any) => sum + (m.returnCount || 0), 0),
          returnAmount: members.reduce((sum: number, m: any) => sum + (m.returnAmount || 0), 0),
          returnRate: summary.totalOrders > 0 ? parseFloat((members.reduce((sum: number, m: any) => sum + (m.returnCount || 0), 0) / summary.totalOrders * 100).toFixed(1)) : 0,
          status: 'active'
        }]
      }

      console.log('📊 [业绩分析] ✅ 后端API表格数据加载成功')
      return
    }

    console.log('📊 [业绩分析] 后端API返回失败，降级到前端计算')
    // 降级方案：使用前端数据
    loadDataFromStore()
  } catch (error) {
    console.error('📊 [业绩分析] 后端API加载失败，降级到前端计算:', error)
    loadDataFromStore()
  }
}

// 🔥 降级方案：从前端store加载数据
const loadDataFromStore = () => {
  if (userStore.isAdmin) {
    if (selectedDepartment.value) {
      loadDepartmentData()
    } else {
      loadCompanyData()
    }
  } else if (userStore.isManager) {
    loadDepartmentData()
  }
}

const loadDepartmentData = () => {
  try {
    const departmentId = selectedDepartment.value || userStore.currentUser?.departmentId

    // 非超级管理员只能查看自己部门的数据
    if (!userStore.isAdmin && departmentId !== userStore.currentUser?.departmentId) {
      ElMessage.error('您只能查看自己部门的数据')
      selectedDepartment.value = userStore.currentUser?.departmentId || ''
      return
    }

    // 🔥 使用新的业绩计算规则
    let orders = orderStore.orders.filter(order => {
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer') return order.markType === 'normal'
      return !excludedStatuses.includes(order.status)
    })

    // 应用部门筛选（通过销售人员的部门ID）
    if (departmentId) {
      const departmentUsers = userStore.users?.filter(u => u.departmentId === departmentId).map(u => u.id) || []
      orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
    }

    // 应用日期筛选（只有当日期范围有效时才筛选）- 🔥 使用北京时间字符串比较
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      orders = orders.filter(order =>
        isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
      )
    }

    // 计算各项指标（与loadCompanyData相同的逻辑）
    const orderCount = orders.length
    const orderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    const shippedOrders = orders.filter(order => order.status === 'shipped' || order.status === 'delivered')
    const shipCount = shippedOrders.length
    const shipAmount = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const shipRate = orderCount > 0 ? parseFloat((shipCount / orderCount * 100).toFixed(1)) : 0

    const signedOrders = orders.filter(order => order.status === 'delivered')
    const signCount = signedOrders.length
    const signAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const signRate = orderCount > 0 ? parseFloat((signCount / orderCount * 100).toFixed(1)) : 0

    const transitOrders = orders.filter(order => order.status === 'shipped')
    const transitCount = transitOrders.length
    const transitAmount = transitOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const transitRate = orderCount > 0 ? parseFloat((transitCount / orderCount * 100).toFixed(1)) : 0

    const rejectedOrders = orders.filter(order => order.status === 'rejected' || order.status === 'rejected_returned')
    const rejectCount = rejectedOrders.length
    const rejectAmount = rejectedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const rejectRate = orderCount > 0 ? parseFloat((rejectCount / orderCount * 100).toFixed(1)) : 0

    const returnedOrders = orders.filter(order => order.status === 'after_sales_created')
    const returnCount = returnedOrders.length
    const returnAmount = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const returnRate = orderCount > 0 ? parseFloat((returnCount / orderCount * 100).toFixed(1)) : 0

    // 获取部门名称
    const dept = departmentStore.departments?.find(d => String(d.id) === String(departmentId))
    const deptName = dept?.name || '未知部门'

    tableData.value = [{
      id: '部门数据',
      name: deptName,
      department: deptName,
      orderCount,
      orderAmount,
      shipCount,
      shipAmount,
      shipRate,
      signCount,
      signAmount,
      signRate,
      transitCount,
      transitAmount,
      transitRate,
      rejectCount,
      rejectAmount,
      rejectRate,
      returnCount,
      returnAmount,
      returnRate,
      status: 'active'
    }]
  } catch (error) {
    console.error('加载部门业绩数据失败:', error)
  }
}

const loadCompanyData = () => {
  try {
    // 只有超级管理员可以查看全公司数据
    if (!userStore.isAdmin) {
      ElMessage.error('您没有权限查看全公司数据')
      loadDepartmentData()
      return
    }

    // 🔥 使用新的业绩计算规则
    let orders = orderStore.orders.filter(order => {
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer') return order.markType === 'normal'
      return !excludedStatuses.includes(order.status)
    })

    // 应用日期筛选（只有当日期范围有效时才筛选）- 🔥 使用北京时间字符串比较
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      orders = orders.filter(order =>
        isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
      )
    }

    // 计算各项指标
    const orderCount = orders.length
    const orderAmount = orders.reduce((sum, order) => sum + order.totalAmount, 0)

    const shippedOrders = orders.filter(order => order.status === 'shipped' || order.status === 'delivered')
    const shipCount = shippedOrders.length
    const shipAmount = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const shipRate = orderCount > 0 ? parseFloat((shipCount / orderCount * 100).toFixed(1)) : 0

    const signedOrders = orders.filter(order => order.status === 'delivered')
    const signCount = signedOrders.length
    const signAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const signRate = orderCount > 0 ? parseFloat((signCount / orderCount * 100).toFixed(1)) : 0

    const transitOrders = orders.filter(order => order.status === 'shipped')
    const transitCount = transitOrders.length
    const transitAmount = transitOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const transitRate = orderCount > 0 ? parseFloat((transitCount / orderCount * 100).toFixed(1)) : 0

    const rejectedOrders = orders.filter(order => order.status === 'rejected' || order.status === 'rejected_returned')
    const rejectCount = rejectedOrders.length
    const rejectAmount = rejectedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const rejectRate = orderCount > 0 ? parseFloat((rejectCount / orderCount * 100).toFixed(1)) : 0

    const returnedOrders = orders.filter(order => order.status === 'after_sales_created')
    const returnCount = returnedOrders.length
    const returnAmount = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const returnRate = orderCount > 0 ? parseFloat((returnCount / orderCount * 100).toFixed(1)) : 0

    tableData.value = [{
      id: '公司总体',
      name: '公司总体',
      department: '全公司',
      orderCount,
      orderAmount,
      shipCount,
      shipAmount,
      shipRate,
      signCount,
      signAmount,
      signRate,
      transitCount,
      transitAmount,
      transitRate,
      rejectCount,
      rejectAmount,
      rejectRate,
      returnCount,
      returnAmount,
      returnRate,
      status: 'active'
    }]
  } catch (error) {
    console.error('加载公司业绩数据失败:', error)
  }
}

const loadMetrics = async () => {
  try {
    // 🔥 修复：调用后端API获取统计数据
    const { getAnalysisMetrics } = await import('@/api/performance')

    console.log('📊 [业绩分析] 从后端API加载统计指标...')
    const response = await getAnalysisMetrics({
      type: selectedDepartment.value ? 'department' : undefined,
      departmentId: selectedDepartment.value || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined
    })

    if (response.success && response.data) {
      metrics.value.totalOrders = response.data.totalOrders || 0
      metrics.value.totalPerformance = response.data.totalPerformance || 0
      metrics.value.avgPerformance = response.data.avgPerformance || 0
      metrics.value.signOrders = response.data.signOrders || 0
      metrics.value.signPerformance = response.data.signPerformance || 0
      metrics.value.signRate = response.data.signRate || 0
      console.log('📊 [业绩分析] ✅ 后端API统计指标加载成功:', response.data)
      return
    }

    console.log('📊 [业绩分析] 后端API返回失败，降级到前端计算')
    // 降级方案：前端计算
    loadMetricsFromStore()
  } catch (error) {
    console.error('📊 [业绩分析] 后端API加载失败，降级到前端计算:', error)
    loadMetricsFromStore()
  }
}

// 🔥 降级方案：从store计算统计指标
const loadMetricsFromStore = () => {
  try {
    // 🔥 使用新的业绩计算规则
    let orders = orderStore.orders.filter(order => {
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer') return order.markType === 'normal'
      return !excludedStatuses.includes(order.status)
    })

    // 应用部门筛选（通过销售人员的部门ID）
    if (selectedDepartment.value) {
      const departmentUsers = userStore.users?.filter(u => u.departmentId === selectedDepartment.value).map(u => u.id) || []
      orders = orders.filter(order => departmentUsers.includes(order.salesPersonId))
    }

    // 应用日期筛选（只有当日期范围有效时才筛选）- 🔥 使用北京时间字符串比较
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      orders = orders.filter(order =>
        isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
      )
    }

    // 计算指标
    metrics.value.totalOrders = orders.length
    metrics.value.totalPerformance = orders.reduce((sum, order) => sum + order.totalAmount, 0)
    metrics.value.avgPerformance = orders.length > 0 ? Math.round(metrics.value.totalPerformance / orders.length) : 0

    const signedOrders = orders.filter(order => order.status === 'delivered')
    metrics.value.signOrders = signedOrders.length
    metrics.value.signPerformance = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    metrics.value.signRate = orders.length > 0 ? parseFloat((signedOrders.length / orders.length * 100).toFixed(1)) : 0
  } catch (error) {
    console.error('加载统计指标失败:', error)
    // 使用默认值
    metrics.value.totalPerformance = 0
    metrics.value.totalOrders = 0
    metrics.value.avgPerformance = 0
    metrics.value.signOrders = 0
    metrics.value.signRate = 0
    metrics.value.signPerformance = 0
  }
}

onMounted(async () => {
  // 权限检查
  if (!checkPermission()) {
    return
  }

  // 🔥 修复：用当前登录用户的真实信息初始化成员信息卡片
  const currentUser = userStore.currentUser as any
  if (currentUser) {
    memberInfo.value = {
      id: currentUser.id || '',
      name: currentUser.realName || currentUser.name || currentUser.username || '',
      department: currentUser.departmentName || currentUser.department || '未分配',
      joinDate: currentUser.createTime ? String(currentUser.createTime).split(' ')[0] : '',
      avatar: currentUser.avatar || ''
    }
  }

  // 初始化部门数据
  departmentStore.initData()

  // 🔥 优化加载策略：先用缓存数据快速显示，再后台刷新
  if (orderStore.orders.length > 0) {
    // 如果已有缓存数据，先快速显示
    console.log('📊 [业绩分析] 使用缓存数据快速显示，共', orderStore.orders.length, '条')
    loadData()

    // 后台静默刷新数据（不阻塞UI）
    orderStore.loadOrdersFromAPI(false).then(() => {
      console.log('📊 [业绩分析] 后台数据刷新完成')
      loadData() // 刷新完成后更新显示
    }).catch(error => {
      console.error('📊 [业绩分析] 后台刷新失败:', error)
    })
  } else {
    // 没有缓存数据，需要等待加载
    try {
      console.log('📊 [业绩分析] 首次加载订单数据...')
      await orderStore.loadOrdersFromAPI(true)
      console.log('📊 [业绩分析] 订单数据加载完成，共', orderStore.orders.length, '条')
    } catch (error) {
      console.error('📊 [业绩分析] 加载订单数据失败:', error)
    }
    loadData()
  }

  // 监听物流状态更新事件
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.addEventListener('todoStatusUpdated', handleTodoStatusUpdate)
})

// 处理订单状态更新事件
const handleOrderStatusUpdate = (event: Event) => {
  const customEvent = event as CustomEvent
  console.log('订单状态已更新，刷新业绩数据', customEvent.detail)
  loadData()
  ElMessage.success('业绩数据已同步更新')
}

// 处理待办状态更新事件
const handleTodoStatusUpdate = (event: Event) => {
  const customEvent = event as CustomEvent
  console.log('待办状态已更新，刷新业绩数据', customEvent.detail)
  loadData()
  ElMessage.success('业绩数据已同步更新')
}

onUnmounted(() => {
  // 清理物流状态更新事件监听器
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.removeEventListener('todoStatusUpdated', handleTodoStatusUpdate)
})
</script>

<style scoped>
.analysis-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: #409eff;
  border: none;
  color: white;
}

.back-btn:hover {
  background: #337ecc;
}

.page-title {
  color: #2c3e50;
  font-size: 28px;
  font-weight: 600;
  margin: 0;
}

.member-info-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.member-details h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #2c3e50;
}

.member-details p {
  margin: 0;
  color: #7f8c8d;
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
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.date-picker {
  width: 280px;
}

.department-select {
  width: 140px;
}

.sort-select {
  width: 140px;
}

.query-btn {
  background: #409eff;
  border: none;
  padding: 10px 20px;
}

.export-btn {
  background: #67c23a;
  border: none;
  color: white;
  padding: 10px 20px;
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

.charts-section {
  margin-bottom: 24px;
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 20px;
}

.chart-row:last-child {
  margin-bottom: 0;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.chart-header {
  margin-bottom: 16px;
}

.chart-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
}

.chart-content {
  height: 300px;
}

.table-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.table-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
  font-weight: 600;
}

.data-table {
  width: 100%;
  margin-bottom: 16px;
}

.amount {
  color: #67c23a;
  font-weight: 500;
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

.quick-filter-section {
  background: white;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.quick-filter-label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
  white-space: nowrap;
}

.quick-filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-filter-btn {
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  transition: all 0.3s ease;
}

.quick-filter-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .metrics-row {
    grid-template-columns: 1fr;
  }

  .chart-row {
    grid-template-columns: 1fr;
  }

  .filter-section {
    flex-direction: column;
    gap: 16px;
  }

  .filter-left {
    flex-wrap: wrap;
  }
}

/* 快递单号链接样式 */
.tracking-number-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.tracking-number-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}
</style>


/* 导出设置按钮样式 */
.export-settings-btn {
  margin-left: 0;
  padding: 10px 12px;
}

.export-settings-btn .el-icon {
  font-size: 16px;
}

/* 导出设置对话框样式 */
.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

.export-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.stat-value {
  color: #409eff;
  font-size: 16px;
  font-weight: 600;
  margin-left: 8px;
}

.fullscreen-btn {
  padding: 8px 16px;
}

/* 全屏表格样式 */
.fullscreen-table {
  width: 100%;
}

.fullscreen-table .amount {
  color: #409eff;
  font-weight: 600;
}

/* 订单类型详情弹窗样式 */
.order-type-dialog .member-info {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 32px;
  padding: 16px 24px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.order-type-dialog .info-item {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  white-space: nowrap;
}

.order-type-dialog .info-item .label {
  color: #909399;
  margin-right: 8px;
}

.order-type-dialog .info-item .value {
  color: #303133;
  font-weight: 500;
}

.order-type-dialog .order-table {
  margin-bottom: 16px;
}

.order-type-dialog .order-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
}

/* 🔥 修复：确保分页控件在对话框中居中 */
:deep(.order-type-dialog) .order-pagination {
  display: flex;
  justify-content: center;
  padding: 16px 0;
  margin-top: 8px;
  border-top: 1px solid #ebeef5;
}

:deep(.order-type-dialog) .el-pagination {
  justify-content: center;
}

.order-type-dialog .amount {
  color: #409eff;
  font-weight: 600;
}

.order-type-dialog .deposit {
  color: #67c23a;
}

.order-type-dialog .collection {
  color: #e6a23c;
}
