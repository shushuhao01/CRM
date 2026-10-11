/**
 * SiteAnalyticsService - 官网访问统计分析服务
 *
 * 1:1 复刻参考项目的多维分析能力：
 *  - IP 归属地离线解析（ip2region，懒加载，失败降级）
 *  - User-Agent 解析（设备/系统/浏览器）
 *  - 来源渠道归类（直接访问/站内/搜索引擎/社交/外部链接）
 *  - 页面访问写入（明细 + PV/UV 累计）
 *  - 多维度聚合（趋势/小时/来源/设备/系统/浏览器/地域/运营商/页面/IP）
 *  - 实时在线访客
 *  - 访问明细分页查询
 *
 * ⚠️ 与参考项目的差异：本项目 site_visit_log 主键为 VARCHAR(36) uuid，
 *    因此聚合取最新记录用 created_at（而非自增 id）。
 */
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppDataSource } from '../config/database';
import { SiteVisitLog, SiteStatsDaily, SiteChannelStatsDaily, SiteOnline } from '../entities/SiteEntities';
import { Tenant } from '../entities/Tenant';
import { siteService } from './SiteService';
import { v4 as uuidv4 } from 'uuid';
import { defaultDbFile, loadContentFromFile, newWithBuffer, isValidIp } from 'ip2region-ts';

// ==================== 通用类型 ====================

export interface NameValue {
  name: string;
  value: number;
}

const repo = (): Repository<SiteVisitLog> => AppDataSource.getRepository(SiteVisitLog);
const statsRepo = (): Repository<SiteStatsDaily> => AppDataSource.getRepository(SiteStatsDaily);
const onlineRepo = (): Repository<SiteOnline> => AppDataSource.getRepository(SiteOnline);

// ==================== 时间工具（本地时区） ====================

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + n);
  return d;
}

/** 解析 YYYY-MM-DD 为本地时区日期 */
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** 计算两个 YYYY-MM-DD 相差的天数（b - a） */
function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

// ==================== IP 归属地（离线 ip2region，懒加载） ====================

export interface IpLocation {
  country: string;
  province: string;
  city: string;
  isp: string;
}

const IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

let searcher: { search(ip: string): Promise<{ region: string | null }> } | null = null;
let searcherReady = false;

/** 懒加载离线 IP 库（数据文件常驻内存，仅初始化一次；加载失败自动降级为空归属地） */
function getSearcher(): { search(ip: string): Promise<{ region: string | null }> } | null {
  if (searcherReady) return searcher;
  searcherReady = true;
  try {
    const dbPath = process.env.IP2REGION_XDB || defaultDbFile;
    const buffer = loadContentFromFile(dbPath);
    searcher = newWithBuffer(buffer) as unknown as { search(ip: string): Promise<{ region: string | null }> };
  } catch {
    searcher = null;
  }
  return searcher;
}

function cleanPart(v: string | undefined): string {
  const s = (v || '').trim();
  return s === '0' ? '' : s;
}

/** 解析 IP 归属地：region 格式 `国家|区域|省份|城市|ISP`（`0` 表示空） */
export async function resolveLocation(ip: string): Promise<IpLocation> {
  const empty: IpLocation = { country: '', province: '', city: '', isp: '' };
  if (!ip || !IPV4.test(ip) || !isValidIp(ip)) return empty;
  const s = getSearcher();
  if (!s) return empty;
  try {
    const { region } = await s.search(ip);
    if (!region) return empty;
    const parts = region.split('|');
    const isp = cleanPart(parts[4]);
    if (isp === '内网IP') return { country: '', province: '局域网', city: '', isp };
    return {
      country: cleanPart(parts[0]),
      province: cleanPart(parts[2]),
      city: cleanPart(parts[3]),
      isp,
    };
  } catch {
    return empty;
  }
}

// ==================== User-Agent 解析（轻量自研） ====================

export interface UaInfo {
  device: string;
  os: string;
  browser: string;
}

const BOT_RE = /bot|spider|crawler|slurp|bingpreview|python-requests|curl\/|wget|headless|facebookexternalhit|node-fetch|axios|okhttp/i;

