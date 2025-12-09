"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRConnectionController = void 0;
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
class QRConnectionController {
    constructor() {
        this.connectionSessions = new Map();
        this.connectedDevices = new Map();
    }
    // 生成连接二维码
    async generateQRCode(req, res) {
        try {
            const { userId, permissions = ['call', 'sms', 'sync'] } = req.body;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID不能为空'
                });
            }
            const connectionId = (0, uuid_1.v4)();
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟过期
            const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
            const session = {
                id: connectionId,
                token,
                userId,
                createdAt: new Date(),
                expiresAt,
                status: 'pending',
                serverUrl,
                permissions
            };
            this.connectionSessions.set(connectionId, session);
            // 生成二维码数据
            const qrData = {
                connectionId,
                token,
                serverUrl,
                permissions,
                expiresAt: expiresAt.getTime()
            };
            // 清理过期的会话
            this.cleanExpiredSessions();
            return res.json({
                success: true,
                data: {
                    connectionId,
                    qrData: JSON.stringify(qrData),
                    expiresAt,
                    permissions
                },
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
    // 验证扫码并建立连接
    async connectDevice(req, res) {
        try {
            const { connectionId, token, deviceInfo } = req.body;
            if (!connectionId || !token || !deviceInfo) {
                return res.status(400).json({
                    success: false,
                    message: '连接参数不完整'
                });
            }
            const session = this.connectionSessions.get(connectionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: '连接会话不存在'
                });
            }
            if (session.status !== 'pending') {
                return res.status(400).json({
                    success: false,
                    message: '连接会话已失效'
                });
            }
            if (session.token !== token) {
                return res.status(401).json({
                    success: false,
                    message: '连接令牌无效'
                });
            }
            if (new Date() > session.expiresAt) {
                session.status = 'expired';
                return res.status(410).json({
                    success: false,
                    message: '连接会话已过期'
                });
            }
            // 生成设备连接令牌
            const deviceConnectionToken = crypto.randomBytes(32).toString('hex');
            const deviceId = deviceInfo.deviceId || (0, uuid_1.v4)();
            // 创建连接设备记录
            const connectedDevice = {
                id: (0, uuid_1.v4)(),
                deviceId,
                deviceName: deviceInfo.deviceName || '未知设备',
                userId: session.userId,
                connectionToken: deviceConnectionToken,
                lastConnected: new Date(),
                status: 'online',
                permissions: session.permissions
            };
            this.connectedDevices.set(deviceId, connectedDevice);
            session.status = 'connected';
            session.deviceInfo = deviceInfo;
            return res.json({
                success: true,
                data: {
                    deviceId,
                    connectionToken: deviceConnectionToken,
                    serverUrl: session.serverUrl,
                    permissions: session.permissions,
                    userId: session.userId
                },
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
    // 获取连接状态
    async getConnectionStatus(req, res) {
        try {
            const { connectionId } = req.params;
            const session = this.connectionSessions.get(connectionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    message: '连接会话不存在'
                });
            }
            return res.json({
                success: true,
                data: {
                    status: session.status,
                    createdAt: session.createdAt,
                    expiresAt: session.expiresAt,
                    deviceInfo: session.deviceInfo
                },
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
    // 断开设备连接
    async disconnectDevice(req, res) {
        try {
            const { connectionId } = req.params;
            const { deviceId } = req.body;
            if (deviceId) {
                const device = this.connectedDevices.get(deviceId);
                if (device) {
                    device.status = 'offline';
                }
            }
            const session = this.connectionSessions.get(connectionId);
            if (session) {
                session.status = 'expired';
            }
            return res.json({
                success: true,
                message: '设备已断开连接'
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
    // 获取已连接设备列表
    async getConnectedDevices(req, res) {
        try {
            const { userId } = req.query;
            let devices = Array.from(this.connectedDevices.values());
            if (userId) {
                devices = devices.filter(device => device.userId === userId);
            }
            return res.json({
                success: true,
                data: devices.map(device => ({
                    id: device.id,
                    deviceId: device.deviceId,
                    deviceName: device.deviceName,
                    lastConnected: device.lastConnected,
                    status: device.status,
                    permissions: device.permissions
                }))
            });
        }
        catch (error) {
            console.error('获取设备列表失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取设备列表失败'
            });
        }
    }
    // 重新连接设备
    async reconnectDevice(req, res) {
        try {
            const { deviceId, connectionToken } = req.body;
            if (!deviceId || !connectionToken) {
                return res.status(400).json({
                    success: false,
                    message: '设备ID和连接令牌不能为空'
                });
            }
            const device = this.connectedDevices.get(deviceId);
            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: '设备不存在'
                });
            }
            if (device.connectionToken !== connectionToken) {
                return res.status(401).json({
                    success: false,
                    message: '连接令牌无效'
                });
            }
            // 更新设备状态
            device.status = 'online';
            device.lastConnected = new Date();
            return res.json({
                success: true,
                data: {
                    deviceId: device.deviceId,
                    deviceName: device.deviceName,
                    permissions: device.permissions,
                    userId: device.userId
                },
                message: '设备重连成功'
            });
        }
        catch (error) {
            console.error('设备重连失败:', error);
            return res.status(500).json({
                success: false,
                message: '设备重连失败'
            });
        }
    }
    // 清理过期的会话
    cleanExpiredSessions() {
        const now = new Date();
        for (const [id, session] of this.connectionSessions.entries()) {
            if (now > session.expiresAt) {
                session.status = 'expired';
                // 可以选择删除过期会话，或保留一段时间用于日志
                // this.connectionSessions.delete(id);
            }
        }
    }
}
exports.QRConnectionController = QRConnectionController;
//# sourceMappingURL=QRConnectionController.js.map