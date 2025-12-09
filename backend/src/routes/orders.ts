import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import { SystemConfig } from '../entities/SystemConfig';
import { DepartmentOrderLimit } from '../entities/DepartmentOrderLimit';
import { Like, Between } from 'typeorm';

// 验证部门下单限制
interface OrderLimitCheckResult {
  allowed: boolean;
  message?: string;
  limitType?: 'order_count' | 'single_amount' | 'total_amount';
}

const checkDepartmentOrderLimit = async (
  departmentId: string,
  customerId: string,
  orderAmount: number
): Promise<OrderLimitCheckResult> => {
  try {
    // 获取部门下单限制配置
    const limitRepository = AppDataSource.getRepository(DepartmentOrderLimit);
    const limit = await limitRepository.findOne({
      where: { departmentId, isEnabled: true }
    });

    // 如果没有配置或配置未启用，允许下单
    if (!limit) {
      return { allowed: true };
    }

    const orderRepository = AppDataSource.getRepository(Order);

    // 检查下单次数限制
    if (limit.orderCountEnabled && limit.maxOrderCount > 0) {
      const orderCount = await orderRepository.count({
        where: {
          customerId,
          createdByDepartmentId: departmentId
        }
      });

      if (orderCount >= limit.maxOrderCount) {
        return {
          allowed: false,
          message: `该客户在本部门已下单${orderCount}次，已达到最大下单次数限制(${limit.maxOrderCount}次)，请联系管理员`,
          limitType: 'order_count'
        };
      }
    }

    // 检查单笔金额限制
    if (limit.singleAmountEnabled && limit.maxSingleAmount > 0) {
      if (orderAmount > Number(limit.maxSingleAmount)) {
        return {
          allowed: false,
          message: `订单金额¥${orderAmount.toFixed(2)}超出单笔金额限制(¥${Number(limit.maxSingleAmount).toFixed(2)})，请联系管理员`,
          limitType: 'single_amount'
        };
      }
    }

    // 检查累计金额限制
    if (limit.totalAmountEnabled && limit.maxTotalAmount > 0) {
      const result = await orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.customerId = :customerId', { customerId })
        .andWhere('order.createdByDepartmentId = :departmentId', { departmentId })
        .getRawOne();

      const currentTotal = Number(result?.total || 0);
      const newTotal = currentTotal + orderAmount;

      if (newTotal > Number(limit.maxTotalAmount)) {
        return {
          allowed: false,
          message: `该客户在本部门累计金额将达到¥${newTotal.toFixed(2)}，超出累计金额限制(¥${Number(limit.maxTotalAmount).toFixed(2)})，请联系管理员`,
          limitType: 'total_amount'
        };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('检查部门下单限制失败:', error);
    // 出错时默认允许下单，避免影响正常业务
    return { allowed: true };
  }
};

// 获取订单流转配置
const getOrderTransferConfig = async (): Promise<{ mode: string; delayMinutes: number }> => {
  try {
    const configRepository = AppDataSource.getRepository(SystemConfig);
    const modeConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferMode', configGroup: 'order_settings', isEnabled: true }
    });
    const delayConfig = await configRepository.findOne({
      where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings', isEnabled: true }
    });
    return {
      mode: modeConfig?.configValue || 'delayed',
      delayMinutes: delayConfig ? Number(delayConfig.configValue) : 3
    };
  } catch {
    return { mode: 'delayed', delayMinutes: 3 };
  }
};

const router = Router();

// 所有订单路由都需要认证
router.use(authenticateToken);

// ========== 特殊路由（必须在 /:id 之前定义）==========

/**
 * @route GET /api/v1/orders/transfer-config
 * @desc 获取订单流转配置
 * @access Private
 */
router.get('/transfer-config', async (_req: Request, res: Response) => {
  try {
    const config = await getOrderTransferConfig();
    res.json({
      success: true,
      code: 200,
      data: config
    });
  } catch (error) {
    console.error('获取流转配置失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取流转配置失败'
    });
  }
});

