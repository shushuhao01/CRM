<template>
  <el-dialog
    v-model="dialogVisible"
    width="800px"
    :before-close="handleClose"
    class="print-label-dialog"
    top="3vh"
  >
    <template #header>
      <div class="dialog-header-with-help">
        <span class="el-dialog__title">打印面单 - {{ order?.orderNo || '' }} {{ order?.customerName || '' }}</span>
        <el-tooltip content="查看发货打单指南" placement="bottom">
          <el-button link type="primary" class="help-icon-btn" @click="goToHelp">
            <el-icon :size="18"><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    <div v-if="order" class="print-content">
      <!-- 打印设置区 -->
      <div class="print-settings">
        <h4 class="section-title"><el-icon><Setting /></el-icon> 打印设置</h4>
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
              <label>面单模板：</label>
              <el-select v-model="selectedTemplateId" placeholder="选择模板" class="setting-select" @change="onTemplateChange">
                <el-option
                  v-for="tpl in filteredTemplates"
                  :key="tpl.id"
                  :label="tpl.name"
                  :value="tpl.id"
                />
              </el-select>
              <el-button type="success" size="small" text @click="templateDialogVisible = true">
                <el-icon><Edit /></el-icon> 管理模板
              </el-button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-item">
              <label>物流公司：</label>
              <el-select v-model="logisticsCompanyCode" placeholder="选择物流公司" class="setting-select" filterable @change="onLogisticsCompanyChange">
                <el-option
                  v-for="c in logisticsCompanies"
                  :key="c.code"
                  :label="c.name"
                  :value="c.code"
                />
              </el-select>
            </div>
            <div class="setting-item">
              <label>运单号：</label>
              <el-input
                v-model="trackingNumber"
                placeholder="请输入或点击获取"
                class="setting-input"
                clearable
                @blur="onTrackingBlur"
              />
              <el-button
                type="success"
                size="small"
                :loading="fetchingTrackingNumber"
                :disabled="!logisticsCompanyCode"
                @click="fetchTrackingNumber"
              >
                <el-icon v-if="!fetchingTrackingNumber"><Download /></el-icon> 获取单号
              </el-button>
            </div>
          </div>
          <div class="setting-row">
            <div class="setting-item">
              <label>打印份数：</label>
              <el-input-number v-model="printCopies" :min="1" :max="10" size="default" />
            </div>
            <div class="setting-options">
              <el-checkbox v-model="showProducts">包含商品明细</el-checkbox>
              <el-checkbox v-model="showRemark">包含备注</el-checkbox>
              <el-checkbox v-model="showCodAmount">显示代收款</el-checkbox>
            </div>
          </div>
        </div>
        <!-- 运单号校验警告 -->
        <el-alert
          v-if="trackingValidationWarning"
          type="warning"
          :title="trackingValidationWarning"
          :closable="false"
          show-icon
          style="margin-top: 10px;"
        />
      </div>
      <div class="label-preview-section">
        <div class="preview-header">
          <h4 class="section-title"><el-icon><View /></el-icon> 面单预览</h4>
          <span class="paper-size-info">纸张尺寸：{{ currentTemplate?.paperSize?.replace('x', '×') || currentPrinter?.paperSize?.replace('x', '×') || '100×180' }}mm</span>
        </div>
        <div class="preview-wrapper" ref="previewWrapperRef">
          <div class="preview-scaler" :style="{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }">
            <!-- ========= 仿真面单 ========= -->
            <div class="sl" :style="{ width: labelWidthMM + 'mm' }">
              <!-- 第一行：物流公司名 + 目的地路由码 -->
              <div class="sl-header">
                <div class="sl-company">{{ logisticsCompanyName || '物流公司' }}</div>
                <el-tooltip :content="`路由码（大头笔）：根据收件地址自动生成。${routeCode} 表示目的地简码`" placement="top">
                  <div class="sl-route-code">{{ routeCode }}</div>
                </el-tooltip>
              </div>
              <!-- 第二行：路由条形码（大条码） -->
              <div class="sl-barcode-top">
                <svg v-show="trackingNumber" ref="barcodeTopRef"></svg>
                <div v-show="!trackingNumber" class="barcode-placeholder">待生成物流单号</div>
                <div class="sl-tracking-no">{{ trackingNumber || '待生成物流单号' }}</div>
              </div>
              <!-- 收件人 -->
              <div class="sl-addr-block sl-recv">
                <div class="sl-addr-row">
                  <span class="sl-tag sl-tag-recv">收</span>
                  <span class="sl-name">{{ maskedReceiverName }}</span>
                  <span class="sl-phone">{{ maskedReceiverPhone }}</span>
                </div>
                <div class="sl-addr-detail">{{ maskedReceiverAddress }}</div>
              </div>
              <!-- 寄件人 -->
              <div v-if="currentTemplate?.showSenderInfo !== false" class="sl-addr-block sl-send">
                <div class="sl-addr-row">
                  <span class="sl-tag sl-tag-send">寄</span>
                  <span class="sl-name-sm">{{ companyInfo.senderName }}</span>
                  <span class="sl-phone-sm">{{ maskedSenderPhone }}</span>
                </div>
                <div class="sl-addr-detail-sm">{{ companyInfo.senderAddress }}</div>
              </div>
              <!-- 商品信息 -->
              <div v-if="showProducts" class="sl-info-row">
                <b>商品：</b>{{ productsText }}
              </div>
              <!-- 代收款 -->
              <div v-if="showCodAmount && order.codAmount > 0" class="sl-info-row sl-cod">
                <b>代收款：¥{{ formatNumber(order.codAmount) }}</b>
              </div>
              <!-- 备注 -->
              <div v-if="showRemark && order.remark" class="sl-info-row sl-remark">
                <b>备注：</b><span>{{ order.remark }}</span>
              </div>
              <!-- 底部：二维码 + 底部条形码 + 订单号 -->
              <div class="sl-bottom">
                <canvas v-show="trackingNumber" ref="qrcodeRef" class="sl-qrcode" width="64" height="64"></canvas>
                <div v-show="!trackingNumber" class="sl-qrcode qrcode-placeholder">待生成</div>
                <div class="sl-bottom-right">
                  <svg v-show="trackingNumber" ref="barcodeBottomRef" class="sl-barcode-btm-svg"></svg>
                  <div v-show="!trackingNumber" class="barcode-placeholder-sm">待生成物流单号</div>
                  <div class="sl-order-info">
                    <span>订单号：{{ order.orderNo }}</span>
                    <span v-if="order.createTime" class="sl-time">{{ order.createTime }}</span>
                  </div>
                </div>
              </div>
              <!-- 签收区域 -->
              <div v-if="currentTemplate?.showSignArea" class="sl-sign">
                签收人/日期：________________
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="handlePreview" :disabled="!trackingNumber || !logisticsCompanyCode">
          <el-icon><View /></el-icon> 全屏预览
        </el-button>
        <el-button type="primary" @click="handlePrint" :loading="printing" :disabled="!trackingNumber || !logisticsCompanyCode">
          <el-icon><Printer /></el-icon> 打印面单
        </el-button>
      </div>
    </template>

    <!-- 打印机配置弹窗 -->
    <PrinterConfigDialog v-model:visible="printerConfigVisible" />

    <!-- 模板管理弹窗 -->
    <LabelTemplateDialog
      v-model:visible="templateDialogVisible"
      :current-template-id="selectedTemplateId"
      @select="onTemplateSelected"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Edit, View, Printer, Download, QuestionFilled } from '@element-plus/icons-vue'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import {
  getSavedPrinters, getDefaultPrinter, maskPhone, PAPER_SIZES,
  printLabels, previewLabels, orderToLabelData, addressToRouteCode,
  getDefaultPrintMode, getDefaultLodopPrinter, validateTrackingCompanyMatch,
  prepareLabelCodes, generateLabelHTML, generateLodopFullHTML,
  type PrinterConfig
} from '@/utils/printService'
import {
  getLodopStatus, loadCLodop, getLodopPrinters, lodopPrintHTML,
  type LodopStatus
} from '@/utils/lodopService'
import {
  getAllTemplates, getTemplateByCompany, getLastUsedTemplateId, setLastUsedTemplateId,
  maskName, maskAddress, getDefaultTemplateId,
  type LabelTemplate
} from '@/utils/labelTemplates'
import PrinterConfigDialog from './PrinterConfigDialog.vue'
import LabelTemplateDialog from './LabelTemplateDialog.vue'

