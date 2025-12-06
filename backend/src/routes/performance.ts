import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * 业绩分享路由
 * 提供业绩分享相关的API接口
 */

// 所有业绩分享路由都需要认证
router.use(authenticateToken);

// 模拟业绩分享数据存储
const performanceShares: any[] = [];
let shareIdCounter = 1;

/**
 * @route GET /api/v1/performance/shares
 * @desc 获取业绩分享列表
 * @access Private
 */
router.get('/shares', (req, res) => {
  const { page = 1, limit = 10, status, userId, orderId } = req.query;

  let filteredShares = [...performanceShares];

  // 根据状态过滤
  if (status) {
    filteredShares = filteredShares.filter(share => share.status === status);
  }

  // 根据用户ID过滤
  if (userId) {
    filteredShares = filteredShares.filter(share =>
      share.shareMembers.some((member: any) => member.userId === userId) ||
      share.createdById === userId
    );
  }

  // 根据订单ID过滤
  if (orderId) {
    filteredShares = filteredShares.filter(share => share.orderId === orderId);
  }

  // 分页
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit);
  const paginatedShares = filteredShares.slice(startIndex, endIndex);

  res.json({
    success: true,
    data: {
      shares: paginatedShares,
      total: filteredShares.length,
      page: Number(page),
      limit: Number(limit)
    }
  });
});

/**
 * @route GET /api/v1/performance/shares/:id
 * @desc 获取单个业绩分享详情
 * @access Private
 */
router.get('/shares/:id', (req, res) => {
  const { id } = req.params;
  const share = performanceShares.find(s => s.id === id);

  if (!share) {
    return res.status(404).json({
      success: false,
      message: '业绩分享记录不存在'
    });
  }

  return res.json({
    success: true,
    data: share
  });
});

/**
 * @route POST /api/v1/performance/shares
 * @desc 创建业绩分享
 * @access Private
 */
router.post('/shares', (req, res) => {
  const { orderId, orderNumber, orderAmount, shareMembers, description } = req.body;
  const userId = (req as any).user.id;
  const userName = (req as any).user.name;

  // 验证必填字段
  if (!orderId || !orderNumber || !orderAmount || !shareMembers || shareMembers.length === 0) {
    return res.status(400).json({
      success: false,
      message: '缺少必填字段'
    });
  }

  // 验证分成比例总和
  const totalPercentage = shareMembers.reduce((sum: number, member: any) => sum + member.percentage, 0);
  if (totalPercentage !== 100) {
    return res.status(400).json({
      success: false,
      message: '分成比例总和必须为100%'
    });
  }

  // 生成分享编号
  const shareNumber = `SHARE${Date.now()}${shareIdCounter.toString().padStart(3, '0')}`;

  // 计算每个成员的分享金额
  const processedMembers = shareMembers.map((member: any) => ({
    ...member,
    shareAmount: (orderAmount * member.percentage) / 100,
    status: 'pending'
  }));

  const newShare = {
    id: shareIdCounter.toString(),
    shareNumber,
    orderId,
    orderNumber,
    orderAmount,
    shareMembers: processedMembers,
    status: 'active',
    createTime: new Date().toISOString(),
    createdBy: userName,
    createdById: userId,
    description: description || '',
    completedTime: null
  };

  performanceShares.unshift(newShare);
  shareIdCounter++;

  return res.status(201).json({
    success: true,
    data: newShare,
    message: '业绩分享创建成功'
  });
});

/**
 * @route PUT /api/v1/performance/shares/:id
 * @desc 更新业绩分享
 * @access Private
 */
router.put('/shares/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const shareIndex = performanceShares.findIndex(s => s.id === id);
  if (shareIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '业绩分享记录不存在'
    });
  }

  const share = performanceShares[shareIndex];

  // 只有创建者可以更新分享
  if (share.createdById !== (req as any).user.id) {
    return res.status(403).json({
      success: false,
      message: '无权限更新此分享记录'
    });
  }

  // 如果更新分享成员，重新计算分享金额
  if (updates.shareMembers) {
    const totalPercentage = updates.shareMembers.reduce((sum: number, member: any) => sum + member.percentage, 0);
    if (totalPercentage !== 100) {
      return res.status(400).json({
        success: false,
        message: '分成比例总和必须为100%'
      });
    }

    updates.shareMembers = updates.shareMembers.map((member: any) => ({
      ...member,
      shareAmount: (share.orderAmount * member.percentage) / 100
    }));
  }

  performanceShares[shareIndex] = { ...share, ...updates };

  return res.json({
    success: true,
    data: performanceShares[shareIndex],
    message: '业绩分享更新成功'
  });
});

