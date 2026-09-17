---
name: coding-conventions
description: HeartLink coding rules — module boundaries, diff size limits, file/function size, naming, commits, traceability. Load before writing or modifying ANY code in this repo (apps/, services/, packages/, infrastructure/).
---

# 程式開發規範

完整的模組設計見 `docs/architecture/MODULES.md`。

## 1. 改動大小（最重要的一條）

每個任務的上限：
- **最多 5 個手寫檔案**，**最多約 300 行**。
  - 不含自動產生的檔案、lock 檔、migration 產出的檔案，也不含任務紀錄（`docs/tasks/<ID>.md`）、ROADMAP 的狀態更新，以及 📘 教學註解行（見 `explain-in-code` skill）。
- 超過就拆成多個任務，先跟使用者說明怎麼拆。
- 只改任務範圍內的東西：
  - 不順手重構、不改格式、不改名稱。
  - 看到其他問題時，記在回報的「待辦」，不要動手改。
- 驗證指令：`git diff --stat`，把結果貼在回報裡。

## 2. 模組邊界

- 一個功能對應一個模組，模組放在：
  - 後端：`apps/api/src/modules/<feature>/`
  - 前端：`apps/web/src/features/<feature>/`
  - AI：`services/*/app/features/<feature>/`
- 只能透過別的模組的 `index.ts` 取用它；不能碰別的模組的資料表或內部檔案。
- 新增模組時，一定要同時建立 `README.md`，內容包含：
  - 用途
  - 對應的 REQ
  - 公開 API
  - 擁有的資料表
  - 依賴哪些模組
- 修 bug 應該只改一個模組。如果修一個 bug 需要改到好幾個模組，先停下來向使用者說明原因。

## 3. 檔案與函式

- 一個檔案最多約 200 行，一個函式最多約 40 行。超過就拆。
- 每一層只做自己的事：
  - controller 只處理 HTTP 的進出
  - service 負責業務邏輯
  - repository 負責資料庫存取
- 能寫成純函式的邏輯就寫成純函式，並寫單元測試。
- **嚴格型別（D28）**：
  - TypeScript 不能用 `any`（包含隱含的 any）、`@ts-ignore`、非空斷言 `!`，這些都由 Biome 和 tsconfig 強制檢查。
  - 型別不確定時用 `unknown`，再用型別守衛或 Zod 縮小範圍。
  - 盡量少用 `as` 轉型；非用不可時，要加註解說明原因。
  - 各子專案的 tsconfig 必須 `extends` 根目錄的 `tsconfig.base.json`，**不能關掉其中任何一個嚴格選項**。真的有套件不相容時，先停下來跟使用者討論。
  - 外部輸入一律先用 Zod 或 Pydantic 驗證，包括 `JSON.parse`、`fetch`、環境變數、佇列 job 的資料。這些來源的型別本身就是 `any`，工具抓不到。
  - Python：mypy `strict`，並禁止明確寫出的 `Any`（ruff 的 `ANN401`）。
- 錯誤一律用 **RFC 9457** `application/problem+json` 格式（`type`、`title`、`status`、`detail`，再加上大寫蛇形的 `code`），不能直接把例外丟給前端（D42）。

## 4. 命名

- TypeScript 檔名：`kebab-case`，後綴標明角色，例如 `profile.service.ts`、`profile.repository.ts`。
- 資料表和欄位：`snake_case`，表名用複數。
- Python：`snake_case`；檔名依角色命名，例如 `router.py`、`service.py`、`schemas.py`。
- API 路徑：`kebab-case`，名詞用複數。
- 錯誤代碼：大寫蛇形，例如 `FACE_NOT_FOUND`、`RADIUS_OUT_OF_RANGE`。

## 5. 資料庫

- **資料表結構只能透過 Drizzle migration 修改**，不能直接用 SQL 或 GUI 工具改結構。
- 匯入資料一律用 `scripts/` 裡的腳本，確保可以重複執行。
- migration 如果會刪除資料或欄位，必須先問使用者。

## 6. 溯源

- commit 訊息格式：`<type>(<模組>): <任務ID> <摘要> [REQ-xxx]`
  - 例如：`feat(location): S4 add radius filter [REQ-022]`
  - 一個 commit 只做一個任務。
- 任務紀錄放在 `docs/tasks/<ID>.md`。
- 模組的 README 要列出對應的 REQ。
- 這樣就能從任何一個方向往回追：
  - **需求 → 程式**：REQ → 模組 README → 程式碼
  - **程式 → 需求**：`git log` / `git blame` → 任務紀錄 → REQ

## 7. 測試

- 每個 service 或純函式都要有單元測試。
- 每個 API 都要有整合測試（用 Testcontainers 啟動真的 Postgres）。
- 修 bug 時，**先寫一個會失敗的測試**把 bug 重現出來，再修。

## 8. 不准做的事

- 沒有任務依據，就新增套件
- 改動和任務無關的檔案
- 寫「以後可能會用到」的程式碼
- 自己決定門檻值或隱私政策
- 為了讓測試通過而跳過或刪除測試
