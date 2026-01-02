<template>
  <div class="call-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>通话管理</h2>
      <div class="header-actions">
        <el-tooltip :content="callStatus === 'ready' ? '点击切换为忙碌状态，将不接收来电分配' : '点击切换为就绪状态，可以接收来电分配'">
          <el-button
            :type="callStatus === 'ready' ? 'success' : 'warning'"
            @click="toggleCallStatus"
            class="status-button"
          >
            <el-icon style="margin-right: 6px;" v-if="callStatus === 'ready'"><CircleCheckFilled /></el-icon>
            <el-icon style="margin-right: 6px;" v-else><WarningFilled /></el-icon>
            {{ callStatus === 'ready' ? '就绪' : '忙碌' }}
          </el-button>
        </el-tooltip>
        <el-button type="info" :icon="Setting" @click="openCallConfigDialog">
          呼出配置
        </el-button>
        <el-tooltip :content="autoRefresh ? '关闭自动刷新' : '开启自动刷新'">
          <el-button
            :type="autoRefresh ? 'success' : 'info'"
            :icon="autoRefresh ? 'VideoPause' : 'VideoPlay'"
            @click="toggleAutoRefresh"
            circle
          />
        </el-tooltip>
        <el-button type="info" @click="testIncomingCall">
          测试呼入
        </el-button>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Phone /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.todayCalls }}</div>
              <div class="stat-label">今日通话</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ formatDuration(statistics.totalDuration) }}</div>
              <div class="stat-label">通话时长</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><SuccessFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.connectionRate }}%</div>
              <div class="stat-label">接通率</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ statistics.activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选器和搜索栏 -->
    <el-card class="filter-card">
      <div class="filter-section">
        <div class="filter-row">
          <div class="filter-item">
            <label>通话状态：</label>
            <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
              <el-option label="全部" value="" />
              <el-option label="待外呼" value="pending" />
              <el-option label="已接通" value="connected" />
              <el-option label="未接听" value="no_answer" />
              <el-option label="忙线" value="busy" />
              <el-option label="失败" value="failed" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>客户等级：</label>
            <el-select v-model="filterForm.customerLevel" placeholder="请选择等级" clearable>
              <el-option label="全部" value="" />
              <el-option label="普通客户" value="normal" />
              <el-option label="白银客户" value="silver" />
              <el-option label="黄金客户" value="gold" />
              <el-option label="钻石客户" value="diamond" />
            </el-select>
          </div>
          <div class="filter-item">
            <label>时间范围：</label>
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </div>
          <!-- 🔥 只有超管、管理员、部门经理可以看到负责人筛选 -->
          <div class="filter-item" v-if="canViewSalesPersonFilter">
            <label>负责人：</label>
            <el-select v-model="filterForm.salesPerson" placeholder="请选择负责人" clearable filterable>
              <el-option label="全部" value="" />
              <el-option
                v-for="user in salesPersonList"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </div>
        </div>
        <div class="search-row">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索客户姓名、电话号码、订单号"
            clearable
            style="width: 400px;"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="RefreshRight" @click="resetFilter">重置</el-button>
        </div>
      </div>
    </el-card>

    <!-- 呼出列表表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>呼出列表</span>
          <div class="table-actions">
            <el-button type="primary" :icon="Phone" @click="openOutboundDialog">发起外呼</el-button>
            <el-button :icon="Refresh" @click="refreshData" :loading="refreshLoading">刷新数据</el-button>
            <el-button type="primary" :icon="Phone" @click="showCallRecordsDialog">通话记录</el-button>
            <el-button :icon="Download" @click="handleExport">导出数据</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="outboundList"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="phone" label="电话号码" width="140">
          <template #default="{ row }">
            {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
          </template>
        </el-table-column>
        <el-table-column prop="customerLevel" label="客户等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.customerLevel)">
              {{ getLevelText(row.customerLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCallTime" label="最后通话" width="160" />
        <el-table-column prop="callCount" label="通话次数" width="100" />
        <el-table-column prop="lastFollowUp" label="最新跟进" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastFollowUp">{{ row.lastFollowUp }}</span>
            <span v-else class="text-muted">暂无记录</span>
          </template>
        </el-table-column>
        <el-table-column prop="callTags" label="通话标签" min-width="120">
          <template #default="{ row }">
            <template v-if="row.callTags && row.callTags.length > 0">
              <el-tag v-for="tag in row.callTags" :key="tag" size="small" type="info" style="margin-right: 4px;">
                {{ tag }}
              </el-tag>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="salesPerson" label="负责人" width="100" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <span class="action-link" @click="handleCall(row)">外呼</span>
            <span class="action-link" @click="handleViewDetail(row)">详情</span>
            <span class="action-link" @click="handleAddFollowUp(row)">跟进</span>
            <span class="action-link" @click="handleCreateOrder(row)">下单</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <div class="pagination-stats">
          <span class="stats-text">
            共 {{ pagination.total }} 条记录，当前显示第 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} - {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.total) }} 条
          </span>
        </div>
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 外呼对话框 -->
    <el-dialog v-model="showOutboundDialog" title="发起外呼" width="650px" @open="initOutboundDialog">
      <el-form :model="outboundForm" :rules="outboundRules" ref="outboundFormRef" label-width="100px">
        <el-form-item label="外呼方式" prop="callMethod">
          <el-select
            v-model="outboundForm.callMethod"
            placeholder="请选择外呼方式"
            style="width: 100%"
            @change="onOutboundMethodChange"
          >
            <el-option
              v-if="workPhones.length > 0"
              label="工作手机"
              value="work_phone"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;">
                  <div style="font-weight: 500;">工作手机</div>
                  <div style="color: #8492a6; font-size: 12px;">使用绑定的工作手机拨打</div>
                </div>
                <el-tag size="small" type="success" style="margin-left: 12px;">推荐</el-tag>
              </div>
            </el-option>
            <el-option
              v-if="availableLines.length > 0"
              label="网络电话"
              value="network_phone"
            >
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="flex: 1;">
                  <div style="font-weight: 500;">网络电话</div>
                  <div style="color: #8492a6; font-size: 12px;">使用系统分配的外呼线路</div>
                </div>
                <el-tag size="small" type="info" style="margin-left: 12px;">录音</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="!workPhones.length && !availableLines.length" style="color: #f56c6c; font-size: 12px; margin-top: 4px;">
            暂无可用的外呼方式，请先在"呼出配置"中绑定工作手机或联系管理员分配线路
          </div>
        </el-form-item>

        <!-- 工作手机选择 -->
        <el-form-item
          v-if="outboundForm.callMethod === 'work_phone'"
          label="选择手机"
          prop="selectedWorkPhone"
        >
          <el-select
            v-model="outboundForm.selectedWorkPhone"
            placeholder="请选择工作手机"
            style="width: 100%"
            popper-class="outbound-select-popper"
          >
            <el-option
              v-for="phone in workPhones"
              :key="phone.id"
              :label="`${phone.number} (${phone.status === 'online' || phone.status === '在线' ? '在线' : '离线'})`"
              :value="phone.id"
              :disabled="phone.status !== 'online' && phone.status !== '在线'"
            >
              <div class="select-option-row">
                <div class="option-content">
                  <div class="option-title">{{ phone.number }}</div>
                  <div class="option-desc">{{ phone.name || '工作手机' }}</div>
                </div>
                <el-tag
                  size="small"
                  :type="phone.status === 'online' || phone.status === '在线' ? 'success' : 'danger'"
                  class="option-tag"
                >
                  {{ phone.status === 'online' || phone.status === '在线' ? '在线' : '离线' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <!-- 在线提示 -->
          <div v-if="selectedWorkPhoneOnline" class="phone-online-tip">
            <el-alert
              type="success"
              :closable="false"
              show-icon
            >
              <template #title>
                <span>已连接到手机，可拨打电话</span>
                <el-button type="primary" size="small" link @click="handleRefreshDeviceStatus" style="margin-left: 12px;">
                  刷新状态
                </el-button>
              </template>
            </el-alert>
          </div>
          <!-- 离线提示和重新连接按钮 -->
          <div v-if="selectedWorkPhoneOffline" class="phone-offline-tip">
            <el-alert
              type="warning"
              :closable="false"
              show-icon
            >
              <template #title>
                <span>当前选择的手机已离线，请在手机APP上重新连接</span>
                <el-button type="primary" size="small" link @click="handleRefreshDeviceStatus" style="margin-left: 12px;">
                  刷新状态
                </el-button>
                <el-button type="primary" size="small" link @click="handleShowBindQRCode" style="margin-left: 8px;">
                  重新扫码绑定
                </el-button>
              </template>
            </el-alert>
          </div>
        </el-form-item>

        <!-- 网络电话线路选择 -->
        <el-form-item
          v-if="outboundForm.callMethod === 'network_phone'"
          label="选择线路"
          prop="selectedLine"
        >
          <el-select
            v-model="outboundForm.selectedLine"
            placeholder="请选择外呼线路"
            style="width: 100%"
            popper-class="outbound-select-popper"
          >
            <el-option
              v-for="line in availableLines"
              :key="line.id"
              :label="`${line.name} (${line.status})`"
              :value="line.id"
            >
              <div class="select-option-row">
                <div class="option-content">
                  <div class="option-title">{{ line.name }}</div>
                  <div class="option-desc">{{ getProviderText(line.provider) }} · {{ line.callerNumber || '未设置主叫号码' }}</div>
                </div>
                <el-tag
                  size="small"
                  :type="line.status === '正常' ? 'success' : 'warning'"
                  class="option-tag"
                >
                  {{ line.status }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="选择客户" prop="selectedCustomer">
          <el-select
            v-model="outboundForm.selectedCustomer"
            placeholder="请输入客户姓名、编号、电话或公司名称进行搜索"
            filterable
            remote
            :remote-method="debouncedSearchCustomers"
            :loading="isSearching || customerStore.loading"
            style="width: 100%"
            popper-class="outbound-select-popper"
            @change="onCustomerChange"
            @focus="() => { if (customerOptions.length === 0) searchCustomers() }"
            clearable
            no-data-text="暂无客户数据，请输入关键词搜索"
            no-match-text="未找到匹配的客户"
            loading-text="正在搜索客户..."
            value-key="id"
          >
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="customer.name"
              :value="customer"
            >
              <div class="select-option-row">
                <div class="option-content">
                  <div class="option-title">
                    {{ customer.name }}
                  </div>
                  <div class="option-desc">
                    <span v-if="customer.phone">{{ displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE) }}</span>
                    <el-tag v-if="customer.phone && getPhoneCarrier(customer.phone)" size="small" type="info" style="margin-left: 6px; transform: scale(0.9);">{{ getPhoneCarrier(customer.phone) }}</el-tag>
                  </div>
                </div>
                <el-tag size="small" type="primary" class="option-tag">
                  {{ customer.code || '无编号' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="选择号码" prop="customerPhone">
          <el-select
            v-model="outboundForm.customerPhone"
            placeholder="请选择号码"
            style="width: 100%"
            popper-class="outbound-select-popper"
            :disabled="!outboundForm.selectedCustomer"
          >
            <el-option
              v-for="phone in phoneOptions"
              :key="phone.phone"
              :label="displaySensitiveInfoNew(phone.phone, SensitiveInfoType.PHONE)"
              :value="phone.phone"
            >
              <div class="select-option-row">
                <div class="option-content">
                  <span>{{ displaySensitiveInfoNew(phone.phone, SensitiveInfoType.PHONE) }}</span>
                  <el-tag v-if="getPhoneCarrier(phone.phone)" size="small" type="info" style="margin-left: 6px; transform: scale(0.9);">{{ getPhoneCarrier(phone.phone) }}</el-tag>
                </div>
                <el-tag size="small" type="info" class="option-tag">{{ phone.type }}</el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="手动输入号码">
          <el-input
            v-model="outboundForm.manualPhone"
            placeholder="或手动输入电话号码"
          />
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            手动输入号码将优先使用，不会同步客户信息
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="outboundForm.notes" type="textarea" :rows="3" placeholder="请输入通话备注" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer-buttons">
          <el-button @click="closeOutboundDialog">取消</el-button>
          <el-tooltip
            :disabled="canStartCall"
            :content="getCannotCallReason"
            placement="top"
          >
            <span>
              <el-button
                type="primary"
                @click="startOutboundCall"
                :loading="outboundLoading"
                :disabled="!canStartCall"
              >
                开始呼叫
              </el-button>
            </span>
          </el-tooltip>
        </div>
      </template>
    </el-dialog>

    <!-- 绑定二维码弹窗 -->
    <el-dialog v-model="bindQRDialogVisible" title="扫码绑定工作手机" width="400px" @close="stopBindStatusCheck">
      <div class="qr-bind-content">
        <div v-if="bindQRCodeUrl" class="qr-code-wrapper">
          <img :src="bindQRCodeUrl" alt="绑定二维码" class="qr-code-img" />
          <div class="qr-status">
            <template v-if="bindStatus === 'pending'">
              <el-icon class="is-loading"><Loading /></el-icon>
              等待扫码...
            </template>
            <template v-else-if="bindStatus === 'connected'">
              <el-icon style="color: #67c23a;"><CircleCheckFilled /></el-icon>
              绑定成功！
            </template>
            <template v-else-if="bindStatus === 'expired'">
              <el-icon style="color: #f56c6c;"><WarningFilled /></el-icon>
              二维码已过期
            </template>
          </div>
        </div>
        <div v-else class="qr-loading">
          <el-icon class="is-loading" size="32"><Loading /></el-icon>
          <p>正在生成二维码...</p>
        </div>
        <div class="qr-tips">
          <p>1. 在工作手机上打开"外呼助手"APP</p>
          <p>2. 点击"扫码绑定"功能</p>
          <p>3. 扫描上方二维码完成绑定</p>
        </div>
      </div>
      <template #footer>
        <el-button v-if="bindStatus === 'expired'" type="primary" @click="refreshBindQRCode">
          重新生成
        </el-button>
        <el-button @click="bindQRDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 客户详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`客户详情 - ${currentCustomer?.customerName}`"
      width="900px"
      top="5vh"
      class="customer-detail-dialog"
      :close-on-click-modal="false"
    >
      <div v-if="currentCustomer" class="customer-detail">
        <!-- 客户基本信息卡片 -->
        <div class="customer-header">
          <div class="customer-main-info">
            <div class="customer-avatar">
              <el-avatar :size="48">{{ currentCustomer.customerName?.charAt(0) }}</el-avatar>
            </div>
            <div class="customer-basic">
              <div class="customer-name">
                {{ currentCustomer.customerName }}
                <el-tag :type="getLevelType(currentCustomer.customerLevel)" size="small" style="margin-left: 8px;">
                  {{ getLevelText(currentCustomer.customerLevel) }}
                </el-tag>
              </div>
              <div class="customer-contact">
                <span class="contact-item">
                  <el-icon><Phone /></el-icon>
                  {{ displaySensitiveInfoNew(currentCustomer.phone, SensitiveInfoType.PHONE) }}
                </span>
                <span class="contact-item">
                  <el-icon><User /></el-icon>
                  {{ currentCustomer.salesPerson || '未分配' }}
                </span>
              </div>
            </div>
          </div>
          <div class="customer-stats">
            <div class="stat-item">
              <div class="stat-value">{{ detailPagination.orders.total }}</div>
              <div class="stat-label">订单</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ detailPagination.calls.total }}</div>
              <div class="stat-label">通话</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ detailPagination.followups.total }}</div>
              <div class="stat-label">跟进</div>
            </div>
            <div class="stat-item">
              <div class="stat-value last-call">{{ customerCalls.length > 0 ? customerCalls[0].startTime?.split(' ')[0] : '-' }}</div>
              <div class="stat-label">最后通话</div>
            </div>
          </div>
        </div>

        <!-- 选项卡内容 -->
        <div class="tabs-section">
          <div class="tabs-header">
            <el-tabs v-model="activeTab" class="detail-tabs">
              <el-tab-pane label="订单记录" name="orders" />
              <el-tab-pane label="售后记录" name="aftersales" />
              <el-tab-pane label="通话记录" name="calls" />
              <el-tab-pane label="跟进记录" name="followups" />
            </el-tabs>
            <div class="tabs-actions">
              <el-button v-if="activeTab === 'orders'" type="primary" size="small" @click="handleCreateOrder">新建订单</el-button>
              <el-button v-if="activeTab === 'aftersales'" type="primary" size="small" @click="handleCreateAftersales">新建售后</el-button>
              <el-button v-if="activeTab === 'calls'" type="primary" size="small" @click="handleDetailOutboundCall">发起外呼</el-button>
              <el-button v-if="activeTab === 'followups'" type="primary" size="small" @click="openFollowupDialog">新建跟进</el-button>
            </div>
          </div>

          <!-- 订单记录表格 -->
          <div v-show="activeTab === 'orders'" class="tab-content">
            <el-table :data="paginatedOrders" v-loading="detailLoading" size="small" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
              <el-table-column prop="orderNo" label="订单号" min-width="160" />
              <el-table-column prop="productName" label="商品名称" min-width="180" show-overflow-tooltip />
              <el-table-column prop="amount" label="金额" width="100" align="right">
                <template #default="{ row }">
                  <span style="color: #f56c6c; font-weight: 500;">¥{{ row.amount }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusTagType(row.status)" size="small">
                    {{ getOrderStatusTextFromConfig(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="下单时间" width="150" />
              <el-table-column label="操作" width="60" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewOrder(row)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!detailLoading && customerOrders.length === 0" description="暂无订单记录" :image-size="60" />
            <div v-if="detailPagination.orders.total > 0" class="tab-pagination">
              <el-pagination
                v-model:current-page="detailPagination.orders.page"
                v-model:page-size="detailPagination.orders.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="detailPagination.orders.total"
                layout="total, sizes, prev, pager, next"
                size="small"
              />
            </div>
          </div>

          <!-- 售后记录表格 -->
          <div v-show="activeTab === 'aftersales'" class="tab-content">
            <el-table :data="paginatedAftersales" v-loading="detailLoading" size="small" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
              <el-table-column prop="ticketNo" label="工单号" min-width="150" />
              <el-table-column prop="type" label="类型" width="100" />
              <el-table-column prop="description" label="问题描述" min-width="200" show-overflow-tooltip />
              <el-table-column prop="status" label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getAftersalesStatusType(row.status)" size="small">
                    {{ getAftersalesStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建时间" width="150" />
              <el-table-column label="操作" width="60" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewAftersales(row)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!detailLoading && customerAftersales.length === 0" description="暂无售后记录" :image-size="60" />
            <div v-if="detailPagination.aftersales.total > 0" class="tab-pagination">
              <el-pagination
                v-model:current-page="detailPagination.aftersales.page"
                v-model:page-size="detailPagination.aftersales.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="detailPagination.aftersales.total"
                layout="total, sizes, prev, pager, next"
                size="small"
              />
            </div>
          </div>

          <!-- 通话记录表格 -->
          <div v-show="activeTab === 'calls'" class="tab-content">
            <el-table :data="paginatedCalls" v-loading="detailLoading" size="small" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
              <el-table-column prop="callType" label="类型" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.callType === 'outbound' ? '' : 'success'" size="small">
                    {{ row.callType === 'outbound' ? '外呼' : '来电' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="duration" label="时长" width="80" align="center" />
              <el-table-column label="录音" width="120" align="center">
                <template #default="{ row }">
                  <template v-if="row.recordingUrl">
                    <el-button link type="primary" size="small" @click="playRecording(row)">
                      <el-icon><VideoPlay /></el-icon> 播放
                    </el-button>
                    <el-button link type="success" size="small" @click="downloadRecording(row)">
                      <el-icon><Download /></el-icon>
                    </el-button>
                  </template>
                  <span v-else style="color: #c0c4cc;">无录音</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="getCallStatusType(row.status)" size="small">
                    {{ getCallStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="操作人" width="90" />
              <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip />
              <el-table-column prop="startTime" label="开始时间" width="150" />
              <el-table-column label="操作" width="60" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewCallDetail(row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!detailLoading && customerCalls.length === 0" description="暂无通话记录" :image-size="60" />
            <div v-if="detailPagination.calls.total > 0" class="tab-pagination">
              <el-pagination
                v-model:current-page="detailPagination.calls.page"
                v-model:page-size="detailPagination.calls.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="detailPagination.calls.total"
                layout="total, sizes, prev, pager, next"
                size="small"
              />
            </div>
          </div>

          <!-- 跟进记录表格 -->
          <div v-show="activeTab === 'followups'" class="tab-content">
            <el-table :data="paginatedFollowups" v-loading="detailLoading" size="small" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
              <el-table-column prop="type" label="类型" width="90">
                <template #default="{ row }">
                  {{ getFollowUpTypeLabel(row.type) }}
                </template>
              </el-table-column>
              <el-table-column prop="content" label="跟进内容" min-width="160" show-overflow-tooltip />
              <el-table-column prop="customerIntent" label="意向" width="80" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.customerIntent" :type="getIntentType(row.customerIntent)" size="small">
                    {{ getIntentLabel(row.customerIntent) }}
                  </el-tag>
                  <span v-else style="color: #c0c4cc;">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="callTags" label="标签" min-width="100">
                <template #default="{ row }">
                  <template v-if="row.callTags && row.callTags.length > 0">
                    <el-tag v-for="tag in row.callTags.slice(0, 2)" :key="tag" size="small" type="info" style="margin-right: 2px;">
                      {{ tag }}
                    </el-tag>
                    <span v-if="row.callTags.length > 2" style="color: #909399;">+{{ row.callTags.length - 2 }}</span>
                  </template>
                  <span v-else style="color: #c0c4cc;">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="nextPlan" label="下次计划" width="150" />
              <el-table-column prop="operator" label="跟进人" width="80" />
              <el-table-column prop="createTime" label="跟进时间" width="150" />
              <el-table-column label="操作" width="60" align="center">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="viewFollowup(row)">查看</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-if="!detailLoading && customerFollowups.length === 0" description="暂无跟进记录" :image-size="60" />
            <div v-if="detailPagination.followups.total > 0" class="tab-pagination">
              <el-pagination
                v-model:current-page="detailPagination.followups.page"
                v-model:page-size="detailPagination.followups.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="detailPagination.followups.total"
                layout="total, sizes, prev, pager, next"
                size="small"
              />
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 通话记录弹窗 -->
    <el-dialog
      v-model="callRecordsDialogVisible"
      title="通话记录"
      width="80%"
      :before-close="handleCloseCallRecordsDialog"
    >
      <div class="call-records-dialog">
        <!-- 筛选器 -->
        <div class="dialog-filters">
          <div class="filter-row">
            <div class="filter-item">
              <label>日期范围：</label>
              <el-date-picker
                v-model="callRecordsFilter.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                @change="loadCallRecords"
              />
            </div>
            <div class="filter-item">
              <label>客户搜索：</label>
              <el-input
                v-model="callRecordsFilter.customerKeyword"
                placeholder="搜索客户姓名或电话"
                clearable
                style="width: 200px;"
                @input="loadCallRecords"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <el-button type="primary" :icon="Search" @click="loadCallRecords">搜索</el-button>
            <el-button :icon="RefreshRight" @click="resetCallRecordsFilter">重置</el-button>
          </div>
        </div>

        <!-- 通话记录表格 -->
        <el-table :data="callRecordsList" style="width: 100%" v-loading="callRecordsLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
          <el-table-column prop="customerName" label="客户姓名" width="120" />
          <el-table-column prop="customerPhone" label="客户电话" width="140">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>
          <el-table-column prop="callType" label="通话类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.callType === 'outbound' ? '' : 'success'" size="small">
                {{ row.callType === 'outbound' ? '外呼' : '来电' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="通话时长" width="100" align="center" />
          <el-table-column prop="status" label="通话状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="开始时间" width="160" />
          <el-table-column prop="operator" label="操作人员" width="100" />
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column label="录音" width="140" align="center">
            <template #default="{ row }">
              <template v-if="row.recordingUrl">
                <el-button link type="primary" size="small" @click="playRecording(row)">播放</el-button>
                <el-button link type="success" size="small" @click="downloadRecording(row)">下载</el-button>
              </template>
              <span v-else style="color: #c0c4cc;">无录音</span>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="dialog-pagination">
          <el-pagination
            v-model:current-page="callRecordsPagination.currentPage"
            v-model:page-size="callRecordsPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="callRecordsPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleCallRecordsPageSizeChange"
            @current-change="handleCallRecordsPageChange"
          />
        </div>
      </div>
    </el-dialog>

    <!-- 录音播放器弹窗 -->
    <el-dialog
      v-model="recordingPlayerVisible"
      title="录音播放"
      width="500px"
      :before-close="stopRecording"
    >
      <div class="recording-player">
        <div class="recording-info">
          <div class="info-row">
            <span class="info-label">客户</span>
            <span class="info-value">{{ currentRecording?.customerName || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">电话</span>
            <span class="info-value">{{ displaySensitiveInfoNew(currentRecording?.customerPhone, SensitiveInfoType.PHONE) }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时间</span>
            <span class="info-value">{{ currentRecording?.startTime || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="info-label">时长</span>
            <span class="info-value">{{ currentRecording?.duration || '-' }}</span>
          </div>
        </div>
        <div class="audio-player">
          <audio
            ref="audioPlayer"
            :src="currentRecording?.recordingUrl"
            controls
            style="width: 100%;"
            @loadstart="onAudioLoadStart"
            @canplay="onAudioCanPlay"
            @error="onAudioError"
          >
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>
    </el-dialog>

    <!-- 快捷跟进弹窗 -->
    <el-dialog
      v-model="quickFollowUpVisible"
      title="快捷跟进"
      width="600px"
      @close="resetQuickFollowUpForm"
    >
      <div class="quick-followup">
        <div class="customer-info">
          <p><strong>客户：</strong>{{ currentCustomer?.name }}</p>
          <p><strong>电话：</strong>{{ displaySensitiveInfoNew(currentCustomer?.phone, SensitiveInfoType.PHONE) }}</p>
          <p><strong>收货地址：</strong>{{ getCustomerShippingAddress(currentCustomer) }}</p>
        </div>

        <el-form :model="quickFollowUpForm" :rules="quickFollowUpRules" ref="quickFollowUpFormRef" label-width="100px">
          <el-form-item label="跟进类型" prop="type">
            <el-select v-model="quickFollowUpForm.type" placeholder="请选择跟进类型" style="width: 100%">
              <el-option label="电话跟进" value="call" />
              <el-option label="上门拜访" value="visit" />
              <el-option label="邮件跟进" value="email" />
              <el-option label="短信跟进" value="message" />
            </el-select>
          </el-form-item>

          <el-form-item label="跟进内容" prop="content">
            <el-input
              v-model="quickFollowUpForm.content"
              type="textarea"
              :rows="4"
              placeholder="请输入跟进内容..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="下次跟进" prop="nextFollowTime">
            <el-date-picker
              v-model="quickFollowUpForm.nextFollowTime"
              type="datetime"
              placeholder="选择下次跟进时间"
              style="width: 100%"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              :disabled-date="disablePastDate"
              :default-time="new Date()"
            />
          </el-form-item>

          <el-form-item label="客户意向" prop="intention">
            <el-select v-model="quickFollowUpForm.intention" placeholder="请选择客户意向" style="width: 100%">
              <el-option label="很有意向" value="high" />
              <el-option label="一般意向" value="medium" />
              <el-option label="意向较低" value="low" />
              <el-option label="暂无意向" value="none" />
            </el-select>
          </el-form-item>

          <el-form-item label="通话标签">
            <el-select
              v-model="quickFollowUpForm.callTags"
              multiple
              placeholder="选择通话标签（可多选）"
              style="width: 100%"
              collapse-tags
              collapse-tags-tooltip
            >
              <el-option
                v-for="tag in callTagOptions"
                :key="tag"
                :label="tag"
                :value="tag"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="备注" prop="remark">
            <el-input
              v-model="quickFollowUpForm.remark"
              type="textarea"
              :rows="2"
              placeholder="备注信息（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="quickFollowUpVisible = false">取消</el-button>
          <el-button type="primary" @click="submitQuickFollowUp" :loading="quickFollowUpSubmitting">
            保存跟进
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 呼入弹窗 -->
    <el-dialog
      v-model="incomingCallVisible"
      title="来电提醒"
      width="500px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="incoming-call" v-if="incomingCallData">
        <div class="caller-info">
          <div class="caller-avatar">
            <el-icon size="60"><User /></el-icon>
          </div>
          <div class="caller-details">
            <h3>{{ incomingCallData.customerName || '未知客户' }}</h3>
            <p class="phone-number">{{ displaySensitiveInfoNew(incomingCallData.phone, SensitiveInfoType.PHONE) }}</p>
            <p class="customer-level" v-if="incomingCallData.customerLevel">
              <el-tag :type="getLevelType(incomingCallData.customerLevel)">
                {{ getLevelText(incomingCallData.customerLevel) }}
              </el-tag>
            </p>
            <p class="last-call" v-if="incomingCallData.lastCallTime">
              上次通话：{{ incomingCallData.lastCallTime }}
            </p>
          </div>
        </div>

        <div class="call-actions">
          <el-button
            type="success"
            size="large"
            :icon="Phone"
            @click="answerCall"
            class="answer-btn"
          >
            接听
          </el-button>
          <el-button
            type="danger"
            size="large"
            :icon="TurnOff"
            @click="rejectCall"
            class="reject-btn"
          >
            挂断
          </el-button>
        </div>

        <div class="quick-actions">
          <el-button size="small" @click="viewCustomerDetail">查看详情</el-button>
          <el-button size="small" @click="quickFollowUp">快速跟进</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 通话中浮动窗口（支持拖动和最小化） -->
    <Teleport to="body">
      <div
        v-if="callInProgressVisible && currentCallData"
        class="call-floating-window"
        :class="{ 'is-minimized': isCallWindowMinimized }"
        :style="callWindowStyle"
        ref="callWindowRef"
      >
        <!-- 窗口标题栏（可拖动） -->
        <div
          class="call-window-header"
          @mousedown="startDrag"
        >
          <div class="header-left">
            <span class="status-dot" :class="{ 'is-connected': true }"></span>
            <span class="header-title">{{ isCallWindowMinimized ? '通话中' : '正在通话' }}</span>
          </div>
          <div class="header-actions">
            <el-tooltip :content="isCallWindowMinimized ? '展开' : '最小化'" placement="top">
              <el-button
                :icon="isCallWindowMinimized ? 'FullScreen' : 'Minus'"
                size="small"
                circle
                @click.stop="toggleMinimize"
              />
            </el-tooltip>
          </div>
        </div>

        <!-- 最小化状态显示 -->
        <div v-if="isCallWindowMinimized" class="call-minimized-content">
          <div class="mini-info">
            <span class="mini-name">{{ currentCallData.customerName || '未知客户' }}</span>
            <span class="mini-phone">{{ displaySensitiveInfoNew(currentCallData.phone, SensitiveInfoType.PHONE) }}</span>
          </div>
          <el-button
            type="danger"
            size="small"
            :icon="TurnOff"
            @click="handleEndCallClick"
            circle
          />
        </div>

        <!-- 展开状态显示 -->
        <div v-else class="call-window-content">
          <div class="call-timer">
            <div class="timer-display">📞</div>
            <div class="call-status">
              <el-icon class="is-loading"><Loading /></el-icon>
              正在通话中...
            </div>
          </div>

          <div class="caller-info-mini">
            <p class="caller-name">{{ currentCallData.customerName || '未知客户' }}</p>
            <p class="caller-phone">
              {{ displaySensitiveInfoNew(currentCallData.phone, SensitiveInfoType.PHONE) }}
              <el-tag v-if="getPhoneCarrier(currentCallData.phone)" size="small" type="info" style="margin-left: 8px;">
                {{ getPhoneCarrier(currentCallData.phone) }}
              </el-tag>
            </p>
            <div class="call-method-info">
              <el-tag v-if="currentCallData.callMethod === 'work_phone'" type="success" size="small">
                <el-icon><Cellphone /></el-icon>
                工作手机: {{ currentCallData.workPhoneName || '未知' }}
              </el-tag>
              <el-tag v-else-if="currentCallData.callMethod === 'network_phone'" type="primary" size="small">
                <el-icon><Phone /></el-icon>
                网络电话: {{ currentCallData.lineName || '未知线路' }}
              </el-tag>
            </div>
          </div>

          <div class="call-controls">
            <el-button
              type="danger"
              size="large"
              :icon="TurnOff"
              @click="handleEndCallClick"
              class="end-call-btn"
            >
              {{ currentCallData.callMethod === 'work_phone' ? '挂断提示' : '结束通话' }}
            </el-button>
          </div>

          <div class="call-notes">
            <div class="notes-header">
              <span>通话备注</span>
              <el-button
                type="primary"
                size="small"
                @click="saveCallNotes(false)"
                :loading="savingNotes"
              >
                保存备注
              </el-button>
            </div>
            <el-input
              v-model="callNotes"
              type="textarea"
              :rows="3"
              placeholder="通话备注（可在通话中随时记录）..."
              maxlength="500"
              show-word-limit
            />
          </div>

          <div class="call-quick-actions">
            <el-button size="small" @click="openQuickFollowUpFromCall">
              <el-icon><EditPen /></el-icon>
              快速跟进
            </el-button>
            <el-button size="small" @click="viewCustomerDetailFromCall">
              <el-icon><User /></el-icon>
              查看客户
            </el-button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 呼出配置弹窗 - 新组件 -->
    <CallConfigDialog v-model="showNewCallConfigDialog" />

    <!-- 呼出配置弹窗 - 旧版本(保留备用) -->
    <el-dialog
      v-model="callConfigDialogVisible"
      title="呼出配置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="activeConfigTab" type="border-card">
        <!-- 外呼方式配置 -->
        <el-tab-pane label="外呼方式" name="callMethod">
          <el-form :model="callConfigForm" label-width="120px" ref="callConfigFormRef">
            <el-form-item label="外呼方式">
              <el-radio-group v-model="callConfigForm.callMethod" @change="onCallMethodChange">
                <el-radio label="system">系统外呼路线</el-radio>
                <el-radio label="mobile">工作手机外呼</el-radio>
                <el-radio label="voip">网络电话</el-radio>
              </el-radio-group>
            </el-form-item>

            <!-- 系统外呼路线配置 -->
            <div v-if="callConfigForm.callMethod === 'system'">
              <el-form-item label="外呼线路">
                <el-select v-model="callConfigForm.lineId" placeholder="请选择外呼线路" style="width: 100%">
                  <el-option
                    v-for="line in callLines"
                    :key="line.id"
                    :label="line.name"
                    :value="line.id"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="线路状态">
                <el-tag :type="getLineStatusType(callConfigForm.lineId)">
                  {{ getLineStatusText(callConfigForm.lineId) }}
                </el-tag>
              </el-form-item>
            </div>

            <!-- 工作手机外呼配置 -->
            <div v-if="callConfigForm.callMethod === 'mobile'">
              <el-form-item label="工作手机号">
                <el-input
                  v-model="callConfigForm.workPhone"
                  placeholder="请输入工作手机号码"
                  maxlength="11"
                  style="width: 300px"
                />
              </el-form-item>

              <el-form-item label="拨号方式">
                <el-radio-group v-model="callConfigForm.dialMethod">
                  <el-radio label="direct">直接拨号</el-radio>
                  <el-radio label="callback">回拨模式</el-radio>
                </el-radio-group>
              </el-form-item>

              <!-- 系统级呼出配置 -->
              <template v-if="callConfigForm.dialMethod === 'direct'">
                <el-divider content-position="left">手机SDK配置</el-divider>

                <el-form-item label="手机平台">
                  <el-radio-group v-model="callConfigForm.mobileConfig.platform">
                    <el-radio label="android">
                      <el-icon><Cellphone /></el-icon>
                      Android
                    </el-radio>
                    <el-radio label="ios">
                      <el-icon><Iphone /></el-icon>
                      iOS
                    </el-radio>
                  </el-radio-group>
                </el-form-item>

                <el-form-item label="SDK状态">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <el-tag
                      :type="callConfigForm.mobileConfig.sdkInstalled ? 'success' : 'warning'"
                      size="default"
                    >
                      <el-icon>
                        <component :is="callConfigForm.mobileConfig.sdkInstalled ? 'CircleCheckFilled' : 'WarningFilled'" />
                      </el-icon>
                      {{ callConfigForm.mobileConfig.sdkInstalled ? 'SDK已安装' : 'SDK未安装' }}
                    </el-tag>
                    <el-button
                      type="primary"
                      :icon="Download"
                      @click="downloadMobileSDK"
                      size="default"
                    >
                      下载SDK应用
                    </el-button>
                  </div>

                  <!-- SDK版本信息 -->
                  <div style="margin-top: 8px; padding: 8px; background: #f5f7fa; border-radius: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                      <span style="font-weight: 500; color: #303133;">当前版本信息</span>
                      <el-tag size="small" type="info">v{{ callConfigForm.mobileConfig.sdkInfo?.version || '1.0.0' }}</el-tag>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; color: #606266;">
                      <div>
                        <span style="color: #909399;">文件大小：</span>
                        <span>{{ callConfigForm.mobileConfig.sdkInfo?.fileSize || (callConfigForm.mobileConfig.platform === 'android' ? '5.3 MB' : '待发布') }}</span>
                      </div>
                      <div>
                        <span style="color: #909399;">更新时间：</span>
                        <span>{{ callConfigForm.mobileConfig.sdkInfo?.updateTime || formatDate(new Date()) }}</span>
                      </div>
                      <div>
                        <span style="color: #909399;">支持系统：</span>
                        <span>{{ callConfigForm.mobileConfig.sdkInfo?.supportedSystems || (callConfigForm.mobileConfig.platform === 'android' ? 'Android 5.0+' : 'iOS 12.0+') }}</span>
                      </div>
                      <div>
                        <span style="color: #909399;">安装包类型：</span>
                        <span>{{ callConfigForm.mobileConfig.sdkInfo?.packageType || (callConfigForm.mobileConfig.platform === 'android' ? 'APK' : 'PWA') }}</span>
                      </div>
                    </div>
                  </div>

                  <div style="color: #909399; font-size: 12px; margin-top: 4px;">
                    {{ callConfigForm.mobileConfig.platform === 'android'
                       ? '请下载APK文件并在Android设备上安装'
                       : '请在iOS设备的Safari浏览器中访问PWA应用' }}
                  </div>
                </el-form-item>

                <el-form-item label="系统权限">
                  <div style="display: flex; gap: 16px; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <el-icon :style="{ color: callConfigForm.mobileConfig.deviceAuthorized ? '#67c23a' : '#909399' }">
                        <Key />
                      </el-icon>
                      <span style="font-size: 14px;">设备授权</span>
                      <el-tag :type="callConfigForm.mobileConfig.deviceAuthorized ? 'success' : 'info'" size="small">
                        {{ callConfigForm.mobileConfig.deviceAuthorized ? '已授权' : '待授权' }}
                      </el-tag>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <el-icon :style="{ color: callConfigForm.mobileConfig.callPermission ? '#67c23a' : '#909399' }">
                        <Phone />
                      </el-icon>
                      <span style="font-size: 14px;">通话权限</span>
                      <el-tag :type="callConfigForm.mobileConfig.callPermission ? 'success' : 'info'" size="small">
                        {{ callConfigForm.mobileConfig.callPermission ? '已获取' : '待获取' }}
                      </el-tag>
                    </div>
                  </div>
                  <div style="color: #909399; font-size: 12px; margin-top: 4px;">
                    <el-button type="text" size="small" @click="checkSDKStatus">
                      <el-icon><Refresh /></el-icon>
                      刷新权限状态
                    </el-button>
                  </div>
                </el-form-item>

                <el-form-item label="连接状态">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <el-tag :type="getMobileConnectionStatus().type" size="default">
                      <el-icon>
                        <component :is="getMobileConnectionStatus().icon" />
                      </el-icon>
                      {{ getMobileConnectionStatus().text }}
                    </el-tag>
                    <el-button
                      type="success"
                      :icon="Connection"
                      @click="testMobileConnection"
                      :loading="testingConnection"
                      size="default"
                    >
                      测试连接
                    </el-button>
                  </div>
                  <div style="color: #909399; font-size: 12px; margin-top: 4px;">
                    确保手机与系统在同一网络环境下
                  </div>
                </el-form-item>

                <el-form-item label="扫码连接">
                  <div style="display: flex; align-items: flex-start; gap: 16px;">
                    <!-- 二维码显示区域 -->
                    <div style="text-align: center;">
                      <div v-if="qrConnection.qrCodeUrl" style="padding: 12px; background: white; border: 1px solid #dcdfe6; border-radius: 8px; display: inline-block;">
                        <img :src="qrConnection.qrCodeUrl" alt="连接二维码" style="width: 120px; height: 120px;" />
                      </div>
                      <div v-else style="width: 120px; height: 120px; border: 2px dashed #dcdfe6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #909399;">
                        <el-icon size="24"><Connection /></el-icon>
                      </div>
                      <div style="margin-top: 8px; font-size: 12px; color: #606266;">
                        {{ qrConnection.status === 'pending' ? '等待扫码连接' :
                           qrConnection.status === 'connected' ? '连接成功' :
                           qrConnection.status === 'expired' ? '二维码已过期' : '点击生成二维码' }}
                      </div>
                      <div v-if="qrConnection.expiresAt" style="font-size: 11px; color: #909399; margin-top: 4px;">
                        {{ getQRExpiryText() }}
                      </div>
                    </div>

                    <!-- 操作按钮区域 -->
                    <div style="flex: 1;">
                      <div style="display: flex; flex-direction: column; gap: 8px;">
                        <el-button
                          type="primary"
                          :icon="Connection"
                          @click="generateQRCode"
                          :loading="qrConnection.generating"
                          size="default"
                        >
                          {{ qrConnection.qrCodeUrl ? '重新生成' : '生成二维码' }}
                        </el-button>

                        <el-button
                          v-if="qrConnection.qrCodeUrl"
                          type="info"
                          :icon="Refresh"
                          @click="checkConnectionStatus"
                          :loading="qrConnection.checking"
                          size="small"
                        >
                          检查连接状态
                        </el-button>

                        <el-button
                          v-if="qrConnection.status === 'connected'"
                          type="warning"
                          :icon="Close"
                          @click="disconnectQRConnection"
                          size="small"
                        >
                          断开连接
                        </el-button>
                      </div>

                      <!-- 连接说明 -->
                      <div style="margin-top: 12px; padding: 8px; background: #f0f9ff; border: 1px solid #b3d8ff; border-radius: 4px; font-size: 12px; color: #409eff;">
                        <div style="font-weight: 500; margin-bottom: 4px;">
                          <el-icon><InfoFilled /></el-icon>
                          扫码连接说明：
                        </div>
                        <div>1. 点击"生成二维码"按钮</div>
                        <div>2. 使用手机SDK应用扫描二维码</div>
                        <div>3. 确认连接权限并完成配置</div>
                        <div>4. 连接成功后可断开重连</div>
                      </div>
                    </div>
                  </div>
                </el-form-item>

                <!-- 替代连接方式 -->
                <el-form-item label="替代连接方式">
                  <div style="border: 1px solid #ebeef5; border-radius: 6px; padding: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                      <!-- 蓝牙连接 -->
                      <div style="text-align: center; padding: 12px; border: 1px solid #e4e7ed; border-radius: 6px;">
                        <el-icon size="24" style="color: #409eff; margin-bottom: 8px;">
                          <Connection />
                        </el-icon>
                        <div style="font-weight: 500; margin-bottom: 8px;">蓝牙连接</div>
                        <el-tag :type="alternativeConnections.bluetooth.status === 'connected' ? 'success' : 'info'" size="small" style="margin-bottom: 8px;">
                          {{ alternativeConnections.bluetooth.status === 'connected' ? '已连接' :
                             alternativeConnections.bluetooth.status === 'connecting' ? '连接中' : '未连接' }}
                        </el-tag>
                        <div>
                          <el-button
                            type="primary"
                            size="small"
                            :loading="alternativeConnections.bluetooth.status === 'connecting'"
                            @click="connectBluetooth"
                          >
                            {{ alternativeConnections.bluetooth.status === 'connected' ? '断开' : '连接' }}
                          </el-button>
                        </div>
                      </div>

                      <!-- 同网络连接 -->
                      <div style="text-align: center; padding: 12px; border: 1px solid #e4e7ed; border-radius: 6px;">
                        <el-icon size="24" style="color: #67c23a; margin-bottom: 8px;">
                          <Connection />
                        </el-icon>
                        <div style="font-weight: 500; margin-bottom: 8px;">同网络连接</div>
                        <el-tag :type="alternativeConnections.network.status === 'connected' ? 'success' : 'info'" size="small" style="margin-bottom: 8px;">
                          {{ alternativeConnections.network.status === 'connected' ? '已连接' :
                             alternativeConnections.network.status === 'discovering' ? '搜索中' : '未连接' }}
                        </el-tag>
                        <div>
                          <el-button
                            type="success"
                            size="small"
                            :loading="alternativeConnections.network.status === 'discovering'"
                            @click="discoverNetwork"
                          >
                            {{ alternativeConnections.network.status === 'connected' ? '断开' : '搜索' }}
                          </el-button>
                        </div>
                      </div>

                      <!-- 数字配对 -->
                      <div style="text-align: center; padding: 12px; border: 1px solid #e4e7ed; border-radius: 6px;">
                        <el-icon size="24" style="color: #e6a23c; margin-bottom: 8px;">
                          <Key />
                        </el-icon>
                        <div style="font-weight: 500; margin-bottom: 8px;">数字配对</div>
                        <el-tag :type="alternativeConnections.digital.status === 'connected' ? 'success' : 'info'" size="small" style="margin-bottom: 8px;">
                          {{ alternativeConnections.digital.status === 'connected' ? '已连接' :
                             alternativeConnections.digital.status === 'generating' ? '生成中' : '未连接' }}
                        </el-tag>
                        <div v-if="alternativeConnections.digital.code" style="font-size: 18px; font-weight: bold; color: #409eff; margin-bottom: 8px;">
                          {{ alternativeConnections.digital.code }}
                        </div>
                        <div>
                          <el-button
                            type="warning"
                            size="small"
                            :loading="alternativeConnections.digital.status === 'generating'"
                            @click="generateDigitalCode"
                          >
                            {{ alternativeConnections.digital.code ? '重新生成' : '生成配对码' }}
                          </el-button>
                        </div>
                      </div>
                    </div>

                    <!-- 连接说明 -->
                    <div style="margin-top: 12px; padding: 8px; background: #f0f9ff; border: 1px solid #b3d8ff; border-radius: 4px; font-size: 12px; color: #409eff;">
                      <div style="font-weight: 500; margin-bottom: 4px;">
                        <el-icon><InfoFilled /></el-icon>
                        替代连接方式说明：
                      </div>
                      <div>• 蓝牙连接：通过蓝牙与手机设备建立连接</div>
                      <div>• 同网络连接：在同一WiFi网络下自动发现设备</div>
                      <div>• 数字配对：生成6位数字配对码进行连接</div>
                    </div>
                  </div>
                </el-form-item>

                <!-- 已连接设备列表 -->
                <el-form-item label="已连接设备" v-if="connectedDevices.length > 0">
                  <div style="border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden;">
                    <div v-for="device in connectedDevices" :key="device.id"
                         style="padding: 12px; border-bottom: 1px solid #f5f7fa; display: flex; align-items: center; justify-content: space-between;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <el-icon :style="{ color: device.status === 'online' ? '#67c23a' : '#f56c6c' }">
                          <Cellphone />
                        </el-icon>
                        <div>
                          <div style="font-weight: 500; color: #303133;">{{ device.deviceName }}</div>
                          <div style="font-size: 12px; color: #909399;">
                            最后连接：{{ formatDate(new Date(device.lastConnected)) }}
                          </div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <el-tag :type="device.status === 'online' ? 'success' : 'danger'" size="small">
                          {{ device.status === 'online' ? '在线' : '离线' }}
                        </el-tag>
                        <!-- 离线时显示重新连接按钮 -->
                        <el-button
                          v-if="device.status !== 'online'"
                          type="primary"
                          size="small"
                          @click="handleReconnectDevice(device)"
                        >
                          重新连接
                        </el-button>
                        <el-button
                          type="text"
                          :icon="Close"
                          @click="removeConnectedDevice(device.id)"
                          size="small"
                          style="color: #f56c6c;"
                        >
                          移除
                        </el-button>
                      </div>
                    </div>
                  </div>
                  <!-- 离线设备提示 -->
                  <div v-if="hasOfflineDevices" style="margin-top: 8px;">
                    <el-alert
                      type="warning"
                      :closable="false"
                      show-icon
                    >
                      <template #title>
                        <span>有设备处于离线状态，请在手机APP上重新连接或点击"重新连接"按钮生成新的绑定二维码</span>
                      </template>
                    </el-alert>
                  </div>
                </el-form-item>
              </template>

              <!-- 回拨模式配置 -->
              <template v-if="callConfigForm.dialMethod === 'callback'">
                <el-divider content-position="left">回拨模式配置</el-divider>

                <el-form-item label="回拨服务商">
                  <el-select v-model="callConfigForm.callbackConfig.provider" style="width: 100%">
                    <el-option label="阿里云回拨" value="aliyun" />
                    <el-option label="腾讯云回拨" value="tencent" />
                    <el-option label="自建回拨服务" value="custom" />
                  </el-select>
                </el-form-item>

                <el-form-item label="回拨延迟">
                  <el-input-number
                    v-model="callConfigForm.callbackConfig.delay"
                    :min="1"
                    :max="30"
                    controls-position="right"
                    style="width: 200px"
                  />
                  <span style="margin-left: 10px;">秒</span>
                </el-form-item>

                <el-form-item label="最大重试">
                  <el-input-number
                    v-model="callConfigForm.callbackConfig.maxRetries"
                    :min="1"
                    :max="5"
                    controls-position="right"
                    style="width: 200px"
                  />
                  <span style="margin-left: 10px;">次</span>
                </el-form-item>
              </template>

              <el-alert
                title="工作手机外呼说明"
                type="info"
                :closable="false"
                show-icon
              >
                <template #default>
                  <p>• 直接拨号：系统调用手机端系统电话实现拨号外呼</p>
                  <p>• 回拨模式：系统先呼叫您的工作手机，接通后再呼叫客户</p>
                </template>
              </el-alert>
            </div>

            <!-- 网络电话配置 -->
            <div v-if="callConfigForm.callMethod === 'voip'">
              <el-form-item label="VoIP服务商">
                <el-select v-model="callConfigForm.voipProvider" placeholder="请选择VoIP服务商" style="width: 100%">
                  <el-option label="阿里云通信" value="aliyun" />
                  <el-option label="腾讯云通信" value="tencent" />
                  <el-option label="华为云通信" value="huawei" />
                  <el-option label="自定义SIP" value="custom" />
                </el-select>
              </el-form-item>

              <!-- 阿里云通信配置 -->
              <template v-if="callConfigForm.voipProvider === 'aliyun'">
                <el-divider content-position="left">阿里云通信配置</el-divider>

                <el-form-item label="AccessKey ID" required>
                  <el-input
                    v-model="callConfigForm.aliyunConfig.accessKeyId"
                    placeholder="请输入阿里云AccessKey ID"
                    show-password
                    style="width: 100%"
                  />
                  <div class="form-tip">从阿里云控制台获取AccessKey ID</div>
                </el-form-item>

                <el-form-item label="AccessKey Secret" required>
                  <el-input
                    v-model="callConfigForm.aliyunConfig.accessKeySecret"
                    placeholder="请输入阿里云AccessKey Secret"
                    show-password
                    type="password"
                    style="width: 100%"
                  />
                  <div class="form-tip">从阿里云控制台获取AccessKey Secret</div>
                </el-form-item>

                <el-form-item label="应用ID" required>
                  <el-input
                    v-model="callConfigForm.aliyunConfig.appId"
                    placeholder="请输入语音通话应用ID"
                    style="width: 100%"
                  />
                  <div class="form-tip">在阿里云语音服务控制台创建应用后获取</div>
                </el-form-item>

                <el-form-item label="主叫号码">
                  <el-input
                    v-model="callConfigForm.aliyunConfig.callerNumber"
                    placeholder="请输入主叫显示号码"
                    style="width: 100%"
                  />
                  <div class="form-tip">客户接听时显示的号码，需在阿里云申请</div>
                </el-form-item>

                <el-form-item label="服务区域">
                  <el-select v-model="callConfigForm.aliyunConfig.region" placeholder="请选择服务区域" style="width: 100%">
                    <el-option label="华东1（杭州）" value="cn-hangzhou" />
                    <el-option label="华东2（上海）" value="cn-shanghai" />
                    <el-option label="华北1（青岛）" value="cn-qingdao" />
                    <el-option label="华北2（北京）" value="cn-beijing" />
                    <el-option label="华南1（深圳）" value="cn-shenzhen" />
                  </el-select>
                </el-form-item>

                <el-form-item label="录音配置">
                  <el-switch v-model="callConfigForm.aliyunConfig.enableRecording" />
                  <span style="margin-left: 10px;">启用通话录音</span>
                </el-form-item>

                <el-form-item label="录音存储" v-if="callConfigForm.aliyunConfig.enableRecording">
                  <el-input
                    v-model="callConfigForm.aliyunConfig.recordingBucket"
                    placeholder="请输入OSS存储桶名称"
                    style="width: 100%"
                  />
                  <div class="form-tip">录音文件将存储到指定的OSS存储桶</div>
                </el-form-item>

                <el-alert
                  title="阿里云通信配置说明"
                  type="warning"
                  :closable="false"
                  show-icon
                >
                  <template #default>
                    <p>• 请确保已开通阿里云语音服务并完成实名认证</p>
                    <p>• AccessKey需要具有语音服务的调用权限</p>
                    <p>• 主叫号码需要在阿里云申请并通过审核</p>
                    <p>• 录音功能需要额外开通OSS存储服务</p>
                  </template>
                </el-alert>
              </template>

              <!-- 腾讯云通信配置 -->
              <template v-if="callConfigForm.voipProvider === 'tencent'">
                <el-divider content-position="left">腾讯云通信配置</el-divider>

                <el-form-item label="SecretId" required>
                  <el-input
                    v-model="callConfigForm.tencentConfig.secretId"
                    placeholder="请输入腾讯云SecretId"
                    show-password
                    style="width: 100%"
                  />
                </el-form-item>

                <el-form-item label="SecretKey" required>
                  <el-input
                    v-model="callConfigForm.tencentConfig.secretKey"
                    placeholder="请输入腾讯云SecretKey"
                    show-password
                    type="password"
                    style="width: 100%"
                  />
                </el-form-item>

                <el-form-item label="应用ID" required>
                  <el-input
                    v-model="callConfigForm.tencentConfig.appId"
                    placeholder="请输入语音通话应用ID"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>

              <!-- 华为云通信配置 -->
              <template v-if="callConfigForm.voipProvider === 'huawei'">
                <el-divider content-position="left">华为云通信配置</el-divider>

                <el-form-item label="Access Key" required>
                  <el-input
                    v-model="callConfigForm.huaweiConfig.accessKey"
                    placeholder="请输入华为云Access Key"
                    show-password
                    style="width: 100%"
                  />
                </el-form-item>

                <el-form-item label="Secret Key" required>
                  <el-input
                    v-model="callConfigForm.huaweiConfig.secretKey"
                    placeholder="请输入华为云Secret Key"
                    show-password
                    type="password"
                    style="width: 100%"
                  />
                </el-form-item>
              </template>

              <el-form-item label="音频设备">
                <el-select v-model="callConfigForm.audioDevice" placeholder="请选择音频设备" style="width: 100%">
                  <el-option label="默认设备" value="default" />
                  <el-option label="耳机" value="headset" />
                  <el-option label="扬声器" value="speaker" />
                </el-select>
              </el-form-item>

              <el-form-item label="音质设置">
                <el-radio-group v-model="callConfigForm.audioQuality">
                  <el-radio label="standard">标准音质</el-radio>
                  <el-radio label="high">高清音质</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-alert
                title="网络电话说明"
                type="info"
                :closable="false"
                show-icon
              >
                <template #default>
                  <p>• 请确保电脑已连接耳机或音响设备</p>
                  <p>• 建议使用有线网络以保证通话质量</p>
                  <p>• 高清音质需要更好的网络环境</p>
                </template>
              </el-alert>
            </div>
          </el-form>
        </el-tab-pane>

        <!-- 呼叫参数配置 -->
        <el-tab-pane label="呼叫参数" name="callParams">
          <el-form :model="callConfigForm" label-width="120px">
            <el-form-item label="呼叫模式">
              <el-radio-group v-model="callConfigForm.callMode">
                <el-radio label="auto">自动外呼</el-radio>
                <el-radio label="manual">手动外呼</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="呼叫间隔">
              <el-input-number
                v-model="callConfigForm.callInterval"
                :min="5"
                :max="300"
                :step="5"
                controls-position="right"
                style="width: 200px"
              />
              <span style="margin-left: 8px; color: #909399;">秒</span>
            </el-form-item>

            <el-form-item label="最大重试次数">
              <el-input-number
                v-model="callConfigForm.maxRetries"
                :min="0"
                :max="10"
                controls-position="right"
                style="width: 200px"
              />
            </el-form-item>

            <el-form-item label="呼叫超时">
              <el-input-number
                v-model="callConfigForm.callTimeout"
                :min="10"
                :max="120"
                :step="5"
                controls-position="right"
                style="width: 200px"
              />
              <span style="margin-left: 8px; color: #909399;">秒</span>
            </el-form-item>

            <el-form-item label="启用录音">
              <el-switch v-model="callConfigForm.enableRecording" />
            </el-form-item>

            <el-form-item label="自动跟进">
              <el-switch v-model="callConfigForm.autoFollowUp" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 高级设置 -->
        <el-tab-pane label="高级设置" name="advanced" v-if="userStore.isSuperAdmin">
          <el-form :model="callConfigForm" label-width="120px">
            <el-form-item label="并发呼叫数">
              <el-input-number
                v-model="callConfigForm.concurrentCalls"
                :min="1"
                :max="10"
                controls-position="right"
                style="width: 200px"
              />
            </el-form-item>

            <el-form-item label="呼叫优先级">
              <el-select v-model="callConfigForm.priority" style="width: 200px">
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
            </el-form-item>

            <el-form-item label="黑名单检查">
              <el-switch v-model="callConfigForm.blacklistCheck" />
            </el-form-item>

            <el-form-item label="号码归属地显示">
              <el-switch v-model="callConfigForm.showLocation" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="callConfigDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveCallConfig" :loading="callConfigSaving">
            保存配置
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import type { CallRecord, FollowUpRecord } from '@/api/call'
import * as callApi from '@/api/call'
import { downloadSDK, testSDKConnection, checkSDKInstallStatus, updateSDKInstallStatus } from '@/api/sdk'
import { generateQRCode as generateQRCodeAPI, getConnectionStatus, disconnectDevice, getConnectedDevices } from '@/api/qr-connection'
import {
  startBluetoothService,
  stopBluetoothService,
  getBluetoothStatus,
  startNetworkDiscovery,
  stopNetworkDiscovery,
  getNetworkStatus,
  startDigitalPairing,
  stopDigitalPairing,
  getDigitalPairingStatus,
  getAllConnectedDevices,
  disconnectDevice as disconnectAlternativeDevice
} from '@/api/alternative-connection'
import QRCode from 'qrcode'
import {
  Phone,
  Timer,
  SuccessFilled,
  User,
  Search,
  RefreshRight,
  Plus,
  Download,
  View,
  EditPen,
  ShoppingBag,
  Refresh,
  VideoPlay,
  Check,
  Close,
  TurnOff,
  Setting,
  Cellphone,
  Iphone,
  CircleCheckFilled,
  WarningFilled,
  Key,
  Connection,
  Loading,
  InfoFilled,
  Minus,
  FullScreen
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { formatDateTime } from '@/utils/dateFormat'
import { customerDetailApi } from '@/api/customerDetail'
import CallConfigDialog from '@/components/Call/CallConfigDialog.vue'
import * as callConfigApi from '@/api/callConfig'
import { getAddressLabel } from '@/utils/addressData'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { webSocketService } from '@/services/webSocketService'

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const callStore = useCallStore()
const userStore = useUserStore()
const customerStore = useCustomerStore()

// 响应式数据
const loading = ref(false)
const refreshLoading = ref(false)
const autoRefresh = ref(false)
const autoRefreshTimer = ref(null)
const searchKeyword = ref('')
const selectedRows = ref([])
const showOutboundDialog = ref(false)
const outboundLoading = ref(false)
const outboundFormRef = ref()

// 通话状态管理
const callStatus = ref('ready') // 'ready' | 'busy'

// 呼入通话相关
const incomingCallVisible = ref(false)
const callInProgressVisible = ref(false)
const incomingCallData = ref(null)
const currentCallData = ref(null)
const currentCallId = ref<string | null>(null) // 当前通话ID
const callDuration = ref(0)
const callNotes = ref('')
const callTimer = ref(null)
const callConnected = ref(false) // 通话是否已接通
const savingNotes = ref(false) // 保存备注状态

// 通话浮动窗口相关
const isCallWindowMinimized = ref(false)
const callWindowRef = ref<HTMLElement | null>(null)
const callWindowPosition = reactive({
  x: window.innerWidth - 470,
  y: 100
})
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

// 计算通话窗口样式
const callWindowStyle = computed(() => ({
  left: `${callWindowPosition.x}px`,
  top: `${callWindowPosition.y}px`
}))

// 切换最小化状态
const toggleMinimize = () => {
  isCallWindowMinimized.value = !isCallWindowMinimized.value
}

// 开始拖动
const startDrag = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.header-actions')) return

  isDragging.value = true
  const rect = callWindowRef.value?.getBoundingClientRect()
  if (rect) {
    dragOffset.x = e.clientX - rect.left
    dragOffset.y = e.clientY - rect.top
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 拖动中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  let newX = e.clientX - dragOffset.x
  let newY = e.clientY - dragOffset.y

  // 限制在窗口范围内
  const windowWidth = isCallWindowMinimized.value ? 280 : 420
  const windowHeight = isCallWindowMinimized.value ? 60 : 400

  newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight))

  callWindowPosition.x = newX
  callWindowPosition.y = newY
}

// 停止拖动
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 呼出配置相关
const callConfigDialogVisible = ref(false)
const showNewCallConfigDialog = ref(false) // 新版呼出配置弹窗
const callConfigSaving = ref(false)
const callConfigFormRef = ref()
const activeConfigTab = ref('callMethod')
const testingConnection = ref(false)

// 二维码连接相关数据
const qrConnection = reactive({
  connectionId: '',
  qrCodeUrl: '',
  status: '', // 'pending' | 'connected' | 'expired'
  expiresAt: null as Date | null,
  generating: false,
  checking: false
})

// 替代连接方式数据
const alternativeConnections = reactive({
  bluetooth: {
    status: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
    deviceName: '',
    deviceId: ''
  },
  network: {
    status: 'disconnected', // 'disconnected' | 'discovering' | 'connected'
    devices: [],
    selectedDevice: null
  },
  digital: {
    status: 'disconnected', // 'disconnected' | 'generating' | 'connected'
    code: '',
    expiresAt: null as Date | null
  }
})

const connectedDevices = ref([])

// 计算是否有离线设备
const hasOfflineDevices = computed(() => {
  return connectedDevices.value.some((d: any) => d.status !== 'online')
})

// 重新连接设备（生成新的绑定二维码）
const handleReconnectDevice = async (_device: any) => {
  try {
    // 生成新的绑定二维码
    await generateQRCode()
    ElMessage.info('请使用手机APP扫描二维码重新连接')
  } catch (_e) {
    ElMessage.error('生成二维码失败')
  }
}

const callConfigForm = reactive({
  // 外呼方式
  callMethod: 'system', // system: 系统外呼路线, mobile: 工作手机外呼, voip: 网络电话

  // 系统外呼路线配置
  lineId: '',

  // 工作手机外呼
  workPhone: '',
  dialMethod: 'direct', // direct: 直接拨号, callback: 回拨模式

  // 工作手机系统级配置
  mobileConfig: {
    platform: 'android', // android, ios
    sdkInstalled: false,
    deviceAuthorized: false,
    callPermission: false,
    connectionStatus: 'disconnected', // connected, disconnected, connecting
    sdkInfo: {
      version: '1.0.0',
      fileSize: '未知',
      updateTime: '未知',
      supportedSystems: 'Android 5.0+',
      packageType: 'APK'
    }
  },

  // 回拨模式配置
  callbackConfig: {
    provider: 'aliyun', // aliyun, tencent, custom
    delay: 3, // 回拨延迟秒数
    maxRetries: 3 // 最大重试次数
  },

  // 网络电话配置
  voipProvider: 'aliyun', // aliyun, tencent, huawei, custom
  audioDevice: 'default', // default, headset, speaker
  audioQuality: 'standard', // standard, high

  // 阿里云通信配置
  aliyunConfig: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    callerNumber: '',
    region: 'cn-hangzhou',
    enableRecording: false,
    recordingBucket: ''
  },

  // 腾讯云通信配置
  tencentConfig: {
    secretId: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'ap-beijing'
  },

  // 华为云通信配置
  huaweiConfig: {
    accessKey: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'cn-north-1'
  },

  // 呼叫参数
  callMode: 'manual',
  callInterval: 30,
  maxRetries: 3,
  callTimeout: 60,
  enableRecording: true,
  autoFollowUp: false,

  // 高级设置
  concurrentCalls: 1,
  priority: 'medium',
  blacklistCheck: true,
  showLocation: true
})

// 呼叫线路数据
const callLines = ref([
  { id: '1', name: '主线路 - 400-1234-5678' },
  { id: '2', name: '备用线路 - 400-8765-4321' },
  { id: '3', name: '专用线路 - 400-9999-8888' }
])

// 统计数据
const statistics = reactive({
  todayCalls: 0,
  totalDuration: 0,
  connectionRate: 0,
  activeUsers: 0
})

// 筛选表单
const filterForm = reactive({
  status: '',
  customerLevel: '',
  dateRange: [],
  salesPerson: ''
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 呼出列表数据
const outboundList = ref<any[]>([])

const outboundForm = ref({
  callMethod: '', // 外呼方式：work_phone(工作手机) | network_phone(网络电话)
  selectedLine: null as number | null, // 选择的线路ID
  selectedWorkPhone: null as number | string | null, // 选择的工作手机ID（可能是数字或字符串）
  selectedCustomer: null as any,
  customerPhone: '', // 从客户选择的号码
  manualPhone: '', // 手动输入的号码
  customerId: '',
  notes: ''
})

// 客户选择相关
const customerOptions = ref<any[]>([])
const phoneOptions = ref<any[]>([])

// 网络电话线路选择数据 - 从呼出配置API获取
const availableLines = ref<any[]>([])

// 工作手机配置数据 - 从呼出配置API获取
const workPhones = ref<any[]>([])

// 计算当前选择的工作手机是否离线
const selectedWorkPhoneOffline = computed(() => {
  if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) return false
  // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
  const phone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
  // 状态可能是 'online'/'offline' 或 '在线'/'离线'
  return phone && phone.status !== 'online' && phone.status !== '在线'
})

// 计算当前选择的工作手机是否在线
const selectedWorkPhoneOnline = computed(() => {
  if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) return false
  // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
  const phone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
  return phone && (phone.status === 'online' || phone.status === '在线')
})

// 刷新设备状态
const handleRefreshDeviceStatus = async () => {
  try {
    await loadAvailableCallMethods()
    ElMessage.success('设备状态已刷新')
  } catch (_e) {
    ElMessage.error('刷新失败')
  }
}

// 直接显示绑定二维码弹窗
const bindQRDialogVisible = ref(false)
const bindQRCodeUrl = ref('')
const bindConnectionId = ref('')
const bindStatus = ref<'pending' | 'connected' | 'expired'>('pending')
let bindCheckTimer: ReturnType<typeof setInterval> | null = null

const handleShowBindQRCode = async () => {
  bindQRDialogVisible.value = true
  bindQRCodeUrl.value = ''
  bindStatus.value = 'pending'
  await generateBindQRCode()
}

const generateBindQRCode = async () => {
  try {
    const res = await callConfigApi.generateWorkPhoneQRCode()
    console.log('[CallManagement] generateBindQRCode response:', res)
    if (res && (res as any).qrCodeUrl) {
      bindQRCodeUrl.value = (res as any).qrCodeUrl
      bindConnectionId.value = (res as any).connectionId
      startBindStatusCheck()
    } else if (res && (res as any).success && (res as any).data) {
      bindQRCodeUrl.value = (res as any).data.qrCodeUrl
      bindConnectionId.value = (res as any).data.connectionId
      startBindStatusCheck()
    } else {
      ElMessage.error('生成二维码失败')
    }
  } catch (_e) {
    console.error('[CallManagement] generateBindQRCode error:', _e)
    ElMessage.error('生成二维码失败')
  }
}

const refreshBindQRCode = () => {
  stopBindStatusCheck()
  generateBindQRCode()
}

const startBindStatusCheck = () => {
  stopBindStatusCheck()
  bindCheckTimer = setInterval(async () => {
    try {
      const res = await callConfigApi.checkWorkPhoneBindStatus(bindConnectionId.value)
      const status = (res as any).status || ((res as any).data?.status)
      if (status) {
        bindStatus.value = status
        if (status === 'connected') {
          stopBindStatusCheck()
          ElMessage.success('绑定成功')
          await loadAvailableCallMethods()
          setTimeout(() => {
            bindQRDialogVisible.value = false
          }, 1500)
        } else if (status === 'expired') {
          stopBindStatusCheck()
        }
      }
    } catch (_e) {
      console.error('检查绑定状态失败:', _e)
    }
  }, 2000)
}

const stopBindStatusCheck = () => {
  if (bindCheckTimer) {
    clearInterval(bindCheckTimer)
    bindCheckTimer = null
  }
}

// 用户偏好设置
const userCallPreference = ref({
  preferMobile: false,
  defaultLineId: null as number | null
})

const outboundRules = {
  // customerPhone 不再是必填，因为可以手动输入号码
  customerPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 详情弹窗
const showDetailDialog = ref(false)
const currentCustomer = ref(null)
const activeTab = ref('orders')

// 通话记录弹窗
const callRecordsDialogVisible = ref(false)
const callRecordsLoading = ref(false)
const callRecordsList = ref([])
const callRecordsFilter = reactive({
  dateRange: [],
  customerKeyword: ''
})
const callRecordsPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 录音播放器
const recordingPlayerVisible = ref(false)
const currentRecording = ref(null)
const audioPlayer = ref(null)

// 快捷跟进
const quickFollowUpVisible = ref(false)
const quickFollowUpSubmitting = ref(false)
const quickFollowUpFormRef = ref()
const quickFollowUpForm = reactive({
  type: 'call',
  content: '',
  nextFollowTime: '',
  intention: '',
  callTags: [] as string[],
  remark: ''
})

// 通话标签选项（与APP保持一致）
const callTagOptions = ['意向', '无意向', '再联系', '成交', '需报价', '已成交']

const quickFollowUpRules = {
  type: [
    { required: true, message: '请选择跟进类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' },
    { min: 2, message: '跟进内容至少2个字符', trigger: 'blur' }
  ]
}

// 禁止选择过去的日期（只能选择今天及以后的日期）
const disablePastDate = (time: Date) => {
  // 获取今天的开始时间（0点0分0秒）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

// 客户详情数据 - 从API加载
const customerOrders = ref<any[]>([])
const customerAftersales = ref<any[]>([])
const customerCalls = ref<any[]>([])
const customerFollowups = ref<any[]>([])
const detailLoading = ref(false)

// 详情弹窗分页数据
const detailPagination = reactive({
  orders: { page: 1, pageSize: 10, total: 0 },
  calls: { page: 1, pageSize: 10, total: 0 },
  followups: { page: 1, pageSize: 10, total: 0 },
  aftersales: { page: 1, pageSize: 10, total: 0 }
})

// 分页后的数据 - 计算属性
const paginatedOrders = computed(() => {
  const start = (detailPagination.orders.page - 1) * detailPagination.orders.pageSize
  const end = start + detailPagination.orders.pageSize
  return customerOrders.value.slice(start, end)
})

const paginatedCalls = computed(() => {
  const start = (detailPagination.calls.page - 1) * detailPagination.calls.pageSize
  const end = start + detailPagination.calls.pageSize
  return customerCalls.value.slice(start, end)
})

const paginatedFollowups = computed(() => {
  const start = (detailPagination.followups.page - 1) * detailPagination.followups.pageSize
  const end = start + detailPagination.followups.pageSize
  return customerFollowups.value.slice(start, end)
})

const paginatedAftersales = computed(() => {
  const start = (detailPagination.aftersales.page - 1) * detailPagination.aftersales.pageSize
  const end = start + detailPagination.aftersales.pageSize
  return customerAftersales.value.slice(start, end)
})

// 加载客户详情数据
const loadCustomerDetailData = async (customerId: string) => {
  if (!customerId) return

  detailLoading.value = true
  try {
    // 并行加载所有数据
    const [ordersRes, callsRes, followupsRes] = await Promise.all([
      customerDetailApi.getCustomerOrders(customerId),
      customerDetailApi.getCustomerCalls(customerId),
      customerDetailApi.getCustomerFollowUps(customerId)
    ])

    // 🔥 修复：正确处理API返回值格式
    // 处理订单数据
    let ordersData: any[] = []
    if (ordersRes?.success && Array.isArray(ordersRes.data)) {
      ordersData = ordersRes.data
    } else if (Array.isArray(ordersRes?.data)) {
      ordersData = ordersRes.data
    } else if (Array.isArray(ordersRes)) {
      ordersData = ordersRes
    }

    customerOrders.value = ordersData.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNumber || order.orderNo || order.id,
      productName: order.productNames || order.products?.[0]?.name || order.productName || '未知商品',
      amount: order.totalAmount || order.finalAmount || order.amount || 0,
      status: order.status || 'pending',
      createTime: formatDateTime(order.createdAt || order.createTime || order.orderDate)
    }))

    // 处理通话记录数据
    let callsData: any[] = []
    if (callsRes?.success && Array.isArray(callsRes.data)) {
      callsData = callsRes.data
    } else if (Array.isArray(callsRes?.data)) {
      callsData = callsRes.data
    } else if (Array.isArray(callsRes)) {
      callsData = callsRes
    }

    customerCalls.value = callsData.map((call: any) => ({
      id: call.id,
      callType: call.callType || call.type || 'outbound',
      duration: formatCallDuration(call.duration),
      status: call.callStatus || call.status || 'connected',
      startTime: formatDateTime(call.startTime || call.createdAt),
      operator: call.userName || call.operatorName || call.operator || '未知',
      callTags: call.callTags || [],
      remark: call.notes || call.remark || '',
      recordingUrl: call.recordingUrl || null,
      // 保留原始数据用于详情查看
      _raw: call
    }))

    // 处理跟进记录数据
    let followupsData: any[] = []
    if (followupsRes?.success && Array.isArray(followupsRes.data)) {
      followupsData = followupsRes.data
    } else if (Array.isArray(followupsRes?.data)) {
      followupsData = followupsRes.data
    } else if (Array.isArray(followupsRes)) {
      followupsData = followupsRes
    }

    customerFollowups.value = followupsData.map((followup: any) => ({
      id: followup.id,
      type: followup.type || followup.followUpType || 'call',
      content: followup.content || followup.description || '',
      customerIntent: followup.customerIntent || followup.customer_intent || null,
      callTags: followup.callTags || followup.call_tags || [],
      nextPlan: formatDateTime(followup.nextFollowUp || followup.nextTime || followup.nextPlanTime || followup.next_follow_up_date),
      operator: followup.createdByName || followup.author || followup.operatorName || followup.user_name || '未知',
      createTime: formatDateTime(followup.createdAt || followup.createTime || followup.created_at),
      // 保留原始数据用于详情查看
      _raw: followup
    }))

    // 售后记录暂时为空（如果有售后API可以添加）
    customerAftersales.value = []

    // 更新分页总数
    detailPagination.orders.total = customerOrders.value.length
    detailPagination.orders.page = 1
    detailPagination.calls.total = customerCalls.value.length
    detailPagination.calls.page = 1
    detailPagination.followups.total = customerFollowups.value.length
    detailPagination.followups.page = 1
    detailPagination.aftersales.total = customerAftersales.value.length
    detailPagination.aftersales.page = 1

  } catch (error) {
    console.error('加载客户详情数据失败:', error)
    ElMessage.error('加载客户详情数据失败')
    // 清空数据
    customerOrders.value = []
    customerAftersales.value = []
    customerCalls.value = []
    customerFollowups.value = []
  } finally {
    detailLoading.value = false
  }
}

// 格式化通话时长
const formatCallDuration = (seconds: number | string) => {
  if (typeof seconds === 'string') return seconds
  if (!seconds || seconds === 0) return '0秒'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}秒`
  return `${mins}分${secs}秒`
}

// 计算属性
const recentCallRecords = computed(() => {
  return callStore.callRecords.slice(0, 10)
})

// 方法
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

// formatDateTime 已从 @/utils/dateFormat 导入

// 获取客户收货地址
const getCustomerShippingAddress = (customer: any) => {
  if (!customer) return '暂无地址'

  // 如果客户有完整的地址信息，使用地址转换函数获取中文名称
  if (customer.province || customer.city || customer.district || customer.street) {
    // 使用地址数据工具将代码转换为中文名称
    const addressLabel = getAddressLabel(
      customer.province,
      customer.city,
      customer.district,
      customer.street
    )

    // 拼接详细地址
    if (addressLabel) {
      return customer.detailAddress ? addressLabel + customer.detailAddress : addressLabel
    }
  }

  // 如果没有详细地址信息，使用原有的address字段
  if (customer.address) {
    return customer.address
  }

  // 如果都没有，使用公司地址作为备选
  if (customer.company) {
    return customer.company
  }

  return '暂无地址'
}

// 通话状态切换
const toggleCallStatus = async () => {
  const newStatus = callStatus.value === 'ready' ? 'busy' : 'ready'
  const statusText = newStatus === 'ready' ? '就绪' : '忙碌'

  try {
    // 保存状态到本地存储
    localStorage.setItem('call_agent_status', newStatus)
    localStorage.setItem('call_agent_status_time', new Date().toISOString())

    // 更新状态
    callStatus.value = newStatus

    // 如果切换到忙碌状态，记录原因（可选）
    if (newStatus === 'busy') {
      // 可以弹出选择忙碌原因的对话框
      ElMessage.warning(`状态已切换为：${statusText}，来电将不会分配给您`)
    } else {
      ElMessage.success(`状态已切换为：${statusText}，您可以接收来电了`)
    }

    // TODO: 同步到后端（如果有坐席状态 API）
    // await callApi.updateAgentStatus({ status: newStatus })

  } catch (error) {
    console.error('切换状态失败:', error)
    ElMessage.error('切换状态失败')
  }
}

// 初始化坐席状态（从本地存储恢复）
const initAgentStatus = () => {
  const savedStatus = localStorage.getItem('call_agent_status')
  if (savedStatus === 'ready' || savedStatus === 'busy') {
    callStatus.value = savedStatus
  }
}

// 工作手机相关方法

// 二维码连接相关方法
const generateQRCode = async () => {
  try {
    qrConnection.generating = true

    // 准备请求参数
    const requestData = {
      userId: userStore.userInfo?.id || 'default-user',
      permissions: ['call', 'sms', 'contacts'] // 默认权限
    }

    const response = await generateQRCodeAPI(requestData)

    if (response.success) {
      qrConnection.connectionId = response.data.connectionId

      // 如果API返回的是qrData而不是qrCodeUrl，需要生成二维码图片
      if (response.data.qrCodeUrl) {
        qrConnection.qrCodeUrl = response.data.qrCodeUrl
      } else if (response.data.qrData) {
        // 使用qrcode库生成二维码图片URL
        qrConnection.qrCodeUrl = await generateQRCodeImage(response.data.qrData)
      }

      qrConnection.status = 'pending'
      qrConnection.expiresAt = new Date(response.data.expiresAt)

      ElMessage.success('二维码生成成功，请使用手机扫码连接')

      // 开始检查连接状态
      checkConnectionStatus()
    } else {
      ElMessage.error(response.message || '生成二维码失败')
    }
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  } finally {
    qrConnection.generating = false
  }
}

// 生成二维码图片的辅助方法
const generateQRCodeImage = async (qrData: string): Promise<string> => {
  try {
    // 动态导入qrcode库
    const QRCode = await import('qrcode')

    // 生成二维码数据URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })

    return qrCodeDataUrl
  } catch (error) {
    console.error('生成二维码图片失败:', error)
    // 如果qrcode库不可用，返回一个占位符或使用在线服务
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
  }
}

const checkConnectionStatus = async () => {
  if (!qrConnection.connectionId || qrConnection.checking) return

  try {
    qrConnection.checking = true
    const response = await getConnectionStatus(qrConnection.connectionId)

    if (response.success) {
      qrConnection.status = response.data.status

      if (response.data.status === 'connected') {
        ElMessage.success('设备连接成功！')
        // 更新移动配置状态
        callConfigForm.mobileConfig.connectionStatus = 'connected'
        callConfigForm.mobileConfig.deviceAuthorized = true

        // 刷新已连接设备列表
        await loadConnectedDevices()
      } else if (response.data.status === 'expired') {
        ElMessage.warning('二维码已过期，请重新生成')
      } else if (response.data.status === 'pending') {
        // 继续检查状态
        setTimeout(checkConnectionStatus, 2000)
      }
    }
  } catch (error) {
    console.error('检查连接状态失败:', error)
  } finally {
    qrConnection.checking = false
  }
}

const refreshQRCode = async () => {
  await generateQRCode()
}

// 断开二维码连接（别名，用于模板）
const disconnectQRConnection = async () => {
  await disconnectQRDevice()
}

const disconnectQRDevice = async () => {
  if (!qrConnection.connectionId) return

  try {
    const response = await disconnectDevice(qrConnection.connectionId)

    if (response.success) {
      qrConnection.connectionId = ''
      qrConnection.qrCodeUrl = ''
      qrConnection.status = ''
      qrConnection.expiresAt = null

      // 更新移动配置状态
      callConfigForm.mobileConfig.connectionStatus = 'disconnected'
      callConfigForm.mobileConfig.deviceAuthorized = false

      ElMessage.success('设备已断开连接')

      // 刷新已连接设备列表
      await loadConnectedDevices()
    } else {
      ElMessage.error(response.message || '断开连接失败')
    }
  } catch (error) {
    console.error('断开连接失败:', error)
    ElMessage.error('断开连接失败')
  }
}

// 获取二维码过期时间文本
const getQRExpiryText = () => {
  if (!qrConnection.expiresAt) return ''
  const now = new Date()
  const expiresAt = new Date(qrConnection.expiresAt)
  const diffMs = expiresAt.getTime() - now.getTime()

  if (diffMs <= 0) return '已过期'

  const diffMins = Math.floor(diffMs / 60000)
  const diffSecs = Math.floor((diffMs % 60000) / 1000)

  if (diffMins > 0) {
    return `${diffMins}分${diffSecs}秒后过期`
  }
  return `${diffSecs}秒后过期`
}

// 移除已连接设备
const removeConnectedDevice = async (deviceId: string) => {
  try {
    const response = await disconnectDevice(deviceId)
    if (response.success) {
      ElMessage.success('设备已移除')
      await loadConnectedDevices()
    } else {
      ElMessage.error(response.message || '移除设备失败')
    }
  } catch (error) {
    console.error('移除设备失败:', error)
    ElMessage.error('移除设备失败')
  }
}

const loadConnectedDevices = async () => {
  try {
    const response = await getConnectedDevices()

    if (response.success) {
      connectedDevices.value = response.data
    }
  } catch (error) {
    console.error('加载已连接设备失败:', error)
  }
}

const formatDeviceInfo = (device: any) => {
  const parts = []
  if (device.deviceName) parts.push(device.deviceName)
  if (device.platform) parts.push(device.platform)
  if (device.version) parts.push(`v${device.version}`)
  return parts.join(' - ')
}

const formatConnectionTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

// 获取手机连接状态
const getMobileConnectionStatus = () => {
  const status = callConfigForm.mobileConfig.connectionStatus
  switch (status) {
    case 'connected':
      return { type: 'success', text: '已连接', icon: CircleCheckFilled }
    case 'connecting':
      return { type: 'warning', text: '连接中', icon: Loading }
    case 'disconnected':
    default:
      return { type: 'danger', text: '未连接', icon: Connection }
  }
}

// 下载手机SDK
const downloadMobileSDK = async () => {
  const platform = callConfigForm.mobileConfig.platform as 'android' | 'ios'

  try {
    ElMessage.info('正在准备下载SDK...')

    const result = await downloadSDK(platform)

    if (result.success) {
      ElMessage.success(result.message || 'SDK下载已开始')
    } else {
      ElMessage.error(result.error || 'SDK下载失败')
    }
  } catch (error: any) {
    console.error('SDK下载异常:', error)
    ElMessage.error('SDK下载异常：' + (error.message || '未知错误'))
  }
}

// 测试手机连接
const testMobileConnection = async () => {
  const platform = callConfigForm.mobileConfig.platform as 'android' | 'ios'

  testingConnection.value = true
  callConfigForm.mobileConfig.connectionStatus = 'connecting'

  try {
    const result = await testSDKConnection(platform)

    if (result.success && result.connected) {
      callConfigForm.mobileConfig.connectionStatus = 'connected'
      callConfigForm.mobileConfig.deviceAuthorized = true
      callConfigForm.mobileConfig.callPermission = true
      ElMessage.success(result.message)

      // 如果连接成功，更新SDK安装状态
      updateSDKInstallStatus(platform, true, '1.0.0')
      callConfigForm.mobileConfig.sdkInstalled = true
    } else {
      callConfigForm.mobileConfig.connectionStatus = 'disconnected'
      ElMessage.error(result.message)
    }
  } catch (error: any) {
    callConfigForm.mobileConfig.connectionStatus = 'disconnected'
    ElMessage.error('连接测试异常：' + (error.message || '未知错误'))
  } finally {
    testingConnection.value = false
  }
}

// 检查SDK安装状态
const checkSDKStatus = async () => {
  try {
    const platform = callConfigForm.mobileConfig.platform as 'android' | 'ios'
    const status = await checkSDKInstallStatus(platform)

    if (status.installed) {
      callConfigForm.mobileConfig.sdkInstalled = true
      callConfigForm.mobileConfig.connectionStatus = 'connected'
      callConfigForm.mobileConfig.deviceAuthorized = true
      callConfigForm.mobileConfig.callPermission = true
    } else {
      callConfigForm.mobileConfig.sdkInstalled = false
      callConfigForm.mobileConfig.connectionStatus = 'disconnected'
      callConfigForm.mobileConfig.deviceAuthorized = false
      callConfigForm.mobileConfig.callPermission = false
    }
  } catch (error: any) {
    console.error('检查SDK状态失败:', error)
    // 如果检查失败，保持默认状态
    callConfigForm.mobileConfig.sdkInstalled = false
    callConfigForm.mobileConfig.connectionStatus = 'disconnected'
  }
}

// 蓝牙连接
const connectBluetooth = async () => {
  if (alternativeConnections.bluetooth.status === 'connected') {
    // 断开蓝牙连接
    try {
      const result = await stopBluetoothService()
      if (result.success) {
        alternativeConnections.bluetooth.status = 'disconnected'
        alternativeConnections.bluetooth.deviceName = ''
        alternativeConnections.bluetooth.deviceId = ''
        ElMessage.success('蓝牙连接已断开')
      } else {
        ElMessage.error(result.message || '断开蓝牙连接失败')
      }
    } catch (error: any) {
      console.error('断开蓝牙连接错误:', error)
      ElMessage.error('断开蓝牙连接异常')
    }
    return
  }

  alternativeConnections.bluetooth.status = 'connecting'

  try {
    // 启动蓝牙服务
    const result = await startBluetoothService({ deviceName: 'CRM-Server' })

    if (result.success) {
      alternativeConnections.bluetooth.status = 'connected'
      alternativeConnections.bluetooth.deviceName = result.data.deviceName
      alternativeConnections.bluetooth.deviceId = result.data.pairingCode
      ElMessage.success(`蓝牙服务已启动，配对码：${result.data.pairingCode}`)
    } else {
      alternativeConnections.bluetooth.status = 'disconnected'
      ElMessage.error(result.message || '蓝牙连接失败')
    }
  } catch (error: any) {
    alternativeConnections.bluetooth.status = 'disconnected'
    ElMessage.error('蓝牙连接异常：' + (error.message || '未知错误'))
    console.error('蓝牙连接错误:', error)
  }
}

// 同网络发现
const discoverNetwork = async () => {
  if (alternativeConnections.network.status === 'connected') {
    // 断开网络连接
    try {
      const result = await stopNetworkDiscovery()
      if (result.success) {
        alternativeConnections.network.status = 'disconnected'
        alternativeConnections.network.devices = []
        alternativeConnections.network.selectedDevice = null
        ElMessage.success('网络连接已断开')
      } else {
        ElMessage.error(result.message || '断开网络连接失败')
      }
    } catch (error: any) {
      console.error('断开网络连接错误:', error)
      ElMessage.error('断开网络连接异常')
    }
    return
  }

  alternativeConnections.network.status = 'discovering'

  try {
    // 启动网络发现服务
    const result = await startNetworkDiscovery({ port: 8080, broadcastInterval: 10 })

    if (result.success) {
      alternativeConnections.network.status = 'connected'

      // 获取连接设备
      const devicesResult = await getAllConnectedDevices()
      if (devicesResult.success) {
        const networkDevices = devicesResult.data.filter(device => device.connectionType === 'network')
        alternativeConnections.network.devices = networkDevices
        if (networkDevices.length > 0) {
          alternativeConnections.network.selectedDevice = networkDevices[0]
          ElMessage.success(`网络发现已启动，发现 ${networkDevices.length} 个设备`)
        } else {
          ElMessage.success('网络发现已启动，等待设备连接')
        }
      } else {
        ElMessage.success(`网络发现已启动，端口：${result.data.port}`)
      }
    } else {
      alternativeConnections.network.status = 'disconnected'
      ElMessage.error(result.message || '网络发现失败')
    }
  } catch (error: any) {
    alternativeConnections.network.status = 'disconnected'
    ElMessage.error('网络发现异常：' + (error.message || '未知错误'))
    console.error('网络发现错误:', error)
  }
}

// 生成数字配对码
const generateDigitalCode = async () => {
  if (alternativeConnections.digital.status === 'connected') {
    // 停止数字配对服务
    try {
      const result = await stopDigitalPairing()
      if (result.success) {
        alternativeConnections.digital.status = 'disconnected'
        alternativeConnections.digital.code = ''
        alternativeConnections.digital.expiresAt = null
        ElMessage.success('数字配对已停止')
      } else {
        ElMessage.error(result.message || '停止数字配对失败')
      }
    } catch (error: any) {
      console.error('停止数字配对错误:', error)
      ElMessage.error('停止数字配对异常')
    }
    return
  }

  alternativeConnections.digital.status = 'generating'

  try {
    // 启动数字配对服务
    const result = await startDigitalPairing({ expireTime: 10 })

    if (result.success) {
      alternativeConnections.digital.code = result.data.currentCode
      alternativeConnections.digital.status = 'connected'

      // 计算过期时间
      const expiresAt = new Date(Date.now() + result.data.expireTime * 60 * 1000)
      alternativeConnections.digital.expiresAt = expiresAt

      ElMessage.success(`数字配对码：${result.data.currentCode}，有效期${result.data.expireTime}分钟`)

      // 设置过期定时器
      setTimeout(() => {
        if (alternativeConnections.digital.code === result.data.currentCode) {
          alternativeConnections.digital.code = ''
          alternativeConnections.digital.status = 'disconnected'
          alternativeConnections.digital.expiresAt = null
          ElMessage.warning('数字配对码已过期，请重新生成')
        }
      }, result.data.expireTime * 60 * 1000)
    } else {
      alternativeConnections.digital.status = 'disconnected'
      ElMessage.error(result.message || '生成数字配对码失败')
    }
  } catch (error: any) {
    alternativeConnections.digital.status = 'disconnected'
    ElMessage.error('生成配对码异常：' + (error.message || '未知错误'))
    console.error('数字配对错误:', error)
  }
}

// 格式化日期
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取SDK详细信息
const loadSDKInfo = async () => {
  try {
    const platform = callConfigForm.mobileConfig.platform as 'android' | 'ios'
    const response = await getSDKInfo(platform)

    if (response.success && response.data) {
      const sdkInfo = response.data
      // 更新SDK信息到表单中（这些信息将在模板中显示）
      callConfigForm.mobileConfig.sdkInfo = {
        version: sdkInfo.version || '1.0.0',
        fileSize: sdkInfo.fileSizeFormatted || '未知',
        updateTime: sdkInfo.lastModified ? formatDate(new Date(sdkInfo.lastModified)) : '未知',
        supportedSystems: sdkInfo.supportedSystems || (platform === 'android' ? 'Android 5.0+' : 'iOS 12.0+'),
        packageType: sdkInfo.packageType || (platform === 'android' ? 'APK' : 'IPA')
      }
    }
  } catch (error: any) {
    console.error('获取SDK信息失败:', error)
    // 设置默认值
    const platform = callConfigForm.mobileConfig.platform as 'android' | 'ios'
    callConfigForm.mobileConfig.sdkInfo = {
      version: '1.0.0',
      fileSize: '未知',
      updateTime: '未知',
      supportedSystems: platform === 'android' ? 'Android 5.0+' : 'iOS 12.0+',
      packageType: platform === 'android' ? 'APK' : 'IPA'
    }
  }
}

const refreshData = async () => {
  try {
    refreshLoading.value = true

    // 并行刷新多个数据源
    await Promise.all([
      loadOutboundList(),
      callStore.fetchCallRecords(),
      loadStatistics(),
      refreshCallRecords()
    ])

    ElMessage.success('数据已刷新')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败，请稍后重试')
  } finally {
    refreshLoading.value = false
  }
}



// 刷新通话记录
const refreshCallRecords = async () => {
  if (callRecordsDialogVisible.value) {
    await loadCallRecords()
  }
}

// 呼出配置相关方法
const openCallConfigDialog = () => {
  // 使用新版呼出配置弹窗
  showNewCallConfigDialog.value = true
}

// 旧版打开方法（保留备用）
const openOldCallConfigDialog = () => {
  // 加载当前配置
  loadCallConfig()
  callConfigDialogVisible.value = true
}

const loadCallConfig = () => {
  // 从本地存储或API加载配置
  const savedConfig = localStorage.getItem('callConfig')
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig)
      Object.assign(callConfigForm, config)
    } catch (error) {
      console.error('加载呼出配置失败:', error)
    }
  }
}

const saveCallConfig = async () => {
  try {
    callConfigSaving.value = true

    // 保存到本地存储
    localStorage.setItem('callConfig', JSON.stringify(callConfigForm))

    // 这里可以添加API调用来保存到服务器
    // await callApi.saveCallConfig(callConfigForm)

    ElMessage.success('呼出配置已保存')
    callConfigDialogVisible.value = false
  } catch (error) {
    console.error('保存呼出配置失败:', error)
    ElMessage.error('保存配置失败，请稍后重试')
  } finally {
    callConfigSaving.value = false
  }
}

// 外呼方式变更处理
const onCallMethodChange = (value: string) => {
  // 根据选择的外呼方式，重置相关配置
  if (value === 'system') {
    // 系统外呼路线，确保选择了线路
    if (!callConfigForm.lineId && callLines.value.length > 0) {
      callConfigForm.lineId = callLines.value[0].id
    }
  } else if (value === 'mobile') {
    // 工作手机外呼，清空线路选择
    callConfigForm.lineId = ''
  } else if (value === 'voip') {
    // 网络电话，清空线路选择
    callConfigForm.lineId = ''
  }
}

// 获取线路状态类型
const getLineStatusType = (lineId: string) => {
  if (!lineId) return 'info'
  // 这里可以根据实际线路状态返回不同类型
  return 'success'
}

// 获取线路状态文本
const getLineStatusText = (lineId: string) => {
  if (!lineId) return '未选择'
  // 这里可以根据实际线路状态返回不同文本
  return '正常'
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value

  if (autoRefresh.value) {
    startAutoRefresh()
    ElMessage.success('已开启自动刷新，每30秒更新一次数据')
  } else {
    stopAutoRefresh()
    ElMessage.info('已关闭自动刷新')
  }
}

// 开始自动刷新
const startAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }

  autoRefreshTimer.value = setInterval(async () => {
    if (!refreshLoading.value) {
      await refreshData()
    }
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

const loadOutboundList = async () => {
  try {
    loading.value = true

    // 🔥 修复：直接调用API，传递分页参数，实现后端分页
    const { customerApi } = await import('@/api/customer')
    console.log(`[通话管理] 🚀 加载客户, 页码: ${pagination.currentPage}, 每页: ${pagination.pageSize}`)

    const response = await customerApi.getList({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value || undefined
    })

    if (!response || !response.data) {
      console.log('[通话管理] API无数据')
      outboundList.value = []
      pagination.total = 0
      return
    }

    const { list: customers, total } = response.data
    console.log(`[通话管理] API返回客户数量: ${customers?.length || 0}, 总数: ${total}`)

    // 🔥 更新分页总数（使用后端返回的total）
    pagination.total = total || 0

    // 转换为呼出列表格式，并异步加载每个客户的跟进和通话数据
    const convertedList = await Promise.all((customers || []).map(async (customer: any) => {
      // 尝试获取客户的最新跟进记录和通话记录
      let lastFollowUp = ''
      let callTags: string[] = []
      let lastCallTime = customer.lastServiceDate || '暂无记录'
      let callCount = 0

      try {
        // 获取跟进记录
        const followupsRes = await customerDetailApi.getCustomerFollowUps(customer.id)
        if (followupsRes.success && followupsRes.data && followupsRes.data.length > 0) {
          const latestFollowup = followupsRes.data[0]
          lastFollowUp = latestFollowup.content ? (latestFollowup.content.length > 20 ? latestFollowup.content.substring(0, 20) + '...' : latestFollowup.content) : ''
        }

        // 获取通话记录
        const callsRes = await customerDetailApi.getCustomerCalls(customer.id)
        if (callsRes.success && callsRes.data) {
          callCount = callsRes.data.length
          if (callsRes.data.length > 0) {
            const latestCall = callsRes.data[0]
            lastCallTime = formatDateTime(latestCall.startTime || latestCall.createdAt)
            // 从最新通话记录获取通话标签
            if (latestCall.callTags && latestCall.callTags.length > 0) {
              callTags = latestCall.callTags
            } else {
              // 查找之前有标签的通话
              for (const call of callsRes.data) {
                if (call.callTags && call.callTags.length > 0) {
                  callTags = call.callTags
                  break
                }
              }
            }
          }
        }
      } catch (e) {
        // 忽略单个客户数据加载失败
      }

      return {
        id: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        customerPhone: customer.phone,
        company: customer.company || '未填写',
        customerLevel: customer.level,
        lastCallTime,
        callCount,
        lastFollowUp,
        callTags,
        status: callCount > 0 ? 'connected' : 'pending',
        salesPerson: customer.salesPersonName || userStore.currentUser?.name || '当前用户',
        remark: customer.remarks || '',
        address: customer.address || '',
        province: customer.province || '',
        city: customer.city || '',
        district: customer.district || '',
        street: customer.street || '',
        detailAddress: customer.detailAddress || ''
      }
    }))

    // 更新呼出列表数据
    outboundList.value = convertedList
    console.log(`[通话管理] ✅ 加载完成: ${convertedList.length} 条, 总数: ${pagination.total}`)

  } catch (error) {
    console.error('加载呼出列表失败:', error)
    ElMessage.error('加载呼出列表失败')
    outboundList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  // 🔥 修复：搜索时重置到第一页，然后调用API重新加载数据
  pagination.currentPage = 1
  await loadOutboundList()
}

const resetFilter = () => {
  searchKeyword.value = ''
  Object.assign(filterForm, {
    status: '',
    customerLevel: '',
    dateRange: [],
    salesPerson: ''
  })
  loadOutboundList()
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

// 显示通话记录弹窗
const showCallRecordsDialog = () => {
  callRecordsDialogVisible.value = true
  loadCallRecords()
}

// 关闭通话记录弹窗
const handleCloseCallRecordsDialog = () => {
  callRecordsDialogVisible.value = false
  resetCallRecordsFilter()
}

// 加载通话记录
const loadCallRecords = async () => {
  callRecordsLoading.value = true
  try {
    console.log('[CallManagement] loadCallRecords params:', {
      page: callRecordsPagination.currentPage,
      pageSize: callRecordsPagination.pageSize
    })

    // 使用callStore的API获取通话记录
    await callStore.fetchCallRecords({
      page: callRecordsPagination.currentPage,
      pageSize: callRecordsPagination.pageSize,
      keyword: callRecordsFilter.customerKeyword || undefined,
      startDate: callRecordsFilter.dateRange?.[0] || undefined,
      endDate: callRecordsFilter.dateRange?.[1] || undefined
    })

    console.log('[CallManagement] callStore.callRecords count:', callStore.callRecords.length)
    console.log('[CallManagement] callStore.pagination:', callStore.pagination)

    // 从store获取数据并转换格式
    callRecordsList.value = callStore.callRecords.map((record: any) => ({
      id: record.id,
      // 尝试从多个字段获取客户姓名
      customerName: record.customerName || record.customer_name || '未知客户',
      customerPhone: record.customerPhone || record.customer_phone || '-',
      callType: record.callType || record.call_type || 'outbound',
      duration: formatCallDuration(record.duration),
      status: record.callStatus || record.call_status || record.status || 'connected',
      startTime: formatDateTime(record.startTime || record.start_time || record.createdAt || record.created_at),
      operator: record.userName || record.user_name || record.operatorName || '系统',
      remark: record.notes || record.remark || '',
      recordingUrl: record.recordingUrl || record.recording_url || null
    }))
    callRecordsPagination.total = callStore.pagination.total

    console.log('[CallManagement] callRecordsList count:', callRecordsList.value.length)
  } catch (error) {
    console.error('加载通话记录失败:', error)
    ElMessage.error('加载通话记录失败')
  } finally {
    callRecordsLoading.value = false
  }
}

// 重置通话记录筛选器
const resetCallRecordsFilter = () => {
  callRecordsFilter.dateRange = []
  callRecordsFilter.customerKeyword = ''
  loadCallRecords()
}

// 通话记录分页处理
const handleCallRecordsPageSizeChange = (size: number) => {
  callRecordsPagination.pageSize = size
  loadCallRecords()
}

const handleCallRecordsPageChange = (page: number) => {
  callRecordsPagination.currentPage = page
  loadCallRecords()
}

// 播放录音
const playRecording = (record: any) => {
  if (!record.recordingUrl) {
    ElMessage.warning('该通话没有录音文件')
    return
  }

  // 🔥 修复：确保录音URL是完整的URL
  // 如果已经是完整URL则直接使用，否则拼接API基础地址
  let recordingUrl = record.recordingUrl
  if (!recordingUrl.startsWith('http')) {
    // 优先使用环境变量，否则使用当前域名
    const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
    if (baseUrl) {
      recordingUrl = `${baseUrl}${recordingUrl.startsWith('/') ? '' : '/'}${recordingUrl}`
    } else {
      // 没有配置API基础地址时，使用相对路径（假设前后端同域）
      // 确保路径以 /api 开头
      if (!recordingUrl.startsWith('/api')) {
        recordingUrl = `/api/v1/calls${recordingUrl.startsWith('/') ? '' : '/'}${recordingUrl}`
      }
    }
  }

  console.log('[录音播放] 原始URL:', record.recordingUrl, '处理后URL:', recordingUrl)

  currentRecording.value = {
    ...record,
    recordingUrl
  }
  recordingPlayerVisible.value = true
}

// 下载录音
const downloadRecording = (record: any) => {
  if (!record.recordingUrl) {
    ElMessage.warning('该通话没有录音文件')
    return
  }

  // 创建下载链接
  const link = document.createElement('a')
  link.href = record.recordingUrl
  link.download = `录音_${record.customerName}_${record.startTime.replace(/[:\s]/g, '_')}.mp3`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('录音下载已开始')
}

// 停止录音播放
const stopRecording = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.currentTime = 0
  }
  recordingPlayerVisible.value = false
  currentRecording.value = null
}

// 音频播放器事件处理
const onAudioLoadStart = () => {
  console.log('开始加载音频')
}

const onAudioCanPlay = () => {
  console.log('音频可以播放')
}

const onAudioError = (error: any) => {
  console.error('音频播放错误:', error)
  ElMessage.error('录音播放失败，请检查录音文件')
}

// 快捷跟进相关方法
const resetQuickFollowUpForm = () => {
  Object.assign(quickFollowUpForm, {
    type: 'call',
    content: '',
    nextFollowTime: '',
    intention: '',
    callTags: [],
    remark: ''
  })
  quickFollowUpFormRef.value?.clearValidate()
}

const submitQuickFollowUp = async () => {
  if (!quickFollowUpFormRef.value) return

  try {
    await quickFollowUpFormRef.value.validate()
    quickFollowUpSubmitting.value = true

    // 验证currentCustomer
    if (!currentCustomer.value) {
      console.error('[CallManagement] currentCustomer 为空')
      ElMessage.error('客户信息不完整，请重试')
      return
    }

    if (!currentCustomer.value.id) {
      console.error('[CallManagement] currentCustomer.id 为空', currentCustomer.value)
      ElMessage.error('客户ID不存在，请重试')
      return
    }

    // 准备跟进记录数据
    const followUpData: any = {
      callId: '', // 如果有关联的通话记录ID，可以在这里设置
      customerId: currentCustomer.value.id,
      customerName: currentCustomer.value.name || currentCustomer.value.customerName || '',
      type: quickFollowUpForm.type,
      content: quickFollowUpForm.content,
      customerIntent: quickFollowUpForm.intention || null,
      callTags: quickFollowUpForm.callTags.length > 0 ? quickFollowUpForm.callTags : null,
      nextFollowUpDate: quickFollowUpForm.nextFollowTime || null,
      priority: 'medium', // 默认中等优先级
      status: 'pending' // 默认待跟进状态
    }

    console.log('[CallManagement] 提交跟进记录数据:', followUpData)
    console.log('[CallManagement] currentCustomer:', currentCustomer.value)

    // 调用API创建跟进记录
    const result = await callStore.createFollowUp(followUpData)
    console.log('[CallManagement] 创建跟进记录结果:', result)

    ElMessage.success('跟进记录保存成功')
    quickFollowUpVisible.value = false
    resetQuickFollowUpForm()

    // 刷新相关页面数据
    console.log('[CallManagement] 刷新呼出列表...')
    await loadOutboundList()

    // 如果详情弹窗打开，也刷新详情数据
    if (showDetailDialog.value && currentCustomer.value?.id) {
      console.log('[CallManagement] 刷新详情数据, customerId:', currentCustomer.value.id)
      await loadCustomerDetailData(currentCustomer.value.id)
    }

  } catch (error) {
    console.error('保存跟进记录失败:', error)
    ElMessage.error('保存跟进记录失败，请重试')
  } finally {
    quickFollowUpSubmitting.value = false
  }
}

const getFollowUpTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'call': '电话跟进',
    'visit': '上门拜访',
    'email': '邮件跟进',
    'message': '短信跟进'
  }
  return typeMap[type] || '其他跟进'
}

const handleExport = async () => {
  if (outboundList.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    // 动态导入 xlsx 库
    const XLSX = await import('xlsx')

    // 准备导出数据
    const exportData = outboundList.value.map(item => ({
      '客户姓名': item.customerName || '-',
      '电话号码': item.phone || '-',
      '客户等级': getLevelText(item.customerLevel),
      '最后通话': item.lastCallTime || '-',
      '通话次数': item.callCount || 0,
      '最新跟进': item.lastFollowUp || '-',
      '通话标签': item.callTags?.join('、') || '-',
      '状态': getStatusText(item.status),
      '负责人': item.salesPerson || '-',
      '备注': item.remark || '-'
    }))

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    const columnWidths = [
      { wch: 12 },  // 客户姓名
      { wch: 14 },  // 电话号码
      { wch: 10 },  // 客户等级
      { wch: 18 },  // 最后通话
      { wch: 10 },  // 通话次数
      { wch: 25 },  // 最新跟进
      { wch: 20 },  // 通话标签
      { wch: 10 },  // 状态
      { wch: 10 },  // 负责人
      { wch: 30 }   // 备注
    ]
    worksheet['!cols'] = columnWidths

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '呼出列表')

    // 生成文件名（包含日期）
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const fileName = `呼出列表_${dateStr}_${timeStr}.xlsx`

    // 导出文件
    XLSX.writeFile(workbook, fileName)

    ElMessage.success(`已导出 ${exportData.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

const handleCall = (row: any) => {
  // 打开外呼对话框并预填客户信息
  const customer = {
    id: row.id || row.customerId,
    name: row.customerName,
    phone: row.phone,
    company: row.company || ''
  }

  // 将预填充的客户添加到选项列表中，确保 select 组件能正确显示
  const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
  if (existingIndex === -1) {
    customerOptions.value = [customer, ...customerOptions.value]
  }

  outboundForm.value.selectedCustomer = customer as any
  outboundForm.value.customerId = customer.id

  // 更新号码选项
  const phones = []
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }
  phoneOptions.value = phones
  outboundForm.value.customerPhone = row.phone

  showOutboundDialog.value = true
}

const handleViewDetail = async (row: any) => {
  // 🔥 修复：确保currentCustomer有完整的客户信息，包括id字段
  currentCustomer.value = {
    ...row,
    id: row.id || row.customerId,
    customerId: row.id || row.customerId
  }
  showDetailDialog.value = true
  activeTab.value = 'orders' // 重置到第一个标签页

  // 获取客户ID，可能是 id 或 customerId
  const customerId = row.id || row.customerId
  if (customerId) {
    await loadCustomerDetailData(customerId)
  }
}

const handleAddFollowUp = async (row: any) => {
  // 从客户store中获取完整的客户信息
  const fullCustomer = customerStore.getCustomerById(row.id)

  if (fullCustomer) {
    currentCustomer.value = fullCustomer
  } else {
    // 如果没有找到完整信息，使用行数据并补充地址信息
    currentCustomer.value = {
      id: row.id,
      name: row.customerName,
      phone: row.phone,
      company: row.company || '未知公司',
      address: row.address || '',
      province: row.province || '',
      city: row.city || '',
      district: row.district || '',
      street: row.street || '',
      detailAddress: row.detailAddress || ''
    }
  }

  quickFollowUpVisible.value = true
}

const handleCreateOrder = (row?: any) => {
  // 如果有传入row参数，使用row的数据；否则使用currentCustomer
  const customer = row || currentCustomer.value
  if (!customer) {
    ElMessage.warning('请先选择客户')
    return
  }

  console.log('[通话管理] 新建订单，客户信息:', customer)

  // 🔥 修复：确保正确获取客户ID和其他信息
  const customerId = customer.id || customer.customerId
  const customerName = customer.customerName || customer.name
  const customerPhone = customer.phone || customer.customerPhone
  const customerAddress = customer.address || customer.detailAddress || ''

  if (!customerId) {
    ElMessage.warning('客户ID不存在')
    return
  }

  console.log('[通话管理] 跳转参数:', { customerId, customerName, customerPhone, customerAddress })

  // 跳转到新增订单页面，并传递客户信息
  safeNavigator.push({
    name: 'OrderAdd',
    query: {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      source: 'call_management' // 标识来源
    }
  })
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadOutboundList()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadOutboundList()
}

const maskPhone = (phone: string) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

const getLevelType = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '',
    'silver': 'info',
    'gold': 'warning',
    'diamond': 'success'
  }
  return levelMap[level] || ''
}

const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '普通',
    'silver': '白银',
    'gold': '黄金',
    'diamond': '钻石'
  }
  return levelMap[level] || '普通'
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'connected': 'success',
    'no_answer': 'info',
    'busy': 'warning',
    'failed': 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待外呼',
    'connected': '已接通',
    'no_answer': '未接听',
    'busy': '忙线',
    'failed': '失败'
  }
  return statusMap[status] || '未知'
}

// 通话状态相关辅助函数
const getCallStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connected': '已接通',
    'missed': '未接听',
    'rejected': '已拒绝',
    'busy': '忙线',
    'failed': '失败',
    'no_answer': '无人接听',
    'unreachable': '无法接通',
    'cancelled': '已取消',
    'timeout': '超时',
    'pending': '待外呼'
  }
  return statusMap[status] || status || '未知'
}

const getCallStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'connected': 'success',
    'missed': 'danger',
    'rejected': 'danger',
    'busy': 'warning',
    'failed': 'danger',
    'no_answer': 'warning',
    'unreachable': 'danger',
    'cancelled': 'info',
    'timeout': 'warning',
    'pending': 'info'
  }
  return typeMap[status] || 'info'
}

// 售后状态相关辅助函数
const getAftersalesStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'closed': '已关闭',
    'cancelled': '已取消'
  }
  return statusMap[status] || status || '未知'
}

const getAftersalesStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'closed': 'info',
    'cancelled': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取跟进类型标签
const getFollowUpTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'call': '电话跟进',
    'visit': '上门拜访',
    'email': '邮件跟进',
    'message': '短信跟进'
  }
  return typeMap[type] || type || '其他'
}

// 获取客户意向类型
const getIntentType = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': 'success',
    'medium': 'warning',
    'low': 'info',
    'none': 'danger'
  }
  return intentMap[intent] || 'info'
}

// 获取客户意向标签
const getIntentLabel = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': '高意向',
    'medium': '中意向',
    'low': '低意向',
    'none': '无意向'
  }
  return intentMap[intent] || intent || '未知'
}

