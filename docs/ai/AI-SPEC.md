# AI 規格

> 🟡 **這份文件裡的模型都是暫定。** D11（S8）時要和使用者討論模型選擇、多模型比較和 ensemble 策略。

## 框架原則（D12）
- **TensorFlow / Keras 優先**：自己訓練的模型都用 Keras。
- 工具本身是 PyTorch 的（例如 sentence-transformers），才用 PyTorch。
- 人臉模型以 **ONNX** 格式執行（例如 InsightFace），和框架無關。
- 分群、評估用 scikit-learn。
- 實驗記錄在 MLflow，每個模型都有 `model_name` 和 `model_version`。

## 各階段的暫定候選模型

| 功能 | 候選 A | 候選 B | 可以用 TensorFlow 練習的地方 |
|---|---|---|---|
| 人臉偵測、品質檢查 | InsightFace（RetinaFace，ONNX） | MediaPipe Face Detection | 模糊度分類器（Keras CNN） |
| 人臉 Embedding | InsightFace ArcFace（ONNX） | FaceNet（有 Keras 版） | 比較兩者的 Top-K 穩定度 |
| Liveness | Silent-Face-Anti-Spoofing（ONNX） | 自己訓練 Keras 二元分類器 | ✅ 很適合當 TensorFlow 練習題 |
| Stage 2 偏好向量 | multi-hot | Keras autoencoder 壓縮向量 | ✅ |
| Stage 2 分群 | k-Means（scikit-learn） | 階層式分群 / DBSCAN | — |
| Stage 3 語意 | sentence-transformers 多語言模型（PyTorch） | KerasHub / TF Hub 的文字 encoder | 話題分類器（Keras） |
| BehaviorScore | 規則式（先做） | Keras 二元分類，預測「會不會按喜歡」 | ✅ |

## Ensemble 與模型選擇的原則
1. **不能把不同模型的向量直接平均**，因為它們在不同的向量空間。ensemble 要在「分數層」做：每個模型各自算出分數，正規化（z-score 或 min-max）後再加權。
2. 資料要分三份：用**驗證集**選模型和權重，**測試集只在最後用一次**；切分時要依使用者或時間，避免資料洩漏。
3. 每次比較都記錄在 MLflow：參數、指標、耗時、模型大小（Mac CPU 推論的速度也要納入考量）。
4. 先建立一個固定權重的 baseline，所有新模型都要跟它比。

## 評估指標
- **Stage 1**：人臉偵測成功率、品質拒絕率、相似度分布、Top-K 穩定度。
- **Stage 2**：Silhouette 分數、Elbow 曲線、每群人數分布、不同批次之間的穩定度。
- **Stage 3**：Precision、Recall、F1，並記錄錯誤案例。
- **整體排序**：Precision@K、Recall@K、NDCG@K、配對率、推薦多樣性。

## 安全界線
- 偵測到人臉，不等於證明了身分。
- 門檻值要由使用者決定，並記錄版本。
- 語意分析的結果和原始訊息分開存，並記錄信心值和版本。
- 要提供「關閉視覺篩選」的選項，也要檢查外貌偏見。
