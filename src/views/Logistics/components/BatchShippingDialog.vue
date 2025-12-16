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
        </div>
        <el-table :data="previewData" size="small" max-height="120" border>
          <el-table-column prop="orderNo" label="订单号" width="130" />
          <el-table-column label="物流" width="100">
            <template #default>{{ getLogisticsName() || '-' }}</template>
          </el-table-column>
          <el-table-column label="运单号" min-width="130">
            <template #default="{ $index }">
              <span v-if="batchForm.trackingMode === 'auto'" style="color: #409eff">自动生成</span>
              <span v-else-if="batchForm.trackingMode === 'manual'">{{ trackingNumbers[$index] || '-' }}</span>
              <span v-else>{{ importedTrackingNumbers[$index] || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ $index }">
              <el-tag :type="getPreviewStatus($index).type" size="small">{{ getPreviewStatus($index).text }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 确认提示（简化） -->
      <div class="confirm-tips">
        <el-icon class="tip-icon"><WarningFilled /></el-icon>
        <span>确认后将更新 <strong>{{ selectedOrders.length }}</strong> 个订单状态为"已发货"，此操作不可撤销</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer-compact">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmBatchShipping" :loading="loading">
          <el-icon><Van /></el-icon>确认发货
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  Box, Setting, Edit, Upload, View, Delete, UploadFilled,
  Download, Document, Van, WarningFilled, ArrowDown, ArrowUp
} from '@element-plus/icons-vue'
import type { Order } from '@/stores/order'
import * as XLSX from 'xlsx'

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
const showOrderDetail = ref(false)

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

// 物流公司列表 - 从API获取
const logisticsCompanies = ref<Array<{ code: string; name: string; prefix: string }>>([])
const loadingCompanies = ref(false)

// 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/companies/active')

    if (response && Array.isArray(response)) {
      logisticsCompanies.value = response.map((item: { code: string; name: string; shortName?: string }) => ({
        code: item.code,
        name: item.name,
        prefix: item.code.toUpperCase().substring(0, 2)
      }))
      console.log('[批量发货弹窗] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else if (response && response.data && Array.isArray(response.data)) {
      logisticsCompanies.value = response.data.map((item: { code: string; name: string; shortName?: string }) => ({
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

// 初始化预计送达时间为3天后
const initEstimatedDelivery = () => {
  const today = new Date()
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  batchForm.estimatedDelivery = threeDaysLater.toISOString().split('T')[0]
}

// 监听弹窗打开，初始化默认值
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 加载物流公司列表
    if (logisticsCompanies.value.length === 0) {
      await loadLogisticsCompanies()
    }
    // 设置默认预计送达时间为3天后
    initEstimatedDelivery()
  }
}, { immediate: true })

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
  // 如果预计送达时间未设置，则设置为3天后（默认值）
  // 如果已设置，则根据物流公司调整（可选）
  if (!batchForm.estimatedDelivery) {
    initEstimatedDelivery()
  }
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
const handleFileChange = (uploadFile: unknown) => {
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

      // 解析Excel文件
      const workbook = XLSX.read(data, { type: 'binary' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]

      // 转换为JSON数据
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]

      if (jsonData.length < 2) {
        ElMessage.error('文件格式错误，至少需要包含表头和一行数据')
        return
      }

      // 跳过表头，解析数据行
      const dataRows = jsonData.slice(1)
      const importedData: { orderNo: string; trackingNo: string; company: string }[] = []

      dataRows.forEach((row, rowIndex) => {
        if (Array.isArray(row) && row.length >= 5) {
          // 处理订单号，可能是字符串或数字
          let orderNo = String(row[0] || '').trim()
          // 如果订单号是数字，转换为字符串
          if (typeof row[0] === 'number') {
            orderNo = row[0].toString()
          }

          const trackingNo = String(row[4] || '').trim()
          const company = String(row[5] || '').trim()

          console.log(`第${rowIndex + 2}行数据:`, { orderNo, trackingNo, company })

          if (orderNo && trackingNo) {
            importedData.push({ orderNo, trackingNo, company })
          }
        }
      })

      console.log('导入的数据:', importedData)
      console.log('选中的订单号:', props.selectedOrders.map(o => o.orderNo))

      if (importedData.length === 0) {
        ElMessage.error('未找到有效的运单号数据，请确保第5列填写了运单号')
        return
      }

      // 匹配导入的数据到选中的订单
      let matchedCount = 0
      const unmatchedOrders: string[] = []

      props.selectedOrders.forEach((order, index) => {
        // 宽松匹配：去除空格、转换为字符串后比较
        const orderNoStr = String(order.orderNo || '').trim()
        const found = importedData.find(item => {
          const importOrderNo = String(item.orderNo || '').trim()
          return importOrderNo === orderNoStr
        })

        if (found) {
          importedTrackingNumbers.value[index] = found.trackingNo
          // 如果导入的数据包含物流公司，也更新物流公司
          if (found.company && !batchForm.logisticsCompany) {
            const companyMatch = logisticsCompanies.value.find(
              c => c.name === found.company || c.code === found.company
            )
            if (companyMatch) {
              batchForm.logisticsCompany = companyMatch.code
            }
          }
          matchedCount++
        } else {
          unmatchedOrders.push(orderNoStr)
        }
      })

      if (matchedCount > 0) {
        ElMessage.success(`成功导入 ${matchedCount} 个订单的运单号`)
        if (unmatchedOrders.length > 0) {
          console.warn('未匹配的订单号:', unmatchedOrders)
          ElMessage.warning(`有 ${unmatchedOrders.length} 个订单未匹配到运单号`)
        }
      } else {
        console.error('未匹配到任何订单')
        console.error('导入的订单号:', importedData.map(d => d.orderNo))
        console.error('系统中的订单号:', props.selectedOrders.map(o => o.orderNo))
        ElMessage.error('未匹配到任何订单，请检查订单号是否与系统中的订单号完全一致')
      }

    } catch (error) {
      console.error('文件解析失败:', error)
      ElMessage.error('文件解析失败，请确保文件格式正确')
    }
  }

  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }

  reader.readAsBinaryString(file)
}

