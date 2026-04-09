/**
 * 打印服务 - 面单打印核心逻辑
 * 支持浏览器原生打印
 */
import QRCode from 'qrcode'
import JsBarcode from 'jsbarcode'

// 打印机配置接口
export interface PrinterConfig {
  id: string
  name: string
  type: 'browser' | 'network' | 'usb'
  paperSize: string     // 纸张尺寸代码
  paperWidth: number    // 纸张宽度(mm)
  paperHeight: number   // 纸张高度(mm)
  density: number       // 打印浓度 1-5
  speed: 'slow' | 'medium' | 'fast'
  rotate: 0 | 90 | 180 | 270
  offsetLeft: number    // 左偏移(mm)
  offsetTop: number     // 上偏移(mm)
  isDefault: boolean    // 是否默认打印机
  status: 'online' | 'offline'
}

// 面单数据接口
export interface LabelData {
  // 物流信息
  logisticsCompany: string    // 物流公司名称
  logisticsCode: string       // 物流公司代码
  trackingNumber: string      // 运单号
  // 收件人信息
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  receiverProvince?: string
  receiverCity?: string
  receiverDistrict?: string
  // 寄件人信息
  senderName: string
  senderPhone: string
  senderAddress: string
  // 订单信息
  orderNo: string
  products: Array<{ name: string; quantity: number }>
  totalAmount: number
  codAmount: number           // 代收款
  deposit: number             // 定金
  remark?: string
  // 其他
  serviceWechat?: string
  createTime?: string
  // 配置
  showProducts?: boolean      // 是否显示商品明细
  showRemark?: boolean        // 是否显示备注
  showCodAmount?: boolean     // 是否显示代收款
  privacyMode?: 'full' | 'partial' | 'hidden'  // 手机号隐私模式
  namePrivacy?: 'full' | 'partial' | 'hidden'   // 姓名隐私模式
  addressPrivacy?: 'full' | 'partial' | 'hidden' // 地址隐私模式
  qrDataUrl?: string  // 预生成的二维码 data URL（用于打印/预览）
  barcodeTopSvg?: string   // 预生成的顶部条形码 SVG 字符串
  barcodeBottomSvg?: string // 预生成的底部条形码 SVG 字符串
}

/**
 * 预生成二维码 data URL（使用本地 qrcode 包，不依赖 CDN）
 */
export async function generateQRDataURL(content: string): Promise<string> {
  if (!content) return ''
  try {
    return await QRCode.toDataURL(content, {
      width: 64,
      margin: 0,
      color: { dark: '#000000', light: '#ffffff' }
    })
  } catch (e) {
    console.warn('QR code generation failed:', e)
    return ''
  }
}

/**
 * 为 LabelData 预生成二维码 data URL
 */
export async function prepareLabelWithQR(label: LabelData): Promise<LabelData> {
  const qrContent = label.trackingNumber || label.orderNo || ''
  const qrDataUrl = await generateQRDataURL(qrContent)
  return { ...label, qrDataUrl }
}

/**
 * 预生成条形码 SVG 字符串（使用本地 JsBarcode 包，不依赖 CDN）
 */
export function generateBarcodeSVGString(content: string, options: Record<string, any>, cssClass?: string): string {
  if (!content) return ''
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    JsBarcode(svg, content, { ...options })
    if (cssClass) svg.setAttribute('class', cssClass)
    // 🔥 确保 SVG 缩放时保持条形码比例，不压缩条形宽度（关键：保证扫码可读性）
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    return svg.outerHTML
  } catch (e) {
    console.warn('Barcode SVG generation failed:', e)
    return ''
  }
}

/**
 * 为 LabelData 预生成所有编码（条形码 SVG + 二维码 DataURL），彻底去除 CDN 依赖
 */
export async function prepareLabelCodes(label: LabelData): Promise<LabelData> {
  const tn = label.trackingNumber || ''
  const qrContent = tn || label.orderNo || ''
  const qrDataUrl = await generateQRDataURL(qrContent)

  let barcodeTopSvg = ''
  let barcodeBottomSvg = ''
  if (tn) {
    barcodeTopSvg = generateBarcodeSVGString(tn, {
      format: 'CODE128', width: 2, height: 50, displayValue: false, margin: 0
    }, 'barcode-top-svg')
    barcodeBottomSvg = generateBarcodeSVGString(tn, {
      format: 'CODE128', width: 1.5, height: 40, displayValue: true, fontSize: 10, margin: 2, textMargin: 1
    }, 'sl-barcode-btm-svg barcode-btm-svg')
  }

  return { ...label, qrDataUrl, barcodeTopSvg, barcodeBottomSvg }
}

