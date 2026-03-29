# 本地Monorepo + GitHub多仓库方案

## 问题分析

你目前的情况：
- ✅ 本地在同一个项目目录开发（方便）
- ❌ GitHub也是单仓库（不安全，客户会看到所有代码）

## 最佳解决方案

**保持本地Monorepo结构，GitHub分离多仓库**

### 方案对比

| 方案 | 本地开发 | GitHub | 优点 | 缺点 |
|------|---------|--------|------|------|
| 方案A | Monorepo | Monorepo | 简单 | 不安全 ❌ |
| 方案B | 分离 | 分离 | 安全 | 开发不便 ❌ |
| **方案C** | **Monorepo** | **分离** | **安全+方便** ✅ | 需要配置 |

## 推荐：方案C（最佳）

### 本地目录结构（保持不变）

```
D:\kaifa\CRM - 1.8.0\          # 你的本地开发目录
├── src/                        # CRM前端
├── backend/                    # CRM后端
├── website/                    # 官网
├── admin/                      # Admin后台
├── crmAPP/                     # 移动端
├── database/                   # 数据库
├── docs/                       # 文档
├── .git/                       # 主Git仓库
└── package.json
```

### GitHub仓库结构（分离）

```
GitHub:
├── crm-system          (私有) - 只包含CRM主系统
├── crm-website         (私有) - 只包含官网
├── crm-admin           (私有) - 只包含Admin
└── crm-app             (私有) - 只包含移动端
```

## 实施方案

### 方法1：使用Git Subtree（推荐）⭐⭐⭐⭐⭐

Git Subtree可以将子目录推送到独立仓库，同时保持本地统一开发。

#### 第一步：在GitHub创建新仓库

```bash
# 在GitHub上创建4个新的私有仓库（不要初始化）
# 1. crm-system
# 2. crm-website  
# 3. crm-admin
# 4. crm-app
```

#### 第二步：配置Git Subtree

在你的本地项目根目录执行：

```bash
# 进入项目目录
cd "D:\kaifa\CRM - 1.8.0"

# 添加远程仓库
git remote add crm-system https://github.com/YourOrg/crm-system.git
git remote add crm-website https://github.com/YourOrg/crm-website.git
git remote add crm-admin https://github.com/YourOrg/crm-admin.git
git remote add crm-app https://github.com/YourOrg/crm-app.git

# 查看远程仓库
git remote -v
```

#### 第三步：推送子目录到独立仓库

```bash
# 1. 推送CRM主系统（排除website、admin、crmAPP）
# 先创建一个临时分支
git subtree split --prefix=. -b crm-system-branch

# 推送到crm-system仓库
git push crm-system crm-system-branch:main

# 2. 推送官网
git subtree split --prefix=website -b website-branch
git push crm-website website-branch:main

# 3. 推送Admin
git subtree split --prefix=admin -b admin-branch
git push crm-admin admin-branch:main

# 4. 推送移动端
git subtree split --prefix=crmAPP -b app-branch
git push crm-app app-branch:main

# 清理临时分支
git branch -D crm-system-branch website-branch admin-branch app-branch
```

#### 第四步：日常开发流程

```bash
# 1. 本地正常开发（在统一目录）
cd "D:\kaifa\CRM - 1.8.0"
# 修改任何文件...

# 2. 提交到本地主仓库
git add .
git commit -m "更新功能"
git push origin main

# 3. 同步到各个独立仓库

# 同步CRM系统
git subtree push --prefix=. crm-system main

# 同步官网
git subtree push --prefix=website crm-website main

# 同步Admin
git subtree push --prefix=admin crm-admin main

# 同步移动端
git subtree push --prefix=crmAPP crm-app main
```

### 方法2：使用自动化脚本（更简单）⭐⭐⭐⭐⭐

创建脚本自动同步，更方便！

#### 创建同步脚本

```powershell
# sync-repos.ps1
# 保存在项目根目录

Write-Host "开始同步到各个仓库..." -ForegroundColor Green

# 1. 同步官网
Write-Host "`n同步官网..." -ForegroundColor Yellow
git subtree push --prefix=website crm-website main
if ($?) {
    Write-Host "✓ 官网同步成功" -ForegroundColor Green
} else {
    Write-Host "✗ 官网同步失败" -ForegroundColor Red
}

