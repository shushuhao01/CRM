<template>
  <div class="sms-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">短信管理</h2>
        <p class="page-description">管理短信模板和发送记录，审核短信申请</p>
      </div>
      <div class="header-actions">
        <el-button type="info" @click="handleTemplateManagement">
          <el-icon><Setting /></el-icon>
          模板管理
        </el-button>
        <el-button type="primary" @click="handleCreateTemplate">
          <el-icon><Plus /></el-icon>
          创建短信模板
        </el-button>
        <el-button type="success" @click="handleSendSms">
          <el-icon><Message /></el-icon>
          发送短信
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
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
        <el-col :span="6">
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
        <el-col :span="6">
          <el-card class="stat-card today">
            <div class="stat-content">
              <div class="stat-icon">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.todaySent }}</div>
                <div class="stat-label">今日发送</div>
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
                <div class="stat-label">总发送量</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <el-card class="main-content">
      <el-tabs v-model="activeTab" class="sms-tabs">
        <!-- 模板审核 -->
        <el-tab-pane name="templates">
          <template #label>
            <span class="tab-label">
              模板审核
              <el-badge :value="pendingTemplatesCount" :hidden="pendingTemplatesCount === 0" />
            </span>
          </template>

          <!-- 子标签页：待审核和审核通过 -->
          <el-tabs v-model="templateSubTab" type="card" class="sub-tabs">
            <el-tab-pane label="待审核" name="pending">
              <div class="tab-header">
                <div class="tab-actions">
                  <el-input
                    v-model="templateSearch"
                    placeholder="搜索模板名称、申请人"
                    :prefix-icon="Search"
                    clearable
                    style="width: 300px"
                  />
                </div>
              </div>

              <div class="templates-list" v-loading="loadingTemplates">
                <div
                  v-for="template in filteredPendingTemplates"
                  :key="template.id"
                  class="template-item"
                >
                  <div class="template-info">
                    <div class="template-header">
                      <h4 class="template-name">{{ template.name }}</h4>
                      <div class="template-meta">
                        <el-tag size="small" type="info">{{ getCategoryText(template.category) }}</el-tag>
                        <span class="apply-time">{{ formatTime(template.createdAt) }}</span>
                      </div>
                    </div>

                    <div class="template-content">
                      <p class="content-text">{{ template.content }}</p>
                      <div class="variables" v-if="template.variables?.length">
                        <span class="variables-label">变量：</span>
                        <el-tag
                          v-for="variable in template.variables"
                          :key="variable"
                          size="small"
                          class="variable-tag"
                        >
                          {{ variable }}
                        </el-tag>
                      </div>
                    </div>

                    <div class="template-description" v-if="template.description">
                      <span class="desc-label">申请说明：</span>
                      <p class="desc-text">{{ template.description }}</p>
                    </div>

                    <div class="applicant-info">
                      <span class="applicant-label">申请人：</span>
                      <span class="applicant-name">{{ template.applicantName }}</span>
                      <span class="applicant-dept">{{ template.applicantDept }}</span>
                    </div>
                  </div>

                  <div class="template-actions">
                    <el-button
                      type="success"
                      :icon="Check"
                      @click="handleApproveTemplate(template)"
                      class="approve-btn"
                    >
                      通过
                    </el-button>
                    <el-button
                      type="danger"
                      :icon="Close"
                      @click="handleRejectTemplate(template)"
                      class="reject-btn"
                    >
                      拒绝
                    </el-button>
                    <el-button
                      type="info"
                      :icon="View"
                      @click="handlePreviewTemplate(template)"
                      class="preview-btn"
                    >
                      预览
                    </el-button>
                  </div>
                </div>

                <el-empty
                  v-if="filteredPendingTemplates.length === 0 && !loadingTemplates"
                  description="暂无待审核模板"
                  :image-size="120"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane label="审核通过" name="approved">
              <div class="tab-header">
                <div class="tab-actions">
                  <el-input
                    v-model="approvedTemplateSearch"
                    placeholder="搜索已通过模板"
                    :prefix-icon="Search"
                    clearable
                    style="width: 300px"
                  />
                </div>
              </div>

              <div class="templates-list" v-loading="loadingApprovedTemplates">
                <div
                  v-for="template in filteredApprovedTemplates"
                  :key="template.id"
                  class="template-item approved"
                >
                  <div class="template-info">
                    <div class="template-header">
                      <h4 class="template-name">{{ template.name }}</h4>
                      <div class="template-meta">
                        <el-tag size="small" type="success">已通过</el-tag>
                        <el-tag size="small" type="info">{{ getCategoryText(template.category) }}</el-tag>
                        <span class="approve-time">{{ formatTime(template.approvedAt) }}</span>
                      </div>
                    </div>

                    <div class="template-content">
                      <p class="content-text">{{ template.content }}</p>
                    </div>

                    <div class="approval-info">
                      <span class="approval-label">审核人：</span>
                      <span class="approval-name">{{ template.approvedBy }}</span>
                      <span class="approval-time">{{ formatTime(template.approvedAt) }}</span>
                    </div>
                  </div>

                  <div class="template-actions">
                    <el-button
                      type="primary"
                      :icon="View"
                      @click="handlePreviewTemplate(template)"
                      size="small"
                    >
                      查看
                    </el-button>
                  </div>
                </div>

                <el-empty
                  v-if="filteredApprovedTemplates.length === 0 && !loadingApprovedTemplates"
                  description="暂无已通过模板"
                  :image-size="120"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-tab-pane>

        <!-- 短信审核 -->
        <el-tab-pane name="sms">
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
                    placeholder="搜索短信内容、申请人"
                    :prefix-icon="Search"
                    clearable
                    style="width: 300px"
                  />
                </div>
              </div>

              <div class="sms-list" v-loading="loadingSms">
                <div
                  v-for="sms in filteredPendingSms"
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
                  v-if="filteredPendingSms.length === 0 && !loadingSms"
                  description="暂无待审核短信"
                  :image-size="120"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane label="审核通过" name="approved">
              <div class="tab-header">
                <div class="tab-actions">
                  <el-input
                    v-model="approvedSmsSearch"
                    placeholder="搜索已通过短信"
                    :prefix-icon="Search"
                    clearable
                    style="width: 300px"
                  />
                </div>
              </div>

              <div class="sms-list" v-loading="loadingApprovedSms">
                <div
                  v-for="sms in filteredApprovedSms"
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
                  v-if="filteredApprovedSms.length === 0 && !loadingApprovedSms"
                  description="暂无已通过短信"
                  :image-size="120"
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
                style="margin-right: 10px"
              />
              <el-input
                v-model="recordSearch"
                placeholder="搜索发送记录"
                :prefix-icon="Search"
                clearable
                style="width: 300px"
              />
            </div>
          </div>

          <el-table :data="filteredRecords" v-loading="loadingRecords">
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
          <el-table :data="detailRecord.sendDetails || []" max-height="300">
            <el-table-column prop="phone" label="手机号" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.status === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="sentAt" label="发送时间" width="150" />
            <el-table-column prop="errorMsg" label="失败原因" show-overflow-tooltip />
          </el-table>
        </div>
      </div>

      <template #footer>
        <el-button @click="showRecordDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Message,
  Setting,
  Clock,
  TrendCharts,
  DataAnalysis,
  Search,
  Check,
  Close,
  View
} from '@element-plus/icons-vue'
import CreateTemplateDialog from '@/components/CreateTemplateDialog.vue'
import SendSmsDialog from '@/components/SendSmsDialog.vue'
import * as smsApi from '@/api/sms'
import type { SmsTemplate, SmsRequest, SendRecord, SmsStatistics } from '@/api/sms'