// 详情弹窗中发起外呼
const handleDetailOutboundCall = () => {
  if (!currentCustomer.value) return

  // 关闭详情弹窗
  showDetailDialog.value = false

  // 预填充客户信息并打开外呼弹窗
  const customer = {
    id: currentCustomer.value.id || currentCustomer.value.customerId,
    name: currentCustomer.value.customerName || currentCustomer.value.name,
    phone: currentCustomer.value.phone || currentCustomer.value.customerPhone,
    company: currentCustomer.value.company || ''
  }

  // 将预填充的客户添加到选项列表中
  const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
  if (existingIndex === -1) {
    customerOptions.value = [customer, ...customerOptions.value]
  }

  outboundForm.value.selectedCustomer = customer as any
  outboundForm.value.customerId = customer.id

  // 更新号码选项并自动选择
  const phones = []
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }
  phoneOptions.value = phones
  outboundForm.value.customerPhone = customer.phone || ''

  showOutboundDialog.value = true
}

// 新建售后
const handleCreateAftersales = () => {
  if (!currentCustomer.value) return

  // 🔥 修复：使用正确的路由路径 /service/add
  router.push({
    path: '/service/add',
    query: {
      customerId: currentCustomer.value.id,
      customerName: currentCustomer.value.customerName || currentCustomer.value.name,
      customerPhone: currentCustomer.value.phone
    }
  })
}

