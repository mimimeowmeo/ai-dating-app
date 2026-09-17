# 第 4 部分：資料庫指南（PostgreSQL + Drizzle）

> 給前端工程師的資料庫入門，以及本專案的資料庫規範。第一次實作紀錄見 `docs/tasks/S1-auth.md`。

---

## 1. 基本概念

| 資料庫名詞 | 是什麼 | 前端類比 |
|---|---|---|
| **table（資料表）** | 一張有固定欄位的表格 | 一個 TypeScript interface 的陣列 |
| **row（列）** | 一筆資料 | 陣列裡的一個物件 |
| **column（欄位）** | 每筆資料都有的屬性，型別固定 | interface 的屬性 |
| **primary key（主鍵）** | 唯一識別一列的欄位（本專案用 uuid） | React 列表的 `key` |
| **unique index（唯一索引）** | 保證某欄位的值不重複，同時加快查詢 | `new Set()`，但由資料庫保證 |
| **check constraint（檢查限制）** | 寫入前檢查資料是否符合規則 | Zod schema，但放在資料庫裡 |
| **enum（列舉型別）** | 只能是清單裡的值 | TypeScript 的 union type `"a" \| "b"` |
| **migration** | 一次資料表結構的變更（SQL 檔） | 資料庫結構的 git commit |
| **ORM（Drizzle）** | 用 TypeScript 寫查詢，自動轉成 SQL | 型別安全的 fetch client |
| **connection pool（連線池）** | 預先開好幾條連線重複使用 | 保持 keep-alive 的 HTTP 連線 |
| **transaction（交易）** | 多個操作「全部成功或全部失敗」 | 沒有直接對應；像一次 atomic 的 state 更新 |

### 為什麼規則要同時寫在程式和資料庫
- 程式（Zod）負責給使用者**友善的錯誤訊息**。
- 資料庫（check、unique）負責**最後一道防線**：就算程式有 bug，或兩個請求同時進來，也寫不進錯誤的資料。
- 例子：「帳號名稱不能重複」，如果只在程式裡「先查再建」，兩個人同時註冊同一個名稱時，兩邊都會以為名稱可用。交給 unique index 判斷才可靠。e2e 測試裡的「同時註冊」案例就在驗證這件事。

---

## 2. Drizzle 的工作流程（D24）

```text
① 修改 src/modules/<模組>/<模組>.schema.ts（TypeScript）
② pnpm --filter api db:generate   → drizzle-kit 比對差異，產生 drizzle/000X_名稱.sql
③ 檢查產生的 SQL，確認沒有非預期的 DROP（會刪資料的變更要先問使用者）
④ pnpm --filter api db:migrate    → 套用到本機資料庫（記錄在 drizzle.__drizzle_migrations）
⑤ SQL 檔和 meta/ 一起 commit
```

| 指令 | 作用 |
|---|---|
| `pnpm --filter api db:generate -- --name <名稱>` | 產生 migration |
| `pnpm --filter api db:migrate` | 套用還沒套用過的 migration |
| `pnpm --filter api db:studio` | 開啟 **Drizzle Studio**：在瀏覽器裡用表格的方式查看和編輯資料 |

**不能做的事**：
- 直接用 SQL 或 GUI 修改資料表結構。
- 修改已經套用過的 migration 檔：要改就再產生一個新的。

---

## 3. Drizzle 查詢速查

| 想做的事 | Drizzle | 對應的 SQL |
|---|---|---|
| 查一筆 | `db.select().from(users).where(eq(users.username, "alice")).limit(1)` | `select * from users where username = $1 limit 1` |
| 新增並取回 | `db.insert(users).values({...}).returning()` | `insert into users (...) values (...) returning *` |
| 更新 | `db.update(users).set({ status: "locked" }).where(eq(users.id, id))` | `update users set status = $1 where id = $2` |
| 刪除 | `db.delete(users).where(eq(users.id, id))` | `delete from users where id = $1` |

`$1`、`$2` 是**參數化查詢**：值和 SQL 分開傳送，所以不會有 SQL injection。

---

## 4. 直接查看資料庫

```bash
docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

| psql 指令 | 作用 |
|---|---|
| `\dt` | 列出所有資料表 |
| `\d users` | 查看 users 的欄位、索引、限制 |
| `\dT+` | 列出所有型別（包含 enum） |
| `\x` | 切換成直式顯示，欄位很多時比較好讀 |
| `\q` | 離開 |

你看到的 `spatial_ref_sys` 是 **PostGIS 擴充套件自己建立的表**，裡面是座標系統的定義，不用理它。

---

## 5. 本專案的資料庫規範

1. 資料表名稱用 snake_case 複數，欄位用 snake_case；TypeScript 那一側用 camelCase。
2. 主鍵一律用 `uuid().defaultRandom()`，避免被猜到下一個 id。
3. 時間一律用 `timestamp with time zone`。
4. 重要的規則要在資料庫層級加上 unique 或 check 限制。
5. 每個模組只能存取自己的資料表；別的模組要透過它的 repository（D23）。
6. repository 回傳 `undefined` 或 `null` 表示「找不到」或「衝突」，不要用錯誤來表示正常的業務情況。
7. **log 不能記錄查詢參數**（可能包含密碼雜湊等敏感資料），見 `common/problem.ts` 的 `describeForLog`。
8. 整合測試用 Testcontainers 啟動全新的資料庫，並套用所有 migration。

---

## 6. 常見錯誤

| 現象 | 原因 | 解法 |
|---|---|---|
| `DATABASE_URL is required for drizzle-kit` | 根目錄沒有 `.env` | `cp .env.example .env`，並填好密碼 |
| `ECONNREFUSED 127.0.0.1:5433` | Postgres 容器沒有在執行（或 Docker Desktop 關掉了） | 開啟 Docker Desktop，再執行 `docker compose up -d --wait` |
| `relation "users" does not exist` | 還沒套用 migration | `pnpm --filter api db:migrate` |
| `violates check constraint "users_username_format"` | 寫入的帳號名稱不符合格式（大寫、太短等） | 由程式先 `toLowerCase()` 並驗證 |
| `duplicate key value violates unique constraint` | 值重複（錯誤代碼 23505） | repository 要把它轉成業務結果（例如 409） |
| `Could not find a working container runtime strategy`（測試時） | Docker Desktop 沒有在執行 | 開啟 Docker Desktop |
