"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const PermissionController_1 = require("../controllers/PermissionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const permissionController = new PermissionController_1.PermissionController();
// 所有路由都需要认证
router.use(auth_1.authenticateToken);
// 获取权限树
router.get('/tree', (req, res) => permissionController.getPermissionTree(req, res));
// 获取权限列表
router.get('/', (req, res) => permissionController.getPermissions(req, res));
// 创建权限
router.post('/', (req, res) => permissionController.createPermission(req, res));
// 更新权限
router.put('/:id', (req, res) => permissionController.updatePermission(req, res));
// 删除权限
router.delete('/:id', (req, res) => permissionController.deletePermission(req, res));
exports.default = router;
//# sourceMappingURL=permissions.js.map