"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const database_1 = require("../config/database");
const Role_1 = require("../entities/Role");
const Permission_1 = require("../entities/Permission");
class RoleController {
    get roleRepository() {
        const dataSource = (0, database_1.getDataSource)();
        if (!dataSource) {
            throw new Error('数据库连接未初始化');
        }
        return dataSource.getRepository(Role_1.Role);
    }
    get permissionRepository() {
        const dataSource = (0, database_1.getDataSource)();
        if (!dataSource) {
            throw new Error('数据库连接未初始化');
        }
        return dataSource.getTreeRepository(Permission_1.Permission);
    }
    // 获取角色列表
    async getRoles(req, res) {
        try {
            const { page = 1, limit = 20, search, status } = req.query;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            // 构建WHERE条件
            const conditions = [];
            const params = [];
            if (search) {
                conditions.push('(name LIKE ? OR code LIKE ?)');
                params.push(`%${search}%`, `%${search}%`);
            }
            if (status) {
                conditions.push('status = ?');
                params.push(status);
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
            const offset = (Number(page) - 1) * Number(limit);
            // 查询角色列表
            const roles = await dataSource.query(`SELECT id, name, code, description, status, level, color, permissions, created_at as createdAt, updated_at as updatedAt
         FROM roles ${whereClause} ORDER BY level ASC, created_at DESC LIMIT ? OFFSET ?`, [...params, Number(limit), offset]);
            // 查询总数
            const countResult = await dataSource.query(`SELECT COUNT(*) as total FROM roles ${whereClause}`, params);
            const total = parseInt(countResult[0]?.total || '0', 10);
            // 计算每个角色的用户数量和权限数量
            const rolesWithCounts = await Promise.all(roles.map(async (role) => {
                let userCount = 0;
                try {
                    const result = await dataSource.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [role.code]);
                    userCount = parseInt(result[0]?.count || '0', 10);
                }
                catch (err) {
                    console.warn(`查询角色 ${role.code} 用户数量失败:`, err);
                }
                // 解析permissions JSON字段
                let permissions = [];
                try {
                    if (role.permissions) {
                        permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                    }
                }
                catch {
                    permissions = [];
                }
                const permissionCount = Array.isArray(permissions) ? permissions.length : 0;
                return {
                    ...role,
                    permissions,
                    userCount,
                    permissionCount
                };
            }));
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
        }
        catch (error) {
            console.error('获取角色列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取角色列表失败'
            });
        }
    }
    // 获取角色详情
    async getRoleById(req, res) {
        try {
            const { id } = req.params;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            const roles = await dataSource.query('SELECT id, name, code, description, status, level, color, permissions, created_at as createdAt, updated_at as updatedAt FROM roles WHERE id = ?', [id]);
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
                const result = await dataSource.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [role.code]);
                userCount = parseInt(result[0]?.count || '0', 10);
            }
            catch (err) {
                console.warn(`查询角色 ${role.code} 用户数量失败:`, err);
            }
            // 解析permissions
            let permissions = [];
            try {
                if (role.permissions) {
                    permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                }
            }
            catch {
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
        }
        catch (error) {
            console.error('获取角色详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取角色详情失败'
            });
        }
    }
    // 创建角色
    async createRole(req, res) {
        try {
            const { name, code, description, status = 'active', level = 0, color, permissions = [] } = req.body;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            // 检查角色名称和编码是否已存在
            const existing = await dataSource.query('SELECT id FROM roles WHERE name = ? OR code = ?', [name, code]);
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
            await dataSource.query(`INSERT INTO roles (id, name, code, description, status, level, color, permissions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`, [roleId, name, code, description || '', status, level, color || '', JSON.stringify(permissions)]);
            res.status(201).json({
                success: true,
                data: { id: roleId, name, code, description, status, level, color, permissions },
                message: '角色创建成功'
            });
        }
        catch (error) {
            console.error('创建角色失败:', error);
            res.status(500).json({
                success: false,
                message: '创建角色失败'
            });
        }
    }
    // 获取角色模板列表（返回空数组，模板功能已移除）
    async getRoleTemplates(_req, res) {
        res.json({
            success: true,
            data: []
        });
    }
    // 从模板创建角色（模板功能已移除）
    async createRoleFromTemplate(_req, res) {
        res.status(400).json({
            success: false,
            message: '模板功能已移除'
        });
    }
    // 更新角色
    async updateRole(req, res) {
        try {
            const { id } = req.params;
            const { name, code, description, status, level, color, permissions } = req.body;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            // 检查角色是否存在
            const existing = await dataSource.query('SELECT id, code FROM roles WHERE id = ?', [id]);
            if (existing.length === 0) {
                res.status(404).json({
                    success: false,
                    message: '角色不存在'
                });
                return;
            }
            // 构建更新语句
            const updates = [];
            const params = [];
            if (name !== undefined) {
                updates.push('name = ?');
                params.push(name);
            }
            if (code !== undefined) {
                updates.push('code = ?');
                params.push(code);
            }
            if (description !== undefined) {
                updates.push('description = ?');
                params.push(description);
            }
            if (status !== undefined) {
                updates.push('status = ?');
                params.push(status);
            }
            if (level !== undefined) {
                updates.push('level = ?');
                params.push(level);
            }
            if (color !== undefined) {
                updates.push('color = ?');
                params.push(color);
            }
            if (permissions !== undefined) {
                updates.push('permissions = ?');
                params.push(JSON.stringify(permissions));
            }
            if (updates.length > 0) {
                updates.push('updated_at = NOW()');
                params.push(id);
                await dataSource.query(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?`, params);
            }
            res.json({
                success: true,
                message: '角色更新成功'
            });
        }
        catch (error) {
            console.error('更新角色失败:', error);
            res.status(500).json({
                success: false,
                message: '更新角色失败'
            });
        }
    }
    // 删除角色
    async deleteRole(req, res) {
        try {
            const { id } = req.params;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            // 检查角色是否存在
            const roles = await dataSource.query('SELECT id, code FROM roles WHERE id = ?', [id]);
            if (roles.length === 0) {
                res.status(404).json({
                    success: false,
                    message: '角色不存在'
                });
                return;
            }
            const role = roles[0];
            // 检查是否有用户使用此角色
            const userResult = await dataSource.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [role.code]);
            const usersWithRole = parseInt(userResult[0]?.count || '0', 10);
            if (usersWithRole > 0) {
                res.status(400).json({
                    success: false,
                    message: `该角色下还有${usersWithRole}个用户，无法删除`
                });
                return;
            }
            await dataSource.query('DELETE FROM roles WHERE id = ?', [id]);
            res.json({
                success: true,
                message: '角色删除成功'
            });
        }
        catch (error) {
            console.error('删除角色失败:', error);
            res.status(500).json({
                success: false,
                message: '删除角色失败'
            });
        }
    }
    // 获取角色统计
    async getRoleStats(_req, res) {
        try {
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            const totalResult = await dataSource.query('SELECT COUNT(*) as count FROM roles');
            const activeResult = await dataSource.query("SELECT COUNT(*) as count FROM roles WHERE status = 'active'");
            const permResult = await dataSource.query('SELECT COUNT(*) as count FROM permissions');
            res.json({
                success: true,
                data: {
                    total: parseInt(totalResult[0]?.count || '0', 10),
                    active: parseInt(activeResult[0]?.count || '0', 10),
                    permissions: parseInt(permResult[0]?.count || '0', 10)
                }
            });
        }
        catch (error) {
            console.error('获取角色统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取角色统计失败'
            });
        }
    }
    // 更新角色状态
    async updateRoleStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const dataSource = (0, database_1.getDataSource)();
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
            const roles = await dataSource.query('SELECT id, code FROM roles WHERE id = ?', [id]);
            if (roles.length === 0) {
                res.status(404).json({
                    success: false,
                    message: '角色不存在'
                });
                return;
            }
            const role = roles[0];
            // 防止禁用系统预设角色
            const nonDisableableRoles = ['super_admin', 'admin'];
            if (status === 'inactive' && nonDisableableRoles.includes(role.code)) {
                res.status(400).json({
                    success: false,
                    message: '系统预设角色不可禁用'
                });
                return;
            }
            await dataSource.query('UPDATE roles SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
            res.json({
                success: true,
                message: `角色已${status === 'active' ? '启用' : '禁用'}`
            });
        }
        catch (error) {
            console.error('更新角色状态失败:', error);
            res.status(500).json({
                success: false,
                message: '更新角色状态失败'
            });
        }
    }
    // 获取角色权限
    async getRolePermissions(req, res) {
        try {
            const { id } = req.params;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            const roles = await dataSource.query('SELECT id, name, permissions FROM roles WHERE id = ?', [id]);
            if (roles.length === 0) {
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
            const role = roles[0];
            let permissions = [];
            try {
                if (role.permissions) {
                    permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
                }
            }
            catch {
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
        }
        catch (error) {
            console.error('获取角色权限失败:', error);
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
    // 更新角色权限
    async updateRolePermissions(req, res) {
        try {
            const { id } = req.params;
            const { permissions, permissionIds } = req.body;
            const dataSource = (0, database_1.getDataSource)();
            if (!dataSource) {
                throw new Error('数据库连接未初始化');
            }
            const roles = await dataSource.query('SELECT id, name FROM roles WHERE id = ?', [id]);
            if (roles.length === 0) {
                res.status(404).json({
                    success: false,
                    message: '角色不存在'
                });
                return;
            }
            const newPermissions = permissions || permissionIds || [];
            await dataSource.query('UPDATE roles SET permissions = ?, updated_at = NOW() WHERE id = ?', [JSON.stringify(newPermissions), id]);
            res.json({
                success: true,
                data: {
                    roleId: id,
                    roleName: roles[0].name,
                    permissions: newPermissions
                },
                message: '权限更新成功'
            });
        }
        catch (error) {
            console.error('更新角色权限失败:', error);
            res.status(500).json({
                success: false,
                message: '更新角色权限失败'
            });
        }
    }
}
exports.RoleController = RoleController;
//# sourceMappingURL=RoleController.js.map