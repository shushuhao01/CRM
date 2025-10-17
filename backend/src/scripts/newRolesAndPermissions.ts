import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { logger } from '../config/logger';

// 完整的权限数据定义
const defaultPermissions = [
  // 数据看板
  {
    name: '数据看板',
    code: 'dashboard',
    description: '数据看板模块',
    module: 'dashboard',
    type: 'menu',
    path: '/dashboard',
    icon: 'DataAnalysis',
    sort: 1,
    children: [
      { name: '查看个人数据', code: 'dashboard:personal', type: 'button', sort: 1 },
      { name: '查看部门数据', code: 'dashboard:department', type: 'button', sort: 2 },
      { name: '查看全部数据', code: 'dashboard:all', type: 'button', sort: 3 }
    ]
  },
  
  // 客户管理
  {
    name: '客户管理',
    code: 'customer',
    description: '客户管理模块',
    module: 'customer',
    type: 'menu',
    path: '/customer',
    icon: 'Avatar',
    sort: 2,
    children: [
      {
        name: '客户列表',
        code: 'customer:list',
        description: '客户列表页面',
        module: 'customer',
        type: 'menu',
        path: '/customer/list',
        icon: 'List',
        sort: 1,
        children: [
          { name: '查看个人客户', code: 'customer:view:personal', type: 'button', sort: 1 },
          { name: '查看部门客户', code: 'customer:view:department', type: 'button', sort: 2 },
          { name: '查看全部客户', code: 'customer:view:all', type: 'button', sort: 3 },
          { name: '新增客户', code: 'customer:add', type: 'button', sort: 4 },
          { name: '编辑客户', code: 'customer:edit', type: 'button', sort: 5 },
          { name: '删除客户', code: 'customer:delete', type: 'button', sort: 6 },
          { name: '导入客户', code: 'customer:import', type: 'button', sort: 7 },
          { name: '导出客户', code: 'customer:export', type: 'button', sort: 8 }
        ]
      }
    ]
  },

  // 订单管理
  {
    name: '订单管理',
    code: 'order',
    description: '订单管理模块',
    module: 'order',
    type: 'menu',
    path: '/order',
    icon: 'Document',
    sort: 3,
    children: [
      {
        name: '订单列表',
        code: 'order:list',
        description: '订单列表页面',
        module: 'order',
        type: 'menu',
        path: '/order/list',
        icon: 'List',
        sort: 1,
        children: [
          { name: '查看个人订单', code: 'order:view:personal', type: 'button', sort: 1 },
          { name: '查看部门订单', code: 'order:view:department', type: 'button', sort: 2 },
          { name: '查看全部订单', code: 'order:view:all', type: 'button', sort: 3 },
          { name: '新增订单', code: 'order:add', type: 'button', sort: 4 },
          { name: '编辑订单', code: 'order:edit', type: 'button', sort: 5 },
          { name: '删除订单', code: 'order:delete', type: 'button', sort: 6 },
          { name: '订单审核', code: 'order:audit', type: 'button', sort: 7 }
        ]
      }
    ]
  },

  // 服务管理
  {
    name: '服务管理',
    code: 'service',
    description: '服务管理模块',
    module: 'service',
    type: 'menu',
    path: '/service',
    icon: 'Service',
    sort: 4,
    children: [
      {
        name: '通话管理',
        code: 'service:call',
        description: '通话管理页面',
        module: 'service',
        type: 'menu',
        path: '/service/call',
        icon: 'Phone',
        sort: 1,
        children: [
          { name: '查看通话记录', code: 'service:call:view', type: 'button', sort: 1 },
          { name: '新增通话记录', code: 'service:call:add', type: 'button', sort: 2 },
          { name: '编辑通话记录', code: 'service:call:edit', type: 'button', sort: 3 }
        ]
      }
    ]
  },

  // 业绩统计
  {
    name: '业绩统计',
    code: 'performance',
    description: '业绩统计模块',
    module: 'performance',
    type: 'menu',
    path: '/performance',
    icon: 'TrendCharts',
    sort: 5,
    children: [
      {
        name: '个人业绩',
        code: 'performance:personal',
        description: '个人业绩页面',
        module: 'performance',
        type: 'menu',
        path: '/performance/personal',
        icon: 'User',
        sort: 1,
        children: [
          { name: '查看个人业绩', code: 'performance:personal:view', type: 'button', sort: 1 }
        ]
      },
      {
        name: '团队业绩',
        code: 'performance:team',
        description: '团队业绩页面',
        module: 'performance',
        type: 'menu',
        path: '/performance/team',
        icon: 'UserGroup',
        sort: 2,
        children: [
          { name: '查看团队业绩', code: 'performance:team:view', type: 'button', sort: 1 }
        ]
      },
      {
        name: '业绩分析',
        code: 'performance:analysis',
        description: '业绩分析页面',
        module: 'performance',
        type: 'menu',
        path: '/performance/analysis',
        icon: 'DataAnalysis',
        sort: 3,
        children: [
          { name: '查看部门业绩分析', code: 'performance:analysis:department', type: 'button', sort: 1 },
          { name: '查看全部业绩分析', code: 'performance:analysis:all', type: 'button', sort: 2 }
        ]
      },
      {
        name: '业绩分享',
        code: 'performance:share',
        description: '业绩分享页面',
        module: 'performance',
        type: 'menu',
        path: '/performance/share',
        icon: 'Share',
        sort: 4,
        children: [
          { name: '查看业绩分享', code: 'performance:share:view', type: 'button', sort: 1 },
          { name: '创建业绩分享', code: 'performance:share:create', type: 'button', sort: 2 }
        ]
      }
    ]
  },

  // 物流管理
  {
    name: '物流管理',
    code: 'logistics',
    description: '物流管理模块',
    module: 'logistics',
    type: 'menu',
    path: '/logistics',
    icon: 'Van',
    sort: 6,
    children: [
      {
        name: '物流列表',
        code: 'logistics:list',
        description: '物流列表页面',
        module: 'logistics',
        type: 'menu',
        path: '/logistics/list',
        icon: 'List',
        sort: 1,
        children: [
          { name: '查看物流信息', code: 'logistics:view', type: 'button', sort: 1 },
          { name: '新增物流', code: 'logistics:add', type: 'button', sort: 2 },
          { name: '编辑物流', code: 'logistics:edit', type: 'button', sort: 3 }
        ]
      },
      {
        name: '物流跟踪',
        code: 'logistics:tracking',
        description: '物流跟踪页面',
        module: 'logistics',
        type: 'menu',
        path: '/logistics/tracking',
        icon: 'Location',
        sort: 2,
        children: [
          { name: '查看物流跟踪', code: 'logistics:tracking:view', type: 'button', sort: 1 }
        ]
      }
    ]
  },

  // 售后管理
  {
    name: '售后管理',
    code: 'aftersale',
    description: '售后管理模块',
    module: 'aftersale',
    type: 'menu',
    path: '/aftersale',
    icon: 'Tools',
    sort: 7,
    children: [
      {
        name: '售后订单',
        code: 'aftersale:order',
        description: '售后订单页面',
        module: 'aftersale',
        type: 'menu',
        path: '/aftersale/order',
        icon: 'Document',
        sort: 1,
        children: [
          { name: '查看个人售后', code: 'aftersale:view:personal', type: 'button', sort: 1 },
          { name: '查看部门售后', code: 'aftersale:view:department', type: 'button', sort: 2 },
          { name: '查看全部售后', code: 'aftersale:view:all', type: 'button', sort: 3 },
          { name: '新建售后', code: 'aftersale:add', type: 'button', sort: 4 },
          { name: '编辑售后', code: 'aftersale:edit', type: 'button', sort: 5 }
        ]
      },
      {
        name: '售后数据',
        code: 'aftersale:data',
        description: '售后数据页面',
        module: 'aftersale',
        type: 'menu',
        path: '/aftersale/data',
        icon: 'DataAnalysis',
        sort: 2,
        children: [
          { name: '查看部门售后数据', code: 'aftersale:data:department', type: 'button', sort: 1 },
          { name: '查看全部售后数据', code: 'aftersale:data:all', type: 'button', sort: 2 }
        ]
      }
    ]
  },

  // 资料管理
  {
    name: '资料管理',
    code: 'data',
    description: '资料管理模块',
    module: 'data',
    type: 'menu',
    path: '/data',
    icon: 'Folder',
    sort: 8,
    children: [
      {
        name: '客户查询',
        code: 'data:customer',
        description: '客户查询页面',
        module: 'data',
        type: 'menu',
        path: '/data/customer',
        icon: 'Search',
        sort: 1,
        children: [
          { name: '查询客户资料', code: 'data:customer:search', type: 'button', sort: 1 }
        ]
      }
    ]
  },

  // 系统管理
  {
    name: '系统管理',
    code: 'system',
    description: '系统管理模块',
    module: 'system',
    type: 'menu',
    path: '/system',
    icon: 'Setting',
    sort: 9,
    children: [
      {
        name: '用户管理',
        code: 'system:user',
        description: '用户管理页面',
        module: 'system',
        type: 'menu',
        path: '/system/user',
        icon: 'User',
        sort: 1,
        children: [
          { name: '查看用户', code: 'system:user:view', type: 'button', sort: 1 },
          { name: '新增用户', code: 'system:user:add', type: 'button', sort: 2 },
          { name: '编辑用户', code: 'system:user:edit', type: 'button', sort: 3 },
          { name: '删除用户', code: 'system:user:delete', type: 'button', sort: 4 },
          { name: '重置密码', code: 'system:user:reset-password', type: 'button', sort: 5 }
        ]
      },
      {
        name: '角色管理',
        code: 'system:role',
        description: '角色管理页面',
        module: 'system',
        type: 'menu',
        path: '/system/role',
        icon: 'UserFilled',
        sort: 2,
        children: [
          { name: '查看角色', code: 'system:role:view', type: 'button', sort: 1 },
          { name: '新增角色', code: 'system:role:add', type: 'button', sort: 2 },
          { name: '编辑角色', code: 'system:role:edit', type: 'button', sort: 3 },
          { name: '删除角色', code: 'system:role:delete', type: 'button', sort: 4 },
          { name: '分配权限', code: 'system:role:assign-permission', type: 'button', sort: 5 }
        ]
      },
      {
        name: '部门管理',
        code: 'system:department',
        description: '部门管理页面',
        module: 'system',
        type: 'menu',
        path: '/system/department',
        icon: 'OfficeBuilding',
        sort: 3,
        children: [
          { name: '查看部门', code: 'system:department:view', type: 'button', sort: 1 },
          { name: '新增部门', code: 'system:department:add', type: 'button', sort: 2 },
          { name: '编辑部门', code: 'system:department:edit', type: 'button', sort: 3 },
          { name: '删除部门', code: 'system:department:delete', type: 'button', sort: 4 }
        ]
      },
      {
        name: '超管面板',
        code: 'system:admin',
        description: '超级管理员专用面板',
        module: 'system',
        type: 'menu',
        path: '/system/admin',
        icon: 'Crown',
        sort: 4,
        children: [
          { name: '系统配置', code: 'system:admin:config', type: 'button', sort: 1 },
          { name: '数据备份', code: 'system:admin:backup', type: 'button', sort: 2 },
          { name: '系统监控', code: 'system:admin:monitor', type: 'button', sort: 3 }
        ]
      }
    ]
  }
];