/**
 * @route DELETE /api/v1/performance/shares/:id
 * @desc 取消业绩分享
 * @access Private
 */
router.delete('/shares/:id', (req, res) => {
  const { id } = req.params;

  const shareIndex = performanceShares.findIndex(s => s.id === id);
  if (shareIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '业绩分享记录不存在'
    });
  }

  const share = performanceShares[shareIndex];

  // 只有创建者可以取消分享
  if (share.createdById !== (req as any).user.id) {
    return res.status(403).json({
      success: false,
      message: '无权限取消此分享记录'
    });
  }

  // 只有活跃状态的分享可以取消
  if (share.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: '只能取消活跃状态的分享记录'
    });
  }

  performanceShares[shareIndex].status = 'cancelled';

  return res.json({
    success: true,
    message: '业绩分享已取消'
  });
});

/**
 * @route POST /api/v1/performance/shares/:id/confirm
 * @desc 确认业绩分享
 * @access Private
 */
router.post('/shares/:id/confirm', (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;

  const share = performanceShares.find(s => s.id === id);
  if (!share) {
    return res.status(404).json({
      success: false,
      message: '业绩分享记录不存在'
    });
  }

  const memberIndex = share.shareMembers.findIndex((member: any) => member.userId === userId);
  if (memberIndex === -1) {
    return res.status(403).json({
      success: false,
      message: '您不在此分享记录的成员列表中'
    });
  }

  share.shareMembers[memberIndex].status = 'confirmed';

  // 检查是否所有成员都已确认
  const allConfirmed = share.shareMembers.every((member: any) => member.status === 'confirmed');
  if (allConfirmed) {
    share.status = 'completed';
    share.completedTime = new Date().toISOString();
  }

  return res.json({
    success: true,
    data: share,
    message: '业绩分享确认成功'
  });
});

/**
 * @route POST /api/v1/performance/shares/:id/reject
 * @desc 拒绝业绩分享
 * @access Private
 */
router.post('/shares/:id/reject', (req, res) => {
  const { id } = req.params;
  const userId = (req as any).user.id;
  const { reason } = req.body;

  const share = performanceShares.find(s => s.id === id);
  if (!share) {
    return res.status(404).json({
      success: false,
      message: '业绩分享记录不存在'
    });
  }

  const memberIndex = share.shareMembers.findIndex((member: any) => member.userId === userId);
  if (memberIndex === -1) {
    return res.status(403).json({
      success: false,
      message: '您不在此分享记录的成员列表中'
    });
  }

  share.shareMembers[memberIndex].status = 'rejected';
  share.shareMembers[memberIndex].rejectReason = reason;

  return res.json({
    success: true,
    data: share,
    message: '业绩分享已拒绝'
  });
});

/**
 * @route GET /api/v1/performance/stats
 * @desc 获取业绩分享统计数据
 * @access Private
 */
router.get('/stats', (req, res) => {
  const userId = (req as any).user.id;

  // 计算统计数据
  const totalShares = performanceShares.length;
  const totalAmount = performanceShares.reduce((sum, share) => sum + share.orderAmount, 0);
  const involvedMembers = new Set(
    performanceShares.flatMap(share => share.shareMembers.map((member: any) => member.userId))
  ).size;
  const sharedOrders = performanceShares.length;
  const pendingShares = performanceShares.filter(share => share.status === 'active').length;
  const completedShares = performanceShares.filter(share => share.status === 'completed').length;

  // 用户相关统计
  const userShares = performanceShares.filter(share =>
    share.shareMembers.some((member: any) => member.userId === userId) ||
    share.createdById === userId
  );
  const userTotalAmount = userShares.reduce((sum, share) => {
    const userMember = share.shareMembers.find((member: any) => member.userId === userId);
    return sum + (userMember ? userMember.shareAmount : 0);
  }, 0);

  return res.json({
    success: true,
    data: {
      totalShares,
      totalAmount,
      involvedMembers,
      sharedOrders,
      pendingShares,
      completedShares,
      userStats: {
        totalShares: userShares.length,
        totalAmount: userTotalAmount
      }
    }
  });
});

/**
 * @route GET /api/v1/performance/export
 * @desc 导出业绩分享记录
 * @access Private
 */
