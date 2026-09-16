# API 目錄 — MVP v1

基本路徑：`/api/v1`。正式的格式以 OpenAPI 自動產生的文件為準，這份只是清單。

## 帳號
- `POST /auth/register`、`POST /auth/login`、`POST /auth/logout`、`POST /auth/refresh`、`GET /auth/me`

## 個人資料與偏好
- `GET/PUT /profile`、`GET /profile/:userId`
- `GET/PUT /preferences`：年齡範圍、性別、`radius_km`、`stage1_enabled`
- `GET /tags?category=interest|sport|food|travel`、`PUT /me/tags`

## 同意
- `GET /consents`、`POST /consents`：類型為 camera、location、chat_analysis

## 照片與驗證
- `POST /profile/photo`：上傳 → 品質檢查 → 人臉 Embedding。不合格時回傳 `422` 和 `reason`。
- `DELETE /profile/photos/:photoId`：連同對應的 Embedding 一起刪除。
- `POST /verification/liveness`、`GET /verification/status`（P1）
- `POST /me/face-preferences`：Stage 1 的偏好臉孔樣本。

## 定位
- `POST /location`：`{ lat, lng, accuracy_m, captured_at }` 或 `{ region_code }`
- `DELETE /location`

## 推薦與互動
- `GET /discovery?radius_km=R&limit=K`
  - 回傳：`{ userId, displayName, age, avatarUrl, distanceBucket, sharedTags[], reasons[], scores? }`
  - **不回傳**座標或 Embedding
- `POST /interactions`：`{ targetUserId, action: like | pass }`，雙方都喜歡時回傳 `matched`
- `GET /matches`、`DELETE /matches/:id`
- `POST /blocks`、`DELETE /blocks/:userId`

## 聊天
- `GET /conversations`、`GET /conversations/:id/messages`
- Socket 事件：`message:send`、`message:new`

## 內部 AI 服務（ai，不對外開放）
- `POST /internal/image/quality`
- `POST /internal/face/embed`
- `POST /internal/face/liveness`
- `POST /internal/rank`：`{ userId, candidateIds[], stages }` → 各階段分數和排序結果

## 佇列工作（BullMQ → ai-worker）
- `clustering.recompute`
- `semantic.analyze`
- `features.recompute`
- `eval.run`