// 根据需求定义的角色权限配置
const defaultRoles = [
  // 一、超级管理员 - 拥有全部权限，没有设限
  {
    name: '超级管理员',
    code: 'super_admin',
    description: '系统超级管理员，拥有所有权限',
    level: 1,
    color: '#ff4d4f',
    status: 'active',
    permissions: [] // 将在创建后分配所有权限
  },

  // 二、部门经理 - 查看本部门数据权限
  {
    name: '部门经理',
    code: 'manager',
    description: '部门经理，负责部门业务管理和团队管理，拥有查看本部门数据权限',
    level: 3,
    color: '#fa8c16',
    status: 'active',
    permissions: [
      // 0. 数据看板（本部门的）
      'dashboard', 'dashboard:personal', 'dashboard:department',
      
      // 1. 客户管理和子菜单：客户列表（可查看本部门的），新增客户
      'customer', 'customer:list', 'customer:view:personal', 'customer:view:department', 'customer:add',
      
      // 2. 订单管理和子菜单：订单列表，新增订单，订单审核（如果有独立审核员就不会赋予该权限）
      'order', 'order:list', 'order:view:personal', 'order:view:department', 'order:add', 'order:audit',
      
      // 3. 服务管理和子菜单：通话管理
      'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
      
      // 4. 业绩统计和子菜单：个人业绩，团队业绩，业绩分析（本部门数据分析），业绩分享
      'performance', 'performance:personal', 'performance:personal:view',
      'performance:team', 'performance:team:view',
      'performance:analysis', 'performance:analysis:department',
      'performance:share', 'performance:share:view', 'performance:share:create',
      
      // 5. 物流管理和子菜单：物流列表，物流跟踪
      'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
      'logistics:tracking', 'logistics:tracking:view',
      
      // 6. 售后管理和子菜单：售后订单，新建售后，售后数据（本部门售后数据）
      'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department', 'aftersale:add', 'aftersale:edit',
      'aftersale:data', 'aftersale:data:department',
      
      // 7. 资料管理和子菜单：客户查询
      'data', 'data:customer', 'data:customer:search'
    ]
  },

  // 三、销售员 - 个人数据权限
  {
    name: '销售员',
    code: 'sales',
    description: '销售人员，负责客户和订单管理，仅限个人数据',
    level: 4,
    color: '#52c41a',
    status: 'active',
    permissions: [
      // 0. 数据看板（仅限个人数据）
      'dashboard', 'dashboard:personal',
      
      // 1. 客户管理和子菜单：客户列表（可查看本人的），新增客户
      'customer', 'customer:list', 'customer:view:personal', 'customer:add',
      
      // 2. 订单管理和子菜单：订单列表，新增订单
      'order', 'order:list', 'order:view:personal', 'order:add',
      
      // 3. 服务管理和子菜单：通话管理
      'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
      
      // 4. 业绩统计和子菜单：个人业绩，团队业绩
      'performance', 'performance:personal', 'performance:personal:view',
      'performance:team', 'performance:team:view',
      
      // 5. 物流管理和子菜单：物流列表，物流跟踪
      'logistics', 'logistics:list', 'logistics:view', 'logistics:tracking', 'logistics:tracking:view',
      
      // 6. 售后管理和子菜单：售后订单（本人的），新建售后
      'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:add',
      
      // 7. 资料管理和子菜单：客户查询
      'data', 'data:customer', 'data:customer:search'
    ]
  },

  // 四、客服 - 仅限超级管理员配置的权限
  {
    name: '客服',
    code: 'service',
    description: '客服人员，仅限超级管理员配置的权限，其他隐藏',
    level: 5,
    color: '#722ed1',
    status: 'active',
    permissions: [
      // 基础权限，具体权限由超级管理员配置
      'customer', 'customer:list', 'customer:view:personal',
      'service', 'service:call', 'service:call:view', 'service:call:add'
    ]
  },

  // 五、管理员 - 拥有大部分权限，除了敏感信息和超管特权
  {
    name: '管理员',
    code: 'admin',
    description: '系统管理员，拥有大部分权限，除了敏感信息和超管特权',
    level: 2,
    color: '#1890ff',
    status: 'active',
    permissions: [
      // 数据看板（全部数据）
      'dashboard', 'dashboard:personal', 'dashboard:department', 'dashboard:all',
      
      // 客户管理（除了删除客户）
      'customer', 'customer:list', 'customer:view:personal', 'customer:view:department', 'customer:view:all',
      'customer:add', 'customer:edit', 'customer:import', 'customer:export',
      
      // 订单管理
      'order', 'order:list', 'order:view:personal', 'order:view:department', 'order:view:all',
      'order:add', 'order:edit', 'order:audit',
      
      // 服务管理
      'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',
      
      // 业绩统计
      'performance', 'performance:personal', 'performance:personal:view',
      'performance:team', 'performance:team:view',
      'performance:analysis', 'performance:analysis:department', 'performance:analysis:all',
      'performance:share', 'performance:share:view', 'performance:share:create',
      
      // 物流管理
      'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
      'logistics:tracking', 'logistics:tracking:view',
      
      // 售后管理
      'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department', 'aftersale:view:all',
      'aftersale:add', 'aftersale:edit',
      'aftersale:data', 'aftersale:data:department', 'aftersale:data:all',
      
      // 资料管理
      'data', 'data:customer', 'data:customer:search',
      
      // 系统管理（除了删除用户、删除部门、超管面板）
      'system', 'system:user', 'system:user:view', 'system:user:add', 'system:user:edit', 'system:user:reset-password',
      'system:role', 'system:role:view', 'system:role:add', 'system:role:edit', 'system:role:assign-permission',
      'system:department', 'system:department:view', 'system:department:add', 'system:department:edit'
    ]
  }
];