router.get('/export', (req, res) => {
  const { format = 'csv', startDate, endDate } = req.query;

  let filteredShares = [...performanceShares];

  // 根据日期范围过滤
  if (startDate) {
    filteredShares = filteredShares.filter(share =>
      new Date(share.createTime) >= new Date(startDate as string)
    );
  }
  if (endDate) {
    filteredShares = filteredShares.filter(share =>
      new Date(share.createTime) <= new Date(endDate as string)
    );
  }

  if (format === 'csv') {
    // 生成CSV格式数据
    const csvHeader = '分享编号,订单编号,订单金额,状态,创建时间,创建人,分享成员,描述\n';
    const csvData = filteredShares.map(share => {
      const members = share.shareMembers.map((member: any) =>
        `${member.userName}(${member.percentage}%)`
      ).join(';');

      return [
        share.shareNumber,
        share.orderNumber,
        share.orderAmount,
        share.status === 'active' ? '活跃' : share.status === 'completed' ? '已完成' : '已取消',
        share.createTime,
        share.createdBy,
        members,
        share.description || ''
      ].map(field => `"${field}"`).join(',');
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="performance_shares.csv"');
    return res.send('\ufeff' + csvHeader + csvData); // 添加BOM以支持中文
  } else {
    // 返回JSON格式
    return res.json({
      success: true,
      data: filteredShares
    });
  }
});

/**
 * @route GET /api/v1/performance/personal
 * @desc 获取个人业绩数据
 * @access Private
 */
router.get('/personal', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    const currentUserId = (req as any).user?.id || userId;

    // 这里应该从数据库获取真实数据
    // 目前返回模拟数据结构
    const personalPerformance = {
      userId: currentUserId,
      userName: `用户${currentUserId}`,
      totalOrders: Math.floor(Math.random() * 100) + 50,
      totalAmount: Math.floor(Math.random() * 500000) + 200000,
      completedOrders: Math.floor(Math.random() * 80) + 40,
      completedAmount: Math.floor(Math.random() * 400000) + 150000,
      pendingOrders: Math.floor(Math.random() * 20) + 5,
      pendingAmount: Math.floor(Math.random() * 100000) + 30000,
      cancelledOrders: Math.floor(Math.random() * 10) + 2,
      cancelledAmount: Math.floor(Math.random() * 50000) + 10000,
      newCustomers: Math.floor(Math.random() * 30) + 10,
      returnRate: (Math.random() * 5 + 1).toFixed(1),
      avgOrderAmount: Math.floor(Math.random() * 5000) + 2000
    };

    res.json({
      success: true,
      data: personalPerformance
    });
  } catch (error) {
    console.error('获取个人业绩失败:', error);
    res.status(500).json({
      success: false,
      message: '获取个人业绩失败'
    });
  }
});

/**
 * @route GET /api/v1/performance/team
 * @desc 获取团队业绩数据
 * @access Private
 */
router.get('/team', async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;

    // 模拟团队成员业绩数据
    const teamMembers = Array.from({ length: 10 }, (_, i) => ({
      userId: `user_${i + 1}`,
      userName: `销售员${i + 1}`,
      department: '销售部',
      totalOrders: Math.floor(Math.random() * 50) + 20,
      totalAmount: Math.floor(Math.random() * 200000) + 80000,
      completedOrders: Math.floor(Math.random() * 40) + 15,
      completedAmount: Math.floor(Math.random() * 150000) + 60000,
      newCustomers: Math.floor(Math.random() * 15) + 5,
      returnRate: (Math.random() * 5 + 1).toFixed(1)
    }));

    const teamPerformance = {
      totalOrders: teamMembers.reduce((sum, m) => sum + m.totalOrders, 0),
      totalAmount: teamMembers.reduce((sum, m) => sum + m.totalAmount, 0),
      completedOrders: teamMembers.reduce((sum, m) => sum + m.completedOrders, 0),
      completedAmount: teamMembers.reduce((sum, m) => sum + m.completedAmount, 0),
      memberCount: teamMembers.length,
      members: teamMembers
    };

    res.json({
      success: true,
      data: teamPerformance
    });
  } catch (error) {
    console.error('获取团队业绩失败:', error);
    res.status(500).json({
      success: false,
      message: '获取团队业绩失败'
    });
  }
});

/**
 * @route GET /api/v1/performance/analysis
 * @desc 获取业绩分析数据
 * @access Private
 */
