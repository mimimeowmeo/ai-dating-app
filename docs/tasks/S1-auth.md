# 任務報告：S1-API 註冊、登入、登出（S1-a～S1-d，S1-e 前半）

| 項目 | 內容 |
|---|---|
| 日期 | 2026-09-17 |
| Branch | `task/S1-auth`（建立在 `docs/s1-auth-plan` 之上） |
| 對應 REQ | REQ-001、REQ-006、REQ-007、REQ-008、REQ-009 |
| 對應決策 | D23、D24、D28、D37–D43 |
| 學習指南 | [`03-backend-api.md`](../parts/03-backend-api.md)、**新增** [`04-database.md`](../parts/04-database.md) |
| 📘 教學註解 | 本機版本共 305 行，合併前會移除；有註解的版本會放在 `.learn/S1-auth/` |

---

## 0. 一句話總結

api 現在有**完整的帳號功能**：共用登入頁（`/auth/continue`）、註冊、登出、`/me`，以及 CSRF 防護、Argon2id 密碼雜湊、存在 Redis 的 session、登入失敗鎖定、RFC 9457 錯誤格式、啟動時驗證環境變數。資料庫裡已經有 `users` 資料表。
**單元測試 30 個、e2e 測試 16 個（真的 Postgres 和 Redis）全部通過**，也用 curl 實際跑過整個流程。

---

## 1. 你可以自己試

```bash
cd ~/Desktop/ai-dating-app && docker compose up -d --wait && pnpm --filter api db:migrate && pnpm --filter api dev
```
看到 `Nest application successfully started` 之後，開另一個終端機分頁，照第 5 節的 curl 流程試；或是執行下面這個指令，在瀏覽器裡看資料表：
```bash
pnpm --filter api db:studio
```

---

## 2. 資料表 `users`（實際建立在你的本機資料庫）

`\d users` 的實際輸出：
```text
     Column      |           Type           | Nullable |              Default
-----------------+--------------------------+----------+------------------------------------
 id              | uuid                     | not null | gen_random_uuid()
 username        | text                     | not null |
 email           | text                     |          |
 password_hash   | text                     | not null |
 status          | user_status              | not null | 'active'::user_status
 onboarding_step | onboarding_step          | not null | 'AVATAR_REQUIRED'::onboarding_step
 created_at      | timestamp with time zone | not null | now()
 updated_at      | timestamp with time zone | not null | now()
 deleted_at      | timestamp with time zone |          |
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "users_email_key" UNIQUE, btree (email)
    "users_username_key" UNIQUE, btree (username)
Check constraints:
    "users_username_format" CHECK (username ~ '^[a-z0-9_]{3,30}$'::text)
```

用 curl 註冊的示範帳號（password_hash 只顯示前 40 個字元）：
```text
 id                                   | username  | email | password_hash                             | status | onboarding_step
 b995ba70-4595-4f7a-8d74-1018f20d635d | demo_user |       | $argon2id$v=19$m=65536,p=4,t=3$hwy9SxtTM… | active | AVATAR_REQUIRED
```

| 欄位 | 設計原因 |
|---|---|
| `id` uuid | 不會像流水號一樣被猜到下一個使用者的 id |
| `username` + unique + check | 不分大小寫（存小寫）、不能重複、格式固定；**資料庫層級**保證，直接下 SQL 也寫不進錯誤的資料（已實測，會出現 `violates check constraint`） |
| `email` 可以是 null | 預留（D38）；Postgres 的 unique index 允許多個 NULL |
| `password_hash` | 只存 Argon2id 雜湊；參數 m=64 MiB、t=3、p=4，高於 OWASP 的最低要求 |
| `status`、`onboarding_step` enum | 只能存清單裡的值；新帳號從 `AVATAR_REQUIRED` 開始（D43） |
| `deleted_at` | 軟刪除用，實際的保存政策要由你決定 |

