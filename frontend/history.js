/* =============================================
   history.js — History Page Logic
   Daily Life
   ============================================= */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : '';

let allTasks        = [];
let allExpenses     = [];
let allInspirations = [];
let selectedDate    = null;
let calYear         = null;
let calMonth        = null;

// ── Date utils ────────────────────────────────────────

function toLocalDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function fromLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2600);
}

// ── Delete record ─────────────────────────────────────

async function deleteRecord(sheet, rowIndex) {
  if (!confirm(`Delete this ${sheet.slice(0,-1).toLowerCase()}?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/record`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet, rowIndex }),
    });
    if (!res.ok) throw new Error();
    showToast('Deleted');
    await loadAllData();       // 重新載入並重渲染當前日期
    if (selectedDate) renderDetail(selectedDate);
  } catch {
    showToast('Delete failed');
  }
}

// ── Dates that have any activity ──────────────────────

function activeDates() {
  const s = new Set();
  allExpenses.forEach(e      => { if (e.timestamp) s.add(e.timestamp.split('T')[0]); });
  allTasks.forEach(t         => { if (t.timestamp) s.add(t.timestamp.split('T')[0]); });
  allInspirations.forEach(i  => { if (i.timestamp) s.add(i.timestamp.split('T')[0]); });
  return s;
}

// ── Calendar ──────────────────────────────────────────

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const label = document.getElementById('calMonthLabel');
  if (!grid) return;

  const today  = toLocalDate();
  const active = activeDates();
  const first  = new Date(calYear, calMonth, 1);
  const last   = new Date(calYear, calMonth + 1, 0);

  label.textContent = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  let html = DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

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
    // Mark 1st of month specially
    if (d === 1)             cls += ' first-of-month';
    html += `<div class="${cls}" onclick="selectDate('${ds}')">${d}</div>`;
  }

  const endDow = last.getDay();
  for (let i = endDow + 1; i < 7; i++) {
    const next = new Date(calYear, calMonth + 1, i - endDow);
    html += `<div class="cal-day other-month">${next.getDate()}</div>`;
  }

  grid.innerHTML = html;
}

// ── Monthly summary (for 1st of month) ───────────────

