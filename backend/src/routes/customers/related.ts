import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Customer } from '../../entities/Customer';
import { Order } from '../../entities/Order';
import { getTenantRepo, tenantSQL } from '../../utils/tenantRepo';
import { log } from '../../config/logger';

export function registerRelatedRoutes(router: Router) {
router.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    // Order already imported statically at top
    const orderRepository = getTenantRepo(Order);

    const orders = await orderRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });

    const list = orders.map(order => ({
      id: order.id,
      orderNo: order.orderNumber,
      orderNumber: order.orderNumber,
      products: order.products || [],
      productNames: Array.isArray(order.products)
        ? order.products.map((p: any) => p.name || p.productName).join(', ')
        : '',
      totalAmount: Number(order.totalAmount) || 0,
      status: order.status,
      orderDate: order.createdAt?.toISOString() || '',
      createTime: order.createdAt?.toISOString() || '',
      paymentStatus: order.paymentStatus,
      shippingAddress: order.shippingAddress
    }));

    log.info(`[客户订单] 客户 ${customerId} 有 ${list.length} 条订单记录`);

    res.json({
      success: true,
      code: 200,
      data: list
    });
  } catch (error) {
    log.error('获取客户订单失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户订单失败' });
  }
});

router.get('/:id/services', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { AfterSalesService } = await import('../../entities/AfterSalesService');
    const serviceRepository = getTenantRepo(AfterSalesService);

    const services = await serviceRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });

    const list = services.map(service => ({
      id: service.id,
      serviceNo: service.serviceNumber,
      serviceNumber: service.serviceNumber,
      orderNo: service.orderNumber,
      orderNumber: service.orderNumber,
      serviceType: service.serviceType,
      type: service.serviceType,
      status: service.status,
      reason: service.reason || service.description || '',
      description: service.description,
      price: Number(service.price) || 0,
      amount: Number(service.price) || 0,
      createTime: service.createdAt?.toISOString() || '',
      resolvedTime: service.resolvedTime?.toISOString() || ''
    }));

    log.info(`[客户售后] 客户 ${customerId} 有 ${list.length} 条售后记录`);

    res.json({ success: true, code: 200, data: list });
  } catch (error) {
    log.error('获取客户售后记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户售后记录失败' });
  }
});

router.get('/:id/calls', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { Call } = await import('../../entities/Call');
    const callRepository = getTenantRepo(Call);

    const calls = await callRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });

    const list = calls.map(call => {
      // 解析 callTags，可能是 JSON 字符串或数组
      let parsedCallTags: string[] = [];
      if (call.callTags) {
        if (typeof call.callTags === 'string') {
          try {
            parsedCallTags = JSON.parse(call.callTags);
          } catch (_e) {
            parsedCallTags = [];
          }
        } else if (Array.isArray(call.callTags)) {
          parsedCallTags = call.callTags;
        }
      }

      return {
        id: call.id,
        customerId: call.customerId,
        customerName: call.customerName,
        customerPhone: call.customerPhone,
        callType: call.callType || 'outbound',
        callStatus: call.callStatus || 'connected',
        duration: call.duration || 0,
        startTime: call.startTime?.toISOString() || call.createdAt?.toISOString() || '',
        endTime: call.endTime?.toISOString() || '',
        notes: call.notes || '',
        recordingUrl: call.recordingUrl || null,
        hasRecording: call.hasRecording || false,
        userName: call.userName || '未知',
        callTags: parsedCallTags,
        createdAt: call.createdAt?.toISOString() || ''
      };
    });

    log.info(`[客户通话] 客户 ${customerId} 有 ${list.length} 条通话记录`);

    res.json({ success: true, code: 200, data: list });
  } catch (error) {
    log.error('获取客户通话记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户通话记录失败' });
  }
});

