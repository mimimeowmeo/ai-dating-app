# users 模組

| 項目 | 內容 |
|---|---|
| 用途 | 使用者帳號資料的存取（不含登入邏輯；登入在 auth 模組） |
| 對應 REQ | REQ-001、REQ-006、REQ-008、REQ-009 |
| 公開 API（HTTP） | 無（`GET /me` 由 auth 模組提供） |
| 對外 export | `UsersModule`、`UsersRepository`、`UserRow`（型別） |
| 擁有的資料表 | `users`（列舉型別：`user_status`、`onboarding_step`） |
| 依賴 | `infra/db` |

## 資料表 `users`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uuid PK | 由 `gen_random_uuid()` 產生 |
| `username` | text，不能重複 | 一律存成小寫；check 限制：`^[a-z0-9_]{3,30}$`（D38） |
| `email` | text，可以是 null，不能重複 | **預留**（REQ-008） |
| `password_hash` | text | Argon2id（D39） |
| `status` | `user_status` | active / locked / deleted |
| `onboarding_step` | `onboarding_step` | 新帳號從 `AVATAR_REQUIRED` 開始 |
| `created_at`、`updated_at`、`deleted_at` | timestamptz | `deleted_at` 用來做軟刪除 |

## 設計說明
- 「帳號名稱不能重複」交給資料庫的 unique index 保證，`createIfUsernameFree` 遇到重複時回傳 `null`，不丟錯誤；這樣兩個請求同時註冊同一個名稱時也不會出錯。
- 登入失敗的次數存在 Redis（auth 模組），不存在這張表。
