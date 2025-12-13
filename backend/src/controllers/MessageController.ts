import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { MessageSubscription, DepartmentSubscriptionConfig, MessageType, NotificationMethod } from '../entities/MessageSubscription';
import { Department } from '../entities/Department';
import { SystemMessage } from '../entities/SystemMessage';
import { Announcement, AnnouncementRead } from '../entities/Announcement';
import { NotificationChannel, NotificationLog } from '../entities/NotificationChannel';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// 内存存储订阅规则数据（模拟数据库）
const subscriptionRulesStorage: any[] = [
  {
    id: 1,
    departmentId: '1',
    departmentName: '销售部',
    messageTypes: ['order_created', 'payment_reminder'],
    notificationMethods: ['dingtalk', 'email'],
    priority: 'high',
    isEnabled: true,
    scheduleEnabled: false,
    scheduleStart: '',
    scheduleEnd: '',
    excludeWeekends: false,
    remark: '销售部订单相关通知规则',
    createdBy: '张三',
    createdAt: '2024-01-15 10:30:00',
    updatedAt: '2024-01-15 10:30:00'
  },
  {
    id: 2,
    departmentId: '2',
    departmentName: '客服部',
    messageTypes: ['customer_created', 'customer_feedback'],
    notificationMethods: ['wechat_work', 'system_message'],
    priority: 'normal',
    isEnabled: true,
    scheduleEnabled: false,
    scheduleStart: '',
    scheduleEnd: '',
    excludeWeekends: false,
    remark: '客服部客户相关通知',
    createdBy: '李四',
    createdAt: '2024-01-14 14:20:00',
    updatedAt: '2024-01-14 14:20:00'
  },
  {
    id: 3,
    departmentId: '3',
    departmentName: '技术部',
    messageTypes: ['system_maintenance', 'system_alert'],
    notificationMethods: ['dingtalk', 'email', 'sms'],
    priority: 'high',
    isEnabled: true,
    scheduleEnabled: false,
    scheduleStart: '',
    scheduleEnd: '',
    excludeWeekends: false,
    remark: '技术部系统相关通知',
    createdBy: '王五',
    createdAt: '2024-01-13 09:15:00',
    updatedAt: '2024-01-13 09:15:00'
  }
];

// 部门名称映射
const departmentNames: { [key: string]: string } = {
  '1': '销售部',
  '2': '客服部',
  '3': '技术部',
  '4': '财务部',
  '5': '人事部'
};

export class MessageController {

