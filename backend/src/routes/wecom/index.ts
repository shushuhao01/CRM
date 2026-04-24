/**
 * 企业微信管理路由 - 模块入口
 *
 * 从单文件(2875行)拆分为目录结构，按功能模块组织：
 * - callback.ts      回调处理(验证+事件接收)
 * - config.ts         企微配置管理(CRUD+测试+通讯录)
 * - binding.ts        成员绑定管理
 * - customer.ts       客户管理(列表+统计+同步+关联)
 * - acquisition.ts    获客助手(链接CRUD+统计)
 * - service.ts        微信客服(账号CRUD+同步)
 * - payment.ts        对外收款(列表+同步)
 * - chatArchive.ts    会话存档(状态+记录+同步+质检+VAS)
 * - sensitiveWords.ts 敏感词管理
 * - sidebar.ts        侧边栏(应用管理+客户详情+JS-SDK)
 * - customerGroup.ts  客户群管理(列表+详情+统计+同步) [V2.0新增]
 * - qualityInspection.ts 质检规则+质检记录 [V2.0新增]
 * - archiveSettings.ts   会话存档设置 [V2.0新增]
 * - wecomHelpers.ts   共享工具函数
 *
 * V4.0 新增模块:
 * - contactWay.ts     活码管理(CRUD+企微API对接)
 * - aiAssistant.ts    AI助手(模型+智能体+日志)
 * - addressBook.ts    通讯录与绑定(组织架构+部门映射+同步)
 * - autoMatch.ts      自动匹配(企微客户↔CRM客户)
 * - groupTemplate.ts  群模板管理
 * - aiInspect.ts      AI质检(策略+分析结果)
 * - timeline.ts       会话轨迹(客户事件时间线)
 * - groupWelcome.ts   入群欢迎语管理
 * - groupBroadcast.ts 群发消息管理
 * - antiSpamRule.ts   防骚扰规则管理
 *
 * V5.0 H5独立应用模块:
 * - h5-auth.ts        H5鉴权(登录/绑定/JS-SDK签名)
 * - h5-app.ts         H5工作台(首页/客户/统计)
 */
import { Router } from 'express';
import callbackRouter from './callback';
import configRouter from './config';
import bindingRouter from './binding';
import customerRouter from './customer';
import customerGroupRouter from './customerGroup';
import acquisitionRouter from './acquisition';
import serviceRouter from './service';
import paymentRouter from './payment';
import chatArchiveRouter from './chatArchive';
import sensitiveWordsRouter from './sensitiveWords';
import sensitiveWordGroupsRouter from './sensitiveWordGroups';
import sidebarRouter from './sidebar';
import qualityInspectionRouter from './qualityInspection';
import archiveSettingsRouter from './archiveSettings';
import seatManagementRouter from './seatManagement';
// V4.0 新增路由
import contactWayRouter from './contactWay';
import aiAssistantRouter from './aiAssistant';
import addressBookRouter from './addressBook';
import autoMatchRouter from './autoMatch';
import groupTemplateRouter from './groupTemplate';
import aiInspectRouter from './aiInspect';
import timelineRouter from './timeline';
import scriptsRouter from './scripts';
import suiteCallbackRouter from './suite-callback';
import pricingRouter from './pricing';
import groupWelcomeRouter from './groupWelcome';
import groupBroadcastRouter from './groupBroadcast';
import antiSpamRuleRouter from './antiSpamRule';
// V5.0 H5独立应用路由
import h5AuthRouter from './h5-auth';
import h5AppRouter from './h5-app';

const router = Router();

// 注册各子模块路由
router.use('/', callbackRouter);
router.use('/suite', suiteCallbackRouter);
router.use('/', configRouter);
router.use('/', bindingRouter);
router.use('/', customerRouter);
router.use('/', customerGroupRouter);
router.use('/', acquisitionRouter);
router.use('/', serviceRouter);
router.use('/', paymentRouter);
router.use('/', chatArchiveRouter);
router.use('/', sensitiveWordsRouter);
router.use('/', sensitiveWordGroupsRouter);
router.use('/', sidebarRouter);
router.use('/', qualityInspectionRouter);
router.use('/', archiveSettingsRouter);
router.use('/', seatManagementRouter);
// V4.0 新增路由注册
router.use('/', contactWayRouter);
router.use('/', aiAssistantRouter);
router.use('/', addressBookRouter);
router.use('/', autoMatchRouter);
router.use('/', groupTemplateRouter);
router.use('/', aiInspectRouter);
router.use('/', timelineRouter);
router.use('/', scriptsRouter);
router.use('/', pricingRouter);
router.use('/', groupWelcomeRouter);
router.use('/', groupBroadcastRouter);
router.use('/', antiSpamRuleRouter);
// V5.0 H5独立应用路由注册
router.use('/h5', h5AuthRouter);
router.use('/h5/app', h5AppRouter);

export default router;

