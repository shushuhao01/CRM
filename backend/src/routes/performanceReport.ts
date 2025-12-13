import { Router } from 'express';
import { PerformanceReportController } from '../controllers/PerformanceReportController';

const router = Router();
const controller = new PerformanceReportController();

/**
 * @route GET /api/v1/performance-report/configs
 * @desc 获取业绩报表配置列表
 */
router.get('/configs', controller.getConfigs.bind(controller));

/**
 * @route POST /api/v1/performance-report/configs
 * @desc 创建业绩报表配置
 */
router.post('/configs', controller.createConfig.bind(controller));

/**
 * @route PUT /api/v1/performance-report/configs/:id
 * @desc 更新业绩报表配置
 */
router.put('/configs/:id', controller.updateConfig.bind(controller));

/**
 * @route DELETE /api/v1/performance-report/configs/:id
 * @desc 删除业绩报表配置
 */
router.delete('/configs/:id', controller.deleteConfig.bind(controller));

/**
 * @route GET /api/v1/performance-report/types
 * @desc 获取报表类型选项
 */
router.get('/types', controller.getReportTypes.bind(controller));

/**
 * @route POST /api/v1/performance-report/preview
 * @desc 预览业绩数据
 */
router.post('/preview', controller.previewReport.bind(controller));

/**
 * @route POST /api/v1/performance-report/configs/:id/test
 * @desc 测试发送业绩报表
 */
router.post('/configs/:id/test', controller.testSend.bind(controller));

export default router;