另外兩張你會看到的表：
- `spatial_ref_sys`：PostGIS 內建的座標系統表。
- `drizzle.__drizzle_migrations`：記錄哪些 migration 已經套用過。

---

## 3. 檔案地圖

```text
.env.example                         🟡 新增 session 和鎖定相關的變數，移除 JWT_SECRET
pnpm-workspace.yaml                  🟡 allowBuilds：明確拒絕 5 個套件的安裝腳本（見 [註1]）
pnpm-lock.yaml                       🟡（自動產生）
docs/parts/04-database.md            🟢 資料庫學習指南
docs/api/API-CATALOG.md、docs/01-ROADMAP.md   🟡 補上 /auth/csrf，更新 S1 的狀態
apps/api/
├── package.json                     🟡 新增依賴；dev 和 start 會讀根目錄的 .env；新增 db:* 指令
├── drizzle.config.ts                🟢 drizzle-kit 設定
├── drizzle/0000_create_users.sql    🟢（自動產生）第一個 migration，另外還有 meta/*.json
├── vitest.config.e2e.ts             🟡 globalSetup、逾時時間、依序執行
├── src/
│   ├── main.ts / app.module.ts / setup-app.ts   🟡 串接所有模組、session、驗證 pipe、錯誤 filter
│   ├── config/env.ts, config.module.ts           🟢 S1-a：用 Zod 驗證環境變數
│   ├── common/problem.ts                         🟢 S1-a：RFC 9457 錯誤格式、不外洩的 log
│   ├── infra/db/db.module.ts                     🟢 S1-b：連線池 + Drizzle
│   ├── infra/redis/redis.module.ts               🟢 S1-c：Redis 連線
│   ├── infra/session/session.middleware.ts       🟢 S1-c：express-session + RedisStore
│   ├── types/express-session.d.ts                🟢 S1-c：session 欄位的型別
│   ├── modules/users/                            🟢 S1-b：schema、repository、module、index、README
│   ├── modules/auth/                             🟢 S1-d：controller×2、service、schemas、hasher、lockout、session 工具、guard×2、module、index、README
│   └── modules/health/health.controller.ts       🟡 S1-b：新增 /health/ready
└── test/
    ├── global-setup.ts                           🟢 Testcontainers：啟動 Postgres 和 Redis，並套用 migration
    ├── support/test-app.ts                       🟢 建立 e2e 用的 app
    ├── auth.e2e-spec.ts                          🟢 12 個 e2e 測試
    └── health.e2e-spec.ts                        🟡 改用 test-app，並新增 ready 和 404 的測試
（另外有 *.spec.ts 單元測試：env、problem、auth.schemas、auth.service、health.controller）
```

---

## 4. 逐檔變更明細

> 行號是**推上 GitHub 的版本**（已移除 📘）。
> ⚠️ **這次超過了「5 個手寫檔案、約 300 行」的上限**：正式程式碼大約 870 行、測試大約 580 行。原因是你要求一次完成註冊、登入、登出，見第 10 節。