function detectDevice(ua: string): string {
  if (BOT_RE.test(ua)) return 'bot';
  if (/ipad|tablet|playbook|silk|kindle/i.test(ua)) return 'tablet';
  if (/android/i.test(ua) && !/mobile/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|windows phone|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  if (/windows|macintosh|mac os x|x11|linux|cros/i.test(ua)) return 'desktop';
  return 'unknown';
}

function detectOs(ua: string): string {
  if (/harmonyos|openharmony/i.test(ua)) return 'HarmonyOS';
  if (/windows nt 10\.0/i.test(ua)) return 'Windows 10/11';
  if (/windows nt 6\.3/i.test(ua)) return 'Windows 8.1';
  if (/windows nt 6\.2/i.test(ua)) return 'Windows 8';
  if (/windows nt 6\.1/i.test(ua)) return 'Windows 7';
  if (/windows nt 6\.0/i.test(ua)) return 'Windows Vista';
  if (/windows nt 5\.1/i.test(ua)) return 'Windows XP';
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux|x11/i.test(ua)) return 'Linux';
  return '';
}

function detectBrowser(ua: string): string {
  if (/micromessenger/i.test(ua)) return '微信';
  if (/qqbrowser/i.test(ua)) return 'QQ浏览器';
  if (/ucbrowser|ucweb/i.test(ua)) return 'UC浏览器';
  if (/360se|360ee|qihoobrowser/i.test(ua)) return '360浏览器';
  if (/edg[ae]?\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/msie|trident/i.test(ua)) return 'IE';
  if (/safari/i.test(ua)) return 'Safari';
  return '其他';
}

export function parseUserAgent(uaRaw: string): UaInfo {
  const ua = uaRaw || '';
  return { device: detectDevice(ua), os: detectOs(ua), browser: detectBrowser(ua) };
}

// ==================== 来源分类 ====================

/** 依据 referer 归类来源渠道（返回中文标签） */
export function classifySource(referer: string, host: string): string {
  if (!referer) return '直接访问';
  let refHost = '';
  try {
    refHost = new URL(referer).hostname.toLowerCase();
  } catch {
    refHost = referer.toLowerCase();
  }
  if (!refHost) return '直接访问';
  const h = (host || '').toLowerCase();
  if (h && (refHost === h || refHost.endsWith('.' + h))) return '站内';
  if (refHost.includes('baidu.')) return '百度';
  if (refHost.includes('google.')) return '谷歌';
  if (refHost.includes('bing.')) return '必应';
  if (refHost.includes('sogou.')) return '搜狗';
  if (refHost.includes('so.com') || refHost.includes('360.cn') || refHost.includes('360.com')) return '360搜索';
  if (refHost.includes('sm.cn')) return '神马';
  if (refHost.includes('weixin') || refHost.includes('wechat')) return '微信';
  if (refHost.includes('weibo.')) return '微博';
  if (refHost.includes('zhihu.')) return '知乎';
  if (refHost.includes('github.')) return 'GitHub';
  if (refHost.includes('douyin.') || refHost.includes('tiktok.')) return '抖音';
  if (refHost.includes('xiaohongshu.')) return '小红书';
  if (refHost.includes('qq.com')) return 'QQ';
  return '外部链接';
}

// ==================== 访问记录写入 ====================

export interface RecordVisitInput {
  ip: string;
  ua: string;
  referer: string;
  path: string;
  visitorId: string;
  host: string;
  channelCode?: string;
}

/** 渠道编码归一化：去空格 + 转小写 + 限长 32（与 ChannelService 保持一致） */
function normalizeChannelValue(v: unknown): string {
  return String(v ?? '').trim().toLowerCase().slice(0, 32);
}

/** 当日是否该访客首次访问（UV 去重；visitorId 为空时按 IP 兜底） */
async function isFirstVisitToday(date: string, visitorId: string, ip: string): Promise<boolean> {
  if (visitorId) {
    return (await repo().count({ where: { visitDate: date, visitorId } })) === 0;
  }
  if (ip) {
    return (await repo().count({ where: { visitDate: date, ip } })) === 0;
  }
  return false;
}