// 搜索防抖定时器
let searchTimer: NodeJS.Timeout | null = null
const isSearching = ref(false)

// 防抖搜索客户
const debouncedSearchCustomers = (query: string = '') => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    searchCustomers(query)
  }, 300) // 300ms防抖延迟
}

// 搜索客户
const searchCustomers = async (query: string = '') => {
  try {
    isSearching.value = true
    await customerStore.loadCustomers()
    const allCustomers = customerStore.customers
    const currentUserId = userStore.currentUser?.id
    const currentUserRole = userStore.currentUser?.role

    // 超管和管理员可以看到所有客户，其他角色只能看到自己的客户
    const isAdminOrSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin'

    let filteredCustomers = allCustomers
    if (!isAdminOrSuperAdmin) {
      // 非管理员只能看到归属于自己的客户
      filteredCustomers = allCustomers.filter(customer => {
        return customer.salesPersonId === currentUserId || customer.createdBy === currentUserId
      })
    }

    // 如果有查询条件，进行智能匹配
    if (query && query.trim()) {
      const queryLower = query.toLowerCase().trim()
      const queryOriginal = query.trim()

      filteredCustomers = filteredCustomers.filter(customer => {
        // 支持按客户姓名、编号或电话号码搜索
        const matchesName = customer.name && customer.name.toLowerCase().includes(queryLower)
        const matchesCode = customer.code && customer.code.toLowerCase().includes(queryLower)
        const matchesPhone = customer.phone && customer.phone.includes(queryOriginal)
        const matchesCompany = customer.company && customer.company.toLowerCase().includes(queryLower)

        // 支持部分匹配电话号码（去除分隔符）
        const phoneMatch = customer.phone && customer.phone.replace(/[-\s]/g, '').includes(queryOriginal.replace(/[-\s]/g, ''))

        // 支持客户编号的部分匹配
        const codeMatch = customer.code && (
          customer.code.toLowerCase().includes(queryLower) ||
          customer.code.toLowerCase().startsWith(queryLower)
        )

        return matchesName || matchesCode || matchesPhone || matchesCompany || phoneMatch || codeMatch
      })

      // 按匹配度排序：完全匹配 > 开头匹配 > 包含匹配
      filteredCustomers.sort((a, b) => {
        const getMatchScore = (customer: any) => {
          let score = 0
          const name = customer.name?.toLowerCase() || ''
          const code = customer.code?.toLowerCase() || ''
          const phone = customer.phone || ''

          // 完全匹配得分最高
          if (name === queryLower || code === queryLower || phone === queryOriginal) score += 100
          // 开头匹配得分较高
          else if (name.startsWith(queryLower) || code.startsWith(queryLower) || phone.startsWith(queryOriginal)) score += 50
          // 包含匹配得分一般
          else if (name.includes(queryLower) || code.includes(queryLower) || phone.includes(queryOriginal)) score += 10

          return score
        }

        return getMatchScore(b) - getMatchScore(a)
      })
    }

    // 按客户名称排序，限制显示数量
    filteredCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    customerOptions.value = filteredCustomers.slice(0, 50) // 增加显示数量到50

    // 如果没有找到匹配的客户且有查询条件，显示提示
    if (filteredCustomers.length === 0 && query && query.trim()) {
      console.log(`未找到匹配"${query}"的客户`)
    }
  } catch (error) {
    console.error('搜索客户失败:', error)
    ElMessage.error('加载客户列表失败')
    customerOptions.value = []
  } finally {
    isSearching.value = false
  }
}

