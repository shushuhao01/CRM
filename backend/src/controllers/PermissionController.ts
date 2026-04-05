import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { Permission } from '../entities/Permission';
import { TreeRepository } from 'typeorm';
import { getCurrentTenantIdSafe } from '../utils/tenantHelpers';

import { log } from '../config/logger';
export class PermissionController {
  private get permissionRepository(): TreeRepository<Permission> {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('数据库连接未初始化');
    }
    return dataSource.getTreeRepository(Permission);
  }

  /**
   * 🔥 统一获取租户ID，用于所有方法的租户过滤
   * 由于 Permission 使用 TreeRepository（不支持 getTenantRepo Proxy），
   * 需要在每个方法中手动添加租户过滤
   */
  private getTenantId(): string | undefined {
    return getCurrentTenantIdSafe();
  }

  // 获取权限树
  async getPermissionTree(req: Request, res: Response) {
    try {
      const tenantId = this.getTenantId();
      const qb = this.permissionRepository.createQueryBuilder('permission');
      if (tenantId) {
        qb.andWhere('permission.tenant_id = :_tenantId', { _tenantId: tenantId });
      }
      qb.orderBy('permission.sort', 'ASC');
      const allPermissions = await qb.getMany();

      // 手动构建权限树
      const permMap = new Map<number, any>();
      const roots: any[] = [];
      allPermissions.forEach((p: any) => {
        permMap.set(p.id, { ...p, children: [] });
      });
      allPermissions.forEach((p: any) => {
        const node = permMap.get(p.id)!;
        if (p.parentId && permMap.has(p.parentId)) {
          permMap.get(p.parentId)!.children.push(node);
        } else {
          roots.push(node);
        }
      });

      res.json({
        success: true,
        data: roots
      });
    } catch (error) {
      log.error('获取权限树失败:', error);
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

      const tenantId = this.getTenantId();
      if (tenantId) {
        queryBuilder.andWhere('permission.tenant_id = :_tenantId', { _tenantId: tenantId });
      }

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
      log.error('获取权限列表失败:', error);
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
      const tenantId = this.getTenantId();
      const existingWhere: any = { code };
      if (tenantId) {
        existingWhere.tenantId = tenantId;
      }
      const existingPermission = await this.permissionRepository.findOne({
        where: existingWhere
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
        const parentWhere: any = { id: parentId };
        if (tenantId) {
          parentWhere.tenantId = tenantId;
        }
        const foundParent = await this.permissionRepository.findOne({
          where: parentWhere
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

      if (tenantId) {
        permissionData.tenantId = tenantId;
      }

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
      log.error('创建权限失败:', error);
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

      const tenantId = this.getTenantId();
      const findWhere: any = { id: Number(id) };
      if (tenantId) {
        findWhere.tenantId = tenantId;
      }
      const permission = await this.permissionRepository.findOne({
        where: findWhere
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }

      // 检查编码是否与其他权限冲突
      if (code && code !== permission.code) {
        const codeWhere: any = { code };
        if (tenantId) {
          codeWhere.tenantId = tenantId;
        }
        const existingPermission = await this.permissionRepository.findOne({ where: codeWhere });
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
          const parentWhere: any = { id: parentId };
          if (tenantId) {
            parentWhere.tenantId = tenantId;
          }
          const parent = await this.permissionRepository.findOne({
            where: parentWhere
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
      log.error('更新权限失败:', error);
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

      const tenantId = this.getTenantId();
      const findWhere: any = { id: Number(id) };
      if (tenantId) {
        findWhere.tenantId = tenantId;
      }
      const permission = await this.permissionRepository.findOne({
        where: findWhere
      });

      if (!permission) {
        return res.status(404).json({
          success: false,
          message: '权限不存在'
        });
      }

      // 检查是否有子权限
      const childWhere: any = { parentId: permission.id };
      if (tenantId) {
        childWhere.tenantId = tenantId;
      }
      const children = await this.permissionRepository.find({ where: childWhere });
      if (children.length > 0) {
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
      log.error('删除权限失败:', error);
      res.status(500).json({
        success: false,
        message: '删除权限失败'
      });
    }
  }
}
