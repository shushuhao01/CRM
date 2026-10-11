/**
 * 管理后台 - 官网管理路由
 * 提供站点设置、文章/公告、案例、帮助文档、导航菜单、访问统计、SEO推送等接口
 * 挂载于 /api/v1/admin/site
 */
import { Router, Request, Response } from 'express';
import { getDataSource } from '../../config/database';
import { SiteArticle, SiteCase, SiteDoc, SiteNav } from '../../entities/SiteEntities';
import { siteService } from '../../services/SiteService';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 首次加载时懒触发自动建表（失败仅告警，不阻塞启动）
siteService.ensureTables().catch(() => {});

/** 公共：解析分页参数 */
function parsePage(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

/** 公共：发布时间处理 */
function normalizeDate(v: any): Date | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

// ==================== 站点设置 ====================

/** GET /api/v1/admin/site/settings */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const data = await siteService.getSettings();
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取站点设置失败:', error);
    res.status(500).json({ success: false, message: '获取站点设置失败: ' + (error.message || '') });
  }
});

/** PUT /api/v1/admin/site/settings */
router.put('/settings', async (req: Request, res: Response) => {
  try {
    const values = req.body || {};
    if (typeof values !== 'object' || Array.isArray(values)) {
      return res.status(400).json({ success: false, message: '参数格式错误' });
    }
    await siteService.saveSettings(values);
    const data = await siteService.getSettings();
    res.json({ success: true, message: '站点设置保存成功', data });
  } catch (error: any) {
    log.error('[Admin官网] 保存站点设置失败:', error);
    res.status(500).json({ success: false, message: '保存站点设置失败: ' + (error.message || '') });
  }
});

// ==================== 文章 / 公告（site_articles） ====================

/** GET /api/v1/admin/site/articles?type=article|notice */
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });

    const { page, pageSize, skip } = parsePage(req);
    const { type, status, keyword, category } = req.query;

    const qb = dataSource.getRepository(SiteArticle).createQueryBuilder('a')
      .orderBy('a.is_top', 'DESC')
      .addOrderBy('a.sort', 'DESC')
      .addOrderBy('a.created_at', 'DESC');

    if (type) qb.andWhere('a.type = :type', { type });
    if (status) qb.andWhere('a.status = :status', { status });
    if (category) qb.andWhere('a.category = :category', { category });
    if (keyword) qb.andWhere('a.title LIKE :kw', { kw: `%${keyword}%` });

    const [list, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Admin官网] 获取文章列表失败:', error);
    res.status(500).json({ success: false, message: '获取文章列表失败' });
  }
});

/** GET /api/v1/admin/site/articles/:id */
router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const item = await dataSource.getRepository(SiteArticle).findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '内容不存在' });
    res.json({ success: true, data: item });
  } catch (error: any) {
    log.error('[Admin官网] 获取文章详情失败:', error);
    res.status(500).json({ success: false, message: '获取文章详情失败' });
  }
});

/** POST /api/v1/admin/site/articles */
router.post('/articles', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });

    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, message: '标题不能为空' });

    const currentAdmin = (req as any).adminUser;
    const repo = dataSource.getRepository(SiteArticle);
    const item = repo.create({
      id: uuidv4(),
      type: b.type === 'notice' ? 'notice' : 'article',
      title: b.title,
      slug: b.slug || null,
      category: b.category || null,
      cover: b.cover || null,
      summary: b.summary || null,
      content: b.content || null,
      tags: b.tags || null,
      author: b.author || null,
      source: b.source || null,
      status: b.status === 'published' ? 'published' : 'draft',
      isTop: b.isTop ? 1 : 0,
      isRecommend: b.isRecommend ? 1 : 0,
      viewCount: 0,
      sort: Number(b.sort) || 0,
      seoTitle: b.seoTitle || null,
      seoKeywords: b.seoKeywords || null,
      seoDescription: b.seoDescription || null,
      publishedAt: b.status === 'published' ? (normalizeDate(b.publishedAt) || new Date()) : normalizeDate(b.publishedAt),
      createdBy: currentAdmin?.id || null
    } as any);

    await repo.save(item);
    res.json({ success: true, message: '保存成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 创建文章失败:', error);
    res.status(500).json({ success: false, message: '创建失败: ' + (error.message || '') });
  }
});

