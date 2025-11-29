import { Request, Response } from 'express';
import { getDataSource, AppDataSource } from '../config/database';
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

      const queryBuilder = this.roleRepository.createQueryBuilder('role')
        .leftJoinAndSelect('role.permissions', 'permission')
        .groupBy('role.id');

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
          const userCount = await this.userRepository
            .createQueryBuilder('user')
            .leftJoin('user.roles', 'role')
            .where('role.id = :roleId', { roleId: role.id })
            .getCount();

          return {
            ...role,
            userCount,
            permissionCount: role.permissions?.length || 0
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
  async getRoleById(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const role = await this.roleRepository.findOne({
        where: { id: Number(id) },
        relations: ['permissions', 'users']
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }

      res.json({
        success: true,
        data: role
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
  async createRole(req: Request, res: Response): Promise<any> {
    try {
      const { name, code, description, status = 'active', level = 0, color, permissionIds = [] } = req.body;

      // 检查角色名称和编码是否已存在
      const existingRole = await this.roleRepository.findOne({
        where: [
          { name },
          { code }
        ]
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: existingRole.name === name ? '角色名称已存在' : '角色编码已存在'
        });
      }

      // 获取权限
      const permissions = await this.permissionRepository.findByIds(permissionIds);

      // 创建角色
      const role = this.roleRepository.create({
        name,
        code,
        description,
        status: status as 'active' | 'inactive',
        level,
        color,
        permissions
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
  async updateRole(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { name, code, description, status, level, color, permissionIds } = req.body;

      const role = await this.roleRepository.findOne({
        where: { id: Number(id) },
        relations: ['permissions']
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }

      // 检查名称和编码是否与其他角色冲突
      if (name && name !== role.name) {
        const existingRole = await this.roleRepository.findOne({ where: { name } });
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: '角色名称已存在'
          });
        }
      }

      if (code && code !== role.code) {
        const existingRole = await this.roleRepository.findOne({ where: { code } });
        if (existingRole) {
          return res.status(400).json({
            success: false,
            message: '角色编码已存在'
          });
        }
      }

      // 更新基本信息
      if (name) role.name = name;
      if (code) role.code = code;
      if (description !== undefined) role.description = description;
      if (status) role.status = status;
      if (level !== undefined) role.level = level;
      if (color !== undefined) role.color = color;

      // 更新权限
      if (permissionIds) {
        const permissions = await this.permissionRepository.findByIds(permissionIds);
        role.permissions = permissions;
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
  async deleteRole(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const role = await this.roleRepository.findOne({
        where: { id: Number(id) },
        relations: ['users']
      });

      if (!role) {
        return res.status(404).json({
          success: false,
          message: '角色不存在'
        });
      }

      // 检查是否有用户使用此角色（通过查询User表）
      const userRepository = AppDataSource.getRepository(User);
      const usersWithRole = await userRepository.count({
        where: { roleId: id }
      });

      if (usersWithRole > 0) {
        return res.status(400).json({
          success: false,
          message: `该角色下还有${usersWithRole}个用户，无法删除`
        });
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
}
