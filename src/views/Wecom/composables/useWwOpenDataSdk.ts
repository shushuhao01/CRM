/**
 * 企微通讯录展示组件 SDK 初始化
 * 用于 ww-open-data 元素展示部门名称和成员姓名
 * 参考文档: https://developer.work.weixin.qq.com/document/path/91958
 *
 * 在企业微信客户端内：加载 jwxwork-1.0.0.js 后 WWOpenData 直接可用
 * 在外部浏览器：需要先完成 wx.config + wx.agentConfig 后才能使用
 */
import { ref, computed } from 'vue'
import request from '@/utils/request'

const sdkState = ref<'idle' | 'loading' | 'ready' | 'failed'>('idle')
const errorMsg = ref('')
let currentInitCorpId = ''

let initPromise: Promise<boolean> | null = null

export function useWwOpenDataSdk() {
  const isReady = computed(() => sdkState.value === 'ready')
  const isFailed = computed(() => sdkState.value === 'failed')

  const loadScript = (src: string, timeout = 8000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`)
      if (existing) { resolve(); return }
      const s = document.createElement('script')
      s.src = src
      s.async = true
      const timer = setTimeout(() => { s.remove(); reject(new Error('timeout')) }, timeout)
      s.onload = () => { clearTimeout(timer); resolve() }
      s.onerror = () => { clearTimeout(timer); s.remove(); reject(new Error('load failed')) }
      document.head.appendChild(s)
    })
  }

  const isInWecomBrowser = () => /wxwork|WeCom|MicroMessenger/i.test(navigator.userAgent)

  /**
   * 初始化 WWOpenData SDK
   * @param corpId 企业corpId
   * @param agentId 应用agentId (外部浏览器需要)
   */
  const initSdk = async (corpId: string, agentId?: number | string): Promise<boolean> => {
    // 如果 corpId 变化了，需要重新初始化（切换主体）
    if (currentInitCorpId && currentInitCorpId !== corpId) {
      sdkState.value = 'idle'
      initPromise = null
      currentInitCorpId = ''
    }
    if (sdkState.value === 'ready') return true
    if (initPromise) return initPromise

    currentInitCorpId = corpId
    initPromise = _doInit(corpId, agentId).catch(() => {
      initPromise = null
      return false
    })
    return initPromise
  }

  const _doInit = async (corpId: string, agentId?: number | string): Promise<boolean> => {
    sdkState.value = 'loading'
    errorMsg.value = ''

    try {
      const w = window as any

      // 在企微客户端内，WWOpenData 通常已经可用
      if (w.WWOpenData && typeof w.WWOpenData.bind === 'function') {
        console.log('[WwOpenDataSdk] WWOpenData 已直接可用')
        sdkState.value = 'ready'
        return true
      }

      // 1. 加载 jweixin（wx对象，用于外部浏览器认证）
      if (!w.wx || typeof w.wx.config !== 'function') {
        const jweixinUrls = [
          'https://res.wx.qq.com/open/js/jweixin-1.2.0.js',
          '/api/v1/wecom/sdk/jweixin-1.2.0.js'
        ]
        for (const url of jweixinUrls) {
          try {
            await loadScript(url)
            await new Promise(r => setTimeout(r, 200))
            if (w.wx && typeof w.wx.config === 'function') break
          } catch { /* try next */ }
        }
      }

      // 2. 加载 jwxwork（提供 WWOpenData 对象）
      if (!w.WWOpenData) {
        const jwxworkUrls = [
          'https://open.work.weixin.qq.com/wwopen/js/jwxwork-1.0.0.js',
          '/api/v1/wecom/sdk/jwxwork-1.0.0.js'
        ]
        for (const url of jwxworkUrls) {
          try {
            await loadScript(url)
            await new Promise(r => setTimeout(r, 300))
            if (w.WWOpenData && typeof w.WWOpenData.bind === 'function') break
          } catch { /* try next */ }
        }
      }

      // 3. 检查 WWOpenData 是否可用
      if (w.WWOpenData && typeof w.WWOpenData.bind === 'function') {
        console.log('[WwOpenDataSdk] WWOpenData SDK已加载')

        // 在企微客户端内直接可用
        if (isInWecomBrowser()) {
          sdkState.value = 'ready'
          return true
        }

        // 外部浏览器：先尝试 wx.config + wx.agentConfig（官方推荐方式）
        if (agentId && w.wx && typeof w.wx.config === 'function') {
          try {
            await doWxConfig(corpId, agentId)
            console.log('[WwOpenDataSdk] ✅ wx.config + agentConfig 成功')
            sdkState.value = 'ready'
            return true
          } catch (e: any) {
            console.warn('[WwOpenDataSdk] wx.config/agentConfig失败:', e.message)
          }
        }

        // 外部浏览器：尝试新版 ww.register
        if (w.ww && typeof w.ww.register === 'function' && agentId) {
          try {
            await doWwRegister(w.ww, corpId, Number(agentId))
            console.log('[WwOpenDataSdk] ✅ ww.register 成功')
            sdkState.value = 'ready'
            return true
          } catch (e: any) {
            console.warn('[WwOpenDataSdk] ww.register失败:', e.message)
          }
        }

        // WWOpenData 对象存在 - 尝试直接标记为 ready（某些环境可能不需要认证）
        sdkState.value = 'ready'
        return true
      }

      // 4. 加载新版 wecom-jssdk 作为最后手段
      if (!w.ww || typeof w.ww.register !== 'function') {
        const sdkUrls = [
          'https://wwcdn.weixin.qq.com/node/open/js/wecom-jssdk-2.4.0.js',
          '/api/v1/wecom/sdk/wecom-jssdk-2.4.0.js'
        ]
        for (const url of sdkUrls) {
          try {
            await loadScript(url)
            await new Promise(r => setTimeout(r, 300))
            if (w.ww && typeof w.ww.register === 'function') break
          } catch { /* try next */ }
        }
      }

      if (w.ww && typeof w.ww.register === 'function' && agentId) {
        try {
          await doWwRegister(w.ww, corpId, Number(agentId))
          // register 成功后再次检查 WWOpenData
          if (w.WWOpenData && typeof w.WWOpenData.bind === 'function') {
            sdkState.value = 'ready'
            return true
          }
        } catch (e: any) {
          console.warn('[WwOpenDataSdk] 新版SDK也失败:', e.message)
        }
      }

      errorMsg.value = 'WWOpenData 组件不可用（可能需要在企业微信客户端中访问）'
      sdkState.value = 'failed'
      return false
    } catch (e: any) {
      errorMsg.value = e.message || '未知错误'
      sdkState.value = 'failed'
      return false
    }
  }

  const doWxConfig = async (corpId: string, agentId: number | string) => {
    const w = window as any
    const currentUrl = window.location.href.split('#')[0]

    // 获取 config 签名
    const configSign: any = await request.post('/wecom/web-login/agent-config-sign', {
      corpId, url: currentUrl, type: 'config'
    })
    if (!configSign?.signature) throw new Error('config签名无效')

    await new Promise<void>((resolve, reject) => {
      w.wx.config({
        beta: true,
        debug: false,
        appId: corpId,
        timestamp: configSign.timestamp,
        nonceStr: configSign.nonceStr,
        signature: configSign.signature,
        jsApiList: ['agentConfig']
      })
      w.wx.ready(() => resolve())
      w.wx.error((err: any) => reject(new Error(`wx.config失败: ${JSON.stringify(err)}`)))
      setTimeout(() => resolve(), 3000)
    })

    // 获取 agentConfig 签名
    const agentSign: any = await request.post('/wecom/web-login/agent-config-sign', {
      corpId, url: currentUrl, type: 'agent_config'
    })
    if (!agentSign?.signature) throw new Error('agentConfig签名无效')

    await new Promise<void>((resolve, reject) => {
      w.wx.agentConfig({
        corpid: corpId,
        agentid: Number(agentId),
        timestamp: agentSign.timestamp,
        nonceStr: agentSign.nonceStr,
        signature: agentSign.signature,
        jsApiList: [],
        success: () => resolve(),
        fail: (err: any) => reject(new Error(`agentConfig失败: ${JSON.stringify(err)}`))
      })
      setTimeout(() => resolve(), 3000)
    })
  }

  const doWwRegister = async (ww: any, corpId: string, agentId: number) => {
    const currentUrl = window.location.href.split('#')[0]

    await ww.register({
      corpId,
      agentId,
      jsApiList: [],
      async getConfigSignature() {
        const data: any = await request.post('/wecom/web-login/agent-config-sign', {
          corpId, url: currentUrl, type: 'config'
        })
        return { timestamp: Number(data.timestamp), nonceStr: String(data.nonceStr), signature: String(data.signature) }
      },
      async getAgentConfigSignature() {
        const data: any = await request.post('/wecom/web-login/agent-config-sign', {
          corpId, url: currentUrl, type: 'agent_config'
        })
        return { timestamp: Number(data.timestamp), nonceStr: String(data.nonceStr), signature: String(data.signature) }
      }
    })
  }

  /**
   * 绑定页面上所有 ww-open-data 元素
   */
  const bindAll = () => {
    const w = window as any
    if (!w.WWOpenData?.bind) return
    const elements = document.querySelectorAll('ww-open-data')
    if (elements.length > 0) {
      try {
        w.WWOpenData.bindAll(elements)
      } catch (e) {
        console.warn('[WwOpenDataSdk] bindAll失败:', e)
      }
    }
  }

  /**
   * 绑定单个元素
   */
  const bindElement = (el: Element) => {
    const w = window as any
    if (!w.WWOpenData?.bind) return
    try {
      w.WWOpenData.bind(el)
    } catch { /* ignore */ }
  }

  /**
   * 从配置自动初始化
   */
  const initFromConfig = async (configId?: number | null) => {
    try {
      let config: any = null
      if (configId) {
        config = await request.get(`/wecom/configs/${configId}`, { showError: false } as any)
      } else {
        const configRes: any = await request.get('/wecom/configs', { showError: false } as any)
        const configs = Array.isArray(configRes) ? configRes : (configRes?.data || configRes?.list || [])
        config = configs.find((c: any) => c.agentId && c.isEnabled) || configs[0]
      }
      if (!config?.corpId) return false
      return await initSdk(config.corpId, config.agentId)
    } catch {
      return false
    }
  }

  return {
    sdkState,
    isReady,
    isFailed,
    errorMsg,
    initSdk,
    initFromConfig,
    bindAll,
    bindElement
  }
}
