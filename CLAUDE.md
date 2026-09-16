# HeartLink AI — Claude 工作規則

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

依情境使用對應的 skill：

| 情境 | skill |
|---|---|
| 執行 ROADMAP 上的任務 | `dev-task`：讀 → 計畫 → 改 → 驗證 → 回報 → 停止 |
| 寫或修改任何程式碼 | `coding-conventions`：改動大小限制、模組邊界、命名、溯源 |
| 修 bug | `debug-trace` |
| 修改或新增功能、需求 | `change-request` |

- **使用者是前端工程師，對後端不熟。** 每個任務完成後，都要用繁體中文詳細說明做了什麼，並講解程式碼，盡量用前端的類比（格式見 `dev-task` 第 5 節）。
- 一次只做一個小任務：**最多 5 個手寫檔案、約 300 行**，並且要能還原。
- 每個任務都要有 checklist（`docs/templates/TASK-CHECKLIST.md`），每一項都要實際驗證過。
- 做完就停下來，等使用者確認，再做下一個任務。
- 程式碼要依功能切成獨立模組，像 React component 一樣（見 `docs/architecture/MODULES.md`）。

## 架構規則

- `apps/web`（Next.js）：負責 UI。
- `apps/api`（NestJS）：負責業務邏輯、登入驗證、Socket.IO，並把工作丟進佇列（BullMQ producer）。
- `services/ai`（FastAPI）負責同步推論；`services/ai-worker`（Python）負責非同步工作。
- **AI 模型不能放進 NestJS。**
- PostgreSQL + PostGIS + pgvector 是唯一的資料庫，不另外加向量資料庫。
- ORM 用 **Drizzle**；查距離和向量時，用 Drizzle 的 `geometry` / `vector` 型別或 `sql` 模板。
- 佇列用 Redis + BullMQ，**不要加 RabbitMQ 或 Kafka**。
- 圖片等檔案存在 MinIO（本機）或 S3（正式環境）。
- **不能把所有特徵混成一個向量**：人臉、偏好、語意向量要分開存、分開計算，最後才在排序層合併。
- 年齡、性別、GPS 半徑都是**硬篩選**，要用 SQL 或程式邏輯判斷，不能交給 LLM 或模型。
- API 格式以 OpenAPI 為準，前端的 client 要用產生的，不要手寫。

## AI 規則

- 模型選擇**都是暫定**。做到第 6 部分（模型訓練）或第 7 部分（引入第三方模型）時，**要先提醒使用者重新討論**模型選擇和 ensemble 策略。
- 框架優先順序：**TensorFlow / Keras 優先**；只有工具本身以 PyTorch 為基礎時才用 PyTorch；分群用 scikit-learn。
- 每一個模型、特徵、門檻值都要記錄版本（`model_name` / `model_version` / `feature_version`），實驗結果記錄在 MLflow。
- 門檻值和政策（例如驗證通過的分數線）要由使用者決定，不能自己定。
- Docker 容器在 Mac 上沒有 GPU。訓練要在本機用 tensorflow-metal，或用 Colab。

## 安全與隱私

- 這是公開 repo：**絕對不能 commit** `.env`、金鑰，或 `data/` 裡的真實資料。
- 人臉 Embedding、精確 GPS 座標不能回傳給瀏覽器。
- 相機、GPS、聊天分析都要先取得使用者同意，並把同意紀錄存下來。
- 資料保存和刪除的政策不能自己編，要問使用者。

## 環境

- macOS、Apple M5（arm64）、32GB。
- Node 24 LTS、pnpm、Python 3.12（用 uv 管理）、Docker。
