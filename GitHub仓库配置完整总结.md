# GitHub仓库配置完整总结

## 📊 当前仓库结构

### 主仓库 (D:\kaifa\CRM - 1.8.0)
```
仓库类型: Git主仓库
远程配置:
├── origin          https://github.com/shushuhao01/CRM.git (主开发仓库)
├── crm-admin       https://github.com/shushuhao01/crm-admin.git
├── crm-website     https://github.com/shushuhao01/crm-website.git
└── crm-system      https://github.com/shushuhao01/crm-system.git

包含内容:
├── src/              (CRM前端)
├── backend/          (CRM后端)
├── website/          (官网 - 通过subtree推送到crm-website)
├── admin/            (Admin后台 - 通过subtree推送到crm-admin)
├── database/         (数据库)
├── docs/             (文档)
└── ...

排除内容 (.gitignore):
└── crmAPP/           (独立Git仓库，不在主仓库管理中)
```

### crmAPP子仓库 (D:\kaifa\CRM - 1.8.0\crmAPP)
```
仓库类型: 独立Git仓库
远程配置:
└── origin          https://github.com/shushuhao01/crm-app.git ✅ 已更新

状态: 完全独立管理，不在主仓库的Git控制中
```

---

## 🎯 GitHub仓库列表

### 1. CRM (主仓库)
```
地址: https://github.com/shushuhao01/CRM.git
用途: 你自己的主开发仓库
包含: 所有代码（CRM + 官网 + Admin）
```

### 2. crm-system (客户交付仓库)
```
地址: https://github.com/shushuhao01/crm-system.git
用途: 交付给购买私有部署的客户
包含: 只有CRM系统（排除website、admin、crmAPP）
```

### 3. crm-website (官网仓库)
```
地址: https://github.com/shushuhao01/crm-website.git
用途: 官网独立部署
包含: 只有website目录
```

### 4. crm-admin (后台仓库)
```
地址: https://github.com/shushuhao01/crm-admin.git
用途: Admin后台独立部署
包含: 只有admin目录
```

### 5. crm-app (移动端仓库)
```
地址: https://github.com/shushuhao01/crm-app.git ✅ 已更新
用途: 移动端独立部署
包含: 只有crmAPP目录
原名: CRMapp (已重命名)
```

---

## 🔄 同步方式说明

### 主仓库、官网、Admin、CRM系统
使用同步脚本一键同步：
```powershell
.\sync-repos-v2.ps1 -message "更新说明"
```

脚本会自动：
- 推送到主仓库 (CRM)
- 同步到 crm-system (排除website、admin)
- 同步到 crm-website (只推送website目录)
- 同步到 crm-admin (只推送admin目录)

### crmAPP (移动端)
独立管理，需要单独操作：
```powershell
cd crmAPP
git add .
git commit -m "更新移动端"
git push origin main
```

---

## 📝 日常开发流程

### 修改CRM、官网或Admin
```powershell
# 1. 正常开发
# 修改任何文件...

# 2. 提交到主仓库
git add .
git commit -m "更新功能"
git push origin main

# 3. 一键同步到子仓库
.\sync-repos-v2.ps1 -message "更新功能"
```

### 修改移动端
```powershell
# 1. 进入crmAPP目录
cd crmAPP

# 2. 正常Git操作
git add .
git commit -m "更新移动端"
git push origin main

# 3. 返回主目录
cd ..
```

---

## 🔧 IDE储存库显示

### 主仓库
IDE会显示主仓库的远程配置：
- origin (CRM主仓库)
- crm-admin
- crm-website
- crm-system

### crmAPP
IDE会单独显示crmAPP的远程配置：
- origin (crm-app仓库) ✅ 已更新为新地址

---

## ✅ 最近的更新

### 2026-03-02
1. ✅ 创建并推送 crm-system 仓库（客户交付用）
2. ✅ 更新 crmAPP 远程仓库地址（CRMapp → crm-app）
3. ✅ 完善同步脚本和文档

---

## 🎯 仓库命名规范

现在所有仓库都遵循统一的命名规范：
- ✅ crm-system (小写，连字符)
- ✅ crm-website (小写，连字符)
- ✅ crm-admin (小写，连字符)
- ✅ crm-app (小写，连字符) ← 刚刚更新

---

## ❓ 常见问题

### Q: 为什么crmAPP是独立仓库？
A: 因为移动端项目可能需要独立部署和管理，所以设置为独立仓库。

### Q: crmAPP会被同步脚本管理吗？
A: 不会。crmAPP是完全独立的，需要单独操作。

### Q: 重命名GitHub仓库有影响吗？
A: 对本地代码没影响，只需要更新远程地址。GitHub会自动重定向旧地址。

### Q: IDE储存库显示会变吗？
A: 会的。更新远程地址后，IDE会显示新的仓库地址。

### Q: 需要通知其他协作者吗？
A: 建议通知，让他们也更新远程地址，虽然GitHub会重定向。

---

## 📚 相关文档

- `crmAPP仓库地址更新说明.md` - crmAPP更新详情
- `仓库分离完成-快速参考.md` - 仓库分离快速参考
- `同步命令快速参考卡.md` - 同步命令参考
- `日常开发同步流程.md` - 日常开发流程

---

## ✨ 总结

### 仓库配置
- ✅ 5个GitHub仓库全部配置完成
- ✅ 主仓库配置4个远程仓库
- ✅ crmAPP独立仓库配置完成
- ✅ 所有仓库命名统一规范

### 同步方式
- ✅ 主仓库、官网、Admin、CRM系统：一键同步
- ✅ crmAPP：独立管理

### 本地开发
- ✅ 继续在同一目录开发
- ✅ 开发体验完全不变
- ✅ 商业机密得到保护

---

**更新时间**: 2026-03-02  
**状态**: ✅ 全部完成  
**下一步**: 正常开发，需要时运行同步脚本
