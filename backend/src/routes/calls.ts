import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Call } from '../entities/Call';
import { FollowUp } from '../entities/FollowUp';
import { v4 as uuidv4 } from 'uuid';
import { recordingStorageService } from '../services/RecordingStorageService';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// 配置multer用于录音文件上传
const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 最大100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的音频格式'));
    }
  }
});

router.use(authenticateToken);

// ==================== 通话统计 ====================

// 获取通话统计数据
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, userId, department } = req.query;
    const currentUser = (req as any).user;
    const callRepository = AppDataSource.getRepository(Call);

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

    const currentUser = (req as any).user;
    const callRepository = AppDataSource.getRepository(Call);
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

// 更新通话备注
router.put('/:id/notes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const callRepository = AppDataSource.getRepository(Call);

    console.log('[Calls] 更新通话备注:', { callId: id, notes });

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

    console.log('[Calls] 通话备注更新成功:', savedRecord.id);

    res.json({
      success: true,
      message: '备注更新成功',
      data: savedRecord
    });
  } catch (error) {
    console.error('更新通话备注失败:', error);
    res.status(500).json({
      success: false,
      message: '更新备注失败'
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
      customerIntent,
      callTags,
      nextFollowUpDate,
      priority = 'medium',
      status = 'pending'
    } = req.body;

    console.log('[Calls] 创建跟进记录请求:', {
      callId,
      customerId,
      customerName,
      type,
      content,
      customerIntent,
      callTags,
      nextFollowUpDate,
      priority,
      status,
      userId: currentUser?.userId || currentUser?.id,
      currentUser: currentUser
    });

    // 验证必要字段
    if (!customerId) {
      console.error('[Calls] 创建跟进记录失败: customerId 为空');
      return res.status(400).json({
        success: false,
        message: '客户ID不能为空'
      });
    }

    if (!content) {
      console.error('[Calls] 创建跟进记录失败: content 为空');
      return res.status(400).json({
        success: false,
        message: '跟进内容不能为空'
      });
    }

    const followUpId = `followup_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const userId = currentUser?.userId || currentUser?.id || 'system';
    const userName = currentUser?.realName || currentUser?.username || '未知用户';

    const followUp = followUpRepository.create({
      id: followUpId,
      callId: callId || null,
      customerId,
      customerName: customerName || '',
      type,
      content,
      customerIntent: customerIntent || null,
      callTags: callTags || null,
      nextFollowUp: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      priority,
      status,
      createdBy: userId,
      createdByName: userName
    });

    console.log('[Calls] 准备保存的跟进记录:', JSON.stringify(followUp, null, 2));

    const savedFollowUp = await followUpRepository.save(followUp);

    console.log('[Calls] 跟进记录保存成功:', savedFollowUp.id);

    // 验证保存结果
    const verifyRecord = await AppDataSource.query(
      `SELECT * FROM follow_up_records WHERE id = ?`,
      [savedFollowUp.id]
    );
    console.log('[Calls] 验证保存的记录:', verifyRecord);

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

// 上传录音文件
router.post('/recordings/upload', recordingUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const file = req.file;
    const { callId, duration, customerId, customerName, customerPhone } = req.body;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: '请上传录音文件'
      });
    }

    if (!callId) {
      return res.status(400).json({
        success: false,
        message: '请提供通话记录ID'
      });
    }

    // 获取文件格式
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') || 'mp3';

    // 保存录音
    const recordingInfo = await recordingStorageService.saveRecording(
      callId,
      file.buffer,
      {
        format: ext,
        duration: parseInt(duration) || 0,
        customerId,
        customerName,
        customerPhone,
        userId: currentUser?.userId || currentUser?.id,
        userName: currentUser?.realName || currentUser?.username
      }
    );

    res.json({
      success: true,
      message: '录音上传成功',
      data: recordingInfo
    });
  } catch (error) {
    console.error('上传录音失败:', error);
    res.status(500).json({
      success: false,
      message: '上传录音失败'
    });
  }
});

// 流式播放录音
router.get('/recordings/stream/*', async (req: Request, res: Response) => {
  try {
    // 获取路径参数
    const recordingPath = req.params[0];

    if (!recordingPath) {
      return res.status(400).json({
        success: false,
        message: '请提供录音路径'
      });
    }

    const result = await recordingStorageService.getRecordingStream(recordingPath);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: '录音文件不存在'
      });
    }

    // 设置响应头
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(result.fileName)}"`);
    res.setHeader('Accept-Ranges', 'bytes');

    // 支持范围请求（用于音频seek）
    const range = req.headers.range;
    if (range && result.stream instanceof fs.ReadStream) {
      const filePath = (result.stream as any).path;
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;

      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else if (result.stream instanceof fs.ReadStream) {
      result.stream.pipe(res);
    } else {
      res.send(result.stream);
    }
  } catch (error) {
    console.error('播放录音失败:', error);
    res.status(500).json({
      success: false,
      message: '播放录音失败'
    });
  }
});

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

    // 优先从call_recordings表查询
    let whereClause = 'is_deleted = 0';
    const params: any[] = [];

    if (callId) {
      whereClause += ' AND call_id = ?';
      params.push(callId);
    }

    if (customerId) {
      whereClause += ' AND customer_id = ?';
      params.push(customerId);
    }

    if (startDate && endDate) {
      whereClause += ' AND created_at BETWEEN ? AND ?';
      params.push(startDate, endDate + ' 23:59:59');
    }

    // 获取总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM call_recordings WHERE ${whereClause}`,
      params
    );
    const total = countResult[0]?.total || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(pageSize);
    const recordings = await AppDataSource.query(
      `SELECT * FROM call_recordings WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    // 如果call_recordings表没有数据，从call_records表查询
    if (recordings.length === 0 && !callId && !customerId) {
      const callRepository = AppDataSource.getRepository(Call);
      const queryBuilder = callRepository.createQueryBuilder('call')
        .where('call.hasRecording = :hasRecording', { hasRecording: true });

      if (startDate && endDate) {
        queryBuilder.andWhere('call.startTime BETWEEN :startDate AND :endDate', {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string + ' 23:59:59')
        });
      }

      queryBuilder.orderBy('call.startTime', 'DESC');
      queryBuilder.skip(offset);
      queryBuilder.take(Number(pageSize));

      const callRecords = await queryBuilder.getMany();
      const callTotal = await queryBuilder.getCount();

      const formattedRecordings = callRecords.map(record => ({
        id: `rec_${record.id}`,
        callId: record.id,
        customerName: record.customerName,
        customerPhone: record.customerPhone,
        userName: record.userName,
        startTime: record.startTime,
        duration: record.duration,
        fileSize: record.duration * 8000, // 估算文件大小
        fileUrl: record.recordingUrl,
        format: 'mp3',
        storageType: 'local',
        createdAt: record.createdAt
      }));

      return res.json({
        success: true,
        data: {
          recordings: formattedRecordings,
          total: callTotal,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      });
    }

    res.json({
      success: true,
      data: {
        recordings: recordings.map((r: any) => ({
          id: r.id,
          callId: r.call_id,
          customerName: r.customer_name,
          customerPhone: r.customer_phone,
          userName: r.user_name,
          fileName: r.file_name,
          filePath: r.file_path,
          fileUrl: r.file_url,
          fileSize: r.file_size,
          duration: r.duration,
          format: r.format,
          storageType: r.storage_type,
          qualityScore: r.quality_score,
          transcription: r.transcription,
          transcriptionStatus: r.transcription_status,
          createdAt: r.created_at
        })),
        total: Number(total),
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

    // 从数据库获取录音信息
    const recordingId = id.startsWith('rec_') ? id : `rec_${id}`;
    const callId = id.replace('rec_', '');

    // 先查call_recordings表
    const records = await AppDataSource.query(
      `SELECT * FROM call_recordings WHERE id = ? OR call_id = ?`,
      [recordingId, callId]
    );

    if (records.length > 0) {
      const record = records[0];

      if (record.storage_type === 'local' && record.file_path) {
        // 本地文件直接下载
        if (fs.existsSync(record.file_path)) {
          res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.file_name)}"`);
          res.setHeader('Content-Type', `audio/${record.format || 'mpeg'}`);
          return fs.createReadStream(record.file_path).pipe(res);
        }
      } else if (record.file_url) {
        // 云存储返回URL
        return res.json({
          success: true,
          data: {
            url: record.file_url,
            filename: record.file_name
          }
        });
      }
    }

    // 查call_records表
    const callRecords = await AppDataSource.query(
      `SELECT * FROM call_records WHERE id = ? AND has_recording = 1`,
      [callId]
    );

    if (callRecords.length > 0 && callRecords[0].recording_url) {
      return res.json({
        success: true,
        data: {
          url: callRecords[0].recording_url,
          filename: `recording_${callId}.mp3`
        }
      });
    }

    res.status(404).json({
      success: false,
      message: '录音文件不存在'
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

    // 使用录音存储服务删除
    const recordingId = id.startsWith('rec_') ? id : `rec_${id}`;
    const success = await recordingStorageService.deleteRecording(recordingId);

    if (!success) {
      // 回退到旧逻辑
      const callRepository = AppDataSource.getRepository(Call);
      const callId = id.replace('rec_', '');
      const record = await callRepository.findOne({ where: { id: callId } });

      if (record) {
        record.hasRecording = false;
        record.recordingUrl = null as any;
        await callRepository.save(record);
      }
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

// 获取录音存储统计
router.get('/recordings/stats', async (req: Request, res: Response) => {
  try {
    const stats = await recordingStorageService.getStorageStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取录音统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取录音统计失败'
    });
  }
});

// ==================== 电话配置 ====================

// 默认电话配置
const getDefaultCallConfig = (userId: string) => ({
  userId,
  callMethod: 'system',
  lineId: '',
  workPhone: '',
  dialMethod: 'direct',
  mobileConfig: {
    platform: 'android',
    sdkInstalled: false,
    deviceAuthorized: false,
    callPermission: false,
    connectionStatus: 'disconnected',
    sdkInfo: {
      version: '1.0.0',
      fileSize: '5.3 MB',
      updateTime: new Date().toISOString().split('T')[0],
      supportedSystems: 'Android 5.0+',
      packageType: 'APK'
    }
  },
  callbackConfig: {
    provider: 'aliyun',
    delay: 3,
    maxRetries: 3
  },
  voipProvider: 'aliyun',
  audioDevice: 'default',
  audioQuality: 'standard',
  aliyunConfig: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    callerNumber: '',
    region: 'cn-hangzhou',
    enableRecording: false,
    recordingBucket: ''
  },
  tencentConfig: {
    secretId: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'ap-beijing'
  },
  huaweiConfig: {
    accessKey: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'cn-north-1'
  },
  callMode: 'manual',
  callInterval: 30,
  maxRetries: 3,
  callTimeout: 60,
  enableRecording: true,
  autoFollowUp: false,
  concurrentCalls: 1,
  priority: 'medium',
  blacklistCheck: true,
  showLocation: true
});

