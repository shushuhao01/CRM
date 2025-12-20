import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Call } from '../entities/Call';
import { FollowUp } from '../entities/FollowUp';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticateToken);

// ==================== 通话统计 ====================

// 获取通话统计数据
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId, department } = req.query;
    const callRepository = AppDataSource.getRepository(Call);

    const queryBuilder = callRepository.createQueryBuilder('call');

    if (startDate && endDate) {
      queryBuilder.where('call.startTime BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    if (userId) {
      queryBuilder.andWhere('call.userId = :userId', { userId });
    }

    if (department) {
      queryBuilder.andWhere('call.department = :department', { department });
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
    console.error('获取通话统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话统计数据失败'
    });
  }
});

// ==================== 通话记录 ====================

// 获取通话记录列表
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

    const callRepository = AppDataSource.getRepository(Call);
    const queryBuilder = callRepository.createQueryBuilder('call');

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

    if (userId) {
      queryBuilder.andWhere('call.userId = :userId', { userId });
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
    console.error('获取通话记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录列表失败'
    });
  }
});

// 获取单个通话记录
router.get('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = AppDataSource.getRepository(Call);

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
    console.error('获取通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录失败'
    });
  }
});

// 创建通话记录
router.post('/records', async (req: Request, res: Response) => {
  try {
    const callRepository = AppDataSource.getRepository(Call);
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
    console.error('创建通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建通话记录失败'
    });
  }
});

// 更新通话记录
router.put('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = AppDataSource.getRepository(Call);

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
    console.error('更新通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通话记录失败'
    });
  }
});

// 结束通话
router.put('/records/:id/end', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endTime, duration, notes, followUpRequired } = req.body;
    const callRepository = AppDataSource.getRepository(Call);

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
    console.error('结束通话失败:', error);
    res.status(500).json({
      success: false,
      message: '结束通话失败'
    });
  }
});

// 删除通话记录
router.delete('/records/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = AppDataSource.getRepository(Call);

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
    console.error('删除通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除通话记录失败'
    });
  }
});

// ==================== 外呼功能 ====================

// 发起外呼
router.post('/outbound', async (req: Request, res: Response) => {
  try {
    const callRepository = AppDataSource.getRepository(Call);
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
    console.error('发起外呼失败:', error);
    res.status(500).json({
      success: false,
      message: '发起外呼失败'
    });
  }
});

// ==================== 跟进记录 ====================

// 获取跟进记录列表
router.get('/followups', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      customerId,
      callId,
      status,
      priority,
      userId,
      startDate,
      endDate
    } = req.query;

    const followUpRepository = AppDataSource.getRepository(FollowUp);
    const queryBuilder = followUpRepository.createQueryBuilder('followup');

    if (customerId) {
      queryBuilder.andWhere('followup.customerId = :customerId', { customerId });
    }

    if (callId) {
      queryBuilder.andWhere('followup.callId = :callId', { callId });
    }

    if (status) {
      queryBuilder.andWhere('followup.status = :status', { status });
    }

    if (priority) {
      queryBuilder.andWhere('followup.priority = :priority', { priority });
    }

    if (userId) {
      queryBuilder.andWhere('followup.createdBy = :userId', { userId });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('followup.createdAt BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    queryBuilder.orderBy('followup.createdAt', 'DESC');

    const total = await queryBuilder.getCount();

    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const records = await queryBuilder.getMany();

    res.json({
      success: true,
      data: {
        records,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取跟进记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取跟进记录列表失败'
    });
  }
});

// 创建跟进记录
router.post('/followups', async (req: Request, res: Response) => {
  try {
    const followUpRepository = AppDataSource.getRepository(FollowUp);
    const currentUser = (req as any).user;
    const {
      callId,
      customerId,
      customerName,
      type = 'call',
      content,
      nextFollowUpDate,
      priority = 'medium',
      status = 'pending'
    } = req.body;

    const followUp = followUpRepository.create({
      id: `followup_${Date.now()}_${uuidv4().substring(0, 8)}`,
      callId,
      customerId,
      customerName,
      type,
      content,
      nextFollowUp: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      priority,
      status,
      createdBy: currentUser?.userId || currentUser?.id,
      createdByName: currentUser?.realName || currentUser?.username || '未知用户'
    });

    const savedFollowUp = await followUpRepository.save(followUp);

    res.status(201).json({
      success: true,
      message: '跟进记录创建成功',
      data: savedFollowUp
    });
  } catch (error) {
    console.error('创建跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建跟进记录失败'
    });
  }
});

// 更新跟进记录
router.put('/followups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const followUpRepository = AppDataSource.getRepository(FollowUp);

    const record = await followUpRepository.findOne({ where: { id } });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: '跟进记录不存在'
      });
    }

    const updateData = req.body;
    if (updateData.nextFollowUpDate) {
      updateData.nextFollowUp = new Date(updateData.nextFollowUpDate);
      delete updateData.nextFollowUpDate;
    }

    Object.assign(record, updateData);
    const savedRecord = await followUpRepository.save(record);

    res.json({
      success: true,
      message: '跟进记录更新成功',
      data: savedRecord
    });
  } catch (error) {
    console.error('更新跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新跟进记录失败'
    });
  }
});

// 删除跟进记录
router.delete('/followups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const followUpRepository = AppDataSource.getRepository(FollowUp);

    const result = await followUpRepository.delete(id);

    if (result.affected === 0) {
      return res.status(404).json({
        success: false,
        message: '跟进记录不存在'
      });
    }

    res.json({
      success: true,
      message: '跟进记录删除成功'
    });
  } catch (error) {
    console.error('删除跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除跟进记录失败'
    });
  }
});