// 纸张尺寸预设
export const PAPER_SIZES: Record<string, { name: string; width: number; height: number }> = {
  '100x180': { name: '一联单 100×180mm', width: 100, height: 180 },
  '100x150': { name: '标准面单 100×150mm', width: 100, height: 150 },
  '100x100': { name: '方形面单 100×100mm', width: 100, height: 100 },
  '76x130':  { name: '小面单 76×130mm', width: 76, height: 130 },
  'A4':      { name: 'A4纸 210×297mm', width: 210, height: 297 },
  'A5':      { name: 'A5纸 148×210mm', width: 148, height: 210 },
}

// 默认打印机配置
export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  id: 'default-browser',
  name: '浏览器默认打印机',
  type: 'browser',
  paperSize: '100x180',
  paperWidth: 100,
  paperHeight: 180,
  density: 3,
  speed: 'medium',
  rotate: 0,
  offsetLeft: 0,
  offsetTop: 0,
  isDefault: true,
  status: 'online'
}

// 存储key
const STORAGE_KEY_PRINTERS = 'crm_printer_configs'
const STORAGE_KEY_DEFAULT = 'crm_default_printer'
const PRINT_MODE_KEY = 'crm_print_mode'
const LODOP_PRINTER_KEY = 'crm_lodop_default_printer'

/**
 * 获取当前租户ID前缀（用于localStorage key隔离）
 * 不同租户的打印机配置互不影响
 */
function getPrintTenantPrefix(): string {
  try {
    const userStr = localStorage.getItem('user') || localStorage.getItem('crm_current_user') || localStorage.getItem('user_info')
    if (userStr) {
      const user = JSON.parse(userStr)
      const tenantId = user.tenantId || ''
      if (tenantId) return `${tenantId}_`
    }
  } catch (_e) { /* ignore */ }
  return ''
}

function printTenantKey(baseKey: string): string {
  return getPrintTenantPrefix() + baseKey
}

/**
 * 获取默认打印方式
 */
export function getDefaultPrintMode(): 'browser' | 'lodop' | 'usb' {
  return (localStorage.getItem(printTenantKey(PRINT_MODE_KEY)) as 'browser' | 'lodop' | 'usb') || 'browser'
}

/**
 * 设置默认打印方式
 */
export function setDefaultPrintMode(mode: 'browser' | 'lodop' | 'usb') {
  localStorage.setItem(printTenantKey(PRINT_MODE_KEY), mode)
}

/**
 * 获取默认LODOP打印机名称
 */
export function getDefaultLodopPrinter(): string {
  return localStorage.getItem(printTenantKey(LODOP_PRINTER_KEY)) || ''
}

/**
 * 设置默认LODOP打印机名称
 */
export function setDefaultLodopPrinter(name: string) {
  localStorage.setItem(printTenantKey(LODOP_PRINTER_KEY), name)
}

/**
 * 物流公司运单号前缀规则
 */
const TRACKING_PREFIX_RULES: Record<string, string[]> = {
  'SF': ['SF'],
  'YTO': ['YT'],
  'JD': ['JD', 'JDVA', 'JDVB'],
  'EMS': ['E', 'EA', 'EB', 'EC', 'ED', 'EE', 'EF', 'EG', 'EH', 'EI', 'EJ', 'EK', 'EL', 'EM', 'EN'],
  'JTSD': ['JT'],
}

const COMPANY_NAME_MAP: Record<string, string> = {
  'SF': '顺丰速运', 'ZTO': '中通快递', 'YTO': '圆通速递', 'STO': '申通快递',
  'YD': '韵达速递', 'JD': '京东物流', 'EMS': '中国邮政', 'JTSD': '极兔速递',
  'DBL': '德邦快递', 'HTKY': '百世快递',
}