// 获取电话配置
router.get('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const targetUserId = (req.query.userId as string) || currentUser?.userId || currentUser?.id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    // 从数据库查询配置
    const configs = await AppDataSource.query(
      `SELECT * FROM phone_configs WHERE user_id = ? AND config_type = 'call' AND is_active = 1`,
      [targetUserId]
    );

    let config;
    if (configs.length > 0) {
      const dbConfig = configs[0];
      // 解析JSON字段
      config = {
        id: dbConfig.id,
        userId: dbConfig.user_id,
        callMethod: dbConfig.call_method || 'system',
        lineId: dbConfig.line_id || '',
        workPhone: dbConfig.work_phone || '',
        dialMethod: dbConfig.dial_method || 'direct',
        mobileConfig: dbConfig.mobile_config ? (typeof dbConfig.mobile_config === 'string' ? JSON.parse(dbConfig.mobile_config) : dbConfig.mobile_config) : getDefaultCallConfig(targetUserId).mobileConfig,
        callbackConfig: dbConfig.callback_config ? (typeof dbConfig.callback_config === 'string' ? JSON.parse(dbConfig.callback_config) : dbConfig.callback_config) : getDefaultCallConfig(targetUserId).callbackConfig,
        voipProvider: dbConfig.voip_provider || 'aliyun',
        audioDevice: dbConfig.audio_device || 'default',
        audioQuality: dbConfig.audio_quality || 'standard',
        aliyunConfig: dbConfig.aliyun_config ? (typeof dbConfig.aliyun_config === 'string' ? JSON.parse(dbConfig.aliyun_config) : dbConfig.aliyun_config) : getDefaultCallConfig(targetUserId).aliyunConfig,
        tencentConfig: dbConfig.tencent_config ? (typeof dbConfig.tencent_config === 'string' ? JSON.parse(dbConfig.tencent_config) : dbConfig.tencent_config) : getDefaultCallConfig(targetUserId).tencentConfig,
        huaweiConfig: dbConfig.huawei_config ? (typeof dbConfig.huawei_config === 'string' ? JSON.parse(dbConfig.huawei_config) : dbConfig.huawei_config) : getDefaultCallConfig(targetUserId).huaweiConfig,
        callMode: dbConfig.call_mode || 'manual',
        callInterval: dbConfig.call_interval || 30,
        maxRetries: dbConfig.max_retries || 3,
        callTimeout: dbConfig.call_timeout || 60,
        enableRecording: dbConfig.enable_recording === 1,
        autoFollowUp: dbConfig.auto_follow_up === 1,
        concurrentCalls: dbConfig.concurrent_calls || 1,
        priority: dbConfig.priority || 'medium',
        blacklistCheck: dbConfig.blacklist_check === 1,
        showLocation: dbConfig.show_location === 1,
        createdAt: dbConfig.created_at,
        updatedAt: dbConfig.updated_at
      };
    } else {
      // 返回默认配置
      config = getDefaultCallConfig(targetUserId);
    }

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
    const userId = currentUser?.userId || currentUser?.id;
    const configData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    // 检查是否已存在配置
    const existingConfigs = await AppDataSource.query(
      `SELECT id FROM phone_configs WHERE user_id = ? AND config_type = 'call'`,
      [userId]
    );

    const mobileConfig = JSON.stringify(configData.mobileConfig || getDefaultCallConfig(userId).mobileConfig);
    const callbackConfig = JSON.stringify(configData.callbackConfig || getDefaultCallConfig(userId).callbackConfig);
    const aliyunConfig = JSON.stringify(configData.aliyunConfig || getDefaultCallConfig(userId).aliyunConfig);
    const tencentConfig = JSON.stringify(configData.tencentConfig || getDefaultCallConfig(userId).tencentConfig);
    const huaweiConfig = JSON.stringify(configData.huaweiConfig || getDefaultCallConfig(userId).huaweiConfig);

    if (existingConfigs.length > 0) {
      // 更新现有配置
      await AppDataSource.query(
        `UPDATE phone_configs SET
          call_method = ?,
          line_id = ?,
          work_phone = ?,
          dial_method = ?,
          mobile_config = ?,
          callback_config = ?,
          voip_provider = ?,
          audio_device = ?,
          audio_quality = ?,
          aliyun_config = ?,
          tencent_config = ?,
          huawei_config = ?,
          call_mode = ?,
          call_interval = ?,
          max_retries = ?,
          call_timeout = ?,
          enable_recording = ?,
          auto_follow_up = ?,
          concurrent_calls = ?,
          priority = ?,
          blacklist_check = ?,
          show_location = ?,
          is_active = 1,
          updated_at = NOW()
        WHERE user_id = ? AND config_type = 'call'`,
        [
          configData.callMethod || 'system',
          configData.lineId || null,
          configData.workPhone || null,
          configData.dialMethod || 'direct',
          mobileConfig,
          callbackConfig,
          configData.voipProvider || 'aliyun',
          configData.audioDevice || 'default',
          configData.audioQuality || 'standard',
          aliyunConfig,
          tencentConfig,
          huaweiConfig,
          configData.callMode || 'manual',
          configData.callInterval || 30,
          configData.maxRetries || 3,
          configData.callTimeout || 60,
          configData.enableRecording ? 1 : 0,
          configData.autoFollowUp ? 1 : 0,
          configData.concurrentCalls || 1,
          configData.priority || 'medium',
          configData.blacklistCheck ? 1 : 0,
          configData.showLocation ? 1 : 0,
          userId
        ]
      );
    } else {
      // 插入新配置
      await AppDataSource.query(
        `INSERT INTO phone_configs (
          user_id, config_type, call_method, line_id, work_phone, dial_method,
          mobile_config, callback_config, voip_provider, audio_device, audio_quality,
          aliyun_config, tencent_config, huawei_config,
          call_mode, call_interval, max_retries, call_timeout,
          enable_recording, auto_follow_up, concurrent_calls, priority,
          blacklist_check, show_location, is_active
        ) VALUES (?, 'call', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          userId,
          configData.callMethod || 'system',
          configData.lineId || null,
          configData.workPhone || null,
          configData.dialMethod || 'direct',
          mobileConfig,
          callbackConfig,
          configData.voipProvider || 'aliyun',
          configData.audioDevice || 'default',
          configData.audioQuality || 'standard',
          aliyunConfig,
          tencentConfig,
          huaweiConfig,
          configData.callMode || 'manual',
          configData.callInterval || 30,
          configData.maxRetries || 3,
          configData.callTimeout || 60,
          configData.enableRecording ? 1 : 0,
          configData.autoFollowUp ? 1 : 0,
          configData.concurrentCalls || 1,
          configData.priority || 'medium',
          configData.blacklistCheck ? 1 : 0,
          configData.showLocation ? 1 : 0
        ]
      );
    }

    // 返回更新后的配置
    const updatedConfig = {
      userId,
      ...configData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '电话配置保存成功',
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

// ==================== 外呼任务管理 ====================

// 获取外呼任务列表
router.get('/outbound-tasks', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      assignedTo,
      customerLevel,
      keyword
    } = req.query;

    // 从outbound_tasks表查询
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select('*')
      .from('outbound_tasks', 'task');

    if (status) {
      queryBuilder.andWhere('task.status = :status', { status });
    }

    if (assignedTo) {
      queryBuilder.andWhere('task.assigned_to = :assignedTo', { assignedTo });
    }

    if (customerLevel) {
      queryBuilder.andWhere('task.customer_level = :customerLevel', { customerLevel });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(task.customer_name LIKE :keyword OR task.customer_phone LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    queryBuilder.orderBy('task.priority', 'DESC')
      .addOrderBy('task.created_at', 'DESC');

    // 获取总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM outbound_tasks WHERE 1=1
       ${status ? `AND status = '${status}'` : ''}
       ${assignedTo ? `AND assigned_to = '${assignedTo}'` : ''}
       ${customerLevel ? `AND customer_level = '${customerLevel}'` : ''}
       ${keyword ? `AND (customer_name LIKE '%${keyword}%' OR customer_phone LIKE '%${keyword}%')` : ''}`
    );
    const total = countResult[0]?.total || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(pageSize);
    const tasks = await AppDataSource.query(
      `SELECT * FROM outbound_tasks WHERE 1=1
       ${status ? `AND status = '${status}'` : ''}
       ${assignedTo ? `AND assigned_to = '${assignedTo}'` : ''}
       ${customerLevel ? `AND customer_level = '${customerLevel}'` : ''}
       ${keyword ? `AND (customer_name LIKE '%${keyword}%' OR customer_phone LIKE '%${keyword}%')` : ''}
       ORDER BY priority DESC, created_at DESC
       LIMIT ${Number(pageSize)} OFFSET ${offset}`
    );

    res.json({
      success: true,
      data: {
        records: tasks,
        total: Number(total),
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取外呼任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外呼任务列表失败'
    });
  }
});