/** 记录一次页面访问：写明细 + 累加 PV，当日首访额外累加 UV */
export async function recordVisit(input: RecordVisitInput): Promise<void> {
  const now = new Date();
  const visitDate = fmtDate(now);
  // 先判断是否当日首访（此时当前记录尚未写入）
  const isNew = await isFirstVisitToday(visitDate, input.visitorId, input.ip).catch(() => false);

  const [loc, ua] = [await resolveLocation(input.ip), parseUserAgent(input.ua)];
  const row = repo().create({
    id: uuidv4(),
    visitDate,
    visitHour: now.getHours(),
    ip: (input.ip || '').slice(0, 64),
    country: loc.country,
    province: loc.province,
    city: loc.city,
    isp: loc.isp,
    device: ua.device,
    os: ua.os,
    browser: ua.browser,
    source: classifySource(input.referer, input.host),
    referer: (input.referer || '').slice(0, 500),
    path: (input.path || '/').slice(0, 500),
    visitorId: (input.visitorId || '').slice(0, 64),
    channelCode: normalizeChannelValue(input.channelCode),
    userAgent: (input.ua || '').slice(0, 500),
  } as any);
  await repo().save(row);

  await siteService.bumpStat('pv', 1);
  if (isNew) await siteService.bumpStat('uv', 1);
}

// ==================== 聚合分析 ====================

export interface AnalyticsSummary {
  pv: number;
  uv: number;
  ips: number;
  downloads: number;
  buyClicks: number;
  trialClicks: number;
  registerUsers: number;
  todayPv: number;
  todayUv: number;
  avgPv: number;
  peakHour: number;
  peakHourPv: number;
}

export interface AnalyticsTrend {
  dates: string[];
  pv: number[];
  uv: number[];
}

export interface AnalyticsPage {
  path: string;
  pv: number;
  uv: number;
}

export interface AnalyticsIp {
  ip: string;
  province: string;
  city: string;
  isp: string;
  pv: number;
  lastPath: string;
  lastTime: string;
}

export interface AnalyticsDaily {
  date: string;
  pv: number;
  uv: number;
  downloads: number;
  buyClicks: number;
  trialClicks: number;
}

export interface SiteAnalytics {
  range: { days: number; start: string; end: string };
  summary: AnalyticsSummary;
  trend: AnalyticsTrend;
  hours: { labels: string[]; pv: number[] };
  sources: NameValue[];
  devices: NameValue[];
  os: NameValue[];
  browsers: NameValue[];
  regions: NameValue[];
  isps: NameValue[];
  pages: AnalyticsPage[];
  ips: AnalyticsIp[];
  daily: AnalyticsDaily[];
}

const UV_EXPR = "COUNT(DISTINCT CASE WHEN v.visitor_id = '' THEN v.ip ELSE v.visitor_id END)";

function toNum(v: unknown): number {
  return Number(v) || 0;
}

