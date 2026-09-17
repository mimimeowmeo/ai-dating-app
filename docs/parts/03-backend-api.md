# 第 3 部分：後端 API 指南（NestJS + FastAPI）

> 給前端工程師的後端入門，以及這個專案的後端規範。
> 本專案有兩個後端：**NestJS**（TypeScript，業務邏輯）和 **FastAPI**（Python，AI 推論）。

---

## 1. 後端在做什麼

前端在瀏覽器裡執行，所有使用者都拿得到程式碼，所以**不能被信任**。
後端在我們自己的伺服器上執行，負責「只有伺服器能做的事」。

| 後端的責任 | 為什麼不能放在前端 | 本專案的例子 |
|---|---|---|
| 驗證身分（登入、JWT） | 前端的判斷可以被使用者竄改 | `POST /auth/login` |
| 存取資料庫 | 資料庫密碼不能給瀏覽器 | Drizzle 查詢 |
| 業務規則 | 例如「只有配對成功才能聊天」，前端擋不住 | interactions 模組 |
| 硬篩選 | 別人的年齡、精確座標不能送到瀏覽器 | `ST_DWithin` |
| 呼叫 AI 和第三方服務 | 金鑰不能外流；運算量大 | api → ai 服務 |
| 背景工作 | 使用者關掉網頁後，工作還是要繼續 | BullMQ → ai-worker |

### 一個請求的完整路徑（NestJS）
```text
瀏覽器 fetch('/api/v1/profile')
  → Middleware        （記錄 log、CORS）          ≈ Next.js middleware
  → Guard             （有沒有登入、有沒有權限）   ≈ 需要登入的路由保護
  → Interceptor（前） （計時、轉換）
  → Pipe              （驗證和轉換輸入）           ≈ 用 Zod 驗證表單
  → Controller        （接收 HTTP，呼叫 service）  ≈ Next.js route handler
  → Service           （業務邏輯）                 ≈ custom hook
  → Repository        （資料庫存取）               ≈ fetcher
  → Interceptor（後） （包裝回應）
  → Exception Filter  （把錯誤轉成統一的 JSON）    ≈ Error Boundary
  → 回應 JSON
```

---

## 2. NestJS 核心概念

| 概念 | 是什麼 | 前端類比 | 寫法 |
|---|---|---|---|
| **Module** | 把相關的 controller 和 provider 包成一組，並宣告它依賴哪些模組 | 一個 feature 資料夾，加上它的 `index.ts` | `@Module({ imports, controllers, providers, exports })` |
| **Controller** | 定義路由，負責 HTTP 的進出 | Next.js 的 `route.ts` | `@Controller('profile')`、`@Get()` |
| **Provider / Service** | 可以被注入的 class，放業務邏輯 | custom hook 或 context value | `@Injectable()` |
| **Dependency Injection（DI，依賴注入）** | 由框架建立物件並傳給需要的地方，不用自己 `new` | React Context Provider + `useContext` | 在 constructor 參數宣告型別 |
| **Decorator（裝飾器）** | `@` 開頭的標記，框架會讀取它，替 class 或方法加上行為 | 有點像 HOC | `@Get()`、`@Body()` |
| **DTO / Schema** | 描述輸入輸出的格式，並拿來驗證 | Zod schema、props 型別 | NestJS 12 原生支援 Standard Schema（可以直接用 Zod） |
| **Pipe** | 在進入 controller 之前驗證或轉換參數 | 表單送出前的驗證 | `ValidationPipe` |
| **Guard** | 決定這個請求能不能繼續 | 需要登入才能看的頁面 | `@UseGuards(AuthGuard)` |
| **Exception Filter** | 攔截錯誤，轉成統一的格式 | Error Boundary | `@Catch()` |
| **Lifecycle hooks** | 模組初始化、關閉時執行的程式 | `useEffect` 的 mount / cleanup | `onModuleInit`、`onModuleDestroy` |

### 為什麼 NestJS 需要 `experimentalDecorators` 和 `emitDecoratorMetadata`
- DI 要知道「constructor 需要什麼型別」，但 TypeScript 的型別在編譯後會消失。
- `emitDecoratorMetadata` 會把型別資訊寫進編譯後的 JavaScript，NestJS 透過 `reflect-metadata` 讀取，才知道要注入哪個 service。
- 所以這兩個選項**只加在 api 的 tsconfig**，不放進共用的 `tsconfig.base.json`。

### NestJS 12 的預設（官方 migration guide）
- 核心套件改成 **ESM**，新專案可以選 ESM 或 CommonJS 的專案結構。
- 新專案預設使用 **Vitest**，lint 工具預設是 **oxlint**；本專案統一用 **Biome**（D26）。
- 原生支援 **Standard Schema**，可以直接用 Zod 驗證。
- 內建 observability，也就是 log、metrics、tracing。

---

## 3. FastAPI 核心概念（Python）

| 概念 | 是什麼 | 前端或 NestJS 類比 |
|---|---|---|
| **ASGI / Uvicorn** | Python 的非同步網路伺服器規格，uvicorn 是實作它的伺服器 | 類似 Node 的 http server |
| **`FastAPI()` app** | 應用程式本體 | NestJS 的 `NestFactory.create()` |
| **`APIRouter`** | 一組路由 | NestJS 的 controller |
| **Path operation**（`@router.get("/health")`） | 一個 API | `@Get()` |
| **Pydantic model** | 用型別描述並驗證資料 | Zod schema |
| **`Depends()`** | FastAPI 的依賴注入 | NestJS 的 DI |
| **`async def`** | 非同步函式 | JS 的 `async function` |
| **OpenAPI** | FastAPI 會自動產生 `/openapi.json` 和 `/docs` 頁面 | 一樣會用 orval 產生 client（D15） |

