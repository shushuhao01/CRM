/**
 * 测试环比计算函数
 */

const calculateChange = (current, previous) => {
  // 如果昨天/上月为0
  if (previous === 0) {
    if (current > 0) {
      // 从0增长到有数据，显示+100%
      return { change: 100, trend: 'up' };
    }
    // 都为0，显示0%
    return { change: 0, trend: 'stable' };
  }

  // 如果今天/本月为0，但昨天/上月有数据
  if (current === 0) {
    // 从有数据降到0，显示-100%
    return { change: -100, trend: 'down' };
  }

  // 正常计算环比
  const change = Number((((current - previous) / previous) * 100).toFixed(1));
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
  return { change, trend };
};

console.log('=== 环比计算测试 ===\n');

// 测试用例
const testCases = [
  { current: 0, previous: 0, expected: { change: 0, trend: 'stable' }, desc: '都为0' },
  { current: 1, previous: 0, expected: { change: 100, trend: 'up' }, desc: '从0增长到1' },
  { current: 0, previous: 1, expected: { change: -100, trend: 'down' }, desc: '从1降到0' },
  { current: 10, previous: 5, expected: { change: 100, trend: 'up' }, desc: '从5增长到10' },
  { current: 5, previous: 10, expected: { change: -50, trend: 'down' }, desc: '从10降到5' },
  { current: 10, previous: 10, expected: { change: 0, trend: 'stable' }, desc: '持平' },
  { current: 366, previous: 0, expected: { change: 100, trend: 'up' }, desc: '从0增长到366（截图场景）' },
];

testCases.forEach((test, index) => {
  const result = calculateChange(test.current, test.previous);
  const pass = result.change === test.expected.change && result.trend === test.expected.trend;

  console.log(`测试 ${index + 1}: ${test.desc}`);
  console.log(`  当前: ${test.current}, 上期: ${test.previous}`);
  console.log(`  期望: change=${test.expected.change}, trend=${test.expected.trend}`);
  console.log(`  实际: change=${result.change}, trend=${result.trend}`);
  console.log(`  结果: ${pass ? '✓ 通过' : '✗ 失败'}\n`);
});
