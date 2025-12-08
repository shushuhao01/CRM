import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { CustomerGroup } from '../entities/CustomerGroup';
import { CustomerTag } from '../entities/CustomerTag';
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

// ========== 客户分组路由（必须在 /:id 之前定义）==========

/**
 * @route GET /api/v1/customers/groups
 * @desc 获取客户分组列表
 * @access Private
 */
router.get('/groups', async (req: Request, res: Response) => {
  try {
    const groupRepository = AppDataSource.getRepository(CustomerGroup);
    const { page = 1, pageSize = 20, name, status: _status } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = {};
    if (name) {
      where.name = Like(`%${name}%`);
    }

    const [groups, total] = await groupRepository.findAndCount({
      where,
      skip,
      take: pageSizeNum,
      order: { createdAt: 'DESC' }
    });

    const list = groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description || '',
      status: 'active',
      customerCount: group.customerCount || 0,
      createTime: group.createdAt?.toISOString() || '',
      conditions: []
    }));

    res.json({
      success: true,
      code: 200,
      message: '获取分组列表成功',
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error) {
    console.error('获取分组列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取分组列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/customers/groups
 * @desc 创建客户分组
 * @access Private
 */
router.post('/groups', async (req: Request, res: Response) => {
  try {
    const groupRepository = AppDataSource.getRepository(CustomerGroup);
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '分组名称不能为空'
      });
    }

    const group = groupRepository.create({
      name,
      description: description || '',
      customerCount: 0
    });

    const savedGroup = await groupRepository.save(group);

    res.status(201).json({
      success: true,
      code: 200,
      message: '创建分组成功',
      data: {
        id: savedGroup.id,
        name: savedGroup.name,
        description: savedGroup.description || '',
        status: 'active',
        customerCount: 0,
        createTime: savedGroup.createdAt?.toISOString() || '',
        conditions: []
      }
    });
  } catch (error) {
    console.error('创建分组失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '创建分组失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/customers/groups/:id
 * @desc 获取客户分组详情
 * @access Private
 */
router.get('/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupRepository = AppDataSource.getRepository(CustomerGroup);
    const group = await groupRepository.findOne({
      where: { id: req.params.id }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '分组不存在'
      });
    }

    res.json({
      success: true,
      code: 200,
      message: '获取分组详情成功',
      data: {
        id: group.id,
        name: group.name,
        description: group.description || '',
        status: 'active',
        customerCount: group.customerCount || 0,
        createTime: group.createdAt?.toISOString() || '',
        conditions: []
      }
    });
  } catch (error) {
    console.error('获取分组详情失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取分组详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route PUT /api/v1/customers/groups/:id
 * @desc 更新客户分组
 * @access Private
 */
router.put('/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupRepository = AppDataSource.getRepository(CustomerGroup);
    const group = await groupRepository.findOne({
      where: { id: req.params.id }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '分组不存在'
      });
    }

    const { name, description } = req.body;
    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;

    const updatedGroup = await groupRepository.save(group);

    res.json({
      success: true,
      code: 200,
      message: '更新分组成功',
      data: {
        id: updatedGroup.id,
        name: updatedGroup.name,
        description: updatedGroup.description || '',
        status: 'active',
        customerCount: updatedGroup.customerCount || 0,
        createTime: updatedGroup.createdAt?.toISOString() || '',
        conditions: []
      }
    });
  } catch (error) {
    console.error('更新分组失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新分组失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/v1/customers/groups/:id
 * @desc 删除客户分组
 * @access Private
 */
router.delete('/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupRepository = AppDataSource.getRepository(CustomerGroup);
    const group = await groupRepository.findOne({
      where: { id: req.params.id }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '分组不存在'
      });
    }

    await groupRepository.remove(group);

    res.json({
      success: true,
      code: 200,
      message: '删除分组成功'
    });
  } catch (error) {
    console.error('删除分组失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除分组失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

// ========== 客户标签路由（必须在 /:id 之前定义）==========

/**
 * @route GET /api/v1/customers/tags
 * @desc 获取客户标签列表
 * @access Private
 */
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tagRepository = AppDataSource.getRepository(CustomerTag);
    const { page = 1, pageSize = 20, name, status: _status } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 20;
    const skip = (pageNum - 1) * pageSizeNum;

    const where: Record<string, unknown> = {};
    if (name) {
      where.name = Like(`%${name}%`);
    }

    const [tags, total] = await tagRepository.findAndCount({
      where,
      skip,
      take: pageSizeNum,
      order: { createdAt: 'DESC' }
    });

    const list = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color || '#007bff',
      description: tag.description || '',
      status: 'active' as const,
      customerCount: tag.customerCount || 0,
      createTime: tag.createdAt?.toISOString() || ''
    }));

    res.json({
      success: true,
      code: 200,
      message: '获取标签列表成功',
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error) {
    console.error('获取标签列表失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取标签列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route POST /api/v1/customers/tags
 * @desc 创建客户标签
 * @access Private
 */
router.post('/tags', async (req: Request, res: Response) => {
  try {
    const tagRepository = AppDataSource.getRepository(CustomerTag);
    const { name, color, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '标签名称不能为空'
      });
    }

    const tag = tagRepository.create({
      name,
      color: color || '#007bff',
      description: description || '',
      customerCount: 0
    });

    const savedTag = await tagRepository.save(tag);

    res.status(201).json({
      success: true,
      code: 200,
      message: '创建标签成功',
      data: {
        id: savedTag.id,
        name: savedTag.name,
        color: savedTag.color || '#007bff',
        description: savedTag.description || '',
        status: 'active',
        customerCount: 0,
        createTime: savedTag.createdAt?.toISOString() || ''
      }
    });
  } catch (error) {
    console.error('创建标签失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '创建标签失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/customers/tags/:id
 * @desc 获取客户标签详情
 * @access Private
 */
router.get('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagRepository = AppDataSource.getRepository(CustomerTag);
    const tag = await tagRepository.findOne({
      where: { id: req.params.id }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '标签不存在'
      });
    }

    res.json({
      success: true,
      code: 200,
      message: '获取标签详情成功',
      data: {
        id: tag.id,
        name: tag.name,
        color: tag.color || '#007bff',
        description: tag.description || '',
        status: 'active',
        customerCount: tag.customerCount || 0,
        createTime: tag.createdAt?.toISOString() || ''
      }
    });
  } catch (error) {
    console.error('获取标签详情失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取标签详情失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route PUT /api/v1/customers/tags/:id
 * @desc 更新客户标签
 * @access Private
 */
router.put('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagRepository = AppDataSource.getRepository(CustomerTag);
    const tag = await tagRepository.findOne({
      where: { id: req.params.id }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '标签不存在'
      });
    }

    const { name, color, description } = req.body;
    if (name !== undefined) tag.name = name;
    if (color !== undefined) tag.color = color;
    if (description !== undefined) tag.description = description;

    const updatedTag = await tagRepository.save(tag);

    res.json({
      success: true,
      code: 200,
      message: '更新标签成功',
      data: {
        id: updatedTag.id,
        name: updatedTag.name,
        color: updatedTag.color || '#007bff',
        description: updatedTag.description || '',
        status: 'active',
        customerCount: updatedTag.customerCount || 0,
        createTime: updatedTag.createdAt?.toISOString() || ''
      }
    });
  } catch (error) {
    console.error('更新标签失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '更新标签失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route DELETE /api/v1/customers/tags/:id
 * @desc 删除客户标签
 * @access Private
 */
router.delete('/tags/:id', async (req: Request, res: Response) => {
  try {
    const tagRepository = AppDataSource.getRepository(CustomerTag);
    const tag = await tagRepository.findOne({
      where: { id: req.params.id }
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        code: 404,
        message: '标签不存在'
      });
    }

    await tagRepository.remove(tag);

    res.json({
      success: true,
      code: 200,
      message: '删除标签成功'
    });
  } catch (error) {
    console.error('删除标签失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '删除标签失败',
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
});

/**
 * @route GET /api/v1/customers/check-exists
 * @desc 检查客户是否存在（通过手机号）
 * @access Private
 * @note 此路由必须在 /:id 路由之前定义，否则会被 /:id 匹配
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
 * @desc 搜索客户（支持姓名、手机号、客户编码）
 * @access Private
 * @note 此路由必须在 /:id 路由之前定义
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '搜索关键词不能为空'
      });
    }

    console.log('[客户搜索] 搜索关键词:', keyword);

    // 搜索条件：姓名、手机号、客户编码
    const customers = await customerRepository
      .createQueryBuilder('customer')
      .where(
        'customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.customerNo LIKE :keyword',
        { keyword: `%${keyword}%` }
      )
      .orderBy('customer.createdAt', 'DESC')
      .getMany();

    // 转换数据格式
    const list = customers.map(customer => ({
      id: customer.id,
      code: customer.customerNo || '',
      name: customer.name,
      phone: customer.phone || '',
      gender: customer.gender || 'unknown',
      age: customer.age || 0,
      level: customer.level || 'normal',
      address: customer.address || '',
      createTime: customer.createdAt?.toISOString() || '',
      orderCount: customer.orderCount || 0,
      salesPersonId: customer.salesPersonId || ''
    }));

    console.log('[客户搜索] 找到客户数:', list.length);

    res.json({
      success: true,
      code: 200,
      message: '搜索客户成功',
      data: {
        customers: list,
        total: list.length
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
    console.log('[创建客户] 第一次保存完成，savedCustomer:', savedCustomer);
    console.log('[创建客户] savedCustomer.id:', savedCustomer.id);

    // 生成客户编号
    savedCustomer.customerNo = `C${savedCustomer.id.substring(0, 8).toUpperCase()}`;
    console.log('[创建客户] 生成的客户编号:', savedCustomer.customerNo);

    await customerRepository.save(savedCustomer);
    console.log('[创建客户] 第二次保存完成');

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

    console.log('[创建客户] 准备返回的data对象:', data);
    console.log('[创建客户] data.id:', data.id);
    console.log('[创建客户] data.name:', data.name);

    res.status(201).json({
      success: true,
      code: 200,
      message: '创建客户成功',
      data
    });

    console.log('[创建客户] 响应已发送');
  } catch (error) {
    console.error('[创建客户] 创建客户失败:', error);
    console.error('[创建客户] 错误详情:', error instanceof Error ? error.stack : error);
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

// ========== 客户详情子路由 ==========

/**
 * @route GET /api/v1/customers/:id/orders
 * @desc 获取客户订单历史
 * @access Private
 */
router.get('/:id/orders', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    // 返回空数组，实际应从订单表查询
    res.json({
      success: true,
      code: 200,
      data: []
    });
  } catch (error) {
    console.error('获取客户订单失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户订单失败' });
  }
});

/**
 * @route GET /api/v1/customers/:id/services
 * @desc 获取客户售后记录
 * @access Private
 */
router.get('/:id/services', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取客户售后记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户售后记录失败' });
  }
});

/**
 * @route GET /api/v1/customers/:id/calls
 * @desc 获取客户通话记录
 * @access Private
 */
router.get('/:id/calls', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取客户通话记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户通话记录失败' });
  }
});

/**
 * @route GET /api/v1/customers/:id/followups
 * @desc 获取客户跟进记录
 * @access Private
 */
router.get('/:id/followups', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    res.json({ success: true, code: 200, data: [] });
  } catch (error) {
    console.error('获取客户跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户跟进记录失败' });
  }
});

/**
 * @route POST /api/v1/customers/:id/followups
 * @desc 添加客户跟进记录
 * @access Private
 */
router.post('/:id/followups', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const followUpData = req.body;
    const newFollowUp = {
      id: `followup_${Date.now()}`,
      customerId,
      ...followUpData,
      createTime: new Date().toISOString()
    };
    res.status(201).json({ success: true, code: 200, data: newFollowUp });
  } catch (error) {
    console.error('添加跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '添加跟进记录失败' });
  }
});

/**
 * @route PUT /api/v1/customers/:id/followups/:followUpId
 * @desc 更新客户跟进记录
 * @access Private
 */
router.put('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    const { id: customerId, followUpId } = req.params;
    const followUpData = req.body;
    res.json({ success: true, code: 200, data: { id: followUpId, ...followUpData } });
  } catch (error) {
    console.error('更新跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '更新跟进记录失败' });
  }
});

