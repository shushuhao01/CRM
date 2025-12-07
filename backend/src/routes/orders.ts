import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('📋 [订单列表] 收到请求');
    const {
      page = 1,
      pageSize = 20,
      status,
      orderNumber,
      customerName,
      startDate,
      endDate
    } = req.query;

    // 使用原生SQL查询，避免TypeORM字段映射问题
    let sql = `SELECT o.*, c.name as customer_name_joined, c.phone as customer_phone_joined
               FROM orders o
               LEFT JOIN customers c ON o.customer_id = c.id
               WHERE 1=1`;
    const params: (string | number)[] = [];

    // 状态筛选
    if (status) {
      sql += ` AND o.status = ?`;
      params.push(String(status));
    }

    // 订单号筛选
    if (orderNumber) {
      sql += ` AND o.order_number LIKE ?`;
      params.push(`%${orderNumber}%`);
    }

    // 客户名称筛选
    if (customerName) {
      sql += ` AND (o.customer_name LIKE ? OR c.name LIKE ?)`;
      params.push(`%${customerName}%`, `%${customerName}%`);
    }

    // 日期范围筛选
    if (startDate) {
      sql += ` AND o.created_at >= ?`;
      params.push(String(startDate));
    }
    if (endDate) {
      sql += ` AND o.created_at <= ?`;
      params.push(String(endDate));
    }

    // 获取总数
    const countSql = sql.replace(/SELECT o\.\*, c\.name as customer_name_joined, c\.phone as customer_phone_joined/, 'SELECT COUNT(*) as total');
    const countResult = await AppDataSource.query(countSql, params);
    const total = countResult[0]?.total || 0;

    // 排序和分页
    sql += ` ORDER BY o.created_at DESC`;
    const skip = (Number(page) - 1) * Number(pageSize);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(pageSize), skip);

    const orders = await AppDataSource.query(sql, params);
    console.log(`📋 [订单列表] 查询到 ${orders.length} 条订单, 总数: ${total}`);

    // 转换为前端需要的格式（原生SQL返回的是下划线字段名）
    const formattedOrders = orders.map((order: Record<string, unknown>) => {
      // 解析products JSON字段
      let products: unknown[] = [];
      if (order.products) {
        try {
          products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
        } catch {
          products = [];
        }
      }

      return {
        id: String(order.id || ''),
        orderNumber: order.order_number || '',
        customerId: String(order.customer_id || ''),
        customerName: order.customer_name || order.customer_name_joined || '',
        customerPhone: order.customer_phone || order.customer_phone_joined || '',
        products: products,
        totalAmount: Number(order.total_amount) || 0,
        depositAmount: Number(order.deposit_amount) || 0,
        collectAmount: Number(order.final_amount) || 0,
        receiverName: order.shipping_name || '',
        receiverPhone: order.shipping_phone || '',
        receiverAddress: order.shipping_address || '',
        remark: order.remark || '',
        status: order.status || 'pending',
        paymentStatus: order.payment_status || 'unpaid',
        paymentMethod: order.payment_method || '',
        createTime: order.created_at ? new Date(order.created_at as string).toISOString() : '',
        createdBy: order.created_by || '',
        salesPersonId: order.created_by || ''
      };
    });

    console.log(`📋 [订单列表] 返回 ${formattedOrders.length} 条格式化订单`);
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
    console.error('❌ [订单列表] 获取失败:', error);
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
      where: { id: req.params.id },
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
      orderNumber: order.orderNumber,
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
      depositAmount: Number(order.depositAmount) || 0,
      collectAmount: Number(order.finalAmount) || 0,
      receiverName: order.shippingName || '',
      receiverPhone: order.shippingPhone || '',
      receiverAddress: order.shippingAddress || '',
      remark: order.remark || '',
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod || '',
      createTime: order.createdAt?.toISOString() || '',
      createdBy: order.createdBy || '',
      salesPersonId: order.createdBy || ''
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

    const _orderRepository = AppDataSource.getRepository(Order);
    const _orderItemRepository = AppDataSource.getRepository(OrderItem);

    const {
      customerId,
      customerName,
      customerPhone,
      products,
      totalAmount,
      // subtotal, // 暂未使用
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
      orderSource
      // customFields // 暂未使用
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
    let parsedCustomerId: string = '';
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
            // 创建新客户 - 使用UUID
            const { v4: uuidv4 } = await import('uuid');
            const newCustomerId = uuidv4();
            const customerCode = `C${Date.now()}`;
            await AppDataSource.query(
              `INSERT INTO customers (id, customer_code, name, phone, sales_person_id, created_by, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
              [newCustomerId, customerCode, customerName || '未知客户', customerPhone, salesPersonId || null, salesPersonId || 'system']
            );
            parsedCustomerId = newCustomerId;
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
        parsedCustomerId = customerId;
      }
    } else {
      parsedCustomerId = String(customerId);
    }

    if (!parsedCustomerId) {
      console.error('❌ [订单创建] 无效的客户ID:', customerId);
      return res.status(400).json({
        success: false,
        message: '无效的客户ID'
      });
    }

    // 生成订单号（使用前端传的或自动生成）
    const generatedOrderNumber = orderNumber || `ORD${Date.now()}`;

    // 计算金额
    const finalTotalAmount = Number(totalAmount) || 0;
    const finalDepositAmount = Number(depositAmount) || 0;
    const finalAmount = finalTotalAmount - (Number(discount) || 0);

    console.log('📝 [订单创建] 准备创建订单:', {
      orderNumber: generatedOrderNumber,
      customerId: parsedCustomerId,
      totalAmount: finalTotalAmount,
      depositAmount: finalDepositAmount
    });

    // 处理定金截图 - 支持单张和多张
    let finalDepositScreenshots: string[] = [];
    if (depositScreenshots && Array.isArray(depositScreenshots)) {
      finalDepositScreenshots = depositScreenshots;
    } else if (depositScreenshot) {
      finalDepositScreenshots = [depositScreenshot];
    }

    // 创建订单 - 使用原生SQL避免TypeORM字段映射问题
    const orderId = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const insertSql = `INSERT INTO orders (
      id, order_number, customer_id, customer_name, customer_phone,
      service_wechat, order_source, products, status, total_amount,
      discount_amount, final_amount, deposit_amount, deposit_screenshots,
      payment_status, payment_method, shipping_name, shipping_phone,
      shipping_address, express_company, mark_type, custom_fields,
      remark, created_by, created_by_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const insertParams = [
      orderId,
      generatedOrderNumber,
      parsedCustomerId,
      customerName || '',
      customerPhone || '',
      serviceWechat || '',
      orderSource || '',
      JSON.stringify(products || []),
      'pending',
      finalTotalAmount,
      Number(discount) || 0,
      finalAmount,
      finalDepositAmount,
      finalDepositScreenshots.length > 0 ? JSON.stringify(finalDepositScreenshots) : null,
      finalDepositAmount > 0 ? 'partial' : 'unpaid',
      paymentMethod || null,
      receiverName || customerName || '',
      receiverPhone || customerPhone || '',
      receiverAddress || '',
      req.body.expressCompany || '',
      req.body.markType || 'normal',
      req.body.customFields ? JSON.stringify(req.body.customFields) : null,
      remark || '',
      salesPersonId || '',
      salesPersonName || '',
      now,
      now
    ];

    await AppDataSource.query(insertSql, insertParams);
    console.log('✅ [订单创建] 订单保存成功:', orderId);

    const savedOrder = { id: orderId, orderNumber: generatedOrderNumber, customerId: parsedCustomerId };

    // 商品信息已经存储在 orders 表的 products JSON 字段中
    // 不再单独创建 order_items 记录，避免 TypeORM 字段映射问题
    console.log('✅ [订单创建] 商品信息已存储在订单的products字段中');

    // 返回完整的订单数据
    const responseData = {
      id: savedOrder.id.toString(),
      orderNumber: savedOrder.orderNumber,
      customerId: savedOrder.customerId.toString(),
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
      createTime: now,
      createdBy: salesPersonId || '',
      salesPersonId: salesPersonId || ''
    };

    console.log('✅ [订单创建] 返回数据:', responseData);

    res.status(201).json({
      success: true,
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
      message: err?.sqlMessage || err?.message || '创建订单失败',
      error: process.env.NODE_ENV === 'development' ? err?.stack : undefined
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
        message: '订单不存在'
      });
    }

    const updateData = req.body;

    // 更新订单字段
    if (updateData.status) order.status = updateData.status;
    if (updateData.receiverName || updateData.shippingName) order.shippingName = updateData.receiverName || updateData.shippingName;
    if (updateData.receiverPhone || updateData.shippingPhone) order.shippingPhone = updateData.receiverPhone || updateData.shippingPhone;
    if (updateData.receiverAddress || updateData.shippingAddress) order.shippingAddress = updateData.receiverAddress || updateData.shippingAddress;
    if (updateData.notes !== undefined || updateData.remark !== undefined) order.remark = updateData.notes || updateData.remark;
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
      where: { id: req.params.id }
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

    // 支持 id 或订单号查找
    let order = await orderRepository.findOne({
      where: { id: idParam }
    });

    // 如果 id 没找到，尝试用订单号查找
    if (!order) {
      order = await orderRepository.findOne({
        where: { orderNumber: idParam }
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
      order.remark = `${order.remark || ''} | 提审备注: ${remark}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      message: '订单已提交审核',
      data: {
        id: order.id.toString(),
        orderNumber: order.orderNumber,
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

    // 支持 id 或订单号查找
    let order = await orderRepository.findOne({
      where: { id: idParam }
    });

    // 如果 id 没找到，尝试用订单号查找
    if (!order) {
      order = await orderRepository.findOne({
        where: { orderNumber: idParam }
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
      order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;
    } else {
      order.status = 'pending'; // 审核拒绝，退回待处理
      order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;
    }

    await orderRepository.save(order);

    res.json({
      success: true,
      message: action === 'approve' ? '订单审核通过' : '订单审核拒绝',
      data: {
        id: order.id.toString(),
        orderNumber: order.orderNumber,
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
      where: { id: orderId }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    // 更新订单状态为待取消
    order.status = 'pending'; // 临时使用pending表示待取消
    order.remark = `取消原因: ${reason}${description ? ` - ${description}` : ''}`;

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

    // 查询状态为pending且remark包含"取消原因"的订单
    const orders = await orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.status = :status', { status: 'pending' })
      .andWhere('order.remark LIKE :cancelNote', { cancelNote: '%取消原因%' })
      .orderBy('order.updatedAt', 'DESC')
      .getMany();

    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.remark || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'pending_cancel',
      createdBy: order.createdBy || ''
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
      where: { id: req.params.id }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: '订单不存在'
      });
    }

    if (action === 'approve') {
      order.status = 'cancelled';
      order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;
    } else {
      order.status = 'confirmed'; // 恢复到确认状态
      order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;
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
      orderNumber: order.orderNumber,
      customerName: order.customer?.name || '',
      totalAmount: Number(order.totalAmount),
      cancelReason: order.remark || '',
      cancelRequestTime: order.updatedAt?.toISOString() || '',
      status: 'cancelled',
      createdBy: order.createdBy || ''
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
