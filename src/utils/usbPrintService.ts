/**
 * USB 直连热敏打印机服务（WebUSB API）
 * 支持 ESC/POS 协议的热敏打印机
 * 注意：WebUSB 需要 HTTPS 环境或 localhost
 */

// WebUSB 类型声明（浏览器原生API，TS标准库暂未内置）
declare global {
  interface Navigator {
    usb?: {
      requestDevice(options: { filters: Array<Record<string, any>> }): Promise<any>
      addEventListener(type: string, listener: (event: any) => void): void
      removeEventListener(type: string, listener: (event: any) => void): void
    }
  }
}

export type UsbPrintStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected' | 'error'

interface UsbPrinterInfo {
  device: any  // USBDevice
  name: string
  vendorId: number
  productId: number
  interfaceNumber: number
  endpointNumber: number
}

// 常见热敏打印机的 USB Vendor ID（支持 ESC/POS 协议的打印机）
const KNOWN_THERMAL_PRINTER_VENDORS = [
  { vendorId: 0x0483, name: 'STMicroelectronics (热敏打印机)' },
  { vendorId: 0x0416, name: 'Winbond (热敏打印机)' },
  { vendorId: 0x04B8, name: 'Epson (热敏)' },
  { vendorId: 0x04F9, name: 'Brother (热敏)' },
  { vendorId: 0x0519, name: 'Star Micronics' },
  { vendorId: 0x0FE6, name: 'Kontron / 佳博' },
  { vendorId: 0x1504, name: 'HPRT (汉印)' },
  { vendorId: 0x0DD4, name: 'Xiamen Chenglian (得力)' },
  { vendorId: 0x0A5F, name: 'Zebra' },
  { vendorId: 0x1203, name: 'TSC (台半)' },
  { vendorId: 0x20D1, name: 'SNBC (新北洋)' },
]

// 常规打印机（不支持 WebUSB 直连，需要使用 LODOP 或浏览器打印）
const REGULAR_PRINTER_VENDORS = [
  { vendorId: 0x03F0, name: 'HP (惠普)' },
  { vendorId: 0x04A9, name: 'Canon (佳能)' },
  { vendorId: 0x04B8, name: 'Epson (爱普生)' },
  { vendorId: 0x04F9, name: 'Brother (兄弟)' },
  { vendorId: 0x413C, name: 'Dell (戴尔)' },
  { vendorId: 0x04E8, name: 'Samsung (三星)' },
  { vendorId: 0x0924, name: 'Xerox (施乐)' },
  { vendorId: 0x1005, name: 'Acer (宏碁)' },
]

// 合并所有已知打印机（用于设备选择列表）
const KNOWN_PRINTER_VENDORS = [
  ...KNOWN_THERMAL_PRINTER_VENDORS,
  ...REGULAR_PRINTER_VENDORS,
]

/**
 * 检测设备是否为常规打印机（不支持 ESC/POS 协议）
 */
function isRegularPrinter(vendorId: number): boolean {
  return REGULAR_PRINTER_VENDORS.some(v => v.vendorId === vendorId)
}

let _connectedDevice: UsbPrinterInfo | null = null
let _status: UsbPrintStatus = 'disconnected'
let _statusCallbacks: Array<(status: UsbPrintStatus) => void> = []

/**
 * 检查 WebUSB 是否可用
 */
export function isWebUsbAvailable(): boolean {
  return !!navigator.usb
}

/**
 * 获取 USB 打印状态
 */
export function getUsbPrintStatus(): UsbPrintStatus {
  if (!isWebUsbAvailable()) return 'unavailable'
  return _status
}

/**
 * 监听状态变化
 */
export function onUsbStatusChange(callback: (status: UsbPrintStatus) => void) {
  _statusCallbacks.push(callback)
  return () => {
    _statusCallbacks = _statusCallbacks.filter(cb => cb !== callback)
  }
}

function setUsbStatus(status: UsbPrintStatus) {
  _status = status
  _statusCallbacks.forEach(cb => cb(status))
}

/**
 * 获取当前连接的设备信息
 */
