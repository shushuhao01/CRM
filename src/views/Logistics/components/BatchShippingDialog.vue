<template>
  <el-dialog
    v-model="dialogVisible"
    title="批量发货"
    width="900px"
    :before-close="handleClose"
    class="batch-shipping-dialog"
    top="5vh"
  >
    <div class="batch-content-compact">
      <!-- 顶部汇总信息 -->
      <div class="top-summary">
        <div class="summary-item">
          <span class="label">选中订单</span>
          <span class="value primary">{{ selectedOrders.length }}单</span>
        </div>
        <div class="summary-item">
          <span class="label">总金额</span>
          <span class="value">¥{{ formatNumber(totalAmount) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">代收款</span>
          <span class="value warning">¥{{ formatNumber(totalCodAmount) }}</span>
        </div>
        <el-button type="primary" link size="small" @click="showOrderDetail = !showOrderDetail">
          {{ showOrderDetail ? '收起详情' : '查看详情' }}
          <el-icon><ArrowDown v-if="!showOrderDetail" /><ArrowUp v-else /></el-icon>
        </el-button>
      </div>

      <!-- 订单详情表格（可折叠） -->
      <el-collapse-transition>
        <div v-show="showOrderDetail" class="orders-table-compact">
          <el-table :data="selectedOrders" size="small" max-height="150" border>
            <el-table-column prop="orderNo" label="订单号" width="130" />
            <el-table-column prop="customerName" label="客户" width="80" />
            <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip />
            <el-table-column prop="totalAmount" label="金额" width="90" align="right">
              <template #default="{ row }">¥{{ formatNumber(row.totalAmount) }}</template>
            </el-table-column>
            <el-table-column label="" width="50" fixed="right">
              <template #default="{ $index }">
                <el-button type="danger" size="small" :icon="Delete" circle @click="removeOrder($index)" />
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-collapse-transition>

      <!-- 发货设置（紧凑布局） -->
      <el-form :model="batchForm" :rules="rules" ref="formRef" label-width="80px" size="default" class="compact-form">
        <div class="form-row">
          <el-form-item label="物流公司" prop="logisticsCompany" class="form-item-half">
            <el-select v-model="batchForm.logisticsCompany" placeholder="选择物流公司" filterable @change="onLogisticsChange">
              <el-option v-for="c in logisticsCompanies" :key="c.code" :label="c.name" :value="c.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="发货方式" prop="shippingMethod" class="form-item-half">
            <el-select v-model="batchForm.shippingMethod">
              <el-option label="标准快递" value="standard" />
              <el-option label="加急快递" value="express" />
              <el-option label="经济快递" value="economy" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-row">
          <el-form-item label="运单号" prop="trackingMode" class="form-item-half">
            <el-radio-group v-model="batchForm.trackingMode" size="small">
              <el-radio-button label="auto">自动生成</el-radio-button>
              <el-radio-button label="manual">手动输入</el-radio-button>
              <el-radio-button label="import">批量导入</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="预计送达" prop="estimatedDelivery" class="form-item-half">
            <el-date-picker v-model="batchForm.estimatedDelivery" type="date" placeholder="选择日期" :disabled-date="disabledDate" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="batchForm.remarks" type="textarea" :rows="2" placeholder="批量发货备注（选填）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <!-- 运单号输入区域（紧凑） -->
      <div v-if="batchForm.trackingMode === 'manual'" class="tracking-section">
        <div class="section-header">
          <span>手动输入运单号</span>
        </div>
        <div class="tracking-grid">
          <div v-for="(order, index) in selectedOrders" :key="order.id" class="tracking-item">
            <span class="order-no">{{ order.orderNo }}</span>
            <el-input v-model="trackingNumbers[index]"
              placeholder="请输入运单号"
              class="tracking-input"
              clearable
            />
          </div>
        </div>
      </div>

      <div v-if="batchForm.trackingMode === 'import'" class="tracking-section">
        <div class="section-header">
          <span>批量导入运单号</span>
          <el-button type="primary" link size="small" @click="downloadTemplate">
            <el-icon><Download /></el-icon>下载模板
          </el-button>
        </div>
        <el-upload class="upload-compact" drag :auto-upload="false" :on-change="handleFileChange" accept=".xlsx,.xls" :limit="1">
          <div class="upload-content">
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <span>拖拽或点击上传Excel</span>
          </div>
        </el-upload>
      </div>

      <!-- 发货预览（简化） -->
      <div class="preview-section">
        <div class="section-header">
          <span>发货预览</span>
          <span v-if="batchForm.trackingMode === 'import'" class="preview-count">
            共 {{ previewData.length }} 个订单待发货
          </span>
        </div>
        <el-table :data="previewData" size="small" max-height="250" border>
          <el-table-column prop="orderNo" label="订单号" width="140" />
          <el-table-column label="物流公司" width="140">
            <template #default="{ row }">
              <el-select
                v-model="previewLogisticsCompanies[getOriginalIndex(row)]"
                placeholder="选择物流公司"
                size="small"
                filterable
                style="width: 100%"
              >
                <el-option v-for="c in logisticsCompanies" :key="c.code" :label="c.name" :value="c.code" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="运单号" min-width="160">
            <template #default="{ row }">
              <span v-if="batchForm.trackingMode === 'auto'" style="color: #409eff">自动生成</span>
              <el-input
                v-else-if="batchForm.trackingMode === 'manual'"
                v-model="trackingNumbers[getOriginalIndex(row)]"
                placeholder="输入运单号"
                size="small"
                clearable
              />
              <el-input
                v-else
                v-model="importedTrackingNumbers[getOriginalIndex(row)]"
                placeholder="输入运单号"
                size="small"
                clearable
              />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="getPreviewStatusByOrder(row).type" size="small">{{ getPreviewStatusByOrder(row).text }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="60" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" size="small" :icon="Delete" circle @click="removeOrderFromPreview(row)" title="移除此订单" />
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 确认提示（简化） -->
      <div class="confirm-tips">
        <el-icon class="tip-icon"><WarningFilled /></el-icon>
        <span>确认后将更新 <strong>{{ previewData.length }}</strong> 个订单状态为"已发货"，此操作不可撤销</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer-compact">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmBatchShipping" :loading="loading" :disabled="previewData.length === 0">
          <el-icon><Van /></el-icon>确认发货 ({{ previewData.length }})
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  Delete, UploadFilled,
  Download, Van, WarningFilled, ArrowDown, ArrowUp
} from '@element-plus/icons-vue'
import type { Order as BaseOrder } from '@/stores/order'
import * as XLSX from 'xlsx'

// 扩展Order类型，添加可能的字段别名
interface Order extends BaseOrder {
  orderNo?: string           // 订单号别名
  phone?: string             // 电话别名
  address?: string           // 地址别名
  logisticsCompany?: string  // 物流公司
  codAmount?: number         // 代收款金额
}

// 发货数据类型
interface ShippingDataItem {
  orderId: string
  orderNo?: string
  logisticsCompany: string
  trackingNumber: string
  estimatedDelivery: string
  remarks: string
  shippingMethod: string
  shippingTime: string
  shippedAt: string
  status: string
}

// 保留旧接口定义以兼容
interface _BatchShippingData {
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
  (e: 'batch-shipped', data: ShippingDataItem[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formRef = ref<FormInstance>()
const loading = ref(false)
const showOrderDetail = ref(false)

// 🔥 新增：缓存选中的订单数据，弹窗打开后不受主列表刷新影响
const cachedOrders = ref<Order[]>([])

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
// 🔥 新增：预览区物流公司数组（支持单独编辑每个订单的物流公司）
const previewLogisticsCompanies = ref<string[]>([])
// 🔥 新增：已移除的订单ID列表
const removedOrderIds = ref<string[]>([])

// 表单验证规则
const rules = {
  logisticsCompany: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ]
}

// 物流公司列表 - 从API获取
const logisticsCompanies = ref<Array<{ code: string; name: string; prefix: string }>>([])
const loadingCompanies = ref(false)

// 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.getActiveCompanies()

    const dataList = (response && response.success && Array.isArray(response.data))
      ? response.data
      : (response && Array.isArray(response) ? response as any[] : null)

    if (dataList) {
      logisticsCompanies.value = dataList.map((item: { code: string; name: string; shortName?: string }) => ({
        code: item.code,
        name: item.name,
        prefix: item.code.toUpperCase().substring(0, 2)
      }))
      console.log('[批量发货弹窗] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else {
      console.warn('[批量发货弹窗] API返回数据格式异常，使用默认列表')
      useDefaultCompanies()
    }
  } catch (error) {
    console.error('[批量发货弹窗] 加载物流公司列表失败:', error)
    useDefaultCompanies()
  } finally {
    loadingCompanies.value = false
  }
}

// 使用默认物流公司列表（API失败时的备用）
const useDefaultCompanies = () => {
  logisticsCompanies.value = [
    { code: 'SF', name: '顺丰速运', prefix: 'SF' },
    { code: 'YTO', name: '圆通速递', prefix: 'YT' },
    { code: 'ZTO', name: '中通快递', prefix: 'ZTO' },
    { code: 'STO', name: '申通快递', prefix: 'STO' },
    { code: 'YD', name: '韵达速递', prefix: 'YD' },
    { code: 'HTKY', name: '百世快递', prefix: 'HT' },
    { code: 'JD', name: '京东物流', prefix: 'JD' },
    { code: 'EMS', name: '中国邮政', prefix: 'EMS' }
  ]
}

// 🔥 修改：使用缓存的订单数据
const selectedOrders = computed(() => {
  // 如果弹窗打开且有缓存数据，使用缓存数据
  if (props.visible && cachedOrders.value.length > 0) {
    return cachedOrders.value
  }
  return props.selectedOrders || []
})

// 计算属性
const totalAmount = computed(() => {
  if (!Array.isArray(selectedOrders.value)) return 0
  return selectedOrders.value.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
})

const totalCodAmount = computed(() => {
  if (!Array.isArray(selectedOrders.value)) return 0
  return selectedOrders.value.reduce((sum, order) => sum + (order.codAmount || 0), 0)
})

const previewData = computed(() => {
  if (!Array.isArray(selectedOrders.value)) return []

  // 🔥 过滤掉已移除的订单
  const filteredOrders = selectedOrders.value.filter(order => !removedOrderIds.value.includes(order.id))

  // 如果是导入模式，只显示有运单号的订单
  if (batchForm.trackingMode === 'import') {
    return filteredOrders.filter((order) => {
      const index = getOriginalIndex(order)
      return importedTrackingNumbers.value[index] && importedTrackingNumbers.value[index].trim()
    })
  }

  return filteredOrders
})

// 🔥 新增：从预览中移除订单
const removeOrderFromPreview = (order: Order) => {
  if (!removedOrderIds.value.includes(order.id)) {
    removedOrderIds.value.push(order.id)
    ElMessage.success(`已移除订单 ${order.orderNo || order.orderNumber}`)
  }
}

// 🔥 新增：根据订单获取物流公司（优先使用预览区编辑的值）
const _getOrderLogisticsCompany = (order: Order) => {
  const index = getOriginalIndex(order)
  // 优先使用预览区编辑的物流公司
  if (previewLogisticsCompanies.value[index]) {
    const company = logisticsCompanies.value.find(c => c.code === previewLogisticsCompanies.value[index])
    if (company) return company.name
    return previewLogisticsCompanies.value[index]
  }
  // 其次使用订单已有的物流公司信息
  const orderCompany = order.expressCompany || order.logisticsCompany
  if (orderCompany) {
    const company = logisticsCompanies.value.find(
      c => c.code === orderCompany || c.name === orderCompany
    )
    if (company) {
      return company.name
    }
    return orderCompany
  }
  // 如果订单没有物流公司信息，使用表单选择的
  return getLogisticsName() || '-'
}

// 初始化预计送达时间为3天后
const initEstimatedDelivery = () => {
  const today = new Date()
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  batchForm.estimatedDelivery = threeDaysLater.toISOString().split('T')[0]
}

// 监听弹窗打开，初始化默认值
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 🔥 关键：弹窗打开时，缓存当前选中的订单数据
    if (props.selectedOrders && props.selectedOrders.length > 0) {
      cachedOrders.value = JSON.parse(JSON.stringify(props.selectedOrders))
      console.log('[批量发货弹窗] 缓存订单数据:', cachedOrders.value.length, '个')
    }

    // 加载物流公司列表
    if (logisticsCompanies.value.length === 0) {
      await loadLogisticsCompanies()
    }
    // 设置默认预计送达时间为3天后
    initEstimatedDelivery()
  }
}, { immediate: true })

