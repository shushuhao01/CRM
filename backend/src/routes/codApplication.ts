/**
 * 代收取消申请路由
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { CodCancelApplication } from '../entities/CodCancelApplication';
import { Order } from '../entities/Order';
import { User } from '../entities/User';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendSystemMessage, sendBatchSystemMessages } from '../services/messageService';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'cod-proof');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式：jpeg, jpg, png, gif, webp'));
    }
  }
});

/**
 * 上传尾款凭证
 */
router.post('/upload-proof', authenticateToken, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择文件' });
    }

    const fileUrl = `/uploads/cod-proof/${req.file.filename}`;
    res.json({ success: true, data: { url: fileUrl } });
  } catch (error: any) {
    console.error('[CodApplication] Upload proof error:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/**
 * 创建代收取消申请
 */
router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('[CodApplication] 收到创建申请请求');
    console.log('[CodApplication] 请求体:', JSON.stringify(req.body, null, 2));

    const { orderId, modifiedCodAmount, cancelReason, paymentProof } = req.body;
    const user = (req as any).currentUser; // 使用 currentUser 而不是 user

    console.log('[CodApplication] 用户信息:', {
      user: user ? {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.departmentName
      } : null
    });

    console.log('[CodApplication] 解析后的参数:', {
      orderId,
      modifiedCodAmount,
      cancelReason,
      paymentProof,
      userId: user?.id
    });

    if (!orderId || modifiedCodAmount === undefined || !cancelReason) {
      console.log('[CodApplication] 参数验证失败');
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const orderRepo = AppDataSource.getRepository(Order);
    const appRepo = AppDataSource.getRepository(CodCancelApplication);

    // 查询订单
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 验证权限：成员只能申请自己创建的订单，管理员和超管不受限制
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    console.log('[CodApplication] 权限检查:', {
      userId: user.id,
      username: user.username,
      userRole: user.role,
      isAdmin,
      orderCreatedBy: order.createdBy,
      canApply: isAdmin || order.createdBy === user.id
    });

    if (!isAdmin && order.createdBy !== user.id) {
      return res.status(403).json({ success: false, message: '只能申请自己创建的订单' });
    }

    // 验证订单状态：必须已发货
    const shippedStatuses = ['shipped', 'delivered', 'completed'];
    if (!shippedStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: '订单未发货，无法申请取消代收' });
    }

    // 🔥 验证订单状态：已签收和已完成的订单不能改代收
    const signedStatuses = ['delivered', 'completed'];
    if (signedStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: '订单已签收，不支持改代收' });
    }

    // 检查是否有待审核的申请
    const existingApp = await appRepo.findOne({
      where: { orderId, status: 'pending' }
    });
    if (existingApp) {
      return res.status(400).json({ success: false, message: '该订单已有待审核的申请，请勿重复提交' });
    }

    // 检查订单代收状态：如果已改代收或已返款，不允许申请
    if (order.codStatus === 'cancelled') {
      return res.status(400).json({ success: false, message: '该订单已改代收，无法申请' });
    }
    if (order.codStatus === 'returned') {
      return res.status(400).json({ success: false, message: '该订单已返款，无法申请' });
    }

    // 计算原代收金额（用于显示参考）
    const originalCodAmount = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);

    // 🔥 获取当前代收金额（如果改过代收，使用修改后的金额作为上限）
    const currentCodAmount = order.codAmount !== undefined && order.codAmount !== null
      ? Number(order.codAmount)
      : originalCodAmount;

    // 🔥 验证修改后金额：上限是当前代收金额，而不是原始代收金额
    const newAmount = Number(modifiedCodAmount);
    if (newAmount < 0 || newAmount > currentCodAmount) {
      return res.status(400).json({
        success: false,
        message: `修改后金额不合法，最多只能改为¥${currentCodAmount.toFixed(2)}`
      });
    }

    // 创建申请
    const application = new CodCancelApplication();
    application.id = uuidv4();
    application.orderId = orderId;
    application.orderNumber = order.orderNumber;
    application.applicantId = user.id;
    application.applicantName = user.name || user.username;
    application.departmentId = user.departmentId || null;
    application.departmentName = user.departmentName || null;
    application.originalCodAmount = originalCodAmount;
    application.modifiedCodAmount = newAmount;
    application.cancelReason = cancelReason;
    application.paymentProof = paymentProof || null;
    application.status = 'pending';

    await appRepo.save(application);

    // 🔥 发送消息通知给审核人员（财务/管理员）
    try {
      const userRepo = AppDataSource.getRepository(User);
      // 查询所有管理员和超级管理员
      const reviewers = await userRepo.find({
        where: [
          { role: 'admin' },
          { role: 'super_admin' }
        ],
        select: ['id', 'name', 'username']
      });

      if (reviewers.length > 0) {
        const messages = reviewers.map(reviewer => ({
          type: 'cod_cancel_request',
          title: '📋 代收取消申请待审核',
          content: `${user.name || user.username} 提交了订单 ${order.orderNumber} 的代收取消申请，原代收金额¥${originalCodAmount.toFixed(2)}，修改后金额¥${newAmount.toFixed(2)}，请及时审核。`,
          targetUserId: reviewer.id,
          priority: 'high' as const,
          category: '代收审核',
          relatedId: application.id,
          relatedType: 'cod_cancel_application',
          actionUrl: `/finance/cod-application-review`,
          createdBy: user.id
        }));

        await sendBatchSystemMessages(messages);
        console.log(`[CodApplication] 已发送 ${messages.length} 条审核通知`);
      }
    } catch (msgError) {
      console.error('[CodApplication] 发送消息通知失败:', msgError);
      // 消息发送失败不影响申请创建
    }

    res.json({ success: true, message: '申请提交成功，等待审核', data: { id: application.id } });
  } catch (error: any) {
    console.error('[CodApplication] Create error:', error);
    console.error('[CodApplication] Error stack:', error.stack);
    console.error('[CodApplication] Error message:', error.message);
    res.status(500).json({ success: false, message: '提交申请失败' });
  }
});

