# 第 0 部分：Docker 指南

> 給前端工程師的 Docker 入門，以及這個專案的 Docker 規範。
> 實際操作的紀錄見 `docs/tasks/F2.md`。

---

## 1. Docker 在解決什麼問題

沒有 Docker 的時候，要在自己的電腦上跑 PostgreSQL，得用 Homebrew 安裝、自己設定、自己啟動。
換一台電腦、換一個同事，或換到 CI 和正式環境，版本和設定都可能不一樣，最後就變成「在我電腦上明明可以跑」。

**Docker 把「程式 + 它需要的整個執行環境」打包成一個映像（image）**，在哪裡執行都一樣。

| 前端的世界 | Docker 的世界 | 說明 |
|---|---|---|
| `package.json` + `node_modules` | **image（映像）** | 打包好的執行環境，唯讀，可以重複使用 |
| 執行中的 `next dev` | **container（容器）** | 映像跑起來的實體，可以同時跑好幾個 |
| `npm registry` | **Docker Hub / registry** | 下載映像的地方 |
| 寫 `package.json` 描述要裝什麼 | **Dockerfile** | 描述映像要怎麼建出來 |
| `localStorage`（重新整理後資料還在） | **volume（資料卷）** | 容器刪掉，資料也不會消失 |
| `localhost:3000` | **port mapping（埠對應）** | 把容器裡的 port 接到你 Mac 上的 port |
| `turbo.json`（一次管理多個專案） | **Docker Compose** | 用一個 YAML 檔同時管理多個容器 |
| 元件之間透過 props 溝通 | **network（網路）** | 同一個 Compose 裡的容器，可以用服務名稱互相連線 |

### 容器和虛擬機（VM）有什麼不同
- VM 會模擬一整台電腦，包含完整的作業系統，所以很重、開機也慢。
- 容器和主機共用核心，只隔離程式和檔案，所以很輕，幾秒鐘就能啟動。
- **Mac 上的特殊之處**：容器需要 Linux 核心，所以 Docker Desktop 會在背景跑一台很小的 Linux VM，所有容器都在這台 VM 裡執行。
  - 這也是 Docker Desktop 的 Settings 裡可以調整記憶體和 CPU 的原因。
  - 這台 VM 沒有辦法使用 Mac 的 GPU。

### CPU 架構：arm64 和 amd64
- 你的 M5 是 **arm64**（也叫 aarch64）。大部分的伺服器和舊的 Intel Mac 是 **amd64**（也叫 x86_64）。
- 同一個映像可以同時發布多個架構的版本（multi-arch），Docker 會自動挑選適合你電腦的版本。
- **如果映像只有 amd64 版本**，Docker 就會用模擬器執行，速度會慢很多，偶爾還會出錯。
  - F2 遇到的 `postgis/postgis` 就是這個情況。

---

## 2. 核心概念詳解

### 2.1 Image（映像）
- 由好幾層（layer）堆疊而成，每一行 Dockerfile 指令就是一層。
- 層會被快取：改了某一行，只有**那一行和它之後的層**需要重新建置。
  - 所以 Dockerfile 要把「不常變動的指令」放在前面。
- 映像名稱的格式是 `倉庫/名稱:標籤`，例如 `redis:8.8.2-alpine`。
  - **標籤一定要寫到確切的版本**，不要用 `latest`，否則每次下載到的版本可能都不一樣。
  - `-alpine` 代表以 Alpine Linux 為基礎，體積比較小；`-trixie`、`-bookworm` 代表 Debian 的版本代號。

### 2.2 Container（容器）
- 狀態依序是 Created → Running → Exited。
- 容器裡的檔案系統是**暫時的**：容器刪掉，裡面寫入的東西就不見了。
  - 所以資料庫的資料一定要放在 volume 裡。
- 重啟策略：`restart: unless-stopped` 代表容器當掉，或 Docker 重新啟動時，會自動把容器帶起來；只有你手動停止時才不會重啟。

