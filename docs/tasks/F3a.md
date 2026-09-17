# 任務報告：F3a api 骨架（NestJS 12）

| 項目 | 內容 |
|---|---|
| 日期 | 2026-09-17 |
| 切片 / 部分 | 地基 / 第 3 部分（後端 API） |
| Branch | `task/F3a-api` |
| 對應決策 | D23（模組化）、D26（Biome）、D28（嚴格型別）、D32（TS 6.0.3）、D33（NestJS 12 技術棧） |
| 學習指南 | [`docs/parts/03-backend-api.md`](../parts/03-backend-api.md) |
| 📘 教學註解 | 本機版本有 69 行 📘，合併前會移除；有註解的版本放在 `.learn/F3a/` |

---

## 0. 一句話總結

`apps/api` 現在是一個可以執行的 **NestJS 12 應用程式**：
- `pnpm --filter api dev` 啟動後，`GET http://localhost:4000/api/v1/health` 會回傳 `{"status":"ok"}`。
- 單元測試、e2e 測試、型別檢查、lint、build 全部通過。

---

## 1. 檔案地圖

```text
biome.json                       🟡 NestJS 專用的 lint 覆寫設定（見 [註2]）
pnpm-lock.yaml                   🟡（自動產生）新增 api 的依賴
apps/api/
├── package.json                 🟢 api 的依賴和指令
├── tsconfig.json                🟢 繼承共用的嚴格設定，再加上 NestJS 需要的選項
├── tsconfig.build.json          🟢（scaffold 原樣）build 時排除測試檔
├── nest-cli.json                🟢（scaffold 原樣）Nest CLI 設定
├── vitest.config.ts             🟢 單元測試設定
├── vitest.config.e2e.ts         🟢 e2e 測試設定
├── src/
│   ├── main.ts                  🟢 進入點：建立 app → 共用設定 → 讀取 port → 開始監聽
│   ├── setup-app.ts             🟢 共用的 app 設定（前綴、shutdown hooks）
│   ├── app.module.ts            🟢 根模組：組裝各個功能模組
│   └── modules/health/          🟢 健康檢查模組
│       ├── index.ts             　 對外唯一的出口
│       ├── health.module.ts     　 模組宣告
│       ├── health.controller.ts 　 GET /api/v1/health
│       ├── health.controller.spec.ts 單元測試
│       └── README.md            　 模組說明（用途、公開 API、依賴）
└── test/
    └── health.e2e-spec.ts       🟢 e2e 測試
```

**scaffold 產生、但刻意不放進專案的檔案**：

| 檔案 | 原因 |
|---|---|
| `.oxlintrc.json`、`oxlint`、`oxlint-tsgolint` | 本專案用 Biome（D26）；而且它的設定**把 `no-explicit-any` 關掉了**，違反 D28 |
| `.prettierrc`、`prettier` | Biome 已經負責格式化 |
| `README.md`（6.5 KB 的 NestJS 通用說明） | 內容跟本專案無關 |
| `app.controller.ts`、`app.service.ts`、`app.controller.spec.ts`、`test/app.e2e-spec.ts` | Hello World 範例 |
| `@nestjs/mau` 套件和 `deploy` 指令 | NestJS 官方的付費部署平台，用不到 |
| `vite-tsconfig-paths` | 用來解析路徑別名，我們沒有用到；而且它依賴的 `tsconfck` 已經被棄用，也不支援 TS 6 |

---

## 2. 逐檔變更明細

> 共 18 個檔案：手寫 13 個（含 `.gitignore` 一行）、scaffold 原樣 2 個、自動產生 1 個、文件 2 個。
> **超過「5 個手寫檔案」的上限**，原因見 [註1]。行號是**推上 GitHub 的版本**（已移除 📘）。

