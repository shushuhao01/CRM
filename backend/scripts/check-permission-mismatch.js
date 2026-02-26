const mysql = require('mysql2/promise');

// 从 permissionService.js 导入权限树
const PERMISSION_TREE = [
  // 1. 数据看板
  {
    id: 'dashboard',
    children: [
      { id: 'dashboard.view' },
      { id: 'dashboard.export' }
    ]
  },
  // 2. 客户管理
  {
    id: 'customer',
    children: [
      {
        id: 'customer.list',
        children: [
          { id: 'customer.list.view' },
          { id: 'customer.list.export' },
          { id: 'customer.list.import' },
          { id: 'customer.list.edit' },
          { id: 'customer.list.delete' },
          { id: 'customer.list.assign' }
        ]
      },
      {
        id: 'customer.add',
        children: [
          { id: 'customer.add.create' }
        ]
      },
      {
        id: 'customer.groups',
        children: [
          { id: 'customer.groups.view' },
          { id: 'customer.groups.create' },
          { id: 'customer.groups.edit' },
          { id: 'customer.groups.delete' }
        ]
      },
      {
        id: 'customer.tags',
        children: [
          { id: 'customer.tags.view' },
          { id: 'customer.tags.create' },
          { id: 'customer.tags.edit' },
          { id: 'customer.tags.delete' }
        ]
      }
    ]
  },
  // 3. 订单管理
  {
    id: 'order',
    children: [
      {
        id: 'order.list',
        children: [
          { id: 'order.list.view' },
          { id: 'order.list.export' },
          { id: 'order.list.edit' },
          { id: 'order.list.delete' },
          { id: 'order.list.cancel' }
        ]
      },
      {
        id: 'order.add',
        children: [
          { id: 'order.add.create' }
        ]
      },
      {
        id: 'order.audit',
        children: [
          { id: 'order.audit.view' },
          { id: 'order.audit.approve' },
          { id: 'order.audit.reject' },
          { id: 'order.audit.batch' }
        ]
      }
    ]
  },
  // 4. 服务管理
  {
    id: 'communication',
    children: [
      {
        id: 'communication.call',
        children: [
          { id: 'communication.call.view' },
          { id: 'communication.call.make' },
          { id: 'communication.call.record' }
        ]
      },
      {
        id: 'communication.sms',
        children: [
          { id: 'communication.sms.view' },
          { id: 'communication.sms.send' },
          { id: 'communication.sms.template' }
        ]
      }
    ]
  },
  // 5. 业绩统计
  {
    id: 'performance',
    children: [
      {
        id: 'performance.personal',
        children: [
          { id: 'performance.personal.view' },
          { id: 'performance.personal.export' }
        ]
      },
      {
        id: 'performance.team',
        children: [
          { id: 'performance.team.view' },
          { id: 'performance.team.export' }
        ]
      },
      {
        id: 'performance.analysis',
        children: [
          { id: 'performance.analysis.view' },
          { id: 'performance.analysis.export' }
        ]
      },
      {
        id: 'performance.share',
        children: [
          { id: 'performance.share.view' },
          { id: 'performance.share.create' },
          { id: 'performance.share.manage' }
        ]
      }
    ]
  },
  // 6. 物流管理
  {
    id: 'logistics',
    children: [
      {
        id: 'logistics.shipping',
        children: [
          { id: 'logistics.shipping.view' },
          { id: 'logistics.shipping.create' },
          { id: 'logistics.shipping.edit' },
          { id: 'logistics.shipping.export' }
        ]
      },
      {
        id: 'logistics.list',
        children: [
          { id: 'logistics.list.view' },
          { id: 'logistics.list.export' }
        ]
      },
      {
        id: 'logistics.track',
        children: [
          { id: 'logistics.track.view' },
          { id: 'logistics.track.update' }
        ]
      },
      {
        id: 'logistics.status',
        children: [
          { id: 'logistics.status.view' },
          { id: 'logistics.status.update' },
          { id: 'logistics.status.batch' }
        ]
      },
      {
        id: 'logistics.companies',
        children: [
          { id: 'logistics.companies.view' },
          { id: 'logistics.companies.create' },
          { id: 'logistics.companies.edit' }
        ]
      }
    ]
  },
  // 7. 售后管理 - 使用 aftersale
  {
    id: 'aftersale',
    children: [
      {
        id: 'aftersale.list',
        children: [
          { id: 'aftersale.list.view' },
          { id: 'aftersale.list.export' },
          { id: 'aftersale.list.edit' },
          { id: 'aftersale.list.delete' }
        ]
      },
      {
        id: 'aftersale.add',
        children: [
          { id: 'aftersale.add.create' }
        ]
      },
      {
        id: 'aftersale.data',
        children: [
          { id: 'aftersale.data.view' },
          { id: 'aftersale.data.export' }
        ]
      }
    ]
  },
  // 8. 资料管理
  {
    id: 'data',
    children: [
      {
        id: 'data.list',
        children: [
          { id: 'data.list.view' },
          { id: 'data.list.export' },
          { id: 'data.list.import' },
          { id: 'data.list.assign' }
        ]
      },
      {
        id: 'data.search',
        children: [
          { id: 'data.search.basic' },
          { id: 'data.search.advanced' },
          { id: 'data.search.export' }
        ]
      },
      {
        id: 'data.recycle',
        children: [
          { id: 'data.recycle.view' },
          { id: 'data.recycle.restore' },
          { id: 'data.recycle.delete' }
        ]
      }
    ]
  },
  // 10. 财务管理
  {
    id: 'finance',
    children: [
      {
        id: 'finance.performance_data',
        children: [
          { id: 'finance.performance_data.view' }
        ]
      },
      {
        id: 'finance.performance_manage',
        children: [
          { id: 'finance.performance_manage.view' },
          { id: 'finance.performance_manage.edit' },
          { id: 'finance.performance_manage.config' }
        ]
      },
      {
        id: 'finance.cod_collection',
        children: [
          { id: 'finance.cod_collection.view' },
          { id: 'finance.cod_collection.export' },
          { id: 'finance.cod_collection.edit' },
          { id: 'finance.cod_collection.refund' }
        ]
      },
      {
        id: 'finance.cod_application',
        children: [
          { id: 'finance.cod_application.view' },
          { id: 'finance.cod_application.create' },
          { id: 'finance.cod_application.cancel' }
        ]
      },
      {
        id: 'finance.cod_review',
        children: [
          { id: 'finance.cod_review.view' },
          { id: 'finance.cod_review.approve' },
          { id: 'finance.cod_review.reject' },
          { id: 'finance.cod_review.batch' }
        ]
      }
    ]
  }
];