### 2.3 Volume（資料卷）
| 類型 | 寫法 | 適合用在哪裡 |
|---|---|---|
| **具名 volume** | `postgres-data:/var/lib/postgresql` | 資料庫的資料。由 Docker 管理，效能好 |
| **bind mount** | `./src:/app/src` | 開發時同步程式碼，改了檔案容器裡馬上看得到 |

- `docker compose down` **不會**刪除 volume。
- `docker compose down -v` **會**刪除 volume，資料全部清空，要小心使用。

### 2.4 Port mapping（埠對應）
```yaml
ports:
  - "127.0.0.1:5433:5432"
#    └─ Mac 的 IP ┘ └Mac 的 port┘ └容器裡的 port┘
```
- 如果不寫 `127.0.0.1:`，預設會綁定 `0.0.0.0`，**同一個 Wi-Fi 裡的其他人也連得到**。本專案規定一律寫 `127.0.0.1`。
- 容器裡的 port 不會跟其他容器衝突，但 **Mac 這一端的 port 只能給一個程式用**。

### 2.5 Network（網路）
- Compose 會自動建立一個網路，例如 `heartlink_default`。
- 在這個網路裡，容器之間**用服務名稱就能連線**，例如 api 容器可以用 `postgres:5432` 連到資料庫。
  - 這裡用的是**容器裡的 port**，不是 Mac 上的 port。

| 從哪裡連 | 連線位址 |
|---|---|
| 你的 Mac（例如 Drizzle Studio、測試程式） | `localhost:5433` |
| 同一個 Compose 裡的其他容器（F3 之後的 api） | `postgres:5432` |

### 2.6 Healthcheck（健康檢查）
- 容器「正在執行」，不代表裡面的服務已經「可以用」。例如 Postgres 啟動後，還要花幾秒鐘初始化。
- healthcheck 會定期執行一個指令，成功就標記為 `healthy`。
- 其他服務可以用 `depends_on: condition: service_healthy`，等依賴的服務真的準備好了才啟動。
- **前端類比**：就像等 `isLoading === false` 之後才渲染。

### 2.7 環境變數與 `.env`
- Compose 會自動讀取同一個資料夾裡的 `.env`，並替換 YAML 裡的 `${變數}`。
- `${VAR:-預設值}`：沒有設定就用預設值。
- `${VAR:?錯誤訊息}`：**沒有設定就直接報錯**，適合用在密碼這類必填的值。
- `$${VAR}`：兩個 `$` 代表「不要讓 Compose 替換，留給容器裡的 shell 處理」。

---

## 3. Dockerfile 常用指令

| 指令 | 用途 | 本專案的例子 |
|---|---|---|
| `FROM` | 以哪個映像為基礎 | `FROM pgvector/pgvector:0.8.6-pg18-trixie` |
| `ARG` | 建置時使用的變數 | `ARG POSTGIS_MAJOR=3` |
| `RUN` | 建置時執行指令，會產生新的一層 | `apt-get install ...` |
| `COPY` | 把檔案複製進映像 | `COPY init/ /docker-entrypoint-initdb.d/` |
| `ENV` | 設定執行時的環境變數 | — |
| `WORKDIR` | 設定工作目錄 | F3 會用到 |
| `EXPOSE` | 標示服務用哪個 port（只是說明用） | F3 會用到 |
| `CMD` / `ENTRYPOINT` | 容器啟動時要執行什麼 | F3 會用到 |

**寫 `RUN` 的慣例**：把 `apt-get update`、`apt-get install`、清除快取寫在**同一個 RUN** 裡，並用 `&&` 串起來。如果分成不同的 RUN，快取過的舊套件清單會跟新的安裝指令搭在一起，而且映像會變大。

---

## 4. 常用指令速查

### Compose（最常用）
| 指令 | 作用 |
|---|---|
| `docker compose up -d` | 在背景啟動全部服務 |
| `docker compose up -d --wait` | 啟動後，等到全部服務都 healthy 才結束 |
| `docker compose up -d postgres` | 只啟動 postgres |
| `docker compose ps` | 查看狀態 |
| `docker compose logs -f postgres` | 持續查看 log（按 Ctrl+C 離開） |
| `docker compose exec postgres sh` | 進入容器裡的 shell |
| `docker compose restart redis` | 重新啟動某個服務 |
| `docker compose stop` | 停止，容器保留 |
| `docker compose down` | 停止並刪除容器和網路，**保留 volume** |
| `docker compose down -v` | ⚠️ 連 volume 一起刪除，**資料會全部清空** |
| `docker compose build` | 重新建置自己寫的映像（例如 postgres） |
| `docker compose config` | 顯示替換完變數之後的最終設定，並檢查語法 |
| `docker compose pull` | 下載最新的映像 |