// 接口定义
interface SmsTemplate {
  id: string
  name: string
  category: string
  content: string
  variables: string[]
  description?: string
  applicant: string
  applicantName: string
  applicantDept: string
  createdAt: string
  status: string
  approvedBy?: string
  approvedAt?: string
}

interface SmsRequest {
  id: string
  templateName: string
  content: string
  recipients: string[]
  recipientCount: number
  applicant: string
  applicantName: string
  applicantDept: string
  createdAt: string
  status: string
  remark?: string
  approvedBy?: string
  approvedAt?: string
}

interface SendRecord {
  id: string
  templateName: string
  content: string
  recipientCount: number
  successCount: number
  failCount: number
  status: string
  sentAt: string
  sendDetails?: SendDetail[]
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
  recipients: string[]
  content: string
  remark: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const activeTab = ref('templates')
const templateSubTab = ref('pending')
const smsSubTab = ref('pending')

// 搜索相关
const templateSearch = ref('')
const approvedTemplateSearch = ref('')
const smsSearch = ref('')
const approvedSmsSearch = ref('')
const recordSearch = ref('')
const recordDateRange = ref([])

// 加载状态
const loadingTemplates = ref(false)
const loadingApprovedTemplates = ref(false)
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
const previewTemplate = ref(null)
const detailSms = ref(null)
const detailRecord = ref(null)

// 统计数据
const stats = ref<SmsStatistics>({
  pendingTemplates: 0,
  pendingSms: 0,
  todaySent: 0,
  totalSent: 0
})

// 模板数据
const pendingTemplates = ref<SmsTemplate[]>([])
const approvedTemplates = ref<SmsTemplate[]>([])

// 短信数据
const pendingSms = ref<SmsRequest[]>([])
const approvedSms = ref<SmsRequest[]>([])

// 发送记录
const sendRecords = ref<SendRecord[]>([])

// 计算属性
const pendingTemplatesCount = computed(() => pendingTemplates.value.length)
const pendingSmsCount = computed(() => pendingSms.value.length)

const filteredPendingTemplates = computed(() => {
  if (!templateSearch.value) return pendingTemplates.value
  return pendingTemplates.value.filter(template =>
    template.name.includes(templateSearch.value) ||
    template.applicantName.includes(templateSearch.value)
  )
})

const filteredApprovedTemplates = computed(() => {
  if (!approvedTemplateSearch.value) return approvedTemplates.value
  return approvedTemplates.value.filter(template =>
    template.name.includes(approvedTemplateSearch.value)
  )
})

const filteredPendingSms = computed(() => {
  if (!smsSearch.value) return pendingSms.value
  return pendingSms.value.filter(sms =>
    sms.templateName.includes(smsSearch.value) ||
    sms.content.includes(smsSearch.value) ||
    sms.applicantName.includes(smsSearch.value)
  )
})

const filteredApprovedSms = computed(() => {
  if (!approvedSmsSearch.value) return approvedSms.value
  return approvedSms.value.filter(sms =>
    sms.templateName.includes(approvedSmsSearch.value) ||
    sms.content.includes(approvedSmsSearch.value)
  )
})

const filteredRecords = computed(() => {
  if (!recordSearch.value) return sendRecords.value
  return sendRecords.value.filter(record =>
    record.templateName.includes(recordSearch.value) ||
    record.content.includes(recordSearch.value)
  )
})

// 方法
const handleCreateTemplate = () => {
  showCreateTemplateDialog.value = true
}

const handleSendSms = () => {
  showSendSmsDialog.value = true
}

const handleTemplateManagement = () => {
  safeNavigator.push('/system/sms-templates')
}

const handleTemplateSubmit = (data: TemplateSubmitData) => {
  console.log('模板提交数据:', data)
  // 这里可以调用API提交模板数据
  // 如果是申请模板，添加到待审核列表
  if (data.mode === 'apply') {
    pendingTemplates.value.unshift({
      id: Date.now().toString(),
      name: data.name,
      category: data.category,
      content: data.content,
      variables: data.variables,
      description: data.description,
      applicantName: '当前用户', // 实际应该从用户信息获取
      applicantDept: '当前部门',
      createdAt: new Date().toLocaleString()
    })
  }
  showCreateTemplateDialog.value = false
}

const handleSmsSubmit = (data: SmsSubmitData) => {
  console.log('短信发送数据:', data)
  // 这里可以调用API发送短信
  showSendSmsDialog.value = false
}

const handleApproveTemplate = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确认通过此模板申请？', '确认操作', {
      type: 'warning'
    })

    // 移除待审核列表
    const index = pendingTemplates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      pendingTemplates.value.splice(index, 1)
      // 添加到已通过列表
      approvedTemplates.value.unshift({
        ...template,
        approvedBy: '当前用户',
        approvedAt: new Date().toLocaleString()
      })
    }

    ElMessage.success('模板审核通过')
  } catch {
    // 用户取消
  }
}

