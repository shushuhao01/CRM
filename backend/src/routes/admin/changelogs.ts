/**
 * Admin Changelogs Routes - 更新日志管理
 */
import { Router } from 'express';
import { VersionController } from '../../controllers/admin/VersionController';

const router = Router();
const versionController = new VersionController();

// 获取更新日志列表（支持按版本筛选）
router.get('/', versionController.getAllChangelogs);

// 获取单个更新日志
router.get('/:id', versionController.getChangelogById);

// 创建更新日志
router.post('/', versionController.createChangelog);

// 批量创建更新日志
router.post('/batch', versionController.batchCreateChangelogs);

// 更新更新日志
router.put('/:id', versionController.updateChangelogById);

// 删除更新日志
router.delete('/:id', versionController.deleteChangelogById);

export default router;
