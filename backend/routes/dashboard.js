const express = require('express');
const router = express.Router();
const { getRows } = require('../lib/sheets');

function todayPrefix() {
  const now = new Date();
  const taiwanOffset = 8 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + taiwanOffset);
  return local.toISOString().split('T')[0];
}

/**
 * GET /api/data
 * Returns: { today, totalToday, tasks, allExpenses, allInspirations }
 */
router.get('/', async (req, res) => {
  try {
    const today = todayPrefix();

    const [expenseRows, taskRows, inspoRows] = await Promise.all([
      getRows('Expenses'),
      getRows('Tasks'),
      getRows('Inspiration'),
    ]);

    // Today's total
    const todayExpenses = expenseRows.filter(r => r[0] && r[0].startsWith(today));
    const totalToday = todayExpenses.reduce((sum, r) => sum + (parseFloat(r[1]) || 0), 0);

    // All tasks (with row index for toggling)
    const tasks = taskRows
      .map((r, idx) => ({ idx, timestamp: r[0], text: r[1], done: r[2] || 'FALSE' }))
      .filter(t => t.text);

    // All expenses (for history, with row index)
    const allExpenses = expenseRows
      .filter(r => r[0] && r[1])
      .map((r, idx) => ({ rowIdx: idx, timestamp: r[0], amount: parseFloat(r[1]) || 0, description: r[2] || '' }));

    // All inspirations (for history, with row index)
    const allInspirations = inspoRows
      .filter(r => r[0] && r[1])
      .map((r, idx) => ({ rowIdx: idx, timestamp: r[0], content: r[1] }));

    res.json({ today, totalToday, tasks, allExpenses, allInspirations });
  } catch (err) {
    console.error('[dashboard]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
