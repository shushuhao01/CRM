/**
 * 官网公开API路由
 * 供官网前端获取文章/公告/案例/文档/导航/站点SEO设置，以及上报访问
 * 挂载于 /api/v1/public/site
 */
import { Router, Request, Response } from 'express';
import { getDataSource } from '../../config/database';
import { SiteArticle, SiteCase, SiteDoc, SiteNav } from '../../entities/SiteEntities';
import { siteService } from '../../services/SiteService';
import { recordVisit, touchOnline } from '../../services/SiteAnalyticsService';
import { resolveChannel } from '../../services/ChannelService';
import { SITE_CONFIG } from '../../config/sites';
import { log } from '../../config/logger';

const router = Router();

// 首次加载懒触发自动建表
siteService.ensureTables().catch(() => {});

/** 只返回已发布内容 */
const PUBLISHED = 'published';

/** 提取客户端 IP（优先反向代理头） */
function clientIp(req: Request): string {
  const xff = (req.headers['x-forwarded-for'] as string) || '';
  return xff.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
}

/** GET /api/v1/public/site/settings —— 获取站点SEO/基本信息设置 */
router.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await siteService.getSettings();
    res.json({
      success: true,
      data: {
        ...settings,
        websiteUrl: SITE_CONFIG.WEBSITE_URL,
        crmUrl: SITE_CONFIG.CRM_URL
      }
    });
  } catch (error: any) {
    log.error('[Public官网] 获取站点设置失败:', error);
    res.json({ success: true, data: {} });
  }
});

// ==================== 文章 ====================

/** GET /api/v1/public/site/articles?category=&keyword=&page=&pageSize= */
router.get('/articles', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 12 } });

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));
    const { category, keyword } = req.query;

    const qb = dataSource.getRepository(SiteArticle).createQueryBuilder('a')
      .where('a.type = :type', { type: 'article' })
      .andWhere('a.status = :status', { status: PUBLISHED })
      .orderBy('a.is_top', 'DESC')
      .addOrderBy('a.published_at', 'DESC');

    if (category) qb.andWhere('a.category = :category', { category });
    if (keyword) qb.andWhere('a.title LIKE :kw', { kw: `%${keyword}%` });

    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    // 列表不返回完整正文，减小体积
    const list = rows.map(r => ({
      id: r.id, title: r.title, slug: r.slug, category: r.category, cover: r.cover,
      summary: r.summary, tags: r.tags, author: r.author, viewCount: r.viewCount,
      isTop: r.isTop, publishedAt: r.publishedAt, updatedAt: r.updatedAt
    }));

    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Public官网] 获取文章列表失败:', error);
    res.status(500).json({ success: false, message: '获取文章列表失败' });
  }
});

/** GET /api/v1/public/site/articles/:slugOrId */
router.get('/articles/:slugOrId', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const key = req.params.slugOrId;
    const repo = dataSource.getRepository(SiteArticle);
    const item = await repo.findOne({
      where: [{ slug: key, type: 'article', status: PUBLISHED } as any, { id: key, type: 'article', status: PUBLISHED } as any]
    });
    if (!item) return res.status(404).json({ success: false, message: '文章不存在' });

    // 浏览量 +1（失败不影响返回）
    repo.increment({ id: item.id }, 'viewCount', 1).catch(() => {});

    // 上一篇/下一篇
    const neighbors = await repo.createQueryBuilder('a')
      .where('a.type = :type AND a.status = :status', { type: 'article', status: PUBLISHED })
      .orderBy('a.published_at', 'ASC')
      .select(['a.id', 'a.title', 'a.slug'])
      .getMany();
    const idx = neighbors.findIndex(n => n.id === item.id);
    const prev = idx > 0 ? neighbors[idx - 1] : null;
    const next = idx >= 0 && idx < neighbors.length - 1 ? neighbors[idx + 1] : null;

    res.json({ success: true, data: { ...item, prev, next } });
  } catch (error: any) {
    log.error('[Public官网] 获取文章详情失败:', error);
    res.status(500).json({ success: false, message: '获取文章详情失败' });
  }
});

// ==================== 公告 ====================

