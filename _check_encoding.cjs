const fs = require('fs');
const data = fs.readFileSync('backend/src/routes/orders/orderCrud.ts');
// Check for BOM
console.log('BOM:', data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF ? 'Yes' : 'No');
console.log('File size:', data.length);

// Find U+FFFD replacement characters (EF BF BD in UTF-8)
let count = 0;
const positions = [];
for (let i = 0; i < data.length - 2; i++) {
  if (data[i] === 0xEF && data[i+1] === 0xBF && data[i+2] === 0xBD) {
    count++;
    const start = Math.max(0, i - 30);
    const end = Math.min(data.length, i + 33);
    const ctx = data.slice(start, end).toString('utf-8');
    positions.push({ pos: i, ctx });
  }
}
console.log('Replacement chars (U+FFFD):', count);
positions.forEach(p => console.log(`  At ${p.pos}: ${p.ctx}`));

// Also check for any invalid UTF-8 sequences
try {
  const text = data.toString('utf-8');
  // Node doesn't throw on invalid UTF-8, it replaces with U+FFFD
  const reencoded = Buffer.from(text, 'utf-8');
  if (Buffer.compare(data, reencoded) !== 0) {
    console.log('WARNING: File contains bytes that are not valid UTF-8');
  } else {
    console.log('File re-encodes identically');
  }
} catch(e) {
  console.log('Error:', e.message);
}

