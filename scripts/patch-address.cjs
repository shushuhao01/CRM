/**
 * 地址数据补全脚本
 * 功能：对比参考数据(china-division)与现有address.json，补充缺失的区县和乡镇
 * 原则：只增不删，不修改已有数据
 */
const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

// ── 加载数据 ──────────────────────────────────────────
const refProvinces = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'provinces.json'), 'utf8'));
const refCities = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'cities.json'), 'utf8'));
const refAreas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'areas.json'), 'utf8'));
const refStreets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'streets.json'), 'utf8'));
const currentData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'address.json'), 'utf8'));

// ── 构建参考数据树 ──────────────────────────────────────
const provinceNameMap = {};
refProvinces.forEach(p => { provinceNameMap[p.code] = p.name; });
const cityCodeMap = {};
refCities.forEach(c => { cityCodeMap[c.code] = c; });
const cityNameMap = {};
refCities.forEach(c => { cityNameMap[c.code] = c.name; });
const areaNameMap = {};
refAreas.forEach(a => { areaNameMap[a.code] = a.name; });

const refMap = {};
refProvinces.forEach(p => { refMap[p.name] = {}; });
refCities.forEach(c => {
  const pName = provinceNameMap[c.provinceCode];
  if (refMap[pName]) refMap[pName][c.name] = { code: c.code, areas: {} };
});
refAreas.forEach(a => {
  const pName = provinceNameMap[a.provinceCode];
  const cName = cityNameMap[a.cityCode];
  if (refMap[pName] && refMap[pName][cName]) {
    refMap[pName][cName].areas[a.name] = { code: a.code, streets: [] };
  }
});
refStreets.forEach(s => {
  const pName = provinceNameMap[s.provinceCode];
  const cName = cityNameMap[s.cityCode];
  const aName = areaNameMap[s.areaCode];
  if (refMap[pName] && refMap[pName][cName] && refMap[pName][cName].areas[aName]) {
    refMap[pName][cName].areas[aName].streets.push(s.name);
  }
});

// ── 拼音生成辅助 ──────────────────────────────────────
// 用于跟踪已使用的value，确保唯一性
const usedValues = new Set();

// 收集现有所有value
function collectValues(nodes) {
  for (const node of nodes) {
    usedValues.add(node.value);
    if (node.children) collectValues(node.children);
  }
}
collectValues(currentData);

function toPinyinValue(name) {
  // 去除常见后缀以获得更简洁的拼音
  let cleanName = name
    .replace(/街道办事处$/, '')
    .replace(/办事处$/, '')
    .replace(/经济开发区$/, 'kfq')
    .replace(/高新技术产业开发区$/, 'gxq')
    .replace(/工业园区$/, 'gyq');
  
  let py = pinyin(cleanName, { toneType: 'none', type: 'array' }).join('');
  py = py.replace(/\s+/g, '').toLowerCase();
  
  // 确保唯一性
  let finalValue = py;
  let counter = 1;
  while (usedValues.has(finalValue)) {
    finalValue = py + counter;
    counter++;
  }
  usedValues.add(finalValue);
  return finalValue;
}

// ── 过滤不需要的条目 ──────────────────────────────────
// 过滤掉不是正式行政区划的条目（如农场、开发区管委会等）
// 但保留有实际地址意义的开发区和街道
function shouldIncludeStreet(name) {
  // 排除纯农场、林场、牧场等非行政区划
  if (/^.{2,}农场$/.test(name) && !name.includes('镇') && !name.includes('街道') && !name.includes('乡')) return false;
  if (/有限公司$/.test(name)) return false;
  if (/有限责任公司$/.test(name)) return false;
  if (/繁育中心$/.test(name)) return false;
  if (/生态保护区$/.test(name)) return false;
  // 保留其他（包括开发区、工业园区等，因为实际有人使用这些地址）
  return true;
}

function shouldIncludeArea(name) {
  if (name === '市辖区') return false;
  if (/有限公司$/.test(name)) return false;
  return true;
}

// ── 执行补全 ──────────────────────────────────────────
const stats = {
  addedDistricts: 0,
  addedTownships: 0,
  addedTownshipsToEmpty: 0,
  details: [] // 记录详细变更
};