| 檔案 | 行號 | 狀態 | 內容 | 原因 |
|---|---|---|---|---|
| `biome.json` | 30–32 | 🟢 新增 | `complexity.useLiteralKeys: "off"` | 見 [註2] |
| `biome.json` | 48–64 | 🟢 新增 | `overrides`：`apps/api/**` 關閉 `useImportType`，並開啟 `unsafeParameterDecoratorsEnabled` | 見 [註2] |
| `pnpm-lock.yaml` | — | 🟡 修改 | （自動產生，指令是 `pnpm install`） | 鎖定 api 依賴的版本 |
| `.gitignore` | 16 | 🟢 新增 | `*.tsbuildinfo` | tsconfig 的 `incremental` 會產生編譯快取檔，不能 commit（驗證時發現它被加進了暫存區） |
| `apps/api/package.json` | 1–35 | 🟢 新增 | 名稱、`type: module`、指令、依賴 | 見 [註3] |
| `apps/api/tsconfig.json` | 1–21 | 🟢 新增 | `extends` 共用設定，再加上 NestJS 需要的選項 | 見 [註4] |
| `apps/api/tsconfig.build.json` | 1–8 | 🟢 新增 | （scaffold 原樣）build 時排除 `test/` 和 `*spec.ts` | 測試檔不應該出現在正式的 build 裡 |
| `apps/api/nest-cli.json` | 1–8 | 🟢 新增 | （scaffold 原樣）`sourceRoot: src`、build 前先清空輸出資料夾 | Nest CLI 需要 |
| `apps/api/vitest.config.ts` | 1–9 | 🟢 新增 | `globals: true`、只跑 `**/*.spec.ts` | 從 scaffold 拿掉 `tsconfigPaths` plugin，改用雙引號 |
| `apps/api/vitest.config.e2e.ts` | 1–9 | 🟢 新增 | 只跑 `**/*.e2e-spec.ts` | 單元測試和 e2e 測試分開跑 |
| `apps/api/src/main.ts` | 1 | 🟢 新增 | `import "reflect-metadata"` | 依賴注入需要讀取型別 metadata，必須最先載入 |
| 同上 | 6–17 | 🟢 新增 | `DEFAULT_PORT`、`readPort()` 驗證 1–65535 的整數 | 見 [註5] |
| 同上 | 19–24 | 🟢 新增 | `bootstrap()`：建立 app → `setupApp` → 讀取 port → 開始監聽 | 啟動流程 |
| 同上 | 22 | 🟢 新增 | `process.env["API_PORT"]` | `noPropertyAccessFromIndexSignature`（D28）規定要用中括號 |
| 同上 | 26 | 🟢 新增 | top-level `await bootstrap()` | ESM 支援最外層直接 await；啟動失敗時，程式會帶著錯誤結束 |
| `apps/api/src/setup-app.ts` | 3 | 🟢 新增 | `GLOBAL_PREFIX = "api/v1"` | API 目錄規定的前綴 |
| 同上 | 5–9 | 🟢 新增 | `setupApp()`：`setGlobalPrefix` + `enableShutdownHooks` | 見 [註6] |
| `apps/api/src/app.module.ts` | 2, 5 | 🟢 新增 | 從 `modules/health/index.js` import `HealthModule` | 依照模組規範，只能從 index 取用 |
| `.../health/health.controller.ts` | 3–5 | 🟢 新增 | `HealthResponse { status: "ok" }` | 回應的型別，用 literal type 讓編譯器幫忙把關 |
| 同上 | 7–14 | 🟢 新增 | `@Controller("health")` + `@Get() check()` | 存活檢查；第 9 行是一般註解，說明「不檢查外部服務」的原因 |
| `.../health/health.module.ts` | 4–7 | 🟢 新增 | `@Module({ controllers: [HealthController] })` | 把路由包成模組 |
| `.../health/index.ts` | 1–2 | 🟢 新增 | export `HealthResponse`（型別）、`HealthModule` | 模組唯一的對外出口（D23） |
| `.../health/README.md` | 1–14 | 🟢 新增 | 用途、公開 API、資料表、依賴、設計說明 | 規範要求每個模組都要有 README |
| `.../health/health.controller.spec.ts` | 1–17 | 🟢 新增 | 用 `Test.createTestingModule` 建立 controller，驗證回傳值 | 單元測試 |
| `apps/api/test/health.e2e-spec.ts` | 1–31 | 🟢 新增 | 啟動完整的 app，驗證 `/api/v1/health` 回 200，沒有前綴的 `/health` 回 404 | 見 [註6] |
| `docs/tasks/F3a.md` | — | 🟢 新增 | 本報告 | — |
| `docs/01-ROADMAP.md` | 25 | 🟡 修改 | F3a 標記為完成 | 進度 |