// 创建权限的递归函数
async function createPermissions(permissions: any[], parent: Permission | null = null): Promise<Permission[]> {
  const permissionRepository = AppDataSource?.getTreeRepository(Permission);
  if (!permissionRepository) {
    throw new Error('数据库连接未初始化');
  }
  
  const createdPermissions: Permission[] = [];

  for (const permData of permissions) {
    // 检查权限是否已存在
    let permission = await permissionRepository.findOne({ where: { code: permData.code } });
    
    if (!permission) {
      const permissionData: any = {
        name: permData.name,
        code: permData.code,
        description: permData.description,
        module: permData.module,
        type: permData.type,
        path: permData.path,
        icon: permData.icon,
        sort: permData.sort
      };
      
      if (parent) {
        permissionData.parent = parent;
      }
      
      const newPermission = permissionRepository.create(permissionData);
      const savedPermission = await permissionRepository.save(newPermission);
      permission = Array.isArray(savedPermission) ? savedPermission[0] : savedPermission;
      logger.info(`创建权限: ${permission.name} (${permission.code})`);
    }

    if (permission) {
      createdPermissions.push(permission);

      // 递归创建子权限
      if (permData.children && permData.children.length > 0) {
        const childPermissions = await createPermissions(permData.children, permission);
        createdPermissions.push(...childPermissions);
      }
    }
  }

  return createdPermissions;
}

