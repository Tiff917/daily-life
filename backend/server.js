require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// ── 🛡️ 雲端環境變數防彈大絕招（必須放在最頂端！） ──────────────────
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (rawKey) {
  try {
    const parsedKey = JSON.parse(rawKey);
    if (parsedKey.private_key) {
      // 全自動把跑掉的雙斜線 \\n 替換回真正的 Linux 換行符號 \n
      parsedKey.private_key = parsedKey.private_key.replace(/\\n/g, '\n');
      // 關鍵：將修正後的完美 JSON 重新塞回環境變數中，供後續所有 routes 讀取
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY = JSON.stringify(parsedKey);
    }
  } catch (err) {
    console.error('❌ 解析 GOOGLE_SERVICE_ACCOUNT_KEY 失敗：', err.message);
  }
} else {
  console.error('❌ 警告：未偵測到 GOOGLE_SERVICE_ACCOUNT_KEY 環境變數！');
}
// ──────────────────────────────────────────────────────────────────

const { updateCell, deleteRow } = require('./lib/sheets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Routes ────────────────────────────────────────────
app.use('/api/add', require('./routes/submit'));
app.use('/api/data', require('./routes/dashboard'));

// PATCH /api/task/:rowIndex — toggle done
app.patch('/api/task/:rowIndex', async (req, res) => {
  try {
    const rowIndex = parseInt(req.params.rowIndex, 10);
    if (isNaN(rowIndex)) return res.status(400).json({ error: 'invalid rowIndex' });
    await updateCell('Tasks', rowIndex, 2, req.body.done ? 'TRUE' : 'FALSE');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/record — delete any row by sheet + rowIndex
// Body: { sheet: 'Expenses'|'Tasks'|'Inspiration', rowIndex: number }
app.delete('/api/record', async (req, res) => {
  try {
    const { sheet, rowIndex } = req.body;
    const allowed = ['Expenses', 'Tasks', 'Inspiration'];
    if (!allowed.includes(sheet)) return res.status(400).json({ error: 'invalid sheet' });
    if (typeof rowIndex !== 'number') return res.status(400).json({ error: 'invalid rowIndex' });
    await deleteRow(sheet, rowIndex);
    res.json({ success: true });
  } catch (err) {
    console.error('[delete]', err);
    res.status(500).json({ error: err.message });
  }
});

// Debug: check env vars presence (never expose values)
app.get('/debug/env', (_, res) => {
  res.json({
    GOOGLE_SHEET_ID:            !!process.env.GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    KEY_LENGTH:                 process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length || 0,
    KEY_STARTS_WITH:            process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.slice(0, 10) || 'MISSING',
    NODE_ENV:                   process.env.NODE_ENV || 'not set',
  });
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🍵  Daily Life  →  http://localhost:${PORT}`);
});