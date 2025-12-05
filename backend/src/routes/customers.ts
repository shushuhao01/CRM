import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { Like, Between } from 'typeorm';

const router = Router();

// 所有客户路由都需要认证
router.use(authenticateToken);

/**
 * @route GET /api/v1/customers
 * @desc 获取客户列表
 * @access Private
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);

    const {
      page = 1,
      pageSize = 10,
      name,
      phone,
      level,
      status,
      startDate,
      endDate
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 10;
    const skip = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (name) {
      where.name = Like(`%${name}%`);
    }

    if (phone) {
      where.phone = Like(`%${phone}%`);
    }

    if (level) {
      where.level = level;
    }

    if (status) {
      where.status = status;
    }

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate as string), new Date(endDate as string));
    }

    const [customers, total] = await customerRepository.findAndCount({
      where,
      skip,
      take: pageSizeNum,
      order: { createdAt: 'DESC' }
    });

    // 转换数据格式以匹配前端期望
    const list = customers.map(customer => ({
      id: customer.id,
      code: customer.customerNo || '',
      name: customer.name,
      phone: customer.phone || '',
      age: customer.age || 0,
      gender: customer.gender || 'unknown',
      height: customer.height || null,
      weight: customer.weight || null,
      address: customer.address || '',
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      street: customer.street || '',
      detailAddress: customer.detailAddress || '',
      overseasAddress: customer.overseasAddress || '',
      level: customer.level || 'normal',
      status: customer.status || 'active',
      salesPersonId: customer.salesPersonId || '',
      orderCount: customer.orderCount || 0,
      returnCount: customer.returnCount || 0,
      totalAmount: customer.totalAmount || 0,
      createTime: customer.createdAt?.toISOString() || '',
      createdBy: customer.createdBy || '',
      wechat: customer.wechat || '',
      wechatId: customer.wechat || '',
      email: customer.email || '',
      company: customer.company || '',
      source: customer.source || '',
      tags: customer.tags || [],
      remarks: customer.remark || '',
      remark: customer.remark || '',
      medicalHistory: customer.medicalHistory || '',
      improvementGoals: customer.improvementGoals || [],
      otherGoals: customer.otherGoals || '',
      fanAcquisitionTime: customer.fanAcquisitionTime?.toISOString() || ''
    }));

    res.json({
      success: true,
      code: 200,
      message: '获取客户列表成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    console.error('获取客户列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取客户列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/customers/:id
 * @desc 获取客户详情
 * @access Private
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({
      where: { id: req.params.id }
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '客户不存在'
      });
    }

    // 转换数据格式
    const data = {
      id: customer.id,
      code: customer.customerNo || '',
      name: customer.name,
      phone: customer.phone || '',
      age: customer.age || 0,
      gender: customer.gender || 'unknown',
      height: customer.height || null,
      weight: customer.weight || null,
      address: customer.address || '',
      province: customer.province || '',
      city: customer.city || '',
      district: customer.district || '',
      street: customer.street || '',
      detailAddress: customer.detailAddress || '',
      overseasAddress: customer.overseasAddress || '',
      level: customer.level || 'normal',
      status: customer.status || 'active',
      salesPersonId: customer.salesPersonId || '',
      orderCount: customer.orderCount || 0,
      returnCount: customer.returnCount || 0,
      totalAmount: customer.totalAmount || 0,
      createTime: customer.createdAt?.toISOString() || '',
      createdBy: customer.createdBy || '',
      wechat: customer.wechat || '',
      wechatId: customer.wechat || '',
      email: customer.email || '',
      company: customer.company || '',
      source: customer.source || '',
      tags: customer.tags || [],
      remarks: customer.remark || '',
      remark: customer.remark || '',
      medicalHistory: customer.medicalHistory || '',
      improvementGoals: customer.improvementGoals || [],
      otherGoals: customer.otherGoals || '',
      fanAcquisitionTime: customer.fanAcquisitionTime?.toISOString() || ''
    };

    res.json({
      success: true,
      code: 200,
      message: '获取客户详情成功',
      data
    });
  } catch (error) {
    console.error('获取客户详情失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取客户详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/customers
 * @desc 创建客户
 * @access Private
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const {
      name, phone, email, address, level, source, tags, remarks, remark, company,
      age, gender, height, weight, wechat, wechatId,
      province, city, district, street, detailAddress, overseasAddress,
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime,
      status, salesPersonId, createdBy
    } = req.body;

    console.log('[创建客户] 收到请求数据:', req.body);

    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '客户姓名不能为空'
      });
    }

    // 检查手机号是否已存在
    if (phone) {
      const existingCustomer = await customerRepository.findOne({ where: { phone } });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          code: 400,
          message: '该手机号已存在客户记录'
        });
      }
    }

    // 获取当前用户信息
    const currentUser = (req as any).user;
    const finalCreatedBy = createdBy || salesPersonId || currentUser?.id || 'admin';

    // 创建客户
    const customer = customerRepository.create({
      name,
      phone,
      email,
      address,
      province,
      city,
      district,
      street,
      detailAddress,
      overseasAddress,
      level: level || 'normal',
      source: source || 'other',
      tags: tags || [],
      remark: remarks || remark || null,
      company,
      status: status || 'active',
      salesPersonId: salesPersonId || currentUser?.id || null,
      createdBy: finalCreatedBy,
      // 新增字段
      age: age || null,
      gender: gender || 'unknown',
      height: height || null,
      weight: weight || null,
      wechat: wechat || wechatId || null,
      medicalHistory: medicalHistory || null,
      improvementGoals: improvementGoals || [],
      otherGoals: otherGoals || null,
      fanAcquisitionTime: fanAcquisitionTime ? new Date(fanAcquisitionTime) : null,
      orderCount: 0,
      returnCount: 0,
      totalAmount: 0
    });

    console.log('[创建客户] 准备保存的客户对象:', customer);

    const savedCustomer = await customerRepository.save(customer);

    // 生成客户编号
    savedCustomer.customerNo = `C${savedCustomer.id.substring(0, 8).toUpperCase()}`;
    await customerRepository.save(savedCustomer);

    console.log('[创建客户] 保存成功，客户ID:', savedCustomer.id);

    // 转换数据格式返回
    const data = {
      id: savedCustomer.id,
      code: savedCustomer.customerNo,
      name: savedCustomer.name,
      phone: savedCustomer.phone || '',
      age: savedCustomer.age || 0,
      gender: savedCustomer.gender || 'unknown',
      height: savedCustomer.height || null,
      weight: savedCustomer.weight || null,
      address: savedCustomer.address || '',
      province: savedCustomer.province || '',
      city: savedCustomer.city || '',
      district: savedCustomer.district || '',
      street: savedCustomer.street || '',
      detailAddress: savedCustomer.detailAddress || '',
      level: level || 'normal',
      status: status || 'active',
      salesPersonId: savedCustomer.salesPersonId || '',
      orderCount: 0,
      createTime: savedCustomer.createdAt?.toISOString() || '',
      createdBy: savedCustomer.createdBy || '',
      wechat: savedCustomer.wechat || '',
      email: savedCustomer.email || '',
      company: savedCustomer.company || '',
      source: savedCustomer.source || '',
      tags: savedCustomer.tags || [],
      remarks: savedCustomer.remark || '',
      medicalHistory: savedCustomer.medicalHistory || '',
      improvementGoals: savedCustomer.improvementGoals || [],
      otherGoals: savedCustomer.otherGoals || ''
    };

    res.status(201).json({
      success: true,
      code: 200,
      message: '创建客户成功',
      data
    });
  } catch (error) {
    console.error('创建客户失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '创建客户失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route PUT /api/v1/customers/:id
 * @desc 更新客户
 * @access Private
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customerId = req.params.id;

    const customer = await customerRepository.findOne({ where: { id: customerId } });

    if (!customer) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '客户不存在'
      });
    }

    const {
      name, phone, email, address, level, source, tags, remarks, remark, company, status,
      age, gender, height, weight, wechat, wechatId,
      province, city, district, street, detailAddress, overseasAddress,
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime
    } = req.body;

    // 更新字段
    if (name !== undefined) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (province !== undefined) customer.province = province;
    if (city !== undefined) customer.city = city;
    if (district !== undefined) customer.district = district;
    if (street !== undefined) customer.street = street;
    if (detailAddress !== undefined) customer.detailAddress = detailAddress;
    if (overseasAddress !== undefined) customer.overseasAddress = overseasAddress;
    if (level !== undefined) customer.level = level;
    if (source !== undefined) customer.source = source;
    if (tags !== undefined) customer.tags = tags;
    if (remarks !== undefined || remark !== undefined) customer.remark = remarks || remark;
    if (company !== undefined) customer.company = company;
    if (status !== undefined) customer.status = status;
    if (age !== undefined) customer.age = age;
    if (gender !== undefined) customer.gender = gender;
    if (height !== undefined) customer.height = height;
    if (weight !== undefined) customer.weight = weight;
    if (wechat !== undefined || wechatId !== undefined) customer.wechat = wechat || wechatId;
    if (medicalHistory !== undefined) customer.medicalHistory = medicalHistory;
    if (improvementGoals !== undefined) customer.improvementGoals = improvementGoals;
    if (otherGoals !== undefined) customer.otherGoals = otherGoals;
    if (fanAcquisitionTime !== undefined) customer.fanAcquisitionTime = fanAcquisitionTime ? new Date(fanAcquisitionTime) : undefined;

    const updatedCustomer = await customerRepository.save(customer);

    // 转换数据格式返回
    const data = {
      id: updatedCustomer.id,
      code: updatedCustomer.customerNo || '',
      name: updatedCustomer.name,
      phone: updatedCustomer.phone || '',
      age: updatedCustomer.age || 0,
      gender: updatedCustomer.gender || 'unknown',
      height: updatedCustomer.height || null,
      weight: updatedCustomer.weight || null,
      address: updatedCustomer.address || '',
      level: updatedCustomer.level || 'normal',
      status: updatedCustomer.status || 'active',
      salesPersonId: updatedCustomer.salesPersonId || '',
      orderCount: updatedCustomer.orderCount || 0,
      createTime: updatedCustomer.createdAt?.toISOString() || '',
      createdBy: updatedCustomer.createdBy || '',
      email: updatedCustomer.email || '',
      company: updatedCustomer.company || '',
      source: updatedCustomer.source || '',
      tags: updatedCustomer.tags || [],
      remarks: updatedCustomer.remark || ''
    };

    res.json({
      success: true,
      code: 200,
      message: '更新客户成功',
      data
    });
  } catch (error) {
    console.error('更新客户失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新客户失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/v1/customers/:id
 * @desc 删除客户
 * @access Private
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customerId = req.params.id;

    const customer = await customerRepository.findOne({ where: { id: customerId } });

    if (!customer) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '客户不存在'
      });
    }

    await customerRepository.remove(customer);

    res.json({
      success: true,
      code: 200,
      message: '删除客户成功'
    });
  } catch (error) {
    console.error('删除客户失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除客户失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/customers/check-exists
 * @desc 检查客户是否存在（通过手机号）
 * @access Private
 */