// 客户选择变化
const onCustomerChange = (customer: any) => {
  if (!customer) {
    phoneOptions.value = []
    outboundForm.value.customerPhone = ''
    outboundForm.value.customerId = ''
    return
  }

  outboundForm.value.customerId = customer.id

  // 构建号码选项
  const phones = []

  // 主号码
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }

  // 其他号码（如果有phones数组）
  if (customer.phones && Array.isArray(customer.phones)) {
    customer.phones.forEach((phoneObj: any) => {
      if (phoneObj.phone && phoneObj.phone !== customer.phone) {
        phones.push({
          phone: phoneObj.phone,
          type: phoneObj.type || '其他'
        })
      }
    })
  }

  phoneOptions.value = phones

  // 自动选择第一个号码
  if (phones.length > 0) {
    outboundForm.value.customerPhone = phones[0].phone
  }
}

// 手动输入号码（已废弃，保留兼容性）
const onPhoneInput = () => {
  // 如果手动输入了号码，清除客户选择
  if (outboundForm.value.customerPhone && !phoneOptions.value.some(p => p.phone === outboundForm.value.customerPhone)) {
    outboundForm.value.selectedCustomer = null
    outboundForm.value.customerId = ''
    phoneOptions.value = []
  }
}

// 手动输入号码处理
const onManualPhoneInput = () => {
  // 手动输入号码时，不清除客户选择，保持客户信息独立
  // 这样可以避免泄露客户敏感信息，同时保持功能独立性
  console.log('手动输入号码:', outboundForm.value.manualPhone)
}

