import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Customer } from '../entities/Customer';
import { User } from '../entities/User';
import { Not, IsNull } from 'typeorm';

const router = Router();

router.use(authenticateToken);

/**
 * @route GET /api/v1/data/list
 * @desc 获取数据列表（客户数据）
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, keyword, assigneeId } = req.query;
    const currentUser = (req as any).user;
    const customerRepository = AppDataSource.getRepository(Customer);

    const queryBuilder = customerRepository.createQueryBuilder('customer');

    // 数据权限过滤
    const role = currentUser?.role || '';
    const allowAllRoles = ['super_admin', 'superadmin', 'admin'];
    if (!allowAllRoles.includes(role)) {
      if (role === 'manager' || role === 'department_manager') {
        // 经理看本部门的
      } else {
        // 销售员只看自己的
        queryBuilder.andWhere('customer.salesPersonId = :userId', {
          userId: currentUser?.userId
        });
      }
    }

    if (status) {
      queryBuilder.andWhere('customer.status = :status', { status });
    }

    if (keyword) {
      queryBuilder.andWhere(
        '(customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.customerCode LIKE :keyword)',
        { keyword: `%${keyword}%` }
      );
    }

    if (assigneeId) {
      queryBuilder.andWhere('customer.salesPersonId = :assigneeId', { assigneeId });
    }

    queryBuilder.orderBy('customer.createdAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error) {
    console.error('获取数据列表失败:', error);
    res.status(500).json({ success: false, message: '获取数据列表失败' });
  }
});


/**
 * @route POST /api/v1/data/batch-assign
 * @desc 批量分配数据
 */