router.get('/:id/followups', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;

    log.info(`[客户跟进] 查询客户 ${customerId} 的跟进记录`);

    // 🔥 修复：使用原生SQL查询，避免实体字段不匹配问题
    // 🔥 租户数据隔离：添加 tenant_id 过滤
    const tFollowUp = tenantSQL('');
    const followUps = await AppDataSource.query(`
      SELECT
        id,
        call_id as callId,
        customer_id as customerId,
        customer_name as customerName,
        follow_up_type as type,
        content,
        customer_intent as customerIntent,
        call_tags as callTags,
        next_follow_up_date as nextFollowUp,
        priority,
        status,
        user_id as createdBy,
        user_name as createdByName,
        created_at as createdAt,
        updated_at as updatedAt
      FROM follow_up_records
      WHERE customer_id = ?${tFollowUp.sql}
      ORDER BY created_at DESC
    `, [customerId, ...tFollowUp.params]);

    log.info(`[客户跟进] 查询结果:`, followUps.length, '条记录');
    if (followUps.length > 0) {
      log.info(`[客户跟进] 最新记录:`, followUps[0]);
    }

    const list = followUps.map((followUp: any) => {
      // 解析 callTags，可能是 JSON 字符串或数组
      let parsedCallTags: string[] = [];
      if (followUp.callTags) {
        if (typeof followUp.callTags === 'string') {
          try {
            parsedCallTags = JSON.parse(followUp.callTags);
          } catch (_e) {
            parsedCallTags = [];
          }
        } else if (Array.isArray(followUp.callTags)) {
          parsedCallTags = followUp.callTags;
        }
      }

      return {
        id: followUp.id,
        customerId: followUp.customerId,
        type: followUp.type,
        title: followUp.type === 'call' ? '电话跟进' :
               followUp.type === 'visit' ? '上门拜访' :
               followUp.type === 'email' ? '邮件跟进' :
               followUp.type === 'message' ? '消息跟进' :
               followUp.type === 'wechat' ? '微信跟进' : '跟进记录',
        content: followUp.content || '',
        customerIntent: followUp.customerIntent || null,
        callTags: parsedCallTags,
        call_tags: parsedCallTags,
        status: followUp.status,
        priority: followUp.priority,
        nextFollowUp: followUp.nextFollowUp ? new Date(followUp.nextFollowUp).toISOString() : '',
        nextTime: followUp.nextFollowUp ? new Date(followUp.nextFollowUp).toISOString() : '',
        createdBy: followUp.createdBy,
        createdByName: followUp.createdByName || followUp.createdBy || '系统',
        author: followUp.createdByName || followUp.createdBy || '系统',
        createTime: followUp.createdAt ? new Date(followUp.createdAt).toISOString() : '',
        createdAt: followUp.createdAt ? new Date(followUp.createdAt).toISOString() : ''
      };
    });

    log.info(`[客户跟进] 客户 ${customerId} 有 ${list.length} 条跟进记录`);

    res.json({ success: true, code: 200, data: list });
  } catch (error) {
    log.error('获取客户跟进记录失败:', error);
    // 🔥 返回空数组而不是500错误，避免前端显示错误
    res.json({ success: true, code: 200, data: [], message: '暂无跟进记录' });
  }
});

router.post('/:id/followups', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { type, content, status, priority, nextFollowUp } = req.body;
    // 🔥 修复：使用正确的currentUser字段
    const currentUser = (req as any).currentUser;

    const { FollowUp } = await import('../../entities/FollowUp');
    const followUpRepository = getTenantRepo(FollowUp);

    // 获取客户信息
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: customerId } });

    // 生成唯一ID
    const { v4: uuidv4 } = await import('uuid');

    const followUp = followUpRepository.create({
      id: uuidv4(),
      customerId,
      customerName: customer?.name || '',
      type: type || 'call',
      content: content || '',
      status: status || 'completed',
      priority: priority || 'medium',
      nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
      createdBy: currentUser?.id || 'system',
      createdByName: currentUser?.name || currentUser?.realName || '系统'
    });

    const savedFollowUp = await followUpRepository.save(followUp);

    log.info(`[添加跟进] 客户 ${customerId} 添加跟进记录成功`);

    const title = savedFollowUp.type === 'call' ? '电话跟进' :
                  savedFollowUp.type === 'visit' ? '上门拜访' :
                  savedFollowUp.type === 'email' ? '邮件跟进' :
                  savedFollowUp.type === 'message' ? '消息跟进' : '跟进记录';

    res.status(201).json({
      success: true,
      code: 200,
      data: {
        id: savedFollowUp.id,
        customerId: savedFollowUp.customerId,
        type: savedFollowUp.type,
        title: title,
        content: savedFollowUp.content,
        status: savedFollowUp.status,
        priority: savedFollowUp.priority,
        nextFollowUp: savedFollowUp.nextFollowUp?.toISOString() || '',
        author: savedFollowUp.createdByName || savedFollowUp.createdBy || '系统',
        createTime: savedFollowUp.createdAt?.toISOString() || ''
      }
    });
  } catch (error) {
    log.error('添加跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '添加跟进记录失败' });
  }
});

