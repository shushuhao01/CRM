<template>
  <el-dialog
    v-model="dialogVisible"
    width="950px"
    :before-close="handleClose"
    class="batch-print-dialog"
    top="3vh"
  >
    <template #header>
      <div class="dialog-header-with-help">
        <span class="el-dialog__title">批量打印面单（已选 {{ orders.length }} 个订单）</span>
        <el-tooltip content="查看发货打单指南" placement="bottom">
          <el-button link type="primary" class="help-icon-btn" @click="goToHelp">
            <el-icon :size="18"><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    <div class="batch-content">
      <!-- 批量设置 -->
      <div class="batch-settings">
        <h4 class="section-title"><el-icon><Setting /></el-icon> 批量设置</h4>
        <div class="settings-grid">
          <div class="setting-row">
            <div class="setting-item">
              <label>打印机：</label>
              <template v-if="currentPrintMode === 'lodop'">
                <el-tag type="success" size="small" style="margin-right: 4px;">LODOP</el-tag>
                <span class="printer-mode-text">{{ lodopPrinterName || '默认LODOP打印机' }}</span>
              </template>
              <template v-else-if="currentPrintMode === 'usb'">
                <el-tag type="success" size="small" style="margin-right: 4px;">USB</el-tag>
                <span class="printer-mode-text">USB直连打印机</span>
              </template>
              <template v-else>
                <el-select v-model="selectedPrinterId" placeholder="选择打印机" class="setting-select">
                  <el-option
                    v-for="p in printerList"
                    :key="p.id"
                    :label="p.name + (p.isDefault ? ' ★默认' : '')"
                    :value="p.id"
                  />
                </el-select>
              </template>
              <el-button type="primary" size="small" text @click="printerConfigVisible = true">
                <el-icon><Setting /></el-icon> 配置
              </el-button>
            </div>
            <div class="setting-item">
              <label>默认模板：</label>
              <el-select v-model="defaultTemplateId" placeholder="选择模板" class="setting-select">
                <el-option
                  v-for="tpl in allTemplates"
                  :key="tpl.id"
                  :label="tpl.name"
                  :value="tpl.id"
                />
              </el-select>
              <el-button type="primary" size="small" @click="applyBatchTemplate" :disabled="!defaultTemplateId">
                应用到{{ selectedRows.length > 0 ? '选中' : '全部' }}
              </el-button>
            </div>
          </div>
          <!-- 批量物流公司选择 -->
          <div class="setting-row">
            <div class="setting-item">
              <label>批量物流：</label>
              <el-select v-model="batchLogisticsCode" placeholder="选择物流公司" class="setting-select" filterable clearable>
                <el-option v-for="c in logisticsCompanies" :key="c.code" :label="c.name" :value="c.code" />
              </el-select>
              <el-button type="primary" size="small" @click="applyBatchLogistics" :disabled="!batchLogisticsCode">
                应用到{{ selectedRows.length > 0 ? '选中' : '全部' }}
              </el-button>
            </div>
            <div class="setting-item">
              <label>打印份数：</label>
              <el-input-number v-model="printCopies" :min="1" :max="10" size="default" />
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-options">
              <el-checkbox v-model="autoMatchTemplate">自动匹配物流公司模板</el-checkbox>
              <el-checkbox v-model="showProducts">包含商品明细</el-checkbox>
              <el-checkbox v-model="showRemark">包含备注</el-checkbox>
              <el-checkbox v-model="showCodAmount">显示代收款</el-checkbox>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单列表 -->
      <div class="orders-section">
        <div class="section-header">
          <div class="title-with-actions">
            <h4 class="section-title"><el-icon><List /></el-icon> 订单列表</h4>
            <el-button size="small" @click="toggleSelectCurrentPage">
              {{ isCurrentPageAllSelected ? '取消当页' : '选当页' }}
            </el-button>
            <el-button size="small" :type="isAllSelected ? 'danger' : 'primary'" @click="toggleSelectAll">
              {{ isAllSelected ? '取消全部' : `全选所有 (${orderItems.length})` }}
            </el-button>
          </div>
          <div class="header-right">
            <div class="select-actions">
              <el-button size="small" :loading="checkingSupport" @click="recheckAllSupport">
                <el-icon><Refresh /></el-icon> 检查打单支持
              </el-button>
              <el-button size="small" type="success" :loading="fetchingAllTN" @click="fetchAllTrackingNumbers" :disabled="missingTNCount === 0">
                <el-icon><Download /></el-icon> 批量获取运单号 ({{ missingTNCount }})
              </el-button>
            </div>
            <div class="status-summary">
              <el-tag type="success" size="small">就绪：{{ readyToPrintCount }}</el-tag>
              <el-tag v-if="missingTNCount > 0" type="warning" size="small">缺运单号：{{ missingTNCount }}</el-tag>
              <el-tag v-if="warningCount > 0" type="danger" size="small">缺物流：{{ warningCount }}</el-tag>
            </div>
          </div>
        </div>
        <el-table
          ref="orderTableRef"
          :data="paginatedItems"
          size="small"
          max-height="340"
          border
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="40" />
          <el-table-column prop="orderNo" label="订单号" min-width="130" />
          <el-table-column prop="customerName" label="客户" min-width="80" />
          <el-table-column label="物流公司" min-width="150">
            <template #default="{ row }">
              <el-select
                v-model="row.logisticsCode"
                placeholder="选择物流公司"
                size="small"
                filterable
                style="width: 100%"
                @change="onItemLogisticsChange(row)"
              >
                <el-option v-for="c in logisticsCompanies" :key="c.code" :label="c.name" :value="c.code" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="运单号" min-width="200">
            <template #default="{ row }">
              <div style="display: flex; align-items: center; gap: 4px;">
                <el-input v-model="row.trackingNumber" placeholder="需先获取或手动填入" size="small" clearable @blur="onTrackingBlur(row)" />
                <el-button
                  type="success"
                  size="small"
                  :icon="Download"
                  circle
                  :loading="row._fetchingTN"
                  :disabled="!row.logisticsCode"
                  @click="fetchSingleTrackingNumber(row)"
                  title="从物流API获取运单号"
                />
              </div>
            </template>
          </el-table-column>
          <el-table-column label="面单模板" min-width="160">
            <template #default="{ row }">
              <el-select
                v-model="row.templateId"
                placeholder="选择模板"
                size="small"
                style="width: 100%"
              >
                <el-option v-for="tpl in allTemplates" :key="tpl.id" :label="tpl.name" :value="tpl.id" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="90" align="center">
            <template #default="{ row }">
              <el-tooltip v-if="getItemStatus(row).tip" :content="getItemStatus(row).tip" placement="top">
                <el-tag :type="getItemStatus(row).type" size="small">{{ getItemStatus(row).text }}</el-tag>
              </el-tooltip>
              <el-tag v-else :type="getItemStatus(row).type" size="small">{{ getItemStatus(row).text }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <span class="selection-info" v-if="selectedRows.length > 0">
            已选 {{ selectedRows.length }} / {{ orderItems.length }} 个订单
          </span>
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="orderItems.length"
            :pager-count="5"
            layout="prev, pager, next"
            small
            background
            @current-change="handlePageChange"
          />
        </div>
      </div>

      <!-- 面单预览 -->
      <div class="preview-section">
        <div class="section-header">
          <h4 class="section-title"><el-icon><View /></el-icon> 面单预览</h4>
          <div class="preview-nav">
            <el-button size="small" :disabled="previewIndex <= 0" @click="previewIndex--">
              <el-icon><ArrowLeft /></el-icon> 上一张
            </el-button>
            <span class="nav-info">{{ previewIndex + 1 }} / {{ printableItems.length || 1 }}</span>
            <el-button size="small" :disabled="previewIndex >= printableItems.length - 1" @click="previewIndex++">
              下一张 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
        <div class="preview-wrapper" ref="batchPreviewWrapperRef">
          <div v-if="currentPreviewItem" class="preview-label">
            <div class="preview-scaler" :style="{ transform: `scale(${batchPreviewScale})`, transformOrigin: 'top center' }">
              <div class="sl-batch" :style="{ width: previewPaperW + 'mm' }">
                <div class="sl-header">
                  <div class="sl-company">{{ getCompanyName(currentPreviewItem.logisticsCode) }}</div>
                  <div class="sl-route-code">{{ getRouteCode(currentPreviewItem.address) }}</div>
                </div>
                <div v-if="currentPreviewTemplate?.showBarcode !== false" class="sl-barcode-top">
                  <svg v-show="currentPreviewItem.trackingNumber" ref="batchBarcodeTopRef" class="batch-barcode-top-svg"></svg>
                  <div v-show="!currentPreviewItem.trackingNumber" class="barcode-placeholder">待生成物流单号</div>
                  <div class="sl-tracking-no">{{ currentPreviewItem.trackingNumber || '待生成物流单号' }}</div>
                </div>
                <div class="sl-addr-block sl-recv">
                  <div class="sl-addr-row">
                    <span class="sl-tag sl-tag-recv">收</span>
                    <span class="sl-name">{{ maskNameForItem(currentPreviewItem.customerName, currentPreviewItem) }}</span>
                    <span class="sl-phone">{{ maskPhoneForItem(currentPreviewItem.phone, currentPreviewItem) }}</span>
                  </div>
                  <div class="sl-addr-detail">{{ maskAddressForItem(currentPreviewItem.address, currentPreviewItem) }}</div>
                </div>
                <div v-if="currentPreviewTemplate?.showSenderInfo !== false" class="sl-addr-block sl-send">
                  <div class="sl-addr-row">
                    <span class="sl-tag sl-tag-send">寄</span>
                    <span class="sl-name-sm">{{ companyInfo.senderName }}</span>
                    <span class="sl-phone-sm">{{ maskPhoneForItem(companyInfo.senderPhone, currentPreviewItem) }}</span>
                  </div>
                  <div class="sl-addr-detail-sm">{{ companyInfo.senderAddress }}</div>
                </div>
                <div v-if="showProducts" class="sl-info-row">
                  <b>商品：</b>{{ currentPreviewItem.productsText }}
                </div>
                <div v-if="showCodAmount && currentPreviewItem.codAmount > 0" class="sl-info-row sl-cod">
                  <b>代收款：¥{{ currentPreviewItem.codAmount }}</b>
                </div>
                <div v-if="showRemark && currentPreviewItem.remark" class="sl-info-row sl-remark">
                  <b>备注：</b><span>{{ currentPreviewItem.remark }}</span>
                </div>
                <div class="sl-bottom">
                  <canvas v-show="currentPreviewItem.trackingNumber && currentPreviewTemplate?.showQrcode !== false" ref="batchQrcodeRef" class="sl-qrcode" width="64" height="64"></canvas>
                  <div v-show="!currentPreviewItem.trackingNumber" class="sl-qrcode qrcode-placeholder">待生成</div>
                  <div class="sl-bottom-right">
                    <svg v-show="currentPreviewItem.trackingNumber" ref="batchBarcodeBottomRef" class="batch-barcode-btm-svg"></svg>
                    <div v-show="!currentPreviewItem.trackingNumber" class="barcode-placeholder-sm">待生成物流单号</div>
                    <div class="sl-order-info">
                      <span>订单号：{{ currentPreviewItem.orderNo }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="currentPreviewTemplate?.showSignArea" class="sl-sign">
                  签收人/日期：________________
                </div>
              </div>
            </div>
          </div>
          <div v-else class="preview-empty">
            <el-empty description="暂无可预览的面单" :image-size="60" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="handlePreviewAll" :disabled="readyToPrintCount === 0">
          <el-icon><View /></el-icon> 全屏预览（横排）
        </el-button>
        <el-button
          type="primary"
          @click="handleBatchPrint"
          :loading="printing"
          :disabled="readyToPrintCount === 0"
        >
          <el-icon><Printer /></el-icon> 打印就绪订单 ({{ readyToPrintCount }})
        </el-button>
      </div>
    </template>

    <!-- 打印机配置弹窗 -->
    <PrinterConfigDialog v-model:visible="printerConfigVisible" />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ElTable } from 'element-plus'
import {
  Setting, List, View, Printer, ArrowLeft, ArrowRight, Refresh, Download, QuestionFilled
} from '@element-plus/icons-vue'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import {
  getSavedPrinters, getDefaultPrinter, maskPhone as maskPhoneFn, PAPER_SIZES,
  printLabels, previewLabels, orderToLabelData, addressToRouteCode,
  getDefaultPrintMode, getDefaultLodopPrinter, validateTrackingCompanyMatch,
  prepareLabelCodes, generateLabelHTML, generateLodopFullHTML,
  type PrinterConfig
} from '@/utils/printService'
import {
  getLodopStatus, lodopPrintHTML
} from '@/utils/lodopService'
import {
  getAllTemplates, getTemplateByCompany, getLastUsedTemplateId,
  maskName, maskAddress, getDefaultTemplateId,
  type LabelTemplate
} from '@/utils/labelTemplates'
import PrinterConfigDialog from './PrinterConfigDialog.vue'

interface OrderItem {
  id: string
  orderNo: string
  customerName: string
  phone: string
  address: string
  productsText: string
  products: any[]
  totalAmount: number
  codAmount: number
  deposit: number
  remark: string
  createTime: string
  serviceWechat: string
  logisticsCode: string
  trackingNumber: string
  templateId: string
  expressCompany?: string
  designatedExpress?: string
  expressNo?: string
  // 物流API打单支持状态
  printSupported?: boolean | null  // true=支持, false=不支持, null=未检查
  printSupportReason?: string      // 不支持的原因
  _fetchingTN?: boolean            // 是否正在获取运单号
}

interface Props {
  visible: boolean
  orders: any[]
}
interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'printed', data: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }>): void
  (e: 'tracking-saved', data: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()


/**
 * 🔥 将运单号批量保存到数据库（不改变订单状态）
 * 无论打印成功还是失败，运单号都应先保存到数据库
 */
const batchSaveTrackingToDB = async (items: Array<{ id: string; trackingNumber: string; logisticsCode: string; orderNo: string }>) => {
  const savedItems: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }> = []
  try {
    const { orderApi } = await import('@/api/order')
    const { useOrderStore } = await import('@/stores/order')
    const orderStore = useOrderStore()
    for (const item of items) {
      if (!item.id || !item.trackingNumber) continue
      try {
        await orderApi.update(item.id, {
          trackingNumber: item.trackingNumber,
          expressCompany: item.logisticsCode,
        })
        orderStore.updateOrder(item.id, {
          trackingNumber: item.trackingNumber,
          expressNo: item.trackingNumber,
          expressCompany: item.logisticsCode,
        })
        savedItems.push({
          orderId: item.id,
          trackingNumber: item.trackingNumber,
          logisticsCompany: item.logisticsCode,
        })
      } catch (e) {
        console.warn(`[批量打印] 保存运单号到数据库失败(${item.orderNo}):`, e)
      }
    }
    if (savedItems.length > 0) {
      console.log(`[批量打印] 已保存 ${savedItems.length} 个订单的运单号到数据库`)
      emit('tracking-saved', savedItems)
    }
  } catch (e) {
    console.warn('[批量打印] 批量保存运单号失败:', e)
  }
  return savedItems
}

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const goToHelp = () => {
  dialogVisible.value = false
  nextTick(() => {
    router.push('/help-center?section=logistics-shipping-guide')
  })
}

