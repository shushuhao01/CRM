"""Split backend route files into subdirectories"""
import os
import re

def read_file(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        return f.read()

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def find_route_blocks(content):
    """Find all top-level router.xxx() blocks with their line ranges"""
    lines = content.split('\n')
    blocks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match router.get/post/put/delete/patch
        m = re.match(r"^router\.(get|post|put|delete|patch)\('([^']+)'", line)
        if m:
            method = m.group(1).upper()
            path = m.group(2)
            start = i
            # Find the end of this route handler (matching closing });)
            brace_depth = 0
            for j in range(i, len(lines)):
                brace_depth += lines[j].count('{') - lines[j].count('}')
                if brace_depth == 0 and j > i:
                    # Include the closing });
                    end = j
                    blocks.append({
                        'method': method, 'path': path,
                        'start': start, 'end': end,
                        'lines': lines[start:end+1]
                    })
                    i = j + 1
                    break
            else:
                i += 1
        else:
            i += 1
    return blocks

def extract_imports_for_block(block_text, all_imports):
    """Determine which imports a block needs based on identifiers used"""
    needed = []
    for imp in all_imports:
        # Extract imported identifiers
        m = re.search(r'import\s+\{([^}]+)\}\s+from', imp)
        if m:
            idents = [x.strip().split(' as ')[-1].strip() for x in m.group(1).split(',')]
            for ident in idents:
                if ident and re.search(r'\b' + re.escape(ident) + r'\b', block_text):
                    needed.append(imp)
                    break
        else:
            # Default import
            m2 = re.search(r'import\s+(\w+)\s+from', imp)
            if m2 and m2.group(1) in block_text:
                needed.append(imp)
    return needed

# ============================================================
# SPLIT customers.ts
# ============================================================
print("=== Splitting customers.ts ===")

src = read_file('backend/src/routes/customers.ts')
lines = src.split('\n')

# Extract import section (lines before 'const router = Router()')
import_end = 0
imports = []
for i, line in enumerate(lines):
    if line.strip().startswith('import '):
        imports.append(line)
    if 'const router = Router()' in line:
        import_end = i
        break

# Find all route blocks
blocks = find_route_blocks(src)
print(f"Found {len(blocks)} route blocks")
for b in blocks:
    print(f"  {b['method']} {b['path']} (L{b['start']+1}-{b['end']+1})")

# Group routes
groups_routes = [b for b in blocks if '/groups' in b['path']]
tags_routes = [b for b in blocks if b['path'].startswith('/tags')]
related_routes = [b for b in blocks if re.match(r'^/:id/', b['path'])]
core_routes = [b for b in blocks if b not in groups_routes and b not in tags_routes and b not in related_routes]

def make_sub_file(route_group, name, relative_import_prefix='../../'):
    """Create a sub-route file content"""
    combined_text = '\n'.join('\n'.join(b['lines']) for b in route_group)

    # Determine needed imports
    needed_imports = []
    # Always need Router, Request, Response
    needed_imports.append("import { Router, Request, Response } from 'express';")

    # Check each original import
    for imp in imports:
        if 'express' in imp:
            continue  # Already added
        if 'authenticateToken' in imp:
            continue  # Applied at router level in index.ts
        if 'const router' in imp:
            continue
        # Fix relative paths
        fixed_imp = imp.replace("from '../", f"from '{relative_import_prefix}")
        fixed_imp = fixed_imp.replace("from '../../", f"from '{relative_import_prefix}../")

        # Check if any identifier from this import is used in the combined text
        m = re.search(r'import\s+\{([^}]+)\}\s+from', imp)
        if m:
            idents = [x.strip().split(' as ')[-1].strip() for x in m.group(1).split(',')]
            if any(ident and re.search(r'\b' + re.escape(ident) + r'\b', combined_text) for ident in idents):
                needed_imports.append(fixed_imp)
        else:
            m2 = re.search(r'import\s+(\w+)\s+from', imp)
            if m2 and m2.group(1) in combined_text:
                needed_imports.append(fixed_imp)

    # Check for log usage
    if 'log.' in combined_text and not any('logger' in imp for imp in needed_imports):
        needed_imports.append(f"import {{ log }} from '{relative_import_prefix}config/logger';")

    route_code = '\n\n'.join('\n'.join(b['lines']) for b in route_group)

    content = '\n'.join(needed_imports)
    content += f"\n\nexport function register{name}Routes(router: Router) {{\n"
    # Indent each line
    for line in route_code.split('\n'):
        content += line + '\n'
    content += "}\n"

    return content

# Generate sub-files
groups_content = make_sub_file(groups_routes, 'Group')
tags_content = make_sub_file(tags_routes, 'Tag')
core_content = make_sub_file(core_routes, 'Core')
related_content = make_sub_file(related_routes, 'Related')

write_file('backend/src/routes/customers/groups.ts', groups_content)
write_file('backend/src/routes/customers/tags.ts', tags_content)
write_file('backend/src/routes/customers/core.ts', core_content)
write_file('backend/src/routes/customers/related.ts', related_content)

# Generate index.ts
index_content = """import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { registerCoreRoutes } from './core';
import { registerGroupRoutes } from './groups';
import { registerTagRoutes } from './tags';
import { registerRelatedRoutes } from './related';

const router = Router();

// All customer routes require authentication
router.use(authenticateToken);

// Register route groups (order matters: named routes before /:id)
registerCoreRoutes(router);      // GET /, POST /, check-exists, stats, search, /:id CRUD
registerGroupRoutes(router);     // /groups/*
registerTagRoutes(router);       // /tags/*
registerRelatedRoutes(router);   // /:id/orders, /:id/services, etc.

export default router;
"""

write_file('backend/src/routes/customers/index.ts', index_content)

# Count lines
for name in ['index.ts', 'core.ts', 'groups.ts', 'tags.ts', 'related.ts']:
    path = f'backend/src/routes/customers/{name}'
    with open(path, 'r', encoding='utf-8') as f:
        count = len(f.readlines())
    print(f"  {name}: {count} lines")

print("\n=== Splitting calls.ts ===")

# Read calls.ts
src2 = read_file('backend/src/routes/calls.ts')
lines2 = src2.split('\n')

imports2 = []
for i, line in enumerate(lines2):
    if line.strip().startswith('import ') or line.strip().startswith('const recordingUpload') or line.strip().startswith('const multer') or line.strip().startswith('const path'):
        imports2.append(line)
    if 'const router = Router()' in line:
        break

blocks2 = find_route_blocks(src2)
print(f"Found {len(blocks2)} route blocks")

# Group calls routes
recording_routes = [b for b in blocks2 if '/recordings' in b['path']]
followup_routes = [b for b in blocks2 if '/followups' in b['path']]
config_routes = [b for b in blocks2 if '/config' in b['path'] or '/test-connection' in b['path'] or '/export' in b['path']]
task_routes = [b for b in blocks2 if '/outbound-tasks' in b['path'] or '/lines' in b['path']]
record_routes = [b for b in blocks2 if b not in recording_routes and b not in followup_routes and b not in config_routes and b not in task_routes]

for name, group in [('records', record_routes), ('recordings', recording_routes),
                     ('followups', followup_routes), ('config', config_routes), ('tasks', task_routes)]:
    content = make_sub_file(group, name.capitalize())
    write_file(f'backend/src/routes/calls/{name}.ts', content)
    with open(f'backend/src/routes/calls/{name}.ts', 'r', encoding='utf-8') as f:
        print(f"  {name}.ts: {len(f.readlines())} lines")

# calls index.ts
calls_index = """import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { registerRecordsRoutes } from './records';
import { registerRecordingsRoutes } from './recordings';
import { registerFollowupsRoutes } from './followups';
import { registerConfigRoutes } from './config';
import { registerTasksRoutes } from './tasks';

const router = Router();

router.use(authenticateToken);

// Register route groups
registerRecordsRoutes(router);
registerRecordingsRoutes(router);
registerFollowupsRoutes(router);
registerConfigRoutes(router);
registerTasksRoutes(router);

export default router;
"""
write_file('backend/src/routes/calls/index.ts', calls_index)

print("\n=== Splitting mobile.ts ===")

src3 = read_file('backend/src/routes/mobile.ts')
lines3 = src3.split('\n')

imports3 = []
for i, line in enumerate(lines3):
    if line.strip().startswith('import ') or line.strip().startswith('const ') and ('multer' in line or 'path' in line or 'upload' in line):
        imports3.append(line)
    if 'const router = Router()' in line:
        break

blocks3 = find_route_blocks(src3)
print(f"Found {len(blocks3)} route blocks")

# Group mobile routes
auth_routes = [b for b in blocks3 if b['path'] in ['/ping', '/login', '/bindQRCode', '/bind']]
device_routes = [b for b in blocks3 if '/device' in b['path']]
call_routes = [b for b in blocks3 if '/call' in b['path'] and '/call/' in b['path'] or b['path'] == '/calls']
stats_routes = [b for b in blocks3 if '/stats' in b['path']]
interface_routes = [b for b in blocks3 if '/interfaces' in b['path']]
other_routes = [b for b in blocks3 if b not in auth_routes and b not in device_routes and b not in call_routes and b not in stats_routes and b not in interface_routes]

# Merge small groups: auth + device, call + other
auth_device = auth_routes + device_routes
call_other = call_routes + other_routes

for name, group in [('auth', auth_device), ('calls', call_other),
                     ('stats', stats_routes), ('interfaces', interface_routes)]:
    if group:
        content = make_sub_file(group, name.capitalize())
        write_file(f'backend/src/routes/mobile/{name}.ts', content)
        with open(f'backend/src/routes/mobile/{name}.ts', 'r', encoding='utf-8') as f:
            print(f"  {name}.ts: {len(f.readlines())} lines")

# mobile index.ts
mobile_index = """import { Router } from 'express';
import { registerAuthRoutes } from './auth';
import { registerCallsRoutes } from './calls';
import { registerStatsRoutes } from './stats';
import { registerInterfacesRoutes } from './interfaces';

const router = Router();

// Register route groups (auth routes handle their own middleware)
registerAuthRoutes(router);
registerCallsRoutes(router);
registerStatsRoutes(router);
registerInterfacesRoutes(router);

export default router;
"""
write_file('backend/src/routes/mobile/index.ts', mobile_index)

print("\nDone! All route files split.")


