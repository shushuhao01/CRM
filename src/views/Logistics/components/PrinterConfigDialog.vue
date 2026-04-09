<template>
  <el-dialog
    v-model="dialogVisible"
    width="700px"
    :before-close="handleClose"
    class="printer-config-dialog"
    append-to-body
  >
    <template #header>
      <div class="dialog-header-with-help">
        <span class="el-dialog__title">打印机配置</span>
        <el-tooltip content="查看打印机配置指南" placement="bottom">
          <el-button link type="primary" class="help-icon-btn" @click="goToHelp">
            <el-icon :size="18"><QuestionFilled /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </template>
    <div class="config-content">
      <!-- 打印方式选择 -->
      <div class="section">
        <h4 class="section-title"><el-icon><Monitor /></el-icon> 打印方式</h4>
        <div class="print-type-cards">
          <div
            class="type-card"
            :class="{ active: printMode === 'browser', 'is-default-mode': savedDefaultMode === 'browser' }"
            title="使用浏览器自带打印功能，兼容所有打印机，推荐使用"
            @click="switchMode('browser')"
          >
            <el-icon class="type-icon" :size="28"><Printer /></el-icon>
            <div class="type-name">浏览器打印</div>
            <div class="type-desc">兼容所有打印机，推荐</div>
            <el-tag v-if="savedDefaultMode === 'browser'" type="warning" size="small" class="type-tag">默认</el-tag>
            <el-tag v-else-if="printMode === 'browser'" type="success" size="small" class="type-tag">当前</el-tag>
            <div class="type-default-action" @click.stop>
              <el-button v-if="savedDefaultMode !== 'browser'" type="warning" size="small" link @click="setAsDefaultMode('browser')">设为默认</el-button>
              <el-button v-else type="info" size="small" link @click="clearDefaultMode">取消默认</el-button>
            </div>
          </div>
          <div
            class="type-card"
            :class="{ active: printMode === 'lodop', 'has-warning': printMode === 'lodop' && lodopStatus === 'not-installed', 'is-default-mode': savedDefaultMode === 'lodop' }"
            title="需安装C-Lodop控件，适合批量专业打印"
            @click="switchMode('lodop')"
          >
            <el-icon class="type-icon" :size="28"><Connection /></el-icon>
            <div class="type-name">LODOP控件</div>
            <div class="type-desc">专业批量打印</div>
            <el-tag v-if="savedDefaultMode === 'lodop'" type="warning" size="small" class="type-tag">默认</el-tag>
            <el-tag v-else-if="printMode === 'lodop'" type="success" size="small" class="type-tag">当前</el-tag>
            <el-tag v-else-if="lodopStatus === 'connected'" type="success" size="small" class="type-tag">已连接</el-tag>
            <div class="type-default-action" @click.stop>
              <el-button v-if="savedDefaultMode !== 'lodop'" type="warning" size="small" link @click="setAsDefaultMode('lodop')" :disabled="lodopStatus !== 'connected'">设为默认</el-button>
              <el-button v-else type="info" size="small" link @click="clearDefaultMode">取消默认</el-button>
            </div>
          </div>
          <div
            class="type-card"
            :class="{ active: printMode === 'usb', 'has-warning': printMode === 'usb' && !webUsbAvailable, 'is-default-mode': savedDefaultMode === 'usb' }"
            title="通过USB直连热敏打印机，需浏览器支持WebUSB"
            @click="switchMode('usb')"
          >
            <el-icon class="type-icon" :size="28"><Cpu /></el-icon>
            <div class="type-name">USB直连</div>
            <div class="type-desc">热敏打印机专用</div>
            <el-tag v-if="savedDefaultMode === 'usb'" type="warning" size="small" class="type-tag">默认</el-tag>
            <el-tag v-else-if="printMode === 'usb'" type="success" size="small" class="type-tag">当前</el-tag>
            <el-tag v-else-if="usbStatus === 'connected'" type="success" size="small" class="type-tag">已连接</el-tag>
            <div class="type-default-action" @click.stop>
              <el-button v-if="savedDefaultMode !== 'usb'" type="warning" size="small" link @click="setAsDefaultMode('usb')" :disabled="usbStatus !== 'connected'">设为默认</el-button>
              <el-button v-else type="info" size="small" link @click="clearDefaultMode">取消默认</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- LODOP 配置区 -->
      <div v-if="printMode === 'lodop'" class="section">
        <div class="section-header">
          <h4 class="section-title"><el-icon><Connection /></el-icon> LODOP 控件配置</h4>
          <el-button size="small" :loading="lodopConnecting" @click="connectLodop">
            <el-icon><Refresh /></el-icon> {{ lodopStatus === 'connected' ? '重新检测' : '连接' }}
          </el-button>
        </div>
        <div class="status-card" :class="'status-' + lodopStatus">
          <div class="status-indicator">
            <span class="status-dot" :class="'dot-' + lodopStatus"></span>
            <span class="status-text">{{ lodopStatusText }}</span>
          </div>
          <div v-if="lodopStatus === 'not-installed'" class="status-help">
            <p>请先安装 C-Lodop 打印控件服务：</p>
            <el-link type="primary" href="http://www.lodop.net/download.html" target="_blank">
              点击下载安装 C-Lodop（官方免费）
            </el-link>
            <p class="help-note">安装后请启动 C-Lodop 服务，然后点击"连接"按钮。</p>
          </div>
        </div>
        <div v-if="lodopStatus === 'connected'" class="lodop-printers">
          <el-form-item label="选择打印机" label-width="90px">
            <el-select v-model="selectedLodopPrinter" placeholder="选择LODOP检测到的打印机" style="width: 100%">
              <el-option v-for="(name, idx) in lodopPrinterList" :key="idx" :label="name" :value="name" />
            </el-select>
          </el-form-item>
          <div class="lodop-actions">
            <el-button type="warning" size="small" @click="saveLodopDefaultPrinter" :disabled="!selectedLodopPrinter">
              <el-icon><StarFilled /></el-icon> 保存为默认LODOP打印机
            </el-button>
            <el-button type="success" size="small" @click="testLodopPrint" :disabled="!selectedLodopPrinter">
              <el-icon><Printer /></el-icon> 测试LODOP打印
            </el-button>
            <el-button size="small" @click="lodopSetup">
              <el-icon><Setting /></el-icon> 打印设置
            </el-button>
          </div>
          <div v-if="savedLodopPrinter" class="lodop-default-info">
            <el-tag type="warning" size="small"><el-icon><StarFilled /></el-icon> 默认LODOP打印机：{{ savedLodopPrinter }}</el-tag>
          </div>
        </div>
      </div>

      <!-- USB 直连配置区 -->
      <div v-if="printMode === 'usb'" class="section">
        <div class="section-header">
          <h4 class="section-title"><el-icon><Cpu /></el-icon> USB 直连配置</h4>
        </div>
        <div v-if="!webUsbAvailable" class="status-card status-not-installed">
          <div class="status-indicator">
            <span class="status-dot dot-not-installed"></span>
            <span class="status-text">WebUSB 不可用</span>
          </div>
          <div class="status-help">
            <p>WebUSB 功能需要满足以下条件：</p>
            <ul class="help-list">
              <li>使用 <b>Chrome 61+</b> 或 <b>Edge 79+</b> 浏览器</li>
              <li>通过 <b>HTTPS</b> 或 <b>localhost</b> 访问系统</li>
              <li>操作系统需要正确安装打印机驱动</li>
            </ul>
          </div>
        </div>
        <div v-else class="usb-config">
          <div class="status-card" :class="'status-' + (usbStatus === 'connected' ? 'connected' : 'disconnected')">
            <div class="status-indicator">
              <span class="status-dot" :class="'dot-' + (usbStatus === 'connected' ? 'connected' : 'disconnected')"></span>
              <span class="status-text">{{ usbStatusText }}</span>
            </div>
            <div v-if="connectedUsbDevice" class="usb-device-info">
              <span>设备：{{ connectedUsbDevice.name }}</span>
              <span>VID: 0x{{ connectedUsbDevice.vendorId.toString(16).toUpperCase().padStart(4, '0') }}</span>
              <span>PID: 0x{{ connectedUsbDevice.productId.toString(16).toUpperCase().padStart(4, '0') }}</span>
            </div>
          </div>
          <div class="usb-actions">
            <el-button v-if="usbStatus !== 'connected'" type="primary" size="small" :loading="usbConnecting" @click="connectUsb">
              <el-icon><Link /></el-icon> 连接USB打印机
            </el-button>
            <el-button v-else type="danger" size="small" @click="disconnectUsb">
              <el-icon><SwitchButton /></el-icon> 断开连接
            </el-button>
            <el-button v-if="usbStatus === 'connected'" type="success" size="small" @click="testUsbPrint">
              <el-icon><Printer /></el-icon> 测试USB打印
            </el-button>
          </div>
          <el-alert type="info" :closable="false" show-icon style="margin-top: 12px;">
            <template #title>USB直连打印说明</template>
            <div style="font-size: 12px; line-height: 1.6;">
              <p style="margin: 0;">• USB直连通过 ESC/POS 指令直接控制热敏打印机，无需安装驱动。</p>
              <p style="margin: 0;">• 首次连接时浏览器会弹出设备选择对话框，请选择您的打印机。</p>
              <p style="margin: 0;">• 支持大部分主流热敏打印机（佳博、汉印、新北洋、TSC等）。</p>
            </div>
          </el-alert>
        </div>
      </div>

      <!-- 浏览器打印机列表（仅browser模式显示） -->
      <div v-if="printMode === 'browser'" class="section">
        <div class="section-header">
          <h4 class="section-title"><el-icon><Printer /></el-icon> 已保存的打印机</h4>
          <el-button type="primary" size="small" @click="addPrinter">
            <el-icon><Plus /></el-icon> 添加打印机
          </el-button>
        </div>
        <div class="printer-list">
          <div v-for="printer in printerList" :key="printer.id" class="printer-item" :class="{ 'is-default': printer.isDefault }">
            <div class="printer-info">
              <div class="printer-name">
                <el-icon v-if="printer.isDefault" class="default-icon"><StarFilled /></el-icon>
                {{ printer.name }}
                <el-tag v-if="printer.isDefault" type="warning" size="small">默认</el-tag>
              </div>
              <div class="printer-meta">
                <span>{{ getPaperSizeName(printer.paperSize) }}</span>
                <span>浏览器打印</span>
              </div>
            </div>
            <div class="printer-actions">
              <el-button v-if="!printer.isDefault" type="warning" size="small" text @click="setDefault(printer.id)">设为默认</el-button>
              <el-button type="primary" size="small" text @click="editPrinter(printer)">编辑</el-button>
              <el-button type="danger" size="small" text @click="removePrinter(printer.id)" :disabled="printerList.length <= 1">删除</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 打印参数编辑 -->
      <div v-if="editingPrinter && printMode === 'browser'" class="section">
        <h4 class="section-title"><el-icon><Setting /></el-icon> 打印参数 - {{ editingPrinter.name }}</h4>
        <el-form :model="editingPrinter" label-width="90px" size="default" class="config-form">
          <el-form-item label="打印机名称">
            <el-input v-model="editingPrinter.name" placeholder="自定义名称，如：仓库热敏打印机" />
          </el-form-item>
          <div class="form-row">
            <el-form-item label="纸张大小" class="form-half">
              <el-select v-model="editingPrinter.paperSize" @change="onPaperSizeChange">
                <el-option v-for="(size, key) in PAPER_SIZES" :key="key" :label="size.name" :value="key" />
              </el-select>
            </el-form-item>
            <el-form-item label="打印浓度" class="form-half">
              <el-slider v-model="editingPrinter.density" :min="1" :max="5" :marks="densityMarks" show-stops />
            </el-form-item>
          </div>
          <div class="form-row">
            <el-form-item label="左偏移" class="form-half">
              <el-input-number v-model="editingPrinter.offsetLeft" :min="-10" :max="10" :step="0.5" />
              <span class="unit">mm</span>
            </el-form-item>
            <el-form-item label="上偏移" class="form-half">
              <el-input-number v-model="editingPrinter.offsetTop" :min="-10" :max="10" :step="0.5" />
              <span class="unit">mm</span>
            </el-form-item>
          </div>
          <el-form-item>
            <el-button type="primary" @click="saveEditingPrinter">保存配置</el-button>
            <el-button @click="editingPrinter = null">取消</el-button>
            <el-button type="success" @click="testPrint">测试打印</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor, Connection, Cpu, Printer, Plus, StarFilled, Setting,
  Refresh, Link, SwitchButton, QuestionFilled
} from '@element-plus/icons-vue'
import {
  getSavedPrinters, savePrinters, setDefaultPrinter, DEFAULT_PRINTER_CONFIG, PAPER_SIZES,
  type PrinterConfig, printLabels, type LabelData,
  getDefaultPrintMode, setDefaultPrintMode, getDefaultLodopPrinter, setDefaultLodopPrinter
} from '@/utils/printService'
import {
  getLodopStatus, loadCLodop, getLodopPrinters, lodopPrintHTML, lodopPrintSetup,
  onLodopStatusChange, type LodopStatus
} from '@/utils/lodopService'
import {
  isWebUsbAvailable, getUsbPrintStatus, requestUsbPrinter, disconnectUsbPrinter,
  usbPrintTestPage, getConnectedDevice, onUsbStatusChange, type UsbPrintStatus
} from '@/utils/usbPrintService'


