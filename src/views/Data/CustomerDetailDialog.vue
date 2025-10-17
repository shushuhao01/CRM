<template>
  <el-dialog
    v-model="dialogVisible"
    title="客户详情"
    width="80%"
    :before-close="handleClose"
    class="customer-detail-dialog"
    top="5vh"
  >
    <div v-if="customerData" class="customer-detail-content">
      <!-- 客户基本信息 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><User /></el-icon>
          客户基本信息
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <label>客户姓名：</label>
            <span class="value">{{ customerData.customerName }}</span>
          </div>
          <div class="info-item">
            <label>联系电话：</label>
            <span class="value">{{ displaySensitiveInfoNew(customerData.phone, SensitiveInfoType.PHONE) }}</span>
          </div>
          <div class="info-item">
            <label>订单金额：</label>
            <span class="value amount">¥{{ customerData.orderAmount?.toLocaleString() }}</span>
          </div>
          <div class="info-item">
            <label>下单日期：</label>
            <span class="value">{{ customerData.orderDate }}</span>
          </div>
          <div class="info-item">
            <label>签收日期：</label>
            <span class="value">{{ customerData.signDate }}</span>
          </div>
          <div class="info-item">
            <label>当前状态：</label>
            <el-tag :type="getStatusType(customerData.status)">
              {{ getStatusText(customerData.status) }}
            </el-tag>
          </div>
          <div class="info-item" v-if="customerData.status === 'assigned' || customerData.status === 'archived'">
            <label>操作人：</label>
            <span class="value">{{ customerData.operatorName || '未知' }}</span>
          </div>
          <div class="info-item">
            <label>归属人：</label>
            <span class="value">{{ customerData.createdByName || '未知' }}</span>
          </div>
          <div class="info-item">
            <label>创建时间：</label>
            <span class="value">{{ formatDateTime(customerData.createTime) }}</span>
          </div>
          <div class="info-item full-width">
            <label>收货地址：</label>
            <span class="value">{{ customerData.address }}</span>
          </div>
          <div class="info-item full-width" v-if="customerData.remark">
            <label>备注信息：</label>
            <span class="value">{{ customerData.remark }}</span>
          </div>
          <div class="info-item full-width" v-if="customerData.isReassigned">
            <label>重新分配：</label>
            <span class="value">
              <el-tag type="warning" size="small">已重新分配</el-tag>
            </span>
          </div>
        </div>
      </div>

      <!-- 封存信息 -->
      <div class="detail-section" v-if="customerData.archiveInfo">
        <h3 class="section-title">
          <el-icon><Lock /></el-icon>
          封存信息
        </h3>
        <div class="archive-info">
          <div class="archive-item">
            <label>封存时长：</label>
            <span class="value">{{ customerData.archiveInfo.duration }}</span>
          </div>
          <div class="archive-item">
            <label>封存原因：</label>
            <span class="value">{{ customerData.archiveInfo.reason }}</span>
          </div>
          <div class="archive-item">
            <label>封存时间：</label>
            <span class="value">{{ formatDateTime(customerData.archiveInfo.archiveTime) }}</span>
          </div>
          <div class="archive-item">
            <label>预计解封：</label>
            <span class="value">{{ formatDateTime(customerData.archiveInfo.unarchiveTime) }}</span>
          </div>
          <div class="archive-item full-width">
            <label>封存备注：</label>
            <span class="value">{{ customerData.archiveInfo.remark }}</span>
          </div>
        </div>
      </div>

      <!-- 订单信息 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><ShoppingBag /></el-icon>
          订单信息
        </h3>
        <div class="order-info">
          <div class="order-item">
            <label>订单号：</label>
            <span class="value">{{ customerData.orderNo }}</span>
          </div>
          <div class="order-item">
            <label>物流单号：</label>
            <span class="value">{{ customerData.trackingNo || '暂无' }}</span>
          </div>
          <div class="order-item">
            <label>创建时间：</label>
            <span class="value">{{ formatDateTime(customerData.createTime) }}</span>
          </div>
          <div class="order-item">
            <label>更新时间：</label>
            <span class="value">{{ formatDateTime(customerData.updateTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <h3 class="section-title">
          <el-icon><Operation /></el-icon>
          快捷操作
        </h3>
        <div class="action-buttons">
          <el-button 
            v-if="customerData.status === 'pending'"
            type="success" 
            @click="handleQuickAssign"
            :icon="UserFilled"
          >
            分配
          </el-button>
          <el-button 
            v-if="customerData.status !== 'archived'"
            type="danger" 
            @click="handleQuickArchive"
            :icon="FolderOpened"
          >
            封存
          </el-button>
          <el-button 
            v-if="customerData.status === 'archived'"
            type="info" 
            @click="handleQuickReassign"
            :icon="RefreshRight"
          >
            重新分配
          </el-button>
          <el-button 
            v-if="customerData.status !== 'pending'"
            type="warning" 
            @click="handleQuickRecover"
            :icon="RefreshRight"
          >
            回收
          </el-button>
        </div>
      </div>
    </div>

    <!-- 操作轨迹记录 -->
    <div class="operation-history">
      <el-collapse v-model="activeCollapse">
        <el-collapse-item title="操作轨迹记录" name="history">
          <template #title>
            <div class="collapse-title">
              <el-icon><Operation /></el-icon>
              <span>操作轨迹记录</span>
              <span class="latest-record" v-if="latestRecord">
                （最新：{{ latestRecord.operatorName }} {{ formatOperationType(latestRecord.type) }} - {{ formatDateTime(latestRecord.createTime) }}）
              </span>
            </div>
          </template>
          <div class="history-list">
            <div 
              v-for="record in customerData?.operationRecords || []" 
              :key="record.id"
              class="history-item"
            >
              <div class="history-header">
                <el-tag 
                  :type="getOperationTagType(record.type)"
                  size="small"
                >
                  {{ formatOperationType(record.type) }}
                </el-tag>
                <span class="history-time">{{ formatDateTime(record.createTime) }}</span>
              </div>
              <div class="history-content">
                <div class="history-operator">
                  <el-icon><User /></el-icon>
                  <span>操作人：{{ record.operatorName }}</span>
                  <span v-if="record.operatorDepartment" class="department">（{{ record.operatorDepartment }}）</span>
                </div>
                <div v-if="record.targetUserId" class="history-target">
                  <el-icon><UserFilled /></el-icon>
                  <span>目标：{{ record.targetUserName }}</span>
                  <span v-if="record.targetUserDepartment" class="department">（{{ record.targetUserDepartment }}）</span>
                </div>
                <div v-if="record.reason" class="history-reason">
                  <span>原因：{{ record.reason }}</span>
                </div>
                <div v-if="record.remark" class="history-remark">
                  <span>备注：{{ record.remark }}</span>
                </div>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  User, ShoppingBag, Operation, UserFilled, 
  FolderOpened, RefreshRight, Lock 
} from '@element-plus/icons-vue'
import type { DataListItem } from '@/api/data'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

// Props
interface Props {
  modelValue: boolean
  customerData: DataListItem | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'quick-assign': [data: DataListItem]
  'quick-archive': [data: DataListItem]
  'quick-recover': [data: DataListItem]
  'quick-reassign': [data: DataListItem]
}>()

// 响应式数据
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 操作轨迹折叠状态
const activeCollapse = ref<string[]>([])

// 最新操作记录
const latestRecord = computed(() => {
  const records = props.customerData?.operationRecords || []
  if (records.length === 0) return null
  return records.reduce((latest, current) => {
    return new Date(current.createTime) > new Date(latest.createTime) ? current : latest
  })
})

// 方法
// 格式化操作类型
const formatOperationType = (type: string) => {
  const typeMap: Record<string, string> = {
    'assign': '分配',
    'archive': '封存',
    'recover': '回收',
    'reassign': '重新分配'
  }
  return typeMap[type] || type
}

// 获取操作标签类型
const getOperationTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    'assign': 'success',
    'archive': 'warning',
    'recover': 'danger',
    'reassign': 'info'
  }
  return typeMap[type] || 'info'
}

