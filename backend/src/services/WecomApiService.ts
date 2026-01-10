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
      return cached.token;
    }

    try {
      const response = await axios.get(`${WECOM_API_BASE}/gettoken`, {
        params: { corpid: corpId, corpsecret: secret }
      });

      if (response.data.errcode === 0) {
        const token = response.data.access_token;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
        tokenCache.set(cacheKey, { token, expireTime });
        return token;
      } else {
        throw new Error(`获取AccessToken失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      console.error('[WecomApi] getAccessToken error:', error.message);
      throw error;
    }
  }

  /**
   * 根据配置ID获取Access Token
   */
  static async getAccessTokenByConfigId(configId: number, secretType: 'corp' | 'contact' | 'chat' = 'corp'): Promise<string> {
    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });

    if (!config) {
      throw new Error('企微配置不存在或已禁用');
    }

    let secret = config.corpSecret;
    if (secretType === 'contact' && config.contactSecret) {
      secret = config.contactSecret;
    } else if (secretType === 'chat' && config.chatArchiveSecret) {
      secret = config.chatArchiveSecret;
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
      const response = await axios.get(`${WECOM_API_BASE}/user/list`, {
        params: {
          access_token: accessToken,
          department_id: departmentId,
          fetch_child: fetchChild ? 1 : 0
        }
      });

      if (response.data.errcode === 0) {
        return response.data.userlist || [];
      } else {
        throw new Error(`获取成员列表失败: ${response.data.errmsg}`);
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
