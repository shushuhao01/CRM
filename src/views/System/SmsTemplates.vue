<template>
  <div class="sms-templates-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="page-title">短信模板管理</h1>
          <p class="page-subtitle">管理和配置短信模板，支持创建、编辑和审核流程</p>
        </div>
        <div class="header-right">
          <el-button 
            v-if="isSuperAdmin" 
            type="primary" 
            :icon="Plus" 
            @click="handleCreateTemplate"
            class="create-btn"
          >
            创建模板
          </el-button>
          <el-button 
            v-else 
            type="primary" 
            :icon="DocumentAdd" 
            @click="handleApplyTemplate"
            class="apply-btn"
          >
            申请模板
          </el-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总模板数</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.active }}</div>
            <div class="stat-label">已启用</div>
          </div>
        </div>
        <div class="stat-card pending" v-if="isSuperAdmin">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </div>
        <div class="stat-card usage">
          <div class="stat-icon">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.usage }}</div>
            <div class="stat-label">本月使用</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-card class="search-card">
        <div class="search-form">
          <div class="search-left">
            <el-input
              v-model="searchForm.keyword"
              placeholder="搜索模板名称或内容"
              :prefix-icon="Search"
              clearable
              @input="handleSearch"
              class="search-input"
            />
            <el-select
              v-model="searchForm.status"
              placeholder="状态"
              clearable
              class="status-select"
            >
              <el-option label="全部" value="" />
              <el-option label="已启用" value="active" />
              <el-option label="已禁用" value="disabled" />
              <el-option label="待审核" value="pending" v-if="isSuperAdmin" />
              <el-option label="已拒绝" value="rejected" v-if="isSuperAdmin" />
            </el-select>
            <el-select
              v-model="searchForm.category"
              placeholder="分类"
              clearable
              class="category-select"
            >
              <el-option label="全部" value="" />
              <el-option label="营销推广" value="marketing" />
              <el-option label="系统通知" value="notification" />
              <el-option label="验证码" value="verification" />
              <el-option label="订单提醒" value="order" />
            </el-select>
          </div>
          <div class="search-right">
            <el-button @click="resetSearch" :icon="Refresh">重置</el-button>
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 模板列表 -->
    <div class="templates-section">
      <el-card class="templates-card">
        <template #header>
          <div class="card-header">
            <span class="header-title">模板列表</span>
            <div class="header-actions">
              <el-button-group>
                <el-button 
                  :type="viewMode === 'grid' ? 'primary' : ''" 
                  :icon="Grid"
                  @click="viewMode = 'grid'"
                  size="small"
                />
                <el-button 
                  :type="viewMode === 'list' ? 'primary' : ''" 
                  :icon="List"
                  @click="viewMode = 'list'"
                  size="small"
                />
              </el-button-group>
            </div>
          </div>
        </template>

        <!-- 网格视图 -->
        <div v-if="viewMode === 'grid'" class="grid-view">
          <div class="templates-grid" v-loading="loading">
            <div 
              v-for="template in paginatedTemplates" 
              :key="template.id"
              class="template-card"
              :class="{ 'pending': template.status === 'pending' }"
            >
              <div class="template-header">
                <div class="template-title">{{ template.name }}</div>
                <div class="template-status">
                  <el-tag 
                    :type="getStatusType(template.status)" 
                    size="small"
                    class="status-tag"
                  >
                    {{ getStatusText(template.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="template-content">
                <p class="content-preview">{{ template.content }}</p>
                <div class="template-meta">
                  <span class="category">{{ getCategoryText(template.category) }}</span>
                  <span class="usage-count">使用 {{ template.usageCount }} 次</span>
                </div>
              </div>

              <div class="template-footer">
                <div class="template-time">
                  <span>{{ formatTime(template.updatedAt) }}</span>
                </div>
                <div class="template-actions">
                  <el-button 
                    size="small" 
                    :icon="View" 
                    @click="handlePreview(template)"
                    title="预览"
                  >
                    预览
                  </el-button>
                  <el-button 
                    v-if="canEdit(template)"
                    size="small" 
                    type="primary" 
                    :icon="Edit" 
                    @click="handleEdit(template)"
                    title="编辑"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    v-if="template.status === 'active'"
                    size="small" 
                    type="warning" 
                    @click="handleDisable(template)"
                    title="禁用"
                  >
                    禁用
                  </el-button>
                  <el-button 
                    v-if="template.status === 'disabled'"
                    size="small" 
                    type="success" 
                    @click="handleEnable(template)"
                    title="启用"
                  >
                    启用
                  </el-button>
                  <el-button 
                    v-if="isSuperAdmin && template.status === 'pending'"
                    size="small" 
                    type="success" 
                    :icon="Check" 
                    @click="handleApprove(template)"
                    title="审核通过"
                  />
                  <el-button 
                    v-if="isSuperAdmin && template.status === 'pending'"
                    size="small" 
                    type="danger" 
                    :icon="Close" 
                    @click="handleReject(template)"
                    title="审核拒绝"
                  />
                  <el-button 
                    v-if="canDelete(template)"
                    size="small" 
                    type="danger" 
                    :icon="Delete" 
                    @click="handleDelete(template)"
                    title="删除"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="list-view">
          <el-table 
            :data="paginatedTemplates" 
            v-loading="loading"
            class="templates-table"
            @row-click="handleRowClick"
          >
            <el-table-column prop="name" label="模板名称" width="200">
              <template #default="{ row }">
                <div class="template-name-cell">
                  <span class="name">{{ row.name }}</span>
                  <el-tag 
                    v-if="row.isDefault" 
                    type="warning" 
                    size="small"
                    class="default-tag"
                  >
                    默认
                  </el-tag>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="content" label="模板内容" min-width="300">
              <template #default="{ row }">
                <div class="content-cell">
                  <p class="content-text">{{ row.content }}</p>
                  <div class="variables" v-if="row.variables?.length">
                    <el-tag 
                      v-for="variable in row.variables" 
                      :key="variable"
                      size="small"
                      class="variable-tag"
                    >
                      {{ variable }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="category" label="分类" width="120">
              <template #default="{ row }">
                <span class="category-text">{{ getCategoryText(row.category) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag 
                  :type="getStatusType(row.status)" 
                  size="small"
                >
                  {{ getStatusText(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="usageCount" label="使用次数" width="100" align="center">
              <template #default="{ row }">
                <span class="usage-count">{{ row.usageCount }}</span>
              </template>
            </el-table-column>
            
            <el-table-column prop="updatedAt" label="更新时间" width="160">
              <template #default="{ row }">
                <span class="time-text">{{ formatTime(row.updatedAt) }}</span>
              </template>
            </el-table-column>
            
            <el-table-column label="操作" width="280" fixed="right">
              <template #default="{ row }">
                <div class="action-buttons">
                  <el-button 
                    size="small" 
                    :icon="View" 
                    @click.stop="handlePreview(row)"
                  >
                    预览
                  </el-button>
                  <el-button 
                    v-if="canEdit(row)"
                    size="small" 
                    type="primary" 
                    :icon="Edit" 
                    @click.stop="handleEdit(row)"
                  >
                    编辑
                  </el-button>
                  <el-button 
                    v-if="row.status === 'active'"
                    size="small" 
                    type="warning" 
                    @click.stop="handleDisable(row)"
                  >
                    禁用
                  </el-button>
                  <el-button 
                    v-if="row.status === 'disabled'"
                    size="small" 
                    type="success" 
                    @click.stop="handleEnable(row)"
                  >
                    启用
                  </el-button>
                  <el-dropdown 
                    v-if="isSuperAdmin && row.status === 'pending'"
                    @command="(command) => handleDropdownCommand(command, row)"
                  >
                    <el-button size="small" type="success">
                      审核<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                    </el-button>
                    <template #dropdown>
                      <el-dropdown-menu>
                        <el-dropdown-item command="approve">通过</el-dropdown-item>
                        <el-dropdown-item command="reject">拒绝</el-dropdown-item>
                      </el-dropdown-menu>
                    </template>
                  </el-dropdown>
                  <el-button 
                    v-if="canDelete(row)"
                    size="small" 
                    type="danger" 
                    :icon="Delete" 
                    @click.stop="handleDelete(row)"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-section">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredTemplates.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            class="pagination"
          />
        </div>
      </el-card>
    </div>

    <!-- 模板创建/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '创建模板' : dialogMode === 'edit' ? '编辑模板' : '申请模板'"
      width="800px"
      class="template-dialog"
      :close-on-click-modal="false"
    >
      <el-form
        :model="templateForm"
        :rules="templateRules"
        ref="templateFormRef"
        label-width="100px"
        class="template-form"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input
            v-model="templateForm.name"
            placeholder="请输入模板名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="模板分类" prop="category">
          <el-select v-model="templateForm.category" placeholder="请选择分类">
            <el-option label="营销推广" value="marketing" />
            <el-option label="系统通知" value="notification" />
            <el-option label="验证码" value="verification" />
            <el-option label="订单提醒" value="order" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="templateForm.content"
            type="textarea"
            :rows="6"
            placeholder="请输入模板内容，使用 {变量名} 格式定义变量"
            maxlength="500"
            show-word-limit
          />
          <div class="form-tip">
            <p>• 使用 {变量名} 格式定义变量，如：{name}、{code}、{amount}</p>
            <p>• 模板内容不能超过500字符</p>
            <p>• 请确保内容符合相关法规要求</p>
          </div>
        </el-form-item>
        
        <el-form-item label="变量说明" v-if="detectedVariables.length">
          <div class="variables-section">
            <div class="variables-list">
              <el-tag 
                v-for="variable in detectedVariables" 
                :key="variable"
                class="variable-item"
              >
                {{ variable }}
              </el-tag>
            </div>
            <p class="variables-tip">系统自动检测到以上变量，请确保在使用时提供对应的值</p>
          </div>
        </el-form-item>
        
        <el-form-item label="申请说明" prop="description" v-if="dialogMode === 'apply'">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            :rows="3"
            placeholder="请说明申请此模板的用途和必要性"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="设为默认" v-if="isSuperAdmin && dialogMode !== 'apply'">
          <el-switch v-model="templateForm.isDefault" />
          <span class="form-tip">默认模板将在发送短信时优先显示</span>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ dialogMode === 'apply' ? '提交申请' : '确定' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 模板预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="模板预览"
      width="600px"
      class="preview-dialog"
    >
      <div class="preview-content">
        <div class="preview-header">
          <h4>{{ previewTemplate?.name }}</h4>
          <el-tag :type="getStatusType(previewTemplate?.status)">
            {{ getStatusText(previewTemplate?.status) }}
          </el-tag>
        </div>
        
        <div class="preview-body">
          <div class="content-section">
            <h5>模板内容</h5>
            <div class="content-display">{{ previewTemplate?.content }}</div>
          </div>
          
          <div class="variables-section" v-if="previewTemplate?.variables?.length">
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
              <span class="value">{{ getCategoryText(previewTemplate?.category) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">使用次数：</span>
              <span class="value">{{ previewTemplate?.usageCount }} 次</span>
            </div>
            <div class="meta-item">
              <span class="label">创建时间：</span>
              <span class="value">{{ formatTime(previewTemplate?.createdAt) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">更新时间：</span>
              <span class="value">{{ formatTime(previewTemplate?.updatedAt) }}</span>
            </div>
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
  Plus, DocumentAdd, Search, Refresh, View, Edit, Delete, 
  Check, Close, Document, CircleCheck, Clock, TrendCharts,
  Grid, List, ArrowDown
} from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useNotificationStore, MessageType } from '@/stores/notification'

// 接口定义
interface SmsTemplate {
  id: string
  name: string
  content: string
  category: string
  description: string
  isDefault: boolean
  status: 'active' | 'pending' | 'rejected' | 'disabled'
  variables?: string[]
  usageCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  approvedBy?: string
  approvedAt?: string
  rejectedReason?: string
}

// 用户权限
const userStore = useUserStore()
const isSuperAdmin = computed(() => userStore.user?.role === 'super_admin')

// 通知store
const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const previewVisible = ref(false)
const dialogMode = ref<'create' | 'edit' | 'apply'>('create')
const viewMode = ref<'grid' | 'list'>('grid')

// 表单引用
const templateFormRef = ref()

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  category: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20
})

// 统计数据
const stats = reactive({
  total: 0,
  active: 0,
  pending: 0,
  usage: 0
})

// 模板数据
const templates = ref<SmsTemplate[]>([])
const previewTemplate = ref<SmsTemplate | null>(null)

// 模板表单
const templateForm = reactive({
  id: '',
  name: '',
  content: '',
  category: '',
  description: '',
  isDefault: false,
  status: 'active'
})

// 表单验证规则
const templateRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '模板名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' },
    { min: 10, max: 500, message: '模板内容长度在 10 到 500 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择模板分类', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入申请说明', trigger: 'blur' },
    { min: 10, max: 200, message: '申请说明长度在 10 到 200 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const detectedVariables = computed(() => {
  const content = templateForm.content
  const matches = content.match(/\{([^}]+)\}/g)
  return matches ? matches.map(match => match.slice(1, -1)) : []
})

const filteredTemplates = computed(() => {
  let result = templates.value

  // 权限过滤
  if (!isSuperAdmin.value) {
    result = result.filter(template => 
      template.status === 'active' || 
      template.createdBy === userStore.user?.id
    )
  }

  // 搜索过滤
  if (searchForm.keyword) {
    result = result.filter(template =>
      template.name.toLowerCase().includes(searchForm.keyword.toLowerCase()) ||
      template.content.toLowerCase().includes(searchForm.keyword.toLowerCase())
    )
  }

  if (searchForm.status) {
    result = result.filter(template => template.status === searchForm.status)
  }

  if (searchForm.category) {
    result = result.filter(template => template.category === searchForm.category)
  }

  return result
})

const paginatedTemplates = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredTemplates.value.slice(start, end)
})

// 方法
const loadTemplates = async () => {
  loading.value = true
  try {
    // 模拟数据
    await new Promise(resolve => setTimeout(resolve, 500))
    
    templates.value = [
      {
        id: '1',
        name: '客户回访模板',
        content: '尊敬的{customerName}，感谢您对我们产品的支持，我们将为您提供更好的服务。如有任何问题，请联系我们：{phone}',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 156,
        variables: ['customerName', 'phone'],
        createdBy: 'admin',
        createdAt: '2024-01-15 10:30:00',
        updatedAt: '2024-01-20 14:20:00'
      },
      {
        id: '2',
        name: '促销活动模板',
        content: '【{companyName}】新年大促销！全场商品{discount}折起，活动时间：{startDate}至{endDate}，详情咨询客服。',
        category: 'marketing',
        status: 'active',
        isDefault: false,
        usageCount: 89,
        variables: ['companyName', 'discount', 'startDate', 'endDate'],
        createdBy: 'admin',
        createdAt: '2024-01-10 09:15:00',
        updatedAt: '2024-01-18 16:45:00'
      },
      {
        id: '3',
        name: '验证码模板',
        content: '您的验证码是：{code}，请在{minutes}分钟内使用，请勿泄露给他人。',
        category: 'verification',
        status: 'active',
        isDefault: true,
        usageCount: 1234,
        variables: ['code', 'minutes'],
        createdBy: 'admin',
        createdAt: '2024-01-22 11:20:00',
        updatedAt: '2024-01-22 11:20:00'
      },
      {
        id: '4',
        name: '订单确认通知',
        content: '【{companyName}】您的订单{orderNo}已确认，商品：{productName}，金额：{amount}元，预计{deliveryDate}发货。',
        category: 'order',
        status: 'active',
        isDefault: false,
        usageCount: 892,
        variables: ['companyName', 'orderNo', 'productName', 'amount', 'deliveryDate'],
        createdBy: 'admin',
        createdAt: '2024-01-20 15:30:00',
        updatedAt: '2024-01-25 10:15:00'
      },
      {
        id: '5',
        name: '发货通知模板',
        content: '【{companyName}】您的订单{orderNo}已发货，快递单号：{trackingNo}，请注意查收。物流查询：{trackingUrl}',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 756,
        variables: ['companyName', 'orderNo', 'trackingNo', 'trackingUrl'],
        createdBy: 'admin',
        createdAt: '2024-01-18 14:20:00',
        updatedAt: '2024-01-23 09:45:00'
      },
      {
        id: '6',
        name: '付款提醒模板',
        content: '尊敬的{customerName}，您的订单{orderNo}待付款，金额{amount}元，请及时完成支付。如有疑问请联系客服。',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 423,
        variables: ['customerName', 'orderNo', 'amount'],
        createdBy: 'admin',
        createdAt: '2024-01-16 11:30:00',
        updatedAt: '2024-01-21 16:20:00'
      },
      {
        id: '7',
        name: '会议通知模板',
        content: '【会议通知】{meetingTitle}将于{meetingDate} {meetingTime}在{location}举行，请准时参加。联系人：{contact}',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 234,
        variables: ['meetingTitle', 'meetingDate', 'meetingTime', 'location', 'contact'],
        createdBy: 'admin',
        createdAt: '2024-01-19 13:15:00',
        updatedAt: '2024-01-24 08:30:00'
      },
      {
        id: '8',
        name: '生日祝福模板',
        content: '亲爱的{customerName}，今天是您的生日，{companyName}全体员工祝您生日快乐！特为您准备了生日礼品，请到店领取。',
        category: 'marketing',
        status: 'active',
        isDefault: false,
        usageCount: 67,
        variables: ['customerName', 'companyName'],
        createdBy: 'admin',
        createdAt: '2024-01-17 10:45:00',
        updatedAt: '2024-01-22 14:10:00'
      },
      {
        id: '9',
        name: '服务预约确认',
        content: '【{companyName}】您预约的{serviceName}服务已确认，时间：{appointmentDate} {appointmentTime}，地址：{address}，联系电话：{phone}',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 345,
        variables: ['companyName', 'serviceName', 'appointmentDate', 'appointmentTime', 'address', 'phone'],
        createdBy: 'admin',
        createdAt: '2024-01-21 09:20:00',
        updatedAt: '2024-01-26 11:40:00'
      },
      {
        id: '10',
        name: '账户余额提醒',
        content: '【{companyName}】您的账户余额为{balance}元，余额不足可能影响服务使用，请及时充值。充值热线：{phone}',
        category: 'notification',
        status: 'active',
        isDefault: false,
        usageCount: 178,
        variables: ['companyName', 'balance', 'phone'],
        createdBy: 'admin',
        createdAt: '2024-01-14 16:30:00',
        updatedAt: '2024-01-19 12:15:00'
      },
      {
        id: '11',
        name: '密码重置通知',
        content: '【{companyName}】您的账户密码已重置，新密码：{newPassword}，请及时登录修改。如非本人操作，请联系客服：{phone}',
        category: 'notification',
        status: 'disabled',
        isDefault: false,
        usageCount: 89,
        variables: ['companyName', 'newPassword', 'phone'],
        createdBy: 'admin',
        createdAt: '2024-01-13 08:45:00',
        updatedAt: '2024-01-18 15:20:00'
      },
      {
        id: '12',
        name: '活动邀请模板',
        content: '【{companyName}】诚邀您参加{eventName}，时间：{eventDate}，地点：{venue}。精彩活动，丰厚奖品等您来！报名电话：{phone}',
        category: 'marketing',
        status: 'active',
        isDefault: false,
        usageCount: 123,
        variables: ['companyName', 'eventName', 'eventDate', 'venue', 'phone'],
        createdBy: 'admin',
        createdAt: '2024-01-12 12:10:00',
        updatedAt: '2024-01-17 17:25:00'
      },
      {
        id: '13',
        name: '新用户申请模板',
        content: '【限时优惠】{name}，{product}现在只要{price}元！立即购买享受{discount}折优惠，活动截止{endTime}。',
        category: 'marketing',
        status: 'pending',
        isDefault: false,
        usageCount: 0,
        variables: ['name', 'product', 'price', 'discount', 'endTime'],
        createdBy: 'user2',
        createdAt: '2024-01-26 11:20:00',
        updatedAt: '2024-01-26 11:20:00'
      }
    ]

    // 更新统计数据
    stats.total = templates.value.length
    stats.active = templates.value.filter(t => t.status === 'active').length
    stats.pending = templates.value.filter(t => t.status === 'pending').length
    stats.usage = templates.value.reduce((sum, t) => sum + t.usageCount, 0)
    
  } catch (error) {
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

const handleCreateTemplate = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const handleApplyTemplate = () => {
  dialogMode.value = 'apply'
  resetForm()
  templateForm.status = 'pending'
  dialogVisible.value = true
}

const handleEdit = (template: SmsTemplate) => {
  dialogMode.value = 'edit'
  Object.assign(templateForm, template)
  dialogVisible.value = true
}

const handlePreview = (template: SmsTemplate) => {
  previewTemplate.value = template
  previewVisible.value = true
}

const handleApprove = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确定要审核通过这个模板吗？', '确认审核', {
      type: 'warning'
    })
    
    template.status = 'active'
    ElMessage.success('模板审核通过')
    
    // 发送通知给申请人
    notificationStore.sendMessage(
      MessageType.SMS_TEMPLATE_APPROVED,
      `您申请的短信模板"${template.name}"已审核通过，现在可以使用了。`,
      {
        relatedId: template.id,
        relatedType: 'sms_template',
        actionUrl: '/system/sms-templates'
      }
    )
    
  } catch (error) {
    // 用户取消
  }
}

const handleReject = async (template: SmsTemplate) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.{5,}/,
      inputErrorMessage: '拒绝原因至少5个字符'
    })
    
    template.status = 'rejected'
    template.rejectReason = reason
    ElMessage.success('模板已拒绝')
    
    // 发送通知给申请人
    notificationStore.sendMessage(
      MessageType.SMS_TEMPLATE_REJECTED,
      `您申请的短信模板"${template.name}"审核未通过。拒绝原因：${reason}`,
      {
        relatedId: template.id,
        relatedType: 'sms_template',
        actionUrl: '/system/sms-templates'
      }
    )
    
  } catch (error) {
    // 用户取消
  }
}