### 4.1 設定和錯誤格式（S1-a）

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `src/config/env.ts` | 3–21 | 🟢 | `envSchema`：`NODE_ENV`、`API_PORT`、`DATABASE_URL`（只接受 postgres 開頭）、`REDIS_URL`、`SESSION_SECRET`（至少 32 字元）、`SESSION_TTL_SECONDS`（7 天）、`COOKIE_SECURE`（預設 true）、`AUTH_LOCKOUT_*`（5 次、900 秒） | 設定錯誤時，啟動當下就失敗（取代 F3a 的 `readPort`） |
| 同上 | 27–33 | 🟢 | `parseEnv()`：用 `prettifyError` 列出所有錯誤的欄位 | 見 [註2] |
| `src/config/config.module.ts` | 1–14 | 🟢 | `@Global` 模組，用 `ENV` 這個 Symbol 提供驗證過的設定 | 其他地方用注入的方式取得設定，不直接讀 `process.env` |
| `src/common/problem.ts` | 23–31 | 🟢 | `ProblemException(status, code, detail?, errors?)` | 自訂的錯誤類別，每個錯誤都有 code |
| 同上 | 49–56 | 🟢 | `validationProblem()`：把 Zod 的錯誤轉成 `errors: [{ path, message }]` | 前端可以對應到表單欄位 |
| 同上 | 62–95 | 🟢 | `toProblem()`：ProblemException 保留 code；Nest 內建錯誤由狀態碼推出 code；其他錯誤一律回 500 `INTERNAL_ERROR` | 見 [註3] |
| 同上 | 97–108 | 🟢 | `describeForLog()`：DrizzleQueryError 只記錄 SQL 語句和 cause 的代碼 | 見 [註4] |
| 同上 | 110–117 | 🟢 | `ProblemDetailsFilter`：`@Catch()` 接住所有錯誤，回傳 `application/problem+json` | D42 |

### 4.2 資料庫（S1-b）

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `src/infra/db/db.module.ts` | 7–33 | 🟢 | `PG_POOL`（最多 10 條連線）、`DB`（Drizzle）；app 關閉時呼叫 `pool.end()` | 連線池可以重複使用連線；關閉時不留下殘留的連線 |
| `src/modules/users/users.schema.ts` | 4–38 | 🟢 | enum×2、`users` 資料表、兩個 unique index、格式檢查 | 見第 2 節 |
| `src/modules/users/users.repository.ts` | 8–15 | 🟢 | `isUsernameTaken()`：從 `DrizzleQueryError.cause` 判斷是不是 23505 錯誤，而且是 `users_username_key` 這個索引 | 見 [註5] |
| 同上 | 17–42 | 🟢 | `findByUsername`、`findById`、`createIfUsernameFree`（名稱重複時回傳 null） | 「找不到」和「重複」都是正常的業務結果，不用錯誤來表示 |
| `src/modules/users/users.module.ts`、`index.ts`、`README.md` | — | 🟢 | 只對外 export repository 和型別，資料表定義不公開 | D23 模組邊界 |
| `drizzle.config.ts` | 1–21 | 🟢 | 用 `process.loadEnvFile` 讀根目錄的 `.env`；schema 路徑是 `./src/modules/*/*.schema.ts` | 不需要安裝 dotenv；每個模組管理自己的資料表 |
| `drizzle/0000_create_users.sql` | 1–16 | 🟢 | （自動產生，指令是 `drizzle-kit generate --name create_users`） | 資料表結構的第一筆「commit」 |
| `src/modules/health/health.controller.ts` | 11–14、19–22、29–42 | 🟡 | 注入 `PG_POOL`、`REDIS`；新增 `GET /health/ready`（`select 1` + `PING`），失敗時回 503 且不附細節 | 就緒檢查 |

