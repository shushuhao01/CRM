// Fix corrupted Chinese characters in orderCrud.ts
// The pattern is U+FFFD followed by ? (or sometimes just U+FFFD)
// Each represents a lost Chinese character that we need to restore from context

const fs = require('fs');
const filePath = 'backend/src/routes/orders/orderCrud.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Show all lines with replacement characters
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('\uFFFD')) {
    console.log(`Line ${i+1}: ${line.trim().substring(0, 120)}`);
  }
});

console.log('\n--- Total lines with FFFD:', lines.filter(l => l.includes('\uFFFD')).length);

