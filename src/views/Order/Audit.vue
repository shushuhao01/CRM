<!-- eslint-disable vue/multi-word-component-names -->
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
        :page-sizes="[10, 20, 50, 100, 200, 500, 1000, 2000, 5000]"
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

      <template #column-customerPhone="{ row }">
        {{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
      </template>

      <template #column-totalAmount="{ row }">
        <span class="amount">¥{{ (row.totalAmount || 0).toLocaleString() }}</span>
      </template>

      <template #column-depositAmount="{ row }">
        <span class="deposit-amount">¥{{ (row.depositAmount || 0).toLocaleString() }}</span>
      </template>

      <template #column-paymentScreenshots="{ row }">
        <div class="payment-screenshots-cell">
          <template v-if="row.paymentScreenshots && row.paymentScreenshots.length > 0">
            <el-image
              :src="row.paymentScreenshots[0].url"
              fit="cover"
              class="screenshot-thumbnail-small"
              :preview-src-list="row.paymentScreenshots.map((s: PaymentScreenshot) => s.url)"
              :initial-index="0"
              preview-teleported
            >
              <template #error>
                <div class="image-error-small">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
            <span v-if="row.paymentScreenshots.length > 1" class="screenshot-count">
              +{{ row.paymentScreenshots.length - 1 }}
            </span>
          </template>
          <span v-else class="no-screenshot">无</span>
        </div>
      </template>

      <template #column-auditStatus="{ row }">
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

      <!-- 订单备注列 -->
      <template #column-remark="{ row }">
        <el-tooltip
          :content="row.remark || '无备注'"
          placement="top"
          :disabled="!row.remark || row.remark.length <= 20"
        >
          <span class="text-overflow">{{ row.remark || '-' }}</span>
        </el-tooltip>
      </template>

      <!-- 产品列 -->
      <template #column-products="{ row }">
        <el-tooltip
          placement="top"
          :disabled="!row.products || row.products.length === 0"
        >
          <template #content>
            <div class="products-tooltip">
              <div
                v-for="(product, index) in row.products"
                :key="product.id"
                class="product-item-tooltip"
              >
                <div class="product-name-tooltip">{{ index + 1 }}. {{ product.name }}</div>
                <div class="product-detail-tooltip">
                  <span v-if="product.sku">SKU: {{ product.sku }}</span>
                  <span>数量: {{ product.quantity }}</span>
                  <span>单价: ¥{{ (product.price || 0).toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </template>
          <span class="text-overflow products-text">
            <template v-if="row.products && row.products.length > 0">
              <template v-for="(p, idx) in row.products" :key="idx">
                <span v-if="idx > 0">、</span>
                <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 2px;">虚拟</el-tag>
                <el-tag v-else size="small" effect="light" style="margin-right: 2px;">实物</el-tag>
                {{ p.name }}×{{ p.quantity }}
              </template>
            </template>
            <template v-else>-</template>
          </span>
        </el-tooltip>
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
          <el-tooltip
            v-if="canRevokeOrder(row)"
            content="撤销审核"
            placement="top"
          >
            <el-button
              @click="handleReAudit(row, 'rejected')"
              type="danger"
              link
              size="small"
              :icon="Close"
            >
              撤销
            </el-button>
          </el-tooltip>
          <el-tooltip
            v-else
            content="订单已发货，无法撤销审核"
            placement="top"
          >
            <el-button
              type="info"
              link
              size="small"
              :icon="Close"
              disabled
            >
              撤销
            </el-button>
          </el-tooltip>
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
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
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
  ArrowRight
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useRejectionReasonStore } from '@/stores/rejectionReason'
import axios from 'axios'
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
  products?: Array<{     // 商品列表
    id: string
    name: string
    sku?: string
    price: number
    quantity: number
    image?: string
  }>
  createTime: string
  waitingHours?: number
  remark: string
  auditStatus: 'pending' | 'approved' | 'rejected'
  status?: string         // 订单实际状态（shipped, delivered等）
  auditTime?: string
  auditor?: string
  auditRemark?: string
  deliveryAddress: string
  paymentMethod?: string  // 支付方式
  paymentScreenshots: PaymentScreenshot[]
  depositScreenshots?: string[]  // 定金截图
  auditHistory: AuditHistory[]
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
const orderStore = useOrderStore()
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
const badgeClicked = reactive<Record<string, boolean>>({
  pending: false
})

// 订单数据
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
      name: (u as any).realName || u.name || (u as any).username,
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
  dateRange: [] as (Date | string)[]
})

// 快捷筛选
const activeQuickFilter = ref('today')
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
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

// 🔥 分页后的订单列表 - API已经返回分页数据，直接使用
const paginatedOrderList = computed(() => {
  // API已经返回分页后的数据，不需要再次分页
  return orderList.value
})

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'orderNo',
    label: '订单号',
    width: 165,
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 85,
    visible: true
  },
  {
    prop: 'customerPhone',
    label: '客户电话',
    width: 120,
    visible: true
  },
  {
    prop: 'salesPerson',
    label: '销售人员',
    width: 90,
    visible: true
  },
  {
    prop: 'totalAmount',
    label: '订单金额',
    width: 95,
    align: 'right',
    visible: true
  },
  {
    prop: 'depositAmount',
    label: '定金',
    width: 85,
    align: 'right',
    visible: true
  },
  {
    prop: 'paymentScreenshots',
    label: '支付截图',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'productCount',
    label: '商品数量',
    width: 90,
    align: 'center',
    visible: true
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 150,
    visible: true,
    formatter: (value: unknown) => formatDateTime(value as string)
  },
  {
    prop: 'auditStatus',
    label: '审核状态',
    width: 100,
    align: 'center',
    visible: activeTab.value !== 'pending'
  },
  {
    prop: 'auditFlag',
    label: '审核标识',
    width: 90,
    align: 'center',
    visible: activeTab.value === 'pending'
  },
  {
    prop: 'auditTime',
    label: '审核时间',
    width: 150,
    visible: activeTab.value !== 'pending',
    formatter: (value: unknown) => formatDateTime(value as string)
  },
  {
    prop: 'auditor',
    label: '审核人',
    width: 90,
    visible: activeTab.value !== 'pending'
  },
  {
    prop: 'remark',
    label: '订单备注',
    width: 100,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'products',
    label: '产品',
    minWidth: 180,
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
 * 处理标签切换
 */
const handleTabChange = async (tabName: string) => {
  activeTab.value = tabName
  selectedOrders.value = []
  selectAll.value = false
  pagination.page = 1

  // 🔥 优化：切换标签时重新加载对应状态的订单
  console.log(`[订单审核] 切换到标签: ${tabName}`)
  await loadOrderList()
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
const handleSelectionChange = (selection: Record<string, unknown>[]) => {
  selectedOrders.value = selection as unknown as AuditOrder[]
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
const handleBatchAudit = (result: 'approved' | 'rejected') => {
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
 * 判断订单是否可以撤销审核
 * 规则：只有未发货的订单才能撤销（pending_shipment状态）
 */
const canRevokeOrder = (row: AuditOrder): boolean => {
  // 如果没有status字段，默认允许撤销（兼容旧数据）
  if (!row.status) {
    return true
  }

  // 只有待发货状态才能撤销，已发货及之后的状态都不能撤销
  // pending_shipment: 待发货（可撤销）
  // shipped: 已发货（不可撤销）
  // delivered: 已签收（不可撤销）
  // completed: 已完成（不可撤销）
  // 其他状态也不可撤销
  return row.status === 'pending_shipment'
}

/**
 * 重新审核（撤销或重新通过）
 */
const handleReAudit = (row: AuditOrder, result: 'approved' | 'rejected') => {
  const actionText = result === 'approved' ? '重新通过' : '撤销'

  // 🔥 如果是撤销操作，检查订单状态
  if (result === 'rejected' && !canRevokeOrder(row)) {
    ElMessage.warning('订单已发货，无法撤销审核')
    return
  }

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
      row.auditor = userStore.currentUser?.name || '当前用户'

      // 添加到目标列表
      if (result === 'approved') {
        approvedOrders.value.unshift(row)
      } else {
        rejectedOrders.value.unshift(row)
      }

      // 更新标签计数
      updateTabCounts()

      ElMessage.success(`订单${actionText}成功`)
    } catch (_error) {
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
        const ordersToUpdate = isBatchAudit.value ? selectedOrders.value : [currentOrder.value]
        const action = auditForm.result === 'approved' ? '通过' : '拒绝'
        const isApproved = auditForm.result === 'approved'
        const rejectionReason = auditForm.rejectionReasonId
          ? (rejectionReasonStore.getReasonById(auditForm.rejectionReasonId)?.name || auditForm.remark || '')
          : (auditForm.remark || '')

        // 🔥 修复：使用 for...of 循环并 await 每个异步操作
        for (const order of ordersToUpdate) {
          try {
            // 🔥 调用后端API审核订单（这会触发后端发送通知）
            await orderStore.auditOrder(order.id, isApproved, isApproved ? (auditForm.remark || '') : rejectionReason)
            console.log(`[订单审核] ✅ 订单 ${order.orderNo} 审核${action}成功`)

            // 从待审核列表移除
            const pendingIndex = pendingOrders.value.findIndex(item => item.id === order.id)
            if (pendingIndex > -1) {
              pendingOrders.value.splice(pendingIndex, 1)
            }

            // 更新订单状态和审核信息（用于页面显示）
            order.auditStatus = auditForm.result as 'pending' | 'approved' | 'rejected'
            order.auditTime = new Date().toLocaleString()
            order.auditor = userStore.currentUser?.name || '当前用户'
            order.auditRemark = auditForm.remark

            // 添加到对应的列表
            if (isApproved) {
              approvedOrders.value.unshift(order)
            } else {
              rejectedOrders.value.unshift(order)
            }
          } catch (orderError) {
            console.error(`[订单审核] ❌ 订单 ${order.orderNo} 审核失败:`, orderError)
            ElMessage.error(`订单 ${order.orderNo} 审核失败`)
          }
        }

        // 更新汇总数据
        calculateSummaryData()

        // 更新标签计数
        updateTabCounts()

        // 清空选择
        selectedOrders.value = []
        selectAll.value = false

        ElMessage.success(`成功${action}${ordersToUpdate.length}个订单`)

        // 🔥 注意：通知已由后端API自动发送，无需前端重复发送

        auditDialogVisible.value = false

        // 重置表单
        auditForm.result = null
        auditForm.remark = ''
        auditForm.rejectionReasonId = ''
      } catch (_error) {
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
      } catch (_error) {
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
  currentOrder.value = {} as AuditOrder
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
        const order = currentOrder.value
        const result = quickAuditForm.result
        const isApproved = result === 'approved'
        const rejectionReason = quickAuditForm.rejectionReason || quickAuditForm.remark || ''

        // 🔥 调用后端API审核订单（这会触发后端发送通知）
        await orderStore.auditOrder(order.id, isApproved, isApproved ? (quickAuditForm.remark || '') : rejectionReason)
        console.log(`[快速审核] ✅ 订单 ${order.orderNo} 审核${isApproved ? '通过' : '拒绝'}成功`)

        // 更新订单状态（用于页面显示）
        if (result) {
          order.auditStatus = result
        }
        order.auditTime = new Date().toLocaleString()
        order.auditor = userStore.currentUser?.name || '当前用户'
        order.auditRemark = quickAuditForm.remark

        // 添加审核历史记录
        if (!order.auditHistory) {
          order.auditHistory = []
        }
        order.auditHistory.push({
          id: order.auditHistory.length + 1,
          action: result || 'pending',
          actionName: isApproved ? '审核通过' : '审核拒绝',
          operator: userStore.currentUser?.name || '当前用户',
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
        if (isApproved) {
          approvedOrders.value.unshift(order)
        } else {
          rejectedOrders.value.unshift(order)
        }

        // 更新汇总数据
        calculateSummaryData()

        // 更新标签计数
        updateTabCounts()

        // 🔥 注意：通知已由后端API自动发送，无需前端重复发送

        ElMessage.success(`订单${isApproved ? '审核通过' : '审核拒绝'}`)
        handleOrderDetailDialogClose()
      } catch (_error) {
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
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      searchForm.dateRange = [lastMonthStart, lastMonthEnd]
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
const handleRefresh = async () => {
  selectedOrders.value = []
  selectAll.value = false
  try {
    await Promise.all([loadOrderList(), loadSummaryData()])
    ElMessage.success('数据已刷新')
  } catch (error) {
    console.error('[订单审核] 刷新失败:', error)
    ElMessage.error('刷新失败，请稍后重试')
  }
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
const handleRejectionReasonChange = (_reasonId: string) => {
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
 * 🔥 优化版：加载汇总数据
 */
const loadSummaryData = async () => {
  try {
    // 🔥 使用优化的审核统计API
    const response = await orderApi.getAuditStatistics()

    if (response.success && response.data) {
      Object.assign(summaryData, {
        pendingCount: response.data.pendingCount || 0,
        pendingAmount: response.data.pendingAmount || 0,
        todayCount: response.data.todayCount || 0,
        urgentCount: response.data.urgentCount || 0
      })

      // 🔥 同时更新标签计数
      tabCounts.pending = response.data.pendingCount || 0
      tabCounts.approved = response.data.approvedCount || 0
      tabCounts.rejected = response.data.rejectedCount || 0
    }

    console.log('[订单审核] 汇总数据加载成功', summaryData)
  } catch (error) {
    console.error('[订单审核] 加载汇总数据失败:', error)
    // 如果API失败，使用本地计算
    calculateSummaryData()
  }
}

/**
 * 🔥 优化版：直接从API加载审核订单列表
 */
const loadOrderList = async () => {
  loading.value = true
  const startTime = Date.now()

  try {
    // 🔥 使用优化的审核列表API，根据当前标签页加载对应状态的订单
    const statusMap: Record<string, string> = {
      'pending': 'pending_audit',
      'approved': 'approved',
      'rejected': 'rejected'
    }

    const currentStatus = statusMap[activeTab.value] || 'pending_audit'

    console.log(`[订单审核] 🚀 使用优化API加载订单, 状态: ${currentStatus}, 页码: ${pagination.page}`)

    // 🔥 直接调用优化的审核列表API
    const startDateStr = searchForm.dateRange?.[0]
      ? (searchForm.dateRange[0] instanceof Date ? searchForm.dateRange[0].toISOString().split('T')[0] : searchForm.dateRange[0])
      : undefined
    const endDateStr = searchForm.dateRange?.[1]
      ? (searchForm.dateRange[1] instanceof Date ? searchForm.dateRange[1].toISOString().split('T')[0] : searchForm.dateRange[1])
      : undefined

    const response = await orderApi.getAuditList({
      status: currentStatus,
      page: pagination.page,
      pageSize: pagination.size,
      orderNumber: searchForm.orderNo || undefined,
      customerName: searchForm.customerName || undefined,
      startDate: startDateStr,
      endDate: endDateStr
    })

    const loadTime = Date.now() - startTime
    console.log(`[订单审核] ✅ API响应完成, 耗时: ${loadTime}ms, 数据量: ${response.data?.list?.length || 0}`)

    if (response.success && response.data) {
      const { list, total } = response.data

      // 🔥 转换数据格式
      const convertedOrders = list.map((order: any) => {
        // 转换截图数据：将字符串数组转换为对象数组
        // 处理可能是JSON字符串的情况
        let screenshots: string[] = []
        if (order.depositScreenshots) {
          console.log('[订单审核] 原始截图数据:', typeof order.depositScreenshots, order.depositScreenshots)
          if (typeof order.depositScreenshots === 'string') {
            try {
              screenshots = JSON.parse(order.depositScreenshots)
              console.log('[订单审核] JSON解析成功:', screenshots)
            } catch (e) {
              // 如果解析失败，可能是单个URL字符串
              console.log('[订单审核] JSON解析失败，作为单个URL处理')
              screenshots = [order.depositScreenshots]
            }
          } else if (Array.isArray(order.depositScreenshots)) {
            screenshots = order.depositScreenshots
            console.log('[订单审核] 已是数组格式:', screenshots.length, '张')
          }
        }

        const paymentScreenshots = screenshots.map((url: string, index: number) => ({
          id: index + 1,
          url: url,
          name: `支付截图${index + 1}`
        }))

        if (paymentScreenshots.length > 0) {
          console.log('[订单审核] 订单', order.orderNo, '转换后的截图:', paymentScreenshots.length, '张')
        }

        return {
          id: order.id,
          orderNo: order.orderNo || order.orderNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          salesPerson: order.salesPerson || order.createdByName || '-',
          totalAmount: order.totalAmount || 0,
          depositAmount: order.depositAmount || 0,
          codAmount: (order.totalAmount || 0) - (order.depositAmount || 0),
          productCount: order.products?.length || 0,
          products: order.products || [],
          createTime: order.createTime,
          paymentMethod: order.paymentMethod || '',
          waitingMinutes: Math.floor((new Date().getTime() - new Date(order.createTime).getTime()) / (1000 * 60)),
          remark: order.remark || '',
          auditStatus: order.auditStatus,
          status: order.status, // 🔥 保留订单实际状态，用于判断是否可撤销
          auditFlag: order.auditStatus || 'pending',
          hasBeenAudited: order.auditStatus !== 'pending',
          deliveryAddress: order.deliveryAddress || order.receiverAddress || '',
          paymentScreenshots: paymentScreenshots,
          depositScreenshots: screenshots,
          auditHistory: []
        }
      })

      // 🔥 根据当前标签页更新对应的数据
      if (activeTab.value === 'pending') {
        pendingOrders.value = convertedOrders as any
      } else if (activeTab.value === 'approved') {
        approvedOrders.value = convertedOrders as any
      } else if (activeTab.value === 'rejected') {
        rejectedOrders.value = convertedOrders as any
      }

      // 更新分页总数
      pagination.total = total

      console.log(`[订单审核] 📊 数据加载完成: ${activeTab.value}=${convertedOrders.length}, 总数=${total}`)
    }

    // 更新标签计数
    updateTabCounts()

  } catch (error) {
    // 🔥 修复：忽略请求被取消的错误（由新请求替代旧请求时产生，属于正常行为）
    if (axios.isCancel(error)) {
      console.log('[订单审核] 请求已被取消（被新请求替代），忽略此错误')
      return
    }
    console.error('[订单审核] ❌ 加载订单列表失败:', error)
    ElMessage.error('加载订单列表失败')

    // 确保在错误情况下数组仍然是有效的空数组
    if (activeTab.value === 'pending') {
      pendingOrders.value = []
    } else if (activeTab.value === 'approved') {
      approvedOrders.value = []
    } else if (activeTab.value === 'rejected') {
      rejectedOrders.value = []
    }
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

  // 🔥 优化：直接加载审核统计和当前标签页的订单，不再加载全量订单
  console.log('[订单审核] 🚀 开始加载审核数据（优化版）...')
  const startTime = Date.now()

  // 并行加载汇总数据和订单列表
  await Promise.all([
    loadSummaryData(),
    loadOrderList()
  ])

  const loadTime = Date.now() - startTime
  console.log(`[订单审核] ✅ 数据加载完成，总耗时: ${loadTime}ms`)

  // 🔥 修复：只设置默认筛选标记，不触发重复的 loadOrderList 调用
  // 之前 handleQuickFilter('all') 会调用 handleSearch() -> loadOrderList()，导致重复请求
  activeQuickFilter.value = 'all'

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

/* 支付截图单元格样式 */
.payment-screenshots-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  position: relative;
  padding: 4px 0;
}

.screenshot-thumbnail-small {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #e4e7ed;
  transition: all 0.2s ease;
}

.screenshot-thumbnail-small:hover {
  border-color: #409eff;
  transform: scale(1.15);
  z-index: 10;
}

.screenshot-count {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  font-size: 10px;
  padding: 0px 3px;
  border-radius: 6px;
  line-height: 1.4;
  min-width: 16px;
  text-align: center;
  font-weight: 500;
}

.no-screenshot {
  color: #909399;
  font-size: 12px;
}

.image-error-small {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #c0c4cc;
}

.image-error-small .el-icon {
  font-size: 16px;
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

/* 文本溢出样式 */
.text-overflow {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

/* 产品列表样式 */
.products-text {
  color: #606266;
  font-size: 13px;
}

/* 产品悬浮提示样式 */
.products-tooltip {
  max-width: 400px;
  padding: 4px 0;
}

.product-item-tooltip {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.product-item-tooltip:last-child {
  border-bottom: none;
}

.product-name-tooltip {
  font-weight: 500;
  margin-bottom: 4px;
  color: #fff;
  font-size: 13px;
}

.product-detail-tooltip {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.product-detail-tooltip span {
  white-space: nowrap;
}
</style>
