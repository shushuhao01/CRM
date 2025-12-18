"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const RoleController_1 = require("../controllers/RoleController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const roleController = new RoleController_1.RoleController();
// 获取角色列表 - 使用可选认证
router.get('/', auth_1.optionalAuth, (req, res) => roleController.getRoles(req, res));
// 获取角色统计 - 使用可选认证
router.get('/stats', auth_1.optionalAuth, (req, res) => roleController.getRoleStats(req, res));
// 获取角色模板列表 - 使用可选认证
router.get('/templates', auth_1.optionalAuth, (req, res) => roleController.getRoleTemplates(req, res));
// 获取角色权限 - 使用可选认证
router.get('/:id/permissions', auth_1.optionalAuth, (req, res) => roleController.getRolePermissions(req, res));
// 获取单个角色 - 使用可选认证
router.get('/:id', auth_1.optionalAuth, (req, res) => roleController.getRoleById(req, res));
// 以下操作需要认证
router.use(auth_1.authenticateToken);
// 创建角色
router.post('/', (req, res) => roleController.createRole(req, res));
// 从模板创建角色
router.post('/from-template', (req, res) => roleController.createRoleFromTemplate(req, res));
// 更新角色
router.put('/:id', (req, res) => roleController.updateRole(req, res));
// 删除角色
router.delete('/:id', (req, res) => roleController.deleteRole(req, res));
// 更新角色状态
router.patch('/:id/status', (req, res) => roleController.updateRoleStatus(req, res));
// 🔥 更新角色权限
router.put('/:id/permissions', (req, res) => roleController.updateRolePermissions(req, res));
exports.default = router;
//# sourceMappingURL=roles.js.map