/**
 * 租户配置管理路由
 *
 * 所有路由都需要Admin权限
 */

import { Router } from 'express';
import {
  getTenantSettings,
  updateTenantSettings,
  resetTenantSettings,
  getTenantSetting,
  deleteTenantSetting
} from '../../controllers/admin/TenantSettingsController';
import { adminAuthMiddleware } from '../../middleware/adminAuth';

const router = Router();

// 所有路由都需要Admin权限
router.use(adminAuthMiddleware);

/**
 * @route   GET /api/v1/admin/tenants/:id/settings
 * @desc    获取租户配置
 * @access  Admin
 */
router.get('/', getTenantSettings);

/**
 * @route   PUT /api/v1/admin/tenants/:id/settings
 * @desc    更新租户配置
 * @access  Admin
 * @body    settings (object)
 */
router.put('/', updateTenantSettings);

/**
 * @route   POST /api/v1/admin/tenants/:id/settings/reset
 * @desc    重置租户配置为默认值
 * @access  Admin
 */
router.post('/reset', resetTenantSettings);

/**
 * @route   GET /api/v1/admin/tenants/:id/settings/:key
 * @desc    获取单个配置项
 * @access  Admin
 */
router.get('/:key', getTenantSetting);

/**
 * @route   DELETE /api/v1/admin/tenants/:id/settings/:key
 * @desc    删除配置项
 * @access  Admin
 */
router.delete('/:key', deleteTenantSetting);

export default router;