const handleRejectTemplate = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确认拒绝此模板申请？', '确认操作', {
      type: 'warning'
    })

    // 移除待审核列表
    const index = pendingTemplates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      pendingTemplates.value.splice(index, 1)
    }

    ElMessage.success('模板申请已拒绝')
  } catch {
    // 用户取消
  }
}

const handleApproveSms = async (sms: SmsRequest) => {
  try {
    await ElMessageBox.confirm('确认通过此短信发送申请？', '确认操作', {
      type: 'warning'
    })

    // 移除待审核列表
    const index = pendingSms.value.findIndex(s => s.id === sms.id)
    if (index > -1) {
      pendingSms.value.splice(index, 1)
      // 添加到已通过列表
      approvedSms.value.unshift({
        ...sms,
        approvedBy: '当前用户',
        approvedAt: new Date().toLocaleString()
      })
    }

    ElMessage.success('短信发送申请已通过')
  } catch {
    // 用户取消
  }
}

const handleRejectSms = async (sms: SmsRequest) => {
  try {
    await ElMessageBox.confirm('确认拒绝此短信发送申请？', '确认操作', {
      type: 'warning'
    })

    // 移除待审核列表
    const index = pendingSms.value.findIndex(s => s.id === sms.id)
    if (index > -1) {
      pendingSms.value.splice(index, 1)
    }

    ElMessage.success('短信发送申请已拒绝')
  } catch {
    // 用户取消
  }
}

