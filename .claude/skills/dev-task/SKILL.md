---
name: dev-task
description: Run one HeartLink development task (foundation F* or slice S* from docs/01-ROADMAP.md) with the Read → Plan → Change → Validate → Report → Stop workflow and a verified checklist. Use whenever the user asks to start, continue, or do the next task/slice/day, or names a task ID like F2 or S3.
---

# 開發任務流程

一次只執行**一個**任務。使用者正在學習，每一步都要用繁體中文詳細講解。

## 1. 讀
- `CLAUDE.md`、`docs/00-DECISIONS.md`、`docs/01-ROADMAP.md`、`docs/02-REQUIREMENTS.md`
- 這次任務對應的 `docs/parts/*.md`：如果不存在，先寫好該部分的指南，給使用者確認後再繼續
- `git status`，以及目前的相關程式碼

## 2. 計畫
- 複製 `docs/templates/TASK-CHECKLIST.md` 到 `docs/tasks/<ID>.md`，填好第 1–3 節
- 向使用者說明：要做什麼、為什麼這樣做、有哪些替代方案、會改哪些檔案
- 如果任務牽涉到 ROADMAP 裡「需要提醒使用者討論」的項目，**先停下來討論**
- 如果任務太大（超過約 5 個檔案，或包含兩件以上不相關的事），拆成更小的任務

## 3. 改
- 寫程式前先載入 `coding-conventions` skill，並遵守它的改動大小限制和模組邊界
- 只改計畫中列出的檔案

## 4. 驗證
- 逐條執行 checklist 第 3–5 節的驗證，**貼出實際的輸出**
- 失敗時，要在同一個任務內修好；修不好就如實回報

## 5. 回報（使用者是前端工程師，對後端不熟）

回報要**詳細**，依照下面的結構，並寫進 `docs/tasks/<ID>.md`：

1. **一句話總結**：這個任務完成後，系統多了什麼能力。
2. **檔案地圖**：用樹狀圖列出新增或修改的檔案，每個檔案附一句話說明它的角色。
3. **資料流**：一個請求從進來到回應，依序經過哪些檔案（畫成箭頭圖）。
4. **程式碼導讀**：每個重要的檔案都要貼出關鍵片段，逐段說明：
   - 這段在做什麼、為什麼要這樣寫
   - **前端類比**，例如：「controller ≈ Next.js 的 route handler」、「DI ≈ React Context Provider」、「migration ≈ 資料庫結構的 git commit」
   - 新的後端名詞第一次出現時，要附上解釋
5. **你可以自己試**：可以直接複製的指令，以及預期會看到的輸出。
6. **驗證結果**：checklist 每一項的實際輸出，加上 `git diff --stat`。
7. **這次學到的重點**：3–5 點。
8. **待辦 / 風險 / 需要你決定的事**。

## 6. 停
- 更新 ROADMAP 的狀態
- 等使用者確認後才 commit，commit 訊息格式為 `feat(<範圍>): <ID> <摘要>`
- **不要自動開始下一個任務**
