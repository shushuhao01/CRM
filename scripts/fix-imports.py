import os, glob

dirs = ['backend/src/routes/customers', 'backend/src/routes/calls', 'backend/src/routes/mobile']
for d in dirs:
    for f in sorted(glob.glob(d + '/*.ts')):
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
            print('Fixed %d in %s' % (count, f))
        else:
            print('OK: ' + f)