/**
 * 校验运单号与物流公司是否匹配
 * @returns { valid: true } 表示匹配或无法判断, { valid: false, warning: '...' } 表示不匹配
 */
export function validateTrackingCompanyMatch(companyCode: string, trackingNumber: string): { valid: boolean; warning: string } {
  if (!companyCode || !trackingNumber) return { valid: true, warning: '' }
  const tn = trackingNumber.trim().toUpperCase()
  if (!tn) return { valid: true, warning: '' }

  // 检查单号是否明确属于另一家公司
  for (const [code, prefixes] of Object.entries(TRACKING_PREFIX_RULES)) {
    if (code === companyCode) continue
    for (const prefix of prefixes) {
      if (tn.startsWith(prefix) && prefix.length >= 2) {
        const otherName = COMPANY_NAME_MAP[code] || code
        const currentName = COMPANY_NAME_MAP[companyCode] || companyCode
        return {
          valid: false,
          warning: `运单号 "${trackingNumber}" 以 "${prefix}" 开头，疑似【${otherName}】的运单号，但当前选择的物流公司是【${currentName}】。请确认物流公司与运单号是否匹配。`
        }
      }
    }
  }

  // 如果当前公司有前缀规则，检查是否符合
  const currentPrefixes = TRACKING_PREFIX_RULES[companyCode]
  if (currentPrefixes) {
    const matchesAny = currentPrefixes.some(p => tn.startsWith(p))
    if (!matchesAny) {
      const currentName = COMPANY_NAME_MAP[companyCode] || companyCode
      return {
        valid: false,
        warning: `【${currentName}】的运单号通常以 ${currentPrefixes.join('/')} 开头，当前运单号 "${trackingNumber}" 格式不符。请确认运单号是否正确。`
      }
    }
  }

  return { valid: true, warning: '' }
}

/**
 * 获取保存的打印机列表
 */
export function getSavedPrinters(): PrinterConfig[] {
  try {
    const data = localStorage.getItem(printTenantKey(STORAGE_KEY_PRINTERS))
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('读取打印机配置失败:', e)
  }
  return [DEFAULT_PRINTER_CONFIG]
}

/**
 * 保存打印机列表
 */
export function savePrinters(printers: PrinterConfig[]) {
  try {
    localStorage.setItem(printTenantKey(STORAGE_KEY_PRINTERS), JSON.stringify(printers))
  } catch (e) {
    console.error('保存打印机配置失败:', e)
  }
}

/**
 * 获取默认打印机
 */
export function getDefaultPrinter(): PrinterConfig {
  const printers = getSavedPrinters()
  const defaultId = localStorage.getItem(printTenantKey(STORAGE_KEY_DEFAULT))
  if (defaultId) {
    const found = printers.find(p => p.id === defaultId)
    if (found) return found
  }
  return printers.find(p => p.isDefault) || printers[0] || DEFAULT_PRINTER_CONFIG
}

/**
 * 设置默认打印机
 */
export function setDefaultPrinter(id: string) {
  localStorage.setItem(printTenantKey(STORAGE_KEY_DEFAULT), id)
  const printers = getSavedPrinters()
  printers.forEach(p => p.isDefault = p.id === id)
  savePrinters(printers)
}

/**
 * 手机号加密显示
 */
export function maskPhone(phone: string, mode: 'full' | 'partial' | 'hidden' = 'partial'): string {
  if (!phone) return ''
  if (mode === 'full') return phone
  if (mode === 'hidden') return '***'
  // partial: 138****5678
  if (phone.length >= 7) {
    return phone.substring(0, 3) + '****' + phone.substring(phone.length - 4)
  }
  return phone.substring(0, 2) + '****'
}

/**
 * 地址路由码（大头笔）- 从收件地址提取目的地简码
 */
