import api from './index'

/** H5登录：企微userId绑定CRM用户 */
export function h5Login(data: { wecomUserId: string; corpId: string }) {
  return api.post('/login', data)
}

/** 获取当前用户信息 */
export function getCurrentUser() {
  return api.get('/current-user')
}

/** JS-SDK Config签名 */
export function getJsSdkConfig(url: string) {
  return api.get('/jssdk-config', { params: { url } })
}

/** agentConfig签名 */
export function getAgentConfig(url: string) {
  return api.get('/agent-config', { params: { url } })
}

/** 绑定CRM账号 */
export function bindAccount(data: { wecomUserId: string; corpId: string; tenantCode: string; username: string; password: string }) {
  return api.post('/bind-account', data)
}
