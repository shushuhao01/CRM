/**
 * 物流面单模板定义
 * 预设各物流公司的标准面单模板
 * @updated 2026-04-08 修复HMR导出问题
 */

// 面单模板接口
export interface LabelTemplate {
  id: string
  name: string
  companyCode: string        // 物流公司代码，'universal' 表示通用
  companyName: string
  paperSize: string          // 100x180, 100x150, etc.
  description: string
  // 显示配置
  showBarcode: boolean
  showQrcode: boolean
  showProducts: boolean
  showCodAmount: boolean
  showRemark: boolean
  showSenderInfo: boolean
  showServiceWechat: boolean
  showSignArea: boolean      // 签收区域
  // 隐私配置
  privacyMode: 'full' | 'partial' | 'hidden'       // 手机号隐私
  namePrivacy: 'full' | 'partial' | 'hidden'        // 姓名隐私
  addressPrivacy: 'full' | 'partial' | 'hidden'     // 地址隐私
  // 是否为系统预设
  isPreset: boolean
}

// 存储key
const STORAGE_KEY_TEMPLATES = 'crm_label_templates'
const STORAGE_KEY_CUSTOM = 'crm_custom_templates'
const STORAGE_KEY_PRESET_OVERRIDES = 'crm_preset_template_overrides'
const STORAGE_KEY_DEFAULT_TEMPLATE = 'crm_default_template_id'

/**
 * 获取当前租户ID前缀（用于localStorage key隔离）
 * 不同租户的面单模板配置互不影响
 */