// 格式化日期时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '暂无'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
const handleClose = () => {
  emit('update:modelValue', false)
}

const getStatusType = (status: string) => {
  const types = {
    pending: '',
    assigned: 'success',
    archived: 'warning'
  }
  return types[status] || ''
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '待分配',
    assigned: '已分配',
    archived: '已封存',
    recovered: '已回收'
  }
  return texts[status] || status
}



const handleQuickAssign = () => {
  if (props.customerData) {
    emit('quick-assign', props.customerData)
  }
}

const handleQuickArchive = () => {
  if (props.customerData) {
    emit('quick-archive', props.customerData)
  }
}

const handleQuickRecover = () => {
  if (props.customerData) {
    emit('quick-recover', props.customerData)
  }
}

const handleQuickReassign = () => {
  if (props.customerData) {
    emit('quick-reassign', props.customerData)
  }
}
</script>

<style scoped>
.customer-detail-dialog {
  .customer-detail-content {
    max-height: 70vh;
    overflow-y: auto;
  }

  .detail-section {
    margin-bottom: 24px;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .info-item {
    display: flex;
    align-items: center;

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      min-width: 80px;
      font-weight: 500;
      color: #606266;
    }

    .value {
      color: #303133;

      &.amount {
        font-weight: 600;
        color: #e6a23c;
      }
    }
  }

  .order-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .order-item {
    display: flex;
    align-items: center;

    label {
      min-width: 80px;
      font-weight: 500;
      color: #606266;
    }

    .value {
      color: #303133;
    }
  }

  .archive-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .archive-item {
    display: flex;
    align-items: center;

    &.full-width {
      grid-column: 1 / -1;
    }

    label {
      min-width: 80px;
      font-weight: 500;
      color: #606266;
    }

    .value {
      color: #303133;
    }
  }

  .action-section {
    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: center;
    }
  }

  .operation-history {
    margin-top: 20px;
    border-top: 1px solid #ebeef5;
    padding-top: 20px;

    .collapse-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;

      .latest-record {
        font-size: 12px;
        color: #909399;
        font-weight: normal;
      }
    }

    .history-list {
      .history-item {
        padding: 12px;
        border: 1px solid #ebeef5;
        border-radius: 6px;
        margin-bottom: 8px;
        background-color: #fafafa;

        &:last-child {
          margin-bottom: 0;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          .history-time {
            font-size: 12px;
            color: #909399;
          }
        }

        .history-content {
          .history-operator,
          .history-target,
          .history-reason,
          .history-remark {
            display: flex;
            align-items: center;
            gap: 4px;
            margin-bottom: 4px;
            font-size: 13px;
            color: #606266;

            &:last-child {
              margin-bottom: 0;
            }

            .department {
              color: #909399;
            }
          }
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .customer-detail-dialog {
    .info-grid,
    .order-info,
    .archive-info {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      justify-content: center;
    }
  }
}
</style>