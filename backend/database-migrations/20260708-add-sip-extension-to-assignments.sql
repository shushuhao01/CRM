-- 号码分配增加SIP话机分机号：与软电话分机号一起在通话管理页展示给员工
ALTER TABLE `user_line_assignments` ADD COLUMN `sip_extension` VARCHAR(20) NULL COMMENT '云联络中心SIP话机分机号' AFTER `agent_extension`;
