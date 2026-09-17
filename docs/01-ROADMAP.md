# 開發路線圖

開始日期：2026-09-17。實際進度落後時，就往後順延。
**原則**：
- 先打好地基，再一個功能一個功能完成（地基分層、功能切片）。
- **API 一步一步做 → 前端 → 最後才做 AI**（D37）。
- P0 優先，P1 有時間才做。

## 你的 0–10 部分，對應到每個切片

```text
0 Docker   1 前端 layout   2 前端邏輯   3 後端 API   4 資料庫
5 向量資料庫   6 模型訓練   7 第三方模型   8 RAG/MCP   9 QA 測試   10 部署
```

第 9 部分（QA）**每個任務都要做**，不會留到最後。

## 階段 1：地基

| 任務 | 內容 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| F0 | 開發環境：Node 24、pnpm、uv、Python 3.12、git、GitHub | 0 | 052 | ✅ |
| F1 | Monorepo 骨架：pnpm workspace、Turborepo、.gitignore、.env.example | 0 | 052 | ✅ |
| F2 | Docker：Postgres（PostGIS + pgvector）→ Redis → SeaweedFS（D29） | 0, 4, 5 | — | ✅ |
| F3a | api：NestJS 12 骨架 + `/api/v1/health`（拆分計畫見 `docs/tasks/F3-plan.md`） | 3 | — | ✅ |

## 階段 2：後端 API（一步一步做，AI 只預留介面）

| 任務 | 內容 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| **S1-a** | 設定和錯誤格式：用 Zod 驗證環境變數、RFC 9457 錯誤格式（D42） | 3 | 052 | ✅ |
| **S1-b** | 資料庫：Drizzle + `users` 資料表 + migration + `/health/ready`、Testcontainers | 3, 4 | 001, 008 | ✅ |
| **S1-c** | session：Redis + `express-session` + `connect-redis`、cookie 設定、CSRF（D40） | 3 | 007 | ✅ |
| **S1-d** | 帳號：`/auth/continue`、`/auth/register`、`/auth/logout`、`/me`、Argon2id（D38、D39、D41） | 3, 4 | 001, 006, 007, 009 | ✅ |
| **S1-e** | 限流和鎖定：失敗 5 次鎖定 15 分鐘 ✅；IP 限流（`@nestjs/throttler` 6.6 發布滿一天後再加）⬜ | 3 | 007 | 🔄 |
| S1-f | 絕對逾時 30 天 + 確認帳號名稱格式（D44） | 3 | 007 | ✅ |
| S2-API | 大頭貼上傳（**不含 AI**）：multipart → 檢查檔頭 → 重新編碼、刪除 EXIF → S3；`AiGateway` stub（D37） | 3, 4 | 010, 011, 014, 058 | ⬜ |
| S3-API | 人臉驗證步驟：**預留**（自動略過並標記 `pending_ai`）；新手流程的權限檢查 | 3 | 009, 015, 058 | ⬜ |
| S4-API | 基本資料 + 標籤字典 + 自己的標籤（**欄位等你提供 CSV**） | 3, 4 | 002–005 | ⬜ |
| S5-API | 定位 + 硬篩選 + `/discovery`（先不用模型排序）+ 大頭貼的簽名網址 | 3, 4, 5 | 020–024, 030, 036 | ⬜ |
| S6-API | `PUT /swipes/{id}`、配對、封鎖 | 3, 4 | 040, 041 | ⬜ |
| S7-API | 對話、訊息（REST + Socket.IO）、推薦下一句的 stub | 3, 4 | 042, 043 | ⬜ |
| F7 | 從 NestJS 產生 OpenAPI 文件 → orval 產生前端 client | 2, 3 | — | ⬜ |

## 階段 3：前端

| 任務 | 內容 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| F3d | web：Next.js 16 骨架 + PWA + layout | 1, 2 | 050 | ⬜ |
| W1–W6 | 共用登入頁 → 大頭貼 → 人臉驗證（預留畫面）→ 基本資料 → 興趣 → 配對卡片 → 聊天 | 1, 2 | 各頁對應的 REQ | ⬜ |

## 階段 4：品質與部署

| 任務 | 內容 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| F3e | 容器化：api、web 的 Dockerfile + compose 的 `apps` profile | 0 | — | ⬜ |
| F3f | 自動檢查：Claude Code hooks、dependency-cruiser | 9 | 052 | ⬜ |
| F5 | CI（GitHub Actions）、gitleaks、Playwright | 9 | 052, 053 | ⬜ |
| S11 | 部署：HTTPS、手機實測（**要先討論部署平台**，D22） | 10 | 050, 057 | ⬜ |

## 階段 5：AI（前後端都完成後才開始，D37）

**開始前要先跟使用者討論模型選擇和 ensemble 策略（D13）。**

| 任務 | 內容 | 相關部分 | REQ | 狀態 |
|---|---|---|---|---|
| F3b | ai：uv workspace + FastAPI 骨架 | 3, 7 | — | ⬜ |
| F3c | ai-worker：Python worker + Redis 心跳 | 3, 7 | — | ⬜ |
| F4 | 佇列實驗：NestJS → BullMQ → Python worker（驗證 D05） | 0, 3 | — | ⬜ |
| AI-1 | 大頭貼品質檢查 + 人臉 Embedding（把 stub 換成真的實作） | 6, 7 | 012, 013 | ⬜ |
| AI-2 | 即時人臉驗證：活體偵測 + 跟大頭貼比對 | 6, 7 | 015 | ⬜ |
| AI-3 | 推薦 Stage 1 + Stage 2 + 排序 + 評估 | 5, 6, 7 | 016, 031–039 | ⬜ |
| AI-4 | Stage 3 聊天語意 | 6, 7 | 033, 043 | ⬜ |
| AI-5 | 推薦下一句（RAG／LLM，**要先討論**，D21） | 8 | 056 | ⬜ |

## 範圍切割

- **P0 必交**：階段 1–4。
- **P1（時間不夠時依序刪減）**：AI-5 → AI-4 → 多模型比較 → AI-2。
- **P2**：已讀、通知、持續學習（持續重新分群、重新排序）、改用 email 登入（REQ-008）。

## 需要提醒使用者討論的時間點

- S4-API 之前：**提供基本資料和興趣的欄位（CSV）**，一起設計資料表。
- S11 之前：部署平台（D22）。
- 階段 5 開始前：模型選擇和 ensemble 策略（D13）。
- AI-5 之前：RAG / LLM 的用途，以及聊天內容能不能送到外部服務（D21）。
