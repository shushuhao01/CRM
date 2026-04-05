/**
 * Admin Roles Routes - 管理后台角色管理
 * 提供角色CRUD、权限分配、权限树查询等接口
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { AdminRole } from '../../entities/AdminRole';
import { AdminUser } from '../../entities/AdminUser';
import { log } from '../../config/logger';

const router = Router();

// ============ 权限树定义 ============
// 完整的权限树，定义了管理后台所有可分配的权限
const PERMISSION_TREE = [
  {
    code: 'dashboard',
    name: '仪表盘',
    children: [
      { code: 'dashboard:view', name: '查看仪表盘' }
    ]
  },
  {
    code: 'customer-management',
    name: '客户管理',
    children: [
      { code: 'customer-management:all:view', name: '查看所有客户' },
      { code: 'customer-management:all:edit', name: '编辑客户信息' },
      { code: 'customer-management:all:followup', name: '添加跟进记录' },
      { code: 'customer-management:renewal:view', name: '查看续费提醒' }
    ]
  },
  {
    code: 'private-customers',
    name: '私有客户',
    children: [
      { code: 'private-customers:list:view', name: '查看客户列表' },
      { code: 'private-customers:list:create', name: '新建客户' },
      { code: 'private-customers:list:edit', name: '编辑客户' },
      { code: 'private-customers:list:delete', name: '删除客户' },
      { code: 'private-customers:detail:view', name: '查看客户详情' },
      { code: 'private-customers:detail:renew', name: '续期授权' },
      { code: 'private-customers:detail:revoke', name: '吊销授权' },
      { code: 'private-customers:detail:reset-password', name: '重置管理员密码' }
    ]
  },
  {
    code: 'tenant-customers',
    name: '租户客户',
    children: [
      { code: 'tenant-customers:list:view', name: '查看客户列表' },
      { code: 'tenant-customers:list:create', name: '新建租户' },
      { code: 'tenant-customers:list:edit', name: '编辑租户' },
      { code: 'tenant-customers:list:delete', name: '删除租户' },
      { code: 'tenant-customers:packages:view', name: '查看套餐管理' },
      { code: 'tenant-customers:packages:create', name: '新建套餐' },
      { code: 'tenant-customers:packages:edit', name: '编辑套餐' },
      { code: 'tenant-customers:packages:delete', name: '删除套餐' },
      { code: 'tenant-customers:detail:view', name: '查看客户详情' },
      { code: 'tenant-customers:detail:renew', name: '续期租户' },
      { code: 'tenant-customers:detail:suspend', name: '暂停/恢复租户' },
      { code: 'tenant-customers:detail:reset-password', name: '重置管理员密码' }
    ]
  },
  {
    code: 'modules',
    name: '模块服务',
    children: [
      { code: 'modules:list:view', name: '查看模块列表' },
      { code: 'modules:list:create', name: '新建模块' },
      { code: 'modules:list:edit', name: '编辑模块' },
      { code: 'modules:list:delete', name: '删除模块' },
      { code: 'modules:config:view', name: '查看CRM配置' },
      { code: 'modules:config:edit', name: '编辑CRM配置' },
      { code: 'modules:distribute:view', name: '查看配置下发' },
      { code: 'modules:distribute:edit', name: '执行配置下发' },
      { code: 'modules:message:view', name: '查看消息管理' },
      { code: 'modules:message:edit', name: '编辑消息' }
    ]
  },
  {
    code: 'payment',
    name: '支付管理',
    children: [
      { code: 'payment:list:view', name: '查看支付列表' },
      { code: 'payment:list:edit', name: '处理支付/退款' },
      { code: 'payment:config:view', name: '查看支付配置' },
      { code: 'payment:config:edit', name: '编辑支付配置' },
      { code: 'payment:reports:view', name: '查看支付报表' },
      { code: 'payment:reports:export', name: '导出支付报表' }
    ]
  },
  {
    code: 'versions',
    name: '版本发布',
    children: [
      { code: 'versions:list:view', name: '查看版本列表' },
      { code: 'versions:list:edit', name: '编辑版本' },
      { code: 'versions:list:delete', name: '删除版本' },
      { code: 'versions:upload:view', name: '查看上传版本页' },
      { code: 'versions:upload:edit', name: '上传新版本' },
      { code: 'versions:changelog:view', name: '查看更新日志' },
      { code: 'versions:changelog:edit', name: '编辑更新日志' }
    ]
  },
  {
    code: 'api',
    name: '接口管理',
    children: [
      { code: 'api:list:view', name: '查看接口列表' },
      { code: 'api:list:create', name: '新建接口' },
      { code: 'api:list:edit', name: '编辑接口' },
      { code: 'api:list:delete', name: '删除接口' }
    ]
  },
  {
    code: 'settings',
    name: '系统设置',
    children: [
      { code: 'settings:admins:view', name: '查看管理员账号' },
      { code: 'settings:admins:create', name: '新建管理员' },
      { code: 'settings:admins:edit', name: '编辑管理员' },
      { code: 'settings:admins:delete', name: '删除管理员' },
      { code: 'settings:roles:view', name: '查看角色管理' },
      { code: 'settings:roles:create', name: '新建角色' },
      { code: 'settings:roles:edit', name: '编辑角色' },
      { code: 'settings:roles:delete', name: '删除角色' },
      { code: 'settings:basic:view', name: '查看运营配置' },
      { code: 'settings:basic:edit', name: '编辑运营配置' },
      { code: 'settings:notification-templates:view', name: '查看通知模板' },
      { code: 'settings:notification-templates:edit', name: '编辑通知模板' },
      { code: 'settings:notification-service:view', name: '查看通知服务' },
      { code: 'settings:notification-service:edit', name: '编辑通知服务' },
      { code: 'settings:operation-logs:view', name: '查看操作日志' },
      { code: 'settings:recycle-bin:view', name: '查看回收站' },
      { code: 'settings:recycle-bin:restore', name: '恢复回收站数据' },
      { code: 'settings:recycle-bin:delete', name: '彻底删除数据' }
    ]
  }
];

/**
 * 获取权限树
 * GET /api/v1/admin/roles/permission-tree
 */
