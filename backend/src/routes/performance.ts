import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { tenantSQL } from '../utils/tenantRepo';
import { TenantContextManager } from '../utils/tenantContext';
import { deployConfig } from '../config/deploy';

const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/v1/performance/shares
 * @desc 获取业绩分享列表
 */
router.get('/shares', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, userId, orderId } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const t = tenantSQL('ps.');

    let sql = `SELECT ps.*,
               (SELECT JSON_ARRAYAGG(JSON_OBJECT(
                 'id', psm.id, 'userId', psm.user_id, 'userName', psm.user_name,
                 'department', psm.department, 'percentage', psm.share_percentage,
                 'shareAmount', psm.share_amount, 'status', psm.status
               )) FROM performance_share_members psm WHERE psm.share_id = ps.id) as shareMembers
               FROM performance_shares ps WHERE 1=1${t.sql}`;
    const params: any[] = [...t.params];

    if (status) {
      sql += ` AND ps.status = ?`;
      params.push(status);
    }

    if (orderId) {
      sql += ` AND ps.order_id = ?`;
      params.push(orderId);
    }

    if (userId) {
      sql += ` AND (ps.created_by = ? OR EXISTS (SELECT 1 FROM performance_share_members psm WHERE psm.share_id = ps.id AND psm.user_id = ?))`;
      params.push(userId, userId);
    }

    sql += ` ORDER BY ps.created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const shares = await AppDataSource.query(sql, params);

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM performance_shares ps WHERE 1=1${t.sql}`;
    const countParams: any[] = [...t.params];
    if (status) { countSql += ` AND ps.status = ?`; countParams.push(status); }
    if (orderId) { countSql += ` AND ps.order_id = ?`; countParams.push(orderId); }

    const [countResult] = await AppDataSource.query(countSql, countParams);

    res.json({
      success: true,
      code: 200,
      message: '获取业绩分享列表成功',
      data: {
        shares: shares.map((s: any) => ({
          ...s,
          // 🔥 修复：mysql2 驱动会自动将 JSON 转为对象，不需要再次 parse
          shareMembers: s.shareMembers
            ? (typeof s.shareMembers === 'string' ? JSON.parse(s.shareMembers) : s.shareMembers)
            : []
        })),
        total: countResult?.total || 0,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取业绩分享列表失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩分享列表失败' });
  }
});


/**
 * @route GET /api/v1/performance/shares/:id
 * @desc 获取单个业绩分享详情
 */
router.get('/shares/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [share] = await AppDataSource.query(
      `SELECT * FROM performance_shares WHERE id = ?`, [id]
    );

    if (!share) {
      return res.status(404).json({ success: false, code: 404, message: '业绩分享记录不存在' });
    }

    const members = await AppDataSource.query(
      `SELECT * FROM performance_share_members WHERE share_id = ?`, [id]
    );

    res.json({
      success: true,
      code: 200,
      message: '获取业绩分享详情成功',
      data: { ...share, shareMembers: members }
    });
  } catch (error) {
    console.error('获取业绩分享详情失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩分享详情失败' });
  }
});

/**
 * @route POST /api/v1/performance/shares
 * @desc 创建业绩分享
 */
router.post('/shares', async (req: Request, res: Response) => {
  try {
    const { orderId, orderNumber, orderAmount, shareMembers, description } = req.body;
    const currentUser = (req as any).user;

    if (!orderId || !orderNumber || !orderAmount || !shareMembers || shareMembers.length === 0) {
      return res.status(400).json({ success: false, message: '缺少必填字段' });
    }

    // 验证分成比例总和
    const totalPercentage = shareMembers.reduce((sum: number, m: any) => sum + m.percentage, 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({ success: false, message: '分成比例总和必须为100%' });
    }

    const shareId = uuidv4();
    const shareNumber = `SHARE${Date.now()}`;
    const totalShareAmount = orderAmount;

    // 插入分享记录
    await AppDataSource.query(
      `INSERT INTO performance_shares
       (id, share_number, order_id, order_number, order_amount, total_share_amount, share_count,
        status, description, created_by, created_by_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [shareId, shareNumber, orderId, orderNumber, orderAmount, totalShareAmount,
       shareMembers.length, 'active', description || '',
       currentUser?.userId, currentUser?.realName || currentUser?.username]
    );

    // 插入成员记录
    for (const member of shareMembers) {
      const memberId = uuidv4();
      const shareAmount = (orderAmount * member.percentage) / 100;
      await AppDataSource.query(
        `INSERT INTO performance_share_members
         (id, share_id, user_id, user_name, department, share_percentage, share_amount, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
        [memberId, shareId, member.userId, member.userName, member.department || '',
         member.percentage, shareAmount]
      );
    }

    // 🔥 发送业绩分享通知给每个成员
    const creatorName = currentUser?.realName || currentUser?.username || '系统';
    for (const member of shareMembers) {
      // 不给创建者自己发送通知
      if (member.userId !== currentUser?.userId) {
        const shareAmount = (orderAmount * member.percentage) / 100;
        try {
          const { orderNotificationService } = await import('../services/OrderNotificationService');
          await orderNotificationService.notifyPerformanceShare({
            shareId,
            shareNumber,
            orderNumber,
            orderAmount,
            memberId: member.userId,
            memberName: member.userName,
            percentage: member.percentage,
            shareAmount,
            createdBy: currentUser?.userId,
            createdByName: creatorName
          });
          console.log(`[业绩分享] ✅ 已发送通知给 ${member.userName} (${member.userId})`);
        } catch (notifyError) {
          console.error(`[业绩分享] ❌ 发送通知失败:`, notifyError);
        }
      }
    }

    res.status(201).json({
      success: true,
      code: 200,
      message: '业绩分享创建成功',
      data: { id: shareId, shareNumber }
    });
  } catch (error) {
    console.error('创建业绩分享失败:', error);
    res.status(500).json({ success: false, code: 500, message: '创建业绩分享失败' });
  }
});

