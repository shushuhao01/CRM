<template>
  <div class="sms-management">
    <!-- 管理头部 -->
    <div class="management-header">
      <div class="header-content">
        <div class="header-left">
          <h2 class="header-title">短信管理中心</h2>
          <p class="header-subtitle">审核模板申请、管理短信发送和查看统计数据</p>
        </div>
        <div class="header-right">
          <el-button 
            type="primary" 
            :icon="Plus" 
            @click="handleCreateTemplate"
            class="create-btn"
          >
            创建模板
          </el-button>
          <el-button 
            type="success" 
            :icon="Message" 
            @click="handleSendSms"
            class="send-btn"
          >
            发送短信
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="stats-overview">
      <div class="stats-grid">
        <div class="stat-item pending">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingTemplates }}</div>
            <div class="stat-label">待审核模板</div>
          </div>
          <div class="stat-action">
            <el-button 
              size="small" 
              type="warning" 
              @click="activeTab = 'templates'"
              v-if="stats.pendingTemplates > 0"
            >
              立即处理
            </el-button>
          </div>
        </div>
        
        <div class="stat-item sms">
          <div class="stat-icon">
            <el-icon><Message /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.pendingSms }}</div>
            <div class="stat-label">待审核短信</div>
          </div>
          <div class="stat-action">
            <el-button 
              size="small" 
              type="primary" 
              @click="activeTab = 'sms'"
              v-if="stats.pendingSms > 0"
            >
              立即处理
            </el-button>
          </div>
        </div>
        
        <div class="stat-item today">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.todaySent }}</div>
            <div class="stat-label">今日发送</div>
          </div>
        </div>
        
        <div class="stat-item total">
          <div class="stat-icon">
            <el-icon><DataAnalysis /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ stats.totalSent }}</div>
            <div class="stat-label">总发送量</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 管理标签页 -->
    <div class="management-tabs">
      <el-card class="tabs-card">
        <el-tabs v-model="activeTab" class="management-tabs-content">
          <!-- 模板审核 -->
          <el-tab-pane label="模板审核" name="templates">
            <div class="tab-header">
              <div class="tab-title">
                <h3>模板审核</h3>
                <el-badge :value="pendingTemplates.length" class="badge" v-if="pendingTemplates.length > 0" />
              </div>
              <div class="tab-actions">
                <el-input
                  v-model="templateSearch"
                  placeholder="搜索模板"
                  :prefix-icon="Search"
                  clearable
                  style="width: 250px"
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
          
          <!-- 短信审核 -->
          <el-tab-pane label="短信审核" name="sms">
            <div class="tab-header">
              <div class="tab-title">
                <h3>短信审核</h3>
                <el-badge :value="pendingSms.length" class="badge" v-if="pendingSms.length > 0" />
              </div>
              <div class="tab-actions">
                <el-select v-model="smsStatusFilter" placeholder="状态筛选" style="width: 120px; margin-right: 12px;">
                  <el-option label="全部" value="" />
                  <el-option label="待审核" value="pending" />
                  <el-option label="已通过" value="approved" />
                  <el-option label="已拒绝" value="rejected" />
                </el-select>
                <el-input
                  v-model="smsSearch"
                  placeholder="搜索内容或接收人"
                  :prefix-icon="Search"
                  clearable
                  style="width: 250px"
                />
              </div>
            </div>
            
            <div class="sms-list" v-loading="loadingSms">
              <div 
                v-for="sms in filteredPendingSms" 
                :key="sms.id"
                class="sms-item"
                :class="{ 'approved': sms.status === 'approved', 'rejected': sms.status === 'rejected' }"
              >
                <div class="sms-info">
                  <div class="sms-header">
                    <div class="sms-title">
                      <h4>{{ sms.templateName || '自定义内容' }}</h4>
                      <el-tag 
                        :type="getSmsStatusType(sms.status)" 
                        size="small"
                      >
                        {{ getSmsStatusText(sms.status) }}
                      </el-tag>
                    </div>
                    <div class="sms-meta">
                      <span class="recipient-count">{{ sms.recipients.length }} 人</span>
                      <span class="apply-time">{{ formatTime(sms.createdAt) }}</span>
                    </div>
                  </div>
                  
                  <div class="sms-content">
                    <p class="content-text">{{ sms.content }}</p>
                  </div>
                  
                  <div class="recipients-info">
                    <span class="recipients-label">接收人：</span>
                    <div class="recipients-list">
                      <el-tag 
                        v-for="(recipient, index) in sms.recipients.slice(0, 5)" 
                        :key="index"
                        size="small"
                        class="recipient-tag"
                      >
                        {{ recipient.name }} ({{ recipient.phone }})
                      </el-tag>
                      <span v-if="sms.recipients.length > 5" class="more-recipients">
                        等 {{ sms.recipients.length }} 人
                      </span>
                    </div>
                  </div>
                  
                  <div class="sms-reason" v-if="sms.reason">
                    <span class="reason-label">发送原因：</span>
                    <p class="reason-text">{{ sms.reason }}</p>
                  </div>
                  
                  <div class="applicant-info">
                    <span class="applicant-label">申请人：</span>
                    <span class="applicant-name">{{ sms.applicantName }}</span>
                    <span class="applicant-dept">{{ sms.applicantDept }}</span>
                  </div>
                </div>
                
                <div class="sms-actions" v-if="sms.status === 'pending'">
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
                
                <div class="sms-result" v-else>
                  <div class="result-info">
                    <span class="result-label">处理结果：</span>
                    <span class="result-text" :class="sms.status">{{ getSmsStatusText(sms.status) }}</span>
                  </div>
                  <div class="result-time">
                    <span>{{ formatTime(sms.processedAt) }}</span>
                  </div>
                </div>
              </div>
              
              <el-empty 
                v-if="filteredPendingSms.length === 0 && !loadingSms"
                description="暂无短信记录"
                :image-size="120"
              />
            </div>
          </el-tab-pane>
          
          <!-- 发送记录 -->
          <el-tab-pane label="发送记录" name="records">
            <div class="tab-header">
              <div class="tab-title">
                <h3>发送记录</h3>
              </div>
              <div class="tab-actions">
                <el-date-picker
                  v-model="dateRange"
                  type="daterange"
                  range-separator="至"
                  start-placeholder="开始日期"
                  end-placeholder="结束日期"
                  style="margin-right: 12px;"
                />
                <el-select v-model="recordStatusFilter" placeholder="状态筛选" style="width: 120px; margin-right: 12px;">
                  <el-option label="全部" value="" />
                  <el-option label="发送成功" value="success" />
                  <el-option label="发送失败" value="failed" />
                  <el-option label="发送中" value="sending" />
                </el-select>
                <el-button type="primary" :icon="Refresh" @click="loadSendRecords">刷新</el-button>
              </div>
            </div>
            
            <div class="records-table">
              <el-table 
                :data="sendRecords" 
                v-loading="loadingRecords"
                stripe
                style="width: 100%"
              >
                <el-table-column prop="templateName" label="模板名称" width="150">
                  <template #default="{ row }">
                    <span>{{ row.templateName || '自定义内容' }}</span>
                  </template>
                </el-table-column>
                
                <el-table-column prop="content" label="短信内容" min-width="200">
                  <template #default="{ row }">
                    <div class="content-preview">{{ row.content }}</div>
                  </template>
                </el-table-column>
                
                <el-table-column prop="recipientCount" label="接收人数" width="100" align="center">
                  <template #default="{ row }">
                    <span class="recipient-count">{{ row.recipientCount }}</span>
                  </template>
                </el-table-column>
                
                <el-table-column prop="status" label="发送状态" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getRecordStatusType(row.status)" size="small">
                      {{ getRecordStatusText(row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                
                <el-table-column prop="successCount" label="成功/失败" width="100" align="center">
                  <template #default="{ row }">
                    <div class="success-stats">
                      <span class="success">{{ row.successCount }}</span>
                      <span class="divider">/</span>
                      <span class="failed">{{ row.failedCount }}</span>
                    </div>
                  </template>
                </el-table-column>
                
                <el-table-column prop="sentAt" label="发送时间" width="160">
                  <template #default="{ row }">
                    <span>{{ formatTime(row.sentAt) }}</span>
                  </template>
                </el-table-column>
                
                <el-table-column prop="operator" label="操作人" width="120">
                  <template #default="{ row }">
                    <span>{{ row.operator }}</span>
                  </template>
                </el-table-column>
                
                <el-table-column label="操作" width="120" fixed="right">
                  <template #default="{ row }">
                    <el-button 
                      size="small" 
                      type="primary" 
                      :icon="View" 
                      @click="handleViewRecord(row)"
                    >
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <!-- 分页 -->
              <div class="pagination-section">
                <el-pagination
                  v-model:current-page="recordPagination.currentPage"
                  v-model:page-size="recordPagination.pageSize"
                  :page-sizes="[10, 20, 50, 100]"
                  :total="recordPagination.total"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleRecordSizeChange"
                  @current-change="handleRecordCurrentChange"
                />
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <!-- 模板预览对话框 -->
    <el-dialog
      v-model="templatePreviewVisible"
      title="模板预览"
      width="600px"
      class="preview-dialog"
    >
      <div class="template-preview-content" v-if="previewTemplate">
        <div class="preview-header">
          <h4>{{ previewTemplate.name }}</h4>
          <el-tag type="warning">待审核</el-tag>
        </div>
        
        <div class="preview-body">
          <div class="content-section">
            <h5>模板内容</h5>
            <div class="content-display">{{ previewTemplate.content }}</div>
          </div>
          
          <div class="variables-section" v-if="previewTemplate.variables?.length">
            <h5>变量列表</h5>
            <div class="variables-display">
              <el-tag 
                v-for="variable in previewTemplate.variables" 
                :key="variable"
                class="variable-tag"
              >
                {{ variable }}
              </el-tag>
            </div>
          </div>
          
          <div class="meta-section">
            <div class="meta-item">
              <span class="label">分类：</span>
              <span class="value">{{ getCategoryText(previewTemplate.category) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">申请人：</span>
              <span class="value">{{ previewTemplate.applicantName }}</span>
            </div>
            <div class="meta-item">
              <span class="label">申请时间：</span>
              <span class="value">{{ formatTime(previewTemplate.createdAt) }}</span>
            </div>
          </div>
          
          <div class="description-section" v-if="previewTemplate.description">
            <h5>申请说明</h5>
            <div class="description-display">{{ previewTemplate.description }}</div>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 短信详情对话框 -->
    <el-dialog
      v-model="smsDetailVisible"
      title="短信详情"
      width="800px"
      class="detail-dialog"
    >
      <div class="sms-detail-content" v-if="detailSms">
        <div class="detail-header">
          <h4>{{ detailSms.templateName || '自定义短信' }}</h4>
          <el-tag :type="getSmsStatusType(detailSms.status)">
            {{ getSmsStatusText(detailSms.status) }}
          </el-tag>
        </div>
        
        <div class="detail-body">
          <div class="content-section">
            <h5>短信内容</h5>
            <div class="content-display">{{ detailSms.content }}</div>
          </div>
          
          <div class="recipients-section">
            <h5>接收人列表 ({{ detailSms.recipients.length }} 人)</h5>
            <div class="recipients-table">
              <el-table :data="detailSms.recipients" max-height="300">
                <el-table-column prop="name" label="姓名" width="120" />
                <el-table-column prop="phone" label="手机号" width="140" />
                <el-table-column prop="department" label="部门" width="120" />
                <el-table-column prop="status" label="发送状态" width="100">
                  <template #default="{ row }">
                    <el-tag 
                      :type="row.status === 'success' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'" 
                      size="small"
                    >
                      {{ row.status === 'success' ? '成功' : row.status === 'failed' ? '失败' : '待发送' }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          
          <div class="meta-section">
            <div class="meta-item">
              <span class="label">申请人：</span>
              <span class="value">{{ detailSms.applicantName }}</span>
            </div>
            <div class="meta-item">
              <span class="label">申请部门：</span>
              <span class="value">{{ detailSms.applicantDept }}</span>
            </div>
            <div class="meta-item">
              <span class="label">申请时间：</span>
              <span class="value">{{ formatTime(detailSms.createdAt) }}</span>
            </div>
            <div class="meta-item" v-if="detailSms.processedAt">
              <span class="label">处理时间：</span>
              <span class="value">{{ formatTime(detailSms.processedAt) }}</span>
            </div>
          </div>
          
          <div class="reason-section" v-if="detailSms.reason">
            <h5>发送原因</h5>
            <div class="reason-display">{{ detailSms.reason }}</div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, Message, Clock, TrendCharts, DataAnalysis, Search, 
  Check, Close, View, Refresh
} from '@element-plus/icons-vue'

// 响应式数据
const activeTab = ref('templates')
const loadingTemplates = ref(false)
const loadingSms = ref(false)
const loadingRecords = ref(false)
const templatePreviewVisible = ref(false)
const smsDetailVisible = ref(false)

// 搜索和筛选
const templateSearch = ref('')
const smsSearch = ref('')
const smsStatusFilter = ref('')
const recordStatusFilter = ref('')
const dateRange = ref<[Date, Date] | null>(null)

interface SmsTemplate {
  id: string
  name: string
  content: string
  category: string
  status: string
  createTime: string
  createdBy: string
}

interface SmsRecord {
  id: string
  templateId: string
  recipients: Array<{ name: string; phone: string }>
  content: string
  status: string
  createTime: string
  sendTime?: string
  createdBy: string
}

interface SendRecord {
  id: string
  templateName: string
  recipients: string
  status: string
  sendTime: string
  createdBy: string
}

// 预览数据
const previewTemplate = ref<SmsTemplate | null>(null)
const detailSms = ref<SmsRecord | null>(null)

// 统计数据
const stats = reactive({
  pendingTemplates: 0,
  pendingSms: 0,
  todaySent: 0,
  totalSent: 0
})

// 数据列表
const pendingTemplates = ref<SmsTemplate[]>([])
const pendingSms = ref<SmsRecord[]>([])
const sendRecords = ref<SendRecord[]>([])

// 分页
const recordPagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 计算属性
const filteredPendingTemplates = computed(() => {
  if (!templateSearch.value) return pendingTemplates.value
  
  const keyword = templateSearch.value.toLowerCase()
  return pendingTemplates.value.filter(template =>
    template.name.toLowerCase().includes(keyword) ||
    template.content.toLowerCase().includes(keyword) ||
    template.applicantName.toLowerCase().includes(keyword)
  )
})

const filteredPendingSms = computed(() => {
  let result = pendingSms.value

  if (smsStatusFilter.value) {
    result = result.filter(sms => sms.status === smsStatusFilter.value)
  }

  if (smsSearch.value) {
    const keyword = smsSearch.value.toLowerCase()
    result = result.filter(sms =>
      sms.content.toLowerCase().includes(keyword) ||
      sms.applicantName.toLowerCase().includes(keyword) ||
      sms.recipients.some((r: { name: string; phone: string }) => 
        r.name.toLowerCase().includes(keyword) || 
        r.phone.includes(keyword)
      )
    )
  }

  return result
})

// 方法
const loadData = async () => {
  await Promise.all([
    loadPendingTemplates(),
    loadPendingSms(),
    loadSendRecords(),
    loadStats()
  ])
}

const loadPendingTemplates = async () => {
  loadingTemplates.value = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    
    pendingTemplates.value = [
      {
        id: '1',
        name: '营销推广模板',
        content: '【限时优惠】{name}，{product}现在只要{price}元！立即购买享受{discount}折优惠，活动截止{endTime}。',
        category: 'marketing',
        variables: ['name', 'product', 'price', 'discount', 'endTime'],
        description: '用于产品促销活动的短信推广，需要向客户发送优惠信息',
        applicantName: '张三',
        applicantDept: '市场部',
        createdAt: '2024-01-22 11:20:00'
      },
      {
        id: '2',
        name: '会议通知模板',
        content: '尊敬的{name}，您有一场会议将于{time}在{location}举行，主题：{topic}，请准时参加。',
        category: 'notification',
        variables: ['name', 'time', 'location', 'topic'],
        description: '用于公司内部会议通知，提醒员工参加重要会议',
        applicantName: '李四',
        applicantDept: '行政部',
        createdAt: '2024-01-21 15:30:00'
      }
    ]
  } catch (error) {
    ElMessage.error('加载待审核模板失败')
  } finally {
    loadingTemplates.value = false
  }
}

const loadPendingSms = async () => {
  loadingSms.value = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    
    pendingSms.value = [
      {
        id: '1',
        templateName: '验证码模板',
        content: '您的验证码是123456，请在5分钟内使用，请勿泄露给他人。',
        recipients: [
          { name: '王五', phone: '13800138001', department: '技术部', status: 'pending' },
          { name: '赵六', phone: '13800138002', department: '产品部', status: 'pending' }
        ],
        reason: '系统测试需要发送验证码',
        status: 'pending',
        applicantName: '王五',
        applicantDept: '技术部',
        createdAt: '2024-01-22 14:30:00'
      },
      {
        id: '2',
        templateName: '订单通知',
        content: '您的订单ORD123456已确认，金额299元，预计明天送达。',
        recipients: [
          { name: '客户A', phone: '13900139001', department: '客户', status: 'pending' },
          { name: '客户B', phone: '13900139002', department: '客户', status: 'pending' },
          { name: '客户C', phone: '13900139003', department: '客户', status: 'pending' }
        ],
        reason: '订单确认通知，需要及时告知客户',
        status: 'approved',
        applicantName: '李四',
        applicantDept: '销售部',
        createdAt: '2024-01-21 16:45:00',
        processedAt: '2024-01-21 17:00:00'
      }
    ]
  } catch (error) {
    ElMessage.error('加载短信申请失败')
  } finally {
    loadingSms.value = false
  }
}

const loadSendRecords = async () => {
  loadingRecords.value = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    
    sendRecords.value = [
      {
        id: '1',
        templateName: '验证码模板',
        content: '您的验证码是123456，请在5分钟内使用，请勿泄露给他人。',
        recipientCount: 150,
        status: 'success',
        successCount: 148,
        failedCount: 2,
        sentAt: '2024-01-22 10:30:00',
        operator: '管理员'
      },
      {
        id: '2',
        templateName: '订单通知',
        content: '您的订单已确认，请注意查收。',
        recipientCount: 89,
        status: 'success',
        successCount: 89,
        failedCount: 0,
        sentAt: '2024-01-21 15:20:00',
        operator: '张三'
      }
    ]
    
    recordPagination.total = sendRecords.value.length
  } catch (error) {
    ElMessage.error('加载发送记录失败')
  } finally {
    loadingRecords.value = false
  }
}

const loadStats = async () => {
  try {
    // 模拟统计数据
    stats.pendingTemplates = pendingTemplates.value.length
    stats.pendingSms = pendingSms.value.filter(sms => sms.status === 'pending').length
    stats.todaySent = 1250
    stats.totalSent = 15680
  } catch (error) {
    ElMessage.error('加载统计数据失败')
  }
}

// 模板审核
const handleApproveTemplate = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确定要审核通过这个模板吗？', '确认审核', {
      type: 'warning'
    })
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const index = pendingTemplates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      pendingTemplates.value.splice(index, 1)
      stats.pendingTemplates--
    }
    
    ElMessage.success('模板审核通过')
    
    // 发送通知给申请人
    // await notifyUser(template.applicantId, 'template_approved', template)
    
  } catch (error) {
    // 用户取消
  }
}

