/**
 * 预设账号配置
 * 这些账号写在源代码中，永久存在，不会被清理
 */

export interface PresetAccount {
  id: string
  username: string
  password: string
  name: string
  role: string
  roleId: string
  phone: string
  email: string
  avatar: string
  status: 'active' | 'inactive'
  departmentId: string
  departmentName: string
  position: string
  createTime: string
}

/**
 * 预设账号列表
 * 这些账号始终可用，即使localStorage被清空
 * 权限配置与 src/config/defaultRolePermissions.ts 保持一致
 */
export const PRESET_ACCOUNTS: PresetAccount[] = [
  {
    id: 'superadmin',
    username: 'superadmin',
    password: 'super123456',
    name: '超级管理员',
    role: 'super_admin',
    roleId: 'super_admin',
    phone: '13800138000',
    email: 'superadmin@example.com',
    avatar: '',
    status: 'active',
    departmentId: 'dept_001',
    departmentName: '系统管理部',
    position: '超级管理员',
    createTime: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'admin',
    username: 'admin',
    password: 'admin123',
    name: '系统管理员',
    role: 'admin',
    roleId: 'admin',
    phone: '13800000000',
    email: 'admin@example.com',
    avatar: '',
    status: 'active',
    departmentId: 'dept_001',
    departmentName: '管理部',
    position: '系统管理员',
    createTime: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'manager_001',
    username: 'manager',
    password: 'manager123',
    name: '张经理',
    role: 'department_manager',
    roleId: 'department_manager',
    phone: '13800000001',
    email: 'manager@example.com',
    avatar: '',
    status: 'active',
    departmentId: 'dept_002',
    departmentName: '销售部',
    position: '部门经理',
    createTime: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'sales_001',
    username: 'sales',
    password: 'sales123',
    name: '李销售',
    role: 'sales_staff',
    roleId: 'sales_staff',
    phone: '13800000002',
    email: 'sales@example.com',
    avatar: '',
    status: 'active',
    departmentId: 'dept_002',
    departmentName: '销售部',
    position: '销售员',
    createTime: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'service_001',
    username: 'service',
    password: 'service123',
    name: '王客服',
    role: 'customer_service',
    roleId: 'customer_service',
    phone: '13800000003',
    email: 'service@example.com',
    avatar: '',
    status: 'active',
    departmentId: 'dept_003',
    departmentName: '客服部',
    position: '客服专员',
    createTime: '2024-01-01T00:00:00.000Z'
  }
]

/**
 * 根据用户名获取预设账号
 */
export function getPresetAccount(username: string): PresetAccount | undefined {
  return PRESET_ACCOUNTS.find(account => account.username === username)
}

/**
 * 验证预设账号密码
 */
export function validatePresetAccount(username: string, password: string): PresetAccount | null {
  const account = getPresetAccount(username)
  if (account && account.password === password) {
    return account
  }
  return null
}

/**
 * 获取所有预设账号（不包含密码）
 */
export function getAllPresetAccounts(): Omit<PresetAccount, 'password'>[] {
  return PRESET_ACCOUNTS.map(({ password, ...account }) => account)
}

/**
 * 初始化预设账号到localStorage
 * 如果localStorage中没有用户数据，则自动初始化
 */
export function initializePresetAccounts(): void {
  try {
    const existingUsers = localStorage.getItem('crm_mock_users')

    if (!existingUsers) {
      console.log('[PresetAccounts] localStorage中没有用户数据，初始化预设账号')
      localStorage.setItem('crm_mock_users', JSON.stringify(PRESET_ACCOUNTS))
      console.log('[PresetAccounts] 预设账号初始化完成')
    } else {
      // 检查是否包含所有预设账号
      const users = JSON.parse(existingUsers)
      let needUpdate = false

      PRESET_ACCOUNTS.forEach(presetAccount => {
        const exists = users.some((u: PresetAccount) => u.id === presetAccount.id)
        if (!exists) {
          users.push(presetAccount)
          needUpdate = true
        }
      })

      if (needUpdate) {
        localStorage.setItem('crm_mock_users', JSON.stringify(users))
        console.log('[PresetAccounts] 已补充缺失的预设账号')
      }
    }
  } catch (error) {
    console.error('[PresetAccounts] 初始化预设账号失败:', error)
  }
}
