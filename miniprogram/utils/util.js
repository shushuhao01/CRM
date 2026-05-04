/**
 * 工具函数
 */

/**
 * 解析URL参数
 * 支持两种来源:
 * 1. 普通小程序卡片/链接: options.tenantId, options.memberId, ...
 * 2. 小程序码扫描: options.scene = "t=xxx&m=xxx&ts=xxx&s=xxx"
 *    (scene 有 32 字符限制，使用缩写 key: t=tenantId, m=memberId, ts=ts, s=sign)
 */
function parseQuery(options) {
  var result = {
    tenantId: options.tenantId || '',
    memberId: options.memberId || '',
    ts: options.ts || '',
    sign: options.sign || ''
  }

  // 如果有 scene 参数（小程序码扫描进入），解码并解析
  if (options.scene && !result.tenantId) {
    try {
      var scene = decodeURIComponent(options.scene)
      var pairs = scene.split('&')
      var sceneMap = {}
      for (var i = 0; i < pairs.length; i++) {
        var kv = pairs[i].split('=')
        if (kv.length === 2) {
          sceneMap[kv[0]] = kv[1]
        }
      }
      // 映射缩写 key 到完整 key
      result.tenantId = sceneMap['t'] || sceneMap['tenantId'] || result.tenantId
      result.memberId = sceneMap['m'] || sceneMap['memberId'] || result.memberId
      result.ts = sceneMap['ts'] || result.ts
      result.sign = sceneMap['s'] || sceneMap['sign'] || result.sign
    } catch (e) {
      console.error('[util] scene 解析失败:', e)
    }
  }

  return result
}

/**
 * 智能粘贴识别 - 从文本中提取手机号
 */
function extractPhone(text) {
  if (!text) return ''
  // 先尝试匹配“电话/手机/电话号码/phone”标签后的号码
  var labelMatch = text.match(/(?:电话|手机|手机号|电话号码|联系电话|phone|tel)[\uff1a:、\s]*?(1[3-9]\d{9})/i)
  if (labelMatch) return labelMatch[1]
  // 回退到匹配任意手机号
  var match = text.match(/1[3-9]\d{9}/)
  return match ? match[0] : ''
}

/**
 * 智能粘贴识别 - 从文本中提取姓名
 * 支持格式：“姓名：何淑清” “收件人：张三” “何淑清 13800138000”
 */
function extractName(text) {
  if (!text) return ''
  // 先尝试匹配标签格式：姓名：XXX / 收件人：XXX / 客户：XXX
  var labelMatch = text.match(/(?:姓名|收件人|客户姓名|客户|称呼|name)[\uff1a:、\s]*?([\u4e00-\u9fa5]{2,4})/i)
  if (labelMatch) return labelMatch[1]
  // 回退：找第一个不在常见标签词中的2-4个汉字
  var labels = ['姓名', '电话', '手机', '地址', '收件', '收货', '联系', '备注', '省份', '城市', '区县', '街道', '详细', '邮编', '年龄', '性别', '生日', '邮箱', '微信', '北京', '上海', '天津', '重庆', '广东', '山东', '河南', '四川', '江苏', '河北', '湖南', '湖北', '浙江', '安徽', '福建', '广西', '内蒙古', '自治区']
  var matches = text.match(/[\u4e00-\u9fa5]{2,4}/g) || []
  for (var i = 0; i < matches.length; i++) {
    var w = matches[i]
    var isLabel = false
    for (var j = 0; j < labels.length; j++) {
      if (w.indexOf(labels[j]) >= 0 || labels[j].indexOf(w) >= 0) { isLabel = true; break }
    }
    if (!isLabel) return w
  }
  return ''
}

/**
 * 智能粘贴识别 - 从文本中提取地址
 * 增强版：支持多种中国地址格式，包括直辖市、自治区、无省份前缀等
 * 参考CRM客户管理新增客户的智能识别逻辑，使用省市区名称匹配
 */