/**
 * @route DELETE /api/v1/performance/shares/:id
 * @desc 取消业绩分享
 */
router.delete('/shares/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    const [share] = await AppDataSource.query(
      `SELECT * FROM performance_shares WHERE id = ?`, [id]
    );

    if (!share) {
      return res.status(404).json({ success: false, code: 404, message: '业绩分享记录不存在' });
    }

    if (share.created_by !== currentUser?.userId) {
      return res.status(403).json({ success: false, code: 403, message: '无权限取消此分享记录' });
    }

    if (share.status !== 'active') {
      return res.status(400).json({ success: false, code: 400, message: '只能取消活跃状态的分享记录' });
    }

    await AppDataSource.query(
      `UPDATE performance_shares SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?`,
      [id]
    );

    res.json({ success: true, code: 200, message: '业绩分享已取消' });
  } catch (error) {
    console.error('取消业绩分享失败:', error);
    res.status(500).json({ success: false, code: 500, message: '取消业绩分享失败' });
  }
});

/**
 * @route POST /api/v1/performance/shares/:id/confirm
 * @desc 确认业绩分享
 */
router.post('/shares/:id/confirm', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;

    // 更新成员状态
    await AppDataSource.query(
      `UPDATE performance_share_members SET status = 'confirmed', confirm_time = NOW()
       WHERE share_id = ? AND user_id = ?`,
      [id, currentUser?.userId]
    );

    // 检查是否所有成员都已确认
    const [pendingCount] = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM performance_share_members WHERE share_id = ? AND status != 'confirmed'`,
      [id]
    );

    if (pendingCount?.count === 0) {
      await AppDataSource.query(
        `UPDATE performance_shares SET status = 'completed', completed_at = NOW() WHERE id = ?`,
        [id]
      );
    }

    res.json({ success: true, code: 200, message: '业绩分享确认成功' });
  } catch (error) {
    console.error('确认业绩分享失败:', error);
    res.status(500).json({ success: false, code: 500, message: '确认业绩分享失败' });
  }
});

/**
 * @route GET /api/v1/performance/stats
 * @desc 获取业绩分享统计数据
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const tStats = tenantSQL('');

    const [totalResult] = await AppDataSource.query(
      `SELECT COUNT(*) as total, SUM(order_amount) as totalAmount FROM performance_shares WHERE 1=1${tStats.sql}`,
      [...tStats.params]
    );

    const [pendingResult] = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM performance_shares WHERE status = 'active'${tStats.sql}`,
      [...tStats.params]
    );

    const [completedResult] = await AppDataSource.query(
      `SELECT COUNT(*) as count FROM performance_shares WHERE status = 'completed'${tStats.sql}`,
      [...tStats.params]
    );

    // 用户相关统计
    const [userResult] = await AppDataSource.query(
      `SELECT COUNT(DISTINCT ps.id) as count, SUM(psm.share_amount) as amount
       FROM performance_shares ps
       JOIN performance_share_members psm ON ps.id = psm.share_id
       WHERE (psm.user_id = ? OR ps.created_by = ?)${tStats.sql}`,
      [currentUser?.userId, currentUser?.userId, ...tStats.params]
    );

    res.json({
      success: true,
      code: 200,
      message: '获取业绩分享统计成功',
      data: {
        totalShares: totalResult?.total || 0,
        totalAmount: totalResult?.totalAmount || 0,
        pendingShares: pendingResult?.count || 0,
        completedShares: completedResult?.count || 0,
        userStats: {
          totalShares: userResult?.count || 0,
          totalAmount: userResult?.amount || 0
        }
      }
    });
  } catch (error) {
    console.error('获取业绩分享统计失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩分享统计失败' });
  }
});


/**
 * 🔥 统一的业绩计算规则 - 判断订单是否计入下单业绩
 * 排除的状态：取消申请、已取消、审核拒绝、物流部退回、物流部取消、已退款
 * 待流转状态：所有标记类型都计入（包括normal正常发货单）
 */