/** GET /api/v1/public/site/notices */
router.get('/notices', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 12 } });

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));

    const qb = dataSource.getRepository(SiteArticle).createQueryBuilder('a')
      .where('a.type = :type', { type: 'notice' })
      .andWhere('a.status = :status', { status: PUBLISHED })
      .orderBy('a.is_top', 'DESC')
      .addOrderBy('a.published_at', 'DESC');

    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const list = rows.map(r => ({
      id: r.id, title: r.title, slug: r.slug, summary: r.summary, isTop: r.isTop,
      publishedAt: r.publishedAt, updatedAt: r.updatedAt
    }));
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Public官网] 获取公告列表失败:', error);
    res.status(500).json({ success: false, message: '获取公告列表失败' });
  }
});

/** GET /api/v1/public/site/notices/:slugOrId */
router.get('/notices/:slugOrId', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const key = req.params.slugOrId;
    const repo = dataSource.getRepository(SiteArticle);
    const item = await repo.findOne({
      where: [{ slug: key, type: 'notice', status: PUBLISHED } as any, { id: key, type: 'notice', status: PUBLISHED } as any]
    });
    if (!item) return res.status(404).json({ success: false, message: '公告不存在' });
    repo.increment({ id: item.id }, 'viewCount', 1).catch(() => {});
    res.json({ success: true, data: item });
  } catch (error: any) {
    log.error('[Public官网] 获取公告详情失败:', error);
    res.status(500).json({ success: false, message: '获取公告详情失败' });
  }
});

// ==================== 案例 ====================

/** GET /api/v1/public/site/cases */
router.get('/cases', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: { list: [], total: 0, page: 1, pageSize: 12 } });

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 12));
    const { industry } = req.query;

    const qb = dataSource.getRepository(SiteCase).createQueryBuilder('c')
      .where('c.status = :status', { status: PUBLISHED })
      .orderBy('c.is_top', 'DESC')
      .addOrderBy('c.published_at', 'DESC');
    if (industry) qb.andWhere('c.industry = :industry', { industry });

    const [rows, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();
    const list = rows.map(r => ({
      id: r.id, title: r.title, slug: r.slug, clientName: r.clientName, industry: r.industry,
      cover: r.cover, summary: r.summary, tags: r.tags, viewCount: r.viewCount,
      isTop: r.isTop, publishedAt: r.publishedAt
    }));
    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[Public官网] 获取案例列表失败:', error);
    res.status(500).json({ success: false, message: '获取案例列表失败' });
  }
});

/** GET /api/v1/public/site/cases/:slugOrId */
router.get('/cases/:slugOrId', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const key = req.params.slugOrId;
    const repo = dataSource.getRepository(SiteCase);
    const item = await repo.findOne({
      where: [{ slug: key, status: PUBLISHED } as any, { id: key, status: PUBLISHED } as any]
    });
    if (!item) return res.status(404).json({ success: false, message: '案例不存在' });
    repo.increment({ id: item.id }, 'viewCount', 1).catch(() => {});
    res.json({ success: true, data: item });
  } catch (error: any) {
    log.error('[Public官网] 获取案例详情失败:', error);
    res.status(500).json({ success: false, message: '获取案例详情失败' });
  }
});

// ==================== 帮助文档 ====================

/** GET /api/v1/public/site/docs?category= */
router.get('/docs', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: [] });

    const { category } = req.query;
    const qb = dataSource.getRepository(SiteDoc).createQueryBuilder('d')
      .where('d.status = :status', { status: PUBLISHED })
      .orderBy('d.sort', 'ASC')
      .addOrderBy('d.created_at', 'ASC');
    if (category) qb.andWhere('d.category = :category', { category });

    const rows = await qb.getMany();
    const list = rows.map(r => ({
      id: r.id, title: r.title, slug: r.slug, category: r.category, parentId: r.parentId,
      summary: r.summary, sort: r.sort, viewCount: r.viewCount, updatedAt: r.updatedAt
    }));
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Public官网] 获取文档列表失败:', error);
    res.status(500).json({ success: false, message: '获取文档列表失败' });
  }
});

