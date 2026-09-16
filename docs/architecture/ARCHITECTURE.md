# 系統架構

## 1. 服務總覽

```text
手機瀏覽器（PWA，HTTPS）
   │
 Nginx（HTTPS，唯一對外的入口）
   ├── /            → web（Next.js）
   ├── /api/v1      → api（NestJS）
   └── /socket.io   → api（Socket.IO）

api（NestJS）
   ├── PostgreSQL（PostGIS + pgvector）  ← Drizzle
   ├── Redis（BullMQ、快取、限流）
   ├── MinIO / S3（自拍照片）
   ├── ai（FastAPI）          ← 同步 HTTP 呼叫：品質檢查、人臉、排序
   └── BullMQ ──► ai-worker（Python）← 非同步：分群、語意分析、重新計算特徵
                        └── MLflow（實驗紀錄、模型版本）
```

| 服務 | 目錄 | 負責 |
|---|---|---|
| web | `apps/web` | UI、瀏覽器端狀態、相機和定位的授權流程、PWA |
| api | `apps/api` | 帳號驗證、業務邏輯、硬篩選、配對、聊天、丟工作進佇列 |
| ai | `services/ai` | 同步推論：影像品質、人臉 Embedding、liveness、排序打分 |
| ai-worker | `services/ai-worker` | 非同步工作：k-Means、語意分析、重新計算特徵、評估 |
| postgres | `infrastructure/postgres` | 所有業務資料和向量資料 |
| redis / minio / nginx / mlflow | `infrastructure/*` | 基礎設施 |

## 2. 推薦流程（`GET /discovery`）

```text
api：硬篩選（SQL）
     年齡、性別、帳號狀態、封鎖名單、ST_DWithin(radius_km)
       │ 候選人 ID（上限 N 位）
       ▼
ai：Ranking Service
     Stage 1：FaceScore      = cos(偏好人臉向量, 候選人臉)      ← 可關閉，沒有樣本時跳過
     Stage 2：ClusterScore   = 同一群 / 偏好距離                ← k-Means 結果由 worker 預先算好
     Stage 3：SemanticScore  = 語意吻合度                       ← 對話量不夠時 w3 = 0
     BehaviorScore
     Final = Σ w·score（權重正規化）
       │ 排序結果 + 各階段分數 + 推薦原因
       ▼
api：多樣性 / 安全規則 → 寫入 recommendation_events → 回傳（只給大約距離）
```

## 3. 依賴方向與禁止事項

- web 只能透過產生的 API client 呼叫 api。
- NestJS 的 controller 要經過 service / repository，不能直接查資料庫。
- NestJS 裡不能載入任何 AI 模型。
- 硬篩選不能交給 LLM 或模型。
- 各類特徵向量不能合併成單一向量。
- 秘密資訊不能進 git。

## 4. 開發環境與 GPU

Docker 容器在 Mac 上只能用 CPU，推論沒問題。
要訓練模型或比較多個模型時，在本機跑 `services/ai-worker` 的訓練腳本（TensorFlow + tensorflow-metal），或改用 Colab，結果都記錄到 MLflow。