# 2. 同步Admin
Write-Host "`n同步Admin..." -ForegroundColor Yellow
git subtree push --prefix=admin crm-admin main
if ($?) {
    Write-Host "✓ Admin同步成功" -ForegroundColor Green
} else {
    Write-Host "✗ Admin同步失败" -ForegroundColor Red
}

# 3. 同步移动端
Write-Host "`n同步移动端..." -ForegroundColor Yellow
git subtree push --prefix=crmAPP crm-app main
if ($?) {
    Write-Host "✓ 移动端同步成功" -ForegroundColor Green
} else {
    Write-Host "✗ 移动端同步失败" -ForegroundColor Red
}

Write-Host "`n所有仓库同步完成！" -ForegroundColor Green
```

#### 使用脚本

```powershell
# 日常开发
# 1. 正常开发和提交
git add .
git commit -m "更新功能"
git push origin main

# 2. 运行同步脚本
.\sync-repos.ps1
```

### 方法3：使用.gitignore + 手动推送（最简单）⭐⭐⭐

如果觉得上面的方法复杂，可以用最简单的方式：

#### 步骤

1. **保持当前本地结构不变**
2. **在GitHub创建独立仓库**
3. **手动复制代码推送**

```bash
# 1. 创建临时目录
mkdir temp-repos
cd temp-repos

# 2. 复制CRM系统（排除website、admin、crmAPP）
xcopy "D:\kaifa\CRM - 1.8.0" crm-system /E /I /EXCLUDE:exclude.txt
cd crm-system
rmdir /S /Q website admin crmAPP
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YourOrg/crm-system.git
git push -u origin main
cd ..

# 3. 复制官网
xcopy "D:\kaifa\CRM - 1.8.0\website" crm-website /E /I
cd crm-website
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YourOrg/crm-website.git
git push -u origin main
cd ..

# 4. 复制Admin
xcopy "D:\kaifa\CRM - 1.8.0\admin" crm-admin /E /I
cd crm-admin
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YourOrg/crm-admin.git
git push -u origin main
cd ..

# 5. 复制移动端
xcopy "D:\kaifa\CRM - 1.8.0\crmAPP" crm-app /E /I
cd crm-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YourOrg/crm-app.git
git push -u origin main
```

## 推荐的完整工作流程

### 初始设置（只需一次）

```bash
# 1. 在GitHub创建4个私有仓库
# 2. 在本地添加远程仓库
cd "D:\kaifa\CRM - 1.8.0"
git remote add crm-website https://github.com/YourOrg/crm-website.git
git remote add crm-admin https://github.com/YourOrg/crm-admin.git
git remote add crm-app https://github.com/YourOrg/crm-app.git

# 3. 首次推送
git subtree push --prefix=website crm-website main
git subtree push --prefix=admin crm-admin main
git subtree push --prefix=crmAPP crm-app main
```

### 日常开发

```bash
# 在本地统一开发
cd "D:\kaifa\CRM - 1.8.0"

# 修改CRM代码
code src/views/Customer/List.vue

# 修改官网代码
code website/src/views/Home.vue

# 修改Admin代码
code admin/src/views/Dashboard.vue

# 提交到主仓库
git add .
git commit -m "更新多个模块"
git push origin main

# 同步到各个独立仓库（使用脚本）
.\sync-repos.ps1
```

### 客户交付

```bash
# 客户只能访问crm-system仓库
git clone https://github.com/YourOrg/crm-system.git

# 他们看不到website和admin的代码
```

## 处理CRM主系统的特殊情况

由于CRM主系统不是一个子目录，而是根目录，需要特殊处理：

### 方案A：创建crm-system分支

```bash
# 1. 创建专门的crm-system分支
git checkout -b crm-system

# 2. 删除不需要的目录
git rm -rf website/
git rm -rf admin/
git rm -rf crmAPP/

# 3. 提交
git commit -m "Remove website, admin, and app"

# 4. 推送到crm-system仓库
git push crm-system crm-system:main

# 5. 切回主分支继续开发
git checkout main
```

### 方案B：使用过滤脚本

创建一个脚本自动过滤：

```powershell
# push-crm-system.ps1

# 创建临时目录
$tempDir = "temp-crm-system"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}

# 复制所有文件
Copy-Item -Path . -Destination $tempDir -Recurse -Exclude @(".git", "node_modules", "dist")

# 进入临时目录
cd $tempDir