/** PUT /api/v1/admin/site/articles/:id */
router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const repo = dataSource.getRepository(SiteArticle);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '内容不存在' });

    const b = req.body || {};
    const fields: any[] = ['title', 'slug', 'category', 'cover', 'summary', 'content', 'tags', 'author', 'source', 'status', 'seoTitle', 'seoKeywords', 'seoDescription'];
    for (const f of fields) {
      if (b[f] !== undefined) (item as any)[f] = b[f];
    }
    if (b.type !== undefined) item.type = b.type === 'notice' ? 'notice' : 'article';
    if (b.isTop !== undefined) item.isTop = b.isTop ? 1 : 0;
    if (b.isRecommend !== undefined) item.isRecommend = b.isRecommend ? 1 : 0;
    if (b.sort !== undefined) item.sort = Number(b.sort) || 0;
    if (b.publishedAt !== undefined) item.publishedAt = normalizeDate(b.publishedAt);
    if (item.status === 'published' && !item.publishedAt) item.publishedAt = new Date();

    await repo.save(item);
    res.json({ success: true, message: '更新成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 更新文章失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + (error.message || '') });
  }
});

/** DELETE /api/v1/admin/site/articles/:id */
router.delete('/articles/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const result = await dataSource.getRepository(SiteArticle).delete({ id: req.params.id });
    if (!result.affected) return res.status(404).json({ success: false, message: '内容不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除文章失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 案例（site_cases） ====================

/** GET /api/v1/admin/site/cases */
router.get('/cases', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });

    const { page, pageSize, skip } = parsePage(req);
    const { status, keyword, industry } = req.query;

    const qb = dataSource.getRepository(SiteCase).createQueryBuilder('c')
      .orderBy('c.is_top', 'DESC')
      .addOrderBy('c.sort', 'DESC')
      .addOrderBy('c.created_at', 'DESC');

    if (status) qb.andWhere('c.status = :status', { status });
    if (industry) qb.andWhere('c.industry = :industry', { industry });
    if (keyword) qb.andWhere('c.title LIKE :kw', { kw: `%${keyword}%` });

    const [list, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Admin官网] 获取案例列表失败:', error);
    res.status(500).json({ success: false, message: '获取案例列表失败' });
  }
});

/** GET /api/v1/admin/site/cases/:id */
router.get('/cases/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const item = await dataSource.getRepository(SiteCase).findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '案例不存在' });
    res.json({ success: true, data: item });
  } catch (error: any) {
    log.error('[Admin官网] 获取案例详情失败:', error);
    res.status(500).json({ success: false, message: '获取案例详情失败' });
  }
});

/** POST /api/v1/admin/site/cases */
router.post('/cases', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, message: '标题不能为空' });

    const currentAdmin = (req as any).adminUser;
    const repo = dataSource.getRepository(SiteCase);
    const item = repo.create({
      id: uuidv4(),
      title: b.title,
      slug: b.slug || null,
      clientName: b.clientName || null,
      industry: b.industry || null,
      cover: b.cover || null,
      summary: b.summary || null,
      content: b.content || null,
      tags: b.tags || null,
      status: b.status === 'published' ? 'published' : 'draft',
      isTop: b.isTop ? 1 : 0,
      isRecommend: b.isRecommend ? 1 : 0,
      viewCount: 0,
      sort: Number(b.sort) || 0,
      seoTitle: b.seoTitle || null,
      seoKeywords: b.seoKeywords || null,
      seoDescription: b.seoDescription || null,
      publishedAt: b.status === 'published' ? (normalizeDate(b.publishedAt) || new Date()) : normalizeDate(b.publishedAt),
      createdBy: currentAdmin?.id || null
    } as any);

    await repo.save(item);
    res.json({ success: true, message: '保存成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 创建案例失败:', error);
    res.status(500).json({ success: false, message: '创建失败: ' + (error.message || '') });
  }
});

/** PUT /api/v1/admin/site/cases/:id */
router.put('/cases/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const repo = dataSource.getRepository(SiteCase);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '案例不存在' });

    const b = req.body || {};
    const fields: any[] = ['title', 'slug', 'clientName', 'industry', 'cover', 'summary', 'content', 'tags', 'status', 'seoTitle', 'seoKeywords', 'seoDescription'];
    for (const f of fields) {
      if (b[f] !== undefined) (item as any)[f] = b[f];
    }
    if (b.isTop !== undefined) item.isTop = b.isTop ? 1 : 0;
    if (b.isRecommend !== undefined) item.isRecommend = b.isRecommend ? 1 : 0;
    if (b.sort !== undefined) item.sort = Number(b.sort) || 0;
    if (b.publishedAt !== undefined) item.publishedAt = normalizeDate(b.publishedAt);
    if (item.status === 'published' && !item.publishedAt) item.publishedAt = new Date();

    await repo.save(item);
    res.json({ success: true, message: '更新成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 更新案例失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + (error.message || '') });
  }
});