const isValidForOrderPerformance = (status: string, _markType?: string): boolean => {
  const excludedStatuses = [
    'pending_cancel', 'cancelled', 'audit_rejected',
    'logistics_returned', 'logistics_cancelled', 'refunded'
  ];
  // 🔥 修复：待流转状态的所有订单都计入业绩（包括normal正常发货单）
  return !excludedStatuses.includes(status);
};

/**
 * @route GET /api/v1/performance/personal
 * @desc 获取个人业绩数据（支持日期筛选）
 */
router.get('/personal', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = (req.query.userId as string) || currentUser?.userId;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // 🔥 修复：获取用户名，用于同时匹配订单
    const [userInfo] = await AppDataSource.query(
      `SELECT id, username FROM users WHERE id = ?`,
      [userId]
    );
    const username = userInfo?.username;

    // 🔥 数据库已配置为北京时区，直接使用北京时间进行查询
    let dateCondition = '';
    const orderParams: any[] = [userId, username];
    if (startDate && endDate) {
      dateCondition = ' AND created_at >= ? AND created_at <= ?';
      orderParams.push(startDate + ' 00:00:00', endDate + ' 23:59:59');
      console.log(`[业绩统计] 查询日期范围: ${startDate} 00:00:00 ~ ${endDate} 23:59:59`);
    }

    // 获取所有订单用于业绩计算
    // 🔥 修复：同时匹配用户ID和用户名 + 租户隔离
    const tOrder = tenantSQL('');
    const orders = await AppDataSource.query(
      `SELECT status, mark_type as markType, total_amount as totalAmount
       FROM orders WHERE (created_by = ? OR created_by = ?)${dateCondition}${tOrder.sql}`,
      [...orderParams, ...tOrder.params]
    );

    // 🔥 使用统一的业绩计算规则
    let orderCount = 0;
    let orderAmount = 0;
    let signCount = 0;
    let signAmount = 0;
    let shipCount = 0;
    let shipAmount = 0;
    let rejectCount = 0;
    let rejectAmount = 0;
    let returnCount = 0;
    let returnAmount = 0;

    orders.forEach((order: any) => {
      const amount = Number(order.totalAmount) || 0;

      // 下单业绩
      if (isValidForOrderPerformance(order.status, order.markType)) {
        orderCount++;
        orderAmount += amount;
      }

      // 签收业绩
      if (order.status === 'delivered') {
        signCount++;
        signAmount += amount;
      }

      // 发货业绩
      if (['shipped', 'delivered', 'rejected', 'rejected_returned'].includes(order.status)) {
        shipCount++;
        shipAmount += amount;
      }

      // 拒收
      if (['rejected', 'rejected_returned'].includes(order.status)) {
        rejectCount++;
        rejectAmount += amount;
      }

      // 退货
      if (order.status === 'refunded') {
        returnCount++;
        returnAmount += amount;
      }
    });

    // 计算比率
    const signRate = orderCount > 0 ? ((signCount / orderCount) * 100).toFixed(1) : '0.0';
    const shipRate = orderCount > 0 ? ((shipCount / orderCount) * 100).toFixed(1) : '0.0';
    const rejectRate = orderCount > 0 ? ((rejectCount / orderCount) * 100).toFixed(1) : '0.0';
    const returnRate = orderCount > 0 ? ((returnCount / orderCount) * 100).toFixed(1) : '0.0';

    // 新增客户数 - 🔥 数据库已配置为北京时区
    let customerDateCondition = '';
    const customerParams: any[] = [userId];
    if (startDate && endDate) {
      customerDateCondition = ' AND created_at >= ? AND created_at <= ?';
      customerParams.push(startDate + ' 00:00:00', endDate + ' 23:59:59');
    }
    const tCust = tenantSQL('');
    const [customerStats] = await AppDataSource.query(
      `SELECT COUNT(*) as newCustomers FROM customers WHERE sales_person_id = ?${customerDateCondition}${tCust.sql}`,
      [...customerParams, ...tCust.params]
    );

    res.json({
      success: true,
      code: 200,
      message: '获取个人业绩成功',
      data: {
        userId,
        // 下单业绩
        orderCount,
        orderAmount,
        // 签收业绩
        signCount,
        signAmount,
        signRate: parseFloat(signRate),
        // 发货业绩
        shipCount,
        shipAmount,
        shipRate: parseFloat(shipRate),
        // 拒收
        rejectCount,
        rejectAmount,
        rejectRate: parseFloat(rejectRate),
        // 退货
        returnCount,
        returnAmount,
        returnRate: parseFloat(returnRate),
        // 客户
        newCustomers: customerStats?.newCustomers || 0
      }
    });
  } catch (error) {
    console.error('获取个人业绩失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取个人业绩失败' });
  }
});

/**
 * @route GET /api/v1/performance/team
 * @desc 获取团队业绩数据（支持日期筛选和排序）
 */
