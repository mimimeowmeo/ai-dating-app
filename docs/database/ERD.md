# 資料庫設計（草稿）

> ⚠️ **草稿**：D3（F6）時會參考使用者提供的 CSV 再定稿。CSV 放在 `data/`，這個資料夾不會進 git。

ORM：Drizzle。擴充套件：`postgis`、`vector`。
向量維度 N 由模型決定（暫定），確定模型後才寫進 migration。

## 關係圖

```text
users ─┬─ profiles
       ├─ preferences
       ├─ user_locations            (PostGIS)
       ├─ consents                  (相機 / GPS / 聊天分析)
       ├─ user_tags ── tags         (分類：interest / sport / food / travel，含同義詞)
       ├─ user_photos ─┬─ face_embeddings          (pgvector)
       │               └─ verification_records     (liveness)
       ├─ face_preference_samples                  (Stage 1 的偏好臉孔)
       ├─ preference_vectors                       (Stage 2 的 multi-hot 向量)
       ├─ user_clusters                            (k-Means 結果，有版本)
       ├─ semantic_profiles                        (Stage 3，有版本)
       ├─ likes / matches / blocks
       ├─ conversations ─ conversation_members / messages / conversation_features
       └─ recommendation_events                    (各階段分數)
feature_flags / model_versions
```

## 和 Codex 版本相比的變更

- **新增**：`user_locations`（B 的 GPS 需求）、`consents`、`face_preference_samples`、`preference_vectors`、`semantic_profiles`、`feature_flags`、`model_versions`。
- **合併**：原本的 interests / hobbies / foods 三組表，合併成 `tags`（加上 `category` 欄位）和 `user_tags`。這樣新增「運動」或「旅遊」分類時，不必再開新的表。
- **刪除**：`user_feature_vectors.combined_embedding`（依 D07）。
- **修改**：`profiles` 不再存經緯度，改放在 `user_locations`。

## 主要資料表（欄位草稿）

### user_locations
- `user_id` PK/FK
- `geog geography(Point,4326)`，建 GIST 索引
- `accuracy_m`
- `captured_at`
- `expires_at`
- `source`（gps / manual）
- `region_code`（使用者選手動地區時用）

### consents
- `id`、`user_id`
- `type`（camera / location / chat_analysis）
- `granted`
- `policy_version`
- `created_at`

### tags / user_tags
- `tags`：`id`、`category`、`slug`、`label_zh`、`synonyms text[]`、`dictionary_version`
- `user_tags`：`user_id`、`tag_id`，複合主鍵

### user_photos
- `id`、`user_id`、`storage_key`、`is_avatar`
- `quality_status`、`quality_reason`
- `deleted_at`

### face_embeddings
- `id`、`user_id`、`photo_id`
- `embedding vector(N)`，建 HNSW 索引
- `model_name`、`model_version`、`created_at`
- 頭貼刪除時，對應的向量要一起刪除（REQ-014）

### verification_records
- `id`、`user_id`、`photo_id`、`status`
- `liveness_score`、`model_name`、`model_version`、`reason_code`、`created_at`

### preference_vectors
- `user_id`、`vector vector(M)`、`dictionary_version`、`updated_at`

### user_clusters
- `user_id`、`cluster_id`、`distance`、`cluster_version`、`created_at`

### recommendation_events
- `id`、`user_id`、`candidate_id`、`position`
- `face_score`、`cluster_score`、`semantic_score`、`behavior_score`、`final_score`
- `stages_enabled jsonb`、`algorithm_version`、`created_at`

### 其他
`profiles`、`preferences`、`likes`、`matches`、`blocks`、`conversations`、`conversation_members`、`messages`、`conversation_features`、`notifications`，沿用 `docs/reference/codex-PROJECT_REPORT.md` 裡原本 ERD 的欄位，到時候再細修。
