import sys
with open('backend/src/routes/orders/orderCrud.ts', 'rb') as f:
    data = f.read()
try:
    data.decode('utf-8')
    print('File is valid UTF-8')
except UnicodeDecodeError as e:
    print('Invalid UTF-8 at position', e.start)

# Check for replacement chars (EF BF BD = U+FFFD)
count = data.count(b'\xef\xbf\xbd')
print('Replacement chars found:', count)

# Find all occurrences
pos = 0
while True:
    idx = data.find(b'\xef\xbf\xbd', pos)
    if idx == -1:
        break
    ctx_start = max(0, idx - 30)
    ctx_end = min(len(data), idx + 33)
    ctx = data[ctx_start:ctx_end]
    try:
        decoded = ctx.decode('utf-8', errors='replace')
    except:
        decoded = str(ctx)
    print(f'  At {idx}: ...{decoded}...')
    pos = idx + 3

