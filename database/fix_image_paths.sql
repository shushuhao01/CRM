-- =============================================
-- 图片路径修复脚本
-- 用途：修复数据库中图片路径格式问题
-- 执行方式：在宝塔面板的phpMyAdmin中执行
-- =============================================

-- 1. 修复系统配置表中的图片路径（去掉/api/v1前缀）
UPDATE system_configs 
SET configValue = REPLACE(configValue, '/api/v1/uploads/', '/uploads/')
WHERE configKey IN ('systemLogo', 'contactQRCode')
  AND configValue LIKE '%/api/v1/uploads/%';

-- 2. 修复商品表中的图片路径
UPDATE products 
SET images = REPLACE(images, '/api/v1/uploads/', '/uploads/')
WHERE images LIKE '%/api/v1/uploads/%';

-- 3. 修复用户头像路径
UPDATE users 
SET avatar = REPLACE(avatar, '/api/v1/uploads/', '/uploads/')
WHERE avatar LIKE '%/api/v1/uploads/%';

-- 4. 修复订单表中的定金截图路径
UPDATE orders 
SET deposit_screenshots = REPLACE(deposit_screenshots, '/api/v1/uploads/', '/uploads/')
WHERE deposit_screenshots LIKE '%/api/v1/uploads/%';

-- 5. 修复售后服务表中的附件路径
UPDATE after_sales_services 
SET attachments = REPLACE(attachments, '/api/v1/uploads/', '/uploads/')
WHERE attachments LIKE '%/api/v1/uploads/%';

-- 6. 查看修复结果
SELECT '系统配置图片' as 类型, COUNT(*) as 数量 
FROM system_configs 
WHERE configKey IN ('systemLogo', 'contactQRCode') AND configValue LIKE '/uploads/%'
UNION ALL
SELECT '商品图片' as 类型, COUNT(*) as 数量 
FROM products 
WHERE images LIKE '%/uploads/%'
UNION ALL
SELECT '用户头像' as 类型, COUNT(*) as 数量 
FROM users 
WHERE avatar LIKE '/uploads/%';

-- 完成提示
SELECT '图片路径修复完成！' as 状态;
