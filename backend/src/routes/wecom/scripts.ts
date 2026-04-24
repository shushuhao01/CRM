/**
 * 快捷话术路由
 * 支持分组CRUD、话术CRUD、排序、搜索、导入导出
 * 租户隔离 + 公共/个人话术 scope
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, authenticateSidebarToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomScript } from '../../entities/WecomScript';
import { WecomScriptCategory } from '../../entities/WecomScriptCategory';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Auto-create/migrate table columns on first load
let tableMigrated = false;
const ensureScriptTables = async () => {
  if (tableMigrated) return;
  tableMigrated = true;
  try {
    const qr = AppDataSource.createQueryRunner();
    // Add missing columns to wecom_scripts
    const scriptCols: [string, string][] = [
      ['scope', "VARCHAR(20) DEFAULT 'public'"],
      ['created_by', 'VARCHAR(100) NULL'],
      ['created_by_name', 'VARCHAR(100) NULL'],
      ['color', 'VARCHAR(100) NULL'],
      ['sort_order', 'INT DEFAULT 0'],
      ['use_count', 'INT DEFAULT 0'],
      ['ai_rewrite_enabled', 'TINYINT(1) DEFAULT 0'],
      ['is_enabled', 'TINYINT(1) DEFAULT 1'],
      ['attachments', 'TEXT NULL'],
      ['tags', 'TEXT NULL'],
      ['shortcut', 'VARCHAR(50) NULL'],
    ];
    for (const [col, colType] of scriptCols) {
      try {
        await qr.query(`SELECT \`${col}\` FROM wecom_scripts LIMIT 1`);
      } catch {
        try {
          await qr.query(`ALTER TABLE wecom_scripts ADD COLUMN \`${col}\` ${colType}`);
          log.info(`[Scripts] Added column ${col} to wecom_scripts`);
        } catch (e2: any) { log.warn(`[Scripts] Failed to add ${col}:`, e2.message); }
      }
    }
    // Add missing columns to wecom_script_categories
    const catCols: [string, string][] = [
      ['color', 'VARCHAR(100) NULL'],
      ['scope', "VARCHAR(20) DEFAULT 'public'"],
      ['created_by', 'VARCHAR(100) NULL'],
      ['sort_order', 'INT DEFAULT 0'],
    ];
    for (const [col, colType] of catCols) {
      try {
        await qr.query(`SELECT \`${col}\` FROM wecom_script_categories LIMIT 1`);
      } catch {
        try {
          await qr.query(`ALTER TABLE wecom_script_categories ADD COLUMN \`${col}\` ${colType}`);
          log.info(`[Scripts] Added column ${col} to wecom_script_categories`);
        } catch (e2: any) { log.warn(`[Scripts] Failed to add ${col}:`, e2.message); }
      }
    }
    await qr.release();
  } catch (e) {
    log.warn('[Scripts] Migration check error:', e);
    tableMigrated = false; // 允许重试
  }
};

// 附件上传配置
const scriptUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'scripts');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `script_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ==================== 分组 CRUD ====================

// 获取所有分组（含话术数量）
router.get('/scripts/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureScriptTables();
    const tenantId = getCurrentTenantId(req);
    const userId = (req as any).currentUser?.id || (req as any).user?.userId;
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const scriptRepo = AppDataSource.getRepository(WecomScript);

    let categories: any[];
    try {
      categories = await catRepo.find({
        where: [
          { tenantId, scope: 'public' },
          { tenantId, scope: 'personal', createdBy: userId }
        ],
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      });
    } catch {
      // Fallback if scope column doesn't exist yet
      categories = await catRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
    }

    const result = await Promise.all(categories.map(async (cat) => {
      const count = await scriptRepo.count({
        where: { categoryId: cat.id, tenantId, isEnabled: true }
      });
      return { ...cat, scriptCount: count };
    }));

    res.json({ success: true, data: result });
  } catch (e: any) {
    log.error('[Scripts] Get categories error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// 创建分组
router.post('/scripts/categories', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureScriptTables();
    const tenantId = getCurrentTenantId(req);
    const userId = (req as any).currentUser?.id || (req as any).user?.userId;
    const { name, color, scope, sortOrder } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '分组名称必填' });

    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const cat = catRepo.create({
      tenantId, name, color: color || null,
      scope: scope || 'public', createdBy: userId,
      sortOrder: sortOrder || 0
    });
    await catRepo.save(cat);
    res.json({ success: true, data: cat });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 更新分组
router.put('/scripts/categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const cat = await catRepo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!cat) return res.status(404).json({ success: false, message: '分组不存在' });
    Object.assign(cat, req.body);
    await catRepo.save(cat);
    res.json({ success: true, data: cat });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 删除分组（同时删除组内话术）
router.delete('/scripts/categories/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    await scriptRepo.delete({ categoryId: Number(req.params.id), tenantId });
    await catRepo.delete({ id: Number(req.params.id), tenantId });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 分组排序
router.put('/scripts/categories-sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const { items } = req.body; // [{id, sortOrder}]
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    for (const item of items || []) {
      await catRepo.update({ id: item.id, tenantId }, { sortOrder: item.sortOrder });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 分组排序（简化接口：按ids数组顺序）
router.put('/scripts/categories/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true });
    }
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    for (let i = 0; i < ids.length; i++) {
      const id = Number(ids[i]);
      if (!Number.isFinite(id) || id <= 0) continue;
      const where: any = { id: Math.floor(id) };
      if (tenantId) where.tenantId = tenantId;
      await catRepo.update(where, { sortOrder: i });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 话术排序（按ids数组顺序）
router.put('/scripts/sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const { ids } = req.body;
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    for (let i = 0; i < (ids || []).length; i++) {
      await scriptRepo.update({ id: ids[i], tenantId }, { sortOrder: i });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ==================== 话术 CRUD ====================

// 获取话术列表（支持搜索、分组过滤）
router.get('/scripts', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureScriptTables();
    const tenantId = getCurrentTenantId(req);
    const userId = (req as any).currentUser?.id || (req as any).user?.userId;
    const { keyword, categoryId, scope: filterScope, page, pageSize } = req.query;
    const scriptRepo = AppDataSource.getRepository(WecomScript);

    const qb = scriptRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.is_enabled = :enabled', { enabled: true })
      .andWhere('(s.scope = :pub OR s.scope IS NULL OR (s.scope = :personal AND s.created_by = :userId))', { pub: 'public', personal: 'personal', userId });

    if (keyword) {
      qb.andWhere('(s.title LIKE :kw OR s.content LIKE :kw OR s.tags LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (categoryId) {
      qb.andWhere('s.category_id = :catId', { catId: Number(categoryId) });
    }
    if (filterScope) {
      qb.andWhere('s.scope = :fs', { fs: filterScope });
    }

    qb.orderBy('s.sort_order', 'ASC').addOrderBy('s.created_at', 'DESC');

    const p = Number(page) || 1;
    const ps = Math.min(Number(pageSize) || 50, 200);
    const [list, total] = await qb.skip((p - 1) * ps).take(ps).getManyAndCount();

    res.json({ success: true, data: { list, total, page: p, pageSize: ps } });
  } catch (e: any) {
    log.error('[Scripts] Get list error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// 侧边栏专用：获取话术（sidebar token鉴权）
router.get('/sidebar/scripts', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;
    const userId = sidebarUser?.userId;
    const { keyword, categoryId } = req.query;
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);

    // Get categories
    const categories = await catRepo.find({
      where: [
        { tenantId, scope: 'public', isEnabled: true },
        { tenantId, scope: 'personal', createdBy: userId, isEnabled: true }
      ],
      order: { sortOrder: 'ASC' }
    });

    // Get scripts
    const qb = scriptRepo.createQueryBuilder('s')
      .where('s.tenant_id = :tenantId', { tenantId })
      .andWhere('s.is_enabled = :enabled', { enabled: true })
      .andWhere('(s.scope = :pub OR (s.scope = :personal AND s.created_by = :userId))', { pub: 'public', personal: 'personal', userId });

    if (keyword) {
      qb.andWhere('(s.title LIKE :kw OR s.content LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (categoryId) {
      qb.andWhere('s.category_id = :catId', { catId: Number(categoryId) });
    }

    qb.orderBy('s.sort_order', 'ASC').addOrderBy('s.use_count', 'DESC');
    const scripts = await qb.take(200).getMany();

    res.json({ success: true, data: { categories, scripts } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 创建话术
router.post('/scripts', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureScriptTables();
    const tenantId = getCurrentTenantId(req);
    const { title, content, categoryId, shortcut, tags, scope, color, sortOrder, attachments } = req.body;
    if (!title && !content) return res.status(400).json({ success: false, message: '标题或内容至少填一项' });

    const user = (req as any).currentUser || (req as any).user;
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const script = scriptRepo.create({
      tenantId, title: title || '', content: content || '',
      categoryId: categoryId || null, shortcut: shortcut || null,
      tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      attachments: typeof attachments === 'string' ? attachments : JSON.stringify(attachments || []),
      scope: scope || 'public', createdBy: user?.id || user?.userId,
      createdByName: user?.name || user?.username || '',
      color: color || null, sortOrder: sortOrder || 0
    });
    await scriptRepo.save(script);
    res.json({ success: true, data: script });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 侧边栏创建话术
router.post('/sidebar/scripts', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;
    const userId = sidebarUser?.userId;
    const userName = sidebarUser?.userName;
    const { title, content, categoryId, tags, scope, color } = req.body;

    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const script = scriptRepo.create({
      tenantId, title: title || '', content: content || '',
      categoryId: categoryId || null,
      tags: typeof tags === 'string' ? tags : JSON.stringify(tags || []),
      scope: scope || 'personal', createdBy: userId,
      createdByName: userName || '', color: color || null
    });
    await scriptRepo.save(script);
    res.json({ success: true, data: script });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 侧边栏创建分组
router.post('/sidebar/script-categories', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;
    const userId = sidebarUser?.userId;
    const { name, color, scope } = req.body;

    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const cat = catRepo.create({
      tenantId, name, color: color || null,
      scope: scope || 'personal', createdBy: userId
    });
    await catRepo.save(cat);
    res.json({ success: true, data: cat });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 更新话术
router.put('/scripts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    await ensureScriptTables();
    const tenantId = getCurrentTenantId(req);
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const script = await scriptRepo.findOne({ where: { id: Number(req.params.id), tenantId } });
    if (!script) return res.status(404).json({ success: false, message: '话术不存在' });

    const { title, content, categoryId, shortcut, tags, scope, color, sortOrder, attachments } = req.body;

    // 只构建明确要更新的字段，避免TypeORM save()对不存在的列生成SET
    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (shortcut !== undefined) updateData.shortcut = shortcut;
    if (scope !== undefined) updateData.scope = scope;
    if (color !== undefined) updateData.color = color || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (tags !== undefined) updateData.tags = typeof tags === 'string' ? tags : JSON.stringify(tags);
    if (attachments !== undefined) updateData.attachments = typeof attachments === 'string' ? attachments : JSON.stringify(attachments);

    if (Object.keys(updateData).length > 0) {
      await scriptRepo.update({ id: script.id }, updateData);
    }

    const updated = await scriptRepo.findOne({ where: { id: script.id } });
    res.json({ success: true, data: updated });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 删除话术
router.delete('/scripts/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    await scriptRepo.delete({ id: Number(req.params.id), tenantId });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 话术排序
router.put('/scripts-sort', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const { items } = req.body;
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    for (const item of items || []) {
      await scriptRepo.update({ id: item.id, tenantId }, { sortOrder: item.sortOrder });
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 话术使用计数（CRM端）
router.post('/scripts/:id/use', authenticateToken, async (req: Request, res: Response) => {
  try {
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    await scriptRepo.increment({ id: Number(req.params.id) }, 'useCount', 1);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 话术使用计数（侧边栏端）
router.post('/sidebar/scripts/:id/use', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    await scriptRepo.increment({ id: Number(req.params.id) }, 'useCount', 1);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 上传话术附件
router.post('/scripts/upload', authenticateToken, scriptUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '未上传文件' });
    const url = `/uploads/scripts/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url, name: req.file.originalname,
        size: req.file.size, type: req.file.mimetype
      }
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ==================== 导入导出 ====================

// 导出话术（JSON格式，含附件信息）
router.get('/scripts/export', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const userId = (req as any).currentUser?.id || (req as any).user?.userId;
    const { format } = req.query; // 'json' | 'text'
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const scriptRepo = AppDataSource.getRepository(WecomScript);

    const categories = await catRepo.find({
      where: [
        { tenantId, scope: 'public' },
        { tenantId, scope: 'personal', createdBy: userId }
      ],
      order: { sortOrder: 'ASC' }
    });

    const scripts = await scriptRepo.find({
      where: { tenantId, isEnabled: true },
      order: { sortOrder: 'ASC' }
    });

    if (format === 'text') {
      let text = '';
      for (const cat of categories) {
        text += `\n【${cat.name}】\n`;
        const catScripts = scripts.filter(s => s.categoryId === cat.id);
        catScripts.forEach((s, i) => {
          text += `${i + 1}. ${s.title}\n${s.content}\n\n`;
        });
      }
      // Uncategorized
      const uncategorized = scripts.filter(s => !s.categoryId || !categories.find(c => c.id === s.categoryId));
      if (uncategorized.length) {
        text += '\n【未分组】\n';
        uncategorized.forEach((s, i) => {
          text += `${i + 1}. ${s.title}\n${s.content}\n\n`;
        });
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=scripts-export.txt');
      return res.send(text);
    }

    // JSON export
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories: categories.map(c => ({ name: c.name, color: c.color, scope: c.scope, sortOrder: c.sortOrder })),
      scripts: scripts.map(s => ({
        title: s.title, content: s.content, categoryName: categories.find(c => c.id === s.categoryId)?.name || null,
        shortcut: s.shortcut, tags: s.tags, color: s.color, scope: s.scope,
        attachments: s.attachments, sortOrder: s.sortOrder
      }))
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=scripts-export.json');
    res.json(exportData);
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 导入话术
router.post('/scripts/import', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId(req);
    const user = (req as any).currentUser || (req as any).user;
    const importData = req.body;

    if (!importData?.categories && !importData?.scripts) {
      return res.status(400).json({ success: false, message: '导入数据格式不正确' });
    }

    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const catMap: Record<string, number> = {};

    // Import categories
    for (const catData of importData.categories || []) {
      const existing = await catRepo.findOne({ where: { tenantId, name: catData.name } });
      if (existing) {
        catMap[catData.name] = existing.id;
      } else {
        const cat = catRepo.create({
          tenantId, name: catData.name, color: catData.color,
          scope: catData.scope || 'public', createdBy: user?.id,
          sortOrder: catData.sortOrder || 0
        });
        await catRepo.save(cat);
        catMap[catData.name] = cat.id;
      }
    }

    // Import scripts
    let importedCount = 0;
    for (const sData of importData.scripts || []) {
      const categoryId = sData.categoryName ? (catMap[sData.categoryName] || null) : null;
      const script = scriptRepo.create({
        tenantId, title: sData.title || '', content: sData.content || '',
        categoryId, shortcut: sData.shortcut || null,
        tags: sData.tags || null, color: sData.color || null,
        scope: sData.scope || 'public', createdBy: user?.id,
        createdByName: user?.name || user?.username || '',
        attachments: sData.attachments || null,
        sortOrder: sData.sortOrder || 0
      });
      await scriptRepo.save(script);
      importedCount++;
    }

    res.json({ success: true, data: { importedCategories: Object.keys(catMap).length, importedScripts: importedCount } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

