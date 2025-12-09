import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
/**
 * 请求验证中间件
 */
export declare const validate: (schema: {
    body?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
}) => (req: Request, res: Response, next: NextFunction) => void;
export declare const commonValidations: {
    id: Joi.NumberSchema<number>;
    optionalId: Joi.NumberSchema<number>;
    pagination: {
        page: Joi.NumberSchema<number>;
        limit: Joi.NumberSchema<number>;
    };
    username: Joi.StringSchema<string>;
    password: Joi.StringSchema<string>;
    email: Joi.StringSchema<string>;
    optionalEmail: Joi.StringSchema<string>;
    phone: Joi.StringSchema<string>;
    status: (values: string[]) => Joi.StringSchema<string>;
    date: Joi.DateSchema<Date>;
    optionalDate: Joi.DateSchema<Date>;
    amount: Joi.NumberSchema<number>;
    quantity: Joi.NumberSchema<number>;
};
//# sourceMappingURL=validation.d.ts.map