router.get('/analysis', async (req, res) => {
  try {
    const { type = 'personal', userId, departmentId, startDate, endDate } = req.query;

    // 生成趋势数据
    const trendData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split('T')[0],
        orders: Math.floor(Math.random() * 20) + 5,
        amount: Math.floor(Math.random() * 50000) + 20000
      };
    });

    // 订单状态分布
    const statusDistribution = [
      { status: '已完成', count: Math.floor(Math.random() * 100) + 50, percentage: 60 },
      { status: '进行中', count: Math.floor(Math.random() * 30) + 10, percentage: 20 },
      { status: '待处理', count: Math.floor(Math.random() * 20) + 5, percentage: 15 },
      { status: '已取消', count: Math.floor(Math.random() * 10) + 2, percentage: 5 }
    ];

    const analysisData = {
      trend: trendData,
      statusDistribution,
      summary: {
        totalOrders: Math.floor(Math.random() * 200) + 100,
        totalAmount: Math.floor(Math.random() * 1000000) + 500000,
        avgOrderAmount: Math.floor(Math.random() * 5000) + 3000,
        growthRate: (Math.random() * 20 - 5).toFixed(1)
      }
    };

    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    console.error('获取业绩分析失败:', error);
    res.status(500).json({
      success: false,
      message: '获取业绩分析失败'
    });
  }
});

/**
 * @route GET /api/v1/performance/analysis/personal
 * @desc 获取个人业绩分析数据
 * @access Private
 */
router.get('/analysis/personal', (req, res) => {
  const { userId, startDate, endDate } = req.query;
  const currentUserId = (req as any).user.id;
  const targetUserId = userId || currentUserId;

  // 模拟个人业绩分析数据
  const personalAnalysis = {
    name: `用户${targetUserId}`,
    orderCount: Math.floor(Math.random() * 200) + 100,
    orderAmount: Math.floor(Math.random() * 500000) + 300000,
    shipCount: Math.floor(Math.random() * 180) + 90,
    shipAmount: Math.floor(Math.random() * 450000) + 250000,
    shipRate: (Math.random() * 20 + 80).toFixed(1),
    signCount: Math.floor(Math.random() * 160) + 80,
    signAmount: Math.floor(Math.random() * 400000) + 200000,
    signRate: (Math.random() * 15 + 75).toFixed(1),
    transitCount: Math.floor(Math.random() * 20) + 5,
    transitAmount: Math.floor(Math.random() * 50000) + 20000,
    transitRate: (Math.random() * 10 + 5).toFixed(1),
    rejectCount: Math.floor(Math.random() * 15) + 3,
    rejectAmount: Math.floor(Math.random() * 30000) + 10000,
    rejectRate: (Math.random() * 8 + 2).toFixed(1),
    returnCount: Math.floor(Math.random() * 10) + 2,
    returnAmount: Math.floor(Math.random() * 20000) + 5000,
    returnRate: (Math.random() * 5 + 1).toFixed(1)
  };

  res.json({
    success: true,
    data: personalAnalysis
  });
});

/**
 * @route GET /api/v1/performance/analysis/department
 * @desc 获取部门业绩分析数据
 * @access Private
 */
router.get('/analysis/department', (req, res) => {
  const { departmentId, startDate, endDate } = req.query;
  const userDepartmentId = (req as unknown).user.departmentId;
  const targetDepartmentId = departmentId || userDepartmentId;

  // 模拟部门业绩分析数据
  const departmentAnalysis = {
    name: `部门${targetDepartmentId}`,
    orderCount: Math.floor(Math.random() * 1000) + 500,
    orderAmount: Math.floor(Math.random() * 2000000) + 1000000,
    shipCount: Math.floor(Math.random() * 900) + 450,
    shipAmount: Math.floor(Math.random() * 1800000) + 900000,
    shipRate: (Math.random() * 15 + 85).toFixed(1),
    signCount: Math.floor(Math.random() * 800) + 400,
    signAmount: Math.floor(Math.random() * 1600000) + 800000,
    signRate: (Math.random() * 10 + 80).toFixed(1),
    transitCount: Math.floor(Math.random() * 100) + 30,
    transitAmount: Math.floor(Math.random() * 200000) + 100000,
    transitRate: (Math.random() * 8 + 4).toFixed(1),
    rejectCount: Math.floor(Math.random() * 80) + 20,
    rejectAmount: Math.floor(Math.random() * 150000) + 50000,
    rejectRate: (Math.random() * 6 + 2).toFixed(1),
    returnCount: Math.floor(Math.random() * 50) + 10,
    returnAmount: Math.floor(Math.random() * 100000) + 30000,
    returnRate: (Math.random() * 4 + 1).toFixed(1)
  };

  res.json({
    success: true,
    data: departmentAnalysis
  });
});

/**
 * @route GET /api/v1/performance/analysis/company
 * @desc 获取公司业绩分析数据
 * @access Private
 */