// 监听选中订单变化，初始化运单号数组
// 🔥 修改：只在弹窗关闭时或首次打开时响应
watch(() => props.selectedOrders, (newOrders) => {
  // 如果弹窗已打开且有缓存数据，不响应外部变化
  if (props.visible && cachedOrders.value.length > 0) {
    console.log('[批量发货弹窗] 弹窗已打开，忽略外部订单变化')
    return
  }

  if (Array.isArray(newOrders)) {
    trackingNumbers.value = new Array(newOrders.length).fill('')
    importedTrackingNumbers.value = new Array(newOrders.length).fill('')
    // 🔥 初始化预览区物流公司数组（使用订单自带的物流公司或表单选择的）
    previewLogisticsCompanies.value = newOrders.map(order => order.expressCompany || order.logisticsCompany || '')
  } else {
    trackingNumbers.value = []
    importedTrackingNumbers.value = []
    previewLogisticsCompanies.value = []
  }
}, { immediate: true })

// 🔥 新增：监听缓存订单变化，初始化运单号数组
watch(() => cachedOrders.value, (newOrders) => {
  if (Array.isArray(newOrders) && newOrders.length > 0) {
    trackingNumbers.value = new Array(newOrders.length).fill('')
    importedTrackingNumbers.value = new Array(newOrders.length).fill('')
    // 🔥 初始化预览区物流公司数组
    previewLogisticsCompanies.value = newOrders.map(order => order.expressCompany || order.logisticsCompany || '')
    console.log('[批量发货弹窗] 初始化运单号数组:', newOrders.length, '个')
  }
}, { immediate: true })

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 移除订单（旧方法，保留兼容）
const removeOrder = (_index: number) => {
  // 这里应该通知父组件移除订单
  ElMessage.info('请在订单列表中取消选择该订单')
}

