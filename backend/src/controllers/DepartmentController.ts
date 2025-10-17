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
        relations: ['users'],
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      // 计算每个部门的成员数量
      const departmentsWithCount = departments.map((dept: Department) => ({
        id: dept.id.toString(),
        name: dept.name,
        code: dept.code,
        description: dept.description,
        parentId: dept.parentId?.toString(),
        sortOrder: dept.sortOrder,
        status: dept.status,
        memberCount: dept.users?.length || 0,
        createdAt: dept.createdAt.toISOString(),
        updatedAt: dept.updatedAt.toISOString()
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
        relations: ['users'],
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });

      // 构建树形结构
      const departmentMap = new Map();
      const rootDepartments: any[] = [];

      // 先创建所有部门节点
      departments.forEach((dept: Department) => {
        const deptNode = {
          id: dept.id.toString(),
          name: dept.name,
          code: dept.code,
          description: dept.description,
          parentId: dept.parentId?.toString(),
          sortOrder: dept.sortOrder,
          status: dept.status,
          memberCount: dept.users?.length || 0,
          createdAt: dept.createdAt.toISOString(),
          updatedAt: dept.updatedAt.toISOString(),
          children: []
        };
        departmentMap.set(dept.id.toString(), deptNode);
      });

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
        where: { id: parseInt(id) },
        relations: ['users']
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      const result = {
        id: department.id.toString(),
        name: department.name,
        code: department.code,
        description: department.description,
        parentId: department.parentId?.toString(),
        sortOrder: department.sortOrder,
        status: department.status,
        memberCount: department.users?.length || 0,
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
      const { name, code, description, parentId, sortOrder = 0, status = 'active' } = req.body;

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

      // 如果有父部门，检查父部门是否存在
      if (parentId) {
        const parentDept = await this.departmentRepository.findOne({
          where: { id: parseInt(parentId) }
        });
        if (!parentDept) {
          res.status(400).json({
            success: false,
            message: '父部门不存在'
          });
          return;
        }
      }

      const department = this.departmentRepository.create({
        name,
        code,
        description,
        parentId: parentId ? parseInt(parentId) : undefined,
        sortOrder,
        status
      });

      const savedDepartment = await this.departmentRepository.save(department);

      const result = {
        id: savedDepartment.id.toString(),
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId?.toString(),
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        memberCount: 0,
        createdAt: savedDepartment.createdAt.toISOString(),
        updatedAt: savedDepartment.updatedAt.toISOString()
      };

      res.status(201).json({
        success: true,
        data: result,
        message: '部门创建成功'
      });
    } catch (error) {
      console.error('创建部门失败:', error);
      res.status(500).json({
        success: false,
        message: '创建部门失败'
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
        where: { id: parseInt(id) },
        relations: ['users']
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
        if (existingByName) {
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
        if (existingByCode) {
          res.status(400).json({
            success: false,
            message: '部门代码已存在'
          });
          return;
        }
      }

      // 如果有父部门，检查父部门是否存在且不是自己
      if (parentId) {
        if (parseInt(parentId) === parseInt(id)) {
          res.status(400).json({
            success: false,
            message: '不能将自己设为父部门'
          });
          return;
        }

        const parentDept = await this.departmentRepository.findOne({
          where: { id: parseInt(parentId) }
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
      if (parentId !== undefined) department.parentId = parentId ? parseInt(parentId) : undefined;
      if (sortOrder !== undefined) department.sortOrder = sortOrder;
      if (status !== undefined) department.status = status;

      const savedDepartment = await this.departmentRepository.save(department);

      const result = {
        id: savedDepartment.id.toString(),
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId?.toString(),
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        memberCount: savedDepartment.users?.length || 0,
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
        where: { id: parseInt(id) },
        relations: ['users']
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
        where: { parentId: parseInt(id) }
      });

      if (childDepartments.length > 0) {
        res.status(400).json({
          success: false,
          message: '该部门下还有子部门，无法删除'
        });
        return;
      }

      // 检查是否有成员
      if (department.users && department.users.length > 0) {
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
        where: { id: parseInt(id) },
        relations: ['users']
      });

      if (!department) {
        res.status(404).json({
          success: false,
          message: '部门不存在'
        });
        return;
      }

      department.status = status;
      const savedDepartment = await this.departmentRepository.save(department);

      const result = {
        id: savedDepartment.id.toString(),
        name: savedDepartment.name,
        code: savedDepartment.code,
        description: savedDepartment.description,
        parentId: savedDepartment.parentId?.toString(),
        sortOrder: savedDepartment.sortOrder,
        status: savedDepartment.status,
        memberCount: savedDepartment.users?.length || 0,
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

      const users = await this.userRepository.find({
        where: { departmentId: parseInt(id) },
        relations: ['department']
      });

      const members = users.map((user: User) => ({
        id: user.id.toString(),
        userId: user.id.toString(),
        departmentId: id,
        name: user.realName || user.username,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        joinedAt: user.createdAt.toISOString()
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
        where: { id: parseInt(departmentId) }
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
        where: { id: parseInt(userId) }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在'
        });
        return;
      }

      // 更新用户的部门
      user.departmentId = parseInt(departmentId);
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
          id: parseInt(userId),
          departmentId: parseInt(departmentId)
        }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: '用户不存在或不属于该部门'
        });
        return;
      }

      // 将用户的部门设为undefined
      user.departmentId = undefined;
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
}