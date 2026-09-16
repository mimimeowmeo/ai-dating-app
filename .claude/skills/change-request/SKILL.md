---
name: change-request
description: Handle a request to change or add a HeartLink feature — trace it to REQs and modules, analyze impact, update requirement/decision docs, then hand off to dev-task. Use when the user asks to modify existing behavior, add a feature, or change a requirement.
---

# 功能變更流程

**不能直接改程式碼**，要依序做完下面幾步。

1. **釐清需求**
   - 用一句話重述使用者想要的變更，並確認理解正確。

2. **溯源**
   - 在 `docs/02-REQUIREMENTS.md` 找到相關的 REQ；如果是全新的需求，新增一條 REQ。
   - 在 `docs/00-DECISIONS.md` 檢查有沒有跟已定案的決策衝突。

3. **影響分析**：列出以下各項會受到的影響
   - 模組（看各模組 README 的「依賴」和「擁有的資料表」）
   - 資料表：需不需要 migration？會不會刪資料？
   - API 格式：前端 client 需不需要重新產生？
   - 測試：哪些測試要改、要新增？

4. **拆成小任務**
   - 每個任務都要符合 `coding-conventions` 的改動大小限制。
   - 順序：資料表 → 後端 → 前端 → E2E。

5. **使用者確認**
   - 把影響範圍和任務清單給使用者看，確認後才開始。

6. **更新文件**
   - REQ、決策紀錄、ROADMAP。

7. **執行**
   - 每個任務都照 `dev-task` 流程執行。
