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

        case 'INCOMING_CALL_DETECTED':
          // APP检测到来电
          this.handleIncomingCallDetected(deviceId, connection.userId, message.data);
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
      if (!dataSource || !data.status) return;

      const status = data.status;
      const phoneNumber = data.phoneNumber || '';
      let callId = data.callId;

      logger.info(`[MobileWS] 通话状态更新: callId=${callId}, status=${status}, phoneNumber=${phoneNumber}`);

      // 映射状态到数据库状态
      let dbStatus = status;
      if (status === 'connected' || status === 'offhook') {
        dbStatus = 'connected';
      } else if (status === 'ringing') {
        dbStatus = 'ringing';
      } else if (status === 'dialing') {
        dbStatus = 'dialing';
      }

      // 无 callId 时按号码查找最近的 ringing 呼入记录
      if (!callId && phoneNumber && phoneNumber !== '未知来电') {
        const records = await dataSource.query(
          `SELECT id FROM call_records
           WHERE user_id = ? AND call_type = 'inbound' AND call_status = 'ringing'
           ORDER BY created_at DESC LIMIT 1`,
          [String(userId)]
        );
        if (records.length > 0) {
          callId = records[0].id;
        }
      }

      // 更新通话记录状态（有 callId 时才更新）
      if (callId) {
        await dataSource.query(
          `UPDATE call_records SET call_status = ?, updated_at = NOW() WHERE id = ?`,
          [dbStatus, callId]
        );
      }

      // 无论 callId 是否匹配到记录，都转发通话状态给CRM端（让弹窗关闭）
      if (global.webSocketService) {
        global.webSocketService.sendToUser(userId, 'CALL_STATUS', {
          callId: callId || '',
          status: dbStatus,
          phoneNumber,
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
      if (!dataSource) return;

      let callId = data.callId;
      const phoneNumber = data.phoneNumber || '';

      // 无 callId 或 callId 在数据库中不存在时，按号码查找最近的呼入记录
      if (callId) {
        const existing = await dataSource.query(
          `SELECT id FROM call_records WHERE id = ? LIMIT 1`, [callId]
        );
        if (existing.length === 0) {
          callId = null; // 数据库中不存在，置空后按号码查找
        }
      }
      if (!callId && phoneNumber && phoneNumber !== '未知来电') {
        // ⚠️ 防串号：优先匹配号码相同或号码未知的记录，且限定10分钟内，避免更新到别的通话
        const records = await dataSource.query(
          `SELECT id FROM call_records
           WHERE user_id = ? AND call_type = 'inbound'
             AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
             AND (customer_phone = ? OR customer_phone IS NULL OR customer_phone = '' OR customer_phone = '未知来电')
           ORDER BY created_at DESC LIMIT 1`,
          [String(userId), phoneNumber]
        );
        if (records.length > 0) {
          callId = records[0].id;
        }
      }
      // 如果还是没有 callId，但有"未知来电"号码，查找该用户最近的呼入记录（限定10分钟内）
      if (!callId) {
        const records = await dataSource.query(
          `SELECT id FROM call_records
           WHERE user_id = ? AND call_type = 'inbound'
             AND created_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)
           ORDER BY created_at DESC LIMIT 1`,
          [String(userId)]
        );
        if (records.length > 0) {
          callId = records[0].id;
        }
      }

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

      // 有 callId 时更新通话记录
      if (callId) {
        await dataSource.query(
          `UPDATE call_records SET
            call_status = ?,
            duration = ?,
            end_time = NOW(),
            has_recording = ?,
            recording_url = COALESCE(?, recording_url),
            updated_at = NOW()
           WHERE id = ?`,
          [finalStatus, data.duration || 0, data.hasRecording ? 1 : 0, data.recordingUrl || null, callId]
        );

        // 如果号码有效，重新匹配客户信息
        const phoneNum = data.phoneNumber || '';
        if (phoneNum && phoneNum !== '未知来电' && phoneNum !== '') {
          // 先把记录中的号码更新为真实号码（即使匹配不到客户——新客户场景，
          // 否则 CRM 通话记录会一直显示"未知来电"）
          try {
            await dataSource.query(
              `UPDATE call_records SET customer_phone = ?, updated_at = NOW()
               WHERE id = ? AND (customer_phone IS NULL OR customer_phone = '' OR customer_phone = '未知来电')`,
              [phoneNum, callId]
            );
          } catch (phoneErr: any) {
            logger.warn(`[MobileWS] 更新通话记录号码失败: ${phoneErr.message}`);
          }
          try {
            const normalizedNum = phoneNum.replace(/[\s\-()]/g, '').replace(/^(\+?86)?0?/, '');
            const possibleNums = [phoneNum, normalizedNum, `+86${normalizedNum}`, `86${normalizedNum}`, `0${normalizedNum}`];
            const placeholders = possibleNums.map(() => '?').join(',');
            // 备用号码存在 other_phones JSON 数组中（customers 表没有 mobile 列）
            const otherPhonesCond = possibleNums.map(() => 'JSON_CONTAINS(c.other_phones, JSON_QUOTE(?))').join(' OR ');
            // 🔒 租户隔离：只匹配本通话记录所属租户的客户（不同租户可能存在相同号码的客户）
            let recTenantId: string | null = null;
            try {
              const recRows = await dataSource.query(
                `SELECT tenant_id FROM call_records WHERE id = ? LIMIT 1`, [callId]
              );
              recTenantId = recRows[0]?.tenant_id || null;
            } catch (_e) { /* 忽略 */ }
            const tenantCond = recTenantId ? ' AND c.tenant_id = ?' : ' AND c.tenant_id IS NULL';
            const tenantParams = recTenantId ? [recTenantId] : [];
            const customers = await dataSource.query(
              `SELECT id, name FROM customers c
               WHERE (REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                      OR ${otherPhonesCond}
                     )${tenantCond}
               LIMIT 1`,
              [...possibleNums, ...possibleNums, ...tenantParams]
            );
            if (customers.length > 0) {
              await dataSource.query(
                `UPDATE call_records SET customer_id = ?, customer_name = ?, customer_phone = ?, updated_at = NOW() WHERE id = ?`,
                [customers[0].id, customers[0].name, phoneNum, callId]
              );
              logger.info(`[MobileWS] 通话结束重新匹配客户成功: ${customers[0].name}`);
            }
          } catch (matchErr: any) {
            logger.warn(`[MobileWS] 通话结束重新匹配客户失败: ${matchErr.message}`);
          }
        }
      }

      logger.info(`[MobileWS] 通话结束: callId=${callId}, 状态: ${finalStatus}, 时长: ${data.duration}秒`);

      // 无论 callId 是否匹配到记录，都转发通话结束给CRM端（让弹窗关闭/更新号码）
      if (global.webSocketService) {
        global.webSocketService.sendToUser(userId, 'CALL_ENDED', {
          callId: callId || '',
          duration: data.duration || 0,
          status: finalStatus,
          phoneNumber: phoneNumber || '',
          hasRecording: data.hasRecording || false,
          recordingUrl: data.recordingUrl || null,
          endReason: data.endReason || 'normal',
          deviceId,
          timestamp: new Date().toISOString()
        });
        logger.info(`[MobileWS] 已转发通话结束给CRM端: userId=${userId}, duration=${data.duration}, status=${finalStatus}, phone=${phoneNumber}`);
      }

      // 如果是 number_updated 类型（后台补获号码），额外发送号码更新通知（含客户匹配结果）
      if (data.endReason === 'number_updated' && phoneNumber && phoneNumber !== '未知来电') {
        let customerName = '来电客户';
        let customerId = null;
        let customerLevel = '';
        // 查询客户信息
        try {
          const normalizedNum = phoneNumber.replace(/[\s\-()]/g, '').replace(/^(\+?86)?0?/, '');
          const possibleNums = [phoneNumber, normalizedNum, `+86${normalizedNum}`, `86${normalizedNum}`, `0${normalizedNum}`];
          const placeholders = possibleNums.map(() => '?').join(',');
          const customers = await dataSource.query(
            `SELECT id, name, level FROM customers
             WHERE (REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                    OR REPLACE(REPLACE(REPLACE(REPLACE(mobile, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                   )
             LIMIT 1`,
            [...possibleNums, ...possibleNums]
          );
          if (customers.length > 0) {
            customerName = customers[0].name;
            customerId = customers[0].id;
            customerLevel = customers[0].level || '';
          }
        } catch (e: any) {
          logger.warn(`[MobileWS] 号码更新客户匹配失败: ${e.message}`);
        }

        global.webSocketService.sendToUser(userId, 'CALL_NUMBER_UPDATED', {
          callId: callId || '',
          phoneNumber,
          customerName,
          customerId,
          customerLevel,
          timestamp: new Date().toISOString()
        });
        logger.info(`[MobileWS] 号码更新通知已发送: callId=${callId}, phone=${phoneNumber}, customer=${customerName}`);
      }
    } catch (error: any) {
      logger.error('[MobileWS] 更新通话结束状态失败:', error.message);
    }
  }

  /**
   * 处理APP检测到的来电（呼入）
   */
  private async handleIncomingCallDetected(
    deviceId: string, userId: number, data: any
  ): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource || !data.callerNumber) return;

      const callerNumber = data.callerNumber;
      logger.info(`[MobileWS] APP检测到来电: ${callerNumber}, deviceId: ${deviceId}`);

      // 1. 先获取租户ID（用于客户查询的租户隔离）
      let tenantId = null;
      let phoneName = '';
      try {
        const phoneInfo = await dataSource.query(
          `SELECT tenant_id, phone_number, device_name FROM work_phones
           WHERE device_id = ? LIMIT 1`, [deviceId]
        );
        tenantId = phoneInfo[0]?.tenant_id || null;
        phoneName = phoneInfo[0]?.device_name || phoneInfo[0]?.phone_number || '';
      } catch (_e) {
        // 忽略
      }
      // 🔒 兜底：work_phones 未记录租户时，从用户表取（避免 SaaS 下跨租户匹配客户）
      if (!tenantId) {
        try {
          const userRows = await dataSource.query(
            `SELECT tenant_id FROM users WHERE id = ? LIMIT 1`, [String(userId)]
          );
          tenantId = userRows[0]?.tenant_id || null;
        } catch (_e) { /* 忽略 */ }
      }

      // 2. 查找客户信息（带租户隔离）
      let customerId = null;
      let customerName = '未知来电';
      let customerLevel = null;
      let company = null;
      let lastCallTime = null;
      let tags: string[] = [];

      try {
        // 规范化来电号码：去除 +86、86 前缀、空格、横线、开头的0
        const normalizedNumber = callerNumber.replace(/[\s\-()]/g, '').replace(/^(\+?86)?0?/, '');
        // 生成多种可能的号码格式进行匹配
        const possibleNumbers = [
          callerNumber,
          normalizedNumber,
          `+86${normalizedNumber}`,
          `86${normalizedNumber}`,
          `0${normalizedNumber}`,
        ];
        const placeholders = possibleNumbers.map(() => '?').join(',');
        // 🔒 严格租户隔离：有租户时只匹配本租户客户；无租户（私有部署）只匹配无租户客户
        const tenantFilter = tenantId ? ' AND c.tenant_id = ?' : ' AND c.tenant_id IS NULL';
        // 备用号码存在 other_phones JSON 数组中（customers 表没有 mobile 列）
        const otherPhonesCond = possibleNumbers.map(() => 'JSON_CONTAINS(c.other_phones, JSON_QUOTE(?))').join(' OR ');
        const queryParams: any[] = [...possibleNumbers, ...possibleNumbers];
        if (tenantId) queryParams.push(tenantId);

        const customers = await dataSource.query(
          `SELECT c.id, c.name, c.level, c.company, c.tags,
                  (SELECT MAX(start_time) FROM call_records
                   WHERE customer_id = c.id) as last_call
           FROM customers c
           WHERE (REPLACE(REPLACE(REPLACE(REPLACE(c.phone, ' ', ''), '-', ''), '(', ''), ')', '') IN (${placeholders})
                  OR ${otherPhonesCond}
                 )${tenantFilter}
           LIMIT 1`,
          queryParams
        );

        if (customers.length > 0) {
          const cust = customers[0];
          customerId = cust.id;
          customerName = cust.name;
          customerLevel = cust.level;
          company = cust.company;
          lastCallTime = cust.last_call;
          try {
            tags = cust.tags ? JSON.parse(cust.tags) : [];
          } catch (_e) {
            tags = [];
          }
        }
      } catch (err: any) {
        logger.warn('[MobileWS] 查询客户信息失败:', err.message);
      }

      // 区分三种状态：已有客户（匹配成功）/ 新客户（号码有效但系统中不存在）/ 未知来电（号码未获取到）
      const hasValidNumber = !!callerNumber && callerNumber !== '未知来电';
      const isNewCustomer = hasValidNumber && !customerId;
      if (isNewCustomer) {
        customerName = '新客户';
      }

      // 3. 创建或更新呼入通话记录
      // 检查30秒内是否已有该用户的呼入记录（APP可能先报"未知来电"再报真实号码）
      // ⚠️ 防串号：只复用"仍在响铃中"的记录（已结束的上一通不能被下一通复用），
      //    且若两条记录都有有效号码但不一致，视为新的一通来电，不复用
      let callId = `IN-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      let isUpdate = false;
      try {
        const existing = await dataSource.query(
          `SELECT id, customer_phone FROM call_records
           WHERE user_id = ? AND call_type = 'inbound'
             AND call_status = 'ringing'
             AND created_at > DATE_SUB(NOW(), INTERVAL 30 SECOND)
           ORDER BY created_at DESC LIMIT 1`,
          [String(userId)]
        );
        if (existing.length > 0) {
          const prevPhone = existing[0].customer_phone || '';
          const prevValid = prevPhone && prevPhone !== '未知来电';
          const currValid = callerNumber && callerNumber !== '未知来电';
          if (prevValid && currValid && prevPhone !== callerNumber) {
            logger.info(`[MobileWS] 30秒内存在响铃记录但号码不同(${prevPhone} vs ${callerNumber})，创建新记录`);
          } else {
            callId = existing[0].id;
            isUpdate = true;
            logger.info(`[MobileWS] 检测到30秒内响铃中的呼入记录，更新记录: ${callId}`);
          }
        }
      } catch (_e) { /* 忽略 */ }

      let userName = '';
      try {
        const userInfo = await dataSource.query(
          `SELECT name, real_name FROM users WHERE id = ? LIMIT 1`, [userId]
        );
        userName = userInfo[0]?.real_name || userInfo[0]?.name || '';
      } catch (_e) {
        // 忽略
      }

      try {
        if (isUpdate) {
          // 更新现有记录的号码和客户信息
          await dataSource.query(
            `UPDATE call_records SET
             customer_id = ?, customer_name = ?, customer_phone = ?
             WHERE id = ?`,
            [customerId, customerName, callerNumber, callId]
          );
        } else {
          await dataSource.query(
            `INSERT INTO call_records
             (id, customer_id, customer_name, customer_phone, call_type, call_status,
              call_method, user_id, user_name, start_time, created_at, tenant_id)
             VALUES (?, ?, ?, ?, 'inbound', 'ringing', 'mobile', ?, ?, NOW(), NOW(), ?)`,
            [callId, customerId, customerName, callerNumber,
             String(userId), userName, tenantId]
          );
        }
      } catch (err: any) {
        logger.error('[MobileWS] 创建/更新呼入通话记录失败:', err.message);
      }

      // 4. 推送来电通知给CRM端
      if ((global as any).webSocketService) {
        (global as any).webSocketService.sendToUser(userId, 'CALL_INCOMING', {
          callId,
          callerNumber,
          callSource: 'mobile',
          customerInfo: {
            customerId,
            customerName,
            customerLevel,
            company,
            lastCallTime,
            tags,
            isNewCustomer
          },
          deviceInfo: {
            deviceId,
            phoneName
          },
          timestamp: new Date().toISOString()
        });
      }

      // 5. 回传callId给APP
      this.sendToDevice(deviceId, {
        type: 'INCOMING_CALL_CONFIRMED',
        data: {
          callId,
          callerNumber,
          customerName,
          customerId,
          isNewCustomer
        }
      });

      logger.info(`[MobileWS] 来电已处理: callId=${callId}, customer=${customerName}`);
    } catch (error: any) {
      logger.error('[MobileWS] 处理来电检测失败:', error.message);
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
