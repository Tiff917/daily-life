/* =============================================
   app.js — Home Page Logic
   Daily Life
   ============================================= */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';

// ── State ─────────────────────────────────────────────
let allTasks         = [];
let allExpenses      = [];
let allInspirations  = [];
let selectedDate     = null;
let calYear          = null;
let calMonth         = null;

// ── Date utils ────────────────────────────────────────

function toLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fromLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function formatDateLabel(dateStr) {
  const today    = toLocalDate();
  const tomorrow = toLocalDate(new Date(Date.now() + 86400000));
  if (dateStr === today)    return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  return fromLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'long' });
}
function formatDateSub(dateStr) {
  return fromLocalDate(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Toast ─────────────────────────────────────────────

function showToast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), ms);
}

// ── Calendar ──────────────────────────────────────────

function datesWithActivity() {
  const dates = new Set();
  allTasks.forEach(t => { if (t.timestamp) dates.add(t.timestamp.split('T')[0]); });
  return dates;
}

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  if (!grid) return;

  const today   = toLocalDate();
  const active  = datesWithActivity();
  const first   = new Date(calYear, calMonth, 1);
  const last    = new Date(calYear, calMonth + 1, 0);

  label.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

  // Leading blanks
  for (let i = 0; i < first.getDay(); i++) {
    const prev = new Date(calYear, calMonth, -first.getDay() + i + 1);
    html += `<div class="cal-day other-month">${prev.getDate()}</div>`;
  }

  for (let d = 1; d <= last.getDate(); d++) {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    let cls = 'cal-day';
    if (ds === today)        cls += ' today';
    if (ds === selectedDate) cls += ' selected';
    if (active.has(ds))      cls += ' has-tasks';
    html += `<div class="${cls}" onclick="selectDate('${ds}')">${d}</div>`;
  }

  // Trailing blanks
  const endDow = last.getDay();
  for (let i = endDow + 1; i < 7; i++) {
    const next = new Date(calYear, calMonth + 1, i - endDow);
    html += `<div class="cal-day other-month">${next.getDate()}</div>`;
  }

  grid.innerHTML = html;
}

function renderQuickDays() {
  const strip = document.getElementById('quickDays');
  if (!strip) return;
  const today  = toLocalDate();
  const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = '';

  for (let offset = -1; offset <= 5; offset++) {
    const d   = new Date(Date.now() + offset * 86400000);
    const ds  = toLocalDate(d);
    let cls   = 'quick-day-btn';
    if (ds === selectedDate) cls += ' active';
    else if (ds === today)   cls += ' is-today';
    html += `
      <button class="${cls}" onclick="selectDate('${ds}')">
        <span class="qd-dow">${DOW[d.getDay()]}</span>
        <span class="qd-num">${d.getDate()}</span>
      </button>`;
  }
  strip.innerHTML = html;
}

function renderDayPanel() {
  const label = document.getElementById('dayPanelLabel');
  const sub   = document.getElementById('dayPanelSub');
  const count = document.getElementById('taskCount');
  const list  = document.getElementById('taskList');
  if (!label) return;

  label.textContent = formatDateLabel(selectedDate);
  sub.textContent   = formatDateSub(selectedDate);

  const tasks = allTasks.filter(t => t.timestamp?.startsWith(selectedDate));
  count.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

  if (!tasks.length) {
    list.innerHTML = '<div class="task-empty">No tasks for this day.</div>';
    return;
  }

  list.innerHTML = tasks.map(t => {
    const done = t.done?.toString().toUpperCase() === 'TRUE';
    return `
      <div class="task-row ${done ? 'done' : ''}" onclick="toggleTask(${t.idx}, this)">
        <div class="task-check">
          ${done ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--cream-100)" stroke-width="2.5"><polyline points="2 6 5 9 10 3"/></svg>` : ''}
        </div>
        <span class="task-text">${escHtml(t.text)}</span>
      </div>`;
  }).join('');
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  const d = fromLocalDate(dateStr);
  calYear  = d.getFullYear();
  calMonth = d.getMonth();
  renderCalendar();
  renderQuickDays();
  renderDayPanel();
}

// Month nav
document.getElementById('prevMonth')?.addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ── Toggle task ───────────────────────────────────────

async function toggleTask(idx, el) {
  const isDone = !el.classList.contains('done');
  const t = allTasks.find(x => x.idx === idx);
  if (t) t.done = isDone ? 'TRUE' : 'FALSE';
  renderDayPanel();

  try {
    await fetch(`${API_BASE}/api/task/${idx}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: isDone }),
    });
    showToast(isDone ? '✓ Done' : '↩ Undone');
  } catch {
    if (t) t.done = isDone ? 'FALSE' : 'TRUE';
    renderDayPanel();
    showToast('Update failed');
  }
}

// ── Add task ──────────────────────────────────────────

async function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) { input.focus(); return; }

  try {
    const res = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetDate: selectedDate }),
    });
    if (!res.ok) throw new Error();
    input.value = '';
    showToast('Task added');
    await loadDashboard();
  } catch {
    showToast('Failed to add task');
  }
}

// ── Add expense ───────────────────────────────────────

async function addExpense() {
  const amount = parseFloat(document.getElementById('expAmount').value);
  const desc   = document.getElementById('expDesc').value.trim();

  if (!amount || amount <= 0) { document.getElementById('expAmount').focus(); showToast('Enter an amount'); return; }
  if (!desc) { document.getElementById('expDesc').focus(); showToast('Enter a description'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${amount} ${desc}` }),
    });
    if (!res.ok) throw new Error();
    document.getElementById('expAmount').value = '';
    document.getElementById('expDesc').value   = '';
    showToast(`+ NT$${amount} recorded`);
    await loadDashboard();
  } catch {
    showToast('Failed to record expense');
  }
}

// ── Add inspiration ───────────────────────────────────

async function addInspiration() {
  const input = document.getElementById('inspoInput');
  const text  = input.value.trim();
  if (!text) { input.focus(); showToast('Write something first'); return; }

  try {
    const res = await fetch(`${API_BASE}/api/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `#${text}` }),
    });
    if (!res.ok) throw new Error();
    input.value = '';
    showToast('Inspiration saved ✦');
  } catch {
    showToast('Failed to save inspiration');
  }
}

// ── Keyboard shortcuts ────────────────────────────────

document.getElementById('expDesc')?.addEventListener('keydown',  e => { if (e.key === 'Enter') addExpense(); });
document.getElementById('inspoInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addInspiration(); });
document.getElementById('taskInput')?.addEventListener('keydown',  e => { if (e.key === 'Enter') addTask(); });

// ── Load dashboard ────────────────────────────────────

async function loadDashboard() {
  try {
    const res  = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    // Update today's total
    document.getElementById('spendTotal').textContent =
      `NT$${(data.totalToday || 0).toLocaleString('en-US')}`;

    allTasks        = data.tasks        || [];
    allExpenses     = data.allExpenses  || [];
    allInspirations = data.allInspirations || [];

    renderCalendar();
    renderQuickDays();
    renderDayPanel();
  } catch {
    renderCalendar();
    renderQuickDays();
    renderDayPanel();
  }
}

// ── Utility ───────────────────────────────────────────

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  selectedDate = toLocalDate(now);

  document.getElementById('headerDate').textContent =
    now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  loadDashboard();
});
