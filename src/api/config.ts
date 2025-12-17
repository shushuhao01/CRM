// API配置文件
export const API_CONFIG = {
  // 基础URL - 根据环境变量或默认值设置
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',

  // 请求超时时间
  TIMEOUT: 10000,

  // 请求头配置
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
}

// API端点配置
export const API_ENDPOINTS = {
  // 客户相关
  CUSTOMERS: {
    LIST: '/customers',
    CREATE: '/customers',
    UPDATE: (id: string) => `/customers/${id}`,
    DELETE: (id: string) => `/customers/${id}`,
    DETAIL: (id: string) => `/customers/${id}`,
    SEARCH: '/customers/search',
    GROUPS: {
      LIST: '/customers/groups',
      CREATE: '/customers/groups',
      UPDATE: (id: string) => `/customers/groups/${id}`,
      DELETE: (id: string) => `/customers/groups/${id}`,
      DETAIL: (id: string) => `/customers/groups/${id}`
    },
    TAGS: {
      LIST: '/customers/tags',
      CREATE: '/customers/tags',
      UPDATE: (id: string) => `/customers/tags/${id}`,
      DELETE: (id: string) => `/customers/tags/${id}`,
      DETAIL: (id: string) => `/customers/tags/${id}`
    }
  },

  // 订单相关
  ORDERS: {
    LIST: '/orders',
    CREATE: '/orders',
    UPDATE: (id: string) => `/orders/${id}`,
    DELETE: (id: string) => `/orders/${id}`,
    DETAIL: (id: string) => `/orders/${id}`,
    AUDIT: (id: string) => `/orders/${id}/audit`,
    SUBMIT_AUDIT: (id: string) => `/orders/${id}/submit-audit`,
    CANCEL_REQUEST: '/orders/cancel-request',
    PENDING_CANCEL: '/orders/pending-cancel',
    CANCEL_AUDIT: (id: string) => `/orders/${id}/cancel-audit`,
    AUDITED_CANCEL: '/orders/audited-cancel',
    STATISTICS: '/orders/statistics',
    CHECK_TRANSFER: '/orders/check-transfer',
    UPDATE_MARK_TYPE: (id: string) => `/orders/${id}/mark-type`,
  },

  // 产品相关
  PRODUCTS: {
    LIST: '/products',
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    DETAIL: (id: string) => `/products/${id}`,
    CATEGORIES: {
      LIST: '/products/categories',
      CREATE: '/products/categories',
      UPDATE: (id: string) => `/products/categories/${id}`,
      DELETE: (id: string) => `/products/categories/${id}`,
      DETAIL: (id: string) => `/products/categories/${id}`,
      TREE: '/products/categories/tree'
    }
  },

  // 用户相关
  USERS: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    LIST: '/users',
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`
  },

  // 系统相关
  SYSTEM: {
    SETTINGS: '/system/settings',
    ROLES: '/system/roles',
    PERMISSIONS: '/system/permissions'
  },

  // SMS相关
  SMS: {
    TEMPLATES: '/sms/templates',
    APPROVALS: '/sms/approvals',
    SENDS: '/sms/sends',
    STATISTICS: '/sms/statistics',
    CONFIG: '/sms/config'
  },

  // 物流相关
  LOGISTICS: {
    LIST: '/logistics/list',
    COMPANIES: '/logistics/companies',
    TRACKING: '/logistics/tracking',
    TRACE: '/logistics/trace',
    BATCH_SYNC: '/logistics/batch-sync',
    UPDATE: (id: string) => `/logistics/tracking/${id}`
  },

  // 客户分享相关
  CUSTOMER_SHARE: {
    HISTORY: '/customer-share/history',
    SHARE: '/customer-share/share',
    RECALL: '/customer-share/recall',
    MY_SHARED: '/customer-share/my-shared',
    SHARED_TO_ME: '/customer-share/shared-to-me',
    SHAREABLE_USERS: '/customer-share/shareable-users'
  },

}
