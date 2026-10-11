/**
 * ChannelService - 官网渠道链接（推广短链）服务
 *
 * 1:1 复刻参考项目能力：
 *  - 渠道短链 CRUD（自动生成 6 位随机码 / 自定义编码）
 *  - 短链解析 /c/{code}，命中启用渠道则记录点击并返回落地页
 *  - 点击明细（当日同渠道同 IP 去重计唯一点击）
 *  - 渠道维度的流量分析与访问明细（复用 SiteAnalyticsService）
 */
import { AppDataSource } from '../config/database';
import { SiteChannelLink, SiteChannelClick } from '../entities/SiteEntities';
import {
  getSiteAnalytics,
  listSiteVisits,
  type SiteAnalytics,
  type VisitQuery,
  type VisitListResult,
} from './SiteAnalyticsService';

const linkRepo = () => AppDataSource.getRepository(SiteChannelLink);
const clickRepo = () => AppDataSource.getRepository(SiteChannelClick);

/** 渠道编码字符集（去除易混淆字符） */
export const CODE_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const CODE_LEN = 6;
const CODE_RE = /^[a-z0-9_-]{1,32}$/;

/** 渠道编码归一化：去空格 + 转小写 + 限长 32 */
export function normalizeChannel(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().slice(0, 32);
}

/** 生成 6 位随机渠道编码（查重重试，失败时回退时间戳后缀） */
async function generateCode(): Promise<string> {
  for (let i = 0; i < 20; i += 1) {
    let code = '';
    for (let j = 0; j < CODE_LEN; j += 1) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const exists = await linkRepo().findOneBy({ code });
    if (!exists) return code;
  }
  return Date.now().toString(36).slice(-8);
}

/** 拼接短链地址（domain 为空时由调用方回退请求 Host） */
export function buildShortUrl(code: string, domain: string): string {
  const c = normalizeChannel(code);
  const base = (domain || '').trim().replace(/\/+$/, '');
  return `${base}/c/${c}`;
}

// ==================== 列表 / 增删改 ====================

export interface ChannelListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface ChannelListResult {
  total: number;
  page: number;
  pageSize: number;
  list: SiteChannelLink[];
}

/** 分页查询渠道链接（支持名称 / 编码 / 渠道关键字过滤） */
export async function listChannels(q: ChannelListQuery = {}): Promise<ChannelListResult> {
  const page = Math.max(1, Math.floor(q.page || 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(q.pageSize || 20)));
  const qb = linkRepo().createQueryBuilder('c');
  const kw = (q.keyword || '').trim();
  if (kw) {
    qb.where('(c.name LIKE :kw OR c.code LIKE :kw OR c.channel LIKE :kw OR c.remark LIKE :kw)', { kw: `%${kw}%` });
  }
  const total = await qb.getCount();
  const list = await qb
    .orderBy('c.id', 'DESC')
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();
  return { total, page, pageSize, list };
}

export interface ChannelInput {
  name: string;
  code?: string;
  channel?: string;
  targetPath?: string;
  remark?: string | null;
  enabled?: number;
}

/** 新建渠道链接（code 为空时自动生成 6 位随机码） */
export async function createChannel(input: ChannelInput): Promise<SiteChannelLink> {
  const name = String(input.name || '').trim().slice(0, 128);
  if (!name) throw new Error('渠道名称不能为空');

  let code = normalizeChannel(input.code);
  if (code) {
    if (!CODE_RE.test(code)) throw new Error('渠道编码仅支持小写字母、数字、下划线和中划线（1-32 位）');
    const exists = await linkRepo().findOneBy({ code });
    if (exists) throw new Error('渠道编码已存在');
  } else {
    code = await generateCode();
  }

  let targetPath = String(input.targetPath || '/').trim() || '/';
  if (!targetPath.startsWith('/')) targetPath = `/${targetPath}`;

  const row = linkRepo().create({
    code,
    name,
    channel: String(input.channel || '').trim().slice(0, 64),
    targetPath: targetPath.slice(0, 255),
    remark: input.remark ? String(input.remark).slice(0, 512) : null,
    enabled: input.enabled === 0 ? 0 : 1,
    clickCount: 0,
    uniqueClickCount: 0,
  });
  return linkRepo().save(row);
}

export interface ChannelPatch {
  name?: string;
  code?: string;
  channel?: string;
  targetPath?: string;
  remark?: string | null;
  enabled?: number;
}

