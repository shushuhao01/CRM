import { Router } from 'express';
import { privateCustomerController } from '../../controllers/admin/PrivateCustomerController';

const router = Router();

// 获取私有客户列表
router.get('/', (req, res) => privateCustomerController.getList(req, res));

// 获取私有客户详情
router.get('/:id', (req, res) => privateCustomerController.getDetail(req, res));

// 创建私有客户
router.post('/', (req, res) => privateCustomerController.create(req, res));

// 更新私有客户信息
router.put('/:id', (req, res) => privateCustomerController.update(req, res));

// 删除私有客户
router.delete('/:id', (req, res) => privateCustomerController.delete(req, res));

// 获取客户的所有授权
router.get('/:id/licenses', (req, res) => privateCustomerController.getLicenses(req, res));

// 为客户生成新授权
router.post('/:id/licenses', (req, res) => privateCustomerController.generateLicense(req, res));

export default router;
