import { Router, Request, Response } from 'express';
import { Call } from '../../entities/Call';
import { getTenantRepo } from '../../utils/tenantRepo';
import { log } from '../../config/logger';

export function registerRecordsRoutes(router: Router) {
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId, department } = req.query;
    const currentUser = (req as any).user;
    const callRepository = getTenantRepo(Call);

    const queryBuilder = callRepository.createQueryBuilder('call');

    if (startDate && endDate) {
      queryBuilder.where('call.startTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 🔥 角色权限过滤
    const userRole = currentUser?.role;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const userDepartment = currentUser?.department;

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 超管和管理员可以看所有数据，支持筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
      if (department) {
        queryBuilder.andWhere('call.department = :department', { department });
      }
    } else if (userRole === 'department_manager') {
      // 部门经理只能看本部门数据
      if (userDepartment) {
        queryBuilder.andWhere('call.department = :department', { department: userDepartment });
      }
      // 支持在部门内按用户筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
    } else {
      // 销售员只能看自己的数据
      queryBuilder.andWhere('call.userId = :userId', { userId: currentUserId });
    }

    const allCalls = await queryBuilder.getMany();

    const totalCalls = allCalls.length;
    const connectedCalls = allCalls.filter(c => c.callStatus === 'connected').length;
    const missedCalls = allCalls.filter(c => c.callStatus === 'missed').length;
    const incomingCalls = allCalls.filter(c => c.callType === 'inbound').length;
    const outgoingCalls = allCalls.filter(c => c.callType === 'outbound').length;
    const totalDuration = allCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const averageDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const connectionRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

    // 按日期分组统计
    const dailyStatsMap = new Map<string, { calls: number; duration: number; connected: number }>();
    allCalls.forEach(call => {
      const date = call.startTime ? new Date(call.startTime).toISOString().split('T')[0] : 'unknown';
      const stats = dailyStatsMap.get(date) || { calls: 0, duration: 0, connected: 0 };
      stats.calls++;
      stats.duration += call.duration || 0;
      if (call.callStatus === 'connected') stats.connected++;
      dailyStatsMap.set(date, stats);
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .filter(([date]) => date !== 'unknown')
      .map(([date, stats]) => ({
        date,
        calls: stats.calls,
        duration: stats.duration,
        connectionRate: stats.calls > 0 ? Math.round((stats.connected / stats.calls) * 100) : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 按用户分组统计
    const userStatsMap = new Map<string, { userId: string; userName: string; calls: number; duration: number; connected: number }>();
    allCalls.forEach(call => {
      const stats = userStatsMap.get(call.userId) || {
        userId: call.userId,
        userName: call.userName || '未知用户',
        calls: 0,
        duration: 0,
        connected: 0
      };
      stats.calls++;
      stats.duration += call.duration || 0;
      if (call.callStatus === 'connected') stats.connected++;
      userStatsMap.set(call.userId, stats);
    });

    const userStats = Array.from(userStatsMap.values()).map(stats => ({
      userId: stats.userId,
      userName: stats.userName,
      calls: stats.calls,
      duration: stats.duration,
      connectionRate: stats.calls > 0 ? Math.round((stats.connected / stats.calls) * 100) : 0
    }));

    // 今日新增
    const today = new Date().toISOString().split('T')[0];
    const todayIncrease = allCalls.filter(c =>
      c.startTime && new Date(c.startTime).toISOString().split('T')[0] === today
    ).length;

    res.json({
      success: true,
      data: {
        totalCalls,
        connectedCalls,
        missedCalls,
        incomingCalls,
        outgoingCalls,
        totalDuration,
        averageDuration,
        connectionRate,
        dailyStats,
        userStats,
        todayIncrease
      }
    });
  } catch (error) {
    log.error('获取通话统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话统计数据失败'
    });
  }
});

router.get('/records', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      customerId,
      callType,
      callStatus,
      status, // 兼容前端的status参数
      startDate,
      endDate,
      userId,
      keyword,
      direction // 兼容前端的direction参数
    } = req.query;

    const currentUser = (req as any).user;
    const callRepository = getTenantRepo(Call);
    const queryBuilder = callRepository.createQueryBuilder('call');

    // 🔥 角色权限过滤
    const userRole = currentUser?.role;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const userDepartment = currentUser?.department;

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 超管和管理员可以看所有数据，支持筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
    } else if (userRole === 'department_manager') {
      // 部门经理只能看本部门数据
      if (userDepartment) {
        queryBuilder.andWhere('call.department = :department', { department: userDepartment });
      }
      // 支持在部门内按用户筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
    } else {
      // 销售员只能看自己的数据
      queryBuilder.andWhere('call.userId = :userId', { userId: currentUserId });
    }

    // 通话类型筛选
    const actualCallType = callType || direction;
    if (actualCallType) {
      const typeMap: Record<string, string> = {
        'incoming': 'inbound',
        'outgoing': 'outbound',
        'inbound': 'inbound',
        'outbound': 'outbound'
      };
      queryBuilder.andWhere('call.callType = :callType', {
        callType: typeMap[actualCallType as string] || actualCallType
      });
    }

    // 通话状态筛选
    const actualStatus = callStatus || status;
    if (actualStatus) {
      queryBuilder.andWhere('call.callStatus = :callStatus', { callStatus: actualStatus });
    }

    if (customerId) {
      queryBuilder.andWhere('call.customerId = :customerId', { customerId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('call.startTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(call.customerName LIKE :keyword OR call.customerPhone LIKE :keyword OR call.notes LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy('call.startTime', 'DESC');

    const total = await queryBuilder.getCount();

    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const records = await queryBuilder.getMany();

    // 转换为前端期望的格式
    const formattedRecords = records.map(record => ({
      ...record,
      direction: record.callType === 'inbound' ? 'incoming' : 'outgoing',
      status: record.callStatus
    }));

    res.json({
      success: true,
      data: {
        records: formattedRecords,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取通话记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录列表失败'
    });
  }
});

router.get('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = getTenantRepo(Call);

    const record = await callRepository.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在'
      });
    }

    res.json({
      success: true,
      data: record
    });
  } catch (error) {
    log.error('获取通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录失败'
    });
  }
});