async function initNewRolesAndPermissions() {
  try {
    logger.info('开始初始化新的角色和权限配置...');

    // 创建权限
    logger.info('创建默认权限...');
    const allPermissions = await createPermissions(defaultPermissions);
    logger.info(`成功创建 ${allPermissions.length} 个权限`);

    // 创建角色
    logger.info('创建默认角色...');
    const roleRepository = AppDataSource?.getRepository(Role);
    const permissionRepository = AppDataSource?.getTreeRepository(Permission);
    
    if (!roleRepository || !permissionRepository) {
      throw new Error('数据库连接未初始化');
    }

    for (const roleData of defaultRoles) {
      // 检查角色是否已存在
      let role = await roleRepository.findOne({ 
        where: { code: roleData.code },
        relations: ['permissions']
      });

      if (!role) {
        role = roleRepository.create({
          name: roleData.name,
          code: roleData.code,
          description: roleData.description,
          level: roleData.level,
          color: roleData.color,
          status: roleData.status as 'active' | 'inactive'
        });
        const savedRole = await roleRepository.save(role);
        if (savedRole) {
          role = savedRole;
          logger.info(`创建角色: ${role.name} (${role.code})`);
        }
      } else {
        // 更新现有角色的描述和权限
        role.description = roleData.description;
        await roleRepository.save(role);
        logger.info(`更新角色: ${role.name} (${role.code})`);
      }

      // 分配权限
      if (roleData.code === 'super_admin') {
        // 超级管理员拥有所有权限
        role.permissions = allPermissions;
      } else {
        // 其他角色根据配置分配权限
        const rolePermissions: Permission[] = [];
        for (const permCode of roleData.permissions) {
          const permission = await permissionRepository.findOne({ where: { code: permCode } });
          if (permission) {
            rolePermissions.push(permission);
          }
        }
        role.permissions = rolePermissions;
      }

      await roleRepository.save(role);
      logger.info(`为角色 ${role.name} 分配了 ${role.permissions.length} 个权限`);
    }

    logger.info('✅ 新的角色和权限配置初始化完成');
  } catch (error) {
    logger.error('❌ 角色和权限配置初始化失败:', error);
    throw error;
  }
}

export { initNewRolesAndPermissions };