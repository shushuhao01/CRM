<template>
  <div class="shipping-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">发货列表</h1>
      <el-tooltip content="查看物流配置指南与发货打单帮助" placement="bottom">
        <el-button
          type="primary"
          link
          @click="router.push('/help-center?section=logistics-shipping-guide')"
          class="help-link-btn"
        >
          <el-icon><QuestionFilled /></el-icon>
          配置指南
        </el-button>
      </el-tooltip>
    </div>

    <!-- 数据概览卡片 -->
    <div class="metrics-grid">
      <!-- 第一行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon total-orders">
            <el-icon><Box /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.totalOrders }}</div>
            <div class="metric-label">待发货订单</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon total-amount">
            <el-icon><Money /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.totalAmount) }}</div>
            <div class="metric-label">待发货金额</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon shipped-today">
            <el-icon><Van /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.shippedToday }}</div>
            <div class="metric-label">今日发货</div>
          </div>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon urgent-orders">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.urgentOrders }}</div>
            <div class="metric-label">紧急订单</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon cod-orders">
            <el-icon><CreditCard /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.timeoutOrders }}</div>
            <div class="metric-label">超时发货订单</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-icon cod-amount">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.timeoutAmount) }}</div>
            <div class="metric-label">超时订单金额</div>
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
          placeholder="全部部门"
          class="department-select"
          size="default"
          clearable
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
          v-model="selectedSalesPerson"
          placeholder="全部销售"
          class="sales-select"
          size="default"
          clearable
          filterable
        >
          <el-option label="全部销售" value="" />
          <el-option
            v-for="user in salesUserList"
            :key="user.id"
            :label="user.name"
            :value="user.id"
          />
        </el-select>
        <el-input
          v-model="searchKeyword"
          placeholder="搜索订单号、客户名称、客户电话、客户编码"
          class="search-input"
          clearable
          style="width: 320px"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="filter-right">
        <el-button type="primary" @click="queryData" class="query-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- 状态导航标签页 -->
    <div class="status-tabs">
      <div class="tabs-header">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="shipping-tabs">
        <el-tab-pane label="待发货" name="pending">
          <template #label>
            <span class="tab-label">
              <el-icon><Box /></el-icon>
              待发货
              <el-badge :value="tabCounts.pending" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="虚拟待发货" name="virtual_pending">
          <template #label>
            <span class="tab-label">
              <el-icon><MagicStick /></el-icon>
              虚拟待发货
              <el-badge :value="tabCounts.virtualPending || 0" :max="999" class="tab-badge" type="warning" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="已发货" name="shipped">
          <template #label>
            <span class="tab-label">
              <el-icon><Van /></el-icon>
              已发货
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="退回" name="returned">
          <template #label>
            <span class="tab-label">
              <el-icon><Back /></el-icon>
              退回
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="取消" name="cancelled">
          <template #label>
            <span class="tab-label">
              <el-icon><Close /></el-icon>
              取消
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="草稿" name="draft">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              草稿
              <el-badge :value="tabCounts.draft" :max="999" class="tab-badge draft-badge" />
            </span>
          </template>
        </el-tab-pane>
        </el-tabs>
        <div class="tabs-actions">
          <el-button @click="senderInfoVisible = true" class="sender-info-btn" title="寄件人/退货地址管理">
            <el-icon><Postcard /></el-icon>
            寄件人
          </el-button>
          <el-button @click="refreshData" class="refresh-btn">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-button type="primary" @click="showFullscreenView" class="fullscreen-btn">
            <el-icon><FullScreen /></el-icon>
            全屏查看
          </el-button>
        </div>
      </div>
    </div>

    <!-- 订单列表 -->
    <DynamicTable
      :data="paginatedOrderList"
      :columns="tableColumns"
      storage-key="shipping-list-columns"
      :title="tableTitle"
      :loading="loading"
      :show-selection="true"
      :show-index="true"
      :show-pagination="true"
      :show-actions="true"
      :actions-width="330"
      :total="total"
      :page-sizes="[10, 20, 50, 100, 200, 300, 500, 1000, 2000, 3000]"
      @selection-change="handleSelectionChange"
      @size-change="handlePageSizeChange"
      @current-change="handleCurrentChange"
      :row-class-name="getRowClassName"
    >
      <!-- 头部操作按钮 -->
      <template #header-actions>
        <el-button @click="exportSelected" class="export-btn" :disabled="selectedOrders.length === 0">
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button type="warning" @click="batchPrintLabel" class="batch-print-btn" :disabled="selectedOrders.length === 0">
          <el-icon><Printer /></el-icon>
          批量打印面单
        </el-button>
        <el-button type="success" @click="batchShip" class="batch-ship-btn" :disabled="selectedOrders.length === 0">
          <el-icon><Van /></el-icon>
          批量发货
        </el-button>
        <el-button type="primary" @click="batchConfirmShip" :disabled="confirmableSelectedOrders.length === 0" v-if="confirmableSelectedOrders.length > 0">
          <el-icon><Check /></el-icon>
          已传单号待确认发货 ({{ confirmableSelectedOrders.length }})
        </el-button>
        <el-button @click="printerConfigVisible = true" class="printer-config-btn" title="打印机配置">
          <el-icon><Setting /></el-icon>
        </el-button>
      </template>

      <!-- 订单号列 -->
      <template #column-orderNo="{ row }">
        <el-link type="primary" @click="goToOrderDetail(row)" :underline="false">
          {{ row.orderNo }}
        </el-link>
      </template>

      <!-- 客户名字列 -->
      <template #column-customerName="{ row }">
        <el-link type="primary" @click="goToCustomerDetail(row)" :underline="false">
          {{ row.customerName }}
        </el-link>
      </template>

      <!-- 状态列 -->
      <template #column-status="{ row }">
        <el-tag :style="getOrderStatusStyle(row.status)" size="small" effect="plain">
          {{ getUnifiedStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 下单时间列 -->
      <template #createTime="{ row }">
        <span>{{ formatDateTime(row.createTime) }}</span>
      </template>

      <!-- 商品列 -->
      <template #products="{ row }">
        <div class="product-list">
          <div v-for="(product, index) in row.products" :key="index" class="product-item">
            <el-tag v-if="product.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
            <el-tag v-else size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
            {{ product.name }} × {{ product.quantity }}
          </div>
        </div>
      </template>

      <!-- 订单总额列 -->
      <template #totalAmount="{ row }">
        <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
      </template>

      <!-- 定金列 -->
      <template #deposit="{ row }">
        <span class="amount">¥{{ formatNumber(row.deposit) }}</span>
      </template>

      <!-- 代收款金额列 -->
      <template #codAmount="{ row }">
        <span class="amount highlight">¥{{ formatNumber(row.codAmount) }}</span>
      </template>

      <!-- 订单来源列 -->
      <template #column-orderSource="{ row }">
        <span>{{ getOrderSourceText(row.orderSource) }}</span>
      </template>

      <!-- 🔥 指定快递列 - 不同快递公司不同颜色 -->
      <template #column-designatedExpress="{ row }">
        <span
          v-if="row.designatedExpress"
          class="express-tag"
          :style="getExpressCompanyStyle(row.designatedExpress)"
        >
          {{ getExpressCompanyName(row.designatedExpress) }}
        </span>
        <span v-else class="no-data">-</span>
      </template>

      <!-- 支付方式列 -->
      <template #column-paymentMethod="{ row }">
        <span>{{ getPaymentMethodText(row.paymentMethod) }}</span>
      </template>

      <!-- 订单备注列 -->
      <template #column-remark="{ row }">
        <span v-if="row.remark" class="remark-text" v-html="highlightKeywords(row.remark)"></span>
        <span v-else class="no-remark">无备注</span>
      </template>

      <!-- 商品列 - 显示实物/虚拟标签 -->
      <template #column-productsText="{ row }">
        <div v-if="Array.isArray(row.products) && row.products.length > 0">
          <div v-for="(p, i) in row.products" :key="i" style="display:flex;align-items:center;gap:4px;margin-bottom:2px;">
            <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="flex-shrink:0;">虚拟</el-tag>
            <el-tag v-else size="small" effect="light" style="flex-shrink:0;">实物</el-tag>
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.name }} x{{ p.quantity }}</span>
          </div>
        </div>
        <span v-else>{{ row.productsText || '-' }}</span>
      </template>

      <!-- 物流公司列 - 使用和指定快递一样的彩色样式 -->
      <template #column-expressCompany="{ row }">
        <span
          v-if="row.expressCompany"
          class="express-tag"
          :style="getExpressCompanyStyle(row.expressCompany)"
        >
          {{ getExpressCompanyName(row.expressCompany) }}
        </span>
        <span v-else class="no-data">未选择</span>
      </template>

      <!-- 物流单号列 -->
      <template #column-expressNo="{ row }">
        <div v-if="row.expressNo" class="express-no">
          <el-link type="primary" @click="trackLogistics(row)">
            {{ row.expressNo }}
          </el-link>
          <el-button
            size="small"
            type="text"
            @click="copyExpressNo(row.expressNo)"
            class="copy-btn"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
        <span v-else class="no-data">未发货</span>
      </template>

      <!-- 物流状态列 -->
      <template #column-logisticsStatus="{ row }">
        <el-tag
          v-if="row.logisticsStatus"
          :type="getLogisticsStatusType(row.logisticsStatus)"
        >
          {{ getLogisticsStatusText(row.logisticsStatus) }}
        </el-tag>
        <span v-else class="no-data">-</span>
      </template>

      <!-- 预计送达列 -->
      <template #column-estimatedDeliveryTime="{ row }">
        <span v-if="row.estimatedDeliveryTime">{{ formatDate(row.estimatedDeliveryTime) }}</span>
        <span v-else class="no-data">-</span>
      </template>

      <!-- 物流最新动态列 -->
      <template #column-latestLogistics="{ row }">
        <el-tooltip
          :content="row.latestLogistics"
          placement="top"
          :disabled="!row.latestLogistics || row.latestLogistics === '获取中...' || row.latestLogistics === '暂无物流信息'"
        >
          <span
            v-if="row.latestLogistics"
            class="logistics-latest"
          >
            {{ row.latestLogistics }}
          </span>
        </el-tooltip>
        <span v-if="!row.latestLogistics" class="no-data">-</span>
      </template>

      <!-- 操作记录列 -->
      <template #column-lastOperation="{ row }">
        <div v-if="row.lastOperation" class="operation-info">
          <div class="operation-action">{{ row.lastOperation.action }}</div>
          <div class="operation-meta">
            <span class="operation-user">{{ row.lastOperation.operator }}</span>
            <span class="operation-time">{{ formatDateTime(row.lastOperation.time) }}</span>
          </div>
        </div>
        <span v-else class="no-data">暂无记录</span>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <div class="action-buttons">
          <el-button size="small" type="primary" @click="viewOrderDetail(row)">
            <el-icon><View /></el-icon>
            查看
          </el-button>

          <!-- 已退回和已取消订单：只显示查看按钮 -->
          <template v-if="activeTab === 'returned' || activeTab === 'cancelled'">
            <!-- 只显示查看按钮，其他操作按钮都隐藏 -->
          </template>

          <!-- 草稿订单的特殊操作 -->
          <template v-else-if="row.status === 'draft'">
            <el-button size="small" type="warning" @click="editDraft(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="success" @click="submitDraft(row)">
              <el-icon><Check /></el-icon>
              提交
            </el-button>
            <el-button size="small" type="danger" @click="deleteDraft(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>

          <!-- 被退回订单的特殊操作 -->
          <template v-else-if="row.status === 'rejected_returned'">
            <el-button size="small" type="warning" @click="editReturnedOrder(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="success" @click="submitForAudit(row)">
              <el-icon><Check /></el-icon>
              提审
            </el-button>
            <el-button size="small" type="danger" @click="cancelReturnedOrder(row)">
              <el-icon><Close /></el-icon>
              取消
            </el-button>
          </template>

          <!-- 非草稿订单的常规操作 -->
          <template v-else>
            <!-- 🔥 虚拟待发货订单：显示虚拟发货按钮 -->
            <template v-if="activeTab === 'virtual_pending'">
              <el-button size="small" type="primary" @click="openVirtualDeliveryDialog(row)">
                <el-icon><MagicStick /></el-icon>
                虚拟发货
              </el-button>
            </template>
            <!-- 已发货标签页：隐藏打印面单和发货按钮 -->
            <template v-else-if="activeTab === 'shipped'">
              <!-- 已发货订单只显示查看和更多按钮 -->
            </template>
            <!-- 待发货等其他标签页：显示所有操作按钮 -->
            <template v-else>
              <el-button size="small" type="success" @click="printLabel(row)">
                <el-icon><Printer /></el-icon>
                打印面单
              </el-button>
              <el-button size="small" type="warning" @click="shipOrder(row)">
                <el-icon><Van /></el-icon>
                发货
              </el-button>
            </template>
            <el-dropdown @command="handleCommand" trigger="click">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{action: 'confirmShip', row}" :disabled="!(row.expressNo || row.trackingNumber) || row.status === 'shipped'">
                    <el-icon><Check /></el-icon>
                    {{ ((row.expressNo || row.trackingNumber) && row.status !== 'shipped') ? '已传单号待确认发货' : '确认发货' }}
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'export', row}">
                    <el-icon><Download /></el-icon>
                    导出
                  </el-dropdown-item>
                  <!-- 已发货订单不显示退回和取消 -->
                  <template v-if="activeTab !== 'shipped'">
                    <el-dropdown-item :command="{action: 'return', row}">
                      <el-icon><Back /></el-icon>
                      退回
                    </el-dropdown-item>
                    <el-dropdown-item :command="{action: 'cancel', row}">
                      <el-icon><Close /></el-icon>
                      取消
                    </el-dropdown-item>
                  </template>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </template>
    </DynamicTable>

    <!-- 订单详情弹窗 -->
    <OrderDetailDialog
      v-model:visible="orderDetailVisible"
      :order="selectedOrder"
    />

    <!-- 打印面单弹窗 -->
    <PrintLabelDialog
      v-model:visible="printLabelVisible"
      :order="selectedOrder"
      @printed="handleLabelPrinted"
      @tracking-saved="handleTrackingSaved"
    />

    <!-- 批量打印面单弹窗 -->
    <BatchPrintLabelDialog
      v-model:visible="batchPrintLabelVisible"
      :orders="selectedOrders"
      @printed="handleBatchLabelPrinted"
      @tracking-saved="handleBatchTrackingSaved"
    />

    <!-- 打印机配置弹窗 -->
    <PrinterConfigDialog v-model:visible="printerConfigVisible" />

    <!-- 寄件人/退货地址管理弹窗 -->
    <SenderInfoDialog v-model:visible="senderInfoVisible" />

    <!-- 发货弹窗 -->
    <ShippingDialog
      v-model:visible="shipOrderVisible"
      :order="selectedOrder"
      @shipped="handleOrderShipped"
    />

    <!-- 批量发货弹窗 -->
    <BatchShippingDialog
      v-model:visible="batchShipVisible"
      :selectedOrders="selectedOrders"
      @batch-shipped="handleBatchShipped"
    />

    <!-- 退回确认弹窗 -->
    <ReturnOrderDialog
      v-model:visible="returnOrderVisible"
      :order="selectedOrder"
      @returned="handleOrderReturned"
    />

    <!-- 取消确认弹窗 -->
    <CancelOrderDialog
      v-model:visible="cancelOrderVisible"
      :order="selectedOrder"
      @cancelled="handleOrderCancelled"
    />

    <!-- 全屏查看对话框 -->
    <el-dialog
      v-model="fullscreenVisible"
      title="发货列表 - 全屏查看"
      width="95%"
      class="fullscreen-dialog"
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
            />
            <el-select
              v-model="selectedDepartment"
              placeholder="选择部门"
              class="department-select"
            >
              <el-option label="全部部门" value="" />
              <el-option label="销售一部" value="sales1" />
              <el-option label="销售二部" value="sales2" />
              <el-option label="市场部" value="marketing" />
            </el-select>
            <el-input
              v-model="searchKeyword"
              placeholder="搜索订单号、客户名称、客户电话、客户编码"
              class="search-input"
              clearable
              style="width: 320px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="filter-right">
            <el-button type="primary" @click="queryData" class="query-btn">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>

        <!-- 完整的发货列表 -->
        <div class="fullscreen-table">
          <el-table
            :data="orderList"
            stripe
            class="data-table"
            border
            @selection-change="handleSelectionChange"
            :row-class-name="getRowClassName"
            height="calc(100vh - 300px)"
          >
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="120" align="center">
              <template #default="{ row }">
                <el-link type="primary" @click="goToOrderDetail(row)">{{ row.orderNo }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户姓名" width="100" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link type="primary" @click="goToCustomerDetail(row)">{{ row.customerName }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusType(row.status)" size="small">
                  {{ orderStore.getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="120" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                {{ displaySensitiveInfoNew(row.phone, 'phone') }}
              </template>
            </el-table-column>
            <el-table-column prop="address" label="收货地址" width="180" align="left" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.address ? displaySensitiveInfoNew(row.address, SensitiveInfoType.ADDRESS) : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="serviceWechat" label="客服微信号" width="120" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                {{ row.serviceWechat || '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="orderSource" label="订单来源" width="100" align="center">
              <template #default="{ row }">
                {{ getOrderSourceText(row.orderSource) }}
              </template>
            </el-table-column>
            <el-table-column prop="customTags" label="自定义标签" width="150" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.customFields && Object.keys(row.customFields).length > 0">
                  {{ formatCustomFields(row.customFields) }}
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="商品信息" width="200" align="left">
              <template #default="{ row }">
                <div v-if="Array.isArray(row.products) && row.products.length > 0" class="product-list">
                  <div v-for="(p, i) in row.products" :key="i" style="display: flex; align-items: center; gap: 4px; margin-bottom: 2px;">
                    <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="flex-shrink:0;">虚拟</el-tag>
                    <el-tag v-else size="small" effect="light" style="flex-shrink:0;">实物</el-tag>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ p.name }} × {{ p.quantity }}</span>
                  </div>
                </div>
                <span v-else>{{ row.productsText || '-' }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="订单金额" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="codAmount" label="代收款" width="100" align="center">
              <template #default="{ row }">
                <span class="cod-amount">¥{{ formatNumber(row.codAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="下单时间" width="130" align="center">
              <template #default="{ row }">
                {{ formatDateTime(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="shipTime" label="发货时间" width="130" align="center">
              <template #default="{ row }">
                {{ formatDateTime(row.shipTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="expressCompany" label="指定快递" width="110" align="center" class-name="express-column">
              <template #default="{ row }">
                <span
                  v-if="row.expressCompany"
                  class="express-tag"
                  :style="getExpressCompanyStyle(row.expressCompany)"
                >
                  {{ getExpressCompanyText(row.expressCompany) }}
                </span>
                <span v-else class="no-data">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="trackingNo" label="物流单号" width="130" align="center" show-overflow-tooltip />
            <el-table-column prop="logisticsCompany" label="物流公司" width="100" align="center" show-overflow-tooltip />
            <el-table-column prop="logisticsStatus" label="物流状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getLogisticsStatusType(row.logisticsStatus)" size="small">
                  {{ getLogisticsStatusText(row.logisticsStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="estimatedDeliveryTime" label="预计送达" width="110" align="center">
              <template #default="{ row }">
                <span v-if="row.estimatedDeliveryTime">{{ formatDate(row.estimatedDeliveryTime) }}</span>
                <span v-else class="no-data">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="latestLogistics" label="物流最新动态" width="200" align="left" show-overflow-tooltip>
              <template #default="{ row }">
                <el-tooltip
                  :content="row.latestLogistics"
                  placement="top"
                  :disabled="!row.latestLogistics || row.latestLogistics === '获取中...' || row.latestLogistics === '暂无物流信息' || row.latestLogistics === '待发货'"
                >
                  <span class="logistics-latest">{{ row.latestLogistics || '-' }}</span>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" width="140" align="left" show-overflow-tooltip />
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <div class="operation-buttons">
                  <el-button size="small" type="primary" @click="viewOrderDetail(row)">
                    <el-icon><View /></el-icon>
                    查看详情
                  </el-button>
                  <el-button size="small" type="info" @click="printLabel(row)">
                    <el-icon><Printer /></el-icon>
                    打印面单
                  </el-button>
                  <el-button size="small" type="success" @click="shipOrder(row)" v-if="row.status === 'pending'">
                    <el-icon><Van /></el-icon>
                    发货
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
            :page-sizes="[10, 20, 50, 100, 200, 300, 500, 1000, 2000, 3000]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 🔥 虚拟发货弹窗 -->
    <el-dialog v-model="virtualDeliveryDialogVisible" title="虚拟发货" width="680px" :close-on-click-modal="false">
      <!-- 订单基本信息 -->
      <div v-if="currentVirtualOrder" style="margin-bottom: 16px; padding: 12px; background: #f5f7fa; border-radius: 8px;">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="订单号">{{ currentVirtualOrder.orderNumber }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ currentVirtualOrder.customerName }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <el-divider content-position="left" style="margin: 12px 0;">发货商品</el-divider>

      <!-- 每个虚拟商品的发货配置 -->
      <div v-for="(item, idx) in virtualDeliveryItems" :key="idx" style="margin-bottom: 20px; padding: 16px; background: #fafafa; border: 1px solid #ebeef5; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 14px;">
          <el-tag type="warning" size="small">虚拟</el-tag>
          <span style="font-weight: 600; font-size: 14px;">{{ item.productName }}</span>
          <el-tag size="small" :type="item.virtualDeliveryType === 'card_key' ? 'primary' : item.virtualDeliveryType === 'resource_link' ? 'success' : 'info'" style="margin-left: auto;">
            {{ item.virtualDeliveryType === 'card_key' ? '卡密发货' : item.virtualDeliveryType === 'resource_link' ? '网盘资源' : '无需发货' }}
          </el-tag>
        </div>

        <!-- 无需发货类型 -->
        <template v-if="item.virtualDeliveryType === 'none'">
          <el-alert type="success" :closable="false" show-icon style="margin-bottom: 0;">
            <template #title>该商品无需实际发货，确认后将直接标记为已签收</template>
          </el-alert>
        </template>

        <!-- 卡密发货 -->
        <template v-else-if="item.virtualDeliveryType === 'card_key'">
          <div v-if="item.autoMatchedKey" style="padding: 8px 12px; background: #f0f9eb; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #67c23a;">
            <el-icon><Check /></el-icon>
            系统已自动匹配卡密：{{ item.autoMatchedKey.length > 8 ? item.autoMatchedKey.substring(0, 8) + '****' : item.autoMatchedKey }}
          </div>
          <el-form-item label="卡密" label-width="80px" style="margin-bottom: 8px;">
            <el-input
              v-model="item.manualContent"
              :placeholder="item.autoMatchedKey ? '已自动匹配，如需修改请输入新卡密' : '请输入卡密编码（手动填写将自动加入库存）'"
            >
              <template v-if="item.autoMatchedKey" #suffix>
                <el-tag type="success" size="small" effect="light">库存匹配</el-tag>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="使用说明" label-width="80px" style="margin-bottom: 8px;">
            <el-input v-model="item.usageInstructions" :placeholder="item.usageInstructions ? '' : '选填，如激活方法、使用步骤等'" />
          </el-form-item>
        </template>

        <!-- 资源发货 -->
        <template v-else-if="item.virtualDeliveryType === 'resource_link'">
          <div v-if="item.autoMatchedResource" style="padding: 8px 12px; background: #f0f9eb; border-radius: 4px; margin-bottom: 10px; font-size: 12px; color: #67c23a;">
            <el-icon><Check /></el-icon>
            系统已自动匹配资源
          </div>
          <el-form-item label="资源链接" label-width="80px" style="margin-bottom: 8px;">
            <el-input v-model="item.manualResourceLink" :placeholder="item.autoMatchedResource ? '已自动匹配，如需修改请输入新链接' : '请输入资源链接（手动填写将自动加入库存）'" />
          </el-form-item>
          <el-form-item label="提取码" label-width="80px" style="margin-bottom: 8px;">
            <el-input v-model="item.manualResourcePassword" placeholder="选填" style="width: 200px;" />
          </el-form-item>
          <el-form-item label="使用说明" label-width="80px" style="margin-bottom: 8px;">
            <el-input v-model="item.usageInstructions" :placeholder="item.usageInstructions ? '' : '选填，如使用步骤等'" />
          </el-form-item>
        </template>

        <el-form-item v-if="item.virtualDeliveryType !== 'none'" label="备注说明" label-width="80px" style="margin-bottom: 0;">
          <el-input v-model="item.remark" placeholder="选填" />
        </el-form-item>
      </div>

      <!-- 确认提示 -->
      <el-alert type="info" :closable="false" show-icon style="margin-top: 8px;">
        <template #title>
          确认后订单将标记为已签收，卡密/资源将标记为已使用；手动填写的内容将自动加入对应库存
        </template>
      </el-alert>

      <template #footer>
        <el-button @click="virtualDeliveryDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="virtualDeliveryLoading" @click="confirmVirtualDelivery">确认发货</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LogisticsShipping'
})

import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Box, Money, Van, Warning, CreditCard, Coin,
  Search, Download, View, Printer, ArrowDown, Back, Close, Document,
  Edit, Check, Delete, FullScreen, CopyDocument, Refresh, Setting, Postcard, QuestionFilled,
  MagicStick
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { useDepartmentStore } from '@/stores/department'
import { useCustomerStore } from '@/stores/customer'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'
import { exportBatchOrders, exportSingleOrder, type ExportOrder } from '@/utils/export'
import { useUserStore } from '@/stores/user'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { createSafeNavigator } from '@/utils/navigation'
import { getOrderStatusColor, getOrderStatusText as getUnifiedStatusText, getOrderStatusStyle } from '@/utils/orderStatusConfig'
import { eventBus, EventNames } from '@/utils/eventBus'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import PrintLabelDialog from './components/PrintLabelDialog.vue'
import BatchPrintLabelDialog from './components/BatchPrintLabelDialog.vue'
import PrinterConfigDialog from './components/PrinterConfigDialog.vue'
import ShippingDialog from './components/ShippingDialog.vue'
import BatchShippingDialog from './components/BatchShippingDialog.vue'
import ReturnOrderDialog from './components/ReturnOrderDialog.vue'
import CancelOrderDialog from './components/CancelOrderDialog.vue'
import SenderInfoDialog from './components/SenderInfoDialog.vue'
import DynamicTable from '@/components/DynamicTable.vue'
import { formatDateTime } from '@/utils/dateFormat'

// 初始化
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 数据概览
const overviewData = reactive({
  totalOrders: 0,
  totalAmount: 0,
  shippedToday: 0,
  urgentOrders: 0,
  timeoutOrders: 0,
  timeoutAmount: 0
})

// 快速筛选
const quickFilters = [
  { label: '全部', value: 'all' },
  { label: '今日订单', value: 'today' },
  { label: '昨日订单', value: 'yesterday' },
  { label: '本周订单', value: 'thisWeek' },
  { label: '本月订单', value: 'thisMonth' },
  { label: '上月订单', value: 'lastMonth' },
  { label: '今年订单', value: 'thisYear' },
  { label: '紧急订单', value: 'urgent' },
  { label: '超时订单', value: 'timeout' }
]

const selectedQuickFilter = ref('all')

// 状态标签页
const activeTab = ref('pending')
const tabCounts = reactive({
  pending: 0,
  virtualPending: 0,
  shipped: 0,
  returned: 0,
  cancelled: 0,
  draft: 0
})

// 筛选条件
const dateRange = ref<[string, string] | null>(null)
const selectedDepartment = ref('')
const selectedSalesPerson = ref('')
const searchKeyword = ref('')  // 🔥 综合搜索关键词

// 🔥 销售人员列表（从用户store获取）
const salesUserList = computed(() => {
  return userStore.users
    .filter((u: any) => {
      // 只显示启用的用户
      const isEnabled = !u.status || u.status === 'active'
      // 包含销售员、部门经理等可以创建订单的角色
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin'].includes(u.role || u.roleId)
      return isEnabled && hasValidRole
    })
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username,
      department: u.departmentName || u.department || '未分配'
    }))
})

// 列表数据
const orderList = ref<any[]>([])
const selectedOrders = ref<any[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)  // 🔥 默认10条/页
const loading = ref(false)

// 🔥 服务端分页：直接使用orderList作为当前页数据
const paginatedOrderList = computed(() => orderList.value)

// 弹窗状态
const orderDetailVisible = ref(false)
const printLabelVisible = ref(false)
const batchPrintLabelVisible = ref(false)
const printerConfigVisible = ref(false)
const shipOrderVisible = ref(false)
const batchShipVisible = ref(false)
const returnOrderVisible = ref(false)
const cancelOrderVisible = ref(false)
const fullscreenVisible = ref(false)
const senderInfoVisible = ref(false)
const selectedOrder = ref<any>(null)

// Store
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const customerStore = useCustomerStore()
const fieldConfigStore = useOrderFieldConfigStore()

// 表格标题
const tableTitle = computed(() => {
  const tabNames: Record<string, string> = {
    pending: '待发货',
    virtual_pending: '虚拟待发货',
    shipped: '已发货',
    returned: '退回',
    cancelled: '取消',
    draft: '草稿'
  }
  return `${tabNames[activeTab.value] || '发货'}列表`
})

// 基础表格列配置
const baseTableColumns = [
  {
    prop: 'orderNo',
    label: '订单号',
    width: 130,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'status',
    label: '订单状态',
    width: 90,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户名字',
    width: 80,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'phone',
    label: '电话',
    width: 110,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'address',
    label: '地址',
    width: 160,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'designatedExpress',
    label: '指定快递',
    width: 100,
    align: 'center',
    visible: true,
    isHighlight: true // 🔥 标记为高亮字段
  },
  {
    prop: 'salesPersonName',
    label: '销售人员',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'createTime',
    label: '下单时间',
    width: 135,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'remark',
    label: '订单备注',
    width: 100,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'productsText',
    label: '商品',
    width: 150,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'totalQuantity',
    label: '数量',
    width: 55,
    align: 'center',
    visible: true
  },
  {
    prop: 'totalAmount',
    label: '订单总额',
    width: 90,
    align: 'center',
    visible: true
  },
  {
    prop: 'deposit',
    label: '定金',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'codAmount',
    label: '代收款',
    width: 90,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerAge',
    label: '年龄',
    width: 55,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerHeight',
    label: '身高',
    width: 55,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerWeight',
    label: '体重',
    width: 55,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerGender',
    label: '性别',
    width: 55,
    align: 'center',
    visible: true,
    formatter: (value: unknown) => {
      const genderMap: Record<string, string> = { male: '男', female: '女', unknown: '未知', '男': '男', '女': '女' }
      return genderMap[String(value)] || value || '-'
    }
  },
  {
    prop: 'medicalHistory',
    label: '疾病史',
    width: 100,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'serviceWechat',
    label: '客服微信号',
    width: 100,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'orderSource',
    label: '订单来源',
    width: 95,
    align: 'center',
    visible: true
  },
  // 🔥 自定义字段1-7（位于订单来源后面、支付方式前面）
  { prop: 'customFields.custom_field1', label: '自定义字段1', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field1' },
  { prop: 'customFields.custom_field2', label: '自定义字段2', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field2' },
  { prop: 'customFields.custom_field3', label: '自定义字段3', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field3' },
  { prop: 'customFields.custom_field4', label: '自定义字段4', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field4' },
  { prop: 'customFields.custom_field5', label: '自定义字段5', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field5' },
  { prop: 'customFields.custom_field6', label: '自定义字段6', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field6' },
  { prop: 'customFields.custom_field7', label: '自定义字段7', width: 120, align: 'center', showOverflowTooltip: true, visible: false, isCustomField: true, fieldKey: 'custom_field7' },
  {
    prop: 'paymentMethod',
    label: '支付方式',
    width: 85,
    align: 'center',
    visible: true
  },
  {
    prop: 'expressCompany',
    label: '物流公司',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'expressNo',
    label: '物流单号',
    width: 135,
    align: 'center',
    visible: true
  },
  {
    prop: 'logisticsStatus',
    label: '物流状态',
    width: 85,
    align: 'center',
    visible: true
  },
  {
    prop: 'estimatedDeliveryTime',
    label: '预计送达',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'latestLogistics',
    label: '物流最新动态',
    width: 160,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'lastOperation',
    label: '最近操作',
    width: 160,
    showOverflowTooltip: true,
    visible: false
  }
]

// 表格列配置（包含动态自定义字段）
const tableColumns = computed(() => {
  // 🔥 更新预设的自定义字段列的标签和可见性
  return baseTableColumns.map(col => {
    if (col.isCustomField && col.fieldKey) {
      // 查找是否有对应的配置
      const fieldConfig = fieldConfigStore.customFields.find(f => f.fieldKey === col.fieldKey)
      if (fieldConfig) {
        return {
          ...col,
          label: fieldConfig.fieldName, // 使用配置的字段名称
          visible: fieldConfig.showInList === true // 根据配置决定是否显示
        }
      }
    }
    return col
  })
})

// 🔥 旧的tableColumns计算属性（已废弃，保留注释）
/*
const tableColumnsOld = computed(() => {
  // 获取需要在列表中显示的自定义字段
*/

// 格式化数字
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString()
}

// 格式化日期（只显示日期部分）
const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return dateStr
  }
}

// formatDateTime 已从 @/utils/dateFormat 导入

// 获取自定义字段显示文本
const formatCustomFields = (customFields: Record<string, unknown>) => {
  if (!customFields || Object.keys(customFields).length === 0) return '-'

  // 获取自定义字段配置
  const orderFieldConfigStore = useOrderFieldConfigStore()
  const fieldConfigs = orderFieldConfigStore.customFields || []

  // 将自定义字段值转换为显示文本
  const displayValues: string[] = []
  for (const [key, value] of Object.entries(customFields)) {
    if (value !== null && value !== undefined && value !== '') {
      // 查找字段配置获取字段名称
      const fieldConfig = fieldConfigs.find(f => f.fieldKey === key)
      const fieldName = fieldConfig?.fieldName || key
      displayValues.push(`${fieldName}: ${value}`)
    }
  }

  return displayValues.length > 0 ? displayValues.join(', ') : '-'
}

// 获取订单来源文本
const getOrderSourceText = (source: string | null) => {
  if (!source) return '-'
  const sourceMap: Record<string, string> = {
    online_store: '🛒 线上商城',
    wechat_mini: '📱 微信小程序',
    wechat_service: '💬 微信客服',
    phone_call: '📞 电话咨询',
    offline_store: '🏪 线下门店',
    referral: '👥 客户推荐',
    advertisement: '📺 广告投放',
    other: '🎯 其他渠道'
  }
  return sourceMap[source] || source
}

// 获取支付方式文本
const getPaymentMethodText = (method: string | null) => {
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

// 获取订单状态类型
const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending_transfer': 'info',
    'pending_audit': 'warning',
    'audit_rejected': 'danger',
    'pending_shipment': 'warning',  // 待发货用橙色
    'shipped': 'primary',           // 已发货用蓝色
    'delivered': 'success',         // 已签收用绿色
    'package_exception': 'danger',
    'rejected': 'danger',
    'rejected_returned': 'warning',
    'logistics_returned': 'warning',
    'logistics_cancelled': 'info',
    'after_sales_created': 'info',
    'cancelled': 'info',
    'draft': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取订单状态文本
const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '物流部退回',
    'logistics_returned': '物流部退回',
    'logistics_cancelled': '物流部取消',
    'after_sales_created': '已建售后',
    'pending_cancel': '待取消',
    'cancel_failed': '取消失败',
    'cancelled': '已取消',
    'draft': '草稿',
    'approved': '已审核',
    'confirmed': '已确认'
  }
  return statusMap[status] || status || '-'
}



// 获取标记类型
const getMarkType = (markType: string) => {
  const typeMap = {
    'urgent': 'danger',
    'normal': 'success',
    'cod': 'warning',
    'return': 'info'
  }
  return typeMap[markType] || 'info'
}

// 获取标记文本
const getMarkText = (markType: string) => {
  const textMap = {
    'urgent': '紧急',
    'normal': '正常',
    'cod': '代收款',
    'return': '退回'
  }
  return textMap[markType] || '正常'
}

// 获取行类名
const getRowClassName = ({ row }: { row: any }) => {
  if (row.status === 'urgent') return 'urgent-row'
  if (row.status === 'cod') return 'cod-row'
  return ''
}

// 高亮关键词（安全版本，防止XSS）
const highlightKeywords = (text: string) => {
  if (!text) return ''
  // 先转义HTML特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // 再添加高亮标签
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = escaped
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    result = result.replace(regex, `<span class="highlight-keyword">${keyword}</span>`)
  })
  return result
}

// 快速筛选处理
const handleQuickFilter = (value: string) => {
  selectedQuickFilter.value = value
  queryData()
}

// 标签页切换处理
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  currentPage.value = 1 // 重置页码
  queryData()
  updateTabCounts() // 更新标签页数量
}

// 查询数据
const queryData = () => {
  // 模拟查询逻辑
  loadOrderList()
}

// 刷新数据
const refreshData = async () => {
  try {
    // 先从API重新加载订单数据
    await orderStore.loadOrdersFromAPI(true)
    // 然后刷新列表
    await loadOrderList()
    updateTabCounts()
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败')
  }
}

// 加载订单列表
const loadOrderList = async () => {
  try {
    loading.value = true
    console.log('[发货列表] 开始加载订单列表，当前标签页:', activeTab.value, '页码:', currentPage.value, '每页:', pageSize.value)

    // 🔥 修复：确保客户数据已加载，用于获取客户详细信息
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    // 🔥 服务端分页：传递分页参数和筛选条件
    let orders: any[] = []
    let serverTotal = 0

    try {
      const { orderApi } = await import('@/api/order')
      const timestamp = Date.now()

      // 构建筛选参数
      const params: any = {
        _t: timestamp,
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchKeyword.value?.trim() || undefined,  // 🔥 综合搜索关键词
        // 🔥 日期范围筛选
        startDate: dateRange.value?.[0] || undefined,
        endDate: dateRange.value?.[1] || undefined,
        // 🔥 快速筛选
        quickFilter: selectedQuickFilter.value !== 'all' ? selectedQuickFilter.value : undefined,
        // 🔥 部门筛选
        departmentId: selectedDepartment.value || undefined,
        // 🔥 销售人员筛选
        salesPersonId: selectedSalesPerson.value || undefined
      }

      if (activeTab.value === 'pending') {
        const response = await orderApi.getShippingPending(params)
        orders = response?.data?.list || []
        serverTotal = response?.data?.total || orders.length
        console.log('[发货列表] 从API获取待发货订单:', orders.length, '条，总数:', serverTotal)
      } else if (activeTab.value === 'virtual_pending') {
        // 虚拟待发货订单：使用标准pending_shipment状态 + 虚拟商品类型过滤
        const token = localStorage.getItem('auth_token')
        const vpResp = await fetch(`/api/v1/orders?status=pending_shipment&orderProductType=virtual&markType=virtual_delivery&page=${params.page}&pageSize=${params.pageSize}${params.keyword ? '&keyword=' + params.keyword : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const vpData = await vpResp.json()
        orders = vpData?.data?.list || vpData?.data?.orders || []
        serverTotal = vpData?.data?.total || orders.length
        console.log('[发货列表] 从API获取虚拟待发货订单:', orders.length, '条，总数:', serverTotal)
      } else if (activeTab.value === 'shipped') {
        const response = await orderApi.getShippingShipped(params)
        orders = response?.data?.list || []
        serverTotal = response?.data?.total || orders.length
        console.log('[发货列表] 从API获取已发货订单:', orders.length, '条，总数:', serverTotal)
      } else if (activeTab.value === 'returned') {
        // 退回订单从API获取
        const response = await orderApi.getShippingReturned(params)
        orders = response?.data?.list || []
        serverTotal = response?.data?.total || orders.length
        console.log('[发货列表] 从API获取退回订单:', orders.length, '条，总数:', serverTotal)
      } else if (activeTab.value === 'cancelled') {
        // 取消订单从API获取
        const response = await orderApi.getShippingCancelled(params)
        orders = response?.data?.list || []
        serverTotal = response?.data?.total || orders.length
        console.log('[发货列表] 从API获取取消订单:', orders.length, '条，总数:', serverTotal)
      } else if (activeTab.value === 'draft') {
        // 草稿订单从API获取
        const response = await orderApi.getShippingDraft(params)
        orders = response?.data?.list || []
        serverTotal = response?.data?.total || orders.length
        console.log('[发货列表] 从API获取草稿订单:', orders.length, '条，总数:', serverTotal)
      } else {
        // 其他状态从store获取（暂时保持前端分页）
        const allOrders = await orderStore.getOrdersByShippingStatus(activeTab.value)
        serverTotal = allOrders.length
        const startIndex = (currentPage.value - 1) * pageSize.value
        orders = allOrders.slice(startIndex, startIndex + pageSize.value)
      }
    } catch (apiError) {
      console.warn('[发货列表] API获取失败，回退到store:', apiError)
      const allOrders = await orderStore.getOrdersByShippingStatus(activeTab.value)
      serverTotal = allOrders.length
      const startIndex = (currentPage.value - 1) * pageSize.value
      orders = allOrders.slice(startIndex, startIndex + pageSize.value)
    }

    // 🔥 设置总数（来自服务端）
    total.value = serverTotal
    console.log('[发货列表] 当前页订单数:', orders.length, '总数:', total.value)

    // 确保返回的是数组
    if (!Array.isArray(orders)) {
      console.error('[发货列表] 返回的不是数组:', orders)
      orderList.value = []
      total.value = 0
      return
    }

    // 🔥 服务端分页：直接使用返回的订单数据，不再前端筛选
    // 为每个订单添加真实的操作记录并同步客户信息和订单信息
    orderList.value = orders.map(order => {
      // 获取真实的操作记录
      const operationLogs = orderStore.getOperationLogs(order.id) || []

      // 获取最近的操作记录
      const lastOperation = operationLogs.length > 0
        ? operationLogs[operationLogs.length - 1]
        : {
            action: '创建订单',
            operator: order.createdBy || '系统',
            time: order.createTime
          }

      // 🔥 修复：优先使用API返回的客户信息，其次从customerStore获取
      let customerInfo: Record<string, unknown> = {
        customerGender: order.customerGender || null,
        customerAge: order.customerAge || null,
        customerHeight: order.customerHeight || null,
        customerWeight: order.customerWeight || null,
        medicalHistory: order.medicalHistory || null
      }

      // 如果API没有返回客户信息，尝试从customerStore获取
      if (!customerInfo.customerAge && !customerInfo.customerHeight && !customerInfo.customerWeight && order.customerId) {
        const customer = customerStore.getCustomerById(order.customerId)
        if (customer) {
          customerInfo = {
            customerGender: customer.gender || null,
            customerAge: customer.age || null,
            customerHeight: customer.height || null,
            customerWeight: customer.weight || null,
            medicalHistory: customer.medicalHistory || customer.disease || null
          }
        }
      }

      // 🔥 客服微信号优先从订单获取，其次从客户信息获取
      const serviceWechat = order.serviceWechat || (customerInfo as any).serviceWechat || null

      // 计算订单相关字段
      const products = Array.isArray(order.products) ? order.products : []
      const productsText = products.map((p: any) => `${p.name} × ${p.quantity}`).join('，') || '-'
      const totalQuantity = products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0) || 0
      const deposit = order.depositAmount || 0
      const codAmount = order.collectAmount || (order.totalAmount || 0) - (order.depositAmount || 0)

      // 统一字段映射
      return {
        ...order,
        // 字段映射
        orderNo: order.orderNumber || '-',
        phone: order.customerPhone || order.receiverPhone || '-',
        address: order.receiverAddress || '-',
        // 🔥 指定快递 - 用于主视图显示
        designatedExpress: order.expressCompany || null,
        // 🔥 销售人员字段映射（创建订单的用户姓名）- 从用户列表查找真实姓名
        salesPersonName: (() => {
          if (order.createdByName) return order.createdByName
          if (order.salesPersonName) return order.salesPersonName
          // 从用户列表查找真实姓名
          const user = userStore.users.find(u => u.id === order.createdBy || u.username === order.createdBy)
          return user?.realName || user?.name || order.createdBy || '-'
        })(),
        // 同步的客户信息
        ...customerInfo,
        // 🔥 客服微信号 - 优先从订单获取
        serviceWechat: serviceWechat,
        // 计算的订单字段
        productsText,
        totalQuantity,
        deposit,
        codAmount,
        // 物流字段映射
        expressCompany: order.expressCompany || null,
        expressNo: order.trackingNumber || null,
        logisticsStatus: order.logisticsStatus || null,
        // 🔥 预计送达时间
        estimatedDeliveryTime: order.estimatedDeliveryTime || order.expectedDeliveryDate || null,
        // 🔥 物流最新动态（初始值，后续异步更新）
        latestLogistics: '获取中...',
        // 🔥 订单来源 - 从订单获取
        orderSource: order.orderSource || null,
        // 🔥 自定义字段 - 确保正确传递
        customFields: order.customFields || {},
        // 操作记录
        lastOperation,
        operationLogs
      }
    })

    // 同步物流状态（异步执行，不阻塞页面加载）
    syncLogisticsData()

    // 更新概览数据（使用当前页数据，概览数据需要单独从API获取）
    updateOverviewData(orders)
  } catch (_error) {
    // 🔥 修复：忽略请求被取消的错误（由新请求替代旧请求时产生，属于正常行为）
    if (axios.isCancel(_error)) {
      console.log('[发货列表] 请求已被取消（被新请求替代），忽略此错误')
      return
    }
    console.error('加载订单列表失败:', _error)
    ElMessage.error('加载订单列表失败')
    orderList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 更新概览数据
const updateOverviewData = (currentPageOrders: any[] = []) => {
  // 🔥 概览数据应该显示总数，这里暂时用当前页数据
  // 后续可以从API单独获取统计数据
  const orders = Array.isArray(currentPageOrders) ? currentPageOrders : []

  // 使用total作为总订单数
  overviewData.totalOrders = total.value
  overviewData.totalAmount = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)

  // 今日发货数量
  const today = new Date().toISOString().split('T')[0]
  overviewData.shippedToday = orders.filter((order: any) =>
    order.shipTime && order.shipTime.startsWith(today)
  ).length

  overviewData.urgentOrders = orders.filter((order: any) => order.status === 'urgent').length

  // 🔥 超时发货订单：待发货超过24小时的订单
  const now = new Date().getTime()
  const timeoutThreshold = 24 * 60 * 60 * 1000 // 24小时
  const timeoutOrders = orders.filter((order: any) => {
    if (order.status !== 'pending_shipment' && order.status !== 'pending') return false
    const createTime = new Date(order.createTime || order.createdAt).getTime()
    return (now - createTime) > timeoutThreshold
  })
  overviewData.timeoutOrders = timeoutOrders.length
  overviewData.timeoutAmount = timeoutOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)
}

// 同步物流数据
const syncLogisticsData = async () => {
  try {
    // 批量同步物流状态
    await orderStore.batchSyncLogistics()
    // 🔥 简化：直接重新加载订单列表
    // loadOrderList() 会在后台自动调用，这里不需要重复加载
  } catch (_error) {
    console.error('同步物流数据失败:', _error)
  }

  // 🔥 获取物流最新动态
  await fetchLatestLogisticsForShipping()
}

/**
 * 🔥 获取物流最新动态（物流列表页面专用，批量查询优化版）
 */
const fetchLatestLogisticsForShipping = async () => {
  const { logisticsApi } = await import('@/api/logistics')

  // 只处理已发货且有物流单号的订单
  const ordersWithTracking = orderList.value.filter(order =>
    order.expressNo && order.expressCompany && order.status !== 'pending'
  )

  if (ordersWithTracking.length === 0) {
    // 没有物流信息的订单，设置默认值
    orderList.value.forEach(order => {
      if (!order.expressNo || !order.expressCompany) {
        order.latestLogistics = order.status === 'pending' ? '待发货' : '暂无物流信息'
      }
    })
    return
  }

  console.log(`[发货管理] 开始从API获取 ${ordersWithTracking.length} 个订单的物流信息`)

  // 🔥 批量查询优化：每批次10个订单
  const BATCH_SIZE = 10
  const batches: typeof ordersWithTracking[] = []

  for (let i = 0; i < ordersWithTracking.length; i += BATCH_SIZE) {
    batches.push(ordersWithTracking.slice(i, i + BATCH_SIZE))
  }

  console.log(`[发货管理] 分为 ${batches.length} 批次查询，每批 ${BATCH_SIZE} 个`)

  // 🔥 依次处理每个批次
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    console.log(`[发货管理] 正在查询第 ${batchIndex + 1}/${batches.length} 批次，共 ${batch.length} 个订单`)

    try {
      // 🔥 构建批量查询参数
      const queryOrders = batch.map(order => ({
        trackingNo: order.expressNo,
        companyCode: order.expressCompany,
        phone: order.phone?.trim() || order.customerPhone?.trim() || undefined
      }))

      // 🔥 批量查询
      const response = await logisticsApi.batchQueryTrace(queryOrders)

      if (response?.success && response.data) {
        // 🔥 处理每个查询结果
        response.data.forEach((result: any, index: number) => {
          const order = batch[index]
          if (!order) return

          if (result?.success && result.traces?.length > 0) {
            // 按时间排序，获取最新动态
            const sortedTraces = [...result.traces].sort((a: any, b: any) => {
              const timeA = new Date(a.time).getTime()
              const timeB = new Date(b.time).getTime()
              return timeB - timeA
            })
            const latestTrace = sortedTraces[0]
            order.latestLogistics = latestTrace.description || latestTrace.status || '暂无描述'

            // 🔥 同时更新物流状态
            if (result.status) {
              order.logisticsStatus = result.status
            }
            // 🔥 更新预计送达时间（智能计算）
            if (result.estimatedDeliveryTime) {
              order.estimatedDeliveryTime = result.estimatedDeliveryTime
            } else {
              // API没有返回预计送达，使用智能计算
              order.estimatedDeliveryTime = calculateEstimatedDelivery({
                logisticsStatus: order.logisticsStatus || '',
                companyCode: order.expressCompany || '',
                shipDate: order.shipTime || order.createTime || '',
                latestLogisticsInfo: order.latestLogistics || '',
                existingEstimatedDate: order.estimatedDeliveryTime || ''
              })
            }
          } else {
            order.latestLogistics = '暂无物流信息'
          }
        })

        const successCount = response.data.filter((r: any) => r?.success).length
        console.log(`[发货管理] ✅ 第 ${batchIndex + 1} 批次完成，成功 ${successCount}/${batch.length} 个`)
      } else {
        // 批量查询失败，标记所有订单
        batch.forEach(order => {
          order.latestLogistics = '获取失败'
        })
        console.log(`[发货管理] ❌ 第 ${batchIndex + 1} 批次查询失败`)
      }
    } catch (error) {
      console.error(`[发货管理] ❌ 第 ${batchIndex + 1} 批次查询异常:`, error)
      batch.forEach(order => {
        order.latestLogistics = '获取失败'
      })
    }

    // 🔥 批次之间延迟300ms，避免API限制
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 300))
    }
  }

  console.log('[发货管理] 物流信息获取完成')
}

// 定时器引用
let refreshTimer: NodeJS.Timeout | null = null
let syncTimer: NodeJS.Timeout | null = null

// 启动自动同步
const startAutoSync = () => {
  // 启动物流状态自动同步
  orderStore.startLogisticsAutoSync()

  // 设置物流事件监听器
  orderStore.setupLogisticsEventListener()

  // 每30秒同步物流数据
  syncTimer = setInterval(() => {
    if (!loading.value) {
      syncLogisticsData()
    }
  }, 30000)

  // 每60秒刷新订单列表数据
  refreshTimer = setInterval(() => {
    if (!loading.value) {
      loadOrderList()
    }
  }, 60000)
}

// 停止自动同步
const stopAutoSync = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  orderStore.stopLogisticsAutoSync()
}

// 选择变化处理
const handleSelectionChange = (selection: any[]) => {
  selectedOrders.value = selection
}

// 分页处理
const handlePageSizeChange = (size: number) => {
  // 只有当size真正改变时才重置页码并重新加载
  if (pageSize.value !== size) {
    pageSize.value = size
    currentPage.value = 1
    loadOrderList()
  }
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  loadOrderList()
}

// 格式化订单数据供弹窗使用
const formatOrderForDialog = (order: any) => {
  // 同步客户信息
  let customerInfo = {}
  if (order.customerId) {
    const customer = customerStore.getCustomerById(order.customerId)
    if (customer) {
      customerInfo = {
        customerAge: customer.age || null,
        customerHeight: customer.height || null,
        customerWeight: customer.weight || null,
        medicalHistory: customer.medicalHistory || null
      }
    }
  }

  // 计算订单相关字段
  const products = Array.isArray(order.products) ? order.products : []
  const productsText = products.map(p => `${p.name} × ${p.quantity}`).join('，') || ''
  const totalQuantity = products.reduce((sum, p) => sum + (p.quantity || 0), 0) || 0
  const deposit = order.depositAmount || 0
  const codAmount = order.collectAmount || (order.totalAmount || 0) - (order.depositAmount || 0)

  return {
    ...order,
    // 字段映射
    orderNo: order.orderNumber || order.orderNo || '-',
    phone: order.customerPhone || order.receiverPhone || order.phone || '-',
    address: order.receiverAddress || order.address || '-',
    // 客服微信号和订单来源
    serviceWechat: order.serviceWechat || '',
    orderSource: order.orderSource || '',
    // 同步的客户信息
    ...customerInfo,
    // 计算的订单字段
    productsText,
    totalQuantity,
    deposit,
    codAmount,
    // 物流字段映射
    expressCompany: order.expressCompany || null,
    expressNo: order.trackingNumber || order.expressNo || null,
    logisticsStatus: order.logisticsStatus || null
  }
}

// 跳转到订单详情页
const goToOrderDetail = (order: any) => {
  if (order.id) {
    safeNavigator.push(`/order/detail/${order.id}`)
  }
}

// 跳转到客户详情页
const goToCustomerDetail = (order: any) => {
  if (order.customerId) {
    safeNavigator.push(`/customer/detail/${order.customerId}`)
  } else {
    ElMessage.warning('客户ID不存在')
  }
}

// 查看订单详情（弹窗）
const viewOrderDetail = (order: any) => {
  selectedOrder.value = formatOrderForDialog(order)
  orderDetailVisible.value = true
}

// 全屏查看
const showFullscreenView = () => {
  fullscreenVisible.value = true
}

// 打印面单
const printLabel = (order: any) => {
  // 🔥 优先从当前 orderList 获取最新数据（可能已被 loadOrderList 刷新）
  const latestRow = orderList.value.find((o: any) => o.id === order.id) || order
  selectedOrder.value = formatOrderForDialog(latestRow)
  printLabelVisible.value = true
}

// 批量打印面单
const batchPrintLabel = () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要打印面单的订单')
    return
  }
  batchPrintLabelVisible.value = true
}

// 打印面单完成回调（单个）
const handleLabelPrinted = (data: { orderId: string; trackingNumber: string; logisticsCompany: string }) => {
  console.log('[发货列表] 面单打印完成，订单已发货:', data)
  // 刷新列表数据
  loadOrderList()
  updateTabCounts()
}

// 批量打印面单完成回调
const handleBatchLabelPrinted = (data: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }>) => {
  console.log('[发货列表] 批量面单打印完成，共', data.length, '个订单已发货')
  // 刷新列表数据
  loadOrderList()
  updateTabCounts()
}

// 🔥 运单号保存回调（单个）- 用于打印但未确认发货的情况
const handleTrackingSaved = async (_data: { orderId: string; trackingNumber: string; logisticsCompany: string }) => {
  console.log('[发货列表] 运单号已保存（未确认发货）:', _data)
  // 🔥 保存当前选中的ID，刷新后恢复
  const prevSelectedIds = selectedOrders.value.map((o: any) => o.id)
  await loadOrderList()
  // 🔥 恢复选中状态（从新数据中找到相同ID的行）
  if (prevSelectedIds.length > 0) {
    selectedOrders.value = orderList.value.filter((o: any) => prevSelectedIds.includes(o.id))
  }
}

// 🔥 运单号保存回调（批量）- 用于打印但未确认发货的情况
const handleBatchTrackingSaved = async (_data: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }>) => {
  console.log('[发货列表] 批量运单号已保存（未确认发货）:', _data.length, '个')
  // 🔥 保存当前选中的ID，刷新后恢复
  const prevSelectedIds = selectedOrders.value.map((o: any) => o.id)
  await loadOrderList()
  // 🔥 恢复选中状态
  if (prevSelectedIds.length > 0) {
    selectedOrders.value = orderList.value.filter((o: any) => prevSelectedIds.includes(o.id))
  }
}

// 发货
const shipOrder = (order: any) => {
  const latestRow = orderList.value.find((o: any) => o.id === order.id) || order
  selectedOrder.value = formatOrderForDialog(latestRow)
  shipOrderVisible.value = true
}

// 批量导出
const exportSelected = async () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要导出的订单')
    return
  }

  try {
    // 转换订单数据格式（包含完整字段）
    const exportData: ExportOrder[] = selectedOrders.value.map(order => ({
      orderNumber: order.orderNumber || order.orderNo || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || order.phone || '',
      receiverName: order.receiverName || order.customerName || '',
      receiverPhone: order.receiverPhone || order.phone || '',
      receiverAddress: order.receiverAddress || order.address || '',
      products: order.productsText || (Array.isArray(order.products)
        ? order.products.map(p => `${p.name} x${p.quantity}`).join(', ')
        : order.products || ''),
      totalQuantity: order.totalQuantity || (Array.isArray(order.products)
        ? order.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
        : 0),
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || order.deposit || 0,
      codAmount: order.codAmount || (order.totalAmount || 0) - (order.depositAmount || 0),
      customerGender: order.customerGender || '',
      customerAge: order.customerAge || '',
      customerHeight: order.customerHeight || '',
      customerWeight: order.customerWeight || '',
      medicalHistory: order.medicalHistory || '',
      serviceWechat: order.serviceWechat || '',
      // 🔥 新增字段
      markType: order.markType || '',
      salesPersonName: order.salesPersonName || order.createdBy || '',
      paymentMethod: order.paymentMethod || '',
      orderSource: order.orderSource || '',
      customFields: order.customFields || {},
      remark: order.remark || '',
      createTime: order.createTime || '',
      status: order.status || '',
      shippingStatus: order.shippingStatus || '',
      // 物流相关字段
      specifiedExpress: order.specifiedExpress || '',
      expressCompany: order.expressCompany || '',
      expressNo: order.expressNo || '',
      logisticsStatus: order.logisticsStatus || ''
    }))

    const filename = exportBatchOrders(exportData, userStore.isAdmin)
    ElMessage.success(`导出成功：${filename}`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 批量发货
const batchShip = () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要发货的订单')
    return
  }
  batchShipVisible.value = true
}

// 命令处理
const handleCommand = async ({ action, row }: { action: string, row: any }) => {
  selectedOrder.value = row
  switch (action) {
    case 'export':
      // 单个导出（包含完整字段）
      try {
        const exportData: ExportOrder = {
          orderNumber: row.orderNumber || row.orderNo || '',
          customerName: row.customerName || '',
          customerPhone: row.customerPhone || row.phone || '',
          receiverName: row.receiverName || row.customerName || '',
          receiverPhone: row.receiverPhone || row.phone || '',
          receiverAddress: row.receiverAddress || row.address || '',
          products: row.productsText || (Array.isArray(row.products)
            ? row.products.map(p => `${p.name} x${p.quantity}`).join(', ')
            : row.products || ''),
          totalQuantity: row.totalQuantity || (Array.isArray(row.products)
            ? row.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
            : 0),
          totalAmount: row.totalAmount || 0,
          depositAmount: row.depositAmount || row.deposit || 0,
          codAmount: row.codAmount || (row.totalAmount || 0) - (row.depositAmount || 0),
          customerGender: row.customerGender || '',
          customerAge: row.customerAge || '',
          customerHeight: row.customerHeight || '',
          customerWeight: row.customerWeight || '',
          medicalHistory: row.medicalHistory || '',
          serviceWechat: row.serviceWechat || '',
          // 🔥 新增字段
          markType: row.markType || '',
          salesPersonName: row.salesPersonName || row.createdBy || '',
          paymentMethod: row.paymentMethod || '',
          orderSource: row.orderSource || '',
          customFields: row.customFields || {},
          remark: row.remark || '',
          createTime: row.createTime || '',
          status: row.status || '',
          shippingStatus: row.shippingStatus || '',
          // 物流相关字段
          specifiedExpress: row.specifiedExpress || '',
          expressCompany: row.expressCompany || '',
          expressNo: row.expressNo || '',
          logisticsStatus: row.logisticsStatus || ''
        }

        const filename = exportSingleOrder(exportData, userStore.isAdmin)
        ElMessage.success(`导出成功：${filename}`)
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败，请重试')
      }
      break
    case 'return':
      returnOrderVisible.value = true
      break
    case 'cancel':
      cancelOrderVisible.value = true
      break
    case 'confirmShip':
      await confirmSingleShip(row)
      break
  }
}

// 可确认发货的已选订单（有运单号但未发货）
const confirmableSelectedOrders = computed(() => {
  return (selectedOrders.value || []).filter(
    (o: any) => (o.expressNo || o.trackingNumber) && o.status !== 'shipped'
  )
})

// 单个确认发货
const confirmSingleShip = async (order: any) => {
  const tn = order.expressNo || order.trackingNumber || ''
  const company = order.expressCompany || order.logisticsCompany || ''
  if (!tn) {
    ElMessage.warning('该订单没有运单号，无法确认发货')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认将此订单标记为【已发货】吗？\n\n订单号：${order.orderNo || order.orderNumber || ''}\n物流公司：${company}\n运单号：${tn}`,
      '确认发货',
      { type: 'info', confirmButtonText: '确认发货', cancelButtonText: '取消' }
    )
    const { orderApi } = await import('@/api/order')
    const now = new Date().toISOString()
    await orderApi.update(order.id, {
      status: 'shipped',
      trackingNumber: tn,
      expressCompany: company,
      shippedAt: now,
    })
    orderStore.updateOrder(order.id, {
      status: 'shipped',
      trackingNumber: tn,
      expressNo: tn,
      expressCompany: company,
      shippedAt: now,
    })
    ElMessage.success('已确认发货')
    loadOrderList()
    updateTabCounts()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('确认发货失败:', e)
      ElMessage.error('确认发货失败')
    }
  }
}

// 批量确认发货
const batchConfirmShip = async () => {
  const orders = confirmableSelectedOrders.value
  if (orders.length === 0) {
    ElMessage.warning('没有可确认发货的订单（需要有运单号且未发货）')
    return
  }
  try {
    await ElMessageBox.confirm(
      `确认将 ${orders.length} 个订单标记为【已发货】吗？\n\n这些订单都已有运单号，确认后将直接标记为已发货。`,
      '批量确认发货',
      { type: 'info', confirmButtonText: `确认发货 (${orders.length})`, cancelButtonText: '取消' }
    )
    const { orderApi } = await import('@/api/order')
    const now = new Date().toISOString()
    let successCount = 0
    let failCount = 0

    for (const order of orders) {
      try {
        const tn = order.expressNo || order.trackingNumber || ''
        const company = order.expressCompany || ''
        await orderApi.update(order.id, {
          status: 'shipped',
          trackingNumber: tn,
          expressCompany: company,
          shippedAt: now,
        })
        orderStore.updateOrder(order.id, {
          status: 'shipped',
          trackingNumber: tn,
          expressNo: tn,
          expressCompany: company,
          shippedAt: now,
        })
        successCount++
      } catch (e) {
        console.warn('批量确认发货-单个失败:', e)
        failCount++
      }
    }

    if (failCount === 0) {
      ElMessage.success(`成功确认发货 ${successCount} 个订单`)
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个`)
    }
    loadOrderList()
    updateTabCounts()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('批量确认发货失败:', e)
    }
  }
}

// 订单发货成功
const handleOrderShipped = async (shippingData: any) => {
  // 🔥 注意：ShippingDialog已经调用了后端API更新订单状态
  // 这里只需要更新本地缓存和刷新列表，不需要再调用API
  if (shippingData.orderId && shippingData.logisticsCompany && shippingData.trackingNumber) {
    // 🔥 使用智能预计送达计算
    const now = new Date()
    const shippingTime = now.toISOString().slice(0, 19).replace('T', ' ')
    const expectedDeliveryDate = shippingData.estimatedDelivery || calculateEstimatedDelivery({
      logisticsStatus: 'picked_up',
      companyCode: shippingData.logisticsCompany,
      shipDate: shippingTime,
      latestLogisticsInfo: ''
    })

    console.log('[发货列表] 发货数据:', {
      orderId: shippingData.orderId,
      shippingTime,
      expectedDeliveryDate,
      logisticsCompany: shippingData.logisticsCompany,
      trackingNumber: shippingData.trackingNumber
    })

    // 🔥 只更新本地缓存，不再调用API（ShippingDialog已经调用过了）
    orderStore.updateOrder(shippingData.orderId, {
      status: 'shipped',
      shippingTime,
      shippedAt: shippingTime,
      estimatedDeliveryTime: expectedDeliveryDate,
      expectedDeliveryDate: expectedDeliveryDate,
      expressCompany: shippingData.logisticsCompany,
      trackingNumber: shippingData.trackingNumber,
      logisticsStatus: 'picked_up'
    })

    console.log('[发货列表] 本地缓存已更新')
  }
  ElMessage.success('发货成功')
  loadOrderList()
}

// 批量发货成功
const handleBatchShipped = (_orders: any[]) => {
  // 🔥 注意：BatchShippingDialog 已经完成了所有后端API调用和store更新
  // 这里只需要刷新列表即可，不需要再调用 shipOrder
  loadOrderList()
  updateTabCounts()
}

// 订单退回成功
const handleOrderReturned = async (returnData: any) => {
  // 更新订单状态为退回（后端会自动发送通知）
  if (returnData.orderId && returnData.reason) {
    try {
      const returnReason = `${returnData.returnType ? getReturnTypeText(returnData.returnType) + '：' : ''}${returnData.reason}`
      await orderStore.returnOrder(returnData.orderId, returnReason)
      ElMessage.success('订单退回成功！已通知相关人员')
      // 🔥 注意：退回通知已由后端API自动发送，无需前端重复发送
    } catch (error: any) {
      console.error('[发货列表] 退回订单失败:', error)
      ElMessage.error(error?.message || '订单退回失败，请重试')
      return
    }
  }
  loadOrderList()
  updateTabCounts()
}

// 订单取消成功
const handleOrderCancelled = async (cancelData: any) => {
  // 更新订单状态为取消
  if (cancelData.orderId && cancelData.reason) {
    try {
      const cancelReason = `${cancelData.cancelType ? getCancelTypeText(cancelData.cancelType) + '：' : ''}${cancelData.reason}`
      await orderStore.cancelOrder(cancelData.orderId, cancelReason)

      // 发送通知给客户（如果需要）
      const order = orderStore.getOrderById(cancelData.orderId)
      if (order && cancelData.notifyCustomer && cancelData.notificationMethod && cancelData.notificationMethod.length > 0) {
        // 这里可以添加客户通知逻辑
        console.log('通知客户订单已取消:', order.orderNumber)
      }
      ElMessage.success('订单取消成功！')
    } catch (error: any) {
      console.error('[发货列表] 取消订单失败:', error)
      ElMessage.error(error?.message || '订单取消失败，请重试')
      return
    }
  }
  loadOrderList()
  updateTabCounts()
}

// 获取退回类型文本
const getReturnTypeText = (returnType: string) => {
  const typeMap: Record<string, string> = {
    'address_error': '地址信息错误',
    'customer_info_error': '客户信息不符',
    'product_error': '商品信息错误',
    'price_error': '价格信息错误',
    'stock_shortage': '库存不足',
    'customer_request': '客户要求修改',
    'logistics_issue': '物流配送问题',
    'other': '其他原因'
  }
  return typeMap[returnType] || '未知类型'
}

// 获取取消类型文本
const getCancelTypeText = (cancelType: string) => {
  const typeMap: Record<string, string> = {
    'customer_cancel': '客户主动取消',
    'customer_unreachable': '客户联系不上',
    'address_undeliverable': '地址无法配送',
    'out_of_stock': '商品缺货',
    'price_dispute': '价格争议',
    'duplicate_order': '重复订单',
    'fraud_order': '欺诈订单',
    'system_error': '系统错误',
    'other': '其他原因'
  }
  return typeMap[cancelType] || '未知类型'
}

// 草稿管理方法
// 编辑草稿
const editDraft = (_row: any) => {
  ElMessage.info('编辑草稿功能开发中...')
  // TODO: 跳转到订单编辑页面或打开编辑弹窗
}

// 提交草稿
const submitDraft = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交草稿订单 ${row.orderNumber} 吗？提交后将进入审核流程。`,
      '提交确认',
      {
        confirmButtonText: '确定提交',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 更新订单状态为pending，进入审核流程
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders[orderIndex].status = 'pending'
      orderStore.orders[orderIndex].auditStatus = 'pending'
      // 为正常发货单设置3分钟后流转审核
      if (orderStore.orders[orderIndex].markType === 'normal') {
        const transferTime = new Date(Date.now() + 3 * 60 * 1000)
        orderStore.orders[orderIndex].auditTransferTime = transferTime.toISOString().slice(0, 19).replace('T', ' ')
        orderStore.orders[orderIndex].isAuditTransferred = false
      }
    }

    ElMessage.success('草稿已提交，进入审核流程')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交草稿失败:', error)
      ElMessage.error('提交失败，请重试')
    }
  }
}

// 删除草稿
const deleteDraft = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除草稿订单 ${row.orderNumber} 吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    // 从订单列表中删除
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders.splice(orderIndex, 1)
    }

    ElMessage.success('草稿已删除')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除草稿失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 计算各个标签页的订单数量
const updateTabCounts = async () => {
  try {
    // 🔥 从API获取各状态的订单数量
    const { orderApi } = await import('@/api/order')

    // 获取待发货订单数量
    try {
      const pendingResponse = await orderApi.getShippingPending({ page: 1, pageSize: 1 })
      tabCounts.pending = pendingResponse?.data?.total || 0
    } catch (e) {
      console.warn('[发货列表] 获取待发货数量失败:', e)
      tabCounts.pending = 0
    }

    // 获取虚拟待发货订单数量
    try {
      const token = localStorage.getItem('auth_token')
      const vpResponse = await fetch('/api/v1/orders?status=pending_shipment&orderProductType=virtual&markType=virtual_delivery&pageSize=1', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const vpData = await vpResponse.json()
      tabCounts.virtualPending = vpData?.data?.total || vpData?.total || 0
    } catch (e) {
      console.warn('[发货列表] 获取虚拟待发货数量失败:', e)
      tabCounts.virtualPending = 0
    }

    // 草稿订单数量（从store获取，因为草稿通常是本地数据）
    try {
      const draftOrders = await orderStore.getOrdersByShippingStatus('draft')
      tabCounts.draft = Array.isArray(draftOrders) ? draftOrders.length : 0
    } catch (e) {
      console.warn('[发货列表] 获取草稿数量失败:', e)
      tabCounts.draft = 0
    }

    console.log('[发货列表] 标签页数量更新:', tabCounts)
  } catch (error) {
    console.error('更新标签页数量失败:', error)
  }
}

// 被退回订单操作方法
// 编辑被退回订单
const editReturnedOrder = (_row: any) => {
  ElMessage.info('编辑被退回订单功能开发中...')
  // TODO: 跳转到订单编辑页面或打开编辑弹窗
}

// 提审被退回订单
const submitForAudit = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新提审订单 ${row.orderNumber} 吗？提审后将重新进入审核流程。`,
      '提审确认',
      {
        confirmButtonText: '确定提审',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 使用store的重新提审方法
    const result = orderStore.resubmitForAudit(row.id, userStore.user?.name || '系统')

    if (result) {
      ElMessage.success('订单已重新提审，进入审核流程')
      loadOrderList()
      updateTabCounts()
    } else {
      ElMessage.error('重新提审失败，订单状态不符合要求')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提审失败:', error)
      ElMessage.error('提审失败，请重试')
    }
  }
}

// 取消被退回订单
const cancelReturnedOrder = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消订单 ${row.orderNumber} 吗？取消后订单状态将变为已取消。`,
      '取消确认',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '保留',
        type: 'error'
      }
    )

    // 更新订单状态为cancelled
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders[orderIndex].status = 'cancelled'
      orderStore.orders[orderIndex].shippingStatus = 'cancelled'
    }

    ElMessage.success('订单已取消')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      ElMessage.error('取消失败，请重试')
    }
  }
}

// 🔥 获取快递公司颜色配置
const getExpressCompanyStyle = (code: string) => {
  const colorMap: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    'SF': { color: '#000000', bgColor: '#fff2e8', borderColor: '#ff6600' },      // 顺丰 - 橙色
    'YTO': { color: '#1a5fb4', bgColor: '#e8f4fd', borderColor: '#1a5fb4' },     // 圆通 - 蓝色
    'ZTO': { color: '#d4380d', bgColor: '#fff1f0', borderColor: '#ff4d4f' },     // 中通 - 红色
    'STO': { color: '#faad14', bgColor: '#fffbe6', borderColor: '#faad14' },     // 申通 - 黄色
    'YD': { color: '#722ed1', bgColor: '#f9f0ff', borderColor: '#722ed1' },      // 韵达 - 紫色
    'HTKY': { color: '#13c2c2', bgColor: '#e6fffb', borderColor: '#13c2c2' },    // 百世 - 青色
    'JD': { color: '#eb2f96', bgColor: '#fff0f6', borderColor: '#eb2f96' },      // 京东 - 粉色
    'EMS': { color: '#52c41a', bgColor: '#f6ffed', borderColor: '#52c41a' },     // EMS - 绿色
    'YZPY': { color: '#52c41a', bgColor: '#f6ffed', borderColor: '#52c41a' },    // 邮政 - 绿色
    'DBL': { color: '#2f54eb', bgColor: '#f0f5ff', borderColor: '#2f54eb' },     // 德邦 - 深蓝
    'JTSD': { color: '#fa541c', bgColor: '#fff2e8', borderColor: '#fa541c' },    // 极兔 - 橙红
    'OTHER': { color: '#8c8c8c', bgColor: '#fafafa', borderColor: '#d9d9d9' }    // 其他 - 灰色
  }
  const style = colorMap[code] || colorMap['OTHER']
  return {
    color: style.color,
    backgroundColor: style.bgColor,
    borderColor: style.borderColor
  }
}

// 获取物流公司名称
const getExpressCompanyName = (code: string) => {
  const companies: Record<string, string> = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'HTKY': '百世快递',
    'JD': '京东物流',
    'EMS': '中国邮政',
    'DBKD': '德邦快递',
    'UC': '优速快递',
    'JTSD': '极兔速递',
    'YZBK': '邮政包裹',
    'DBL': '德邦快递'
  }
  return companies[code] || code
}

// 获取指定快递文本（别名）
const getExpressCompanyText = getExpressCompanyName

// 获取物流状态类型
const getLogisticsStatusType = (status: string) => {
  // 🔥 使用统一的物流状态配置
  const statusTypes: Record<string, string> = {
    'pending': 'info',
    'picked_up': 'warning',
    'in_transit': 'primary',
    'out_for_delivery': 'warning',
    'delivered': 'success',
    'exception': 'danger',
    'rejected': 'danger',
    'returned': 'info',
    'unknown': 'info'
  }
  return statusTypes[status] || 'info'
}

// 获取物流状态文本
const getLogisticsStatusText = (status: string) => {
  // 🔥 使用统一的物流状态配置
  const statusTexts: Record<string, string> = {
    'pending': '待揽收',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '派送异常',
    'rejected': '拒收',
    'returned': '已退回',
    'unknown': '未知'
  }
  return statusTexts[status] || status || '未知'
}

// 跟踪物流
const trackLogistics = (row: any) => {
  if (!row.expressNo || !row.expressCompany) {
    ElMessage.warning('物流信息不完整，无法跟踪')
    return
  }

  // 跳转到物流跟踪页面
  safeNavigator.push({
    path: '/logistics/track/detail/' + row.expressNo,
    query: {
      company: row.expressCompany
    }
  })
}

// 复制物流单号
const copyExpressNo = async (expressNo: string) => {
  try {
    await navigator.clipboard.writeText(expressNo)
    ElMessage.success('物流单号已复制到剪贴板')
  } catch (error) {
    // 降级处理：创建临时输入框
    const textArea = document.createElement('textarea')
    textArea.value = expressNo
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('物流单号已复制到剪贴板')
  }
}

// 监听标签页变化，重新加载数据
watch(activeTab, () => {
  loadOrderList()
  updateTabCounts()
})

// 监听快速筛选变化，重新加载数据
watch(selectedQuickFilter, () => {
  loadOrderList()
})

// 事件处理函数
const handleOrderAudited = (data?: any): void => {
  console.log('[发货列表] 收到订单审核事件', data)
  if (data && data.approved) {
    console.log('[发货列表] 订单审核通过，刷新列表:', data.order?.orderNumber)
  }
  loadOrderList()
  updateTabCounts()
}

const handleOrderShippedEvent = () => {
  console.log('[发货列表] 收到订单发货事件')
  loadOrderList()
  updateTabCounts()
}

const handleOrderCancelledEvent = () => {
  console.log('[发货列表] 收到订单取消事件')
  loadOrderList()
  updateTabCounts()
}

const handleOrderReturnedEvent = () => {
  console.log('[发货列表] 收到订单退回事件')
  loadOrderList()
  updateTabCounts()
}

const handleRefreshShippingList = () => {
  console.log('[发货列表] 收到刷新列表事件')
  loadOrderList()
  updateTabCounts()
}

onMounted(async () => {
  // 🔥 优化：不再加载全量订单，直接使用专用API
  console.log('[发货列表] 🚀 页面初始化（优化版）...')
  const startTime = Date.now()

  try {
    // 🔥 先加载自定义字段配置，确保列配置正确
    await fieldConfigStore.loadConfig()
    console.log('[发货列表] 自定义字段配置加载完成:', fieldConfigStore.visibleCustomFields.length, '个可见字段')
  } catch (error) {
    console.error('[发货列表] 自定义字段配置加载失败:', error)
  }

  // 🔥 优化：直接加载当前标签页的订单，不再加载全量数据
  await loadOrderList()
  updateTabCounts()

  const loadTime = Date.now() - startTime
  console.log(`[发货列表] ✅ 页面初始化完成，耗时: ${loadTime}ms`)

  startAutoSync() // 启动自动同步
  // 初始化部门数据
  departmentStore.initData()

  // 监听订单事件总线 - 实现订单状态同步
  eventBus.on(EventNames.ORDER_AUDITED, handleOrderAudited)
  eventBus.on(EventNames.ORDER_SHIPPED, handleOrderShippedEvent)
  eventBus.on(EventNames.ORDER_CANCELLED, handleOrderCancelledEvent)
  eventBus.on(EventNames.ORDER_RETURNED, handleOrderReturnedEvent)
  eventBus.on(EventNames.REFRESH_SHIPPING_LIST, handleRefreshShippingList)
  console.log('[发货列表] 事件监听器已注册')
})

onUnmounted(() => {
  // 清理定时器
  stopAutoSync()

  // 清理订单事件总线监听
  eventBus.off(EventNames.ORDER_AUDITED, handleOrderAudited)
  eventBus.off(EventNames.ORDER_SHIPPED, handleOrderShippedEvent)
  eventBus.off(EventNames.ORDER_CANCELLED, handleOrderCancelledEvent)
  eventBus.off(EventNames.ORDER_RETURNED, handleOrderReturnedEvent)
  eventBus.off(EventNames.REFRESH_SHIPPING_LIST, handleRefreshShippingList)
  console.log('[发货列表] 事件监听器已清理')
})

// ==================== 🔥 虚拟发货功能 ====================
const virtualDeliveryDialogVisible = ref(false)
const virtualDeliveryLoading = ref(false)
const currentVirtualOrder = ref<any>(null)
const virtualDeliveryItems = ref<any[]>([])

const openVirtualDeliveryDialog = async (row: any) => {
  currentVirtualOrder.value = row
  // 解析订单中的虚拟商品
  let products: any[] = []
  try {
    products = typeof row.products === 'string' ? JSON.parse(row.products) : (row.products || [])
  } catch { products = [] }

  const virtualProducts = products.filter((p: any) => p.productType === 'virtual')
  if (virtualProducts.length === 0) {
    ElMessage.info('该订单没有虚拟商品')
    return
  }

  const token = localStorage.getItem('auth_token')

  // 🔥 始终从后端查询每个虚拟商品的最新 virtualDeliveryType（以商品管理中的最新设置为准）
  const productDeliveryTypeMap: Record<string, string> = {}
  for (const p of virtualProducts) {
    const pid = p.id || p.productId
    if (pid) {
      try {
        const resp = await fetch(`/api/v1/products/${pid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const result = await resp.json()
        const prod = result?.data || result
        if (prod?.virtualDeliveryType) {
          productDeliveryTypeMap[pid] = prod.virtualDeliveryType
        }
      } catch (_e) {
        console.warn(`[虚拟发货] 查询商品 ${pid} 发货方式失败`)
      }
    }
  }

  virtualDeliveryItems.value = virtualProducts.map((p: any) => {
    const pid = p.id || p.productId
    // 🔥 优先使用从商品表查询的最新值，其次使用订单中存储的值，最后才兜底 none
    const deliveryType = productDeliveryTypeMap[pid] || p.virtualDeliveryType || 'none'
    return {
      productId: pid,
      productName: p.name || p.productName || '未知商品',
      virtualDeliveryType: deliveryType,
      manualContent: '',
      manualResourceLink: '',
      manualResourcePassword: '',
      remark: '',
      cardKeyId: null,
      resourceId: null,
      autoMatchedKey: null as string | null,
      autoMatchedResource: null as any,
      usageInstructions: ''
    }
  })

  virtualDeliveryDialogVisible.value = true

  // 异步自动匹配库存（优先匹配预占给本订单的库存）
  const orderId = row.id || row.orderId
  for (const item of virtualDeliveryItems.value) {
    try {
      if (item.virtualDeliveryType === 'card_key' && item.productId) {
        // 优先查预占给本订单的卡密
        let matched = false
        if (orderId) {
          const resp = await fetch(`/api/v1/virtual-inventory/card-keys?productId=${item.productId}&status=reserved&pageSize=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await resp.json()
          const list = (result?.data?.list || []).filter((ck: any) => ck.reservedOrderId === orderId)
          if (list.length > 0) {
            item.autoMatchedKey = list[0].cardKey || list[0].card_key
            item.cardKeyId = list[0].id
            item.usageInstructions = list[0].usageInstructions || list[0].usage_instructions || ''
            matched = true
          }
        }
        if (!matched) {
          const resp = await fetch(`/api/v1/virtual-inventory/card-keys?productId=${item.productId}&status=unused&pageSize=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await resp.json()
          const list = result?.data?.list || []
          if (list.length > 0) {
            item.autoMatchedKey = list[0].cardKey || list[0].card_key
            item.cardKeyId = list[0].id
            item.usageInstructions = list[0].usageInstructions || list[0].usage_instructions || ''
          }
        }
      } else if (item.virtualDeliveryType === 'resource_link' && item.productId) {
        // 优先查预占给本订单的资源
        let matched = false
        if (orderId) {
          const resp = await fetch(`/api/v1/virtual-inventory/resources?productId=${item.productId}&status=reserved&pageSize=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await resp.json()
          const list = (result?.data?.list || []).filter((rs: any) => rs.reservedOrderId === orderId)
          if (list.length > 0) {
            item.autoMatchedResource = true
            item.resourceId = list[0].id
            item.manualResourceLink = list[0].resourceLink || list[0].resource_link || ''
            item.manualResourcePassword = list[0].resourcePassword || list[0].resource_password || ''
            item.usageInstructions = list[0].usageInstructions || list[0].usage_instructions || ''
            matched = true
          }
        }
        if (!matched) {
          const resp = await fetch(`/api/v1/virtual-inventory/resources?productId=${item.productId}&status=unused&pageSize=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          const result = await resp.json()
          const list = result?.data?.list || []
          if (list.length > 0) {
            item.autoMatchedResource = true
            item.resourceId = list[0].id
            item.manualResourceLink = list[0].resourceLink || list[0].resource_link || ''
            item.manualResourcePassword = list[0].resourcePassword || list[0].resource_password || ''
            item.usageInstructions = list[0].usageInstructions || list[0].usage_instructions || ''
          }
        }
      }
    } catch (e) {
      console.warn('[虚拟发货] 自动匹配库存失败:', e)
    }
  }
}

const confirmVirtualDelivery = async () => {
  if (!currentVirtualOrder.value) return
  virtualDeliveryLoading.value = true

  try {
    const token = localStorage.getItem('auth_token')
    const items = virtualDeliveryItems.value.map(item => ({
      productId: item.productId,
      deliveryType: item.virtualDeliveryType,
      cardKeyId: (!item.manualContent && item.cardKeyId) ? item.cardKeyId : null,
      resourceId: (!item.manualResourceLink?.trim() && item.resourceId) ? item.resourceId : null,
      manualContent: item.manualContent || null,
      manualResourceLink: item.manualResourceLink || null,
      manualResourcePassword: item.manualResourcePassword || null,
      usageInstructions: item.usageInstructions || null,
      remark: item.remark || null
    }))

    const resp = await fetch('/api/v1/virtual-delivery', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderId: currentVirtualOrder.value.id,
        items
      })
    })
    const result = await resp.json()

    if (result.success) {
      ElMessage.success('虚拟发货成功')
      if (result.data?.claimLink) {
        try {
          await navigator.clipboard.writeText(window.location.origin + result.data.claimLink)
          ElMessage.info('领取链接已复制到剪贴板')
        } catch {}
      }
      virtualDeliveryDialogVisible.value = false
      loadOrderList()
      updateTabCounts()
    } else {
      ElMessage.error(result.message || '发货失败')
    }
  } catch (err: any) {
    console.error('虚拟发货失败:', err)
    ElMessage.error('虚拟发货失败')
  } finally {
    virtualDeliveryLoading.value = false
  }
}
</script>

<style scoped>
.shipping-list {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.help-link-btn {
  font-size: 13px;
}

/* 数据概览卡片样式 */
.metrics-grid {
  margin-bottom: 20px;
}

.metrics-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.metric-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.total-orders { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.total-amount { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.shipped-today { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.urgent-orders { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.cod-orders { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
.cod-amount { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

/* 快速筛选样式 */
.quick-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.filter-btn {
  border-radius: 20px;
}

/* 筛选器样式 */
.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  gap: 15px;
  align-items: center;
}

.filter-right {
  display: flex;
  gap: 10px;
}

.date-picker,
.department-select,
.sales-select,
.search-input {
  width: 200px;
}

/* 表格样式 */
.order-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
}

.product-list {
  max-height: 60px;
  overflow-y: auto;
}

.product-item {
  padding: 2px 0;
  font-size: 12px;
}

.amount {
  font-weight: 600;
  color: #409eff;
}

.amount.highlight {
  color: #f56c6c;
  font-weight: 700;
}

.remark-text {
  font-size: 12px;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 1px 3px;
  border-radius: 3px;
}

/* 🔥 指定快递标签样式 - 不同快递公司不同颜色 */
.express-tag {
  display: inline-block;
  font-weight: normal;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid;
  font-size: 12px;
  white-space: nowrap;
}

/* 保留旧样式作为备用 */
.express-highlight-text {
  color: #f56c6c;
  font-weight: 700;
  background-color: #fef0f0;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #f56c6c;
}

:deep(.express-column) {
  background-color: #fafafa !important;
}

:deep(.express-column .cell) {
  font-weight: normal;
}

.no-remark {
  color: #c0c4cc;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  align-items: center;
}

.action-buttons :deep(.el-button) {
  padding: 5px 8px;
  font-size: 12px;
}

.action-buttons :deep(.el-button .el-icon) {
  margin-right: 2px;
}

/* 防止关键列内容换行 */
:deep(.el-table) .cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 行样式 */
:deep(.urgent-row) {
  background-color: #fef0f0;
}

:deep(.cod-row) {
  background-color: #fdf6ec;
}

/* 分页样式 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
}

.page-size-select {
  width: 120px;
}

/* 标签页样式 */
.status-tabs {
  margin-bottom: 20px;
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0 20px 0 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tabs-actions {
  display: flex;
  align-items: center;

  .fullscreen-btn {
    border-radius: 6px;
    font-size: 14px;
    padding: 8px 16px;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 草稿标签灰色样式 */
:deep(.draft-badge .el-badge__content) {
  background-color: #909399 !important;
  border-color: #909399 !important;
}

/* 全屏对话框样式 */
:deep(.fullscreen-dialog) {
  .el-dialog {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;
  }

  .el-dialog__header {
    background: #ffffff;
    color: #374151;
    border-radius: 8px 8px 0 0;
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
  }

  .el-dialog__title {
    font-size: 18px;
    font-weight: 500;
    color: #374151;
  }

  .el-dialog__headerbtn {
    top: 20px;
    right: 24px;

    .el-dialog__close {
      color: #6b7280;
      font-size: 18px;

      &:hover {
        color: #374151;
      }
    }
  }

  .el-dialog__body {
    padding: 0;
    background: #ffffff;
  }
}

.fullscreen-content {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}

/* 全屏筛选器样式 */
.fullscreen-filters {
  background: #f9fafb;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .filter-left {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }

  .filter-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .date-picker,
  .department-select,
  .search-input {
    width: 180px;
  }

  .query-btn {
    background: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 400;
    color: white;
    transition: all 0.2s ease;

    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  }

  .export-btn {
    background: #10b981;
    border: 1px solid #10b981;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 400;
    color: white;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background: #059669;
      border-color: #059669;
    }

    &:disabled {
      background: #d1d5db;
      border-color: #d1d5db;
      cursor: not-allowed;
    }
  }
}

/* 全屏表格样式 */
.fullscreen-table {
  flex: 1;
  padding: 20px;
  background: white;
  margin: 0 20px 20px 20px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  :deep(.el-table) {
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e5e7eb;

    .el-table__header {
      background: #f9fafb;

      th {
        background: #f9fafb !important;
        color: #374151;
        font-weight: 500;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
      }
    }

    .el-table__body {
      tr {
        transition: all 0.2s ease;

        &:hover {
          background: #f8fafc !important;
        }
      }

      td {
        border-bottom: 1px solid #f3f4f6;
        padding: 12px 8px;
        font-size: 14px;
      }
    }
  }

  .operation-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;

    .el-button {
      width: 80px;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;

      &.el-button--primary {
        background: #3b82f6;
        border-color: #3b82f6;

        &:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
      }

      &.el-button--info {
        background: #6b7280;
        border-color: #6b7280;

        &:hover {
          background: #4b5563;
          border-color: #4b5563;
        }
      }

      &.el-button--success {
        background: #10b981;
        border-color: #10b981;

        &:hover {
          background: #059669;
          border-color: #059669;
        }
      }
    }
  }
}

/* 表格文本溢出处理 */
.data-table {
  .el-table__cell {
    .cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-all;
    }
  }

  /* 产品列表特殊处理 */
  .product-list {
    .product-item {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
      margin-bottom: 2px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  /* 备注文本处理 */
  .remark-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

/* 全屏分页样式 */
.fullscreen-pagination {
  padding: 16px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;

  :deep(.el-pagination) {
    .el-pager li {
      border-radius: 4px;
      margin: 0 2px;
      transition: all 0.2s ease;

      &:hover {
        background: #f3f4f6;
      }

      &.is-active {
        background: #3b82f6;
        color: white;
      }
    }

    .btn-prev,
    .btn-next {
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: #f3f4f6;
      }
    }
  }
}

/* 操作记录样式 */
.operation-info {
  .operation-action {
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
    font-size: 13px;
  }

  .operation-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .operation-user {
      color: #409eff;
      font-size: 12px;
      font-weight: 500;
    }

    .operation-time {
      color: #909399;
      font-size: 11px;
    }
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .fullscreen-filters {
    .filter-left {
      width: 100%;
      justify-content: flex-start;
    }

    .filter-right {
      width: 100%;
      justify-content: flex-end;
    }
  }
}

@media (max-width: 768px) {
  .fullscreen-filters {
    .date-picker,
    .department-select,
    .search-input {
      width: 150px;
    }
  }

  .fullscreen-table {
    margin: 0 12px 12px 12px;
    padding: 16px;
  }
}

/* 🔥 物流最新动态样式 */
.logistics-latest {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
  font-size: 13px;
  line-height: 1.4;
  cursor: default;
}

.no-data {
  color: #c0c4cc;
  font-style: italic;
}
</style>