### 4.3 Session 和 CSRF（S1-c）

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `src/infra/redis/redis.module.ts` | 7–12 | 🟢 | `createRedisClient()` + `RedisClient` 型別 | 見 [註6] |
| 同上 | 14–41 | 🟢 | 用 async factory 建立連線；error 事件只記錄錯誤類型；app 關閉時呼叫 `close()` | log 不能出現連線字串（裡面有密碼） |
| `src/infra/session/session.middleware.ts` | 7–9 | 🟢 | cookie 名稱：`COOKIE_SECURE=true` 時用 `__Host-sid`，否則用 `sid` | OWASP 建議的 `__Host-` 前綴，必須搭配 Secure |
| 同上 | 11–27 | 🟢 | `RedisStore`（前綴 `heartlink:sess:`）、`resave:false`、`saveUninitialized:false`、`rolling:true`；cookie 設定 `httpOnly`、`sameSite:"strict"`、`maxAge` | 見 [註7] |
| `src/types/express-session.d.ts` | 1–8 | 🟢 | 擴充 `SessionData`，加上 `userId`、`csrfToken` | 讓 `req.session.userId` 有型別 |
| `src/modules/auth/auth-session.ts` | 16–25 | 🟢 | `ensureCsrfToken()`：沒有 token 就產生 32 bytes 的隨機值，並建立預備 session | 登入表單也要受到 CSRF 保護（OWASP：Login CSRF） |
| 同上 | 27–35 | 🟢 | `csrfTokenMatches()`：用 `timingSafeEqual` 比較 | 比較時間不會洩漏資訊 |
| 同上 | 37–44 | 🟢 | `startAuthenticatedSession()`：`regenerate` → 寫入 userId 和新 token → `save` | 見 [註8] |
| 同上 | 46–54 | 🟢 | `endSession()`：`destroy` + `clearCookie`（屬性跟設定時一致） | 屬性不一致的話，瀏覽器不會刪掉 cookie |
| `src/modules/auth/csrf.guard.ts` | 6–31 | 🟢 | GET、HEAD、OPTIONS 直接放行；`Sec-Fetch-Site: cross-site` 拒絕；`x-csrf-token` 不符合就回 403 | OWASP：synchronizer token + Fetch Metadata |

### 4.4 帳號（S1-d）與鎖定（S1-e 前半）

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `src/modules/auth/auth.schemas.ts` | 3–31 | 🟢 | username：trim → 轉小寫 → 格式檢查；password 8–128 個字元，**不做 trim**；register 用 `refine` 檢查兩次密碼一致，錯誤掛在 `passwordConfirm` | D38、D39；密碼的空白也是密碼的一部分 |
| `src/modules/auth/password-hasher.ts` | 1–22 | 🟢 | `hash`、`verify`、`verifyDummy`（假雜湊只算一次並快取） | 見 [註9] |
| `src/modules/auth/login-lockout.ts` | 16–35 | 🟢 | `isLocked`、`recordFailure`（`MULTI: INCR + EXPIRE NX`，達到上限時重設 TTL）、`reset` | 見 [註10] |
| `src/modules/auth/auth.service.ts` | 22–47 | 🟢 | `continue()`：鎖定中 → 假驗證 → 回 invalid；帳號不存在 → 假驗證 → 回 signup_required；帳號停用 → 假驗證 → 回 invalid；密碼錯 → 記錄失敗；密碼對 → 清除失敗紀錄 | D41、OWASP |
| 同上 | 49–53 | 🟢 | `register()`：先雜湊，再呼叫 `createIfUsernameFree` | 不存明文密碼 |
| `src/modules/auth/auth.controller.ts` | 45–89 | 🟢 | `GET csrf`、`POST continue`（200）、`POST register`（201）、`POST logout`（204） | 見 [註11] |
| `src/modules/auth/me.controller.ts` | 1–37 | 🟢 | `GET /me`：套用 `SessionAuthGuard`；帳號不存在或停用時清除 session 並回 401；`verificationStatus` 固定是 `pending_ai` | D37：AI 還沒完成前，不能標成「已通過」 |
| `src/modules/auth/session-auth.guard.ts` | 1–26 | 🟢 | `SessionAuthGuard`、`requireUserId()`、`unauthenticated()` | 之後其他模組也可以沿用 |
| `src/modules/auth/auth.module.ts` | 1–24 | 🟢 | 用 `APP_GUARD` 把 CsrfGuard 註冊成全域守衛 | 之後新增的模組也會自動受到保護 |
| `src/modules/auth/index.ts`、`README.md` | — | 🟢 | 對外 export、API 表、前端呼叫順序、安全設計、尚未完成的項目 | D23 |