const handlePreviewTemplate = (template: SmsTemplate) => {
  previewTemplate.value = template
  showTemplatePreviewDialog.value = true
}

const handlePreviewSms = (sms: SmsRequest) => {
  detailSms.value = sms
  showSmsDetailDialog.value = true
}

const handleViewRecord = (record: SendRecord) => {
  // 模拟发送详情数据
  detailRecord.value = {
    ...record,
    sendDetails: [
      { phone: '138****8001', status: 'success', sentAt: '2024-01-15 10:30:01', errorMsg: '' },
      { phone: '138****8002', status: 'success', sentAt: '2024-01-15 10:30:02', errorMsg: '' },
      { phone: '138****8003', status: 'failed', sentAt: '2024-01-15 10:30:03', errorMsg: '号码无效' },
      { phone: '138****8004', status: 'success', sentAt: '2024-01-15 10:30:04', errorMsg: '' },
      { phone: '138****8005', status: 'failed', sentAt: '2024-01-15 10:30:05', errorMsg: '余额不足' }
    ]
  }
  showRecordDetailDialog.value = true
}

// 获取模板预览内容
const getPreviewContent = (template: SmsTemplate) => {
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

  // 替换变量为示例值
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
    service: '客服通知'
  }
  return categoryMap[category] || category
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    completed: 'success',
    failed: 'danger',
    sending: 'warning'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    completed: '发送完成',
    failed: '发送失败',
    sending: '发送中'
  }
  return statusMap[status] || status
}

const formatTime = (time: string) => {
  return time
}

onMounted(() => {
  // 初始化数据
  loadApprovedTemplates()
})