// 状态
const printing = ref(false)
const printerConfigVisible = ref(false)
const previewIndex = ref(0)
const checkingSupport = ref(false)
const fetchingAllTN = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = 10
const orderTableRef = ref<InstanceType<typeof ElTable> | null>(null)

// 设置
const selectedPrinterId = ref('')
const defaultTemplateId = ref(getDefaultTemplateId() || 'universal-standard')
const autoMatchTemplate = ref(true)
const showProducts = ref(true)
const showRemark = ref(false)
const showCodAmount = ref(true)
const printCopies = ref(1)

// 打印模式
const currentPrintMode = ref<'browser' | 'lodop' | 'usb'>('browser')
const lodopPrinterName = ref('')

// 批量物流选择
const batchLogisticsCode = ref('')
const selectedRows = ref<OrderItem[]>([])

// 数据
const printerList = ref<PrinterConfig[]>([])
const logisticsCompanies = ref<Array<{ code: string; name: string }>>([])
const allTemplates = ref<LabelTemplate[]>([])
const orderItems = ref<OrderItem[]>([])

// 物流API支持缓存 (code => { supported, reason })
const logisticsSupportCache = ref<Record<string, { supported: boolean; reason: string }>>({})

// 公司信息
const companyInfo = ref({
  senderName: '客服中心',
  senderPhone: '01012345678',
  senderAddress: '北京市朝阳区科技园区xxx号',
})

