/**
 * 物流轨迹查询服务
 * 调用各快递公司API获取真实物流轨迹
 */
import crypto from 'crypto';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { LogisticsApiConfig } from '../entities/LogisticsApiConfig';

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
   */
  async queryTrace(trackingNo: string, companyCode?: string): Promise<LogisticsTrackResult> {
    console.log(`[物流查询] 开始查询: 单号=${trackingNo}, 公司代码=${companyCode || '自动识别'}`);

    // 如果没有指定快递公司，尝试自动识别
    if (!companyCode || companyCode === 'auto') {
      companyCode = this.detectCompanyCode(trackingNo);
      console.log(`[物流查询] 自动识别快递公司: ${companyCode || '未识别'}`);
    }

    // 标准化公司代码（转大写）
    if (companyCode) {
      companyCode = companyCode.toUpperCase();
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
      switch (companyCode) {
        case 'SF':
          return await this.querySFTrace(trackingNo, config);
        case 'ZTO':
          return await this.queryZTOTrace(trackingNo, config);
        case 'YTO':
          return await this.queryYTOTrace(trackingNo, config);
        case 'STO':
          return await this.querySTOTrace(trackingNo, config);
        case 'YD':
          return await this.queryYDTrace(trackingNo, config);
        case 'JTSD':
          return await this.queryJTTrace(trackingNo, config);
        case 'EMS':
          return await this.queryEMSTrace(trackingNo, config);
        case 'JD':
          return await this.queryJDTrace(trackingNo, config);
        case 'DBL':
          return await this.queryDBLTrace(trackingNo, config);
        default:
          return {
            success: false,
            trackingNo,
            companyCode,
            companyName: COMPANY_NAMES[companyCode] || companyCode,
            status: 'unknown',
            statusText: '暂不支持该快递公司的API查询',
            traces: []
          };
      }
    } catch (error: any) {
      console.error(`[物流查询] ${companyCode} 查询失败:`, error.message);
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
  private async querySFTrace(trackingNo: string, config: LogisticsApiConfig): Promise<LogisticsTrackResult> {
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
    const msgData = JSON.stringify({
      trackingType: '1',
      trackingNumber: [trackingNo],
      methodType: '1'
    });

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

      console.log('[顺丰开放平台API] 响应:', JSON.stringify(response.data));
      return this.parseSFJsonResponse(trackingNo, response.data);
    } catch (error: any) {
      console.error('[顺丰开放平台API] 请求失败:', error.message);
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
      console.log('[顺丰开放平台API] apiResultCode:', data.apiResultCode);
      console.log('[顺丰开放平台API] apiErrorMsg:', data.apiErrorMsg);

      // 检查API响应状态
      if (data.apiResultCode !== 'A1000') {
        result.statusText = `API错误: ${data.apiErrorMsg || data.apiResultCode}`;
        console.error('[顺丰开放平台API] 错误:', result.statusText);
        return result;
      }

      // 解析apiResultData (是一个JSON字符串)
      console.log('[顺丰开放平台API] apiResultData类型:', typeof data.apiResultData);
      console.log('[顺丰开放平台API] apiResultData:', data.apiResultData);

      const resultData = typeof data.apiResultData === 'string'
        ? JSON.parse(data.apiResultData)
        : data.apiResultData;

      console.log('[顺丰开放平台API] 解析后的resultData:', JSON.stringify(resultData, null, 2));

      if (!resultData.success) {
        result.statusText = `查询失败: ${resultData.errorMsg || resultData.errorCode}`;
        console.error('[顺丰开放平台API] 业务错误:', result.statusText);
        return result;
      }

      // 解析路由信息
      // 响应格式: { success: true, msgData: { routeResps: [{ mailNo, routes: [...] }] } }
      console.log('[顺丰开放平台API] msgData:', JSON.stringify(resultData.msgData, null, 2));

      const routeResps = resultData.msgData?.routeResps || [];
      console.log('[顺丰开放平台API] routeResps数量:', routeResps.length);

      // 找到对应运单号的路由
      const routeResp = routeResps.find((r: any) => r.mailNo === trackingNo) || routeResps[0];
      console.log('[顺丰开放平台API] 匹配的routeResp:', JSON.stringify(routeResp, null, 2));

      if (routeResp && routeResp.routes && routeResp.routes.length > 0) {
        result.success = true;
        result.traces = routeResp.routes.map((r: any) => ({
          time: r.acceptTime,
          status: r.opCode,
          description: r.remark,
          location: r.acceptAddress
        }));

        console.log('[顺丰开放平台API] 解析到轨迹数量:', result.traces.length);
        console.log('[顺丰开放平台API] 第一条轨迹:', result.traces[0]);

        // 设置最新状态 (路由按时间倒序，第一条是最新的)
        if (result.traces.length > 0) {
          const latestOpcode = result.traces[0].status;
          const statusInfo = this.mapSFStatus(latestOpcode);
          result.status = statusInfo.status;
          result.statusText = statusInfo.text;
          console.log('[顺丰开放平台API] 最新状态:', result.status, result.statusText);
        }
      } else {
        console.log('[顺丰开放平台API] 未找到路由数据');
        console.log('[顺丰开放平台API] routeResp:', routeResp);
        console.log('[顺丰开放平台API] routes:', routeResp?.routes);

        // 🔥 检查是否有其他格式的数据
        if (resultData.msgData) {
          console.log('[顺丰开放平台API] msgData所有键:', Object.keys(resultData.msgData));
        }

        result.statusText = '未查询到物流轨迹';
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