// 加载审核通过的模板
const loadApprovedTemplates = () => {
  // 从mock数据获取所有active状态的模板
  const mockTemplates = [
    {
      id: 1,
      name: '客户回访模板',
      category: 'service',
      content: '尊敬的{customerName}，感谢您对我们产品的支持，我们将为您提供更好的服务。如有任何问题，请联系我们：{phone}',
      variables: ['customerName', 'phone'],
      status: 'approved',
      usage: 156
    },
    {
      id: 2,
      name: '促销活动模板',
      category: 'marketing',
      content: '【{companyName}】新年大促销！全场商品{discount}折起，活动时间：{startDate}至{endDate}，详情咨询客服。',
      variables: ['companyName', 'discount', 'startDate', 'endDate'],
      status: 'approved',
      usage: 89
    },
    {
      id: 3,
      name: '验证码模板',
      category: 'verification',
      content: '您的验证码是：{code}，请在{minutes}分钟内使用，请勿泄露给他人。',
      variables: ['code', 'minutes'],
      status: 'approved',
      usage: 1234
    },
    {
      id: 4,
      name: '订单确认通知',
      category: 'notification',
      content: '【{companyName}】您的订单{orderNo}已确认，商品：{productName}，金额：{amount}元，预计{deliveryDate}发货。',
      variables: ['companyName', 'orderNo', 'productName', 'amount', 'deliveryDate'],
      status: 'approved',
      usage: 892
    },
    {
      id: 5,
      name: '发货通知模板',
      category: 'notification',
      content: '【{companyName}】您的订单{orderNo}已发货，快递单号：{trackingNo}，请注意查收。物流查询：{trackingUrl}',
      variables: ['companyName', 'orderNo', 'trackingNo', 'trackingUrl'],
      status: 'approved',
      usage: 756
    },
    {
      id: 6,
      name: '付款提醒模板',
      category: 'notification',
      content: '尊敬的{customerName}，您的订单{orderNo}待付款，金额{amount}元，请及时完成支付。如有疑问请联系客服。',
      variables: ['customerName', 'orderNo', 'amount'],
      status: 'approved',
      usage: 423
    },
    {
      id: 7,
      name: '会议通知模板',
      category: 'notification',
      content: '【会议通知】{meetingTitle}将于{meetingDate} {meetingTime}在{location}举行，请准时参加。联系人：{contact}',
      variables: ['meetingTitle', 'meetingDate', 'meetingTime', 'location', 'contact'],
      status: 'approved',
      usage: 234
    },
    {
      id: 8,
      name: '生日祝福模板',
      category: 'marketing',
      content: '亲爱的{customerName}，今天是您的生日，{companyName}全体员工祝您生日快乐！特为您准备了生日礼品，请到店领取。',
      variables: ['customerName', 'companyName'],
      status: 'approved',
      usage: 67
    },
    {
      id: 9,
      name: '服务预约确认',
      category: 'service',
      content: '【{companyName}】您预约的{serviceName}服务已确认，时间：{appointmentDate} {appointmentTime}，地址：{address}，联系电话：{phone}',
      variables: ['companyName', 'serviceName', 'appointmentDate', 'appointmentTime', 'address', 'phone'],
      status: 'approved',
      usage: 345
    },
    {
      id: 10,
      name: '账户余额提醒',
      category: 'notification',
      content: '【{companyName}】您的账户余额为{balance}元，余额不足可能影响服务使用，请及时充值。充值热线：{phone}',
      variables: ['companyName', 'balance', 'phone'],
      status: 'approved',
      usage: 178
    },
    {
      id: 11,
      name: '密码重置通知',
      category: 'notification',
      content: '【{companyName}】您的账户密码已重置，新密码：{newPassword}，请及时登录修改。如非本人操作，请联系客服：{phone}',
      variables: ['companyName', 'newPassword', 'phone'],
      status: 'approved',
      usage: 89
    },
    {
      id: 12,
      name: '活动邀请模板',
      category: 'marketing',
      content: '【{companyName}】诚邀您参加{eventName}，时间：{eventDate}，地点：{venue}。精彩活动，丰厚奖品等您来！报名电话：{phone}',
      variables: ['companyName', 'eventName', 'eventDate', 'venue', 'phone'],
      status: 'approved',
      usage: 123
    }
  ]

  approvedTemplates.value = mockTemplates
}
</script>

<style scoped>
.sms-management-page {
  padding: 20px;
}

.page-header {
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

.page-subtitle {
  margin: 5px 0 0 0;
  color: #909399;
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
.record-detail-dialog .record-detail-content {
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
</style>
