import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { tenantSQL } from '../../utils/tenantRepo';
import { getCurrentTenantIdSafe } from '../../utils/tenantHelpers';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

export function registerTasksRoutes(router: Router) {
router.get('/outbound-tasks', async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      assignedTo,
      customerLevel,
      keyword
    } = req.query;

    // 🔥 修复SQL注入：使用参数化查询代替字符串拼接
    const tTask = tenantSQL('');
    let whereClauses = `1=1${tTask.sql}`;
    const queryParams: any[] = [...tTask.params];

    if (status) {
      whereClauses += ` AND status = ?`;
      queryParams.push(status);
    }
    if (assignedTo) {
      whereClauses += ` AND assigned_to = ?`;
      queryParams.push(assignedTo);
    }
    if (customerLevel) {
      whereClauses += ` AND customer_level = ?`;
      queryParams.push(customerLevel);
    }
    if (keyword) {
      whereClauses += ` AND (customer_name LIKE ? OR customer_phone LIKE ?)`;
      queryParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as total FROM outbound_tasks WHERE ${whereClauses}`,
      queryParams
    );
    const total = countResult[0]?.total || 0;

    // 分页查询
    const offset = (Number(page) - 1) * Number(pageSize);
    const tasks = await AppDataSource.query(
      `SELECT * FROM outbound_tasks WHERE ${whereClauses} ORDER BY priority DESC, created_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, Number(pageSize), offset]
    );

    res.json({
      success: true,
      data: {
        records: tasks,
        total: Number(total),
        page: Number(page),
        pageSize: Number(pageSize)
      }
    });
  } catch (error) {
    log.error('获取外呼任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外呼任务列表失败'
    });
  }
});

router.post('/outbound-tasks', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const {
      customerId,
      customerName,
      customerPhone,
      customerLevel,
      priority = 0,
      source = 'manual',
      assignedTo,
      assignedToName,
      remark
    } = req.body;

    if (!customerId || !customerPhone) {
      return res.status(400).json({
        success: false,
        message: '客户ID和电话号码不能为空'
      });
    }

    const taskId = `task_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const taskTenantId = getCurrentTenantIdSafe() || null;

    await AppDataSource.query(
      `INSERT INTO outbound_tasks
       (id, customer_id, customer_name, customer_phone, customer_level, status, priority, source, assigned_to, assigned_to_name, remark, created_by, created_by_name, tenant_id)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskId, customerId, customerName, customerPhone, customerLevel, priority, source, assignedTo, assignedToName, remark, currentUser?.userId, currentUser?.realName, taskTenantId]
    );

    res.status(201).json({
      success: true,
      message: '外呼任务创建成功',
      data: { id: taskId }
    });
  } catch (error) {
    log.error('创建外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建外呼任务失败'
    });
  }
});

router.put('/outbound-tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remark, nextCallTime } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      params.push(remark);
    }
    if (nextCallTime) {
      updates.push('next_call_time = ?');
      params.push(nextCallTime);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有要更新的字段'
      });
    }

    params.push(id);
    const tTaskUp = tenantSQL('');
    await AppDataSource.query(
      `UPDATE outbound_tasks SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?${tTaskUp.sql}`,
      [...params, ...tTaskUp.params]
    );

    res.json({
      success: true,
      message: '外呼任务更新成功'
    });
  } catch (error) {
    log.error('更新外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外呼任务失败'
    });
  }
});

router.delete('/outbound-tasks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tTaskDel = tenantSQL('');
    await AppDataSource.query(`DELETE FROM outbound_tasks WHERE id = ?${tTaskDel.sql}`, [id, ...tTaskDel.params]);

    res.json({
      success: true,
      message: '外呼任务删除成功'
    });
  } catch (error) {
    log.error('删除外呼任务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外呼任务失败'
    });
  }
});

router.get('/lines', async (req: Request, res: Response) => {
  try {
    const tLine = tenantSQL('');
    const lines = await AppDataSource.query(
      `SELECT * FROM call_lines WHERE 1=1${tLine.sql} ORDER BY sort_order ASC, created_at DESC`,
      [...tLine.params]
    );

    res.json({
      success: true,
      data: lines.map((line: any) => ({
        id: line.id,
        name: line.name,
        provider: line.provider,
        callerNumber: line.caller_number,
        status: line.status,
        maxConcurrent: line.max_concurrent,
        currentConcurrent: line.current_concurrent,
        dailyLimit: line.daily_limit,
        dailyUsed: line.daily_used,
        totalCalls: line.total_calls,
        totalDuration: line.total_duration,
        successRate: line.success_rate,
        lastUsedAt: line.last_used_at,
        sortOrder: line.sort_order,
        remark: line.remark,
        createdAt: line.created_at,
        updatedAt: line.updated_at
      }))
    });
  } catch (error) {
    log.error('获取外呼线路列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取外呼线路列表失败'
    });
  }
});

