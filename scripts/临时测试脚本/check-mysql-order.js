/**
 * 检查MySQL数据库中订单的代收状态
 */

const mysql = require('mysql2/promise');

const orderNumber = process.argv[2] || 'ORD20260225262567';

// 生产数据库配置
const config = {
  host: 'localhost',
  port: 3306,
  user: 'abc789',
  password: 'YtZWJPF2bpsCscHX',
  database: 'crm_local'
};

async function checkOrder() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('已连接到MySQL数据库:', config.database);

    // 查询订单
    const [rows] = await connection.execute(
      'SELECT * FROM orders WHERE order_number = ?',
      [orderNumber]
    );

    if (rows.length === 0) {
      console.log(`\n订单 ${orderNumber} 不存在`);
      return;
    }

    const order = rows[0];
    const totalAmount = parseFloat(order.total_amount) || 0;
    const depositAmount = parseFloat(order.deposit_amount) || 0;
    const codAmount = order.cod_amount !== null ? parseFloat(order.cod_amount) : null;
    const originalCodAmount = totalAmount - depositAmount;

    console.log('\n订单信息:');
    console.log('='.repeat(60));
    console.log('订单号:', order.order_number);
    console.log('客户:', order.customer_name);
    console.log('订单状态:', order.status);
    console.log('订单总额:', totalAmount.toFixed(2));
    console.log('定金:', depositAmount.toFixed(2));
    console.log('原始代收金额:', originalCodAmount.toFixed(2));
    console.log('='.repeat(60));
    console.log('当前代收金额 (cod_amount):', codAmount !== null ? codAmount.toFixed(2) : 'NULL');
    console.log('代收状态 (cod_status):', order.cod_status || 'NULL');
    console.log('取消代收时间 (cod_cancelled_at):', order.cod_cancelled_at || 'NULL');
    console.log('返款时间 (cod_returned_at):', order.cod_returned_at || 'NULL');
    console.log('='.repeat(60));

    // 判断应该在哪个标签页
    let expectedTab = '';
    if (order.cod_status === 'pending' || !order.cod_status) {
      expectedTab = '待处理';
    } else if (order.cod_status === 'cancelled') {
      expectedTab = '已改代收';
    } else if (order.cod_status === 'returned') {
      expectedTab = '已返款';
    }

    console.log('应该出现在代收管理的标签页:', expectedTab);

    // 判断是否修改过
    if (codAmount !== null && codAmount !== originalCodAmount) {
      console.log('订单列表是否显示"已改"标识: 是');
      console.log('tooltip内容: 已改代收为¥' + codAmount.toFixed(2));
    } else {
      console.log('订单列表是否显示"已改"标识: 否');
    }

    console.log('='.repeat(60));

  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkOrder();
