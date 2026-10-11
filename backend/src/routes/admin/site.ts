/**
 * 管理后台 - 官网管理路由
 * 提供站点设置、文章/公告、案例、帮助文档、导航菜单、访问统计、SEO推送等接口
 * 挂载于 /api/v1/admin/site
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import { getDataSource } from '../../config/database';
import { SiteArticle, SiteCase, SiteDoc, SiteNav, SiteMedia } from '../../entities/SiteEntities';
import { siteService } from '../../services/SiteService';
import { getSiteAnalytics, listSiteVisits, getSiteOnlineCount } from '../../services/SiteAnalyticsService';
import {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelAnalytics,
  listChannelVisits,
  buildShortUrl
} from '../../services/ChannelService';
import { SITE_CONFIG } from '../../config/sites';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 请求前确保官网相关表已创建（幂等，成功后缓存 Promise）。
// 模块加载期 DB 连接可能尚未就绪，故不能只在加载时触发，必须放在请求链路中。
router.use(async (_req: Request, _res: Response, next) => {
  try {
    await siteService.ensureTables();
  } catch {
    // 建表失败不阻断请求，交由后续查询报错并触发下次重试
  }
  next();
});

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
    } as any) as unknown as SiteArticle;

    await repo.save(item);
    if (item.status === 'published') {
      const seg = item.type === 'notice' ? 'notice' : 'blog';
      siteService.pushContentUrl(`/${seg}/${item.slug || item.id}`).catch(() => {});
    }
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
    if (item.status === 'published') {
      const seg = item.type === 'notice' ? 'notice' : 'blog';
      siteService.pushContentUrl(`/${seg}/${item.slug || item.id}`).catch(() => {});
    }
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
    } as any) as unknown as SiteCase;

    await repo.save(item);
    if (item.status === 'published') {
      siteService.pushContentUrl(`/cases/${item.slug || item.id}`).catch(() => {});
    }
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
    if (item.status === 'published') {
      siteService.pushContentUrl(`/cases/${item.slug || item.id}`).catch(() => {});
    }
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

// ==================== 官网数据分析（流量分析） ====================

/** GET /api/v1/admin/site/analytics?days=30&start=&end= —— 多维流量聚合 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const start = String(req.query.start || '').trim();
    const end = String(req.query.end || '').trim();
    const data = await getSiteAnalytics(days, '', start, end);
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取流量分析失败:', error);
    res.status(500).json({ success: false, message: '获取流量分析失败' });
  }
});

/** GET /api/v1/admin/site/online?minutes=5 —— 实时在线访客数 */
router.get('/online', async (req: Request, res: Response) => {
  try {
    const minutes = Math.min(1440, Math.max(1, Number(req.query.minutes) || 5));
    const online = await getSiteOnlineCount(minutes);
    res.json({ success: true, data: { online, minutes } });
  } catch (error: any) {
    log.error('[Admin官网] 获取在线访客失败:', error);
    res.status(500).json({ success: false, message: '获取在线访客失败' });
  }
});

/** GET /api/v1/admin/site/visits?page=&pageSize=&ip=&path=&device=&source=&keyword=&start=&end= */
router.get('/visits', async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePage(req);
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const data = await listSiteVisits({
      page,
      pageSize,
      ip: str(req.query.ip),
      path: str(req.query.path),
      device: str(req.query.device),
      source: str(req.query.source),
      keyword: str(req.query.keyword),
      start: str(req.query.start),
      end: str(req.query.end)
    });
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取访问明细失败:', error);
    res.status(500).json({ success: false, message: '获取访问明细失败' });
  }
});

// ==================== 官网渠道链接（推广短链） ====================

/**
 * 计算短链展示根地址：官网推广短链必须指向官网域名（/c/{code} 仅官网有对应路由）。
 * 优先级：站点配置域名 → 部署配置的官网地址(WEBSITE_URL，默认 https://yunkes.com) → 请求 Host 兜底。
 * 注意：不可回退到 admin 后台的请求 Host，否则短链会落到 admin 子域名而无法跳转与统计。
 */
