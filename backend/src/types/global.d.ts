/**
 * 全局类型声明
 */

import { WebSocketService } from '../services/WebSocketService';

declare global {
  var webSocketService: typeof import('../services/WebSocketService').webSocketService;
}

export {};
