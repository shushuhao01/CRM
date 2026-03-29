<template>
  <div class="performance-share" :class="{ 'page-loaded': !loading }">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>业绩分享</h2>
      <div class="header-actions">
        <el-button
          @click="handleOpenShareDialog"
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
                <div class="card-value">¥{{ (shareStats.totalAmount || 0).toLocaleString() }}</div>
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

    <!-- 分享记录筛选栏 -->
    <div class="table-toolbar">
      <div class="toolbar-left">
        <span class="toolbar-title">分享记录</span>
      </div>
      <div class="toolbar-right">
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
          style="width: 240px"
        />
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
        >
          搜索
        </el-button>
        <el-button
          v-if="isSearching"
          @click="handleClearSearch"
        >
          清除
        </el-button>
        <el-button
          @click="showFullscreenView"
          :icon="FullScreen"
          title="全屏查看"
        >
          全屏
        </el-button>
      </div>
    </div>

    <!-- 分享记录表格 -->
    <el-table
      :data="filteredShareRecords"
      v-loading="loading"
      class="share-table"
      :row-class-name="getTableRowClassName"
      @row-click="handleRowClick"
      stripe
      border
      :show-overflow-tooltip="true"
      style="width: 100%"
    >
      <el-table-column label="分享编号" min-width="90" align="center">
        <template #default="{ row }">
          <span class="short-code" :title="row.shareNumber">{{ getShortShareCode(row.shareNumber) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="orderNumber" label="订单编号" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <el-link type="primary" @click="viewOrderDetail(row.orderId)">
            {{ row.orderNumber }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column prop="orderAmount" label="订单金额" min-width="90" align="right">
        <template #default="{ row }">
          <span class="amount-text-compact">¥{{ (row.orderAmount || 0).toLocaleString() }}</span>
        </template>
      </el-table-column>
      <el-table-column label="分享成员" min-width="200">
        <template #default="{ row }">
          <div class="share-members-inline">
            <!-- 🔥 原始下单人（创建人保留部分）- 显示金额 -->
            <el-tag size="small" type="primary" class="member-tag-compact" :title="`${getOperatorName(row.createdById, row.createdBy)} ${getOwnerRetainedPercentage(row)}% ¥${getMemberAmount(row, getOwnerRetainedPercentage(row)).toLocaleString()}`">
              {{ getOperatorName(row.createdById, row.createdBy) }}
              {{ getOwnerRetainedPercentage(row) }}%
              ¥{{ getMemberAmount(row, getOwnerRetainedPercentage(row)).toLocaleString() }}📌
            </el-tag>
            <!-- 🔥 分享成员 - 显示金额 -->
            <el-tag
              v-for="member in (row.shareMembers || [])"
              :key="member.userId"
              size="small"
              :type="member.userId === userStore.currentUser?.id ? 'success' : 'info'"
              class="member-tag-compact"
              :title="`${getOperatorName(member.userId, member.userName)} ${member.percentage}% ¥${getMemberAmount(row, member.percentage).toLocaleString()}`"
            >
              {{ getOperatorName(member.userId, member.userName) }} {{ member.percentage }}% ¥{{ getMemberAmount(row, member.percentage).toLocaleString() }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" min-width="120" align="center">
        <template #default="{ row }">
          <span class="time-text-compact">{{ formatBeijingTime(row.createTime, false) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" min-width="70" align="center">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)" size="small">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作人" min-width="70" align="center">
        <template #default="{ row }">
          <span class="operator-name-compact">{{ getOperatorName(row.createdById, row.createdBy) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" min-width="160" align="center">
        <template #default="{ row }">
          <div class="action-buttons">
            <el-button
              type="primary"
              size="small"
              text
              @click.stop="viewShareDetail(row)"
            >
              详情
            </el-button>
            <el-button
              v-if="row.status === 'active' && canEditShare(row)"
              type="warning"
              size="small"
              text
              @click.stop="editShare(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'active' && canCancelShare(row)"
              type="danger"
              size="small"
              text
              @click.stop="cancelShare(row)"
              :loading="cancelLoading === row.id"
            >
              取消
            </el-button>
          </div>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 20px; text-align: center;">
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
                :label="`${order.orderNumber} - ¥${(order.totalAmount || 0).toLocaleString()} - ${order.customerName}`"
                :value="order.id"
              >
                <div class="order-option">
                  <div class="order-main">
                    <el-tag type="primary" size="small">{{ order.orderNumber }}</el-tag>
                    <span class="customer-name">{{ order.customerName }}</span>
                    <span class="order-amount">¥{{ (order.totalAmount || 0).toLocaleString() }}</span>
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
              <span class="amount-text">¥{{ (selectedOrder.totalAmount || 0).toLocaleString() }}</span>
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
        <el-form-item label="分享成员" prop="shareMembers" style="margin-top: 20px;">
          <div class="share-members-config">
            <div
              v-for="(member, index) in shareForm.shareMembers"
              :key="index"
              class="member-item"
            >
              <el-select
                v-model="member.userId"
                placeholder="选择成员"
                filterable
                clearable
                style="width: 280px"
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
                :min="0.01"
                :max="1"
                :step="0.05"
                :precision="2"
                style="width: 140px; margin-left: 10px"
                @change="validatePercentages"
              />
              <span style="margin-left: 5px; color: #909399; font-size: 12px;">
                占比{{ Math.round((member.percentage || 0) * 100) }}%
              </span>
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
              <div class="share-allocation-row">
                <span class="share-ratio-text">分享比例: {{ totalPercentageDisplay }}%</span>
                <span v-if="selectedOrder" class="owner-retained-text">
                  | 原始下单人保留: {{ 100 - totalPercentageDisplay }}%
                  (¥{{ (((selectedOrder.totalAmount || 0) * (100 - totalPercentageDisplay)) / 100).toLocaleString() }})
                </span>
              </div>
              <span v-if="totalPercentage > 1" class="error-text">
                (分享比例不能超过1，即100%)
              </span>
              <span v-else-if="totalPercentage === 0" class="error-text">
                (请设置分享比例)
              </span>
              <span v-else-if="totalPercentage >= 1" class="warning-text">
                ⚠️ 原始下单人将不保留任何业绩和单数
              </span>
              <span v-else class="success-text">
                ✅ 守恒：下单人保留 {{ 100 - totalPercentageDisplay }}%，分享 {{ totalPercentageDisplay }}%
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
          :disabled="totalPercentage > 1 || totalPercentage === 0"
        >
          {{ isEditMode ? '更新' : '确认分享' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 分享详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="分享详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedShareDetail" class="share-detail-horizontal">
        <!-- 左侧：基本信息 -->
        <div class="detail-left">
          <h4 class="detail-section-title">基本信息</h4>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <span class="detail-label">分享编号</span>
              <span class="detail-value">{{ selectedShareDetail.shareNumber }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">订单编号</span>
              <span class="detail-value">{{ selectedShareDetail.orderNumber }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">订单金额</span>
              <span class="detail-value amount-highlight">¥{{ (selectedShareDetail.orderAmount || 0).toLocaleString() }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">创建时间</span>
              <span class="detail-value">{{ formatBeijingTime(selectedShareDetail.createTime, false) }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">创建人</span>
              <span class="detail-value">{{ getOperatorName(selectedShareDetail.createdById, selectedShareDetail.createdBy) }}</span>
            </div>
            <div class="detail-info-item">
              <span class="detail-label">状态</span>
              <span class="detail-value">
                <el-tag :type="getStatusType(selectedShareDetail.status)">
                  {{ getStatusText(selectedShareDetail.status) }}
                </el-tag>
              </span>
            </div>
          </div>

          <div v-if="selectedShareDetail.description" class="detail-description">
            <h4 class="detail-section-title">分享说明</h4>
            <p>{{ selectedShareDetail.description }}</p>
          </div>
        </div>

        <!-- 右侧：分享成员 -->
        <div class="detail-right">
          <h4 class="detail-section-title">参与成员 ({{ (selectedShareDetail.shareMembers?.length || 0) + 1 }}人)</h4>
          <div class="members-list">
            <!-- 🔥 原始下单人 -->
            <div class="member-item-horizontal" style="background: #f0f9ff; border-radius: 6px; padding: 8px;">
              <div class="member-left-info">
                <div class="member-avatar-small" style="background: #3b82f6;">
                  <el-icon><UserFilled /></el-icon>
                </div>
                <div>
                  <div class="member-name-small">{{ getOperatorName(selectedShareDetail.createdById, selectedShareDetail.createdBy) || '下单人' }}</div>
                  <el-tag type="primary" size="small">
                    原始下单人
                  </el-tag>
                </div>
              </div>
              <div class="member-right-info">
                <div class="member-percentage">{{ getOwnerRetainedPercentage(selectedShareDetail) }}%</div>
                <div class="member-amount">
                  ¥{{ getOwnerRetainedAmount(selectedShareDetail).toLocaleString() }}
                </div>
              </div>
            </div>
            <!-- 🔥 分享成员 -->
            <div
              v-for="(member, index) in selectedShareDetail.shareMembers"
              :key="index"
              class="member-item-horizontal"
            >
              <div class="member-left-info">
                <div class="member-avatar-small">
                  <el-icon><UserFilled /></el-icon>
                </div>
                <div>
                  <div class="member-name-small">{{ getOperatorName(member.userId, member.userName) }}</div>
                  <el-tag type="success" size="small">
                    已分享
                  </el-tag>
                </div>
              </div>
              <div class="member-right-info">
                <div class="member-percentage">{{ member.percentage }}%</div>
                <div class="member-amount">
                  ¥{{ (((selectedShareDetail.orderAmount || 0) * (member.percentage || 0)) / 100).toLocaleString() }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 全屏查看对话框 -->
    <el-dialog
      v-model="fullscreenVisible"
      title="分享记录 - 全屏查看"
      fullscreen
      :close-on-click-modal="false"
    >
      <el-table
        :data="filteredShareRecords"
        v-loading="loading"
        class="fullscreen-table"
        height="calc(100vh - 200px)"
        :row-class-name="getTableRowClassName"
      >
        <el-table-column label="分享编号" width="100" fixed align="center">
          <template #default="{ row }">
            <span class="short-code" :title="row.shareNumber">{{ getShortShareCode(row.shareNumber) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="orderNumber" label="订单编号" width="150" fixed>
          <template #default="{ row }">
            <el-link type="primary" @click="viewOrderDetail(row.orderId)">
              {{ row.orderNumber }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="操作人" width="90" align="center">
          <template #default="{ row }">
            <span class="operator-name-compact">{{ getOperatorName(row.createdById, row.createdBy) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分享成员" min-width="280">
          <template #default="{ row }">
            <div class="share-members-inline">
              <el-tag size="small" type="primary" class="member-tag-compact">
                {{ getOperatorName(row.createdById, row.createdBy) }} {{ getOwnerRetainedPercentage(row) }}% ¥{{ getMemberAmount(row, getOwnerRetainedPercentage(row)).toLocaleString() }}📌
              </el-tag>
              <el-tag
                v-for="member in (row.shareMembers || [])"
                :key="member.userId"
                size="small"
                :type="member.userId === userStore.currentUser?.id ? 'success' : 'info'"
                class="member-tag-compact"
              >
                {{ getOperatorName(member.userId, member.userName) }} {{ member.percentage }}% ¥{{ getMemberAmount(row, member.percentage).toLocaleString() }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="shareAmount" label="订单金额" width="110" align="right">
          <template #default="{ row }">
            <span class="amount-text-compact">¥{{ (row.orderAmount || 0).toLocaleString() }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="145" align="center">
          <template #default="{ row }">
            <span class="time-text-compact">{{ formatBeijingTime(row.createTime, false) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分享说明" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.description || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewShareDetail(row)">
                详情
              </el-button>
              <el-button
                v-if="row.status === 'active' && canCancelShare(row)"
                type="danger"
                size="small"
                text
                @click="cancelShare(row)"
                :loading="cancelLoading === row.id"
              >
                取消
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="fullscreenVisible = false">关闭</el-button>
        <el-button type="primary" @click="exportShareRecords" :icon="Download">
          导出数据
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick, h } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Download,
  FullScreen,
  Share,
  Money,
  UserFilled,
  Document,
  Delete,
  Search,
  InfoFilled,
  QuestionFilled,
  WarningFilled,
  SuccessFilled
} from '@element-plus/icons-vue'
import { usePerformanceStore } from '@/stores/performance'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import * as performanceApi from '@/api/performance'
import { formatDateTime as formatBeijingTime } from '@/utils/date'
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
  orderId?: string
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
  createdBy?: string
  createdById?: string
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
const fullscreenVisible = ref(false)
const isEditMode = ref(false)
const submitLoading = ref(false)
const orderSearchLoading = ref(false)
const cancelLoading = ref<string | null>(null)

// 分页数据
const currentPage = ref(1)
const pageSize = ref(10)  // 默认10条/页
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
    { userId: '', percentage: 0.5 }
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

  // 权限控制：根据用户角色过滤数据
  const currentUser = userStore.currentUser
  if (currentUser) {
    const currentUserId = String(currentUser.id || '')
    const currentUserName = currentUser.name || currentUser.realName || ''
    // 超级管理员和管理员可以查看所有分享记录
    if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
      // 不做过滤，显示所有记录
    } else {
      // 🔥 其他角色只能查看自己创建的或参与的分享记录
      records = records.filter(record =>
        String(record.createdById || '') === currentUserId ||
        record.createdBy === currentUserName ||
        (record.shareMembers || []).some((m: any) => String(m.userId || '') === currentUserId)
      )
    }
  }

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

/**
 * 🔥 获取原始下单人保留的百分比
 */
const getOwnerRetainedPercentage = (share: any) => {
  const totalShared = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)
  return Math.max(0, 100 - totalShared)
}

/**
 * 🔥 获取原始下单人保留的金额
 */
const getOwnerRetainedAmount = (share: any) => {
  const retainedPct = getOwnerRetainedPercentage(share)
  return ((share.orderAmount || 0) * retainedPct) / 100
}

/**
 * 🔥 根据百分比计算成员分享金额
 */
const getMemberAmount = (share: any, percentage: number) => {
  return Math.round(((share.orderAmount || 0) * (percentage || 0)) / 100)
}

/**
 * 🔥 获取短分享编码（如 SH20260327001 → SH…7001）
 * 保留前缀 + 最后4位，确保在表格中紧凑显示
 */
const getShortShareCode = (shareNumber: string) => {
  if (!shareNumber) return '-'
  // 较长的分享编号，截取前缀+后4位
  if (shareNumber.length > 8) {
    return shareNumber.slice(0, 2) + '…' + shareNumber.slice(-4)
  }
  return shareNumber
}

/**
 * 🔥 操作人/创建人映射为姓名（优先使用userStore中的真实姓名）
 */
const getOperatorName = (userId?: string, fallbackName?: string) => {
  if (userId) {
    const user = userStore.users?.find((u: any) => String(u.id) === String(userId))
    if (user) {
      return user.realName || user.name || user.username || fallbackName || '未知'
    }
  }
  return fallbackName || '未知'
}

// 🔥 totalPercentage 现在是0-1范围的比例值（如0.5表示50%）
const totalPercentage = computed(() => {
  return shareForm.value.shareMembers.reduce((sum, member) => sum + (member.percentage || 0), 0)
})

// 🔥 显示用的百分比值（0-100范围）
const totalPercentageDisplay = computed(() => {
  return Math.round(totalPercentage.value * 100)
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
  } catch (error) {
    // 🔥 完全静默处理：不显示任何错误提示，只在控制台记录
    console.warn('[业绩分享] 加载数据失败，可能是表不存在或无数据:', error)
    // 设置空数据
    totalRecords.value = 0
  } finally {
    loading.value = false
  }
}

const loadAvailableUsers = async () => {
  try {
    console.log('[业绩分享] 开始加载用户列表')

    // 从userStore获取真实用户数据
    await userStore.loadUsers()

    // 过滤出可以参与业绩分享的用户（销售人员、经理等）
    const eligibleRoles = ['sales_staff', 'sales_manager', 'department_manager', 'admin', 'super_admin']
    availableUsers.value = userStore.users
      .filter(user => {
        const userRole = user.role || ''
        const isEligible = eligibleRoles.includes(userRole) && user.status === 'active'
        return isEligible
      })
      .map(user => ({
        id: user.id,
        name: user.realName || user.name || user.username,
        department: user.departmentName || user.department || '未分配',
        role: user.role
      }))

    console.log('[业绩分享] 可用用户数:', availableUsers.value.length)
    console.log('[业绩分享] 可用用户列表:', availableUsers.value)
  } catch (error) {
    console.error('[业绩分享] 加载用户列表失败:', error)
    availableUsers.value = []
  }
}

// 数据范围控制函数
const applyDataScopeControl = (orderList: unknown[]) => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 超级管理员可以查看所有订单
  if (currentUser.role === 'admin' || currentUser.role === 'super_admin') {
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
    // 注意：不要在这里调用 initializeWithMockData
    // createPersistentStore 会自动从 localStorage 恢复数据
    // 如果数据为空，说明确实没有数据，不应该强制初始化

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
    shareForm.value.shareMembers.push({ userId: '', percentage: 0.1, userName: '' })
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

    // 🔥 比例格式：totalPercentage 是0-1范围
    if (totalPercentage.value > 1) {
      ElMessage.error('分享比例总和不能超过1（即100%）')
      return
    }

    if (totalPercentage.value === 0) {
      ElMessage.error('请设置分享比例')
      return
    }

    submitLoading.value = true

    console.log('[业绩分享] 开始提交分享数据')

    // 准备分享数据 - 🔥 将比例(0.5)转换为百分比(50)发送给后端
    const shareData = {
      orderId: shareForm.value.orderId,
      orderNumber: selectedOrder.value?.orderNumber || '',
      orderAmount: selectedOrder.value?.totalAmount || 0,
      shareMembers: shareForm.value.shareMembers.map(member => {
        const pct = member.percentage * 100 // 🔥 0.5 → 50
        const shareAmount = (selectedOrder.value?.totalAmount || 0) * member.percentage // 比例直接乘以金额
        return {
          userId: member.userId,
          userName: availableUsers.value.find(u => u.id === member.userId)?.name || '',
          percentage: pct, // 🔥 后端存储百分比格式 (50, 30 等)
          shareAmount: shareAmount,
          status: 'pending' as const
        }
      }),
      createdBy: userStore.currentUser?.name || '',
      createdById: userStore.currentUser?.id || '',
      description: shareForm.value.description
    }

    console.log('[业绩分享] 分享数据:', shareData)

    if (isEditMode.value) {
      // 更新现有记录
      const currentShare = shareRecords.value.find(record => record.id === shareForm.value.orderId)
      if (currentShare) {
        await performanceStore.updatePerformanceShare(currentShare.id, shareData)
        ElMessage.success('分享更新成功')
      }
    } else {
      // 创建新记录
      const newShare = await performanceStore.createPerformanceShare(shareData)
      console.log('[业绩分享] 分享创建成功:', newShare)
      // 移除这里的成功提示，统一在最后显示
    }

    // 关闭对话框
    cancelShareForm()

    // 重新加载分享记录
    await loadShareRecords()

    // 触发业绩数据同步更新
    console.log('[业绩分享] 触发业绩数据同步')
    await performanceStore.syncPerformanceData()

    // 🔥 发送全局事件通知其他页面刷新（个人业绩、团队业绩、数据看板）
    window.dispatchEvent(new CustomEvent('performanceDataUpdate', { detail: { type: isEditMode.value ? 'share_updated' : 'share_created' } }))
    window.dispatchEvent(new CustomEvent('dataSync', { detail: { type: isEditMode.value ? 'share_updated' : 'share_created' } }))

    console.log('[业绩分享] 分享流程完成')

    // 只在这里显示成功提示
    ElMessage.success(isEditMode.value ? '分享更新成功' : '分享创建成功')
  } catch (error) {
    console.error('[业绩分享] 提交分享失败:', error)
    ElMessage.error('提交分享失败')
  } finally {
    submitLoading.value = false
  }
}





const handleOpenShareDialog = async () => {
  console.log('[业绩分享] 打开新建分享对话框')
  // 加载用户列表
  await loadAvailableUsers()
  // 打开对话框
  showShareDialog.value = true
}

const cancelShareForm = () => {
  showShareDialog.value = false
  isEditMode.value = false
  shareForm.value = {
    orderId: '',
    shareMembers: [
      { userId: '', percentage: 0.5 }
    ],
    description: ''
  }
  selectedOrder.value = null
  orderSearchQuery.value = ''
  availableOrders.value = []
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
    // 🔥 后端存储的是百分比(50)，前端表单需要比例(0.5)
    shareMembers: (share.shareMembers || []).map(m => ({
      ...m,
      percentage: m.percentage > 1 ? m.percentage / 100 : m.percentage
    })),
    description: share.description
  }
  selectedOrder.value = availableOrders.value.find(order => order.id === share.orderId)
  showShareDialog.value = true
}

const cancelShare = async (share: ShareDetail) => {
  try {
    await ElMessageBox.confirm('确定要取消这个业绩分享吗？取消后相关业绩数据将恢复。', '确认取消', {
      type: 'warning',
      confirmButtonText: '确认取消',
      cancelButtonText: '暂不取消'
    })

    // 🔥 设置取消中状态
    cancelLoading.value = share.id
    console.log('[业绩分享] 开始取消分享:', share.id)

    const success = await performanceStore.cancelPerformanceShare(share.id)
    if (success) {
      ElMessage.success('业绩分享已取消')
      // 重新加载数据（store中已重新加载过，这里再刷新总数）
      await loadShareRecords()
      // 🔥 发送全局事件通知其他页面刷新（同时支持 CustomEvent 和 EventBus）
      window.dispatchEvent(new CustomEvent('performanceDataUpdate', { detail: { type: 'share_cancelled', shareId: share.id } }))
      window.dispatchEvent(new CustomEvent('dataSync', { detail: { type: 'share_cancelled', shareId: share.id } }))
    } else {
      ElMessage.error('取消失败，请检查网络连接或联系管理员')
    }
  } catch (error: any) {
    // ElMessageBox.confirm 被用户取消时会抛出 'cancel'
    if (error === 'cancel' || error?.toString?.()?.includes('cancel')) return
    console.error('取消分享失败:', error)
    ElMessage.error('取消失败: ' + (error?.message || '请重试'))
  } finally {
    cancelLoading.value = null
  }
}

const canEditShare = (share: ShareDetail) => {
  // 管理员或创建者都可以编辑
  const currentUserId = String(userStore.currentUser?.id || '')
  const isCreator = String(share.createdById || '') === currentUserId ||
                    share.createdBy === userStore.currentUser?.name ||
                    share.createdBy === userStore.currentUser?.realName
  return (userStore.isAdmin || isCreator) && share.status === 'active'
}

const canCancelShare = (share: ShareDetail) => {
  // 🔥 修复：管理员和创建者都可以取消分享（类型安全比较）
  const currentUserId = String(userStore.currentUser?.id || '')
  const isCreator = String(share.createdById || '') === currentUserId ||
                    share.createdBy === userStore.currentUser?.name ||
                    share.createdBy === userStore.currentUser?.realName
  return (userStore.isAdmin || isCreator) && share.status === 'active'
}

const viewOrderDetail = (orderId: string) => {
  // 跳转到订单详情页面
  window.open(`/order/detail/${orderId}`, '_blank')
}

/**
 * 显示全屏查看对话框
 */
const showFullscreenView = () => {
  fullscreenVisible.value = true
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
    const params: unknown = {
      format: exportFormat.value
    }

    if (exportDateRange.value && exportDateRange.value.length === 2) {
      params.startDate = exportDateRange.value[0]
      params.endDate = exportDateRange.value[1]
    }

    ElMessage.info('正在导出数据...')

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
    shipped: 'primary',           // 已发货用蓝色
    delivered: 'success',         // 已签收用绿色
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
    cancelled: '已取消',
    completed: '已完成',
    processing: '处理中',
    paid: '已支付',
    unpaid: '未支付'
  }
  return statusMap[status] || status
}

const getTableRowClassName = ({ row, rowIndex }: { row: unknown, rowIndex: number }) => {
  return `table-row-${rowIndex % 2 === 0 ? 'even' : 'odd'}`
}

const handleRowClick = (row: unknown) => {
  // 移除点击提示,保持静默
  // 如果需要跳转到详情页,可以在这里添加逻辑
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
onMounted(async () => {
  await loadShareRecords()
  await loadAvailableUsers()
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
  padding-bottom: 100px;
  background: #f5f7fa;
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
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-btn-primary {
  background: #409EFF;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.action-btn-primary:hover {
  background: #66b1ff;
}

.action-btn-secondary {
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 500;
  color: #606266;
  transition: all 0.3s ease;
}

.action-btn-secondary:hover {
  background: #f5f7fa;
  border-color: #c0c4cc;
  color: #409EFF;
}

.share-overview {
  margin-bottom: 20px;
}

.overview-card {
  border: none;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.overview-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.card-content {
  display: flex;
  align-items: center;
  padding: 20px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.card-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.overview-card:hover .card-icon::before {
  left: 100%;
}

.overview-card:hover .card-icon {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.card-icon.total {
  background: #409EFF;
}

.card-icon.amount {
  background: #E6A23C;
}

.card-icon.members {
  background: #67C23A;
}

.card-icon.orders {
  background: #13C2C2;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
}

/* 表格工具栏 */
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.toolbar-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
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

/* 响应式布局优化 */
@media (max-width: 1200px) {
  .toolbar-right {
    flex-wrap: wrap;
    gap: 10px;
  }
}

@media (max-width: 768px) {
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-left {
    justify-content: center;
  }

  .toolbar-right {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .toolbar-right > * {
    width: 100%;
  }
}

.share-members-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.member-tag-compact {
  flex-shrink: 0;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  padding: 0 6px;
  height: 22px;
  line-height: 22px;
}

.tag-label-mini {
  font-size: 10px;
  opacity: 0.8;
}

.short-code {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
  cursor: default;
  white-space: nowrap;
}

.amount-text-compact {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.time-text-compact {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.operator-name-compact {
  font-size: 13px;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  max-width: 100%;
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
  font-size: 16px;
}

.share-allocation-row {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.share-ratio-text {
  color: #2d3748;
}

.owner-retained-text {
  color: #2b6cb0;
  font-size: 14px;
}

.error-text {
  color: #e53e3e;
  font-weight: 700;
}

.warning-text {
  color: #dd6b20;
  font-weight: 600;
  font-size: 14px;
  display: block;
  margin-top: 6px;
}

.success-text {
  color: #2f855a;
  font-weight: 600;
  font-size: 14px;
  display: block;
  margin-top: 6px;
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
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 24px;
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

/* 搜索结果提示样式 */
.search-result-tip {
  margin-top: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-result-tip .no-result {
  color: #d97706;
  background: #fef3c7;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-result-tip .found-result {
  color: #059669;
  background: #d1fae5;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-result-tip .multiple-results {
  color: #2563eb;
  background: #dbeafe;
  padding: 8px 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 订单选项样式 */
.order-option {
  padding: 8px 0;
}

.order-main {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.customer-name {
  font-weight: 600;
  color: #1f2937;
}

.order-amount {
  font-weight: 700;
  color: #059669;
  margin-left: auto;
}

.order-sub {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #6b7280;
}

.phone {
  color: #6b7280;
}

.time {
  color: #9ca3af;
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
  width: 100%;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* 🔥 确保表格不溢出，所有内容自适应铺满 */
:deep(.el-table__body-wrapper) {
  overflow-x: hidden !important;
}

:deep(.el-table .el-table__header-wrapper) {
  overflow-x: hidden !important;
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
  background-color: #f5f7fa !important;
  transform: scale(1.002);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
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
  padding: 10px 12px;
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
  padding: 8px 12px;
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
  display: flex;
  justify-content: center;
  align-items: center;
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

/* 弹窗遮罩层 - 使用浅色半透明背景 */
:deep(.el-overlay) {
  background-color: rgba(255, 255, 255, 0.8) !important;
  backdrop-filter: blur(4px);
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
    margin-bottom: 12px;
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

.table-toolbar,
.share-table {
  animation: fadeInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 分享详情弹窗 - 横向布局 */
.share-detail-horizontal {
  display: flex;
  gap: 24px;
  max-height: 70vh;
}

.detail-left {
  flex: 1;
  min-width: 0;
}

.detail-right {
  flex: 1;
  min-width: 0;
  border-left: 1px solid #e5e7eb;
  padding-left: 24px;
}

.detail-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e7eb;
}

.detail-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.detail-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.detail-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 500;
}

.detail-value {
  font-size: 14px;
  color: #111827;
  font-weight: 500;
}

.amount-highlight {
  color: #059669;
  font-weight: 600;
  font-size: 15px;
}

.detail-description {
  margin-top: 20px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 6px;
  border: 1px solid #bae6fd;
}

.detail-description p {
  margin: 8px 0 0 0;
  color: #374151;
  font-size: 13px;
  line-height: 1.6;
}

.members-list {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 8px;
}

.member-item-horizontal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  margin-bottom: 10px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.member-item-horizontal:hover {
  background: #f0f9ff;
  border-color: #3b82f6;
  transform: translateX(4px);
}

.member-left-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.member-avatar-small {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
}

.member-name-small {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
}

.member-right-info {
  text-align: right;
}

.member-percentage {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 4px;
}

.member-amount {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

/* 旧的详情样式 - 保留以防需要 */
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

/* 操作按钮样式 - text 模式精致风格 */
.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;
  align-items: center;
}

.action-buttons :deep(.el-button) {
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 4px;
  transition: all 0.25s ease;
}

/* 详情按钮 - 蓝色 text */
.action-buttons :deep(.el-button--primary.is-text) {
  color: #409eff;
}
.action-buttons :deep(.el-button--primary.is-text:hover) {
  color: #337ecc;
  background-color: #ecf5ff;
}

/* 编辑按钮 - 橙色 text */
.action-buttons :deep(.el-button--warning.is-text) {
  color: #e6a23c;
}
.action-buttons :deep(.el-button--warning.is-text:hover) {
  color: #cf8a2e;
  background-color: #fdf6ec;
}

/* 取消按钮 - 红色 text */
.action-buttons :deep(.el-button--danger.is-text) {
  color: #f56c6c;
}
.action-buttons :deep(.el-button--danger.is-text:hover) {
  color: #d9534f;
  background-color: #fef0f0;
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
    gap: 4px;
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
</style>
