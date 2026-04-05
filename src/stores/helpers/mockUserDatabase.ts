/**
 * 开发环境 Mock 用户数据库
 * 从 stores/user.ts 的 login() 内部提取，仅用于本地开发登录
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMockUserDatabase(): any[] {
  const savedData = localStorage.getItem('userDatabase')
  if (savedData) {
    const userData = JSON.parse(savedData)
    // 检查是否有旧的角色配置（manager角色应该是department_manager）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hasOldRoleConfig = userData.some((user: any) =>
      (user.username === 'manager' && user.roleId === 'manager') ||
      (user.username === 'sales001' && user.roleId === 'employee') ||
      (user.username === 'service001' && user.roleId === 'employee')
    )
    if (hasOldRoleConfig) {
      console.log('[Dev] 检测到旧的角色配置，清除缓存使用新配置')
      localStorage.removeItem('userDatabase')
    } else {
      return userData
    }
  }
  // 默认用户数据
  return [
    {
      id: 'admin',
      username: 'admin',
      realName: '系统管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      roleId: 'admin',
      status: 'active',
      isOnline: false,
      avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
      lastLoginTime: null,
      loginCount: 0,
      createTime: '2024-01-01 00:00:00',
      remark: '系统管理员账户',
      password: 'admin123',
      needChangePassword: false
    },
    {
      id: 'dept_manager',
      username: 'dept_manager',
      realName: '部门管理员',
      email: 'dept_manager@example.com',
      phone: '13800138001',
      roleId: 'department_manager',
      status: 'active',
      isOnline: false,
      avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
      lastLoginTime: null,
      loginCount: 0,
      createTime: '2024-01-01 00:00:00',
      remark: '部门管理员账户',
      password: 'dept123',
      needChangePassword: false,
      departmentId: 'dept_001',
      departmentIds: ['dept_001']
    },
    {
      id: 'sales001',
      username: 'sales001',
      realName: '销售员工',
      email: 'sales001@example.com',
      phone: '13800138002',
      roleId: 'sales_staff',
      status: 'active',
      isOnline: false,
      avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
      lastLoginTime: null,
      loginCount: 0,
      createTime: '2024-01-01 00:00:00',
      remark: '销售员工账户',
      password: 'sales123',
      needChangePassword: false,
      departmentId: 'dept_001'
    },
    {
      id: 'service001',
      username: 'service001',
      realName: '客服员工',
      email: 'service001@example.com',
      phone: '13800138003',
      roleId: 'customer_service',
      status: 'active',
      isOnline: false,
      avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
      lastLoginTime: null,
      loginCount: 0,
      createTime: '2024-01-01 00:00:00',
      remark: '客服员工账户',
      password: 'service123',
      needChangePassword: false,
      customerServiceType: 'general'
    }
  ]
}