// 下载模板
const downloadTemplate = () => {
  try {
    // 创建表头
    const headers = ['订单号', '客户姓名', '联系电话', '收货地址', '运单号', '物流公司']

    // 创建数据行
    const data = props.selectedOrders.map(order => [
      order.orderNo || '',
      order.customerName || '',
      order.phone || order.customerPhone || '',
      order.address || order.receiverAddress || '',
      '', // 运单号留空待填写
      ''  // 物流公司留空待填写
    ])

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

    // 创建工作簿
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '批量发货模板')

    // 生成Excel文件并下载
    XLSX.writeFile(wb, `批量发货模板_${new Date().getTime()}.xlsx`)

    ElMessage.success('模板下载成功！请填写运单号和物流公司后导入')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('模板下载失败，请重试')
  }
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
    } else if (batchForm.trackingMode === 'import') {
      const emptyTrackingCount = importedTrackingNumbers.value.filter(num => !num.trim()).length
      if (emptyTrackingCount > 0) {
        ElMessage.error(`还有 ${emptyTrackingCount} 个订单的运单号未导入，请先导入完整数据`)
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

      const now = new Date().toISOString()
      return {
        orderId: order.id,
        orderNo: order.orderNo,
        logisticsCompany: batchForm.logisticsCompany,
        trackingNumber,
        estimatedDelivery: batchForm.estimatedDelivery,
        remarks: batchForm.remarks,
        shippingMethod: batchForm.shippingMethod,
        shippingTime: now,
        shippedAt: now, // 同时设置shippedAt字段
        status: 'shipped'
      }
    })

    // 🔥 修复：调用后端API批量更新订单状态
    const { orderApi } = await import('@/api/order')
    const { useOrderStore } = await import('@/stores/order')
    const orderStore = useOrderStore()

    console.log('[批量发货] 开始批量更新订单状态:', shippingData.length, '个订单')

    // 批量调用后端API更新订单状态
    for (const data of shippingData) {
      try {
        console.log(`[批量发货] 更新订单 ${data.orderNo} 状态为 shipped`)
        await orderApi.update(data.orderId, {
          status: 'shipped',
          trackingNumber: data.trackingNumber,
          expressCompany: data.logisticsCompany,
          shippedAt: data.shippedAt,
          remark: data.remarks || `批量发货，快递公司：${data.logisticsCompany}，运单号：${data.trackingNumber}`
        })
      } catch (error: any) {
        console.error(`[批量发货] 订单 ${data.orderNo} 更新失败:`, error)
        ElMessage.warning(`订单 ${data.orderNo} 发货失败: ${error?.message || '未知错误'}`)
      }
    }

    console.log('[批量发货] 后端API更新完成')

    // 同步更新前端store
    shippingData.forEach(data => {
      orderStore.updateOrder(data.orderId, {
        status: 'shipped',
        trackingNumber: data.trackingNumber,
        expressNo: data.trackingNumber, // 同时更新expressNo字段
        expressCompany: data.logisticsCompany, // 使用expressCompany字段
        logisticsCompany: data.logisticsCompany, // 同时保留logisticsCompany字段
        shippingTime: data.shippingTime,
        shippedAt: data.shippedAt, // 同时更新shippedAt字段
        estimatedDelivery: data.estimatedDelivery,
        expectedDeliveryDate: data.estimatedDelivery, // 同时更新expectedDeliveryDate字段
        remarks: data.remarks
      })
    })

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

/* 上传区域 */
.upload-compact {
  :deep(.el-upload-dragger) {
    padding: 20px;
    height: auto;
  }
}
.upload-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #666;
}
.upload-icon {
  font-size: 24px;
  color: #409eff;
}

/* 预览区域 */
.preview-section {
  background: #fff;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 16px;
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
