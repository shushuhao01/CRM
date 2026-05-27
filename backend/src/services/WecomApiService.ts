/**
 * 企业微信API服务
 * 封装企业微信各类API调用
 */
import axios from 'axios';
import * as crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { WecomConfig } from '../entities/WecomConfig';

import { log } from '../config/logger';
const WECOM_API_BASE = 'https://qyapi.weixin.qq.com/cgi-bin';

// Access Token 缓存
const tokenCache: Map<string, { token: string; expireTime: number }> = new Map();

// JS-SDK Ticket 缓存
const ticketCache: Map<string, { ticket: string; expireTime: number }> = new Map();

export class WecomApiService {
  /**
   * 获取企业微信Access Token
   */
  static async getAccessToken(corpId: string, secret: string): Promise<string> {
    const secretHash = crypto.createHash('md5').update(secret).digest('hex').substring(0, 12);
    const cacheKey = `${corpId}:${secretHash}`;
    const cached = tokenCache.get(cacheKey);

    if (cached && cached.expireTime > Date.now()) {
      log.info('[WecomApi] Using cached token');
      return cached.token;
    }

    try {
      log.info(`[WecomApi] Fetching new token for corpId: ${corpId}`);
      const response = await axios.get(`${WECOM_API_BASE}/gettoken`, {
        params: { corpid: corpId, corpsecret: secret }
      });

      log.info('[WecomApi] Token response errcode:', response.data.errcode);

      if (response.data.errcode === 0) {
        const token = response.data.access_token;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000; // 提前5分钟过期
        tokenCache.set(cacheKey, { token, expireTime });
        log.info('[WecomApi] Token cached successfully');
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
      log.error('[WecomApi] getAccessToken error:', error.message);
      throw error;
    }
  }

  /**
   * 根据配置ID获取Access Token
   * 代理到 WecomTokenService，支持自建应用 + 第三方应用双模式，统一缓存管理
   * @param secretType - corp: 应用Secret, contact: 通讯录同步Secret, external: 客户联系Secret, chat: 会话存档Secret, payment: 对外收款Secret
   */
  static async getAccessTokenByConfigId(configId: number, secretType: 'corp' | 'contact' | 'external' | 'chat' | 'payment' = 'corp'): Promise<string> {
    log.info(`[WecomApi] getAccessTokenByConfigId → delegating to WecomTokenService, configId: ${configId}, secretType: ${secretType}`);
    const { WecomTokenService } = await import('./wecom/WecomTokenService');
    return WecomTokenService.getAccessTokenByConfigId(configId, secretType);
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
      log.error('[WecomApi] testConnection error:', error.message);
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
        const depts = response.data.department || [];
        if (depts.length > 0) return depts;
        // 企微已废弃第三方应用的 /department/list，降级到 /department/simplelist
        log.info('[WecomApi] department/list 返回空数组，尝试 department/simplelist ...');
      } else if (response.data.errcode === 60011 || response.data.errcode === 60123) {
        log.warn(`[WecomApi] department/list 权限不足(${response.data.errcode})，尝试 simplelist ...`);
      } else {
        throw new Error(`获取部门列表失败: ${response.data.errmsg} (${response.data.errcode})`);
      }

      // 降级：使用 /department/simplelist（2022年后第三方应用推荐接口）
      const simpleParams: any = { access_token: accessToken };
      if (departmentId !== undefined) simpleParams.id = departmentId;
      const simpleRes = await axios.get(`${WECOM_API_BASE}/department/simplelist`, { params: simpleParams });
      if (simpleRes.data.errcode === 0) {
        const simpleDepts = simpleRes.data.department_id || [];
        log.info(`[WecomApi] department/simplelist 返回 ${simpleDepts.length} 个部门`);
        // simplelist 只返回 {id, parentid, order}，需要用 /department/get 补充名称
        const fullDepts: any[] = [];
        for (const sd of simpleDepts) {
          const detail = await this.getDepartmentDetail(accessToken, sd.id);
          fullDepts.push(detail || { id: sd.id, name: `部门${sd.id}`, parentid: sd.parentid, order: sd.order });
        }
        return fullDepts;
      }
      log.warn('[WecomApi] department/simplelist 也失败:', simpleRes.data.errmsg);
      return [];
    } catch (error: any) {
      log.error('[WecomApi] getDepartmentList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个部门详情（用于补充 /department/list 未返回的名称）
   * 在「组织架构信息」权限下应返回 name 字段
   */
  static async getDepartmentDetail(accessToken: string, deptId: number): Promise<any | null> {
    try {
      const response = await axios.get(`${WECOM_API_BASE}/department/get`, {
        params: { access_token: accessToken, id: deptId }
      });
      if (response.data.errcode === 0) {
        return response.data.department || null;
      }
      log.warn(`[WecomApi] getDepartmentDetail(${deptId}) errcode=${response.data.errcode} errmsg=${response.data.errmsg}`);
      return null;
    } catch (error: any) {
      log.warn('[WecomApi] getDepartmentDetail error:', error.message);
      return null;
    }
  }

  /**
   * 获取部门成员列表
   */
  static async getDepartmentUsers(accessToken: string, departmentId: number, fetchChild: boolean = false): Promise<any[]> {
    try {
      log.info(`[WecomApi] getDepartmentUsers: departmentId=${departmentId}, fetchChild=${fetchChild}`);
      log.info(`[WecomApi] Using access_token: ${accessToken.substring(0, 20)}...`);

      const response = await axios.get(`${WECOM_API_BASE}/user/list`, {
        params: {
          access_token: accessToken,
          department_id: departmentId,
          fetch_child: fetchChild ? 1 : 0
        }
      });

      log.info('[WecomApi] getDepartmentUsers response errcode:', response.data.errcode, 'count:', (response.data.userlist || []).length);

      if (response.data.errcode === 0) {
        const users = response.data.userlist || [];
        log.info(`[WecomApi] Got ${users.length} users`);
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
      log.error('[WecomApi] getDepartmentUsers error:', error.message);
      throw error;
    }
  }

  /**
   * 获取单个成员详情（用于补充 /user/list 未返回的姓名等字段）
   * 第三方应用 userid 是 open_userid，需通过 /user/get 单独换取详情
   * 当成员不在应用可见范围或权限不足时返回 null（而不是抛错），方便批量调用时容错
   */
  static async getUserDetail(accessToken: string, userid: string): Promise<any | null> {
    try {
      const response = await axios.get(`${WECOM_API_BASE}/user/get`, {
        params: { access_token: accessToken, userid }
      });
      if (response.data.errcode === 0) {
        if (!response.data.avatar && response.data.thumb_avatar) {
          response.data.avatar = response.data.thumb_avatar;
        }
        log.info(`[WecomApi] getUserDetail(${userid.substring(0, 12)}...): name=${response.data.name || '(empty)'}, avatar=${response.data.avatar ? 'YES' : 'NO'}, thumb=${response.data.thumb_avatar ? 'YES' : 'NO'}`);
        return response.data;
      }
      // 60111=userid不存在 / 60020=IP白名单 / 60011=权限不足 — 不抛错，返回 null
      log.warn(`[WecomApi] getUserDetail(${userid.substring(0, 12)}...) errcode=${response.data.errcode} errmsg=${response.data.errmsg}`);
      return null;
    } catch (error: any) {
      log.warn('[WecomApi] getUserDetail error:', error.message);
      return null;
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
      log.error('[WecomApi] getExternalContactList error:', error.message);
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
        const ext = response.data.external_contact;
        if (ext) {
          log.info(`[WecomApi] getExternalContactDetail(${externalUserId.substring(0, 16)}...): name=${ext.name || '(empty)'}, avatar=${ext.avatar ? 'YES(' + ext.avatar.substring(0, 40) + '...)' : 'NO'}`);
        }
        return response.data;
      } else {
        throw new Error(`获取外部联系人详情失败: ${response.data.errmsg} (${response.data.errcode})`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getExternalContactDetail error:', error.message);
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
      log.error('[WecomApi] getCorpTagList error:', error.message);
      throw error;
    }
  }

  /**
   * 添加客户标签（组+标签）
   * 参考: https://developer.work.weixin.qq.com/document/path/92117
   */
  static async addCorpTag(accessToken: string, groupName: string, tags: Array<{ name: string; order?: number }>, groupId?: string): Promise<any> {
    try {
      const body: any = { tag: tags.map(t => ({ name: t.name, order: t.order || 0 })) };
      if (groupId) {
        body.group_id = groupId;
      } else {
        body.group_name = groupName;
      }
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/add_corp_tag?access_token=${accessToken}`, body);
      if (response.data.errcode === 0) {
        return response.data.tag_group || {};
      } else {
        throw new Error(`添加标签失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] addCorpTag error:', error.message);
      throw error;
    }
  }

  /**
   * 编辑客户标签/标签组
   * 参考: https://developer.work.weixin.qq.com/document/path/92118
   */
  static async editCorpTag(accessToken: string, id: string, name: string, order?: number): Promise<void> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/edit_corp_tag?access_token=${accessToken}`, {
        id, name, order: order || 0
      });
      if (response.data.errcode !== 0) {
        throw new Error(`编辑标签失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] editCorpTag error:', error.message);
      throw error;
    }
  }

