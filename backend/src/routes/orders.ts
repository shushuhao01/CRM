import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';

const router = Router();

// 所有订单路由都需要认证
router.use(authenticateToken);

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

    const queryBuilder = orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.orderItems', 'orderItems');

    // 状态筛选
    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    // 订单号筛选
    if (orderNumber) {
      queryBuilder.andWhere('order.orderNo LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
    }

    // 客户名称筛选
    if (customerName) {
      queryBuilder.andWhere('customer.name LIKE :customerName', { customerName: `%${customerName}%` });
    }

    // 日期范围筛选
    if (startDate) {
      queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('order.createdAt <= :endDate', { endDate });
    }

    // 分页
    const skip = (Number(page) - 1) * Number(pageSize);
    queryBuilder.skip(skip).take(Number(pageSize));

    // 排序
    queryBuilder.orderBy('order.createdAt', 'DESC');

    const [orders, total] = await queryBuilder.getManyAndCount();

    // 转换为前端需要的格式
    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.orderNo,
      customerId: order.customerId?.toString() || '',
      customerName: order.customer?.name || '',
      customerPhone: order.customer?.phone || '',
      products: order.orderItems?.map(item => ({
        id: item.id.toString(),
        name: item.productName,
        price: Number(item.unitPrice),
        quantity: item.quantity,
        total: Number(item.subtotal)
      })) || [],
      totalAmount: Number(order.totalAmount),
      depositAmount: 0,
      collectAmount: Number(order.paidAmount),
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      remark: order.notes || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      createTime: order.createdAt?.toISOString() || '',
      createdBy: order.salesUserId?.toString() || '',
      salesPersonId: order.salesUserId?.toString() || ''
    }));

    res.json({
      success: true,
      data: {
        list: formattedOrders,
        total,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({
      success: false,
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
      where: { id: parseInt(req.params.id) },
      relations: ['customer', 'orderItems', 'statusHistory']
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    const formattedOrder = {
      id: order.id.toString(),
      orderNumber: order.orderNo,
      customerId: order.customerId?.toString() || '',
      customerName: order.customer?.name || '',
      customerPhone: order.customer?.phone || '',
      products: order.orderItems?.map(item => ({
        id: item.id.toString(),
        name: item.productName,
        price: Number(item.unitPrice),
        quantity: item.quantity,
        total: Number(item.subtotal)
      })) || [],
      totalAmount: Number(order.totalAmount),
      depositAmount: 0,
      collectAmount: Number(order.paidAmount),
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      remark: order.notes || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      createTime: order.createdAt?.toISOString() || '',
      createdBy: order.salesUserId?.toString() || '',
      salesPersonId: order.salesUserId?.toString() || ''
    };

    res.json({
      success: true,
      data: formattedOrder
    });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取订单详情失败'
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
    const orderItemRepository = AppDataSource.getRepository(OrderItem);

    const {
      customerId,
      customerName,
      customerPhone,
      products,
      totalAmount,
      subtotal,
      discount,
      collectAmount,
      depositAmount,
      receiverName,
      receiverPhone,
      receiverAddress,
      remark,
      paymentMethod,
      salesPersonId,
      orderNumber,
      serviceWechat,
      orderSource
    } = req.body;

    // 数据验证
    if (!customerId) {
      console.error('❌ [订单创建] 缺少客户ID');
      return res.status(400).json({
        success: false,
        message: '缺少客户ID'
      });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      console.error('❌ [订单创建] 缺少商品信息');
      return res.status(400).json({
        success: false,
        message: '缺少商品信息'
      });
    }

    // 解析客户ID（支持字符串和数字）
    let parsedCustomerId: number;
    if (typeof customerId === 'string') {
      // 如果是类似 "customer_xxx" 的格式，需要查找或创建客户
      if (customerId.startsWith('customer_') || customerId.startsWith('temp_')) {
        console.log('📝 [订单创建] 检测到临时客户ID，尝试查找或创建客户');
        // 尝试通过手机号查找客户
        if (customerPhone) {
          const existingCustomer = await AppDataSource.query(
            'SELECT id FROM customers WHERE phone = ? LIMIT 1',
            [customerPhone]
          );
          if (existingCustomer.length > 0) {
            parsedCustomerId = existingCustomer[0].id;
            console.log('✅ [订单创建] 通过手机号找到客户:', parsedCustomerId);
          } else {
            // 创建新客户
            const customerCode = `C${Date.now()}`;
            const result = await AppDataSource.query(
              `INSERT INTO customers (customer_code, name, phone, sales_person_id, created_at, updated_at)
               VALUES (?, ?, ?, ?, NOW(), NOW())`,
              [customerCode, customerName || '未知客户', customerPhone, salesPersonId || null]
            );
            parsedCustomerId = result.insertId;
            console.log('✅ [订单创建] 创建新客户:', parsedCustomerId);
          }
        } else {
          console.error('❌ [订单创建] 临时客户ID但缺少手机号');
          return res.status(400).json({
            success: false,
            message: '缺少客户手机号'
          });
        }
      } else {
        parsedCustomerId = parseInt(customerId);
      }
    } else {
      parsedCustomerId = customerId;
    }

    if (isNaN(parsedCustomerId) || parsedCustomerId <= 0) {
      console.error('❌ [订单创建] 无效的客户ID:', customerId);
      return res.status(400).json({
        success: false,
        message: '无效的客户ID'
      });
    }

    // 生成订单号（使用前端传的或自动生成）
    const orderNo = orderNumber || `ORD${Date.now()}`;

    // 计算金额
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalPaidAmount = Number(depositAmount) || Number(collectAmount) || 0;

    console.log('📝 [订单创建] 准备创建订单:', {
      orderNo,
      customerId: parsedCustomerId,
      totalAmount: finalTotalAmount,
      paidAmount: finalPaidAmount
    });

    // 创建订单
    const order = orderRepository.create({
      orderNo,
      customerId: parsedCustomerId,
      status: 'pending',
      totalAmount: finalTotalAmount,
      discountAmount: Number(discount) || 0,
      paidAmount: finalPaidAmount,
      paymentStatus: finalPaidAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod: paymentMethod || null,
      receiverName: receiverName || customerName || '',
      receiverPhone: receiverPhone || customerPhone || '',
      receiverAddress: receiverAddress || '',
      notes: remark || ''
    });

    // 设置销售员ID
    if (salesPersonId) {
      const parsedSalesId = typeof salesPersonId === 'string' ? parseInt(salesPersonId) : salesPersonId;
      if (!isNaN(parsedSalesId) && parsedSalesId > 0) {
        order.salesUserId = parsedSalesId;
      }
    }

    const savedOrder = await orderRepository.save(order);
    console.log('✅ [订单创建] 订单保存成功:', savedOrder.id);

    // 创建订单项
    if (products && products.length > 0) {
      for (const product of products) {
        const productId = typeof product.id === 'string' ? parseInt(product.id) : (product.id || 0);
        const orderItem = orderItemRepository.create({
          orderId: savedOrder.id,
          productId: isNaN(productId) ? 0 : productId,
          productName: product.name || '未知商品',
          productSku: product.sku || '',
          unitPrice: Number(product.price) || 0,
          quantity: Number(product.quantity) || 1,
          subtotal: (Number(product.price) || 0) * (Number(product.quantity) || 1)
        });
        await orderItemRepository.save(orderItem);
        console.log('✅ [订单创建] 订单项保存成功:', product.name);
      }
    }

    // 返回完整的订单数据
    const responseData = {
      id: savedOrder.id.toString(),
      orderNumber: savedOrder.orderNo,
      customerId: savedOrder.customerId.toString(),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      products: products,
      totalAmount: finalTotalAmount,
      depositAmount: Number(depositAmount) || 0,
      collectAmount: Number(collectAmount) || finalTotalAmount - (Number(depositAmount) || 0),
      receiverName: savedOrder.receiverName || '',
      receiverPhone: savedOrder.receiverPhone || '',
      receiverAddress: savedOrder.receiverAddress || '',
      remark: savedOrder.notes || '',
      status: 'pending_transfer',
      auditStatus: 'pending',
      createTime: savedOrder.createdAt?.toISOString() || new Date().toISOString(),
      createdBy: salesPersonId || '',
      salesPersonId: salesPersonId || ''
    };

    console.log('✅ [订单创建] 返回数据:', responseData);

    res.status(201).json({
      success: true,
      message: '订单创建成功',
      data: responseData
    });
  } catch (error: any) {
    console.error('❌ [订单创建] 失败:', {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      sqlMessage: error?.sqlMessage
    });
    res.status(500).json({
      success: false,
      message: error?.sqlMessage || error?.message || '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? error?.stack : undefined
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
      where: { id: parseInt(req.params.id) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    const updateData = req.body;

    // 更新订单字段
    if (updateData.status) order.status = updateData.status;
    if (updateData.receiverName) order.receiverName = updateData.receiverName;
    if (updateData.receiverPhone) order.receiverPhone = updateData.receiverPhone;
    if (updateData.receiverAddress) order.receiverAddress = updateData.receiverAddress;
    if (updateData.notes !== undefined) order.notes = updateData.notes;
    if (updateData.paymentStatus) order.paymentStatus = updateData.paymentStatus;
    if (updateData.paymentMethod) order.paymentMethod = updateData.paymentMethod;

    await orderRepository.save(order);

    res.json({
      success: true,
      message: '订单更新成功',
      data: order
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({
      success: false,
      message: '更新订单失败'
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
      where: { id: parseInt(req.params.id) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    await orderRepository.remove(order);

    res.json({
      success: true,
      message: '订单删除成功'
    });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({
      success: false,
      message: '删除订单失败'
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

    // 支持数字 id 或订单号查找
    let order;
    const numericId = parseInt(idParam);
    if (!isNaN(numericId)) {
      order = await orderRepository.findOne({
        where: { id: numericId }
      });
    }

    // 如果数字 id 没找到，尝试用订单号查找
    if (!order) {
      order = await orderRepository.findOne({
        where: { orderNo: idParam }
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新订单状态为待审核
    order.status = 'confirmed'; // 使用 confirmed 表示已提审
    if (remark) {
      order.notes = `${order.notes || ''} | 提审备注: ${remark}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      message: '订单已提交审核',
      data: {
        id: order.id.toString(),
        orderNumber: order.orderNo,
        status: order.status
      }
    });
  } catch (error) {
    console.error('提交订单审核失败:', error);
    res.status(500).json({
      success: false,
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

    // 支持数字 id 或订单号查找
    let order;
    const numericId = parseInt(idParam);
    if (!isNaN(numericId)) {
      order = await orderRepository.findOne({
        where: { id: numericId }
      });
    }

    // 如果数字 id 没找到，尝试用订单号查找
    if (!order) {
      order = await orderRepository.findOne({
        where: { orderNo: idParam }
      });
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (action === 'approve') {
      order.status = 'paid'; // 审核通过，进入已支付状态
      order.notes = `${order.notes || ''} | 审核通过: ${remark || ''}`;
    } else {
      order.status = 'pending'; // 审核拒绝，退回待处理
      order.notes = `${order.notes || ''} | 审核拒绝: ${remark || ''}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      message: action === 'approve' ? '订单审核通过' : '订单审核拒绝',
      data: {
        id: order.id.toString(),
        orderNumber: order.orderNo,
        status: order.status
      }
    });
  } catch (error) {
    console.error('审核订单失败:', error);
    res.status(500).json({
      success: false,
      message: '审核订单失败',
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

    const order = await orderRepository.findOne({
      where: { id: parseInt(orderId) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新订单状态为待取消
    order.status = 'pending' as any; // 临时使用pending表示待取消
    order.notes = `取消原因: ${reason}${description ? ` - ${description}` : ''}`;

    await orderRepository.save(order);

    res.json({
      success: true,
      message: '取消申请已提交'
    });
  } catch (error) {
    console.error('提交取消申请失败:', error);
    res.status(500).json({
      success: false,
      message: '提交取消申请失败'
    });
  }
});

/**
 * @route GET /api/v1/orders/pending-cancel
 * @desc 获取待审核的取消订单列表
 * @access Private
 */
router.get('/pending-cancel', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    // 查询状态为pending且notes包含"取消原因"的订单
    const orders = await orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.status = :status', { status: 'pending' })
      .andWhere('order.notes LIKE :cancelNote', { cancelNote: '%取消原因%' })
      .orderBy('order.updatedAt', 'DESC')
      .getMany();

    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.orderNo,
      customerName: order.customer?.name || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.notes || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'pending_cancel',
      createdBy: order.salesUserId?.toString() || ''
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('获取待审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取待审核取消订单失败'
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

    const order = await orderRepository.findOne({
      where: { id: parseInt(req.params.id) }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (action === 'approve') {
      order.status = 'cancelled';
      order.notes = `${order.notes || ''} | 审核通过: ${remark || ''}`;
    } else {
      order.status = 'confirmed'; // 恢复到确认状态
      order.notes = `${order.notes || ''} | 审核拒绝: ${remark || ''}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      message: action === 'approve' ? '取消申请已通过' : '取消申请已拒绝'
    });
  } catch (error) {
    console.error('审核取消申请失败:', error);
    res.status(500).json({
      success: false,
      message: '审核取消申请失败'
    });
  }
});

/**
 * @route GET /api/v1/orders/audited-cancel
 * @desc 获取已审核的取消订单列表
 * @access Private
 */
router.get('/audited-cancel', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const orders = await orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.status = :status', { status: 'cancelled' })
      .orderBy('order.updatedAt', 'DESC')
      .getMany();

    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.orderNo,
      customerName: order.customer?.name || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.notes || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'cancelled',
      createdBy: order.salesUserId?.toString() || ''
    }));

    res.json({
      success: true,
      data: formattedOrders
    });
  } catch (error) {
    console.error('获取已审核取消订单失败:', error);
    res.status(500).json({
      success: false,
      message: '获取已审核取消订单失败'
    });
  }
});

/**
 * @route GET /api/v1/orders/statistics
 * @desc 获取订单统计数据
 * @access Private
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const orderRepository = AppDataSource.getRepository(Order);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 待处理订单数
    const pendingCount = await orderRepository.count({
      where: { status: 'pending' }
    });

    // 今日订单数
    const todayCount = await orderRepository.createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .getCount();

    // 待处理订单金额
    const pendingAmountResult = await orderRepository.createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status = :status', { status: 'pending' })
      .getRawOne();

    res.json({
      success: true,
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
      message: '获取订单统计失败'
    });
  }
});

export default router;
