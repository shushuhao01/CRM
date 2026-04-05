import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { CustomerShare } from '../entities/CustomerShare';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import { LessThan, In } from 'typeorm';
import { getTenantRepo } from '../utils/tenantRepo';

import { log } from '../config/logger';
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

    const shareRepository = getTenantRepo(CustomerShare);
    const queryBuilder = shareRepository.createQueryBuilder('share');

    // 只能看到自己分享的或分享给自己的 - 🔥 修复租户隔离
    queryBuilder.andWhere('(share.sharedBy = :userId OR share.sharedTo = :userId)', {
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
    log.error('获取分享历史失败:', error);
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

    log.info('[客户分享] 接收到的参数:', {
      customerId,
      customerId_type: typeof customerId,
      customerId_length: customerId?.length,
      sharedTo,
      timeLimit,
      currentUser: currentUser.userId
    });

    if (!customerId || !sharedTo) {
      log.info('[客户分享] 参数验证失败');
      return res.status(400).json({ success: false, code: 400, message: '参数不完整' });
    }

    const customerRepository = getTenantRepo(Customer);
    const userRepository = getTenantRepo(User);
    const shareRepository = getTenantRepo(CustomerShare);

    // 获取客户信息
    log.info('[客户分享] 开始查询客户, ID:', customerId);
    const customer = await customerRepository.findOne({ where: { id: customerId } });
    log.info('[客户分享] 查询结果:', customer ? `找到客户: ${customer.name} (${customer.customerNo})` : '客户不存在');

    if (!customer) {
      // 额外调试：查看数据库中的客户ID格式
      const sampleCustomers = await customerRepository.find({ take: 3, order: { createdAt: 'DESC' } });
      log.info('[客户分享] 数据库中最近3条客户:', sampleCustomers.map(c => ({
        id: c.id,
        id_length: c.id.length,
        name: c.name,
        customerNo: c.customerNo
      })));

      return res.status(404).json({
        success: false,
        code: 404,
        message: '客户不存在',
        debug: process.env.NODE_ENV === 'development' ? {
          searchId: customerId,
          searchIdLength: customerId.length,
          sampleIds: sampleCustomers.map(c => c.id)
        } : undefined
      });
    }

    // 获取接收人信息
    log.info('[客户分享] 查询接收人, ID:', sharedTo);
    const targetUser = await userRepository.findOne({ where: { id: sharedTo } });
    log.info('[客户分享] 接收人查询结果:', targetUser ? `找到用户: ${targetUser.realName || targetUser.username}` : '用户不存在');

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

    log.info('[客户分享] 准备保存分享记录:', {
      shareId: share.id,
      customerName: share.customerName,
      from: share.sharedByName,
      to: share.sharedToName,
      timeLimit: share.timeLimit
    });

    await shareRepository.save(share);
    log.info('[客户分享] 分享记录保存成功');

    // 🔥 发送系统消息给被分享成员
    try {
      const messageService = (await import('../services/messageService')).default;
      await messageService.createSystemMessage({
        type: 'customer_share',
        title: '客户分享通知',
        content: `${share.sharedByName} 将客户"${share.customerName}"分享给了您${share.timeLimit > 0 ? `（有效期${share.timeLimit}天）` : '（永久有效）'}`,
        priority: 'normal',
        targetUserId: share.sharedTo,
        relatedId: share.customerId,
        relatedType: 'customer',
        actionUrl: `/customer/detail/${share.customerId}`,
        createdBy: share.sharedBy
      });
      log.info('[客户分享] 系统消息已发送给被分享成员');
    } catch (msgError) {
      log.error('[客户分享] 发送系统消息失败:', msgError);
      // 消息发送失败不影响分享功能
    }

    res.status(201).json({
      success: true,
      code: 200,
      message: '客户分享成功',
      data: share
    });
  } catch (error) {
    log.error('[客户分享] 分享失败，错误详情:', error);
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

    const shareRepository = getTenantRepo(CustomerShare);
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
    log.error('回收客户失败:', error);
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
    const shareRepository = getTenantRepo(CustomerShare);

    const shares = await shareRepository.find({
      where: { sharedBy: currentUser.userId, status: 'active' },
      order: { createdAt: 'DESC' }
    });

    res.json({ success: true, code: 200, data: shares });
  } catch (error) {
    log.error('获取我分享的客户失败:', error);
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
    const shareRepository = getTenantRepo(CustomerShare);

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
    log.error('获取分享给我的客户失败:', error);
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
    const userRepository = getTenantRepo(User);

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
    log.error('获取可分享用户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

export default router;