// 计算属性
const currentPrinter = computed(() => {
  return printerList.value.find(p => p.id === selectedPrinterId.value) || getDefaultPrinter()
})

// 分页数据
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return orderItems.value.slice(start, start + pageSize)
})

// 就绪的订单：有物流公司 且 有运单号
const printableItems = computed(() => {
  return orderItems.value.filter(item => {
    if (!item.logisticsCode) return false
    if (item.trackingNumber) return true
    return false
  })
})

const readyToPrintCount = computed(() => printableItems.value.length)
const printableCount = computed(() => printableItems.value.length)
const missingTNCount = computed(() => orderItems.value.filter(
  item => item.logisticsCode && !item.trackingNumber
).length)
const notSupportedCount = computed(() => orderItems.value.filter(
  item => item.logisticsCode && !item.trackingNumber && item.printSupported === false
).length)
const warningCount = computed(() => orderItems.value.filter(item => !item.logisticsCode).length)

const currentPreviewItem = computed(() => {
  return printableItems.value[previewIndex.value] || null
})

const currentPreviewTemplate = computed(() => {
  const item = currentPreviewItem.value
  if (!item) return null
  return allTemplates.value.find(t => t.id === item.templateId) || null
})

// 方法
const getItemTemplate = (item: OrderItem): LabelTemplate | undefined => {
  return allTemplates.value.find(t => t.id === item.templateId)
}

const maskPhoneForItem = (phone: string, item?: OrderItem) => {
  const tpl = item ? getItemTemplate(item) : undefined
  return maskPhoneFn(phone, tpl?.privacyMode || 'partial')
}

const maskNameForItem = (name: string, item?: OrderItem) => {
  const tpl = item ? getItemTemplate(item) : undefined
  return maskName(name, tpl?.namePrivacy || 'full')
}

const maskAddressForItem = (address: string, item?: OrderItem) => {
  const tpl = item ? getItemTemplate(item) : undefined
  return maskAddress(address, tpl?.addressPrivacy || 'full')
}

const getCompanyName = (code: string) => {
  return logisticsCompanies.value.find(c => c.code === code)?.name || code || '-'
}

const getTemplateName = (id: string) => {
  return allTemplates.value.find(t => t.id === id)?.name || '通用标准'
}

const getRouteCode = (address: string) => {
  return addressToRouteCode(address || '')
}

// ===== 获取合并了模板纸张尺寸的打印配置 =====
const getConfigWithTemplatePaper = (items: OrderItem[]): PrinterConfig => {
  const config = { ...(currentPrinter.value || getDefaultPrinter()) }
  // 使用第一个可打印订单的模板纸张尺寸
  const firstItem = items[0]
  if (firstItem) {
    const tpl = allTemplates.value.find(t => t.id === firstItem.templateId)
    if (tpl?.paperSize && PAPER_SIZES[tpl.paperSize]) {
      config.paperSize = tpl.paperSize
      config.paperWidth = PAPER_SIZES[tpl.paperSize].width
      config.paperHeight = PAPER_SIZES[tpl.paperSize].height
    }
  }
  return config
}