/**
 * 更新申请（仅待审核和已驳回状态可编辑）
 */
router.put('/update/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { modifiedCodAmount, cancelReason, paymentProof } = req.body;
    const user = (req as any).currentUser;

    if (modifiedCodAmount === undefined || !cancelReason) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    // 验证权限：成员只能编辑自己的申请，管理员和超管不受限制
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin && application.applicantId !== user.id) {
      return res.status(403).json({ success: false, message: '只能编辑自己的申请' });
    }

    // 只有待审核和已驳回的申请可以编辑
    if (application.status !== 'pending' && application.status !== 'rejected') {
      return res.status(400).json({ success: false, message: '只能编辑待审核或已驳回的申请' });
    }

    // 🔥 获取订单信息，验证当前代收金额
    const orderRepo = AppDataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id: application.orderId } });

    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 🔥 获取当前代收金额（如果改过代收，使用修改后的金额作为上限）
    const currentCodAmount = order.codAmount !== undefined && order.codAmount !== null
      ? Number(order.codAmount)
      : application.originalCodAmount;

    // 🔥 验证修改后金额：上限是当前代收金额
    const newAmount = Number(modifiedCodAmount);
    if (newAmount < 0 || newAmount > currentCodAmount) {
      return res.status(400).json({
        success: false,
        message: `修改后金额不合法，最多只能改为¥${currentCodAmount.toFixed(2)}`
      });
    }

    // 更新申请
    application.modifiedCodAmount = newAmount;
    application.cancelReason = cancelReason;
    application.paymentProof = paymentProof || null;
    application.updatedAt = new Date();

    // 如果是已驳回的申请，重新提交后状态改为待审核
    if (application.status === 'rejected') {
      application.status = 'pending';
      application.reviewerId = null;
      application.reviewerName = null;
      application.reviewRemark = null;
      application.reviewedAt = null;
    }

    await appRepo.save(application);

    res.json({ success: true, message: '申请更新成功' });
  } catch (error: any) {
    console.error('[CodApplication] Update error:', error);
    res.status(500).json({ success: false, message: '更新申请失败' });
  }
});

