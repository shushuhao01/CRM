import { Router } from 'express';
import { systemSettingsController } from '../../controllers/admin/SystemSettingsController';

const router = Router();

// 系统设置路由 - 匹配 /api/v1/admin/system-settings
router.get('/', (req, res) => systemSettingsController.getSettings(req, res));
router.put('/', (req, res) => systemSettingsController.updateSettings(req, res));

// 单个配置项
router.get('/:key', (req, res) => systemSettingsController.getSetting(req, res));
router.put('/:key', (req, res) => systemSettingsController.setSetting(req, res));

// 操作日志
router.get('/logs', (req, res) => {
  // TODO: 实现操作日志查询
  res.json({
    success: true,
    data: {
      list: [],
      total: 0
    }
  });
});

export default router;
