// 一次性脚本：向地址包补充新疆维吾尔自治区12个自治区直辖县级市（仅追加，不删除/修改现有数据）
// 数据来源：行政区划网 xzqh.org 2025年自治区直辖县级行政区划
import fs from 'node:fs'

const FILES = [
  new URL('../public/data/address.json', import.meta.url),
  new URL('../dist/data/address.json', import.meta.url)
]

const jd = (label, value) => ({ label, value })

const NEW_CITIES = [
  {
    label: '石河子市', value: 'shihezi',
    streets: [
      jd('新城街道', 'xinchengjiedao'), jd('向阳街道', 'xiangyangjiedao'), jd('红山街道', 'hongshanjiedao'),
      jd('老街街道', 'laojiejiedao'), jd('东城街道', 'dongchengjiedao'), jd('北泉镇', 'beiquanzhen'), jd('石河子镇', 'shihezizhen')
    ]
  },
  {
    label: '阿拉尔市', value: 'alaer',
    streets: [
      jd('幸福路街道', 'xingfulujiedao'), jd('金银川路街道', 'jinyinchuanlujiedao'), jd('青松路街道', 'qingsonglujiedao'),
      jd('南口街道', 'nankoujiedao'), jd('金银川镇', 'jinyinchuanzhen'), jd('双城镇', 'shuangchengzhen'),
      jd('沙河镇', 'shahezhen'), jd('永宁镇', 'yongningzhen'), jd('新井子镇', 'xinjingzizhen'),
      jd('甘泉镇', 'ganquanzhen'), jd('花桥镇', 'huaqiaozhen'), jd('幸福镇', 'xingfuzhen'),
      jd('金杨镇', 'jinyangzhen'), jd('玛滩镇', 'matanzhen'), jd('塔门镇', 'tamenzhen'),
      jd('梨花镇', 'lihuazhen'), jd('昌安镇', 'changanzhen'), jd('塔南镇', 'tananzhen'),
      jd('新开岭镇', 'xinkailingzhen'), jd('托喀依乡', 'tuokayixiang')
    ]
  },
  {
    label: '图木舒克市', value: 'tumushuke',
    streets: [
      jd('锦绣街道', 'jinxiujiedao'), jd('前海街道', 'qianhaijiedao'), jd('永安坝街道', 'yonganbajiedao'),
      jd('草湖镇', 'caohuzhen'), jd('龙口镇', 'longkouzhen'), jd('前海镇', 'qianhaizhen'),
      jd('永兴镇', 'yongxingzhen'), jd('兴安镇', 'xinganzhen'), jd('嘉和镇', 'jiahezhen'),
      jd('河东镇', 'hedongzhen'), jd('夏河镇', 'xiahezhen'), jd('永安镇', 'yonganzhen'),
      jd('海安镇', 'haianzhen'), jd('唐驿镇', 'tangyizhen'), jd('金胡杨镇', 'jinhuyangzhen'),
      jd('东风镇', 'dongfengzhen'), jd('杏花镇', 'xinghuazhen'), jd('兴边镇', 'xingbianzhen'),
      jd('红石榴镇', 'hongshiliuzhen')
    ]
  },
  {
    label: '五家渠市', value: 'wujiaqu',
    streets: [
      jd('军垦路街道', 'junkenlujiedao'), jd('青湖路街道', 'qinghulujiedao'), jd('人民路街道', 'renminlujiedao'),
      jd('梧桐镇', 'wutongzhen'), jd('蔡家湖镇', 'caijiahuzhen'), jd('青湖镇', 'qinghuzhen')
    ]
  },
  {
    label: '北屯市', value: 'beitun',
    streets: [
      jd('天骄街道', 'tianjiaojiedao'), jd('龙疆街道', 'longjiangjiedao'), jd('军垦街道', 'junkenjiedao'),
      jd('双渠镇', 'shuangquzhen'), jd('丰庆镇', 'fengqingzhen'), jd('海川镇', 'haichuanzhen')
    ]
  },
  {
    label: '铁门关市', value: 'tiemenguan',
    streets: [
      jd('迎宾街道', 'yingbinjiedao'), jd('博古其镇', 'boguqizhen'), jd('双丰镇', 'shuangfengzhen'),
      jd('河畔镇', 'hepanzhen'), jd('高桥镇', 'gaoqiaozhen'), jd('天湖镇', 'tianhuzhen'),
      jd('开泽镇', 'kaizezhen'), jd('米兰镇', 'milanzhen'), jd('金山镇', 'jinshanzhen'),
      jd('南屯镇', 'nantunzhen'), jd('开来镇', 'kailaizhen'), jd('西海镇', 'xihaizhen'),
      jd('罗杨镇', 'luoyangzhen'), jd('营盘镇', 'yingpanzhen'), jd('蒲昌镇', 'puchangzhen')
    ]
  },
  {
    label: '双河市', value: 'shuanghe',
    streets: [
      jd('明珠街道', 'mingzhujiedao'), jd('双桥镇', 'shuangqiaozhen'), jd('石峪镇', 'shiyuzhen'),
      jd('博河镇', 'bohezhen'), jd('双乐镇', 'shuanglezhen'), jd('友谊镇', 'youyizhen')
    ]
  },
  {
    label: '可克达拉市', value: 'kekedala',
    streets: [
      jd('金山街道', 'jinshanjiedao'), jd('花城街道', 'huachengjiedao'), jd('榆树庄镇', 'yushuzhuangzhen'),
      jd('苇湖镇', 'weihuzhen'), jd('长丰镇', 'changfengzhen'), jd('金梁镇', 'jinliangzhen'), jd('金屯镇', 'jintunzhen')
    ]
  },
  {
    label: '昆玉市', value: 'kunyu',
    streets: [
      jd('玉都街道', 'yudujiedao'), jd('老兵镇', 'laobingzhen'), jd('昆泉镇', 'kunquanzhen'),
      jd('昆牧镇', 'kunmuzhen'), jd('玉泉镇', 'yuquanzhen'), jd('玉园镇', 'yuyuanzhen')
    ]
  },
  {
    label: '胡杨河市', value: 'huyanghe',
    streets: [jd('胡杨街道', 'huyangjiedao'), jd('共青镇', 'gongqingzhen')]
  },
  {
    label: '新星市', value: 'xinxing',
    streets: [jd('二道湖镇', 'erdaohuzhen'), jd('骆驿镇', 'luoyizhen'), jd('黄田镇', 'huangtianzhen')]
  },
  {
    label: '白杨市', value: 'baiyang',
    streets: [jd('小白杨镇', 'xiaobaiyangzhen'), jd('富兴镇', 'fuxingzhen'), jd('金玉镇', 'jinyuzhen'), jd('锦绣镇', 'jinxiuzhen')]
  }
]

for (const file of FILES) {
  if (!fs.existsSync(file)) {
    console.log(`跳过（不存在）: ${file.pathname}`)
    continue
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const xj = data.find(p => p.value === 'xinjiang')
  if (!xj) {
    console.error(`未找到新疆节点: ${file.pathname}`)
    continue
  }
  const existingLabels = new Set(xj.children.map(c => c.label))
  const existingValues = new Set(xj.children.map(c => c.value))
  let added = 0
  for (const city of NEW_CITIES) {
    if (existingLabels.has(city.label) || existingValues.has(city.value)) {
      console.log(`已存在，跳过: ${city.label}`)
      continue
    }
    xj.children.push({
      label: city.label,
      value: city.value,
      children: [{ label: city.label, value: `${city.value}_city`, children: city.streets }]
    })
    added++
  }
  fs.writeFileSync(file, JSON.stringify(data), 'utf8')
  console.log(`${file.pathname} -> 新增 ${added} 个直辖县级市，新疆城市总数: ${xj.children.length}`)
}
console.log('完成')