const handleRejectTemplate = async (template: SmsTemplate) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.{5,}/,
      inputErrorMessage: '拒绝原因至少5个字符'
    })
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const index = pendingTemplates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      pendingTemplates.value.splice(index, 1)
      stats.pendingTemplates--
    }
    
    ElMessage.success('模板已拒绝')
    
    // 发送通知给申请人
    // await notifyUser(template.applicantId, 'template_rejected', { ...template, rejectReason: reason })
    
  } catch (error) {
    // 用户取消
  }
}

const handlePreviewTemplate = (template: SmsTemplate) => {
  previewTemplate.value = template
  templatePreviewVisible.value = true
}

// 短信审核
const handleApproveSms = async (sms: SmsRecord) => {
  try {
    await ElMessageBox.confirm('确定要审核通过这条短信申请吗？', '确认审核', {
      type: 'warning'
    })
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sms.status = 'approved'
    sms.processedAt = new Date().toLocaleString()
    stats.pendingSms--
    
    ElMessage.success('短信申请已通过，将立即发送')
    
    // 发送短信
    // await sendSms(sms)
    
  } catch (error) {
    // 用户取消
  }
}

const handleRejectSms = async (sms: SmsRecord) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.{5,}/,
      inputErrorMessage: '拒绝原因至少5个字符'
    })
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    sms.status = 'rejected'
    sms.processedAt = new Date().toLocaleString()
    sms.rejectReason = reason
    stats.pendingSms--
    
    ElMessage.success('短信申请已拒绝')
    
    // 发送通知给申请人
    // await notifyUser(sms.applicantId, 'sms_rejected', { ...sms, rejectReason: reason })
    
  } catch (error) {
    // 用户取消
  }
}

