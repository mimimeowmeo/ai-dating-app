# health 模組

| 項目 | 內容 |
|---|---|
| 用途 | 存活檢查（liveness）：回答「api 程式還活著嗎？」，給 Docker healthcheck 和監控使用 |
| 對應 REQ | 無（屬於基礎設施，見 ROADMAP 的 F3a） |
| 公開 API | `GET /api/v1/health` → `200 { "status": "ok" }` |
| 對外 export | `HealthModule`、`HealthResponse`（型別） |
| 擁有的資料表 | 無 |
| 依賴哪些模組 | 無 |

## 設計說明
- **刻意不檢查資料庫、Redis 這類外部服務**：外部服務暫時斷線時，重啟 api 也沒有幫助。
- 就緒檢查（readiness）會在 F6 之後另外新增 `/api/v1/health/ready`。
