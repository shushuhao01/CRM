/**
 * 阿里云外呼服务（云联络中心 CCC）
 *
 * 采用「双呼 StartBack2BackCall」模式对接阿里云云联络中心：
 *   1. CRM 发起外呼 -> 阿里云先呼叫员工号码（号码分配中的 agent_phone，缺省回退 users.phone）
 *   2. 员工接听后，阿里云再呼叫客户，双方接通
 *   3. 客户看到的来电显示为主叫号码（号码分配的专属号码 > 线路/全局默认），无需软电话/SIP话机
 *
 * 通话结束后通过轮询 GetCallDetailRecord 获取话单，
 * 并通过 GetMonoRecording 获取录音地址。
 *
 * 依赖: @alicloud/ccc20200701 @alicloud/openapi-client @alicloud/tea-util
 * 配置优先级: call_lines.config > global_call_config.aliyun_config（网络电话配置Tab）
 */

import { AppDataSource } from '../config/database';
import { tenantRawSQL, getCurrentTenantIdSafe } from '../utils/tenantHelpers';
import { decryptSecret } from '../utils/secretCipher';
import { log } from '../config/logger';

// 阿里云配置接口
interface AliyunConfig {
  accessKeyId: string;
  accessKeySecret: string;
  /** 云联络中心实例ID（如 ccc-xxxx），历史字段名为 appId */
  appId: string;
  callerNumber: string;
  region: string;
  enableRecording: boolean;
  recordingBucket?: string;
  /**
   * 外呼方式:
   * - double_call: 双呼（默认，系统先呼员工手机，无需设备）
   * - softphone: 软电话（员工登录阿里云坐席工作台，用浏览器+耳机/USB话务盒接听）
   * - hardphone: 硬话机（SIP话机注册到云联络中心，坐席工作台选择话机接听）
   */
  callMode?: 'double_call' | 'softphone' | 'hardphone';
}

// 外呼请求参数
interface MakeCallParams {
  lineId: string;
  customerPhone: string;
  customerName?: string;
  customerId?: string;
  userId: string;
  userName?: string;
}

// 外呼结果
interface CallResult {
  success: boolean;
  callId?: string;
  providerCallId?: string;
  message: string;
}

// 通话状态回调数据
interface CallStatusCallback {
  callId: string;
  providerCallId: string;
  status: 'dialing' | 'ringing' | 'connected' | 'released';
  timestamp: string;
  duration?: number;
  releaseReason?: string;
}

// CCC OpenAPI 公网接入点（云联络中心统一在华东2上海）
const CCC_ENDPOINT = process.env.ALIYUN_CCC_ENDPOINT || 'ccc.cn-shanghai.aliyuncs.com';

// 话单轮询参数：首次延迟10秒，之后每10秒一次，最长轮询2小时
// （挂断后CRM端"通话中"窗口依赖此轮询感知结束，间隔越短状态同步越及时）
const POLL_FIRST_DELAY_MS = 10 * 1000;
const POLL_INTERVAL_MS = 10 * 1000;
const POLL_MAX_ATTEMPTS = 720;

// 录音获取重试延迟：话单先生成、录音文件后上传（recordingReady 有延迟），
// 结束时拿不到就按此间隔重试，避免错过录音
const RECORDING_RETRY_DELAYS_MS = [15000, 30000, 60000, 120000, 300000];

class AliyunCallService {
  private static instance: AliyunCallService;
  private sweepTimer: NodeJS.Timeout | null = null;
  private isSweeping = false;

  private constructor() {
    // 补救扫描：进程内轮询定时器会因服务重启而丢失，导致云通话卡在"通话中"、
    // 录音漏获取。启动后60秒首扫，之后每10分钟扫一次近24小时的云通话记录兜底
    setTimeout(() => this.sweepCloudCallRecords().catch(() => { /* ignore */ }), 60 * 1000);
    this.sweepTimer = setInterval(
      () => this.sweepCloudCallRecords().catch(() => { /* ignore */ }),
      10 * 60 * 1000
    );
    // 定时器不阻止进程退出
    if (this.sweepTimer.unref) this.sweepTimer.unref();
  }

  static getInstance(): AliyunCallService {
    if (!AliyunCallService.instance) {
      AliyunCallService.instance = new AliyunCallService();
    }
    return AliyunCallService.instance;
  }

