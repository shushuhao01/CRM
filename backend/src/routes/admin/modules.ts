import { Router } from 'express';
import { moduleController } from '../../controllers/admin/ModuleController';

const router = Router();

// 模块管理路由
router.get('/', (req, res) => moduleController.getModules(req, res));
router.get('/:id', (req, res) => moduleController.getModuleById(req, res));
router.post('/', (req, res) => moduleController.createModule(req, res));
router.put('/:id', (req, res) => moduleController.updateModule(req, res));
router.delete('/:id', (req, res) => moduleController.deleteModule(req, res));

// 模块状态控制
router.post('/:id/enable', (req, res) => moduleController.enableModule(req, res));
router.post('/:id/disable', (req, res) => moduleController.disableModule(req, res));

// 模块配置
router.get('/:id/config', (req, res) => moduleController.getModuleConfig(req, res));
router.put('/:id/config', (req, res) => moduleController.updateModuleConfig(req, res));

export default router;
