# HeartLink AI

AI 交友配對 Mobile Web App：先用 GPS 距離做硬篩選，再用人臉相似度、偏好分群、聊天語意三個階段排序推薦。

> 推薦結果只是輔助，不代表真實的關係相容性。

## 技術棧

- **前端**：Next.js、TypeScript、Tailwind、shadcn/ui（PWA）
- **後端**：NestJS、Drizzle、Socket.IO、BullMQ
- **AI**：FastAPI、TensorFlow / Keras、ONNX、scikit-learn、MLflow
- **資料**：PostgreSQL + PostGIS + pgvector、Redis、MinIO
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

> 🚧 開發中，目前還沒有程式碼。
