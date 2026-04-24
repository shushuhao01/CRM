import { Router, Request, Response } from 'express';
import { Customer } from '../../entities/Customer';
import { User } from '../../entities/User';
import { Order } from '../../entities/Order';
import { CustomerShare } from '../../entities/CustomerShare';
import { In } from 'typeorm';
import { formatDateTime, formatDate } from '../../utils/dateFormat';
import { getTenantRepo } from '../../utils/tenantRepo';
import { createCustomerLog } from '../../utils/customerLog';
import { log } from '../../config/logger';

// 从地址字段提取最新地址（支持JSON数组格式和纯文本格式）
function getLatestAddress(address: string | null | undefined): string {
  if (!address) return '';
  try {
    const parsed = JSON.parse(address);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].content || '';
    }
  } catch {
    // 纯文本地址，直接返回
  }
  return address;
}
import { v4 as uuidv4 } from 'uuid';

export function registerCoreRoutes(router: Router) {
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
        birthday: customer.birthday ? formatDate(customer.birthday) : '',  // 🔥 添加生日字段
        height: customer.height || null,
        weight: customer.weight || null,
        address: getLatestAddress(customer.address),
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
        customFields: customer.customFields || null,
        wecomExternalUserid: customer.wecomExternalUserid || '',
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
 * @route POST /customers/check-batch-phones
 * @desc 批量检查手机号是否已存在（用于批量导入预检）
 */
router.post('/check-batch-phones', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const { phones } = req.body;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return res.json({ success: true, code: 200, data: { duplicates: [] } });
    }

    // 批量查询已存在的手机号
    const existingCustomers = await customerRepository
      .createQueryBuilder('customer')
      .where('customer.phone IN (:...phones)', { phones })
      .select(['customer.phone'])
      .getMany();

    const duplicates = existingCustomers.map(c => c.phone);

    res.json({ success: true, code: 200, data: { duplicates } });
  } catch (error) {
    log.error('批量检查手机号失败:', error);
    res.status(500).json({ success: false, code: 500, message: '批量检查手机号失败' });
  }
});

/**
 * @route POST /customers/batch-import
 * @desc 批量导入客户（仅管理员/超管/部门经理）
 */
