import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { CustomerShare } from '../entities/CustomerShare';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { LessThan, In } from 'typeorm';

const router = Router();

// 所有客户分享路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/customer-share/history
 * @desc 获取分享历史
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, customerId, status } = req.query;
    const currentUser = (req as any).user;

    const shareRepository = AppDataSource.getRepository(CustomerShare);
    const queryBuilder = shareRepository.createQueryBuilder('share');

    // 只能看到自己分享的或分享给自己的
    queryBuilder.where('(share.sharedBy = :userId OR share.sharedTo = :userId)', {
      userId: currentUser.userId
    });

    if (customerId) {
      queryBuilder.andWhere('share.customerId = :customerId', { customerId });
    }

    if (status) {
      queryBuilder.andWhere('share.status = :status', { status });
    }

    queryBuilder.orderBy('share.createdAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      code: 200,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error) {
    console.error('获取分享历史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取分享历史失败' });
  }
});


/**
 * @route POST /api/v1/customer-share/share
 * @desc 分享客户
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { customerId, sharedTo, timeLimit, remark } = req.body;
    const currentUser = (req as any).user;

    if (!customerId || !sharedTo) {
      return res.status(400).json({ success: false, code: 400, message: '参数不完整' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const userRepository = AppDataSource.getRepository(User);
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    // 获取客户信息
    const customer = await customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    // 获取接收人信息
    const targetUser = await userRepository.findOne({ where: { id: sharedTo } });
    if (!targetUser) {
      return res.status(404).json({ success: false, code: 404, message: '接收人不存在' });
    }

    // 创建分享记录
    const share = new CustomerShare();
    share.id = uuidv4();
    share.customerId = customerId;
    share.customerName = customer.name;
    share.sharedBy = currentUser.userId;
    share.sharedByName = currentUser.realName || currentUser.username;
    share.sharedTo = sharedTo;
    share.sharedToName = targetUser.realName || targetUser.username;
    share.timeLimit = timeLimit || 0;
    share.remark = remark || '';
    share.status = 'active';
    share.originalOwner = customer.salesPersonId || customer.createdBy;

    // 计算过期时间
    if (timeLimit && timeLimit > 0) {
      const expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + timeLimit);
      share.expireTime = expireTime;
    }

    await shareRepository.save(share);

    res.status(201).json({
      success: true,
      code: 200,
      message: '客户分享成功',
      data: share
    });
  } catch (error) {
    console.error('分享客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '分享客户失败' });
  }
});

/**
 * @route POST /api/v1/customer-share/recall
 * @desc 回收客户
 */
router.post('/recall', async (req: Request, res: Response) => {
  try {
    const { shareId, reason } = req.body;
    const currentUser = (req as any).user;

    if (!shareId) {
      return res.status(400).json({ success: false, code: 400, message: '分享ID不能为空' });
    }

    const shareRepository = AppDataSource.getRepository(CustomerShare);
    const share = await shareRepository.findOne({ where: { id: shareId } });

    if (!share) {
      return res.status(404).json({ success: false, code: 404, message: '分享记录不存在' });
    }

    // 只有分享人可以回收
    if (share.sharedBy !== currentUser.userId) {
      return res.status(403).json({ success: false, code: 403, message: '无权回收此分享' });
    }

    share.status = 'recalled';
    share.recallTime = new Date();
    share.recallReason = reason || '';

    await shareRepository.save(share);

    res.json({ success: true, code: 200, message: '客户回收成功' });
  } catch (error) {
    console.error('回收客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '回收客户失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/my-shared
 * @desc 获取我分享的客户
 */
router.get('/my-shared', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    const shares = await shareRepository.find({
      where: { sharedBy: currentUser.userId, status: 'active' },
      order: { createdAt: 'DESC' }
    });

    res.json({ success: true, code: 200, data: shares });
  } catch (error) {
    console.error('获取我分享的客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/shared-to-me
 * @desc 获取分享给我的客户
 */
router.get('/shared-to-me', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    // 更新过期状态
    await shareRepository.update(
      { sharedTo: currentUser.userId, status: 'active', expireTime: LessThan(new Date()) },
      { status: 'expired' }
    );

    const shares = await shareRepository.find({
      where: { sharedTo: currentUser.userId, status: 'active' },
      order: { createdAt: 'DESC' }
    });

    res.json({ success: true, code: 200, data: shares });
  } catch (error) {
    console.error('获取分享给我的客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/shareable-users
 * @desc 获取可分享的用户列表
 */
router.get('/shareable-users', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRepository = AppDataSource.getRepository(User);

    // 获取所有活跃用户（排除自己）
    const users = await userRepository.find({
      where: { status: 'active' },
      select: ['id', 'username', 'realName', 'departmentId', 'departmentName', 'position']
    });

    const shareableUsers = users
      .filter(u => u.id !== currentUser.userId)
      .map(u => ({
        id: u.id,
        name: u.realName || u.username,
        department: u.departmentName,
        position: u.position
      }));

    res.json({ success: true, code: 200, data: shareableUsers });
  } catch (error) {
    console.error('获取可分享用户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

export default router;
