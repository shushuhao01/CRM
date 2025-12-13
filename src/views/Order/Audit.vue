<template>
  <div class="order-audit">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>订单审核</h2>
    </div>

    <!-- 汇总数据卡片 -->
    <div class="summary-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="summary-content">
              <div class="summary-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ summaryData.pendingCount }}</div>
                <div class="summary-label">待审核订单</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="summary-content">
              <div class="summary-icon amount">
                <el-icon><Money /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-value">¥{{ (summaryData.pendingAmount || 0).toLocaleString() }}</div>
                <div class="summary-label">待审核金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="summary-content">
              <div class="summary-icon today">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ summaryData.todayCount }}</div>
                <div class="summary-label">今日新增</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="summary-card">
            <div class="summary-content">
              <div class="summary-icon urgent">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="summary-info">
                <div class="summary-value">{{ summaryData.urgentCount }}</div>
                <div class="summary-label">超时订单</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快捷筛选按钮 -->
    <el-card class="quick-filter-card">
      <div class="quick-filter-content">
        <span class="filter-label">快捷筛选：</span>
        <div class="filter-buttons">
          <el-button
            v-for="filter in quickFilters"
            :key="filter.value"
            :type="activeQuickFilter === filter.value ? 'primary' : 'default'"
            :class="{ 'active-filter': activeQuickFilter === filter.value }"
            size="small"
            round
            @click="handleQuickFilter(filter.value)"
          >
            {{ filter.label }}
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNo"
            placeholder="请输入订单号"
            clearable
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input
            v-model="searchForm.customerName"
            placeholder="请输入客户姓名"
            clearable
            style="width: 200px;"
          />
        </el-form-item>
        <el-form-item label="销售人员">
          <el-select
            v-model="searchForm.salesPerson"
            placeholder="请选择销售人员"
            clearable
            filterable
            style="width: 200px;"
          >
            <el-option label="全部" value="" />
            <el-option
              v-for="user in salesUserList"
              :key="user.id"
              :label="user.name"
              :value="user.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="订单金额">
          <el-input
            v-model="searchForm.minAmount"
            placeholder="最小金额"
            type="number"
            style="width: 120px;"
          />
          <span style="margin: 0 8px;">-</span>
          <el-input
            v-model="searchForm.maxAmount"
            placeholder="最大金额"
            type="number"
            style="width: 120px;"
          />
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px;"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search">搜索</el-button>
          <el-button @click="handleReset" :icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 订单列表 -->
    <el-card class="table-card-container">
      <DynamicTable
        :data="paginatedOrderList"
        :columns="tableColumns"
        :storage-key="`order-audit-${activeTab}`"
        :loading="loading"
        :show-selection="true"
        :show-actions="true"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        :current-page="pagination.page"
        :page-size="pagination.size"
        @selection-change="handleSelectionChange"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      >
      <template #header-actions>
        <!-- 左侧状态标签页 -->
        <div class="header-tabs">
          <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="audit-tabs">
            <el-tab-pane label="待审核" name="pending">
               <template #label>
                 <span class="tab-label" @click="handleBadgeClick('pending')">
                   <el-icon><Clock /></el-icon>
                   待审核
                   <el-badge
                     v-if="!badgeClicked.pending && tabCounts.pending > 0"
                     :value="tabCounts.pending"
                     :max="99"
                     class="tab-badge"
                   />
                   <span v-else-if="tabCounts.pending > 0" class="count-text">{{ tabCounts.pending }}</span>
                 </span>
               </template>
             </el-tab-pane>
             <el-tab-pane label="已审核通过" name="approved">
               <template #label>
                 <span class="tab-label">
                   <el-icon><Check /></el-icon>
                   已审核通过
                 </span>
               </template>
             </el-tab-pane>
             <el-tab-pane label="审核拒绝" name="rejected">
               <template #label>
                 <span class="tab-label">
                   <el-icon><Close /></el-icon>
                   审核拒绝
                 </span>
               </template>
             </el-tab-pane>
          </el-tabs>
        </div>

        <div class="header-spacer"></div>

        <!-- 右侧操作区域 -->
        <div class="header-actions-right">
          <!-- 批量操作按钮 -->
          <el-button
            @click="handleBatchAudit('approved')"
            type="success"
            :disabled="selectedOrders.length === 0"
            :icon="Check"
            size="small"
          >
            批量通过 ({{ selectedOrders.length }})
          </el-button>
          <el-button
            @click="handleBatchAudit('rejected')"
            type="danger"
            :disabled="selectedOrders.length === 0"
            :icon="Close"
            size="small"
          >
            批量拒绝 ({{ selectedOrders.length }})
          </el-button>
          <el-button @click="handleRefresh" :icon="Refresh" size="small">刷新</el-button>

          <el-divider direction="vertical" />

          <!-- 全选框 -->
          <el-checkbox
            v-model="selectAll"
            @change="handleSelectAll"
            :indeterminate="isIndeterminate"
          >
            全选
          </el-checkbox>

          <el-divider direction="vertical" />

          <!-- 总记录数 -->
          <span class="total-info">共 {{ pagination.total }} 条记录</span>
        </div>
      </template>

      <!-- 订单号列 -->
      <template #column-orderNo="{ row }">
        <el-link type="primary" @click="goToOrderDetail(row)" :underline="false">
          {{ row.orderNo }}
        </el-link>
      </template>

      <!-- 客户姓名列 -->
      <template #column-customerName="{ row }">
        <el-link type="primary" @click="goToCustomerDetail(row)" :underline="false">
          {{ row.customerName }}
        </el-link>
      </template>

      <template #customerPhone="{ row }">
        {{ displaySensitiveInfoNew(row.customerPhone, 'phone') }}
      </template>

      <template #totalAmount="{ row }">
        <span class="amount">¥{{ (row.totalAmount || 0).toLocaleString() }}</span>
      </template>

      <template #waitingTime="{ row }">
        <el-tag
          :type="getWaitingTimeType(row.waitingMinutes)"
          size="small"
        >
          {{ formatWaitingTime(row.waitingMinutes) }}
        </el-tag>
      </template>

      <template #auditStatus="{ row }">
        <el-tag
          :style="getOrderStatusStyle(row.auditStatus)"
          size="small"
          effect="plain"
        >
          {{ getUnifiedStatusText(row.auditStatus) }}
        </el-tag>
      </template>

      <template #column-auditFlag="{ row }">
        <el-tag
          :type="getAuditFlagType(row.auditFlag)"
          size="small"
          effect="plain"
        >
          {{ getAuditFlagText(row.auditFlag) }}
        </el-tag>
      </template>

      <template #table-actions="{ row }">
        <el-button
          @click="handleView(row)"
          type="primary"
          link
          size="small"
          :icon="View"
        >
          查看
        </el-button>

        <!-- 待审核状态的操作按钮 -->
        <template v-if="activeTab === 'pending'">
          <el-button
            @click="handleAudit(row, 'approved')"
            type="success"
            link
            size="small"
            :icon="Check"
          >
            通过
          </el-button>
          <el-button
            @click="handleAudit(row, 'rejected')"
            type="danger"
            link
            size="small"
            :icon="Close"
          >
            拒绝
          </el-button>
        </template>

        <!-- 已审核通过状态的操作按钮 -->
        <template v-else-if="activeTab === 'approved'">
          <el-button
            @click="handleReAudit(row, 'rejected')"
            type="danger"
            link
            size="small"
            :icon="Close"
          >
            撤销
          </el-button>
        </template>

        <!-- 审核拒绝状态的操作按钮 -->
        <template v-else-if="activeTab === 'rejected'">
          <el-button
            @click="handleReAudit(row, 'approved')"
            type="success"
            link
            size="small"
            :icon="Check"
          >
            重新通过
          </el-button>
        </template>

        <el-button
          @click="handleQuickRemark(row)"
          type="warning"
          link
          size="small"
          :icon="Edit"
        >
          备注
        </el-button>
      </template>
    </DynamicTable>
    </el-card>

    <!-- 订单详情审核弹窗 -->
    <el-dialog
      v-model="orderDetailDialogVisible"
      title="订单审核"
      width="800px"
      :before-close="handleOrderDetailDialogClose"
    >
      <div class="order-detail-content" v-if="currentOrder">
        <!-- 订单基本信息 -->
        <el-card class="order-info-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>订单基本信息</span>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="12">
              <div class="info-item">
                <span class="label">订单号：</span>
                <span class="value">{{ currentOrder.orderNo }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">订单金额：</span>
                <span class="value amount">¥{{ currentOrder.totalAmount?.toLocaleString() }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">定金金额：</span>
                <span class="value deposit-amount">¥{{ (currentOrder.depositAmount || 0).toLocaleString() }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">到付金额：</span>
                <span class="value cod-amount">¥{{ (currentOrder.codAmount || 0).toLocaleString() }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">支付方式：</span>
                <span class="value">{{ getPaymentMethodText(currentOrder.paymentMethod) }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">客户姓名：</span>
                <span class="value">{{ currentOrder.customerName }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">联系电话：</span>
                <span class="value">{{ displaySensitiveInfoNew(currentOrder.customerPhone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}</span>
              </div>
            </el-col>
            <el-col :span="24">
              <div class="info-item">
                <span class="label">收货地址：</span>
                <span class="value">{{ currentOrder.deliveryAddress }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">销售人员：</span>
                <span class="value">{{ currentOrder.salesPerson }}</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">产品数量：</span>
                <span class="value">{{ currentOrder.productCount }} 件</span>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <span class="label">创建时间：</span>
                <span class="value">{{ formatDateTime(currentOrder.createTime) }}</span>
              </div>
            </el-col>
            <el-col :span="12" v-if="currentOrder.waitingHours">
              <div class="info-item">
                <span class="label">等待时间：</span>
                <span class="value" :class="getWaitingTimeType(currentOrder.waitingHours)">
                  {{ currentOrder.waitingHours }} 小时
                </span>
              </div>
            </el-col>
            <el-col :span="24" v-if="currentOrder.remark">
              <div class="info-item">
                <span class="label">订单备注：</span>
                <span class="value">{{ currentOrder.remark }}</span>
              </div>
            </el-col>
            <!-- 支付截图 - 只保留这一个截图显示区域 -->
            <el-col :span="24">
              <div class="info-item deposit-screenshots-section">
                <span class="label">支付截图：</span>
                <template v-if="currentOrder.paymentScreenshots && currentOrder.paymentScreenshots.length > 0">
                  <div class="screenshot-gallery">
                    <div
                      v-for="(screenshot, index) in currentOrder.paymentScreenshots"
                      :key="screenshot.id"
                      class="screenshot-item"
                      @click="handleViewScreenshot(currentOrder.paymentScreenshots, index)"
                    >
                      <el-image
                        :src="screenshot.url"
                        :alt="screenshot.name"
                        fit="cover"
                        class="screenshot-thumbnail"
                        :preview-disabled="true"
                      >
                        <template #error>
                          <div class="image-error">
                            <el-icon><Picture /></el-icon>
                            <span>加载失败</span>
                          </div>
                        </template>
                      </el-image>
                      <div class="screenshot-name">{{ screenshot.name }}</div>
                      <div class="screenshot-overlay">
                        <el-icon class="view-icon"><ZoomIn /></el-icon>
                      </div>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <span class="value no-data">暂无支付截图</span>
                </template>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 审核操作区域 -->
        <el-card class="audit-action-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Edit /></el-icon>
              <span>审核操作</span>
            </div>
          </template>

          <el-form
            ref="quickAuditFormRef"
            :model="quickAuditForm"
            :rules="quickAuditRules"
            label-width="100px"
          >
            <el-form-item label="审核结果" prop="result" :required="false">
              <el-radio-group v-model="quickAuditForm.result">
                <el-radio label="approved">
                  <el-icon color="#67c23a"><Check /></el-icon>
                  审核通过
                </el-radio>
                <el-radio label="rejected">
                  <el-icon color="#f56c6c"><Close /></el-icon>
                  审核拒绝
                </el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 拒绝原因选择框 -->
            <el-form-item
              v-if="quickAuditForm.result === 'rejected'"
              label="拒绝原因"
              prop="rejectionReason"
              required
            >
              <el-select
                v-model="quickAuditForm.rejectionReason"
                placeholder="请选择拒绝原因"
                style="width: 100%"
              >
                <el-option
                  v-for="reason in rejectionReasonStore.reasons"
                  :key="reason.id"
                  :label="reason.name"
                  :value="reason.name"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="审核备注" prop="remark" :required="false">
              <el-input
                v-model="quickAuditForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入审核备注（选填）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 可折叠的审核轨迹 -->
        <el-card class="audit-history-card" shadow="never">
          <template #header>
            <div class="card-header" @click="auditHistoryCollapsed = !auditHistoryCollapsed" style="cursor: pointer;">
              <div class="header-left">
                <el-icon><Clock /></el-icon>
                <span>审核轨迹</span>
                <el-badge
                  :value="currentOrder?.auditHistory?.length || 0"
                  :max="99"
                  type="info"
                  style="margin-left: 8px;"
                />
              </div>
              <el-icon class="collapse-icon" :class="{ 'collapsed': auditHistoryCollapsed }">
                <ArrowRight />
              </el-icon>
            </div>
          </template>

          <el-collapse-transition>
            <div v-show="!auditHistoryCollapsed">
              <el-timeline size="small">
                <el-timeline-item
                  v-for="item in currentOrder?.auditHistory || []"
                  :key="item.id"
                  :timestamp="item.time"
                  :type="getTimelineType(item.action)"
                  :icon="getTimelineIcon(item.action)"
                  placement="top"
                >
                  <div class="timeline-content-compact" :data-action="item.action">
                     <div class="timeline-header-compact">
                       <span class="action-name">{{ item.actionName }}</span>
                       <el-tag
                         :type="getActionTagType(item.action)"
                         size="small"
                       >
                         {{ item.operatorRole }}
                       </el-tag>
                     </div>
                     <div class="timeline-body-compact">
                       <span class="operator">{{ item.operator }}</span>
                       <span v-if="item.remark" class="remark">{{ item.remark }}</span>
                     </div>
                   </div>
                </el-timeline-item>
              </el-timeline>
            </div>
          </el-collapse-transition>
        </el-card>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleOrderDetailDialogClose">取消</el-button>
          <el-button
            @click="handleQuickAuditSubmit"
            type="primary"
            :loading="quickAuditLoading"
            :disabled="!quickAuditForm.result"
          >
            确认{{ quickAuditForm.result === 'approved' ? '通过' : '拒绝' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 图片查看器 -->
    <el-dialog
      v-model="imageViewerVisible"
      title="支付截图查看"
      width="80%"
      :before-close="handleImageViewerClose"
      class="image-viewer-dialog"
    >
      <div class="image-viewer-container" v-if="currentImageList.length > 0">
        <el-image
          :src="currentImageList[currentImageIndex]"
          fit="contain"
          class="viewer-image"
        >
          <template #error>
            <div class="image-error-large">
              <el-icon size="48"><Picture /></el-icon>
              <p>图片加载失败</p>
            </div>
          </template>
        </el-image>

        <!-- 图片导航 -->
        <div class="image-navigation" v-if="currentImageList.length > 1">
          <el-button
            @click="handlePrevImage"
            :disabled="currentImageIndex === 0"
            circle
            class="nav-btn prev-btn"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <span class="image-counter">
            {{ currentImageIndex + 1 }} / {{ currentImageList.length }}
          </span>
          <el-button
            @click="handleNextImage"
            :disabled="currentImageIndex === currentImageList.length - 1"
            circle
            class="nav-btn next-btn"
          >
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="auditDialogVisible"
      :title="auditDialogTitle"
      width="600px"
      :before-close="handleAuditDialogClose"
    >
      <el-form
        ref="auditFormRef"
        :model="auditForm"
        :rules="auditRules"
        label-width="100px"
      >
        <el-form-item label="审核结果" prop="result" :required="false">
          <el-radio-group v-model="auditForm.result" @change="handleAuditResultChange">
            <el-radio label="approved">
              <el-icon color="#67c23a"><Check /></el-icon>
              审核通过
            </el-radio>
            <el-radio label="rejected">
              <el-icon color="#f56c6c"><Close /></el-icon>
              审核拒绝
            </el-radio>
          </el-radio-group>
        </el-form-item>


        <!-- 拒绝原因选择 -->
        <el-form-item
          v-if="auditForm.result === 'rejected'"
          label="拒绝原因"
          prop="rejectionReasonId"
          required
        >
          <div class="rejection-reason-section">
            <el-select
              v-model="auditForm.rejectionReasonId"
              placeholder="请选择拒绝原因"
              clearable
              filterable
              @change="handleRejectionReasonChange"
              style="width: 300px;"
            >
              <el-option
                v-for="reason in rejectionReasonStore.getReasonOptions()"
                :key="reason.value"
                :label="reason.label"
                :value="reason.value"
              />
            </el-select>
            <el-button
              type="text"
              @click="handleOpenRejectionReasonManagement"
              style="margin-left: 8px; flex-shrink: 0;"
            >
              管理原因
            </el-button>
          </div>
        </el-form-item>

        <el-form-item label="审核备注" prop="remark" :required="false">
          <el-input
            v-model="auditForm.remark"
            type="textarea"
            :rows="4"
            :placeholder="getRemarkPlaceholder()"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item v-if="isBatchAudit" label="影响订单">
          <div class="batch-orders">
            <el-tag
              v-for="order in selectedOrders"
              :key="order.id"
              class="order-tag"
              closable
              @close="removeBatchOrder(order)"
            >
              {{ order.orderNo }} - ¥{{ (order.totalAmount || 0).toLocaleString() }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleAuditDialogClose">取消</el-button>
          <el-button
            @click="handleAuditSubmit"
            type="primary"
            :loading="auditLoading"
          >
            确认{{ auditForm.result === 'approved' ? '通过' : '拒绝' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 快速备注对话框 -->
    <el-dialog
      v-model="remarkDialogVisible"
      title="添加订单备注"
      width="500px"
    >
      <el-form
        ref="remarkFormRef"
        :model="remarkForm"
        :rules="remarkRules"
        label-width="80px"
      >
        <el-form-item label="订单号">
          <el-input v-model="currentOrder.orderNo" disabled />
        </el-form-item>
        <el-form-item label="备注内容" prop="content">
          <el-input
            v-model="remarkForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入备注内容"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="remarkDialogVisible = false">取消</el-button>
          <el-button
            @click="handleRemarkSubmit"
            type="primary"
            :loading="remarkLoading"
          >
            保存备注
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 拒绝原因管理对话框 -->
    <el-dialog
      v-model="rejectionReasonManagementVisible"
      title="拒绝原因管理"
      width="800px"
      @close="handleCloseRejectionReasonManagement"
    >
      <RejectionReasonManagement @close="handleCloseRejectionReasonManagement" />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Check,
  Close,
  Refresh,
  Search,
  View,
  Edit,
  Clock,
  Money,
  Calendar,
  Warning,
  Picture,
  ZoomIn,
  ArrowLeft,
  ArrowRight,
  Plus,
  Upload,
  InfoFilled
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { useRejectionReasonStore } from '@/stores/rejectionReason'
import { orderApi } from '@/api/order'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import DynamicTable from '@/components/DynamicTable.vue'
import RejectionReasonManagement from '@/components/RejectionReasonManagement.vue'
import { eventBus, EventNames } from '@/utils/eventBus'
import { formatDateTime } from '@/utils/dateFormat'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'

// 接口定义
interface PaymentScreenshot {
  id: number
  url: string
  name: string
}

interface AuditHistory {
  id: number
  action: string
  actionName: string
  operator: string
  operatorRole: string
  time: string
  remark: string
}

interface AuditOrder {
  id: string
  orderNo: string
  customerId?: string
  customerName: string
  customerPhone: string
  salesPerson: string
  salesPersonId?: string  // 下单员ID
  createdBy?: string      // 创建人
  createdById?: string    // 创建人ID
  totalAmount: number
  depositAmount: number
  codAmount: number
  productCount: number
  createTime: string
  waitingHours?: number
  remark: string
  auditStatus: 'pending' | 'approved' | 'rejected'
  auditTime?: string
  auditor?: string
  auditRemark?: string
  deliveryAddress: string
  paymentMethod?: string  // 支付方式
  paymentScreenshots: PaymentScreenshot[]
  depositScreenshots?: string[]  // 定金截图
  auditHistory: AuditHistory[]
}

interface SearchForm {
  orderNo: string
  customerName: string
  salesPerson: string
  minAmount: string
  maxAmount: string
  dateRange: string[]
}

interface AuditForm {
  result: 'approved' | 'rejected' | null
  remark: string
  rejectionReasonId?: string
}

interface RemarkForm {
  content: string
}

interface QuickAuditForm {
  result: 'approved' | 'rejected' | null
  rejectionReason: string
  remark: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const userStore = useUserStore()
const appStore = useAppStore()
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()
const rejectionReasonStore = useRejectionReasonStore()

// 响应式数据
const loading = ref(false)
const auditLoading = ref(false)
const remarkLoading = ref(false)
const quickAuditLoading = ref(false)
const auditDialogVisible = ref(false)
const remarkDialogVisible = ref(false)
const orderDetailDialogVisible = ref(false)
const rejectionReasonManagementVisible = ref(false)
const isBatchAudit = ref(false)

// 图片查看器相关
const imageViewerVisible = ref(false)
const currentImageList = ref<string[]>([])
const currentImageIndex = ref(0)

// 审核轨迹折叠状态
const auditHistoryCollapsed = ref(true)

// 标签状态管理
const activeTab = ref('pending')
const tabCounts = reactive({
  pending: 0,
  approved: 0,
  rejected: 0
})

// 红点状态管理（记录待审核标签的红点是否已被点击）
const badgeClicked = reactive({
  pending: false
})

// 所有订单数据
const allOrders = ref<AuditOrder[]>([])
const pendingOrders = ref<AuditOrder[]>([])
const approvedOrders = ref<AuditOrder[]>([])
const rejectedOrders = ref<AuditOrder[]>([])

// 表单引用
const auditFormRef = ref<FormInstance>()
const remarkFormRef = ref<FormInstance>()
const quickAuditFormRef = ref<FormInstance>()

// 选择相关
const selectedOrders = ref<AuditOrder[]>([])
const selectAll = ref(false)

// 销售人员列表 - 从userStore获取真实用户数据
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const salesUserList = computed(() => {
  return userStore.users
    .filter(u => {
      // 检查用户是否启用（禁用用户不显示）
      const isEnabled = !u.status || u.status === 'active'
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin'].includes(u.role)
      return isEnabled && hasValidRole
    })
    .map(u => ({
      id: u.id,
      name: u.realName || u.name || u.username,
      department: u.department || '未分配'
    }))
})

// 计算属性
const isIndeterminate = computed(() => {
  const selectedCount = selectedOrders.value?.length || 0
  const totalCount = orderList.value?.length || 0
  return selectedCount > 0 && selectedCount < totalCount
})

const auditDialogTitle = computed(() => {
  if (isBatchAudit.value) {
    return `批量审核订单 (${selectedOrders.value?.length || 0}个)`
  }
  return '订单审核'
})

// 汇总数据
const summaryData = reactive({
  pendingCount: 0,
  pendingAmount: 0,
  todayCount: 0,
  urgentCount: 0
})

// 搜索表单
const searchForm = reactive({
  orderNo: '',
  customerName: '',
  salesPerson: '',
  minAmount: '',
  maxAmount: '',
  dateRange: []
})

// 快捷筛选
const activeQuickFilter = ref('today')
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 分页
const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})

// 订单列表数据
const orderList = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return pendingOrders.value
    case 'approved':
      return approvedOrders.value
    case 'rejected':
      return rejectedOrders.value
    default:
      return pendingOrders.value
  }
})

// 🔥 分页后的订单列表 - 参考订单列表页面的实现
const paginatedOrderList = computed(() => {
  const allData = orderList.value
  const startIndex = (pagination.page - 1) * pagination.size
  const endIndex = startIndex + pagination.size
  return allData.slice(startIndex, endIndex)
})

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'orderNo',
    label: '订单号',
    width: 160,
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 120,
    visible: true
  },
  {
    prop: 'customerPhone',
    label: '客户电话',
    width: 140,
    visible: true
  },
  {
    prop: 'salesPerson',
    label: '销售人员',
    width: 100,
    visible: true
  },
  {
    prop: 'totalAmount',
    label: '订单金额',
    width: 120,
    align: 'right',
    visible: true
  },
  {
    prop: 'productCount',
    label: '商品数量',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 160,
    visible: true,
    formatter: (value: unknown) => formatDateTime(value as string)
  },
  {
    prop: 'waitingTime',
    label: '等待时间',
    width: 120,
    align: 'center',
    visible: activeTab.value === 'pending'
  },
  {
    prop: 'auditStatus',
    label: '审核状态',
    width: 120,
    align: 'center',
    visible: activeTab.value !== 'pending'
  },
  {
    prop: 'auditFlag',
    label: '审核标识',
    width: 100,
    align: 'center',
    visible: activeTab.value === 'pending'
  },
  {
    prop: 'auditTime',
    label: '审核时间',
    width: 160,
    visible: activeTab.value !== 'pending',
    formatter: (value: unknown) => formatDateTime(value as string)
  },
  {
    prop: 'auditor',
    label: '审核人',
    width: 100,
    visible: activeTab.value !== 'pending'
  },
  {
    prop: 'remark',
    label: '订单备注',
    minWidth: 150,
    showOverflowTooltip: true,
    visible: true
  }
])

// 当前操作的订单
const currentOrder = ref<AuditOrder>({} as AuditOrder)

// 审核表单
const auditForm = reactive<AuditForm>({
  result: null, // 使用null确保初始状态下没有选中任何选项
  remark: '',
  rejectionReasonId: ''
})

// 备注表单
const remarkForm = reactive<RemarkForm>({
  content: ''
})

// 快速审核表单
const quickAuditForm = reactive<QuickAuditForm>({
  result: null, // 使用null确保初始状态下没有选中任何选项
  rejectionReason: '',
  remark: ''
})

// 审核表单验证规则
const auditRules = computed<FormRules>(() => ({
  result: [
    { required: true, message: '请选择审核结果', trigger: 'change' }
  ],
  rejectionReasonId: auditForm.result === 'rejected' ? [
    { required: true, message: '请选择拒绝原因', trigger: 'change' }
  ] : [],
  remark: [] // 审核通过时非必填，拒绝时选择拒绝原因后也非必填
}))

// 备注表单验证规则
const remarkRules: FormRules = {
  content: [
    { required: true, message: '请输入备注内容', trigger: 'blur' },
    { min: 2, message: '备注内容至少2个字符', trigger: 'blur' }
  ]
}

// 快速审核表单验证规则
const quickAuditRules = computed<FormRules>(() => ({
  result: [
    { required: true, message: '请选择审核结果', trigger: 'change' }
  ],
  rejectionReason: quickAuditForm.result === 'rejected' ? [
    { required: true, message: '请选择拒绝原因', trigger: 'change' }
  ] : [],
  remark: [] // 审核备注改为非必填
}))

// 方法定义
/**
 * 获取等待时间类型（基于分钟）
 */
const getWaitingTimeType = (minutes: number) => {
  const hours = minutes / 60
  if (hours >= 48) return 'danger'
  if (hours >= 24) return 'warning'
  return 'success'
}

/**
 * 格式化等待时间显示
 */
const formatWaitingTime = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours}小时`
  }
  return `${hours}小时${mins}分钟`
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status: string) => {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
      return 'warning'
    default:
      return 'info'
  }
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  switch (status) {
    case 'approved':
      return '已通过'
    case 'rejected':
      return '已拒绝'
    case 'pending':
      return '待审核'
    default:
      return '未知'
  }
}

/**
 * 获取审核标识文本
 */
const getAuditFlagText = (flag: string) => {
  switch (flag) {
    case 'approved':
      return '审核通过'
    case 'rejected':
      return '审核拒绝'
    case 'pending':
    default:
      return '待审核'
  }
}

/**
 * 获取审核标识类型
 */
const getAuditFlagType = (flag: string) => {
  switch (flag) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
    default:
      return 'warning'
  }
}

/**
 * 获取支付方式文本
 */
const getPaymentMethodText = (method: string | null | undefined) => {
  if (!method) return '-'
  const methodMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank_transfer: '银行转账',
    unionpay: '云闪付',
    cod: '货到付款',
    cash: '现金',
    card: '刷卡',
    other: '其他'
  }
  return methodMap[method] || method
}

/**
 * 获取表格标题
 */
const getTableTitle = () => {
  switch (activeTab.value) {
    case 'pending':
      return '待审核订单列表'
    case 'approved':
      return '已审核通过订单列表'
    case 'rejected':
      return '审核拒绝订单列表'
    default:
      return '订单列表'
  }
}

/**
 * 处理标签切换
 */
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  selectedOrders.value = []
  selectAll.value = false
  pagination.page = 1
  // 🔥 切换tab时更新分页总数
  nextTick(() => {
    pagination.total = orderList.value?.length || 0
  })
  updateTabCounts()
}

/**
 * 处理全选
 */
const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedOrders.value = [...orderList.value]
  } else {
    selectedOrders.value = []
  }
}

/**
 * 处理选择变化
 */
const handleSelectionChange = (selection: AuditOrder[]) => {
  selectedOrders.value = selection
  selectAll.value = selection.length === orderList.value.length
}

/**
 * 移除批量审核中的订单
 */
const removeBatchOrder = (order: AuditOrder) => {
  const index = selectedOrders.value.findIndex(item => item.id === order.id)
  if (index > -1) {
    selectedOrders.value.splice(index, 1)
  }
}

/**
 * 跳转到订单详情页
 */
const goToOrderDetail = (row: AuditOrder) => {
  if (row.id) {
    safeNavigator.push(`/order/detail/${row.id}`)
  }
}

/**
 * 跳转到客户详情页
 */
const goToCustomerDetail = (row: AuditOrder) => {
  // 优先使用row中的customerId，如果没有则从订单store获取
  if (row.customerId) {
    safeNavigator.push(`/customer/detail/${row.customerId}`)
  } else {
    const order = orderStore.getOrderById(row.id)
    if (order && order.customerId) {
      safeNavigator.push(`/customer/detail/${order.customerId}`)
    } else {
      ElMessage.warning('客户ID不存在')
    }
  }
}

/**
 * 查看订单详情（打开审核弹窗）- 不设置默认选中状态
 */
const handleView = (row: AuditOrder) => {
  currentOrder.value = row
  // 重置快速审核表单，查看模式下不设置默认选中
  quickAuditForm.result = null
  quickAuditForm.rejectionReason = ''
  quickAuditForm.remark = ''
  // 打开订单详情审核弹窗
  orderDetailDialogVisible.value = true
}



/**
 * 单个订单审核 - 根据按钮类型设置默认选中状态（用于简单审核弹窗）
 */
const handleAudit = (row: AuditOrder, result: 'approved' | 'rejected') => {
  currentOrder.value = row
  // 根据点击的按钮设置默认选中状态
  auditForm.result = result
  auditForm.remark = ''
  auditForm.rejectionReasonId = ''
  isBatchAudit.value = false
  auditDialogVisible.value = true
}

/**
 * 批量审核
 */
const handleBatchAudit = (result: string) => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要审核的订单')
    return
  }

  auditForm.result = result
  auditForm.remark = ''
  auditForm.rejectionReasonId = ''
  isBatchAudit.value = true
  auditDialogVisible.value = true
}

/**
 * 快速备注
 */
const handleQuickRemark = (row: AuditOrder) => {
  currentOrder.value = row
  remarkForm.content = row.remark || ''
  remarkDialogVisible.value = true
}

/**
 * 重新审核（撤销或重新通过）
 */
const handleReAudit = (row: AuditOrder, result: 'approved' | 'rejected') => {
  const actionText = result === 'approved' ? '重新通过' : '撤销'
  ElMessageBox.confirm(
    `确认${actionText}此订单吗？`,
    '操作确认',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 从当前列表移除
      const currentList = orderList.value
      const index = currentList.findIndex(item => item.id === row.id)
      if (index > -1) {
        currentList.splice(index, 1)
      }

      // 更新订单状态和时间
      row.auditStatus = result
      row.auditTime = new Date().toLocaleString()
      row.auditor = userStore.user.name

      // 添加到目标列表
      if (result === 'approved') {
        approvedOrders.value.unshift(row)
      } else {
        rejectedOrders.value.unshift(row)
      }

      // 更新标签计数
      updateTabCounts()

      ElMessage.success(`订单${actionText}成功`)
    } catch (error) {
      ElMessage.error(`${actionText}失败`)
    }
  }).catch(() => {
    // 用户取消
  })
}

/**
 * 更新标签计数
 */
const updateTabCounts = () => {
  tabCounts.pending = pendingOrders.value.length
  tabCounts.approved = approvedOrders.value.length
  tabCounts.rejected = rejectedOrders.value.length

  // 同时更新汇总数据中的待审核订单数量
  summaryData.pendingCount = pendingOrders.value.length
  summaryData.pendingAmount = pendingOrders.value.reduce((sum, order) => sum + order.totalAmount, 0)
}

/**
 * 提交审核
 */
const handleAuditSubmit = async () => {
  if (!auditFormRef.value) return

  await auditFormRef.value.validate(async (valid) => {
    if (valid) {
      auditLoading.value = true
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1500))

        const ordersToUpdate = isBatchAudit.value ? selectedOrders.value : [currentOrder.value]
        const action = auditForm.result === 'approved' ? '通过' : '拒绝'

        // 更新订单状态
        ordersToUpdate.forEach(order => {
          // 重要：先更新订单store中的数据，确保数据持久化
          const isApproved = auditForm.result === 'approved'
          const rejectionReason = auditForm.rejectionReasonId
            ? (rejectionReasonStore.getReasonById(auditForm.rejectionReasonId)?.name || auditForm.remark || '')
            : (auditForm.remark || '')

          // 更新订单存储中的订单状态，确保数据持久化
          orderStore.auditOrder(order.id, isApproved, isApproved ? (auditForm.remark || '') : rejectionReason)

          // 从待审核列表移除
          const pendingIndex = pendingOrders.value.findIndex(item => item.id === order.id)
          if (pendingIndex > -1) {
            pendingOrders.value.splice(pendingIndex, 1)
          }

          // 更新订单状态和审核信息（用于页面显示）
          order.auditStatus = auditForm.result
          order.auditTime = new Date().toLocaleString()
          order.auditor = userStore.user.name
          order.auditRemark = auditForm.remark

          // 添加到对应的列表
          if (auditForm.result === 'approved') {
            approvedOrders.value.unshift(order)
          } else {
            rejectedOrders.value.unshift(order)
          }
        })

        // 更新汇总数据
        calculateSummaryData()

        // 更新标签计数
        updateTabCounts()

        // 清空选择
        selectedOrders.value = []
        selectAll.value = false

        ElMessage.success(`成功${action}${ordersToUpdate.length}个订单`)

        // 发送通知消息给下单员
        ordersToUpdate.forEach(order => {
          const messageType = auditForm.result === 'approved' ? notificationStore.MessageType.AUDIT_APPROVED : notificationStore.MessageType.AUDIT_REJECTED
          const actionText = auditForm.result === 'approved' ? '审核通过' : '审核拒绝'
          // 获取下单员ID（优先使用salesPersonId，其次使用createdBy）
          const orderCreatorId = order.salesPersonId || order.createdBy || order.createdById

          // 发送审核结果通知给下单员
          notificationStore.sendMessage(
            messageType,
            `订单 ${order.orderNo} (客户: ${order.customerName}, 金额: ¥${order.totalAmount?.toLocaleString()}) 已${actionText}`,
            {
              relatedId: order.id,
              relatedType: 'order',
              actionUrl: `/order/detail/${order.id}`,
              targetUserId: orderCreatorId,  // 发送给下单员
              createdBy: userStore.user?.id  // 审核人
            }
          )

          // 【批次201修复】发送待发货通知（审核通过时）
          if (auditForm.result === 'approved') {
            notificationStore.sendMessage(
              notificationStore.MessageType.ORDER_PENDING_SHIPMENT,
              `订单 ${order.orderNo} 审核通过，已流转到物流发货列表，等待发货`,
              {
                relatedId: order.id,
                relatedType: 'order',
                actionUrl: `/logistics/shipping`,
                targetUserId: orderCreatorId  // 发送给下单员
              }
            )
          } else {
            // 发送退回通知给销售员（审核拒绝时）
            const rejectionReason = auditForm.rejectionReasonId
              ? (rejectionReasonStore.getReasonById(auditForm.rejectionReasonId)?.name || auditForm.remark || '')
              : (auditForm.remark || '')

            notificationStore.sendMessage(
              notificationStore.MessageType.AUDIT_REJECTED,
              `订单 ${order.orderNo} 审核被拒绝，已退回修改。拒绝原因：${rejectionReason}`,
              {
                relatedId: order.id,
                relatedType: 'order',
                actionUrl: `/order/edit/${order.id}`,
                targetUserId: orderCreatorId  // 发送给下单员
              }
            )
          }
        })

        auditDialogVisible.value = false

        // 重置表单
        auditForm.result = ''
        auditForm.remark = ''
        auditForm.rejectionReasonId = ''
      } catch (error) {
        ElMessage.error('审核失败')
      } finally {
        auditLoading.value = false
      }
    }
  })
}

/**
 * 提交备注
 */
const handleRemarkSubmit = async () => {
  if (!remarkFormRef.value) return

  await remarkFormRef.value.validate(async (valid) => {
    if (valid) {
      remarkLoading.value = true
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 800))

        // 更新订单备注
        const order = orderList.value.find(item => item.id === currentOrder.value.id)
        if (order) {
          order.remark = remarkForm.content
        }

        ElMessage.success('备注保存成功')
        remarkDialogVisible.value = false
        remarkForm.content = ''
      } catch (error) {
        ElMessage.error('保存备注失败')
      } finally {
        remarkLoading.value = false
      }
    }
  })
}

/**
 * 关闭审核对话框
 */
const handleAuditDialogClose = () => {
  auditDialogVisible.value = false
  auditForm.result = null
  auditForm.remark = ''
  auditForm.rejectionReasonId = ''
  isBatchAudit.value = false
  auditFormRef.value?.clearValidate()
}

/**
 * 关闭订单详情审核弹窗
 */
const handleOrderDetailDialogClose = () => {
  orderDetailDialogVisible.value = false
  quickAuditForm.result = null
  quickAuditForm.rejectionReason = ''
  quickAuditForm.remark = ''
  currentOrder.value = {}
  quickAuditFormRef.value?.clearValidate()
}

/**
 * 处理红点点击事件
 */
const handleBadgeClick = (tabName: string) => {
  badgeClicked[tabName] = true
}

/**
 * 查看支付截图
 */
const handleViewScreenshot = (screenshots: PaymentScreenshot[], index: number) => {
  currentImageList.value = screenshots.map(item => item.url)
  currentImageIndex.value = index
  imageViewerVisible.value = true
}

/**
 * 查看定金截图
 */
const handleViewDepositScreenshot = (screenshots: string[], index: number) => {
  currentImageList.value = screenshots
  currentImageIndex.value = index
  imageViewerVisible.value = true
}

/**
 * 关闭图片查看器
 */
const handleImageViewerClose = () => {
  imageViewerVisible.value = false
  currentImageList.value = []
  currentImageIndex.value = 0
}

/**
 * 上一张图片
 */
const handlePrevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

/**
 * 下一张图片
 */
const handleNextImage = () => {
  if (currentImageIndex.value < currentImageList.value.length - 1) {
    currentImageIndex.value++
  }
}

/**
 * 获取时间轴类型
 */
const getTimelineType = (action: string) => {
  switch (action) {
    case 'created':
      return 'primary'
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'info'
  }
}

/**
 * 获取时间轴图标
 */
const getTimelineIcon = (action: string) => {
  switch (action) {
    case 'created':
      return 'Plus'
    case 'submitted':
      return 'Upload'
    case 'approved':
      return 'Check'
    case 'rejected':
      return 'Close'
    default:
      return 'InfoFilled'
  }
}

/**
 * 获取操作标签类型
 */
const getActionTagType = (action: string) => {
  switch (action) {
    case 'created':
      return 'info'
    case 'submitted':
      return 'warning'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return ''
  }
}

/**
 * 快速审核提交
 */
const handleQuickAuditSubmit = async () => {
  if (!quickAuditFormRef.value) return

  await quickAuditFormRef.value.validate(async (valid) => {
    if (valid) {
      quickAuditLoading.value = true
      try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000))

        const order = currentOrder.value
        const result = quickAuditForm.result

        // 更新订单状态
        order.auditStatus = result
        order.auditTime = new Date().toLocaleString()
        order.auditor = userStore.userInfo?.name || '当前用户'
        order.auditRemark = quickAuditForm.remark

        // 添加审核历史记录
        if (!order.auditHistory) {
          order.auditHistory = []
        }
        order.auditHistory.push({
          id: order.auditHistory.length + 1,
          action: result,
          actionName: result === 'approved' ? '审核通过' : '审核拒绝',
          operator: userStore.userInfo?.name || '当前用户',
          operatorRole: '审核员',
          time: new Date().toLocaleString(),
          remark: quickAuditForm.remark
        })

        // 从待审核列表移除
        const pendingIndex = pendingOrders.value.findIndex(item => item.id === order.id)
        if (pendingIndex > -1) {
          pendingOrders.value.splice(pendingIndex, 1)
        }

        // 添加到对应列表
        if (result === 'approved') {
          approvedOrders.value.unshift(order)
        } else {
          rejectedOrders.value.unshift(order)
        }

        // 更新汇总数据
        calculateSummaryData()

        // 更新标签计数
        updateTabCounts()

        // 发送通知消息给下单员
        const messageType = result === 'approved' ? notificationStore.MessageType.AUDIT_APPROVED : notificationStore.MessageType.AUDIT_REJECTED
        const actionText = result === 'approved' ? '审核通过' : '审核拒绝'
        // 获取下单员ID
        const orderCreatorId = order.salesPersonId || order.createdBy || order.createdById

        // 发送审核结果通知给下单员
        notificationStore.sendMessage(
          messageType,
          `订单 ${order.orderNo} (客户: ${order.customerName}, 金额: ¥${order.totalAmount?.toLocaleString()}) 已${actionText}`,
          {
            relatedId: order.id,
            relatedType: 'order',
            actionUrl: `/order/detail/${order.id}`,
            targetUserId: orderCreatorId,  // 发送给下单员
            createdBy: userStore.userInfo?.id  // 审核人
          }
        )

        // 如果审核通过，更新订单状态并流转到物流和发货列表
        if (result === 'approved') {
          // 更新订单存储中的订单状态 - 第二个参数必须是boolean类型
          orderStore.auditOrder(order.id, true, quickAuditForm.remark || '')

          // 【批次201修复】发送待发货通知给下单员
          notificationStore.sendMessage(
            notificationStore.MessageType.ORDER_PENDING_SHIPMENT,
            `订单 ${order.orderNo} 审核通过，已流转到物流发货列表，等待发货`,
            {
              relatedId: order.id,
              relatedType: 'order',
              actionUrl: `/logistics/shipping`,
              targetUserId: orderCreatorId  // 发送给下单员
            }
          )
        } else {
          // 如果审核拒绝，退回给销售员
          const rejectionReason = quickAuditForm.rejectionReason || quickAuditForm.remark
          orderStore.auditOrder(order.id, false, rejectionReason)

          // 发送退回通知给下单员
          notificationStore.sendMessage(
            notificationStore.MessageType.AUDIT_REJECTED,
            `订单 ${order.orderNo} 审核被拒绝，已退回修改。拒绝原因：${rejectionReason}`,
            {
              relatedId: order.id,
              relatedType: 'order',
              actionUrl: `/order/edit/${order.id}`,
              targetUserId: orderCreatorId  // 发送给下单员
            }
          )
        }

        ElMessage.success(`订单${result === 'approved' ? '审核通过' : '审核拒绝'}`)
        handleOrderDetailDialogClose()
      } catch (error) {
        ElMessage.error('审核失败，请重试')
      } finally {
        quickAuditLoading.value = false
      }
    }
  })
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadOrderList()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  Object.assign(searchForm, {
    orderNo: '',
    customerName: '',
    salesPerson: '',
    minAmount: '',
    maxAmount: '',
    dateRange: []
  })
  handleSearch()
}

/**
 * 快捷筛选处理
 */
const handleQuickFilter = (filterValue: string) => {
  activeQuickFilter.value = filterValue

  // 根据筛选值设置日期范围
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay())

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfYear = new Date(today.getFullYear(), 0, 1)

  switch (filterValue) {
    case 'today':
      searchForm.dateRange = [today, today]
      break
    case 'yesterday':
      searchForm.dateRange = [yesterday, yesterday]
      break
    case 'thisWeek':
      searchForm.dateRange = [startOfWeek, today]
      break
    case 'thisMonth':
      searchForm.dateRange = [startOfMonth, today]
      break
    case 'thisYear':
      searchForm.dateRange = [startOfYear, today]
      break
    case 'all':
      searchForm.dateRange = []
      break
  }

  // 触发搜索
  handleSearch()
}

/**
 * 刷新
 */
const handleRefresh = () => {
  selectedOrders.value = []
  selectAll.value = false
  loadOrderList()
  loadSummaryData()
}

/**
 * 打开拒绝原因管理对话框
 */
const handleOpenRejectionReasonManagement = () => {
  rejectionReasonManagementVisible.value = true
}

/**
 * 关闭拒绝原因管理对话框
 */
const handleCloseRejectionReasonManagement = () => {
  rejectionReasonManagementVisible.value = false
}

/**
 * 获取备注输入框的提示文本
 */
const getRemarkPlaceholder = () => {
  if (auditForm.result === 'rejected') {
    if (auditForm.rejectionReasonId) {
      return '请输入补充说明（选填）'
    } else {
      return '请先选择拒绝原因'
    }
  }
  return '请输入审核备注（选填）'
}

/**
 * 处理拒绝原因变化
 */
const handleRejectionReasonChange = (reasonId: string) => {
  // 选择拒绝原因后，重新验证表单
  if (auditFormRef.value) {
    auditFormRef.value.clearValidate(['remark'])
  }
}

/**
 * 处理审核结果变化
 */
const handleAuditResultChange = (result: string) => {
  // 当审核结果变化时，清空拒绝原因
  if (result !== 'rejected') {
    auditForm.rejectionReasonId = ''
  }

  // 清除表单验证
  if (auditFormRef.value) {
    auditFormRef.value.clearValidate(['rejectionReasonId', 'remark'])
  }
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.size = size
  loadOrderList()
}

/**
 * 当前页变化
 */
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadOrderList()
}

/**
 * 计算汇总数据
 */
const calculateSummaryData = () => {
  // 计算待审核订单数量和金额
  const pendingCount = pendingOrders.value.length
  const pendingAmount = pendingOrders.value.reduce((sum, order) => sum + order.totalAmount, 0)

  // 计算今日新增订单
  const today = new Date().toISOString().split('T')[0]
  const todayCount = pendingOrders.value.filter(order => {
    const orderDate = new Date(order.createTime).toISOString().split('T')[0]
    return orderDate === today
  }).length

  // 计算超时订单（创建时间超过24小时且仍待审核）
  const now = new Date()
  const urgentCount = pendingOrders.value.filter(order => {
    const createTime = new Date(order.createTime)
    const hoursDiff = (now.getTime() - createTime.getTime()) / (1000 * 60 * 60)
    return hoursDiff > 24
  }).length

  // 更新汇总数据
  Object.assign(summaryData, {
    pendingCount,
    pendingAmount,
    todayCount,
    urgentCount
  })

  console.log('汇总数据已更新', summaryData)
}

/**
 * 加载汇总数据
 */
const loadSummaryData = async () => {
  try {
    // 首次加载时，先从API获取数据作为备用
    const response = await orderApi.getStatistics()

    Object.assign(summaryData, {
      pendingCount: response.pendingCount,
      pendingAmount: response.pendingAmount,
      todayCount: response.todayCount,
      urgentCount: response.urgentCount
    })

    console.log('汇总数据加载成功', summaryData)
  } catch (error) {
    console.error('加载汇总数据失败:', error)
    // 如果API失败，使用本地计算
    calculateSummaryData()
  }
}

// 数据范围控制函数
const applyDataScopeControl = (orderList: any[]) => {
  const currentUser = userStore.currentUser
  if (!currentUser) {
    console.log('[数据权限] 没有当前用户，返回空列表')
    return []
  }

  console.log('[数据权限] 当前用户:', {
    id: currentUser.id,
    name: currentUser.name,
    role: currentUser.role,
    department: currentUser.department
  })

  // 超级管理员和管理员可以查看所有订单
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    console.log('[数据权限] 超管/管理员角色，可查看全部订单:', orderList.length)
    return orderList
  }

  // 部门负责人可以查看本部门所有订单
  if (currentUser.role === 'department_manager') {
    const filtered = orderList.filter(order => {
      // 使用 salesPersonId 来查找订单创建者
      const orderCreator = userStore.getUserById(order.salesPersonId || order.createdBy)
      const match = orderCreator?.department === currentUser.department
      if (match) {
        console.log('[数据权限] 部门匹配:', order.orderNumber, orderCreator?.name)
      }
      return match
    })
    console.log('[数据权限] 部门经理，可查看部门订单:', filtered.length)
    return filtered
  }

  // 销售员只能查看自己创建的订单（使用 salesPersonId 进行匹配）
  if (currentUser.role === 'sales_staff' || currentUser.role === 'employee') {
    const filtered = orderList.filter(order => {
      const match = order.salesPersonId === currentUser.id || order.createdBy === currentUser.name
      if (match) {
        console.log('[数据权限] 销售员订单匹配:', order.orderNumber, order.salesPersonId, currentUser.id)
      }
      return match
    })
    console.log('[数据权限] 销售员，可查看自己的订单:', filtered.length)
    return filtered
  }

  // 客服可以查看所有待审核的订单（用于审核）
  if (currentUser.role === 'customer_service') {
    console.log('[数据权限] 客服角色，可查看全部待审核订单:', orderList.length)
    return orderList  // 客服需要看到所有订单才能进行审核
  }

  // 其他角色默认只能查看自己创建的订单（使用 salesPersonId）
  const filtered = orderList.filter(order => order.salesPersonId === currentUser.id || order.createdBy === currentUser.name)
  console.log('[数据权限] 其他角色，可查看自己的订单:', filtered.length)
  return filtered
}

/**
 * 加载订单列表
 */
const loadOrderList = async () => {
  loading.value = true
  try {
    // 从orderStore获取订单数据，应用数据范围控制，过滤掉预留单
    const allOrders = applyDataScopeControl(orderStore.orders)

    // 过滤出需要审核的订单（排除预留单和退单）
    const ordersForAudit = allOrders.filter(order => {
      console.log(`[订单审核] 检查订单 ${order.orderNumber}`, {
        status: order.status,
        auditStatus: order.auditStatus,
        markType: order.markType,
        hasBeenAudited: order.hasBeenAudited,
        isAuditTransferred: order.isAuditTransferred
      })

      // 排除预留单
      if (order.markType === 'reserved') {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} 是预留单，跳过`)
        return false
      }

      // 排除退单 - 退单应该保留在成员系统，不流转到审核
      if (order.markType === 'return') {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} 是退单，跳过`)
        return false
      }

      // 关键条件：status 必须是 'pending_audit'（待审核状态）或 'confirmed'（已确认/待审核）
      // 兼容后端可能使用的不同状态值
      // 重要：已发货或已签收的订单不应该出现在待审核列表中
      const validAuditStatuses = ['pending_audit', 'confirmed']
      if (!validAuditStatuses.includes(order.status)) {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} 状态不是待审核状态，跳过`, {
          status: order.status
        })
        return false
      }

      // auditStatus 必须是 'pending'（未审核）
      if (order.auditStatus !== 'pending') {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} auditStatus不是pending，跳过`, {
          auditStatus: order.auditStatus
        })
        return false
      }

      // 额外检查：如果订单已经发货或已签收，不应该出现在待审核列表
      // 这可以防止数据异常导致的错误显示
      if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} 状态为${order.status}，不应该出现在待审核列表，跳过`)
        return false
      }

      // 检查订单是否已经有审核记录（已审核过的订单不应该再次出现在待审核列表）
      if (order.hasBeenAudited === true && order.auditStatus === 'approved') {
        console.log(`[订单审核] ❌ 订单 ${order.orderNumber} 已经审核通过，不应该出现在待审核列表，跳过`)
        return false
      }

      // 通过筛选的订单
      console.log(`[订单审核] ✅✅✅ 订单 ${order.orderNumber} 通过筛选`, {
        status: order.status,
        auditStatus: order.auditStatus,
        markType: order.markType || 'normal'
      })
      return true
    })

    // 按创建时间倒序排序（最新的在上面）
    ordersForAudit.sort((a, b) => {
      const timeA = new Date(a.createTime).getTime()
      const timeB = new Date(b.createTime).getTime()
      return timeB - timeA // 倒序：timeB - timeA
    })

    console.log(`[订单审核] 筛选结果：共 ${ordersForAudit.length} 个待审核订单（已按时间倒序）`)

    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 300))

    // 将真实订单数据转换为审核页面格式
    const convertedPendingOrders = ordersForAudit.map(order => ({
      id: order.id,
      orderNo: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      // 🔥 使用真实姓名而不是用户名ID - 从用户列表查找真实姓名
      salesPerson: (() => {
        // 优先使用createdByName
        if (order.createdByName) return order.createdByName
        // 从用户列表查找
        const user = userStore.users.find(u => u.id === order.createdBy || u.username === order.createdBy)
        return user?.realName || user?.name || order.createdBy || '-'
      })(),
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      codAmount: order.totalAmount - order.depositAmount,
      productCount: order.products.length,
      createTime: order.createTime,
      // 🔥 添加支付方式字段
      paymentMethod: order.paymentMethod || '',
      // 🔥 等待时间从订单流转到待审核时开始计时（使用auditTransferTime，如果没有则使用createTime），单位：分钟
      waitingMinutes: Math.floor((new Date().getTime() - new Date(order.auditTransferTime || order.createTime).getTime()) / (1000 * 60)),
      remark: order.remark || '',
      auditStatus: order.auditStatus,
      // 🔥 审核标识：使用auditStatus映射
      auditFlag: order.auditStatus || 'pending',
      hasBeenAudited: order.hasBeenAudited || false,
      deliveryAddress: order.receiverAddress,
      paymentScreenshots: (() => {
        // 优先使用多张截图数组
        if (order.depositScreenshots && order.depositScreenshots.length > 0) {
          return order.depositScreenshots.map((url: string, index: number) => ({
            id: index + 1,
            url: url,
            name: `定金截图${index + 1}.jpg`
          }))
        }
        // 兼容单张截图
        if (order.depositScreenshot) {
          return [{ id: 1, url: order.depositScreenshot, name: '定金截图.jpg' }]
        }
        return []
      })(),
      depositScreenshots: order.depositScreenshots || (order.depositScreenshot ? [order.depositScreenshot] : []),
      auditHistory: [
        {
          id: 1,
          action: 'created',
          actionName: '订单创建',
          operator: order.customerName,
          operatorRole: '客户',
          time: order.createTime,
          remark: '客户下单'
        },
        {
          id: 2,
          action: 'submitted',
          actionName: '提交审核',
          operator: order.createdBy,
          operatorRole: '销售员',
          time: order.createTime,
          remark: '销售员提交订单审核'
        }
      ]
    }))

    // 模拟待审核订单数据（保留一些示例数据用于演示）
    const mockPendingOrders = [
      {
        id: '1',
        orderNo: 'ORD202401150001',
        customerName: '张三',
        customerPhone: '13812345678',
        salesPerson: '李销售',
        totalAmount: 2999,
        depositAmount: 500,
        codAmount: 2499,
        productCount: 2,
        createTime: '2024-01-15 09:30:00',
        waitingHours: 6,
        remark: '客户要求尽快发货',
        auditStatus: 'pending',
        deliveryAddress: '北京市朝阳区建国路88号SOHO现代城A座1201室',
        paymentScreenshots: [
          { id: 1, url: '/api/uploads/payment1.jpg', name: '支付宝转账截图.jpg' },
          { id: 2, url: '/api/uploads/payment2.jpg', name: '微信支付截图.jpg' }
        ],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '张三',
            operatorRole: '客户',
            time: '2024-01-15 14:30:00',
            remark: '客户下单'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '王销售',
            operatorRole: '销售员',
            time: '2024-01-15 14:35:00',
            remark: '销售员提交订单审核'
          }
        ]
      },
      {
        id: '2',
        orderNo: 'ORD202401150002',
        customerName: '李四',
        customerPhone: '13987654321',
        salesPerson: '王销售',
        totalAmount: 1599,
        depositAmount: 300,
        codAmount: 1299,
        productCount: 1,
        createTime: '2024-01-15 10:15:00',
        waitingHours: 5,
        remark: '',
        auditStatus: 'pending',
        deliveryAddress: '上海市浦东新区陆家嘴环路1000号恒生银行大厦50楼',
        paymentScreenshots: [
          { id: 3, url: '/api/uploads/payment3.jpg', name: '微信支付截图.jpg' }
        ],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '李四',
            operatorRole: '客户',
            time: '2024-01-15 10:15:00',
            remark: '客户下单'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '王销售',
            operatorRole: '销售员',
            time: '2024-01-15 10:20:00',
            remark: '销售员提交订单审核'
          }
        ]
      },
      {
        id: '3',
        orderNo: 'ORD202401140015',
        customerName: '王五',
        customerPhone: '15555666777',
        salesPerson: '张销售',
        totalAmount: 4299,
        depositAmount: 1000,
        codAmount: 3299,
        productCount: 3,
        createTime: '2024-01-14 16:20:00',
        waitingHours: 25,
        remark: '大客户订单，优先处理',
        auditStatus: 'pending',
        deliveryAddress: '广州市天河区珠江新城花城大道85号高德置地广场A座2801室',
        paymentScreenshots: [
          { id: 4, url: '/api/uploads/payment4.jpg', name: '银行转账截图.jpg' },
          { id: 5, url: '/api/uploads/payment5.jpg', name: '支付宝截图.jpg' }
        ],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '王五',
            operatorRole: '客户',
            time: '2024-01-14 16:20:00',
            remark: '客户下单'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '张销售',
            operatorRole: '销售员',
            time: '2024-01-14 16:25:00',
            remark: '大客户订单，优先处理'
          }
        ]
      }
    ]

    // 模拟已审核通过订单数据
    const mockApprovedOrders = [
      {
        id: '4',
        orderNo: 'ORD202401140008',
        customerName: '赵六',
        customerPhone: '18888999000',
        salesPerson: '李销售',
        totalAmount: 899,
        depositAmount: 200,
        codAmount: 699,
        productCount: 1,
        createTime: '2024-01-14 11:45:00',
        remark: '',
        auditStatus: 'approved',
        auditFlag: 'approved',
        auditTime: '2024-01-14 14:30:00',
        auditor: '审核员A',
        auditRemark: '订单信息完整，审核通过',
        deliveryAddress: '深圳市南山区科技园南区深南大道9988号',
        paymentScreenshots: [
          { id: 6, url: '/api/uploads/payment6.jpg', name: '定金支付截图.jpg' }
        ],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '赵六',
            operatorRole: '客户',
            time: '2024-01-14 11:45:00',
            remark: '客户下单'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '李销售',
            operatorRole: '销售员',
            time: '2024-01-14 11:50:00',
            remark: '销售员提交订单审核'
          },
          {
            id: 3,
            action: 'approved',
            actionName: '审核通过',
            operator: '审核员A',
            operatorRole: '审核员',
            time: '2024-01-14 14:30:00',
            remark: '订单信息完整，审核通过'
          }
        ]
      },
      {
        id: '5',
        orderNo: 'ORD202401130022',
        customerName: '钱七',
        customerPhone: '17777888999',
        salesPerson: '王销售',
        totalAmount: 6599,
        depositAmount: 1500,
        codAmount: 5099,
        productCount: 4,
        createTime: '2024-01-13 14:30:00',
        remark: 'VIP客户，需要特殊包装',
        auditStatus: 'approved',
        auditFlag: 'approved',
        auditTime: '2024-01-13 16:45:00',
        auditor: '审核员B',
        auditRemark: 'VIP客户订单，优先处理',
        deliveryAddress: '杭州市西湖区文三路259号昌地火炬大厦1号楼17层',
        paymentScreenshots: [
          { id: 7, url: '/api/uploads/payment7.jpg', name: 'VIP客户转账截图.jpg' },
          { id: 8, url: '/api/uploads/payment8.jpg', name: '银行回单.jpg' }
        ],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '钱七',
            operatorRole: '客户',
            time: '2024-01-13 14:30:00',
            remark: 'VIP客户，需要特殊包装'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '王销售',
            operatorRole: '销售员',
            time: '2024-01-13 14:35:00',
            remark: 'VIP客户订单，优先处理'
          },
          {
            id: 3,
            action: 'approved',
            actionName: '审核通过',
            operator: '审核员B',
            operatorRole: '审核员',
            time: '2024-01-13 16:45:00',
            remark: 'VIP客户订单，优先处理'
          }
        ]
      }
    ]

    // 模拟审核拒绝订单数据
    const mockRejectedOrders = [
      {
        id: '6',
        orderNo: 'ORD202401120005',
        customerName: '孙八',
        customerPhone: '16666555444',
        salesPerson: '李销售',
        totalAmount: 1299,
        depositAmount: 0,
        codAmount: 1299,
        productCount: 1,
        createTime: '2024-01-12 15:20:00',
        remark: '',
        auditStatus: 'rejected',
        auditFlag: 'rejected',
        auditTime: '2024-01-12 17:30:00',
        auditor: '审核员A',
        auditRemark: '客户信息不完整，需要补充联系地址',
        deliveryAddress: '成都市高新区天府大道中段1388号美年广场C座',
        paymentScreenshots: [],
        auditHistory: [
          {
            id: 1,
            action: 'created',
            actionName: '订单创建',
            operator: '孙八',
            operatorRole: '客户',
            time: '2024-01-12 15:20:00',
            remark: '客户下单'
          },
          {
            id: 2,
            action: 'submitted',
            actionName: '提交审核',
            operator: '李销售',
            operatorRole: '销售员',
            time: '2024-01-12 15:25:00',
            remark: '销售员提交订单审核'
          },
          {
            id: 3,
            action: 'rejected',
            actionName: '审核拒绝',
            operator: '审核员A',
            operatorRole: '审核员',
            time: '2024-01-12 17:30:00',
            remark: '客户信息不完整，需要补充联系地址'
          }
        ]
      }
    ]

    // 设置订单数据 - 只使用真实数据，不使用模拟数据
    console.log(`[订单审核] 转换后的真实订单数量: ${convertedPendingOrders.length}`)
    pendingOrders.value = convertedPendingOrders

    // 从真实数据中筛选已审核通过和拒绝的订单
    const allOrdersWithAudit = applyDataScopeControl(orderStore.orders)

    console.log('[订单审核] 开始筛选已审核订单，总订单数:', allOrdersWithAudit.length)

    approvedOrders.value = allOrdersWithAudit
      .filter(order => {
        const match = order.auditStatus === 'approved' && order.markType !== 'reserved' && order.markType !== 'return'
        if (match) {
          console.log('[订单审核] ✅ 审核通过订单:', order.orderNumber, order.auditStatus)
        }
        return match
      })
      .map(order => ({
        id: order.id,
        orderNo: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        // 🔥 使用真实姓名 - 从用户列表查找
        salesPerson: (() => {
          if (order.createdByName) return order.createdByName
          const user = userStore.users.find(u => u.id === order.createdBy || u.username === order.createdBy)
          return user?.realName || user?.name || order.createdBy || '-'
        })(),
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        codAmount: order.totalAmount - order.depositAmount,
        productCount: order.products.length,
        createTime: order.createTime,
        // 🔥 添加支付方式字段
        paymentMethod: order.paymentMethod || '',
        auditStatus: order.auditStatus,
        // 🔥 审核标识：已审核通过
        auditFlag: 'approved',
        auditTime: order.auditTime || order.updateTime,
        auditor: order.auditor || '系统',
        auditRemark: order.auditRemark || '',
        deliveryAddress: order.receiverAddress,
        paymentScreenshots: (() => {
          if (order.depositScreenshots && order.depositScreenshots.length > 0) {
            return order.depositScreenshots.map((url: string, index: number) => ({
              id: index + 1, url, name: `定金截图${index + 1}.jpg`
            }))
          }
          return order.depositScreenshot ? [{ id: 1, url: order.depositScreenshot, name: '定金截图.jpg' }] : []
        })(),
        depositScreenshots: order.depositScreenshots || (order.depositScreenshot ? [order.depositScreenshot] : [])
      }))

    rejectedOrders.value = allOrdersWithAudit
      .filter(order => {
        const match = order.auditStatus === 'rejected' && order.markType !== 'reserved' && order.markType !== 'return'
        if (match) {
          console.log('[订单审核] ❌ 审核拒绝订单:', order.orderNumber, order.auditStatus, order.status)
        }
        return match
      })
      .map(order => ({
        id: order.id,
        orderNo: order.orderNumber,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        // 🔥 使用真实姓名 - 从用户列表查找
        salesPerson: (() => {
          if (order.createdByName) return order.createdByName
          const user = userStore.users.find(u => u.id === order.createdBy || u.username === order.createdBy)
          return user?.realName || user?.name || order.createdBy || '-'
        })(),
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        codAmount: order.totalAmount - order.depositAmount,
        productCount: order.products.length,
        createTime: order.createTime,
        // 🔥 添加支付方式字段
        paymentMethod: order.paymentMethod || '',
        auditStatus: order.auditStatus,
        // 🔥 审核标识：审核拒绝
        auditFlag: 'rejected',
        auditTime: order.auditTime || order.updateTime,
        auditor: order.auditor || '系统',
        auditRemark: order.auditRemark || order.rejectReason || '',
        deliveryAddress: order.receiverAddress,
        paymentScreenshots: (() => {
          if (order.depositScreenshots && order.depositScreenshots.length > 0) {
            return order.depositScreenshots.map((url: string, index: number) => ({
              id: index + 1, url, name: `定金截图${index + 1}.jpg`
            }))
          }
          return order.depositScreenshot ? [{ id: 1, url: order.depositScreenshot, name: '定金截图.jpg' }] : []
        })(),
        depositScreenshots: order.depositScreenshots || (order.depositScreenshot ? [order.depositScreenshot] : [])
      }))

    console.log(`[订单审核] 最终数据统计：待审核=${pendingOrders.value.length}, 已通过=${approvedOrders.value.length}, 已拒绝=${rejectedOrders.value.length}`)

    // 更新标签计数
    updateTabCounts()

    // 更新汇总数据
    calculateSummaryData()

    pagination.total = orderList.value?.length || 0
  } catch (error) {
    console.error('加载订单列表失败:', error)
    ElMessage.error('加载订单列表失败')
    // 确保在错误情况下数组仍然是有效的空数组
    pendingOrders.value = []
    approvedOrders.value = []
    rejectedOrders.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 订单事件处理函数
const handleOrderTransferredAudit = (transferredOrders: any[]) => {
  console.log('[订单审核] 收到订单流转事件:', transferredOrders)
  loadOrderList()
  ElMessage.info(`${transferredOrders.length} 个订单已流转到审核列表`)
}

const handleRefreshAuditList = () => {
  console.log('[订单审核] 收到刷新审核列表事件')
  loadOrderList()
}

const handleOrderStatusChangedAudit = (order: any) => {
  console.log('[订单审核] 订单状态变更:', order)
  loadOrderList()
}

// 生命周期
onMounted(async () => {
  // 加载用户列表（用于销售人员筛选）
  await userStore.loadUsers()

  // 🔥 先从API加载订单数据，确保数据是最新的
  try {
    console.log('[订单审核] 正在从API加载订单数据...')
    await orderStore.loadOrdersFromAPI()
    console.log('[订单审核] API数据加载完成，订单总数:', orderStore.orders.length)
  } catch (error) {
    console.error('[订单审核] 从API加载订单失败:', error)
  }

  // 设置默认显示全部订单
  handleQuickFilter('all')
  // 加载汇总数据
  loadSummaryData()

  // 监听订单事件总线 - 实现订单状态同步
  eventBus.on(EventNames.ORDER_TRANSFERRED, handleOrderTransferredAudit)
  eventBus.on(EventNames.REFRESH_AUDIT_LIST, handleRefreshAuditList)
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChangedAudit)
})

