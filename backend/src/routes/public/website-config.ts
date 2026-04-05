/**
 * 公开的官网配置API
 * 供官网前端获取版权/备案/联系方式/客服等配置信息
 * 路径: GET /api/v1/public/website-config
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { log } from '../../config/logger';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await AppDataSource.query(
      `SELECT config_value FROM system_config WHERE config_key = 'admin_system_config' LIMIT 1`
    ).catch(() => []);

    if (result && result.length > 0) {
      const data = JSON.parse(result[0].config_value || '{}');
      const websiteConfig = data.websiteConfig || {};

      res.json({
        success: true,
        data: {
          // 版权与备案
          copyrightText: data.copyrightText || '',
          icpNumber: data.icpNumber || '',
          policeNumber: data.policeNumber || '',
          techSupport: data.techSupport || '',
          // 基本信息
          companyName: data.companyName || '',
          companyAddress: data.companyAddress || '',
          systemDescription: data.systemDescription || '',
          // 联系方式
          contactPhone: data.contactPhone || '',
          contactEmail: data.contactEmail || '',
          // 官网专用配置
          customerServiceUrl: websiteConfig.customerServiceUrl || '',
          serviceQRCode: websiteConfig.serviceQRCode || data.contactQRCode || '',
          servicePhone: websiteConfig.servicePhone || data.contactPhone || '',
          serviceEmail: websiteConfig.serviceEmail || data.contactEmail || '',
          workingHours: websiteConfig.workingHours || '周一至周五 9:00-18:00',
          brandSlogan: websiteConfig.brandSlogan || '',
          contactQRCodeLabel: data.contactQRCodeLabel || '',
        }
      });
    } else {
      res.json({ success: true, data: {} });
    }
  } catch (error) {
    log.error('获取官网配置失败:', error);
    res.json({ success: true, data: {} });
  }
});

export default router;

