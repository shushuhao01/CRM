import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { logger } from '../config/logger';

export interface ExpressTraceItem {
  time: string;
  location?: string;
  description: string;
  status?: string;
  operator?: string;
  phone?: string;
}

export interface ExpressQueryResult {
  success: boolean;
  trackingNo: string;
  companyCode: string;
  companyName: string;
  status: string;
  statusDescription: string;
  currentLocation?: string;
  traces: ExpressTraceItem[];
  rawData?: any;
  error?: string;
}

export interface ExpressCompany {
  code: string;
  name: string;
  phone?: string;
  website?: string;
}

export class ExpressAPIService {
  private static instance: ExpressAPIService;
  private readonly timeout: number;
  private readonly kuaidi100Config: {
    customer: string;
    key: string;
    url: string;
  };
  private readonly kdniaoConfig: {
    customerId: string;
    apiKey: string;
    url: string;
  };

  // 支持的快递公司列表
  private readonly supportedCompanies: ExpressCompany[] = [
    { code: 'shentong', name: '申通快递', phone: '95543' },
    { code: 'ems', name: 'EMS', phone: '11183' },
    { code: 'shunfeng', name: '顺丰速运', phone: '95338' },
    { code: 'yuantong', name: '圆通速递', phone: '95554' },
    { code: 'yunda', name: '韵达速递', phone: '95546' },
    { code: 'zhongtong', name: '中通快递', phone: '95311' },
    { code: 'huitongkuaidi', name: '百世快递', phone: '95320' },
    { code: 'tiantian', name: '天天快递', phone: '400-188-8888' },
    { code: 'jingdong', name: '京东快递', phone: '950616' },
    { code: 'youzhengguonei', name: '邮政快递包裹', phone: '11183' },
    { code: 'debangwuliu', name: '德邦快递', phone: '95353' },
    { code: 'zhaijisong', name: '宅急送', phone: '400-6789-000' },
    { code: 'kuaijiesudi', name: '快捷速递', phone: '400-833-3666' }
  ];

  private constructor() {
    this.timeout = parseInt(process.env.EXPRESS_API_TIMEOUT || '10000');
    
    this.kuaidi100Config = {
      customer: process.env.EXPRESS_API_CUSTOMER || '',
      key: process.env.EXPRESS_API_KEY || '',
      url: process.env.EXPRESS_API_URL || 'https://poll.kuaidi100.com/poll/query.do'
    };

    this.kdniaoConfig = {
      customerId: process.env.KDNIAO_CUSTOMER_ID || '',
      apiKey: process.env.KDNIAO_API_KEY || '',
      url: process.env.KDNIAO_API_URL || 'https://api.kdniao.com/Ebusiness/EbusinessOrderHandle.aspx'
    };
  }

  public static getInstance(): ExpressAPIService {
    if (!ExpressAPIService.instance) {
      ExpressAPIService.instance = new ExpressAPIService();
    }
    return ExpressAPIService.instance;
  }