export function addressToRouteCode(address: string): string {
  if (!address) return '---'
  const routeMap: Record<string, string> = {
    '北京': '京', '上海': '沪', '天津': '津', '重庆': '渝',
    '广州': '穗', '深圳': '深', '杭州': '杭', '南京': '宁',
    '成都': '蓉', '武汉': '汉', '西安': '陕', '长沙': '湘',
    '郑州': '郑', '青岛': '青', '大连': '连', '宁波': '甬',
    '厦门': '厦', '福州': '榕', '济南': '济', '合肥': '合',
    '昆明': '昆', '沈阳': '沈', '哈尔滨': '哈', '长春': '长',
    '南宁': '邕', '贵阳': '筑', '兰州': '兰', '太原': '并',
    '石家庄': '冀', '呼和浩特': '呼', '乌鲁木齐': '乌', '拉萨': '藏',
    '海口': '琼', '银川': '银', '西宁': '宁', '苏州': '苏',
    '无锡': '锡', '佛山': '佛', '东莞': '莞', '温州': '温',
  }
  // 提取区级: "北京市朝阳区" => "京-朝"
  const cityMatch = Object.keys(routeMap).find(c => address.includes(c))
  const cityCode = cityMatch ? routeMap[cityMatch] : address.substring(0, 1)
  // 尝试提取区/县
  const districtMatch = address.match(/([^\s市省]{1,4}[区县旗])/)?.[1]
  const districtShort = districtMatch ? districtMatch.replace(/[区县旗]$/, '').slice(-1) : ''
  return districtShort ? `${cityCode}-${districtShort}` : cityCode
}

/**
 * 生成面单HTML内容（仿真电子面单，与Vue对话框预览完全同步）
 * 使用 .sl-* CSS 类名体系，与 PrintLabelDialog.vue 保持一致
 * 支持内联预生成的 SVG 条形码和 DataURL 二维码，无需 CDN
 */
