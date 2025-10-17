<template>
  <el-dialog
    v-model="dialogVisible"
    title="订单详情"
    width="70%"
    :before-close="handleClose"
    class="order-detail-dialog"
    top="5vh"
  >
    <div v-if="order" class="order-detail-content">
      <!-- 基本信息和客户信息合并 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><Document /></el-icon>
          订单基本信息
        </h3>
        <div class="info-grid compact">
          <div class="info-item">
            <label>订单号：</label>
            <span class="value">{{ order.orderNo }}</span>
          </div>
          <div class="info-item">
            <label>订单状态：</label>
            <el-tag :type="getStatusType(order.status)" size="small">
              {{ getStatusText(order.status) }}
            </el-tag>
          </div>
          <div class="info-item">
            <label>客户姓名：</label>
            <span class="value">{{ order.customerName }}</span>
          </div>
          <div class="info-item">
            <label>联系电话：</label>
            <span class="value">{{ maskPhone(order.phone) }}</span>
          </div>
          <div class="info-item">
            <label>下单时间：</label>
            <span class="value">{{ order.createTime || '2024-01-15 10:30:00' }}</span>
          </div>
          <div class="info-item">
            <label>客服微信：</label>
            <span class="value">{{ order.serviceWechat }}</span>
          </div>
          <div class="info-item full-width">
            <label>收货地址：</label>
            <span class="value">{{ order.address }}</span>
          </div>
        </div>
      </div>

      <!-- 客户详细信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><User /></el-icon>
          客户详情
        </h3>
        <div class="info-grid compact">
          <div class="info-item">
            <label>年龄：</label>
            <span class="value">{{ order.customerAge }}岁</span>
          </div>
          <div class="info-item">
            <label>身高：</label>
            <span class="value">{{ order.customerHeight }}cm</span>
          </div>
          <div class="info-item">
            <label>体重：</label>
            <span class="value">{{ order.customerWeight }}kg</span>
          </div>
          <div class="info-item">
            <label>疾病史：</label>
            <span class="value">{{ order.medicalHistory || '无' }}</span>
          </div>
        </div>
      </div>

      <!-- 商品信息 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><Box /></el-icon>
          商品信息
        </h3>
        <el-table :data="Array.isArray(order.products) ? order.products : []" border class="product-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="name" label="商品名称" />
          <el-table-column prop="specification" label="规格" width="120" />
          <el-table-column prop="quantity" label="数量" width="80" align="center" />
          <el-table-column prop="price" label="单价" width="100" align="center">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber(row.price || 0) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="subtotal" label="小计" width="120" align="center">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber((row.price || 0) * row.quantity) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 金额信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><Money /></el-icon>
          金额信息
        </h3>
        <div class="amount-summary compact">
          <div class="amount-row">
            <div class="amount-item">
              <label>订单总额：</label>
              <span class="value total">¥{{ formatNumber(order.totalAmount) }}</span>
            </div>
            <div class="amount-item">
              <label>已付定金：</label>
              <span class="value paid">¥{{ formatNumber(order.deposit) }}</span>
            </div>
            <div class="amount-item">
              <label>代收款：</label>
              <span class="value cod">¥{{ formatNumber(order.codAmount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单备注 -->
      <div class="detail-section" v-if="order.remark">
        <h3 class="section-title">
          <el-icon><ChatDotRound /></el-icon>
          订单备注
        </h3>
        <div class="remark-content">
          <p v-html="highlightKeywords(order.remark)"></p>
        </div>
      </div>

      <!-- 审核历史 -->
      <div class="detail-section compact-section" v-if="order.auditHistory">
        <h3 class="section-title small">
          <el-icon><List /></el-icon>
          审核历史
        </h3>
        <div class="audit-timeline compact">
          <div
            v-for="(audit, index) in order.auditHistory"
            :key="index"
            class="audit-item compact"
          >
            <div class="audit-header">
              <el-tag 
                size="small"
                :type="audit.result === 'approved' ? 'success' : 'danger'"
              >
                {{ audit.result === 'approved' ? '已通过' : '已拒绝' }}
              </el-tag>
              <span class="audit-meta">{{ audit.auditor }} · {{ audit.time }}</span>
            </div>
            <div v-if="audit.remark" class="audit-comment">{{ audit.remark }}</div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button 
          v-if="showActionButtons"
          type="warning" 
          @click="handleSetTodo"
        >
          <el-icon><Timer /></el-icon>
          设置待办
        </el-button>
        <el-button 
          v-if="showActionButtons"
          type="success" 
          @click="handleUpdateStatus"
        >
          <el-icon><Edit /></el-icon>
          更新状态
        </el-button>
        <el-button type="primary" @click="printOrder">
          <el-icon><Printer /></el-icon>
          打印订单
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Document, User, Box, Money, ChatDotRound, List, Printer, Timer, Edit
} from '@element-plus/icons-vue'
import { maskPhone } from '@/utils/phone'
import type { Order } from '@/stores/order'

interface Props {
  visible: boolean
  order: Order
  showActionButtons?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'update-status', order: Order): void
  (e: 'set-todo', order: Order): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 获取状态类型
const getStatusType = (status: string) => {
  const statusMap = {
    'urgent': 'danger',
    'normal': 'success',
    'cod': 'warning'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    'urgent': '紧急',
    'normal': '正常',
    'cod': '代收款'
  }
  return statusMap[status] || '未知'
}

// 高亮关键词
const highlightKeywords = (text: string) => {
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = text
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    result = result.replace(regex, `<span class="highlight-keyword">${keyword}</span>`)
  })
  return result
}

// 关闭弹窗
const handleClose = () => {
  dialogVisible.value = false
}

// 打印订单
const printOrder = () => {
  ElMessage.success('打印功能开发中...')
}

// 更新状态
const handleUpdateStatus = () => {
  emit('update-status', props.order)
}

// 设置待办
const handleSetTodo = () => {
  emit('set-todo', props.order)
}
</script>

<style scoped>
.order-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.order-detail-content {
  font-size: 14px;
}

.detail-section {
  margin-bottom: 30px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.info-grid.compact {
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.compact-section {
  margin-bottom: 16px;
}

.section-title.small {
  font-size: 14px;
  margin-bottom: 12px;
}

.amount-summary.compact {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-weight: 600;
  color: #606266;
  min-width: 100px;
  margin-right: 10px;
}

.info-item .value {
  color: #303133;
  flex: 1;
}

.product-table {
  margin-top: 10px;
}

.amount {
  font-weight: 600;
  color: #409eff;
}

.amount-summary {
  background: white;
  border-radius: 6px;
  padding: 20px;
  border: 1px solid #e4e7ed;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}

.amount-item:last-child {
  border-bottom: none;
}

.amount-item.total {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  border-top: 2px solid #e4e7ed;
  margin-top: 10px;
  padding-top: 15px;
}

.amount-item.cod {
  color: #f56c6c;
  font-weight: 600;
}

.amount-item .value.discount {
  color: #67c23a;
}

.amount-item .value.paid {
  color: #409eff;
}

.remark-content {
  background: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 2px 4px;
  border-radius: 3px;
}

.audit-timeline {
  margin-top: 10px;
}

.audit-timeline.compact {
  margin-top: 12px;
}

.audit-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.audit-item.compact {
  padding: 10px;
  margin-bottom: 6px;
  border-left: 3px solid #e4e7ed;
}

.audit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.audit-meta {
  font-size: 12px;
  color: #909399;
}

.audit-comment {
  font-size: 13px;
  color: #606266;
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid #e4e7ed;
}

.audit-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>