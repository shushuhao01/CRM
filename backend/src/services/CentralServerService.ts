/**
 * 中央服务器通信服务 - 私有部署专用
 *
 * 统一管理私有部署实例与云客中央服务器之间的所有通信。
 * 所有回调请求经此服务发出，便于统一监控、日志、重试和故障降级。
 *
 * 中央服务器: api.yunkes.com
 * 请求目标:   https://api.yunkes.com/api/v1/admin/...
 */

import { getCentralAdminApiUrl, CENTRAL_API_ENDPOINTS } from '../config/centralServer';
import { log } from '../config/logger';

/** 请求超时（毫秒） */
const DEFAULT_TIMEOUT = 10000;
/** 心跳/非关键请求超时 */
const HEARTBEAT_TIMEOUT = 8000;

interface CentralRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  timeout?: number;
  /** 静默模式：失败不打 error 日志，仅 warn */
  silent?: boolean;
}

interface CentralResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  offline?: boolean;
}

class CentralServerServiceClass {

  /** 连通性状态 */
  private _reachable: boolean = true;
  private _lastCheckTime: number = 0;
  private _consecutiveFailures: number = 0;

  /**
   * 底层请求方法 — 所有对中央服务器的请求都经此发出
   */
  async request<T = any>(endpoint: string, options: CentralRequestOptions = {}): Promise<CentralResponse<T>> {
    const { method = 'GET', body, timeout = DEFAULT_TIMEOUT, silent = false } = options;
    const baseUrl = getCentralAdminApiUrl();
    const url = `${baseUrl}${endpoint}`;

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(timeout),
      };

      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      log.debug(`[CentralServer] ${method} ${endpoint}`);

      const response = await fetch(url, fetchOptions);
      const result = await response.json() as any;

      // 恢复连通性标记
      this._reachable = true;
      this._consecutiveFailures = 0;
      this._lastCheckTime = Date.now();

      return {
        success: result.success !== false,
        data: result.data,
        message: result.message,
      };
    } catch (error: any) {
      this._consecutiveFailures++;
      if (this._consecutiveFailures >= 3) {
        this._reachable = false;
      }
      this._lastCheckTime = Date.now();

      if (silent) {
        log.warn(`[CentralServer] ${method} ${endpoint} 失败（静默）: ${error.message}`);
      } else {
        log.error(`[CentralServer] ${method} ${endpoint} 失败: ${error.message}`);
      }

      return {
        success: false,
        message: `中央服务器通信失败: ${error.message}`,
        offline: true,
      };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 一、授权与安全
  // ═══════════════════════════════════════════════════════════

  /**
   * 1. 授权码激活/验证
   */
  async verifyLicense(licenseKey: string, machineId: string): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.LICENSE_VERIFY, {
      method: 'POST',
      body: { licenseKey, machineId },
      timeout: DEFAULT_TIMEOUT,
    });
  }

  /**
   * 2. 租户授权验证
   */
  async verifyTenantLicense(tenantId: string, licenseKey: string): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.TENANT_LICENSE_VERIFY, {
      method: 'POST',
      body: { tenantId, licenseKey },
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  /**
   * 3. 版本更新检查
   */
  async checkVersion(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.VERSION_CHECK, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 二、系统配置
  // ═══════════════════════════════════════════════════════════

  /**
   * 4. 获取管理后台系统配置（品牌/版权/功能开关/分发配置）
   */
  async getSystemConfig(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.SYSTEM_CONFIG, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 三、企微管理
  // ═══════════════════════════════════════════════════════════

  /**
   * 5. 获取企微套餐与定价
   */
  async getWecomPricing(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.WECOM_PRICING, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  /**
   * 6. 获取AI可用模型列表
   */
  async getAiModels(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.WECOM_AI_MODELS, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  /**
   * 7. 获取AI计费配置
   */
  async getAiBillingConfig(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.WECOM_AI_BILLING, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  /**
   * 8. 获取AI全局设置
   */
  async getAiGlobalSettings(): Promise<CentralResponse> {
    return this.request(CENTRAL_API_ENDPOINTS.WECOM_AI_GLOBAL_SETTINGS, {
      silent: true,
      timeout: HEARTBEAT_TIMEOUT,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 公共方法
  // ═══════════════════════════════════════════════════════════

  /** 中央服务器是否可达 */
  isReachable(): boolean {
    return this._reachable;
  }

  /** 连续失败次数 */
  getConsecutiveFailures(): number {
    return this._consecutiveFailures;
  }

  /** 获取状态摘要 */
  getStatus(): {
    reachable: boolean;
    adminApiUrl: string;
    consecutiveFailures: number;
    lastCheckTime: string | null;
  } {
    return {
      reachable: this._reachable,
      adminApiUrl: getCentralAdminApiUrl(),
      consecutiveFailures: this._consecutiveFailures,
      lastCheckTime: this._lastCheckTime ? new Date(this._lastCheckTime).toISOString() : null,
    };
  }
}

export const centralServerService = new CentralServerServiceClass();
export default centralServerService;