export function generateLabelHTML(data: LabelData, _config: PrinterConfig): string {
  const privacyMode = data.privacyMode || 'partial'
  const namePrivacy = data.namePrivacy || 'full'
  const addressPrivacy = data.addressPrivacy || 'full'
  const receiverPhone = maskPhone(data.receiverPhone, privacyMode)
  const senderPhone = maskPhone(data.senderPhone, privacyMode)
  // 导入 name/address masking from labelTemplates (inline simple logic to avoid circular deps)
  const maskedReceiverName = namePrivacy === 'full' ? data.receiverName :
    namePrivacy === 'hidden' ? '***' :
    (data.receiverName.length <= 1 ? data.receiverName :
     data.receiverName.length === 2 ? data.receiverName[0] + '*' :
     data.receiverName[0] + '*'.repeat(data.receiverName.length - 2) + data.receiverName[data.receiverName.length - 1])
  const maskedReceiverAddress = addressPrivacy === 'full' ? data.receiverAddress :
    addressPrivacy === 'hidden' ? '***' :
    (() => {
      const addr = data.receiverAddress
      const match = addr.match(/^(.{2,}?(?:省|自治区|市|特别行政区))(.{1,}?(?:市|区|县|旗|盟|州))(.*)/)
      if (match) return match[1] + match[2] + '****'
      const simpleMatch = addr.match(/^(.+?(?:市|区|县))(.*)/)
      if (simpleMatch && simpleMatch[2].length > 2) return simpleMatch[1] + '****'
      return addr.length > 6 ? addr.substring(0, 6) + '****' : addr
    })()
  const productsText = data.products?.map(p => `${p.name}\u00d7${p.quantity}`).join('\u3001') || '-'
  const routeCode = addressToRouteCode(data.receiverAddress)
  const tn = data.trackingNumber || ''
  const qrContent = tn || data.orderNo || ''
  const qrDataUrl = (data as any).qrDataUrl || ''
  const barcodeTopSvg = (data as any).barcodeTopSvg || ''
  const barcodeBottomSvg = (data as any).barcodeBottomSvg || ''

  // 顶部条形码区域：优先使用预生成SVG，其次CDN渲染，最后占位符
  let barcodeTopHTML: string
  if (barcodeTopSvg) {
    barcodeTopHTML = barcodeTopSvg
  } else if (tn) {
    barcodeTopHTML = '<svg class="barcode-top-svg"></svg>'
  } else {
    barcodeTopHTML = '<div class="barcode-placeholder">\u5f85\u751f\u6210\u7269\u6d41\u5355\u53f7</div>'
  }

  // 底部条形码区域
  let barcodeBottomHTML: string
  if (barcodeBottomSvg) {
    barcodeBottomHTML = barcodeBottomSvg
  } else if (tn) {
    barcodeBottomHTML = '<svg class="sl-barcode-btm-svg barcode-btm-svg"></svg>'
  } else {
    barcodeBottomHTML = '<div class="barcode-placeholder-sm">\u5f85\u751f\u6210\u7269\u6d41\u5355\u53f7</div>'
  }

  // 二维码区域：优先 dataURL img，其次 CDN canvas，最后占位符
  let qrHTML: string
  if (qrDataUrl) {
    qrHTML = `<img class="sl-qrcode" src="${qrDataUrl}" width="64" height="64" />`
  } else if (qrContent) {
    qrHTML = '<canvas class="sl-qrcode qrcode-canvas" width="64" height="64"></canvas>'
  } else {
    qrHTML = '<div class="sl-qrcode qrcode-placeholder"></div>'
  }

  const trackingDisplay = tn || '\u5f85\u751f\u6210\u7269\u6d41\u5355\u53f7'

  return `
    <div class="sl" data-tracking="${tn}" data-qr="${qrContent}">
      <div class="sl-header">
        <div class="sl-company">${data.logisticsCompany || '\u7269\u6d41\u516c\u53f8'}</div>
        <div class="sl-route-code">${routeCode}</div>
      </div>
      <div class="sl-barcode-top">
        ${barcodeTopHTML}
        <div class="sl-tracking-no">${trackingDisplay}</div>
      </div>
      <div class="sl-addr-block sl-recv">
        <div class="sl-addr-row">
          <span class="sl-tag sl-tag-recv">\u6536</span>
          <span class="sl-name">${maskedReceiverName}</span>
          <span class="sl-phone">${receiverPhone}</span>
        </div>
        <div class="sl-addr-detail">${maskedReceiverAddress}</div>
      </div>
      <div class="sl-addr-block sl-send">
        <div class="sl-addr-row">
          <span class="sl-tag sl-tag-send">\u5bc4</span>
          <span class="sl-name-sm">${data.senderName}</span>
          <span class="sl-phone-sm">${senderPhone}</span>
        </div>
        <div class="sl-addr-detail-sm">${data.senderAddress}</div>
      </div>
      ${data.showProducts !== false ? `<div class="sl-info-row"><b>\u5546\u54c1\uff1a</b>${productsText}</div>` : ''}
      ${data.showCodAmount !== false && data.codAmount > 0 ? `<div class="sl-info-row sl-cod"><b>\u4ee3\u6536\u6b3e\uff1a\u00a5${data.codAmount.toFixed(2)}</b></div>` : ''}
      ${data.showRemark && data.remark ? `<div class="sl-info-row sl-remark"><b>\u5907\u6ce8\uff1a</b><span>${data.remark}</span></div>` : ''}
      <div class="sl-bottom">
        ${qrHTML}
        <div class="sl-bottom-right">
          ${barcodeBottomHTML}
          <div class="sl-order-info">
            <span>\u8ba2\u5355\u53f7\uff1a${data.orderNo}</span>
            ${data.createTime ? `<span class="sl-time">${data.createTime}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `
}

/**
 * 面单共用 CSS（与 PrintLabelDialog.vue 的 .sl-* 样式完全一致）
 */
function getLabelCSS(paperW: number, paperH: number): string {
  return `
    /* ===== 仿真面单样式 - 与对话框预览完全同步 ===== */
    .sl {
      width: ${paperW}mm;
      background: #fff; border: 2px solid #000;
      padding: 8px 10px; font-family: 'Microsoft YaHei','PingFang SC',Arial,sans-serif;
      font-size: 11px; color: #000; box-sizing: border-box;
      page-break-after: always;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .sl:last-child { page-break-after: auto; }

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
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    .sl-tag-recv { background: #1a1a1a !important; color: #fff !important; }
    .sl-tag-send { background: #2b6cb0 !important; color: #fff !important; }
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

    /* 加载遮罩 */
    .print-loading-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255,255,255,0.96); display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 9999;
      transition: opacity 0.3s;
    }
    .print-loading-overlay.hidden { opacity: 0; pointer-events: none; }
    .print-loading-text { font-size: 16px; color: #333; margin-bottom: 12px; font-family: 'Microsoft YaHei',sans-serif; }
    .print-loading-sub { font-size: 13px; color: #999; margin-top: 8px; font-family: 'Microsoft YaHei',sans-serif; }
    .print-spinner {
      width: 36px; height: 36px; border: 3px solid #e0e0e0;
      border-top: 3px solid #409eff; border-radius: 50%;
      animation: print-spin 0.8s linear infinite;
    }
    @keyframes print-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
  `
}

/**
 * 生成打印页面完整HTML
 * 所有条形码/二维码已通过 prepareLabelCodes() 预生成为内联SVG/DataURL，无需CDN
 * @param layout 'grid' 横排网格 | 'vertical' 竖排（默认）
 * @param showPrintToolbar 是否显示打印工具栏（预览模式下显示）
 * @param defaultPrintMode 默认打印方式
 */
export function generatePrintPageHTML(labels: string[], config: PrinterConfig, layout: 'grid' | 'vertical' = 'vertical', showPrintToolbar = false, defaultPrintMode: 'browser' | 'lodop' | 'usb' = 'browser'): string {
  const paperW = config.paperWidth
  const paperH = config.paperHeight
  const isGrid = layout === 'grid'
  const labelCSS = getLabelCSS(paperW, paperH)
  const labelCount = labels.length

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>面单预览 (${labelCount}张)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #fff; }
    ${labelCSS}
    /* 打印工具栏 */
    .print-toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #fff; border-bottom: 1px solid #e0e0e0;
      padding: 10px 20px; display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-family: 'Microsoft YaHei','PingFang SC',sans-serif;
    }
    .print-toolbar-info { font-size: 14px; color: #333; display: flex; align-items: center; gap: 12px; }
    .print-toolbar-info b { color: #409eff; }
    .print-toolbar-right { display: flex; align-items: center; gap: 10px; }
    .print-mode-select {
      padding: 6px 10px; font-size: 13px; border: 1px solid #dcdfe6; border-radius: 4px;
      background: #fff; color: #303133; cursor: pointer; outline: none;
    }
    .print-mode-select:focus { border-color: #409eff; }
    .print-toolbar-btn {
      padding: 8px 24px; font-size: 14px; font-weight: 600;
      color: #fff; background: #409eff; border: none; border-radius: 6px;
      cursor: pointer; transition: background 0.2s;
    }
    .print-toolbar-btn:hover { background: #337ecc; }
    .print-toolbar-btn.lodop-btn { background: #67c23a; }
    .print-toolbar-btn.lodop-btn:hover { background: #529b2e; }
    .print-status { font-size: 12px; color: #67c23a; font-weight: 500; display: none; }
    @media print {
      @page {
        size: ${paperW}mm ${paperH}mm;
        margin: 0;
      }
      body { margin: 0; padding: 0; }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .sl {
        page-break-after: always;
        border: none !important;
      }
      .sl-tag-recv { background: #1a1a1a !important; color: #fff !important; }
      .sl-tag-send { background: #2b6cb0 !important; color: #fff !important; }
      .sl:last-child { page-break-after: auto; }
      .print-toolbar { display: none !important; }
      .labels-container { display: block !important; padding-top: 0 !important; }
    }
    @media screen {
      body { background: #f0f0f0; padding: 20px; }
      ${showPrintToolbar ? '.labels-container { padding-top: 56px; }' : ''}
      ${isGrid ? `
      .labels-container {
        display: flex; flex-wrap: wrap; gap: 20px;
        justify-content: center; align-items: flex-start; padding: 10px;
        ${showPrintToolbar ? 'padding-top: 66px;' : ''}
      }
      .sl { box-shadow: 0 2px 10px rgba(0,0,0,0.15); flex: 0 0 auto; }
      ` : `
      .sl { margin: 10px auto; box-shadow: 0 2px 10px rgba(0,0,0,0.15); }
      `}
    }
  </style>
</head>
<body>
  ${showPrintToolbar ? `
  <div class="print-toolbar">
    <span class="print-toolbar-info">
      共 <b>${labelCount}</b> 张面单，每张一页纸
      <span class="print-status" id="printStatus"></span>
    </span>
    <div class="print-toolbar-right">
      <select class="print-mode-select" id="printModeSelect" onchange="onModeChange()">
        <option value="browser" ${defaultPrintMode === 'browser' ? 'selected' : ''}>🖨️ 浏览器打印</option>
        <option value="lodop" ${defaultPrintMode === 'lodop' ? 'selected' : ''}>🔌 LODOP打印</option>
      </select>
      <button class="print-toolbar-btn" id="printBtn" onclick="doPrint()">🖨️ 打印全部面单</button>
    </div>
  </div>
  <script>
    var _printChannel = null;
    try { _printChannel = new BroadcastChannel('crm-label-print'); } catch(e) {}
    var _currentMode = '${defaultPrintMode}';

    function onModeChange() {
      _currentMode = document.getElementById('printModeSelect').value;
      var btn = document.getElementById('printBtn');
      if (_currentMode === 'lodop') {
        btn.className = 'print-toolbar-btn lodop-btn';
        btn.textContent = '🔌 LODOP打印全部面单';
      } else {
        btn.className = 'print-toolbar-btn';
        btn.textContent = '🖨️ 打印全部面单';
      }
    }
    // 初始化按钮样式
    onModeChange();

    function showStatus(text, color) {
      var s = document.getElementById('printStatus');
      s.textContent = text;
      s.style.color = color || '#67c23a';
      s.style.display = 'inline';
      setTimeout(function() { s.style.display = 'none'; }, 5000);
    }

    function notifyPrintDone() {
      var msg = { type: 'label-print-done', count: ${labelCount} };
      if (_printChannel) { try { _printChannel.postMessage(msg); } catch(e) {} }
      if (window.opener) { try { window.opener.postMessage(msg, '*'); } catch(e) {} }
    }

    function doPrint() {
      if (_currentMode === 'lodop') {
        // 请求父窗口使用LODOP打印
        var labelsHTML = document.querySelector('.labels-container').innerHTML;
        var msg = {
          type: 'lodop-print-request',
          htmlContent: document.documentElement.outerHTML,
          labelsHTML: labelsHTML,
          count: ${labelCount}
        };
        if (_printChannel) { try { _printChannel.postMessage(msg); } catch(e) {} }
        if (window.opener) { try { window.opener.postMessage(msg, '*'); } catch(e) {} }
        showStatus('已发送LODOP打印请求，等待父窗口处理...', '#e6a23c');
      } else {
        window.print();
      }
    }

    // 浏览器打印完成后通知
    window.onafterprint = function() {
      notifyPrintDone();
    };

    // 监听来自父窗口的回复消息
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'lodop-print-result') {
        if (e.data.success) {
          showStatus('✅ LODOP打印成功！', '#67c23a');
          notifyPrintDone();
        } else {
          showStatus('❌ LODOP打印失败: ' + (e.data.message || ''), '#f56c6c');
        }
      }
    });
    if (_printChannel) {
      _printChannel.onmessage = function(ev) {
        if (ev.data && ev.data.type === 'lodop-print-result') {
          if (ev.data.success) {
            showStatus('✅ LODOP打印成功！', '#67c23a');
            notifyPrintDone();
          } else {
            showStatus('❌ LODOP打印失败: ' + (ev.data.message || ''), '#f56c6c');
          }
        }
      };
    }
  <\/script>` : ''}
  <div class="labels-container">
    ${labels.join('\n')}
  </div>
</body>
</html>`
}

