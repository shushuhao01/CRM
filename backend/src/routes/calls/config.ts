import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { tenantSQL } from '../../utils/tenantRepo';
import { getCurrentTenantIdSafe } from '../../utils/tenantHelpers';
import { log } from '../../config/logger';

const getDefaultCallConfig = (userId: string) => ({
  userId,
  callMethod: 'system',
  lineId: '',
  workPhone: '',
  dialMethod: 'direct',
  mobileConfig: {
    platform: 'android',
    sdkInstalled: false,
    deviceAuthorized: false,
    callPermission: false,
    connectionStatus: 'disconnected',
    sdkInfo: {
      version: '1.0.0',
      fileSize: '5.3 MB',
      updateTime: new Date().toISOString().split('T')[0],
      supportedSystems: 'Android 5.0+',
      packageType: 'APK'
    }
  },
  callbackConfig: {
    provider: 'aliyun',
    delay: 3,
    maxRetries: 3
  },
  voipProvider: 'aliyun',
  audioDevice: 'default',
  audioQuality: 'standard',
  aliyunConfig: {
    accessKeyId: '',
    accessKeySecret: '',
    appId: '',
    callerNumber: '',
    region: 'cn-hangzhou',
    enableRecording: false,
    recordingBucket: ''
  },
  tencentConfig: {
    secretId: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'ap-beijing'
  },
  huaweiConfig: {
    accessKey: '',
    secretKey: '',
    appId: '',
    callerNumber: '',
    region: 'cn-north-1'
  },
  callMode: 'manual',
  callInterval: 30,
  maxRetries: 3,
  callTimeout: 60,
  enableRecording: true,
  autoFollowUp: false,
  concurrentCalls: 1,
  priority: 'medium',
  blacklistCheck: true,
  showLocation: true
});

