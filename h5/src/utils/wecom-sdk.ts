/**
 * 企微JS-SDK封装
 * 提供初始化、鉴权、获取上下文等功能
 */
import { getJsSdkConfig, getAgentConfig } from '@/api/auth'

const wx = (window as any).wx

/** JS-SDK是否已初始化 */
let sdkReady = false
let agentReady = false

/** 初始化企微JS-SDK (企业级) */
export async function initJsSdk(): Promise<boolean> {
  if (sdkReady) return true
  if (!wx) {
    console.warn('[WecomSDK] wx对象不存在，可能不在企微环境中')
    return false
  }

  try {
    const url = window.location.href.split('#')[0]
    const { data } = await getJsSdkConfig(url)
    if (!data?.data) return false

    const config = data.data
    return new Promise((resolve) => {
      wx.config({
        beta: true,
        debug: false,
        appId: config.corpId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: [
          'getCurExternalContact',
          'sendChatMessage',
          'getContext',
          'openUserProfile',
          'selectExternalContact'
        ]
      })

      wx.ready(() => {
        sdkReady = true
        resolve(true)
      })

      wx.error((err: any) => {
        console.error('[WecomSDK] config error:', err)
        resolve(false)
      })
    })
  } catch (e) {
    console.error('[WecomSDK] initJsSdk error:', e)
    return false
  }
}

/** 初始化agentConfig (应用级) */
export async function initAgentConfig(): Promise<boolean> {
  if (agentReady) return true
  if (!wx) return false

  try {
    const url = window.location.href.split('#')[0]
    const { data } = await getAgentConfig(url)
    if (!data?.data) return false

    const config = data.data
    return new Promise((resolve) => {
      wx.agentConfig({
        corpid: config.corpId,
        agentid: config.agentId,
        timestamp: config.timestamp,
        nonceStr: config.nonceStr,
        signature: config.signature,
        jsApiList: [
          'getCurExternalContact',
          'sendChatMessage'
        ],
        success: () => {
          agentReady = true
          resolve(true)
        },
        fail: (err: any) => {
          console.error('[WecomSDK] agentConfig error:', err)
          resolve(false)
        }
      })
    })
  } catch (e) {
    console.error('[WecomSDK] initAgentConfig error:', e)
    return false
  }
}

/** 获取当前入口上下文 */
export function getContext(): Promise<{ entry: string; shareTicket?: string }> {
  return new Promise((resolve, reject) => {
    if (!wx) return reject(new Error('wx不存在'))
    wx.invoke('getContext', {}, (res: any) => {
      if (res.err_msg === 'getContext:ok') {
        resolve({ entry: res.entry, shareTicket: res.shareTicket })
      } else {
        reject(new Error(res.err_msg || '获取上下文失败'))
      }
    })
  })
}

/** 获取当前聊天的外部联系人ID */
export function getCurExternalContact(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!wx) return reject(new Error('wx不存在'))
    wx.invoke('getCurExternalContact', {}, (res: any) => {
      if (res.err_msg === 'getCurExternalContact:ok') {
        resolve(res.userId)
      } else {
        reject(new Error(res.err_msg || '获取外部联系人失败'))
      }
    })
  })
}

/** 发送消息到聊天窗口 */
export function sendChatMessage(content: string, msgtype: string = 'text'): Promise<boolean> {
  return new Promise((resolve) => {
    if (!wx) return resolve(false)
    wx.invoke('sendChatMessage', {
      msgtype,
      text: { content }
    }, (res: any) => {
      resolve(res.err_msg === 'sendChatMessage:ok')
    })
  })
}

/** 检查是否在企微环境中 */
export function isWecomEnv(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('wxwork') || ua.includes('micromessenger')
}