export function getConnectedDevice(): UsbPrinterInfo | null {
  return _connectedDevice
}

/**
 * 获取设备友好名称
 */
function getDeviceFriendlyName(device: any): string {
  if (device.productName) return device.productName
  const vendor = KNOWN_PRINTER_VENDORS.find(v => v.vendorId === device.vendorId)
  if (vendor) return `${vendor.name} (${device.vendorId.toString(16)}:${device.productId.toString(16)})`
  return `USB打印机 (${device.vendorId.toString(16)}:${device.productId.toString(16)})`
}

/**
 * 请求连接 USB 打印机
 */
export async function requestUsbPrinter(): Promise<UsbPrinterInfo | null> {
  if (!isWebUsbAvailable()) {
    throw new Error('当前浏览器不支持 WebUSB。请使用 Chrome/Edge 浏览器，并确保使用 HTTPS 或 localhost 访问。')
  }

  setUsbStatus('connecting')

  try {
    // 请求用户选择打印机设备
    // 筛选条件：USB 打印机类 (classCode: 7)
    const device = await navigator.usb!.requestDevice({
      filters: [
        { classCode: 7 }, // Printer class
        ...KNOWN_PRINTER_VENDORS.map(v => ({ vendorId: v.vendorId })),
      ],
    })

    if (!device) {
      setUsbStatus('disconnected')
      return null
    }

    // 检测是否为常规打印机（HP、佳能等），提前给出友好提示
    if (isRegularPrinter(device.vendorId)) {
      const vendorInfo = REGULAR_PRINTER_VENDORS.find(v => v.vendorId === device.vendorId)
      setUsbStatus('error')
      throw new Error(
        `检测到 ${vendorInfo?.name || '常规'} 打印机，该类型打印机不支持 WebUSB 直连（ESC/POS 协议）。\n` +
        '请使用以下方式打印：\n' +
        '1.【推荐】安装 LODOP/C-Lodop 打印控件（http://www.lodop.net/download.html）\n' +
        '2. 使用浏览器内置打印功能（Ctrl+P）'
      )
    }

    // 打开设备
    await device.open()

    // 查找打印机接口和端点
    let interfaceNumber = -1
    let endpointNumber = -1

    for (const config of device.configurations) {
      for (const iface of config.interfaces) {
        for (const alt of iface.alternates) {
          // 查找 Printer class (7) 或 Vendor Specific (255)
          if (alt.interfaceClass === 7 || alt.interfaceClass === 255) {
            interfaceNumber = iface.interfaceNumber
            // 查找 OUT 端点（用于发送数据到打印机）
            for (const endpoint of alt.endpoints) {
              if (endpoint.direction === 'out') {
                endpointNumber = endpoint.endpointNumber
                break
              }
            }
            if (endpointNumber >= 0) break
          }
        }
        if (endpointNumber >= 0) break
      }
      if (endpointNumber >= 0) break
    }

    if (interfaceNumber < 0 || endpointNumber < 0) {
      await device.close()
      setUsbStatus('error')
      throw new Error('未找到打印机接口，该设备可能不是打印机或不兼容。')
    }

    // 声明接口
    try {
      await device.claimInterface(interfaceNumber)
    } catch (claimError: any) {
      await device.close()
      setUsbStatus('error')
      if (claimError?.message?.includes('Unable to claim interface')) {
        throw new Error(
          'USB 接口被系统打印驱动占用，无法通过 WebUSB 直连。\n' +
          '解决方案：\n' +
          '1.【推荐】使用 LODOP/C-Lodop 打印控件（支持所有打印机，包括 HP 等常规打印机）\n' +
          '2. 如果是热敏打印机，可在"设备管理器"中禁用该打印机驱动后重试\n' +
          '3. HP、佳能等常规打印机不支持 WebUSB 直连，请使用 LODOP 或浏览器打印'
        )
      }
      throw claimError
    }

    const printerInfo: UsbPrinterInfo = {
      device,
      name: getDeviceFriendlyName(device),
      vendorId: device.vendorId,
      productId: device.productId,
      interfaceNumber,
      endpointNumber,
    }

    _connectedDevice = printerInfo
    setUsbStatus('connected')

    // 监听断开事件
    navigator.usb?.addEventListener('disconnect', (event: any) => {
      if (event.device === device) {
        _connectedDevice = null
        setUsbStatus('disconnected')
      }
    })

    return printerInfo
  } catch (e: any) {
    if (e.name === 'NotFoundError') {
      // 用户取消了选择
      setUsbStatus('disconnected')
      return null
    }
    setUsbStatus('error')
    throw e
  }
}