/** DELETE /api/v1/admin/site/cases/:id */
router.delete('/cases/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const result = await dataSource.getRepository(SiteCase).delete({ id: req.params.id });
    if (!result.affected) return res.status(404).json({ success: false, message: '案例不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除案例失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 帮助文档（site_docs） ====================

/** GET /api/v1/admin/site/docs */
router.get('/docs', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 20 } });

    const { page, pageSize, skip } = parsePage(req);
    const { status, keyword, category } = req.query;

    const qb = dataSource.getRepository(SiteDoc).createQueryBuilder('d')
      .orderBy('d.sort', 'DESC')
      .addOrderBy('d.created_at', 'DESC');

    if (status) qb.andWhere('d.status = :status', { status });
    if (category) qb.andWhere('d.category = :category', { category });
    if (keyword) qb.andWhere('d.title LIKE :kw', { kw: `%${keyword}%` });

    const [list, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Admin官网] 获取文档列表失败:', error);
    res.status(500).json({ success: false, message: '获取文档列表失败' });
  }
});

/** GET /api/v1/admin/site/docs/:id */
router.get('/docs/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const item = await dataSource.getRepository(SiteDoc).findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '文档不存在' });
    res.json({ success: true, data: item });
  } catch (error: any) {
    log.error('[Admin官网] 获取文档详情失败:', error);
    res.status(500).json({ success: false, message: '获取文档详情失败' });
  }
});

/** POST /api/v1/admin/site/docs */
router.post('/docs', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ success: false, message: '标题不能为空' });

    const currentAdmin = (req as any).adminUser;
    const repo = dataSource.getRepository(SiteDoc);
    const item = repo.create({
      id: uuidv4(),
      title: b.title,
      slug: b.slug || null,
      category: b.category || null,
      parentId: b.parentId || null,
      summary: b.summary || null,
      content: b.content || null,
      sort: Number(b.sort) || 0,
      status: b.status === 'published' ? 'published' : 'draft',
      viewCount: 0,
      seoTitle: b.seoTitle || null,
      seoKeywords: b.seoKeywords || null,
      seoDescription: b.seoDescription || null,
      publishedAt: b.status === 'published' ? (normalizeDate(b.publishedAt) || new Date()) : normalizeDate(b.publishedAt),
      createdBy: currentAdmin?.id || null
    } as any);

    await repo.save(item);
    res.json({ success: true, message: '保存成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 创建文档失败:', error);
    res.status(500).json({ success: false, message: '创建失败: ' + (error.message || '') });
  }
});

/** PUT /api/v1/admin/site/docs/:id */
router.put('/docs/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const repo = dataSource.getRepository(SiteDoc);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '文档不存在' });

    const b = req.body || {};
    const fields: any[] = ['title', 'slug', 'category', 'parentId', 'summary', 'content', 'status', 'seoTitle', 'seoKeywords', 'seoDescription'];
    for (const f of fields) {
      if (b[f] !== undefined) (item as any)[f] = b[f];
    }
    if (b.sort !== undefined) item.sort = Number(b.sort) || 0;
    if (b.publishedAt !== undefined) item.publishedAt = normalizeDate(b.publishedAt);
    if (item.status === 'published' && !item.publishedAt) item.publishedAt = new Date();

    await repo.save(item);
    res.json({ success: true, message: '更新成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 更新文档失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + (error.message || '') });
  }
});

/** DELETE /api/v1/admin/site/docs/:id */
router.delete('/docs/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const result = await dataSource.getRepository(SiteDoc).delete({ id: req.params.id });
    if (!result.affected) return res.status(404).json({ success: false, message: '文档不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除文档失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 导航菜单（site_navs） ====================

/** GET /api/v1/admin/site/nav */
router.get('/nav', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: [] });
    const { group } = req.query;
    const qb = dataSource.getRepository(SiteNav).createQueryBuilder('n')
      .orderBy('n.sort', 'ASC')
      .addOrderBy('n.created_at', 'ASC');
    if (group) qb.andWhere('n.group_name = :group', { group });
    const list = await qb.getMany();
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Admin官网] 获取导航失败:', error);
    res.status(500).json({ success: false, message: '获取导航失败' });
  }
});

