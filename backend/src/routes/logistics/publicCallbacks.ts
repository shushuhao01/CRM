/**
 * 物流轨迹推送回调接口（公开路由，无需登录令牌）
 *
 * 🔥 重要：此路由必须挂载在认证中间件之前！
 * 快递开放平台从外部服务器推送轨迹数据，无法携带系统JWT令牌，
 * 之前 yto-callback 挂在认证路由下导致平台调试始终返回401。
 *
 * 各公司回调地址（POST接收推送 / GET验证可访问性）：
 *   顺丰   /api/v1/logistics/sf-callback        响应: <Response service="RoutePushService"><Head>OK</Head></Response>
 *   中通   /api/v1/logistics/zto-callback       响应: JSON success
 *   圆通   /api/v1/logistics/yto-callback       响应: 标准Response XML
 *   申通   /api/v1/logistics/sto-callback       响应: 标准Response XML
 *   韵达   /api/v1/logistics/yd-callback        响应: JSON success
 *   极兔   /api/v1/logistics/jt-callback        响应: JSON success
 *   EMS   /api/v1/logistics/ems-callback       响应: 标准Response XML
 *   京东   /api/v1/logistics/jd-callback        响应: JSON success
 *   德邦   /api/v1/logistics/dbl-callback       响应: JSON success
 *   快递100 /api/v1/logistics/kuaidi100-callback 响应: {"result":true,"returnCode":"200","message":"成功"}
 */
import { Router, Request, Response } from 'express';
import { getTenantRepo } from '../../utils/tenantRepo';
import { log } from '../../config/logger';

const router = Router();

/** 各公司回调差异化配置 */
interface CallbackCompanyConfig {
  /** 日志/响应中的公司名 */
  label: string;
  /** 成功响应类型 */
  responseType: 'standard-xml' | 'sf-xml' | 'json';
}

const CALLBACK_COMPANIES: Record<string, CallbackCompanyConfig> = {
  sf: { label: '顺丰', responseType: 'sf-xml' },
  zto: { label: '中通', responseType: 'json' },
  yto: { label: '圆通', responseType: 'standard-xml' },
  sto: { label: '申通', responseType: 'standard-xml' },
  yd: { label: '韵达', responseType: 'json' },
  jt: { label: '极兔', responseType: 'json' },
  ems: { label: 'EMS', responseType: 'standard-xml' },
  jd: { label: '京东', responseType: 'json' },
  dbl: { label: '德邦', responseType: 'json' },
  kuaidi100: { label: '快递100', responseType: 'json' }
};

/** 从XML文本中提取指定标签的值 */
function xmlTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'i'));
  return match ? match[1].trim() : '';
}

/** 从XML文本中提取指定属性的值（顺丰路由推送使用属性承载数据） */
function xmlAttr(xml: string, attr: string): string {
  const match = xml.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
  return match ? match[1].trim() : '';
}

/** 快递推送状态码 -> 系统物流状态 */
function mapPushStatus(infoContent: string): string {
  const map: Record<string, string> = {
    'GOT': 'picked_up',
    'ACCEPT': 'picked_up',
    '1': 'picked_up',          // 快递100: 1揽收
    'ARRIVAL': 'in_transit',
    'DEPARTURE': 'in_transit',
    'TRANSPORT': 'in_transit',
    '0': 'in_transit',         // 快递100: 0在途
    'SENT_SCAN': 'out_for_delivery',
    'DELIVERING': 'out_for_delivery',
    '5': 'out_for_delivery',   // 快递100: 5派件
    'SIGNED': 'delivered',
    'SIGN': 'delivered',
    '3': 'delivered',          // 快递100: 3签收
    'FAILED': 'exception',
    '2': 'exception',          // 快递100: 2疑难
    'TMS_RETURN': 'returned',
    'RETURN': 'returned',
    '4': 'returned',           // 快递100: 4退签
    '6': 'returned'            // 快递100: 6退回
  };
  return map[String(infoContent || '').toUpperCase()] || '';
}

