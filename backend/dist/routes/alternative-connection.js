"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alternative_connection_1 = require("../controllers/alternative-connection");
const simpleAuth_1 = require("../middleware/simpleAuth");
const router = (0, express_1.Router)();
const controller = new alternative_connection_1.AlternativeConnectionController();
// 蓝牙连接相关路由
router.post('/bluetooth/start', simpleAuth_1.authenticateTokenSimple, controller.startBluetoothService.bind(controller));
router.post('/bluetooth/stop', simpleAuth_1.authenticateTokenSimple, controller.stopBluetoothService.bind(controller));
router.get('/bluetooth/status', simpleAuth_1.authenticateTokenSimple, controller.getBluetoothStatus.bind(controller));
router.post('/bluetooth/pair', simpleAuth_1.authenticateTokenSimple, controller.pairBluetoothDevice.bind(controller));
// 同网络连接相关路由
router.post('/network/start', simpleAuth_1.authenticateTokenSimple, controller.startNetworkDiscovery.bind(controller));
router.post('/network/stop', simpleAuth_1.authenticateTokenSimple, controller.stopNetworkDiscovery.bind(controller));
router.get('/network/status', simpleAuth_1.authenticateTokenSimple, controller.getNetworkStatus.bind(controller));
router.post('/network/connect', simpleAuth_1.authenticateTokenSimple, controller.connectNetworkDevice.bind(controller));
// 数字配对相关路由
router.post('/digital/start', simpleAuth_1.authenticateTokenSimple, controller.startDigitalPairing.bind(controller));
router.post('/digital/stop', simpleAuth_1.authenticateTokenSimple, controller.stopDigitalPairing.bind(controller));
router.get('/digital/status', simpleAuth_1.authenticateTokenSimple, controller.getDigitalPairingStatus.bind(controller));
router.post('/digital/pair', simpleAuth_1.authenticateTokenSimple, controller.pairWithCode.bind(controller));
router.post('/digital/generate-code', simpleAuth_1.authenticateTokenSimple, controller.generatePairingCode.bind(controller));
// 通用连接管理路由
router.get('/devices', simpleAuth_1.authenticateTokenSimple, controller.getAllConnectedDevices.bind(controller));
router.delete('/devices/:deviceId', simpleAuth_1.authenticateTokenSimple, controller.disconnectDevice.bind(controller));
router.get('/statistics', simpleAuth_1.authenticateTokenSimple, controller.getConnectionStatistics.bind(controller));
exports.default = router;
//# sourceMappingURL=alternative-connection.js.map