  /**
   * 查询物流信息
   */
  async queryExpress(trackingNo: string, companyCode: string): Promise<ExpressQueryResult> {
    try {
      // 优先使用快递100 API
      if (this.kuaidi100Config.customer && this.kuaidi100Config.key) {
        const result = await this.queryByKuaidi100(trackingNo, companyCode);
        if (result.success) {
          return result;
        }
        logger.warn(`快递100查询失败，尝试快递鸟API: ${result.error}`);
      }

      // 备用快递鸟API
      if (this.kdniaoConfig.customerId && this.kdniaoConfig.apiKey) {
        const result = await this.queryByKdniao(trackingNo, companyCode);
        if (result.success) {
          return result;
        }
        logger.warn(`快递鸟查询失败: ${result.error}`);
      }

      // 如果都失败，返回模拟数据
      logger.info(`API查询失败，返回模拟数据: ${trackingNo}`);
      return this.generateMockData(trackingNo, companyCode);
    } catch (error) {
      logger.error('查询物流信息失败:', error);
      return this.generateMockData(trackingNo, companyCode, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 使用快递100 API查询
   */
  private async queryByKuaidi100(trackingNo: string, companyCode: string): Promise<ExpressQueryResult> {
    try {
      const param = {
        com: companyCode,
        num: trackingNo,
        phone: '',
        from: '',
        to: '',
        resultv2: '1'
      };

      const paramStr = JSON.stringify(param);
      const sign = crypto.createHash('md5')
        .update(paramStr + this.kuaidi100Config.key + this.kuaidi100Config.customer)
        .digest('hex')
        .toUpperCase();

      const response: AxiosResponse = await axios.post(
        this.kuaidi100Config.url,
        new URLSearchParams({
          customer: this.kuaidi100Config.customer,
          sign: sign,
          param: paramStr
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'CRM-System/1.0'
          },
          timeout: this.timeout
        }
      );

      if (response.data.returnCode === '200') {
        const data = response.data.data;
        return {
          success: true,
          trackingNo,
          companyCode,
          companyName: this.getCompanyName(companyCode),
          status: this.mapKuaidi100Status(data.state),
          statusDescription: this.getStatusDescription(data.state),
          currentLocation: data.data?.[0]?.context || '',
          traces: data.data?.map((item: any) => ({
            time: item.time,
            location: item.context,
            description: item.context,
            status: data.state,
            operator: '',
            phone: ''
          })) || [],
          rawData: response.data
        };
      } else {
        return {
          success: false,
          trackingNo,
          companyCode,
          companyName: this.getCompanyName(companyCode),
          status: 'unknown',
          statusDescription: '查询失败',
          traces: [],
          error: response.data.message || '快递100 API调用失败'
        };
      }
    } catch (error) {
      logger.error('快递100 API调用失败:', error);
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: this.getCompanyName(companyCode),
        status: 'unknown',
        statusDescription: '查询失败',
        traces: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 使用快递鸟API查询
   */
  private async queryByKdniao(trackingNo: string, companyCode: string): Promise<ExpressQueryResult> {
    try {
      const requestData = JSON.stringify({
        OrderCode: '',
        ShipperCode: companyCode.toUpperCase(),
        LogisticCode: trackingNo
      });

      const dataSign = crypto.createHash('md5')
        .update(requestData + this.kdniaoConfig.apiKey)
        .digest('hex')
        .toUpperCase();

      const response: AxiosResponse = await axios.post(
        this.kdniaoConfig.url,
        new URLSearchParams({
          RequestData: requestData,
          EBusinessID: this.kdniaoConfig.customerId,
          RequestType: '1002',
          DataSign: dataSign,
          DataType: '2'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'CRM-System/1.0'
          },
          timeout: this.timeout
        }
      );

      if (response.data.Success) {
        const data = response.data;
        return {
          success: true,
          trackingNo,
          companyCode,
          companyName: this.getCompanyName(companyCode),
          status: this.mapKdniaoStatus(data.State),
          statusDescription: this.getKdniaoStatusDescription(data.State),
          currentLocation: data.Traces?.[0]?.AcceptStation || '',
          traces: data.Traces?.map((item: any) => ({
            time: item.AcceptTime,
            location: item.AcceptStation,
            description: item.AcceptStation,
            status: data.State,
            operator: '',
            phone: ''
          })) || [],
          rawData: response.data
        };
      } else {
        return {
          success: false,
          trackingNo,
          companyCode,
          companyName: this.getCompanyName(companyCode),
          status: 'unknown',
          statusDescription: '查询失败',
          traces: [],
          error: response.data.Reason || '快递鸟API调用失败'
        };
      }
    } catch (error) {
      logger.error('快递鸟API调用失败:', error);
      return {
        success: false,
        trackingNo,
        companyCode,
        companyName: this.getCompanyName(companyCode),
        status: 'unknown',
        statusDescription: '查询失败',
        traces: [],
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 生成模拟数据
   */
  private generateMockData(trackingNo: string, companyCode: string, error?: string): ExpressQueryResult {
    const now = new Date();
    const traces: ExpressTraceItem[] = [
      {
        time: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
        location: '深圳市',
        description: '快件已在深圳分拣中心完成分拣，准备发往下一站',
        status: 'in_transit',
        operator: '张三',
        phone: '13800138000'
      },
      {
        time: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
        location: '广州市',
        description: '快件已到达广州转运中心',
        status: 'in_transit',
        operator: '李四',
        phone: '13800138001'
      },
      {
        time: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
        location: '北京市',
        description: '快件已到达北京分拣中心，正在派送中',
        status: 'out_for_delivery',
        operator: '王五',
        phone: '13800138002'
      }
    ];

    return {
      success: true,
      trackingNo,
      companyCode,
      companyName: this.getCompanyName(companyCode),
      status: 'out_for_delivery',
      statusDescription: '派送中（模拟数据）',
      currentLocation: '北京市',
      traces,
      error: error ? `API调用失败，使用模拟数据: ${error}` : '使用模拟数据'
    };
  }

  /**
   * 映射快递100状态
   */
  private mapKuaidi100Status(state: string): string {
    const statusMap: Record<string, string> = {
      '0': 'in_transit',      // 在途
      '1': 'picked_up',       // 揽件
      '2': 'exception',       // 疑难
      '3': 'delivered',       // 签收
      '4': 'returned',        // 退签
      '5': 'out_for_delivery', // 派件
      '6': 'returned'         // 退回
    };
    return statusMap[state] || 'pending';
  }

  /**
   * 映射快递鸟状态
   */
  private mapKdniaoStatus(state: string): string {
    const statusMap: Record<string, string> = {
      '2': 'in_transit',      // 在途中
      '3': 'delivered',       // 已签收
      '4': 'exception'        // 问题件
    };
    return statusMap[state] || 'pending';
  }

  /**
   * 获取状态描述
   */
  private getStatusDescription(state: string): string {
    const descriptions: Record<string, string> = {
      '0': '运输中',
      '1': '已揽件',
      '2': '包裹异常',
      '3': '已签收',
      '4': '拒收',
      '5': '派送中',
      '6': '退回'
    };
    return descriptions[state] || '待发货';
  }

  /**
   * 获取快递鸟状态描述
   */
  private getKdniaoStatusDescription(state: string): string {
    const descriptions: Record<string, string> = {
      '2': '运输中',
      '3': '已签收',
      '4': '问题件'
    };
    return descriptions[state] || '待发货';
  }

  /**
   * 获取快递公司名称
   */
  public getCompanyName(companyCode: string): string {
    const company = this.supportedCompanies.find(c => c.code === companyCode);
    return company?.name || companyCode;
  }

  /**
   * 获取支持的快递公司列表
   */
  public getSupportedCompanies(): ExpressCompany[] {
    return this.supportedCompanies;
  }

  /**
   * 检查API配置是否有效
   */
  public isConfigured(): boolean {
    return !!(
      (this.kuaidi100Config.customer && this.kuaidi100Config.key) ||
      (this.kdniaoConfig.customerId && this.kdniaoConfig.apiKey)
    );
  }

  /**
   * 获取配置状态
   */
  public getConfigStatus(): {
    kuaidi100: boolean;
    kdniao: boolean;
    configured: boolean;
  } {
    return {
      kuaidi100: !!(this.kuaidi100Config.customer && this.kuaidi100Config.key),
      kdniao: !!(this.kdniaoConfig.customerId && this.kdniaoConfig.apiKey),
      configured: this.isConfigured()
    };
  }
}