// ===== 校验运单号与物流公司是否匹配（批量） =====
const validateItemsBeforePrint = async (items: OrderItem[]): Promise<boolean> => {
  const mismatched: string[] = []
  for (const item of items) {
    if (item.trackingNumber && item.logisticsCode) {
      const result = validateTrackingCompanyMatch(item.logisticsCode, item.trackingNumber)
      if (!result.valid) {
        mismatched.push(`订单 ${item.orderNo}: ${result.warning}`)
      }
    }
  }
  if (mismatched.length > 0) {
    try {
      const warningText = mismatched.length > 3
        ? mismatched.slice(0, 3).join('\n') + `\n...共 ${mismatched.length} 个订单不匹配`
        : mismatched.join('\n')
      await ElMessageBox.confirm(
        `以下订单的运单号与物流公司可能不匹配：\n\n${warningText}\n\n是否仍要继续？`,
        '⚠️ 运单号与物流公司不匹配',
        {
          type: 'warning',
          confirmButtonText: '仍然继续',
          cancelButtonText: '返回修改',
        }
      )
      return true
    } catch {
      return false
    }
  }
  return true
}

const getItemStatus = (item: OrderItem): { type: 'success' | 'warning' | 'danger' | 'info'; text: string; tip?: string } => {
  if (!item.logisticsCode) return { type: 'danger', text: '缺物流', tip: '请先选择物流公司' }
  if (item.trackingNumber) {
    // 校验运单号-物流公司匹配
    const match = validateTrackingCompanyMatch(item.logisticsCode, item.trackingNumber)
    if (!match.valid) return { type: 'warning', text: '不匹配', tip: match.warning }
    return { type: 'success', text: '就绪' }
  }
  // 无运单号，检查物流API是否支持打单
  if (item.printSupported === true) return { type: 'warning', text: '缺单号', tip: '请点击获取运单号或手动输入' }
  if (item.printSupported === false) return { type: 'danger', text: '不支持', tip: item.printSupportReason || '该物流公司不支持自动生成运单号，请手动输入' }
  return { type: 'info', text: '待检查', tip: '点击"检查打单支持"按钮检查' }
}

// 检查单个物流公司的打单支持
const checkLogisticsSupport = async (companyCode: string): Promise<{ supported: boolean; reason: string }> => {
  // 先查缓存
  if (logisticsSupportCache.value[companyCode]) {
    return logisticsSupportCache.value[companyCode]
  }
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const result = await logisticsApi.checkCreateOrderSupport(companyCode)
    const info = {
      supported: result.supported,
      reason: result.reason || (result.supported ? '' : '不支持自动打单')
    }
    logisticsSupportCache.value[companyCode] = info
    return info
  } catch {
    return { supported: false, reason: '检查失败，请手动输入运单号' }
  }
}

// 检查所有订单的物流打单支持
const checkAllItemsSupport = async () => {
  checkingSupport.value = true
  try {
    // 收集所有需要检查的物流公司代码
    const codesToCheck = new Set<string>()
    for (const item of orderItems.value) {
      if (item.logisticsCode && !item.trackingNumber) {
        codesToCheck.add(item.logisticsCode)
      }
    }
    // 并发检查
    const checks = Array.from(codesToCheck).map(async (code) => {
      const result = await checkLogisticsSupport(code)
      return { code, ...result }
    })
    const results = await Promise.all(checks)
    const resultMap = new Map(results.map(r => [r.code, r]))

    // 更新每个订单项的打单支持状态
    for (const item of orderItems.value) {
      if (item.trackingNumber) {
        item.printSupported = true
        continue
      }
      if (!item.logisticsCode) {
        item.printSupported = null
        continue
      }
      const check = resultMap.get(item.logisticsCode)
      if (check) {
        item.printSupported = check.supported
        item.printSupportReason = check.reason
      }
    }
  } finally {
    checkingSupport.value = false
  }
}

// 重新检查全部（清缓存）
const recheckAllSupport = async () => {
  logisticsSupportCache.value = {}
  await checkAllItemsSupport()
  ElMessage.success('打单支持检查完成')
}

// 单个订单物流公司变更时更新支持状态
const onItemLogisticsChange = async (item: OrderItem) => {
  if (autoMatchTemplate.value && item.logisticsCode) {
    const matched = getTemplateByCompany(item.logisticsCode)
    if (matched) item.templateId = matched.id
  }
  if (item.logisticsCode && !item.trackingNumber) {
    const result = await checkLogisticsSupport(item.logisticsCode)
    item.printSupported = result.supported
    item.printSupportReason = result.reason
  } else {
    item.printSupported = item.trackingNumber ? true : null
  }
}

// 预览面单宽度 - 优先使用模板纸张尺寸
const previewPaperW = computed(() => {
  const tpl = currentPreviewTemplate.value
  if (tpl?.paperSize) {
    const tplPaper = PAPER_SIZES[tpl.paperSize]
    if (tplPaper) return tplPaper.width
  }
  const printer = currentPrinter.value
  const paper = PAPER_SIZES[printer?.paperSize || '100x180'] || PAPER_SIZES['100x180']
  return paper.width
})

// 条形码 / 二维码 refs
const batchBarcodeTopRef = ref<SVGSVGElement | null>(null)
const batchBarcodeBottomRef = ref<SVGSVGElement | null>(null)
const batchQrcodeRef = ref<HTMLCanvasElement | null>(null)
const batchPreviewWrapperRef = ref<HTMLDivElement | null>(null)
const batchPreviewScale = ref(0.85)

const updateBatchPreviewScale = () => {
  if (!batchPreviewWrapperRef.value) return
  const containerW = batchPreviewWrapperRef.value.clientWidth - 40
  const labelPx = previewPaperW.value * 3.78
  const s = containerW / labelPx
  batchPreviewScale.value = Math.min(s, 1.2)
}

const refreshBatchPreview = () => {
  nextTick(() => {
    const item = currentPreviewItem.value
    if (!item) return
    const tn = item.trackingNumber || ''
    if (tn) {
      if (batchBarcodeTopRef.value) {
        try { JsBarcode(batchBarcodeTopRef.value, tn, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0 }) } catch {}
      }
      if (batchBarcodeBottomRef.value) {
        try { JsBarcode(batchBarcodeBottomRef.value, tn, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 2, textMargin: 1 }) } catch {}
      }
      if (batchQrcodeRef.value) {
        try {
          QRCode.toCanvas(batchQrcodeRef.value, tn, { width: 64, margin: 0, color: { dark: '#000000', light: '#ffffff' } })
        } catch {}
      }
    }
    updateBatchPreviewScale()
  })
}

// Watch preview index change to refresh barcodes
watch(previewIndex, () => refreshBatchPreview())
watch(currentPreviewItem, () => refreshBatchPreview())

// 表格行选择变化
const handleSelectionChange = (rows: OrderItem[]) => {
  const currentPageIds = new Set(paginatedItems.value.map(r => r.id))
  const otherPageSelected = selectedRows.value.filter(r => !currentPageIds.has(r.id))
  selectedRows.value = [...otherPageSelected, ...rows]
}

// 判断当页是否全选
const isCurrentPageAllSelected = computed(() => {
  if (paginatedItems.value.length === 0) return false
  return paginatedItems.value.every(row => selectedRows.value.some(s => s.id === row.id))
})