router.post('/records', async (req: Request, res: Response) => {
  try {
    const callRepository = getTenantRepo(Call);
    const currentUser = (req as any).user;
    const {
      customerId,
      customerName,
      customerPhone,
      callType = 'outbound',
      callStatus = 'connected',
      startTime,
      endTime,
      duration = 0,
      notes,
      followUpRequired = false
    } = req.body;

    const call = callRepository.create({
      id: Call.generateId(),
      customerId,
      customerName,
      customerPhone,
      callType,
      callStatus,
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      duration,
      notes,
      followUpRequired,
      userId: currentUser?.userId || currentUser?.id,
      userName: currentUser?.realName || currentUser?.username || '未知用户',
      department: currentUser?.department || ''
    });

    const savedCall = await callRepository.save(call);

    res.status(201).json({
      success: true,
      message: '通话记录创建成功',
      data: savedCall
    });
  } catch (error) {
    log.error('创建通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建通话记录失败'
    });
  }
});

router.put('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = getTenantRepo(Call);

    const record = await callRepository.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在'
      });
    }

    const updateData = req.body;
    Object.assign(record, updateData);

    const savedRecord = await callRepository.save(record);

    res.json({
      success: true,
      message: '通话记录更新成功',
      data: savedRecord
    });
  } catch (error) {
    log.error('更新通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通话记录失败'
    });
  }
});

router.put('/records/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endTime, duration, notes, followUpRequired } = req.body;
    const callRepository = getTenantRepo(Call);

    const record = await callRepository.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在'
      });
    }

    record.endTime = endTime ? new Date(endTime) : new Date();
    record.duration = duration || 0;
    if (notes) record.notes = notes;
    if (followUpRequired !== undefined) record.followUpRequired = followUpRequired;
    record.callStatus = duration > 0 ? 'connected' : 'missed';

    const savedRecord = await callRepository.save(record);

    res.json({
      success: true,
      message: '通话已结束',
      data: savedRecord
    });
  } catch (error) {
    log.error('结束通话失败:', error);
    res.status(500).json({
      success: false,
      message: '结束通话失败'
    });
  }
});