// 创建外呼任务
router.post('/outbound-tasks', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const {
      customerId,
      customerName,
      customerPhone,
      customerLevel,
      priority = 0,
      source = 'manual',
      assignedTo,
      assignedToName,
      remark
    } = req.body;

    if (!customerId || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: '客户ID和电话号码不能为空'
      });
    }

    const taskId = `task_${Date.now()}_${uuidv4().substring(0, 8)}`;

    await AppDataSource.query(
      `INSERT INTO outbound_tasks
       (id, customer_id, customer_name, customer_phone, customer_level, status, priority, source, assigned_to, assigned_to_name, remark, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, customerId, customerName, customerPhone, customerLevel, priority, source, assignedTo, assignedToName, remark, currentUser?.userId, currentUser?.realName]
    );

    res.status(201).json({
      success: true,
      message: '外呼任务创建成功',
      data: { id: taskId }
    });
  } catch (error) {
    console.error('创建外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建外呼任务失败'
    });
  }
});

// 更新外呼任务状态
router.put('/outbound-tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remark, nextCallTime } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      params.push(remark);
    }
    if (nextCallTime) {
      updates.push('next_call_time = ?');
      params.push(nextCallTime);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    params.push(id);
    await AppDataSource.query(
      `UPDATE outbound_tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: '外呼任务更新成功'
    });
  } catch (error) {
    console.error('更新外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外呼任务失败'
    });
  }
});

