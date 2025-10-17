import { Router } from 'express'
import { AlternativeConnectionController } from '../controllers/alternative-connection'
import { authenticateTokenSimple } from '../middleware/simpleAuth'

const router = Router()
const controller = new AlternativeConnectionController()

// 蓝牙连接相关路由
router.post('/bluetooth/start', authenticateTokenSimple, controller.startBluetoothService.bind(controller))
router.post('/bluetooth/stop', authenticateTokenSimple, controller.stopBluetoothService.bind(controller))
router.get('/bluetooth/status', authenticateTokenSimple, controller.getBluetoothStatus.bind(controller))
router.post('/bluetooth/pair', authenticateTokenSimple, controller.pairBluetoothDevice.bind(controller))

// 同网络连接相关路由
router.post('/network/start', authenticateTokenSimple, controller.startNetworkDiscovery.bind(controller))
router.post('/network/stop', authenticateTokenSimple, controller.stopNetworkDiscovery.bind(controller))
router.get('/network/status', authenticateTokenSimple, controller.getNetworkStatus.bind(controller))
router.post('/network/connect', authenticateTokenSimple, controller.connectNetworkDevice.bind(controller))

// 数字配对相关路由
router.post('/digital/start', authenticateTokenSimple, controller.startDigitalPairing.bind(controller))
router.post('/digital/stop', authenticateTokenSimple, controller.stopDigitalPairing.bind(controller))
router.get('/digital/status', authenticateTokenSimple, controller.getDigitalPairingStatus.bind(controller))
router.post('/digital/pair', authenticateTokenSimple, controller.pairWithCode.bind(controller))
router.post('/digital/generate-code', authenticateTokenSimple, controller.generatePairingCode.bind(controller))

// 通用连接管理路由
router.get('/devices', authenticateTokenSimple, controller.getAllConnectedDevices.bind(controller))
router.delete('/devices/:deviceId', authenticateTokenSimple, controller.disconnectDevice.bind(controller))
router.get('/statistics', authenticateTokenSimple, controller.getConnectionStatistics.bind(controller))

export default router