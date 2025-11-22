import { Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { MessageSubscription, DepartmentSubscriptionConfig, MessageType, NotificationMethod } from '../entities/MessageSubscription';
import { Department } from '../entities/Department';

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
        where: { department: { id: parseInt(departmentId) } },
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
        where: { id: parseInt(departmentId) }
      });

      if (!department) {
        res.status(404).json({ error: '部门不存在' });
        return;
      }

      // 查找现有配置
      let config = await departmentConfigRepo.findOne({
        where: { messageType: messageType as MessageType, department: { id: parseInt(departmentId) } },
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

  // 公告管理相关方法
  async getAnnouncements(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟公告数据
        const mockAnnouncements = [
          {
            id: 1,
            title: '系统维护通知',
            content: '系统将于本周六晚上10点进行维护，预计维护时间2小时，期间系统将暂停服务。',
            type: 'company',
            status: 'published',
            isPopup: true,
            isMarquee: true,
            targetDepartments: [],
            publishedAt: '2024-01-15 10:00:00',
            createdBy: '系统管理员',
            createdAt: '2024-01-15 09:30:00',
            updatedAt: '2024-01-15 10:00:00'
          },
          {
            id: 2,
            title: '销售部门会议通知',
            content: '销售部门将于明天下午2点召开月度总结会议，请相关人员准时参加。',
            type: 'department',
            status: 'published',
            isPopup: false,
            isMarquee: true,
            targetDepartments: ['销售部'],
            publishedAt: '2024-01-14 16:00:00',
            createdBy: '销售经理',
            createdAt: '2024-01-14 15:30:00',
            updatedAt: '2024-01-14 16:00:00'
          },
          {
            id: 3,
            title: '新功能上线预告',
            content: '我们即将上线客户管理新功能，包括智能标签和自动分组等特性。',
            type: 'company',
            status: 'draft',
            isPopup: true,
            isMarquee: false,
            targetDepartments: [],
            scheduledAt: '2024-01-20 09:00:00',
            createdBy: '产品经理',
            createdAt: '2024-01-14 14:00:00',
            updatedAt: '2024-01-14 14:00:00'
          }
        ];

        // 根据筛选条件过滤
        let filteredAnnouncements = mockAnnouncements;
        const { status, type } = req.query;
        
        if (status) {
          filteredAnnouncements = filteredAnnouncements.filter(ann => ann.status === status);
        }
        if (type) {
          filteredAnnouncements = filteredAnnouncements.filter(ann => ann.type === type);
        }

        res.json({ 
          success: true,
          data: filteredAnnouncements 
        });
        return;
      }

      // 实际数据库查询逻辑
      // TODO: 实现真实的数据库查询
      res.json({ 
        success: true,
        data: [] 
      });
    } catch (error) {
      console.error('获取公告列表失败:', error);
      res.status(500).json({ error: '获取公告列表失败' });
    }
  }

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：模拟创建公告
        const newAnnouncement = {
          id: Date.now(),
          ...req.body,
          status: req.body.status || 'draft', // 确保有默认的status字段
          createdBy: '当前用户',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
          updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };

        res.json({ 
          success: true,
          message: '公告创建成功',
          data: newAnnouncement 
        });
        return;
      }

      // 实际数据库创建逻辑
      // TODO: 实现真实的数据库创建
      res.json({ 
        success: true,
        message: '公告创建成功',
        data: req.body 
      });
    } catch (error) {
      console.error('创建公告失败:', error);
      res.status(500).json({ 
        success: false,
        error: '创建公告失败' 
      });
    }
  }

  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();
      
      if (!dataSource) {
        // 测试模式：模拟更新公告
        res.json({ 
          success: true,
          message: '公告更新成功',
          data: { id, ...req.body }
        });
        return;
      }

      // 实际数据库更新逻辑
      // TODO: 实现真实的数据库更新
      res.json({ 
        success: true,
        message: '公告更新成功',
        data: { id, ...req.body }
      });
    } catch (error) {
      console.error('更新公告失败:', error);
      res.status(500).json({ 
        success: false,
        error: '更新公告失败' 
      });
    }
  }

  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dataSource = getDataSource();
      
      if (!dataSource) {
        // 测试模式：模拟删除公告
        res.json({ 
          success: true,
          message: '公告删除成功'
        });
        return;
      }

      // 实际数据库删除逻辑
      // TODO: 实现真实的数据库删除
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
        // 测试模式：模拟发布公告
        res.json({ 
          success: true,
          message: '公告发布成功'
        });
        return;
      }

      // 实际数据库发布逻辑
      // TODO: 实现真实的数据库发布
      res.json({ 
        success: true,
        message: '公告发布成功'
      });
    } catch (error) {
      console.error('发布公告失败:', error);
      res.status(500).json({ 
        success: false,
        error: '发布公告失败' 
      });
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

  async getMessageStats(req: Request, res: Response): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) {
        // 测试模式：返回模拟统计数据
        const mockStats = {
          totalSubscriptions: 8,
          activeSubscriptions: 6,
          totalAnnouncements: 12,
          publishedAnnouncements: 8,
          unreadMessages: 5,
          totalMessages: 23,
          configuredChannels: 4,
          totalChannels: 6
        };

        res.json(mockStats);
        return;
      }

      // 实际数据库查询逻辑
      const subscriptionRepo = dataSource.getRepository(MessageSubscription);
      
      const totalSubscriptions = await subscriptionRepo.count();
      const activeSubscriptions = await subscriptionRepo.count({
        where: { isGlobalEnabled: true }
      });

      // 这里可以添加更多统计查询
      const stats = {
        totalSubscriptions,
        activeSubscriptions,
        totalAnnouncements: 0, // TODO: 实现公告统计
        publishedAnnouncements: 0, // TODO: 实现已发布公告统计
        unreadMessages: 0, // TODO: 实现未读消息统计
        totalMessages: 0, // TODO: 实现总消息统计
        configuredChannels: 0, // TODO: 实现已配置渠道统计
        totalChannels: 6 // 总渠道数
      };

      res.json(stats);
    } catch (error) {
      console.error('获取消息统计失败:', error);
      res.status(500).json({ error: '获取消息统计失败' });
    }
  }

  // 系统消息相关方法
  async getSystemMessages(req: Request, res: Response): Promise<void> {
    try {
      // 返回空的系统消息列表，不再使用硬编码的模拟数据
      const messages: any[] = []

      res.json({
        success: true,
        data: {
          messages: messages,
          total: messages.length
        }
      })
    } catch (error) {
      console.error('获取系统消息失败:', error)
      res.status(500).json({ error: '获取系统消息失败' })
    }
  }

  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      
      // 这里应该实现标记消息为已读的逻辑
      // 由于目前没有真实的消息数据，直接返回成功
      
      res.json({
        success: true,
        message: '消息已标记为已读'
      })
    } catch (error) {
      console.error('标记消息为已读失败:', error)
      res.status(500).json({ error: '标记消息为已读失败' })
    }
  }

  async markAllMessagesAsRead(req: Request, res: Response): Promise<void> {
    try {
      // 这里应该实现标记所有消息为已读的逻辑
      // 由于目前没有真实的消息数据，直接返回成功
      
      res.json({
        success: true,
        message: '所有消息已标记为已读'
      })
    } catch (error) {
      console.error('标记所有消息为已读失败:', error)
      res.status(500).json({ error: '标记所有消息为已读失败' })
    }
  }
}