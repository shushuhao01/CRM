// Mock API服务 - 用于开发和测试
import type { Customer } from '@/stores/customer'
import { customerStorage } from '@/services/customerStorage'
import type { CustomerSearchParams, CustomerListResponse } from './customer'
import type { Order } from '@/stores/order'
import type {
  OrderSearchParams,
  OrderListResponse,
  OrderCancelRequestParams,
  OrderCancelAuditParams,
  OrderStatistics
} from './order'
import type {
  SmsTemplate,
  SmsApprovalRecord,
  SmsSendRecord,
  SmsStatistics,
  SmsTemplateSearchParams,
  SmsApprovalSearchParams,
  SmsSendSearchParams,
  SmsTemplateListResponse,
  SmsApprovalListResponse,
  SmsSendListResponse
} from './sms'

// 存储数据结构
interface SmsTrendData {
  date: string
  count: number
  cost: number
}

// 存储键 - 与CustomerStorage服务保持一致
const STORAGE_KEY = 'crm_customers_unified'
// 使用与orderStore相同的存储键，确保数据同步
const ORDERS_STORAGE_KEY = 'crm_store_orders'
const PENDING_CANCEL_ORDERS_KEY = 'crm_mock_pending_cancel_orders'

// 初始化模拟客户数据
const initialMockCustomers: Customer[] = [
  {
    id: '1',
    code: 'XH202401151030',
    name: '张三',
    phone: '13800138001',
    age: 28,
    address: '北京市朝阳区建国门外大街1号',
    level: 'gold',
    status: 'active',
    salesPersonId: 'sales1',
    orderCount: 5,
    createTime: '2024-01-15 10:30:00',
    createdBy: 'admin',
    wechatId: 'zhangsan_wx',
    email: 'zhangsan@example.com',
    company: '北京科技有限公司',
    position: '技术总监',
    source: '网络推广',
    tags: ['VIP', '技术'],
    remarks: '重要客户，技术需求较高'
  },
  {
    id: '2',
    code: 'LM202401201420',
    name: '李四',
    phone: '13900139002',
    age: 35,
    address: '上海市浦东新区陆家嘴环路1000号',
    level: 'silver',
    status: 'active',
    salesPersonId: 'sales2',
    orderCount: 3,
    createTime: '2024-01-20 14:20:00',
    createdBy: 'sales1',
    wechatId: 'lisi_wx',
    email: 'lisi@example.com',
    company: '上海贸易公司',
    position: '采购经理',
    source: '朋友介绍',
    tags: ['稳定'],
    remarks: '采购量稳定，付款及时'
  },
  {
    id: '3',
    code: 'WF202402010915',
    name: '王五',
    phone: '13700137003',
    age: 42,
    address: '广州市天河区珠江新城花城大道1号',
    level: 'normal',
    status: 'inactive',
    salesPersonId: 'sales1',
    orderCount: 1,
    createTime: '2024-02-01 09:15:00',
    createdBy: 'sales2',
    email: 'wangwu@example.com',
    company: '广州制造有限公司',
    position: '生产经理',
    source: '展会',
    tags: ['制造业'],
    remarks: '最近联系较少，需要跟进'
  },
  {
    id: '4',
    code: 'ZL202402101645',
    name: '赵六',
    phone: '13600136004',
    age: 29,
    address: '深圳市南山区科技园南区深南大道1号',
    level: 'gold',
    status: 'potential',
    salesPersonId: 'sales3',
    orderCount: 0,
    createTime: '2024-02-10 16:45:00',
    createdBy: 'sales3',
    email: 'zhaoliu@example.com',
    company: '深圳创新科技',
    position: 'CTO',
    source: '线上咨询',
    tags: ['科技', '潜在'],
    remarks: '有合作意向，正在评估中'
  },
  {
    id: '5',
    code: 'SQ202312151530',
    name: '孙七',
    phone: '13500135005',
    age: 38,
    address: '杭州市西湖区文三路1号',
    level: 'silver',
    status: 'lost',
    salesPersonId: 'sales2',
    orderCount: 2,
    createTime: '2023-12-15 11:30:00',
    createdBy: 'sales1',
    email: 'sunqi@example.com',
    company: '杭州电商公司',
    position: '运营总监',
    source: '老客户介绍',
    tags: ['电商'],
    remarks: '因价格问题流失，已转向竞争对手'
  }
]

// 获取存储的客户数据 - 使用统一存储服务
const getMockCustomers = (): Customer[] => {
  try {
    const customers = customerStorage.getAllCustomers()

    // 如果没有数据，初始化默认数据
    if (customers.length === 0) {
      console.log('Mock API: 没有客户数据，初始化默认数据')
      customerStorage.saveAllCustomers([...initialMockCustomers])
      return [...initialMockCustomers]
    }

    console.log(`Mock API: 通过统一存储服务读取到 ${customers.length} 个客户`)
    return customers
  } catch (error) {
    console.warn('Mock API: 读取客户数据失败:', error)
    console.log('Mock API: 使用初始数据，共', initialMockCustomers.length, '个客户')
    return [...initialMockCustomers]
  }
}

// 保存客户数据到存储 - 使用统一存储服务
const saveMockCustomers = (customers: Customer[]) => {
  try {
    customerStorage.saveAllCustomers(customers)
    console.log(`Mock API: 通过统一存储服务保存了 ${customers.length} 个客户`)
  } catch (error) {
    console.warn('Mock API: 保存客户数据失败:', error)
  }
}

// 初始化订单模拟数据
const initialMockOrders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD202401001',
    customerId: '1',
    customerName: '张三',
    customerPhone: '13800138001',
    products: [
      { id: '1', name: '产品A', price: 1000, quantity: 2 }
    ],
    totalAmount: 2000,
    status: 'pending_shipment',
    paymentStatus: 'unpaid',
    paymentMethod: 'alipay',
    shippingAddress: '北京市朝阳区建国门外大街1号',
    createTime: '2024-01-15 10:30:00',
    updateTime: '2024-01-15 10:30:00',
    createdBy: 'admin',
    cancelStatus: null,
    cancelReason: null,
    cancelDescription: null,
    cancelRequestTime: null,
    auditStatus: null,
    auditRemark: null,
    auditTime: null,
    auditorId: null
  },
  {
    id: '2',
    orderNumber: 'ORD202401002',
    customerId: '2',
    customerName: '李四',
    customerPhone: '13900139002',
    products: [
      { id: '2', name: '产品B', price: 1500, quantity: 1 }
    ],
    totalAmount: 1500,
    status: 'pending_cancel',
    paymentStatus: 'paid',
    paymentMethod: 'wechat',
    shippingAddress: '上海市浦东新区陆家嘴环路1000号',
    createTime: '2024-01-16 14:20:00',
    updateTime: '2024-01-17 09:15:00',
    createdBy: 'sales1',
    cancelStatus: 'pending',
    cancelReason: 'customer_cancel',
    cancelDescription: '客户临时改变主意，不需要此产品',
    cancelRequestTime: '2024-01-17 09:15:00',
    auditStatus: null,
    auditRemark: null,
    auditTime: null,
    auditorId: null,
    auditHistory: [
      {
        action: 'request',
        time: '2024-01-17 09:15:00',
        auditor: '销售员-李明',
        remark: '客户临时改变主意，不需要此产品'
      }
    ]
  },
  {
    id: '3',
    orderNumber: 'ORD202401003',
    customerId: '3',
    customerName: '王五',
    customerPhone: '13700137003',
    products: [
      { id: '3', name: '产品C', price: 800, quantity: 3 }
    ],
    totalAmount: 2400,
    status: 'shipped',
    paymentStatus: 'paid',
    paymentMethod: 'bank',
    shippingAddress: '广州市天河区珠江新城花城大道1号',
    createTime: '2024-01-14 09:15:00',
    updateTime: '2024-01-18 16:30:00',
    createdBy: 'sales2',
    cancelStatus: null,
    cancelReason: null,
    cancelDescription: null,
    cancelRequestTime: null,
    auditStatus: null,
    auditRemark: null,
    auditTime: null,
    auditorId: null
  },
  {
    id: '5',
    orderNumber: 'ORD202401005',
    customerId: '5',
    customerName: '孙七',
    customerPhone: '13500135005',
    products: [
      { id: '5', name: '产品E', price: 2000, quantity: 2 }
    ],
    totalAmount: 4000,
    status: 'pending_cancel',
    paymentStatus: 'paid',
    paymentMethod: 'bank',
    shippingAddress: '杭州市西湖区文三路1号',
    createTime: '2024-01-18 11:30:00',
    updateTime: '2024-01-19 14:20:00',
    createdBy: 'sales2',
    cancelStatus: 'pending',
    cancelReason: 'out_of_stock',
    cancelDescription: '商品库存不足，无法按时发货，客户要求取消订单',
    cancelRequestTime: '2024-01-19 14:20:00',
    auditStatus: null,
    auditRemark: null,
    auditTime: null,
    auditorId: null,
    auditHistory: [
      {
        action: 'request',
        time: '2024-01-19 14:20:00',
        auditor: '销售员-刘强',
        remark: '商品库存不足，无法按时发货，客户要求取消订单'
      }
    ]
  },
  {
    id: '4',
    orderNumber: 'ORD202401004',
    customerId: '4',
    customerName: '赵六',
    customerPhone: '13600136004',
    products: [
      { id: '4', name: '产品D', price: 1200, quantity: 1 }
    ],
    totalAmount: 1200,
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'alipay',
    shippingAddress: '深圳市南山区科技园南区深南大道1号',
    createTime: '2024-01-15 16:45:00',
    updateTime: '2024-01-16 10:30:00',
    createdBy: 'sales3',
    cancelStatus: 'approved',
    cancelReason: 'quality_issue',
    cancelDescription: '产品质量问题，客户要求退款',
    cancelRequestTime: '2024-01-16 08:20:00',
    auditStatus: 'approved',
    auditRemark: '同意取消，质量问题属实',
    auditTime: '2024-01-16 10:30:00',
    auditorId: 'admin',
    auditHistory: [
      {
        action: 'request',
        time: '2024-01-16 08:20:00',
        auditor: '销售员-张华',
        remark: '产品质量问题，客户要求退款'
      },
      {
        action: 'approved',
        time: '2024-01-16 10:30:00',
        auditor: '管理员-王总',
        remark: '同意取消，质量问题属实'
      }
    ]
  }
]

// 获取订单数据
const getMockOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(ORDERS_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load orders from localStorage:', error)
  }
  return [...initialMockOrders]
}

// 保存订单数据
const saveMockOrders = (orders: Order[]) => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders))
  } catch (error) {
    console.warn('Failed to save orders to localStorage:', error)
  }
}

