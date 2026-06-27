const STORAGE_KEY = "planner-minimal-v1";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const today = toISODate(new Date());

const defaultSeed = [
  createTaskSeed("重要的事", "09:00", "", today),
  createTaskSeed("今天要完成的任務", "14:00", "", today),
];

let state = loadState();
let reminderTimerId = null;

const taskList = document.querySelector("#taskList");
const completionRate = document.querySelector("#completionRate");
const todayLabel = document.querySelector("#todayLabel");
const taskForm = document.querySelector("#taskForm");
const taskTitle = document.querySelector("#taskTitle");
const taskTime = document.querySelector("#taskTime");
const taskDuration = document.querySelector("#taskDuration");
const taskDate = document.querySelector("#taskDate");
const openTaskForm = document.querySelector("#openTaskForm");
const closeTaskForm = document.querySelector("#closeTaskForm");
const mobileNavButtons = Array.from(document.querySelectorAll(".mobile-nav-btn"));
const viewPanels = Array.from(document.querySelectorAll(".view-panel"));
const calendarLabel = document.querySelector("#calendarLabel");
const calendarWeekdays = document.querySelector("#calendarWeekdays");
const calendarGrid = document.querySelector("#calendarGrid");
const selectedDateLabel = document.querySelector("#selectedDateLabel");
const selectedDayList = document.querySelector("#selectedDayList");
const prevMonth = document.querySelector("#prevMonth");
const nextMonth = document.querySelector("#nextMonth");
const reviewDoneCount = document.querySelector("#reviewDoneCount");
const reviewAddedCount = document.querySelector("#reviewAddedCount");
const reviewRate = document.querySelector("#reviewRate");
const categorySummary = document.querySelector("#categorySummary");
const weeklyDoneList = document.querySelector("#weeklyDoneList");
const reminderTime = document.querySelector("#reminderTime");
const enableNotifications = document.querySelector("#enableNotifications");
const testNotification = document.querySelector("#testNotification");
const notificationStatus = document.querySelector("#notificationStatus");
const downloadBackup = document.querySelector("#downloadBackup");
const uploadBackupButton = document.querySelector("#uploadBackupButton");
const uploadBackupInput = document.querySelector("#uploadBackupInput");

function createTaskSeed(title, time, note, date) {
  return {
    id: crypto.randomUUID(),
    title,
    time,
    note,
    done: false,
    date,
    createdAt: date,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildInitialState();

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks)) return buildInitialState();

    return {
      activeView: parsed.activeView || "list",
      selectedDate: parsed.selectedDate || today,
      calendarMonth: parsed.calendarMonth || today.slice(0, 7),
      reminderTime: parsed.reminderTime || "20:30",
      lastNotificationDate: parsed.lastNotificationDate || "",
      tasks: parsed.tasks.map(normalizeTask),
    };
  } catch {
    return buildInitialState();
  }
}

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./summer-planner-sw.js").catch(() => {});
  });
}

function buildInitialState() {
  return {
    activeView: "list",
    selectedDate: today,
    calendarMonth: today.slice(0, 7),
    reminderTime: "20:30",
    lastNotificationDate: "",
    tasks: defaultSeed.map(normalizeTask),
  };
}

function normalizeTask(task) {
  return {
    id: task.id || crypto.randomUUID(),
    title: task.title || "未命名事項",
    time: task.time || "",
    note: task.note || task.duration || "",
    done: Boolean(task.done),
    date: task.date || today,
    createdAt: task.createdAt || task.date || today,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  scheduleReminderCheck();
}

function formatToday() {
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  todayLabel.textContent = formatter.format(new Date(state.selectedDate));
}

function renderView() {
  mobileNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === state.activeView);
  });
}

function getTasksForDay(isoDate) {
  return state.tasks
    .filter((task) => task.date === isoDate)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done - b.done;
      return (a.time || "99:99").localeCompare(b.time || "99:99");
    });
}

