# 架構決策紀錄（ADR 總表）

參考來源：
- A = Codex 討論文件（`docs/reference/codex-PROJECT_REPORT.md`）
- B = 老師規格《HeartLink AI 交友軟體配對》

狀態：✅ 已定案　🟡 暫定（之後會再討論）

| # | 主題 | 決定 | 狀態 | 理由 |
|---|---|---|---|---|
| D01 | 後端 | NestJS（TypeScript）負責主後端；Python 的 FastAPI 和 worker 負責 AI | ✅ | 沿用 A。B 寫的是全 FastAPI；我們改用這個做法，讓業務邏輯和 AI 各自獨立部署、分開擴充，這也是業界常見的分工。 |
| D02 | ORM | **Drizzle**（不用 Prisma） | ✅ | Prisma 沒有原生的 `vector` 和 `geography` 型別；Drizzle 有，而且寫法接近 SQL。 |
| D03 | 資料庫 | PostgreSQL + **PostGIS** + pgvector，放在同一個資料庫 | ✅ | B 要求用 PostGIS 做公里半徑查詢；向量量級不大，不需要另外的向量資料庫。 |
| D04 | 資料庫映像 | 自己寫 Dockerfile：`postgis/postgis` 加裝 pgvector | ✅ | 沒有官方的合併版映像。 |
| D05 | 佇列 | Redis + BullMQ；Python 端用 `bullmq` 的 Python 套件 | 🟡 | 第 0 部分要先做實驗，確認 Node 和 Python 之間能互通。不行的話，改用 HTTP 加 Python 自己的佇列。 |
| D06 | 人臉 | 兩條流程都做：① liveness 真人驗證（A）② 人臉相似度排序（B 的 Stage 1） | ✅ | 使用者決定。時程上 liveness 排在主流程之後。 |
| D07 | 向量 | 人臉、偏好、語意向量**分開存**，不做 `combined_embedding` | ✅ | B 明確規定；也比較好解釋、好除錯。 |
| D08 | 推薦 | 先用硬篩選（年齡、性別、封鎖名單、GPS 半徑），再做 Stage 1 → 2 → 3，最後排序：`Final = w1·Face + w2·Cluster + w3·Semantic + w4·Behavior` | ✅ | B 的規定。冷啟動時 w3 = 0，其餘權重重新正規化。 |
| D09 | API 命名 | 候選人用 `GET /discovery?radius_km=R`；`/matches` 只給已配對的人 | ✅ | B 寫的是 `/matches?radius_km`，但「配對」和「候選」是不同的東西，分開比較清楚。 |
| D10 | 開發方式 | **地基分層、功能切片**：Docker、資料庫、骨架照分層做；之後每個功能從資料表一路做到 UI 和測試 | ✅ | 避免做完 API 才發現用不上。 |
| D11 | 時程 | **約 2 週**（B 原本是 4 週），所以要切出 MVP 範圍 | ✅ | 見 `01-ROADMAP.md`。 |
| D12 | ML 框架 | TensorFlow / Keras 優先；工具本身是 PyTorch 的才用 PyTorch；分群用 scikit-learn | ✅ | 使用者想先熟悉 TensorFlow。 |
| D13 | 模型選擇 | 所有模型都是暫定，之後要比較多個模型或做 ensemble，挑最高分的 | 🟡 | 做到第 6、7 部分時重新討論。 |
| D14 | 實驗追蹤 | MLflow | 🟡 | 用來比較多個模型，並管理模型版本。 |
| D15 | API 格式 | NestJS 和 FastAPI 都產生 OpenAPI 文件，再用 orval 產生 TypeScript client | ✅ | 兩種語言之間的格式要能自動檢查。 |
| D16 | Monorepo | pnpm workspace + Turborepo；Python 用 uv | ✅ | |
| D17 | 測試 | Vitest（web）、Jest（Nest 預設）、pytest、Testcontainers、Playwright、MSW | ✅ | 每一部分做完就寫測試，不等到最後。 |
| D18 | 程式碼倉庫 | GitHub **公開** repo | ✅ | 所以 `data/`、`.env` 一律不能 commit。 |
| D19 | 不採用 | RabbitMQ、Kafka、Kubernetes、獨立向量資料庫、太早做監控 | ✅ | 規模用不到。 |
| D20 | 星座 / MBTI | 只當選填偏好，不宣稱能科學判定相容性 | ✅ | B 的規定。 |
| D21 | RAG / MCP | 用途還沒定 | 🟡 | 做到第 8 部分再討論。 |
| D23 | 模組化 | Modular monolith：依功能切成模組，只能透過 `index.ts` 互相使用，資料表屬於各自的模組，並用 dependency-cruiser / import-linter 自動檢查（見 `architecture/MODULES.md`） | ✅ | 使用者希望程式碼像 React component 一樣可以重用、容易 debug；不拆成真正的 microservice，以免增加部署和除錯的複雜度。 |
| D24 | 資料表變更 | 資料表結構**只能**透過 Drizzle migration 修改；資料匯入用 `scripts/` 裡的腳本；Drizzle Studio 只用來看資料，或在開發環境改資料 | ✅ | 資料表結構要能重現、能追溯；正式環境的 api 帳號不給修改資料表結構的權限。 |
| D25 | 改動大小 | 每個任務最多 5 個手寫檔案、約 300 行 | ✅ | 方便檢查、追溯，也方便還原。 |
| D26 | Lint / 格式化 | TypeScript 全部使用 **Biome**（不用 ESLint + Prettier）；Python 使用 ruff | ✅ | 一個工具同時負責 lint 和格式化，速度快、設定少；Next.js 官方也支援。 |
| D27 | 供應鏈安全 | 保留 pnpm 的 `minimumReleaseAge`（發布未滿 1 天的版本不安裝），**不加例外** | ✅ | 防止安裝到剛被植入惡意程式碼的新版本。需要最新版時，就等一天。 |
| D28 | 嚴格型別 | 不能用 `any`。TypeScript：根目錄的 `tsconfig.base.json` 開啟 strict，另外加上 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等選項；Biome 把 `noExplicitAny`、`noImplicitAnyLet`、`noEvolvingTypes`、`noTsIgnore`、`noNonNullAssertion` 設為 error。Python：mypy strict 加上 ruff `ANN401`（F3 設定） | ✅ | 使用者要求；型別越嚴格，越早抓到 bug，重構也更安全。 |
| D29 | 物件儲存 | 用 **SeaweedFS 4.46** 取代 MinIO：本機用 `mini` 模式，透過 S3 API 存取 | ✅ | MinIO 在 2025-10 停止發布社群版映像，2026-02 封存 repo。SeaweedFS 採用 Apache-2.0 授權、維護活躍、支援 arm64、與 S3 相容。程式一律透過 S3 SDK 存取，之後換成 AWS S3 或其他服務時，只要改 endpoint。 |
| D30 | Postgres 映像 | 以 `pgvector/pgvector:0.8.6-pg18-trixie` 為基礎，再用 apt 安裝 PostGIS 3（PostgreSQL 18.6、PostGIS 3.6.4） | ✅ | `postgis/postgis` 只有 amd64 版本，在 Apple Silicon 上要靠模擬器執行。 |
| D31 | 本機 port | Postgres 用 5433、Redis 用 6380、S3 用 8333、S3 管理介面用 23646，全部只綁定 127.0.0.1 | ✅ | 避開本機其他專案占用的 5432、6379，並且不對區域網路開放。 |
| D22 | 部署平台 | 還沒定 | 🟡 | 做到第 10 部分再討論；手機要能用相機和定位，所以必須是 HTTPS。 |
