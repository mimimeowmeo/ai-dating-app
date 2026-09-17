# auth 模組

| 項目 | 內容 |
|---|---|
| 用途 | 共用登入頁、註冊、登出、目前的使用者；session 和 CSRF 防護 |
| 對應 REQ | REQ-001、REQ-006、REQ-007、REQ-009（onboardingStep） |
| 對應決策 | D38–D43 |
| 對外 export | `AuthModule`、`SessionAuthGuard`、`requireUserId`，型別 `ContinueResponse`、`RegisterResponse`、`MeResponse` |
| 擁有的資料表 | 無（使用者資料屬於 users 模組）；Redis key：`heartlink:sess:*`（session）、`heartlink:auth:fail:<username>`（失敗計數） |
| 依賴 | users 模組、`infra/redis`、`infra/session`、`config` |

## API

| Method | Path | 需要登入 | 需要 CSRF token | 成功 | 失敗 |
|---|---|---|---|---|---|
| GET | `/api/v1/auth/csrf` | ✗ | ✗ | `200 { csrfToken }` | — |
| POST | `/api/v1/auth/continue` | ✗ | ✓ | `200 { result: "logged_in", onboardingStep, csrfToken }` 或 `200 { result: "signup_required" }` | `400 VALIDATION_FAILED`、`401 INVALID_CREDENTIALS`、`403 CSRF_TOKEN_INVALID` |
| POST | `/api/v1/auth/register` | ✗ | ✓ | `201 { onboardingStep, csrfToken }` | `400`、`403`、`409 USERNAME_TAKEN` |
| POST | `/api/v1/auth/logout` | ✗（沒登入也回 204） | ✓ | `204` | `403` |
| GET | `/api/v1/me` | ✓ | ✗ | `200 { id, username, onboardingStep, verificationStatus }` | `401 UNAUTHENTICATED` |

## 前端的呼叫順序
1. `GET /auth/csrf` → 取得 `csrfToken`。這一步會建立預備 session 並發 cookie。
2. `POST /auth/continue`，header 帶 `x-csrf-token`：
   - `logged_in` → 改用回應裡的**新** `csrfToken`，依照 `onboardingStep` 導頁。
   - `signup_required` → 顯示「確認密碼」欄位，再呼叫 `POST /auth/register`（token 用原本那個）。
3. 之後每個 POST、PUT、PATCH、DELETE 請求都要帶**最新的** `x-csrf-token`。
4. `fetch` 要加 `credentials: "include"`（或同源請求），瀏覽器才會送出 cookie。

## 安全設計

| 項目 | 做法 | 依據 |
|---|---|---|
| 密碼 | Argon2id（m=64 MiB、t=3、p=4），長度 8–128 個字元，不做 trim | OWASP Password Storage、D39 |
| 錯誤訊息 | 密碼錯誤、帳號鎖定、帳號停用，一律回「帳號或密碼錯誤」 | OWASP Authentication |
| 回應時間 | 帳號不存在或鎖定時，也做一次假的 Argon2 驗證 | OWASP Authentication |
| 帳號鎖定 | 以帳號為單位計算，失敗 5 次鎖定 15 分鐘（可以設定） | OWASP Authentication、D41 |
| Session | 存在 Redis；cookie 設定 `HttpOnly`、`SameSite=Strict`，正式環境再加 `Secure` 和 `__Host-` 前綴；閒置 7 天後失效 | OWASP Session Management、D40 |
| Session fixation | 登入或註冊成功時用 `regenerate()` 換一個新的 session ID | OWASP Session Management |
| CSRF | synchronizer token（存在 session）+ 拒絕 `Sec-Fetch-Site: cross-site`；登入表單也受到保護（預備 session） | OWASP CSRF Prevention |
| Log | 資料庫錯誤不記錄查詢參數（`describeForLog`） | 避免密碼雜湊外洩 |

## 尚未完成
- **IP 層級的限流**（`@nestjs/throttler`）：6.6.0 才開始支援 NestJS 12，但它發布還不到 1 天（D27），等發布滿一天後再加入（S1-e 的後半段）。
- 允許前端跨網域呼叫的 CORS 設定：等 F3d 決定前端怎麼呼叫 api 時再處理（建議由 Next.js 或 Nginx 轉發，維持同源）。
- 正式環境在 Nginx 後面時，要設定 `trust proxy`，`Secure` cookie 才會生效（S11）。