/**
 * 断开 USB 打印机
 */
export async function disconnectUsbPrinter(): Promise<void> {
  if (_connectedDevice) {
    try {
      await _connectedDevice.device.releaseInterface(_connectedDevice.interfaceNumber)
      await _connectedDevice.device.close()
    } catch (e) {
      console.warn('断开USB打印机失败:', e)
    }
    _connectedDevice = null
    setUsbStatus('disconnected')
  }
}

/**
 * 发送原始字节数据到打印机
 */
export async function sendRawData(data: Uint8Array): Promise<boolean> {
  if (!_connectedDevice) {
    throw new Error('USB打印机未连接')
  }

  try {
    const result = await _connectedDevice.device.transferOut(
      _connectedDevice.endpointNumber,
      data
    )
    return result.status === 'ok'
  } catch (e) {
    console.error('USB发送数据失败:', e)
    throw e
  }
}

// =============== ESC/POS 指令构建器 ===============

const ESC = 0x1B
const GS = 0x1D
const LF = 0x0A

/**
 * ESC/POS 指令构建器
 */
export class EscPosBuilder {
  private commands: number[] = []
  private encoder = new TextEncoder()

  /** 初始化打印机 */
  init(): this {
    this.commands.push(ESC, 0x40) // ESC @
    return this
  }

  /** 设置字体大小（倍宽倍高） */
  setFontSize(widthMultiplier: number = 1, heightMultiplier: number = 1): this {
    const n = ((widthMultiplier - 1) << 4) | (heightMultiplier - 1)
    this.commands.push(GS, 0x21, n) // GS !
    return this
  }

  /** 设置粗体 */
  setBold(bold: boolean): this {
    this.commands.push(ESC, 0x45, bold ? 1 : 0) // ESC E
    return this
  }

  /** 设置对齐方式 0=左 1=居中 2=右 */
  setAlign(align: 0 | 1 | 2): this {
    this.commands.push(ESC, 0x61, align) // ESC a
    return this
  }

  /** 打印文本 */
  text(content: string): this {
    // 使用 GBK 编码（中文打印机通常使用 GBK）
    // 浏览器默认 TextEncoder 只支持 UTF-8，对于中文需要特殊处理
    const bytes = this.encoder.encode(content)
    this.commands.push(...bytes)
    return this
  }

  /** 换行 */
  newline(lines: number = 1): this {
    for (let i = 0; i < lines; i++) {
      this.commands.push(LF)
    }
    return this
  }

  /** 打印分割线 */
  separator(char: string = '-', width: number = 32): this {
    this.text(char.repeat(width))
    this.newline()
    return this
  }

  /** 打印条形码 CODE128 */
  barcode128(content: string): this {
    // 设置条码高度
    this.commands.push(GS, 0x68, 80) // GS h 80
    // 设置条码宽度
    this.commands.push(GS, 0x77, 2) // GS w 2
    // 设置HRI打印位置（条码下方）
    this.commands.push(GS, 0x48, 2) // GS H 2
    // CODE128 类型 = 73
    const bytes = this.encoder.encode(content)
    this.commands.push(GS, 0x6B, 73, bytes.length, ...bytes)
    this.newline()
    return this
  }

