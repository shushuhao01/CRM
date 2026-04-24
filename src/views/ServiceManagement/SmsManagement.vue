<template>
  <div class="sms-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">短信管理</h2>
        <p class="page-description">管理短信模板和发送记录，查看短信发送统计</p>
      </div>
      <div class="header-actions">
        <!-- v1.8.0 改造：注释掉原模板管理和创建模板按钮 -->
        <!-- <el-button type="info" @click="handleTemplateManagement">
          <el-icon><Setting /></el-icon>
          模板管理
        </el-button>
        <el-button type="primary" @click="handleCreateTemplate">
          <el-icon><Plus /></el-icon>
          创建短信模板
        </el-button> -->
        <!-- 新增：查看模板 和 申请模板 按钮 -->
        <el-button type="info" @click="handleViewTemplates">
          <el-icon><Collection /></el-icon>
          查看模板
        </el-button>
        <el-button type="primary" @click="handleApplyTemplate">
          <el-icon><EditPen /></el-icon>
          申请模板
        </el-button>
        <el-button type="success" @click="handleSendSms">
          <el-icon><Message /></el-icon>
          发送短信
        </el-button>
        <el-button type="warning" @click="showQuotaDialog = true">
          <el-icon><Coin /></el-icon>
          短信额度
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <!-- 管理员看待审核模板数 -->
        <el-col :span="6" v-if="userStore.isAdmin">
          <el-card class="stat-card pending">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pendingTemplates }}</div>
                <div class="stat-label">待审核模板</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <!-- 管理员看待审核短信数 -->
        <el-col :span="6" v-if="userStore.isAdmin">
          <el-card class="stat-card sms">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Message /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pendingSms }}</div>
                <div class="stat-label">待审核短信</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <!-- 非管理员看我的申请数和审核通过数 -->
        <el-col :span="6" v-if="!userStore.isAdmin">
          <el-card class="stat-card pending">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><EditPen /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.myPendingCount || 0 }}</div>
                <div class="stat-label">我的待审核</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6" v-if="!userStore.isAdmin">
          <el-card class="stat-card sms">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.myApprovedCount || 0 }}</div>
                <div class="stat-label">已通过申请</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card today">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.todaySent }}</div>
                <div class="stat-label">{{ userStore.isAdmin ? '今日发送' : '我的今日发送' }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card total">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.totalSent }}</div>
                <div class="stat-label">{{ userStore.isAdmin ? '总发送量' : '我的总发送' }}</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <el-card class="main-content">
      <el-tabs v-model="activeTab" class="sms-tabs">
        <!-- v1.8.0 改造：注释掉模板审核Tab（审核权上收到管理后台） -->
        <!-- 模板审核 Tab 已移至管理后台 sms-management/template-review -->

        <!-- 短信审核 - 仅管理员可见 -->
        <el-tab-pane v-if="userStore.isAdmin" name="sms">
          <template #label>
            <span class="tab-label">
              短信审核
              <el-badge :value="pendingSmsCount" :hidden="pendingSmsCount === 0" />
            </span>
          </template>

          <!-- 子标签页：待审核和审核通过 -->
          <el-tabs v-model="smsSubTab" type="card" class="sub-tabs">
            <el-tab-pane label="待审核" name="pending">
              <div class="tab-header">
                <div class="tab-actions">
                  <el-input
                    v-model="smsSearch"
                    placeholder="搜索短信内容、申请人、客户名字号码"
                    :prefix-icon="Search"
                    clearable
                    style="width: 340px"
                    @keyup.enter="handlePendingSmsSearch"
                  />
                  <el-button type="primary" @click="handlePendingSmsSearch" style="margin-left: 8px">搜索</el-button>
                </div>
              </div>

              <div class="sms-list" v-loading="loadingSms">
                <div
                  v-for="sms in pendingSms"
                  :key="sms.id"
                  class="sms-item"
                >
                  <div class="sms-info">
                    <div class="sms-header">
                      <h4 class="sms-title">{{ sms.templateName }}</h4>
                      <div class="sms-meta">
                        <el-tag size="small" type="warning">待审核</el-tag>
                        <span class="apply-time">{{ formatTime(sms.createdAt) }}</span>
                      </div>
                    </div>

                    <div class="sms-content">
                      <p class="content-text">{{ sms.content }}</p>
                      <div class="recipients">
                        <span class="recipients-label">发送对象：</span>
                        <span class="recipients-count">{{ sms.recipients?.length || 0 }} 人</span>
                      </div>
                    </div>

                    <div class="applicant-info">
                      <span class="applicant-label">申请人：</span>
                      <span class="applicant-name">{{ sms.applicantName }}</span>
                      <span class="applicant-dept">{{ sms.applicantDept }}</span>
                    </div>
                  </div>

                  <div class="sms-actions">
                    <el-button
                      type="success"
                      :icon="Check"
                      @click="handleApproveSms(sms)"
                      class="approve-btn"
                    >
                      通过
                    </el-button>
                    <el-button
                      type="danger"
                      :icon="Close"
                      @click="handleRejectSms(sms)"
                      class="reject-btn"
                    >
                      拒绝
                    </el-button>
                    <el-button
                      type="info"
                      :icon="View"
                      @click="handlePreviewSms(sms)"
                      class="preview-btn"
                    >
                      详情
                    </el-button>
                  </div>
                </div>

                <el-empty
                  v-if="pendingSms.length === 0 && !loadingSms"
                  description="暂无待审核短信"
                  :image-size="120"
                />
              </div>

              <div class="record-pagination">
                <el-pagination
                  v-model:current-page="pendingSmsPage"
                  v-model:page-size="pendingSmsPageSize"
                  :total="pendingSmsTotal"
                  :page-sizes="[10, 20, 50]"
                  layout="total, sizes, prev, pager, next"
                  @size-change="loadPendingSms"
                  @current-change="loadPendingSms"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane label="审核通过" name="approved">
              <div class="tab-header">
                <div class="tab-actions">
                  <el-input
                    v-model="approvedSmsSearch"
                    placeholder="搜索已通过短信内容、客户名字号码"
                    :prefix-icon="Search"
                    clearable
                    style="width: 340px"
                    @keyup.enter="handleApprovedSmsSearch"
                  />
                  <el-button type="primary" @click="handleApprovedSmsSearch" style="margin-left: 8px">搜索</el-button>
                </div>
              </div>

              <div class="sms-list" v-loading="loadingApprovedSms">
                <div
                  v-for="sms in approvedSms"
                  :key="sms.id"
                  class="sms-item approved"
                >
                  <div class="sms-info">
                    <div class="sms-header">
                      <h4 class="sms-title">{{ sms.templateName }}</h4>
                      <div class="sms-meta">
                        <el-tag size="small" type="success">已通过</el-tag>
                        <span class="approve-time">{{ formatTime(sms.approvedAt) }}</span>
                      </div>
                    </div>

                    <div class="sms-content">
                      <p class="content-text">{{ sms.content }}</p>
                      <div class="recipients">
                        <span class="recipients-label">发送对象：</span>
                        <span class="recipients-count">{{ sms.recipients?.length || 0 }} 人</span>
                      </div>
                    </div>

                    <div class="approval-info">
                      <span class="approval-label">审核人：</span>
                      <span class="approval-name">{{ sms.approvedBy }}</span>
                      <span class="approval-time">{{ formatTime(sms.approvedAt) }}</span>
                    </div>
                  </div>

                  <div class="sms-actions">
                    <el-button
                      type="primary"
                      :icon="View"
                      @click="handlePreviewSms(sms)"
                      size="small"
                    >
                      查看
                    </el-button>
                  </div>
                </div>

                <el-empty
                  v-if="approvedSms.length === 0 && !loadingApprovedSms"
                  description="暂无已通过短信"
                  :image-size="120"
                />
              </div>

              <div class="record-pagination">
                <el-pagination
                  v-model:current-page="approvedSmsPage"
                  v-model:page-size="approvedSmsPageSize"
                  :total="approvedSmsTotal"
                  :page-sizes="[10, 20, 50]"
                  layout="total, sizes, prev, pager, next"
                  @size-change="loadApprovedSms"
                  @current-change="loadApprovedSms"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>

        <!-- 发送记录 -->
        <el-tab-pane label="发送记录" name="records">
          <div class="tab-header">
            <div class="tab-actions">
              <el-date-picker
                v-model="recordDateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="margin-right: 10px"
                @change="handleRecordSearch"
              />
              <el-input
                v-model="recordSearch"
                placeholder="搜索模板、内容、发送人、客户名字号码"
                :prefix-icon="Search"
                clearable
                style="width: 340px"
                @keyup.enter="handleRecordSearch"
              />
              <el-button type="primary" @click="handleRecordSearch" style="margin-left: 8px">搜索</el-button>
            </div>
          </div>

          <el-table :data="sendRecords" v-loading="loadingRecords">
            <el-table-column prop="templateName" label="模板名称" />
            <el-table-column prop="content" label="短信内容" show-overflow-tooltip />
            <el-table-column prop="recipientCount" label="发送数量" width="100" />
            <el-table-column prop="successCount" label="成功数量" width="100" />
            <el-table-column prop="failCount" label="失败数量" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sentAt" label="发送时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.sentAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="handleViewRecord(row)">
                  查看详情
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="record-pagination">
            <el-pagination
              v-model:current-page="recordPage"
              v-model:page-size="recordPageSize"
              :total="recordTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadSendRecords"
              @current-change="loadSendRecords"
            />
          </div>
        </el-tab-pane>

        <!-- 审核记录 - 非管理员可查看自己的申请审核状态 -->
        <el-tab-pane v-if="!userStore.isAdmin" label="审核记录" name="approvalRecords">
          <div class="tab-header">
            <div class="tab-actions">
              <el-input
                v-model="approvalSearch"
                placeholder="搜索模板名称、内容、发送人"
                :prefix-icon="Search"
                clearable
                style="width: 340px"
                @keyup.enter="handleApprovalSearch"
              />
              <el-button type="primary" @click="handleApprovalSearch" style="margin-left: 8px">搜索</el-button>
            </div>
          </div>

          <div class="sms-list" v-loading="loadingApprovals">
            <div
              v-for="item in approvalRecords"
              :key="item.id"
              class="sms-item"
              :class="{ approved: item.status === 'completed' || item.status === 'approved' }"
            >
              <div class="sms-info">
                <div class="sms-header">
                  <h4 class="sms-title">{{ item.templateName }}</h4>
                  <div class="sms-meta">
                    <el-tag
                      size="small"
                      :type="item.status === 'completed' || item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : 'warning'"
                    >
                      {{ item.status === 'completed' || item.status === 'approved' ? '已通过' : item.status === 'rejected' ? '已拒绝' : '待审核' }}
                    </el-tag>
                    <span class="apply-time">{{ formatTime(item.createdAt) }}</span>
                  </div>
                </div>
                <div class="sms-content">
                  <p class="content-text">{{ item.content }}</p>
                  <div class="recipients">
                    <span class="recipients-label">发送对象：</span>
                    <span class="recipients-count">{{ item.recipientCount || 0 }} 人</span>
                  </div>
                </div>
                <div v-if="item.approvedBy" class="approval-info">
                  <span class="approval-label">审核人：</span>
                  <span class="approval-name">{{ item.approvedBy }}</span>
                  <span class="approval-time">{{ formatTime(item.approvedAt) }}</span>
                </div>
              </div>
              <div class="sms-actions">
                <el-button type="info" :icon="View" @click="handlePreviewSms(item)" size="small">详情</el-button>
              </div>
            </div>

            <el-empty
              v-if="approvalRecords.length === 0 && !loadingApprovals"
              description="暂无审核记录"
              :image-size="120"
            />
          </div>

          <div class="record-pagination">
            <el-pagination
              v-model:current-page="approvalPage"
              v-model:page-size="approvalPageSize"
              :total="approvalTotal"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="loadApprovalRecords"
              @current-change="loadApprovalRecords"
            />
          </div>
        </el-tab-pane>

        <!-- 自动发送规则 - 仅管理员可见 -->
        <el-tab-pane v-if="userStore.isAdmin" label="自动发送" name="autoSend">
          <div class="tab-header">
            <div class="tab-actions">
              <el-button type="primary" @click="showAutoSendDialog = true">
                <el-icon><Plus /></el-icon>
                新建规则
              </el-button>
              <el-input
                v-model="autoSendSearch"
                placeholder="搜索规则名称"
                :prefix-icon="Search"
                clearable
                style="width: 260px; margin-left: 12px"
              />
            </div>
          </div>

          <el-table :data="filteredAutoSendRules" v-loading="loadingAutoSend" style="width: 100%">
            <el-table-column prop="name" label="规则名称" min-width="140" />
            <el-table-column prop="templateName" label="关联模板" min-width="120" />
            <el-table-column prop="triggerEvent" label="触发事件" width="130">
              <template #default="{ row }">
                <el-tag size="small" type="info">{{ getTriggerEventLabel(row.triggerEvent) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间范围" width="160">
              <template #default="{ row }">
                <span v-if="row.timeRangeConfig?.sendImmediately">立即发送</span>
                <span v-else-if="row.timeRangeConfig?.startHour != null">
                  {{ row.timeRangeConfig.startHour }}:00 - {{ row.timeRangeConfig.endHour }}:00
                  <span v-if="row.timeRangeConfig.workdaysOnly" style="color:#e6a23c"> (工作日)</span>
                </span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="统计" width="120">
              <template #default="{ row }">
                <span style="color:#67c23a">成功 {{ row.statsSentCount || 0 }}</span> /
                <span style="color:#f56c6c">失败 {{ row.statsFailCount || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-switch
                  :model-value="row.enabled === 1"
                  @change="handleToggleAutoSendRule(row)"
                  size="small"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleEditAutoSendRule(row)">编辑</el-button>
                <el-button type="info" link size="small" @click="handleViewAutoSendStats(row)">统计</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteAutoSendRule(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-empty v-if="autoSendRules.length === 0 && !loadingAutoSend" description="暂无自动发送规则" :image-size="120" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 对话框组件 -->
    <CreateTemplateDialog
      v-model="showCreateTemplateDialog"
      mode="apply"
      @submit="handleTemplateSubmit"
    />

    <SendSmsDialog
      v-model="showSendSmsDialog"
      :templates="approvedTemplates"
      @submit="handleSmsSubmit"
    />

    <!-- 模板预览对话框 -->
    <el-dialog
      v-model="showTemplatePreviewDialog"
      title="模板预览"
      width="600px"
      class="template-preview-dialog"
    >
      <div v-if="previewTemplate" class="template-preview-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="模板名称">{{ previewTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="模板分类">{{ getCategoryText(previewTemplate.category) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ previewTemplate.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ previewTemplate.applicant }}</el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="previewTemplate.status === 'approved' ? 'success' : 'warning'">
              {{ previewTemplate.status === 'approved' ? '已通过' : '待审核' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="template-content-section">
          <h4>模板内容：</h4>
          <div class="content-display">{{ previewTemplate.content }}</div>
        </div>

        <div v-if="previewTemplate.variables && previewTemplate.variables.length > 0" class="variables-section">
          <h4>包含变量：</h4>
          <div class="variables-list">
            <el-tag
              v-for="variable in previewTemplate.variables"
              :key="variable"
              class="variable-tag"
              type="info"
            >
              {{ variable }}
            </el-tag>
          </div>
        </div>

        <div class="preview-section">
          <h4>预览效果：</h4>
          <div class="preview-content">{{ getPreviewContent(previewTemplate) }}</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showTemplatePreviewDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 短信详情查看对话框 -->
    <el-dialog
      v-model="showSmsDetailDialog"
      title="短信详情"
      width="700px"
      class="sms-detail-dialog"
    >
      <div v-if="detailSms" class="sms-detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ detailSms.templateName }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ detailSms.applicant }}</el-descriptions-item>
          <el-descriptions-item label="收件人数量">{{ detailSms.recipientCount }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ detailSms.createdAt }}</el-descriptions-item>
          <el-descriptions-item label="审核状态" :span="2">
            <el-tag :type="detailSms.status === 'approved' ? 'success' : 'warning'">
              {{ detailSms.status === 'approved' ? '已通过' : '待审核' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div class="sms-content-section">
          <h4>短信内容：</h4>
          <div class="content-display">{{ detailSms.content }}</div>
        </div>

        <div v-if="detailSms.recipients && detailSms.recipients.length > 0" class="recipients-section">
          <h4>收件人列表：</h4>
          <div class="recipients-list">
            <el-tag
              v-for="(recipient, index) in detailSms.recipients.slice(0, 10)"
              :key="index"
              class="recipient-tag"
            >
              {{ recipient }}
            </el-tag>
            <span v-if="detailSms.recipients.length > 10" class="more-recipients">
              等{{ detailSms.recipients.length }}个收件人
            </span>
          </div>
        </div>

        <div v-if="detailSms.remark" class="remark-section">
          <h4>备注说明：</h4>
          <div class="remark-content">{{ detailSms.remark }}</div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showSmsDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 发送记录详情对话框 -->
    <el-dialog
      v-model="showRecordDetailDialog"
      title="发送记录详情"
      width="800px"
      class="record-detail-dialog"
    >
      <div v-if="detailRecord" class="record-detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ detailRecord.templateName }}</el-descriptions-item>
          <el-descriptions-item label="发送状态">
            <el-tag :type="getStatusType(detailRecord.status)">{{ getStatusText(detailRecord.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发送数量">{{ detailRecord.recipientCount }}</el-descriptions-item>
          <el-descriptions-item label="成功数量">{{ detailRecord.successCount }}</el-descriptions-item>
          <el-descriptions-item label="失败数量">{{ detailRecord.failCount }}</el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ detailRecord.sentAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="record-content-section">
          <h4>短信内容：</h4>
          <div class="content-display">{{ detailRecord.content }}</div>
        </div>

        <div class="send-details-section">
          <h4>发送详情：</h4>
          <el-table :data="paginatedSendDetails" max-height="400">
            <el-table-column label="客户" width="100">
              <template #default="{ row }">{{ row.name || '—' }}</template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="发送时间" width="160">
              <template #default="{ row }">{{ formatTime(row.sentAt) }}</template>
            </el-table-column>
            <el-table-column prop="errorMsg" label="失败原因" show-overflow-tooltip />
          </el-table>
          <div v-if="detailRecord && (detailRecord.sendDetails || []).length > 0" class="record-pagination">
            <el-pagination
              v-model:current-page="detailPage"
              :page-size="10"
              :total="(detailRecord.sendDetails || []).length"
              layout="total, prev, pager, next"
              small
              @current-change="() => {}"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showRecordDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 短信额度弹窗 ==================== -->
    <el-dialog
      v-model="showQuotaDialog"
      title="短信额度"
      width="720px"
      :close-on-click-modal="false"
      class="quota-dialog"
      @open="loadQuotaData"
    >
      <!-- 额度概览 -->
      <div class="quota-overview">
        <div class="quota-info-row">
          <div class="quota-info-item">
            <span class="qi-label">单条价格</span>
            <span class="qi-value price">¥{{ quotaInfo.unitPrice?.toFixed(4) || '0.0450' }}</span>
          </div>
          <div class="quota-info-item">
            <span class="qi-label">总额度</span>
            <span class="qi-value">{{ quotaInfo.totalQuota?.toLocaleString() || 0 }} 条</span>
          </div>
          <div class="quota-info-item">
            <span class="qi-label">已使用</span>
            <span class="qi-value used">{{ quotaInfo.usedQuota?.toLocaleString() || 0 }} 条</span>
          </div>
          <div class="quota-info-item">
            <span class="qi-label">剩余</span>
            <span class="qi-value remain">{{ quotaInfo.remaining?.toLocaleString() || 0 }} 条</span>
          </div>
        </div>
        <el-progress
          :percentage="quotaInfo.usagePercent || 0"
          :stroke-width="10"
          :color="quotaInfo.usagePercent > 80 ? '#f56c6c' : quotaInfo.usagePercent > 50 ? '#e6a23c' : '#409eff'"
          style="margin-top: 12px"
        />
      </div>

      <!-- 标签页切换：套餐购买 / 购买记录 -->
      <el-tabs v-model="quotaTab" style="margin-top: 16px">
        <el-tab-pane label="购买套餐" name="packages">
          <!-- 套餐列表 -->
          <div v-if="quotaPackages.length === 0" class="quota-empty">
            暂无可用套餐，请联系管理员配置
          </div>
          <div v-else class="quota-packages-grid">
            <div
              v-for="pkg in quotaPackages"
              :key="pkg.id"
              class="quota-pkg-card"
              :class="{ selected: selectedPackageId === pkg.id }"
              @click="selectedPackageId = pkg.id"
            >
              <div class="pkg-name">{{ pkg.name }}</div>
              <div class="pkg-count">{{ pkg.smsCount?.toLocaleString() }} 条</div>
              <div class="pkg-price">¥{{ Number(pkg.price).toFixed(2) }}</div>
              <div class="pkg-unit">¥{{ Number(pkg.unitPrice).toFixed(4) }}/条</div>
              <div v-if="pkg.description" class="pkg-desc">{{ pkg.description }}</div>
              <el-icon v-if="selectedPackageId === pkg.id" class="pkg-check"><CircleCheckFilled /></el-icon>
            </div>
          </div>

          <!-- 支付方式 -->
          <div v-if="quotaPackages.length > 0" class="quota-pay-section">
            <div class="pay-label">支付方式</div>
            <div class="pay-type-btns">
              <div
                class="pay-type-btn"
                :class="{ active: quotaPayType === 'wechat' }"
                @click="quotaPayType = 'wechat'"
              >
                <span class="pay-icon">💚</span>
                <span>微信支付</span>
              </div>
              <div
                class="pay-type-btn"
                :class="{ active: quotaPayType === 'alipay' }"
                @click="quotaPayType = 'alipay'"
              >
                <span class="pay-icon">🔵</span>
                <span>支付宝</span>
              </div>
            </div>
          </div>

          <!-- 二维码支付区域 -->
          <div v-if="quotaQrCode" class="quota-qr-section">
            <div class="qr-title">请扫码支付 ¥{{ quotaOrderAmount }}</div>
            <div class="qr-img-wrap">
              <img :src="quotaQrCode" alt="支付二维码" class="qr-img" />
            </div>
            <div class="qr-actions">
              <el-button type="primary" @click="checkQuotaPayStatus" :loading="quotaChecking">
                我已支付，查询结果
              </el-button>
              <el-button @click="simulateQuotaPay" type="success" size="small" style="margin-left: 8px">
                模拟支付(调试)
              </el-button>
            </div>
          </div>

          <!-- 购买按钮 -->
          <div v-if="quotaPackages.length > 0 && !quotaQrCode" class="quota-buy-btn-wrap">
            <el-button type="primary" size="large" @click="handleBuyQuota" :loading="quotaBuying" :disabled="!selectedPackageId">
              立即购买
            </el-button>
          </div>
        </el-tab-pane>

        <el-tab-pane label="购买记录" name="bills">
          <el-table :data="quotaBills" stripe size="small" style="width: 100%">
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ formatTime(row.paidAt || row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="packageName" label="套餐" width="100" />
            <el-table-column label="金额" width="80" align="center">
              <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
            </el-table-column>
            <el-table-column label="条数" width="80" align="center">
              <template #default="{ row }">{{ row.smsCount?.toLocaleString() }}</template>
            </el-table-column>
            <el-table-column prop="buyerName" label="购买人" width="80" />
            <el-table-column label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'paid' ? 'success' : row.status === 'refunded' ? 'info' : row.status === 'closed' ? 'danger' : 'warning'" size="small">
                  {{ row.status === 'paid' ? '已支付' : row.status === 'refunded' ? '已退款' : row.status === 'closed' ? '已取消' : '待支付' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="140" align="center">
              <template #default="{ row }">
                <template v-if="row.status === 'pending'">
                  <el-button type="primary" size="small" link @click="handleResumePayOrder(row)">支付</el-button>
                  <el-button type="danger" size="small" link @click="handleCancelOrder(row)">取消</el-button>
                </template>
                <span v-else class="text-gray">—</span>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="quotaBills.length === 0" class="quota-empty">暂无购买记录</div>
          <div v-if="quotaBillsTotal > quotaBillsPageSize" class="quota-bills-pagination">
            <el-pagination
              v-model:current-page="quotaBillsPage"
              :page-size="quotaBillsPageSize"
              :total="quotaBillsTotal"
              layout="total, prev, pager, next"
              small
              @current-change="loadQuotaBillsPage"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="closeQuotaDialog">关闭</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 自动发送规则配置弹窗 ==================== -->
    <el-dialog
      v-model="showAutoSendDialog"
      :title="editingAutoSendRule ? '编辑自动发送规则' : '新建自动发送规则'"
      width="640px"
      :close-on-click-modal="false"
      class="auto-send-dialog"
      @close="resetAutoSendForm"
    >
      <el-form :model="autoSendForm" :rules="autoSendRulesValidation" ref="autoSendFormRef" label-width="110px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="autoSendForm.name" placeholder="如：发货通知自动发送" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="触发事件" prop="triggerEvent">
          <el-select v-model="autoSendForm.triggerEvent" placeholder="选择触发事件" style="width: 100%">
            <el-option
              v-for="evt in triggerEventOptions"
              :key="evt.value"
              :label="evt.label"
              :value="evt.value"
            >
              <div>
                <div>{{ evt.label }}</div>
                <div style="font-size: 12px; color: #909399">{{ evt.description }}</div>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="短信模板" prop="templateId">
          <el-select v-model="autoSendForm.templateId" placeholder="选择模板" filterable style="width: 100%">
            <el-option
              v-for="tpl in approvedTemplates"
              :key="tpl.id"
              :label="tpl.name"
              :value="String(tpl.id)"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生效部门">
          <el-select v-model="autoSendForm.effectiveDepartments" multiple placeholder="全部部门（不选则全部生效）" style="width: 100%" clearable>
            <el-option v-for="dept in departmentList" :key="dept.id" :label="dept.name" :value="dept.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发送时间">
          <div style="display: flex; flex-direction: column; gap: 8px; width: 100%">
            <el-checkbox v-model="autoSendForm.sendImmediately">立即发送（触发后立即发送，无时间限制）</el-checkbox>
            <div v-if="!autoSendForm.sendImmediately" style="display: flex; align-items: center; gap: 10px">
              <el-time-select
                v-model="autoSendForm.startHour"
                :max-time="autoSendForm.endHour"
                placeholder="开始时间"
                start="06:00"
                step="01:00"
                end="23:00"
                style="width: 130px"
              />
              <span>至</span>
              <el-time-select
                v-model="autoSendForm.endHour"
                :min-time="autoSendForm.startHour"
                placeholder="结束时间"
                start="06:00"
                step="01:00"
                end="23:00"
                style="width: 130px"
              />
              <el-checkbox v-model="autoSendForm.workdaysOnly">仅工作日</el-checkbox>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="autoSendForm.description" type="textarea" :rows="2" placeholder="规则描述（可选）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAutoSendDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAutoSendRule" :loading="savingAutoSendRule">
          {{ editingAutoSendRule ? '保存修改' : '创建规则' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- ==================== 自动发送规则统计详情弹窗（美化版） ==================== -->
    <el-dialog
      v-model="showAutoSendStatsDialog"
      :title="''"
      width="960px"
      class="auto-send-stats-dialog"
      :close-on-click-modal="false"
    >
      <template #header>
        <div style="display: flex; align-items: center; gap: 10px;">
          <el-icon :size="22" color="#409eff"><DataAnalysis /></el-icon>
          <span style="font-size: 17px; font-weight: 600; color: #303133;">发送统计 — {{ autoSendStatsRule?.name || '' }}</span>
          <el-tag v-if="autoSendStatsRule" :type="autoSendStatsRule.enabled === 1 ? 'success' : 'info'" size="small" style="margin-left: 6px;">
            {{ autoSendStatsRule.enabled === 1 ? '启用中' : '已禁用' }}
          </el-tag>
        </div>
      </template>

      <div v-if="autoSendStatsRule">
        <!-- 概览统计卡片 -->
        <div class="auto-stats-overview">
          <div class="stats-card stats-card--primary">
            <div class="stats-card-icon"><el-icon :size="28"><TrendCharts /></el-icon></div>
            <div class="stats-card-info">
              <div class="stats-card-num">{{ (autoSendStatsRule.statsSentCount || 0) + (autoSendStatsRule.statsFailCount || 0) }}</div>
              <div class="stats-card-label">总触发次数</div>
            </div>
          </div>
          <div class="stats-card stats-card--success">
            <div class="stats-card-icon"><el-icon :size="28"><CircleCheckFilled /></el-icon></div>
            <div class="stats-card-info">
              <div class="stats-card-num">{{ autoSendStatsRule.statsSentCount || 0 }}</div>
              <div class="stats-card-label">成功发送</div>
            </div>
          </div>
          <div class="stats-card stats-card--danger">
            <div class="stats-card-icon"><el-icon :size="28"><Close /></el-icon></div>
            <div class="stats-card-info">
              <div class="stats-card-num">{{ autoSendStatsRule.statsFailCount || 0 }}</div>
              <div class="stats-card-label">发送失败</div>
            </div>
          </div>
          <div class="stats-card stats-card--info">
            <div class="stats-card-icon"><el-icon :size="28"><Clock /></el-icon></div>
            <div class="stats-card-info">
              <div class="stats-card-num stats-card-time">{{ formatTime(autoSendStatsRule.lastTriggeredAt) || '—' }}</div>
              <div class="stats-card-label">最后触发</div>
            </div>
          </div>
        </div>

        <!-- 规则详情 -->
        <div class="auto-stats-rule-info">
          <span>触发事件：<el-tag size="small" type="info">{{ getTriggerEventLabel(autoSendStatsRule.triggerEvent) }}</el-tag></span>
          <span>关联模板：<b>{{ autoSendStatsRule.templateName || '—' }}</b></span>
        </div>
      </div>

      <!-- 发送记录表 -->
      <div class="auto-stats-section-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>发送记录</span>
        <el-input
          v-model="autoSendStatsKeyword"
          placeholder="搜索发送人、客户名字、号码、内容"
          :prefix-icon="Search"
          clearable
          style="width: 320px"
          @keyup.enter="handleAutoSendStatsSearch"
        />
      </div>
      <el-table :data="autoSendStatsRecords" v-loading="loadingAutoSendStats" stripe border style="width: 100%; border-radius: 8px;">
        <el-table-column prop="applicantName" label="触发来源" width="110">
          <template #default="{ row }">
            <span style="font-weight: 500;">{{ row.applicantName || '系统' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="接收人" width="160">
          <template #default="{ row }">
            <div v-if="row.recipients?.length > 0">
              <span style="font-weight: 500;">{{ row.recipients[0]?.name || '' }}</span>
              <span style="color: #909399; margin-left: 4px; font-size: 12px;">{{ maskPhone(row.recipients[0]?.phone || '') }}</span>
            </div>
            <span v-else style="color: #c0c4cc;">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="templateName" label="模板" width="130" show-overflow-tooltip />
        <el-table-column prop="content" label="短信内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'danger'" size="small" effect="light">
              {{ row.status === 'completed' ? '✓ 成功' : '✗ 失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送时间" width="170" align="center">
          <template #default="{ row }">
            <span style="font-size: 13px; color: #606266;">{{ formatTime(row.sentAt || row.createdAt) }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="autoSendStatsRecords.length === 0 && !loadingAutoSendStats" description="暂无发送记录" :image-size="80" />

      <div style="display: flex; justify-content: flex-end; margin-top: 14px">
        <el-pagination
          v-model:current-page="autoSendStatsPage"
          v-model:page-size="autoSendStatsPageSize"
          :total="autoSendStatsTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadAutoSendStatsRecords"
          @current-change="loadAutoSendStatsRecords"
        />
      </div>

      <template #footer>
        <el-button @click="showAutoSendStatsDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Message,
  Clock,
  TrendCharts,
  DataAnalysis,
  Search,
  Check,
  Close,
  View,
  Collection,
  EditPen,
  Coin,
  CircleCheckFilled,
  Plus
} from '@element-plus/icons-vue'
import CreateTemplateDialog from '@/components/CreateTemplateDialog.vue'
import SendSmsDialog from '@/components/SendSmsDialog.vue'
import { useNotificationStore, MessageType } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import {
  getStatistics as apiGetStatistics,
  getTemplates as apiGetTemplates,
  getAvailableTemplates,
  getSendRecords as apiGetSendRecords,
  applyTemplate as apiApplyTemplate,
  sendSms as apiSendSms,
  approveSms as apiApproveSms,
  getSmsQuota,
  getSmsQuotaPackages,
  createSmsQuotaOrder,
  querySmsQuotaOrder,
  simulateSmsQuotaPay as apiSimulatePay,
  getSmsQuotaBills
} from '@/api/sms'
import { cancelSmsQuotaOrder } from '@/api/sms'
import { generateQRCodeDataUrl } from '@/utils/qrcode'
import {
  getAutoSendRules as apiGetAutoSendRules,
  createAutoSendRule as apiCreateAutoSendRule,
  updateAutoSendRule as apiUpdateAutoSendRule,
  deleteAutoSendRule as apiDeleteAutoSendRule,
  toggleAutoSendRule as apiToggleAutoSendRule,
  getAutoSendTriggerEvents,
  getAutoSendRuleRecords as apiGetAutoSendRuleRecords
} from '@/api/sms'

// 用户角色判断
const userStore = useUserStore()

// 本地接口定义
interface LocalSmsTemplate {
  id: string | number
  name: string
  category: string
  content: string
  variables?: string[]
  description?: string
  applicant?: string
  applicantName?: string
  applicantDept?: string
  createdAt?: string
  status: string
  approvedBy?: string
  approvedAt?: string
  usage?: number
}

interface LocalSmsRequest {
  id: string
  templateName: string
  content: string
  recipients: string[]
  recipientCount: number
  applicant?: string
  applicantName: string
  applicantDept: string
  createdAt: string
  status: string
  remark?: string
  approvedBy?: string
  approvedAt?: string
}

interface LocalSendRecord {
  id: string | number
  templateName: string
  content: string
  recipientCount: number
  successCount: number
  failCount: number
  status: string
  sentAt: string
  sendDetails?: SendDetail[]
  recipients?: any[]
}

interface SendDetail {
  phone: string
  status: string
  sentAt: string
  errorMsg: string
}

interface TemplateSubmitData {
  mode: string
  name: string
  category: string
  content: string
  variables: string[]
  description: string
}

interface SmsSubmitData {
  templateId: string
  templateName?: string
  recipients: string[] | { name: string; phone: string }[]
  content: string
  remark?: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const notificationStore = useNotificationStore()

// 响应式数据
const activeTab = ref('sms')
const smsSubTab = ref('pending')

// 搜索相关
const smsSearch = ref('')
const approvedSmsSearch = ref('')
const recordSearch = ref('')
const recordDateRange = ref([])

// 分页状态
const recordPage = ref(1)
const recordPageSize = ref(10)
const recordTotal = ref(0)
const approvalPage = ref(1)
const approvalPageSize = ref(10)
const approvalTotal = ref(0)
const pendingSmsPage = ref(1)
const pendingSmsPageSize = ref(10)
const pendingSmsTotal = ref(0)
const approvedSmsPage = ref(1)
const approvedSmsPageSize = ref(10)
const approvedSmsTotal = ref(0)

// 加载状态
const loadingSms = ref(false)
const loadingApprovedSms = ref(false)
const loadingRecords = ref(false)

// 对话框状态
const showCreateTemplateDialog = ref(false)
const showSendSmsDialog = ref(false)
const showTemplatePreviewDialog = ref(false)
const showSmsDetailDialog = ref(false)
const showRecordDetailDialog = ref(false)

// 对话框数据
const previewTemplate = ref<LocalSmsTemplate | null>(null)
const detailSms = ref<LocalSmsRequest | null>(null)
const detailRecord = ref<(LocalSendRecord & { sendDetails?: SendDetail[] }) | null>(null)

// 统计数据
const stats = ref({
  pendingTemplates: 0,
  pendingSms: 0,
  todaySent: 0,
  totalSent: 0,
  myPendingCount: 0,
  myApprovedCount: 0
})

// 模板数据
const pendingTemplates = ref<LocalSmsTemplate[]>([])
const approvedTemplates = ref<LocalSmsTemplate[]>([])

// 短信数据
const pendingSms = ref<LocalSmsRequest[]>([])
const approvedSms = ref<LocalSmsRequest[]>([])

// 发送记录
const sendRecords = ref<LocalSendRecord[]>([])

// 计算属性
const pendingSmsCount = computed(() => pendingSmsTotal.value)

// SMS search handlers (server-side)
const handlePendingSmsSearch = () => {
  pendingSmsPage.value = 1
  loadPendingSms()
}

const handleApprovedSmsSearch = () => {
  approvedSmsPage.value = 1
  loadApprovedSms()
}

// filteredRecords: now handled server-side (see loadSendRecords)

// 搜索触发
const handleRecordSearch = () => {
  recordPage.value = 1
  loadSendRecords()
}

const handleApprovalSearch = () => {
  approvalPage.value = 1
  loadApprovalRecords()
}

// 方法
const handleSendSms = () => {
  showSendSmsDialog.value = true
}

// v1.8.0 新增：查看模板详情页
const handleViewTemplates = () => {
  safeNavigator.push('/service-management/sms/template-detail')
}

// v1.8.0 新增：申请模板
const handleApplyTemplate = () => {
  showCreateTemplateDialog.value = true
}

// 模板申请提交 - 调用真实API
const handleTemplateSubmit = async (data: TemplateSubmitData) => {
  try {
    const res = await apiApplyTemplate({
      name: data.name,
      category: data.category,
      content: data.content,
      variables: data.variables,
      description: data.description
    }) as any

    if (res?.success || res?.code === 200) {
      ElMessage.success('模板申请已提交，等待管理员审核')
      // 发送通知给管理员
      try {
        await notificationStore.sendMessage(
          MessageType.SMS_TEMPLATE_APPLIED,
          `短信模板申请：${data.name}`,
          `有新的短信模板申请"${data.name}"（分类：${getCategoryText(data.category)}），请及时审核。`,
          { templateName: data.name, category: data.category }
        )
      } catch { /* 通知发送失败不影响主流程 */ }
      loadStats()
    } else {
      ElMessage.error(res?.message || '模板申请提交失败')
    }
  } catch (error) {
    console.error('模板申请提交失败:', error)
    ElMessage.error('模板申请提交失败，请稍后重试')
  }
  showCreateTemplateDialog.value = false
}

// 短信发送提交 - 调用真实API
const handleSmsSubmit = async (data: SmsSubmitData) => {
  try {
    const templateName = data.templateName || data.template?.name || ''
    const res = await apiSendSms({
      templateId: data.templateId,
      templateName,
      recipients: data.recipients,
      content: data.content
    }) as any

    if (res?.success || res?.code === 200) {
      ElMessage.success('短信发送成功')
      // 发送通知
      try {
        const recipientCount = Array.isArray(data.recipients) ? data.recipients.length : 0
        await notificationStore.sendMessage(
          MessageType.SMS_SEND_SUCCESS,
          `短信发送完成`,
          `使用模板"${templateName || '自定义'}"向${recipientCount}位客户发送短信已完成。`,
          { templateName, recipientCount }
        )
      } catch { /* 通知发送失败不影响主流程 */ }
      loadSendRecords()
      loadStats()
    } else {
      ElMessage.error(res?.message || '短信发送失败')
    }
  } catch (error) {
    console.error('短信发送失败:', error)
    ElMessage.error('短信发送失败，请稍后重试')
  }
  showSendSmsDialog.value = false
}

// 审核通过短信 - 调用真实API
const handleApproveSms = async (sms: LocalSmsRequest) => {
  try {
    await ElMessageBox.confirm('确认通过此短信发送申请？', '确认操作', {
      type: 'warning'
    })

    const res = await apiApproveSms(sms.id, { approved: true }) as any
    if (res?.success || res?.code === 200) {
      ElMessage.success('短信发送申请已通过')
      // 刷新列表
      loadPendingSms()
      loadApprovedSms()
      loadStats()
    } else {
      ElMessage.error(res?.message || '审核失败')
    }
  } catch {
    // 用户取消或请求失败
  }
}

// 拒绝短信 - 调用真实API
const handleRejectSms = async (sms: LocalSmsRequest) => {
  try {
    await ElMessageBox.confirm('确认拒绝此短信发送申请？', '确认操作', {
      type: 'warning'
    })

    const res = await apiApproveSms(sms.id, { approved: false }) as any
    if (res?.success || res?.code === 200) {
      ElMessage.success('短信发送申请已拒绝')
      loadPendingSms()
      loadStats()
    } else {
      ElMessage.error(res?.message || '拒绝失败')
    }
  } catch {
    // 用户取消或请求失败
  }
}

const _handlePreviewTemplate = (template: LocalSmsTemplate) => {
  previewTemplate.value = template
  showTemplatePreviewDialog.value = true
}

const handlePreviewSms = (sms: LocalSmsRequest) => {
  detailSms.value = sms
  showSmsDetailDialog.value = true
}

const handleViewRecord = (record: LocalSendRecord) => {
  // 如果 sendDetails 为空，从 recipients 生成发送详情
  let details = record.sendDetails || []
  if ((!details || details.length === 0) && record.recipients && record.recipients.length > 0) {
    details = record.recipients.map((r: any) => ({
      phone: typeof r === 'string' ? r : (r.phone || r.mobile || ''),
      name: typeof r === 'string' ? '' : (r.name || r.customerName || ''),
      status: record.status === 'completed' || record.status === 'approved' ? 'success' : 'failed',
      sentAt: record.sentAt || '',
      errorMsg: ''
    }))
  }
  detailRecord.value = {
    ...record,
    sendDetails: details
  }
  detailPage.value = 1
  showRecordDetailDialog.value = true
}

// 发送详情分页
const detailPage = ref(1)
const paginatedSendDetails = computed(() => {
  const details = detailRecord.value?.sendDetails || []
  const start = (detailPage.value - 1) * 10
  return details.slice(start, start + 10)
})

// 获取模板预览内容
const getPreviewContent = (template: LocalSmsTemplate) => {
  if (!template || !template.content) return ''

  let content = template.content
  const exampleValues: Record<string, string> = {
    orderNo: 'ORD20240115001',
    deliveryTime: '2024-01-16 14:00',
    trackingNo: 'SF1234567890',
    customerName: '张先生',
    amount: '299.00',
    productName: '商品名称',
    companyName: '公司名称',
    phone: '138****8888',
    code: '123456'
  }

  if (template.variables) {
    template.variables.forEach((variable: string) => {
      const key = variable.replace(/[{}]/g, '')
      const value = exampleValues[key] || `[${key}]`
      content = content.replace(new RegExp(`\\${variable}`, 'g'), value)
    })
  }

  return content
}

const getCategoryText = (category: string) => {
  const categoryMap: Record<string, string> = {
    order: '订单通知',
    logistics: '物流通知',
    marketing: '营销推广',
    service: '客服通知',
    system: '系统通知',
    reminder: '提醒通知'
  }
  return categoryMap[category] || category
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    completed: 'success',
    failed: 'danger',
    sending: 'warning',
    pending: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    completed: '发送完成',
    failed: '发送失败',
    sending: '发送中',
    pending: '待发送'
  }
  return statusMap[status] || status
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  try {
    return new Date(time).toLocaleString('zh-CN')
  } catch {
    return time
  }
}

/** 手机号脱敏：138****8001 */
const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

// ==================== 数据加载方法（调用真实API）====================

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await apiGetStatistics() as any
    if (res?.data) {
      stats.value = {
        pendingTemplates: res.data.pendingTemplates ?? 0,
        pendingSms: res.data.pendingSms ?? 0,
        todaySent: res.data.todaySent ?? 0,
        totalSent: res.data.totalSent ?? 0,
        myPendingCount: res.data.myPendingCount ?? 0,
        myApprovedCount: res.data.myApprovedCount ?? 0
      }
    }
  } catch (error) {
    console.warn('加载统计数据失败:', error)
  }
}

// 加载审核通过的模板（用于发送短信和自动发送规则选模板）
const loadApprovedTemplates = async () => {
  try {
    // 优先使用 /templates/available 接口（包含预设模板 + 本租户active模板）
    const res = await getAvailableTemplates() as any
    if (res?.data?.templates && res.data.templates.length > 0) {
      approvedTemplates.value = res.data.templates
    } else {
      // 回退：使用分页接口，加载足够多的模板
      const res2 = await apiGetTemplates({ status: 'active', pageSize: 200 } as any) as any
      if (res2?.data?.templates && res2.data.templates.length > 0) {
        approvedTemplates.value = res2.data.templates
      }
    }
  } catch (error) {
    console.warn('加载已审核模板失败:', error)
  }
}

// 加载待审核短信发送记录
const loadPendingSms = async () => {
  loadingSms.value = true
  try {
    const params: any = {
      status: 'pending',
      page: pendingSmsPage.value,
      pageSize: pendingSmsPageSize.value
    }
    if (smsSearch.value) params.keyword = smsSearch.value
    const res = await apiGetSendRecords(params) as any
    if (res?.data?.records) {
      pendingSms.value = res.data.records.map((r: any) => ({
        id: String(r.id),
        templateName: r.templateName || '',
        content: r.content || '',
        recipients: r.recipients || [],
        recipientCount: r.recipientCount || 0,
        applicant: r.applicant,
        applicantName: r.applicantName || '',
        applicantDept: r.applicantDept || '',
        createdAt: r.createdAt,
        status: r.status,
        remark: r.remark,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt
      }))
      pendingSmsTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.warn('加载待审核短信失败:', error)
  } finally {
    loadingSms.value = false
  }
}

// 加载已通过的短信
const loadApprovedSms = async () => {
  loadingApprovedSms.value = true
  try {
    const params: any = {
      status: 'completed',
      page: approvedSmsPage.value,
      pageSize: approvedSmsPageSize.value
    }
    if (approvedSmsSearch.value) params.keyword = approvedSmsSearch.value
    const res = await apiGetSendRecords(params) as any
    if (res?.data?.records) {
      approvedSms.value = res.data.records.map((r: any) => ({
        id: String(r.id),
        templateName: r.templateName || '',
        content: r.content || '',
        recipients: r.recipients || [],
        recipientCount: r.recipientCount || 0,
        applicant: r.applicant,
        applicantName: r.applicantName || '',
        applicantDept: r.applicantDept || '',
        createdAt: r.createdAt,
        status: r.status,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt || r.sentAt
      }))
      approvedSmsTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.warn('加载已通过短信失败:', error)
  } finally {
    loadingApprovedSms.value = false
  }
}

// 加载发送记录
const loadSendRecords = async () => {
  loadingRecords.value = true
  try {
    const params: any = {
      page: recordPage.value,
      pageSize: recordPageSize.value
    }
    if (recordSearch.value) params.keyword = recordSearch.value
    if (recordDateRange.value && recordDateRange.value.length === 2) {
      params.startDate = recordDateRange.value[0]
      params.endDate = recordDateRange.value[1]
    }
    const res = await apiGetSendRecords(params) as any
    if (res?.data?.records) {
      sendRecords.value = res.data.records.map((r: any) => ({
        id: String(r.id),
        templateName: r.templateName || '',
        content: r.content || '',
        recipientCount: r.recipientCount || 0,
        successCount: r.successCount || 0,
        failCount: r.failCount || 0,
        status: r.status,
        sentAt: r.sentAt || r.createdAt,
        sendDetails: r.sendDetails || [],
        recipients: r.recipients || []
      }))
      recordTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.warn('加载发送记录失败:', error)
  } finally {
    loadingRecords.value = false
  }
}

// ==================== 短信额度相关 ====================
const showQuotaDialog = ref(false)
const quotaTab = ref('packages')
const quotaInfo = ref<any>({ totalQuota: 0, usedQuota: 0, remaining: 0, usagePercent: 0, unitPrice: 0.045 })
const quotaPackages = ref<any[]>([])
const selectedPackageId = ref('')
const quotaPayType = ref('wechat')
const quotaBuying = ref(false)
const quotaQrCode = ref('')
const quotaOrderNo = ref('')
const quotaOrderAmount = ref(0)
const quotaChecking = ref(false)
const quotaBills = ref<any[]>([])
const quotaBillsPage = ref(1)
const quotaBillsPageSize = 10
const quotaBillsTotal = ref(0)
let quotaPollTimer: ReturnType<typeof setInterval> | null = null

const loadQuotaBillsPage = async (page?: number) => {
  if (page) quotaBillsPage.value = page
  try {
    const res = await getSmsQuotaBills({ page: quotaBillsPage.value, pageSize: quotaBillsPageSize }) as any
    if (res?.success && res.data?.list) {
      quotaBills.value = res.data.list
      quotaBillsTotal.value = res.data.total || 0
    }
  } catch { /* ignore */ }
}

const loadQuotaData = async () => {
  // 加载额度信息
  try {
    const res = await getSmsQuota() as any
    if (res?.success && res.data) {
      quotaInfo.value = res.data
    }
  } catch { /* ignore */ }

  // 加载套餐列表
  try {
    const res = await getSmsQuotaPackages() as any
    if (res?.success && res.data?.list) {
      quotaPackages.value = res.data.list
    }
  } catch { /* ignore */ }

  // 加载购买记录
  quotaBillsPage.value = 1
  await loadQuotaBillsPage()

  // 重置支付状态
  quotaQrCode.value = ''
  quotaOrderNo.value = ''
  selectedPackageId.value = ''
}

const handleBuyQuota = async () => {
  if (!selectedPackageId.value) {
    ElMessage.warning('请选择一个套餐')
    return
  }
  quotaBuying.value = true
  try {
    const res = await createSmsQuotaOrder({
      packageId: selectedPackageId.value,
      payType: quotaPayType.value
    }) as any

    if (res?.success && res.data) {
      const qrRaw = res.data.qrCode || res.data.payUrl || ''
      if (qrRaw.startsWith('data:') || qrRaw.startsWith('http')) {
        quotaQrCode.value = qrRaw
      } else if (qrRaw) {
        quotaQrCode.value = await generateQRCodeDataUrl(qrRaw)
      }
      quotaOrderNo.value = res.data.orderNo || ''
      quotaOrderAmount.value = res.data.amount || 0
      ElMessage.success('订单创建成功，请扫码支付')
      // 自动启动轮询查询支付状态
      startQuotaPolling()
    } else {
      ElMessage.error(res?.message || '创建订单失败')
    }
  } catch (_err: any) {
    ElMessage.error('创建订单失败')
  } finally {
    quotaBuying.value = false
  }
}

// 自动轮询支付状态（每3秒一次）
const startQuotaPolling = () => {
  stopQuotaPolling()
  quotaPollTimer = setInterval(async () => {
    if (!quotaOrderNo.value) { stopQuotaPolling(); return }
    try {
      const res = await querySmsQuotaOrder(quotaOrderNo.value) as any
      if (res?.success && res.data?.status === 'paid') {
        stopQuotaPolling()
        ElMessage.success(`支付成功！已充值 ${res.data.smsCount?.toLocaleString()} 条短信额度`)
        quotaQrCode.value = ''
        quotaOrderNo.value = ''
        loadQuotaData()
      }
    } catch { /* ignore */ }
  }, 3000)
}

const stopQuotaPolling = () => {
  if (quotaPollTimer) { clearInterval(quotaPollTimer); quotaPollTimer = null }
}

const checkQuotaPayStatus = async () => {
  if (!quotaOrderNo.value) return
  quotaChecking.value = true
  try {
    const res = await querySmsQuotaOrder(quotaOrderNo.value) as any
    if (res?.success && res.data) {
      if (res.data.status === 'paid') {
        ElMessage.success(`支付成功！已充值 ${res.data.smsCount?.toLocaleString()} 条短信额度`)
        quotaQrCode.value = ''
        quotaOrderNo.value = ''
        loadQuotaData()
      } else {
        ElMessage.info('支付尚未完成，请先完成扫码支付')
      }
    }
  } catch {
    ElMessage.error('查询支付状态失败')
  } finally {
    quotaChecking.value = false
  }
}

const simulateQuotaPay = async () => {
  if (!quotaOrderNo.value) return
  try {
    const res = await apiSimulatePay(quotaOrderNo.value) as any
    if (res?.success) {
      ElMessage.success(`模拟支付成功！已充值 ${res.data?.smsCount?.toLocaleString() || ''} 条`)
      quotaQrCode.value = ''
      quotaOrderNo.value = ''
      loadQuotaData()
    } else {
      ElMessage.error(res?.message || '模拟支付失败')
    }
  } catch {
    ElMessage.error('模拟支付失败')
  }
}

const closeQuotaDialog = () => {
  showQuotaDialog.value = false
  quotaQrCode.value = ''
  quotaOrderNo.value = ''
  stopQuotaPolling()
}

// 续付未支付的订单（复用已有二维码，不重复创建）
const handleResumePayOrder = async (order: any) => {
  if (order.qrCode || order.payUrl) {
    const qr = order.qrCode || order.payUrl
    if (qr.startsWith('data:') || qr.startsWith('http')) {
      quotaQrCode.value = qr
    } else {
      quotaQrCode.value = await generateQRCodeDataUrl(qr)
    }
    quotaOrderNo.value = order.orderNo
    quotaOrderAmount.value = Number(order.amount)
    quotaTab.value = 'packages'
    startQuotaPolling()
    ElMessage.info('请扫码完成支付')
  } else {
    ElMessage.warning('二维码已过期，请重新下单')
  }
}

// 取消未支付的订单
const handleCancelOrder = async (order: any) => {
  try {
    await ElMessageBox.confirm(`确定取消订单 ${order.orderNo} 吗？`, '取消订单', { type: 'warning' })
    const res = await cancelSmsQuotaOrder(order.orderNo) as any
    if (res?.success) {
      ElMessage.success('订单已取消')
      loadQuotaBillsPage()
    } else {
      ElMessage.error(res?.message || '取消失败')
    }
  } catch { /* 用户取消确认 */ }
}

// ==================== 审核记录（非管理员可见）====================
const approvalSearch = ref('')
const loadingApprovals = ref(false)
const approvalRecords = ref<LocalSmsRequest[]>([])

// filteredApprovalRecords: now handled server-side (see loadApprovalRecords)

const loadApprovalRecords = async () => {
  loadingApprovals.value = true
  try {
    const params: any = {
      page: approvalPage.value,
      pageSize: approvalPageSize.value
    }
    if (approvalSearch.value) params.keyword = approvalSearch.value
    const res = await apiGetSendRecords(params) as any
    if (res?.data?.records) {
      approvalRecords.value = res.data.records.map((r: any) => ({
        id: String(r.id),
        templateName: r.templateName || '',
        content: r.content || '',
        recipients: r.recipients || [],
        recipientCount: r.recipientCount || 0,
        applicant: r.applicant,
        applicantName: r.applicantName || '',
        applicantDept: r.applicantDept || '',
        createdAt: r.createdAt,
        status: r.status,
        remark: r.remark,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt || r.sentAt
      }))
      approvalTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.warn('加载审核记录失败:', error)
  } finally {
    loadingApprovals.value = false
  }
}

// ==================== 自动发送规则（管理员可见）====================
const autoSendSearch = ref('')
const loadingAutoSend = ref(false)
const showAutoSendDialog = ref(false)
const savingAutoSendRule = ref(false)
const editingAutoSendRule = ref<any>(null)
const autoSendRules = ref<any[]>([])
const autoSendFormRef = ref()
const triggerEventOptions = ref<any[]>([
  { value: 'order_shipped', label: '订单发货', description: '上传物流单号/发货后自动发送短信给客户' },
  { value: 'order_confirmed', label: '订单确认', description: '订单确认后自动发送短信给客户' },
  { value: 'order_paid', label: '订单付款', description: '订单支付完成后自动发送短信给客户' },
  { value: 'order_delivered', label: '订单签收', description: '订单签收后自动发送短信给客户' },
  { value: 'customer_created', label: '新客户创建', description: '新客户创建后自动发送欢迎短信' },
  { value: 'follow_up_remind', label: '跟进提醒', description: '到达跟进时间时自动发送提醒短信' },
  { value: 'payment_remind', label: '付款提醒', description: '订单到期未付款时自动提醒' },
  { value: 'birthday_wish', label: '生日祝福', description: '客户生日当天自动发送祝福短信' },
])
const departmentList = ref<any[]>([])

const autoSendForm = ref({
  name: '',
  triggerEvent: '',
  templateId: '',
  effectiveDepartments: [] as string[],
  sendImmediately: true,
  startHour: '08:00',
  endHour: '22:00',
  workdaysOnly: false,
  description: ''
})

const autoSendRulesValidation = {
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }],
  triggerEvent: [{ required: true, message: '请选择触发事件', trigger: 'change' }],
  templateId: [{ required: true, message: '请选择短信模板', trigger: 'change' }]
}
// alias for template ref
const autoSendRulesData = autoSendRulesValidation

const filteredAutoSendRules = computed(() => {
  if (!autoSendSearch.value) return autoSendRules.value
  return autoSendRules.value.filter(r =>
    r.name?.includes(autoSendSearch.value) || r.templateName?.includes(autoSendSearch.value)
  )
})

const getTriggerEventLabel = (event: string) => {
  const found = triggerEventOptions.value.find(e => e.value === event)
  return found ? found.label : event
}

const loadAutoSendRules = async () => {
  loadingAutoSend.value = true
  try {
    const res = await apiGetAutoSendRules({ page: 1, pageSize: 100 }) as any
    if (res?.success && res.data?.rules) {
      autoSendRules.value = res.data.rules
    } else if (res?.data?.rules) {
      autoSendRules.value = res.data.rules
    }
  } catch (error) {
    console.warn('加载自动发送规则失败:', error)
  } finally {
    loadingAutoSend.value = false
  }
}

const loadTriggerEvents = async () => {
  try {
    const res = await getAutoSendTriggerEvents() as any
    if (res?.success && res.data?.events) {
      triggerEventOptions.value = res.data.events
    }
  } catch { /* use defaults */ }
}

const loadDepartments = async () => {
  try {
    // 尝试从用户列表中提取部门
    const users = userStore.users || []
    const deptMap = new Map<string, string>()
    users.forEach((u: any) => {
      const dept = u.department || u.departmentName
      if (dept && !deptMap.has(dept)) {
        deptMap.set(dept, dept)
      }
    })
    departmentList.value = Array.from(deptMap.entries()).map(([id, name]) => ({ id, name }))
  } catch { /* ignore */ }
}

const handleSaveAutoSendRule = async () => {
  try {
    await autoSendFormRef.value?.validate()
  } catch { return }

  savingAutoSendRule.value = true
  try {
    const timeRangeConfig = autoSendForm.value.sendImmediately
      ? { sendImmediately: true }
      : {
          sendImmediately: false,
          startHour: parseInt(autoSendForm.value.startHour) || 8,
          endHour: parseInt(autoSendForm.value.endHour) || 22,
          workdaysOnly: autoSendForm.value.workdaysOnly
        }

    const data = {
      name: autoSendForm.value.name,
      templateId: autoSendForm.value.templateId,
      triggerEvent: autoSendForm.value.triggerEvent,
      effectiveDepartments: autoSendForm.value.effectiveDepartments,
      timeRangeConfig,
      description: autoSendForm.value.description
    }

    let res: any
    if (editingAutoSendRule.value) {
      res = await apiUpdateAutoSendRule(editingAutoSendRule.value.id, data)
    } else {
      res = await apiCreateAutoSendRule(data)
    }

    if (res?.success) {
      ElMessage.success(editingAutoSendRule.value ? '规则已更新' : '规则创建成功')
      showAutoSendDialog.value = false
      loadAutoSendRules()
    } else {
      ElMessage.error(res?.message || '操作失败')
    }
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '操作失败')
  } finally {
    savingAutoSendRule.value = false
  }
}

const handleEditAutoSendRule = (rule: any) => {
  editingAutoSendRule.value = rule
  autoSendForm.value = {
    name: rule.name || '',
    triggerEvent: rule.triggerEvent || '',
    templateId: rule.templateId || '',
    effectiveDepartments: rule.effectiveDepartments || [],
    sendImmediately: rule.timeRangeConfig?.sendImmediately !== false,
    startHour: rule.timeRangeConfig?.startHour != null ? `${String(rule.timeRangeConfig.startHour).padStart(2, '0')}:00` : '08:00',
    endHour: rule.timeRangeConfig?.endHour != null ? `${String(rule.timeRangeConfig.endHour).padStart(2, '0')}:00` : '22:00',
    workdaysOnly: rule.timeRangeConfig?.workdaysOnly || false,
    description: rule.description || ''
  }
  showAutoSendDialog.value = true
}

const handleDeleteAutoSendRule = async (rule: any) => {
  try {
    await ElMessageBox.confirm(`确定删除规则"${rule.name}"？`, '确认删除', { type: 'warning' })
    const res = await apiDeleteAutoSendRule(rule.id) as any
    if (res?.success) {
      ElMessage.success('规则已删除')
      loadAutoSendRules()
    } else {
      ElMessage.error(res?.message || '删除失败')
    }
  } catch { /* cancelled */ }
}

const handleToggleAutoSendRule = async (rule: any) => {
  try {
    const res = await apiToggleAutoSendRule(rule.id) as any
    if (res?.success) {
      ElMessage.success(res.data?.enabled ? '规则已启用' : '规则已禁用')
      loadAutoSendRules()
    } else {
      ElMessage.error(res?.message || '操作失败')
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

const resetAutoSendForm = () => {
  editingAutoSendRule.value = null
  autoSendForm.value = {
    name: '',
    triggerEvent: '',
    templateId: '',
    effectiveDepartments: [],
    sendImmediately: true,
    startHour: '08:00',
    endHour: '22:00',
    workdaysOnly: false,
    description: ''
  }
}

// ==================== 自动发送规则统计详情 ====================
const showAutoSendStatsDialog = ref(false)
const autoSendStatsRule = ref<any>(null)
const autoSendStatsRecords = ref<any[]>([])
const loadingAutoSendStats = ref(false)
const autoSendStatsPage = ref(1)
const autoSendStatsPageSize = ref(10)
const autoSendStatsTotal = ref(0)
const autoSendStatsKeyword = ref('')

const handleAutoSendStatsSearch = () => {
  autoSendStatsPage.value = 1
  loadAutoSendStatsRecords()
}

const handleViewAutoSendStats = (rule: any) => {
  autoSendStatsRule.value = rule
  autoSendStatsPage.value = 1
  autoSendStatsKeyword.value = ''
  showAutoSendStatsDialog.value = true
  loadAutoSendStatsRecords()
}

const loadAutoSendStatsRecords = async (page?: number) => {
  if (page) autoSendStatsPage.value = page
  if (!autoSendStatsRule.value?.id) return
  loadingAutoSendStats.value = true
  try {
    const res = await apiGetAutoSendRuleRecords(autoSendStatsRule.value.id, {
      page: autoSendStatsPage.value,
      pageSize: autoSendStatsPageSize.value,
      keyword: autoSendStatsKeyword.value || undefined
    } as any) as any
    if (res?.success && res.data?.records) {
      autoSendStatsRecords.value = res.data.records
      autoSendStatsTotal.value = res.data.total || 0
    }
  } catch (error) {
    console.warn('加载规则发送记录失败:', error)
  } finally {
    loadingAutoSendStats.value = false
  }
}

// 生命周期
onMounted(() => {
  loadStats()
  loadApprovedTemplates()

  if (userStore.isAdmin) {
    // 管理员加载审核列表
    loadPendingSms()
    loadApprovedSms()
    // 加载自动发送规则
    loadAutoSendRules()
    loadTriggerEvents()
    loadDepartments()
  } else {
    // 非管理员：默认Tab为发送记录
    activeTab.value = 'records'
    // 加载发送记录
    loadSendRecords()
    // 加载审核记录
    loadApprovalRecords()
  }
})

onUnmounted(() => {
  stopQuotaPolling()
})

// 监听标签页变化
watch(activeTab, (newTab) => {
  if (newTab === 'records') {
    loadSendRecords()
  } else if (newTab === 'approvalRecords') {
    loadApprovalRecords()
  } else if (newTab === 'autoSend') {
    loadAutoSendRules()
  }
})
</script>

<style scoped>
.sms-management-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.page-description {
  margin: 5px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.page-subtitle {
  margin: 5px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 10px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  font-size: 32px;
  margin-right: 15px;
}

.stat-card.pending .stat-icon {
  color: #e6a23c;
}

.stat-card.sms .stat-icon {
  color: #409eff;
}

.stat-card.today .stat-icon {
  color: #67c23a;
}

.stat-card.total .stat-icon {
  color: #909399;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.main-content {
  min-height: 600px;
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.sub-tabs {
  margin-top: 20px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.template-item,
.sms-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 15px;
  background: #fff;
}

.template-item.approved,
.sms-item.approved {
  background: #f0f9ff;
  border-color: #b3d8ff;
}

.template-info,
.sms-info {
  flex: 1;
  margin-right: 20px;
}

.template-header,
.sms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.template-name,
.sms-title {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.template-meta,
.sms-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.apply-time,
.approve-time {
  color: #909399;
  font-size: 12px;
}

.template-content,
.sms-content {
  margin-bottom: 10px;
}

.content-text {
  margin: 0 0 10px 0;
  color: #606266;
  line-height: 1.5;
}

.variables {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.variables-label,
.recipients-label,
.desc-label,
.applicant-label,
.approval-label {
  color: #909399;
  font-size: 12px;
}

.variable-tag {
  margin-right: 5px;
}

.template-description {
  margin-bottom: 10px;
}

.desc-text {
  margin: 5px 0 0 0;
  color: #606266;
  font-size: 14px;
}

.applicant-info,
.approval-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #909399;
  font-size: 12px;
}

.applicant-name,
.approval-name {
  color: #303133;
  font-weight: 500;
}

.template-actions,
.sms-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipients {
  display: flex;
  align-items: center;
  gap: 5px;
}

.recipients-count {
  color: #409eff;
  font-weight: 500;
}

/* 对话框样式 */
.template-preview-dialog .template-preview-content,
.sms-detail-dialog .sms-detail-content,
.record-detail_dialog .record-detail-content {
  padding: 10px 0;
}

.template-content-section,
.sms-content-section,
.record-content-section {
  margin: 20px 0;
}

.template-content-section h4,
.sms-content-section h4,
.record-content-section h4,
.variables-section h4,
.recipients-section h4,
.remark-section h4,
.preview-section h4,
.send-details-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
  font-weight: 600;
}

.content-display,
.preview-content,
.remark-content {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.variables-section,
.recipients-section {
  margin: 15px 0;
}

.variables-list,
.recipients-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.variable-tag,
.recipient-tag {
  margin: 0;
}

.more-recipients {
  color: #909399;
  font-size: 12px;
  margin-left: 8px;
}

.preview-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.send-details-section {
  margin-top: 20px;
}

.send-details-section .el-table {
  margin-top: 10px;
}

/* ==================== 短信额度弹窗样式 ==================== */
.quota-overview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px 24px;
  color: #fff;
}

.quota-info-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.quota-info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.qi-label {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 4px;
}

.qi-value {
  font-size: 18px;
  font-weight: 700;
}

.qi-value.price { color: #ffd700; }
.qi-value.used { color: #ffc1c1; }
.qi-value.remain { color: #90ee90; }

.quota-overview :deep(.el-progress__text) { color: #fff !important; }
.quota-overview :deep(.el-progress-bar__outer) { background: rgba(255,255,255,0.25) !important; }

.quota-packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.quota-pkg-card {
  position: relative;
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafbfc;
}

.quota-pkg-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
}

.quota-pkg-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}

.pkg-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.pkg-count {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 4px;
}

.pkg-price {
  font-size: 16px;
  font-weight: 600;
  color: #e6a23c;
}

.pkg-unit {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

.pkg-desc {
  font-size: 11px;
  color: #909399;
  margin-top: 6px;
  line-height: 1.4;
}

.pkg-check {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 20px;
  color: #409eff;
}

.quota-pay-section {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.pay-label {
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.pay-type-btns {
  display: flex;
  gap: 12px;
}

.pay-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #606266;
  background: #fff;
  user-select: none;
}

.pay-type-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.pay-type-btn.active {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
  font-weight: 500;
}

.pay-type-btn .pay-icon {
  font-size: 18px;
}

.quota-buy-btn-wrap {
  margin-top: 20px;
  text-align: center;
}

.quota-qr-section {
  margin-top: 20px;
  text-align: center;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 10px;
}

.qr-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.qr-img-wrap {
  display: inline-block;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.qr-img {
  width: 200px;
  height: 200px;
  display: block;
}

.qr-actions {
  margin-top: 16px;
}

.quota-empty {
  text-align: center;
  padding: 32px 0;
  color: #909399;
  font-size: 14px;
}

.quota-bills-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* ====== 自动发送统计弹窗美化 ====== */
.auto-stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}
.stats-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border-radius: 12px;
  background: #f5f7fa;
  transition: box-shadow 0.2s;
}
.stats-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
.stats-card--primary { background: linear-gradient(135deg, #ecf5ff, #d9ecff); }
.stats-card--primary .stats-card-icon { color: #409eff; }
.stats-card--success { background: linear-gradient(135deg, #f0f9eb, #e1f3d8); }
.stats-card--success .stats-card-icon { color: #67c23a; }
.stats-card--danger { background: linear-gradient(135deg, #fef0f0, #fde2e2); }
.stats-card--danger .stats-card-icon { color: #f56c6c; }
.stats-card--info { background: linear-gradient(135deg, #f4f4f5, #e9e9eb); }
.stats-card--info .stats-card-icon { color: #909399; }
.stats-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255,255,255,0.7);
}
.stats-card-info { flex: 1; }
.stats-card-num {
  font-size: 26px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}
.stats-card-time {
  font-size: 13px !important;
  font-weight: 500 !important;
}
.stats-card-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}
.auto-stats-rule-info {
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #606266;
}
.auto-stats-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.record-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
