import { Request, Response, NextFunction } from 'express';
import { ApiConfigService } from '../services/ApiConfigService';

const apiConfigService = new ApiConfigService();

/**
 * API密钥认证中间件
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 从请求头获取API密钥
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        code: 401,
        message: '缺少API密钥'
      });
      return;
    }

    // 验证API密钥
    const apiConfig = await apiConfigService.getApiConfigByKey(apiKey);

    if (!apiConfig) {
      res.status(401).json({
        code: 401,
        message: 'API密钥无效'
      });
      return;
    }

    // 检查API配置状态
    if (!apiConfig.isActive()) {
      res.status(403).json({
        code: 403,
        message: 'API已禁用或已过期'
      });
      return;
    }

    // 检查IP白名单
    const clientIp = req.ip || req.connection.remoteAddress || '';
    if (!apiConfig.isIpAllowed(clientIp)) {
      res.status(403).json({
        code: 403,
        message: 'IP地址不在白名单中'
      });
      return;
    }

    // 将API配置信息附加到请求对象
    (req as any).apiConfig = apiConfig;

    // 更新最后使用时间
    await apiConfigService.updateLastUsedAt(apiConfig.id);

    next();
  } catch (error: any) {
    console.error('API密钥认证失败:', error);
    res.status(500).json({
      code: 500,
      message: 'API密钥认证失败',
      error: error.message
    });
  }
};
