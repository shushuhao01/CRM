import { Request, Response, NextFunction } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class BusinessError extends AppError {
    constructor(message: string, code?: string);
}
export declare class ValidationError extends AppError {
    details: any;
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string);
}
/**
 * 全局错误处理中间件
 */
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
/**
 * 404错误处理中间件
 */
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
/**
 * 异步错误捕获装饰器
 */
export declare const catchAsync: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map