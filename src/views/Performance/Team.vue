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
            <div class="metric-value">{{ formatSmartNumber(overviewData.totalOrders) }}</div>
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
            <div class="metric-value">{{ formatSmartNumber(overviewData.signOrders) }}</div>
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
          @change="refreshData"
        />
        <el-select
          v-model="selectedDepartment"
          placeholder="选择部门"
          class="department-select"
          size="default"
          @change="refreshData"
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
          @change="refreshData"
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
        ref="teamTableRef"
        :data="memberList"
        stripe
        class="data-table"
        :row-class-name="getRowClassName"
        border
        show-summary
        :summary-method="getSummaries"
        @click="handleTableClick"
      >
        <el-table-column type="index" label="序号" width="60" align="center" fixed="left" />
        <el-table-column prop="name" label="成员" min-width="80" align="center" fixed="left" show-overflow-tooltip />

        <!-- 动态渲染列 -->
        <el-table-column
          v-for="column in dynamicColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :align="column.align"
          :show-overflow-tooltip="column.prop === 'department' || column.prop === 'username'"
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
            <!-- 订单数量字段 - 可点击查看对应订单详情（带权限控制） -->
            <el-link
              v-else-if="column.prop.includes('Count') && row[column.prop] > 0 && canViewMemberOrders(row)"
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
            <!-- 🔥 权限控制：只有有权限查看该成员订单的用户才能看到查看详情按钮 -->
            <el-button
              v-if="canViewMemberOrders(row)"
              type="primary"
              size="small"
              @click="viewMemberDetail(row)"
            >
              查看详情
            </el-button>
            <!-- 无权限时显示占位符或不显示 -->
            <span v-else class="no-permission-text">-</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[30, 50, 100, 200, 300, 500, 1000]"
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
            <el-table-column prop="orderNo" label="订单号" width="170" show-overflow-tooltip>
              <template #default="{ row }">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <el-tag v-if="row.products && row.products.length > 0 && row.products.every((p: any) => p.productType === 'virtual')" type="warning" size="small" effect="light">虚拟</el-tag>
                  <el-tag v-else-if="row.products && row.products.some((p: any) => p.productType === 'virtual') && row.products.some((p: any) => p.productType !== 'virtual')" size="small" effect="light" color="#7B68EE" style="color:#fff;border:none;">混合</el-tag>
                  <span>{{ row.orderNo }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="orderDate" label="下单时间" width="160" show-overflow-tooltip>
              <template #default="{ row }">
                {{ formatBeijingTime(row.orderDate) }}
              </template>
            </el-table-column>
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
            <el-table-column prop="trackingNumber" label="快递单号" width="160" show-overflow-tooltip>
              <template #default="{ row }">
                <el-link
                  v-if="row.trackingNumber"
                  type="primary"
                  @click="handleTrackingNoClick(row.trackingNumber, row.expressCompany)"
                >
                  {{ row.trackingNumber }}
                </el-link>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <!-- 🔥 阶段3：分享标记列 -->
            <el-table-column label="分享" width="100" align="center">
              <template #default="{ row }">
                <el-tooltip
                  v-if="row.shareInfo"
                  placement="top"
                  :show-after="200"
                >
                  <template #content>
                    <div style="max-width: 260px;">
                      <div v-if="row.shareInfo.isShared" style="margin-bottom: 4px;">
                        <strong>已分享出去</strong>（保留 {{ row.shareInfo.ownerRetainedPercentage }}%）
                      </div>
                      <div v-else-if="row.shareInfo.isReceived" style="margin-bottom: 4px;">
                        <strong>接收到的分享</strong>
                      </div>
                      <div v-for="(m, i) in row.shareInfo.members" :key="i" style="font-size: 12px;">
                        {{ m.userName }}：{{ m.percentage }}%（¥{{ m.shareAmount.toLocaleString() }}）
                      </div>
                    </div>
                  </template>
                  <el-tag
                    v-if="row.shareInfo.isShared"
                    type="warning"
                    size="small"
                    effect="light"
                  >
                    已分享
                  </el-tag>
                  <el-tag
                    v-else-if="row.shareInfo.isReceived"
                    type="success"
                    size="small"
                    effect="light"
                  >
                    已接收
                  </el-tag>
                  <el-tag v-else type="info" size="small" effect="light">有分享</el-tag>
                </el-tooltip>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="productDetails" label="产品详情" min-width="200" show-overflow-tooltip>
              <template #default="{ row }">
                <div class="product-details-cell">
                  <template v-if="row.products && row.products.length > 0">
                    <template v-for="(p, idx) in row.products" :key="idx">
                      <span v-if="idx > 0">、</span>
                      <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 2px;">虚拟</el-tag>
                      <el-tag v-else size="small" effect="light" style="margin-right: 2px;">实物</el-tag>
                      {{ p.name || p.productName }} x{{ p.quantity }}
                    </template>
                  </template>
                  <template v-else>{{ row.productDetails }}</template>
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
              :page-sizes="[10, 20, 30, 50, 100, 200, 300, 500, 1000]"
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
            <span class="value">{{ orderTypeTotal }}</span>
          </div>
        </div>

        <!-- 订单列表 -->
        <el-table :data="orderTypeOrders" stripe border class="order-table" v-loading="orderTypeLoading">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 4px;">
                <el-tag v-if="row.products && row.products.length > 0 && row.products.every((p: any) => p.productType === 'virtual')" type="warning" size="small" effect="light">虚拟</el-tag>
                <el-tag v-else-if="row.products && row.products.some((p: any) => p.productType === 'virtual') && row.products.some((p: any) => p.productType !== 'virtual')" size="small" effect="light" color="#7B68EE" style="color:#fff;border:none;">混合</el-tag>
                <span>{{ row.orderNo }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="orderDate" label="下单时间" width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatBeijingTime(row.orderDate) }}
            </template>
          </el-table-column>
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
              <el-link
                v-if="row.trackingNumber"
                type="primary"
                @click="handleTrackingNoClick(row.trackingNumber, row.expressCompany)"
              >
                {{ row.trackingNumber }}
              </el-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <!-- 🔥 分享标记列 -->
          <el-table-column label="分享" width="100" align="center">
            <template #default="{ row }">
              <el-tooltip
                v-if="row.shareInfo"
                placement="top"
                :show-after="200"
              >
                <template #content>
                  <div style="max-width: 260px;">
                    <div v-if="row.shareInfo.isShared" style="margin-bottom: 4px;">
                      <strong>已分享出去</strong>（保留 {{ row.shareInfo.ownerRetainedPercentage }}%）
                    </div>
                    <div v-else-if="row.shareInfo.isReceived" style="margin-bottom: 4px;">
                      <strong>接收到的分享</strong>
                    </div>
                    <div v-for="(m, i) in row.shareInfo.members" :key="i" style="font-size: 12px;">
                      {{ m.userName }}：{{ m.percentage }}%（¥{{ m.shareAmount.toLocaleString() }}）
                    </div>
                  </div>
                </template>
                <el-tag
                  v-if="row.shareInfo.isShared"
                  type="warning"
                  size="small"
                  effect="light"
                >
                  已分享
                </el-tag>
                <el-tag
                  v-else-if="row.shareInfo.isReceived"
                  type="success"
                  size="small"
                  effect="light"
                >
                  已接收
                </el-tag>
                <el-tag v-else type="info" size="small" effect="light">有分享</el-tag>
              </el-tooltip>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="productDetails" label="产品详情" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.products && row.products.length > 0">
                <template v-for="(p, idx) in row.products" :key="idx">
                  <span v-if="idx > 0">、</span>
                  <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 2px;">虚拟</el-tag>
                  <el-tag v-else size="small" effect="light" style="margin-right: 2px;">实物</el-tag>
                  {{ p.name || p.productName }} x{{ p.quantity }}
                </template>
              </template>
              <template v-else>{{ row.productDetails }}</template>
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

        <!-- 分页 -->
        <div class="order-pagination">
          <el-pagination
            v-model:current-page="orderTypeCurrentPage"
            v-model:page-size="orderTypePageSize"
            :page-sizes="[10, 20, 30, 50, 100, 200, 300, 500, 1000]"
            :total="orderTypeTotal"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="handleOrderTypePageChange"
            @size-change="handleOrderTypeSizeChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 🔥 合计订单弹窗 -->
    <el-dialog
      v-model="summaryOrdersDialogVisible"
      :title="summaryOrdersTitle"
      width="90%"
      top="5vh"
      class="summary-orders-dialog"
    >
      <div class="summary-orders-content">
        <el-table :data="paginatedSummaryOrders" stripe border class="order-table" v-loading="summaryOrdersLoading">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 4px;">
                <el-tag v-if="row.products && row.products.length > 0 && row.products.every((p: any) => p.productType === 'virtual')" type="warning" size="small" effect="light">虚拟</el-tag>
                <el-tag v-else-if="row.products && row.products.some((p: any) => p.productType === 'virtual') && row.products.some((p: any) => p.productType !== 'virtual')" size="small" effect="light" color="#7B68EE" style="color:#fff;border:none;">混合</el-tag>
                <span>{{ row.orderNo }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="orderDate" label="下单时间" width="160" show-overflow-tooltip>
            <template #default="{ row }">
              {{ formatBeijingTime(row.orderDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="customerName" label="客户姓名" width="110" show-overflow-tooltip />
          <el-table-column prop="createdByName" label="下单员" width="100" show-overflow-tooltip />
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
              <el-link
                v-if="row.trackingNumber && row.trackingNumber !== '暂无'"
                type="primary"
                @click="handleTrackingNoClick(row.trackingNumber, row.logisticsCompany)"
              >
                {{ row.trackingNumber }}
              </el-link>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="productDetails" label="产品详情" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <template v-if="row.products && row.products.length > 0">
                <template v-for="(p, idx) in row.products" :key="idx">
                  <span v-if="idx > 0">、</span>
                  <el-tag v-if="p.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 2px;">虚拟</el-tag>
                  <el-tag v-else size="small" effect="light" style="margin-right: 2px;">实物</el-tag>
                  {{ p.name || p.productName }} x{{ p.quantity }}
                </template>
              </template>
              <template v-else>{{ row.productDetails }}</template>
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

        <!-- 分页 -->
        <div class="order-pagination">
          <el-pagination
            v-model:current-page="summaryOrdersPage"
            v-model:page-size="summaryOrdersPageSize"
            :page-sizes="[10, 20, 30, 50, 100, 200, 300, 500, 1000]"
            :total="summaryOrdersTotal"
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
            max-height="calc(100vh - 300px)"
            style="width: 100%;"
            show-summary
            :summary-method="getFullscreenSummaries"
            @click="handleTableClick"
          >
            <el-table-column type="index" label="序号" width="60" align="center" fixed="left" />
            <el-table-column prop="name" label="成员" min-width="80" align="center" fixed="left" show-overflow-tooltip />

            <!-- 动态渲染列 - 与主视图保持一致 -->
            <el-table-column
              v-for="column in dynamicColumns"
              :key="column.prop"
              :prop="column.prop"
              :label="column.label"
              :width="column.width"
              :min-width="column.minWidth"
              :align="column.align"
              :show-overflow-tooltip="column.prop === 'department' || column.prop === 'username'"
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
                <!-- 订单数量字段 - 可点击查看对应订单详情（带权限控制） -->
                <el-link
                  v-else-if="column.prop.includes('Count') && row[column.prop] > 0 && canViewMemberOrders(row)"
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

            <el-table-column label="操作" width="90" align="center" fixed="right">
              <template #default="{ row }">
                <!-- 🔥 权限控制：只有有权限查看该成员订单才能看到操作按钮 -->
                <div v-if="canViewMemberOrders(row)" class="operation-buttons">
                  <el-button type="primary" size="small" @click="viewMemberDetail(row)">
                    查看详情
                  </el-button>
                </div>
                <!-- 无权限时显示占位符 -->
                <span v-else class="no-permission-text">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="fullscreen-pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[30, 50, 100, 200, 300, 500, 1000]"
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
import { ref, reactive, computed, onMounted, watch, onUnmounted, h, type VNode } from 'vue'
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
import { formatDateTime as formatBeijingTime } from '@/utils/date'
import { getOrderStatusText, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { getTeamStats } from '@/api/performance'
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
  id: string  // 🔥 修复：用户ID是字符串类型
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

// 表格引用
const teamTableRef = ref()

// 响应式数据
const loading = ref(false)
const selectedQuickFilter = ref('today')
// 初始化为今日日期
const today = new Date()
// 🔥 使用本地时间格式化日期，避免UTC时区问题
const formatDateInit = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
const dateRange = ref<[string, string]>([formatDateInit(today), formatDateInit(today)])
const selectedDepartment = ref('')
const sortBy = ref('orderAmount')

// 🔥 后端API数据缓存
const apiTeamData = ref<{
  members: any[]
  summary: {
    totalPerformance: number
    totalOrders: number
    avgPerformance: number
    signOrders: number
    signRate: number
    signPerformance: number
    memberCount: number
  }
  total: number
} | null>(null)
const useBackendAPI = ref(true) // 是否使用后端API

// 计算可访问的部门列表（根据用户角色）
const accessibleDepartments = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return []

  // 获取部门列表，确保有数据
  const deptList = departmentStore.departmentList || []
  console.log('[团队业绩] 部门列表:', deptList.map(d => ({ id: d.id, name: d.name })))
  console.log('[团队业绩] 当前用户部门信息:', {
    departmentId: currentUser.departmentId,
    department: currentUser.department,
    departmentName: currentUser.departmentName
  })

  // 超级管理员和管理员可以看到所有部门
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return deptList
  }

  // 部门经理和销售员只能看到自己所在的部门
  if (currentUser.role === 'department_manager' || currentUser.role === 'sales_staff' || currentUser.role === 'sales') {
    const userDeptId = currentUser.departmentId
    const userDeptName = currentUser.departmentName || currentUser.department

    // 🔥 修复：优先通过部门ID匹配
    let filtered = deptList.filter(dept => String(dept.id) === String(userDeptId))

    // 如果通过ID没找到，尝试通过名称匹配
    if (filtered.length === 0 && userDeptName) {
      filtered = deptList.filter(dept => dept.name === userDeptName)
    }

    console.log('[团队业绩] 用户部门ID:', userDeptId, '部门名称:', userDeptName, '可访问部门:', filtered.map(d => ({ id: d.id, name: d.name })))
    return filtered
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
  { prop: 'department', label: '部门', minWidth: 80, align: 'center', visible: true },
  { prop: 'username', label: '用户名', minWidth: 80, align: 'center', visible: true },
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

// 检查是否有权限查看成员订单详情
// 权限规则：
// 🔥 权限控制：判断当前用户是否可以点击查看某成员的订单
// - 超级管理员和管理员：可以查看所有人的订单
// - 部门经理：可以查看本部门所有成员的订单
// - 销售员：只能查看自己的订单
const canViewMemberOrders = (member: TeamMember) => {
  const currentUser = userStore.currentUser
  if (!currentUser) return false

  const role = currentUser.role

  // 超级管理员和管理员可以查看所有
  if (role === 'super_admin' || role === 'admin') {
    return true
  }

  // 部门经理可以查看本部门所有成员的订单
  if (role === 'department_manager') {
    // 🔥 【简化逻辑】经理可以查看列表中显示的所有成员
    // 因为 memberList 已经根据部门过滤了，所以列表中的成员都是同部门的
    console.log(`[权限检查] 经理 ${currentUser.name} 可以查看成员 ${member.name} 的订单`)
    return true
  }

  // 销售员只能查看自己的订单
  if (role === 'sales_staff' || role === 'sales') {
    // 🔥 修复：通过ID或用户名匹配
    return String(member.id) === String(currentUser.id) ||
           String(member.username) === String(currentUser.username)
  }

  return false
}

// 导出统计数据
const exportStats = reactive({
  todayCount: 0,
  weekCount: 0,
  monthCount: 0
})

// 所有用户列表
// 🔥 【修复】过滤掉禁用用户，只返回启用的用户
const allUsers = computed(() => {
  return (userStore.users || []).filter(u => !u.status || u.status === 'active')
})
const currentPage = ref(1)
const pageSize = ref(30)
const total = ref(100)

// 🔥 【修复】检查用户是否启用
const isUserEnabledForCount = (user: any) => {
  return !user.status || user.status === 'active'
}

// 计算团队成员数量的辅助函数
const getTeamMemberCount = () => {
  const currentUser = userStore.currentUser
  if (!currentUser) return 0

  let count = 0

  if (userStore.isSuperAdmin || currentUser.role === 'admin') {
    // 超级管理员：所有启用的销售人员
    count = userStore.users?.filter(user =>
      isUserEnabledForCount(user) &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ).length || 0
  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：本部门启用的成员
    count = userStore.users?.filter(user =>
      isUserEnabledForCount(user) &&
      user.departmentId === currentUser.departmentId &&
      (user.role === 'sales_staff' || user.role === 'department_manager')
    ).length || 0
  } else {
    // 普通成员：同部门启用的成员
    count = userStore.users?.filter(user =>
      isUserEnabledForCount(user) &&
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
const orderPageSize = ref(10)
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
const orderTypePageSize = ref(10)

// 订单类型分页列表
const paginatedOrderTypeList = computed(() => {
  const start = (orderTypeCurrentPage.value - 1) * orderTypePageSize.value
  const end = start + orderTypePageSize.value
  return orderTypeOrders.value.slice(start, end)
})

/**
 * 🔥 【守恒定律核心函数】对后端API返回的成员数据进行订单数拆分
 * 后端API已处理了金额拆分（金额正确），但未处理订单数拆分（订单数错误）
 * 此函数根据分享记录，对每个成员的订单数按比例进行加减调整
 *
 * 例：张女士有2个订单，分享给梁和何
 *   - 订单1(¥200): 张女士保留20%, 梁50%, 何30%
 *   - 订单2(¥100): 张女士保留20%, 梁30%, 何50%
 *   结果：张女士=0.4单, 梁=0.8单, 何=0.8单, 合计=2.0单 ✅ 守恒
 */
const applyShareOrderCountSplitting = (members: any[]) => {
  const shares = performanceStore.performanceShares
  if (!shares || shares.length === 0) return members

  // 构建成员ID到成员数据的映射（深拷贝避免污染原始数据）
  const memberMap = new Map<string, any>()
  const result = members.map((m: any) => {
    const copy = { ...m }
    memberMap.set(String(m.id), copy)
    return copy
  })

  // 遍历所有有效的分享记录
  shares.forEach((share: any) => {
    if (share.status !== 'active' && share.status !== 'completed') return

    // 日期筛选：确保分享记录对应的订单在当前查询范围内
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      const originalOrder = orderStore.orders.find((o: any) =>
        o.orderNumber === share.orderNumber || o.id === share.orderId
      )
      if (originalOrder) {
        let orderDateStr = (originalOrder.orderDate || originalOrder.createTime || '')?.split(' ')[0] || ''
        orderDateStr = orderDateStr.replace(/\//g, '-')
        const s = startDate.replace(/\//g, '-')
        const e = endDate.replace(/\//g, '-')
        if (orderDateStr && (orderDateStr < s || orderDateStr > e)) return
      } else {
        let shareDateStr = (share.createTime || '')?.split(' ')[0] || ''
        shareDateStr = shareDateStr.replace(/\//g, '-')
        const s = startDate.replace(/\//g, '-')
        const e = endDate.replace(/\//g, '-')
        if (shareDateStr && (shareDateStr < s || shareDateStr > e)) return
      }
    }

    const totalSharedPct = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)
    const sharedRatio = totalSharedPct / 100

    // 查找原始订单以确定其状态（用于子状态订单数拆分）
    const originalOrder = orderStore.orders.find((o: any) =>
      o.orderNumber === share.orderNumber || o.id === share.orderId
    )
    const orderStatus = originalOrder?.status || ''

    // 1. 原始下单人：扣除分享出去的订单数比例
    const creator = memberMap.get(String(share.createdById))
    if (creator) {
      creator.orderCount = (creator.orderCount || 0) - sharedRatio
      if (orderStatus === 'shipped' || orderStatus === 'delivered') {
        creator.shipCount = (creator.shipCount || 0) - sharedRatio
      }
      if (orderStatus === 'delivered') {
        creator.signCount = (creator.signCount || 0) - sharedRatio
      }
      if (orderStatus === 'shipped' && originalOrder?.logisticsStatus !== 'delivered') {
        creator.transitCount = (creator.transitCount || 0) - sharedRatio
      }
      if (orderStatus === 'rejected' || orderStatus === 'rejected_returned') {
        creator.rejectCount = (creator.rejectCount || 0) - sharedRatio
      }
      if (orderStatus === 'logistics_returned') {
        creator.returnCount = (creator.returnCount || 0) - sharedRatio
      }
    }

    // 2. 分享接收人：加上接收到的订单数比例
    ;(share.shareMembers || []).forEach((sm: any) => {
      const receiver = memberMap.get(String(sm.userId))
      if (receiver) {
        const myRatio = (sm.percentage || 0) / 100
        receiver.orderCount = (receiver.orderCount || 0) + myRatio
        if (orderStatus === 'shipped' || orderStatus === 'delivered') {
          receiver.shipCount = (receiver.shipCount || 0) + myRatio
        }
        if (orderStatus === 'delivered') {
          receiver.signCount = (receiver.signCount || 0) + myRatio
        }
        if (orderStatus === 'shipped' && originalOrder?.logisticsStatus !== 'delivered') {
          receiver.transitCount = (receiver.transitCount || 0) + myRatio
        }
        if (orderStatus === 'rejected' || orderStatus === 'rejected_returned') {
          receiver.rejectCount = (receiver.rejectCount || 0) + myRatio
        }
        if (orderStatus === 'logistics_returned') {
          receiver.returnCount = (receiver.returnCount || 0) + myRatio
        }
      }
    })
  })

  // 确保所有值不小于0，并重新计算比率
  result.forEach((m: any) => {
    m.orderCount = Math.max(0, m.orderCount || 0)
    m.shipCount = Math.max(0, m.shipCount || 0)
    m.signCount = Math.max(0, m.signCount || 0)
    m.transitCount = Math.max(0, m.transitCount || 0)
    m.rejectCount = Math.max(0, m.rejectCount || 0)
    m.returnCount = Math.max(0, m.returnCount || 0)

    const oc = m.orderCount || 0
    m.shipRate = oc > 0 ? Number(((m.shipCount / oc) * 100).toFixed(1)) : 0
    m.signRate = oc > 0 ? Number(((m.signCount / oc) * 100).toFixed(1)) : 0
    m.transitRate = oc > 0 ? Number(((m.transitCount / oc) * 100).toFixed(1)) : 0
    m.rejectRate = oc > 0 ? Number(((m.rejectCount / oc) * 100).toFixed(1)) : 0
    m.returnRate = oc > 0 ? Number(((m.returnCount / oc) * 100).toFixed(1)) : 0
  })

  console.log('[团队业绩] ✅ 分享订单数拆分完成:', result.map((m: any) => ({
    name: m.name, orderCount: typeof m.orderCount === 'number' ? m.orderCount.toFixed(1) : m.orderCount, orderAmount: m.orderAmount
  })))

  return result
}

// 数据概览 - 从memberList汇总（确保守恒定律）
const overviewData = computed(() => {
  // 🔥 【关键修复】始终从memberList汇总数据，确保业绩分享后的守恒
  // memberList中每个成员的 orderAmount/orderCount 已经是分享调整后的净值
  // 所有成员的净值之和 = 原始订单总值（业绩守恒）
  const members = memberList.value
  if (!members || members.length === 0) {
    // 如果memberList为空，尝试使用后端API概览数据
    if (apiTeamData.value && apiTeamData.value.summary) {
      return apiTeamData.value.summary
    }
    return {
      totalPerformance: 0,
      totalOrders: 0,
      avgPerformance: 0,
      signOrders: 0,
      signRate: 0,
      signPerformance: 0
    }
  }

  const totalPerformance = members.reduce((sum: number, m: any) => sum + (m.orderAmount || 0), 0)
  const totalOrders = members.reduce((sum: number, m: any) => sum + (m.orderCount || 0), 0)
  const signOrders = members.reduce((sum: number, m: any) => sum + (m.signCount || 0), 0)
  const signPerformance = members.reduce((sum: number, m: any) => sum + (m.signAmount || 0), 0)
  const signRate = totalOrders > 0 ? (signOrders / totalOrders) * 100 : 0

  // 计算人均业绩
  const teamMemberCount = members.length
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
  { label: '上月', value: 'lastMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 成员列表 - 优先使用后端API数据
const memberList = computed(() => {
  // 🔥 优先使用后端API数据
  if (apiTeamData.value && apiTeamData.value.members && apiTeamData.value.members.length > 0) {
    console.log('[团队业绩] 使用后端API成员列表数据，应用分享订单数拆分')
    // 🔥 【关键修复】后端API只处理了金额拆分，没有处理订单数拆分
    // 必须在前端补充订单数的守恒拆分逻辑
    return applyShareOrderCountSplitting(apiTeamData.value.members)
  }

  // 降级方案：前端计算
  const currentUser = userStore.currentUser
  if (!currentUser) {
    console.log('[团队业绩] 当前用户不存在')
    return []
  }

  // 🔥 修复：分别获取部门ID和部门名称
  const userDeptId = currentUser.departmentId
  const userDeptName = currentUser.departmentName || currentUser.department

  console.log('[团队业绩] 当前用户:', currentUser.name, '角色:', currentUser.role, '部门ID:', userDeptId, '部门名称:', userDeptName)
  console.log('[团队业绩] 系统总用户数:', userStore.users?.length || 0)

  // 获取可访问的用户列表（先声明）
  let accessibleUsers: unknown[] = []

  // 🔥 修复：用户匹配函数，同时支持ID和名称匹配
  const matchUserDepartment = (user: any) => {
    // 获取目标用户的部门信息
    const targetDeptId = String(user.departmentId || '').toLowerCase().trim()
    const targetDeptName = (user.department || user.departmentName || '').toLowerCase().trim()

    // 当前用户的部门信息
    const currentDeptIdStr = String(userDeptId || '').toLowerCase().trim()
    const currentDeptNameStr = (userDeptName || '').toLowerCase().trim()

    // 🔥 【关键修复】如果当前用户没有部门名称，从departmentStore获取
    let resolvedCurrentDeptName = currentDeptNameStr
    if (!resolvedCurrentDeptName && currentDeptIdStr) {
      const dept = departmentStore.departments?.find((d: any) => String(d.id).toLowerCase() === currentDeptIdStr)
      if (dept) {
        resolvedCurrentDeptName = (dept.name || '').toLowerCase().trim()
      }
    }

    // 🔥 【关键修复】如果目标用户没有部门ID，从departmentStore通过名称查找ID
    let resolvedTargetDeptId = targetDeptId
    if (!resolvedTargetDeptId && targetDeptName) {
      const dept = departmentStore.departments?.find((d: any) => (d.name || '').toLowerCase().trim() === targetDeptName)
      if (dept) {
        resolvedTargetDeptId = String(dept.id).toLowerCase().trim()
      }
    }

    // 🔥 【关键修复】如果目标用户没有部门名称，从departmentStore通过ID查找名称
    let resolvedTargetDeptName = targetDeptName
    if (!resolvedTargetDeptName && targetDeptId) {
      const dept = departmentStore.departments?.find((d: any) => String(d.id).toLowerCase() === targetDeptId)
      if (dept) {
        resolvedTargetDeptName = (dept.name || '').toLowerCase().trim()
      }
    }

    // 🔥 调试日志
    console.log(`[团队业绩] 匹配用户 ${user.name}: 目标ID=${targetDeptId}→${resolvedTargetDeptId}, 目标名=${targetDeptName}→${resolvedTargetDeptName}, 当前ID=${currentDeptIdStr}, 当前名=${currentDeptNameStr}→${resolvedCurrentDeptName}`)

    // 通过部门ID匹配（使用解析后的ID）
    if (currentDeptIdStr && resolvedTargetDeptId && currentDeptIdStr === resolvedTargetDeptId) {
      console.log(`[团队业绩] ✅ 用户 ${user.name} 通过部门ID匹配`)
      return true
    }

    // 通过部门名称匹配（使用解析后的名称）
    if (resolvedCurrentDeptName && resolvedTargetDeptName && resolvedCurrentDeptName === resolvedTargetDeptName) {
      console.log(`[团队业绩] ✅ 用户 ${user.name} 通过部门名称匹配`)
      return true
    }

    // 🔥 新增：模糊匹配（名称包含关系）
    if (resolvedCurrentDeptName && resolvedTargetDeptName) {
      if (resolvedTargetDeptName.includes(resolvedCurrentDeptName) || resolvedCurrentDeptName.includes(resolvedTargetDeptName)) {
        console.log(`[团队业绩] ✅ 用户 ${user.name} 通过部门名称模糊匹配`)
        return true
      }
    }

    console.log(`[团队业绩] ❌ 用户 ${user.name} 部门不匹配`)
    return false
  }

  // 🔥 调试：打印所有用户的部门信息
  console.log('[团队业绩] 所有用户部门信息:', userStore.users?.map(u => ({
    id: u.id,
    name: u.name,
    departmentId: u.departmentId,
    department: u.department,
    departmentName: u.departmentName,
    status: u.status,
    employmentStatus: u.employmentStatus
  })))

  // 🔥 【关键修复】过滤掉禁用状态的用户
  // 禁用用户(status !== 'active')：账号无法登录，数据完全隐藏不可见
  // 离职用户(employmentStatus === 'resigned')：账号无法登录，但历史数据仍然可见
  const isUserEnabled = (user: any) => {
    // 如果status字段存在且不是active，则用户被禁用
    if (user.status && user.status !== 'active') {
      return false
    }
    return true
  }

  // 层级权限控制
  if (userStore.isSuperAdmin || currentUser.role === 'admin' || currentUser.role === 'super_admin') {
    // 超级管理员：查看所有启用的用户
    accessibleUsers = (userStore.users || []).filter(isUserEnabled)
    console.log('[团队业绩] 超级管理员，可访问所有启用用户:', accessibleUsers.length)

  } else if (userStore.isManager || currentUser.role === 'department_manager') {
    // 部门经理：查看本部门启用的成员
    accessibleUsers = (userStore.users || []).filter(u => isUserEnabled(u) && matchUserDepartment(u))
    console.log('[团队业绩] 部门经理，可访问本部门启用用户:', accessibleUsers.length, '部门ID:', userDeptId, '部门名称:', userDeptName)

  } else {
    // 普通成员（销售员等）：查看同部门启用的成员
    accessibleUsers = (userStore.users || []).filter(u => isUserEnabled(u) && matchUserDepartment(u))
    console.log('[团队业绩] 普通成员，可访问同部门启用用户:', accessibleUsers.length, '部门ID:', userDeptId, '部门名称:', userDeptName)
  }

  // 应用部门筛选（筛选器使用的是部门ID）
  if (selectedDepartment.value) {
    console.log('[团队业绩] 应用部门筛选:', selectedDepartment.value)
    const beforeFilter = accessibleUsers.length
    // 🔥 修复：从部门列表获取选中部门的名称，用于匹配
    const selectedDept = departmentStore.departmentList?.find(d => String(d.id) === String(selectedDepartment.value))
    const selectedDeptName = selectedDept?.name
    console.log('[团队业绩] 选中部门:', selectedDept?.name, '(ID:', selectedDepartment.value, ')')

    accessibleUsers = accessibleUsers.filter((user: unknown) => {
      // 通过部门ID匹配（忽略大小写）
      const userDeptIdStr = String(user.departmentId || '').toLowerCase()
      const selectedDeptIdStr = String(selectedDepartment.value).toLowerCase()
      if (userDeptIdStr === selectedDeptIdStr) {
        return true
      }
      // 通过部门名称匹配（忽略大小写）
      if (selectedDeptName) {
        const userDeptNameLower = (user.department || user.departmentName || '').toLowerCase()
        const selectedDeptNameLower = selectedDeptName.toLowerCase()
        if (userDeptNameLower === selectedDeptNameLower) {
          return true
        }
      }
      return false
    })
    console.log('[团队业绩] 筛选后用户数:', accessibleUsers.length, '(筛选前:', beforeFilter, ')')
  }



  // 直接返回成员列表，不在computed中修改数据
  return accessibleUsers.map((user: unknown) => {
    // 🔥 计算该用户的业绩数据 - 使用新的业绩计算规则
    let userOrders = orderStore.orders.filter(order => {
      // 先检查业绩计算规则
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer' && order.markType !== 'normal') return false
      if (excludedStatuses.includes(order.status)) return false

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
        let orderDateStr = order.orderDate || order.createTime || ''
        // 处理各种日期格式：YYYY/MM/DD HH:mm:ss 或 YYYY-MM-DD HH:mm:ss
        orderDateStr = orderDateStr.split(' ')[0].replace(/\//g, '-')
        // 确保比较格式一致 (YYYY-MM-DD)
        const start = startDate.replace(/\//g, '-')
        const end = endDate.replace(/\//g, '-')
        return orderDateStr >= start && orderDateStr <= end
      })
    }

    const orderCount = userOrders.length
    const orderAmount = userOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)


    // 🔥 业绩分享：金额和订单数都按比例拆分（守恒定律）
    // 一个订单3个人分享（A=0.5, B=0.2, C=0.3），总和=1.0，业绩和订单数都守恒
    let sharedAmount = 0
    let receivedAmount = 0
    let sharedOrderCount = 0
    let receivedOrderCount = 0

    // 🔥 按订单状态分别计算分享对金额和订单数的影响
    let sharedShipAmount = 0, receivedShipAmount = 0
    let sharedShipCount = 0, receivedShipCount = 0
    let sharedSignAmount = 0, receivedSignAmount = 0
    let sharedSignCount = 0, receivedSignCount = 0
    let sharedTransitAmount = 0, receivedTransitAmount = 0
    let sharedTransitCount = 0, receivedTransitCount = 0
    let sharedRejectAmount = 0, receivedRejectAmount = 0
    let sharedRejectCount = 0, receivedRejectCount = 0
    let sharedReturnAmount = 0, receivedReturnAmount = 0
    let sharedReturnCount = 0, receivedReturnCount = 0

    if (performanceStore.performanceShares) {
      performanceStore.performanceShares.forEach(share => {
        if (share.status !== 'active' && share.status !== 'completed') return

        // 日期筛选：使用分享记录的时间
        if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
          const [startDate, endDate] = dateRange.value
          let shareDateStr = (share.createTime || '')?.split(' ')[0] || ''
          shareDateStr = shareDateStr.replace(/\//g, '-')
          const start = startDate.replace(/\//g, '-')
          const end = endDate.replace(/\//g, '-')
          if (shareDateStr && (shareDateStr < start || shareDateStr > end)) {
            return
          }
        }

        const totalSharedPercentage = (share.shareMembers || []).reduce((sum: number, member: any) => sum + (member.percentage || 0), 0)
        const sharedRatio = totalSharedPercentage / 100

        // 🔥 情况1：当前用户是分享创建人（原始下单人），扣除分享出去的金额和订单数
        if (String(share.createdById) === String(user.id)) {
          const shareOrder = userOrders.find(o => o.orderNumber === share.orderNumber)
          if (shareOrder) {
            sharedAmount += (share.orderAmount || 0) * sharedRatio
            sharedOrderCount += sharedRatio // 🔥 订单数也按比例拆分

            // 按订单状态扣除金额和订单数
            const status = shareOrder.status
            if (status === 'shipped' || status === 'delivered') {
              sharedShipAmount += (share.orderAmount || 0) * sharedRatio
              sharedShipCount += sharedRatio
            }
            if (status === 'delivered') {
              sharedSignAmount += (share.orderAmount || 0) * sharedRatio
              sharedSignCount += sharedRatio
            }
            if (status === 'shipped' && shareOrder.logisticsStatus !== 'delivered') {
              sharedTransitAmount += (share.orderAmount || 0) * sharedRatio
              sharedTransitCount += sharedRatio
            }
            if (status === 'rejected' || status === 'rejected_returned') {
              sharedRejectAmount += (share.orderAmount || 0) * sharedRatio
              sharedRejectCount += sharedRatio
            }
            if (status === 'logistics_returned') {
              sharedReturnAmount += (share.orderAmount || 0) * sharedRatio
              sharedReturnCount += sharedRatio
            }
          }
        }

        // 🔥 情况2：当前用户是分享接收人，加上接收到的金额和订单数
        (share.shareMembers || []).forEach((member: any) => {
          if (String(member.userId) === String(user.id)) {
            const myRatio = (member.percentage || 0) / 100
            receivedAmount += (share.orderAmount || 0) * myRatio
            receivedOrderCount += myRatio // 🔥 接收到的订单数按比例

            // 查找原始订单的状态，按状态增加接收的金额和订单数
            const originalOrder = orderStore.orders.find(o =>
              o.orderNumber === share.orderNumber || o.id === share.orderId
            )
            if (originalOrder) {
              const status = originalOrder.status
              if (status === 'shipped' || status === 'delivered') {
                receivedShipAmount += (share.orderAmount || 0) * myRatio
                receivedShipCount += myRatio
              }
              if (status === 'delivered') {
                receivedSignAmount += (share.orderAmount || 0) * myRatio
                receivedSignCount += myRatio
              }
              if (status === 'shipped' && originalOrder.logisticsStatus !== 'delivered') {
                receivedTransitAmount += (share.orderAmount || 0) * myRatio
                receivedTransitCount += myRatio
              }
              if (status === 'rejected' || status === 'rejected_returned') {
                receivedRejectAmount += (share.orderAmount || 0) * myRatio
                receivedRejectCount += myRatio
              }
              if (status === 'logistics_returned') {
                receivedReturnAmount += (share.orderAmount || 0) * myRatio
                receivedReturnCount += myRatio
              }
            }
          }
        })
      })
    }

    // 🔥 守恒定律：金额和订单数都按比例拆分
    // 金额守恒：原始金额 - 分享出 + 接收入
    // 订单数守恒：原始订单数 - 分享出比例 + 接收入比例（可能是小数）
    const netOrderAmount = Math.max(0, orderAmount - sharedAmount + receivedAmount)
    const netOrderCount = Math.max(0, orderCount - sharedOrderCount + receivedOrderCount)

    // 已发货订单（包括已发货和已签收）- 金额和订单数都受分享影响
    const shippedOrders = userOrders.filter(order =>
      order.status === 'shipped' || order.status === 'delivered'
    )
    const rawShipCount = shippedOrders.length
    const rawShipAmount = shippedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const shipCount = Math.max(0, rawShipCount - sharedShipCount + receivedShipCount)
    const shipAmount = Math.max(0, rawShipAmount - sharedShipAmount + receivedShipAmount)
    const shipRate = netOrderCount > 0 ? (shipCount / netOrderCount) * 100 : 0

    // 已签收订单 - 金额和订单数都受分享影响
    const signedOrders = userOrders.filter(order =>
      order.status === 'delivered'
    )
    const rawSignCount = signedOrders.length
    const rawSignAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const signCount = Math.max(0, rawSignCount - sharedSignCount + receivedSignCount)
    const signAmount = Math.max(0, rawSignAmount - sharedSignAmount + receivedSignAmount)
    const signRate = netOrderCount > 0 ? (signCount / netOrderCount) * 100 : 0

    // 运输中订单 - 金额和订单数都受分享影响
    const transitOrders = userOrders.filter(order =>
      order.status === 'shipped' && order.logisticsStatus !== 'delivered'
    )
    const rawTransitCount = transitOrders.length
    const rawTransitAmount = transitOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const transitCount = Math.max(0, rawTransitCount - sharedTransitCount + receivedTransitCount)
    const transitAmount = Math.max(0, rawTransitAmount - sharedTransitAmount + receivedTransitAmount)
    const transitRate = netOrderCount > 0 ? (transitCount / netOrderCount) * 100 : 0

    // 拒收订单 - 金额和订单数都受分享影响
    const rejectedOrders = userOrders.filter(order =>
      order.status === 'rejected' || order.status === 'rejected_returned'
    )
    const rawRejectCount = rejectedOrders.length
    const rawRejectAmount = rejectedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const rejectCount = Math.max(0, rawRejectCount - sharedRejectCount + receivedRejectCount)
    const rejectAmount = Math.max(0, rawRejectAmount - sharedRejectAmount + receivedRejectAmount)
    const rejectRate = netOrderCount > 0 ? (rejectCount / netOrderCount) * 100 : 0

    // 退货订单 - 金额和订单数都受分享影响
    const returnedOrders = userOrders.filter(order =>
      order.status === 'logistics_returned'
    )
    const rawReturnCount = returnedOrders.length
    const rawReturnAmount = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0)
    const returnCount = Math.max(0, rawReturnCount - sharedReturnCount + receivedReturnCount)
    const returnAmount = Math.max(0, rawReturnAmount - sharedReturnAmount + receivedReturnAmount)
    const returnRate = netOrderCount > 0 ? (returnCount / netOrderCount) * 100 : 0

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
    let formattedCreateTime = '-'
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
      orderCount: netOrderCount, // 🔥 守恒定律：订单数按比例拆分（可能是小数）
      orderAmount: netOrderAmount, // 🔥 守恒定律：金额 = 原始金额 - 分享出 + 接收入
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

// 成员订单列表 - 从API加载
const selectedMemberId = ref<string | null>(null)
const memberOrderListData = ref<any[]>([])
const memberOrderLoading = ref(false)

// 🔥 修复：memberOrderList 现在直接返回从API加载的数据
const memberOrderList = computed(() => {
  return memberOrderListData.value
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

// 监听成员列表变化，更新总数
watch(memberList, (newList) => {
  total.value = newList.length
}, { immediate: true })

// 方法
const formatNumber = (num: number) => {
  if (num == null || isNaN(num)) return '0'
  return num.toLocaleString()
}

/**
 * 🔥 智能数字格式化：整数不带小数点，有小数显示1位
 * 用于订单数量等可能出现小数的场景（分享后的单数）
 */
const formatSmartNumber = (num: number) => {
  if (num == null || isNaN(num)) return '0'
  if (num % 1 === 0) return String(num)
  return num.toFixed(1)
}

const handleQuickFilter = async (value: string) => {
  selectedQuickFilter.value = value
  // 根据快速筛选设置日期范围
  const today = new Date()
  // 🔥 使用本地时间格式化日期，避免UTC时区问题
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

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
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      dateRange.value = [formatDate(lastMonthStart), formatDate(lastMonthEnd)]
      break
    case 'thisYear':
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      dateRange.value = [formatDate(startOfYear), formatDate(today)]
      break
  }

  // 🔥 修复：切换筛选后自动刷新数据
  await refreshData()
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
  const sums: (string | VNode)[] = []

  // 🔥 权限判断：只有超管、管理员、部门经理可以点击合计行
  const currentUser = userStore.currentUser
  const canClickSummary = currentUser && (
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'department_manager'
  )

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

    // 数量类字段 - 求和，根据权限决定是否可点击
    if (prop.includes('Count')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      const displayValue = total % 1 === 0 ? String(total) : total.toFixed(1)

      // 🔥 只有有权限的用户才显示可点击的链接
      if (canClickSummary) {
        sums[index] = h('span', {
          class: 'summary-count-link',
          'data-type': prop,
          'data-value': total,
          style: {
            color: '#409eff',
            cursor: 'pointer'
          }
        }, displayValue)
      } else {
        // 销售员等无权限用户显示普通文本
        sums[index] = displayValue
      }
      return
    }

    // 比率类字段 - 根据对应单数计算比率
    if (prop.includes('Rate')) {
      // 计算合计的单数
      const totalOrderCount = data.reduce((sum, row) => sum + (Number(row.orderCount) || 0), 0)
      const totalShipCount = data.reduce((sum, row) => sum + (Number(row.shipCount) || 0), 0)
      const totalSignCount = data.reduce((sum, row) => sum + (Number(row.signCount) || 0), 0)
      const totalTransitCount = data.reduce((sum, row) => sum + (Number(row.transitCount) || 0), 0)
      const totalRejectCount = data.reduce((sum, row) => sum + (Number(row.rejectCount) || 0), 0)
      const totalReturnCount = data.reduce((sum, row) => sum + (Number(row.returnCount) || 0), 0)

      let rate = 0
      if (prop === 'shipRate') {
        // 发货率 = 发货单数 / 下单单数
        rate = totalOrderCount > 0 ? (totalShipCount / totalOrderCount) * 100 : 0
      } else if (prop === 'signRate') {
        // 签收率 = 签收单数 / 发货单数
        rate = totalShipCount > 0 ? (totalSignCount / totalShipCount) * 100 : 0
      } else if (prop === 'transitRate') {
        // 在途率 = 在途单数 / 发货单数
        rate = totalShipCount > 0 ? (totalTransitCount / totalShipCount) * 100 : 0
      } else if (prop === 'rejectRate') {
        // 拒收率 = 拒收单数 / 发货单数
        rate = totalShipCount > 0 ? (totalRejectCount / totalShipCount) * 100 : 0
      } else if (prop === 'returnRate') {
        // 退货率 = 退货单数 / 发货单数
        rate = totalShipCount > 0 ? (totalReturnCount / totalShipCount) * 100 : 0
      }
      sums[index] = `${rate.toFixed(1)}%`
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
  const sums: (string | VNode)[] = []

  // 🔥 权限判断：只有超管、管理员、部门经理可以点击合计行
  const currentUser = userStore.currentUser
  const canClickSummary = currentUser && (
    currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'department_manager'
  )

  // 全屏表格的列顺序：序号、成员、部门、用户名、工号、创建时间、下单数、下单业绩、发货数、发货业绩、发货率...
  columns.forEach((column: any, index) => {
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

    // 数量类字段 - 求和，根据权限决定是否可点击
    if (prop.includes('Count')) {
      const total = data.reduce((sum, row) => sum + (Number(row[prop]) || 0), 0)
      const displayValue = total % 1 === 0 ? String(total) : total.toFixed(1)

      // 🔥 只有有权限的用户才显示可点击的链接
      if (canClickSummary) {
        sums[index] = h('span', {
          class: 'summary-count-link',
          'data-type': prop,
          'data-value': total,
          style: {
            color: '#409eff',
            cursor: 'pointer'
          }
        }, displayValue)
      } else {
        // 销售员等无权限用户显示普通文本
        sums[index] = displayValue
      }
      return
    }

    // 比率类字段 - 根据对应单数计算比率
    if (prop.includes('Rate')) {
      // 计算合计的单数
      const totalOrderCount = data.reduce((sum, row) => sum + (Number(row.orderCount) || 0), 0)
      const totalShipCount = data.reduce((sum, row) => sum + (Number(row.shipCount) || 0), 0)
      const totalSignCount = data.reduce((sum, row) => sum + (Number(row.signCount) || 0), 0)
      const totalTransitCount = data.reduce((sum, row) => sum + (Number(row.transitCount) || 0), 0)
      const totalRejectCount = data.reduce((sum, row) => sum + (Number(row.rejectCount) || 0), 0)
      const totalReturnCount = data.reduce((sum, row) => sum + (Number(row.returnCount) || 0), 0)

      let rate = 0
      if (prop === 'shipRate') {
        // 发货率 = 发货单数 / 下单单数
        rate = totalOrderCount > 0 ? (totalShipCount / totalOrderCount) * 100 : 0
      } else if (prop === 'signRate') {
        // 签收率 = 签收单数 / 发货单数
        rate = totalShipCount > 0 ? (totalSignCount / totalShipCount) * 100 : 0
      } else if (prop === 'rejectRate') {
        // 拒收率 = 拒收单数 / 发货单数
        rate = totalShipCount > 0 ? (totalRejectCount / totalShipCount) * 100 : 0
      } else if (prop === 'transitRate') {
        // 在途率 = 在途单数 / 发货单数
        rate = totalShipCount > 0 ? (totalTransitCount / totalShipCount) * 100 : 0
      } else if (prop === 'returnRate') {
        // 退货率 = 退货单数 / 发货单数
        rate = totalShipCount > 0 ? (totalReturnCount / totalShipCount) * 100 : 0
      }
      sums[index] = `${rate.toFixed(1)}%`
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

// 🔥 处理表格点击事件（用于合计行的超链接点击）
const handleTableClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  // 检查是否点击了合计行的超链接
  if (target.classList.contains('summary-count-link')) {
    const countType = target.getAttribute('data-type')
    if (countType) {
      showSummaryOrdersDialog(countType)
    }
  }
}

// 🔥 显示合计订单弹窗
const summaryOrdersDialogVisible = ref(false)
const summaryOrdersTitle = ref('')
const summaryOrdersLoading = ref(false)
const summaryOrdersList = ref<any[]>([])
const summaryOrdersTotal = ref(0)
const summaryOrdersPage = ref(1)
const summaryOrdersPageSize = ref(10)

const showSummaryOrdersDialog = async (countType: string) => {
  // 🔥 权限检查：只有超管、管理员、部门经理可以查看合计订单
  const currentUser = userStore.currentUser
  if (!currentUser) {
    ElMessage.warning('请先登录')
    return
  }

  const canViewSummary = currentUser.role === 'super_admin' ||
    currentUser.role === 'admin' ||
    currentUser.role === 'department_manager'

  if (!canViewSummary) {
    ElMessage.warning('您没有权限查看合计订单详情')
    return
  }

  // 根据类型设置标题
  const titleMap: Record<string, string> = {
    orderCount: '全部下单订单',
    shipCount: '全部发货订单',
    signCount: '全部签收订单',
    transitCount: '全部在途订单',
    rejectCount: '全部拒收订单',
    returnCount: '全部退货订单'
  }
  summaryOrdersTitle.value = titleMap[countType] || '订单列表'
  summaryOrdersDialogVisible.value = true
  summaryOrdersLoading.value = true
  summaryOrdersPage.value = 1

  try {
    const { orderApi } = await import('@/api/order')

    // 获取当前筛选条件下所有成员的ID
    const memberIds = memberList.value.map((m: TeamMember) => m.id)

    // 根据类型确定要查询的订单状态
    let statusFilter = ''
    if (countType === 'shipCount') {
      statusFilter = 'shipped'
    } else if (countType === 'signCount') {
      statusFilter = 'delivered'
    } else if (countType === 'transitCount') {
      statusFilter = 'shipped' // 在途也是已发货状态
    } else if (countType === 'rejectCount') {
      statusFilter = 'rejected'
    } else if (countType === 'returnCount') {
      statusFilter = 'logistics_returned'
    }

    // 加载所有成员的订单
    const allOrders: any[] = []
    for (const memberId of memberIds) {
      const params: any = {
        memberId: memberId,
        page: 1,
        pageSize: 500
      }

      // 添加日期筛选
      if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
        params.startDate = dateRange.value[0]
        params.endDate = dateRange.value[1]
      }

      // 添加状态筛选
      if (statusFilter) {
        params.status = statusFilter
      }

      const response = await orderApi.getMemberOrders(params)
      if (response && response.data && response.data.list) {
        allOrders.push(...response.data.list)
      }
    }

    // 转换为显示格式
    summaryOrdersList.value = allOrders.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNumber,
      orderDate: order.orderDate || order.createTime || '',
      customerName: order.customerName || '未知客户',
      amount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      collectionAmount: (order.totalAmount || 0) - (order.depositAmount || 0),
      status: order.status || 'pending',
      logisticsCompany: order.expressCompany || '待发货',
      trackingNumber: order.trackingNumber || '暂无',
      createdByName: order.createdByName || '未知',
      productDetails: order.products?.map((item: any) => `${item.name || item.productName} x${item.quantity}`).join(', ') || '暂无详情',
      products: order.products || []
    }))

    summaryOrdersTotal.value = summaryOrdersList.value.length
    console.log(`[团队业绩] 合计订单加载成功: ${summaryOrdersList.value.length} 条`)
  } catch (error) {
    console.error('[团队业绩] 加载合计订单失败:', error)
    summaryOrdersList.value = []
    summaryOrdersTotal.value = 0
  } finally {
    summaryOrdersLoading.value = false
  }
}

// 合计订单分页数据
const paginatedSummaryOrders = computed(() => {
  const start = (summaryOrdersPage.value - 1) * summaryOrdersPageSize.value
  const end = start + summaryOrdersPageSize.value
  return summaryOrdersList.value.slice(start, end)
})

const viewMemberDetail = (member: TeamMember) => {
  selectedMember.value = member
  memberDetailVisible.value = true
  // 加载成员订单数据
  loadMemberOrders(member.id)
}

const viewOrderDetail = (order: Order) => {
  safeNavigator.push(`/order/detail/${order.id}`)
}

/**
 * 点击物流单号：弹窗选择查询方式
 */
const handleTrackingNoClick = async (trackingNo: string, logisticsCompany?: string) => {
  const { showLogisticsQueryDialog } = await import('@/utils/logisticsQuery')

  showLogisticsQueryDialog({
    trackingNo,
    companyCode: logisticsCompany,
    router,
    onSystemQuery: () => {
      safeNavigator.push({
        path: '/logistics/track',
        query: {
          trackingNo: trackingNo,
          company: logisticsCompany || ''
        }
      })
    }
  })
}

// 根据订单类型查看订单详情 - 🔥 修改为调用后端API
const viewOrdersByType = async (member: TeamMember, columnProp: string) => {
  orderTypeMember.value = member
  orderTypeCurrentPage.value = 1
  orderTypePageSize.value = 10

  // 根据列类型确定订单状态筛选
  const typeMap: Record<string, { label: string; status?: string }> = {
    orderCount: { label: '下单订单' },
    shipCount: { label: '已发货订单', status: 'shipped' },
    signCount: { label: '已签收订单', status: 'delivered' },
    transitCount: { label: '在途订单', status: 'shipped' },
    rejectCount: { label: '拒收订单', status: 'rejected' },
    returnCount: { label: '退货订单', status: 'logistics_returned' }
  }

  const typeConfig = typeMap[columnProp]
  if (typeConfig) {
    orderTypeLabel.value = typeConfig.label
    orderTypeDetailTitle.value = `${member.name} - ${typeConfig.label}详情`

    // 🔥 调用后端API获取订单数据
    await loadOrderTypeData(member, typeConfig.status)

    orderTypeDetailVisible.value = true
  }
}

// 🔥 新增：从后端API加载订单类型数据
const orderTypeTotal = ref(0)
const orderTypeLoading = ref(false)
const currentOrderTypeStatus = ref<string | undefined>(undefined)

// 🔥 新增：构建订单的分享信息（用于弹窗中的分享标记列和金额调整）
const buildOrderShareInfo = (orderNumber: string, memberId: string) => {
  const orderShares = (performanceStore.performanceShares || []).filter(
    (share: any) => share.orderNumber === orderNumber &&
      (share.status === 'active' || share.status === 'completed')
  )
  if (orderShares.length === 0) return undefined

  const share = orderShares[0]
  const totalSharedPct = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)
  const isShared = String(share.createdById) === String(memberId)
  const isReceived = !isShared && (share.shareMembers || []).some((m: any) => String(m.userId) === String(memberId))

  // 计算当前成员的实际业绩比例
  let myPercentage = 100
  if (isShared) {
    myPercentage = Math.max(0, 100 - totalSharedPct) // 原始人保留的比例
  } else if (isReceived) {
    const myMember = (share.shareMembers || []).find((m: any) => String(m.userId) === String(memberId))
    myPercentage = myMember?.percentage || 0
  }

  return {
    isShared,
    isReceived,
    totalSharedPercentage: totalSharedPct,
    ownerRetainedPercentage: Math.max(0, 100 - totalSharedPct),
    myPercentage,
    orderAmount: share.orderAmount || 0,
    members: (share.shareMembers || []).map((m: any) => ({
      userName: m.userName || m.user_name || '未知',
      percentage: m.percentage || 0,
      shareAmount: m.shareAmount || m.share_amount || 0
    }))
  }
}

// 🔥 新增：注入分享接收的订单到订单列表
// 查找当前成员作为分享接收人的所有订单，从orderStore中查找完整订单信息并注入列表
const getReceivedSharedOrders = (memberId: string, existingOrderNos: Set<string>, statusFilter?: string) => {
  const receivedOrders: any[] = []

  ;(performanceStore.performanceShares || []).forEach((share: any) => {
    if (share.status !== 'active' && share.status !== 'completed') return
    // 跳过已经在列表中的订单（避免重复）
    if (existingOrderNos.has(share.orderNumber)) return

    // 当前成员是分享接收人
    const myMember = (share.shareMembers || []).find((m: any) => String(m.userId) === String(memberId))
    if (!myMember) return

    // 从 orderStore 中查找原始订单数据
    // 🔥 接收人的orderStore可能没有原始订单（后端按createdBy过滤），不再直接return
    const originalOrder = orderStore.orders.find((o: any) =>
      o.orderNumber === share.orderNumber || o.id === share.orderId
    )

    // 如果有状态筛选且能拿到原始订单状态，检查是否匹配（没有原始订单时不做状态筛选，视为匹配）
    if (statusFilter && originalOrder) {
      if (statusFilter === 'shipped' && originalOrder.status !== 'shipped' && originalOrder.status !== 'delivered') return
      if (statusFilter === 'delivered' && originalOrder.status !== 'delivered') return
      if (statusFilter === 'rejected' && originalOrder.status !== 'rejected' && originalOrder.status !== 'rejected_returned') return
      if (statusFilter === 'logistics_returned' && originalOrder.status !== 'logistics_returned') return
    }

    // 日期筛选 - 找不到原始订单时回退到分享的订单创建时间或分享createTime
    const orderCreateTime = originalOrder?.orderDate || originalOrder?.createTime || share.orderCreatedAt || share.createTime || ''

    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      const [startDate, endDate] = dateRange.value
      let orderDateStr = (orderCreateTime)?.split(' ')[0] || ''
      orderDateStr = orderDateStr.replace(/\//g, '-')
      const start = startDate.replace(/\//g, '-')
      const end = endDate.replace(/\//g, '-')
      if (orderDateStr && (orderDateStr < start || orderDateStr > end)) return
    }

    const myRatio = (myMember.percentage || 0) / 100
    const myAmount = (share.orderAmount || originalOrder?.totalAmount || 0) * myRatio
    const totalSharedPct = (share.shareMembers || []).reduce((sum: number, m: any) => sum + (m.percentage || 0), 0)

    // 🔥 优先使用 originalOrder 的信息，其次使用 share 中从后端JOIN获取的订单信息
    const shareProducts = share.orderProducts ? (typeof share.orderProducts === 'string' ? JSON.parse(share.orderProducts) : share.orderProducts) : null

    receivedOrders.push({
      id: originalOrder?.id || share.orderId || share.id,
      orderNo: share.orderNumber,
      orderDate: orderCreateTime || '',
      customerName: originalOrder?.customerName || share.orderCustomerName || '(分享订单)',
      amount: Math.round(myAmount), // 🔥 显示分享后自己得到的业绩
      originalAmount: originalOrder?.totalAmount || share.orderAmount || 0,
      depositAmount: Math.round((originalOrder?.depositAmount || 0) * myRatio),
      collectionAmount: Math.round(((originalOrder?.totalAmount || share.orderAmount || 0) - (originalOrder?.depositAmount || 0)) * myRatio),
      status: originalOrder?.status || 'pending_audit',
      logisticsCompany: originalOrder?.expressCompany || '待发货',
      trackingNumber: originalOrder?.trackingNumber || originalOrder?.expressNo || '暂无',
      productDetails: originalOrder?.products?.map((item: any) => `${item.name} x${item.quantity}`).join(', ')
        || (shareProducts ? shareProducts.map((item: any) => `${item.name} x${item.quantity}`).join(', ') : '分享订单'),
      products: originalOrder?.products || shareProducts || [],
      shareInfo: {
        isShared: false,
        isReceived: true,
        totalSharedPercentage: totalSharedPct,
        ownerRetainedPercentage: Math.max(0, 100 - totalSharedPct),
        myPercentage: myMember.percentage || 0,
        orderAmount: share.orderAmount || originalOrder?.totalAmount || 0,
        members: (share.shareMembers || []).map((m: any) => ({
          userName: m.userName || m.user_name || '未知',
          percentage: m.percentage || 0,
          shareAmount: m.shareAmount || m.share_amount || 0
        }))
      }
    })
  })

  return receivedOrders
}

const loadOrderTypeData = async (member: TeamMember, status?: string) => {
  try {
    orderTypeLoading.value = true
    currentOrderTypeStatus.value = status

    // 🔥 关键修复：确保orderStore有数据（后端API模式下本地可能没加载）
    if (!orderStore.orders || orderStore.orders.length === 0) {
      console.log('[团队业绩] orderStore为空，先从API加载订单数据...')
      await orderStore.loadOrdersFromAPI(true)
    }

    // 🔥 直接从本地 orderStore 获取数据（与主表使用相同的匹配逻辑，保证数据一致性）
    let memberOrders = orderStore.orders.filter((order: any) => {
      // 排除不计入业绩的订单
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer' && order.markType !== 'normal') return false
      if (excludedStatuses.includes(order.status)) return false

      // 与主表相同的匹配逻辑：优先 salesPersonId，其次 createdBy / username
      if (order.salesPersonId && member.id) {
        if (String(order.salesPersonId) === String(member.id)) return true
      }
      if (order.createdBy && member.name) {
        if (order.createdBy === member.name) return true
      }
      // 🔥 增加username匹配（后端created_by可能存的是username）
      if (order.createdBy && member.username) {
        if (order.createdBy === member.username) return true
      }
      return false
    })

    // 日期筛选
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      memberOrders = memberOrders.filter((order: any) => {
        let orderDateStr = (order.orderDate || order.createTime || '')?.split(' ')[0] || ''
        orderDateStr = orderDateStr.replace(/\//g, '-')
        const start = dateRange.value[0].replace(/\//g, '-')
        const end = dateRange.value[1].replace(/\//g, '-')
        return orderDateStr >= start && orderDateStr <= end
      })
    }

    // 状态筛选
    if (status) {
      memberOrders = memberOrders.filter((order: any) => {
        if (status === 'shipped') return order.status === 'shipped' || order.status === 'delivered'
        if (status === 'delivered') return order.status === 'delivered'
        if (status === 'rejected') return order.status === 'rejected' || order.status === 'rejected_returned'
        if (status === 'logistics_returned') return order.status === 'logistics_returned'
        if (status === 'transit') return order.status === 'shipped' && order.logisticsStatus !== 'delivered'
        return order.status === status
      })
    }

    // 转换为弹窗显示格式，并附加分享信息和金额调整
    const ownOrders = memberOrders.map((order: any) => {
      const shareInfo = buildOrderShareInfo(order.orderNumber, String(member.id))
      let displayAmount = order.totalAmount || 0
      let displayDeposit = order.depositAmount || 0
      let displayCollection = (order.totalAmount || 0) - (order.depositAmount || 0)

      // 🔥 如果这个订单被分享出去了，显示保留的业绩部分
      if (shareInfo && shareInfo.isShared) {
        const retainRatio = shareInfo.ownerRetainedPercentage / 100
        displayAmount = Math.round((order.totalAmount || 0) * retainRatio)
        displayDeposit = Math.round((order.depositAmount || 0) * retainRatio)
        displayCollection = Math.round(((order.totalAmount || 0) - (order.depositAmount || 0)) * retainRatio)
      }

      return {
        id: order.id,
        orderNo: order.orderNumber,
        orderDate: order.orderDate || order.createTime || '',
        department: order.createdByDepartmentName || '',
        salesPerson: order.createdByName || order.operator || '',
        customerName: order.customerName,
        amount: displayAmount,
        originalAmount: order.totalAmount || 0,
        depositAmount: displayDeposit,
        collectionAmount: displayCollection,
        status: order.status,
        trackingNumber: order.trackingNumber || order.expressNo || '',
        productDetails: order.products?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || '暂无详情',
        products: order.products || [],
        shareInfo
      }
    })

    // 🔥 注入分享接收的订单
    const existingOrderNos = new Set(ownOrders.map((o: any) => o.orderNo))
    const receivedOrders = getReceivedSharedOrders(String(member.id), existingOrderNos, status)

    // 合并并排序
    const allOrders = [...ownOrders, ...receivedOrders]
    allOrders.sort((a: any, b: any) => (b.orderDate || '').localeCompare(a.orderDate || ''))

    orderTypeOrders.value = allOrders
    orderTypeTotal.value = allOrders.length

    console.log('[团队业绩] ✅ 成员订单加载成功:', ownOrders.length, '条自有 +', receivedOrders.length, '条接收分享, 总数:', orderTypeTotal.value)
  } catch (error) {
    console.error('[团队业绩] ❌ 加载成员订单失败:', error)
    orderTypeOrders.value = []
    orderTypeTotal.value = 0
  } finally {
    orderTypeLoading.value = false
  }
}

// 🔥 订单类型弹窗分页变化处理
const handleOrderTypePageChange = async () => {
  if (orderTypeMember.value) {
    await loadOrderTypeData(orderTypeMember.value, currentOrderTypeStatus.value)
  }
}

const handleOrderTypeSizeChange = async (size: number) => {
  orderTypePageSize.value = size
  orderTypeCurrentPage.value = 1
  if (orderTypeMember.value) {
    await loadOrderTypeData(orderTypeMember.value, currentOrderTypeStatus.value)
  }
}

const loadMemberOrders = async (memberId: string) => {
  selectedMemberId.value = memberId
  memberOrderPage.value = 1
  memberOrderLoading.value = true

  try {
    // 🔥 关键修复：确保orderStore有数据（后端API模式下本地可能没加载）
    if (!orderStore.orders || orderStore.orders.length === 0) {
      console.log('[团队业绩] orderStore为空，先从API加载订单数据...')
      await orderStore.loadOrdersFromAPI(true)
    }

    // 🔥 从本地 orderStore 获取成员数据（与主表使用相同的匹配逻辑）
    const member = memberList.value.find((m: any) => String(m.id) === String(memberId))
    const memberName = member?.name || ''
    const memberUsername = member?.username || ''

    let memberOrders = orderStore.orders.filter((order: any) => {
      // 排除不计入业绩的订单
      const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
      if (order.status === 'pending_transfer' && order.markType !== 'normal') return false
      if (excludedStatuses.includes(order.status)) return false

      // 与主表相同的匹配逻辑
      if (order.salesPersonId && memberId) {
        if (String(order.salesPersonId) === String(memberId)) return true
      }
      if (order.createdBy && memberName) {
        if (order.createdBy === memberName) return true
      }
      // 🔥 增加username匹配（后端created_by可能存的是username）
      if (order.createdBy && memberUsername) {
        if (order.createdBy === memberUsername) return true
      }
      return false
    })

    // 日期筛选
    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      memberOrders = memberOrders.filter((order: any) => {
        let orderDateStr = (order.orderDate || order.createTime || '')?.split(' ')[0] || ''
        orderDateStr = orderDateStr.replace(/\//g, '-')
        const start = dateRange.value[0].replace(/\//g, '-')
        const end = dateRange.value[1].replace(/\//g, '-')
        return orderDateStr >= start && orderDateStr <= end
      })
    }

    // 转换为弹窗显示格式，并附加分享信息和金额调整
    const ownOrders = memberOrders.map((order: any) => {
      const shareInfo = buildOrderShareInfo(order.orderNumber, String(memberId))
      let displayAmount = order.totalAmount || 0
      let displayDeposit = order.depositAmount || 0
      let displayCollection = (order.totalAmount || 0) - (order.depositAmount || 0)

      // 🔥 如果这个订单被分享出去了，显示保留的业绩部分
      if (shareInfo && shareInfo.isShared) {
        const retainRatio = shareInfo.ownerRetainedPercentage / 100
        displayAmount = Math.round((order.totalAmount || 0) * retainRatio)
        displayDeposit = Math.round((order.depositAmount || 0) * retainRatio)
        displayCollection = Math.round(((order.totalAmount || 0) - (order.depositAmount || 0)) * retainRatio)
      }

      return {
        id: order.id,
        orderNo: order.orderNumber,
        orderDate: order.orderDate || order.createTime || '',
        customerName: order.customerName || '未知客户',
        amount: displayAmount, // 🔥 分享后的实际业绩
        originalAmount: order.totalAmount || 0, // 原始金额
        depositAmount: displayDeposit,
        collectionAmount: displayCollection,
        status: order.status || 'pending',
        logisticsCompany: order.expressCompany || '待发货',
        trackingNumber: order.trackingNumber || '暂无',
        productDetails: order.products?.map((item: any) => `${item.name} x${item.quantity}`).join(', ') || '暂无详情',
        products: order.products || [],
        shareInfo
      }
    })

    // 🔥 注入分享接收的订单（当前成员作为分享接收人的订单）
    const existingOrderNos = new Set(ownOrders.map((o: any) => o.orderNo))
    const receivedOrders = getReceivedSharedOrders(String(memberId), existingOrderNos)

    // 合并并按日期排序
    const allOrders = [...ownOrders, ...receivedOrders]
    allOrders.sort((a: any, b: any) => (b.orderDate || '').localeCompare(a.orderDate || ''))

    memberOrderListData.value = allOrders
    orderTotal.value = allOrders.length

    console.log('[团队业绩] 成员订单加载成功:', ownOrders.length, '条自有 +', receivedOrders.length, '条接收分享')
  } catch (error) {
    console.error('[团队业绩] 加载成员订单失败:', error)
    memberOrderListData.value = []
    orderTotal.value = 0
  } finally {
    memberOrderLoading.value = false
  }
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

// 🔥 从后端API加载团队业绩数据
const loadTeamDataFromAPI = async () => {
  try {
    console.log('[团队业绩] 从后端API加载数据...')
    const response = await getTeamStats({
      departmentId: selectedDepartment.value || undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
      sortBy: sortBy.value,
      page: currentPage.value,
      limit: pageSize.value
    })

    if (response.success && response.data) {
      apiTeamData.value = {
        members: response.data.members || [],
        summary: response.data.summary || {
          totalPerformance: 0,
          totalOrders: 0,
          avgPerformance: 0,
          signOrders: 0,
          signRate: 0,
          signPerformance: 0,
          memberCount: 0
        },
        total: response.data.total || 0
      }
      total.value = response.data.total || 0
      console.log('[团队业绩] ✅ 后端API数据加载成功:', apiTeamData.value.members.length, '个成员')
      return true
    }
    return false
  } catch (error) {
    console.error('[团队业绩] ❌ 后端API加载失败:', error)
    return false
  }
}

// 数据实时更新机制
const refreshData = async () => {
  try {
    loading.value = true

    // 🔥 【守恒定律关键修复】分享数据和团队数据必须并行加载并同时完成
    // 避免竞态条件：如果团队数据先返回而分享数据尚未加载，memberList会跳过订单数拆分
    const sharesPromise = performanceStore.loadPerformanceShares({ limit: 500 }).catch(() => {})

    // 🔥 优先使用后端API
    if (useBackendAPI.value) {
      // 并行加载团队数据和分享数据，确保两者都完成后再更新UI
      const [, success] = await Promise.all([sharesPromise, loadTeamDataFromAPI()])
      if (success) {
        console.log('[团队业绩] 使用后端API数据，分享数据已同步加载')
        // 🔥 关键修复：后端API模式也需要异步加载订单数据，供弹窗详情使用
        if (!orderStore.orders || orderStore.orders.length === 0) {
          orderStore.loadOrdersFromAPI(true).catch(() => {})
        }
        return
      }
      console.log('[团队业绩] 后端API失败，降级到前端计算')
    }

    // 降级方案：从前端加载数据
    await Promise.all([
      sharesPromise,
      orderStore.loadOrdersFromAPI(true),
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

/**
 * 🔥 处理业绩数据更新事件（来自分享页面的取消/创建/编辑操作）
 */
const handlePerformanceDataUpdate = async () => {
  console.log('[团队业绩] 收到业绩数据更新事件，重新加载分享数据')
  try {
    await performanceStore.loadPerformanceShares({ limit: 500 })
    console.log('[团队业绩] ✅ 分享数据重新加载成功')
  } catch (e) {
    console.warn('[团队业绩] 重新加载分享数据失败:', e)
  }
  // 刷新团队数据
  await refreshData()
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
    const userRole = currentUser.role
    if (userRole === 'department_manager' || userRole === 'sales_staff' || userRole === 'sales') {
      // 非管理员角色，默认选择自己所在的部门
      const userDeptId = currentUser.departmentId
      const userDeptName = currentUser.departmentName || currentUser.department

      console.log('[团队业绩] 用户部门信息:', { departmentId: userDeptId, departmentName: userDeptName })

      // 确保部门ID在可访问部门列表中
      const deptList = departmentStore.departmentList || []
      console.log('[团队业绩] 可用部门列表:', deptList.map(d => ({ id: d.id, name: d.name })))

      // 🔥 修复：优先通过部门ID匹配，其次通过名称匹配
      let matchedDept = deptList.find(d => String(d.id) === String(userDeptId))
      if (!matchedDept && userDeptName) {
        matchedDept = deptList.find(d => d.name === userDeptName)
      }

      if (matchedDept) {
        selectedDepartment.value = matchedDept.id
        console.log('[团队业绩] 非管理员角色，默认选择部门:', matchedDept.name, '(ID:', matchedDept.id, ')')
      } else if (userDeptId) {
        selectedDepartment.value = userDeptId
        console.log('[团队业绩] 非管理员角色，部门未在列表中找到，使用原始ID:', userDeptId)
      } else {
        console.warn('[团队业绩] 非管理员角色，但用户没有部门信息')
      }
    } else {
      // 管理员角色默认为空（显示所有部门）
      console.log('[团队业绩] 管理员角色，显示所有部门')
    }
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

  await handleQuickFilter('today')

  // 🔥 关键修复：加载业绩分享数据，确保成员业绩能正确反映分享调整
  try {
    await performanceStore.loadPerformanceShares({ limit: 500 })
    console.log('[团队业绩] ✅ 业绩分享数据加载成功，共', performanceStore.performanceShares?.length || 0, '条')
  } catch (e) {
    console.warn('[团队业绩] 加载业绩分享数据失败:', e)
  }

  // 设置定时刷新（每5分钟）
  refreshTimer = setInterval(refreshData, 5 * 60 * 1000)

  // 监听订单状态变化事件
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.on(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)

  // 🔥 关键修复：监听业绩数据更新事件（来自分享页面的取消/创建/编辑操作）
  window.addEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  window.addEventListener('dataSync', handlePerformanceDataUpdate)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }

  // 清理事件监听
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
  eventBus.off(EventNames.REFRESH_ORDER_LIST, handleOrderStatusChanged)

  // 🔥 清理全局事件监听
  window.removeEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  window.removeEventListener('dataSync', handlePerformanceDataUpdate)
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
  color: #67c23a;  /* 🔥 改为绿色，与主视图统一 */
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

/* 🔥 合计订单弹窗 */
.summary-orders-dialog {
  border-radius: 12px;
}

.summary-orders-content {
  padding: 20px;
}

/* 单数量链接样式 */
.count-link {
  cursor: pointer;
  font-weight: 500;
}

/* 🔥 合计行单数量链接样式（无下划线） */
.summary-count-link {
  color: #409eff;
  cursor: pointer;
  font-weight: 500;
}

.summary-count-link:hover {
  color: #66b1ff;
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
  width: 100%;
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

/* 🔥 无权限时的占位符样式 */
.no-permission-text {
  color: #c0c4cc;
  font-size: 14px;
}

/* 🔥 单数量超链接样式 */
.count-link {
  font-weight: 500;
}

/* 列设置样式 - 使用TableColumnSettings组件，无需自定义样式 */

/* 下拉菜单定位优化 */
:deep(.el-dropdown-menu) {
  max-height: 65vh !important;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}
</style>
