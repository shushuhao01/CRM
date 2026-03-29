import * as XLSX from 'xlsx'

// 订单状态中文映射
const orderStatusMap: Record<string, string> = {
  'pending_transfer': '待流转',
  'pending_audit': '待审核',
  'audit_rejected': '审核拒绝',
  'pending_shipment': '待发货',
  'shipped': '已发货',
  'delivered': '已签收',
  'logistics_returned': '物流部退回',
  'logistics_cancelled': '物流部取消',
  'package_exception': '包裹异常',
  'rejected': '拒收',
  'rejected_returned': '拒收已退回',
  'after_sales_created': '已建售后',
  'pending_cancel': '待取消',
  'cancel_failed': '取消失败',
  'cancelled': '已取消',
  'draft': '草稿',
  'refunded': '已退款',
  'pending': '待处理',
  'approved': '已审核',
  'completed': '已完成'
}

// 订单来源中文映射
const orderSourceMap: Record<string, string> = {
  'online_store': '线上商城',
  'wechat_mini': '微信小程序',
  'wechat_service': '微信客服',
  'phone_call': '电话咨询',
  'offline_store': '线下门店',
  'referral': '客户推荐',
  'advertisement': '广告投放',
  'douyin': '抖音',
  'kuaishou': '快手',
  'wechat': '微信',
  'taobao': '淘宝',
  'jd': '京东',
  'pdd': '拼多多',
  'offline': '线下',
  'phone': '电话',
  'other': '其他'
}

// 支付方式中文映射
const paymentMethodMap: Record<string, string> = {
  'wechat': '微信支付',
  'alipay': '支付宝',
  'bank_transfer': '银行转账',
  'unionpay': '云闪付',
  'cod': '货到付款',
  'cash': '现金',
  'card': '刷卡',
  'credit_card': '信用卡',
  'online': '在线支付',
  'wechat_pay': '微信支付',
  'other': '其他'
}

// 快递公司中文映射
const expressCompanyMap: Record<string, string> = {
  'SF': '顺丰速运',
  'YTO': '圆通速递',
  'ZTO': '中通快递',
  'STO': '申通快递',
  'YD': '韵达快递',
  'JTSD': '极兔速递',
  'EMS': 'EMS',
  'YZBK': '邮政包裹',
  'DBL': '德邦快递',
  'JD': '京东物流'
}

// 发货状态中文映射
const shippingStatusMap: Record<string, string> = {
  'pending': '待发货',
  'shipped': '已发货',
  'delivered': '已签收',
  'rejected': '拒收',
  'returned': '已退回',
  'exception': '异常'
}

// 标记类型中文映射
const markTypeMap: Record<string, string> = {
  'normal': '正常发货单',
  'reserved': '预留单',
  'return': '退单',
  'urgent': '加急',
  'vip': 'VIP',
  'important': '重要'
}

// 🔥 性别中文映射
const genderMap: Record<string, string> = {
  'male': '男',
  'female': '女',
  'unknown': '未知',
  '男': '男',
  '女': '女'
}

// 获取性别中文
const getGenderText = (gender: string): string => {
  return genderMap[gender] || gender || ''
}

// 获取订单状态中文
const getOrderStatusText = (status: string): string => {
  return orderStatusMap[status] || status || ''
}

// 获取订单来源中文
const getOrderSourceText = (source: string): string => {
  return orderSourceMap[source] || source || ''
}

// 获取支付方式中文
const getPaymentMethodText = (method: string): string => {
  return paymentMethodMap[method] || method || ''
}

// 获取发货状态中文
const getShippingStatusText = (status: string): string => {
  return shippingStatusMap[status] || status || ''
}

// 获取标记类型中文
const getMarkTypeText = (markType: string): string => {
  return markTypeMap[markType] || markType || ''
}

// 获取快递公司中文
const getExpressCompanyText = (code: string): string => {
  return expressCompanyMap[code] || code || ''
}

