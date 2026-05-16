# Daily NPC Mode 🍵

個人日常管理 PWA — 奶茶色系 · 韓系簡約

## 📁 檔案結構

```
daily/
├── frontend/           # 前端靜態頁面
│   ├── index.html      # Dashboard 主儀表板
│   ├── input.html      # 萬能輸入頁
│   ├── style.css       # 奶茶色設計系統
│   ├── app.js          # Dashboard 邏輯
│   ├── input.js        # Input 頁邏輯
│   ├── manifest.json   # PWA manifest
│   └── sw.js           # Service Worker
│
└── backend/            # Node.js API Server
    ├── server.js       # Express 主程式
    ├── routes/
    │   ├── submit.js   # POST /api/add
    │   └── dashboard.js# GET /api/data
    ├── lib/
    │   └── sheets.js   # Google Sheets 工具
    ├── .env            # 金鑰（自行建立）
    ├── .env.example    # 金鑰範本
    └── package.json
```

---

## 🛠️ 第一步：建立 Google Sheets

1. 開啟你的 Google Sheets 試算表
2. 在底部新增三個分頁（Sheet Tab），依序命名：

| 分頁名稱 | A 欄 | B 欄 | C 欄 |
|---------|------|------|------|
| `Expenses` | Timestamp | Amount | Description |
| `Tasks` | Timestamp | Task | Done |
| `Inspiration` | Timestamp | Content | |

3. **第一列建議填入欄位名稱**（非必要，系統不會讀第一列，但方便你看）

---

## 🔑 第二步：設定 Google Service Account

1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立專案（或使用現有專案）
3. 啟用 **Google Sheets API**（APIs & Services → Library）
4. 建立服務帳戶：IAM & Admin → Service Accounts → Create
5. 下載 JSON 金鑰
6. **把試算表共用給服務帳戶 Email**（Viewer → Editor 權限）

---

## ⚙️ 第三步：建立 .env 檔案

```bash
cd backend
copy .env.example .env
```

然後編輯 `.env`：

```env
# 試算表 URL 中 /d/ 後面那串
GOOGLE_SHEET_ID=1AbCdEfGhIj...

# 把下載的 JSON 金鑰內容整個貼進來（壓成一行）
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# 你的 NewsAPI Key
NEWS_API_KEY=xk7xxxxxxxxxxxxxxxx

PORT=3000
```

> ⚠️ GOOGLE_SERVICE_ACCOUNT_KEY 必須是 **一整行 JSON**，不能換行

---

## 🚀 第四步：啟動專案

### 後端

```bash
cd backend
npm install
npm run dev       # 開發模式（nodemon 熱重載）
# 或
npm start         # 一般啟動
```

看到 `🍵 Daily NPC Backend → http://localhost:3000` 就成功了。

### 前端

```bash
# 在 daily 根目錄執行（需要 Node.js）
npx serve frontend -p 5500
```

或直接用 VS Code → Live Server 開啟 `frontend/index.html`

前端網址：`http://localhost:5500`

---

## 📡 API 文件

### POST `/api/add`

自動分類輸入並寫入 Google Sheets。

```json
// Request
{ "text": "150 午餐" }

// Response
{ "success": true, "type": "expense", "data": { "amount": 150, "description": "午餐" } }
```

**判斷邏輯：**
- `數字 說明` (如 `150 晚餐`) → Expenses
- `#內容` (如 `#今天學到...`) → Inspiration  
- 其他文字 → Tasks

### GET `/api/data`

回傳 Dashboard 所需所有資料。

```json
{
  "today": "2026-05-16",
  "totalToday": 450,
  "tasks": [{ "idx": 1, "text": "買牛奶", "timestamp": "..." }],
  "latestInspo": { "content": "NPCMode 也可以很精彩", "timestamp": "..." },
  "news": [{ "title": "...", "url": "...", "source": "...", "urlToImage": "..." }]
}
```

### PATCH `/api/task/:rowIndex`

切換任務完成狀態。

```json
// Request
{ "done": true }

// Response
{ "success": true, "rowIndex": 2, "done": true }
```

---

## 📱 PWA 安裝

手機用 Chrome / Safari 開啟前端網址後：
- Android：瀏覽器選單 → 「加入主畫面」
- iOS：分享按鈕 → 「加入主畫面」
