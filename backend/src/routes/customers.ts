import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { CustomerGroup } from '../entities/CustomerGroup';
import { CustomerTag } from '../entities/CustomerTag';
import { User } from '../entities/User';
import { Order } from '../entities/Order';
import { CustomerShare } from '../entities/CustomerShare';
import { Like, In } from 'typeorm';
import { formatDateTime, formatDate } from '../utils/dateFormat';
// 🔥 修复：已移除addTenantFilter等未使用的导入，getTenantRepo已自动处理租户隔离
import { getTenantRepo, tenantSQL } from '../utils/tenantRepo';

import { log } from '../config/logger';
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
    const customerRepository = getTenantRepo(Customer);

    const {
      page = 1,
      pageSize = 10,
      name,
      phone,
      keyword,  // 🔥 新增：支持关键词搜索（同时搜索姓名和电话）
      level,
      status,
      startDate,
      endDate,
      onlyMine  // 🔥 新增：强制只查询当前用户的客户（不管角色）
    } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = parseInt(pageSize as string) || 10;
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔥 获取当前用户信息，用于权限过滤
    // 优先使用 currentUser（从数据库查询的完整用户对象），其次使用 user（JWT payload）
    const currentUser = (req as any).currentUser || (req as any).user;
    const userId = currentUser?.id || (req as any).user?.userId;
    const userRole = currentUser?.role;
    const userDepartmentId = currentUser?.departmentId;

    log.info('[客户列表] 当前用户信息:', {
      userId,
      userRole,
      userDepartmentId,
      userName: currentUser?.name || currentUser?.realName
    });

    // 构建查询
    const queryBuilder = customerRepository.createQueryBuilder('customer');

    // 🔥 租户数据隔离 - getTenantRepo已自动通过Proxy添加tenant_id过滤
    // 不再需要额外调用addTenantFilter（避免重复过滤）

    log.info('[客户列表] 查询参数:', { page: pageNum, pageSize: pageSizeNum, keyword, name, phone, level, status, startDate, endDate, onlyMine });

    // 🔥 根据用户角色进行权限过滤
    // 管理员和超级管理员可以看到所有客户（除非指定onlyMine=true）
    // 部门经理可以看到本部门的客户
    // 普通成员只能看到自己创建的或分配给自己的客户
    const forceOnlyMine = onlyMine === 'true' || onlyMine === '1';
    if (forceOnlyMine || (userRole !== 'admin' && userRole !== 'super_admin')) {
      // 获取分享仓库，用于查询分享给当前用户的客户
      const shareRepository = getTenantRepo(CustomerShare);
      const userRepository = getTenantRepo(User);

      // 查询分享给当前用户的客户ID列表
      const sharedCustomers = await shareRepository.find({
        where: {
          sharedTo: userId,
          status: 'active'
        },
        select: ['customerId']
      });
      const sharedCustomerIds = sharedCustomers.map(s => s.customerId);

      // 🔥 判断是否是部门经理（forceOnlyMine时按普通成员处理，只看自己的客户）
      const isManager = !forceOnlyMine && (userRole === 'department_manager' || userRole === 'manager');

      if (isManager && userDepartmentId) {
        // 部门经理：可以看到本部门所有成员创建的或分配给本部门成员的客户
        // 先获取本部门所有成员的ID
        const departmentMembers = await userRepository.find({
          where: { departmentId: userDepartmentId },
          select: ['id']
        });
        const departmentMemberIds = departmentMembers.map(m => m.id);

        if (departmentMemberIds.length > 0) {
          if (sharedCustomerIds.length > 0) {
            queryBuilder.where(
              '(customer.createdBy IN (:...memberIds) OR customer.salesPersonId IN (:...memberIds) OR customer.id IN (:...sharedIds))',
              { memberIds: departmentMemberIds, sharedIds: sharedCustomerIds }
            );
          } else {
            queryBuilder.where(
              '(customer.createdBy IN (:...memberIds) OR customer.salesPersonId IN (:...memberIds))',
              { memberIds: departmentMemberIds }
            );
          }
        } else {
          // 如果部门没有成员，只能看自己的
          if (sharedCustomerIds.length > 0) {
            queryBuilder.where(
              '(customer.createdBy = :userId OR customer.salesPersonId = :userId OR customer.id IN (:...sharedIds))',
              { userId, sharedIds: sharedCustomerIds }
            );
          } else {
            queryBuilder.where(
              '(customer.createdBy = :userId OR customer.salesPersonId = :userId)',
              { userId }
            );
          }
        }
      } else {
        // 普通成员：只能看到自己创建的或分配给自己的客户
        log.info('[客户列表] 普通成员权限过滤, userId:', userId, '角色:', userRole, '分享客户数:', sharedCustomerIds.length);
        if (sharedCustomerIds.length > 0) {
          queryBuilder.where(
            '(customer.createdBy = :userId OR customer.salesPersonId = :userId OR customer.id IN (:...sharedIds))',
            { userId, sharedIds: sharedCustomerIds }
          );
        } else {
          queryBuilder.where(
            '(customer.createdBy = :userId OR customer.salesPersonId = :userId)',
            { userId }
          );
        }
      }
    }

    // 添加其他筛选条件
    // 🔥 新增：支持keyword关键词搜索（同时搜索姓名、电话、客户编码和其他手机号）
    if (keyword) {
      queryBuilder.andWhere('(customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.customerNo LIKE :keyword OR CAST(customer.other_phones AS CHAR) LIKE :keyword)', { keyword: `%${keyword}%` });
    }

    if (name) {
      queryBuilder.andWhere('customer.name LIKE :name', { name: `%${name}%` });
    }

    if (phone) {
      queryBuilder.andWhere('(customer.phone LIKE :phone OR CAST(customer.other_phones AS CHAR) LIKE :phone)', { phone: `%${phone}%` });
    }

    if (level) {
      queryBuilder.andWhere('customer.level = :level', { level });
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    // 日期范围筛选 - 🔥 修复：确保包含整天的数据
    if (startDate && endDate) {
      queryBuilder.andWhere('customer.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
      queryBuilder.andWhere('customer.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    // 🔥 统计数据查询（在应用分页之前，基于相同的筛选条件）
    const statsQueryBuilder = queryBuilder.clone();

    // 获取今日日期和本月日期范围
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];

    // 获取订单仓库，用于统计
    const orderRepository = getTenantRepo(Order);

    // 统计总数（筛选后的）
    const totalCustomers = await statsQueryBuilder.getCount();

    // 统计当月客户数（本月创建的客户）
    const monthCustomers = await statsQueryBuilder.clone()
      .andWhere('customer.createdAt >= :monthStart', { monthStart: `${currentMonthStartStr} 00:00:00` })
      .getCount();

    // 统计今日新增客户数
    const newCustomers = await statsQueryBuilder.clone()
      .andWhere('DATE(customer.createdAt) = :today', { today: todayStr })
      .getCount();

    // 🔥 性能优化：统计未下单客户数
    // 修复1：使用 LEFT JOIN + IS NULL 替代 NOT IN 子查询（性能更优，尤其在大数据量场景）
    // 修复2：添加租户隔离条件（o.tenant_id = customer.tenant_id），防止跨租户数据泄露
    const noOrderCustomers = await statsQueryBuilder.clone()
      .leftJoin('orders', 'o_stat', 'o_stat.customer_id = customer.id AND o_stat.tenant_id = customer.tenant_id')
      .andWhere('o_stat.id IS NULL')
      .getCount();

    // 排序和分页
    queryBuilder.orderBy('customer.createdAt', 'DESC')
      .skip(skip)
      .take(pageSizeNum);

    const [customers, total] = await queryBuilder.getManyAndCount();

    // 🔥 性能优化：批量获取关联数据，替代N+1查询
    // 之前每个客户都单独查询订单数、分享状态、销售人员（N条客户 = 3N+1次查询）
    // 优化后：统一批量查询，只需要4次查询
    const customerIds = customers.map(c => c.id);
    const salesPersonIds = [...new Set(customers.map(c => c.salesPersonId).filter(Boolean))] as string[];

    // 批量查询1：所有客户的订单数统计
    const orderCountMap: Record<string, number> = {};
    if (customerIds.length > 0) {
      try {
        const orderCounts = await orderRepository
          .createQueryBuilder('order')
          .select('order.customerId', 'customerId')
          .addSelect('COUNT(*)', 'count')
          .where('order.customerId IN (:...ids)', { ids: customerIds })
          .groupBy('order.customerId')
          .getRawMany();
        orderCounts.forEach((item: any) => {
          orderCountMap[item.customerId] = parseInt(item.count) || 0;
        });
      } catch (e) {
        log.warn('批量统计订单数失败:', e);
      }
    }

    // 批量查询2：所有客户的分享状态
    const shareRepository = getTenantRepo(CustomerShare);
    const shareMap: Record<string, any> = {};
    if (customerIds.length > 0) {
      try {
        const shares = await shareRepository.find({
          where: {
            customerId: In(customerIds),
            status: 'active' as any
          },
          order: { createdAt: 'DESC' }
        });
        // 每个客户取最新的一条分享记录
        shares.forEach((share: any) => {
          if (!shareMap[share.customerId]) {
            shareMap[share.customerId] = {
              id: share.id,
              isShared: true,
              status: share.status,
              sharedBy: share.sharedBy,
              sharedByName: share.sharedByName,
              sharedTo: share.sharedTo,
              sharedToName: share.sharedToName,
              shareTime: share.createdAt,
              expireTime: share.expireTime,
              timeLimit: share.timeLimit
            };
          }
        });
      } catch (e) {
        log.warn('批量查询分享状态失败:', e);
      }
    }

    // 批量查询3：所有涉及的销售人员
    const salesPersonMap: Record<string, string> = {};
    if (salesPersonIds.length > 0) {
      try {
        const userRepository = getTenantRepo(User);
        const salesPersons = await userRepository.find({
          where: { id: In(salesPersonIds) },
          select: ['id', 'realName', 'name']
        });
        salesPersons.forEach((sp: any) => {
          salesPersonMap[sp.id] = sp.realName || sp.name || '';
        });
      } catch (e) {
        log.warn('批量获取销售人员信息失败:', e);
      }
    }

    // 转换数据格式（不再需要异步，直接使用Map查找）
    const list = customers.map(customer => {
      const realOrderCount = orderCountMap[customer.id] || customer.orderCount || 0;
      const shareInfo = shareMap[customer.id] || null;
      const salesPersonName = customer.salesPersonId ? (salesPersonMap[customer.salesPersonId] || '') : '';

      return {
        id: customer.id,
        code: customer.customerNo || '',
        name: customer.name,
        phone: customer.phone || '',
        otherPhones: customer.otherPhones || [],  // 🔥 添加其他手机号
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
        salesPersonName: salesPersonName,
        orderCount: realOrderCount,
        returnCount: customer.returnCount || 0,
        totalAmount: customer.totalAmount || 0,
        createTime: formatDateTime(customer.createdAt),
        createdBy: customer.createdBy || '',
        wechat: customer.wechat || '',
        wechatId: customer.wechat || '',
        email: customer.email || '',
        company: customer.company || '',
        source: customer.source || '',
        tags: customer.tags || [],
        remarks: customer.remark || '',
        remark: customer.remark || '',
        medicalHistory: (() => {
          // 解析疾病史，返回最新的一条记录内容
          if (!customer.medicalHistory) return '';
          try {
            const parsed = JSON.parse(customer.medicalHistory);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // 按创建时间排序，返回最新的一条
              const sorted = parsed.sort((a: any, b: any) => {
                const timeA = new Date(a.createTime || 0).getTime();
                const timeB = new Date(b.createTime || 0).getTime();
                return timeB - timeA;
              });
              return sorted[0]?.content || '';
            }
            return customer.medicalHistory;
          } catch {
            return customer.medicalHistory;
          }
        })(),
        improvementGoals: customer.improvementGoals || [],
        otherGoals: customer.otherGoals || '',
        fanAcquisitionTime: formatDate(customer.fanAcquisitionTime),
        shareInfo // 🔥 添加分享信息
      };
    });

    res.json({
      success: true,
      code: 200,
      message: '获取客户列表成功',
      data: {
        list,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        // 🔥 新增：统计数据
        statistics: {
          totalCustomers,
          monthCustomers,
          newCustomers,
          noOrderCustomers
        }
      }
    });
  } catch (error) {
    log.error('获取客户列表失败:', error);
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
    const groupRepository = getTenantRepo(CustomerGroup);
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
    log.error('获取分组列表失败:', error);
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
    const groupRepository = getTenantRepo(CustomerGroup);
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
    log.error('创建分组失败:', error);
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
    const groupRepository = getTenantRepo(CustomerGroup);
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
    log.error('获取分组详情失败:', error);
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
    const groupRepository = getTenantRepo(CustomerGroup);
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
    log.error('更新分组失败:', error);
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
    const groupRepository = getTenantRepo(CustomerGroup);
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
    log.error('删除分组失败:', error);
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
    const tagRepository = getTenantRepo(CustomerTag);
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
    log.error('获取标签列表失败:', error);
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
    const tagRepository = getTenantRepo(CustomerTag);
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
    log.error('创建标签失败:', error);
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
    const tagRepository = getTenantRepo(CustomerTag);
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
    log.error('获取标签详情失败:', error);
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
    const tagRepository = getTenantRepo(CustomerTag);
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
    log.error('更新标签失败:', error);
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
    const tagRepository = getTenantRepo(CustomerTag);
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
    log.error('删除标签失败:', error);
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
    const customerRepository = getTenantRepo(Customer);
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '手机号不能为空',
        data: null
      });
    }

    log.info('[检查客户存在] 查询手机号:', phone);

    // 🔥 修复：同时搜索主手机号和其他手机号（JSON数组），使用精确匹配
    const existingCustomer = await customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone = :phone OR JSON_CONTAINS(customer.other_phones, JSON_QUOTE(:phone))', { phone: phone as string })
      .getOne();

    if (existingCustomer) {
      log.info('[检查客户存在] 找到客户:', existingCustomer.name);

      // 查找归属人的真实姓名
      let ownerName = '';
      const ownerId = existingCustomer.salesPersonId || existingCustomer.createdBy;

      if (ownerId) {
        try {
          const userRepository = getTenantRepo(User);
          const owner = await userRepository.findOne({
            where: { id: ownerId }
          });
          ownerName = owner?.name || ownerId;
        } catch (e) {
          log.info('[检查客户存在] 查找归属人失败:', e);
          ownerName = ownerId;
        }
      }

      return res.json({
        success: true,
        code: 200,
        message: '该手机号已存在客户记录',
        data: {
          id: existingCustomer.id,
          name: existingCustomer.name,
          phone: existingCustomer.phone,
          creatorName: ownerName,
          createTime: existingCustomer.createdAt?.toISOString() || ''
        }
      });
    }

    log.info('[检查客户存在] 客户不存在，可以创建');
    return res.json({
      success: true,
      code: 200,
      message: '该手机号不存在，可以创建',
      data: null
    });
  } catch (error) {
    log.error('检查客户存在失败:', error);
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
 * @route GET /api/v1/customers/stats
 * @desc 获取客户列表统计数据（独立接口，支持30秒缓存）
 * @access Private
 * @note 此路由必须在 /:id 路由之前定义
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;

    // 🔥 30秒缓存：避免频繁刷新列表时重复执行统计查询
    const { cacheService } = await import('../services/CacheService');
    const cacheKey = cacheService.tenantKey(tenantId, 'customers', 'list-stats');
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, code: 200, message: '获取客户统计成功(缓存)', data: cached });
    }

    const customerRepository = getTenantRepo(Customer);
    const orderRepository = getTenantRepo(Order);

    // 获取今日日期和本月日期范围
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];

    // 基础查询（带租户隔离）
    const baseQuery = customerRepository.createQueryBuilder('customer');

    // 统计总客户数
    const totalCustomers = await baseQuery.clone().getCount();

    // 统计当月新增客户数
    const monthCustomers = await baseQuery.clone()
      .andWhere('customer.createdAt >= :monthStart', { monthStart: `${currentMonthStartStr} 00:00:00` })
      .getCount();

    // 统计今日新增客户数
    const newCustomers = await baseQuery.clone()
      .andWhere('DATE(customer.createdAt) = :today', { today: todayStr })
      .getCount();

    // 统计未下单客户数（LEFT JOIN + IS NULL 高性能方案）
    const noOrderCustomers = await baseQuery.clone()
      .leftJoin('orders', 'o_stat', 'o_stat.customer_id = customer.id AND o_stat.tenant_id = customer.tenant_id')
      .andWhere('o_stat.id IS NULL')
      .getCount();

    const statistics = { totalCustomers, monthCustomers, newCustomers, noOrderCustomers };

    // 写入30秒缓存
    cacheService.set(cacheKey, statistics, 30);

    res.json({
      success: true,
      code: 200,
      message: '获取客户统计成功',
      data: statistics
    });
  } catch (error) {
    log.error('获取客户统计失败:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: '获取客户统计失败',
      error: error instanceof Error ? error.message : '未知错误'
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
    const customerRepository = getTenantRepo(Customer);
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '搜索关键词不能为空'
      });
    }

    log.info('[客户搜索] 搜索关键词:', keyword);

    // 搜索条件：姓名、手机号、客户编码、其他手机号
    const customers = await customerRepository
      .createQueryBuilder('customer')
      .where(
        'customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.customerNo LIKE :keyword OR CAST(customer.other_phones AS CHAR) LIKE :keyword',
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
      otherPhones: customer.otherPhones || [],  // 🔥 添加其他手机号
      gender: customer.gender || 'unknown',
      age: customer.age || 0,
      level: customer.level || 'normal',
      address: customer.address || '',
      createTime: customer.createdAt?.toISOString() || '',
      orderCount: customer.orderCount || 0,
      salesPersonId: customer.salesPersonId || ''
    }));

    log.info('[客户搜索] 找到客户数:', list.length);

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
    log.error('搜索客户失败:', error);
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
    const customerRepository = getTenantRepo(Customer);
    const userRepository = getTenantRepo(User);

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

    // 🔥 获取创建人和负责销售的名字
    let createdByName = '';
    let salesPersonName = '';

    if (customer.createdBy) {
      const creator = await userRepository.findOne({ where: { id: customer.createdBy } });
      createdByName = creator?.realName || creator?.name || '';
    }

    if (customer.salesPersonId) {
      const salesPerson = await userRepository.findOne({ where: { id: customer.salesPersonId } });
      salesPersonName = salesPerson?.realName || salesPerson?.name || '';
    }

    // 转换数据格式
    const data = {
      id: customer.id,
      code: customer.customerNo || '',
      name: customer.name,
      phone: customer.phone || '',
      otherPhones: customer.otherPhones || [],
      age: customer.age || 0,
      gender: customer.gender || 'unknown',
      height: customer.height || null,
      weight: customer.weight || null,
      birthday: customer.birthday ? formatDate(customer.birthday) : '',
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
      salesPersonName: salesPersonName,  // 🔥 添加负责销售名字
      orderCount: customer.orderCount || 0,
      returnCount: customer.returnCount || 0,
      totalAmount: customer.totalAmount || 0,
      createTime: formatDateTime(customer.createdAt),
      createdBy: customer.createdBy || '',
      createdByName: createdByName,  // 🔥 添加创建人名字
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
      fanAcquisitionTime: formatDate(customer.fanAcquisitionTime)
    };

    res.json({
      success: true,
      code: 200,
      message: '获取客户详情成功',
      data
    });
  } catch (error) {
    log.error('获取客户详情失败:', error);
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
    const customerRepository = getTenantRepo(Customer);
    const {
      name, phone, email, address, level, source, tags, remarks, remark, company,
      age, gender, height, weight, wechat, wechatId,
      province, city, district, street, detailAddress, overseasAddress,
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime,
      status, salesPersonId, createdBy
    } = req.body;

    log.info('[创建客户] 收到请求数据:', JSON.stringify(req.body));

    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '客户姓名不能为空'
      });
    }

    // 🔥 获取当前用户信息（在所有操作之前，用于日志和权限）
    const currentUser = (req as any).currentUser || (req as any).user;
    const currentUserId = currentUser?.id || (req as any).user?.userId;
    const currentTenantId = (req as any).tenantId || currentUser?.tenantId || (req as any).user?.tenantId;

    log.info('[创建客户] 当前用户信息:', {
      id: currentUserId,
      name: currentUser?.name || currentUser?.realName,
      role: currentUser?.role,
      tenantId: currentTenantId,
      departmentId: currentUser?.departmentId
    });

    // 🔥 检查手机号是否已存在（在当前租户范围内）
    if (phone) {
      try {
        const existingCustomer = await customerRepository.findOne({ where: { phone } });
        if (existingCustomer) {
          log.info('[创建客户] 手机号已存在:', phone, '客户:', existingCustomer.name, 'ID:', existingCustomer.id);
          return res.status(400).json({
            success: false,
            code: 400,
            message: `该手机号已存在客户记录（客户：${existingCustomer.name}）`
          });
        }
      } catch (checkErr: any) {
        log.error('[创建客户] 检查手机号存在性失败:', checkErr.message);
        // 检查失败不阻止创建，继续流程（容错）
      }
    }

    // 🔥 修复：优先使用当前登录用户的ID作为创建人和销售人员
    const finalCreatedBy = currentUserId || createdBy || salesPersonId || 'admin';
    const finalSalesPersonId = salesPersonId || currentUserId || null;

    log.info('[创建客户] 最终创建人ID:', finalCreatedBy, '销售人员ID:', finalSalesPersonId);

    // 🔥 修复：先生成一个临时UUID用于客户编码，避免两步保存
    // 使用 crypto 或时间戳生成唯一编码前缀
    const tempCodePrefix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // 创建客户（一步保存，包含预生成的客户编码占位符）
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
      salesPersonId: finalSalesPersonId,
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

    log.info('[创建客户] 准备保存客户, 姓名:', customer.name, '手机:', customer.phone);

    // 🔥 第一步保存：获取数据库分配的UUID
    const savedCustomer = await customerRepository.save(customer);

    if (!savedCustomer || !savedCustomer.id) {
      log.error('[创建客户] ❌ 保存后未获得ID，可能写入失败');
      return res.status(500).json({
        success: false,
        code: 500,
        message: '创建客户失败：数据库未返回有效ID'
      });
    }

    log.info('[创建客户] ✅ 第一步保存成功, ID:', savedCustomer.id, '租户:', (savedCustomer as any).tenantId);

    // 🔥 修复：生成基于UUID的客户编号，然后做第二步更新
    // 使用try-catch包裹第二步，即使编号生成失败，客户数据也已写入
    const customerNo = `C${savedCustomer.id.substring(0, 8).toUpperCase()}`;
    try {
      savedCustomer.customerNo = customerNo;
      await customerRepository.save(savedCustomer);
      log.info('[创建客户] ✅ 客户编号已更新:', customerNo);
    } catch (codeErr: any) {
      // 🔥 关键修复：如果编号更新失败（如UNIQUE冲突），使用备用编号重试
      log.warn('[创建客户] ⚠️ 客户编号更新失败（可能UNIQUE冲突），使用备用编号:', codeErr.message);
      try {
        const fallbackNo = `C${savedCustomer.id.replace(/-/g, '').substring(0, 12).toUpperCase()}`;
        savedCustomer.customerNo = fallbackNo;
        await customerRepository.save(savedCustomer);
        log.info('[创建客户] ✅ 备用客户编号已更新:', fallbackNo);
      } catch (fallbackErr: any) {
        // 编号更新完全失败，但客户数据已保存，不影响核心功能
        log.error('[创建客户] ⚠️ 客户编号更新完全失败，客户数据已保存但无编号:', fallbackErr.message);
      }
    }

    // 🔥 验证：确认客户已成功写入数据库
    const verifyCustomer = await customerRepository.findOne({ where: { id: savedCustomer.id } });
    if (!verifyCustomer) {
      log.error('[创建客户] ❌ 严重错误：保存后无法查回客户, ID:', savedCustomer.id);
      return res.status(500).json({
        success: false,
        code: 500,
        message: '创建客户异常：数据写入后无法验证，请检查数据库连接'
      });
    }

    log.info('[创建客户] ✅✅ 数据库验证通过，客户确认已写入, ID:', verifyCustomer.id, '姓名:', verifyCustomer.name, '手机:', verifyCustomer.phone);

    // 转换数据格式返回
    const data = {
      id: verifyCustomer.id,
      code: verifyCustomer.customerNo || customerNo,
      name: verifyCustomer.name,
      phone: verifyCustomer.phone || '',
      age: verifyCustomer.age || 0,
      gender: verifyCustomer.gender || 'unknown',
      height: verifyCustomer.height || null,
      weight: verifyCustomer.weight || null,
      address: verifyCustomer.address || '',
      province: verifyCustomer.province || '',
      city: verifyCustomer.city || '',
      district: verifyCustomer.district || '',
      street: verifyCustomer.street || '',
      detailAddress: verifyCustomer.detailAddress || '',
      level: verifyCustomer.level || 'normal',
      status: verifyCustomer.status || 'active',
      salesPersonId: verifyCustomer.salesPersonId || '',
      orderCount: 0,
      createTime: formatDateTime(verifyCustomer.createdAt),
      createdBy: verifyCustomer.createdBy || '',
      wechat: verifyCustomer.wechat || '',
      email: verifyCustomer.email || '',
      company: verifyCustomer.company || '',
      source: verifyCustomer.source || '',
      tags: verifyCustomer.tags || [],
      remarks: verifyCustomer.remark || '',
      medicalHistory: verifyCustomer.medicalHistory || '',
      improvementGoals: verifyCustomer.improvementGoals || [],
      otherGoals: verifyCustomer.otherGoals || ''
    };

    log.info('[创建客户] ✅ 准备返回成功响应, ID:', data.id, '姓名:', data.name);

    res.status(201).json({
      success: true,
      code: 200,
      message: '创建客户成功',
      data
    });

    log.info('[创建客户] ✅ 响应已发送');
  } catch (error) {
    log.error('[创建客户] ❌ 创建客户失败:', error);
    log.error('[创建客户] ❌ 错误详情:', error instanceof Error ? error.stack : error);

    // 🔥 提供更详细的错误信息帮助前端诊断
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const isDuplicate = errorMessage.includes('ER_DUP_ENTRY') || errorMessage.includes('Duplicate');

    res.status(isDuplicate ? 409 : 500).json({
      success: false,
      code: isDuplicate ? 409 : 500,
      message: isDuplicate ? '客户数据冲突（可能手机号或编码重复），请重试' : '创建客户失败',
      error: errorMessage
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
    const customerRepository = getTenantRepo(Customer);
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
      age, gender, height, weight, wechat, wechatId, birthday,
      province, city, district, street, detailAddress, overseasAddress,
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime, otherPhones
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
    if (birthday !== undefined) customer.birthday = birthday ? new Date(birthday) : undefined;
    if (wechat !== undefined || wechatId !== undefined) customer.wechat = wechat || wechatId;
    if (medicalHistory !== undefined) customer.medicalHistory = medicalHistory;
    if (improvementGoals !== undefined) customer.improvementGoals = improvementGoals;
    if (otherGoals !== undefined) customer.otherGoals = otherGoals;
    if (fanAcquisitionTime !== undefined) customer.fanAcquisitionTime = fanAcquisitionTime ? new Date(fanAcquisitionTime) : undefined;
    if (otherPhones !== undefined) customer.otherPhones = otherPhones;

    const updatedCustomer = await customerRepository.save(customer);

    // 转换数据格式返回
    const data = {
      id: updatedCustomer.id,
      code: updatedCustomer.customerNo || '',
      name: updatedCustomer.name,
      phone: updatedCustomer.phone || '',
      otherPhones: updatedCustomer.otherPhones || [],
      age: updatedCustomer.age || 0,
      gender: updatedCustomer.gender || 'unknown',
      height: updatedCustomer.height || null,
      weight: updatedCustomer.weight || null,
      address: updatedCustomer.address || '',
      level: updatedCustomer.level || 'normal',
      status: updatedCustomer.status || 'active',
      salesPersonId: updatedCustomer.salesPersonId || '',
      orderCount: updatedCustomer.orderCount || 0,
      createTime: formatDateTime(updatedCustomer.createdAt),
      createdBy: updatedCustomer.createdBy || '',
      email: updatedCustomer.email || '',
      company: updatedCustomer.company || '',
      source: updatedCustomer.source || '',
      tags: updatedCustomer.tags || [],
      remarks: updatedCustomer.remark || '',
      improvementGoals: updatedCustomer.improvementGoals || [],
      fanAcquisitionTime: updatedCustomer.fanAcquisitionTime ? formatDate(updatedCustomer.fanAcquisitionTime) : ''
    };

    res.json({
      success: true,
      code: 200,
      message: '更新客户成功',
      data
    });
  } catch (error) {
    log.error('更新客户失败:', error);
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
    const customerRepository = getTenantRepo(Customer);
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
    log.error('删除客户失败:', error);
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
    const { Order } = await import('../entities/Order');
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

/**
 * @route GET /api/v1/customers/:id/services
 * @desc 获取客户售后记录
 * @access Private
 */
router.get('/:id/services', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { AfterSalesService } = await import('../entities/AfterSalesService');
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

/**
 * @route GET /api/v1/customers/:id/calls
 * @desc 获取客户通话记录
 * @access Private
 */
router.get('/:id/calls', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { Call } = await import('../entities/Call');
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

/**
 * @route GET /api/v1/customers/:id/followups
 * @desc 获取客户跟进记录
 * @access Private
 */
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

/**
 * @route POST /api/v1/customers/:id/followups
 * @desc 添加客户跟进记录
 * @access Private
 */
router.post('/:id/followups', async (req: Request, res: Response) => {
  try {
    const customerId = req.params.id;
    const { type, content, status, priority, nextFollowUp } = req.body;
    // 🔥 修复：使用正确的currentUser字段
    const currentUser = (req as any).currentUser;

    const { FollowUp } = await import('../entities/FollowUp');
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

/**
 * @route PUT /api/v1/customers/:id/followups/:followUpId
 * @desc 更新客户跟进记录
 * @access Private
 */
router.put('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params;
    const { type, content, status, priority, nextFollowUp } = req.body;

    const { FollowUp } = await import('../entities/FollowUp');
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

/**
 * @route DELETE /api/v1/customers/:id/followups/:followUpId
 * @desc 删除客户跟进记录
 * @access Private
 */
router.delete('/:id/followups/:followUpId', async (req: Request, res: Response) => {
  try {
    const { followUpId } = req.params;

    const { FollowUp } = await import('../entities/FollowUp');
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

/**
 * @route GET /api/v1/customers/:id/tags
 * @desc 获取客户标签
 * @access Private
 */
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

/**
 * @route POST /api/v1/customers/:id/tags
 * @desc 添加客户标签
 * @access Private
 */
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

/**
 * @route DELETE /api/v1/customers/:id/tags/:tagId
 * @desc 删除客户标签
 * @access Private
 */
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

/**
 * @route GET /api/v1/customers/:id/medical-history
 * @desc 获取客户疾病史
 * @access Private
 */
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

/**
 * @route POST /api/v1/customers/:id/medical-history
 * @desc 添加客户疾病史记录
 * @access Private
 */
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

/**
 * @route GET /api/v1/customers/:id/stats
 * @desc 获取客户统计数据（累计消费、订单数量、退货次数、最后下单时间）
 * @access Private
 */
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

export default router;