// 关闭外呼弹窗
const closeOutboundDialog = () => {
  showOutboundDialog.value = false
  resetOutboundForm()
}

// 重置外呼表单
const resetOutboundForm = () => {
  outboundForm.value = {
    callMethod: '', // 外呼方式：work_phone(工作手机) | network_phone(网络电话)
    selectedLine: null, // 选择的线路ID
    selectedWorkPhone: null, // 选择的工作手机ID
    selectedCustomer: null,
    customerPhone: '', // 从客户选择的号码
    manualPhone: '', // 手动输入的号码
    customerId: '',
    notes: ''
  }
  customerOptions.value = []
  phoneOptions.value = []
}

// 打开外呼弹窗
const openOutboundDialog = async () => {
  resetOutboundForm()
  showOutboundDialog.value = true
  // 自动加载客户列表
  await searchCustomers()
}

// 打开跟进弹窗
const openFollowupDialog = () => {
  if (!currentCustomer.value) {
    ElMessage.warning('请先选择客户')
    return
  }
  quickFollowUpVisible.value = true
}

// 开始外呼
const startOutboundCall = async () => {
  if (!outboundFormRef.value) return

  try {
    await outboundFormRef.value.validate()

    // 确定要拨打的号码：优先使用手动输入的号码
    const phoneToCall = outboundForm.value.manualPhone || outboundForm.value.customerPhone

    if (!phoneToCall) {
      ElMessage.warning('请选择客户号码或手动输入号码')
      return
    }

    // 检查外呼方式
    if (!outboundForm.value.callMethod) {
      ElMessage.warning('请选择外呼方式')
      return
    }

    outboundLoading.value = true

    // 获取客户名称
    const customerName = outboundForm.value.selectedCustomer?.name || '未知客户'

    // 根据外呼方式处理
    if (outboundForm.value.callMethod === 'work_phone') {
      // 工作手机外呼 - 通过APP发起呼叫
      // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
      const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
      if (!selectedPhone) {
        console.error('[startOutboundCall] 找不到选中的工作手机, selectedWorkPhone:', outboundForm.value.selectedWorkPhone, 'workPhones:', workPhones.value.map(p => ({ id: p.id, type: typeof p.id })))
        ElMessage.warning('请选择工作手机')
        return
      }

      // 调用后端API通知APP发起呼叫
      try {
        const response = await callConfigApi.initiateWorkPhoneCall({
          workPhoneId: outboundForm.value.selectedWorkPhone,
          targetPhone: phoneToCall,
          customerId: outboundForm.value.customerId || undefined,
          customerName: customerName,
          notes: outboundForm.value.notes
        })

        if (response && (response as any).success !== false) {
          // 关闭外呼弹窗
          closeOutboundDialog()

          const callId = (response as any).callId || `call_${Date.now()}`

          // 设置当前通话数据并显示通话中弹窗
          currentCallData.value = {
            id: callId,
            customerName: customerName,
            phone: phoneToCall,
            callMethod: 'work_phone',
            workPhoneName: selectedPhone.name || selectedPhone.number
          }
          currentCallId.value = callId // 设置当前通话ID
          callDuration.value = 0
          callNotes.value = outboundForm.value.notes || ''
          callConnected.value = false // 初始状态为未接通
          callInProgressVisible.value = true

          // 不立即开始计时，等待接通后再计时

          ElMessage.success(`正在通过工作手机 ${selectedPhone.number} 呼叫...`)
        } else {
          ElMessage.error((response as any)?.message || '发起呼叫失败')
        }
      } catch (error: any) {
        console.error('工作手机外呼失败:', error)
        ElMessage.error(error.message || '工作手机外呼失败')
      }
    } else if (outboundForm.value.callMethod === 'network_phone') {
      // 网络电话外呼 - 通过系统线路发起呼叫
      const selectedLine = availableLines.value.find(l => l.id === outboundForm.value.selectedLine)
      if (!selectedLine) {
        ElMessage.warning('请选择外呼线路')
        return
      }

      // 调用后端API发起网络电话呼叫
      try {
        const callParams = {
          customerId: outboundForm.value.customerId || '',
          customerPhone: phoneToCall,
          customerName: customerName,
          notes: outboundForm.value.notes,
          lineId: outboundForm.value.selectedLine
        }

        await callStore.makeOutboundCall(callParams)

        // 关闭外呼弹窗
        closeOutboundDialog()

        const callId = `call_${Date.now()}`

        // 设置当前通话数据并显示通话中弹窗
        currentCallData.value = {
          id: callId,
          customerName: customerName,
          phone: phoneToCall,
          callMethod: 'network_phone',
          lineName: selectedLine.name
        }
        currentCallId.value = callId // 设置当前通话ID
        callDuration.value = 0
        callNotes.value = outboundForm.value.notes || ''
        callInProgressVisible.value = true

        // 开始计时
        startCallTimer()

        ElMessage.success(`正在通过线路 ${selectedLine.name} 呼叫...`)
      } catch (error: any) {
        console.error('网络电话外呼失败:', error)
        ElMessage.error(error.message || '网络电话外呼失败')
      }
    }

    // 刷新通话记录
    await callStore.fetchCallRecords()
  } catch (error) {
    console.error('外呼失败:', error)
    ElMessage.error('外呼失败，请重试')
  } finally {
    outboundLoading.value = false
  }
}

