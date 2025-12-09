import { Request, Response } from 'express';
export declare class UserController {
    private get userRepository();
    private get departmentRepository();
    /**
     * 用户登录
     */
    login: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 刷新令牌
     */
    refreshToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 获取当前用户信息
     */
    getCurrentUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 更新当前用户信息
     */
    updateCurrentUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 修改密码
     */
    changePassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 创建用户（管理员功能）
     */
    createUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 获取用户列表（管理员功能）
     */
    getUsers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 获取用户统计信息
     */
    getUserStatistics: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 获取用户详情
     */
    getUserById: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 更新用户信息
     */
    updateUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 删除用户
     */
    deleteUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 更新用户状态（启用/禁用/锁定）
     */
    updateUserStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 更新用户在职状态
     */
    updateEmploymentStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 重置用户密码
     */
    resetUserPassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
    /**
     * 记录操作日志
     */
    private logOperation;
}
//# sourceMappingURL=UserController.d.ts.map