### 4.5 串接與設定

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `src/app.module.ts` | 9–11 | 🟡 | 引入 Config、Db、Redis、Health、Users、Auth 模組 | 組裝 |
| `src/setup-app.ts` | 8–19 | 🟡 | 取得 env 和 redis → 設定前綴、shutdown hooks → **session middleware** → `StandardSchemaValidationPipe`（`exceptionFactory`）→ `ProblemDetailsFilter` | e2e 測試和正式執行共用同一份設定 |
| `src/main.ts` | 1–13 | 🟡 | 刪除 `readPort`，改用 `app.get(ENV).API_PORT` | 設定統一在同一個地方驗證 |
| `apps/api/package.json` | scripts | 🟡 | `dev` 加上 `--env-file ../../.env`（Nest CLI 12 的參數）；`start` 加上 `node --env-file-if-exists`；新增 `db:generate`、`db:migrate`、`db:studio` | 本機開發時讀 `.env`；容器裡沒有這個檔案也不會出錯 |
| 同上 | dependencies | 🟡 | 新增 `zod`、`drizzle-orm`、`pg`、`express-session`、`connect-redis`、`redis`、`argon2`；dev 新增 `drizzle-kit`、`@types/pg`、`@types/express-session`、`testcontainers`、`@testcontainers/postgresql`、`@testcontainers/redis` | 版本見 [註12] |
| `pnpm-workspace.yaml` | 5–10 | 🟡 | `allowBuilds`：`argon2`、`cpu-features`、`esbuild`、`protobufjs`、`ssh2` 全部設為 false | 見 [註1] |
| `.env.example` | API 區塊 | 🟡 | 刪除 `JWT_SECRET`；新增 `SESSION_SECRET`、`SESSION_TTL_SECONDS`、`COOKIE_SECURE=false`、`AUTH_LOCKOUT_MAX_ATTEMPTS`、`AUTH_LOCKOUT_SECONDS` | D40 改用 session，不用 JWT |
| `vitest.config.e2e.ts` | 3–13 | 🟡 | `globalSetup`、`hookTimeout: 180s`、`fileParallelism: false` | 啟動容器需要時間；測試共用同一個資料庫 |

### 註解

**[註1] 安裝腳本全部封鎖**
- pnpm 12 預設不執行套件的安裝腳本，這是供應鏈安全的防護。
- 實測結果：
  - `argon2` 已經附帶預先編譯好的 darwin-arm64、linux-arm64、linux-x64 版本，不需要安裝腳本也能用（hash 和 verify 都測過）。
  - drizzle-kit 需要的 esbuild 也能正常執行。
  - `cpu-features`、`ssh2`、`protobufjs` 是 testcontainers 的間接依賴，用不到它們的原生功能。
- 所以用 `pnpm approve-builds '!…'` 把這 5 個套件**明確設為拒絕**，沒有開任何例外。

**[註2] 環境變數的錯誤訊息不含密碼**
錯誤訊息只列出「哪個欄位錯了、為什麼錯」，不會印出變數的值。單元測試有驗證：錯誤訊息裡不會出現 `SESSION_SECRET` 的內容。

**[註3] 500 錯誤不透露內部細節**
例如資料庫回傳 `relation users does not exist`，前端只會收到 `INTERNAL_ERROR`，完整錯誤只記錄在伺服器的 log。

**[註4] ⚠️ 查看原始碼時發現的安全問題**
`DrizzleQueryError` 的 message 是 `Failed query: … params: …`，**會把查詢參數（例如密碼雜湊）一起帶出來**。如果直接 `logger.error(exception)`，雜湊就會寫進 log。所以改成只記錄 SQL 語句（`$1`、`$2` 這類佔位符）和錯誤代碼，並有單元測試驗證 log 裡不會出現雜湊。

**[註5] 為什麼要判斷索引名稱**
`users` 表有兩個 unique index（username、email）。只有 username 重複才算「帳號名稱已被使用」；如果是 email 重複，錯誤會繼續往外丟，交給 filter 處理。e2e 的「同時註冊」測試證明了 pg 錯誤的 `constraint` 欄位就是索引名稱。

