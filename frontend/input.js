/* =============================================
   input.js — Input Page Logic
   Daily NPC Mode
   ============================================= */

const API_BASE = 'http://localhost:3000';

// ── Session history (in-memory) ───────────────────────
const sessionHistory = [];

// ── Toast ─────────────────────────────────────────────

function showToast(msg, duration = 2800) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

// ── Detect input type ─────────────────────────────────

function detectType(text) {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?\s+\S/.test(t)) return 'expense';
  if (t.startsWith('#')) return 'inspo';
  return 'task';
}

const TYPE_META = {
  expense: {
    label: '💰 花費',
    badge: 'badge-expense',
    emoji: '💰',
    toast: (d) => `💰 已記錄 NT$${d.amount} — ${d.description}`,
  },
  task: {
    label: '✏️ 待辦',
    badge: 'badge-task',
    emoji: '✏️',
    toast: (d) => `✏️ 任務已加入：${d.task}`,
  },
  inspo: {
    label: '✦ 靈感',
    badge: 'badge-inspo',
    emoji: '✦',
    toast: (d) => `✦ 靈感已儲存！`,
  },
};

// ── Live type detection UI ────────────────────────────

function updateDetect(text) {
  const strip = document.getElementById('detectStrip');
  const type = detectType(text);

  if (!text.trim()) {
    strip.innerHTML = `
      <span class="detect-label">輸入格式提示 →</span>
      <span class="badge badge-expense">💰 數字 + 說明 = 花費</span>
      <span class="badge badge-task" style="background:var(--matcha-light);color:#4a7a4e;">#內容 = 靈感</span>
    `;
    return;
  }

  const meta = TYPE_META[type];
  if (!meta) return;

  strip.innerHTML = `
    <span class="detect-label">識別為：</span>
    <span class="badge ${meta.badge} success-flash">${meta.label}</span>
  `;
}

// ── Fill example from hint chip ───────────────────────

function fillExample(text) {
  const input = document.getElementById('bigInput');
  input.value = text;
  input.focus();
  updateDetect(text);
  updateCharCount(text.length);
}

// ── Char count ────────────────────────────────────────

function updateCharCount(len) {
  const el = document.getElementById('charCount');
  if (el) el.textContent = `${len} / 500`;
}

// ── Render history ────────────────────────────────────

function renderHistory() {
  const list = document.getElementById('historyList');

  if (!sessionHistory.length) {
    list.innerHTML = `
      <p style="font-size:0.82rem;color:var(--text-light);text-align:center;padding:16px 0;">
        還沒有記錄，快來輸入第一筆！
      </p>`;
    return;
  }

  list.innerHTML = sessionHistory
    .slice()
    .reverse()
    .map(
      (h) => `
      <div class="history-item">
        <div class="history-type-dot dot-${h.type}"></div>
        <span class="history-text">${escHtml(h.text)}</span>
        <span class="history-time">${h.time}</span>
      </div>`
    )
    .join('');
}

// ── Submit ────────────────────────────────────────────

async function submitInput() {
  const input = document.getElementById('bigInput');
  const btn = document.getElementById('submitBtn');
  const text = input.value.trim();

  if (!text) {
    input.focus();
    showToast('⚠️ 請輸入內容');
    return;
  }

  const type = detectType(text);
  if (!type) return;

  // Disable button
  btn.disabled = true;
  btn.textContent = '送出中…';

  try {
    const res = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();
    const meta = TYPE_META[result.type || type];

    // Toast
    showToast(meta.toast(result.data || {}));

    // Add to history
    const now = new Date();
    sessionHistory.push({
      type: result.type || type,
      text,
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    });
    renderHistory();

    // Clear & refocus
    input.value = '';
    updateDetect('');
    updateCharCount(0);
    input.focus();
  } catch (err) {
    console.error('[submit]', err);
    showToast('❌ 提交失敗：' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
      送出記錄`;
  }
}

// ── Utility ───────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('bigInput');

  // Live type detection
  input.addEventListener('input', (e) => {
    updateDetect(e.target.value);
    updateCharCount(e.target.value.length);
  });

  // Ctrl+Enter to submit
  input.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      submitInput();
    }
  });

  renderHistory();
});
