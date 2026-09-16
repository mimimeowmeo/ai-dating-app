---
name: debug-trace
description: Debug a HeartLink bug in a scoped, traceable way — reproduce, locate the owning module, write a failing test, fix only inside that module, verify. Use when the user reports a bug, error, failing test, or unexpected behavior in this repo.
---

# Debug 流程

一次只處理一個 bug。每一步都用繁體中文向使用者說明。
使用者是前端工程師，說明時盡量用前端的類比，例如「這就像 React 裡 state 沒有更新」。

1. **重現**
   - 寫下重現步驟、預期結果、實際結果。
   - 貼出錯誤訊息或 log。

2. **定位**
   - 從 API 路徑或畫面，找到負責的模組（看模組的 README），再找到對應的 REQ。
   - 沿著資料流往回追：前端 → controller → service → repository → 資料庫（或 AI 服務）。
   - 每一層都確認輸入和輸出，找出是**哪一層開始出錯**。

3. **寫一個會失敗的測試**
   - 放在出錯的那個模組裡，確認它真的會失敗。

4. **修正**
   - 只改那個模組，並遵守 `coding-conventions` 的改動大小限制。
   - 如果根本原因在別的模組，先停下來說明，不要一次改好幾個模組。

5. **驗證**
   - 剛寫的測試通過。
   - 這個模組的其他測試也都通過。
   - 如果有 E2E 測試，也要重跑。

6. **回報**
   - 根本原因
   - 為什麼會發生
   - 改了什麼（附上程式碼講解）
   - 以後怎麼預防

   commit 格式：`fix(<模組>): <摘要> [REQ-xxx]`
