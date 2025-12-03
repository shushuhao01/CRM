import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { User } from '../entities/User';
import { Repository, TreeRepository } from 'typeorm';

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
      const { page = 1, limit = 20, search, status } = req.query;

      const queryBuilder = this.roleRepository.createQueryBuilder('role');

      if (search) {
        queryBuilder.andWhere('(role.name LIKE :search OR role.code LIKE :search)', {
          search: `%${search}%`
        });
      }

      if (status) {
        queryBuilder.andWhere('role.status = :status', { status });
      }

      const [roles, total] = await queryBuilder
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      // 计算每个角色的用户数量和权限数量
      const rolesWithCounts = await Promise.all(
        roles.map(async (role) => {
          // 通过 roleId 字段查询用户数量
          const userCount = await this.userRepository.count({
            where: { roleId: role.id }
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

      // 获取该角色的用户数量
      const userCount = await this.userRepository.count({
        where: { roleId: role.id }
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
      const { name, code, description, status = 'active', level = 0, color, permissions = [] } = req.body;

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

      // 创建角色 - permissions 是 JSON 字段
      const role = this.roleRepository.create({
        id: roleId,
        name,
        code,
        description,
        status: status as 'active' | 'inactive',
        level,
        color,
        permissions: Array.isArray(permissions) ? permissions : []
      });

      const savedRole = await this.roleRepository.save(role);

      res.status(201).json({
        success: true,
        data: savedRole,
        message: '角色创建成功'
      });
    } catch (error) {
      console.error('创建角色失败:', error);
      res.status(500).json({
        success: false,
        message: '创建角色失败'
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

      // 检查是否有用户使用此角色
      const usersWithRole = await this.userRepository.count({
        where: { roleId: String(id) }
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

  // 获取角色权限
  async getRolePermissions(req: Request, res: Response): Promise<void> {
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
      res.status(500).json({
        success: false,
        message: '获取角色权限失败'
      });
    }
  }
}
