import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticateToken);

// 注意：customer_assignments 表需要先在数据库中创建
// 这里暂时使用原生SQL查询，因为没有对应的实体

/**
 * @route GET /api/v1/assignment/history
 * @desc 获取分配历史
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, customerId, toUserId } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `SELECT * FROM customer_assignments WHERE 1=1`;
    const params: any[] = [];

    if (customerId) {
      sql += ` AND customer_id = ?`;
      params.push(customerId);
    }

    if (toUserId) {
      sql += ` AND to_user_id = ?`;
      params.push(toUserId);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(pageSize), offset);

    const list = await AppDataSource.query(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM customer_assignments WHERE 1=1`;
    const countParams: any[] = [];
    if (customerId) {
      countSql += ` AND customer_id = ?`;
      countParams.push(customerId);
    }
    if (toUserId) {
      countSql += ` AND to_user_id = ?`;
      countParams.push(toUserId);
    }

    const countResult = await AppDataSource.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取分配历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取分配历史失败'
    });
  }
});


/**
 * @route POST /api/v1/assignment/assign
 * @desc 分配客户
 */
router.post('/assign', async (req: Request, res: Response) => {
  try {
    const { customerId, toUserId, reason } = req.body;
    const currentUser = (req as any).user;

    if (!customerId || !toUserId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    // 获取客户信息
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: '客户不存在' });
    }

    // 获取目标用户信息
    const userRepository = AppDataSource.getRepository(User);
    const toUser = await userRepository.findOne({ where: { id: toUserId } });
    if (!toUser) {
      return res.status(404).json({ success: false, message: '目标用户不存在' });
    }

    const assignmentId = uuidv4();
    const now = new Date();

    // 插入分配记录
    await AppDataSource.query(
      `INSERT INTO customer_assignments
       (id, customer_id, customer_name, from_user_id, from_user_name, to_user_id, to_user_name,
        assignment_type, reason, operator_id, operator_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        assignmentId,
        customerId,
        customer.name,
        customer.salesPersonId,
        customer.salesPersonName,
        toUserId,
        toUser.realName || toUser.username,
        'manual',
        reason || '',
        currentUser?.userId,
        currentUser?.realName || currentUser?.username,
        now
      ]
    );

    // 更新客户的销售员
    customer.salesPersonId = toUserId;
    customer.salesPersonName = toUser.realName || toUser.username;
    await customerRepository.save(customer);

    res.json({
      success: true,
      message: '分配成功',
      data: { id: assignmentId }
    });
  } catch (error) {
    console.error('分配客户失败:', error);
    res.status(500).json({
      success: false,
      message: '分配客户失败'
    });
  }
});

/**
 * @route POST /api/v1/assignment/batch-assign
 * @desc 批量分配客户
 */
router.post('/batch-assign', async (req: Request, res: Response) => {
  try {
    const { customerIds, toUserId, reason } = req.body;
    const currentUser = (req as any).user;

    if (!customerIds || customerIds.length === 0 || !toUserId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const toUser = await userRepository.findOne({ where: { id: toUserId } });
    if (!toUser) {
      return res.status(404).json({ success: false, message: '目标用户不存在' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    let successCount = 0;

    for (const customerId of customerIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        if (customer) {
          const assignmentId = uuidv4();
          await AppDataSource.query(
            `INSERT INTO customer_assignments
             (id, customer_id, customer_name, from_user_id, from_user_name, to_user_id, to_user_name,
              assignment_type, reason, operator_id, operator_name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              assignmentId, customerId, customer.name,
              customer.salesPersonId, customer.salesPersonName,
              toUserId, toUser.realName || toUser.username,
              'manual', reason || '',
              currentUser?.userId, currentUser?.realName || currentUser?.username,
              new Date()
            ]
          );

          customer.salesPersonId = toUserId;
          customer.salesPersonName = toUser.realName || toUser.username;
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        console.error('分配单个客户失败:', e);
      }
    }

    res.json({
      success: true,
      message: '批量分配完成',
      data: { successCount, failCount: customerIds.length - successCount }
    });
  } catch (error) {
    console.error('批量分配失败:', error);
    res.status(500).json({ success: false, message: '批量分配失败' });
  }
});

/**
 * @route GET /api/v1/assignment/stats
 * @desc 获取分配统计
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [totalResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM customer_assignments`
    );
    const [todayResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM customer_assignments WHERE created_at >= ?`,
      [today]
    );
    const [weekResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM customer_assignments WHERE created_at >= ?`,
      [weekAgo]
    );
    const [monthResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM customer_assignments WHERE created_at >= ?`,
      [monthAgo]
    );

    res.json({
      success: true,
      data: {
        totalAssignments: totalResult?.total || 0,
        todayAssignments: todayResult?.total || 0,
        weekAssignments: weekResult?.total || 0,
        monthAssignments: monthResult?.total || 0
      }
    });
  } catch (error) {
    console.error('获取分配统计失败:', error);
    res.status(500).json({ success: false, message: '获取分配统计失败' });
  }
});

export default router;
