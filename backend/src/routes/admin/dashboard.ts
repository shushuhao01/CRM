/**
 * Admin Dashboard Routes - 仪表盘统计
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { License } from '../../entities/License';
import { Version } from '../../entities/Version';
import { LicenseLog } from '../../entities/LicenseLog';

const router = Router();

// 获取仪表盘统计数据
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const licenseRepo = AppDataSource.getRepository(License);
    const versionRepo = AppDataSource.getRepository(Version);
    const logRepo = AppDataSource.getRepository(LicenseLog);

    // 授权统计
    const [
      totalLicenses,
      activeLicenses,
      expiredLicenses,
      pendingLicenses,
      trialLicenses,
      perpetualLicenses,
      annualLicenses
    ] = await Promise.all([
      licenseRepo.count(),
      licenseRepo.count({ where: { status: 'active' } }),
      licenseRepo.count({ where: { status: 'expired' } }),
      licenseRepo.count({ where: { status: 'pending' } }),
      licenseRepo.count({ where: { licenseType: 'trial' } }),
      licenseRepo.count({ where: { licenseType: 'perpetual' } }),
      licenseRepo.count({ where: { licenseType: 'annual' } })
    ]);

    // 版本统计
    const [totalVersions, publishedVersions] = await Promise.all([
      versionRepo.count(),
      versionRepo.count({ where: { status: 'published' } })
    ]);

    // 最新版本
    const latestVersion = await versionRepo.findOne({
      where: { status: 'published' },
      order: { versionCode: 'DESC' }
    });

    // 最近7天验证次数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentVerifications = await logRepo
      .createQueryBuilder('log')
      .where('log.action = :action', { action: 'verify' })
      .andWhere('log.createdAt >= :date', { date: sevenDaysAgo })
      .getCount();

    res.json({
      success: true,
      data: {
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expired: expiredLicenses,
          pending: pendingLicenses,
          byType: {
            trial: trialLicenses,
            perpetual: perpetualLicenses,
            annual: annualLicenses
          }
        },
        versions: {
          total: totalVersions,
          published: publishedVersions,
          latest: latestVersion ? latestVersion.version : null
        },
        activity: {
          recentVerifications
        }
      }
    });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get stats failed:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// 获取最近授权列表
router.get('/recent-licenses', async (req: Request, res: Response) => {
  try {
    const licenseRepo = AppDataSource.getRepository(License);
    const list = await licenseRepo.find({
      order: { createdAt: 'DESC' },
      take: 10
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get recent licenses failed:', error);
    res.status(500).json({ success: false, message: '获取最近授权失败' });
  }
});

// 获取即将到期的授权
router.get('/expiring-licenses', async (req: Request, res: Response) => {
  try {
    const licenseRepo = AppDataSource.getRepository(License);

    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const list = await licenseRepo
      .createQueryBuilder('license')
      .where('license.status = :status', { status: 'active' })
      .andWhere('license.expiresAt IS NOT NULL')
      .andWhere('license.expiresAt <= :date', { date: thirtyDaysLater })
      .orderBy('license.expiresAt', 'ASC')
      .take(10)
      .getMany();

    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get expiring licenses failed:', error);
    res.status(500).json({ success: false, message: '获取即将到期授权失败' });
  }
});

// 获取最近验证日志
router.get('/recent-logs', async (req: Request, res: Response) => {
  try {
    const logRepo = AppDataSource.getRepository(LicenseLog);
    const list = await logRepo.find({
      order: { createdAt: 'DESC' },
      take: 20
    });

    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error('[Admin Dashboard] Get recent logs failed:', error);
    res.status(500).json({ success: false, message: '获取最近日志失败' });
  }
});

export default router;
