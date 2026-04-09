# CRM系统全流程测试 - 文件索引

> 更新时间: 2026-04-07

## 📁 目录结构

```
tests/
├── README.md                        # 本文件
├── package.json                     # CommonJS配置(避免ESM冲突)
├── copy-files.js                    # 文件复制工具
│
├── CRM系统全流程测试计划-v1.0.md     # 总体测试规划文档
├── CRM测试数据详细规划.md            # 测试数据规划文档
│
├── 第1阶段 - Admin管理后台
│   ├── test-phase1.js               # 测试脚本
│   ├── test-phase1-result.json      # 结果数据
│   ├── test-phase1-report.md        # 报告 ✅ 14/14 通过
│   └── test-phase1-output.txt       # 控制台输出
│
├── 第1阶段辅助脚本
│   ├── test-init-admin.js           # 管理员初始化
│   ├── test-init-output.txt         # 初始化输出
│   ├── test-create-admins.js        # 批量创建管理员
│   └── test-create-admins-output.txt # 创建输出
│
├── 第2-3阶段 - 官网会员 + CRM登录
│   ├── test-phase2-3.js             # 测试脚本
│   ├── test-phase2-3-result.json    # 结果数据
│   ├── test-phase2-3-report.md      # 报告 ✅ 16/23 通过(76%)
│   └── test-phase2-3-output.txt     # 控制台输出
│
└── 第4-5阶段 - 客户管理 + 订单商品
    ├── test-phase4-5.js             # 测试脚本
    ├── test-phase4-5-result.json    # 结果数据
    ├── test-phase4-5-report.md      # 报告 ✅ 24/26 通过(92%)
    └── test-phase4-5-output.txt     # 控制台输出
```

## 🚀 运行说明

所有测试脚本需要在 `backend/` 目录的环境下运行：

```bash
# 第1阶段: Admin后台
cd backend && node ../tests/test-phase1.js

# 管理员初始化(第1阶段前置)
cd backend && npx cross-env DOTENV_CONFIG_PATH=.env.local node -r dotenv/config ../tests/test-init-admin.js

# 第2-3阶段: 官网 + CRM登录
cd backend && node ../tests/test-phase2-3.js

# 第4-5阶段: 客户管理 + 订单商品
cd backend && node ../tests/test-phase4-5.js
```

## 📊 测试结果汇总

| 阶段 | 说明 | 通过 | 失败 | 跳过 | 总计 | 通过率 |
|------|------|------|------|------|------|--------|
| 第1阶段 | Admin管理后台 | 14 | 0 | 0 | 14 | 100% ✅ |
| 第2-3阶段 | 官网+CRM登录 | 16 | 5 | 2 | 23 | 76% 🟡 |
| 第4-5阶段 | 客户+订单+额外 | 24 | 1 | 1 | 26 | 92% ✅ |
| **合计** | | **54** | **6** | **3** | **63** | **86%** |

### 已知问题
1. **标签列表路由冲突** (C-050) - 已修复源码，需后端重启生效
2. **第2-3阶段路由404** - 部分测试路径与实际API路由不完全匹配(非系统Bug)
