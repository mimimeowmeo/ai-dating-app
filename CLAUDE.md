@AGENTS.md

# Claude Code 專屬補充

共用規則都在上面引用的 `AGENTS.md`，這裡只放 Claude Code 才有的東西。

## Skill 對照

| 情境 | skill | 位置 |
|---|---|---|
| 執行 ROADMAP 上的任務 | `dev-task` | 專案 |
| 寫或修改任何程式碼 | `coding-conventions` | 專案 |
| 修 bug | `debug-trace` | 專案 |
| 修改或新增功能、需求 | `change-request` | 專案 |
| 寫後端、資料庫、Docker、Python、AI、CI 的程式碼，以及 commit 前 | `explain-in-code`：加上 📘 教學註解；commit 前備份到 `.learn/<ID>/` 並移除 | 使用者層級 |
| 寫 PR 描述、任務報告、列出改動 | `pr-change-table`：逐檔、逐行的變更表 | 使用者層級 |

## 工具
- 查套件文件時優先用 **Context7 MCP**（`.mcp.json`），並以專案實際安裝的版本為準。
- 在這台 Mac 上，非互動 shell 不會自動載入 fnm 和 Docker 的 PATH。執行指令前先加上：
  `export PATH="$HOME/.docker/bin:$PATH"; eval "$(fnm env --shell bash)"; fnm use`
- zsh 不會自動切開沒有加引號的變數；檔案清單請用 `--staged` 或 `xargs` 傳遞。