router.post('/batch-assign', async (req: Request, res: Response) => {
  try {
    const { dataIds, assigneeId } = req.body;

    if (!dataIds || dataIds.length === 0 || !assigneeId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    const userRepository = AppDataSource.getRepository(User);

    const assignee = await userRepository.findOne({ where: { id: assigneeId } });
    if (!assignee) {
      return res.status(404).json({ success: false, message: '分配人不存在' });
    }

    let successCount = 0;
    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.salesPersonId = assigneeId;
          customer.salesPersonName = assignee.realName || assignee.username;
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        console.error('分配单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '分配成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('批量分配失败:', error);
    res.status(500).json({ success: false, message: '批量分配失败' });
  }
});

/**
 * @route POST /api/v1/data/batch-archive
 * @desc 批量归档数据
 */
router.post('/batch-archive', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.status = 'archived';
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        console.error('归档单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '归档成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('批量归档失败:', error);
    res.status(500).json({ success: false, message: '批量归档失败' });
  }
});

/**
 * @route POST /api/v1/data/recover
 * @desc 恢复数据
 */
router.post('/recover', async (req: Request, res: Response) => {
  try {
    const { dataIds } = req.body;

    if (!dataIds || dataIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const customerRepository = AppDataSource.getRepository(Customer);
    let successCount = 0;

    for (const id of dataIds) {
      try {
        const customer = await customerRepository.findOne({ where: { id } });
        if (customer) {
          customer.status = 'active';
          await customerRepository.save(customer);
          successCount++;
        }
      } catch (e) {
        console.error('恢复单条数据失败:', e);
      }
    }

    res.json({
      success: true,
      message: '恢复成功',
      data: { successCount, failCount: dataIds.length - successCount }
    });
  } catch (error) {
    console.error('恢复数据失败:', error);
    res.status(500).json({ success: false, message: '恢复数据失败' });
  }
});

/**
 * @route GET /api/v1/data/assignee-options
 * @desc 获取分配人选项
 */
router.get('/assignee-options', async (req: Request, res: Response) => {
  try {
    const userRepository = AppDataSource.getRepository(User);
    const users = await userRepository.find({
      where: { status: 'active' },
      select: ['id', 'username', 'realName', 'departmentName', 'position']
    });

    const options = users.map(u => ({
      id: u.id,
      name: u.realName || u.username,
      department: u.departmentName,
      position: u.position
    }));

    res.json({ success: true, data: options });
  } catch (error) {
    console.error('获取分配人选项失败:', error);
    res.status(500).json({ success: false, message: '获取分配人选项失败' });
  }
});

/**
 * @route GET /api/v1/data/search
 * @desc 搜索客户（资料管理-客户查询）
 * 支持：客户姓名、手机号、客户编码、订单号、物流单号
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    const customerRepository = AppDataSource.getRepository(Customer);

    if (!keyword) {
      return res.json({ success: true, data: null });
    }

    console.log('🔍 [客户搜索] 关键词:', keyword);

    // 1. 直接搜索客户信息（客户编码、手机号、姓名）
    let customer = await customerRepository
      .createQueryBuilder('customer')
      .where('customer.customerCode = :keyword', { keyword })
      .orWhere('customer.phone = :keyword', { keyword })
      .orWhere('customer.name = :keyword', { keyword })
      .getOne();

    // 2. 如果没找到，通过订单号搜索
    if (!customer) {
      console.log('🔍 [客户搜索] 尝试通过订单号查找');
      const orderResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         WHERE o.order_no = ?
         LIMIT 1`,
        [keyword]
      );
      if (orderResult && orderResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: orderResult[0].id }
        }) || null;
        if (customer) {
          console.log('✅ [客户搜索] 通过订单号找到客户:', customer.name);
        }
      }
    }

    // 3. 如果还没找到，通过物流单号搜索
    if (!customer) {
      console.log('🔍 [客户搜索] 尝试通过物流单号查找');
      const logisticsResult = await AppDataSource.query(
        `SELECT c.* FROM customers c
         JOIN orders o ON c.id = o.customer_id
         JOIN logistics_tracking l ON o.id = l.order_id
         WHERE l.tracking_number = ?
         LIMIT 1`,
        [keyword]
      );
      if (logisticsResult && logisticsResult.length > 0) {
        // 通过ID重新查询获取完整的Customer实体
        customer = await customerRepository.findOne({
          where: { id: logisticsResult[0].id }
        }) || null;
        if (customer) {
          console.log('✅ [客户搜索] 通过物流单号找到客户:', customer.name);
        }
      }
    }

    if (!customer) {
      console.log('❌ [客户搜索] 未找到匹配的客户');
      return res.json({ success: true, data: null, message: '未找到匹配的客户' });
    }

    // 获取客户的销售员归属信息
    if (customer.salesPersonId) {
      const salesPersonResult = await AppDataSource.query(
        `SELECT id, username, real_name, department_name, position FROM users WHERE id = ?`,
        [customer.salesPersonId]
      );
      if (salesPersonResult && salesPersonResult.length > 0) {
        const salesPerson = salesPersonResult[0];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (customer as any).salesPersonInfo = {
          id: salesPerson.id,
          name: salesPerson.real_name || salesPerson.username,
          department: salesPerson.department_name,
          position: salesPerson.position
        };
        console.log('✅ [客户搜索] 获取到销售员信息:', salesPerson.real_name || salesPerson.username);
      }
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('❌ [客户搜索] 失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/search-customer
 * @desc 搜索客户（模糊搜索，返回列表）
 */
router.get('/search-customer', async (req: Request, res: Response) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;
    const customerRepository = AppDataSource.getRepository(Customer);

    if (!keyword) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const queryBuilder = customerRepository.createQueryBuilder('customer');
    queryBuilder.where(
      '(customer.customerCode LIKE :keyword OR customer.name LIKE :keyword OR customer.phone LIKE :keyword)',
      { keyword: `%${keyword}%` }
    );

    queryBuilder.orderBy('customer.createdAt', 'DESC');
    queryBuilder.skip((Number(page) - 1) * Number(pageSize));
    queryBuilder.take(Number(pageSize));

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: { list, total, page: Number(page), pageSize: Number(pageSize) }
    });
  } catch (error) {
    console.error('搜索客户失败:', error);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * @route GET /api/v1/data/statistics
 * @desc 获取数据统计
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const customerRepository = AppDataSource.getRepository(Customer);

    const totalCount = await customerRepository.count();
    const assignedCount = await customerRepository.count({
      where: { salesPersonId: Not(IsNull()) } as any
    });
    const archivedCount = await customerRepository.count({
      where: { status: 'archived' }
    });

    res.json({
      success: true,
      data: {
        totalCount,
        assignedCount,
        unassignedCount: totalCount - assignedCount,
        archivedCount
      }
    });
  } catch (error) {
    console.error('获取数据统计失败:', error);
    res.status(500).json({ success: false, message: '获取数据统计失败' });
  }
});

export default router;