const handleDelete = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确定要删除这个模板吗？删除后不可恢复。', '确认删除', {
      type: 'warning'
    })
    
    const index = templates.value.findIndex(t => t.id === template.id)
    if (index > -1) {
      templates.value.splice(index, 1)
      ElMessage.success('模板删除成功')
    }
    
  } catch (error) {
    // 用户取消
  }
}

const handleEnable = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确定要启用这个模板吗？', '确认启用', {
      type: 'info'
    })
    
    template.status = 'active'
    template.updatedAt = new Date().toLocaleString()
    ElMessage.success('模板已启用')
    
  } catch (error) {
    // 用户取消
  }
}

const handleDisable = async (template: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确定要禁用这个模板吗？禁用后将无法使用。', '确认禁用', {
      type: 'warning'
    })
    
    template.status = 'disabled'
    template.updatedAt = new Date().toLocaleString()
    ElMessage.success('模板已禁用')
    
  } catch (error) {
    // 用户取消
  }
}

const handleSubmit = async () => {
  if (!templateFormRef.value) return
  
  try {
    await templateFormRef.value.validate()
    submitting.value = true
    
    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (dialogMode.value === 'create') {
      const newTemplate = {
        ...templateForm,
        id: Date.now().toString(),
        usageCount: 0,
        variables: detectedVariables.value,
        createdBy: userStore.user?.id,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      }
      templates.value.unshift(newTemplate)
      ElMessage.success('模板创建成功')
    } else if (dialogMode.value === 'edit') {
      const index = templates.value.findIndex(t => t.id === templateForm.id)
      if (index > -1) {
        templates.value[index] = {
          ...templates.value[index],
          ...templateForm,
          variables: detectedVariables.value,
          updatedAt: new Date().toLocaleString()
        }
        ElMessage.success('模板更新成功')
      }
    } else if (dialogMode.value === 'apply') {
      const newTemplate = {
        ...templateForm,
        id: Date.now().toString(),
        usageCount: 0,
        variables: detectedVariables.value,
        createdBy: userStore.user?.id,
        createdAt: new Date().toLocaleString(),
        updatedAt: new Date().toLocaleString()
      }
      templates.value.unshift(newTemplate)
      ElMessage.success('模板申请已提交，等待管理员审核')
      
      // 通知超级管理员
      notificationStore.sendMessage(
        MessageType.SMS_TEMPLATE_APPLIED,
        `用户 ${userStore.user?.name} 申请了新的短信模板"${newTemplate.name}"，请及时审核。`,
        {
          relatedId: newTemplate.id,
          relatedType: 'sms_template',
          actionUrl: '/system/sms-templates'
        }
      )
    }
    
    dialogVisible.value = false
    
  } catch (error) {
    ElMessage.error('操作失败，请重试')
  } finally {
    submitting.value = false
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
}

const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.category = ''
  pagination.currentPage = 1
}