function getTenantPrefix(): string {
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

/**
 * 获取带租户前缀的存储key
 */
function tenantKey(baseKey: string): string {
  return getTenantPrefix() + baseKey
}

/**
 * 系统预设面单模板
 */
export const PRESET_TEMPLATES: LabelTemplate[] = [
  {
    id: 'universal-standard',
    name: '通用标准面单',
    companyCode: 'universal',
    companyName: '通用',
    paperSize: '100x180',
    description: '适用于所有物流公司的标准面单，100×180mm一联单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'universal-simple',
    name: '通用简洁面单',
    companyCode: 'universal',
    companyName: '通用',
    paperSize: '100x150',
    description: '精简版面单，100×150mm，只显示必要信息',
    showBarcode: true,
    showQrcode: false,
    showProducts: false,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'sf-standard',
    name: '顺丰标准面单',
    companyCode: 'SF',
    companyName: '顺丰速运',
    paperSize: '100x180',
    description: '顺丰速运标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: true,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'zto-standard',
    name: '中通标准面单',
    companyCode: 'ZTO',
    companyName: '中通快递',
    paperSize: '100x180',
    description: '中通快递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'yto-standard',
    name: '圆通标准面单',
    companyCode: 'YTO',
    companyName: '圆通速递',
    paperSize: '100x180',
    description: '圆通速递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'sto-standard',
    name: '申通标准面单',
    companyCode: 'STO',
    companyName: '申通快递',
    paperSize: '100x180',
    description: '申通快递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'yd-standard',
    name: '韵达标准面单',
    companyCode: 'YD',
    companyName: '韵达速递',
    paperSize: '100x180',
    description: '韵达速递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'jd-standard',
    name: '京东标准面单',
    companyCode: 'JD',
    companyName: '京东物流',
    paperSize: '100x180',
    description: '京东物流标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: true,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: true,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'ems-standard',
    name: 'EMS标准面单',
    companyCode: 'EMS',
    companyName: '中国邮政',
    paperSize: '100x180',
    description: '中国邮政EMS标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'jtsd-standard',
    name: '极兔标准面单',
    companyCode: 'JTSD',
    companyName: '极兔速递',
    paperSize: '100x180',
    description: '极兔速递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'dbl-standard',
    name: '德邦标准面单',
    companyCode: 'DBL',
    companyName: '德邦快递',
    paperSize: '100x180',
    description: '德邦快递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: true,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
  {
    id: 'htky-standard',
    name: '百世标准面单',
    companyCode: 'HTKY',
    companyName: '百世快递',
    paperSize: '100x180',
    description: '百世快递标准电子面单',
    showBarcode: true,
    showQrcode: true,
    showProducts: true,
    showCodAmount: true,
    showRemark: false,
    showSenderInfo: true,
    showServiceWechat: false,
    showSignArea: false,
    privacyMode: 'partial',
    namePrivacy: 'full',
    addressPrivacy: 'full',
    isPreset: true,
  },
]

/**
 * 获取预设模板的用户自定义覆盖
 */
export function getPresetOverrides(): Record<string, Partial<LabelTemplate>> {
  try {
    const data = localStorage.getItem(tenantKey(STORAGE_KEY_PRESET_OVERRIDES))
    if (data) return JSON.parse(data)
  } catch (e) {
    console.error('读取预设模板覆盖失败:', e)
  }
  return {}
}

/**
 * 保存预设模板的用户自定义覆盖
 */
export function savePresetOverride(templateId: string, overrides: Partial<LabelTemplate>) {
  const all = getPresetOverrides()
  // 只保存可编辑的字段，不保存id/name/companyCode/companyName/isPreset
  const { id, name, companyCode, companyName, isPreset, description, ...editableFields } = overrides as any
  all[templateId] = editableFields
  localStorage.setItem(tenantKey(STORAGE_KEY_PRESET_OVERRIDES), JSON.stringify(all))
}

/**
 * 重置预设模板为默认值
 */
export function resetPresetOverride(templateId: string) {
  const all = getPresetOverrides()
  delete all[templateId]
  localStorage.setItem(tenantKey(STORAGE_KEY_PRESET_OVERRIDES), JSON.stringify(all))
}

/**
 * 检查预设模板是否有用户修改
 */
export function hasPresetOverride(templateId: string): boolean {
  const all = getPresetOverrides()
  return !!all[templateId] && Object.keys(all[templateId]).length > 0
}

/**
 * 获取所有模板（预设 + 用户覆盖 + 自定义）
 */
export function getAllTemplates(): LabelTemplate[] {
  const overrides = getPresetOverrides()
  const presets = PRESET_TEMPLATES.map(tpl => {
    const override = overrides[tpl.id]
    if (override) {
      return { ...tpl, ...override, isPreset: true, id: tpl.id, name: tpl.name, companyCode: tpl.companyCode, companyName: tpl.companyName }
    }
    // 兼容旧数据：为缺少新字段的模板补充默认值
    return {
      ...tpl,
      namePrivacy: tpl.namePrivacy || 'full',
      addressPrivacy: tpl.addressPrivacy || 'full',
    }
  })
  const custom = getCustomTemplates().map(tpl => ({
    ...tpl,
    namePrivacy: tpl.namePrivacy || 'full',
    addressPrivacy: tpl.addressPrivacy || 'full',
  }))
  return [...presets, ...custom]
}

/**
 * 获取预设模板的原始默认值
 */
export function getPresetDefault(templateId: string): LabelTemplate | undefined {
  return PRESET_TEMPLATES.find(t => t.id === templateId)
}

/**
 * 姓名加密显示
 */
export function maskName(name: string, mode: 'full' | 'partial' | 'hidden' = 'full'): string {
  if (!name) return ''
  if (mode === 'full') return name
  if (mode === 'hidden') return '***'
  // partial: 张* / 张*丽 / 欧阳**
  if (name.length <= 1) return name
  if (name.length === 2) return name[0] + '*'
  return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1]
}

/**
 * 地址加密显示
 */
export function maskAddress(address: string, mode: 'full' | 'partial' | 'hidden' = 'full'): string {
  if (!address) return ''
  if (mode === 'full') return address
  if (mode === 'hidden') return '***'
  // partial: 保留省市区，隐藏详细地址
  // 例如：北京市朝阳区建国路xxx号 => 北京市朝阳区****
  const match = address.match(/^(.{2,}?(?:省|自治区|市|特别行政区))(.{1,}?(?:市|区|县|旗|盟|州))(.*)/)
  if (match) {
    return match[1] + match[2] + '****'
  }
  // 尝试简单匹配市区
  const simpleMatch = address.match(/^(.+?(?:市|区|县))(.*)/)
  if (simpleMatch && simpleMatch[2].length > 2) {
    return simpleMatch[1] + '****'
  }
  // 无法匹配则只显示前几个字
  if (address.length > 6) {
    return address.substring(0, 6) + '****'
  }
  return address
}

/**
 * 获取自定义模板
 */
export function getCustomTemplates(): LabelTemplate[] {
  try {
    const data = localStorage.getItem(tenantKey(STORAGE_KEY_CUSTOM))
    if (data) return JSON.parse(data)
  } catch (e) {
    console.error('读取自定义模板失败:', e)
  }
  return []
}

/**
 * 保存自定义模板
 */
export function saveCustomTemplate(template: LabelTemplate) {
  const custom = getCustomTemplates()
  const index = custom.findIndex(t => t.id === template.id)
  if (index >= 0) {
    custom[index] = template
  } else {
    custom.push({ ...template, isPreset: false })
  }
  localStorage.setItem(tenantKey(STORAGE_KEY_CUSTOM), JSON.stringify(custom))
}

/**
 * 删除自定义模板
 */
export function deleteCustomTemplate(id: string) {
  const custom = getCustomTemplates().filter(t => t.id !== id)
  localStorage.setItem(tenantKey(STORAGE_KEY_CUSTOM), JSON.stringify(custom))
}

/**
 * 根据物流公司代码获取匹配的模板
 * 优先使用用户设置的默认模板
 */
export function getTemplateByCompany(companyCode: string): LabelTemplate {
  const all = getAllTemplates()
  // 🔥 优先使用用户设置的默认模板
  const defaultId = getDefaultTemplateId()
  if (defaultId) {
    const defaultTpl = all.find(t => t.id === defaultId)
    if (defaultTpl) return defaultTpl
  }
  // 先找物流公司专属模板
  const matched = all.find(t => t.companyCode === companyCode)
  if (matched) return matched
  // 否则返回通用标准模板
  return all.find(t => t.id === 'universal-standard') || PRESET_TEMPLATES[0]
}

/**
 * 获取最近使用的模板ID
 */
export function getLastUsedTemplateId(): string {
  return localStorage.getItem(tenantKey(STORAGE_KEY_TEMPLATES)) || 'universal-standard'
}

/**
 * 保存最近使用的模板ID
 */
export function setLastUsedTemplateId(id: string) {
  localStorage.setItem(tenantKey(STORAGE_KEY_TEMPLATES), id)
}

/**
 * 获取默认模板ID
 */
export function getDefaultTemplateId(): string {
  return localStorage.getItem(tenantKey(STORAGE_KEY_DEFAULT_TEMPLATE)) || ''
}

/**
 * 设置默认模板ID
 */
export function setDefaultTemplateId(id: string) {
  localStorage.setItem(tenantKey(STORAGE_KEY_DEFAULT_TEMPLATE), id)
}

/**
 * 清除默认模板ID（取消默认）
 */
export function clearDefaultTemplateId() {
  localStorage.removeItem(tenantKey(STORAGE_KEY_DEFAULT_TEMPLATE))
}