/**
 * 获取我的申请列表
 */
router.get('/my-list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, startDate, endDate, keywords } = req.query;
    const user = (req as any).currentUser; // 使用 currentUser

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const orderRepo = AppDataSource.getRepository(Order);

    // 如果有关键词搜索，需要先从订单表查询
    let orderIds: string[] = [];
    if (keywords) {
      const orders = await orderRepo
        .createQueryBuilder('order')
        .select('order.id')
        .where('order.order_number LIKE :kw OR order.customer_name LIKE :kw OR order.customer_phone LIKE :kw OR order.customer_id LIKE :kw', {
          kw: `%${keywords}%`
        })
        .getMany();
      orderIds = orders.map(o => o.id);
    }

    const queryBuilder = appRepo.createQueryBuilder('app');

    // 只查询自己的申请
    queryBuilder.where('app.applicant_id = :userId', { userId: user.id });

    // 状态筛选
    if (status && status !== 'all') {
      queryBuilder.andWhere('app.status = :status', { status });
    }

    // 日期筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('app.created_at BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 关键词搜索
    if (keywords) {
      if (orderIds.length > 0) {
        queryBuilder.andWhere('(app.order_number LIKE :kw OR app.cancel_reason LIKE :kw OR app.order_id IN (:...orderIds))', {
          kw: `%${keywords}%`,
          orderIds
        });
      } else {
        queryBuilder.andWhere('(app.order_number LIKE :kw OR app.cancel_reason LIKE :kw)', {
          kw: `%${keywords}%`
        });
      }
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序
    queryBuilder.orderBy('app.created_at', 'DESC');

    const applications = await queryBuilder.getMany();

    // 关联订单信息，获取客户信息
    const list = await Promise.all(
      applications.map(async (app) => {
        const order = await orderRepo.findOne({
          where: { id: app.orderId },
          select: ['customerId', 'customerName']
        });
        return {
          ...app,
          customerId: order?.customerId || null,
          customerName: order?.customerName || null
        };
      })
    );

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    console.error('[CodApplication] Get my list error:', error);
    res.status(500).json({ success: false, message: '获取申请列表失败' });
  }
});

/**
 * 获取审核列表（管理员/财务）
 */