const handleOutboundCall = async () => {
  if (!outboundFormRef.value) return

  try {
    await outboundFormRef.value.validate()
    outboundLoading.value = true

    await callStore.makeOutboundCall({
      customerId: outboundForm.value.customerId || '',
      customerPhone: outboundForm.value.customerPhone,
      notes: outboundForm.value.notes
    })

    showOutboundDialog.value = false
    resetOutboundForm()

    // 刷新通话记录
    await callStore.fetchCallRecords()
  } catch (error) {
    console.error('外呼失败:', error)
  } finally {
    outboundLoading.value = false
  }
}

// 呼入通话相关方法
const simulateIncomingCall = (customerData: any) => {
  if (callStatus.value === 'busy') {
    ElMessage.warning('当前状态为忙碌，无法接收来电')
    return
  }

  incomingCallData.value = customerData
  incomingCallVisible.value = true
}

const answerCall = () => {
  if (!incomingCallData.value) return

  // 关闭呼入弹窗
  incomingCallVisible.value = false

  // 设置当前通话数据
  currentCallData.value = incomingCallData.value
  callDuration.value = 0
  callNotes.value = ''

  // 显示通话中弹窗
  callInProgressVisible.value = true

  // 开始计时
  startCallTimer()

  ElMessage.success('通话已接通')
}