/**
 * @route POST /api/v1/orders/check-transfer
 * @desc 检查并执行订单流转
 * @access Private
 */
router.post('/check-transfer', async (_req: Request, res: Response) => {
  try {
    console.log('🔄 [订单流转] 检查待流转订单...');

    const orderRepository = AppDataSource.getRepository(Order);
    const transferConfig = await getOrderTransferConfig();
    const now = new Date();
    const delayMs = transferConfig.delayMinutes * 60 * 1000;

    // 查找所有待流转的订单（状态为pending_transfer且markType为normal）
    const pendingOrders = await orderRepository.find({
      where: {
        status: 'pending_transfer',
        markType: 'normal'
      }
    });

    console.log(`🔍 [订单流转] 找到 ${pendingOrders.length} 个待流转订单`);

    const transferredOrders: Order[] = [];

    for (const order of pendingOrders) {
      if (!order.createdAt) continue;

      const transferTime = new Date(order.createdAt.getTime() + delayMs);

      // 检查是否已到流转时间
      if (now >= transferTime) {
        console.log(`⏰ [订单流转] 订单 ${order.orderNumber} 已到流转时间，执行流转`);

        // 更新订单状态
        order.status = 'pending_audit';
        order.updatedAt = now;

        await orderRepository.save(order);
        transferredOrders.push(order);

        console.log(`✅ [订单流转] 订单 ${order.orderNumber} 已流转到待审核状态`);
      }
    }

    console.log(`📊 [订单流转] 本次流转 ${transferredOrders.length} 个订单`);

    res.json({
      success: true,
      code: 200,
      message: '订单流转检查完成',
      data: {
        transferredCount: transferredOrders.length,
        orders: transferredOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status
        }))
      }
    });
  } catch (error) {
    console.error('❌ [订单流转] 检查失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '订单流转检查失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/statistics
 * @desc 获取订单统计数据
 * @access Private
 */
router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pendingCount = await orderRepository.count({
      where: { status: 'pending' }
    });

    const todayCount = await orderRepository.createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .getCount();

    const pendingAmountResult = await orderRepository.createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: 'pending' })
      .getRawOne();

    res.json({
      success: true,
      code: 200,
      data: {
        pendingCount,
        todayCount,
        pendingAmount: Number(pendingAmountResult?.total || 0),
        urgentCount: 0
      }
    });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单统计失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/cancel-request
 * @desc 提交取消订单申请
 * @access Private
 */