router.get('/review-list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, departmentId, applicantId, startDate, endDate, keywords } = req.query;

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const orderRepo = AppDataSource.getRepository(Order);

    // 如果有关键词搜索，需要先从订单表查询
    let orderIds: string[] = [];
    if (keywords) {
      const orders = await orderRepo
        .createQueryBuilder('order')
        .select('order.id')
        .where('order.order_number LIKE :kw OR order.customer_name LIKE :kw OR order.customer_phone LIKE :kw OR order.customer_id LIKE :kw OR order.tracking_number LIKE :kw', {
          kw: `%${keywords}%`
        })
        .getMany();
      orderIds = orders.map(o => o.id);
    }

    const queryBuilder = appRepo.createQueryBuilder('app');

    // 状态筛选
    if (status && status !== 'all') {
      queryBuilder.where('app.status = :status', { status });
    }

    // 部门筛选
    if (departmentId) {
      queryBuilder.andWhere('app.department_id = :departmentId', { departmentId });
    }

    // 申请人筛选
    if (applicantId) {
      queryBuilder.andWhere('app.applicant_id = :applicantId', { applicantId });
    }

    // 日期筛选
    if (startDate && endDate) {
      queryBuilder.andWhere('app.created_at BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string + ' 23:59:59')
      });
    }

    // 关键词搜索
    if (keywords) {
      if (orderIds.length > 0) {
        queryBuilder.andWhere('(app.order_number LIKE :kw OR app.applicant_name LIKE :kw OR app.order_id IN (:...orderIds))', {
          kw: `%${keywords}%`,
          orderIds
        });
      } else {
        queryBuilder.andWhere('(app.order_number LIKE :kw OR app.applicant_name LIKE :kw)', {
          kw: `%${keywords}%`
        });
      }
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序
    queryBuilder.orderBy('app.created_at', 'DESC');

    const applications = await queryBuilder.getMany();

    // 关联订单信息，获取物流单号和客户信息
    const list = await Promise.all(
      applications.map(async (app) => {
        const order = await orderRepo.findOne({
          where: { id: app.orderId },
          select: ['trackingNumber', 'expressCompany', 'customerPhone', 'customerId', 'customerName']
        });
        return {
          ...app,
          trackingNumber: order?.trackingNumber || null,
          expressCompany: order?.expressCompany || null,
          customerPhone: order?.customerPhone || null,
          customerId: order?.customerId || null,
          customerName: order?.customerName || null
        };
      })
    );

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: size }
    });
  } catch (error: any) {
    console.error('[CodApplication] Get review list error:', error);
    res.status(500).json({ success: false, message: '获取审核列表失败' });
  }
});

/**
 * 获取申请详情
 */
router.get('/detail/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const orderRepo = AppDataSource.getRepository(Order);

    const application = await appRepo.findOne({ where: { id } });
    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    // 关联订单信息，获取物流单号
    const order = await orderRepo.findOne({
      where: { id: application.orderId },
      select: ['trackingNumber', 'expressCompany', 'customerPhone']
    });

    const result = {
      ...application,
      trackingNumber: order?.trackingNumber || null,
      expressCompany: order?.expressCompany || null,
      customerPhone: order?.customerPhone || null
    };

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[CodApplication] Get detail error:', error);
    res.status(500).json({ success: false, message: '获取申请详情失败' });
  }
});

/**
 * 审核申请
 */
