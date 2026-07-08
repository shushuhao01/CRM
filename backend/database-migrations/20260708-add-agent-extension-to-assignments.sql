-- 号码分配增加坐席分机号：绑定云联络中心坐席后自动获取，用于前端展示员工自己的分机号
ALTER TABLE `user_line_assignments` ADD COLUMN `agent_extension` VARCHAR(20) NULL COMMENT '云联络中心坐席分机号（软电话分机号）' AFTER `ccc_user_id`;
