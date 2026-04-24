/**
 * 会话轨迹 API 路由 - V4.0新增
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomCustomerEvent } from '../../entities/WecomCustomerEvent';
import { getCurrentTenantId } from '../../utils/tenantContext';

const router = Router();

// 获取客户会话轨迹(时间线)
router.get('/timeline/:externalUserId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, page = 1, pageSize = 50 } = req.query;

    const qb = AppDataSource.getRepository(WecomCustomerEvent).createQueryBuilder('e');
    qb.where('e.tenantId = :tenantId', { tenantId });
    qb.andWhere('e.externalUserId = :externalUserId', { externalUserId: req.params.externalUserId });

    if (configId) qb.andWhere('e.wecomConfigId = :configId', { configId });

    qb.orderBy('e.eventTime', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
