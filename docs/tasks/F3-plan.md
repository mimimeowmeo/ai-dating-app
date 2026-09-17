# F3 計畫：四個應用程式的骨架

F3 原本是一個任務，但會用到 4 種技術、遠超過「5 個手寫檔案」的上限，所以拆成 6 個小任務。
**每個小任務都走完整的 dev-task 流程**（分支 → 📘 註解 → 在對話裡確認 → 合併）。

## 查到的現況（2026-09-17）

| 項目 | 查到的事實 | 影響 | 來源 |
|---|---|---|---|
| TypeScript 7.0.2 | **還沒有提供給工具呼叫的 API**；官方說明 NestJS CLI 這類工具目前只能用 6.0，7.1 才會提供新的 API；兩個版本的型別檢查結果相同 | 全專案固定用 **TS 6.0.3**（D32） | TypeScript 7.0 官方公告 |
| NestJS 12（core 12.0.3、CLI 12.0.3） | 核心套件改成 ESM；新專案預設 Vitest、oxlint；CLI 內建 `typescript ~6.0.2`；原生支援 Standard Schema | api 用 ESM + Vitest；lint 改用 Biome（D33） | NestJS 官方 migration guide |
| Next.js 16.3.5 | 內建 AGENTS.md 和版本對應的文件；`create-next-app` 可以選 Biome | web 用 Biome | Next.js 官方文件 |
| FastAPI 0.141.1、uvicorn 0.53、pydantic 2.13 | 都支援 Python 3.12 | ai 可以直接用 | PyPI |
| bullmq（Python）3.2.2 | 支援 Python 3.10 以上 | ai-worker 可以用（F4 會正式驗證） | PyPI |
| ruff 0.16、mypy 2.3、pytest 9.1 | 支援 Python 3.12 | Python 的品質工具 | PyPI |
| 發布時間 | Nest CLI 12.0.2 和 12.0.3、core 12.0.3 都是**不到 1 天前**才發布 | pnpm 的 `minimumReleaseAge` 會自動選用比較早的版本（D27） | npm registry |

## 拆分

| 子任務 | 內容 | 主要的手寫檔案 | 驗證 | 需要的指南 |
|---|---|---|---|---|
| **F3a** api | NestJS 12 骨架（ESM、Vitest、Biome、嚴格 tsconfig），`GET /api/v1/health` | `apps/api` 的 `main.ts`、`app.module.ts`、`modules/health/*`、`tsconfig.json`、`package.json` | `pnpm --filter api test/typecheck/lint/build`、`curl /api/v1/health` | 03 ✅ |
| **F3b** ai | uv workspace + FastAPI 骨架，`GET /health`、ruff、mypy strict、pytest | 根目錄的 `pyproject.toml`、`services/ai/pyproject.toml`、`app/main.py`、`app/features/health/router.py`、測試 | `uv run pytest/ruff/mypy`、`curl /health` | 03 ✅ |
| **F3c** ai-worker | Python worker 骨架：啟動 → 連上 Redis → 定期寫心跳；另外提供健康檢查指令 | `services/ai-worker/pyproject.toml`、`app/main.py`、`app/heartbeat.py`、`app/healthcheck.py`、測試 | pytest，並用本機的 Redis 實測心跳 | 03 ✅ |
| **F3d** web | Next.js 16 骨架（TS、Tailwind、App Router、Biome），`GET /api/health` 路由 | `apps/web` 的 `app/api/health/route.ts`、`tsconfig.json`、`package.json` | `pnpm --filter web lint/typecheck/build`、`curl` | 01、02 會在 S1 之前寫 |
| **F3e** 容器化 | 四個 Dockerfile，加進 compose 的 `apps` profile，並設定 `depends_on: service_healthy` | 4 個 Dockerfile、`docker-compose.yml` | `docker compose --profile apps up --wait`，四個服務都 healthy | 00 ✅ |
| **F3f** 自動檢查 | Claude Code hooks（改完檔案自動格式化；擋下對 `.env`、`data/` 的編輯）、dependency-cruiser、import-linter | `.claude/settings.json`、`.dependency-cruiser.cjs`、根目錄 `pyproject.toml` 的 import-linter 設定 | 故意違反規則，確認會被擋下 | — |

**順序**：F3a → F3b → F3c → F3d → F3e → F3f。
- 先做後端，因為 F4 的佇列實驗要用到 api 和 ai-worker。
- F3e 要等四個骨架都完成才能做。

**自動產生的檔案**（lock 檔、scaffold 產生的樣板）不算在上限內，但報告裡會列出來，並說明是用哪個指令產生的。scaffold 產生的樣板裡，用不到的檔案（範例 controller、ESLint、oxlint 設定）會刪掉，刪除的部分也會列在變更表裡。

## 新決策（先寫進 00-DECISIONS）

| # | 決定 | 理由 |
|---|---|---|
| D32 | 全專案固定用 **TypeScript 6.0.3** | TS 7.0 還沒有提供給工具呼叫的 API，NestJS CLI 和各種 loader 都需要它；型別檢查結果跟 7.0 相同，D28 不受影響。等 7.1 推出、NestJS 支援之後再升級 |
| D33 | api：**NestJS 12 + ESM + Express adapter + Vitest + Biome** | 前三項是 NestJS 12 新專案的預設，Express 也是文件和範例最多的選擇；Biome 則是依照 D26。**D17 原本的「Jest（Nest 預設）」改為 Vitest**，前後端也因此統一 |
| D34 | ai-worker 的健康檢查用 **Redis 心跳 + Docker exec 檢查指令**，不另外開 HTTP port | 背景 worker 沒有 HTTP 服務，業界常見做法是用指令檢查（exec probe） |
| D35 | 應用程式容器放在 compose 的 **`apps` profile**；平常開發時，應用程式直接在 Mac 上執行（支援熱更新），基礎設施則在 Docker 裡執行 | `docker compose up` 預設只啟動基礎設施；需要時加上 `--profile apps`，就能像正式環境一樣全部跑在容器裡 |
| D36 | Python 使用 **uv workspace**：根目錄的 `pyproject.toml` 把 `services/*` 列為成員，全部共用一個 `uv.lock` | 跟 pnpm workspace 的概念一樣：統一的版本和工具設定 |

## 參考來源
- TypeScript 7.0 官方公告：https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- NestJS migration guide（v12）：https://docs.nestjs.com/migration-guide
- Next.js AI agents 指南：https://nextjs.org/docs/app/guides/ai-agents
- PyPI：fastapi、uvicorn、pydantic、bullmq、ruff、mypy、pytest