// 客户导出接口
export interface ExportCustomer {
  code: string
  name: string
  phone: string
  age: number
  address: string
  level: string
  status: string
  salesPersonId: string
  salesPersonName?: string
  orderCount: number
  createTime: string
  createdBy: string
  wechatId?: string
  email?: string
  company?: string
  position?: string
  source?: string
  tags?: string[]
  remarks?: string
}

// 订单导出接口
export interface ExportOrder {
  orderNumber: string
  customerName: string
  customerPhone: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  products: string
  totalQuantity: number
  totalAmount: number
  depositAmount: number
  codAmount: number
  customerGender?: string  // 🔥 新增：性别
  customerAge?: number
  customerHeight?: string
  customerWeight?: string
  medicalHistory?: string
  serviceWechat?: string
  remark?: string
  createTime: string
  status: string
  shippingStatus?: string
  markType?: string // 标记类型
  salesPersonName?: string // 负责销售
  paymentMethod?: string // 支付方式
  orderSource?: string // 订单来源
  customFields?: Record<string, unknown> // 自定义字段
  // 物流相关字段
  expressCompany?: string // 物流公司
  expressNo?: string // 物流单号
  specifiedExpress?: string // 指定快递
  logisticsStatus?: string // 物流状态
}

// 导出订单到Excel
export const exportOrdersToExcel = (orders: ExportOrder[], filename: string = '订单列表', isAdmin: boolean = false) => {
  if (!orders || orders.length === 0) {
    throw new Error('没有可导出的数据')
  }

  // 🔥 调试：检查传入的订单数据中的expressCompany字段
  console.log('[Export] 检查传入数据的expressCompany:', orders.slice(0, 3).map(o => ({
    orderNumber: o.orderNumber,
    expressCompany: o.expressCompany,
    specifiedExpress: o.specifiedExpress
  })))

  // 🔥 收集所有自定义字段并获取正确的字段名称
  const customFieldKeys = new Set<string>()
  const customFieldLabels: Record<string, string> = {}

  // 先从localStorage获取字段配置
  let fieldConfigs: Array<{ fieldKey: string; fieldName: string }> = []
  try {
    const configStr = localStorage.getItem('crm_order_field_config')
    if (configStr) {
      const config = JSON.parse(configStr)
      fieldConfigs = config.customFields || []
    }
  } catch {
    // 忽略解析错误
  }

  orders.forEach(order => {
    if (order.customFields) {
      Object.keys(order.customFields).forEach(key => {
        customFieldKeys.add(key)
        // 从配置中获取字段名称
        if (!customFieldLabels[key]) {
          const field = fieldConfigs.find(f => f.fieldKey === key)
          if (field && field.fieldName) {
            customFieldLabels[key] = field.fieldName
          } else {
            // 如果没有配置，使用友好的默认名称
            const fieldNumber = key.replace('custom_field', '')
            customFieldLabels[key] = `自定义字段${fieldNumber}`
          }
        }
      })
    }
  })

  const sortedCustomFieldKeys = Array.from(customFieldKeys).sort()

  // 根据权限定义列标题（完整字段）
  const adminHeaders = [
    '订单号',
    '订单状态',
    '客户姓名',
    '客户电话',
    '收货地址',
    '指定快递',
    '负责销售',
    '下单时间',
    '商品信息',
    '总数量',
    '订单金额',
    '定金',
    'COD金额',
    '性别',
    '年龄',
    '身高',
    '体重',
    '病史',
    '服务微信',
    '订单来源',
    ...sortedCustomFieldKeys.map(key => customFieldLabels[key]),
    '支付方式',
    '备注',
    '物流公司',
    '物流单号',
    '物流状态',
    '标记类型'
  ]

  const normalHeaders = [
    '订单号',
    '订单状态',
    '收货人',
    '收货电话',
    '收货地址',
    '指定快递',
    '负责销售',
    '下单时间',
    '商品信息',
    '总数量',
    '订单金额',
    '定金',
    'COD金额',
    '性别',
    '订单来源',
    ...sortedCustomFieldKeys.map(key => customFieldLabels[key]),
    '支付方式',
    '备注',
    '物流公司',
    '物流单号',
    '物流状态',
    '标记类型'
  ]

  const headers = isAdmin ? adminHeaders : normalHeaders

  // 根据权限转换数据格式（匹配列标题顺序）
  const data = orders.map(order => {
    // 指定快递：优先使用有值的字段（排除空字符串）
    const specifiedExpressValue = (order.specifiedExpress && order.specifiedExpress.trim()) ||
                                   (order.expressCompany && order.expressCompany.trim()) || ''

    if (isAdmin) {
      return [
        order.orderNumber,
        getOrderStatusText(order.status),
        order.customerName,
        order.customerPhone,
        order.receiverAddress,
        getExpressCompanyText(specifiedExpressValue),
        order.salesPersonName || '',
        order.createTime,
        order.products,
        order.totalQuantity,
        order.totalAmount,
        order.depositAmount,
        order.codAmount,
        getGenderText(order.customerGender || ''),
        order.customerAge || '',
        order.customerHeight || '',
        order.customerWeight || '',
        order.medicalHistory || '',
        order.serviceWechat || '',
        getOrderSourceText(order.orderSource || ''),
        ...sortedCustomFieldKeys.map(key => order.customFields?.[key] || ''),
        getPaymentMethodText(order.paymentMethod || ''),
        order.remark || '',
        getExpressCompanyText(order.expressCompany || ''),
        order.expressNo || '',
        getShippingStatusText(order.logisticsStatus || order.shippingStatus || ''),
        getMarkTypeText(order.markType || '')
      ]
    } else {
      return [
        order.orderNumber,
        getOrderStatusText(order.status),
        order.receiverName,
        order.receiverPhone,
        order.receiverAddress,
        getExpressCompanyText(specifiedExpressValue),
        order.salesPersonName || '',
        order.createTime,
        order.products,
        order.totalQuantity,
        order.totalAmount,
        order.depositAmount,
        order.codAmount,
        getGenderText(order.customerGender || ''),
        getOrderSourceText(order.orderSource || ''),
        ...sortedCustomFieldKeys.map(key => order.customFields?.[key] || ''),
        getPaymentMethodText(order.paymentMethod || ''),
        order.remark || '',
        getExpressCompanyText(order.expressCompany || ''),
        order.expressNo || '',
        getShippingStatusText(order.logisticsStatus || order.shippingStatus || ''),
        getMarkTypeText(order.markType || '')
      ]
    }
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()

  // 创建工作表数据（标题行 + 数据行）
  const wsData = [headers, ...data]

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 🔥 只为客户电话和金额字段设置数字格式，其他保持文本
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')

  // 只设置电话和金额字段为数字格式
  const phoneColumns = ['客户电话', '收货电话']
  const amountColumns = ['订单金额', '定金', 'COD金额']

  // 设置电话号码为数字格式
  phoneColumns.forEach(colName => {
    const colIndex = headers.indexOf(colName)
    if (colIndex !== -1) {
      for (let row = 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
        if (ws[cellAddress]) {
          const cellValue = ws[cellAddress].v
          // 只有纯数字的电话号码才转换
          if (cellValue && /^\d+$/.test(String(cellValue))) {
            ws[cellAddress].t = 'n'
            ws[cellAddress].v = Number(cellValue)
            ws[cellAddress].z = '0' // 不使用千分位
          }
        }
      }
    }
  })

  // 设置金额字段为数字格式（千分位，2位小数）
  amountColumns.forEach(colName => {
    const colIndex = headers.indexOf(colName)
    if (colIndex !== -1) {
      for (let row = 1; row <= range.e.r; row++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIndex })
        if (ws[cellAddress]) {
          const cellValue = ws[cellAddress].v
          if (cellValue !== '' && cellValue !== null && cellValue !== undefined && !isNaN(Number(cellValue))) {
            ws[cellAddress].t = 'n'
            ws[cellAddress].v = Number(cellValue)
            ws[cellAddress].z = '#,##0.00'
          }
        }
      }
    }
  })

  // 根据权限设置列宽（与列标题顺序一致）
  const adminColWidths = [
    { wch: 18 }, // 订单号
    { wch: 10 }, // 订单状态
    { wch: 12 }, // 客户姓名
    { wch: 15 }, // 客户电话
    { wch: 35 }, // 收货地址
    { wch: 12 }, // 指定快递
    { wch: 12 }, // 负责销售
    { wch: 18 }, // 下单时间
    { wch: 30 }, // 商品信息
    { wch: 8 },  // 总数量
    { wch: 12 }, // 订单金额
    { wch: 10 }, // 定金
    { wch: 10 }, // COD金额
    { wch: 6 },  // 性别
    { wch: 8 },  // 年龄
    { wch: 8 },  // 身高
    { wch: 8 },  // 体重
    { wch: 15 }, // 病史
    { wch: 15 }, // 服务微信
    { wch: 12 }, // 订单来源
    ...sortedCustomFieldKeys.map(() => ({ wch: 15 })), // 自定义字段
    { wch: 12 }, // 支付方式
    { wch: 25 }, // 备注
    { wch: 12 }, // 物流公司
    { wch: 18 }, // 物流单号
    { wch: 10 }, // 物流状态
    { wch: 10 }  // 标记类型
  ]

  const normalColWidths = [
    { wch: 18 }, // 订单号
    { wch: 10 }, // 订单状态
    { wch: 12 }, // 收货人
    { wch: 15 }, // 收货电话
    { wch: 35 }, // 收货地址
    { wch: 12 }, // 指定快递
    { wch: 12 }, // 负责销售
    { wch: 18 }, // 下单时间
    { wch: 30 }, // 商品信息
    { wch: 8 },  // 总数量
    { wch: 12 }, // 订单金额
    { wch: 10 }, // 定金
    { wch: 10 }, // COD金额
    { wch: 6 },  // 性别
    { wch: 12 }, // 订单来源
    ...sortedCustomFieldKeys.map(() => ({ wch: 15 })), // 自定义字段
    { wch: 12 }, // 支付方式
    { wch: 25 }, // 备注
    { wch: 12 }, // 物流公司
    { wch: 18 }, // 物流单号
    { wch: 10 }, // 物流状态
    { wch: 10 }  // 标记类型
  ]

  const colWidths = isAdmin ? adminColWidths : normalColWidths
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '订单列表')

  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // 导出文件
  XLSX.writeFile(wb, finalFilename)

  // 延迟清理可能的blob URL，确保下载完成后清理
  setTimeout(() => {
    // 清理可能存在的blob URL
    const existingLinks = document.querySelectorAll('a[href^="blob:"]')
    existingLinks.forEach(link => {
      const href = link.getAttribute('href')
      if (href && href.startsWith('blob:')) {
        URL.revokeObjectURL(href)
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }
    })
  }, 1000) // 1秒后清理

  return finalFilename
}

