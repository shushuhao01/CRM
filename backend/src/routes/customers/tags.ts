import { Router, Request, Response } from 'express';
import { CustomerTag } from '../../entities/CustomerTag';
import { Like } from 'typeorm';
import { getTenantRepo } from '../../utils/tenantRepo';
import { log } from '../../config/logger';

export function registerTagRoutes(router: Router) {
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
}
