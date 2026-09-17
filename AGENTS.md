# HeartLink AI — AI 開發工具共用規則

> 所有 AI 開發工具（Claude Code、Codex、Cursor……）都要遵守這份規則。
> Claude Code 專屬的補充規則寫在 `CLAUDE.md`。

AI 交友配對 Mobile Web App（PWA）。依使用者的 GPS 距離先做硬篩選，再用三個階段排序：
Stage 1 人臉相似度、Stage 2 偏好分群、Stage 3 聊天語意。

## 開始任何工作前，必須先讀

1. 本檔案
2. `docs/00-DECISIONS.md`：已經定案的決定，不要重新討論
3. `docs/01-ROADMAP.md`：目前做到哪一天、哪一個切片
4. `docs/02-REQUIREMENTS.md`：需求編號（REQ-xxx）
5. 這次任務相關的 `docs/parts/*.md`，以及 architecture / database / api / ai 文件
6. `git status`：先看目前的工作區狀態

## 開發流程（一定要照做）

流程文件放在 `.claude/skills/`。**用其他工具時，也請直接閱讀這些檔案並照著做：**

| 情境 | 流程文件 |
|---|---|
| 執行 ROADMAP 上的任務 | `.claude/skills/dev-task/SKILL.md`：讀 → 計畫 → 改 → 驗證 → 回報 → 停止 |
| 寫或修改任何程式碼 | `.claude/skills/coding-conventions/SKILL.md`：改動大小限制、模組邊界、嚴格型別、命名、溯源 |
| 修 bug | `.claude/skills/debug-trace/SKILL.md` |
| 修改或新增功能、需求 | `.claude/skills/change-request/SKILL.md` |

- **使用者是前端工程師，對後端不熟。** 每個任務完成後，都要用繁體中文詳細說明做了什麼，並講解程式碼，盡量用前端的類比。
- 一次只做一個小任務：**最多 5 個手寫檔案、約 300 行**，並且要能還原。
- 每個任務都要有 checklist（`docs/templates/TASK-CHECKLIST.md`），每一項都要實際驗證過。
- 每個任務在 `task/<ID>-<簡稱>` 分支上進行；在對話裡列出改動，**使用者確認後**才 commit、開 PR、squash 合併。
- 做完就停下來，等使用者確認，再做下一個任務。
- 程式碼要依功能切成獨立模組，像 React component 一樣（見 `docs/architecture/MODULES.md`）。
- 程式碼裡的 📘 教學註解**只能留在本機**。push 之前一定要移除，`.githooks/pre-push` 會檢查；**不能用 `--no-verify` 跳過**。

## 架構規則

- `apps/web`（Next.js）：負責 UI。
- `apps/api`（NestJS）：負責業務邏輯、登入驗證、Socket.IO，並把工作丟進佇列（BullMQ producer）。
- `services/ai`（FastAPI）負責同步推論；`services/ai-worker`（Python）負責非同步工作。
- **AI 模型不能放進 NestJS。**
- PostgreSQL + PostGIS + pgvector 是唯一的資料庫，不另外加向量資料庫。
- ORM 用 **Drizzle**；查距離和向量時，用 Drizzle 的 `geometry` / `vector` 型別或 `sql` 模板。
- 佇列用 Redis + BullMQ，**不要加 RabbitMQ 或 Kafka**。
- 圖片等檔案一律透過 **S3 API** 存取：本機用 SeaweedFS（D29），正式環境用 S3 相容服務。
- **不能把所有特徵混成一個向量**：人臉、偏好、語意向量要分開存、分開計算，最後才在排序層合併。
- 年齡、性別、GPS 半徑都是**硬篩選**，要用 SQL 或程式邏輯判斷，不能交給 LLM 或模型。
- API 格式以 OpenAPI 為準，前端的 client 要用產生的，不要手寫。
- 型別要嚴格：不能用 `any`；不能關掉 `tsconfig.base.json` 裡的任何嚴格選項（D28）。

## AI 規則

- 模型選擇**都是暫定**。做到第 6 部分（模型訓練）或第 7 部分（引入第三方模型）時，**要先提醒使用者重新討論**模型選擇和 ensemble 策略。
- 框架優先順序：**TensorFlow / Keras 優先**；只有工具本身以 PyTorch 為基礎時才用 PyTorch；分群用 scikit-learn。
- 每一個模型、特徵、門檻值都要記錄版本（`model_name` / `model_version` / `feature_version`），實驗結果記錄在 MLflow。
- 門檻值和政策（例如驗證通過的分數線）要由使用者決定，不能自己定。
- Docker 容器在 Mac 上沒有 GPU。訓練要在本機用 tensorflow-metal，或用 Colab。

## 安全與隱私

- 這是公開 repo，而且**沒有授權條款**（使用者決定：保留所有權利）。
- **絕對不能 commit** `.env`、金鑰、`data/` 裡的真實資料，以及 `.learn/`。
- 人臉 Embedding、精確 GPS 座標不能回傳給瀏覽器。
- 相機、GPS、聊天分析都要先取得使用者同意，並把同意紀錄存下來。
- 資料保存和刪除的政策不能自己編，要問使用者。
- 不要安裝發布未滿 1 天的套件版本，也不要替 pnpm 的 `minimumReleaseAge` 加例外（D27）。

## 環境

- macOS、Apple M5（arm64）、32GB。
- Node 24 LTS（fnm，`.node-version`）、pnpm 12、Python 3.12（uv，`.python-version`）、Docker Desktop（CLI 在 `~/.docker/bin`）。
- 本機基礎設施：執行 `docker compose up -d --wait`，連線資訊在 `.env`。

| 服務 | 本機位址 |
|---|---|
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6380` |
| S3（SeaweedFS） | `localhost:8333` |
| S3 管理介面 | `localhost:23646` |

- 容器之間互相連線時，用「服務名稱 + 容器裡的 port」，例如 `postgres:5432`（D31）。
- 第一次 clone 之後，執行一次 `git config core.hooksPath .githooks`。
