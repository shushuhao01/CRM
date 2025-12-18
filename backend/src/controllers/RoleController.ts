import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { User } from '../entities/User';
import { Repository, TreeRepository, Not } from 'typeorm';

export class RoleController {
  private get roleRepository(): Repository<Role> {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('数据库连接未初始化');
    }
    return dataSource.getRepository(Role);
  }

  private get permissionRepository(): TreeRepository<Permission> {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('数据库连接未初始化');
    }
    return dataSource.getTreeRepository(Permission);
  }

  private get userRepository(): Repository<User> {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('数据库连接未初始化');
    }
    return dataSource.getRepository(User);
  }

  // 获取角色列表
  async getRoles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, status, isTemplate } = req.query;

      const queryBuilder = this.roleRepository.createQueryBuilder('role');

      // 默认只获取非模板角色，除非明确指定
      if (isTemplate === 'true') {
        queryBuilder.andWhere('role.isTemplate = :isTemplate', { isTemplate: true });
      } else if (isTemplate === 'false' || isTemplate === undefined) {
        queryBuilder.andWhere('(role.isTemplate = :isTemplate OR role.isTemplate IS NULL)', { isTemplate: false });
      }

      if (search) {
        queryBuilder.andWhere('(role.name LIKE :search OR role.code LIKE :search)', {
          search: `%${search}%`
        });
      }

      if (status) {
        queryBuilder.andWhere('role.status = :status', { status });
      }

      const [roles, total] = await queryBuilder
        .orderBy('role.level', 'ASC')
        .addOrderBy('role.createdAt', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      // 计算每个角色的用户数量和权限数量
      const rolesWithCounts = await Promise.all(
        roles.map(async (role) => {
          // 通过 roleId 字段查询用户数量（roleId 存储的是角色的 code，不是 id）
          const userCount = await this.userRepository.count({
            where: { roleId: role.code }
          });

          // permissions 是 JSON 字段，直接获取长度
          const permissionCount = Array.isArray(role.permissions) ? role.permissions.length : 0;

          return {
            ...role,
            userCount,
            permissionCount
          };
        })
      );

      res.json({
        success: true,
        data: {
          roles: rolesWithCounts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('获取角色列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色列表失败'
      });
    }
  }

  // 获取角色详情
  async getRoleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      // 获取该角色的用户数量（roleId 存储的是角色的 code，不是 id）
      const userCount = await this.userRepository.count({
        where: { roleId: role.code }
      });

      res.json({
        success: true,
        data: {
          ...role,
          userCount,
          permissionCount: Array.isArray(role.permissions) ? role.permissions.length : 0
        }
      });
    } catch (error) {
      console.error('获取角色详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色详情失败'
      });
    }
  }

  // 创建角色
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, description, status = 'active', level = 0, color, permissions = [], roleType = 'custom', isTemplate = false } = req.body;

      // 检查角色名称和编码是否已存在
      const existingRole = await this.roleRepository.findOne({
        where: [
          { name },
          { code }
        ]
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: existingRole.name === name ? '角色名称已存在' : '角色编码已存在'
        });
        return;
      }

      // 生成角色ID
      const prefix = isTemplate ? 'tpl' : 'role';
      const roleId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 创建角色 - permissions 是 JSON 字段
      const role = this.roleRepository.create({
        id: roleId,
        name,
        code,
        description,
        status: status as 'active' | 'inactive',
        level,
        color,
        roleType: roleType as 'system' | 'business' | 'custom',
        isTemplate: Boolean(isTemplate),
        permissions: Array.isArray(permissions) ? permissions : []
      });

      const savedRole = await this.roleRepository.save(role);

      res.status(201).json({
        success: true,
        data: savedRole,
        message: isTemplate ? '角色模板创建成功' : '角色创建成功'
      });
    } catch (error) {
      console.error('创建角色失败:', error);
      res.status(500).json({
        success: false,
        message: '创建角色失败'
      });
    }
  }

  // 获取角色模板列表
  async getRoleTemplates(req: Request, res: Response) {
    try {
      const templates = await this.roleRepository.find({
        where: { isTemplate: true },
        order: { level: 'ASC', createdAt: 'DESC' }
      });

      // 计算每个模板被使用的次数（通过查找使用相同权限的角色数量）
      const templatesWithStats = templates.map(template => ({
        ...template,
        permissionCount: Array.isArray(template.permissions) ? template.permissions.length : 0,
        userCount: 0 // 模板本身没有用户
      }));

      res.json({
        success: true,
        data: templatesWithStats
      });
    } catch (error) {
      console.error('获取角色模板列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色模板列表失败'
      });
    }
  }

  // 从模板创建角色
  async createRoleFromTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId, name, code, description } = req.body;

      // 获取模板
      const template = await this.roleRepository.findOne({
        where: { id: templateId, isTemplate: true }
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: '模板不存在'
        });
        return;
      }

      // 检查角色名称和编码是否已存在
      const existingRole = await this.roleRepository.findOne({
        where: [
          { name },
          { code }
        ]
      });

      if (existingRole) {
        res.status(400).json({
          success: false,
          message: existingRole.name === name ? '角色名称已存在' : '角色编码已存在'
        });
        return;
      }

      // 生成角色ID
      const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 从模板创建角色
      const role = this.roleRepository.create({
        id: roleId,
        name,
        code,
        description: description || template.description,
        status: 'active',
        level: template.level,
        color: template.color,
        roleType: 'custom',
        isTemplate: false,
        permissions: template.permissions || []
      });

      const savedRole = await this.roleRepository.save(role);

      res.status(201).json({
        success: true,
        data: savedRole,
        message: `角色创建成功（基于模板：${template.name}）`
      });
    } catch (error) {
      console.error('从模板创建角色失败:', error);
      res.status(500).json({
        success: false,
        message: '从模板创建角色失败'
      });
    }
  }

  // 更新角色
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code, description, status, level, color, permissions } = req.body;

      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      // 检查名称和编码是否与其他角色冲突
      if (name && name !== role.name) {
        const existingRole = await this.roleRepository.findOne({ where: { name } });
        if (existingRole) {
          res.status(400).json({
            success: false,
            message: '角色名称已存在'
          });
          return;
        }
      }

      if (code && code !== role.code) {
        const existingRole = await this.roleRepository.findOne({ where: { code } });
        if (existingRole) {
          res.status(400).json({
            success: false,
            message: '角色编码已存在'
          });
          return;
        }
      }

      // 更新基本信息
      if (name) role.name = name;
      if (code) role.code = code;
      if (description !== undefined) role.description = description;
      if (status) role.status = status;
      if (level !== undefined) role.level = level;
      if (color !== undefined) role.color = color;

      // 更新权限 - permissions 是 JSON 字段
      if (permissions !== undefined) {
        role.permissions = Array.isArray(permissions) ? permissions : [];
      }

      const savedRole = await this.roleRepository.save(role);

      res.json({
        success: true,
        data: savedRole,
        message: '角色更新成功'
      });
    } catch (error) {
      console.error('更新角色失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色失败'
      });
    }
  }

  // 删除角色
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      // 检查是否有用户使用此角色（roleId 存储的是角色的 code，不是 id）
      const usersWithRole = await this.userRepository.count({
        where: { roleId: role.code }
      });

      if (usersWithRole > 0) {
        res.status(400).json({
          success: false,
          message: `该角色下还有${usersWithRole}个用户，无法删除`
        });
        return;
      }

      await this.roleRepository.remove(role);

      res.json({
        success: true,
        message: '角色删除成功'
      });
    } catch (error) {
      console.error('删除角色失败:', error);
      res.status(500).json({
        success: false,
        message: '删除角色失败'
      });
    }
  }

  // 获取角色统计
  async getRoleStats(req: Request, res: Response) {
    try {
      const total = await this.roleRepository.count();
      const active = await this.roleRepository.count({ where: { status: 'active' } });
      const permissions = await this.permissionRepository.count();

      res.json({
        success: true,
        data: {
          total,
          active,
          permissions
        }
      });
    } catch (error) {
      console.error('获取角色统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色统计失败'
      });
    }
  }

  // 更新角色状态
  async updateRoleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      console.log('[RoleController] 更新角色状态:', { id, status });

      // 验证状态值
      if (!['active', 'inactive'].includes(status)) {
        res.status(400).json({
          success: false,
          message: '无效的状态值'
        });
        return;
      }

      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      // 🔥 防止禁用系统预设角色（超级管理员和管理员）
      const nonDisableableRoles = ['super_admin', 'admin'];
      if (status === 'inactive' && nonDisableableRoles.includes(role.code)) {
        res.status(400).json({
          success: false,
          message: '系统预设角色不可禁用'
        });
        return;
      }

      // 更新状态
      role.status = status;
      const savedRole = await this.roleRepository.save(role);

      console.log('[RoleController] 角色状态更新成功:', { id, status });

      res.json({
        success: true,
        data: savedRole,
        message: `角色已${status === 'active' ? '启用' : '禁用'}`
      });
    } catch (error) {
      console.error('更新角色状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色状态失败'
      });
    }
  }

  // 获取角色权限
  async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 尝试查找角色
      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      // 如果找不到角色，返回默认权限（而不是404）
      if (!role) {
        console.log(`[RoleController] 角色 ${id} 不存在，返回默认权限`);
        res.json({
          success: true,
          data: {
            roleId: String(id),
            roleName: 'default',
            permissions: []  // 返回空权限数组，前端会使用默认权限
          }
        });
        return;
      }

      // permissions 是 JSON 字段，直接返回
      const permissions = Array.isArray(role.permissions) ? role.permissions : [];

      res.json({
        success: true,
        data: {
          roleId: role.id,
          roleName: role.name,
          permissions: permissions
        }
      });
    } catch (error) {
      console.error('获取角色权限失败:', error);
      // 出错时也返回默认权限，避免前端报错
      res.json({
        success: true,
        data: {
          roleId: req.params.id,
          roleName: 'default',
          permissions: []
        }
      });
    }
  }

  // 🔥 更新角色权限
  async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions, permissionIds } = req.body;

      console.log(`[RoleController] 更新角色权限: ${id}`, { permissions, permissionIds });

      const role = await this.roleRepository.findOne({
        where: { id: String(id) }
      });

      if (!role) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      // 支持两种格式：permissions 或 permissionIds
      const newPermissions = permissions || permissionIds || [];
      role.permissions = Array.isArray(newPermissions) ? newPermissions : [];

      const savedRole = await this.roleRepository.save(role);

      console.log(`[RoleController] 角色权限更新成功: ${role.name}`, {
        permissionCount: role.permissions.length
      });

      res.json({
        success: true,
        data: {
          roleId: savedRole.id,
          roleName: savedRole.name,
          permissions: savedRole.permissions
        },
        message: '权限更新成功'
      });
    } catch (error) {
      console.error('更新角色权限失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色权限失败'
      });
    }
  }
}