// ==================== 录音管理 ====================

// 获取录音列表
router.get('/recordings', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      callId,
      customerId,
      startDate,
      endDate
    } = req.query;

    const callRepository = AppDataSource.getRepository(Call);
    const queryBuilder = callRepository.createQueryBuilder('call')
      .where('call.hasRecording = :hasRecording', { hasRecording: true });

    if (callId) {
      queryBuilder.andWhere('call.id = :callId', { callId });
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

    queryBuilder.orderBy('call.startTime', 'DESC');

    const total = await queryBuilder.getCount();

    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const records = await queryBuilder.getMany();

    // 转换为录音格式
    const recordings = records.map(record => ({
      id: `rec_${record.id}`,
      callId: record.id,
      customerName: record.customerName,
      customerPhone: record.customerPhone,
      userName: record.userName,
      startTime: record.startTime,
      duration: record.duration,
      fileSize: record.duration * 8000, // 估算文件大小
      recordingUrl: record.recordingUrl || `/api/calls/recordings/${record.id}/stream`,
      status: 'normal',
      format: 'mp3',
      quality: { score: 4 }
    }));

    res.json({
      success: true,
      data: {
        recordings,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取录音列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取录音列表失败'
    });
  }
});

// 下载录音
router.get('/recordings/:id/download', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 实际项目中应该返回真实的录音文件
    // 这里返回一个模拟响应
    res.json({
      success: true,
      data: {
        url: `/recordings/${id}.mp3`,
        filename: `recording_${id}.mp3`
      }
    });
  } catch (error) {
    console.error('下载录音失败:', error);
    res.status(500).json({
      success: false,
      message: '下载录音失败'
    });
  }
});

// 删除录音
router.delete('/recordings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const callRepository = AppDataSource.getRepository(Call);

    // 从录音ID提取通话ID
    const callId = id.replace('rec_', '');
    const record = await callRepository.findOne({ where: { id: callId } });

    if (record) {
      record.hasRecording = false;
      record.recordingUrl = null;
      await callRepository.save(record);
    }

    res.json({
      success: true,
      message: '录音删除成功'
    });
  } catch (error) {
    console.error('删除录音失败:', error);
    res.status(500).json({
      success: false,
      message: '删除录音失败'
    });
  }
});

// ==================== 电话配置 ====================

// 获取电话配置
router.get('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { userId } = req.query;

    // 返回默认配置（实际项目中应该从数据库读取）
    const config = {
      id: `config_${userId || currentUser?.userId}`,
      userId: userId || currentUser?.userId,
      sipServer: '',
      sipUsername: '',
      sipPassword: '',
      displayNumber: '',
      autoRecord: true,
      recordingQuality: 'medium',
      maxCallDuration: 3600,
      enableCallTransfer: true,
      enableConference: false,
      isActive: true,
      // 扩展配置
      sip: {
        server: '',
        port: 5060,
        username: '',
        password: '',
        domain: '',
        transport: 'udp',
        enableRegister: true,
        registerInterval: 300
      },
      recording: {
        enabled: true,
        format: 'mp3',
        quality: 'medium',
        sampleRate: '16000',
        storagePath: '/recordings',
        autoDelete: false,
        retentionDays: 30,
        compress: true
      },
      quality: {
        enabled: true,
        latencyThreshold: 200,
        packetLossThreshold: 1.0,
        jitterThreshold: 30,
        autoOptimize: true,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      calling: {
        maxCallDuration: 3600,
        callTimeout: 30,
        maxRetries: 3,
        retryInterval: 60,
        autoAnswer: false,
        autoAnswerDelay: 2,
        callForwarding: false,
        forwardingNumber: '',
        blacklistFilter: true
      },
      system: {
        logLevel: 'info',
        logRetentionDays: 7,
        performanceMonitoring: true,
        statisticsReporting: true,
        reportFrequency: 'daily',
        autoBackup: true,
        backupInterval: 'daily',
        apiRateLimit: true,
        rateLimitThreshold: 100
      }
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电话配置失败'
    });
  }
});

// 更新电话配置
router.put('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const configData = req.body;

    // 实际项目中应该保存到数据库
    // 这里返回更新后的配置
    const updatedConfig = {
      id: `config_${currentUser?.userId}`,
      userId: currentUser?.userId,
      ...configData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '电话配置更新成功',
      data: updatedConfig
    });
  } catch (error) {
    console.error('更新电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新电话配置失败'
    });
  }
});

// 测试电话连接
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // 模拟连接测试
    const latency = Math.floor(Math.random() * 100) + 50; // 50-150ms

    res.json({
      success: true,
      data: {
        success: true,
        message: '连接测试成功',
        latency
      }
    });
  } catch (error) {
    console.error('测试连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试连接失败'
    });
  }
});

// ==================== 导出功能 ====================

// 导出通话记录
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // 实际项目中应该生成真实的导出文件
    res.json({
      success: true,
      data: {
        url: `/exports/calls_${Date.now()}.xlsx`,
        filename: `通话记录_${startDate || 'all'}_${endDate || 'all'}.xlsx`
      }
    });
  } catch (error) {
    console.error('导出通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '导出通话记录失败'
    });
  }
});

// 兼容旧的根路径请求 - 转发到records处理
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      limit,
      status,
      startDate,
      endDate,
      keyword
    } = req.query;

    const callRepository = AppDataSource.getRepository(Call);
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
    console.error('获取通话记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通话记录列表失败'
    });
  }
});

export default router;
