# API 目錄 — MVP v1

基本路徑：`/api/v1`。正式的格式以 OpenAPI 自動產生的文件為準（F7），這份是設計清單。
🅐 = AI 階段才實作；在那之前由 `AiGateway` stub 處理（D37）。

## 共通規範（D40–D43）

| 項目 | 規範 |
|---|---|
| 登入狀態 | Redis session；cookie 設為 `HttpOnly; Secure; SameSite`；登入後更換 session ID |
| CSRF | 所有會修改資料的請求（POST、PUT、PATCH、DELETE）都要通過 CSRF 檢查 |
| 輸入驗證 | Zod schema：`@Body({ schema })` + `StandardSchemaValidationPipe` |
| 錯誤格式 | RFC 9457 `application/problem+json`：`{ type, title, status, detail, code }` |
| 分頁 | cursor：`?cursor=…&limit=…` → `{ items, nextCursor }` |
| 避免重複處理 | 送訊息時帶 `clientMessageId`；需要時用 `Idempotency-Key` header |
| 限流 | 超過次數回 `429`，並附上 `Retry-After` |
| 新手流程 | `onboardingStep` 還沒到 `COMPLETED` 時，標記 🔒 的 API 回 `403 ONBOARDING_INCOMPLETE` |
| 隱私 | 不回傳：精確座標、人臉向量、模型分數、別人的完整偏好 |

## 新手流程（onboardingStep）

```text
AVATAR_REQUIRED → FACE_VERIFICATION_REQUIRED → PROFILE_REQUIRED → PREFERENCES_REQUIRED → COMPLETED
                  （🅐 AI 完成前自動略過，並標記 pending_ai）
```

## ① 帳號（S1-API）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| POST | `/auth/continue` | ✗ | 共用登入頁。body：`{ username, password }`。帳號存在且密碼正確 → `200 { result: "logged_in", onboardingStep }`，並設定 cookie；密碼錯誤或帳號被鎖 → `401`，**訊息一律寫「帳號或密碼錯誤」**；帳號不存在 → `200 { result: "signup_required" }`，**這時還不建立帳號** |
| POST | `/auth/register` | ✗ | body：`{ username, password, passwordConfirm }` → `201 { onboardingStep: "AVATAR_REQUIRED" }`，並直接登入；帳號已被使用 → `409 USERNAME_TAKEN` |
| POST | `/auth/logout` | ✓ | 清除 session → `204` |
| GET | `/me` | ✓ | `{ id, username, onboardingStep, verificationStatus }` |

- 密碼：8–128 個字元，用 Argon2id 雜湊（D39）。
- 帳號名稱的格式規則要等你確認：**建議** 3–30 個字元，只能用小寫英文、數字、底線，不分大小寫。
- 登入失敗 5 次鎖定 15 分鐘（D41，可以在設定檔修改）。

## ② 大頭貼（S2-API；🅐 AI-1）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| POST | `/me/avatar` | ✓ | multipart 欄位 `file`（JPG、PNG、HEIC）。後端會檢查檔頭和大小 → 重新編碼 → **刪除 EXIF** → 存到 S3 → `201 { photoId, url, qualityStatus }` |
| DELETE | `/me/avatar` | ✓ | 刪除大頭貼，連同對應的人臉向量（REQ-014） |

- `qualityStatus`：AI 完成前一律是 `pending_ai`。
- 🅐 AI 完成後：不合格回 `422`，`code` 可能是 `FACE_NOT_FOUND`、`MULTIPLE_FACES`、`IMAGE_TOO_BLURRY`、`IMAGE_TOO_DARK`、`FACE_TOO_SMALL`、`FACE_OCCLUDED`。
- 不管 AI 有沒有完成，都可能回 `422 UNSUPPORTED_FORMAT` 或 `413 FILE_TOO_LARGE`。

## ③ 即時人臉驗證（S3-API 先預留；🅐 AI-2）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| POST | `/verification/sessions` | ✓ | `{ sessionId, challenge, nonce, expiresAt }`；AI 完成前回 `{ status: "skipped_pending_ai" }`，新手流程自動進入下一步 |
| POST | `/verification/sessions/{id}/frames` | ✓ | multipart 影格 → `{ status: "passed" \| "failed" \| "retry", reasonCode, attemptsLeft }`，**不回傳分數** |

## ④⑤ 基本資料和興趣（S4-API，欄位要等 CSV）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| GET / PUT / PATCH | `/me/profile` | ✓ | 新手流程用 `PUT`（整份送出），設定頁用 `PATCH` |
| GET | `/tags?category=interest\|hobby\|food` | ✓ | 標籤選項字典（由後端管理） |
| GET / PUT | `/me/tags` | ✓ | `PUT` 的 body：`{ category, tagIds[] }` |

## ⑥ 使用者頁面

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| GET | `/me/tags` | ✓ | 自己的完整標籤 |
| GET | `/users/{id}` | ✓🔒 | 別人的公開資料 + **共同標籤**，不回傳完整偏好 |

## ⑦ 配對卡片（S5-API；🅐 AI-3）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| POST | `/me/location` | ✓ | 使用者同意後才更新定位：`{ lat, lng, accuracyM, capturedAt }` 或 `{ regionCode }` |
| GET | `/discovery?limit=&cursor=` | ✓🔒 | `{ items: [{ userId, displayName, age, avatarUrl, distanceBucket, sharedTags, reasons }], nextCursor }` |

- `avatarUrl` 是有時效的簽名網址。
- 排序結果會先存成快照，翻頁時照同一份順序。
- AI 完成前，只做硬篩選 + 基本排序。

## ⑧ 喜歡／不喜歡（S6-API）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| PUT | `/swipes/{targetUserId}` | ✓🔒 | body：`{ action: "like" \| "pass" }` → `{ matched, matchId?, conversationId? }`；重複送出結果相同 |
| GET | `/matches` | ✓🔒 | 已配對的清單 |
| POST / DELETE | `/blocks/{userId}` | ✓🔒 | 封鎖、解除封鎖 |

## ⑨ 聊天（S7-API）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| GET | `/conversations` | ✓🔒 | 對話列表 |
| GET | `/conversations/{id}/messages?before=&limit=` | ✓🔒 | 歷史訊息；不是這段對話的成員時回 `404` |
| POST | `/conversations/{id}/messages` | ✓🔒 | body：`{ clientMessageId, text }` → `201` |
| WS | `message:new`、`match:new` | ✓ | Socket.IO 即時推送 |

## ⑩ 推薦下一句（S7-API 先預留；🅐 AI-5）

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| POST | `/conversations/{id}/reply-suggestions` | ✓🔒 | `{ suggestions: [{ id, text }], modelVersion }`；需要先同意聊天分析（REQ-043）；AI 完成前回 `{ suggestions: [] }` |

## 同意紀錄

| Method | Path | 登入 | 說明 |
|---|---|---|---|
| GET / POST | `/me/consents` | ✓ | 同意的類型：camera、location、chat_analysis（REQ-051） |

## 健康檢查

| Method | Path | 說明 |
|---|---|---|
| GET | `/health` | 存活檢查（F3a） |
| GET | `/health/ready` | 就緒檢查：資料庫和 Redis 是否連得上（S1-b） |

## 內部 AI 服務（🅐 階段 5，不對外開放）
- `POST /internal/image/quality`
- `POST /internal/face/embed`
- `POST /internal/face/liveness`
- `POST /internal/rank`
- `POST /internal/reply-suggestions`

佇列工作：`clustering.recompute`、`semantic.analyze`、`features.recompute`、`eval.run`
