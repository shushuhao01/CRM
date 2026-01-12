/**
 * 企业微信API服务
 * 封装企业微信各类API调用
 */
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { WecomConfig } from '../entities/WecomConfig';

const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// Access Token 缓存
const tokenCache: Map<string, { token: string; expireTime: number }> = new Map();

export class WecomApiService {
  /**
   * 获取企业微信Access Token
   */
  static async getAccessToken(corpId: string, secret: string): Promise<string> {
    const cacheKey = `${corpId}:${secret.substring(0, 10)}`;
    const cached = tokenCache.get(cacheKey);

    if (cached && cached.expireTime > Date.now()) {
      console.log('[WecomApi] Using cached token');
      return cached.token;
    }

    try {
      console.log(`[WecomApi] Fetching new token for corpId: ${corpId}, secret: ${secret.substring(0, 10)}...`);
      const response = await axios.get(`${WECOM_API_BASE}/gettoken`, {
        params: { corpid: corpId, corpsecret: secret }
      });

      console.log('[WecomApi] Token response:', JSON.stringify(response.data));

      if (response.data.errcode === 0) {
        const token = response.data.access_token;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
        tokenCache.set(cacheKey, { token, expireTime });
        console.log('[WecomApi] Token cached successfully');
        return token;
      } else {
        // 常见错误码说明
        const errorHints: Record<number, string> = {
          40001: 'secret无效，请检查是否复制正确',
          40013: 'corpid无效，请检查企业ID是否正确',
          40056: '不合法的agentid',
          60020: '访问IP不在白名单，请在企微后台添加服务器IP到可信IP列表'
        };
        const hint = errorHints[response.data.errcode] || '';
        throw new Error(`获取AccessToken失败: ${response.data.errmsg} (errcode: ${response.data.errcode})${hint ? ' - ' + hint : ''}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getAccessToken error:', error.message);
      throw error;
    }
  }

  /**
   * 根据配置ID获取Access Token
   * @param secretType - corp: 应用Secret, contact: 通讯录同步Secret, external: 客户联系Secret, chat: 会话存档Secret
   */
  static async getAccessTokenByConfigId(configId: number, secretType: 'corp' | 'contact' | 'external' | 'chat' = 'corp'): Promise<string> {
    console.log(`[WecomApi] getAccessTokenByConfigId called, configId: ${configId}, secretType: ${secretType}`);

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });

    if (!config) {
      console.error('[WecomApi] Config not found or disabled');
      throw new Error('企微配置不存在或已禁用');
    }

    console.log(`[WecomApi] Found config: ${config.name}, corpId: ${config.corpId}`);
    console.log(`[WecomApi] Has contactSecret: ${!!config.contactSecret}, Has externalContactSecret: ${!!(config as any).externalContactSecret}, Has corpSecret: ${!!config.corpSecret}`);

    let secret = config.corpSecret;
    let secretName = 'corp';

    if (secretType === 'contact') {
      // 通讯录同步 Secret，用于获取部门和成员列表
      secret = config.contactSecret || config.corpSecret;
      secretName = config.contactSecret ? 'contact' : 'corp';
    } else if (secretType === 'external') {
      // 客户联系 Secret，用于获取外部联系人
      // 优先使用 externalContactSecret，如果没有则尝试 contactSecret，最后使用 corpSecret
      secret = (config as any).externalContactSecret || config.contactSecret || config.corpSecret;
      secretName = (config as any).externalContactSecret ? 'externalContact' : (config.contactSecret ? 'contact' : 'corp');
    } else if (secretType === 'chat' && config.chatArchiveSecret) {
      secret = config.chatArchiveSecret;
      secretName = 'chat';
    }

    console.log(`[WecomApi] Using ${secretName} secret for ${secretType} API`);

    if (!secret) {
      console.error('[WecomApi] No secret available');
      throw new Error('企微配置缺少必要的Secret');
    }

    return this.getAccessToken(config.corpId, secret);
  }

  /**
   * 测试企微配置连接
   */
  static async testConnection(corpId: string, corpSecret: string): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken(corpId, corpSecret);
      if (token) {
        return { success: true, message: '连接成功' };
      }
      return { success: false, message: '获取Token失败' };
    } catch (error: any) {
      console.error('[WecomApi] testConnection error:', error.message);
      return { success: false, message: error.message || '连接失败' };
    }
  }

  /**
   * 获取企业通讯录部门列表
   */
  static async getDepartmentList(accessToken: string, departmentId?: number): Promise<any[]> {
    try {
      const params: any = { access_token: accessToken };
      if (departmentId !== undefined) {
        params.id = departmentId;
      }

      const response = await axios.get(`${WECOM_API_BASE}/department/list`, { params });

      if (response.data.errcode === 0) {
        return response.data.department || [];
      } else {
        throw new Error(`获取部门列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getDepartmentList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取部门成员列表
   */
  static async getDepartmentUsers(accessToken: string, departmentId: number, fetchChild: boolean = false): Promise<any[]> {
    try {
      console.log(`[WecomApi] getDepartmentUsers: departmentId=${departmentId}, fetchChild=${fetchChild}`);
      console.log(`[WecomApi] Using access_token: ${accessToken.substring(0, 20)}...`);

      const response = await axios.get(`${WECOM_API_BASE}/user/list`, {
        params: {
          access_token: accessToken,
          department_id: departmentId,
          fetch_child: fetchChild ? 1 : 0
        }
      });

      console.log('[WecomApi] getDepartmentUsers full response:', JSON.stringify(response.data));

      if (response.data.errcode === 0) {
        const users = response.data.userlist || [];
        console.log(`[WecomApi] Got ${users.length} users`);
        return users;
      } else {
        // 常见错误码说明
        const errorHints: Record<number, string> = {
          60020: '访问IP不在白名单，请在企微后台添加服务器IP到可信IP',
          60011: '无权限访问，请检查通讯录Secret权限配置',
          40014: 'access_token无效或过期',
          40001: 'secret无效',
          41001: '缺少access_token参数',
          60028: '不允许修改第三方应用的成员'
        };
        const hint = errorHints[response.data.errcode] || '';
        throw new Error(`获取成员列表失败: ${response.data.errmsg} (errcode: ${response.data.errcode})${hint ? ' - ' + hint : ''}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getDepartmentUsers error:', error.message);
      throw error;
    }
  }

  /**
   * 获取外部联系人列表
   */
  static async getExternalContactList(accessToken: string, userId: string): Promise<string[]> {
    try {
      const response = await axios.get(`${WECOM_API_BASE}/externalcontact/list`, {
        params: { access_token: accessToken, userid: userId }
      });

      if (response.data.errcode === 0) {
        return response.data.external_userid || [];
      } else {
        throw new Error(`获取外部联系人列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getExternalContactList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取外部联系人详情
   */
  static async getExternalContactDetail(accessToken: string, externalUserId: string): Promise<any> {
    try {
      const response = await axios.get(`${WECOM_API_BASE}/externalcontact/get`, {
        params: { access_token: accessToken, external_userid: externalUserId }
      });

      if (response.data.errcode === 0) {
        return response.data;
      } else {
        throw new Error(`获取外部联系人详情失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getExternalContactDetail error:', error.message);
      throw error;
    }
  }

  /**
   * 获取客户标签列表
   */
  static async getCorpTagList(accessToken: string, tagIds?: string[]): Promise<any[]> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/get_corp_tag_list?access_token=${accessToken}`, {
        tag_id: tagIds || []
      });

      if (response.data.errcode === 0) {
        return response.data.tag_group || [];
      } else {
        throw new Error(`获取标签列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getCorpTagList error:', error.message);
      throw error;
    }
  }

  /**
   * 创建获客链接
   */
  static async createAcquisitionLink(accessToken: string, linkName: string, userIds: string[], config?: any): Promise<any> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/customer_acquisition/create_link?access_token=${accessToken}`, {
        link_name: linkName,
        range: {
          user_list: userIds,
          department_list: config?.departmentIds || []
        },
        skip_verify: config?.skipVerify || false
      });

      if (response.data.errcode === 0) {
        return response.data.link;
      } else {
        throw new Error(`创建获客链接失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] createAcquisitionLink error:', error.message);
      throw error;
    }
  }

  /**
   * 获取获客链接列表
   */
  static async getAcquisitionLinkList(accessToken: string, cursor?: string, limit: number = 100): Promise<any> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/customer_acquisition/list_link?access_token=${accessToken}`, {
        limit,
        cursor: cursor || ''
      });

      if (response.data.errcode === 0) {
        return {
          linkList: response.data.link_id_list || [],
          nextCursor: response.data.next_cursor
        };
      } else {
        throw new Error(`获取获客链接列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getAcquisitionLinkList error:', error.message);
      throw error;
    }
  }

  /**
   * 创建微信客服账号
   */
  static async createKfAccount(accessToken: string, name: string, mediaId?: string): Promise<string> {
    try {
      const data: any = { name };
      if (mediaId) {
        data.media_id = mediaId;
      }

      const response = await axios.post(`${WECOM_API_BASE}/kf/account/add?access_token=${accessToken}`, data);

      if (response.data.errcode === 0) {
        return response.data.open_kfid;
      } else {
        throw new Error(`创建客服账号失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] createKfAccount error:', error.message);
      throw error;
    }
  }

  /**
   * 获取客服账号列表
   */
  static async getKfAccountList(accessToken: string, offset: number = 0, limit: number = 100): Promise<any[]> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/kf/account/list?access_token=${accessToken}`, {
        offset,
        limit
      });

      if (response.data.errcode === 0) {
        return response.data.account_list || [];
      } else {
        throw new Error(`获取客服账号列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getKfAccountList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取对外收款记录
   */
  static async getPaymentList(accessToken: string, beginTime: number, endTime: number, cursor?: string): Promise<any> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalpay/get_bill_list?access_token=${accessToken}`, {
        begin_time: beginTime,
        end_time: endTime,
        cursor: cursor || ''
      });

      if (response.data.errcode === 0) {
        return {
          billList: response.data.bill_list || [],
          nextCursor: response.data.next_cursor
        };
      } else {
        throw new Error(`获取收款记录失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getPaymentList error:', error.message);
      throw error;
    }
  }
}

export default WecomApiService;
