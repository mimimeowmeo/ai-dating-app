# 各部分指南（parts）

每個部分都有一份指南，**等做到那一部分時才寫**，免得內容寫了又過時。

| 檔案 | 部分 | 什麼時候寫 |
|---|---|---|
| `00-docker.md` | Docker | ✅ 已完成（F2） |
| `01-frontend-layout.md` | 前端 layout | S1 之前 |
| `02-frontend-logic.md` | 前端邏輯 | S1 之前 |
| `03-backend-api.md` | 後端 API（NestJS + FastAPI） | ✅ 已完成（F3 之前） |
| `04-database.md` | 資料庫（PostgreSQL + Drizzle） | ✅ 已完成（S1；S4 之前會依 CSV 補充） |
| `05-vector-db.md` | 向量資料庫 | F6 之前 |
| `06-ai-training.md` | 模型訓練 | S8 之前（**要先討論**） |
| `07-ai-third-party.md` | 第三方模型 | S3 之前（**要先討論**） |
| `08-rag-mcp.md` | RAG / MCP | S10 之前（**要先討論**） |
| `09-qa.md` | QA 測試 | F5 之前 |
| `10-deploy.md` | 部署 | S11 之前（**要先討論**） |

每份指南都包含這些段落：
1. 概念講解
2. 這個專案的規範（命名、目錄結構、寫法）
3. 常用指令
4. 常見錯誤
5. 這部分專屬的驗證項目，會補進任務 checklist

**和 skill 的分工**：`.claude/skills/dev-task` 規定「**怎麼做**」（所有任務共用的流程）；parts 指南規定「**這部分要做到什麼、有哪些規範**」。
