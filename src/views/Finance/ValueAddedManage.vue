<template>
  <div class="value-added-manage-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon all"><el-icon><Document /></el-icon></div>
        <div class="stat-info">
          <div class="stat-label">全部资料</div>
          <div class="stat-value">{{ stats.all.count }}单</div>
          <div class="stat-amount">¥{{ formatMoney(stats.all.amount) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon valid"><el-icon><CircleCheck /></el-icon></div>
        <div class="stat-info">
          <div class="stat-label">有效资料</div>
          <div class="stat-value">{{ stats.valid.count }}单</div>
          <div class="stat-amount">¥{{ formatMoney(stats.valid.amount) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon invalid"><el-icon><CircleClose /></el-icon></div>
        <div class="stat-info">
          <div class="stat-label">无效资料</div>
          <div class="stat-value">{{ stats.invalid.count }}单</div>
          <div class="stat-amount">¥{{ formatMoney(stats.invalid.amount) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon unsettled"><el-icon><Clock /></el-icon></div>
        <div class="stat-info">
          <div class="stat-label">未结算</div>
          <div class="stat-value">{{ stats.unsettled.count }}单</div>
          <div class="stat-amount">¥{{ formatMoney(stats.unsettled.amount) }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon settled"><el-icon><Select /></el-icon></div>
        <div class="stat-info">
          <div class="stat-label">已结算</div>
          <div class="stat-value">{{ stats.settled.count }}单</div>
          <div class="stat-amount">¥{{ formatMoney(stats.settled.amount) }}</div>
        </div>
      </div>
    </div>

    <!-- 快捷日期筛选 -->
    <div class="quick-filters">
      <div class="quick-btn-group">
        <button
          v-for="item in quickDateOptions"
          :key="item.value"
          :class="['quick-btn', { active: quickDateFilter === item.value }]"
          @click="handleQuickDateClick(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <!-- 筛选器 -->
    <div class="filter-container">
      <div class="filter-bar">
        <el-popover placement="bottom" :width="400" trigger="click" v-model:visible="batchSearchVisible">
          <template #reference>
            <el-input
              v-model="searchKeyword"
              :placeholder="batchSearchKeywords ? `已输入 ${batchSearchCount} 条` : '批量搜索（点击展开）'"
              clearable
              class="filter-search"
              @clear="clearBatchSearch"
              readonly
            >
              <template #prefix><el-icon><Search /></el-icon></template>
              <template #suffix>
                <el-badge v-if="batchSearchCount > 0" :value="batchSearchCount" :max="999" class="batch-badge" />
              </template>
            </el-input>
          </template>
          <div class="batch-search-popover">
            <div class="batch-search-header">
              <div class="batch-search-title">批量搜索</div>
              <div class="batch-search-tip">支持订单号、客户名称、客户电话、物流单号，一行一个</div>
            </div>
            <el-input
              v-model="batchSearchKeywords"
              type="textarea"
              :rows="6"
              placeholder="请输入搜索内容，一行一个&#10;例如：&#10;ORD202601010001&#10;张三&#10;13800138000"
              class="batch-search-textarea"
            />
            <div class="batch-search-footer">
              <span class="batch-search-count">已输入 {{ batchSearchCount }} 条</span>
              <div class="batch-search-actions">
                <el-button size="small" @click="clearBatchSearch">清空</el-button>
                <el-button size="small" type="primary" @click="applyBatchSearch">搜索</el-button>
              </div>
            </div>
          </div>
        </el-popover>
        <el-date-picker
          v-model="customDateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          clearable
          @change="handleCustomDateChange"
          class="filter-item"
          style="width: 240px;"
        />
        <el-select v-model="companyFilter" placeholder="外包公司" clearable @change="handleSearch" class="filter-item">
          <el-option label="全部公司" value="" />
          <el-option v-for="company in activeCompanies" :key="company.id" :label="company.companyName" :value="company.id" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="有效状态" clearable @change="handleSearch" class="filter-item">
          <el-option label="有效状态" value="" />
          <el-option v-for="item in validStatusList" :key="item.id" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="settlementStatusFilter" placeholder="结算状态" clearable @change="handleSearch" class="filter-item">
          <el-option label="结算状态" value="" />
          <el-option v-for="item in settlementStatusList" :key="item.id" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 标签页和操作按钮（同一行） -->
    <div class="tabs-wrapper">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="status-tabs">
        <el-tab-pane name="all">
          <template #label>
            <span>全部 <el-badge :value="stats.all.count" :max="999" type="info" class="tab-badge" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="pending">
          <template #label>
            <span>待处理 <el-badge :value="stats.pending.count" :max="999" class="tab-badge" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="valid">
          <template #label>
            <span>有效 <el-badge :value="stats.valid.count" :max="999" type="success" class="tab-badge tab-badge-valid" /></span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="invalid">
          <template #label>
            <span>无效 <el-badge :value="stats.invalid.count" :max="999" type="info" class="tab-badge tab-badge-invalid" /></span>
          </template>
        </el-tab-pane>
      </el-tabs>
      <div class="action-buttons" :class="{ 'has-selection': selectedRows.length > 0 }">
        <!-- 批量操作按钮（勾选订单后显示） -->
        <div v-if="selectedRows.length > 0" class="batch-actions">
          <el-dropdown @command="handleBatchCompany">
            <el-button type="primary">
              批量选择公司 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="default-company">待分配</el-dropdown-item>
                <el-dropdown-item v-for="company in activeCompanies" :key="company.id" :command="company.id">
                  {{ company.companyName }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleBatchValidStatus">
            <el-button type="warning">
              批量改有效状态 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in validStatusList" :key="item.id" :command="item.value">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-dropdown @command="handleBatchSettlementStatus">
            <el-button type="success">
              批量改结算状态 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="item in settlementStatusList" :key="item.id" :command="item.value">
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 常规按钮（始终显示） -->
        <div class="regular-actions">
          <el-button type="info" :icon="Setting" @click="showStatusConfigDialog">状态配置</el-button>
          <el-button type="success" :icon="Plus" @click="showCompanyDialog">外包公司管理</el-button>
          <el-button type="primary" :icon="Download" :disabled="selectedRows.length === 0" @click="handleExport">批量导出</el-button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      stripe
      border
      class="data-table"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="50" />
      <el-table-column prop="orderNumber" label="订单号" min-width="160">
        <template #default="{ row }">
          <el-link type="primary" @click="goToOrderDetail(row.orderId)">{{ row.orderNumber || '-' }}</el-link>
        </template>
      </el-table-column>
      <el-table-column prop="customerName" label="客户姓名" min-width="100">
        <template #default="{ row }">
          <el-link v-if="row.customerId" type="primary" @click="goToCustomerDetail(row.customerId)">{{ row.customerName }}</el-link>
          <span v-else>{{ row.customerName || '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="customerPhone" label="客户电话" width="120" />
      <el-table-column prop="trackingNumber" label="物流单号" min-width="150">
        <template #default="{ row }">
          <el-link v-if="row.trackingNumber" type="primary" @click="showTrackingDialog(row)">{{ row.trackingNumber }}</el-link>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="orderStatus" label="订单状态" width="100">
        <template #default="{ row }">
          <el-tag v-if="row.orderStatus" :type="getOrderStatusType(row.orderStatus)" size="small">
            {{ getOrderStatusText(row.orderStatus) }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column prop="orderDate" label="下单日期" width="110">
        <template #default="{ row }">{{ row.orderDate ? formatDate(row.orderDate) : '-' }}</template>
      </el-table-column>
      <el-table-column prop="companyName" label="外包公司" width="150">
        <template #default="{ row }">
          <el-select
            v-model="row.companyId"
            size="small"
            placeholder="选择公司"
            @change="(val: string) => updateOrderCompany(row, val)"
          >
            <el-option label="待分配" value="default-company" />
            <el-option v-for="company in activeCompanies" :key="company.id" :label="company.companyName" :value="company.id" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="unitPrice" label="单价" width="90" align="right">
        <template #default="{ row }">
          <span style="color: #909399;">¥{{ formatMoney(row.unitPrice) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="有效状态" width="120">
        <template #default="{ row }">
          <el-select
            :model-value="row.status"
            size="small"
            @change="(val: string) => updateOrderStatus(row, val)"
          >
            <el-option v-for="item in validStatusList" :key="item.id" :label="item.label" :value="item.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="settlementStatus" label="结算状态" width="120">
        <template #default="{ row }">
          <el-select
            v-model="row.settlementStatus"
            size="small"
            @change="(val: string) => updateSettlementStatus(row, val)"
          >
            <el-option v-for="item in settlementStatusList" :key="item.id" :label="item.label" :value="item.value" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column prop="settlementAmount" label="实际结算" width="110" align="right">
        <template #default="{ row }">
          <!-- 业务规则：未结算显示0，已结算显示单价 -->
          <span v-if="row.settlementStatus === 'settled' && row.status === 'valid'" style="color: #67c23a; font-weight: 600;">
            ¥{{ formatMoney(row.unitPrice) }}
          </span>
          <span v-else style="color: #909399; font-weight: 600;">
            ¥0.00
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="settlementDate" label="结算日期" width="110">
        <template #default="{ row }">{{ row.settlementDate ? formatDate(row.settlementDate) : '-' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="180">
        <template #default="{ row }">
          <el-tooltip
            v-if="row.remark && row.remark.length > 20"
            :content="row.remark"
            placement="top"
          >
            <span class="remark-text">{{ row.remark.substring(0, 20) }}...</span>
          </el-tooltip>
          <span v-else class="remark-text">{{ row.remark || '-' }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 30, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 状态配置弹窗 -->
    <ValueAddedConfigDialog
      v-model:visible="statusConfigDialogVisible"
      @saved="loadStatusConfigs"
    />

    <!-- 外包公司管理弹窗 -->
    <el-dialog v-model="companyDialogVisible" title="外包公司管理" width="1200px">
      <div class="company-manage-header">
        <el-button type="primary" :icon="Plus" @click="showAddCompanyDialog">添加公司</el-button>
      </div>
      <el-table :data="companies" stripe border>
        <el-table-column prop="sortOrder" label="排序" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="companyName" label="公司名称" min-width="150">
          <template #default="{ row }">
            {{ row.companyName }}
            <el-tag v-if="row.isDefault === 1" type="success" size="small" style="margin-left: 8px;">默认</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="120" />
        <el-table-column label="单价/比例" width="130" align="right">
          <template #default="{ row }">
            <span v-if="row.topTier">
              <span v-if="row.topTier.pricingType === 'fixed'" style="color: #67c23a; font-weight: 600;">
                ¥{{ formatMoney(row.topTier.unitPrice) }}
              </span>
              <span v-else style="color: #e6a23c; font-weight: 600;">
                {{ row.topTier.percentageRate }}%
              </span>
            </span>
            <span v-else style="color: #909399;">未配置</span>
          </template>
        </el-table-column>
        <el-table-column prop="totalOrders" label="总订单数" width="100" align="center">
          <template #default="{ row }">{{ row.totalOrders || 0 }}</template>
        </el-table-column>
        <el-table-column prop="validOrders" label="有效订单" width="100" align="center">
          <template #default="{ row }">{{ row.validOrders || 0 }}</template>
        </el-table-column>
        <el-table-column prop="totalAmount" label="总金额" width="120" align="right">
          <template #default="{ row }">¥{{ formatMoney(row.totalAmount || 0) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="380" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.isDefault !== 1" type="success" link size="small" @click="setDefaultCompany(row.id)">设为默认</el-button>
            <el-button v-else type="warning" link size="small" @click="cancelDefaultCompany(row.id)">取消默认</el-button>
            <el-button type="primary" link size="small" @click="editCompany(row)">编辑</el-button>
            <el-button type="primary" link size="small" @click="editCompanyTiers(row)">价格档位</el-button>
            <el-button type="warning" link size="small" @click="toggleCompanyStatus(row)">{{ row.status === 'active' ? '停用' : '启用' }}</el-button>
            <el-button v-if="!row.totalOrders || row.totalOrders === 0" type="danger" link size="small" @click="deleteCompany(row)">删除</el-button>
            <el-tooltip v-else content="该公司有关联订单，无法删除" placement="top">
              <el-button type="info" link size="small" disabled>删除</el-button>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <!-- 添加/编辑公司弹窗 -->
    <el-dialog
      v-model="addCompanyDialogVisible"
      :title="editingCompany ? '编辑公司' : '添加公司'"
      width="1000px"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="companyFormTab" type="border-card">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-form :model="companyForm" label-width="100px" style="padding: 20px;">
            <el-form-item label="公司名称" required>
              <el-input v-model="companyForm.companyName" placeholder="请输入公司名称" />
            </el-form-item>

            <el-form-item label="联系人">
              <el-input v-model="companyForm.contactPerson" placeholder="请输入联系人" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="companyForm.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="联系邮箱">
              <el-input v-model="companyForm.contactEmail" placeholder="请输入联系邮箱" />
            </el-form-item>
            <el-form-item label="地址">
              <el-input v-model="companyForm.address" type="textarea" :rows="2" placeholder="请输入地址" />
            </el-form-item>
            <el-form-item label="状态">
              <el-radio-group v-model="companyForm.status">
                <el-radio label="active">启用</el-radio>
                <el-radio label="inactive">停用</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="备注">
              <el-input v-model="companyForm.remark" type="textarea" :rows="3" placeholder="请输入备注" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 价格档位标签页 -->
        <el-tab-pane label="价格档位" name="tiers">
          <div v-if="!editingCompany" style="padding: 60px 40px; text-align: center;">
            <el-icon :size="64" style="margin-bottom: 20px; color: #909399;"><InfoFilled /></el-icon>
            <div style="font-size: 18px; margin-bottom: 12px; color: #606266; font-weight: 500;">
              请先保存公司基本信息
            </div>
            <div style="font-size: 14px; margin-bottom: 24px; color: #909399;">
              保存成功后即可配置价格档位
            </div>
            <el-button type="primary" @click="companyFormTab = 'basic'" :icon="ArrowDown">
              返回基本信息
            </el-button>
          </div>
          <div v-else style="padding: 20px;">
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
              <el-button type="primary" :icon="Plus" @click="showAddTierDialog">添加档位</el-button>
              <div style="color: #909399; font-size: 13px;">
                <el-icon style="vertical-align: middle;"><InfoFilled /></el-icon>
                系统会根据订单日期自动匹配对应档位
              </div>
            </div>

            <el-table :data="companyTiers" v-loading="tiersLoading" stripe border>
              <el-table-column prop="tierOrder" label="排序" width="70" align="center" />
              <el-table-column prop="tierName" label="档位名称" min-width="120" />
              <el-table-column prop="pricingType" label="计价方式" width="110">
                <template #default="{ row }">
                  <el-tag :type="row.pricingType === 'fixed' ? 'success' : 'warning'" size="small">
                    {{ row.pricingType === 'fixed' ? '按单计价' : '按比例计价' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="单价/比例" width="130" align="right">
                <template #default="{ row }">
                  <span v-if="row.pricingType === 'fixed'" style="color: #67c23a; font-weight: 600;">
                    ¥{{ formatMoney(row.unitPrice) }}
                  </span>
                  <span v-else style="color: #e6a23c; font-weight: 600;">
                    {{ row.percentageRate }}%
                  </span>
                </template>
              </el-table-column>
              <el-table-column label="生效时间" min-width="200">
                <template #default="{ row }">
                  <span v-if="row.startDate || row.endDate">
                    {{ row.startDate || '不限' }} ~ {{ row.endDate || '不限' }}
                  </span>
                  <span v-else style="color: #909399;">不限制</span>
                </template>
              </el-table-column>
              <el-table-column prop="priority" label="优先级" width="80" align="center" />
              <el-table-column prop="isActive" label="状态" width="80">
                <template #default="{ row }">
                  <el-tag :type="row.isActive === 1 ? 'success' : 'info'" size="small">
                    {{ row.isActive === 1 ? '启用' : '停用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="editTier(row)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteTier(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="addCompanyDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCompany" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加/编辑档位弹窗 -->
    <PriceTierDialog
      v-model:visible="tierDialogVisible"
      :tier="editingTier"
      :company-id="editingCompany?.id || ''"
      @saved="handleTierSaved"
    />

    <!-- 物流详情弹窗 -->
    <TrackingDialog
      v-model="trackingDialogVisible"
      :tracking-no="currentTrackingNo"
      :logistics-company="currentExpressCompany"
      :phone="currentPhone"
    />

    <!-- 备注选择对话框 -->
    <el-dialog
      v-model="remarkDialogVisible"
      :title="remarkDialogType === 'invalid' ? '请选择无效原因' : remarkDialogType === 'restore' ? '请输入恢复原因' : '请选择备注'"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="remark-dialog-content">
        <!-- 改为无效状态 -->
        <div v-if="remarkDialogType === 'invalid'" class="remark-section">
          <div class="remark-section-title">请选择或输入无效原因（必填）</div>
          <el-select
            v-model="selectedRemarkPreset"
            placeholder="请选择无效原因"
            style="width: 100%; margin-bottom: 15px;"
            clearable
          >
            <el-option
              v-for="preset in invalidRemarkPresets"
              :key="preset.id"
              :label="preset.remark_text"
              :value="preset.id"
            />
          </el-select>
          <el-input
            v-model="customRemark"
            type="textarea"
            :rows="4"
            placeholder="或者直接输入自定义原因"
            maxlength="200"
            show-word-limit
          />
        </div>
        <!-- 从无效恢复为有效 -->
        <div v-else-if="remarkDialogType === 'restore'" class="remark-section">
          <div class="remark-section-title">请输入恢复为有效的原因（必填）</div>
          <el-alert
            title="此订单之前标记为无效，现在要恢复为有效状态，请说明原因"
            type="info"
            :closable="false"
            style="margin-bottom: 15px;"
          />
          <el-input
            v-model="customRemark"
            type="textarea"
            :rows="4"
            placeholder="例如：客户重新确认订单、地址已更正、联系上客户等"
            maxlength="200"
            show-word-limit
          />
        </div>
        <!-- 其他备注 -->
        <div v-else class="remark-section">
          <div class="remark-section-title">备注信息（可选）</div>
          <el-select
            v-model="selectedRemarkPreset"
            placeholder="请选择备注（可选）"
            style="width: 100%; margin-bottom: 15px;"
            clearable
          >
            <el-option
              v-for="preset in generalRemarkPresets"
              :key="preset.id"
              :label="preset.remark_text"
              :value="preset.id"
            />
          </el-select>
          <el-input
            v-model="customRemark"
            type="textarea"
            :rows="3"
            placeholder="或者直接输入自定义备注"
            maxlength="200"
            show-word-limit
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="cancelRemarkDialog">取消</el-button>
        <el-button type="primary" @click="confirmRemark">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Document,
  CircleCheck,
  CircleClose,
  Clock,
  Select,
  Search,
  Refresh,
  Setting,
  Plus,
  Download,
  ArrowDown,
  InfoFilled
} from '@element-plus/icons-vue'
import {
  getValueAddedOrders,
  getValueAddedStats,
  batchProcessOrders,
  getOutsourceCompanies,
  createOutsourceCompany,
  updateOutsourceCompany,
  getValueAddedStatusConfigs,
  getRemarkPresets,
  incrementRemarkPresetUsage,
  type ValueAddedOrder,
  type ValueAddedStats,
  type OutsourceCompany,
  type StatusConfig,
  type RemarkPreset
} from '@/api/valueAdded'
import ValueAddedConfigDialog from './components/ValueAddedConfigDialog.vue'
import PriceTierDialog from './components/PriceTierDialog.vue'
import TrackingDialog from '@/components/Logistics/TrackingDialog.vue'

const router = useRouter()

// 状态
const loading = ref(false)
const submitting = ref(false)
const tableData = ref<ValueAddedOrder[]>([])
const selectedRows = ref<ValueAddedOrder[]>([])

// 统计数据
const stats = reactive<ValueAddedStats>({
  all: { count: 0, amount: 0 },
  pending: { count: 0, amount: 0 },
  valid: { count: 0, amount: 0 },
  invalid: { count: 0, amount: 0 },
  unsettled: { count: 0, amount: 0 },
  settled: { count: 0, amount: 0 }
})

// 筛选条件
const quickDateFilter = ref('thisMonth')
const customDateRange = ref<[string, string] | null>(null) // 自定义日期范围
const batchSearchVisible = ref(false)
const batchSearchKeywords = ref('')
const searchKeyword = ref('')
const companyFilter = ref('')
const statusFilter = ref('')
const settlementStatusFilter = ref('')
const activeTab = ref('pending') // 默认加载待处理标签页

// 批量搜索计数
const batchSearchCount = computed(() => {
  if (!batchSearchKeywords.value) return 0
  return batchSearchKeywords.value.split(/[\n,;，；]+/).map(k => k.trim()).filter(k => k.length > 0).length
})

// 快捷日期选项
const quickDateOptions = [
  { label: '今日', value: 'today' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '本季', value: 'thisQuarter' },
  { label: '上季', value: 'lastQuarter' },
  { label: 'Q1', value: 'q1' },
  { label: 'Q2', value: 'q2' },
  { label: 'Q3', value: 'q3' },
  { label: 'Q4', value: 'q4' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 外包公司
const companies = ref<OutsourceCompany[]>([])
const companyDialogVisible = ref(false)
const addCompanyDialogVisible = ref(false)
const companyFormTab = ref('basic') // 添加公司弹窗的标签页
const editingCompany = ref<OutsourceCompany | null>(null)
const companyForm = reactive({
  companyName: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  address: '',
  status: 'active',
  remark: ''
})

// 🔥 计算属性：只返回启用状态的公司（用于下拉选择）
const activeCompanies = computed(() => {
  return companies.value.filter(c => c.status === 'active')
})

// 价格档位管理（集成到添加公司弹窗）
const companyTiers = ref<any[]>([])
const tiersLoading = ref(false)
const tierDialogVisible = ref(false)
const editingTier = ref<any>(null)

// 状态配置
const statusConfigDialogVisible = ref(false)
const validStatusList = ref<StatusConfig[]>([])
const settlementStatusList = ref<StatusConfig[]>([])

// 物流弹窗
const trackingDialogVisible = ref(false)
const currentTrackingNo = ref('')
const currentExpressCompany = ref('')
const currentPhone = ref('')

// 备注选择对话框
const remarkDialogVisible = ref(false)
const remarkDialogType = ref<'invalid' | 'restore' | 'general'>('invalid')
const selectedRemarkPreset = ref('')
const customRemark = ref('')
const currentEditingRow = ref<ValueAddedOrder | null>(null)
const remarkPresets = ref<RemarkPreset[]>([])
const invalidRemarkPresets = computed(() => remarkPresets.value.filter(p => p.category === 'invalid'))
const generalRemarkPresets = computed(() => remarkPresets.value.filter(p => p.category === 'general'))

// 格式化金额
const formatMoney = (val: number | string | undefined) => (Number(val) || 0).toFixed(2)

// 格式化日期
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return dateStr.split('T')[0]
}

// 获取订单状态类型
const getOrderStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    pending: 'info',
    shipped: 'primary',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取订单状态文本
const getOrderStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    completed: '已完成',
    cancelled: '已取消'
  }
  return textMap[status] || status
}

// 初始化
onMounted(async () => {
  await loadStatusConfigs()
  await loadCompanies()
  await loadRemarkPresets()
  setThisMonth()
  await loadData()
  await loadStats()
})

// 设置本月日期
const setThisMonth = () => {
  quickDateFilter.value = 'thisMonth'
}

// 加载状态配置
const loadStatusConfigs = async () => {
  try {
    const res = await getValueAddedStatusConfigs() as any
    // 🔥 修复：axios拦截器已经返回data，不需要再访问res.data
    if (res) {
      validStatusList.value = res.validStatus || []
      settlementStatusList.value = res.settlementStatus || []
    }
  } catch (e) {
    console.error('加载状态配置失败:', e)
  }
}

// 加载备注预设
const loadRemarkPresets = async () => {
  try {
    const res = await getRemarkPresets() as any
    remarkPresets.value = res || []
  } catch (e) {
    console.error('加载备注预设失败:', e)
  }
}

// 加载外包公司列表
const loadCompanies = async () => {
  try {
    const res = await getOutsourceCompanies({ pageSize: 1000 }) as any
    const companiesList = res?.data?.list || res?.list || []

    // 为每个公司加载最高优先级的档位
    const { getCompanyPriceTiers } = await import('@/api/valueAdded')
    for (const company of companiesList) {
      try {
        const tiersRes = await getCompanyPriceTiers(company.id)
        // 🔥 修复：axios拦截器已经返回data，tiersRes就是档位数组
        const tiers = Array.isArray(tiersRes) ? tiersRes : (tiersRes?.data || [])
        console.log(`[loadCompanies] 公司${company.companyName}的档位:`, tiers)
        // 找到最高优先级且启用的档位
        const activeTiers = tiers.filter((t: any) => t.isActive === 1)
        if (activeTiers.length > 0) {
          // 按优先级降序、档位顺序升序排序
          activeTiers.sort((a: any, b: any) => {
            if (b.priority !== a.priority) return b.priority - a.priority
            return a.tierOrder - b.tierOrder
          })
          company.topTier = activeTiers[0]
          console.log(`[loadCompanies] 公司${company.companyName}的最高档位:`, company.topTier)
        } else {
          console.log(`[loadCompanies] 公司${company.companyName}没有启用的档位`)
        }
      } catch (e) {
        console.error(`加载公司${company.companyName}的档位失败:`, e)
      }
    }

    companies.value = companiesList
  } catch (e) {
    console.error('加载外包公司失败:', e)
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }

    // 🔥 优先使用自定义日期范围，否则使用快捷日期
    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    } else if (quickDateFilter.value) {
      params.dateFilter = quickDateFilter.value
    }

    if (companyFilter.value) params.companyId = companyFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    if (settlementStatusFilter.value) params.settlementStatus = settlementStatusFilter.value
    if (activeTab.value !== 'all') params.tab = activeTab.value
    if (batchSearchKeywords.value) params.keywords = batchSearchKeywords.value

    const res = await getValueAddedOrders(params) as any
    tableData.value = res?.data?.list || res?.list || []
    pagination.total = res?.data?.total || res?.total || 0
  } catch (e) {
    console.error('加载数据失败:', e)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const params: any = {}

    // 🔥 优先使用自定义日期范围，否则使用快捷日期
    if (customDateRange.value && customDateRange.value.length === 2) {
      params.startDate = customDateRange.value[0]
      params.endDate = customDateRange.value[1]
    } else if (quickDateFilter.value) {
      params.dateFilter = quickDateFilter.value
    }

    if (companyFilter.value) params.companyId = companyFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    if (settlementStatusFilter.value) params.settlementStatus = settlementStatusFilter.value

    const res = await getValueAddedStats(params) as any
    // 🔥 修复：axios拦截器已经返回data，不需要再访问res.data
    if (res) {
      Object.assign(stats, res)
    }
  } catch (e) {
    console.error('加载统计数据失败:', e)
  }
}

// 快捷日期点击
const handleQuickDateClick = (val: string) => {
  quickDateFilter.value = val

  // 🔥 同步更新日期选择器显示
  if (val === 'all') {
    customDateRange.value = null
  } else {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (val) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
      case 'thisQuarter':
        const thisQuarter = Math.floor(now.getMonth() / 3)
        startDate = new Date(now.getFullYear(), thisQuarter * 3, 1)
        endDate = new Date(now.getFullYear(), (thisQuarter + 1) * 3, 0)
        break
      case 'lastQuarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1
        const lastQuarterYear = lastQuarter < 0 ? now.getFullYear() - 1 : now.getFullYear()
        const lastQuarterMonth = lastQuarter < 0 ? 3 : lastQuarter
        startDate = new Date(lastQuarterYear, lastQuarterMonth * 3, 1)
        endDate = new Date(lastQuarterYear, (lastQuarterMonth + 1) * 3, 0)
        break
      case 'q1':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 3, 0)
        break
      case 'q2':
        startDate = new Date(now.getFullYear(), 3, 1)
        endDate = new Date(now.getFullYear(), 6, 0)
        break
      case 'q3':
        startDate = new Date(now.getFullYear(), 6, 1)
        endDate = new Date(now.getFullYear(), 9, 0)
        break
      case 'q4':
        startDate = new Date(now.getFullYear(), 9, 1)
        endDate = new Date(now.getFullYear(), 12, 0)
        break
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1)
        endDate = new Date(now.getFullYear(), 12, 0)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    }

    // 格式化为 YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    customDateRange.value = [formatDate(startDate), formatDate(endDate)]
  }

  pagination.page = 1
  loadData()
  loadStats()
}

// 自定义日期变化
const handleCustomDateChange = (dates: [string, string] | null) => {
  if (dates && dates.length === 2) {
    quickDateFilter.value = '' // 清空快捷日期
    customDateRange.value = dates
  } else {
    customDateRange.value = null
  }
  pagination.page = 1
  loadData()
  loadStats()
}

// 清空批量搜索
const clearBatchSearch = () => {
  batchSearchKeywords.value = ''
  searchKeyword.value = ''
  batchSearchVisible.value = false
  handleSearch()
}

// 应用批量搜索
const applyBatchSearch = () => {
  batchSearchVisible.value = false
  if (batchSearchCount.value > 0) {
    searchKeyword.value = `已输入 ${batchSearchCount.value} 条`
  } else {
    searchKeyword.value = ''
  }
  pagination.page = 1
  handleSearch()
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
  loadStats()
}

// 重置
const handleReset = () => {
  companyFilter.value = ''
  statusFilter.value = ''
  settlementStatusFilter.value = ''
  batchSearchKeywords.value = ''
  searchKeyword.value = ''
  customDateRange.value = null // 清空自定义日期
  quickDateFilter.value = 'thisMonth'
  handleSearch()
}

// 标签页切换
const handleTabChange = () => {
  pagination.page = 1
  loadData()
}

// 分页
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadData()
}

// 选择变化
const handleSelectionChange = (rows: ValueAddedOrder[]) => {
  selectedRows.value = rows
}

// 更新订单状态
const updateOrderStatus = async (row: ValueAddedOrder, status: string) => {
  const oldStatus = row.status

  // 情况1：改为无效状态 - 弹窗选择无效原因
  if (status === 'invalid') {
    currentEditingRow.value = row
    remarkDialogType.value = 'invalid'
    selectedRemarkPreset.value = ''
    customRemark.value = ''
    remarkDialogVisible.value = true
    return
  }

  // 情况2：从无效改回有效 - 弹窗输入恢复原因
  if (oldStatus === 'invalid' && status === 'valid') {
    currentEditingRow.value = row
    remarkDialogType.value = 'restore' // 新增：恢复类型
    selectedRemarkPreset.value = ''
    customRemark.value = ''
    remarkDialogVisible.value = true
    return
  }

  // 情况3：其他正常状态切换 - 直接更新，备注为状态名称
  try {
    const statusLabel = validStatusList.value.find(s => s.value === status)?.label || status
    const defaultRemark = `${statusLabel}`

    await batchProcessOrders({
      ids: [row.id],
      action: 'updateStatus',
      data: {
        status,
        remark: defaultRemark
      }
    })
    ElMessage.success('更新成功')
    loadData()
    loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
    // 恢复原值
    row.status = row.status
  }
}

// 取消备注对话框
const cancelRemarkDialog = () => {
  remarkDialogVisible.value = false
  // 恢复原状态
  if (currentEditingRow.value) {
    loadData() // 重新加载数据以恢复原状态
  }
}

// 确认备注
const confirmRemark = async () => {
  if (!currentEditingRow.value) return

  // 验证必填
  if (remarkDialogType.value === 'invalid') {
    // 改为无效：必须选择预设或输入自定义原因（二选一）
    if (!customRemark.value.trim() && !selectedRemarkPreset.value) {
      ElMessage.warning('请选择无效原因或输入自定义原因')
      return
    }
  } else if (remarkDialogType.value === 'restore') {
    // 恢复为有效：必须输入恢复原因
    if (!customRemark.value.trim()) {
      ElMessage.warning('请输入恢复为有效的原因')
      return
    }
  }

  try {
    let finalStatus = ''
    let finalRemark = ''

    if (remarkDialogType.value === 'invalid') {
      // 改为无效状态
      finalStatus = 'invalid'

      // 获取备注内容：优先使用自定义输入，其次使用预设
      let remarkText = ''
      if (customRemark.value.trim()) {
        // 优先使用自定义输入
        remarkText = customRemark.value.trim()
      } else if (selectedRemarkPreset.value) {
        // 使用预设
        const preset = remarkPresets.value.find(p => p.id === selectedRemarkPreset.value)
        if (preset) {
          remarkText = preset.remark_text
          // 增加使用次数
          await incrementRemarkPresetUsage(preset.id)
        }
      }

      // 格式化备注：无效：原因
      const statusLabel = validStatusList.value.find(s => s.value === 'invalid')?.label || '无效'
      finalRemark = remarkText ? `${statusLabel}：${remarkText}` : ''

    } else if (remarkDialogType.value === 'restore') {
      // 恢复为有效状态
      finalStatus = 'valid'

      // 格式化备注：有效：恢复原因
      const statusLabel = validStatusList.value.find(s => s.value === 'valid')?.label || '有效'
      finalRemark = `${statusLabel}：${customRemark.value.trim()}`
    }

    // 更新订单状态和备注
    await batchProcessOrders({
      ids: [currentEditingRow.value.id],
      action: 'updateStatus',
      data: {
        status: finalStatus,
        remark: finalRemark
      }
    })

    ElMessage.success('更新成功')
    remarkDialogVisible.value = false
    currentEditingRow.value = null
    loadData()
    loadStats()

    if (remarkDialogType.value === 'invalid') {
      loadRemarkPresets() // 重新加载预设以更新使用次数
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

// 更新结算状态
const updateSettlementStatus = async (row: ValueAddedOrder, settlementStatus: string) => {
  // 业务规则：只有有效状态为"有效"时才能选择"已结算"
  if (settlementStatus === 'settled' && row.status !== 'valid') {
    ElMessage.warning('只有有效状态为"有效"的订单才能设置为已结算')
    // 恢复原值
    row.settlementStatus = row.settlementStatus === 'settled' ? 'unsettled' : row.settlementStatus
    return
  }

  try {
    await batchProcessOrders({
      ids: [row.id],
      action: 'updateSettlementStatus',
      data: { settlementStatus }
    })
    ElMessage.success('更新成功')
    loadData()
    loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '更新失败')
  }
}

// 更新订单公司
const updateOrderCompany = async (row: ValueAddedOrder, companyId: string) => {
  let companyName = '待分配'
  let unitPrice = 0 // 业务规则：待分配时单价为0

  if (companyId !== 'default-company') {
    const company = companies.value.find(c => c.id === companyId)
    if (!company) return
    companyName = company.companyName

    // 🔥 业务规则：使用公司最高优先级档位的单价
    if (company.topTier) {
      if (company.topTier.pricingType === 'fixed') {
        unitPrice = Number(company.topTier.unitPrice) || 0
      } else {
        // 按比例计价时，这里暂时设为0，实际计算需要订单金额
        // TODO: 如果需要立即计算比例价格，需要获取订单金额
        unitPrice = 0
      }
    } else {
      // 没有配置档位时，单价为0
      unitPrice = 0
    }

    console.log(`[updateOrderCompany] 公司=${companyName}, 档位=${company.topTier?.tierName || '未配置'}, 单价=${unitPrice}`)
  }

  try {
    const { updateOrderCompany: updateAPI } = await import('@/api/valueAdded')
    await updateAPI(row.id, {
      companyId,
      companyName,
      unitPrice // 🔥 添加单价参数
    })

    // 更新本地数据
    row.companyId = companyId
    row.companyName = companyName
    row.unitPrice = unitPrice as any // 类型兼容处理

    ElMessage.success('修改成功')
    loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '修改失败')
    loadData() // 失败时重新加载数据
  }
}

// 批量选择公司
const handleBatchCompany = async (companyId: string) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择订单')
    return
  }

  let companyName = '待分配'
  let unitPrice = 0

  if (companyId !== 'default-company') {
    const company = companies.value.find(c => c.id === companyId)
    if (!company) return
    companyName = company.companyName

    // 使用公司最高优先级档位的单价
    if (company.topTier) {
      if (company.topTier.pricingType === 'fixed') {
        unitPrice = Number(company.topTier.unitPrice) || 0
      }
    }
  }

  try {
    await ElMessageBox.confirm(
      `确定将 ${selectedRows.value.length} 个订单的外包公司改为"${companyName}"吗？`,
      '提示',
      { type: 'warning' }
    )
  } catch { return }

  try {
    const { batchUpdateOrderCompany } = await import('@/api/valueAdded')
    await batchUpdateOrderCompany({
      ids: selectedRows.value.map(r => r.id),
      companyId,
      companyName,
      unitPrice
    })
    ElMessage.success('批量设置成功')
    loadData()
    loadStats()
    loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量设置失败')
  }
}

// 批量改有效状态
const handleBatchValidStatus = async (status: string) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择订单')
    return
  }

  try {
    await ElMessageBox.confirm(`确定将 ${selectedRows.value.length} 个订单的有效状态改为该状态？`, '提示', { type: 'warning' })
  } catch { return }

  try {
    await batchProcessOrders({
      ids: selectedRows.value.map(r => r.id),
      action: 'updateStatus',
      data: { status }
    })
    ElMessage.success('批量设置成功')
    loadData()
    loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量设置失败')
  }
}

// 批量改结算状态
const handleBatchSettlementStatus = async (settlementStatus: string) => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请选择订单')
    return
  }

  // 业务规则：如果要批量设置为"已结算"，检查是否所有订单都是"有效"状态
  if (settlementStatus === 'settled') {
    const invalidOrders = selectedRows.value.filter(row => row.status !== 'valid')
    if (invalidOrders.length > 0) {
      ElMessage.warning(`有 ${invalidOrders.length} 个订单的有效状态不是"有效"，无法设置为已结算`)
      return
    }
  }

  try {
    await ElMessageBox.confirm(`确定将 ${selectedRows.value.length} 个订单的结算状态改为该状态？`, '提示', { type: 'warning' })
  } catch { return }

  try {
    await batchProcessOrders({
      ids: selectedRows.value.map(r => r.id),
      action: 'updateSettlementStatus',
      data: { settlementStatus }
    })
    ElMessage.success('批量设置成功')
    loadData()
    loadStats()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量设置失败')
  }
}

// 批量导出
const handleExport = async () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要导出的数据')
    return
  }

  try {
    const XLSX = await import('xlsx')
    const exportData = selectedRows.value.map((row) => ({
      订单号: row.orderNumber || '',
      客户姓名: row.customerName || '',
      客户电话: row.customerPhone || '',
      物流单号: row.trackingNumber || '',
      订单状态: getOrderStatusText(row.orderStatus || ''),
      下单日期: row.orderDate || '',
      外包公司: row.companyName || '',
      单价: Number(row.unitPrice || 0),
      有效状态: row.status || '',
      结算状态: row.settlementStatus || '',
      实际结算: Number(row.settlementAmount || 0),
      结算日期: row.settlementDate || '',
      备注: row.remark || ''
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 订单号
      { wch: 12 }, // 客户姓名
      { wch: 15 }, // 客户电话
      { wch: 20 }, // 物流单号
      { wch: 10 }, // 订单状态
      { wch: 12 }, // 下单日期
      { wch: 15 }, // 外包公司
      { wch: 10 }, // 单价
      { wch: 12 }, // 有效状态
      { wch: 12 }, // 结算状态
      { wch: 12 }, // 实际结算
      { wch: 12 }, // 结算日期
      { wch: 30 }  // 备注
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '增值管理')
    XLSX.writeFile(wb, `增值管理_${new Date().getTime()}.xlsx`)
    ElMessage.success('导出成功')
  } catch (e) {
    console.error('导出失败:', e)
    ElMessage.error('导出失败')
  }
}

// 显示状态配置弹窗
const showStatusConfigDialog = () => {
  statusConfigDialogVisible.value = true
}

// 显示外包公司管理弹窗
const showCompanyDialog = async () => {
  await loadCompanies()
  companyDialogVisible.value = true
}

// 显示添加公司弹窗
const showAddCompanyDialog = () => {
  editingCompany.value = null
  companyFormTab.value = 'basic' // 重置到基本信息标签页
  companyTiers.value = [] // 清空档位列表
  Object.assign(companyForm, {
    companyName: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    status: 'active',
    remark: ''
  })
  addCompanyDialogVisible.value = true
}

// 编辑公司
const editCompany = async (company: OutsourceCompany) => {
  editingCompany.value = company
  companyFormTab.value = 'basic' // 默认显示基本信息
  Object.assign(companyForm, {
    companyName: company.companyName,
    contactPerson: company.contactPerson || '',
    contactPhone: company.contactPhone || '',
    contactEmail: company.contactEmail || '',
    address: company.address || '',
    status: company.status,
    remark: company.remark || ''
  })
  addCompanyDialogVisible.value = true
  // 加载该公司的价格档位
  await loadCompanyTiers(company.id)
}

// 编辑公司价格档位（直接打开档位标签页）
const editCompanyTiers = async (company: OutsourceCompany) => {
  editingCompany.value = company
  companyFormTab.value = 'tiers' // 直接显示价格档位标签页
  Object.assign(companyForm, {
    companyName: company.companyName,
    contactPerson: company.contactPerson || '',
    contactPhone: company.contactPhone || '',
    contactEmail: company.contactEmail || '',
    address: company.address || '',
    status: company.status,
    remark: company.remark || ''
  })
  addCompanyDialogVisible.value = true
  // 加载该公司的价格档位
  await loadCompanyTiers(company.id)
}

// 保存公司
const saveCompany = async () => {
  if (!companyForm.companyName) {
    ElMessage.warning('请输入公司名称')
    return
  }

  submitting.value = true
  try {
    if (editingCompany.value) {
      await updateOutsourceCompany(editingCompany.value.id, companyForm)
      ElMessage.success('更新成功')
      // 如果在价格档位标签页，刷新档位列表
      if (companyFormTab.value === 'tiers') {
        await loadCompanyTiers(editingCompany.value.id)
      }
    } else {
      const result = await createOutsourceCompany(companyForm)
      ElMessage.success('添加成功，可以继续配置价格档位')
      // 保存后切换到编辑模式，允许配置档位
      editingCompany.value = result.data
      companyFormTab.value = 'tiers'
      await loadCompanyTiers(result.data.id)
      // 不关闭弹窗，让用户继续配置档位
      await loadCompanies()
      return
    }
    addCompanyDialogVisible.value = false
    await loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// 设置默认公司
const setDefaultCompany = async (id: string) => {
  try {
    await ElMessageBox.confirm('设置为默认公司后，新同步的订单将自动分配给该公司，确定继续？', '提示', { type: 'warning' })
  } catch { return }

  try {
    const { setDefaultCompany: setDefaultAPI } = await import('@/api/valueAdded')
    await setDefaultAPI(id)
    ElMessage.success('设置成功')
    await loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || '设置失败')
  }
}

// 取消默认公司
const cancelDefaultCompany = async (_id: string) => {
  try {
    await ElMessageBox.confirm('取消默认公司后，新同步的订单将显示为"待分配"，确定继续？', '提示', { type: 'warning' })
  } catch { return }

  try {
    // 调用后端接口取消默认（传递空ID或特殊标识）
    const { setDefaultCompany: setDefaultAPI } = await import('@/api/valueAdded')
    await setDefaultAPI('none') // 使用特殊值表示取消默认
    ElMessage.success('取消成功')
    await loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || '取消失败')
  }
}

// 删除公司
const deleteCompany = async (company: OutsourceCompany) => {
  try {
    await ElMessageBox.confirm(`确定要删除外包公司"${company.companyName}"吗？删除后不可恢复！`, '警告', {
      type: 'warning',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消'
    })
  } catch { return }

  try {
    const { deleteOutsourceCompany } = await import('@/api/valueAdded')
    await deleteOutsourceCompany(company.id)
    ElMessage.success('删除成功')
    await loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// 切换公司状态（启用/停用）
const toggleCompanyStatus = async (company: OutsourceCompany) => {
  const newStatus = company.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '停用'

  try {
    await ElMessageBox.confirm(`确定要${action}外包公司"${company.companyName}"吗？`, '提示', { type: 'warning' })
  } catch { return }

  try {
    await updateOutsourceCompany(company.id, { status: newStatus })
    ElMessage.success(`${action}成功`)
    await loadCompanies()
  } catch (e: any) {
    ElMessage.error(e?.message || `${action}失败`)
  }
}

// ========== 价格档位管理（集成到添加公司弹窗） ==========

// 加载公司的价格档位列表
const loadCompanyTiers = async (companyId: string) => {
  if (!companyId) {
    console.warn('[loadCompanyTiers] companyId为空')
    return
  }

  console.log('[loadCompanyTiers] 开始加载档位，companyId:', companyId)
  tiersLoading.value = true
  try {
    const { getCompanyPriceTiers } = await import('@/api/valueAdded')
    const res = await getCompanyPriceTiers(companyId)
    console.log('[loadCompanyTiers] API返回:', res)
    // 🔥 修复：axios拦截器已经返回data，res就是档位数组
    companyTiers.value = Array.isArray(res) ? res : (res?.data || [])
    console.log('[loadCompanyTiers] 档位列表:', companyTiers.value)
  } catch (e: any) {
    console.error('[loadCompanyTiers] 加载失败:', e)
    ElMessage.error(e?.message || '加载价格档位失败')
    companyTiers.value = []
  } finally {
    tiersLoading.value = false
  }
}

// 显示添加档位弹窗
const showAddTierDialog = () => {
  editingTier.value = null
  tierDialogVisible.value = true
}

// 编辑档位
const editTier = (tier: any) => {
  editingTier.value = tier
  tierDialogVisible.value = true
}

// 删除档位
const deleteTier = async (tier: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除档位"${tier.tierName}"吗？`, '提示', { type: 'warning' })
  } catch { return }

  try {
    const { deletePriceTier } = await import('@/api/valueAdded')
    await deletePriceTier(editingCompany.value!.id, tier.id)
    ElMessage.success('删除成功')
    await loadCompanyTiers(editingCompany.value!.id)
  } catch (e: any) {
    ElMessage.error(e?.message || '删除失败')
  }
}

// 档位保存成功回调
const handleTierSaved = async () => {
  console.log('[handleTierSaved] 档位保存成功，准备刷新列表')
  console.log('[handleTierSaved] editingCompany:', editingCompany.value)
  if (editingCompany.value) {
    console.log('[handleTierSaved] 调用loadCompanyTiers，companyId:', editingCompany.value.id)
    await loadCompanyTiers(editingCompany.value.id)
    // 同时刷新公司列表，更新"单价/比例"列
    await loadCompanies()
  } else {
    console.warn('[handleTierSaved] editingCompany为空，无法刷新档位列表')
  }
}

// ========== 独立的价格档位弹窗（保留用于公司列表操作） ==========
// 已移除，档位管理已集成到添加/编辑公司弹窗中

// 显示物流详情弹窗
const showTrackingDialog = (row: ValueAddedOrder) => {
  currentTrackingNo.value = row.trackingNumber || ''
  currentExpressCompany.value = '' // 物流公司信息可以从订单详情获取
  currentPhone.value = row.customerPhone || ''
  trackingDialogVisible.value = true
}

// 跳转到订单详情
const goToOrderDetail = (id: string) => {
  if (id) router.push(`/order/detail/${id}`)
}

// 跳转到客户详情
const goToCustomerDetail = (id: string) => {
  if (id) router.push(`/customer/detail/${id}`)
}
</script>

<style scoped>
.value-added-manage-page {
  padding: 20px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.15);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 16px;
}

.stat-icon.all {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.stat-icon.valid {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: #fff;
}

.stat-icon.invalid {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: #fff;
}

.stat-icon.unsettled {
  background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
  color: #fff;
}

.stat-icon.settled {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #fff;
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-amount {
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

.quick-filters {
  margin-bottom: 16px;
}

.quick-btn-group {
  display: flex;
  gap: 8px;
}

.quick-btn {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  background: #fff;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.quick-btn:hover {
  color: #409eff;
  border-color: #c6e2ff;
  background: #ecf5ff;
}

.quick-btn.active {
  color: #fff;
  background: #409eff;
  border-color: #409eff;
}

.filter-container {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-search {
  width: 250px;
}

.filter-item {
  width: 180px;
}

.batch-search-popover {
  padding: 12px;
}

.batch-search-header {
  margin-bottom: 12px;
}

.batch-search-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
}

.batch-search-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

.batch-search-textarea {
  margin-bottom: 12px;
}

.batch-search-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-search-count {
  font-size: 12px;
  color: #909399;
}

.batch-search-actions {
  display: flex;
  gap: 8px;
}

.tabs-wrapper {
  background: #fff;
  border-radius: 8px 8px 0 0;
  padding: 0 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tabs {
  flex: 1;
  margin-bottom: 0;
}

.status-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.status-tabs :deep(.el-tabs__content) {
  display: none;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 0;
  justify-content: flex-end;
  transition: all 0.3s ease;

  &.has-selection {
    justify-content: space-between;
  }
}

.batch-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.regular-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-left: auto;
}

.tab-badge {
  margin-left: 4px;
}

.tab-badge-valid :deep(.el-badge__content) {
  background-color: #67c23a;
}

.tab-badge-invalid :deep(.el-badge__content) {
  background-color: #909399;
}

.data-table {
  background: #fff;
  border-radius: 0 0 8px 8px;
  margin-bottom: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.company-manage-header,
.price-config-header {
  margin-bottom: 16px;
}
</style>

/* 备注相关样式 */
.remark-text {
  font-size: 13px;
  color: #606266;
}

.remark-dialog-content {
  padding: 10px 0;
}

.remark-section {
  margin-bottom: 20px;
}

.remark-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.remark-radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.remark-radio {
  margin: 0;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.remark-radio:hover {
  background: #e8f4ff;
  border-color: #409eff;
}

:deep(.remark-radio.is-checked) {
  background: #e8f4ff;
  border-color: #409eff;
}
