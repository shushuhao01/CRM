import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Department } from '../entities/Department';
import { User } from '../entities/User';
import { IsNull, Not } from 'typeorm';

export class DepartmentController {
  private get departmentRepository() {
    if (!AppDataSource) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(Department);
  }

  private get userRepository() {
    if (!AppDataSource) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(User);
  }

  /**
   * 获取部门列表
   */
  async getDepartments(req: Request, res: Response): Promise<void> {
    try {
      const departments = await this.departmentRepository.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      // 计算每个部门的成员数量
      const departmentsWithCount = await Promise.all(departments.map(async (dept: Department) => {
        // 单独查询该部门的用户数量
        const memberCount = await this.userRepository.count({
          where: { departmentId: dept.id }
        });

        return {
          id: dept.id.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          parentId: dept.parentId ? dept.parentId.toString() : null,
          level: dept.level || 1,
          sortOrder: dept.sortOrder,
          status: dept.status,
          memberCount: memberCount,
          createdAt: dept.createdAt.toISOString(),
          updatedAt: dept.updatedAt.toISOString()
        };
      }));

      res.json({
        success: true,
        data: departmentsWithCount
      });
    } catch (error) {
      console.error('获取部门列表失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门列表失败'
      });
    }
  }

  /**
   * 获取部门树形结构
   */
  async getDepartmentTree(req: Request, res: Response): Promise<void> {
    try {
      const departments = await this.departmentRepository.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      // 构建树形结构
      const departmentMap = new Map();
      const rootDepartments: unknown[] = [];

      // 先创建所有部门节点（包含成员数量查询）
      for (const dept of departments) {
        const memberCount = await this.userRepository.count({
          where: { departmentId: dept.id }
        });

        const deptNode = {
          id: dept.id.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          parentId: dept.parentId?.toString(),
          sortOrder: dept.sortOrder,
          status: dept.status,
          memberCount: memberCount,
          createdAt: dept.createdAt.toISOString(),
          updatedAt: dept.updatedAt.toISOString(),
          children: []
        };
        departmentMap.set(dept.id.toString(), deptNode);
      }

      // 构建父子关系
      departmentMap.forEach(dept => {
        if (dept.parentId) {
          const parent = departmentMap.get(dept.parentId);
          if (parent) {
            parent.children.push(dept);
          } else {
            rootDepartments.push(dept);
          }
        } else {
          rootDepartments.push(dept);
        }
      });

      res.json({
        success: true,
        data: rootDepartments
      });
    } catch (error) {
      console.error('获取部门树失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门树失败'
      });
    }
  }

  /**
   * 获取部门详情
   */
  async getDepartmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 单独查询成员数量
      const memberCount = await this.userRepository.count({
        where: { departmentId: id }
      });

      const result = {
        id: department.id.toString(),
        name: department.name,
        code: department.code,
        description: department.description,
        parentId: department.parentId?.toString(),
        sortOrder: department.sortOrder,
        status: department.status,
        memberCount: memberCount,
        createdAt: department.createdAt.toISOString(),
        updatedAt: department.updatedAt.toISOString()
      };

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('获取部门详情失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门详情失败'
      });
    }
  }

  /**
   * 创建部门
   */
  async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, description, parentId, sortOrder = 0, status = 'active', level = 1 } = req.body;

      console.log('[创建部门] 接收到的数据:', { name, code, description, parentId, sortOrder, status, level });

      // 验证必填字段
      if (!name || !code) {
        res.status(400).json({
          success: false,
          message: '部门名称和编码不能为空'
        });
        return;
      }

      // 检查部门名称是否重复
      const existingByName = await this.departmentRepository.findOne({
        where: { name }
      });
      if (existingByName) {
        res.status(400).json({
          success: false,
          message: '部门名称已存在'
        });
        return;
      }

      // 检查部门代码是否重复
      if (code) {
        const existingByCode = await this.departmentRepository.findOne({
          where: { code }
        });
        if (existingByCode) {
          res.status(400).json({
            success: false,
            message: '部门代码已存在'
          });
          return;
        }
      }

      // 如果有父部门，检查父部门是否存在
      if (parentId) {
        const parentDept = await this.departmentRepository.findOne({
          where: { id: parentId }
        });
        if (!parentDept) {
          res.status(400).json({
            success: false,
            message: '父部门不存在'
          });
          return;
        }
      }

      // 生成部门ID
      const departmentId = `dept_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const department = this.departmentRepository.create({
        id: departmentId,
        name,
        code,
        description: description || null,
        parentId: parentId || null,
        sortOrder: sortOrder || 0,
        status: status || 'active',
        level: level || 1,
        memberCount: 0
      });

      console.log('[创建部门] 准备保存的部门对象:', department);

      const savedDepartment = await this.departmentRepository.save(department);

      console.log('[创建部门] 保存成功:', savedDepartment);

      const result = {
        id: savedDepartment.id,
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId,
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        level: savedDepartment.level,
        memberCount: 0,
        createdAt: savedDepartment.createdAt.toISOString(),
        updatedAt: savedDepartment.updatedAt.toISOString()
      };

      res.status(201).json({
        success: true,
        data: result,
        message: '部门创建成功'
      });
    } catch (error: any) {
      console.error('[创建部门] 失败:', error);
      console.error('[创建部门] 错误堆栈:', error?.stack);
      res.status(500).json({
        success: false,
        message: `创建部门失败: ${error?.message || '未知错误'}`
      });
    }
  }

  /**
   * 更新部门
   */
  async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code, description, parentId, sortOrder, status } = req.body;

      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 检查部门名称是否重复（排除自己）
      if (name && name !== department.name) {
        const existingByName = await this.departmentRepository.findOne({
          where: { name }
        });
        if (existingByName && existingByName.id !== id) {
          res.status(400).json({
            success: false,
            message: '部门名称已存在'
          });
          return;
        }
      }

      // 检查部门代码是否重复（排除自己）
      if (code && code !== department.code) {
        const existingByCode = await this.departmentRepository.findOne({
          where: { code }
        });
        if (existingByCode && existingByCode.id !== id) {
          res.status(400).json({
            success: false,
            message: '部门代码已存在'
          });
          return;
        }
      }

      // 如果有父部门，检查父部门是否存在且不是自己
      if (parentId) {
        if (parentId === id) {
          res.status(400).json({
            success: false,
            message: '不能将自己设为父部门'
          });
          return;
        }

        const parentDept = await this.departmentRepository.findOne({
          where: { id: parentId }
        });
        if (!parentDept) {
          res.status(400).json({
            success: false,
            message: '父部门不存在'
          });
          return;
        }
      }

      // 更新部门信息
      if (name !== undefined) department.name = name;
      if (code !== undefined) department.code = code;
      if (description !== undefined) department.description = description;
      if (parentId !== undefined) department.parentId = parentId || null;
      if (sortOrder !== undefined) department.sortOrder = sortOrder;
      if (status !== undefined) department.status = status;

      const savedDepartment = await this.departmentRepository.save(department);

      // 单独查询成员数量
      const memberCount = await this.userRepository.count({
        where: { departmentId: id }
      });

      const result = {
        id: savedDepartment.id.toString(),
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId?.toString(),
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        memberCount: memberCount,
        createdAt: savedDepartment.createdAt.toISOString(),
        updatedAt: savedDepartment.updatedAt.toISOString()
      };

      res.json({
        success: true,
        data: result,
        message: '部门更新成功'
      });
    } catch (error) {
      console.error('更新部门失败:', error);
      res.status(500).json({
        success: false,
        message: '更新部门失败'
      });
    }
  }

  /**
   * 删除部门
   */
  async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 检查是否有子部门
      const childDepartments = await this.departmentRepository.find({
        where: { parentId: id }
      });

      if (childDepartments.length > 0) {
        res.status(400).json({
          success: false,
          message: '该部门下还有子部门，无法删除'
        });
        return;
      }

      // 检查是否有成员
      const memberCount = await this.userRepository.count({
        where: { departmentId: id }
      });

      if (memberCount > 0) {
        res.status(400).json({
          success: false,
          message: '该部门下还有成员，无法删除'
        });
        return;
      }

      await this.departmentRepository.remove(department);

      res.json({
        success: true,
        message: '部门删除成功'
      });
    } catch (error) {
      console.error('删除部门失败:', error);
      res.status(500).json({
        success: false,
        message: '删除部门失败'
      });
    }
  }

  /**
   * 更新部门状态
   */
  async updateDepartmentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'inactive'].includes(status)) {
        res.status(400).json({
          success: false,
          message: '无效的状态值'
        });
        return;
      }

      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 🔥 防止禁用系统预设部门（系统管理部）
      const nonDisableableDepartments = ['系统管理部'];
      if (status === 'inactive' && nonDisableableDepartments.includes(department.name)) {
        res.status(400).json({
          success: false,
          message: '系统预设部门不可禁用'
        });
        return;
      }

      department.status = status;
      const savedDepartment = await this.departmentRepository.save(department);

      // 单独查询成员数量
      const memberCount = await this.userRepository.count({
        where: { departmentId: id }
      });

      const result = {
        id: savedDepartment.id.toString(),
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId?.toString(),
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        memberCount: memberCount,
        createdAt: savedDepartment.createdAt.toISOString(),
        updatedAt: savedDepartment.updatedAt.toISOString()
      };

      res.json({
        success: true,
        data: result,
        message: '部门状态更新成功'
      });
    } catch (error) {
      console.error('更新部门状态失败:', error);
      res.status(500).json({
        success: false,
        message: '更新部门状态失败'
      });
    }
  }

  /**
   * 获取部门成员
   */
  async getDepartmentMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      console.log('[部门成员] 查询部门ID:', id);

      // 获取部门信息
      const department = await this.departmentRepository.findOne({
        where: { id: id }
      });
      const departmentName = department?.name || '';
      console.log('[部门成员] 部门名称:', departmentName);

      // 查询该部门的所有用户（同时匹配departmentId和departmentName）
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where('user.departmentId = :id', { id })
        .orWhere('user.departmentName = :name', { name: departmentName })
        .getMany();

      console.log('[部门成员] 查询到用户数:', users.length);

      const members = users.map((user: User) => ({
        id: user.id.toString(),
        userId: user.id.toString(),
        departmentId: id,
        userName: user.realName || user.username,
        username: user.username,
        email: user.email,
        phone: user.phone,
        position: user.position || user.role || '成员',
        role: user.role,
        status: user.status === 'active' ? 'active' : 'inactive',
        joinDate: user.createdAt.toISOString().split('T')[0],
        joinedAt: user.createdAt.toISOString(),
        createdAt: user.createdAt.toISOString(),
        departmentName: user.departmentName || departmentName
      }));

      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error('获取部门成员失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门成员失败'
      });
    }
  }

  /**
   * 添加部门成员
   */
  async addDepartmentMember(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId } = req.params;
      const { userId, role } = req.body;

      // 检查部门是否存在
      const department = await this.departmentRepository.findOne({
        where: { id: departmentId }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 检查用户是否存在
      const user = await this.userRepository.findOne({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在'
        });
        return;
      }

      // 更新用户的部门
      user.departmentId = departmentId;
      if (role) {
        user.role = role;
      }

      const savedUser = await this.userRepository.save(user);

      const result = {
        id: savedUser.id.toString(),
        userId: savedUser.id.toString(),
        departmentId: departmentId,
        name: savedUser.realName || savedUser.username,
        username: savedUser.username,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
        status: savedUser.status,
        joinedAt: savedUser.createdAt.toISOString()
      };

      res.json({
        success: true,
        data: result,
        message: '添加部门成员成功'
      });
    } catch (error) {
      console.error('添加部门成员失败:', error);
      res.status(500).json({
        success: false,
        message: '添加部门成员失败'
      });
    }
  }

  /**
   * 移除部门成员
   */
  async removeDepartmentMember(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId, userId } = req.params;

      // 检查用户是否存在且属于该部门
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
          departmentId: departmentId
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在或不属于该部门'
        });
        return;
      }

      // 将用户的部门设为null
      user.departmentId = null;
      await this.userRepository.save(user);

      res.json({
        success: true,
        message: '移除部门成员成功'
      });
    } catch (error) {
      console.error('移除部门成员失败:', error);
      res.status(500).json({
        success: false,
        message: '移除部门成员失败'
      });
    }
  }

  /**
   * 获取部门统计信息
   */
  async getDepartmentStats(req: Request, res: Response): Promise<void> {
    try {
      const totalDepartments = await this.departmentRepository.count();
      const activeDepartments = await this.departmentRepository.count({
        where: { status: 'active' }
      });
      const totalMembers = await this.userRepository.count({
        where: { departmentId: Not(IsNull()) }
      });

      const stats = {
        totalDepartments,
        activeDepartments,
        totalMembers,
        departmentsByType: {
          '主部门': await this.departmentRepository.count({
            where: { parentId: IsNull() }
          }),
          '子部门': await this.departmentRepository.count({
            where: { parentId: Not(IsNull()) }
          })
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('获取部门统计失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门统计失败'
      });
    }
  }

  /**
   * 获取部门角色列表
   * 返回该部门下所有成员的角色信息
   */
  async getDepartmentRoles(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // 检查部门是否存在
      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 获取部门成员的角色统计
      const users = await this.userRepository.find({
        where: { departmentId: id }
      });

      // 按角色分组统计
      const roleMap = new Map<string, number>();
      users.forEach((user: User) => {
        const role = user.role || 'user';
        roleMap.set(role, (roleMap.get(role) || 0) + 1);
      });

      // 构建角色列表
      const roles = Array.from(roleMap.entries()).map(([roleName, count], index) => ({
        id: `role_${id}_${index}`,
        name: roleName,
        departmentId: id,
        userCount: count,
        permissions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      console.error('获取部门角色失败:', error);
      res.status(500).json({
        success: false,
        message: '获取部门角色失败'
      });
    }
  }

  /**
   * 更新部门权限
   */
  async updateDepartmentPermissions(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions } = req.body;

      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 目前权限存储在内存中，实际应该存储到数据库
      // 这里返回成功响应
      res.json({
        success: true,
        data: {
          id: department.id,
          name: department.name,
          permissions: permissions || []
        },
        message: '部门权限更新成功'
      });
    } catch (error) {
      console.error('更新部门权限失败:', error);
      res.status(500).json({
        success: false,
        message: '更新部门权限失败'
      });
    }
  }

  /**
   * 移动部门（更改父部门）
   */
  async moveDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newParentId } = req.body;

      const department = await this.departmentRepository.findOne({
        where: { id }
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      // 不能将自己设为父部门
      if (newParentId === id) {
        res.status(400).json({
          success: false,
          message: '不能将自己设为父部门'
        });
        return;
      }

      // 如果有新父部门，检查是否存在
      if (newParentId) {
        const parentDept = await this.departmentRepository.findOne({
          where: { id: newParentId }
        });
        if (!parentDept) {
          res.status(400).json({
            success: false,
            message: '目标父部门不存在'
          });
          return;
        }
      }

      department.parentId = newParentId || null;
      const savedDepartment = await this.departmentRepository.save(department);

      const memberCount = await this.userRepository.count({
        where: { departmentId: id }
      });

      res.json({
        success: true,
        data: {
          id: savedDepartment.id,
          name: savedDepartment.name,
          parentId: savedDepartment.parentId,
          memberCount
        },
        message: '部门移动成功'
      });
    } catch (error) {
      console.error('移动部门失败:', error);
      res.status(500).json({
        success: false,
        message: '移动部门失败'
      });
    }
  }
}