const handlePreviewSms = (sms: SmsRecord) => {
  detailSms.value = sms
  smsDetailVisible.value = true
}

// 其他操作
const handleCreateTemplate = () => {
  // 跳转到模板创建页面
  ElMessage.info('跳转到模板创建页面')
}

const handleSendSms = () => {
  // 打开短信发送对话框
  ElMessage.info('打开短信发送对话框')
}

const handleViewRecord = (record: SendRecord) => {
  // 查看发送记录详情
  ElMessage.info('查看发送记录详情')
}

const handleRecordSizeChange = (size: number) => {
  recordPagination.pageSize = size
  loadSendRecords()
}

const handleRecordCurrentChange = (page: number) => {
  recordPagination.currentPage = page
  loadSendRecords()
}

// 工具方法
const getCategoryText = (category: string) => {
  const texts: Record<string, string> = {
    marketing: '营销推广',
    notification: '系统通知',
    verification: '验证码',
    order: '订单提醒'
  }
  return texts[category] || '其他'
}

const getSmsStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getSmsStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status] || '未知'
}

const getRecordStatusType = (status: string) => {
  const types: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    sending: 'warning'
  }
  return types[status] || 'info'
}

const getRecordStatusText = (status: string) => {
  const texts: Record<string, string> = {
    success: '发送成功',
    failed: '发送失败',
    sending: '发送中'
  }
  return texts[status] || '未知'
}

