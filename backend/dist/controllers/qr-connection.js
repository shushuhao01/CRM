"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.qrConnectionController = exports.QRConnectionController = void 0;
const uuid_1 = require("uuid");
const qrcode_1 = __importDefault(require("qrcode"));
// 内存存储（生产环境应使用数据库）
const connections = new Map();
const connectedDevices = new Map();
class QRConnectionController {
    /**
     * 生成连接二维码
     */
    async generateQRCode(req, res) {
        try {
            const { userId, permissions = ['call', 'sms', 'contacts'] } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID不能为空'
                });
            }
            // 生成连接ID
            const connectionId = (0, uuid_1.v4)();
            // 设置过期时间（5分钟）
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            // 创建连接数据
            const connectionData = {
                connectionId,
                userId,
                permissions,
                status: 'pending',
                createdAt: new Date(),
                expiresAt
            };
            // 存储连接信息
            connections.set(connectionId, connectionData);
            // 生成二维码数据（JSON格式）
            const qrData = JSON.stringify({
                type: 'crm_mobile_connection',
                connectionId,
                serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
                permissions,
                expiresAt: expiresAt.toISOString()
            });
            // 生成二维码图片URL
            let qrCodeUrl;
            try {
                qrCodeUrl = await qrcode_1.default.toDataURL(qrData, {
                    width: 200,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                });
            }
            catch (qrError) {
                console.warn('QRCode生成失败，使用在线服务:', qrError);
                qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
            }
            const response = {
                connectionId,
                qrData,
                qrCodeUrl,
                expiresAt: expiresAt.toISOString(),
                permissions
            };
            return res.json({
                success: true,
                data: response,
                message: '二维码生成成功'
            });
        }
        catch (error) {
            console.error('生成二维码失败:', error);
            return res.status(500).json({
                success: false,
                message: '生成二维码失败',
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    /**
     * 获取连接状态
     */
    async getConnectionStatus(req, res) {
        try {
            const { connectionId } = req.params;
            const connection = connections.get(connectionId);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    message: '连接不存在'
                });
            }
            // 检查是否过期
            if (new Date() > connection.expiresAt) {
                connection.status = 'expired';
                connections.set(connectionId, connection);
            }
            const response = {
                status: connection.status,
                createdAt: connection.createdAt.toISOString(),
                expiresAt: connection.expiresAt.toISOString(),
                deviceInfo: connection.deviceInfo
            };
            return res.json({
                success: true,
                data: response,
                message: '连接状态获取成功'
            });
        }
        catch (error) {
            console.error('获取连接状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取连接状态失败',
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    /**
     * 断开设备连接
     */
    async disconnectDevice(req, res) {
        try {
            const { connectionId } = req.params;
            const { deviceId } = req.body;
            const connection = connections.get(connectionId);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    message: '连接不存在'
                });
            }
            // 更新连接状态
            connection.status = 'expired';
            connections.set(connectionId, connection);
            // 如果指定了设备ID，从已连接设备中移除
            if (deviceId && connectedDevices.has(deviceId)) {
                connectedDevices.delete(deviceId);
            }
            return res.json({
                success: true,
                message: '设备断开连接成功'
            });
        }
        catch (error) {
            console.error('断开设备连接失败:', error);
            return res.status(500).json({
                success: false,
                message: '断开设备连接失败',
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    /**
     * 获取已连接设备列表
     */
    async getConnectedDevices(req, res) {
        try {
            const { userId } = req.query;
            // 过滤用户的设备（如果指定了userId）
            const devices = Array.from(connectedDevices.values());
            if (userId) {
                // 这里可以根据userId过滤设备，目前返回所有设备
                // devices = devices.filter(device => device.userId === userId);
            }
            return res.json({
                success: true,
                data: devices,
                message: '获取连接设备列表成功'
            });
        }
        catch (error) {
            console.error('获取连接设备列表失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取连接设备列表失败',
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    /**
     * 模拟设备连接（用于测试）
     */
    async connectDevice(req, res) {
        try {
            const { connectionId, deviceInfo } = req.body;
            const connection = connections.get(connectionId);
            if (!connection) {
                return res.status(404).json({
                    success: false,
                    message: '连接不存在'
                });
            }
            if (connection.status === 'expired') {
                return res.status(400).json({
                    success: false,
                    message: '连接已过期'
                });
            }
            // 更新连接状态
            connection.status = 'connected';
            connection.deviceInfo = deviceInfo;
            connections.set(connectionId, connection);
            // 添加到已连接设备
            const device = {
                id: (0, uuid_1.v4)(),
                deviceId: deviceInfo.deviceId || (0, uuid_1.v4)(),
                deviceName: deviceInfo.deviceName || '未知设备',
                lastConnected: new Date().toISOString(),
                status: 'online',
                permissions: connection.permissions
            };
            connectedDevices.set(device.deviceId, device);
            return res.json({
                success: true,
                data: device,
                message: '设备连接成功'
            });
        }
        catch (error) {
            console.error('设备连接失败:', error);
            return res.status(500).json({
                success: false,
                message: '设备连接失败',
                error: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
}
exports.QRConnectionController = QRConnectionController;
exports.qrConnectionController = new QRConnectionController();
//# sourceMappingURL=qr-connection.js.map