interface Props {
  visible: boolean
}
interface Emits {
  (e: 'update:visible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const router = useRouter()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const goToHelp = () => {
  dialogVisible.value = false
  nextTick(() => {
    router.push('/help-center?section=logistics-printer-guide')
  })
}

// 打印模式（使用printService的tenant-aware函数初始化）
const printMode = ref<'browser' | 'lodop' | 'usb'>(getDefaultPrintMode())
const savedDefaultMode = ref<'browser' | 'lodop' | 'usb'>(getDefaultPrintMode())
const savedLodopPrinter = ref<string>(getDefaultLodopPrinter())

// 浏览器打印
const printerList = ref<PrinterConfig[]>([])
const editingPrinter = ref<PrinterConfig | null>(null)
const densityMarks = { 1: '淡', 3: '中', 5: '浓' }

// LODOP
const lodopStatus = ref<LodopStatus>(getLodopStatus())
const lodopConnecting = ref(false)
const lodopPrinterList = ref<string[]>([])
const selectedLodopPrinter = ref('')

// USB
const webUsbAvailable = ref(isWebUsbAvailable())
const usbStatus = ref<UsbPrintStatus>(getUsbPrintStatus())
const usbConnecting = ref(false)
const connectedUsbDevice = ref(getConnectedDevice())

const lodopStatusText = computed(() => {
  switch (lodopStatus.value) {
    case 'connected': return `已连接（检测到 ${lodopPrinterList.value.length} 台打印机）`
    case 'connecting': return '正在连接 C-Lodop 服务...'
    case 'not-installed': return '未检测到 C-Lodop 服务'
    default: return '未连接'
  }
})

const usbStatusText = computed(() => {
  switch (usbStatus.value) {
    case 'connected': return '已连接'
    case 'connecting': return '正在连接...'
    case 'error': return '连接出错'
    case 'unavailable': return 'WebUSB 不可用'
    default: return '未连接'
  }
})

let unsubLodop: (() => void) | null = null
let unsubUsb: (() => void) | null = null

onMounted(() => {
  printerList.value = getSavedPrinters()
  unsubLodop = onLodopStatusChange((s) => {
    lodopStatus.value = s
    if (s === 'connected') lodopPrinterList.value = getLodopPrinters()
  })
  unsubUsb = onUsbStatusChange((s) => {
    usbStatus.value = s
    connectedUsbDevice.value = getConnectedDevice()
  })
})

onBeforeUnmount(() => {
  unsubLodop?.()
  unsubUsb?.()
})

watch(() => props.visible, (val) => {
  if (val) {
    printerList.value = getSavedPrinters()
    lodopStatus.value = getLodopStatus()
    usbStatus.value = getUsbPrintStatus()
    connectedUsbDevice.value = getConnectedDevice()
    webUsbAvailable.value = isWebUsbAvailable()
    savedDefaultMode.value = getDefaultPrintMode()
    savedLodopPrinter.value = getDefaultLodopPrinter()
    if (savedLodopPrinter.value && !selectedLodopPrinter.value) {
      selectedLodopPrinter.value = savedLodopPrinter.value
    }
  }
})

// 模式切换
const switchMode = (mode: 'browser' | 'lodop' | 'usb') => {
  printMode.value = mode
  setDefaultPrintMode(mode)
  editingPrinter.value = null
  if (mode === 'lodop' && lodopStatus.value !== 'connected') connectLodop()
}

// 设为默认打印方式
const setAsDefaultMode = (mode: 'browser' | 'lodop' | 'usb') => {
  setDefaultPrintMode(mode)
  savedDefaultMode.value = mode
  // 同时切换到该模式
  switchMode(mode)
  const modeNames = { browser: '浏览器打印', lodop: 'LODOP控件', usb: 'USB直连' }
  ElMessage.success(`已将【${modeNames[mode]}】设为默认打印方式`)
}

// 取消默认打印方式（回退到浏览器打印）
const clearDefaultMode = () => {
  setDefaultPrintMode('browser')
  savedDefaultMode.value = 'browser'
  ElMessage.info('已取消默认打印方式，回退为浏览器打印')
}

// 保存默认LODOP打印机
const saveLodopDefaultPrinter = () => {
  if (!selectedLodopPrinter.value) return
  setDefaultLodopPrinter(selectedLodopPrinter.value)
  savedLodopPrinter.value = selectedLodopPrinter.value
  ElMessage.success(`已保存默认LODOP打印机：${selectedLodopPrinter.value}`)
}

// LODOP
const connectLodop = async () => {
  lodopConnecting.value = true
  try {
    const ok = await loadCLodop()
    if (ok) {
      lodopPrinterList.value = getLodopPrinters()
      if (lodopPrinterList.value.length > 0 && !selectedLodopPrinter.value) {
        selectedLodopPrinter.value = lodopPrinterList.value[0]
      }
      ElMessage.success(`C-Lodop 连接成功，检测到 ${lodopPrinterList.value.length} 台打印机`)
    } else {
      ElMessage.warning('无法连接 C-Lodop 服务，请确认已安装并启动')
    }
  } catch (e: any) {
    ElMessage.error('连接 C-Lodop 失败：' + (e?.message || '未知错误'))
  } finally {
    lodopConnecting.value = false
  }
}

const testLodopPrint = () => {
  const testHTML = `<div style="font-family:'Microsoft YaHei',sans-serif;padding:10px;border:2px solid #000;"><h2 style="text-align:center;margin:0 0 10px;">LODOP 打印测试</h2><hr/><p><b>打印机：</b>${selectedLodopPrinter.value}</p><p><b>时间：</b>${new Date().toLocaleString()}</p><p><b>状态：</b>✅ LODOP 打印正常工作</p><hr/><p style="text-align:center;color:#666;font-size:12px;">CRM 面单打印系统 - LODOP 测试页</p></div>`
  const ok = lodopPrintHTML({
    printerName: selectedLodopPrinter.value,
    paperWidth: 100, paperHeight: 150,
    htmlContent: testHTML, title: 'CRM LODOP测试', preview: true,
  })
  ElMessage[ok ? 'success' : 'error'](ok ? '已发送 LODOP 测试打印（预览模式）' : 'LODOP 打印失败')
}

const lodopSetup = () => {
  if (!lodopPrintSetup()) ElMessage.warning('无法打开 LODOP 打印设置')
}

// USB
const connectUsb = async () => {
  usbConnecting.value = true
  try {
    const device = await requestUsbPrinter()
    if (device) {
      connectedUsbDevice.value = device
      ElMessage.success(`已连接 USB 打印机：${device.name}`)
    } else {
      ElMessage.info('未选择设备')
    }
  } catch (e: any) {
    ElMessage.error('USB 连接失败：' + (e?.message || '未知错误'))
  } finally {
    usbConnecting.value = false
  }
}

const disconnectUsb = async () => {
  await disconnectUsbPrinter()
  connectedUsbDevice.value = null
  ElMessage.success('已断开 USB 打印机')
}

const testUsbPrint = async () => {
  try {
    await usbPrintTestPage()
    ElMessage.success('USB 测试打印已发送')
  } catch (e: any) {
    ElMessage.error('USB 打印失败：' + (e?.message || '未知错误'))
  }
}

// 浏览器打印
const getPaperSizeName = (code: string) => PAPER_SIZES[code]?.name || code

const onPaperSizeChange = (code: string) => {
  if (editingPrinter.value && PAPER_SIZES[code]) {
    editingPrinter.value.paperWidth = PAPER_SIZES[code].width
    editingPrinter.value.paperHeight = PAPER_SIZES[code].height
  }
}

const addPrinter = () => {
  const newPrinter: PrinterConfig = {
    ...DEFAULT_PRINTER_CONFIG,
    id: 'printer-' + Date.now(),
    name: '新打印机',
    isDefault: printerList.value.length === 0,
  }
  printerList.value.push(newPrinter)
  savePrinters(printerList.value)
  editingPrinter.value = newPrinter
}

const editPrinter = (printer: PrinterConfig) => { editingPrinter.value = { ...printer } }

const setDefault = (id: string) => {
  setDefaultPrinter(id)
  printerList.value = getSavedPrinters()
  ElMessage.success('已设为默认打印机')
}

const removePrinter = async (id: string) => {
  await ElMessageBox.confirm('确定要删除该打印机吗？', '确认删除', { type: 'warning' })
  printerList.value = printerList.value.filter(p => p.id !== id)
  savePrinters(printerList.value)
  if (editingPrinter.value?.id === id) editingPrinter.value = null
  ElMessage.success('已删除')
}

const saveEditingPrinter = () => {
  if (!editingPrinter.value) return
  const index = printerList.value.findIndex(p => p.id === editingPrinter.value!.id)
  if (index >= 0) printerList.value[index] = { ...editingPrinter.value }
  savePrinters(printerList.value)
  editingPrinter.value = null
  ElMessage.success('打印机配置已保存')
}

const testPrint = async () => {
  const config = editingPrinter.value || getSavedPrinters()[0] || DEFAULT_PRINTER_CONFIG
  const testLabel: LabelData = {
    logisticsCompany: '测试物流公司', logisticsCode: 'TEST',
    trackingNumber: 'TEST' + Date.now().toString().slice(-10),
    receiverName: '张三', receiverPhone: '13812345678',
    receiverAddress: '广东省深圳市南山区科技园路xxx号',
    senderName: '客服中心', senderPhone: '01012345678',
    senderAddress: '北京市朝阳区科技园区xxx号',
    orderNo: 'TEST-ORDER-001',
    products: [{ name: '测试商品A', quantity: 2 }, { name: '测试商品B', quantity: 1 }],
    totalAmount: 599, codAmount: 299, deposit: 300,
    remark: '这是测试打印', showProducts: true, showRemark: true,
    showCodAmount: true, privacyMode: 'partial',
  }
  await printLabels([testLabel], config)
  ElMessage.success('已发送测试打印')
}

const handleClose = () => { dialogVisible.value = false }
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

.config-content { max-height: 68vh; overflow-y: auto; }

.section { margin-bottom: 20px; }

.section-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600; color: #303133;
  margin: 0 0 12px 0; padding-bottom: 8px; border-bottom: 1px solid #ebeef5;
}

