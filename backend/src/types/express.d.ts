import { User } from '../entities/User';

// 扩展 Express Request 类型，这样 req.user 就是合法的
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {}
