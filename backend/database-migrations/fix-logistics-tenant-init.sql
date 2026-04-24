-- ============================================================
-- 物流公司 & API配置 租户初始化数据修复
-- 日期: 2026-03-24
-- 说明:
--   1. 为所有现有租户补充缺失的默认物流公司数据
--   2. 为所有现有租户补充缺失的默认物流API配置数据
--   3. 后端 ensureDefaultLogisticsCompanies / ensureDefaultApiConfigs
--      已从 count===0 改为逐个 code 检查，新租户会自动初始化
-- 执行方式(确保UTF-8编码):
--   mysql -u用户 -p密码 --default-character-set=utf8mb4 数据库名 < 本文件.sql
--   或在phpMyAdmin中直接导入执行
-- ============================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. 为所有现有租户补充缺失的物流公司
INSERT INTO logistics_companies (id, tenant_id, code, name, short_name, website, tracking_url, contact_phone, status, sort_order, remark)
SELECT
  CONCAT('lc-', LOWER(src.code), '-', SUBSTRING(UUID(), 1, 8)) AS id,
  t.tenant_id,
  src.code, src.name, src.short_name, src.website, src.tracking_url,
  src.contact_phone, src.status, src.sort_order, src.remark
FROM (
  SELECT 'SF'   AS code, '顺丰速运' AS name, '顺丰' AS short_name, 'https://www.sf-express.com' AS website, 'https://www.sf-express.com/cn/sc/dynamic_function/waybill/#search/bill-number/{trackingNo}' AS tracking_url, '95338'  AS contact_phone, 'active'   AS status, 1 AS sort_order, '顺丰速运官方' AS remark
  UNION ALL SELECT 'ZTO',  '中通快递', '中通', 'https://www.zto.com',       'https://www.zto.com/express/expressInfo.html?no={trackingNo}',              '95311',  'active',   2, '中通快递官方'
  UNION ALL SELECT 'YTO',  '圆通速递', '圆通', 'https://www.yto.net.cn',    'https://www.yto.net.cn/query/{trackingNo}',                                '95554',  'active',   3, '圆通速递官方'
  UNION ALL SELECT 'STO',  '申通快递', '申通', 'https://www.sto.cn',         'https://www.sto.cn/query/{trackingNo}',                                    '95543',  'active',   4, '申通快递官方'
  UNION ALL SELECT 'YD',   '韵达速递', '韵达', 'https://www.yunda.com',      'https://www.yunda.com/query/{trackingNo}',                                 '95546',  'active',   5, '韵达速递官方'
  UNION ALL SELECT 'JTSD', '极兔速递', '极兔', 'https://www.jtexpress.cn',   'https://www.jtexpress.cn/track/{trackingNo}',                              '95353',  'active',   6, '极兔速递官方'
  UNION ALL SELECT 'EMS',  '邮政EMS',  'EMS',  'https://www.ems.com.cn',     'https://www.ems.com.cn/queryList?mailNo={trackingNo}',                     '11183',  'active',   7, '中国邮政EMS'
  UNION ALL SELECT 'JD',   '京东物流', '京东', 'https://www.jdl.com',        'https://www.jd.com/orderDetail?orderId={trackingNo}',                      '950616', 'inactive', 8, '京东物流（需开通合作）'
  UNION ALL SELECT 'DBL',  '德邦快递', '德邦', 'https://www.deppon.com',     'https://www.deppon.com/tracking/{trackingNo}',                             '95353',  'inactive', 9, '德邦快递（需开通合作）'
) AS src
CROSS JOIN (SELECT DISTINCT tenant_id FROM users WHERE tenant_id IS NOT NULL) AS t
LEFT JOIN logistics_companies AS lc ON lc.tenant_id = t.tenant_id AND lc.code = src.code
WHERE lc.id IS NULL;

-- 2. 为所有现有租户补充缺失的物流API配置
INSERT INTO logistics_api_configs (id, tenant_id, company_code, company_name, api_environment, enabled)
SELECT
  CONCAT('lac-', LOWER(src.company_code), '-', SUBSTRING(UUID(), 1, 8)) AS id,
  t.tenant_id,
  src.company_code, src.company_name, 'production', 1
FROM (
  SELECT 'SF'   AS company_code, '顺丰速运' AS company_name
  UNION ALL SELECT 'ZTO',  '中通快递'
  UNION ALL SELECT 'YTO',  '圆通速递'
  UNION ALL SELECT 'STO',  '申通快递'
  UNION ALL SELECT 'YD',   '韵达速递'
  UNION ALL SELECT 'JTSD', '极兔速递'
  UNION ALL SELECT 'EMS',  '邮政EMS'
  UNION ALL SELECT 'JD',   '京东物流'
  UNION ALL SELECT 'DBL',  '德邦快递'
) AS src
CROSS JOIN (SELECT DISTINCT tenant_id FROM users WHERE tenant_id IS NOT NULL) AS t
LEFT JOIN logistics_api_configs AS lac ON lac.tenant_id = t.tenant_id AND lac.company_code = src.company_code
WHERE lac.id IS NULL;