router.put('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params;
    const { type, content, status, priority, nextFollowUp } = req.body;

    const { FollowUp } = await import('../../entities/FollowUp');
    const followUpRepository = getTenantRepo(FollowUp);

    const followUp = await followUpRepository.findOne({ where: { id: followUpId } });
    if (!followUp) {
      return res.status(404).json({ success: false, code: 404, message: '跟进记录不存在' });
    }

    if (type !== undefined) followUp.type = type;
    if (content !== undefined) followUp.content = content;
    if (status !== undefined) followUp.status = status;
    if (priority !== undefined) followUp.priority = priority;
    if (nextFollowUp !== undefined) followUp.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : undefined;

    const updatedFollowUp = await followUpRepository.save(followUp);

    const title = updatedFollowUp.type === 'call' ? '电话跟进' :
                  updatedFollowUp.type === 'visit' ? '上门拜访' :
                  updatedFollowUp.type === 'email' ? '邮件跟进' :
                  updatedFollowUp.type === 'message' ? '消息跟进' : '跟进记录';

    res.json({
      success: true,
      code: 200,
      data: {
        id: updatedFollowUp.id,
        type: updatedFollowUp.type,
        title: title,
        content: updatedFollowUp.content,
        status: updatedFollowUp.status,
        priority: updatedFollowUp.priority,
        nextFollowUp: updatedFollowUp.nextFollowUp?.toISOString() || '',
        author: updatedFollowUp.createdByName || updatedFollowUp.createdBy || '系统',
        createTime: updatedFollowUp.createdAt?.toISOString() || ''
      }
    });
  } catch (error) {
    log.error('更新跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '更新跟进记录失败' });
  }
});

router.delete('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params;

    const { FollowUp } = await import('../../entities/FollowUp');
    const followUpRepository = getTenantRepo(FollowUp);

    const followUp = await followUpRepository.findOne({ where: { id: followUpId } });
    if (!followUp) {
      return res.status(404).json({ success: false, code: 404, message: '跟进记录不存在' });
    }

    await followUpRepository.remove(followUp);

    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    log.error('删除跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '删除跟进记录失败' });
  }
});

router.get('/:id/tags', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });
    res.json({ success: true, code: 200, data: customer?.tags || [] });
  } catch (error) {
    log.error('获取客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户标签失败' });
  }
});

router.post('/:id/tags', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }
    const tagData = req.body;
    const newTag = { id: `tag_${Date.now()}`, ...tagData };
    customer.tags = [...(customer.tags || []), newTag];
    await customerRepository.save(customer);
    res.status(201).json({ success: true, code: 200, data: newTag });
  } catch (error) {
    log.error('添加客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '添加客户标签失败' });
  }
});

router.delete('/:id/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    customer.tags = (customer.tags || []).filter((tag: any) => tag.id !== req.params.tagId);
    await customerRepository.save(customer);
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    log.error('删除客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '删除客户标签失败' });
  }
});

