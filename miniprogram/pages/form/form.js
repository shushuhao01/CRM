const api = require('../../utils/api')
const util = require('../../utils/util')

/**
 * 地址相关字段 key 集合，用于合并渲染
 */
const ADDRESS_KEYS = ['address', 'province', 'city', 'district', 'street', 'detailAddress']

Page({
  data: {
    loading: true,
    error: false,
    errorMessage: '',
    submitting: false,
    showCollapsed: false,

    // 协议勾选
    agreedPrivacy: false,
    showAgreementModal: false,
    agreementType: '',  // 'privacy' | 'user'

    // URL参数
    tenantId: '',
    memberId: '',
    ts: '',
    sign: '',

    // 配置
    phoneAuthEnabled: true,
    tenantCode: '',

    // 智能识别填充
    smartPasteText: '',

    // 字段配置（从 API 获取，由租户 CRM 客户设置决定）
    visibleFields: [],    // mpEnabled && !mpCollapsed 的内置字段
    collapsedFields: [],  // mpEnabled && mpCollapsed 的内置字段
    customFields: [],     // mpDisplay !== 'hidden' 的自定义字段

    // 街道下拉数据
    streetList: [],
    streetLabels: [],
    streetManualInput: false,

    // 表单数据
    formData: {
      phone: '', name: '', gender: '', age: '',
      email: '', wechat: '', birthday: '',
      province: '', city: '', district: '', street: '', detailAddress: '',
      remark: '', medicalHistory: '', improvementGoals: '',
      height: '', weight: '',
      fanAcquisitionTime: '', level: '', source: '', status: ''
    },
    customFormData: {}
  },

  onLoad(options) {
    const params = util.parseQuery(options)
    this.setData({
      tenantId: params.tenantId,
      memberId: params.memberId,
      ts: params.ts,
      sign: params.sign
    })

    if (!params.tenantId || !params.memberId || !params.ts || !params.sign) {
      const isDevTools = typeof __wxConfig !== 'undefined' && __wxConfig.envVersion === 'develop'
      if (isDevTools) {
        console.log('[表单] 开发模式：使用Mock数据渲染表单')
        this._loadMockForm()
        return
      }
      this.setData({
        loading: false, error: true,
        errorMessage: '链接参数不完整，请通过小程序卡片打开。\n\n开发调试请在DevTools顶部编译模式选择"表单页(带参数)"'
      })
      return
    }

    this.loadFormConfig()
  },

  /** 开发模式Mock数据 */
  _loadMockForm() {
    this.setData({
      loading: false,
      tenantId: 'DEV_TENANT',
      tenantCode: 'T260303A1B2',
      phoneAuthEnabled: true,
      visibleFields: [
        { key: 'name', label: '客户姓名', mpRequired: true },
        { key: 'phone', label: '手机号', mpRequired: true },
        { key: 'province', label: '收货地址', mpRequired: true }
      ],
      collapsedFields: [
        { key: 'gender', label: '性别', mpRequired: false },
        { key: 'age', label: '年龄', mpRequired: false },
        { key: 'email', label: '邮箱', mpRequired: false },
        { key: 'wechat', label: '微信号', mpRequired: false },
        { key: 'birthday', label: '客户生日', mpRequired: false }
      ],
      customFields: []
    })
    wx.setNavigationBarTitle({ title: '填写资料' })
  },

  /**
   * 从后端加载表单配置
   * API 返回: { builtinFields, customFields, phoneAuthEnabled }
   * builtinFields: [ { key, label, mpRequired, mpCollapsed, mpEnabled } ]
   * customFields: [ { fieldKey, fieldName, fieldType, mpRequired, mpCollapsed, options, placeholder } ]
   */
  async loadFormConfig() {
    try {
      const res = await api.getFormConfig({
        tenantId: this.data.tenantId,
        memberId: this.data.memberId,
        ts: this.data.ts,
        sign: this.data.sign
      })

      const data = res.data || res
      const builtinFields = data.builtinFields || []
      const rawCustom = data.customFields || []

      // --- 内置字段：合并地址子字段为一个地址条目 ---
      const visible = []
      const collapsed = []
      let addressHandled = false

      for (const f of builtinFields) {
        // 地址子字段统一合并为一条
        if (ADDRESS_KEYS.includes(f.key)) {
          if (!addressHandled) {
            addressHandled = true
            const addrFields = builtinFields.filter(b => ADDRESS_KEYS.includes(b.key))
            const addrRequired = addrFields.some(a => a.mpRequired)
            const addrField = { key: 'province', label: '收货地址', mpRequired: addrRequired }
            // 必填→主区域，非必填→折叠
            if (addrRequired) visible.push(addrField)
            else collapsed.push(addrField)
          }
          continue
        }

        const field = { key: f.key, label: f.label, mpRequired: !!f.mpRequired }
        // 必填字段→主区域显示，非必填字段→折叠“更多信息”
        if (f.mpRequired) visible.push(field)
        else collapsed.push(field)
      }

      // --- 自定义字段 ---
      const customFields = rawCustom.map(f => {
        const item = { ...f }
        if (f.options && f.options.length > 0) {
          item.optionLabels = f.options.map(o => o.label)
        }
        return item
      })

      this.setData({
        loading: false,
        phoneAuthEnabled: data.phoneAuthEnabled !== false,
        tenantCode: data.tenantCode || '',
        visibleFields: visible,
        collapsedFields: collapsed,
        customFields
      })

      wx.setNavigationBarTitle({ title: '填写资料' })
    } catch (err) {
      console.error('[表单] 加载配置失败:', err)
      let errorMessage = '加载失败，请稍后重试'
      if (err.code === 'LINK_EXPIRED') {
        wx.redirectTo({ url: '/pages/expired/expired' })
        return
      }
      if (err.code === 'INVALID_SIGN') {
        errorMessage = '链接无效，请联系顾问重新获取'
      }
      this.setData({ loading: false, error: true, errorMessage })
    }
  },

  // ===== 微信手机号授权 =====
  async onGetPhoneNumber(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') return
    const code = e.detail.code
    if (!code) { util.showToast('获取手机号失败'); return }

    util.showLoading('获取手机号...')
    try {
      const res = await api.getPhone({
        code,
        tenantId: this.data.tenantId,
        memberId: this.data.memberId,
        ts: this.data.ts,
        sign: this.data.sign
      })
      const phoneNumber = res.data?.phoneNumber || ''
      if (phoneNumber) {
        this.setData({ 'formData.phone': phoneNumber })
        util.showToast('获取成功')
      } else {
        util.showToast('获取手机号失败，请手动输入')
      }
    } catch (err) {
      console.error('[表单] 获取手机号失败:', err)
      if (err.code === 'QUOTA_EXHAUSTED') {
        util.showToast('手机号获取额度已用完')
        this.setData({ phoneAuthEnabled: false })
      } else {
        util.showToast('获取失败，请手动输入')
      }
    } finally {
      util.hideLoading()
    }
  },

  // ===== 通用输入 =====
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`formData.${field}`]: e.detail.value })
  },

  // ===== 性别选择 =====
  onGenderSelect(e) {
    this.setData({ 'formData.gender': e.currentTarget.dataset.value })
  },

  // ===== 生日选择 =====
  onBirthdayChange(e) {
    this.setData({ 'formData.birthday': e.detail.value })
  },
  // ===== 地区选择（省/市/区三级联动） =====
  onRegionChange(e) {
    const val = e.detail.value || []
    this.setData({
      'formData.province': val[0] || '',
      'formData.city': val[1] || '',
      'formData.district': val[2] || '',
      'formData.street': '',
      streetList: [],
      streetLabels: [],
      streetManualInput: false
    })
    if (val[0] && val[1] && val[2]) {
      this._loadStreets(val[0], val[1], val[2])
    }
  },

  // ===== 加载街道列表 =====
  async _loadStreets(province, city, district) {
    try {
      const res = await api.getAddressStreets({ province, city, district })
      const streets = (res.data || res || [])
      if (streets && streets.length > 0) {
        this.setData({
          streetList: streets,
          streetLabels: streets.map(s => s.label)
        })
      }
    } catch (err) {
      console.warn('[表单] 加载街道失败:', err)
    }
  },

  // ===== 街道选择 =====
  onStreetChange(e) {
    const idx = e.detail.value
    const streets = this.data.streetList
    if (streets[idx]) {
      this.setData({ 'formData.street': streets[idx].label })
    }
  },

  // ===== 街道手动输入切换 =====
  onStreetManualToggle() {
    this.setData({ streetManualInput: !this.data.streetManualInput })
  },

  // ===== 自定义字段 =====
  onCustomInputChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`customFormData.${field}`]: e.detail.value })
  },

  onCustomPickerChange(e) {
    const field = e.currentTarget.dataset.field
    const options = e.currentTarget.dataset.options || []
    const idx = e.detail.value
    if (options[idx]) {
      this.setData({ [`customFormData.${field}`]: options[idx].label })
    }
  },

  onCustomDateChange(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`customFormData.${field}`]: e.detail.value })
  },

  // ===== 智能识别填充 =====
  onSmartPasteInput(e) {
    this.setData({ smartPasteText: e.detail.value })
  },

  onSmartPasteFromClipboard() {
    var self = this
    wx.getClipboardData({
      success: function (res) {
        var text = (res.data || '').trim()
        if (!text) {
          util.showToast('剪贴板为空')
          return
        }
        self.setData({ smartPasteText: text })
        // 自动触发识别
        self.onSmartPasteRecognize()
      },
      fail: function () {
        util.showToast('读取剪贴板失败')
      }
    })
  },

  onSmartPasteRecognize() {
    const text = this.data.smartPasteText
    if (!text || !text.trim()) {
      util.showToast('请先粘贴或输入文本')
      return
    }

    const updates = {}
    let recognized = 0

    // 提取手机号
    const phone = util.extractPhone(text)
    if (phone) {
      updates['formData.phone'] = phone
      recognized++
    }

    // 提取姓名（使用增强版）
    const name = util.extractName(text)
    if (name) {
      updates['formData.name'] = name
      recognized++
    }

    // 提取地址
    const address = util.extractAddress(text)
    if (address) {
      if (address.province) updates['formData.province'] = address.province
      if (address.city) updates['formData.city'] = address.city
      if (address.district) updates['formData.district'] = address.district
      if (address.street) updates['formData.street'] = address.street
      if (address.detail) updates['formData.detailAddress'] = address.detail
      recognized++
    }

    if (recognized > 0) {
      this.setData(updates)
      // 地址识别后尝试加载街道列表
      if (address && address.province && address.city && address.district) {
        this._loadStreets(address.province, address.city, address.district)
      }
      util.showToast('已识别' + recognized + '项信息')
    } else {
      util.showToast('未识别到有效信息')
    }
  },

  onSmartPasteClear() {
    this.setData({ smartPasteText: '' })
  },

  // ===== 展开/折叠 =====
  toggleCollapsed() {
    this.setData({ showCollapsed: !this.data.showCollapsed })
  },

  // ===== 协议相关 =====
  toggleAgreement() {
    this.setData({ agreedPrivacy: !this.data.agreedPrivacy })
  },

  showPrivacyPolicy() {
    this.setData({ showAgreementModal: true, agreementType: 'privacy' })
  },

  showUserAgreement() {
    this.setData({ showAgreementModal: true, agreementType: 'user' })
  },

  closeAgreementModal() {
    this.setData({ showAgreementModal: false, agreementType: '' })
  },

  agreeAndClose() {
    this.setData({ agreedPrivacy: true, showAgreementModal: false, agreementType: '' })
  },

  // ===== 验证必填字段（返回 true 表示通过） =====
  _validateRequiredFields() {
    const { formData, visibleFields, collapsedFields, customFields, customFormData } = this.data

    // 验证内置必填字段
    const allBuiltinFields = [...visibleFields, ...collapsedFields]
    for (const field of allBuiltinFields) {
      if (!field.mpRequired) continue
      const key = field.key
      if (key === 'address' || key === 'province') {
        if (!formData.province) { util.showToast('请选择收货地址'); return false }
        continue
      }
      if (key === 'city' || key === 'district' || key === 'street' || key === 'detailAddress') continue
      if (!formData[key]) { util.showToast(`请填写${field.label}`); return false }
    }

    // 手机号格式验证
    if (formData.phone && !util.isValidPhone(formData.phone)) {
      util.showToast('请输入正确的手机号'); return false
    }

    // 邮箱格式验证
    if (formData.email && !util.isValidEmail(formData.email)) {
      util.showToast('请输入正确的邮箱地址'); return false
    }

    // 微信号格式验证（6-20位，字母开头）
    if (formData.wechat && !util.isValidWechat(formData.wechat)) {
      util.showToast('微信号格式不正确（字母开头，6-20位）'); return false
    }

    // 年龄格式验证
    if (formData.age && (!util.isValidNumber(formData.age) || Number(formData.age) < 1 || Number(formData.age) > 150 || formData.age.includes('.'))) {
      util.showToast('请输入正确的年龄（1-150的整数）'); return false
    }

    // 身高格式验证
    if (formData.height && (!util.isValidNumber(formData.height) || Number(formData.height) <= 0 || Number(formData.height) > 300)) {
      util.showToast('请输入正确的身高（单位cm）'); return false
    }

    // 体重格式验证
    if (formData.weight && (!util.isValidNumber(formData.weight) || Number(formData.weight) <= 0 || Number(formData.weight) > 500)) {
      util.showToast('请输入正确的体重（单位kg）'); return false
    }

    // 验证自定义必填字段
    for (const field of customFields) {
      if (field.mpRequired && !customFormData[field.fieldKey]) {
        util.showToast(`请填写${field.fieldName}`); return false
      }
      // 自定义数字字段格式验证
      if (field.fieldType === 'number' && customFormData[field.fieldKey] && !util.isValidNumber(customFormData[field.fieldKey])) {
        util.showToast(`${field.fieldName}请输入正确的数字`); return false
      }
    }

    return true
  },

  // ===== 执行实际提交 =====
  async _doSubmit() {
    const { formData, customFormData } = this.data
    this.setData({ submitting: true })
    util.showLoading('提交中...')

    try {
      await api.submitCustomer({
        tenantId: this.data.tenantId,
        memberId: this.data.memberId,
        ts: this.data.ts,
        sign: this.data.sign,
        customerData: { ...formData, customFields: customFormData }
      })
      util.hideLoading()
      var successParams = 'tenantId=' + encodeURIComponent(this.data.tenantId) +
        '&memberId=' + encodeURIComponent(this.data.memberId) +
        '&name=' + encodeURIComponent(formData.name || '')
      wx.redirectTo({ url: '/pages/success/success?' + successParams })
    } catch (err) {
      util.hideLoading()
      console.error('[表单] 提交失败:', err)
      if (err.code === 'DUPLICATE_PHONE') {
        util.showToast('您的资料已提交过')
      } else {
        util.showToast(err.message || '提交失败，请稍后重试')
      }
    } finally {
      this.setData({ submitting: false })
    }
  },

  // ===== 提交 =====
  onSubmit() {
    console.log('[表单] onSubmit 被触发, submitting=', this.data.submitting, 'agreedPrivacy=', this.data.agreedPrivacy)
    if (this.data.submitting) return

    // 第一步：验证必填字段
    var valid = this._validateRequiredFields()
    console.log('[表单] 必填验证结果:', valid)
    if (!valid) return

    // 第二步：检查协议勾选
    if (!this.data.agreedPrivacy) {
      var self = this
      wx.showModal({
        title: '协议确认',
        content: '您还未勾选用户协议和隐私政策，是否同意并继续提交？',
        confirmText: '同意提交',
        cancelText: '取消',
        success: function (res) {
          if (res.confirm) {
            self.setData({ agreedPrivacy: true })
            self._doSubmit()
          }
        }
      })
      return
    }

    // 已勾选，直接提交
    this._doSubmit()
  }
})