# 删除不需要的目录
Remove-Item website -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item admin -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item crmAPP -Recurse -Force -ErrorAction SilentlyContinue

# 初始化Git并推送
git init
git add .
git commit -m "Update CRM system"
git remote add origin https://github.com/YourOrg/crm-system.git
git push -f origin main

# 返回并清理
cd ..
Remove-Item $tempDir -Recurse -Force
```

## 完整的自动化脚本

创建一个完整的同步脚本：

```powershell
# sync-all-repos.ps1

param(
    [string]$commitMessage = "Update"
)

Write-Host "=== 开始同步所有仓库 ===" -ForegroundColor Cyan

# 1. 提交到主仓库
Write-Host "`n1. 提交到主仓库..." -ForegroundColor Yellow
git add .
git commit -m $commitMessage
git push origin main

# 2. 同步CRM系统
Write-Host "`n2. 同步CRM系统..." -ForegroundColor Yellow
$tempDir = "temp-crm-system"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
Copy-Item -Path . -Destination $tempDir -Recurse -Exclude @(".git", "node_modules", "dist", "website", "admin", "crmAPP")
cd $tempDir
git init
git add .
git commit -m $commitMessage
git remote add origin https://github.com/YourOrg/crm-system.git
git push -f origin main
cd ..
Remove-Item $tempDir -Recurse -Force
Write-Host "✓ CRM系统同步完成" -ForegroundColor Green

# 3. 同步官网
Write-Host "`n3. 同步官网..." -ForegroundColor Yellow
git subtree push --prefix=website crm-website main
Write-Host "✓ 官网同步完成" -ForegroundColor Green

# 4. 同步Admin
Write-Host "`n4. 同步Admin..." -ForegroundColor Yellow
git subtree push --prefix=admin crm-admin main
Write-Host "✓ Admin同步完成" -ForegroundColor Green

# 5. 同步移动端
Write-Host "`n5. 同步移动端..." -ForegroundColor Yellow
git subtree push --prefix=crmAPP crm-app main
Write-Host "✓ 移动端同步完成" -ForegroundColor Green

Write-Host "`n=== 所有仓库同步完成！===" -ForegroundColor Cyan
```

使用方法：

```powershell
# 开发完成后，一键同步
.\sync-all-repos.ps1 -commitMessage "添加新功能"
```

## 优缺点对比

### 优点 ✅

1. **本地开发方便**
   - 继续在同一个目录开发
   - 不需要切换目录
   - 可以同时修改多个项目

2. **GitHub安全**
   - 客户只能看到CRM系统
   - 官网和Admin完全隔离
   - 保护商业机密

3. **灵活性高**
   - 可以选择同步哪些仓库
   - 可以独立更新
   - 版本管理灵活

### 缺点 ❌

1. **需要额外操作**
   - 需要运行同步脚本
   - 比单仓库多一步

2. **学习成本**
   - 需要理解Git Subtree
   - 需要配置脚本

## 最终建议

### 如果你是个人或小团队（1-3人）
👉 **使用方法3（手动复制）+ 自动化脚本**
- 最简单
- 容易理解
- 足够用

### 如果你是中型团队（3-10人）
👉 **使用方法2（自动化脚本）**
- 平衡了便利性和安全性
- 一键同步
- 易于维护

### 如果你是大型团队（10人以上）
👉 **使用方法1（Git Subtree）**
- 最专业
- Git原生支持
- 适合复杂场景

## 立即行动步骤

```bash
# 1. 在GitHub创建4个私有仓库（5分钟）
# 2. 下载并保存sync-all-repos.ps1脚本（2分钟）
# 3. 运行首次同步（5分钟）
.\sync-all-repos.ps1 -commitMessage "Initial sync"

# 4. 以后每次开发完成后
.\sync-all-repos.ps1 -commitMessage "你的提交信息"
```

## 总结

**你不需要改变本地开发方式！**

- ✅ 继续在 `D:\kaifa\CRM - 1.8.0` 开发
- ✅ 所有项目在同一个目录
- ✅ GitHub上自动分离成多个仓库
- ✅ 客户只能看到CRM系统
- ✅ 一个脚本搞定所有同步

这是最佳方案，既方便又安全！

---

**创建时间**: 2026-03-02  
**推荐方案**: 方法2（自动化脚本）  
**难度**: ⭐⭐☆☆☆ (简单)
