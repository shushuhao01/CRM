const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, '..', 'src', 'views', 'Wecom', 'AddressBook.vue')
const buf = fs.readFileSync(file)
console.log('File size:', buf.length)
console.log('BOM:', buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF ? 'UTF-8 BOM' : 'No BOM')
const content = buf.toString('utf8')
console.log('Contains 通讯录:', content.includes('通讯录'))
console.log('Contains 通讯�:', content.includes('通讯�'))
// Find truncated chars
const lines = content.split('\n')
for (let i = 0; i < Math.min(20, lines.length); i++) {
  if (lines[i].includes('�') || lines[i].includes('\ufffd')) {
    console.log(`Line ${i+1} has replacement char: ${lines[i].trim().substring(0, 80)}`)
  }
}