.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
}
.section-header .section-title { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }

.print-type-cards { display: flex; gap: 12px; }

.type-card {
  flex: 1; text-align: center; padding: 16px 12px;
  border: 2px solid #e4e7ed; border-radius: 10px;
  cursor: pointer; transition: all 0.3s; position: relative;
}
.type-card:hover { border-color: #409eff; box-shadow: 0 2px 8px rgba(64,158,255,0.15); }
.type-card.active { border-color: #409eff; background: #ecf5ff; }
.type-card.is-default-mode { border-color: #e6a23c; background: #fdf6ec; }
.type-card.is-default-mode.active { border-color: #e6a23c; background: #fdf6ec; }
.type-card.has-warning { border-color: #e6a23c; }

.type-icon { color: #409eff; margin-bottom: 6px; }
.type-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.type-desc { font-size: 12px; color: #909399; }
.type-tag { position: absolute; top: 6px; right: 6px; }
.type-default-action { margin-top: 6px; }

.status-card {
  background: #f8f9fa; border: 1px solid #ebeef5;
  border-radius: 8px; padding: 14px 16px; margin-bottom: 14px;
}
.status-card.status-connected { background: #f0f9eb; border-color: #b3e19d; }
.status-card.status-not-installed { background: #fdf6ec; border-color: #e6a23c; }

.status-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }

.status-dot {
  width: 10px; height: 10px; border-radius: 50%;
  display: inline-block; flex-shrink: 0;
}
.dot-connected { background: #67c23a; box-shadow: 0 0 6px rgba(103,194,58,0.4); }
.dot-connecting { background: #e6a23c; animation: pulse 1s infinite; }
.dot-disconnected { background: #909399; }
.dot-not-installed { background: #f56c6c; }
.dot-error { background: #f56c6c; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.status-text { font-weight: 500; font-size: 14px; color: #303133; }
.status-help { margin-top: 10px; font-size: 13px; color: #606266; line-height: 1.6; }
.status-help p { margin: 4px 0; }
.help-note { font-size: 12px; color: #909399; margin-top: 6px !important; }
.help-list { margin: 6px 0; padding-left: 18px; font-size: 12px; }
.help-list li { margin-bottom: 4px; }

.lodop-printers { background: #f8f9fa; padding: 14px 16px; border-radius: 8px; }
.lodop-actions, .usb-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.lodop-default-info { margin-top: 10px; }
.usb-device-info { display: flex; gap: 16px; font-size: 12px; color: #606266; margin-top: 6px; }

.printer-list { border: 1px solid #ebeef5; border-radius: 8px; overflow: hidden; }
.printer-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px; border-bottom: 1px solid #f0f2f5; transition: background 0.2s;
}
.printer-item:last-child { border-bottom: none; }
.printer-item:hover { background: #f8f9fa; }
.printer-item.is-default { background: #fdf6ec; }

.printer-name { display: flex; align-items: center; gap: 6px; font-weight: 500; font-size: 14px; }
.default-icon { color: #e6a23c; }
.printer-meta { display: flex; gap: 12px; font-size: 12px; color: #909399; margin-top: 4px; }
.printer-actions { display: flex; gap: 4px; }

.config-form { background: #f8f9fa; padding: 16px; border-radius: 8px; }
.form-row { display: flex; gap: 20px; }
.form-half { flex: 1; }
.form-half :deep(.el-select) { width: 100%; }
.unit { margin-left: 6px; font-size: 12px; color: #909399; }
</style>