function renderTasks() {
  taskList.innerHTML = "";
  taskDate.value = state.selectedDate;
  formatToday();

  const visibleTasks = getTasksForDay(state.selectedDate);

  visibleTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " is-done" : ""}`;
    item.innerHTML = `
      <label class="task-item__check">
        <input type="checkbox" ${task.done ? "checked" : ""} />
        <span class="checkmark"></span>
      </label>
      <div class="task-item__body">
        <div class="task-item__title-row">
          <span class="task-item__time"></span>
          <strong class="task-item__title"></strong>
        </div>
        <p class="task-item__meta"></p>
      </div>
    `;

    item.querySelector(".task-item__time").textContent = task.time || "--:--";
    item.querySelector(".task-item__title").textContent = task.title;
    item.querySelector(".task-item__meta").textContent = task.note || "";
    item.querySelector('input[type="checkbox"]').addEventListener("change", () => toggleTask(task.id));
    taskList.appendChild(item);
  });

  if (!visibleTasks.length) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.innerHTML = `
      <div></div>
      <div class="task-item__body">
        <div class="task-item__title-row">
          <span class="task-item__time">--:--</span>
          <strong class="task-item__title">這一天還沒有安排</strong>
        </div>
      </div>
    `;
    taskList.appendChild(empty);
  }

  const doneCount = visibleTasks.filter((task) => task.done).length;
  const rate = visibleTasks.length ? Math.round((doneCount / visibleTasks.length) * 100) : 0;
  completionRate.textContent = `${rate}%`;
}

function renderCalendar() {
  renderWeekdayHeaders();
  calendarGrid.innerHTML = "";

  const [yearText, monthText] = state.calendarMonth.split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(1 - firstDay.getDay());

  const formatter = new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long" });
  calendarLabel.textContent = formatter.format(firstDay);

  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const iso = toISODate(date);
    const tasks = getTasksForDay(iso);
    const day = document.createElement("button");
    day.type = "button";
    day.className = "calendar-day";
    if (date.getMonth() !== month) day.classList.add("is-outside");
    if (iso === state.selectedDate) day.classList.add("is-selected");
    day.innerHTML = `
      <div class="calendar-day__num">${date.getDate()}</div>
      <div class="calendar-day__dots"></div>
    `;

    const dots = day.querySelector(".calendar-day__dots");
    tasks.slice(0, 3).forEach(() => dots.appendChild(document.createElement("span")));

    day.addEventListener("click", () => {
      state.selectedDate = iso;
      state.activeView = "list";
      state.calendarMonth = iso.slice(0, 7);
      saveState();
      rerender();
    });

    calendarGrid.appendChild(day);
  }

  renderSelectedDayList();
}

function renderWeekdayHeaders() {
  if (calendarWeekdays.childElementCount) return;
  WEEKDAYS.forEach((day) => {
    const cell = document.createElement("div");
    cell.textContent = day;
    calendarWeekdays.appendChild(cell);
  });
}

function renderSelectedDayList() {
  selectedDayList.innerHTML = "";
  selectedDateLabel.textContent = `${formatShortDate(state.selectedDate)} 的事項`;

  const tasks = getTasksForDay(state.selectedDate);
  if (!tasks.length) {
    const item = document.createElement("li");
    item.innerHTML = "<span>這天沒有安排。</span>";
    selectedDayList.appendChild(item);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${task.time || "--:--"} · ${task.title}</span>
      <span class="task-date-pill">${task.note || ""}</span>
    `;
    selectedDayList.appendChild(item);
  });
}

function renderReview() {
  const weekRange = getCurrentWeekRange();
  const weeklyTasks = state.tasks.filter((task) => task.date >= weekRange.start && task.date <= weekRange.end);
  const weeklyDone = weeklyTasks.filter((task) => task.done);
  const rate = weeklyTasks.length ? Math.round((weeklyDone.length / weeklyTasks.length) * 100) : 0;

  reviewDoneCount.textContent = String(weeklyDone.length);
  reviewAddedCount.textContent = String(weeklyTasks.length);
  reviewRate.textContent = `${rate}%`;

  categorySummary.innerHTML = "";
  weeklyDoneList.innerHTML = "";

  const grouped = weeklyTasks.reduce((acc, task) => {
    const bucket = task.time ? "有時間點" : "未排時間";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  Object.entries(grouped).forEach(([label, count]) => {
    const item = document.createElement("li");
    item.textContent = `${label}：${count} 項`;
    categorySummary.appendChild(item);
  });

  if (!Object.keys(grouped).length) {
    const item = document.createElement("li");
    item.textContent = "這週還沒有新增事項。";
    categorySummary.appendChild(item);
  }

  weeklyDone.slice(0, 6).forEach((task) => {
    const item = document.createElement("li");
    item.textContent = `${formatShortDate(task.date)} · ${task.time || "--:--"} · ${task.title}`;
    weeklyDoneList.appendChild(item);
  });

  if (!weeklyDone.length) {
    const item = document.createElement("li");
    item.textContent = "這週還沒有完成紀錄。";
    weeklyDoneList.appendChild(item);
  }
}

function renderSettings() {
  reminderTime.value = state.reminderTime;
  notificationStatus.textContent = getNotificationStatusText();
}

function rerender() {
  renderView();
  renderTasks();
  renderCalendar();
  renderReview();
  renderSettings();
}

function showTaskForm() {
  taskForm.hidden = false;
  taskTitle.focus();
}

function hideTaskForm() {
  taskForm.hidden = true;
}

function toggleTask(taskId) {
  state.tasks = state.tasks.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task));
  saveState();
  rerender();
}

