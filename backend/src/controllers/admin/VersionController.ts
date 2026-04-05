import { Request, Response } from 'express';
import { VersionService } from '../../services/VersionService';

import { log } from '../../config/logger';
export class VersionController {
  private versionService: VersionService;

  constructor() {
    this.versionService = new VersionService();
  }

  /**
   * 映射版本类型：前端 -> 后端
   */
  private mapVersionType(type: string): string {
    const map: Record<string, string> = {
      'stable': 'major',
      'beta': 'beta',
      'alpha': 'beta'
    };
    return map[type] || 'patch';
  }

  /**
   * 映射发布类型：后端 -> 前端
   */
  private mapReleaseTypeToFrontend(type: string): string {
    const map: Record<string, string> = {
      'major': 'stable',
      'minor': 'stable',
      'patch': 'stable',
      'beta': 'beta'
    };
    return map[type] || 'stable';
  }

  /**
   * 获取版本列表
   * GET /api/v1/admin/versions
   */
  getVersions = async (req: Request, res: Response) => {
    try {
      const { page, pageSize, status, platform } = req.query;

      const result = await this.versionService.getVersions({
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
        status: status as string,
        platform: platform as string
      });

      // 字段映射：后端 -> 前端
      const mappedItems = result.list.map((item: any) => ({
        ...item,
        version_number: item.version,
        version_name: item.changelog || `版本 ${item.version}`,
        version_type: this.mapReleaseTypeToFrontend(item.releaseType),
        release_date: item.publishedAt || item.createdAt,
        download_count: item.downloadCount,
        is_published: item.isPublished === 1,
        is_force_update: item.isForceUpdate === 1,
        download_url: item.downloadUrl,
        file_size: item.fileSize ? Number(item.fileSize) : 0,
        release_notes: item.changelog
      }));

      res.json({
        success: true,
        data: {
          items: mappedItems,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      log.error('获取版本列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取版本列表失败'
      });
    }
  };

  /**
   * 获取版本详情
   * GET /api/v1/admin/versions/:id
   */
  getVersionById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const version = await this.versionService.getVersionById(id, true);

      res.json({
        success: true,
        data: version
      });
    } catch (error: any) {
      log.error('获取版本详情失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '版本不存在'
      });
    }
  };

  /**
   * 获取最新发布版本
   * GET /api/v1/admin/versions/latest
   */
  getLatestVersion = async (req: Request, res: Response) => {
    try {
      const { platform } = req.query;
      const version = await this.versionService.getLatestVersion(platform as string);

      res.json({
        success: true,
        data: version
      });
    } catch (error: any) {
      log.error('获取最新版本失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取最新版本失败'
      });
    }
  };

  /**
   * 创建版本
   * POST /api/v1/admin/versions
   */
  createVersion = async (req: Request, res: Response) => {
    try {
      const adminUser = (req as any).adminUser;
      const data = req.body;

      // 字段映射：前端 -> 后端
      const versionData: any = {
        version: data.version_number || data.version,
        releaseType: this.mapVersionType(data.version_type || data.releaseType),
        platform: (data.platform || 'all').toLowerCase(),
        changelog: data.release_notes || data.changelog,
        downloadUrl: data.download_url || data.downloadUrl,
        fileSize: data.file_size ? String(data.file_size) : undefined,
        isForceUpdate: data.is_force_update ? 1 : 0,
        status: data.is_published ? 'published' : 'draft',
        isPublished: data.is_published ? 1 : 0,
        createdBy: adminUser?.adminId
      };

      // 验证必填字段
      if (!versionData.version) {
        return res.status(400).json({
          success: false,
          message: '版本号不能为空'
        });
      }

      const version = await this.versionService.createVersion(versionData);

      res.status(201).json({
        success: true,
        data: version,
        message: '创建成功'
      });
    } catch (error: any) {
      log.error('创建版本失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '创建版本失败'
      });
    }
  };

  /**
   * 更新版本
   * PUT /api/v1/admin/versions/:id
   */
  updateVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const version = await this.versionService.updateVersion(id, data);

      res.json({
        success: true,
        data: version,
        message: '更新成功'
      });
    } catch (error: any) {
      log.error('更新版本失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新版本失败'
      });
    }
  };

  /**
   * 发布版本
   * POST /api/v1/admin/versions/:id/publish
   */
  publishVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const version = await this.versionService.publishVersion(id);

      res.json({
        success: true,
        data: version,
        message: '发布成功'
      });
    } catch (error: any) {
      log.error('发布版本失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '发布版本失败'
      });
    }
  };

  /**
   * 废弃版本
   * POST /api/v1/admin/versions/:id/deprecate
   */
  deprecateVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const version = await this.versionService.deprecateVersion(id);

      res.json({
        success: true,
        data: version,
        message: '已废弃'
      });
    } catch (error: any) {
      log.error('废弃版本失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '废弃版本失败'
      });
    }
  };

  /**
   * 删除版本
   * DELETE /api/v1/admin/versions/:id
   */
  deleteVersion = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.versionService.deleteVersion(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      log.error('删除版本失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除版本失败'
      });
    }
  };

  /**
   * 增加下载次数
   * POST /api/v1/admin/versions/:id/download
   */
  incrementDownload = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.versionService.incrementDownloadCount(id);

      res.json({
        success: true,
        message: '下载次数已更新'
      });
    } catch (error: any) {
      log.error('更新下载次数失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新下载次数失败'
      });
    }
  };

  // ==================== 嵌套更新日志管理 ====================

  /**
   * 获取版本的更新日志列表
   * GET /api/v1/admin/versions/:id/changelogs
   */
  getChangelogs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const changelogs = await this.versionService.getChangelogs(id);

      res.json({
        success: true,
        data: changelogs
      });
    } catch (error: any) {
      log.error('获取更新日志失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取更新日志失败'
      });
    }
  };

  /**
   * 添加更新日志
   * POST /api/v1/admin/versions/:id/changelogs
   */
  addChangelog = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      if (!data.type || !data.content) {
        return res.status(400).json({
          success: false,
          message: '类型和内容不能为空'
        });
      }

      const changelog = await this.versionService.addChangelog({
        versionId: id,
        ...data
      });

      res.status(201).json({
        success: true,
        data: changelog,
        message: '添加成功'
      });
    } catch (error: any) {
      log.error('添加更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '添加更新日志失败'
      });
    }
  };

  /**
   * 批量添加更新日志
   * POST /api/v1/admin/versions/:id/changelogs/batch
   */
  addChangelogsBatch = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { changelogs } = req.body;

      if (!Array.isArray(changelogs) || changelogs.length === 0) {
        return res.status(400).json({
          success: false,
          message: '更新日志列表不能为空'
        });
      }

      const result = await this.versionService.addChangelogsBatch(id, changelogs);

      res.status(201).json({
        success: true,
        data: result,
        message: '批量添加成功'
      });
    } catch (error: any) {
      log.error('批量添加更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '批量添加更新日志失败'
      });
    }
  };

  /**
   * 更新更新日志
   * PUT /api/v1/admin/versions/:versionId/changelogs/:id
   */
  updateChangelog = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const changelog = await this.versionService.updateChangelog(Number(id), data);

      res.json({
        success: true,
        data: changelog,
        message: '更新成功'
      });
    } catch (error: any) {
      log.error('更新更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新更新日志失败'
      });
    }
  };

  /**
   * 删除更新日志
   * DELETE /api/v1/admin/versions/:versionId/changelogs/:id
   */
  deleteChangelog = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.versionService.deleteChangelog(Number(id));

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      log.error('删除更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除更新日志失败'
      });
    }
  };

  /**
   * 删除版本的所有更新日志
   * DELETE /api/v1/admin/versions/:id/changelogs
   */
  deleteAllChangelogs = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.versionService.deleteAllChangelogs(id);

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      log.error('删除所有更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除所有更新日志失败'
      });
    }
  };

  // ==================== 独立更新日志管理 ====================

  /**
   * 获取所有更新日志列表（支持按版本筛选）
   * GET /api/v1/admin/changelogs
   */
  getAllChangelogs = async (req: Request, res: Response) => {
    try {
      const { page, pageSize, version_id } = req.query;

      const result = await this.versionService.getAllChangelogs({
        page: page ? Number(page) : 1,
        pageSize: pageSize ? Number(pageSize) : 20,
        versionId: version_id as string
      });

      // 字段映射：后端 -> 前端
      const mappedItems = result.items.map((item: any) => ({
        id: item.id,
        version_id: item.versionId,
        change_type: item.type,
        content: item.content,
        created_at: item.createdAt,
        version: item.version ? {
          id: item.version.id,
          version_number: item.version.version,
          version_name: item.version.changelog || `版本 ${item.version.version}`
        } : null
      }));

      res.json({
        success: true,
        data: {
          items: mappedItems,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      });
    } catch (error: any) {
      log.error('获取更新日志列表失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取更新日志列表失败'
      });
    }
  };

  /**
   * 获取单个更新日志
   * GET /api/v1/admin/changelogs/:id
   */
  getChangelogById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const changelog = await this.versionService.getChangelogById(Number(id));

      res.json({
        success: true,
        data: changelog
      });
    } catch (error: any) {
      log.error('获取更新日志失败:', error);
      res.status(404).json({
        success: false,
        message: error.message || '更新日志不存在'
      });
    }
  };

  /**
   * 创建更新日志
   * POST /api/v1/admin/changelogs
   */
  createChangelog = async (req: Request, res: Response) => {
    try {
      const data = req.body;

      if (!data.version_id || !data.change_type || !data.content) {
        return res.status(400).json({
          success: false,
          message: '版本ID、类型和内容不能为空'
        });
      }

      const changelog = await this.versionService.addChangelog({
        versionId: data.version_id,
        type: data.change_type,
        content: data.content
      });

      res.status(201).json({
        success: true,
        data: changelog,
        message: '创建成功'
      });
    } catch (error: any) {
      log.error('创建更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '创建更新日志失败'
      });
    }
  };

  /**
   * 批量创建更新日志
   * POST /api/v1/admin/changelogs/batch
   */
  batchCreateChangelogs = async (req: Request, res: Response) => {
    try {
      const { versionId, items } = req.body;

      if (!versionId || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: '版本ID和更新日志列表不能为空'
        });
      }

      const result = await this.versionService.addChangelogsBatch(versionId, items);

      res.status(201).json({
        success: true,
        data: result,
        message: '批量创建成功'
      });
    } catch (error: any) {
      log.error('批量创建更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '批量创建更新日志失败'
      });
    }
  };

  /**
   * 更新更新日志
   * PUT /api/v1/admin/changelogs/:id
   */
  updateChangelogById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const updateData: any = {};
      if (data.change_type) updateData.type = data.change_type;
      if (data.content) updateData.content = data.content;

      const changelog = await this.versionService.updateChangelog(Number(id), updateData);

      res.json({
        success: true,
        data: changelog,
        message: '更新成功'
      });
    } catch (error: any) {
      log.error('更新更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '更新更新日志失败'
      });
    }
  };

  /**
   * 删除更新日志
   * DELETE /api/v1/admin/changelogs/:id
   */
  deleteChangelogById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await this.versionService.deleteChangelog(Number(id));

      res.json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      log.error('删除更新日志失败:', error);
      res.status(400).json({
        success: false,
        message: error.message || '删除更新日志失败'
      });
    }
  };
}
