# 模組化設計：用 React Component 的思維寫後端

## 核心概念

每一個功能都是一個**獨立模組**，就像一個 React component：

| React | 本專案後端模組 |
|---|---|
| component 資料夾 | `modules/<feature>/` |
| `index.ts` 只 export 公開的東西 | `index.ts` 只 export 公開的 service 和型別 |
| props / 型別 | DTO（用 Zod 或 class-validator 定義輸入輸出） |
| custom hook（邏輯） | `*.service.ts`（業務邏輯） |
| fetcher / API client | `*.repository.ts`（資料庫存取） |
| 路由 / 事件處理 | `*.controller.ts`（只處理 HTTP 進出） |
| 元件自己的 state | 模組**自己擁有**的資料表（`*.schema.ts`） |
| Storybook / 元件測試 | `*.spec.ts` 單元測試 |
| 元件說明文件 | `README.md`（用途、REQ、公開 API、依賴） |

**這不是 microservice，而是 modular monolith（模組化單體）。**
- 模組之間像 microservice 一樣彼此隔離，但仍然在同一個程式裡執行、一起部署。
- 為什麼不直接拆成 microservice？拆開之後，模組之間要透過網路溝通、要分開部署，資料一致性也更難處理；debug 時還得跨好幾個服務追 log。在這個規模，這些代價都不划算。
- 模組切得乾淨，將來真的需要時，也可以把某個模組抽出去變成獨立服務。

## 目錄結構

### 後端（apps/api）
```text
src/
├── modules/                    ← 功能模組
│   └── profile/
│       ├── index.ts            ← 對外唯一的出口
│       ├── profile.module.ts   ← NestJS 模組宣告（依賴誰、提供什麼）
│       ├── profile.controller.ts
│       ├── profile.service.ts
│       ├── profile.repository.ts
│       ├── profile.schema.ts   ← 這個模組擁有的資料表（Drizzle）
│       ├── dto/
│       ├── profile.service.spec.ts
│       └── README.md
├── infra/                      ← 基礎設施（db、redis、storage、queue、ai-client）
└── shared/                     ← 純工具（沒有業務邏輯），類似 utils
```

預計的模組：`auth`、`users`、`profile`、`preferences`、`tags`、`consents`、`photos`、`location`、`discovery`、`interactions`、`chat`、`verification`

### 前端（apps/web）
```text
src/
├── app/            ← Next.js 路由，只負責「組裝」各個 feature
├── features/<feature>/{components,hooks,api,model,index.ts}
└── shared/{ui,lib}
```

### AI（services/ai、services/ai-worker）
```text
app/features/<feature>/
├── router.py       ← 等同 controller
├── service.py
├── schemas.py      ← Pydantic，等同 DTO
└── adapters/       ← 可替換的模型（同一個介面，可以有多種實作）
```

模型 adapter 都實作同一個介面，例如 `FaceEmbedder.embed(image) -> vector`，所以要換模型或做 ensemble 時，只要新增一個 adapter，其他程式碼都不用動。
排序用的打分函式（`face_score`、`cluster_score`……）都寫成**純函式**：輸入固定，輸出就固定，最容易重用和測試。

## 規則（會用工具自動檢查）

1. **只能透過別的模組的 `index.ts` 取用它的東西**，不能直接 import 別人內部的檔案。
2. **不能直接查別的模組的資料表**，要呼叫那個模組的 service。
3. 依賴只能單向，**不能有循環依賴**。
   - `discovery` 可以依賴 `profile`、`location`，但反過來不行。
4. `shared/` 裡不能有業務邏輯。
5. 需要串接多個模組的流程（例如 discovery），由一個**編排模組**負責；被串接的模組彼此不認識。
6. 工具：TypeScript 用 `dependency-cruiser`，Python 用 `import-linter`，F1 時加進 CI。

## 誠實說明限制

- **純邏輯模組**（打分函式、標籤正規化、模型 adapter）可以真正做到「拿到哪都能用」。
- **會碰資料庫的模組**需要先注入資料庫連線才能用（NestJS 的 DI 會處理），不是直接複製過去就能跑。
- 所有模組共用同一個資料庫，所以改資料表時，還是要檢查有哪些模組會受影響。每個模組的 `README.md` 會列出它擁有的資料表。