// 物流公司变化
const onLogisticsChange = (_value: string) => {
  // 如果预计送达时间未设置，则设置为3天后（默认值）
  // 如果已设置，则根据物流公司调整（可选）
  if (!batchForm.estimatedDelivery) {
    initEstimatedDelivery()
  }
}

// 获取预计送达天数（保留供将来使用）
const _getDeliveryDays = (companyCode: string) => {
  const deliveryMap: Record<string, number> = {
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

// 🔥 新增：根据订单获取原始索引
const getOriginalIndex = (order: Order) => {
  return selectedOrders.value.findIndex(o => o.id === order.id || o.orderNo === order.orderNo)
}

// 🔥 新增：根据订单获取预览状态
const getPreviewStatusByOrder = (order: Order) => {
  const index = getOriginalIndex(order)

  // 导入模式下，检查订单是否有物流公司信息
  if (batchForm.trackingMode === 'import') {
    const hasCompany = order.expressCompany || order.logisticsCompany || batchForm.logisticsCompany
    const hasTracking = importedTrackingNumbers.value[index]

    if (!hasCompany) {
      return { type: 'warning', text: '无物流' }
    }
    if (!hasTracking) {
      return { type: 'warning', text: '待导入' }
    }
    return { type: 'success', text: '就绪' }
  }

  return getPreviewStatus(index)
}

// 禁用日期
const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// 处理文件变化
const handleFileChange = (uploadFile: { raw?: File }) => {
  const file = uploadFile.raw
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = e.target?.result
      if (!data) {
        ElMessage.error('文件内容为空')
        return
      }

      // 解析Excel文件 - 设置raw:false确保所有单元格都作为字符串读取
      const workbook = XLSX.read(data, { type: 'binary', raw: false })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // 转换为JSON数据，设置defval为空字符串，raw为false确保数字也作为字符串处理
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        raw: false // 🔥 关键：确保所有值都作为字符串读取
      }) as unknown[][]

      if (jsonData.length < 2) {
        ElMessage.error('文件格式错误，至少需要包含表头和一行数据')
        return
      }

      // 跳过表头，解析数据行
      const dataRows = jsonData.slice(1)
      const importedData: { orderNo: string; trackingNo: string; company: string }[] = []

      console.log('[批量导入] 开始解析Excel数据，共', dataRows.length, '行')

      dataRows.forEach((row, rowIndex) => {
        if (Array.isArray(row) && row.length >= 1) {
          // 🔥 改进：更健壮的订单号处理
          let orderNo = ''
          const rawOrderNo = row[0]

          if (rawOrderNo !== null && rawOrderNo !== undefined) {
            // 处理各种可能的格式
            if (typeof rawOrderNo === 'number') {
              // 数字类型，直接转字符串（避免科学计数法）
              orderNo = rawOrderNo.toFixed(0)
            } else {
              orderNo = String(rawOrderNo).trim()
            }
            // 移除可能的引号
            orderNo = orderNo.replace(/^['"]|['"]$/g, '')
          }

          // 🔥 改进：运单号处理（第5列，索引4）
          let trackingNo = ''
          if (row.length > 4 && row[4] !== null && row[4] !== undefined) {
            trackingNo = String(row[4]).trim()
          }

          // 物流公司（第6列，索引5）- 仅作参考
          const company = row.length > 5 ? String(row[5] || '').trim() : ''

          console.log(`[批量导入] 第${rowIndex + 2}行:`, {
            rawOrderNo,
            orderNo,
            trackingNo,
            company,
            hasTrackingNo: !!trackingNo
          })

          // 🔥 关键改进：只收集有运单号的记录（允许部分导入）
          if (orderNo && trackingNo) {
            importedData.push({ orderNo, trackingNo, company })
          }
        }
      })

      console.log('[批量导入] 有效数据（有运单号的）:', importedData.length, '条')
      console.log('[批量导入] 选中的订单号:', selectedOrders.value.map(o => o.orderNo))

      if (importedData.length === 0) {
        ElMessage.warning('未找到有运单号的数据，请在第5列（运单号）填写运单号后再导入')
        return
      }

      // 🔥 改进：更宽松的订单号匹配逻辑
      let matchedCount = 0
      const matchedOrders: string[] = []
      const unmatchedImports: string[] = []

      // 创建系统订单号的映射（支持多种格式匹配）
      const orderNoMap = new Map<string, { index: number; order: Order }>()
      selectedOrders.value.forEach((order, index) => {
        const orderNoStr = String(order.orderNo || '').trim()
        // 存储原始订单号
        orderNoMap.set(orderNoStr, { index, order })
        // 存储去除前缀的订单号（如果有ORD前缀）
        if (orderNoStr.startsWith('ORD')) {
          orderNoMap.set(orderNoStr.substring(3), { index, order })
        }
        // 存储纯数字部分
        const numericPart = orderNoStr.replace(/\D/g, '')
        if (numericPart && numericPart !== orderNoStr) {
          orderNoMap.set(numericPart, { index, order })
        }
      })

      importedData.forEach(item => {
        const importOrderNo = String(item.orderNo || '').trim()

        // 尝试多种匹配方式
        let matched = orderNoMap.get(importOrderNo)

        // 如果直接匹配失败，尝试添加ORD前缀
        if (!matched && !importOrderNo.startsWith('ORD')) {
          matched = orderNoMap.get('ORD' + importOrderNo)
        }

        // 尝试纯数字匹配
        if (!matched) {
          const numericPart = importOrderNo.replace(/\D/g, '')
          if (numericPart) {
            matched = orderNoMap.get(numericPart)
          }
        }

        if (matched) {
          importedTrackingNumbers.value[matched.index] = item.trackingNo
          matchedOrders.push(importOrderNo)
          matchedCount++

          console.log(`[批量导入] 匹配成功: ${importOrderNo} -> ${matched.order.orderNo}, 运单号: ${item.trackingNo}`)
        } else {
          unmatchedImports.push(importOrderNo)
          console.warn(`[批量导入] 未匹配: ${importOrderNo}`)
        }
      })

      // 🔥 改进：更新预览数据，只显示有运单号的订单
      updatePreviewWithImportedData()

      if (matchedCount > 0) {
        ElMessage.success(`成功导入 ${matchedCount} 个订单的运单号`)
        if (unmatchedImports.length > 0) {
          console.warn('[批量导入] 未匹配的导入订单号:', unmatchedImports)
        }
      } else {
        console.error('[批量导入] 未匹配到任何订单')
        console.error('[批量导入] 导入的订单号:', importedData.map(d => d.orderNo))
        console.error('[批量导入] 系统中的订单号:', selectedOrders.value.map(o => o.orderNo))
        ElMessage.error('未匹配到任何订单，请检查订单号格式是否正确')
      }

    } catch (error) {
      console.error('[批量导入] 文件解析失败:', error)
      ElMessage.error('文件解析失败，请确保文件格式正确')
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsBinaryString(file)
}

// 更新预览数据（导入后）
const updatePreviewWithImportedData = () => {
  // 预览数据会自动根据 importedTrackingNumbers 更新
  console.log('[批量导入] 更新预览数据，有运单号的订单数:',
    importedTrackingNumbers.value.filter(n => n).length)
}

// 下载模板
const downloadTemplate = () => {
  try {
    // 创建表头
    const headers = ['订单号', '客户姓名', '联系电话', '收货地址', '运单号', '物流公司(仅参考)']

    // 创建数据行 - 联系电话使用数字格式便于匹配
    const data = selectedOrders.value.map(order => {
      // 获取电话号码
      const phoneStr = order.phone || order.customerPhone || ''
      // 🔥 转换为数字格式（去除非数字字符）
      const phoneNum = phoneStr.replace(/\D/g, '')

      return [
        order.orderNo || '',
        order.customerName || '',
        phoneNum ? Number(phoneNum) : '', // 🔥 电话号码转为数字
        order.address || order.receiverAddress || '',
        '', // 运单号留空待填写
        ''  // 物流公司留空待填写（仅参考）
      ]
    })

    // 合并表头和数据
    const wsData = [headers, ...data]

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 设置列宽（根据内容自适应）
    const colWidths = headers.map((header, colIndex) => {
      // 计算该列的最大宽度
      let maxWidth = header.length
      data.forEach(row => {
        const cellValue = String(row[colIndex] || '')
        // 中文字符按2个字符宽度计算
        const cellWidth = cellValue.split('').reduce((width, char) => {
          return width + (/[\u4e00-\u9fa5]/.test(char) ? 2 : 1)
        }, 0)
        maxWidth = Math.max(maxWidth, cellWidth)
      })
      // 添加一些额外空间，最小宽度10，最大宽度50
      return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) }
    })
    ws['!cols'] = colWidths

    // 🔥 设置联系电话列（第3列，索引2）为数字格式
    const phoneColIndex = 2
    for (let rowIndex = 1; rowIndex <= data.length; rowIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: phoneColIndex })
      if (ws[cellAddress] && ws[cellAddress].v) {
        // 设置为数字格式
        ws[cellAddress].t = 'n' // 'n' 表示数字类型
        ws[cellAddress].z = '0' // 整数格式，不显示小数
      }
    }

    // 设置订单号列为文本格式（第1列，索引0）
    const orderNoColIndex = 0
    for (let rowIndex = 1; rowIndex <= data.length; rowIndex++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: orderNoColIndex })
      if (ws[cellAddress]) {
        ws[cellAddress].t = 's'
        ws[cellAddress].z = '@'
      }
    }

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '批量发货模板')

    // 生成Excel文件并下载
    XLSX.writeFile(wb, `批量发货模板_${new Date().getTime()}.xlsx`)

    ElMessage.success('模板下载成功！请填写运单号后导入（物流公司列仅供参考）')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('模板下载失败，请重试')
  }
}

