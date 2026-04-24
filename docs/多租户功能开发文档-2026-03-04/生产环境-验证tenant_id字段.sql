-- ============================================
-- 生产环境多租户改造验证SQL
-- 执行此SQL后，截图结果给开发人员确认
-- ============================================

-- 查询1：检查所有表的 tenant_id 字段
-- 预期结果：应该看到 18 行记录
SELECT 
    TABLE_NAME AS '表名',
    COLUMN_NAME AS '字段名',
    COLUMN_TYPE AS '字段类型',
    IS_NULLABLE AS '允许NULL',
    COLUMN_COMMENT AS '注释'
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'abc789_cn'
    AND COLUMN_NAME = 'tenant_id'
ORDER BY 
    TABLE_NAME;

-- ============================================
-- 预期结果清单（应该有18个表）：
-- ============================================
-- 1. after_sales_services
-- 2. cod_cancel_applications
-- 3. customers
-- 4. departments
-- 5. operation_logs
-- 6. order_items
-- 7. orders
-- 8. outsource_companies
-- 9. permissions
-- 10. product_categories
-- 11. products
-- 12. roles
-- 13. system_configs
-- 14. users
-- 15. value_added_orders
-- 16. value_added_price_config
-- 17. value_added_remark_presets
-- 18. value_added_status_configs
-- ============================================

-- 查询2：检查所有 tenant_id 索引
-- 预期结果：应该看到 18 行记录
SELECT 
    TABLE_NAME AS '表名',
    INDEX_NAME AS '索引名',
    COLUMN_NAME AS '字段名',
    NON_UNIQUE AS '非唯一'
FROM 
    INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = 'abc789_cn'
    AND INDEX_NAME = 'idx_tenant_id'
ORDER BY 
    TABLE_NAME;

-- ============================================
-- 查询3：统计结果（快速检查）
-- 预期结果：字段数=18, 索引数=18
-- ============================================
SELECT 
    '字段统计' AS '检查项',
    COUNT(*) AS '数量',
    '应该是18' AS '预期值'
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = 'abc789_cn'
    AND COLUMN_NAME = 'tenant_id'

UNION ALL

SELECT 
    '索引统计' AS '检查项',
    COUNT(*) AS '数量',
    '应该是18' AS '预期值'
FROM 
    INFORMATION_SCHEMA.STATISTICS
WHERE 
    TABLE_SCHEMA = 'abc789_cn'
    AND INDEX_NAME = 'idx_tenant_id';

-- ============================================
-- 执行说明：
-- 1. 在宝塔面板 phpMyAdmin 中执行此SQL
-- 2. 查看三个查询的结果
-- 3. 截图所有结果
-- 4. 发送给开发人员确认
-- ============================================
