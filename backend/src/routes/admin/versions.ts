/**
 * Admin Versions Routes - 版本发布管理
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Version } from '../../entities/Version';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 解析版本号为数字 (1.2.3 -> 10203)
const parseVersionCode = (version: string): number => {
  const parts = version.split('.').map(p => parseInt(p) || 0);
  return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
};

// 获取版本列表
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    const versionRepo = AppDataSource.getRepository(Version);
    const queryBuilder = versionRepo.createQueryBuilder('version');

    if (status) {
      queryBuilder.andWhere('version.status = :status', { status });
    }

    queryBuilder.orderBy('version.versionCode', 'DESC');
    queryBuilder.skip(skip).take(pageSizeNum);

    const [list, total] = await queryBuilder.getManyAndCount();

    res.json({
      success: true,
      data: { list, total, page: pageNum, pageSize: pageSizeNum }
    });
  } catch (error: any) {
    console.error('[Admin Versions] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取版本列表失败' });
  }
});

// 获取最新发布版本（公开接口，供客户端检查更新）
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const versionRepo = AppDataSource.getRepository(Version);
    const latest = await versionRepo.findOne({
      where: { status: 'published' },
      order: { versionCode: 'DESC' }
    });

    if (!latest) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        version: latest.version,
        versionCode: latest.versionCode,
        changelog: latest.changelog,
        downloadUrl: latest.downloadUrl,
        fileSize: latest.fileSize,
        minVersion: latest.minVersion,
        isForceUpdate: latest.isForceUpdate,
        publishedAt: latest.publishedAt
      }
    });
  } catch (error: any) {
    console.error('[Admin Versions] Get latest failed:', error);
    res.status(500).json({ success: false, message: '获取最新版本失败' });
  }
});

// 获取版本详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versionRepo = AppDataSource.getRepository(Version);
    const version = await versionRepo.findOne({ where: { id } });

    if (!version) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    res.json({ success: true, data: version });
  } catch (error: any) {
    console.error('[Admin Versions] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取版本详情失败' });
  }
});

// 创建版本
router.post('/', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const {
      version,
      releaseType,
      changelog,
      downloadUrl,
      fileSize,
      fileHash,
      minVersion,
      isForceUpdate
    } = req.body;

    if (!version) {
      return res.status(400).json({ success: false, message: '版本号不能为空' });
    }

    const versionRepo = AppDataSource.getRepository(Version);

    // 检查版本号是否已存在
    const existing = await versionRepo.findOne({ where: { version } });
    if (existing) {
      return res.status(400).json({ success: false, message: '版本号已存在' });
    }

    const newVersion = new Version();
    newVersion.id = uuidv4();
    newVersion.version = version;
    newVersion.versionCode = parseVersionCode(version);
    newVersion.releaseType = releaseType || 'patch';
    newVersion.changelog = changelog;
    newVersion.downloadUrl = downloadUrl;
    newVersion.fileSize = fileSize;
    newVersion.fileHash = fileHash;
    newVersion.minVersion = minVersion;
    newVersion.isForceUpdate = isForceUpdate ? 1 : 0;
    newVersion.status = 'draft';
    newVersion.createdBy = adminUser?.adminId;

    await versionRepo.save(newVersion);

    res.json({ success: true, data: newVersion, message: '版本创建成功' });
  } catch (error: any) {
    console.error('[Admin Versions] Create failed:', error);
    res.status(500).json({ success: false, message: '创建版本失败' });
  }
});

// 更新版本
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      version,
      releaseType,
      changelog,
      downloadUrl,
      fileSize,
      fileHash,
      minVersion,
      isForceUpdate
    } = req.body;

    const versionRepo = AppDataSource.getRepository(Version);
    const versionEntity = await versionRepo.findOne({ where: { id } });

    if (!versionEntity) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    if (version && version !== versionEntity.version) {
      const existing = await versionRepo.findOne({ where: { version } });
      if (existing) {
        return res.status(400).json({ success: false, message: '版本号已存在' });
      }
      versionEntity.version = version;
      versionEntity.versionCode = parseVersionCode(version);
    }

    if (releaseType) versionEntity.releaseType = releaseType;
    if (changelog !== undefined) versionEntity.changelog = changelog;
    if (downloadUrl !== undefined) versionEntity.downloadUrl = downloadUrl;
    if (fileSize !== undefined) versionEntity.fileSize = fileSize;
    if (fileHash !== undefined) versionEntity.fileHash = fileHash;
    if (minVersion !== undefined) versionEntity.minVersion = minVersion;
    if (isForceUpdate !== undefined) versionEntity.isForceUpdate = isForceUpdate ? 1 : 0;

    await versionRepo.save(versionEntity);

    res.json({ success: true, data: versionEntity, message: '版本更新成功' });
  } catch (error: any) {
    console.error('[Admin Versions] Update failed:', error);
    res.status(500).json({ success: false, message: '更新版本失败' });
  }
});

// 发布版本
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versionRepo = AppDataSource.getRepository(Version);
    const version = await versionRepo.findOne({ where: { id } });

    if (!version) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    if (!version.downloadUrl) {
      return res.status(400).json({ success: false, message: '请先设置下载地址' });
    }

    version.status = 'published';
    version.publishedAt = new Date();
    await versionRepo.save(version);

    res.json({ success: true, data: version, message: '版本发布成功' });
  } catch (error: any) {
    console.error('[Admin Versions] Publish failed:', error);
    res.status(500).json({ success: false, message: '发布版本失败' });
  }
});

// 废弃版本
router.post('/:id/deprecate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versionRepo = AppDataSource.getRepository(Version);
    const version = await versionRepo.findOne({ where: { id } });

    if (!version) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    version.status = 'deprecated';
    await versionRepo.save(version);

    res.json({ success: true, data: version, message: '版本已废弃' });
  } catch (error: any) {
    console.error('[Admin Versions] Deprecate failed:', error);
    res.status(500).json({ success: false, message: '废弃版本失败' });
  }
});

// 删除版本
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const versionRepo = AppDataSource.getRepository(Version);
    const version = await versionRepo.findOne({ where: { id } });

    if (!version) {
      return res.status(404).json({ success: false, message: '版本不存在' });
    }

    if (version.status === 'published') {
      return res.status(400).json({ success: false, message: '已发布的版本不能删除' });
    }

    await versionRepo.remove(version);

    res.json({ success: true, message: '版本已删除' });
  } catch (error: any) {
    console.error('[Admin Versions] Delete failed:', error);
    res.status(500).json({ success: false, message: '删除版本失败' });
  }
});

export default router;
