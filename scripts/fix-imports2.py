import os, glob

base = r'D:\kaifa\CRM - 1.8.0'
dirs = [
    os.path.join(base, 'backend', 'src', 'routes', 'customers'),
    os.path.join(base, 'backend', 'src', 'routes', 'calls'),
    os.path.join(base, 'backend', 'src', 'routes', 'mobile'),
]

total_fixed = 0
for d in dirs:
    for f in sorted(glob.glob(os.path.join(d, '*.ts'))):
        bn = os.path.basename(f)
        if bn == 'index.ts':
            continue
        with open(f, 'r', encoding='utf-8') as fh:
            content = fh.read()
        old_str = "from '../../../"
        new_str = "from '../../"
        count = content.count(old_str)
        if count > 0:
            fixed = content.replace(old_str, new_str)
            with open(f, 'w', encoding='utf-8') as fh:
                fh.write(fixed)
            total_fixed += count
            print('Fixed ' + str(count) + ' imports in ' + bn)
        else:
            print('OK: ' + bn)

print('Total fixed: ' + str(total_fixed))

