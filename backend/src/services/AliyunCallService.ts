/**
 * 阿里云外呼服务
 * 用于对接阿里云语音通话API
 */

import { AppDataSource } from '../config/database';

// 阿里云配置接口
interface AliyunConfig {
  accessKeyId: string;
  accessKeySecret: string;
  appId: string;
  callerNumber: string;
  region: string;
  enableRecording: boolean;
  recordingBucket?: string;
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

class AliyunCallService {
  private static instance: AliyunCallService;

  private constructor() {}

  static getInstance(): AliyunCallService {
    if (!AliyunCallService.instance) {
      AliyunCallService.instance = new AliyunCallService();
    }
    return AliyunCallService.instance;
  }

  /**
   * 获取线路配置
   */
  async getLineConfig(lineId: string): Promise<AliyunConfig | null> {
    try {
      const lines = await AppDataSource.query(
        `SELECT * FROM call_lines WHERE id = ? AND provider = 'aliyun' AND status = 'active'`,
        [lineId]
      );

      if (lines.length === 0) {
        return null;
      }

      const line = lines[0];
      if (!line.config) {
        return null;
      }

      const config = typeof line.config === 'string'
        ? JSON.parse(line.config)
        : line.config;

      return {
        accessKeyId: config.accessKeyId || '',
        accessKeySecret: config.accessKeySecret || '',
        appId: config.appId || '',
        callerNumber: line.caller_number || config.callerNumber || '',
        region: config.region || 'cn-hangzhou',
        enableRecording: config.enableRecording !== false,
        recordingBucket: config.recordingBucket
      };
    } catch (error) {
      console.error('获取阿里云线路配置失败:', error);
      return null;
    }
  }

  /**
   * 发起外呼
   * 注意：实际生产环境需要安装阿里云SDK并实现真实调用
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
          message: '阿里云AccessKey未配置'
        };
      }

      // 生成通话记录ID
      const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      // 创建通话记录
      await AppDataSource.query(
        `INSERT INTO call_records
         (id, customer_id, customer_name, customer_phone, call_type, call_status,
          call_method, line_id, caller_number, user_id, user_name, start_time, created_at)
         VALUES (?, ?, ?, ?, 'outbound', 'calling', 'cloud', ?, ?, ?, ?, NOW(), NOW())`,
        [
          callId,
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
      await AppDataSource.query(
        `UPDATE call_lines SET
         current_concurrent = current_concurrent + 1,
         daily_used = daily_used + 1,
         total_calls = total_calls + 1,
         last_used_at = NOW()
         WHERE id = ?`,
        [params.lineId]
      );

      // TODO: 实际调用阿里云API
      // 这里是模拟实现，实际需要安装 @alicloud/ccc20200701 SDK
      /*
      const China = require('@alicloud/ccc20200701');
      const OpenApi = require('@alicloud/openapi-client');

      const apiConfig = new OpenApi.Config({
        accessKeyId: config.accessKeyId,
        accessKeySecret: config.accessKeySecret,
        endpoint: `ccc.${config.region}.aliyuncs.com`
      });

      const client = new China.default(apiConfig);

      const request = new China.MakeCallRequest({
        instanceId: config.appId,
        caller: config.callerNumber,
        callee: params.customerPhone,
        timeoutSeconds: 60,
        tags: JSON.stringify({
          callId,
          customerId: params.customerId,
          userId: params.userId
        })
      });

      const response = await client.makeCall(request);
      const providerCallId = response.body.data.callContext.callId;
      */

      // 模拟返回
      const providerCallId = `aliyun_${Date.now()}`;

      // 更新通话记录的服务商ID
      await AppDataSource.query(
        `UPDATE call_records SET provider_call_id = ? WHERE id = ?`,
        [providerCallId, callId]
      );

      console.log(`[AliyunCallService] 发起外呼成功: ${callId} -> ${params.customerPhone}`);

