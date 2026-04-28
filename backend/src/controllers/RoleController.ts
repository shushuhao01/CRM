import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { Permission } from '../entities/Permission';
import { Repository, TreeRepository } from 'typeorm';
import { getTenantRepo } from '../utils/tenantRepo';
import { tenantRawSQL, getCurrentTenantIdSafe } from '../utils/tenantHelpers';

import { log } from '../config/logger';
export class RoleController {
  private get roleRepository(): Repository<Role> {
    return getTenantRepo(Role);
  }

  private get permissionRepository(): TreeRepository<Permission> {
    const dataSource = getDataSource();
    if (!dataSource) {
      throw new Error('数据库连接未初始化');
    }
    return dataSource.getTreeRepository(Permission);
  }

  /**
   * 按租户优先查找角色：优先匹配当前租户的角色，没有则回退到任意匹配
   * 实现租户隔离：每个租户可以有自己的角色副本
   */
  private async findRoleWithTenantPriority(
    dataSource: any, field: 'id' | 'code', value: string, columns: string = '*'
  ): Promise<any | null> {
    const tenantId = getCurrentTenantIdSafe();
    if (tenantId) {
      // 优先查找当前租户的角色
      const tenantRoles = await dataSource.query(
        `SELECT ${columns} FROM roles WHERE ${field} = ? AND tenant_id = ?`, [value, tenantId]
      );
      if (tenantRoles.length > 0) return tenantRoles[0];
    }
    // 回退：查找任意匹配（兼容默认共享角色）
    const roles = await dataSource.query(
      `SELECT ${columns} FROM roles WHERE ${field} = ? LIMIT 1`, [value]
    );
    return roles.length > 0 ? roles[0] : null;
  }