interface ParsedPush {
  /** 运单号 */
  trackingNo: string;
  /** 物流订单号（标准XML推送的txLogisticID） */
  txLogisticID: string;
  /** 推送方标识 */
  logisticProviderID: string;
  /** 状态码 */
  infoContent: string;
  /** 最新轨迹描述 */
  remark: string;
  /** 是否为标准 logistics_interface XML 推送 */
  isStandardPush: boolean;
}

/**
 * 解析推送报文，兼容各平台格式：
 * 1. 表单 logistics_interface=<UpdateInfo>...（圆通/申通/EMS标准推送）
 * 2. 表单 content=URL编码XML（顺丰路由推送 form 方式）
 * 3. 表单 param=JSON（快递100订阅推送）
 * 4. 原始XML文本（顺丰路由推送 text 方式等）
 * 5. JSON对象（中通/韵达/极兔/京东/德邦等）
 */
function parsePushBody(req: Request): ParsedPush {
  const result: ParsedPush = {
    trackingNo: '', txLogisticID: '', logisticProviderID: '',
    infoContent: '', remark: '', isStandardPush: false
  };

  let xml = '';
  let jsonBody: any = null;

  if (typeof req.body === 'object' && req.body !== null) {
    if (typeof req.body.logistics_interface === 'string') {
      xml = req.body.logistics_interface;
      result.isStandardPush = true;
    } else if (typeof req.body.content === 'string' && req.body.content.includes('<')) {
      // 顺丰 form 方式：content 字段为URL编码的XML（中间件已解码）
      xml = req.body.content;
    } else if (typeof req.body.param === 'string') {
      // 快递100订阅推送：param 字段为JSON字符串
      try { jsonBody = JSON.parse(req.body.param); } catch { /* 忽略解析失败 */ }
    } else {
      jsonBody = req.body;
    }
  } else if (typeof req.body === 'string') {
    const text = req.body.trim();
    if (text.startsWith('<')) {
      xml = text;
      result.isStandardPush = text.includes('logisticProviderID') || text.includes('UpdateInfo');
    } else if (text.includes('logistics_interface=')) {
      const param = text.split('&').find(p => p.startsWith('logistics_interface='));
      if (param) {
        xml = decodeURIComponent(param.substring('logistics_interface='.length).replace(/\+/g, ' '));
        result.isStandardPush = true;
      }
    } else if (text.startsWith('{') || text.startsWith('[')) {
      try { jsonBody = JSON.parse(text); } catch { /* 忽略解析失败 */ }
    }
  }

  if (xml) {
    result.trackingNo = xmlTag(xml, 'mailNo') || xmlAttr(xml, 'mailno') || xmlTag(xml, 'txLogisticID');
    result.txLogisticID = xmlTag(xml, 'txLogisticID');
    result.logisticProviderID = xmlTag(xml, 'logisticProviderID');
    result.infoContent = xmlTag(xml, 'infoContent') || xmlAttr(xml, 'opCode');
    result.remark = xmlTag(xml, 'remark') || xmlAttr(xml, 'remark');
  } else if (jsonBody) {
    const item = Array.isArray(jsonBody) ? jsonBody[0] || {} : jsonBody;
    // 快递100: lastResult.nu / lastResult.data[0].context
    const lastResult = item.lastResult || {};
    const firstTrace = Array.isArray(lastResult.data) ? lastResult.data[0] : null;
    result.trackingNo = item.waybillNo || item.mailNo || item.billCode || item.number
      || item.waybillCode || item.logisticsId || lastResult.nu || '';
    result.infoContent = item.infoContent || item.logisticsStatus || item.opCode
      || item.action || lastResult.state || '';
    result.remark = item.description || item.acceptRemark || item.remark
      || item.desc || (firstTrace ? firstTrace.context : '') || '';
  }

  return result;
}