// 判断是否全选所有
const isAllSelected = computed(() => {
  if (orderItems.value.length === 0) return false
  return selectedRows.value.length === orderItems.value.length
})

// 切换选当页 / 取消当页
const toggleSelectCurrentPage = () => {
  if (!orderTableRef.value) return
  if (isCurrentPageAllSelected.value) {
    // 取消当页
    paginatedItems.value.forEach(row => {
      orderTableRef.value!.toggleRowSelection(row, false)
    })
  } else {
    // 选当页
    paginatedItems.value.forEach(row => {
      orderTableRef.value!.toggleRowSelection(row, true)
    })
  }
}

// 切换全选 / 取消全选
const toggleSelectAll = () => {
  if (!orderTableRef.value) return
  if (isAllSelected.value) {
    // 取消全部
    orderTableRef.value.clearSelection()
    selectedRows.value = []
  } else {
    // 全选所有
    selectedRows.value = [...orderItems.value]
    paginatedItems.value.forEach(row => {
      orderTableRef.value!.toggleRowSelection(row, true)
    })
    ElMessage.success(`已全选 ${orderItems.value.length} 个订单`)
  }
}

const handlePageChange = () => {
  nextTick(() => {
    if (!orderTableRef.value) return
    paginatedItems.value.forEach(row => {
      if (selectedRows.value.some(s => s.id === row.id)) {
        orderTableRef.value!.toggleRowSelection(row, true)
      }
    })
  })
}

// 批量应用物流公司
const applyBatchLogistics = async () => {
  if (!batchLogisticsCode.value) return
  const targets = selectedRows.value.length > 0 ? selectedRows.value : orderItems.value
  targets.forEach(item => {
    item.logisticsCode = batchLogisticsCode.value
    if (autoMatchTemplate.value) {
      const matched = getTemplateByCompany(batchLogisticsCode.value)
      if (matched) item.templateId = matched.id
    }
  })
  const count = targets.length
  const name = getCompanyName(batchLogisticsCode.value)
  ElMessage.success(`已为 ${count} 个订单设置物流公司：${name}`)
  // 自动检查打单支持
  await checkAllItemsSupport()
}

// 批量应用面单模板
const applyBatchTemplate = () => {
  if (!defaultTemplateId.value) return
  const targets = selectedRows.value.length > 0 ? selectedRows.value : orderItems.value
  targets.forEach(item => {
    item.templateId = defaultTemplateId.value
  })
  const tplName = getTemplateName(defaultTemplateId.value)
  ElMessage.success(`已为 ${targets.length} 个订单设置面单模板：${tplName}`)
}

// 🔥 运单号输入框失焦时自动保存到数据库（手动输入场景）
const onTrackingBlur = async (item: OrderItem) => {
  if (item.trackingNumber && item.logisticsCode && item.id) {
    await batchSaveTrackingToDB([item])
  }
}

const fetchSingleTrackingNumber = async (item: OrderItem) => {
  if (!item.logisticsCode) {
    ElMessage.warning('请先选择物流公司')
    return
  }
  item._fetchingTN = true
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const checkResult = await logisticsApi.checkCreateOrderSupport(item.logisticsCode)
    if (!checkResult.supported) {
      ElMessage.warning(`${checkResult.companyName || item.logisticsCode}不支持自动生成运单号，请手动输入`)
      item.printSupported = false
      item.printSupportReason = checkResult.reason || '不支持'
      return
    }
    const result = await logisticsApi.createOrder(item.logisticsCode, {
      orderNo: item.orderNo,
      receiverName: item.customerName,
      receiverPhone: item.phone,
      receiverAddress: item.address,
    })
    if (result.success && result.trackingNumber) {
      item.trackingNumber = result.trackingNumber
      item.printSupported = true
      ElMessage.success(`订单 ${item.orderNo} 运单号获取成功：${result.trackingNumber}`)
      // 🔥 立即保存运单号到数据库（不改变订单状态）
      await batchSaveTrackingToDB([item])
      refreshBatchPreview()
    } else {
      ElMessage.error(`订单 ${item.orderNo} 获取运单号失败：${result.message || '未知错误'}`)
    }
  } catch (e: any) {
    ElMessage.error(`订单 ${item.orderNo} 获取运单号异常：${e?.message || '网络错误'}`)
  } finally {
    item._fetchingTN = false
  }
}

// 批量获取运单号（只处理有物流公司但没有运单号的订单）
const fetchAllTrackingNumbers = async () => {
  const targets = orderItems.value.filter(item => item.logisticsCode && !item.trackingNumber)
  if (targets.length === 0) {
    ElMessage.info('所有订单已有运单号')
    return
  }

  fetchingAllTN.value = true
  let successCount = 0
  let failCount = 0

  try {
    const { logisticsApi } = await import('@/api/logistics')
    for (const item of targets) {
      item._fetchingTN = true
      try {
        // 先检查缓存中的支持状态
        if (item.printSupported === false) {
          failCount++
          continue
        }
        const checkResult = await checkLogisticsSupport(item.logisticsCode)
        if (!checkResult.supported) {
          item.printSupported = false
          item.printSupportReason = checkResult.reason
          failCount++
          continue
        }
        const result = await logisticsApi.createOrder(item.logisticsCode, {
          orderNo: item.orderNo,
          receiverName: item.customerName,
          receiverPhone: item.phone,
          receiverAddress: item.address,
        })
        if (result.success && result.trackingNumber) {
          item.trackingNumber = result.trackingNumber
          item.printSupported = true
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      } finally {
        item._fetchingTN = false
      }
    }

    if (successCount > 0) {
      refreshBatchPreview()
      // 🔥 批量保存所有成功获取的运单号到数据库（不改变订单状态）
      const itemsToSave = orderItems.value.filter(item => item.trackingNumber && item.logisticsCode)
      await batchSaveTrackingToDB(itemsToSave)
    }
    if (failCount === 0) {
      ElMessage.success(`全部 ${successCount} 个订单运单号获取成功！`)
    } else {
      ElMessage.warning(`成功 ${successCount} 个，失败 ${failCount} 个。失败的订单请手动输入运单号。`)
    }
  } finally {
    fetchingAllTN.value = false
  }
}

// 加载物流公司
const loadLogisticsCompanies = async () => {
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const res = await logisticsApi.getActiveCompanies()
    const list = res?.success && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res as any[] : [])
    logisticsCompanies.value = list.map((item: any) => ({ code: item.code, name: item.name }))
  } catch {
    logisticsCompanies.value = [
      { code: 'SF', name: '顺丰速运' }, { code: 'ZTO', name: '中通快递' },
      { code: 'YTO', name: '圆通速递' }, { code: 'STO', name: '申通快递' },
      { code: 'YD', name: '韵达速递' }, { code: 'JD', name: '京东物流' },
      { code: 'EMS', name: '中国邮政' }, { code: 'JTSD', name: '极兔速递' },
    ]
  }
}

