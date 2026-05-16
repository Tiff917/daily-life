const express = require('express');
const router = express.Router();
const { appendRow } = require('../lib/sheets');

/**
 * POST /api/add
 * Body: { text: string }
 *
 * 判斷邏輯：
 *   - /^\d+(\.\d+)?\s/  → Expenses (e.g. "150 晚餐")
 *   - /^#/              → Inspiration (e.g. "#NPCMode 今天心情不錯")
 *   - 其他              → Tasks (e.g. "買牛奶")
 */
router.post('/', async (req, res) => {
  try {
    const { text, targetDate } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: '輸入不能為空' });
    }

    const input = text.trim();

    // Use targetDate if provided (for future scheduling), otherwise now
    let timestamp;
    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      const [y, m, d] = targetDate.split('-').map(Number);
      timestamp = new Date(y, m - 1, d).toISOString();
    } else {
      timestamp = new Date().toISOString();
    }

    let type, payload;

    if (/^\d+(\.\d+)?\s+\S/.test(input)) {
      // ── Expense ──────────────────────────────────
      const match = input.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
      const amount = match ? parseFloat(match[1]) : 0;
      const description = match ? match[2].trim() : input;
      await appendRow('Expenses', [timestamp, amount, description]);
      type = 'expense';
      payload = { amount, description };
    } else if (input.startsWith('#')) {
      // ── Inspiration ──────────────────────────────
      const content = input.replace(/^#+\s*/, '').trim() || input;
      await appendRow('Inspiration', [timestamp, content]);
      type = 'inspiration';
      payload = { content };
    } else {
      // ── Task ─────────────────────────────────────
      await appendRow('Tasks', [timestamp, input, 'FALSE']);
      type = 'task';
      payload = { task: input };
    }

    res.json({ success: true, type, data: payload });
  } catch (err) {
    console.error('[submit]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
