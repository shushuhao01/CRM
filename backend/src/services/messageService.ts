/**
 * 消息服务
 * 用于发送系统消息和第三方通知
 */
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database';
import { SystemMessage } from '../entities/SystemMessage';

import { log } from '../config/logger';
export interface SendMessageOptions {
  type: string;
  title: string;
  content: string;
  targetUserId: string;
  priority?: 'normal' | 'high' | 'urgent';
  category?: string;
  relatedId?: string;
  relatedType?: string;
  actionUrl?: string;
  createdBy?: string;
}

/**
 * 发送系统消息
 */
export async function sendSystemMessage(options: SendMessageOptions): Promise<void> {
  try {
    const messageRepo = AppDataSource.getRepository(SystemMessage);

    const message = messageRepo.create({
      id: uuidv4(),
      type: options.type,
      title: options.title,
      content: options.content,
      priority: options.priority || 'normal',
      category: options.category || '系统通知',
      targetUserId: options.targetUserId,
      createdBy: options.createdBy,
      relatedId: options.relatedId,
      relatedType: options.relatedType,
      actionUrl: options.actionUrl,
      isRead: 0
    });

    await messageRepo.save(message);

    // 🔥 通过WebSocket实时推送消息
    if (global.webSocketService) {
      global.webSocketService.pushSystemMessage({
        id: message.id,
        type: message.type,
        title: message.title,
        content: message.content,
        priority: message.priority as any,
        relatedId: message.relatedId,
        relatedType: message.relatedType,
        actionUrl: message.actionUrl
      }, { userId: options.targetUserId });
      log.info(`[消息服务] 🔌 WebSocket推送: ${options.title} -> 用户 ${options.targetUserId}`);
    }

    log.info(`[消息服务] ✅ 发送成功: ${options.title} -> 用户 ${options.targetUserId}`);
  } catch (error) {
    log.error('[消息服务] 发送失败:', error);
    throw error;
  }
}

/**
 * 批量发送系统消息
 */
export async function sendBatchSystemMessages(messages: SendMessageOptions[]): Promise<void> {
  try {
    const messageRepo = AppDataSource.getRepository(SystemMessage);

    const messageEntities = messages.map(msg => messageRepo.create({
      id: uuidv4(),
      type: msg.type,
      title: msg.title,
      content: msg.content,
      priority: msg.priority || 'normal',
      category: msg.category || '系统通知',
      targetUserId: msg.targetUserId,
      createdBy: msg.createdBy,
      relatedId: msg.relatedId,
      relatedType: msg.relatedType,
      actionUrl: msg.actionUrl,
      isRead: 0
    }));

    await messageRepo.save(messageEntities);

    // 🔥 通过WebSocket实时推送消息
    if (global.webSocketService) {
      messageEntities.forEach(message => {
        global.webSocketService.pushSystemMessage({
          id: message.id,
          type: message.type,
          title: message.title,
          content: message.content,
          priority: message.priority as any,
          relatedId: message.relatedId,
          relatedType: message.relatedType,
          actionUrl: message.actionUrl
        }, { userId: message.targetUserId });
      });
    }

    log.info(`[消息服务] ✅ 批量发送成功: ${messageEntities.length} 条消息`);
  } catch (error) {
    log.error('[消息服务] 批量发送失败:', error);
    throw error;
  }
}


export const messageService = {
  sendMessage: sendSystemMessage,
  sendBatchMessages: sendBatchSystemMessages,
  createSystemMessage: sendSystemMessage
};

export default messageService;