  /**
   * 写时克隆：如果当前租户没有该角色的专属副本，从默认角色克隆一份
   * 返回当前租户专属角色的 id
   */
  private async ensureTenantRole(dataSource: any, roleId: string): Promise<{ id: string; name: string; cloned: boolean }> {
    const tenantId = getCurrentTenantIdSafe();
    if (!tenantId) {
      // 非SaaS模式或无租户上下文，直接使用原角色
      const role = await dataSource.query('SELECT id, name FROM roles WHERE id = ?', [roleId]);
      if (role.length === 0) throw new Error('角色不存在');
      return { id: role[0].id, name: role[0].name, cloned: false };
    }

    // 检查当前租户是否已有此角色的专属副本（按code匹配）
    const sourceRole = await dataSource.query(
      'SELECT id, name, code, description, level, color, data_scope, permissions, status FROM roles WHERE id = ?', [roleId]
    );
    if (sourceRole.length === 0) throw new Error('角色不存在');

    const roleCode = sourceRole[0].code;
    const tenantRole = await dataSource.query(
      'SELECT id, name FROM roles WHERE code = ? AND tenant_id = ?', [roleCode, tenantId]
    );
    if (tenantRole.length > 0) {
      return { id: tenantRole[0].id, name: tenantRole[0].name, cloned: false };
    }

    // 租户没有此角色副本，克隆一份（仅克隆当前共享角色的权限，不是全部权限）
    const newRoleId = `${roleCode}_${tenantId.substring(0, 8)}`;
    const src = sourceRole[0];
    const srcPermissions = typeof src.permissions === 'string' ? src.permissions : JSON.stringify(src.permissions || []);
    let srcPermCount = 0;
    try {
      const parsed = typeof src.permissions === 'string' ? JSON.parse(src.permissions) : (src.permissions || []);
      srcPermCount = Array.isArray(parsed) ? parsed.length : 0;
    } catch { srcPermCount = 0; }
    log.info(`[RoleController] 开始克隆角色: source=${roleId}(code=${roleCode}), 源权限数=${srcPermCount}, 目标=${newRoleId}, tenant=${tenantId}`);
    await dataSource.query(
      `INSERT INTO roles (id, tenant_id, name, code, description, level, color, data_scope, permissions, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [newRoleId, tenantId, src.name, src.code, src.description || '', src.level || 0, src.color || '',
       src.data_scope || 'self', srcPermissions,
       src.status || 'active']
    );
    log.info(`[RoleController] ✅ 克隆角色完成: ${roleCode} -> ${newRoleId}, 克隆权限数=${srcPermCount}`);
    return { id: newRoleId, name: src.name, cloned: true };
  }

  // 获取角色列表
  async getRoles(req: Request, res: Response) {
    try {
      const { page = 1, limit = 20, search, status } = req.query;

      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      // 构建WHERE条件
      const conditions: string[] = [];
      const params: any[] = [];

      if (search) {
        conditions.push('(name LIKE ? OR code LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }

      if (status) {
        conditions.push('status = ?');
        params.push(status);
      }

      // 租户隔离：优先显示当前租户角色，没有租户副本的显示共享默认角色
      const tenantId = getCurrentTenantIdSafe();
      if (tenantId) {
        // 显示当前租户专属角色 + 没有租户副本的共享角色（按code去重，租户优先）
        conditions.push('(tenant_id = ? OR code NOT IN (SELECT code FROM roles WHERE tenant_id = ?))');
        params.push(tenantId, tenantId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (Number(page) - 1) * Number(limit);

      // 查询角色列表（按 tenant_id 排序，确保租户专属在前）
      const allRoles = await dataSource.query(
        `SELECT id, name, code, description, status, level, color, permissions, data_scope as dataScope, createdAt, updatedAt, tenant_id
         FROM roles ${whereClause} ORDER BY CASE WHEN tenant_id = ? THEN 0 ELSE 1 END, level ASC, createdAt DESC`,
        [...params, tenantId || '']
      );

      // 按 code 去重（租户专属优先）
      const seenCodes = new Set<string>();
      const roles: any[] = [];
      for (const role of allRoles) {
        if (!seenCodes.has(role.code)) {
          seenCodes.add(role.code);
          roles.push(role);
        }
      }

      // 分页
      const total = roles.length;
      const pagedRoles = roles.slice(offset, offset + Number(limit));

      // 计算每个角色的用户数量和权限数量
      const rolesWithCounts = await Promise.all(
        pagedRoles.map(async (role: any) => {
          let userCount = 0;
          try {
            const tUser = tenantRawSQL();
            const result = await dataSource.query(
              'SELECT COUNT(*) as count FROM users WHERE role_id = ?' + tUser.sql,
              [role.code, ...tUser.params]
            );
            userCount = parseInt(result[0]?.count || '0', 10);
          } catch (err) {
            log.warn(`查询角色 ${role.code} 用户数量失败:`, err);
          }

          // 解析permissions JSON字段
          let permissions: string[] = [];
          try {
            if (role.permissions) {
              permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
            }
          } catch {
            permissions = [];
          }
          const permissionCount = Array.isArray(permissions) ? permissions.length : 0;

          return {
            ...role,
            permissions,
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
      log.error('获取角色列表失败:', error);
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
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      const t = tenantRawSQL();
      const roles = await dataSource.query(
        'SELECT id, name, code, description, status, level, color, permissions, data_scope as dataScope, createdAt, updatedAt FROM roles WHERE id = ?' + t.sql,
        [id, ...t.params]
      );

      if (roles.length === 0) {
        res.status(404).json({
          success: false,
          message: '角色不存在'
        });
        return;
      }

      const role = roles[0];

      // 获取该角色的用户数量
      let userCount = 0;
      try {
        const tUser = tenantRawSQL();
        const result = await dataSource.query(
          'SELECT COUNT(*) as count FROM users WHERE role_id = ?' + tUser.sql,
          [role.code, ...tUser.params]
        );
        userCount = parseInt(result[0]?.count || '0', 10);
      } catch (err) {
        log.warn(`查询角色 ${role.code} 用户数量失败:`, err);
      }

      // 解析permissions
      let permissions: string[] = [];
      try {
        if (role.permissions) {
          permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
        }
      } catch {
        permissions = [];
      }

      res.json({
        success: true,
        data: {
          ...role,
          permissions,
          userCount,
          permissionCount: permissions.length
        }
      });
    } catch (error) {
      log.error('获取角色详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取角色详情失败'
      });
    }
  }

  // 创建角色
  async createRole(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, description, status = 'active', level = 0, color, permissions = [], dataScope = 'self' } = req.body;
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      // 检查角色名称和编码是否已存在
      const t = tenantRawSQL();
      const existing = await dataSource.query(
        'SELECT id FROM roles WHERE (name = ? OR code = ?)' + t.sql,
        [name, code, ...t.params]
      );

      if (existing.length > 0) {
        res.status(400).json({
          success: false,
          message: '角色名称或编码已存在'
        });
        return;
      }

      // 生成角色ID
      const roleId = `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // 插入角色
      const tenantId = getCurrentTenantIdSafe() || null;
      await dataSource.query(
        `INSERT INTO roles (id, tenant_id, name, code, description, status, level, color, permissions, data_scope, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [roleId, tenantId, name, code, description || '', status, level, color || '', JSON.stringify(permissions), dataScope]
      );

      res.status(201).json({
        success: true,
        data: { id: roleId, name, code, description, status, level, color, permissions, dataScope },
        message: '角色创建成功'
      });
    } catch (error) {
      log.error('创建角色失败:', error);
      res.status(500).json({
        success: false,
        message: '创建角色失败'
      });
    }
  }

  // 获取角色模板列表（返回空数组，模板功能已移除）
  async getRoleTemplates(_req: Request, res: Response) {
    res.json({
      success: true,
      data: []
    });
  }

  // 从模板创建角色（模板功能已移除）
  async createRoleFromTemplate(_req: Request, res: Response): Promise<void> {
    res.status(400).json({
      success: false,
      message: '模板功能已移除'
    });
  }

  // 更新角色（写时克隆）
  async updateRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code, description, status, level, color, permissions, dataScope } = req.body;
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      // 写时克隆：确保当前租户有自己的角色副本
      let tenantRole: { id: string; name: string; cloned: boolean };
      try {
        tenantRole = await this.ensureTenantRole(dataSource, id);
      } catch (err: any) {
        res.status(404).json({ success: false, message: err.message || '角色不存在' });
        return;
      }

      // 构建更新语句
      const updates: string[] = [];
      const params: any[] = [];

      if (name !== undefined) { updates.push('name = ?'); params.push(name); }
      if (code !== undefined) { updates.push('code = ?'); params.push(code); }
      if (description !== undefined) { updates.push('description = ?'); params.push(description); }
      if (status !== undefined) { updates.push('status = ?'); params.push(status); }
      if (level !== undefined) { updates.push('level = ?'); params.push(level); }
      if (color !== undefined) { updates.push('color = ?'); params.push(color); }
      if (permissions !== undefined) { updates.push('permissions = ?'); params.push(JSON.stringify(permissions)); }
      if (dataScope !== undefined) { updates.push('data_scope = ?'); params.push(dataScope); }

      if (updates.length > 0) {
        updates.push('updatedAt = NOW()');
        params.push(tenantRole.id);
        await dataSource.query(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);
      }

      res.json({
        success: true,
        message: '角色更新成功'
      });
    } catch (error) {
      log.error('更新角色失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色失败'
      });
    }
  }

  // 删除角色（只删除当前租户的角色副本）
  async deleteRole(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      const role = await this.findRoleWithTenantPriority(dataSource, 'id', id, 'id, code, tenant_id');
      if (!role) {
        res.status(404).json({ success: false, message: '角色不存在' });
        return;
      }

      // 检查是否有用户使用此角色
      const tUser = tenantRawSQL();
      const userResult = await dataSource.query(
        'SELECT COUNT(*) as count FROM users WHERE role_id = ?' + tUser.sql,
        [role.code, ...tUser.params]
      );
      const usersWithRole = parseInt(userResult[0]?.count || '0', 10);

      if (usersWithRole > 0) {
        res.status(400).json({
          success: false,
          message: `该角色下还有${usersWithRole}个用户，无法删除`
        });
        return;
      }

      await dataSource.query('DELETE FROM roles WHERE id = ?', [role.id]);

      res.json({
        success: true,
        message: '角色删除成功'
      });
    } catch (error) {
      log.error('删除角色失败:', error);
      res.status(500).json({
        success: false,
        message: '删除角色失败'
      });
    }
  }

  // 获取角色统计
  async getRoleStats(_req: Request, res: Response) {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      const t = tenantRawSQL();
      const totalResult = await dataSource.query('SELECT COUNT(*) as count FROM roles WHERE 1=1' + t.sql, [...t.params]);
      const activeResult = await dataSource.query("SELECT COUNT(*) as count FROM roles WHERE status = 'active'" + t.sql, [...t.params]);
      const permResult = await dataSource.query('SELECT COUNT(*) as count FROM permissions WHERE 1=1' + t.sql, [...t.params]);

      res.json({
        success: true,
        data: {
          total: parseInt(totalResult[0]?.count || '0', 10),
          active: parseInt(activeResult[0]?.count || '0', 10),
          permissions: parseInt(permResult[0]?.count || '0', 10)
        }
      });
    } catch (error) {
      log.error('获取角色统计失败:', error);
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
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      if (!['active', 'inactive'].includes(status)) {
        res.status(400).json({
          success: false,
          message: '无效的状态值'
        });
        return;
      }

      // 写时克隆：确保当前租户有自己的角色副本
      let tenantRole: { id: string; name: string; cloned: boolean };
      try {
        tenantRole = await this.ensureTenantRole(dataSource, id);
      } catch (err: any) {
        res.status(404).json({ success: false, message: err.message || '角色不存在' });
        return;
      }

      // 获取角色code用于系统角色检查
      const roleData = await dataSource.query('SELECT code FROM roles WHERE id = ?', [tenantRole.id]);
      const roleCode = roleData[0]?.code || '';

      // 防止禁用系统预设角色
      const nonDisableableRoles = ['super_admin', 'admin'];
      if (status === 'inactive' && nonDisableableRoles.includes(roleCode)) {
        res.status(400).json({
          success: false,
          message: '系统预设角色不可禁用'
        });
        return;
      }

      await dataSource.query('UPDATE roles SET status = ?, updatedAt = NOW() WHERE id = ?', [status, tenantRole.id]);

      res.json({
        success: true,
        message: `角色已${status === 'active' ? '启用' : '禁用'}`
      });
    } catch (error) {
      log.error('更新角色状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色状态失败'
      });
    }
  }

  // 获取角色权限（租户优先：先查当前租户专属角色，没有则回退到共享角色）
  async getRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      // 按租户优先查找角色
      const role = await this.findRoleWithTenantPriority(dataSource, 'id', id, 'id, name, permissions');

      if (!role) {
        res.json({
          success: true,
          data: {
            roleId: id,
            roleName: 'default',
            permissions: []
          }
        });
        return;
      }

      let permissions: string[] = [];
      try {
        if (role.permissions) {
          permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
        }
      } catch {
        permissions = [];
      }

      res.json({
        success: true,
        data: {
          roleId: role.id,
          roleName: role.name,
          permissions
        }
      });
    } catch (error) {
      log.error('获取角色权限失败:', error);
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

  // 更新角色权限（写时克隆：租户没有专属角色时自动克隆，确保修改不影响其他租户）
  async updateRolePermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions, permissionIds } = req.body;
      const dataSource = getDataSource();
      if (!dataSource) {
        throw new Error('数据库连接未初始化');
      }

      // 写时克隆：确保当前租户有自己的角色副本
      let tenantRole: { id: string; name: string; cloned: boolean };
      try {
        tenantRole = await this.ensureTenantRole(dataSource, id);
      } catch (err: any) {
        res.status(404).json({
          success: false,
          message: err.message || '角色不存在'
        });
        return;
      }

      const newPermissions = permissions || permissionIds || [];
      log.info(`[updateRolePermissions] 更新角色权限: roleId=${tenantRole.id}, cloned=${tenantRole.cloned}, 新权限数=${newPermissions.length}`);
      await dataSource.query(
        'UPDATE roles SET permissions = ?, updatedAt = NOW() WHERE id = ?',
        [JSON.stringify(newPermissions), tenantRole.id]
      );

      if (tenantRole.cloned) {
        log.info(`[updateRolePermissions] ✅ 已为租户克隆角色 ${id} -> ${tenantRole.id}，并更新权限(${newPermissions.length}个)`);
      }

      res.json({
        success: true,
        data: {
          roleId: tenantRole.id,
          roleName: tenantRole.name,
          permissions: newPermissions
        },
        message: '权限更新成功'
      });
    } catch (error) {
      log.error('更新角色权限失败:', error);
      res.status(500).json({
        success: false,
        message: '更新角色权限失败'
      });
    }
  }
}
