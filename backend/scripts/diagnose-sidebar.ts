/**
 * 企微侧边栏 agentConfig 诊断脚本
 *
 * 使用方法（在服务器 backend 目录下执行）：
 *   npx ts-node scripts/diagnose-sidebar.ts
 *
 * 或者在开发环境：
 *   npx tsx scripts/diagnose-sidebar.ts
 */
import 'dotenv/config';

async function diagnose() {
  console.log('========================================');
  console.log('  企微侧边栏 agentConfig 诊断工具');
  console.log('========================================\n');

  // 1. 连接数据库
  const { AppDataSource } = await import('../src/config/database');
  await AppDataSource.initialize();
  console.log('✅ 数据库连接成功\n');

  // 2. 查询企微配置
  const { WecomConfig } = await import('../src/entities/WecomConfig');
  const configRepo = AppDataSource.getRepository(WecomConfig);
  const configs = await configRepo.find({ where: { isEnabled: true } });

  console.log(`📋 找到 ${configs.length} 个已启用的企微配置:\n`);
  for (const cfg of configs) {
    console.log(`  [ID=${cfg.id}] ${cfg.name}`);
    console.log(`    corpId: ${cfg.corpId}`);
    console.log(`    agentId: ${cfg.agentId || '❌ 未配置'}`);
    console.log(`    authType: ${cfg.authType}`);
    console.log(`    suiteId: ${cfg.suiteId || '(空)'}`);
    console.log(`    permanentCode: ${cfg.permanentCode ? '✅ 已配置' : '❌ 未配置'}`);
    console.log(`    authScope: ${cfg.authScope ? '已存储' : '(空)'}`);
    console.log('');
  }

  // 3. 针对第三方应用配置进行深度诊断
  const thirdPartyConfigs = configs.filter(c => c.authType === 'third_party');
  if (thirdPartyConfigs.length === 0) {
    console.log('⚠️ 没有找到第三方应用配置');
    await AppDataSource.destroy();
    return;
  }

  for (const cfg of thirdPartyConfigs) {
    console.log(`\n🔍 深度诊断: [ID=${cfg.id}] ${cfg.name} (corpId=${cfg.corpId})`);
    console.log('─'.repeat(60));

    // 3.1 检查 suite_ticket
    console.log('\n📌 步骤1: 检查 suite_ticket...');
    try {
      const suiteRows = await AppDataSource.query(
        'SELECT suite_id, suite_ticket, updated_at FROM wecom_suite_configs WHERE suite_id = ? LIMIT 1',
        [cfg.suiteId]
      );
      if (suiteRows.length > 0) {
        const row = suiteRows[0];
        console.log(`  suite_id: ${row.suite_id}`);
        console.log(`  suite_ticket: ${row.suite_ticket ? '✅ 已存储 (前20位: ' + row.suite_ticket.substring(0, 20) + '...)' : '❌ 为空'}`);
        console.log(`  updated_at: ${row.updated_at}`);
      } else {
        console.log(`  ❌ wecom_suite_configs 表中未找到 suite_id=${cfg.suiteId} 的记录`);
      }
    } catch (e: any) {
      console.log(`  ⚠️ 查询失败: ${e.message}`);
    }

    // 3.2 尝试获取 access_token
    console.log('\n📌 步骤2: 获取 access_token...');
    let accessToken = '';
    try {
      const { WecomTokenService } = await import('../src/services/wecom/WecomTokenService');
      accessToken = await WecomTokenService.getAccessToken(cfg);
      console.log(`  ✅ access_token 获取成功 (前20位: ${accessToken.substring(0, 20)}...)`);
    } catch (e: any) {
      console.log(`  ❌ access_token 获取失败: ${e.message}`);
      continue;
    }

    // 3.3 验证 access_token 对应的企业和应用
    console.log('\n📌 步骤3: 验证 token 对应的应用信息...');
    try {
      const axios = (await import('axios')).default;
      const agentRes = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/agent/get`, {
        params: { access_token: accessToken, agentid: cfg.agentId || 0 }
      });
      if (agentRes.data.errcode === 0) {
        console.log(`  ✅ 应用验证成功:`);
        console.log(`    应用名称: ${agentRes.data.name}`);
        console.log(`    agentid: ${agentRes.data.agentid}`);
        console.log(`    描述: ${agentRes.data.description || '(无)'}`);
        console.log(`    可信域名: ${JSON.stringify(agentRes.data.redirect_domain || agentRes.data.home_url || '(未返回)')}`);
      } else {
        console.log(`  ❌ 应用验证失败: errcode=${agentRes.data.errcode}, errmsg=${agentRes.data.errmsg}`);
        if (agentRes.data.errcode === 301002) {
          console.log(`  💡 提示: AgentID=${cfg.agentId} 不存在，请通过 get_auth_info 获取正确的 AgentID`);
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️ 验证请求失败: ${e.message}`);
    }

    // 3.4 通过 get_auth_info 获取正确的 AgentID
    console.log('\n📌 步骤4: 通过 get_auth_info 获取授权信息（含正确的 AgentID）...');
    try {
      const { WecomTokenService } = await import('../src/services/wecom/WecomTokenService');
      const suiteToken = await WecomTokenService.getSuiteAccessToken(cfg.suiteId || '');
      const axios = (await import('axios')).default;
      const authInfoRes = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${suiteToken}`,
        { auth_corpid: cfg.corpId, permanent_code: cfg.permanentCode }
      );
      if (authInfoRes.data.errcode === 0 || !authInfoRes.data.errcode) {
        const authInfo = authInfoRes.data.auth_info;
        const agents = authInfo?.agent || [];
        console.log(`  ✅ get_auth_info 成功:`);
        console.log(`    授权企业: ${authInfoRes.data.auth_corp_info?.corp_name || '(未返回)'}`);
        console.log(`    授权应用数: ${agents.length}`);
        for (const agent of agents) {
          console.log(`    → agentid=${agent.agentid}, name=${agent.name}, privilege=${JSON.stringify(agent.privilege || {}).substring(0, 100)}`);
        }
        const correctAgentId = agents[0]?.agentid;
        if (correctAgentId && correctAgentId !== cfg.agentId) {
          console.log(`\n  ⚠️ AgentID 不一致！数据库=${cfg.agentId}, 企微实际=${correctAgentId}`);
          console.log(`  💡 建议执行: UPDATE wecom_configs SET agent_id = ${correctAgentId} WHERE id = ${cfg.id};`);
        } else if (correctAgentId === cfg.agentId) {
          console.log(`\n  ✅ AgentID 一致: ${cfg.agentId}`);
        }
      } else {
        console.log(`  ❌ get_auth_info 失败: errcode=${authInfoRes.data.errcode}, errmsg=${authInfoRes.data.errmsg}`);
      }
    } catch (e: any) {
      console.log(`  ⚠️ get_auth_info 请求失败: ${e.message}`);
    }

    // 3.5 获取 agent_ticket
    console.log('\n📌 步骤5: 获取 agent_ticket (agentConfig签名所需)...');
    try {
      const axios = (await import('axios')).default;
      const ticketRes = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/ticket/get`, {
        params: { access_token: accessToken, type: 'agent_config' }
      });
      if (ticketRes.data.errcode === 0) {
        console.log(`  ✅ agent_ticket 获取成功 (前20位: ${ticketRes.data.ticket.substring(0, 20)}...)`);
        console.log(`    有效期: ${ticketRes.data.expires_in}s`);
      } else {
        console.log(`  ❌ agent_ticket 获取失败: errcode=${ticketRes.data.errcode}, errmsg=${ticketRes.data.errmsg}`);
        if (ticketRes.data.errcode === 40014) {
          console.log(`  💡 提示: access_token 无效，可能已过期或不属于该企业`);
        }
      }
    } catch (e: any) {
      console.log(`  ⚠️ agent_ticket 请求失败: ${e.message}`);
    }

    // 3.6 模拟签名验证
    console.log('\n📌 步骤6: 可信域名检查提示...');
    console.log(`  当前侧边栏域名: crm.yunkes.com`);
    console.log(`  ⚠️ 对于第三方应用，可信域名需要在【服务商后台】配置：`);
    console.log(`    1. 登录 https://open.work.weixin.qq.com`);
    console.log(`    2. 应用管理 → 选择你的应用`);
    console.log(`    3. 开发配置 → 可信域名 → 添加 crm.yunkes.com`);
    console.log(`    4. 需要在域名根目录放置验证文件`);
    console.log(`\n  ⚠️ 同时检查【聊天工具栏】配置：`);
    console.log(`    服务商后台 → 应用管理 → 聊天工具栏 → 页面URL`);
    console.log(`    应填写: https://crm.yunkes.com/wecom-sidebar?corpId=$CORPID$`);
  }

  console.log('\n\n========================================');
  console.log('  诊断完成');
  console.log('========================================');
  await AppDataSource.destroy();
}

diagnose().catch(e => {
  console.error('诊断脚本执行失败:', e);
  process.exit(1);
});