/** 根据推送内容更新对应订单的物流状态（找不到订单不视为失败，平台调试用的是测试单号） */
async function updateOrderFromPush(companyLabel: string, parsed: ParsedPush): Promise<void> {
  if (!parsed.trackingNo) return;
  try {
    const { Order } = await import('../../entities/Order');
    const orderRepository = getTenantRepo(Order);
    const order = await orderRepository.findOne({
      where: { trackingNumber: parsed.trackingNo }
    });
    if (order) {
      if (parsed.remark) {
        (order as any).latestLogisticsInfo = parsed.remark;
      }
      const mapped = mapPushStatus(parsed.infoContent);
      if (mapped) {
        (order as any).logisticsStatus = mapped;
      }
      (order as any).updatedAt = new Date();
      await orderRepository.save(order);
      log.info(`[${companyLabel}回调] ✅ 订单 ${(order as any).orderNumber} 物流数据已更新`);
    } else {
      log.info(`[${companyLabel}回调] 未找到运单号 ${parsed.trackingNo} 对应的订单（测试推送可忽略）`);
    }
  } catch (dbError) {
    log.warn(`[${companyLabel}回调] 保存物流数据失败:`, dbError);
  }
}

/** 按各平台要求返回成功响应 */
function sendSuccessResponse(cfg: CallbackCompanyConfig, parsed: ParsedPush, res: Response): void {
  switch (cfg.responseType) {
    case 'sf-xml':
      // 顺丰丰桥路由推送：Head为OK表示接收成功
      res.set('Content-Type', 'text/xml;charset=UTF-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response service="RoutePushService">
<Head>OK</Head>
</Response>`);
      return;
    case 'standard-xml':
      // 圆通/申通/EMS标准推送：回显logisticProviderID/txLogisticID
      res.set('Content-Type', 'text/xml;charset=UTF-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <logisticProviderID>${parsed.logisticProviderID || cfg.label}</logisticProviderID>
  <txLogisticID>${parsed.txLogisticID || parsed.trackingNo}</txLogisticID>
  <success>true</success>
  <reason></reason>
</Response>`);
      return;
    case 'json':
    default:
      // 快递100要求 result/returnCode/message；中通/韵达/极兔/京东/德邦等各平台
      // 分别校验 success/result/code 之一，合并返回以兼容所有平台
      res.json({
        result: true,
        returnCode: '200',
        success: true,
        code: '0',
        msg: 'success',
        message: '成功'
      });
      return;
  }
}

/** 通用轨迹推送处理逻辑 */
async function handleTracePush(companyKey: string, req: Request, res: Response): Promise<void> {
  const cfg = CALLBACK_COMPANIES[companyKey];
  try {
    log.info(`[${cfg.label}回调] Content-Type:`, String(req.headers['content-type'] || ''));

    const parsed = parsePushBody(req);
    const rawPreview = typeof req.body === 'string'
      ? req.body.substring(0, 2000)
      : JSON.stringify(req.body || {}).substring(0, 2000);
    log.info(`[${cfg.label}回调] 收到报文:`, rawPreview);
    log.info(`[${cfg.label}回调] 解析结果: 运单号=${parsed.trackingNo || '(未识别)'}, 状态=${parsed.infoContent || '(无)'}`);

    await updateOrderFromPush(cfg.label, parsed);
    sendSuccessResponse(cfg, parsed, res);
  } catch (error) {
    log.error(`[${cfg.label}回调] 处理失败:`, error);
    if (cfg.responseType === 'sf-xml') {
      res.set('Content-Type', 'text/xml;charset=UTF-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response service="RoutePushService">
<Head>ERR</Head>
<ERROR code="0010">处理失败</ERROR>
</Response>`);
    } else if (cfg.responseType === 'standard-xml') {
      res.set('Content-Type', 'text/xml;charset=UTF-8');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <success>false</success>
  <reason>处理失败</reason>
</Response>`);
    } else {
      res.json({ result: false, returnCode: '500', success: false, message: '处理失败' });
    }
  }
}

// 为每家公司注册 POST（接收推送）和 GET（验证URL可访问性）路由
for (const [key, cfg] of Object.entries(CALLBACK_COMPANIES)) {
  const path = `/${key}-callback`;
  router.post(path, (req, res) => handleTracePush(key, req, res));
  router.get(path, (_req, res) => {
    res.json({
      success: true,
      message: `${cfg.label}物流轨迹推送回调接口正常`,
      endpoint: `/api/v1/logistics${path}`,
      method: 'POST',
      timestamp: new Date().toISOString()
    });
  });
}

export default router;