/** POST /api/v1/admin/site/nav */
router.post('/nav', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ success: false, message: '菜单名称不能为空' });

    const repo = dataSource.getRepository(SiteNav);
    const item = repo.create({
      id: uuidv4(),
      parentId: b.parentId || null,
      name: b.name,
      url: b.url || null,
      icon: b.icon || null,
      target: b.target === '_blank' ? '_blank' : '_self',
      groupName: b.groupName === 'footer' ? 'footer' : 'header',
      sort: Number(b.sort) || 0,
      isVisible: b.isVisible === false ? 0 : 1,
      isExternal: b.isExternal ? 1 : 0
    } as any);

    await repo.save(item);
    res.json({ success: true, message: '保存成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 创建导航失败:', error);
    res.status(500).json({ success: false, message: '创建失败: ' + (error.message || '') });
  }
});

/** PUT /api/v1/admin/site/nav/:id */
router.put('/nav/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const repo = dataSource.getRepository(SiteNav);
    const item = await repo.findOne({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ success: false, message: '菜单不存在' });

    const b = req.body || {};
    const fields: any[] = ['parentId', 'name', 'url', 'icon'];
    for (const f of fields) {
      if (b[f] !== undefined) (item as any)[f] = b[f];
    }
    if (b.target !== undefined) item.target = b.target === '_blank' ? '_blank' : '_self';
    if (b.groupName !== undefined) item.groupName = b.groupName === 'footer' ? 'footer' : 'header';
    if (b.sort !== undefined) item.sort = Number(b.sort) || 0;
    if (b.isVisible !== undefined) item.isVisible = b.isVisible ? 1 : 0;
    if (b.isExternal !== undefined) item.isExternal = b.isExternal ? 1 : 0;

    await repo.save(item);
    res.json({ success: true, message: '更新成功', data: item });
  } catch (error: any) {
    log.error('[Admin官网] 更新导航失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + (error.message || '') });
  }
});

/** DELETE /api/v1/admin/site/nav/:id */
router.delete('/nav/:id', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const result = await dataSource.getRepository(SiteNav).delete({ id: req.params.id });
    if (!result.affected) return res.status(404).json({ success: false, message: '菜单不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除导航失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 访问统计 ====================

/** GET /api/v1/admin/site/stats/overview */
router.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const data = await siteService.getStatsOverview();
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取统计概览失败:', error);
    res.status(500).json({ success: false, message: '获取统计概览失败' });
  }
});

/** GET /api/v1/admin/site/stats/visits */
router.get('/stats/visits', async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePage(req);
    const result = await siteService.getVisitList({
      page, pageSize,
      path: req.query.path as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string
    });
    res.json({ success: true, data: { list: result.list, total: result.total, page, pageSize } });
  } catch (error: any) {
    log.error('[Admin官网] 获取访问列表失败:', error);
    res.status(500).json({ success: false, message: '获取访问列表失败' });
  }
});

/** GET /api/v1/admin/site/stats/analytics */
router.get('/stats/analytics', async (_req: Request, res: Response) => {
  try {
    const data = await siteService.getAnalytics();
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取渠道分析失败:', error);
    res.status(500).json({ success: false, message: '获取渠道分析失败' });
  }
});

/** DELETE /api/v1/admin/site/stats/clear?days=90 —— 清理过期访问日志 */
router.delete('/stats/clear', async (req: Request, res: Response) => {
  try {
    const days = Math.max(1, Number(req.query.days) || 90);
    await siteService.ensureTables();
    await getDataSource()!.query(
      `DELETE FROM site_visit_log WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [days]
    );
    res.json({ success: true, message: `已清理 ${days} 天前的访问日志` });
  } catch (error: any) {
    log.error('[Admin官网] 清理访问日志失败:', error);
    res.status(500).json({ success: false, message: '清理失败' });
  }
});

// ==================== SEO 主动推送 ====================

/** POST /api/v1/admin/site/seo-push  body: { urls?: string[], engine?: 'baidu'|'indexnow'|'all' } */
router.post('/seo-push', async (req: Request, res: Response) => {
  try {
    const { urls, engine = 'all' } = req.body || {};
    let targetUrls: string[] = Array.isArray(urls) ? urls.filter(Boolean) : [];
    if (targetUrls.length === 0) {
      // 未指定则推送首页与主要栏目
      targetUrls = ['/', '/features', '/pricing', '/solutions', '/blog', '/cases', '/notice', '/docs'];
    }

    const results: any = {};
    if (engine === 'baidu' || engine === 'all') {
      results.baidu = await siteService.pushToBaidu(targetUrls);
    }
    if (engine === 'indexnow' || engine === 'all') {
      results.indexnow = await siteService.pushToIndexNow(targetUrls);
    }
    res.json({ success: true, data: results, message: '推送完成' });
  } catch (error: any) {
    log.error('[Admin官网] SEO推送失败:', error);
    res.status(500).json({ success: false, message: '推送失败: ' + (error.message || '') });
  }
});

export default router;
