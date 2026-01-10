/**
 * License Verification Routes - 授权验证（公开接口）
 * 供私有部署的客户端调用验证授权
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { License } from '../../entities/License';
import { LicenseLog } from '../../entities/LicenseLog';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 验证授权码
router.post('/license', async (req: Request, res: Response) => {
  try {
    const { licenseKey, machineId } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    if (!licenseKey) {
      return res.status(400).json({ success: false, message: '授权码不能为空' });
    }

    const licenseRepo = AppDataSource.getRepository(License);
    const logRepo = AppDataSource.getRepository(LicenseLog);

    const license = await licenseRepo.findOne({ where: { licenseKey } });

    // 记录验证日志
    const log = new LicenseLog();
    log.id = uuidv4();
    log.licenseKey = licenseKey;
    log.action = 'verify';
    log.machineId = machineId;
    log.ipAddress = clientIp;
    log.userAgent = userAgent;

    if (!license) {
      log.result = 'failed';
      log.message = '授权码不存在';
      await logRepo.save(log);
      return res.status(404).json({ success: false, message: '授权码无效' });
    }

    log.licenseId = license.id;

    // 检查状态
    if (license.status === 'revoked') {
      log.result = 'failed';
      log.message = '授权已被吊销';
      await logRepo.save(log);
      return res.status(403).json({ success: false, message: '授权已被吊销' });
    }

    if (license.status === 'pending') {
      // 首次激活
      license.status = 'active';
      license.activatedAt = new Date();
      if (machineId) {
        license.machineId = machineId;
      }
      await licenseRepo.save(license);

      log.action = 'activate';
      log.result = 'success';
      log.message = '授权激活成功';
      await logRepo.save(log);

      return res.json({
        success: true,
        data: {
          valid: true,
          licenseType: license.licenseType,
          maxUsers: license.maxUsers,
          features: license.features,
          expiresAt: license.expiresAt,
          customerName: license.customerName
        },
        message: '授权激活成功'
      });
    }

    // 检查机器码绑定
    if (license.machineId && machineId && license.machineId !== machineId) {
      log.result = 'failed';
      log.message = '授权已绑定其他设备';
      await logRepo.save(log);
      return res.status(403).json({ success: false, message: '授权已绑定其他设备' });
    }

    // 检查是否过期
    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
      if (license.status !== 'expired') {
        license.status = 'expired';
        await licenseRepo.save(license);
      }
      log.result = 'failed';
      log.message = '授权已过期';
      await logRepo.save(log);
      return res.status(403).json({
        success: false,
        message: '授权已过期',
        data: { expired: true, expiresAt: license.expiresAt }
      });
    }

    // 验证成功
    log.result = 'success';
    log.message = '验证成功';
    await logRepo.save(log);

    res.json({
      success: true,
      data: {
        valid: true,
        licenseType: license.licenseType,
        maxUsers: license.maxUsers,
        features: license.features,
        expiresAt: license.expiresAt,
        customerName: license.customerName
      }
    });
  } catch (error: any) {
    console.error('[License Verify] Failed:', error);
    res.status(500).json({ success: false, message: '验证失败' });
  }
});

// 获取最新版本（公开接口）
router.get('/version', async (req: Request, res: Response) => {
  try {
    const { AppDataSource } = await import('../../config/database');
    const { Version } = await import('../../entities/Version');

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
    console.error('[Version Check] Failed:', error);
    res.status(500).json({ success: false, message: '获取版本信息失败' });
  }
});

export default router;