currentData.forEach(province => {
  const pName = province.label;
  const refProv = refMap[pName];
  if (!refProv) return; // 港澳台等无参考数据

  const cities = province.children || [];
  
  cities.forEach(city => {
    const cName = city.label;
    
    // 匹配参考城市
    let refCity = refProv[cName];
    if (!refCity) refCity = refProv['市辖区']; // 直辖市
    if (!refCity) {
      // 重庆有"县"级
      refCity = refProv['县'];
      if (!refCity) return;
    }

    if (!city.children) city.children = [];
    const existingDistNames = new Set(city.children.map(d => d.label));

    // 1. 添加缺失的区县（包含其乡镇）
    Object.entries(refCity.areas).forEach(([aName, aData]) => {
      if (!shouldIncludeArea(aName)) return;
      if (existingDistNames.has(aName)) return;

      const newDistrict = {
        label: aName,
        value: toPinyinValue(aName),
        children: []
      };

      // 添加该区县的所有乡镇
      aData.streets.forEach(sName => {
        if (!shouldIncludeStreet(sName)) return;
        newDistrict.children.push({
          label: sName,
          value: toPinyinValue(sName)
        });
      });

      city.children.push(newDistrict);
      stats.addedDistricts++;
      stats.details.push(`[新增区县] ${pName} > ${cName} > ${aName} (含${newDistrict.children.length}个乡镇)`);
    });

    // 2. 为已有但缺乡镇的区县补充乡镇
    city.children.forEach(dist => {
      const refArea = refCity.areas[dist.label];
      if (!refArea) return;

      if (!dist.children) dist.children = [];
      const existingTownNames = new Set(dist.children.map(t => t.label));

      const missingStreets = refArea.streets.filter(s => 
        !existingTownNames.has(s) && shouldIncludeStreet(s)
      );

      if (missingStreets.length > 0) {
        const wasEmpty = dist.children.length === 0;
        missingStreets.forEach(sName => {
          dist.children.push({
            label: sName,
            value: toPinyinValue(sName)
          });
          stats.addedTownships++;
          if (wasEmpty) stats.addedTownshipsToEmpty++;
        });
        if (wasEmpty) {
          stats.details.push(`[补充乡镇] ${pName} > ${cName} > ${dist.label}: 新增${missingStreets.length}个乡镇`);
        } else {
          stats.details.push(`[补充部分乡镇] ${pName} > ${cName} > ${dist.label}: 新增${missingStreets.length}个 (${missingStreets.slice(0,3).join(',')}${missingStreets.length>3?'...':''})`);
        }
      }
    });
  });
});

// ── 特殊处理：海南省县级行政单位 ──────────────────────
// 海南省部分县只有一个同名子节点，需要展开为实际乡镇
const hainan = currentData.find(p => p.label === '海南省');
if (hainan) {
  const refHainan = refMap['海南省'];
  if (refHainan) {
    // 处理直辖县级行政单位（澄迈县、临高县、各自治县等）
    hainan.children.forEach(city => {
      const cName = city.label;
      
      // 对于 省直辖县级行政区划
      let refCity = refHainan[cName];
      if (!refCity) {
        // 尝试在 "省直辖县级行政区划" 中查找
        const directCity = refHainan['省直辖县级行政区划'];
        if (directCity && directCity.areas[cName]) {
          // 这个城市实际上是一个直辖县，其乡镇在参考数据中
          const refArea = directCity.areas[cName];
          // 检查当前结构：如果只有一个同名子节点且无乡镇
          if (city.children && city.children.length === 1 && city.children[0].label === cName) {
            const singleChild = city.children[0];
            if (!singleChild.children || singleChild.children.length === 0) {
              // 替换为实际乡镇数据
              singleChild.children = [];
              refArea.streets.forEach(sName => {
                if (!shouldIncludeStreet(sName)) return;
                singleChild.children.push({
                  label: sName,
                  value: toPinyinValue(sName)
                });
                stats.addedTownships++;
                stats.addedTownshipsToEmpty++;
              });
              stats.details.push(`[补充乡镇] 海南省 > ${cName} > ${cName}: 新增${singleChild.children.length}个乡镇`);
            }
          }
        }
      }
    });
  }
}

// ── 写入结果 ──────────────────────────────────────────
const outputPath = path.join(__dirname, '..', 'public', 'data', 'address.json');
fs.writeFileSync(outputPath, JSON.stringify(currentData), 'utf8');

// ── 输出统计 ──────────────────────────────────────────
console.log('=== 补全完成 ===');
console.log(`新增区县: ${stats.addedDistricts}`);
console.log(`新增乡镇(为空区县): ${stats.addedTownshipsToEmpty}`);
console.log(`新增乡镇(总计): ${stats.addedTownships}`);
console.log('');

// 按省份汇总
const byProvince = {};
stats.details.forEach(d => {
  const match = d.match(/\] (.+?) >/);
  if (match) {
    const prov = match[1];
    if (!byProvince[prov]) byProvince[prov] = [];
    byProvince[prov].push(d);
  }
});

Object.entries(byProvince).forEach(([prov, details]) => {
  console.log(`\n--- ${prov} (${details.length}项变更) ---`);
  details.forEach(d => console.log(d));
});

// 保存详细报告
const reportPath = path.join(__dirname, '..', 'scripts', 'address-patch-report.txt');
let reportContent = `地址数据补全报告\n生成时间: ${new Date().toISOString()}\n\n`;
reportContent += `新增区县: ${stats.addedDistricts}\n`;
reportContent += `新增乡镇(总计): ${stats.addedTownships}\n`;
reportContent += `新增乡镇(为空区县补充): ${stats.addedTownshipsToEmpty}\n\n`;
reportContent += `=== 详细变更 ===\n`;
stats.details.forEach(d => { reportContent += d + '\n'; });
fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log(`\n详细报告已保存至: ${reportPath}`);
