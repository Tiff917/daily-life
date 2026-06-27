# GitHub Pages 部署說明

這個版本已整理成可直接部署 `calendar/` 資料夾到 GitHub Pages。

## 你要做的事

1. 把整個專案上傳到 GitHub Repository
2. 預設分支用 `main`
3. 到 GitHub Repository 的 `Settings` -> `Pages`
4. 在 `Build and deployment` 裡選 `GitHub Actions`
5. Push 一次後，等待 `Deploy Planner To GitHub Pages` workflow 跑完

## 部署後網址

部署完成後，網址通常會是：

`https://<你的 GitHub 帳號>.github.io/<repo-name>/summer-planner.html`

## 手機安裝

- `iPhone Safari`：分享 -> `加入主畫面`
- `Android Chrome`：選單 -> `加入主畫面` 或 `安裝應用程式`

## 這個版本保留了什麼

- 本機儲存
- 提醒通知
- 備份匯出 / 匯入
- PWA 安裝

## 這個版本拿掉了什麼

- 本機 Node 同步 API
- 雲端同步按鈕

如果你之後想要跨裝置同步，可以再接 Firebase 或 Supabase。