  /**
   * 删除客户标签/标签组
   * 参考: https://developer.work.weixin.qq.com/document/path/92119
   */
  static async deleteCorpTag(accessToken: string, tagIds?: string[], groupIds?: string[]): Promise<void> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/del_corp_tag?access_token=${accessToken}`, {
        tag_id: tagIds || [],
        group_id: groupIds || []
      });
      if (response.data.errcode !== 0) {
        throw new Error(`删除标签失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] deleteCorpTag error:', error.message);
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
      log.error('[WecomApi] createAcquisitionLink error:', error.message);
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
      log.error('[WecomApi] getAcquisitionLinkList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取获客链接使用量（企微官方接口）
   * 返回: { total: 已使用量, balance: 剩余量, quota_list: 配额明细 }
   */
  static async getAcquisitionQuota(accessToken: string): Promise<{ total: number; balance: number; quotaList: any[] }> {
    try {
      const response = await axios.get(`${WECOM_API_BASE}/externalcontact/customer_acquisition/quota?access_token=${accessToken}`);
      if (response.data.errcode === 0) {
        return {
          total: response.data.total || 0,
          balance: response.data.balance || 0,
          quotaList: response.data.quota_list || []
        };
      } else {
        log.warn('[WecomApi] getAcquisitionQuota non-zero errcode:', response.data.errmsg);
        return { total: 0, balance: 0, quotaList: [] };
      }
    } catch (error: any) {
      log.error('[WecomApi] getAcquisitionQuota error:', error.message);
      return { total: 0, balance: 0, quotaList: [] };
    }
  }

  /**
   * 获取获客链接详情（企微官方接口，含统计数据）
   */
  static async getAcquisitionLinkDetail(accessToken: string, linkId: string): Promise<any> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/customer_acquisition/get?access_token=${accessToken}`, {
        link_id: linkId
      });
      if (response.data.errcode === 0) {
        return response.data.link || response.data;
      }
      return null;
    } catch (error: any) {
      log.error('[WecomApi] getAcquisitionLinkDetail error:', error.message);
      return null;
    }
  }

  /**
   * 创建「联系我」活码
   */
  static async addContactWay(accessToken: string, params: {
    type: number; scene: number; style?: number; remark?: string; skipVerify?: boolean;
    state?: string; userIds?: string[]; partyIds?: number[];
  }): Promise<{ config_id: string; qr_code: string }> {
    try {
      const body: any = {
        type: params.type || 1,
        scene: params.scene || 2,
        style: params.style || 0,
        skip_verify: params.skipVerify ?? true,
        state: params.state || '',
        remark: params.remark || '',
      };
      if (params.userIds?.length) body.user = params.userIds;
      if (params.partyIds?.length) body.party = params.partyIds;
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/add_contact_way?access_token=${accessToken}`, body);
      if (response.data.errcode === 0) {
        return { config_id: response.data.config_id, qr_code: response.data.qr_code };
      }
      throw new Error(`创建活码失败: ${response.data.errmsg} (${response.data.errcode})`);
    } catch (error: any) {
      log.error('[WecomApi] addContactWay error:', error.message);
      throw error;
    }
  }

  /**
   * 更新「联系我」活码
   */
  static async updateContactWay(accessToken: string, configId: string, params: {
    remark?: string; skipVerify?: boolean; style?: number; state?: string;
    userIds?: string[]; partyIds?: number[];
  }): Promise<void> {
    try {
      const body: any = { config_id: configId };
      if (params.remark !== undefined) body.remark = params.remark;
      if (params.skipVerify !== undefined) body.skip_verify = params.skipVerify;
      if (params.style !== undefined) body.style = params.style;
      if (params.state !== undefined) body.state = params.state;
      if (params.userIds?.length) body.user = params.userIds;
      if (params.partyIds?.length) body.party = params.partyIds;
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/update_contact_way?access_token=${accessToken}`, body);
      if (response.data.errcode !== 0) {
        throw new Error(`更新活码失败: ${response.data.errmsg} (${response.data.errcode})`);
      }
    } catch (error: any) {
      log.error('[WecomApi] updateContactWay error:', error.message);
      throw error;
    }
  }

  /**
   * 删除「联系我」活码
   */
  static async delContactWay(accessToken: string, configId: string): Promise<void> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/del_contact_way?access_token=${accessToken}`, {
        config_id: configId
      });
      if (response.data.errcode !== 0) {
        log.warn('[WecomApi] delContactWay non-zero:', response.data.errmsg);
      }
    } catch (error: any) {
      log.error('[WecomApi] delContactWay error:', error.message);
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
      log.error('[WecomApi] createKfAccount error:', error.message);
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
      log.error('[WecomApi] getKfAccountList error:', error.message);
      throw error;
    }
  }

  /**
   * 同步客服消息（拉取客服消息）
   * 参考: https://developer.work.weixin.qq.com/document/path/94670
   * @param accessToken 企微AccessToken
   * @param cursor 上次拉取的游标，首次传空
   * @param token 回调事件中的token（可选）
   * @param limit 每次拉取条数，默认1000
   */
  static async syncKfMessages(accessToken: string, cursor?: string, token?: string, limit: number = 1000): Promise<{
    msgList: any[];
    hasMore: boolean;
    nextCursor: string;
  }> {
    try {
      const body: any = { limit };
      if (cursor) body.cursor = cursor;
      if (token) body.token = token;

      const response = await axios.post(`${WECOM_API_BASE}/kf/sync_msg?access_token=${accessToken}`, body);

      if (response.data.errcode === 0) {
        return {
          msgList: response.data.msg_list || [],
          hasMore: response.data.has_more === 1,
          nextCursor: response.data.next_cursor || ''
        };
      } else {
        throw new Error(`同步客服消息失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] syncKfMessages error:', error.message);
      throw error;
    }
  }

  /**
   * 获取对外收款记录
   */
  static async getPaymentList(accessToken: string, beginTime: number, endTime: number, cursor?: string, limit: number = 100): Promise<any> {
    try {
      const body: any = {
        begin_time: beginTime,
        end_time: endTime,
        limit: Math.min(limit, 1000)
      };
      if (cursor) body.cursor = cursor;

      log.info(`[WecomApi] getPaymentList: begin_time=${beginTime}, end_time=${endTime}, limit=${body.limit}, cursor=${cursor || '(首次)'}`);

      const response = await axios.post(`${WECOM_API_BASE}/externalpay/get_bill_list?access_token=${accessToken}`, body);

      if (response.data.errcode === 0) {
        return {
          billList: response.data.bill_list || [],
          nextCursor: response.data.next_cursor
        };
      } else {
        throw new Error(`获取收款记录失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getPaymentList error:', error.message);
      throw error;
    }
  }

  // ==================== 会话存档相关 API ====================

  /**
   * 获取会话存档开通成员列表
   * 参考: https://developer.work.weixin.qq.com/document/path/91614
   */
  static async getPermitUserList(accessToken: string, type?: number): Promise<string[]> {
    try {
      const body: any = {};
      if (type !== undefined) body.type = type;

      const response = await axios.post(
        `${WECOM_API_BASE}/msgaudit/get_permit_user_list?access_token=${accessToken}`,
        body
      );

      if (response.data.errcode === 0) {
        return response.data.ids || [];
      } else {
        throw new Error(`获取会话存档开通成员列表失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getPermitUserList error:', error.message);
      throw error;
    }
  }

  /**
   * 【数据与智能专区】设置公钥（第三方应用必须调用此接口后消息才开始存档）
   * 参考: https://developer.work.weixin.qq.com/document/path/101349
   */
  static async setChatDataPublicKey(accessToken: string, publicKey: string, publicKeyVer: number = 1): Promise<void> {
    try {
      log.info(`[WecomApi] setChatDataPublicKey: 设置公钥, ver=${publicKeyVer}, keyLen=${publicKey.length}`);
      const response = await axios.post(
        `${WECOM_API_BASE}/chatdata/set_public_key?access_token=${accessToken}`,
        { public_key: publicKey, public_key_ver: publicKeyVer }
      );
      if (response.data.errcode === 0) {
        log.info('[WecomApi] setChatDataPublicKey: 公钥设置成功');
      } else {
        throw new Error(`设置公钥失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] setChatDataPublicKey error:', error.message);
      throw error;
    }
  }

  /**
   * 【数据与智能专区】获取授权存档的成员列表
   * 第三方服务商应用使用此接口替代 getPermitUserList
   * 参考: https://developer.work.weixin.qq.com/document/path/99846
   */
  static async getChatDataAuthUserList(accessToken: string): Promise<Array<{ userid: string; editionList: number[] }>> {
    const allUsers: Array<{ userid: string; editionList: number[] }> = [];
    let cursor = '';
    let hasMore = true;

    try {
      while (hasMore) {
        const body: any = { limit: 1000 };
        if (cursor) body.cursor = cursor;

        log.info(`[WecomApi] getChatDataAuthUserList: 拉取授权成员, cursor=${cursor || '(首次)'}`);

        const response = await axios.post(
          `${WECOM_API_BASE}/chatdata/get_auth_user_list?access_token=${accessToken}`,
          body
        );

        if (response.data.errcode === 0) {
          const userList = response.data.auth_user_list || [];
          for (const user of userList) {
            allUsers.push({
              userid: user.userid,
              editionList: user.edition_list || []
            });
          }
          cursor = response.data.next_cursor || '';
          hasMore = response.data.has_more === 1 || response.data.has_more === true;
          log.info(`[WecomApi] getChatDataAuthUserList: 本次获取 ${userList.length} 个成员, hasMore=${hasMore}`);
        } else {
          throw new Error(`获取专区授权成员列表失败(${response.data.errcode}): ${response.data.errmsg}`);
        }
      }

      log.info(`[WecomApi] getChatDataAuthUserList: 共获取 ${allUsers.length} 个授权成员`);
      return allUsers;
    } catch (error: any) {
      log.error('[WecomApi] getChatDataAuthUserList error:', error.message);
      throw error;
    }
  }

  /**
   * 获取会话同意情况（单聊）
   * 参考: https://developer.work.weixin.qq.com/document/path/91782
   */
  static async checkSingleAgree(accessToken: string, info: Array<{ userid: string; exteranalopenid: string }>): Promise<any[]> {
    try {
      const response = await axios.post(
        `${WECOM_API_BASE}/msgaudit/check_single_agree?access_token=${accessToken}`,
        { info }
      );

      if (response.data.errcode === 0) {
        return response.data.agreeinfo || [];
      } else {
        throw new Error(`检查单聊同意情况失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] checkSingleAgree error:', error.message);
      throw error;
    }
  }

  /**
   * 获取会话同意情况（群聊内部成员）
   * 参考: https://developer.work.weixin.qq.com/document/path/91782
   */
  static async checkRoomAgree(accessToken: string, roomId: string): Promise<any[]> {
    try {
      const response = await axios.post(
        `${WECOM_API_BASE}/msgaudit/check_room_agree?access_token=${accessToken}`,
        { roomid: roomId }
      );

      if (response.data.errcode === 0) {
        return response.data.agreeinfo || [];
      } else {
        throw new Error(`检查群聊同意情况失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] checkRoomAgree error:', error.message);
      throw error;
    }
  }

  /**
   * 获取会话存档群聊信息
   * 参考: https://developer.work.weixin.qq.com/document/path/91774
   */
  static async getMsgAuditGroupChat(accessToken: string, roomId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${WECOM_API_BASE}/msgaudit/groupchat/get?access_token=${accessToken}`,
        { roomid: roomId }
      );

      if (response.data.errcode === 0) {
        return response.data;
      } else {
        throw new Error(`获取群聊信息失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getMsgAuditGroupChat error:', error.message);
      throw error;
    }
  }

  /**
   * 【数据与智能专区】拉取会话存档消息数据
   * 第三方服务商通过此接口获取加密的聊天记录
   * 参考: https://developer.work.weixin.qq.com/document/path/99848
   *
   * @param accessToken chat类型的access_token
   * @param cursor 上次拉取的游标位置，首次传空字符串
   * @param limit 每次拉取条数，最大1000
   * @returns 加密的消息列表和下次拉取的游标
   */
  /**
   * 数据与智能专区 sync_msg 接口
   * 文档: https://developer.work.weixin.qq.com/document/path/101365
   * 返回 msg_list 包含 msgid、sender、receiver_list、send_time、msgtype、service_encrypt_info
   */
  static async getChatMsgData(accessToken: string, cursor: string = '', limit: number = 200): Promise<{
    chatdata: Array<{
      seq: number;
      msgid: string;
      publickey_ver: number;
      encrypt_random_key: string;
      encrypt_chat_msg: string;
      sender_type: number;
      sender_id: string;
      receiver_list: Array<{ type: number; id: string }>;
      send_time: number;
      msgtype: number;
      chatid?: string;
    }>;
    has_more: boolean;
    next_cursor: string;
  }> {
    try {
      const body: any = { limit };
      if (cursor) body.cursor = cursor;

      log.info(`[WecomApi] getChatMsgData: cursor=${cursor || '(首次)'}, limit=${limit}, tokenLen=${accessToken?.length}`);

      const response = await axios.post(
        `${WECOM_API_BASE}/chatdata/sync_msg?access_token=${accessToken}`,
        body
      );

      // ★ 调试日志：记录完整的API响应（临时，定位问题后移除）
      log.info(`[WecomApi] getChatMsgData 原始响应: errcode=${response.data.errcode}, errmsg=${response.data.errmsg}, msg_list_len=${response.data.msg_list?.length ?? 'null'}, has_more=${response.data.has_more}, next_cursor=${response.data.next_cursor || 'empty'}`);
      if (response.data.msg_list?.length > 0) {
        const sample = response.data.msg_list[0];
        log.info(`[WecomApi] getChatMsgData 首条消息样本: msgid=${sample.msgid}, sender=${JSON.stringify(sample.sender)}, send_time=${sample.send_time}, msgtype=${sample.msgtype}`);
      }

      if (response.data.errcode === 0) {
        const msgList = response.data.msg_list || [];
        const hasMore = response.data.has_more === 1 || response.data.has_more === true;
        const nextCursor = response.data.next_cursor || '';

        const chatdata = msgList.map((msg: any, idx: number) => ({
          seq: idx,
          msgid: msg.msgid || '',
          publickey_ver: msg.service_encrypt_info?.public_key_ver || 1,
          encrypt_random_key: msg.service_encrypt_info?.encrypted_secret_key || '',
          encrypt_chat_msg: '',
          sender: msg.sender || { type: 0, id: '' },
          sender_type: msg.sender?.type || 0,
          sender_id: msg.sender?.id || '',
          receiver_list: msg.receiver_list || [],
          send_time: msg.send_time || 0,
          msgtype: msg.msgtype || 0,
          chatid: msg.chatid || '',
        }));

        log.info(`[WecomApi] getChatMsgData: 获取 ${chatdata.length} 条消息, hasMore=${hasMore}`);
        return { chatdata, has_more: hasMore, next_cursor: nextCursor };
      } else {
        throw new Error(`拉取会话存档消息失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getChatMsgData error:', error.message);
      throw error;
    }
  }

  /**
   * 【数据与智能专区】获取消息体
   * 文档: https://developer.work.weixin.qq.com/document/path/101366
   * sync_msg 只返回元数据，实际消息体需通过此接口逐条获取
   *
   * @param accessToken chat类型的access_token
   * @param msgid 消息ID
   * @returns 加密的消息体和公钥版本
   */
  static async getMsgBody(accessToken: string, msgid: string): Promise<{
    encrypted_msg_body: string;
    public_key_ver: number;
  }> {
    try {
      const response = await axios.post(
        `${WECOM_API_BASE}/chatdata/get_msg_body?access_token=${accessToken}`,
        { msgid }
      );

      if (response.data.errcode === 0) {
        return {
          encrypted_msg_body: response.data.encrypted_msg_body || '',
          public_key_ver: response.data.public_key_ver || 1
        };
      } else {
        throw new Error(`获取消息体失败(${response.data.errcode}): ${response.data.errmsg}`);
      }
    } catch (error: any) {
      // 非致命错误：某些消息类型可能不支持获取消息体
      if (error.message?.includes('获取消息体失败')) {
        log.debug(`[WecomApi] getMsgBody ${msgid}: ${error.message}`);
      } else {
        log.warn(`[WecomApi] getMsgBody ${msgid} error: ${error.message}`);
      }
      throw error;
    }
  }

  // ==================== 专区程序代理调用 ====================

  /**
   * 【数据与智能专区】同步调用专区程序
   * 文档: https://developer.work.weixin.qq.com/document/path/101356
   * 外部应用通过此接口调用运行在安全沙箱中的专区程序
   */
  static async syncCallProgram(
    accessToken: string,
    programId: string,
    abilityId: string,
    func: string,
    funcReq: Record<string, any>
  ): Promise<any> {
    const requestData = JSON.stringify({
      input: { func, func_req: funcReq }
    });

    log.info(`[WecomApi] syncCallProgram: func=${func}, programId=${programId}, abilityId=${abilityId}, requestData_len=${requestData.length}`);

    try {
      const response = await axios.post(
        `${WECOM_API_BASE}/chatdata/sync_call_program?access_token=${accessToken}`,
        {
          program_id: programId,
          ability_id: abilityId,
          request_data: requestData
        }
      );

      const respData = response.data;
      log.info(`[WecomApi] syncCallProgram(${func}) 原始响应: errcode=${respData.errcode}, errmsg=${respData.errmsg}, response_data_len=${respData.response_data?.length || 0}, response_data_first200=${String(respData.response_data || '').substring(0, 200)}`);

      if (respData.errcode === 0) {
        const responseData = respData.response_data;
        if (responseData) {
          try {
            const parsed = JSON.parse(responseData);
            log.info(`[WecomApi] syncCallProgram(${func}) 解析成功: keys=${Object.keys(parsed).join(',')}, type=${typeof parsed}`);
            return parsed;
          } catch (parseErr: any) {
            log.warn(`[WecomApi] syncCallProgram(${func}) response_data JSON解析失败: ${parseErr.message}, 前100字符: ${String(responseData).substring(0, 100)}`);
            return responseData;
          }
        }
        log.warn(`[WecomApi] syncCallProgram(${func}) response_data为空`);
        return {};
      } else {
        log.error(`[WecomApi] syncCallProgram(${func}) 平台返回错误: errcode=${respData.errcode}, errmsg=${respData.errmsg}, full_response=${JSON.stringify(respData).substring(0, 500)}`);
        throw new Error(`专区程序调用失败(${respData.errcode}): ${respData.errmsg}`);
      }
    } catch (error: any) {
      log.error(`[WecomApi] syncCallProgram(${func}) error:`, error.message);
      throw error;
    }
  }

  /**
   * 通过专区程序代理调用 sync_msg（第三方应用必须使用此路径）
   * 专区程序内部通过 specsdkinvoke.invoke("sync_msg") 执行实际的消息拉取
   */
  static async getChatMsgDataViaZone(
    accessToken: string,
    programId: string,
    abilityId: string,
    cursor: string = '',
    limit: number = 200
  ): Promise<{
    chatdata: Array<any>;
    has_more: boolean;
    next_cursor: string;
  }> {
    log.info(`[WecomApi] getChatMsgDataViaZone: cursor=${cursor || '(首次)'}, limit=${limit}, abilityId=${abilityId}`);

    // 构建请求参数：空字符串字段不传（企微SDK要求cursor若提供则不能为空）
    const syncReq: Record<string, any> = { limit };
    if (cursor) syncReq.cursor = cursor;

    let rawResult = await this.syncCallProgram(accessToken, programId, abilityId, 'sync_msg', syncReq);

    // 如果首次拉取返回空，尝试带 begin_time 从最近24小时重拉
    const firstResult = rawResult;
    const firstMsgList = rawResult?.msg_list || rawResult?.output?.msg_list;
    if ((!firstMsgList || firstMsgList.length === 0) && !cursor) {
      const beginTime = Math.floor(Date.now() / 1000) - 86400; // 24小时前
      log.info(`[WecomApi] getChatMsgDataViaZone: 首次拉取0条，尝试带begin_time=${beginTime}重拉`);
      try {
        rawResult = await this.syncCallProgram(accessToken, programId, abilityId, 'sync_msg', {
          limit,
          begin_time: beginTime
        });
      } catch (retryErr: any) {
        log.warn(`[WecomApi] getChatMsgDataViaZone: begin_time重拉失败: ${retryErr.message}`);
        rawResult = firstResult;
      }
    }

    // ★ 兼容多种响应格式：
    // 1. 直接格式: {errcode, msg_list, has_more, next_cursor}
    // 2. output包装: {output: {errcode, msg_list, has_more, next_cursor}}
    // 3. Python demo包装: {output: "{JSON string}"}
    let result = rawResult;
    if (rawResult.output !== undefined) {
      if (typeof rawResult.output === 'string') {
        try {
          result = JSON.parse(rawResult.output);
        } catch {
          result = rawResult;
        }
      } else if (typeof rawResult.output === 'object') {
        result = rawResult.output;
      }
    }

    log.info(`[WecomApi] getChatMsgDataViaZone 解析后: errcode=${result.errcode}, msg_list_len=${result.msg_list?.length ?? 'null'}, has_more=${result.has_more}, keys=${Object.keys(result).join(',')}`);

    if (result.errcode && result.errcode !== 0) {
      throw new Error(`专区sync_msg失败(${result.errcode}): ${result.errmsg || '未知错误'}`);
    }

    const msgList = result.msg_list || [];
    const hasMore = result.has_more === 1 || result.has_more === true;
    const nextCursor = result.next_cursor || '';

    if (msgList.length > 0) {
      const sample = msgList[0];
      log.info(`[WecomApi] getChatMsgDataViaZone 首条消息: msgid=${sample.msgid}, sender=${JSON.stringify(sample.sender)}, send_time=${sample.send_time}, msgtype=${sample.msgtype}, has_encrypt_info=${!!sample.service_encrypt_info}, raw_keys=${Object.keys(sample).join(',')}`);
      if (sample.service_encrypt_info) {
        log.info(`[WecomApi] service_encrypt_info keys: ${Object.keys(sample.service_encrypt_info).join(',')}, keyLen=${sample.service_encrypt_info?.encrypted_secret_key?.length || 0}`);
      }
    }

    const chatdata = msgList.map((msg: any, idx: number) => {
      // ★ 兼容多种密钥字段位置：
      // 1. 标准Zone SDK格式: msg.service_encrypt_info.encrypted_secret_key
      // 2. 直接API格式: msg.encrypt_random_key
      // 3. 可能的变体: msg.encrypted_secret_key
      const encryptKey = msg.service_encrypt_info?.encrypted_secret_key
        || msg.encrypt_random_key
        || msg.encrypted_secret_key
        || '';
      return {
        seq: idx,
        msgid: msg.msgid || '',
        publickey_ver: msg.service_encrypt_info?.public_key_ver || msg.publickey_ver || 1,
        encrypt_random_key: encryptKey,
        encrypt_chat_msg: msg.encrypt_chat_msg || '',
        sender: msg.sender || { type: 0, id: '' },
        sender_type: msg.sender?.type || 0,
        sender_id: msg.sender?.id || '',
        receiver_list: msg.receiver_list || [],
        send_time: msg.send_time || 0,
        msgtype: msg.msgtype || 0,
        chatid: msg.chatid || '',
      };
    });

    log.info(`[WecomApi] getChatMsgDataViaZone: 获取 ${chatdata.length} 条消息, hasMore=${hasMore}`);
    return { chatdata, has_more: hasMore, next_cursor: nextCursor };
  }

  /**
   * 通过专区程序代理调用 get_msg_body（第三方应用必须使用此路径）
   * 专区程序内部通过 specsdkinvoke.invoke("get_msg_body") 获取加密消息体
   */
  static async getMsgBodyViaZone(
    accessToken: string,
    programId: string,
    abilityId: string,
    msgid: string
  ): Promise<{
    encrypted_msg_body: string;
    public_key_ver: number;
  }> {
    const rawResult = await this.syncCallProgram(accessToken, programId, abilityId, 'get_msg_body', {
      msgid
    });

    // ★ 兼容 output 包装层
    let result = rawResult;
    if (rawResult.output !== undefined) {
      if (typeof rawResult.output === 'string') {
        try { result = JSON.parse(rawResult.output); } catch { result = rawResult; }
      } else if (typeof rawResult.output === 'object') {
        result = rawResult.output;
      }
    }

    if (result.errcode && result.errcode !== 0) {
      throw new Error(`专区get_msg_body失败(${result.errcode}): ${result.errmsg || '未知错误'}`);
    }

    return {
      encrypted_msg_body: result.encrypted_msg_body || '',
      public_key_ver: result.public_key_ver || 1
    };
  }

  // ==================== JS-SDK 相关 ====================

  /**
   * 获取企业JS-SDK Ticket (corp级别)
   */
  static async getJsSdkTicket(accessToken: string): Promise<string> {
    const cacheKey = `jsticket:${accessToken.substring(0, 20)}`;
    const cached = ticketCache.get(cacheKey);

    if (cached && cached.expireTime > Date.now()) {
      return cached.ticket;
    }

    try {
      const response = await axios.get(`${WECOM_API_BASE}/get_jsapi_ticket`, {
        params: { access_token: accessToken }
      });

      if (response.data.errcode === 0) {
        const ticket = response.data.ticket;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
        ticketCache.set(cacheKey, { ticket, expireTime });
        return ticket;
      } else {
        throw new Error(`获取JS-SDK Ticket失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getJsSdkTicket error:', error.message);
      throw error;
    }
  }

  /**
   * 获取应用级JS-SDK Ticket (agent级别, 用于agentConfig)
   */
  static async getAgentJsSdkTicket(accessToken: string): Promise<string> {
    const cacheKey = `agent_jsticket:${accessToken.substring(0, 20)}`;
    const cached = ticketCache.get(cacheKey);

    if (cached && cached.expireTime > Date.now()) {
      log.info(`[WecomApi] getAgentJsSdkTicket: 命中缓存, 剩余有效期=${Math.round((cached.expireTime - Date.now()) / 1000)}s`);
      return cached.ticket;
    }

    log.info(`[WecomApi] getAgentJsSdkTicket: 缓存未命中，请求企微API, token前缀=${accessToken.substring(0, 20)}...`);
    try {
      const response = await axios.get(`${WECOM_API_BASE}/ticket/get`, {
        params: { access_token: accessToken, type: 'agent_config' }
      });

      log.info(`[WecomApi] getAgentJsSdkTicket: 企微API响应 errcode=${response.data.errcode}, errmsg=${response.data.errmsg}`);
      if (response.data.errcode === 0) {
        const ticket = response.data.ticket;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
        ticketCache.set(cacheKey, { ticket, expireTime });
        log.info(`[WecomApi] getAgentJsSdkTicket: ✅ 获取成功, ticket前缀=${ticket.substring(0, 20)}..., 有效期=${response.data.expires_in}s`);
        return ticket;
      } else {
        throw new Error(`获取Agent JS-SDK Ticket失败: ${response.data.errmsg} (errcode=${response.data.errcode})`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getAgentJsSdkTicket error:', error.message);
      throw error;
    }
  }

  /**
   * 生成JS-SDK签名
   */
  static generateJsSdkSignature(ticket: string, nonceStr: string, timestamp: number, url: string): string {
    const str = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
    return crypto.createHash('sha1').update(str).digest('hex');
  }

  // ==================== 入群欢迎语模板 API ====================

  /**
   * 添加入群欢迎语模板
   */
  static async addGroupWelcomeTemplate(accessToken: string, data: {
    text?: { content: string };
    image?: { media_id: string; pic_url?: string };
    link?: { title: string; url: string; picurl?: string; desc?: string };
    miniprogram?: { title: string; pic_media_id: string; appid: string; page: string };
  }): Promise<{ template_id: string }> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/group_welcome_template/add?access_token=${accessToken}`, data);
      if (response.data.errcode === 0) {
        return { template_id: response.data.template_id };
      }
      throw new Error(`添加欢迎语模板失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`);
    } catch (error: any) {
      log.error('[WecomApi] addGroupWelcomeTemplate error:', error.message);
      throw error;
    }
  }

  /**
   * 编辑入群欢迎语模板
   */
  static async editGroupWelcomeTemplate(accessToken: string, templateId: string, data: any): Promise<void> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/group_welcome_template/edit?access_token=${accessToken}`, {
        ...data,
        template_id: templateId
      });
      if (response.data.errcode !== 0) {
        throw new Error(`编辑欢迎语模板失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`);
      }
    } catch (error: any) {
      log.error('[WecomApi] editGroupWelcomeTemplate error:', error.message);
      throw error;
    }
  }

  /**
   * 删除入群欢迎语模板
   */
  static async delGroupWelcomeTemplate(accessToken: string, templateId: string): Promise<void> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/group_welcome_template/del?access_token=${accessToken}`, {
        template_id: templateId
      });
      if (response.data.errcode !== 0) {
        log.warn(`[WecomApi] delGroupWelcomeTemplate warning: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] delGroupWelcomeTemplate error:', error.message);
      throw error;
    }
  }

  // ==================== 临时素材上传 API ====================

  /**
   * 上传临时素材到企业微信（用于欢迎语附件、群发附件等）
   * @param type - image/voice/video/file
   */
  static async uploadMedia(accessToken: string, type: string, fileBuffer: Buffer, filename: string): Promise<string> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('media', fileBuffer, { filename });
      const response = await axios.post(
        `${WECOM_API_BASE}/media/upload?access_token=${accessToken}&type=${type}`,
        formData,
        { headers: formData.getHeaders() }
      );
      if (response.data.errcode === 0) {
        return response.data.media_id;
      }
      throw new Error(`上传素材失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`);
    } catch (error: any) {
      log.error('[WecomApi] uploadMedia error:', error.message);
      throw error;
    }
  }

  // ==================== 群发消息 API ====================

  /**
   * 创建企业群发（客户群）
   */
  static async addMsgTemplate(accessToken: string, data: {
    chat_type: 'group';
    sender?: string;
    text?: { content: string };
    attachments?: any[];
  }): Promise<{ msgid: string; fail_list?: string[] }> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/externalcontact/add_msg_template?access_token=${accessToken}`, data);
      if (response.data.errcode === 0) {
        return { msgid: response.data.msgid, fail_list: response.data.fail_list };
      }
      throw new Error(`创建群发失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`);
    } catch (error: any) {
      log.error('[WecomApi] addMsgTemplate error:', error.message);
      throw error;
    }
  }

  // ==================== 应用通知消息 API ====================

  /**
   * 发送应用通知（文本卡片消息）
   * 通过企微 message/send 接口向指定用户发送应用通知
   * @see https://developer.work.weixin.qq.com/document/path/90236
   */
  static async sendAppMessage(accessToken: string, data: {
    touser?: string;
    toparty?: string;
    agentid: number;
    msgtype: 'text' | 'textcard' | 'markdown' | 'miniprogram_notice';
    text?: { content: string };
    textcard?: { title: string; description: string; url: string; btntxt?: string };
    markdown?: { content: string };
    miniprogram_notice?: { appid: string; page: string; title: string; description?: string; content_item?: Array<{ key: string; value: string }> };
  }): Promise<{ errcode: number; errmsg: string; invaliduser?: string }> {
    try {
      const response = await axios.post(`${WECOM_API_BASE}/message/send?access_token=${accessToken}`, data);
      if (response.data.errcode === 0) {
        log.info(`[WecomApi] sendAppMessage success, touser=${data.touser}, msgtype=${data.msgtype}`);
        return response.data;
      }
      log.warn(`[WecomApi] sendAppMessage failed: ${response.data.errmsg} (errcode: ${response.data.errcode}), invaliduser=${response.data.invaliduser || ''}`);
      return response.data;
    } catch (error: any) {
      log.error('[WecomApi] sendAppMessage error:', error.message);
      throw error;
    }
  }

  /**
   * 通过模板卡片发送应用通知（适用于第三方服务商应用通知模板）
   * @see https://developer.work.weixin.qq.com/document/path/94888
   */
  static async sendTemplateCardMessage(accessToken: string, data: {
    touser?: string;
    toparty?: string;
    agentid: number;
    template_id: string;
    content_item?: Array<{ key: string; value: string }>;
    url?: string;
    task_id?: string;
    enable_id_trans?: number;
  }): Promise<{ errcode: number; errmsg: string }> {
    try {
      const payload = {
        touser: data.touser || '@all',
        toparty: data.toparty || '',
        agentid: data.agentid,
        msgtype: 'template_card',
        template_card: {
          card_type: 'text_notice',
          source: {},
          main_title: {},
          sub_title_text: '',
          card_action: { type: 1, url: data.url || '' },
          task_id: data.task_id || `task_${Date.now()}`,
          template_id: data.template_id,
          content_item: data.content_item || [],
        },
        enable_id_trans: data.enable_id_trans || 0,
      };
      const response = await axios.post(`${WECOM_API_BASE}/message/send?access_token=${accessToken}`, payload);
      if (response.data.errcode === 0) {
        log.info(`[WecomApi] sendTemplateCardMessage success, template_id=${data.template_id}`);
      } else {
        log.warn(`[WecomApi] sendTemplateCardMessage failed: ${response.data.errmsg} (${response.data.errcode})`);
      }
      return response.data;
    } catch (error: any) {
      log.error('[WecomApi] sendTemplateCardMessage error:', error.message);
      throw error;
    }
  }

  /**
   * 清除指定corpId的Token和Ticket缓存，取消授权时由WecomTokenService联动调用
   * 注意：ticket缓存key格式为 jsticket:/agent_jsticket: + token前缀，
   * 无法按corpId精确匹配，因此清理特定corpId时也全量清理ticket缓存
   */
  static clearCache(corpId?: string): void {
    if (corpId) {
      for (const key of tokenCache.keys()) {
        if (key.startsWith(`${corpId}:`)) {
          tokenCache.delete(key);
        }
      }
      // ticket缓存key基于accessToken前缀（非corpId），无法按corpId精确匹配
      // 为确保不使用过期ticket，全量清理ticket缓存
      ticketCache.clear();
    } else {
      tokenCache.clear();
      ticketCache.clear();
    }
    log.info(`[WecomApi] Cache cleared${corpId ? ' for ' + corpId : ' (all)'}, tokenCache=${tokenCache.size}, ticketCache=${ticketCache.size}`);
  }
}

export default WecomApiService;
