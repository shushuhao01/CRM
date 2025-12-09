"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlternativeConnectionController = void 0;
const uuid_1 = require("uuid");
class AlternativeConnectionController {
    constructor() {
        this.connectedDevices = new Map();
        this.bluetoothService = { enabled: false };
        this.networkService = { enabled: false };
        this.digitalPairingService = { enabled: false };
    }
    // 蓝牙连接相关方法
    async startBluetoothService(req, res) {
        try {
            const { deviceName = 'CRM-Server' } = req.body;
            this.bluetoothService = {
                enabled: true,
                deviceName,
                pairingCode: this.generateRandomCode(6)
            };
            return res.json({
                success: true,
                message: '蓝牙服务已启动',
                data: {
                    deviceName: this.bluetoothService.deviceName,
                    pairingCode: this.bluetoothService.pairingCode
                }
            });
        }
        catch (error) {
            console.error('启动蓝牙服务失败:', error);
            return res.status(500).json({
                success: false,
                message: '启动蓝牙服务失败'
            });
        }
    }
    async stopBluetoothService(req, res) {
        try {
            this.bluetoothService = { enabled: false };
            // 断开所有蓝牙设备
            for (const [deviceId, device] of this.connectedDevices) {
                if (device.connectionType === 'bluetooth') {
                    device.status = 'disconnected';
                    this.connectedDevices.delete(deviceId);
                }
            }
            return res.json({
                success: true,
                message: '蓝牙服务已停止'
            });
        }
        catch (error) {
            console.error('停止蓝牙服务失败:', error);
            return res.status(500).json({
                success: false,
                message: '停止蓝牙服务失败'
            });
        }
    }
    async getBluetoothStatus(req, res) {
        try {
            return res.json({
                success: true,
                data: this.bluetoothService
            });
        }
        catch (error) {
            console.error('获取蓝牙状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取蓝牙状态失败'
            });
        }
    }
    async pairBluetoothDevice(req, res) {
        try {
            const { pairingCode, deviceInfo } = req.body;
            if (!this.bluetoothService.enabled) {
                return res.status(400).json({
                    success: false,
                    message: '蓝牙服务未启动'
                });
            }
            if (pairingCode !== this.bluetoothService.pairingCode) {
                return res.status(400).json({
                    success: false,
                    message: '配对码错误'
                });
            }
            const deviceId = (0, uuid_1.v4)();
            const device = {
                id: deviceId,
                deviceId: deviceInfo.deviceId || deviceId,
                deviceName: deviceInfo.deviceName || '未知设备',
                deviceType: deviceInfo.deviceType || 'mobile',
                connectionType: 'bluetooth',
                connectedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                status: 'connected',
                metadata: deviceInfo
            };
            this.connectedDevices.set(deviceId, device);
            return res.json({
                success: true,
                message: '蓝牙设备配对成功',
                data: device
            });
        }
        catch (error) {
            console.error('蓝牙设备配对失败:', error);
            return res.status(500).json({
                success: false,
                message: '蓝牙设备配对失败'
            });
        }
    }
    // 同网络连接相关方法
    async startNetworkDiscovery(req, res) {
        try {
            const { port = 8080, broadcastInterval = 10 } = req.body;
            this.networkService = {
                enabled: true,
                port,
                broadcastInterval
            };
            return res.json({
                success: true,
                message: '网络发现已启动',
                data: {
                    port: this.networkService.port,
                    broadcastInterval: this.networkService.broadcastInterval
                }
            });
        }
        catch (error) {
            console.error('启动网络发现失败:', error);
            return res.status(500).json({
                success: false,
                message: '启动网络发现失败'
            });
        }
    }
    async stopNetworkDiscovery(req, res) {
        try {
            this.networkService = { enabled: false };
            // 断开所有网络设备
            for (const [deviceId, device] of this.connectedDevices) {
                if (device.connectionType === 'network') {
                    device.status = 'disconnected';
                    this.connectedDevices.delete(deviceId);
                }
            }
            return res.json({
                success: true,
                message: '网络发现已停止'
            });
        }
        catch (error) {
            console.error('停止网络发现失败:', error);
            return res.status(500).json({
                success: false,
                message: '停止网络发现失败'
            });
        }
    }
    async getNetworkStatus(req, res) {
        try {
            return res.json({
                success: true,
                data: this.networkService
            });
        }
        catch (error) {
            console.error('获取网络状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取网络状态失败'
            });
        }
    }
    async connectNetworkDevice(req, res) {
        try {
            const { deviceInfo } = req.body;
            if (!this.networkService.enabled) {
                return res.status(400).json({
                    success: false,
                    message: '网络发现服务未启动'
                });
            }
            const deviceId = (0, uuid_1.v4)();
            const device = {
                id: deviceId,
                deviceId: deviceInfo.deviceId || deviceId,
                deviceName: deviceInfo.deviceName || '未知设备',
                deviceType: deviceInfo.deviceType || 'mobile',
                connectionType: 'network',
                connectedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                status: 'connected',
                metadata: deviceInfo
            };
            this.connectedDevices.set(deviceId, device);
            return res.json({
                success: true,
                message: '网络设备连接成功',
                data: device
            });
        }
        catch (error) {
            console.error('网络设备连接失败:', error);
            return res.status(500).json({
                success: false,
                message: '网络设备连接失败'
            });
        }
    }
    // 数字配对相关方法
    async startDigitalPairing(req, res) {
        try {
            const { expireTime = 10 } = req.body;
            this.digitalPairingService = {
                enabled: true,
                currentCode: this.generateRandomCode(6),
                expireTime
            };
            return res.json({
                success: true,
                message: '数字配对已启动',
                data: {
                    currentCode: this.digitalPairingService.currentCode,
                    expireTime: this.digitalPairingService.expireTime
                }
            });
        }
        catch (error) {
            console.error('启动数字配对失败:', error);
            return res.status(500).json({
                success: false,
                message: '启动数字配对失败'
            });
        }
    }
    async stopDigitalPairing(req, res) {
        try {
            this.digitalPairingService = { enabled: false };
            return res.json({
                success: true,
                message: '数字配对已停止'
            });
        }
        catch (error) {
            console.error('停止数字配对失败:', error);
            return res.status(500).json({
                success: false,
                message: '停止数字配对失败'
            });
        }
    }
    async getDigitalPairingStatus(req, res) {
        try {
            return res.json({
                success: true,
                data: this.digitalPairingService
            });
        }
        catch (error) {
            console.error('获取数字配对状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取数字配对状态失败'
            });
        }
    }
    async pairWithCode(req, res) {
        try {
            const { pairingCode, deviceInfo } = req.body;
            if (!this.digitalPairingService.enabled) {
                return res.status(400).json({
                    success: false,
                    message: '数字配对服务未启动'
                });
            }
            if (pairingCode !== this.digitalPairingService.currentCode) {
                return res.status(400).json({
                    success: false,
                    message: '配对码错误'
                });
            }
            const deviceId = (0, uuid_1.v4)();
            const device = {
                id: deviceId,
                deviceId: deviceInfo.deviceId || deviceId,
                deviceName: deviceInfo.deviceName || '未知设备',
                deviceType: deviceInfo.deviceType || 'mobile',
                connectionType: 'digital',
                connectedAt: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                status: 'connected',
                metadata: deviceInfo
            };
            this.connectedDevices.set(deviceId, device);
            return res.json({
                success: true,
                message: '数字配对成功',
                data: device
            });
        }
        catch (error) {
            console.error('数字配对失败:', error);
            return res.status(500).json({
                success: false,
                message: '数字配对失败'
            });
        }
    }
    async generatePairingCode(req, res) {
        try {
            if (!this.digitalPairingService.enabled) {
                return res.status(400).json({
                    success: false,
                    message: '数字配对服务未启动'
                });
            }
            this.digitalPairingService.currentCode = this.generateRandomCode(6);
            return res.json({
                success: true,
                message: '配对码已更新',
                data: {
                    currentCode: this.digitalPairingService.currentCode
                }
            });
        }
        catch (error) {
            console.error('生成配对码失败:', error);
            return res.status(500).json({
                success: false,
                message: '生成配对码失败'
            });
        }
    }
    // 通用连接管理方法
    async getAllConnectedDevices(req, res) {
        try {
            const devices = Array.from(this.connectedDevices.values())
                .filter(device => device.status === 'connected');
            return res.json({
                success: true,
                data: devices
            });
        }
        catch (error) {
            console.error('获取连接设备列表失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取连接设备列表失败'
            });
        }
    }
    async disconnectDevice(req, res) {
        try {
            const { deviceId } = req.params;
            const device = this.connectedDevices.get(deviceId);
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: '设备不存在'
                });
            }
            device.status = 'disconnected';
            this.connectedDevices.delete(deviceId);
            return res.json({
                success: true,
                message: '设备已断开连接'
            });
        }
        catch (error) {
            console.error('断开设备连接失败:', error);
            return res.status(500).json({
                success: false,
                message: '断开设备连接失败'
            });
        }
    }
    async getConnectionStatistics(req, res) {
        try {
            const devices = Array.from(this.connectedDevices.values())
                .filter(device => device.status === 'connected');
            const stats = {
                total: devices.length,
                bluetooth: devices.filter(d => d.connectionType === 'bluetooth').length,
                network: devices.filter(d => d.connectionType === 'network').length,
                digital: devices.filter(d => d.connectionType === 'digital').length,
                qr: 0, // 这里可以从二维码连接服务获取
                services: {
                    bluetooth: this.bluetoothService.enabled,
                    network: this.networkService.enabled,
                    digital: this.digitalPairingService.enabled
                }
            };
            return res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            console.error('获取连接统计失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取连接统计失败'
            });
        }
    }
    // 工具方法
    generateRandomCode(length) {
        const chars = '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
exports.AlternativeConnectionController = AlternativeConnectionController;
//# sourceMappingURL=alternative-connection.js.map