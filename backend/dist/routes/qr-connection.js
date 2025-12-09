"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const qr_connection_1 = require("../controllers/qr-connection");
const router = (0, express_1.Router)();
// 生成连接二维码
router.post('/generate', qr_connection_1.qrConnectionController.generateQRCode.bind(qr_connection_1.qrConnectionController));
// 验证扫码并建立连接
router.post('/connect', qr_connection_1.qrConnectionController.connectDevice.bind(qr_connection_1.qrConnectionController));
// 获取连接状态
router.get('/status/:connectionId', qr_connection_1.qrConnectionController.getConnectionStatus.bind(qr_connection_1.qrConnectionController));
// 断开连接
router.delete('/disconnect/:connectionId', qr_connection_1.qrConnectionController.disconnectDevice.bind(qr_connection_1.qrConnectionController));
// 获取已连接设备列表
router.get('/devices', qr_connection_1.qrConnectionController.getConnectedDevices.bind(qr_connection_1.qrConnectionController));
exports.default = router;
//# sourceMappingURL=qr-connection.js.map