  async getSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟数据
        const mockData = [
          {
            id: 1,
            messageType: MessageType.ORDER_CREATED,
            name: '订单创建通知',
            description: '当有新订单创建时发送通知',
            category: '订单管理',
            isGlobalEnabled: true,
            globalNotificationMethods: [NotificationMethod.DINGTALK, NotificationMethod.EMAIL],
            departmentConfigs: [
              {
                id: 1,
                departmentId: 1,
                departmentName: '销售部',
                isEnabled: true,
                notificationMethods: [NotificationMethod.DINGTALK]
              },
              {
                id: 2,
                departmentId: 2,
                departmentName: '客服部',
                isEnabled: false,
                notificationMethods: [NotificationMethod.EMAIL]
              }
            ]
          },
          {
            id: 2,
            messageType: MessageType.CUSTOMER_CREATED,
            name: '客户创建通知',
            description: '当有新客户注册时发送通知',
            category: '客户管理',
            isGlobalEnabled: true,
            globalNotificationMethods: [NotificationMethod.WECHAT_WORK],
            departmentConfigs: [
              {
                id: 3,
                departmentId: 1,
                departmentName: '销售部',
                isEnabled: true,
                notificationMethods: [NotificationMethod.WECHAT_WORK]
              }
            ]
          }
        ];
        res.json(mockData);
        return;
      }

      const subscriptionRepo = dataSource.getRepository(MessageSubscription);
      const departmentConfigRepo = dataSource.getRepository(DepartmentSubscriptionConfig);

      const subscriptions = await subscriptionRepo.find();
      const departmentConfigs = await departmentConfigRepo.find({
        relations: ['department']
      });

      // 组织数据结构
      const result = subscriptions.map((subscription: MessageSubscription) => ({
        id: subscription.id,
        messageType: subscription.messageType,
        name: subscription.name,
        description: subscription.description,
        category: subscription.category,
        isGlobalEnabled: subscription.isGlobalEnabled,
        globalNotificationMethods: subscription.globalNotificationMethods,
        departmentConfigs: departmentConfigs
          .filter((config: DepartmentSubscriptionConfig) => config.messageType === subscription.messageType)
          .map((config: DepartmentSubscriptionConfig) => ({
            id: config.id,
            departmentId: config.department.id,
            departmentName: config.department.name,
            isEnabled: config.isEnabled,
            notificationMethods: config.notificationMethods
          }))
      }));

      res.json(result);
    } catch (error) {
      console.error('获取订阅配置失败:', error);
      res.status(500).json({ error: '获取订阅配置失败' });
    }
  }

  // 更新全局消息订阅配置
  async updateSubscription(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回成功响应
        res.json({
          success: true,
          message: '订阅配置更新成功（测试模式）'
        });
        return;
      }

      const { isGlobalEnabled, globalNotificationMethods, subscriptions } = req.body;

      const subscriptionRepo = dataSource.getRepository(MessageSubscription);

      // 更新或创建订阅配置
      for (const sub of subscriptions) {
        await subscriptionRepo.save({
          messageType: sub.messageType,
          name: sub.name || sub.messageType,
          description: sub.description || '',
          category: sub.category || '默认',
          isGlobalEnabled: sub.isEnabled,
          globalNotificationMethods: sub.notificationMethods
        });
      }

      res.json({
        success: true,
        message: '消息订阅配置更新成功'
      });
    } catch (error) {
      console.error('更新消息订阅配置失败:', error);
      res.status(500).json({
        success: false,
        message: '更新消息订阅配置失败'
      });
    }
  }

  // 获取部门级别的订阅配置
  async getDepartmentSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { departmentId } = req.params;

      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟数据
        const mockConfigs = [
          {
            id: 1,
            messageType: MessageType.ORDER_CREATED,
            isEnabled: true,
            notificationMethods: [NotificationMethod.DINGTALK],
            department: {
              id: 1,
              name: '销售部'
            }
          },
          {
            id: 2,
            messageType: MessageType.CUSTOMER_CREATED,
            isEnabled: false,
            notificationMethods: [NotificationMethod.EMAIL],
            department: {
              id: 1,
              name: '销售部'
            }
          }
        ];
        res.json(mockConfigs);
        return;
      }

      const departmentConfigRepo = dataSource.getRepository(DepartmentSubscriptionConfig);

      const configs = await departmentConfigRepo.find({
        where: { department: { id: departmentId } },
        relations: ['department']
      });

      res.json(configs);
    } catch (error) {
      console.error('获取部门订阅配置失败:', error);
      res.status(500).json({ error: '获取部门订阅配置失败' });
    }
  }

  // 更新部门级别的订阅配置
  async updateDepartmentSubscription(req: Request, res: Response): Promise<void> {
    try {
      const { messageType, departmentId } = req.params;
      const updateData = req.body;

      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ error: '数据库连接未初始化' });
        return;
      }

      const departmentConfigRepo = dataSource.getRepository(DepartmentSubscriptionConfig);
      const departmentRepo = dataSource.getRepository(Department);

      // 检查部门是否存在
      const department = await departmentRepo.findOne({
        where: { id: departmentId }
      });

      if (!department) {
        res.status(404).json({ error: '部门不存在' });
        return;
      }

      // 查找现有配置
      let config = await departmentConfigRepo.findOne({
        where: { messageType: messageType as MessageType, department: { id: departmentId } },
        relations: ['department']
      });

      if (config) {
        // 更新现有配置
        Object.assign(config, updateData);
        await departmentConfigRepo.save(config);
      } else {
        // 创建新配置
        config = departmentConfigRepo.create({
          messageType: messageType as MessageType,
          department,
          isEnabled: updateData.isEnabled,
          notificationMethods: updateData.notificationMethods
        });

        await departmentConfigRepo.save(config);
      }

      res.json(config);
    } catch (error) {
      console.error('更新部门订阅配置失败:', error);
      res.status(500).json({ error: '更新部门订阅配置失败' });
    }
  }

  // 批量更新部门订阅配置
  async batchUpdateDepartmentSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({
          success: false,
          message: '数据库连接未初始化'
        });
        return;
      }

      const { messageType } = req.params;
      const { configs } = req.body;

      if (!Array.isArray(configs)) {
        res.status(400).json({
          success: false,
          message: '配置数据格式错误'
        });
        return;
      }

      const departmentConfigRepo = dataSource.getRepository(DepartmentSubscriptionConfig);
      const departmentRepo = dataSource.getRepository(Department);

      // 删除现有配置
      await departmentConfigRepo.delete({ messageType: messageType as MessageType });

      // 创建新配置
      const newConfigs = [];
      for (const config of configs) {
        const department = await departmentRepo.findOne({
          where: { id: config.departmentId }
        });

        if (department) {
          newConfigs.push({
            messageType: messageType as MessageType,
            department,
            isEnabled: config.isEnabled,
            notificationMethods: config.notificationMethods
          });
        }
      }

      await departmentConfigRepo.save(newConfigs);

      res.json({
        success: true,
        message: '批量更新部门订阅配置成功'
      });
    } catch (error) {
      console.error('批量更新部门订阅配置失败:', error);
      res.status(500).json({
        success: false,
        message: '批量更新部门订阅配置失败'
      });
    }
  }

  // 初始化默认消息订阅配置
  async initializeDefaultSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ error: '数据库连接未初始化' });
        return;
      }

      const subscriptionRepo = dataSource.getRepository(MessageSubscription);

      // 检查是否已经初始化
      const existingCount = await subscriptionRepo.count();
      if (existingCount > 0) {
        res.json({ message: '默认订阅配置已存在' });
        return;
      }

      // 创建默认订阅配置
      const defaultSubscriptions = [
        {
          messageType: MessageType.ORDER_CREATED,
          name: '订单创建',
          description: '新订单创建时发送通知',
          category: '订单管理',
          isGlobalEnabled: true,
          globalNotificationMethods: [NotificationMethod.EMAIL, NotificationMethod.SYSTEM_MESSAGE]
        },
        {
          messageType: MessageType.CUSTOMER_CREATED,
          name: '客户创建',
          description: '新客户创建时发送通知',
          category: '客户服务',
          isGlobalEnabled: true,
          globalNotificationMethods: [NotificationMethod.EMAIL, NotificationMethod.SYSTEM_MESSAGE]
        },
        {
          messageType: MessageType.SYSTEM_MAINTENANCE,
          name: '系统维护',
          description: '系统维护通知',
          category: '系统管理',
          isGlobalEnabled: true,
          globalNotificationMethods: [NotificationMethod.EMAIL, NotificationMethod.ANNOUNCEMENT, NotificationMethod.SYSTEM_MESSAGE]
        }
      ];

      await subscriptionRepo.save(defaultSubscriptions);

      res.json({
        message: '默认订阅配置初始化成功',
        count: defaultSubscriptions.length
      });
    } catch (error) {
      console.error('初始化默认订阅配置失败:', error);
      res.status(500).json({ error: '初始化默认订阅配置失败' });
    }
  }

  // =====================================================
  // 公告管理相关方法 - 🔥 真实数据库实现
  // =====================================================

  async getAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, data: { list: [], total: 0 } });
        return;
      }

      const { status, type, page = 1, pageSize = 20 } = req.query;
      const announcementRepo = dataSource.getRepository(Announcement);

      const queryBuilder = announcementRepo.createQueryBuilder('ann')
        .orderBy('ann.is_pinned', 'DESC')
        .addOrderBy('ann.created_at', 'DESC');

      if (status) {
        queryBuilder.andWhere('ann.status = :status', { status });
      }
      if (type) {
        queryBuilder.andWhere('ann.type = :type', { type });
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      const [list, total] = await queryBuilder.getManyAndCount();

      // 获取每个公告的送达人数和已读人数
      const messageRepo = dataSource.getRepository(SystemMessage);
      const readRepo = dataSource.getRepository(AnnouncementRead);

      const listWithStats = await Promise.all(list.map(async (ann) => {
        let deliveredCount = 0;
        let readCount = 0;

        if (ann.status === 'published') {
          // 送达人数：发送的系统消息数量
          deliveredCount = await messageRepo.count({
            where: { relatedId: ann.id, type: 'announcement' }
          });
          // 已读人数：阅读记录数量
          readCount = await readRepo.count({
            where: { announcementId: ann.id }
          });
        }

        return {
          id: ann.id,
          title: ann.title,
          content: ann.content,
          type: ann.type,
          priority: ann.priority,
          status: ann.status,
          targetRoles: ann.targetRoles,
          targetDepartments: ann.targetDepartments,
          startTime: ann.startTime,
          endTime: ann.endTime,
          isPinned: ann.isPinned === 1,
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
      console.error('获取公告列表失败:', error);
      res.status(500).json({ success: false, message: '获取公告列表失败' });
    }
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const { title, content, type, priority, targetRoles, targetDepartments, startTime, endTime, isPinned } = req.body;

      if (!title || !content) {
        res.status(400).json({ success: false, message: '标题和内容不能为空' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const announcementRepo = dataSource.getRepository(Announcement);

      const announcement = announcementRepo.create({
        id: uuidv4(),
        title,
        content,
        type: type || 'notice',
        priority: priority || 'normal',
        status: 'draft',
        targetRoles: targetRoles || null,
        targetDepartments: targetDepartments || null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        isPinned: isPinned ? 1 : 0,
        viewCount: 0,
        createdBy: currentUser?.id,
        createdByName: currentUser?.realName || currentUser?.username || '系统'
      });

      await announcementRepo.save(announcement);

      console.log(`[公告] ✅ 创建成功: ${title}`);

      res.json({
        success: true,
        message: '公告创建成功',
        data: announcement
      });
    } catch (error) {
      console.error('创建公告失败:', error);
      res.status(500).json({ success: false, message: '创建公告失败' });
    }
  }

  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const announcementRepo = dataSource.getRepository(Announcement);
      const announcement = await announcementRepo.findOne({ where: { id } });

      if (!announcement) {
        res.status(404).json({ success: false, message: '公告不存在' });
        return;
      }

      const { title, content, type, priority, targetRoles, targetDepartments, startTime, endTime, isPinned } = req.body;

      if (title !== undefined) announcement.title = title;
      if (content !== undefined) announcement.content = content;
      if (type !== undefined) announcement.type = type;
      if (priority !== undefined) announcement.priority = priority;
      if (targetRoles !== undefined) announcement.targetRoles = targetRoles;
      if (targetDepartments !== undefined) announcement.targetDepartments = targetDepartments;
      if (startTime !== undefined) announcement.startTime = startTime ? new Date(startTime) : undefined;
      if (endTime !== undefined) announcement.endTime = endTime ? new Date(endTime) : undefined;
      if (isPinned !== undefined) announcement.isPinned = isPinned ? 1 : 0;

      await announcementRepo.save(announcement);

      res.json({
        success: true,
        message: '公告更新成功',
        data: announcement
      });
    } catch (error) {
      console.error('更新公告失败:', error);
      res.status(500).json({ success: false, message: '更新公告失败' });
    }
  }

  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const announcementRepo = dataSource.getRepository(Announcement);
      const result = await announcementRepo.delete({ id });

      if (result.affected === 0) {
        res.status(404).json({ success: false, message: '公告不存在' });
        return;
      }

      // 同时删除阅读记录
      const readRepo = dataSource.getRepository(AnnouncementRead);
      await readRepo.delete({ announcementId: id });

      res.json({
        success: true,
        message: '公告删除成功'
      });
    } catch (error) {
      console.error('删除公告失败:', error);
      res.status(500).json({
        success: false,
        error: '删除公告失败'
      });
    }
  }

  async publishAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const announcementRepo = dataSource.getRepository(Announcement);
      const announcement = await announcementRepo.findOne({ where: { id } });

      if (!announcement) {
        res.status(404).json({ success: false, message: '公告不存在' });
        return;
      }

      // 更新状态为已发布
      announcement.status = 'published';
      announcement.publishedAt = new Date();

      await announcementRepo.save(announcement);

      // 🔥 发送系统消息给目标用户
      const { User } = await import('../entities/User');
      const userRepo = dataSource.getRepository(User);
      const messageRepo = dataSource.getRepository(SystemMessage);

      // 获取目标用户列表
      let targetUsers: any[] = [];
      if (announcement.targetRoles && announcement.targetRoles.length > 0) {
        // 按角色筛选
        targetUsers = await userRepo.find({
          where: { status: 'active' }
        });
        targetUsers = targetUsers.filter(u => announcement.targetRoles?.includes(u.role));
      } else if (announcement.targetDepartments && announcement.targetDepartments.length > 0) {
        // 按部门筛选
        targetUsers = await userRepo.find({
          where: { status: 'active' }
        });
        targetUsers = targetUsers.filter(u => announcement.targetDepartments?.includes(u.departmentId));
      } else {
        // 全部用户
        targetUsers = await userRepo.find({
          where: { status: 'active' }
        });
      }

      // 批量创建系统消息
      const messages = targetUsers.map(user => messageRepo.create({
        id: uuidv4(),
        type: 'announcement',
        title: `📢 ${announcement.title}`,
        content: announcement.content.substring(0, 200) + (announcement.content.length > 200 ? '...' : ''),
        targetUserId: user.id,
        priority: announcement.priority === 'urgent' ? 'high' : 'normal',
        category: 'system',
        relatedId: announcement.id,
        actionUrl: `/system/message?tab=announcement&id=${announcement.id}`,
        isRead: 0
      }));

      if (messages.length > 0) {
        await messageRepo.save(messages);
        console.log(`[公告] ✅ 发布成功: ${announcement.title}，已发送给 ${messages.length} 个用户`);
      }

      res.json({
        success: true,
        message: `公告发布成功，已通知 ${messages.length} 个用户`,
        data: {
          ...announcement,
          deliveredCount: messages.length
        }
      });
    } catch (error) {
      console.error('发布公告失败:', error);
      res.status(500).json({ success: false, message: '发布公告失败' });
    }
  }

  /**
   * 🔥 获取已发布的公告（供前端展示）
   */
  async getPublishedAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, data: [] });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const userRole = currentUser?.role;
      const userDepartmentId = currentUser?.departmentId;

      const announcementRepo = dataSource.getRepository(Announcement);
      const now = new Date();

      // 查询已发布且在有效期内的公告
      const queryBuilder = announcementRepo.createQueryBuilder('ann')
        .where('ann.status = :status', { status: 'published' })
        .andWhere('(ann.start_time IS NULL OR ann.start_time <= :now)', { now })
        .andWhere('(ann.end_time IS NULL OR ann.end_time >= :now)', { now })
        .orderBy('ann.is_pinned', 'DESC')
        .addOrderBy('ann.published_at', 'DESC')
        .take(20);

      const announcements = await queryBuilder.getMany();

      // 过滤目标角色和部门
      const filteredAnnouncements = announcements.filter(ann => {
        // 如果没有指定目标角色，则所有人可见
        if (!ann.targetRoles || ann.targetRoles.length === 0) {
          // 检查目标部门
          if (!ann.targetDepartments || ann.targetDepartments.length === 0) {
            return true;
          }
          return ann.targetDepartments.includes(userDepartmentId);
        }
        // 检查用户角色是否在目标角色列表中
        if (!ann.targetRoles.includes(userRole)) {
          return false;
        }
        // 检查目标部门
        if (ann.targetDepartments && ann.targetDepartments.length > 0) {
          return ann.targetDepartments.includes(userDepartmentId);
        }
        return true;
      });

      // 获取用户的阅读记录
      const readRepo = dataSource.getRepository(AnnouncementRead);
      const readRecords = await readRepo.find({
        where: { userId: currentUser?.id }
      });
      const readIds = new Set(readRecords.map(r => r.announcementId));

      res.json({
        success: true,
        data: filteredAnnouncements.map(ann => ({
          id: ann.id,
          title: ann.title,
          content: ann.content,
          type: ann.type,
          priority: ann.priority,
          isPinned: ann.isPinned === 1,
          publishedAt: ann.publishedAt,
          isRead: readIds.has(ann.id)
        }))
      });
    } catch (error) {
      console.error('获取已发布公告失败:', error);
      res.status(500).json({ success: false, message: '获取已发布公告失败' });
    }
  }

  /**
   * 🔥 标记公告为已读
   */
  async markAnnouncementAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.json({ success: true });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id;

      if (!userId) {
        res.status(401).json({ success: false, message: '未登录' });
        return;
      }

      const readRepo = dataSource.getRepository(AnnouncementRead);

      // 检查是否已读
      const existing = await readRepo.findOne({
        where: { announcementId: id, userId }
      });

      if (!existing) {
        // 创建阅读记录
        const readRecord = readRepo.create({
          id: uuidv4(),
          announcementId: id,
          userId
        });
        await readRepo.save(readRecord);

        // 更新公告查看次数
        const announcementRepo = dataSource.getRepository(Announcement);
        await announcementRepo.increment({ id }, 'viewCount', 1);
      }

      res.json({ success: true, message: '已标记为已读' });
    } catch (error) {
      console.error('标记公告已读失败:', error);
      res.status(500).json({ success: false, message: '标记公告已读失败' });
    }
  }

  // 订阅规则管理
  async getSubscriptionRules(req: Request, res: Response): Promise<void> {
    try {
      // 获取查询参数
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const departmentId = req.query.departmentId as string;
      const messageType = req.query.messageType as string;
      const status = req.query.status as string;

      // 过滤数据
      let filteredRules = [...subscriptionRulesStorage];

      if (departmentId) {
        filteredRules = filteredRules.filter(rule => rule.departmentId === departmentId);
      }

      if (messageType) {
        filteredRules = filteredRules.filter(rule =>
          rule.messageTypes.includes(messageType)
        );
      }

      if (status !== undefined && status !== '') {
        const isEnabled = status === 'true' || status === '1';
        filteredRules = filteredRules.filter(rule => rule.isEnabled === isEnabled);
      }

      // 分页处理
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginatedRules = filteredRules.slice(start, end);

      res.json({
        success: true,
        data: paginatedRules,
        total: filteredRules.length,
        page,
        pageSize
      });
    } catch (error) {
      console.error('获取订阅规则失败:', error);
      res.status(500).json({ error: '获取订阅规则失败' });
    }
  }

  async createSubscriptionRule(req: Request, res: Response): Promise<void> {
    try {
      const {
        departmentId,
        messageTypes,
        notificationMethods,
        priority,
        scheduleEnabled,
        scheduleStart,
        scheduleEnd,
        excludeWeekends,
        remark
      } = req.body;

      // 验证必填字段
      if (!departmentId || !messageTypes || !Array.isArray(messageTypes) || messageTypes.length === 0) {
        res.status(400).json({
          success: false,
          error: '部门ID和消息类型为必填项'
        });
        return;
      }

      if (!notificationMethods || !Array.isArray(notificationMethods) || notificationMethods.length === 0) {
        res.status(400).json({
          success: false,
          error: '通知方式为必填项'
        });
        return;
      }

      // 生成新的ID
      const newId = Math.max(...subscriptionRulesStorage.map(rule => rule.id), 0) + 1;

      // 获取部门名称
      const departmentName = departmentNames[departmentId] || `部门${departmentId}`;

      // 创建新的订阅规则
      const newRule = {
        id: newId,
        departmentId,
        departmentName,
        messageTypes,
        notificationMethods,
        priority: priority || 'normal',
        isEnabled: true,
        scheduleEnabled: scheduleEnabled || false,
        scheduleStart: scheduleStart || '',
        scheduleEnd: scheduleEnd || '',
        excludeWeekends: excludeWeekends || false,
        remark: remark || '',
        createdBy: '当前用户', // TODO: 从认证信息中获取
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      // 保存到内存存储
      subscriptionRulesStorage.push(newRule);

      res.json({
        success: true,
        message: '订阅规则创建成功',
        data: newRule
      });
    } catch (error) {
      console.error('创建订阅规则失败:', error);
      res.status(500).json({
        success: false,
        error: '创建订阅规则失败'
      });
    }
  }

  async updateSubscriptionRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ruleId = parseInt(id);

      // 查找要更新的规则
      const ruleIndex = subscriptionRulesStorage.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        res.status(404).json({
          success: false,
          error: '订阅规则不存在'
        });
        return;
      }

      const {
        departmentId,
        messageTypes,
        notificationMethods,
        priority,
        scheduleEnabled,
        scheduleStart,
        scheduleEnd,
        excludeWeekends,
        remark
      } = req.body;

      // 获取部门名称
      const departmentName = departmentNames[departmentId] || subscriptionRulesStorage[ruleIndex].departmentName;

      // 更新规则
      const updatedRule = {
        ...subscriptionRulesStorage[ruleIndex],
        departmentId: departmentId || subscriptionRulesStorage[ruleIndex].departmentId,
        departmentName,
        messageTypes: messageTypes || subscriptionRulesStorage[ruleIndex].messageTypes,
        notificationMethods: notificationMethods || subscriptionRulesStorage[ruleIndex].notificationMethods,
        priority: priority || subscriptionRulesStorage[ruleIndex].priority,
        scheduleEnabled: scheduleEnabled !== undefined ? scheduleEnabled : subscriptionRulesStorage[ruleIndex].scheduleEnabled,
        scheduleStart: scheduleStart !== undefined ? scheduleStart : subscriptionRulesStorage[ruleIndex].scheduleStart,
        scheduleEnd: scheduleEnd !== undefined ? scheduleEnd : subscriptionRulesStorage[ruleIndex].scheduleEnd,
        excludeWeekends: excludeWeekends !== undefined ? excludeWeekends : subscriptionRulesStorage[ruleIndex].excludeWeekends,
        remark: remark !== undefined ? remark : subscriptionRulesStorage[ruleIndex].remark,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };

      subscriptionRulesStorage[ruleIndex] = updatedRule;

      res.json({
        success: true,
        message: '订阅规则更新成功',
        data: updatedRule
      });
    } catch (error) {
      console.error('更新订阅规则失败:', error);
      res.status(500).json({
        success: false,
        error: '更新订阅规则失败'
      });
    }
  }

  async deleteSubscriptionRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const ruleId = parseInt(id);

      // 查找要删除的规则
      const ruleIndex = subscriptionRulesStorage.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        res.status(404).json({
          success: false,
          error: '订阅规则不存在'
        });
        return;
      }

      // 删除规则
      subscriptionRulesStorage.splice(ruleIndex, 1);

      res.json({
        success: true,
        message: '订阅规则删除成功'
      });
    } catch (error) {
      console.error('删除订阅规则失败:', error);
      res.status(500).json({
        success: false,
        error: '删除订阅规则失败'
      });
    }
  }

  async toggleSubscriptionRule(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isEnabled } = req.body;
      const ruleId = parseInt(id);

      // 查找要切换状态的规则
      const ruleIndex = subscriptionRulesStorage.findIndex(rule => rule.id === ruleId);
      if (ruleIndex === -1) {
        res.status(404).json({
          success: false,
          error: '订阅规则不存在'
        });
        return;
      }

      // 更新状态
      subscriptionRulesStorage[ruleIndex].isEnabled = isEnabled;
      subscriptionRulesStorage[ruleIndex].updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

      res.json({
        success: true,
        message: `订阅规则已${isEnabled ? '启用' : '禁用'}`,
        data: subscriptionRulesStorage[ruleIndex]
      });
    } catch (error) {
      console.error('切换订阅规则状态失败:', error);
      res.status(500).json({
        success: false,
        error: '切换订阅规则状态失败'
      });
    }
  }

  // 通知配置管理
  async getNotificationConfigs(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟通知配置数据
        const mockConfigs = [
          {
            id: 1,
            methodType: 'email',
            methodName: '邮件通知',
            isEnabled: true,
            supportedDepartments: [
              { id: 1, name: '销售部', isEnabled: true },
              { id: 2, name: '客服部', isEnabled: true },
              { id: 3, name: '物流部', isEnabled: false }
            ],
            selectedMembers: [
              { id: 1, name: '张三', department: '销售部', email: 'zhangsan@company.com' },
              { id: 2, name: '李四', department: '客服部', email: 'lisi@company.com' }
            ],
            settings: {
              smtpHost: 'smtp.company.com',
              smtpPort: 587,
              username: 'noreply@company.com',
              password: '******',
              fromName: 'CRM系统'
            },
            createdBy: '系统管理员',
            createdAt: '2024-01-10 09:00:00',
            updatedAt: '2024-01-15 14:30:00'
          },
          {
            id: 2,
            methodType: 'dingtalk',
            methodName: '钉钉通知',
            isEnabled: true,
            supportedDepartments: [
              { id: 1, name: '销售部', isEnabled: true },
              { id: 2, name: '客服部', isEnabled: false }
            ],
            selectedMembers: [
              { id: 3, name: '王五', department: '销售部', phone: '13800138001' }
            ],
            settings: {
              webhook: 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
              secret: 'SEC***'
            },
            createdBy: '系统管理员',
            createdAt: '2024-01-12 10:15:00',
            updatedAt: '2024-01-14 16:45:00'
          },
          {
            id: 3,
            methodType: 'wechat_work',
            methodName: '企业微信群机器人',
            isEnabled: true,
            supportedDepartments: [
              { id: 1, name: '销售部', isEnabled: true },
              { id: 3, name: '技术部', isEnabled: true }
            ],
            selectedMembers: [
              { id: 4, name: '赵六', department: '技术部', phone: '13800138004' },
              { id: 5, name: '钱七', department: '销售部', phone: '13800138005' }
            ],
            settings: {
              webhook: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
              groupName: '技术部通知群',
              mentionAll: false,
              mentionedList: '13800138004,13800138005'
            },
            createdBy: '系统管理员',
            createdAt: '2024-01-13 11:20:00',
            updatedAt: '2024-01-16 09:15:00'
          },
          {
            id: 4,
            methodType: 'system_message',
            methodName: '系统消息',
            isEnabled: true,
            supportedDepartments: [
              { id: 1, name: '销售部', isEnabled: true },
              { id: 2, name: '客服部', isEnabled: true },
              { id: 3, name: '物流部', isEnabled: true },
              { id: 4, name: '财务部', isEnabled: true }
            ],
            selectedMembers: [], // 系统消息支持全员
            settings: {
              retentionDays: 30,
              allowMarkAsRead: true
            },
            createdBy: '系统管理员',
            createdAt: '2024-01-08 08:00:00',
            updatedAt: '2024-01-08 08:00:00'
          }
        ];

        res.json({ data: mockConfigs });
        return;
      }

      // 实际数据库查询逻辑
      // TODO: 实现真实的数据库查询
      res.json({ data: [] });
    } catch (error) {
      console.error('获取通知配置失败:', error);
      res.status(500).json({ error: '获取通知配置失败' });
    }
  }

  async updateNotificationConfig(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        // 测试模式：模拟更新通知配置
        res.json({
          success: true,
          message: '通知配置更新成功',
          data: { id, ...req.body }
        });
        return;
      }

      // 实际数据库更新逻辑
      // TODO: 实现真实的数据库更新
      res.json({
        success: true,
        message: '通知配置更新成功',
        data: { id, ...req.body }
      });
    } catch (error) {
      console.error('更新通知配置失败:', error);
      res.status(500).json({
        success: false,
        error: '更新通知配置失败'
      });
    }
  }

  async testNotification(req: Request, res: Response): Promise<void> {
    try {
      const { methodType, settings, testMessage } = req.body;
      const dataSource = getDataSource();

      if (!dataSource) {
        // 测试模式：模拟测试通知
        res.json({
          success: true,
          message: `${methodType}通知测试成功`,
          details: `测试消息"${testMessage}"已发送`
        });
        return;
      }

      // 实际通知测试逻辑
      // TODO: 实现真实的通知测试
      res.json({
        success: true,
        message: `${methodType}通知测试成功`
      });
    } catch (error) {
      console.error('测试通知失败:', error);
      res.status(500).json({
        success: false,
        error: '测试通知失败'
      });
    }
  }

  // 获取部门和成员数据
  async getDepartmentsAndMembers(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟部门和成员数据
        const mockData = {
          departments: [
            { id: 1, name: '销售部', memberCount: 8 },
            { id: 2, name: '客服部', memberCount: 5 },
            { id: 3, name: '物流部', memberCount: 6 },
            { id: 4, name: '财务部', memberCount: 4 },
            { id: 5, name: '技术部', memberCount: 12 }
          ],
          members: [
            { id: 1, name: '张三', departmentId: 1, department: '销售部', email: 'zhangsan@company.com', phone: '13800138001' },
            { id: 2, name: '李四', departmentId: 2, department: '客服部', email: 'lisi@company.com', phone: '13800138002' },
            { id: 3, name: '王五', departmentId: 1, department: '销售部', email: 'wangwu@company.com', phone: '13800138003' },
            { id: 4, name: '赵六', departmentId: 3, department: '物流部', email: 'zhaoliu@company.com', phone: '13800138004' },
            { id: 5, name: '钱七', departmentId: 4, department: '财务部', email: 'qianqi@company.com', phone: '13800138005' }
          ],
          messageTypes: [
            // 订单管理
            { value: 'order_created', label: '新建订单通知', category: '订单管理' },
            { value: 'order_submitted', label: '订单提交成功', category: '订单管理' },
            { value: 'order_paid', label: '订单支付成功', category: '订单管理' },
            { value: 'order_shipped', label: '订单发货通知', category: '订单管理' },
            { value: 'order_delivered', label: '订单送达通知', category: '订单管理' },
            { value: 'order_signed', label: '订单签收通知', category: '订单管理' },
            { value: 'order_cancelled', label: '订单取消通知', category: '订单管理' },
            { value: 'order_cancel_request', label: '订单取消申请', category: '订单管理' },
            { value: 'order_cancel_approved', label: '订单取消通过', category: '订单管理' },
            { value: 'order_modify_approved', label: '订单修改申请通过', category: '订单管理' },
            { value: 'order_refunded', label: '订单退款通知', category: '订单管理' },
            { value: 'payment_reminder', label: '付款提醒', category: '订单管理' },

            // 售后服务
            { value: 'after_sales_created', label: '新售后申请', category: '售后服务' },
            { value: 'after_sales_processing', label: '售后处理中', category: '售后服务' },
            { value: 'after_sales_urgent', label: '紧急售后', category: '售后服务' },
            { value: 'after_sales_completed', label: '售后完成', category: '售后服务' },
            { value: 'return_notification', label: '退货通知', category: '售后服务' },

            // 客户管理
            { value: 'customer_created', label: '新建客户通知', category: '客户管理' },
            { value: 'customer_updated', label: '客户信息更新', category: '客户管理' },
            { value: 'customer_call', label: '客户来电', category: '客户管理' },
            { value: 'customer_complaint', label: '客户投诉', category: '客户管理' },
            { value: 'customer_rejected', label: '客户拒收', category: '客户管理' },
            { value: 'customer_sharing', label: '客户分享通知', category: '客户管理' },
            { value: 'customer_feedback', label: '客户反馈', category: '客户管理' },

            // 商品管理
            { value: 'product_created', label: '商品添加成功', category: '商品管理' },
            { value: 'product_updated', label: '商品信息更新', category: '商品管理' },
            { value: 'product_out_of_stock', label: '商品缺货', category: '商品管理' },
            { value: 'product_price_changed', label: '商品价格变更', category: '商品管理' },

            // 物流管理
            { value: 'shipping_notification', label: '发货通知', category: '物流管理' },
            { value: 'delivery_confirmation', label: '签收通知', category: '物流管理' },
            { value: 'logistics_pickup', label: '物流揽件', category: '物流管理' },
            { value: 'logistics_in_transit', label: '物流运输中', category: '物流管理' },
            { value: 'logistics_delivered', label: '物流已送达', category: '物流管理' },
            { value: 'package_anomaly', label: '包裹异常', category: '物流管理' },

            // 财务管理
            { value: 'payment_notification', label: '付款通知', category: '财务管理' },
            { value: 'payment_received', label: '收款确认', category: '财务管理' },
            { value: 'invoice_generated', label: '发票生成', category: '财务管理' },
            { value: 'refund_processed', label: '退款处理', category: '财务管理' },

            // 审批流程
            { value: 'audit_notification', label: '审核通知', category: '审批流程' },
            { value: 'audit_pending', label: '待审核', category: '审批流程' },
            { value: 'audit_approved', label: '审核通过', category: '审批流程' },
            { value: 'audit_rejected', label: '审核拒绝', category: '审批流程' },

            // 业绩分享
            { value: 'performance_share_created', label: '业绩分享创建', category: '业绩分享' },
            { value: 'performance_share_received', label: '收到业绩分享', category: '业绩分享' },
            { value: 'performance_share_confirmed', label: '业绩分享确认', category: '业绩分享' },
            { value: 'performance_share_rejected', label: '业绩分享拒绝', category: '业绩分享' },
            { value: 'performance_share_cancelled', label: '业绩分享取消', category: '业绩分享' },

            // 短信管理
            { value: 'sms_template_applied', label: '短信模板申请', category: '短信管理' },
            { value: 'sms_template_approved', label: '短信模板审核通过', category: '短信管理' },
            { value: 'sms_template_rejected', label: '短信模板审核拒绝', category: '短信管理' },
            { value: 'sms_send_applied', label: '短信发送申请', category: '短信管理' },
            { value: 'sms_send_approved', label: '短信发送审核通过', category: '短信管理' },
            { value: 'sms_send_rejected', label: '短信发送审核拒绝', category: '短信管理' },
            { value: 'sms_send_success', label: '短信发送成功', category: '短信管理' },
            { value: 'sms_send_failed', label: '短信发送失败', category: '短信管理' },

            // 系统管理
            { value: 'system_maintenance', label: '系统维护通知', category: '系统管理' },
            { value: 'system_update', label: '系统更新', category: '系统管理' },
            { value: 'user_login', label: '用户登录', category: '系统管理' },
            { value: 'user_created', label: '系统用户添加成功', category: '系统管理' },
            { value: 'permission_configured', label: '权限配置成功', category: '系统管理' },
            { value: 'data_export_success', label: '导出成功', category: '系统管理' },
            { value: 'data_import_completed', label: '导入完成', category: '系统管理' },
            { value: 'system_alert', label: '系统告警', category: '系统管理' }
          ]
        };

        res.json(mockData);
        return;
      }

      // 实际数据库查询逻辑
      // TODO: 实现真实的数据库查询
      res.json({
        departments: [],
        members: [],
        messageTypes: []
      });
    } catch (error) {
      console.error('获取部门和成员数据失败:', error);
      res.status(500).json({ error: '获取部门和成员数据失败' });
    }
  }

  // =====================================================
  // 系统消息相关方法 - 🔥 真正的数据库存储实现
  // =====================================================

  /**
   * 获取当前用户的系统消息
   */
  async getSystemMessages(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, data: { messages: [], total: 0 } });
        return;
      }

      // 获取当前用户ID
      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: '未登录' });
        return;
      }

      const { limit = 50, offset = 0, unreadOnly = 'false' } = req.query;

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 构建查询
      const queryBuilder = messageRepo.createQueryBuilder('msg')
        .where('msg.target_user_id = :userId', { userId })
        .orderBy('msg.created_at', 'DESC')
        .skip(Number(offset))
        .take(Number(limit));

      // 只查询未读消息
      if (unreadOnly === 'true') {
        queryBuilder.andWhere('msg.is_read = 0');
      }

      const [messages, total] = await queryBuilder.getManyAndCount();

      // 统计未读数量
      const unreadCount = await messageRepo.count({
        where: { targetUserId: userId, isRead: 0 }
      });

      res.json({
        success: true,
        data: {
          messages: messages.map(msg => ({
            id: msg.id,
            type: msg.type,
            title: msg.title,
            content: msg.content,
            priority: msg.priority,
            category: msg.category,
            relatedId: msg.relatedId,
            relatedType: msg.relatedType,
            actionUrl: msg.actionUrl,
            isRead: msg.isRead === 1,
            createdAt: msg.createdAt,
            readAt: msg.readAt
          })),
          total,
          unreadCount
        }
      });
    } catch (error) {
      console.error('获取系统消息失败:', error);
      res.status(500).json({ success: false, message: '获取系统消息失败' });
    }
  }

  /**
   * 发送系统消息（内部调用或API调用）
   */
  async sendSystemMessage(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const { type, title, content, priority, category, targetUserId, relatedId, relatedType, actionUrl } = req.body;

      if (!type || !title || !content || !targetUserId) {
        res.status(400).json({ success: false, message: '缺少必要参数' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const createdBy = currentUser?.id || currentUser?.userId;

      const messageRepo = dataSource.getRepository(SystemMessage);

      const message = messageRepo.create({
        id: uuidv4(),
        type,
        title,
        content,
        priority: priority || 'normal',
        category: category || '系统通知',
        targetUserId,
        createdBy,
        relatedId,
        relatedType,
        actionUrl,
        isRead: 0
      });

      await messageRepo.save(message);

      console.log(`[系统消息] ✅ 发送成功: ${title} -> 用户 ${targetUserId}`);

      res.json({
        success: true,
        data: { id: message.id },
        message: '消息发送成功'
      });
    } catch (error) {
      console.error('发送系统消息失败:', error);
      res.status(500).json({ success: false, message: '发送系统消息失败' });
    }
  }

  /**
   * 批量发送系统消息
   */
  async sendBatchSystemMessages(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const { messages } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ success: false, message: '消息列表不能为空' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const createdBy = currentUser?.id || currentUser?.userId;

      const messageRepo = dataSource.getRepository(SystemMessage);

      const messageEntities = messages.map(msg => messageRepo.create({
        id: uuidv4(),
        type: msg.type,
        title: msg.title,
        content: msg.content,
        priority: msg.priority || 'normal',
        category: msg.category || '系统通知',
        targetUserId: msg.targetUserId,
        createdBy,
        relatedId: msg.relatedId,
        relatedType: msg.relatedType,
        actionUrl: msg.actionUrl,
        isRead: 0
      }));

      await messageRepo.save(messageEntities);

      console.log(`[系统消息] ✅ 批量发送成功: ${messageEntities.length} 条消息`);

      res.json({
        success: true,
        data: { count: messageEntities.length },
        message: `成功发送 ${messageEntities.length} 条消息`
      });
    } catch (error) {
      console.error('批量发送系统消息失败:', error);
      res.status(500).json({ success: false, message: '批量发送系统消息失败' });
    }
  }

  /**
   * 标记消息为已读
   */
  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, message: '消息已标记为已读' });
        return;
      }

      const { id } = req.params;
      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      const messageRepo = dataSource.getRepository(SystemMessage);

      await messageRepo.update(
        { id, targetUserId: userId },
        { isRead: 1, readAt: new Date() }
      );

      res.json({
        success: true,
        message: '消息已标记为已读'
      });
    } catch (error) {
      console.error('标记消息为已读失败:', error);
      res.status(500).json({ success: false, message: '标记消息为已读失败' });
    }
  }

  /**
   * 标记所有消息为已读
   */
  async markAllMessagesAsRead(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, message: '所有消息已标记为已读' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: '未登录' });
        return;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      const result = await messageRepo.update(
        { targetUserId: userId, isRead: 0 },
        { isRead: 1, readAt: new Date() }
      );

      res.json({
        success: true,
        message: `已标记 ${result.affected || 0} 条消息为已读`
      });
    } catch (error) {
      console.error('标记所有消息为已读失败:', error);
      res.status(500).json({ success: false, message: '标记所有消息为已读失败' });
    }
  }

  /**
   * 获取消息统计
   */
  async getMessageStats(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, data: this.getEmptyStats() });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      // 获取今日开始时间
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 公告统计
      let totalAnnouncements = 0;
      let publishedAnnouncements = 0;
      try {
        const announcementRepo = dataSource.getRepository(Announcement);
        totalAnnouncements = await announcementRepo.count();
        publishedAnnouncements = await announcementRepo.count({ where: { status: 'published' } });
      } catch (_e) {
        console.log('[统计] 公告表可能不存在');
      }

      // 普通通知配置统计
      let notificationChannelCount = 0;
      let todayNotificationSent = 0;
      let totalNotificationSent = 0;
      try {
        const channelRepo = dataSource.getRepository(NotificationChannel);
        notificationChannelCount = await channelRepo.count();

        const logRepo = dataSource.getRepository(NotificationLog);
        totalNotificationSent = await logRepo.count({ where: { status: 'success' } });
        todayNotificationSent = await logRepo.createQueryBuilder('log')
          .where('log.status = :status', { status: 'success' })
          .andWhere('log.created_at >= :today', { today })
          .getCount();
      } catch (_e) {
        console.log('[统计] 通知渠道表可能不存在');
      }

      // 业绩消息配置统计
      let performanceConfigCount = 0;
      let todayPerformanceSent = 0;
      let totalPerformanceSent = 0;
      try {
        const { PerformanceReportConfig } = await import('../entities/PerformanceReportConfig');
        const configRepo = dataSource.getRepository(PerformanceReportConfig);
        performanceConfigCount = await configRepo.count();

        // 统计发送成功的次数
        const successConfigs = await configRepo.find({ where: { lastSentStatus: 'success' } });
        totalPerformanceSent = successConfigs.length;

        // 今日发送的
        todayPerformanceSent = successConfigs.filter(c =>
          c.lastSentAt && new Date(c.lastSentAt) >= today
        ).length;
      } catch (_e) {
        console.log('[统计] 业绩报表配置表可能不存在');
      }

      // 系统消息统计
      let totalMessages = 0;
      let unreadMessages = 0;
      if (userId) {
        try {
          const messageRepo = dataSource.getRepository(SystemMessage);
          totalMessages = await messageRepo.count({ where: { targetUserId: userId } });
          unreadMessages = await messageRepo.count({ where: { targetUserId: userId, isRead: 0 } });
        } catch (_e) {
          console.log('[统计] 系统消息表可能不存在');
        }
      }

      res.json({
        success: true,
        data: {
          totalAnnouncements,
          publishedAnnouncements,
          notificationChannelCount,
          todayNotificationSent,
          totalNotificationSent,
          performanceConfigCount,
          todayPerformanceSent,
          totalPerformanceSent,
          totalMessages,
          unreadMessages
        }
      });
    } catch (error) {
      console.error('获取消息统计失败:', error);
      res.json({ success: true, data: this.getEmptyStats() });
    }
  }

  private getEmptyStats() {
    return {
      totalAnnouncements: 0,
      publishedAnnouncements: 0,
      notificationChannelCount: 0,
      todayNotificationSent: 0,
      totalNotificationSent: 0,
      performanceConfigCount: 0,
      todayPerformanceSent: 0,
      totalPerformanceSent: 0,
      totalMessages: 0,
      unreadMessages: 0
    };
  }

  /**
   * 🔥 删除单条消息
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, message: '消息已删除' });
        return;
      }

      const { id } = req.params;
      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 只能删除自己的消息
      const result = await messageRepo.delete({ id, targetUserId: userId });

      res.json({
        success: true,
        message: result.affected ? '消息已删除' : '消息不存在'
      });
    } catch (error) {
      console.error('删除消息失败:', error);
      res.status(500).json({ success: false, message: '删除消息失败' });
    }
  }

  /**
   * 🔥 清空当前用户的所有消息
   */
  async clearAllMessages(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, message: '所有消息已清空' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const userId = currentUser?.id || currentUser?.userId;

      if (!userId) {
        res.status(401).json({ success: false, message: '未登录' });
        return;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      const result = await messageRepo.delete({ targetUserId: userId });

      console.log(`[系统消息] 用户 ${userId} 清空了 ${result.affected || 0} 条消息`);

      res.json({
        success: true,
        message: `已清空 ${result.affected || 0} 条消息`
      });
    } catch (error) {
      console.error('清空消息失败:', error);
      res.status(500).json({ success: false, message: '清空消息失败' });
    }
  }

  /**
   * 🔥 清理过期消息（超过30天的消息）
   * 可以通过定时任务调用，或者管理员手动触发
   */
  async cleanupExpiredMessages(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, message: '无需清理', data: { deleted: 0 } });
        return;
      }

      const messageRepo = dataSource.getRepository(SystemMessage);

      // 计算30天前的日期
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 删除30天前的消息
      const result = await messageRepo
        .createQueryBuilder()
        .delete()
        .where('created_at < :date', { date: thirtyDaysAgo })
        .execute();

      console.log(`[系统消息] 🧹 自动清理了 ${result.affected || 0} 条过期消息（超过30天）`);

      res.json({
        success: true,
        message: `已清理 ${result.affected || 0} 条过期消息`,
        data: { deleted: result.affected || 0 }
      });
    } catch (error) {
      console.error('清理过期消息失败:', error);
      res.status(500).json({ success: false, message: '清理过期消息失败' });
    }
  }

  // =====================================================
  // 通知配置管理 - 🔥 跨平台通知配置
  // =====================================================

  /**
   * 获取通知渠道配置列表
   */
  async getNotificationChannels(_req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        console.log('[通知配置] 数据库未连接，返回空列表');
        res.json({ success: true, data: [] });
        return;
      }

      // 检查表是否存在
      try {
        const channelRepo = dataSource.getRepository(NotificationChannel);
        const channels = await channelRepo.find({
          order: { createdAt: 'DESC' }
        });

        console.log(`[通知配置] 查询到 ${channels.length} 个配置`);

        res.json({
          success: true,
          data: channels.map(channel => ({
            id: channel.id,
            name: channel.name,
            channelType: channel.channelType,
            isEnabled: channel.isEnabled === 1,
            config: channel.config,
            messageTypes: channel.messageTypes || [],
            targetType: channel.targetType,
            targetDepartments: channel.targetDepartments || [],
            targetUsers: channel.targetUsers || [],
            targetRoles: channel.targetRoles || [],
            priorityFilter: channel.priorityFilter,
            createdByName: channel.createdByName,
            createdAt: channel.createdAt,
            updatedAt: channel.updatedAt
          }))
        });
      } catch (dbError: any) {
        // 如果是表不存在的错误，返回空列表
        if (dbError.code === 'ER_NO_SUCH_TABLE' || dbError.message?.includes('doesn\'t exist')) {
          console.log('[通知配置] 表不存在，返回空列表');
          res.json({ success: true, data: [] });
          return;
        }
        throw dbError;
      }
    } catch (error) {
      console.error('获取通知配置失败:', error);
      res.status(500).json({ success: false, message: '获取通知配置失败' });
    }
  }

  /**
   * 创建通知渠道配置
   */
  async createNotificationChannel(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const {
        name,
        channelType,
        config,
        messageTypes,
        targetType,
        targetDepartments,
        targetUsers,
        targetRoles,
        priorityFilter
      } = req.body;

      if (!name || !channelType) {
        res.status(400).json({ success: false, message: '名称和渠道类型不能为空' });
        return;
      }

      const currentUser = (req as any).currentUser || (req as any).user;
      const channelRepo = dataSource.getRepository(NotificationChannel);

      const channel = channelRepo.create({
        id: uuidv4(),
        name,
        channelType,
        isEnabled: 1,
        config: config || {},
        messageTypes: messageTypes || [],
        targetType: targetType || 'all',
        targetDepartments: targetDepartments || null,
        targetUsers: targetUsers || null,
        targetRoles: targetRoles || null,
        priorityFilter: priorityFilter || 'all',
        createdBy: currentUser?.id,
        createdByName: currentUser?.realName || currentUser?.username || '系统'
      });

      await channelRepo.save(channel);

      console.log(`[通知配置] ✅ 创建成功: ${name} (${channelType})`);

      res.json({
        success: true,
        message: '通知配置创建成功',
        data: channel
      });
    } catch (error) {
      console.error('创建通知配置失败:', error);
      res.status(500).json({ success: false, message: '创建通知配置失败' });
    }
  }

  /**
   * 更新通知渠道配置
   */
  async updateNotificationChannel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const channelRepo = dataSource.getRepository(NotificationChannel);
      const channel = await channelRepo.findOne({ where: { id } });

      if (!channel) {
        res.status(404).json({ success: false, message: '通知配置不存在' });
        return;
      }

      const {
        name,
        isEnabled,
        config,
        messageTypes,
        targetType,
        targetDepartments,
        targetUsers,
        targetRoles,
        priorityFilter
      } = req.body;

      if (name !== undefined) channel.name = name;
      if (isEnabled !== undefined) channel.isEnabled = isEnabled ? 1 : 0;
      if (config !== undefined) channel.config = config;
      if (messageTypes !== undefined) channel.messageTypes = messageTypes;
      if (targetType !== undefined) channel.targetType = targetType;
      if (targetDepartments !== undefined) channel.targetDepartments = targetDepartments;
      if (targetUsers !== undefined) channel.targetUsers = targetUsers;
      if (targetRoles !== undefined) channel.targetRoles = targetRoles;
      if (priorityFilter !== undefined) channel.priorityFilter = priorityFilter;

      await channelRepo.save(channel);

      res.json({
        success: true,
        message: '通知配置更新成功',
        data: channel
      });
    } catch (error) {
      console.error('更新通知配置失败:', error);
      res.status(500).json({ success: false, message: '更新通知配置失败' });
    }
  }

  /**
   * 删除通知渠道配置
   */
  async deleteNotificationChannel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const channelRepo = dataSource.getRepository(NotificationChannel);
      const result = await channelRepo.delete({ id });

      if (result.affected === 0) {
        res.status(404).json({ success: false, message: '通知配置不存在' });
        return;
      }

      res.json({
        success: true,
        message: '通知配置删除成功'
      });
    } catch (error) {
      console.error('删除通知配置失败:', error);
      res.status(500).json({ success: false, message: '删除通知配置失败' });
    }
  }

  /**
   * 测试通知渠道 - 真实调用第三方API
   */
  async testNotificationChannel(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { testMessage } = req.body;
      const dataSource = getDataSource();

      if (!dataSource) {
        res.status(500).json({ success: false, message: '数据库未连接' });
        return;
      }

      const channelRepo = dataSource.getRepository(NotificationChannel);
      const channel = await channelRepo.findOne({ where: { id } });

      if (!channel) {
        res.status(404).json({ success: false, message: '通知配置不存在' });
        return;
      }

      const message = testMessage || '这是一条来自CRM系统的测试消息';
      let testResult: { success: boolean; message: string; details?: any } = {
        success: false,
        message: '未知渠道类型'
      };

      // 根据渠道类型调用不同的API
      switch (channel.channelType) {
        case 'dingtalk':
          testResult = await this.sendDingtalkMessage(channel.config, message);
          break;
        case 'wechat_work':
          testResult = await this.sendWechatWorkMessage(channel.config, message);
          break;
        case 'wechat_mp':
          testResult = { success: false, message: '微信公众号需要用户关注后才能发送模板消息，请在实际业务中测试' };
          break;
        case 'email':
          testResult = await this.sendEmailMessage(channel.config, message, 'CRM系统测试邮件');
          break;
        case 'sms':
          testResult = await this.sendSmsMessage(channel.config, message);
          break;
        case 'system':
          testResult = { success: true, message: '系统通知测试成功（系统内置通知无需外部配置）' };
          break;
        default:
          testResult = { success: false, message: `不支持的渠道类型: ${channel.channelType}` };
      }

      console.log(`[通知测试] ${channel.name} (${channel.channelType}): ${testResult.success ? '成功' : '失败'} - ${testResult.message}`);

      res.json(testResult);
    } catch (error) {
      console.error('测试通知失败:', error);
      res.status(500).json({ success: false, message: '测试通知失败' });
    }
  }

  /**
   * 发送钉钉消息
   */
  private async sendDingtalkMessage(config: any, message: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { webhook, secret } = config;
      if (!webhook) {
        return { success: false, message: '钉钉Webhook地址未配置' };
      }

      let url = webhook;

      // 如果配置了加签密钥，需要计算签名
      if (secret) {
        const timestamp = Date.now();
        const stringToSign = `${timestamp}\n${secret}`;
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(stringToSign);
        const sign = encodeURIComponent(hmac.digest('base64'));
        url = `${webhook}&timestamp=${timestamp}&sign=${sign}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content: message },
          at: { isAtAll: config.at_all || false }
        })
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      if (result.errcode === 0) {
        return { success: true, message: '钉钉消息发送成功', details: result };
      } else {
        return { success: false, message: `钉钉发送失败: ${result.errmsg}`, details: result };
      }
    } catch (error: any) {
      return { success: false, message: `钉钉发送异常: ${error.message}` };
    }
  }

  /**
   * 发送企业微信消息
   */
  private async sendWechatWorkMessage(config: any, message: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { webhook } = config;
      if (!webhook) {
        return { success: false, message: '企业微信Webhook地址未配置' };
      }

      console.log(`[企业微信] 正在发送消息到: ${webhook.substring(0, 60)}...`);

      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'text',
          text: { content: message }
        })
      });

      const result = await response.json() as { errcode: number; errmsg: string };

      console.log(`[企业微信] 响应结果:`, result);

      if (result.errcode === 0) {
        return { success: true, message: '企业微信消息发送成功', details: result };
      } else {
        return { success: false, message: `企业微信发送失败: ${result.errmsg} (错误码: ${result.errcode})`, details: result };
      }
    } catch (error: any) {
      console.error(`[企业微信] 发送异常:`, error);
      return { success: false, message: `企业微信发送异常: ${error.message}` };
    }
  }

  /**
   * 发送邮件 - 使用nodemailer
   */
  private async sendEmailMessage(config: any, message: string, subject?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { smtp_host, smtp_port, username, password, from_name } = config;

      if (!smtp_host || !username || !password) {
        return { success: false, message: '邮件配置不完整，请检查SMTP服务器、账号和密码' };
      }

      // 动态导入nodemailer（如果已安装）
      try {
        const nodemailer = require('nodemailer');

        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port: smtp_port || 587,
          secure: smtp_port === 465,
          auth: {
            user: username,
            pass: password
          }
        });

        // 测试邮件发送给自己
        const info = await transporter.sendMail({
          from: `"${from_name || 'CRM系统'}" <${username}>`,
          to: username, // 测试时发给自己
          subject: subject || 'CRM系统测试邮件',
          text: message,
          html: `<div style="padding: 20px; background: #f5f5f5;"><h3>CRM系统通知</h3><p>${message}</p><p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复</p></div>`
        });

        return { success: true, message: '邮件发送成功', details: { messageId: info.messageId } };
      } catch (e: any) {
        if (e.code === 'MODULE_NOT_FOUND') {
          return { success: false, message: '邮件功能需要安装nodemailer模块: npm install nodemailer' };
        }
        throw e;
      }
    } catch (error: any) {
      return { success: false, message: `邮件发送失败: ${error.message}` };
    }
  }

  /**
   * 发送短信 - 阿里云短信服务
   */
  private async sendSmsMessage(config: any, _message: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const { provider, access_key, access_secret, sign_name, template_code } = config;

      if (!access_key || !access_secret || !sign_name || !template_code) {
        return { success: false, message: '短信配置不完整，请检查AccessKey、签名和模板' };
      }

      if (provider === 'aliyun') {
        // 阿里云短信API调用
        // 注意：实际使用需要安装 @alicloud/dysmsapi20170525
        return { success: false, message: '阿里云短信功能需要安装SDK: npm install @alicloud/dysmsapi20170525' };
      } else if (provider === 'tencent') {
        // 腾讯云短信API调用
        return { success: false, message: '腾讯云短信功能需要安装SDK: npm install tencentcloud-sdk-nodejs' };
      }

      return { success: false, message: `不支持的短信服务商: ${provider}` };
    } catch (error: any) {
      return { success: false, message: `短信发送失败: ${error.message}` };
    }
  }

  /**
   * 获取通知发送记录
   */
  async getNotificationLogs(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        res.json({ success: true, data: { list: [], total: 0 } });
        return;
      }

      const { channelId, status, page = 1, pageSize = 20 } = req.query;
      const logRepo = dataSource.getRepository(NotificationLog);

      const queryBuilder = logRepo.createQueryBuilder('log')
        .orderBy('log.created_at', 'DESC');

      if (channelId) {
        queryBuilder.andWhere('log.channel_id = :channelId', { channelId });
      }
      if (status) {
        queryBuilder.andWhere('log.status = :status', { status });
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      const [list, total] = await queryBuilder.getManyAndCount();

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
      console.error('获取通知记录失败:', error);
      res.status(500).json({ success: false, message: '获取通知记录失败' });
    }
  }

  /**
   * 获取可用的消息类型和渠道类型
   */
  async getNotificationOptions(_req: Request, res: Response): Promise<void> {
    try {
      const messageTypes = [
        // 订单相关（主要）
        { value: 'AUDIT_PENDING', label: '待审核订单', description: '订单提交审核时通知', category: '订单通知', primary: true },
        { value: 'AUDIT_APPROVED', label: '审核通过', description: '订单审核通过时通知', category: '订单通知', primary: true },
        { value: 'AUDIT_REJECTED', label: '审核拒绝', description: '订单审核拒绝时通知', category: '订单通知', primary: true },
        { value: 'ORDER_SHIPPED', label: '订单发货', description: '订单发货时通知', category: '订单通知', primary: true },
        // 物流相关
        { value: 'ORDER_DELIVERED', label: '已签收', description: '订单签收时通知', category: '物流通知', primary: false },
        { value: 'PACKAGE_EXCEPTION', label: '包裹异常', description: '包裹出现异常时通知', category: '物流通知', primary: false },
        { value: 'ORDER_REJECTED', label: '拒收', description: '订单被拒收时通知', category: '物流通知', primary: false },
        // 售后相关
        { value: 'AFTER_SALES_CREATED', label: '新建售后', description: '创建售后服务时通知', category: '售后通知', primary: false },
        { value: 'REFUND_REQUESTED', label: '退款申请', description: '客户申请退款时通知', category: '售后通知', primary: false },
        { value: 'REFUND_COMPLETED', label: '退款完成', description: '退款处理完成时通知', category: '售后通知', primary: false },
        { value: 'RETURN_REQUESTED', label: '退货申请', description: '客户申请退货时通知', category: '售后通知', primary: false },
        // 其他
        { value: 'ORDER_CANCELLED', label: '订单取消', description: '订单取消时通知', category: '其他通知', primary: false },
        { value: 'CUSTOMER_CREATED', label: '新客户', description: '新客户创建时通知', category: '其他通知', primary: false },
        { value: 'PAYMENT_REMINDER', label: '付款提醒', description: '付款提醒通知', category: '其他通知', primary: false },
        { value: 'SYSTEM_UPDATE', label: '系统更新', description: '系统更新时通知', category: '系统通知', primary: false },
        { value: 'MAINTENANCE', label: '系统维护', description: '系统维护时通知', category: '系统通知', primary: false }
      ];

      const channelTypes = [
        {
          value: 'system',
          label: '系统通知',
          description: '系统内置通知，所有用户都会收到',
          icon: 'Monitor',
          color: '#722ED1',
          configFields: []
        },
        {
          value: 'dingtalk',
          label: '钉钉',
          description: '通过钉钉机器人发送通知',
          icon: 'ChatDotRound',
          color: '#1890FF',
          configFields: [
            { key: 'webhook', label: 'Webhook地址', type: 'text', required: true, placeholder: 'https://oapi.dingtalk.com/robot/send?access_token=xxx' },
            { key: 'secret', label: '加签密钥', type: 'password', required: false, placeholder: 'SEC开头的密钥' },
            { key: 'at_all', label: '@所有人', type: 'boolean', required: false }
          ]
        },
        {
          value: 'wechat_work',
          label: '企业微信',
          description: '通过企业微信机器人发送通知',
          icon: 'ChatLineSquare',
          color: '#52C41A',
          configFields: [
            { key: 'webhook', label: 'Webhook地址', type: 'text', required: true, placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' }
          ]
        },
        {
          value: 'wechat_mp',
          label: '微信公众号',
          description: '通过微信公众号模板消息发送通知',
          icon: 'ChatRound',
          color: '#07C160',
          configFields: [
            { key: 'app_id', label: 'AppID', type: 'text', required: true },
            { key: 'app_secret', label: 'AppSecret', type: 'password', required: true },
            { key: 'template_id', label: '模板ID', type: 'text', required: true }
          ]
        },
        {
          value: 'email',
          label: '邮箱',
          description: '通过邮件发送通知',
          icon: 'Message',
          color: '#FA8C16',
          configFields: [
            { key: 'smtp_host', label: 'SMTP服务器', type: 'text', required: true, placeholder: 'smtp.example.com' },
            { key: 'smtp_port', label: 'SMTP端口', type: 'number', required: true, placeholder: '587' },
            { key: 'username', label: '邮箱账号', type: 'text', required: true },
            { key: 'password', label: '邮箱密码', type: 'password', required: true },
            { key: 'from_name', label: '发件人名称', type: 'text', required: false, placeholder: 'CRM系统' }
          ]
        },
        {
          value: 'sms',
          label: '短信',
          description: '通过短信发送通知',
          icon: 'Iphone',
          color: '#FF4D4F',
          configFields: [
            { key: 'provider', label: '服务商', type: 'select', options: [{ value: 'aliyun', label: '阿里云' }, { value: 'tencent', label: '腾讯云' }], required: true },
            { key: 'access_key', label: 'AccessKey', type: 'text', required: true },
            { key: 'access_secret', label: 'AccessSecret', type: 'password', required: true },
            { key: 'sign_name', label: '短信签名', type: 'text', required: true },
            { key: 'template_code', label: '模板代码', type: 'text', required: true }
          ]
        }
      ];

      const priorityOptions = [
        { value: 'all', label: '全部优先级' },
        { value: 'normal', label: '普通及以上' },
        { value: 'high', label: '重要及以上' },
        { value: 'urgent', label: '紧急' }
      ];

      const targetTypeOptions = [
        { value: 'all', label: '所有人' },
        { value: 'departments', label: '指定部门' },
        { value: 'users', label: '指定用户' },
        { value: 'roles', label: '指定角色' }
      ];

      res.json({
        success: true,
        data: {
          messageTypes,
          channelTypes,
          priorityOptions,
          targetTypeOptions
        }
      });
    } catch (error) {
      console.error('获取通知选项失败:', error);
      res.status(500).json({ success: false, message: '获取通知选项失败' });
    }
  }
}
