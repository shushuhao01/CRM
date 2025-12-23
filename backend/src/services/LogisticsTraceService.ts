/**
 * 物流轨迹查询服务
 * 调用各快递公司API获取真实物流轨迹
 */
import crypto from 'crypto';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { LogisticsApiConfig } from '../entities/LogisticsApiConfig';
import { ExpressAPIService } from './ExpressAPIService';

// 快递100公司代码映射（我们的代码 -> 快递100代码）
const KUAIDI100_COMPANY_MAP: Record<string, string> = {
  'SF': 'shunfeng',
  'ZTO': 'zhongtong',
  'YTO': 'yuantong',
  'STO': 'shentong',
  'YD': 'yunda',
  'JTSD': 'jtexpress',
  'EMS': 'ems',
  'JD': 'jingdong',
  'DBL': 'debangwuliu'
};

// 物流轨迹接口
export interface LogisticsTrace {
  time: string;
  status: string;
  description: string;
  location?: string;
  operator?: string;
  phone?: string;
}

// 物流查询结果接口
export interface LogisticsTrackResult {
  success: boolean;
  trackingNo: string;
  companyCode: string;
  companyName: string;
  status: string;
  statusText: string;
  traces: LogisticsTrace[];
  estimatedDeliveryTime?: string;
  signedTime?: string;
  signedBy?: string;
  rawData?: any;
}

// 快递公司名称映射
const COMPANY_NAMES: Record<string, string> = {
  'SF': '顺丰速运',
  'ZTO': '中通快递',
  'YTO': '圆通速递',
  'STO': '申通快递',
  'YD': '韵达速递',
  'JTSD': '极兔速递',
  'EMS': '邮政EMS',
  'JD': '京东物流',
  'DBL': '德邦快递'
};

// 🔥 新增：公司名称到代码的反向映射（用于处理前端传递中文名称的情况）
const COMPANY_NAME_TO_CODE: Record<string, string> = {
  '顺丰速运': 'SF',
  '顺丰': 'SF',
  '中通快递': 'ZTO',
  '中通': 'ZTO',
  '圆通速递': 'YTO',
  '圆通': 'YTO',
  '申通快递': 'STO',
  '申通': 'STO',
  '韵达速递': 'YD',
  '韵达': 'YD',
  '极兔速递': 'JTSD',
  '极兔': 'JTSD',
  '邮政EMS': 'EMS',
  'EMS': 'EMS',
  '邮政': 'EMS',
  '京东物流': 'JD',
  '京东': 'JD',
  '德邦快递': 'DBL',
  '德邦': 'DBL'
};

// 物流状态映射（供外部使用）
export const STATUS_MAP: Record<string, { status: string; text: string }> = {
  'WAIT_ACCEPT': { status: 'pending', text: '待揽收' },
  'ACCEPT': { status: 'picked_up', text: '已揽收' },
  'TRANSPORT': { status: 'in_transit', text: '运输中' },
  'DELIVERING': { status: 'out_for_delivery', text: '派送中' },
  'SIGN': { status: 'delivered', text: '已签收' },
  'REJECT': { status: 'rejected', text: '拒收' },
  'FAILED': { status: 'exception', text: '异常' },
  'RETURN': { status: 'returned', text: '退回' }
};

class LogisticsTraceService {
  /**
   * 查询物流轨迹
   * @param trackingNo 运单号
   * @param companyCode 快递公司代码（可选，自动识别）
   * @param phone 收件人/寄件人手机号（可选，用于顺丰等需要验证的快递）
   */
  async queryTrace(trackingNo: string, companyCode?: string, phone?: string): Promise<LogisticsTrackResult> {
    console.log(`[物流查询] 开始查询: 单号=${trackingNo}, 公司代码=${companyCode || '自动识别'}, 手机号=${phone ? phone.slice(-4) + '****' : '未提供'}`);

    // 🔥 修复：如果传入的是中文公司名称，转换为代码
    if (companyCode && COMPANY_NAME_TO_CODE[companyCode]) {
      const originalCode = companyCode;
      companyCode = COMPANY_NAME_TO_CODE[companyCode];
      console.log(`[物流查询] 公司名称转换: ${originalCode} -> ${companyCode}`);
    }

    // 如果没有指定快递公司，尝试自动识别
    if (!companyCode || companyCode === 'auto') {
      companyCode = this.detectCompanyCode(trackingNo);
      console.log(`[物流查询] 自动识别快递公司: ${companyCode || '未识别'}`);
    }

    // 标准化公司代码（转大写）
    if (companyCode) {
      companyCode = companyCode.toUpperCase();
      // 🔥 再次检查是否需要转换（处理大写中文的情况）
      if (COMPANY_NAME_TO_CODE[companyCode]) {
        companyCode = COMPANY_NAME_TO_CODE[companyCode];
      }
    }

    if (!companyCode) {
      return {
        success: false,
        trackingNo,
        companyCode: '',
        companyName: '未知',
        status: 'unknown',
        statusText: '无法识别快递公司，请手动选择',
        traces: []
      };
    }

    // 获取API配置
    const config = await this.getApiConfig(companyCode);
    console.log(`[物流查询] API配置: ${config ? `已找到(enabled=${config.enabled})` : '未找到'}`);

    if (!config) {
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'unknown',
        statusText: `${COMPANY_NAMES[companyCode] || companyCode}的API未配置，请在物流公司管理中配置API`,
        traces: []
      };
    }

