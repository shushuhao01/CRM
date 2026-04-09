/**
 * LODOP/C-Lodop 打印控件集成服务
 * C-Lodop 通过本地HTTP服务与浏览器通信，无需ActiveX
 * 安装地址: http://www.lodop.net/download.html
 */

// C-Lodop 连接状态
export type LodopStatus = 'disconnected' | 'connecting' | 'connected' | 'not-installed'

interface LodopInstance {
  SET_PRINT_PAGESIZE: (intOrient: number, pageWidth: string | number, pageHeight: string | number, strPageName: string) => void
  ADD_PRINT_TEXT: (top: string | number, left: string | number, width: string | number, height: string | number, text: string) => void
  ADD_PRINT_HTM: (top: string | number, left: string | number, width: string | number, height: string | number, html: string) => void
  ADD_PRINT_BARCODE: (top: string | number, left: string | number, width: string | number, height: string | number, type: string, value: string) => void
  SET_PRINT_STYLEA: (itemIndex: number, styleName: string, value: any) => void
  SET_PRINTER_INDEX: (index: number | string) => boolean
  PRINT: () => void
  PREVIEW: () => void
  PRINT_INIT: (title: string) => void
  GET_PRINTER_COUNT: () => number
  GET_PRINTER_NAME: (index: number) => string
  PRINT_SETUP: () => void
  SET_PRINT_MODE: (modeName: string, value: any) => void
  SET_PRINT_STYLE: (styleName: string, value: any) => void
  NEWPAGE: () => void
}

// 全局 LODOP 引用
let _lodopInstance: LodopInstance | null = null
let _status: LodopStatus = 'disconnected'
let _statusCallbacks: Array<(status: LodopStatus) => void> = []

// C-Lodop 服务端口列表（按优先级）
const CLODOP_PORTS = [8000, 18000]
const CLODOP_PROTOCOL = ['http', 'https']

/**
 * 获取 LODOP 状态
 */
export function getLodopStatus(): LodopStatus {
  return _status
}

/**
 * 监听状态变化
 */
export function onLodopStatusChange(callback: (status: LodopStatus) => void) {
  _statusCallbacks.push(callback)
  return () => {
    _statusCallbacks = _statusCallbacks.filter(cb => cb !== callback)
  }
}

function setStatus(status: LodopStatus) {
  _status = status
  _statusCallbacks.forEach(cb => cb(status))
}

/**
 * 检测 C-Lodop 服务是否可用
 */
export async function detectCLodop(): Promise<{ available: boolean; url: string; version?: string }> {
  for (const protocol of CLODOP_PROTOCOL) {
    for (const port of CLODOP_PORTS) {
      const url = `${protocol}://localhost:${port}`
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        const response = await fetch(`${url}/CLodopfuncs.js`, {
          signal: controller.signal,
          mode: 'no-cors',
        })
        clearTimeout(timeoutId)
        if (response.ok || response.type === 'opaque') {
          return { available: true, url }
        }
      } catch {
        // 继续尝试下一个端口
      }
    }
  }
  return { available: false, url: '' }
}

/**
 * 加载 C-Lodop 脚本
 */
export async function loadCLodop(): Promise<boolean> {
  setStatus('connecting')

  const detection = await detectCLodop()
  if (!detection.available) {
    setStatus('not-installed')
    return false
  }

  return new Promise((resolve) => {
    // 检查是否已加载
    if ((window as any).CLODOP || (window as any).getCLodop) {
      try {
        const CLODOP = (window as any).getCLodop?.() || (window as any).CLODOP
        if (CLODOP) {
          _lodopInstance = CLODOP as LodopInstance
          setStatus('connected')
          resolve(true)
          return
        }
      } catch { /* 继续加载 */ }
    }

    const script = document.createElement('script')
    script.src = `${detection.url}/CLodopfuncs.js?priority=1`
    script.onload = () => {
      // C-Lodop 加载后通过 getCLodop() 获取实例
      setTimeout(() => {
        try {
          const getCLodop = (window as any).getCLodop
          if (getCLodop) {
            const CLODOP = getCLodop()
            if (CLODOP) {
              _lodopInstance = CLODOP as LodopInstance
              setStatus('connected')
              resolve(true)
              return
            }
          }
        } catch (e) {
          console.warn('获取 CLODOP 实例失败:', e)
        }
        setStatus('not-installed')
        resolve(false)
      }, 500)
    }
    script.onerror = () => {
      setStatus('not-installed')
      resolve(false)
    }
    document.head.appendChild(script)
  })
}

