/**
 * 管理后台 - 系统公告路由
 * 用于平台级系统公告的 CRUD 和发布
 * 系统公告由管理员发布，可指定目标租户、角色、部门
 */
import { Router, Request, Response } from 'express';
import { getDataSource } from '../../config/database';
import { Announcement, AnnouncementRead } from '../../entities/Announcement';
import { SystemMessage } from '../../entities/SystemMessage';
import { v4 as uuidv4 } from 'uuid';

import { log } from '../../config/logger';
const router = Router();

/**
 * GET /api/v1/admin/announcements
 * 获取系统公告列表
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const { status, type, source, page = 1, pageSize = 20 } = req.query;
    const announcementRepo = dataSource.getRepository(Announcement);

    const qb = announcementRepo.createQueryBuilder('ann')
      .orderBy('ann.is_pinned', 'DESC')
      .addOrderBy('ann.created_at', 'DESC');

    // 管理后台默认只查系统公告，也可查全部
    if (source) {
      qb.andWhere('ann.source = :source', { source });
    } else {
      qb.andWhere("ann.source = 'system'");
    }

    if (status) {
      qb.andWhere('ann.status = :status', { status });
    }
    if (type) {
      qb.andWhere('ann.type = :type', { type });
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    qb.skip(skip).take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    // 获取每个公告的送达和已读统计
    const messageRepo = dataSource.getRepository(SystemMessage);
    const readRepo = dataSource.getRepository(AnnouncementRead);

    const listWithStats = await Promise.all(list.map(async (ann) => {
      let deliveredCount = 0;
      let readCount = 0;

      if (ann.status === 'published') {
        try {
          // 送达人数：发送的系统消息数量（type='announcement' 且 relatedId=公告ID）
          deliveredCount = await messageRepo.count({
            where: { relatedId: ann.id, type: 'announcement' }
          });
          // 已读人数：阅读记录数量
          readCount = await readRepo.count({
            where: { announcementId: ann.id }
          });
        } catch (e) {
          // 统计失败不影响列表返回
        }
      }

      return {
        id: ann.id,
        title: ann.title,
        content: ann.content,
        type: ann.type,
        source: ann.source || 'system',
        priority: ann.priority,
        status: ann.status,
        targetRoles: ann.targetRoles,
        targetDepartments: ann.targetDepartments,
        targetTenants: ann.targetTenants,
        startTime: ann.startTime,
        endTime: ann.endTime,
        isPinned: ann.isPinned === 1,
        isPopup: ann.isPopup === 1,
        isMarquee: ann.isMarquee === 1,
        viewCount: ann.viewCount,
        deliveredCount,
        readCount,
        createdBy: ann.createdBy,
        createdByName: ann.createdByName,
        publishedAt: ann.publishedAt,
        createdAt: ann.createdAt,
        updatedAt: ann.updatedAt
      };
    }));

    res.json({
      success: true,
      data: {
        list: listWithStats,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('[Admin公告] 获取列表失败:', error);
    res.status(500).json({ success: false, message: '获取公告列表失败' });
  }
});

/**
 * POST /api/v1/admin/announcements
 * 创建系统公告
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.status(500).json({ success: false, message: '数据库未连接' });
    }

    const {
      title, content, type, priority,
      targetRoles, targetDepartments, targetTenants,
      startTime, endTime, isPinned, isPopup, isMarquee
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    const currentAdmin = (req as any).adminUser;
    const announcementRepo = dataSource.getRepository(Announcement);

    const announcement = announcementRepo.create({
      id: uuidv4(),
      source: 'system',  // 🔥 管理后台创建的固定为系统公告
      tenantId: null,     // 系统公告不属于任何租户
      title,
      content,
      type: type || 'notice',
      priority: priority || 'normal',
      status: 'draft',
      targetRoles: targetRoles || null,
      targetDepartments: targetDepartments || null,
      targetTenants: targetTenants || null,  // null=全部租户
      startTime: startTime ? new Date(startTime) : null,
      endTime: endTime ? new Date(endTime) : null,
      isPinned: isPinned ? 1 : 0,
      isPopup: isPopup ? 1 : 0,
      isMarquee: isMarquee !== false ? 1 : 0,
      viewCount: 0,
      createdBy: currentAdmin?.id || 'admin',
      createdByName: currentAdmin?.username || '系统管理员'
    } as any);

    await announcementRepo.save(announcement);

    log.info(`[Admin公告] ✅ 创建成功: ${title}`);

    res.json({
      success: true,
      message: '系统公告创建成功',
      data: announcement
    });
  } catch (error: any) {
    log.error('[Admin公告] 创建失败:', error);
    res.status(500).json({ success: false, message: '创建公告失败: ' + (error.message || '未知错误') });
  }
});

/**
 * PUT /api/v1/admin/announcements/:id
 * 更新系统公告
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.status(500).json({ success: false, message: '数据库未连接' });
    }

    const announcementRepo = dataSource.getRepository(Announcement);
    const announcement = await announcementRepo.findOne({
      where: { id, source: 'system' }  // 只能编辑系统公告
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: '系统公告不存在' });
    }

    const {
      title, content, type, priority,
      targetRoles, targetDepartments, targetTenants,
      startTime, endTime, isPinned, isPopup, isMarquee
    } = req.body;

    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (type !== undefined) announcement.type = type;
    if (priority !== undefined) announcement.priority = priority;
    if (targetRoles !== undefined) announcement.targetRoles = targetRoles;
    if (targetDepartments !== undefined) announcement.targetDepartments = targetDepartments;
    if (targetTenants !== undefined) announcement.targetTenants = targetTenants;
    if (startTime !== undefined) announcement.startTime = startTime ? new Date(startTime) : undefined;
    if (endTime !== undefined) announcement.endTime = endTime ? new Date(endTime) : undefined;
    if (isPinned !== undefined) announcement.isPinned = isPinned ? 1 : 0;
    if (isPopup !== undefined) announcement.isPopup = isPopup ? 1 : 0;
    if (isMarquee !== undefined) announcement.isMarquee = isMarquee ? 1 : 0;

    await announcementRepo.save(announcement);

    res.json({
      success: true,
      message: '系统公告更新成功',
      data: announcement
    });
  } catch (error) {
    log.error('[Admin公告] 更新失败:', error);
    res.status(500).json({ success: false, message: '更新公告失败' });
  }
});

/**
 * DELETE /api/v1/admin/announcements/:id
 * 删除系统公告
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.status(500).json({ success: false, message: '数据库未连接' });
    }

    const announcementRepo = dataSource.getRepository(Announcement);
    const result = await announcementRepo.delete({ id, source: 'system' as any });

    if (result.affected === 0) {
      return res.status(404).json({ success: false, message: '系统公告不存在' });
    }

    res.json({ success: true, message: '系统公告删除成功' });
  } catch (error) {
    log.error('[Admin公告] 删除失败:', error);
    res.status(500).json({ success: false, message: '删除公告失败' });
  }
});

/**
 * POST /api/v1/admin/announcements/:id/publish
 * 发布系统公告
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.status(500).json({ success: false, message: '数据库未连接' });
    }

    const announcementRepo = dataSource.getRepository(Announcement);
    const announcement = await announcementRepo.findOne({
      where: { id, source: 'system' }
    });

    if (!announcement) {
      return res.status(404).json({ success: false, message: '系统公告不存在' });
    }

    announcement.status = 'published';
    announcement.publishedAt = new Date();
    await announcementRepo.save(announcement);

    // 🔥 发布后批量创建 system_messages，使公告能送达到用户
    let deliveredCount = 0;
    try {
      const { User } = await import('../../entities/User');
      const userRepo = dataSource.getRepository(User);
      const messageRepo = dataSource.getRepository(SystemMessage);

      // 1. 根据 targetTenants 确定目标租户范围
      let targetUsers: any[] = [];
      if (announcement.targetTenants && announcement.targetTenants.length > 0) {
        // 指定了目标租户 - 只查这些租户的用户
        const { In } = await import('typeorm');
        targetUsers = await userRepo.find({
          where: { status: 'active', tenantId: In(announcement.targetTenants) }
        });
      } else {
        // 全部租户 - 查所有活跃用户
        targetUsers = await userRepo.find({
          where: { status: 'active' }
        });
      }

      // 2. 按角色和部门过滤
      if (announcement.targetRoles && announcement.targetRoles.length > 0) {
        targetUsers = targetUsers.filter((u: any) => announcement.targetRoles?.includes(u.role));
      }
      if (announcement.targetDepartments && announcement.targetDepartments.length > 0) {
        targetUsers = targetUsers.filter((u: any) => announcement.targetDepartments?.includes(u.departmentId));
      }

      // 3. 批量创建系统消息（分批写入，每批500条）
      const BATCH_SIZE = 500;
      for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
        const batch = targetUsers.slice(i, i + BATCH_SIZE);
        const messages = batch.map((user: any) => messageRepo.create({
          id: uuidv4(),
          type: 'announcement',
          title: `📢 ${announcement.title}`,
          content: announcement.content.replace(/<[^>]+>/g, '').substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
          targetUserId: user.id,
          priority: announcement.priority === 'urgent' ? 'high' : 'normal',
          category: 'system',
          relatedId: announcement.id,
          actionUrl: `/system/message?tab=announcement&id=${announcement.id}`,
          isRead: 0,
          tenantId: user.tenantId || null
        }));
        await messageRepo.save(messages);
      }

      deliveredCount = targetUsers.length;
      log.info(`[Admin公告] ✅ 发布成功: ${announcement.title}，已发送给 ${deliveredCount} 个用户`);
    } catch (deliverError) {
      log.error('[Admin公告] ⚠️ 创建系统消息失败（公告已发布）:', deliverError);
    }

    res.json({
      success: true,
      message: `系统公告发布成功，已通知 ${deliveredCount} 个用户`,
      data: {
        id: announcement.id,
        title: announcement.title,
        status: announcement.status,
        publishedAt: announcement.publishedAt,
        targetTenants: announcement.targetTenants,
        deliveredCount
      }
    });
  } catch (error) {
    log.error('[Admin公告] 发布失败:', error);
    res.status(500).json({ success: false, message: '发布公告失败' });
  }
});

/**
 * GET /api/v1/admin/announcements/tenants
 * 获取所有租户列表（用于选择生效范围）
 */
router.get('/tenants', async (_req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) {
      return res.json({ success: true, data: [] });
    }

    // 从 tenants 表获取所有租户（仅 id 和名称）
    const tenants = await dataSource.query(
      `SELECT id, name, code, status FROM tenants WHERE status = 'active' ORDER BY name ASC`
    ).catch(() => []);

    res.json({
      success: true,
      data: tenants
    });
  } catch (error) {
    log.error('[Admin公告] 获取租户列表失败:', error);
    res.json({ success: true, data: [] });
  }
});

export default router;