/**
 * 浏览器打印面单（所有编码前置生成，新窗口秒开）
 * @returns Promise<'printed'|'cancelled'>
 */
export function printLabels(labels: LabelData[], config: PrinterConfig): Promise<'printed' | 'cancelled'> {
  return new Promise(async (resolve) => {
    // 前置预生成所有条形码SVG + 二维码DataURL（本地包，无CDN）
    const labelsReady = await Promise.all(labels.map(l => prepareLabelCodes(l)))
    const htmlLabels = labelsReady.map(l => generateLabelHTML(l, config))
    const fullHTML = generatePrintPageHTML(htmlLabels, config)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      resolve('cancelled')
      return
    }

    printWindow.document.write(fullHTML)
    printWindow.document.close()

    let resolved = false
    const doResolve = () => {
      if (resolved) return
      resolved = true
      resolve('printed')
    }

    // 所有内容已内联，直接打印
    const triggerPrint = () => {
      // ⚠️ 关键：onafterprint 必须在 print() 之前设置
      printWindow.onafterprint = () => {
        printWindow.close()
        doResolve()
      }
      printWindow.focus()
      printWindow.print()
      // 兼容不支持 onafterprint 的浏览器：5秒后强制 resolve
      setTimeout(doResolve, 5000)
    }

    // onload 触发打印，同时设置备用定时器
    let triggered = false
    printWindow.onload = () => {
      if (!triggered) { triggered = true; setTimeout(triggerPrint, 100) }
    }
    // 备用：300ms 后如果 onload 还没触发，直接打印
    setTimeout(() => {
      if (!triggered) { triggered = true; triggerPrint() }
    }, 300)
  })
}

