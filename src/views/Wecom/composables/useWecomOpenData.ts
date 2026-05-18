/**
 * 企微会话展示组件 composable
 * 封装 @wecom/jssdk 的初始化、登录态管理、OpenDataFrame 工厂
 *
 * 使用方式：
 * 1. 页面引入 useWecomOpenData()
 * 2. 调用 initWecomSdk() 初始化
 * 3. 检查 isWecomReady 状态
 * 4. 使用 createMessageFrame() 渲染消息
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

// 企微SDK登录状态
const wecomLoginState = ref<'idle' | 'logging' | 'ready' | 'expired'>('idle')
const wecomCorpId = ref('')
const wecomAgentId = ref<number | null>(null)
const wecomUserId = ref('')
const wecomUserName = ref('')
let wwInstance: any = null
let openDataFactory: any = null

export function useWecomOpenData() {
  const isWecomReady = computed(() => wecomLoginState.value === 'ready')
  const isWecomLogging = computed(() => wecomLoginState.value === 'logging')
  const needWecomLogin = computed(() => wecomLoginState.value === 'idle' || wecomLoginState.value === 'expired')

  /**
   * 获取Web登录配置（suiteId等）
   */
  const getLoginConfig = async () => {
    try {
      const res: any = await request.get('/wecom/web-login/config', { showError: false } as any)
      // request 工具自动解包 response.data.data，所以 res 就是 { appId, redirectDomain, loginType }
      return res || null
    } catch {
      return null
    }
  }

  /**
   * 用 auth_code 换取用户身份
   */
  const getLoginInfo = async (authCode: string) => {
    try {
      const res: any = await request.post('/wecom/web-login/get-login-info', { authCode })
      return res
    } catch {
      return null
    }
  }

  /**
   * 获取 JS-SDK 签名（支持 config 和 agent_config 两种类型）
   */
  const getJsSdkSign = async (url: string, type: 'config' | 'agent_config') => {
    try {
      const res: any = await request.post('/wecom/web-login/agent-config-sign', {
        corpId: wecomCorpId.value,
        url,
        type
      })
      return res
    } catch (e: any) {
      console.error(`[useWecomOpenData] 获取${type}签名失败:`, e?.message || e)
      return null
    }
  }

  /**
   * 初始化企微SDK（ww.register + ww.initOpenData）
   * 需要在企微扫码登录成功后调用
   */
  const initWecomSdk = async (corpId: string, agentId: number) => {
    wecomCorpId.value = corpId
    wecomAgentId.value = agentId

    try {
      // 动态导入 @wecom/jssdk
      const wwModule = await import('@wecom/jssdk')
      const register = wwModule.register
      const initOpenData = wwModule.initOpenData
      const createOpenDataFrameFactory = wwModule.createOpenDataFrameFactory

      if (typeof register !== 'function') {
        throw new Error(`register 不是函数，类型: ${typeof register}，模块keys: ${Object.keys(wwModule).slice(0, 10).join(',')}`)
      }

      wwInstance = { register, initOpenData, createOpenDataFrameFactory }

      // ★ 注册应用（第三方应用需要同时提供 getConfigSignature 和 getAgentConfigSignature）
      // 注意：@wecom/jssdk v2.4.0 中 register() 返回 ≠ agentConfig 完成
      // agentConfig 是惰性触发的，会在首次调用需要 agent 权限的 API（如 initOpenData）时触发
      console.log(`[useWecomOpenData] ww.register 开始: corpId=${corpId}, agentId=${agentId}, url=${window.location.href.split('#')[0].substring(0, 80)}`)
      await register({
        corpId,
        agentId,
        jsApiList: ['selectExternalContact', 'shareAppMessage', 'wwapp.invokeJsApiByCallInfo'],
        async getConfigSignature(signUrl?: string) {
          // ★ 必须使用 SDK 传入的 url（SDK内部会规范化），否则签名验证失败
          const url = signUrl || window.location.href.split('#')[0]
          console.log('[useWecomOpenData] getConfigSignature called, url:', url.substring(0, 100))
          const signData = await getJsSdkSign(url, 'config')
          if (!signData) throw new Error('获取config签名失败')
          return {
            timestamp: Number(signData.timestamp),
            nonceStr: String(signData.nonceStr),
            signature: String(signData.signature)
          }
        },
        async getAgentConfigSignature(signUrl?: string) {
          // ★ 必须使用 SDK 传入的 url（SDK内部会规范化），否则签名验证失败
          const url = signUrl || window.location.href.split('#')[0]
          console.log('[useWecomOpenData] getAgentConfigSignature called, url:', url.substring(0, 100))
          const signData = await getJsSdkSign(url, 'agent_config')
          if (!signData) throw new Error('获取agent_config签名失败')
          console.log('[useWecomOpenData] getAgentConfigSignature 签名数据:', JSON.stringify({
            timestamp: signData.timestamp,
            nonceStr: signData.nonceStr,
            sigPrefix: String(signData.signature).substring(0, 16),
            agentId: signData.agentId
          }))
          return {
            timestamp: Number(signData.timestamp),
            nonceStr: String(signData.nonceStr),
            signature: String(signData.signature)
          }
        },
        onConfigSuccess(res: any) {
          console.log('[useWecomOpenData] ✅ onConfigSuccess:', JSON.stringify(res))
        },
        onConfigFail(res: any) {
          console.error('[useWecomOpenData] ❌ onConfigFail:', JSON.stringify(res))
        },
        onAgentConfigSuccess(res: any) {
          console.log('[useWecomOpenData] ✅ onAgentConfigSuccess:', JSON.stringify(res))
        },
        onAgentConfigFail(res: any) {
          console.error('[useWecomOpenData] ❌ onAgentConfigFail:', JSON.stringify(res))
        }
      })

      console.log('[useWecomOpenData] ww.register 返回成功（config阶段通过）')

      // ★ 初始化 OpenData（会触发 agentConfig 惰性签名）
      console.log('[useWecomOpenData] 调用 initOpenData()...')
      await initOpenData()
      console.log('[useWecomOpenData] ✅ initOpenData 成功')

      // 创建工厂
      openDataFactory = createOpenDataFrameFactory()

      wecomLoginState.value = 'ready'
      console.log('[useWecomOpenData] ✅ SDK初始化完成')
      return true
    } catch (e: any) {
      const errMsg = e?.message || e?.errMsg || (typeof e === 'string' ? e : JSON.stringify(e))
      console.error('[useWecomOpenData] SDK初始化失败:', errMsg, e)
      ElMessage.error('企微SDK初始化失败: ' + errMsg)
      wecomLoginState.value = 'expired'
      return false
    }
  }

  /**
   * 处理企微扫码登录成功
   */
  const handleLoginSuccess = async (code: string) => {
    wecomLoginState.value = 'logging'
    const loginInfo = await getLoginInfo(code)
    if (!loginInfo) {
      wecomLoginState.value = 'idle'
      ElMessage.error('企微登录失败')
      return false
    }

    wecomCorpId.value = loginInfo.corpId
    wecomUserId.value = loginInfo.openUserId || loginInfo.userId
    wecomUserName.value = loginInfo.userName

    // 获取 agentId（从后端配置中获取）
    try {
      const configRes: any = await request.get('/wecom/configs', { showError: false } as any)
      const configs = Array.isArray(configRes) ? configRes : (configRes?.list || [])
      const matchConfig = configs.find((c: any) => c.corpId === loginInfo.corpId)

      if (matchConfig?.agentId) {
        // 初始化SDK
        const success = await initWecomSdk(loginInfo.corpId, matchConfig.agentId)
        return success
      }
    } catch (e: any) {
      console.warn('[useWecomOpenData] 获取企业配置失败:', e.message)
    }

    // 如果没有 agentId，仍然标记为 ready（降级为气泡模式）
    wecomLoginState.value = 'ready'
    ElMessage.success('企微登录成功（降级模式）')
    return true
  }

  /**
   * 创建消息渲染帧
   * @param el 容器元素
   * @param msgList 消息列表 [{msgid, secretKey}]
   */
  const createMessageFrame = (el: HTMLElement | string, msgList: Array<{msgid: string; secretKey: string}>, options?: {
    onError?: (error: any) => void
    onMounted?: () => void
    onModal?: (event: any) => boolean
  }) => {
    if (!openDataFactory) {
      console.warn('[useWecomOpenData] OpenData工厂未初始化')
      return null
    }

    const instance = openDataFactory.createOpenDataFrame({
      el,
      template: `
        <scroll-view scroll-y="{{true}}" class="msg-scroll-view" bindscrolltoupper="onScrollTop">
          <view wx:for="{{data.msgList}}" wx:key="msgid" class="msg-item">
            <ww-open-message
              message-id="{{item.msgid}}"
              secret-key="{{item.secretKey}}"
              open-type="viewMessage"
              binderror="onMsgError"
            />
          </view>
          <view wx:if="{{data.msgList.length === 0}}" class="empty-tip">
            暂无消息
          </view>
        </scroll-view>
      `,
      style: `
        .msg-scroll-view {
          height: 100%;
          overflow: auto;
          padding: 12px;
        }
        .msg-item {
          margin-bottom: 8px;
        }
        .empty-tip {
          text-align: center;
          color: #909399;
          padding: 40px 0;
          font-size: 14px;
        }
      `,
      data: { msgList },
      methods: {
        onScrollTop() {
          // 滚动到顶部，可触发加载更多历史消息
        },
        onMsgError(event: any) {
          console.warn('[WecomOpenData] 消息渲染错误:', event)
          options?.onError?.(event)
        }
      },
      handleModal(event: any) {
        if (options?.onModal) {
          return options.onModal(event)
        }
        // 默认：创建 iframe 预览
        const iframe = document.createElement('iframe')
        iframe.src = event.modalUrl
        iframe.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:80vw;height:80vh;z-index:9999;border:none;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);'
        const mask = document.createElement('div')
        mask.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9998;'
        mask.onclick = () => { document.body.removeChild(iframe); document.body.removeChild(mask) }
        document.body.appendChild(mask)
        document.body.appendChild(iframe)
        return false // 阻止默认行为
      },
      handleMounted() {
        options?.onMounted?.()
      },
      error(error: any) {
        console.error('[WecomOpenData] Frame error:', error)
        // 检查是否是登录态过期
        if (error?.detail?.errCode === 42006 || error?.detail?.errCode === 42003 || error?.detail?.errCode === 40029) {
          wecomLoginState.value = 'expired'
          ElMessage.warning('企微登录态已过期，请重新扫码登录')
        }
        options?.onError?.(error)
      }
    })

    return instance
  }

  /**
   * 更新消息帧数据
   */
  const updateFrameData = (instance: any, msgList: Array<{msgid: string; secretKey: string}>) => {
    if (instance) {
      instance.setData({ msgList })
    }
  }

  /**
   * 重置状态（退出登录）
   */
  const resetWecomState = () => {
    wecomLoginState.value = 'idle'
    wecomCorpId.value = ''
    wecomAgentId.value = null
    wecomUserId.value = ''
    wecomUserName.value = ''
    wwInstance = null
    openDataFactory = null
  }

  return {
    // 状态
    wecomLoginState,
    isWecomReady,
    isWecomLogging,
    needWecomLogin,
    wecomCorpId,
    wecomAgentId,
    wecomUserId,
    wecomUserName,
    // 方法
    getLoginConfig,
    getLoginInfo,
    initWecomSdk,
    handleLoginSuccess,
    createMessageFrame,
    updateFrameData,
    resetWecomState
  }
}