// 获取待审核取消订单数据
const _getPendingCancelOrders = (): Order[] => {
  try {
    const stored = localStorage.getItem(PENDING_CANCEL_ORDERS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load pending cancel orders from localStorage:', error)
  }
  // 从所有订单中筛选出待审核的取消订单
  const allOrders = getMockOrders()
  return allOrders.filter(order => order.status === 'pending_cancel' && order.cancelStatus === 'pending')
}

// 保存待审核取消订单数据
const _savePendingCancelOrders = (orders: Order[]) => {
  try {
    localStorage.setItem(PENDING_CANCEL_ORDERS_KEY, JSON.stringify(orders))
  } catch (error) {
    console.warn('Failed to save pending cancel orders to localStorage:', error)
  }
}

// 短信相关存储键
const SMS_TEMPLATES_KEY = 'crm_mock_sms_templates'
const SMS_APPROVALS_KEY = 'crm_mock_sms_approvals'
const SMS_SENDS_KEY = 'crm_mock_sms_sends'
const CATEGORIES_STORAGE_KEY = 'crm_mock_categories'
const DEPARTMENTS_STORAGE_KEY = 'crm_mock_departments'
const USERS_STORAGE_KEY = 'erp_users_list' // 修复：使用实际的存储key

// 初始化短信模板数据
const initialSmsTemplates: SmsTemplate[] = [
  {
    id: 1,
    name: '客户回访模板',
    content: '尊敬的{customerName}，感谢您对我们产品的支持，我们将为您提供更好的服务。如有任何问题，请联系我们：{phone}',
    type: 'service',
    variables: ['customerName', 'phone'],
    status: 'active',
    createTime: '2024-01-10 09:00:00',
    updateTime: '2024-01-10 09:00:00',
    creator: '张三',
    usage: 156
  },
  {
    id: 2,
    name: '促销活动模板',
    content: '【{companyName}】新年大促销！全场商品{discount}折起，活动时间：{startDate}至{endDate}，详情咨询客服。',
    type: 'marketing',
    variables: ['companyName', 'discount', 'startDate', 'endDate'],
    status: 'active',
    createTime: '2024-01-12 14:30:00',
    updateTime: '2024-01-15 10:20:00',
    creator: '李四',
    usage: 89
  },
  {
    id: 3,
    name: '验证码模板',
    content: '您的验证码是：{code}，请在{minutes}分钟内使用，请勿泄露给他人。',
    type: 'verification',
    variables: ['code', 'minutes'],
    status: 'active',
    createTime: '2024-01-08 16:45:00',
    updateTime: '2024-01-08 16:45:00',
    creator: '王五',
    usage: 1234
  },
  {
    id: 4,
    name: '订单确认通知',
    content: '【{companyName}】您的订单{orderNo}已确认，商品：{productName}，金额：{amount}元，预计{deliveryDate}发货。',
    type: 'notification',
    variables: ['companyName', 'orderNo', 'productName', 'amount', 'deliveryDate'],
    status: 'active',
    createTime: '2024-01-05 10:30:00',
    updateTime: '2024-01-05 10:30:00',
    creator: '系统管理员',
    usage: 892
  },
  {
    id: 5,
    name: '发货通知模板',
    content: '【{companyName}】您的订单{orderNo}已发货，快递单号：{trackingNo}，请注意查收。物流查询：{trackingUrl}',
    type: 'notification',
    variables: ['companyName', 'orderNo', 'trackingNo', 'trackingUrl'],
    status: 'active',
    createTime: '2024-01-06 14:20:00',
    updateTime: '2024-01-06 14:20:00',
    creator: '系统管理员',
    usage: 756
  },
  {
    id: 6,
    name: '付款提醒模板',
    content: '尊敬的{customerName}，您的订单{orderNo}待付款，金额{amount}元，请及时完成支付。如有疑问请联系客服。',
    type: 'notification',
    variables: ['customerName', 'orderNo', 'amount'],
    status: 'active',
    createTime: '2024-01-07 09:15:00',
    updateTime: '2024-01-07 09:15:00',
    creator: '系统管理员',
    usage: 423
  },
  {
    id: 7,
    name: '会议通知模板',
    content: '【会议通知】{meetingTitle}将于{meetingDate} {meetingTime}在{location}举行，请准时参加。联系人：{contact}',
    type: 'notification',
    variables: ['meetingTitle', 'meetingDate', 'meetingTime', 'location', 'contact'],
    status: 'active',
    createTime: '2024-01-09 11:45:00',
    updateTime: '2024-01-09 11:45:00',
    creator: '人事部',
    usage: 234
  },
  {
    id: 8,
    name: '生日祝福模板',
    content: '亲爱的{customerName}，今天是您的生日，{companyName}全体员工祝您生日快乐！特为您准备了生日礼品，请到店领取。',
    type: 'marketing',
    variables: ['customerName', 'companyName'],
    status: 'active',
    createTime: '2024-01-11 16:30:00',
    updateTime: '2024-01-11 16:30:00',
    creator: '市场部',
    usage: 67
  },
  {
    id: 9,
    name: '服务预约确认',
    content: '【{companyName}】您预约的{serviceName}服务已确认，时间：{appointmentDate} {appointmentTime}，地址：{address}，联系电话：{phone}',
    type: 'service',
    variables: ['companyName', 'serviceName', 'appointmentDate', 'appointmentTime', 'address', 'phone'],
    status: 'active',
    createTime: '2024-01-13 13:20:00',
    updateTime: '2024-01-13 13:20:00',
    creator: '客服部',
    usage: 345
  },
  {
    id: 10,
    name: '账户余额提醒',
    content: '【{companyName}】您的账户余额为{balance}元，余额不足可能影响服务使用，请及时充值。充值热线：{phone}',
    type: 'notification',
    variables: ['companyName', 'balance', 'phone'],
    status: 'active',
    createTime: '2024-01-14 08:45:00',
    updateTime: '2024-01-14 08:45:00',
    creator: '财务部',
    usage: 178
  },
  {
    id: 11,
    name: '密码重置通知',
    content: '【{companyName}】您的账户密码已重置，新密码：{newPassword}，请及时登录修改。如非本人操作，请联系客服：{phone}',
    type: 'notification',
    variables: ['companyName', 'newPassword', 'phone'],
    status: 'active',
    createTime: '2024-01-15 12:10:00',
    updateTime: '2024-01-15 12:10:00',
    creator: '技术部',
    usage: 89
  },
  {
    id: 12,
    name: '活动邀请模板',
    content: '【{companyName}】诚邀您参加{eventName}，时间：{eventDate}，地点：{venue}。精彩活动，丰厚奖品等您来！报名电话：{phone}',
    type: 'marketing',
    variables: ['companyName', 'eventName', 'eventDate', 'venue', 'phone'],
    status: 'active',
    createTime: '2024-01-16 15:30:00',
    updateTime: '2024-01-16 15:30:00',
    creator: '市场部',
    usage: 123
  }
]

// 初始化短信审核数据
const initialSmsApprovals: SmsApprovalRecord[] = [
  {
    id: 1,
    applicant: '张三',
    department: '销售部',
    templateId: 1,
    templateName: '客户回访模板',
    recipientCount: 50,
    content: '尊敬的客户，感谢您对我们产品的支持，我们将为您提供更好的服务。如有任何问题，请联系我们：400-123-4567',
    reason: '月度客户回访活动',
    status: 'pending',
    applyTime: '2024-01-15 10:30:00',
    recipients: ['13800138001', '13800138002', '13800138003']
  },
  {
    id: 2,
    applicant: '李四',
    department: '市场部',
    templateId: 2,
    templateName: '促销活动模板',
    recipientCount: 200,
    content: '【科技公司】新年大促销！全场商品8折起，活动时间：1月20日至1月31日，详情咨询客服。',
    reason: '新年促销活动推广',
    status: 'approved',
    applyTime: '2024-01-14 14:20:00',
    approveTime: '2024-01-14 16:45:00',
    approver: '王经理',
    approveRemark: '活动内容合规，批准发送',
    recipients: ['13800138004', '13800138005']
  }
]

// 初始化短信发送记录数据
const initialSmsSends: SmsSendRecord[] = [
  {
    id: 1,
    templateId: 2,
    templateName: '促销活动模板',
    content: '【科技公司】新年大促销！全场商品8折起，活动时间：1月20日至1月31日，详情咨询客服。',
    recipients: ['13800138004', '13800138005', '13800138006'],
    successCount: 3,
    failCount: 0,
    status: 'success',
    sendTime: '2024-01-14 17:00:00',
    operator: '李四',
    cost: 0.15
  }
]

// 获取短信模板数据
const getSmsTemplates = (): SmsTemplate[] => {
  try {
    const stored = localStorage.getItem(SMS_TEMPLATES_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load SMS templates from localStorage:', error)
  }
  return [...initialSmsTemplates]
}

// 保存短信模板数据
const saveSmsTemplates = (templates: SmsTemplate[]) => {
  try {
    localStorage.setItem(SMS_TEMPLATES_KEY, JSON.stringify(templates))
  } catch (error) {
    console.warn('Failed to save SMS templates to localStorage:', error)
  }
}

// 获取短信审核数据
const getSmsApprovals = (): SmsApprovalRecord[] => {
  try {
    const stored = localStorage.getItem(SMS_APPROVALS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load SMS approvals from localStorage:', error)
  }
  return [...initialSmsApprovals]
}

// 保存短信审核数据
const saveSmsApprovals = (approvals: SmsApprovalRecord[]) => {
  try {
    localStorage.setItem(SMS_APPROVALS_KEY, JSON.stringify(approvals))
  } catch (error) {
    console.warn('Failed to save SMS approvals to localStorage:', error)
  }
}

// 获取短信发送记录数据
const getSmsSends = (): SmsSendRecord[] => {
  try {
    const stored = localStorage.getItem(SMS_SENDS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.warn('Failed to load SMS sends from localStorage:', error)
  }
  return [...initialSmsSends]
}

// 保存短信发送记录数据
const saveSmsSends = (sends: SmsSendRecord[]) => {
  try {
    localStorage.setItem(SMS_SENDS_KEY, JSON.stringify(sends))
  } catch (error) {
    console.warn('Failed to save SMS sends to localStorage:', error)
  }
}

// 分类数据存储和读取
const getMockCategories = (): any[] => {
  try {
    const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('读取分类数据失败:', error)
    return []
  }
}

const saveMockCategories = (categories: any[]) => {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories))
  } catch (error) {
    console.error('保存分类数据失败:', error)
  }
}

// 获取部门数据
const getMockDepartments = (): any[] => {
  try {
    const stored = localStorage.getItem(DEPARTMENTS_STORAGE_KEY)
    if (stored) {
      const departments = JSON.parse(stored)
      console.log('[Mock API] 从存储读取到部门数据:', departments.length, '个部门')
      return departments
    }
  } catch (error) {
    console.error('读取部门数据失败:', error)
  }

  // 返回空数组，不再提供初始部门数据
  console.log('[Mock API] 初始化空的部门数据')
  return []
}

// 清除部门数据
const clearMockDepartments = () => {
  try {
    localStorage.removeItem(DEPARTMENTS_STORAGE_KEY)
    console.log('[Mock API] 已清除所有部门数据')
  } catch (error) {
    console.error('清除部门数据失败:', error)
  }
}

const saveMockDepartments = (departments: any[]) => {
  try {
    localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments))
  } catch (error) {
    console.error('保存部门数据失败:', error)
  }
}

