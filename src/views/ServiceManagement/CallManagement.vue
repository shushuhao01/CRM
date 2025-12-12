<template>
  <div class="call-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>通话管理</h2>
      <div class="header-actions">
        <el-button
          :type="callStatus === 'ready' ? 'success' : 'warning'"
          :icon="callStatus === 'ready' ? 'Check' : 'Close'"
          @click="toggleCallStatus"
          class="status-button"
        >
          {{ callStatus === 'ready' ? '就绪' : '忙碌' }}
        </el-button>
        <el-button type="primary" :icon="Phone" @click="openOutboundDialog">
          发起外呼
        </el-button>
        <el-button type="info" :icon="Setting" @click="openCallConfigDialog">
          呼出配置
        </el-button>
        <el-button :icon="Refresh" @click="refreshData" :loading="refreshLoading">
          刷新数据
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
          <div class="filter-item">
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
    <el-dialog v-model="showOutboundDialog" title="发起外呼" width="600px">
      <el-form :model="outboundForm" :rules="outboundRules" ref="outboundFormRef" label-width="100px">
        <el-form-item label="外呼方式" prop="callMethod">
          <el-select
            v-model="outboundForm.callMethod"
            placeholder="请选择外呼方式"
            style="width: 100%"
            @change="onCallMethodChange"
          >
            <el-option label="网络电话" value="network_phone">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">网络电话</div>
                  <div style="color: #8492a6; font-size: 12px;">使用阿里云通信等第三方服务</div>
                </div>
                <el-tag size="small" type="success">推荐</el-tag>
              </div>
            </el-option>
            <el-option label="工作手机" value="work_phone">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">工作手机</div>
                  <div style="color: #8492a6; font-size: 12px;">使用绑定的工作手机拨打</div>
                </div>
                <el-tag size="small" type="info">录音</el-tag>
              </div>
            </el-option>
          </el-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            <span v-if="outboundForm.callMethod === 'network_phone'">
              网络电话支持自动录音，通话质量稳定
            </span>
            <span v-else-if="outboundForm.callMethod === 'work_phone'">
              工作手机需要预先绑定，支持系统级录音
            </span>
            <span v-else>
              请选择合适的外呼方式
            </span>
          </div>
        </el-form-item>

        <!-- 网络电话配置 -->
        <el-form-item
          v-if="outboundForm.callMethod === 'network_phone'"
          label="选择线路"
          prop="selectedLine"
        >
          <el-select
            v-model="outboundForm.selectedLine"
            placeholder="请选择外呼线路"
            style="width: 100%"
          >
            <el-option
              v-for="line in availableLines"
              :key="line.id"
              :label="line.name"
              :value="line.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">{{ line.name }}</div>
                  <div style="color: #8492a6; font-size: 12px;">{{ line.provider }} - {{ line.status }}</div>
                </div>
                <el-tag
                  size="small"
                  :type="line.status === '正常' ? 'success' : 'warning'"
                >
                  {{ line.status }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            <el-button type="text" size="small" @click="openLineConfig">
              <el-icon><Setting /></el-icon>
              配置外呼线路
            </el-button>
          </div>
        </el-form-item>

        <!-- 工作手机配置 -->
        <el-form-item
          v-if="outboundForm.callMethod === 'work_phone'"
          label="工作手机"
          prop="workPhone"
        >
          <el-select
            v-model="outboundForm.workPhone"
            placeholder="请选择工作手机"
            style="width: 100%"
          >
            <el-option
              v-for="phone in workPhones"
              :key="phone.id"
              :label="phone.number"
              :value="phone.id"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">{{ phone.number }}</div>
                  <div style="color: #8492a6; font-size: 12px;">{{ phone.brand }} {{ phone.model }}</div>
                </div>
                <el-tag
                  size="small"
                  :type="phone.status === '已绑定' ? 'success' : 'warning'"
                >
                  {{ phone.status }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            <el-button type="text" size="small" @click="openPhoneConfig">
              <el-icon><Setting /></el-icon>
              配置工作手机
            </el-button>
          </div>
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
            @change="onCustomerChange"
            @focus="() => { if (customerOptions.length === 0) searchCustomers() }"
            clearable
            no-data-text="暂无客户数据，请输入关键词搜索"
            no-match-text="未找到匹配的客户"
            loading-text="正在搜索客户..."
          >
            <el-option
              v-for="customer in customerOptions"
              :key="customer.id"
              :label="`${customer.name} (${customer.code || ''})`"
              :value="customer"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                  <div style="font-weight: 500;">{{ customer.name }}</div>
                  <div style="color: #8492a6; font-size: 12px; margin-top: 2px;">
                    {{ customer.company || '未填写公司' }}
                    <span v-if="customer.phone" style="margin-left: 8px;">{{ displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE) }}</span>
                  </div>
                </div>
                <span style="color: #409eff; font-size: 12px; font-weight: 500;">
                  {{ customer.code || '无编号' }}
                </span>
              </div>
            </el-option>
          </el-select>
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            支持按客户姓名、编号、电话号码或公司名称搜索
          </div>
        </el-form-item>

        <el-form-item label="选择号码" prop="customerPhone">
          <el-select
            v-model="outboundForm.customerPhone"
            placeholder="请选择号码"
            style="width: 100%"
            :disabled="!outboundForm.selectedCustomer"
          >
            <el-option
              v-for="phone in phoneOptions"
              :key="phone.phone"
              :label="`${phone.phone} (${phone.type})`"
              :value="phone.phone"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="手动输入号码">
          <el-input
            v-model="outboundForm.manualPhone"
            placeholder="或手动输入电话号码"
            @input="onManualPhoneInput"
          />
          <div style="color: #909399; font-size: 12px; margin-top: 4px;">
            手动输入号码将优先使用，不会同步客户信息
          </div>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="outboundForm.notes" type="textarea" :rows="3" placeholder="请输入通话备注" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="closeOutboundDialog">取消</el-button>
        <el-button type="primary" @click="startOutboundCall" :loading="outboundLoading">
          开始呼叫
        </el-button>
      </template>
    </el-dialog>

    <!-- 客户详情弹窗 -->
    <el-dialog
      v-model="showDetailDialog"
      :title="`客户详情 - ${currentCustomer?.customerName}`"
      width="80%"
      top="5vh"
    >
      <div v-if="currentCustomer" class="customer-detail">
        <!-- 客户基本信息 -->
        <el-card class="customer-info-card">
          <template #header>
            <span>客户基本信息</span>
          </template>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="info-item">
                <label>客户姓名：</label>
                <span>{{ currentCustomer.customerName }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <label>联系电话：</label>
                <span>{{ displaySensitiveInfoNew(currentCustomer.phone, SensitiveInfoType.PHONE) }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <label>客户等级：</label>
                <el-tag :type="getLevelType(currentCustomer.customerLevel)">
                  {{ getLevelText(currentCustomer.customerLevel) }}
                </el-tag>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <label>负责人：</label>
                <span>{{ currentCustomer.salesPerson }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <label>通话次数：</label>
                <span>{{ currentCustomer.callCount }} 次</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <label>最后通话：</label>
                <span>{{ currentCustomer.lastCallTime }}</span>
              </div>
            </el-col>
          </el-row>
        </el-card>

        <!-- 选项卡内容 -->
        <el-card class="tabs-card">
          <el-tabs v-model="activeTab" type="border-card">
            <!-- 订单记录 -->
            <el-tab-pane label="订单记录" name="orders">
              <div class="tab-content">
                <div class="tab-header">
                  <el-button type="primary" size="small" :icon="Plus">新建订单</el-button>
                </div>
                <el-table :data="mockOrderData" style="width: 100%">
                  <el-table-column prop="orderNo" label="订单号" width="150" />
                  <el-table-column prop="productName" label="商品名称" width="200" />
                  <el-table-column prop="amount" label="订单金额" width="120">
                    <template #default="{ row }">
                      ¥{{ row.amount }}
                    </template>
                  </el-table-column>
                  <el-table-column prop="status" label="订单状态" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getOrderStatusType(row.status)">
                        {{ getOrderStatusText(row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="下单时间" width="160" />
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button size="small" type="primary" @click="viewOrder(row)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <!-- 售后记录 -->
            <el-tab-pane label="售后记录" name="aftersales">
              <div class="tab-content">
                <div class="tab-header">
                  <el-button type="primary" size="small" :icon="Plus">新建售后</el-button>
                </div>
                <el-table :data="mockAftersalesData" style="width: 100%">
                  <el-table-column prop="ticketNo" label="工单号" width="150" />
                  <el-table-column prop="type" label="售后类型" width="100" />
                  <el-table-column prop="description" label="问题描述" min-width="200" show-overflow-tooltip />
                  <el-table-column prop="status" label="处理状态" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getAftersalesStatusType(row.status)">
                        {{ getAftersalesStatusText(row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="createTime" label="创建时间" width="160" />
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button size="small" type="primary" @click="viewAftersales(row)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <!-- 通话记录 -->
            <el-tab-pane label="通话记录" name="calls">
              <div class="tab-content">
                <div class="tab-header">
                  <el-button type="primary" size="small" :icon="Phone">发起外呼</el-button>
                </div>
                <el-table :data="mockCallData" style="width: 100%">
                  <el-table-column prop="callType" label="呼叫类型" width="100">
                    <template #default="{ row }">
                      <el-tag :type="row.callType === 'outbound' ? 'primary' : 'success'">
                        {{ row.callType === 'outbound' ? '外呼' : '来电' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="duration" label="通话时长" width="100" />
                  <el-table-column prop="status" label="通话状态" width="100">
                    <template #default="{ row }">
                      <el-tag :type="getStatusType(row.status)">
                        {{ getStatusText(row.status) }}
                      </el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="startTime" label="开始时间" width="160" />
                  <el-table-column prop="operator" label="操作人员" width="100" />
                  <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
                  <el-table-column label="操作" width="200">
                    <template #default="{ row }">
                      <div class="call-actions">
                        <span class="action-link" @click="viewCallDetail(row)">详情</span>
                        <span v-if="row.recordingUrl" class="action-link" @click="playRecording(row)">播放录音</span>
                        <span v-if="row.recordingUrl" class="action-link" @click="downloadRecording(row)">下载录音</span>
                        <span v-else class="no-recording">无录音</span>
                      </div>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>

            <!-- 跟进记录 -->
            <el-tab-pane label="跟进记录" name="followups">
              <div class="tab-content">
                <div class="tab-header">
                  <el-button type="primary" size="small" :icon="EditPen" @click="openFollowupDialog">新建跟进</el-button>
                </div>
                <el-table :data="mockFollowupData" style="width: 100%">
                  <el-table-column prop="type" label="跟进类型" width="100" />
                  <el-table-column prop="content" label="跟进内容" min-width="200" show-overflow-tooltip />
                  <el-table-column prop="nextPlan" label="下次计划" width="160" />
                  <el-table-column prop="operator" label="跟进人" width="100" />
                  <el-table-column prop="createTime" label="跟进时间" width="160" />
                  <el-table-column label="操作" width="120">
                    <template #default="{ row }">
                      <el-button size="small" type="primary" @click="viewFollowup(row)">查看</el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
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
        <el-table :data="callRecordsList" style="width: 100%" v-loading="callRecordsLoading">
          <el-table-column prop="customerName" label="客户姓名" width="120" />
          <el-table-column prop="customerPhone" label="客户电话" width="140" />
          <el-table-column prop="callType" label="通话类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.callType === 'outbound' ? 'primary' : 'success'">
                {{ row.callType === 'outbound' ? '外呼' : '来电' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="通话时长" width="100" />
          <el-table-column prop="status" label="通话状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="startTime" label="开始时间" width="160" />
          <el-table-column prop="operator" label="操作人员" width="100" />
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column label="录音操作" width="160">
            <template #default="{ row }">
              <div v-if="row.recordingUrl">
                <el-button size="small" type="primary" @click="playRecording(row)" :icon="VideoPlay">
                  播放
                </el-button>
                <el-button size="small" type="success" @click="downloadRecording(row)" :icon="Download">
                  下载
                </el-button>
              </div>
              <span v-else class="no-recording">无录音</span>
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
      width="600px"
      :before-close="stopRecording"
    >
      <div class="recording-player">
        <div class="recording-info">
          <p><strong>客户：</strong>{{ currentRecording?.customerName }}</p>
          <p><strong>电话：</strong>{{ currentRecording?.customerPhone }}</p>
          <p><strong>时间：</strong>{{ currentRecording?.startTime }}</p>
          <p><strong>时长：</strong>{{ currentRecording?.duration }}</p>
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

    <!-- 通话中弹窗 -->
    <el-dialog
      v-model="callInProgressVisible"
      title="通话中"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
      center
    >
      <div class="call-in-progress" v-if="currentCallData">
        <div class="call-timer">
          <div class="timer-display">{{ formatCallDuration(callDuration) }}</div>
          <div class="call-status">通话中...</div>
        </div>

        <div class="caller-info-mini">
          <p class="caller-name">{{ currentCallData.customerName || '未知客户' }}</p>
          <p class="caller-phone">{{ displaySensitiveInfoNew(currentCallData.phone, SensitiveInfoType.PHONE) }}</p>
        </div>

        <div class="call-controls">
          <el-button
            type="danger"
            size="large"
            :icon="TurnOff"
            @click="endCall"
            class="end-call-btn"
          >
            结束通话
          </el-button>
        </div>

        <div class="call-notes">
          <el-input
            v-model="callNotes"
            type="textarea"
            :rows="3"
            placeholder="通话备注..."
            maxlength="200"
            show-word-limit
          />
        </div>
      </div>
    </el-dialog>

    <!-- 呼出配置弹窗 -->
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
                        <el-icon :style="{ color: device.status === 'online' ? '#67c23a' : '#909399' }">
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
                        <el-tag :type="device.status === 'online' ? 'success' : 'info'" size="small">
                          {{ device.status === 'online' ? '在线' : '离线' }}
                        </el-tag>
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
import { useRouter } from 'vue-router'
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
  InfoFilled
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { formatDateTime } from '@/utils/dateFormat'

const router = useRouter()
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
const callDuration = ref(0)
const callNotes = ref('')
const callTimer = ref(null)

// 呼出配置相关
const callConfigDialogVisible = ref(false)
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
const outboundList = ref([
  {
    id: 1,
    customerName: '张三',
    phone: '13800138001',
    company: '北京科技有限公司',
    customerLevel: 'gold',
    lastCallTime: '2024-01-15 14:30:00',
    callCount: 5,
    status: 'pending',
    salesPerson: '李销售',
    remark: '意向客户，需要跟进产品A'
  },
  {
    id: 2,
    customerName: '李四',
    phone: '13800138002',
    company: '上海贸易集团',
    customerLevel: 'silver',
    lastCallTime: '2024-01-14 16:20:00',
    callCount: 3,
    status: 'connected',
    salesPerson: '王销售',
    remark: '已下单，需要确认发货时间'
  },
  {
    id: 3,
    customerName: '王五',
    phone: '13800138003',
    company: '深圳制造企业',
    customerLevel: 'normal',
    lastCallTime: '2024-01-13 10:15:00',
    callCount: 2,
    status: 'no_answer',
    salesPerson: '张销售',
    remark: '多次未接听，建议更换联系时间'
  }
])

const outboundForm = ref({
  callMethod: 'network', // 外呼方式：network(网络电话) | mobile(工作手机)
  networkConfig: {
    lineId: '', // 选择的线路ID
    audioQuality: 'standard' // 音质选择
  },
  mobileConfig: {
    phoneNumber: '', // 工作手机号码
    enableRecording: true // 是否启用录音
  },
  selectedCustomer: null,
  customerPhone: '', // 从客户选择的号码
  manualPhone: '', // 手动输入的号码
  customerId: '',
  notes: ''
})

// 客户选择相关
const customerOptions = ref([])
const phoneOptions = ref([])

// 网络电话线路选择数据
const networkLines = ref([
  { id: 'line001', name: '阿里云线路1', provider: 'aliyun', status: 'active', quality: '高清' },
  { id: 'line002', name: '阿里云线路2', provider: 'aliyun', status: 'active', quality: '标准' },
  { id: 'line003', name: '腾讯云线路1', provider: 'tencent', status: 'active', quality: '高清' },
  { id: 'line004', name: '华为云线路1', provider: 'huawei', status: 'maintenance', quality: '高清' }
])

// 工作手机配置数据
const workPhones = ref([
  { id: 'phone001', number: '13800138001', name: '销售专线1', status: 'active', owner: '张三' },
  { id: 'phone002', number: '13800138002', name: '销售专线2', status: 'active', owner: '李四' },
  { id: 'phone003', number: '13800138003', name: '客服专线1', status: 'busy', owner: '王五' }
])

const outboundRules = {
  customerPhone: [
    { required: true, message: '请输入客户电话号码', trigger: 'blur' },
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
  pageSize: 20,
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
  remark: ''
})

const quickFollowUpRules = {
  type: [
    { required: true, message: '请选择跟进类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' },
    { min: 10, message: '跟进内容至少10个字符', trigger: 'blur' }
  ],
  intention: [
    { required: true, message: '请选择客户意向', trigger: 'change' }
  ]
}

// 模拟数据
const mockOrderData = ref([
  {
    orderNo: 'ORD202401150001',
    productName: '产品A',
    amount: 2897,
    status: 'pending',
    createTime: '2024-01-15 14:30:00'
  },
  {
    orderNo: 'ORD202401140002',
    productName: '产品B',
    amount: 1749,
    status: 'completed',
    createTime: '2024-01-14 16:20:00'
  }
])

const mockAftersalesData = ref([
  {
    ticketNo: 'AS202401150001',
    type: '退货',
    description: '产品质量问题，客户要求退货',
    status: 'processing',
    createTime: '2024-01-15 10:30:00'
  }
])

const mockCallData = ref([
  {
    callType: 'outbound',
    duration: '5分30秒',
    status: 'connected',
    startTime: '2024-01-15 14:30:00',
    operator: '李销售',
    remark: '客户对产品A很感兴趣',
    recordingUrl: '/recordings/call_20240115_143000.mp3'
  },
  {
    callType: 'inbound',
    duration: '3分15秒',
    status: 'connected',
    startTime: '2024-01-14 16:20:00',
    operator: '王销售',
    remark: '客户咨询发货时间',
    recordingUrl: '/recordings/call_20240114_162000.mp3'
  },
  {
    callType: 'outbound',
    duration: '1分45秒',
    status: 'no_answer',
    startTime: '2024-01-13 10:15:00',
    operator: '张销售',
    remark: '客户未接听',
    recordingUrl: null
  }
])

const mockFollowupData = ref([
  {
    type: '电话跟进',
    content: '客户对产品A很感兴趣，需要进一步了解技术参数',
    nextPlan: '2024-01-16 14:00:00',
    operator: '李销售',
    createTime: '2024-01-15 14:35:00'
  }
])

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

  // 如果客户有完整的地址信息，组合成收货地址
  if (customer.province || customer.city || customer.district || customer.street || customer.detailAddress) {
    const addressParts = [
      customer.province,
      customer.city,
      customer.district,
      customer.street,
      customer.detailAddress
    ].filter(Boolean)

    if (addressParts.length > 0) {
      return addressParts.join(' ')
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
const toggleCallStatus = () => {
  callStatus.value = callStatus.value === 'ready' ? 'busy' : 'ready'
  const statusText = callStatus.value === 'ready' ? '就绪' : '忙碌'
  ElMessage.success(`状态已切换为：${statusText}`)
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

    // 从客户store获取归属于当前用户的客户数据
    await customerStore.loadCustomers()
    const allCustomers = customerStore.customers
    const currentUserId = userStore.currentUser?.id

    // 筛选归属于当前用户的客户
    const userCustomers = allCustomers.filter(customer =>
      customer.salesPersonId === currentUserId || customer.createdBy === currentUserId
    )

    // 转换为呼出列表格式
    const convertedList = userCustomers.map(customer => ({
      id: customer.id,
      customerName: customer.name,
      phone: customer.phone, // 修正字段名称，与表格显示一致
      customerPhone: customer.phone, // 保留原字段名，用于其他地方
      company: customer.company || '未填写',
      customerLevel: customer.level,
      lastCallTime: customer.lastServiceDate || '暂无记录',
      callCount: 0, // 可以后续从通话记录中统计
      status: 'pending', // 默认待呼叫状态
      salesPerson: userStore.currentUser?.name || '当前用户',
      remark: customer.remarks || '',
      // 添加完整的地址信息
      address: customer.address || '',
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      street: customer.street || '',
      detailAddress: customer.detailAddress || ''
    }))

    // 更新呼出列表数据
    outboundList.value = convertedList
    pagination.total = convertedList.length

  } catch (error) {
    console.error('加载呼出列表失败:', error)
    ElMessage.error('加载呼出列表失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = async () => {
  try {
    loading.value = true

    // 从客户store获取归属于当前用户的客户数据
    await customerStore.loadCustomers()
    const allCustomers = customerStore.customers
    const currentUserId = userStore.currentUser?.id

    // 筛选归属于当前用户的客户
    let userCustomers = allCustomers.filter(customer =>
      customer.salesPersonId === currentUserId || customer.createdBy === currentUserId
    )

    // 应用搜索关键词筛选
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase()
      userCustomers = userCustomers.filter(customer =>
        customer.name.toLowerCase().includes(keyword) ||
        customer.phone.includes(keyword) ||
        (customer.company && customer.company.toLowerCase().includes(keyword))
      )
    }

    // 应用其他筛选条件
    if (filterForm.customerLevel) {
      userCustomers = userCustomers.filter(customer => customer.level === filterForm.customerLevel)
    }

    if (filterForm.status) {
      // 根据客户状态筛选
      userCustomers = userCustomers.filter(customer => customer.status === filterForm.status)
    }

    // 转换为呼出列表格式
    const convertedList = userCustomers.map(customer => ({
      id: customer.id,
      customerName: customer.name,
      phone: customer.phone, // 修正字段名称，与表格显示一致
      customerPhone: customer.phone, // 保留原字段名，用于其他地方
      company: customer.company || '未填写',
      customerLevel: customer.level,
      lastCallTime: customer.lastServiceDate || '暂无记录',
      callCount: 0,
      status: 'pending',
      salesPerson: userStore.currentUser?.name || '当前用户',
      remark: customer.remarks || '',
      // 添加完整的地址信息
      address: customer.address || '',
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      street: customer.street || '',
      detailAddress: customer.detailAddress || ''
    }))

    // 更新呼出列表数据
    outboundList.value = convertedList
    pagination.total = convertedList.length

  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败')
  } finally {
    loading.value = false
  }
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
    // 使用callStore的API获取通话记录
    await callStore.fetchCallRecords({
      page: callRecordsPagination.currentPage,
      pageSize: callRecordsPagination.pageSize,
      keyword: callRecordsFilter.customerKeyword || undefined,
      startDate: callRecordsFilter.dateRange?.[0] || undefined,
      endDate: callRecordsFilter.dateRange?.[1] || undefined
    })

    // 从store获取数据并转换格式
    callRecordsList.value = callStore.callRecords.map(record => ({
      id: record.id,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      callType: record.callType,
      duration: formatCallDuration(record.duration),
      status: record.callStatus,
      startTime: record.createdAt,
      operator: record.operatorName || '系统',
      remark: record.notes || '',
      recordingUrl: record.recordingUrl || null
    }))
    callRecordsPagination.total = callStore.pagination.total
  } catch (error) {
    console.error('加载通话记录失败:', error)
    ElMessage.error('加载通话记录失败')
  } finally {
    callRecordsLoading.value = false
  }
}

// 格式化通话时长
const formatCallDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '00:00:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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
  currentRecording.value = record
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
    remark: ''
  })
  quickFollowUpFormRef.value?.clearValidate()
}

const submitQuickFollowUp = async () => {
  if (!quickFollowUpFormRef.value) return

  try {
    await quickFollowUpFormRef.value.validate()
    quickFollowUpSubmitting.value = true

    // 准备跟进记录数据
    const followUpData: Omit<FollowUpRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      callId: '', // 如果有关联的通话记录ID，可以在这里设置
      customerId: currentCustomer.value.id,
      customerName: currentCustomer.value.name,
      followUpType: quickFollowUpForm.type as 'call' | 'visit' | 'email' | 'message',
      content: quickFollowUpForm.content,
      nextFollowUpDate: quickFollowUpForm.nextFollowTime || undefined,
      priority: 'medium', // 默认中等优先级
      status: 'pending', // 默认待跟进状态
      userId: userStore.currentUser?.id || '1',
      userName: userStore.currentUser?.name || '当前用户'
    }

    // 调用API创建跟进记录
    await callStore.createFollowUp(followUpData)

    ElMessage.success('跟进记录保存成功')
    quickFollowUpVisible.value = false
    resetQuickFollowUpForm()

    // 刷新相关页面数据
    loadOutboundList()

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

const handleExport = () => {
  ElMessage.info('导出数据功能开发中...')
}

const handleCall = (row: any) => {
  ElMessage.success(`正在外呼客户：${row.customerName}`)
}

const handleViewDetail = (row: any) => {
  currentCustomer.value = row
  showDetailDialog.value = true
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

const handleCreateOrder = (row: any) => {
  // 跳转到新增订单页面，并传递客户信息
  safeNavigator.push({
    name: 'OrderAdd',
    query: {
      customerId: row.id,
      customerName: row.customerName,
      customerPhone: row.phone,
      customerCompany: row.company || '',
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

    // 筛选归属于当前用户的客户
    let filteredCustomers = allCustomers.filter(customer => {
      return customer.salesPersonId === currentUserId || customer.createdBy === currentUserId
    })

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
    callMethod: 'network', // 外呼方式：network(网络电话) | mobile(工作手机)
    networkConfig: {
      lineId: '', // 选择的线路ID
      audioQuality: 'standard' // 音质选择
    },
    mobileConfig: {
      phoneNumber: '', // 工作手机号码
      enableRecording: true // 是否启用录音
    },
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

    outboundLoading.value = true

    // 根据是否有客户选择来决定传递的参数
    const callParams = {
      customerPhone: phoneToCall,
      notes: outboundForm.value.notes,
      callMethod: outboundForm.value.callMethod,
      callConfig: outboundForm.value.callMethod === 'network'
        ? outboundForm.value.networkConfig
        : outboundForm.value.mobileConfig
    }

    // 只有在选择了客户且没有手动输入号码时，才传递客户ID
    if (outboundForm.value.selectedCustomer && !outboundForm.value.manualPhone) {
      callParams.customerId = outboundForm.value.customerId || ''
    }

    await callStore.makeOutboundCall(callParams)

    closeOutboundDialog()
    ElMessage.success('外呼已发起')

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
    outboundForm.value = { customerPhone: '', customerId: '', notes: '' }

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
    await saveCallRecord()
    ElMessage.success('通话已结束，记录已保存')
  } catch (error) {
    console.error('保存通话记录失败:', error)
    ElMessage.error('保存通话记录失败')
  }

  // 关闭通话中弹窗
  callInProgressVisible.value = false
  currentCallData.value = null
  callDuration.value = 0
  callNotes.value = ''
}

const startCallTimer = () => {
  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
}

const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

const saveCallRecord = async () => {
  if (!currentCallData.value) return

  const callRecord = {
    customerId: currentCallData.value.id || '',
    customerName: currentCallData.value.customerName || '未知客户',
    phone: currentCallData.value.phone,
    direction: 'incoming',
    duration: callDuration.value,
    status: 'completed',
    notes: callNotes.value,
    startTime: new Date(Date.now() - callDuration.value * 1000).toISOString(),
    endTime: new Date().toISOString()
  }

  // 这里应该调用API保存通话记录
  await callStore.saveCallRecord(callRecord)

  // 刷新数据
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
  // 处理不同的数据结构
  const callId = record.id || record.callId
  const customerId = record.customerId || record.customer_id

  if (callId) {
    // 跳转到通话详情页面或显示详情对话框
    safeNavigator.push(`/service-management/call/records?callId=${callId}`)
  } else {
    // 如果没有ID，显示提示信息
    ElMessage.info(`查看通话详情`)
  }
}

const createFollowUp = (record: CallRecord) => {
  // 跳转到创建跟进记录页面
  safeNavigator.push(`/service-management/call/followup?callId=${record.id}&customerId=${record.customerId}`)
}

// 详情弹窗相关方法
const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return statusMap[status] || 'info'
}

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || '未知'
}

const getAftersalesStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'rejected': 'danger'
  }
  return statusMap[status] || 'info'
}

const getAftersalesStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'rejected': '已拒绝'
  }
  return statusMap[status] || '未知'
}

const viewOrder = (row: any) => {
  ElMessage.info(`查看订单：${row.orderNo}`)
}

const viewAftersales = (row: any) => {
  ElMessage.info(`查看售后工单：${row.ticketNo}`)
}

const viewFollowup = (row: any) => {
  ElMessage.info(`查看跟进记录`)
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
  return userStore.users
    .filter((u: any) => {
      // 检查用户是否启用（禁用用户不显示）
      const isEnabled = !u.status || u.status === 'active'
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role)
      return isEnabled && hasValidRole
    })
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username
    }))
})

// 生命周期
onMounted(async () => {
  try {
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
  } catch (error) {
    console.error('加载数据失败:', error)
  }
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
.customer-detail {
  padding: 20px;
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

/* 录音播放器样式 */
.recording-player {
  padding: 20px;
}

.recording-info {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.recording-info p {
  margin: 8px 0;
  font-size: 14px;
}

.audio-player {
  text-align: center;
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

/* 通话中弹窗样式 */
.call-in-progress {
  text-align: center;
  padding: 20px;
}

.call-timer {
  margin-bottom: 20px;
}

.timer-display {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.call-status {
  font-size: 14px;
  color: #909399;
}

.caller-info-mini {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.caller-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px 0;
}

.caller-phone {
  font-size: 14px;
  color: #606266;
  margin: 0;
}

.call-controls {
  margin-bottom: 20px;
}

.end-call-btn {
  width: 140px;
  height: 50px;
  font-size: 16px;
  border-radius: 25px;
}

.call-notes {
  margin-top: 20px;
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
</style>