router.get('/analysis/company', (req, res) => {
  const { startDate, endDate } = req.query;

  // 模拟公司业绩分析数据
  const companyAnalysis = {
    name: '公司总体',
    orderCount: Math.floor(Math.random() * 5000) + 2000,
    orderAmount: Math.floor(Math.random() * 10000000) + 5000000,
    shipCount: Math.floor(Math.random() * 4500) + 1800,
    shipAmount: Math.floor(Math.random() * 9000000) + 4500000,
    shipRate: (Math.random() * 10 + 88).toFixed(1),
    signCount: Math.floor(Math.random() * 4000) + 1600,
    signAmount: Math.floor(Math.random() * 8000000) + 4000000,
    signRate: (Math.random() * 8 + 85).toFixed(1),
    transitCount: Math.floor(Math.random() * 500) + 150,
    transitAmount: Math.floor(Math.random() * 1000000) + 500000,
    transitRate: (Math.random() * 6 + 3).toFixed(1),
    rejectCount: Math.floor(Math.random() * 400) + 100,
    rejectAmount: Math.floor(Math.random() * 800000) + 200000,
    rejectRate: (Math.random() * 4 + 2).toFixed(1),
    returnCount: Math.floor(Math.random() * 200) + 50,
    returnAmount: Math.floor(Math.random() * 500000) + 100000,
    returnRate: (Math.random() * 3 + 1).toFixed(1)
  };

  res.json({
    success: true,
    data: companyAnalysis
  });
});

/**
 * @route GET /api/v1/performance/analysis/metrics
 * @desc 获取业绩统计指标
 * @access Private
 */
router.get('/analysis/metrics', (req, res) => {
  const { type, userId, departmentId, startDate, endDate } = req.query;

  // 根据类型生成不同的统计指标
  let metrics;

  if (type === 'personal') {
    const totalPerformance = Math.floor(Math.random() * 500000) + 300000;
    const totalOrders = Math.floor(Math.random() * 200) + 100;
    const signOrders = Math.floor(totalOrders * (0.8 + Math.random() * 0.15));
    const signRate = ((signOrders / totalOrders) * 100).toFixed(1);
    const signPerformance = Math.floor(totalPerformance * (signOrders / totalOrders));

    metrics = {
      totalPerformance,
      totalOrders,
      avgPerformance: Math.floor(totalPerformance / totalOrders),
      signOrders,
      signRate: parseFloat(signRate),
      signPerformance
    };
  } else if (type === 'department') {
    const totalPerformance = Math.floor(Math.random() * 2000000) + 1000000;
    const totalOrders = Math.floor(Math.random() * 1000) + 500;
    const signOrders = Math.floor(totalOrders * (0.85 + Math.random() * 0.1));
    const signRate = ((signOrders / totalOrders) * 100).toFixed(1);
    const signPerformance = Math.floor(totalPerformance * (signOrders / totalOrders));

    metrics = {
      totalPerformance,
      totalOrders,
      avgPerformance: Math.floor(totalPerformance / totalOrders),
      signOrders,
      signRate: parseFloat(signRate),
      signPerformance
    };
  } else {
    const totalPerformance = Math.floor(Math.random() * 10000000) + 5000000;
    const totalOrders = Math.floor(Math.random() * 5000) + 2000;
    const signOrders = Math.floor(totalOrders * (0.87 + Math.random() * 0.08));
    const signRate = ((signOrders / totalOrders) * 100).toFixed(1);
    const signPerformance = Math.floor(totalPerformance * (signOrders / totalOrders));

    metrics = {
      totalPerformance,
      totalOrders,
      avgPerformance: Math.floor(totalPerformance / totalOrders),
      signOrders,
      signRate: parseFloat(signRate),
      signPerformance
    };
  }

  res.json({
    success: true,
    data: metrics
  });
});

/**
 * @route GET /api/v1/performance/analysis/trend
 * @desc 获取业绩趋势数据
 * @access Private
 */
router.get('/analysis/trend', (req, res) => {
  const { type, period = '7d', userId, departmentId, startDate, endDate } = req.query;

  // 生成趋势数据
  const periods = period === '30d' ? 30 : period === '7d' ? 7 : 12;
  const trendData = Array.from({ length: periods }, (_, i) => {
    const date = new Date();
    if (period === '30d') {
      date.setDate(date.getDate() - (periods - 1 - i));
    } else if (period === '7d') {
      date.setDate(date.getDate() - (periods - 1 - i));
    } else {
      date.setMonth(date.getMonth() - (periods - 1 - i));
    }

    return {
      date: date.toISOString().split('T')[0],
      sales: Math.floor(Math.random() * 50000) + 20000,
      orders: Math.floor(Math.random() * 50) + 20,
      conversion: (Math.random() * 20 + 70).toFixed(1)
    };
  });

  res.json({
    success: true,
    data: trendData
  });
});

export default router;