async function channelBase(req: Request): Promise<string> {
  const settings = await siteService.getSettings();
  const domain = (settings.siteUrl || settings.site_url || settings.site_domain || '').trim();
  if (domain) return domain.replace(/\/+$/, '');
  const official = (SITE_CONFIG.WEBSITE_URL || '').trim().replace(/\/+$/, '');
  if (official) return official;
  const host = String(req.headers.host || '');
  if (!host) return '';
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${host}`;
}

/** GET /api/v1/admin/site/channels —— 渠道列表（含完整短链地址） */
router.get('/channels', async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePage(req);
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const data = await listChannels({ page, pageSize, keyword });
    const base = await channelBase(req);
    const list = data.list.map((r) => ({ ...r, shortUrl: buildShortUrl(r.code, base) }));
    res.json({ success: true, data: { ...data, list } });
  } catch (error: any) {
    log.error('[Admin官网] 获取渠道列表失败:', error);
    res.status(500).json({ success: false, message: '获取渠道列表失败' });
  }
});

/** POST /api/v1/admin/site/channels —— 新建渠道链接 */
router.post('/channels', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const row = await createChannel({
      name: String(b.name || ''),
      code: b.code ? String(b.code) : '',
      channel: b.channel ? String(b.channel) : '',
      targetPath: b.targetPath ? String(b.targetPath) : '/',
      remark: b.remark ? String(b.remark) : null,
      enabled: Number(b.enabled) === 0 ? 0 : 1
    });
    const base = await channelBase(req);
    res.json({ success: true, message: '保存成功', data: { ...row, shortUrl: buildShortUrl(row.code, base) } });
  } catch (error: any) {
    log.error('[Admin官网] 创建渠道链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '创建失败' });
  }
});

/** PUT /api/v1/admin/site/channels/:id —— 更新渠道链接 */
router.put('/channels/:id', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const row = await updateChannel(req.params.id, {
      name: b.name === undefined ? undefined : String(b.name),
      code: b.code === undefined ? undefined : String(b.code),
      channel: b.channel === undefined ? undefined : String(b.channel),
      targetPath: b.targetPath === undefined ? undefined : String(b.targetPath),
      remark: b.remark === undefined ? undefined : (b.remark ? String(b.remark) : null),
      enabled: b.enabled === undefined ? undefined : (Number(b.enabled) === 0 ? 0 : 1)
    });
    const base = await channelBase(req);
    res.json({ success: true, message: '更新成功', data: { ...row, shortUrl: buildShortUrl(row.code, base) } });
  } catch (error: any) {
    log.error('[Admin官网] 更新渠道链接失败:', error);
    res.status(400).json({ success: false, message: error.message || '更新失败' });
  }
});

/** DELETE /api/v1/admin/site/channels/:id —— 删除渠道链接 */
router.delete('/channels/:id', async (req: Request, res: Response) => {
  try {
    const okDel = await deleteChannel(req.params.id);
    if (!okDel) return res.status(404).json({ success: false, message: '渠道链接不存在' });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除渠道链接失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

/** GET /api/v1/admin/site/channels/:code/analytics —— 渠道流量分析 */
router.get('/channels/:code/analytics', async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const start = String(req.query.start || '').trim();
    const end = String(req.query.end || '').trim();
    const data = await getChannelAnalytics(String(req.params.code || ''), days, start, end);
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取渠道分析失败:', error);
    res.status(500).json({ success: false, message: '获取渠道分析失败' });
  }
});

/** GET /api/v1/admin/site/channels/:code/visits —— 渠道访问明细 */
router.get('/channels/:code/visits', async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePage(req);
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    const data = await listChannelVisits(String(req.params.code || ''), {
      page,
      pageSize,
      ip: str(req.query.ip),
      path: str(req.query.path),
      device: str(req.query.device),
      source: str(req.query.source),
      keyword: str(req.query.keyword),
      start: str(req.query.start),
      end: str(req.query.end)
    });
    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Admin官网] 获取渠道访问明细失败:', error);
    res.status(500).json({ success: false, message: '获取渠道访问明细失败' });
  }
});

/** GET /api/v1/admin/site/channels/:code/qrcode —— 渠道二维码（PNG DataURL） */
router.get('/channels/:code/qrcode', async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code || '');
    const base = await channelBase(req);
    const url = buildShortUrl(code, base);
    const dataUrl = await QRCode.toDataURL(url, { width: 320, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ success: true, data: { code, url, dataUrl } });
  } catch (error: any) {
    log.error('[Admin官网] 生成渠道二维码失败:', error);
    res.status(500).json({ success: false, message: error.message || '二维码生成失败' });
  }
});

// ==================== 官网媒体库（富文本素材库） ====================

const siteMediaBaseDir = path.join(process.cwd(), 'uploads', 'site');

const siteMediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(siteMediaBaseDir)) {
      fs.mkdirSync(siteMediaBaseDir, { recursive: true });
    }
    cb(null, siteMediaBaseDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const SITE_MEDIA_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

const siteMediaUpload = multer({
  storage: siteMediaStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (SITE_MEDIA_ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 jpg、png、gif、webp、svg 格式图片'));
    }
  }
});

/** GET /api/v1/admin/site/media?page=&pageSize=&keyword= —— 媒体库列表 */
router.get('/media', async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePage(req);
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
    const repo = getDataSource()!.getRepository(SiteMedia);
    const qb = repo.createQueryBuilder('m');
    if (keyword) {
      qb.where('m.filename LIKE :kw', { kw: `%${keyword}%` });
    }
    qb.orderBy('m.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Admin官网] 获取媒体库失败:', error);
    res.status(500).json({ success: false, message: '获取媒体库失败' });
  }
});

/** POST /api/v1/admin/site/media/upload —— 上传图片到媒体库 */
router.post('/media/upload', siteMediaUpload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: '未接收到文件' });
    }
    const url = `/uploads/site/${file.filename}`;
    const repo = getDataSource()!.getRepository(SiteMedia);
    const entity = repo.create({
      filename: file.originalname,
      path: url,
      size: file.size,
      mime: file.mimetype,
      uploadedBy: (req as any).user?.id || undefined
    });
    const saved = await repo.save(entity);
    res.json({ success: true, data: saved, message: '上传成功' });
  } catch (error: any) {
    log.error('[Admin官网] 媒体上传失败:', error);
    res.status(500).json({ success: false, message: error.message || '上传失败' });
  }
});

/** DELETE /api/v1/admin/site/media/:id —— 删除媒体 */
router.delete('/media/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '');
    const repo = getDataSource()!.getRepository(SiteMedia);
    const item = await repo.findOne({ where: { id } });
    if (!item) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    // 尝试删除物理文件（仅限 uploads/site 目录内）
    try {
      const rel = (item.path || '').replace(/^\/uploads\//, '');
      const abs = path.join(process.cwd(), 'uploads', rel);
      if (abs.startsWith(siteMediaBaseDir) && fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
    } catch (e: any) {
      log.warn('[Admin官网] 删除媒体物理文件失败:', e.message);
    }
    await repo.delete({ id });
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Admin官网] 删除媒体失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

export default router;