// 收集所有权限ID
function collectAllPermissionIds(tree) {
  const ids = [];

  function traverse(nodes) {
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(tree);
  return ids;
}

async function checkMismatch() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'abc789',
    password: 'YtZWJPF2bpsCscHX',
    database: 'crm_local'
  });

  try {
    console.log('=== 检查权限ID不匹配问题 ===\n');

    // 收集权限树中的所有ID
    const treeIds = collectAllPermissionIds(PERMISSION_TREE);
    console.log(`权限树中的权限ID数量: ${treeIds.length}个\n`);

    // 查询数据库中的权限
    const [rows] = await connection.execute(
      `SELECT
        id,
        name,
        code,
        permissions
      FROM roles
      WHERE code IN ('department_manager', 'sales_staff')
      ORDER BY id`
    );

    rows.forEach(row => {
      console.log(`\n角色: ${row.name} (${row.code})`);

      if (row.permissions) {
        const dbPermissions = Array.isArray(row.permissions)
          ? row.permissions
          : Object.values(row.permissions);

        console.log(`数据库中的权限数量: ${dbPermissions.length}个`);

        // 检查不匹配的权限ID
        const mismatched = dbPermissions.filter(p => !treeIds.includes(p));
        const matched = dbPermissions.filter(p => treeIds.includes(p));

        console.log(`匹配的权限数量: ${matched.length}个`);
        console.log(`不匹配的权限数量: ${mismatched.length}个`);

        if (mismatched.length > 0) {
          console.log(`\n不匹配的权限ID:`);
          mismatched.forEach((p, i) => {
            console.log(`  ${i + 1}. ${p}`);
          });
        }
      }
      console.log('\n' + '='.repeat(80));
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await connection.end();
  }
}

checkMismatch();