// 导出单个订单
export const exportSingleOrder = (order: ExportOrder, isAdmin: boolean = false) => {
  return exportOrdersToExcel([order], `订单_${order.orderNumber}`, isAdmin)
}

// 导出批量订单
export const exportBatchOrders = (orders: ExportOrder[], isAdmin: boolean = false) => {
  return exportOrdersToExcel(orders, `批量订单_${orders.length}条`, isAdmin)
}

// 导出客户到Excel
export const exportCustomersToExcel = (customers: ExportCustomer[], filename: string = '客户列表', hasExportPermission: boolean = false) => {
  if (!customers || customers.length === 0) {
    throw new Error('没有可导出的数据')
  }

  // 根据权限定义列标题
  const fullHeaders = [
    '客户编码',
    '客户姓名',
    '手机号码',
    '年龄',
    '地址',
    '客户等级',
    '客户状态',
    '负责销售',
    '订单数量',
    '创建时间',
    '创建人',
    '微信号',
    '邮箱',
    '公司',
    '职位',
    '客户来源',
    '标签',
    '备注'
  ]

  const limitedHeaders = [
    '客户编码',
    '客户姓名',
    '手机号码(脱敏)',
    '客户等级',
    '客户状态',
    '负责销售',
    '订单数量',
    '创建时间'
  ]

  const headers = hasExportPermission ? fullHeaders : limitedHeaders

  // 手机号脱敏函数
  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 7) return phone
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
  }

  // 根据权限转换数据格式
  const data = customers.map(customer => {
    if (hasExportPermission) {
      return [
        customer.code,
        customer.name,
        customer.phone,
        customer.age,
        customer.address,
        customer.level,
        customer.status,
        customer.salesPersonName || customer.salesPersonId,
        customer.orderCount,
        customer.createTime,
        customer.createdBy,
        customer.wechatId || '',
        customer.email || '',
        customer.company || '',
        customer.position || '',
        customer.source || '',
        customer.tags ? customer.tags.join(', ') : '',
        customer.remarks || ''
      ]
    } else {
      return [
        customer.code,
        customer.name,
        maskPhone(customer.phone),
        customer.level,
        customer.status,
        customer.salesPersonName || customer.salesPersonId,
        customer.orderCount,
        customer.createTime
      ]
    }
  })

  // 创建工作簿
  const wb = XLSX.utils.book_new()

  // 创建工作表数据（标题行 + 数据行）
  const wsData = [headers, ...data]

  // 创建工作表
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // 根据权限设置列宽
  const fullColWidths = [
    { wch: 15 }, // 客户编码
    { wch: 12 }, // 客户姓名
    { wch: 15 }, // 手机号码
    { wch: 8 },  // 年龄
    { wch: 30 }, // 地址
    { wch: 10 }, // 客户等级
    { wch: 10 }, // 客户状态
    { wch: 12 }, // 负责销售
    { wch: 10 }, // 订单数量
    { wch: 18 }, // 创建时间
    { wch: 12 }, // 创建人
    { wch: 15 }, // 微信号
    { wch: 20 }, // 邮箱
    { wch: 20 }, // 公司
    { wch: 15 }, // 职位
    { wch: 12 }, // 客户来源
    { wch: 20 }, // 标签
    { wch: 25 }  // 备注
  ]

  const limitedColWidths = [
    { wch: 15 }, // 客户编码
    { wch: 12 }, // 客户姓名
    { wch: 18 }, // 手机号码(脱敏)
    { wch: 10 }, // 客户等级
    { wch: 10 }, // 客户状态
    { wch: 12 }, // 负责销售
    { wch: 10 }, // 订单数量
    { wch: 18 }  // 创建时间
  ]

  const colWidths = hasExportPermission ? fullColWidths : limitedColWidths
  ws['!cols'] = colWidths

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, '客户列表')

  // 生成文件名（包含时间戳）
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
  const finalFilename = `${filename}_${timestamp}.xlsx`

  // 导出文件
  XLSX.writeFile(wb, finalFilename)

  // 延迟清理可能的blob URL，确保下载完成后清理
  setTimeout(() => {
    // 清理可能存在的blob URL
    const existingLinks = document.querySelectorAll('a[href^="blob:"]')
    existingLinks.forEach(link => {
      const href = link.getAttribute('href')
      if (href && href.startsWith('blob:')) {
        URL.revokeObjectURL(href)
        if (link.parentNode) {
          link.parentNode.removeChild(link)
        }
      }
    })
  }, 1000) // 1秒后清理

  return finalFilename
}

// 导出单个客户
export const exportSingleCustomer = (customer: ExportCustomer, hasExportPermission: boolean = false) => {
  return exportCustomersToExcel([customer], `客户_${customer.name}`, hasExportPermission)
}

// 导出批量客户
export const exportBatchCustomers = (customers: ExportCustomer[], hasExportPermission: boolean = false) => {
  return exportCustomersToExcel(customers, `批量客户_${customers.length}条`, hasExportPermission)
}