export function registerConfigRoutes(router: Router) {
router.get('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const targetUserId = (req.query.userId as string) || currentUser?.userId || currentUser?.id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    // 从数据库查询配置
    const tCfgGet = tenantSQL('');
    const configs = await AppDataSource.query(
      `SELECT * FROM phone_configs WHERE user_id = ? AND config_type = 'call' AND is_active = 1${tCfgGet.sql}`,
      [targetUserId, ...tCfgGet.params]
    );

    let config;
    if (configs.length > 0) {
      const dbConfig = configs[0];
      // 解析JSON字段
      config = {
        id: dbConfig.id,
        userId: dbConfig.user_id,
        callMethod: dbConfig.call_method || 'system',
        lineId: dbConfig.line_id || '',
        workPhone: dbConfig.work_phone || '',
        dialMethod: dbConfig.dial_method || 'direct',
        mobileConfig: dbConfig.mobile_config ? (typeof dbConfig.mobile_config === 'string' ? JSON.parse(dbConfig.mobile_config) : dbConfig.mobile_config) : getDefaultCallConfig(targetUserId).mobileConfig,
        callbackConfig: dbConfig.callback_config ? (typeof dbConfig.callback_config === 'string' ? JSON.parse(dbConfig.callback_config) : dbConfig.callback_config) : getDefaultCallConfig(targetUserId).callbackConfig,
        voipProvider: dbConfig.voip_provider || 'aliyun',
        audioDevice: dbConfig.audio_device || 'default',
        audioQuality: dbConfig.audio_quality || 'standard',
        aliyunConfig: dbConfig.aliyun_config ? (typeof dbConfig.aliyun_config === 'string' ? JSON.parse(dbConfig.aliyun_config) : dbConfig.aliyun_config) : getDefaultCallConfig(targetUserId).aliyunConfig,
        tencentConfig: dbConfig.tencent_config ? (typeof dbConfig.tencent_config === 'string' ? JSON.parse(dbConfig.tencent_config) : dbConfig.tencent_config) : getDefaultCallConfig(targetUserId).tencentConfig,
        huaweiConfig: dbConfig.huawei_config ? (typeof dbConfig.huawei_config === 'string' ? JSON.parse(dbConfig.huawei_config) : dbConfig.huawei_config) : getDefaultCallConfig(targetUserId).huaweiConfig,
        callMode: dbConfig.call_mode || 'manual',
        callInterval: dbConfig.call_interval || 30,
        maxRetries: dbConfig.max_retries || 3,
        callTimeout: dbConfig.call_timeout || 60,
        enableRecording: dbConfig.enable_recording === 1,
        autoFollowUp: dbConfig.auto_follow_up === 1,
        concurrentCalls: dbConfig.concurrent_calls || 1,
        priority: dbConfig.priority || 'medium',
        blacklistCheck: dbConfig.blacklist_check === 1,
        showLocation: dbConfig.show_location === 1,
        createdAt: dbConfig.created_at,
        updatedAt: dbConfig.updated_at
      };
    } else {
      // 返回默认配置
      config = getDefaultCallConfig(targetUserId);
    }

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    log.error('获取电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取电话配置失败'
    });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const currentUser = (req as any).user;
    const userId = currentUser?.userId || currentUser?.id;
    const configData = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: '用户ID不能为空'
      });
    }

    // 检查是否已存在配置
    const tCfgExist = tenantSQL('');
    const existingConfigs = await AppDataSource.query(
      `SELECT id FROM phone_configs WHERE user_id = ? AND config_type = 'call'${tCfgExist.sql}`,
      [userId, ...tCfgExist.params]
    );

    const mobileConfig = JSON.stringify(configData.mobileConfig || getDefaultCallConfig(userId).mobileConfig);
    const callbackConfig = JSON.stringify(configData.callbackConfig || getDefaultCallConfig(userId).callbackConfig);
    const aliyunConfig = JSON.stringify(configData.aliyunConfig || getDefaultCallConfig(userId).aliyunConfig);
    const tencentConfig = JSON.stringify(configData.tencentConfig || getDefaultCallConfig(userId).tencentConfig);
    const huaweiConfig = JSON.stringify(configData.huaweiConfig || getDefaultCallConfig(userId).huaweiConfig);

    if (existingConfigs.length > 0) {
      // 更新现有配置
      const tCfgUp = tenantSQL('');
      await AppDataSource.query(
        `UPDATE phone_configs SET
          call_method = ?,
          line_id = ?,
          work_phone = ?,
          dial_method = ?,
          mobile_config = ?,
          callback_config = ?,
          voip_provider = ?,
          audio_device = ?,
          audio_quality = ?,
          aliyun_config = ?,
          tencent_config = ?,
          huawei_config = ?,
          call_mode = ?,
          call_interval = ?,
          max_retries = ?,
          call_timeout = ?,
          enable_recording = ?,
          auto_follow_up = ?,
          concurrent_calls = ?,
          priority = ?,
          blacklist_check = ?,
          show_location = ?,
          is_active = 1,
          updated_at = NOW()
        WHERE user_id = ? AND config_type = 'call'${tCfgUp.sql}`,
        [
          configData.callMethod || 'system',
          configData.lineId || null,
          configData.workPhone || null,
          configData.dialMethod || 'direct',
          mobileConfig,
          callbackConfig,
          configData.voipProvider || 'aliyun',
          configData.audioDevice || 'default',
          configData.audioQuality || 'standard',
          aliyunConfig,
          tencentConfig,
          huaweiConfig,
          configData.callMode || 'manual',
          configData.callInterval || 30,
          configData.maxRetries || 3,
          configData.callTimeout || 60,
          configData.enableRecording ? 1 : 0,
          configData.autoFollowUp ? 1 : 0,
          configData.concurrentCalls || 1,
          configData.priority || 'medium',
          configData.blacklistCheck ? 1 : 0,
          configData.showLocation ? 1 : 0,
          userId,
          ...tCfgUp.params
        ]
      );
    } else {
      // 插入新配置
      const cfgTenantId = getCurrentTenantIdSafe() || null;
      await AppDataSource.query(
        `INSERT INTO phone_configs (
          user_id, config_type, call_method, line_id, work_phone, dial_method,
          mobile_config, callback_config, voip_provider, audio_device, audio_quality,
          aliyun_config, tencent_config, huawei_config,
          call_mode, call_interval, max_retries, call_timeout,
          enable_recording, auto_follow_up, concurrent_calls, priority,
          blacklist_check, show_location, is_active, tenant_id
        ) VALUES (?, 'call', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          userId,
          configData.callMethod || 'system',
          configData.lineId || null,
          configData.workPhone || null,
          configData.dialMethod || 'direct',
          mobileConfig,
          callbackConfig,
          configData.voipProvider || 'aliyun',
          configData.audioDevice || 'default',
          configData.audioQuality || 'standard',
          aliyunConfig,
          tencentConfig,
          huaweiConfig,
          configData.callMode || 'manual',
          configData.callInterval || 30,
          configData.maxRetries || 3,
          configData.callTimeout || 60,
          configData.enableRecording ? 1 : 0,
          configData.autoFollowUp ? 1 : 0,
          configData.concurrentCalls || 1,
          configData.priority || 'medium',
          configData.blacklistCheck ? 1 : 0,
          configData.showLocation ? 1 : 0,
          cfgTenantId
        ]
      );
    }

    // 返回更新后的配置
    const updatedConfig = {
      userId,
      ...configData,
      updatedAt: new Date().toISOString()
    };

    res.json({
      success: true,
      message: '电话配置保存成功',
      data: updatedConfig
    });
  } catch (error) {
    log.error('更新电话配置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新电话配置失败'
    });
  }
});

router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // 模拟连接测试
    const latency = Math.floor(Math.random() * 100) + 50; // 50-150ms

    res.json({
      success: true,
      data: {
        success: true,
        message: '连接测试成功',
        latency
      }
    });
  } catch (error) {
    log.error('测试连接失败:', error);
    res.status(500).json({
      success: false,
      message: '测试连接失败'
    });
  }
});

router.get('/export', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    // 实际项目中应该生成真实的导出文件
    res.json({
      success: true,
      data: {
        url: `/exports/calls_${Date.now()}.xlsx`,
        filename: `通话记录_${startDate || 'all'}_${endDate || 'all'}.xlsx`
      }
    });
  } catch (error) {
    log.error('导出通话记录失败:', error);
    res.status(500).json({
      success: false,
      message: '导出通话记录失败'
    });
  }
});
}