const resetForm = () => {
  Object.assign(templateForm, {
    id: '',
    name: '',
    content: '',
    category: '',
    description: '',
    isDefault: false,
    status: 'active'
  })
  templateFormRef.value?.resetFields()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
}

const handleRowClick = (row: SmsTemplate) => {
  handlePreview(row)
}

const handleDropdownCommand = (command: string, template: SmsTemplate) => {
  if (command === 'approve') {
    handleApprove(template)
  } else if (command === 'reject') {
    handleReject(template)
  }
}

// 权限检查
const canEdit = (template: SmsTemplate) => {
  return isSuperAdmin.value || template.createdBy === userStore.user?.id
}

const canDelete = (template: SmsTemplate) => {
  return isSuperAdmin.value || (template.createdBy === userStore.user?.id && template.status !== 'active')
}

// 工具方法
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    disabled: 'info',
    pending: 'warning',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '已启用',
    disabled: '已禁用',
    pending: '待审核',
    rejected: '已拒绝'
  }
  return texts[status] || '未知'
}

const getCategoryText = (category: string) => {
  const texts: Record<string, string> = {
    marketing: '营销推广',
    notification: '系统通知',
    verification: '验证码',
    order: '订单提醒'
  }
  return texts[category] || '其他'
}

const formatTime = (time: string) => {
  return time || '-'
}