router.put('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const callRepository = getTenantRepo(Call);

    log.info('[Calls] 更新通话备注:', { callId: id, notes });

    const record = await callRepository.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在'
      });
    }

    record.notes = notes || '';
    record.updatedAt = new Date();

    const savedRecord = await callRepository.save(record);

    log.info('[Calls] 通话备注更新成功:', savedRecord.id);

    res.json({
      success: true,
      message: '备注更新成功',
      data: savedRecord
    });
  } catch (error) {
    log.error('更新通话备注失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备注失败'
    });
  }
});

router.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = getTenantRepo(Call);

    const result = await callRepository.delete(id);

    if (result.affected === 0) {
      return res.status(404).json({
        success: false,
        message: '通话记录不存在'
      });
    }

    res.json({
      success: true,
      message: '通话记录删除成功'
    });
  } catch (error) {
    log.error('删除通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除通话记录失败'
    });
  }
});

router.post('/outbound', async (req: Request, res: Response) => {
  try {
    const callRepository = getTenantRepo(Call);
    const currentUser = (req as any).user;
    const { customerId, customerPhone, customerName, notes } = req.body;

    if (!customerPhone) {
      return res.status(400).json({
        success: false,
        message: '请提供客户电话号码'
      });
    }

    // 创建通话记录
    const call = callRepository.create({
      id: Call.generateId(),
      customerId: customerId || '',
      customerName: customerName || '未知客户',
      customerPhone,
      callType: 'outbound',
      callStatus: 'connected', // 模拟已接通
      startTime: new Date(),
      duration: 0,
      notes,
      followUpRequired: false,
      userId: currentUser?.userId || currentUser?.id,
      userName: currentUser?.realName || currentUser?.username || '未知用户',
      department: currentUser?.department || ''
    });

    const savedCall = await callRepository.save(call);

    res.json({
      success: true,
      data: {
        callId: savedCall.id,
        status: 'calling',
        message: '正在呼叫...'
      }
    });
  } catch (error) {
    log.error('发起外呼失败:', error);
    res.status(500).json({
      success: false,
      message: '发起外呼失败'
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      limit,
      status,
      startDate,
      endDate,
      keyword,
      userId,
      department
    } = req.query;

    const currentUser = (req as any).user;
    const callRepository = getTenantRepo(Call);
    const queryBuilder = callRepository.createQueryBuilder('call');

    if (status) {
      queryBuilder.andWhere('call.callStatus = :status', { status });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('call.startTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(call.customerName LIKE :keyword OR call.customerPhone LIKE :keyword OR call.notes LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    // 🔥 角色权限过滤（与 /statistics 保持一致）
    const userRole = currentUser?.role;
    const currentUserId = currentUser?.userId || currentUser?.id;
    const userDepartment = currentUser?.department;

    if (userRole === 'super_admin' || userRole === 'admin') {
      // 超管和管理员可以看所有数据，支持筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
      if (department) {
        queryBuilder.andWhere('call.department = :department', { department });
      }
    } else if (userRole === 'department_manager') {
      // 部门经理只能看本部门数据
      if (userDepartment) {
        queryBuilder.andWhere('call.department = :department', { department: userDepartment });
      }
      // 支持在部门内按用户筛选
      if (userId) {
        queryBuilder.andWhere('call.userId = :userId', { userId });
      }
    } else {
      // 销售员只能看自己的数据
      queryBuilder.andWhere('call.userId = :userId', { userId: currentUserId });
    }

    queryBuilder.orderBy('call.startTime', 'DESC');

    const total = await queryBuilder.getCount();
    const actualPageSize = Number(limit || pageSize);

    queryBuilder.skip((Number(page) - 1) * actualPageSize);
    queryBuilder.take(actualPageSize);

    const records = await queryBuilder.getMany();

    res.json({
      success: true,
      data: {
        records,
        total,
        page: Number(page),
        pageSize: actualPageSize,
        limit: actualPageSize
      }
    });
  } catch (error) {
    log.error('获取通话记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录列表失败'
    });
  }
});
}
