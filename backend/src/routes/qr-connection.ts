import { Router } from 'express';
import { qrConnectionController } from '../controllers/qr-connection';

const router = Router();

// 生成连接二维码
router.post('/generate', qrConnectionController.generateQRCode.bind(qrConnectionController));

// 验证扫码并建立连接
router.post('/connect', qrConnectionController.connectDevice.bind(qrConnectionController));

// 获取连接状态
router.get('/status/:connectionId', qrConnectionController.getConnectionStatus.bind(qrConnectionController));

// 断开连接
router.delete('/disconnect/:connectionId', qrConnectionController.disconnectDevice.bind(qrConnectionController));

// 获取已连接设备列表
router.get('/devices', qrConnectionController.getConnectedDevices.bind(qrConnectionController));

export default router;