/** 官网数据分析（流量 / 来源 / 地域 / 设备 / 时间等多维度聚合；传入 channelCode 时按渠道维度过滤；传入 start/end 时按自定义日期区间统计） */
export async function getSiteAnalytics(
  days = 30,
  channelCode = '',
  startDate = '',
  endDate = ''
): Promise<SiteAnalytics> {
  const now = new Date();
  const today = fmtDate(now);
  let start: string;
  let end: string;
  if (YMD_RE.test(startDate) && YMD_RE.test(endDate) && startDate <= endDate) {
    start = startDate;
    end = endDate;
  } else {
    const d = Math.min(90, Math.max(1, Math.floor(days) || 30));
    start = fmtDate(addDays(now, -(d - 1)));
    end = today;
  }
  let range = diffDays(start, end) + 1;
  if (range > 366) {
    start = fmtDate(addDays(parseYmd(end), -365));
    range = 366;
  }
  if (range < 1) range = 1;
  const ch = normalizeChannelValue(channelCode);

  const r = repo();

  /** 追加渠道过滤条件（须在 where 之后调用，避免覆盖既有条件） */
  const applyChannel = (qb: SelectQueryBuilder<SiteVisitLog>): SelectQueryBuilder<SiteVisitLog> => {
    if (ch) qb.andWhere('v.channel_code = :channelCode', { channelCode: ch });
    return qb;
  };

  const [sumRow, trendRows, hourRows, sourceRows, deviceRows, osRows, browserRows, regionRows, ispRows, pageRows, ipRows, todayRow] =
    await Promise.all([
      applyChannel(r.createQueryBuilder('v')
        .select('COUNT(*)', 'pv')
        .addSelect(UV_EXPR, 'uv')
        .addSelect('COUNT(DISTINCT v.ip)', 'ips')
        .where('v.visit_date >= :start', { start }))
        .getRawOne<{ pv: string; uv: string; ips: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select("DATE_FORMAT(v.visit_date, '%Y-%m-%d')", 'date')
        .addSelect('COUNT(*)', 'pv')
        .addSelect(UV_EXPR, 'uv')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.visit_date')
        .orderBy('v.visit_date', 'ASC')
        .getRawMany<{ date: string; pv: string; uv: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.visit_hour', 'hour')
        .addSelect('COUNT(*)', 'pv')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.visit_hour')
        .orderBy('v.visit_hour', 'ASC')
        .getRawMany<{ hour: number; pv: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.source', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.source')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.device', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.device')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.os', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.os')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.browser', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.browser')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.province', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start })
        .andWhere("v.province != ''"))
        .groupBy('v.province')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.isp', 'name')
        .addSelect('COUNT(*)', 'value')
        .where('v.visit_date >= :start', { start })
        .andWhere("v.isp != ''"))
        .groupBy('v.isp')
        .orderBy('value', 'DESC')
        .limit(10)
        .getRawMany<{ name: string; value: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.path', 'path')
        .addSelect('COUNT(*)', 'pv')
        .addSelect(UV_EXPR, 'uv')
        .where('v.visit_date >= :start', { start }))
        .groupBy('v.path')
        .orderBy('pv', 'DESC')
        .limit(10)
        .getRawMany<{ path: string; pv: string; uv: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('v.ip', 'ip')
        .addSelect('COUNT(*)', 'pv')
        .where('v.visit_date >= :start', { start })
        .andWhere("v.ip != ''"))
        .groupBy('v.ip')
        .orderBy('pv', 'DESC')
        .limit(50)
        .getRawMany<{ ip: string; pv: string }>(),
      applyChannel(r.createQueryBuilder('v')
        .select('COUNT(*)', 'pv')
        .addSelect(UV_EXPR, 'uv')
        .where('v.visit_date = :today', { today }))
        .getRawOne<{ pv: string; uv: string }>(),
    ]);

  // 访问明细中 Top IP 的最近一次访问信息（按 created_at 取最新，uuid 主键无法依赖自增 id）
  const detailByIp = new Map<string, SiteVisitLog>();
  const ipList = ipRows.map((x) => x.ip).filter(Boolean);
  if (ipList.length) {
    const details = await r.createQueryBuilder('v')
      .where('v.ip IN (:...ips)', { ips: ipList })
      .andWhere('v.created_at = (SELECT MAX(v2.created_at) FROM site_visit_log v2 WHERE v2.ip = v.ip)')
      .getMany();
    for (const d of details) detailByIp.set(d.ip || '', d);
  }

  // 下载 / 购买点击 / 免费试用点击：渠道视图读渠道日聚合表，总览读全站日聚合表
  const statMap = new Map<string, { downloads: number; buyClicks: number; trialClicks: number }>();
  let downloads = 0;
  let buyClicks = 0;
  let trialClicks = 0;
  if (ch) {
    const chRows = await AppDataSource.getRepository(SiteChannelStatsDaily)
      .createQueryBuilder('s')
      .where('s.stat_date >= :start', { start })
      .andWhere('s.channel_code = :channelCode', { channelCode: ch })
      .getMany();
    for (const s of chRows) statMap.set(s.statDate, { downloads: s.downloads || 0, buyClicks: s.buyClicks || 0, trialClicks: s.trialClicks || 0 });
    downloads = chRows.reduce((a, s) => a + (s.downloads || 0), 0);
    buyClicks = chRows.reduce((a, s) => a + (s.buyClicks || 0), 0);
    trialClicks = chRows.reduce((a, s) => a + (s.trialClicks || 0), 0);
  } else {
    const statRows = await statsRepo()
      .createQueryBuilder('s')
      .where('s.stat_date >= :start', { start })
      .getMany();
    for (const s of statRows) statMap.set(s.statDate, { downloads: s.downloads || 0, buyClicks: s.buyClicks || 0, trialClicks: s.trialClicks || 0 });
    downloads = statRows.reduce((a, s) => a + (s.downloads || 0), 0);
    buyClicks = statRows.reduce((a, s) => a + (s.buyClicks || 0), 0);
    trialClicks = statRows.reduce((a, s) => a + (s.trialClicks || 0), 0);
  }

  // 注册用户数：所选时间范围内 tenants 表新增（区别于渠道视图，注册不区分渠道，全局口径）
  let registerUsers = 0;
  try {
    registerUsers = await AppDataSource.getRepository(Tenant)
      .createQueryBuilder('t')
      .where('DATE(t.createdAt) >= :start', { start })
      .andWhere('DATE(t.createdAt) <= :end', { end })
      .getCount();
  } catch {
    registerUsers = 0;
  }

  // 补齐日期序列
  const dates: string[] = [];
  for (let i = 0; i < range; i += 1) dates.push(fmtDate(addDays(parseYmd(start), i)));
  const trendPvMap = new Map<string, number>();
  const trendUvMap = new Map<string, number>();
  for (const row of trendRows) {
    trendPvMap.set(String(row.date), toNum(row.pv));
    trendUvMap.set(String(row.date), toNum(row.uv));
  }
  const trend: AnalyticsTrend = {
    dates,
    pv: dates.map((d) => trendPvMap.get(d) || 0),
    uv: dates.map((d) => trendUvMap.get(d) || 0),
  };

  // 补齐 0-23 小时
  const hourMap = new Map<number, number>();
  for (const row of hourRows) hourMap.set(Number(row.hour), toNum(row.pv));
  const hours = {
    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    pv: Array.from({ length: 24 }, (_, i) => hourMap.get(i) || 0),
  };
  let peakHour = 0;
  let peakHourPv = 0;
  hours.pv.forEach((v, i) => {
    if (v > peakHourPv) {
      peakHourPv = v;
      peakHour = i;
    }
  });

  const pv = toNum(sumRow?.pv);
  const uv = toNum(sumRow?.uv);

  const daily: AnalyticsDaily[] = dates.map((d) => {
    const s = statMap.get(d);
    return {
      date: d,
      pv: trendPvMap.get(d) || 0,
      uv: trendUvMap.get(d) || 0,
      downloads: s?.downloads || 0,
      buyClicks: s?.buyClicks || 0,
      trialClicks: s?.trialClicks || 0,
    };
  });

  return {
    range: { days: range, start, end },
    summary: {
      pv,
      uv,
      ips: toNum(sumRow?.ips),
      downloads,
      buyClicks,
      trialClicks,
      registerUsers,
      todayPv: toNum(todayRow?.pv),
      todayUv: toNum(todayRow?.uv),
      avgPv: range > 0 ? Math.round(pv / range) : 0,
      peakHour,
      peakHourPv,
    },
    trend,
    hours,
    sources: sourceRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    devices: deviceRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    os: osRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    browsers: browserRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    regions: regionRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    isps: ispRows.map((x) => ({ name: x.name || '未知', value: toNum(x.value) })),
    pages: pageRows.map((x) => ({ path: x.path || '/', pv: toNum(x.pv), uv: toNum(x.uv) })),
    ips: ipRows.map((x) => {
      const d = detailByIp.get(x.ip);
      return {
        ip: x.ip,
        province: d?.province || '',
        city: d?.city || '',
        isp: d?.isp || '',
        pv: toNum(x.pv),
        lastPath: d?.path || '',
        lastTime: d?.createdAt ? new Date(d.createdAt).toISOString() : '',
      };
    }),
    daily,
  };
}

