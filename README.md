# HeartLink AI

AI 交友配對 Mobile Web App：先用 GPS 距離做硬篩選，再用人臉相似度、偏好分群、聊天語意三個階段排序推薦。

> 推薦結果只是輔助，不代表真實的關係相容性。

## 技術棧

- **前端**：Next.js、TypeScript、Tailwind、shadcn/ui（PWA）
- **後端**：NestJS、Drizzle、Socket.IO、BullMQ
- **AI**：FastAPI、TensorFlow / Keras、ONNX、scikit-learn、MLflow
- **資料**：PostgreSQL + PostGIS + pgvector、Redis、SeaweedFS（S3 相容）
- **基礎設施**：Docker Compose、Nginx、GitHub Actions

## 文件

- [決策紀錄](docs/00-DECISIONS.md)
- [路線圖](docs/01-ROADMAP.md)
- [需求清單](docs/02-REQUIREMENTS.md)
- [架構](docs/architecture/ARCHITECTURE.md)
- [模組化設計](docs/architecture/MODULES.md)
- [資料庫](docs/database/ERD.md)
- [API](docs/api/API-CATALOG.md)
- [AI 規格](docs/ai/AI-SPEC.md)

- [Docker 指南](docs/parts/00-docker.md)
- [AI 開發工具規則](AGENTS.md)

## 快速開始（本機基礎設施）

需要：Docker Desktop、Node 24、pnpm、uv（詳見 [F0](docs/tasks/F0.md)）。

```bash
cp .env.example .env              # 然後把 change-me 換成你自己的密碼
git config core.hooksPath .githooks
pnpm install
docker compose up -d --wait       # PostgreSQL :5433、Redis :6380、S3 :8333、S3 管理介面 :23646
```

## 目前進度

🚧 開發中：地基階段 F0–F2 已完成（開發環境、monorepo、Docker 基礎設施），詳見 [路線圖](docs/01-ROADMAP.md)。

## 授權

本專案**沒有提供開源授權**，保留所有權利。