// 删除外呼任务
router.delete('/outbound-tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query('DELETE FROM outbound_tasks WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '外呼任务删除成功'
    });
  } catch (error) {
    console.error('删除外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外呼任务失败'
    });
  }
});

// ==================== 外呼线路管理 ====================

// 获取外呼线路列表
router.get('/lines', async (req: Request, res: Response) => {
  try {
    const lines = await AppDataSource.query(
      `SELECT * FROM call_lines ORDER BY sort_order ASC, created_at DESC`
    );

    res.json({
      success: true,
      data: lines
    });
  } catch (error) {
    console.error('获取外呼线路列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外呼线路列表失败'
    });
  }
});

// 创建外呼线路
router.post('/lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const {
      name,
      provider,
      callerNumber,
      config,
      maxConcurrent = 10,
      dailyLimit = 1000,
      sortOrder = 0,
      remark
    } = req.body;

    if (!name || !provider) {
      return res.status(400).json({
        success: false,
        message: '线路名称和服务商不能为空'
      });
    }

    const lineId = `line_${Date.now()}_${uuidv4().substring(0, 8)}`;

    await AppDataSource.query(
      `INSERT INTO call_lines
       (id, name, provider, caller_number, config, status, max_concurrent, daily_limit, sort_order, remark, created_by)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
      [lineId, name, provider, callerNumber, JSON.stringify(config || {}), maxConcurrent, dailyLimit, sortOrder, remark, currentUser?.userId]
    );

    res.status(201).json({
      success: true,
      message: '外呼线路创建成功',
      data: { id: lineId }
    });
  } catch (error) {
    console.error('创建外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '创建外呼线路失败'
    });
  }
});

// 更新外呼线路
router.put('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, provider, callerNumber, config, status, maxConcurrent, dailyLimit, sortOrder, remark } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (provider) { updates.push('provider = ?'); params.push(provider); }
    if (callerNumber !== undefined) { updates.push('caller_number = ?'); params.push(callerNumber); }
    if (config) { updates.push('config = ?'); params.push(JSON.stringify(config)); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (maxConcurrent !== undefined) { updates.push('max_concurrent = ?'); params.push(maxConcurrent); }
    if (dailyLimit !== undefined) { updates.push('daily_limit = ?'); params.push(dailyLimit); }
    if (sortOrder !== undefined) { updates.push('sort_order = ?'); params.push(sortOrder); }
    if (remark !== undefined) { updates.push('remark = ?'); params.push(remark); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    params.push(id);
    await AppDataSource.query(
      `UPDATE call_lines SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    res.json({
      success: true,
      message: '外呼线路更新成功'
    });
  } catch (error) {
    console.error('更新外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外呼线路失败'
    });
  }
});

