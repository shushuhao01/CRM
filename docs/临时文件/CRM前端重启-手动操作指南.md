# CRM前端重启 - 手动操作指南

## 当前问题
- 后端API正常(已测试通过)
- 前端菜单显示空白
- 原因:前端代码已更新,但未重新编译或浏览器缓存未清除

## 手动操作步骤

### 第1步:停止当前CRM前端服务

1. 找到运行CRM前端的终端窗口
2. 按 `Ctrl + C` 停止服务
3. 确认服务已停止(不再有日志输出)

### 第2步:清除Vite缓存(可选但推荐)

在CRM前端目录执行:

```bash
cd D:\kaifa\CRM - 1.8.0
rm -rf node_modules/.vite
```

或者使用Windows命令:

```cmd
cd /d D:\kaifa\CRM - 1.8.0
rmdir /s /q node_modules\.vite
```

### 第3步:重新启动CRM前端

```bash
cd D:\kaifa\CRM - 1.8.0
npm run dev
```

等待服务启动,看到类似以下输出表示成功:

```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 第4步:清除浏览器缓存

打开浏览器后,选择以下任一方法:

**方法1:硬刷新(最简单)**
- 按 `Ctrl + Shift + R` (Windows)
- 或 `Cmd + Shift + R` (Mac)

**方法2:开发者工具(推荐)**
1. 按 `F12` 打开开发者工具
2. 右键点击浏览器刷新按钮
3. 选择"清空缓存并硬性重新加载"

**方法3:手动清除(最彻底)**
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 时间范围选择"全部"
4. 点击"清除数据"
5. 刷新页面

### 第5步:验证功能

1. 访问 http://localhost:5173
2. 登录系统
3. 检查左侧菜单是否正常显示
4. 按 `F12` 打开控制台,查看日志:
   - 应该看到:`[ModuleStatus] 成功获取启用的模块`
   - 不应该有500错误

## 预期结果

✅ 左侧菜单正常显示
✅ 控制台显示模块加载成功
✅ 没有API错误

## 如果还是不行

请提供以下信息:

1. **浏览器控制台(F12 -> Console标签)**
   - 截图或复制所有错误信息

2. **Network标签**
   - 找到 `/api/v1/system/modules/status` 请求
   - 查看响应内容(Response标签)
   - 截图或复制响应数据

3. **前端服务启动日志**
   - 复制终端中的启动输出

## 快速命令参考

```bash
# 进入CRM目录
cd D:\kaifa\CRM - 1.8.0

# 清除缓存(可选)
rm -rf node_modules/.vite

# 启动服务
npm run dev
```

## 注意事项

- 确保后端服务(端口3000)正在运行
- 确保Admin后台(端口5174)正在运行
- 确保没有其他程序占用5173端口
- 如果端口被占用,可以先关闭占用的程序

## 端口检查

如果5173端口被占用,可以执行:

```bash
# 查看端口占用
netstat -ano | findstr :5173

# 如果有进程占用,记下PID,然后结束进程
taskkill /PID <进程ID> /F
```