onUnmounted(() => {
  // 清理订单事件总线监听
  eventBus.off(EventNames.ORDER_TRANSFERRED, handleOrderTransferredAudit)
  eventBus.off(EventNames.REFRESH_AUDIT_LIST, handleRefreshAuditList)
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChangedAudit)
})
</script>

<style scoped>
.order-audit {
  padding: 20px;
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

.summary-cards {
  margin-bottom: 20px;
}

.summary-card {
  height: 100px;
}

.summary-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.summary-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.summary-icon.pending {
  background: linear-gradient(135deg, #e6a23c, #f0a020);
}

.summary-icon.amount {
  background: linear-gradient(135deg, #67c23a, #85ce61);
}

.summary-icon.today {
  background: linear-gradient(135deg, #409eff, #66b1ff);
}

.summary-icon.urgent {
  background: linear-gradient(135deg, #f56c6c, #f78989);
}

.summary-info {
  flex: 1;
}

.summary-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.summary-label {
  font-size: 14px;
  color: #909399;
}

.quick-filter-card {
  margin-bottom: 16px;
}

.quick-filter-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.filter-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-buttons .el-button {
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 13px;
  transition: all 0.3s ease;
}

.filter-buttons .el-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.filter-buttons .el-button.is-type-primary {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.search-card {
  margin-bottom: 20px;
}

/* 表格头部布局样式 */
:deep(.el-card__header) {
  padding: 16px 20px;
}

:deep(.header-actions) {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 16px;
}

.header-tabs {
  flex: 0 0 auto;
}

.header-spacer {
  flex: 1;
}

.header-actions-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  height: 32px;
}

.header-actions-right :deep(.el-button) {
  height: 32px;
}

.header-actions-right :deep(.el-checkbox) {
  height: 32px;
  display: flex;
  align-items: center;
}

.header-actions-right .total-info {
  height: 32px;
  display: flex;
  align-items: center;
  line-height: 32px;
}

/* 标签页样式优化 - 移除下边框并确保等高对齐 */
:deep(.audit-tabs) {
  margin-bottom: 0;
  height: 32px;
  display: flex;
  align-items: center;
}

:deep(.audit-tabs .el-tabs__header) {
  margin-bottom: 0;
  border-bottom: none !important;
  height: 32px;
  display: flex;
  align-items: center;
}

:deep(.audit-tabs .el-tabs__nav-wrap::after) {
  display: none !important;
}

:deep(.audit-tabs .el-tabs__active-bar) {
  display: none !important;
}

:deep(.audit-tabs .el-tabs__nav-wrap) {
  padding: 0;
  height: 32px;
  display: flex;
  align-items: center;
}

:deep(.audit-tabs .el-tabs__nav) {
  height: 32px;
  display: flex;
  align-items: center;
}

:deep(.audit-tabs .el-tabs__item) {
  height: 32px;
  line-height: 32px;
  padding: 0 16px;
  border: none !important;
  background: none !important;
}

:deep(.audit-tabs .el-tabs__content) {
  display: none;
}

:deep(.audit-tabs .el-tabs__nav-wrap) {
  margin-bottom: 0;
}

:deep(.audit-tabs .el-tabs__content) {
  display: none;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.tab-label .el-icon {
  font-size: 16px;
}

/* 表格卡片容器样式 */
.table-card-container {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

:deep(.table-card-container .el-card__body) {
  padding: 0;
}

:deep(.table-card-container .el-table) {
  border: none;
}

:deep(.table-card-container .el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.table-card-container .el-table td) {
  border-bottom: 1px solid #f5f7fa;
}

:deep(.table-card-container .el-table tr:last-child td) {
  border-bottom: none;
}

.table-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.total-info {
  color: #909399;
  font-size: 14px;
}

.amount {
  font-weight: bold;
  color: #f56c6c;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.batch-orders {
  max-height: 120px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px;
}

.order-tag {
  margin: 4px 8px 4px 0;
}

.dialog-footer {
  text-align: right;
}

.tab-badge {
  margin-left: 8px;
}

.count-text {
  margin-left: 8px;
  background: #909399;
  color: white;
  border-radius: 10px;
  padding: 0 6px;
  font-size: 12px;
  line-height: 18px;
  min-width: 18px;
  text-align: center;
  display: inline-block;
}

/* 金额样式 */
.deposit-amount {
  color: #67c23a;
  font-weight: bold;
}

.cod-amount {
  color: #f56c6c;
  font-weight: bold;
}

/* 支付截图样式 */
.screenshot-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.screenshot-item {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
}

.screenshot-item:hover {
  border-color: #409eff;
  transform: scale(1.05);
}

.screenshot-thumbnail {
  width: 100%;
  height: 100%;
}

.screenshot-name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.screenshot-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.screenshot-item:hover .screenshot-overlay {
  opacity: 1;
}

.view-icon {
  color: white;
  font-size: 24px;
}

.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
  font-size: 12px;
}

/* 图片查看器样式 */
.image-viewer-dialog .el-dialog__body {
  padding: 0;
}

.image-viewer-container {
  position: relative;
  height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
}

.image-error-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #c0c4cc;
}

.image-error-large p {
  margin-top: 12px;
  font-size: 16px;
}

.image-navigation {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 16px;
  border-radius: 20px;
}

.nav-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.nav-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
}

.image-counter {
  color: white;
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}

/* 审核轨迹样式 */
.audit-history-card {
  margin-top: 16px;
}

.audit-history-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.collapse-icon {
  transition: transform 0.3s ease;
}

.collapse-icon.collapsed {
  transform: rotate(90deg);
}

/* 紧凑版时间轴样式 */
.timeline-content-compact {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #e4e7ed;
}

.timeline-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.timeline-header-compact .action-name {
  font-weight: 600;
  font-size: 13px;
  color: #303133;
}

.timeline-body-compact {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #606266;
}

.timeline-body-compact .operator {
  font-weight: 500;
  color: #409eff;
}

.timeline-body-compact .remark {
  color: #909399;
  font-style: italic;
  flex: 1;
}

/* 根据操作类型调整边框颜色 */
.timeline-content-compact[data-action="created"] {
  border-left-color: #409eff;
}

.timeline-content-compact[data-action="submitted"] {
  border-left-color: #e6a23c;
}

.timeline-content-compact[data-action="approved"] {
  border-left-color: #67c23a;
}

.timeline-content-compact[data-action="rejected"] {
  border-left-color: #f56c6c;
}

/* 订单详情弹窗样式优化 */
.order-detail-content {
  max-height: 70vh;
  overflow-y: auto;
}

.order-info-card {
  margin-bottom: 16px;
}

.order-info-card .el-card__body {
  padding: 24px;
}

/* info-item 样式优化 */
.info-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.info-item .label {
  min-width: 100px;
  font-weight: 600;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin-right: 12px;
  flex-shrink: 0;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-all;
  flex: 1;
}

.info-item .value.amount {
  font-weight: 600;
  color: #e6a23c;
  font-size: 16px;
}

.info-item .value.deposit-amount {
  font-weight: 600;
  color: #67c23a;
}

.info-item .value.cod-amount {
  font-weight: 600;
  color: #409eff;
}

.info-item .value.normal {
  color: #67c23a;
}

.info-item .value.warning {
  color: #e6a23c;
}

.info-item .value.danger {
  color: #f56c6c;
}

/* 审核操作卡片样式优化 */
.audit-action-card {
  margin-bottom: 16px;
}

.audit-action-card .el-card__body {
  padding: 24px;
}

.audit-action-card .el-form-item {
  margin-bottom: 20px;
}

.audit-action-card .el-radio {
  margin-right: 24px;
  margin-bottom: 12px;
  padding: 8px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.audit-action-card .el-radio:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.audit-action-card .el-radio.is-checked {
  border-color: #409eff;
  background-color: #e6f7ff;
}

.audit-action-card .el-radio__label {
  font-size: 14px;
  font-weight: 500;
  margin-left: 8px;
}

/* 支付截图样式优化 */
.screenshot-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.screenshot-item {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
}

.screenshot-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}

/* 审核轨迹样式优化 */
.audit-history-card .el-card__body {
  padding: 16px 24px;
}

.timeline-content-compact {
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #e4e7ed;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.timeline-content-compact:hover {
  background: #f5f7fa;
  transform: translateX(2px);
}

.timeline-header-compact {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-header-compact .action-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.timeline-body-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.timeline-body-compact .operator {
  font-weight: 500;
  color: #409eff;
}

.timeline-body-compact .remark {
  color: #909399;
  font-style: italic;
  line-height: 1.4;
  padding: 4px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  margin-top: 4px;
}

/* 拒绝原因选择区域样式 */
.rejection-reason-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rejection-reason-section .el-select {
  flex: 1;
  min-width: 200px;
}

.rejection-reason-section .el-select .el-input__inner {
  font-weight: normal;
  font-size: 14px;
}

.rejection-reason-section .el-select .el-select-dropdown__item {
  font-weight: normal;
  font-size: 14px;
  line-height: 1.5;
  white-space: normal;
  word-wrap: break-word;
  padding: 8px 12px;
  min-height: auto;
}

.rejection-reason-section .el-select .el-select-dropdown {
  min-width: 300px;
}

/* 弹窗底部按钮样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 0 0 0;
}

.dialog-footer .el-button {
  min-width: 80px;
  padding: 10px 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-audit {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .summary-cards .el-col {
    margin-bottom: 12px;
  }

  .search-card .el-form {
    flex-direction: column;
  }

  .search-card .el-form-item {
    margin-right: 0;
    margin-bottom: 12px;
  }

  /* 弹窗响应式 */
  .order-detail-content {
    max-height: 60vh;
  }

  .info-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .info-item .label {
    min-width: auto;
    margin-bottom: 4px;
    margin-right: 0;
  }

  .screenshot-item {
    width: 100px;
    height: 75px;
  }

  .audit-action-card .el-radio {
    margin-right: 12px;
    margin-bottom: 8px;
  }
}
</style>
