/**
 * SMS模板变量自动匹配工具
 * 根据客户信息、订单信息等自动填充模板变量
 *
 * @module smsVariableMatcher
 */

/** 客户数据接口 */
export interface CustomerData {
  id?: string
  name?: string
  phone?: string
  email?: string
  gender?: string
  company?: string
  level?: string
  customerNo?: string
  address?: string
  tags?: string[]
  birthday?: string
  wechatId?: string
  // 扩展字段
  [key: string]: unknown
}

/** 订单数据接口 */
export interface OrderData {
  orderNo?: string
  orderNumber?: string
  totalAmount?: number | string
  paidAmount?: number | string
  unpaidAmount?: number | string
  status?: string
  createdAt?: string
  orderDate?: string
  productName?: string
  productNames?: string
  trackingNo?: string
  expressCompany?: string
  deliveryDate?: string
  paymentMethod?: string
  [key: string]: unknown
}

/** 租户/公司数据接口 */
export interface CompanyData {
  companyName?: string
  brandName?: string
  shopName?: string
  serviceHotline?: string
  website?: string
  [key: string]: unknown
}

/**
 * 根据变量名和上下文数据自动匹配变量值
 * @param variableName - 变量名（不含大括号）
 * @param customer - 客户数据
 * @param order - 订单数据（可选）
 * @param company - 公司数据（可选）
 * @returns 匹配的变量值，未匹配返回空字符串
 */
export function matchVariable(
  variableName: string,
  customer?: CustomerData,
  order?: OrderData,
  company?: CompanyData
): string {
  if (!variableName) return ''

  // 客户信息匹配
  if (customer) {
    switch (variableName) {
      case 'customerName':
        return customer.name || ''
      case 'phone':
        return customer.phone || ''
      case 'email':
        return customer.email || ''
      case 'gender': {
        const g = customer.gender
        if (g === 'male' || g === '男') return '先生'
        if (g === 'female' || g === '女') return '女士'
        return ''
      }
      case 'customerNo':
        return customer.customerNo || ''
      case 'companyName':
        return customer.company || company?.companyName || ''
      case 'address':
      case 'receiverAddress':
        return customer.address || ''
      case 'memberLevel':
        return customer.level || ''
      case 'contactPerson':
        return customer.name || ''
    }
  }

  // 订单信息匹配
  if (order) {
    switch (variableName) {
      case 'orderNo':
        return order.orderNo || order.orderNumber || ''
      case 'amount':
        return order.totalAmount != null ? String(order.totalAmount) : ''
      case 'paidAmount':
        return order.paidAmount != null ? String(order.paidAmount) : ''
      case 'unpaidAmount':
        return order.unpaidAmount != null ? String(order.unpaidAmount) : ''
      case 'orderStatus':
        return order.status || ''
      case 'orderDate':
        return order.orderDate || order.createdAt || ''
      case 'productName':
        return order.productName || order.productNames || ''
      case 'trackingNo':
        return order.trackingNo || ''
      case 'expressCompany':
        return order.expressCompany || ''
      case 'deliveryDate':
        return order.deliveryDate || ''
      case 'deliveryTime':
        return order.deliveryDate || ''
      case 'paymentMethod':
        return order.paymentMethod || ''
      case 'orderItems':
        return order.productNames || order.productName || ''
      case 'productPrice':
        return order.totalAmount != null ? String(order.totalAmount) : ''
    }
  }

  // 公司信息匹配
  if (company) {
    switch (variableName) {
      case 'companyName':
        return company.companyName || ''
      case 'brandName':
        return company.brandName || ''
      case 'shopName':
        return company.shopName || ''
      case 'serviceHotline':
        return company.serviceHotline || ''
      case 'website':
        return company.website || ''
    }
  }

  // 通用时间匹配
  const now = new Date()
  switch (variableName) {
    case 'date':
      return now.toISOString().split('T')[0]
    case 'time':
      return now.toTimeString().slice(0, 5)
    case 'year':
      return String(now.getFullYear())
    case 'month':
      return `${now.getMonth() + 1}月`
  }

  return ''
}

/**
 * 批量自动匹配模板中的所有变量
 * @param templateContent - 模板内容（含 {variableName} 格式的变量）
 * @param customer - 客户数据
 * @param order - 订单数据（可选）
 * @param company - 公司数据（可选）
 * @returns 变量名 → 值 的映射对象
 */
export function autoMatchVariables(
  templateContent: string,
  customer?: CustomerData,
  order?: OrderData,
  company?: CompanyData
): Record<string, string> {
  const result: Record<string, string> = {}

  if (!templateContent) return result

  // 提取模板中所有变量
  const matches = templateContent.match(/\{(\w+)\}/g)
  if (!matches) return result

  const variableNames = [...new Set(matches.map(m => m.slice(1, -1)))]

  for (const varName of variableNames) {
    const value = matchVariable(varName, customer, order, company)
    result[varName] = value
  }

  return result
}

/**
 * 用变量值替换模板内容生成预览
 * @param templateContent - 模板原始内容
 * @param variables - 变量名 → 值 的映射
 * @returns 替换后的预览内容
 */
export function generatePreview(
  templateContent: string,
  variables: Record<string, string>
): string {
  if (!templateContent) return ''

  let content = templateContent
  for (const [key, val] of Object.entries(variables)) {
    if (val) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
    }
  }
  return content
}

/**
 * 提取模板中的变量名列表
 * @param templateContent - 模板内容
 * @returns 变量名数组（去重）
 */
export function extractVariables(templateContent: string): string[] {
  if (!templateContent) return []
  const matches = templateContent.match(/\{(\w+)\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.slice(1, -1)))]
}

