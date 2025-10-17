<template>
  <el-dialog
    v-model="dialogVisible"
    title="打印面单"
    width="70%"
    :before-close="handleClose"
    class="print-label-dialog"
  >
    <div v-if="order" class="print-content">
      <!-- 打印设置 -->
      <div class="print-settings">
        <h3 class="section-title">
          <el-icon><Setting /></el-icon>
          打印设置
        </h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label>选择打印机：</label>
            <el-select v-model="selectedPrinter" placeholder="请选择打印机" class="printer-select">
              <el-option
                v-for="printer in printerList"
                :key="printer.id"
                :label="printer.name"
                :value="printer.id"
              />
            </el-select>
            <el-button type="primary" size="small" @click="connectPrinter" class="connect-btn">
              <el-icon><Link /></el-icon>
              连接打印机
            </el-button>
          </div>
          <div class="setting-item">
            <label>打印模板：</label>
            <el-select v-model="selectedTemplate" placeholder="请选择模板" class="template-select">
              <el-option
                v-for="template in templateList"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              />
            </el-select>
            <el-button type="success" size="small" @click="editTemplate" class="edit-btn">
              <el-icon><Edit /></el-icon>
              编辑模板
            </el-button>
          </div>
          <div class="setting-item">
            <label>打印份数：</label>
            <el-input-number v-model="printCopies" :min="1" :max="10" class="copies-input" />
          </div>
        </div>
      </div>

      <!-- 面单预览 -->
      <div class="label-preview">
        <h3 class="section-title">
          <el-icon><View /></el-icon>
          面单预览
        </h3>
        <div class="preview-container">
          <div class="label-template" :class="selectedTemplate">
            <!-- 标准模板 -->
            <div v-if="selectedTemplate === 'standard'" class="standard-template">
              <div class="label-header">
                <div class="company-info">
                  <h2>{{ companyInfo.name }}</h2>
                  <p>{{ companyInfo.address }}</p>
                  <p>客服电话：{{ maskPhone(companyInfo.phone) }}</p>
                </div>
                <div class="qr-code">
                  <div class="qr-placeholder">二维码</div>
                </div>
              </div>
              
              <div class="label-body">
                <div class="sender-info">
                  <h4>寄件人信息</h4>
                  <p><strong>姓名：</strong>{{ companyInfo.senderName }}</p>
                  <p><strong>电话：</strong>{{ maskPhone(companyInfo.senderPhone) }}</p>
                  <p><strong>地址：</strong>{{ companyInfo.senderAddress }}</p>
                </div>
                
                <div class="receiver-info">
                  <h4>收件人信息</h4>
                  <p><strong>姓名：</strong>{{ order.customerName }}</p>
                  <p><strong>电话：</strong>{{ maskPhone(order.phone) }}</p>
                  <p><strong>地址：</strong>{{ order.address }}</p>
                </div>
                
                <div class="order-info">
                  <h4>订单信息</h4>
                  <p><strong>订单号：</strong>{{ order.orderNo }}</p>
                  <p><strong>商品：</strong>{{ getProductsText() }}</p>
                  <p><strong>数量：</strong>{{ order.totalQuantity }}件</p>
                  <p><strong>代收款：</strong>¥{{ formatNumber(order.codAmount) }}</p>
                </div>
              </div>
              
              <div class="label-footer">
                <div class="tracking-info">
                  <p><strong>运单号：</strong>{{ trackingNumber || '待生成' }}</p>
                  <p><strong>物流公司：</strong>{{ selectedLogistics || '待选择' }}</p>
                </div>
                <div class="barcode">
                  <div class="barcode-placeholder">条形码</div>
                </div>
              </div>
            </div>

            <!-- 简约模板 -->
            <div v-else-if="selectedTemplate === 'simple'" class="simple-template">
              <div class="simple-header">
                <h3>{{ companyInfo.name }}</h3>
                <span class="order-no">{{ order.orderNo }}</span>
              </div>
              <div class="simple-body">
                <div class="address-section">
                  <div class="to-address">
                    <h4>收件人</h4>
                    <p class="name">{{ order.customerName }}</p>
                    <p class="phone">{{ maskPhone(order.phone) }}</p>
                    <p class="address">{{ order.address }}</p>
                  </div>
                </div>
                <div class="product-section">
                  <h4>商品信息</h4>
                  <p>{{ getProductsText() }}</p>
                  <p class="cod-amount" v-if="order.codAmount > 0">
                    代收款：¥{{ formatNumber(order.codAmount) }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 详细模板 -->
            <div v-else-if="selectedTemplate === 'detailed'" class="detailed-template">
              <div class="detailed-header">
                <div class="logo-section">
                  <div class="logo-placeholder">LOGO</div>
                  <div class="company-details">
                    <h2>{{ companyInfo.name }}</h2>
                    <p>{{ companyInfo.slogan }}</p>
                  </div>
                </div>
                <div class="order-summary">
                  <h3>订单：{{ order.orderNo }}</h3>
                  <p>下单时间：{{ order.createTime || '2024-01-15 10:30' }}</p>
                </div>
              </div>
              
              <div class="detailed-body">
                <table class="info-table">
                  <tbody>
                    <tr>
                      <td class="label-cell">收件人</td>
                      <td class="value-cell">{{ order.customerName }}</td>
                      <td class="label-cell">联系电话</td>
                      <td class="value-cell">{{ maskPhone(order.phone) }}</td>
                    </tr>
                    <tr>
                      <td class="label-cell">收货地址</td>
                      <td class="value-cell" colspan="3">{{ order.address }}</td>
                    </tr>
                    <tr>
                      <td class="label-cell">商品信息</td>
                      <td class="value-cell" colspan="3">{{ getProductsText() }}</td>
                    </tr>
                    <tr>
                      <td class="label-cell">订单金额</td>
                      <td class="value-cell">¥{{ formatNumber(order.totalAmount) }}</td>
                      <td class="label-cell">代收款</td>
                      <td class="value-cell cod-highlight">¥{{ formatNumber(order.codAmount) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div class="detailed-footer">
                <div class="logistics-info">
                  <p><strong>物流公司：</strong>{{ selectedLogistics || '待选择' }}</p>
                  <p><strong>运单号：</strong>{{ trackingNumber || '待生成' }}</p>
                </div>
                <div class="service-info">
                  <p>客服微信：{{ order.serviceWechat }}</p>
                  <p>客服电话：{{ maskPhone(companyInfo.phone) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="previewPrint">
          <el-icon><View /></el-icon>
          预览打印
        </el-button>
        <el-button type="primary" @click="confirmPrint" :disabled="!selectedPrinter">
          <el-icon><Printer /></el-icon>
          确认打印
        </el-button>
      </div>
    </template>

    <!-- 模板编辑弹窗 -->
    <el-dialog
      v-model="templateEditVisible"
      title="编辑打印模板"
      width="60%"
      append-to-body
    >
      <div class="template-editor">
        <p>模板编辑功能开发中...</p>
        <p>您可以在这里自定义面单的布局、字体、颜色等样式。</p>
      </div>
      <template #footer>
        <el-button @click="templateEditVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTemplate">保存模板</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Setting, Link, Edit, View, Printer
} from '@element-plus/icons-vue'
import { maskPhone } from '@/utils/phone'
import type { Order } from '@/stores/order'

interface Props {
  visible: boolean
  order: Order
}

interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 打印设置
const selectedPrinter = ref('')
const selectedTemplate = ref('standard')
const printCopies = ref(1)
const trackingNumber = ref('')
const selectedLogistics = ref('')

// 弹窗状态
const templateEditVisible = ref(false)

// 打印机列表
const printerList = ref([
  { id: 'printer1', name: 'HP LaserJet Pro M404n', status: 'online' },
  { id: 'printer2', name: 'Canon PIXMA G3010', status: 'offline' },
  { id: 'printer3', name: 'Epson L3150', status: 'online' }
])

// 模板列表
const templateList = ref([
  { id: 'standard', name: '标准模板', description: '包含完整信息的标准面单' },
  { id: 'simple', name: '简约模板', description: '简洁清晰的面单样式' },
  { id: 'detailed', name: '详细模板', description: '详细信息表格式面单' }
])

// 公司信息
const companyInfo = ref({
  name: '智慧销售CRM系统',
  address: '北京市朝阳区科技园区xxx号',
  phone: '400-123-4567',
  slogan: '专业、高效、贴心的服务',
  senderName: '客服中心',
  senderPhone: '010-12345678',
  senderAddress: '北京市朝阳区科技园区xxx号'
})

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 获取商品文本
const getProductsText = () => {
  if (!props.order?.products || !Array.isArray(props.order.products)) return ''
  return props.order.products.map(p => `${p.name} × ${p.quantity}`).join('，')
}

// 连接打印机
const connectPrinter = async () => {
  if (!selectedPrinter.value) {
    ElMessage.warning('请先选择打印机')
    return
  }
  
  try {
    // 模拟连接打印机
    ElMessage.loading('正在连接打印机...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('打印机连接成功')
  } catch (error) {
    ElMessage.error('打印机连接失败，请检查打印机状态')
  }
}

// 编辑模板
const editTemplate = () => {
  templateEditVisible.value = true
}

// 保存模板
const saveTemplate = () => {
  ElMessage.success('模板保存成功')
  templateEditVisible.value = false
}

// 预览打印
const previewPrint = () => {
  // 打开新窗口预览
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    const printContent = document.querySelector('.label-template')?.outerHTML
    printWindow.document.write(`
      <html>
        <head>
          <title>面单预览</title>
          <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .label-template { max-width: 800px; margin: 0 auto; }
            @media print {
              body { margin: 0; padding: 0; }
              .label-template { max-width: none; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `)
    printWindow.document.close()
  }
}

// 确认打印
const confirmPrint = async () => {
  if (!selectedPrinter.value) {
    ElMessage.warning('请先选择打印机')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认打印 ${printCopies.value} 份面单吗？`,
      '确认打印',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    // 模拟打印过程
    ElMessage.loading('正在打印...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    ElMessage.success(`成功打印 ${printCopies.value} 份面单`)
    handleClose()
  } catch {
    // 用户取消
  }
}

// 关闭弹窗
const handleClose = () => {
  dialogVisible.value = false
}

onMounted(() => {
  // 模拟生成运单号
  trackingNumber.value = 'SF' + Date.now().toString().slice(-8)
  selectedLogistics.value = '顺丰速运'
})
</script>

<style scoped>
.print-label-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.print-content {
  font-size: 14px;
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

/* 打印设置样式 */
.print-settings {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-item label {
  font-weight: 600;
  color: #606266;
  min-width: 100px;
}

.printer-select,
.template-select {
  width: 200px;
}

.copies-input {
  width: 120px;
}

.connect-btn,
.edit-btn {
  margin-left: 10px;
}

/* 面单预览样式 */
.label-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
}

.preview-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e4e7ed;
  min-height: 400px;
}

.label-template {
  border: 2px dashed #d3d3d3;
  padding: 20px;
  background: white;
  font-family: Arial, sans-serif;
}

/* 标准模板样式 */
.standard-template {
  max-width: 600px;
  margin: 0 auto;
}

.label-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.company-info h2 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 20px;
}

.company-info p {
  margin: 2px 0;
  color: #666;
  font-size: 12px;
}

.qr-code .qr-placeholder {
  width: 60px;
  height: 60px;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
}

.label-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.sender-info,
.receiver-info,
.order-info {
  border: 1px solid #ddd;
  padding: 15px;
  border-radius: 5px;
}

.order-info {
  grid-column: 1 / -1;
}

.label-body h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.label-body p {
  margin: 5px 0;
  font-size: 12px;
  color: #555;
}

.label-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 2px solid #333;
  padding-top: 15px;
}

.barcode-placeholder {
  width: 120px;
  height: 30px;
  border: 1px solid #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #999;
}

/* 简约模板样式 */
.simple-template {
  max-width: 500px;
  margin: 0 auto;
  border: 2px solid #333;
}

.simple-header {
  background: #333;
  color: white;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.simple-header h3 {
  margin: 0;
  font-size: 16px;
}

.simple-body {
  padding: 20px;
}

.address-section {
  margin-bottom: 20px;
}

.to-address h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
}

.to-address .name {
  font-size: 18px;
  font-weight: bold;
  margin: 5px 0;
}

.to-address .phone {
  font-size: 16px;
  color: #666;
  margin: 5px 0;
}

.to-address .address {
  font-size: 14px;
  color: #333;
  line-height: 1.4;
  margin: 10px 0;
}

.product-section h4 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 14px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.cod-amount {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
  margin-top: 10px;
}

/* 详细模板样式 */
.detailed-template {
  max-width: 700px;
  margin: 0 auto;
  border: 2px solid #333;
}

.detailed-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 15px;
}

.logo-placeholder {
  width: 50px;
  height: 50px;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}

.company-details h2 {
  margin: 0;
  font-size: 18px;
}

.company-details p {
  margin: 2px 0 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.order-summary h3 {
  margin: 0;
  font-size: 16px;
}

.order-summary p {
  margin: 5px 0 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.detailed-body {
  padding: 20px;
}

.info-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.info-table td {
  padding: 10px;
  border: 1px solid #ddd;
}

.label-cell {
  background: #f5f7fa;
  font-weight: bold;
  color: #333;
  width: 100px;
}

.value-cell {
  color: #555;
}

.cod-highlight {
  color: #f56c6c;
  font-weight: bold;
  font-size: 16px;
}

.detailed-footer {
  background: #f8f9fa;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid #ddd;
}

.logistics-info,
.service-info {
  font-size: 12px;
  color: #666;
}

.logistics-info p,
.service-info p {
  margin: 3px 0;
}

/* 模板编辑器样式 */
.template-editor {
  padding: 20px;
  text-align: center;
  color: #666;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>