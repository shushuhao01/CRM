/**
 * 物流查询工具函数
 * 统一处理快递单号点击后的查询选项弹窗
 * 提供3个选项：系统内查询、快递100、快递公司官网
 */
import { ElMessageBox } from 'element-plus'
import type { Router } from 'vue-router'
import { getLogisticsCompany, getTrackingUrl, getCompanyShortName, KUAIDI100_URL } from './logisticsCompanyConfig'

// 重新导出常用函数
export { getCompanyShortName, getTrackingUrl, getLogisticsCompany }

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
  companyName?: string
  router?: Router
  onSystemQuery?: () => void
}

/**
 * 根据运单号前缀自动识别快递公司
 */
const detectCompanyByTrackingNo = (trackingNo: string): string => {
  if (!trackingNo) return ''
  const upperNo = trackingNo.toUpperCase()

  // 顺丰: SF开头
  if (upperNo.startsWith('SF')) return 'SF'
  // 中通: 75/76/78开头，或ZT开头
  if (/^(75|76|78|ZT)/.test(upperNo)) return 'ZTO'
  // 圆通: YT开头，或88/66开头
  if (upperNo.startsWith('YT') || /^(88|66)/.test(upperNo)) return 'YTO'
  // 申通: 77/88开头，或ST开头
  if (upperNo.startsWith('ST') || /^(77|268|368|468)/.test(upperNo)) return 'STO'
  // 韵达: 10/11/12/13/14/15/16/19开头
  if (/^(10|11|12|13|14|15|16|19)/.test(upperNo)) return 'YD'
  // 极兔: JT开头
  if (upperNo.startsWith('JT')) return 'JTSD'
  // EMS: E开头
  if (upperNo.startsWith('E') && upperNo.length >= 13) return 'EMS'
  // 京东: JD开头
  if (upperNo.startsWith('JD')) return 'JD'
  // 德邦: DPK开头
  if (upperNo.startsWith('DPK') || upperNo.startsWith('DP')) return 'DBL'

  return ''
}

/**
 * 显示物流查询选项弹窗（3个按钮：系统内查询、快递100、快递公司官网）
 * @param options 查询选项
 */
export const showLogisticsQueryDialog = async (options: LogisticsQueryOptions): Promise<void> => {
  const { trackingNo, companyCode, companyName, router, onSystemQuery } = options

  if (!trackingNo) {
    return
  }

  // 复制快递单号
  await copyToClipboard(trackingNo)

  // 获取物流公司信息 - 优先使用传入的参数，否则根据运单号自动识别
  let companyKey = companyCode || companyName || ''

  // 如果没有传入快递公司，尝试根据运单号自动识别
  if (!companyKey || !getLogisticsCompany(companyKey)) {
    const detectedCompany = detectCompanyByTrackingNo(trackingNo)
    if (detectedCompany) {
      companyKey = detectedCompany
      console.log('[物流查询] 根据运单号自动识别快递公司:', companyKey)
    }
  }

  const companyShortName = getCompanyShortName(companyKey)
  const companyUrl = getTrackingUrl(companyKey, trackingNo)
  const kuaidi100Url = getKuaidi100Url(trackingNo)

  // 检查是否有对应的快递公司官网
  const hasOfficialSite = !!getLogisticsCompany(companyKey)

  // 使用自定义HTML构建按钮
  const buttonsHtml = hasOfficialSite
    ? `
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 20px;">
        <button id="btn-system" class="el-button el-button--primary" style="min-width: 100px; height: 36px;">系统内查询</button>
        <button id="btn-kuaidi100" class="el-button el-button--default" style="min-width: 100px; height: 36px;">快递100</button>
        <button id="btn-official" class="el-button el-button--success" style="min-width: 100px; height: 36px;">${companyShortName}官网</button>
      </div>
    `
    : `
      <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; margin-top: 20px;">
        <button id="btn-system" class="el-button el-button--primary" style="min-width: 100px; height: 36px;">系统内查询</button>
        <button id="btn-kuaidi100" class="el-button el-button--default" style="min-width: 100px; height: 36px;">快递100</button>
      </div>
    `

  const optionsHtml = `
    <div style="text-align: center; padding: 10px 0;">
      <p style="margin-bottom: 8px; color: #606266;">快递单号 <strong style="color: #409eff;">${trackingNo}</strong> 已复制</p>
      <p style="color: #909399; font-size: 13px;">请选择查询方式</p>
      ${buttonsHtml}
    </div>
  `

  // 创建弹窗
  ElMessageBox({
    title: '物流查询',
    message: optionsHtml,
    dangerouslyUseHTMLString: true,
    showConfirmButton: false,
    showCancelButton: false,
    showClose: true,
    customClass: 'logistics-query-dialog-custom'
  }).catch(() => {
    // 用户关闭弹窗，不做处理
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
              company: companyKey
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

/**
 * 简化版：直接跳转系统内查询（不显示弹窗）
 */
export const goToSystemQuery = (router: Router, trackingNo: string, companyCode?: string): void => {
  router.push({
    path: '/logistics/track',
    query: {
      trackingNo: trackingNo,
      company: companyCode || ''
    }
  })
}

/**
 * 简化版：直接打开快递100查询
 */
export const openKuaidi100 = (trackingNo: string): void => {
  window.open(getKuaidi100Url(trackingNo), '_blank')
}

/**
 * 简化版：直接打开快递公司官网
 */
export const openOfficialWebsite = (trackingNo: string, companyCode?: string): void => {
  const url = getTrackingUrl(companyCode || '', trackingNo)
  window.open(url, '_blank')
}

export default {
  showLogisticsQueryDialog,
  goToSystemQuery,
  openKuaidi100,
  openOfficialWebsite,
  getCompanyShortName,
  getTrackingUrl,
  getKuaidi100Url,
  copyToClipboard
}