/**
 * @route DELETE /api/v1/customers/:id/followups/:followUpId
 * @desc 删除客户跟进记录
 * @access Private
 */
router.delete('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除跟进记录失败:', error);
    res.status(500).json({ success: false, code: 500, message: '删除跟进记录失败' });
  }
});

/**
 * @route GET /api/v1/customers/:id/tags
 * @desc 获取客户标签
 * @access Private
 */
router.get('/:id/tags', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });
    res.json({ success: true, code: 200, data: customer?.tags || [] });
  } catch (error) {
    console.error('获取客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取客户标签失败' });
  }
});

/**
 * @route POST /api/v1/customers/:id/tags
 * @desc 添加客户标签
 * @access Private
 */
router.post('/:id/tags', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
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
    console.error('添加客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '添加客户标签失败' });
  }
});

/**
 * @route DELETE /api/v1/customers/:id/tags/:tagId
 * @desc 删除客户标签
 * @access Private
 */
router.delete('/:id/tags/:tagId', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);
    const customer = await customerRepository.findOne({ where: { id: req.params.id } });
    if (!customer) {
      return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customer.tags = (customer.tags || []).filter((tag: any) => tag.id !== req.params.tagId);
    await customerRepository.save(customer);
    res.json({ success: true, code: 200, message: '删除成功' });
  } catch (error) {
    console.error('删除客户标签失败:', error);
    res.status(500).json({ success: false, code: 500, message: '删除客户标签失败' });
  }
});

export default router;