// 获取用户数据
const getMockUsers = (): any[] => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY)
    if (stored) {
      const users = JSON.parse(stored)
      console.log('[Mock API] 从存储读取到用户数据:', users.length, '个用户')
      return users
    }
  } catch (error) {
    console.error('读取用户数据失败:', error)
  }

  // 返回空数组，不再提供初始用户数据
  console.log('[Mock API] 初始化空的用户数据')
  return []
}

// 清除用户数据
const clearMockUsers = () => {
  try {
    localStorage.removeItem(USERS_STORAGE_KEY)
    console.log('[Mock API] 已清除所有用户数据')
  } catch (error) {
    console.error('清除用户数据失败:', error)
  }
}

const saveMockUsers = (users: any[]) => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    console.log('[Mock API] 已保存用户数据:', users.length, '个用户')
  } catch (error) {
    console.error('保存用户数据失败:', error)
  }
}

// 获取当前客户数据
let mockCustomers = getMockCustomers()

// 模拟延迟
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms))

// Mock API实现
export const mockApi = {
  // 根据用户ID获取用户信息
  getUserById(userId: string) {
    const userDatabase = [
      {
        id: 'admin',
        username: 'admin',
        realName: '系统管理员',
        email: 'admin@example.com',
        phone: '13800138000',
        roleId: 'admin',
        status: 'active'
      },
      {
        id: 'manager',
        username: 'manager',
        realName: '部门经理',
        email: 'manager@example.com',
        phone: '13800138001',
        roleId: 'manager',
        status: 'active'
      },
      {
        id: 'sales1',
        username: 'sales1',
        realName: '张销售',
        email: 'sales1@example.com',
        phone: '13800138002',
        roleId: 'employee',
        status: 'active'
      },
      {
        id: 'sales2',
        username: 'sales2',
        realName: '李销售',
        email: 'sales2@example.com',
        phone: '13800138003',
        roleId: 'employee',
        status: 'active'
      },
      {
        id: 'sales3',
        username: 'sales3',
        realName: '王销售',
        email: 'sales3@example.com',
        phone: '13800138004',
        roleId: 'employee',
        status: 'active'
      }
    ]

    return userDatabase.find(user => user.id === userId)
  },

  // 获取客户列表
  async getCustomerList(params?: CustomerSearchParams): Promise<CustomerListResponse> {
    await delay()

    // 每次获取列表时都重新从localStorage获取最新数据，确保数据同步
    mockCustomers = getMockCustomers()
    console.log('Mock API: 获取客户列表，当前客户总数', mockCustomers.length)

    let filteredCustomers = [...mockCustomers]

    // 应用搜索过滤
    if (params?.name) {
      filteredCustomers = filteredCustomers.filter(c =>
        c.name.includes(params.name!)
      )
    }

    if (params?.phone) {
      filteredCustomers = filteredCustomers.filter(c =>
        c.phone.includes(params.phone!)
      )
    }

    if (params?.level) {
      filteredCustomers = filteredCustomers.filter(c =>
        c.level === params.level
      )
    }

    // 分页处理
    const page = params?.page || 1
    const pageSize = params?.pageSize || 50  // 增加默认分页大小，确保能显示更多客户
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: filteredCustomers.slice(start, end),
      total: filteredCustomers.length,
      page,
      pageSize
    }
  },

  // 检查客户是否存在（根据手机号）
  async checkCustomerExists(phone: string): Promise<Customer | null> {
    try {
      console.log('Mock API: checkCustomerExists 开始调用，手机号:', phone)

      // 验证输入参数
      if (!phone || typeof phone !== 'string') {
        console.error('Mock API: 无效的手机号参数:', phone)
        return null
      }

      await delay(200) // 较短的延迟

      // 重新获取最新数据
      mockCustomers = getMockCustomers()

      // 确保 mockCustomers 是数组
      if (!Array.isArray(mockCustomers)) {
        console.error('Mock API: mockCustomers is not an array:', mockCustomers)
        mockCustomers = [...initialMockCustomers]
      }

      console.log('Mock API: 当前客户总数:', mockCustomers.length)
      console.log('Mock API: 所有客户手机号:', mockCustomers.map(c => c.phone))

      const existingCustomer = mockCustomers.find(c => c.phone === phone)

      console.log('Mock API: 检查客户是否存在', phone, existingCustomer ? '存在' : '不存在')
      if (existingCustomer) {
        console.log('Mock API: 找到的客户:', existingCustomer)

        try {
          // 获取创建者信息
          const creatorInfo = this.getUserById(existingCustomer.createdBy)

          // 返回包含创建者信息的客户数据
          const customerWithCreator = {
            ...existingCustomer,
            creatorName: creatorInfo?.realName || '未知用户'
          }

          console.log('Mock API: 返回客户信息（含创建者）:', customerWithCreator)
          return customerWithCreator
        } catch (creatorError) {
          console.warn('Mock API: 获取创建者信息失败，使用默认值:', creatorError)
          // 即使获取创建者信息失败，也返回客户信息
          return {
            ...existingCustomer,
            creatorName: '未知用户'
          }
        }
      }

      console.log('Mock API: 客户不存在，返回null')
      return null
    } catch (error) {
      console.error('Mock API: checkCustomerExists 执行失败:', error)
      // 不抛出错误，返回null表示未找到
      return null
    }
  },

  // 创建客户
  async createCustomer(data: Omit<Customer, 'id' | 'createTime' | 'orderCount'>): Promise<Customer> {
    await delay()

    try {
      const newCustomer: Customer = {
        ...data,
        id: `customer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createTime: new Date().toISOString(),
        orderCount: 0
      }

      // 使用customerStorage的addCustomer方法，它包含了重复检查和保存逻辑
      const savedCustomer = customerStorage.addCustomer(newCustomer)

      // 更新本地mockCustomers数组
      mockCustomers = getMockCustomers()

      console.log('Mock API: 创建客户成功', savedCustomer)
      console.log('Mock API: 当前客户总数', mockCustomers.length)

      return savedCustomer
    } catch (error) {
      console.error('Mock API: 创建客户失败', error)
      throw error
    }
  },

  // 更新客户
  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer | null> {
    await delay()

    // 重新获取最新数据
    mockCustomers = getMockCustomers()

    // 确保 mockCustomers 是数组
    if (!Array.isArray(mockCustomers)) {
      console.error('Mock API: mockCustomers is not an array:', mockCustomers)
      mockCustomers = [...initialMockCustomers]
    }

    const index = mockCustomers.findIndex(c => c.id === id)
    if (index !== -1) {
      mockCustomers[index] = { ...mockCustomers[index], ...data }

      // 保存到存储
      saveMockCustomers(mockCustomers)

      return mockCustomers[index]
    }

    throw new Error('客户不存在')
  },

  // 删除客户
  async deleteCustomer(id: string): Promise<void> {
    await delay()

    // 重新获取最新数据
    mockCustomers = getMockCustomers()

    // 确保 mockCustomers 是数组
    if (!Array.isArray(mockCustomers)) {
      console.error('Mock API: mockCustomers is not an array:', mockCustomers)
      mockCustomers = [...initialMockCustomers]
    }

    const index = mockCustomers.findIndex(c => c.id === id)
    if (index !== -1) {
      mockCustomers.splice(index, 1)

      // 保存到存储
      saveMockCustomers(mockCustomers)
    } else {
      throw new Error('客户不存在')
    }
  },

  // 获取客户详情
  async getCustomerDetail(id: string): Promise<Customer> {
    await delay()

    // 确保 mockCustomers 是数组
    if (!Array.isArray(mockCustomers)) {
      console.error('Mock API: mockCustomers is not an array:', mockCustomers)
      mockCustomers = [...initialMockCustomers]
    }

    const customer = mockCustomers.find(c => c.id === id)
    if (customer) {
      return customer
    }

    throw new Error('客户不存在')
  },

  // ========== 订单相关方法 ==========

  // 获取订单列表
  async getOrderList(params?: OrderSearchParams): Promise<OrderListResponse> {
    await delay()

    let orders = getMockOrders()

    // 应用搜索过滤
    if (params?.orderNumber) {
      orders = orders.filter(o => o.orderNumber.includes(params.orderNumber!))
    }

    if (params?.customerName) {
      orders = orders.filter(o => o.customerName.includes(params.customerName!))
    }

    if (params?.status) {
      orders = orders.filter(o => o.status === params.status)
    }

    if (params?.paymentStatus) {
      orders = orders.filter(o => o.paymentStatus === params.paymentStatus)
    }

    // 分页处理
    const page = params?.page || 1
    const pageSize = params?.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: orders.slice(start, end),
      total: orders.length,
      page,
      pageSize
    }
  },

  // 提交取消订单申请
  async submitCancelRequest(params: OrderCancelRequestParams): Promise<{ success: boolean; message: string }> {
    await delay()

    const orders = getMockOrders()
    const orderIndex = orders.findIndex(o => o.id === params.orderId)

    if (orderIndex === -1) {
      throw new Error('订单不存在')
    }

    const order = orders[orderIndex]

    // 检查订单状态是否允许取消
    if (['shipped', 'delivered', 'completed', 'cancelled'].includes(order.status)) {
      throw new Error('当前订单状态不允许取消')
    }

    // 更新订单状态
    orders[orderIndex] = {
      ...order,
      status: 'pending_cancel',
      cancelStatus: 'pending',
      cancelReason: params.reason,
      cancelDescription: params.description,
      cancelRequestTime: new Date().toLocaleString('zh-CN'),
      updateTime: new Date().toLocaleString('zh-CN')
    }

    // 保存订单数据
    saveMockOrders(orders)

    console.log('Mock API: 提交取消订单申请成功', params.orderId)

    return {
      success: true,
      message: '取消申请已提交，等待审核'
    }
  },

  // 获取待审核的取消订单列表
  async getPendingCancelOrderList(): Promise<Order[]> {
    await delay()

    const orders = getMockOrders()
    const pendingCancelOrders = orders.filter(order =>
      order.status === 'pending_cancel' && order.cancelStatus === 'pending'
    )

    console.log('Mock API: 获取待审核取消订单列表', pendingCancelOrders.length)

    return pendingCancelOrders
  },

  // 获取已审核的取消订单列表
  async getAuditedCancelOrderList(): Promise<Order[]> {
    await delay()

    const orders = getMockOrders()
    const auditedCancelOrders = orders.filter(order =>
      order.cancelStatus && ['approved', 'rejected'].includes(order.cancelStatus)
    )

    console.log('Mock API: 获取已审核取消订单列表', auditedCancelOrders.length)

    return auditedCancelOrders
  },

  // 审核取消订单申请
  async auditCancelRequest(orderId: string, params: OrderCancelAuditParams): Promise<{ success: boolean; message: string }> {
    await delay()

    const orders = getMockOrders()
    const orderIndex = orders.findIndex(o => o.id === orderId)

    if (orderIndex === -1) {
      throw new Error('订单不存在')
    }

    const order = orders[orderIndex]

    if (order.status !== 'pending_cancel' || order.cancelStatus !== 'pending') {
      throw new Error('订单不在待审核状态')
    }

    // 更新订单状态
    if (params.action === 'approve') {
      orders[orderIndex] = {
        ...order,
        status: 'cancelled',
        cancelStatus: 'approved',
        auditStatus: 'approved',
        auditRemark: params.remark,
        auditTime: new Date().toLocaleString('zh-CN'),
        auditorId: params.auditorId,
        updateTime: new Date().toLocaleString('zh-CN')
      }
    } else {
      orders[orderIndex] = {
        ...order,
        status: 'cancel_failed',
        cancelStatus: 'rejected',
        auditStatus: 'rejected',
        auditRemark: params.remark,
        auditTime: new Date().toLocaleString('zh-CN'),
        auditorId: params.auditorId,
        updateTime: new Date().toLocaleString('zh-CN')
      }
    }

    // 保存订单数据
    saveMockOrders(orders)

    console.log('Mock API: 审核取消订单申请成功', orderId, params.action)

    return {
      success: true,
      message: params.action === 'approve' ? '取消申请已通过' : '取消申请已拒绝'
    }
  },

  // 更新订单
  async updateOrder(orderId: string, data: Partial<Order>): Promise<Order> {
    await delay()

    const orders = getMockOrders()
    const orderIndex = orders.findIndex(o => o.id === orderId)

    if (orderIndex === -1) {
      throw new Error('订单不存在')
    }

    const existingOrder = orders[orderIndex]

    // 更新订单，但保持原有状态（除非明确指定要更改状态）
    const updatedOrder = {
      ...existingOrder,
      ...data,
      id: orderId, // 确保ID不被覆盖
      orderNumber: existingOrder.orderNumber, // 确保订单号不被覆盖
      createTime: existingOrder.createTime, // 确保创建时间不被覆盖
      updateTime: new Date().toLocaleString('zh-CN'),
      // 如果没有明确指定状态，保持原状态
      status: data.status || existingOrder.status,
      auditStatus: data.auditStatus || existingOrder.auditStatus
    }

    orders[orderIndex] = updatedOrder
    saveMockOrders(orders)

    console.log('Mock API: 更新订单成功', orderId, data)

    return updatedOrder
  },

  // 获取订单统计数据
  async getOrderStatistics(): Promise<OrderStatistics> {
    await delay()

    const orders = getMockOrders()

    // 计算待审核订单数量和金额
    const pendingOrders = orders.filter(order => order.auditStatus === 'pending')
    const pendingCount = pendingOrders.length
    const pendingAmount = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0)

    // 计算今日新增订单
    const today = new Date().toISOString().split('T')[0]
    const todayCount = pendingOrders.filter(order => {
      const orderDate = new Date(order.createTime).toISOString().split('T')[0]
      return orderDate === today
    }).length

    // 计算超时订单（创建时间超过24小时且仍待审核）
    const now = new Date()
    const urgentCount = pendingOrders.filter(order => {
      const createTime = new Date(order.createTime)
      const hoursDiff = (now.getTime() - createTime.getTime()) / (1000 * 60 * 60)
      return hoursDiff > 24
    }).length

    console.log('Mock API: 获取订单统计数据成功', { pendingCount, pendingAmount, todayCount, urgentCount })

    return {
      pendingCount,
      pendingAmount,
      todayCount,
      urgentCount
    }
  },

  // 提交订单审核
  async submitOrderAudit(orderId: string, params: any): Promise<{ success: boolean; message: string }> {
    await delay()

    const orders = getMockOrders()
    const orderIndex = orders.findIndex(o => o.id === orderId)

    if (orderIndex === -1) {
      throw new Error('订单不存在')
    }

    const order = orders[orderIndex]

    // 检查订单状态是否允许提审
    if (order.status !== 'pending' && order.status !== 'draft') {
      throw new Error('订单状态不允许提审')
    }

    // 更新订单状态
    orders[orderIndex] = {
      ...order,
      auditStatus: 'pending',
      status: params.markType === 'normal' ? 'pending' : 'pending', // 根据markType设置状态
      updateTime: new Date().toLocaleString('zh-CN')
    }

    // 保存订单数据
    saveMockOrders(orders)

    console.log('Mock API: 提交订单审核成功', orderId, params)

    return {
      success: true,
      message: '订单已提交审核'
    }
  },

  // ========== 短信模板相关方法 ==========

  // 获取短信模板列表
  async getSmsTemplateList(params?: SmsTemplateSearchParams): Promise<SmsTemplateListResponse> {
    await delay()

    let templates = getSmsTemplates()

    // 应用搜索过滤
    if (params?.name) {
      templates = templates.filter(t => t.name.includes(params.name!))
    }

    if (params?.type) {
      templates = templates.filter(t => t.type === params.type)
    }

    if (params?.status) {
      templates = templates.filter(t => t.status === params.status)
    }

    // 分页处理
    const page = params?.page || 1
    const pageSize = params?.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: templates.slice(start, end),
      total: templates.length,
      page,
      pageSize
    }
  },

  // 获取短信模板详情
  async getSmsTemplateDetail(id: number): Promise<SmsTemplate> {
    await delay()

    const templates = getSmsTemplates()
    const template = templates.find(t => t.id === id)
    if (template) {
      return template
    }

    throw new Error('模板不存在')
  },

  // 创建短信模板
  async createSmsTemplate(data: Omit<SmsTemplate, 'id' | 'createTime' | 'updateTime' | 'usage'>): Promise<SmsTemplate> {
    await delay()

    const templates = getSmsTemplates()
    const newTemplate: SmsTemplate = {
      ...data,
      id: Math.max(...templates.map(t => t.id), 0) + 1,
      createTime: new Date().toLocaleString(),
      updateTime: new Date().toLocaleString(),
      usage: 0
    }

    templates.push(newTemplate)
    saveSmsTemplates(templates)

    return newTemplate
  },

  // 更新短信模板
  async updateSmsTemplate(id: number, data: Partial<SmsTemplate>): Promise<SmsTemplate> {
    await delay()

    const templates = getSmsTemplates()
    const index = templates.findIndex(t => t.id === id)
    if (index !== -1) {
      templates[index] = {
        ...templates[index],
        ...data,
        updateTime: new Date().toLocaleString()
      }

      saveSmsTemplates(templates)
      return templates[index]
    }

    throw new Error('模板不存在')
  },

  // 删除短信模板
  async deleteSmsTemplate(id: number): Promise<void> {
    await delay()

    const templates = getSmsTemplates()
    const index = templates.findIndex(t => t.id === id)
    if (index !== -1) {
      templates.splice(index, 1)
      saveSmsTemplates(templates)
    } else {
      throw new Error('模板不存在')
    }
  },

  // 预览短信模板
  async previewSmsTemplate(content: string, variables: Record<string, string>): Promise<string> {
    await delay()

    let result = content
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })

    return result
  },

  // ========== 短信审核相关方法 ==========

  // 获取短信审核列表
  async getSmsApprovalList(params?: SmsApprovalSearchParams): Promise<SmsApprovalListResponse> {
    await delay()

    let approvals = getSmsApprovals()

    // 应用搜索过滤
    if (params?.applicant) {
      approvals = approvals.filter(a => a.applicant.includes(params.applicant!))
    }

    if (params?.status) {
      approvals = approvals.filter(a => a.status === params.status)
    }

    if (params?.dateRange && params.dateRange.length === 2) {
      const [startDate, endDate] = params.dateRange
      approvals = approvals.filter(a => {
        const applyDate = a.applyTime.split(' ')[0]
        return applyDate >= startDate && applyDate <= endDate
      })
    }

    // 分页处理
    const page = params?.page || 1
    const pageSize = params?.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: approvals.slice(start, end),
      total: approvals.length,
      page,
      pageSize
    }
  },

  // 获取短信审核详情
  async getSmsApprovalDetail(id: number): Promise<SmsApprovalRecord> {
    await delay()

    const approvals = getSmsApprovals()
    const approval = approvals.find(a => a.id === id)
    if (approval) {
      return approval
    }

    throw new Error('审核记录不存在')
  },

  // 提交短信审核申请
  async submitSmsApproval(data: {
    templateId: number
    recipients: string[]
    reason: string
    variables?: Record<string, string>
  }): Promise<SmsApprovalRecord> {
    await delay()

    const templates = getSmsTemplates()
    const template = templates.find(t => t.id === data.templateId)
    if (!template) {
      throw new Error('模板不存在')
    }

    const approvals = getSmsApprovals()
    const newApproval: SmsApprovalRecord = {
      id: Math.max(...approvals.map(a => a.id), 0) + 1,
      applicant: '当前用户',
      department: '销售部',
      templateId: data.templateId,
      templateName: template.name,
      recipientCount: data.recipients.length,
      content: template.content,
      reason: data.reason,
      status: 'pending',
      applyTime: new Date().toLocaleString(),
      recipients: data.recipients
    }

    approvals.push(newApproval)
    saveSmsApprovals(approvals)

    return newApproval
  },

  // 审核通过
  async approveSms(id: number, remark?: string): Promise<SmsApprovalRecord> {
    await delay()

    const approvals = getSmsApprovals()
    const index = approvals.findIndex(a => a.id === id)
    if (index !== -1) {
      approvals[index] = {
        ...approvals[index],
        status: 'approved',
        approveTime: new Date().toLocaleString(),
        approver: '当前用户',
        approveRemark: remark
      }

      saveSmsApprovals(approvals)
      return approvals[index]
    }

    throw new Error('审核记录不存在')
  },

  // 审核拒绝
  async rejectSms(id: number, remark: string): Promise<SmsApprovalRecord> {
    await delay()

    const approvals = getSmsApprovals()
    const index = approvals.findIndex(a => a.id === id)
    if (index !== -1) {
      approvals[index] = {
        ...approvals[index],
        status: 'rejected',
        approveTime: new Date().toLocaleString(),
        approver: '当前用户',
        approveRemark: remark
      }

      saveSmsApprovals(approvals)
      return approvals[index]
    }

    throw new Error('审核记录不存在')
  },

  // 批量审核
  async batchApproveSms(ids: number[], action: 'approve' | 'reject', remark?: string): Promise<SmsApprovalRecord[]> {
    await delay()

    const approvals = getSmsApprovals()
    const results: SmsApprovalRecord[] = []

    ids.forEach(id => {
      const index = approvals.findIndex(a => a.id === id)
      if (index !== -1) {
        approvals[index] = {
          ...approvals[index],
          status: action === 'approve' ? 'approved' : 'rejected',
          approveTime: new Date().toLocaleString(),
          approver: '当前用户',
          approveRemark: remark
        }
        results.push(approvals[index])
      }
    })

    saveSmsApprovals(approvals)
    return results
  },

  // ========== 短信发送相关方法 ==========

  // 获取短信发送记录列表
  async getSmsSendList(params?: SmsSendSearchParams): Promise<SmsSendListResponse> {
    await delay()

    let sends = getSmsSends()

    // 应用搜索过滤
    if (params?.templateName) {
      sends = sends.filter(s => s.templateName.includes(params.templateName!))
    }

    if (params?.status) {
      sends = sends.filter(s => s.status === params.status)
    }

    if (params?.dateRange && params.dateRange.length === 2) {
      const [startDate, endDate] = params.dateRange
      sends = sends.filter(s => {
        const sendDate = s.sendTime.split(' ')[0]
        return sendDate >= startDate && sendDate <= endDate
      })
    }

    // 分页处理
    const page = params?.page || 1
    const pageSize = params?.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: sends.slice(start, end),
      total: sends.length,
      page,
      pageSize
    }
  },

  // 获取短信发送详情
  async getSmsSendDetail(id: number): Promise<SmsSendRecord> {
    await delay()

    const sends = getSmsSends()
    const send = sends.find(s => s.id === id)
    if (send) {
      return send
    }

    throw new Error('发送记录不存在')
  },

  // 发送短信
  async sendSms(data: {
    templateId: number
    recipients: string[]
    variables?: Record<string, string>
  }): Promise<SmsSendRecord> {
    await delay()

    const templates = getSmsTemplates()
    const template = templates.find(t => t.id === data.templateId)
    if (!template) {
      throw new Error('模板不存在')
    }

    const sends = getSmsSends()
    const newSend: SmsSendRecord = {
      id: Math.max(...sends.map(s => s.id), 0) + 1,
      templateId: data.templateId,
      templateName: template.name,
      content: template.content,
      recipients: data.recipients,
      successCount: data.recipients.length,
      failCount: 0,
      status: 'success',
      sendTime: new Date().toLocaleString(),
      operator: '当前用户',
      cost: data.recipients.length * 0.05
    }

    sends.push(newSend)
    saveSmsSends(sends)

    // 更新模板使用次数
    const templateIndex = templates.findIndex(t => t.id === data.templateId)
    if (templateIndex !== -1) {
      templates[templateIndex].usage += data.recipients.length
      saveSmsTemplates(templates)
    }

    return newSend
  },

  // 测试发送短信
  async testSms(phone: string, _content: string): Promise<{ success: boolean; message: string }> {
    await delay()

    // 模拟测试发送
    const isValidPhone = /^1[3-9]\d{9}$/.test(phone)
    if (!isValidPhone) {
      return { success: false, message: '手机号格式不正确' }
    }

    return { success: true, message: '测试短信发送成功' }
  },

  // ========== 短信统计相关方法 ==========

  // 获取短信统计数据
  async getSmsStatistics(_dateRange?: [string, string]): Promise<SmsStatistics> {
    await delay()

    const sends = getSmsSends()
    const templates = getSmsTemplates()

    // 计算统计数据
    const totalSent = sends.reduce((sum, send) => sum + send.successCount, 0)
    const totalFail = sends.reduce((sum, send) => sum + send.failCount, 0)
    const successRate = totalSent + totalFail > 0 ? (totalSent / (totalSent + totalFail)) * 100 : 0
    const totalCost = sends.reduce((sum, send) => sum + send.cost, 0)

    // 模板使用统计
    const templateUsage = templates.map(template => ({
      templateName: template.name,
      count: template.usage
    }))

    // 趋势数据（模拟）
    const trendData = [
      { date: '2024-01-10', count: 45, cost: 2.25 },
      { date: '2024-01-11', count: 67, cost: 3.35 },
      { date: '2024-01-12', count: 89, cost: 4.45 },
      { date: '2024-01-13', count: 123, cost: 6.15 },
      { date: '2024-01-14', count: 156, cost: 7.80 },
      { date: '2024-01-15', count: 134, cost: 6.70 }
    ]

    return {
      totalSent,
      successRate: Math.round(successRate * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      monthlyUsage: totalSent,
      dailyUsage: Math.round(totalSent / 30),
      templateUsage,
      trendData
    }
  },

  // 获取短信使用趋势
  async getSmsTrend(dateRange: [string, string], _type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<SmsTrendData[]> {
    await delay()

    // 模拟趋势数据
    const trendData = [
      { date: '2024-01-10', count: 45, cost: 2.25 },
      { date: '2024-01-11', count: 67, cost: 3.35 },
      { date: '2024-01-12', count: 89, cost: 4.45 },
      { date: '2024-01-13', count: 123, cost: 6.15 },
      { date: '2024-01-14', count: 156, cost: 7.80 },
      { date: '2024-01-15', count: 134, cost: 6.70 }
    ]

    return trendData
  },

  // 物流状态相关API
  // 获取物流状态列表
  async getLogisticsStatusList(params?: any): Promise<any> {
    await delay()

    // 从localStorage获取真实的订单数据
    const ordersData = localStorage.getItem(ORDERS_STORAGE_KEY)
    let realOrders: Order[] = []

    if (ordersData) {
      try {
        realOrders = JSON.parse(ordersData)
      } catch (error) {
        console.error('解析订单数据失败:', error)
      }
    }

    // 转换订单数据为物流状态格式
    // 筛选已发货的订单（包括shipped和delivered状态），且有物流信息
    const logisticsOrders = realOrders
      .filter(order =>
        (order.status === 'shipped' || order.status === 'delivered') &&
        (order.trackingNumber || order.expressNo) &&
        order.expressCompany
      )
      .map(order => ({
        id: order.id,
        orderNo: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.receiverPhone,
        productName: order.products?.map(p => p.name).join('、') || '商品',
        quantity: order.products?.reduce((sum, p) => sum + p.quantity, 0) || 1,
        amount: order.totalAmount,
        status: order.logisticsStatus || 'shipped', // 使用物流状态，默认为已发货
        trackingNo: order.trackingNumber || order.expressNo,
        logisticsCompany: order.expressCompany,
        createTime: order.createTime,
        updateTime: order.shippingTime || order.createTime,
        shippingTime: order.shippingTime, // 发货时间
        remark: order.remark || '已发货'
      }))

    // 添加一些模拟的测试订单（用于演示不同发货时间的筛选）
    const currentDate = new Date()
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(Math.floor(Math.random() * 12) + 9).padStart(2, '0') // 9-20点随机
      const minutes = String(Math.floor(Math.random() * 60)).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:00`
    }

    const testOrders = [
      // 今日发货
      {
        id: 'test1',
        orderNo: 'ORD202401005',
        customerName: '张三',
        customerPhone: '13800138005',
        productName: '蓝牙耳机',
        quantity: 2,
        amount: 599,
        status: 'shipped',
        trackingNo: 'SF1234567890',
        logisticsCompany: '顺丰速运',
        createTime: formatDateTime(currentDate),
         updateTime: formatDateTime(currentDate),
         shippingTime: formatDateTime(currentDate),
        remark: '今日发货'
      },
      // 3天前发货
      {
        id: 'test2',
        orderNo: 'ORD202401006',
        customerName: '李四',
        customerPhone: '13800138006',
        productName: '手机壳',
        quantity: 1,
        amount: 89,
        status: 'shipped',
        trackingNo: 'YTO9876543210',
        logisticsCompany: '圆通速递',
        createTime: formatDateTime(new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
         updateTime: formatDateTime(new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
         shippingTime: formatDateTime(new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
        remark: '3天前发货'
      },
      // 5天前发货
      {
        id: 'test3',
        orderNo: 'ORD202401007',
        customerName: '王五',
        customerPhone: '13800138007',
        productName: '数据线',
        quantity: 3,
        amount: 150,
        status: 'delivered',
        trackingNo: 'ZTO1122334455',
        logisticsCompany: '中通快递',
        createTime: formatDateTime(new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
         updateTime: formatDateTime(new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
         shippingTime: formatDateTime(new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
        remark: '5天前发货，已签收'
      },
      // 10天前发货
      {
        id: 'test4',
        orderNo: 'ORD202401008',
        customerName: '赵六',
        customerPhone: '13800138008',
        productName: '充电宝',
        quantity: 1,
        amount: 299,
        status: 'delivered',
        trackingNo: 'EMS6677889900',
        logisticsCompany: '邮政EMS',
        createTime: formatDateTime(new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000)),
         updateTime: formatDateTime(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)),
         shippingTime: formatDateTime(new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000)),
        remark: '10天前发货，已签收'
      },
      // 待办订单
      {
        id: 'todo1',
        orderNo: 'ORD202401004',
        customerName: '钱七',
        customerPhone: '13800138004',
        productName: '智能手表',
        quantity: 1,
        amount: 1299,
        status: 'todo',
        trackingNo: 'ZTO5555666677',
        logisticsCompany: '中通快递',
        createTime: formatDateTime(new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
         updateTime: formatDateTime(new Date()),
         shippingTime: formatDateTime(new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
        remark: '需要跟进'
      }
    ]

    // 合并真实订单和模拟测试订单
    const allOrders = [...logisticsOrders, ...testOrders]

    // 根据tab筛选
    let filteredOrders = allOrders
    if (params?.tab) {
      if (params.tab === 'pending') {
        // 待更新：已发货但物流状态还是shipped的订单
        filteredOrders = allOrders.filter(order => order.status === 'shipped')
      } else if (params.tab === 'updated') {
        // 已更新：物流状态已更新的订单（delivered, rejected等）
        filteredOrders = allOrders.filter(order => ['delivered', 'rejected', 'returned', 'abnormal'].includes(order.status))
      } else if (params.tab === 'todo') {
        // 待办：标记为待办的订单
        filteredOrders = allOrders.filter(order => order.status === 'todo')
      }
    }

    // 按发货时间筛选（如果有日期范围参数）
    if (params?.dateRange && params.dateRange.length === 2) {
      const [startDate, endDate] = params.dateRange
      filteredOrders = filteredOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        const shippingDate = shippingTime.split(' ')[0] // 提取日期部分

        // 如果只有endDate（用于"X天前"筛选），筛选发货时间在该日期或之前的订单
        if (!startDate && endDate) {
          return shippingDate <= endDate
        }
        // 如果有完整的日期范围，按范围筛选
        else if (startDate && endDate) {
          return shippingDate >= startDate && shippingDate <= endDate
        }
        // 如果只有startDate，筛选该日期之后的订单
        else if (startDate && !endDate) {
          return shippingDate >= startDate
        }

        return true
      })
    }

    // 关键词搜索
    if (params?.keyword) {
      const keyword = params.keyword.toLowerCase()
      filteredOrders = filteredOrders.filter(order =>
        order.orderNo.toLowerCase().includes(keyword) ||
        order.customerName.toLowerCase().includes(keyword) ||
        order.trackingNo.toLowerCase().includes(keyword)
      )
    }

    // 分页
    const page = params?.page || 1
    const pageSize = params?.pageSize || 20
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

    return {
      list: paginatedOrders,
      total: filteredOrders.length,
      page,
      pageSize
    }
  },

  // 获取物流状态汇总数据
  async getLogisticsStatusSummary(params?: any): Promise<any> {
    await delay()

    // 从localStorage获取真实的订单数据
    const ordersData = localStorage.getItem(ORDERS_STORAGE_KEY)
    let realOrders: Order[] = []

    if (ordersData) {
      try {
        realOrders = JSON.parse(ordersData)
      } catch (error) {
        console.error('解析订单数据失败:', error)
      }
    }

    // 转换订单数据为物流状态格式
    // 筛选已发货的订单（包括shipped和delivered状态），且有物流信息
    const logisticsOrders = realOrders
      .filter(order =>
        (order.status === 'shipped' || order.status === 'delivered') &&
        (order.trackingNumber || order.expressNo) &&
        order.expressCompany
      )
      .map(order => ({
        status: order.logisticsStatus || 'shipped',
        shippingTime: order.shippingTime,
        createTime: order.createTime
      }))

    // 添加模拟的待办订单
    const todoOrders = [{ status: 'todo', shippingTime: '2024-01-12 15:30:00', createTime: '2024-01-12 11:20:00' }]

    const allOrders = [...logisticsOrders, ...todoOrders]

    // 按发货时间筛选（如果有日期范围参数）
    let filteredOrders = allOrders
    if (params?.dateRange && params.dateRange.length === 2) {
      const [startDate, endDate] = params.dateRange
      filteredOrders = allOrders.filter(order => {
        const shippingTime = order.shippingTime || order.createTime
        return shippingTime >= startDate && shippingTime <= endDate
      })
    }

    // 计算各状态的数量
    const pending = filteredOrders.filter(order => order.status === 'shipped').length
    const updated = filteredOrders.filter(order => ['delivered', 'rejected', 'returned', 'abnormal'].includes(order.status)).length
    const todo = filteredOrders.filter(order => order.status === 'todo').length
    const total = filteredOrders.length

    return {
      pending,
      updated,
      todo,
      total
    }
  },

  // 更新订单物流状态
  async updateOrderLogisticsStatus(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新订单物流状态', data)
    return { success: true, message: '状态更新成功' }
  },

  // 批量更新订单物流状态
  async batchUpdateOrderLogisticsStatus(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 批量更新订单物流状态', data)
    return { success: true, message: '批量更新成功' }
  },

  // 设置订单待办
  async setOrderTodo(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 设置订单待办', data)
    return { success: true, message: '待办设置成功' }
  },

  // 获取物流轨迹
  async getLogisticsTracking(trackingNo: string): Promise<any> {
    await delay()

    return {
      trackingNo,
      company: '顺丰速运',
      status: 'in_transit',
      tracks: [
        {
          time: '2024-01-16 10:30:00',
          location: '北京分拣中心',
          status: '已发出',
          description: '快件已从北京分拣中心发出'
        },
        {
          time: '2024-01-15 18:20:00',
          location: '北京收件点',
          status: '已收件',
          description: '快件已在北京收件点收件'
        }
      ]
    }
  },

  // 获取用户物流权限
  async getUserLogisticsPermission(): Promise<any> {
    await delay()

    return {
      canAccess: true,
      canUpdate: true,
      canSetTodo: true,
      canAutoUpdate: false
    }
  },

  // 获取物流状态更新日志
  async getLogisticsStatusLog(params: any): Promise<any> {
    await delay()

    const mockLogs = [
      {
        id: '1',
        orderNo: 'ORD202401002',
        oldStatus: 'pending',
        newStatus: 'shipped',
        operator: '张销售',
        operateTime: '2024-01-15 14:30:00',
        remark: '已发货，快递单号：SF1234567890'
      }
    ]

    return {
      list: mockLogs,
      total: mockLogs.length,
      page: params?.page || 1,
      pageSize: params?.pageSize || 20
    }
  },

  // 导出物流状态数据
  async exportLogisticsStatusData(params: any): Promise<any> {
    await delay()
    console.log('Mock API: 导出物流状态数据', params)
    return { success: true, downloadUrl: '/mock/logistics-export.xlsx' }
  },

  // 获取系统日志
  async getSystemLogs(params?: { limit?: number; level?: string }): Promise<any> {
    await delay()
    console.log('Mock API: 获取系统日志', params)

    // 生成模拟日志数据
    const mockLogs = [
      {
        id: '1',
        timestamp: '2024-01-15 10:30:00',
        level: 'INFO',
        module: '客户管理',
        message: '新增客户成功',
        details: '客户编号: XH202401151030, 客户姓名: 张三'
      },
      {
        id: '2',
        timestamp: '2024-01-15 10:25:00',
        level: 'INFO',
        module: '订单管理',
        message: '订单状态更新',
        details: '订单号: ORD202401151025, 状态: 已发货'
      },
      {
        id: '3',
        timestamp: '2024-01-15 10:20:00',
        level: 'WARN',
        module: '系统监控',
        message: '内存使用率较高',
        details: '当前内存使用率: 85%'
      },
      {
        id: '4',
        timestamp: '2024-01-15 10:15:00',
        level: 'INFO',
        module: '用户管理',
        message: '用户登录',
        details: '用户: admin, IP: 192.168.1.100'
      },
      {
        id: '5',
        timestamp: '2024-01-15 10:10:00',
        level: 'ERROR',
        module: '短信服务',
        message: '短信发送失败',
        details: '目标号码: 13800138001, 错误: 余额不足'
      }
    ]

    // 根据level参数过滤
    let filteredLogs = mockLogs
    if (params?.level && params.level !== 'ALL') {
      filteredLogs = mockLogs.filter(log => log.level === params.level)
    }

    // 根据limit参数限制数量
    if (params?.limit) {
      filteredLogs = filteredLogs.slice(0, params.limit)
    }

    // 返回符合LogsResponse接口的格式
    return {
      success: true,
      data: filteredLogs,
      total: filteredLogs.length
    }
  },

  // 清空系统日志
  async clearSystemLogs(): Promise<any> {
    await delay()
    console.log('Mock API: 清空系统日志')
    return {
      success: true,
      message: '系统日志已清空',
      clearedFiles: 5
    }
  },

  // ==================== 消息管理相关接口 ====================

  // 获取消息订阅列表
  async getMessageSubscriptions(): Promise<any> {
    await delay()
    console.log('Mock API: 获取消息订阅列表')

    const mockSubscriptions = [
      {
        id: '1',
        messageType: 'order_created',
        name: '新建订单',
        description: '当有新订单创建时发送通知',
        isSubscribed: true,
        notificationMethods: ['system_message', 'email'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '2',
        messageType: 'order_signed',
        name: '订单签收',
        description: '当订单签收成功时发送通知',
        isSubscribed: true,
        notificationMethods: ['dingtalk', 'system_message'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '3',
        messageType: 'order_audit_rejected',
        name: '订单审核拒绝',
        description: '当订单审核被拒绝时发送通知',
        isSubscribed: false,
        notificationMethods: ['email'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '4',
        messageType: 'order_audit_approved',
        name: '订单审核通过',
        description: '当订单审核通过时发送通知',
        isSubscribed: true,
        notificationMethods: ['wechat_work', 'system_message'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '5',
        messageType: 'customer_created',
        name: '新增客户',
        description: '当有新客户创建时发送通知',
        isSubscribed: true,
        notificationMethods: ['system_message'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '6',
        messageType: 'payment_received',
        name: '收款确认',
        description: '当收到客户付款时发送通知',
        isSubscribed: true,
        notificationMethods: ['dingtalk', 'wechat_work', 'system_message'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '7',
        messageType: 'payment_overdue',
        name: '付款逾期',
        description: '当客户付款逾期时发送通知',
        isSubscribed: true,
        notificationMethods: ['email', 'system_message'],
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      }
    ]

    return {
      data: mockSubscriptions,
      total: mockSubscriptions.length
    }
  },

  // 更新消息订阅
  async updateMessageSubscription(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新消息订阅', id, data)
    return {
      success: true,
      message: '订阅设置更新成功'
    }
  },

  // 获取公告列表
  async getAnnouncements(params?: any): Promise<any> {
    await delay()
    console.log('Mock API: 获取公告列表', params)

    const mockAnnouncements = [
      {
        id: '1',
        title: '系统维护通知',
        content: '系统将于本周六晚上22:00-24:00进行维护升级，期间可能影响正常使用，请提前做好相关准备。',
        type: 'company',
        targetDepartments: [],
        isPopup: true,
        isMarquee: true,
        publishedAt: '2024-01-15 09:00:00',
        status: 'published',
        createdBy: 'admin',
        createdAt: '2024-01-15 08:30:00',
        updatedAt: '2024-01-15 09:00:00'
      },
      {
        id: '2',
        title: '销售部门会议通知',
        content: '销售部门月度总结会议将于明天下午2点在会议室A举行，请相关人员准时参加。',
        type: 'department',
        targetDepartments: ['sales'],
        isPopup: false,
        isMarquee: true,
        publishedAt: '2024-01-14 16:00:00',
        status: 'published',
        createdBy: 'sales_manager',
        createdAt: '2024-01-14 15:30:00',
        updatedAt: '2024-01-14 16:00:00'
      },
      {
        id: '3',
        title: '新功能上线通知',
        content: '客户管理系统新增了消息管理功能，支持消息订阅和公告发布，欢迎大家使用。',
        type: 'company',
        targetDepartments: [],
        isPopup: false,
        isMarquee: false,
        scheduledAt: '2024-01-16 10:00:00',
        status: 'scheduled',
        createdBy: 'admin',
        createdAt: '2024-01-15 14:00:00',
        updatedAt: '2024-01-15 14:00:00'
      }
    ]

    return {
      data: mockAnnouncements,
      total: mockAnnouncements.length
    }
  },

  // 创建公告
  async createAnnouncement(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 创建公告', data)

    const newAnnouncement = {
      id: Date.now().toString(),
      ...data,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }

    return {
      data: newAnnouncement,
      message: '公告创建成功'
    }
  },

  // 更新公告
  async updateAnnouncement(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新公告', id, data)
    return {
      success: true,
      message: '公告更新成功'
    }
  },

  // 删除公告
  async deleteAnnouncement(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 删除公告', id)
    return {
      success: true,
      message: '公告删除成功'
    }
  },

  // 获取消息配置列表
  async getMessageConfigs(): Promise<any> {
    await delay()
    console.log('Mock API: 获取消息配置列表')

    const mockConfigs = [
      {
        id: '1',
        type: 'dingtalk',
        name: '钉钉机器人',
        config: {
          webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
          secret: 'SEC***'
        },
        isEnabled: true,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '2',
        type: 'wechat_work',
        name: '企业微信群机器人',
        config: {
          webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
          groupName: '技术部通知群',
          mentionAll: false,
          mentionedList: '13800138001,13800138002'
        },
        isEnabled: true,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '3',
        type: 'email',
        name: '邮件通知',
        config: {
          smtpHost: 'smtp.qq.com',
          smtpPort: 587,
          username: 'service@company.com',
          password: '***'
        },
        isEnabled: false,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      },
      {
        id: '4',
        type: 'wechat_official',
        name: '微信公众号',
        config: {
          appId: 'wx***',
          appSecret: '***'
        },
        isEnabled: false,
        createdAt: '2024-01-01 10:00:00',
        updatedAt: '2024-01-15 14:30:00'
      }
    ]

    return {
      data: mockConfigs,
      total: mockConfigs.length
    }
  },

  // 更新消息配置
  async updateMessageConfig(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新消息配置', id, data)
    return {
      success: true,
      message: '配置更新成功'
    }
  },

  // 测试消息配置
  async testMessageConfig(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 测试消息配置', id)
    return {
      success: true,
      message: '配置测试成功'
    }
  },

  // 获取系统消息列表
  async getSystemMessages(params?: any): Promise<any> {
    await delay()
    console.log('Mock API: 获取系统消息列表', params)

    // 返回空消息列表，不再使用硬编码的模拟数据
    const mockMessages: any[] = []

    return {
      success: true,
      data: {
        messages: mockMessages,
        total: mockMessages.length
      }
    }
  },

  // 标记消息为已读
  async markMessageAsRead(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 标记消息已读', id)
    return {
      success: true,
      message: '消息已标记为已读'
    }
  },

  // 标记所有消息为已读
  async markAllMessagesAsRead(): Promise<any> {
    await delay()
    console.log('Mock API: 标记所有消息已读')
    return {
      success: true,
      message: '所有消息已标记为已读'
    }
  },

  // 获取消息统计
  async getMessageStats(): Promise<any> {
    await delay()
    console.log('Mock API: 获取消息统计')

    return {
      data: {
        totalSubscriptions: 7,
        activeSubscriptions: 5,
        totalAnnouncements: 3,
        publishedAnnouncements: 2,
        unreadMessages: 2,
        totalMessages: 4,
        configuredChannels: 2,
        totalChannels: 4
      }
    }
  },

  // ========== 产品分类相关方法 ==========

  // 获取产品分类列表
  async getCategoryList(): Promise<any> {
    await delay()
    console.log('Mock API: 获取产品分类列表')

    // 从本地存储获取分类数据
    const categories = getMockCategories()

    return {
      success: true,
      data: categories,
      message: '获取分类列表成功'
    }
  },

  // 获取产品分类树形结构
  async getCategoryTree(): Promise<any> {
    await delay()
    console.log('Mock API: 获取产品分类树形结构')

    // 从本地存储获取分类数据并构建树形结构
    const flatCategories = getMockCategories()
    const treeCategories = this.buildCategoryTree(flatCategories)

    return {
      success: true,
      data: treeCategories,
      message: '获取分类树成功'
    }
  },

  // 构建分类树形结构的辅助方法
  buildCategoryTree(categories: any[]): any[] {
    const categoryMap = new Map()
    const rootCategories: any[] = []

    // 创建分类映射
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    // 构建树形结构
    categories.forEach(category => {
      const categoryNode = categoryMap.get(category.id)
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(categoryNode)
        }
      } else {
        rootCategories.push(categoryNode)
      }
    })

    return rootCategories
  },

  // 创建产品分类
  async createCategory(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 创建产品分类', data)

    const categories = getMockCategories()
    const newCategory = {
      id: Date.now().toString(),
      name: data.name,
      code: data.code,
      parentId: data.parentId || null,
      level: data.level || 1,
      sort: data.sort || 1,
      status: data.status || 'active',
      productCount: 0,
      createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }

    // 添加到分类列表并保存
    categories.push(newCategory)
    saveMockCategories(categories)

    return {
      success: true,
      data: newCategory,
      message: '创建分类成功'
    }
  },

  // 更新产品分类
  async updateCategory(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新产品分类', id, data)

    const categories = getMockCategories()
    const categoryIndex = categories.findIndex(cat => cat.id === id)

    if (categoryIndex === -1) {
      return {
        success: false,
        message: '分类不存在'
      }
    }

    // 更新分类信息
    const updatedCategory = {
      ...categories[categoryIndex],
      ...data,
      id, // 确保ID不被覆盖
      updateTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
    }

    categories[categoryIndex] = updatedCategory
    saveMockCategories(categories)

    return {
      success: true,
      data: updatedCategory,
      message: '更新分类成功'
    }
  },

  // 删除产品分类
  async deleteCategory(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 删除产品分类', id)

    const categories = getMockCategories()
    const categoryIndex = categories.findIndex(cat => cat.id === id)

    if (categoryIndex === -1) {
      return {
        success: false,
        message: '分类不存在'
      }
    }

    // 检查是否有子分类
    const hasChildren = categories.some(cat => cat.parentId === id)
    if (hasChildren) {
      return {
        success: false,
        message: '该分类下还有子分类，无法删除'
      }
    }

    // 删除分类
    categories.splice(categoryIndex, 1)
    saveMockCategories(categories)

    return {
      success: true,
      message: '删除分类成功'
    }
  },

  // 获取产品分类详情
  async getCategoryDetail(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 获取产品分类详情', id)

    const categories = getMockCategories()
    const category = categories.find(cat => cat.id === id)

    if (!category) {
      return {
        success: false,
        message: '分类不存在'
      }
    }

    return {
      success: true,
      data: category,
      message: '获取分类详情成功'
    }
  },

  // ========== 部门相关方法 ==========

  // 获取部门列表
  async getDepartmentList(): Promise<any> {
    await delay()
    console.log('[Mock API] 获取部门列表开始...')

    // 检查是否需要清除旧数据（一次性操作）
    const shouldClear = !localStorage.getItem('departments_cleared')
    if (shouldClear) {
      console.log('[Mock API] 首次访问，清除旧的部门数据')
      clearMockDepartments()
      localStorage.setItem('departments_cleared', 'true')
    }

    // 从本地存储获取部门数据
    const departments = getMockDepartments()
    console.log('[Mock API] 从存储获取的部门数据:', departments)
    console.log('[Mock API] 部门数据数量:', departments.length)

    const result = {
      success: true,
      data: departments,
      message: '获取部门列表成功'
    }

    console.log('[Mock API] 返回结果:', result)
    return result
  },

  // 获取部门树形结构
  async getDepartmentTree(): Promise<any> {
    await delay()
    console.log('Mock API: 获取部门树形结构')

    const departments = await this.getDepartmentList()
    return departments
  },

  // 创建部门
  async createDepartment(data: any): Promise<any> {
    await delay()
    console.log('Mock API: 创建部门', data)

    const departments = getMockDepartments()
    const newDepartment = {
      id: Date.now().toString(),
      name: data.name,
      code: data.code,
      description: data.description || '',
      parentId: data.parentId || null,
      sortOrder: data.sortOrder || 1,
      status: data.status || 'active',
      memberCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // 添加到部门列表并保存
    departments.push(newDepartment)
    saveMockDepartments(departments)

    console.log('Mock API: 部门创建成功，已保存到本地存储', newDepartment)

    return {
      success: true,
      data: newDepartment,
      message: '部门创建成功'
    }
  },

  // 更新部门
  async updateDepartment(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新部门', id, data)

    const departments = getMockDepartments()
    const departmentIndex = departments.findIndex(dept => dept.id === id)

    if (departmentIndex === -1) {
      return {
        success: false,
        message: '部门不存在'
      }
    }

    // 更新部门信息
    const updatedDepartment = {
      ...departments[departmentIndex],
      ...data,
      id, // 确保ID不被覆盖
      updatedAt: new Date().toISOString()
    }

    departments[departmentIndex] = updatedDepartment
    saveMockDepartments(departments)

    return {
      success: true,
      data: updatedDepartment,
      message: '部门更新成功'
    }
  },

  // 删除部门
  async deleteDepartment(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 删除部门', id)

    const departments = getMockDepartments()
    const departmentIndex = departments.findIndex(dept => dept.id === id)

    if (departmentIndex === -1) {
      return {
        success: false,
        message: '部门不存在'
      }
    }

    // 检查是否有子部门
    const hasChildren = departments.some(dept => dept.parentId === id)
    if (hasChildren) {
      return {
        success: false,
        message: '该部门下还有子部门，无法删除'
      }
    }

    // 删除部门
    departments.splice(departmentIndex, 1)
    saveMockDepartments(departments)

    return {
      success: true,
      message: '部门删除成功'
    }
  },

  // 获取部门详情
  async getDepartmentDetail(id: string): Promise<any> {
    await delay()
    console.log('Mock API: 获取部门详情', id)

    const mockDepartment = {
      id,
      name: '技术部',
      code: 'TECH',
      description: '负责技术开发和维护',
      parentId: null,
      sortOrder: 1,
      status: 'active',
      memberCount: 15,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }

    return {
      success: true,
      data: mockDepartment,
      message: '获取部门详情成功'
    }
  },

  // 更新部门状态
  async updateDepartmentStatus(id: string, data: any): Promise<any> {
    await delay()
    console.log('Mock API: 更新部门状态', id, data)

    const departments = getMockDepartments()
    const departmentIndex = departments.findIndex(dept => dept.id === id)

    if (departmentIndex === -1) {
      return {
        success: false,
        message: '部门不存在'
      }
    }

    // 更新部门状态
    departments[departmentIndex].status = data.status || data
    departments[departmentIndex].updatedAt = new Date().toISOString()

    saveMockDepartments(departments)

    const updatedDepartment = departments[departmentIndex]

    return {
      success: true,
      data: updatedDepartment,
      message: '部门状态更新成功'
    }
  },

  // 获取部门统计数据
  async getDepartmentStats(): Promise<any> {
    await delay()
    console.log('[Mock API] 获取部门统计数据，基于真实数据计算')

    // 获取真实的部门数据
    const departments = getMockDepartments()
    console.log('[Mock API] 统计计算基于的部门数据:', departments.length, '个部门')

    // 计算真实统计数据
    const totalDepartments = departments.length
    const activeDepartments = departments.filter(dept => dept.status === 'active').length
    const totalMembers = departments.reduce((sum, dept) => sum + (dept.memberCount || 0), 0)

    // 按层级分类统计
    const departmentsByType: Record<string, number> = {}
    departments.forEach(dept => {
      let type = '其他部门'

      // 根据部门层级或父级关系分类
      if (!dept.parentId) {
        type = '主部门'
      } else {
        type = '子部门'
      }

      departmentsByType[type] = (departmentsByType[type] || 0) + 1
    })

    const realStats = {
      totalDepartments,
      activeDepartments,
      totalMembers,
      departmentsByType
    }

    console.log('[Mock API] 计算得出的统计数据:', realStats)

    return {
      success: true,
      data: realStats,
      message: '获取部门统计成功'
    }
  },

  // ========== 用户管理相关方法 ==========

  // 获取用户列表
  async getUserList(params?: any): Promise<any> {
    await delay()
    console.log('[Mock API] 获取用户列表', params)

    // 检查是否需要清除旧数据（一次性操作）
    const shouldClear = !localStorage.getItem('users_cleared')
    if (shouldClear) {
      console.log('[Mock API] 首次访问，清除旧的用户数据')
      clearMockUsers()
      localStorage.setItem('users_cleared', 'true')
    }

    // 从本地存储获取用户数据
    let users = getMockUsers()
    console.log('[Mock API] 从存储获取的用户数据:', users)
    console.log('[Mock API] 用户数据数量:', users.length)

    // 应用筛选条件
    if (params) {
      // 搜索条件（用户名或姓名）
      if (params.search) {
        const searchLower = params.search.toLowerCase()
        users = users.filter((user: any) => {
          const username = (user.username || '').toLowerCase()
          const realName = (user.realName || user.name || '').toLowerCase()
          return username.includes(searchLower) || realName.includes(searchLower)
        })
        console.log('[Mock API] 应用搜索筛选:', params.search, '结果数量:', users.length)
      }

      // 部门筛选
      if (params.departmentId) {
        users = users.filter((user: any) =>
          String(user.departmentId) === String(params.departmentId)
        )
        console.log('[Mock API] 应用部门筛选:', params.departmentId, '结果数量:', users.length)
      }

      // 角色筛选
      if (params.role) {
        users = users.filter((user: any) =>
          user.role === params.role || user.roleId === params.role
        )
        console.log('[Mock API] 应用角色筛选:', params.role, '结果数量:', users.length)
      }

      // 状态筛选
      if (params.status) {
        users = users.filter((user: any) => user.status === params.status)
        console.log('[Mock API] 应用状态筛选:', params.status, '结果数量:', users.length)
      }

      // 在职状态筛选
      if (params.employmentStatus) {
        users = users.filter((user: any) =>
          (user.employmentStatus || 'active') === params.employmentStatus
        )
        console.log('[Mock API] 应用在职状态筛选:', params.employmentStatus, '结果数量:', users.length)
      }
    }

    const result = {
      success: true,
      data: {
        items: users,
        total: users.length,
        page: params?.page || 1,
        limit: params?.limit || 20,
        totalPages: Math.ceil(users.length / (params?.limit || 20))
      },
      message: '获取用户列表成功'
    }

    console.log('[Mock API] 返回用户列表结果，筛选后数量:', users.length)
    return result
  },

  // 创建用户
  async createUser(data: any): Promise<any> {
    await delay()
    console.log('[Mock API] 创建用户', data)

    const users = getMockUsers()
    // 格式化时间为 YYYY-MM-DD HH:mm:ss
    const formatDateTime = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      const seconds = String(date.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }

    const now = new Date()
    const formattedTime = formatDateTime(now)

    // 生成新的用户ID（保持与现有用户ID类型一致）
    let newId
    if (users.length > 0) {
      // 如果有现有用户，检查ID类型
      const firstUserId = users[0].id
      if (typeof firstUserId === 'string') {
        // 现有用户使用字符串ID，生成字符串ID
        newId = Date.now().toString()
      } else {
        // 现有用户使用数字ID，生成数字ID
        const maxId = Math.max(...users.map((u: any) => parseInt(u.id) || 0))
        newId = (maxId + 1).toString()
      }
    } else {
      // 没有现有用户，使用字符串ID
      newId = Date.now().toString()
    }

    const newUser = {
      id: newId,
      username: data.username,
      realName: data.realName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      roleName: data.roleName || '',
      departmentId: data.departmentId,
      departmentName: data.department || '',
      position: data.position || '',
      employeeNumber: data.employeeNumber || '',
      status: data.status || 'active',
      employmentStatus: data.employmentStatus || 'active', // 默认在职
      avatar: data.avatar || '',
      remark: data.remark || '',
      createTime: formattedTime,
      createdAt: formattedTime,
      lastLoginTime: null,
      lastLoginAt: null,
      loginCount: 0,
      isOnline: false
    }

    // 添加到用户列表
    users.push(newUser)
    saveMockUsers(users)

    // 同时保存到userDatabase（用户管理页面使用的数据源）
    try {
      const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
      userDatabase.push({
        id: newId,
        name: data.realName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department || '',
        departmentId: data.departmentId,
        position: data.position || '',
        employeeNumber: data.employeeNumber || '',
        avatar: data.avatar || '',
        status: data.status || 'active',
        createTime: formattedTime,
        createdAt: formattedTime
      })
      localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
      console.log('[Mock API] 用户同时保存到userDatabase')
    } catch (error) {
      console.error('[Mock API] 保存到userDatabase失败:', error)
    }

    console.log('[Mock API] 用户创建成功，已保存到本地存储', newUser)

    return {
      success: true,
      data: newUser,
      message: '用户创建成功'
    }
  },

  // 更新用户
  async updateUser(id: string, data: any): Promise<unknown> {
    await delay()
    console.log('[Mock API] 更新用户', id, data)

    // 从localStorage获取用户数据
    const users = getMockUsers()
    const userIndex = users.findIndex((u: unknown) => String(u.id) === String(id))

    if (userIndex !== -1) {
      // 更新用户数据，保留原有字段
      const updatedUser = {
        ...users[userIndex],
        ...data,
        id: users[userIndex].id, // 保持原ID
        username: users[userIndex].username, // 保持原用户名
        name: data.realName || users[userIndex].name, // 更新姓名
        realName: data.realName || users[userIndex].realName, // 更新realName
        updateTime: new Date().toLocaleString(),
        updatedAt: new Date().toISOString()
      }

      users[userIndex] = updatedUser

      // 保存回localStorage
      saveMockUsers(users)
      console.log('[Mock API] 用户数据已更新到localStorage:', updatedUser)

      // 同步更新userDatabase
      try {
        const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
        const dbIndex = userDatabase.findIndex((u: unknown) => String(u.id) === String(id))
        if (dbIndex !== -1) {
          userDatabase[dbIndex] = {
            ...userDatabase[dbIndex],
            name: data.realName || userDatabase[dbIndex].name,
            email: data.email || userDatabase[dbIndex].email,
            phone: data.phone || userDatabase[dbIndex].phone,
            role: data.role || data.roleId || userDatabase[dbIndex].role,
            roleId: data.roleId || userDatabase[dbIndex].roleId,
            department: data.department || userDatabase[dbIndex].department,
            departmentId: data.departmentId !== undefined ? data.departmentId : userDatabase[dbIndex].departmentId,
            position: data.position || userDatabase[dbIndex].position,
            employeeNumber: data.employeeNumber || userDatabase[dbIndex].employeeNumber,
            status: data.status || userDatabase[dbIndex].status
          }
          localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
          console.log('[Mock API] 用户同步更新到userDatabase')
        }
      } catch (error) {
        console.error('[Mock API] 同步更新userDatabase失败:', error)
      }

      return {
        success: true,
        data: updatedUser,
        message: '用户更新成功'
      }
    }

    // 如果没有找到用户，返回错误
    console.error('[Mock API] 未找到用户，ID:', id)
    throw new Error('用户不存在')
  },

  // 删除用户
  async deleteUser(id: string): Promise<unknown> {
    await delay()
    console.log('[Mock API] 删除用户', id)

    // 从localStorage删除用户
    const users = getMockUsers()
    const userIndex = users.findIndex((u: unknown) => String(u.id) === String(id))

    if (userIndex !== -1) {
      const deletedUser = users[userIndex]
      users.splice(userIndex, 1)
      saveMockUsers(users)
      console.log('[Mock API] 用户已从localStorage删除:', deletedUser.username || deletedUser.name)

      // 同步删除userDatabase中的用户
      try {
        const userDatabase = JSON.parse(localStorage.getItem('userDatabase') || '[]')
        const dbIndex = userDatabase.findIndex((u: unknown) => String(u.id) === String(id))
        if (dbIndex !== -1) {
          userDatabase.splice(dbIndex, 1)
          localStorage.setItem('userDatabase', JSON.stringify(userDatabase))
          console.log('[Mock API] 用户同步从userDatabase删除')
        }
      } catch (error) {
        console.error('[Mock API] 同步删除userDatabase失败:', error)
      }

      return {
        success: true,
        data: null,
        message: '用户删除成功'
      }
    }

    // 如果没有找到用户，抛出错误
    console.error('[Mock API] 未找到用户，ID:', id)
    throw new Error('用户不存在')
  },

  // 更新用户状态
  async updateUserStatus(id: string, data: unknown): Promise<unknown> {
    await delay()
    console.log('[Mock API] 更新用户状态', id, data)

    const users = getMockUsers()
    const userIndex = users.findIndex(user => user.id.toString() === id)

    if (userIndex === -1) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    // 更新用户状态
    users[userIndex].status = data.status
    users[userIndex].updatedAt = new Date().toISOString()

    saveMockUsers(users)

    console.log('[Mock API] 用户状态更新成功', users[userIndex])

    return {
      success: true,
      data: users[userIndex],
      message: '用户状态更新成功'
    }
  },

  // 更新用户在职状态
  async updateEmploymentStatus(id: string, data: { employmentStatus: 'active' | 'resigned' }): Promise<unknown> {
    await delay()
    console.log('[Mock API] 更新用户在职状态', id, data)

    const users = getMockUsers()
    const userIndex = users.findIndex(user => user.id.toString() === id)

    if (userIndex === -1) {
      return {
        success: false,
        message: '用户不存在'
      }
    }

    // 更新用户在职状态
    users[userIndex].employmentStatus = data.employmentStatus
    if (data.employmentStatus === 'resigned') {
      users[userIndex].resignedDate = new Date().toISOString().split('T')[0]
    } else {
      users[userIndex].resignedDate = undefined
    }
    users[userIndex].updatedAt = new Date().toISOString()

    saveMockUsers(users)

    console.log('[Mock API] 用户在职状态更新成功', users[userIndex])

    return {
      success: true,
      data: users[userIndex],
      message: '用户在职状态更新成功'
    }
  },

  // 获取用户统计
  async getUserStatistics(): Promise<unknown> {
    await delay()
    console.log('[Mock API] 获取用户统计')

    const users = getMockUsers()
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const totalUsers = users.length
    const activeEmployees = users.filter(user => (user.employmentStatus || 'active') === 'active').length
    const resignedEmployees = users.filter(user => user.employmentStatus === 'resigned').length
    const monthNewUsers = users.filter(user => {
      if (!user.createTime && !user.createdAt) return false
      const createDate = new Date(user.createTime || user.createdAt)
      return createDate.getMonth() === currentMonth && createDate.getFullYear() === currentYear
    }).length

    console.log('[Mock API] 用户统计:', {
      总用户数: totalUsers,
      在职人数: activeEmployees,
      离职人数: resignedEmployees,
      本月新增: monthNewUsers
    })

    return {
      success: true,
      data: {
        total: totalUsers,
        active: activeEmployees, // 在职人数
        resigned: resignedEmployees, // 离职人数
        monthNew: monthNewUsers, // 本月新增
        inactive: users.filter(user => user.status === 'inactive').length,
        locked: users.filter(user => user.status === 'locked').length,
        byRole: {
          admin: users.filter(user => user.role === 'admin').length,
          manager: users.filter(user => user.role === 'manager').length,
          sales: users.filter(user => user.role === 'sales').length,
          service: users.filter(user => user.role === 'service').length
        },
        byDepartment: []
      },
      message: '获取用户统计成功'
    }
  }
}

// 检查是否使用Mock API
export const shouldUseMockApi = (): boolean => {
  // 优先检查localStorage设置
  const mockEnabled = localStorage.getItem('erp_mock_enabled')
  if (mockEnabled === 'true') {
    console.log('[Mock API] localStorage强制启用Mock API')
    return true
  }

  // 在开发环境中使用Mock API，除非明确配置了外部API
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  const isProduction = import.meta.env.PROD

  // 如果是生产环境，不使用Mock API
  if (isProduction) {
    return false
  }

  // 如果配置了API地址，使用真实API
  if (apiBaseUrl) {
    console.log('开发环境连接到后端API服务器:', apiBaseUrl)
    return false
  }

  // 开发环境默认使用Mock API（仅当没有配置API地址时）
  console.log('开发环境使用 Mock API')
  return true
}
