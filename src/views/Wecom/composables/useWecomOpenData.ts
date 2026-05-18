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
   * 获取 agentConfig 签名
   */
  const getAgentConfigSignature = async (url: string) => {
    try {
      const res: any = await request.post('/wecom/web-login/agent-config-sign', {
        corpId: wecomCorpId.value,
        url
      })
      return res
    } catch {
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
      // 动态导入 @wecom/jssdk - 解构需要的函数
      const { register, initOpenData, createOpenDataFrameFactory } = await import('@wecom/jssdk')
      wwInstance = { register, initOpenData, createOpenDataFrameFactory }

      // 注册应用
      await register({
        corpId,
        agentId,
        jsApiList: ['selectExternalContact', 'shareAppMessage', 'wwapp.invokeJsApiByCallInfo'],
        async getAgentConfigSignature() {
          const url = window.location.href.split('#')[0]
          const signData = await getAgentConfigSignature(url)
          if (!signData) throw new Error('获取签名失败')
          return {
            timestamp: signData.timestamp,
            nonceStr: signData.nonceStr,
            signature: signData.signature
          }
        }
      })

      // 初始化 OpenData
      await initOpenData()

      // 创建工厂
      openDataFactory = createOpenDataFrameFactory()

      wecomLoginState.value = 'ready'
      return true
    } catch (e: any) {
      console.error('[useWecomOpenData] SDK初始化失败:', e)
      ElMessage.error('企微SDK初始化失败: ' + (e.message || ''))
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
    // 这里需要根据 corpId 查找对应的 agentId
    const configRes: any = await request.get('/wecom/configs', { showError: false } as any)
    const configs = Array.isArray(configRes) ? configRes : []
    const matchConfig = configs.find((c: any) => c.corpId === loginInfo.corpId)

    if (!matchConfig?.agentId) {
      // 如果没有 agentId，尝试从 auth_scope 中获取
      wecomLoginState.value = 'idle'
      ElMessage.warning('未找到该企业的应用配置，请确认企业已授权')
      return false
    }

    // 初始化SDK
    const success = await initWecomSdk(loginInfo.corpId, matchConfig.agentId)
    return success
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
