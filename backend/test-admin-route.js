// 测试admin路由是否正确注册
const express = require('express');

// 模拟检查路由注册
console.log('检查admin路由注册...\n');

const testRoutes = [
  '/api/v1/admin/auth/login',
  '/api/v1/admin/dashboard/stats',
  '/api/v1/admin/licenses',
  '/api/v1/admin/tenants'
];

const http = require('http');

async function testRoute(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          response: data
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path,
        error: error.message
      });
    });

    req.end();
  });
}

async function runTests() {
  for (const route of testRoutes) {
    const result = await testRoute(route);
    console.log(`\n路由: ${result.path}`);
    console.log(`状态码: ${result.status || 'ERROR'}`);
    if (result.error) {
      console.log(`错误: ${result.error}`);
    } else {
      try {
        const json = JSON.parse(result.response);
        console.log(`响应: ${JSON.stringify(json, null, 2)}`);
      } catch (e) {
        console.log(`响应: ${result.response.substring(0, 200)}`);
      }
    }
  }
}

runTests();
