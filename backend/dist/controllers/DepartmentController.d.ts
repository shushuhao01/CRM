import { Request, Response } from 'express';
export declare class DepartmentController {
    private get departmentRepository();
    private get userRepository();
    /**
     * 获取部门列表
     */
    getDepartments(req: Request, res: Response): Promise<void>;
    /**
     * 获取部门树形结构
     */
    getDepartmentTree(req: Request, res: Response): Promise<void>;
    /**
     * 获取部门详情
     */
    getDepartmentById(req: Request, res: Response): Promise<void>;
    /**
     * 创建部门
     */
    createDepartment(req: Request, res: Response): Promise<void>;
    /**
     * 更新部门
     */
    updateDepartment(req: Request, res: Response): Promise<void>;
    /**
     * 删除部门
     */
    deleteDepartment(req: Request, res: Response): Promise<void>;
    /**
     * 更新部门状态
     */
    updateDepartmentStatus(req: Request, res: Response): Promise<void>;
    /**
     * 获取部门成员
     */
    getDepartmentMembers(req: Request, res: Response): Promise<void>;
    /**
     * 添加部门成员
     */
    addDepartmentMember(req: Request, res: Response): Promise<void>;
    /**
     * 移除部门成员
     */
    removeDepartmentMember(req: Request, res: Response): Promise<void>;
    /**
     * 获取部门统计信息
     */
    getDepartmentStats(req: Request, res: Response): Promise<void>;
    /**
     * 获取部门角色列表
     * 返回该部门下所有成员的角色信息
     */
    getDepartmentRoles(req: Request, res: Response): Promise<void>;
    /**
     * 更新部门权限
     */
    updateDepartmentPermissions(req: Request, res: Response): Promise<void>;
    /**
     * 移动部门（更改父部门）
     */
    moveDepartment(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=DepartmentController.d.ts.map