router.get('/:id/medical-history', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });

    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    // 疾病史存储在 medicalHistory 字段中，可能是字符串或JSON数组
    let medicalRecords: any[] = [];

    if (customer.medicalHistory) {
      // 尝试解析为JSON数组
      try {
        const parsed = JSON.parse(customer.medicalHistory);
        if (Array.isArray(parsed)) {
          medicalRecords = parsed;
        } else {
          // 如果是字符串，转换为单条记录
          medicalRecords = [{
            id: 1,
            content: customer.medicalHistory,
            createTime: customer.createdAt?.toISOString() || '',
            operator: '系统'
          }];
        }
      } catch {
        // 解析失败，作为纯文本处理
        medicalRecords = [{
          id: 1,
          content: customer.medicalHistory,
          createTime: customer.createdAt?.toISOString() || '',
          operator: '系统'
        }];
      }
    }

    log.info(`[客户疾病史] 客户 ${req.params.id} 有 ${medicalRecords.length} 条疾病史记录`);
    res.json({ success: true, code: 200, data: medicalRecords });
  } catch (error) {
    log.error('获取客户疾病史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户疾病史失败' });
  }
});

router.post('/:id/medical-history', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });

    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    const { content } = req.body;
    // 🔥 修复：使用正确的currentUser字段
    const currentUser = (req as any).currentUser;

    // 解析现有疾病史
    let medicalRecords: any[] = [];
    if (customer.medicalHistory) {
      try {
        const parsed = JSON.parse(customer.medicalHistory);
        if (Array.isArray(parsed)) {
          medicalRecords = parsed;
        } else {
          medicalRecords = [{
            id: 1,
            content: customer.medicalHistory,
            createTime: customer.createdAt?.toISOString() || '',
            operator: '系统'
          }];
        }
      } catch {
        medicalRecords = [{
          id: 1,
          content: customer.medicalHistory,
          createTime: customer.createdAt?.toISOString() || '',
          operator: '系统'
        }];
      }
    }

    // 添加新记录
    // 🔥 修复：优先使用 realName，其次 name，最后才是 '系统'
    const operatorName = currentUser?.realName || currentUser?.name || '系统';
    log.info('[疾病史] 添加记录，操作人:', operatorName, '当前用户:', currentUser?.id, currentUser?.realName, currentUser?.name);

    const newRecord = {
      id: Date.now(),
      content: content,
      createTime: new Date().toISOString(),
      operator: operatorName,
      operationType: 'add'
    };

    medicalRecords.unshift(newRecord);

    // 保存到数据库
    customer.medicalHistory = JSON.stringify(medicalRecords);
    await customerRepository.save(customer);

    log.info(`[添加疾病史] 客户 ${req.params.id} 添加疾病史成功`);
    res.status(201).json({ success: true, code: 200, data: newRecord });
  } catch (error) {
    log.error('添加客户疾病史失败:', error);
    res.status(500).json({ success: false, code: 500, message: '添加客户疾病史失败' });
  }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const customerRepository = getTenantRepo(Customer);
    const orderRepository = getTenantRepo(Order);

    // 获取客户基本信息
    const customer = await customerRepository.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }

    // 从订单表统计数据
    const orders = await orderRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });

    // 计算累计消费（统计已审核通过及之后状态的订单）
    // 🔥 修复：包含待发货、已发货、已签收、已完成等状态
    const validStatuses = ['approved', 'pending_shipment', 'shipped', 'delivered', 'signed', 'completed', 'paid'];
    const validOrders = orders.filter(o => validStatuses.includes(o.status));
    const totalConsumption = validOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
    log.info(`[客户统计] 客户 ${customerId}: 有效订单状态=${validStatuses.join(',')}, 有效订单数=${validOrders.length}`);

    // 订单数量
    const orderCount = orders.length;

    // 退货次数（统计退款/取消的订单）
    const returnStatuses = ['refunded', 'cancelled'];
    const returnCount = orders.filter(o => returnStatuses.includes(o.status)).length;

    // 最后下单时间
    const lastOrder = orders[0];
    const lastOrderDate = lastOrder?.createdAt
      ? new Date(lastOrder.createdAt).toLocaleDateString('zh-CN')
      : null;

    log.info(`[客户统计] 客户 ${customerId}: 消费¥${totalConsumption}, 订单${orderCount}个, 退货${returnCount}次`);

    res.json({
      success: true,
      code: 200,
      data: {
        totalConsumption,
        orderCount,
        returnCount,
        lastOrderDate
      }
    });
  } catch (error) {
    log.error('获取客户统计数据失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户统计数据失败' });
  }
});
}
