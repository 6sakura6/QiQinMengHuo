# 问题追踪器 — GitHub

本仓库的 Issue 统一通过 **GitHub Issues** 管理（仓库 `6sakura6/----`）。

## 各技能如何与追踪器交互

| 技能 | 操作 | 实现方式 |
|------|------|---------|
| `to-prd` | 创建单个 Issue | `gh issue create` |
| `triage` | 读取 + 打标签 | `gh issue list` / `gh issue edit` |
| `to-issues` | 按依赖顺序批量创建 | `gh issue create` |
| `diagnose` | 搜索已有 Issue | `gh issue list --search` |

## 前置条件

`gh` CLI 需已登录。运行 `gh auth status` 验证。
