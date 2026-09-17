# health 模組

| 項目 | 內容 |
|---|---|
| 用途 | 存活檢查（liveness）和就緒檢查（readiness），給 Docker healthcheck、部署和監控使用 |
| 對應 REQ | 無（屬於基礎設施，見 ROADMAP 的 F3a、S1-b） |
| 公開 API | `GET /api/v1/health` → `200 { "status": "ok" }`<br>`GET /api/v1/health/ready` → `200 { "status": "ok", "checks": { "database": "ok", "redis": "ok" } }`，有任何一個連不上就回 `503 DEPENDENCY_UNAVAILABLE` |
| 對外 export | `HealthModule`、`HealthResponse`（型別） |
| 擁有的資料表 | 無 |
| 依賴 | `infra/db`（`PG_POOL`）、`infra/redis`（`REDIS`） |

## 設計說明
- **存活檢查刻意不碰外部服務**：外部服務暫時斷線時，重啟 api 也沒有幫助。
- **就緒檢查**才會檢查資料庫和 Redis，用來判斷「可以開始接收流量了嗎」；失敗時不回傳錯誤細節。