router.post('/batch-import', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).currentUser || (req as any).user;
    const userId = currentUser?.id || (req as any).user?.userId;
    const userRole = currentUser?.role;

    // 权限检查：仅管理员、超级管理员、部门经理
    if (!['super_admin', 'admin', 'department_manager'].includes(userRole)) {
      return res.status(403).json({ success: false, code: 403, message: '无权执行批量导入操作' });
    }

    const { customers } = req.body;
    if (!customers || !Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ success: false, code: 400, message: '导入数据不能为空' });
    }

    if (customers.length > 5000) {
      return res.status(400).json({ success: false, code: 400, message: '单次最多导入5000条' });
    }

    const customerRepository = getTenantRepo(Customer);
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of customers) {
      try {
        if (!item.name) {
          errorCount++;
          errors.push(`缺少姓名`);
          continue;
        }

        // 检查手机号重复
        if (item.phone) {
          const existing = await customerRepository.findOne({ where: { phone: item.phone } });
          if (existing) {
            duplicateCount++;
            continue;
          }
        }

        const customer = customerRepository.create({
          name: item.name,
          phone: item.phone || null,
          email: item.email || null,
          address: item.address || null,
          province: item.province || null,
          city: item.city || null,
          district: item.district || null,
          street: item.street || null,
          detailAddress: item.detailAddress || null,
          overseasAddress: item.overseasAddress || null,
          level: item.level || 'normal',
          source: item.source || 'other',
          tags: item.tags || [],
          remark: item.remark || null,
          company: item.company || null,
          status: item.status || 'active',
          salesPersonId: userId,
          createdBy: userId,
          age: item.age ? parseInt(item.age) : null,
          gender: item.gender || 'unknown',
          height: item.height ? parseFloat(item.height) : null,
          weight: item.weight ? parseFloat(item.weight) : null,
          wechat: item.wechat || null,
          medicalHistory: item.medicalHistory || null,
          improvementGoals: item.improvementGoals || [],
          otherGoals: item.otherGoals || null,
          fanAcquisitionTime: item.fanAcquisitionTime ? new Date(item.fanAcquisitionTime) : null,
          birthday: item.birthday ? new Date(item.birthday) : null,
          customFields: item.customFields || null,
          wecomExternalUserid: item.wecomExternalUserid || null,
          orderCount: 0,
          returnCount: 0,
          totalAmount: 0
        });

        const saved = await customerRepository.save(customer);

        // 生成客户编号
        try {
          saved.customerNo = `C${saved.id.substring(0, 8).toUpperCase()}`;
          await customerRepository.save(saved);
        } catch (codeErr: any) {
          log.warn('[批量导入] 客户编号生成失败:', codeErr.message);
        }

        // 记录批量导入创建日志
        createCustomerLog({
          customerId: saved.id,
          logType: 'create',
          content: `通过批量导入创建了客户「${saved.name}」`,
          detail: { source: 'batch_import', customerName: saved.name, phone: saved.phone || '' },
          operatorId: userId,
          operatorName: currentUser?.realName || currentUser?.name || '系统',
          tenantId: (req as any).tenantId || currentUser?.tenantId
        });

        successCount++;
      } catch (itemErr: any) {
        errorCount++;
        errors.push(`${item.name || '未知'}: ${itemErr.message}`);
        log.warn('[批量导入] 单条导入失败:', itemErr.message);
      }
    }

    log.info(`[批量导入] 完成: 成功${successCount}, 重复${duplicateCount}, 失败${errorCount}`);

    res.json({
      success: true,
      code: 200,
      message: '批量导入完成',
      data: { successCount, duplicateCount, errorCount, errors: errors.slice(0, 20) }
    });
  } catch (error) {
    log.error('批量导入失败:', error);
    res.status(500).json({ success: false, code: 500, message: '批量导入失败' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;

    // 🔥 30秒缓存：避免频繁刷新列表时重复执行统计查询
    const { cacheService } = await import('../../services/CacheService');
    const cacheKey = cacheService.tenantKey(tenantId, 'customers', 'list-stats');
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ success: true, code: 200, message: '获取客户统计成功(缓存)', data: cached });
    }

    const customerRepository = getTenantRepo(Customer);
    const _orderRepository = getTenantRepo(Order);

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
      address: getLatestAddress(customer.address),
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
      fanAcquisitionTime: formatDate(customer.fanAcquisitionTime),
      customFields: customer.customFields || null,
      wecomExternalUserid: customer.wecomExternalUserid || '',
      starRating: (customer as any).starRating || 0,
      finalScore: (customer as any).finalScore || 0
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