router.post('/cancel-request', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { orderId, reason, description } = req.body;

    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    order.status = 'pending';
    order.remark = `取消原因: ${reason}${description ? ` - ${description}` : ''}`;

    await orderRepository.save(order);

    res.json({
      success: true,
      code: 200,
      message: '取消申请已提交'
    });
  } catch (error) {
    console.error('提交取消申请失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '提交取消申请失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/pending-cancel
 * @desc 获取待审核的取消订单列表
 * @access Private
 */
router.get('/pending-cancel', async (_req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const orders = await orderRepository.createQueryBuilder('order')
      .where('order.status = :status', { status: 'pending' })
      .andWhere('order.remark LIKE :cancelNote', { cancelNote: '%取消原因%' })
      .orderBy('order.updatedAt', 'DESC')
      .getMany();

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.remark || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'pending_cancel',
      createdBy: order.createdBy || ''
    }));

    res.json({
      success: true,
      code: 200,
      data: formattedOrders
    });
  } catch (error) {
    console.error('获取待审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取待审核取消订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/audited-cancel
 * @desc 获取已审核的取消订单列表
 * @access Private
 */
router.get('/audited-cancel', async (_req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const orders = await orderRepository.find({
      where: { status: 'cancelled' },
      order: { updatedAt: 'DESC' }
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.remark || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'cancelled',
      createdBy: order.createdBy || ''
    }));

    res.json({
      success: true,
      code: 200,
      data: formattedOrders
    });
  } catch (error) {
    console.error('获取已审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取已审核取消订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ========== 通用路由 ==========

/**
 * @route GET /api/v1/orders
 * @desc 获取订单列表
 * @access Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const {
      page = 1,
      pageSize = 20,
      status,
      orderNumber,
      customerName,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (orderNumber) {
      where.orderNumber = Like(`%${orderNumber}%`);
    }

    if (customerName) {
      where.customerName = Like(`%${customerName}%`);
    }

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate as string), new Date(endDate as string));
    }

    const [orders, total] = await orderRepository.findAndCount({
      where,
      skip,
      take: pageSizeNum,
      order: { createdAt: 'DESC' }
    });

    console.log(`📋 [订单列表] 查询到 ${orders.length} 条订单, 总数: ${total}`);

    // 转换数据格式以匹配前端期望
    const list = orders.map(order => {
      // 解析products JSON字段
      let products: unknown[] = [];
      if (order.products) {
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products as string) : order.products;
        } catch {
          products = [];
        }
      }

      // 根据订单状态推断auditStatus
      let auditStatus = 'pending';
      if (order.status === 'pending_shipment' || order.status === 'shipped' || order.status === 'delivered' || order.status === 'paid') {
        auditStatus = 'approved';
      } else if (order.status === 'audit_rejected') {
        auditStatus = 'rejected';
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId || '',
        customerName: order.customerName || '',
        customerPhone: order.customerPhone || '',
        products: products,
        totalAmount: Number(order.totalAmount) || 0,
        depositAmount: Number(order.depositAmount) || 0,
        collectAmount: Number(order.finalAmount) || 0,
        receiverName: order.shippingName || '',
        receiverPhone: order.shippingPhone || '',
        receiverAddress: order.shippingAddress || '',
        remark: order.remark || '',
        status: order.status || 'pending_transfer',
        auditStatus: auditStatus,
        markType: order.markType || 'normal',
        paymentStatus: order.paymentStatus || 'unpaid',
        paymentMethod: order.paymentMethod || '',
        expressCompany: order.expressCompany || '',
        trackingNumber: order.trackingNumber || '',
        serviceWechat: order.serviceWechat || '',
        orderSource: order.orderSource || '',
        createTime: order.createdAt?.toISOString() || '',
        createdBy: order.createdBy || '',
        createdByName: order.createdByName || '',
        salesPersonId: order.createdBy || ''
      };
    });

    res.json({
      success: true,
      code: 200,
      message: '获取订单列表成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    console.error('❌ [订单列表] 获取失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/orders/:id
 * @desc 获取订单详情
 * @access Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    // 解析products JSON字段
    let products: unknown[] = [];
    if (order.products) {
      try {
        products = typeof order.products === 'string' ? JSON.parse(order.products as string) : order.products;
      } catch {
        products = [];
      }
    }

    // 根据订单状态推断auditStatus
    let auditStatus = 'pending';
    if (order.status === 'pending_shipment' || order.status === 'shipped' || order.status === 'delivered' || order.status === 'paid') {
      auditStatus = 'approved';
    } else if (order.status === 'audit_rejected') {
      auditStatus = 'rejected';
    }

    // 计算流转时间（创建时间 + 配置的延迟分钟数）
    let auditTransferTime = '';
    let isAuditTransferred = false;
    if (order.createdAt && order.status === 'pending_transfer') {
      // 获取流转配置
      const transferConfig = await getOrderTransferConfig();
      const delayMs = transferConfig.delayMinutes * 60 * 1000;
      const transferDate = new Date(order.createdAt.getTime() + delayMs);
      auditTransferTime = transferDate.toISOString();
      isAuditTransferred = false;
    } else if (order.status === 'pending_audit' || order.status === 'pending_shipment' || order.status === 'shipped') {
      isAuditTransferred = true;
    }

    const data = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      products: products,
      totalAmount: Number(order.totalAmount) || 0,
      depositAmount: Number(order.depositAmount) || 0,
      collectAmount: Number(order.finalAmount) || 0,
      receiverName: order.shippingName || '',
      receiverPhone: order.shippingPhone || '',
      receiverAddress: order.shippingAddress || '',
      remark: order.remark || '',
      status: order.status || 'pending_transfer',
      auditStatus: auditStatus,
      markType: order.markType || 'normal',
      isAuditTransferred: isAuditTransferred,
      auditTransferTime: auditTransferTime,
      paymentStatus: order.paymentStatus || 'unpaid',
      paymentMethod: order.paymentMethod || '',
      expressCompany: order.expressCompany || '',
      trackingNumber: order.trackingNumber || '',
      serviceWechat: order.serviceWechat || '',
      orderSource: order.orderSource || '',
      depositScreenshots: order.depositScreenshots || [],
      createTime: order.createdAt?.toISOString() || '',
      createdBy: order.createdBy || '',
      createdByName: order.createdByName || '',
      salesPersonId: order.createdBy || ''
    };

    res.json({
      success: true,
      code: 200,
      message: '获取订单详情成功',
      data
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取订单详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders
 * @desc 创建订单
 * @access Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('📝 [订单创建] 收到请求数据:', JSON.stringify(req.body, null, 2));

    const orderRepository = AppDataSource.getRepository(Order);

    const {
      customerId,
      customerName,
      customerPhone,
      products,
      totalAmount,
      discount,
      collectAmount,
      depositAmount,
      depositScreenshots,
      depositScreenshot,
      receiverName,
      receiverPhone,
      receiverAddress,
      remark,
      paymentMethod,
      salesPersonId,
      salesPersonName,
      orderNumber,
      serviceWechat,
      orderSource,
      markType,
      expressCompany
    } = req.body;

    // 数据验证
    if (!customerId) {
      console.error('❌ [订单创建] 缺少客户ID');
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少客户ID'
      });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error('❌ [订单创建] 缺少商品信息');
      return res.status(400).json({
        success: false,
        code: 400,
        message: '缺少商品信息'
      });
    }

    // 生成订单号
    const generatedOrderNumber = orderNumber || `ORD${Date.now()}`;

    // 计算金额
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalDepositAmount = Number(depositAmount) || 0;
    const finalAmount = finalTotalAmount - (Number(discount) || 0);

    // 处理定金截图
    let finalDepositScreenshots: string[] = [];
    if (depositScreenshots && Array.isArray(depositScreenshots)) {
      finalDepositScreenshots = depositScreenshots;
    } else if (depositScreenshot) {
      finalDepositScreenshots = [depositScreenshot];
    }

    // 获取当前用户信息
    const currentUser = (req as any).currentUser;
    const finalCreatedBy = salesPersonId || currentUser?.id || 'admin';
    // 优先使用传入的销售人员姓名，其次使用当前用户的真实姓名，最后使用用户名
    const finalCreatedByName = salesPersonName || currentUser?.realName || currentUser?.username || '';
    // 获取创建人部门信息
    const createdByDepartmentId = currentUser?.departmentId || '';
    const createdByDepartmentName = currentUser?.departmentName || '';

    // 验证部门下单限制（仅对正常发货单进行验证）
    if (markType !== 'reserved' && markType !== 'return' && createdByDepartmentId) {
      const limitCheck = await checkDepartmentOrderLimit(
        createdByDepartmentId,
        String(customerId),
        finalTotalAmount
      );

      if (!limitCheck.allowed) {
        console.warn(`⚠️ [订单创建] 部门下单限制: ${limitCheck.message}`);
        return res.status(400).json({
          success: false,
          code: 400,
          message: limitCheck.message,
          limitType: limitCheck.limitType
        });
      }
    }

    console.log('📝 [订单创建] 准备创建订单:', {
      orderNumber: generatedOrderNumber,
      customerId,
      totalAmount: finalTotalAmount,
      depositAmount: finalDepositAmount
    });

    // 创建订单
    const order = orderRepository.create({
      orderNumber: generatedOrderNumber,
      customerId: String(customerId),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      serviceWechat: serviceWechat || '',
      orderSource: orderSource || '',
      products: products,
      status: 'pending_transfer',
      totalAmount: finalTotalAmount,
      discountAmount: Number(discount) || 0,
      finalAmount: finalAmount,
      depositAmount: finalDepositAmount,
      depositScreenshots: finalDepositScreenshots.length > 0 ? finalDepositScreenshots : undefined,
      paymentStatus: finalDepositAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || undefined,
      shippingName: receiverName || customerName || '',
      shippingPhone: receiverPhone || customerPhone || '',
      shippingAddress: receiverAddress || '',
      expressCompany: expressCompany || '',
      markType: markType || 'normal',
      remark: remark || '',
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName,
      createdByDepartmentId: createdByDepartmentId || undefined,
      createdByDepartmentName: createdByDepartmentName || undefined
    });

    const savedOrder = await orderRepository.save(order);
    console.log('✅ [订单创建] 订单保存成功:', savedOrder.id);

    // 更新产品库存
    try {
      const productRepository = AppDataSource.getRepository(Product);
      for (const item of products) {
        const productId = item.id || item.productId;
        const quantity = Number(item.quantity) || 1;

        if (productId) {
          const product = await productRepository.findOne({ where: { id: productId } });
          if (product && product.stock >= quantity) {
            product.stock = product.stock - quantity;
            await productRepository.save(product);
            console.log(`📦 [库存更新] 产品 ${product.name} 库存减少 ${quantity}，剩余 ${product.stock}`);
          } else if (product) {
            console.warn(`⚠️ [库存更新] 产品 ${product.name} 库存不足，当前 ${product.stock}，需要 ${quantity}`);
          }
        }
      }
    } catch (stockError) {
      console.error('⚠️ [库存更新] 更新库存失败，但订单已创建:', stockError);
    }

    // 返回完整的订单数据
    const responseData = {
      id: savedOrder.id,
      orderNumber: savedOrder.orderNumber,
      customerId: savedOrder.customerId,
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      products: products,
      totalAmount: finalTotalAmount,
      depositAmount: finalDepositAmount,
      collectAmount: Number(collectAmount) || finalTotalAmount - finalDepositAmount,
      receiverName: receiverName || customerName || '',
      receiverPhone: receiverPhone || customerPhone || '',
      receiverAddress: receiverAddress || '',
      remark: remark || '',
      status: 'pending_transfer',
      auditStatus: 'pending',
      markType: markType || 'normal',
      createTime: savedOrder.createdAt?.toISOString() || new Date().toISOString(),
      createdBy: finalCreatedBy,
      createdByName: finalCreatedByName,
      salesPersonId: finalCreatedBy
    };

    console.log('✅ [订单创建] 返回数据:', responseData);

    res.status(201).json({
      success: true,
      code: 200,
      message: '订单创建成功',
      data: responseData
    });
  } catch (error) {
    const err = error as any;
    console.error('❌ [订单创建] 失败:', {
      message: err?.message,
      stack: err?.stack,
      code: err?.code,
      sqlMessage: err?.sqlMessage
    });
    res.status(500).json({
      success: false,
      code: 500,
      message: err?.sqlMessage || err?.message || '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
});


/**
 * @route PUT /api/v1/orders/:id/mark-type
 * @desc 更新订单标记类型
 * @access Private
 * 注意：此路由必须在 /:id 之前定义，否则会被 /:id 拦截
 */
router.put('/:id/mark-type', authenticateToken, async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { markType } = req.body;
    const orderId = req.params.id;

    console.log(`📝 [订单标记] 更新订单 ${orderId} 标记类型为 ${markType}`);

    const order = await orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    order.markType = markType;
    await orderRepository.save(order);

    console.log(`✅ [订单标记] 订单 ${orderId} 标记更新成功`);

    res.json({
      success: true,
      code: 200,
      message: '订单标记更新成功',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        markType: order.markType
      }
    });
  } catch (error) {
    console.error('❌ [订单标记] 更新失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新订单标记失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route PUT /api/v1/orders/:id
 * @desc 更新订单
 * @access Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    const updateData = req.body;

    // 更新订单字段
    if (updateData.status !== undefined) order.status = updateData.status;
    if (updateData.receiverName || updateData.shippingName) order.shippingName = updateData.receiverName || updateData.shippingName;
    if (updateData.receiverPhone || updateData.shippingPhone) order.shippingPhone = updateData.receiverPhone || updateData.shippingPhone;
    if (updateData.receiverAddress || updateData.shippingAddress) order.shippingAddress = updateData.receiverAddress || updateData.shippingAddress;
    if (updateData.remark !== undefined) order.remark = updateData.remark;
    if (updateData.paymentStatus !== undefined) order.paymentStatus = updateData.paymentStatus;
    if (updateData.paymentMethod !== undefined) order.paymentMethod = updateData.paymentMethod;
    if (updateData.expressCompany !== undefined) order.expressCompany = updateData.expressCompany;
    if (updateData.trackingNumber !== undefined) order.trackingNumber = updateData.trackingNumber;
    if (updateData.markType !== undefined) order.markType = updateData.markType;

    const updatedOrder = await orderRepository.save(order);

    res.json({
      success: true,
      code: 200,
      message: '订单更新成功',
      data: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status
      }
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/v1/orders/:id
 * @desc 删除订单
 * @access Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const order = await orderRepository.findOne({
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    await orderRepository.remove(order);

    res.json({
      success: true,
      code: 200,
      message: '订单删除成功'
    });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/submit-audit
 * @desc 提交订单审核
 * @access Private
 */
router.post('/:id/submit-audit', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { remark } = req.body;
    const idParam = req.params.id;

    let order = await orderRepository.findOne({ where: { id: idParam } });
    if (!order) {
      order = await orderRepository.findOne({ where: { orderNumber: idParam } });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    order.status = 'pending_audit';
    if (remark) {
      order.remark = `${order.remark || ''} | 提审备注: ${remark}`;
    }

    await orderRepository.save(order);

    console.log(`✅ [订单提审] 订单 ${order.orderNumber} 已提交审核，状态变更为 pending_audit`);

    res.json({
      success: true,
      code: 200,
      message: '订单已提交审核',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });
  } catch (error) {
    console.error('提交订单审核失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '提交订单审核失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/audit
 * @desc 审核订单
 * @access Private
 */
router.post('/:id/audit', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { action, remark } = req.body;
    const idParam = req.params.id;

    let order = await orderRepository.findOne({ where: { id: idParam } });
    if (!order) {
      order = await orderRepository.findOne({ where: { orderNumber: idParam } });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    if (action === 'approve') {
      order.status = 'pending_shipment';
      order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;
      console.log(`✅ [订单审核] 订单 ${order.orderNumber} 审核通过，状态变更为 pending_shipment`);
    } else {
      order.status = 'audit_rejected';
      order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;
      console.log(`❌ [订单审核] 订单 ${order.orderNumber} 审核拒绝，状态变更为 audit_rejected`);
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      code: 200,
      message: action === 'approve' ? '订单审核通过' : '订单审核拒绝',
      data: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        auditStatus: action === 'approve' ? 'approved' : 'rejected'
      }
    });
  } catch (error) {
    console.error('审核订单失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '审核订单失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/orders/:id/cancel-audit
 * @desc 审核取消订单申请
 * @access Private
 */
router.post('/:id/cancel-audit', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);
    const { action, remark } = req.body;

    const order = await orderRepository.findOne({ where: { id: req.params.id } });

    if (!order) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '订单不存在'
      });
    }

    if (action === 'approve') {
      order.status = 'cancelled';
      order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;
    } else {
      order.status = 'confirmed';
      order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      code: 200,
      message: action === 'approve' ? '取消申请已通过' : '取消申请已拒绝'
    });
  } catch (error) {
    console.error('审核取消申请失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '审核取消申请失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
