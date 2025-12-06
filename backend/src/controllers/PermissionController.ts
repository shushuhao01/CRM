import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Permission } from '../entities/Permission';
import { TreeRepository } from 'typeorm';

export class PermissionController {
  private get permissionRepository(): TreeRepository<Permission> {
    return AppDataSource!.getTreeRepository(Permission);
  }

  // 获取权限树
  async getPermissionTree(req: Request, res: Response) {
    try {
      const permissions = await this.permissionRepository.findTrees();

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('获取权限树失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限树失败'
      });
    }
  }

  // 获取权限列表（平铺）
  async getPermissions(req: Request, res: Response) {
    try {
      const { type, module, status } = req.query;

      const queryBuilder = this.permissionRepository.createQueryBuilder('permission');

      if (type) {
        queryBuilder.andWhere('permission.type = :type', { type });
      }

      if (module) {
        queryBuilder.andWhere('permission.module = :module', { module });
      }

      if (status) {
        queryBuilder.andWhere('permission.status = :status', { status });
      }

      queryBuilder.orderBy('permission.sort', 'ASC');

      const permissions = await queryBuilder.getMany();

      res.json({
        success: true,
        data: permissions
      });
    } catch (error) {
      console.error('获取权限列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取权限列表失败'
      });
    }
  }

  // 创建权限
  async createPermission(req: Request, res: Response): Promise<any> {
    try {
      const {
        name,
        code,
        description,
        module,
        type = 'menu',
        path,
        icon,
        sort = 0,
        status = 'active',
        parentId
      } = req.body;

      // 检查权限编码是否已存在
      const existingPermission = await this.permissionRepository.findOne({
        where: { code }
      });

      if (existingPermission) {
        return res.status(400).json({
          success: false,
          message: '权限编码已存在'
        });
      }

      // 获取父权限
      let parent: Permission | undefined = undefined;
      if (parentId) {
        const foundParent = await this.permissionRepository.findOne({
          where: { id: parentId }
        });
        if (!foundParent) {
          return res.status(400).json({
            success: false,
            message: '父权限不存在'
          });
        }
        parent = foundParent;
      }

      // 创建权限
      const permissionData: any = {
        name,
        code,
        description,
        module,
        type: type as 'menu' | 'button' | 'api',
        path,
        icon,
        sort,
        status: status as 'active' | 'inactive'
      };

      if (parent) {
        permissionData.parent = parent;
      }

      const permission = this.permissionRepository.create(permissionData);

      const savedPermission = await this.permissionRepository.save(permission);

      res.status(201).json({
        success: true,
        data: savedPermission,
        message: '权限创建成功'
      });
    } catch (error) {
      console.error('创建权限失败:', error);
      res.status(500).json({
        success: false,
        message: '创建权限失败'
      });
    }
  }

  // 更新权限
  async updatePermission(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const { name, code, description, module, type, path, icon, sort, status, parentId } = req.body;

      const permission = await this.permissionRepository.findOne({
        where: { id: Number(id) }
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }

      // 检查编码是否与其他权限冲突
      if (code && code !== permission.code) {
        const existingPermission = await this.permissionRepository.findOne({ where: { code } });
        if (existingPermission) {
          return res.status(400).json({
            success: false,
            message: '权限编码已存在'
          });
        }
      }

      // 更新基本信息
      if (name) permission.name = name;
      if (code) permission.code = code;
      if (description !== undefined) permission.description = description;
      if (module) permission.module = module;
      if (type) permission.type = type;
      if (path !== undefined) permission.path = path;
      if (icon !== undefined) permission.icon = icon;
      if (sort !== undefined) permission.sort = sort;
      if (status) permission.status = status;

      // 更新父权限
      if (parentId !== undefined) {
        if (parentId) {
          const parent = await this.permissionRepository.findOne({
            where: { id: parentId }
          });
          if (!parent) {
            return res.status(400).json({
              success: false,
              message: '父权限不存在'
            });
          }
          (permission as any).parent = parent;
        } else {
          (permission as any).parent = undefined;
        }
      }

      const savedPermission = await this.permissionRepository.save(permission);

      res.json({
        success: true,
        data: savedPermission,
        message: '权限更新成功'
      });
    } catch (error) {
      console.error('更新权限失败:', error);
      res.status(500).json({
        success: false,
        message: '更新权限失败'
      });
    }
  }

  // 删除权限
  async deletePermission(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      const permission = await this.permissionRepository.findOne({
        where: { id: Number(id) }
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }

      // 检查是否有子权限
      const children = await this.permissionRepository.findDescendants(permission);
      if (children.length > 1) { // 包含自己，所以大于1表示有子权限
        return res.status(400).json({
          success: false,
          message: '该权限下还有子权限，无法删除'
        });
      }

      await this.permissionRepository.remove(permission);

      res.json({
        success: true,
        message: '权限删除成功'
      });
    } catch (error) {
      console.error('删除权限失败:', error);
      res.status(500).json({
        success: false,
        message: '删除权限失败'
      });
    }
  }
}
