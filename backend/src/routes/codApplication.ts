/**
 * 代收取消申请路由
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { CodCancelApplication } from '../entities/CodCancelApplication';
import { Order } from '../entities/Order';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'backend/uploads/cod-proof';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
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
    const { orderId, modifiedCodAmount, cancelReason, paymentProof } = req.body;
    const user = (req as any).user;

    if (!orderId || modifiedCodAmount === undefined || !cancelReason) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }

    const orderRepo = AppDataSource.getRepository(Order);
    const appRepo = AppDataSource.getRepository(CodCancelApplication);

    // 查询订单
    const order = await orderRepo.findOne({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }

    // 验证权限：只能申请自己创建的订单
    if (order.createdBy !== user.id) {
      return res.status(403).json({ success: false, message: '只能申请自己创建的订单' });
    }

    // 验证订单状态：必须已发货
    const shippedStatuses = ['shipped', 'delivered', 'completed'];
    if (!shippedStatuses.includes(order.status)) {
      return res.status(400).json({ success: false, message: '订单未发货，无法申请取消代收' });
    }

    // 检查是否有待审核的申请
    const existingApp = await appRepo.findOne({
      where: { orderId, status: 'pending' }
    });
    if (existingApp) {
      return res.status(400).json({ success: false, message: '该订单已有待审核的申请，请勿重复提交' });
    }

    // 计算原代收金额
    const originalCodAmount = (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0);

    // 验证修改后金额
    const newAmount = Number(modifiedCodAmount);
    if (newAmount < 0 || newAmount > originalCodAmount) {
      return res.status(400).json({ success: false, message: '修改后金额不合法' });
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

    res.json({ success: true, message: '申请提交成功，等待审核', data: { id: application.id } });
  } catch (error: any) {
    console.error('[CodApplication] Create error:', error);
    res.status(500).json({ success: false, message: '提交申请失败' });
  }
});

/**
 * 获取我的申请列表
 */
router.get('/my-list', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 10, status, startDate, endDate, keywords } = req.query;
    const user = (req as any).user;

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
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
      queryBuilder.andWhere('(app.order_number LIKE :kw OR app.cancel_reason LIKE :kw)', {
        kw: `%${keywords}%`
      });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序
    queryBuilder.orderBy('app.created_at', 'DESC');

    const list = await queryBuilder.getMany();

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
      queryBuilder.andWhere('(app.order_number LIKE :kw OR app.applicant_name LIKE :kw)', {
        kw: `%${keywords}%`
      });
    }

    // 获取总数
    const total = await queryBuilder.getCount();

    // 分页
    const pageNum = parseInt(page as string);
    const size = parseInt(pageSize as string);
    queryBuilder.skip((pageNum - 1) * size).take(size);

    // 排序
    queryBuilder.orderBy('app.created_at', 'DESC');

    const list = await queryBuilder.getMany();

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

    const application = await appRepo.findOne({ where: { id } });
    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    res.json({ success: true, data: application });
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
    const user = (req as any).user;

    if (approved === undefined) {
      return res.status(400).json({ success: false, message: '请选择审核结果' });
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
        order.codAmount = application.modifiedCodAmount;

        if (application.modifiedCodAmount === 0) {
          order.codStatus = 'cancelled';
          order.codCancelledAt = new Date();
        } else {
          order.codStatus = 'pending';
          order.codCancelledAt = null;
        }

        await orderRepo.save(order);
      }
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
    const user = (req as any).user;

    const appRepo = AppDataSource.getRepository(CodCancelApplication);
    const application = await appRepo.findOne({ where: { id } });

    if (!application) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }

    if (application.applicantId !== user.id) {
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
    const user = (req as any).user;

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