const rejectCall = () => {
  incomingCallVisible.value = false
  incomingCallData.value = null
  ElMessage.info('已拒绝来电')
}

const endCall = async () => {
  // 停止计时
  stopCallTimer()

  // 保存通话记录
  try {
    // 如果有callId，调用后端API结束通话
    if (currentCallData.value?.id) {
      await callConfigApi.endCall(currentCallData.value.id, {
        notes: callNotes.value,
        duration: callDuration.value
      })
    }
    ElMessage.success('通话已结束，记录已保存')
  } catch (error) {
    console.error('保存通话记录失败:', error)
    ElMessage.error('保存通话记录失败')
  }

  // 关闭通话中弹窗并重置状态
  closeCallWindow()

  // 刷新通话记录
  await callStore.fetchCallRecords()
}

// 关闭通话窗口并重置状态
const closeCallWindow = () => {
  callInProgressVisible.value = false
  currentCallData.value = null
  currentCallId.value = null
  callDuration.value = 0
  callNotes.value = ''
  isCallWindowMinimized.value = false
  callConnected.value = false

  // 停止计时器
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

// 保存通话备注
const saveCallNotes = async (silent = false) => {
  if (!currentCallId.value && !currentCallData.value?.id) {
    if (!silent) ElMessage.warning('没有正在进行的通话')
    return
  }

  if (!callNotes.value.trim()) {
    if (!silent) ElMessage.warning('请输入备注内容')
    return
  }

  try {
    savingNotes.value = true
    const callId = currentCallId.value || currentCallData.value?.id

    // 调用API更新通话记录的备注
    await callConfigApi.updateCallNotes(callId, callNotes.value.trim())

    if (!silent) {
      ElMessage.success('备注保存成功')
    }
  } catch (error) {
    console.error('保存备注失败:', error)
    if (!silent) {
      ElMessage.error('保存备注失败，请重试')
    }
  } finally {
    savingNotes.value = false
  }
}

// 处理结束通话按钮点击
const handleEndCallClick = () => {
  // 如果是工作手机外呼，提示用户在手机端挂断
  if (currentCallData.value?.callMethod === 'work_phone') {
    ElMessageBox.confirm(
      '本次通话需要在手机上挂断，挂断后本窗口会自动关闭。',
      '提示',
      {
        confirmButtonText: '我知道了',
        cancelButtonText: '关闭窗口',
        distinguishCancelAndClose: true,
        type: 'info'
      }
    ).then(() => {
      // 用户点击"我知道了"，不做任何操作
    }).catch((action) => {
      if (action === 'cancel') {
        // 用户点击"关闭窗口"，直接关闭通话窗口
        closeCallWindow()
      }
    })
  } else {
    // 网络电话可以直接结束
    endCall()
  }
}

const startCallTimer = () => {
  // 只有在接通状态下才开始计时
  if (!callConnected.value) return

  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
}

// 通话接通时调用
const onCallConnected = () => {
  callConnected.value = true
  callDuration.value = 0
  startCallTimer()
}

const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

const saveCallRecord = async () => {
  if (!currentCallData.value) return

  // 如果是通过新的发起呼叫流程，通话记录已经在后端创建
  // 这里只需要刷新数据
  await refreshData()
}

const viewCustomerDetail = () => {
  if (!incomingCallData.value) return

  currentCustomer.value = incomingCallData.value
  showDetailDialog.value = true
  incomingCallVisible.value = false
}

const quickFollowUp = () => {
  if (!incomingCallData.value) return

  currentCustomer.value = incomingCallData.value
  quickFollowUpVisible.value = true
  incomingCallVisible.value = false
}

// 通话中弹窗的快捷操作
const openQuickFollowUpFromCall = () => {
  if (!currentCallData.value) return

  // 最小化通话窗口
  isCallWindowMinimized.value = true

  // 设置当前客户信息用于跟进
  currentCustomer.value = {
    id: currentCallData.value.customerId || currentCallData.value.id,
    name: currentCallData.value.customerName,
    phone: currentCallData.value.phone
  }
  quickFollowUpVisible.value = true
}

const viewCustomerDetailFromCall = async () => {
  if (!currentCallData.value) return

  // 最小化通话窗口
  isCallWindowMinimized.value = true

  const customerId = currentCallData.value.customerId || currentCallData.value.id

  // 设置当前客户信息用于查看详情
  currentCustomer.value = {
    id: customerId,
    customerName: currentCallData.value.customerName,
    name: currentCallData.value.customerName,
    phone: currentCallData.value.phone
  }

  // 加载客户详情数据
  if (customerId) {
    await loadCustomerDetailData(customerId)
  }

  showDetailDialog.value = true
}

// 模拟呼入测试方法（开发测试用）
const testIncomingCall = () => {
  const testCustomer = {
    id: 'test_001',
    customerName: '测试客户',
    phone: '13800138888',
    customerLevel: 'gold',
    lastCallTime: '2024-01-10 15:30:00',
    company: '测试公司'
  }
  simulateIncomingCall(testCustomer)
}

const viewCallDetail = (record: any) => {
  // 显示通话详情对话框 - 美化版
  const callTypeTag = record.callType === 'outbound'
    ? '<span style="display: inline-block; padding: 2px 8px; background: #ecf5ff; color: #409eff; border-radius: 4px; font-size: 12px;">外呼</span>'
    : '<span style="display: inline-block; padding: 2px 8px; background: #f0f9eb; color: #67c23a; border-radius: 4px; font-size: 12px;">来电</span>'

  const statusColor = record.status === 'connected' ? '#67c23a' : (record.status === 'no_answer' ? '#e6a23c' : '#f56c6c')
  const statusTag = `<span style="display: inline-block; padding: 2px 8px; background: ${statusColor}20; color: ${statusColor}; border-radius: 4px; font-size: 12px;">${getStatusText(record.status)}</span>`

  // 通话标签
  const callTagsHtml = record.callTags && record.callTags.length > 0
    ? record.callTags.map((tag: string) => `<span style="display: inline-block; padding: 2px 8px; background: #f4f4f5; color: #909399; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')
    : '<span style="color: #c0c4cc;">无</span>'

  ElMessageBox.alert(
    `<div style="padding: 8px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">呼叫类型</span>
          <span>${callTypeTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">通话状态</span>
          <span>${statusTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">通话时长</span>
          <span style="color: #303133; font-weight: 500;">${record.duration || '0秒'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">操作人员</span>
          <span style="color: #303133;">${record.operator || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">开始时间</span>
          <span style="color: #303133;">${record.startTime || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">通话标签</span>
          <div>${callTagsHtml}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">备注</span>
          <span style="color: #606266;">${record.remark || '无'}</span>
        </div>
        ${record.recordingUrl ? `
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">录音</span>
          <a href="${record.recordingUrl}" target="_blank" style="color: #409eff; text-decoration: none;">点击播放录音</a>
        </div>` : ''}
      </div>
    </div>`,
    '通话详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'detail-message-box'
    }
  )
}

const createFollowUp = (record: CallRecord) => {
  // 跳转到创建跟进记录页面
  safeNavigator.push(`/service-management/call/followup?callId=${record.id}&customerId=${record.customerId}`)
}

// 详情弹窗相关方法
const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'pending_audit': 'warning',
    'pending_transfer': 'warning',
    'processing': 'primary',
    'shipped': 'primary',
    'delivered': 'success',
    'completed': 'success',
    'cancelled': 'danger',
    'refunded': 'danger'
  }
  return statusMap[status] || 'info'
}

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'pending_audit': '待审核',
    'pending_transfer': '待流转',
    'processing': '处理中',
    'shipped': '已发货',
    'delivered': '已签收',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款'
  }
  return statusMap[status] || status || '未知'
}

const viewOrder = (row: any) => {
  // 跳转到订单详情页面
  const orderId = row.id || row.orderNo
  if (orderId) {
    router.push(`/order/detail/${orderId}`)
  } else {
    ElMessage.warning('订单ID不存在')
  }
}

const viewAftersales = (row: any) => {
  // 跳转到售后详情页面
  const ticketId = row.id || row.ticketNo
  if (ticketId) {
    router.push(`/service/aftersales/detail/${ticketId}`)
  } else {
    ElMessage.warning('工单ID不存在')
  }
}

const viewFollowup = (row: any) => {
  // 显示跟进记录详情对话框 - 美化版
  const typeMap: Record<string, { bg: string; color: string }> = {
    'call': { bg: '#ecf5ff', color: '#409eff' },
    'visit': { bg: '#f0f9eb', color: '#67c23a' },
    'email': { bg: '#fdf6ec', color: '#e6a23c' },
    'message': { bg: '#f4f4f5', color: '#909399' }
  }
  const typeStyle = typeMap[row.type] || { bg: '#f4f4f5', color: '#909399' }
  const typeTag = `<span style="display: inline-block; padding: 2px 8px; background: ${typeStyle.bg}; color: ${typeStyle.color}; border-radius: 4px; font-size: 12px;">${getFollowUpTypeLabel(row.type)}</span>`

  const intentMap: Record<string, { bg: string; color: string }> = {
    'high': { bg: '#f0f9eb', color: '#67c23a' },
    'medium': { bg: '#fdf6ec', color: '#e6a23c' },
    'low': { bg: '#f4f4f5', color: '#909399' },
    'none': { bg: '#fef0f0', color: '#f56c6c' }
  }
  const intentStyle = row.customerIntent ? (intentMap[row.customerIntent] || { bg: '#f4f4f5', color: '#909399' }) : null
  const intentTag = intentStyle
    ? `<span style="display: inline-block; padding: 2px 8px; background: ${intentStyle.bg}; color: ${intentStyle.color}; border-radius: 4px; font-size: 12px;">${getIntentLabel(row.customerIntent)}</span>`
    : '<span style="color: #c0c4cc;">未设置</span>'

  const tagsHtml = row.callTags && row.callTags.length > 0
    ? row.callTags.map((tag: string) => `<span style="display: inline-block; padding: 2px 6px; background: #f4f4f5; color: #606266; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')
    : '<span style="color: #c0c4cc;">无</span>'

  ElMessageBox.alert(
    `<div style="padding: 8px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进类型</span>
          <span>${typeTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">客户意向</span>
          <span>${intentTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进人</span>
          <span style="color: #303133;">${row.operator || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进时间</span>
          <span style="color: #303133;">${row.createTime || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">跟进内容</span>
          <span style="color: #606266; line-height: 1.6;">${row.content || '无'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">通话标签</span>
          <div>${tagsHtml}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">下次计划</span>
          <span style="color: #606266;">${row.nextPlan || '无'}</span>
        </div>
      </div>
    </div>`,
    '跟进记录详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'detail-message-box'
    }
  )
}


// 加载统计数据
const loadStatistics = async () => {
  try {
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

    const response = await callApi.getCallStatistics({
      startDate,
      endDate,
      groupBy: 'day'
    })

    const data = response.data
    statistics.todayCalls = data.totalCalls || 0
    statistics.totalDuration = data.totalDuration || 0
    statistics.connectionRate = Math.round(data.connectionRate || 0)

    // 计算活跃用户数（今日有通话记录的用户数）
    statistics.activeUsers = data.userStats?.length || 0
  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 如果API调用失败，使用默认值
    statistics.todayCalls = 0
    statistics.totalDuration = 0
    statistics.connectionRate = 0
    statistics.activeUsers = 0
  }
}

// 负责人列表 - 从userStore获取真实用户
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const salesPersonList = computed(() => {
  const currentUserRole = userStore.currentUser?.role
  const currentUserDepartment = userStore.currentUser?.department

  return userStore.users
    .filter((u: any) => {
      // 检查用户是否启用（禁用用户不显示）
      const isEnabled = !u.status || u.status === 'active'
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role)

      // 🔥 部门经理只能看到本部门的用户
      if (currentUserRole === 'department_manager') {
        return isEnabled && hasValidRole && u.department === currentUserDepartment
      }

      return isEnabled && hasValidRole
    })
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username
    }))
})

// 🔥 是否可以查看负责人筛选（超管、管理员、部门经理可以）
const canViewSalesPersonFilter = computed(() => {
  const role = userStore.currentUser?.role
  return role === 'super_admin' || role === 'admin' || role === 'department_manager'
})

// 生命周期
onMounted(async () => {
  try {
    // 初始化坐席状态（从本地存储恢复）
    initAgentStatus()
    // 加载用户列表（用于负责人筛选）
    await userStore.loadUsers()
    // 加载统计数据
    await loadStatistics()
    // 加载呼出列表
    await loadOutboundList()
    // 获取最近的通话记录
    await callStore.fetchCallRecords({ pageSize: 10 })
    // 获取跟进记录
    await callStore.fetchFollowUpRecords({ pageSize: 20 })
    // 检查SDK安装状态
    await checkSDKStatus()
    // 加载SDK详细信息
    await loadSDKInfo()
    // 加载已连接设备列表
    await loadConnectedDevices()
    // 加载可用外呼线路和工作手机
    await loadAvailableCallMethods()

    // 监听WebSocket通话状态变化
    setupCallStatusListener()

    // 🔥 检查路由参数，如果是从客户列表跳转过来的外呼请求
    checkOutboundFromRoute()
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 🔥 检查路由参数，处理从其他页面跳转过来的外呼请求
const checkOutboundFromRoute = () => {
  const { action, customerId, customerName, customerPhone, company } = route.query

  if (action === 'outbound' && customerId && customerPhone) {
    console.log('[CallManagement] 收到外呼请求:', { customerId, customerName, customerPhone, company })

    // 构建客户信息
    const customer = {
      id: customerId as string,
      name: customerName as string || '未知客户',
      phone: customerPhone as string,
      company: (company as string) || ''
    }

    // 将客户添加到选项列表
    const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
    if (existingIndex === -1) {
      customerOptions.value = [customer, ...customerOptions.value]
    }

    // 预填充外呼表单
    outboundForm.value.selectedCustomer = customer as any
    outboundForm.value.customerId = customer.id

    // 更新号码选项
    phoneOptions.value = [{
      phone: customer.phone,
      type: '主号码'
    }]
    outboundForm.value.customerPhone = customer.phone

    // 🔥 设置默认外呼方式（如果有可用的工作手机或线路）
    if (workPhones.value.length > 0) {
      outboundForm.value.callMethod = 'work_phone'
      outboundForm.value.selectedWorkPhone = workPhones.value[0].id
    } else if (availableLines.value.length > 0) {
      outboundForm.value.callMethod = 'network_phone'
      outboundForm.value.selectedLine = availableLines.value[0].id
    }

    // 打开外呼对话框
    showOutboundDialog.value = true

    // 清除路由参数，避免刷新页面时重复弹窗
    router.replace({ path: route.path })
  }
}

// 设置通话状态监听
const setupCallStatusListener = () => {
  // 监听设备状态变化（包括通话状态）
  webSocketService.onDeviceStatusChange((data) => {
    console.log('[CallManagement] 设备状态变化:', data)
    // 刷新工作手机状态
    loadAvailableCallMethods()
  })

  // 监听通话状态变化（APP端同步）
  webSocketService.on('call:status', (data: any) => {
    console.log('[CallManagement] 收到通话状态变化:', data)
    handleCallStatusFromWebSocket(data)
  })

  // 监听通话接通
  webSocketService.on('call:connected', (data: any) => {
    console.log('[CallManagement] 收到通话接通:', data)
    handleCallStatusFromWebSocket({ ...data, status: 'connected' })
  })

  // 监听通话结束
  webSocketService.on('call:ended', (data: any) => {
    console.log('[CallManagement] 收到通话结束:', data)
    handleCallEndedFromWebSocket(data)
  })

  // 监听WebSocket消息，处理通话状态变化（兼容旧格式）
  webSocketService.onMessage((message) => {
    console.log('[CallManagement] 收到WebSocket消息:', message)

    // 处理通话状态变化消息
    if (message.type === 'CALL_STATUS' || message.type === 'call_status') {
      handleCallStatusChange(message)
    }

    // 处理通话结束消息
    if (message.type === 'CALL_ENDED' || message.type === 'call_ended') {
      handleCallEnded(message)
    }
  })
}

// 处理WebSocket推送的通话状态变化
const handleCallStatusFromWebSocket = (data: any) => {
  const callId = data.callId
  const status = data.status

  console.log('[CallManagement] 处理通话状态:', { callId, status, currentCallId: currentCallId.value })

  // 检查是否是当前通话
  if (currentCallId.value && currentCallId.value === callId) {
    if (status === 'connected' || status === 'answered') {
      // 通话已接通，开始计时
      if (!callConnected.value) {
        console.log('[CallManagement] 通话已接通，开始计时')
        callConnected.value = true
        callDuration.value = 0
        startCallTimer()
        ElMessage.success('通话已接通')
      }
    } else if (status === 'ringing') {
      console.log('[CallManagement] 对方响铃中')
    } else if (status === 'ended' || status === 'released' || status === 'hangup') {
      // 通话结束
      handleCallEndedFromWebSocket(data)
    }
  }
}

// 处理WebSocket推送的通话结束
const handleCallEndedFromWebSocket = (data: any) => {
  const callId = data.callId

  console.log('[CallManagement] 处理通话结束:', { callId, currentCallId: currentCallId.value })

  // 检查是否是当前通话
  if (currentCallId.value && currentCallId.value === callId) {
    console.log('[CallManagement] 当前通话已结束，自动关闭窗口')

    // 更新通话时长（如果APP传来了时长）
    if (data.duration !== undefined) {
      callDuration.value = data.duration
    }

    // 自动保存备注
    if (callNotes.value.trim()) {
      saveCallNotes(true) // 静默保存
    }

    // 停止计时器
    if (callTimer.value) {
      clearInterval(callTimer.value)
      callTimer.value = null
    }

    // 关闭通话窗口
    closeCallWindow()

    // 显示通话结束提示
    ElMessage.info(`通话已结束，通话时长：${formatCallDuration(callDuration.value)}`)

    // 刷新通话记录
    loadCallRecords()
    loadOutboundList()
  }
}

// 处理通话状态变化
const handleCallStatusChange = (message: any) => {
  const data = message.data || message
  const callId = data.callId

  // 检查是否是当前通话
  if (currentCallData.value && currentCallData.value.id === callId) {
    const status = data.status

    console.log('[CallManagement] 通话状态变化:', status)

    if (status === 'connected' || status === 'answered') {
      // 通话已接通，开始计时
      if (!callConnected.value) {
        callConnected.value = true
        callDuration.value = 0
        startCallTimer()
        ElMessage.success('通话已接通')
      }
    } else if (status === 'ringing') {
      // 对方响铃中
      console.log('[CallManagement] 对方响铃中')
    }
  }
}

// 处理通话结束
const handleCallEnded = (message: any) => {
  const data = message.data || message
  const callId = data.callId

  // 检查是否是当前通话
  if (currentCallData.value && currentCallData.value.id === callId) {
    console.log('[CallManagement] 通话已结束:', data)

    // 更新通话时长（如果APP传来了时长）
    if (data.duration !== undefined) {
      callDuration.value = data.duration
    }

    // 自动关闭通话窗口
    endCall()
  }
}

// 加载可用的外呼线路和工作手机
const loadAvailableCallMethods = async () => {
  try {
    const res = await callConfigApi.getMyAvailableLines()
    console.log('[CallManagement] loadAvailableCallMethods response:', res)
    console.log('[CallManagement] loadAvailableCallMethods raw:', JSON.stringify(res))

    // request.ts 响应拦截器返回的是 data
    let assignedLines: any[] = []
    let workPhonesData: any[] = []

    if (res && (res as any).assignedLines !== undefined) {
      assignedLines = (res as any).assignedLines || []
      workPhonesData = (res as any).workPhones || []
    } else if (res && (res as any).success && (res as any).data) {
      assignedLines = (res as any).data.assignedLines || []
      workPhonesData = (res as any).data.workPhones || []
    }

    // 映射线路数据
    availableLines.value = assignedLines.map((line: any) => ({
      id: line.id,
      name: line.name,
      provider: line.provider,
      status: '正常',
      callerNumber: line.callerNumber
    }))

    // 🔥 修复：正确映射工作手机数据，确保 id 和 status 字段正确
    workPhones.value = workPhonesData.map((phone: any, index: number) => {
      // 🔥 调试：打印原始数据
      console.log(`[CallManagement] 原始工作手机数据 ${index}:`, JSON.stringify(phone))

      // 🔥 关键修复：确保 id 有效
      // id 可能是数字或字符串，都需要正确处理
      let phoneId: number | string = phone.id
      if (phoneId === undefined || phoneId === null || phoneId === '') {
        console.warn(`[CallManagement] 工作手机 ${index} 的 id 无效，使用 index+1 作为临时 ID`)
        phoneId = index + 1
      }
      // 如果是字符串类型的数字，转换为数字
      if (typeof phoneId === 'string' && /^\d+$/.test(phoneId)) {
        phoneId = parseInt(phoneId)
      }

      const mappedPhone = {
        id: phoneId,
        number: phone.phoneNumber || phone.phone_number || phone.deviceName || phone.device_name || '未知号码',
        name: phone.deviceName || phone.device_name || '工作手机',
        // 🔥 修复：正确处理状态字段
        status: (phone.onlineStatus === 'online' || phone.online_status === 'online') ? '在线' : '离线',
        brand: phone.deviceModel || phone.device_model || ''
      }
      console.log(`[CallManagement] 映射工作手机 ${index}:`, mappedPhone)
      return mappedPhone
    })

    console.log('[CallManagement] availableLines:', availableLines.value.length, 'workPhones:', workPhones.value.length)
    console.log('[CallManagement] workPhones 详细:', workPhones.value)
  } catch (e) {
    console.error('加载可用外呼方式失败:', e)
  }
}

// 初始化外呼弹窗
const initOutboundDialog = async () => {
  // 加载可用的外呼方式
  await loadAvailableCallMethods()

  console.log('[initOutboundDialog] workPhones:', workPhones.value.length, workPhones.value.map(p => ({ id: p.id, status: p.status })))
  console.log('[initOutboundDialog] availableLines:', availableLines.value.length)

  // 🔥 只有在没有设置外呼方式时才设置默认值（避免覆盖从路由传递的设置）
  if (!outboundForm.value.callMethod) {
    if (workPhones.value.length > 0) {
      outboundForm.value.callMethod = 'work_phone'
      outboundForm.value.selectedWorkPhone = workPhones.value[0].id
      console.log('[initOutboundDialog] 设置默认工作手机:', workPhones.value[0].id, typeof workPhones.value[0].id)
    } else if (availableLines.value.length > 0) {
      outboundForm.value.callMethod = 'network_phone'
      outboundForm.value.selectedLine = availableLines.value[0].id
      console.log('[initOutboundDialog] 设置默认线路:', availableLines.value[0].id)
    }
  }

  console.log('[initOutboundDialog] 最终 outboundForm:', {
    callMethod: outboundForm.value.callMethod,
    selectedWorkPhone: outboundForm.value.selectedWorkPhone,
    selectedLine: outboundForm.value.selectedLine,
    selectedCustomer: outboundForm.value.selectedCustomer,
    customerPhone: outboundForm.value.customerPhone
  })
}

// 外呼方式变更处理
const onOutboundMethodChange = (method: string) => {
  if (method === 'work_phone' && workPhones.value.length > 0) {
    outboundForm.value.selectedWorkPhone = workPhones.value[0].id
    outboundForm.value.selectedLine = null
  } else if (method === 'network_phone' && availableLines.value.length > 0) {
    outboundForm.value.selectedLine = availableLines.value[0].id
    outboundForm.value.selectedWorkPhone = null
  }
}

// 获取服务商文本
const getProviderText = (provider: string) => {
  const providerMap: Record<string, string> = {
    aliyun: '阿里云',
    tencent: '腾讯云',
    huawei: '华为云',
    custom: '自定义'
  }
  return providerMap[provider] || provider || '未知'
}

// 手机号运营商映射（根据手机号前三位判断）
const phoneCarrierMap: Record<string, string> = {
  // 中国移动
  '134': '移动', '135': '移动', '136': '移动', '137': '移动', '138': '移动', '139': '移动',
  '147': '移动', '148': '移动', '150': '移动', '151': '移动', '152': '移动', '157': '移动',
  '158': '移动', '159': '移动', '172': '移动', '178': '移动', '182': '移动', '183': '移动',
  '184': '移动', '187': '移动', '188': '移动', '195': '移动', '197': '移动', '198': '移动',
  // 中国联通
  '130': '联通', '131': '联通', '132': '联通', '145': '联通', '146': '联通', '155': '联通',
  '156': '联通', '166': '联通', '167': '联通', '171': '联通', '175': '联通', '176': '联通',
  '185': '联通', '186': '联通', '196': '联通',
  // 中国电信
  '133': '电信', '149': '电信', '153': '电信', '173': '电信', '174': '电信', '177': '电信',
  '180': '电信', '181': '电信', '189': '电信', '190': '电信', '191': '电信', '193': '电信',
  '199': '电信'
}

// 获取手机号运营商
const getPhoneCarrier = (phone: string): string => {
  if (!phone) return ''
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 3) return ''
  const prefix = cleanPhone.substring(0, 3)
  return phoneCarrierMap[prefix] || ''
}

// 计算属性：是否可以开始呼叫
const canStartCall = computed(() => {
  console.log('[canStartCall] 检查条件:', {
    callMethod: outboundForm.value.callMethod,
    selectedWorkPhone: outboundForm.value.selectedWorkPhone,
    selectedLine: outboundForm.value.selectedLine,
    manualPhone: outboundForm.value.manualPhone,
    customerPhone: outboundForm.value.customerPhone
  })

  // 必须有外呼方式
  if (!outboundForm.value.callMethod) {
    console.log('[canStartCall] 失败: 没有选择外呼方式')
    return false
  }

  // 如果选择工作手机，必须选择一个手机
  if (outboundForm.value.callMethod === 'work_phone') {
    if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) {
      console.log('[canStartCall] 失败: 没有选择工作手机')
      return false
    }
    // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
    const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
    if (!selectedPhone) {
      console.log('[canStartCall] 失败: 找不到选中的工作手机, selectedWorkPhone:', outboundForm.value.selectedWorkPhone, 'workPhones:', workPhones.value.map(p => p.id))
      return false
    }
    if (selectedPhone.status !== 'online' && selectedPhone.status !== '在线') {
      console.log('[canStartCall] 失败: 选中的工作手机已离线')
      return false
    }
  }

  // 如果选择网络电话，必须选择一条线路
  if (outboundForm.value.callMethod === 'network_phone' && !outboundForm.value.selectedLine) {
    console.log('[canStartCall] 失败: 没有选择线路')
    return false
  }

  // 必须有电话号码（手动输入或从客户选择）
  // 手动输入号码时不需要选择客户
  const hasPhone = outboundForm.value.manualPhone?.trim() || outboundForm.value.customerPhone
  if (!hasPhone) {
    console.log('[canStartCall] 失败: 没有电话号码')
    return false
  }

  console.log('[canStartCall] 通过所有检查')
  return true
})

// 计算属性：获取不能呼叫的原因
const getCannotCallReason = computed(() => {
  if (!outboundForm.value.callMethod) {
    if (!workPhones.value.length && !availableLines.value.length) {
      return '暂无可用的外呼方式，请先绑定工作手机或联系管理员分配线路'
    }
    return '请选择外呼方式'
  }

  if (outboundForm.value.callMethod === 'work_phone') {
    if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) {
      return '请选择工作手机'
    }
    // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
    const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
    if (!selectedPhone) {
      return '选中的工作手机不存在，请重新选择'
    }
    if (selectedPhone.status !== 'online' && selectedPhone.status !== '在线') {
      return '选中的工作手机已离线，请在手机APP上重新连接'
    }
  }

  if (outboundForm.value.callMethod === 'network_phone' && !outboundForm.value.selectedLine) {
    return '请选择外呼线路'
  }

  const hasPhone = outboundForm.value.manualPhone?.trim() || outboundForm.value.customerPhone
  if (!hasPhone) {
    return '请选择客户或手动输入电话号码'
  }

  return ''
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }

  // 清理搜索防抖定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }

  // 清理拖动事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 监听平台变化，重新加载SDK信息
watch(() => callConfigForm.mobileConfig.platform, async (newPlatform) => {
  // 重置SDK信息为默认值
  callConfigForm.mobileConfig.sdkInfo = {
    version: '1.0.0',
    fileSize: '未知',
    updateTime: '未知',
    supportedSystems: newPlatform === 'android' ? 'Android 5.0+' : 'iOS 12.0+',
    packageType: newPlatform === 'android' ? 'APK' : 'IPA'
  }

  // 重新加载SDK信息
  await loadSDKInfo()
  // 重新检查SDK状态
  await checkSDKStatus()
})
</script>

<style scoped>
.call-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 手机离线提示样式 */
.phone-offline-tip {
  margin-top: 12px;
}

/* 手机在线提示样式 */
.phone-online-tip {
  margin-top: 12px;
}

/* 二维码绑定弹窗样式 */
.qr-bind-content {
  text-align: center;
  padding: 20px 0;
}

.qr-code-wrapper {
  margin-bottom: 20px;
}

.qr-code-img {
  width: 200px;
  height: 200px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-status {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.qr-loading {
  padding: 40px 0;
  color: #999;
}

.qr-loading p {
  margin-top: 12px;
}

.qr-tips {
  text-align: left;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
}

.qr-tips p {
  margin: 8px 0;
  font-size: 13px;
  color: #666;
}

/* 统计卡片样式 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 筛选器样式 */
.filter-card {
  margin-bottom: 20px;
}

.filter-section {
  padding: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  min-width: 80px;
}

.filter-item .el-select {
  min-width: 160px;
  width: auto;
}

.filter-item .el-date-picker {
  min-width: 240px;
  width: auto;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 表格样式 */
.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
}

/* 详情弹窗样式 */
.customer-detail-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
}

.customer-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.customer-detail {
  padding: 0;
}

/* 客户头部信息 */
.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.customer-main-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.customer-avatar :deep(.el-avatar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 18px;
  font-weight: 500;
}

.customer-basic {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.customer-contact {
  display: flex;
  gap: 20px;
  color: #606266;
  font-size: 13px;
}

.customer-contact .contact-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.customer-contact .el-icon {
  font-size: 14px;
  color: #909399;
}

.customer-stats {
  display: flex;
  gap: 32px;
}

.customer-stats .stat-item {
  text-align: center;
  min-width: 60px;
}

.customer-stats .stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  line-height: 1.2;
}

.customer-stats .stat-value.last-call {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.customer-stats .stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 标签页区域 */
.tabs-section {
  padding: 0;
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #ebeef5;
}

.tabs-header .detail-tabs {
  flex: 1;
}

.tabs-header .detail-tabs :deep(.el-tabs__header) {
  margin: 0;
  border: none;
}

.tabs-header .detail-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.tabs-header .detail-tabs :deep(.el-tabs__item) {
  height: 48px;
  line-height: 48px;
  font-size: 14px;
  color: #606266;
}

.tabs-header .detail-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 500;
}

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表格内容区域 */
.tab-content {
  padding: 16px 24px 24px;
  min-height: 280px;
}

.tab-content :deep(.el-table) {
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.tab-content :deep(.el-table th.el-table__cell) {
  font-weight: 500;
}

.tab-content :deep(.el-table td.el-table__cell) {
  padding: 10px 0;
}

.tab-content :deep(.el-empty) {
  padding: 40px 0;
}

.tabs-section {
  background: #fff;
}

.tab-table .el-table {
  border-radius: 4px;
}

.tab-table .amount {
  color: #f56c6c;
  font-weight: 500;
}

.customer-info-card {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-item label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
  min-width: 80px;
}

.tabs-card {
  margin-top: 20px;
}

.tab-content {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .filter-row {
    flex-direction: column;
    gap: 16px;
  }

  .filter-item {
    width: 100%;
  }

  .search-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .call-management {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .stat-item {
    padding: 16px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .stat-value {
    font-size: 20px;
  }

  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .table-actions {
    justify-content: center;
  }

  .customer-detail {
    padding: 12px;
  }

  .tab-content {
    padding: 12px;
  }
}

/* 通话记录弹窗样式 */
.call-records-dialog {
  padding: 20px;
}

.dialog-filters {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.dialog-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.no-recording {
  color: #909399;
  font-size: 12px;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

/* 录音播放器样式 */
.recording-player {
  padding: 0;
}

.recording-info {
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.recording-info .info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recording-info .info-label {
  font-size: 12px;
  color: #909399;
}

.recording-info .info-value {
  font-size: 14px;
  color: #303133;
}

.audio-player {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

/* 快捷跟进弹窗样式 */
.quick-followup {
  padding: 20px;
}

.quick-followup .customer-info {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.quick-followup .customer-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.quick-followup .customer-info strong {
  color: #303133;
  font-weight: 600;
}

/* 操作区文字链接样式 */
.action-link {
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  margin-right: 12px;
  text-decoration: none;
  transition: color 0.3s ease;
}

.action-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.action-link:last-child {
  margin-right: 0;
}

/* 通话记录操作区样式 */
.call-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.call-actions .action-link {
  margin-right: 0;
}

.call-actions .no-recording {
  color: #909399;
  font-size: 12px;
}

/* 表格操作按钮样式优化 */
.el-table .el-button + .el-button {
  margin-left: 8px;
}

/* 标签样式优化 */
.el-tag {
  font-size: 12px;
}

/* 卡片阴影优化 */
.el-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
}

/* 翻页控件样式 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 0 20px;
}

.pagination-stats {
  flex: 1;
}

.stats-text {
  color: #606266;
  font-size: 14px;
  line-height: 32px;
}

.el-pagination {
  flex-shrink: 0;
}

.el-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 状态按钮样式 */
.status-button {
  margin-right: 12px;
  min-width: 80px;
  font-weight: 500;
}

.status-button.el-button--success {
  background-color: #67c23a;
  border-color: #67c23a;
}

.status-button.el-button--warning {
  background-color: #e6a23c;
  border-color: #e6a23c;
}

/* 呼入弹窗样式 */
.incoming-call {
  text-align: center;
  padding: 20px;
}

.caller-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  gap: 20px;
}

.caller-avatar {
  color: #409eff;
}

.caller-details {
  text-align: left;
}

.caller-details h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}

.phone-number {
  font-size: 16px;
  color: #606266;
  margin: 4px 0;
}

.customer-level {
  margin: 8px 0;
}

.last-call {
  font-size: 14px;
  color: #909399;
  margin: 4px 0;
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.answer-btn, .reject-btn {
  width: 120px;
  height: 50px;
  font-size: 16px;
  border-radius: 25px;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 通话浮动窗口样式 */
.call-floating-window {
  position: fixed;
  z-index: 9999;
  width: 420px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: width 0.3s ease, height 0.3s ease;
}

.call-floating-window.is-minimized {
  width: 280px;
}

.call-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #e6a23c;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-dot.is-connected {
  background: #67c23a;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.header-title {
  font-weight: 600;
  font-size: 14px;
}

.call-floating-window .header-actions {
  display: flex;
  gap: 4px;
}

.call-floating-window .header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.call-floating-window .header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 最小化状态内容 */
.call-minimized-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
}

.mini-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.mini-phone {
  font-size: 12px;
  color: #909399;
}

/* 展开状态内容 */
.call-window-content {
  padding: 20px;
  text-align: center;
}

.call-window-content .call-timer {
  margin-bottom: 16px;
}

.call-window-content .timer-display {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 6px;
  font-family: 'Courier New', monospace;
}

.call-window-content .call-status {
  font-size: 13px;
  color: #67c23a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.call-window-content .call-status .is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.call-window-content .caller-info-mini {
  margin-bottom: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f4ff 100%);
  border-radius: 10px;
  border: 1px solid #e4e7ed;
}

.call-window-content .caller-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.call-window-content .caller-phone {
  font-size: 14px;
  color: #606266;
  margin: 0 0 8px 0;
}

.call-window-content .call-method-info {
  margin-top: 6px;
}

.call-window-content .call-method-info .el-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.call-window-content .call-controls {
  margin-bottom: 16px;
}

.call-window-content .end-call-btn {
  width: 140px;
  height: 44px;
  font-size: 15px;
  border-radius: 22px;
  font-weight: 500;
}

.call-window-content .call-notes {
  margin-top: 12px;
  text-align: left;
}

.call-window-content .call-notes .notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.call-window-content .call-quick-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.call-window-content .call-quick-actions .el-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* SDK配置卡片样式 */
.sdk-config-card {
  margin: 20px 0;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.sdk-setup-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}

.step-item:hover {
  background: #f0f9ff;
  border-left-color: #67c23a;
}

.step-number {
  width: 32px;
  height: 32px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

.sdk-download-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sdk-status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

.download-btn {
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 500;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.permission-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.permission-item .el-icon {
  font-size: 18px;
  color: #909399;
  transition: color 0.3s ease;
}

.permission-item .el-icon.permission-granted {
  color: #67c23a;
}

.permission-item span {
  flex: 1;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.connection-test-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.connection-test-area .el-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

/* SDK使用说明样式 */
.sdk-usage-tips {
  margin-top: 20px;
  border-radius: 8px;
}

.sdk-usage-tips .el-alert__content p {
  margin: 8px 0;
  line-height: 1.6;
}

.sdk-usage-tips .el-alert__content p strong {
  color: #409eff;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-item {
    flex-direction: column;
    text-align: center;
  }

  .step-number {
    align-self: center;
  }

  .sdk-download-area,
  .connection-test-area {
    flex-direction: column;
    align-items: stretch;
  }

  .permission-grid {
    grid-template-columns: 1fr;
  }
}

/* 下拉选项通用样式 */
.select-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.option-content {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.option-title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-code {
  color: #409eff;
  font-size: 12px;
  margin-left: 6px;
  font-weight: normal;
}

.option-desc {
  color: #8492a6;
  font-size: 12px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-tag {
  flex-shrink: 0;
}

/* 详情弹窗标签页内容样式 */
.tab-content {
  margin-top: 16px;
}

.tab-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 外呼弹窗底部按钮样式 */
.dialog-footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}
</style>

<!-- 全局样式，用于下拉框弹出层 -->
<style>
.outbound-select-popper {
  min-width: 450px !important;
}

.outbound-select-popper .el-select-dropdown__item {
  height: auto;
  padding: 8px 12px;
  line-height: 1.4;
}
</style>