### 註解

**[註1] 為什麼超過 5 個檔案**
- NestJS 的一個「最小功能」本來就包含 controller、module、index、README，再加上兩種測試。
- 這些檔案都很小：移除 📘 後，手寫的 TypeScript 合計約 **120 行**，在行數上限（約 300 行）之內。
- 我原本打算拆成 F3a-1（骨架和設定）和 F3a-2（health 模組）兩個 PR，但兩者之間互相依賴：沒有 health 模組就沒有測試可以跑，test 指令會失敗。所以合併成一個 PR，報告裡分開說明。
- **如果你希望嚴格拆成兩個 PR，告訴我就好。**

**[註2] `biome.json` 的兩處修改（都有查過 Biome 官方文件）**
1. **關閉 `useLiteralKeys`**
   - 衝突：這條規則會把 `process.env["API_PORT"]` 改成 `process.env.API_PORT`，但 tsconfig 的 `noPropertyAccessFromIndexSignature`（D28）**規定**索引簽章要用中括號，兩條規則互相矛盾。
   - 官方文件顯示這條規則沒有可以調整的選項，所以以型別感知的 TypeScript 為準，關掉 Biome 的這條規則。
2. **`apps/api/**` 的覆寫設定**
   - **關閉 `useImportType`**：它會把 `import { AppService }` 改成 `import type`，但 NestJS 的依賴注入在**執行時**需要這個 class。官方文件原文：*Since Biome doesn't know how a decorator is implemented…* 並建議使用 NestJS 這類框架時關閉這條規則。
   - **開啟 `unsafeParameterDecoratorsEnabled`**：NestJS 常用 `@Body()` 這類參數裝飾器，沒有開啟的話，Biome 會**解析失敗**。我用探測檔實際測過：開啟前有 parse error，開啟後就正常了。
   - 覆寫只套用在 `apps/api`，**前端不受影響**。

**[註3] `apps/api/package.json`**
- **`"type": "module"`**：告訴 Node 這個專案是 ESM，NestJS 12 新專案的預設就是 ESM。
  - 影響：import 本地檔案時要寫 `.js` 副檔名。
- **指令**：
  - `dev`：`nest start --watch`，改了程式碼會自動重啟。
  - `build`：`nest build`。
  - `start`：`node dist/main.js`。
  - `lint`：`biome lint .`。
  - `typecheck`：`tsc --noEmit`。
  - `test`：`vitest run`。
  - `test:e2e`：用另一份 vitest 設定跑 e2e 測試。
  - 這些名稱跟 `turbo.json` 的任務名稱一致，所以根目錄的 `pnpm lint`、`pnpm test` 會自動執行到 api。
- **`typescript: "6.0.3"`**：寫死版本，不用 `^`（D32）。
- **實際安裝的版本**：`@nestjs/core` 12.0.3、`@nestjs/cli` **12.0.1**、vitest 4.1.11。
  - CLI 12.0.2 和 12.0.3 發布還不到 1 天，pnpm 的安全機制（D27）自動選用了 12.0.1。

**[註4] `apps/api/tsconfig.json`**
- **`extends: ../../tsconfig.base.json`**：繼承所有嚴格設定（D28）。
- **NestJS 需要、只加在 api 的選項**：
  - `experimentalDecorators`、`emitDecoratorMetadata`：decorator 和依賴注入需要。
  - `module` / `moduleResolution: nodenext`：ESM。
  - `target: ES2023`。
  - `types: ["vitest/globals", "node"]`：讓測試裡可以直接使用 `describe`、`it`。
