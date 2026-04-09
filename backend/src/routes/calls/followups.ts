import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { FollowUp } from '../../entities/FollowUp';
import { getTenantRepo, tenantSQL } from '../../utils/tenantRepo';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

export function registerFollowupsRoutes(router: Router) {
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

    const followUpRepository = getTenantRepo(FollowUp);
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
    log.error('获取跟进记录列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取跟进记录列表失败'
    });
  }
});

router.post('/followups', async (req: Request, res: Response) => {
  try {
    const followUpRepository = getTenantRepo(FollowUp);
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

    log.info('[Calls] 创建跟进记录请求:', {
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
      log.error('[Calls] 创建跟进记录失败: customerId 为空');
      return res.status(400).json({
        success: false,
        message: '客户ID不能为空'
      });
    }

    if (!content) {
      log.error('[Calls] 创建跟进记录失败: content 为空');
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

    log.info('[Calls] 准备保存的跟进记录:', JSON.stringify(followUp, null, 2));

    const savedFollowUp = await followUpRepository.save(followUp);

    log.info('[Calls] 跟进记录保存成功:', savedFollowUp.id);

    // 验证保存结果
    const tVerify = tenantSQL('');
    const verifyRecord = await AppDataSource.query(
      `SELECT * FROM follow_up_records WHERE id = ?${tVerify.sql}`,
      [savedFollowUp.id, ...tVerify.params]
    );
    log.info('[Calls] 验证保存的记录:', verifyRecord);

    res.status(201).json({
      success: true,
      message: '跟进记录创建成功',
      data: savedFollowUp
    });
  } catch (error) {
    log.error('创建跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '创建跟进记录失败'
    });
  }
});

router.put('/followups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const followUpRepository = getTenantRepo(FollowUp);

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
    log.error('更新跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '更新跟进记录失败'
    });
  }
});

router.delete('/followups/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const followUpRepository = getTenantRepo(FollowUp);

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
    log.error('删除跟进记录失败:', error);
    res.status(500).json({
      success: false,
      message: '删除跟进记录失败'
    });
  }
});
}