interface Props {
  visible: boolean
  order: any
}
interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'printed', data: { orderId: string; trackingNumber: string; logisticsCompany: string }): void
  (e: 'tracking-saved', data: { orderId: string; trackingNumber: string; logisticsCompany: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()


/**
 * 🔥 将运单号保存到数据库（不改变订单状态）
 * 无论打印成功还是失败，运单号都应先保存到数据库
 */
const saveTrackingToDB = async (tn: string, companyCode: string) => {
  if (!props.order?.id || !tn) return
  try {
    const { orderApi } = await import('@/api/order')
    await orderApi.update(props.order.id, {
      trackingNumber: tn,
      expressCompany: companyCode,
    })
    const { useOrderStore } = await import('@/stores/order')
    const orderStore = useOrderStore()
    orderStore.updateOrder(props.order.id, {
      trackingNumber: tn,
      expressNo: tn,
      expressCompany: companyCode,
    })
    console.log('[打印面单] 运单号已保存到数据库:', tn, companyCode)
    emit('tracking-saved', {
      orderId: props.order.id,
      trackingNumber: tn,
      logisticsCompany: companyCode,
    })
  } catch (e) {
    console.warn('[打印面单] 保存运单号到数据库失败:', e)
  }
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
const templateDialogVisible = ref(false)
const fetchingTrackingNumber = ref(false)
const templateRefreshKey = ref(0) // 用于触发模板列表刷新

// 打印模式
const currentPrintMode = ref<'browser' | 'lodop' | 'usb'>('browser')
const lodopPrinterName = ref('')
const trackingValidationWarning = ref('')

// 打印设置
const selectedPrinterId = ref('')
const selectedTemplateId = ref(getDefaultTemplateId() || getLastUsedTemplateId() || 'universal-standard')
const logisticsCompanyCode = ref('')
const trackingNumber = ref('')
const printCopies = ref(1)
const showProducts = ref(true)
const showRemark = ref(false)
const showCodAmount = ref(true)

// 数据
const printerList = ref<PrinterConfig[]>([])
const logisticsCompanies = ref<Array<{ code: string; name: string }>>([])

// Refs
const previewWrapperRef = ref<HTMLDivElement | null>(null)
const barcodeTopRef = ref<SVGSVGElement | null>(null)
const barcodeBottomRef = ref<SVGSVGElement | null>(null)
const qrcodeRef = ref<HTMLCanvasElement | null>(null)
const previewScale = ref(0.8)
let resizeObserver: ResizeObserver | null = null

// 纸张尺寸：优先从模板获取
const labelWidthMM = computed(() => {
  const tpl = currentTemplate.value
  if (tpl?.paperSize) {
    const tplPaper = PAPER_SIZES[tpl.paperSize]
    if (tplPaper) return tplPaper.width
  }
  const paper = PAPER_SIZES[currentPrinter.value?.paperSize || '100x180'] || PAPER_SIZES['100x180']
  return paper.width
})

// 公司信息
const companyInfo = ref({
  senderName: '客服中心',
  senderPhone: '01012345678',
  senderAddress: '北京市朝阳区科技园区xxx号',
})

// 计算属性
const currentPrinter = computed<PrinterConfig | undefined>(() => {
  return printerList.value.find(p => p.id === selectedPrinterId.value)
})

const currentTemplate = computed<LabelTemplate | undefined>(() => {
  templateRefreshKey.value // 依赖触发器
  return getAllTemplates().find(t => t.id === selectedTemplateId.value)
})

const filteredTemplates = computed(() => {
  templateRefreshKey.value // 依赖触发器
  const all = getAllTemplates()
  if (!logisticsCompanyCode.value) return all
  return [...all].sort((a, b) => {
    const aMatch = a.companyCode === logisticsCompanyCode.value || a.companyCode === 'universal'
    const bMatch = b.companyCode === logisticsCompanyCode.value || b.companyCode === 'universal'
    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return 0
  })
})

const logisticsCompanyName = computed(() => {
  const c = logisticsCompanies.value.find(c => c.code === logisticsCompanyCode.value)
  return c?.name || logisticsCompanyCode.value || ''
})

const maskedReceiverPhone = computed(() => {
  const mode = currentTemplate.value?.privacyMode || 'partial'
  return maskPhone(props.order?.phone || props.order?.customerPhone || '', mode)
})

const maskedReceiverName = computed(() => {
  const mode = currentTemplate.value?.namePrivacy || 'full'
  return maskName(props.order?.customerName || '', mode)
})

const maskedReceiverAddress = computed(() => {
  const mode = currentTemplate.value?.addressPrivacy || 'full'
  return maskAddress(props.order?.address || props.order?.receiverAddress || '', mode)
})

const maskedSenderPhone = computed(() => {
  const mode = currentTemplate.value?.privacyMode || 'partial'
  return maskPhone(companyInfo.value.senderPhone, mode)
})

const productsText = computed(() => {
  const products = props.order?.products
  if (!products || !Array.isArray(products)) return '-'
  return products.map((p: any) => `${p.name}×${p.quantity}`).join('、')
})

// 路由码（大头笔）：从收件地址中提取
const routeCode = computed(() => {
  const addr = props.order?.address || props.order?.receiverAddress || ''
  return addressToRouteCode(addr)
})

const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return num.toLocaleString()
}

// ===== 自适应缩放 =====
const updatePreviewScale = () => {
  if (!previewWrapperRef.value) return
  const containerW = previewWrapperRef.value.clientWidth - 40 // padding
  // 100mm ≈ 378px at 96dpi
  const labelPx = labelWidthMM.value * 3.78
  const s = containerW / labelPx
  previewScale.value = Math.min(s, 1.2)
}

// ===== 获取合并了模板纸张尺寸的打印配置 =====
const getConfigWithTemplatePaper = (): PrinterConfig => {
  const config = { ...(currentPrinter.value || getDefaultPrinter()) }
  const tpl = currentTemplate.value
  if (tpl?.paperSize && PAPER_SIZES[tpl.paperSize]) {
    config.paperSize = tpl.paperSize
    config.paperWidth = PAPER_SIZES[tpl.paperSize].width
    config.paperHeight = PAPER_SIZES[tpl.paperSize].height
  }
  return config
}

// ===== 校验运单号与物流公司是否匹配 =====
const validateBeforePrint = async (): Promise<boolean> => {
  if (!trackingNumber.value || !logisticsCompanyCode.value) {
    ElMessage.warning('请先填写运单号和选择物流公司')
    return false
  }
  const result = validateTrackingCompanyMatch(logisticsCompanyCode.value, trackingNumber.value)
  if (!result.valid) {
    try {
      await ElMessageBox.confirm(
        result.warning + '\n\n是否仍要继续？',
        '⚠️ 运单号与物流公司不匹配',
        {
          type: 'warning',
          confirmButtonText: '仍然继续',
          cancelButtonText: '返回修改',
          dangerouslyUseHTMLString: false,
        }
      )
      return true
    } catch {
      return false
    }
  }
  return true
}

// ===== 运单号变化时自动校验 =====
const checkTrackingValidation = () => {
  if (trackingNumber.value && logisticsCompanyCode.value) {
    const result = validateTrackingCompanyMatch(logisticsCompanyCode.value, trackingNumber.value)
    trackingValidationWarning.value = result.valid ? '' : result.warning
  } else {
    trackingValidationWarning.value = ''
  }
}

// 加载物流公司列表
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

// ===== 条形码 / 二维码生成 =====
const generateBarcodes = () => {
  const tn = trackingNumber.value
  if (!tn) return
  // 顶部大条形码
  if (barcodeTopRef.value) {
    try {
      JsBarcode(barcodeTopRef.value, tn, { format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0 })
    } catch (e) { console.warn('顶部条形码生成失败:', e) }
  }
  // 底部小条形码（🔥 width: 1.5, height: 40 提升扫码识别率）
  if (barcodeBottomRef.value) {
    try {
      JsBarcode(barcodeBottomRef.value, tn, { format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 2, textMargin: 1 })
    } catch (e) { console.warn('底部条形码生成失败:', e) }
  }
}

const generateQRCode = () => {
  if (!qrcodeRef.value) return
  const tn = trackingNumber.value
  if (!tn) return
  try {
    QRCode.toCanvas(qrcodeRef.value, tn, { width: 64, margin: 0, color: { dark: '#000000', light: '#ffffff' } })
  } catch (e) { console.warn('二维码生成失败:', e) }
}

const refreshPreview = () => {
  nextTick(() => {
    generateBarcodes()
    generateQRCode()
    updatePreviewScale()
  })
}

// 模板变更
const onTemplateChange = () => {
  if (selectedTemplateId.value) {
    setLastUsedTemplateId(selectedTemplateId.value)
    const tpl = currentTemplate.value
    if (tpl) {
      showProducts.value = tpl.showProducts
      showRemark.value = tpl.showRemark
      showCodAmount.value = tpl.showCodAmount
    }
  }
}

const onTemplateSelected = (tpl: LabelTemplate) => {
  selectedTemplateId.value = tpl.id
  showProducts.value = tpl.showProducts
  showRemark.value = tpl.showRemark
  showCodAmount.value = tpl.showCodAmount
  templateRefreshKey.value++ // 刷新模板列表
}

// 监听模板管理弹窗关闭，刷新模板列表
watch(templateDialogVisible, (val) => {
  if (!val) {
    templateRefreshKey.value++ // 弹窗关闭时刷新
  }
})

const handlePreview = async () => {
  if (!trackingNumber.value || !logisticsCompanyCode.value) {
    ElMessage.warning('请先填写运单号和选择物流公司')
    return
  }
  // 校验运单号-物流公司匹配
  if (!(await validateBeforePrint())) return

  // 🔥 预览前先保存运单号到数据库（不改变订单状态）
  await saveTrackingToDB(trackingNumber.value, logisticsCompanyCode.value)

  const config = getConfigWithTemplatePaper()
  const labelData = buildLabelData()
  const previewWin = await previewLabels([labelData], config, 'vertical', currentPrintMode.value)
  if (!previewWin) return

  // LODOP打印请求处理函数
  const handleLodopPrintRequest = async (data: any) => {
    if (currentPrintMode.value !== 'lodop' || getLodopStatus() !== 'connected') {
      // 回复预览窗口：LODOP不可用
      const errMsg = { type: 'lodop-print-result', success: false, message: 'LODOP未连接' }
      try { previewWin.postMessage(errMsg, '*') } catch {}
      return
    }
    const printerName = lodopPrinterName.value || getDefaultLodopPrinter()
    const labelsReady = await Promise.all([labelData].map(l => prepareLabelCodes(l)))
    const htmlLabels = labelsReady.map(l => generateLabelHTML(l, config))
    const fullHtml = generateLodopFullHTML(htmlLabels, config)
    const ok = lodopPrintHTML({
      printerName,
      paperWidth: config.paperWidth,
      paperHeight: config.paperHeight,
      htmlContent: fullHtml,
      title: `面单 - ${props.order?.orderNo || ''}`,
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
    // 清理所有监听
    if (printChannel) { printChannel.onmessage = null; printChannel.close() }
    window.removeEventListener('message', onPostMessage)
    window.removeEventListener('focus', onWindowFocus)
    if (closeCheckTimer) clearInterval(closeCheckTimer)

    // 弹出确认是否已发货
    try {
      await ElMessageBox.confirm(
        '预览窗口已执行打印，打印机是否已成功打印面单？\n确认后将把订单标记为【已发货】。',
        '确认打印结果',
        {
          type: 'success',
          confirmButtonText: '✅ 已成功打印，标记发货',
          cancelButtonText: '❌ 未打印 / 打印失败',
          distinguishCancelAndClose: true,
        }
      )
      // 确认已打印 → 更新订单状态
      try {
        const { orderApi } = await import('@/api/order')
        const now = new Date().toISOString()
        await orderApi.update(props.order.id, {
          status: 'shipped',
          trackingNumber: trackingNumber.value,
          expressCompany: logisticsCompanyCode.value,
          shippedAt: now,
        })
        const { useOrderStore } = await import('@/stores/order')
        const orderStore = useOrderStore()
        orderStore.updateOrder(props.order.id, {
          status: 'shipped',
          trackingNumber: trackingNumber.value,
          expressNo: trackingNumber.value,
          expressCompany: logisticsCompanyCode.value,
          shippedAt: now,
        })
      } catch (e) {
        console.warn('更新订单状态失败:', e)
      }
      emit('printed', {
        orderId: props.order.id,
        trackingNumber: trackingNumber.value,
        logisticsCompany: logisticsCompanyCode.value,
      })
      ElMessage.success('面单已打印，订单已标记为已发货')
      handleClose()
    } catch {
      ElMessage.info('运单号已保存，订单状态未变更。可稍后通过列表"更多→已传单号待确认发货"按钮完成发货确认')
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
    if (event.data?.type === 'lodop-print-request') handleLodopPrintRequest(event.data)
  }
  window.addEventListener('message', onPostMessage)

  // 通道3（备用）: 轮询检测预览窗口关闭
  let closeCheckTimer: ReturnType<typeof setInterval> | null = setInterval(() => {
    if (previewWin.closed && !handled) {
      if (closeCheckTimer) clearInterval(closeCheckTimer)
      closeCheckTimer = null
      // 延迟一下让 BroadcastChannel 消息先到达
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

// 获取运单号（通过物流API）
const fetchTrackingNumber = async () => {
  if (!logisticsCompanyCode.value) {
    ElMessage.warning('请先选择物流公司')
    return
  }
  if (trackingNumber.value) {
    try {
      await ElMessageBox.confirm(
        '当前已有运单号，重新获取将覆盖现有运单号。是否继续？',
        '提示',
        { type: 'warning', confirmButtonText: '重新获取', cancelButtonText: '取消' }
      )
    } catch {
      return
    }
  }
  fetchingTrackingNumber.value = true
  try {
    const { logisticsApi } = await import('@/api/logistics')
    const checkResult = await logisticsApi.checkCreateOrderSupport(logisticsCompanyCode.value)
    if (!checkResult.supported) {
      ElMessage.warning({
        message: checkResult.reason || `${checkResult.companyName || '该物流公司'}暂不支持自动获取运单号，请手动输入`,
        duration: 5000,
      })
      return
    }
    const result = await logisticsApi.createOrder(logisticsCompanyCode.value, {
      orderNo: props.order?.orderNo || '',
      receiverName: props.order?.customerName || '',
      receiverPhone: props.order?.phone || props.order?.customerPhone || '',
      receiverAddress: props.order?.address || props.order?.receiverAddress || '',
    })
    if (result.success && result.trackingNumber) {
      trackingNumber.value = result.trackingNumber
      ElMessage.success(`运单号获取成功：${result.trackingNumber}`)
      // 🔥 立即保存运单号到数据库（不改变订单状态）
      await saveTrackingToDB(result.trackingNumber, logisticsCompanyCode.value)
      refreshPreview()
    } else {
      ElMessage.error(`获取运单号失败：${result.message || '未知错误'}，请手动输入`)
    }
  } catch (e: any) {
    ElMessage.error(`获取运单号异常：${e?.message || '网络错误'}，请手动输入`)
  } finally {
    fetchingTrackingNumber.value = false
  }
}

const handlePrint = async () => {
  if (!logisticsCompanyCode.value) {
    ElMessage.warning('请选择物流公司')
    return
  }

  if (!trackingNumber.value) {
    ElMessage.warning('请先获取或手动输入运单号')
    return
  }

  // 校验运单号-物流公司匹配
  if (!(await validateBeforePrint())) return

  await ElMessageBox.confirm(
    `确认打印 ${printCopies.value} 份面单吗？\n物流公司：${logisticsCompanyName.value}\n运单号：${trackingNumber.value}\n打印方式：${currentPrintMode.value === 'lodop' ? 'LODOP控件' : currentPrintMode.value === 'usb' ? 'USB直连' : '浏览器打印'}`,
    '确认打印',
    { type: 'info', confirmButtonText: '确认打印', cancelButtonText: '取消' }
  )

  // 🔥 点击打印前，先确保运单号已保存到数据库（不改变订单状态）
  await saveTrackingToDB(trackingNumber.value, logisticsCompanyCode.value)

  printing.value = true
  try {
    refreshPreview()
    await nextTick()

    const config = getConfigWithTemplatePaper()
    const labelData = buildLabelData()
    const labels = Array.from({ length: printCopies.value }, () => labelData)

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
        title: `面单 - ${props.order?.orderNo || ''}`,
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
        '打印机是否已成功打印面单？\n确认后将把订单标记为【已发货】并上传运单号。',
        '确认打印结果',
        {
          type: 'success',
          confirmButtonText: '✅ 已成功打印，标记发货',
          cancelButtonText: '❌ 未打印 / 打印失败',
          distinguishCancelAndClose: true,
        }
      )
    } catch (action) {
      // 用户点击了"未打印"或关闭对话框 — 运单号已保存，可通过"确认发货"按钮后续确认
      ElMessage.info('运单号已保存，订单状态未变更。可稍后通过"确认发货"按钮完成发货确认')
      return
    }

    // 用户确认已打印，更新订单状态为已发货
    try {
      const { orderApi } = await import('@/api/order')
      const now = new Date().toISOString()
      await orderApi.update(props.order.id, {
        status: 'shipped',
        trackingNumber: trackingNumber.value,
        expressCompany: logisticsCompanyCode.value,
        shippedAt: now,
      })

      const { useOrderStore } = await import('@/stores/order')
      const orderStore = useOrderStore()
      orderStore.updateOrder(props.order.id, {
        status: 'shipped',
        trackingNumber: trackingNumber.value,
        expressNo: trackingNumber.value,
        expressCompany: logisticsCompanyCode.value,
        shippedAt: now,
      })
    } catch (e) {
      console.warn('更新订单状态失败（面单已打印）:', e)
    }

    emit('printed', {
      orderId: props.order.id,
      trackingNumber: trackingNumber.value,
      logisticsCompany: logisticsCompanyCode.value,
    })

    ElMessage.success('面单已打印，订单已标记为已发货')
    handleClose()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('打印失败:', e)
      ElMessage.error('打印失败，请重试')
    }
  } finally {
    printing.value = false
  }
}

const buildLabelData = () => {
  return orderToLabelData(props.order, companyInfo.value, {
    logisticsCompany: logisticsCompanyName.value,
    logisticsCode: logisticsCompanyCode.value,
    trackingNumber: trackingNumber.value,
    showProducts: showProducts.value,
    showRemark: showRemark.value,
    showCodAmount: showCodAmount.value,
    privacyMode: currentTemplate.value?.privacyMode || 'partial',
    namePrivacy: currentTemplate.value?.namePrivacy || 'full',
    addressPrivacy: currentTemplate.value?.addressPrivacy || 'full',
  })
}

const initialize = () => {
  printerList.value = getSavedPrinters()
  const defaultPrinter = getDefaultPrinter()
  selectedPrinterId.value = defaultPrinter.id
  selectedTemplateId.value = getLastUsedTemplateId()

  // 加载默认打印模式
  currentPrintMode.value = getDefaultPrintMode()
  lodopPrinterName.value = getDefaultLodopPrinter()

  if (props.order?.expressCompany) {
    logisticsCompanyCode.value = props.order.expressCompany
  } else if (props.order?.designatedExpress) {
    logisticsCompanyCode.value = props.order.designatedExpress
  }

  if (props.order?.expressNo || props.order?.trackingNumber) {
    trackingNumber.value = props.order.expressNo || props.order.trackingNumber || ''
  } else {
    trackingNumber.value = ''
  }

  if (logisticsCompanyCode.value) {
    const matched = getTemplateByCompany(logisticsCompanyCode.value)
    if (matched) selectedTemplateId.value = matched.id
  }

  // 初始校验
  checkTrackingValidation()
}

watch(() => props.visible, async (val) => {
  if (val) {
    await loadLogisticsCompanies()
    await loadCompanyInfo()
    initialize()
    nextTick(() => {
      refreshPreview()
      // 设置ResizeObserver
      if (previewWrapperRef.value && !resizeObserver) {
        resizeObserver = new ResizeObserver(() => updatePreviewScale())
        resizeObserver.observe(previewWrapperRef.value)
      }
    })
  }
})

watch([trackingNumber, logisticsCompanyCode], () => {
  refreshPreview()
  checkTrackingValidation()
})

// 🔥 实时保存运单号到数据库（防抖1.5秒）
let trackingSaveTimer: ReturnType<typeof setTimeout> | null = null
watch([trackingNumber, logisticsCompanyCode], ([tn, code]) => {
  if (trackingSaveTimer) clearTimeout(trackingSaveTimer)
  if (tn && code && props.order?.id) {
    trackingSaveTimer = setTimeout(() => {
      saveTrackingToDB(tn, code)
    }, 1500)
  }
})

// 打印机配置弹窗关闭后刷新打印模式
watch(printerConfigVisible, (val) => {
  if (!val) {
    printerList.value = getSavedPrinters()
    currentPrintMode.value = getDefaultPrintMode()
    lodopPrinterName.value = getDefaultLodopPrinter()
    const defaultPrinter = getDefaultPrinter()
    selectedPrinterId.value = defaultPrinter.id
  }
})

onMounted(() => {
  printerList.value = getSavedPrinters()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  // 🔥 清理防抖定时器
  if (trackingSaveTimer) {
    clearTimeout(trackingSaveTimer)
    trackingSaveTimer = null
  }
})

// 🔥 物流公司变化时立即保存（如果有运单号）
const onLogisticsCompanyChange = () => {
  if (trackingNumber.value && logisticsCompanyCode.value && props.order?.id) {
    // 取消debounce timer，立即保存
    if (trackingSaveTimer) { clearTimeout(trackingSaveTimer); trackingSaveTimer = null }
    saveTrackingToDB(trackingNumber.value, logisticsCompanyCode.value)
  }
}

// 🔥 运单号失去焦点时立即保存
const onTrackingBlur = () => {
  if (trackingNumber.value && logisticsCompanyCode.value && props.order?.id) {
    // 取消debounce timer，立即保存
    if (trackingSaveTimer) { clearTimeout(trackingSaveTimer); trackingSaveTimer = null }
    saveTrackingToDB(trackingNumber.value, logisticsCompanyCode.value)
  }
}

const handleClose = () => {
  // 🔥 关闭前如果有未保存的运单号，立即保存
  if (trackingSaveTimer) {
    clearTimeout(trackingSaveTimer)
    trackingSaveTimer = null
  }
  if (trackingNumber.value && logisticsCompanyCode.value && props.order?.id) {
    saveTrackingToDB(trackingNumber.value, logisticsCompanyCode.value)
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

.print-content { font-size: 14px; }

.section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 12px 0;
}

/* 打印设置 */
.print-settings { background: #f8f9fa; padding: 16px; border-radius: 10px; margin-bottom: 16px; }
.settings-grid { display: flex; flex-direction: column; gap: 10px; }
.setting-row { display: flex; gap: 20px; align-items: center; }
.setting-item { display: flex; align-items: center; gap: 8px; flex: 1; }
.setting-item label { font-weight: 500; color: #606266; min-width: 70px; white-space: nowrap; }
.setting-select { width: 180px; }
.setting-input { width: 180px; }
.setting-options { display: flex; align-items: center; gap: 16px; }
.printer-mode-text { font-size: 13px; color: #409eff; font-weight: 500; }

/* 面单预览 */
.label-preview-section { background: #f8f9fa; padding: 16px; border-radius: 10px; }
.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.paper-size-info { font-size: 12px; color: #909399; }

.preview-wrapper {
  background: #e0e0e0; border-radius: 8px; padding: 20px;
  display: flex; justify-content: center; align-items: flex-start;
  overflow: auto; min-height: 200px;
}
.preview-scaler { transition: transform 0.2s; }

/* ========= 仿真面单样式（类似顺丰电子面单） ========= */
.sl {
  background: #fff; border: 2px solid #000;
  padding: 8px 10px; font-family: 'Microsoft YaHei','PingFang SC',Arial,sans-serif;
  font-size: 11px; color: #000; box-sizing: border-box;
}

/* 头部：公司名 + 路由码 */
.sl-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 6px;
}
.sl-company { font-size: 20px; font-weight: 900; letter-spacing: 2px; }
.sl-route-code {
  font-size: 28px; font-weight: 900; letter-spacing: 3px;
  border: 3px solid #000; padding: 2px 10px; border-radius: 4px;
  min-width: 80px; text-align: center; line-height: 1.1;
}

/* 路由条形码区 */
.sl-barcode-top {
  text-align: center; border-bottom: 2px solid #000;
  padding: 4px 0 6px 0; margin-bottom: 6px;
}
.sl-barcode-top svg { max-width: 90%; height: 50px; }
.sl-tracking-no { font-size: 13px; font-weight: 700; letter-spacing: 2px; margin-top: 2px; }

/* 占位符 */
.barcode-placeholder {
  height: 50px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: #999; border: 1px dashed #ccc; margin: 4px auto;
  max-width: 90%;
}
.barcode-placeholder-sm {
  height: 30px; display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: #999; border: 1px dashed #ccc;
}
.qrcode-placeholder {
  width: 64px; height: 64px; flex-shrink: 0;
  border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: #999;
}

/* 收/寄地址块 */
.sl-addr-block { border-bottom: 1.5px solid #000; padding: 5px 0; margin-bottom: 4px; }
.sl-addr-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 3px; }
.sl-tag {
  font-size: 13px; font-weight: 900; padding: 2px 8px; border-radius: 3px; color: #fff;
  flex-shrink: 0; display: inline-block; letter-spacing: 1px;
}
.sl-tag-recv { background: #1a1a1a; color: #fff; }
.sl-tag-send { background: #2b6cb0; color: #fff; }
.sl-name { font-size: 16px; font-weight: 700; }
.sl-phone { font-size: 13px; color: #333; }
.sl-name-sm { font-size: 12px; }
.sl-phone-sm { font-size: 11px; color: #666; }
.sl-addr-detail { font-size: 13px; line-height: 1.5; padding-left: 28px; }
.sl-addr-detail-sm { font-size: 11px; color: #444; padding-left: 28px; }

.sl-send { border-bottom: 1px dashed #999; }

/* 信息行 */
.sl-info-row {
  border-bottom: 1px dashed #aaa; padding: 3px 0; font-size: 11px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sl-cod { font-size: 14px; color: #c00; }
.sl-remark span { color: #c00; }

/* 底部：二维码 + 底部条形码 + 订单号 */
.sl-bottom {
  display: flex; align-items: flex-start; gap: 8px;
  padding-top: 6px; margin-top: 4px; border-top: 2px solid #000;
}
.sl-qrcode { width: 64px; height: 64px; flex-shrink: 0; }
.sl-bottom-right { flex: 1; overflow: hidden; }
.sl-barcode-btm-svg { max-width: 100%; height: auto; max-height: 50px; display: block; }
.sl-order-info { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 2px; }
.sl-time { color: #999; }

/* 签收区 */
.sl-sign {
  border-top: 1px dashed #999; padding-top: 4px; margin-top: 4px;
  font-size: 11px; color: #666;
}

.dialog-footer { display: flex; justify-content: flex-end; gap: 10px; }
</style>