// ==================== 实时在线 ====================

const ONLINE_WINDOW_MIN = 5;

/** 刷新某访客的在线状态（visitor_id 优先，回退 ip），用于页面访问与心跳上报 */
export async function touchOnline(visitorId: string, ip: string): Promise<void> {
  const key = (visitorId || '').trim() || `ip:${(ip || '').trim()}`;
  if (key === 'ip:') return; // 既无访客标识也无 IP，忽略
  await onlineRepo()
    .createQueryBuilder()
    .insert()
    .into(SiteOnline)
    .values({ visitorId: key.slice(0, 64), ip: (ip || '').slice(0, 64), lastSeen: new Date() })
    .orUpdate(['ip', 'last_seen'], ['visitor_id'])
    .execute();
}

/** 实时在线访客数：最近 N 分钟内有过活跃上报的在线记录数 */
export async function getSiteOnlineCount(minutes = ONLINE_WINDOW_MIN): Promise<number> {
  const win = Math.min(1440, Math.max(1, Math.floor(minutes) || ONLINE_WINDOW_MIN));
  const n = await onlineRepo()
    .createQueryBuilder('o')
    .where('o.last_seen >= DATE_SUB(NOW(), INTERVAL :min MINUTE)', { min: win })
    .getCount();
  return n;
}

