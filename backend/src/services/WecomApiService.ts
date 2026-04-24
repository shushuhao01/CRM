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
   * @param secretType - corp: 应用Secret, contact: 通讯录同步Secret, external: 客户联系Secret, chat: 会话存档Secret
   */
  static async getAccessTokenByConfigId(configId: number, secretType: 'corp' | 'contact' | 'external' | 'chat' = 'corp'): Promise<string> {
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
        return response.data.department || [];
      } else {
        throw new Error(`获取部门列表失败: ${response.data.errmsg}`);
      }
    } catch (error: any) {
      log.error('[WecomApi] getDepartmentList error:', error.message);
      throw error;
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
        return response.data;
      } else {
        throw new Error(`获取外部联系人详情失败: ${response.data.errmsg}`);
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
      return cached.ticket;
    }

    try {
      const response = await axios.get(`${WECOM_API_BASE}/ticket/get`, {
        params: { access_token: accessToken, type: 'agent_config' }
      });

      if (response.data.errcode === 0) {
        const ticket = response.data.ticket;
        const expireTime = Date.now() + (response.data.expires_in - 300) * 1000;
        ticketCache.set(cacheKey, { ticket, expireTime });
        return ticket;
      } else {
        throw new Error(`获取Agent JS-SDK Ticket失败: ${response.data.errmsg}`);
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

  /**
   * 清除指定corpId的Token和Ticket缓存，取消授权时由WecomTokenService联动调用
   */
  static clearCache(corpId?: string): void {
    if (corpId) {
      for (const key of tokenCache.keys()) {
        if (key.startsWith(`${corpId}:`)) {
          tokenCache.delete(key);
        }
      }
      for (const key of ticketCache.keys()) {
        if (key.startsWith(`${corpId}:`)) {
          ticketCache.delete(key);
        }
      }
    } else {
      tokenCache.clear();
      ticketCache.clear();
    }
    log.info(`[WecomApi] Cache cleared${corpId ? ' for ' + corpId : ' (all)'}`);
  }
}

export default WecomApiService;