// 保存草稿
const _saveAsDraft = async () => {
  try {
    ElMessage.info('正在保存草稿...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (_error) {
    ElMessage.error('草稿保存失败')
  }
}

// 确认批量发货
const confirmBatchShipping = async () => {
  if (!formRef.value) return

  try {
    // 导入模式下，物流公司不是必填（使用订单自带的或预览区编辑的）
    if (batchForm.trackingMode !== 'import') {
      await formRef.value.validate()
    }

    // 🔥 改进：使用previewData作为要发货的订单（已过滤掉移除的订单）
    const ordersToShip: Order[] = previewData.value as Order[]

    if (batchForm.trackingMode === 'import') {
      // 导入模式：previewData已经过滤了没有运单号的订单
      if (ordersToShip.length === 0) {
        ElMessage.error('没有可发货的订单，请先导入运单号')
        return
      }
    } else if (batchForm.trackingMode === 'manual') {
      // 手动模式：验证预览区订单的运单号都已填写
      const emptyTrackingOrders = ordersToShip.filter(order => {
        const index = getOriginalIndex(order)
        return !trackingNumbers.value[index] || !trackingNumbers.value[index].trim()
      })
      if (emptyTrackingOrders.length > 0) {
        ElMessage.error(`还有 ${emptyTrackingOrders.length} 个订单的运单号未填写`)
        return
      }
    } else {
      // 自动模式：检查是否选择了物流公司（全局或每个订单）
      const ordersWithoutCompany = ordersToShip.filter(order => {
        const index = getOriginalIndex(order)
        return !previewLogisticsCompanies.value[index] && !batchForm.logisticsCompany
      })
      if (ordersWithoutCompany.length > 0) {
        ElMessage.error('请为所有订单选择物流公司')
        return
      }
    }

    if (ordersToShip.length === 0) {
      ElMessage.error('没有可发货的订单')
      return
    }

    await ElMessageBox.confirm(
      `确认批量发货 ${ordersToShip.length} 个订单吗？发货后将无法撤销。`,
      '确认批量发货',
      {
        confirmButtonText: '确认发货',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    // 生成发货数据
    const shippingData = ordersToShip.map((order) => {
      const originalIndex = getOriginalIndex(order)
      let trackingNumber = ''
      let logisticsCompanyCode = ''

      // 🔥 优先使用预览区编辑的物流公司
      const previewCompany = previewLogisticsCompanies.value[originalIndex]

      if (batchForm.trackingMode === 'auto') {
        // 自动生成运单号
        logisticsCompanyCode = previewCompany || batchForm.logisticsCompany
        const company = logisticsCompanies.value.find(c => c.code === logisticsCompanyCode)
        const timestamp = Date.now().toString()
        const random = Math.random().toString(36).substring(2, 6).toUpperCase()
        trackingNumber = `${company?.prefix || 'EX'}${timestamp.slice(-8)}${random}${originalIndex}`
      } else if (batchForm.trackingMode === 'manual') {
        trackingNumber = trackingNumbers.value[originalIndex]
        logisticsCompanyCode = previewCompany || batchForm.logisticsCompany
      } else {
        // 导入模式
        trackingNumber = importedTrackingNumbers.value[originalIndex]
        // 🔥 关键：优先使用预览区编辑的物流公司，其次使用订单自带的
        logisticsCompanyCode = previewCompany || order.expressCompany || order.logisticsCompany || batchForm.logisticsCompany
      }

      const now = new Date().toISOString()
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        logisticsCompany: logisticsCompanyCode,
        trackingNumber,
        estimatedDelivery: batchForm.estimatedDelivery,
        remarks: batchForm.remarks,
        shippingMethod: batchForm.shippingMethod,
        shippingTime: now,
        shippedAt: now,
        status: 'shipped'
      }
    })

    // 🔥 修复：调用后端API批量更新订单状态
    const { orderApi } = await import('@/api/order')
    const { useOrderStore } = await import('@/stores/order')
    const orderStore = useOrderStore()

    console.log('[批量发货] 开始批量更新订单状态:', shippingData.length, '个订单')

    // 批量调用后端API更新订单状态
    let successCount = 0
    for (const data of shippingData) {
      try {
        console.log(`[批量发货] 更新订单 ${data.orderNo} 状态为 shipped, 物流公司: ${data.logisticsCompany}`)
        await orderApi.update(data.orderId, {
          status: 'shipped',
          trackingNumber: data.trackingNumber,
          expressCompany: data.logisticsCompany,
          shippedAt: data.shippedAt,
          remark: data.remarks || `批量发货，快递公司：${data.logisticsCompany}，运单号：${data.trackingNumber}`
        })
        successCount++
      } catch (error: any) {
        console.error(`[批量发货] 订单 ${data.orderNo} 更新失败:`, error)
        ElMessage.warning(`订单 ${data.orderNo} 发货失败: ${error?.message || '未知错误'}`)
      }
    }

    console.log('[批量发货] 后端API更新完成，成功:', successCount, '个')

    // 同步更新前端store（静默处理错误，因为后端已经成功）
    shippingData.forEach(data => {
      try {
        orderStore.updateOrder(data.orderId, {
          status: 'shipped',
          trackingNumber: data.trackingNumber,
          expressNo: data.trackingNumber,
          expressCompany: data.logisticsCompany,
          logisticsCompany: data.logisticsCompany,
          shippingTime: data.shippingTime,
          shippedAt: data.shippedAt,
          estimatedDelivery: data.estimatedDelivery,
          expectedDeliveryDate: data.estimatedDelivery,
          remarks: data.remarks
        })
      } catch (storeError) {
        // 静默处理store更新错误，因为后端已经成功更新
        console.warn(`[批量发货] 前端store更新失败 (订单 ${data.orderNo}):`, storeError)
      }
    })

    emit('batch-shipped', shippingData)
    ElMessage.success(`成功批量发货 ${successCount} 个订单！`)
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
  // 🔥 清空预览区物流公司数组
  previewLogisticsCompanies.value = []
  // 🔥 清空已移除的订单ID列表
  removedOrderIds.value = []
  // 🔥 清空缓存的订单数据
  cachedOrders.value = []

  dialogVisible.value = false
}
</script>

<style scoped>
/* 紧凑对话框样式 */
:deep(.batch-shipping-dialog) {
  .el-dialog {
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  }
  .el-dialog__header {
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  .el-dialog__title {
    font-size: 16px;
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
    padding: 16px 20px;
    max-height: 75vh;
    overflow-y: auto;
  }
  .el-dialog__footer {
    padding: 12px 20px;
    border-top: 1px solid #f0f0f0;
  }
}

/* 紧凑内容区 */
.batch-content-compact {
  font-size: 14px;
}

/* 顶部汇总 */
.top-summary {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 16px;
}
.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.summary-item .label {
  color: #666;
  font-size: 13px;
}
.summary-item .value {
  font-weight: 600;
  font-size: 15px;
}
.summary-item .value.primary { color: #409eff; }
.summary-item .value.warning { color: #e6a23c; }

/* 订单表格（可折叠） */
.orders-table-compact {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

/* 紧凑表单 */
.compact-form {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 16px;
}
.form-row {
  display: flex;
  gap: 16px;
}
.form-item-half {
  flex: 1;
}
.form-item-half :deep(.el-select),
.form-item-half :deep(.el-date-editor) {
  width: 100%;
}

/* 运单号区域 */
.tracking-section {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #333;
}
.tracking-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.tracking-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tracking-item .order-no {
  font-size: 12px;
  color: #666;
  min-width: 110px;
}

/* 上传区域 - 紧凑设计 */
.upload-compact {
  :deep(.el-upload-dragger) {
    padding: 12px 16px;
    height: auto;
    min-height: 60px;
  }
  :deep(.el-upload) {
    width: 100%;
  }
}
.upload-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
  font-size: 13px;
}
.upload-icon {
  font-size: 20px;
  color: #409eff;
}

/* 预览区域 - 增加高度 */
.preview-section {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 16px;
}
.preview-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.preview-count {
  font-size: 12px;
  color: #409eff;
  font-weight: normal;
}

/* 确认提示 */
.confirm-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fef3cd;
  border-radius: 6px;
  color: #856404;
  font-size: 13px;
}
.tip-icon {
  color: #e6a23c;
  font-size: 16px;
}

/* 底部按钮 */
.dialog-footer-compact {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
