import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { CustomerShare } from '../entities/CustomerShare';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';

const router = Router();

// 所有客户分享路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/customer-share/history
 * @desc 获取分享历史
 * @access Private
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const shareRepository = AppDataSource.getRepository(CustomerShare);
    const { page = 1, pageSize = 20, status } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }

    const [shares, total] = await shareRepository.findAndCount({
      where,
      skip,
      take: pageSizeNum,
      order: { createdAt: 'DESC' }
    });

    res.json({
      success: true,
      code: 200,
      message: '获取分享历史成功',
      data: { list: shares, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error) {
    console.error('获取分享历史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取分享历史失败' });
  }
});


/**
 * @route POST /api/v1/customer-share/share
 * @desc 分享客户
 * @access Private
 */
router.post('/share', async (req: Request, res: Response) => {
  try {
    const { customerId, sharedTo, timeLimit, remark } = req.body;
    const currentUser = (req as any).user;

    if (!customerId || !sharedTo) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '客户ID和分享目标不能为空'
      });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const userRepository = AppDataSource.getRepository(User);
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    // 获取客户信息
    const customer = await customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    // 获取目标用户信息
    const targetUser = await userRepository.findOne({ where: { id: sharedTo } });
    if (!targetUser) {
      return res.status(404).json({ success: false, code: 404, message: '目标用户不存在' });
    }

    // 检查是否已经分享给该用户
    const existingShare = await shareRepository.findOne({
      where: { customerId, sharedTo, status: 'active' }
    });
    if (existingShare) {
      return res.status(400).json({ success: false, code: 400, message: '该客户已分享给此用户' });
    }

    // 计算到期时间
    const expireTime = timeLimit === 0 ? null : new Date(Date.now() + timeLimit * 24 * 60 * 60 * 1000);

    // 创建分享记录
    const share = shareRepository.create({
      customerId,
      customerName: customer.name,
      sharedBy: currentUser?.id || 'admin',
      sharedByName: currentUser?.realName || currentUser?.username || '管理员',
      sharedTo,
      sharedToName: targetUser.realName || targetUser.username,
      timeLimit: timeLimit || 0,
      expireTime,
      remark: remark || '',
      status: 'active',
      originalOwner: customer.salesPersonId || ''
    });

    const savedShare = await shareRepository.save(share);

    // 更新客户负责人
    customer.salesPersonId = sharedTo;
    await customerRepository.save(customer);

    res.status(201).json({
      success: true,
      code: 200,
      message: '客户分享成功',
      data: savedShare
    });
  } catch (error) {
    console.error('分享客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '分享客户失败' });
  }
});

/**
 * @route POST /api/v1/customer-share/recall
 * @desc 回收客户
 * @access Private
 */
router.post('/recall', async (req: Request, res: Response) => {
  try {
    const { shareId, recallReason } = req.body;
    const currentUser = (req as any).user;

    if (!shareId) {
      return res.status(400).json({ success: false, code: 400, message: '分享ID不能为空' });
    }

    const shareRepository = AppDataSource.getRepository(CustomerShare);
    const customerRepository = AppDataSource.getRepository(Customer);

    const share = await shareRepository.findOne({ where: { id: shareId } });
    if (!share) {
      return res.status(404).json({ success: false, code: 404, message: '分享记录不存在' });
    }

    // 检查权限
    const canRecall = share.sharedBy === currentUser?.id ||
      ['super_admin', 'admin', 'department_manager'].includes(currentUser?.role);
    if (!canRecall) {
      return res.status(403).json({ success: false, code: 403, message: '没有权限回收此客户' });
    }

    // 更新分享记录状态
    share.status = 'recalled';
    share.recallTime = new Date();
    share.recallReason = recallReason || '';
    await shareRepository.save(share);

    // 恢复原负责人
    const customer = await customerRepository.findOne({ where: { id: share.customerId } });
    if (customer && share.originalOwner) {
      customer.salesPersonId = share.originalOwner;
      await customerRepository.save(customer);
    }

    res.json({ success: true, code: 200, message: '客户回收成功' });
  } catch (error) {
    console.error('回收客户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '回收客户失败' });
  }
});

/**
 * @route GET /api/v1/customer-share/my-shared
 * @desc 获取我分享的客户
 * @access Private
 */
router.get('/my-shared', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    const shares = await shareRepository.find({
      where: { sharedBy: currentUser?.id || 'admin', status: 'active' },
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
 * @access Private
 */
router.get('/shared-to-me', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const shareRepository = AppDataSource.getRepository(CustomerShare);

    const shares = await shareRepository.find({
      where: { sharedTo: currentUser?.id || 'admin', status: 'active' },
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
 * @access Private
 */
router.get('/shareable-users', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userRepository = AppDataSource.getRepository(User);

    const users = await userRepository.find({
      where: { status: 'active' },
      select: ['id', 'username', 'realName', 'role', 'department']
    });

    // 排除当前用户
    const shareableUsers = users
      .filter(u => u.id !== currentUser?.id)
      .map(u => ({
        id: u.id,
        name: u.realName || u.username,
        role: u.role,
        department: u.department
      }));

    res.json({ success: true, code: 200, data: shareableUsers });
  } catch (error) {
    console.error('获取可分享用户失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取失败' });
  }
});

export default router;
