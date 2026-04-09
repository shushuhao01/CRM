/**
 * 移动端 WebSocket 服务
 *
 * 使用原生 WebSocket（ws 库）为 APP 提供实时通信
 * 与 PC 端的 Socket.IO 服务分开
 */

import { Server as HTTPServer, IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { getDataSource } from '../config/database';
import { logger } from '../config/logger';
import { JwtConfig } from '../config/jwt';
import { URL } from 'url';

// 消息类型
interface WsMessage {
  type: string;
  messageId?: string;
  timestamp?: number;
  data?: any;
}

// 设备连接信息
interface DeviceConnection {
  ws: WebSocket;
  userId: number;
  deviceId: string;
  username: string;
  connectedAt: Date;
  lastHeartbeat: Date;
}

class MobileWebSocketService {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, DeviceConnection> = new Map(); // deviceId -> connection
  private userDevices: Map<number, Set<string>> = new Map(); // userId -> deviceIds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private initialized = false;

  /**
   * 初始化 WebSocket 服务
   */
  initialize(server: HTTPServer): void {
    try {
      // 使用 noServer 模式，手动处理升级请求
      this.wss = new WebSocketServer({
        noServer: true
      });

      // 监听 HTTP 服务器的 upgrade 事件
      server.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

        // 只处理 /ws/mobile 路径的请求
        if (pathname === '/ws/mobile') {
          this.wss?.handleUpgrade(request, socket, head, (ws) => {
            this.wss?.emit('connection', ws, request);
          });
        }
        // 其他路径（如 /socket.io/）由 Socket.IO 处理，不做任何操作
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req as IncomingMessage);
      });

      // 启动心跳检测
      this.startHeartbeatCheck();

      this.initialized = true;
      logger.info('📱 移动端 WebSocket 服务已初始化 (路径: /ws/mobile)');
    } catch (error: any) {
      logger.error('移动端 WebSocket 服务初始化失败:', error.message);
    }
  }

  /**
   * 处理新连接
   */
  private async handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
    try {
      // 从 URL 获取 token
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      logger.info(`[MobileWS] 收到连接请求, URL: ${req.url?.substring(0, 50)}...`);

      if (!token) {
        logger.warn('[MobileWS] 连接被拒绝：缺少 token');
        ws.close(4001, '认证失败：缺少 token');
        return;
      }

      logger.info(`[MobileWS] Token 长度: ${token.length}`);

      // 验证 token
      const deviceInfo = await this.verifyToken(token);
      if (!deviceInfo) {
        logger.warn('[MobileWS] 连接被拒绝：token 无效或设备未绑定');
        ws.close(4002, '认证失败：token 无效');
        return;
      }

      const { userId, deviceId, username } = deviceInfo;
      logger.info(`[MobileWS] 验证通过: userId=${userId}, deviceId=${deviceId}, username=${username}`);

      // 关闭该设备的旧连接
      const existingConn = this.connections.get(deviceId);
      if (existingConn) {
        logger.info(`[MobileWS] 关闭设备 ${deviceId} 的旧连接`);
        existingConn.ws.close(4003, '设备在其他地方连接');
      }

      // 保存新连接
      const connection: DeviceConnection = {
        ws,
        userId,
        deviceId,
        username,
        connectedAt: new Date(),
        lastHeartbeat: new Date()
      };

      this.connections.set(deviceId, connection);

      // 更新用户设备映射
      if (!this.userDevices.has(userId)) {
        this.userDevices.set(userId, new Set());
      }
      this.userDevices.get(userId)!.add(deviceId);

      logger.info(`📱 [MobileWS] 设备已连接: ${deviceId} (用户: ${username})`);

      // 更新数据库中的设备在线状态
      try {
        const dataSource = getDataSource();
        if (dataSource) {
          await dataSource.query(
            `UPDATE work_phones SET online_status = 'online', last_active_at = NOW() WHERE device_id = ?`,
            [deviceId]
          );
        }
      } catch (error: any) {
        logger.error('[MobileWS] 更新设备在线状态失败:', error.message);
      }

      // 通知 PC 端设备已上线
      if (global.webSocketService) {
        global.webSocketService.sendToUser(userId, 'DEVICE_ONLINE', {
          deviceId,
          userId,
          onlineAt: new Date().toISOString()
        });
      }

      // 发送连接成功消息
      this.sendToDevice(deviceId, {
        type: 'CONNECTED',
        data: {
          message: '连接成功',
          deviceId,
          serverTime: new Date().toISOString()
        }
      });

      // 设置消息处理
      ws.on('message', (data) => {
        this.handleMessage(deviceId, data.toString());
      });

      // 设置关闭处理
      ws.on('close', (code, _reason) => {
        logger.info(`📱 [MobileWS] 设备断开: ${deviceId} (code: ${code})`);
        this.removeConnection(deviceId, userId);
      });

      // 设置错误处理
      ws.on('error', (error) => {
        logger.error(`[MobileWS] 设备 ${deviceId} 错误:`, error.message);
      });

    } catch (error: any) {
      logger.error('[MobileWS] 处理连接失败:', error.message);
      ws.close(4000, '服务器错误');
    }
  }

  /**
   * 验证 WebSocket token
   */
  private async verifyToken(token: string): Promise<{ userId: number; deviceId: string; username: string } | null> {
    try {
      // 使用统一的JWT密钥管理（通过JwtConfig获取，避免硬编码默认值）
      const jwtSecret = JwtConfig.getAccessTokenSecret();
      logger.info(`[MobileWS] 验证 token, JWT_SECRET 长度: ${jwtSecret.length}, 前缀: ${jwtSecret.substring(0, 8)}...`);

      const decoded = jwt.verify(token, jwtSecret) as any;
      logger.info(`[MobileWS] Token 解码成功: deviceId=${decoded.deviceId}, userId=${decoded.userId}, type=${typeof decoded.userId}`);

      // wsToken 应该包含 deviceId 和 userId
      if (!decoded.deviceId || !decoded.userId) {
        logger.warn('[MobileWS] Token 缺少必要字段');
        return null;
      }

      // 验证设备绑定状态 - 从 work_phones 表查询
      const dataSource = getDataSource();
      if (!dataSource) {
        logger.error('[MobileWS] 数据库连接不可用');
        return null;
      }

      // 🔥 修复：同时支持字符串和数字类型的 userId
      const userIdStr = String(decoded.userId);
      const userIdNum = Number(decoded.userId);

      // 先查询 work_phones 表看看有什么数据
      const allPhones = await dataSource.query(
        `SELECT id, user_id, device_id, status FROM work_phones WHERE device_id = ?`,
        [decoded.deviceId]
      );
      logger.info(`[MobileWS] 按 device_id 查询结果: ${JSON.stringify(allPhones)}`);

      // 🔥 修复：使用字符串类型的 userId 进行查询（因为数据库中 user_id 是 VARCHAR）
      // 同时支持 active 和 online 状态
      const result = await dataSource.query(
        `SELECT wp.*, u.username, u.real_name
         FROM work_phones wp
         JOIN users u ON wp.user_id = u.id
         WHERE wp.device_id = ? AND wp.user_id = ? AND wp.status IN ('active', 'online')`,
        [decoded.deviceId, userIdStr]
      );
      logger.info(`[MobileWS] 完整查询结果(字符串userId): ${JSON.stringify(result)}`);

      // 如果字符串查询没结果，尝试数字类型
      if (!result || result.length === 0) {
        const resultNum = await dataSource.query(
          `SELECT wp.*, u.username, u.real_name
           FROM work_phones wp
           JOIN users u ON wp.user_id = u.id
           WHERE wp.device_id = ? AND wp.user_id = ? AND wp.status IN ('active', 'online')`,
          [decoded.deviceId, userIdNum]
        );
        logger.info(`[MobileWS] 完整查询结果(数字userId): ${JSON.stringify(resultNum)}`);

        if (resultNum && resultNum.length > 0) {
          return {
            userId: decoded.userId,
            deviceId: decoded.deviceId,
            username: resultNum[0].real_name || resultNum[0].username
          };
        }

        logger.warn(`[MobileWS] 设备未绑定或已失效: deviceId=${decoded.deviceId}, userId=${userIdStr}`);
        return null;
      }

      return {
        userId: decoded.userId,
        deviceId: decoded.deviceId,
        username: result[0].real_name || result[0].username
      };
    } catch (error: any) {
      logger.error('[MobileWS] Token 验证失败:', error.message);
      return null;
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(deviceId: string, rawData: string): void {
    try {
      const message: WsMessage = JSON.parse(rawData);
      const connection = this.connections.get(deviceId);

      if (!connection) return;

      logger.debug(`[MobileWS] 收到消息 from ${deviceId}: ${message.type}`);

      switch (message.type) {
        case 'HEARTBEAT':
        case 'ping':
          connection.lastHeartbeat = new Date();
          this.sendToDevice(deviceId, { type: 'HEARTBEAT_ACK' });
          break;

        case 'DEVICE_ONLINE':
          // 设备上线确认
          logger.info(`[MobileWS] 设备上线: ${deviceId}`);
          break;

        case 'CALL_STATUS':
          // 通话状态更新
          this.handleCallStatus(deviceId, connection.userId, message.data);
          break;

        case 'CALL_ENDED':
          // 通话结束
          this.handleCallEnded(deviceId, connection.userId, message.data);
          break;

        case 'DIAL_REJECTED':
          // 用户拒绝拨号
          this.handleDialRejected(deviceId, connection.userId, message.data);
          break;

        case 'DEVICE_OFFLINE':
          // APP 主动通知离线（如退出登录）
          logger.info(`[MobileWS] 设备主动离线: ${deviceId}, 原因: ${message.data?.reason}`);
          connection.ws.close(4005, '设备主动断开');
          break;

        default:
          logger.debug(`[MobileWS] 未知消息类型: ${message.type}`);
      }
    } catch (error: any) {
      logger.error(`[MobileWS] 解析消息失败:`, error.message);
    }
  }

  /**
   * 处理通话状态更新
   */
  private async handleCallStatus(deviceId: string, userId: number, data: any): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || !data.callId) return;

      const status = data.status;
      logger.info(`[MobileWS] 通话状态更新: ${data.callId} -> ${status}`);

      // 映射状态到数据库状态
      let dbStatus = status;
      if (status === 'connected' || status === 'offhook') {
        dbStatus = 'connected';
      } else if (status === 'ringing') {
        dbStatus = 'ringing';
      } else if (status === 'dialing') {
        dbStatus = 'dialing';
      }

      // 更新通话记录状态
      await dataSource.query(
        `UPDATE calls SET status = ?, updated_at = NOW() WHERE id = ?`,
        [dbStatus, data.callId]
      );

      // 转发通话状态给CRM端
      if (global.webSocketService) {
        global.webSocketService.sendToUser(userId, 'CALL_STATUS', {
          callId: data.callId,
          status: dbStatus,
          deviceId,
          timestamp: new Date().toISOString()
        });
        logger.info(`[MobileWS] 已转发通话状态给CRM端: userId=${userId}, status=${dbStatus}`);
      }
    } catch (error: any) {
      logger.error('[MobileWS] 更新通话状态失败:', error.message);
    }
  }

  /**
   * 处理通话结束
   */
  private async handleCallEnded(deviceId: string, userId: number, data: any): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || !data.callId) return;

      // 映射状态
      let finalStatus = 'completed';
      if (data.status === 'connected' || data.duration > 0) {
        finalStatus = 'connected';
      } else if (data.status === 'missed' || data.status === 'no_answer') {
        finalStatus = 'missed';
      } else if (data.status === 'busy') {
        finalStatus = 'busy';
      } else if (data.status === 'failed' || data.status === 'invalid') {
        finalStatus = 'failed';
      }

      // 更新 calls 表
      await dataSource.query(
        `UPDATE calls SET
          status = ?,
          duration = ?,
          end_time = NOW(),
          has_recording = ?,
          updated_at = NOW()
         WHERE id = ?`,
        [finalStatus, data.duration || 0, data.hasRecording ? 1 : 0, data.callId]
      );

      // 🔥 同时更新 call_records 表（APP端使用的表）
      await dataSource.query(
        `UPDATE call_records SET
          call_status = ?,
          duration = ?,
          end_time = NOW(),
          has_recording = ?,
          recording_url = COALESCE(?, recording_url),
          updated_at = NOW()
         WHERE id = ?`,
        [finalStatus, data.duration || 0, data.hasRecording ? 1 : 0, data.recordingUrl || null, data.callId]
      );

      logger.info(`[MobileWS] 通话结束: ${data.callId}, 状态: ${finalStatus}, 时长: ${data.duration}秒, 有录音: ${data.hasRecording}`);

      // 转发通话结束给CRM端
      if (global.webSocketService) {
        global.webSocketService.sendToUser(userId, 'CALL_ENDED', {
          callId: data.callId,
          duration: data.duration || 0,
          status: finalStatus,
          hasRecording: data.hasRecording || false,
          recordingUrl: data.recordingUrl || null,
          endReason: data.endReason || 'normal',
          deviceId,
          timestamp: new Date().toISOString()
        });
        logger.info(`[MobileWS] 已转发通话结束给CRM端: userId=${userId}, duration=${data.duration}, status=${finalStatus}`);
      }
    } catch (error: any) {
      logger.error('[MobileWS] 更新通话结束状态失败:', error.message);
    }
  }

  /**
   * 处理拨号被拒绝
   */
  private handleDialRejected(deviceId: string, userId: number, data: any): void {
    logger.info(`[MobileWS] 拨号被拒绝: ${data.callId}, 原因: ${data.reason}`);
    // 可以通知 PC 端
  }

  /**
   * 移除连接并更新设备状态
   */
  private async removeConnection(deviceId: string, userId: number): Promise<void> {
    this.connections.delete(deviceId);

    const devices = this.userDevices.get(userId);
    if (devices) {
      devices.delete(deviceId);
      if (devices.size === 0) {
        this.userDevices.delete(userId);
      }
    }

    // 更新数据库中的设备在线状态
    try {
      const dataSource = getDataSource();
      if (dataSource) {
        await dataSource.query(
          `UPDATE work_phones SET online_status = 'offline', last_active_at = NOW() WHERE device_id = ?`,
          [deviceId]
        );
        logger.info(`[MobileWS] 设备 ${deviceId} 状态已更新为离线`);
      }
    } catch (error: any) {
      logger.error('[MobileWS] 更新设备离线状态失败:', error.message);
    }

    // 通知 PC 端设备已离线
    if (global.webSocketService) {
      global.webSocketService.sendToUser(userId, 'DEVICE_OFFLINE', {
        deviceId,
        userId,
        offlineAt: new Date().toISOString()
      });
    }
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeatCheck(): void {
    // 每 60 秒检查一次
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 90 * 1000; // 90 秒超时

      this.connections.forEach((conn, deviceId) => {
        const elapsed = now.getTime() - conn.lastHeartbeat.getTime();
        if (elapsed > timeout) {
          logger.warn(`[MobileWS] 设备 ${deviceId} 心跳超时，断开连接`);
          conn.ws.close(4004, '心跳超时');
          this.removeConnection(deviceId, conn.userId);
        }
      });
    }, 60000);
  }

  // ==================== 公共方法 ====================

  /**
   * 发送消息到指定设备
   */
  sendToDevice(deviceId: string, message: WsMessage): boolean {
    const connection = this.connections.get(deviceId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      connection.ws.send(JSON.stringify({
        ...message,
        messageId: message.messageId || `msg_${Date.now()}`,
        timestamp: Date.now()
      }));
      return true;
    } catch (error: any) {
      logger.error(`[MobileWS] 发送消息失败:`, error.message);
      return false;
    }
  }

  /**
   * 发送消息到用户的所有设备
   */
  sendToUser(userId: number, message: WsMessage): number {
    const devices = this.userDevices.get(userId);
    if (!devices) return 0;

    let sent = 0;
    devices.forEach(deviceId => {
      if (this.sendToDevice(deviceId, message)) {
        sent++;
      }
    });
    return sent;
  }

  /**
   * 发送拨号指令
   */
  sendDialCommand(deviceId: string, data: {
    callId: string;
    phoneNumber: string;
    customerName?: string;
    customerId?: string;
    source: string;
  }): boolean {
    return this.sendToDevice(deviceId, {
      type: 'DIAL_COMMAND',
      data
    });
  }

  /**
   * 发送取消拨号指令
   */
  sendDialCancel(deviceId: string, callId: string): boolean {
    return this.sendToDevice(deviceId, {
      type: 'DIAL_CANCEL',
      data: { callId }
    });
  }

  /**
   * 发送结束通话指令（从CRM端结束通话时调用）
   */
  sendEndCall(deviceId: string, callId: string, reason?: string): boolean {
    logger.info(`[MobileWS] 发送结束通话指令到设备 ${deviceId}, callId: ${callId}`);
    return this.sendToDevice(deviceId, {
      type: 'CALL_END',
      data: {
        callId,
        reason: reason || 'crm_end',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 发送结束通话指令到用户的所有设备
   */
  sendEndCallToUser(userId: number, callId: string, reason?: string): number {
    const devices = this.userDevices.get(userId);
    if (!devices) return 0;

    let sent = 0;
    devices.forEach(deviceId => {
      if (this.sendEndCall(deviceId, callId, reason)) {
        sent++;
      }
    });
    return sent;
  }

  /**
   * 发送设备解绑通知
   */
  sendDeviceUnbind(deviceId: string): void {
    this.sendToDevice(deviceId, { type: 'DEVICE_UNBIND' });

    // 关闭连接
    const connection = this.connections.get(deviceId);
    if (connection) {
      setTimeout(() => {
        connection.ws.close(4005, '设备已解绑');
      }, 1000);
    }
  }

  /**
   * 检查设备是否在线
   */
  isDeviceOnline(deviceId: string): boolean {
    const conn = this.connections.get(deviceId);
    return conn !== undefined && conn.ws.readyState === WebSocket.OPEN;
  }

  /**
   * 获取用户的在线设备
   */
  getUserOnlineDevices(userId: number): string[] {
    const devices = this.userDevices.get(userId);
    if (!devices) return [];
    return Array.from(devices).filter(d => this.isDeviceOnline(d));
  }

  /**
   * 获取在线设备数量
   */
  getOnlineDeviceCount(): number {
    return this.connections.size;
  }

  /**
   * 服务是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 关闭服务
   */
  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.connections.forEach((conn) => {
      conn.ws.close(1001, '服务器关闭');
    });

    this.connections.clear();
    this.userDevices.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

export const mobileWebSocketService = new MobileWebSocketService();
export default mobileWebSocketService;
