import { AppDataSource } from '../config/database';
import { ApiConfig } from '../entities/ApiConfig';
import { ApiCallLog } from '../entities/ApiCallLog';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { getTenantRepo } from '../utils/tenantRepo';

export class ApiConfigService {
  private get apiConfigRepository() {
    return getTenantRepo(ApiConfig);
  }
  private get apiCallLogRepository() {
    return getTenantRepo(ApiCallLog);
  }

  /**
   * 获取API配置列表
   */
  async getApiConfigs(query: any = {}): Promise<{ data: ApiConfig[]; total: number }> {
    const { page = 1, pageSize = 10, status, code, name } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.apiConfigRepository.createQueryBuilder('api_config');

    // 筛选条件
    if (status) {
      queryBuilder.andWhere('api_config.status = :status', { status });
    }
    if (code) {
      queryBuilder.andWhere('api_config.code LIKE :code', { code: `%${code}%` });
    }
    if (name) {
      queryBuilder.andWhere('api_config.name LIKE :name', { name: `%${name}%` });
    }

    // 分页和排序
    queryBuilder
      .orderBy('api_config.created_at', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * 根据ID获取API配置详情
   */
  async getApiConfigById(id: string): Promise<ApiConfig | null> {
    return await this.apiConfigRepository.findOne({ where: { id } });
  }

  /**
   * 根据API Key获取配置
   */
  async getApiConfigByKey(apiKey: string): Promise<ApiConfig | null> {
    return await this.apiConfigRepository.findOne({ where: { apiKey } });
  }

  /**
   * 创建API配置
   */
  async createApiConfig(data: Partial<ApiConfig>): Promise<ApiConfig> {
    const apiConfig = new ApiConfig();
    apiConfig.id = uuidv4();
    apiConfig.name = data.name!;
    apiConfig.code = data.code!;
    apiConfig.description = data.description;

    // 生成API密钥
    apiConfig.apiKey = this.generateApiKey();
    apiConfig.apiSecret = this.generateApiSecret();

    apiConfig.status = data.status || 'active';
    apiConfig.rateLimit = data.rateLimit || 1000;

    if (data.allowedIps) {
      apiConfig.allowedIps = data.allowedIps;
    }
    if (data.expiresAt) {
      apiConfig.expiresAt = data.expiresAt;
    }

    return await this.apiConfigRepository.save(apiConfig);
  }

  /**
   * 更新API配置
   */
  async updateApiConfig(id: string, data: Partial<ApiConfig>): Promise<ApiConfig> {
    const apiConfig = await this.getApiConfigById(id);
    if (!apiConfig) {
      throw new Error('API配置不存在');
    }

    // 更新字段
    if (data.name !== undefined) apiConfig.name = data.name;
    if (data.description !== undefined) apiConfig.description = data.description;
    if (data.status !== undefined) apiConfig.status = data.status;
    if (data.rateLimit !== undefined) apiConfig.rateLimit = data.rateLimit;
    if (data.allowedIps !== undefined) apiConfig.allowedIps = data.allowedIps;
    if (data.expiresAt !== undefined) apiConfig.expiresAt = data.expiresAt;

    return await this.apiConfigRepository.save(apiConfig);
  }

  /**
   * 删除API配置
   */
  async deleteApiConfig(id: string): Promise<void> {
    const apiConfig = await this.getApiConfigById(id);
    if (!apiConfig) {
      throw new Error('API配置不存在');
    }

    await this.apiConfigRepository.remove(apiConfig);
  }

  /**
   * 重新生成API密钥
   */
  async regenerateKey(id: string): Promise<ApiConfig> {
    const apiConfig = await this.getApiConfigById(id);
    if (!apiConfig) {
      throw new Error('API配置不存在');
    }

    // 生成新的密钥
    apiConfig.apiKey = this.generateApiKey();
    apiConfig.apiSecret = this.generateApiSecret();

    return await this.apiConfigRepository.save(apiConfig);
  }

  /**
   * 获取API调用日志
   */
  async getApiCallLogs(query: any = {}): Promise<{ data: ApiCallLog[]; total: number }> {
    const {
      page = 1,
      pageSize = 10,
      apiConfigId,
      apiKey,
      endpoint,
      startDate,
      endDate
    } = query;
    const skip = (page - 1) * pageSize;

    const queryBuilder = this.apiCallLogRepository.createQueryBuilder('log');

    // 筛选条件
    if (apiConfigId) {
      queryBuilder.andWhere('log.apiConfigId = :apiConfigId', { apiConfigId });
    }
    if (apiKey) {
      queryBuilder.andWhere('log.apiKey = :apiKey', { apiKey });
    }
    if (endpoint) {
      queryBuilder.andWhere('log.endpoint LIKE :endpoint', { endpoint: `%${endpoint}%` });
    }
    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate });
    }

    // 分页和排序
    queryBuilder
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { data, total };
  }

  /**
   * 记录API调用
   */
  async logApiCall(data: Partial<ApiCallLog>): Promise<ApiCallLog> {
    const log = new ApiCallLog();
    log.id = uuidv4();
    log.apiConfigId = data.apiConfigId;
    log.apiKey = data.apiKey;
    log.endpoint = data.endpoint!;
    log.method = data.method!;
    log.requestParams = data.requestParams;
    log.responseStatus = data.responseStatus;
    log.responseTime = data.responseTime;
    log.ipAddress = data.ipAddress;
    log.userAgent = data.userAgent;
    log.errorMessage = data.errorMessage;

    return await this.apiCallLogRepository.save(log);
  }

  /**
   * 更新最后使用时间
   */
  async updateLastUsedAt(id: string): Promise<void> {
    await this.apiConfigRepository.update(id, {
      lastUsedAt: new Date()
    });
  }

  /**
   * 获取API统计信息
   */
  async getApiStatistics(apiConfigId?: string): Promise<any> {
    const queryBuilder = this.apiCallLogRepository.createQueryBuilder('log');

    if (apiConfigId) {
      queryBuilder.where('log.apiConfigId = :apiConfigId', { apiConfigId });
    }

    // 总调用次数
    const totalCalls = await queryBuilder.getCount();

    // 成功次数
    const successCalls = await queryBuilder
      .clone()
      .andWhere('log.responseStatus >= 200 AND log.responseStatus < 300')
      .getCount();

    // 平均响应时间
    const avgTimeResult = await queryBuilder
      .clone()
      .select('AVG(log.responseTime)', 'avgTime')
      .getRawOne();

    // 错误次数
    const errorCalls = await queryBuilder
      .clone()
      .andWhere('log.responseStatus >= 400 OR log.errorMessage IS NOT NULL')
      .getCount();

    return {
      totalCalls,
      successCalls,
      successRate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(1) : 0,
      avgTime: avgTimeResult?.avgTime ? Math.round(avgTimeResult.avgTime) : 0,
      errorCount: errorCalls
    };
  }

  /**
   * 生成API Key
   */
  private generateApiKey(): string {
    return `ak_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * 生成API Secret
   */
  private generateApiSecret(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }
}