function addTask(event) {
  event.preventDefault();
  const title = taskTitle.value.trim();
  if (!title) return;

  const date = taskDate.value || state.selectedDate || today;
  state.tasks.unshift({
    id: crypto.randomUUID(),
    title,
    time: taskTime.value,
    note: taskDuration.value.trim(),
    done: false,
    date,
    createdAt: today,
  });

  state.selectedDate = date;
  state.calendarMonth = date.slice(0, 7);
  taskForm.reset();
  taskDate.value = date;
  hideTaskForm();
  saveState();
  rerender();
}

function switchView(view) {
  state.activeView = view;
  if (view === "calendar") {
    state.calendarMonth = today.slice(0, 7);
  }
  saveState();
  rerender();
}

function moveMonth(direction) {
  const [yearText, monthText] = state.calendarMonth.split("-");
  const date = new Date(Number(yearText), Number(monthText) - 1 + direction, 1);
  state.calendarMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  saveState();
  renderCalendar();
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatShortDate(isoDate) {
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function getCurrentWeekRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toISODate(start), end: toISODate(end) };
}

function getNotificationStatusText() {
  if (!("Notification" in window)) return "這個瀏覽器不支援通知。";
  if (Notification.permission === "granted") return `已開啟通知，提醒時間 ${state.reminderTime}。`;
  if (Notification.permission === "denied") return "通知已被封鎖，可以去瀏覽器設定重新打開。";
  return "尚未啟用通知。";
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    notificationStatus.textContent = "這個瀏覽器不支援通知。";
    return;
  }

  const permission = await Notification.requestPermission();
  notificationStatus.textContent = permission === "granted"
    ? `已開啟通知，提醒時間 ${state.reminderTime}。`
    : "通知權限尚未開啟。";
  saveState();
}

function scheduleReminderCheck() {
  if (reminderTimerId) window.clearInterval(reminderTimerId);

  reminderTimerId = window.setInterval(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const currentDate = toISODate(now);
    if (currentTime === state.reminderTime && state.lastNotificationDate !== currentDate) {
      const pending = state.tasks.filter((task) => task.date === currentDate && !task.done);
      const body = pending.length
        ? `今天還有 ${pending.length} 項待完成。`
        : "今天目前沒有待完成事項。";
      new Notification("我的行事簿", { body });
      state.lastNotificationDate = currentDate;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, 30000);
}

function sendTestNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    notificationStatus.textContent = "要先開啟通知權限，才能測試提醒。";
    return;
  }
  new Notification("我的行事簿", { body: "這是一則測試提醒。" });
}

function downloadStateBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `planner-backup-${today}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function uploadStateBackup(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      state = {
        ...state,
        ...parsed,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTask) : state.tasks,
      };
      saveState();
      rerender();
      syncStatus.textContent = "已匯入備份資料。";
    } catch {
      syncStatus.textContent = "備份檔案格式有問題。";
    }
  };
  reader.readAsText(file, "utf-8");
}

taskForm.addEventListener("submit", addTask);
openTaskForm.addEventListener("click", showTaskForm);
closeTaskForm.addEventListener("click", hideTaskForm);
mobileNavButtons.forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
prevMonth.addEventListener("click", () => moveMonth(-1));
nextMonth.addEventListener("click", () => moveMonth(1));
enableNotifications.addEventListener("click", requestNotifications);
testNotification.addEventListener("click", sendTestNotification);
downloadBackup.addEventListener("click", downloadStateBackup);
uploadBackupButton.addEventListener("click", () => uploadBackupInput.click());
uploadBackupInput.addEventListener("change", uploadStateBackup);
reminderTime.addEventListener("change", (event) => {
  state.reminderTime = event.target.value || "20:30";
  saveState();
  renderSettings();
});

formatToday();
rerender();
scheduleReminderCheck();
