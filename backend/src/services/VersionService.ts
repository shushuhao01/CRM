import { AppDataSource } from '../config/database';
import { Version } from '../entities/Version';
import { Changelog } from '../entities/Changelog';
import { Tenant } from '../entities/Tenant';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { notificationTemplateService } from './NotificationTemplateService';

export class VersionService {
  private versionRepository: Repository<Version>;
  private changelogRepository: Repository<Changelog>;

  constructor() {
    this.versionRepository = AppDataSource.getRepository(Version);
    this.changelogRepository = AppDataSource.getRepository(Changelog);
  }

  /**
   * 解析版本号为数字代码 (1.2.3 -> 10203)
   */
  private parseVersionCode(version: string): number {
    const parts = version.split('.').map(p => parseInt(p) || 0);
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
  }

  /**
   * 获取版本列表
   */
  async getVersions(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    platform?: string;
  }) {
    const { page = 1, pageSize = 20, status, platform } = params;

    const queryBuilder = this.versionRepository.createQueryBuilder('version');

    // 筛选条件
    if (status) {
      queryBuilder.andWhere('version.status = :status', { status });
    }
    if (platform && platform !== 'all') {
      queryBuilder.andWhere('(version.platform = :platform OR version.platform = :all)', {
        platform,
        all: 'all'
      });
    }

    // 排序
    queryBuilder.orderBy('version.versionCode', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [list, total] = await queryBuilder.getManyAndCount();

    return {
      list,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取版本详情（包含更新日志）
   */
  async getVersionById(id: string, includeChangelogs = true) {
    const version = await this.versionRepository.findOne({ where: { id } });
    if (!version) {
      throw new Error('版本不存在');
    }

    if (includeChangelogs) {
      const changelogs = await this.changelogRepository.find({
        where: { versionId: id },
        order: { sortOrder: 'ASC', id: 'ASC' }
      });
      return { ...version, changelogs };
    }

    return version;
  }

  /**
   * 获取最新发布版本
   */
  async getLatestVersion(platform?: string) {
    const queryBuilder = this.versionRepository.createQueryBuilder('version');

    queryBuilder.where('version.status = :status', { status: 'published' });

    if (platform && platform !== 'all') {
      queryBuilder.andWhere('(version.platform = :platform OR version.platform = :all)', {
        platform,
        all: 'all'
      });
    }

    queryBuilder.orderBy('version.versionCode', 'DESC');

    const version = await queryBuilder.getOne();

    if (!version) {
      return null;
    }

    // 获取更新日志
    const changelogs = await this.changelogRepository.find({
      where: { versionId: version.id },
      order: { sortOrder: 'ASC', id: 'ASC' }
    });

    return { ...version, changelogs };
  }

  /**
   * 创建版本
   */
  async createVersion(data: {
    version: string;
    releaseType?: string;
    platform?: string;
    changelog?: string;
    downloadUrl?: string;
    fileSize?: string;
    fileHash?: string;
    minVersion?: string;
    isForceUpdate?: boolean;
    createdBy?: string;
  }) {
    // 检查版本号是否已存在
    const existing = await this.versionRepository.findOne({
      where: { version: data.version }
    });
    if (existing) {
      throw new Error('版本号已存在');
    }

    const version = this.versionRepository.create({
      id: uuidv4(),
      version: data.version,
      versionCode: this.parseVersionCode(data.version),
      releaseType: data.releaseType || 'patch',
      platform: data.platform || 'all',
      changelog: data.changelog,
      downloadUrl: data.downloadUrl,
      fileSize: data.fileSize,
      fileHash: data.fileHash,
      minVersion: data.minVersion,
      isForceUpdate: data.isForceUpdate ? 1 : 0,
      status: 'draft',
      isPublished: 0,
      downloadCount: 0,
      createdBy: data.createdBy
    });

    return await this.versionRepository.save(version);
  }

  /**
   * 更新版本
   */
  async updateVersion(id: string, data: Partial<Version>) {
    const version = await this.getVersionById(id, false);

    // 如果更新版本号，检查是否冲突
    if (data.version && data.version !== version.version) {
      const existing = await this.versionRepository.findOne({
        where: { version: data.version }
      });
      if (existing) {
        throw new Error('版本号已存在');
      }
      version.versionCode = this.parseVersionCode(data.version);
    }

    Object.assign(version, data);
    return await this.versionRepository.save(version);
  }

  /**
   * 发布版本
   */
  async publishVersion(id: string) {
    const version = await this.getVersionById(id, false);

    if (!version.downloadUrl) {
      throw new Error('请先设置下载地址');
    }

    version.status = 'published';
    version.isPublished = 1;
    version.publishedAt = new Date();

    const saved = await this.versionRepository.save(version);

    // 异步通知所有活跃租户（不阻塞发布流程）
    this.notifyTenantsOfNewVersion(saved).catch(err => {
      console.error('[VersionService] 发送版本发布通知失败:', err);
    });

    return saved;
  }

  /**
   * 通知所有活跃租户新版本发布
   */
  private async notifyTenantsOfNewVersion(version: any): Promise<void> {
    try {
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const activeTenants = await tenantRepo.find({
        where: { status: 'active' },
        select: ['id', 'name', 'email', 'phone']
      });

      if (activeTenants.length === 0) {
        console.log('[VersionService] 没有活跃租户需要通知');
        return;
      }

      const releaseTypeMap: Record<string, string> = {
        'major': '大版本更新',
        'minor': '功能更新',
        'patch': '修复更新',
        'beta': 'Beta测试版'
      };

      const isForceUpdate = version.isForceUpdate === 1;
      const forceUpdateTip = isForceUpdate
        ? '⚠️ 此版本为强制更新，请尽快升级以确保系统正常运行。'
        : '建议您在方便时进行更新，以获取最新功能和安全修复。';

      let successCount = 0;
      let failCount = 0;

      for (const tenant of activeTenants) {
        try {
          const recipient = tenant.email || tenant.phone;
          if (!recipient) {
            console.log(`[VersionService] 租户 ${tenant.name} 没有联系方式，跳过通知`);
            continue;
          }

          await notificationTemplateService.sendByTemplate('version_published', {
            tenantName: tenant.name,
            version: version.version,
            releaseType: releaseTypeMap[version.releaseType] || '常规更新',
            changelog: version.changelog || '详情请查看系统内更新日志',
            publishTime: new Date().toLocaleString('zh-CN'),
            forceUpdateTip,
            downloadUrl: version.downloadUrl || ''
          }, {
            to: recipient,
            priority: isForceUpdate ? 'urgent' : 'high'
          });

          successCount++;
        } catch (err) {
          failCount++;
          console.error(`[VersionService] 通知租户 ${tenant.name} 失败:`, err);
        }
      }

      console.log(`[VersionService] 版本 v${version.version} 发布通知完成: 成功 ${successCount}, 失败 ${failCount}, 共 ${activeTenants.length} 个活跃租户`);
    } catch (error) {
      console.error('[VersionService] 批量发送版本通知失败:', error);
    }
  }

  /**
   * 废弃版本
   */
  async deprecateVersion(id: string) {
    const version = await this.getVersionById(id, false);

    version.status = 'deprecated';
    version.isPublished = 0;

    return await this.versionRepository.save(version);
  }

  /**
   * 删除版本
   */
  async deleteVersion(id: string) {
    const version = await this.getVersionById(id, false);

    if (version.status === 'published') {
      throw new Error('已发布的版本不能删除，请先废弃');
    }

    await this.versionRepository.remove(version);
    return { success: true, message: '删除成功' };
  }

  /**
   * 增加下载次数
   */
  async incrementDownloadCount(id: string) {
    await this.versionRepository.increment({ id }, 'downloadCount', 1);
  }

  // ==================== 更新日志管理 ====================

  /**
   * 获取版本的更新日志列表
   */
  async getChangelogs(versionId: string) {
    return await this.changelogRepository.find({
      where: { versionId },
      order: { sortOrder: 'ASC', id: 'ASC' }
    });
  }

  /**
   * 添加更新日志
   */
  async addChangelog(data: {
    versionId: string;
    type: 'feature' | 'bugfix' | 'improvement' | 'security' | 'breaking';
    content: string;
    sortOrder?: number;
  }) {
    // 验证版本是否存在
    await this.getVersionById(data.versionId, false);

    const changelog = this.changelogRepository.create({
      versionId: data.versionId,
      type: data.type,
      content: data.content,
      sortOrder: data.sortOrder ?? 0
    });

    return await this.changelogRepository.save(changelog);
  }

  /**
   * 批量添加更新日志
   */
  async addChangelogsBatch(versionId: string, changelogs: Array<{
    type: 'feature' | 'bugfix' | 'improvement' | 'security' | 'breaking';
    content: string;
    sortOrder?: number;
  }>) {
    // 验证版本是否存在
    await this.getVersionById(versionId, false);

    const entities = changelogs.map((log, index) =>
      this.changelogRepository.create({
        versionId,
        type: log.type,
        content: log.content,
        sortOrder: log.sortOrder ?? index
      })
    );

    return await this.changelogRepository.save(entities);
  }

  /**
   * 更新更新日志
   */
  async updateChangelog(id: number, data: Partial<Changelog>) {
    const changelog = await this.changelogRepository.findOne({ where: { id } });
    if (!changelog) {
      throw new Error('更新日志不存在');
    }

    Object.assign(changelog, data);
    return await this.changelogRepository.save(changelog);
  }

  /**
   * 删除更新日志
   */
  async deleteChangelog(id: number) {
    const changelog = await this.changelogRepository.findOne({ where: { id } });
    if (!changelog) {
      throw new Error('更新日志不存在');
    }

    await this.changelogRepository.remove(changelog);
    return { success: true, message: '删除成功' };
  }

  /**
   * 删除版本的所有更新日志
   */
  async deleteAllChangelogs(versionId: string) {
    await this.changelogRepository.delete({ versionId });
    return { success: true, message: '删除成功' };
  }

  /**
   * 获取所有更新日志列表（支持按版本筛选和分页）
   */
  async getAllChangelogs(params: {
    page?: number;
    pageSize?: number;
    versionId?: string;
  }) {
    const { page = 1, pageSize = 20, versionId } = params;

    const where: any = {};
    if (versionId) {
      where.versionId = versionId;
    }

    const [items, total] = await this.changelogRepository.findAndCount({
      where,
      relations: ['version'],
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * 获取单个更新日志
   */
  async getChangelogById(id: number) {
    const changelog = await this.changelogRepository.findOne({
      where: { id },
      relations: ['version']
    });

    if (!changelog) {
      throw new Error('更新日志不存在');
    }

    return changelog;
  }
}
