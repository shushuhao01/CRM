import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '../config/jwt';
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
/**
 * 简化的JWT认证中间件 - 不依赖数据库
 * 用于替代连接功能等不需要完整用户信息的场景
 */
export declare const authenticateTokenSimple: (req: Request, res: Response, next: NextFunction) => Promise<Response | void>;
/**
 * 可选的认证中间件 - 如果有token则验证，没有则跳过
 * 用于某些可以匿名访问但有token时需要验证的场景
 */
export declare const authenticateTokenOptional: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=simpleAuth.d.ts.map