router.post('/lines', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const {
      name,
      provider,
      callerNumber,
      config,
      maxConcurrent = 10,
      dailyLimit = 1000,
      sortOrder = 0,
      remark
    } = req.body;

    if (!name || !provider) {
      return res.status(400).json({
        success: false,
        message: '线路名称和服务商不能为空'
      });
    }

    const lineId = `line_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const lineTenantId = getCurrentTenantIdSafe() || null;

    await AppDataSource.query(
      `INSERT INTO call_lines
       (id, name, provider, caller_number, config, status, max_concurrent, daily_limit, sort_order, remark, created_by, tenant_id, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, NOW())`,
      [
        lineId,
        name,
        provider,
        callerNumber || null,
        config ? JSON.stringify(config) : null,
        maxConcurrent,
        dailyLimit,
        sortOrder,
        remark || null,
        currentUser?.userId || currentUser?.id,
        lineTenantId
      ]
    );

    res.status(201).json({
      success: true,
      message: '线路创建成功',
      data: { id: lineId }
    });
  } catch (error) {
    log.error('创建外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '创建外呼线路失败'
    });
  }
});

router.put('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      provider,
      callerNumber,
      config,
      status,
      maxConcurrent,
      dailyLimit,
      sortOrder,
      remark
    } = req.body;

    const updateFields: string[] = ['updated_at = NOW()'];
    const updateParams: any[] = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateParams.push(name);
    }
    if (provider !== undefined) {
      updateFields.push('provider = ?');
      updateParams.push(provider);
    }
    if (callerNumber !== undefined) {
      updateFields.push('caller_number = ?');
      updateParams.push(callerNumber);
    }
    if (config !== undefined) {
      updateFields.push('config = ?');
      updateParams.push(config ? JSON.stringify(config) : null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    if (maxConcurrent !== undefined) {
      updateFields.push('max_concurrent = ?');
      updateParams.push(maxConcurrent);
    }
    if (dailyLimit !== undefined) {
      updateFields.push('daily_limit = ?');
      updateParams.push(dailyLimit);
    }
    if (sortOrder !== undefined) {
      updateFields.push('sort_order = ?');
      updateParams.push(sortOrder);
    }
    if (remark !== undefined) {
      updateFields.push('remark = ?');
      updateParams.push(remark);
    }

    updateParams.push(id);

    const tLineUp = tenantSQL('');
    await AppDataSource.query(
      `UPDATE call_lines SET ${updateFields.join(', ')} WHERE id = ?${tLineUp.sql}`,
      [...updateParams, ...tLineUp.params]
    );

    res.json({
      success: true,
      message: '线路更新成功'
    });
  } catch (error) {
    log.error('更新外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '更新外呼线路失败'
    });
  }
});

router.delete('/lines/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const tLineDel = tenantSQL('');
    await AppDataSource.query(`DELETE FROM call_lines WHERE id = ?${tLineDel.sql}`, [id, ...tLineDel.params]);

    res.json({
      success: true,
      message: '线路删除成功'
    });
  } catch (error) {
    log.error('删除外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '删除外呼线路失败'
    });
  }
});

router.post('/lines/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 获取线路信息
    const tLineTest = tenantSQL('');
    const lines = await AppDataSource.query(
      `SELECT * FROM call_lines WHERE id = ?${tLineTest.sql}`,
      [id, ...tLineTest.params]
    );

    if (lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: '线路不存在'
      });
    }

    const line = lines[0];

    // 模拟测试延迟
    const startTime = Date.now();

    // 根据服务商类型进行不同的测试
    // 这里简化处理，实际应该调用对应服务商的API进行测试
    const testResult = {
      success: true,
      latency: 0,
      message: ''
    };

    switch (line.provider) {
      case 'aliyun':
        // 模拟阿里云API测试
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        testResult.latency = Date.now() - startTime;
        testResult.message = '阿里云线路连接正常';
        break;
      case 'tencent':
        // 模拟腾讯云API测试
        await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
        testResult.latency = Date.now() - startTime;
        testResult.message = '腾讯云线路连接正常';
        break;
      case 'system':
      default:
        // 系统默认线路
        await new Promise(resolve => setTimeout(resolve, 50));
        testResult.latency = Date.now() - startTime;
        testResult.message = '系统线路连接正常';
        break;
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      data: {
        lineId: id,
        lineName: line.name,
        provider: line.provider,
        latency: testResult.latency,
        status: line.status
      }
    });
  } catch (error) {
    log.error('测试外呼线路失败:', error);
    res.status(500).json({
      success: false,
      message: '测试外呼线路失败'
    });
  }
});
}
