<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    :title="`客户详情 - ${currentCustomer?.customerName}`"
    width="1200px" top="5vh" class="customer-detail-dialog" :close-on-click-modal="false"
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
                {{ currentCustomer.assignedName || currentCustomer.createdByName || currentCustomer.salesPerson || '未分配' }}
              </span>
              <span class="contact-item">
                <el-tooltip v-if="currentCustomer._source === 'customer'" content="自建客户已存在客户列表，无需转入" placement="top">
                  <el-tag type="info" size="small">自建客户</el-tag>
                </el-tooltip>
                <el-tag v-else-if="currentCustomer._prospectStatus === 'converted'" type="success" size="small">已转入客户列表</el-tag>
                <el-tag v-else type="warning" size="small">未转入客户列表</el-tag>
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
          <el-tabs :model-value="activeTab" @update:model-value="$emit('update:activeTab', $event as string)" class="detail-tabs">
            <el-tab-pane label="订单记录" name="orders" />
            <el-tab-pane label="售后记录" name="aftersales" />
            <el-tab-pane label="通话记录" name="calls" />
            <el-tab-pane label="跟进记录" name="followups" />
            <el-tab-pane label="客户日志" name="logs" />
          </el-tabs>
          <div class="tabs-actions">
            <el-button v-if="activeTab === 'orders'" type="primary" size="small" @click="$emit('create-order')">新建订单</el-button>
            <el-button v-if="activeTab === 'aftersales'" type="primary" size="small" @click="$emit('create-aftersales')">新建售后</el-button>
            <el-button v-if="activeTab === 'calls'" type="primary" size="small" @click="$emit('detail-outbound-call')">发起外呼</el-button>
            <el-button v-if="activeTab === 'followups'" type="primary" size="small" @click="$emit('open-followup-dialog')">新建跟进</el-button>
          </div>
        </div>

        <!-- 订单记录表格 -->
        <div v-show="activeTab === 'orders'" class="tab-content">
          <el-table :data="paginatedOrders" v-loading="detailLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
            <el-table-column prop="orderNo" label="订单号" min-width="170" />
            <el-table-column prop="productName" label="商品名称" min-width="200" show-overflow-tooltip />
            <el-table-column prop="amount" label="金额" width="120" align="right">
              <template #default="{ row }">
                <span style="color: #f56c6c; font-weight: 500; font-size: 15px;">¥{{ row.amount }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusTagType(row.status)">
                  {{ getOrderStatusTextFromConfig(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="下单时间" width="170" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="$emit('view-order', row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!detailLoading && customerOrders.length === 0" description="暂无订单记录" :image-size="80" />
          <div v-if="detailPagination.orders.total > 0" class="tab-pagination">
            <el-pagination v-model:current-page="detailPagination.orders.page" v-model:page-size="detailPagination.orders.pageSize"
              :page-sizes="[10, 20, 50]" :total="detailPagination.orders.total" layout="total, sizes, prev, pager, next" />
          </div>
        </div>

        <!-- 售后记录表格 -->
        <div v-show="activeTab === 'aftersales'" class="tab-content">
          <el-table :data="paginatedAftersales" v-loading="detailLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
            <el-table-column prop="ticketNo" label="工单号" min-width="160" />
            <el-table-column prop="type" label="类型" width="110" />
            <el-table-column prop="description" label="问题描述" min-width="220" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getAftersalesStatusType(row.status)">{{ getAftersalesStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="170" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="$emit('view-aftersales', row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!detailLoading && customerAftersales.length === 0" description="暂无售后记录" :image-size="80" />
          <div v-if="detailPagination.aftersales.total > 0" class="tab-pagination">
            <el-pagination v-model:current-page="detailPagination.aftersales.page" v-model:page-size="detailPagination.aftersales.pageSize"
              :page-sizes="[10, 20, 50]" :total="detailPagination.aftersales.total" layout="total, sizes, prev, pager, next" />
          </div>
        </div>

        <!-- 通话记录表格 -->
        <div v-show="activeTab === 'calls'" class="tab-content">
          <el-table :data="paginatedCalls" v-loading="detailLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
            <el-table-column prop="callType" label="类型" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.callType === 'outbound' ? '' : 'success'">{{ row.callType === 'outbound' ? '外呼' : '来电' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="时长" width="100" align="center" />
            <el-table-column label="录音" width="140" align="center">
              <template #default="{ row }">
                <template v-if="row.recordingUrl">
                  <el-button link type="primary" size="small" @click="$emit('play-recording', row)"><el-icon><VideoPlay /></el-icon> 播放</el-button>
                  <el-button link type="success" size="small" @click="$emit('download-recording', row)"><el-icon><Download /></el-icon></el-button>
                </template>
                <span v-else style="color: #c0c4cc;">无录音</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="110" align="center">
              <template #default="{ row }">
                <el-tag :type="getCallStatusType(row.status)">{{ getCallStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="110" />
            <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
            <el-table-column prop="startTime" label="开始时间" width="170" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="$emit('view-call-detail', row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!detailLoading && customerCalls.length === 0" description="暂无通话记录" :image-size="80" />
          <div v-if="detailPagination.calls.total > 0" class="tab-pagination">
            <el-pagination v-model:current-page="detailPagination.calls.page" v-model:page-size="detailPagination.calls.pageSize"
              :page-sizes="[10, 20, 50]" :total="detailPagination.calls.total" layout="total, sizes, prev, pager, next" />
          </div>
        </div>

        <!-- 跟进记录表格 -->
        <div v-show="activeTab === 'followups'" class="tab-content">
          <el-table :data="paginatedFollowups" v-loading="detailLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">{{ getFollowUpTypeLabel(row.type) }}</template>
            </el-table-column>
            <el-table-column prop="content" label="跟进内容" min-width="180" show-overflow-tooltip />
            <el-table-column prop="customerIntent" label="意向" width="90" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.customerIntent" :type="getIntentType(row.customerIntent)">{{ getIntentLabel(row.customerIntent) }}</el-tag>
                <span v-else style="color: #c0c4cc;">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="callTags" label="标签" min-width="120">
              <template #default="{ row }">
                <template v-if="row.callTags && row.callTags.length > 0">
                  <el-tag v-for="tag in row.callTags.slice(0, 2)" :key="tag" type="info" style="margin-right: 4px;">{{ tag }}</el-tag>
                  <span v-if="row.callTags.length > 2" style="color: #909399; font-size: 12px;">+{{ row.callTags.length - 2 }}</span>
                </template>
                <span v-else style="color: #c0c4cc;">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">
                <span v-if="row.remark">{{ row.remark }}</span>
                <span v-else style="color: #c0c4cc;">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="nextPlan" label="下次计划" width="170" />
            <el-table-column prop="operator" label="跟进人" width="100" />
            <el-table-column prop="createTime" label="跟进时间" width="170" />
            <el-table-column label="操作" width="80" align="center">
              <template #default="{ row }">
                <el-button link type="primary" @click="$emit('view-followup', row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!detailLoading && customerFollowups.length === 0" description="暂无跟进记录" :image-size="80" />
          <div v-if="detailPagination.followups.total > 0" class="tab-pagination">
            <el-pagination v-model:current-page="detailPagination.followups.page" v-model:page-size="detailPagination.followups.pageSize"
              :page-sizes="[10, 20, 50]" :total="detailPagination.followups.total" layout="total, sizes, prev, pager, next" />
          </div>
        </div>

        <!-- 客户日志 -->
        <div v-show="activeTab === 'logs'" class="tab-content">
          <div class="customer-logs-timeline">
            <el-timeline v-if="customerLogs.length > 0">
              <el-timeline-item
                v-for="log in pagedCustomerLogs"
                :key="log.id"
                :timestamp="log.time"
                :type="getLogType(log.action)"
                placement="top"
              >
                <div class="log-content">
                  <span class="log-action">{{ getLogActionText(log.action) }}</span>
                  <span class="log-detail">{{ log.detail }}</span>
                  <span v-if="log.operator" class="log-operator">操作人: {{ log.operator }}</span>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-pagination
              v-if="customerLogs.length > logPageSize"
              :current-page="logCurrentPage"
              :page-size="logPageSize"
              :total="customerLogs.length"
              layout="total, prev, pager, next"
              small
              style="margin-top: 12px; justify-content: center;"
              @current-change="(p: number) => logCurrentPage = p"
            />
            <el-empty v-if="customerLogs.length === 0" description="暂无客户日志" :image-size="80" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <el-button v-if="currentCustomer?._prospectStatus === 'converted'" type="success" disabled>已转入客户</el-button>
          <el-button v-else-if="currentCustomer?._prospectId" type="warning" @click="handleConvert" :loading="converting">
            转入客户列表
          </el-button>
        </div>
        <el-button @click="$emit('update:visible', false)">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Phone, User, VideoPlay, Download } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import {
  getLevelType, getLevelText, getCallStatusText, getCallStatusType,
  getAftersalesStatusText, getAftersalesStatusType,
  getFollowUpTypeLabel, getIntentType, getIntentLabel
} from './helpers'
import { prospectApi } from '@/api/callProspect'
import { customerDetailApi } from '@/api/customerDetail'
import { formatDateTime } from '@/utils/dateFormat'

const props = defineProps<{
  visible: boolean
  currentCustomer: any
  activeTab: string
  detailLoading: boolean
  customerOrders: any[]
  customerCalls: any[]
  customerFollowups: any[]
  customerAftersales: any[]
  detailPagination: any
  paginatedOrders: any[]
  paginatedCalls: any[]
  paginatedFollowups: any[]
  paginatedAftersales: any[]
}>()

// 客户日志 - 从API和本地数据合成
const apiLogs = ref<any[]>([])

// 当切换到日志TAB或弹窗打开时加载日志
watch(() => [props.visible, props.activeTab], async ([visible, tab]) => {
  if (visible && tab === 'logs') {
    const customer = props.currentCustomer
    if (!customer) return
    apiLogs.value = []

    try {
      // 如果已转入客户列表，优先从客户日志API加载
      const convertedId = customer._convertedCustomerId
      if (convertedId) {
        const res: any = await customerDetailApi.getCustomerLogs(convertedId, 0, 50)
        const list = res?.list || res?.data?.list || []
        apiLogs.value = list.map((l: any) => ({
          id: l.id,
          action: l.logType || l.log_type || 'other',
          detail: l.content,
          time: formatDateTime(l.createdAt || l.created_at),
          operator: l.operatorName || l.operator_name || ''
        }))
      }

      // 同时加载外呼名单日志（两种来源合并）
      if (customer._prospectId) {
        const res: any = await prospectApi.getLogs(customer._prospectId)
        const prospectLogs = (res?.data || []).map((l: any) => ({
          id: l.id,
          action: l.log_type || l.logType,
          detail: l.content,
          time: formatDateTime(l.created_at || l.createdAt),
          operator: l.operator_name || l.operatorName || ''
        }))
        apiLogs.value = [...apiLogs.value, ...prospectLogs]
      }
    } catch {
      apiLogs.value = []
    }
  }
}, { immediate: true })

const customerLogs = computed(() => {
  const logs: any[] = [...apiLogs.value]
  const customer = props.currentCustomer
  if (!customer) return logs

  // 如果API没返回数据，生成本地日志
  if (apiLogs.value.length === 0) {
    if (customer.createdAt || customer.createTime) {
      logs.push({
        id: 'created',
        action: 'import',
        detail: `客户「${customer.customerName || customer.name}」被录入系统`,
        time: formatDateTime(customer.createdAt || customer.createTime),
        operator: customer.createdByName || customer.salesPerson || ''
      })
    }

    if (customer.assignedName) {
      logs.push({
        id: 'assigned',
        action: 'assign',
        detail: `分配给 ${customer.assignedName}`,
        time: customer.assignedAt ? formatDateTime(customer.assignedAt) : formatDateTime(customer.updatedAt || customer.createdAt || ''),
        operator: ''
      })
    }

    if (customer._prospectStatus === 'converted') {
      logs.push({
        id: 'converted',
        action: 'convert',
        detail: '已转入客户列表',
        time: customer.convertedAt ? formatDateTime(customer.convertedAt) : '',
        operator: ''
      })
    }
  }

  // 通话日志
  if (props.customerCalls?.length) {
    props.customerCalls.slice(0, 5).forEach((call: any, idx: number) => {
      logs.push({
        id: `call_${idx}`,
        action: 'call',
        detail: `${call.callType === 'outbound' ? '外呼' : '来电'} - ${call.duration || '0秒'} - ${getCallStatusText(call.status)}`,
        time: call.startTime,
        operator: call.operator || ''
      })
    })
  }

  // 跟进日志
  if (props.customerFollowups?.length) {
    props.customerFollowups.slice(0, 5).forEach((fu: any, idx: number) => {
      logs.push({
        id: `followup_${idx}`,
        action: 'followup',
        detail: fu.content || '跟进记录',
        time: fu.createTime,
        operator: fu.operator || ''
      })
    })
  }

  // 按时间倒序
  return logs.sort((a, b) => {
    if (!a.time) return 1
    if (!b.time) return -1
    return new Date(b.time).getTime() - new Date(a.time).getTime()
  })
})

const logPageSize = 5
const logCurrentPage = ref(1)
const pagedCustomerLogs = computed(() => {
  const start = (logCurrentPage.value - 1) * logPageSize
  return customerLogs.value.slice(start, start + logPageSize)
})

watch(() => props.visible, (v) => {
  if (v) logCurrentPage.value = 1
})

const getLogType = (action: string) => {
  const map: Record<string, string> = {
    'import': 'primary',
    'assign': 'warning',
    'convert': 'success',
    'call': '',
    'followup': 'primary',
    'edit': 'info',
    'delete': 'danger',
    'restore': 'success'
  }
  return map[action] || ''
}

const getLogActionText = (action: string) => {
  const map: Record<string, string> = {
    'import': '录入',
    'assign': '分配',
    'convert': '转入',
    'call': '通话',
    'followup': '跟进',
    'edit': '编辑',
    'delete': '删除',
    'restore': '恢复'
  }
  return map[action] || action
}

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:activeTab': [value: string]
  'create-order': []
  'create-aftersales': []
  'detail-outbound-call': []
  'open-followup-dialog': []
  'view-order': [row: any]
  'view-aftersales': [row: any]
  'view-call-detail': [row: any]
  'view-followup': [row: any]
  'play-recording': [row: any]
  'download-recording': [row: any]
  'converted': []
}>()

const converting = ref(false)
const handleConvert = async () => {
  const pid = props.currentCustomer?._prospectId
  if (!pid) return
  converting.value = true
  try {
    const res: any = await prospectApi.convert([pid])
    ElMessage.success(res?.message || '转入成功')
    emit('converted')
    emit('update:visible', false)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '转入失败')
  } finally {
    converting.value = false
  }
}
</script>

<style scoped>
.customer-detail-dialog :deep(.el-dialog__header) { padding: 20px 24px; border-bottom: 1px solid #ebeef5; margin-right: 0; }
.customer-detail-dialog :deep(.el-dialog__body) { padding: 0; max-height: calc(90vh - 120px); overflow-y: auto; }
.customer-detail { padding: 0; }
.customer-header { display: flex; justify-content: space-between; align-items: center; padding: 28px 32px; border-bottom: 1px solid #f0f0f0; background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%); }
.customer-main-info { display: flex; align-items: center; gap: 20px; }
.customer-avatar :deep(.el-avatar) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-size: 22px; font-weight: 500; width: 64px; height: 64px; }
.customer-basic { display: flex; flex-direction: column; gap: 8px; }
.customer-name { font-size: 20px; font-weight: 600; color: #303133; display: flex; align-items: center; }
.customer-contact { display: flex; gap: 24px; color: #606266; font-size: 15px; }
.customer-contact .contact-item { display: flex; align-items: center; gap: 6px; }
.customer-contact .el-icon { font-size: 16px; color: #909399; }
.customer-stats { display: flex; gap: 40px; }
.customer-stats .stat-item { text-align: center; min-width: 80px; }
.customer-stats .stat-value { font-size: 24px; font-weight: 600; color: #409eff; line-height: 1.2; }
.customer-stats .stat-value.last-call { font-size: 14px; color: #606266; font-weight: 500; }
.customer-stats .stat-label { font-size: 13px; color: #909399; margin-top: 6px; }
.tabs-section { padding: 0; background: #fff; }
.tabs-header { display: flex; justify-content: space-between; align-items: center; padding: 0 32px; border-bottom: 1px solid #ebeef5; }
.tabs-header .detail-tabs { flex: 1; }
.tabs-header .detail-tabs :deep(.el-tabs__header) { margin: 0; border: none; }
.tabs-header .detail-tabs :deep(.el-tabs__nav-wrap::after) { display: none; }
.tabs-header .detail-tabs :deep(.el-tabs__item) { height: 56px; line-height: 56px; font-size: 16px; color: #606266; padding: 0 24px; }
.tabs-header .detail-tabs :deep(.el-tabs__item.is-active) { color: #409eff; font-weight: 500; }
.tabs-actions { display: flex; align-items: center; gap: 10px; }
.tab-content { padding: 24px 32px 32px; min-height: 360px; }
.tab-content :deep(.el-table) { border-radius: 6px; border: 1px solid #ebeef5; font-size: 14px; }
.tab-content :deep(.el-table th.el-table__cell) { font-weight: 500; font-size: 14px; padding: 14px 0; }
.tab-content :deep(.el-table td.el-table__cell) { padding: 14px 0; font-size: 14px; }
.tab-content :deep(.el-empty) { padding: 60px 0; }
.tab-pagination { margin-top: 20px; display: flex; justify-content: center; }

.customer-logs-timeline { padding: 8px 0; }
.customer-logs-timeline .log-content { display: flex; flex-direction: column; gap: 4px; }
.customer-logs-timeline .log-action { font-weight: 600; color: #303133; font-size: 14px; }
.customer-logs-timeline .log-detail { color: #606266; font-size: 13px; }
.customer-logs-timeline .log-operator { color: #909399; font-size: 12px; }

@media (max-width: 768px) {
  .customer-detail { padding: 12px; }
  .tab-content { padding: 12px; }
}
</style>