### Python 工具對照
| Python 工具 | 作用 | Node 世界的對應 |
|---|---|---|
| **uv** | 套件管理、Python 版本、虛擬環境 | pnpm + fnm |
| `pyproject.toml` | 專案設定和依賴 | `package.json` |
| `uv.lock` | 鎖定的版本 | `pnpm-lock.yaml` |
| `.venv/` | 專案自己的套件資料夾 | `node_modules/` |
| **uv workspace** | 多個 Python 專案共用一份 lock 檔 | pnpm workspace |
| **ruff** | lint + 格式化 | Biome |
| **mypy**（strict） | 型別檢查 | `tsc --noEmit` |
| **pytest** | 測試 | Vitest |

---

## 4. Health check（健康檢查）

| 種類 | 問的問題 | 失敗時怎麼處理 | 本專案 |
|---|---|---|---|
| **Liveness**（存活） | 程式還活著嗎？ | 重啟容器 | `GET /health` → `{"status":"ok"}`，**不檢查外部服務** |
| **Readiness**（就緒） | 可以接收流量了嗎？ | 暫時不要把流量送過來 | `GET /health/ready`：檢查資料庫、Redis 是否連得上（F6 之後加入） |

**為什麼存活檢查不檢查資料庫？** 資料庫暫時斷線時，重啟 api 也沒有幫助，反而會讓所有 api 容器一起不停重啟。

**沒有 HTTP 的背景 worker 怎麼檢查？** 用「心跳」：worker 定期把時間戳記寫進 Redis，Docker 的 healthcheck 再執行一個小指令，檢查心跳是不是夠新。這樣就不需要為 worker 另外開 HTTP port（D34）。

---

## 5. 本專案的後端規範

1. **目錄結構**：照 `docs/architecture/MODULES.md`，一個功能一個模組，只能透過 `index.ts` 互相使用。
2. **controller 只處理 HTTP**：不寫業務邏輯，也不直接查資料庫。
3. **所有外部輸入都要驗證**：body、query、params、環境變數、佇列 job 的資料。TypeScript 用 Zod，Python 用 Pydantic。
4. **統一錯誤格式**：`{ code, message, details? }`，錯誤代碼用大寫蛇形。
5. **環境變數集中讀取**：啟動時就驗證一次，缺少必要的值就直接停止，不要到用到時才出錯。
6. **API 路徑前綴**：NestJS 用 `/api/v1`；FastAPI 是內部服務，用 `/internal`；健康檢查都放在 `/health`。
7. **型別嚴格**：TypeScript 遵守 D28；Python 用 mypy strict，並禁止 `Any`。
8. **每個 API 都要有測試**：單元測試加整合測試。
9. **不能把秘密資訊寫進 log**：密碼、token、人臉向量、精確座標都不行。
10. **AI 模型只能放在 Python 服務裡**，不能放進 NestJS。

---

## 6. 常用指令（F3 完成後可以用）

| 指令 | 作用 |
|---|---|
| `pnpm --filter api dev` | 在 Mac 上用開發模式啟動 NestJS（改了程式碼會自動重啟） |
| `pnpm --filter web dev` | 啟動 Next.js |
| `uv run --package ai fastapi dev` | 啟動 FastAPI 開發伺服器 |
| `uv run --package ai pytest` | 執行 ai 的測試 |
| `uv run ruff check . && uv run mypy .` | Python 的 lint 和型別檢查 |
| `curl localhost:4000/api/v1/health` | 測試 api 的健康檢查 |
| `docker compose --profile apps up -d --wait` | 連同應用程式容器一起啟動（D35） |

---

## 7. 常見錯誤

| 現象 | 原因 | 解法 |
|---|---|---|
| `Nest can't resolve dependencies of XService (?)` | 要注入的 provider 沒有在 module 的 `providers` 裡，或者沒有被 `exports` 出來 | 檢查 module 的 `providers`、`imports`、`exports` |
| 注入進來的東西是 `undefined` | 沒有開 `emitDecoratorMetadata`，或者 import 了 type-only 的型別 | 檢查 api 的 tsconfig；注入的 class 不能用 `import type` |
| `ERR_REQUIRE_ESM` / `Cannot use import statement` | ESM 和 CommonJS 混用 | 確認 `package.json` 有 `"type": "module"`，import 路徑要寫 `.js` 副檔名 |
| TypeScript 7 相關的工具錯誤 | TS 7.0 還沒有提供給工具呼叫的 API，Nest CLI 只能用 TS 6.0 | 本專案固定用 TS 6.0（D32） |
| `ModuleNotFoundError`（Python） | 沒有在 uv 的虛擬環境裡執行 | 用 `uv run …` 執行 |
| 422 Unprocessable Entity（FastAPI） | 請求資料不符合 Pydantic 的格式 | 看回應的 `detail`，裡面會寫哪個欄位錯了 |
| `EACCES … /Users/yc/.npm/_cacache` | npm 快取資料夾裡有屬於 root 的檔案（舊版 npm 的 bug） | 你自己執行 `sudo chown -R 502:20 ~/.npm`；本專案用 pnpm，暫時不受影響 |