const loadCompanyInfo = async () => {
  try {
    // 🔥 优先从寄件人地址管理获取默认寄件人
    const { senderAddressApi } = await import('@/api/senderAddress')
    const senderRes = await senderAddressApi.getDefault('sender')
    if (senderRes?.data) {
      companyInfo.value = {
        senderName: senderRes.data.name || '客服中心',
        senderPhone: senderRes.data.phone || '',
        senderAddress: senderRes.data.fullAddress || senderRes.data.address || '',
      }
      return
    }
  } catch { /* fallback to basic settings */ }
  try {
    const { apiService } = await import('@/services/apiService')
    const res = await apiService.get('/system/basic-settings')
    if (res?.data) {
      companyInfo.value = {
        senderName: res.data.companyName || '客服中心',
        senderPhone: res.data.contactPhone || '',
        senderAddress: res.data.companyAddress || '',
      }
    }
  } catch { /* use defaults */ }
}

// 初始化订单列表
const initOrderItems = () => {
  orderItems.value = props.orders.map(order => {
    const logisticsCode = order.expressCompany || order.designatedExpress || ''
    let templateId = defaultTemplateId.value
    if (autoMatchTemplate.value && logisticsCode) {
      const matched = getTemplateByCompany(logisticsCode)
      if (matched) templateId = matched.id
    }

    const products = Array.isArray(order.products) ? order.products : []
    const trackingNumber = order.expressNo || order.trackingNumber || ''
    return {
      id: order.id,
      orderNo: order.orderNo || order.orderNumber || '',
      customerName: order.customerName || '',
      phone: order.phone || order.customerPhone || '',
      address: order.address || order.receiverAddress || '',
      productsText: products.map((p: any) => `${p.name}×${p.quantity}`).join('、') || '-',
      products,
      totalAmount: order.totalAmount || 0,
      codAmount: order.codAmount || 0,
      deposit: order.deposit || 0,
      remark: order.remark || '',
      createTime: order.createTime || '',
      serviceWechat: order.serviceWechat || '',
      logisticsCode,
      trackingNumber,
      templateId,
      expressCompany: order.expressCompany,
      designatedExpress: order.designatedExpress,
      expressNo: order.expressNo,
      // 已有运单号的直接标为支持
      printSupported: trackingNumber ? true : null,
      printSupportReason: '',
    }
  })
}

// 全部预览
const handlePreviewAll = async () => {
  const items = printableItems.value
  if (items.length === 0) {
    ElMessage.warning('没有就绪可预览的面单（需要物流公司+运单号）')
    return
  }
  // 校验运单号-物流公司匹配
  if (!(await validateItemsBeforePrint(items))) return

  // 🔥 预览前先保存所有运单号到数据库（不改变订单状态）
  await batchSaveTrackingToDB(items)

  const config = getConfigWithTemplatePaper(items)
  const labels = items.map(item => {
    const tpl = allTemplates.value.find(t => t.id === item.templateId)
    return orderToLabelData(item, companyInfo.value, {
    logisticsCompany: getCompanyName(item.logisticsCode),
    logisticsCode: item.logisticsCode,
    trackingNumber: item.trackingNumber,
    showProducts: showProducts.value,
    showRemark: showRemark.value,
    showCodAmount: showCodAmount.value,
    privacyMode: tpl?.privacyMode || 'partial',
    namePrivacy: tpl?.namePrivacy || 'full',
    addressPrivacy: tpl?.addressPrivacy || 'full',
  })
  })
  const previewWin = await previewLabels(labels, config, 'grid', currentPrintMode.value)
  if (!previewWin) return

  // LODOP打印请求处理函数
  const handleLodopPrintRequest = async () => {
    if (currentPrintMode.value !== 'lodop' || getLodopStatus() !== 'connected') {
      const errMsg = { type: 'lodop-print-result', success: false, message: 'LODOP未连接' }
      try { previewWin.postMessage(errMsg, '*') } catch {}
      return
    }
    const printerName = lodopPrinterName.value || getDefaultLodopPrinter()
    const labelsReady = await Promise.all(labels.map(l => prepareLabelCodes(l)))
    const htmlLabels = labelsReady.map(l => generateLabelHTML(l, config))
    const fullHtml = generateLodopFullHTML(htmlLabels, config)
    const ok = lodopPrintHTML({
      printerName,
      paperWidth: config.paperWidth,
      paperHeight: config.paperHeight,
      htmlContent: fullHtml,
      title: `批量面单 ${items.length} 张`,
      preview: false,
    })
    const resultMsg = { type: 'lodop-print-result', success: ok, message: ok ? '' : 'LODOP打印失败' }
    try { previewWin.postMessage(resultMsg, '*') } catch {}
  }

  // 监听预览窗口打印完成消息（BroadcastChannel + postMessage + 窗口关闭备用检测）
  let handled = false
  const handlePrintDone = async () => {
    if (handled) return
    handled = true
    if (printChannel) { printChannel.onmessage = null; printChannel.close() }
    window.removeEventListener('message', onPostMessage)
    window.removeEventListener('focus', onWindowFocus)
    if (closeCheckTimer) clearInterval(closeCheckTimer)

    // 弹出确认是否已发货
    try {
      await ElMessageBox.confirm(
        `预览窗口已执行打印 ${items.length} 张面单，打印机是否已成功打印？\n确认后将把对应订单标记为【已发货】。`,
        '确认打印结果',
        {
          type: 'success',
          confirmButtonText: '✅ 已成功打印，标记发货',
          cancelButtonText: '❌ 未打印 / 打印失败',
          distinguishCancelAndClose: true,
        }
      )
      // 确认已打印 → 更新订单状态
      const printedData: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }> = []
      const { orderApi } = await import('@/api/order')
      const { useOrderStore } = await import('@/stores/order')
      const orderStore = useOrderStore()
      const now = new Date().toISOString()

      for (const item of items) {
        try {
          await orderApi.update(item.id, {
            status: 'shipped',
            trackingNumber: item.trackingNumber,
            expressCompany: item.logisticsCode,
            shippedAt: now,
          })
          orderStore.updateOrder(item.id, {
            status: 'shipped',
            trackingNumber: item.trackingNumber,
            expressNo: item.trackingNumber,
            expressCompany: item.logisticsCode,
            shippedAt: now,
          })
          printedData.push({
            orderId: item.id,
            trackingNumber: item.trackingNumber,
            logisticsCompany: item.logisticsCode,
          })
        } catch (e) {
          console.warn(`订单${item.orderNo}更新状态失败:`, e)
        }
      }

      emit('printed', printedData)
      ElMessage.success(`成功打印 ${items.length} 张面单，${printedData.length} 个订单已标记为已发货`)
      handleClose()
    } catch {
      ElMessage.info('运单号已保存，订单状态未变更。可稍后通过"确认发货"按钮完成发货确认')
    }
  }

  // 通道1: BroadcastChannel
  let printChannel: BroadcastChannel | null = null
  try {
    printChannel = new BroadcastChannel('crm-label-print')
    printChannel.onmessage = (ev) => {
      if (ev.data?.type === 'label-print-done') handlePrintDone()
    }
  } catch { /* 不支持 BroadcastChannel */ }

  // 通道2: postMessage
  const onPostMessage = (event: MessageEvent) => {
    if (event.data?.type === 'label-print-done') handlePrintDone()
    if (event.data?.type === 'lodop-print-request') handleLodopPrintRequest()
  }
  window.addEventListener('message', onPostMessage)

  // 通道3（备用）: 轮询检测预览窗口关闭
  let closeCheckTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (previewWin.closed && !handled) {
      if (closeCheckTimer) clearInterval(closeCheckTimer)
      closeCheckTimer = null
      setTimeout(() => {
        if (!handled) handlePrintDone()
      }, 500)
    }
  }, 1000)

  // 通道4（备用）: 用户切回主窗口时检测
  const onWindowFocus = () => {
    setTimeout(() => {
      if (!handled && previewWin.closed) {
        handlePrintDone()
      }
    }, 300)
  }
  window.addEventListener('focus', onWindowFocus)
}

