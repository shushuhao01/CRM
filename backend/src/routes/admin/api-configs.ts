import { Router } from 'express';
import { ApiConfigController } from '../../controllers/admin/ApiConfigController';

const router = Router();

// API配置管理
router.get('/logs', ApiConfigController.getAllApiCallLogs);
router.get('/statistics', ApiConfigController.getGlobalApiStatistics);
router.get('/:id/statistics', ApiConfigController.getApiStatistics);
router.get('/:id/logs', ApiConfigController.getApiCallLogs);
router.get('/:id', ApiConfigController.getApiConfigById);
router.get('/', ApiConfigController.getApiConfigs);
router.post('/', ApiConfigController.createApiConfig);
router.put('/:id', ApiConfigController.updateApiConfig);
router.delete('/:id', ApiConfigController.deleteApiConfig);
router.post('/:id/regenerate-key', ApiConfigController.regenerateKey);

export default router;
