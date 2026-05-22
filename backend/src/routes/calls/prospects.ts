import { Router, Request, Response } from 'express';
import { CallProspect } from '../../entities/CallProspect';
import { Customer } from '../../entities/Customer';
import { getTenantRepo } from '../../utils/tenantRepo';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../../config/database';

export function registerProspectsRoutes(router: Router) {

// GET /prospects - 分页列表（支持同时显示客户列表的客户）
router.get('/prospects', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, keyword, status, assignedTo, includeCustomers } = req.query;
    const repo = getTenantRepo(CallProspect);
    const qb = repo.createQueryBuilder('p');

    const currentUser = (req as any).user;
    const tenantId = (req as any).tenantId || currentUser?.tenantId;
    if (tenantId) qb.andWhere('p.tenantId = :tenantId', { tenantId });

    // 默认排除已删除的记录，除非明确请求回收站
    if (req.query.recycled === 'true') {
      qb.andWhere('p.deletedAt IS NOT NULL');
    } else {
      qb.andWhere('p.deletedAt IS NULL');
    }

    if (keyword) {
      qb.andWhere('(p.name LIKE :kw OR p.phone LIKE :kw OR p.company LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (status) qb.andWhere('p.status = :status', { status });
    if (assignedTo) qb.andWhere('p.assignedTo = :assignedTo', { assignedTo });

    // 角色权限过滤
    const role = currentUser?.role;
    const userId = currentUser?.userId || currentUser?.id;
    if (role === 'super_admin' || role === 'admin') {
      // 管理员和超管：看所有资料
    } else if (role === 'department_manager') {
      // 经理：看自己创建的 + 分配给自己的
      qb.andWhere('(p.createdBy = :uid OR p.assignedTo = :uid)', { uid: userId });
    } else {
      // 销售员等其他角色：只看分配给自己的
      qb.andWhere('p.assignedTo = :uid', { uid: userId });
    }

    qb.orderBy('p.createdAt', 'DESC');
    const total = await qb.getCount();
    const list = await qb.skip((Number(page) - 1) * Number(pageSize)).take(Number(pageSize)).getMany();

    // 如果请求包含客户列表数据，将客户列表中未在外呼名单的客户也加入
    if (includeCustomers === 'true' && req.query.recycled !== 'true') {
      try {
        const customerRepo = getTenantRepo(Customer);
        const cqb = customerRepo.createQueryBuilder('c');
        if (tenantId) cqb.andWhere('c.tenantId = :tenantId', { tenantId });
        cqb.andWhere('c.status = :status', { status: 'active' });

        // 排除已在外呼名单中的客户（通过 convertedCustomerId 关联）
        const existingCustomerIds = list.filter(p => p.convertedCustomerId).map(p => p.convertedCustomerId);

        if (keyword) {
          cqb.andWhere('(c.name LIKE :kw OR c.phone LIKE :kw OR c.company LIKE :kw)', { kw: `%${keyword}%` });
        }

        // 客户列表权限过滤
        if (role === 'super_admin' || role === 'admin') {
          // 管理员看所有
        } else if (role === 'department_manager') {
          // 经理看自己负责的客户
          cqb.andWhere('(c.salesPersonId = :uid OR c.createdBy = :uid)', { uid: userId });
        } else {
          // 销售员只看自己负责的客户
          cqb.andWhere('c.salesPersonId = :uid', { uid: userId });
        }

        cqb.orderBy('c.createdAt', 'DESC');
        const customerTotal = await cqb.getCount();
        const customers = await cqb.take(Number(pageSize)).getMany();

        // 转换客户数据为外呼名单格式
        const customerAsProspects = customers
          .filter((c: any) => !existingCustomerIds.includes(c.id))
          .map((c: any) => ({
            id: c.id,
            tenantId: c.tenantId,
            name: c.name,
            phone: c.phone,
            gender: c.gender,
            company: c.company || null,
            remark: c.remark || null,
            source: 'customer',
            tags: c.tags || null,
            status: 'converted',
            callCount: 0,
            lastCallTime: null,
            lastCallStatus: null,
            assignedTo: c.salesPersonId || null,
            assignedName: c.salesPersonName || null,
            convertedCustomerId: c.id,
            convertedAt: c.createdAt,
            importBatchId: null,
            createdBy: c.salesPersonId || null,
            deletedAt: null,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt
          }));

        res.json({
          success: true,
          data: {
            list: [...list, ...customerAsProspects],
            total: total + customerTotal,
            page: Number(page),
            pageSize: Number(pageSize),
            prospectTotal: total,
            customerTotal
          }
        });
        return;
      } catch (customerErr: any) {
        log.warn('[Prospects] include customers error:', customerErr.message);
      }
    }

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (e: any) {
    log.error('[Prospects] list error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects - 单个录入
router.post('/prospects', async (req: Request, res: Response) => {
  try {
    const { name, phone, gender, company, remark, tags, assignedTo, assignedName } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: '姓名和手机号必填' });

    const currentUser = (req as any).user;
    const tenantId = (req as any).tenantId || currentUser?.tenantId;
    const repo = getTenantRepo(CallProspect);

    // 查重
    const existing = await repo.findOne({ where: { tenantId, phone } });
    if (existing) return res.status(400).json({ success: false, message: `手机号 ${phone} 已存在于外呼名单中` });

    const prospect = new CallProspect();
    prospect.id = uuidv4();
    prospect.tenantId = tenantId;
    prospect.name = name;
    prospect.phone = phone;
    prospect.gender = gender || null;
    prospect.company = company || null;
    prospect.remark = remark || null;
    prospect.source = 'manual';
    prospect.tags = tags || null;
    prospect.status = 'pending';
    prospect.assignedTo = assignedTo || null;
    prospect.assignedName = assignedName || null;
    prospect.createdBy = currentUser?.userId || currentUser?.id || null;
    prospect.createdByName = currentUser?.name || currentUser?.username || null;

    await repo.save(prospect);
    res.json({ success: true, data: prospect, message: '录入成功' });
  } catch (e: any) {
    log.error('[Prospects] create error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /prospects/:id - 编辑
router.put('/prospects/:id', async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(CallProspect);
    const prospect = await repo.findOne({ where: { id: req.params.id } });
    if (!prospect) return res.status(404).json({ success: false, message: '记录不存在' });

    const { name, phone, gender, company, remark, tags, status, assignedTo, assignedName } = req.body;
    if (name !== undefined) prospect.name = name;
    if (phone !== undefined) prospect.phone = phone;
    if (gender !== undefined) prospect.gender = gender;
    if (company !== undefined) prospect.company = company;
    if (remark !== undefined) prospect.remark = remark;
    if (tags !== undefined) prospect.tags = tags;
    if (status !== undefined) prospect.status = status;
    if (assignedTo !== undefined) prospect.assignedTo = assignedTo;
    if (assignedName !== undefined) prospect.assignedName = assignedName;

    await repo.save(prospect);
    res.json({ success: true, data: prospect });
  } catch (e: any) {
    log.error('[Prospects] update error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /prospects/:id (软删除 → 回收站)
router.delete('/prospects/:id', async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(CallProspect);
    const prospect = await repo.findOne({ where: { id: req.params.id } });
    if (!prospect) return res.status(404).json({ success: false, message: '记录不存在' });
    prospect.deletedAt = new Date();
    await repo.save(prospect);
    res.json({ success: true, message: '已移入回收站' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/batch-delete (批量软删除)
router.post('/prospects/batch-delete', async (req: Request, res: Response) => {
  try {
    const { ids, permanent } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: '请选择要删除的记录' });
    const repo = getTenantRepo(CallProspect);
    if (permanent) {
      const result = await repo.delete(ids);
      res.json({ success: true, message: `已永久删除${result.affected}条`, affected: result.affected });
    } else {
      await repo.update(ids, { deletedAt: new Date() } as any);
      res.json({ success: true, message: `已移入回收站${ids.length}条`, affected: ids.length });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/restore (从回收站恢复)
router.post('/prospects/restore', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: '请选择要恢复的记录' });
    const repo = getTenantRepo(CallProspect);
    await repo.update(ids, { deletedAt: null } as any);
    res.json({ success: true, message: `已恢复${ids.length}条` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/check-phones - 批量查重（同时检查外呼名单和客户列表）
router.post('/prospects/check-phones', async (req: Request, res: Response) => {
  try {
    const { phones, checkCustomers } = req.body;
    if (!phones?.length) return res.json({ success: true, data: { duplicates: [], customerDuplicates: [] } });

    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const repo = getTenantRepo(CallProspect);
    const existingList = await repo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.phone IN (:...phones)', { phones })
      .andWhere('p.deletedAt IS NULL')
      .getMany();

    const duplicates = existingList.map(p => p.phone);

    // 同时检查客户表
    let customerDuplicates: string[] = [];
    try {
      const customerRepo = getTenantRepo(Customer);
      const customerList = await customerRepo.createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.phone IN (:...phones)', { phones })
        .getMany();
      customerDuplicates = customerList.map((c: any) => c.phone);
    } catch {}

    const allDuplicates = [...new Set([...duplicates, ...customerDuplicates])];
    res.json({ success: true, data: { duplicates: allDuplicates, customerDuplicates, prospectDuplicates: duplicates, count: allDuplicates.length } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/batch-import - Excel批量导入
router.post('/prospects/batch-import', async (req: Request, res: Response) => {
  try {
    const { records } = req.body;
    if (!records?.length) return res.status(400).json({ success: false, message: '无有效数据' });

    const currentUser = (req as any).user;
    const tenantId = (req as any).tenantId || currentUser?.tenantId;
    const repo = getTenantRepo(CallProspect);
    const batchId = uuidv4();

    let success = 0, skipped = 0, failed = 0;
    for (const record of records) {
      try {
        if (!record.name || !record.phone) { failed++; continue; }
        const existing = await repo.findOne({ where: { tenantId, phone: record.phone } });
        if (existing) { skipped++; continue; }

        const prospect = new CallProspect();
        prospect.id = uuidv4();
        prospect.tenantId = tenantId;
        prospect.name = record.name;
        prospect.phone = record.phone;
        prospect.gender = record.gender || null;
        prospect.company = record.company || null;
        prospect.remark = record.remark || null;
        prospect.tags = record.tags ? (typeof record.tags === 'string' ? record.tags.split(',').map((t: string) => t.trim()) : record.tags) : null;
        prospect.source = 'excel';
        prospect.status = 'pending';
        prospect.importBatchId = batchId;
        prospect.createdBy = currentUser?.userId || currentUser?.id || null;
        prospect.createdByName = currentUser?.name || currentUser?.username || null;
        prospect.assignedTo = null;
        prospect.assignedName = null;
        await repo.save(prospect);
        success++;
      } catch { failed++; }
    }

    res.json({ success: true, data: { success, skipped, failed, total: records.length, batchId }, message: `导入完成：成功${success}条，跳过${skipped}条（重复），失败${failed}条` });
  } catch (e: any) {
    log.error('[Prospects] batch-import error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/batch-assign - 批量分配
router.post('/prospects/batch-assign', async (req: Request, res: Response) => {
  try {
    const { ids, assignedTo, assignedName } = req.body;
    if (!ids?.length || !assignedTo) return res.status(400).json({ success: false, message: '参数不完整' });
    const currentUser = (req as any).user;
    const tenantId = (req as any).tenantId || currentUser?.tenantId;
    const repo = getTenantRepo(CallProspect);
    await repo.update(ids, { assignedTo, assignedName });

    // 写入操作日志
    try {
      const operatorId = currentUser?.userId || currentUser?.id || '';
      const operatorName = currentUser?.name || currentUser?.username || '';
      for (const pid of ids) {
        await AppDataSource.query(
          `INSERT INTO prospect_logs (id, tenant_id, prospect_id, log_type, content, detail, operator_id, operator_name) VALUES (?, ?, ?, 'assign', ?, ?, ?, ?)`,
          [uuidv4(), tenantId, pid, `分配给 ${assignedName}`, JSON.stringify({ assignedTo, assignedName }), operatorId, operatorName]
        );
      }
    } catch {}

    res.json({ success: true, message: `已分配${ids.length}条给${assignedName || assignedTo}` });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /prospects/convert - 转入客户列表
router.post('/prospects/convert', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: '请选择要转入的记录' });

    const currentUser = (req as any).user;
    const tenantId = (req as any).tenantId || currentUser?.tenantId;
    const prospectRepo = getTenantRepo(CallProspect);
    const customerRepo = getTenantRepo(Customer);

    const prospects = await prospectRepo.findByIds(ids);
    let converted = 0, skipped = 0, failed = 0;

    for (const p of prospects) {
      try {
        if (p.status === 'converted') { skipped++; continue; }

        // 检查客户表是否已有该手机号（同租户）
        const existingCustomer = await customerRepo.findOne({ where: { tenantId, phone: p.phone } as any });
        if (existingCustomer) {
          p.status = 'converted';
          p.convertedCustomerId = existingCustomer.id;
          p.convertedAt = new Date();
          await prospectRepo.save(p);
          skipped++;
          continue;
        }

        // 性别映射：中文 → enum
        let genderEnum: 'male' | 'female' | 'unknown' = 'unknown';
        if (p.gender === '男' || p.gender === 'male') genderEnum = 'male';
        else if (p.gender === '女' || p.gender === 'female') genderEnum = 'female';

        // 创建客户 - 使用原始SQL确保兼容性
        const customerId = uuidv4();
        const customerCode = `C${customerId.substring(0, 8).toUpperCase()}`;
        const createdById = currentUser?.userId || currentUser?.id || 'system';
        const createdByNameVal = currentUser?.name || currentUser?.username || '';
        const salesId = p.assignedTo || createdById;
        const salesName = p.assignedName || createdByNameVal;

        await AppDataSource.query(
          `INSERT INTO customers (id, tenant_id, customer_code, name, phone, gender, address, remark, tags, source, level, status, created_by, created_by_name, sales_person_id, sales_person_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '外呼转入', 'normal', 'active', ?, ?, ?, ?, NOW(), NOW())`,
          [
            customerId, tenantId, customerCode, p.name, p.phone, genderEnum,
            p.company || null, p.remark || null,
            p.tags ? JSON.stringify(p.tags) : null,
            createdById, createdByNameVal, salesId, salesName
          ]
        );

        const customer = { id: customerId };

        // 更新外呼名单状态
        p.status = 'converted';
        p.convertedCustomerId = customer.id;
        p.convertedAt = new Date();
        await prospectRepo.save(p);
        converted++;

        // 写入操作日志
        try {
          const operatorId = currentUser?.userId || currentUser?.id || '';
          const operatorName = currentUser?.name || currentUser?.username || '';
          await AppDataSource.query(
            `INSERT INTO prospect_logs (id, tenant_id, prospect_id, customer_id, log_type, content, operator_id, operator_name) VALUES (?, ?, ?, ?, 'convert', ?, ?, ?)`,
            [uuidv4(), tenantId, p.id, customer.id, `转入客户列表`, operatorId, operatorName]
          );
        } catch {}
      } catch (e: any) {
        log.warn(`[Prospects] convert ${p.id} error:`, e.message);
        failed++;
      }
    }

    res.json({
      success: true,
      data: { converted, skipped, failed, total: prospects.length },
      message: `转入完成：成功${converted}条，跳过${skipped}条（已存在/已转入），失败${failed}条`
    });
  } catch (e: any) {
    log.error('[Prospects] convert error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /prospects/:id/logs - 获取外呼名单操作日志
router.get('/prospects/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
    const logs = await AppDataSource.query(
      `SELECT * FROM prospect_logs WHERE prospect_id = ? AND (tenant_id = ? OR tenant_id IS NULL) ORDER BY created_at DESC LIMIT 50`,
      [id, tenantId]
    );
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

} // end registerProspectsRoutes