function getPrevMonthSummary(dateStr) {
  // dateStr = "YYYY-MM-01", calculate previous month's total
  const [y, m] = dateStr.split('-').map(Number);
  let prevY = y, prevM = m - 1;
  if (prevM === 0) { prevM = 12; prevY--; }

  const prefix = `${prevY}-${String(prevM).padStart(2,'0')}`;
  const expenses = allExpenses.filter(e => e.timestamp?.startsWith(prefix));
  const total    = expenses.reduce((s, e) => s + e.amount, 0);
  const tasks    = allTasks.filter(t => t.timestamp?.startsWith(prefix));
  const done     = tasks.filter(t => t.done?.toString().toUpperCase() === 'TRUE').length;
  const inspos   = allInspirations.filter(i => i.timestamp?.startsWith(prefix));

  const monthName = new Date(prevY, prevM - 1, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return { monthName, total, expCount: expenses.length, taskCount: tasks.length, doneCount: done, inspoCount: inspos.length };
}

// ── Day detail panel ──────────────────────────────────

function selectDate(dateStr) {
  selectedDate = dateStr;
  const d = fromLocalDate(dateStr);
  calYear  = d.getFullYear();
  calMonth = d.getMonth();
  renderCalendar();
  renderDetail(dateStr);
}

function renderDetail(dateStr) {
  const card    = document.getElementById('detailCard');
  const content = document.getElementById('detailContent');
  const name    = document.getElementById('detailDayName');
  const full    = document.getElementById('detailDayFull');
  const sub     = document.getElementById('histSubtitle');

  const today    = toLocalDate();
  const tomorrow = toLocalDate(new Date(Date.now() + 86400000));

  let label;
  if (dateStr === today)         label = 'Today';
  else if (dateStr === tomorrow) label = 'Tomorrow';
  else label = fromLocalDate(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

  name.textContent = label;
  full.textContent = fromLocalDate(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  sub.textContent  = full.textContent;

  // Filter records for this day
  const dayExpenses     = allExpenses.filter(e     => e.timestamp?.startsWith(dateStr));
  const dayTasks        = allTasks.filter(t        => t.timestamp?.startsWith(dateStr));
  const dayInspirations = allInspirations.filter(i => i.timestamp?.startsWith(dateStr));
  const isFirstOfMonth  = dateStr.endsWith('-01');

  const hasAnything = dayExpenses.length || dayTasks.length || dayInspirations.length || isFirstOfMonth;

  card.style.display = 'block';
  if (!hasAnything) {
    content.innerHTML = `<div class="no-data">No records for this day.</div>`;
    return;
  }

  let html = '';

  // ── 1. EXPENSES ───────────────────────────────────
  if (dayExpenses.length) {
    const total = dayExpenses.reduce((s, e) => s + e.amount, 0);
    html += `
      <div class="cat-section">
        <div class="cat-header">
          <div class="cat-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <span class="cat-label">Expenses</span>
          <span class="cat-total">NT$${total.toLocaleString('en-US')}</span>
        </div>
        <div class="exp-list">
          ${dayExpenses.map(e => `
            <div class="exp-row">
              <span class="exp-desc">${escHtml(e.description)}</span>
              <span class="exp-amount">NT$${e.amount.toLocaleString('en-US')}</span>
              <button class="del-btn" onclick="deleteRecord('Expenses', ${e.rowIdx})" aria-label="Delete expense">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>`).join('')}
        </div>
        <div class="exp-total-row">
          <span>Daily Total</span>
          <span class="exp-grand-total">NT$${total.toLocaleString('en-US')}</span>
        </div>
      </div>`;
  }

  // ── 2. INSPIRATIONS (below expenses) ──────────────
  if (dayInspirations.length) {
    html += `
      <div class="cat-section">
        <div class="cat-header">
          <div class="cat-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 3.5-2.5 5.5-3 8H8c-.5-2.5-3-4.5-3-8a7 7 0 0 1 7-7z"/>
              <path d="M9 21h6"/>
            </svg>
          </div>
          <span class="cat-label">Inspirations</span>
        </div>
        ${dayInspirations.map(i => `
          <div class="inspo-item">
            <span>${escHtml(i.content)}</span>
            <button class="del-btn del-btn-inspo" onclick="deleteRecord('Inspiration', ${i.rowIdx})" aria-label="Delete inspiration">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>`).join('')}
      </div>`;
  }

  // ── 3. TASKS + monthly summary below ──────────────
  if (dayTasks.length || isFirstOfMonth) {
    const doneCount = dayTasks.filter(t => t.done?.toString().toUpperCase() === 'TRUE').length;

    html += `<div class="cat-section">`;

    if (dayTasks.length) {
      html += `
        <div class="cat-header">
          <div class="cat-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <span class="cat-label">Tasks</span>
          <span class="cat-total" style="color:var(--espresso-400)">${doneCount}/${dayTasks.length}</span>
        </div>
        ${dayTasks.map(t => {
          const done = t.done?.toString().toUpperCase() === 'TRUE';
          return `
            <div class="task-row ${done ? 'done' : ''}">
              <div class="task-check">
                ${done ? `<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--cream-100)" stroke-width="2.5"><polyline points="2 6 5 9 10 3"/></svg>` : ''}
              </div>
              <span class="task-text">${escHtml(t.text)}</span>
              <button class="del-btn" onclick="deleteRecord('Tasks', ${t.idx})" aria-label="Delete task">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>`;
        }).join('')}`;
    }

    // ── Monthly summary under tasks (1st of month) ──
    if (isFirstOfMonth) {
      const prev = getPrevMonthSummary(dateStr);
      if (prev.total > 0 || prev.taskCount > 0) {
        html += `
          <div class="monthly-summary" style="margin-top:${dayTasks.length ? '14px' : '0'};">
            <div class="monthly-summary-label">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              ${prev.monthName} Summary
            </div>
            <div class="monthly-stats">
              <div class="monthly-stat">
                <div class="monthly-stat-val">NT$${prev.total.toLocaleString('en-US')}</div>
                <div class="monthly-stat-key">Total Spent</div>
              </div>
              <div class="monthly-stat-divider"></div>
              <div class="monthly-stat">
                <div class="monthly-stat-val">${prev.expCount}</div>
                <div class="monthly-stat-key">Expenses</div>
              </div>
              <div class="monthly-stat-divider"></div>
              <div class="monthly-stat">
                <div class="monthly-stat-val">${prev.doneCount}/${prev.taskCount}</div>
                <div class="monthly-stat-key">Tasks Done</div>
              </div>
              <div class="monthly-stat-divider"></div>
              <div class="monthly-stat">
                <div class="monthly-stat-val">${prev.inspoCount}</div>
                <div class="monthly-stat-key">Inspos</div>
              </div>
            </div>
          </div>`;
      }
    }

    html += `</div>`;
  }

  content.innerHTML = html;
}

// ── Month nav ─────────────────────────────────────────

document.getElementById('prevMonth')?.addEventListener('click', () => {
  calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
document.getElementById('nextMonth')?.addEventListener('click', () => {
  calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ── Utility ───────────────────────────────────────────

function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Load all data ─────────────────────────────────────

async function loadAllData() {
  try {
    const res  = await fetch(`${API_BASE}/api/data`);
    if (!res.ok) throw new Error();
    const data = await res.json();

    allTasks        = data.tasks           || [];
    allExpenses     = data.allExpenses     || [];
    allInspirations = data.allInspirations || [];

    renderCalendar();

    // Auto-select today
    const today = toLocalDate();
    selectDate(today);
  } catch {
    showToast('Failed to load — check backend');
    renderCalendar();
  }
}

// ── Init ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  loadAllData();
});