**[註6] 為什麼要包一層 `createRedisClient`**
`ReturnType<typeof createClient>` 會拿到泛型的預設型別，在 `exactOptionalPropertyTypes` 下會跟實際的 client 型別不相容。這是 typecheck 抓出來的錯誤，所以用一個非泛型的函式來推導型別。

**[註7] session 的設定都依照官方建議**
- `resave:false`：connect-redis 規定必須這樣設。
- `saveUninitialized:false`：NestJS 和 express-session 的官方建議。
- `rolling:true`：閒置逾時，一段時間沒有使用就失效。
- `sameSite:"strict"`：OWASP 偏好的設定。
- 本機是 http，所以 `COOKIE_SECURE=false`。**正式環境一定要是 true**，而且在 Nginx 後面時要設定 `trust proxy`。

**[註8] 為什麼登入後要換 session**
這是在防範 session fixation。e2e 測試有驗證：登入後舊的 CSRF token 立刻失效（回 403），而且 Set-Cookie 裡的 session ID 也換了。

**[註9] 為什麼帳號不存在時也要做假驗證**
如果「帳號不存在」回應得特別快，攻擊者就能從回應時間判斷帳號是否存在。假驗證用的是同樣的 Argon2 參數，所以花費的時間差不多。

**[註10] 鎖定的計算方式**
- 失敗計數以**帳號**為單位（OWASP 建議），換 IP 也躲不掉。
- 從第一次失敗開始計時；達到上限時，重新設定完整的 15 分鐘，確保鎖定一定持續 15 分鐘。
- 用 `MULTI` 讓 INCR 和 EXPIRE 一起執行，避免只加了次數、卻沒設定過期時間，導致帳號被永久鎖住。
- 鎖定期間，就算密碼正確也回「帳號或密碼錯誤」，對外不透露「被鎖定」這件事。

**[註11] controller 的回應設計**
- `continue` 回 200，因為沒有建立任何東西。
- `register` 回 201，並直接登入。
- `logout` 就算沒有登入也回 204（冪等），但仍然需要 CSRF token，避免被別的網站強制登出。
- 登入或註冊成功後，會回傳**新的** `csrfToken`，前端之後的請求都要改用它。

**[註12] 實際安裝的版本**
| 套件 | 版本 |
|---|---|
| zod | 4.6.5 |
| drizzle-orm | 0.45.2（穩定版；1.0 還是 beta） |
| drizzle-kit | 0.31.10 |
| pg | 8.23.0 |
| express-session | 1.19.0 |
| connect-redis | 10.0.0 |
| redis | 6.2.1 |
| argon2 | 0.45.1 |
| testcontainers | 12.1.0 |

以上都已發布超過 1 天（D27）。

### repo 以外的改動

| 位置 | 狀態 | 內容 |
|---|---|---|
| 本機 `.env` | 🟡 | 刪除 `JWT_SECRET`；新增隨機產生的 `SESSION_SECRET`（64 字元）和其他新變數 |
| 本機 Postgres | 🟢 | 套用了 `0000_create_users`；新增一個示範帳號 `demo_user`（密碼 `demo-password-1`），不需要的話可以刪掉 |
| 本機 Redis | 🟢 | 有 2 筆示範用的 session |
| Docker Desktop | ▶️ | 你的 Docker Desktop 在 04:09 左右關閉了，我重新啟動它，並把 heartlink 的 3 個容器帶起來（舊專案沒有動） |

---

## 5. 實際流程（curl 對開發伺服器，實際輸出）

