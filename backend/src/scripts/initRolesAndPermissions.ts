import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { logger } from '../config/logger';

// 默认权限数据
const defaultPermissions = [
  // 系统管理
  {
    name: '系统管理',
    code: 'system',
    description: '系统管理模块',
    module: 'system',
    type: 'menu',
    path: '/system',
    icon: 'Setting',
    sort: 1,
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
      }
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
          { name: '查看客户', code: 'customer:view', type: 'button', sort: 1 },
          { name: '新增客户', code: 'customer:add', type: 'button', sort: 2 },
          { name: '编辑客户', code: 'customer:edit', type: 'button', sort: 3 },
          { name: '删除客户', code: 'customer:delete', type: 'button', sort: 4 },
          { name: '导入客户', code: 'customer:import', type: 'button', sort: 5 },
          { name: '导出客户', code: 'customer:export', type: 'button', sort: 6 }
        ]
      }
    ]
  },
  // 销售管理
  {
    name: '销售管理',
    code: 'sales',
    description: '销售管理模块',
    module: 'sales',
    type: 'menu',
    path: '/sales',
    icon: 'TrendCharts',
    sort: 3,
    children: [
      {
        name: '订单管理',
        code: 'sales:order',
        description: '订单管理页面',
        module: 'sales',
        type: 'menu',
        path: '/sales/order',
        icon: 'Document',
        sort: 1,
        children: [
          { name: '查看订单', code: 'sales:order:view', type: 'button', sort: 1 },
          { name: '新增订单', code: 'sales:order:add', type: 'button', sort: 2 },
          { name: '编辑订单', code: 'sales:order:edit', type: 'button', sort: 3 },
          { name: '删除订单', code: 'sales:order:delete', type: 'button', sort: 4 }
        ]
      },
      {
        name: '产品管理',
        code: 'sales:product',
        description: '产品管理页面',
        module: 'sales',
        type: 'menu',
        path: '/sales/product',
        icon: 'Box',
        sort: 2,
        children: [
          { name: '查看产品', code: 'sales:product:view', type: 'button', sort: 1 },
          { name: '新增产品', code: 'sales:product:add', type: 'button', sort: 2 },
          { name: '编辑产品', code: 'sales:product:edit', type: 'button', sort: 3 },
          { name: '删除产品', code: 'sales:product:delete', type: 'button', sort: 4 }
        ]
      }
    ]
  },
  // 数据统计
  {
    name: '数据统计',
    code: 'dashboard',
    description: '数据统计模块',
    module: 'dashboard',
    type: 'menu',
    path: '/dashboard',
    icon: 'DataAnalysis',
    sort: 4,
    children: [
      { name: '查看个人数据', code: 'dashboard:personal', type: 'button', sort: 1 },
      { name: '查看部门数据', code: 'dashboard:department', type: 'button', sort: 2 },
      { name: '查看全部数据', code: 'dashboard:all', type: 'button', sort: 3 }
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
    sort: 5,
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
    sort: 6,
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
    sort: 7,
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
    sort: 8,
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
    sort: 9,
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
  }
];

// 默认角色数据
const defaultRoles = [
  {
    name: '超级管理员',
    code: 'super_admin',
    description: '系统超级管理员，拥有所有权限',
    level: 1,
    color: '#ff4d4f',
    status: 'active',
    permissions: [] // 将在创建后分配所有权限
  },
  {
    name: '管理员（部门负责人）',
    code: 'admin',
    description: '部门管理员，负责部门管理和用户管理',
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

      // 物流管理
      'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
      'logistics:tracking', 'logistics:tracking:view',

      // 售后管理
      'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department', 'aftersale:view:all',
      'aftersale:add', 'aftersale:edit',

      // 资料管理
      'data', 'data:customer', 'data:customer:search',

      // 系统管理
      'system:user', 'system:user:view', 'system:user:add', 'system:user:edit', 'system:user:reset-password',
      'system:role', 'system:role:view', 'system:role:add', 'system:role:edit', 'system:role:assign-permission',
      'system:department', 'system:department:view', 'system:department:add', 'system:department:edit'
    ]
  },
  {
    name: '经理',
    code: 'manager',
    description: '部门经理，负责部门业务管理和团队管理，拥有查看本部门数据权限',
    level: 3,
    color: '#fa8c16',
    status: 'active',
    permissions: [
      // 数据看板（本部门的）
      'dashboard', 'dashboard:personal', 'dashboard:department',

      // 客户管理
      'customer', 'customer:list', 'customer:view:personal', 'customer:view:department', 'customer:add',

      // 订单管理
      'order', 'order:list', 'order:view:personal', 'order:view:department', 'order:add', 'order:audit',

      // 服务管理
      'service', 'service:call', 'service:call:view', 'service:call:add', 'service:call:edit',

      // 业绩统计
      'performance', 'performance:personal', 'performance:personal:view',
      'performance:team', 'performance:team:view',

      // 物流管理
      'logistics', 'logistics:list', 'logistics:view', 'logistics:add', 'logistics:edit',
      'logistics:tracking', 'logistics:tracking:view',

      // 售后管理
      'aftersale', 'aftersale:order', 'aftersale:view:personal', 'aftersale:view:department', 'aftersale:add', 'aftersale:edit',

      // 资料管理
      'data', 'data:customer', 'data:customer:search'
    ]
  },
  {
    name: '销售员（普通员工）',
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
  {
    name: '客服（指定部门的客服专员）',
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
  }
];

async function createPermissions(permissions: any[], parent: Permission | null = null): Promise<Permission[]> {
  const permissionRepository = AppDataSource!.getTreeRepository(Permission);
  const createdPermissions: Permission[] = [];

  for (const permData of permissions) {
    const { children, ...permissionData } = permData;

    // 检查权限是否已存在
    let permission = await permissionRepository.findOne({ where: { code: permissionData.code } });

    if (!permission) {
      const createData: any = {
        ...permissionData,
        module: permissionData.module || 'system',
        type: (permissionData.type || 'menu') as 'menu' | 'button' | 'api',
        status: 'active' as 'active' | 'inactive'
      };

      if (parent) {
        createData.parent = parent;
      }

      const newPermission = permissionRepository.create(createData);
      const savedPermission = await permissionRepository.save(newPermission);
      permission = Array.isArray(savedPermission) ? savedPermission[0] : savedPermission;
      logger.info(`创建权限: ${permission.name} (${permission.code})`);
    }

    if (permission) {
      createdPermissions.push(permission);
    }

    // 递归创建子权限
    if (children && children.length > 0) {
      const childPermissions = await createPermissions(children, permission);
      createdPermissions.push(...childPermissions);
    }
  }

  return createdPermissions;
}

async function initRolesAndPermissions() {
  try {
    logger.info('开始初始化角色和权限...');

    // 创建权限
    logger.info('创建默认权限...');
    const allPermissions = await createPermissions(defaultPermissions);
    logger.info(`成功创建 ${allPermissions.length} 个权限`);

    // 创建角色
    logger.info('创建默认角色...');
    const roleRepository = AppDataSource!.getRepository(Role);
    const permissionRepository = AppDataSource!.getTreeRepository(Permission);

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

    logger.info('✅ 角色和权限初始化完成');
  } catch (error) {
    logger.error('❌ 角色和权限初始化失败:', error);
    throw error;
  }
}

export { initRolesAndPermissions };