/**
 * 获取 LODOP 实例
 */
export function getLodopInstance(): LodopInstance | null {
  if (_lodopInstance) return _lodopInstance
  // 尝试从全局获取
  try {
    const getCLodop = (window as any).getCLodop
    if (getCLodop) {
      const instance = getCLodop()
      if (instance) {
        _lodopInstance = instance as LodopInstance
        setStatus('connected')
        return _lodopInstance
      }
    }
  } catch { /* ignore */ }
  return null
}

/**
 * 获取 LODOP 打印机列表
 */
export function getLodopPrinters(): string[] {
  const lodop = getLodopInstance()
  if (!lodop) return []
  try {
    const count = lodop.GET_PRINTER_COUNT()
    const printers: string[] = []
    for (let i = 0; i < count; i++) {
      printers.push(lodop.GET_PRINTER_NAME(i))
    }
    return printers
  } catch (e) {
    console.error('获取LODOP打印机列表失败:', e)
    return []
  }
}

/**
 * 使用 LODOP 打印面单 HTML
 */
export function lodopPrintHTML(options: {
  printerName?: string
  printerIndex?: number
  paperWidth: number  // mm
  paperHeight: number // mm
  htmlContent: string
  title?: string
  preview?: boolean
  copies?: number
}): boolean {
  const lodop = getLodopInstance()
  if (!lodop) {
    console.error('LODOP 未连接')
    return false
  }

  try {
    lodop.PRINT_INIT(options.title || 'CRM面单打印')

    // 设置纸张 intOrient: 1=纵向, 2=横向, 0=默认
    // 尺寸单位用 "XYmm" 格式
    lodop.SET_PRINT_PAGESIZE(1, `${options.paperWidth}mm`, `${options.paperHeight}mm`, '')

    // 设置打印机
    if (options.printerName) {
      lodop.SET_PRINTER_INDEX(options.printerName)
    } else if (options.printerIndex !== undefined) {
      lodop.SET_PRINTER_INDEX(options.printerIndex)
    }

    // 添加 HTML 内容
    lodop.ADD_PRINT_HTM(0, 0, '100%', '100%', options.htmlContent)

    // 设置份数
    if (options.copies && options.copies > 1) {
      lodop.SET_PRINT_MODE('PRINT_PAGE_PERCENT', 'Full-Page')
      // LODOP 不直接支持份数参数，通过重复调用或 SET_PRINT_COPIES
      try {
        (lodop as any).SET_PRINT_COPIES?.(options.copies)
      } catch { /* 旧版本不支持 */ }
    }

    if (options.preview) {
      lodop.PREVIEW()
    } else {
      lodop.PRINT()
    }

    return true
  } catch (e) {
    console.error('LODOP 打印失败:', e)
    return false
  }
}

/**
 * 使用 LODOP 批量打印多张面单
 */
export function lodopPrintBatch(options: {
  printerName?: string
  paperWidth: number
  paperHeight: number
  htmlContents: string[]
  title?: string
  preview?: boolean
}): boolean {
  const lodop = getLodopInstance()
  if (!lodop) return false

  try {
    lodop.PRINT_INIT(options.title || 'CRM批量面单打印')
    lodop.SET_PRINT_PAGESIZE(1, `${options.paperWidth}mm`, `${options.paperHeight}mm`, '')

    if (options.printerName) {
      lodop.SET_PRINTER_INDEX(options.printerName)
    }

    options.htmlContents.forEach((html, index) => {
      if (index > 0) lodop.NEWPAGE()
      lodop.ADD_PRINT_HTM(0, 0, '100%', '100%', html)
    })

    if (options.preview) {
      lodop.PREVIEW()
    } else {
      lodop.PRINT()
    }

    return true
  } catch (e) {
    console.error('LODOP 批量打印失败:', e)
    return false
  }
}

/**
 * 打开 LODOP 打印设置对话框
 */
export function lodopPrintSetup(): boolean {
  const lodop = getLodopInstance()
  if (!lodop) return false
  try {
    lodop.PRINT_INIT('打印设置')
    lodop.PRINT_SETUP()
    return true
  } catch {
    return false
  }
}

