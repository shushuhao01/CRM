<template>
  <el-dialog
    v-model="dialogVisible"
    title="批量发货"
    width="80%"
    :before-close="handleClose"
    class="batch-shipping-dialog"
  >
    <div class="batch-content">
      <!-- 选中订单列表 -->
      <div class="selected-orders">
        <h3 class="section-title">
          <el-icon><Box /></el-icon>
          选中订单 ({{ selectedOrders.length }}个)
        </h3>
        <div class="orders-summary">
          <div class="summary-cards">
            <div class="summary-card">
              <div class="card-title">订单总数</div>
              <div class="card-value">{{ selectedOrders.length }}</div>
            </div>
            <div class="summary-card">
              <div class="card-title">总金额</div>
              <div class="card-value">¥{{ formatNumber(totalAmount) }}</div>
            </div>
            <div class="summary-card">
              <div class="card-title">代收款总额</div>
              <div class="card-value cod-amount">¥{{ formatNumber(totalCodAmount) }}</div>
            </div>
          </div>
        </div>
        
        <div class="orders-table">
          <el-table :data="selectedOrders" style="width: 100%" max-height="300">
            <el-table-column prop="orderNo" label="订单号" width="120" />
            <el-table-column prop="customerName" label="客户姓名" width="100" />
            <el-table-column prop="phone" label="联系电话" width="120" />
            <el-table-column prop="address" label="收货地址" min-width="200" show-overflow-tooltip />
            <el-table-column prop="totalAmount" label="订单金额" width="100" align="right">
              <template #default="{ row }">
                ¥{{ formatNumber(row.totalAmount) }}
              </template>
            </el-table-column>
            <el-table-column prop="codAmount" label="代收款" width="100" align="right">
              <template #default="{ row }">
                <span class="cod-text">¥{{ formatNumber(row.codAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
              <template #default="{ row, $index }">
                <el-button
                  type="danger"
                  size="small"
                  @click="removeOrder($index)"
                  :icon="Delete"
                  circle
                />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 批量设置 -->
      <div class="batch-settings">
        <h3 class="section-title">
          <el-icon><Setting /></el-icon>
          批量设置
        </h3>
        
        <el-form :model="batchForm" :rules="rules" ref="formRef" label-width="120px">
          <div class="form-grid">
            <el-form-item label="物流公司" prop="logisticsCompany" required>
              <el-select
                v-model="batchForm.logisticsCompany"
                placeholder="请选择物流公司"
                class="full-width"
                filterable
                @change="onLogisticsChange"
              >
                <el-option
                  v-for="company in logisticsCompanies"
                  :key="company.code"
                  :label="company.name"
                  :value="company.code"
                >
                  <div class="company-option">
                    <span class="company-name">{{ company.name }}</span>
                    <span class="company-code">({{ company.code }})</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>

            <el-form-item label="发货方式" prop="shippingMethod">
              <el-select v-model="batchForm.shippingMethod" class="full-width">
                <el-option label="标准快递" value="standard" />
                <el-option label="加急快递" value="express" />
                <el-option label="经济快递" value="economy" />
              </el-select>
            </el-form-item>

            <el-form-item label="运单号生成" prop="trackingMode">
              <el-radio-group v-model="batchForm.trackingMode">
                <el-radio label="auto">自动生成</el-radio>
                <el-radio label="manual">手动输入</el-radio>
                <el-radio label="import">批量导入</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="预计送达" prop="estimatedDelivery">
              <el-date-picker
                v-model="batchForm.estimatedDelivery"
                type="date"
                placeholder="选择预计送达日期"
                class="full-width"
                :disabled-date="disabledDate"
              />
            </el-form-item>
          </div>

          <el-form-item label="批量备注" prop="remarks">
            <el-input
              v-model="batchForm.remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入批量发货备注（选填）"
              maxlength="200"
              show-word-limit
              class="full-width"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 运单号设置 -->
      <div v-if="batchForm.trackingMode === 'manual'" class="tracking-manual">
        <h3 class="section-title">
          <el-icon><Edit /></el-icon>
          手动输入运单号
        </h3>
        <div class="tracking-inputs">
          <div
            v-for="(order, index) in selectedOrders"
            :key="order.id"
            class="tracking-input-item"
          >
            <span class="order-label">{{ order.orderNo }}：</span>
            <el-input
              v-model="trackingNumbers[index]"
              placeholder="请输入运单号"
              class="tracking-input"
              clearable
            />
          </div>
        </div>
      </div>

      <div v-if="batchForm.trackingMode === 'import'" class="tracking-import">
        <h3 class="section-title">
          <el-icon><Upload /></el-icon>
          批量导入运单号
        </h3>
        <div class="import-area">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            accept=".xlsx,.xls,.csv"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 Excel 或 CSV 格式，第一列为订单号，第二列为运单号
              </div>
            </template>
          </el-upload>
          
          <div class="import-template">
            <el-button type="text" @click="downloadTemplate">
              <el-icon><Download /></el-icon>
              下载模板
            </el-button>
          </div>
        </div>
      </div>

      <!-- 发货预览 -->
      <div class="shipping-preview">
        <h3 class="section-title">
          <el-icon><View /></el-icon>
          发货预览
        </h3>
        <el-table :data="previewData" style="width: 100%" max-height="200">
          <el-table-column prop="orderNo" label="订单号" width="120" />
          <el-table-column prop="customerName" label="客户姓名" width="100" />
          <el-table-column label="物流公司" width="120">
            <template #default>
              {{ getLogisticsName() }}
            </template>
          </el-table-column>
          <el-table-column label="运单号" width="150">
            <template #default="{ $index }">
              <span v-if="batchForm.trackingMode === 'auto'" class="auto-tracking">
                自动生成
              </span>
              <span v-else-if="batchForm.trackingMode === 'manual'">
                {{ trackingNumbers[$index] || '待输入' }}
              </span>
              <span v-else>
                {{ importedTrackingNumbers[$index] || '待导入' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="预计送达" width="120">
            <template #default>
              {{ batchForm.estimatedDelivery || '待设置' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ $index }">
              <el-tag
                :type="getPreviewStatus($index).type"
                size="small"
              >
                {{ getPreviewStatus($index).text }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 发货确认 -->
      <div class="shipping-confirm">
        <el-alert
          title="批量发货确认"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>确认批量发货后，系统将：</p>
            <ul>
              <li>批量更新 {{ selectedOrders.length }} 个订单状态为"已发货"</li>
              <li>记录所有订单的物流信息和运单号</li>
              <li>批量发送发货通知给客户</li>
              <li>开始批量物流跟踪</li>
            </ul>
            <p class="warning-text">
              <el-icon><WarningFilled /></el-icon>
              批量发货操作无法撤销，请确认信息无误后再执行！
            </p>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="saveAsDraft">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button type="primary" @click="confirmBatchShipping" :loading="loading">
          <el-icon><Van /></el-icon>
          确认批量发货
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { 
  Box, Setting, Edit, Upload, View, Delete, UploadFilled,
  Download, Document, Van, WarningFilled
} from '@element-plus/icons-vue'
import type { Order } from '@/stores/order'

interface BatchShippingData {
  company: string
  trackingNumbers: string[]
  shipDate: string
  estimatedDate: string
  remarks: string
}

interface Props {
  visible: boolean
  selectedOrders: Order[]
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'batch-shipped', data: BatchShippingData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formRef = ref<FormInstance>()
const loading = ref(false)

// 批量表单
const batchForm = reactive({
  logisticsCompany: '',
  shippingMethod: 'standard',
  trackingMode: 'auto',
  estimatedDelivery: '',
  remarks: ''
})

// 运单号数组
const trackingNumbers = ref<string[]>([])
const importedTrackingNumbers = ref<string[]>([])

// 表单验证规则
const rules = {
  logisticsCompany: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ]
}

// 物流公司列表
const logisticsCompanies = ref([
  { code: 'SF', name: '顺丰速运', prefix: 'SF' },
  { code: 'YTO', name: '圆通速递', prefix: 'YT' },
  { code: 'ZTO', name: '中通快递', prefix: 'ZTO' },
  { code: 'STO', name: '申通快递', prefix: 'STO' },
  { code: 'YD', name: '韵达速递', prefix: 'YD' },
  { code: 'HTKY', name: '百世快递', prefix: 'HT' },
  { code: 'JD', name: '京东物流', prefix: 'JD' },
  { code: 'EMS', name: '中国邮政', prefix: 'EMS' }
])

// 计算属性
const totalAmount = computed(() => {
  if (!Array.isArray(props.selectedOrders)) return 0
  return props.selectedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
})

const totalCodAmount = computed(() => {
  if (!Array.isArray(props.selectedOrders)) return 0
  return props.selectedOrders.reduce((sum, order) => sum + (order.codAmount || 0), 0)
})

const previewData = computed(() => {
  return Array.isArray(props.selectedOrders) ? props.selectedOrders : []
})

// 监听选中订单变化，初始化运单号数组
watch(() => props.selectedOrders, (newOrders) => {
  if (Array.isArray(newOrders)) {
    trackingNumbers.value = new Array(newOrders.length).fill('')
    importedTrackingNumbers.value = new Array(newOrders.length).fill('')
  } else {
    trackingNumbers.value = []
    importedTrackingNumbers.value = []
  }
}, { immediate: true })

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 移除订单
const removeOrder = (index: number) => {
  // 这里应该通知父组件移除订单
  ElMessage.info('请在订单列表中取消选择该订单')
}

// 物流公司变化
const onLogisticsChange = (value: string) => {
  // 根据物流公司设置预计送达时间
  const today = new Date()
  const deliveryDays = getDeliveryDays(value)
  const estimatedDate = new Date(today.getTime() + deliveryDays * 24 * 60 * 60 * 1000)
  batchForm.estimatedDelivery = estimatedDate.toISOString().split('T')[0]
}

// 获取预计送达天数
const getDeliveryDays = (companyCode: string) => {
  const deliveryMap = {
    'SF': 1, 'JD': 1, 'YTO': 2, 'ZTO': 2, 'STO': 2, 'YD': 2, 'HTKY': 3, 'EMS': 3
  }
  return deliveryMap[companyCode] || 3
}

// 获取物流公司名称
const getLogisticsName = () => {
  const company = logisticsCompanies.value.find(c => c.code === batchForm.logisticsCompany)
  return company?.name || '待选择'
}

// 获取预览状态
const getPreviewStatus = (index: number) => {
  if (!batchForm.logisticsCompany) {
    return { type: 'danger', text: '未设置' }
  }
  
  if (batchForm.trackingMode === 'auto') {
    return { type: 'success', text: '就绪' }
  } else if (batchForm.trackingMode === 'manual') {
    return trackingNumbers.value[index] 
      ? { type: 'success', text: '就绪' }
      : { type: 'warning', text: '待输入' }
  } else {
    return importedTrackingNumbers.value[index]
      ? { type: 'success', text: '就绪' }
      : { type: 'warning', text: '待导入' }
  }
}

// 禁用日期
const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// 处理文件变化
const handleFileChange = (file: File) => {
  // 这里应该解析Excel/CSV文件
  ElMessage.info('文件解析功能开发中...')
}

// 下载模板
const downloadTemplate = () => {
  // 创建模板数据
  const templateData = props.selectedOrders.map(order => ({
    '订单号': order.orderNo,
    '运单号': ''
  }))
  
  // 这里应该生成并下载Excel文件
  ElMessage.success('模板下载功能开发中...')
}

// 保存草稿
const saveAsDraft = async () => {
  try {
    ElMessage.loading('正在保存草稿...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (error) {
    ElMessage.error('草稿保存失败')
  }
}

// 确认批量发货
const confirmBatchShipping = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    // 验证运单号
    if (batchForm.trackingMode === 'manual') {
      const emptyTrackingCount = trackingNumbers.value.filter(num => !num.trim()).length
      if (emptyTrackingCount > 0) {
        ElMessage.error(`还有 ${emptyTrackingCount} 个订单的运单号未填写`)
        return
      }
    }
    
    await ElMessageBox.confirm(
      `确认批量发货 ${props.selectedOrders.length} 个订单吗？发货后将无法撤销。`,
      '确认批量发货',
      {
        confirmButtonText: '确认发货',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true
    
    // 生成发货数据
    const shippingData = props.selectedOrders.map((order, index) => {
      let trackingNumber = ''
      
      if (batchForm.trackingMode === 'auto') {
        // 自动生成运单号
        const company = logisticsCompanies.value.find(c => c.code === batchForm.logisticsCompany)
        const timestamp = Date.now().toString()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        trackingNumber = `${company?.prefix}${timestamp.slice(-8)}${random}${index}`
      } else if (batchForm.trackingMode === 'manual') {
        trackingNumber = trackingNumbers.value[index]
      } else {
        trackingNumber = importedTrackingNumbers.value[index]
      }
      
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        logisticsCompany: batchForm.logisticsCompany,
        trackingNumber,
        estimatedDelivery: batchForm.estimatedDelivery,
        remarks: batchForm.remarks,
        shippingMethod: batchForm.shippingMethod,
        shippingTime: new Date().toISOString(),
        status: 'shipped'
      }
    })
    
    // 模拟批量发货处理
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    emit('batch-shipped', shippingData)
    ElMessage.success(`成功批量发货 ${props.selectedOrders.length} 个订单！`)
    handleClose()
    
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量发货失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  // 重置表单
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(batchForm, {
    logisticsCompany: '',
    shippingMethod: 'standard',
    trackingMode: 'auto',
    estimatedDelivery: '',
    remarks: ''
  })
  
  trackingNumbers.value = []
  importedTrackingNumbers.value = []
  
  dialogVisible.value = false
}
</script>

<style scoped>
/* 对话框样式 */
:deep(.batch-shipping-dialog) {
  .el-dialog {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;
  }
  
  .el-dialog__header {
    background: #ffffff;
    color: #374151;
    padding: 24px 24px 20px 24px;
    margin: 0;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .el-dialog__title {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }
  
  .el-dialog__headerbtn {
    top: 24px;
    right: 24px;
    
    .el-dialog__close {
      color: #6b7280;
      font-size: 18px;
      transition: color 0.2s ease;
      
      &:hover {
        color: #374151;
      }
    }
  }
  
  .el-dialog__body {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
    background: #fafafa;
  }
}

.batch-content {
  font-size: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

/* 选中订单样式 */
.selected-orders {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.orders-summary {
  margin-bottom: 20px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.summary-card {
  background: #f8fafc;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
}

.card-title {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
  font-weight: 500;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
}

.cod-amount {
  color: #dc2626;
}

.cod-text {
  color: #dc2626;
  font-weight: 600;
}

/* 批量设置样式 */
.batch-settings {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.full-width {
  width: 100%;
}

.company-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.company-name {
  font-weight: 600;
}

.company-code {
  color: #909399;
  font-size: 12px;
}

/* 运单号设置样式 */
.tracking-manual,
.tracking-import {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tracking-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.tracking-input-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.order-label {
  font-weight: 500;
  color: #374151;
  min-width: 120px;
  font-size: 14px;
}

.tracking-input {
  flex: 1;
}

.import-area {
  text-align: center;
}

.import-template {
  margin-top: 16px;
}

/* 发货预览样式 */
.shipping-preview {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.auto-tracking {
  color: #67c23a;
  font-style: italic;
}

/* 发货确认样式 */
.shipping-confirm {
  margin-bottom: 24px;
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.shipping-confirm ul {
  margin: 12px 0 0 20px;
  padding: 0;
}

.shipping-confirm li {
  margin: 8px 0;
  color: #4b5563;
  font-size: 14px;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: #f59e0b;
  font-weight: 600;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #ffffff;
  border-top: 1px solid #f3f4f6;
  margin: 0 -24px -24px -24px;
  border-radius: 0 0 12px 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .tracking-inputs {
    grid-template-columns: 1fr;
  }
}
</style>