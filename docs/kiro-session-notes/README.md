# Kiro Session Notes

这个文件夹存放 Kiro AI 助手在开发过程中自动生成的临时文档和会话记录。

## 用途

- 记录每次功能开发的详细说明
- 保存测试指南和修复说明
- 方便 AI 助手记忆和追踪开发进度
- 便于开发者回顾具体实现细节

## 管理

- 这些文档是临时性的，可以随时删除
- 重要的正式文档应该放在 `docs/` 根目录
- 可以一键删除整个文件夹而不影响项目

## 删除方法

如需清理这些临时文档，可以直接删除整个文件夹：

```bash
# Windows
rmdir /s /q docs\kiro-session-notes

# Linux/Mac
rm -rf docs/kiro-session-notes
```

或者使用 Git 删除：

```bash
git rm -rf docs/kiro-session-notes
git commit -m "清理 Kiro 会话记录"
```
