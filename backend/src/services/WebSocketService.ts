/**
 * WebSocket实时推送服务
 *
 * 功能：
 * - 用户认证与连接管理
 * - 系统消息实时推送
 * - 第三方通知状态反馈
 * - 支持按用户/角色/部门定向推送
 *
 * 创建日期：2025-12-19
 *
 * 注意：需要先安装 socket.io: npm install socket.io
 */

import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { getDataSource } from '../config/database';
import { User } from '../entities/User';
import { SystemMessage } from '../entities/SystemMessage';
import { logger } from '../config/logger';
import { getTenantRepo } from '../utils/tenantRepo';

// 消息推送数据接口
interface PushMessageData {
  id?: string;
  type: string;
  title: string;
  content: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  relatedId?: string | number;
  relatedType?: string;
  actionUrl?: string;
  metadata?: any;
}

class WebSocketService {
  private io: any = null;
  private connectedUsers: Map<string, Set<string>> = new Map(); // 🔥 修复：用户ID改为string类型
  private socketToUser: Map<string, string> = new Map(); // 🔥 修复：用户ID改为string类型
  private initialized = false;

  /**
   * 初始化WebSocket服务
   */
  async initialize(server: HTTPServer): Promise<void> {
    try {
      // 动态导入socket.io
      const { Server: SocketIOServer } = await import('socket.io');

      const corsOrigins = process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || ['http://localhost:5173'];

      logger.info('🔌 WebSocket CORS配置:', corsOrigins);

      this.io = new SocketIOServer(server, {
        cors: {
          origin: corsOrigins,
          methods: ['GET', 'POST'],
          credentials: true
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        // 允许更长的连接超时
        connectTimeout: 45000
      });

      this.setupMiddleware();
      this.setupEventHandlers();
      this.initialized = true;

      logger.info('🔌 WebSocket服务已初始化');
    } catch (error: any) {
      logger.warn('⚠️ WebSocket服务初始化失败（可能未安装socket.io）', error.message);
      logger.info('💡 请运行: cd backend && npm install socket.io');
    }
  }

  /**
   * 设置认证中间件
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use(async (socket: any, next: any) => {
      try {
        const token = socket.handshake?.auth?.token ||
                      socket.handshake?.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('认证失败：未提供Token'));
        }

        const jwtSecret = process.env.JWT_SECRET || 'crm-secret-key';
        const decoded = jwt.verify(token, jwtSecret) as any;

        const dataSource = getDataSource();
        if (!dataSource) {
          return next(new Error('数据库连接失败'));
        }

        const userRepo = getTenantRepo(User);
        const user = await userRepo.findOne({
          where: { id: decoded.userId || decoded.id }
        });

        if (!user || user.status !== 'active') {
          return next(new Error('认证失败：用户不存在或已禁用'));
        }

        socket.userId = user.id;
        socket.username = user.username;
        socket.userRole = user.role;
        socket.departmentId = user.departmentId;

        next();
      } catch (error: any) {
        logger.error('WebSocket认证失败:', error.message);
        next(new Error('认证失败：Token无效'));
      }
    });
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: any) => {
      const userId = socket.userId;

      logger.info(`👤 用户 ${socket.username}(${userId}) 已连接WebSocket`);

      this.addConnection(userId, socket.id);

      socket.join(`user_${userId}`);

      if (socket.userRole) {
        socket.join(`role_${socket.userRole}`);
      }

      if (socket.departmentId) {
        socket.join(`department_${socket.departmentId}`);
      }

      socket.emit('connected', {
        message: '实时消息推送已连接',
        userId,
        timestamp: new Date().toISOString()
      });

      this.sendUnreadCount(socket);

      socket.on('mark_read', async (data: { messageId: string }) => {
        await this.handleMarkRead(socket, data.messageId);
      });

      socket.on('mark_all_read', async () => {
        await this.handleMarkAllRead(socket);
      });

      socket.on('get_unread_count', async () => {
        await this.sendUnreadCount(socket);
      });

      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      socket.on('disconnect', (reason: string) => {
        logger.info(`👤 用户 ${socket.username}(${userId}) 断开连接: ${reason}`);
        this.removeConnection(userId, socket.id);
      });
    });
  }

  private addConnection(userId: string, socketId: string): void {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId)!.add(socketId);
    this.socketToUser.set(socketId, userId);
  }

  private removeConnection(userId: string, socketId: string): void {
    const sockets = this.connectedUsers.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }
    this.socketToUser.delete(socketId);
  }

  private async sendUnreadCount(socket: any): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      const messageRepo = getTenantRepo(SystemMessage);

      const count = await messageRepo
        .createQueryBuilder('msg')
        .where('msg.isRead = :isRead', { isRead: false })
        .andWhere('(msg.targetUserId = :userId OR msg.targetUserId IS NULL)', { userId: socket.userId })
        .getCount();

      socket.emit('unread_count', { count });
    } catch (error) {
      logger.error('获取未读数量失败:', error);
    }
  }

  private async handleMarkRead(socket: any, messageId: string): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      const messageRepo = getTenantRepo(SystemMessage);
      await messageRepo.update(
        { id: messageId },
        { isRead: 1, readAt: new Date() }
      );

      await this.sendUnreadCount(socket);
      socket.emit('message_read', { messageId, success: true });
    } catch (error) {
      logger.error('标记已读失败:', error);
      socket.emit('message_read', { messageId, success: false });
    }
  }

  private async handleMarkAllRead(socket: any): Promise<void> {
    try {
      const dataSource = getDataSource();
      if (!dataSource) return;

      const messageRepo = getTenantRepo(SystemMessage);
      await messageRepo
        .createQueryBuilder()
        .update()
        .set({ isRead: 1, readAt: new Date() })
        .where('isRead = :isRead', { isRead: 0 })
        .andWhere('(targetUserId = :userId OR targetUserId IS NULL)', { userId: socket.userId })
        .execute();

      socket.emit('unread_count', { count: 0 });
      socket.emit('all_read', { success: true });
    } catch (error) {
      logger.error('标记全部已读失败:', error);
    }
  }

  // ==================== 公共推送方法 ====================

  sendToUser(userId: string | number, event: string, data: any): void {
    if (!this.io || !this.initialized) return;

    // 🔥 修复：支持字符串和数字类型的用户ID
    const userIdStr = String(userId);
    this.io.to(`user_${userIdStr}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`📤 推送消息给用户 ${userIdStr}: ${event}`);
  }

  sendToRole(roleName: string, event: string, data: any): void {
    if (!this.io || !this.initialized) return;

    this.io.to(`role_${roleName}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`📤 推送消息给角色 ${roleName}: ${event}`);
  }

  sendToDepartment(departmentId: string | number, event: string, data: any): void {
    if (!this.io || !this.initialized) return;

    // 🔥 修复：支持字符串和数字类型的部门ID
    const deptIdStr = String(departmentId);
    this.io.to(`department_${deptIdStr}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`📤 推送消息给部门 ${deptIdStr}: ${event}`);
  }

  broadcast(event: string, data: any): void {
    if (!this.io || !this.initialized) return;

    this.io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });

    logger.debug(`📢 广播消息: ${event}`);
  }

  pushSystemMessage(message: PushMessageData, target?: {
    userId?: string | number;  // 🔥 修复：支持字符串类型的用户ID
    roleName?: string;
    departmentId?: string | number;  // 🔥 修复：支持字符串类型的部门ID
  }): void {
    if (!this.initialized) return;

    const event = 'new_message';
    const payload = {
      id: message.id || `msg_${Date.now()}`,
      type: message.type,
      title: message.title,
      content: message.content,
      priority: message.priority || 'normal',
      relatedId: message.relatedId,
      relatedType: message.relatedType,
      actionUrl: message.actionUrl,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    // 🔥 修复：确保有有效的目标，避免意外广播
    // 支持字符串和数字类型的用户ID
    if (target?.userId) {
      const userIdStr = String(target.userId);
      if (userIdStr && userIdStr !== 'undefined' && userIdStr !== 'null' && userIdStr !== 'NaN') {
        this.sendToUser(userIdStr, event, payload);
        logger.info(`[WebSocket] 📤 推送消息给用户 ${userIdStr}: ${message.title}`);
      } else {
        logger.warn(`[WebSocket] ⚠️ 无效的用户ID: ${target.userId}，跳过推送`);
      }
    } else if (target?.roleName) {
      this.sendToRole(target.roleName, event, payload);
    } else if (target?.departmentId) {
      const deptIdStr = String(target.departmentId);
      if (deptIdStr && deptIdStr !== 'undefined' && deptIdStr !== 'null' && deptIdStr !== 'NaN') {
        this.sendToDepartment(deptIdStr, event, payload);
      }
    } else {
      // 🔥 修复：如果没有有效目标，不广播，只记录警告
      logger.warn(`[WebSocket] ⚠️ pushSystemMessage 没有有效目标，跳过推送: ${message.title}`);
      // 注释掉广播，避免消息发送给所有人
      // this.broadcast(event, payload);
    }
  }

  pushNotificationStatus(userId: string | number, status: {
    channelType: string;
    channelName: string;
    success: boolean;
    message: string;
  }): void {
    this.sendToUser(userId, 'notification_status', status);
  }

  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  isUserOnline(userId: string | number): boolean {
    return this.connectedUsers.has(String(userId));
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
