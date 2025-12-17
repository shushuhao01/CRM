/**
 * 物流查询工具函数
 * 统一处理快递单号点击后的查询选项弹窗
 */
import { ElMessageBox } from 'element-plus'
import type { Router } from 'vue-router'

// 快递100查询URL
const KUAIDI100_URL = 'https://www.kuaidi100.com/chaxun?nu={trackingNo}'

// 快递公司官网查询URL映射
const COMPANY_TRACKING_URLS: Record<string, string> = {
  SF: 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}',
  ZTO: 'https://www.zto.com/GuestService/Bill?txtbill={trackingNo}',
  YTO: 'https://www.yto.net.cn/query/{trackingNo}',
  STO: 'https://www.sto.cn/query/{trackingNo}',
  YD: 'https://www.yundaex.com/cn/message/gzh_query.html?mailNo={trackingNo}',
  JTSD: 'https://www.jtexpress.cn/track/{trackingNo}',
  EMS: 'https://www.ems.com.cn/queryList?mailNo={trackingNo}',
  JD: 'https://www.jd.com/orderDetail?orderId={trackingNo}',
  DBL: 'https://www.deppon.com/tracking/{trackingNo}',
  DB: 'https://www.deppon.com/tracking/{trackingNo}'
}

// 快递公司简称映射
const COMPANY_SHORT_NAMES: Record<string, string> = {
  SF: '顺丰',
  ZTO: '中通',
  YTO: '圆通',
  STO: '申通',
  YD: '韵达',
  JTSD: '极兔',
  EMS: 'EMS',
  JD: '京东',
  DBL: '德邦',
  DB: '德邦'
}

/**
 * 获取快递公司简称
 */
export const getCompanyShortName = (companyCode: string): string => {
  return COMPANY_SHORT_NAMES[companyCode?.toUpperCase()] || companyCode || '快递'
}

/**
 * 获取快递公司官网查询URL
 */
export const getCompanyTrackingUrl = (companyCode: string, trackingNo: string): string => {
  const template = COMPANY_TRACKING_URLS[companyCode?.toUpperCase()] || KUAIDI100_URL
  return template.replace('{trackingNo}', trackingNo)
}

/**
 * 获取快递100查询URL
 */
export const getKuaidi100Url = (trackingNo: string): string => {
  return KUAIDI100_URL.replace('{trackingNo}', trackingNo)
}

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const result = document.execCommand('copy')
      document.body.removeChild(textArea)
      return result
    }
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

export interface LogisticsQueryOptions {
  trackingNo: string
  companyCode?: string
  router?: Router
  onSystemQuery?: () => void
}

/**
 * 显示物流查询选项弹窗
 * @param options 查询选项
 */
export const showLogisticsQueryDialog = async (options: LogisticsQueryOptions): Promise<void> => {
  const { trackingNo, companyCode, router, onSystemQuery } = options

  if (!trackingNo) {
    return
  }

  // 复制快递单号
  await copyToClipboard(trackingNo)

  const companyShortName = getCompanyShortName(companyCode || '')
  const companyUrl = getCompanyTrackingUrl(companyCode || '', trackingNo)
  const kuaidi100Url = getKuaidi100Url(trackingNo)

  // 构建选项HTML
  const optionsHtml = `
    <div style="text-align: center; padding: 10px 0;">
      <p style="margin-bottom: 15px; color: #606266;">快递单号 <strong>${trackingNo}</strong> 已复制</p>
      <p style="color: #909399; font-size: 13px;">请选择查询方式</p>
    </div>
  `

  try {
    const result = await ElMessageBox({
      title: '选择查询网站',
      message: optionsHtml,
      dangerouslyUseHTMLString: true,
      showCancelButton: true,
      showClose: true,
      distinguishCancelAndClose: true,
      confirmButtonText: '系统内查询',
      cancelButtonText: '快递100',
      type: 'info',
      customClass: 'logistics-query-dialog',
      beforeClose: (action, instance, done) => {
        if (action === 'confirm' || action === 'cancel' || action === 'close') {
          done()
        }
      }
    }).catch((action) => action)

    if (result === 'confirm') {
      // 系统内查询
      if (onSystemQuery) {
        onSystemQuery()
      } else if (router) {
        router.push({
          path: '/logistics/track',
          query: {
            trackingNo: trackingNo,
            company: companyCode || ''
          }
        })
      }
    } else if (result === 'cancel') {
      // 快递100查询
      window.open(kuaidi100Url, '_blank')
    }
  } catch (error) {
    // 用户关闭弹窗，不做处理
  }
}

/**
 * 显示带官网选项的物流查询弹窗（三个选项）
 */
export const showLogisticsQueryDialogWithOfficial = async (options: LogisticsQueryOptions): Promise<void> => {
  const { trackingNo, companyCode, router, onSystemQuery } = options

  if (!trackingNo) {
    return
  }

  // 复制快递单号
  await copyToClipboard(trackingNo)

  const companyShortName = getCompanyShortName(companyCode || '')
  const companyUrl = getCompanyTrackingUrl(companyCode || '', trackingNo)
  const kuaidi100Url = getKuaidi100Url(trackingNo)

  // 使用自定义HTML构建三个按钮
  const optionsHtml = `
    <div style="text-align: center; padding: 10px 0;">
      <p style="margin-bottom: 15px; color: #606266;">快递单号 <strong>${trackingNo}</strong> 已复制</p>
      <p style="color: #909399; font-size: 13px; margin-bottom: 20px;">请选择查询方式</p>
      <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
        <button id="btn-system" class="el-button el-button--primary" style="min-width: 100px;">系统内查询</button>
        <button id="btn-kuaidi100" class="el-button el-button--default" style="min-width: 100px;">快递100</button>
        <button id="btn-official" class="el-button el-button--success" style="min-width: 100px;">${companyShortName}官网</button>
      </div>
    </div>
  `

  const msgBox = ElMessageBox({
    title: '选择查询网站',
    message: optionsHtml,
    dangerouslyUseHTMLString: true,
    showConfirmButton: false,
    showCancelButton: false,
    showClose: true,
    customClass: 'logistics-query-dialog-custom'
  })

  // 等待DOM渲染后绑定事件
  setTimeout(() => {
    const btnSystem = document.getElementById('btn-system')
    const btnKuaidi100 = document.getElementById('btn-kuaidi100')
    const btnOfficial = document.getElementById('btn-official')

    if (btnSystem) {
      btnSystem.onclick = () => {
        ElMessageBox.close()
        if (onSystemQuery) {
          onSystemQuery()
        } else if (router) {
          router.push({
            path: '/logistics/track',
            query: {
              trackingNo: trackingNo,
              company: companyCode || ''
            }
          })
        }
      }
    }

    if (btnKuaidi100) {
      btnKuaidi100.onclick = () => {
        ElMessageBox.close()
        window.open(kuaidi100Url, '_blank')
      }
    }

    if (btnOfficial) {
      btnOfficial.onclick = () => {
        ElMessageBox.close()
        window.open(companyUrl, '_blank')
      }
    }
  }, 100)
}

export default {
  showLogisticsQueryDialog,
  showLogisticsQueryDialogWithOfficial,
  getCompanyShortName,
  getCompanyTrackingUrl,
  getKuaidi100Url,
  copyToClipboard
}