/** 清理在线表中过期记录（仅保留最近 hours 小时的在线状态） */
export async function cleanSiteOnline(hours = 24): Promise<number> {
  const h = Math.max(1, Math.floor(hours) || 24);
  const res = await onlineRepo()
    .createQueryBuilder()
    .delete()
    .where('last_seen < DATE_SUB(NOW(), INTERVAL :h HOUR)', { h })
    .execute();
  return res.affected || 0;
}

// ==================== 访问明细查询 ====================

export interface VisitQuery {
  page: number;
  pageSize: number;
  ip?: string;
  path?: string;
  device?: string;
  source?: string;
  keyword?: string;
  start?: string;
  end?: string;
  channelCode?: string;
}

export interface VisitListResult {
  total: number;
  page: number;
  pageSize: number;
  list: SiteVisitLog[];
}

/** 分页查询访问明细（支持 IP / 路径 / 设备 / 来源 / 关键字 / 时间范围过滤） */
export async function listSiteVisits(q: VisitQuery): Promise<VisitListResult> {
  const page = Math.max(1, q.page || 1);
  const pageSize = Math.min(100, Math.max(1, q.pageSize || 20));
  const qb = repo().createQueryBuilder('v');

  if (q.ip) qb.andWhere('v.ip LIKE :ip', { ip: `%${q.ip}%` });
  if (q.path) qb.andWhere('v.path LIKE :path', { path: `%${q.path}%` });
  if (q.device) qb.andWhere('v.device = :device', { device: q.device });
  if (q.source) qb.andWhere('v.source = :source', { source: q.source });
  if (q.keyword) {
    qb.andWhere(
      '(v.ip LIKE :kw OR v.path LIKE :kw OR v.referer LIKE :kw OR v.user_agent LIKE :kw OR v.province LIKE :kw OR v.city LIKE :kw)',
      { kw: `%${q.keyword}%` }
    );
  }
  if (q.start) qb.andWhere('v.visit_date >= :start', { start: q.start });
  if (q.end) qb.andWhere('v.visit_date <= :end', { end: q.end });
  if (q.channelCode) qb.andWhere('v.channel_code = :channelCode', { channelCode: normalizeChannelValue(q.channelCode) });

  const total = await qb.getCount();
  const list = await qb
    .orderBy('v.created_at', 'DESC')
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getMany();

  return { total, page, pageSize, list };
}

// ==================== 明细清理（保留期，默认 90 天） ====================

/** 删除超过保留期的访问明细 */
export async function cleanSiteVisitLogs(retentionDays = 90): Promise<number> {
  const days = Math.max(1, Math.floor(retentionDays) || 90);
  const cutoff = fmtDate(addDays(new Date(), -days));
  const res = await repo()
    .createQueryBuilder()
    .delete()
    .where('visit_date < :cutoff', { cutoff })
    .execute();
  return res.affected || 0;
}

export const siteAnalyticsService = {
  recordVisit,
  getSiteAnalytics,
  listSiteVisits,
  touchOnline,
  getSiteOnlineCount,
  cleanSiteOnline,
  cleanSiteVisitLogs,
  resolveLocation,
  parseUserAgent,
  classifySource,
};

export default siteAnalyticsService;