/**
 * 预览面单（打开新窗口，不自动打印，右上角有打印按钮）
 * @param layout 'grid' 横排网格 | 'vertical' 竖排
 * @param printMode 默认打印方式
 */
export async function previewLabels(labels: LabelData[], config: PrinterConfig, layout: 'grid' | 'vertical' = 'vertical', printMode: 'browser' | 'lodop' | 'usb' = 'browser'): Promise<Window | null> {
  // 前置预生成所有编码
  const labelsReady = await Promise.all(labels.map(l => prepareLabelCodes(l)))
  const htmlLabels = labelsReady.map(l => generateLabelHTML(l, config))
  // showPrintToolbar=true 显示打印工具栏
  const fullHTML = generatePrintPageHTML(htmlLabels, config, layout, true, printMode)

  const previewWindow = window.open('', '_blank')
  if (!previewWindow) return null

  previewWindow.document.write(fullHTML)
  previewWindow.document.close()
  return previewWindow
}

/**
 * 生成LODOP打印用完整HTML（包含CSS样式，确保排版与预览一致）
 */
export function generateLodopFullHTML(labelsHTML: string[], config: PrinterConfig): string {
  const labelCSS = getLabelCSS(config.paperWidth, config.paperHeight)
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; margin: 0; padding: 0; }
  ${labelCSS}
  .sl {
    page-break-after: always;
  }
  .sl:last-child { page-break-after: auto; }
  .sl-tag-recv { background: #1a1a1a !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .sl-tag-send { background: #2b6cb0 !important; color: #fff !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
</style>
</head>
<body>
${labelsHTML.join('\n')}
</body>
</html>`
}

/**
 * 生成打印面单所需的LabelData（从订单数据转换）
 */
export function orderToLabelData(order: any, companyInfo: any, options?: {
  logisticsCompany?: string
  logisticsCode?: string
  trackingNumber?: string
  showProducts?: boolean
  showRemark?: boolean
  showCodAmount?: boolean
  privacyMode?: 'full' | 'partial' | 'hidden'
  namePrivacy?: 'full' | 'partial' | 'hidden'
  addressPrivacy?: 'full' | 'partial' | 'hidden'
}): LabelData {
  const products = Array.isArray(order.products) ? order.products : []

  return {
    logisticsCompany: options?.logisticsCompany || order.expressCompanyName || order.expressCompany || '',
    logisticsCode: options?.logisticsCode || order.expressCompany || '',
    trackingNumber: options?.trackingNumber || order.trackingNumber || order.expressNo || '',
    receiverName: order.customerName || '',
    receiverPhone: order.phone || order.customerPhone || '',
    receiverAddress: order.address || order.receiverAddress || '',
    senderName: companyInfo?.senderName || '客服中心',
    senderPhone: companyInfo?.senderPhone || '',
    senderAddress: companyInfo?.senderAddress || '',
    orderNo: order.orderNo || order.orderNumber || '',
    products: products.map((p: any) => ({ name: p.name || '', quantity: p.quantity || 1 })),
    totalAmount: order.totalAmount || 0,
    codAmount: order.codAmount || order.collectAmount || 0,
    deposit: order.deposit || order.depositAmount || 0,
    remark: order.remark || '',
    serviceWechat: order.serviceWechat || '',
    createTime: order.createTime || '',
    showProducts: options?.showProducts !== false,
    showRemark: options?.showRemark || false,
    showCodAmount: options?.showCodAmount !== false,
    privacyMode: options?.privacyMode || 'partial',
    namePrivacy: options?.namePrivacy || 'full',
    addressPrivacy: options?.addressPrivacy || 'full',
  }
}