/** GET /api/v1/public/site/docs/:slugOrId */
router.get('/docs/:slugOrId', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.status(500).json({ success: false, message: '数据库未连接' });
    const key = req.params.slugOrId;
    const repo = dataSource.getRepository(SiteDoc);
    const item = await repo.findOne({
      where: [{ slug: key, status: PUBLISHED } as any, { id: key, status: PUBLISHED } as any]
    });
    if (!item) return res.status(404).json({ success: false, message: '文档不存在' });
    repo.increment({ id: item.id }, 'viewCount', 1).catch(() => {});

    // 同分类的其他文档，用于侧边导航
    const siblings = item.category
      ? await repo.find({ where: { category: item.category, status: PUBLISHED }, order: { sort: 'ASC' } })
      : [];

    res.json({
      success: true,
      data: {
        ...item,
        siblings: siblings.map(s => ({ id: s.id, title: s.title, slug: s.slug, category: s.category }))
      }
    });
  } catch (error: any) {
    log.error('[Public官网] 获取文档详情失败:', error);
    res.status(500).json({ success: false, message: '获取文档详情失败' });
  }
});

// ==================== 导航菜单 ====================

/** GET /api/v1/public/site/nav?group=header|footer */
router.get('/nav', async (req: Request, res: Response) => {
  try {
    const dataSource = getDataSource();
    if (!dataSource) return res.json({ success: true, data: [] });
    const { group } = req.query;
    const qb = dataSource.getRepository(SiteNav).createQueryBuilder('n')
      .where('n.is_visible = 1')
      .orderBy('n.sort', 'ASC')
      .addOrderBy('n.created_at', 'ASC');
    if (group) qb.andWhere('n.group_name = :group', { group });
    const list = await qb.getMany();
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Public官网] 获取导航失败:', error);
    res.json({ success: true, data: [] });
  }
});

// ==================== 渠道短链 ====================

/** GET /api/v1/public/site/channel/resolve/:code —— 短链解析：命中启用渠道则记录点击并返回跳转目标 */
router.get('/channel/resolve/:code', async (req: Request, res: Response) => {
  try {
    const result = await resolveChannel(
      String(req.params.code || ''),
      clientIp(req),
      String(req.headers['user-agent'] || ''),
      String(req.headers.referer || '')
    );
    if (!result) return res.status(404).json({ success: false, message: '渠道不存在或已停用' });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Public官网] 渠道解析失败:', error);
    res.status(500).json({ success: false, message: '渠道解析失败' });
  }
});

// ==================== 访问上报 ====================

/**
 * POST /api/v1/public/site/track
 * body: { type?: 'pv'|'hb'|'uv'|'download'|'buy'|'trial', path?, referer?, visitorId?, channelCode? }
 * - pv：写访问明细 + PV（当日首访累加 UV）+ 刷新在线
 * - hb：仅刷新实时在线（不计 PV/UV）
 * - download / buy / trial：累加对应点击（带渠道码时同时累加渠道维度）
 */
router.post('/track', async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    const type = String(b.type || '');
    const channelCode = String(b.channelCode || '');
    const ip = clientIp(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const visitorId = String(b.visitorId || '');

    if (type === 'pv') {
      try {
        await recordVisit({
          ip,
          ua,
          referer: String(req.headers.referer || b.referer || ''),
          path: String(b.path || '/'),
          visitorId,
          host: String(req.headers.host || ''),
          channelCode
        });
      } catch (e: any) {
        log.warn('[Public官网] 记录访问失败:', e.message);
      }
      try {
        await touchOnline(visitorId, ip);
      } catch {
        // 在线统计失败不影响前台
      }
      return res.json({ success: true });
    }

    if (type === 'hb') {
      try {
        await touchOnline(visitorId, ip);
      } catch {
        // 在线统计失败不影响前台
      }
      return res.json({ success: true });
    }

    const map: Record<string, 'uv' | 'downloads' | 'buyClicks' | 'trialClicks'> = {
      uv: 'uv',
      download: 'downloads',
      buy: 'buyClicks',
      trial: 'trialClicks'
    };
    const field = map[type];
    if (field) {
      try {
        await siteService.bumpStat(field, 1);
        const channelField = type === 'download' ? 'downloads' : type === 'buy' ? 'buyClicks' : type === 'trial' ? 'trialClicks' : null;
        if (channelCode && channelField) {
          await siteService.bumpChannelStat(channelCode, channelField, 1);
        }
      } catch {
        // 统计失败不影响前台
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    // 埋点失败不影响前端
    res.json({ success: true });
  }
});

export default router;