router.post('/', async (req: Request, res: Response) => {
  try {
    const customerRepository = getTenantRepo(Customer);
    const {
      name, phone, email, address, level, source, tags, remarks, remark, company,
      age, gender, height, weight, wechat, wechatId,
      province, city, district, street, detailAddress, overseasAddress,
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime,
      status, salesPersonId, createdBy, customFields, wecomExternalUserid, birthday
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
    const _tempCodePrefix = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

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
      birthday: birthday ? new Date(birthday) : null,
      customFields: customFields || null,
      wecomExternalUserid: wecomExternalUserid || null,
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

    // 🔥 v1.8.1 新增：触发自动发送短信（新客户创建欢迎短信）
    try {
      const tenantId = (verifyCustomer as any).tenantId || (req as any).tenantId;
      if (tenantId && verifyCustomer.phone) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { SmsAutoSendService } = require('../../services/SmsAutoSendService');
        const currentUser = (req as any).user;
        SmsAutoSendService.triggerEvent(tenantId, 'customer_created', {
          customer: {
            name: verifyCustomer.name,
            phone: verifyCustomer.phone,
            customerNo: verifyCustomer.customerNo || customerNo,
            email: verifyCustomer.email || '',
            gender: verifyCustomer.gender || '',
            address: verifyCustomer.address || ''
          },
          userId: currentUser?.userId,
          departmentId: currentUser?.department || currentUser?.departmentId || ''
        }).catch((err: any) => log.warn('[SMS-AutoSend] 新客户创建触发失败:', err.message));
      }
    } catch (autoSendErr: any) {
      log.warn('[SMS-AutoSend] 新客户触发跳过:', autoSendErr.message);
    }

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

    // 记录客户创建日志
    createCustomerLog({
      customerId: data.id,
      logType: 'create',
      content: `通过CRM系统手动创建了客户「${data.name}」`,
      detail: { source: 'crm_manual', customerName: data.name, phone: data.phone || '', createdBy: currentUser?.realName || currentUser?.name || '系统' },
      operatorId: currentUserId,
      operatorName: currentUser?.realName || currentUser?.name || '系统',
      tenantId: currentTenantId
    });

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
      medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime, otherPhones,
      customFields, starRating, finalScore
    } = req.body;

    // 字段中文名映射
    const fieldLabelMap: Record<string, string> = {
      name: '客户姓名', phone: '联系电话', email: '邮箱', address: '详细地址',
      level: '客户等级', source: '客户来源', tags: '标签', remark: '备注',
      company: '公司', status: '状态', age: '年龄', gender: '性别',
      height: '身高', weight: '体重', birthday: '生日', wechat: '微信号',
      province: '省份', city: '城市', district: '区县', street: '街道',
      detailAddress: '详细地址', overseasAddress: '境外地址',
      medicalHistory: '疾病史', improvementGoals: '改善目标', otherGoals: '其他目标',
      fanAcquisitionTime: '进粉时间', otherPhones: '备用号码', customFields: '自定义字段',
      starRating: '手动评分'
    };
    const genderMap: Record<string, string> = { male: '男', female: '女', unknown: '未知' };
    const levelMap: Record<string, string> = { normal: '普通', vip: 'VIP', svip: 'SVIP', important: '重要', potential: '潜在' };

    // 记录变更前的旧值
    const changes: { field: string; fieldLabel: string; oldValue: any; newValue: any }[] = [];
    // 手机号脱敏函数
    const maskPhone = (val: string) => {
      if (!val || val.length < 7) return val || '';
      return val.substring(0, 3) + '****' + val.substring(val.length - 4);
    };
    const trackChange = (field: string, oldVal: any, newVal: any) => {
      let oldDisplay = oldVal ?? '';
      let newDisplay = newVal ?? '';
      if (field === 'gender') { oldDisplay = genderMap[oldVal] || oldVal || ''; newDisplay = genderMap[newVal] || newVal || ''; }
      if (field === 'level') { oldDisplay = levelMap[oldVal] || oldVal || ''; newDisplay = levelMap[newVal] || newVal || ''; }
      if (field === 'phone') {
        oldDisplay = maskPhone(String(oldVal || ''));
        newDisplay = maskPhone(String(newVal || ''));
      }
      if (field === 'otherPhones') {
        oldDisplay = Array.isArray(oldVal) ? oldVal.map(maskPhone).join(', ') : (oldVal || '');
        newDisplay = Array.isArray(newVal) ? newVal.map(maskPhone).join(', ') : (newVal || '');
      } else if (field === 'tags' || field === 'improvementGoals') {
        oldDisplay = Array.isArray(oldVal) ? oldVal.join(', ') : (oldVal || '');
        newDisplay = Array.isArray(newVal) ? newVal.join(', ') : (newVal || '');
      }
      if (field === 'birthday' || field === 'fanAcquisitionTime') {
        oldDisplay = oldVal ? new Date(oldVal).toLocaleDateString('zh-CN') : '';
        newDisplay = newVal ? new Date(newVal).toLocaleDateString('zh-CN') : '';
      }
      if (String(oldDisplay) !== String(newDisplay)) {
        changes.push({ field, fieldLabel: fieldLabelMap[field] || field, oldValue: oldDisplay, newValue: newDisplay });
      }
    };

    // 更新字段并跟踪变更
    if (name !== undefined) { trackChange('name', customer.name, name); customer.name = name; }
    if (phone !== undefined) { trackChange('phone', customer.phone, phone); customer.phone = phone; }
    if (email !== undefined) { trackChange('email', customer.email, email); customer.email = email; }
    if (address !== undefined) { trackChange('address', customer.address, address); customer.address = address; }
    if (province !== undefined) { trackChange('province', customer.province, province); customer.province = province; }
    if (city !== undefined) { trackChange('city', customer.city, city); customer.city = city; }
    if (district !== undefined) { trackChange('district', customer.district, district); customer.district = district; }
    if (street !== undefined) { trackChange('street', customer.street, street); customer.street = street; }
    if (detailAddress !== undefined) { trackChange('detailAddress', customer.detailAddress, detailAddress); customer.detailAddress = detailAddress; }
    if (overseasAddress !== undefined) { trackChange('overseasAddress', customer.overseasAddress, overseasAddress); customer.overseasAddress = overseasAddress; }
    if (level !== undefined) { trackChange('level', customer.level, level); customer.level = level; }
    if (source !== undefined) { trackChange('source', customer.source, source); customer.source = source; }
    if (tags !== undefined) { trackChange('tags', customer.tags, tags); customer.tags = tags; }
    if (remarks !== undefined || remark !== undefined) { trackChange('remark', customer.remark, remarks || remark); customer.remark = remarks || remark; }
    if (company !== undefined) { trackChange('company', customer.company, company); customer.company = company; }
    if (status !== undefined) { trackChange('status', customer.status, status); customer.status = status; }
    if (age !== undefined) { trackChange('age', customer.age, age); customer.age = age; }
    if (gender !== undefined) { trackChange('gender', customer.gender, gender); customer.gender = gender; }
    if (height !== undefined) { trackChange('height', customer.height, height); customer.height = height; }
    if (weight !== undefined) { trackChange('weight', customer.weight, weight); customer.weight = weight; }
    if (birthday !== undefined) { trackChange('birthday', customer.birthday, birthday); customer.birthday = birthday ? new Date(birthday) : undefined; }
    if (wechat !== undefined || wechatId !== undefined) { trackChange('wechat', customer.wechat, wechat || wechatId); customer.wechat = wechat || wechatId; }
    if (medicalHistory !== undefined) { customer.medicalHistory = medicalHistory; }
    if (improvementGoals !== undefined) { trackChange('improvementGoals', customer.improvementGoals, improvementGoals); customer.improvementGoals = improvementGoals; }
    if (otherGoals !== undefined) { trackChange('otherGoals', customer.otherGoals, otherGoals); customer.otherGoals = otherGoals; }
    if (fanAcquisitionTime !== undefined) { trackChange('fanAcquisitionTime', customer.fanAcquisitionTime, fanAcquisitionTime); customer.fanAcquisitionTime = fanAcquisitionTime ? new Date(fanAcquisitionTime) : undefined; }
    if (otherPhones !== undefined) { trackChange('otherPhones', customer.otherPhones, otherPhones); customer.otherPhones = otherPhones; }
    if (customFields !== undefined) { customer.customFields = customFields; }
    if (starRating !== undefined) {
      trackChange('starRating', (customer as any).starRating, starRating);
      (customer as any).starRating = starRating;
    }
    if (finalScore !== undefined) { (customer as any).finalScore = finalScore; }

    const updatedCustomer = await customerRepository.save(customer);

    // 自动记录客户日志（含详细字段变更）
    const editUser = (req as any).currentUser;
    const changesSummary = changes.length > 0
      ? changes.map(c => `${c.fieldLabel}: "${c.oldValue || '空'}" → "${c.newValue || '空'}"`).join('；')
      : '编辑了客户信息';
    createCustomerLog({
      customerId,
      logType: 'edit',
      content: changesSummary,
      detail: { changes, rawBody: req.body },
      operatorId: editUser?.id,
      operatorName: editUser?.realName || editUser?.name || '系统',
      tenantId: editUser?.tenantId
    });

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
      fanAcquisitionTime: updatedCustomer.fanAcquisitionTime ? formatDate(updatedCustomer.fanAcquisitionTime) : '',
      customFields: updatedCustomer.customFields || null,
      starRating: (updatedCustomer as any).starRating || 0,
      finalScore: (updatedCustomer as any).finalScore || 0
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
}