  /** 打印二维码 */
  qrcode(content: string, size: number = 6): this {
    const bytes = this.encoder.encode(content)
    const dataLen = bytes.length + 3
    // 设置模块大小
    this.commands.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x43, size)
    // 设置纠错等级 L=48, M=49, Q=50, H=51
    this.commands.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x45, 49)
    // 存储数据
    this.commands.push(GS, 0x28, 0x6B, dataLen & 0xFF, (dataLen >> 8) & 0xFF, 0x31, 0x50, 0x30, ...bytes)
    // 打印
    this.commands.push(GS, 0x28, 0x6B, 3, 0, 0x31, 0x51, 0x30)
    this.newline()
    return this
  }

  /** 走纸并切纸 */
  cutPaper(): this {
    this.newline(3)
    this.commands.push(GS, 0x56, 0x00) // GS V 0 (全切)
    return this
  }

  /** 构建字节数据 */
  build(): Uint8Array {
    return new Uint8Array(this.commands)
  }
}

/**
 * 使用 ESC/POS 打印面单（简化版，适合热敏打印机）
 */
export async function usbPrintLabel(options: {
  logisticsCompany: string
  trackingNumber: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  senderName?: string
  senderPhone?: string
  senderAddress?: string
  products?: string
  orderNo: string
  codAmount?: number
  remark?: string
}): Promise<boolean> {
  if (!_connectedDevice) {
    throw new Error('USB打印机未连接')
  }

  const builder = new EscPosBuilder()

  builder
    .init()
    // 物流公司名 + 运单号
    .setAlign(1)
    .setFontSize(2, 2)
    .setBold(true)
    .text(options.logisticsCompany)
    .newline()
    .setFontSize(1, 1)
    .setBold(false)
    .newline()

  // 条形码
  if (options.trackingNumber) {
    builder
      .setAlign(1)
      .barcode128(options.trackingNumber)
      .setAlign(1)
      .setBold(true)
      .text(options.trackingNumber)
      .newline()
      .setBold(false)
  }

  builder.separator('=')

  // 收件人信息
  builder
    .setAlign(0)
    .setBold(true)
    .text('[收] ')
    .setFontSize(1, 2)
    .text(options.receiverName)
    .setFontSize(1, 1)
    .text('  ' + options.receiverPhone)
    .newline()
    .setBold(false)
    .text('    ' + options.receiverAddress)
    .newline()

  builder.separator('-')

  // 寄件人信息
  if (options.senderName) {
    builder
      .text('[寄] ' + options.senderName)
      .text('  ' + (options.senderPhone || ''))
      .newline()
    if (options.senderAddress) {
      builder.text('    ' + options.senderAddress).newline()
    }
    builder.separator('-')
  }

  // 商品信息
  if (options.products) {
    builder.text('商品: ' + options.products).newline()
  }

  // 代收款
  if (options.codAmount && options.codAmount > 0) {
    builder
      .setBold(true)
      .setFontSize(1, 2)
      .text('代收款: ¥' + options.codAmount.toFixed(2))
      .setFontSize(1, 1)
      .setBold(false)
      .newline()
  }

  // 备注
  if (options.remark) {
    builder.text('备注: ' + options.remark).newline()
  }

  builder.separator('-')

  // 二维码
  if (options.trackingNumber) {
    builder
      .setAlign(1)
      .qrcode(options.trackingNumber, 5)
  }

  // 订单号
  builder
    .setAlign(0)
    .text('订单号: ' + options.orderNo)
    .newline()

  // 切纸
  builder.cutPaper()

  const data = builder.build()
  return await sendRawData(data)
}

/**
 * USB 打印测试页
 */
export async function usbPrintTestPage(): Promise<boolean> {
  return usbPrintLabel({
    logisticsCompany: '测试物流公司',
    trackingNumber: 'TEST' + Date.now().toString().slice(-10),
    receiverName: '张三',
    receiverPhone: '13812345678',
    receiverAddress: '广东省深圳市南山区科技园路xxx号',
    senderName: '客服中心',
    senderPhone: '01012345678',
    senderAddress: '北京市朝阳区科技园区xxx号',
    products: '测试商品A×2、测试商品B×1',
    orderNo: 'TEST-ORDER-001',
    codAmount: 299,
    remark: '这是USB直连测试打印',
  })
}