- **刻意不沿用 scaffold 的 `strictPropertyInitialization: false`**：它會關掉 strict 的一部分，違反 D28。
  - NestJS 官方範例關掉它，是因為 class 形式的 DTO 屬性通常沒有初始值。
  - 本專案之後會用 Zod（Standard Schema）來驗證輸入，不需要這個例外。
- **scaffold 裡跟共用設定重複的選項**（`strict`、`skipLibCheck`、`isolatedModules`）已經移除，避免兩邊設定不一致。

**[註5] 為什麼 port 要驗證**
- 環境變數一律是字串，`Number("abc")` 會得到 `NaN`，如果不檢查就交給 `listen()`，會出現難懂的錯誤。
- 驗證的目標是「設定錯誤時，**啟動當下就失敗**，並清楚說明原因」。已經實測過：`API_PORT=abc` 時，會顯示 `API_PORT must be an integer between 1 and 65535, got "abc"`。
- F6 加入資料庫設定時，會改成統一用 Zod 驗證所有環境變數。

**[註6] 為什麼要有 `setupApp()`**
- 如果前綴只在 `main.ts` 裡設定，e2e 測試建立的 app 就**沒有前綴**。結果測試過了，正式環境卻是另一個樣子。
- 抽成共用函式後，兩邊的設定一定相同。e2e 測試的第二個案例（沒有前綴的 `/health` 必須回 404）就是在驗證這件事。
- **前端類比**：把 `<Providers>` 抽成一個元件，App 和測試都用同一個。

### repo 以外的改動
無。

---

## 3. 資料流：`GET /api/v1/health`

```text
curl localhost:4000/api/v1/health
  → Node HTTP server（Express adapter）
  → Nest 路由表：比對 /api/v1（setupApp 設定的前綴）+ /health（@Controller）+ GET（@Get）
  → HealthController.check()        ← 從 AppModule → HealthModule 註冊進來
  → 回傳 { status: "ok" }
  → Nest 自動轉成 JSON，HTTP 200
```

啟動時的 log（實際輸出）：
```text
[RoutesResolver] HealthController {/api/v1/health}
[RouterExplorer] Mapped {/api/v1/health, GET} route
[NestApplication] Nest application successfully started
```

---

## 4. 程式碼導讀

完整的逐行 📘 註解在 `.learn/F3a/`（合併後）或目前的工作檔案裡。以下是重點。

### 4.1 NestJS 的「組裝」方式
```text
main.ts ──create──▶ AppModule ──imports──▶ HealthModule ──controllers──▶ HealthController
```
- **前端類比**：`main.ts` ≈ `createRoot(...).render(<App/>)`，`AppModule` ≈ `<App>`，`HealthModule` ≈ 一個 feature 元件，`HealthController` ≈ 這個 feature 裡的 route handler。
- **decorator（`@Module`、`@Controller`、`@Get`）**：NestJS 啟動時會讀取這些標記，自動建立路由表。

### 4.2 ESM 的 `.js` 副檔名
```ts
import { AppModule } from "./app.module.js"; // 原始檔是 app.module.ts
```
Node 的 ESM 解析**不會自動補副檔名**，而 TypeScript 編譯後的檔案是 `.js`，所以原始碼裡要寫成編譯後的檔名。
前端工具（Vite、Next）會幫你處理這件事，後端直接用 Node 執行，所以要自己寫。

### 4.3 `import type` 和 `import` 的差別
```ts
import type { INestApplication } from "@nestjs/common"; // 只當型別用，編譯後會消失
import { HealthController } from "./health.controller.js"; // 執行時也需要
```
NestJS 要在**執行時**知道要注入哪個 class，所以 service 或 controller 不能用 `import type`，這也是 [註2] 關掉 `useImportType` 的原因。

### 4.4 單元測試和 e2e 測試

| | 單元測試（`*.spec.ts`） | e2e 測試（`*.e2e-spec.ts`） |
|---|---|---|
| 範圍 | 只測 controller 這個 class | 整個 app：模組、前綴、HTTP、JSON |
| 速度 | 很快 | 比較慢（要啟動 app） |
| 工具 | `Test.createTestingModule` | 同上，再加上 `supertest` 發送 HTTP 請求 |
| 前端類比 | 測試一個 hook | Playwright 測試整個頁面（只是不需要瀏覽器） |