    if (!config.enabled) {
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'unknown',
        statusText: `${COMPANY_NAMES[companyCode] || companyCode}的API已禁用，请在物流公司管理中启用`,
        traces: []
      };
    }

    // 检查必要的API配置
    if (!config.appId || !config.appSecret) {
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'unknown',
        statusText: `${COMPANY_NAMES[companyCode] || companyCode}的API密钥未配置完整`,
        traces: []
      };
    }

    // 根据快递公司调用对应的API
    try {
      console.log(`[物流查询] 调用${companyCode}的API...`);
      let result: LogisticsTrackResult;

      switch (companyCode) {
        case 'SF':
          result = await this.querySFTrace(trackingNo, config, phone);
          break;
        case 'ZTO':
          result = await this.queryZTOTrace(trackingNo, config);
          break;
        case 'YTO':
          result = await this.queryYTOTrace(trackingNo, config);
          break;
        case 'STO':
          result = await this.querySTOTrace(trackingNo, config);
          break;
        case 'YD':
          result = await this.queryYDTrace(trackingNo, config);
          break;
        case 'JTSD':
          result = await this.queryJTTrace(trackingNo, config);
          break;
        case 'EMS':
          result = await this.queryEMSTrace(trackingNo, config);
          break;
        case 'JD':
          result = await this.queryJDTrace(trackingNo, config);
          break;
        case 'DBL':
          result = await this.queryDBLTrace(trackingNo, config);
          break;
        default:
          result = {
            success: false,
            trackingNo,
            companyCode,
            companyName: COMPANY_NAMES[companyCode] || companyCode,
            status: 'unknown',
            statusText: '暂不支持该快递公司的API查询',
            traces: []
          };
      }

      // 🔥 如果官方API查询失败或没有轨迹
      if (!result.success || result.traces.length === 0) {
        // 检查快递100是否配置
        const expressService = ExpressAPIService.getInstance();
        const configStatus = expressService.getConfigStatus();

        if (configStatus.kuaidi100) {
          // 快递100已配置，尝试使用快递100查询
          console.log(`[物流查询] 官方API查询失败或无轨迹，尝试快递100...`);
          const fallbackResult = await this.queryByKuaidi100(trackingNo, companyCode);
          if (fallbackResult.success && fallbackResult.traces.length > 0) {
            console.log(`[物流查询] 快递100查询成功，返回${fallbackResult.traces.length}条轨迹`);
            return fallbackResult;
          }
          console.log(`[物流查询] 快递100也查询失败，返回原始结果`);
        } else {
          // 快递100未配置
          if (companyCode === 'SF') {
            if (!phone) {
              // 没有提供手机号
              console.log(`[物流查询] 快递100未配置，顺丰需要手机号验证`);
              result.statusText = '需要手机号验证';
              result.status = 'need_phone_verify';
            } else {
              // 提供了手机号但仍然查询不到，可能是手机号不正确
              console.log(`[物流查询] 已提供手机号但查询失败，可能手机号不正确`);
              if (result.statusText.includes('routes为空') || result.statusText.includes('未查询到')) {
                result.statusText = '查询失败。可能原因：1.手机号后4位不正确 2.运单刚发出，建议12-24小时后再查询 3.运单号不存在';
                result.status = 'need_phone_verify'; // 让用户可以重新输入手机号
              }
            }
          }
        }
      }

      return result;
    } catch (error: any) {
      console.error(`[物流查询] ${companyCode} 查询失败:`, error.message);

      // 检查快递100是否配置
      const expressService = ExpressAPIService.getInstance();
      const configStatus = expressService.getConfigStatus();

      if (configStatus.kuaidi100) {
        // 🔥 官方API异常时，尝试快递100
        console.log(`[物流查询] 官方API异常，尝试快递100...`);
        const fallbackResult = await this.queryByKuaidi100(trackingNo, companyCode);
        if (fallbackResult.success) {
          return fallbackResult;
        }
      } else if (companyCode === 'SF' && !phone) {
        // 快递100未配置，顺丰需要手机号验证
        return {
          success: false,
          trackingNo,
          companyCode,
          companyName: COMPANY_NAMES[companyCode] || companyCode,
          status: 'need_phone_verify',
          statusText: '需要手机号验证',
          traces: []
        };
      }

      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'error',
        statusText: '查询失败: ' + error.message,
        traces: []
      };
    }
  }

  /**
   * 使用快递100 API查询（备选方案）
   */
  private async queryByKuaidi100(trackingNo: string, companyCode: string): Promise<LogisticsTrackResult> {
    try {
      const expressService = ExpressAPIService.getInstance();

      // 检查快递100是否配置
      const configStatus = expressService.getConfigStatus();
      if (!configStatus.kuaidi100) {
        console.log('[物流查询] 快递100未配置，跳过');
        return {
          success: false,
          trackingNo,
          companyCode,
          companyName: COMPANY_NAMES[companyCode] || companyCode,
          status: 'unknown',
          statusText: '快递100 API未配置',
          traces: []
        };
      }

      // 转换公司代码
      const kuaidi100Code = KUAIDI100_COMPANY_MAP[companyCode] || companyCode.toLowerCase();
      console.log(`[物流查询] 调用快递100 API: 单号=${trackingNo}, 公司代码=${kuaidi100Code}`);

      const result = await expressService.queryExpress(trackingNo, kuaidi100Code);

      if (result.success) {
        const traces = result.traces.map(t => ({
          time: t.time,
          status: t.status || '',
          description: t.description,
          location: t.location,
          operator: t.operator,
          phone: t.phone
        }));

        return {
          success: true,
          trackingNo: result.trackingNo,
          companyCode,
          companyName: COMPANY_NAMES[companyCode] || result.companyName,
          status: result.status,
          statusText: result.statusDescription + ' (快递100)',
          traces,
          // 🔥 计算预计送达时间（传入快递公司代码）
          estimatedDeliveryTime: this.calculateEstimatedDeliveryTime(result.status, traces, companyCode),
          rawData: result.rawData
        };
      }

      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'unknown',
        statusText: result.error || '快递100查询失败',
        traces: []
      };
    } catch (error: any) {
      console.error('[物流查询] 快递100查询异常:', error.message);
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: COMPANY_NAMES[companyCode] || companyCode,
        status: 'error',
        statusText: '快递100查询异常: ' + error.message,
        traces: []
      };
    }
  }

  /**
   * 批量查询物流轨迹
   */
  async batchQueryTrace(trackingNos: string[], companyCode?: string): Promise<LogisticsTrackResult[]> {
    const results: LogisticsTrackResult[] = [];
    for (const trackingNo of trackingNos) {
      const result = await this.queryTrace(trackingNo, companyCode);
      results.push(result);
    }
    return results;
  }

  /**
   * 获取API配置
   */
  private async getApiConfig(companyCode: string): Promise<LogisticsApiConfig | null> {
    try {
      const repository = AppDataSource!.getRepository(LogisticsApiConfig);
      const config = await repository.findOne({
        where: { companyCode: companyCode.toUpperCase() }
      });

      // 🔥 详细日志：输出配置内容
      if (config) {
        console.log(`[物流查询] 找到API配置:`, {
          companyCode: config.companyCode,
          companyName: config.companyName,
          appId: config.appId ? `${config.appId.substring(0, 4)}***` : '(空)',
          appSecret: config.appSecret ? '***已设置***' : '(空)',
          enabled: config.enabled,
          apiEnvironment: config.apiEnvironment
        });
      } else {
        console.log(`[物流查询] 未找到API配置: companyCode=${companyCode}`);
      }

      return config;
    } catch (error) {
      console.error('[物流查询] 获取API配置失败:', error);
      return null;
    }
  }

  /**
   * 自动识别快递公司
   */
  private detectCompanyCode(trackingNo: string): string | null {
    const patterns: Array<{ pattern: RegExp; code: string }> = [
      { pattern: /^SF\d{12,}$/i, code: 'SF' },
      { pattern: /^7[0-9]{12,}$/, code: 'ZTO' },
      { pattern: /^YT\d{13,}$/i, code: 'YTO' },
      { pattern: /^77[0-9]{11,}$/, code: 'STO' },
      { pattern: /^1[0-9]{12,}$/, code: 'YD' },
      { pattern: /^JT\d{13,}$/i, code: 'JTSD' },
      { pattern: /^E[A-Z]\d{9}CN$/i, code: 'EMS' },
      { pattern: /^JD[A-Z0-9]{10,}$/i, code: 'JD' },
      { pattern: /^DPK\d{10,}$/i, code: 'DBL' }
    ];

    for (const { pattern, code } of patterns) {
      if (pattern.test(trackingNo)) {
        return code;
      }
    }
    return null;
  }

  // ========== 顺丰速运 ==========
  // 顺丰开放平台API文档: https://open.sf-express.com
  // 使用JSON格式请求，服务代码: EXP_RECE_SEARCH_ROUTES
  private async querySFTrace(trackingNo: string, config: LogisticsApiConfig, phone?: string): Promise<LogisticsTrackResult> {
    // 顺丰开放平台参数映射:
    // config.appId -> partnerID (顾客编码)
    // config.appSecret -> checkword (校验码)
    const partnerID = config.appId;
    const checkword = config.appSecret;

    // 检查必要参数
    if (!partnerID || !checkword) {
      return {
        success: false,
        trackingNo,
        companyCode: 'SF',
        companyName: '顺丰速运',
        status: 'error',
        statusText: '顺丰API配置不完整：缺少顾客编码或校验码',
        traces: []
      };
    }

    // 时间戳使用毫秒级（13位）
    const timestamp = Date.now().toString();
    const requestID = `REQ${Date.now()}${Math.random().toString(36).substr(2, 6)}`;

    // 服务代码: EXP_RECE_SEARCH_ROUTES - 路由查询接口
    const serviceCode = 'EXP_RECE_SEARCH_ROUTES';

    // 请求数据 (JSON格式)
    // 🔥 重要：如果不是自己发出的运单，需要提供手机号后四位
    const msgDataObj: any = {
      trackingType: '1',
      trackingNumber: [trackingNo],
      methodType: '1'
    };

    // 如果提供了手机号，添加到请求中（用于验证非自己发出的运单）
    if (phone && phone.trim()) {
      // 🔥 确保只取后4位数字
      const phoneDigits = phone.replace(/\D/g, ''); // 移除非数字字符
      if (phoneDigits.length >= 4) {
        msgDataObj.checkPhoneNo = phoneDigits.slice(-4); // 取手机号后四位
        console.log(`[顺丰开放平台API] 单号: ${trackingNo}, 使用手机号后4位: ${msgDataObj.checkPhoneNo}`);
      } else {
        console.log(`[顺丰开放平台API] 单号: ${trackingNo}, 手机号格式不正确: ${phone}`);
      }
    } else {
      console.log(`[顺丰开放平台API] 单号: ${trackingNo}, 未提供手机号，可能无法查询非自己发出的运单`);
    }

    const msgData = JSON.stringify(msgDataObj);

    // 🔥 关键：先对msgData进行URL编码，然后用编码后的值计算签名
    const encodedMsgData = encodeURIComponent(msgData);

    // 签名计算: Base64(MD5(URL编码后的msgData + timestamp + checkword))
    const signStr = encodedMsgData + timestamp + checkword;
    const msgDigest = crypto.createHash('md5').update(signStr, 'utf8').digest('base64');

    // API地址 - 根据配置的环境选择
    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://sfapi.sf-express.com/std/service'
      : 'https://sfapi-sbox.sf-express.com/std/service';

    console.log('[顺丰开放平台API] ========== 请求参数 ==========');
    console.log('[顺丰开放平台API] 请求URL:', apiUrl);
    console.log('[顺丰开放平台API] partnerID:', partnerID);
    console.log('[顺丰开放平台API] serviceCode:', serviceCode);
    console.log('[顺丰开放平台API] timestamp:', timestamp);
    console.log('[顺丰开放平台API] msgData(原始):', msgData);
    console.log('[顺丰开放平台API] 是否包含手机号验证:', msgDataObj.checkPhoneNo ? `是(${msgDataObj.checkPhoneNo})` : '否');
    console.log('[顺丰开放平台API] apiEnvironment:', config.apiEnvironment);

    // 🔥 手动构建请求体，避免URLSearchParams的二次编码问题
    const requestBody = `partnerID=${encodeURIComponent(partnerID)}&requestID=${encodeURIComponent(requestID)}&serviceCode=${encodeURIComponent(serviceCode)}&timestamp=${timestamp}&msgDigest=${encodeURIComponent(msgDigest)}&msgData=${encodedMsgData}`;

    try {
      const response = await axios.post(apiUrl, requestBody, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        }
      });

      console.log(`[顺丰开放平台API] 单号: ${trackingNo}, 响应:`, JSON.stringify(response.data));
      return this.parseSFJsonResponse(trackingNo, response.data);
    } catch (error: any) {
      console.error(`[顺丰开放平台API] 单号: ${trackingNo}, 请求失败:`, error.message);
      return {
        success: false,
        trackingNo,
        companyCode: 'SF',
        companyName: '顺丰速运',
        status: 'error',
        statusText: '顺丰API请求失败: ' + error.message,
        traces: []
      };
    }
  }

  /**
   * 解析顺丰JSON响应报文
   */
  private parseSFJsonResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'SF',
      companyName: '顺丰速运',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    try {
      console.log('[顺丰开放平台API] ========== 解析响应 ==========');
      console.log('[顺丰开放平台API] 完整响应:', JSON.stringify(data, null, 2));

      // 检查API响应状态
      if (data.apiResultCode !== 'A1000') {
        result.statusText = `API错误: ${data.apiErrorMsg || data.apiResultCode}`;
        console.error('[顺丰开放平台API] 错误:', result.statusText);
        return result;
      }

      // 解析apiResultData (是一个JSON字符串)
      let resultData: any;
      if (typeof data.apiResultData === 'string') {
        try {
          resultData = JSON.parse(data.apiResultData);
        } catch (e) {
          console.error('[顺丰开放平台API] 解析apiResultData失败:', e);
          result.statusText = '解析响应数据失败';
          return result;
        }
      } else {
        resultData = data.apiResultData;
      }

      console.log('[顺丰开放平台API] resultData:', JSON.stringify(resultData, null, 2));
      console.log('[顺丰开放平台API] resultData所有键:', Object.keys(resultData || {}));

      if (!resultData.success) {
        const errorCode = resultData.errorCode || '';
        const errorMsg = resultData.errorMsg || '';

        // 🔥 针对常见错误码提供更友好的提示
        let friendlyMsg = '';
        switch (errorCode) {
          case 'S0002':
            friendlyMsg = '运单号不存在或已过期。请检查：1.单号是否正确 2.是否为顺丰运单 3.运单是否在有效期内';
            break;
          case 'S0001':
            friendlyMsg = '无权限查询此运单。可能原因：1.非本账号发出的运单需要提供收件人手机号后4位 2.运单已超过查询有效期';
            break;
          case 'S0003':
            friendlyMsg = '运单号格式错误，请检查运单号是否正确';
            break;
          case 'S0004':
            friendlyMsg = '查询频率过高，请稍后再试';
            break;
          case 'S0005':
            friendlyMsg = '手机号验证失败，请确认手机号后4位是否正确';
            break;
          default:
            friendlyMsg = `${errorMsg || errorCode || '未知错误'}`;
        }

        result.statusText = friendlyMsg;
        console.error('[顺丰开放平台API] 业务错误:', { errorCode, errorMsg, friendlyMsg });
        return result;
      }

      // 🔥 解析路由信息 - 支持多种可能的数据结构
      const msgData = resultData.msgData || resultData;
      console.log('[顺丰开放平台API] msgData键:', Object.keys(msgData || {}));
      console.log('[顺丰开放平台API] msgData完整内容:', JSON.stringify(msgData, null, 2));

      // 尝试多种可能的路由数据路径
      let routeResps = msgData?.routeResps || msgData?.routeResp || [];
      if (!Array.isArray(routeResps)) {
        routeResps = [routeResps];
      }

      console.log('[顺丰开放平台API] routeResps数量:', routeResps.length);

      if (routeResps.length === 0) {
        // 🔥 尝试其他可能的数据结构
        if (msgData?.routes) {
          routeResps = [{ mailNo: trackingNo, routes: msgData.routes }];
        } else if (msgData?.routeList) {
          routeResps = [{ mailNo: trackingNo, routes: msgData.routeList }];
        }
      }

      // 找到对应运单号的路由
      let routeResp = routeResps.find((r: any) => r.mailNo === trackingNo);
      if (!routeResp && routeResps.length > 0) {
        routeResp = routeResps[0];
      }

      console.log('[顺丰开放平台API] routeResp:', JSON.stringify(routeResp, null, 2));

      if (routeResp) {
        // 🔥 尝试多种可能的路由字段名
        const routes = routeResp.routes || routeResp.routeList || routeResp.route || [];
        console.log('[顺丰开放平台API] routes数量:', routes.length);

        if (routes.length > 0) {
          result.success = true;
          result.traces = routes.map((r: any) => ({
            time: r.acceptTime || r.scanTime || r.time || '',
            status: r.opCode || r.scanType || r.status || '',
            description: r.remark || r.desc || r.description || r.acceptAddress || '',
            location: r.acceptAddress || r.location || r.city || ''
          }));

          console.log('[顺丰开放平台API] 解析到轨迹数量:', result.traces.length);
          if (result.traces.length > 0) {
            console.log('[顺丰开放平台API] 第一条轨迹:', result.traces[0]);
          }

          // 设置最新状态 (路由按时间倒序，第一条是最新的)
          if (result.traces.length > 0) {
            const latestOpcode = result.traces[0].status;
            const statusInfo = this.mapSFStatus(latestOpcode);
            result.status = statusInfo.status;
            result.statusText = statusInfo.text;
            console.log('[顺丰开放平台API] 最新状态:', result.status, result.statusText);

            // 🔥 计算预计送达时间（顺丰）
            result.estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(result.status, result.traces, 'SF');
          }
        } else {
          console.log('[顺丰开放平台API] routes为空');
          // 🔥 改进提示：告知用户可能的原因
          result.statusText = '未查询到物流轨迹。可能原因：1.运单刚发出，建议12-24小时后再查询 2.需要配置快递100作为备选查询渠道';
        }
      } else {
        console.log('[顺丰开放平台API] 未找到routeResp');
        result.statusText = '未查询到物流轨迹（无routeResp）';
      }
    } catch (error: any) {
      console.error('[顺丰开放平台API] 解析响应失败:', error.message);
      console.error('[顺丰开放平台API] 错误堆栈:', error.stack);
      result.statusText = '解析响应失败: ' + error.message;
    }

    return result;
  }

  private mapSFStatus(opCode: string): { status: string; text: string } {
    const map: Record<string, { status: string; text: string }> = {
      '50': { status: 'picked_up', text: '已揽收' },
      '30': { status: 'in_transit', text: '运输中' },
      '31': { status: 'in_transit', text: '到达' },
      '33': { status: 'in_transit', text: '顺丰已收件' },
      '36': { status: 'out_for_delivery', text: '派送中' },
      '44': { status: 'out_for_delivery', text: '派件中' },
      '80': { status: 'delivered', text: '已签收' },
      '8000': { status: 'delivered', text: '已签收' },
      '99': { status: 'exception', text: '异常' },
      '648': { status: 'exception', text: '异常件' }
    };
    return map[opCode] || { status: 'in_transit', text: '运输中' };
  }

  /**
   * 🔥 根据物流状态和轨迹智能计算预计送达时间
   *
   * 计算逻辑：
   * 1. 已签收 → 返回"已签收"或签收时间
   * 2. 派送中 → 预计当天送达
   * 3. 到达目的地城市 → 预计1天内送达
   * 4. 运输中 → 根据已运输天数和快递公司估算
   * 5. 刚揽收 → 根据快递公司默认时效估算
   */
  private calculateEstimatedDeliveryTime(status: string, traces: LogisticsTrace[], companyCode?: string): string | undefined {
    // 如果已签收，返回签收时间
    if (status === 'delivered') {
      if (traces.length > 0) {
        // 找到签收的轨迹
        const deliveredTrace = traces.find(t =>
          t.description?.includes('签收') ||
          t.description?.includes('已签收') ||
          t.description?.includes('代收') ||
          t.description?.includes('已送达') ||
          t.status === '80' ||
          t.status === '8000'
        );
        if (deliveredTrace) {
          // 返回格式化的签收时间
          return `已签收 (${deliveredTrace.time})`;
        }
        return `已签收 (${traces[0].time})`;
      }
      return '已签收';
    }

    // 获取最新轨迹信息
    const latestTrace = traces.length > 0 ? traces[0] : null;
    const latestDesc = latestTrace?.description || '';

    // 派送中 - 预计当天送达
    if (status === 'out_for_delivery' ||
        latestDesc.includes('派送') ||
        latestDesc.includes('派件') ||
        latestDesc.includes('正在派送')) {
      const today = new Date();
      return `预计今日 (${today.toISOString().split('T')[0]})`;
    }

    // 到达目的地城市/网点 - 预计1天内送达
    if (latestDesc.includes('到达') && (latestDesc.includes('网点') || latestDesc.includes('营业部'))) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // 计算已运输天数
    let shippedDays = 0;
    if (traces.length > 0) {
      // 找到揽收时间
      const pickedUpTrace = traces.find(t =>
        t.description?.includes('揽收') ||
        t.description?.includes('收件') ||
        t.description?.includes('已收取')
      ) || traces[traces.length - 1]; // 最早的轨迹

      if (pickedUpTrace?.time) {
        const pickedUpTime = new Date(pickedUpTrace.time);
        const now = new Date();
        shippedDays = Math.floor((now.getTime() - pickedUpTime.getTime()) / (24 * 60 * 60 * 1000));
      }
    }

    // 根据快递公司和状态估算剩余天数
    let remainingDays = 2; // 默认2天

    // 快递公司时效（从揽收到签收的平均天数）
    const companyDeliveryDays: Record<string, number> = {
      'SF': 2,      // 顺丰 2天
      'JD': 2,      // 京东 2天
      'JTSD': 3,    // 极兔 3天
      'YTO': 3,     // 圆通 3天
      'ZTO': 3,     // 中通 3天
      'STO': 3,     // 申通 3天
      'YD': 3,      // 韵达 3天
      'EMS': 4,     // EMS 4天
      'DBL': 3,     // 德邦 3天
    };

    const totalDays = companyDeliveryDays[companyCode || ''] || 3;

    // 根据当前状态调整
    switch (status) {
      case 'picked_up':
        // 刚揽收，使用快递公司默认时效
        remainingDays = totalDays;
        break;
      case 'in_transit':
        // 运输中，根据已运输天数估算
        remainingDays = Math.max(1, totalDays - shippedDays);
        break;
      case 'exception':
        // 异常，增加2天
        remainingDays = Math.max(2, totalDays - shippedDays + 2);
        break;
      default:
        remainingDays = Math.max(1, totalDays - shippedDays);
    }

    // 根据轨迹描述微调
    if (latestDesc.includes('到达') || latestDesc.includes('离开')) {
      // 已经在运输途中
      remainingDays = Math.min(remainingDays, 2);
    }
    if (latestDesc.includes('转运') || latestDesc.includes('中转')) {
      // 在中转站
      remainingDays = Math.min(remainingDays, 2);
    }

    // 计算预计送达日期
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + remainingDays);
    return estimatedDate.toISOString().split('T')[0];
  }


  // ========== 中通快递 ==========
  private async queryZTOTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = Date.now().toString();
    const data = JSON.stringify({ billCode: trackingNo });

    const signStr = config.appKey + timestamp + data + config.appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://japi.zto.com/zto.open.getTraceInfo'
      : 'https://japi-test.zto.com/zto.open.getTraceInfo';

    const response = await axios.post(apiUrl, data, {
      headers: {
        'Content-Type': 'application/json',
        'x-companyid': config.appId || '',
        'x-appkey': config.appKey || '',
        'x-datadigest': sign,
        'x-timestamp': timestamp
      },
      timeout: 10000
    });

    return this.parseZTOResponse(trackingNo, response.data);
  }

  private parseZTOResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'ZTO',
      companyName: '中通快递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.status === true && data.result) {
      result.success = true;
      const traces = data.result.traces || [];
      result.traces = traces.map((t: any) => ({
        time: t.scanDate,
        status: t.scanType,
        description: t.desc,
        location: t.scanSite
      }));

      if (traces.length > 0) {
        const latestStatus = traces[0].scanType;
        result.status = this.mapZTOStatus(latestStatus);
        result.statusText = this.getStatusText(result.status);

        // 🔥 计算预计送达时间（中通）
        result.estimatedDeliveryTime = this.calculateEstimatedDeliveryTime(result.status, result.traces, 'ZTO');
      }
    }

    return result;
  }

  private mapZTOStatus(scanType: string): string {
    const map: Record<string, string> = {
      '收件': 'picked_up',
      '发件': 'in_transit',
      '到件': 'in_transit',
      '派件': 'out_for_delivery',
      '签收': 'delivered',
      '退件': 'returned',
      '问题件': 'exception'
    };
    return map[scanType] || 'in_transit';
  }

  // ========== 圆通速递 ==========
  // 圆通开放平台API文档: https://open.yto.net.cn/interfaceDocument/menu251/submenu258
  private async queryYTOTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = Date.now().toString();

    // 请求体数据
    const requestData = {
      waybillNo: trackingNo
    };
    const dataStr = JSON.stringify(requestData);

    // 签名: MD5(data + appSecret)
    const signStr = dataStr + config.appKey; // appKey存储的是AppSecret
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    // API地址根据环境选择
    const baseUrl = config.apiEnvironment === 'production'
      ? 'https://openapi.yto.net.cn/open/track_query_adapter/v1'
      : 'https://openuat.yto56test.com:5443/open/track_query_adapter/v1';

    // 完整URL: baseUrl/{appKey}/{环境标识}
    const envFlag = config.apiEnvironment === 'production' ? 'PROD' : 'TEST';
    const apiUrl = `${baseUrl}/${config.appId}/${envFlag}`;

    console.log('[圆通API] 请求URL:', apiUrl);
    console.log('[圆通API] 请求数据:', dataStr);

    const response = await axios.post(apiUrl, {
      data: dataStr,
      sign: sign,
      timestamp: timestamp,
      format: 'JSON',
      user_id: config.appSecret // appSecret存储的是UserId
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    console.log('[圆通API] 响应:', JSON.stringify(response.data));
    return this.parseYTOResponse(trackingNo, response.data);
  }

  private parseYTOResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'YTO',
      companyName: '圆通速递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.success === true || data.code === '0') {
      result.success = true;
      const traces = data.data?.traces || data.traces || [];
      result.traces = traces.map((t: any) => ({
        time: t.time || t.uploadTime,
        status: t.processInfo,
        description: t.processInfo,
        location: t.city
      }));

      if (traces.length > 0) {
        result.status = this.detectStatusFromDescription(traces[0].processInfo);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 申通快递 ==========
  private async querySTOTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const data = JSON.stringify({ waybillNoList: [trackingNo] });
    const signStr = data + config.appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('base64');

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://cloudinter-linkgateway.sto.cn/gateway/link.do'
      : 'http://cloudinter-linkgatewaytest.sto.cn/gateway/link.do';

    const params = new URLSearchParams();
    params.append('content', data);
    params.append('data_digest', sign);
    params.append('api_name', 'STO_TRACE_QUERY_COMMON');
    params.append('from_appkey', config.appId || '');
    params.append('from_code', config.appId || '');
    params.append('to_appkey', 'sto_trace_query');
    params.append('to_code', 'sto_trace_query');

    const response = await axios.post(apiUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    return this.parseSTOResponse(trackingNo, response.data);
  }

  private parseSTOResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'STO',
      companyName: '申通快递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.success === true || data.success === 'true') {
      result.success = true;
      const traceData = data.data?.[0]?.traceList || [];
      result.traces = traceData.map((t: any) => ({
        time: t.scanTime,
        status: t.scanType,
        description: t.memo,
        location: t.scanNetworkName
      }));

      if (traceData.length > 0) {
        result.status = this.detectStatusFromDescription(traceData[0].memo);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 韵达速递 ==========
  private async queryYDTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({ mailno: trackingNo });

    const signStr = data + config.appSecret + timestamp;
    const sign = crypto.createHash('md5').update(signStr).digest('hex');

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://openapi.yundaex.com/openapi/outer/logictis/query'
      : 'https://u-openapi.yundasys.com/openapi/outer/logictis/query';

    const response = await axios.post(apiUrl, {
      appkey: config.appId,
      partner_id: config.customerId || '',
      timestamp: timestamp,
      sign: sign,
      request: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return this.parseYDResponse(trackingNo, response.data);
  }

  private parseYDResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'YD',
      companyName: '韵达速递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.code === '0' || data.code === 0 || data.success === true) {
      result.success = true;
      const traces = data.data?.steps || [];
      result.traces = traces.map((t: any) => ({
        time: t.time,
        status: t.status,
        description: t.context,
        location: t.location
      }));

      if (traces.length > 0) {
        result.status = this.detectStatusFromDescription(traces[0].context);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 极兔速递 ==========
  private async queryJTTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = Date.now().toString();
    const data = JSON.stringify({ billCodes: trackingNo });

    const sign = crypto.createHash('md5').update(data + config.appSecret).digest('hex');

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://openapi.jtexpress.com.cn/webopenplatformapi/api/logistics/trace/queryTracesByBillCodes'
      : 'https://openapi-test.jtexpress.com.cn/webopenplatformapi/api/logistics/trace/queryTracesByBillCodes';

    const response = await axios.post(apiUrl, {
      logistics_interface: data,
      data_digest: sign,
      msg_type: 'TRACEQUERY',
      eccompanyid: config.customerId || config.appId,
      timestamp: timestamp
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return this.parseJTResponse(trackingNo, response.data);
  }

  private parseJTResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'JTSD',
      companyName: '极兔速递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.code === '1' || data.success === true) {
      result.success = true;
      const traces = data.data?.details || [];
      result.traces = traces.map((t: any) => ({
        time: t.scanTime,
        status: t.scanType,
        description: t.desc,
        location: t.scanNetworkName
      }));

      if (traces.length > 0) {
        result.status = this.detectStatusFromDescription(traces[0].desc);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 邮政EMS ==========
  private async queryEMSTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({ mailNo: trackingNo });

    const signStr = data + config.appSecret + timestamp;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://eis.11183.com.cn/openapi/mailTrack/query'
      : 'https://eis.11183.com.cn/openapi/test/mailTrack/query';

    const response = await axios.post(apiUrl, {
      appKey: config.appId,
      timestamp: timestamp,
      sign: sign,
      data: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return this.parseEMSResponse(trackingNo, response.data);
  }

  private parseEMSResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'EMS',
      companyName: '邮政EMS',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.code === '0' || data.success === true) {
      result.success = true;
      const traces = data.data?.traces || [];
      result.traces = traces.map((t: any) => ({
        time: t.acceptTime,
        status: t.opCode,
        description: t.opName,
        location: t.opOrgCity
      }));

      if (traces.length > 0) {
        result.status = this.detectStatusFromDescription(traces[0].opName);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 京东物流 ==========
  private async queryJDTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const data = JSON.stringify({
      waybillCode: trackingNo,
      customerCode: config.customerId || ''
    });

    const signStr = config.appSecret + timestamp + data + config.appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://api.jdl.com/ecap/v1/orders/trace/query'
      : 'https://uat-api.jdl.com/ecap/v1/orders/trace/query';

    const response = await axios.post(apiUrl, {
      app_key: config.appId,
      timestamp: timestamp,
      sign: sign,
      param_json: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return this.parseJDResponse(trackingNo, response.data);
  }

  private parseJDResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'JD',
      companyName: '京东物流',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.code === '0' || data.code === 0 || data.success === true) {
      result.success = true;
      const traces = data.data?.traceList || [];
      result.traces = traces.map((t: any) => ({
        time: t.msgTime,
        status: t.waybillStatus,
        description: t.content,
        location: t.operatorSite,
        operator: t.operator
      }));

      if (traces.length > 0) {
        result.status = this.mapJDStatus(traces[0].waybillStatus);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  private mapJDStatus(status: string): string {
    const map: Record<string, string> = {
      '1': 'picked_up',
      '2': 'in_transit',
      '3': 'out_for_delivery',
      '4': 'delivered',
      '5': 'rejected',
      '6': 'exception'
    };
    return map[status] || 'in_transit';
  }

  // ========== 德邦快递 ==========
  private async queryDBLTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
    const timestamp = Date.now().toString();
    const data = JSON.stringify({
      logisticCompanyID: 'DEPPON',
      logisticID: trackingNo,
      companyCode: config.customerId || ''
    });

    const signStr = config.appId + data + timestamp + config.appSecret;
    const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();

    const apiUrl = config.apiEnvironment === 'production'
      ? 'https://dpapi.deppon.com/dop-interface-sync/standard-order/newTraceQuery.action'
      : 'http://dpapi-test.deppon.com/dop-interface-sync/standard-order/newTraceQuery.action';

    const response = await axios.post(apiUrl, {
      companyCode: config.appId,
      timestamp: timestamp,
      digest: sign,
      params: data
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    return this.parseDBLResponse(trackingNo, response.data);
  }

  private parseDBLResponse(trackingNo: string, data: any): LogisticsTrackResult {
    const result: LogisticsTrackResult = {
      success: false,
      trackingNo,
      companyCode: 'DBL',
      companyName: '德邦快递',
      status: 'unknown',
      statusText: '未知状态',
      traces: [],
      rawData: data
    };

    if (data.result === 'true' || data.success === true) {
      result.success = true;
      const traces = data.responseParam?.traceList || [];
      result.traces = traces.map((t: any) => ({
        time: t.operateTime,
        status: t.operateType,
        description: t.description,
        location: t.operateDept
      }));

      if (traces.length > 0) {
        result.status = this.detectStatusFromDescription(traces[0].description);
        result.statusText = this.getStatusText(result.status);
      }
    }

    return result;
  }

  // ========== 通用辅助方法 ==========

  /**
   * 从描述文本中检测物流状态
   */
  private detectStatusFromDescription(desc: string): string {
    if (!desc) return 'in_transit';

    const lowerDesc = desc.toLowerCase();

    if (lowerDesc.includes('签收') || lowerDesc.includes('已签') || lowerDesc.includes('delivered')) {
      return 'delivered';
    }
    if (lowerDesc.includes('派送') || lowerDesc.includes('派件') || lowerDesc.includes('正在投递')) {
      return 'out_for_delivery';
    }
    if (lowerDesc.includes('揽收') || lowerDesc.includes('收件') || lowerDesc.includes('已收')) {
      return 'picked_up';
    }
    if (lowerDesc.includes('拒收') || lowerDesc.includes('拒签')) {
      return 'rejected';
    }
    if (lowerDesc.includes('退回') || lowerDesc.includes('退件')) {
      return 'returned';
    }
    if (lowerDesc.includes('异常') || lowerDesc.includes('问题')) {
      return 'exception';
    }

    return 'in_transit';
  }

  /**
   * 获取状态文本
   */
  private getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'pending': '待揽收',
      'picked_up': '已揽收',
      'in_transit': '运输中',
      'out_for_delivery': '派送中',
      'delivered': '已签收',
      'rejected': '拒收',
      'returned': '已退回',
      'exception': '异常',
      'unknown': '未知状态'
    };
    return textMap[status] || '未知状态';
  }
}

// 导出单例
export const logisticsTraceService = new LogisticsTraceService();