// 批量打印
const handleBatchPrint = async () => {
  const items = printableItems.value
  if (items.length === 0) {
    ElMessage.warning('没有就绪的面单（需要物流公司+运单号）')
    return
  }

  // 检查是否有没有运单号的订单
  const itemsWithoutTN = items.filter(i => !i.trackingNumber)
  if (itemsWithoutTN.length > 0) {
    ElMessage.warning(`还有 ${itemsWithoutTN.length} 个订单没有运单号，请先获取或手动填入运单号`)
    return
  }

  // 校验运单号-物流公司匹配
  if (!(await validateItemsBeforePrint(items))) return

  const printModeText = currentPrintMode.value === 'lodop' ? 'LODOP控件' : currentPrintMode.value === 'usb' ? 'USB直连' : '浏览器打印'
  await ElMessageBox.confirm(
    `确认打印 ${items.length} 张面单吗？\n每张打印 ${printCopies.value} 份\n打印方式：${printModeText}\n\n注意：打印完成后需确认才会标记发货`,
    '确认批量打印',
    { type: 'info', confirmButtonText: '确认打印', cancelButtonText: '取消' }
  )

  // 🔥 打印前，先确保所有运单号已保存到数据库（不改变订单状态）
  await batchSaveTrackingToDB(items)

  printing.value = true
  try {
    const config = getConfigWithTemplatePaper(items)
    const labels = items.flatMap(item => {
      const tpl = allTemplates.value.find(t => t.id === item.templateId)
      const labelData = orderToLabelData(item, companyInfo.value, {
        logisticsCompany: getCompanyName(item.logisticsCode),
        logisticsCode: item.logisticsCode,
        trackingNumber: item.trackingNumber,
        showProducts: showProducts.value,
        showRemark: showRemark.value,
        showCodAmount: showCodAmount.value,
        privacyMode: tpl?.privacyMode || 'partial',
        namePrivacy: tpl?.namePrivacy || 'full',
        addressPrivacy: tpl?.addressPrivacy || 'full',
      })
      return Array.from({ length: printCopies.value }, () => labelData)
    })

    let printResult: 'printed' | 'cancelled' = 'cancelled'

    // 根据打印模式选择打印方式
    if (currentPrintMode.value === 'lodop' && getLodopStatus() === 'connected') {
      // LODOP 打印（包含完整CSS样式）
      const labelsReady = await Promise.all(labels.map(l => prepareLabelCodes(l)))
      const htmlLabels = labelsReady.map(l => generateLabelHTML(l, config))
      const fullHtml = generateLodopFullHTML(htmlLabels, config)
      const printerName = lodopPrinterName.value || getDefaultLodopPrinter()
      const ok = lodopPrintHTML({
        printerName,
        paperWidth: config.paperWidth,
        paperHeight: config.paperHeight,
        htmlContent: fullHtml,
        title: `批量面单 ${items.length} 张`,
        preview: false,
      })
      printResult = ok ? 'printed' : 'cancelled'
      if (!ok) {
        ElMessage.error('LODOP打印失败，请检查LODOP连接状态')
        return
      }
    } else {
      // 浏览器打印
      printResult = await printLabels(labels, config)
    }

    if (printResult === 'cancelled') {
      ElMessage.warning('打印窗口打开失败，请检查浏览器弹窗设置')
      return
    }

    // 打印对话框已关闭，询问用户是否真正执行了打印
    try {
      await ElMessageBox.confirm(
        `打印机是否已成功打印 ${items.length} 张面单？\n确认后将把对应订单标记为【已发货】并上传运单号。`,
        '确认打印结果',
        {
          type: 'success',
          confirmButtonText: '✅ 已成功打印，标记发货',
          cancelButtonText: '❌ 未打印 / 打印失败',
          distinguishCancelAndClose: true,
        }
      )
    } catch (action) {
      ElMessage.info('运单号已保存，订单状态未变更。可稍后通过列表"已传单号待确认发货"按钮完成发货确认')
      return
    }

    // 用户确认已打印，更新订单状态
    const printedData: Array<{ orderId: string; trackingNumber: string; logisticsCompany: string }> = []
    const { orderApi } = await import('@/api/order')
    const { useOrderStore } = await import('@/stores/order')
    const orderStore = useOrderStore()
    const now = new Date().toISOString()

    for (const item of items) {
      try {
        await orderApi.update(item.id, {
          status: 'shipped',
          trackingNumber: item.trackingNumber,
          expressCompany: item.logisticsCode,
          shippedAt: now,
        })
        orderStore.updateOrder(item.id, {
          status: 'shipped',
          trackingNumber: item.trackingNumber,
          expressNo: item.trackingNumber,
          expressCompany: item.logisticsCode,
          shippedAt: now,
        })
        printedData.push({
          orderId: item.id,
          trackingNumber: item.trackingNumber,
          logisticsCompany: item.logisticsCode,
        })
      } catch (e) {
        console.warn(`订单${item.orderNo}更新状态失败:`, e)
      }
    }

    emit('printed', printedData)
    ElMessage.success(`成功打印 ${items.length} 张面单，${printedData.length} 个订单已标记为已发货`)
    handleClose()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('批量打印失败:', e)
      ElMessage.error('批量打印失败，请重试')
    }
  } finally {
    printing.value = false
  }
}