### 除錯與清理
| 指令 | 作用 |
|---|---|
| `docker ps -a` | 列出所有容器，包含已經停止的 |
| `docker inspect <容器>` | 查看完整設定 |
| `docker stats` | 即時查看 CPU 和記憶體用量 |
| `docker volume ls` | 列出所有 volume |
| `docker image ls` | 列出所有映像 |
| `docker system df` | 查看 Docker 占用多少硬碟空間 |
| `docker image prune` | 刪除沒有被使用的映像 |

### 本專案的服務
| 服務 | 連線方式 |
|---|---|
| 進入 Postgres | `docker compose exec postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` |
| 進入 Redis | `docker compose exec redis redis-cli` |
| SeaweedFS 管理介面 | 瀏覽器開啟 `http://localhost:23646`，帳號密碼在 `.env` |

---

## 5. 本專案的 Docker 規範

1. **映像標籤要寫到確切的版本**，禁止 `latest`；升級版本也要走任務流程。
2. **port 一律綁定 `127.0.0.1`**，不對區域網路開放。
3. **密碼只能放在 `.env`**，Compose 裡用 `${VAR:?}` 讓缺少時直接報錯。`.env.example` 只能放假值。
4. **每個服務都要有 healthcheck**。
5. **資料一律放在具名 volume**。
6. 自己寫的映像放在 `infrastructure/<服務>/Dockerfile`。
7. **要支援 arm64**：選映像前先確認它有 arm64 版本。
8. **Mac 這一端的 port 要避開常見的 port**（5432、6379），以免跟你電腦上的其他專案衝突。
9. **資料表結構不寫在 init 腳本裡**：init 只負責啟用擴充套件，資料表交給 Drizzle migration（D24）。
10. **不能用 `down -v` 刪除有真實資料的 volume**，要先問使用者。

---

## 6. 常見錯誤（大多是 F2 實際遇到的）

| 錯誤訊息或現象 | 原因 | 解法 |
|---|---|---|
| `Bind for 127.0.0.1:5432 failed: port is already allocated` | Mac 上的這個 port 已經被別的程式或容器占用 | 用 `docker ps` 或 `lsof -nP -iTCP:5432` 找出是誰在用，然後換一個 port |
| `command not found: docker` | Docker Desktop 的 CLI 裝在 `~/.docker/bin`，但這個資料夾不在 PATH 裡 | 在 `~/.zshrc` 加上 `export PATH="$HOME/.docker/bin:$PATH"` |
| 在 zsh 腳本裡執行 `for path in ...` 之後，所有指令都找不到 | `path` 是 zsh 的特殊變數，跟 `PATH` 綁在一起 | 不要用 `path` 當變數名稱 |
| 映像跑得很慢，或出現 `platform (linux/amd64) does not match` | 映像沒有 arm64 版本，只能用模擬器跑 | 換成有 multi-arch 的映像，或自己建置 |
| PostgreSQL 18 重啟後資料不見了 | 18 版的資料改放在 `/var/lib/postgresql/18/docker`，volume 還掛在舊的 `/data` 路徑 | volume 改掛在 `/var/lib/postgresql` |
| 改了 `init/*.sql` 卻沒有執行 | init 腳本**只會在 volume 是空的時候**執行 | 開發環境可以先 `down -v` 再重新 `up`（會清空資料） |
| 改了 `.env` 裡的密碼，卻登不進資料庫 | 密碼只在第一次初始化時寫入 volume | 同上，或在資料庫裡用 `ALTER USER` 修改密碼 |
| `required variable ... is missing` | `.env` 裡缺少某個 `${VAR:?}` 需要的值 | 對照 `.env.example` 補上 |
| 容器一直是 `unhealthy` | healthcheck 指令失敗 | `docker inspect --format '{{json .State.Health}}' <容器>` 查看失敗的原因 |
| MinIO 的映像下載不到 | MinIO 在 2025 年 10 月停止發布社群版映像 | 改用 SeaweedFS（D29） |

