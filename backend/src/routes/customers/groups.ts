import { Router, Request, Response } from 'express';
import { CustomerGroup } from '../../entities/CustomerGroup';
import { Like } from 'typeorm';
import { getTenantRepo } from '../../utils/tenantRepo';
import { log } from '../../config/logger';

export function registerGroupRoutes(router: Router) {
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
}
