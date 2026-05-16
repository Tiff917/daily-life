require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { updateCell, deleteRow } = require('./lib/sheets');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── Routes ────────────────────────────────────────────
app.use('/api/add',  require('./routes/submit'));
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
    if (!allowed.includes(sheet))   return res.status(400).json({ error: 'invalid sheet' });
    if (typeof rowIndex !== 'number') return res.status(400).json({ error: 'invalid rowIndex' });
    await deleteRow(sheet, rowIndex);
    res.json({ success: true });
  } catch (err) {
    console.error('[delete]', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`🍵  Daily Life  →  http://localhost:${PORT}`);
});