/** 更新渠道链接 */
export async function updateChannel(id: string, patch: ChannelPatch): Promise<SiteChannelLink> {
  const row = await linkRepo().findOneBy({ id });
  if (!row) throw new Error('渠道链接不存在');

  if (patch.name !== undefined) {
    const name = String(patch.name || '').trim().slice(0, 128);
    if (!name) throw new Error('渠道名称不能为空');
    row.name = name;
  }
  if (patch.code !== undefined) {
    const code = normalizeChannel(patch.code);
    if (!CODE_RE.test(code)) throw new Error('渠道编码仅支持小写字母、数字、下划线和中划线（1-32 位）');
    if (code !== row.code) {
      const exists = await linkRepo().findOneBy({ code });
      if (exists) throw new Error('渠道编码已存在');
      row.code = code;
    }
  }
  if (patch.channel !== undefined) row.channel = String(patch.channel || '').trim().slice(0, 64);
  if (patch.targetPath !== undefined) {
    let targetPath = String(patch.targetPath || '/').trim() || '/';
    if (!targetPath.startsWith('/')) targetPath = `/${targetPath}`;
    row.targetPath = targetPath.slice(0, 255);
  }
  if (patch.remark !== undefined) row.remark = patch.remark ? String(patch.remark).slice(0, 512) : null;
  if (patch.enabled !== undefined) row.enabled = patch.enabled === 0 ? 0 : 1;

  return linkRepo().save(row);
}

/** 删除渠道链接（返回是否删除成功） */
export async function deleteChannel(id: string): Promise<boolean> {
  const res = await linkRepo().delete({ id });
  return (res.affected || 0) > 0;
}

/** 读取单条渠道链接 */
export async function getChannel(id: string): Promise<SiteChannelLink | null> {
  return linkRepo().findOneBy({ id });
}

// ==================== 短链解析与点击记录 ====================

export interface ChannelResolveResult {
  code: string;
  name: string;
  channel: string;
  targetPath: string;
}

/** 解析短链：命中启用中的渠道则记录点击并返回跳转信息，否则返回 null */
export async function resolveChannel(
  code: string,
  ip: string,
  ua: string,
  referer: string
): Promise<ChannelResolveResult | null> {
  const c = normalizeChannel(code);
  if (!c) return null;
  const link = await linkRepo().findOneBy({ code: c });
  if (!link || link.enabled !== 1) return null;

  await recordChannelClick(c, ip, ua, referer);
  return { code: link.code, name: link.name, channel: link.channel, targetPath: link.targetPath || '/' };
}

/** 记录一次渠道点击 + 累加总/唯一点击数（唯一按 当日同渠道同 IP 去重） */
export async function recordChannelClick(code: string, ip: string, ua: string, referer: string): Promise<void> {
  const c = normalizeChannel(code);
  if (!c) return;
  const ipVal = (ip || '').slice(0, 64);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let isUnique = true;
  if (ipVal) {
    const dup = await clickRepo()
      .createQueryBuilder('c')
      .where('c.channel_code = :c', { c })
      .andWhere('c.ip = :ip', { ip: ipVal })
      .andWhere('c.created_at >= :s', { s: startOfDay })
      .getCount();
    isUnique = dup === 0;
  }

  await clickRepo().save(
    clickRepo().create({
      channelCode: c,
      ip: ipVal,
      userAgent: (ua || '').slice(0, 255),
      referer: (referer || '').slice(0, 512),
    })
  );

  await linkRepo().increment({ code: c }, 'clickCount', 1);
  if (isUnique) await linkRepo().increment({ code: c }, 'uniqueClickCount', 1);
}

// ==================== 渠道维度的分析 / 明细 ====================

/** 渠道流量分析（复用全站分析，按渠道过滤；支持自定义日期区间） */
export async function getChannelAnalytics(
  code: string,
  days = 30,
  start = '',
  end = ''
): Promise<SiteAnalytics> {
  return getSiteAnalytics(days, normalizeChannel(code), start, end);
}

/** 渠道访问明细（复用全站明细，按渠道过滤） */
export async function listChannelVisits(code: string, query: VisitQuery): Promise<VisitListResult> {
  return listSiteVisits({ ...query, channelCode: normalizeChannel(code) });
}

// ==================== 清理（保留期，默认 90 天） ====================

/** 删除超过保留期的渠道点击明细 */
export async function cleanChannelClicks(retentionDays = 90): Promise<number> {
  const days = Math.max(1, Math.floor(retentionDays) || 90);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const res = await clickRepo()
    .createQueryBuilder()
    .delete()
    .where('created_at < :cutoff', { cutoff })
    .execute();
  return res.affected || 0;
}

export const channelService = {
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannel,
  resolveChannel,
  recordChannelClick,
  getChannelAnalytics,
  listChannelVisits,
  cleanChannelClicks,
  normalizeChannel,
  buildShortUrl,
};

export default channelService;
