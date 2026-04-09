<template>
  <el-card class="tab-card">
    <el-tabs v-model="localActiveTab" @tab-click="handleTabClick">
      <!-- 订单历史 -->
      <el-tab-pane label="订单历史" name="orders">
        <div class="tab-content">
          <div class="tab-header">
            <el-button @click="$emit('create-order')" icon="Plus" type="primary" size="small">新建订单</el-button>
            <el-input v-model="localOrderSearch" placeholder="搜索订单号、商品名称" style="width: 300px;" clearable>
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <el-table :data="filteredOrders" style="width: 100%" v-loading="loadingOrders">
            <el-table-column prop="orderNo" label="订单号" width="200" show-overflow-tooltip />
            <el-table-column prop="products" label="商品名称" min-width="220" show-overflow-tooltip />
            <el-table-column prop="totalAmount" label="订单金额" width="130">
              <template #default="{ row }">
                <span class="amount">{{ row.totalAmount.toLocaleString() }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="订单状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusTagType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="orderDate" label="下单时间" width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ formatDateTime(row.orderDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button @click="$emit('view-order', row.id)" size="small" type="primary" link>查看</el-button>
                <el-button @click="$emit('edit-order', row.id)" size="small" type="warning" link v-if="row.status === '待付款'">编辑</el-button>
                <el-button @click="$emit('cancel-order', row.id)" size="small" type="danger" link v-if="row.status === '待付款'">取消</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 售后记录 -->
      <el-tab-pane label="售后记录" name="service">
        <div class="tab-content">
          <div class="tab-header">
            <el-button @click="$emit('create-aftersales')" icon="Plus" type="primary" size="small">新建售后</el-button>
          </div>
          <el-table :data="serviceRecords" style="width: 100%" v-loading="loadingService">
            <el-table-column prop="serviceNo" label="售后单号" width="200" show-overflow-tooltip />
            <el-table-column prop="orderNo" label="关联订单" width="200" show-overflow-tooltip />
            <el-table-column prop="type" label="售后类型" width="120">
              <template #default="{ row }">
                <el-tag :type="getServiceType(row.type)" size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reason" label="售后原因" min-width="200" show-overflow-tooltip />
            <el-table-column prop="amount" label="退款金额" width="130">
              <template #default="{ row }">
                <span class="amount" v-if="row.amount">{{ row.amount.toLocaleString() }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="处理状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getServiceStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="申请时间" width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ formatDateTime(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button @click="$emit('view-service', row.id)" size="small" type="primary" link>查看</el-button>
                <el-button @click="$emit('handle-service', row.id)" size="small" type="warning" link v-if="row.status === '待处理'">处理</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 通话记录 -->
      <el-tab-pane label="通话记录" name="calls">
        <div class="tab-content">
          <div class="tab-header">
            <el-button @click="$emit('make-call')" icon="Phone" type="success" size="small"
              v-if="hasCallPermission">发起通话</el-button>
          </div>
          <el-table :data="callRecords" style="width: 100%" v-loading="loadingCalls">
            <el-table-column prop="callType" label="通话类型" width="120">
              <template #default="{ row }">
                <el-tag :type="row.callType === '呼出' ? 'success' : 'info'" size="small">{{ row.callType }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="phone" label="电话号码" width="150">
              <template #default="{ row }">
                {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="通话时长" width="120" />
            <el-table-column prop="status" label="通话状态" width="120">
              <template #default="{ row }">
                <el-tag :type="getCallStatusType(row.status)" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="summary" label="通话摘要" min-width="200" show-overflow-tooltip />
            <el-table-column prop="callTime" label="通话时间" width="200" show-overflow-tooltip>
              <template #default="{ row }">
                {{ formatDateTime(row.callTime) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button @click="$emit('view-call-detail', row.id)" size="small" type="primary" link
                  v-if="hasViewRecordsPermission">详情</el-button>
                <el-button @click="$emit('play-recording', row.id)" size="small" type="success" link
                  v-if="row.status === '已接通' && hasPlayRecordingPermission">播放</el-button>
                <el-button @click="$emit('add-followup-from-call', row)" size="small" type="warning" link>跟进</el-button>
                <el-dropdown trigger="click">
                  <el-button size="small" type="info" link>
                    更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="$emit('download-recording', row.id)"
                        v-if="row.status === '已接通' && hasDownloadRecordingPermission">
                        <el-icon><Download /></el-icon>下载录音
                      </el-dropdown-item>
                      <el-dropdown-item @click="$emit('share-call', row.id)">
                        <el-icon><Share /></el-icon>分享通话
                      </el-dropdown-item>
                      <el-dropdown-item @click="$emit('call-back', row.phone)"
                        v-if="hasCallPermission">
                        <el-icon><Phone /></el-icon>回拨
                      </el-dropdown-item>
                      <el-dropdown-item @click="$emit('edit-call-record', row.id)"
                        v-if="hasEditRecordsPermission">
                        <el-icon><Edit /></el-icon>编辑记录
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <!-- 跟进记录 -->
      <el-tab-pane label="跟进记录" name="followup">
        <div class="tab-content">
          <div class="tab-header">
            <el-button @click="$emit('add-followup')" icon="Plus" type="primary" size="small">添加跟进</el-button>
          </div>
          <div class="timeline-container">
            <el-timeline>
              <el-timeline-item
                v-for="item in followUpRecords"
                :key="item.id"
                :timestamp="formatDateTime(item.createTime)"
                :type="getFollowUpType(item.type)"
              >
                <el-card class="timeline-card">
                  <div class="timeline-header">
                    <span class="timeline-title">{{ item.title }}</span>
                    <el-tag :type="getFollowUpType(item.type)" size="small">{{ item.type }}</el-tag>
                  </div>
                  <div class="timeline-content">{{ item.content }}</div>
                  <div class="timeline-footer">
                    <span class="timeline-author">{{ item.author }}</span>
                    <div class="timeline-actions" v-if="canEditFollowUp(item.createTime)">
                      <el-button @click="$emit('edit-followup', item.id)" size="small" type="primary" link>编辑</el-button>
                      <el-button
                        v-if="isAdmin"
                        @click="$emit('delete-followup', item.id)"
                        size="small"
                        type="danger"
                        link
                      >
                        删除
                      </el-button>
                    </div>
                    <el-tooltip v-else content="超过24小时的跟进记录不可编辑" placement="top">
                      <el-button size="small" type="info" link disabled>已锁定</el-button>
                    </el-tooltip>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </el-tab-pane>

      <!-- 客户标签 -->
      <el-tab-pane label="客户标签" name="tags">
        <div class="tab-content">
          <div class="tab-header">
            <el-button @click="$emit('add-tag')" icon="Plus" type="primary" size="small">添加标签</el-button>
          </div>
          <div class="tags-container">
            <el-tag
              v-for="tag in customerTags"
              :key="tag.id"
              :type="tag.type"
              closable
              @close="$emit('remove-tag', tag.id)"
              class="tag-item"
            >
              {{ tag.name }}
            </el-tag>
            <el-tag v-if="customerTags.length === 0" type="info">暂无标签</el-tag>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Search, Phone, Edit, Download, Share, ArrowDown } from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { formatDateTime } from '@/utils/date'
import { getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { getServiceType, getServiceStatusType, getCallStatusType, getFollowUpType } from './helpers'

const props = defineProps<{
  activeTab: string
  filteredOrders: any[]
  serviceRecords: any[]
  callRecords: any[]
  followUpRecords: any[]
  customerTags: any[]
  loadingOrders: boolean
  loadingService: boolean
  loadingCalls: boolean
  orderSearch: string
  isAdmin: boolean
  hasCallPermission: boolean
  hasViewRecordsPermission: boolean
  hasPlayRecordingPermission: boolean
  hasDownloadRecordingPermission: boolean
  hasEditRecordsPermission: boolean
}>()

const emit = defineEmits<{
  'update:activeTab': [val: string]
  'update:orderSearch': [val: string]
  'tab-click': [tab: any]
  'create-order': []
  'view-order': [id: string]
  'edit-order': [id: string]
  'cancel-order': [id: string]
  'create-aftersales': []
  'view-service': [id: string]
  'handle-service': [id: string]
  'make-call': []
  'view-call-detail': [id: string]
  'play-recording': [id: string]
  'add-followup-from-call': [row: any]
  'download-recording': [id: string]
  'share-call': [id: string]
  'call-back': [phone: string]
  'edit-call-record': [id: string]
  'add-followup': []
  'edit-followup': [id: string]
  'delete-followup': [id: string]
  'add-tag': []
  'remove-tag': [id: string]
}>()

const localActiveTab = ref(props.activeTab)
const localOrderSearch = ref(props.orderSearch)

watch(() => props.activeTab, (val) => { localActiveTab.value = val })
watch(localActiveTab, (val) => { emit('update:activeTab', val) })
watch(() => props.orderSearch, (val) => { localOrderSearch.value = val })
watch(localOrderSearch, (val) => { emit('update:orderSearch', val) })

const handleTabClick = (tab: any) => {
  emit('tab-click', tab)
}

const canEditFollowUp = (createTime: string): boolean => {
  const created = new Date(createTime).getTime()
  const now = Date.now()
  return now - created < 24 * 60 * 60 * 1000
}
</script>

<style scoped>
.tab-card { border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); border: none; transition: all 0.3s ease; }
.tab-content { padding: 24px; }
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 20px; background: #f8f9fa; border-radius: 12px; }
.amount { color: #f56c6c; font-weight: 500; }
.timeline-container { max-height: 600px; overflow-y: auto; }
.timeline-card { margin-bottom: 16px; border-radius: 12px; transition: all 0.3s ease; }
.timeline-card:hover { transform: translateX(4px); box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2); }
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.timeline-title { font-weight: 700; color: #495057; font-size: 16px; }
.timeline-content { color: #6c757d; line-height: 1.6; font-size: 14px; margin-bottom: 12px; }
.timeline-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.timeline-author { color: #64748b; font-size: 14px; font-weight: 500; }
.timeline-actions { display: flex; gap: 8px; align-items: center; }
.locked-tip { color: #f59e0b; font-size: 12px; font-weight: 600; margin-left: 8px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.tag-item { position: relative; border-radius: 20px; transition: all 0.3s ease; }
.tag-item:hover { transform: scale(1.05); }

@media (max-width: 768px) {
  .tab-header { flex-direction: column; gap: 16px; align-items: stretch; }
}
</style>