router.get('/permission-tree', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: PERMISSION_TREE });
  } catch (error) {
    log.error('[Admin Roles] 获取权限树失败:', error);
    res.status(500).json({ success: false, message: '获取权限树失败' });
  }
});

/**
 * 获取角色列表
 * GET /api/v1/admin/roles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { keyword, status } = req.query;
    const roleRepo = AppDataSource.getRepository(AdminRole);

    let queryBuilder = roleRepo.createQueryBuilder('role');

    if (keyword) {
      queryBuilder = queryBuilder.where(
        '(role.name LIKE :keyword OR role.code LIKE :keyword OR role.description LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('role.status = :status', { status });
    }

    queryBuilder = queryBuilder.orderBy('role.isSystem', 'DESC').addOrderBy('role.createdAt', 'ASC');

    const roles = await queryBuilder.getMany();

    // 查询每个角色的用户数量
    const rolesWithCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await AppDataSource.getRepository(AdminUser)
          .count({ where: { roleId: role.id } });
        return {
          ...role,
          permissions: JSON.parse(role.permissions || '[]'),
          userCount
        };
      })
    );

    res.json({ success: true, data: rolesWithCount });
  } catch (error) {
    log.error('[Admin Roles] 获取角色列表失败:', error);
    res.status(500).json({ success: false, message: '获取角色列表失败' });
  }
});

/**
 * 获取单个角色
 * GET /api/v1/admin/roles/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roleRepo = AppDataSource.getRepository(AdminRole);
    const role = await roleRepo.findOne({ where: { id } });

    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }

    const userCount = await AppDataSource.getRepository(AdminUser)
      .count({ where: { roleId: role.id } });

    res.json({
      success: true,
      data: {
        ...role,
        permissions: JSON.parse(role.permissions || '[]'),
        userCount
      }
    });
  } catch (error) {
    log.error('[Admin Roles] 获取角色详情失败:', error);
    res.status(500).json({ success: false, message: '获取角色详情失败' });
  }
});

/**
 * 创建角色
 * POST /api/v1/admin/roles
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'admin')) {
      return res.status(403).json({ success: false, message: '无权限创建角色' });
    }

    const { name, code, description, permissions, status } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, message: '角色名称和标识码不能为空' });
    }

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: '权限列表不能为空' });
    }

    const roleRepo = AppDataSource.getRepository(AdminRole);

    // 检查名称和code唯一性
    const existingByName = await roleRepo.findOne({ where: { name } });
    if (existingByName) {
      return res.status(400).json({ success: false, message: '角色名称已存在' });
    }

    const existingByCode = await roleRepo.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(400).json({ success: false, message: '角色标识码已存在' });
    }

    const newRole = roleRepo.create({
      name,
      code,
      description: description || '',
      permissions: JSON.stringify(permissions),
      isSystem: 0,
      status: status || 'active'
    });

    await roleRepo.save(newRole);

    res.json({
      success: true,
      message: '角色创建成功',
      data: { ...newRole, permissions }
    });
  } catch (error) {
    log.error('[Admin Roles] 创建角色失败:', error);
    res.status(500).json({ success: false, message: '创建角色失败' });
  }
});

/**
 * 更新角色
 * PUT /api/v1/admin/roles/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || (adminUser.role !== 'super_admin' && adminUser.role !== 'admin')) {
      return res.status(403).json({ success: false, message: '无权限编辑角色' });
    }

    const { id } = req.params;
    const { name, description, permissions, status } = req.body;

    const roleRepo = AppDataSource.getRepository(AdminRole);
    const role = await roleRepo.findOne({ where: { id } });

    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }

    // 系统内置角色的超级管理员角色不允许修改权限
    if (role.isSystem && role.code === 'super_admin') {
      return res.status(400).json({ success: false, message: '超级管理员角色的权限不可修改' });
    }

    const updateData: Partial<AdminRole> = {};
    if (name !== undefined) {
      // 检查名称唯一性（排除自身）
      const existingByName = await roleRepo.findOne({ where: { name } });
      if (existingByName && existingByName.id !== id) {
        return res.status(400).json({ success: false, message: '角色名称已存在' });
      }
      updateData.name = name;
    }
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined && Array.isArray(permissions)) {
      updateData.permissions = JSON.stringify(permissions);
    }
    if (status !== undefined) updateData.status = status;

    await roleRepo.update(id, updateData);

    res.json({ success: true, message: '角色更新成功' });
  } catch (error) {
    log.error('[Admin Roles] 更新角色失败:', error);
    res.status(500).json({ success: false, message: '更新角色失败' });
  }
});

/**
 * 删除角色
 * DELETE /api/v1/admin/roles/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    if (!adminUser || adminUser.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: '仅超级管理员可删除角色' });
    }

    const { id } = req.params;
    const roleRepo = AppDataSource.getRepository(AdminRole);
    const role = await roleRepo.findOne({ where: { id } });

    if (!role) {
      return res.status(404).json({ success: false, message: '角色不存在' });
    }

    if (role.isSystem) {
      return res.status(400).json({ success: false, message: '系统内置角色不可删除' });
    }

    // 检查是否有用户关联此角色
    const userCount = await AppDataSource.getRepository(AdminUser)
      .count({ where: { roleId: id } });
    if (userCount > 0) {
      return res.status(400).json({ success: false, message: `该角色下还有 ${userCount} 个用户，请先移除用户后再删除` });
    }

    await roleRepo.delete(id);

    res.json({ success: true, message: '角色删除成功' });
  } catch (error) {
    log.error('[Admin Roles] 删除角色失败:', error);
    res.status(500).json({ success: false, message: '删除角色失败' });
  }
});

export default router;

