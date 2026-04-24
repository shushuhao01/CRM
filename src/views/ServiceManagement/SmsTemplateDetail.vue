<template>
  <div class="sms-template-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" text>返回短信管理</el-button>
        <h2 class="page-title">模板详情</h2>
        <p class="page-description">查看可用模板、我的申请和变量参考文档</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showApplyDialog = true">
          <el-icon><Plus /></el-icon>
          申请模板
        </el-button>
      </div>
    </div>

    <!-- 主内容区 -->
    <el-card class="main-content">
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- Tab1: 可用模板 -->
        <el-tab-pane name="available">
          <template #label>
            <span class="tab-label">
              <el-icon><Collection /></el-icon>
              可用模板
              <el-badge :value="availableTemplates.length" :hidden="availableTemplates.length === 0" />
            </span>
          </template>

          <div class="tab-toolbar">
            <el-input
              v-model="availableSearch"
              placeholder="搜索模板名称、内容"
              :prefix-icon="Search"
              clearable
              style="width: 280px"
            />
            <el-select v-model="availableCategoryFilter" placeholder="全部分类" clearable style="width: 150px; margin-left: 10px">
              <el-option v-for="cat in categories" :key="cat.value" :label="cat.label" :value="cat.value" />
            </el-select>
          </div>

          <div class="templates-grid" v-loading="loadingAvailable">
            <div
              v-for="template in filteredAvailableTemplates"
              :key="template.id"
              class="template-card"
              @click="handlePreviewTemplate(template)"
            >
              <div class="card-header">
                <h4 class="card-title">{{ template.name }}</h4>
                <div class="card-tags">
                  <el-tag
                    :type="template.isPreset === 1 || template.isSystem ? 'primary' : 'success'"
                    size="small"
                    effect="light"
                  >
                    {{ template.isPreset === 1 || template.isSystem ? '预设' : '自建' }}
                  </el-tag>
                  <el-tag size="small" type="info" effect="plain">{{ getCategoryText(template.category) }}</el-tag>
                </div>
              </div>
              <p class="card-content">{{ template.content }}</p>
              <div class="card-variables" v-if="template.variables?.length">
                <el-tag
                  v-for="v in template.variables.slice(0, 5)"
                  :key="v"
                  size="small"
                  type="info"
                  class="var-tag"
                >
                  {{ v }}
                </el-tag>
                <span v-if="template.variables.length > 5" class="more-vars">+{{ template.variables.length - 5 }}</span>
              </div>
              <div class="card-footer">
                <span class="code-label" v-if="template.vendorTemplateCode">
                  CODE: {{ template.vendorTemplateCode }}
                </span>
              </div>
            </div>

            <el-empty
              v-if="filteredAvailableTemplates.length === 0 && !loadingAvailable"
              description="暂无可用模板"
              :image-size="120"
            />
          </div>
        </el-tab-pane>

        <!-- Tab2: 我的申请 -->
        <el-tab-pane name="applications">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              我的申请
              <el-badge :value="pendingApplicationsCount" :hidden="pendingApplicationsCount === 0" />
            </span>
          </template>

          <div class="tab-toolbar">
            <el-radio-group v-model="applicationStatusFilter" size="default">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="pending_admin">待审核</el-radio-button>
              <el-radio-button label="pending_vendor">审核中</el-radio-button>
              <el-radio-button label="active">已通过</el-radio-button>
              <el-radio-button label="rejected">已拒绝</el-radio-button>
              <el-radio-button label="withdrawn">已撤销</el-radio-button>
            </el-radio-group>
          </div>

          <div class="applications-list" v-loading="loadingApplications">
            <div
              v-for="app in filteredApplications"
              :key="app.id"
              class="application-item"
              :class="'status-' + app.status"
            >
              <div class="app-info">
                <div class="app-header">
                  <h4 class="app-name">{{ app.name }}</h4>
                  <div class="app-meta">
                    <el-tag :type="getApplicationStatusType(app.status)" size="small" effect="light">
                      {{ getApplicationStatusText(app.status) }}
                    </el-tag>
                    <el-tag size="small" type="info" effect="plain">{{ getCategoryText(app.category) }}</el-tag>
                    <span class="app-time">{{ formatTime(app.createdAt) }}</span>
                  </div>
                </div>
                <p class="app-content">{{ app.content }}</p>
                <div class="app-variables" v-if="app.variables?.length">
                  <el-tag v-for="v in app.variables" :key="v" size="small" type="info" class="var-tag">{{ v }}</el-tag>
                </div>
                <!-- 拒绝原因 -->
                <div class="reject-reason" v-if="app.status === 'rejected' && app.adminReviewNote">
                  <el-icon><WarningFilled /></el-icon>
                  <span>拒绝原因：{{ app.adminReviewNote }}</span>
                </div>
                <!-- 服务商信息 -->
                <div class="vendor-info" v-if="app.vendorTemplateCode">
                  <span class="vendor-label">模板CODE：</span>
                  <el-tag type="success" size="small">{{ app.vendorTemplateCode }}</el-tag>
                </div>
              </div>
              <div class="app-actions">
                <el-button
                  v-if="app.status === 'pending_admin' || app.status === 'pending'"
                  type="warning"
                  size="small"
                  @click="handleWithdraw(app)"
                >
                  撤销
                </el-button>
                <el-button
                  v-if="['rejected', 'withdrawn'].includes(app.status)"
                  type="danger"
                  size="small"
                  @click="handleDeleteApplication(app)"
                >
                  删除
                </el-button>
                <el-button type="primary" size="small" @click="handlePreviewTemplate(app)" text>
                  查看详情
                </el-button>
              </div>
            </div>

            <el-empty
              v-if="filteredApplications.length === 0 && !loadingApplications"
              description="暂无申请记录"
              :image-size="120"
            />
          </div>
        </el-tab-pane>

        <!-- Tab3: 变量文档 -->
        <el-tab-pane name="variables">
          <template #label>
            <span class="tab-label">
              <el-icon><Notebook /></el-icon>
              变量文档
            </span>
          </template>

          <div class="tab-toolbar">
            <el-input
              v-model="variableSearch"
              placeholder="搜索变量名、说明"
              :prefix-icon="Search"
              clearable
              style="width: 280px"
            />
            <el-select v-model="variableCategoryFilter" placeholder="全部分类" clearable style="width: 150px; margin-left: 10px">
              <el-option v-for="cat in variableCategories" :key="cat" :label="cat" :value="cat" />
            </el-select>
          </div>

          <div class="variables-doc" v-loading="loadingVariables">
            <div class="doc-intro">
              <el-alert type="info" :closable="false" show-icon>
                <template #title>模板变量使用说明</template>
                在短信模板内容中使用 <code>{变量名}</code> 格式插入变量。发送时系统会自动将变量替换为实际值。例如：<code>尊敬的{customerName}，您的订单{orderNo}已确认。</code>
              </el-alert>
            </div>

            <div v-for="group in groupedVariables" :key="group.category" class="variable-group">
              <h3 class="group-title">
                <span class="group-icon">📋</span>
                {{ group.category }}
                <el-tag size="small" type="info" effect="plain">{{ group.items.length }}个变量</el-tag>
              </h3>
              <el-table :data="group.items" border size="small" class="variable-table">
                <el-table-column prop="name" label="变量名" width="200">
                  <template #default="{ row }">
                    <el-button type="primary" link size="small" @click="copyVariable(row.name)">
                      <code class="var-code">{{ row.name }}</code>
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column prop="label" label="说明" width="160" />
                <el-table-column prop="example" label="示例值" width="200">
                  <template #default="{ row }">
                    <span class="example-value">{{ row.example }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="详细描述" />
              </el-table>
            </div>

            <el-empty
              v-if="groupedVariables.length === 0 && !loadingVariables"
              description="暂无变量文档"
              :image-size="120"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 模板预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="模板详情" width="650px" class="template-preview-dialog">
      <div v-if="previewTemplate" class="preview-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板名称">{{ previewTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="模板分类">{{ getCategoryText(previewTemplate.category) }}</el-descriptions-item>
          <el-descriptions-item label="来源">
            <el-tag :type="previewTemplate.isPreset === 1 || previewTemplate.isSystem ? 'primary' : 'success'" size="small">
              {{ previewTemplate.isPreset === 1 || previewTemplate.isSystem ? '后台预设' : '租户自建' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getApplicationStatusType(previewTemplate.status)" size="small">
              {{ getApplicationStatusText(previewTemplate.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="模板CODE" v-if="previewTemplate.vendorTemplateCode">
            {{ previewTemplate.vendorTemplateCode }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(previewTemplate.createdAt) }}</el-descriptions-item>
        </el-descriptions>

        <div class="preview-section">
          <h4>模板内容</h4>
          <div class="content-box">{{ previewTemplate.content }}</div>
        </div>

        <div class="preview-section" v-if="previewTemplate.variables?.length">
          <h4>包含变量</h4>
          <div class="variables-box">
            <el-tag v-for="v in previewTemplate.variables" :key="v" type="info" class="var-tag">{{ v }}</el-tag>
          </div>
        </div>

        <div class="preview-section">
          <h4>预览效果</h4>
          <div class="content-box preview-effect">{{ getPreviewContent(previewTemplate) }}</div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showPreviewDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 申请模板对话框 -->
    <CreateTemplateDialog
      v-model="showApplyDialog"
      mode="apply"
      @submit="handleApplySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Plus,
  Search,
  Collection,
  Document,
  Notebook,
  WarningFilled
} from '@element-plus/icons-vue'
import CreateTemplateDialog from '@/components/CreateTemplateDialog.vue'
import * as smsApi from '@/api/sms'
import type { SmsTemplate, SmsTemplateVariable } from '@/api/sms'
import { useNotificationStore, MessageType } from '@/stores/notification'

const router = useRouter()
const notificationStore = useNotificationStore()

// Tab 控制
const activeTab = ref('available')

// 搜索与筛选
const availableSearch = ref('')
const availableCategoryFilter = ref('')
const applicationStatusFilter = ref('all')
const variableSearch = ref('')
const variableCategoryFilter = ref('')

// 加载状态
const loadingAvailable = ref(false)
const loadingApplications = ref(false)
const loadingVariables = ref(false)

// 数据
const availableTemplates = ref<SmsTemplate[]>([])
const myApplications = ref<SmsTemplate[]>([])
const variableDocs = ref<SmsTemplateVariable[]>([])

// 对话框
const showPreviewDialog = ref(false)
const showApplyDialog = ref(false)
const previewTemplate = ref<SmsTemplate | null>(null)

// 分类
const categories = [
  { value: 'order', label: '订单通知' },
  { value: 'logistics', label: '物流通知' },
  { value: 'marketing', label: '营销推广' },
  { value: 'service', label: '客服通知' },
  { value: 'system', label: '系统通知' },
  { value: 'reminder', label: '提醒通知' },
  { value: 'verification', label: '验证码' },
  { value: 'notification', label: '业务通知' }
]

// 计算属性
const pendingApplicationsCount = computed(() =>
  myApplications.value.filter(a => a.status === 'pending_admin' || a.status === 'pending').length
)

const filteredAvailableTemplates = computed(() => {
  let list = availableTemplates.value
  if (availableSearch.value) {
    const kw = availableSearch.value.toLowerCase()
    list = list.filter(t =>
      t.name.toLowerCase().includes(kw) || t.content.toLowerCase().includes(kw)
    )
  }
  if (availableCategoryFilter.value) {
    list = list.filter(t => t.category === availableCategoryFilter.value)
  }
  return list
})

const filteredApplications = computed(() => {
  let list = myApplications.value
  if (applicationStatusFilter.value !== 'all') {
    list = list.filter(a => a.status === applicationStatusFilter.value)
  }
  return list
})

const variableCategories = computed(() => {
  const cats = new Set(variableDocs.value.map(v => v.category))
  return Array.from(cats)
})

const groupedVariables = computed(() => {
  let docs = variableDocs.value
  if (variableSearch.value) {
    const kw = variableSearch.value.toLowerCase()
    docs = docs.filter(v =>
      v.name.toLowerCase().includes(kw) ||
      v.label.toLowerCase().includes(kw) ||
      v.description.toLowerCase().includes(kw)
    )
  }
  if (variableCategoryFilter.value) {
    docs = docs.filter(v => v.category === variableCategoryFilter.value)
  }

  const groups: { category: string; items: SmsTemplateVariable[] }[] = []
  const catMap = new Map<string, SmsTemplateVariable[]>()
  for (const doc of docs) {
    if (!catMap.has(doc.category)) {
      catMap.set(doc.category, [])
    }
    catMap.get(doc.category)!.push(doc)
  }
  catMap.forEach((items, category) => {
    groups.push({ category, items })
  })
  return groups
})

// 方法
const goBack = () => {
  router.push('/service-management/sms')
}

const getCategoryText = (category?: string) => {
  if (!category) return '未分类'
  const map: Record<string, string> = {
    order: '订单通知', logistics: '物流通知', marketing: '营销推广',
    service: '客服通知', system: '系统通知', reminder: '提醒通知',
    verification: '验证码', notification: '业务通知'
  }
  return map[category] || category
}

const getApplicationStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending_admin: 'warning', pending: 'warning', pending_vendor: 'info',
    active: 'success', approved: 'success', rejected: 'danger',
    withdrawn: 'info', deleted: 'info'
  }
  return map[status] || 'info'
}

const getApplicationStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending_admin: '待管理员审核', pending: '待审核', pending_vendor: '服务商审核中',
    active: '已激活', approved: '已通过', rejected: '已拒绝',
    withdrawn: '已撤销', deleted: '已删除'
  }
  return map[status] || status
}

const formatTime = (time?: string) => {
  if (!time) return '-'
  try {
    return new Date(time).toLocaleString('zh-CN')
  } catch {
    return time
  }
}

const getPreviewContent = (template: SmsTemplate) => {
  if (!template?.content) return ''
  let content = template.content
  const exampleValues: Record<string, string> = {
    customerName: '张先生', orderNo: 'ORD20240115001', amount: '299.00',
    deliveryTime: '2024-01-16 14:00', trackingNo: 'SF1234567890',
    productName: '精品商务套装', companyName: 'XX科技', phone: '138****8888',
    code: '123456', discount: '8', startDate: '2024-01-01', endDate: '2024-01-31',
    expressCompany: '顺丰速运', deliveryDate: '2024-01-16', balance: '1580.00',
    serviceName: '售后维修', ticketNo: 'TK20240115001', couponCode: 'VIP2024',
    minutes: '5', activityName: '新春大促', activityContent: '全场3折起',
    result: '处理完成', status: '已确认', eventName: '年度答谢会',
    meetingTitle: '季度销售总结', meetingDate: '2024-01-20', meetingTime: '14:00',
    location: '广州天河', contact: '王助理', venue: '国际会展中心',
    appointmentDate: '2024-01-20', appointmentTime: '14:00-15:00',
    address: '广州市天河区XX路100号', trackingUrl: 'https://t.cn/xxx'
  }
  if (template.variables) {
    template.variables.forEach((variable: string) => {
      const key = variable.replace(/[{}]/g, '')
      const value = exampleValues[key] || `[${key}]`
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
  }
  return content
}

const copyVariable = (varName: string) => {
  navigator.clipboard?.writeText(varName).then(() => {
    ElMessage.success(`已复制 ${varName}`)
  }).catch(() => {
    ElMessage.info(`变量: ${varName}`)
  })
}

const handlePreviewTemplate = (template: SmsTemplate) => {
  previewTemplate.value = template
  showPreviewDialog.value = true
}

const handleWithdraw = async (app: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确认撤销此模板申请？撤销后可以重新申请。', '撤销确认', { type: 'warning' })
    await smsApi.withdrawTemplate(app.id)
    ElMessage.success('申请已撤销')
    loadMyApplications()
  } catch { /* 用户取消 */ }
}

const handleDeleteApplication = async (app: SmsTemplate) => {
  try {
    await ElMessageBox.confirm('确认删除此申请记录？', '删除确认', { type: 'warning' })
    await smsApi.deleteTemplate(app.id)
    ElMessage.success('已删除')
    loadMyApplications()
  } catch { /* 用户取消 */ }
}

const handleApplySubmit = async (data: any) => {
  try {
    await smsApi.applyTemplate({
      name: data.name,
      category: data.category,
      content: data.content,
      variables: data.variables,
      description: data.description
    })
    ElMessage.success('模板申请已提交，等待管理员审核')
    showApplyDialog.value = false
    // 发送通知给管理员
    try {
      await notificationStore.sendMessage(
        MessageType.SMS_TEMPLATE_APPLIED,
        `短信模板申请：${data.name}`,
        `有新的短信模板申请"${data.name}"，请及时审核。`,
        { templateName: data.name, category: data.category }
      )
    } catch { /* 通知发送失败不影响主流程 */ }
    loadMyApplications()
  } catch (error) {
    ElMessage.error('提交失败，请重试')
  }
}

// 数据加载
const loadAvailableTemplates = async () => {
  loadingAvailable.value = true
  try {
    const res = await smsApi.getAvailableTemplates()
    if (res?.data?.templates) {
      availableTemplates.value = res.data.templates
    }
  } catch (error) {
    console.error('加载可用模板失败:', error)
  } finally {
    loadingAvailable.value = false
  }
}

const loadMyApplications = async () => {
  loadingApplications.value = true
  try {
    const res = await smsApi.getMyApplications()
    if (res?.data?.templates) {
      myApplications.value = res.data.templates
    }
  } catch (error) {
    console.error('加载我的申请失败:', error)
  } finally {
    loadingApplications.value = false
  }
}

const loadVariableDocs = async () => {
  loadingVariables.value = true
  try {
    const res = await smsApi.getVariableDocs()
    if (res?.data?.variables) {
      variableDocs.value = res.data.variables
    }
  } catch (error) {
    console.error('加载变量文档失败:', error)
  } finally {
    loadingVariables.value = false
  }
}

onMounted(() => {
  loadAvailableTemplates()
  loadMyApplications()
  loadVariableDocs()
})
</script>

<style scoped>
.sms-template-detail {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 22px;
  color: #303133;
}

.page-description {
  margin: 0;
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

.tab-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

/* 可用模板卡片网格 */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s;
  background: #fff;
}

.template-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.card-title {
  margin: 0;
  font-size: 15px;
  color: #303133;
  font-weight: 600;
}

.card-tags {
  display: flex;
  gap: 5px;
  flex-shrink: 0;
}

.card-content {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
}

.var-tag {
  font-family: 'Courier New', Consolas, monospace;
  font-size: 12px;
}

.more-vars {
  color: #909399;
  font-size: 12px;
  line-height: 22px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 8px;
  border-top: 1px solid #f0f2f5;
}

.code-label {
  font-size: 12px;
  color: #67c23a;
  font-family: 'Courier New', monospace;
}

/* 我的申请列表 */
.applications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fff;
  transition: border-color 0.3s;
}

.application-item.status-rejected {
  border-left: 3px solid #f56c6c;
}

.application-item.status-active,
.application-item.status-approved {
  border-left: 3px solid #67c23a;
}

.application-item.status-pending_admin,
.application-item.status-pending {
  border-left: 3px solid #e6a23c;
}

.application-item.status-withdrawn {
  border-left: 3px solid #909399;
}

.app-info {
  flex: 1;
  margin-right: 16px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.app-name {
  margin: 0;
  font-size: 15px;
  color: #303133;
  font-weight: 600;
}

.app-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-time {
  color: #909399;
  font-size: 12px;
}

.app-content {
  margin: 0 0 8px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.app-variables {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 8px;
}

.reject-reason {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: #fef0f0;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 13px;
  margin-top: 8px;
}

.vendor-info {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 13px;
}

.vendor-label {
  color: #909399;
}

.app-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

/* 变量文档 */
.variables-doc {
  padding-bottom: 20px;
}

.doc-intro {
  margin-bottom: 20px;
}

.doc-intro code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #409eff;
  font-size: 13px;
}

.variable-group {
  margin-bottom: 24px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.group-icon {
  font-size: 18px;
}

.variable-table {
  margin-bottom: 0;
}

.var-code {
  font-family: 'Courier New', Consolas, monospace;
  color: #409eff;
  cursor: pointer;
}

.var-code:hover {
  text-decoration: underline;
}

.example-value {
  color: #67c23a;
  font-style: italic;
}

/* 预览对话框 */
.preview-detail {
  padding: 10px 0;
}

.preview-section {
  margin-top: 20px;
}

.preview-section h4 {
  margin: 0 0 10px 0;
  color: #303133;
  font-size: 14px;
}

.content-box {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 14px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-effect {
  background: #ecf5ff;
  border-color: #b3d8ff;
  color: #409eff;
}

.variables-box {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>

