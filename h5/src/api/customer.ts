import api from './index'

/** 客户列表 */
export function getCustomers(params: {
  page?: number
  pageSize?: number
  keyword?: string
  tag?: string
  status?: string
}) {
  return api.get('/app/customers', { params })
}

/** 客户详情 */
export function getCustomerDetail(id: string) {
  return api.get(`/app/customer/${id}`)
}

/** 侧边栏：通过externalUserId获取客户画像 */
export function getCustomerPortrait(externalUserId: string) {
  return api.get('/sidebar/portrait', { params: { externalUserId } })
}

/** 侧边栏：通过externalUserId查询绑定信息 */
export function getCustomerBindInfo(externalUserId: string) {
  return api.get('/sidebar/customer-bindinfo', { params: { externalUserId } })
}