router.put('/review/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { approved, reviewRemark } = req.body;
    const user = (req as any).currentUser; // 使用 currentUser

    if (approved === undefined) {
      return res.status(400).json({ success: false, message: '请选择审核结果' });
    }

    // 驳回时必须填写备注
    if (!approved && !reviewRemark) {
      return res.status(400).json({ success: false, message: '驳回时必须填写原因' });
    }

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const orderRepo = AppDataSource.getRepository(Order);

    const application = await appRepo.findOne({ where: { id } });
    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该申请已审核，无法重复审核' });
    }

    // 更新申请状态
    application.status = approved ? 'approved' : 'rejected';
    application.reviewerId = user.id;
    application.reviewerName = user.name || user.username;
    application.reviewRemark = reviewRemark || null;
    application.reviewedAt = new Date();

    await appRepo.save(application);

    // 如果审核通过，更新订单代收信息
    if (approved) {
      const order = await orderRepo.findOne({ where: { id: application.orderId } });
      if (order) {
        console.log('[CodApplication] 审核通过，更新订单代收信息 - 开始:', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldCodStatus: order.codStatus,
          oldCodAmount: order.codAmount,
          newCodAmount: application.modifiedCodAmount
        });

        // 更新代收金额为修改后的金额
        order.codAmount = application.modifiedCodAmount;

        // 🔥 修复：与代收管理逻辑保持完全一致
        if (application.modifiedCodAmount === 0) {
          // 改为0元，标记为已改代收状态（不能再修改）
          order.codStatus = 'cancelled';
          order.codCancelledAt = new Date();
          console.log('[CodApplication] 改为0元，设置状态为cancelled');
        } else {
          // 改为大于0的金额，保持待处理状态（可以继续修改或返款）
          order.codStatus = 'pending';
          order.codCancelledAt = null;
          console.log('[CodApplication] 改为>0元，设置状态为pending');
        }

        await orderRepo.save(order);

        console.log('[CodApplication] 订单代收信息已更新 - 完成:', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          newCodStatus: order.codStatus,
          newCodAmount: order.codAmount,
          codCancelledAt: order.codCancelledAt
        });

        // 🔥 验证数据库中的实际值
        const verifyOrder = await orderRepo.findOne({ where: { id: application.orderId } });
        console.log('[CodApplication] 数据库验证 - 实际保存的值:', {
          orderId: verifyOrder?.id,
          orderNumber: verifyOrder?.orderNumber,
          codStatus: verifyOrder?.codStatus,
          codAmount: verifyOrder?.codAmount,
          codCancelledAt: verifyOrder?.codCancelledAt
        });
      }
    }

    // 🔥 发送消息通知给申请人
    try {
      const messageType = approved ? 'cod_cancel_approved' : 'cod_cancel_rejected';
      const title = approved ? '✅ 代收取消申请已通过' : '❌ 代收取消申请已拒绝';
      const content = approved
        ? `您的订单 ${application.orderNumber} 代收取消申请已通过审核${reviewRemark ? `，审核意见：${reviewRemark}` : ''}。代收金额已更新为¥${application.modifiedCodAmount.toFixed(2)}。`
        : `您的订单 ${application.orderNumber} 代收取消申请已被拒绝${reviewRemark ? `，拒绝原因：${reviewRemark}` : ''}。`;

      await sendSystemMessage({
        type: messageType,
        title,
        content,
        targetUserId: application.applicantId,
        priority: approved ? 'normal' : 'high',
        category: '代收审核',
        relatedId: application.id,
        relatedType: 'cod_cancel_application',
        actionUrl: `/finance/my-cod-application`,
        createdBy: user.id
      });

      console.log(`[CodApplication] 已发送审核结果通知给申请人 ${application.applicantName}`);
    } catch (msgError) {
      console.error('[CodApplication] 发送消息通知失败:', msgError);
      // 消息发送失败不影响审核结果
    }

    res.json({ success: true, message: approved ? '审核通过' : '已驳回' });
  } catch (error: any) {
    console.error('[CodApplication] Review error:', error);
    res.status(500).json({ success: false, message: '审核失败' });
  }
});

/**
 * 撤销申请
 */
router.delete('/cancel/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).currentUser; // 使用 currentUser

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    // 验证权限：成员只能撤销自己的申请，管理员和超管不受限制
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin && application.applicantId !== user.id) {
      return res.status(403).json({ success: false, message: '只能撤销自己的申请' });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: '只能撤销待审核的申请' });
    }

    application.status = 'cancelled';
    await appRepo.save(application);

    res.json({ success: true, message: '申请已撤销' });
  } catch (error: any) {
    console.error('[CodApplication] Cancel error:', error);
    res.status(500).json({ success: false, message: '撤销申请失败' });
  }
});

/**
 * 获取统计数据
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type } = req.query; // my-我的, review-审核
    const user = (req as any).currentUser; // 使用 currentUser

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const queryBuilder = appRepo.createQueryBuilder('app');

    if (type === 'my') {
      queryBuilder.where('app.applicant_id = :userId', { userId: user.id });
    }

    const [pending, approved, rejected, total] = await Promise.all([
      queryBuilder.clone().andWhere('app.status = :status', { status: 'pending' }).getCount(),
      queryBuilder.clone().andWhere('app.status = :status', { status: 'approved' }).getCount(),
      queryBuilder.clone().andWhere('app.status = :status', { status: 'rejected' }).getCount(),
      queryBuilder.getCount()
    ]);

    res.json({
      success: true,
      data: { pending, approved, rejected, total }
    });
  } catch (error: any) {
    console.error('[CodApplication] Get stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

export default router;