  /**
   * 补救扫描近24小时的云通话记录：
   * 1. 卡在 calling/dialing 状态超过2分钟的 → 查话单，已结束则补更新状态并推送CALL_ENDED
   * 2. 已接通但没有录音的 → 重新尝试获取录音
   * 覆盖场景：后端重启丢失轮询定时器、录音上传延迟超过重试窗口等
   */
  private async sweepCloudCallRecords(): Promise<void> {
    if (this.isSweeping) return;
    this.isSweeping = true;
    try {
      if (!AppDataSource?.isInitialized) return;

      const rows = await AppDataSource.query(
        `SELECT id, line_id, provider_call_id, call_status, duration
         FROM call_records
         WHERE call_method = 'cloud'
           AND provider_call_id IS NOT NULL AND provider_call_id != ''
           AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
           AND created_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)
           AND (
             call_status IN ('calling', 'dialing', 'ringing')
             OR (call_status = 'connected' AND (recording_url IS NULL OR recording_url = ''))
           )
         ORDER BY created_at DESC LIMIT 50`
      );
      if (rows.length === 0) return;

      log.info(`[AliyunCallService] 补救扫描：发现 ${rows.length} 条待处理云通话记录`);
      const configCache = new Map<string, AliyunConfig | null>();

      for (const row of rows) {
        try {
          let config = configCache.get(row.line_id);
          if (config === undefined) {
            config = await this.getLineConfig(row.line_id);
            configCache.set(row.line_id, config);
          }
          if (!config || !config.accessKeyId) continue;

          if (['calling', 'dialing', 'ringing'].includes(row.call_status)) {
            // 状态卡住：查话单，已结束则补更新（finalizeCall内会推CALL_ENDED并取录音）
            const { CCC, TeaUtil } = this.loadSdk();
            const client = this.createClient(config);
            const request = new CCC.GetCallDetailRecordRequest({
              instanceId: config.appId,
              contactId: row.provider_call_id
            });
            const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 15000, connectTimeout: 10000 });
            const response = await client.getCallDetailRecordWithOptions(request, runtime);
            const data = response?.body?.data;
            if (data && data.releaseTime && Number(data.releaseTime) > 0) {
              log.info(`[AliyunCallService] 补救扫描：补更新卡住的通话 ${row.id}`);
              await this.finalizeCall(row.id, row.provider_call_id, row.line_id, config, data);
            }
          } else if (config.enableRecording) {
            // 已接通但缺录音：直接重试获取录音
            log.info(`[AliyunCallService] 补救扫描：补取录音 ${row.id}`);
            this.fetchRecordingWithRetry(row.id, row.provider_call_id, config, Number(row.duration) || 0, true);
          }
        } catch (itemError: any) {
          const msg = String(itemError?.message || '');
          if (!/NotExist|NotFound/i.test(msg)) {
            log.warn(`[AliyunCallService] 补救扫描处理记录 ${row.id} 失败:`, msg);
          }
        }
      }
    } catch (error: any) {
      log.warn('[AliyunCallService] 补救扫描失败:', error?.message || error);
    } finally {
      this.isSweeping = false;
    }
  }

  /**
   * 运行时加载阿里云 CCC SDK（未安装时给出明确提示，不影响后端启动）
   */
  private loadSdk(): { CCC: any; OpenApi: any; TeaUtil: any } {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CCC = require('@alicloud/ccc20200701');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OpenApi = require('@alicloud/openapi-client');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TeaUtil = require('@alicloud/tea-util');
      return { CCC, OpenApi, TeaUtil };
    } catch (_e) {
      throw new Error('阿里云CCC SDK未安装，请在 backend 目录执行: npm install @alicloud/ccc20200701 @alicloud/openapi-client @alicloud/tea-util');
    }
  }

  /**
   * 创建 CCC OpenAPI 客户端
   */
  private createClient(config: AliyunConfig): any {
    const { CCC, OpenApi } = this.loadSdk();
    const apiConfig = new OpenApi.Config({
      accessKeyId: config.accessKeyId,
      accessKeySecret: config.accessKeySecret,
      endpoint: CCC_ENDPOINT
    });
    const ClientClass = CCC.default || CCC;
    return new ClientClass(apiConfig);
  }

  /**
   * 获取全局网络电话配置（呼出配置 -> 网络电话配置 Tab 保存的 aliyun_config）
   */
  async getGlobalAliyunConfig(): Promise<Partial<AliyunConfig> | null> {
    try {
      const t = tenantRawSQL();
      const rows = await AppDataSource.query(
        `SELECT config_value FROM global_call_config WHERE config_key = 'aliyun_config'${t.sql} LIMIT 1`,
        [...t.params]
      );
      if (rows.length === 0 || !rows[0].config_value) {
        return null;
      }
      const value = typeof rows[0].config_value === 'string'
        ? JSON.parse(rows[0].config_value)
        : rows[0].config_value;
      if (value?.accessKeySecret) {
        value.accessKeySecret = decryptSecret(value.accessKeySecret);
      }
      return value || null;
    } catch (error) {
      log.warn('[AliyunCallService] 读取全局阿里云配置失败:', error);
      return null;
    }
  }

  /**
   * 获取线路配置（线路自身配置缺失时回退到全局网络电话配置）
   */
  async getLineConfig(lineId: string): Promise<AliyunConfig | null> {
    try {
      const t = tenantRawSQL();
      const lines = await AppDataSource.query(
        `SELECT * FROM call_lines WHERE id = ? AND provider = 'aliyun' AND status = 'active'${t.sql}`,
        [lineId, ...t.params]
      );

      if (lines.length === 0) {
        return null;
      }

      const line = lines[0];
      let config: Record<string, any> = {};
      if (line.config) {
        config = typeof line.config === 'string' ? JSON.parse(line.config) : line.config;
      }
      if (config.accessKeySecret) {
        config.accessKeySecret = decryptSecret(config.accessKeySecret);
      }

      // 线路未填写 AccessKey 时，回退使用「网络电话配置」中的全局凭证
      if (!config.accessKeyId || !config.accessKeySecret) {
        const globalConfig = await this.getGlobalAliyunConfig();
        if (globalConfig) {
          config = { ...globalConfig, ...this.stripEmpty(config) };
        }
      }

      return {
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret || '',
        appId: config.appId || '',
        callerNumber: line.caller_number || config.callerNumber || '',
        region: config.region || 'cn-shanghai',
        enableRecording: config.enableRecording !== false,
        recordingBucket: config.recordingBucket,
        callMode: config.callMode || 'double_call'
      };
    } catch (error) {
      log.error('获取阿里云线路配置失败:', error);
      return null;
    }
  }

  /** 去除对象中的空值字段，避免线路空配置覆盖全局配置 */
  private stripEmpty(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null && v !== '') {
        result[k] = v;
      }
    }
    return result;
  }

  /**
   * 查询员工外呼号码（双呼模式的第一路被叫）
   * 优先级：号码分配中填写的"员工工作号码" > 用户资料中的手机号
   */
  private async getAgentPhone(userId: string, lineId: string): Promise<{ phone: string | null; source: string }> {
    try {
      const tA = tenantRawSQL();
      const assignments = await AppDataSource.query(
        `SELECT agent_phone FROM user_line_assignments WHERE user_id = ? AND line_id = ? AND is_active = 1${tA.sql} LIMIT 1`,
        [userId, lineId, ...tA.params]
      );
      const assignedPhone = assignments[0]?.agent_phone;
      if (assignedPhone && String(assignedPhone).trim()) {
        return { phone: String(assignedPhone).trim(), source: '号码分配' };
      }
    } catch (error) {
      log.warn('[AliyunCallService] 查询分配的员工工作号码失败:', error);
    }

    try {
      const t = tenantRawSQL();
      const rows = await AppDataSource.query(
        `SELECT phone FROM users WHERE id = ?${t.sql} LIMIT 1`,
        [userId, ...t.params]
      );
      const phone = rows[0]?.phone;
      return { phone: phone ? String(phone).trim() : null, source: '用户资料' };
    } catch (error) {
      log.warn('[AliyunCallService] 查询员工手机号失败:', error);
      return { phone: null, source: '' };
    }
  }

  /**
   * 查询分配给用户的外显号码（主叫号码优先级：分配的号码 > 线路/全局默认）
   */
  private async getAssignedCallerNumber(userId: string, lineId: string): Promise<string | null> {
    try {
      const t = tenantRawSQL();
      const rows = await AppDataSource.query(
        `SELECT caller_number FROM user_line_assignments WHERE user_id = ? AND line_id = ? AND is_active = 1${t.sql} LIMIT 1`,
        [userId, lineId, ...t.params]
      );
      const num = rows[0]?.caller_number;
      return num && String(num).trim() ? String(num).trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 查询分配给用户的云联络中心坐席账号（软电话/硬话机模式使用）
   */
  private async getAssignedCccUserId(userId: string, lineId: string): Promise<string | null> {
    try {
      const t = tenantRawSQL();
      const rows = await AppDataSource.query(
        `SELECT ccc_user_id FROM user_line_assignments WHERE user_id = ? AND line_id = ? AND is_active = 1${t.sql} LIMIT 1`,
        [userId, lineId, ...t.params]
      );
      const id = rows[0]?.ccc_user_id;
      return id && String(id).trim() ? String(id).trim() : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 发起外呼（双呼模式）
   */
  async makeCall(params: MakeCallParams): Promise<CallResult> {
    try {
      const config = await this.getLineConfig(params.lineId);

      if (!config) {
        return {
          success: false,
          message: '线路配置不存在或未启用'
        };
      }

      if (!config.accessKeyId || !config.accessKeySecret) {
        return {
          success: false,
          message: '阿里云AccessKey未配置，请在呼出配置的「网络电话配置」中填写并保存'
        };
      }

      if (!config.appId) {
        return {
          success: false,
          message: '云联络中心实例ID未配置（如 ccc-xxxx），请在「网络电话配置」的实例ID中填写'
        };
      }

      // 主叫号码优先级：号码分配中分配给该员工的号码 > 线路/全局默认号码
      const assignedCaller = await this.getAssignedCallerNumber(params.userId, params.lineId);
      const callerNumber = assignedCaller || config.callerNumber;
      if (!callerNumber) {
        return {
          success: false,
          message: '主叫号码未配置，请在「号码分配」中为该员工分配号码，或在「网络电话配置」中设置默认主叫号码'
        };
      }
      config.callerNumber = callerNumber;

      // 外呼方式：双呼（默认）/ 软电话 / 硬话机
      const callMode = config.callMode || 'double_call';

      let userPhone: string | null = null;
      let cccUserId: string | null = null;

      if (callMode === 'double_call') {
        // 双呼模式需要先呼叫员工的工作号码
        const agent = await this.getAgentPhone(params.userId, params.lineId);
        userPhone = agent.phone;
        if (!userPhone) {
          return {
            success: false,
            message: '未找到员工外呼号码：请在「号码分配」中为该员工填写工作号码，或在用户资料中补充手机号'
          };
        }
        log.info(`[AliyunCallService] [双呼] 员工外呼号码: ${userPhone}（来源: ${agent.source}），主叫外显: ${callerNumber}`);
      } else {
        // 软电话/硬话机模式：通过坐席工作台呼出，需要绑定云联络中心坐席账号
        cccUserId = await this.getAssignedCccUserId(params.userId, params.lineId);
        if (!cccUserId) {
          return {
            success: false,
            message: '当前为坐席工作台外呼模式（软电话/硬话机），请在「号码分配」中为该员工绑定云联络中心坐席账号'
          };
        }
        log.info(`[AliyunCallService] [${callMode === 'softphone' ? '软电话' : '硬话机'}] 坐席: ${cccUserId}，主叫外显: ${callerNumber}`);
      }

      // 生成通话记录ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      const tenantId = getCurrentTenantIdSafe() || null;

      // 创建通话记录
      await AppDataSource.query(
        `INSERT INTO call_records
         (id, tenant_id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, line_id, caller_number, user_id, user_name, start_time, created_at)
         VALUES (?, ?, ?, ?, ?, 'outbound', 'calling', 'cloud', ?, ?, ?, ?, NOW(), NOW())`,
        [
          callId,
          tenantId,
          params.customerId || null,
          params.customerName || null,
          params.customerPhone,
          params.lineId,
          config.callerNumber,
          params.userId,
          params.userName || null
        ]
      );

      // 更新线路使用统计
      const tLine = tenantRawSQL();
      await AppDataSource.query(
        `UPDATE call_lines SET
         current_concurrent = current_concurrent + 1,
         daily_used = daily_used + 1,
         total_calls = total_calls + 1,
         last_used_at = NOW()
         WHERE id = ?${tLine.sql}`,
        [params.lineId, ...tLine.params]
      );

      // 调用阿里云云联络中心外呼API（按外呼方式分流）
      let providerCallId: string;
      try {
        const { CCC, TeaUtil } = this.loadSdk();
        const client = this.createClient(config);
        const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 15000, connectTimeout: 10000, autoretry: true, maxAttempts: 5 });
        // 注意：不传 Tags 参数（阿里云对其格式校验严格，曾导致 Parameter.Format 报错）
        // 内部 callId 与阿里云通话的关联依靠 provider_call_id（JobId/ContactId）+ 轮询

        let body: any;
        if (callMode === 'double_call') {
          const request = new CCC.StartBack2BackCallRequest({
            instanceId: config.appId,
            // 第一路：先呼叫员工手机
            caller: userPhone,
            // 第二路：员工接听后呼叫客户
            callee: params.customerPhone,
            // 中转号码：实例下的固话，双方看到的来电显示
            broker: config.callerNumber,
            timeoutSeconds: 60
          });
          const response = await client.startBack2BackCallWithOptions(request, runtime);
          body = response?.body;
        } else {
          // 软电话/硬话机：MakeCall 通过坐席工作台呼出，先振铃坐席设备（网页软电话或SIP话机）
          const request = new CCC.MakeCallRequest({
            instanceId: config.appId,
            userId: cccUserId,
            caller: config.callerNumber,
            callee: params.customerPhone,
            timeoutSeconds: 60
          });
          const response = await client.makeCallWithOptions(request, runtime);
          body = response?.body;
        }

        if (!body || body.code !== 'OK') {
          // 保留阿里云错误码，便于 friendlyApiError 做针对性中文提示
          const apiErr: any = new Error(`阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}`);
          apiErr.code = body?.code || 'Unknown';
          apiErr.data = body;
          throw apiErr;
        }

        providerCallId = body.data?.callContext?.jobId
          || body.data?.callContext?.contactId
          || body.data?.callContext?.channelContexts?.[0]?.jobId
          || body.data?.contextId
          || '';
        if (!providerCallId) {
          log.warn('[AliyunCallService] 外呼成功但未获取到 JobId/ContactId, 响应:', JSON.stringify(body.data || {}));
          providerCallId = `aliyun_${Date.now()}`;
        }
      } catch (apiError: any) {
        // API 调用失败：标记记录失败并回滚并发计数
        // 注意：这里的数据库操作必须兜底，不能让DB错误盖住真正的阿里云报错
        log.error('[AliyunCallService] 调用阿里云外呼API失败:', apiError);
        try {
          const tFail = tenantRawSQL();
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'failed', end_time = NOW(), hangup_cause = ? WHERE id = ?${tFail.sql}`,
            [this.truncateCause(apiError.message || '阿里云API调用失败'), callId, ...tFail.params]
          );
          await AppDataSource.query(
            `UPDATE call_lines SET current_concurrent = GREATEST(0, current_concurrent - 1) WHERE id = ?${tFail.sql}`,
            [params.lineId, ...tFail.params]
          );
        } catch (dbError: any) {
          log.error('[AliyunCallService] 标记失败记录时数据库出错:', dbError.message);
        }
        return {
          success: false,
          message: this.friendlyApiError(apiError)
        };
      }

      // 更新通话记录的服务商ID（ContactId/JobId）
      const tUpdate = tenantRawSQL();
      await AppDataSource.query(
        `UPDATE call_records SET provider_call_id = ? WHERE id = ?${tUpdate.sql}`,
        [providerCallId, callId, ...tUpdate.params]
      );

      // 启动话单轮询：通话结束后自动更新时长/状态/录音
      this.pollContactResult(callId, providerCallId, params.lineId, config);

      const modeMessages: Record<string, string> = {
        double_call: '双呼已发起，请接听您的手机后系统将自动呼叫客户',
        softphone: '外呼已发起，请在阿里云坐席工作台（网页软电话）接听后接通客户',
        hardphone: '外呼已发起，请在SIP话机上接听后接通客户'
      };
      log.info(`[AliyunCallService] 外呼已发起(${callMode}): ${callId} -> 客户:${params.customerPhone} (JobId: ${providerCallId})`);

      return {
        success: true,
        callId,
        providerCallId,
        message: modeMessages[callMode] || modeMessages.double_call
      };
    } catch (error: any) {
      log.error('阿里云外呼失败:', error);
      return {
        success: false,
        message: error.message || '外呼失败'
      };
    }
  }

  /**
   * 轮询话单（GetCallDetailRecord），通话结束后更新记录并获取录音
   */
  private pollContactResult(callId: string, contactId: string, lineId: string, config: AliyunConfig): void {
    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const { CCC, TeaUtil } = this.loadSdk();
        const client = this.createClient(config);
        const request = new CCC.GetCallDetailRecordRequest({
          instanceId: config.appId,
          contactId
        });
        const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 15000, connectTimeout: 10000 });
        const response = await client.getCallDetailRecordWithOptions(request, runtime);
        const data = response?.body?.data;

        if (data && data.releaseTime && Number(data.releaseTime) > 0) {
          // 通话已结束
          await this.finalizeCall(callId, contactId, lineId, config, data);
          return;
        }
      } catch (error: any) {
        // 通话未结束时话单可能尚未生成（NotFound），继续轮询
        const msg = String(error?.message || '');
        if (!/NotExist|NotFound/i.test(msg)) {
          log.warn(`[AliyunCallService] 轮询话单异常(${callId}):`, msg);
        }
      }

      if (attempts < POLL_MAX_ATTEMPTS) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        log.warn(`[AliyunCallService] 话单轮询超时(${callId})，停止轮询`);
      }
    };

    setTimeout(poll, POLL_FIRST_DELAY_MS);
  }

  /**
   * 通话结束：更新通话记录、线路统计并获取录音
   */
  private async finalizeCall(callId: string, contactId: string, lineId: string, config: AliyunConfig, cdr: any): Promise<void> {
    try {
      const established = cdr.establishedTime && Number(cdr.establishedTime) > 0;
      const duration = Number(cdr.callDuration) || 0;
      const releaseDate = new Date(Number(cdr.releaseTime));

      // 未接通时解析失败原因（SIP错误码等），得到更精确的状态和用户可读的原因
      let finalStatus = established && duration > 0 ? 'connected' : 'missed';
      let failReason: string | null = null;
      let rawReason: string | null = null;
      if (finalStatus !== 'connected') {
        const analyzed = this.analyzeCallFailure(cdr);
        finalStatus = analyzed.status;
        failReason = analyzed.reason;
        rawReason = analyzed.raw;
      }

      const t = tenantRawSQL();
      await AppDataSource.query(
        `UPDATE call_records SET
         call_status = ?,
         end_time = ?,
         duration = ?,
         hangup_cause = ?
         WHERE id = ?${t.sql}`,
        [
          finalStatus,
          releaseDate,
          duration,
          this.truncateCause(failReason ? `${rawReason || ''} ${failReason}`.trim() : (cdr.contactDisposition || cdr.releaseReason)),
          callId,
          ...t.params
        ]
      );

      // 更新线路并发数和统计
      const tLine = tenantRawSQL();
      await AppDataSource.query(
        `UPDATE call_lines SET
         current_concurrent = GREATEST(0, current_concurrent - 1),
         total_duration = total_duration + ?
         WHERE id = ?${tLine.sql}`,
        [duration, lineId, ...tLine.params]
      );

      log.info(`[AliyunCallService] 通话结束(${callId}): 状态=${finalStatus}, 时长=${duration}s`);

      // 获取录音（阿里云地址有效期1天，下载到CRM本地/云存储持久保存）
      // 🔥 注意竞态：话单（releaseTime）先生成，录音文件上传到阿里云有延迟，
      // 此时 recordingReady 可能还是 false——不能只看一次就放弃，已接通的通话
      // 都进入带重试的录音获取流程（后台异步，不阻塞结束处理）
      if (config.enableRecording && established && duration > 0) {
        this.fetchRecordingWithRetry(callId, contactId, config, duration, !!cdr.recordingReady);
      }

      // 推送通话结束到PC端（与工作手机流程使用相同的 CALL_ENDED 事件，前端会自动关闭通话窗口）
      if ((global as any).webSocketService) {
        const tWs = tenantRawSQL();
        const callRecords = await AppDataSource.query(
          `SELECT user_id, recording_url FROM call_records WHERE id = ?${tWs.sql}`,
          [callId, ...tWs.params]
        );
        if (callRecords.length > 0) {
          (global as any).webSocketService.sendToUser(
            callRecords[0].user_id,
            'CALL_ENDED',
            {
              callId,
              status: finalStatus,
              duration,
              hasRecording: !!callRecords[0].recording_url,
              recordingUrl: callRecords[0].recording_url || null,
              endReason: 'normal',
              // 未接通的失败原因（SIP错误码翻译），前端弹提示并显示在通话窗口
              failReason: failReason || null,
              failRaw: rawReason || null
            }
          );
        }
      }
    } catch (error) {
      log.error(`[AliyunCallService] 处理通话结束失败(${callId}):`, error);
    }
  }

  /**
   * 带重试获取录音：立即尝试一次，失败/未就绪则按 RECORDING_RETRY_DELAYS_MS
   * 重试（共约8分钟窗口），成功后下载持久化并推送录音就绪事件给CRM端
   */
  private fetchRecordingWithRetry(
    callId: string,
    contactId: string,
    config: AliyunConfig,
    duration: number,
    readyHint: boolean
  ): void {
    let attempt = 0;

    const tryFetch = async (): Promise<boolean> => {
      try {
        // 已有录音则不再重复获取（可能被上一次重试或补救扫描处理过）
        const rows = await AppDataSource.query(
          `SELECT recording_url FROM call_records WHERE id = ? LIMIT 1`,
          [callId]
        );
        if (rows.length === 0) return true; // 记录不存在，停止
        if (rows[0].recording_url) return true;

        const { CCC, TeaUtil } = this.loadSdk();
        const client = this.createClient(config);
        const request = new CCC.GetMonoRecordingRequest({
          instanceId: config.appId,
          contactId,
          expireSeconds: 86400
        });
        const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 15000, connectTimeout: 10000 });
        const response = await client.getMonoRecordingWithOptions(request, runtime);
        const fileUrl = response?.body?.data?.fileUrl;
        if (!fileUrl) return false; // 录音尚未就绪，继续重试

        const recDuration = Math.round((Number(response.body.data.duration) || 0) / 1000) || duration;
        await this.persistRecording(callId, fileUrl, recDuration);

        // 推送录音就绪事件，CRM端刷新通话记录后即可播放
        try {
          const recRows = await AppDataSource.query(
            `SELECT user_id, recording_url FROM call_records WHERE id = ? LIMIT 1`,
            [callId]
          );
          if (recRows.length > 0 && recRows[0].recording_url && (global as any).webSocketService) {
            (global as any).webSocketService.sendToUser(recRows[0].user_id, 'CALL_RECORDING_READY', {
              callId,
              recordingUrl: recRows[0].recording_url
            });
          }
        } catch (_pushErr) { /* 推送失败不影响录音已保存 */ }

        log.info(`[AliyunCallService] 录音获取成功(${callId})，第${attempt + 1}次尝试`);
        return true;
      } catch (error: any) {
        // 录音未就绪时阿里云可能返回 NotFound 类错误，属正常，继续重试
        const msg = String(error?.message || '');
        if (!/NotExist|NotFound|NotReady/i.test(msg)) {
          log.warn(`[AliyunCallService] 获取录音失败(${callId}, 第${attempt + 1}次):`, msg);
        }
        return false;
      }
    };

    const run = async () => {
      const done = await tryFetch();
      if (done) return;
      if (attempt >= RECORDING_RETRY_DELAYS_MS.length) {
        log.warn(`[AliyunCallService] 录音获取重试耗尽(${callId})，等待补救扫描兜底`);
        return;
      }
      const delay = RECORDING_RETRY_DELAYS_MS[attempt];
      attempt++;
      setTimeout(run, delay);
    };

    // 话单显示录音已就绪则立即取；否则先等第一个重试间隔（给录音上传留时间）
    if (readyHint) {
      run();
    } else {
      attempt = 1;
      setTimeout(run, RECORDING_RETRY_DELAYS_MS[0]);
    }
  }

  /**
   * 持久化录音：下载阿里云录音（临时地址1天过期）保存到CRM存储（本地/OSS/COS），
   * 通话记录里存的是CRM自己的永久地址，随时可播放。下载失败时回退存阿里云临时地址。
   */
  private async persistRecording(callId: string, remoteUrl: string, duration: number): Promise<void> {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(remoteUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: 200 * 1024 * 1024
      });
      const buffer = Buffer.from(response.data);
      if (!buffer.length) {
        throw new Error('录音文件内容为空');
      }

      // 通话元数据（客户/员工信息一并存入录音库）
      const t = tenantRawSQL();
      const records = await AppDataSource.query(
        `SELECT customer_id, customer_name, customer_phone, user_id, user_name FROM call_records WHERE id = ?${t.sql} LIMIT 1`,
        [callId, ...t.params]
      );
      const meta = records[0] || {};

      const { recordingStorageService } = await import('./RecordingStorageService');
      const saved = await recordingStorageService.saveRecording(callId, buffer, {
        format: 'wav',
        duration,
        customerId: meta.customer_id,
        customerName: meta.customer_name,
        customerPhone: meta.customer_phone,
        userId: meta.user_id,
        userName: meta.user_name
      });
      log.info(`[AliyunCallService] 录音已下载保存(${callId}): ${saved.fileUrl} (${Math.round(buffer.length / 1024)}KB)`);
    } catch (error: any) {
      log.warn(`[AliyunCallService] 下载录音到本地失败(${callId})，回退保存阿里云临时地址(1天有效):`, error.message);
      await this.handleRecordingCallback({
        callId,
        recordingUrl: remoteUrl,
        recordingDuration: duration,
        recordingSize: 0
      });
    }
  }

  /**
   * 解析未接通话单的失败原因：从话单的 releaseReason/contactDisposition 等字段中
   * 提取 SIP 错误码，翻译成用户可读的中文原因和更精确的通话状态。
   * 参考阿里云官方文档《SIP线路常见错误码排查与解决方法》：
   * https://help.aliyun.com/zh/ccs/support/common-sip-error-codes
   */
  private analyzeCallFailure(cdr: any): { status: string; reason: string | null; raw: string | null } {
    const parts = [cdr.releaseReason, cdr.outsideNumberReleaseReason, cdr.contactDisposition, cdr.earlyMediaState]
      .filter((v: any) => v !== undefined && v !== null && v !== '')
      .map((v: any) => String(v));
    const rawText = parts.length > 0 ? parts.join(' | ') : null;
    const joined = parts.join(' ');

    // SIP 错误码映射（4xx/5xx/6xx）
    const sipMap: Record<string, { text: string; status: string }> = {
      '400': { text: '信令请求错误', status: 'failed' },
      '402': { text: '线路欠费或需要付费，请检查线路账户余额', status: 'failed' },
      '403': { text: '呼叫被线路拒绝（常见为号码资质未报备、外呼频次超限或风控拦截）', status: 'failed' },
      '404': { text: '用户不存在：被叫号码无法在线路侧接续。常见原因是线路合作伙伴风控拦截（短时间内重复呼叫同一号码易触发）或号码有误', status: 'failed' },
      '408': { text: '线路响应超时', status: 'failed' },
      '480': { text: '被叫暂时不可用（可能关机、无信号或不在服务区）', status: 'missed' },
      '484': { text: '被叫号码不完整或格式错误', status: 'failed' },
      '486': { text: '被叫忙线中', status: 'busy' },
      '487': { text: '呼叫已取消（超时未接听）', status: 'missed' },
      '488': { text: '媒体协商失败', status: 'failed' },
      '500': { text: '线路服务器内部错误', status: 'failed' },
      '502': { text: '线路网关错误', status: 'failed' },
      '503': { text: '线路服务暂不可用（可能过载），请稍后重试', status: 'failed' },
      '600': { text: '被叫全局拒绝', status: 'rejected' },
      '603': { text: '被叫拒绝接听', status: 'rejected' }
    };

    const codeMatch = joined.match(/\b([456]\d{2})\b/);
    const sipCode = codeMatch ? codeMatch[1] : null;
    if (sipCode && sipMap[sipCode]) {
      const item = sipMap[sipCode];
      // 官方文档：拨打即挂断/SIP错误属线路合作伙伴问题，优先联系合作伙伴或阿里云技术支持
      const carrierHint = ['402', '403', '404', '408', '500', '502', '503'].includes(sipCode)
        ? '。此类错误发生在阿里云线路合作伙伴（运营商）侧，非CRM系统问题；若频繁出现请联系阿里云技术支持（钉钉 cccsupport2）或线路合作伙伴排查'
        : '';
      return { status: item.status, reason: `${sipCode} ${item.text}${carrierHint}`, raw: rawText };
    }

    // 无SIP码时按关键字归类
    if (/NoAnswer|NO_ANSWER|NotAnswer/i.test(joined)) return { status: 'missed', reason: '无人接听', raw: rawText };
    if (/Reject/i.test(joined)) return { status: 'rejected', reason: '被叫拒绝接听', raw: rawText };
    if (/Busy/i.test(joined)) return { status: 'busy', reason: '被叫忙线中', raw: rawText };
    if (/Abandon/i.test(joined)) return { status: 'missed', reason: '呼叫被放弃（接通前挂断）', raw: rawText };
    return { status: 'missed', reason: null, raw: rawText };
  }

  /**
   * 将阿里云 API 错误转成用户可读的提示
   */
  /** hangup_cause 列为 VARCHAR(255)，写入前截断避免 Data too long */
  private truncateCause(cause: string | null | undefined): string | null {
    if (!cause) return null;
    return String(cause).substring(0, 250);
  }

  private friendlyApiError(error: any): string {
    const code = error?.code || error?.data?.Code || error?.data?.code || '';
    const msg = error?.message || '';
    const combined = `${code} ${msg}`;
    if (/socket disconnected|ECONNRESET|ETIMEDOUT|ReadTimeout|ConnectTimeout|ENOTFOUND|EAI_AGAIN/i.test(combined)) {
      return '连接阿里云服务失败（网络波动），已自动重试仍未成功。请稍后再试；若频繁出现，请检查本机/服务器到 aliyuncs.com 的网络、防火墙或代理设置';
    }
    // NotExists.UserId：可能是 AccessKey 对应的 RAM 未加入实例，也可能是号码分配里绑定的坐席 ID 不存在
    if (/NotExists\.UserId/i.test(combined)) {
      const userMatch = msg.match(/User\s+(\d+)/i);
      const uid = userMatch ? userMatch[1] : '';
      return `阿里云坐席/账号不存在（NotExists.UserId${uid ? `：${uid}` : ''}）。` +
        '请按当前外呼方式排查：' +
        '① 双呼模式：网络电话配置里的 AccessKey 对应的 RAM 账号必须已加入该云联络中心实例（控制台 → 该实例 → 坐席管理，添加为管理员或坐席）；' +
        '② 软电话/硬话机模式：号码分配里绑定的「云联络中心坐席」必须是本实例里真实存在的坐席，请到「号码分配」重新选择或清空后重选；' +
        '③ 确认实例 ID 填的是当前正式实例（截图中为 demo- 开头时多为试用演示实例）。';
    }
    if (/InvalidAccessKeyId/i.test(code) || /InvalidAccessKeyId/i.test(msg)) {
      return 'AccessKey ID 无效，请检查网络电话配置';
    }
    if (/SignatureDoesNotMatch/i.test(code) || /SignatureDoesNotMatch/i.test(msg)) {
      return 'AccessKey Secret 错误，请检查网络电话配置';
    }
    if (/NotExists\.InstanceId|NotExist.*Instance/i.test(code) || /instance.*not exist/i.test(msg)) {
      return '云联络中心实例不存在，请检查实例ID（如 ccc-xxxx）';
    }
    if (/NotExists\.Number|number.*not exist/i.test(code + msg)) {
      return '主叫号码在云联络中心实例中不存在，请确认号码已购买并绑定到该实例';
    }
    if (/OutboundCallRestricted/i.test(code + msg)) {
      const callee = msg.match(/Callee\s*\(([^)]+)\)/i)?.[1];
      return `被叫号码${callee ? ` ${callee} ` : ''}被阿里云外呼策略拦截（DoNotCall名单或外呼白名单限制）。` +
        '常见原因：1) 云联络中心实例开启了「外呼白名单」模式，试用/未完成资质报备的实例只能呼叫白名单内号码，请到 云联络中心控制台 → 实例设置 → 号码管理/外呼白名单 中添加该号码；' +
        '2) 该号码在阿里云 DoNotCall（禁呼）名单中；3) 号码资质/实名报备未完成。完成号码资质审核后可取消白名单限制';
    }
    if (/Forbidden|NoPermission/i.test(code + msg)) {
      return '该AccessKey无云联络中心操作权限，请为RAM用户授权 AliyunCCCFullAccess';
    }
    return `阿里云外呼失败: ${msg || code || '未知错误'}`;
  }

  /**
   * 挂断通话
   * 双呼模式下阿里云不支持远程强制挂断，任一方挂机即结束；此处仅结束CRM侧记录
   */
  async hangupCall(callId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 获取通话记录
      const t = tenantRawSQL();
      const records = await AppDataSource.query(
        `SELECT * FROM call_records WHERE id = ?${t.sql}`,
        [callId, ...t.params]
      );

      if (records.length === 0) {
        return { success: false, message: '通话记录不存在' };
      }

      const record = records[0];

      // 更新通话记录
      await AppDataSource.query(
        `UPDATE call_records SET
         call_status = 'connected',
         end_time = NOW(),
         duration = TIMESTAMPDIFF(SECOND, start_time, NOW())
         WHERE id = ?${t.sql}`,
        [callId, ...t.params]
      );

      // 更新线路并发数
      if (record.line_id) {
        const tLine = tenantRawSQL();
        await AppDataSource.query(
          `UPDATE call_lines SET current_concurrent = GREATEST(0, current_concurrent - 1) WHERE id = ?${tLine.sql}`,
          [record.line_id, ...tLine.params]
        );
      }

      return { success: true, message: '通话已挂断' };
    } catch (error: any) {
      log.error('挂断通话失败:', error);
      return { success: false, message: error.message || '挂断失败' };
    }
  }

  /**
   * 处理通话状态回调
   */
  async handleStatusCallback(data: CallStatusCallback): Promise<void> {
    try {
      const { callId, status, duration, releaseReason } = data;
      const t = tenantRawSQL();

      // 根据状态更新通话记录
      switch (status) {
        case 'dialing':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'calling' WHERE id = ?${t.sql}`,
            [callId, ...t.params]
          );
          break;

        case 'ringing':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'pending' WHERE id = ?${t.sql}`,
            [callId, ...t.params]
          );
          break;

        case 'connected':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'connected', start_time = NOW() WHERE id = ?${t.sql}`,
            [callId, ...t.params]
          );
          break;

        case 'released':
          const finalStatus = duration && duration > 0 ? 'connected' : 'missed';
          await AppDataSource.query(
            `UPDATE call_records SET
             call_status = ?,
             end_time = NOW(),
             duration = ?,
             hangup_cause = ?
             WHERE id = ?${t.sql}`,
            [finalStatus, duration || 0, this.truncateCause(releaseReason), callId, ...t.params]
          );

          // 更新线路并发数和统计
          const records = await AppDataSource.query(
            `SELECT line_id FROM call_records WHERE id = ?${t.sql}`,
            [callId, ...t.params]
          );
          if (records.length > 0 && records[0].line_id) {
            const tLine = tenantRawSQL();
            await AppDataSource.query(
              `UPDATE call_lines SET
               current_concurrent = GREATEST(0, current_concurrent - 1),
               total_duration = total_duration + ?
               WHERE id = ?${tLine.sql}`,
              [duration || 0, records[0].line_id, ...tLine.params]
            );
          }
          break;
      }

      // 推送状态到PC端
      if (global.webSocketService) {
        const callRecords = await AppDataSource.query(
          `SELECT user_id FROM call_records WHERE id = ?${t.sql}`,
          [callId, ...t.params]
        );
        if (callRecords.length > 0) {
          global.webSocketService.sendToUser(
            callRecords[0].user_id,
            `CALL_${status.toUpperCase()}`,
            { callId, status, duration }
          );
        }
      }
    } catch (error) {
      log.error('处理通话状态回调失败:', error);
    }
  }

  /**
   * 处理录音完成回调
   */
  async handleRecordingCallback(data: {
    callId: string;
    recordingUrl: string;
    recordingDuration: number;
    recordingSize: number;
  }): Promise<void> {
    try {
      const t = tenantRawSQL();
      await AppDataSource.query(
        `UPDATE call_records SET
         recording_url = ?,
         has_recording = 1,
         recording_size = ?
         WHERE id = ?${t.sql}`,
        [data.recordingUrl, data.recordingSize, data.callId, ...t.params]
      );

      log.info(`[AliyunCallService] 录音已保存: ${data.callId}`);
    } catch (error) {
      log.error('处理录音回调失败:', error);
    }
  }

  /**
   * 测试线路连通性（调用 GetInstance 验证 AccessKey 与实例）
   */
  async testConnection(lineId: string): Promise<{ success: boolean; latency: number; message: string }> {
    const config = await this.getLineConfig(lineId);

    if (!config) {
      return {
        success: false,
        latency: 0,
        message: '线路配置不存在'
      };
    }

    return this.testConfig(config);
  }

  /**
   * 用给定配置测试云联络中心连通性
   */
  async testConfig(config: Partial<AliyunConfig>): Promise<{ success: boolean; latency: number; message: string }> {
    const startTime = Date.now();

    if (!config.accessKeyId || !config.accessKeySecret) {
      return {
        success: false,
        latency: 0,
        message: 'AccessKey未配置'
      };
    }

    if (!config.appId) {
      return {
        success: false,
        latency: 0,
        message: '云联络中心实例ID未配置（如 ccc-xxxx）'
      };
    }

    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.GetInstanceRequest({
        instanceId: config.appId
      });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 10000, connectTimeout: 8000, autoretry: true, maxAttempts: 3 });
      const response = await client.getInstanceWithOptions(request, runtime);
      const latency = Date.now() - startTime;

      const body = response?.body;
      if (body?.code === 'OK') {
        const name = body.data?.name || config.appId;
        const numbers = (body.data?.numberList || []).map((n: any) => n.number || n).filter(Boolean);
        return {
          success: true,
          latency,
          message: `连接正常，云联络中心实例: ${name}${numbers.length ? `，实例号码: ${numbers.join('、')}` : ''}`
        };
      }

      return {
        success: false,
        latency,
        message: `阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}`
      };
    } catch (error: any) {
      let message = this.friendlyApiError(error);

      // 实例ID填错时，自动列出该账号下可用的实例ID，方便用户直接更正
      if (/NotExists\.InstanceId|instance.*not exist/i.test((error?.code || '') + (error?.message || ''))) {
        const instances = await this.listInstanceIds(config as AliyunConfig);
        if (instances.length > 0) {
          const hint = instances.map(i => `${i.id}（名称: ${i.name}）`).join('、');
          message = `实例ID "${config.appId}" 不存在。您账号下的云联络中心实例: ${hint}。请将上面的实例ID填入配置`;
        }
      }

      return {
        success: false,
        latency: Date.now() - startTime,
        message
      };
    }
  }

  /**
   * 列出当前AccessKey可访问的云联络中心实例
   */
  private async listInstanceIds(config: AliyunConfig): Promise<Array<{ id: string; name: string }>> {
    const result = await this.listInstances(config);
    return result.success ? result.instances : [];
  }

  /**
   * 列出账号下的云联络中心实例（供前端"获取实例"按钮使用）
   */
  async listInstances(config: Partial<AliyunConfig>): Promise<{
    success: boolean;
    instances: Array<{ id: string; name: string; status?: string }>;
    message: string;
  }> {
    if (!config.accessKeyId || !config.accessKeySecret) {
      return { success: false, instances: [], message: '请先填写 AccessKey ID 和 AccessKey Secret' };
    }

    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.ListInstancesRequest({ pageNumber: 1, pageSize: 50 });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 5 });
      const response = await client.listInstancesWithOptions(request, runtime);
      const body = response?.body;

      if (body?.code !== 'OK') {
        return { success: false, instances: [], message: `阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}` };
      }

      const list = (body.data?.list || []).map((i: any) => ({
        id: i.id,
        name: i.name || '-',
        status: i.status
      }));

      return {
        success: true,
        instances: list,
        message: list.length > 0 ? `获取到 ${list.length} 个实例` : '该账号下暂无云联络中心实例，请先在阿里云控制台创建实例'
      };
    } catch (error: any) {
      log.warn('[AliyunCallService] 获取实例列表失败:', error.message);
      return { success: false, instances: [], message: this.friendlyApiError(error) };
    }
  }

  /**
   * 列出实例下已购买的号码（供前端"获取号码"按钮使用）
   */
  async listPhoneNumbers(config: Partial<AliyunConfig>, instanceId?: string): Promise<{
    success: boolean;
    numbers: Array<{ number: string; city?: string; usage?: string; active?: boolean }>;
    message: string;
  }> {
    if (!config.accessKeyId || !config.accessKeySecret) {
      return { success: false, numbers: [], message: '请先填写 AccessKey ID 和 AccessKey Secret' };
    }

    const targetInstance = instanceId || config.appId;
    if (!targetInstance) {
      return { success: false, numbers: [], message: '请先填写或选择实例ID' };
    }

    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.ListPhoneNumbersRequest({
        instanceId: targetInstance,
        pageNumber: 1,
        pageSize: 100
      });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 5 });
      const response = await client.listPhoneNumbersWithOptions(request, runtime);
      const body = response?.body;

      if (body?.code !== 'OK') {
        return { success: false, numbers: [], message: `阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}` };
      }

      const list = (body.data?.list || []).map((n: any) => ({
        number: n.number,
        city: n.city,
        usage: n.usage,
        active: n.active !== false
      })).filter((n: any) => n.number);

      return {
        success: true,
        numbers: list,
        message: list.length > 0
          ? `获取到 ${list.length} 个号码`
          : '该实例下暂无号码。请在阿里云云联络中心控制台「号码管理」中购买号码并绑定到该实例'
      };
    } catch (error: any) {
      log.warn('[AliyunCallService] ListPhoneNumbers 失败:', error.message);

      // ListPhoneNumbers 要求 AccessKey 对应的 RAM 账号是实例成员；
      // 不是成员时（NotExists.UserId）回退用 GetInstance 返回的实例号码列表
      const code = error?.code || error?.data?.Code || '';
      if (/NotExists\.UserId|Forbidden/i.test(code)) {
        const fallback = await this.listNumbersViaGetInstance(config as AliyunConfig, targetInstance);
        if (fallback) return fallback;
      }
      return { success: false, numbers: [], message: this.friendlyApiError(error) };
    }
  }

  /**
   * 列出实例下的坐席账号（供号码分配时绑定，软电话/硬话机模式使用）
   */
  async listCccUsers(config: Partial<AliyunConfig>, instanceId?: string): Promise<{
    success: boolean;
    users: Array<{ userId: string; loginName: string; displayName: string; roleName?: string; workMode?: string; extension?: string; sipExtension?: string }>;
    message: string;
  }> {
    if (!config.accessKeyId || !config.accessKeySecret) {
      return { success: false, users: [], message: '请先填写 AccessKey ID 和 AccessKey Secret' };
    }
    const targetInstance = instanceId || config.appId;
    if (!targetInstance) {
      return { success: false, users: [], message: '请先填写或选择实例ID' };
    }

    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.ListUsersRequest({ instanceId: targetInstance, pageNumber: 1, pageSize: 100 });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 5 });
      const response = await client.listUsersWithOptions(request, runtime);
      const body = response?.body;

      if (body?.code !== 'OK') {
        return { success: false, users: [], message: `阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}` };
      }

      const users = (body.data?.list || []).map((u: any) => ({
        userId: u.userId,
        loginName: u.loginName || '',
        displayName: u.displayName || u.loginName || '-',
        roleName: u.roleName,
        workMode: u.workMode,
        extension: u.extension || '',
        sipExtension: u.deviceExt || ''
      }));

      return {
        success: true,
        users,
        message: users.length > 0
          ? `获取到 ${users.length} 个坐席账号`
          : '该实例下暂无坐席，请在阿里云云联络中心控制台该实例的「坐席管理」中添加坐席'
      };
    } catch (error: any) {
      log.warn('[AliyunCallService] 获取坐席列表失败:', error.message);
      return { success: false, users: [], message: this.friendlyApiError(error) };
    }
  }

  /**
   * 获取实例的坐席工作台地址（软电话/硬话机模式下员工登录接听的入口）
   */
  async getWorkbenchUrl(config: Partial<AliyunConfig>, instanceId?: string): Promise<{
    success: boolean;
    url: string;
    message: string;
  }> {
    const targetInstance = instanceId || config.appId;
    if (!config.accessKeyId || !config.accessKeySecret || !targetInstance) {
      return { success: false, url: '', message: '请先完成 AccessKey 与实例ID 配置' };
    }

    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.GetInstanceRequest({ instanceId: targetInstance });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 5 });
      const response = await client.getInstanceWithOptions(request, runtime);
      const body = response?.body;
      if (body?.code !== 'OK') {
        return { success: false, url: '', message: `阿里云返回异常: ${body?.code || '未知'} - ${body?.message || ''}` };
      }
      const url = body.data?.consoleUrl || (body.data?.domainName ? `https://${body.data.domainName}` : '');
      return {
        success: !!url,
        url,
        message: url ? '获取成功' : '未获取到坐席工作台地址'
      };
    } catch (error: any) {
      return { success: false, url: '', message: this.friendlyApiError(error) };
    }
  }

  /**
   * 查询坐席的分机号（GetUser API，绑定坐席时自动保存到号码分配）
   * extension: 软电话分机号（网页工作台）；sipExtension: SIP话机分机号（硬话机）
   */
  async getCccUserExtensions(config: Partial<AliyunConfig>, cccUserId: string, instanceId?: string): Promise<{ extension: string | null; sipExtension: string | null }> {
    const empty = { extension: null, sipExtension: null };
    const targetInstance = instanceId || config.appId;
    if (!config.accessKeyId || !config.accessKeySecret || !targetInstance || !cccUserId) {
      return empty;
    }
    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config as AliyunConfig);
      const request = new CCC.GetUserRequest({ instanceId: targetInstance, userId: cccUserId });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 3 });
      const response = await client.getUserWithOptions(request, runtime);
      const body = response?.body;
      if (body?.code !== 'OK') return empty;
      return {
        extension: body.data?.extension || null,
        sipExtension: body.data?.deviceExt || null
      };
    } catch (error: any) {
      log.warn('[AliyunCallService] 查询坐席分机号失败:', error.message);
      return empty;
    }
  }

  /**
   * 同步坐席服务状态到云联络中心（就绪 -> ReadyForService；忙碌 -> TakeBreak小休）
   *
   * 说明：只有软电话/硬话机模式且绑定了坐席账号才需要同步；
   * 坐席未登录工作台（无在线设备）时阿里云会拒绝，此时只记录日志不报错——
   * CRM 侧的就绪/忙碌拦截（弹窗/未接提醒）不依赖此同步，始终生效。
   */
  async syncAgentServiceStatus(userId: string, status: 'ready' | 'busy' | 'offline'): Promise<{ synced: boolean; message: string }> {
    try {
      const t = tenantRawSQL('ula.');
      const assignments = await AppDataSource.query(
        `SELECT ula.ccc_user_id, ula.line_id
         FROM user_line_assignments ula
         JOIN call_lines cl ON ula.line_id = cl.id
         WHERE ula.user_id = ? AND ula.is_active = 1 AND ula.ccc_user_id IS NOT NULL AND ula.ccc_user_id != ''
           AND cl.provider = 'aliyun' AND cl.is_enabled = 1${t.sql}
         LIMIT 1`,
        [String(userId), ...t.params]
      );
      if (assignments.length === 0) {
        return { synced: false, message: '未绑定云联络中心坐席账号，无需同步' };
      }

      const { ccc_user_id: cccUserId, line_id: lineId } = assignments[0];
      const config = await this.getLineConfig(String(lineId));
      if (!config || !config.accessKeyId || !config.appId) {
        return { synced: false, message: '线路配置不完整，跳过云联络中心状态同步' };
      }

      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config);
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 3 });

      if (status === 'ready') {
        const request = new CCC.ReadyForServiceRequest({ instanceId: config.appId, userId: cccUserId });
        const response = await client.readyForServiceWithOptions(request, runtime);
        if (response?.body?.code === 'OK') {
          log.info(`[AliyunCallService] 坐席 ${cccUserId} 已同步为云联络中心「就绪」`);
          return { synced: true, message: '已同步云联络中心为就绪（在线）' };
        }
        return { synced: false, message: `云联络中心同步失败: ${response?.body?.code || ''} ${response?.body?.message || ''}` };
      } else {
        // busy/offline 均映射为小休（保持登录但不接来电）
        const request = new CCC.TakeBreakRequest({ instanceId: config.appId, userId: cccUserId, code: 'Rest' });
        const response = await client.takeBreakWithOptions(request, runtime);
        if (response?.body?.code === 'OK') {
          log.info(`[AliyunCallService] 坐席 ${cccUserId} 已同步为云联络中心「小休」`);
          return { synced: true, message: '已同步云联络中心为小休（不接来电）' };
        }
        return { synced: false, message: `云联络中心同步失败: ${response?.body?.code || ''} ${response?.body?.message || ''}` };
      }
    } catch (error: any) {
      // 坐席未登录工作台等情况属于正常场景，仅记录日志
      log.warn(`[AliyunCallService] 同步坐席状态失败(${userId} -> ${status}):`, error.message);
      return { synced: false, message: this.friendlyApiError(error) };
    }
  }

  /**
   * CRM 内接听/拒接云联络中心来电（软电话模式，坐席需已登录工作台）
   *
   * - answer: AnswerCall，在坐席已注册的软电话设备上接听
   * - reject: ReleaseCall，直接挂断该通来电
   */
  async controlInboundCall(callId: string, action: 'answer' | 'reject', userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 1. 找到来电记录及其阿里云 JobId
      const t = tenantRawSQL();
      const records = await AppDataSource.query(
        `SELECT provider_call_id, inbound_source FROM call_records WHERE id = ?${t.sql} LIMIT 1`,
        [callId, ...t.params]
      );
      if (records.length === 0) {
        return { success: false, message: '通话记录不存在' };
      }
      if (records[0].inbound_source !== 'aliyun') {
        return { success: false, message: '该来电不是云联络中心来电，无法在CRM内控制' };
      }
      const jobId = records[0].provider_call_id;
      if (!jobId) {
        return { success: false, message: '来电缺少云联络中心通话ID，请在坐席工作台操作' };
      }

      // 2. 找到该员工绑定的坐席账号与线路配置
      const tA = tenantRawSQL('ula.');
      const assignments = await AppDataSource.query(
        `SELECT ula.ccc_user_id, ula.line_id
         FROM user_line_assignments ula
         JOIN call_lines cl ON ula.line_id = cl.id
         WHERE ula.user_id = ? AND ula.is_active = 1 AND ula.ccc_user_id IS NOT NULL AND ula.ccc_user_id != ''
           AND cl.provider = 'aliyun' AND cl.is_enabled = 1${tA.sql}
         LIMIT 1`,
        [String(userId), ...tA.params]
      );
      if (assignments.length === 0) {
        return { success: false, message: '您未绑定云联络中心坐席账号，请在「号码分配」中绑定后重试，或在坐席工作台操作' };
      }
      const cccUserId = assignments[0].ccc_user_id;
      const config = await this.getLineConfig(String(assignments[0].line_id));
      if (!config || !config.accessKeyId || !config.appId) {
        return { success: false, message: '线路配置不完整，无法控制来电' };
      }

      // 3. 调用阿里云接听/挂断
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config);
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 3 });

      let body: any;
      if (action === 'answer') {
        const request = new CCC.AnswerCallRequest({ instanceId: config.appId, userId: cccUserId, jobId });
        const response = await client.answerCallWithOptions(request, runtime);
        body = response?.body;
      } else {
        const request = new CCC.ReleaseCallRequest({ instanceId: config.appId, userId: cccUserId, jobId });
        const response = await client.releaseCallWithOptions(request, runtime);
        body = response?.body;
      }

      if (body?.code === 'OK') {
        return { success: true, message: action === 'answer' ? '已接听，通话进行中' : '已挂断来电' };
      }
      const hint = /NotSignedIn|NoDevice|InvalidState/i.test(String(body?.code || ''))
        ? '（您可能未登录阿里云坐席工作台，软电话模式需保持工作台在线）'
        : '';
      return { success: false, message: `云联络中心返回: ${body?.code || '未知'} - ${body?.message || ''}${hint}` };
    } catch (error: any) {
      log.warn(`[AliyunCallService] 控制来电失败(${callId}, ${action}):`, error.message);
      return { success: false, message: this.friendlyApiError(error) };
    }
  }

  /**
   * CRM 点"结束通话"时尝试远程挂断云联络中心通话（尽力而为，失败不影响本地结束）
   *
   * 适用：软电话/SIP话机外呼、CRM内已接听的呼入（这些通话有 JobId 且坐席在线可控）
   * 不适用：双呼（back2back）模式——两条腿都是普通电话，阿里云不支持远程强挂，
   *         ReleaseCall 会返回非 OK，调用方据此提示"请任一方挂机"
   */
  async tryReleaseCall(callId: string, userId: string): Promise<{ attempted: boolean; success: boolean; message: string }> {
    try {
      // 1. 取记录：JobId + 归属判定字段
      const t = tenantRawSQL();
      const records = await AppDataSource.query(
        `SELECT provider_call_id, line_id, inbound_source FROM call_records WHERE id = ?${t.sql} LIMIT 1`,
        [callId, ...t.params]
      );
      if (records.length === 0) {
        return { attempted: false, success: false, message: '通话记录不存在' };
      }
      const record = records[0];
      const jobId = record.provider_call_id;
      if (!jobId) {
        return { attempted: false, success: false, message: '无云端通话ID，无法远程挂断（请任一方挂机结束）' };
      }

      // 2. 判定是否云联络中心通话：呼入来源 aliyun，或外呼线路 provider=aliyun
      let isAliyun = record.inbound_source === 'aliyun';
      const lineId = record.line_id ? String(record.line_id) : '';
      if (!isAliyun && lineId) {
        const tl = tenantRawSQL();
        const lines = await AppDataSource.query(
          `SELECT provider FROM call_lines WHERE id = ?${tl.sql} LIMIT 1`,
          [lineId, ...tl.params]
        );
        isAliyun = lines.length > 0 && lines[0].provider === 'aliyun';
      }
      if (!isAliyun) {
        return { attempted: false, success: false, message: '非云联络中心通话' };
      }

      // 3. 坐席绑定 + 线路配置（与呼入拒接一致）
      const tA = tenantRawSQL('ula.');
      const assignments = await AppDataSource.query(
        `SELECT ula.ccc_user_id, ula.line_id
         FROM user_line_assignments ula
         JOIN call_lines cl ON ula.line_id = cl.id
         WHERE ula.user_id = ? AND ula.is_active = 1 AND ula.ccc_user_id IS NOT NULL AND ula.ccc_user_id != ''
           AND cl.provider = 'aliyun' AND cl.is_enabled = 1${tA.sql}
         LIMIT 1`,
        [String(userId), ...tA.params]
      );
      if (assignments.length === 0) {
        return { attempted: false, success: false, message: '未绑定云联络中心坐席账号，无法远程挂断' };
      }
      const cccUserId = assignments[0].ccc_user_id;
      const config = await this.getLineConfig(lineId || String(assignments[0].line_id));
      if (!config || !config.accessKeyId || !config.appId) {
        return { attempted: false, success: false, message: '线路配置不完整，无法远程挂断' };
      }

      // 4. ReleaseCall（不重试、短超时——结束通话的UI不宜久等）
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config);
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 8000, connectTimeout: 5000, autoretry: false, maxAttempts: 1 });
      const request = new CCC.ReleaseCallRequest({ instanceId: config.appId, userId: cccUserId, jobId });
      const response = await client.releaseCallWithOptions(request, runtime);
      const body = response?.body;

      if (body?.code === 'OK') {
        log.info(`[AliyunCallService] 已远程挂断云联络中心通话 ${callId} (jobId=${jobId})`);
        return { attempted: true, success: true, message: '云联络中心已挂断' };
      }
      log.warn(`[AliyunCallService] 远程挂断未成功(${callId}): ${body?.code} ${body?.message || ''}`);
      const isDoubleCallHint = /NotSignedIn|NoDevice|InvalidState|NotExist/i.test(String(body?.code || ''));
      return {
        attempted: true,
        success: false,
        message: isDoubleCallHint
          ? '双呼/坐席离线场景不支持远程挂断，请任一方挂机结束'
          : `云联络中心返回: ${body?.code || '未知'} ${body?.message || ''}`,
      };
    } catch (error: any) {
      log.warn(`[AliyunCallService] 远程挂断异常(${callId}):`, error.message);
      return { attempted: true, success: false, message: this.friendlyApiError(error) };
    }
  }

  /**
   * 回退方案：通过 GetInstance 的 numberList 获取实例号码
   * （GetInstance 不要求调用者是实例成员）
   */
  private async listNumbersViaGetInstance(config: AliyunConfig, instanceId: string): Promise<{
    success: boolean;
    numbers: Array<{ number: string; city?: string; usage?: string; active?: boolean }>;
    message: string;
  } | null> {
    try {
      const { CCC, TeaUtil } = this.loadSdk();
      const client = this.createClient(config);
      const request = new CCC.GetInstanceRequest({ instanceId });
      const runtime = new TeaUtil.RuntimeOptions({ readTimeout: 12000, connectTimeout: 8000, autoretry: true, maxAttempts: 5 });
      const response = await client.getInstanceWithOptions(request, runtime);
      const body = response?.body;
      if (body?.code !== 'OK') return null;

      const numbers = (body.data?.numberList || [])
        .filter((n: any) => !!n)
        .map((n: any) => ({ number: String(n), active: true }));

      return {
        success: true,
        numbers,
        message: numbers.length > 0
          ? `获取到 ${numbers.length} 个号码（来自实例信息；当前AccessKey的RAM账号不是实例成员，如需完整号码信息请在实例中将其添加为管理员）`
          : '该实例下暂无号码。请在阿里云云联络中心控制台「号码管理」中购买号码并绑定到该实例'
      };
    } catch (error: any) {
      log.warn('[AliyunCallService] GetInstance 回退获取号码失败:', error.message);
      return null;
    }
  }
}

export const aliyunCallService = AliyunCallService.getInstance();
export default aliyunCallService;
