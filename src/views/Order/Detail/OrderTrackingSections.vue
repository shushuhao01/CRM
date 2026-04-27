<template>
  <!-- 物流信息跟踪 -->
  <div class="row-layout full-width">
    <el-card class="logistics-card">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <el-icon><Van /></el-icon>
            <span>物流信息跟踪</span>
          </div>
          <div class="card-header-right">
            <el-button size="small" @click="$emit('refresh-logistics')" :loading="logisticsLoading">
              {{ logisticsLoading ? '查询中...' : '刷新' }}
            </el-button>
            <el-button
              size="small"
              type="text"
              @click="logisticsCollapsedLocal = !logisticsCollapsedLocal"
              :icon="logisticsCollapsedLocal ? ArrowDown : ArrowUp"
            >
              {{ logisticsCollapsedLocal ? '展开' : '收起' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="!logisticsCollapsedLocal" class="logistics-timeline" v-loading="logisticsLoading">
          <el-timeline v-if="logisticsInfo.length > 0">
            <el-timeline-item
              v-for="(item, index) in logisticsInfo"
              :key="index"
              :timestamp="item.time"
              :type="index === 0 ? 'primary' : 'info'"
              :size="index === 0 ? 'large' : 'normal'"
              placement="top"
            >
              <div class="logistics-trace-item" :class="{ 'logistics-trace-first': index === 0 }">
                <div class="trace-description">{{ item.description }}</div>
                <div class="trace-location" v-if="item.location">
                  <el-icon><Location /></el-icon>
                  <span>{{ item.location }}</span>
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-alert v-else-if="orderProductType === 'virtual'" type="info" :closable="false" show-icon style="margin: 8px 0;">
            <template #title>虚拟商品无需实物发货，没有物流单号</template>
          </el-alert>
          <el-empty v-else description="物流信息请点击上方刷新按钮获取" />
        </div>
      </el-collapse-transition>
    </el-card>
  </div>

  <!-- 订单状态和轨迹 -->
  <div class="row-layout full-width">
    <el-card class="status-timeline-card">
      <template #header>
        <div class="card-header">
          <div class="card-header-left">
            <el-icon><Clock /></el-icon>
            <span>订单状态和轨迹</span>
          </div>
          <div class="card-header-right">
            <el-button
              size="small"
              type="text"
              @click="statusTimelineCollapsedLocal = !statusTimelineCollapsedLocal"
              :icon="statusTimelineCollapsedLocal ? ArrowDown : ArrowUp"
            >
              {{ statusTimelineCollapsedLocal ? '展开' : '收起' }}
            </el-button>
          </div>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="!statusTimelineCollapsedLocal">
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in orderTimeline"
              :key="index"
              :timestamp="formatDateTime(item.timestamp)"
              :type="item.type"
              :icon="item.icon"
              :color="item.color"
            >
              <div class="timeline-content">
                <div class="timeline-title">
                  <span>{{ item.title }}</span>
                  <el-tag
                    v-if="item.actionType && item.actionType !== 'status_change'"
                    :type="getActionTagType(item.actionType)"
                    size="small"
                    style="margin-left: 8px;"
                  >{{ getActionTagLabel(item.actionType) }}</el-tag>
                </div>
                <div class="timeline-description">{{ item.description }}</div>
                <div v-if="item.operator" class="timeline-operator">
                  <el-icon><User /></el-icon>
                  操作人：{{ item.operator }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </el-collapse-transition>
    </el-card>
  </div>

  <!-- 售后历史轨迹 -->
  <div class="row-layout full-width">
    <el-card class="after-sales-card">
      <template #header>
        <div class="card-header">
          <el-icon><Service /></el-icon>
          <span>售后历史轨迹</span>
          <el-button
            size="small"
            type="text"
            @click="afterSalesCollapsedLocal = !afterSalesCollapsedLocal"
            :icon="afterSalesCollapsedLocal ? ArrowDown : ArrowUp"
          >
            {{ afterSalesCollapsedLocal ? '展开' : '收起' }}
          </el-button>
        </div>
      </template>

      <el-collapse-transition>
        <div v-show="!afterSalesCollapsedLocal">
          <el-timeline v-if="afterSalesHistory.length > 0">
            <el-timeline-item
              v-for="(item, index) in afterSalesHistory"
              :key="index"
              :timestamp="item.timestamp"
              :type="getAfterSalesType(item.type)"
            >
              <div class="after-sales-content">
                <div class="after-sales-title">{{ item.title }}</div>
                <div class="after-sales-description">{{ item.description }}</div>
                <div v-if="item.operator" class="after-sales-operator">处理人：{{ item.operator }}</div>
                <div v-if="item.amount" class="after-sales-amount">金额：¥{{ (item.amount || 0).toFixed(2) }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无售后记录" />
        </div>
      </el-collapse-transition>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Van, Location, Clock, Service, ArrowDown, ArrowUp, User } from '@element-plus/icons-vue'
import { formatDateTime } from '@/utils/dateFormat'
import { getAfterSalesType } from './helpers'

const props = defineProps<{
  logisticsInfo: any[]
  logisticsLoading: boolean
  orderTimeline: any[]
  afterSalesHistory: any[]
  orderProductType?: string
}>()

defineEmits<{
  'refresh-logistics': []
}>()

// 虚拟商品订单默认折叠物流卡片
const logisticsCollapsedLocal = ref(props.orderProductType === 'virtual')
const statusTimelineCollapsedLocal = ref(true)

// 操作类型标签样式
const getActionTagType = (actionType: string) => {
  const map: Record<string, string> = {
    'create': 'success',
    'edit': 'warning',
    'submit_audit': 'info',
    'audit_approve': 'success',
    'audit_reject': 'danger',
    'cancel_approve': 'danger',
    'cancel_reject': 'warning'
  }
  return map[actionType] || 'info'
}

const getActionTagLabel = (actionType: string) => {
  const map: Record<string, string> = {
    'create': '创建',
    'edit': '编辑',
    'submit_audit': '提审',
    'audit_approve': '审核通过',
    'audit_reject': '审核拒绝',
    'cancel_approve': '取消通过',
    'cancel_reject': '取消拒绝'
  }
  return map[actionType] || actionType
}
const afterSalesCollapsedLocal = ref(true)
</script>

<style scoped>
/* 布局 */
.row-layout { display: flex; gap: 20px; margin-bottom: 20px; align-items: stretch; }
.row-layout.full-width { display: block; }

/* 卡片头 */
.card-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-weight: 600; width: 100%; }
.card-header-left { display: flex; align-items: center; gap: 8px; }
.card-header-right { display: flex; align-items: center; gap: 8px; }

/* 物流轨迹 */
.logistics-trace-item { padding: 10px 14px; background: #f8f9fa; border-radius: 8px; border-left: 3px solid #dcdfe6; transition: all 0.3s ease; }
.logistics-trace-item:hover { background: #f0f2f5; }
.logistics-trace-first { background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%); border-left-color: #409eff; }
.logistics-trace-first .trace-description { color: #409eff; font-weight: 600; }
.trace-description { color: #303133; font-size: 14px; line-height: 1.6; word-break: break-word; }
.trace-location { margin-top: 6px; color: #909399; font-size: 12px; display: flex; align-items: center; gap: 4px; }
.trace-location .el-icon { font-size: 14px; }

/* 状态时间线 */
.status-timeline-card { margin-bottom: 20px; }
.timeline-content { padding: 8px 0; }
.timeline-title { font-weight: 600; color: #303133; margin-bottom: 4px; display: flex; align-items: center; }
.timeline-description { color: #606266; margin-bottom: 4px; }
.timeline-operator { color: #909399; font-size: 12px; display: flex; align-items: center; gap: 4px; }

/* 售后历史 */
.after-sales-content { padding: 8px 0; }
.after-sales-title { font-weight: 600; color: #303133; margin-bottom: 4px; }
.after-sales-description { color: #606266; margin-bottom: 4px; }
.after-sales-operator { color: #909399; font-size: 12px; margin-bottom: 4px; }
.after-sales-amount { color: #f56c6c; font-weight: 600; font-size: 14px; }
</style>
