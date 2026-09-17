# 開發路線圖（約 2 週）

開始日期：2026-09-17。以下每一天是一個工作單位，實際進度落後時，就往後順延。
**原則：先打好地基，再一個功能一個功能完成（地基分層、功能切片），P0 優先，P1 有時間才做。**

## 你的 0–10 部分，對應到每個切片

每個切片裡，會依序講解相關的部分：

```text
0 Docker   1 前端 layout   2 前端邏輯   3 後端 API   4 資料庫
5 向量資料庫   6 模型訓練   7 第三方模型   8 RAG/MCP   9 QA 測試   10 部署
```

第 9 部分（QA）**每個切片都要做**，不會留到最後。

## 地基階段（分層做）

| 天 | 任務 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| D1 | F0 開發環境：Node 24、pnpm、uv、Python 3.12、git、GitHub | 0 | 052 | ✅ |
| D1 | F1 Monorepo 骨架：pnpm workspace、Turborepo、.gitignore、.env.example | 0 | 052 | ✅ |
| D1 | F2 Docker：Postgres（PostGIS + pgvector）→ Redis → SeaweedFS（取代 MinIO，D29），一次加一個 | 0, 4, 5 | — | ✅ |
| D2 | F3 四個應用程式骨架（拆分計畫見 `docs/tasks/F3-plan.md`） | 0, 1, 3 | — | 🔄 |
| D2 | └ F3a api：NestJS 12 骨架 + `/api/v1/health` | 3 | — | ⬜ |
| D2 | └ F3b ai：uv workspace + FastAPI 骨架 + `/health` | 3, 7 | — | ⬜ |
| D2 | └ F3c ai-worker：Python worker 骨架 + Redis 心跳健康檢查 | 3, 7 | — | ⬜ |
| D2 | └ F3d web：Next.js 16 骨架 + `/api/health` | 1, 2 | — | ⬜ |
| D2 | └ F3e 容器化：四個 Dockerfile + compose 的 `apps` profile | 0 | — | ⬜ |
| D2 | └ F3f 自動檢查：Claude Code hooks、dependency-cruiser、import-linter | 9 | 052 | ⬜ |
| D2 | F4 **佇列實驗**：NestJS 丟 job → Python worker 收到 → 回寫結果（驗證 D05） | 0, 3 | — | ⬜ |
| D2 | F5 CI（GitHub Actions）、gitleaks 秘密掃描、Playwright 冒煙測試 | 9 | 052, 053 | ⬜ |
| D3 | F6 **資料庫 schema**：參考你的 CSV，用 Drizzle 建表並寫 migration，加上假資料 seed | 4, 5 | 004, 051 | ⬜ |
| D3 | F7 OpenAPI → orval 自動產生 client，前端先用 MSW 模擬 API | 2, 3 | — | ⬜ |

## 功能切片階段（每個切片都從資料表一路做到 UI 和測試）

| 天 | 切片 | 內容 | REQ | 狀態 |
|---|---|---|---|---|
| D4 | S1 帳號 | 註冊、登入、JWT、保護需要登入的頁面、Mobile layout | 001, 050 | ⬜ |
| D5 | S2 個人資料 | Profile、配對條件、偏好標籤 | 002, 003, 004 | ⬜ |
| D6 | S3 自拍頭貼 | 相機或相簿 → MinIO → 品質檢查 → 人臉 Embedding | 010–014, 051 | ⬜ |
| D7 | S4 定位 | GPS 同意 → `POST /location` → PostGIS 半徑篩選 → `/discovery` 基本版 | 020–024, 030 | ⬜ |
| D8 | S5 推薦 | Stage 1 + Stage 2 + 排序服務 + 推薦原因 + 開關 | 016, 031, 032, 034, 035, 037 | ⬜ |
| D9 | S6 滑卡配對 | 候選人卡片、喜歡 / 略過、成立配對、封鎖 | 036, 040, 041, 054 | ⬜ |
| D10 | S7 聊天 | Socket.IO、訊息存檔 | 042 | ⬜ |
| D11 | S8 **模型討論** + Liveness + 用 MLflow 比較多個模型 | 015, 039 | ⬜ |
| D12 | S9 Stage 3 | 聊天分析同意 → 批次語意分析 → 重新排序 | 033, 043 | ⬜ |
| D13 | S10 RAG/MCP + 評估 | 先討論用途；做出 Precision@K、NDCG 評估報告 | 038, 056 | ⬜ |
| D14 | S11 部署 | HTTPS、手機實測、完整 E2E | 057, 050 | ⬜ |
| D15 | 緩衝 | 準備 Demo 情境（055）、寫報告 | 055 | ⬜ |

## 範圍切割

- **P0 必交**：D1–D10、D14 的所有內容。
- **P1（時間不夠時依序刪減）**：RAG/MCP → 多模型比較 → Stage 3 → Liveness。
  - Liveness 是你決定要做的，所以排在 P1 的最後才刪。
- **P2**：已讀、通知、持續學習（持續重新分群、重新排序）。

## 需要提醒使用者討論的時間點

- D3：提供 CSV，一起設計資料表。
- D11：模型選擇和 ensemble 策略（D13）。
- D13：RAG / MCP 要用在哪裡（D21）。
- D14：部署平台（D22）。
