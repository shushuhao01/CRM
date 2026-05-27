/**
 * 企微会话展示组件 composable
 * 基于官方文档: https://developer.work.weixin.qq.com/document/path/100050
 *
 * 初始化流程:
 * 1. ww.register({ corpId, agentId, getConfigSignature, getAgentConfigSignature })
 * 2. await ww.initOpenData()
 * 3. factory = ww.createOpenDataFrameFactory()
 * 4. factory.createOpenDataFrame({ el, template, data: { msgList } })
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

// 企微SDK登录状态
const wecomLoginState = ref<'idle' | 'logging' | 'ready' | 'failed'>('idle')
const wecomCorpId = ref('')
const wecomAgentId = ref<number | null>(null)
const initError = ref('')
let openDataFactory: any = null

export function useWecomOpenData() {
  const isWecomReady = computed(() => wecomLoginState.value === 'ready')
  const isWecomFailed = computed(() => wecomLoginState.value === 'failed')

  /**
   * 获取 JS-SDK 签名
   */
  const getJsSdkSign = async (url: string, type: 'config' | 'agent_config') => {
    const res: any = await request.post('/wecom/web-login/agent-config-sign', {
      corpId: wecomCorpId.value,
      url,
      type
    })
    if (!res?.signature) {
      throw new Error(`${type}签名接口返回无效: ${JSON.stringify(res).substring(0, 100)}`)
    }
    return res
  }

  /**
   * 加载企微 JS-SDK（CDN或npm）
   */
  const loadSdk = async (): Promise<{ register: any; initOpenData: any; createOpenDataFrameFactory: any }> => {
    const w = window as any

    // ★ 企微内置浏览器中 window.ww 应该已经存在
    if (w.ww && typeof w.ww.register === 'function') {
      console.log('[WecomSDK] 检测到原生 window.ww 对象')
      return {
        register: w.ww.register.bind(w.ww),
        initOpenData: w.ww.initOpenData?.bind(w.ww),
        createOpenDataFrameFactory: w.ww.createOpenDataFrameFactory?.bind(w.ww)
      }
    }

    // 企微内置浏览器没有 ww 对象时，加载 CDN 脚本
    console.log('[WecomSDK] window.ww 不存在，尝试加载CDN...')
    const cdnUrls = [
      'https://wwcdn.weixin.qq.com/node/open/js/wecom-jssdk-2.4.0.js',
      '/api/v1/wecom/sdk/wecom-jssdk-2.4.0.js'
    ]

    for (const url of cdnUrls) {
      try {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = url
          s.async = true
          const timer = setTimeout(() => reject(new Error('timeout')), 8000)
          s.onload = () => { clearTimeout(timer); resolve() }
          s.onerror = () => { clearTimeout(timer); reject(new Error('load failed')) }
          document.head.appendChild(s)
        })
        // 等待 ww 对象挂载
        await new Promise(r => setTimeout(r, 300))
        if (w.ww && typeof w.ww.register === 'function') {
          console.log(`[WecomSDK] CDN加载成功: ${url}`)
          return {
            register: w.ww.register.bind(w.ww),
            initOpenData: w.ww.initOpenData?.bind(w.ww),
            createOpenDataFrameFactory: w.ww.createOpenDataFrameFactory?.bind(w.ww)
          }
        }
      } catch { /* try next */ }
    }

    // 最后降级使用 npm 包
    console.log('[WecomSDK] CDN失败，尝试 npm @wecom/jssdk...')
    const wwModule = await import('@wecom/jssdk')
    return {
      register: wwModule.register,
      initOpenData: (wwModule as any).initOpenData,
      createOpenDataFrameFactory: (wwModule as any).createOpenDataFrameFactory
    }
  }

  /**
   * 初始化企微SDK
   * 严格按照官方文档流程:
   * 1. register (config + agentConfig)
   * 2. initOpenData
   * 3. createOpenDataFrameFactory
   */
  const initWecomSdk = async (corpId: string, agentId: number, suiteId?: string) => {
    if (wecomLoginState.value === 'ready') return true
    if (wecomLoginState.value === 'logging') return false

    wecomLoginState.value = 'logging'
    wecomCorpId.value = corpId
    wecomAgentId.value = agentId
    initError.value = ''

    try {
      const { register, initOpenData, createOpenDataFrameFactory } = await loadSdk()

      if (typeof register !== 'function') {
        throw new Error('企微JS-SDK不可用: register函数未找到')
      }
      if (typeof createOpenDataFrameFactory !== 'function') {
        throw new Error('企微JS-SDK不可用: createOpenDataFrameFactory函数未找到')
      }

      const currentUrl = window.location.href.split('#')[0]
      console.log(`[WecomSDK] register开始: corpId=${corpId}, agentId=${agentId}, suiteId=${suiteId || '无'}, url=${currentUrl.substring(0, 100)}`)

      // ★ 第1步: ww.register - 初始化应用信息
      await register({
        corpId,
        agentId,
        ...(suiteId ? { suiteId } : {}),
        jsApiList: ['selectExternalContact', 'shareAppMessage', 'wwapp.invokeJsApiByCallInfo'],
        async getConfigSignature(signUrl?: string) {
          const url = signUrl || currentUrl
          console.log('[WecomSDK] getConfigSignature:', url.substring(0, 80))
          const data = await getJsSdkSign(url, 'config')
          return { timestamp: Number(data.timestamp), nonceStr: String(data.nonceStr), signature: String(data.signature) }
        },
        async getAgentConfigSignature(signUrl?: string) {
          const url = signUrl || currentUrl
          console.log('[WecomSDK] getAgentConfigSignature:', url.substring(0, 80))
          const data = await getJsSdkSign(url, 'agent_config')
          return { timestamp: Number(data.timestamp), nonceStr: String(data.nonceStr), signature: String(data.signature) }
        },
        onConfigSuccess() { console.log('[WecomSDK] ✅ config成功') },
        onConfigFail(err: any) { console.error('[WecomSDK] ❌ config失败:', JSON.stringify(err)) },
        onAgentConfigSuccess() { console.log('[WecomSDK] ✅ agentConfig成功') },
        onAgentConfigFail(err: any) { console.error('[WecomSDK] ❌ agentConfig失败:', JSON.stringify(err)) }
      })

      console.log('[WecomSDK] register完成')

      // ★ 第2步: initOpenData - 确保会话组件初始化成功
      if (typeof initOpenData === 'function') {
        console.log('[WecomSDK] 调用 initOpenData...')
        await initOpenData()
        console.log('[WecomSDK] ✅ initOpenData成功')
      } else {
        console.warn('[WecomSDK] initOpenData不可用，跳过（部分版本可能不需要）')
      }

      // ★ 第3步: 创建展示组件工厂
      openDataFactory = createOpenDataFrameFactory()
      if (!openDataFactory) {
        throw new Error('createOpenDataFrameFactory返回空值')
      }

      console.log('[WecomSDK] ✅ SDK初始化完成，工厂对象已创建')
      wecomLoginState.value = 'ready'
      return true
    } catch (e: any) {
      const msg = e?.message || e?.errMsg || JSON.stringify(e)
      initError.value = msg
      wecomLoginState.value = 'failed'
      console.error('[WecomSDK] 初始化失败:', msg, e)
      return false
    }
  }

  /**
   * 从后端配置自动初始化SDK（企微客户端内使用）
   */
  const initFromConfig = async (configId?: number | null) => {
    let config: any = null
    try {
      if (configId) {
        config = await request.get(`/wecom/configs/${configId}`, { showError: false } as any)
      } else {
        const configRes: any = await request.get('/wecom/configs', { showError: false } as any)
        const configs = Array.isArray(configRes) ? configRes : (configRes?.data || configRes?.list || [])
        config = configs.find((c: any) => c.agentId && c.isEnabled) || configs[0]
      }
    } catch (e: any) {
      throw new Error('获取企微配置失败: ' + (e?.message || '网络错误'))
    }

    if (!config?.corpId) {
      throw new Error('企微配置缺少corpId')
    }
    if (!config?.agentId) {
      throw new Error(`企微配置缺少agentId（corpId=${config.corpId}）`)
    }

    console.log(`[WecomSDK] initFromConfig: corpId=${config.corpId}, agentId=${config.agentId}, suiteId=${config.suiteId || '无'}`)
    return await initWecomSdk(config.corpId, config.agentId, config.suiteId || undefined)
  }

  /**
   * 创建消息渲染帧
   * 严格按照官方文档模板使用 ww-open-message 组件
   * 参考: https://developer.work.weixin.qq.com/document/path/100049
   */
  const createMessageFrame = (el: HTMLElement | string, msgList: Array<{ msgid: string; secretKey: string; fromUserName?: string; isSelf?: boolean; timeStr?: string; avatarLetter?: string; avatar?: string; avatarBg?: string; [key: string]: any }>, options?: {
    onError?: (error: any) => void
    onMounted?: () => void
  }) => {
    if (!openDataFactory) {
      console.error('[WecomSDK] 工厂未初始化，无法创建消息帧')
      return null
    }

    console.log(`[WecomSDK] createMessageFrame: el=${typeof el === 'string' ? el : 'HTMLElement'}, msgCount=${msgList.length}`)
    if (msgList.length > 0) {
      const sample = msgList[0]
      console.log(`[WecomSDK] 首条: msgid=${sample.msgid?.slice(0, 30)}, secretKey长度=${sample.secretKey?.length}, secretKey前16=${sample.secretKey?.slice(0, 16)}`)
    }

    try {
      const instance = openDataFactory.createOpenDataFrame({
        el,
        template: `
          <view wx:for="{{data.msgList}}" wx:key="msgid" class="msg {{item.isSelf ? 'R' : 'L'}}" data-index="{{index}}">
            <view class="av">
              <image wx:if="{{item.avatar}}" src="{{item.avatar}}" class="av-img" mode="aspectFill" />
              <view wx:else class="av-fb" style="background:{{item.avatarBg || '#c8c9cc'}}">
                <view class="av-tx">{{item.avatarLetter}}</view>
              </view>
            </view>
            <view class="bd">
              <view class="hd">
                <view class="hd-n">{{item.fromUserName}}</view>
                <view class="hd-t">{{item.timeStr}}</view>
              </view>
              <view wx:if="{{item.msgType === 'text'}}" class="bbl {{item.isSelf ? 'bbl-r' : 'bbl-l'}}">
                <ww-open-message message-id="{{item.msgid}}" secret-key="{{item.secretKey}}" open-type="viewMessage" binderror="onMsgError" />
              </view>
              <view wx:else class="media">
                <ww-open-message message-id="{{item.msgid}}" secret-key="{{item.secretKey}}" open-type="viewMessage" binderror="onMsgError" />
              </view>
            </view>
          </view>
          <view wx:if="{{data.msgList.length === 0}}" class="empty">暂无消息</view>
        `,
        style: `
          .msg{overflow:hidden;margin:0 12px 16px;padding:0}
          .L .av{float:left;margin-right:8px}
          .R .av{float:right;margin-left:8px}
          .av{width:36px;height:36px}
          .av-img{width:36px;height:36px;border-radius:4px}
          .av-fb{width:36px;height:36px;border-radius:4px;text-align:center;line-height:36px;color:#fff;font-size:16px;font-weight:bold}
          .av-tx{width:36px;height:36px;line-height:36px;text-align:center;color:#fff;font-size:16px;font-weight:bold}
          .bd{overflow:hidden}
          .L .bd{margin-right:50px}
          .R .bd{margin-left:50px}
          .hd{padding:0 2px 3px;overflow:hidden}
          .L .hd{text-align:left}
          .R .hd{text-align:right}
          .hd-n{display:inline-block;font-size:12px;color:#333;line-height:20px;max-width:60%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;vertical-align:middle}
          .hd-t{display:inline-block;font-size:11px;color:#888;line-height:20px;margin-left:6px;vertical-align:middle}
          .R .hd-t{margin-left:0;margin-right:6px}
          .bbl{position:relative;display:inline-block;padding:9px 12px;line-height:1.5;font-size:14px;word-break:break-all;max-width:100%;box-sizing:border-box}
          .bbl-l{background:#f4f4f4;border-radius:0 6px 6px 6px;text-align:left}
          .bbl-l:before{content:'';position:absolute;top:10px;left:-6px;border-top:5px solid transparent;border-bottom:5px solid transparent;border-right:6px solid #f4f4f4}
          .bbl-r{background:#95ec69;border-radius:6px 0 6px 6px;text-align:left}
          .bbl-r:after{content:'';position:absolute;top:10px;right:-6px;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:6px solid #95ec69}
          .L .bbl{float:left}
          .R .bbl{float:right}
          .media{overflow:hidden;border-radius:4px;max-width:100%}
          .L .media{float:left}
          .R .media{float:right}
          .empty{text-align:center;color:#999;padding:60px 0;font-size:14px}
        `,
        data: { msgList },
        methods: {
          onMsgError(event: any) {
            console.warn('[WecomSDK] ww-open-message binderror:', JSON.stringify(event?.detail || event))
            options?.onError?.(event)
          }
        },
        handleModal(event: any) {
          // 企微内置浏览器：不阻止默认行为，让SDK自动打开新窗口预览
          // 外部浏览器：创建 iframe 弹窗预览
          const isWecomBrowser = /wxwork|WeCom/i.test(navigator.userAgent)
          if (isWecomBrowser) {
            return true // 使用默认行为
          }
          const iframe = document.createElement('iframe')
          iframe.src = event.modalUrl
          const w = event.modalSize?.width || 800
          const h = event.modalSize?.height || 600
          iframe.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:${Math.min(w, window.innerWidth * 0.9)}px;height:${Math.min(h, window.innerHeight * 0.85)}px;z-index:9999;border:none;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.3);`
          const mask = document.createElement('div')
          mask.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9998;cursor:pointer;'
          mask.onclick = () => { document.body.removeChild(iframe); document.body.removeChild(mask) }
          document.body.appendChild(mask)
          document.body.appendChild(iframe)
          return false
        },
        handleMounted() {
          console.log('[WecomSDK] ✅ 消息帧挂载成功')
          options?.onMounted?.()
        },
        error(error: any) {
          console.error('[WecomSDK] 消息帧错误:', error)
          const errCode = error?.detail?.errCode
          if (errCode === 42006 || errCode === 42003 || errCode === 40029) {
            initError.value = '登录态已过期，请刷新页面'
            wecomLoginState.value = 'failed'
            ElMessage.warning('企微登录态已过期，请刷新页面重试')
          }
          options?.onError?.(error)
        }
      })

      return instance
    } catch (e: any) {
      console.error('[WecomSDK] createOpenDataFrame异常:', e)
      options?.onError?.(e)
      return null
    }
  }

  /**
   * 更新消息帧数据
   */
  const updateFrameData = (instance: any, msgList: Array<{ msgid: string; secretKey: string; [key: string]: any }>) => {
    if (instance) {
      instance.setData({ msgList })
    }
  }

  /**
   * 重置状态（允许重新初始化）
   */
  const resetWecomState = () => {
    wecomLoginState.value = 'idle'
    wecomCorpId.value = ''
    wecomAgentId.value = null
    initError.value = ''
    openDataFactory = null
  }

  return {
    wecomLoginState,
    isWecomReady,
    isWecomFailed,
    initError,
    wecomCorpId,
    wecomAgentId,
    initWecomSdk,
    initFromConfig,
    createMessageFrame,
    updateFrameData,
    resetWecomState
  }
}
