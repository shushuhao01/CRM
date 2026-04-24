-- 创建增值管理状态配置表
CREATE TABLE IF NOT EXISTS `value_added_status_configs` (
  `id` varchar(36) NOT NULL,
  `type` varchar(50) NOT NULL COMMENT '配置类型: validStatus-有效状态, settlementStatus-结算状态',
  `value` varchar(100) NOT NULL COMMENT '状态值',
  `label` varchar(100) NOT NULL COMMENT '状态标签',
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_value` (`type`, `value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='增值管理状态配置表';

-- 插入默认有效状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`) VALUES
(UUID(), 'validStatus', 'pending', '待处理'),
(UUID(), 'validStatus', 'valid', '有效'),
(UUID(), 'validStatus', 'invalid', '无效'),
(UUID(), 'validStatus', 'supplemented', '已补单');

-- 插入默认结算状态配置
INSERT INTO `value_added_status_configs` (`id`, `type`, `value`, `label`) VALUES
(UUID(), 'settlementStatus', 'unsettled', '未结算'),
(UUID(), 'settlementStatus', 'settled', '已结算');