const formatTime = (time: string) => {
  return time || '-'
}

// 生命周期
onMounted(() => {
  loadData()
})

// 监听标签页变化
watch(activeTab, (newTab) => {
  if (newTab === 'records') {
    loadSendRecords()
  }
})
</script>

<style scoped>
.sms-management {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

/* 管理头部 */
.management-header {
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.header-left .header-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-left .header-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.header-right {
  display: flex;
  gap: 12px;
}

.create-btn, .send-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.create-btn:hover, .send-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* 统计概览 */
.stats-overview {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.stat-item.pending {
  border-left-color: #e6a23c;
}

.stat-item.sms {
  border-left-color: #409eff;
}

.stat-item.today {
  border-left-color: #67c23a;
}

.stat-item.total {
  border-left-color: #f56c6c;
}

.stat-icon {
  margin-right: 16px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  font-size: 24px;
}

.stat-item.pending .stat-icon {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.stat-item.today .stat-icon {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.stat-item.total .stat-icon {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.stat-action {
  margin-left: 16px;
}

/* 管理标签页 */
.management-tabs {
  margin-bottom: 24px;
}

.tabs-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.management-tabs-content :deep(.el-tabs__header) {
  margin: 0;
  border-bottom: 1px solid #e4e7ed;
}

.management-tabs-content :deep(.el-tabs__nav-wrap) {
  padding: 0 24px;
}

.management-tabs-content :deep(.el-tabs__content) {
  padding: 24px;
}

/* 标签页头部 */
.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.tab-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tab-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.badge {
  margin-left: 8px;
}

.tab-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 模板列表 */
.templates-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.template-item {
  display: flex;
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  padding: 20px;
  transition: all 0.3s ease;
}

.template-item:hover {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
}

.template-info {
  flex: 1;
  margin-right: 20px;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.apply-time {
  font-size: 12px;
  color: #909399;
}

.template-content {
  margin-bottom: 12px;
}

.content-text {
  margin: 0 0 8px 0;
  color: #606266;
  line-height: 1.6;
}

.variables {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.variables-label {
  font-size: 12px;
  color: #909399;
}

.variable-tag {
  font-size: 10px;
  padding: 2px 6px;
}

.template-description {
  margin-bottom: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.desc-label {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
}

.desc-text {
  margin: 4px 0 0 0;
  color: #606266;
  line-height: 1.5;
}

.applicant-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.applicant-label {
  font-weight: 600;
}

.applicant-name {
  color: #409eff;
  font-weight: 600;
}

.applicant-dept {
  color: #606266;
}

.template-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
}

.approve-btn, .reject-btn, .preview-btn {
  width: 100%;
}

/* 短信列表 */
.sms-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sms-item {
  display: flex;
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  padding: 20px;
  transition: all 0.3s ease;
}

.sms-item:hover {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
}

.sms-item.approved {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 100%);
}

.sms-item.rejected {
  border-color: #f56c6c;
  background: linear-gradient(135deg, #fef0f0 0%, #ffffff 100%);
}

.sms-info {
  flex: 1;
  margin-right: 20px;
}

.sms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sms-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sms-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.sms-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.recipient-count {
  color: #409eff;
  font-weight: 600;
}

.recipients-info {
  margin-bottom: 12px;
}

.recipients-label {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
}

.recipients-list {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.recipient-tag {
  font-size: 10px;
  padding: 2px 8px;
}

.more-recipients {
  font-size: 12px;
  color: #909399;
}

.sms-reason {
  margin-bottom: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.reason-label {
  font-size: 12px;
  color: #909399;
  font-weight: 600;
}

.reason-text {
  margin: 4px 0 0 0;
  color: #606266;
  line-height: 1.5;
}

.sms-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
}

.sms-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 120px;
  align-items: flex-end;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-label {
  font-size: 12px;
  color: #909399;
}

.result-text {
  font-size: 12px;
  font-weight: 600;
}

.result-text.approved {
  color: #67c23a;
}

.result-text.rejected {
  color: #f56c6c;
}

.result-time {
  font-size: 12px;
  color: #909399;
}

/* 发送记录 */
.records-table {
  background: white;
  border-radius: 12px;
}

.content-preview {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #606266;
}

.success-stats {
  display: flex;
  align-items: center;
  gap: 4px;
}

.success-stats .success {
  color: #67c23a;
  font-weight: 600;
}

.success-stats .failed {
  color: #f56c6c;
  font-weight: 600;
}

.success-stats .divider {
  color: #909399;
}

.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 对话框样式 */
.preview-dialog :deep(.el-dialog),
.detail-dialog :deep(.el-dialog) {
  border-radius: 16px;
}

.template-preview-content,
.sms-detail-content {
  padding: 8px;
}

.preview-header,
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h4,
.detail-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.preview-body h5,
.detail-body h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.content-display,
.description-display,
.reason-display {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
  color: #303133;
}

.variables-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
}

.meta-item .label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.meta-item .value {
  color: #303133;
}

.recipients-table {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sms-management {
    padding: 16px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
    padding: 24px;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .tab-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .tab-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .template-item,
  .sms-item {
    flex-direction: column;
  }
  
  .template-info,
  .sms-info {
    margin-right: 0;
    margin-bottom: 16px;
  }
  
  .template-actions,
  .sms-actions {
    flex-direction: row;
    min-width: auto;
  }
  
  .meta-section {
    grid-template-columns: 1fr;
  }
}

/* 动画效果 */
.template-item,
.sms-item {
  animation: fadeInUp 0.3s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>