```text
① GET  /auth/csrf        → token: Du42Xg9kD242…
② POST /auth/continue    → {"result":"signup_required"}
③ POST /auth/register    → {"onboardingStep":"AVATAR_REQUIRED","csrfToken":"XkxfGyx5…"}
④ GET  /me               → {"id":"b995ba70-…","username":"demo_user","onboardingStep":"AVATAR_REQUIRED","verificationStatus":"pending_ai"}
⑤ POST /auth/logout      → HTTP 204
⑥ GET  /me               → 401 {"code":"UNAUTHENTICATED","detail":"請先登入", …}
⑦ POST /auth/continue（密碼錯誤）→ 401 {"code":"INVALID_CREDENTIALS","detail":"帳號或密碼錯誤", …}
⑧ POST /auth/continue（"DEMO_USER" + 正確密碼）→ {"result":"logged_in", …}
⑨ 沒有帶 CSRF token      → 403 {"code":"CSRF_TOKEN_INVALID", …}
⑩ 格式錯誤               → 400 {"code":"VALIDATION_FAILED","errors":[username、password、passwordConfirm 各一筆]}
Set-Cookie: sid=<redacted>; Path=/; Expires=…; HttpOnly; SameSite=Strict
```

### 資料流：`POST /api/v1/auth/continue`
```text
瀏覽器（x-csrf-token + cookie sid）
 → express-session：用 sid 到 Redis 取出 session
 → CsrfGuard：檢查 Sec-Fetch-Site 和 token
 → StandardSchemaValidationPipe：用 continueSchema 驗證（帳號名稱轉小寫）
 → AuthController.continue
   → AuthService.continue
     → LoginLockout.isLocked（Redis）
     → UsersRepository.findByUsername（Postgres）
     → PasswordHasher.verify（Argon2id）
     → LoginLockout.reset 或 recordFailure（Redis）
   → startAuthenticatedSession：regenerate → userId、新的 token → 存回 Redis
 → 回傳 JSON（或丟出 ProblemException → ProblemDetailsFilter → problem+json）
```

---

## 6. 驗證結果（全部實際執行過）

| # | 檢查項目 | 結果 |
|---|---|---|
| 1 | `pnpm check`（Biome） | ✅ `Checked 51 files … No fixes applied.` |
| 2 | typecheck（D28 的所有嚴格設定都開著） | ✅ |
| 3 | lint | ✅ |
| 4 | 單元測試 | ✅ **30 個通過**（env 5、problem 5、auth.schemas 10、auth.service 7、health 3） |
| 5 | e2e 測試（Testcontainers：Postgres 18 + Redis 8） | ✅ **16 個通過**，約 3 秒（見下表） |
| 6 | build | ✅ |
| 7 | 根目錄的 Turborepo：lint、typecheck、test、build | ✅ |
| 8 | `pnpm peers check` | ✅ 沒有問題 |
| 9 | 本機套用 migration | ✅ `migrations applied successfully` |
| 10 | 在資料庫直接寫入錯誤格式的帳號名稱 | ✅ 被 check 限制擋下 |
| 11 | curl 走完整個流程 | ✅ 見第 5 節 |

### e2e 測試清單
| 分類 | 測試 |
|---|---|
| CSRF | cookie 有 HttpOnly 和 SameSite=Strict；沒帶 token → 403；token 錯誤 → 403；cross-site → 403 |
| 共用登入頁 | 帳號不存在 → signup_required，而且**資料表裡沒有多出資料**；格式錯誤 → 400，錯誤掛在正確的欄位 |
| 完整流程 | 註冊（大寫名稱被存成小寫）→ `/me` → **舊 token 失效** → 登出 → `/me` 回 401 → 用大寫名稱登入 → **session cookie 換新** |
| 密碼儲存 | 以 `$argon2id$` 開頭，m ≥ 19456、t ≥ 2、p ≥ 1，而且不含明文密碼 |
| 衝突與失敗 | 兩個人**同時**註冊同一個名稱 → 一個 201、一個 409；密碼錯誤 → 固定的錯誤訊息；失敗 5 次後就算密碼正確也回 401，Redis 計數是 5、TTL ≤ 900，清除計數後可以登入；沒登入時登出 → 204 |
| health | `/health`、`/health/ready`、前綴以內不存在的路徑 → problem+json 的 404 |