router.get('/team', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    // 🔥 修复：当departmentId为空字符串或'all'时，查询所有部门
    const departmentIdParam = req.query.departmentId as string;
    const departmentId = (departmentIdParam === '' || departmentIdParam === 'all' || departmentIdParam === undefined)
      ? null  // null表示查询所有部门
      : departmentIdParam;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sortBy = (req.query.sortBy as string) || 'orderAmount';
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    console.log(`[团队业绩API] 🚀 请求参数: departmentId=${departmentIdParam}, 实际使用=${departmentId || '全部部门'}`);

    // 🔥 数据库已配置为北京时区，直接使用北京时间
    let dateCondition = '';
    if (startDate && endDate) {
      dateCondition = ` AND created_at >= '${startDate} 00:00:00' AND created_at <= '${endDate} 23:59:59'`;
    }

    // 获取部门成员列表 - 🔥 修复：departmentId为null时查询所有用户
    // 🔥 修复：只查询启用状态(status='active')的用户，停用用户不显示在团队业绩中
    let userCondition = ` WHERE u.status = 'active'`;
    if (departmentId) {
      userCondition += ` AND u.department_id = '${departmentId}'`;
    }

    // 🔥 租户隔离
    const tUser = tenantSQL('u.');
    if (tUser.sql) {
      userCondition += tUser.sql;
    }

    const users = await AppDataSource.query(
      `SELECT u.id, u.real_name as realName, u.username, u.department_name as departmentName,
              u.department_id as departmentId, u.created_at as createTime, u.status
       FROM users u${userCondition}`,
      [...tUser.params]
    );

    console.log(`[团队业绩] 查询到用户数: ${users.length}`);
    console.log(`[团队业绩] 用户列表:`, users.map((u: any) => ({ id: u.id, username: u.username, realName: u.realName })));

    // 获取每个成员的订单数据
    const memberStats: any[] = [];

    for (const user of users) {
      // 🔥 修复：created_by字段可能存储用户ID或用户名，需要同时匹配 + 租户隔离
      const tOrd = tenantSQL('');
      const orders = await AppDataSource.query(
        `SELECT status, mark_type as markType, total_amount as totalAmount
         FROM orders
         WHERE (created_by = ? OR created_by = ?)${dateCondition}${tOrd.sql}`,
        [user.id, user.username, ...tOrd.params]
      );

      // 🔥 使用统一的业绩计算规则
      let orderCount = 0, orderAmount = 0;
      let signCount = 0, signAmount = 0;
      let shipCount = 0, shipAmount = 0;
      let transitCount = 0, transitAmount = 0;
      let rejectCount = 0, rejectAmount = 0;
      let returnCount = 0, returnAmount = 0;

      orders.forEach((order: any) => {
        const amount = Number(order.totalAmount) || 0;

        // 下单业绩
        if (isValidForOrderPerformance(order.status, order.markType)) {
          orderCount++;
          orderAmount += amount;
        }

        // 签收业绩
        if (order.status === 'delivered') {
          signCount++;
          signAmount += amount;
        }

        // 发货业绩
        if (['shipped', 'delivered', 'rejected', 'rejected_returned'].includes(order.status)) {
          shipCount++;
          shipAmount += amount;
        }

        // 在途
        if (order.status === 'shipped') {
          transitCount++;
          transitAmount += amount;
        }

        // 拒收
        if (['rejected', 'rejected_returned'].includes(order.status)) {
          rejectCount++;
          rejectAmount += amount;
        }

        // 退货
        if (order.status === 'refunded') {
          returnCount++;
          returnAmount += amount;
        }
      });

      // 计算比率
      const signRate = orderCount > 0 ? parseFloat(((signCount / orderCount) * 100).toFixed(1)) : 0;
      const shipRate = orderCount > 0 ? parseFloat(((shipCount / orderCount) * 100).toFixed(1)) : 0;
      const transitRate = orderCount > 0 ? parseFloat(((transitCount / orderCount) * 100).toFixed(1)) : 0;
      const rejectRate = orderCount > 0 ? parseFloat(((rejectCount / orderCount) * 100).toFixed(1)) : 0;
      const returnRate = orderCount > 0 ? parseFloat(((returnCount / orderCount) * 100).toFixed(1)) : 0;

      memberStats.push({
        id: user.id,
        name: user.realName || user.username,
        username: user.username,
        department: user.departmentName,
        departmentId: user.departmentId,
        createTime: user.createTime,
        orderCount,
        orderAmount,
        signCount,
        signAmount,
        signRate,
        shipCount,
        shipAmount,
        shipRate,
        transitCount,
        transitAmount,
        transitRate,
        rejectCount,
        rejectAmount,
        rejectRate,
        returnCount,
        returnAmount,
        returnRate,
        isCurrentUser: user.id === currentUser?.userId
      });
    }

    // 排序
    const sortField = sortBy === 'signAmount' ? 'signAmount' :
                      sortBy === 'signRate' ? 'signRate' :
                      sortBy === 'orderCount' ? 'orderCount' : 'orderAmount';
    memberStats.sort((a, b) => b[sortField] - a[sortField]);

    // 计算团队汇总
    const totalOrderCount = memberStats.reduce((sum, m) => sum + m.orderCount, 0);
    const totalOrderAmount = memberStats.reduce((sum, m) => sum + m.orderAmount, 0);
    const totalSignCount = memberStats.reduce((sum, m) => sum + m.signCount, 0);
    const totalSignAmount = memberStats.reduce((sum, m) => sum + m.signAmount, 0);
    const avgPerformance = memberStats.length > 0 ? totalOrderAmount / memberStats.length : 0;
    const totalSignRate = totalOrderCount > 0 ? parseFloat(((totalSignCount / totalOrderCount) * 100).toFixed(1)) : 0;

    console.log(`[团队业绩] 汇总统计: 总订单数=${totalOrderCount}, 总金额=${totalOrderAmount}, 成员数=${memberStats.length}`);

    // 分页
    const total = memberStats.length;
    const offset = (page - 1) * limit;
    const paginatedMembers = memberStats.slice(offset, offset + limit);

    res.json({
      success: true,
      code: 200,
      message: '获取团队业绩成功',
      data: {
        members: paginatedMembers,
        total,
        page,
        limit,
        // 团队汇总数据
        summary: {
          totalPerformance: totalOrderAmount,
          totalOrders: totalOrderCount,
          avgPerformance: Math.round(avgPerformance),
          signOrders: totalSignCount,
          signRate: totalSignRate,
          signPerformance: totalSignAmount,
          memberCount: memberStats.length
        }
      }
    });
  } catch (error) {
    console.error('获取团队业绩失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取团队业绩失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis
 * @desc 获取业绩分析数据
 */
router.get('/analysis', async (req: Request, res: Response) => {
  try {
    // 🔥 租户隔离
    const t = tenantSQL('');

    // 获取最近7天趋势
    const trendData = await AppDataSource.query(
      `SELECT DATE(created_at) as date,
              COUNT(*) as orders,
              SUM(total_amount) as amount
       FROM orders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)${t.sql}
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [...t.params]
    );

    // 订单状态分布
    const statusDistribution = await AppDataSource.query(
      `SELECT status, COUNT(*) as count FROM orders WHERE 1=1${t.sql} GROUP BY status`,
      [...t.params]
    );

    // 汇总数据
    const [summary] = await AppDataSource.query(
      `SELECT COUNT(*) as totalOrders,
              SUM(total_amount) as totalAmount,
              AVG(total_amount) as avgOrderAmount
       FROM orders WHERE 1=1${t.sql}`,
      [...t.params]
    );

    res.json({
      success: true,
      code: 200,
      message: '获取业绩分析成功',
      data: {
        trend: trendData,
        statusDistribution,
        summary: {
          totalOrders: summary?.totalOrders || 0,
          totalAmount: summary?.totalAmount || 0,
          avgOrderAmount: Math.round(summary?.avgOrderAmount || 0)
        }
      }
    });
  } catch (error) {
    console.error('获取业绩分析失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩分析失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/personal
 * @desc 获取个人业绩分析数据
 */
router.get('/analysis/personal', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = (req.query.userId as string) || currentUser?.userId;

    // 🔥 修复：同时获取用户名，用于匹配订单
    const [userInfo] = await AppDataSource.query(
      `SELECT id, username FROM users WHERE id = ?`,
      [userId]
    );
    const username = userInfo?.username;

    // 🔥 修复：同时匹配用户ID和用户名 + 租户隔离
    const tAp = tenantSQL('');
    const [stats] = await AppDataSource.query(
      `SELECT
         COUNT(*) as orderCount,
         SUM(total_amount) as orderAmount,
         SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipCount,
         SUM(CASE WHEN status = 'shipped' THEN total_amount ELSE 0 END) as shipAmount,
         SUM(CASE WHEN status IN ('delivered', 'completed') THEN 1 ELSE 0 END) as signCount,
         SUM(CASE WHEN status IN ('delivered', 'completed') THEN total_amount ELSE 0 END) as signAmount,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as rejectCount,
         SUM(CASE WHEN status = 'cancelled' THEN total_amount ELSE 0 END) as rejectAmount,
         SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as returnCount,
         SUM(CASE WHEN status = 'refunded' THEN total_amount ELSE 0 END) as returnAmount
       FROM orders WHERE (created_by = ? OR created_by = ?)${tAp.sql}`,
      [userId, username, ...tAp.params]
    );

    const orderCount = stats?.orderCount || 1;
    res.json({
      success: true,
      data: {
        name: currentUser?.realName || currentUser?.username,
        orderCount: stats?.orderCount || 0,
        orderAmount: stats?.orderAmount || 0,
        shipCount: stats?.shipCount || 0,
        shipAmount: stats?.shipAmount || 0,
        shipRate: ((stats?.shipCount || 0) / orderCount * 100).toFixed(1),
        signCount: stats?.signCount || 0,
        signAmount: stats?.signAmount || 0,
        signRate: ((stats?.signCount || 0) / orderCount * 100).toFixed(1),
        rejectCount: stats?.rejectCount || 0,
        rejectAmount: stats?.rejectAmount || 0,
        rejectRate: ((stats?.rejectCount || 0) / orderCount * 100).toFixed(1),
        returnCount: stats?.returnCount || 0,
        returnAmount: stats?.returnAmount || 0,
        returnRate: ((stats?.returnCount || 0) / orderCount * 100).toFixed(1)
      }
    });
  } catch (error) {
    console.error('获取个人业绩分析失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取个人业绩分析失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/department
 * @desc 获取部门业绩分析数据
 */
router.get('/analysis/department', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const departmentId = (req.query.departmentId as string) || currentUser?.departmentId;

    // 🔥 修复：同时匹配用户ID和用户名，避免遗漏订单 + 租户隔离
    const tDept = tenantSQL('o.');
    const [stats] = await AppDataSource.query(
      `SELECT
         COUNT(o.id) as orderCount,
         SUM(o.total_amount) as orderAmount,
         SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) as shipCount,
         SUM(CASE WHEN o.status IN ('delivered', 'completed') THEN 1 ELSE 0 END) as signCount,
         SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as rejectCount,
         SUM(CASE WHEN o.status = 'refunded' THEN 1 ELSE 0 END) as returnCount
       FROM orders o
       JOIN users u ON (o.created_by = u.id OR o.created_by = u.username)
       WHERE u.department_id = ?${tDept.sql}`,
      [departmentId, ...tDept.params]
    );

    const orderCount = stats?.orderCount || 1;
    res.json({
      success: true,
      code: 200,
      message: '获取部门业绩分析成功',
      data: {
        name: '部门',
        orderCount: stats?.orderCount || 0,
        orderAmount: stats?.orderAmount || 0,
        shipCount: stats?.shipCount || 0,
        shipRate: ((stats?.shipCount || 0) / orderCount * 100).toFixed(1),
        signCount: stats?.signCount || 0,
        signRate: ((stats?.signCount || 0) / orderCount * 100).toFixed(1),
        rejectCount: stats?.rejectCount || 0,
        rejectRate: ((stats?.rejectCount || 0) / orderCount * 100).toFixed(1),
        returnCount: stats?.returnCount || 0,
        returnRate: ((stats?.returnCount || 0) / orderCount * 100).toFixed(1)
      }
    });
  } catch (error) {
    console.error('获取部门业绩分析失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取部门业绩分析失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/company
 * @desc 获取公司业绩分析数据
 */
router.get('/analysis/company', async (_req: Request, res: Response) => {
  try {
    const tComp = tenantSQL('');
    const [stats] = await AppDataSource.query(
      `SELECT
         COUNT(*) as orderCount,
         SUM(total_amount) as orderAmount,
         SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipCount,
         SUM(CASE WHEN status IN ('delivered', 'completed') THEN 1 ELSE 0 END) as signCount,
         SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as rejectCount,
         SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as returnCount
       FROM orders WHERE 1=1${tComp.sql}`,
      [...tComp.params]
    );

    const orderCount = stats?.orderCount || 1;
    res.json({
      success: true,
      code: 200,
      message: '获取公司业绩分析成功',
      data: {
        name: '公司总体',
        orderCount: stats?.orderCount || 0,
        orderAmount: stats?.orderAmount || 0,
        shipCount: stats?.shipCount || 0,
        shipRate: ((stats?.shipCount || 0) / orderCount * 100).toFixed(1),
        signCount: stats?.signCount || 0,
        signRate: ((stats?.signCount || 0) / orderCount * 100).toFixed(1),
        rejectCount: stats?.rejectCount || 0,
        rejectRate: ((stats?.rejectCount || 0) / orderCount * 100).toFixed(1),
        returnCount: stats?.returnCount || 0,
        returnRate: ((stats?.returnCount || 0) / orderCount * 100).toFixed(1)
      }
    });
  } catch (error) {
    console.error('获取公司业绩分析失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取公司业绩分析失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/metrics
 * @desc 获取业绩统计指标（支持日期筛选）
 */
router.get('/analysis/metrics', async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate, departmentId } = req.query;
    const currentUser = (req as any).user;

    let whereClause = '';
    const params: unknown[] = [];
    const conditions: string[] = [];

    // 🔥 租户隔离
    const tMetrics = tenantSQL('o.');
    if (tMetrics.sql) {
      conditions.push(`o.tenant_id = ?`);
      params.push(...tMetrics.params);
    }

    // 🔥 日期筛选
    if (startDate && endDate) {
      conditions.push(`o.created_at >= '${startDate} 00:00:00' AND o.created_at <= '${endDate} 23:59:59'`);
    }

    // 🔥 排除无效订单状态
    conditions.push(`o.status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')`);

    // 🔥 排除预留单（pending_transfer状态且mark_type为reserved的不计入）
    conditions.push(`NOT (o.status = 'pending_transfer' AND o.mark_type = 'reserved')`);

    if (type === 'personal') {
      conditions.push('(o.created_by = ? OR o.created_by = (SELECT username FROM users WHERE id = ?))');
      params.push(currentUser?.userId, currentUser?.userId);
    } else if (type === 'department') {
      const deptId = departmentId || currentUser?.departmentId;
      if (deptId) {
        conditions.push('u.department_id = ?');
        params.push(deptId);
      }
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 🔥 修复：JOIN时同时匹配用户ID和用户名
    const joinClause = type === 'department' || departmentId
      ? 'JOIN users u ON (o.created_by = u.id OR o.created_by = u.username)'
      : '';

    const sql = `SELECT
       SUM(o.total_amount) as totalPerformance,
       COUNT(o.id) as totalOrders,
       SUM(CASE WHEN o.status IN ('shipped', 'delivered') THEN 1 ELSE 0 END) as shipOrders,
       SUM(CASE WHEN o.status IN ('shipped', 'delivered') THEN o.total_amount ELSE 0 END) as shipPerformance,
       SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) as signOrders,
       SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END) as signPerformance
     FROM orders o
     ${joinClause}
     ${whereClause}`;

    const [stats] = await AppDataSource.query(sql, params);

    const totalOrders = stats?.totalOrders || 1;
    const shipOrders = stats?.shipOrders || 0;
    const signOrders = stats?.signOrders || 0;

    res.json({
      success: true,
      code: 200,
      message: '获取业绩统计指标成功',
      data: {
        totalPerformance: stats?.totalPerformance || 0,
        totalOrders: stats?.totalOrders || 0,
        avgPerformance: Math.round((stats?.totalPerformance || 0) / totalOrders),
        shipOrders,
        shipPerformance: stats?.shipPerformance || 0,
        shipRate: parseFloat(((shipOrders / totalOrders) * 100).toFixed(1)),
        signOrders,
        signRate: parseFloat(((signOrders / totalOrders) * 100).toFixed(1)),
        signPerformance: stats?.signPerformance || 0
      }
    });
  } catch (error) {
    console.error('获取业绩统计指标失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩统计指标失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/trend
 * @desc 获取业绩趋势数据
 */
router.get('/analysis/trend', async (req: Request, res: Response) => {
  try {
    const { period = '7d' } = req.query;
    const days = period === '30d' ? 30 : 7;

    const tTrend = tenantSQL('');
    const trendData = await AppDataSource.query(
      `SELECT DATE(created_at) as date,
              SUM(total_amount) as sales,
              COUNT(*) as orders
       FROM orders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)${tTrend.sql}
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [days, ...tTrend.params]
    );

    res.json({ success: true, code: 200, message: '获取业绩趋势成功', data: trendData });
  } catch (error) {
    console.error('获取业绩趋势失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩趋势失败' });
  }
});

/**
 * @route GET /api/v1/performance/analysis/chart-data
 * @desc 获取业绩分析图表数据（业绩趋势和订单状态分布）
 * @access Private
 *
 * 支持参数：
 * - startDate: 开始日期 (YYYY-MM-DD)
 * - endDate: 结束日期 (YYYY-MM-DD)
 * - departmentId: 部门ID（可选）
 * - granularity: 数据粒度 (hour/day/month/year)，默认自动判断
 */
router.get('/analysis/chart-data', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, departmentId, granularity } = req.query;
    const _currentUser = (req as any).user;

    console.log(`[业绩图表API] 请求参数: startDate=${startDate}, endDate=${endDate}, departmentId=${departmentId}, granularity=${granularity}`);

    // 🔥 构建基础查询条件
    const conditions: string[] = [];
    const params: any[] = [];

    // 🔥 租户隔离
    const tChart = tenantSQL('');
    if (tChart.sql) {
      conditions.push(`tenant_id = ?`);
      params.push(...tChart.params);
    }

    // 排除无效订单状态
    conditions.push(`status NOT IN ('pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded')`);
    // 排除预留单
    conditions.push(`NOT (status = 'pending_transfer' AND mark_type = 'reserved')`);

    // 日期筛选
    if (startDate && endDate) {
      conditions.push(`created_at >= ? AND created_at <= ?`);
      params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
    }

    // 部门筛选
    if (departmentId) {
      conditions.push(`created_by_department_id = ?`);
      params.push(departmentId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // 🔥 1. 获取业绩趋势数据
    // 根据日期范围自动选择粒度
    let groupByFormat: string;
    let selectFormat: string;
    let autoGranularity = granularity as string;

    if (!autoGranularity) {
      // 自动判断粒度
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 1) {
          autoGranularity = 'hour';
        } else if (daysDiff <= 31) {
          autoGranularity = 'day';
        } else if (daysDiff <= 365) {
          autoGranularity = 'month';
        } else {
          autoGranularity = 'year';
        }
      } else {
        autoGranularity = 'year'; // 默认按年
      }
    }

    switch (autoGranularity) {
      case 'hour':
        selectFormat = `DATE_FORMAT(created_at, '%Y-%m-%d %H:00') as period`;
        groupByFormat = `DATE_FORMAT(created_at, '%Y-%m-%d %H:00')`;
        break;
      case 'day':
        selectFormat = `DATE(created_at) as period`;
        groupByFormat = `DATE(created_at)`;
        break;
      case 'month':
        selectFormat = `DATE_FORMAT(created_at, '%Y-%m') as period`;
        groupByFormat = `DATE_FORMAT(created_at, '%Y-%m')`;
        break;
      case 'year':
      default:
        selectFormat = `YEAR(created_at) as period`;
        groupByFormat = `YEAR(created_at)`;
        break;
    }

    // 查询业绩趋势
    const trendSql = `
      SELECT
        ${selectFormat},
        SUM(total_amount) as orderAmount,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as signAmount,
        COUNT(*) as orderCount,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as signCount
      FROM orders
      ${whereClause}
      GROUP BY ${groupByFormat}
      ORDER BY period ASC
    `;

    console.log(`[业绩图表API] 趋势SQL: ${trendSql}`);
    console.log(`[业绩图表API] 参数: ${JSON.stringify(params)}`);

    const trendData = await AppDataSource.query(trendSql, params);

    console.log(`[业绩图表API] 趋势数据条数: ${trendData.length}`);
    if (trendData.length > 0) {
      console.log(`[业绩图表API] 趋势数据示例:`, trendData.slice(0, 3));
    }

    // 🔥 2. 获取订单状态分布
    const statusSql = `
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_amount) as amount
      FROM orders
      ${whereClause}
      GROUP BY status
      ORDER BY count DESC
    `;

    const statusData = await AppDataSource.query(statusSql, params);

    // 状态名称映射
    const statusNames: Record<string, string> = {
      'pending_transfer': '待流转',
      'pending_audit': '待审核',
      'audit_rejected': '审核拒绝',
      'pending_shipment': '待发货',
      'shipped': '已发货',
      'delivered': '已签收',
      'logistics_returned': '物流部退回',
      'logistics_cancelled': '物流部取消',
      'package_exception': '包裹异常',
      'rejected': '拒收',
      'rejected_returned': '拒收已退回',
      'after_sales_created': '已建售后',
      'pending_cancel': '待取消',
      'cancel_failed': '取消失败',
      'cancelled': '已取消',
      'draft': '草稿',
      'refunded': '已退款',
      'pending': '待审核',
      'paid': '已付款',
      'completed': '已完成',
      'signed': '已签收'
    };

    const orderStatusDistribution = statusData.map((item: any) => ({
      name: statusNames[item.status] || item.status,
      value: parseInt(item.count) || 0,
      amount: parseFloat(item.amount) || 0,
      status: item.status
    }));

    // 🔥 3. 格式化趋势数据
    const performanceTrend = {
      xAxis: trendData.map((item: any) => {
        let period = item.period;
        // 🔥 修复：处理 MySQL 返回的 Date 对象，转换为字符串
        if (period instanceof Date) {
          period = period.toISOString().split('T')[0]; // 转换为 YYYY-MM-DD 格式
        } else if (typeof period === 'object' && period !== null) {
          // 处理其他可能的日期对象格式
          period = String(period);
        }

        if (autoGranularity === 'year') {
          return `${period}年`;
        } else if (autoGranularity === 'month') {
          const parts = String(period).split('-');
          return `${parseInt(parts[1])}月`;
        } else if (autoGranularity === 'day') {
          const parts = String(period).split('-');
          return `${parseInt(parts[1])}/${parseInt(parts[2])}`;
        } else {
          // hour
          const periodStr = String(period);
          return periodStr.split(' ')[1] || periodStr;
        }
      }),
      orderData: trendData.map((item: any) => parseFloat(item.orderAmount) || 0),
      signData: trendData.map((item: any) => parseFloat(item.signAmount) || 0),
      // 原始数据，方便前端进一步处理
      rawData: trendData.map((item: any) => ({
        period: item.period,
        orderAmount: parseFloat(item.orderAmount) || 0,
        signAmount: parseFloat(item.signAmount) || 0,
        orderCount: parseInt(item.orderCount) || 0,
        signCount: parseInt(item.signCount) || 0
      }))
    };

    res.json({
      success: true,
      code: 200,
      message: '获取业绩图表数据成功',
      data: {
        performanceTrend,
        orderStatusDistribution,
        granularity: autoGranularity
      }
    });
  } catch (error) {
    console.error('获取业绩图表数据失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取业绩图表数据失败' });
  }
});

export default router;
