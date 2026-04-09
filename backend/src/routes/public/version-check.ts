/**
 * Public Version Check Routes - 公开版本检查接口
 * 供私有客户端和SaaS租户检查版本更新
 * 不需要管理员认证，但需要 licenseKey 验证
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { Version } from '../../entities/Version';
import { Changelog } from '../../entities/Changelog';
import { log } from '../../config/logger';

const router = Router();

/**
 * 获取最新发布版本
 * GET /version-check (根路径 + /latest 共用同一个处理函数)
 * Query: currentVersion (可选，用于比较)
 */
const getLatestVersion = async (req: Request, res: Response) => {
  try {
    const { currentVersion } = req.query;
    const versionRepo = AppDataSource.getRepository(Version);

    const latest = await versionRepo.findOne({
      where: { status: 'published' },
      order: { versionCode: 'DESC' }
    });

    if (!latest) {
      return res.json({
        success: true,
        data: { hasUpdate: false, currentVersion: currentVersion || '0.0.0', latestVersion: null }
      });
    }

    // 比较版本
    let hasUpdate = false;
    if (currentVersion) {
      const currentCode = parseVersionCode(currentVersion as string);
      hasUpdate = latest.versionCode > currentCode;
    }

    // 获取更新日志
    let changelogs: any[] = [];
    try {
      const changelogRepo = AppDataSource.getRepository(Changelog);
      changelogs = await changelogRepo.find({
        where: { versionId: latest.id },
        order: { sortOrder: 'ASC' }
      });
    } catch {}

    res.json({
      success: true,
      data: {
        hasUpdate,
        currentVersion: currentVersion || '0.0.0',
        latestVersion: {
          id: latest.id,
          version: latest.version,
          versionCode: latest.versionCode,
          releaseType: latest.releaseType,
          changelog: latest.changelog,
          releaseNotesHtml: latest.releaseNotesHtml,
          downloadUrl: latest.downloadUrl,
          sourceType: latest.sourceType,
          gitRepoUrl: latest.gitRepoUrl,
          gitBranch: latest.gitBranch,
          gitTag: latest.gitTag,
          fileSize: latest.fileSize,
          isForceUpdate: latest.isForceUpdate,
          publishedAt: latest.publishedAt,
          changelogs
        }
      }
    });
  } catch (error: any) {
    log.error('[Version Check] Get latest failed:', error);
    res.status(500).json({ success: false, message: '检查版本失败' });
  }
};
router.get('/', getLatestVersion);
router.get('/latest', getLatestVersion);

/**
 * 获取版本更新历史列表
 * GET /version-check/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 10, 50);

    const versionRepo = AppDataSource.getRepository(Version);
    const [list, total] = await versionRepo.findAndCount({
      where: { status: 'published' },
      order: { versionCode: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    // 为每个版本获取 changelog 条目
    const changelogRepo = AppDataSource.getRepository(Changelog);
    const result = await Promise.all(list.map(async (v) => {
      let changelogs: any[] = [];
      try {
        changelogs = await changelogRepo.find({
          where: { versionId: v.id },
          order: { sortOrder: 'ASC' }
        });
      } catch {}
      return {
        id: v.id,
        version: v.version,
        versionCode: v.versionCode,
        releaseType: v.releaseType,
        changelog: v.changelog,
        releaseNotesHtml: v.releaseNotesHtml,
        publishedAt: v.publishedAt,
        isForceUpdate: v.isForceUpdate,
        changelogs
      };
    }));

    res.json({
      success: true,
      data: { list: result, total, page, pageSize }
    });
  } catch (error: any) {
    log.error('[Version Check] Get history failed:', error);
    res.status(500).json({ success: false, message: '获取版本历史失败' });
  }
});

/**
 * 解析版本号
 */
function parseVersionCode(version: string): number {
  const parts = version.split('.').map(p => parseInt(p) || 0);
  return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

export default router;