// 生命周期
onMounted(() => {
  loadTemplates()
})

// 监听搜索变化
watch([() => searchForm.keyword, () => searchForm.status, () => searchForm.category], () => {
  pagination.currentPage = 1
})
</script>

<style scoped>
.sms-templates-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

/* 页面头部 */
.page-header {
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

.header-left .page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.header-left .page-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  font-weight: 400;
}

.create-btn, .apply-btn {
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

.create-btn:hover, .apply-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

/* 统计卡片 */
.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.stat-card.total {
  border-left-color: #409eff;
}

.stat-card.active {
  border-left-color: #67c23a;
}

.stat-card.pending {
  border-left-color: #e6a23c;
}

.stat-card.usage {
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

.stat-card.active .stat-icon {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.stat-card.pending .stat-icon {
  background: rgba(230, 162, 60, 0.1);
  color: #e6a23c;
}

.stat-card.usage .stat-icon {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.stat-content .stat-value {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-content .stat-label {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 搜索区域 */
.search-section {
  margin-bottom: 24px;
}

.search-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.search-form {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.search-left {
  display: flex;
  gap: 16px;
  align-items: center;
  flex: 1;
}

.search-input {
  width: 300px;
}

.status-select, .category-select {
  width: 150px;
}

.search-right {
  display: flex;
  gap: 12px;
}

/* 模板区域 */
.templates-section {
  margin-bottom: 24px;
}

.templates-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

/* 网格视图 */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.template-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.template-card.pending {
  border-color: #e6a23c;
  background: linear-gradient(135deg, #fff9e6 0%, #ffffff 100%);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.template-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.template-content {
  margin-bottom: 16px;
}

.content-preview {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  margin: 0 0 12px 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.template-time {
  font-size: 12px;
  color: #909399;
}

.template-actions {
  display: flex;
  gap: 8px;
}

/* 列表视图 */
.templates-table {
  margin-top: 20px;
}

.template-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-name-cell .name {
  font-weight: 600;
  color: #303133;
}

.default-tag {
  font-size: 10px;
}

.content-cell .content-text {
  margin: 0 0 8px 0;
  color: #606266;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.variables {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.variable-tag {
  font-size: 10px;
  padding: 2px 6px;
}

.category-text {
  color: #606266;
}

.usage-count {
  font-weight: 600;
  color: #409eff;
}

.time-text {
  color: #909399;
  font-size: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 分页 */
.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 对话框 */
.template-dialog :deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;
}

.template-dialog :deep(.el-dialog__header) {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 24px;
  border-bottom: 1px solid #e4e7ed;
}

.template-dialog :deep(.el-dialog__title) {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.template-dialog :deep(.el-dialog__body) {
  padding: 24px;
}

.template-form {
  max-width: 100%;
}

.form-tip {
  margin-top: 8px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.form-tip p {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #606266;
}

.form-tip p:last-child {
  margin-bottom: 0;
}

.variables-section {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.variables-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.variable-item {
  background: #409eff;
  color: white;
  border: none;
}

.variables-tip {
  margin: 0;
  font-size: 12px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 预览对话框 */
.preview-dialog :deep(.el-dialog) {
  border-radius: 16px;
}

.preview-content {
  padding: 8px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.preview-body .content-section,
.preview-body .variables-section,
.preview-body .meta-section {
  margin-bottom: 20px;
}

.preview-body h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.content-display {
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

/* 响应式设计 */
@media (max-width: 768px) {
  .sms-templates-page {
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
  
  .search-form {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-left {
    flex-direction: column;
  }
  
  .search-input,
  .status-select,
  .category-select {
    width: 100%;
  }
  
  .templates-grid {
    grid-template-columns: 1fr;
  }
  
  .template-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .template-actions {
    justify-content: center;
  }
  
  .meta-section {
    grid-template-columns: 1fr;
  }
}

/* 动画效果 */
.template-card {
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

/* 状态标签样式 */
.status-tag {
  font-weight: 500;
  border-radius: 20px;
  padding: 4px 12px;
}

/* 自定义滚动条 */
.template-card::-webkit-scrollbar,
.content-display::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.template-card::-webkit-scrollbar-track,
.content-display::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.template-card::-webkit-scrollbar-thumb,
.content-display::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.template-card::-webkit-scrollbar-thumb:hover,
.content-display::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>