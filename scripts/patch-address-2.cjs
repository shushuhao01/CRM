/**
 * 地址数据补全 - 第二轮补丁
 * 1. 修复湖北省直辖县级行政区划（仙桃/潜江/天门/神农架）
 * 2. 补充之前被过滤的农场等条目
 */
const fs = require('fs');
const path = require('path');
const { pinyin } = require('pinyin-pro');

const refAreas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'areas.json'), 'utf8'));
const refStreets = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'streets.json'), 'utf8'));
const currentData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'address.json'), 'utf8'));

// 收集已用value
const usedValues = new Set();
function collectValues(nodes) {
  for (const node of nodes) {
    usedValues.add(node.value);
    if (node.children) collectValues(node.children);
  }
}
collectValues(currentData);

function toPinyinValue(name) {
  let cleanName = name.replace(/街道办事处$/, '').replace(/办事处$/, '');
  let py = pinyin(cleanName, { toneType: 'none', type: 'array' }).join('');
  py = py.replace(/\s+/g, '').toLowerCase();
  let finalValue = py;
  let counter = 1;
  while (usedValues.has(finalValue)) {
    finalValue = py + counter;
    counter++;
  }
  usedValues.add(finalValue);
  return finalValue;
}

let addedCount = 0;
const details = [];

// ── 1. 湖北省直辖行政区 ──────────────────────────────
// 参考数据中 湖北省 > 省直辖县级行政区划 > 仙桃/潜江/天门/神农架
// 现有数据中已有 仙桃市/潜江市/天门市/神农架林区 作为独立城市
// 需要为它们的子区县添加乡镇

// 构建参考数据: 湖北省直辖区的乡镇
const hubeiDirectAreas = {};
// 先找到湖北省直辖的areas
refAreas.forEach(a => {
  if (a.provinceCode === '42') {
    // cityCode 4290 是省直辖县级行政区划
    if (a.cityCode === '4290') {
      hubeiDirectAreas[a.name] = { code: a.code, streets: [] };
    }
  }
});
refStreets.forEach(s => {
  if (s.provinceCode === '42' && s.cityCode === '4290') {
    const aName = Object.keys(hubeiDirectAreas).find(n => hubeiDirectAreas[n].code === s.areaCode);
    if (aName) hubeiDirectAreas[aName].streets.push(s.name);
  }
});

console.log('湖北省直辖区域参考数据:');
Object.entries(hubeiDirectAreas).forEach(([name, data]) => {
  console.log(`  ${name}: ${data.streets.length}个乡镇`);
});

const hubei = currentData.find(p => p.label === '湖北省');
if (hubei) {
  // 匹配: 仙桃市, 潜江市, 天门市, 神农架林区
  const mapping = {
    '仙桃市': '仙桃市',
    '潜江市': '潜江市',
    '天门市': '天门市',
    '神农架林区': '神农架林区'
  };

  Object.entries(mapping).forEach(([cityName, refAreaName]) => {
    const city = hubei.children.find(c => c.label === cityName);
    const refArea = hubeiDirectAreas[refAreaName];
    if (city && refArea) {
      // 这些城市下有一个同名的区县子节点
      const dist = city.children && city.children[0];
      if (dist && (!dist.children || dist.children.length === 0)) {
        dist.children = [];
        refArea.streets.forEach(sName => {
          dist.children.push({
            label: sName,
            value: toPinyinValue(sName)
          });
          addedCount++;
        });
        details.push(`[补充乡镇] 湖北省 > ${cityName}: 新增${dist.children.length}个乡镇`);
      }
    }
  });
}

// ── 2. 补充被过滤的农场等条目 ──────────────────────────
// 构建完整参考树
const provinceNameMap = {};
const refProvinces = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'provinces.json'), 'utf8'));
const refCities = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'china-division', 'dist', 'cities.json'), 'utf8'));
refProvinces.forEach(p => { provinceNameMap[p.code] = p.name; });
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

// 补充仍缺失的乡镇（包括农场等之前被过滤的）
currentData.forEach(province => {
  const pName = province.label;
  const refProv = refMap[pName];
  if (!refProv) return;

  province.children.forEach(city => {
    let refCity = refProv[city.label] || refProv['市辖区'] || refProv['县'];
    if (!refCity) return;

    city.children.forEach(dist => {
      if (!dist.children) dist.children = [];
      const refArea = refCity.areas[dist.label];
      if (!refArea) return;

      const existingNames = new Set(dist.children.map(t => t.label));
      const missing = refArea.streets.filter(s => !existingNames.has(s));

      if (missing.length > 0) {
        missing.forEach(sName => {
          dist.children.push({
            label: sName,
            value: toPinyinValue(sName)
          });
          addedCount++;
        });
        details.push(`[补充乡镇] ${pName} > ${city.label} > ${dist.label}: +${missing.length} (${missing.slice(0,3).join(',')}${missing.length>3?'...':''})`);
      }
    });
  });
});

// 写入
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'address.json'), JSON.stringify(currentData), 'utf8');

console.log(`\n=== 第二轮补全完成 ===`);
console.log(`新增乡镇: ${addedCount}`);
details.forEach(d => console.log(d));

// 追加到报告
const reportPath = path.join(__dirname, 'address-patch-report.txt');
let report = fs.readFileSync(reportPath, 'utf8');
report += `\n\n=== 第二轮补全 ===\n新增乡镇: ${addedCount}\n`;
details.forEach(d => { report += d + '\n'; });
fs.writeFileSync(reportPath, report, 'utf8');