---

## 5. 你可以自己試

```bash
cd ~/Desktop/ai-dating-app && pnpm --filter api dev
```
看到 `Nest application successfully started` 之後，**開另一個終端機分頁**：

```bash
curl -i localhost:4000/api/v1/health
```
預期：`HTTP/1.1 200 OK`，內容是 `{"status":"ok"}`。

```bash
pnpm --filter api test && pnpm --filter api test:e2e
```
預期：`Tests 1 passed`，以及 `Tests 2 passed`。

也可以試著改 `health.controller.ts` 的回傳值再存檔，dev 模式會自動重啟。改完記得改回來。

---

## 6. 驗證結果（全部實際執行過）

| # | 檢查項目 | 實際輸出 | 結果 |
|---|---|---|---|
| 1 | `pnpm check`（Biome，整個 repo） | `Checked 19 files … No fixes applied.` | ✅ |
| 2 | `pnpm --filter api typecheck` | 沒有錯誤 | ✅ |
| 3 | `pnpm --filter api lint` | `Checked 14 files … No fixes applied.` | ✅ |
| 4 | `pnpm --filter api test` | `Test Files 1 passed / Tests 1 passed` | ✅ |
| 5 | `pnpm --filter api test:e2e` | `Test Files 1 passed / Tests 2 passed` | ✅ |
| 6 | `pnpm --filter api build` | 產生 `dist/main.js` 等檔案 | ✅ |
| 7 | `node dist/main.js` + `curl /api/v1/health` | `{"status":"ok"}`，HTTP 200 | ✅ |
| 8 | `curl /health`（沒有前綴） | HTTP 404 | ✅ |
| 9 | `API_PORT=abc` 啟動 | 立刻報錯停止，並說明原因 | ✅ |
| 10 | `pnpm --filter api dev` + `curl` | HTTP 200 | ✅ |
| 11 | 根目錄的 `pnpm lint/typecheck/test/build`（Turborepo） | 每個都是 `Tasks: 1 successful`；第二次 build 顯示 `FULL TURBO`（使用快取） | ✅ |
| 12 | `pnpm peers check` | `No peer dependency issues found` | ✅ |
| 13 | 探測檔：參數裝飾器和 `useImportType` | 開啟覆寫設定後，沒有 parse error，也沒有 import type 警告 | ✅ |
| 14 | 移除 📘 後的版本 | 移除 69 行，內容跟第 2 節一致 | ✅（合併前會重跑 1–7） |

---

## 7. 這次學到的重點

1. **NestJS 的組裝方式**：main → 根模組 → 功能模組 → controller，全部靠 decorator 描述，框架負責組裝。
2. **ESM 在 Node 上要寫 `.js` 副檔名**；前端工具會幫你處理，後端要自己寫。
3. **依賴注入需要執行時的型別資訊**：`reflect-metadata` + `emitDecoratorMetadata`，而且被注入的 class 不能用 `import type`。
4. **設定錯誤要在啟動時就失敗**，而且要有清楚的錯誤訊息。
5. **測試和正式環境要共用同一套設定**（`setupApp`），否則「測試通過」就沒有意義。

---

## 8. 待辦 / 風險 / 需要你決定的事

| # | 項目 | 說明 |
|---|---|---|
| 1 | **拆成一個 PR 還是兩個？** | 見 [註1]。預設是一個 PR |
| 2 | 環境變數驗證 | 目前只驗證 port；F6 會改成用 Zod 統一驗證 |
| 3 | 就緒檢查 | `/api/v1/health/ready` 會在 F6（資料庫）之後新增 |
| 4 | e2e 測試沒有加進 Turborepo | 根目錄的 `pnpm test` 只跑單元測試；F5 的 CI 會另外執行 `test:e2e` |
| 5 | TypeScript 7 | 等 7.1 推出，而且 NestJS 支援之後再評估升級（D32） |