      return {
        success: true,
        callId,
        providerCallId,
        message: '外呼已发起'
      };
    } catch (error: any) {
      console.error('阿里云外呼失败:', error);
      return {
        success: false,
        message: error.message || '外呼失败'
      };
    }
  }

  /**
   * 挂断通话
   */
  async hangupCall(callId: string): Promise<{ success: boolean; message: string }> {
    try {
      // 获取通话记录
      const records = await AppDataSource.query(
        `SELECT * FROM call_records WHERE id = ?`,
        [callId]
      );

      if (records.length === 0) {
        return { success: false, message: '通话记录不存在' };
      }

      const record = records[0];

      // TODO: 调用阿里云API挂断通话
      // const client = await this.getClient(record.line_id);
      // await client.releaseCall({ instanceId, jobId: record.provider_job_id });

      // 更新通话记录
      await AppDataSource.query(
        `UPDATE call_records SET
         call_status = 'connected',
         end_time = NOW(),
         duration = TIMESTAMPDIFF(SECOND, start_time, NOW())
         WHERE id = ?`,
        [callId]
      );

      // 更新线路并发数
      if (record.line_id) {
        await AppDataSource.query(
          `UPDATE call_lines SET current_concurrent = GREATEST(0, current_concurrent - 1) WHERE id = ?`,
          [record.line_id]
        );
      }

      return { success: true, message: '通话已挂断' };
    } catch (error: any) {
      console.error('挂断通话失败:', error);
      return { success: false, message: error.message || '挂断失败' };
    }
  }

  /**
   * 处理通话状态回调
   */
  async handleStatusCallback(data: CallStatusCallback): Promise<void> {
    try {
      const { callId, status, duration, releaseReason } = data;

      // 根据状态更新通话记录
      switch (status) {
        case 'dialing':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'calling' WHERE id = ?`,
            [callId]
          );
          break;

        case 'ringing':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'ringing' WHERE id = ?`,
            [callId]
          );
          break;

        case 'connected':
          await AppDataSource.query(
            `UPDATE call_records SET call_status = 'connected', start_time = NOW() WHERE id = ?`,
            [callId]
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
             WHERE id = ?`,
            [finalStatus, duration || 0, releaseReason || null, callId]
          );

          // 更新线路并发数和统计
          const records = await AppDataSource.query(
            `SELECT line_id FROM call_records WHERE id = ?`,
            [callId]
          );
          if (records.length > 0 && records[0].line_id) {
            await AppDataSource.query(
              `UPDATE call_lines SET
               current_concurrent = GREATEST(0, current_concurrent - 1),
               total_duration = total_duration + ?
               WHERE id = ?`,
              [duration || 0, records[0].line_id]
            );
          }
          break;
      }

      // 推送状态到PC端
      if (global.webSocketService) {
        const callRecords = await AppDataSource.query(
          `SELECT user_id FROM call_records WHERE id = ?`,
          [callId]
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
      console.error('处理通话状态回调失败:', error);
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
      await AppDataSource.query(
        `UPDATE call_records SET
         recording_url = ?,
         has_recording = 1,
         recording_size = ?
         WHERE id = ?`,
        [data.recordingUrl, data.recordingSize, data.callId]
      );

      console.log(`[AliyunCallService] 录音已保存: ${data.callId}`);
    } catch (error) {
      console.error('处理录音回调失败:', error);
    }
  }

  /**
   * 测试线路连通性
   */
  async testConnection(lineId: string): Promise<{ success: boolean; latency: number; message: string }> {
    const startTime = Date.now();

    try {
      const config = await this.getLineConfig(lineId);

      if (!config) {
        return {
          success: false,
          latency: 0,
          message: '线路配置不存在'
        };
      }

      if (!config.accessKeyId || !config.accessKeySecret) {
        return {
          success: false,
          latency: 0,
          message: 'AccessKey未配置'
        };
      }

      // TODO: 实际调用阿里云API测试连通性
      // 这里模拟测试
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        message: '连接正常'
      };
    } catch (error: any) {
      return {
        success: false,
        latency: Date.now() - startTime,
        message: error.message || '连接测试失败'
      };
    }
  }
}

export const aliyunCallService = AliyunCallService.getInstance();
export default aliyunCallService;