// 删除外呼线路
router.delete('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query('DELETE FROM call_lines WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '外呼线路删除成功'
    });
  } catch (error) {
    console.error('删除外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外呼线路失败'
    });
  }
});

// ==================== 号码黑名单管理 ====================

// 获取黑名单列表
router.get('/blacklist', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, isActive } = req.query;

    let whereClause = '1=1';
    if (keyword) {
      whereClause += ` AND (phone LIKE '%${keyword}%' OR reason LIKE '%${keyword}%')`;
    }
    if (isActive !== undefined) {
      whereClause += ` AND is_active = ${isActive === 'true' ? 1 : 0}`;
    }

    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM phone_blacklist WHERE ${whereClause}`
    );
    const total = countResult[0]?.total || 0;

    const offset = (Number(page) - 1) * Number(pageSize);
    const records = await AppDataSource.query(
      `SELECT * FROM phone_blacklist WHERE ${whereClause} ORDER BY created_at DESC LIMIT ${Number(pageSize)} OFFSET ${offset}`
    );

    res.json({
      success: true,
      data: {
        records,
        total: Number(total),
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取黑名单列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取黑名单列表失败'
    });
  }
});

// 添加号码到黑名单
router.post('/blacklist', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const { phone, reason, source = 'manual', expireAt } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '电话号码不能为空'
      });
    }

    const blacklistId = `bl_${Date.now()}_${uuidv4().substring(0, 8)}`;

    await AppDataSource.query(
      `INSERT INTO phone_blacklist (id, phone, reason, source, expire_at, is_active, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)
       ON DUPLICATE KEY UPDATE reason = VALUES(reason), is_active = 1, updated_at = NOW()`,
      [blacklistId, phone, reason, source, expireAt, currentUser?.userId, currentUser?.realName]
    );

    res.status(201).json({
      success: true,
      message: '号码已添加到黑名单'
    });
  } catch (error) {
    console.error('添加黑名单失败:', error);
    res.status(500).json({
      success: false,
      message: '添加黑名单失败'
    });
  }
});

// 从黑名单移除号码
router.delete('/blacklist/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query('DELETE FROM phone_blacklist WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '号码已从黑名单移除'
    });
  } catch (error) {
    console.error('移除黑名单失败:', error);
    res.status(500).json({
      success: false,
      message: '移除黑名单失败'
    });
  }
});

// 检查号码是否在黑名单中
router.get('/blacklist/check/:phone', async (req: Request, res: Response) => {
  try {
    const { phone } = req.params;

    const result = await AppDataSource.query(
      `SELECT * FROM phone_blacklist WHERE phone = ? AND is_active = 1 AND (expire_at IS NULL OR expire_at > NOW())`,
      [phone]
    );

    res.json({
      success: true,
      data: {
        isBlacklisted: result.length > 0,
        record: result[0] || null
      }
    });
  } catch (error) {
    console.error('检查黑名单失败:', error);
    res.status(500).json({
      success: false,
      message: '检查黑名单失败'
    });
  }
});

// ==================== 电话配置管理 ====================

// 获取用户电话配置
router.get('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = (req.query.userId as string) || currentUser?.userId || currentUser?.id;

    const configs = await AppDataSource.query(
      `SELECT * FROM phone_configs WHERE user_id = ?`,
      [userId]
    );

    if (configs.length === 0) {
      // 返回默认配置
      return res.json({
        success: true,
        data: {
          userId,
          callMethod: 'system',
          defaultLineId: '',
          workPhone: '',
          dialMethod: 'direct',
          voipProvider: 'aliyun',
          callMode: 'manual',
          callInterval: 30,
          maxRetries: 3,
          callTimeout: 60,
          autoRecord: true,
          autoFollowUp: false,
          concurrentCalls: 1,
          priority: 'medium',
          blacklistCheck: true,
          showLocation: true
        }
      });
    }

    const config = configs[0];
    res.json({
      success: true,
      data: {
        id: config.id,
        userId: config.user_id,
        callMethod: config.call_method,
        defaultLineId: config.default_line_id,
        workPhone: config.work_phone,
        dialMethod: config.dial_method,
        voipProvider: config.voip_provider,
        voipConfig: config.voip_config,
        callMode: config.call_mode,
        callInterval: config.call_interval,
        maxRetries: config.max_retries,
        callTimeout: config.call_timeout,
        autoRecord: config.auto_record === 1,
        autoFollowUp: config.auto_follow_up === 1,
        concurrentCalls: config.concurrent_calls,
        priority: config.priority,
        blacklistCheck: config.blacklist_check === 1,
        showLocation: config.show_location === 1,
        createdAt: config.created_at,
        updatedAt: config.updated_at
      }
    });
  } catch (error) {
    console.error('获取电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电话配置失败'
    });
  }
});

// 保存/更新用户电话配置
router.put('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = req.body.userId || currentUser?.userId || currentUser?.id;
    const {
      callMethod,
      defaultLineId,
      workPhone,
      dialMethod,
      voipProvider,
      voipConfig,
      callMode,
      callInterval,
      maxRetries,
      callTimeout,
      autoRecord,
      autoFollowUp,
      concurrentCalls,
      priority,
      blacklistCheck,
      showLocation
    } = req.body;

    const configId = `config_${userId}`;

    await AppDataSource.query(
      `INSERT INTO phone_configs
       (id, user_id, call_method, default_line_id, work_phone, dial_method,
        voip_provider, voip_config, call_mode, call_interval, max_retries,
        call_timeout, auto_record, auto_follow_up, concurrent_calls, priority,
        blacklist_check, show_location, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
        call_method = VALUES(call_method),
        default_line_id = VALUES(default_line_id),
        work_phone = VALUES(work_phone),
        dial_method = VALUES(dial_method),
        voip_provider = VALUES(voip_provider),
        voip_config = VALUES(voip_config),
        call_mode = VALUES(call_mode),
        call_interval = VALUES(call_interval),
        max_retries = VALUES(max_retries),
        call_timeout = VALUES(call_timeout),
        auto_record = VALUES(auto_record),
        auto_follow_up = VALUES(auto_follow_up),
        concurrent_calls = VALUES(concurrent_calls),
        priority = VALUES(priority),
        blacklist_check = VALUES(blacklist_check),
        show_location = VALUES(show_location),
        updated_at = NOW()`,
      [
        configId,
        userId,
        callMethod || 'system',
        defaultLineId || null,
        workPhone || null,
        dialMethod || 'direct',
        voipProvider || 'aliyun',
        voipConfig ? (typeof voipConfig === 'string' ? voipConfig : JSON.stringify(voipConfig)) : null,
        callMode || 'manual',
        callInterval || 30,
        maxRetries || 3,
        callTimeout || 60,
        autoRecord !== false ? 1 : 0,
        autoFollowUp ? 1 : 0,
        concurrentCalls || 1,
        priority || 'medium',
        blacklistCheck !== false ? 1 : 0,
        showLocation !== false ? 1 : 0
      ]
    );

    res.json({
      success: true,
      message: '配置保存成功'
    });
  } catch (error) {
    console.error('保存电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '保存电话配置失败'
    });
  }
});

// ==================== 外呼线路管理 ====================

// 获取外呼线路列表
router.get('/lines', async (req: Request, res: Response) => {
  try {
    const lines = await AppDataSource.query(
      `SELECT * FROM call_lines ORDER BY sort_order ASC, created_at DESC`
    );

    res.json({
      success: true,
      data: lines.map((line: any) => ({
        id: line.id,
        name: line.name,
        provider: line.provider,
        callerNumber: line.caller_number,
        status: line.status,
        maxConcurrent: line.max_concurrent,
        currentConcurrent: line.current_concurrent,
        dailyLimit: line.daily_limit,
        dailyUsed: line.daily_used,
        totalCalls: line.total_calls,
        totalDuration: line.total_duration,
        successRate: line.success_rate,
        lastUsedAt: line.last_used_at,
        sortOrder: line.sort_order,
        remark: line.remark,
        createdAt: line.created_at,
        updatedAt: line.updated_at
      }))
    });
  } catch (error) {
    console.error('获取外呼线路列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外呼线路列表失败'
    });
  }
});

// 创建外呼线路
router.post('/lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const {
      name,
      provider,
      callerNumber,
      config,
      maxConcurrent = 10,
      dailyLimit = 1000,
      sortOrder = 0,
      remark
    } = req.body;

    if (!name || !provider) {
      return res.status(400).json({
        success: false,
        message: '线路名称和服务商不能为空'
      });
    }

    const lineId = `line_${Date.now()}_${uuidv4().substring(0, 8)}`;

    await AppDataSource.query(
      `INSERT INTO call_lines
       (id, name, provider, caller_number, config, status, max_concurrent, daily_limit, sort_order, remark, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, NOW())`,
      [
        lineId,
        name,
        provider,
        callerNumber || null,
        config ? JSON.stringify(config) : null,
        maxConcurrent,
        dailyLimit,
        sortOrder,
        remark || null,
        currentUser?.userId || currentUser?.id
      ]
    );

    res.status(201).json({
      success: true,
      message: '线路创建成功',
      data: { id: lineId }
    });
  } catch (error) {
    console.error('创建外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '创建外呼线路失败'
    });
  }
});

// 更新外呼线路
router.put('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      provider,
      callerNumber,
      config,
      status,
      maxConcurrent,
      dailyLimit,
      sortOrder,
      remark
    } = req.body;

    const updateFields: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    if (provider !== undefined) {
      updateFields.push('provider = ?');
      updateParams.push(provider);
    }
    if (callerNumber !== undefined) {
      updateFields.push('caller_number = ?');
      updateParams.push(callerNumber);
    }
    if (config !== undefined) {
      updateFields.push('config = ?');
      updateParams.push(config ? JSON.stringify(config) : null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    if (maxConcurrent !== undefined) {
      updateFields.push('max_concurrent = ?');
      updateParams.push(maxConcurrent);
    }
    if (dailyLimit !== undefined) {
      updateFields.push('daily_limit = ?');
      updateParams.push(dailyLimit);
    }
    if (sortOrder !== undefined) {
      updateFields.push('sort_order = ?');
      updateParams.push(sortOrder);
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?');
      updateParams.push(remark);
    }

    updateParams.push(id);

    await AppDataSource.query(
      `UPDATE call_lines SET ${updateFields.join(', ')} WHERE id = ?`,
      updateParams
    );

    res.json({
      success: true,
      message: '线路更新成功'
    });
  } catch (error) {
    console.error('更新外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外呼线路失败'
    });
  }
});

// 删除外呼线路
router.delete('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await AppDataSource.query('DELETE FROM call_lines WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '线路删除成功'
    });
  } catch (error) {
    console.error('删除外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外呼线路失败'
    });
  }
});

// 测试外呼线路
router.post('/lines/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取线路信息
    const lines = await AppDataSource.query(
      `SELECT * FROM call_lines WHERE id = ?`,
      [id]
    );

    if (lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: '线路不存在'
      });
    }

    const line = lines[0];

    // 模拟测试延迟
    const startTime = Date.now();

    // 根据服务商类型进行不同的测试
    // 这里简化处理，实际应该调用对应服务商的API进行测试
    const testResult = {
      success: true,
      latency: 0,
      message: ''
    };

    switch (line.provider) {
      case 'aliyun':
        // 模拟阿里云API测试
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        testResult.latency = Date.now() - startTime;
        testResult.message = '阿里云线路连接正常';
        break;
      case 'tencent':
        // 模拟腾讯云API测试
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        testResult.latency = Date.now() - startTime;
        testResult.message = '腾讯云线路连接正常';
        break;
      case 'system':
      default:
        // 系统默认线路
        await new Promise(resolve => setTimeout(resolve, 50));
        testResult.latency = Date.now() - startTime;
        testResult.message = '系统线路连接正常';
        break;
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        lineId: id,
        lineName: line.name,
        provider: line.provider,
        latency: testResult.latency,
        status: line.status
      }
    });
  } catch (error) {
    console.error('测试外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '测试外呼线路失败'
    });
  }
});

export default router;
