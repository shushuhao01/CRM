import * as XLSX from 'xlsx'

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
  customerAge?: number
  customerHeight?: string
  customerWeight?: string
  medicalHistory?: string
  serviceWechat?: string
  remark?: string
  createTime: string
  status: string
  shippingStatus?: string
  // 🔥 批次270新增：订单列表新增字段
  markType?: string // 标记类型
  salesPersonName?: string // 负责销售
  paymentMethod?: string // 支付方式
  orderSource?: string // 订单来源
  customFields?: Record<string, any> // 自定义字段
}

// 导出订单到Excel
export const exportOrdersToExcel = (orders: ExportOrder[], filename: string = '订单列表', isAdmin: boolean = false) => {
  if (!orders || orders.length === 0) {
    throw new Error('没有可导出的数据')
  }

  // 🔥 批次270修复：收集所有自定义字段
  const customFieldKeys = new Set<string>()
  const customFieldLabels: Record<string, string> = {}

  orders.forEach(order => {
    if (order.customFields) {
      Object.keys(order.customFields).forEach(key => {
        customFieldKeys.add(key)
        // 尝试从localStorage获取字段标签
        if (!customFieldLabels[key]) {
          try {
            const configStr = localStorage.getItem('crm_order_field_config')
            if (configStr) {
              const config = JSON.parse(configStr)
              const field = config.customFields?.find((f: unknown) => f.fieldKey === key)
              if (field) {
                customFieldLabels[key] = field.fieldName
              } else {
                customFieldLabels[key] = key
              }
            } else {
              customFieldLabels[key] = key
            }
          } catch {
            customFieldLabels[key] = key
          }
        }
      })
    }
  })

  const sortedCustomFieldKeys = Array.from(customFieldKeys).sort()

  // 根据权限定义列标题
  const adminHeaders = [
    '订单号',
    '客户姓名',
    '客户电话',
    '收货人',
    '收货电话',
    '收货地址',
    '商品信息',
    '总数量',
    '订单金额',
    '定金',
    'COD金额',
    '客户年龄',
    '身高',
    '体重',
    '病史',
    '服务微信',
    '标记类型', // 🔥 批次270新增
    '负责销售', // 🔥 批次270新增
    '支付方式', // 🔥 批次270新增
    '订单来源', // 🔥 批次270新增
    ...sortedCustomFieldKeys.map(key => customFieldLabels[key]), // 🔥 批次270新增：动态自定义字段
    '备注',
    '下单时间',
    '订单状态',
    '发货状态'
  ]

  const normalHeaders = [
    '订单号',
    '收货人',
    '收货电话',
    '收货地址',
    '商品信息',
    '总数量',
    '订单金额',
    '定金',
    'COD金额',
    '标记类型', // 🔥 批次270新增
    '负责销售', // 🔥 批次270新增
    '支付方式', // 🔥 批次270新增
    '订单来源', // 🔥 批次270新增
    ...sortedCustomFieldKeys.map(key => customFieldLabels[key]), // 🔥 批次270新增：动态自定义字段
    '备注',
    '下单时间',
    '订单状态',
    '发货状态'
  ]

  const headers = isAdmin ? adminHeaders : normalHeaders

  // 根据权限转换数据格式
  const data = orders.map(order => {
    if (isAdmin) {
      return [
        order.orderNumber,
        order.customerName,
        order.customerPhone,
        order.receiverName,
        order.receiverPhone,
        order.receiverAddress,
        order.products,
        order.totalQuantity,
        order.totalAmount,
        order.depositAmount,
        order.codAmount,
        order.customerAge || '',
        order.customerHeight || '',
        order.customerWeight || '',
        order.medicalHistory || '',
        order.serviceWechat || '',
        order.markType || '', // 🔥 批次270新增
        order.salesPersonName || '', // 🔥 批次270新增
        order.paymentMethod || '', // 🔥 批次270新增
        order.orderSource || '', // 🔥 批次270新增
        ...sortedCustomFieldKeys.map(key => order.customFields?.[key] || ''), // 🔥 批次270新增：动态自定义字段
        order.remark || '',
        order.createTime,
        order.status,
        order.shippingStatus || ''
      ]
    } else {
      return [
        order.orderNumber,
        order.receiverName,
        order.receiverPhone,
        order.receiverAddress,
        order.products,
        order.totalQuantity,
        order.totalAmount,
        order.depositAmount,
        order.codAmount,
        order.markType || '', // 🔥 批次270新增
        order.salesPersonName || '', // 🔥 批次270新增
        order.paymentMethod || '', // 🔥 批次270新增
        order.orderSource || '', // 🔥 批次270新增
        ...sortedCustomFieldKeys.map(key => order.customFields?.[key] || ''), // 🔥 批次270新增：动态自定义字段
        order.remark || '',
        order.createTime,
        order.status,
        order.shippingStatus || ''
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
  const adminColWidths = [
    { wch: 15 }, // 订单号
    { wch: 12 }, // 客户姓名
    { wch: 15 }, // 客户电话
    { wch: 12 }, // 收货人
    { wch: 15 }, // 收货电话
    { wch: 30 }, // 收货地址
    { wch: 25 }, // 商品信息
    { wch: 8 },  // 总数量
    { wch: 12 }, // 订单金额
    { wch: 10 }, // 定金
    { wch: 10 }, // COD金额
    { wch: 8 },  // 客户年龄
    { wch: 8 },  // 身高
    { wch: 8 },  // 体重
    { wch: 15 }, // 病史
    { wch: 15 }, // 服务微信
    { wch: 12 }, // 🔥 批次270新增：标记类型
    { wch: 12 }, // 🔥 批次270新增：负责销售
    { wch: 12 }, // 🔥 批次270新增：支付方式
    { wch: 15 }, // 🔥 批次270新增：订单来源
    ...sortedCustomFieldKeys.map(() => ({ wch: 15 })), // 🔥 批次270新增：动态自定义字段
    { wch: 20 }, // 备注
    { wch: 18 }, // 下单时间
    { wch: 10 }, // 订单状态
    { wch: 10 }  // 发货状态
  ]

  const normalColWidths = [
    { wch: 15 }, // 订单号
    { wch: 12 }, // 收货人
    { wch: 15 }, // 收货电话
    { wch: 30 }, // 收货地址
    { wch: 25 }, // 商品信息
    { wch: 8 },  // 总数量
    { wch: 12 }, // 订单金额
    { wch: 10 }, // 定金
    { wch: 10 }, // COD金额
    { wch: 12 }, // 🔥 批次270新增：标记类型
    { wch: 12 }, // 🔥 批次270新增：负责销售
    { wch: 12 }, // 🔥 批次270新增：支付方式
    { wch: 15 }, // 🔥 批次270新增：订单来源
    ...sortedCustomFieldKeys.map(() => ({ wch: 15 })), // 🔥 批次270新增：动态自定义字段
    { wch: 20 }, // 备注
    { wch: 18 }, // 下单时间
    { wch: 10 }, // 订单状态
    { wch: 10 }  // 发货状态
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