router.get('/check-exists', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '手机号不能为空',
        data: null
      });
    }

    console.log('[检查客户存在] 查询手机号:', phone);

    const existingCustomer = await customerRepository.findOne({
      where: { phone: phone as string }
    });

    if (existingCustomer) {
      console.log('[检查客户存在] 找到客户:', existingCustomer.name);
      return res.json({
        success: true,
        code: 200,
        message: '该手机号已存在客户记录',
        data: {
          id: existingCustomer.id,
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          creatorName: existingCustomer.createdBy || '',
          createTime: existingCustomer.createdAt?.toISOString() || ''
        }
      });
    }

    console.log('[检查客户存在] 客户不存在，可以创建');
    return res.json({
      success: true,
      code: 200,
      message: '该手机号不存在，可以创建',
      data: null
    });
  } catch (error) {
    console.error('检查客户存在失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '检查客户存在失败',
      error: error instanceof Error ? error.message : '未知错误',
      data: null
    });
  }
});

/**
 * @route GET /api/v1/customers/search
 * @desc 搜索客户
 * @access Private
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const { keyword, page = 1, pageSize = 10 } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 10;
    const skip = (pageNum - 1) * pageSizeNum;

    let queryBuilder = customerRepository.createQueryBuilder('customer');

    if (keyword) {
      queryBuilder = queryBuilder.where(
        'customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.email LIKE :keyword',
        { keyword: `%${keyword}%` }
      );
    }

    const [customers, total] = await queryBuilder
      .skip(skip)
      .take(pageSizeNum)
      .orderBy('customer.createdAt', 'DESC')
      .getManyAndCount();

    // 转换数据格式
    const list = customers.map(customer => ({
      id: customer.id,
      code: customer.customerNo || '',
      name: customer.name,
      phone: customer.phone || '',
      age: customer.age || 0,
      address: customer.address || '',
      level: customer.level || 'normal',
      status: customer.status || 'active',
      salesPersonId: customer.salesPersonId || '',
      orderCount: customer.orderCount || 0,
      createTime: customer.createdAt?.toISOString() || '',
      createdBy: customer.createdBy || '',
      email: customer.email || '',
      company: customer.company || '',
      source: customer.source || '',
      tags: customer.tags || [],
      remarks: customer.remark || ''
    }));

    res.json({
      success: true,
      code: 200,
      message: '搜索客户成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum
      }
    });
  } catch (error) {
    console.error('搜索客户失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '搜索客户失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

export default router;
