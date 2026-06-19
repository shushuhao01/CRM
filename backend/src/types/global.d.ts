/**
 * 全局类型声明
 */

import { WebSocketService } from '../services/WebSocketService';

declare module 'ffmpeg-static' {
  const path: string;
  export default path;
}

declare global {
  var webSocketService: typeof import('../services/WebSocketService').webSocketService;
}

export {};