---

## 7. 發布映像到 registry（Docker Hub / GHCR）

### 7.1 什麼時候需要發布
| 情況 | 需要發布嗎 | 原因 |
|---|---|---|
| **本機開發**（目前） | ❌ 不需要 | 第三方映像（redis、seaweedfs）直接從 Docker Hub 下載；我們自己的 postgres 映像由 `docker compose build` 在本機建置，Dockerfile 就在 repo 裡，任何人 clone 下來都能建出一樣的東西 |
| **CI 測試**（F5） | ❌ 不需要 | CI 會直接用 Dockerfile 建置 |
| **部署到伺服器**（S11） | ✅ 需要 | 伺服器不應該自己 build，而是下載 CI 建好、測過的映像，確保上線的就是測過的那一份 |

**前端類比**：本機開發就像 `pnpm dev` 直接跑原始碼；部署時則像先 `pnpm build` 產出 bundle，再把 bundle 上傳到 CDN。registry 就是映像的 CDN 或 npm registry。

### 7.2 選哪個 registry：本專案預計用 GHCR
| | Docker Hub | **GitHub Container Registry（ghcr.io）** |
|---|---|---|
| 帳號 | 要另外註冊 Docker 帳號 | 直接用 GitHub 帳號 |
| CI 登入 | 要把 Docker Hub token 存成 GitHub secret | GitHub Actions 內建的 `GITHUB_TOKEN` 就能推送，**不用另外管理秘密** |
| 和 repo 的關聯 | 各自獨立 | 映像會顯示在 GitHub repo 頁面上 |
| 下載次數限制 | 免費帳號和匿名下載都有速率限制 | 公開映像沒有嚴格限制 |
| 適合 | 想公開發布給大家使用的映像 | 自己專案部署用的映像 ✅ |

### 7.3 手動發布的步驟（學習用，實際會交給 CI）
```bash
# 1. 登入。GHCR 需要有 write:packages 權限的 GitHub token
gh auth refresh -s write:packages
gh auth token | docker login ghcr.io -u mimimeowmeo --password-stdin

# 2. 幫映像取一個 registry 上的名稱（tag），格式：registry/帳號/名稱:版本
docker tag heartlink/postgres:18-postgis3-pgvector0.8.6 ghcr.io/mimimeowmeo/heartlink-postgres:18-postgis3-pgvector0.8.6

# 3. 推送
docker push ghcr.io/mimimeowmeo/heartlink-postgres:18-postgis3-pgvector0.8.6
```
如果要推到 Docker Hub，只要改成 `docker login`（輸入 Docker Hub 帳號），名稱改成 `帳號/名稱:版本` 即可。

### 7.4 ⚠️ 最重要的坑：CPU 架構
- 你的 Mac 建出來的映像是 **arm64**，但大部分的雲端伺服器是 **amd64**。
- 直接把 Mac 上 build 的映像推上去，伺服器上會跑不起來，或只能用模擬器慢慢跑。
- 解法是用 **buildx 同時建出兩種架構**（multi-platform build）：
```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/mimimeowmeo/heartlink-api:0.1.0 --push apps/api
```
- 本專案會在 CI（GitHub Actions）裡做這件事。

### 7.5 本專案的規劃
| 時間點 | 做什麼 |
|---|---|
| F3 | 為 api、ai、ai-worker 寫 Dockerfile（只在本機 build） |
| F5 | CI 用 Dockerfile 建置並測試，不推送 |
| S11 部署 | CI 在合併到 main 時，用 buildx 建出 amd64 + arm64 的映像，推送到 **ghcr.io**，標籤用 git commit SHA；伺服器再從 ghcr.io 下載 |
| 注意 | **映像裡不能包含任何秘密資訊**，repo 是公開的，映像也會是公開的；秘密一律在執行時用環境變數傳入 |
