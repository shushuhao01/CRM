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
          <el-tabs :model-value="activeTab" @update:model-value="$emit('update:activeTab', $event as string)" class="detail-tabs">
            <el-tab-pane label="订单记录" name="orders" />
            <el-tab-pane label="售后记录" name="aftersales" />
            <el-tab-pane label="通话记录" name="calls" />
            <el-tab-pane label="跟进记录" name="followups" />
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
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { Phone, User, VideoPlay, Download } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import {
  getLevelType, getLevelText, getCallStatusText, getCallStatusType,
  getAftersalesStatusText, getAftersalesStatusType,
  getFollowUpTypeLabel, getIntentType, getIntentLabel
} from './helpers'

defineProps<{
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

defineEmits<{
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
}>()
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

@media (max-width: 768px) {
  .customer-detail { padding: 12px; }
  .tab-content { padding: 12px; }
}
</style>

