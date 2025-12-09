import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../config/jwt';
import { User } from '../entities/User';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            currentUser?: User;
        }
    }
}
/**
 * JWT认证中间件
 */
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * 角色权限检查中间件
 */
export declare const requireRole: (roles: string | string[]) => (req: Request, res: Response, next: NextFunction) => Response | void;
/**
 * 管理员权限检查中间件
 * 支持的角色: admin, superadmin, super_admin
 */
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => Response | void;
/**
 * 管理员或经理权限检查中间件
 * 支持的角色: admin, super_admin, manager, department_manager
 */
export declare const requireManagerOrAdmin: (req: Request, res: Response, next: NextFunction) => Response | void;
/**
 * 可选认证中间件（不强制要求认证）
 */
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map