function extractAddress(text) {
  if (!text) return null

  // ── 省份数据（简称→全称映射，用于无后缀匹配） ──
  var PROVINCES = [
    { full: '北京市', short: '北京', isMunicipality: true },
    { full: '上海市', short: '上海', isMunicipality: true },
    { full: '天津市', short: '天津', isMunicipality: true },
    { full: '重庆市', short: '重庆', isMunicipality: true },
    { full: '广东省', short: '广东' }, { full: '江苏省', short: '江苏' },
    { full: '浙江省', short: '浙江' }, { full: '山东省', short: '山东' },
    { full: '河南省', short: '河南' }, { full: '四川省', short: '四川' },
    { full: '湖北省', short: '湖北' }, { full: '湖南省', short: '湖南' },
    { full: '河北省', short: '河北' }, { full: '福建省', short: '福建' },
    { full: '安徽省', short: '安徽' }, { full: '江西省', short: '江西' },
    { full: '陕西省', short: '陕西' }, { full: '山西省', short: '山西' },
    { full: '辽宁省', short: '辽宁' }, { full: '吉林省', short: '吉林' },
    { full: '黑龙江省', short: '黑龙江' }, { full: '贵州省', short: '贵州' },
    { full: '云南省', short: '云南' }, { full: '甘肃省', short: '甘肃' },
    { full: '青海省', short: '青海' }, { full: '海南省', short: '海南' },
    { full: '台湾省', short: '台湾' },
    { full: '广西壮族自治区', short: '广西' }, { full: '内蒙古自治区', short: '内蒙古' },
    { full: '西藏自治区', short: '西藏' }, { full: '宁夏回族自治区', short: '宁夏' },
    { full: '新疆维吾尔自治区', short: '新疆' },
    { full: '香港特别行政区', short: '香港' }, { full: '澳门特别行政区', short: '澳门' }
  ]

  // 路名后缀（用于排除路名中包含的地名误匹配）
  var ROAD_SUFFIXES = ['路', '道', '街', '巷', '弄', '桥', '里', '苑', '园', '城', '村', '庄', '号', '楼', '栋', '大厦', '大道', '公路', '广场', '花园', '小区']

  // ── 辅助函数 ──
  function isPartOfRoadName(txt, name) {
    var idx = txt.indexOf(name)
    if (idx === -1) return false
    var after = txt.substring(idx + name.length)
    for (var i = 0; i < ROAD_SUFFIXES.length; i++) {
      if (after.indexOf(ROAD_SUFFIXES[i]) === 0) return true
    }
    return false
  }

  // ── Step 1: 提取地址文本片段 ──
  var addrText = ''

  // 1a. 尝试匹配"地址"标签后的内容
  var addrMatch = text.match(/(?:地址|收货地址|详细地址|address|addr)[\uff1a:、\s]*?(.+)/i)
  if (addrMatch) {
    addrText = addrMatch[1].trim()
  }

  // 地址字符集：中文 + 数字 + 常见地址符号（空格、-、号、#）
  var AC = '[\\u4e00-\\u9fa5\\d\\s\\-#\\.·]'

  // 1b. 如果无标签，尝试多种模式从混合文本中提取地址部分
  if (!addrText) {
    var patterns = [
      // XX省XX市 + 后续地址（含数字门牌号）
      new RegExp('([\\u4e00-\\u9fa5]+(?:\\u7701|\\u81ea\\u6cbb\\u533a|\\u7279\\u522b\\u884c\\u653f\\u533a)' + AC + '*(?:\\u5e02|\\u5730\\u533a|\\u81ea\\u6cbb\\u5dde|\\u76df)' + AC + '*)'),
      // 直辖市：北京/上海/天津/重庆（后可跟市+区+门牌号等）
      new RegExp('((?:\\u5317\\u4eac|\\u4e0a\\u6d77|\\u5929\\u6d25|\\u91cd\\u5e86)(?:\\u5e02)?' + AC + '*)'),
      // XX市XX区/县/市 + 后续
      new RegExp('([\\u4e00-\\u9fa5]{2,4}\\u5e02' + AC + '*)'),
      // XX省（仅省名，后面可能没有市）
      new RegExp('([\\u4e00-\\u9fa5]+(?:\\u7701|\\u81ea\\u6cbb\\u533a|\\u7279\\u522b\\u884c\\u653f\\u533a)' + AC + '*)'),
      // 省份简称+市/区
      new RegExp('((?:\\u5e7f\\u4e1c|\\u6c5f\\u82cf|\\u6d59\\u6c5f|\\u5c71\\u4e1c|\\u6cb3\\u5357|\\u56db\\u5ddd|\\u6e56\\u5317|\\u6e56\\u5357|\\u6cb3\\u5317|\\u798f\\u5efa|\\u5b89\\u5fbd|\\u6c5f\\u897f|\\u9655\\u897f|\\u5c71\\u897f|\\u8fbd\\u5b81|\\u5409\\u6797|\\u9ed1\\u9f99\\u6c5f|\\u8d35\\u5dde|\\u4e91\\u5357|\\u7518\\u8083|\\u9752\\u6d77|\\u6d77\\u5357|\\u53f0\\u6e7e|\\u5e7f\\u897f|\\u5185\\u8499\\u53e4|\\u897f\\u85cf|\\u5b81\\u590f|\\u65b0\\u7586|\\u9999\\u6e2f|\\u6fb3\\u95e8)[\\u4e00-\\u9fa5]+(?:\\u5e02|\\u533a|\\u53bf)' + AC + '*)')
    ]
    for (var pi = 0; pi < patterns.length; pi++) {
      var dm = text.match(patterns[pi])
      if (dm) {
        addrText = dm[0].replace(/\s+$/, '')
        break
      }
    }
  }

  if (!addrText) return null

  // ── Step 2: 清理地址文本 ──
  addrText = addrText.replace(/1[3-9]\d{9}/g, '').trim()
  addrText = addrText.replace(/^[\s,，、\-:：]+/, '').trim()

  var result = { province: '', city: '', district: '', street: '', detail: '' }

  // ── Step 3: 解析省份/直辖市 ──
  var foundProvince = null
  for (var pi2 = 0; pi2 < PROVINCES.length; pi2++) {
    var prov = PROVINCES[pi2]
    // 优先匹配全称（如"广东省"）
    if (addrText.indexOf(prov.full) === 0) {
      foundProvince = prov
      addrText = addrText.substring(prov.full.length)
      break
    }
    // 再匹配简称（如"广东"），但需排除路名
    if (addrText.indexOf(prov.short) === 0 && !isPartOfRoadName(addrText, prov.short)) {
      foundProvince = prov
      addrText = addrText.substring(prov.short.length)
      break
    }
  }

  if (foundProvince) {
    result.province = foundProvince.full
    if (foundProvince.isMunicipality) {
      result.city = foundProvince.full
    }
  }

  // ── Step 4: 解析城市 ──
  if (!result.city) {
    // 清理开头的分隔符
    addrText = addrText.replace(/^[\s,，、\-]+/, '')
    var cityMatch = addrText.match(/^([\u4e00-\u9fa5]+?(?:\u5e02|\u5730\u533a|\u81ea\u6cbb\u5dde|\u76df))/)
    if (cityMatch) {
      result.city = cityMatch[1]
      addrText = addrText.substring(cityMatch[1].length)
    }
  }

  // ── Step 5: 解析区/县 ──
  addrText = addrText.replace(/^[\s,，、\-]+/, '')
  var distMatch = addrText.match(/^([\u4e00-\u9fa5]+?(?:\u533a|\u53bf|\u65d7|\u6797\u533a))/)
  if (distMatch) {
    // 确保不是把"区"字后面的内容误匹配（如"区域"不应作为区名）
    var distName = distMatch[1]
    if (distName.length >= 2) {
      result.district = distName
      addrText = addrText.substring(distName.length)
    }
  }

  // ── Step 6: 解析街道/镇/乡（仅匹配行政区划级别的街道办/镇/乡） ──
  addrText = addrText.replace(/^[\s,，、\-]+/, '').trim()
  var streetMatch = addrText.match(/^([\u4e00-\u9fa5]+?(?:\u8857\u9053|\u9547|\u4e61))/)
  if (streetMatch) {
    result.street = streetMatch[1]
    addrText = addrText.substring(streetMatch[1].length)
  }

  // ── Step 7: 剩余部分为详细地址（含路名、门牌号等） ──
  addrText = addrText.replace(/^[\s,，、\-]+/, '').trim()
  if (addrText) result.detail = addrText

  // ── Step 7b: 如果街道为空且详细地址包含路/道/街，尝试将路名也保留在详细地址中 ──
  // 不要把"XX路222号"拆到 street 字段，路名属于详细地址

  // ── Step 8: 反向推断省份（从城市名推断） ──
  if (!result.province && result.city) {
    // 直辖市推断
    for (var mi = 0; mi < PROVINCES.length; mi++) {
      var p = PROVINCES[mi]
      if (p.isMunicipality && result.city.indexOf(p.short) >= 0) {
        result.province = p.full
        break
      }
    }
    // 常见城市→省份映射（覆盖最常见的城市）
    if (!result.province) {
      var CITY_TO_PROVINCE = {
        '广州': '广东省', '深圳': '广东省', '东莞': '广东省', '佛山': '广东省', '珠海': '广东省', '惠州': '广东省', '中山': '广东省', '汕头': '广东省', '江门': '广东省', '湛江': '广东省', '茂名': '广东省',
        '南京': '江苏省', '苏州': '江苏省', '无锡': '江苏省', '常州': '江苏省', '南通': '江苏省', '徐州': '江苏省', '盐城': '江苏省',
        '杭州': '浙江省', '宁波': '浙江省', '温州': '浙江省', '金华': '浙江省', '嘉兴': '浙江省', '台州': '浙江省', '绍兴': '浙江省',
        '济南': '山东省', '青岛': '山东省', '烟台': '山东省', '潍坊': '山东省', '临沂': '山东省', '淄博': '山东省', '威海': '山东省',
        '郑州': '河南省', '洛阳': '河南省', '南阳': '河南省', '新乡': '河南省', '开封': '河南省', '信阳': '河南省',
        '成都': '四川省', '绵阳': '四川省', '德阳': '四川省', '宜宾': '四川省', '泸州': '四川省', '南充': '四川省',
        '武汉': '湖北省', '宜昌': '湖北省', '襄阳': '湖北省', '荆州': '湖北省', '黄冈': '湖北省',
        '长沙': '湖南省', '株洲': '湖南省', '湘潭': '湖南省', '衡阳': '湖南省', '岳阳': '湖南省', '常德': '湖南省',
        '石家庄': '河北省', '唐山': '河北省', '保定': '河北省', '邯郸': '河北省', '廊坊': '河北省',
        '福州': '福建省', '厦门': '福建省', '泉州': '福建省', '漳州': '福建省', '莆田': '福建省',
        '合肥': '安徽省', '芜湖': '安徽省', '蚌埠': '安徽省', '阜阳': '安徽省', '亳州': '安徽省',
        '南昌': '江西省', '赣州': '江西省', '九江': '江西省', '上饶': '江西省', '宜春': '江西省',
        '西安': '陕西省', '咸阳': '陕西省', '宝鸡': '陕西省', '渭南': '陕西省', '汉中': '陕西省',
        '太原': '山西省', '大同': '山西省', '临汾': '山西省', '运城': '山西省', '长治': '山西省',
        '沈阳': '辽宁省', '大连': '辽宁省', '鞍山': '辽宁省', '锦州': '辽宁省', '营口': '辽宁省',
        '长春': '吉林省', '吉林': '吉林省', '四平': '吉林省', '通化': '吉林省',
        '哈尔滨': '黑龙江省', '大庆': '黑龙江省', '齐齐哈尔': '黑龙江省', '牡丹江': '黑龙江省',
        '贵阳': '贵州省', '遵义': '贵州省', '六盘水': '贵州省', '毕节': '贵州省',
        '昆明': '云南省', '曲靖': '云南省', '大理': '云南省', '玉溪': '云南省', '红河': '云南省',
        '兰州': '甘肃省', '天水': '甘肃省', '酒泉': '甘肃省', '庆阳': '甘肃省',
        '西宁': '青海省', '海口': '海南省', '三亚': '海南省',
        '南宁': '广西壮族自治区', '柳州': '广西壮族自治区', '桂林': '广西壮族自治区', '玉林': '广西壮族自治区',
        '呼和浩特': '内蒙古自治区', '包头': '内蒙古自治区', '鄂尔多斯': '内蒙古自治区', '赤峰': '内蒙古自治区',
        '拉萨': '西藏自治区', '银川': '宁夏回族自治区',
        '乌鲁木齐': '新疆维吾尔自治区', '克拉玛依': '新疆维吾尔自治区'
      }
      // 从城市名中提取短名（去掉"市"后缀）
      var cityShort = result.city.replace(/市|地区|自治州|盟$/g, '')
      if (CITY_TO_PROVINCE[cityShort]) {
        result.province = CITY_TO_PROVINCE[cityShort]
      }
    }
  }

  return (result.province || result.city || result.district) ? result : null
}

/**
 * 手机号校验
 */
function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 显示加载
 */
function showLoading(title) {
  wx.showLoading({ title: title || '加载中...', mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

function showToast(title, icon) {
  wx.showToast({ title, icon: icon || 'none', duration: 2000 })
}

module.exports = {
  parseQuery,
  extractPhone,
  extractName,
  extractAddress,
  isValidPhone,
  showLoading,
  hideLoading,
  showToast
}