// 初始化
watch(() => props.visible, async (val) => {
  if (val) {
    printerList.value = getSavedPrinters()
    selectedPrinterId.value = getDefaultPrinter().id
    defaultTemplateId.value = getLastUsedTemplateId()
    allTemplates.value = getAllTemplates()
    previewIndex.value = 0
    currentPage.value = 1
    batchLogisticsCode.value = ''
    selectedRows.value = []
    logisticsSupportCache.value = {}
    // 加载默认打印模式
    currentPrintMode.value = getDefaultPrintMode()
    lodopPrinterName.value = getDefaultLodopPrinter()
    await loadLogisticsCompanies()
    await loadCompanyInfo()
    initOrderItems()
    // 自动检查所有订单的打单支持
    await checkAllItemsSupport()
    nextTick(() => refreshBatchPreview())
  }
})

// 打印机配置弹窗关闭后刷新打印模式
watch(printerConfigVisible, (val) => {
  if (!val) {
    printerList.value = getSavedPrinters()
    currentPrintMode.value = getDefaultPrintMode()
    lodopPrinterName.value = getDefaultLodopPrinter()
    selectedPrinterId.value = getDefaultPrinter().id
  }
})

onMounted(() => {
  printerList.value = getSavedPrinters()
})

const handleClose = () => {
  // 🔥 关闭前保存所有有运单号但可能未保存的订单
  const unsavedItems = orderItems.value.filter(
    item => item.trackingNumber && item.logisticsCode && item.id
  )
  if (unsavedItems.length > 0) {
    batchSaveTrackingToDB(unsavedItems)
  }
  dialogVisible.value = false
}
</script>

<style scoped>
.dialog-header-with-help {
  display: flex;
  align-items: center;
  gap: 8px;
}
.help-icon-btn {
  padding: 2px;
  margin-left: 4px;
}

.batch-print-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.batch-content { font-size: 14px; }

.section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #303133; margin: 0;
}

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;
}

/* 批量设置 */
.batch-settings {
  background: #f8f9fa; padding: 16px; border-radius: 10px; margin-bottom: 16px;
}
.batch-settings .section-title { margin-bottom: 12px; }
.settings-grid { display: flex; flex-direction: column; gap: 10px; }
.setting-row { display: flex; gap: 20px; align-items: center; }
.setting-item { display: flex; align-items: center; gap: 8px; flex: 1; }
.setting-item label { font-weight: 500; color: #606266; min-width: 70px; white-space: nowrap; }
.setting-select { width: 180px; }
.setting-options { display: flex; align-items: center; gap: 14px; flex: 1; }
.printer-mode-text { font-size: 13px; color: #409eff; font-weight: 500; }

/* 订单列表 */
.orders-section { margin-bottom: 16px; }
.title-with-actions { display: flex; align-items: center; gap: 8px; }
.status-summary { display: flex; gap: 8px; }
.template-name { font-size: 12px; color: #606266; }
.header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.select-actions { display: flex; gap: 6px; }
.selection-info { font-size: 12px; color: #409eff; font-weight: 500; }
.pagination-wrapper {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 10px; padding: 0 4px;
}

/* 占位符样式 */
.sl-batch .barcode-placeholder {
  height: 50px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #999; border: 1px dashed #ccc; margin: 4px auto;
  max-width: 90%;
}
.sl-batch .barcode-placeholder-sm {
  height: 30px; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #999; border: 1px dashed #ccc;
}
.sl-batch .qrcode-placeholder {
  width: 64px; height: 64px; flex-shrink: 0;
  border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: #999;
}

/* 预览区 */
.preview-section { background: #f8f9fa; padding: 16px; border-radius: 10px; }
.preview-nav { display: flex; align-items: center; gap: 10px; }
.nav-info { font-size: 13px; color: #606266; font-weight: 500; }

.preview-wrapper {
  background: #e8e8e8; border-radius: 8px; padding: 16px;
  display: flex; justify-content: center; min-height: 160px;
  overflow: auto; max-height: 400px;
}
.preview-label { display: inline-block; }
.preview-scaler { transition: transform 0.2s; }

/* 面单仿真样式 */
.sl-batch {
  background: #fff; border: 2px solid #000;
  padding: 8px 10px; font-family: 'Microsoft YaHei','PingFang SC',Arial,sans-serif;
  font-size: 11px; color: #000; box-sizing: border-box;
}
.sl-batch .sl-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 6px;
}
.sl-batch .sl-company { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
.sl-batch .sl-route-code {
  font-size: 28px; font-weight: 900; letter-spacing: 3px;
  border: 3px solid #000; padding: 2px 10px; border-radius: 4px;
  min-width: 80px; text-align: center; line-height: 1.1;
}
.sl-batch .sl-barcode-top {
  text-align: center; border-bottom: 2px solid #000;
  padding: 4px 0 6px 0; margin-bottom: 6px;
}
.sl-batch .batch-barcode-top-svg { max-width: 90%; height: 50px; }
.sl-batch .sl-tracking-no { font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-top: 2px; }
.sl-batch .sl-addr-block { border-bottom: 1.5px solid #000; padding: 5px 0; margin-bottom: 4px; }
.sl-batch .sl-addr-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }
.sl-batch .sl-tag {
  font-size: 13px; font-weight: 900; padding: 2px 8px; border-radius: 3px; color: #fff;
  flex-shrink: 0; display: inline-block; letter-spacing: 1px;
}
.sl-batch .sl-tag-recv { background: #1a1a1a; color: #fff; }
.sl-batch .sl-tag-send { background: #2b6cb0; color: #fff; }
.sl-batch .sl-name { font-size: 16px; font-weight: 700; }
.sl-batch .sl-phone { font-size: 13px; color: #333; }
.sl-batch .sl-name-sm { font-size: 12px; }
.sl-batch .sl-phone-sm { font-size: 11px; color: #666; }
.sl-batch .sl-addr-detail { font-size: 13px; line-height: 1.5; padding-left: 28px; }
.sl-batch .sl-addr-detail-sm { font-size: 11px; color: #444; padding-left: 28px; }
.sl-batch .sl-send { border-bottom: 1px dashed #999; }
.sl-batch .sl-info-row {
  border-bottom: 1px dashed #aaa; padding: 3px 0; font-size: 11px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sl-batch .sl-cod { font-size: 14px; color: #c00; }
.sl-batch .sl-remark span { color: #c00; }
.sl-batch .sl-bottom {
  display: flex; align-items: flex-start; gap: 8px;
  padding-top: 6px; margin-top: 4px; border-top: 2px solid #000;
}
.sl-batch .sl-qrcode { width: 64px; height: 64px; flex-shrink: 0; }
.sl-batch .sl-bottom-right { flex: 1; overflow: hidden; }
.sl-batch .batch-barcode-btm-svg { max-width: 100%; height: auto; max-height: 50px; display: block; }
.sl-batch .sl-order-info { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 2px; }
.sl-batch .sl-time { color: #999; }
.sl-batch .sl-sign {
  border-top: 1px dashed #999; padding-top: 4px; margin-top: 4px;
  font-size: 11px; color: #666;
}

.preview-empty { display: flex; align-items: center; justify-content: center; width: 100%; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 10px; }
</style>

