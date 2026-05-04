/**
 * API 请求工具
 */
const app = getApp()

/**
 * 发起请求
 */
function request(url, options = {}) {
  const baseUrl = app.globalData.apiBaseUrl
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject({
            statusCode: res.statusCode,
            message: res.data?.message || '请求失败',
            code: res.data?.code || '',
            data: res.data
          })
        }
      },
      fail(err) {
        reject({ statusCode: -1, message: '网络异常，请稍后重试', error: err })
      }
    })
  })
}

/**
 * 获取表单配置
 */
function getFormConfig(params) {
  const { tenantId, memberId, ts, sign } = params
  return request(`/form-config?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${sign}`)
}

/**
 * 提交客户资料
 */
function submitCustomer(data) {
  return request('/submit-customer', {
    method: 'POST',
    data
  })
}

/**
 * 获取微信手机号
 */
function getPhone(data) {
  return request('/get-phone', {
    method: 'POST',
    data
  })
}

/**
 * 获取街道列表（根据省/市/区）
 */
function getAddressStreets(params) {
  const { province, city, district } = params
  return request(`/address-streets?province=${encodeURIComponent(province)}&city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`)
}

module.exports = {
  request,
  getFormConfig,
  submitCustomer,
  getPhone,
  getAddressStreets
}
