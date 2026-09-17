# 任務報告：S1-f 絕對逾時 30 天 + 確認帳號名稱格式

| 項目 | 內容 |
|---|---|
| 日期 | 2026-09-17 |
| Branch | `task/S1-f-absolute-timeout` |
| 對應 | REQ-007、D44（使用者決定：30 天、帳號名稱格式採用 A） |
| 📘 教學註解 | 14 行，合併前會移除（備份到 `.learn/S1-f/`） |

## 0. 一句話總結
除了原本的「**閒置 7 天**就失效」，現在再加上「**從登入起算滿 30 天**，不管有沒有在使用，都一定要重新登入」（OWASP 建議兩種逾時同時設定）。

## 1. 運作方式

```text
登入成功 → session 記下 authenticatedAt = 現在時間
之後每次呼叫需要登入的 API（SessionAuthGuard）：
  沒有 userId                         → 401
  現在 - authenticatedAt > 30 天       → 刪除 Redis 裡的 session + 清除 cookie → 401
  （沒有 authenticatedAt 的舊 session  → 視為過期 → 401）
  其他                                 → 放行
```

| | 閒置逾時（原本就有） | **絕對逾時（這次新增）** |
|---|---|---|
| 從什麼時候開始算 | 最後一次請求 | **登入的那一刻** |
| 持續使用會延長嗎 | 會（rolling） | **不會** |
| 設定 | `SESSION_TTL_SECONDS=604800`（7 天） | `SESSION_ABSOLUTE_TTL_SECONDS=2592000`（30 天） |
| 由誰執行 | Redis 的 TTL 和 cookie 的 maxAge | `SessionAuthGuard` |

**前端類比**：閒置逾時像「頁面放著不動太久就自動登出」；絕對逾時像「token 發出後 30 天到期，不能續期」。

## 2. 逐檔變更明細

行號是推上 GitHub 的版本（已移除 📘）。

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `apps/api/src/config/env.ts` | 14–18 | 🟢 | `SESSION_ABSOLUTE_TTL_SECONDS`，預設 30 天 | 可以在設定檔修改，不寫死在程式裡 |
| `apps/api/src/types/express-session.d.ts` | 7 | 🟢 | `authenticatedAt: number` | session 裡新增的欄位需要型別 |
| `apps/api/src/modules/auth/auth-session.ts` | 42 | 🟢 | 登入時寫入 `authenticatedAt = Date.now()` | 記錄起算點 |
| 同上 | 46–53 | 🟢 | `isAuthenticationExpired(req, env, now)` | 見 [註1] |
| `apps/api/src/modules/auth/session-auth.guard.ts` | 1–11 | 🟡 | import 加上 `Inject`、`Response`、`ENV`、`endSession`、`isAuthenticationExpired` | guard 需要讀設定、銷毀 session |
| 同上 | 19 | 🟢 | constructor 注入 `ENV` | ConfigModule 是 @Global，任何模組使用這個 guard 都能注入 |
| 同上 | 21–32 | 🟡 | `canActivate` 改成 async；過期時 `endSession` 並回 401 | 見 [註2] |
| `apps/api/src/modules/auth/session-auth.guard.spec.ts` | 1–56 | 🟢 | 4 個單元測試：沒登入、29 天（放行）、31 天（銷毀並回 401）、沒有登入時間（銷毀並回 401） | — |
| `apps/api/test/auth.e2e-spec.ts` | 240–265 | 🟢 | e2e 測試：註冊 → 直接把 Redis 裡的 `authenticatedAt` 改成 31 天前 → `/me` 回 401，而且 Redis 裡的 session 已經被刪除 | 用真的 Redis 驗證 |
| `apps/api/src/modules/auth/README.md` | 安全設計表 | 🟡 | Session 那一列補上 30 天絕對逾時 | — |
| `.env.example`（本機 `.env` 也同步更新） | 34–35 | 🟢 | `SESSION_ABSOLUTE_TTL_SECONDS=2592000` | — |
| `docs/00-DECISIONS.md` | D44 | 🟢 | 絕對逾時 30 天；帳號名稱格式確認採用 A | 使用者的決定 |
| `docs/02-REQUIREMENTS.md` | REQ-007 | 🟡 | 加上「閒置 7 天或登入滿 30 天就失效」 | 可以追溯到需求 |
| `docs/api/API-CATALOG.md` | ① | 🟡 | 帳號名稱格式從「待確認」改成「已確認」；補上 session 逾時說明 | — |
| `docs/tasks/S1-auth.md` | 第 9 節 | 🟡 | 待辦的第 3、4、8 項標記為完成 | 示範帳號已經刪除 |
| `docs/01-ROADMAP.md` | S1-f | 🟢 | 新增一列並標記 ✅ | 進度 |

### 註解
**[註1] `isAuthenticationExpired`**
- `now` 當成參數傳入，單元測試就能模擬「31 天後」，不需要真的等待，也不用 mock 系統時間。
- 沒有 `authenticatedAt` 的 session（這個功能上線前建立的）一律視為過期。寧可多要求一次登入，也不要讓舊的 session 永遠不會過期。

**[註2] 為什麼過期時要真的刪除 session**
如果只回 401、卻不刪除，Redis 裡還會留著一個「已登入」的 session，這個 cookie 被偷走時仍然有風險。刪除 session 並清除 cookie 之後，這個 session 就完全失效了。e2e 測試有驗證 Redis 裡的 key 已經不存在。

### repo 以外的改動
| 位置 | 內容 |
|---|---|
| 本機 `.env` | 新增 `SESSION_ABSOLUTE_TTL_SECONDS=2592000` |
| 本機資料庫和 Redis | 刪除 `demo_user` 和它的 session，也清掉 1 筆測試時留下的匿名 session（上一輪的要求） |

## 3. 驗證

| 檢查 | 結果 |
|---|---|
| Biome、typecheck、lint | ✅ |
| 單元測試 | ✅ **34 個通過**（新增 4 個） |
| e2e 測試 | ✅ **17 個通過**（新增 1 個） |