---

## 7. 過程中遇到的問題

| 問題 | 處理方式 |
|---|---|
| `@nestjs/throttler` 6.6（第一個支援 NestJS 12 的版本）發布不到 1 天，6.5 又不支援 NestJS 12 | 先做以帳號為單位的鎖定（OWASP 最強調的項目），**IP 限流等 6.6 發布滿一天再加** |
| pnpm 12 擋下 7 個套件的安裝腳本 | 實測不需要這些腳本，全部明確拒絕（[註1]） |
| Redis client 的型別對不上 | 用非泛型的函式推導型別（[註6]） |
| DrizzleQueryError 會把查詢參數寫進 message | 新增 `describeForLog`，並寫測試驗證（[註4]） |
| Docker Desktop 被關閉，Testcontainers 找不到 Docker | 重新啟動 Docker Desktop |
| 前綴以外的 404 是 Express 的 HTML | 這是 NestJS 的設計，正式環境由 Nginx 過濾；測試改成驗證前綴以內的 404 |
| zsh 不會切開沒有加引號的變數（又遇到一次） | 改用 `while read` 逐行處理 |

---

## 8. 這次學到的重點

1. **後端的分層**：controller 處理 HTTP → service 處理業務規則 → repository 存取資料庫。service 回傳「結果物件」，由 controller 決定要回什麼狀態碼。
2. **Session 的原理**：cookie 只是「號碼牌」，真正的資料存在伺服器的 Redis；登入後要換一張新號碼牌（session fixation）。
3. **CSRF**：cookie 會被瀏覽器自動帶上，所以還需要一個「只有我們的網頁拿得到」的 token。
4. **資料庫是最後一道防線**：unique 和 check 限制能擋住程式的 bug 和同時送出的請求。
5. **安全細節都藏在細節裡**：錯誤訊息、回應時間、log 內容、密碼要不要 trim，每一項都有可能洩漏資訊。

---

## 9. 待辦 / 風險

| # | 項目 | 說明 | 什麼時候處理 |
|---|---|---|---|
| 1 | IP 限流 | 等 `@nestjs/throttler` 6.6 發布滿一天（D27） | S1-e 後半 |
| 2 | ⚠️ 預備 session 可能被灌爆 | 任何人都能一直呼叫 `GET /auth/csrf`，每次都會在 Redis 建立一筆 session（保留 7 天）。要靠 IP 限流來擋，並把預備 session 的保存時間縮短 | S1-e 後半 |
| 3 | ~~沒有絕對逾時~~ | ✅ 已決定並實作：30 天（D44，見 `docs/tasks/S1-f.md`） | 已完成 |
| 4 | ~~帳號名稱的格式~~ | ✅ 已確認採用 A（D44） | 已完成 |
| 5 | CORS | 前端要怎麼呼叫 api（同源代理或 CORS 白名單） | F3d |
| 6 | `trust proxy` 和 Secure cookie | 正式環境在 Nginx 後面時要設定 | S11 |
| 7 | CI 要先 build Postgres 映像 | Testcontainers 用的是本機 build 的 `heartlink/postgres` | F5 |
| 8 | ~~示範帳號 `demo_user`~~ | ✅ 已經刪除（連同它在 Redis 的 session） | 已完成 |

---

## 10. 關於改動大小

這次 PR 很大：正式程式碼約 870 行、測試約 580 行，另外有 305 行 📘 註解。原因是你要求「註冊、登入、登出一次做出來」，而且這些功能之間互相依賴：沒有 session 就沒辦法登入，沒有資料表就沒辦法註冊。

- 報告已經依照 S1-a 到 S1-e 分節說明（第 4 節），方便逐段看。
- **如果你希望 git 歷史也分成 4 個 PR**（S1-a、S1-b、S1-c、S1-d），告訴我，我會分成 4 次 commit，依序合併。
